/**
 * Manual validation script for the enhanced cooldown system integration
 * 
 * This script can be run in the browser console to validate that the
 * enhanced cooldown system is working correctly with the MitPlan application.
 */

import { validateCooldownSystem, getCooldownSystemMetrics } from './index';
import { getCooldownManager } from './cooldownManager';
import { getAetherflowTracker } from './aetherflowTracker';
import { mitigationAbilities } from '../../data';

/**
 * Validate the enhanced cooldown system integration
 */
export const validateIntegration = () => {
  console.log('🔍 Starting Enhanced Cooldown System Integration Validation...');
  
  try {
    // Test data
    const testData = {
      bossActions: [
        { id: 'action1', time: 10, name: 'Tank Buster 1', isTankBuster: true },
        { id: 'action2', time: 30, name: 'Raid Wide 1', isTankBuster: false },
        { id: 'action3', time: 50, name: 'Tank Buster 2', isTankBuster: true },
        { id: 'action4', time: 70, name: 'Raid Wide 2', isTankBuster: false },
        { id: 'action5', time: 90, name: 'Tank Buster 3', isTankBuster: true }
      ],
      bossLevel: 90,
      selectedJobs: {
        'PLD': true,
        'WAR': true,
        'SCH': true,
        'WHM': true,
        'BLM': true,
        'SMN': true
      },
      tankPositions: {
        mainTank: 'PLD',
        offTank: 'WAR'
      },
      assignments: {
        'action1': [
          { id: 'hallowed_ground', name: 'Hallowed Ground', tankPosition: 'mainTank' },
          { id: 'lustrate', name: 'Lustrate', tankPosition: 'shared' }
        ],
        'action2': [
          { id: 'addle', name: 'Addle', instanceId: 'addle_BLM' },
          { id: 'lustrate', name: 'Lustrate', tankPosition: 'shared' }
        ]
      }
    };

    // Run validation
    console.log('📊 Running system validation...');
    const validationResult = validateCooldownSystem(testData);
    const report = validationResult.getReport();
    
    console.log('✅ Validation Results:');
    console.log(`   Valid: ${report.isValid}`);
    console.log(`   Errors: ${report.errorCount}`);
    console.log(`   Warnings: ${report.warningCount}`);
    console.log(`   Info: ${report.infoCount}`);
    
    if (report.errorCount > 0) {
      console.error('❌ Validation Errors:');
      report.errors.forEach((error, index) => {
        console.error(`   ${index + 1}. ${error.message}`, error.details);
      });
    }
    
    if (report.warningCount > 0) {
      console.warn('⚠️ Validation Warnings:');
      report.warnings.forEach((warning, index) => {
        console.warn(`   ${index + 1}. ${warning.message}`, warning.details);
      });
    }

    // Get performance metrics
    console.log('📈 Performance Metrics:');
    const metrics = getCooldownSystemMetrics();
    console.log('   Cooldown Manager:', metrics.cooldownManager);
    console.log('   Charges Tracker:', metrics.chargesTracker);
    console.log('   Instances Tracker:', metrics.instancesTracker);
    console.log('   Aetherflow Tracker:', metrics.aetherflowTracker);

    // Test specific scenarios
    console.log('🧪 Testing Specific Scenarios...');
    
    // Test 1: Single charge ability cooldown
    console.log('   Test 1: Single charge ability (Hallowed Ground)');
    testSingleChargeAbility(testData);
    
    // Test 2: Multi-charge ability
    console.log('   Test 2: Multi-charge ability (Lustrate)');
    testMultiChargeAbility(testData);
    
    // Test 3: Role-shared ability
    console.log('   Test 3: Role-shared ability (Addle)');
    testRoleSharedAbility(testData);
    
    // Test 4: Aetherflow system
    console.log('   Test 4: Aetherflow system');
    testAetherflowSystem(testData);

    console.log('✅ Integration validation completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Integration validation failed:', error);
    return false;
  }
};

/**
 * Test single charge ability cooldown
 */
const testSingleChargeAbility = (testData) => {
  const manager = getCooldownManager();
  
  manager.update(testData);
  
  // Hallowed Ground used at time 10, should be on cooldown at time 50
  const availability = manager.checkAbilityAvailability('hallowed_ground', 50, 'action3');
  
  console.log(`     - Available: ${availability.isAvailable}`);
  console.log(`     - Reason: ${availability.reason || 'None'}`);
  console.log(`     - Can Assign: ${availability.canAssign()}`);
  
  if (availability.isAvailable) {
    console.warn('     ⚠️ Expected Hallowed Ground to be on cooldown');
  } else {
    console.log('     ✅ Hallowed Ground correctly on cooldown');
  }
};

/**
 * Test multi-charge ability
 */
