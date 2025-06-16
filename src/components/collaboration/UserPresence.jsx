/**
 * User Presence Component
 * Shows active users in a collaborative session with Google Docs-like indicators
 */

import React, { useState, useEffect } from 'react';
import { useCollaboration } from '../../contexts/CollaborationContext';
import './UserPresence.css';

const UserPresence = ({ planId, className = '' }) => {
  const {
    roomUsers,
    userSelections,
    userId,
    displayName,
    isCollaborating
  } = useCollaboration();

  const [showUserList, setShowUserList] = useState(false);

  // Filter out current user from the list for display
  const otherUsers = roomUsers.filter(user => user.id !== userId);

  // Get user color based on their ID
  const getUserColor = (userId) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format last seen time
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Just now';
    
    const now = Date.now();
    const lastSeenTime = typeof lastSeen === 'object' && lastSeen.seconds
      ? lastSeen.seconds * 1000
      : (typeof lastSeen === 'number' ? lastSeen : now);
    
    const diffMs = now - lastSeenTime;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 30) return 'Just now';
    if (diffMinutes < 1) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return 'Long ago';
  };

  // Check if user is currently active (last seen within 2 minutes)
  const isUserActive = (lastSeen) => {
    if (!lastSeen) return true;
    
    const now = Date.now();
    const lastSeenTime = typeof lastSeen === 'object' && lastSeen.seconds
      ? lastSeen.seconds * 1000
      : (typeof lastSeen === 'number' ? lastSeen : now);
    
    return (now - lastSeenTime) < (2 * 60 * 1000); // 2 minutes
  };

  if (!isCollaborating || otherUsers.length === 0) {
    return null;
  }

  return (
    <div className={`user-presence ${className}`}>
      {/* User Avatars */}
      <div className="user-avatars">
        {otherUsers.slice(0, 5).map((user) => {
          const userColor = getUserColor(user.id);
          const isActive = isUserActive(user.lastSeen);
          
          return (
            <div
              key={user.id}
              className={`user-avatar ${isActive ? 'active' : 'inactive'}`}
              style={{ 
                backgroundColor: userColor,
                borderColor: userColor
              }}
              title={`${user.name || 'Anonymous User'} - ${formatLastSeen(user.lastSeen)}`}
              onClick={() => setShowUserList(!showUserList)}
            >
              <span className="user-initials">
                {getUserInitials(user.name)}
              </span>
              {isActive && <div className="active-indicator" />}
            </div>
          );
        })}
        
        {otherUsers.length > 5 && (
          <div 
            className="user-avatar overflow-indicator"
            onClick={() => setShowUserList(!showUserList)}
            title={`+${otherUsers.length - 5} more users`}
          >
            <span className="user-initials">
              +{otherUsers.length - 5}
            </span>
          </div>
        )}
      </div>

      {/* User List Dropdown */}
      {showUserList && (
        <div className="user-list-dropdown">
          <div className="user-list-header">
            <h4>Active Users ({roomUsers.length})</h4>
            <button 
              className="close-button"
              onClick={() => setShowUserList(false)}
            >
              ×
            </button>
          </div>
          
          <div className="user-list">
            {/* Current User */}
            <div className="user-item current-user">
              <div 
                className="user-avatar small"
                style={{ backgroundColor: getUserColor(userId) }}
              >
                <span className="user-initials">
                  {getUserInitials(displayName)}
                </span>
              </div>
              <div className="user-info">
                <span className="user-name">{displayName || 'You'}</span>
                <span className="user-status">You</span>
              </div>
            </div>
            
            {/* Other Users */}
            {otherUsers.map((user) => {
              const userColor = getUserColor(user.id);
              const isActive = isUserActive(user.lastSeen);
              const selection = userSelections[user.id];
              
              return (
                <div key={user.id} className="user-item">
                  <div 
                    className={`user-avatar small ${isActive ? 'active' : 'inactive'}`}
                    style={{ backgroundColor: userColor }}
                  >
                    <span className="user-initials">
                      {getUserInitials(user.name)}
                    </span>
                    {isActive && <div className="active-indicator small" />}
                  </div>
                  
                  <div className="user-info">
                    <span className="user-name">
                      {user.name || 'Anonymous User'}
                    </span>
                    <span className="user-status">
                      {isActive ? (
                        selection ? `Editing ${selection.elementType || 'element'}` : 'Active'
                      ) : (
                        formatLastSeen(user.lastSeen)
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPresence;
