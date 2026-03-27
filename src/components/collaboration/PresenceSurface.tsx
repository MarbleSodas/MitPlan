import { useCallback, useRef, type CSSProperties, type MouseEvent, type ReactNode, type UIEvent } from 'react';
import { usePresenceOptional } from '../../contexts/PresenceContext';
import type { CollaborationSurface } from '../../types/presence';
import RemoteCursorLayer from './RemoteCursorLayer';

interface PresenceSurfaceProps {
  children: ReactNode;
  surface: CollaborationSurface;
  panel?: string | null;
  section?: string | null;
  className?: string;
  style?: CSSProperties;
  showRemoteCursors?: boolean;
  hideRemoteCursorsOnMobile?: boolean;
}

const PresenceSurface = ({
  children,
  surface,
  panel = null,
  section = null,
  className = '',
  style,
  showRemoteCursors = true,
  hideRemoteCursorsOnMobile = false,
}: PresenceSurfaceProps) => {
  const presence = usePresenceOptional();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updateViewport = useCallback(
    (scrollTop: number | null = null) => {
      if (!presence) {
        return;
      }

      presence.setViewport({
        surface,
        panel,
        section,
        scrollTop,
      });
    },
    [panel, presence, section, surface]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!presence || !containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      presence.setCursor({
        surface,
        panel,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        containerWidth: rect.width,
        containerHeight: rect.height,
      });
      updateViewport(containerRef.current.scrollTop);
    },
    [panel, presence, surface, updateViewport]
  );

  const handleMouseEnter = useCallback(() => {
    updateViewport(containerRef.current?.scrollTop ?? 0);
  }, [updateViewport]);

  const handleMouseLeave = useCallback(() => {
    if (!presence) {
      return;
    }

    presence.setCursor(null);
  }, [presence]);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      updateViewport(event.currentTarget.scrollTop);
    },
    [updateViewport]
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onScroll={handleScroll}
    >
      {children}
      {showRemoteCursors && (
        <RemoteCursorLayer
          containerRef={containerRef}
          surface={surface}
          panel={panel}
          hideOnMobile={hideRemoteCursorsOnMobile}
        />
      )}
    </div>
  );
};

export default PresenceSurface;
