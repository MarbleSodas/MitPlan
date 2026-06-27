/**
 * tRPC router. Architecture §18.1.
 * Schema-first via Zod (from @xivmitplan/validation).
 * `protectedProcedure` validates the Supabase Auth JWT.
 */
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { AppEnv } from '../index.js';
import { Hono } from 'hono';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

const t = initTRPC.context<AppEnv['Variables']>().create();

const publicProcedure = t.procedure;

const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

const appRouter = t.router({
  health: publicProcedure.query(() => ({ ok: true })),

  encounters: t.router({
    list: publicProcedure
      .input(
        z.object({
          expansion: z.string().optional(),
          raid: z.string().optional(),
        }),
      )
      .query(async ({ input }) => {
        return { encounters: [], wiring: 'phase-0' as const, input };
      }),

    byId: publicProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        return { id: input.id, name: 'pending', wiring: 'phase-0' as const };
      }),
  }),

  timelines: t.router({
    byEncounter: publicProcedure
      .input(z.object({ encounterId: z.string().uuid() }))
      .query(async ({ input }) => {
        return { timeline: null, wiring: 'phase-0' as const, input };
      }),

    ingestCactbot: protectedProcedure
      .input(
        z.object({
          url: z.string().url().optional(),
          encounterId: z.string().uuid(),
          raw: z.string().min(1).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        return { accepted: true, wiring: 'phase-0' as const, input };
      }),

    ingestTriggernometry: protectedProcedure
      .input(
        z.object({
          encounterId: z.string().uuid(),
          xml: z.string().min(1),
          patchVersion: z.string(),
        }),
      )
      .mutation(async ({ input }) => {
        return { accepted: true, wiring: 'phase-0' as const, input };
      }),

    ingestFFLogs: protectedProcedure
      .input(
        z.object({
          encounterId: z.string().uuid(),
          reportCode: z.string().min(1),
          bossSourceId: z.number().int().positive(),
        }),
      )
      .mutation(async ({ input }) => {
        return { accepted: true, wiring: 'phase-0' as const, input };
      }),
  }),

  plans: t.router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return { plans: [], wiring: 'phase-0' as const, userId: ctx.userId };
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(128),
          encounterId: z.string().uuid(),
          partyId: z.string().uuid(),
          mode: z.enum(['REBORN', 'EVOLVED', 'CURRENT', 'ALL']),
        }),
      )
      .mutation(async ({ input }) => {
        return { planId: crypto.randomUUID(), wiring: 'phase-0' as const, input };
      }),

    snapshot: protectedProcedure
      .input(z.object({ planId: z.string().uuid() }))
      .mutation(async ({ input }) => {
        return { snapshotId: crypto.randomUUID(), wiring: 'phase-0' as const, input };
      }),

    share: protectedProcedure
      .input(
        z.object({
          planId: z.string().uuid(),
          role: z.enum(['read', 'edit']),
          expiresInDays: z.number().int().min(1).max(90),
        }),
      )
      .mutation(async ({ input }) => {
        return { token: 'pending', wiring: 'phase-0' as const, input };
      }),
  }),

  auth: t.router({
    me: publicProcedure.query(({ ctx }) => {
      return { userId: ctx.userId, wiring: 'phase-0' as const };
    }),

    claimLegacyPlans: protectedProcedure
      .input(z.object({ planIds: z.array(z.string().uuid()) }))
      .mutation(async ({ input }) => {
        return { claimed: 0, wiring: 'phase-0' as const, input };
      }),
  }),
});

export type AppRouter = typeof appRouter;

export const tpcRouter = new Hono<AppEnv>().all('/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => c.var,
  }),
);