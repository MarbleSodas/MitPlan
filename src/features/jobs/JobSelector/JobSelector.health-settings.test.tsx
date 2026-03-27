// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JobSelector from './JobSelector';

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
    batchUpdateRealtime: vi.fn(),
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
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('shows MT and OT HP controls even before two tanks are selected', () => {
    render(<JobSelector />);

    const mtInput = screen.getByLabelText('MT HP:') as HTMLInputElement;
    const otInput = screen.getByLabelText('OT HP:') as HTMLInputElement;

    expect(screen.getByText('Health Settings')).toBeTruthy();
    expect(mtInput).toBeTruthy();
    expect(otInput).toBeTruthy();
    expect(mtInput.value).toBe('310000');
    expect(otInput.value).toBe('305000');
  });
});
