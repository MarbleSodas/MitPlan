/**
 * apps/realtime — Worker entry / fetch routing.
 * Architecture §14.6.4 + §14.6.7.
 *
 * One Cloudflare Worker hosts all Hocuspocus DOs. The Worker:
 *   1. Inspects the URL path: `/plans/:planId/realtime`
 *   2. Validates the Supabase Auth JWT (HS256)
 *   3. Forwards the WebSocket to the named Durable Object
 *
 * The DO (PartyRoom) is the Hocuspocus server + Y.Doc + Supabase
 * persistence + checkAccess. Auth (JWT validation) happens at the
 * Worker boundary; checkAccess (plan-level) happens in the DO.
 */
import { PartyRoom } from './server.js';
import { verifySupabaseJwt, type VerifiedClaims } from './auth.js';

export { PartyRoom };

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  SUPABASE_JWT_JWKS_URL?: string;
  PLAN_ACL_CACHE_TTL?: string;
  ENVIRONMENT?: string;
}

/** Cast the DO stub to a typed handle for `checkAccess`. */
interface PlanRoomStub {
  checkAccess(claims: { sub: string; plan_access?: 'read' | 'edit' }): Promise<boolean>;
  fetch(request: Request, env: Env): Promise<Response>;
}

const textOrJson = (status: number, message: string): Response =>
  new Response(message, { status, headers: { 'content-type': 'text/plain' } });

const routeRequest = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  if (pathSegments[0] !== 'plans' || pathSegments.length < 3 || pathSegments[2] !== 'realtime') {
    return textOrJson(404, 'Not Found');
  }
  const planId = pathSegments[1];
  if (!planId) {
    return textOrJson(400, 'Missing planId');
  }

  // 1. Validate the Supabase Auth JWT.
  const token = url.searchParams.get('token');
  if (!token) {
    return textOrJson(401, 'Missing token');
  }
  const claims = await verifySupabaseJwt(token, env);
  if (!claims) {
    return textOrJson(401, 'Invalid token');
  }

  // 2. Optional share-link token. The X-Plan-Access-Token header
  //    carries a JWT with a `plan_access` claim.
  let effectiveClaims: VerifiedClaims = claims;
  const shareToken = request.headers.get('X-Plan-Access-Token');
  if (shareToken) {
    const shareClaims = await verifySupabaseJwt(shareToken, env);
    if (shareClaims && shareClaims.plan_id === planId) {
      effectiveClaims = shareClaims;
    }
  }

  // 3. Resolve the DO stub for this plan. We use the global Cloudflare
  //    binding to get a DurableObjectNamespace, then idFromName + get.
  //    The binding is set up by wrangler.jsonc (PARTYKIT_ROOM).
  const binding = (globalThis as unknown as {
    PARTYKIT_ROOM: {
      idFromName(name: string): { toString(): string };
      get(id: { toString(): string }): PlanRoomStub;
    };
  }).PARTYKIT_ROOM;
  if (!binding) {
    return textOrJson(500, 'PARTYKIT_ROOM binding not configured');
  }
  const id = binding.idFromName(planId);
  const stub = binding.get(id);

  // 4. Check the user's plan_access in the DO.
  const hasAccess = await stub.checkAccess(effectiveClaims);
  if (!hasAccess) {
    return textOrJson(403, 'Forbidden');
  }

  // 5. Forward the WebSocket request to the DO.
  return stub.fetch(request, env);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return routeRequest(request, env);
  },
};
