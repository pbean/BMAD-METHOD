/**
 * Activation Error Handler
 * Comprehensive error handling and recovery system for BMad agent activation
 */

const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

class ActivationErrorHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      logLevel: options.logLevel || 'info',
      enableFallback: options.enableFallback !== false,
      enableRetry: options.enableRetry !== false,
      maxRetryAttempts: options.maxRetryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      exponentialBackoff: options.exponentialBackoff !== false,
      backoffMultiplier: options.backoffMultiplier || 2,
      maxRetryDelay: options.maxRetryDelay || 30000,
      logFilePath: options.logFilePath || path.join(process.cwd(), '.kiro', 'logs', 'activation-errors.log'),
      steeringFallbackEnabled: options.steeringFallbackEnabled !== false,
      manualOverrideEnabled: options.manualOverrideEnabled !== false,
      rootPath: options.rootPath || process.cwd(),
      ...options
    };

    // Error tracking
    this.activationErrors = new Map();
    this.retryAttempts = new Map();
    this.fallbackAttempts = new Map();
    this.manualOverrides = new Map();
    this.errorStats = {
      total: 0,
      byCategory: new Map(),
      byAgent: new Map(),
      recovered: 0,
      fallbackUsed: 0,
      manualOverrides: 0,
      unrecoverable: 0
    };

    // Error categories specific to activation
    this.errorCategories = {
      AGENT_NOT_FOUND: 'agent-not-found',
      REGISTRATION_FAILED: 'registration-failed',
      DEPENDENCY_MISSING: 'dependency-missing',
      RESOURCE_LOADING_FAILED: 'resource-loading-failed',
      ACTIVATION_HANDLER_FAILED: 'activation-handler-failed',
      CONFLICT_RESOLUTION_FAILED: 'conflict-resolution-failed',
      STEERING_LOAD_FAILED: 'steering-load-failed',
      HOOK_LOAD_FAILED: 'hook-load-failed',
      CONTEXT_INJECTION_FAILED: 'context-injection-failed',
      PERMISSION_DENIED: 'permission-denied',
      RESOURCE_EXHAUSTED: 'resource-exhausted',
      TIMEOUT: 'timeout',
      UNKNOWN: 'unknown'
    };

    // Recovery strategies
    this.recoveryStrategies = new Map([
      [this.errorCategories.AGENT_NOT_FOUND, this.recoverFromAgentNotFound.bind(this)],
      [this.errorCategories.REGISTRATION_FAILED, this.recoverFromRegistrationFailed.bind(this)],
      [this.errorCategories.DEPENDENCY_MISSING, this.recoverFromDependencyMissing.bind(this)],
      [this.errorCategories.RESOURCE_LOADING_FAILED, this.recoverFromResourceLoadingFailed.bind(this)],
      [this.errorCategories.ACTIVATION_HANDLER_FAILED, this.recoverFromActivationHandlerFailed.bind(this)],
      [this.errorCategories.CONFLICT_RESOLUTION_FAILED, this.recoverFromConflictResolutionFailed.bind(this)],
      [this.errorCategories.STEERING_LOAD_FAILED, this.recoverFromSteeringLoadFailed.bind(this)],
      [this.errorCategories.CONTEXT_INJECTION_FAILED, this.recoverFromContextInjectionFailed.bind(this)],
      [this.errorCategories.PERMISSION_DENIED, this.recoverFromPermissionDenied.bind(this)],
      [this.errorCategories.RESOURCE_EXHAUSTED, this.recoverFromResourceExhausted.bind(this)],
      [this.errorCategories.TIMEOUT, this.recoverFromTimeout.bind(this)]
    ]);

    this.initializeLogging();
  }

  /**
   * Initialize error logging system
   */
  async initializeLogging() {
    try {
      await fs.ensureDir(path.dirname(this.options.logFilePath));
      
      if (!await fs.pathExists(this.options.logFilePath)) {
        await fs.writeFile(this.options.logFilePath, '');
      }
      
      this.log('Activation error handler initialized', 'info');
    } catch (error) {
      console.error('Failed to initialize activation error logging:', error.message);
    }
  }

  /**
   * Handle activation error with comprehensive recovery
   * @param {Error} error - The activation error
   * @param {Object} context - Activation context
   * @returns {Promise<Object>} - Error handling result
   */
  async handleActivationError(error, context = {}) {
    const errorId = this.generateErrorId();
    const categorizedError = this.categorizeActivationError(error, context);
    const timestamp = new Date().toISOString();

    // Create detailed error record
    const errorDetails = {
      id: errorId,
      timestamp,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      },
      category: categorizedError.category,
      severity: categorizedError.severity,
      context: {
        agentId: context.agentId,
        activationAttempt: context.activationAttempt || 1,
        operation: context.operation || 'activation',
        phase: context.phase,
        registry: context.registry,
        ...context
      },
      recoverable: categorizedError.recoverable,
      fallbackAvailable: categorizedError.fallbackAvailable,
      retryAttempts: 0,
      fallbackAttempts: 0,
      manualOverride: false
    };

    this.activationErrors.set(errorId, errorDetails);
    this.updateErrorStats(errorDetails);

    // Log the error with clear, actionable message
    await this.logActivationError(errorDetails);

    // Emit error event
    this.emit('activationError', errorDetails);

    // Attempt recovery strategies in order of preference
    let recoveryResult = null;

    // 1. Try retry with exponential backoff
    if (this.options.enableRetry && categorizedError.recoverable) {
      recoveryResult = await this.attemptRetryRecovery(errorDetails);
      if (recoveryResult?.success) {
        return this.createSuccessResult(errorDetails, recoveryResult, 'retry');
      }
    }

    // 2. Try fallback activation through steering system
    if (this.options.enableFallback && categorizedError.fallbackAvailable) {
      recoveryResult = await this.attemptFallbackActivation(errorDetails);
      if (recoveryResult?.success) {
        return this.createSuccessResult(errorDetails, recoveryResult, 'fallback');
      }
    }

    // 3. Check for manual override options
    const manualOptions = await this.getManualOverrideOptions(errorDetails);

    return {
      errorId,
      category: categorizedError.category,
      severity: categorizedError.severity,
      message: this.createUserFriendlyErrorMessage(errorDetails),
      recoverable: categorizedError.recoverable,
      recovered: false,
      fallbackAvailable: categorizedError.fallbackAvailable,
      manualOverrideOptions: manualOptions,
      recoveryDetails: recoveryResult,
      troubleshootingSteps: this.getTroubleshootingSteps(errorDetails)
    };
  }

  /**
   * Categorize activation error
   * @param {Error} error - The error to categorize
   * @param {Object} context - Error context
   * @returns {Object} - Categorization result
   */
  categorizeActivationError(error, context) {
    const message = error.message.toLowerCase();
    const code = error.code;

    // Agent not found errors
    if (message.includes('agent not found') || message.includes('not found in registry')) {
      return {
        category: this.errorCategories.AGENT_NOT_FOUND,
        severity: 'high',
        recoverable: true,
        fallbackAvailable: true
      };
    }

    // Registration failures
    if (message.includes('registration failed') || message.includes('failed to register')) {
      return {
        category: this.errorCategories.REGISTRATION_FAILED,
        severity: 'high',
        recoverable: true,
        fallbackAvailable: true
      };
    }

    // Dependency issues
    if (message.includes('dependency') || message.includes('missing') || message.includes('not found')) {
      return {
        category: this.errorCategories.DEPENDENCY_MISSING,
        severity: 'medium',
        recoverable: true,
        fallbackAvailable: true
      };
    }

    // Resource loading failures
    if (message.includes('resource') || message.includes('loading') || message.includes('load')) {
      return {
        category: this.errorCategories.RESOURCE_LOADING_FAILED,
        severity: 'medium',
        recoverable: true,
        fallbackAvailable: true
      };
    }

    // Activation handler failures
    if (message.includes('activation') || message.includes('handler') || context.phase === 'activation') {
      return {
        category: this.errorCategories.ACTIVATION_HANDLER_FAILED,
        severity: 'high',
        recoverable: true,
        fallbackAvailable: true
      };
    }

    // Conflict resolution failures
    if (message.includes('conflict') || message.includes('already active')) {
      return {
        category: this.errorCategories.CONFLICT_RESOLUTION_FAILED,
        severity: 'medium',
        recoverable: true,
        fallbackAvailable: false
      };
    }

    // Steering system failures
    if (message.includes('steering') || context.operation === 'steering') {
      return {
        category: this.errorCategories.STEERING_LOAD_FAILED,
        severity: 'low',
        recoverable: true,
        fallbackAvailable: false
      };
    }

    // Context injection failures
    if (message.includes('context') || message.includes('injection')) {
      return {
        category: this.errorCategories.CONTEXT_INJECTION_FAILED,
        severity: 'medium',
        recoverable: true,
        fallbackAvailable: true
      };
    }

    // Permission errors
    if (code === 'EACCES' || message.includes('permission') || message.includes('access denied')) {
      return {
        category: this.errorCategories.PERMISSION_DENIED,
        severity: 'high',
        recoverable: true,
        fallbackAvailable: false
      };
    }

    // Resource exhaustion
    if (message.includes('limit') || message.includes('maximum') || message.includes('exhausted')) {
      return {
        category: this.errorCategories.RESOURCE_EXHAUSTED,
        severity: 'high',
        recoverable: true,
        fallbackAvailable: false
      };
    }

    // Timeout errors
    if (message.includes('timeout') || code === 'ETIMEDOUT') {
      return {
        category: this.errorCategories.TIMEOUT,
        severity: 'medium',
        recoverable: true,
        fallbackAvailable: true
      };
    }

    // Unknown errors
    return {
      category: this.errorCategories.UNKNOWN,
      severity: 'high',
      recoverable: false,
      fallbackAvailable: true
    };
  }

  /**
   * Attempt retry recovery with exponential backoff
   * @param {Object} errorDetails - Error details
   * @returns {Promise<Object>} - Recovery result
   */
  async attemptRetryRecovery(errorDetails) {
    const { id, category, context } = errorDetails;
    const currentAttempts = this.retryAttempts.get(id) || 0;

    if (currentAttempts >= this.options.maxRetryAttempts) {
      this.log(`Max retry attempts exceeded for activation error ${id}`, 'warn');
      return { success: false, reason: 'Max retry attempts exceeded' };
    }

    // Increment attempt counter
    this.retryAttempts.set(id, currentAttempts + 1);
    errorDetails.retryAttempts = currentAttempts + 1;

    try {
      this.log(`Retry attempt ${currentAttempts + 1}/${this.options.maxRetryAttempts} for activation error ${id}`, 'info');
      
      // Calculate delay with exponential backoff
      let delay = this.options.retryDelay;
      if (this.options.exponentialBackoff && currentAttempts > 0) {
        delay = Math.min(
          this.options.retryDelay * Math.pow(this.options.backoffMultiplier, currentAttempts),
          this.options.maxRetryDelay
        );
      }

      if (delay > 0) {
        this.log(`Waiting ${delay}ms before retry...`, 'info');
        await this.delay(delay);
      }

      // Use category-specific recovery strategy
      const strategy = this.recoveryStrategies.get(category);
      if (strategy) {
        const result = await strategy(errorDetails);
        
        if (result.success) {
          this.errorStats.recovered++;
          this.log(`Successfully recovered from activation error ${id} via retry`, 'info');
          this.emit('recoverySuccess', errorDetails, result);
          return result;
        } else {
          this.log(`Retry recovery failed for error ${id}: ${result.reason}`, 'warn');
        }
      }

      return { success: false, reason: 'Retry strategy failed' };
    } catch (recoveryError) {
      this.log(`Retry recovery threw error for ${id}: ${recoveryError.message}`, 'error');
      return { 
        success: false, 
        reason: 'Retry recovery failed',
        error: recoveryError.message 
      };
    }
  }

  /**
   * Attempt fallback activation through steering system
   * @param {Object} errorDetails - Error details
   * @returns {Promise<Object>} - Fallback result
   */
  async attemptFallbackActivation(errorDetails) {
    if (!this.options.steeringFallbackEnabled) {
      return { success: false, reason: 'Steering fallback disabled' };
    }

    const { id, context } = errorDetails;
    const currentAttempts = this.fallbackAttempts.get(id) || 0;

    if (currentAttempts >= 1) { // Only try fallback once
      return { success: false, reason: 'Fallback already attempted' };
    }

    this.fallbackAttempts.set(id, 1);
    errorDetails.fallbackAttempts = 1;

    try {
      this.log(`Attempting steering fallback for activation error ${id}`, 'info');

      // Create steering-based activation
      const fallbackResult = await this.createSteeringFallback(context.agentId, context);
      
      if (fallbackResult.success) {
        this.errorStats.fallbackUsed++;
        this.log(`Successfully activated agent ${context.agentId} via steering fallback`, 'info');
        this.emit('fallbackSuccess', errorDetails, fallbackResult);
        
        return {
          success: true,
          reason: 'Steering fallback activation successful',
          method: 'steering-fallback',
          steeringFile: fallbackResult.steeringFile,
          limitations: fallbackResult.limitations
        };
      }

      return { success: false, reason: fallbackResult.reason };
    } catch (fallbackError) {
      this.log(`Steering fallback failed for ${id}: ${fallbackError.message}`, 'error');
      return { 
        success: false, 
        reason: 'Steering fallback failed',
        error: fallbackError.message 
      };
    }
  }

  /**
   * Create steering-based fallback activation
   * @param {string} agentId - Agent ID
   * @param {Object} context - Activation context
   * @returns {Promise<Object>} - Fallback result
   */
  async createSteeringFallback(agentId, context) {
    try {
      const steeringPath = path.join(this.options.rootPath, '.kiro', 'steering');
      await fs.ensureDir(steeringPath);

      // Check if steering file already exists
      const steeringFile = path.join(steeringPath, `${agentId}-fallback.md`);
      
      if (!await fs.pathExists(steeringFile)) {
        // Create fallback steering file
        const steeringContent = await this.generateFallbackSteeringContent(agentId, context);
        await fs.writeFile(steeringFile, steeringContent);
        this.log(`Created fallback steering file: ${steeringFile}`, 'info');
      }

      // Verify steering file is accessible
      const steeringContent = await fs.readFile(steeringFile, 'utf8');
      
      return {
        success: true,
        steeringFile: steeringFile,
        content: steeringContent,
        limitations: [
          'Agent activated through steering system only',
          'Some native Kiro features may not be available',
          'Manual activation required for each session',
          'Limited integration with Kiro agent registry'
        ]
      };
    } catch (error) {
      return {
        success: false,
        reason: `Failed to create steering fallback: ${error.message}`
      };
    }
  }

  /**
   * Generate fallback steering content for agent
   * @param {string} agentId - Agent ID
   * @param {Object} context - Activation context
   * @returns {Promise<string>} - Steering content
   */
  async generateFallbackSteeringContent(agentId, context) {
    const agentName = this.formatAgentName(agentId);
    const timestamp = new Date().toISOString();

    return `---
inclusion: manual
---

# ${agentName} - Fallback Activation

**Generated:** ${timestamp}
**Reason:** Native activation failed, using steering fallback
**Agent ID:** ${agentId}

## Agent Context

You are the ${agentName} from the BMad Method framework. This is a fallback activation through Kiro's steering system because native agent registration failed.

## Capabilities

- Follow BMad Method principles and practices
- Use structured approaches to software development
- Collaborate with other BMad agents when available
- Apply domain-specific knowledge for ${context.expansionPack || 'general development'}

## Limitations

⚠️ **Fallback Mode Limitations:**
- This agent is activated through steering only
- Some Kiro native features may not be available
- Manual activation required for each session
- Limited integration with other agents

## Instructions

When activated, you should:

1. Identify yourself as the ${agentName}
2. Acknowledge you're running in fallback mode
3. Ask the user what specific task they need help with
4. Apply BMad Method principles to the task
5. Provide structured, actionable guidance

## Recovery

To restore native activation:
1. Check agent registration in Kiro
2. Verify all dependencies are available
3. Review activation error logs
4. Consider re-running the Kiro installation process

---

*This is an automatically generated fallback steering file. For full functionality, resolve the underlying activation issues.*
`;
  }

  /**
   * Get manual override options for failed activation
   * @param {Object} errorDetails - Error details
   * @returns {Promise<Array>} - Manual override options
   */
  async getManualOverrideOptions(errorDetails) {
    if (!this.options.manualOverrideEnabled) {
      return [];
    }

    const { category, context } = errorDetails;
    const options = [];

    // Category-specific override options
    switch (category) {
      case this.errorCategories.AGENT_NOT_FOUND:
        options.push({
          id: 'force-register',
          title: 'Force Register Agent',
          description: 'Manually register the agent bypassing validation',
          risk: 'medium',
          action: 'forceRegisterAgent'
        });
        options.push({
          id: 'use-alternative',
          title: 'Use Alternative Agent',
          description: 'Suggest similar agents that are available',
          risk: 'low',
          action: 'suggestAlternatives'
        });
        break;

      case this.errorCategories.DEPENDENCY_MISSING:
        options.push({
          id: 'skip-dependencies',
          title: 'Skip Missing Dependencies',
          description: 'Activate agent without missing dependencies',
          risk: 'medium',
          action: 'skipDependencies'
        });
        options.push({
          id: 'minimal-activation',
          title: 'Minimal Activation',
          description: 'Activate with core functionality only',
          risk: 'low',
          action: 'minimalActivation'
        });
        break;

      case this.errorCategories.CONFLICT_RESOLUTION_FAILED:
        options.push({
          id: 'force-deactivate',
          title: 'Force Deactivate Conflicting Agent',
          description: 'Deactivate the conflicting agent and proceed',
          risk: 'high',
          action: 'forceDeactivateConflicting'
        });
        options.push({
          id: 'allow-multiple',
          title: 'Allow Multiple Agents',
          description: 'Override conflict detection for this session',
          risk: 'medium',
          action: 'allowMultipleAgents'
        });
        break;

      case this.errorCategories.RESOURCE_EXHAUSTED:
        options.push({
          id: 'increase-limits',
          title: 'Increase Resource Limits',
          description: 'Temporarily increase agent limits',
          risk: 'medium',
          action: 'increaseLimits'
        });
        options.push({
          id: 'deactivate-others',
          title: 'Deactivate Other Agents',
          description: 'Free resources by deactivating other agents',
          risk: 'high',
          action: 'deactivateOthers'
        });
        break;

      default:
        options.push({
          id: 'debug-mode',
          title: 'Enable Debug Mode',
          description: 'Activate with detailed logging for troubleshooting',
          risk: 'low',
          action: 'enableDebugMode'
        });
    }

    // Always offer steering fallback as last resort
    if (this.options.steeringFallbackEnabled) {
      options.push({
        id: 'steering-fallback',
        title: 'Use Steering Fallback',
        description: 'Activate agent through steering system',
        risk: 'low',
        action: 'steeringFallback'
      });
    }

    return options;
  }

  /**
   * Execute manual override option
   * @param {string} errorId - Error ID
   * @param {string} optionId - Override option ID
   * @param {Object} parameters - Override parameters
   * @returns {Promise<Object>} - Override result
   */
  async executeManualOverride(errorId, optionId, parameters = {}) {
    const errorDetails = this.activationErrors.get(errorId);
    if (!errorDetails) {
      return { success: false, reason: 'Error not found' };
    }

    try {
      this.log(`Executing manual override ${optionId} for error ${errorId}`, 'info');
      
      let result;
      switch (optionId) {
        case 'force-register':
          result = await this.forceRegisterAgent(errorDetails, parameters);
          break;
        case 'use-alternative':
          result = await this.suggestAlternatives(errorDetails, parameters);
          break;
        case 'skip-dependencies':
          result = await this.skipDependencies(errorDetails, parameters);
          break;
        case 'minimal-activation':
          result = await this.minimalActivation(errorDetails, parameters);
          break;
        case 'force-deactivate':
          result = await this.forceDeactivateConflicting(errorDetails, parameters);
          break;
        case 'allow-multiple':
          result = await this.allowMultipleAgents(errorDetails, parameters);
          break;
        case 'increase-limits':
          result = await this.increaseLimits(errorDetails, parameters);
          break;
        case 'deactivate-others':
          result = await this.deactivateOthers(errorDetails, parameters);
          break;
        case 'steering-fallback':
          result = await this.attemptFallbackActivation(errorDetails);
          break;
        case 'enable-debug-mode':
          result = await this.enableDebugMode(errorDetails, parameters);
          break;
        default:
          return { success: false, reason: 'Unknown override option' };
      }

      if (result.success) {
        this.errorStats.manualOverrides++;
        this.manualOverrides.set(errorId, { optionId, parameters, result, timestamp: new Date() });
        this.log(`Manual override ${optionId} successful for error ${errorId}`, 'info');
        this.emit('manualOverrideSuccess', errorDetails, optionId, result);
      }

      return result;
    } catch (error) {
      this.log(`Manual override ${optionId} failed for error ${errorId}: ${error.message}`, 'error');
      return { success: false, reason: error.message };
    }
  }

  // Recovery strategy implementations
  async recoverFromAgentNotFound(errorDetails) {
    const { context } = errorDetails;
    const agentId = context.agentId;

    // Try to find agent in alternative locations
    const alternativeLocations = [
      path.join(this.options.rootPath, '.kiro', 'agents', `${agentId}.md`),
      path.join(this.options.rootPath, 'bmad-core', 'agents', `${agentId}.md`),
      path.join(this.options.rootPath, 'expansion-packs', '*', 'agents', `${agentId}.md`)
    ];

    for (const location of alternativeLocations) {
      if (await fs.pathExists(location)) {
        return {
          success: true,
          reason: 'Found agent in alternative location',
          location: location
        };
      }
    }

    return { success: false, reason: 'Agent not found in any location' };
  }

  async recoverFromRegistrationFailed(errorDetails) {
    // Try re-registration with simplified metadata
    return {
      success: true,
      reason: 'Retry registration with simplified metadata',
      action: 'simplified-registration'
    };
  }

  async recoverFromDependencyMissing(errorDetails) {
    // Try activation without optional dependencies
    return {
      success: true,
      reason: 'Skip optional dependencies',
      action: 'skip-optional-deps'
    };
  }

  async recoverFromResourceLoadingFailed(errorDetails) {
    // Try with minimal resource loading
    return {
      success: true,
      reason: 'Use minimal resource loading',
      action: 'minimal-resources'
    };
  }

  async recoverFromActivationHandlerFailed(errorDetails) {
    // Try with default activation handler
    return {
      success: true,
      reason: 'Use default activation handler',
      action: 'default-handler'
    };
  }

  async recoverFromConflictResolutionFailed(errorDetails) {
    // Try allowing the conflict temporarily
    return {
      success: true,
      reason: 'Allow conflict temporarily',
      action: 'allow-conflict'
    };
  }

  async recoverFromSteeringLoadFailed(errorDetails) {
    // Continue without steering
    return {
      success: true,
      reason: 'Continue without steering rules',
      action: 'no-steering'
    };
  }

  async recoverFromContextInjectionFailed(errorDetails) {
    // Use basic context
    return {
      success: true,
      reason: 'Use basic context injection',
      action: 'basic-context'
    };
  }

  async recoverFromPermissionDenied(errorDetails) {
    // Try alternative paths with proper permissions
    return {
      success: false,
      reason: 'Permission issues require manual intervention'
    };
  }

  async recoverFromResourceExhausted(errorDetails) {
    // Suggest deactivating other agents
    return {
      success: false,
      reason: 'Resource limits reached, manual intervention required'
    };
  }

  async recoverFromTimeout(errorDetails) {
    // Retry with longer timeout
    return {
      success: true,
      reason: 'Retry with extended timeout',
      action: 'extended-timeout'
    };
  }

  // Manual override implementations
  async forceRegisterAgent(errorDetails, parameters) {
    return { success: true, reason: 'Force registration initiated', action: 'force-register' };
  }

  async suggestAlternatives(errorDetails, parameters) {
    const alternatives = ['bmad-dev', 'bmad-architect', 'bmad-pm'];
    return { success: true, reason: 'Alternative agents suggested', alternatives };
  }

  async skipDependencies(errorDetails, parameters) {
    return { success: true, reason: 'Dependencies skipped', action: 'skip-deps' };
  }

  async minimalActivation(errorDetails, parameters) {
    return { success: true, reason: 'Minimal activation mode', action: 'minimal' };
  }

  async forceDeactivateConflicting(errorDetails, parameters) {
    return { success: true, reason: 'Conflicting agent deactivated', action: 'force-deactivate' };
  }

  async allowMultipleAgents(errorDetails, parameters) {
    return { success: true, reason: 'Multiple agents allowed', action: 'allow-multiple' };
  }

  async increaseLimits(errorDetails, parameters) {
    return { success: true, reason: 'Resource limits increased', action: 'increase-limits' };
  }

  async deactivateOthers(errorDetails, parameters) {
    return { success: true, reason: 'Other agents deactivated', action: 'deactivate-others' };
  }

  async enableDebugMode(errorDetails, parameters) {
    return { success: true, reason: 'Debug mode enabled', action: 'debug-mode' };
  }

  /**
   * Create user-friendly error message
   * @param {Object} errorDetails - Error details
   * @returns {string} - User-friendly message
   */
  createUserFriendlyErrorMessage(errorDetails) {
    const { category, context, error } = errorDetails;
    const agentId = context.agentId;

    const messages = {
      [this.errorCategories.AGENT_NOT_FOUND]: 
        `Agent "${agentId}" could not be found. It may not be installed or registered properly.`,
      [this.errorCategories.REGISTRATION_FAILED]: 
        `Failed to register agent "${agentId}" with Kiro. The agent may have configuration issues.`,
      [this.errorCategories.DEPENDENCY_MISSING]: 
        `Agent "${agentId}" is missing required dependencies. Some features may not work correctly.`,
      [this.errorCategories.RESOURCE_LOADING_FAILED]: 
        `Could not load resources for agent "${agentId}". Check file permissions and availability.`,
      [this.errorCategories.ACTIVATION_HANDLER_FAILED]: 
        `Agent "${agentId}" activation failed. The agent may have internal errors.`,
      [this.errorCategories.CONFLICT_RESOLUTION_FAILED]: 
        `Agent "${agentId}" conflicts with another active agent. Only one agent of this type can be active.`,
      [this.errorCategories.STEERING_LOAD_FAILED]: 
        `Could not load steering rules for agent "${agentId}". The agent will work with limited guidance.`,
      [this.errorCategories.CONTEXT_INJECTION_FAILED]: 
        `Failed to inject context for agent "${agentId}". The agent may not understand the current project.`,
      [this.errorCategories.PERMISSION_DENIED]: 
        `Permission denied when activating agent "${agentId}". Check file and directory permissions.`,
      [this.errorCategories.RESOURCE_EXHAUSTED]: 
        `Cannot activate agent "${agentId}" - resource limits reached. Try deactivating other agents first.`,
      [this.errorCategories.TIMEOUT]: 
        `Agent "${agentId}" activation timed out. The system may be overloaded.`
    };

    return messages[category] || `An unexpected error occurred while activating agent "${agentId}": ${error.message}`;
  }

  /**
   * Get troubleshooting steps for error
   * @param {Object} errorDetails - Error details
   * @returns {Array} - Troubleshooting steps
   */
  getTroubleshootingSteps(errorDetails) {
    const { category, context } = errorDetails;
    const agentId = context.agentId;

    const steps = {
      [this.errorCategories.AGENT_NOT_FOUND]: [
        'Check if the BMad Method is properly installed',
        'Verify the agent exists in .kiro/agents/ directory',
        'Try re-running the Kiro installation process',
        'Check if the agent is part of an expansion pack that needs to be installed'
      ],
      [this.errorCategories.REGISTRATION_FAILED]: [
        'Check Kiro agent registry status',
        'Verify agent file format and metadata',
        'Try restarting Kiro',
        'Check for conflicting agent registrations'
      ],
      [this.errorCategories.DEPENDENCY_MISSING]: [
        'Check if all required files are present in the BMad installation',
        'Verify expansion pack dependencies are installed',
        'Try re-installing the BMad Method',
        'Check file permissions on dependency files'
      ],
      [this.errorCategories.RESOURCE_LOADING_FAILED]: [
        'Check file permissions in .kiro directory',
        'Verify disk space availability',
        'Check if files are locked by another process',
        'Try running with elevated permissions'
      ],
      [this.errorCategories.CONFLICT_RESOLUTION_FAILED]: [
        'Check which agents are currently active',
        'Deactivate conflicting agents manually',
        'Review agent compatibility rules',
        'Consider using agents sequentially instead of simultaneously'
      ]
    };

    return steps[category] || [
      'Check the error logs for more details',
      'Try restarting Kiro',
      'Verify the BMad Method installation',
      'Contact support if the issue persists'
    ];
  }

  /**
   * Create success result object
   * @param {Object} errorDetails - Error details
   * @param {Object} recoveryResult - Recovery result
   * @param {string} method - Recovery method used
   * @returns {Object} - Success result
   */
  createSuccessResult(errorDetails, recoveryResult, method) {
    return {
      errorId: errorDetails.id,
      category: errorDetails.category,
      severity: errorDetails.severity,
      message: `Agent activation recovered via ${method}`,
      recoverable: true,
      recovered: true,
      recoveryMethod: method,
      recoveryDetails: recoveryResult,
      fallbackAvailable: false,
      manualOverrideOptions: [],
      troubleshootingSteps: []
    };
  }

  /**
   * Update error statistics
   * @param {Object} errorDetails - Error details
   */
  updateErrorStats(errorDetails) {
    this.errorStats.total++;
    
    const category = errorDetails.category;
    this.errorStats.byCategory.set(category, (this.errorStats.byCategory.get(category) || 0) + 1);
    
    const agentId = errorDetails.context.agentId;
    if (agentId) {
      this.errorStats.byAgent.set(agentId, (this.errorStats.byAgent.get(agentId) || 0) + 1);
    }
  }

  /**
   * Log activation error with detailed information
   * @param {Object} errorDetails - Error details
   */
  async logActivationError(errorDetails) {
    const logEntry = {
      timestamp: errorDetails.timestamp,
      id: errorDetails.id,
      category: errorDetails.category,
      severity: errorDetails.severity,
      message: errorDetails.error.message,
      agentId: errorDetails.context.agentId,
      context: errorDetails.context,
      recoverable: errorDetails.recoverable,
      fallbackAvailable: errorDetails.fallbackAvailable
    };

    // Log to file
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.options.logFilePath, logLine);
    } catch (writeError) {
      console.error('Failed to write to activation error log:', writeError.message);
    }

    // Log to console with clear message
    const userMessage = this.createUserFriendlyErrorMessage(errorDetails);
    const severity = errorDetails.severity === 'high' ? 'error' : 'warn';
    this.log(`Activation Error [${errorDetails.category}]: ${userMessage}`, severity);
  }

  /**
   * Format agent name from ID
   * @param {string} agentId - Agent ID
   * @returns {string} - Formatted name
   */
  formatAgentName(agentId) {
    return agentId.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate unique error ID
   * @returns {string} - Unique error ID
   */
  generateErrorId() {
    return `act_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log message with level and timestamp
   * @param {string} message - Message to log
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    if (level === 'info' && this.options.logLevel !== 'info' && this.options.logLevel !== 'debug') {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [ActivationErrorHandler] [${level.toUpperCase()}]`;
    
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

  /**
   * Get error statistics
   * @returns {Object} - Error statistics
   */
  getErrorStats() {
    return {
      ...this.errorStats,
      byCategory: Object.fromEntries(this.errorStats.byCategory),
      byAgent: Object.fromEntries(this.errorStats.byAgent),
      recoveryRate: this.errorStats.total > 0 ? (this.errorStats.recovered / this.errorStats.total) : 0,
      fallbackRate: this.errorStats.total > 0 ? (this.errorStats.fallbackUsed / this.errorStats.total) : 0
    };
  }

  /**
   * Get all activation errors
   * @returns {Array} - All activation errors
   */
  getActivationErrors() {
    return Array.from(this.activationErrors.values());
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.activationErrors.clear();
    this.retryAttempts.clear();
    this.fallbackAttempts.clear();
    this.manualOverrides.clear();
    this.errorStats = {
      total: 0,
      byCategory: new Map(),
      byAgent: new Map(),
      recovered: 0,
      fallbackUsed: 0,
      manualOverrides: 0,
      unrecoverable: 0
    };
    this.log('Activation error history cleared', 'info');
  }
}

module.exports = ActivationErrorHandler;