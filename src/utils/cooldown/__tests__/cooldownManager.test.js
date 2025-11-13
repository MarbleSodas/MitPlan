/**
 * Test suite for the enhanced cooldown management system
 */

import { CooldownManager, AbilityAvailability } from '../cooldownManager';
import { ChargesTracker } from '../chargesTracker';
import { InstancesTracker } from '../instancesTracker';
import { AetherflowTracker } from '../aetherflowTracker';

// Mock data for testing
const mockBossActions = [
  { id: 'action1', time: 10, name: 'Tank Buster 1', isTankBuster: true },
  { id: 'action2', time: 30, name: 'Raid Wide 1', isTankBuster: false },
  { id: 'action3', time: 50, name: 'Tank Buster 2', isTankBuster: true },
  { id: 'action4', time: 70, name: 'Raid Wide 2', isTankBuster: false },
  { id: 'action5', time: 90, name: 'Tank Buster 3', isTankBuster: true }
];

const mockSelectedJobs = {
  'PLD': true,
  'WAR': true,
  'SCH': true,
  'WHM': true
};

const mockTankPositions = {
  mainTank: 'PLD',
  offTank: 'WAR'
};

const mockSingleChargeAbility = {
  id: 'hallowed_ground',
  name: 'Hallowed Ground',
  cooldown: 420,
  jobs: ['PLD'],
  forTankBusters: true,
  forRaidWide: false
};

const mockMultiChargeAbility = {
  id: 'lustrate',
  name: 'Lustrate',
  cooldown: 1,
  count: 3,
  jobs: ['SCH'],
  consumesAetherflow: true,
  forTankBusters: true,
  forRaidWide: true
};

const mockRoleSharedAbility = {
  id: 'addle',
  name: 'Addle',
  cooldown: 90,
  jobs: ['BLM', 'SMN', 'RDM'],
  isRoleShared: true,
  forTankBusters: false,
  forRaidWide: true
};

