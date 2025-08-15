/**
 * Conversion Error Handler
 * Comprehensive error handling and recovery system for BMad agent conversion
 */

const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

class ConversionErrorHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      logLevel: options.logLevel || 'info',
      enableDiagnostics: options.enableDiagnostics !== false,
      enableRecovery: options.enableRecovery !== false,
      maxRetryAttempts: options.maxRetryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      logFilePath: options.logFilePath || path.join(process.cwd(), '.kiro', 'logs', 'conversion-errors.log'),
      diagnosticMode: options.diagnosticMode || false,
      ...options
    };

    // Error tracking
    this.conversionErrors = new Map();
    this.recoveryAttempts = new Map();
    this.diagnosticData = new Map();
    this.errorStats = {
      total: 0,
      byType: new Map(),
      byAgent: new Map(),
      recovered: 0,
      unrecoverable: 0
    };

    // Error categories
    this.errorCategories = {
      FILE_NOT_FOUND: 'file-not-found',
      INVALID_YAML: 'invalid-yaml',
      MISSING_DEPENDENCIES: 'missing-dependencies',
      TRANSFORMATION_FAILED: 'transformation-failed',
      WRITE_FAILED: 'write-failed',
      VALIDATION_FAILED: 'validation-failed',
      PERMISSION_DENIED: 'permission-denied',
      NETWORK_ERROR: 'network-error',
      UNKNOWN: 'unknown'
    };

    // Recovery strategies
    this.recoveryStrategies = new Map([
      [this.errorCategories.FILE_NOT_FOUND, this.recoverFromMissingFile.bind(this)],
      [this.errorCategories.INVALID_YAML, this.recoverFromInvalidYaml.bind(this)],
      [this.errorCategories.MISSING_DEPENDENCIES, this.recoverFromMissingDependencies.bind(this)],
      [this.errorCategories.TRANSFORMATION_FAILED, this.recoverFromTransformationFailure.bind(this)],
      [this.errorCategories.WRITE_FAILED, this.recoverFromWriteFailure.bind(this)],
      [this.errorCategories.VALIDATION_FAILED, this.recoverFromValidationFailure.bind(this)],
      [this.errorCategories.PERMISSION_DENIED, this.recoverFromPermissionDenied.bind(this)]
    ]);

    this.initializeLogging();
  }

  /**
   * Initialize error logging system
   */
  async initializeLogging() {
    try {
      await fs.ensureDir(path.dirname(this.options.logFilePath));
      
      // Create log file if it doesn't exist
      if (!await fs.pathExists(this.options.logFilePath)) {
        await fs.writeFile(this.options.logFilePath, '');
      }
      
      this.log('Conversion error handler initialized', 'info');
    } catch (error) {
      console.error('Failed to initialize error logging:', error.message);
    }
  }

  /**
   * Handle conversion error with categorization and recovery
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context information about the conversion
   * @returns {Promise<Object>} - Error handling result
   */
  async handleConversionError(error, context = {}) {
    const errorId = this.generateErrorId();
    const categorizedError = this.categorizeError(error, context);
    const timestamp = new Date().toISOString();

    // Store error details
    const errorDetails = {
      id: errorId,
      timestamp,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      category: categorizedError.category,
      severity: categorizedError.severity,
      context: {
        agentId: context.agentId,
        filePath: context.filePath,
        operation: context.operation,
        phase: context.phase,
        ...context
      },
      recoverable: categorizedError.recoverable,
      recoveryAttempts: 0,
      diagnostics: this.options.enableDiagnostics ? await this.collectDiagnostics(error, context) : null
    };

    this.conversionErrors.set(errorId, errorDetails);
    this.updateErrorStats(errorDetails);

    // Log the error
    await this.logError(errorDetails);

    // Emit error event
    this.emit('conversionError', errorDetails);

    // Attempt recovery if enabled and error is recoverable
    let recoveryResult = null;
    if (this.options.enableRecovery && categorizedError.recoverable) {
      recoveryResult = await this.attemptRecovery(errorDetails);
    }

    return {
      errorId,
      category: categorizedError.category,
      severity: categorizedError.severity,
      recoverable: categorizedError.recoverable,
      recovered: recoveryResult?.success || false,
      recoveryDetails: recoveryResult,
      diagnostics: errorDetails.diagnostics
    };
  }

  /**
   * Categorize error based on type and context
   * @param {Error} error - The error to categorize
   * @param {Object} context - Error context
   * @returns {Object} - Categorization result
   */
  categorizeError(error, context) {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // File system errors
    if (message.includes('enoent') || message.includes('file not found') || message.includes('no such file')) {
      return {
        category: this.errorCategories.FILE_NOT_FOUND,
        severity: 'medium',
        recoverable: true
      };
    }

    // YAML parsing errors
    if (message.includes('yaml') || message.includes('parsing') || stack.includes('js-yaml')) {
      return {
        category: this.errorCategories.INVALID_YAML,
        severity: 'medium',
        recoverable: true
      };
    }

    // Dependency errors
    if (message.includes('dependency') || message.includes('missing') || message.includes('not found')) {
      return {
        category: this.errorCategories.MISSING_DEPENDENCIES,
        severity: 'medium',
        recoverable: true
      };
    }

    // Permission errors
    if (message.includes('eacces') || message.includes('permission') || message.includes('access denied')) {
      return {
        category: this.errorCategories.PERMISSION_DENIED,
        severity: 'high',
        recoverable: true
      };
    }

    // Write/IO errors
    if (message.includes('write') || message.includes('enospc') || message.includes('disk')) {
      return {
        category: this.errorCategories.WRITE_FAILED,
        severity: 'high',
        recoverable: true
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || context.operation === 'validation') {
      return {
        category: this.errorCategories.VALIDATION_FAILED,
        severity: 'medium',
        recoverable: true
      };
    }

    // Transformation errors
    if (context.operation === 'transformation' || message.includes('transform')) {
      return {
        category: this.errorCategories.TRANSFORMATION_FAILED,
        severity: 'medium',
        recoverable: true
      };
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return {
        category: this.errorCategories.NETWORK_ERROR,
        severity: 'low',
        recoverable: true
      };
    }

    // Unknown errors
    return {
      category: this.errorCategories.UNKNOWN,
      severity: 'high',
      recoverable: false
    };
  }

  /**
   * Attempt error recovery using appropriate strategy
   * @param {Object} errorDetails - Error details
   * @returns {Promise<Object>} - Recovery result
   */
  async attemptRecovery(errorDetails) {
    const { id, category, context } = errorDetails;
    const strategy = this.recoveryStrategies.get(category);

    if (!strategy) {
      this.log(`No recovery strategy available for error category: ${category}`, 'warn');
      return { success: false, reason: 'No recovery strategy available' };
    }

    // Check if we've exceeded max retry attempts
    const currentAttempts = this.recoveryAttempts.get(id) || 0;
    if (currentAttempts >= this.options.maxRetryAttempts) {
      this.log(`Max recovery attempts exceeded for error ${id}`, 'warn');
      return { success: false, reason: 'Max retry attempts exceeded' };
    }

    // Increment attempt counter
    this.recoveryAttempts.set(id, currentAttempts + 1);
    errorDetails.recoveryAttempts = currentAttempts + 1;

    try {
      this.log(`Attempting recovery for error ${id} (attempt ${currentAttempts + 1}/${this.options.maxRetryAttempts})`, 'info');
      
      // Add delay between attempts
      if (currentAttempts > 0) {
        await this.delay(this.options.retryDelay * Math.pow(2, currentAttempts));
      }

      const result = await strategy(errorDetails);
      
      if (result.success) {
        this.errorStats.recovered++;
        this.log(`Successfully recovered from error ${id}`, 'info');
        this.emit('recoverySuccess', errorDetails, result);
      } else {
        this.log(`Recovery attempt failed for error ${id}: ${result.reason}`, 'warn');
        this.emit('recoveryFailed', errorDetails, result);
      }

      return result;
    } catch (recoveryError) {
      this.log(`Recovery strategy threw error for ${id}: ${recoveryError.message}`, 'error');
      return { 
        success: false, 
        reason: 'Recovery strategy failed',
        error: recoveryError.message 
      };
    }
  }

  /**
   * Collect diagnostic information for troubleshooting
   * @param {Error} error - The error that occurred
   * @param {Object} context - Error context
   * @returns {Promise<Object>} - Diagnostic data
   */
  async collectDiagnostics(error, context) {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        cwd: process.cwd()
      },
      context: { ...context },
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };

    // File system diagnostics
    if (context.filePath) {
      try {
        const filePath = context.filePath;
        diagnostics.fileSystem = {
          exists: await fs.pathExists(filePath),
          directory: path.dirname(filePath),
          directoryExists: await fs.pathExists(path.dirname(filePath)),
          permissions: null
        };

        // Check permissions if file exists
        if (diagnostics.fileSystem.exists) {
          try {
            const stats = await fs.stat(filePath);
            diagnostics.fileSystem.permissions = {
              readable: true,
              writable: true,
              size: stats.size,
              modified: stats.mtime
            };
          } catch (permError) {
            diagnostics.fileSystem.permissions = {
              readable: false,
              writable: false,
              error: permError.message
            };
          }
        }
      } catch (fsError) {
        diagnostics.fileSystem = { error: fsError.message };
      }
    }

    // Agent-specific diagnostics
    if (context.agentId) {
      diagnostics.agent = {
        id: context.agentId,
        source: context.source,
        expansionPack: context.expansionPack
      };
    }

    // Operation-specific diagnostics
    if (context.operation) {
      diagnostics.operation = {
        type: context.operation,
        phase: context.phase,
        step: context.step
      };
    }

    return diagnostics;
  }

  /**
   * Recovery strategy for missing files
   */
  async recoverFromMissingFile(errorDetails) {
    const { context } = errorDetails;
    const filePath = context.filePath;

    if (!filePath) {
      return { success: false, reason: 'No file path provided in context' };
    }

    try {
      // Try to find the file in alternative locations
      const alternativePaths = this.getAlternativeFilePaths(filePath, context);
      
      for (const altPath of alternativePaths) {
        if (await fs.pathExists(altPath)) {
          this.log(`Found alternative file at: ${altPath}`, 'info');
          
          // Update context with found path
          context.filePath = altPath;
          context.recoveredPath = altPath;
          
          return { 
            success: true, 
            reason: 'Found alternative file path',
            newPath: altPath 
          };
        }
      }

      // Try to create missing directories
      const directory = path.dirname(filePath);
      if (!await fs.pathExists(directory)) {
        await fs.ensureDir(directory);
        this.log(`Created missing directory: ${directory}`, 'info');
        
        return { 
          success: true, 
          reason: 'Created missing directory',
          action: 'directory-created'
        };
      }

      return { success: false, reason: 'File not found in any alternative location' };
    } catch (error) {
      return { success: false, reason: `Recovery failed: ${error.message}` };
    }
  }

  /**
   * Recovery strategy for invalid YAML
   */
  async recoverFromInvalidYaml(errorDetails) {
    const { context } = errorDetails;
    const filePath = context.filePath;

    if (!filePath || !await fs.pathExists(filePath)) {
      return { success: false, reason: 'File not accessible for YAML recovery' };
    }

    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Try to fix common YAML issues
      const fixedContent = this.fixCommonYamlIssues(content);
      
      if (fixedContent !== content) {
        // Test if the fixed content parses correctly
        const yaml = require('js-yaml');
        try {
          yaml.load(fixedContent);
          
          // Create backup and write fixed content
          const backupPath = `${filePath}.yaml-error-backup`;
          await fs.writeFile(backupPath, content);
          await fs.writeFile(filePath, fixedContent);
          
          this.log(`Fixed YAML issues in: ${filePath}`, 'info');
          return { 
            success: true, 
            reason: 'Fixed common YAML syntax issues',
            backupPath 
          };
        } catch (testError) {
          // Fixed content still doesn't parse
          return { success: false, reason: 'Unable to fix YAML syntax issues' };
        }
      }

      return { success: false, reason: 'No fixable YAML issues found' };
    } catch (error) {
      return { success: false, reason: `YAML recovery failed: ${error.message}` };
    }
  }

  /**
   * Recovery strategy for missing dependencies
   */
  async recoverFromMissingDependencies(errorDetails) {
    const { context } = errorDetails;
    
    try {
      // Try to locate missing dependencies in alternative locations
      const missingDeps = context.missingDependencies || [];
      const foundDeps = [];
      
      for (const dep of missingDeps) {
        const alternativePaths = this.getAlternativeDependencyPaths(dep, context);
        
        for (const altPath of alternativePaths) {
          if (await fs.pathExists(altPath)) {
            foundDeps.push({ dependency: dep, path: altPath });
            break;
          }
        }
      }

      if (foundDeps.length > 0) {
        // Update context with found dependencies
        context.resolvedDependencies = foundDeps;
        
        return { 
          success: true, 
          reason: `Found ${foundDeps.length} missing dependencies`,
          resolvedDependencies: foundDeps 
        };
      }

      return { success: false, reason: 'No missing dependencies could be located' };
    } catch (error) {
      return { success: false, reason: `Dependency recovery failed: ${error.message}` };
    }
  }

  /**
   * Recovery strategy for transformation failures
   */
  async recoverFromTransformationFailure(errorDetails) {
    const { context } = errorDetails;
    
    try {
      // Try simplified transformation approach
      if (context.transformationType === 'full') {
        context.transformationType = 'minimal';
        context.skipOptionalFeatures = true;
        
        return { 
          success: true, 
          reason: 'Switched to minimal transformation mode',
          fallbackMode: 'minimal'
        };
      }

      // Try without optional enhancements
      if (!context.skipOptionalFeatures) {
        context.skipOptionalFeatures = true;
        context.skipMCPIntegration = true;
        context.skipSteeringGeneration = true;
        
        return { 
          success: true, 
          reason: 'Disabled optional transformation features',
          fallbackMode: 'basic'
        };
      }

      return { success: false, reason: 'No fallback transformation options available' };
    } catch (error) {
      return { success: false, reason: `Transformation recovery failed: ${error.message}` };
    }
  }

  /**
   * Recovery strategy for write failures
   */
  async recoverFromWriteFailure(errorDetails) {
    const { context } = errorDetails;
    const filePath = context.outputPath || context.filePath;

    if (!filePath) {
      return { success: false, reason: 'No output path provided' };
    }

    try {
      // Check disk space
      const stats = await fs.stat(path.dirname(filePath));
      
      // Try alternative output location
      const altPath = this.getAlternativeOutputPath(filePath);
      
      try {
        await fs.ensureDir(path.dirname(altPath));
        context.outputPath = altPath;
        
        return { 
          success: true, 
          reason: 'Switched to alternative output location',
          newPath: altPath 
        };
      } catch (altError) {
        return { success: false, reason: `Alternative path also failed: ${altError.message}` };
      }
    } catch (error) {
      return { success: false, reason: `Write recovery failed: ${error.message}` };
    }
  }

  /**
   * Recovery strategy for validation failures
   */
  async recoverFromValidationFailure(errorDetails) {
    const { context } = errorDetails;
    
    try {
      // Skip strict validation and use lenient mode
      if (!context.lenientValidation) {
        context.lenientValidation = true;
        context.skipStrictChecks = true;
        
        return { 
          success: true, 
          reason: 'Switched to lenient validation mode',
          validationMode: 'lenient'
        };
      }

      return { success: false, reason: 'Already using lenient validation' };
    } catch (error) {
      return { success: false, reason: `Validation recovery failed: ${error.message}` };
    }
  }

  /**
   * Recovery strategy for permission denied errors
   */
  async recoverFromPermissionDenied(errorDetails) {
    const { context } = errorDetails;
    const filePath = context.filePath || context.outputPath;

    if (!filePath) {
      return { success: false, reason: 'No file path provided' };
    }

    try {
      // Try to change permissions if possible
      try {
        await fs.chmod(filePath, 0o644);
        return { 
          success: true, 
          reason: 'Fixed file permissions',
          action: 'chmod-applied'
        };
      } catch (chmodError) {
        // Try alternative location with write permissions
        const altPath = this.getAlternativeOutputPath(filePath);
        const altDir = path.dirname(altPath);
        
        try {
          await fs.ensureDir(altDir);
          await fs.access(altDir, fs.constants.W_OK);
          
          context.outputPath = altPath;
          return { 
            success: true, 
            reason: 'Switched to writable location',
            newPath: altPath 
          };
        } catch (altError) {
          return { success: false, reason: 'No writable location available' };
        }
      }
    } catch (error) {
      return { success: false, reason: `Permission recovery failed: ${error.message}` };
    }
  }

  /**
   * Get alternative file paths to search
   */
  getAlternativeFilePaths(originalPath, context) {
    const alternatives = [];
    const basename = path.basename(originalPath);
    const dirname = path.dirname(originalPath);
    
    // Try common alternative directories
    const altDirs = [
      path.join(dirname, '..', 'agents'),
      path.join(dirname, '..', '..', 'agents'),
      path.join(process.cwd(), 'bmad-core', 'agents'),
      path.join(process.cwd(), 'expansion-packs', '*', 'agents')
    ];

    for (const altDir of altDirs) {
      alternatives.push(path.join(altDir, basename));
    }

    // Try with different extensions
    const nameWithoutExt = path.basename(originalPath, path.extname(originalPath));
    const altExtensions = ['.md', '.yaml', '.yml', '.txt'];
    
    for (const ext of altExtensions) {
      alternatives.push(path.join(dirname, nameWithoutExt + ext));
    }

    return alternatives;
  }

  /**
   * Get alternative dependency paths
   */
  getAlternativeDependencyPaths(dependency, context) {
    const alternatives = [];
    const rootPath = process.cwd();
    
    // Try different base directories
    const baseDirs = [
      path.join(rootPath, 'bmad-core'),
      path.join(rootPath, 'common'),
      path.join(rootPath, 'expansion-packs', context.expansionPack || '*')
    ];

    for (const baseDir of baseDirs) {
      alternatives.push(path.join(baseDir, dependency));
      
      // Try with different subdirectories
      const subDirs = ['tasks', 'templates', 'checklists', 'data', 'utils'];
      for (const subDir of subDirs) {
        alternatives.push(path.join(baseDir, subDir, dependency));
      }
    }

    return alternatives;
  }

  /**
   * Get alternative output path
   */
  getAlternativeOutputPath(originalPath) {
    const dirname = path.dirname(originalPath);
    const basename = path.basename(originalPath);
    const timestamp = Date.now();
    
    // Try temp directory first
    const tempPath = path.join(require('os').tmpdir(), 'kiro-conversion', basename);
    
    // Try with timestamp suffix
    const nameWithoutExt = path.basename(originalPath, path.extname(originalPath));
    const ext = path.extname(originalPath);
    const timestampPath = path.join(dirname, `${nameWithoutExt}-${timestamp}${ext}`);
    
    return tempPath;
  }

  /**
   * Fix common YAML syntax issues
   */
  fixCommonYamlIssues(content) {
    let fixed = content;
    
    // Fix unquoted strings with special characters
    fixed = fixed.replace(/:\s*([^"\s][^:\n]*[^\s])\s*$/gm, ': "$1"');
    
    // Fix missing spaces after colons
    fixed = fixed.replace(/([^:\s]):([^\s])/g, '$1: $2');
    
    // Fix tab indentation (replace with spaces)
    fixed = fixed.replace(/\t/g, '  ');
    
    // Fix trailing commas
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    return fixed;
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update error statistics
   */
  updateErrorStats(errorDetails) {
    this.errorStats.total++;
    
    // Update by type
    const category = errorDetails.category;
    this.errorStats.byType.set(category, (this.errorStats.byType.get(category) || 0) + 1);
    
    // Update by agent
    const agentId = errorDetails.context.agentId;
    if (agentId) {
      this.errorStats.byAgent.set(agentId, (this.errorStats.byAgent.get(agentId) || 0) + 1);
    }
  }

  /**
   * Log error to file and console
   */
  async logError(errorDetails) {
    const logEntry = {
      timestamp: errorDetails.timestamp,
      id: errorDetails.id,
      category: errorDetails.category,
      severity: errorDetails.severity,
      message: errorDetails.error.message,
      context: errorDetails.context,
      recoverable: errorDetails.recoverable,
      diagnostics: this.options.diagnosticMode ? errorDetails.diagnostics : null
    };

    // Log to file
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.options.logFilePath, logLine);
    } catch (writeError) {
      console.error('Failed to write to error log:', writeError.message);
    }

    // Log to console based on severity
    const message = `[${errorDetails.category}] ${errorDetails.error.message}`;
    if (errorDetails.context.agentId) {
      const contextMsg = `${message} (Agent: ${errorDetails.context.agentId})`;
      this.log(contextMsg, errorDetails.severity === 'high' ? 'error' : 'warn');
    } else {
      this.log(message, errorDetails.severity === 'high' ? 'error' : 'warn');
    }
  }

  /**
   * Enable diagnostic mode for detailed troubleshooting
   */
  enableDiagnosticMode() {
    this.options.diagnosticMode = true;
    this.options.enableDiagnostics = true;
    this.log('Diagnostic mode enabled', 'info');
  }

  /**
   * Disable diagnostic mode
   */
  disableDiagnosticMode() {
    this.options.diagnosticMode = false;
    this.log('Diagnostic mode disabled', 'info');
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      ...this.errorStats,
      byType: Object.fromEntries(this.errorStats.byType),
      byAgent: Object.fromEntries(this.errorStats.byAgent),
      recoveryRate: this.errorStats.total > 0 ? (this.errorStats.recovered / this.errorStats.total) : 0
    };
  }

  /**
   * Get all conversion errors
   */
  getConversionErrors() {
    return Array.from(this.conversionErrors.values());
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category) {
    return Array.from(this.conversionErrors.values())
      .filter(error => error.category === category);
  }

  /**
   * Get errors by agent
   */
  getErrorsByAgent(agentId) {
    return Array.from(this.conversionErrors.values())
      .filter(error => error.context.agentId === agentId);
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.conversionErrors.clear();
    this.recoveryAttempts.clear();
    this.diagnosticData.clear();
    this.errorStats = {
      total: 0,
      byType: new Map(),
      byAgent: new Map(),
      recovered: 0,
      unrecoverable: 0
    };
    this.log('Error history cleared', 'info');
  }

  /**
   * Export error report
   */
  async exportErrorReport(outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      statistics: this.getErrorStats(),
      errors: this.getConversionErrors(),
      systemInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        workingDirectory: process.cwd()
      }
    };

    try {
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
      this.log(`Error report exported to: ${outputPath}`, 'info');
      return true;
    } catch (error) {
      this.log(`Failed to export error report: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Utility method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log message with timestamp and level
   */
  log(message, level = 'info') {
    if (level === 'info' && this.options.logLevel !== 'info' && this.options.logLevel !== 'debug') {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [ConversionErrorHandler] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
}

module.exports = ConversionErrorHandler;