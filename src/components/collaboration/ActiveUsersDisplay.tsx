import { useState, useMemo } from 'react';
import { usePresenceOptional } from '../../contexts/PresenceContext';
import { describePresenceActivity } from '../../types/presence';
import { getPresenceColor } from '../../lib/presence-colors';
import { cn } from '../../lib/utils';

const generateUserColor = getPresenceColor;

const cleanDisplayName = (name) => {
  if (!name) return name;
  if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
    return name.slice(1, -1);
  }
  return name;
};

const getInitials = (displayName) => {
  const cleanName = cleanDisplayName(displayName);
  return cleanName
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const ActiveUsersDisplay = ({
  collaborators = [],
  currentSessionId,
  maxDisplayUsers = 8,
  compact = false,
  className = '',
}) => {
  const [hoveredUser, setHoveredUser] = useState(null);
  const presence = usePresenceOptional();

  const activeCollaborators = collaborators.filter(c => c.isActive);
  const currentUser = activeCollaborators.find(c => c.sessionId === currentSessionId);
  const otherUsers = activeCollaborators.filter(c => c.sessionId !== currentSessionId);
  const sortedUsers = currentUser ? [currentUser, ...otherUsers] : otherUsers;
  const displayedUsers = sortedUsers.slice(0, maxDisplayUsers);
  const overflowCount = Math.max(0, sortedUsers.length - maxDisplayUsers);

  const userActivities = useMemo(() => {
    if (!presence?.presenceMap) return new Map();
    
    const activities = new Map();
    presence.presenceMap.forEach((userPresence, sessionId) => {
      const activity = describePresenceActivity(userPresence);
      if (activity) {
        activities.set(sessionId, activity);
      }
    });
    return activities;
  }, [presence?.presenceMap]);



  if (activeCollaborators.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center border border-border bg-card shadow-sm transition-all',
          compact ? 'gap-2 rounded-lg px-2.5 py-2' : 'mb-4 gap-3 rounded-xl px-6 py-4',
          className,
        )}
      >
        <span className={cn('whitespace-nowrap font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>
          Active users:
        </span>
        <span className={cn('italic text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
          None
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-w-0 items-center border border-border bg-card shadow-sm transition-all',
        compact ? 'gap-2 rounded-lg px-2.5 py-2' : 'mb-4 gap-3 rounded-xl px-6 py-4',
        className,
      )}
    >
      <span className={cn('whitespace-nowrap font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>
        {compact ? `${activeCollaborators.length} active` : `Active Users (${activeCollaborators.length}):`}
      </span>

      <div className={cn('flex min-w-0 items-center', compact ? '-space-x-1.5' : 'flex-wrap gap-2')}>
        {displayedUsers.map((user) => {
          const bg = generateUserColor(user.userId);
          const isHovered = hoveredUser === user.sessionId;
          const activity = userActivities.get(user.sessionId);
          return (
            <div
              key={user.sessionId}
              className={cn(
                'relative flex shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-card font-semibold text-white shadow-sm transition-transform',
                compact ? 'h-7 w-7 text-[0.7rem] hover:z-10 hover:-translate-y-0.5' : 'h-9 w-9 text-[0.875rem]',
              )}
              style={{ backgroundColor: bg }}
              onMouseEnter={() => setHoveredUser(user.sessionId)}
              onMouseLeave={() => setHoveredUser(null)}
            >
              {getInitials(user.displayName)}
              <div
                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs font-medium pointer-events-none shadow-md transition-all bg-foreground text-card whitespace-nowrap ${isHovered ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
              >
                <div>{cleanDisplayName(user.displayName)}{user.sessionId === currentSessionId ? ' (You)' : ''}</div>
                {activity && <div className="text-[10px] opacity-80 mt-0.5">{activity}</div>}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45"></div>
              </div>
            </div>
          );
        })}

        {overflowCount > 0 && (
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full border-2 border-card bg-muted-foreground font-semibold text-white shadow-sm',
              compact ? 'h-7 w-7 text-[0.65rem]' : 'h-9 w-9 text-[0.75rem]',
            )}
          >
            +{overflowCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveUsersDisplay;
