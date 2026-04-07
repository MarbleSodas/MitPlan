// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JobSelector from './JobSelector';

const { batchUpdateRealtimeMock, planState } = vi.hoisted(() => ({
  batchUpdateRealtimeMock: vi.fn(),
  planState: {
    realtimePlan: {
      timelineLayout: {
        bossId: 'the-tyrant-m11s',
        actions: [],
        phases: [],
        analysisSources: [],
        guideSources: [],
        adaptiveModel: null,
        resolution: null,
        format: 'adaptive_damage',
        schemaVersion: 2,
        healthConfig: {
          party: 186000,
          defaultTank: 295000,
          mainTank: 310000,
          offTank: 305000,
        },
      },
      healthSettings: {},
    },
  },
}));

vi.mock('../../../contexts/RealtimeJobContext', () => ({
  useRealtimeJobContext: () => ({
    selectedJobs: {
      tank: [
        { id: 'PLD', name: 'Paladin', icon: '/icons/pld.png', selected: false },
        { id: 'WAR', name: 'Warrior', icon: '/icons/war.png', selected: false },
      ],
      healer: [],
      melee: [],
      ranged: [],
      caster: [],
    },
    toggleJobSelection: vi.fn(),
  }),
}));

vi.mock('../../../contexts/TankPositionContext', () => ({
  useTankPositionContext: () => ({
    tankPositions: { mainTank: null, offTank: null },
    assignTankPosition: vi.fn(),
    selectedTankJobs: [],
  }),
}));

vi.mock('../../../contexts/RealtimePlanContext', () => ({
  useRealtimePlan: () => ({
    realtimePlan: planState.realtimePlan,
    batchUpdateRealtime: batchUpdateRealtimeMock,
  }),
}));

vi.mock('../../../contexts/RealtimeBossContext', () => ({
  useRealtimeBossContext: () => ({
    currentBossId: 'the-tyrant-m11s',
    currentBossLevel: 100,
  }),
}));

vi.mock('../../../contexts/PresenceContext', () => ({
  usePresenceOptional: () => null,
}));

vi.mock('../../../contexts/UserJobAssignmentContext', () => ({
  useUserJobAssignmentOptional: () => null,
}));

vi.mock('../../../components/collaboration/PresenceSurface', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../components/collaboration/PresenceTarget', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../components/collaboration/SectionPresencePill', () => ({
  default: () => null,
}));

vi.mock('../../../components/collaboration/SelectionBorder', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('JobSelector health settings', () => {
  beforeEach(() => {
    batchUpdateRealtimeMock.mockReset();
    planState.realtimePlan = {
      timelineLayout: {
        bossId: 'the-tyrant-m11s',
        actions: [],
        phases: [],
        analysisSources: [],
        guideSources: [],
        adaptiveModel: null,
        resolution: null,
        format: 'adaptive_damage',
        schemaVersion: 2,
        healthConfig: {
          party: 186000,
          defaultTank: 295000,
          mainTank: 310000,
          offTank: 305000,
        },
      },
      healthSettings: {},
    };
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows MT and OT HP controls even before two tanks are selected', () => {
    render(<JobSelector />);

    const mtInput = screen.getAllByLabelText('MT HP:').at(-1) as HTMLInputElement;
    const otInput = screen.getByLabelText('OT HP:') as HTMLInputElement;

    expect(screen.getByText('Health Settings')).toBeTruthy();
    expect(mtInput).toBeTruthy();
    expect(otInput).toBeTruthy();
    expect(mtInput.value).toBe('310000');
    expect(otInput.value).toBe('305000');
  });

  it('persists tank HP changes through mirrored timeline layout fields when the plan has a timeline layout', () => {
    render(<JobSelector />);

    fireEvent.click(screen.getAllByTitle('Reset to default')[0] as HTMLButtonElement);

    expect(batchUpdateRealtimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bossId: 'the-tyrant-m11s',
        timelineLayout: expect.objectContaining({
          healthConfig: expect.objectContaining({
            party: 186000,
            defaultTank: 295000,
            mainTank: 295000,
            offTank: 305000,
          }),
        }),
      })
    );
  });

  it('allows editing the party min HP field before persisting the updated value', () => {
    render(<JobSelector />);

    const partyInput = screen.getByLabelText('Party Min:') as HTMLInputElement;

    fireEvent.change(partyInput, { target: { value: '190500' } });

    expect(partyInput.value).toBe('190500');

    fireEvent.blur(partyInput);

    expect(batchUpdateRealtimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bossId: 'the-tyrant-m11s',
        timelineLayout: expect.objectContaining({
          healthConfig: expect.objectContaining({
            party: 190500,
          }),
        }),
      })
    );
  });

  it('falls back to healthSettings updates when the plan does not yet have a timeline layout', () => {
    planState.realtimePlan = {
      timelineLayout: null,
      healthSettings: {
        tankMaxHealth: {
          mainTank: 300000,
          offTank: 290000,
        },
        partyMinHealth: 180000,
      },
    };

    render(<JobSelector />);

    fireEvent.click(screen.getAllByTitle('Reset to default')[2] as HTMLButtonElement);

    expect(batchUpdateRealtimeMock).toHaveBeenCalledWith({
      healthSettings: {
        tankMaxHealth: {
          mainTank: 300000,
          offTank: 290000,
        },
        partyMinHealth: 143000,
      },
    });
  });
});
