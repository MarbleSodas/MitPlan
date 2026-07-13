/**
 * Yjs document shape. Architecture §14.1.
 *
 * The shape is:
 *   doc.meta            : Y.Map of plan meta
 *   doc.events          : Y.Array<Y.Map> of timeline events (read-only; mirrored from Postgres)
 *   doc.assignments     : Y.Map<AssignmentId, Y.Map> of assignments
 *   doc.tankStates      : Y.Array<Y.Map> of tank position states
 *   doc.locks           : Y.Map<BranchId, OutcomeId> of branch outcome locks (v2.1)
 *
 * The Y.Doc is the CRDT; the live in-memory layer is the Hocuspocus
 * server inside the Cloudflare DO. Snapshots are debounced (2s, max
 * 10s) to Supabase via the `onSave` extension.
 */
import * as Y from 'yjs';
import { AbilityMode } from '@xivmitplan/validation/ability';
import type { z } from 'zod';

export const PlanDocMode = AbilityMode;
export type PlanDocMode = z.infer<typeof AbilityMode>;

/** The typed accessor for the Y.Doc. Use the factory to instantiate. */
export class PlanDoc {
  readonly doc: Y.Doc;
  readonly meta: Y.Map<unknown>;
  readonly events: Y.Array<Y.Map<unknown>>;
  readonly assignments: Y.Map<Y.Map<unknown>>;
  readonly tankStates: Y.Array<Y.Map<unknown>>;
  readonly locks: Y.Map<string>;

  constructor(doc: Y.Doc) {
    this.doc = doc;
    this.meta = doc.getMap('meta');
    this.events = doc.getArray('events');
    this.assignments = doc.getMap('assignments');
    this.tankStates = doc.getArray('tankStates');
    this.locks = doc.getMap('locks');
  }

  /** Encode the entire state for snapshot persistence. */
  encodeStateAsUpdate(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /** Apply an update from the wire. */
  applyUpdate(update: Uint8Array, origin?: unknown): void {
    Y.applyUpdate(this.doc, update, origin);
  }

  /** Snapshot to a JSON-serializable shape. The DB shape. */
  toJSON(): {
    meta: unknown;
    events: unknown[];
    assignments: Record<string, unknown>;
    tankStates: unknown[];
    locks: Record<string, string>;
  } {
    return {
      meta: Object.fromEntries(this.meta.entries()),
      events: this.events.toArray().map((m) => Object.fromEntries(m.entries())),
      assignments: Object.fromEntries(
        [...this.assignments.entries()].map(([k, v]) => [k, Object.fromEntries(v.entries())]),
      ),
      tankStates: this.tankStates.toArray().map((m) => Object.fromEntries(m.entries())),
      locks: Object.fromEntries(this.locks.entries()),
    };
  }

  /** Hydrate from a snapshot. Used by `onLoad` in the DO. */
  hydrateFromJSON(snapshot: {
    meta?: Record<string, unknown>;
    events?: ReadonlyArray<Record<string, unknown>>;
    assignments?: Record<string, Record<string, unknown>>;
    tankStates?: ReadonlyArray<Record<string, unknown>>;
    locks?: Record<string, string>;
  }): void {
    this.doc.transact(() => {
      if (snapshot.meta) {
        for (const [k, v] of Object.entries(snapshot.meta)) {
          this.meta.set(k, v);
        }
      }
      if (snapshot.events) {
        for (const ev of snapshot.events) {
          const m = new Y.Map<unknown>();
          for (const [k, v] of Object.entries(ev)) m.set(k, v);
          this.events.push([m]);
        }
      }
      if (snapshot.assignments) {
        for (const [k, av] of Object.entries(snapshot.assignments)) {
          const m = new Y.Map<unknown>();
          for (const [ak, av2] of Object.entries(av)) m.set(ak, av2);
          this.assignments.set(k, m);
        }
      }
      if (snapshot.tankStates) {
        for (const ts of snapshot.tankStates) {
          const m = new Y.Map<unknown>();
          for (const [k, v] of Object.entries(ts)) m.set(k, v);
          this.tankStates.push([m]);
        }
      }
      if (snapshot.locks) {
        for (const [k, v] of Object.entries(snapshot.locks)) {
          this.locks.set(k, v);
        }
      }
    });
  }
}
