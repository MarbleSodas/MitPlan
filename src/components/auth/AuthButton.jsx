import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from './AuthModal';
import UserProfile from './UserProfile';
import AccountSettings from './AccountSettings';
import ProfileService from '../../services/ProfileService';

const AuthContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
`;

const AuthButton = styled.button`
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}ee, ${props => props.theme.colors.primary});
  color: white;
  border: none;
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
  border-radius: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  font-size: ${props => props.theme.fontSizes.responsive.medium};
  font-weight: 600;
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    background: linear-gradient(135deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.primary}dd);
    box-shadow: ${props => props.theme.shadows.medium};
    transform: translateY(-1px);

    &::before {
      left: 100%;
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}40;
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${props => props.theme.shadows.small};
  }

  &:disabled {
    background: ${props => props.theme.colors.border};
    color: ${props => props.theme.colors.lightText};
    cursor: not-allowed;
    transform: none;

    &::before {
      display: none;
    }
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.medium};
    font-size: ${props => props.theme.fontSizes.responsive.small};
    min-height: 40px;
  }
`;

const UserMenuButton = styled.button`
  background: none;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 16px;
  padding: ${props => props.theme.spacing.small};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  color: ${props => props.theme.colors.text};

  &:hover {
    background-color: ${props => props.theme.colors.border};
    box-shadow: ${props => props.theme.shadows.hover};
  }

  &:focus {
    outline: none;
    box-shadow: ${props => props.theme.shadows.focus};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.xsmall};
  }
`;

const UserAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.theme.fontSizes.xsmall};
  font-weight: bold;
  color: white;

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 20px;
    height: 20px;
    font-size: 10px;
  }
`;

const UserName = styled.span`
  font-size: ${props => props.theme.fontSizes.responsive.small};
  font-weight: 500;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    display: none;
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: ${props => props.theme.spacing.small};
  background-color: ${props => props.theme.colors.cardBackground};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  box-shadow: ${props => props.theme.shadows.large};
  z-index: 1000;
  min-width: 180px;
  overflow: hidden;
`;

const DropdownItem = styled.button`
  width: 100%;
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
  background: none;
  border: none;
  text-align: left;
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.fontSizes.responsive.small};
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.border};
  }

  &:focus {
    outline: none;
    background-color: ${props => props.theme.colors.border};
  }
`;

const DropdownDivider = styled.div`
  height: 1px;
  background-color: ${props => props.theme.colors.border};
  margin: ${props => props.theme.spacing.xsmall} 0;
`;

const AuthButtonComponent = () => {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Get user initials for avatar
  const getUserInitials = () => {
    const displayName = user?.displayName || user?.display_name || user?.email;
    if (!displayName) return '?';
    return ProfileService.getInitials(displayName);
  };

  // Get profile picture URL with fallback chain
  const getProfilePictureUrl = () => {
    // 1. Custom uploaded image (base64)
    if (user?.profilePictureBase64) {
      return user.profilePictureBase64;
    }

    // 2. Legacy profile picture URL (Google photos, etc.)
    if (user?.profilePictureUrl || user?.avatar_url) {
      return user.profilePictureUrl || user.avatar_url;
    }

    // 3. Return null to show initials
    return null;
  };

  // Handle logout
  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  // Handle menu item clicks
  const handleProfileClick = () => {
    setShowUserMenu(false);
    setShowProfile(true);
  };

  const handleSettingsClick = () => {
    setShowUserMenu(false);
    setShowSettings(true);
  };

  if (isLoading) {
    return (
      <AuthContainer>
        <AuthButton disabled>
          Loading...
        </AuthButton>
      </AuthContainer>
    );
  }

  if (isAuthenticated && user) {
    return (
      <AuthContainer ref={menuRef}>
        <UserMenuButton onClick={() => setShowUserMenu(!showUserMenu)}>
          <UserAvatar>
            {getProfilePictureUrl() ? (
              <img
                src={getProfilePictureUrl()}
                alt="Profile"
                onError={(e) => {
                  // Silently handle image load errors and show initials instead
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
                onLoad={(e) => {
                  // Ensure the image is visible when it loads successfully
                  e.target.style.display = 'block';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'none';
                  }
                }}
              />
            ) : null}
            <span style={{ display: getProfilePictureUrl() ? 'none' : 'flex' }}>
              {getUserInitials()}
            </span>
          </UserAvatar>
          <UserName>{user.displayName || user.display_name}</UserName>
          <span style={{ fontSize: '12px', color: 'inherit' }}>▼</span>
        </UserMenuButton>

        {showUserMenu && (
          <DropdownMenu>
            <DropdownItem onClick={handleProfileClick}>
              👤 Profile
            </DropdownItem>
            <DropdownItem onClick={handleSettingsClick}>
              ⚙️ Settings
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={handleLogout}>
              🚪 Sign Out
            </DropdownItem>
          </DropdownMenu>
        )}

        {/* Profile Modal */}
        {showProfile && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <UserProfile onClose={() => setShowProfile(false)} />
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <AccountSettings onClose={() => setShowSettings(false)} />
          </div>
        )}
      </AuthContainer>
    );
  }

  return (
    <AuthContainer>
      <AuthButton onClick={() => setShowAuthModal(true)}>
        Sign In
      </AuthButton>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab="login"
      />
    </AuthContainer>
  );
};

export default AuthButtonComponent;
