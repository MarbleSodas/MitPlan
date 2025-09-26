import { useState } from 'react';
import { Users, Eye, Edit3 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Generate a consistent color for a user based on their ID
const generateUserColor = (userId) => {
  const colors = [
    '#3399ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const cleanDisplayName = (name) => {
  if (!name) return name;
  if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) return name.slice(1, -1);
  return name;
};

const getInitials = (displayName) => {
  const cleanName = cleanDisplayName(displayName);
  return cleanName.split(' ').map(w => w.charAt(0)).join('').toUpperCase().slice(0, 2);
};

const CollaboratorsList = ({ collaborators = [], currentSessionId, isReadOnly = false }) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => setIsOpen(!isOpen);
  const handleClickOutside = (e) => { if (!e.target.closest('[data-collaborators-container]')) setIsOpen(false); };

  if (typeof window !== 'undefined') {
    if (isOpen) document.addEventListener('click', handleClickOutside);
    else document.removeEventListener('click', handleClickOutside);
  }

  const activeCollaborators = collaborators.filter(c => c.isActive);
  const currentUser = activeCollaborators.find(c => c.sessionId === currentSessionId);
  const otherUsers = activeCollaborators.filter(c => c.sessionId !== currentSessionId);

  return (
    <div className="relative inline-block" data-collaborators-container>
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 rounded-lg text-sm transition"
        style={{ padding: '0.5rem 0.75rem', background: colors.backgroundSecondary, border: `1px solid ${colors.border}`, color: colors.text }}
        onFocus={(e) => e.currentTarget.style.borderColor = colors.primary}
        onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
        onMouseEnter={(e) => e.currentTarget.style.background = colors.backgroundTertiary || '#e9ecef'}
        onMouseLeave={(e) => e.currentTarget.style.background = colors.backgroundSecondary}
      >
        <Users size={16} />
        <span>Collaborators</span>
        <span className="rounded-full text-white text-xs font-semibold min-w-[1.25rem] text-center px-1" style={{ background: colors.primary }}>
          {activeCollaborators.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 rounded-lg shadow-md min-w-[250px] max-w-[300px] z-[1000]" style={{ background: colors.background, border: `1px solid ${colors.border}` }}>
          <div className="px-4 py-3 font-semibold text-sm" style={{ borderBottom: `1px solid ${colors.border}`, color: colors.text }}>
            Active Collaborators ({activeCollaborators.length})
          </div>

          {activeCollaborators.length === 0 ? (
            <div className="p-4 text-center text-sm" style={{ color: colors.textSecondary }}>No active collaborators</div>
          ) : (
            <>
              {currentUser && (
                <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: generateUserColor(currentUser.userId) }}>
                    {getInitials(currentUser.displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: colors.text }}>{cleanDisplayName(currentUser.displayName)} (You)</div>
                    <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                      {isReadOnly ? (<><Eye size={12} /><span>Viewing</span></>) : (<><Edit3 size={12} /><span>Editing</span></>)}
                    </div>
                  </div>
                </div>
              )}

              {otherUsers.map((c) => (
                <div key={c.sessionId} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: generateUserColor(c.userId) }}>
                    {getInitials(c.displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: colors.text }}>{cleanDisplayName(c.displayName)}</div>
                    <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                      <Edit3 size={12} />
                      <span>Editing</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CollaboratorsList;
