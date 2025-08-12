const chalk = require('chalk');

/**
 * Error reporting utilities for BMad installer
 */
class ErrorReporter {
  constructor() {
    this.errorTypes = {
      IDE_VALIDATION: 'IDE_VALIDATION',
      KIRO_SETUP: 'KIRO_SETUP',
      STANDARD_IDE: 'STANDARD_IDE',
      BMAD_INSTALLATION: 'BMAD_INSTALLATION',
      EXPANSION_PACK: 'EXPANSION_PACK',
      FILE_SYSTEM: 'FILE_SYSTEM',
      CONFIGURATION: 'CONFIGURATION',
      NETWORK: 'NETWORK',
      PERMISSION: 'PERMISSION',
      UNKNOWN: 'UNKNOWN'
    };
  }

  /**
   * Creates a detailed error report
   * @param {Error} error - The error object
   * @param {string} errorType - Type of error from this.errorTypes
   * @param {Object} context - Additional context information
   * @returns {Object} Detailed error report
   */
  createErrorReport(error, errorType = this.errorTypes.UNKNOWN, context = {}) {
    const report = {
      type: errorType,
      message: error.message,
      originalError: error,
      context: context,
      timestamp: new Date().toISOString(),
      actionable: this.getActionableMessage(errorType, error, context),
      troubleshooting: this.getTroubleshootingSteps(errorType, error, context)
    };

    return report;
  }

  /**
   * Gets actionable error message based on error type
   * @param {string} errorType - Type of error
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   * @returns {string} Actionable error message
   */
  getActionableMessage(errorType, error, context) {
    switch (errorType) {
      case this.errorTypes.IDE_VALIDATION:
        return this.getIdeValidationMessage(error, context);
      
      case this.errorTypes.KIRO_SETUP:
        return this.getKiroSetupMessage(error, context);
      
      case this.errorTypes.STANDARD_IDE:
        return this.getStandardIdeMessage(error, context);
      
      case this.errorTypes.BMAD_INSTALLATION:
        return this.getBMadInstallationMessage(error, context);
      
      case this.errorTypes.EXPANSION_PACK:
        return this.getExpansionPackMessage(error, context);
      
      case this.errorTypes.FILE_SYSTEM:
        return this.getFileSystemMessage(error, context);
      
      case this.errorTypes.CONFIGURATION:
        return this.getConfigurationMessage(error, context);
      
      case this.errorTypes.NETWORK:
        return this.getNetworkMessage(error, context);
      
      case this.errorTypes.PERMISSION:
        return this.getPermissionMessage(error, context);
      
      default:
        return `An unexpected error occurred: ${error.message}`;
    }
  }

