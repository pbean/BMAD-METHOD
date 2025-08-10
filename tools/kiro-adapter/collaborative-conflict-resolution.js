/**
 * Collaborative Conflict Resolution for BMad Planning
 * 
 * This module implements conflict detection and resolution for simultaneous
 * document editing, merge conflict resolution tools, and version control
 * integration for planning artifact management.
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');

class CollaborativeConflictResolution {
  constructor(workspacePath = '.') {
    this.workspacePath = workspacePath;
    this.kiroPath = path.join(workspacePath, '.kiro');
    this.conflictsPath = path.join(this.kiroPath, 'collaboration', 'conflicts');
    this.backupsPath = path.join(this.kiroPath, 'collaboration', 'backups');
    this.versionsPath = path.join(this.kiroPath, 'collaboration', 'versions');
  }

  /**
   * Initialize conflict resolution infrastructure
   */
  async initializeConflictResolution() {
    // Create conflict resolution directories
    await fs.ensureDir(this.conflictsPath);
    await fs.ensureDir(this.backupsPath);
    await fs.ensureDir(this.versionsPath);

    // Create conflict resolution configuration
    const conflictConfig = {
      version: '1.0.0',
      enabled: true,
      detection: {
        checkInterval: 5000, // Check for conflicts every 5 seconds
        conflictMarkers: ['<<<<<<< HEAD', '=======', '>>>>>>> '],
        autoDetect: true,
        trackChanges: true
      },
      resolution: {
        strategy: 'merge-with-review',
        autoResolve: false,
        requireApproval: true,
        backupOnConflict: true,
        maxConflictAge: 86400000 // 24 hours in milliseconds
      },
      mergeStrategies: {
        'text-merge': {
          enabled: true,
          priority: 1,
          description: 'Automatic text merging for non-conflicting changes'
        },
        'section-merge': {
          enabled: true,
          priority: 2,
          description: 'Merge changes by document sections'
        },
        'manual-review': {
          enabled: true,
          priority: 3,
          description: 'Manual review and resolution required'
        },
        'approval-required': {
          enabled: true,
          priority: 4,
          description: 'Team approval required for resolution'
        }
      },
      notifications: {
        onConflictDetected: true,
        onConflictResolved: true,
        onResolutionFailed: true,
        channels: ['file-comments', 'toast-notifications', 'activity-log']
      }
    };

    await fs.writeFile(
      path.join(this.conflictsPath, 'config.yaml'),
      yaml.dump(conflictConfig),
      'utf8'
    );

    return conflictConfig;
  }

  /**
   * Detect conflicts in simultaneous document editing
   */
  async detectDocumentConflicts(specName, documentType) {
    const specPath = path.join(this.kiroPath, 'specs', specName);
    const documentPath = path.join(specPath, `${documentType}.md`);
    const lockPath = path.join(specPath, `${documentType}-lock.yaml`);
    
    if (!await fs.pathExists(documentPath) || !await fs.pathExists(lockPath)) {
      return { hasConflicts: false, conflicts: [] };
    }

    const documentContent = await fs.readFile(documentPath, 'utf8');
    const lockData = yaml.load(await fs.readFile(lockPath, 'utf8'));
    
    // Check for conflict markers
    const conflictMarkers = ['<<<<<<< HEAD', '=======', '>>>>>>> '];
    const hasConflictMarkers = conflictMarkers.some(marker => documentContent.includes(marker));
    
    // Check for simultaneous editing
    const simultaneousEditors = await this.checkSimultaneousEditing(specName, documentType);
    
    // Check for version conflicts
    const versionConflicts = await this.checkVersionConflicts(specName, documentType);
    
    const conflicts = [];
    
    if (hasConflictMarkers) {
      conflicts.push({
        type: 'merge-conflict',
        severity: 'high',
        description: 'Git merge conflict markers detected in document',
        location: this.findConflictMarkerLocations(documentContent),
        resolution: 'manual-merge-required'
      });
    }
    
    if (simultaneousEditors.length > 1) {
      conflicts.push({
        type: 'simultaneous-editing',
        severity: 'medium',
        description: 'Multiple users editing document simultaneously',
        editors: simultaneousEditors,
        resolution: 'coordination-required'
      });
    }
    
    if (versionConflicts.length > 0) {
      conflicts.push({
        type: 'version-conflict',
        severity: 'medium',
        description: 'Document versions are out of sync',
        conflicts: versionConflicts,
        resolution: 'version-merge-required'
      });
    }

    const hasConflicts = conflicts.length > 0;
    
    if (hasConflicts) {
      await this.recordConflict(specName, documentType, conflicts);
    }

    return { hasConflicts, conflicts };
  }

  /**
   * Check for simultaneous editing
   */
  async checkSimultaneousEditing(specName, documentType) {
    const specPath = path.join(this.kiroPath, 'specs', specName);
    const lockPath = path.join(specPath, `${documentType}-lock.yaml`);
    
    if (!await fs.pathExists(lockPath)) {
      return [];
    }

    const lockData = yaml.load(await fs.readFile(lockPath, 'utf8'));
    const now = new Date();
    const lockTime = new Date(lockData.lockedAt);
    const timeDiff = now - lockTime;
    
    // Consider editing simultaneous if within 5 minutes
    const simultaneousThreshold = 5 * 60 * 1000; // 5 minutes
    
    const activeEditors = [];
    
    // Check if primary lock is recent
    if (timeDiff < simultaneousThreshold) {
      activeEditors.push({
        name: lockData.lockedBy,
        lockedAt: lockData.lockedAt,
        type: 'primary'
      });
    }
    
    // Check for secondary locks (collaborative editing)
    if (lockData.collaborativeEdits) {
      for (const edit of lockData.collaborativeEdits) {
        const editTime = new Date(edit.timestamp);
        const editTimeDiff = now - editTime;
        
        if (editTimeDiff < simultaneousThreshold) {
          activeEditors.push({
            name: edit.editor,
            lockedAt: edit.timestamp,
            type: 'collaborative'
          });
        }
      }
    }
    
    return activeEditors;
  }

  /**
   * Check for version conflicts
   */
  async checkVersionConflicts(specName, documentType) {
    const versionPath = path.join(this.versionsPath, `${specName}-${documentType}`);
    
    if (!await fs.pathExists(versionPath)) {
      return [];
    }

    const versionFiles = await fs.readdir(versionPath);
    const versions = [];
    
    for (const versionFile of versionFiles) {
      if (versionFile.endsWith('.yaml')) {
        const versionData = yaml.load(await fs.readFile(path.join(versionPath, versionFile), 'utf8'));
        versions.push(versionData);
      }
    }
    
    // Sort versions by timestamp
    versions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const conflicts = [];
    
    // Check for overlapping edits
    for (let i = 1; i < versions.length; i++) {
      const current = versions[i];
      const previous = versions[i - 1];
      
      // Check if edits overlap in time
      const currentStart = new Date(current.editStarted);
      const previousEnd = new Date(previous.editCompleted || previous.timestamp);
      
      if (currentStart < previousEnd) {
        conflicts.push({
          type: 'overlapping-edit',
          currentVersion: current,
          previousVersion: previous,
          overlapDuration: previousEnd - currentStart
        });
      }
      
      // Check for conflicting content changes
      if (current.contentHash && previous.contentHash) {
        const contentConflict = await this.detectContentConflicts(current, previous);
        if (contentConflict) {
          conflicts.push({
            type: 'content-conflict',
            currentVersion: current,
            previousVersion: previous,
            conflictingSections: contentConflict.sections
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Find conflict marker locations in document
   */
  findConflictMarkerLocations(content) {
    const lines = content.split('\n');
    const locations = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('<<<<<<<') || line.includes('=======') || line.includes('>>>>>>>')) {
        locations.push({
          line: i + 1,
          content: line.trim(),
          type: line.includes('<<<<<<<') ? 'start' : line.includes('=======') ? 'separator' : 'end'
        });
      }
    }
    
    return locations;
  }

  /**
   * Record conflict for tracking and resolution
   */
  async recordConflict(specName, documentType, conflicts) {
    const conflictId = `${specName}-${documentType}-${Date.now()}`;
    const conflictRecord = {
      id: conflictId,
      specName,
      documentType,
      detectedAt: new Date().toISOString(),
      status: 'detected',
      conflicts,
      resolution: null,
      resolvedAt: null,
      resolvedBy: null,
      backupCreated: false
    };

    // Create backup before recording conflict
    await this.createConflictBackup(specName, documentType, conflictId);
    conflictRecord.backupCreated = true;

    const conflictFile = path.join(this.conflictsPath, `${conflictId}.yaml`);
    await fs.writeFile(conflictFile, yaml.dump(conflictRecord), 'utf8');

    // Trigger conflict notification
    await this.triggerConflictNotification(conflictRecord);

    return conflictRecord;
  }

  /**
   * Create backup of document before conflict resolution
   */
  async createConflictBackup(specName, documentType, conflictId) {
    const specPath = path.join(this.kiroPath, 'specs', specName);
    const documentPath = path.join(specPath, `${documentType}.md`);
    
    if (!await fs.pathExists(documentPath)) {
      return null;
    }

    const backupDir = path.join(this.backupsPath, conflictId);
    await fs.ensureDir(backupDir);

    // Backup main document
    const documentContent = await fs.readFile(documentPath, 'utf8');
    await fs.writeFile(path.join(backupDir, `${documentType}.md`), documentContent, 'utf8');

    // Backup collaboration metadata
    const collaborationPath = path.join(specPath, 'collaboration.yaml');
    if (await fs.pathExists(collaborationPath)) {
      const collaborationContent = await fs.readFile(collaborationPath, 'utf8');
      await fs.writeFile(path.join(backupDir, 'collaboration.yaml'), collaborationContent, 'utf8');
    }

    // Backup lock file
    const lockPath = path.join(specPath, `${documentType}-lock.yaml`);
    if (await fs.pathExists(lockPath)) {
      const lockContent = await fs.readFile(lockPath, 'utf8');
      await fs.writeFile(path.join(backupDir, `${documentType}-lock.yaml`), lockContent, 'utf8');
    }

    // Create backup metadata
    const backupMetadata = {
      conflictId,
      specName,
      documentType,
      createdAt: new Date().toISOString(),
      files: [`${documentType}.md`, 'collaboration.yaml', `${documentType}-lock.yaml`]
    };

    await fs.writeFile(path.join(backupDir, 'backup-metadata.yaml'), yaml.dump(backupMetadata), 'utf8');

    return backupDir;
  }

  /**
   * Resolve conflicts using different merge strategies
   */
  async resolveConflict(conflictId, resolutionStrategy, resolvedBy, resolutionData = {}) {
    const conflictFile = path.join(this.conflictsPath, `${conflictId}.yaml`);
    
    if (!await fs.pathExists(conflictFile)) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    const conflictRecord = yaml.load(await fs.readFile(conflictFile, 'utf8'));
    
    let resolutionResult;
    
    switch (resolutionStrategy) {
      case 'text-merge':
        resolutionResult = await this.performTextMerge(conflictRecord, resolutionData);
        break;
      case 'section-merge':
        resolutionResult = await this.performSectionMerge(conflictRecord, resolutionData);
        break;
      case 'manual-review':
        resolutionResult = await this.performManualReview(conflictRecord, resolutionData);
        break;
      case 'approval-required':
        resolutionResult = await this.performApprovalResolution(conflictRecord, resolutionData);
        break;
      default:
        throw new Error(`Unknown resolution strategy: ${resolutionStrategy}`);
    }

    // Update conflict record
    conflictRecord.status = resolutionResult.success ? 'resolved' : 'resolution-failed';
    conflictRecord.resolution = {
      strategy: resolutionStrategy,
      resolvedBy,
      resolvedAt: new Date().toISOString(),
      result: resolutionResult,
      data: resolutionData
    };

    await fs.writeFile(conflictFile, yaml.dump(conflictRecord), 'utf8');

    // Create version record of resolution
    await this.createResolutionVersion(conflictRecord, resolutionResult);

    // Trigger resolution notification
    await this.triggerResolutionNotification(conflictRecord);

    return conflictRecord;
  }

  /**
   * Perform automatic text merge
   */
  async performTextMerge(conflictRecord, resolutionData) {
    const specPath = path.join(this.kiroPath, 'specs', conflictRecord.specName);
    const documentPath = path.join(specPath, `${conflictRecord.documentType}.md`);
    
    if (!await fs.pathExists(documentPath)) {
      return { success: false, error: 'Document not found' };
    }

    const content = await fs.readFile(documentPath, 'utf8');
    
    // Simple text merge - remove conflict markers and merge non-conflicting sections
    let mergedContent = content;
    
    // Remove conflict markers for simple cases
    mergedContent = mergedContent.replace(/<<<<<<< HEAD\n/g, '');
    mergedContent = mergedContent.replace(/=======\n/g, '');
    mergedContent = mergedContent.replace(/>>>>>>> .*\n/g, '');
    
    // Apply any provided merge decisions
    if (resolutionData.mergeDecisions) {
      for (const decision of resolutionData.mergeDecisions) {
        if (decision.action === 'keep-both') {
          // Keep both versions with clear separation
          mergedContent = mergedContent.replace(
            decision.conflictSection,
            `${decision.version1}\n\n${decision.version2}`
          );
        } else if (decision.action === 'keep-version1') {
          mergedContent = mergedContent.replace(decision.conflictSection, decision.version1);
        } else if (decision.action === 'keep-version2') {
          mergedContent = mergedContent.replace(decision.conflictSection, decision.version2);
        }
      }
    }

    // Write merged content
    await fs.writeFile(documentPath, mergedContent, 'utf8');

    return {
      success: true,
      strategy: 'text-merge',
      mergedLines: mergedContent.split('\n').length,
      conflictsResolved: conflictRecord.conflicts.length
    };
  }

  /**
   * Perform section-based merge
   */
  async performSectionMerge(conflictRecord, resolutionData) {
    const specPath = path.join(this.kiroPath, 'specs', conflictRecord.specName);
    const documentPath = path.join(specPath, `${conflictRecord.documentType}.md`);
    
    if (!await fs.pathExists(documentPath)) {
      return { success: false, error: 'Document not found' };
    }

    const content = await fs.readFile(documentPath, 'utf8');
    const sections = this.parseDocumentSections(content);
    
    // Merge sections based on resolution data
    const mergedSections = [];
    
    for (const section of sections) {
      const sectionDecision = resolutionData.sectionDecisions?.find(d => d.sectionName === section.name);
      
      if (sectionDecision) {
        switch (sectionDecision.action) {
          case 'merge-content':
            mergedSections.push({
              ...section,
              content: this.mergeSectionContent(section.content, sectionDecision.mergeWith)
            });
            break;
          case 'replace-content':
            mergedSections.push({
              ...section,
              content: sectionDecision.newContent
            });
            break;
          case 'keep-original':
          default:
            mergedSections.push(section);
            break;
        }
      } else {
        mergedSections.push(section);
      }
    }

    // Reconstruct document
    const mergedContent = this.reconstructDocument(mergedSections);
    await fs.writeFile(documentPath, mergedContent, 'utf8');

    return {
      success: true,
      strategy: 'section-merge',
      sectionsProcessed: sections.length,
      sectionsMerged: resolutionData.sectionDecisions?.length || 0
    };
  }

  /**
   * Perform manual review resolution
   */
  async performManualReview(conflictRecord, resolutionData) {
    // Manual review requires human intervention
    // Mark conflict as requiring manual review and provide guidance
    
    const reviewGuidance = {
      conflictId: conflictRecord.id,
      specName: conflictRecord.specName,
      documentType: conflictRecord.documentType,
      conflicts: conflictRecord.conflicts,
      reviewInstructions: [
        '1. Open the document and review conflict markers',
        '2. Decide which changes to keep for each conflict',
        '3. Remove conflict markers after resolution',
        '4. Test that the document is valid',
        '5. Mark conflict as resolved'
      ],
      backupLocation: path.join(this.backupsPath, conflictRecord.id),
      resolutionCommands: [
        `bmad.resolveConflict('${conflictRecord.id}', 'manual-complete')`,
        `bmad.revertConflict('${conflictRecord.id}')`
      ]
    };

    const guidanceFile = path.join(this.conflictsPath, `${conflictRecord.id}-review-guidance.yaml`);
    await fs.writeFile(guidanceFile, yaml.dump(reviewGuidance), 'utf8');

    return {
      success: true,
      strategy: 'manual-review',
      requiresHumanIntervention: true,
      guidanceFile,
      nextSteps: 'Manual review required - see guidance file'
    };
  }

  /**
   * Perform approval-required resolution
   */
  async performApprovalResolution(conflictRecord, resolutionData) {
    // Create approval request for team members
    const approvalRequest = {
      conflictId: conflictRecord.id,
      specName: conflictRecord.specName,
      documentType: conflictRecord.documentType,
      requestedAt: new Date().toISOString(),
      requestedBy: resolutionData.requestedBy,
      proposedResolution: resolutionData.proposedResolution,
      approvers: resolutionData.approvers || [],
      approvals: [],
      status: 'pending',
      approvalThreshold: resolutionData.approvalThreshold || 1
    };

    const approvalFile = path.join(this.conflictsPath, `${conflictRecord.id}-approval.yaml`);
    await fs.writeFile(approvalFile, yaml.dump(approvalRequest), 'utf8');

    // Send approval notifications to team members
    for (const approver of approvalRequest.approvers) {
      await this.sendApprovalNotification(conflictRecord, approver, approvalRequest);
    }

    return {
      success: true,
      strategy: 'approval-required',
      requiresApproval: true,
      approvalFile,
      pendingApprovals: approvalRequest.approvers.length,
      nextSteps: 'Waiting for team approval'
    };
  }

  /**
   * Parse document into sections
   */
  parseDocumentSections(content) {
    const lines = content.split('\n');
    const sections = [];
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for section headers (markdown headers)
      if (line.match(/^#+\s+/)) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          name: line.replace(/^#+\s+/, '').trim(),
          header: line,
          content: [],
          startLine: i,
          endLine: i
        };
      } else if (currentSection) {
        currentSection.content.push(line);
        currentSection.endLine = i;
      }
    }

    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Merge section content
   */
  mergeSectionContent(originalContent, mergeWith) {
    // Simple merge - combine unique lines
    const originalLines = originalContent;
    const mergeLines = mergeWith.split('\n');
    
    const mergedLines = [...originalLines];
    
    for (const mergeLine of mergeLines) {
      if (!originalLines.includes(mergeLine) && mergeLine.trim() !== '') {
        mergedLines.push(mergeLine);
      }
    }
    
    return mergedLines;
  }

  /**
   * Reconstruct document from sections
   */
  reconstructDocument(sections) {
    const lines = [];
    
    for (const section of sections) {
      lines.push(section.header);
      lines.push(...section.content);
      lines.push(''); // Add blank line between sections
    }
    
    return lines.join('\n');
  }

  /**
   * Create version record of resolution
   */
  async createResolutionVersion(conflictRecord, resolutionResult) {
    const versionDir = path.join(this.versionsPath, `${conflictRecord.specName}-${conflictRecord.documentType}`);
    await fs.ensureDir(versionDir);

    const versionRecord = {
      id: `resolution-${conflictRecord.id}`,
      specName: conflictRecord.specName,
      documentType: conflictRecord.documentType,
      timestamp: new Date().toISOString(),
      type: 'conflict-resolution',
      conflictId: conflictRecord.id,
      resolutionStrategy: resolutionResult.strategy,
      resolvedBy: conflictRecord.resolution.resolvedBy,
      changes: resolutionResult,
      contentHash: await this.calculateContentHash(conflictRecord.specName, conflictRecord.documentType)
    };

    const versionFile = path.join(versionDir, `${versionRecord.id}.yaml`);
    await fs.writeFile(versionFile, yaml.dump(versionRecord), 'utf8');

    return versionRecord;
  }

  /**
   * Calculate content hash for version tracking
   */
  async calculateContentHash(specName, documentType) {
    const specPath = path.join(this.kiroPath, 'specs', specName);
    const documentPath = path.join(specPath, `${documentType}.md`);
    
    if (!await fs.pathExists(documentPath)) {
      return null;
    }

    const content = await fs.readFile(documentPath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Detect content conflicts between versions
   */
  async detectContentConflicts(currentVersion, previousVersion) {
    // Simple conflict detection based on content hash differences
    if (currentVersion.contentHash === previousVersion.contentHash) {
      return null;
    }

    // More sophisticated conflict detection would go here
    // For now, just report that content differs
    return {
      type: 'content-difference',
      sections: ['content-hash-mismatch']
    };
  }

  /**
   * Trigger conflict notification
   */
  async triggerConflictNotification(conflictRecord) {
    // This would integrate with the notification system
    console.log(`Conflict detected: ${conflictRecord.id} in ${conflictRecord.specName}/${conflictRecord.documentType}`);
    return conflictRecord;
  }

  /**
   * Trigger resolution notification
   */
  async triggerResolutionNotification(conflictRecord) {
    // This would integrate with the notification system
    console.log(`Conflict resolved: ${conflictRecord.id} using ${conflictRecord.resolution.strategy}`);
    return conflictRecord;
  }

  /**
   * Send approval notification
   */
  async sendApprovalNotification(conflictRecord, approver, approvalRequest) {
    // This would integrate with the notification system
    console.log(`Approval requested from ${approver.name} for conflict ${conflictRecord.id}`);
    return approvalRequest;
  }

  /**
   * Get all active conflicts
   */
  async getActiveConflicts(specName = null) {
    const conflictFiles = await fs.readdir(this.conflictsPath);
    const conflicts = [];

    for (const file of conflictFiles) {
      if (file.endsWith('.yaml') && !file.includes('config') && !file.includes('guidance') && !file.includes('approval')) {
        const conflictData = yaml.load(await fs.readFile(path.join(this.conflictsPath, file), 'utf8'));
        
        if (conflictData.status === 'detected' || conflictData.status === 'resolution-failed') {
          if (!specName || conflictData.specName === specName) {
            conflicts.push(conflictData);
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Revert to backup if resolution fails
   */
  async revertToBackup(conflictId) {
    const backupDir = path.join(this.backupsPath, conflictId);
    
    if (!await fs.pathExists(backupDir)) {
      throw new Error(`Backup not found for conflict: ${conflictId}`);
    }

    const backupMetadata = yaml.load(await fs.readFile(path.join(backupDir, 'backup-metadata.yaml'), 'utf8'));
    const specPath = path.join(this.kiroPath, 'specs', backupMetadata.specName);

    // Restore files from backup
    for (const file of backupMetadata.files) {
      const backupFile = path.join(backupDir, file);
      const targetFile = path.join(specPath, file);
      
      if (await fs.pathExists(backupFile)) {
        await fs.copy(backupFile, targetFile);
      }
    }

    // Update conflict record
    const conflictFile = path.join(this.conflictsPath, `${conflictId}.yaml`);
    if (await fs.pathExists(conflictFile)) {
      const conflictRecord = yaml.load(await fs.readFile(conflictFile, 'utf8'));
      conflictRecord.status = 'reverted';
      conflictRecord.revertedAt = new Date().toISOString();
      
      await fs.writeFile(conflictFile, yaml.dump(conflictRecord), 'utf8');
    }

    return { success: true, message: 'Successfully reverted to backup' };
  }
}

module.exports = CollaborativeConflictResolution;