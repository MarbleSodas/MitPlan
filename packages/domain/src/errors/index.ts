/**
 * Domain errors. The v1 surface is narrow; each parser and the merger
 * have their own typed error variants. See architecture §12.2.
 */

export type DomainError =
  | ParserError
  | ValidationError
  | MergeError
  | NotFoundError
  | ConflictError
  | AuthenticationError
  | AuthorizationError
  | CompositionError;

/** A parser failed to consume its input. */
export interface ParserError {
  kind: 'PARSER';
  source: 'CACTBOT' | 'TRIGGERNOMETRY' | 'FFLOGS';
  line?: number;
  message: string;
  cause?: unknown;
}

/** A domain invariant was violated (e.g., a circular branch). */
export interface ValidationError {
  kind: 'VALIDATION';
  rule: string;
  message: string;
  context?: Record<string, unknown>;
}

/** The merger could not converge. */
export interface MergeError {
  kind: 'MERGE';
  message: string;
  conflicts: number;
}

/** A repository returned no row. */
export interface NotFoundError {
  kind: 'NOT_FOUND';
  resource: string;
  id: string;
}

/** A double-booking or other user-correctable conflict. */
export interface ConflictError {
  kind: 'CONFLICT';
  message: string;
  conflictingIds: string[];
}

/** Missing or invalid Supabase Auth JWT. */
export interface AuthenticationError {
  kind: 'AUTHENTICATION';
  message: string;
}

/** Authenticated user lacks the required plan_access. */
export interface AuthorizationError {
  kind: 'AUTHORIZATION';
  planId: string;
  requiredRole: 'OWNER' | 'EDITOR' | 'VIEWER';
}

/** A composition root or wire-up failure (caller bug). */
export interface CompositionError {
  kind: 'COMPOSITION';
  message: string;
}