  /**
   * Gets troubleshooting steps based on error type
   * @param {string} errorType - Type of error
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   * @returns {string[]} Array of troubleshooting steps
   */
  getTroubleshootingSteps(errorType, error, context) {
    switch (errorType) {
      case this.errorTypes.IDE_VALIDATION:
        return [
          'Check that IDE names are spelled correctly',
          'Use supported IDE identifiers: cursor, claude-code, windsurf, trae, roo, kilo, cline, gemini, qwen-code, github-copilot, kiro',
          'Ensure IDE array is properly formatted',
          'Remove any duplicate IDE entries'
        ];
      
      case this.errorTypes.KIRO_SETUP:
        return [
          'Ensure you have write permissions in the target directory',
          'Check that the .kiro directory structure can be created',
          'Verify that BMad core components were installed successfully',
          'Try running the installation with --upgrade flag if updating',
          'Check available disk space'
        ];
      
      case this.errorTypes.STANDARD_IDE:
        return [
          'Verify the IDE is properly installed on your system',
          'Check IDE-specific configuration requirements',
          'Ensure you have necessary permissions to modify IDE settings',
          'Try installing the IDE separately first',
          'Check IDE documentation for setup requirements'
        ];
      
      case this.errorTypes.BMAD_INSTALLATION:
        return [
          'Ensure you have write permissions in the target directory',
          'Check available disk space',
          'Verify internet connection for downloading components',
          'Try running with --upgrade flag if updating existing installation',
          'Check that the target directory is not in use by another process'
        ];
      
      case this.errorTypes.EXPANSION_PACK:
        return [
          'Verify the expansion pack name is correct',
          'Check that the expansion pack is available',
          'Ensure you have permissions to install expansion packs',
          'Try installing expansion packs individually',
          'Check expansion pack documentation for requirements'
        ];
      
      case this.errorTypes.FILE_SYSTEM:
        return [
          'Check file and directory permissions',
          'Ensure sufficient disk space is available',
          'Verify the target path exists and is accessible',
          'Check for file locks or processes using the files',
          'Try running as administrator/sudo if necessary'
        ];
      
      case this.errorTypes.CONFIGURATION:
        return [
          'Check configuration file syntax',
          'Verify all required configuration fields are present',
          'Ensure configuration values are valid',
          'Try resetting to default configuration',
          'Check configuration file permissions'
        ];
      
      case this.errorTypes.NETWORK:
        return [
          'Check your internet connection',
          'Verify firewall settings allow the connection',
          'Try again later if servers are temporarily unavailable',
          'Check proxy settings if behind a corporate firewall',
          'Ensure DNS resolution is working'
        ];
      
      case this.errorTypes.PERMISSION:
        return [
          'Run the installer with appropriate permissions',
          'Check directory and file permissions',
          'Ensure you have write access to the target directory',
          'Try running as administrator/sudo if necessary',
          'Check that files are not locked by other processes'
        ];
      
      default:
        return [
          'Check the error message for specific details',
          'Ensure all prerequisites are met',
          'Try running the command again',
          'Check system logs for additional information',
          'Contact support if the issue persists'
        ];
    }
  }

  /**
   * Gets IDE validation specific error message
   */
  getIdeValidationMessage(error, context) {
    const { invalidIdes, supportedIdes } = context;
    let message = 'IDE validation failed. ';
    
    if (invalidIdes && invalidIdes.length > 0) {
      message += `Invalid IDE(s): ${invalidIdes.join(', ')}. `;
    }
    
    if (supportedIdes && supportedIdes.length > 0) {
      message += `Supported IDEs are: ${supportedIdes.join(', ')}.`;
    }
    
    return message;
  }

  /**
   * Gets Kiro setup specific error message
   */
  getKiroSetupMessage(error, context) {
    const { phase, component } = context;
    let message = 'Kiro setup failed';
    
    if (phase) {
      message += ` during ${phase}`;
    }
    
    if (component) {
      message += ` while processing ${component}`;
    }
    
    message += '. This means the Kiro IDE integration could not be configured properly.';
    
    if (context.bmadInstalled) {
      message += ' Note: BMad core components were installed successfully.';
    }
    
    return message;
  }

  /**
   * Gets standard IDE specific error message
   */
  getStandardIdeMessage(error, context) {
    const { ide, operation } = context;
    let message = 'IDE configuration failed';
    
    if (ide) {
      message += ` for ${ide}`;
    }
    
    if (operation) {
      message += ` during ${operation}`;
    }
    
    message += '. The IDE integration could not be set up properly.';
    
    return message;
  }

  /**
   * Gets BMad installation specific error message
   */
  getBMadInstallationMessage(error, context) {
    const { component, installType } = context;
    let message = 'BMad installation failed';
    
    if (component) {
      message += ` while installing ${component}`;
    }
    
    if (installType) {
      message += ` (${installType} installation)`;
    }
    
    message += '. The core BMad components could not be installed.';
    
    return message;
  }

  /**
   * Gets expansion pack specific error message
   */
  getExpansionPackMessage(error, context) {
    const { packId, operation } = context;
    let message = 'Expansion pack installation failed';
    
    if (packId) {
      message += ` for ${packId}`;
    }
    
    if (operation) {
      message += ` during ${operation}`;
    }
    
    message += '. The expansion pack could not be installed or configured properly.';
    
    return message;
  }

