/**
 * @xivmitplan/persistence — Drizzle + Postgres.
 * See architecture §17 (data model) and §16.5 (composition root).
 *
 * Path A (ADR-0002 §T-6): Redis removed. Catalog cache uses a Postgres
 * materialized view refreshed by `pg_cron`; the dirty-plan set and
 * rate-limit counters use UNLOGGED tables with `pg_cron` TTL.
 */
export * from './schema/index.js';
export * from './db.js';
