import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LandingPage from '../landing/LandingPage';
import Dashboard from '../dashboard/Dashboard';
import MitigationPlanner from '../planner/MitigationPlanner';
import LoadingSpinner from '../common/LoadingSpinner';

const AppRouter = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LandingPage />
            )
          } 
        />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <Dashboard />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        
        <Route 
          path="/planner" 
          element={
            isAuthenticated ? (
              <MitigationPlanner />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        
        <Route 
          path="/planner/:planId" 
          element={
            isAuthenticated ? (
              <MitigationPlanner />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        
        {/* Catch all route */}
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} 
        />
      </Routes>
    </Router>
  );
};

export default AppRouter;
