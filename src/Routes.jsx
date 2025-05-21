import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import App from './App';
import { EmailVerification, PasswordReset, UserProfile } from './features/auth';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading state while checking authentication
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Render children if authenticated
  return children;
};

// Verification route component
const VerificationRoute = () => {
  const { isAuthenticated } = useAuth();
  
  // Get token from URL
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  
  // If authenticated and no token, redirect to home
  if (isAuthenticated && !token) {
    return <Navigate to="/" />;
  }
  
  // Render verification component
  return <EmailVerification token={token} />;
};

// Password reset route component
const PasswordResetRoute = () => {
  const { isAuthenticated } = useAuth();
  
  // Get token from URL
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  
  // If authenticated and no token, redirect to home
  if (isAuthenticated && !token) {
    return <Navigate to="/" />;
  }
  
  // Render password reset component
  return <PasswordReset />;
};

// Profile route component
const ProfileRoute = () => {
  return (
    <ProtectedRoute>
      <UserProfile />
    </ProtectedRoute>
  );
};

// Main routes component
const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Main app route */}
        <Route path="/" element={<App />} />
        
        {/* Authentication routes */}
        <Route path="/verify-email" element={<VerificationRoute />} />
        <Route path="/reset-password" element={<PasswordResetRoute />} />
        <Route path="/profile" element={<ProfileRoute />} />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
