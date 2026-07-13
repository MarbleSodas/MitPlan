#!/usr/bin/env bash
# supabase-bootstrap.sh
#
# One-shot bootstrap for the XIVMitPlan Supabase backend.
# Replaces the manual step-by-step walkthrough in docs/infra-setup.md
# with a single, idempotent script you can re-run safely.
#
# What this does:
#   1. Verify the supabase CLI is installed.
#   2. Link the local repo to a Supabase project (interactive on first
#      run; cached in .supabase/ for subsequent runs).
#   3. Apply all 8 SQL migrations in order (initial + ACL + RPCs + seed
#      + share tokens + legacy sentinel + RLS recursion fix + viewer ACL).
#   4. Set the Edge Function secrets required by the runtime.
#   5. Deploy all 8 Edge Functions (3 timeline ingests + 5 plan flows
#      including plans-share-redeem + 1 legacy claim).
#   6. Print a checklist for the manual steps (OAuth apps, Realtime
#      policy binding) that this script can't automate.
#
# Usage:
#   ./scripts/supabase-bootstrap.sh                    # bootstrap default env (dev)
#   ./scripts/supabase-bootstrap.sh staging            # bootstrap the staging env
#   ./scripts/supabase-bootstrap.sh production         # bootstrap the production env
#   ./scripts/supabase-bootstrap.sh --skip-deploy      # apply migrations only
#   ./scripts/supabase-bootstrap.sh --migrations-only  # same as --skip-deploy
#
# Prerequisites:
#   - Supabase CLI 1.215+ (brew install supabase/tap/supabase)
#   - A Supabase project already created at https://supabase.com/dashboard
#   - `supabase login` already run (token cached in ~/.supabase/)
#
# Safe to re-run: every step is idempotent.

set -euo pipefail

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

ENV="${1:-dev}"
SKIP_DEPLOY=false
case "${ENV}" in
  --skip-deploy|--migrations-only) SKIP_DEPLOY=true; ENV="dev" ;;
  dev|staging|production) ;;
  -h|--help)
    sed -n '2,30p' "$0" | sed 's/^# \?//'
    exit 0
    ;;
  *)
    echo "Unknown env: ${ENV}. Use dev, staging, production, or --skip-deploy." >&2
    exit 1
    ;;
esac

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="${REPO_ROOT}/packages/persistence/migrations"
EDGE_FUNCTIONS_DIR="${REPO_ROOT}/apps/edge/functions"
SECRETS_ENV_FILE="${REPO_ROOT}/apps/edge/.env.${ENV}"

# ---------------------------------------------------------------------------
# Color helpers (only when stdout is a tty)
# ---------------------------------------------------------------------------

