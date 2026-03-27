/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BossActionsLibrary from './BossActionsLibrary';

describe('BossActionsLibrary', () => {
  const onSelectAction = vi.fn();

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    onSelectAction.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.setPointerCapture = vi.fn();
  });

  it('renders full classification metadata and emits time-agnostic templates', async () => {
    render(<BossActionsLibrary onSelectAction={onSelectAction} />);

    fireEvent.change(screen.getByPlaceholderText('Search actions, bosses, abilities...'), {
      target: { value: 'Hardcore' },
    });

    await waitFor(() => {
      expect(screen.getAllByText('Hardcore').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Dual Tankbuster').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /set time/i })[0]!);

    expect(onSelectAction).toHaveBeenCalledTimes(1);
    expect(onSelectAction.mock.calls[0]?.[0]).toMatchObject({
      name: 'Hardcore',
      classification: 'dual_tankbuster',
      sourceBoss: 'vamp-fatale-m9s',
    });
    expect('time' in onSelectAction.mock.calls[0]?.[0]).toBe(false);
  });
});
