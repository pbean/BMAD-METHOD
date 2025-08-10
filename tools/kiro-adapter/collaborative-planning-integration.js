/**
 * Collaborative Planning Integration
 * 
 * This module integrates all collaborative planning components to provide
 * a unified interface for BMad collaborative planning in Kiro IDE.
 */

const CollaborativePlanningManager = require('./collaborative-planning');
const KiroNotificationIntegration = require('./kiro-notification-integration');
const CollaborativeConflictResolution = require('./collaborative-conflict-resolution');

class CollaborativePlanningIntegration {
  constructor(workspacePath = '.') {
    this.workspacePath = workspacePath;
    this.planningManager = new CollaborativePlanningManager(workspacePath);
    this.notificationIntegration = new KiroNotificationIntegration(workspacePath);
    this.conflictResolution = new CollaborativeConflictResolution(workspacePath);
  }

  /**
   * Initialize complete collaborative planning system
   */
  async initializeCollaborativePlanning() {
    console.log('Initializing collaborative planning system...');
    
    // Initialize all components
    const collaborationConfig = await this.planningManager.initializeCollaborativeInfrastructure();
    const { notificationConfig, statusConfig } = await this.notificationIntegration.initializeNotificationIntegration();
    const conflictConfig = await this.conflictResolution.initializeConflictResolution();
    
    console.log('✓ Collaborative planning infrastructure initialized');
    console.log('✓ Notification and status integration initialized');
    console.log('✓ Conflict resolution system initialized');
    
    return {
      collaboration: collaborationConfig,
      notifications: notificationConfig,
      status: statusConfig,
      conflicts: conflictConfig
    };
  }

  /**
   * Create a new collaborative planning workflow
   */
  async createCollaborativeWorkflow(specName, teamMembers = []) {
    console.log(`Creating collaborative workflow for spec: ${specName}`);
    
    // Create team planning workflow
    const planningMetadata = await this.planningManager.createTeamPlanningWorkflow(specName, teamMembers);
    
    // Adapt agents for collaboration
    const collaborativeAgents = await this.planningManager.adaptPlanningAgentsForCollaboration(specName);
    
    // Set up progress tracking
    const progressTracker = await this.notificationIntegration.createProgressTracking(specName, teamMembers);
    
    console.log(`✓ Collaborative workflow created for ${specName}`);
    
    return {
      planning: planningMetadata,
      agents: collaborativeAgents,
      progress: progressTracker
    };
  }

  /**
   * Start a collaborative planning phase
   */
  async startPlanningPhase(specName, phase, assignedTo = null) {
    console.log(`Starting ${phase} phase for spec: ${specName}`);
    
    // Create shared document workflow
    const { collaboration, documentLock } = await this.planningManager.createSharedDocumentWorkflow(specName, phase, assignedTo);
    
    // Update progress tracking
    await this.notificationIntegration.updateProgressTracking(specName, 'phase-started', {
      phase,
      assignedTo
    });
    
    // Send team status update
    await this.notificationIntegration.sendTeamStatusUpdate(specName, 'member-assigned', {
      memberName: assignedTo,
      documentType: phase,
      teamMembers: collaboration.teamMembers
    });
    
    console.log(`✓ ${phase} phase started for ${specName}`);
    
    return { collaboration, documentLock };
  }

  /**
   * Submit a review for a planning document
   */
  async submitReview(specName, documentType, reviewerName, reviewComments) {
    console.log(`Submitting review for ${documentType} in spec: ${specName}`);
    
    // Add team review
    const review = await this.planningManager.addTeamReviewMechanism(specName, documentType, reviewerName, reviewComments);
    
    // Send team status update
    await this.notificationIntegration.sendTeamStatusUpdate(specName, 'review-requested', {
      memberName: reviewerName,
      documentType,
      reviewComments: reviewComments.length
    });
    
    // Check for conflicts after review
    const { hasConflicts, conflicts } = await this.conflictResolution.detectDocumentConflicts(specName, documentType);
    
    if (hasConflicts) {
      console.log(`⚠️ Conflicts detected in ${documentType} for ${specName}`);
      await this.notificationIntegration.sendTeamStatusUpdate(specName, 'conflict-detected', {
        documentType,
        conflicts: conflicts.length
      });
    }
    
    console.log(`✓ Review submitted for ${documentType} in ${specName}`);
    
    return { review, hasConflicts, conflicts };
  }

