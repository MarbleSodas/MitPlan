# apps/server

XIVMitPlan API — Hono on Cloudflare Workers. tRPC + REST shim + Discord/Google OAuth callbacks.

See [architecture §7.2, §16, §18](../../2026-06-14-xivmitplan-v1-architecture-locked.md) and [ADR-0001](../../docs/adr/0001-xivmitplan-v1-architecture-locked.md).

## Layout

```
apps/server/
├── src/
│   ├── index.ts          # Hono app
│   ├── env.ts            # Worker bindings
│   ├── composition.ts    # The only file that imports concrete classes
│   ├── auth/
│   │   └── verify-jwt.ts # HS256 Supabase JWT verification
│   ├── middleware/
│   │   └── auth.ts       # Inject userId into request context
│   ├── trpc/
│   │   └── router.ts     # tRPC procedures
│   └── rest/
│       └── router.ts     # REST shim
├── wrangler.jsonc
└── package.json
```

## Local dev

```sh
# From the repo root:
pnpm --filter @xivmitplan/server dev
```

## Deploy

```sh
# One-time: set secrets
pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY
pnpm exec wrangler secret put SUPABASE_JWT_SECRET
pnpm exec wrangler secret put DATABASE_URL
pnpm exec wrangler secret put UPSTASH_REDIS_URL
pnpm exec wrangler secret put UPSTASH_REDIS_TOKEN
pnpm exec wrangler secret put JWT_SIGNING_KEY

# Deploy
pnpm exec wrangler deploy
```

## Phase 0 status

The router and middleware are wired and return `{ wiring: 'phase-0' }` placeholders. The real catalog/timeline/plan/auth services are implemented in Phase 1+.
