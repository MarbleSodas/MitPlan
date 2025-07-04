import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import { AuthProvider } from './contexts/AuthContext';
import { PlanProvider } from './contexts/PlanContext';
import { CollaborationProvider } from './contexts/CollaborationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './components/landing/LandingPage';
import Dashboard from './components/dashboard/Dashboard';
import MitigationPlanner from './components/planner/MitigationPlanner';
import { useAuth } from './contexts/AuthContext';

// Global styles
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: ${props => props.theme?.colors?.background || '#ffffff'};
    color: ${props => props.theme?.colors?.text || '#333333'};
  }

  #root {
    min-height: 100vh;
  }
`;



// Loading component
const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 1.1rem;
  color: ${props => props.theme?.colors?.lightText || '#6b7280'};
  background: ${props => props.theme?.colors?.background || '#ffffff'};
`;

const LoadingComponent = () => (
  <LoadingSpinner>
    Loading...
  </LoadingSpinner>
);

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingComponent />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main App component that handles routing and authentication
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingComponent />;
  }

  return (
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
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Plan editing routes */}
      <Route
        path="/plan/edit/:planId"
        element={
          <ProtectedRoute>
            <MitigationPlanner />
          </ProtectedRoute>
        }
      />

      <Route
        path="/planner"
        element={
          <ProtectedRoute>
            <MitigationPlanner />
          </ProtectedRoute>
        }
      />

      <Route
        path="/planner/:planId"
        element={
          <ProtectedRoute>
            <MitigationPlanner />
          </ProtectedRoute>
        }
      />

      {/* Shared plan routes - accessible to both authenticated and unauthenticated users */}
      <Route
        path="/plan/shared/:planId"
        element={<MitigationPlanner isSharedPlan={true} />}
      />

      {/* Catch all route */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />}
      />
    </Routes>
  );
};

// Main App component
function App() {
  return (
    <ThemeProvider>
      <GlobalStyle />
      <Router>
        <AuthProvider>
          <CollaborationProvider>
            <PlanProvider>
              <AppContent />
            </PlanProvider>
          </CollaborationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;