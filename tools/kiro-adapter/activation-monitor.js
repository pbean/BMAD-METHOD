/**
 * Activation Monitor
 * Monitors agent activation success/failure, performance, usage analytics, and health checks
 */

const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

class ActivationMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      rootPath: options.rootPath || process.cwd(),
      metricsFile: '.kiro/activation-metrics.json',
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes
      performanceThreshold: 5000, // 5 seconds
      retentionDays: 30,
      enableDetailedLogging: options.enableDetailedLogging !== false,
      ...options
    };
    
    // Tracking data
    this.activationMetrics = {
      totalActivations: 0,
      successfulActivations: 0,
      failedActivations: 0,
      activationHistory: [],
      performanceMetrics: new Map(),
      usageAnalytics: new Map(),
      healthChecks: new Map(),
      errors: []
    };
    
    // Active monitoring
    this.healthCheckInterval = null;
    this.performanceTrackers = new Map();
    this.isMonitoring = false;
    
    // Registry and activation manager references
    this.registry = options.registry;
    this.activationManager = options.activationManager;
  }

  /**
   * Initialize the activation monitor
   * @returns {Promise<boolean>} - Success status
   */
  async initialize() {
    try {
      console.log('Initializing Activation Monitor...');
      
      // Load existing metrics
      await this.loadMetrics();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Start health checks
      this.startHealthChecks();
      
      // Start monitoring
      this.isMonitoring = true;
      
      console.log('✓ Activation Monitor initialized');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Activation Monitor:', error.message);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Setup event listeners for activation events
   */
  setupEventListeners() {
    if (this.activationManager) {
      // Listen to activation events
      this.activationManager.on('agentActivated', (agentId, instance) => {
        this.trackActivationSuccess(agentId, instance);
      });
      
      this.activationManager.on('agentActivationFailed', (agentId, error) => {
        this.trackActivationFailure(agentId, error);
      });
      
      this.activationManager.on('agentDeactivated', (agentId, instance) => {
        this.trackDeactivation(agentId, instance);
      });
    }
    
    if (this.registry) {
      // Listen to registry events
      this.registry.on('agentRegistered', (agentMetadata) => {
        this.initializeAgentMetrics(agentMetadata.id);
      });
      
      this.registry.on('error', (error) => {
        this.trackRegistryError(error);
      });
    }
  }

  /**
   * Track successful agent activation
   * @param {string} agentId - Agent ID
   * @param {Object} instance - Agent instance
   */
  trackActivationSuccess(agentId, instance) {
    const timestamp = new Date();
    const activationRecord = {
      agentId,
      status: 'success',
      timestamp,
      duration: this.getActivationDuration(agentId),
      instance: {
        id: instance.id,
        name: instance.name,
        source: instance.metadata?.source,
        expansionPack: instance.metadata?.expansionPack
      }
    };
    
    // Update metrics
    this.activationMetrics.totalActivations++;
    this.activationMetrics.successfulActivations++;
    this.activationMetrics.activationHistory.push(activationRecord);
    
    // Update usage analytics
    this.updateUsageAnalytics(agentId, 'activation_success');
    
    // Update performance metrics
    this.updatePerformanceMetrics(agentId, activationRecord.duration);
    
    // Log detailed information
    if (this.options.enableDetailedLogging) {
      console.log(`✓ Activation tracked: ${agentId} (${activationRecord.duration}ms)`);
    }
    
    this.emit('activationTracked', activationRecord);
    
    // Save metrics periodically
    this.saveMetricsAsync();
  }

  /**
   * Track failed agent activation
   * @param {string} agentId - Agent ID
   * @param {Error} error - Activation error
   */
  trackActivationFailure(agentId, error) {
    const timestamp = new Date();
    const activationRecord = {
      agentId,
      status: 'failure',
      timestamp,
      duration: this.getActivationDuration(agentId),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        category: this.categorizeError(error)
      }
    };
    
    // Update metrics
    this.activationMetrics.totalActivations++;
    this.activationMetrics.failedActivations++;
    this.activationMetrics.activationHistory.push(activationRecord);
    this.activationMetrics.errors.push(activationRecord);
    
    // Update usage analytics
    this.updateUsageAnalytics(agentId, 'activation_failure');
    
    // Log detailed information
    if (this.options.enableDetailedLogging) {
      console.log(`✗ Activation failure tracked: ${agentId} - ${error.message}`);
    }
    
    this.emit('activationFailureTracked', activationRecord);
    
    // Save metrics immediately for failures
    this.saveMetricsAsync();
  }

  /**
   * Track agent deactivation
   * @param {string} agentId - Agent ID
   * @param {Object} instance - Agent instance
   */
  trackDeactivation(agentId, instance) {
    const timestamp = new Date();
    const sessionDuration = this.calculateSessionDuration(instance);
    
    const deactivationRecord = {
      agentId,
      timestamp,
      sessionDuration,
      instance: {
        id: instance.id,
        name: instance.name,
        activatedAt: instance.activatedAt
      }
    };
    
    // Update usage analytics
    this.updateUsageAnalytics(agentId, 'deactivation', { sessionDuration });
    
    // Clean up performance tracker
    this.performanceTrackers.delete(agentId);
    
    if (this.options.enableDetailedLogging) {
      console.log(`Deactivation tracked: ${agentId} (session: ${sessionDuration}ms)`);
    }
    
    this.emit('deactivationTracked', deactivationRecord);
  }

  /**
   * Start performance tracking for an agent activation
   * @param {string} agentId - Agent ID
   */
  startPerformanceTracking(agentId) {
    this.performanceTrackers.set(agentId, {
      startTime: Date.now(),
      agentId
    });
  }

  /**
   * Get activation duration for an agent
   * @param {string} agentId - Agent ID
   * @returns {number} - Duration in milliseconds
   */
  getActivationDuration(agentId) {
    const tracker = this.performanceTrackers.get(agentId);
    if (tracker) {
      return Date.now() - tracker.startTime;
    }
    return 0;
  }

  /**
   * Update performance metrics for an agent
   * @param {string} agentId - Agent ID
   * @param {number} duration - Activation duration in milliseconds
   */
  updatePerformanceMetrics(agentId, duration) {
    if (!this.activationMetrics.performanceMetrics.has(agentId)) {
      this.activationMetrics.performanceMetrics.set(agentId, {
        totalActivations: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        slowActivations: 0
      });
    }
    
    const metrics = this.activationMetrics.performanceMetrics.get(agentId);
    metrics.totalActivations++;
    metrics.totalDuration += duration;
    metrics.averageDuration = metrics.totalDuration / metrics.totalActivations;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    
    if (duration > this.options.performanceThreshold) {
      metrics.slowActivations++;
    }
    
    this.activationMetrics.performanceMetrics.set(agentId, metrics);
  }

  /**
   * Update usage analytics for an agent
   * @param {string} agentId - Agent ID
   * @param {string} eventType - Type of event
   * @param {Object} data - Additional event data
   */
  updateUsageAnalytics(agentId, eventType, data = {}) {
    if (!this.activationMetrics.usageAnalytics.has(agentId)) {
      this.activationMetrics.usageAnalytics.set(agentId, {
        totalActivations: 0,
        totalFailures: 0,
        totalDeactivations: 0,
        totalSessionTime: 0,
        averageSessionTime: 0,
        lastActivated: null,
        firstActivated: null,
        effectiveness: 0,
        popularityScore: 0
      });
    }
    
    const analytics = this.activationMetrics.usageAnalytics.get(agentId);
    const now = new Date();
    
    switch (eventType) {
      case 'activation_success':
        analytics.totalActivations++;
        analytics.lastActivated = now;
        if (!analytics.firstActivated) {
          analytics.firstActivated = now;
        }
        break;
        
      case 'activation_failure':
        analytics.totalFailures++;
        break;
        
      case 'deactivation':
        analytics.totalDeactivations++;
        if (data.sessionDuration) {
          analytics.totalSessionTime += data.sessionDuration;
          analytics.averageSessionTime = analytics.totalSessionTime / analytics.totalDeactivations;
        }
        break;
    }
    
    // Calculate effectiveness (success rate)
    const totalAttempts = analytics.totalActivations + analytics.totalFailures;
    analytics.effectiveness = totalAttempts > 0 ? (analytics.totalActivations / totalAttempts) * 100 : 0;
    
    // Calculate popularity score (weighted by recency and frequency)
    analytics.popularityScore = this.calculatePopularityScore(analytics);
    
    this.activationMetrics.usageAnalytics.set(agentId, analytics);
  }

  /**
   * Calculate popularity score for an agent
   * @param {Object} analytics - Agent analytics data
   * @returns {number} - Popularity score
   */
  calculatePopularityScore(analytics) {
    const frequencyScore = analytics.totalActivations * 10;
    const effectivenessScore = analytics.effectiveness;
    const recencyScore = analytics.lastActivated ? 
      Math.max(0, 100 - ((Date.now() - analytics.lastActivated.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    
    return (frequencyScore + effectivenessScore + recencyScore) / 3;
  }

  /**
   * Calculate session duration for an agent instance
   * @param {Object} instance - Agent instance
   * @returns {number} - Session duration in milliseconds
   */
  calculateSessionDuration(instance) {
    if (instance.activatedAt) {
      const activatedAt = new Date(instance.activatedAt);
      return Date.now() - activatedAt.getTime();
    }
    return 0;
  }

  /**
   * Categorize error for better analytics
   * @param {Error} error - Error object
   * @returns {string} - Error category
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('not found') || message.includes('missing')) {
      return 'not_found';
    } else if (message.includes('conflict') || message.includes('already active')) {
      return 'conflict';
    } else if (message.includes('timeout') || message.includes('slow')) {
      return 'performance';
    } else if (message.includes('dependency') || message.includes('resource')) {
      return 'dependency';
    } else if (message.includes('permission') || message.includes('access')) {
      return 'permission';
    } else {
      return 'unknown';
    }
  }

  /**
   * Initialize metrics for a new agent
   * @param {string} agentId - Agent ID
   */
  initializeAgentMetrics(agentId) {
    if (!this.activationMetrics.performanceMetrics.has(agentId)) {
      this.activationMetrics.performanceMetrics.set(agentId, {
        totalActivations: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        slowActivations: 0
      });
    }
    
    if (!this.activationMetrics.usageAnalytics.has(agentId)) {
      this.activationMetrics.usageAnalytics.set(agentId, {
        totalActivations: 0,
        totalFailures: 0,
        totalDeactivations: 0,
        totalSessionTime: 0,
        averageSessionTime: 0,
        lastActivated: null,
        firstActivated: null,
        effectiveness: 0,
        popularityScore: 0
      });
    }
  }

  /**
   * Start health checks for registered agents
   */
  startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.options.healthCheckInterval);
    
    // Perform initial health check
    this.performHealthChecks();
  }

  /**
   * Perform health checks on all registered agents
   * @returns {Promise<void>}
   */
  async performHealthChecks() {
    if (!this.registry) {
      return;
    }
    
    const registeredAgents = this.registry.getRegisteredAgents();
    const timestamp = new Date();
    
    for (const [agentId, agentData] of registeredAgents) {
      try {
        const healthStatus = await this.checkAgentHealth(agentId, agentData);
        
        this.activationMetrics.healthChecks.set(agentId, {
          agentId,
          timestamp,
          status: healthStatus.status,
          details: healthStatus.details,
          lastCheck: timestamp
        });
        
        if (healthStatus.status !== 'healthy') {
          console.warn(`Health check warning for ${agentId}: ${healthStatus.details.message}`);
          this.emit('healthCheckWarning', { agentId, healthStatus });
        }
        
      } catch (error) {
        this.activationMetrics.healthChecks.set(agentId, {
          agentId,
          timestamp,
          status: 'error',
          details: {
            message: error.message,
            error: error.stack
          },
          lastCheck: timestamp
        });
        
        console.error(`Health check failed for ${agentId}:`, error.message);
        this.emit('healthCheckError', { agentId, error });
      }
    }
    
    this.emit('healthChecksCompleted', {
      timestamp,
      totalAgents: registeredAgents.size,
      healthyAgents: Array.from(this.activationMetrics.healthChecks.values())
        .filter(check => check.status === 'healthy').length
    });
  }

  /**
   * Check health of a specific agent
   * @param {string} agentId - Agent ID
   * @param {Object} agentData - Agent data
   * @returns {Promise<Object>} - Health status
   */
  async checkAgentHealth(agentId, agentData) {
    const healthChecks = [];
    
    // Check if agent file exists
    if (agentData.filePath) {
      const fileExists = await fs.pathExists(agentData.filePath);
      healthChecks.push({
        check: 'file_exists',
        status: fileExists ? 'pass' : 'fail',
        message: fileExists ? 'Agent file exists' : 'Agent file not found'
      });
    }
    
    // Check if agent has valid metadata
    const hasValidMetadata = agentData.id && agentData.name;
    healthChecks.push({
      check: 'valid_metadata',
      status: hasValidMetadata ? 'pass' : 'fail',
      message: hasValidMetadata ? 'Agent metadata is valid' : 'Agent metadata is invalid'
    });
    
    // Check activation handler
    const hasActivationHandler = typeof agentData.activationHandler === 'function';
    healthChecks.push({
      check: 'activation_handler',
      status: hasActivationHandler ? 'pass' : 'fail',
      message: hasActivationHandler ? 'Activation handler is available' : 'Activation handler is missing'
    });
    
    // Check performance metrics
    const performanceMetrics = this.activationMetrics.performanceMetrics.get(agentId);
    if (performanceMetrics && performanceMetrics.totalActivations > 0) {
      const avgDuration = performanceMetrics.averageDuration;
      const performanceStatus = avgDuration < this.options.performanceThreshold ? 'pass' : 'warn';
      healthChecks.push({
        check: 'performance',
        status: performanceStatus,
        message: `Average activation time: ${avgDuration}ms`,
        data: { averageDuration: avgDuration, threshold: this.options.performanceThreshold }
      });
    }
    
    // Check effectiveness
    const usageAnalytics = this.activationMetrics.usageAnalytics.get(agentId);
    if (usageAnalytics && usageAnalytics.totalActivations > 0) {
      const effectiveness = usageAnalytics.effectiveness;
      const effectivenessStatus = effectiveness >= 80 ? 'pass' : effectiveness >= 50 ? 'warn' : 'fail';
      healthChecks.push({
        check: 'effectiveness',
        status: effectivenessStatus,
        message: `Activation success rate: ${effectiveness.toFixed(1)}%`,
        data: { effectiveness }
      });
    }
    
    // Determine overall health status
    const failedChecks = healthChecks.filter(check => check.status === 'fail');
    const warningChecks = healthChecks.filter(check => check.status === 'warn');
    
    let overallStatus = 'healthy';
    let message = 'All health checks passed';
    
    if (failedChecks.length > 0) {
      overallStatus = 'unhealthy';
      message = `${failedChecks.length} health check(s) failed`;
    } else if (warningChecks.length > 0) {
      overallStatus = 'warning';
      message = `${warningChecks.length} health check(s) have warnings`;
    }
    
    return {
      status: overallStatus,
      details: {
        message,
        checks: healthChecks,
        summary: {
          total: healthChecks.length,
          passed: healthChecks.filter(check => check.status === 'pass').length,
          warnings: warningChecks.length,
          failed: failedChecks.length
        }
      }
    };
  }

  /**
   * Track registry error
   * @param {Error} error - Registry error
   */
  trackRegistryError(error) {
    const errorRecord = {
      type: 'registry_error',
      timestamp: new Date(),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    };
    
    this.activationMetrics.errors.push(errorRecord);
    this.emit('registryErrorTracked', errorRecord);
  }

  /**
   * Get activation statistics
   * @returns {Object} - Activation statistics
   */
  getActivationStatistics() {
    const successRate = this.activationMetrics.totalActivations > 0 ? 
      (this.activationMetrics.successfulActivations / this.activationMetrics.totalActivations) * 100 : 0;
    
    return {
      totalActivations: this.activationMetrics.totalActivations,
      successfulActivations: this.activationMetrics.successfulActivations,
      failedActivations: this.activationMetrics.failedActivations,
      successRate: parseFloat(successRate.toFixed(2)),
      totalErrors: this.activationMetrics.errors.length,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Get performance statistics
   * @returns {Object} - Performance statistics
   */
  getPerformanceStatistics() {
    const performanceData = {};
    
    for (const [agentId, metrics] of this.activationMetrics.performanceMetrics) {
      performanceData[agentId] = {
        totalActivations: metrics.totalActivations,
        averageDuration: parseFloat(metrics.averageDuration.toFixed(2)),
        minDuration: metrics.minDuration === Infinity ? 0 : metrics.minDuration,
        maxDuration: metrics.maxDuration,
        slowActivations: metrics.slowActivations,
        performanceRating: this.calculatePerformanceRating(metrics)
      };
    }
    
    return performanceData;
  }

  /**
   * Calculate performance rating for an agent
   * @param {Object} metrics - Performance metrics
   * @returns {string} - Performance rating
   */
  calculatePerformanceRating(metrics) {
    if (metrics.totalActivations === 0) return 'unknown';
    
    const avgDuration = metrics.averageDuration;
    const slowPercentage = (metrics.slowActivations / metrics.totalActivations) * 100;
    
    if (avgDuration < 1000 && slowPercentage < 10) return 'excellent';
    if (avgDuration < 3000 && slowPercentage < 25) return 'good';
    if (avgDuration < 5000 && slowPercentage < 50) return 'fair';
    return 'poor';
  }

  /**
   * Get usage analytics
   * @returns {Object} - Usage analytics
   */
  getUsageAnalytics() {
    const analyticsData = {};
    
    for (const [agentId, analytics] of this.activationMetrics.usageAnalytics) {
      analyticsData[agentId] = {
        totalActivations: analytics.totalActivations,
        totalFailures: analytics.totalFailures,
        totalDeactivations: analytics.totalDeactivations,
        totalSessionTime: analytics.totalSessionTime,
        effectiveness: parseFloat(analytics.effectiveness.toFixed(2)),
        averageSessionTime: parseFloat(analytics.averageSessionTime.toFixed(2)),
        popularityScore: parseFloat(analytics.popularityScore.toFixed(2)),
        lastActivated: analytics.lastActivated,
        firstActivated: analytics.firstActivated
      };
    }
    
    return analyticsData;
  }

  /**
   * Get health check results
   * @returns {Object} - Health check results
   */
  getHealthCheckResults() {
    const healthData = {};
    
    for (const [agentId, healthCheck] of this.activationMetrics.healthChecks) {
      healthData[agentId] = {
        status: healthCheck.status,
        lastCheck: healthCheck.lastCheck,
        details: healthCheck.details
      };
    }
    
    return healthData;
  }

  /**
   * Get most popular agents
   * @param {number} limit - Number of agents to return
   * @returns {Array} - Most popular agents
   */
  getMostPopularAgents(limit = 10) {
    const agents = Array.from(this.activationMetrics.usageAnalytics.entries())
      .map(([agentId, analytics]) => ({
        agentId,
        popularityScore: analytics.popularityScore,
        totalActivations: analytics.totalActivations,
        effectiveness: analytics.effectiveness
      }))
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);
    
    return agents;
  }

  /**
   * Get agents with performance issues
   * @returns {Array} - Agents with performance issues
   */
  getPerformanceIssues() {
    const issues = [];
    
    for (const [agentId, metrics] of this.activationMetrics.performanceMetrics) {
      if (metrics.averageDuration > this.options.performanceThreshold) {
        issues.push({
          agentId,
          issue: 'slow_activation',
          averageDuration: metrics.averageDuration,
          threshold: this.options.performanceThreshold,
          severity: metrics.averageDuration > this.options.performanceThreshold * 2 ? 'high' : 'medium'
        });
      }
      
      const slowPercentage = (metrics.slowActivations / metrics.totalActivations) * 100;
      if (slowPercentage > 50) {
        issues.push({
          agentId,
          issue: 'frequent_slow_activations',
          slowPercentage: parseFloat(slowPercentage.toFixed(2)),
          severity: slowPercentage > 75 ? 'high' : 'medium'
        });
      }
    }
    
    return issues;
  }

  /**
   * Get agents with low effectiveness
   * @param {number} threshold - Effectiveness threshold (default: 70%)
   * @returns {Array} - Agents with low effectiveness
   */
  getLowEffectivenessAgents(threshold = 70) {
    const lowEffectivenessAgents = [];
    
    for (const [agentId, analytics] of this.activationMetrics.usageAnalytics) {
      if (analytics.totalActivations > 0 && analytics.effectiveness < threshold) {
        lowEffectivenessAgents.push({
          agentId,
          effectiveness: analytics.effectiveness,
          totalActivations: analytics.totalActivations,
          totalFailures: analytics.totalFailures,
          severity: analytics.effectiveness < 50 ? 'high' : 'medium'
        });
      }
    }
    
    return lowEffectivenessAgents.sort((a, b) => a.effectiveness - b.effectiveness);
  }

  /**
   * Get comprehensive monitoring report
   * @returns {Object} - Comprehensive monitoring report
   */
  getMonitoringReport() {
    return {
      overview: this.getActivationStatistics(),
      performance: this.getPerformanceStatistics(),
      usage: this.getUsageAnalytics(),
      health: this.getHealthCheckResults(),
      insights: {
        mostPopular: this.getMostPopularAgents(5),
        performanceIssues: this.getPerformanceIssues(),
        lowEffectiveness: this.getLowEffectivenessAgents(),
        totalAgentsMonitored: this.activationMetrics.performanceMetrics.size
      },
      metadata: {
        reportGeneratedAt: new Date(),
        monitoringStarted: this.isMonitoring,
        retentionDays: this.options.retentionDays,
        healthCheckInterval: this.options.healthCheckInterval
      }
    };
  }

  /**
   * Load metrics from file
   * @returns {Promise<void>}
   */
  async loadMetrics() {
    const metricsFile = path.join(this.options.rootPath, this.options.metricsFile);
    
    if (await fs.pathExists(metricsFile)) {
      try {
        const data = await fs.readJson(metricsFile);
        
        // Restore basic metrics
        this.activationMetrics.totalActivations = data.totalActivations || 0;
        this.activationMetrics.successfulActivations = data.successfulActivations || 0;
        this.activationMetrics.failedActivations = data.failedActivations || 0;
        this.activationMetrics.activationHistory = data.activationHistory || [];
        this.activationMetrics.errors = data.errors || [];
        
        // Restore Maps
        if (data.performanceMetrics) {
          this.activationMetrics.performanceMetrics = new Map(Object.entries(data.performanceMetrics));
        }
        if (data.usageAnalytics) {
          this.activationMetrics.usageAnalytics = new Map(Object.entries(data.usageAnalytics));
        }
        if (data.healthChecks) {
          this.activationMetrics.healthChecks = new Map(Object.entries(data.healthChecks));
        }
        
        // Clean up old data
        await this.cleanupOldData();
        
        console.log(`✓ Loaded activation metrics: ${this.activationMetrics.totalActivations} total activations`);
        
      } catch (error) {
        console.warn('Failed to load activation metrics:', error.message);
      }
    }
  }

  /**
   * Save metrics to file
   * @returns {Promise<void>}
   */
  async saveMetrics() {
    const metricsFile = path.join(this.options.rootPath, this.options.metricsFile);
    
    try {
      await fs.ensureDir(path.dirname(metricsFile));
      
      const data = {
        totalActivations: this.activationMetrics.totalActivations,
        successfulActivations: this.activationMetrics.successfulActivations,
        failedActivations: this.activationMetrics.failedActivations,
        activationHistory: this.activationMetrics.activationHistory,
        errors: this.activationMetrics.errors,
        performanceMetrics: Object.fromEntries(this.activationMetrics.performanceMetrics),
        usageAnalytics: Object.fromEntries(this.activationMetrics.usageAnalytics),
        healthChecks: Object.fromEntries(this.activationMetrics.healthChecks),
        lastSaved: new Date()
      };
      
      await fs.writeJson(metricsFile, data, { spaces: 2 });
      
    } catch (error) {
      console.warn('Failed to save activation metrics:', error.message);
    }
  }

  /**
   * Save metrics asynchronously (non-blocking)
   */
  saveMetricsAsync() {
    // Use setTimeout to avoid blocking the main thread
    setTimeout(() => {
      this.saveMetrics().catch(error => {
        console.warn('Async metrics save failed:', error.message);
      });
    }, 0);
  }

  /**
   * Clean up old data based on retention policy
   * @returns {Promise<void>}
   */
  async cleanupOldData() {
    const cutoffDate = new Date(Date.now() - (this.options.retentionDays * 24 * 60 * 60 * 1000));
    
    // Clean up activation history
    this.activationMetrics.activationHistory = this.activationMetrics.activationHistory
      .filter(record => new Date(record.timestamp) > cutoffDate);
    
    // Clean up errors
    this.activationMetrics.errors = this.activationMetrics.errors
      .filter(error => new Date(error.timestamp) > cutoffDate);
    
    console.log(`✓ Cleaned up data older than ${this.options.retentionDays} days`);
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.activationMetrics = {
      totalActivations: 0,
      successfulActivations: 0,
      failedActivations: 0,
      activationHistory: [],
      performanceMetrics: new Map(),
      usageAnalytics: new Map(),
      healthChecks: new Map(),
      errors: []
    };
    
    this.performanceTrackers.clear();
    
    console.log('✓ All activation metrics reset');
    this.emit('metricsReset');
  }

  /**
   * Stop monitoring
   * @returns {Promise<void>}
   */
  async stop() {
    console.log('Stopping Activation Monitor...');
    
    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Save final metrics
    await this.saveMetrics();
    
    this.isMonitoring = false;
    
    console.log('✓ Activation Monitor stopped');
    this.emit('stopped');
  }
}

module.exports = ActivationMonitor;