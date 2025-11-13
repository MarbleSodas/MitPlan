#!/usr/bin/env node

/**
 * Security Verification Script
 * Checks for common security issues and verifies environment variable setup
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔒 MitPlan Security Verification\n');

let hasIssues = false;

// Check 1: Verify .env file exists
console.log('📋 Checking environment configuration...');
const envPath = join(projectRoot, '.env');
if (existsSync(envPath)) {
  console.log('✅ .env file exists');
} else {
  console.log('❌ .env file missing - create from .env.example');
  hasIssues = true;
}

// Check 2: Verify .env is in .gitignore
console.log('\n📋 Checking .gitignore configuration...');
const gitignorePath = join(projectRoot, '.gitignore');
if (existsSync(gitignorePath)) {
  const gitignoreContent = readFileSync(gitignorePath, 'utf8');
  if (gitignoreContent.includes('.env')) {
    console.log('✅ .env files are properly ignored');
  } else {
    console.log('❌ .env files not in .gitignore');
    hasIssues = true;
  }
} else {
  console.log('❌ .gitignore file missing');
  hasIssues = true;
}

// Check 3: Scan for hardcoded secrets in source files
console.log('\n📋 Scanning for hardcoded secrets...');
const secretPatterns = [
  /AIzaSy[A-Za-z0-9_-]{33}/g, // Firebase API keys
  /[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com/g, // Google OAuth client IDs
  /sk_live_[a-zA-Z0-9]{24}/g, // Stripe live keys
  /sk_test_[a-zA-Z0-9]{24}/g, // Stripe test keys
];

const sourceFiles = [
  'src/config/firebase.js',
  'src/services/optimizedFirebaseService.js',
  'scripts/verifyDatabase.js',
  'scripts/initializeDatabase.js',
  'scripts/migratePlanOwnership.js'
];

let foundSecrets = false;
for (const file of sourceFiles) {
  const filePath = join(projectRoot, file);
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf8');
    for (const pattern of secretPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`❌ Potential secret found in ${file}: ${matches[0].substring(0, 10)}...`);
        foundSecrets = true;
        hasIssues = true;
      }
    }
  }
}

if (!foundSecrets) {
  console.log('✅ No hardcoded secrets detected in source files');
}

// Check 4: Verify environment variables are loaded
console.log('\n📋 Testing environment variable loading...');
try {
  const { firebaseConfig } = await import('./firebase-config.js');
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    console.log('✅ Environment variables loaded successfully');
  } else {
    console.log('❌ Environment variables not properly loaded');
    hasIssues = true;
  }
} catch (error) {
  console.log('❌ Error loading environment variables:', error.message);
  hasIssues = true;
}

// Check 5: Verify build works
console.log('\n📋 Testing build process...');
try {
  execSync('npm run build', { cwd: projectRoot, stdio: 'pipe' });
  console.log('✅ Build process completed successfully');
} catch (error) {
  console.log('❌ Build process failed');
  console.log('Error:', error.message);
  hasIssues = true;
}

// Check 6: Verify sensitive files are not tracked by git
console.log('\n📋 Checking git tracking...');
try {
  const trackedFiles = execSync('git ls-files', { cwd: projectRoot, encoding: 'utf8' });
  const sensitiveFiles = ['.env', 'dist/', '.DS_Store'];
  
  let foundTrackedSensitive = false;
  for (const sensitiveFile of sensitiveFiles) {
    if (trackedFiles.includes(sensitiveFile)) {
      console.log(`❌ Sensitive file tracked by git: ${sensitiveFile}`);
      foundTrackedSensitive = true;
      hasIssues = true;
    }
  }
  
  if (!foundTrackedSensitive) {
    console.log('✅ No sensitive files tracked by git');
  }
} catch (error) {
  console.log('⚠️  Could not check git tracking (not a git repository?)');
}

// Final report
console.log('\n' + '='.repeat(50));
if (hasIssues) {
  console.log('❌ SECURITY ISSUES FOUND');
  console.log('Please address the issues above before deploying.');
  process.exit(1);
} else {
  console.log('✅ SECURITY CHECK PASSED');
  console.log('All security checks completed successfully!');
  console.log('\n🚀 Ready for secure deployment!');
  process.exit(0);
}
