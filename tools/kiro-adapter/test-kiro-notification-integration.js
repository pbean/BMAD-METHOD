/**
 * Test suite for Kiro Notification Integration
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const KiroNotificationIntegration = require('./kiro-notification-integration');

// Test workspace setup
const testWorkspace = path.join(__dirname, 'test-output', 'notification-integration-test');

async function setupTestWorkspace() {
  await fs.ensureDir(testWorkspace);
  await fs.ensureDir(path.join(testWorkspace, '.kiro'));
  return testWorkspace;
}

async function cleanupTestWorkspace() {
  await fs.remove(testWorkspace);
}

async function testNotificationIntegrationInitialization() {
  console.log('Testing notification integration initialization...');
  
  const workspace = await setupTestWorkspace();
  const integration = new KiroNotificationIntegration(workspace);
  
  try {
    // Test initialization
    const { notificationConfig, statusConfig } = await integration.initializeNotificationIntegration();
    
    // Verify directories were created
    const notificationsPath = path.join(workspace, '.kiro', 'notifications');
    const statusPath = path.join(workspace, '.kiro', 'status');
    const hooksPath = path.join(workspace, '.kiro', 'hooks');
    
    console.assert(await fs.pathExists(notificationsPath), 'Notifications directory should exist');
    console.assert(await fs.pathExists(statusPath), 'Status directory should exist');
    console.assert(await fs.pathExists(hooksPath), 'Hooks directory should exist');
    
    // Verify configuration files
    const notificationConfigPath = path.join(notificationsPath, 'config.yaml');
    const statusConfigPath = path.join(statusPath, 'config.yaml');
    
    console.assert(await fs.pathExists(notificationConfigPath), 'Notification config should exist');
    console.assert(await fs.pathExists(statusConfigPath), 'Status config should exist');
    
    // Verify configuration content
    console.assert(notificationConfig.enabled === true, 'Notifications should be enabled');
    console.assert(notificationConfig.channels['kiro-status'], 'Should have kiro-status channel');
    console.assert(notificationConfig.events['planning-phase-complete'], 'Should have planning-phase-complete event');
    
    console.assert(statusConfig.enabled === true, 'Status tracking should be enabled');
    console.assert(statusConfig.statusBar.showActiveSpec === true, 'Should show active spec in status bar');
    console.assert(statusConfig.statusIndicators['in_progress'], 'Should have in_progress status indicator');
    
    console.log('✓ Notification integration initialization test passed');
    
  } catch (error) {
    console.error('✗ Notification integration initialization test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testPlanningPhaseNotification() {
  console.log('Testing planning phase notification...');
  
  const workspace = await setupTestWorkspace();
  const integration = new KiroNotificationIntegration(workspace);
  
  try {
    await integration.initializeNotificationIntegration();
    
    // Test planning phase notification
    const completionData = {
      completedBy: 'Alice',
      duration: 3600000, // 1 hour in milliseconds
      reviewCount: 2,
      approvalCount: 1,
      nextPhase: 'design'
    };
    
    const notification = await integration.sendPlanningPhaseNotification('test-feature', 'requirements', completionData);
    
    // Verify notification was created
    const notificationsPath = path.join(workspace, '.kiro', 'notifications');
    const notificationFiles = await fs.readdir(notificationsPath);
    
    // Filter out config files
    const actualNotifications = notificationFiles.filter(f => f.startsWith('phase-complete-'));
    console.assert(actualNotifications.length >= 1, 'Should have at least 1 notification file');
    
    // Verify notification content
    console.assert(notification.type === 'planning-phase-complete', 'Should be planning-phase-complete type');
    console.assert(notification.specName === 'test-feature', 'Should be for test-feature spec');
    console.assert(notification.phase === 'requirements', 'Should be for requirements phase');
    console.assert(notification.data.completedBy === 'Alice', 'Should be completed by Alice');
    console.assert(notification.data.nextPhase === 'design', 'Next phase should be design');
    
    // Verify actions
    console.assert(notification.actions.length === 2, 'Should have 2 actions');
    console.assert(notification.actions[0].id === 'view-spec', 'First action should be view-spec');
    console.assert(notification.actions[1].id === 'start-next-phase', 'Second action should be start-next-phase');
    
    // Verify status was updated
    const statusPath = path.join(workspace, '.kiro', 'status');
    const statusFiles = await fs.readdir(statusPath);
    const specStatusFiles = statusFiles.filter(f => f.startsWith('test-feature-status'));
    console.assert(specStatusFiles.length >= 1, 'Should have spec status file');
    
    console.log('✓ Planning phase notification test passed');
    
  } catch (error) {
    console.error('✗ Planning phase notification test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testTeamStatusUpdate() {
  console.log('Testing team status update...');
  
  const workspace = await setupTestWorkspace();
  const integration = new KiroNotificationIntegration(workspace);
  
  try {
    await integration.initializeNotificationIntegration();
    
    // Test team status update
    const updateData = {
      memberName: 'Bob',
      documentType: 'requirements',
      teamMembers: [
        { name: 'Alice', role: 'editor' },
        { name: 'Bob', role: 'reviewer' },
        { name: 'Charlie', role: 'approver' }
      ]
    };
    
    const statusUpdate = await integration.sendTeamStatusUpdate('test-feature', 'review-requested', updateData);
    
    // Verify status update was created
    console.assert(statusUpdate.type === 'team-status-update', 'Should be team-status-update type');
    console.assert(statusUpdate.specName === 'test-feature', 'Should be for test-feature spec');
    console.assert(statusUpdate.updateType === 'review-requested', 'Should be review-requested type');
    console.assert(statusUpdate.teamMembers.length === 3, 'Should have 3 team members');
    
    // Verify individual member notifications were created
    const notificationsPath = path.join(workspace, '.kiro', 'notifications');
    const notificationFiles = await fs.readdir(notificationsPath);
    const memberNotifications = notificationFiles.filter(f => f.includes('status-update-test-feature-review-requested'));
    console.assert(memberNotifications.length >= 3, 'Should have notifications for all team members');
    
    // Verify team status was updated
    const statusPath = path.join(workspace, '.kiro', 'status');
    const teamStatusFile = path.join(statusPath, 'test-feature-team-status.yaml');
    console.assert(await fs.pathExists(teamStatusFile), 'Team status file should exist');
    
    const teamStatus = yaml.load(await fs.readFile(teamStatusFile, 'utf8'));
    console.assert(teamStatus.updates.length === 1, 'Should have 1 status update');
    console.assert(teamStatus.updates[0].type === 'review-requested', 'Update should be review-requested type');
    
    console.log('✓ Team status update test passed');
    
  } catch (error) {
    console.error('✗ Team status update test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testProgressTracking() {
  console.log('Testing progress tracking...');
  
  const workspace = await setupTestWorkspace();
  const integration = new KiroNotificationIntegration(workspace);
  
  try {
    await integration.initializeNotificationIntegration();
    
    // Test progress tracking creation
    const teamMembers = [
      { name: 'Alice', role: 'editor' },
      { name: 'Bob', role: 'reviewer' },
      { name: 'Charlie', role: 'approver' }
    ];
    
    const progressTracker = await integration.createProgressTracking('test-feature', teamMembers);
    
    // Verify progress tracker was created
    const statusPath = path.join(workspace, '.kiro', 'status');
    const progressFile = path.join(statusPath, 'test-feature-progress.yaml');
    console.assert(await fs.pathExists(progressFile), 'Progress file should exist');
    
    // Verify progress tracker content
    console.assert(progressTracker.specName === 'test-feature', 'Should be for test-feature spec');
    console.assert(progressTracker.teamMembers.length === 3, 'Should have 3 team members');
    console.assert(progressTracker.phases.requirements.status === 'not_started', 'Requirements should be not started');
    console.assert(progressTracker.overallProgress === 0, 'Overall progress should be 0');
    
    // Verify progress tracking hook was created
    const hooksPath = path.join(workspace, '.kiro', 'hooks');
    const hookFile = path.join(hooksPath, 'bmad-progress-test-feature.yaml');
    console.assert(await fs.pathExists(hookFile), 'Progress tracking hook should exist');
    
    const hookConfig = yaml.load(await fs.readFile(hookFile, 'utf8'));
    console.assert(hookConfig.name.includes('test-feature'), 'Hook should be for test-feature');
    console.assert(hookConfig.trigger.pattern.includes('test-feature'), 'Hook should watch test-feature files');
    
    console.log('✓ Progress tracking test passed');
    
  } catch (error) {
    console.error('✗ Progress tracking test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testProgressTrackingUpdates() {
  console.log('Testing progress tracking updates...');
  
  const workspace = await setupTestWorkspace();
  const integration = new KiroNotificationIntegration(workspace);
  
  try {
    await integration.initializeNotificationIntegration();
    
    const teamMembers = [
      { name: 'Alice', role: 'editor' },
      { name: 'Bob', role: 'reviewer' }
    ];
    
    await integration.createProgressTracking('test-feature', teamMembers);
    
    // Test phase started update
    let updatedProgress = await integration.updateProgressTracking('test-feature', 'phase-started', {
      phase: 'requirements',
      assignedTo: 'Alice'
    });
    
    console.assert(updatedProgress.phases.requirements.status === 'in_progress', 'Requirements should be in progress');
    console.assert(updatedProgress.phases.requirements.assignedTo === 'Alice', 'Requirements should be assigned to Alice');
    
    // Test team member contribution
    updatedProgress = await integration.updateProgressTracking('test-feature', 'team-member-contribution', {
      memberName: 'Alice',
      contributionType: 'document-creation',
      phase: 'requirements',
      description: 'Created initial requirements document',
      timeSpent: 1800000 // 30 minutes
    });
    
    const alice = updatedProgress.teamMembers.find(m => m.name === 'Alice');
    console.assert(alice.contributions.length === 1, 'Alice should have 1 contribution');
    console.assert(alice.timeSpent === 1800000, 'Alice should have 30 minutes time spent');
    
    // Test phase completed
    updatedProgress = await integration.updateProgressTracking('test-feature', 'phase-completed', {
      phase: 'requirements'
    });
    
    console.assert(updatedProgress.phases.requirements.status === 'complete', 'Requirements should be complete');
    console.assert(updatedProgress.phases.requirements.progress === 100, 'Requirements progress should be 100%');
    console.assert(updatedProgress.overallProgress > 0, 'Overall progress should be greater than 0');
    
    // Verify progress notification was sent
    const notificationsPath = path.join(workspace, '.kiro', 'notifications');
    const notificationFiles = await fs.readdir(notificationsPath);
    const progressNotifications = notificationFiles.filter(f => f.includes('progress-test-feature'));
    console.assert(progressNotifications.length >= 1, 'Should have progress notifications');
    
    console.log('✓ Progress tracking updates test passed');
    
  } catch (error) {
    console.error('✗ Progress tracking updates test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testNotificationChannelsAndActions() {
  console.log('Testing notification channels and actions...');
  
  const workspace = await setupTestWorkspace();
  const integration = new KiroNotificationIntegration(workspace);
  
  try {
    await integration.initializeNotificationIntegration();
    
    // Test different member roles get appropriate channels
    const editorChannels = integration.getChannelsForMember({ name: 'Alice', role: 'editor' });
    const reviewerChannels = integration.getChannelsForMember({ name: 'Bob', role: 'reviewer' });
    const approverChannels = integration.getChannelsForMember({ name: 'Charlie', role: 'approver' });
    
    console.assert(editorChannels.includes('file-comments'), 'Editor should get file-comments channel');
    console.assert(reviewerChannels.includes('file-comments'), 'Reviewer should get file-comments channel');
    console.assert(approverChannels.includes('kiro-status'), 'Approver should get kiro-status channel');
    
    // Test actions for different update types
    const reviewActions = integration.getActionsForUpdate('review-requested', 'test-feature', { name: 'Bob', role: 'reviewer' });
    const approvalActions = integration.getActionsForUpdate('approval-requested', 'test-feature', { name: 'Charlie', role: 'approver' });
    const conflictActions = integration.getActionsForUpdate('conflict-detected', 'test-feature', { name: 'Alice', role: 'editor' });
    
    console.assert(reviewActions.some(a => a.id === 'start-review'), 'Reviewer should have start-review action');
    console.assert(approvalActions.some(a => a.id === 'approve-document'), 'Approver should have approve-document action');
    console.assert(conflictActions.some(a => a.id === 'resolve-conflict'), 'Should have resolve-conflict action for conflicts');
    
    console.log('✓ Notification channels and actions test passed');
    
  } catch (error) {
    console.error('✗ Notification channels and actions test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function runAllTests() {
  console.log('Running Kiro Notification Integration tests...\n');
  
  try {
    await testNotificationIntegrationInitialization();
    await testPlanningPhaseNotification();
    await testTeamStatusUpdate();
    await testProgressTracking();
    await testProgressTrackingUpdates();
    await testNotificationChannelsAndActions();
    
    console.log('\n✅ All Kiro Notification Integration tests passed!');
    
  } catch (error) {
    console.error('\n❌ Kiro Notification Integration tests failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testNotificationIntegrationInitialization,
  testPlanningPhaseNotification,
  testTeamStatusUpdate,
  testProgressTracking,
  testProgressTrackingUpdates,
  testNotificationChannelsAndActions,
  runAllTests
};