describe('CooldownManager', () => {
  let cooldownManager;

  beforeEach(() => {
    cooldownManager = new CooldownManager(
      mockBossActions,
      90,
      mockSelectedJobs,
      mockTankPositions
    );
  });

  describe('Single Charge Abilities', () => {
    test('should allow assignment when no previous usage', () => {
      const assignments = {};
      cooldownManager.update({ assignments });

      const availability = cooldownManager.checkAbilityAvailability(
        'hallowed_ground',
        10,
        'action1'
      );

      expect(availability.isAvailable).toBe(true);
      expect(availability.canAssign()).toBe(true);
      expect(availability.availableCharges).toBe(1);
      expect(availability.totalCharges).toBe(1);
    });

    test('should prevent assignment when on cooldown', () => {
      const assignments = {
        'action1': [{ id: 'hallowed_ground', name: 'Hallowed Ground' }]
      };
      cooldownManager.update({ assignments });

      // Try to assign at time 50 (40 seconds after first use, but cooldown is 420s)
      const availability = cooldownManager.checkAbilityAvailability(
        'hallowed_ground',
        50,
        'action3'
      );

      expect(availability.isAvailable).toBe(false);
      expect(availability.canAssign()).toBe(false);
      expect(availability.reason).toBe('on_cooldown');
      expect(availability.availableCharges).toBe(0);
    });

    test('should allow assignment after cooldown expires', () => {
      const assignments = {
        'action1': [{ id: 'hallowed_ground', name: 'Hallowed Ground' }]
      };
      cooldownManager.update({ assignments });

      // Try to assign at time 440 (430 seconds after first use, cooldown is 420s)
      const availability = cooldownManager.checkAbilityAvailability(
        'hallowed_ground',
        440,
        'action5'
      );

      expect(availability.isAvailable).toBe(true);
      expect(availability.canAssign()).toBe(true);
      expect(availability.availableCharges).toBe(1);
    });
  });

  describe('Multi-Charge Abilities', () => {
    test('should track multiple charges correctly', () => {
      const assignments = {};
      cooldownManager.update({ assignments });

      const availability = cooldownManager.checkAbilityAvailability(
        'lustrate',
        10,
        'action1'
      );

      expect(availability.isAvailable).toBe(true);
      expect(availability.canAssign()).toBe(true);
      expect(availability.availableCharges).toBe(3);
      expect(availability.totalCharges).toBe(3);
    });

    test('should decrement charges on usage', () => {
      const assignments = {
        'action1': [{ id: 'lustrate', name: 'Lustrate' }]
      };
      cooldownManager.update({ assignments });

      const availability = cooldownManager.checkAbilityAvailability(
        'lustrate',
        30,
        'action2'
      );

      expect(availability.isAvailable).toBe(true);
      expect(availability.canAssign()).toBe(true);
      expect(availability.availableCharges).toBe(2);
      expect(availability.totalCharges).toBe(3);
    });

    test('should prevent assignment when all charges are on cooldown', () => {
      const assignments = {
        'action1': [{ id: 'lustrate', name: 'Lustrate' }],
        'action2': [{ id: 'lustrate', name: 'Lustrate' }],
        'action3': [{ id: 'lustrate', name: 'Lustrate' }]
      };
      cooldownManager.update({ assignments });

      // All charges used within 1 second, try to assign at time 50
      const availability = cooldownManager.checkAbilityAvailability(
        'lustrate',
        50,
        'action4'
      );

      expect(availability.isAvailable).toBe(false);
      expect(availability.canAssign()).toBe(false);
      expect(availability.reason).toBe('no_charges');
      expect(availability.availableCharges).toBe(0);
    });
  });

  describe('Role-Shared Abilities', () => {
    test('should track multiple instances for role-shared abilities', () => {
      const selectedJobsWithCasters = {
        ...mockSelectedJobs,
        'BLM': true,
        'SMN': true
      };
      cooldownManager.update({ selectedJobs: selectedJobsWithCasters });

      const availability = cooldownManager.checkAbilityAvailability(
        'addle',
        10,
        'action1'
      );

      expect(availability.isAvailable).toBe(true);
      expect(availability.canAssign()).toBe(true);
      expect(availability.availableInstances).toBe(2); // BLM + SMN
      expect(availability.totalInstances).toBe(2);
      expect(availability.isRoleShared).toBe(true);
    });

    test('should allow multiple assignments from different instances', () => {
      const selectedJobsWithCasters = {
        ...mockSelectedJobs,
        'BLM': true,
        'SMN': true
      };
      const assignments = {
        'action1': [{ id: 'addle', name: 'Addle', instanceId: 'addle_BLM' }]
      };
      cooldownManager.update({ selectedJobs: selectedJobsWithCasters, assignments });

      const availability = cooldownManager.checkAbilityAvailability(
        'addle',
        30,
        'action2'
      );

      expect(availability.isAvailable).toBe(true);
      expect(availability.canAssign()).toBe(true);
      expect(availability.availableInstances).toBe(1); // SMN still available
      expect(availability.totalInstances).toBe(2);
    });

    test('should prevent assignment when all instances are on cooldown', () => {
      const selectedJobsWithCasters = {
        ...mockSelectedJobs,
        'BLM': true,
        'SMN': true
      };
      const assignments = {
        'action1': [
          { id: 'addle', name: 'Addle', instanceId: 'addle_BLM' },
          { id: 'addle', name: 'Addle', instanceId: 'addle_SMN' }
        ]
      };
      cooldownManager.update({ selectedJobs: selectedJobsWithCasters, assignments });

      // Try to assign at time 50 (40 seconds after first use, but cooldown is 90s)
      const availability = cooldownManager.checkAbilityAvailability(
        'addle',
        50,
        'action3'
      );

      expect(availability.isAvailable).toBe(false);
      expect(availability.canAssign()).toBe(false);
      expect(availability.reason).toBe('no_instances');
      expect(availability.availableInstances).toBe(0);
    });
  });

  describe('Already Assigned Prevention', () => {
    test('should prevent multiple assignments to same boss action for single-target abilities', () => {
      const assignments = {
        'action1': [{ id: 'hallowed_ground', name: 'Hallowed Ground' }]
      };
      cooldownManager.update({ assignments });

      const availability = cooldownManager.checkAbilityAvailability(
        'hallowed_ground',
        10,
        'action1'
      );

      expect(availability.isAvailable).toBe(false);
      expect(availability.canAssign()).toBe(false);
      expect(availability.reason).toBe('already_assigned');
    });

    test('should allow multiple assignments to tank busters for multi-charge abilities', () => {
      const assignments = {
        'action1': [{ id: 'lustrate', name: 'Lustrate' }]
      };
      cooldownManager.update({ assignments });

      // Tank buster with multi-charge ability should allow multiple assignments
      const availability = cooldownManager.checkAbilityAvailability(
        'lustrate',
        10,
        'action1'
      );

      expect(availability.isAvailable).toBe(true);
      expect(availability.canAssign()).toBe(true);
    });
  });

  describe('Cache Performance', () => {
    test('should cache availability results for performance', () => {
      const assignments = {};
      cooldownManager.update({ assignments });

      // First call should calculate and cache
      const start1 = performance.now();
      const availability1 = cooldownManager.checkAbilityAvailability(
        'hallowed_ground',
        10,
        'action1'
      );
      const time1 = performance.now() - start1;

      // Second call should use cache
      const start2 = performance.now();
      const availability2 = cooldownManager.checkAbilityAvailability(
        'hallowed_ground',
        10,
        'action1'
      );
      const time2 = performance.now() - start2;

      expect(availability1.isAvailable).toBe(availability2.isAvailable);
      expect(time2).toBeLessThan(time1); // Cache should be faster
    });

    test('should clear cache when data updates', () => {
      const assignments1 = {};
      cooldownManager.update({ assignments: assignments1 });

      const availability1 = cooldownManager.checkAbilityAvailability(
        'hallowed_ground',
        10,
        'action1'
      );

      // Update with new assignments
      const assignments2 = {
        'action1': [{ id: 'hallowed_ground', name: 'Hallowed Ground' }]
      };
      cooldownManager.update({ assignments: assignments2 });

      const availability2 = cooldownManager.checkAbilityAvailability(
        'hallowed_ground',
        50,
        'action3'
      );

      expect(availability1.isAvailable).toBe(true);
      expect(availability2.isAvailable).toBe(false);
    });
  });

  describe('Integration with Specialized Trackers', () => {
    test('should integrate with charges tracker', () => {
      expect(cooldownManager.chargesTracker).toBeInstanceOf(ChargesTracker);
    });

    test('should integrate with instances tracker', () => {
      expect(cooldownManager.instancesTracker).toBeInstanceOf(InstancesTracker);
    });

    test('should integrate with aetherflow tracker', () => {
      expect(cooldownManager.aetherflowTracker).toBeInstanceOf(AetherflowTracker);
    });
  });
});