const testMultiChargeAbility = (testData) => {
  const manager = getCooldownManager();
  
  manager.update(testData);
  
  // Lustrate used twice, should have 1 charge remaining
  const availability = manager.checkAbilityAvailability('lustrate', 50, 'action3');
  
  console.log(`     - Available: ${availability.isAvailable}`);
  console.log(`     - Charges: ${availability.availableCharges}/${availability.totalCharges}`);
  console.log(`     - Can Assign: ${availability.canAssign()}`);
  
  if (availability.availableCharges > 0) {
    console.log('     ✅ Lustrate has charges available');
  } else {
    console.warn('     ⚠️ Expected Lustrate to have charges available');
  }
};

/**
 * Test role-shared ability
 */
const testRoleSharedAbility = (testData) => {
  const manager = getCooldownManager();
  
  manager.update(testData);
  
  // Addle used by BLM, SMN should still be available
  const availability = manager.checkAbilityAvailability('addle', 50, 'action3');
  
  console.log(`     - Available: ${availability.isAvailable}`);
  console.log(`     - Instances: ${availability.availableInstances}/${availability.totalInstances}`);
  console.log(`     - Role Shared: ${availability.isRoleShared}`);
  console.log(`     - Can Assign: ${availability.canAssign()}`);
  
  if (availability.isRoleShared && availability.availableInstances > 0) {
    console.log('     ✅ Addle has instances available');
  } else {
    console.warn('     ⚠️ Expected Addle to have instances available');
  }
};

/**
 * Test Aetherflow system
 */
const testAetherflowSystem = (testData) => {
  const tracker = getAetherflowTracker();
  
  tracker.update(testData);
  
  // Check Aetherflow state at time 50
  const aetherflowState = tracker.getAetherflowState(50);
  
  console.log(`     - Available Stacks: ${aetherflowState.availableStacks}/${aetherflowState.totalStacks}`);
  console.log(`     - Can Refresh: ${aetherflowState.canRefresh(50)}`);
  
  if (aetherflowState.totalStacks === 3) {
    console.log('     ✅ Aetherflow system initialized correctly');
  } else {
    console.warn('     ⚠️ Aetherflow system not working correctly');
  }
};

/**
 * Test performance of the cooldown system
 */
export const testPerformance = () => {
  console.log('🚀 Testing Enhanced Cooldown System Performance...');

  const manager = getCooldownManager();
  
  // Large test data
  const bossActions = [];
  for (let i = 0; i < 100; i++) {
    bossActions.push({
      id: `action${i}`,
      time: i * 10,
      name: `Action ${i}`,
      isTankBuster: i % 2 === 0
    });
  }
  
  const assignments = {};
  for (let i = 0; i < 50; i++) {
    assignments[`action${i}`] = [
      { id: 'hallowed_ground', name: 'Hallowed Ground' }
    ];
  }
  
  const testData = {
    bossActions,
    bossLevel: 90,
    selectedJobs: { 'PLD': true, 'SCH': true, 'BLM': true, 'SMN': true },
    tankPositions: { mainTank: 'PLD', offTank: null },
    assignments
  };
  
  manager.update(testData);
  
  // Performance test
  const startTime = performance.now();
  
  for (let i = 0; i < 1000; i++) {
    manager.checkAbilityAvailability('hallowed_ground', 500, 'action50');
    manager.checkAbilityAvailability('lustrate', 500, 'action50');
    manager.checkAbilityAvailability('addle', 500, 'action50');
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const averageTime = totalTime / 3000; // 1000 iterations * 3 checks
  
  console.log(`⏱️ Performance Results:`);
  console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Average per check: ${averageTime.toFixed(3)}ms`);
  console.log(`   Checks per second: ${(1000 / averageTime).toFixed(0)}`);
  
  if (averageTime < 1) {
    console.log('   ✅ Performance is excellent');
  } else if (averageTime < 5) {
    console.log('   ✅ Performance is good');
  } else {
    console.warn('   ⚠️ Performance could be improved');
  }
};

/**
 * Run all validation tests
 */
export const runAllTests = () => {
  console.log('🎯 Running All Enhanced Cooldown System Tests...\n');
  
  const integrationResult = validateIntegration();
  console.log('\n');
  testPerformance();
  
  console.log('\n🏁 All tests completed!');
  return integrationResult;
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.validateCooldownIntegration = validateIntegration;
  window.testCooldownPerformance = testPerformance;
  window.runAllCooldownTests = runAllTests;
  
  console.log('🔧 Enhanced Cooldown System validation functions available:');
  console.log('   - validateCooldownIntegration()');
  console.log('   - testCooldownPerformance()');
  console.log('   - runAllCooldownTests()');
}

export default {
  validateIntegration,
  testPerformance,
  runAllTests
};
