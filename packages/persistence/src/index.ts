/**
 * @xivmitplan/persistence — Drizzle + Postgres.
 * See architecture §17 (data model) and §16.5 (composition root).
 *
 * Path A (ADR-0002 §T-6): Redis removed. The 14-table schema
 * (catalog + plans + plan_snapshots + plan_access + ydoc_snapshots +
 * profiles + parties + legacy_local_plans) and the 8 PostgREST RPCs
 * (migration 0003) are the entire persistence surface. No materialized
 * views, no UNLOGGED tables, no `pg_cron`-driven TTLs at the application
 * layer; the only cron job is `flip_expired_legacy_plans` (mitigates
 * 90-day unclaimed MitPlan v1 anonymous plans, per ADR-0001 §22.7).
 */
export * from './schema/index.js';
export * from './db.js';
