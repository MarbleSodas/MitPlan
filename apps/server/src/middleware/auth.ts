/**
 * Auth middleware. Validates the Supabase Auth JWT and sets `userId`
 * on the request context. Architecture §7.7, §16.4.
 */
import { createMiddleware } from 'hono/factory';
import { verifySupabaseJwt } from '../auth/verify-jwt.js';
import type { AppEnv } from '../index.js';
import type { AppContext } from '../composition.js';

export const authMiddleware = (_ctx: AppContext) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      // Unauthenticated requests are allowed on /v1/encounters, /v1/abilities,
      // /v1/auth/*, and /health. Protected procedures do their own check.
      await next();
      return;
    }
    const token = header.slice('Bearer '.length);
    const claims = await verifySupabaseJwt(token, c.env);
    if (claims) {
      c.set('userId', claims.sub);
    }
    await next();
  });
