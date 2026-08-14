export function isPermissionDeniedError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);

  return (
    code === 'PERMISSION_DENIED' ||
    code === 'permission-denied' ||
    code === '42501' ||
    message.includes('PERMISSION_DENIED') ||
    /row.level.security/i.test(message) ||
    /permission[_ ]denied/i.test(message)
  );
}

export const STALE_DATABASE_RULES_MESSAGE =
  'Live Supabase row-level security policies appear stale or not deployed. Apply the current migrations and reload the dashboard.';

export function isPlansCollectionPermissionDeniedError(error: unknown): boolean {
  if (!isPermissionDeniedError(error)) {
    return false;
  }

  return /(?:at \/plans\b|app_documents|row.level.security)/i.test(getErrorMessage(error));
}

export function getDashboardPlanLoadErrorMessage(error: unknown): string {
  if (isPlansCollectionPermissionDeniedError(error)) {
    return STALE_DATABASE_RULES_MESSAGE;
  }

  return getErrorMessage(error);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return 'Unknown database error';
}

export const COLLABORATION_UNAVAILABLE_MESSAGE =
  'Realtime collaboration is temporarily unavailable. Plan editing still works, but live presence and collaborator indicators are disabled.';
