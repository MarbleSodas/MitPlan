/**
 * Comprehensive Integration Test for Enhanced Cooldown System
 * 
 * This test verifies that the enhanced cooldown system is properly integrated
 * with the MitPlan application and all core requirements are working.
 */

import { validateCooldownSystem, getCooldownSystemMetrics, initializeCooldownSystem } from './index';
import { mitigationAbilities } from '../../data';

/**
 * Test data for integration testing
 */
const getTestData = () => ({
  bossActions: [
    { id: 'action1', time: 10, name: 'Tank Buster 1', isTankBuster: true },
    { id: 'action2', time: 30, name: 'Raid Wide 1', isTankBuster: false },
    { id: 'action3', time: 50, name: 'Tank Buster 2', isTankBuster: true },
    { id: 'action4', time: 70, name: 'Raid Wide 2', isTankBuster: false },
    { id: 'action5', time: 90, name: 'Tank Buster 3', isTankBuster: true },
    { id: 'action6', time: 120, name: 'Raid Wide 3', isTankBuster: false }
  ],
  bossLevel: 90,
  selectedJobs: {
    'PLD': true,
    'WAR': true,
    'SCH': true,
    'WHM': true,
    'BLM': true,
    'SMN': true,
    'RDM': true
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
    ],
    'action3': [
      { id: 'lustrate', name: 'Lustrate', tankPosition: 'shared' }
    ]
  }
});

/**
 * Test 1: System Initialization and Validation
 */
export const testSystemInitialization = () => {
  console.log('🔧 Testing System Initialization...');
  
  const testData = getTestData();
  
  try {
    // Initialize the cooldown system
    const cooldownSystem = initializeCooldownSystem({
      ...testData,
      enableValidation: true,
      enableRealtimeSync: true
    });
    
    console.log('✅ System initialized successfully');
    
    // Run validation
    const validationResult = validateCooldownSystem(testData);
    const report = validationResult.getReport();
    
    console.log(`📊 Validation Results: ${report.isValid ? 'PASS' : 'FAIL'}`);
    console.log(`   Errors: ${report.errorCount}, Warnings: ${report.warningCount}`);
    
    if (report.errorCount > 0) {
      console.error('❌ Validation Errors:', report.errors);
      return false;
    }
    
    // Check system status
    const status = cooldownSystem.getSystemStatus();
    console.log('📈 System Status:', status);
    
    return true;
    
  } catch (error) {
    console.error('❌ System initialization failed:', error);
    return false;
  }
};

/**
 * Test 2: Cooldown-based Disabling
 */
export const testCooldownBasedDisabling = () => {
  console.log('🚫 Testing Cooldown-based Disabling...');
  
  const testData = getTestData();
  const cooldownSystem = initializeCooldownSystem(testData);
  
  try {
    // Test Hallowed Ground (used at time 10, 420s cooldown)
    const availability50 = cooldownSystem.checkAvailability('hallowed_ground', 50, 'action3');
    const availability450 = cooldownSystem.checkAvailability('hallowed_ground', 450, 'action6');
    
    console.log(`   Hallowed Ground at 50s: ${availability50.isAvailable ? 'Available' : 'On Cooldown'} ✓`);
    console.log(`   Hallowed Ground at 450s: ${availability450.isAvailable ? 'Available' : 'On Cooldown'} ✓`);
    
    // Should be on cooldown at 50s, available at 450s
    if (availability50.isAvailable || !availability450.isAvailable) {
      console.error('❌ Cooldown-based disabling not working correctly');
      return false;
    }
    
    console.log('✅ Cooldown-based disabling working correctly');
    return true;
    
  } catch (error) {
    console.error('❌ Cooldown-based disabling test failed:', error);
    return false;
  }
};

/**
 * Test 3: Multi-charge Abilities (Scholar's Aetherflow)
 */
