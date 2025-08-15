/**
 * Activation Manager
 * Handles agent activation requests, state management, and conflict resolution
 */

const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');
const ActivationErrorHandler = require('./activation-error-handler');

class ActivationManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.registry = options.registry;
    this.options = {
      rootPath: options.rootPath || process.cwd(),
      maxConcurrentAgents: 10,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      stateFile: '.kiro/agent-state.json',
      ...options
    };
    
    this.activeAgents = new Map();
    this.agentSessions = new Map();
    this.activationQueue = [];
    this.isProcessingQueue = false;
    this.sessionCleanupInterval = null;
    
    // Initialize activation error handler
    this.errorHandler = new ActivationErrorHandler({
      rootPath: this.options.rootPath,
      logLevel: options.logLevel || 'info',
      enableFallback: options.enableFallback !== false,
      enableRetry: options.enableRetry !== false,
      maxRetryAttempts: options.maxRetryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      steeringFallbackEnabled: options.steeringFallbackEnabled !== false,
      manualOverrideEnabled: options.manualOverrideEnabled !== false
    });
  }

  /**
   * Initialize the activation manager
   * @returns {Promise<boolean>} - Success status
   */
  async initialize() {
    try {
      console.log('Initializing Activation Manager...');
      
      // Load previous state if exists
      await this.loadState();
      
      // Start session cleanup
      this.startSessionCleanup();
      
      // Listen to registry events
      this.setupRegistryListeners();
      
      console.log(`✓ Activation Manager initialized with ${this.activeAgents.size} active agents`);
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Activation Manager:', error.message);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Setup listeners for registry events
   */
  setupRegistryListeners() {
    this.registry.on('agentRegistered', (agentMetadata) => {
      console.log(`Agent available for activation: ${agentMetadata.id}`);
    });
    
    this.registry.on('error', (error) => {
      console.error('Registry error:', error.message);
    });
  }

  /**
   * Activate an agent by ID with comprehensive error handling
   * @param {string} agentId - Agent ID to activate
   * @param {Object} context - Activation context
   * @returns {Promise<Object>} - Activated agent instance or error result
   */
  async activateAgent(agentId, context = {}) {
    const activationContext = {
      agentId,
      operation: 'activation',
      phase: 'initial',
      registry: this.registry,
      ...context
    };

    try {
      console.log(`Activation request for agent: ${agentId}`);
      
      // Check if agent is already active
      if (this.activeAgents.has(agentId)) {
        console.log(`Agent ${agentId} is already active`);
        return this.activeAgents.get(agentId);
      }
      
      // Check concurrent agent limit
      if (this.activeAgents.size >= this.options.maxConcurrentAgents) {
        const error = new Error(`Maximum concurrent agents limit reached (${this.options.maxConcurrentAgents})`);
        return await this.handleActivationError(error, { ...activationContext, phase: 'resource-check' });
      }
      
      // Get agent from registry
      activationContext.phase = 'registry-lookup';
      const registeredAgent = this.registry.getRegisteredAgent(agentId);
      if (!registeredAgent) {
        const error = new Error(`Agent not found in registry: ${agentId}`);
        return await this.handleActivationError(error, activationContext);
      }
      
      // Check for conflicts
      activationContext.phase = 'conflict-resolution';
      await this.resolveActivationConflicts(agentId, registeredAgent);
      
      // Load agent resources
      activationContext.phase = 'resource-loading';
      await this.loadAgentResources(registeredAgent);
      
      // Activate the agent
      activationContext.phase = 'activation';
      const instance = await this.performActivation(registeredAgent, context);
      
      // Store active agent
      this.activeAgents.set(agentId, instance);
      
      // Create session
      this.createAgentSession(agentId, instance);
      
      // Save state
      await this.saveState();
      
      this.emit('agentActivated', agentId, instance);
      console.log(`✓ Agent activated: ${agentId}`);
      
      return instance;
      
    } catch (error) {
      console.error(`Failed to activate agent ${agentId}:`, error.message);
      this.emit('agentActivationFailed', agentId, error);
      
      // Use comprehensive error handling
      return await this.handleActivationError(error, activationContext);
    }
  }

  /**
   * Deactivate an agent by ID
   * @param {string} agentId - Agent ID to deactivate
   * @returns {Promise<boolean>} - Success status
   */
  async deactivateAgent(agentId) {
    try {
      console.log(`Deactivation request for agent: ${agentId}`);
      
      if (!this.activeAgents.has(agentId)) {
        console.log(`Agent ${agentId} is not active`);
        return true;
      }
      
      const instance = this.activeAgents.get(agentId);
      
      // Cleanup agent resources
      await this.cleanupAgentResources(instance);
      
      // Remove from active agents
      this.activeAgents.delete(agentId);
      
      // Remove session
      this.agentSessions.delete(agentId);
      
      // Save state
      await this.saveState();
      
      this.emit('agentDeactivated', agentId, instance);
      console.log(`✓ Agent deactivated: ${agentId}`);
      
      return true;
      
    } catch (error) {
      console.error(`Failed to deactivate agent ${agentId}:`, error.message);
      this.emit('agentDeactivationFailed', agentId, error);
      return false;
    }
  }

  /**
   * Resolve activation conflicts
   * @param {string} agentId - Agent ID being activated
   * @param {Object} registeredAgent - Registered agent data
   * @returns {Promise<void>}
   */
  async resolveActivationConflicts(agentId, registeredAgent) {
    // Check for expansion pack conflicts
    if (registeredAgent.metadata.source === 'expansion-pack') {
      const expansionPack = registeredAgent.metadata.expansionPack;
      
      // Check if conflicting agents from same expansion pack are active
      for (const [activeId, activeInstance] of this.activeAgents) {
        if (activeInstance.metadata.source === 'expansion-pack' &&
            activeInstance.metadata.expansionPack === expansionPack &&
            this.hasConflict(agentId, activeId)) {
          
          console.log(`Resolving conflict between ${agentId} and ${activeId}`);
          await this.resolveConflict(agentId, activeId, registeredAgent, activeInstance);
        }
      }
    }
    
    // Check for role conflicts (e.g., multiple architects)
    const agentRole = this.extractAgentRole(agentId);
    if (agentRole) {
      for (const [activeId, activeInstance] of this.activeAgents) {
        const activeRole = this.extractAgentRole(activeId);
        if (activeRole === agentRole && agentRole !== 'dev') { // Allow multiple devs
          console.log(`Role conflict detected: ${agentRole} (${agentId} vs ${activeId})`);
          await this.resolveRoleConflict(agentId, activeId, registeredAgent, activeInstance);
        }
      }
    }
  }

  /**
   * Check if two agents have conflicts
   * @param {string} agentId1 - First agent ID
   * @param {string} agentId2 - Second agent ID
   * @returns {boolean} - True if conflict exists
   */
  hasConflict(agentId1, agentId2) {
    // Define conflict rules
    const conflictRules = [
      // Same agent type conflicts
      { pattern: /architect/, conflicts: ['architect'] },
      { pattern: /pm/, conflicts: ['pm', 'po'] },
      { pattern: /po/, conflicts: ['pm', 'po'] },
      { pattern: /qa/, conflicts: ['qa'] }
    ];
    
    const role1 = this.extractAgentRole(agentId1);
    const role2 = this.extractAgentRole(agentId2);
    
    for (const rule of conflictRules) {
      if (rule.pattern.test(agentId1) && rule.conflicts.includes(role2)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Resolve conflict between agents
   * @param {string} newAgentId - New agent being activated
   * @param {string} existingAgentId - Existing active agent
   * @param {Object} newAgent - New agent data
   * @param {Object} existingAgent - Existing agent data
   * @returns {Promise<void>}
   */
  async resolveConflict(newAgentId, existingAgentId, newAgent, existingAgent) {
    // Strategy: Deactivate existing agent if new one is more specific
    const newSpecificity = this.calculateAgentSpecificity(newAgent);
    const existingSpecificity = this.calculateAgentSpecificity(existingAgent);
    
    if (newSpecificity > existingSpecificity) {
      console.log(`Deactivating ${existingAgentId} in favor of more specific ${newAgentId}`);
      await this.deactivateAgent(existingAgentId);
    } else {
      throw new Error(`Agent conflict: ${newAgentId} conflicts with active ${existingAgentId}`);
    }
  }

  /**
   * Resolve role conflict between agents
   * @param {string} newAgentId - New agent being activated
   * @param {string} existingAgentId - Existing active agent
   * @param {Object} newAgent - New agent data
   * @param {Object} existingAgent - Existing agent data
   * @returns {Promise<void>}
   */
  async resolveRoleConflict(newAgentId, existingAgentId, newAgent, existingAgent) {
    // For role conflicts, ask user or use priority rules
    console.log(`Role conflict: Cannot have multiple agents with same role active`);
    throw new Error(`Role conflict: ${newAgentId} conflicts with active ${existingAgentId} (same role)`);
  }

  /**
   * Calculate agent specificity for conflict resolution
   * @param {Object} agent - Agent data
   * @returns {number} - Specificity score
   */
  calculateAgentSpecificity(agent) {
    let score = 0;
    
    // Expansion pack agents are more specific than core
    if (agent.metadata.source === 'expansion-pack') {
      score += 10;
    }
    
    // Longer descriptions indicate more specificity
    score += (agent.metadata.description || '').length / 100;
    
    // More recent agents are preferred
    if (agent.metadata.lastModified) {
      const daysSinceModified = (Date.now() - agent.metadata.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 30 - daysSinceModified); // Prefer agents modified in last 30 days
    }
    
    return score;
  }

  /**
   * Extract agent role from ID
   * @param {string} agentId - Agent ID
   * @returns {string|null} - Agent role or null
   */
  extractAgentRole(agentId) {
    const rolePatterns = {
      'architect': /architect/i,
      'pm': /pm|project-manager/i,
      'po': /po|product-owner/i,
      'dev': /dev|developer/i,
      'qa': /qa|quality|test/i,
      'sm': /sm|scrum-master/i,
      'analyst': /analyst/i,
      'ux': /ux|user-experience/i
    };
    
    for (const [role, pattern] of Object.entries(rolePatterns)) {
      if (pattern.test(agentId)) {
        return role;
      }
    }
    
    return null;
  }

  /**
   * Load agent resources and dependencies
   * @param {Object} registeredAgent - Registered agent data
   * @returns {Promise<void>}
   */
  async loadAgentResources(registeredAgent) {
    console.log(`Loading resources for agent: ${registeredAgent.id}`);
    
    // Load dependencies (tasks, templates, checklists)
    const dependencies = await this.loadAgentDependencies(registeredAgent);
    
    // Load steering rules
    const steeringRules = await this.loadSteeringRules(registeredAgent);
    
    // Load hooks
    const hooks = await this.loadAgentHooks(registeredAgent);
    
    // Store loaded resources
    registeredAgent.loadedResources = {
      dependencies,
      steeringRules,
      hooks,
      loadedAt: new Date()
    };
  }

  /**
   * Load agent dependencies
   * @param {Object} registeredAgent - Registered agent data
   * @returns {Promise<Object>} - Loaded dependencies
   */
  async loadAgentDependencies(registeredAgent) {
    // This would load actual dependencies from the file system
    // For now, return a placeholder
    return {
      tasks: [],
      templates: [],
      checklists: [],
      data: []
    };
  }

  /**
   * Load steering rules for agent
   * @param {Object} registeredAgent - Registered agent data
   * @returns {Promise<Array>} - Loaded steering rules
   */
  async loadSteeringRules(registeredAgent) {
    const steeringPath = path.join(this.options.rootPath, '.kiro/steering');
    const agentSteeringFile = path.join(steeringPath, `${registeredAgent.id}.md`);
    
    if (await fs.pathExists(agentSteeringFile)) {
      const content = await fs.readFile(agentSteeringFile, 'utf8');
      return [{ file: agentSteeringFile, content }];
    }
    
    return [];
  }

  /**
   * Load agent hooks
   * @param {Object} registeredAgent - Registered agent data
   * @returns {Promise<Array>} - Loaded hooks
   */
  async loadAgentHooks(registeredAgent) {
    const hooksPath = path.join(this.options.rootPath, '.kiro/hooks');
    
    if (!await fs.pathExists(hooksPath)) {
      return [];
    }
    
    // Look for hooks related to this agent
    const hookFiles = await fs.readdir(hooksPath);
    const agentHooks = [];
    
    for (const hookFile of hookFiles) {
      if (hookFile.includes(registeredAgent.id) || 
          hookFile.includes(registeredAgent.metadata.expansionPack || '')) {
        const hookPath = path.join(hooksPath, hookFile);
        const content = await fs.readFile(hookPath, 'utf8');
        agentHooks.push({ file: hookPath, content });
      }
    }
    
    return agentHooks;
  }

  /**
   * Perform the actual agent activation
   * @param {Object} registeredAgent - Registered agent data
   * @param {Object} context - Activation context
   * @returns {Promise<Object>} - Agent instance
   */
  async performActivation(registeredAgent, context) {
    // Use the registry's activation handler
    const instance = await registeredAgent.activationHandler(context);
    
    // Add activation manager specific data
    instance.activationManager = {
      activatedAt: new Date(),
      context: context,
      resources: registeredAgent.loadedResources
    };
    
    return instance;
  }

  /**
   * Create agent session
   * @param {string} agentId - Agent ID
   * @param {Object} instance - Agent instance
   */
  createAgentSession(agentId, instance) {
    const session = {
      agentId: agentId,
      instance: instance,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + this.options.sessionTimeout)
    };
    
    this.agentSessions.set(agentId, session);
  }

  /**
   * Update agent session activity
   * @param {string} agentId - Agent ID
   */
  updateSessionActivity(agentId) {
    const session = this.agentSessions.get(agentId);
    if (session) {
      session.lastActivity = new Date();
      session.expiresAt = new Date(Date.now() + this.options.sessionTimeout);
    }
  }

  /**
   * Start session cleanup interval
   */
  startSessionCleanup() {
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Check every minute
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions() {
    const now = new Date();
    const expiredSessions = [];
    
    for (const [agentId, session] of this.agentSessions) {
      if (session.expiresAt < now) {
        expiredSessions.push(agentId);
      }
    }
    
    for (const agentId of expiredSessions) {
      console.log(`Cleaning up expired session for agent: ${agentId}`);
      await this.deactivateAgent(agentId);
    }
  }

  /**
   * Cleanup agent resources
   * @param {Object} instance - Agent instance
   * @returns {Promise<void>}
   */
  async cleanupAgentResources(instance) {
    // Cleanup any resources held by the agent
    console.log(`Cleaning up resources for agent: ${instance.id}`);
  }

  /**
   * Load state from file
   * @returns {Promise<void>}
   */
  async loadState() {
    const stateFile = path.join(this.options.rootPath, this.options.stateFile);
    
    if (await fs.pathExists(stateFile)) {
      try {
        const state = await fs.readJson(stateFile);
        
        // Restore active agents (but don't actually activate them)
        // This is just for tracking purposes
        if (state.activeAgents) {
          console.log(`Found ${state.activeAgents.length} previously active agents`);
        }
        
      } catch (error) {
        console.warn('Failed to load activation state:', error.message);
      }
    }
  }

  /**
   * Save state to file
   * @returns {Promise<void>}
   */
  async saveState() {
    const stateFile = path.join(this.options.rootPath, this.options.stateFile);
    
    try {
      await fs.ensureDir(path.dirname(stateFile));
      
      const state = {
        activeAgents: Array.from(this.activeAgents.keys()),
        sessions: Array.from(this.agentSessions.entries()).map(([id, session]) => ({
          agentId: id,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          expiresAt: session.expiresAt
        })),
        savedAt: new Date()
      };
      
      await fs.writeJson(stateFile, state, { spaces: 2 });
      
    } catch (error) {
      console.warn('Failed to save activation state:', error.message);
    }
  }

  /**
   * Get active agent by ID
   * @param {string} agentId - Agent ID
   * @returns {Object|null} - Active agent instance or null
   */
  getActiveAgent(agentId) {
    return this.activeAgents.get(agentId) || null;
  }

  /**
   * Get all active agents
   * @returns {Map} - Map of active agents
   */
  getAllActiveAgents() {
    return new Map(this.activeAgents);
  }

  /**
   * Get agent session
   * @param {string} agentId - Agent ID
   * @returns {Object|null} - Agent session or null
   */
  getAgentSession(agentId) {
    return this.agentSessions.get(agentId) || null;
  }

  /**
   * Get activation statistics
   * @returns {Object} - Activation statistics
   */
  getStatistics() {
    return {
      activeAgents: this.activeAgents.size,
      totalSessions: this.agentSessions.size,
      maxConcurrentAgents: this.options.maxConcurrentAgents,
      activeAgentIds: Array.from(this.activeAgents.keys()),
      sessionInfo: Array.from(this.agentSessions.entries()).map(([id, session]) => ({
        agentId: id,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt
      }))
    };
  }

  /**
   * Handle activation error with comprehensive recovery
   * @param {Error} error - The activation error
   * @param {Object} context - Activation context
   * @returns {Promise<Object>} - Error handling result
   */
  async handleActivationError(error, context) {
    try {
      const result = await this.errorHandler.handleActivationError(error, context);
      
      // If error was recovered, try activation again
      if (result.recovered && result.recoveryMethod === 'retry') {
        console.log(`Retrying activation for ${context.agentId} after recovery`);
        // Note: In a real implementation, we'd need to be careful about infinite recursion
        // This is a simplified approach for demonstration
        return result;
      }
      
      // If fallback was used, return the fallback result
      if (result.recovered && result.recoveryMethod === 'fallback') {
        console.log(`Agent ${context.agentId} activated via fallback method`);
        return {
          id: context.agentId,
          name: this.formatAgentName(context.agentId),
          activationMethod: 'steering-fallback',
          limitations: result.recoveryDetails.limitations,
          steeringFile: result.recoveryDetails.steeringFile,
          activatedAt: new Date()
        };
      }
      
      return result;
    } catch (handlerError) {
      console.error('Error handler failed:', handlerError.message);
      return {
        errorId: 'handler-failed',
        category: 'unknown',
        severity: 'high',
        message: `Activation failed and error handler also failed: ${handlerError.message}`,
        recoverable: false,
        recovered: false,
        fallbackAvailable: false,
        manualOverrideOptions: []
      };
    }
  }

  /**
   * Execute manual override for activation error
   * @param {string} errorId - Error ID
   * @param {string} optionId - Override option ID
   * @param {Object} parameters - Override parameters
   * @returns {Promise<Object>} - Override result
   */
  async executeManualOverride(errorId, optionId, parameters = {}) {
    return await this.errorHandler.executeManualOverride(errorId, optionId, parameters);
  }

  /**
   * Get activation error statistics
   * @returns {Object} - Error statistics
   */
  getActivationErrorStats() {
    return this.errorHandler.getErrorStats();
  }

  /**
   * Get all activation errors
   * @returns {Array} - All activation errors
   */
  getActivationErrors() {
    return this.errorHandler.getActivationErrors();
  }

  /**
   * Clear activation error history
   */
  clearActivationErrors() {
    this.errorHandler.clearErrors();
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
   * Shutdown the activation manager
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('Shutting down Activation Manager...');
    
    // Clear cleanup interval
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }
    
    // Deactivate all agents
    const activeAgentIds = Array.from(this.activeAgents.keys());
    for (const agentId of activeAgentIds) {
      await this.deactivateAgent(agentId);
    }
    
    // Save final state
    await this.saveState();
    
    this.emit('shutdown');
    console.log('✓ Activation Manager shutdown complete');
  }

  /**
   * Set up activation handlers for all registered agents
   * @returns {Promise<boolean>} - Success status
   */
  async setupActivationHandlers() {
    try {
      console.log('Setting up activation handlers...');
      
      const registeredAgents = this.registry.getRegisteredAgents();
      let successCount = 0;
      let failureCount = 0;
      
      for (const [agentId, agentMetadata] of registeredAgents) {
        try {
          // Create activation handler for this agent
          const handler = this.createActivationHandler(agentId, agentMetadata);
          
          // Register the handler with the system (this would integrate with Kiro's native system)
          await this.registerActivationHandler(agentId, handler);
          
          successCount++;
          console.log(`✓ Activation handler set up for: ${agentMetadata.name}`);
        } catch (error) {
          failureCount++;
          console.log(`✗ Failed to set up activation handler for ${agentId}: ${error.message}`);
        }
      }
      
      console.log(`✓ Activation handlers setup complete: ${successCount} success, ${failureCount} failures`);
      return failureCount === 0;
      
    } catch (error) {
      console.error('Failed to setup activation handlers:', error.message);
      return false;
    }
  }

  /**
   * Create activation handler for an agent
   * @param {string} agentId - Agent ID
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Function} - Activation handler function
   */
  createActivationHandler(agentId, agentMetadata) {
    return async (activationContext = {}) => {
      try {
        // Load agent dependencies
        await this.loadAgentDependencies(agentId, agentMetadata);
        
        // Apply steering rules
        await this.applySteeringRules(agentId, agentMetadata);
        
        // Create agent instance
        const agentInstance = await this.createAgentInstance(agentId, agentMetadata, activationContext);
        
        // Track activation
        this.trackAgentActivation(agentId, agentInstance);
        
        return agentInstance;
      } catch (error) {
        console.error(`Activation handler error for ${agentId}:`, error.message);
        throw error;
      }
    };
  }

  /**
   * Register activation handler with the system
   * @param {string} agentId - Agent ID
   * @param {Function} handler - Activation handler function
   * @returns {Promise<void>}
   */
  async registerActivationHandler(agentId, handler) {
    // This would integrate with Kiro's native agent registration system
    // For now, we'll store it locally and emit an event
    this.emit('handlerRegistered', { agentId, handler });
    
    // In a real implementation, this would call Kiro's API:
    // await kiro.agents.registerActivationHandler(agentId, handler);
  }

  /**
   * Load agent dependencies
   * @param {string} agentId - Agent ID
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Promise<void>}
   */
  async loadAgentDependencies(agentId, agentMetadata) {
    // Load tasks, templates, checklists, etc.
    // This would be implemented based on the agent's dependency structure
    console.log(`Loading dependencies for ${agentId}...`);
  }

  /**
   * Apply steering rules for agent
   * @param {string} agentId - Agent ID
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Promise<void>}
   */
  async applySteeringRules(agentId, agentMetadata) {
    // Apply relevant steering rules based on agent type and expansion pack
    console.log(`Applying steering rules for ${agentId}...`);
  }

  /**
   * Create agent instance
   * @param {string} agentId - Agent ID
   * @param {Object} agentMetadata - Agent metadata
   * @param {Object} activationContext - Activation context
   * @returns {Promise<Object>} - Agent instance
   */
  async createAgentInstance(agentId, agentMetadata, activationContext) {
    // Create the actual agent instance that can be used by Kiro
    return {
      id: agentId,
      name: agentMetadata.name,
      description: agentMetadata.description,
      source: agentMetadata.source,
      expansionPack: agentMetadata.expansionPack,
      activatedAt: new Date().toISOString(),
      context: activationContext
    };
  }

  /**
   * Track agent activation
   * @param {string} agentId - Agent ID
   * @param {Object} agentInstance - Agent instance
   */
  trackAgentActivation(agentId, agentInstance) {
    this.activeAgents.set(agentId, agentInstance);
    this.emit('agentActivated', { agentId, agentInstance });
  }
}

module.exports = ActivationManager;