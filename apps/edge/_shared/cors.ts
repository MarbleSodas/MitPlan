/**
 * CORS headers + JSON response helpers shared by every Edge Function.
 * Path A (ADR-0002 §T-4): the Web app (apps/web) calls these functions
 * directly from the browser, so we need to honor CORS preflight.
 *
 * The `withCors(handler)` wrapper is the single entry point every
 * function uses. It sets the standard headers on every response (200,
 * 4xx, 5xx) and short-circuits OPTIONS preflight with a 204.
 *
 * Env:
 *   CORS_ORIGINS — comma-separated list of allowed origins. Defaults
 *                  to `http://localhost:5173` (the Vite dev server) for
 *                  local development. Production deployments must set
 *                  this to the deployed Web origin.
 */

/** A minimal handler shape so the wrapper is decoupled from any framework. */
export type Handler = (req: Request) => Promise<Response> | Response;

/** Headers every response carries. */
export const corsHeaders = (origin: string): HeadersInit => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

/**
 * Resolve the allowed origin for this request.
 * Echoes the request `Origin` if it's in the allowlist; otherwise
 * returns the first configured origin (a safe fallback for non-CORS
 * callers like the Supabase Realtime gateway).
 */
const resolveOrigin = (req: Request): string => {
  const allowed = (Deno.env.get("CORS_ORIGINS") ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const requestOrigin = req.headers.get("Origin") ?? "";
  return allowed.includes(requestOrigin) ? requestOrigin : (allowed[0] ?? "*");
};

/** Standard JSON response. */
export const json = (
  body: unknown,
  init: ResponseInit = {},
  origin: string = "*",
): Response => {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, String(v));
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { ...init, headers });
};

/** Canonical error envelope: `{ error: { message, code } }`. */
export const errorResponse = (
  status: number,
  code: string,
  message: string,
  origin: string = "*",
): Response =>
  json({ error: { code, message } }, { status }, origin);

/**
 * Wrap a handler so every response — including thrown errors — carries
 * the CORS headers. OPTIONS short-circuits to a 204.
 */
export const withCors = (handler: Handler): Handler => async (req: Request) => {
  const origin = resolveOrigin(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  try {
    const res = await handler(req);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      if (!headers.has(k)) headers.set(k, String(v));
    }
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  } catch (cause) {
    return errorResponse(
      500,
      "INTERNAL",
      cause instanceof Error ? cause.message : "Unknown error",
      origin,
    );
  }
};
