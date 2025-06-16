/**
 * Plan Validation Service
 * 
 * Centralized validation service for plan data integrity checks
 * Used across the application for consistent validation
 */

class PlanValidationService {
  constructor() {
    this.validBossIds = ['ketuduke', 'lala', 'statice', 'sugar_riot', 'brute_abominator', 'm8s'];
    this.tankJobs = ['PLD', 'WAR', 'DRK', 'GNB'];
    this.maxPartySize = 8;
    this.maxTanks = 2;
  }

  /**
   * Quick validation for plan data before import
   */
  validateForImport(planData) {
    console.log(`%c[PLAN VALIDATION] Validating plan for import`, 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId: planData?.id,
      bossId: planData?.bossId
    });

    const issues = [];
    const warnings = [];

    if (!planData) {
      issues.push('Plan data is missing');
      return { isValid: false, canImport: false, issues, warnings };
    }

    if (!planData.id) {
      issues.push('Plan ID is required');
    }

    if (!planData.bossId) {
      issues.push('Boss ID is required');
    } else if (!this.validBossIds.includes(planData.bossId)) {
      warnings.push(`Unknown boss ID: ${planData.bossId}`);
    }

    // Check data structure
    if (planData.assignments && typeof planData.assignments !== 'object') {
      issues.push('Invalid assignments data structure');
    }

    if (planData.selectedJobs && typeof planData.selectedJobs !== 'object') {
      issues.push('Invalid selected jobs data structure');
    }

    if (planData.tankPositions && typeof planData.tankPositions !== 'object') {
      issues.push('Invalid tank positions data structure');
    }

    const canImport = issues.length === 0;

    if (issues.length > 0) {
      console.error(`%c[PLAN VALIDATION] Import validation failed`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', issues);
    }

    if (warnings.length > 0) {
      console.warn(`%c[PLAN VALIDATION] Import validation warnings`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 3px;', warnings);
    }

    return { isValid: canImport, canImport, issues, warnings };
  }

  /**
   * Validate plan data for collaboration readiness
   */
  validateForCollaboration(planData) {
    console.log(`%c[PLAN VALIDATION] Validating plan for collaboration`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 3px;', {
      planId: planData?.id,
      isShared: planData?.isShared,
      isPublic: planData?.isPublic
    });

    const importValidation = this.validateForImport(planData);
    if (!importValidation.isValid) {
      return {
        ...importValidation,
        canCollaborate: false,
        collaborationIssues: ['Basic validation failed']
      };
    }

    const collaborationIssues = [];
    const collaborationWarnings = [];

    // Check collaboration flags
    if (!planData.isShared && !planData.isPublic) {
      collaborationIssues.push('Plan must be marked as shared or public for collaboration');
    }

    // Check ownership information
    if (!planData.userId && !planData.user_id) {
      collaborationWarnings.push('Plan has no owner information');
    }

    // Check if plan has meaningful content for collaboration
    const hasAssignments = planData.assignments && Object.keys(planData.assignments).length > 0;
    const hasJobs = planData.selectedJobs && Object.values(planData.selectedJobs).some(selected => selected);

    if (!hasAssignments && !hasJobs) {
      collaborationWarnings.push('Plan has no assignments or selected jobs - limited collaboration value');
    }

    const canCollaborate = collaborationIssues.length === 0;

    if (collaborationIssues.length > 0) {
      console.error(`%c[PLAN VALIDATION] Collaboration validation failed`, 'background: #f44336; color: white; padding: 2px 5px; border-radius: 3px;', collaborationIssues);
    }

    return {
      ...importValidation,
      canCollaborate,
      collaborationIssues,
      collaborationWarnings
    };
  }

