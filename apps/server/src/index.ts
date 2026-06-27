/**
 * apps/server — Hono on Cloudflare Workers. tRPC + REST shim.
 * Architecture §7.2, §16, §18.
 *
 * The composition root (composition.ts) is the only file that imports
 * concrete classes. Everything else imports from @xivmitplan/domain/ports.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { authMiddleware } from './middleware/auth.js';
import { tpcRouter } from './trpc/router.js';
import { restRouter } from './rest/router.js';
import { buildAppContext, type AppContext } from './composition.js';
import type { Env } from './env.js';

export type AppEnv = {
  Bindings: Env;
  Variables: {
    ctx: AppContext;
    /** The verified user ID (null for unauthenticated requests). */
    userId: string | null;
  };
};

export const buildApp = (ctx: AppContext) => {
  const app = new Hono<AppEnv>();

  app.use('*', honoLogger());
  app.use(
    '*',
    cors({
      origin: ctx.config.corsOrigins,
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Plan-Access-Token'],
    }),
  );

  // Inject the app context into every request.
  app.use('*', async (c, next) => {
    c.set('ctx', ctx);
    c.set('userId', null);
    await next();
  });

  // Auth middleware validates the Supabase JWT and sets `userId`.
  app.use('*', authMiddleware(ctx));

  // Health check.
  app.get('/health', (c) => c.json({ ok: true, environment: ctx.config.environment }));

  // REST shim.
  app.route('/v1', restRouter);

  // tRPC.
  app.route('/trpc', tpcRouter);

  return app;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ctx = await buildAppContext(env);
    const app = buildApp(ctx);
    return app.fetch(request, env);
  },
};
