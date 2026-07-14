#!/usr/bin/env bash
# Verify the release artifacts that do not require Supabase credentials.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

fail() {
  printf 'release preflight failed: %s\n' "$*" >&2
  exit 1
}

for migration in \
  0001_xivmitplan_v1_initial.sql \
  0002_xivmitplan_v1_acl.sql \
  0003_xivmitplan_v1_rpcs.sql \
  0004_xivmitplan_v1_seed.sql \
  0005_xivmitplan_v1_share_tokens.sql \
  0006_xivmitplan_v1_legacy_sentinel.sql \
  0007_xivmitplan_v1_rls_recursion_fix.sql \
  0008_xivmitplan_v1_realtime_viewer.sql \
  0009_xivmitplan_v1_core_release_hardening.sql \
  0010_xivmitplan_v1_auth_gotrue_null_fix.sql \
  0011_xivmitplan_v1_auth_gotrue_null_fix_remaining.sql \
  0012_xivmitplan_v1_planner_catalog.sql \
  0013_xivmitplan_v1_plan_management.sql; do
  test -f "packages/persistence/migrations/$migration" || fail "missing migration $migration"
done

test -L supabase/migrations || fail 'supabase/migrations must be a tracked symlink'
test "$(readlink supabase/migrations)" = '../packages/persistence/migrations' || fail 'supabase/migrations targets the wrong directory'
test -L supabase/functions || fail 'supabase/functions must be a tracked symlink'
test "$(readlink supabase/functions)" = '../apps/edge/functions' || fail 'supabase/functions targets the wrong directory'
test -L supabase/_shared || fail 'supabase/_shared must be a tracked symlink'
test "$(readlink supabase/_shared)" = '../apps/edge/_shared' || fail 'supabase/_shared targets the wrong directory'

for function_name in \
  timelines-ingest-cactbot \
  timelines-ingest-triggernometry \
  timelines-ingest-fflogs \
  plans-create \
  plans-snapshot \
  plans-share \
  plans-share-redeem \
  plans-update \
  plans-delete \
  plans-duplicate \
  auth-claim-legacy-plans; do
  test -f "apps/edge/functions/$function_name/index.ts" || fail "missing Edge Function $function_name"
done

if rg -n --glob 'package.json' '"(hono|@hono/|@trpc/|@upstash/|wrangler|@cloudflare/workers-types)"' .; then
  fail 'retired Path B dependencies remain in a package manifest'
fi

forbidden_jwt_flag='--no-verify''-jwt'
if rg -n --glob '*.sh' --glob '*.yml' --glob '*.yaml' -- "$forbidden_jwt_flag" scripts .github; then
  fail 'Edge Function deployment disables JWT verification'
fi

printf 'release preflight passed\n'
