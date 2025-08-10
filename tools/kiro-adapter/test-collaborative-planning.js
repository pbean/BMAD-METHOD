/**
 * Test suite for Collaborative Planning Manager
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const CollaborativePlanningManager = require('./collaborative-planning');

// Test workspace setup
const testWorkspace = path.join(__dirname, 'test-output', 'collaborative-planning-test');

async function setupTestWorkspace() {
  await fs.ensureDir(testWorkspace);
  await fs.ensureDir(path.join(testWorkspace, '.kiro'));
  return testWorkspace;
}

async function cleanupTestWorkspace() {
  await fs.remove(testWorkspace);
}

async function testCollaborativePlanningInfrastructure() {
  console.log('Testing collaborative planning infrastructure...');
  
  const workspace = await setupTestWorkspace();
  const manager = new CollaborativePlanningManager(workspace);
  
  try {
    // Test infrastructure initialization
    const config = await manager.initializeCollaborativeInfrastructure();
    
    // Verify directories were created
    const collaborationPath = path.join(workspace, '.kiro', 'collaboration');
    const reviewsPath = path.join(collaborationPath, 'reviews');
    const approvalsPath = path.join(collaborationPath, 'approvals');
    const conflictsPath = path.join(collaborationPath, 'conflicts');
    const notificationsPath = path.join(workspace, '.kiro', 'notifications');
    
    console.assert(await fs.pathExists(collaborationPath), 'Collaboration directory should exist');
    console.assert(await fs.pathExists(reviewsPath), 'Reviews directory should exist');
    console.assert(await fs.pathExists(approvalsPath), 'Approvals directory should exist');
    console.assert(await fs.pathExists(conflictsPath), 'Conflicts directory should exist');
    console.assert(await fs.pathExists(notificationsPath), 'Notifications directory should exist');
    
    // Verify configuration file
    const configPath = path.join(collaborationPath, 'config.yaml');
    console.assert(await fs.pathExists(configPath), 'Configuration file should exist');
    
    const savedConfig = yaml.load(await fs.readFile(configPath, 'utf8'));
    console.assert(savedConfig.version === '1.0.0', 'Configuration should have correct version');
    console.assert(savedConfig.notifications.enabled === true, 'Notifications should be enabled');
    
    console.log('✓ Collaborative planning infrastructure test passed');
    
  } catch (error) {
    console.error('✗ Collaborative planning infrastructure test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testTeamPlanningWorkflow() {
  console.log('Testing team planning workflow creation...');
  
  const workspace = await setupTestWorkspace();
  const manager = new CollaborativePlanningManager(workspace);
  
  try {
    await manager.initializeCollaborativeInfrastructure();
    
    // Test team planning workflow creation
    const teamMembers = [
      { name: 'Alice', role: 'editor' },
      { name: 'Bob', role: 'reviewer' },
      { name: 'Charlie', role: 'approver' }
    ];
    
    const planningMetadata = await manager.createTeamPlanningWorkflow('test-feature', teamMembers);
    
    // Verify spec directory and collaboration file
    const specPath = path.join(workspace, '.kiro', 'specs', 'test-feature');
    const collaborationFile = path.join(specPath, 'collaboration.yaml');
    
    console.assert(await fs.pathExists(specPath), 'Spec directory should exist');
    console.assert(await fs.pathExists(collaborationFile), 'Collaboration file should exist');
    
    // Verify metadata structure
    console.assert(planningMetadata.specName === 'test-feature', 'Spec name should match');
    console.assert(planningMetadata.teamMembers.length === 3, 'Should have 3 team members');
    console.assert(planningMetadata.workflow.currentPhase === 'requirements', 'Should start with requirements phase');
    
    // Verify phase configuration
    const requirementsPhase = planningMetadata.phases.requirements;
    console.assert(requirementsPhase.status === 'not_started', 'Requirements phase should be not started');
    console.assert(requirementsPhase.reviewers.length === 1, 'Should have 1 reviewer');
    console.assert(requirementsPhase.approvers.length === 1, 'Should have 1 approver');
    
    console.log('✓ Team planning workflow test passed');
    
  } catch (error) {
    console.error('✗ Team planning workflow test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testCollaborativeAgentAdaptation() {
  console.log('Testing collaborative agent adaptation...');
  
  const workspace = await setupTestWorkspace();
  const manager = new CollaborativePlanningManager(workspace);
  
  try {
    await manager.initializeCollaborativeInfrastructure();
    
    const teamMembers = [
      { name: 'Alice', role: 'editor' },
      { name: 'Bob', role: 'reviewer' }
    ];
    
    await manager.createTeamPlanningWorkflow('test-feature', teamMembers);
    
    // Test collaborative agent adaptation
    const collaborativeAgents = await manager.adaptPlanningAgentsForCollaboration('test-feature');
    
    // Verify collaborative agents were created
    const specPath = path.join(workspace, '.kiro', 'specs', 'test-feature');
    const agentsFile = path.join(specPath, 'collaborative-agents.yaml');
    
    console.assert(await fs.pathExists(agentsFile), 'Collaborative agents file should exist');
    
    // Verify agent configurations
    console.assert(collaborativeAgents['bmad-pm-collaborative'], 'PM collaborative agent should exist');
    console.assert(collaborativeAgents['bmad-architect-collaborative'], 'Architect collaborative agent should exist');
    console.assert(collaborativeAgents['bmad-sm-collaborative'], 'SM collaborative agent should exist');
    
    const pmAgent = collaborativeAgents['bmad-pm-collaborative'];
    console.assert(pmAgent.collaborationFeatures.sharedDocuments === true, 'PM agent should support shared documents');
    console.assert(pmAgent.collaborationFeatures.teamNotifications === true, 'PM agent should support team notifications');
    console.assert(pmAgent.contextProviders.includes('#Collaboration'), 'PM agent should have collaboration context');
    
    console.log('✓ Collaborative agent adaptation test passed');
    
  } catch (error) {
    console.error('✗ Collaborative agent adaptation test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testSharedDocumentWorkflow() {
  console.log('Testing shared document workflow...');
  
  const workspace = await setupTestWorkspace();
  const manager = new CollaborativePlanningManager(workspace);
  
  try {
    await manager.initializeCollaborativeInfrastructure();
    
    const teamMembers = [
      { name: 'Alice', role: 'editor' },
      { name: 'Bob', role: 'reviewer' },
      { name: 'Charlie', role: 'approver' }
    ];
    
    await manager.createTeamPlanningWorkflow('test-feature', teamMembers);
    
    // Test shared document creation
    const { collaboration, documentLock } = await manager.createSharedDocumentWorkflow('test-feature', 'requirements', 'Alice');
    
    // Verify document was created
    const specPath = path.join(workspace, '.kiro', 'specs', 'test-feature');
    const requirementsFile = path.join(specPath, 'requirements.md');
    const lockFile = path.join(specPath, 'requirements-lock.yaml');
    
    console.assert(await fs.pathExists(requirementsFile), 'Requirements document should exist');
    console.assert(await fs.pathExists(lockFile), 'Document lock file should exist');
    
    // Verify collaboration metadata was updated
    console.assert(collaboration.phases.requirements.status === 'in_progress', 'Requirements phase should be in progress');
    console.assert(collaboration.phases.requirements.assignedTo === 'Alice', 'Requirements should be assigned to Alice');
    
    // Verify document lock
    console.assert(documentLock.lockedBy === 'Alice', 'Document should be locked by Alice');
    console.assert(documentLock.collaborators.length === 3, 'Should have 3 collaborators');
    
    // Verify document template has collaboration markers
    const documentContent = await fs.readFile(requirementsFile, 'utf8');
    console.assert(documentContent.includes('COLLABORATION METADATA'), 'Document should have collaboration metadata');
    console.assert(documentContent.includes('Team Review Status'), 'Document should have review status section');
    console.assert(documentContent.includes('Collaboration Notes'), 'Document should have collaboration notes section');
    
    console.log('✓ Shared document workflow test passed');
    
  } catch (error) {
    console.error('✗ Shared document workflow test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testTeamReviewMechanism() {
  console.log('Testing team review mechanism...');
  
  const workspace = await setupTestWorkspace();
  const manager = new CollaborativePlanningManager(workspace);
  
  try {
    await manager.initializeCollaborativeInfrastructure();
    
    const teamMembers = [
      { name: 'Alice', role: 'editor' },
      { name: 'Bob', role: 'reviewer' }
    ];
    
    await manager.createTeamPlanningWorkflow('test-feature', teamMembers);
    await manager.createSharedDocumentWorkflow('test-feature', 'requirements', 'Alice');
    
    // Test review submission
    const reviewComments = [
      'Requirements look comprehensive',
      'Need more detail on acceptance criteria',
      'Consider edge cases for user authentication'
    ];
    
    const review = await manager.addTeamReviewMechanism('test-feature', 'requirements', 'Bob', reviewComments);
    
    // Verify review was created
    const reviewsPath = path.join(workspace, '.kiro', 'collaboration', 'reviews');
    const reviewFiles = await fs.readdir(reviewsPath);
    console.assert(reviewFiles.length === 1, 'Should have 1 review file');
    
    // Verify review content
    console.assert(review.reviewer === 'Bob', 'Review should be from Bob');
    console.assert(review.comments.length === 3, 'Review should have 3 comments');
    console.assert(review.status === 'submitted', 'Review status should be submitted');
    
    // Verify collaboration metadata was updated
    const specPath = path.join(workspace, '.kiro', 'specs', 'test-feature');
    const collaborationFile = path.join(specPath, 'collaboration.yaml');
    const collaboration = yaml.load(await fs.readFile(collaborationFile, 'utf8'));
    
    console.assert(collaboration.phases.requirements.reviews.length === 1, 'Should have 1 review recorded');
    console.assert(collaboration.phases.requirements.reviews[0].reviewer === 'Bob', 'Review should be from Bob');
    
    console.log('✓ Team review mechanism test passed');
    
  } catch (error) {
    console.error('✗ Team review mechanism test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testTeamApprovalProcess() {
  console.log('Testing team approval process...');
  
  const workspace = await setupTestWorkspace();
  const manager = new CollaborativePlanningManager(workspace);
  
  try {
    await manager.initializeCollaborativeInfrastructure();
    
    const teamMembers = [
      { name: 'Alice', role: 'editor' },
      { name: 'Charlie', role: 'approver' }
    ];
    
    await manager.createTeamPlanningWorkflow('test-feature', teamMembers);
    await manager.createSharedDocumentWorkflow('test-feature', 'requirements', 'Alice');
    
    // Test approval process
    const approval = await manager.processTeamApproval('test-feature', 'requirements', 'Charlie', true, 'Requirements approved - ready for design phase');
    
    // Verify approval was created
    const approvalsPath = path.join(workspace, '.kiro', 'collaboration', 'approvals');
    const approvalFiles = await fs.readdir(approvalsPath);
    console.assert(approvalFiles.length === 1, 'Should have 1 approval file');
    
    // Verify approval content
    console.assert(approval.approver === 'Charlie', 'Approval should be from Charlie');
    console.assert(approval.approved === true, 'Approval should be granted');
    console.assert(approval.status === 'approved', 'Approval status should be approved');
    
    // Verify collaboration metadata was updated
    const specPath = path.join(workspace, '.kiro', 'specs', 'test-feature');
    const collaborationFile = path.join(specPath, 'collaboration.yaml');
    const collaboration = yaml.load(await fs.readFile(collaborationFile, 'utf8'));
    
    console.assert(collaboration.phases.requirements.approvals.length === 1, 'Should have 1 approval recorded');
    console.assert(collaboration.phases.requirements.status === 'approved', 'Requirements phase should be approved');
    console.assert(collaboration.workflow.currentPhase === 'design', 'Should progress to design phase');
    
    console.log('✓ Team approval process test passed');
    
  } catch (error) {
    console.error('✗ Team approval process test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testPhaseNotifications() {
  console.log('Testing phase notifications...');
  
  const workspace = await setupTestWorkspace();
  const manager = new CollaborativePlanningManager(workspace);
  
  try {
    await manager.initializeCollaborativeInfrastructure();
    
    // Test notification creation
    const notification = await manager.triggerPhaseNotification('test-feature', 'requirements', 'phase-ready');
    
    // Verify notification was created
    const notificationsPath = path.join(workspace, '.kiro', 'notifications');
    const notificationFiles = await fs.readdir(notificationsPath);
    console.assert(notificationFiles.length === 1, 'Should have 1 notification file');
    
    // Verify notification content
    console.assert(notification.specName === 'test-feature', 'Notification should be for test-feature');
    console.assert(notification.phase === 'requirements', 'Notification should be for requirements phase');
    console.assert(notification.eventType === 'phase-ready', 'Notification should be phase-ready event');
    console.assert(notification.message.includes('ready to begin'), 'Notification should have appropriate message');
    
    console.log('✓ Phase notifications test passed');
    
  } catch (error) {
    console.error('✗ Phase notifications test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function runAllTests() {
  console.log('Running Collaborative Planning Manager tests...\n');
  
  try {
    await testCollaborativePlanningInfrastructure();
    await testTeamPlanningWorkflow();
    await testCollaborativeAgentAdaptation();
    await testSharedDocumentWorkflow();
    await testTeamReviewMechanism();
    await testTeamApprovalProcess();
    await testPhaseNotifications();
    
    console.log('\n✅ All Collaborative Planning Manager tests passed!');
    
  } catch (error) {
    console.error('\n❌ Collaborative Planning Manager tests failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testCollaborativePlanningInfrastructure,
  testTeamPlanningWorkflow,
  testCollaborativeAgentAdaptation,
  testSharedDocumentWorkflow,
  testTeamReviewMechanism,
  testTeamApprovalProcess,
  testPhaseNotifications,
  runAllTests
};