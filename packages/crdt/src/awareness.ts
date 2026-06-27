/**
 * Awareness state. Architecture §14.3.
 * LWW per field is acceptable for cursors. Updates throttled to 100ms per client.
 *
 * The `Awareness` class is in `y-protocols/awareness` (separate package).
 * Y.js 13.x does not export `AbstractAwareness` from its main index.
 */
import { Awareness } from 'y-protocols/awareness';
import { z } from 'zod';

export const CursorPosition = z.object({
  /** Pixels from the timeline's left edge. */
  x: z.number(),
  /** Pixels from the timeline's top edge. */
  y: z.number(),
});
export type CursorPosition = z.infer<typeof CursorPosition>;

export const Selection = z.object({
  /** Event id, if the cursor is on a timeline event. */
  eventId: z.string().uuid().nullable(),
  /** Assignment id, if the cursor is on a mit. */
  assignmentId: z.string().uuid().nullable(),
});
export type Selection = z.infer<typeof Selection>;

export const PresenceState = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  /** A stable color for the cursor + selection (hashed from userId). */
  color: z.string(),
  cursor: CursorPosition.nullable(),
  selection: Selection.nullable(),
  view: z.enum(['TIMELINE', 'MIT_PALETTE', 'TANK_STATE', 'VERSIONS']),
  updatedAt: z.number().int().nonnegative(),
});
export type PresenceState = z.infer<typeof PresenceState>;

type AwarenessChange = {
  added: number[];
  updated: number[];
  removed: number[];
};

type AwarenessHandler = (changes: AwarenessChange, origin: unknown) => void;

/**
 * Throttle awareness updates to 100ms per client. The Yjs awareness
 * protocol does not throttle by default; this wrapper enforces it.
 */
export class ThrottledAwareness {
  private readonly lastSent = new Map<number, number>();
  private static readonly THROTTLE_MS = 100;

  constructor(private readonly awareness: Awareness) {}

  setLocalState(state: PresenceState): void {
    const clientId = this.awareness.clientID;
    const now = Date.now();
    const last = this.lastSent.get(clientId) ?? 0;
    if (now - last < ThrottledAwareness.THROTTLE_MS) return;
    this.lastSent.set(clientId, now);
    this.awareness.setLocalState(state);
  }

  getStates(): Map<number, PresenceState | null> {
    return this.awareness.getStates() as Map<number, PresenceState | null>;
  }

  on(event: 'change' | 'update', handler: AwarenessHandler): void {
    this.awareness.on(event, handler);
  }

  off(event: 'change' | 'update', handler: AwarenessHandler): void {
    this.awareness.off(event, handler);
  }
}
