#!/usr/bin/env node

/**
 * Plan Ownership Migration Script
 * Migrates existing plans to include ownership and access control fields
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * Migrate a single plan to include ownership fields
 */
async function migratePlan(planId, planData) {
  const now = Date.now();
  const updates = {};
  let hasUpdates = false;

  // Set ownerId if missing (use userId as fallback)
  if (!planData.ownerId && planData.userId) {
    updates.ownerId = planData.userId;
    hasUpdates = true;
    console.log(`  Setting ownerId: ${planData.userId}`);
  }

  // Initialize accessedBy if missing
  if (!planData.accessedBy) {
    updates.accessedBy = {};
    hasUpdates = true;
    console.log(`  Initializing accessedBy object`);
  }

  // Set createdAt if missing
  if (!planData.createdAt) {
    updates.createdAt = now;
    hasUpdates = true;
    console.log(`  Setting createdAt: ${now}`);
  }

  // Set updatedAt if missing
  if (!planData.updatedAt) {
    updates.updatedAt = now;
    hasUpdates = true;
    console.log(`  Setting updatedAt: ${now}`);
  }

  // Set lastAccessedAt if missing
  if (!planData.lastAccessedAt) {
    updates.lastAccessedAt = now;
    hasUpdates = true;
    console.log(`  Setting lastAccessedAt: ${now}`);
  }

  // Apply updates if any
  if (hasUpdates) {
    const planRef = ref(database, `plans/${planId}`);
    await update(planRef, updates);
    console.log(`  ✅ Plan ${planId} migrated successfully`);
    return true;
  } else {
    console.log(`  ⏭️  Plan ${planId} already up to date`);
    return false;
  }
}

/**
 * Main migration function
 */
async function migratePlanOwnership() {
  try {
    console.log('🔄 Starting plan ownership migration...');
    
    // Get all plans
    const plansRef = ref(database, 'plans');
    const snapshot = await get(plansRef);
    
    if (!snapshot.exists()) {
      console.log('📭 No plans found in database');
      return;
    }
    
    const plans = snapshot.val();
    const planIds = Object.keys(plans);
    
    console.log(`📋 Found ${planIds.length} plans to check`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each plan
    for (const planId of planIds) {
      const planData = plans[planId];
      
      console.log(`\n🔍 Processing plan: ${planId}`);
      console.log(`  Name: ${planData.title || planData.name || 'Untitled'}`);
      console.log(`  Owner: ${planData.ownerId || planData.userId || 'Unknown'}`);
      
      try {
        const wasMigrated = await migratePlan(planId, planData);
        if (wasMigrated) {
          migratedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error migrating plan ${planId}:`, error.message);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`  Total plans: ${planIds.length}`);
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Skipped (already up to date): ${skippedCount}`);
    console.log(`  Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review the logs above.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Dry run function to preview changes without applying them
 */
async function dryRunMigration() {
  try {
    console.log('🔍 Running dry run migration preview...');
    
    // Get all plans
    const plansRef = ref(database, 'plans');
    const snapshot = await get(plansRef);
    
    if (!snapshot.exists()) {
      console.log('📭 No plans found in database');
      return;
    }
    
    const plans = snapshot.val();
    const planIds = Object.keys(plans);
    
    console.log(`📋 Found ${planIds.length} plans to analyze`);
    
    let needsMigrationCount = 0;
    let upToDateCount = 0;
    
    // Analyze each plan
    for (const planId of planIds) {
      const planData = plans[planId];
      
      console.log(`\n🔍 Analyzing plan: ${planId}`);
      console.log(`  Name: ${planData.title || planData.name || 'Untitled'}`);
      console.log(`  Current ownerId: ${planData.ownerId || 'MISSING'}`);
      console.log(`  Current userId: ${planData.userId || 'MISSING'}`);
      console.log(`  Has accessedBy: ${planData.accessedBy ? 'YES' : 'NO'}`);
      console.log(`  Has createdAt: ${planData.createdAt ? 'YES' : 'NO'}`);
      console.log(`  Has lastAccessedAt: ${planData.lastAccessedAt ? 'YES' : 'NO'}`);
      
      const needsMigration = !planData.ownerId || !planData.accessedBy || !planData.createdAt || !planData.lastAccessedAt;
      
      if (needsMigration) {
        console.log(`  Status: ⚠️  NEEDS MIGRATION`);
        needsMigrationCount++;
      } else {
        console.log(`  Status: ✅ UP TO DATE`);
        upToDateCount++;
      }
    }
    
    // Summary
    console.log('\n📊 Dry Run Summary:');
    console.log(`  Total plans: ${planIds.length}`);
    console.log(`  Need migration: ${needsMigrationCount}`);
    console.log(`  Already up to date: ${upToDateCount}`);
    
    if (needsMigrationCount > 0) {
      console.log('\n💡 To apply these changes, run: node scripts/migratePlanOwnership.js --apply');
    } else {
      console.log('\n🎉 All plans are already up to date!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Dry run failed:', error);
    process.exit(1);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const isDryRun = args.includes('--dry-run') || !shouldApply;

if (isDryRun) {
  console.log('🔍 Running in dry-run mode (no changes will be made)');
  dryRunMigration();
} else {
  console.log('⚠️  Running in apply mode (changes will be made to the database)');
  migratePlanOwnership();
}
