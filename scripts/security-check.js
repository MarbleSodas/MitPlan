#!/usr/bin/env node

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const isCI = process.env.CI === 'true' || process.argv.includes('--ci');
const scanOnly = process.argv.includes('--scan-only');
let hasIssues = false;

const secretPatterns = [
  { name: 'Supabase secret key', pattern: /sb_secret_[A-Za-z0-9_-]{16,}/g },
  { name: 'service-role key', pattern: /service_role["'\s:=]+[A-Za-z0-9._-]{24,}/gi },
  { name: 'FF Logs client secret', pattern: /FFLOGS_CLIENT_SECRET\s*[:=]\s*["']?[A-Za-z0-9_-]{20,}/g },
  { name: 'hardcoded FF Logs client ID', pattern: /FFLOGS_CLIENT_ID\s*[:=]\s*["']?[0-9a-f]{8}-[0-9a-f-]{27,}/gi },
  { name: 'hardcoded OAuth client secret', pattern: /client_secret\s*=\s*["'][A-Za-z0-9_-]{20,}["']/gi },
  { name: 'Google OAuth client ID', pattern: /[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com/g },
  { name: 'Stripe live key', pattern: /sk_live_[a-zA-Z0-9]{24,}/g },
  { name: 'Stripe test key', pattern: /sk_test_[a-zA-Z0-9]{24,}/g },
];

const binaryExtensions = new Set([
  '.avif', '.bmp', '.gif', '.ico', '.jpeg', '.jpg', '.lock', '.pdf', '.png', '.ttf', '.webp', '.woff', '.woff2',
]);

console.log('MitPlan security verification');

if (!isCI) {
  const envPath = join(projectRoot, '.env.local');
  if (!existsSync(envPath)) {
    console.error('ERROR: .env.local is missing; create it from .env.example.');
    hasIssues = true;
  } else {
    const envContent = readFileSync(envPath, 'utf8');
    const hasUrl = /^NEXT_PUBLIC_SUPABASE_URL=https?:\/\/.+/m.test(envContent);
    const hasPublishableKey = /^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.+/m.test(envContent);
    const hasLegacyAnonKey = /^NEXT_PUBLIC_SUPABASE_ANON_KEY=.+/m.test(envContent);
    if (!hasUrl || (!hasPublishableKey && !hasLegacyAnonKey)) {
      console.error('ERROR: required public Supabase environment variables are missing.');
      hasIssues = true;
    }
  }
}

const gitignorePath = join(projectRoot, '.gitignore');
if (!existsSync(gitignorePath) || !readFileSync(gitignorePath, 'utf8').includes('.env')) {
  console.error('ERROR: environment files are not ignored by git.');
  hasIssues = true;
}

let repositoryFiles = [];
try {
  repositoryFiles = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: projectRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  ).split('\0').filter(Boolean);
} catch {
  console.error('ERROR: could not enumerate repository files.');
  hasIssues = true;
}

for (const file of repositoryFiles) {
  const filePath = join(projectRoot, file);
  if (binaryExtensions.has(extname(file).toLowerCase())) continue;
  try {
    if (statSync(filePath).size > 2 * 1024 * 1024) continue;
    const content = readFileSync(filePath, 'utf8');
    for (const { name, pattern } of secretPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        console.error(`ERROR: potential ${name} in ${relative(projectRoot, filePath)}.`);
        hasIssues = true;
      }
    }
  } catch {
    // Files may disappear between git enumeration and the scan.
  }
}

const trackedFiles = new Set(
  execFileSync('git', ['ls-files'], { cwd: projectRoot, encoding: 'utf8' }).split('\n').filter(Boolean)
);
for (const sensitiveFile of ['.env', '.env.local', '.DS_Store']) {
  if (trackedFiles.has(sensitiveFile)) {
    console.error(`ERROR: sensitive file is tracked: ${sensitiveFile}.`);
    hasIssues = true;
  }
}

if (!scanOnly) {
  try {
    execSync('bun run build', { cwd: projectRoot, stdio: 'pipe' });
  } catch (error) {
    console.error(`ERROR: build failed during security verification: ${error.message}`);
    hasIssues = true;
  }
}

if (hasIssues) {
  console.error('Security verification failed.');
  process.exit(1);
}

console.log(`Security verification passed (${repositoryFiles.length} repository files scanned).`);
