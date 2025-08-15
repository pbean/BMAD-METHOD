/**
 * Kiro Integration Adapter
 * Main entry point for BMad Method Kiro IDE integration
 */

const KiroDetector = require('./kiro-detector');
const AgentDiscovery = require('./agent-discovery');
const AgentTransformer = require('./agent-transformer');
const SpecGenerator = require('./spec-generator');
const ContextInjector = require('./context-injector');
const HookGenerator = require('./hook-generator');
const MCPIntegrator = require('./mcp-integrator');
const KiroAgentRegistry = require('./kiro-agent-registry');
const ActivationManager = require('./activation-manager');
const ActivationMonitor = require('./activation-monitor');
const UpgradeMigrationManager = require('./upgrade-migration-manager');
const ConversionMonitor = require('./conversion-monitor');
const ConversionDiagnostics = require('./conversion-diagnostics');

class KiroAdapter {
  constructor(options = {}) {
    this.options = options;
    this.detector = new KiroDetector();
    
    // Initialize monitoring system
    this.monitor = new ConversionMonitor({
      logLevel: options.logLevel || 'info',
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableDetailedLogging: options.enableDetailedLogging !== false,
      logDirectory: options.logDirectory,
      reportDirectory: options.reportDirectory,
      ...options
    });

    this.diagnostics = new ConversionDiagnostics({
      rootPath: options.rootPath || process.cwd(),
      logLevel: options.logLevel || 'info',
      enableDetailedAnalysis: options.enableDetailedAnalysis !== false,
      enablePerformanceAnalysis: options.enablePerformanceAnalysis !== false,
      ...options
    });

    // Initialize components with monitoring support
    this.agentDiscovery = new AgentDiscovery({
      ...options,
      enableMonitoring: true
    });
    this.agentTransformer = new AgentTransformer({
      ...options,
      enablePerformanceMonitoring: true,
      enableDetailedLogging: true
    });
    this.specGenerator = new SpecGenerator();
    this.contextInjector = new ContextInjector();
    this.hookGenerator = new HookGenerator();
    this.mcpIntegrator = new MCPIntegrator();
    this.agentRegistry = new KiroAgentRegistry(options);
    this.activationManager = new ActivationManager({ registry: this.agentRegistry, ...options });
    this.activationMonitor = new ActivationMonitor({
      registry: this.agentRegistry,
      activationManager: this.activationManager,
      ...options
    });
    this.upgradeMigrationManager = new UpgradeMigrationManager(options);
  }

  /**
   * Initialize Kiro integration for BMad Method
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(projectPath) {
    try {
      // Detect Kiro workspace
      const isKiroWorkspace = await this.detector.detectKiroWorkspace(projectPath);
      
      if (!isKiroWorkspace) {
        throw new Error('Kiro workspace not detected. Please ensure you are in a Kiro project directory.');
      }

      console.log('✓ Kiro workspace detected');
      return true;
    } catch (error) {
      console.error('Failed to initialize Kiro integration:', error.message);
      return false;
    }
  }

  /**
   * Get Kiro workspace information
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<Object>} - Workspace information
   */
  async getWorkspaceInfo(projectPath) {
    return await this.detector.getWorkspaceInfo(projectPath);
  }

  /**
   * Discover all BMad agents (core and expansion packs)
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<Array>} - Array of discovered agent metadata
   */
  async discoverAgents(projectPath) {
    this.agentDiscovery.options.rootPath = projectPath;
    return await this.agentDiscovery.scanAllAgents();
  }

  /**
   * Get agent discovery statistics
   * @returns {Object} - Discovery statistics
   */
  getAgentDiscoveryStats() {
    return this.agentDiscovery.getStatistics();
  }

  /**
   * Get discovered agent by ID
   * @param {string} agentId - Agent ID
   * @returns {Object|null} - Agent metadata or null
   */
  getDiscoveredAgent(agentId) {
    return this.agentDiscovery.getAgent(agentId);
  }

  /**
   * Get all discovered agents
   * @returns {Map} - Map of agent ID to metadata
   */
  getAllDiscoveredAgents() {
    return this.agentDiscovery.getDiscoveredAgents();
  }

  /**
   * Initialize agent registry and activation manager
   * @returns {Promise<boolean>} - Success status
   */
  async initializeAgentSystem() {
    try {
      console.log('Initializing agent registration and activation system...');
      
      // Initialize registry
      const registrySuccess = await this.agentRegistry.initialize();
      if (!registrySuccess) {
        throw new Error('Failed to initialize agent registry');
      }
      
      // Initialize activation manager
      const activationSuccess = await this.activationManager.initialize();
      if (!activationSuccess) {
        throw new Error('Failed to initialize activation manager');
      }
      
      // Initialize activation monitor
      const monitorSuccess = await this.activationMonitor.initialize();
      if (!monitorSuccess) {
        console.warn('⚠ Failed to initialize activation monitor - monitoring will be disabled');
      } else {
        console.log('✓ Activation monitoring enabled');
      }
      
      console.log('✓ Agent system initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize agent system:', error.message);
      return false;
    }
  }