  /**
   * Validate assignments data structure
   */
  validateAssignments(assignments) {
    const issues = [];
    const warnings = [];
    let totalAssignments = 0;

    if (!assignments || typeof assignments !== 'object') {
      return { isValid: false, issues: ['Assignments must be an object'], warnings, totalAssignments };
    }

    for (const [bossActionId, actionAssignments] of Object.entries(assignments)) {
      if (!Array.isArray(actionAssignments)) {
        issues.push(`Assignments for ${bossActionId} must be an array`);
        continue;
      }

      totalAssignments += actionAssignments.length;

      // Check for duplicate assignments
      const assignmentIds = actionAssignments.map(a => a.id || a.abilityId).filter(Boolean);
      const uniqueIds = new Set(assignmentIds);
      
      if (assignmentIds.length !== uniqueIds.size) {
        warnings.push(`Duplicate assignments found for boss action ${bossActionId}`);
      }

      // Validate individual assignments
      actionAssignments.forEach((assignment, index) => {
        if (!assignment.id && !assignment.abilityId) {
          warnings.push(`Assignment ${index} for ${bossActionId} missing ID`);
        }
        if (!assignment.jobId) {
          warnings.push(`Assignment ${index} for ${bossActionId} missing job ID`);
        }
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      totalAssignments
    };
  }

  /**
   * Validate selected jobs
   */
  validateSelectedJobs(selectedJobs) {
    const issues = [];
    const warnings = [];

    if (!selectedJobs || typeof selectedJobs !== 'object') {
      return { isValid: false, issues: ['Selected jobs must be an object'], warnings };
    }

    const selectedJobsList = Object.entries(selectedJobs)
      .filter(([, selected]) => selected)
      .map(([job]) => job);

    if (selectedJobsList.length === 0) {
      warnings.push('No jobs selected');
    } else if (selectedJobsList.length > this.maxPartySize) {
      issues.push(`Too many jobs selected (${selectedJobsList.length}/${this.maxPartySize})`);
    }

    // Check tank job count
    const selectedTanks = selectedJobsList.filter(job => this.tankJobs.includes(job));
    if (selectedTanks.length > this.maxTanks) {
      warnings.push(`More than ${this.maxTanks} tank jobs selected`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      selectedCount: selectedJobsList.length,
      tankCount: selectedTanks.length,
      selectedJobs: selectedJobsList
    };
  }

  /**
   * Validate tank positions
   */
  validateTankPositions(tankPositions, selectedJobs = {}) {
    const issues = [];
    const warnings = [];

    if (!tankPositions || typeof tankPositions !== 'object') {
      return { isValid: false, issues: ['Tank positions must be an object'], warnings };
    }

    const positionCount = Object.keys(tankPositions).length;
    const selectedTanks = Object.entries(selectedJobs)
      .filter(([job, selected]) => selected && this.tankJobs.includes(job))
      .map(([job]) => job);

    if (positionCount > 0 && selectedTanks.length === 0) {
      issues.push('Tank positions defined but no tank jobs selected');
    }

    if (positionCount > selectedTanks.length) {
      warnings.push('More tank positions than selected tank jobs');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      positionCount,
      availableTanks: selectedTanks.length
    };
  }

  /**
   * Generate a comprehensive validation report
   */
  generateValidationReport(planData, context = 'general') {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      context,
      planId: planData?.id,
      bossId: planData?.bossId,
      overall: { isValid: true, canProceed: true },
      sections: {}
    };

    // Basic validation
    const basicValidation = this.validateForImport(planData);
    report.sections.basic = basicValidation;

    if (!basicValidation.isValid) {
      report.overall.isValid = false;
      report.overall.canProceed = false;
      return report;
    }

    // For import context, be more lenient with validation
    // Only validate structure, not content quality
    if (context === 'import') {
      // For imports, we only care about basic structure validation
      // The data will be processed and validated during reconstruction
      report.overall.isValid = true;
      report.overall.canProceed = true;

      console.log(`%c[PLAN VALIDATION] Import validation passed (lenient mode)`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        context,
        planId: report.planId,
        isValid: report.overall.isValid,
        sectionsChecked: Object.keys(report.sections).length
      });

      return report;
    }

    // For non-import contexts, perform full validation
    // Assignments validation
    if (planData.assignments) {
      report.sections.assignments = this.validateAssignments(planData.assignments);
    }

    // Jobs validation
    if (planData.selectedJobs) {
      report.sections.selectedJobs = this.validateSelectedJobs(planData.selectedJobs);
    }

    // Tank positions validation
    if (planData.tankPositions) {
      report.sections.tankPositions = this.validateTankPositions(planData.tankPositions, planData.selectedJobs);
    }

    // Collaboration validation if needed
    if (context === 'collaboration') {
      report.sections.collaboration = this.validateForCollaboration(planData);
    }

    // Determine overall status
    const hasErrors = Object.values(report.sections).some(section =>
      section.issues && section.issues.length > 0
    );

    report.overall.isValid = !hasErrors;
    report.overall.canProceed = !hasErrors;

    console.log(`%c[PLAN VALIDATION] Validation report generated`, 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
      context,
      planId: report.planId,
      isValid: report.overall.isValid,
      sectionsChecked: Object.keys(report.sections).length
    });

    return report;
  }
}

export default new PlanValidationService();
