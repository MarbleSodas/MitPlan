/**
 * Per-request Supabase client factory.
 *
 * Path A (ADR-0002 §T-4): all Edge Functions receive the user's
 * Supabase Auth JWT in the `Authorization: Bearer <jwt>` header.
 * We forward it to the Supabase JS client so every query runs under
 * RLS with `auth.uid()` resolved to the caller.
 *
 * Two clients are produced:
 *   - `supabase` — user-scoped. Use this for any table access that
 *     should respect RLS (timelines, plans, plan_snapshots, etc.).
 *   - `supabaseAdmin` — service-role. Use ONLY for cross-user flows
 *     (e.g., inserting a `plan_access` row for a share-token target
 *     that is not yet a registered user). Never expose to the client.
 *
 * Env (auto-provisioned by Supabase):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY           — for the user-scoped client
 *   SUPABASE_SERVICE_ROLE_KEY   — for the admin client
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface RequestContext {
  /** User-scoped client. `auth.uid()` resolves to the caller. */
  supabase: SupabaseClient;
  /** Service-role client. Bypasses RLS. Use sparingly. */
  supabaseAdmin: SupabaseClient;
  /** Authenticated user's UUID, or null if the JWT was missing/invalid. */
  userId: string | null;
  /** The raw JWT, kept for forwarding to RPCs that need the bearer token. */
  jwt: string | null;
}

/**
 * Read the Authorization header and return both user-scoped and
 * service-role Supabase clients + the resolved user id.
 */
export const createSupabaseClient = async (req: Request): Promise<RequestContext> => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing Supabase env (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
  });

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  if (jwt) {
    const { data, error } = await supabase.auth.getUser(jwt);
    if (!error && data.user) userId = data.user.id;
  }

  return { supabase, supabaseAdmin, userId, jwt };
};

/** Convenience guard for endpoints that require an authenticated user. */
export const requireUser = (
  ctx: RequestContext,
  origin: string,
): Response | null => {
  if (!ctx.userId) {
    return errorResponse(401, "UNAUTHENTICATED", "Missing or invalid bearer token", origin);
  }
  return null;
};

const errorResponse = (status: number, code: string, message: string, origin: string): Response =>
  new Response(
    JSON.stringify({ error: { code, message } }),
    { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin } },
  );