describe('Integration Tests', () => {
  test('should handle complex scenario with multiple ability types', () => {
    const cooldownManager = new CooldownManager(
      mockBossActions,
      90,
      { ...mockSelectedJobs, 'BLM': true, 'SMN': true },
      mockTankPositions
    );

    const assignments = {
      'action1': [
        { id: 'hallowed_ground', name: 'Hallowed Ground' },
        { id: 'lustrate', name: 'Lustrate' },
        { id: 'addle', name: 'Addle', instanceId: 'addle_BLM' }
      ],
      'action2': [
        { id: 'lustrate', name: 'Lustrate' },
        { id: 'addle', name: 'Addle', instanceId: 'addle_SMN' }
      ]
    };

    cooldownManager.update({ assignments });

    // Check availability at time 100
    const hallovedAvailability = cooldownManager.checkAbilityAvailability('hallowed_ground', 100, 'action5');
    const lustrateAvailability = cooldownManager.checkAbilityAvailability('lustrate', 100, 'action5');
    const addleAvailability = cooldownManager.checkAbilityAvailability('addle', 100, 'action5');

    // Hallowed Ground should be on cooldown (420s cooldown, only 90s passed)
    expect(hallovedAvailability.isAvailable).toBe(false);

    // Lustrate should have 1 charge available (3 total, 2 used)
    expect(lustrateAvailability.isAvailable).toBe(true);
    expect(lustrateAvailability.availableCharges).toBe(1);

    // Addle should have instances available (90s cooldown, 100s passed)
    expect(addleAvailability.isAvailable).toBe(true);
    expect(addleAvailability.availableInstances).toBe(2);
  });
});