  /**
   * Register all discovered agents with Kiro
   * @returns {Promise<boolean>} - Success status
   */
  async registerAllAgents() {
    try {
      console.log('Registering all discovered agents...');
      
      // Ensure registry is initialized
      if (!this.agentRegistry.isInitialized) {
        await this.agentRegistry.initialize();
      }
      
      const stats = this.agentRegistry.getStatistics();
      console.log(`✓ Registered ${stats.totalRegistered} agents`);
      
      if (stats.totalErrors > 0) {
        console.warn(`⚠ ${stats.totalErrors} agents failed to register`);
        const errors = this.agentRegistry.getRegistrationErrors();
        for (const [agentId, error] of errors) {
          console.error(`  - ${agentId}: ${error.message}`);
        }
      }
      
      return stats.totalErrors === 0;
      
    } catch (error) {
      console.error('Failed to register agents:', error.message);
      return false;
    }
  }

  /**
   * Activate an agent by ID
   * @param {string} agentId - Agent ID to activate
   * @param {Object} context - Activation context
   * @returns {Promise<Object>} - Activated agent instance
   */
  async activateAgent(agentId, context = {}) {
    return await this.activationManager.activateAgent(agentId, context);
  }

  /**
   * Deactivate an agent by ID
   * @param {string} agentId - Agent ID to deactivate
   * @returns {Promise<boolean>} - Success status
   */
  async deactivateAgent(agentId) {
    return await this.activationManager.deactivateAgent(agentId);
  }

  /**
   * Get all registered agents
   * @returns {Map} - Map of registered agents
   */
  getAllRegisteredAgents() {
    return this.agentRegistry.getAllRegisteredAgents();
  }

  /**
   * Get all active agents
   * @returns {Map} - Map of active agents
   */
  getAllActiveAgents() {
    return this.activationManager.getAllActiveAgents();
  }

  /**
   * Get agent registry statistics
   * @returns {Object} - Registry statistics
   */
  getRegistryStatistics() {
    return this.agentRegistry.getStatistics();
  }

  /**
   * Get activation manager statistics
   * @returns {Object} - Activation statistics
   */
  getActivationStatistics() {
    return this.activationManager.getStatistics();
  }

  /**
   * Get activation monitoring statistics
   * @returns {Object} - Activation monitoring statistics
   */
  getActivationMonitoringStatistics() {
    return this.activationMonitor ? this.activationMonitor.getActivationStatistics() : null;
  }

  /**
   * Get performance monitoring statistics
   * @returns {Object} - Performance statistics
   */
  getPerformanceStatistics() {
    return this.activationMonitor ? this.activationMonitor.getPerformanceStatistics() : null;
  }

  /**
   * Get usage analytics
   * @returns {Object} - Usage analytics
   */
  getUsageAnalytics() {
    return this.activationMonitor ? this.activationMonitor.getUsageAnalytics() : null;
  }

  /**
   * Get health check results
   * @returns {Object} - Health check results
   */
  getHealthCheckResults() {
    return this.activationMonitor ? this.activationMonitor.getHealthCheckResults() : null;
  }

  /**
   * Get most popular agents
   * @param {number} limit - Number of agents to return
   * @returns {Array} - Most popular agents
   */
  getMostPopularAgents(limit = 10) {
    return this.activationMonitor ? this.activationMonitor.getMostPopularAgents(limit) : [];
  }

  /**
   * Get agents with performance issues
   * @returns {Array} - Agents with performance issues
   */
  getPerformanceIssues() {
    return this.activationMonitor ? this.activationMonitor.getPerformanceIssues() : [];
  }

  /**
   * Get agents with low effectiveness
   * @param {number} threshold - Effectiveness threshold (default: 70%)
   * @returns {Array} - Agents with low effectiveness
   */
  getLowEffectivenessAgents(threshold = 70) {
    return this.activationMonitor ? this.activationMonitor.getLowEffectivenessAgents(threshold) : [];
  }

  /**
   * Get comprehensive activation monitoring report
   * @returns {Object} - Comprehensive monitoring report
   */
  getActivationMonitoringReport() {
    return this.activationMonitor ? this.activationMonitor.getMonitoringReport() : null;
  }

