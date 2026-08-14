import { supabase } from '../config/supabase';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

type DatabaseMarker = { provider?: 'supabase' } | undefined;
type SnapshotCallback = (snapshot: DataSnapshot) => unknown;
type ErrorCallback = (error: Error) => unknown;

interface Constraint {
  kind: 'orderByChild' | 'orderByKey' | 'equalTo';
  value?: unknown;
}

export interface DatabaseReference {
  path: string;
  key: string | null;
  constraints?: Constraint[];
}

const normalizePath = (path = ''): string => path.split('/').filter(Boolean).join('/');
const pathSegments = (path: string): string[] => normalizePath(path).split('/').filter(Boolean);

const createReference = (path = '', constraints?: Constraint[]): DatabaseReference => {
  const normalized = normalizePath(path);
  const segments = pathSegments(normalized);
  return {
    path: normalized,
    key: segments.at(-1) || null,
    constraints,
  };
};

const serializeValue = (value: unknown): Json => {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as Json;
};

const getNestedValue = (value: unknown, segments: string[]): unknown => {
  let current = value;
  for (const segment of segments) {
    if (!current || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return current ?? null;
};

const getByChildPath = (value: unknown, childPath: string): unknown => {
  return getNestedValue(value, childPath.split('/').filter(Boolean));
};

const toPostgrestJsonTextPath = (childPath: string): string => {
  const segments = childPath.split('/').filter(Boolean);
  if (segments.length === 0) return 'data';
  return segments.reduce(
    (path, segment, index) => `${path}${index === segments.length - 1 ? '->>' : '->'}${segment}`,
    'data'
  );
};

const toError = (error: { message?: string; code?: string } | Error): Error => {
  const code = 'code' in error ? error.code : undefined;
  const nextError = new Error(error.message || 'Supabase database operation failed');
  Object.assign(nextError, {
    code: code === '42501' ? 'permission_denied' : code,
  });
  return nextError;
};

export class DataSnapshot {
  readonly key: string | null;
  private readonly value: unknown;

  constructor(key: string | null, value: unknown) {
    this.key = key;
    this.value = value ?? null;
  }

  exists(): boolean {
    return this.value !== null && this.value !== undefined;
  }

  val(): unknown {
    return this.value;
  }

  forEach(callback: (snapshot: DataSnapshot) => unknown): boolean {
    if (!this.value || typeof this.value !== 'object') return false;

    for (const [key, value] of Object.entries(this.value as Record<string, unknown>)) {
      if (callback(new DataSnapshot(key, value)) === true) return true;
    }
    return false;
  }
}

export const ref = (_database?: DatabaseMarker, path = ''): DatabaseReference => {
  return createReference(path);
};

export const push = (reference: DatabaseReference): DatabaseReference => {
  const key = globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return createReference(`${reference.path}/${key}`);
};

export const orderByChild = (childPath: string): Constraint => ({
  kind: 'orderByChild',
  value: childPath,
});

export const orderByKey = (): Constraint => ({ kind: 'orderByKey' });

export const equalTo = (value: unknown): Constraint => ({ kind: 'equalTo', value });

export const query = (
  reference: DatabaseReference,
  ...constraints: Constraint[]
): DatabaseReference => createReference(reference.path, constraints);

const applyConstraints = (
  entries: Array<[string, unknown]>,
  constraints: Constraint[] = []
): Array<[string, unknown]> => {
  const orderChild = constraints.find((constraint) => constraint.kind === 'orderByChild');
  const keyOrder = constraints.some((constraint) => constraint.kind === 'orderByKey');
  const equality = constraints.find((constraint) => constraint.kind === 'equalTo');

  let nextEntries = entries;
  if (equality) {
    nextEntries = nextEntries.filter(([key, value]) => {
      const candidate = keyOrder
        ? key
        : orderChild?.value
          ? getByChildPath(value, String(orderChild.value))
          : value;
      return candidate === equality.value;
    });
  }

  if (keyOrder) {
    nextEntries = [...nextEntries].sort(([a], [b]) => a.localeCompare(b));
  } else if (orderChild?.value) {
    const childPath = String(orderChild.value);
    nextEntries = [...nextEntries].sort(([, a], [, b]) => {
      const aValue = getByChildPath(a, childPath);
      const bValue = getByChildPath(b, childPath);
      return String(aValue ?? '').localeCompare(String(bValue ?? ''));
    });
  }

  return nextEntries;
};

export const get = async (reference: DatabaseReference): Promise<DataSnapshot> => {
  const segments = pathSegments(reference.path);
  if (segments.length === 0) {
    throw new Error('Reading the database root is not supported by the Supabase adapter');
  }

  const [collection, key, ...nestedPath] = segments;
  if (!collection) throw new Error('A collection path is required');

  if (!key) {
    const orderChild = reference.constraints?.find(
      (constraint) => constraint.kind === 'orderByChild'
    );
    const keyOrder = reference.constraints?.some(
      (constraint) => constraint.kind === 'orderByKey'
    );
    const equality = reference.constraints?.find(
      (constraint) => constraint.kind === 'equalTo'
    );
    let request = supabase
      .from('app_documents')
      .select('key,data')
      .eq('collection', collection);
    if (equality && keyOrder) {
      request = request.eq('key', String(equality.value));
    } else if (equality && orderChild?.value) {
      request = request.eq(
        toPostgrestJsonTextPath(String(orderChild.value)),
        String(equality.value)
      );
    }
    const { data, error } = await request;
    if (error) throw toError(error);

    const entries = applyConstraints(
      (data || []).map((row) => [row.key as string, row.data] as [string, unknown]),
      reference.constraints
    );
    return new DataSnapshot(collection, Object.fromEntries(entries));
  }

  const { data, error } = await supabase
    .from('app_documents')
    .select('data')
    .eq('collection', collection)
    .eq('key', key)
    .maybeSingle();
  if (error) throw toError(error);

  const value = data ? getNestedValue(data.data, nestedPath) : null;
  if (!reference.constraints?.length || !value || typeof value !== 'object') {
    return new DataSnapshot(reference.key, value);
  }

  const entries = applyConstraints(Object.entries(value as Record<string, unknown>), reference.constraints);
  return new DataSnapshot(reference.key, Object.fromEntries(entries));
};

const mutate = async (operations: Array<{ path: string; value?: Json; delete?: boolean }>) => {
  if (operations.length === 0) return;
  const { error } = await supabase.rpc('app_documents_mutate', {
    p_operations: operations,
  });
  if (error) throw toError(error);
};

export const set = async (reference: DatabaseReference, value: unknown): Promise<void> => {
  await mutate([{ path: reference.path, value: serializeValue(value), delete: value === null }]);
};

export const remove = async (reference: DatabaseReference): Promise<void> => {
  await mutate([{ path: reference.path, delete: true }]);
};

export const update = async (
  reference: DatabaseReference,
  updates: Record<string, unknown>
): Promise<void> => {
  const basePath = reference.path;
  const operations = Object.entries(updates).map(([path, value]) => ({
    path: normalizePath(basePath ? `${basePath}/${path}` : path),
    value: serializeValue(value),
    delete: value === null,
  }));
  await mutate(operations);
};

export const serverTimestamp = (): number => Date.now();

export const onValue = (
  reference: DatabaseReference,
  callback: SnapshotCallback,
  onError?: ErrorCallback
): (() => void) => {
  let active = true;
  let queued = false;

  const emit = async () => {
    if (!active || queued) return;
    queued = true;
    try {
      const snapshot = await get(reference);
      if (active) callback(snapshot);
    } catch (error) {
      if (active) onError?.(toError(error as Error));
    } finally {
      queued = false;
    }
  };

  const [collection] = pathSegments(reference.path);
  const channel = supabase
    .channel(`app-documents:${reference.path}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_documents',
        ...(collection ? { filter: `collection=eq.${collection}` } : {}),
      },
      () => void emit()
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' && active) {
        onError?.(new Error('Supabase realtime channel failed'));
      }
    });

  void emit();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
};

export const off = (
  _reference: DatabaseReference,
  _eventType?: string,
  unsubscribe?: (() => void) | unknown
): void => {
  if (typeof unsubscribe === 'function') unsubscribe();
};

export const runTransaction = async (
  reference: DatabaseReference,
  updateValue: (currentValue: unknown) => unknown
): Promise<{ committed: boolean; snapshot: DataSnapshot }> => {
  let latest = await get(reference);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const nextValue = updateValue(latest.val());
    if (nextValue === undefined) return { committed: false, snapshot: latest };

    const { data: committed, error } = await supabase.rpc('app_documents_compare_and_set', {
      p_path: reference.path,
      p_expected: serializeValue(latest.val()),
      p_value: serializeValue(nextValue),
    });
    if (error) throw toError(error);
    if (committed) {
      return { committed: true, snapshot: new DataSnapshot(reference.key, nextValue) };
    }
    latest = await get(reference);
  }

  return { committed: false, snapshot: latest };
};

export const onDisconnect = (reference: DatabaseReference) => ({
  remove: async () => {
    if (typeof window === 'undefined') return;
    const cleanup = () => {
      void remove(reference).catch(() => undefined);
    };
    window.addEventListener('pagehide', cleanup, { once: true });
  },
});
