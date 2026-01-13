import { useState, useMemo } from 'react';
import { usePresenceOptional } from '../../contexts/PresenceContext';
import type { ElementType } from '../../types/presence';


const generateUserColor = (userId) => {
  const colors = [
    '#3399ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

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

const getActivityDescription = (presence): string | null => {
  if (!presence) return null;
  
  if (presence.selectedBossActionId) {
    return 'Viewing timeline';
  }
  if (presence.focusedMitigationId) {
    return 'Selecting mitigation';
  }
  if (presence.focusedJobId) {
    return 'Configuring jobs';
  }
  if (presence.focusedTankPosition) {
    const pos = presence.focusedTankPosition === 'mainTank' ? 'MT' : 'OT';
    return `Setting ${pos}`;
  }
  return null;
};

const ActiveUsersDisplay = ({ collaborators = [], currentSessionId, maxDisplayUsers = 8 }) => {
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
      const activity = getActivityDescription(userPresence);
      if (activity) {
        activities.set(sessionId, activity);
      }
    });
    return activities;
  }, [presence?.presenceMap]);



  if (activeCollaborators.length === 0) {
    return (
      <div className="flex items-center gap-3 px-6 py-4 rounded-xl mb-4 shadow-sm border transition-all bg-card border-border">
        <span className="text-sm font-semibold whitespace-nowrap text-foreground">Active Users:</span>
        <span className="text-sm italic text-muted-foreground">No active collaborators</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-6 py-4 rounded-xl mb-4 shadow-sm border transition-all bg-card border-border">
      <span className="text-sm font-semibold whitespace-nowrap text-foreground">
        Active Users ({activeCollaborators.length}):
      </span>

      <div className="flex items-center gap-2 flex-wrap">
        {displayedUsers.map((user) => {
          const bg = generateUserColor(user.userId);
          const isHovered = hoveredUser === user.sessionId;
          const activity = userActivities.get(user.sessionId);
          return (
            <div
              key={user.sessionId}
              className="relative w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-[0.875rem] shrink-0 cursor-pointer border-2 shadow-sm transition-transform bg-[var(--avatar-bg)] border-card"
              style={{ '--avatar-bg': bg }}
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
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-[0.75rem] shrink-0 border-2 shadow-sm bg-muted-foreground border-card"
          >
            +{overflowCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveUsersDisplay;