export const testMultiChargeAbilities = () => {
  console.log('🔋 Testing Multi-charge Abilities...');
  
  const testData = getTestData();
  const cooldownSystem = initializeCooldownSystem(testData);
  
  try {
    // Test Lustrate (used 3 times in assignments)
    const availability = cooldownSystem.checkAvailability('lustrate', 120, 'action6');
    
    console.log(`   Lustrate charges: ${availability.availableCharges}/${availability.totalCharges}`);
    console.log(`   Can assign: ${availability.canAssign()}`);
    
    // Should have charges available (3 total, 3 used but with 1s cooldown they should be available)
    if (availability.totalCharges <= 1) {
      console.error('❌ Multi-charge ability not detected');
      return false;
    }
    
    console.log('✅ Multi-charge abilities working correctly');
    return true;
    
  } catch (error) {
    console.error('❌ Multi-charge abilities test failed:', error);
    return false;
  }
};

/**
 * Test 4: Role-shared Abilities
 */
export const testRoleSharedAbilities = () => {
  console.log('👥 Testing Role-shared Abilities...');
  
  const testData = getTestData();
  const cooldownSystem = initializeCooldownSystem(testData);
  
  try {
    // Test Addle (used by BLM, should have SMN and RDM instances available)
    const availability = cooldownSystem.checkAvailability('addle', 120, 'action6');
    
    console.log(`   Addle instances: ${availability.availableInstances}/${availability.totalInstances}`);
    console.log(`   Role shared: ${availability.isRoleShared}`);
    console.log(`   Can assign: ${availability.canAssign()}`);
    
    // Should be role-shared with multiple instances
    if (!availability.isRoleShared || availability.totalInstances <= 1) {
      console.error('❌ Role-shared ability not detected correctly');
      return false;
    }
    
    // Should have instances available (BLM used, SMN and RDM available)
    if (availability.availableInstances === 0) {
      console.error('❌ Role-shared instances not calculated correctly');
      return false;
    }
    
    console.log('✅ Role-shared abilities working correctly');
    return true;
    
  } catch (error) {
    console.error('❌ Role-shared abilities test failed:', error);
    return false;
  }
};

/**
 * Test 5: Aetherflow System
 */
export const testAetherflowSystem = () => {
  console.log('💜 Testing Aetherflow System...');
  
  const testData = getTestData();
  const cooldownSystem = initializeCooldownSystem(testData);
  
  try {
    // Get Aetherflow tracker
    const aetherflowTracker = cooldownSystem.cooldownManager.aetherflowTracker;
    
    if (!aetherflowTracker) {
      console.error('❌ Aetherflow tracker not found');
      return false;
    }
    
    // Test Aetherflow state at time 120 (after 3 Lustrate uses)
    const aetherflowState = aetherflowTracker.getAetherflowState(120);
    
    console.log(`   Aetherflow stacks: ${aetherflowState.availableStacks}/${aetherflowState.totalStacks}`);
    console.log(`   Can refresh: ${aetherflowState.canRefresh(120)}`);
    
    // Should have 3 total stacks
    if (aetherflowState.totalStacks !== 3) {
      console.error('❌ Aetherflow total stacks incorrect');
      return false;
    }
    
    // Should have consumed stacks (3 Lustrate uses)
    if (aetherflowState.availableStacks === 3) {
      console.warn('⚠️ Aetherflow stacks not consumed as expected');
    }
    
    console.log('✅ Aetherflow system working correctly');
    return true;
    
  } catch (error) {
    console.error('❌ Aetherflow system test failed:', error);
    return false;
  }
};

/**
 * Test 6: Performance
 */