  /**
   * Reset activation monitoring metrics
   */
  resetActivationMonitoringMetrics() {
    if (this.activationMonitor) {
      this.activationMonitor.resetMetrics();
    }
  }

  /**
   * Detect and upgrade existing incomplete installations
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Upgrade options
   * @returns {Promise<Object>} - Upgrade results
   */
  async detectAndUpgradeInstallation(projectPath, options = {}) {
    this.upgradeMigrationManager.options.rootPath = projectPath;
    return await this.upgradeMigrationManager.detectIncompleteInstallation();
  }

  /**
   * Perform incremental conversion for missing agents
   * @param {string} projectPath - Path to the project directory
   * @param {Array} missingAgentIds - Optional list of specific agents to convert
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} - Conversion results
   */
  async performIncrementalConversion(projectPath, missingAgentIds = null, options = {}) {
    this.upgradeMigrationManager.options.rootPath = projectPath;
    return await this.upgradeMigrationManager.performIncrementalConversion(missingAgentIds, options);
  }

  /**
   * Migrate existing steering-based workarounds to native agents
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} - Migration results
   */
  async migrateSteeringWorkarounds(projectPath, options = {}) {
    this.upgradeMigrationManager.options.rootPath = projectPath;
    return await this.upgradeMigrationManager.migrateSteeringWorkarounds(options);
  }

  /**
   * Preserve user customizations during upgrade
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Preservation options
   * @returns {Promise<Object>} - Preservation results
   */
  async preserveUserCustomizations(projectPath, options = {}) {
    this.upgradeMigrationManager.options.rootPath = projectPath;
    return await this.upgradeMigrationManager.preserveUserCustomizations(options);
  }

  /**
   * Perform complete upgrade with all migration features
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Upgrade options
   * @returns {Promise<Object>} - Complete upgrade results
   */
  async performCompleteUpgrade(projectPath, options = {}) {
    this.upgradeMigrationManager.options.rootPath = projectPath;
    return await this.upgradeMigrationManager.performCompleteUpgrade(options);
  }

  /**
   * Get upgrade and migration statistics
   * @returns {Object} - Upgrade statistics
   */
  getUpgradeStatistics() {
    return {
      conversionStats: this.agentTransformer.getConversionStatistics(),
      discoveryStats: this.agentDiscovery.getStatistics(),
      upgradeProgress: this.upgradeMigrationManager.upgradeProgress,
      installationState: this.upgradeMigrationManager.installationState
    };
  }

  /**
   * Get conversion monitoring statistics
   * @returns {Object} - Monitoring statistics
   */
  getMonitoringStatistics() {
    return this.monitor.getStatistics();
  }

  /**
   * Get active conversions
   * @returns {Array} - Active conversions
   */
  getActiveConversions() {
    return this.monitor.getActiveConversions();
  }

  /**
   * Get conversion history
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} - Conversion history
   */
  getConversionHistory(limit = 100) {
    return this.monitor.getConversionHistory(limit);
  }

  /**
   * Generate diagnostic report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} - Diagnostic report
   */
  async generateDiagnosticReport(options = {}) {
    return await this.monitor.generateDiagnosticReport(options);
  }

  /**
   * Run comprehensive diagnostics
   * @param {Object} options - Diagnostic options
   * @returns {Promise<Object>} - Diagnostic results
   */
  async runDiagnostics(options = {}) {
    return await this.diagnostics.runComprehensiveDiagnostics(options);
  }

  /**
   * Clear monitoring data
   * @param {Object} options - Clear options
   */
  clearMonitoringData(options = {}) {
    this.monitor.clearMonitoringData(options);
  }

  /**
   * Start monitoring session
   * @param {string} sessionId - Session identifier
   * @param {Object} sessionInfo - Session information
   * @returns {Object} - Session monitoring object
   */
  startMonitoringSession(sessionId, sessionInfo = {}) {
    return this.monitor.startConversionSession(sessionId, sessionInfo);
  }

  /**
   * Complete monitoring session
   * @param {string} sessionId - Session identifier
   * @param {Object} result - Session result
   */
  completeMonitoringSession(sessionId, result = {}) {
    this.monitor.completeConversionSession(sessionId, result);
  }

  /**
   * Shutdown the agent system
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('Shutting down Kiro adapter...');
    
    if (this.activationMonitor) {
      await this.activationMonitor.stop();
    }
    
    if (this.activationManager) {
      await this.activationManager.shutdown();
    }

    if (this.monitor) {
      this.monitor.shutdown();
    }
    
    console.log('✓ Kiro adapter shutdown complete');
  }
}

module.exports = KiroAdapter;