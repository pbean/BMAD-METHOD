/**
 * Conversion Monitor
 * Comprehensive monitoring system for BMad agent conversion process
 * Provides detailed logging, success/failure reporting, performance monitoring, and diagnostic tools
 */

const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

class ConversionMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      logLevel: options.logLevel || 'info',
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableDetailedLogging: options.enableDetailedLogging !== false,
      enableDiagnostics: options.enableDiagnostics !== false,
      logDirectory: options.logDirectory || path.join(process.cwd(), '.kiro', 'logs'),
      reportDirectory: options.reportDirectory || path.join(process.cwd(), '.kiro', 'reports'),
      maxLogFileSize: options.maxLogFileSize || 10 * 1024 * 1024, // 10MB
      maxLogFiles: options.maxLogFiles || 5,
      performanceThresholds: {
        conversionTime: options.performanceThresholds?.conversionTime || 30000, // 30 seconds
        memoryUsage: options.performanceThresholds?.memoryUsage || 500 * 1024 * 1024, // 500MB
        ...options.performanceThresholds
      },
      ...options
    };

    // Monitoring state
    this.conversionSessions = new Map();
    this.activeConversions = new Map();
    this.conversionHistory = [];
    this.performanceMetrics = new Map();
    this.diagnosticData = new Map();
    
    // Statistics tracking
    this.statistics = {
      totalConversions: 0,
      successfulConversions: 0,
      failedConversions: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      peakMemoryUsage: 0,
      conversionsByType: new Map(),
      conversionsBySource: new Map(),
      errorsByCategory: new Map(),
      performanceIssues: 0
    };

    // Log files
    this.logFiles = {
      conversion: path.join(this.options.logDirectory, 'conversion.log'),
      performance: path.join(this.options.logDirectory, 'performance.log'),
      errors: path.join(this.options.logDirectory, 'errors.log'),
      diagnostics: path.join(this.options.logDirectory, 'diagnostics.log')
    };

    // Error tracking flags
    this._logWriteErrorShown = false;

    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring system
   */
  async initializeMonitoring() {
    try {
      // Ensure log and report directories exist
      await fs.ensureDir(this.options.logDirectory);
      await fs.ensureDir(this.options.reportDirectory);

      // Initialize log files
      for (const [type, filePath] of Object.entries(this.logFiles)) {
        try {
          await fs.ensureDir(path.dirname(filePath));
          if (!await fs.pathExists(filePath)) {
            await fs.writeFile(filePath, '');
          }
        } catch (fileError) {
          console.warn(`Failed to initialize log file ${filePath}:`, fileError.message);
        }
      }

      // Start performance monitoring if enabled
      if (this.options.enablePerformanceMonitoring) {
        this.startPerformanceMonitoring();
      }

      this.log('Conversion monitoring system initialized', 'info');
    } catch (error) {
      console.error('Failed to initialize conversion monitoring:', error.message);
      // Continue without file logging if initialization fails
      this.options.enableDetailedLogging = false;
    }
  }

  /**
   * Start monitoring a conversion session
   * @param {string} sessionId - Unique session identifier
   * @param {Object} sessionInfo - Session information
   * @returns {Object} - Session monitoring object
   */
  startConversionSession(sessionId, sessionInfo = {}) {
    const session = {
      id: sessionId,
      startTime: Date.now(),
      startTimestamp: new Date().toISOString(),
      info: {
        type: sessionInfo.type || 'unknown',
        source: sessionInfo.source || 'unknown',
        agentCount: sessionInfo.agentCount || 0,
        expansionPacks: sessionInfo.expansionPacks || [],
        ...sessionInfo
      },
      conversions: new Map(),
      performance: {
        startMemory: process.memoryUsage(),
        peakMemory: process.memoryUsage(),
        cpuUsageStart: process.cpuUsage()
      },
      status: 'active',
      errors: [],
      warnings: []
    };

    this.conversionSessions.set(sessionId, session);
    this.emit('sessionStarted', session);
    
    this.log(`Started conversion session: ${sessionId} (${session.info.type})`, 'info');
    
    return session;
  }

  /**
   * Start monitoring a specific conversion
   * @param {string} sessionId - Session identifier
   * @param {string} conversionId - Conversion identifier
   * @param {Object} conversionInfo - Conversion information
   * @returns {Object} - Conversion monitoring object
   */
  startConversion(sessionId, conversionId, conversionInfo = {}) {
    const session = this.conversionSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const conversion = {
      id: conversionId,
      sessionId,
      startTime: Date.now(),
      startTimestamp: new Date().toISOString(),
      info: {
        agentId: conversionInfo.agentId || 'unknown',
        source: conversionInfo.source || 'unknown',
        expansionPack: conversionInfo.expansionPack || null,
        inputPath: conversionInfo.inputPath || null,
        outputPath: conversionInfo.outputPath || null,
        type: conversionInfo.type || 'agent',
        ...conversionInfo
      },
      steps: [],
      performance: {
        startMemory: process.memoryUsage(),
        peakMemory: process.memoryUsage(),
        cpuUsageStart: process.cpuUsage()
      },
      status: 'active',
      errors: [],
      warnings: []
    };

    session.conversions.set(conversionId, conversion);
    this.activeConversions.set(conversionId, conversion);
    this.emit('conversionStarted', conversion);
    
    this.logConversion(conversion, 'Started conversion', 'info');
    
    return conversion;
  }

  /**
   * Log a conversion step
   * @param {string} conversionId - Conversion identifier
   * @param {string} stepName - Step name
   * @param {Object} stepInfo - Step information
   */
  logConversionStep(conversionId, stepName, stepInfo = {}) {
    const conversion = this.activeConversions.get(conversionId);
    if (!conversion) {
      this.log(`Conversion not found for step logging: ${conversionId}`, 'warn');
      return;
    }

    const step = {
      name: stepName,
      timestamp: new Date().toISOString(),
      startTime: Date.now(),
      info: stepInfo,
      status: 'active',
      performance: {
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    conversion.steps.push(step);
    this.emit('conversionStep', conversion, step);
    
    this.logConversion(conversion, `Step: ${stepName}`, 'debug', stepInfo);
  }

  /**
   * Complete a conversion step
   * @param {string} conversionId - Conversion identifier
   * @param {string} stepName - Step name
   * @param {Object} result - Step result
   */
  completeConversionStep(conversionId, stepName, result = {}) {
    const conversion = this.activeConversions.get(conversionId);
    if (!conversion) {
      return;
    }

    const step = conversion.steps.find(s => s.name === stepName && s.status === 'active');
    if (step) {
      step.status = result.success !== false ? 'completed' : 'failed';
      step.endTime = Date.now();
      step.duration = step.endTime - step.startTime;
      step.result = result;
      step.performance.endMemory = process.memoryUsage();
      step.performance.endCpuUsage = process.cpuUsage();

      // Update peak memory for conversion
      const currentMemory = step.performance.endMemory;
      if (currentMemory.heapUsed > conversion.performance.peakMemory.heapUsed) {
        conversion.performance.peakMemory = currentMemory;
      }

      this.emit('conversionStepCompleted', conversion, step);
      
      const status = step.status === 'completed' ? 'info' : 'warn';
      this.logConversion(conversion, `Step completed: ${stepName} (${step.duration}ms)`, status, result);
    }
  }

  /**
   * Fail a conversion step
   * @param {string} conversionId - Conversion identifier
   * @param {string} stepName - Step name
   * @param {Error} error - Error that occurred
   * @param {Object} context - Error context
   */
  failConversionStep(conversionId, stepName, error, context = {}) {
    const conversion = this.activeConversions.get(conversionId);
    if (!conversion) {
      return;
    }

    const step = conversion.steps.find(s => s.name === stepName && s.status === 'active');
    if (step) {
      step.status = 'failed';
      step.endTime = Date.now();
      step.duration = step.endTime - step.startTime;
      step.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
      step.context = context;

      conversion.errors.push({
        step: stepName,
        error: step.error,
        context,
        timestamp: new Date().toISOString()
      });

      this.emit('conversionStepFailed', conversion, step, error);
      
      this.logConversion(conversion, `Step failed: ${stepName} - ${error.message}`, 'error', { error: error.message, context });
    }
  }

  /**
   * Complete a conversion
   * @param {string} conversionId - Conversion identifier
   * @param {Object} result - Conversion result
   */
  completeConversion(conversionId, result = {}) {
    const conversion = this.activeConversions.get(conversionId);
    if (!conversion) {
      return;
    }

    conversion.status = result.success !== false ? 'completed' : 'failed';
    conversion.endTime = Date.now();
    conversion.duration = conversion.endTime - conversion.startTime;
    conversion.result = result;
    conversion.performance.endMemory = process.memoryUsage();
    conversion.performance.endCpuUsage = process.cpuUsage();

    // Update statistics
    this.updateConversionStatistics(conversion);

    // Move to history
    this.conversionHistory.push(conversion);
    this.activeConversions.delete(conversionId);

    // Update session
    const session = this.conversionSessions.get(conversion.sessionId);
    if (session) {
      if (conversion.performance.peakMemory.heapUsed > session.performance.peakMemory.heapUsed) {
        session.performance.peakMemory = conversion.performance.peakMemory;
      }
    }

    this.emit('conversionCompleted', conversion);
    
    const status = conversion.status === 'completed' ? 'info' : 'error';
    this.logConversion(conversion, `Conversion ${conversion.status} (${conversion.duration}ms)`, status, result);

    // Check for performance issues
    this.checkPerformanceIssues(conversion);
  }

  /**
   * Complete a conversion session
   * @param {string} sessionId - Session identifier
   * @param {Object} result - Session result
   */
  completeConversionSession(sessionId, result = {}) {
    const session = this.conversionSessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = result.success !== false ? 'completed' : 'failed';
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.result = result;
    session.performance.endMemory = process.memoryUsage();
    session.performance.endCpuUsage = process.cpuUsage();

    // Calculate session statistics
    const conversions = Array.from(session.conversions.values());
    session.statistics = {
      totalConversions: conversions.length,
      successfulConversions: conversions.filter(c => c.status === 'completed').length,
      failedConversions: conversions.filter(c => c.status === 'failed').length,
      totalProcessingTime: conversions.reduce((sum, c) => sum + (c.duration || 0), 0),
      averageProcessingTime: conversions.length > 0 ? 
        conversions.reduce((sum, c) => sum + (c.duration || 0), 0) / conversions.length : 0
    };

    this.emit('sessionCompleted', session);
    
    const status = session.status === 'completed' ? 'info' : 'error';
    this.log(`Completed conversion session: ${sessionId} (${session.duration}ms, ${session.statistics.successfulConversions}/${session.statistics.totalConversions} successful)`, status);

    // Generate session report if enabled
    if (this.options.enableDetailedLogging) {
      this.generateSessionReport(session);
    }
  }

  /**
   * Update conversion statistics
   * @param {Object} conversion - Conversion object
   */
  updateConversionStatistics(conversion) {
    this.statistics.totalConversions++;
    
    if (conversion.status === 'completed') {
      this.statistics.successfulConversions++;
    } else {
      this.statistics.failedConversions++;
    }

    if (conversion.duration) {
      this.statistics.totalProcessingTime += conversion.duration;
      this.statistics.averageProcessingTime = 
        this.statistics.totalProcessingTime / this.statistics.totalConversions;
    }

    // Update peak memory
    if (conversion.performance.peakMemory.heapUsed > this.statistics.peakMemoryUsage) {
      this.statistics.peakMemoryUsage = conversion.performance.peakMemory.heapUsed;
    }

    // Update by type
    const type = conversion.info.type;
    this.statistics.conversionsByType.set(type, 
      (this.statistics.conversionsByType.get(type) || 0) + 1);

    // Update by source
    const source = conversion.info.source;
    this.statistics.conversionsBySource.set(source, 
      (this.statistics.conversionsBySource.get(source) || 0) + 1);

    // Update error statistics
    if (conversion.errors.length > 0) {
      conversion.errors.forEach(error => {
        const category = this.categorizeError(error.error);
        this.statistics.errorsByCategory.set(category, 
          (this.statistics.errorsByCategory.get(category) || 0) + 1);
      });
    }
  }

  /**
   * Check for performance issues
   * @param {Object} conversion - Conversion object
   */
  checkPerformanceIssues(conversion) {
    const issues = [];

    // Check conversion time
    if (conversion.duration > this.options.performanceThresholds.conversionTime) {
      issues.push({
        type: 'slow_conversion',
        message: `Conversion took ${conversion.duration}ms (threshold: ${this.options.performanceThresholds.conversionTime}ms)`,
        severity: 'warning'
      });
    }

    // Check memory usage
    if (conversion.performance.peakMemory.heapUsed > this.options.performanceThresholds.memoryUsage) {
      issues.push({
        type: 'high_memory_usage',
        message: `Peak memory usage: ${Math.round(conversion.performance.peakMemory.heapUsed / 1024 / 1024)}MB (threshold: ${Math.round(this.options.performanceThresholds.memoryUsage / 1024 / 1024)}MB)`,
        severity: 'warning'
      });
    }

    if (issues.length > 0) {
      this.statistics.performanceIssues++;
      this.emit('performanceIssues', conversion, issues);
      
      issues.forEach(issue => {
        this.logPerformance(`Performance issue in ${conversion.id}: ${issue.message}`, 'warn');
      });
    }
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    this.performanceInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const metrics = {
        timestamp: new Date().toISOString(),
        memory: memoryUsage,
        cpu: cpuUsage,
        activeConversions: this.activeConversions.size,
        activeSessions: Array.from(this.conversionSessions.values()).filter(s => s.status === 'active').length
      };

      this.performanceMetrics.set(Date.now(), metrics);
      
      // Keep only last 1000 metrics to prevent memory leak
      if (this.performanceMetrics.size > 1000) {
        const oldestKey = Math.min(...this.performanceMetrics.keys());
        this.performanceMetrics.delete(oldestKey);
      }

      // Log performance metrics
      this.logPerformance(`Memory: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB, Active conversions: ${this.activeConversions.size}`, 'debug');
    }, 5000); // Every 5 seconds
  }

  /**
   * Generate diagnostic report for troubleshooting
   * @param {Object} options - Report options
   * @returns {Promise<Object>} - Diagnostic report
   */
  async generateDiagnosticReport(options = {}) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        ...this.statistics,
        conversionsByType: Object.fromEntries(this.statistics.conversionsByType),
        conversionsBySource: Object.fromEntries(this.statistics.conversionsBySource),
        errorsByCategory: Object.fromEntries(this.statistics.errorsByCategory)
      },
      activeSessions: Array.from(this.conversionSessions.values()).filter(s => s.status === 'active'),
      activeConversions: Array.from(this.activeConversions.values()),
      recentHistory: this.conversionHistory.slice(-50), // Last 50 conversions
      systemInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        workingDirectory: process.cwd()
      }
    };

    // Add performance metrics if available
    if (this.performanceMetrics.size > 0) {
      const recentMetrics = Array.from(this.performanceMetrics.values()).slice(-20);
      report.performanceMetrics = recentMetrics;
    }

    // Add detailed error analysis if requested
    if (options.includeDetailedErrors) {
      report.detailedErrors = this.analyzeErrors();
    }

    // Add conversion patterns if requested
    if (options.includePatterns) {
      report.conversionPatterns = this.analyzeConversionPatterns();
    }

    // Export report if path provided
    if (options.exportPath) {
      try {
        await fs.ensureDir(path.dirname(options.exportPath));
        await fs.writeFile(options.exportPath, JSON.stringify(report, null, 2));
        this.log(`Diagnostic report exported to: ${options.exportPath}`, 'info');
        report.exported = true;
        report.exportPath = options.exportPath;
      } catch (error) {
        this.log(`Failed to export diagnostic report: ${error.message}`, 'error');
        report.exported = false;
        report.exportError = error.message;
      }
    }

    return report;
  }

  /**
   * Generate session report
   * @param {Object} session - Session object
   * @returns {Promise<void>}
   */
  async generateSessionReport(session) {
    const reportPath = path.join(this.options.reportDirectory, `session-${session.id}-${Date.now()}.json`);
    
    const report = {
      session,
      conversions: Array.from(session.conversions.values()),
      summary: session.statistics,
      generatedAt: new Date().toISOString()
    };

    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      this.log(`Session report generated: ${reportPath}`, 'info');
    } catch (error) {
      this.log(`Failed to generate session report: ${error.message}`, 'error');
    }
  }

  /**
   * Analyze errors for patterns and insights
   * @returns {Object} - Error analysis
   */
  analyzeErrors() {
    const allErrors = [];
    
    // Collect errors from history
    this.conversionHistory.forEach(conversion => {
      conversion.errors.forEach(error => {
        allErrors.push({
          conversionId: conversion.id,
          agentId: conversion.info.agentId,
          source: conversion.info.source,
          expansionPack: conversion.info.expansionPack,
          ...error
        });
      });
    });

    // Analyze patterns
    const errorPatterns = {
      byAgent: new Map(),
      bySource: new Map(),
      byExpansionPack: new Map(),
      byStep: new Map(),
      commonMessages: new Map()
    };

    allErrors.forEach(error => {
      // By agent
      const agentCount = errorPatterns.byAgent.get(error.agentId) || 0;
      errorPatterns.byAgent.set(error.agentId, agentCount + 1);

      // By source
      const sourceCount = errorPatterns.bySource.get(error.source) || 0;
      errorPatterns.bySource.set(error.source, sourceCount + 1);

      // By expansion pack
      if (error.expansionPack) {
        const packCount = errorPatterns.byExpansionPack.get(error.expansionPack) || 0;
        errorPatterns.byExpansionPack.set(error.expansionPack, packCount + 1);
      }

      // By step
      const stepCount = errorPatterns.byStep.get(error.step) || 0;
      errorPatterns.byStep.set(error.step, stepCount + 1);

      // Common messages
      const message = error.error.message;
      const messageCount = errorPatterns.commonMessages.get(message) || 0;
      errorPatterns.commonMessages.set(message, messageCount + 1);
    });

    return {
      totalErrors: allErrors.length,
      patterns: {
        byAgent: Object.fromEntries(errorPatterns.byAgent),
        bySource: Object.fromEntries(errorPatterns.bySource),
        byExpansionPack: Object.fromEntries(errorPatterns.byExpansionPack),
        byStep: Object.fromEntries(errorPatterns.byStep),
        commonMessages: Object.fromEntries(errorPatterns.commonMessages)
      },
      recommendations: this.generateErrorRecommendations(errorPatterns)
    };
  }

  /**
   * Analyze conversion patterns
   * @returns {Object} - Conversion pattern analysis
   */
  analyzeConversionPatterns() {
    const patterns = {
      averageDurationByType: new Map(),
      averageDurationBySource: new Map(),
      successRateByType: new Map(),
      successRateBySource: new Map(),
      memoryUsageByType: new Map()
    };

    // Group conversions by type and source
    const byType = new Map();
    const bySource = new Map();

    this.conversionHistory.forEach(conversion => {
      const type = conversion.info.type;
      const source = conversion.info.source;

      if (!byType.has(type)) byType.set(type, []);
      if (!bySource.has(source)) bySource.set(source, []);

      byType.get(type).push(conversion);
      bySource.get(source).push(conversion);
    });

    // Calculate patterns by type
    for (const [type, conversions] of byType) {
      const durations = conversions.filter(c => c.duration).map(c => c.duration);
      const successful = conversions.filter(c => c.status === 'completed').length;
      const memoryUsages = conversions.map(c => c.performance.peakMemory.heapUsed);

      patterns.averageDurationByType.set(type, 
        durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0);
      patterns.successRateByType.set(type, 
        conversions.length > 0 ? successful / conversions.length : 0);
      patterns.memoryUsageByType.set(type, 
        memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0);
    }

    // Calculate patterns by source
    for (const [source, conversions] of bySource) {
      const durations = conversions.filter(c => c.duration).map(c => c.duration);
      const successful = conversions.filter(c => c.status === 'completed').length;

      patterns.averageDurationBySource.set(source, 
        durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0);
      patterns.successRateBySource.set(source, 
        conversions.length > 0 ? successful / conversions.length : 0);
    }

    return {
      averageDurationByType: Object.fromEntries(patterns.averageDurationByType),
      averageDurationBySource: Object.fromEntries(patterns.averageDurationBySource),
      successRateByType: Object.fromEntries(patterns.successRateByType),
      successRateBySource: Object.fromEntries(patterns.successRateBySource),
      memoryUsageByType: Object.fromEntries(patterns.memoryUsageByType)
    };
  }

  /**
   * Generate error recommendations based on patterns
   * @param {Object} errorPatterns - Error patterns
   * @returns {Array} - Recommendations
   */
  generateErrorRecommendations(errorPatterns) {
    const recommendations = [];

    // Check for agents with high error rates
    for (const [agentId, errorCount] of errorPatterns.byAgent) {
      if (errorCount > 3) {
        recommendations.push({
          type: 'agent_issues',
          message: `Agent "${agentId}" has ${errorCount} errors. Consider reviewing its configuration or dependencies.`,
          priority: 'high'
        });
      }
    }

    // Check for expansion pack issues
    for (const [packName, errorCount] of errorPatterns.byExpansionPack) {
      if (errorCount > 2) {
        recommendations.push({
          type: 'expansion_pack_issues',
          message: `Expansion pack "${packName}" has ${errorCount} errors. Check for missing dependencies or configuration issues.`,
          priority: 'medium'
        });
      }
    }

    // Check for common error messages
    for (const [message, count] of errorPatterns.commonMessages) {
      if (count > 2) {
        recommendations.push({
          type: 'common_error',
          message: `Common error "${message}" occurred ${count} times. This may indicate a systemic issue.`,
          priority: 'high'
        });
      }
    }

    return recommendations;
  }

  /**
   * Categorize error for statistics
   * @param {Object} error - Error object
   * @returns {string} - Error category
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('file') || message.includes('enoent')) return 'file_system';
    if (message.includes('yaml') || message.includes('parsing')) return 'parsing';
    if (message.includes('dependency') || message.includes('missing')) return 'dependencies';
    if (message.includes('permission') || message.includes('access')) return 'permissions';
    if (message.includes('memory') || message.includes('heap')) return 'memory';
    if (message.includes('timeout') || message.includes('network')) return 'network';
    
    return 'unknown';
  }

  /**
   * Log conversion-specific message
   * @param {Object} conversion - Conversion object
   * @param {string} message - Log message
   * @param {string} level - Log level
   * @param {Object} data - Additional data
   */
  logConversion(conversion, message, level = 'info', data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      conversionId: conversion.id,
      sessionId: conversion.sessionId,
      agentId: conversion.info.agentId,
      source: conversion.info.source,
      message,
      data
    };

    // Only write to file if detailed logging is enabled and we haven't had write errors
    if (this.options.enableDetailedLogging && !this._logWriteErrorShown) {
      this.writeToLogFile(this.logFiles.conversion, logEntry).catch(() => {
        // Silently ignore write errors to prevent infinite loops
      });
    }
    
    if (this.shouldLog(level)) {
      const prefix = `[${conversion.info.agentId}]`;
      this.log(`${prefix} ${message}`, level);
    }
  }

  /**
   * Log performance-specific message
   * @param {string} message - Log message
   * @param {string} level - Log level
   * @param {Object} data - Additional data
   */
  logPerformance(message, level = 'info', data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      type: 'performance',
      message,
      data
    };

    // Only write to file if detailed logging is enabled and we haven't had write errors
    if (this.options.enableDetailedLogging && !this._logWriteErrorShown) {
      this.writeToLogFile(this.logFiles.performance, logEntry).catch(() => {
        // Silently ignore write errors to prevent infinite loops
      });
    }
    
    if (this.shouldLog(level) && level !== 'debug') {
      this.log(`[PERF] ${message}`, level);
    }
  }

  /**
   * Write entry to log file
   * @param {string} filePath - Log file path
   * @param {Object} entry - Log entry
   */
  async writeToLogFile(filePath, entry) {
    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(filePath));
      
      // Check file size and rotate if necessary
      await this.rotateLogFileIfNeeded(filePath);
      
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(filePath, logLine);
    } catch (error) {
      // Only log error once to avoid infinite loops
      if (!this._logWriteErrorShown) {
        console.error(`Failed to write to log file ${filePath}:`, error.message);
        this._logWriteErrorShown = true;
      }
    }
  }

  /**
   * Rotate log file if it exceeds size limit
   * @param {string} filePath - Log file path
   */
  async rotateLogFileIfNeeded(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size > this.options.maxLogFileSize) {
        // Rotate existing files
        for (let i = this.options.maxLogFiles - 1; i > 0; i--) {
          const oldFile = `${filePath}.${i}`;
          const newFile = `${filePath}.${i + 1}`;
          
          if (await fs.pathExists(oldFile)) {
            if (i === this.options.maxLogFiles - 1) {
              await fs.remove(oldFile); // Remove oldest
            } else {
              await fs.move(oldFile, newFile);
            }
          }
        }
        
        // Move current file to .1
        await fs.move(filePath, `${filePath}.1`);
        
        // Create new empty file
        await fs.writeFile(filePath, '');
      }
    } catch (error) {
      // If rotation fails, continue with current file
      console.warn(`Log rotation failed for ${filePath}:`, error.message);
    }
  }

  /**
   * Check if message should be logged based on level
   * @param {string} level - Log level
   * @returns {boolean} - Should log
   */
  shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.options.logLevel] || 1;
    const messageLevel = levels[level] || 1;
    
    return messageLevel >= currentLevel;
  }

  /**
   * Get monitoring statistics
   * @returns {Object} - Statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      conversionsByType: Object.fromEntries(this.statistics.conversionsByType),
      conversionsBySource: Object.fromEntries(this.statistics.conversionsBySource),
      errorsByCategory: Object.fromEntries(this.statistics.errorsByCategory),
      activeSessions: Array.from(this.conversionSessions.values()).filter(s => s.status === 'active').length,
      activeConversions: this.activeConversions.size,
      totalSessions: this.conversionSessions.size,
      historySize: this.conversionHistory.length
    };
  }

  /**
   * Get active conversions
   * @returns {Array} - Active conversions
   */
  getActiveConversions() {
    return Array.from(this.activeConversions.values());
  }

  /**
   * Get conversion history
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} - Conversion history
   */
  getConversionHistory(limit = 100) {
    return this.conversionHistory.slice(-limit);
  }

  /**
   * Clear monitoring data
   * @param {Object} options - Clear options
   */
  clearMonitoringData(options = {}) {
    if (options.clearHistory !== false) {
      this.conversionHistory = [];
    }
    
    if (options.clearStatistics !== false) {
      this.statistics = {
        totalConversions: 0,
        successfulConversions: 0,
        failedConversions: 0,
        totalProcessingTime: 0,
        averageProcessingTime: 0,
        peakMemoryUsage: 0,
        conversionsByType: new Map(),
        conversionsBySource: new Map(),
        errorsByCategory: new Map(),
        performanceIssues: 0
      };
    }
    
    if (options.clearPerformanceMetrics !== false) {
      this.performanceMetrics.clear();
    }
    
    this.log('Monitoring data cleared', 'info');
  }

  /**
   * Shutdown monitoring system
   */
  shutdown() {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
    
    this.log('Conversion monitoring system shutdown', 'info');
  }

  /**
   * Log message with timestamp and level
   * @param {string} message - Message to log
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [ConversionMonitor] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      case 'debug':
        if (this.options.logLevel === 'debug') {
          console.log(`${prefix} ${message}`);
        }
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
}

module.exports = ConversionMonitor;