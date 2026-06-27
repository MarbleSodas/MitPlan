/**
 * Drizzle Kit config. Architecture §17.8.
 *
 * Drizzle Kit reads the schema in packages/persistence/src/schema/
 * and generates SQL migrations under packages/persistence/migrations/.
 * CI runs `drizzle-kit migrate` against staging, then production.
 */
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './packages/persistence/src/schema/index.ts',
  out: './packages/persistence/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:54322/postgres',
  },
  verbose: true,
  strict: true,
});
