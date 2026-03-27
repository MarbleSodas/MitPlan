import { describe, expect, it } from 'vitest';
import {
  deriveBossActionClassification,
  parseUnmitigatedDamage,
  syncBossActionMetadataWithClassification,
} from './bossActionUtils';

describe('parseUnmitigatedDamage', () => {
  it('parses string estimates with punctuation', () => {
    expect(parseUnmitigatedDamage('~81,436')).toBe(81436);
  });

  it('returns numeric values unchanged', () => {
    expect(parseUnmitigatedDamage(1853520)).toBe(1853520);
  });

  it('falls back to zero for empty values', () => {
    expect(parseUnmitigatedDamage(undefined)).toBe(0);
    expect(parseUnmitigatedDamage(null as never)).toBe(0);
  });
});

describe('deriveBossActionClassification', () => {
  it('normalizes legacy authored classifications when present', () => {
    expect(
      deriveBossActionClassification({
        classification: 'tower_sequence',
        importance: 'low',
      })
    ).toBe('raidwide');
  });

  it('derives dual tankbusters from dual/shared metadata', () => {
    expect(
      deriveBossActionClassification({
        isTankBuster: true,
        isDualTankBuster: true,
      })
    ).toBe('dual_tankbuster');

    expect(
      deriveBossActionClassification({
        targetTank: 'shared',
      })
    ).toBe('dual_tankbuster');
  });

  it('maps pair-target legacy mechanics to small parties', () => {
    expect(
      deriveBossActionClassification({
        classification: 'pair_target_sequence',
      })
    ).toBe('small_parties');
  });

  it('derives raidwides from party-hit metadata and mechanics as a fallback', () => {
    expect(
      deriveBossActionClassification({
        importance: 'critical',
      })
    ).toBe('raidwide');

    expect(
      deriveBossActionClassification({
        importance: 'medium',
      })
    ).toBe('mechanic');
  });
});

describe('syncBossActionMetadataWithClassification', () => {
  it('synchronizes tankbuster flags from classification', () => {
    expect(
      syncBossActionMetadataWithClassification({
        classification: 'dual_tankbuster',
      })
    ).toMatchObject({
      classification: 'dual_tankbuster',
      isTankBuster: true,
      isDualTankBuster: true,
      isRaidwide: false,
      targetTank: 'both',
    });
  });

  it('keeps small parties as non-tankbuster party damage', () => {
    expect(
      syncBossActionMetadataWithClassification({
        classification: 'pair_target',
      })
    ).toMatchObject({
      classification: 'small_parties',
      isTankBuster: false,
      isDualTankBuster: false,
      isRaidwide: true,
    });
  });

  it('infers DoT metadata from descriptions', () => {
    expect(
      syncBossActionMetadataWithClassification({
        description: 'Applies a water DoT that ticks for significant damage over time.',
      })
    ).toMatchObject({
      hasDot: true,
    });
  });

  it('clears tank target metadata for non-tankbuster classifications', () => {
    const normalized = syncBossActionMetadataWithClassification({
      classification: 'mechanic',
      isTankBuster: true,
      targetTank: 'mainTank',
    });

    expect(normalized).toMatchObject({
      classification: 'mechanic',
      isTankBuster: false,
      isDualTankBuster: false,
      isRaidwide: false,
    });
    expect(normalized).not.toHaveProperty('targetTank');
  });
});
