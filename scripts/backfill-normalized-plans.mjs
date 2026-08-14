import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secretKey) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SECRET_KEY before running the plan backfill.'
  );
  process.exitCode = 1;
} else {
  const supabase = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc('backfill_normalized_plans');

  if (error) {
    console.error(`Normalized plan backfill failed: ${error.message}`);
    process.exitCode = 1;
  } else {
    const reports = Array.isArray(data?.reports) ? data.reports : [];
    const failed = reports.filter((report) => report.status !== 'migrated');
    console.log(JSON.stringify({
      migrated: data?.migrated || 0,
      skippedOrFailed: data?.skippedOrFailed || 0,
      reportCount: reports.length,
      failed,
    }, null, 2));
    if (failed.length > 0) process.exitCode = 2;
  }
}
