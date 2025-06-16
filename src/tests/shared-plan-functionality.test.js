/**
 * Comprehensive tests for shared plan functionality
 * 
 * Tests the complete flow of plan sharing and collaboration features
 * including data loading, validation, collaboration, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Import services and components to test
import PlanStorageService from '../services/PlanStorageService';
import PlanValidationService from '../services/PlanValidationService';
import ErrorHandlingService from '../services/ErrorHandlingService';
import RealtimeCollaborationService from '../services/RealtimeCollaborationService';

// Mock Firebase
vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn()
  },
  firestore: {},
  realtimeDb: {}
}));

// Mock services
vi.mock('../services/FirestoreService', () => ({
  default: {
    getPlan: vi.fn()
  }
}));

describe('Shared Plan Functionality', () => {
  let mockPlanData;
  let mockSharedPlanData;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock plan data
    mockPlanData = {
      id: 'test-plan-123',
      name: 'Test Mitigation Plan',
      description: 'A test plan for validation',
      bossId: 'ketuduke',
      assignments: {
        'boss-action-1': [
          { id: 'mitigation-1', jobId: 'PLD', abilityId: 'rampart' }
        ]
      },
      selectedJobs: {
        'PLD': true,
        'WHM': true,
        'DRG': true,
        'BLM': true
      },
      tankPositions: {
        mainTank: 'PLD',
        offTank: null
      },
      isPublic: false,
      isShared: false,
      userId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockSharedPlanData = {
      ...mockPlanData,
      isShared: true,
      isPublic: true
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Plan Data Validation', () => {
    it('should validate plan data structure correctly', () => {
      const validation = PlanValidationService.validateForImport(mockPlanData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.canImport).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidPlan = { ...mockPlanData };
      delete invalidPlan.id;
      delete invalidPlan.bossId;

      const validation = PlanValidationService.validateForImport(invalidPlan);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Plan ID is required');
      expect(validation.issues).toContain('Boss ID is required');
    });

    it('should validate collaboration readiness', () => {
      const validation = PlanValidationService.validateForCollaboration(mockSharedPlanData);
      
      expect(validation.canCollaborate).toBe(true);
      expect(validation.collaborationIssues).toHaveLength(0);
    });

    it('should detect plans not suitable for collaboration', () => {
      const nonSharedPlan = { ...mockPlanData, isShared: false, isPublic: false };
      const validation = PlanValidationService.validateForCollaboration(nonSharedPlan);
      
      expect(validation.canCollaborate).toBe(false);
      expect(validation.collaborationIssues).toContain('Plan must be marked as shared or public for collaboration');
    });
  });

  describe('Plan Storage Service', () => {
    it('should normalize plan data from database correctly', () => {
      const dbPlan = {
        id: 'test-plan-123',
        name: 'Test Plan',
        bossId: 'ketuduke',
        assignments: {},
        selectedJobs: {},
        tankPositions: {},
        isPublic: true,
        isShared: true,
        userId: 'user-123',
        createdAt: { toISOString: () => '2024-01-01T00:00:00.000Z' },
        updatedAt: { toISOString: () => '2024-01-01T00:00:00.000Z' }
      };

      const normalized = PlanStorageService.normalizePlanFromDatabase(dbPlan);
      
      expect(normalized.id).toBe('test-plan-123');
      expect(normalized.isShared).toBe(true);
      expect(normalized.isPublic).toBe(true);
      expect(normalized.source).toBe('database');
    });

    it('should validate normalized plan data', () => {
      const dbPlan = {
        id: 'test-plan-123',
        name: 'Test Plan',
        bossId: 'ketuduke',
        assignments: {},
        selectedJobs: {},
        tankPositions: {},
        isPublic: true,
        isShared: true,
        createdAt: { toISOString: () => '2024-01-01T00:00:00.000Z' },
        updatedAt: { toISOString: () => '2024-01-01T00:00:00.000Z' }
      };

      // Mock console methods to capture validation logs
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const normalized = PlanStorageService.normalizePlanFromDatabase(dbPlan);
      
      expect(normalized).toBeDefined();
      expect(normalized.isShared).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling Service', () => {
    it('should handle plan loading errors with user-friendly messages', () => {
      const error = new Error('Plan not found');
      const planId = 'test-plan-123';
      
      const mockCallback = vi.fn();
      ErrorHandlingService.onError(mockCallback);
      
      const result = ErrorHandlingService.handlePlanLoadError(error, planId, 'test');
      
      expect(result.title).toBe('Plan Not Found');
      expect(result.type).toBe('error');
      expect(result.actions).toContainEqual({ label: 'Go to Home', action: 'navigate_home' });
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle collaboration errors gracefully', () => {
      const error = new Error('Connection failed');
      const planId = 'test-plan-123';
      
      const mockCallback = vi.fn();
      ErrorHandlingService.onWarning(mockCallback);
      
      const result = ErrorHandlingService.handleCollaborationError(error, planId, 'test');
      
      expect(result.type).toBe('warning');
      expect(result.message).toContain('collaboration is temporarily unavailable');
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should handle validation errors with helpful guidance', () => {
      const validationResult = {
        errors: ['Plan ID is missing', 'Boss ID is missing'],
        warnings: ['No jobs selected']
      };
      
      const mockCallback = vi.fn();
      ErrorHandlingService.onError(mockCallback);
      
      const result = ErrorHandlingService.handleValidationError(validationResult, 'test');
      
      expect(result.title).toBe('Plan Data Issues');
      expect(result.message).toContain('2 issue(s)');
      expect(mockCallback).toHaveBeenCalled();
    });

    it('should provide success messages for completed operations', () => {
      const mockCallback = vi.fn();
      ErrorHandlingService.onInfo(mockCallback);
      
      const result = ErrorHandlingService.handleSuccess('plan_loaded', {
        planName: 'Test Plan',
        assignmentCount: 5
      });
      
      expect(result.title).toBe('Plan Loaded Successfully');
      expect(result.message).toContain('Test Plan');
      expect(result.message).toContain('5 mitigation assignments');
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('Plan Data Integrity', () => {
    it('should validate assignment structure', () => {
      const assignments = {
        'boss-action-1': [
          { id: 'mitigation-1', jobId: 'PLD', abilityId: 'rampart' },
          { id: 'mitigation-2', jobId: 'WHM', abilityId: 'divine-benison' }
        ],
        'boss-action-2': [
          { id: 'mitigation-3', jobId: 'DRG', abilityId: 'feint' }
        ]
      };

      const validation = PlanValidationService.validateAssignments(assignments);
      
      expect(validation.isValid).toBe(true);
      expect(validation.totalAssignments).toBe(3);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect duplicate assignments', () => {
      const assignments = {
        'boss-action-1': [
          { id: 'mitigation-1', jobId: 'PLD', abilityId: 'rampart' },
          { id: 'mitigation-1', jobId: 'PLD', abilityId: 'rampart' } // Duplicate
        ]
      };

      const validation = PlanValidationService.validateAssignments(assignments);
      
      expect(validation.isValid).toBe(true); // Structure is valid
      expect(validation.warnings).toContain('Duplicate assignments found for boss action boss-action-1');
    });

    it('should validate selected jobs', () => {
      const selectedJobs = {
        'PLD': true,
        'WHM': true,
        'DRG': true,
        'BLM': true
      };

      const validation = PlanValidationService.validateSelectedJobs(selectedJobs);
      
      expect(validation.isValid).toBe(true);
      expect(validation.selectedCount).toBe(4);
      expect(validation.tankCount).toBe(1);
    });

    it('should detect too many selected jobs', () => {
      const selectedJobs = {
        'PLD': true, 'WAR': true, 'DRK': true, 'GNB': true,
        'WHM': true, 'SCH': true, 'AST': true, 'SGE': true,
        'DRG': true // 9 jobs - exceeds party limit
      };

      const validation = PlanValidationService.validateSelectedJobs(selectedJobs);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Too many jobs selected (9/8)');
    });

    it('should validate tank positions', () => {
      const tankPositions = {
        mainTank: 'PLD',
        offTank: 'WAR'
      };
      const selectedJobs = {
        'PLD': true,
        'WAR': true,
        'WHM': true,
        'DRG': true
      };

      const validation = PlanValidationService.validateTankPositions(tankPositions, selectedJobs);
      
      expect(validation.isValid).toBe(true);
      expect(validation.positionCount).toBe(2);
      expect(validation.availableTanks).toBe(2);
    });
  });

  describe('Comprehensive Validation Report', () => {
    it('should generate complete validation report', () => {
      const report = PlanValidationService.generateValidationReport(mockSharedPlanData, 'collaboration');

      expect(report.overall.isValid).toBe(true);
      expect(report.overall.canProceed).toBe(true);
      expect(report.planId).toBe('test-plan-123');
      expect(report.context).toBe('collaboration');
      expect(report.sections.basic).toBeDefined();
      expect(report.sections.assignments).toBeDefined();
      expect(report.sections.selectedJobs).toBeDefined();
      expect(report.sections.tankPositions).toBeDefined();
      expect(report.sections.collaboration).toBeDefined();
    });

    it('should detect overall validation failures', () => {
      const invalidPlan = { ...mockSharedPlanData };
      delete invalidPlan.id; // Make it invalid

      const report = PlanValidationService.generateValidationReport(invalidPlan, 'collaboration');

      expect(report.overall.isValid).toBe(false);
      expect(report.overall.canProceed).toBe(false);
      expect(report.sections.basic.issues).toContain('Plan ID is required');
    });
  });

  describe('Integration with Fixed Components', () => {
    it('should validate the complete data flow', () => {
      // Test the complete flow: Database -> Normalization -> Validation -> Collaboration
      const dbPlan = {
        id: 'integration-test-plan',
        name: 'Integration Test Plan',
        bossId: 'ketuduke',
        assignments: { 'boss-action-1': [{ id: 'mitigation-1', jobId: 'PLD' }] },
        selectedJobs: { 'PLD': true, 'WHM': true },
        tankPositions: { mainTank: 'PLD' },
        isPublic: true,
        isShared: true,
        userId: 'user-123',
        createdAt: { toISOString: () => '2024-01-01T00:00:00.000Z' },
        updatedAt: { toISOString: () => '2024-01-01T00:00:00.000Z' }
      };

      // Step 1: Normalize from database
      const normalized = PlanStorageService.normalizePlanFromDatabase(dbPlan);
      expect(normalized.isShared).toBe(true);
      expect(normalized.source).toBe('database');

      // Step 2: Validate for import
      const importValidation = PlanValidationService.validateForImport(normalized);
      expect(importValidation.isValid).toBe(true);

      // Step 3: Validate for collaboration
      const collaborationValidation = PlanValidationService.validateForCollaboration(normalized);
      expect(collaborationValidation.canCollaborate).toBe(true);

      // Step 4: Generate comprehensive report
      const report = PlanValidationService.generateValidationReport(normalized, 'collaboration');
      expect(report.overall.canProceed).toBe(true);
    });

    it('should handle error scenarios gracefully', () => {
      // Test error handling for various failure scenarios
      const scenarios = [
        { error: new Error('Plan not found'), expectedTitle: 'Plan Not Found' },
        { error: new Error('Access denied'), expectedTitle: 'Access Denied' },
        { error: new Error('Network error'), expectedTitle: 'Connection Error' }
      ];

      scenarios.forEach(scenario => {
        const result = ErrorHandlingService.handlePlanLoadError(scenario.error, 'test-plan', 'test');
        expect(result.title).toBe(scenario.expectedTitle);
        expect(result.type).toBe('error');
        expect(result.actions.length).toBeGreaterThan(0);
      });
    });
  });
});
