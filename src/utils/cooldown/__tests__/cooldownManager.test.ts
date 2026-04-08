import { beforeEach, describe, expect, test } from 'vitest';
import { CooldownManager } from '../cooldownManager';

const mockBossActions = [
  { id: 'action1', time: 10, name: 'Tank Buster 1', isTankBuster: true },
  { id: 'action2', time: 30, name: 'Raid Wide 1', isTankBuster: false },
  { id: 'action3', time: 50, name: 'Tank Buster 2', isTankBuster: true },
  { id: 'action4', time: 70, name: 'Raid Wide 2', isTankBuster: false },
  { id: 'action5', time: 90, name: 'Tank Buster 3', isTankBuster: true },
];

const mockSelectedJobs = {
  tank: [
    { id: 'PLD', selected: true },
    { id: 'WAR', selected: true },
  ],
  healer: [
    { id: 'SCH', selected: true },
    { id: 'WHM', selected: true },
  ],
  melee: [],
  ranged: [],
  caster: [],
};

const mockTankPositions = {
  mainTank: 'PLD',
  offTank: 'WAR',
};

describe('CooldownManager', () => {
  let cooldownManager: CooldownManager;

  const updateManager = (
    assignments: Record<string, unknown[]> = {},
    selectedJobs = mockSelectedJobs
  ) => {
    cooldownManager.update({
      bossActions: mockBossActions,
      bossLevel: 90,
      selectedJobs,
      tankPositions: mockTankPositions,
      assignments,
    });
  };

  beforeEach(() => {
    cooldownManager = new CooldownManager(
      mockBossActions,
      90,
      mockSelectedJobs,
      mockTankPositions
    );
    updateManager();
  });

  test('marks single-charge abilities unavailable while their cooldown is active', () => {
    updateManager({
      action1: [{ id: 'hallowed_ground', name: 'Hallowed Ground' }],
    });

    const availability = cooldownManager.checkAbilityAvailability(
      'hallowed_ground',
      50,
      'action3'
    );

    expect(availability.isAvailable).toBe(false);
    expect(availability.reason).toBe('on_cooldown');
    expect(availability.availableCharges).toBe(0);
  });

  test('restores single-charge abilities once the cooldown expires', () => {
    updateManager({
      action1: [{ id: 'hallowed_ground', name: 'Hallowed Ground' }],
    });

    const availability = cooldownManager.checkAbilityAvailability(
      'hallowed_ground',
      440,
      'action5'
    );

    expect(availability.isAvailable).toBe(true);
    expect(availability.canAssign()).toBe(true);
  });

  test('tracks multi-charge availability for non-resource abilities', () => {
    updateManager({
      action1: [{ id: 'oblation', name: 'Oblation', tankPosition: 'mainTank' }],
    });

    const availability = cooldownManager.checkAbilityAvailability(
      'oblation',
      30,
      'action2'
    );

    expect(availability.isAvailable).toBe(true);
    expect(availability.totalCharges).toBe(2);
    expect(availability.availableCharges).toBe(1);
  });

  test('reports when all charges are on cooldown', () => {
    updateManager({
      action1: [{ id: 'oblation', name: 'Oblation', tankPosition: 'mainTank' }],
      action2: [{ id: 'oblation', name: 'Oblation', tankPosition: 'offTank' }],
    });

    const availability = cooldownManager.checkAbilityAvailability(
      'oblation',
      50,
      'action3'
    );

    expect(availability.isAvailable).toBe(false);
    expect(availability.reason).toBe('no_charges');
    expect(availability.availableCharges).toBe(0);
  });

  test('uses Scholar resource checks for Aetherflow abilities', () => {
    const availability = cooldownManager.checkAbilityAvailability(
      'lustrate',
      10,
      'action1'
    );

    expect(availability.isAvailable).toBe(true);
    expect(availability.reason).toBeNull();
  });

  test('blocks Aetherflow abilities when Scholar is not selected', () => {
    updateManager({}, {
      ...mockSelectedJobs,
      healer: [{ id: 'WHM', selected: true }],
    });

    const availability = cooldownManager.checkAbilityAvailability(
      'lustrate',
      10,
      'action1'
    );

    expect(availability.isAvailable).toBe(false);
    expect(availability.reason).toBe('job_not_selected');
  });

  test('exposes role-shared instance counts from the selected jobs', () => {
    const selectedJobsWithCasters = {
      ...mockSelectedJobs,
      caster: [
        { id: 'BLM', selected: true },
        { id: 'SMN', selected: true },
      ],
    };
    updateManager({}, selectedJobsWithCasters);

    const availability = cooldownManager.checkAbilityAvailability(
      'addle',
      10,
      'action1'
    );

    expect(availability.isAvailable).toBe(true);
    expect(availability.totalInstances).toBe(2);
    expect(availability.availableInstances).toBe(2);
  });

  test('reduces the available role-shared instances after one caster uses the ability', () => {
    const selectedJobsWithCasters = {
      ...mockSelectedJobs,
      caster: [
        { id: 'BLM', selected: true },
        { id: 'SMN', selected: true },
      ],
    };
    updateManager({
      action1: [{ id: 'addle', name: 'Addle', instanceId: 'addle_BLM' }],
    }, selectedJobsWithCasters);

    const availability = cooldownManager.checkAbilityAvailability(
      'addle',
      30,
      'action2'
    );

    expect(availability.isAvailable).toBe(true);
    expect(availability.availableInstances).toBe(1);
  });

  test('prevents duplicate single-charge assignments on the same boss action', () => {
    updateManager({
      action1: [{ id: 'hallowed_ground', name: 'Hallowed Ground' }],
    });

    const availability = cooldownManager.checkAbilityAvailability(
      'hallowed_ground',
      10,
      'action1'
    );

    expect(availability.isAvailable).toBe(false);
    expect(availability.reason).toBe('already_assigned');
  });

  test('allows dual tank-buster assignment patterns for multi-charge tank tools', () => {
    updateManager({
      action1: [{ id: 'oblation', name: 'Oblation', tankPosition: 'mainTank' }],
    });

    const availability = cooldownManager.checkAbilityAvailability(
      'oblation',
      10,
      'action1',
      { tankPosition: 'offTank' }
    );

    expect(availability.isAvailable).toBe(true);
    expect(availability.availableCharges).toBe(1);
  });
});
