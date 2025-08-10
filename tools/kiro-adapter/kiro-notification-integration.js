/**
 * Kiro Notification and Status Integration
 * 
 * This module integrates BMad collaborative planning with Kiro's notification
 * and status systems, providing automatic notifications for planning phase
 * completions, status updates for team members, and progress tracking.
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

class KiroNotificationIntegration {
  constructor(workspacePath = '.') {
    this.workspacePath = workspacePath;
    this.kiroPath = path.join(workspacePath, '.kiro');
    this.notificationsPath = path.join(this.kiroPath, 'notifications');
    this.statusPath = path.join(this.kiroPath, 'status');
    this.hooksPath = path.join(this.kiroPath, 'hooks');
  }

  /**
   * Initialize Kiro notification and status integration
   */
  async initializeNotificationIntegration() {
    // Create notification and status directories
    await fs.ensureDir(this.notificationsPath);
    await fs.ensureDir(this.statusPath);
    await fs.ensureDir(this.hooksPath);

    // Create notification configuration
    const notificationConfig = {
      version: '1.0.0',
      enabled: true,
      channels: {
        'kiro-status': {
          type: 'status-bar',
          enabled: true,
          priority: 'normal'
        },
        'file-comments': {
          type: 'inline-comments',
          enabled: true,
          priority: 'high'
        },
        'toast-notifications': {
          type: 'toast',
          enabled: true,
          priority: 'normal',
          duration: 5000
        },
        'activity-log': {
          type: 'log',
          enabled: true,
          priority: 'low'
        }
      },
      events: {
        'planning-phase-complete': {
          channels: ['kiro-status', 'toast-notifications', 'activity-log'],
          template: 'Planning phase "{phase}" completed for spec "{specName}"',
          actions: ['view-spec', 'start-next-phase']
        },
        'review-requested': {
          channels: ['file-comments', 'toast-notifications', 'activity-log'],
          template: 'Review requested for {documentType} in spec "{specName}"',
          actions: ['open-document', 'start-review']
        },
        'approval-granted': {
          channels: ['kiro-status', 'toast-notifications', 'activity-log'],
          template: 'Approval granted for {documentType} in spec "{specName}"',
          actions: ['view-spec', 'continue-workflow']
        },
        'conflict-detected': {
          channels: ['file-comments', 'toast-notifications', 'activity-log'],
          template: 'Conflict detected in {documentType} for spec "{specName}"',
          actions: ['resolve-conflict', 'view-changes'],
          priority: 'high'
        },
        'team-member-assigned': {
          channels: ['toast-notifications', 'activity-log'],
          template: '{memberName} assigned to {documentType} in spec "{specName}"',
          actions: ['view-assignment', 'contact-member']
        },
        'workflow-progress': {
          channels: ['kiro-status', 'activity-log'],
          template: 'Workflow progress: {currentPhase} phase active for spec "{specName}"',
          actions: ['view-progress', 'view-spec']
        }
      },
      teamNotifications: {
        enabled: true,
        mentionPattern: '@{memberName}',
        groupMentions: ['@team', '@reviewers', '@approvers'],
        autoNotifyOnAssignment: true,
        autoNotifyOnCompletion: true
      }
    };

    await fs.writeFile(
      path.join(this.notificationsPath, 'config.yaml'),
      yaml.dump(notificationConfig),
      'utf8'
    );

    // Create status tracking configuration
    const statusConfig = {
      version: '1.0.0',
      enabled: true,
      statusBar: {
        showActiveSpec: true,
        showCurrentPhase: true,
        showTeamMembers: true,
        showProgress: true,
        refreshInterval: 5000
      },
      progressTracking: {
        enabled: true,
        trackPhaseCompletion: true,
        trackTeamParticipation: true,
        trackTimeSpent: true,
        generateReports: true
      },
      statusIndicators: {
        'not_started': { icon: '⚪', color: '#gray', label: 'Not Started' },
        'in_progress': { icon: '🟡', color: '#yellow', label: 'In Progress' },
        'under_review': { icon: '🔍', color: '#blue', label: 'Under Review' },
        'approved': { icon: '✅', color: '#green', label: 'Approved' },
        'rejected': { icon: '❌', color: '#red', label: 'Rejected' },
        'conflict': { icon: '⚠️', color: '#orange', label: 'Conflict' },
        'complete': { icon: '🎉', color: '#purple', label: 'Complete' }
      }
    };

    await fs.writeFile(
      path.join(this.statusPath, 'config.yaml'),
      yaml.dump(statusConfig),
      'utf8'
    );

    return { notificationConfig, statusConfig };
  }

  /**
   * Send automatic notification for planning phase completion
   */
  async sendPlanningPhaseNotification(specName, phase, completionData = {}) {
    const notification = {
      id: `phase-complete-${specName}-${phase}-${Date.now()}`,
      type: 'planning-phase-complete',
      specName,
      phase,
      timestamp: new Date().toISOString(),
      data: {
        completedBy: completionData.completedBy || 'System',
        duration: completionData.duration || null,
        reviewCount: completionData.reviewCount || 0,
        approvalCount: completionData.approvalCount || 0,
        nextPhase: completionData.nextPhase || null
      },
      channels: ['kiro-status', 'toast-notifications', 'activity-log'],
      actions: [
        {
          id: 'view-spec',
          label: 'View Spec',
          command: 'kiro.openSpec',
          args: [specName]
        },
        {
          id: 'start-next-phase',
          label: 'Start Next Phase',
          command: 'bmad.startNextPhase',
          args: [specName, completionData.nextPhase],
          enabled: !!completionData.nextPhase
        }
      ],
      message: `Planning phase "${phase}" completed for spec "${specName}"`
    };

    await this.saveNotification(notification);
    await this.updateKiroStatus(specName, phase, 'complete');
    
    return notification;
  }

  /**
   * Send status update for team members during planning
   */
  async sendTeamStatusUpdate(specName, updateType, updateData = {}) {
    const statusUpdate = {
      id: `status-update-${specName}-${updateType}-${Date.now()}`,
      type: 'team-status-update',
      specName,
      updateType,
      timestamp: new Date().toISOString(),
      data: updateData,
      teamMembers: updateData.teamMembers || [],
      message: this.generateStatusUpdateMessage(specName, updateType, updateData)
    };

    // Send notifications to relevant team members
    for (const member of statusUpdate.teamMembers) {
      const memberNotification = {
        ...statusUpdate,
        id: `${statusUpdate.id}-${member.name}`,
        recipient: member.name,
        channels: this.getChannelsForMember(member),
        actions: this.getActionsForUpdate(updateType, specName, member)
      };

      await this.saveNotification(memberNotification);
    }

    // Update global status
    await this.updateTeamStatus(specName, updateType, updateData);

    return statusUpdate;
  }

  /**
   * Create progress tracking for collaborative planning workflows
   */
  async createProgressTracking(specName, teamMembers = []) {
    const progressTracker = {
      specName,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      teamMembers: teamMembers.map(member => ({
        name: member.name,
        role: member.role,
        joinedAt: new Date().toISOString(),
        contributions: [],
        timeSpent: 0,
        status: 'active'
      })),
      phases: {
        requirements: {
          status: 'not_started',
          startedAt: null,
          completedAt: null,
          assignedTo: null,
          participants: [],
          milestones: [],
          timeSpent: 0,
          progress: 0
        },
        design: {
          status: 'not_started',
          startedAt: null,
          completedAt: null,
          assignedTo: null,
          participants: [],
          milestones: [],
          timeSpent: 0,
          progress: 0
        },
        tasks: {
          status: 'not_started',
          startedAt: null,
          completedAt: null,
          assignedTo: null,
          participants: [],
          milestones: [],
          timeSpent: 0,
          progress: 0
        }
      },
      overallProgress: 0,
      totalTimeSpent: 0,
      metrics: {
        reviewCycles: 0,
        conflictResolutions: 0,
        approvalTime: 0,
        teamCollaboration: 0
      }
    };

    const progressFile = path.join(this.statusPath, `${specName}-progress.yaml`);
    await fs.writeFile(progressFile, yaml.dump(progressTracker), 'utf8');

    // Create progress tracking hook
    await this.createProgressTrackingHook(specName);

    return progressTracker;
  }

  /**
   * Update progress tracking when events occur
   */
  async updateProgressTracking(specName, eventType, eventData = {}) {
    const progressFile = path.join(this.statusPath, `${specName}-progress.yaml`);
    
    if (!await fs.pathExists(progressFile)) {
      throw new Error(`Progress tracking not found for spec: ${specName}`);
    }

    const progress = yaml.load(await fs.readFile(progressFile, 'utf8'));
    progress.lastUpdated = new Date().toISOString();

    switch (eventType) {
      case 'phase-started':
        const phase = eventData.phase;
        progress.phases[phase].status = 'in_progress';
        progress.phases[phase].startedAt = new Date().toISOString();
        progress.phases[phase].assignedTo = eventData.assignedTo;
        break;

      case 'phase-completed':
        const completedPhase = eventData.phase;
        progress.phases[completedPhase].status = 'complete';
        progress.phases[completedPhase].completedAt = new Date().toISOString();
        progress.phases[completedPhase].progress = 100;
        break;

      case 'team-member-contribution':
        const contributor = progress.teamMembers.find(m => m.name === eventData.memberName);
        if (contributor) {
          contributor.contributions.push({
            type: eventData.contributionType,
            timestamp: new Date().toISOString(),
            phase: eventData.phase,
            description: eventData.description
          });
          contributor.timeSpent += eventData.timeSpent || 0;
        }
        break;

      case 'review-cycle':
        progress.metrics.reviewCycles += 1;
        break;

      case 'conflict-resolution':
        progress.metrics.conflictResolutions += 1;
        break;
    }

    // Recalculate overall progress
    const phaseProgress = Object.values(progress.phases).map(p => p.progress);
    progress.overallProgress = phaseProgress.reduce((sum, p) => sum + p, 0) / phaseProgress.length;
    progress.totalTimeSpent = progress.teamMembers.reduce((sum, m) => sum + m.timeSpent, 0);

    await fs.writeFile(progressFile, yaml.dump(progress), 'utf8');

    // Send progress notification
    await this.sendProgressNotification(specName, eventType, progress);

    return progress;
  }

  /**
   * Generate status update message
   */
  generateStatusUpdateMessage(specName, updateType, updateData) {
    switch (updateType) {
      case 'member-assigned':
        return `${updateData.memberName} assigned to ${updateData.documentType} in spec "${specName}"`;
      case 'review-requested':
        return `Review requested for ${updateData.documentType} in spec "${specName}"`;
      case 'approval-granted':
        return `Approval granted for ${updateData.documentType} in spec "${specName}"`;
      case 'phase-transition':
        return `Transitioning from ${updateData.fromPhase} to ${updateData.toPhase} in spec "${specName}"`;
      case 'conflict-detected':
        return `Conflict detected in ${updateData.documentType} for spec "${specName}"`;
      default:
        return `Status update for spec "${specName}": ${updateType}`;
    }
  }

  /**
   * Get notification channels for team member based on role
   */
  getChannelsForMember(member) {
    const baseChannels = ['activity-log'];
    
    switch (member.role) {
      case 'editor':
        return [...baseChannels, 'file-comments', 'toast-notifications'];
      case 'reviewer':
        return [...baseChannels, 'file-comments', 'toast-notifications'];
      case 'approver':
        return [...baseChannels, 'kiro-status', 'toast-notifications'];
      default:
        return [...baseChannels, 'toast-notifications'];
    }
  }

  /**
   * Get actions for status update based on type and member role
   */
  getActionsForUpdate(updateType, specName, member) {
    const baseActions = [
      {
        id: 'view-spec',
        label: 'View Spec',
        command: 'kiro.openSpec',
        args: [specName]
      }
    ];

    switch (updateType) {
      case 'review-requested':
        if (member.role === 'reviewer') {
          baseActions.push({
            id: 'start-review',
            label: 'Start Review',
            command: 'bmad.startReview',
            args: [specName, member.name]
          });
        }
        break;
      case 'approval-requested':
        if (member.role === 'approver') {
          baseActions.push({
            id: 'approve-document',
            label: 'Approve',
            command: 'bmad.approveDocument',
            args: [specName, member.name]
          });
        }
        break;
      case 'conflict-detected':
        baseActions.push({
          id: 'resolve-conflict',
          label: 'Resolve Conflict',
          command: 'bmad.resolveConflict',
          args: [specName]
        });
        break;
    }

    return baseActions;
  }

  /**
   * Save notification to Kiro notification system
   */
  async saveNotification(notification) {
    const notificationFile = path.join(this.notificationsPath, `${notification.id}.yaml`);
    await fs.writeFile(notificationFile, yaml.dump(notification), 'utf8');

    // Also create a JSON version for easier consumption by Kiro
    const jsonFile = path.join(this.notificationsPath, `${notification.id}.json`);
    await fs.writeFile(jsonFile, JSON.stringify(notification, null, 2), 'utf8');

    return notification;
  }

  /**
   * Update Kiro status system
   */
  async updateKiroStatus(specName, phase, status) {
    const statusFile = path.join(this.statusPath, `${specName}-status.yaml`);
    
    let statusData = {};
    if (await fs.pathExists(statusFile)) {
      statusData = yaml.load(await fs.readFile(statusFile, 'utf8'));
    }

    statusData.specName = specName;
    statusData.lastUpdated = new Date().toISOString();
    statusData.phases = statusData.phases || {};
    statusData.phases[phase] = {
      status,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(statusFile, yaml.dump(statusData), 'utf8');

    return statusData;
  }

  /**
   * Update team status
   */
  async updateTeamStatus(specName, updateType, updateData) {
    const teamStatusFile = path.join(this.statusPath, `${specName}-team-status.yaml`);
    
    let teamStatus = {};
    if (await fs.pathExists(teamStatusFile)) {
      teamStatus = yaml.load(await fs.readFile(teamStatusFile, 'utf8'));
    }

    teamStatus.specName = specName;
    teamStatus.lastUpdated = new Date().toISOString();
    teamStatus.updates = teamStatus.updates || [];
    
    teamStatus.updates.push({
      type: updateType,
      timestamp: new Date().toISOString(),
      data: updateData
    });

    // Keep only last 50 updates
    if (teamStatus.updates.length > 50) {
      teamStatus.updates = teamStatus.updates.slice(-50);
    }

    await fs.writeFile(teamStatusFile, yaml.dump(teamStatus), 'utf8');

    return teamStatus;
  }

  /**
   * Send progress notification
   */
  async sendProgressNotification(specName, eventType, progressData) {
    const notification = {
      id: `progress-${specName}-${eventType}-${Date.now()}`,
      type: 'workflow-progress',
      specName,
      eventType,
      timestamp: new Date().toISOString(),
      data: {
        overallProgress: progressData.overallProgress,
        currentPhase: this.getCurrentPhase(progressData),
        totalTimeSpent: progressData.totalTimeSpent,
        teamParticipation: progressData.teamMembers.length
      },
      channels: ['kiro-status', 'activity-log'],
      message: `Workflow progress: ${Math.round(progressData.overallProgress)}% complete for spec "${specName}"`
    };

    await this.saveNotification(notification);

    return notification;
  }

  /**
   * Get current active phase from progress data
   */
  getCurrentPhase(progressData) {
    for (const [phaseName, phaseData] of Object.entries(progressData.phases)) {
      if (phaseData.status === 'in_progress') {
        return phaseName;
      }
    }
    
    // Find next phase to start
    const phaseOrder = ['requirements', 'design', 'tasks'];
    for (const phaseName of phaseOrder) {
      if (progressData.phases[phaseName].status === 'not_started') {
        return phaseName;
      }
    }
    
    return 'complete';
  }

  /**
   * Create progress tracking hook
   */
  async createProgressTrackingHook(specName) {
    const hookConfig = {
      name: `BMad Progress Tracking - ${specName}`,
      description: `Automatic progress tracking for BMad collaborative planning in spec ${specName}`,
      trigger: {
        type: 'file_change',
        pattern: `.kiro/specs/${specName}/*.md`,
        events: ['save', 'create', 'modify']
      },
      condition: {
        type: 'content_change',
        patterns: [
          'COLLABORATION METADATA',
          'Team Review Status',
          'Approval Status'
        ]
      },
      action: {
        type: 'agent_execution',
        agent: 'bmad-progress-tracker',
        task: 'update-progress-tracking',
        context: ['#File', '#Git Diff'],
        parameters: {
          specName: specName,
          autoUpdate: true
        }
      },
      enabled: true,
      priority: 'normal'
    };

    const hookFile = path.join(this.hooksPath, `bmad-progress-${specName}.yaml`);
    await fs.writeFile(hookFile, yaml.dump(hookConfig), 'utf8');

    return hookConfig;
  }
}

module.exports = KiroNotificationIntegration;