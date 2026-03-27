/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import HealthBar from './HealthBar';
import HealingHealthBar from '../HealingHealthBar/HealingHealthBar';

const renderWithTooltipProvider = (ui: ReactElement) => render(
  <TooltipProvider>
    {ui}
  </TooltipProvider>
);

describe('HealthBar', () => {
  it('keeps the pre-hit bar intact and overlays only damage done by the hit', () => {
    const { container } = renderWithTooltipProvider(
      <HealthBar
        label="Dmg"
        maxHealth={100}
        currentHealth={100}
        damageAmount={100}
        barrierAmount={20}
        applyBarrierFirst
        mitigationPercentage={0.25}
      />
    );

    expect(screen.getByText('40 / 100')).toBeInTheDocument();

    const styles = Array.from(container.querySelectorAll('div[style]')).map((element) => element.getAttribute('style') || '');

    expect(styles.some((style) => style.includes('width: 100%;') && style.includes('background-color: oklch(0.623 0.188 145.28);'))).toBe(true);
    expect(styles.some((style) => style.includes('left: 40%;') && style.includes('width: 60%;') && style.includes('background-color: rgba(255, 0, 0, 0.3);'))).toBe(true);
  });
});

describe('HealingHealthBar', () => {
  it('uses only effective healing for the recovery overlay', () => {
    const { container } = renderWithTooltipProvider(
      <HealingHealthBar
        label="Heal"
        maxHealth={100}
        remainingHealth={25}
        healingAmount={200}
      />
    );

    expect(screen.getByText(/100 \/ 100/)).toBeInTheDocument();

    const styles = Array.from(container.querySelectorAll('div[style]')).map((element) => element.getAttribute('style') || '');

    expect(styles.some((style) => style.includes('width: 25%;') && style.includes('background-color: var(--color-destructive);'))).toBe(true);
    expect(styles.some((style) => style.includes('left: 25%;') && style.includes('width: 75%;') && style.includes('background-color: oklch(0.623 0.188 145.28);'))).toBe(true);
  });
});
