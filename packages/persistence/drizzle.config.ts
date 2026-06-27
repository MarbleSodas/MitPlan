/**
 * Drizzle Kit config (package-local). Mirrors the root config.
 * Architecture §17.8.
 */
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env['DATABASE_URL'] ??
      'postgres://postgres:postgres@localhost:54322/postgres',
  },
  verbose: true,
  strict: true,
});
