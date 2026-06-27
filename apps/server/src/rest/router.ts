/**
 * REST shim. Architecture §18.2.
 * The public REST surface is the documented API for non-TS clients.
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  CactbotIngestRequest,
  TriggernometryIngestRequest,
  FFLogsIngestRequest,
} from '@xivmitplan/validation';
import type { AppEnv } from '../index.js';

export const restRouter = new Hono<AppEnv>()
  // Health.
  .get('/health', (c) => c.json({ ok: true }))

  // OpenAPI.
  .get('/openapi.json', (c) =>
    c.json({
      openapi: '3.1.0',
      info: {
        title: 'XIVMitPlan v1 API',
        version: '1.0.0',
        description:
          'FFXIV raid mitigation planner. Learn + Plan modes. See docs/adr/0001.',
      },
      servers: [{ url: c.req.url.split('/v1')[0] }],
      paths: {},
    }),
  )

  // Encounters.
  .get('/encounters', (c) => c.json({ encounters: [], wiring: 'phase-0' as const }))
  .get('/encounters/:id', (c) => c.json({ id: c.req.param('id'), wiring: 'phase-0' as const }))

  // Abilities.
  .get('/abilities', (c) => c.json({ abilities: [], wiring: 'phase-0' as const }))

  // Timeline ingest.
  .post('/timelines/ingest/cactbot', zValidator('json', CactbotIngestRequest), (c) =>
    c.json({ accepted: true, wiring: 'phase-0' as const }),
  )
  .post('/timelines/ingest/triggernometry', zValidator('json', TriggernometryIngestRequest), (c) =>
    c.json({ accepted: true, wiring: 'phase-0' as const }),
  )
  .post('/timelines/ingest/fflogs', zValidator('json', FFLogsIngestRequest), (c) =>
    c.json({ accepted: true, wiring: 'phase-0' as const }),
  )

  // Plan snapshot.
  .post('/plans/:id/snapshot', (c) =>
    c.json({ snapshotId: crypto.randomUUID(), wiring: 'phase-0' as const }),
  )

  // Plan share token.
  .post('/plans/:id/share', (c) =>
    c.json({ token: 'pending', wiring: 'phase-0' as const }),
  )

  // Auth.
  .get('/auth/me', (c) => c.json({ userId: c.get('userId'), wiring: 'phase-0' as const }))
  .post('/auth/signout', (c) => c.json({ ok: true, wiring: 'phase-0' as const }))
  .post('/auth/claim-mitplan-v1', (c) =>
    c.json({ claimed: 0, wiring: 'phase-0' as const }),
  );
