#!/usr/bin/env node

/**
 * Verify Firebase Realtime Database rules and collaboration structure.
 * Uses the Firebase CLI so the checks match the deployed database/rules state.
 */

import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const localRules = JSON.parse(readFileSync(join(projectRoot, 'database.rules.json'), 'utf8'));

const projectId = firebaseConfig.projectId;
const databaseInstance = firebaseConfig.databaseURL
  ? new URL(firebaseConfig.databaseURL).host.split('.')[0]
  : undefined;

function runFirebaseDatabaseCommand(command, path, extraArgs = []) {
  const args = ['database:' + command, path, '--project', projectId];

  if (databaseInstance) {
    args.push('--instance', databaseInstance);
  }

  args.push(...extraArgs);

  return execFileSync('firebase', args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function databaseGet(path, extraArgs = []) {
  const rawOutput = runFirebaseDatabaseCommand('get', path, extraArgs).trim();
  return rawOutput ? JSON.parse(rawOutput) : null;
}

function databaseSet(path, data) {
  runFirebaseDatabaseCommand('set', path, ['--data', JSON.stringify(data), '--force']);
}

function formatCount(value) {
  if (!value || typeof value !== 'object') {
    return 0;
  }

  return Object.keys(value).length;
}

function getValueAtPath(source, path) {
  return path.reduce((currentValue, key) => currentValue?.[key], source);
}

function normalizeRuleValue(value) {
  if (Array.isArray(value)) {
    return [...value].sort();
  }

  return value;
}

function collectRuleMismatches(localSource, liveSource, checks) {
  return checks.flatMap(({ label, path }) => {
    const localValue = normalizeRuleValue(getValueAtPath(localSource, path));
    const liveValue = normalizeRuleValue(getValueAtPath(liveSource, path));

    if (JSON.stringify(localValue) === JSON.stringify(liveValue)) {
      return [];
    }

    return [
      {
        label,
        localValue,
        liveValue,
      },
    ];
  });
}

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying Firebase Realtime Database rules and collaboration structure...\n');

    console.log('📋 Test 1: Checking local rules source...');
    if (!localRules.rules?.plans || !localRules.rules?.planCollaboration) {
      console.log('❌ Local database.rules.json is missing the plans or planCollaboration branch');
      return false;
    }
    console.log('✅ Local rules include plans and planCollaboration');

    console.log('\n📋 Test 2: Checking live RTDB rules...');
    const liveRules = databaseGet('/.settings/rules');
    if (!liveRules?.rules?.plans || !liveRules?.rules?.planCollaboration) {
      console.log('❌ Live rules are missing the plans or planCollaboration branch');
      return false;
    }

    const ruleChecks = [
      { label: '/plans/.read', path: ['rules', 'plans', '.read'] },
      { label: '/plans/.write', path: ['rules', 'plans', '.write'] },
      { label: '/plans/.indexOn', path: ['rules', 'plans', '.indexOn'] },
      { label: '/plans/$planId/.read', path: ['rules', 'plans', '$planId', '.read'] },
      { label: '/plans/$planId/.write', path: ['rules', 'plans', '$planId', '.write'] },
      { label: '/planCollaboration/.read', path: ['rules', 'planCollaboration', '.read'] },
      { label: '/planCollaboration/.write', path: ['rules', 'planCollaboration', '.write'] },
      { label: '/planCollaboration/$planId/.read', path: ['rules', 'planCollaboration', '$planId', '.read'] },
      { label: '/planCollaboration/$planId/.write', path: ['rules', 'planCollaboration', '$planId', '.write'] },
    ];
    const ruleMismatches = collectRuleMismatches(localRules, liveRules, ruleChecks);

    if (ruleMismatches.length > 0) {
      console.log('❌ Live RTDB rules do not match database.rules.json');
      ruleMismatches.forEach(({ label, localValue, liveValue }) => {
        console.log(`   ${label}`);
        console.log(`     local: ${JSON.stringify(localValue)}`);
        console.log(`     live:  ${JSON.stringify(liveValue)}`);
      });
      return false;
    }
    console.log('✅ Live rules include the expected /plans and /planCollaboration subtrees');

    console.log('\n📋 Test 3: Checking available plan data...');
    const planKeys = databaseGet('/plans', ['--shallow', '--limit-to-first', '1']);
    const samplePlanId = planKeys && typeof planKeys === 'object' ? Object.keys(planKeys)[0] : null;

    if (!samplePlanId) {
      console.log('❌ No plans found in /plans');
      return false;
    }

    const samplePlan = databaseGet(`/plans/${samplePlanId}`);

    const samplePlanName = samplePlan.name || samplePlan.title || 'Unknown';
    const sampleBoss = samplePlan.sourceTimelineName || samplePlan.selectedBoss?.name || samplePlan.bossId || 'Unknown';
    console.log('✅ Sample plan exists');
    console.log(`   Plan ID: ${samplePlanId}`);
    console.log(`   Plan: ${samplePlanName}`);
    console.log(`   Boss/Timeline: ${sampleBoss}`);
    console.log(`   Public: ${samplePlan.isPublic === true}`);

    console.log('\n📋 Test 4: Checking collaboration tree...');
    const roomId = `plan:${samplePlanId}`;
    const collaborationRootPath = `/planCollaboration/${roomId}`;
    const collaborationRoot = databaseGet(collaborationRootPath);

    if (collaborationRoot) {
      console.log('✅ Collaboration root exists');
      console.log(`   Active users: ${formatCount(collaborationRoot.activeUsers)}`);
      console.log(`   Presence entries: ${formatCount(collaborationRoot.presence)}`);
      console.log(`   Job assignments: ${formatCount(collaborationRoot.jobAssignments)}`);
    } else {
      console.log('ℹ️  Collaboration root will be created on first collaborative session');
    }

    console.log('\n📋 Test 5: Testing collaboration subtree writes...');
    const testSessionId = `verify-session-${Date.now()}`;
    const testJobId = `verify-job-${Date.now()}`;
    const activeUserPath = `${collaborationRootPath}/activeUsers/${testSessionId}`;
    const presencePath = `${collaborationRootPath}/presence/${testSessionId}`;
    const jobAssignmentPath = `${collaborationRootPath}/jobAssignments/${testJobId}`;

    databaseSet(activeUserPath, {
      sessionId: testSessionId,
      userId: 'verify-user',
      displayName: 'Verify User',
      email: 'verify@example.com',
      color: '#3b82f6',
      joinedAt: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
    });

    databaseSet(presencePath, {
      activeTarget: null,
      interaction: 'selected',
      cursor: null,
      viewport: {
        surface: 'planner',
        panel: 'timeline',
        section: 'timeline',
        scrollTop: 0,
      },
      lastUpdated: Date.now(),
    });

    databaseSet(jobAssignmentPath, {
      userId: 'verify-user',
      displayName: 'Verify User',
      color: '#3b82f6',
      claimedAt: Date.now(),
    });

    const activeUserRecord = databaseGet(activeUserPath);
    const presenceRecord = databaseGet(presencePath);
    const jobAssignmentRecord = databaseGet(jobAssignmentPath);

    if (!activeUserRecord || !presenceRecord || !jobAssignmentRecord) {
      console.log('❌ Collaboration subtree write verification failed');
      return false;
    }

    console.log('✅ Collaboration subtree writes succeeded');

    databaseSet(activeUserPath, null);
    databaseSet(presencePath, null);
    databaseSet(jobAssignmentPath, null);
    console.log('✅ Collaboration subtree cleanup succeeded');

    console.log('\n🎉 Database verification complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Local rules file includes plans and planCollaboration');
    console.log('   ✅ Live /plans and /planCollaboration rules match database.rules.json');
    console.log('   ✅ Sample plan data is available');
    console.log('   ✅ planCollaboration/activeUsers, presence, and jobAssignments are writable');
    console.log(`\n🔗 Verified instance: ${databaseInstance || 'default'}`);

    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.message || error);
    return false;
  }
}

verifyDatabase()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Verification error:', error);
    process.exit(1);
  });
