/**
 * Test suite for Collaborative Conflict Resolution
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const CollaborativeConflictResolution = require('./collaborative-conflict-resolution');

// Test workspace setup
const testWorkspace = path.join(__dirname, 'test-output', 'conflict-resolution-test');

async function setupTestWorkspace() {
  await fs.ensureDir(testWorkspace);
  await fs.ensureDir(path.join(testWorkspace, '.kiro'));
  await fs.ensureDir(path.join(testWorkspace, '.kiro', 'specs', 'test-feature'));
  return testWorkspace;
}

async function cleanupTestWorkspace() {
  await fs.remove(testWorkspace);
}

async function createTestDocument(workspace, specName, documentType, content) {
  const specPath = path.join(workspace, '.kiro', 'specs', specName);
  const documentPath = path.join(specPath, `${documentType}.md`);
  await fs.writeFile(documentPath, content, 'utf8');
  
  // Create lock file
  const lockData = {
    documentType,
    lockedBy: 'Alice',
    lockedAt: new Date().toISOString(),
    collaborators: [
      { name: 'Alice', role: 'editor', canEdit: true },
      { name: 'Bob', role: 'reviewer', canEdit: false }
    ]
  };
  
  const lockPath = path.join(specPath, `${documentType}-lock.yaml`);
  await fs.writeFile(lockPath, yaml.dump(lockData), 'utf8');
  
  return { documentPath, lockPath };
}

async function testConflictResolutionInitialization() {
  console.log('Testing conflict resolution initialization...');
  
  const workspace = await setupTestWorkspace();
  const resolver = new CollaborativeConflictResolution(workspace);
  
  try {
    // Test initialization
    const config = await resolver.initializeConflictResolution();
    
    // Verify directories were created
    const conflictsPath = path.join(workspace, '.kiro', 'collaboration', 'conflicts');
    const backupsPath = path.join(workspace, '.kiro', 'collaboration', 'backups');
    const versionsPath = path.join(workspace, '.kiro', 'collaboration', 'versions');
    
    console.assert(await fs.pathExists(conflictsPath), 'Conflicts directory should exist');
    console.assert(await fs.pathExists(backupsPath), 'Backups directory should exist');
    console.assert(await fs.pathExists(versionsPath), 'Versions directory should exist');
    
    // Verify configuration file
    const configPath = path.join(conflictsPath, 'config.yaml');
    console.assert(await fs.pathExists(configPath), 'Configuration file should exist');
    
    // Verify configuration content
    console.assert(config.enabled === true, 'Conflict resolution should be enabled');
    console.assert(config.detection.autoDetect === true, 'Auto-detection should be enabled');
    console.assert(config.resolution.backupOnConflict === true, 'Backup on conflict should be enabled');
    console.assert(config.mergeStrategies['text-merge'], 'Should have text-merge strategy');
    
    console.log('✓ Conflict resolution initialization test passed');
    
  } catch (error) {
    console.error('✗ Conflict resolution initialization test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testConflictDetection() {
  console.log('Testing conflict detection...');
  
  const workspace = await setupTestWorkspace();
  const resolver = new CollaborativeConflictResolution(workspace);
  
  try {
    await resolver.initializeConflictResolution();
    
    // Create document with conflict markers
    const conflictContent = `# Requirements Document

## Introduction

This is a test document.

<<<<<<< HEAD
This is the original content.
=======
This is the modified content.
>>>>>>> feature-branch

## Requirements

Some requirements here.`;

    await createTestDocument(workspace, 'test-feature', 'requirements', conflictContent);
    
    // Test conflict detection
    const { hasConflicts, conflicts } = await resolver.detectDocumentConflicts('test-feature', 'requirements');
    
    console.assert(hasConflicts === true, 'Should detect conflicts');
    console.assert(conflicts.length > 0, 'Should have conflict records');
    
    // Check for merge conflict detection
    const mergeConflict = conflicts.find(c => c.type === 'merge-conflict');
    console.assert(mergeConflict, 'Should detect merge conflict');
    console.assert(mergeConflict.severity === 'high', 'Merge conflict should be high severity');
    console.assert(mergeConflict.location.length > 0, 'Should have conflict locations');
    
    // Verify conflict was recorded
    const conflictsPath = path.join(workspace, '.kiro', 'collaboration', 'conflicts');
    const conflictFiles = await fs.readdir(conflictsPath);
    const actualConflictFiles = conflictFiles.filter(f => f.startsWith('test-feature-requirements-'));
    console.assert(actualConflictFiles.length >= 1, 'Should have recorded conflict file');
    
    console.log('✓ Conflict detection test passed');
    
  } catch (error) {
    console.error('✗ Conflict detection test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testSimultaneousEditingDetection() {
  console.log('Testing simultaneous editing detection...');
  
  const workspace = await setupTestWorkspace();
  const resolver = new CollaborativeConflictResolution(workspace);
  
  try {
    await resolver.initializeConflictResolution();
    
    // Create document with recent lock
    const content = '# Test Document\n\nSome content here.';
    await createTestDocument(workspace, 'test-feature', 'requirements', content);
    
    // Add collaborative edits to lock file
    const specPath = path.join(workspace, '.kiro', 'specs', 'test-feature');
    const lockPath = path.join(specPath, 'requirements-lock.yaml');
    const lockData = yaml.load(await fs.readFile(lockPath, 'utf8'));
    
    lockData.collaborativeEdits = [
      {
        editor: 'Bob',
        timestamp: new Date().toISOString(),
        section: 'Introduction'
      }
    ];
    
    await fs.writeFile(lockPath, yaml.dump(lockData), 'utf8');
    
    // Test simultaneous editing detection
    const simultaneousEditors = await resolver.checkSimultaneousEditing('test-feature', 'requirements');
    
    console.assert(simultaneousEditors.length >= 1, 'Should detect simultaneous editors');
    
    const primaryEditor = simultaneousEditors.find(e => e.type === 'primary');
    console.assert(primaryEditor && primaryEditor.name === 'Alice', 'Should detect primary editor');
    
    const collaborativeEditor = simultaneousEditors.find(e => e.type === 'collaborative');
    console.assert(collaborativeEditor && collaborativeEditor.name === 'Bob', 'Should detect collaborative editor');
    
    console.log('✓ Simultaneous editing detection test passed');
    
  } catch (error) {
    console.error('✗ Simultaneous editing detection test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testConflictBackupCreation() {
  console.log('Testing conflict backup creation...');
  
  const workspace = await setupTestWorkspace();
  const resolver = new CollaborativeConflictResolution(workspace);
  
  try {
    await resolver.initializeConflictResolution();
    
    // Create test document
    const content = '# Test Document\n\nOriginal content.';
    await createTestDocument(workspace, 'test-feature', 'requirements', content);
    
    // Create collaboration metadata
    const specPath = path.join(workspace, '.kiro', 'specs', 'test-feature');
    const collaborationData = {
      specName: 'test-feature',
      teamMembers: [{ name: 'Alice', role: 'editor' }]
    };
    await fs.writeFile(path.join(specPath, 'collaboration.yaml'), yaml.dump(collaborationData), 'utf8');
    
    // Create backup
    const conflictId = 'test-conflict-123';
    const backupDir = await resolver.createConflictBackup('test-feature', 'requirements', conflictId);
    
    console.assert(backupDir, 'Should return backup directory path');
    console.assert(await fs.pathExists(backupDir), 'Backup directory should exist');
    
    // Verify backup files
    const backupFiles = await fs.readdir(backupDir);
    console.assert(backupFiles.includes('requirements.md'), 'Should backup requirements document');
    console.assert(backupFiles.includes('collaboration.yaml'), 'Should backup collaboration metadata');
    console.assert(backupFiles.includes('requirements-lock.yaml'), 'Should backup lock file');
    console.assert(backupFiles.includes('backup-metadata.yaml'), 'Should create backup metadata');
    
    // Verify backup content
    const backupContent = await fs.readFile(path.join(backupDir, 'requirements.md'), 'utf8');
    console.assert(backupContent === content, 'Backup content should match original');
    
    const backupMetadata = yaml.load(await fs.readFile(path.join(backupDir, 'backup-metadata.yaml'), 'utf8'));
    console.assert(backupMetadata.conflictId === conflictId, 'Backup metadata should have correct conflict ID');
    console.assert(backupMetadata.specName === 'test-feature', 'Backup metadata should have correct spec name');
    
    console.log('✓ Conflict backup creation test passed');
    
  } catch (error) {
    console.error('✗ Conflict backup creation test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testTextMergeResolution() {
  console.log('Testing text merge resolution...');
  
  const workspace = await setupTestWorkspace();
  const resolver = new CollaborativeConflictResolution(workspace);
  
  try {
    await resolver.initializeConflictResolution();
    
    // Create document with simple conflict
    const conflictContent = `# Requirements Document

## Introduction

<<<<<<< HEAD
Original introduction text.
=======
Modified introduction text.
>>>>>>> feature-branch

## Requirements

Some requirements here.`;

    await createTestDocument(workspace, 'test-feature', 'requirements', conflictContent);
    
    // Detect and record conflict
    const { conflicts } = await resolver.detectDocumentConflicts('test-feature', 'requirements');
    const conflictRecord = {
      id: 'test-conflict-merge',
      specName: 'test-feature',
      documentType: 'requirements',
      conflicts
    };
    
    // Test text merge resolution
    const resolutionData = {
      mergeDecisions: [
        {
          action: 'keep-both',
          conflictSection: 'Original introduction text.\n=======\nModified introduction text.',
          version1: 'Original introduction text.',
          version2: 'Modified introduction text.'
        }
      ]
    };
    
    const resolutionResult = await resolver.performTextMerge(conflictRecord, resolutionData);
    
    console.assert(resolutionResult.success === true, 'Text merge should succeed');
    console.assert(resolutionResult.strategy === 'text-merge', 'Should use text-merge strategy');
    console.assert(resolutionResult.conflictsResolved > 0, 'Should resolve conflicts');
    
    // Verify merged content
    const specPath = path.join(workspace, '.kiro', 'specs', 'test-feature');
    const documentPath = path.join(specPath, 'requirements.md');
    const mergedContent = await fs.readFile(documentPath, 'utf8');
    
    console.assert(!mergedContent.includes('<<<<<<<'), 'Should not contain conflict markers');
    console.assert(!mergedContent.includes('======='), 'Should not contain conflict markers');
    console.assert(!mergedContent.includes('>>>>>>>'), 'Should not contain conflict markers');
    
    console.log('✓ Text merge resolution test passed');
    
  } catch (error) {
    console.error('✗ Text merge resolution test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testSectionMergeResolution() {
  console.log('Testing section merge resolution...');
  
  const workspace = await setupTestWorkspace();
  const resolver = new CollaborativeConflictResolution(workspace);
  
  try {
    await resolver.initializeConflictResolution();
    
    // Create document with sections
    const content = `# Requirements Document

## Introduction

Original introduction content.

## Requirements

### Requirement 1

Original requirement content.

## Conclusion

Original conclusion.`;

    await createTestDocument(workspace, 'test-feature', 'requirements', content);
    
    const conflictRecord = {
      id: 'test-section-merge',
      specName: 'test-feature',
      documentType: 'requirements',
      conflicts: []
    };
    
    // Test section merge with decisions
    const resolutionData = {
      sectionDecisions: [
        {
          sectionName: 'Introduction',
          action: 'replace-content',
          newContent: ['Updated introduction content.']
        },
        {
          sectionName: 'Requirement 1',
          action: 'merge-content',
          mergeWith: 'Additional requirement details.'
        }
      ]
    };
    
    const resolutionResult = await resolver.performSectionMerge(conflictRecord, resolutionData);
    
    console.assert(resolutionResult.success === true, 'Section merge should succeed');
    console.assert(resolutionResult.strategy === 'section-merge', 'Should use section-merge strategy');
    console.assert(resolutionResult.sectionsProcessed > 0, 'Should process sections');
    console.assert(resolutionResult.sectionsMerged === 2, 'Should merge 2 sections');
    
    // Verify merged content
    const specPath = path.join(workspace, '.kiro', 'specs', 'test-feature');
    const documentPath = path.join(specPath, 'requirements.md');
    const mergedContent = await fs.readFile(documentPath, 'utf8');
    
    console.assert(mergedContent.includes('Updated introduction content'), 'Should have updated introduction');
    console.assert(mergedContent.includes('Additional requirement details'), 'Should have merged requirement content');
    
    console.log('✓ Section merge resolution test passed');
    
  } catch (error) {
    console.error('✗ Section merge resolution test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testManualReviewResolution() {
  console.log('Testing manual review resolution...');
  
  const workspace = await setupTestWorkspace();
  const resolver = new CollaborativeConflictResolution(workspace);
  
  try {
    await resolver.initializeConflictResolution();
    
    const conflictRecord = {
      id: 'test-manual-review',
      specName: 'test-feature',
      documentType: 'requirements',
      conflicts: [
        { type: 'merge-conflict', severity: 'high' }
      ]
    };
    
    // Test manual review resolution
    const resolutionResult = await resolver.performManualReview(conflictRecord, {});
    
    console.assert(resolutionResult.success === true, 'Manual review should succeed');
    console.assert(resolutionResult.strategy === 'manual-review', 'Should use manual-review strategy');
    console.assert(resolutionResult.requiresHumanIntervention === true, 'Should require human intervention');
    console.assert(resolutionResult.guidanceFile, 'Should provide guidance file');
    
    // Verify guidance file was created
    console.assert(await fs.pathExists(resolutionResult.guidanceFile), 'Guidance file should exist');
    
    const guidance = yaml.load(await fs.readFile(resolutionResult.guidanceFile, 'utf8'));
    console.assert(guidance.conflictId === conflictRecord.id, 'Guidance should reference correct conflict');
    console.assert(guidance.reviewInstructions.length > 0, 'Should provide review instructions');
    console.assert(guidance.resolutionCommands.length > 0, 'Should provide resolution commands');
    
    console.log('✓ Manual review resolution test passed');
    
  } catch (error) {
    console.error('✗ Manual review resolution test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testApprovalRequiredResolution() {
  console.log('Testing approval required resolution...');
  
  const workspace = await setupTestWorkspace();
  const resolver = new CollaborativeConflictResolution(workspace);
  
  try {
    await resolver.initializeConflictResolution();
    
    const conflictRecord = {
      id: 'test-approval-required',
      specName: 'test-feature',
      documentType: 'requirements',
      conflicts: [
        { type: 'version-conflict', severity: 'medium' }
      ]
    };
    
    // Test approval required resolution
    const resolutionData = {
      requestedBy: 'Alice',
      proposedResolution: 'Merge both versions with manual review',
      approvers: [
        { name: 'Bob', role: 'reviewer' },
        { name: 'Charlie', role: 'approver' }
      ],
      approvalThreshold: 1
    };
    
    const resolutionResult = await resolver.performApprovalResolution(conflictRecord, resolutionData);
    
    console.assert(resolutionResult.success === true, 'Approval resolution should succeed');
    console.assert(resolutionResult.strategy === 'approval-required', 'Should use approval-required strategy');
    console.assert(resolutionResult.requiresApproval === true, 'Should require approval');
    console.assert(resolutionResult.pendingApprovals === 2, 'Should have 2 pending approvals');
    
    // Verify approval file was created
    console.assert(await fs.pathExists(resolutionResult.approvalFile), 'Approval file should exist');
    
    const approval = yaml.load(await fs.readFile(resolutionResult.approvalFile, 'utf8'));
    console.assert(approval.conflictId === conflictRecord.id, 'Approval should reference correct conflict');
    console.assert(approval.requestedBy === 'Alice', 'Should be requested by Alice');
    console.assert(approval.approvers.length === 2, 'Should have 2 approvers');
    console.assert(approval.status === 'pending', 'Status should be pending');
    
    console.log('✓ Approval required resolution test passed');
    
  } catch (error) {
    console.error('✗ Approval required resolution test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function testActiveConflictsRetrieval() {
  console.log('Testing active conflicts retrieval...');
  
  const workspace = await setupTestWorkspace();
  const resolver = new CollaborativeConflictResolution(workspace);
  
  try {
    await resolver.initializeConflictResolution();
    
    // Create some test conflicts
    const conflictsPath = path.join(workspace, '.kiro', 'collaboration', 'conflicts');
    
    const conflict1 = {
      id: 'conflict-1',
      specName: 'test-feature',
      documentType: 'requirements',
      status: 'detected',
      conflicts: []
    };
    
    const conflict2 = {
      id: 'conflict-2',
      specName: 'test-feature',
      documentType: 'design',
      status: 'resolved',
      conflicts: []
    };
    
    const conflict3 = {
      id: 'conflict-3',
      specName: 'other-feature',
      documentType: 'requirements',
      status: 'detected',
      conflicts: []
    };
    
    await fs.writeFile(path.join(conflictsPath, 'conflict-1.yaml'), yaml.dump(conflict1), 'utf8');
    await fs.writeFile(path.join(conflictsPath, 'conflict-2.yaml'), yaml.dump(conflict2), 'utf8');
    await fs.writeFile(path.join(conflictsPath, 'conflict-3.yaml'), yaml.dump(conflict3), 'utf8');
    
    // Test getting all active conflicts
    const allActiveConflicts = await resolver.getActiveConflicts();
    console.assert(allActiveConflicts.length === 2, 'Should have 2 active conflicts (excluding resolved)');
    
    // Test getting active conflicts for specific spec
    const specActiveConflicts = await resolver.getActiveConflicts('test-feature');
    console.assert(specActiveConflicts.length === 1, 'Should have 1 active conflict for test-feature');
    console.assert(specActiveConflicts[0].id === 'conflict-1', 'Should return conflict-1');
    
    console.log('✓ Active conflicts retrieval test passed');
    
  } catch (error) {
    console.error('✗ Active conflicts retrieval test failed:', error.message);
    throw error;
  } finally {
    await cleanupTestWorkspace();
  }
}

async function runAllTests() {
  console.log('Running Collaborative Conflict Resolution tests...\n');
  
  try {
    await testConflictResolutionInitialization();
    await testConflictDetection();
    await testSimultaneousEditingDetection();
    await testConflictBackupCreation();
    await testTextMergeResolution();
    await testSectionMergeResolution();
    await testManualReviewResolution();
    await testApprovalRequiredResolution();
    await testActiveConflictsRetrieval();
    
    console.log('\n✅ All Collaborative Conflict Resolution tests passed!');
    
  } catch (error) {
    console.error('\n❌ Collaborative Conflict Resolution tests failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testConflictResolutionInitialization,
  testConflictDetection,
  testSimultaneousEditingDetection,
  testConflictBackupCreation,
  testTextMergeResolution,
  testSectionMergeResolution,
  testManualReviewResolution,
  testApprovalRequiredResolution,
  testActiveConflictsRetrieval,
  runAllTests
};