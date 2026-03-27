import { useMemo, type RefObject } from 'react';
import { usePresenceOptional } from '../../contexts/PresenceContext';
import { getInitials, type CollaborationSurface } from '../../types/presence';

interface RemoteCursorLayerProps {
  containerRef: RefObject<HTMLElement | null>;
  surface: CollaborationSurface;
  panel?: string | null;
  hideOnMobile?: boolean;
}

const RemoteCursorLayer = ({
  containerRef,
  surface,
  panel = null,
  hideOnMobile = false,
}: RemoteCursorLayerProps) => {
  const presence = usePresenceOptional();

  const cursors = useMemo(() => {
    if (!presence || !presence.collaborationAvailable) {
      return [];
    }

    return Array.from(presence.presenceMap.values())
      .filter((item) => item.sessionId !== presence.currentSessionId)
      .filter((item) => item.cursor?.surface === surface)
      .filter((item) => !panel || item.cursor?.panel === panel)
      .filter((item) => typeof item.cursor?.x === 'number' && typeof item.cursor?.y === 'number')
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [panel, presence, surface]);

  if (!presence || !presence.collaborationAvailable || !containerRef.current || cursors.length === 0) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${hideOnMobile ? 'hidden md:block' : ''}`}
      aria-hidden="true"
    >
      {cursors.map((cursorPresence) => {
        const cursor = cursorPresence.cursor;
        if (!cursor) {
          return null;
        }

        return (
          <div
            key={cursorPresence.sessionId}
            className="absolute left-0 top-0"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            }}
          >
            <div className="relative -translate-x-1 -translate-y-1">
              <div
                className="h-3 w-3 rotate-[-20deg] rounded-[3px] border border-white shadow-sm"
                style={{ backgroundColor: cursorPresence.color }}
              />
              <div
                className="absolute left-3 top-0 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-white shadow-sm"
                style={{ backgroundColor: cursorPresence.color }}
              >
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px]">
                  {getInitials(cursorPresence.displayName)}
                </span>
                <span className="max-w-[96px] truncate">{cursorPresence.displayName}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RemoteCursorLayer;