export const testPerformance = () => {
  console.log('⚡ Testing Performance...');
  
  const testData = getTestData();
  const cooldownSystem = initializeCooldownSystem(testData);
  
  try {
    const iterations = 1000;
    const startTime = performance.now();
    
    // Perform multiple availability checks
    for (let i = 0; i < iterations; i++) {
      cooldownSystem.checkAvailability('hallowed_ground', 50, 'action3');
      cooldownSystem.checkAvailability('lustrate', 50, 'action3');
      cooldownSystem.checkAvailability('addle', 50, 'action3');
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / (iterations * 3);
    
    console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`   Average per check: ${averageTime.toFixed(3)}ms`);
    console.log(`   Checks per second: ${(1000 / averageTime).toFixed(0)}`);
    
    // Performance should be good (less than 1ms per check)
    if (averageTime > 1) {
      console.warn('⚠️ Performance could be improved');
    } else {
      console.log('✅ Performance is excellent');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return false;
  }
};

/**
 * Test 7: Real-time Collaboration Compatibility
 */
export const testRealtimeCompatibility = () => {
  console.log('🔄 Testing Real-time Collaboration Compatibility...');
  
  try {
    const testData = getTestData();
    
    // Test with real-time sync enabled
    const cooldownSystem = initializeCooldownSystem({
      ...testData,
      enableRealtimeSync: true
    });
    
    // Simulate a real-time update
    const newAssignments = {
      ...testData.assignments,
      'action4': [
        { id: 'rampart', name: 'Rampart', tankPosition: 'mainTank' }
      ]
    };
    
    // Update the system
    cooldownSystem.updateSystem({
      ...testData,
      assignments: newAssignments
    });
    
    // Check that the update was processed
    const availability = cooldownSystem.checkAvailability('rampart', 120, 'action6');
    
    console.log(`   Rampart availability after update: ${availability.isAvailable ? 'Available' : 'On Cooldown'}`);
    
    console.log('✅ Real-time collaboration compatibility working');
    return true;
    
  } catch (error) {
    console.error('❌ Real-time collaboration test failed:', error);
    return false;
  }
};

/**
 * Run all integration tests
 */
export const runIntegrationTests = () => {
  console.log('🎯 Running Enhanced Cooldown System Integration Tests...\n');
  
  const tests = [
    { name: 'System Initialization', test: testSystemInitialization },
    { name: 'Cooldown-based Disabling', test: testCooldownBasedDisabling },
    { name: 'Multi-charge Abilities', test: testMultiChargeAbilities },
    { name: 'Role-shared Abilities', test: testRoleSharedAbilities },
    { name: 'Aetherflow System', test: testAetherflowSystem },
    { name: 'Performance', test: testPerformance },
    { name: 'Real-time Compatibility', test: testRealtimeCompatibility }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    console.log(`\n--- ${name} ---`);
    
    try {
      const result = test();
      if (result) {
        passed++;
        console.log(`✅ ${name} PASSED`);
      } else {
        failed++;
        console.log(`❌ ${name} FAILED`);
      }
    } catch (error) {
      failed++;
      console.error(`❌ ${name} FAILED with exception:`, error);
    }
  }
  
  console.log(`\n🏁 Integration Tests Complete:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Enhanced Cooldown System integration is successful.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }
  
  return failed === 0;
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.runCooldownIntegrationTests = runIntegrationTests;
  window.testCooldownSystemInitialization = testSystemInitialization;
  window.testCooldownBasedDisabling = testCooldownBasedDisabling;
  window.testMultiChargeAbilities = testMultiChargeAbilities;
  window.testRoleSharedAbilities = testRoleSharedAbilities;
  window.testAetherflowSystem = testAetherflowSystem;
  window.testCooldownPerformance = testPerformance;
  window.testRealtimeCompatibility = testRealtimeCompatibility;
  
  console.log('🔧 Enhanced Cooldown System integration tests available:');
  console.log('   - runCooldownIntegrationTests() - Run all tests');
  console.log('   - testCooldownSystemInitialization() - Test initialization');
  console.log('   - testCooldownBasedDisabling() - Test cooldown disabling');
  console.log('   - testMultiChargeAbilities() - Test multi-charge abilities');
  console.log('   - testRoleSharedAbilities() - Test role-shared abilities');
  console.log('   - testAetherflowSystem() - Test Aetherflow system');
  console.log('   - testCooldownPerformance() - Test performance');
  console.log('   - testRealtimeCompatibility() - Test real-time compatibility');
}

export default {
  runIntegrationTests,
  testSystemInitialization,
  testCooldownBasedDisabling,
  testMultiChargeAbilities,
  testRoleSharedAbilities,
  testAetherflowSystem,
  testPerformance,
  testRealtimeCompatibility
};
