const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

class InstallationErrorHandler {
  constructor() {
    this.backupDir = null;
    this.rollbackActions = [];
  }

  /**
   * Validates Kiro workspace with comprehensive error messages
   * @param {string} directory - Directory to validate
   * @returns {Promise<{isValid: boolean, errors: Array, warnings: Array, guidance: Array}>}
   */
  async validateKiroWorkspace(directory) {
    const errors = [];
    const warnings = [];
    const guidance = [];

    try {
      // Check if directory exists and is accessible
      if (!await fs.pathExists(directory)) {
        errors.push({
          code: 'DIRECTORY_NOT_FOUND',
          message: `Installation directory does not exist: ${directory}`,
          solution: 'Create the directory or specify a valid installation path'
        });
        return { isValid: false, errors, warnings, guidance };
      }

      // Check directory permissions
      try {
        await fs.access(directory, fs.constants.R_OK | fs.constants.W_OK);
      } catch (permError) {
        errors.push({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Insufficient permissions to access directory: ${directory}`,
          solution: 'Ensure you have read/write permissions to the installation directory'
        });
        return { isValid: false, errors, warnings, guidance };
      }

      // Check for Kiro workspace indicators
      const kiroDir = path.join(directory, '.kiro');
      const hasKiroDir = await fs.pathExists(kiroDir);

      if (!hasKiroDir) {
        warnings.push({
          code: 'NO_KIRO_DIRECTORY',
          message: 'No .kiro directory found',
          solution: 'Will create Kiro workspace structure during installation'
        });
        guidance.push('This appears to be a new Kiro workspace setup');
      }

      // Check for package.json (common in Kiro projects)
      const packageJsonPath = path.join(directory, 'package.json');
      if (!await fs.pathExists(packageJsonPath)) {
        warnings.push({
          code: 'NO_PACKAGE_JSON',
          message: 'No package.json found',
          solution: 'Consider initializing a Node.js project with npm init'
        });
      }

      // Check for existing BMad installation
      const existingBMadCheck = await this.checkExistingBMadInstallation(directory);
      if (existingBMadCheck.hasConflicts) {
        warnings.push({
          code: 'EXISTING_BMAD_INSTALLATION',
          message: existingBMadCheck.message,
          solution: 'Use --upgrade flag to update existing installation'
        });
      }

      // Check disk space
      const spaceCheck = await this.checkDiskSpace(directory);
      if (!spaceCheck.sufficient) {
        errors.push({
          code: 'INSUFFICIENT_DISK_SPACE',
          message: `Insufficient disk space. Required: ${spaceCheck.required}MB, Available: ${spaceCheck.available}MB`,
          solution: 'Free up disk space or choose a different installation directory'
        });
      }

      // Check Node.js version compatibility
      const nodeCheck = await this.checkNodeVersion();
      if (!nodeCheck.compatible) {
        errors.push({
          code: 'INCOMPATIBLE_NODE_VERSION',
          message: `Node.js version ${nodeCheck.current} is not compatible. Required: ${nodeCheck.required}`,
          solution: 'Update Node.js to a compatible version'
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        guidance
      };

    } catch (error) {
      errors.push({
        code: 'VALIDATION_ERROR',
        message: `Unexpected error during validation: ${error.message}`,
        solution: 'Check system permissions and try again'
      });
      
      return { isValid: false, errors, warnings, guidance };
    }
  }

  /**
   * Checks for required Kiro features and dependencies
   * @param {string} directory - Directory to check
   * @returns {Promise<{allPresent: boolean, missing: Array, optional: Array}>}
   */
  async checkKiroFeatures(directory) {
    const missing = [];
    const optional = [];

    // Check for Kiro IDE specific files/directories
    const kiroFeatures = [
      {
        path: '.kiro',
        name: 'Kiro workspace directory',
        required: true,
        description: 'Core Kiro workspace structure'
      },
      {
        path: '.kiro/settings',
        name: 'Kiro settings directory',
        required: false,
        description: 'Kiro IDE configuration'
      },
      {
        path: 'tsconfig.json',
        name: 'TypeScript configuration',
        required: false,
        description: 'TypeScript support for Kiro projects'
      },
      {
        path: '.vscode/settings.json',
        name: 'VS Code settings',
        required: false,
        description: 'VS Code integration settings'
      }
    ];

    for (const feature of kiroFeatures) {
      const featurePath = path.join(directory, feature.path);
      const exists = await fs.pathExists(featurePath);

      if (!exists) {
        if (feature.required) {
          missing.push({
            name: feature.name,
            path: feature.path,
            description: feature.description,
            solution: `Will be created during installation`
          });
        } else {
          optional.push({
            name: feature.name,
            path: feature.path,
            description: feature.description,
            solution: `Optional - can be added later if needed`
          });
        }
      }
    }

    return {
      allPresent: missing.length === 0,
      missing,
      optional
    };
  }

  /**
   * Creates backup before installation for rollback capability
   * @param {string} directory - Directory to backup
   * @returns {Promise<string>} Backup directory path
   */
  async createInstallationBackup(directory) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupDir = path.join(directory, `.bmad-backup-${timestamp}`);

    try {
      await fs.ensureDir(this.backupDir);

      // Backup existing .kiro directory if it exists
      const kiroDir = path.join(directory, '.kiro');
      if (await fs.pathExists(kiroDir)) {
        const kiroBackup = path.join(this.backupDir, '.kiro');
        await fs.copy(kiroDir, kiroBackup);
        this.rollbackActions.push({
          type: 'restore_directory',
          source: kiroBackup,
          target: kiroDir
        });
      }

      // Backup existing BMad installation if present
      const bmadDir = path.join(directory, '.bmad-core');
      if (await fs.pathExists(bmadDir)) {
        const bmadBackup = path.join(this.backupDir, '.bmad-core');
        await fs.copy(bmadDir, bmadBackup);
        this.rollbackActions.push({
          type: 'restore_directory',
          source: bmadBackup,
          target: bmadDir
        });
      }

      console.log(chalk.green(`✓ Created installation backup at: ${this.backupDir}`));
      return this.backupDir;

    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Implements rollback mechanism for failed installations
   * @param {string} directory - Installation directory
   * @param {string} reason - Reason for rollback
   * @returns {Promise<void>}
   */
  async rollbackInstallation(directory, reason) {
    console.log(chalk.yellow(`\n🔄 Rolling back installation due to: ${reason}`));

    try {
      // Execute rollback actions in reverse order
      for (let i = this.rollbackActions.length - 1; i >= 0; i--) {
        const action = this.rollbackActions[i];
        
        switch (action.type) {
          case 'restore_directory':
            if (await fs.pathExists(action.source)) {
              await fs.remove(action.target);
              await fs.copy(action.source, action.target);
              console.log(chalk.green(`✓ Restored: ${action.target}`));
            }
            break;
          
          case 'remove_file':
            if (await fs.pathExists(action.target)) {
              await fs.remove(action.target);
              console.log(chalk.green(`✓ Removed: ${action.target}`));
            }
            break;
          
          case 'remove_directory':
            if (await fs.pathExists(action.target)) {
              await fs.remove(action.target);
              console.log(chalk.green(`✓ Removed directory: ${action.target}`));
            }
            break;
        }
      }

      // Clean up backup directory
      if (this.backupDir && await fs.pathExists(this.backupDir)) {
        await fs.remove(this.backupDir);
        console.log(chalk.green('✓ Cleaned up backup directory'));
      }

      console.log(chalk.green('✓ Rollback completed successfully'));

    } catch (rollbackError) {
      console.log(chalk.red(`✗ Rollback failed: ${rollbackError.message}`));
      console.log(chalk.yellow(`Manual cleanup may be required. Backup available at: ${this.backupDir}`));
      throw rollbackError;
    }
  }

  /**
   * Tracks installation actions for rollback capability
   * @param {string} type - Action type
   * @param {Object} details - Action details
   */
  trackAction(type, details) {
    this.rollbackActions.push({
      type,
      ...details
    });
  }

  /**
   * Handles installation errors with detailed reporting
   * @param {Error} error - Installation error
   * @param {string} context - Error context
   * @param {string} directory - Installation directory
   * @returns {Promise<void>}
   */
  async handleInstallationError(error, context, directory) {
    console.log(chalk.red(`\n❌ Installation Error in ${context}`));
    console.log(chalk.red(`Error: ${error.message}`));

    // Categorize error and provide specific guidance
    const errorGuidance = this.categorizeError(error, context);
    
    console.log(chalk.yellow('\n🔍 Error Analysis:'));
    console.log(chalk.yellow(`Category: ${errorGuidance.category}`));
    console.log(chalk.yellow(`Likely Cause: ${errorGuidance.cause}`));
    
    console.log(chalk.cyan('\n💡 Recommended Solutions:'));
    errorGuidance.solutions.forEach((solution, index) => {
      console.log(chalk.cyan(`${index + 1}. ${solution}`));
    });

    // Attempt automatic rollback if backup exists
    if (this.rollbackActions.length > 0) {
      try {
        await this.rollbackInstallation(directory, error.message);
      } catch (rollbackError) {
        console.log(chalk.red(`Additional error during rollback: ${rollbackError.message}`));
      }
    }

    // Provide recovery instructions
    console.log(chalk.magenta('\n🛠️  Recovery Instructions:'));
    console.log(chalk.magenta('1. Address the root cause using the recommended solutions'));
    console.log(chalk.magenta('2. Ensure all prerequisites are met'));
    console.log(chalk.magenta('3. Retry the installation with: npx bmad-method install --ide=kiro'));
    
    if (this.backupDir) {
      console.log(chalk.magenta(`4. If needed, manual backup is available at: ${this.backupDir}`));
    }
  }

  /**
   * Categorizes errors and provides specific guidance
   * @param {Error} error - The error to categorize
   * @param {string} context - Error context
   * @returns {Object} Error categorization and guidance
   */
  categorizeError(error, context) {
    const message = error.message.toLowerCase();
    
    if (message.includes('permission') || message.includes('eacces')) {
      return {
        category: 'Permission Error',
        cause: 'Insufficient file system permissions',
        solutions: [
          'Run the command with appropriate permissions (sudo on Unix systems)',
          'Check directory ownership and permissions',
          'Ensure the user has write access to the installation directory'
        ]
      };
    }
    
    if (message.includes('enoent') || message.includes('not found')) {
      return {
        category: 'File/Directory Not Found',
        cause: 'Required files or directories are missing',
        solutions: [
          'Verify the installation directory exists',
          'Check that all required dependencies are installed',
          'Ensure the BMad Method package is properly downloaded'
        ]
      };
    }
    
    if (message.includes('enospc') || message.includes('disk space')) {
      return {
        category: 'Disk Space Error',
        cause: 'Insufficient disk space for installation',
        solutions: [
          'Free up disk space in the installation directory',
          'Choose a different installation location with more space',
          'Clean up temporary files and caches'
        ]
      };
    }
    
    if (message.includes('yaml') || message.includes('parse')) {
      return {
        category: 'Configuration Error',
        cause: 'Invalid YAML or configuration file format',
        solutions: [
          'Check YAML syntax in configuration files',
          'Validate agent definitions and templates',
          'Ensure all required configuration fields are present'
        ]
      };
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        category: 'Network Error',
        cause: 'Network connectivity or download issues',
        solutions: [
          'Check internet connectivity',
          'Verify npm registry access',
          'Try again after network issues are resolved',
          'Use a different npm registry if needed'
        ]
      };
    }
    
    return {
      category: 'General Error',
      cause: 'Unexpected installation error',
      solutions: [
        'Check the full error message for specific details',
        'Ensure all system requirements are met',
        'Try running the installation again',
        'Report the issue if it persists'
      ]
    };
  }

  /**
   * Checks existing BMad installation for conflicts
   * @param {string} directory - Directory to check
   * @returns {Promise<{hasConflicts: boolean, message: string, details: Object}>}
   */
  async checkExistingBMadInstallation(directory) {
    const kiroAgentsDir = path.join(directory, '.kiro', 'agents');
    const bmadCoreDir = path.join(directory, '.bmad-core');
    
    let hasConflicts = false;
    let message = '';
    const details = {
      kiroAgents: 0,
      traditionalInstall: false,
      version: null
    };

    // Check for existing Kiro agents
    if (await fs.pathExists(kiroAgentsDir)) {
      const agentFiles = await fs.readdir(kiroAgentsDir);
      const bmadAgents = agentFiles.filter(file => 
        file.endsWith('.md') && file.includes('bmad')
      );
      
      if (bmadAgents.length > 0) {
        hasConflicts = true;
        details.kiroAgents = bmadAgents.length;
        message += `Found ${bmadAgents.length} existing BMad agents in Kiro. `;
      }
    }

    // Check for traditional BMad installation
    if (await fs.pathExists(bmadCoreDir)) {
      hasConflicts = true;
      details.traditionalInstall = true;
      message += 'Found traditional BMad installation. ';
      
      // Try to get version info
      const manifestPath = path.join(bmadCoreDir, 'install-manifest.yaml');
      if (await fs.pathExists(manifestPath)) {
        try {
          const yaml = require('js-yaml');
          const manifestContent = await fs.readFile(manifestPath, 'utf8');
          const manifest = yaml.load(manifestContent);
          details.version = manifest.version;
        } catch (error) {
          // Ignore manifest parsing errors
        }
      }
    }

    return { hasConflicts, message, details };
  }

  /**
   * Checks available disk space
   * @param {string} directory - Directory to check
   * @returns {Promise<{sufficient: boolean, available: number, required: number}>}
   */
  async checkDiskSpace(directory) {
    try {
      const stats = await fs.stat(directory);
      // This is a simplified check - in a real implementation,
      // you'd use a library like 'check-disk-space' for accurate disk space checking
      const requiredMB = 50; // Estimated requirement in MB
      const availableMB = 1000; // Placeholder - would be actual available space
      
      return {
        sufficient: availableMB >= requiredMB,
        available: availableMB,
        required: requiredMB
      };
    } catch (error) {
      // If we can't check disk space, assume it's sufficient
      return {
        sufficient: true,
        available: 0,
        required: 0
      };
    }
  }

  /**
   * Checks Node.js version compatibility
   * @returns {Promise<{compatible: boolean, current: string, required: string}>}
   */
  async checkNodeVersion() {
    const currentVersion = process.version;
    const requiredVersion = '>=16.0.0';
    
    // Simple version check - in production, use semver library
    const majorVersion = parseInt(currentVersion.slice(1).split('.')[0]);
    const compatible = majorVersion >= 16;
    
    return {
      compatible,
      current: currentVersion,
      required: requiredVersion
    };
  }

  /**
   * Displays comprehensive error report
   * @param {Object} validation - Validation results
   * @param {string} context - Context description
   */
  displayErrorReport(validation, context = 'Installation') {
    console.log(chalk.red.bold(`\n❌ ${context} Failed`));
    
    if (validation.errors && validation.errors.length > 0) {
      console.log(chalk.red('\n🚨 Critical Errors:'));
      validation.errors.forEach((error, index) => {
        console.log(chalk.red(`${index + 1}. [${error.code}] ${error.message}`));
        console.log(chalk.yellow(`   Solution: ${error.solution}`));
      });
    }
    
    if (validation.warnings && validation.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      validation.warnings.forEach((warning, index) => {
        console.log(chalk.yellow(`${index + 1}. [${warning.code}] ${warning.message}`));
        console.log(chalk.cyan(`   Solution: ${warning.solution}`));
      });
    }
    
    if (validation.guidance && validation.guidance.length > 0) {
      console.log(chalk.cyan('\n💡 Additional Guidance:'));
      validation.guidance.forEach((guide, index) => {
        console.log(chalk.cyan(`${index + 1}. ${guide}`));
      });
    }
  }
}

module.exports = InstallationErrorHandler;