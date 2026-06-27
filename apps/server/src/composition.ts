/**
 * Composition root. Architecture §10.5, §16.5, Appendix A.
 * The only file that imports concrete classes. Tests substitute
 * `InMemory*` implementations via this entry point.
 *
 * Path A (ADR-0002): Upstash Redis removed. Catalog cache uses a
 * Postgres materialized view refreshed by `pg_cron`; dirty-plan set
 * and rate-limit counters use UNLOGGED tables with `pg_cron` TTL.
 */
import { createDrizzleClient, type DrizzleClient } from '@xivmitplan/persistence';
import { MultiplicativeMitStackEvaluator } from '@xivmitplan/domain/math';
import { CactbotTimelineParser } from '@xivmitplan/domain/parsers/cactbot';
import { TriggernometryTimelineParser } from '@xivmitplan/domain/parsers/triggernometry';
import { FFLogsTimelineParser } from '@xivmitplan/domain/parsers/fflogs';
import { DefaultTimelineMerger } from '@xivmitplan/domain/parsers/merger';
import { createClient } from '@supabase/supabase-js';
import type { Env } from './env.js';

export interface AppConfig {
  environment: 'dev' | 'staging' | 'prod';
  corsOrigins: string[];
}

export interface AppContext {
  db: DrizzleClient;
  supabase: ReturnType<typeof createClient>;
  supabaseAdmin: ReturnType<typeof createClient>;
  config: AppConfig;
  mitStackEvaluator: MultiplicativeMitStackEvaluator;
  parsers: {
    cactbot: CactbotTimelineParser;
    triggernometry: TriggernometryTimelineParser;
    fflogs: FFLogsTimelineParser;
  };
  merger: DefaultTimelineMerger;
}

export const buildAppContext = async (env: Env): Promise<AppContext> => {
  const db = createDrizzleClient(env.DATABASE_URL);

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as ReturnType<typeof createClient>;
  const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as ReturnType<typeof createClient>;

  const corsOrigins = env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [
    'http://localhost:5173',
  ];

  return {
    db,
    supabase,
    supabaseAdmin,
    config: { environment: env.ENVIRONMENT, corsOrigins },
    mitStackEvaluator: new MultiplicativeMitStackEvaluator(),
    parsers: {
      cactbot: new CactbotTimelineParser(),
      triggernometry: new TriggernometryTimelineParser(),
      fflogs: new FFLogsTimelineParser(),
    },
    merger: new DefaultTimelineMerger(),
  };
};