  /**
   * Process approval for a planning document
   */
  async processApproval(specName, documentType, approverName, approved = true, comments = '') {
    console.log(`Processing approval for ${documentType} in spec: ${specName}`);
    
    // Process team approval
    const approval = await this.planningManager.processTeamApproval(specName, documentType, approverName, approved, comments);
    
    // Update progress tracking
    if (approved) {
      await this.notificationIntegration.updateProgressTracking(specName, 'phase-completed', {
        phase: documentType
      });
      
      // Send planning phase completion notification
      await this.notificationIntegration.sendPlanningPhaseNotification(specName, documentType, {
        completedBy: approverName,
        approvalCount: 1
      });
    }
    
    // Send team status update
    await this.notificationIntegration.sendTeamStatusUpdate(specName, approved ? 'approval-granted' : 'approval-rejected', {
      memberName: approverName,
      documentType,
      comments
    });
    
    console.log(`✓ Approval ${approved ? 'granted' : 'rejected'} for ${documentType} in ${specName}`);
    
    return approval;
  }

  /**
   * Handle conflict resolution
   */
  async resolveConflict(conflictId, resolutionStrategy, resolvedBy, resolutionData = {}) {
    console.log(`Resolving conflict: ${conflictId} using ${resolutionStrategy}`);
    
    // Resolve the conflict
    const resolvedConflict = await this.conflictResolution.resolveConflict(conflictId, resolutionStrategy, resolvedBy, resolutionData);
    
    // Send resolution notification
    await this.notificationIntegration.sendTeamStatusUpdate(resolvedConflict.specName, 'conflict-resolved', {
      conflictId,
      resolutionStrategy,
      resolvedBy,
      success: resolvedConflict.status === 'resolved'
    });
    
    console.log(`✓ Conflict ${conflictId} ${resolvedConflict.status === 'resolved' ? 'resolved' : 'resolution failed'}`);
    
    return resolvedConflict;
  }

  /**
   * Get collaborative planning status
   */
  async getPlanningStatus(specName) {
    // Get active conflicts
    const activeConflicts = await this.conflictResolution.getActiveConflicts(specName);
    
    // Get progress tracking (if exists)
    const statusPath = require('path').join(this.workspacePath, '.kiro', 'status', `${specName}-progress.yaml`);
    let progressData = null;
    
    if (require('fs-extra').pathExistsSync(statusPath)) {
      progressData = require('js-yaml').load(require('fs-extra').readFileSync(statusPath, 'utf8'));
    }
    
    // Get collaboration metadata (if exists)
    const collaborationPath = require('path').join(this.workspacePath, '.kiro', 'specs', specName, 'collaboration.yaml');
    let collaborationData = null;
    
    if (require('fs-extra').pathExistsSync(collaborationPath)) {
      collaborationData = require('js-yaml').load(require('fs-extra').readFileSync(collaborationPath, 'utf8'));
    }
    
    return {
      specName,
      hasActiveConflicts: activeConflicts.length > 0,
      activeConflicts: activeConflicts.length,
      progress: progressData ? progressData.overallProgress : 0,
      currentPhase: collaborationData ? collaborationData.workflow.currentPhase : 'unknown',
      teamMembers: collaborationData ? collaborationData.teamMembers.length : 0,
      lastUpdated: progressData ? progressData.lastUpdated : null
    };
  }

  /**
   * Get all collaborative specs
   */
  async getAllCollaborativeSpecs() {
    const specsPath = require('path').join(this.workspacePath, '.kiro', 'specs');
    
    if (!require('fs-extra').pathExistsSync(specsPath)) {
      return [];
    }
    
    const specDirs = require('fs-extra').readdirSync(specsPath);
    const collaborativeSpecs = [];
    
    for (const specDir of specDirs) {
      const collaborationFile = require('path').join(specsPath, specDir, 'collaboration.yaml');
      
      if (require('fs-extra').pathExistsSync(collaborationFile)) {
        const status = await this.getPlanningStatus(specDir);
        collaborativeSpecs.push(status);
      }
    }
    
    return collaborativeSpecs;
  }

  /**
   * Monitor collaborative planning activity
   */
  async startMonitoring(intervalMs = 30000) {
    console.log('Starting collaborative planning monitoring...');
    
    const monitoringInterval = setInterval(async () => {
      try {
        const collaborativeSpecs = await this.getAllCollaborativeSpecs();
        
        for (const spec of collaborativeSpecs) {
          // Check for new conflicts
          const { hasConflicts } = await this.conflictResolution.detectDocumentConflicts(spec.specName, 'requirements');
          
          if (hasConflicts && !spec.hasActiveConflicts) {
            console.log(`🚨 New conflicts detected in ${spec.specName}`);
          }
          
          // Log progress updates
          if (spec.progress > 0) {
            console.log(`📊 ${spec.specName}: ${Math.round(spec.progress)}% complete (${spec.currentPhase} phase)`);
          }
        }
      } catch (error) {
        console.error('Monitoring error:', error.message);
      }
    }, intervalMs);
    
    return {
      stop: () => clearInterval(monitoringInterval),
      interval: monitoringInterval
    };
  }
}

module.exports = CollaborativePlanningIntegration;