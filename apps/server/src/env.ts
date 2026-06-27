/**
 * Worker env bindings. Architecture §7.2, §14.6.6.
 */
export interface Env {
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_JWT_SECRET: string;
  // Database
  DATABASE_URL: string;
  // Redis
  UPSTASH_REDIS_URL: string;
  UPSTASH_REDIS_TOKEN: string;
  // FFLogs
  FFLOGS_OAUTH_CLIENT_ID?: string;
  FFLOGS_OAUTH_CLIENT_SECRET?: string;
  // Discord + Google OAuth (mirror of Supabase for direct callbacks)
  DISCORD_OAUTH_CLIENT_ID?: string;
  DISCORD_OAUTH_CLIENT_SECRET?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  // Share-link signing
  JWT_SIGNING_KEY: string;
  // R2 (backups)
  R2_BACKUPS_BUCKET?: string;
  // Sentry
  SENTRY_DSN?: string;
  // Honeycomb
  HONEYCOMB_API_KEY?: string;
  // Environment
  ENVIRONMENT: 'dev' | 'staging' | 'prod';
  // CORS
  CORS_ORIGINS?: string; // comma-separated
}
