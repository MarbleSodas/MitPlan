/**
 * Drizzle client. See architecture §7.4, §16.5.
 *
 * The client is created with the user's Supabase Auth JWT so that
 * Row-Level Security is enforced at the database boundary. The
 * service-role key is used only by the realtime DO's `onSave` to
 * write snapshots that bypass RLS.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema/index.js';

export type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

export const createDrizzleClient = (databaseUrl: string): DrizzleClient => {
  const client = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Supavisor compatibility
  });
  return drizzle(client, { schema, logger: false });
};

/** Lightweight health check. */
export const ping = async (db: DrizzleClient): Promise<boolean> => {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
};
