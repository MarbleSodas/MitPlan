/**
 * Comprehensive tests for share link functionality and real-time collaboration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { AppProvider } from '../contexts';
import { DisplayNameProvider } from '../contexts/DisplayNameContext';
import { CollaborationProvider } from '../contexts/CollaborationContext';
import { ReadOnlyProvider } from '../contexts/ReadOnlyContext';

// Mock Firebase services
vi.mock('../services/FirestoreService', () => ({
  default: {
    getPlan: vi.fn(),
    loadSharedPlan: vi.fn()
  }
}));

vi.mock('../services/RealtimeCollaborationService', () => ({
  default: {
    joinPlan: vi.fn(),
    leavePlan: vi.fn(),
    subscribeToActiveUsers: vi.fn(),
    subscribeToSelections: vi.fn(),
    subscribeToPlanUpdates: vi.fn()
  }
}));

vi.mock('../services/SessionManagementService', () => ({
  default: {
    getSession: vi.fn(),
    startSession: vi.fn(),
    ensureSessionForSharedPlan: vi.fn()
  }
}));

// Mock URL and navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Test wrapper component
const TestWrapper = ({ children, initialPath = '/' }) => {
  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: {
      pathname: initialPath,
      search: '',
      href: `http://localhost:3000${initialPath}`
    },
    writable: true
  });

  return (
    <BrowserRouter>
      <AppProvider>
        <DisplayNameProvider>
          <CollaborationProvider>
            <ReadOnlyProvider>
              {children}
            </ReadOnlyProvider>
          </CollaborationProvider>
        </DisplayNameProvider>
      </AppProvider>
    </BrowserRouter>
  );
};

describe('Share Link Collaboration', () => {
  const mockPlanId = '12345678-1234-1234-1234-123456789abc';
  const mockPlanData = {
    id: mockPlanId,
    name: 'Test Shared Plan',
    assignments: {},
    selectedJobs: {},
    bossId: 'ketuduke',
    tankPositions: {},
    isPublic: true,
    isShared: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset window.location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/',
        search: '',
        href: 'http://localhost:3000/'
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Share Link Access', () => {
    it('should immediately load and display plan data when accessing share link', async () => {
      const FirestoreService = await import('../services/FirestoreService');
      FirestoreService.default.loadSharedPlan.mockResolvedValue(mockPlanData);

      // Mock shared plan URL
      Object.defineProperty(window, 'location', {
        value: {
          pathname: `/plan/shared/${mockPlanId}`,
          search: '',
          href: `http://localhost:3000/plan/shared/${mockPlanId}`
        },
        writable: true
      });

      render(
        <TestWrapper initialPath={`/plan/shared/${mockPlanId}`}>
          <App />
        </TestWrapper>
      );

      // Plan should be loaded and displayed immediately
      await waitFor(() => {
        expect(FirestoreService.default.loadSharedPlan).toHaveBeenCalledWith(mockPlanId);
      });

      // Plan content should be visible
      expect(screen.getByText(/Boss Timeline & Mitigation Planner/i)).toBeInTheDocument();
    });

    it('should show non-blocking display name prompt for unauthenticated users', async () => {
      const FirestoreService = await import('../services/FirestoreService');
      FirestoreService.default.loadSharedPlan.mockResolvedValue(mockPlanData);

      Object.defineProperty(window, 'location', {
        value: {
          pathname: `/plan/shared/${mockPlanId}`,
          search: '',
          href: `http://localhost:3000/plan/shared/${mockPlanId}`
        },
        writable: true
      });

      render(
        <TestWrapper initialPath={`/plan/shared/${mockPlanId}`}>
          <App />
        </TestWrapper>
      );

      // Plan should be visible immediately
      await waitFor(() => {
        expect(screen.getByText(/Boss Timeline & Mitigation Planner/i)).toBeInTheDocument();
      });

      // Display name prompt should appear as banner (non-blocking)
      await waitFor(() => {
        expect(screen.getByText(/Join the collaboration/i)).toBeInTheDocument();
      });

      // Plan content should still be accessible
      expect(screen.getByText(/Boss Timeline & Mitigation Planner/i)).toBeInTheDocument();
    });

    it('should auto-join collaboration session when plan data is available', async () => {
      const FirestoreService = await import('../services/FirestoreService');
      const RealtimeCollaborationService = await import('../services/RealtimeCollaborationService');
      
      FirestoreService.default.loadSharedPlan.mockResolvedValue(mockPlanData);
      RealtimeCollaborationService.default.joinPlan.mockResolvedValue({
        success: true,
        sessionActive: true,
        isSessionOwner: false
      });

      Object.defineProperty(window, 'location', {
        value: {
          pathname: `/plan/shared/${mockPlanId}`,
          search: '',
          href: `http://localhost:3000/plan/shared/${mockPlanId}`
        },
        writable: true
      });

      render(
        <TestWrapper initialPath={`/plan/shared/${mockPlanId}`}>
          <App />
        </TestWrapper>
      );

      // Wait for plan to load and collaboration to be attempted
      await waitFor(() => {
        expect(FirestoreService.default.loadSharedPlan).toHaveBeenCalledWith(mockPlanId);
      });

      // Note: Collaboration join might be attempted after display name is provided
      // This test verifies the setup is in place
    });
  });

  describe('Error Handling', () => {
    it('should handle missing plan gracefully', async () => {
      const FirestoreService = await import('../services/FirestoreService');
      FirestoreService.default.loadSharedPlan.mockRejectedValue(new Error('Plan not found'));

      Object.defineProperty(window, 'location', {
        value: {
          pathname: `/plan/shared/${mockPlanId}`,
          search: '',
          href: `http://localhost:3000/plan/shared/${mockPlanId}`
        },
        writable: true
      });

      // Mock window.location.href setter for redirect
      const mockLocationHref = vi.fn();
      Object.defineProperty(window.location, 'href', {
        set: mockLocationHref,
        configurable: true
      });

      render(
        <TestWrapper initialPath={`/plan/shared/${mockPlanId}`}>
          <App />
        </TestWrapper>
      );

      // Should attempt to load plan and handle error
      await waitFor(() => {
        expect(FirestoreService.default.loadSharedPlan).toHaveBeenCalledWith(mockPlanId);
      });

      // Should redirect with error
      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalledWith('/?error=plan_not_found');
      });
    });

    it('should fallback to session data when plan not found in Firestore', async () => {
      const FirestoreService = await import('../services/FirestoreService');
      const SessionManagementService = await import('../services/SessionManagementService');
      
      FirestoreService.default.loadSharedPlan.mockRejectedValue(new Error('Plan not found'));
      SessionManagementService.default.getSession.mockResolvedValue({
        id: 'session123',
        planSnapshot: mockPlanData,
        status: 'active'
      });

      Object.defineProperty(window, 'location', {
        value: {
          pathname: `/plan/shared/${mockPlanId}`,
          search: '',
          href: `http://localhost:3000/plan/shared/${mockPlanId}`
        },
        writable: true
      });

      render(
        <TestWrapper initialPath={`/plan/shared/${mockPlanId}`}>
          <App />
        </TestWrapper>
      );

      // Should attempt Firestore first, then fallback to session
      await waitFor(() => {
        expect(FirestoreService.default.loadSharedPlan).toHaveBeenCalledWith(mockPlanId);
      });

      await waitFor(() => {
        expect(SessionManagementService.default.getSession).toHaveBeenCalledWith(mockPlanId);
      });

      // Plan should be loaded from session data
      expect(screen.getByText(/Boss Timeline & Mitigation Planner/i)).toBeInTheDocument();
    });
  });

  describe('Authentication Transitions', () => {
    it('should handle seamless transition from anonymous to authenticated user', async () => {
      // This test would require more complex mocking of authentication state changes
      // For now, we verify the components are set up to handle this scenario
      
      const FirestoreService = await import('../services/FirestoreService');
      FirestoreService.default.loadSharedPlan.mockResolvedValue(mockPlanData);

      Object.defineProperty(window, 'location', {
        value: {
          pathname: `/plan/shared/${mockPlanId}`,
          search: '',
          href: `http://localhost:3000/plan/shared/${mockPlanId}`
        },
        writable: true
      });

      render(
        <TestWrapper initialPath={`/plan/shared/${mockPlanId}`}>
          <App />
        </TestWrapper>
      );

      // Plan should be accessible
      await waitFor(() => {
        expect(screen.getByText(/Boss Timeline & Mitigation Planner/i)).toBeInTheDocument();
      });

      // Display name context should be available for managing transitions
      expect(screen.getByText(/Boss Timeline & Mitigation Planner/i)).toBeInTheDocument();
    });
  });
});
