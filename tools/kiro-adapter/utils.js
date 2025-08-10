/**
 * Kiro Adapter Utilities
 * Common utility functions for Kiro integration
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Check if a path is within a Kiro workspace
 * @param {string} targetPath - Path to check
 * @returns {Promise<boolean>} - True if within Kiro workspace
 */
async function isWithinKiroWorkspace(targetPath) {
  let currentPath = path.resolve(targetPath);
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    const kiroPath = path.join(currentPath, '.kiro');
    const exists = await fs.pathExists(kiroPath);
    
    if (exists) {
      return true;
    }

    currentPath = path.dirname(currentPath);
  }

  return false;
}

/**
 * Find the Kiro workspace root from any path within it
 * @param {string} startPath - Starting path
 * @returns {Promise<string|null>} - Workspace root or null
 */
async function findKiroWorkspaceRoot(startPath) {
  let currentPath = path.resolve(startPath);
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    const kiroPath = path.join(currentPath, '.kiro');
    const exists = await fs.pathExists(kiroPath);
    
    if (exists) {
      return currentPath;
    }

    currentPath = path.dirname(currentPath);
  }

  return null;
}

/**
 * Normalize agent name for file system usage
 * @param {string} agentName - Original agent name
 * @returns {string} - Normalized name
 */
function normalizeAgentName(agentName) {
  return agentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract BMad agent type from file name or content
 * @param {string} fileName - Agent file name
 * @param {string} content - Agent content (optional)
 * @returns {string} - Agent type
 */
function extractBMadAgentType(fileName, content = '') {
  const baseName = path.basename(fileName, '.md').toLowerCase();
  
  // Common BMad agent patterns
  const typePatterns = {
    'pm': /\b(pm|product-manager|product_manager)\b/,
    'architect': /\b(architect|architecture)\b/,
    'dev': /\b(dev|developer|development)\b/,
    'qa': /\b(qa|quality|testing|test)\b/,
    'sm': /\b(sm|scrum-master|scrum_master)\b/,
    'po': /\b(po|product-owner|product_owner)\b/,
    'analyst': /\b(analyst|analysis|ba|business-analyst)\b/,
    'ux': /\b(ux|user-experience|ui|design)\b/
  };

  // Check file name first
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(baseName)) {
      return type;
    }
  }

  // Check content if provided
  if (content) {
    const lowerContent = content.toLowerCase();
    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(lowerContent)) {
        return type;
      }
    }
  }

  return 'generic';
}

/**
 * Generate unique file name to avoid conflicts
 * @param {string} basePath - Base directory path
 * @param {string} fileName - Desired file name
 * @returns {Promise<string>} - Unique file name
 */
async function generateUniqueFileName(basePath, fileName) {
  const ext = path.extname(fileName);
  const name = path.basename(fileName, ext);
  let counter = 1;
  let uniqueName = fileName;

  while (await fs.pathExists(path.join(basePath, uniqueName))) {
    uniqueName = `${name}-${counter}${ext}`;
    counter++;
  }

  return uniqueName;
}

/**
 * Validate Kiro spec directory structure
 * @param {string} specPath - Path to spec directory
 * @returns {Promise<Object>} - Validation result
 */
async function validateKiroSpecStructure(specPath) {
  const result = {
    isValid: true,
    missingFiles: [],
    errors: []
  };

  const requiredFiles = ['requirements.md', 'design.md', 'tasks.md'];

  try {
    for (const file of requiredFiles) {
      const filePath = path.join(specPath, file);
      const exists = await fs.pathExists(filePath);
      
      if (!exists) {
        result.missingFiles.push(file);
        result.isValid = false;
      }
    }
  } catch (error) {
    result.errors.push(error.message);
    result.isValid = false;
  }

  return result;
}

/**
 * Create backup of existing file
 * @param {string} filePath - File to backup
 * @returns {Promise<string|null>} - Backup file path or null
 */
async function createBackup(filePath) {
  try {
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;
    
    await fs.copy(filePath, backupPath);
    return backupPath;
  } catch (error) {
    console.error('Error creating backup:', error.message);
    return null;
  }
}

/**
 * Clean up old backup files
 * @param {string} directory - Directory to clean
 * @param {number} maxAge - Maximum age in days
 * @returns {Promise<number>} - Number of files cleaned
 */
async function cleanupOldBackups(directory, maxAge = 7) {
  try {
    const files = await fs.readdir(directory);
    const backupFiles = files.filter(file => file.includes('.backup-'));
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const file of backupFiles) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      const age = Date.now() - stats.mtime.getTime();

      if (age > maxAgeMs) {
        await fs.remove(filePath);
        cleanedCount++;
      }
    }

    return cleanedCount;
  } catch (error) {
    console.error('Error cleaning up backups:', error.message);
    return 0;
  }
}

module.exports = {
  isWithinKiroWorkspace,
  findKiroWorkspaceRoot,
  normalizeAgentName,
  extractBMadAgentType,
  generateUniqueFileName,
  validateKiroSpecStructure,
  createBackup,
  cleanupOldBackups
};