/**
 * Validation tests. Architecture §7.11, §18.6.
 */
import { describe, expect, it } from 'vitest';
import { SignInIntent, Profile, ShareTokenClaims } from './auth/index.js';
import { Ability, AbilityMode, AbilityEquivalence } from './ability/index.js';
import { TimelineEvent, TimelineGraph, MergeResult, TimelineSource } from './timeline/index.js';
import { Assignment, TankState, PlanMeta, Plan } from './plan/index.js';

describe('SignInIntent', () => {
  it('accepts a Discord sign-in', () => {
    const r = SignInIntent.safeParse({ provider: 'discord' });
    expect(r.success).toBe(true);
  });
  it('accepts an email sign-in with the right shape', () => {
    const r = SignInIntent.safeParse({
      provider: 'email',
      email: 'a@b.com',
      password: 'longenough',
    });
    expect(r.success).toBe(true);
  });
  it('rejects a Discord sign-in with an invalid email shape', () => {
    const r = SignInIntent.safeParse({
      provider: 'email',
      email: 'not-an-email',
      password: 'longenough',
    });
    expect(r.success).toBe(false);
  });
});

describe('Profile', () => {
  it('accepts a minimal profile', () => {
    const r = Profile.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      displayName: 'E',
      discordId: null,
      googleId: null,
      email: null,
      emailVerifiedAt: null,
      mitplanV1ClaimDone: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(r.success).toBe(true);
  });
});

describe('ShareTokenClaims', () => {
  it('accepts a 7-day read share', () => {
    const now = Math.floor(Date.now() / 1000);
    const r = ShareTokenClaims.safeParse({
      sub: '00000000-0000-0000-0000-000000000001',
      plan_id: '00000000-0000-0000-0000-000000000002',
      plan_access: 'read',
      exp: now + 7 * 86_400,
      iat: now,
    });
    expect(r.success).toBe(true);
  });
});

describe('Ability', () => {
  it('accepts a typical ability', () => {
    const r = Ability.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      jobId: '00000000-0000-0000-0000-000000000002',
      abilityId: 'reprisal',
      mode: 'CURRENT',
      name: 'Reprisal',
      description: null,
      effectPct: 10,
      recastS: 60,
      rangeM: null,
      durationS: 10,
      isInvuln: false,
      isHeal: false,
      isShield: false,
      effectiveFrom: '7.0',
      effectiveTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(r.success).toBe(true);
  });

  it('rejects an effect_pct > 100', () => {
    const r = Ability.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      jobId: '00000000-0000-0000-0000-000000000002',
      abilityId: 'bad',
      mode: 'CURRENT',
      name: 'Bad',
      description: null,
      effectPct: 150,
      recastS: null,
      rangeM: null,
      durationS: null,
      isInvuln: false,
      isHeal: false,
      isShield: false,
      effectiveFrom: '7.0',
      effectiveTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(r.success).toBe(false);
  });
});

describe('AbilityMode', () => {
  it('accepts all valid modes', () => {
    expect(AbilityMode.options).toContain('REBORN');
    expect(AbilityMode.options).toContain('EVOLVED');
    expect(AbilityMode.options).toContain('CURRENT');
    expect(AbilityMode.options).toContain('ALL');
  });
});

describe('AbilityEquivalence', () => {
  it('accepts an EQUIVALENT mapping', () => {
    const r = AbilityEquivalence.safeParse({
      srcAbilityId: '00000000-0000-0000-0000-000000000001',
      dstAbilityId: '00000000-0000-0000-0000-000000000002',
      relation: 'EQUIVALENT',
      note: null,
    });
    expect(r.success).toBe(true);
  });
});

describe('TimelineEvent + TimelineGraph + MergeResult', () => {
  const baseEvent = {
    id: '00000000-0000-0000-0000-000000000001',
    position: 0,
    timestampMs: 10_000,
    type: 'BUSTER' as const,
    name: 'Brutal Strike',
    normalizedNames: ['brutal strike'],
    durationMs: null,
    hitTimesMs: [10_000],
    targets: { kind: 'PARTY' as const },
    mechanicId: null,
    patchVersion: '7.20',
    confidence: 0.95,
    varianceMs: 120,
    mergedFromSources: { cactbot: true, triggernometry: true, fflogs: true },
  };

  it('accepts a TimelineEvent with v1.0 fields', () => {
    expect(TimelineEvent.safeParse(baseEvent).success).toBe(true);
  });

  it('TimelineGraph accepts a single-event graph', () => {
    const r = TimelineGraph.safeParse({
      id: '00000000-0000-0000-0000-000000000099',
      encounterId: '00000000-0000-0000-0000-000000000001',
      version: '7.20',
      contentHash: 'abc',
      source: 'MERGED',
      events: [baseEvent],
      branches: [],
      joins: [],
      mergedFromSources: { cactbot: true, triggernometry: true, fflogs: true },
      perEventConfidence: { '00000000-0000-0000-0000-000000000001': 0.95 },
      mode: 'CURRENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(r.success).toBe(true);
  });

  it('MergeResult accepts a result with conflicts', () => {
    const r = MergeResult.safeParse({
      timeline: {
        id: '00000000-0000-0000-0000-000000000099',
        encounterId: '00000000-0000-0000-0000-000000000001',
        version: '7.20',
        contentHash: 'abc',
        source: 'MERGED',
        events: [baseEvent],
        branches: [],
        joins: [],
        mergedFromSources: { cactbot: true, triggernometry: false, fflogs: false },
        mode: 'CURRENT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      conflicts: [
        {
          eventId: '00000000-0000-0000-0000-000000000001',
          kind: 'TIMESTAMP_DRIFT',
          sources: ['CACTBOT', 'FFLOGS'],
          detail: 'drift 700ms',
          detectedAt: new Date().toISOString(),
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('TimelineSource enum has the v1.0 sources', () => {
    expect(TimelineSource.options).toEqual(['CACTBOT', 'TRIGGERNOMETRY', 'FFLOGS', 'MERGED', 'MANUAL']);
  });
});

describe('Assignment + TankState + Plan', () => {
  it('Assignment accepts a typical mit', () => {
    const r = Assignment.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      abilityId: '00000000-0000-0000-0000-000000000002',
      targetUserId: '00000000-0000-0000-0000-000000000003',
      targetType: 'PARTY',
      eventId: '00000000-0000-0000-0000-000000000004',
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: 0,
    });
    expect(r.success).toBe(true);
  });

  it('TankState accepts a typical interval', () => {
    const r = TankState.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000002',
      startMs: 0,
      endMs: 60_000,
      role: 'MAIN_TANK',
      notes: null,
      revision: 0,
    });
    expect(r.success).toBe(true);
  });

  it('PlanMeta accepts a minimal plan', () => {
    const r = PlanMeta.safeParse({
      id: '00000000-0000-0000-0000-000000000001',
      ownerId: '00000000-0000-0000-0000-000000000002',
      name: 'FRU P1',
      encounterId: '00000000-0000-0000-0000-000000000003',
      partyId: '00000000-0000-0000-0000-000000000004',
      mode: 'CURRENT',
      isLegacy: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(r.success).toBe(true);
  });
});
