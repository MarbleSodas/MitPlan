import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from './AuthModal';

const Button = styled.button`
  padding: 8px 16px;
  background-color: ${props => props.theme.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background-color: ${props => props.theme.primaryHover};
  }
`;

const UserButton = styled.button`
  padding: 8px 16px;
  background-color: ${props => props.theme.cardBackground};
  color: ${props => props.theme.textPrimary};
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background-color: ${props => props.theme.backgroundHover};
  }
`;

const UserAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.theme.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background-color: ${props => props.theme.cardBackground};
  border: 1px solid ${props => props.theme.borderColor};
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 180px;
  overflow: hidden;
`;

const DropdownItem = styled.button`
  display: block;
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.textPrimary};
  transition: background-color 0.2s;
  
  &:hover {
    background-color: ${props => props.theme.backgroundHover};
  }
  
  &.danger {
    color: ${props => props.theme.error};
  }
`;

const UserMenuContainer = styled.div`
  position: relative;
`;

const VerificationBadge = styled.span`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  background-color: ${props => props.verified ? props.theme.success : props.theme.warning};
  color: white;
  margin-left: 6px;
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