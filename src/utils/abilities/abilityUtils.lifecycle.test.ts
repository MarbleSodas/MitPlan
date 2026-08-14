import { describe, expect, it } from 'vitest';
import type { MitigationAbility } from '../../types';
import { filterAbilitiesByLevel, isAbilityAssignable } from './abilityUtils';
import { isAbilityAvailableInMode } from './abilityModeUtils';

const ability = (overrides: Partial<MitigationAbility> = {}): MitigationAbility => ({
  id: 'test_ability',
  name: 'Test Ability',
  description: 'Test',
  levelRequirement: 1,
  duration: 10,
  cooldown: 60,
  jobs: ['PLD'],
  icon: '/test.png',
  type: 'mitigation',
  target: 'self',
  forTankBusters: true,
  forRaidWide: false,
  ...overrides,
});

describe('ability lifecycle', () => {
  it('keeps retired abilities resolvable but excludes them from new assignments', () => {
    const retired = ability({ availability: 'retired', effectiveToPatch: '7.6' });
    const allAbilities = [retired];

    expect(allAbilities.find(({ id }) => id === retired.id)).toBe(retired);
    expect(isAbilityAssignable(retired)).toBe(false);
    expect(filterAbilitiesByLevel(allAbilities, null, 100)).toEqual([]);
  });

  it('treats existing records without lifecycle metadata as active', () => {
    const existing = ability();

    expect(isAbilityAssignable(existing)).toBe(true);
    expect(filterAbilitiesByLevel([existing], null, 100)).toEqual([existing]);
  });

  it('keeps untagged abilities in Current and Reborn without leaking them into Evolved', () => {
    const existing = ability();

    expect(isAbilityAvailableInMode(existing, 'CURRENT')).toBe(true);
    expect(isAbilityAvailableInMode(existing, 'REBORN')).toBe(true);
    expect(isAbilityAvailableInMode(existing, 'EVOLVED')).toBe(false);
    expect(filterAbilitiesByLevel([existing], null, 100, 'EVOLVED')).toEqual([]);
  });

  it('supports mode-specific and all-mode ability definitions', () => {
    const evolved = ability({ id: 'evolved', modes: ['EVOLVED'] });
    const shared = ability({ id: 'shared', modes: ['ALL'] });

    expect(filterAbilitiesByLevel([evolved, shared], null, 110, 'EVOLVED'))
      .toEqual([evolved, shared]);
    expect(filterAbilitiesByLevel([evolved, shared], null, 110, 'REBORN'))
      .toEqual([shared]);
  });
});
