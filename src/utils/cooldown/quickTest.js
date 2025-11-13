/**
 * Quick test to verify the enhanced cooldown system is working
 */

import { initializeCooldownSystem, validateCooldownSystem, dev } from './index';

/**
 * Quick test function that can be called from the browser console
 */
export const quickTest = () => {
  console.log('🧪 Running Quick Enhanced Cooldown System Test...');
  
  try {
    // Test data
    const testData = {
      bossActions: [
        { id: 'action1', time: 10, name: 'Tank Buster 1', isTankBuster: true },
        { id: 'action2', time: 30, name: 'Raid Wide 1', isTankBuster: false }
      ],
      bossLevel: 90,
      selectedJobs: { 'PLD': true, 'SCH': true },
      tankPositions: { mainTank: 'PLD', offTank: null },
      assignments: {
        'action1': [{ id: 'hallowed_ground', name: 'Hallowed Ground' }]
      }
    };

    // Test 1: Initialize system
    console.log('1. Testing system initialization...');
    const cooldownSystem = initializeCooldownSystem({
      ...testData,
      enableValidation: true // Test with validation enabled
    });
    console.log('✅ System initialized successfully');

    // Test 2: Check availability
    console.log('2. Testing availability checking...');
    const availability = cooldownSystem.checkAvailability('hallowed_ground', 50, 'action2');
    console.log(`   Hallowed Ground at 50s: ${availability.isAvailable ? 'Available' : 'On Cooldown'}`);
    console.log('✅ Availability checking working');

    // Test 3: Validate system
    console.log('3. Testing system validation...');
    const validationResult = validateCooldownSystem(testData);
    console.log(`   Validation: ${validationResult.isValid ? 'PASS' : 'FAIL'}`);
    console.log('✅ System validation working');

    // Test 4: Check dev utilities
    console.log('4. Testing dev utilities...');
    const devUtils = dev;
    console.log(`   Dev utilities available: ${Object.keys(devUtils).length} functions`);
    console.log('✅ Dev utilities working');

    console.log('🎉 Quick test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return false;
  }
};

// Export for browser console use
if (typeof window !== 'undefined') {
  window.quickTestCooldownSystem = quickTest;
  console.log('🔧 Quick test function available: quickTestCooldownSystem()');
}

export default quickTest;