if [ -t 1 ]; then
  BOLD="\033[1m"; RESET="\033[0m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; CYAN="\033[36m"
else
  BOLD=""; RESET=""; GREEN=""; YELLOW=""; RED=""; CYAN=""
fi
say()  { printf "${BOLD}${CYAN}==>${RESET} ${BOLD}%s${RESET}\n" "$*"; }
ok()   { printf "${GREEN}✓${RESET} %s\n" "$*"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$*"; }
die()  { printf "${RED}✗${RESET} %s\n" "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Prereq checks
# ---------------------------------------------------------------------------

say "Checking prerequisites"
command -v supabase >/dev/null 2>&1 || die "supabase CLI not found. Install with: brew install supabase/tap/supabase"
SUPABASE_VERSION=$(supabase --version 2>/dev/null | awk '{print $NF}')
ok "supabase CLI ${SUPABASE_VERSION}"

if [ ! -d "${MIGRATIONS_DIR}" ]; then
  die "Migrations directory not found: ${MIGRATIONS_DIR}"
fi
ok "Migrations directory found"

# ---------------------------------------------------------------------------
# 2. Project link (only if not already linked)
# ---------------------------------------------------------------------------

if [ ! -f "${REPO_ROOT}/.supabase/.temp/project-ref" ] && [ ! -f "${REPO_ROOT}/supabase/.temp/project-ref" ]; then
  say "Linking to Supabase project for env: ${ENV}"
  warn "You'll be prompted for the project ref (find it at"
  warn "https://supabase.com/dashboard → Project Settings → General)."
  supabase link --env-file "${SECRETS_ENV_FILE}" || die "supabase link failed"
else
  ok "Supabase project already linked"
fi

# ---------------------------------------------------------------------------
# 3. Apply migrations
# ---------------------------------------------------------------------------

say "Applying migrations"
# Discover migrations dynamically so the script stays in sync as new
# migrations are added (current count: 0001-0008). Files are applied
# in lexicographic order which matches the leading number.
shopt -s nullglob
MIGRATIONS=( "${MIGRATIONS_DIR}"/0*.sql )
shopt -u nullglob
if [ "${#MIGRATIONS[@]}" -eq 0 ]; then
  die "No migration files found in ${MIGRATIONS_DIR}"
fi
# Use db push for the canonical apply — Supabase CLI handles the
# remote state tracking so re-runs are no-ops. We only use psql as a
# last-resort fallback when db push can't reach the remote (e.g.
# local DB not running, no Docker daemon).
DB_PUSH_OK=false
if supabase db push --include-all 2>&1 | tee /tmp/_supabase_db_push.log | grep -qE "Finished|already up to date"; then
  DB_PUSH_OK=true
fi
if [ "${DB_PUSH_OK}" = false ]; then
  warn "supabase db push did not report success; falling back to per-file psql apply"
  if ! command -v psql >/dev/null 2>&1; then
    die "psql not found and db push failed. Install psql or run supabase db push manually."
  fi
  DB_URL=$(supabase status --output env 2>/dev/null | grep "^DB_URL=" | cut -d= -f2- || true)
  if [ -z "${DB_URL}" ]; then
    die "Could not auto-detect DB_URL. Set DATABASE_URL and re-run."
  fi
  for PATH_TO_MIGRATION in "${MIGRATIONS[@]}"; do
    MIGRATION="$(basename "${PATH_TO_MIGRATION}")"
    printf "  ${BOLD}->${RESET} %s ... " "${MIGRATION}"
    psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "${PATH_TO_MIGRATION}" >/dev/null \
      && echo "${GREEN}applied${RESET}" \
      || die "Failed to apply ${MIGRATION}"
  done
else
  # Print what db push reported
  while IFS= read -r line; do
    printf "  ${BOLD}->${RESET} %s\n" "${line}"
  done < /tmp/_supabase_db_push.log
fi

# ---------------------------------------------------------------------------
# 4. Set Edge Function secrets
# ---------------------------------------------------------------------------

say "Setting Edge Function secrets"
warn "Reading from ${SECRETS_ENV_FILE} (create this file with the values"
warn "from .env.example filled in for the ${ENV} env)."

if [ ! -f "${SECRETS_ENV_FILE}" ]; then
  warn "Secrets file not found. The Edge Functions won't have CORS_ORIGINS,"
  warn "FFLOGS_OAUTH_TOKEN, or JWT_SIGNING_KEY set. SUPABASE_URL /"
  warn "SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are auto-provisioned"
  warn "by supabase link."
else
  # set -a auto-exports all variables defined after it
  set -a
  # shellcheck disable=SC1090
  source "${SECRETS_ENV_FILE}"
  set +a

  [ -n "${JWT_SIGNING_KEY:-}" ] && supabase secrets set JWT_SIGNING_KEY="${JWT_SIGNING_KEY}" >/dev/null && ok "JWT_SIGNING_KEY set"
  [ -n "${FFLOGS_OAUTH_TOKEN:-}" ] && supabase secrets set FFLOGS_OAUTH_TOKEN="${FFLOGS_OAUTH_TOKEN}" >/dev/null && ok "FFLOGS_OAUTH_TOKEN set"
  [ -n "${CORS_ORIGINS:-}" ] && supabase secrets set CORS_ORIGINS="${CORS_ORIGINS}" >/dev/null && ok "CORS_ORIGINS set"
fi

# ---------------------------------------------------------------------------
# 5. Deploy Edge Functions
# ---------------------------------------------------------------------------

if [ "${SKIP_DEPLOY}" = true ]; then
  warn "Skipping Edge Function deploy (--skip-deploy)"
else
  say "Deploying Edge Functions"
  # Discover function directories dynamically so the script stays in
  # sync as new functions are added. Each function is a subdirectory
  # under apps/edge/functions/ with its own index.ts.
  shopt -s nullglob
  FUNCTIONS=( "${EDGE_FUNCTIONS_DIR}"/*/ )
  shopt -u nullglob
  if [ "${#FUNCTIONS[@]}" -eq 0 ]; then
    die "No edge function source directories found under ${EDGE_FUNCTIONS_DIR}"
  fi
  for FUNCTION_DIR in "${FUNCTIONS[@]}"; do
    FUNCTION="$(basename "${FUNCTION_DIR%/}")"
    if [ ! -f "${FUNCTION_DIR}index.ts" ]; then
      # Skip helper / shared dirs that don't have an entrypoint.
      continue
    fi
    printf "  ${BOLD}->${RESET} %s ... " "${FUNCTION}"
    supabase functions deploy "${FUNCTION}" --no-verify-jwt >/dev/null 2>&1 \
      && echo "${GREEN}deployed${RESET}" \
      || echo "${YELLOW}failed${RESET} (run 'supabase functions deploy ${FUNCTION}' manually to see the error)"
  done
fi

# ---------------------------------------------------------------------------
# 6. Manual checklist
# ---------------------------------------------------------------------------

cat <<EOF

${BOLD}============================================================${RESET}
${BOLD}  XIVMitPlan Supabase bootstrap complete (env: ${ENV})${RESET}
${BOLD}============================================================${RESET}

${BOLD}Next manual steps (not automatable from the CLI):${RESET}

  1. ${YELLOW}Enable Auth providers${RESET} in the Supabase Dashboard
     (Authentication → Providers). At minimum enable Discord and
     Email. Optionally Google. See docs/infra-setup.md §5-§7 for
     the OAuth app creation steps.

  2. ${YELLOW}Bind the Realtime authorization policy${RESET}:
     Dashboard → Database → Replication → Policies → Create policy
       Target:    "Realtime messages from a client"
       Channels:  plan:*
       Allowed:   expression
       Expression: realtime.check_plan_access(channel_name, realtime.jstools.extract_metadata('claims'))

  3. ${YELLOW}Verify migrations${RESET} in the SQL editor:
       SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
     Expected: 8 rows (0001..0008).

  4. ${YELLOW}Copy .env.example to .env.local${RESET} at the repo root
     and fill in:
       VITE_SUPABASE_URL=https://<project-ref>.supabase.co
       VITE_SUPABASE_ANON_KEY=<anon key from Dashboard → API>

  5. ${YELLOW}Boot the dev server${RESET} and verify the FRU base
     timeline shows up:
       pnpm --filter @xivmitplan/web dev
       open http://localhost:5173/plan
     Click "New plan" — you should see FRU P1, FRU P2, M1S, M2S,
     P1S, P4S in the encounter picker.

EOF
