import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from './AuthModal';

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  border-radius: 16px;
  height: 36px;
  padding: 0 16px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  font-weight: 600;
  font-size: ${props => props.theme.fontSizes.medium};
  box-shadow: ${props => props.theme.shadows.small};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.medium};
  }

  &:active {
    transform: translateY(0);
  }
`;

const UserButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  border-radius: 16px;
  height: 36px;
  padding: 0 16px;
  background-color: ${props => props.theme.colors.cardBackground};
  color: ${props => props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.border};
  font-weight: 600;
  font-size: ${props => props.theme.fontSizes.medium};
  box-shadow: ${props => props.theme.shadows.small};
  gap: 8px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.medium};
    background-color: ${props => props.theme.mode === 'dark' ? '#2a2a2a' : '#f5f5f5'};
  }

  &:active {
    transform: translateY(0);
  }
`;

const UserAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  box-shadow: ${props => props.theme.shadows.small};
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background-color: ${props => props.theme.colors.cardBackground};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.medium};
  box-shadow: ${props => props.theme.shadows.large};
  z-index: 100;
  min-width: 180px;
  overflow: hidden;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const DropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.colors.text};
  transition: all 0.2s ease;
  font-size: ${props => props.theme.fontSizes.medium};
  font-weight: 500;

  &:hover {
    background-color: ${props => props.theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
    transform: translateX(2px);
  }

  &:active {
    transform: translateX(0);
  }

  &.danger {
    color: ${props => props.theme.colors.error};
  }
`;

const UserMenuContainer = styled.div`
  position: relative;
`;

const VerificationBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  border-radius: ${props => props.theme.borderRadius.pill};
  font-size: 10px;
  font-weight: 600;
  background-color: ${props => props.verified ? props.theme.colors.success : props.theme.colors.warning};
  color: white;
  margin-left: 6px;
  box-shadow: ${props => props.theme.shadows.small};
`;

const AuthButton = ({ onProfileClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLoginClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    }
    setIsMenuOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  if (isAuthenticated && user) {
    return (
      <UserMenuContainer>
        <UserButton onClick={toggleMenu}>
          <UserAvatar>{getInitials(user.username)}</UserAvatar>
          <span>{user.username}</span>
          {!user.isVerified && (
            <VerificationBadge verified={false}>!</VerificationBadge>
          )}
        </UserButton>

        {isMenuOpen && (
          <DropdownMenu>
            <DropdownItem onClick={handleProfileClick}>Profile</DropdownItem>
            <DropdownItem onClick={handleLogout} className="danger">Logout</DropdownItem>
          </DropdownMenu>
        )}
      </UserMenuContainer>
    );
  }

  return (
    <>
      <Button onClick={handleLoginClick}>
        Login / Register
      </Button>

      <AuthModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default AuthButton;