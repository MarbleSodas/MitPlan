/* @vitest-environment jsdom */

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimelineEditorShell } from './TimelineEditor';

const {
  shellSpy,
} = vi.hoisted(() => ({
  shellSpy: vi.fn(),
}));

vi.mock('../collaboration/CollaborationPresenceShell', () => ({
  default: ({
    children,
    roomId,
    enabled,
  }: {
    children: ReactNode;
    roomId: string | null;
      enabled?: boolean;
  }) => {
    shellSpy({ roomId, enabled });
    return children;
  },
}));

describe('TimelineEditor collaboration shell', () => {
  beforeEach(() => {
    shellSpy.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not enable collaboration for unsaved timelines', () => {
    render(<TimelineEditorShell><div /></TimelineEditorShell>);

    expect(shellSpy).toHaveBeenCalledWith({
      roomId: null,
      enabled: false,
    });
  });

  it('uses a timeline-scoped collaboration room for saved timelines', () => {
    render(<TimelineEditorShell timelineId="timeline-42"><div /></TimelineEditorShell>);

    expect(shellSpy).toHaveBeenCalledWith({
      roomId: 'timeline:timeline-42',
      enabled: true,
    });
  });
});
