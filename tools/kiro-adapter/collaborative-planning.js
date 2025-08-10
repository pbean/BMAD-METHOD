/**
 * Collaborative Planning Workflow Manager for Kiro IDE Integration
 * 
 * This module implements team-based planning workflows that adapt BMad planning agents
 * for Kiro's collaborative workspace, including shared document creation, team reviews,
 * and conflict resolution.
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

class CollaborativePlanningManager {
  constructor(workspacePath = '.') {
    this.workspacePath = workspacePath;
    this.kiroPath = path.join(workspacePath, '.kiro');
    this.specsPath = path.join(this.kiroPath, 'specs');
    this.collaborationPath = path.join(this.kiroPath, 'collaboration');
    this.notificationsPath = path.join(this.kiroPath, 'notifications');
  }

  /**
   * Initialize collaborative planning infrastructure
   */
  async initializeCollaborativeInfrastructure() {
    // Create collaboration directories
    await fs.ensureDir(this.collaborationPath);
    await fs.ensureDir(path.join(this.collaborationPath, 'reviews'));
    await fs.ensureDir(path.join(this.collaborationPath, 'approvals'));
    await fs.ensureDir(path.join(this.collaborationPath, 'conflicts'));
    await fs.ensureDir(this.notificationsPath);

    // Create collaboration configuration
    const collaborationConfig = {
      version: '1.0.0',
      teamMembers: [],
      reviewWorkflows: {
        requirements: {
          reviewers: [],
          approvalThreshold: 1,
          autoNotify: true
        },
        design: {
          reviewers: [],
          approvalThreshold: 1,
          autoNotify: true
        },
        tasks: {
          reviewers: [],
          approvalThreshold: 1,
          autoNotify: true
        }
      },
      notifications: {
        enabled: true,
        channels: ['kiro-status', 'file-comments'],
        events: ['planning-phase-complete', 'review-requested', 'approval-granted', 'conflict-detected']
      },
      conflictResolution: {
        strategy: 'merge-with-review',
        autoResolve: false,
        backupOnConflict: true
      }
    };

    await fs.writeFile(
      path.join(this.collaborationPath, 'config.yaml'),
      yaml.dump(collaborationConfig),
      'utf8'
    );

    return collaborationConfig;
  }

  /**
   * Create team-based planning workflow for a spec
   */
  async createTeamPlanningWorkflow(specName, teamMembers = []) {
    const specPath = path.join(this.specsPath, specName);
    await fs.ensureDir(specPath);

    // Create collaborative planning metadata
    const planningMetadata = {
      specName,
      teamMembers,
      phases: {
        requirements: {
          status: 'not_started',
          assignedTo: null,
          reviewers: teamMembers.filter(member => member.role === 'reviewer'),
          approvers: teamMembers.filter(member => member.role === 'approver'),
          createdAt: null,
          lastModified: null,
          conflicts: []
        },
        design: {
          status: 'not_started',
          assignedTo: null,
          reviewers: teamMembers.filter(member => member.role === 'reviewer'),
          approvers: teamMembers.filter(member => member.role === 'approver'),
          createdAt: null,
          lastModified: null,
          conflicts: []
        },
        tasks: {
          status: 'not_started',
          assignedTo: null,
          reviewers: teamMembers.filter(member => member.role === 'reviewer'),
          approvers: teamMembers.filter(member => member.role === 'approver'),
          createdAt: null,
          lastModified: null,
          conflicts: []
        }
      },
      workflow: {
        currentPhase: 'requirements',
        autoProgress: true,
        requireApproval: true
      }
    };

    await fs.writeFile(
      path.join(specPath, 'collaboration.yaml'),
      yaml.dump(planningMetadata),
      'utf8'
    );

    return planningMetadata;
  }

  /**
   * Adapt BMad planning agents for collaborative workspace
   */
  async adaptPlanningAgentsForCollaboration(specName) {
    const specPath = path.join(this.specsPath, specName);
    const collaborationFile = path.join(specPath, 'collaboration.yaml');
    
    if (!await fs.pathExists(collaborationFile)) {
      throw new Error(`Collaboration metadata not found for spec: ${specName}`);
    }

    const collaboration = yaml.load(await fs.readFile(collaborationFile, 'utf8'));

    // Create collaborative agent configurations
    const collaborativeAgents = {
      'bmad-pm-collaborative': {
        name: 'BMad PM (Collaborative)',
        baseAgent: 'bmad-pm',
        collaborationFeatures: {
          sharedDocuments: true,
          teamNotifications: true,
          reviewIntegration: true,
          conflictDetection: true
        },
        contextProviders: ['#File', '#Folder', '#Codebase', '#Collaboration'],
        workflow: {
          phase: 'requirements',
          teamMembers: collaboration.teamMembers,
          reviewProcess: collaboration.phases.requirements
        }
      },
      'bmad-architect-collaborative': {
        name: 'BMad Architect (Collaborative)',
        baseAgent: 'bmad-architect',
        collaborationFeatures: {
          sharedDocuments: true,
          teamNotifications: true,
          reviewIntegration: true,
          conflictDetection: true
        },
        contextProviders: ['#File', '#Folder', '#Codebase', '#Collaboration'],
        workflow: {
          phase: 'design',
          teamMembers: collaboration.teamMembers,
          reviewProcess: collaboration.phases.design
        }
      },
      'bmad-sm-collaborative': {
        name: 'BMad Scrum Master (Collaborative)',
        baseAgent: 'bmad-sm',
        collaborationFeatures: {
          sharedDocuments: true,
          teamNotifications: true,
          reviewIntegration: true,
          conflictDetection: true
        },
        contextProviders: ['#File', '#Folder', '#Codebase', '#Collaboration'],
        workflow: {
          phase: 'tasks',
          teamMembers: collaboration.teamMembers,
          reviewProcess: collaboration.phases.tasks
        }
      }
    };

    // Save collaborative agent configurations
    await fs.writeFile(
      path.join(specPath, 'collaborative-agents.yaml'),
      yaml.dump(collaborativeAgents),
      'utf8'
    );

    return collaborativeAgents;
  }

  /**
   * Implement shared document creation and editing workflows
   */
  async createSharedDocumentWorkflow(specName, documentType, assignedTo = null) {
    const specPath = path.join(this.specsPath, specName);
    const collaborationFile = path.join(specPath, 'collaboration.yaml');
    
    const collaboration = yaml.load(await fs.readFile(collaborationFile, 'utf8'));
    
    // Update phase status
    collaboration.phases[documentType].status = 'in_progress';
    collaboration.phases[documentType].assignedTo = assignedTo;
    collaboration.phases[documentType].createdAt = new Date().toISOString();
    collaboration.phases[documentType].lastModified = new Date().toISOString();

    // Create document lock for collaborative editing
    const documentLock = {
      documentType,
      lockedBy: assignedTo,
      lockedAt: new Date().toISOString(),
      collaborators: collaboration.teamMembers.map(member => ({
        name: member.name,
        role: member.role,
        canEdit: member.role === 'editor' || member.name === assignedTo,
        canReview: member.role === 'reviewer' || member.role === 'approver',
        canApprove: member.role === 'approver'
      }))
    };

    await fs.writeFile(
      path.join(specPath, `${documentType}-lock.yaml`),
      yaml.dump(documentLock),
      'utf8'
    );

    // Update collaboration metadata
    await fs.writeFile(
      collaborationFile,
      yaml.dump(collaboration),
      'utf8'
    );

    // Create shared document template with collaboration markers
    const sharedDocumentTemplate = this.createCollaborativeDocumentTemplate(documentType, collaboration);
    
    await fs.writeFile(
      path.join(specPath, `${documentType}.md`),
      sharedDocumentTemplate,
      'utf8'
    );

    return { collaboration, documentLock };
  }

  /**
   * Create collaborative document template with team review markers
   */
  createCollaborativeDocumentTemplate(documentType, collaboration) {
    const timestamp = new Date().toISOString();
    const reviewers = collaboration.phases[documentType].reviewers.map(r => r.name).join(', ');
    const approvers = collaboration.phases[documentType].approvers.map(a => a.name).join(', ');

    let template = '';

    switch (documentType) {
      case 'requirements':
        template = `# Requirements Document

<!-- COLLABORATION METADATA -->
<!-- Created: ${timestamp} -->
<!-- Assigned: ${collaboration.phases[documentType].assignedTo || 'Unassigned'} -->
<!-- Reviewers: ${reviewers} -->
<!-- Approvers: ${approvers} -->
<!-- Status: ${collaboration.phases[documentType].status} -->

## Introduction

[Feature overview - collaborative editing enabled]

<!-- REVIEW SECTION -->
## Team Review Status

- [ ] Requirements clarity review
- [ ] Technical feasibility review  
- [ ] Business value review
- [ ] Acceptance criteria review

## Requirements

### Requirement 1

**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria

1. WHEN [event] THEN [system] SHALL [response]

<!-- COLLABORATION NOTES -->
## Collaboration Notes

### Review Comments
<!-- Team members can add review comments here -->

### Approval Status
<!-- Approvers sign off here -->

`;
        break;

      case 'design':
        template = `# Design Document

<!-- COLLABORATION METADATA -->
<!-- Created: ${timestamp} -->
<!-- Assigned: ${collaboration.phases[documentType].assignedTo || 'Unassigned'} -->
<!-- Reviewers: ${reviewers} -->
<!-- Approvers: ${approvers} -->
<!-- Status: ${collaboration.phases[documentType].status} -->

## Overview

[Design overview - collaborative editing enabled]

<!-- REVIEW SECTION -->
## Team Review Status

- [ ] Architecture review
- [ ] Technical approach review
- [ ] Implementation feasibility review
- [ ] Performance considerations review

## Architecture

[Architecture details]

<!-- COLLABORATION NOTES -->
## Collaboration Notes

### Review Comments
<!-- Team members can add review comments here -->

### Approval Status
<!-- Approvers sign off here -->

`;
        break;

      case 'tasks':
        template = `# Implementation Plan

<!-- COLLABORATION METADATA -->
<!-- Created: ${timestamp} -->
<!-- Assigned: ${collaboration.phases[documentType].assignedTo || 'Unassigned'} -->
<!-- Reviewers: ${reviewers} -->
<!-- Approvers: ${approvers} -->
<!-- Status: ${collaboration.phases[documentType].status} -->

<!-- REVIEW SECTION -->
## Team Review Status

- [ ] Task breakdown review
- [ ] Implementation order review
- [ ] Resource allocation review
- [ ] Timeline feasibility review

## Tasks

- [ ] 1. First implementation task
  - Task details and requirements
  - _Requirements: [requirement references]_

<!-- COLLABORATION NOTES -->
## Collaboration Notes

### Review Comments
<!-- Team members can add review comments here -->

### Approval Status
<!-- Approvers sign off here -->

`;
        break;
    }

    return template;
  }

  /**
   * Add team review and approval mechanisms
   */
  async addTeamReviewMechanism(specName, documentType, reviewerName, reviewComments) {
    const specPath = path.join(this.specsPath, specName);
    const reviewsPath = path.join(this.collaborationPath, 'reviews');
    
    // Create review record
    const review = {
      specName,
      documentType,
      reviewer: reviewerName,
      timestamp: new Date().toISOString(),
      comments: reviewComments,
      status: 'submitted',
      recommendations: []
    };

    const reviewFile = path.join(reviewsPath, `${specName}-${documentType}-${reviewerName}-${Date.now()}.yaml`);
    await fs.writeFile(reviewFile, yaml.dump(review), 'utf8');

    // Update collaboration metadata
    const collaborationFile = path.join(specPath, 'collaboration.yaml');
    const collaboration = yaml.load(await fs.readFile(collaborationFile, 'utf8'));
    
    if (!collaboration.phases[documentType].reviews) {
      collaboration.phases[documentType].reviews = [];
    }
    
    collaboration.phases[documentType].reviews.push({
      reviewer: reviewerName,
      timestamp: review.timestamp,
      status: 'submitted',
      reviewFile: reviewFile
    });

    await fs.writeFile(collaborationFile, yaml.dump(collaboration), 'utf8');

    return review;
  }

  /**
   * Process team approval for planning documents
   */
  async processTeamApproval(specName, documentType, approverName, approved = true, comments = '') {
    const specPath = path.join(this.specsPath, specName);
    const approvalsPath = path.join(this.collaborationPath, 'approvals');
    
    // Create approval record
    const approval = {
      specName,
      documentType,
      approver: approverName,
      timestamp: new Date().toISOString(),
      approved,
      comments,
      status: approved ? 'approved' : 'rejected'
    };

    const approvalFile = path.join(approvalsPath, `${specName}-${documentType}-${approverName}-${Date.now()}.yaml`);
    await fs.writeFile(approvalFile, yaml.dump(approval), 'utf8');

    // Update collaboration metadata
    const collaborationFile = path.join(specPath, 'collaboration.yaml');
    const collaboration = yaml.load(await fs.readFile(collaborationFile, 'utf8'));
    
    if (!collaboration.phases[documentType].approvals) {
      collaboration.phases[documentType].approvals = [];
    }
    
    collaboration.phases[documentType].approvals.push({
      approver: approverName,
      timestamp: approval.timestamp,
      status: approval.status,
      approvalFile: approvalFile
    });

    // Check if approval threshold is met
    const approvedCount = collaboration.phases[documentType].approvals.filter(a => a.status === 'approved').length;
    const requiredApprovals = collaboration.phases[documentType].approvers.length;
    
    if (approvedCount >= requiredApprovals) {
      collaboration.phases[documentType].status = 'approved';
      collaboration.phases[documentType].approvedAt = new Date().toISOString();
      
      // Trigger next phase if auto-progress is enabled
      if (collaboration.workflow.autoProgress) {
        await this.progressToNextPhase(specName, documentType);
      }
    }

    await fs.writeFile(collaborationFile, yaml.dump(collaboration), 'utf8');

    return approval;
  }

  /**
   * Progress to next planning phase
   */
  async progressToNextPhase(specName, currentPhase) {
    const specPath = path.join(this.specsPath, specName);
    const collaborationFile = path.join(specPath, 'collaboration.yaml');
    const collaboration = yaml.load(await fs.readFile(collaborationFile, 'utf8'));

    const phaseOrder = ['requirements', 'design', 'tasks'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    
    if (currentIndex < phaseOrder.length - 1) {
      const nextPhase = phaseOrder[currentIndex + 1];
      collaboration.workflow.currentPhase = nextPhase;
      collaboration.phases[nextPhase].status = 'ready';
      
      await fs.writeFile(collaborationFile, yaml.dump(collaboration), 'utf8');
      
      // Trigger notification for next phase
      await this.triggerPhaseNotification(specName, nextPhase, 'phase-ready');
    } else {
      // All phases complete
      collaboration.workflow.currentPhase = 'complete';
      await fs.writeFile(collaborationFile, yaml.dump(collaboration), 'utf8');
      
      // Trigger completion notification
      await this.triggerPhaseNotification(specName, 'complete', 'planning-complete');
    }

    return collaboration;
  }

  /**
   * Trigger phase notification
   */
  async triggerPhaseNotification(specName, phase, eventType) {
    const notification = {
      specName,
      phase,
      eventType,
      timestamp: new Date().toISOString(),
      message: this.generateNotificationMessage(specName, phase, eventType)
    };

    const notificationFile = path.join(this.notificationsPath, `${specName}-${phase}-${Date.now()}.yaml`);
    await fs.writeFile(notificationFile, yaml.dump(notification), 'utf8');

    return notification;
  }

  /**
   * Generate notification message
   */
  generateNotificationMessage(specName, phase, eventType) {
    switch (eventType) {
      case 'phase-ready':
        return `Planning phase "${phase}" is ready to begin for spec "${specName}"`;
      case 'planning-complete':
        return `All planning phases completed for spec "${specName}" - ready for implementation`;
      case 'review-requested':
        return `Review requested for ${phase} phase of spec "${specName}"`;
      case 'approval-granted':
        return `Approval granted for ${phase} phase of spec "${specName}"`;
      case 'conflict-detected':
        return `Conflict detected in ${phase} phase of spec "${specName}" - resolution required`;
      default:
        return `Update for spec "${specName}" phase "${phase}"`;
    }
  }
}

module.exports = CollaborativePlanningManager;