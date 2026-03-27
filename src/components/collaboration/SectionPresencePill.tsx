import { useMemo } from 'react';
import { usePresenceOptional } from '../../contexts/PresenceContext';
import { getInitials, type CollaborationSurface } from '../../types/presence';

interface SectionPresencePillProps {
  surface: CollaborationSurface;
  section: string;
}

const SectionPresencePill = ({ surface, section }: SectionPresencePillProps) => {
  const presence = usePresenceOptional();

  const users = useMemo(() => {
    if (!presence || !presence.collaborationAvailable) {
      return [];
    }

    return Array.from(presence.presenceMap.values())
      .filter((item) => item.sessionId !== presence.currentSessionId)
      .filter((item) => item.viewport?.surface === surface && item.viewport?.section === section)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [presence, section, surface]);

  if (users.length === 0) {
    return null;
  }

  const displayedUsers = users.slice(0, 2);
  const overflowCount = Math.max(0, users.length - displayedUsers.length);
  const tooltipLabel =
    users.length > 2
      ? `${displayedUsers.map((user) => user.displayName).join(', ')} +${overflowCount} more`
      : displayedUsers.map((user) => user.displayName).join(', ');

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground"
      title={tooltipLabel}
      aria-label={tooltipLabel}
    >
      {displayedUsers.map((user) => (
        <span
          key={user.sessionId}
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-white"
          style={{ backgroundColor: user.color }}
        >
          <span className="rounded-full bg-white/20 px-1 py-0.5 text-[9px]">
            {getInitials(user.displayName)}
          </span>
        </span>
      ))}
      {overflowCount > 0 && (
        <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-foreground">
          +{overflowCount}
        </span>
      )}
    </div>
  );
};

export default SectionPresencePill;