  /**
   * Gets file system specific error message
   */
  getFileSystemMessage(error, context) {
    const { path: filePath, operation } = context;
    let message = 'File system operation failed';
    
    if (operation) {
      message += ` during ${operation}`;
    }
    
    if (filePath) {
      message += ` for path: ${filePath}`;
    }
    
    message += '. Check file permissions and disk space.';
    
    return message;
  }

  /**
   * Gets configuration specific error message
   */
  getConfigurationMessage(error, context) {
    const { configFile, field } = context;
    let message = 'Configuration error';
    
    if (configFile) {
      message += ` in ${configFile}`;
    }
    
    if (field) {
      message += ` for field: ${field}`;
    }
    
    message += '. Check configuration syntax and values.';
    
    return message;
  }

  /**
   * Gets network specific error message
   */
  getNetworkMessage(error, context) {
    const { url, operation } = context;
    let message = 'Network operation failed';
    
    if (operation) {
      message += ` during ${operation}`;
    }
    
    if (url) {
      message += ` for URL: ${url}`;
    }
    
    message += '. Check your internet connection and firewall settings.';
    
    return message;
  }

  /**
   * Gets permission specific error message
   */
  getPermissionMessage(error, context) {
    const { path: filePath, operation } = context;
    let message = 'Permission denied';
    
    if (operation) {
      message += ` during ${operation}`;
    }
    
    if (filePath) {
      message += ` for path: ${filePath}`;
    }
    
    message += '. Run with appropriate permissions or check file ownership.';
    
    return message;
  }

  /**
   * Displays a formatted error report
   * @param {Object} errorReport - Error report from createErrorReport
   */
  displayErrorReport(errorReport) {
    console.log('\n' + chalk.red.bold('═══ INSTALLATION ERROR ═══'));
    console.log(chalk.red(`Type: ${errorReport.type}`));
    console.log(chalk.red(`Time: ${errorReport.timestamp}`));
    console.log(chalk.red(`Message: ${errorReport.actionable}`));
    
    if (errorReport.context && Object.keys(errorReport.context).length > 0) {
      console.log(chalk.yellow('\nContext:'));
      Object.entries(errorReport.context).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          console.log(chalk.yellow(`  ${key}: ${value}`));
        }
      });
    }
    
    if (errorReport.troubleshooting && errorReport.troubleshooting.length > 0) {
      console.log(chalk.cyan('\nTroubleshooting Steps:'));
      errorReport.troubleshooting.forEach((step, index) => {
        console.log(chalk.cyan(`  ${index + 1}. ${step}`));
      });
    }
    
    console.log(chalk.red.bold('═══════════════════════════\n'));
  }

  /**
   * Creates and displays an error report
   * @param {Error} error - The error object
   * @param {string} errorType - Type of error
   * @param {Object} context - Additional context
   */
  reportError(error, errorType, context = {}) {
    const report = this.createErrorReport(error, errorType, context);
    this.displayErrorReport(report);
    return report;
  }

  /**
   * Determines error type from error message and context
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   * @returns {string} Determined error type
   */
  determineErrorType(error, context = {}) {
    const message = error.message.toLowerCase();
    
    if (message.includes('ide') && (message.includes('validation') || message.includes('invalid'))) {
      return this.errorTypes.IDE_VALIDATION;
    }
    
    if (message.includes('kiro') || context.component === 'kiro') {
      return this.errorTypes.KIRO_SETUP;
    }
    
    if (message.includes('expansion') || context.component === 'expansion-pack') {
      return this.errorTypes.EXPANSION_PACK;
    }
    
    if (message.includes('bmad') || context.component === 'bmad-core') {
      return this.errorTypes.BMAD_INSTALLATION;
    }
    
    if (message.includes('permission') || message.includes('eacces') || message.includes('eperm')) {
      return this.errorTypes.PERMISSION;
    }
    
    if (message.includes('enoent') || message.includes('file') || message.includes('directory')) {
      return this.errorTypes.FILE_SYSTEM;
    }
    
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return this.errorTypes.NETWORK;
    }
    
    if (message.includes('config') || message.includes('yaml') || message.includes('json')) {
      return this.errorTypes.CONFIGURATION;
    }
    
    return this.errorTypes.UNKNOWN;
  }
}

module.exports = ErrorReporter;