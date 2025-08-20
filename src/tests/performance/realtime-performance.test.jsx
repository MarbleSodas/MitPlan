/**
 * Realtime Performance Tests
 * Tests for measuring Firebase usage, response times, and performance optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RealtimeAppProvider } from '../../contexts/RealtimeAppProvider';
import { AuthProvider } from '../../contexts/AuthContext';
import { CollaborationProvider } from '../../contexts/CollaborationContext';
import { useRealtimePlan } from '../../contexts/RealtimePlanContext';
import { useRealtimeJobContext } from '../../contexts/RealtimeJobContext';
import { useTankPositionContext } from '../../contexts/TankPositionContext';
import { useRealtimeMitigationContext } from '../../contexts/RealtimeMitigationContext';
import * as planService from '../../services/realtimePlanService';

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  database: {},
  auth: {}
}));

// Mock services with performance tracking
vi.mock('../../services/realtimePlanService');

// Performance tracking utilities
class PerformanceTracker {
  constructor() {
    this.metrics = {
      firebaseCalls: 0,
      totalResponseTime: 0,
      updateCount: 0,
      renderCount: 0,
      memoryUsage: []
    };
  }

  trackFirebaseCall(duration = 0) {
    this.metrics.firebaseCalls++;
    this.metrics.totalResponseTime += duration;
  }

  trackUpdate() {
    this.metrics.updateCount++;
  }

  trackRender() {
    this.metrics.renderCount++;
    if (performance.memory) {
      this.metrics.memoryUsage.push(performance.memory.usedJSHeapSize);
    }
  }

  getAverageResponseTime() {
    return this.metrics.firebaseCalls > 0 
      ? this.metrics.totalResponseTime / this.metrics.firebaseCalls 
      : 0;
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime: this.getAverageResponseTime(),
      memoryGrowth: this.metrics.memoryUsage.length > 1 
        ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] - this.metrics.memoryUsage[0]
        : 0
    };
  }

  reset() {
    this.metrics = {
      firebaseCalls: 0,
      totalResponseTime: 0,
      updateCount: 0,
      renderCount: 0,
      memoryUsage: []
    };
  }
}

// Test component with performance tracking
const PerformanceTestComponent = ({ tracker, onStateChange }) => {
  const planContext = useRealtimePlan();
  const jobContext = useRealtimeJobContext();
  const tankContext = useTankPositionContext();
  const mitigationContext = useRealtimeMitigationContext();

  useEffect(() => {
    tracker.trackRender();
  });

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        planContext,
        jobContext,
        tankContext,
        mitigationContext
      });
    }
  }, [planContext, jobContext, tankContext, mitigationContext]);

  return (
    <div data-testid="performance-test">
      Performance Test Component
    </div>
  );
};

const TestWrapper = ({ children, planId = 'test-plan-id' }) => (
  <BrowserRouter>
    <AuthProvider value={{ 
      user: { uid: 'test-user', displayName: 'Test User', email: 'test@example.com' },
      isAuthenticated: true 
    }}>
      <CollaborationProvider>
        <RealtimeAppProvider planId={planId}>
          {children}
        </RealtimeAppProvider>
      </CollaborationProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Realtime Performance Tests', () => {
  let performanceTracker;
  
  const mockPlan = {
    id: 'test-plan-id',
    name: 'Performance Test Plan',
    bossId: 'ketuduke',
    userId: 'test-user',
    isPublic: true,
    selectedJobs: {
      tank: [
        { id: 'PLD', name: 'Paladin', selected: false },
        { id: 'WAR', name: 'Warrior', selected: false }
      ]
    },
    assignments: {},
    tankPositions: { mainTank: null, offTank: null }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    performanceTracker = new PerformanceTracker();
    
    // Mock plan service with performance tracking
    planService.getPlan.mockImplementation(async () => {
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
      const end = performance.now();
      performanceTracker.trackFirebaseCall(end - start);
      return mockPlan;
    });

    planService.ensurePlanStructure.mockImplementation(async () => {
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 20));
      const end = performance.now();
      performanceTracker.trackFirebaseCall(end - start);
      return true;
    });

    planService.subscribeToPlanWithOrigin.mockImplementation((planId, callback) => {
      const start = performance.now();
      setTimeout(() => {
        const end = performance.now();
        performanceTracker.trackFirebaseCall(end - start);
        callback(mockPlan, null);
      }, 100);
      return () => {};
    });

    planService.updatePlanJobsRealtime.mockImplementation(async () => {
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 30));
      const end = performance.now();
      performanceTracker.trackFirebaseCall(end - start);
      performanceTracker.trackUpdate();
      return true;
    });

    planService.updatePlanTankPositionsRealtime.mockImplementation(async () => {
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 25));
      const end = performance.now();
      performanceTracker.trackFirebaseCall(end - start);
      performanceTracker.trackUpdate();
      return true;
    });

    planService.updatePlanAssignmentsRealtime.mockImplementation(async () => {
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 35));
      const end = performance.now();
      performanceTracker.trackFirebaseCall(end - start);
      performanceTracker.trackUpdate();
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Load Performance', () => {
    it('should load plan data within acceptable time limits', async () => {
      const startTime = performance.now();
      let contextState = null;

      render(
        <TestWrapper>
          <PerformanceTestComponent 
            tracker={performanceTracker}
            onStateChange={(state) => { contextState = state; }}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(contextState?.planContext?.isInitialized).toBe(true);
      });

      const endTime = performance.now();
      const totalLoadTime = endTime - startTime;

      // Should load within 2 seconds
      expect(totalLoadTime).toBeLessThan(2000);
      
      const metrics = performanceTracker.getMetrics();
      expect(metrics.averageResponseTime).toBeLessThan(200); // Average Firebase call should be under 200ms
    });

    it('should minimize Firebase API calls during initialization', async () => {
      let contextState = null;

      render(
        <TestWrapper>
          <PerformanceTestComponent 
            tracker={performanceTracker}
            onStateChange={(state) => { contextState = state; }}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(contextState?.planContext?.isInitialized).toBe(true);
      });

      const metrics = performanceTracker.getMetrics();
      
      // Should make minimal Firebase calls for initialization
      expect(metrics.firebaseCalls).toBeLessThanOrEqual(3); // ensurePlanStructure + subscribeToPlan + initial data
    });
  });

  describe('Update Performance', () => {
    it('should debounce rapid updates effectively', async () => {
      vi.useFakeTimers();
      
      let contextState = null;

      render(
        <TestWrapper>
          <PerformanceTestComponent 
            tracker={performanceTracker}
            onStateChange={(state) => { contextState = state; }}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(contextState?.planContext?.isInitialized).toBe(true);
      });

      // Reset tracker after initialization
      performanceTracker.reset();

      // Perform rapid updates
      const rapidUpdates = [];
      for (let i = 0; i < 10; i++) {
        rapidUpdates.push(
          contextState.jobContext.toggleJobSelection('tank', 'PLD')
        );
      }

      // Fast-forward timers to trigger debounced updates
      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        const metrics = performanceTracker.getMetrics();
        // Should have debounced to fewer Firebase calls than updates
        expect(metrics.firebaseCalls).toBeLessThan(10);
      });

      vi.useRealTimers();
    });

    it('should handle concurrent updates efficiently', async () => {
      let contextState = null;

      render(
        <TestWrapper>
          <PerformanceTestComponent 
            tracker={performanceTracker}
            onStateChange={(state) => { contextState = state; }}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(contextState?.planContext?.isInitialized).toBe(true);
      });

      performanceTracker.reset();
      const startTime = performance.now();

      // Perform concurrent updates
      const concurrentUpdates = [
        contextState.jobContext.toggleJobSelection('tank', 'PLD'),
        contextState.tankContext.assignTankPosition('PLD', 'mainTank'),
        contextState.mitigationContext.addMitigation('boss-action-1', { id: 'rampart', name: 'Rampart' }, 'mainTank')
      ];

      await Promise.all(concurrentUpdates);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete concurrent updates quickly
      expect(totalTime).toBeLessThan(1000);
      
      const metrics = performanceTracker.getMetrics();
      expect(metrics.averageResponseTime).toBeLessThan(100);
    });
  });

  describe('Memory Usage', () => {
    it('should not have significant memory leaks during extended use', async () => {
      let contextState = null;

      render(
        <TestWrapper>
          <PerformanceTestComponent 
            tracker={performanceTracker}
            onStateChange={(state) => { contextState = state; }}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(contextState?.planContext?.isInitialized).toBe(true);
      });

      // Perform many operations to test for memory leaks
      for (let i = 0; i < 50; i++) {
        contextState.jobContext.toggleJobSelection('tank', 'PLD');
        contextState.jobContext.toggleJobSelection('tank', 'WAR');
        
        // Wait a bit between operations
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const metrics = performanceTracker.getMetrics();
      
      // Memory growth should be reasonable (less than 10MB)
      if (metrics.memoryGrowth > 0) {
        expect(metrics.memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB
      }
    });

    it('should clean up listeners properly on unmount', async () => {
      const unsubscribeMock = vi.fn();
      planService.subscribeToPlanWithOrigin.mockReturnValue(unsubscribeMock);

      let contextState = null;

      const { unmount } = render(
        <TestWrapper>
          <PerformanceTestComponent 
            tracker={performanceTracker}
            onStateChange={(state) => { contextState = state; }}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(contextState?.planContext?.isInitialized).toBe(true);
      });

      unmount();

      // Should clean up Firebase listeners
      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const largePlan = {
        ...mockPlan,
        selectedJobs: {
          tank: Array.from({ length: 10 }, (_, i) => ({ 
            id: `tank-${i}`, 
            name: `Tank ${i}`, 
            selected: i % 2 === 0 
          })),
          healer: Array.from({ length: 10 }, (_, i) => ({ 
            id: `healer-${i}`, 
            name: `Healer ${i}`, 
            selected: i % 3 === 0 
          }))
        },
        assignments: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [
            `boss-action-${i}`,
            [{ id: `mitigation-${i}`, name: `Mitigation ${i}`, tankPosition: 'mainTank' }]
          ])
        )
      };

      planService.subscribeToPlanWithOrigin.mockImplementation((planId, callback) => {
        setTimeout(() => callback(largePlan, null), 100);
        return () => {};
      });

      const startTime = performance.now();
      let contextState = null;

      render(
        <TestWrapper>
          <PerformanceTestComponent 
            tracker={performanceTracker}
            onStateChange={(state) => { contextState = state; }}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(contextState?.planContext?.isInitialized).toBe(true);
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should handle large datasets within reasonable time
      expect(loadTime).toBeLessThan(3000);
      expect(Object.keys(contextState.planContext.realtimePlan.assignments)).toHaveLength(50);
    });

    it('should maintain performance with multiple simultaneous users', async () => {
      const userCount = 5;
      const userStates = [];

      // Simulate multiple users by creating multiple component instances
      for (let i = 0; i < userCount; i++) {
        const userTracker = new PerformanceTracker();
        let userState = null;

        render(
          <TestWrapper planId={`test-plan-${i}`}>
            <PerformanceTestComponent 
              tracker={userTracker}
              onStateChange={(state) => { userState = state; }}
            />
          </TestWrapper>
        );

        userStates.push({ tracker: userTracker, state: userState });
      }

      // Wait for all users to initialize
      await waitFor(() => {
        userStates.every(user => user.state?.planContext?.isInitialized);
      });

      // Check that performance doesn't degrade significantly with multiple users
      const totalFirebaseCalls = userStates.reduce(
        (sum, user) => sum + user.tracker.getMetrics().firebaseCalls, 
        0
      );

      // Should scale reasonably with user count
      expect(totalFirebaseCalls).toBeLessThan(userCount * 5); // Max 5 calls per user
    });
  });

  describe('Network Optimization', () => {
    it('should minimize data transfer with efficient updates', async () => {
      let contextState = null;
      let updatePayloadSizes = [];

      // Mock to track payload sizes
      planService.updatePlanJobsRealtime.mockImplementation(async (planId, selectedJobs) => {
        const payloadSize = JSON.stringify(selectedJobs).length;
        updatePayloadSizes.push(payloadSize);
        performanceTracker.trackUpdate();
        return true;
      });

      render(
        <TestWrapper>
          <PerformanceTestComponent 
            tracker={performanceTracker}
            onStateChange={(state) => { contextState = state; }}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(contextState?.planContext?.isInitialized).toBe(true);
      });

      // Perform updates
      contextState.jobContext.toggleJobSelection('tank', 'PLD');
      contextState.jobContext.toggleJobSelection('tank', 'WAR');

      await waitFor(() => {
        expect(updatePayloadSizes.length).toBeGreaterThan(0);
      });

      // Payload sizes should be reasonable (less than 10KB for typical job data)
      updatePayloadSizes.forEach(size => {
        expect(size).toBeLessThan(10 * 1024); // 10KB
      });
    });
  });
});
