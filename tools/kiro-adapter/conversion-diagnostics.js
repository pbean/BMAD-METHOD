/**
 * Conversion Diagnostics Tool
 * Comprehensive diagnostic and troubleshooting tools for BMad agent conversion
 */

const fs = require('fs-extra');
const path = require('path');
const ConversionMonitor = require('./conversion-monitor');
const ConversionErrorHandler = require('./conversion-error-handler');
const AgentDiscovery = require('./agent-discovery');

class ConversionDiagnostics {
  constructor(options = {}) {
    this.options = {
      rootPath: options.rootPath || process.cwd(),
      logLevel: options.logLevel || 'info',
      enableDetailedAnalysis: options.enableDetailedAnalysis !== false,
      enablePerformanceAnalysis: options.enablePerformanceAnalysis !== false,
      outputDirectory: options.outputDirectory || path.join(process.cwd(), '.kiro', 'diagnostics'),
      ...options
    };

    // Initialize components
    this.monitor = new ConversionMonitor({
      logLevel: this.options.logLevel,
      enablePerformanceMonitoring: true,
      enableDetailedLogging: true,
      logDirectory: path.join(this.options.rootPath, '.kiro', 'logs'),
      reportDirectory: path.join(this.options.rootPath, '.kiro', 'reports')
    });

    this.errorHandler = new ConversionErrorHandler({
      logLevel: this.options.logLevel,
      enableDiagnostics: true,
      diagnosticMode: true
    });

    this.agentDiscovery = new AgentDiscovery({
      rootPath: this.options.rootPath,
      enableMonitoring: true,
      enableErrorHandling: true
    });

    // Diagnostic data
    this.diagnosticResults = new Map();
    this.systemInfo = null;
    this.conversionHealth = null;
  }

  /**
   * Run comprehensive diagnostic analysis
   * @param {Object} options - Diagnostic options
   * @returns {Promise<Object>} - Diagnostic results
   */
  async runComprehensiveDiagnostics(options = {}) {
    const diagnosticId = `diagnostic-${Date.now()}`;
    
    this.log('Starting comprehensive conversion diagnostics...', 'info');
    
    const results = {
      id: diagnosticId,
      timestamp: new Date().toISOString(),
      systemInfo: await this.collectSystemInfo(),
      conversionHealth: await this.analyzeConversionHealth(),
      agentAnalysis: await this.analyzeAgentStructure(),
      performanceAnalysis: options.includePerformance ? await this.analyzePerformance() : null,
      errorAnalysis: await this.analyzeErrors(),
      dependencyAnalysis: await this.analyzeDependencies(),
      fileSystemAnalysis: await this.analyzeFileSystem(),
      recommendations: [],
      summary: {}
    };

    // Generate recommendations based on analysis
    results.recommendations = this.generateRecommendations(results);
    
    // Create summary
    results.summary = this.createDiagnosticSummary(results);

    // Store results
    this.diagnosticResults.set(diagnosticId, results);

    // Export results if requested
    if (options.exportPath) {
      await this.exportDiagnosticResults(results, options.exportPath);
    }

    this.log(`Comprehensive diagnostics completed. Issues found: ${results.summary.totalIssues}`, 'info');
    
    return results;
  }

  /**
   * Collect system information
   * @returns {Promise<Object>} - System information
   */
  async collectSystemInfo() {
    const systemInfo = {
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      workingDirectory: process.cwd(),
      rootPath: this.options.rootPath,
      timestamp: new Date().toISOString()
    };

    // Check Node.js version compatibility
    const nodeVersion = process.version.replace('v', '');
    const majorVersion = parseInt(nodeVersion.split('.')[0]);
    systemInfo.nodeVersionCompatible = majorVersion >= 16;

    // Check available disk space
    try {
      const stats = await fs.stat(this.options.rootPath);
      systemInfo.diskInfo = {
        accessible: true,
        writable: await this.checkWritePermissions(this.options.rootPath)
      };
    } catch (error) {
      systemInfo.diskInfo = {
        accessible: false,
        error: error.message
      };
    }

    // Check environment variables
    systemInfo.environment = {
      nodeEnv: process.env.NODE_ENV || 'development',
      hasKiroConfig: !!process.env.KIRO_CONFIG,
      hasBmadConfig: !!process.env.BMAD_CONFIG
    };

    this.systemInfo = systemInfo;
    return systemInfo;
  }

  /**
   * Analyze conversion health
   * @returns {Promise<Object>} - Conversion health analysis
   */
  async analyzeConversionHealth() {
    const health = {
      overallStatus: 'unknown',
      conversionStats: this.monitor.getStatistics(),
      errorStats: this.errorHandler.getErrorStats(),
      issues: [],
      warnings: []
    };

    // Analyze conversion success rate
    const stats = health.conversionStats;
    const successRate = stats.totalConversions > 0 ? 
      (stats.successfulConversions / stats.totalConversions) * 100 : 0;

    if (successRate < 50) {
      health.issues.push({
        type: 'low_success_rate',
        severity: 'high',
        message: `Low conversion success rate: ${successRate.toFixed(1)}%`,
        recommendation: 'Review error logs and fix common conversion issues'
      });
    } else if (successRate < 80) {
      health.warnings.push({
        type: 'moderate_success_rate',
        severity: 'medium',
        message: `Moderate conversion success rate: ${successRate.toFixed(1)}%`,
        recommendation: 'Consider investigating frequent conversion failures'
      });
    }

    // Analyze error patterns
    const errorStats = health.errorStats;
    if (errorStats.total > 0) {
      const recoveryRate = errorStats.recoveryRate * 100;
      
      if (recoveryRate < 30) {
        health.issues.push({
          type: 'low_recovery_rate',
          severity: 'high',
          message: `Low error recovery rate: ${recoveryRate.toFixed(1)}%`,
          recommendation: 'Review error handling strategies and improve recovery mechanisms'
        });
      }

      // Check for error concentration
      for (const [category, count] of Object.entries(errorStats.byType)) {
        if (count > 5) {
          health.warnings.push({
            type: 'error_concentration',
            severity: 'medium',
            message: `High number of ${category} errors: ${count}`,
            recommendation: `Focus on resolving ${category} error patterns`
          });
        }
      }
    }

    // Analyze performance issues
    if (stats.performanceIssues > 0) {
      health.warnings.push({
        type: 'performance_issues',
        severity: 'medium',
        message: `${stats.performanceIssues} performance issues detected`,
        recommendation: 'Review performance metrics and optimize slow conversions'
      });
    }

    // Determine overall status
    if (health.issues.length > 0) {
      health.overallStatus = 'unhealthy';
    } else if (health.warnings.length > 0) {
      health.overallStatus = 'warning';
    } else {
      health.overallStatus = 'healthy';
    }

    this.conversionHealth = health;
    return health;
  }

  /**
   * Analyze agent structure and discovery
   * @returns {Promise<Object>} - Agent analysis
   */
  async analyzeAgentStructure() {
    const analysis = {
      discoveryStats: null,
      agentDistribution: {},
      validationIssues: [],
      dependencyIssues: [],
      structuralIssues: []
    };

    try {
      // Run agent discovery
      const discoveredAgents = await this.agentDiscovery.scanAllAgents();
      analysis.discoveryStats = this.agentDiscovery.getStatistics();
      
      // Analyze agent distribution
      const coreAgents = discoveredAgents.filter(a => a.source === 'bmad-core');
      const expansionAgents = discoveredAgents.filter(a => a.source === 'expansion-pack');
      
      analysis.agentDistribution = {
        total: discoveredAgents.length,
        core: coreAgents.length,
        expansionPack: expansionAgents.length,
        expansionPacks: [...new Set(expansionAgents.map(a => a.expansionPack))],
        byExpansionPack: {}
      };

      // Group by expansion pack
      for (const agent of expansionAgents) {
        if (!analysis.agentDistribution.byExpansionPack[agent.expansionPack]) {
          analysis.agentDistribution.byExpansionPack[agent.expansionPack] = 0;
        }
        analysis.agentDistribution.byExpansionPack[agent.expansionPack]++;
      }

      // Analyze validation issues
      const validationErrors = this.agentDiscovery.getValidationErrors();
      analysis.validationIssues = validationErrors.map(error => ({
        type: 'validation_error',
        severity: 'medium',
        filePath: error.filePath,
        message: error.error,
        timestamp: error.timestamp
      }));

      // Check for missing core agents
      const expectedCoreAgents = [
        'architect', 'analyst', 'dev', 'pm', 'po', 'qa', 'sm', 'ux-expert'
      ];
      
      const foundCoreAgentIds = coreAgents.map(a => a.id);
      const missingCoreAgents = expectedCoreAgents.filter(id => !foundCoreAgentIds.includes(id));
      
      if (missingCoreAgents.length > 0) {
        analysis.structuralIssues.push({
          type: 'missing_core_agents',
          severity: 'high',
          message: `Missing core agents: ${missingCoreAgents.join(', ')}`,
          recommendation: 'Ensure all core BMad agents are present in bmad-core/agents/'
        });
      }

      // Check for agents with no dependencies
      const agentsWithoutDeps = discoveredAgents.filter(agent => {
        const deps = agent.dependencies;
        return Object.values(deps).every(depArray => depArray.length === 0);
      });

      if (agentsWithoutDeps.length > 0) {
        analysis.structuralIssues.push({
          type: 'agents_without_dependencies',
          severity: 'low',
          message: `${agentsWithoutDeps.length} agents have no dependencies`,
          recommendation: 'Review agent configurations to ensure proper dependency declarations'
        });
      }

    } catch (error) {
      analysis.discoveryError = {
        message: error.message,
        stack: error.stack
      };
    }

    return analysis;
  }

  /**
   * Analyze performance metrics
   * @returns {Promise<Object>} - Performance analysis
   */
  async analyzePerformance() {
    const analysis = {
      conversionTimes: {},
      memoryUsage: {},
      performanceIssues: [],
      recommendations: []
    };

    // Get conversion history for analysis
    const conversionHistory = this.monitor.getConversionHistory(100);
    
    if (conversionHistory.length === 0) {
      analysis.noData = true;
      return analysis;
    }

    // Analyze conversion times
    const durations = conversionHistory
      .filter(c => c.duration)
      .map(c => c.duration);

    if (durations.length > 0) {
      analysis.conversionTimes = {
        average: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        median: this.calculateMedian(durations)
      };

      // Check for slow conversions
      const slowConversions = conversionHistory.filter(c => c.duration > 30000); // 30 seconds
      if (slowConversions.length > 0) {
        analysis.performanceIssues.push({
          type: 'slow_conversions',
          severity: 'medium',
          count: slowConversions.length,
          message: `${slowConversions.length} conversions took longer than 30 seconds`,
          recommendation: 'Investigate slow conversion patterns and optimize processing'
        });
      }
    }

    // Analyze memory usage
    const memoryUsages = conversionHistory
      .filter(c => c.performance && c.performance.peakMemory)
      .map(c => c.performance.peakMemory.heapUsed);

    if (memoryUsages.length > 0) {
      analysis.memoryUsage = {
        average: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        min: Math.min(...memoryUsages),
        max: Math.max(...memoryUsages),
        median: this.calculateMedian(memoryUsages)
      };

      // Check for high memory usage
      const highMemoryThreshold = 500 * 1024 * 1024; // 500MB
      const highMemoryConversions = conversionHistory.filter(c => 
        c.performance && c.performance.peakMemory && 
        c.performance.peakMemory.heapUsed > highMemoryThreshold
      );

      if (highMemoryConversions.length > 0) {
        analysis.performanceIssues.push({
          type: 'high_memory_usage',
          severity: 'medium',
          count: highMemoryConversions.length,
          message: `${highMemoryConversions.length} conversions used more than 500MB memory`,
          recommendation: 'Review memory usage patterns and optimize memory-intensive operations'
        });
      }
    }

    return analysis;
  }

  /**
   * Analyze error patterns and trends
   * @returns {Promise<Object>} - Error analysis
   */
  async analyzeErrors() {
    const analysis = {
      errorPatterns: {},
      trendAnalysis: {},
      criticalErrors: [],
      recommendations: []
    };

    // Get error statistics
    const errorStats = this.errorHandler.getErrorStats();
    const conversionErrors = this.errorHandler.getConversionErrors();

    if (conversionErrors.length === 0) {
      analysis.noErrors = true;
      return analysis;
    }

    // Analyze error patterns
    analysis.errorPatterns = {
      byCategory: errorStats.byType,
      byAgent: errorStats.byAgent,
      totalErrors: errorStats.total,
      recoveryRate: errorStats.recoveryRate
    };

    // Find critical errors (high frequency or severity)
    for (const [category, count] of Object.entries(errorStats.byType)) {
      if (count > 3) {
        analysis.criticalErrors.push({
          type: 'frequent_error_category',
          category,
          count,
          severity: 'high',
          message: `High frequency of ${category} errors: ${count} occurrences`,
          recommendation: `Focus on resolving ${category} error root causes`
        });
      }
    }

    // Analyze error trends over time
    const recentErrors = conversionErrors
      .filter(error => {
        const errorTime = new Date(error.timestamp);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return errorTime > oneDayAgo;
      });

    analysis.trendAnalysis = {
      recentErrors: recentErrors.length,
      errorRate: conversionErrors.length > 0 ? 
        (recentErrors.length / conversionErrors.length) * 100 : 0
    };

    if (analysis.trendAnalysis.errorRate > 50) {
      analysis.criticalErrors.push({
        type: 'increasing_error_rate',
        severity: 'high',
        message: `High recent error rate: ${analysis.trendAnalysis.errorRate.toFixed(1)}%`,
        recommendation: 'Investigate recent changes that may have introduced new error patterns'
      });
    }

    return analysis;
  }

  /**
   * Analyze dependency structure and issues
   * @returns {Promise<Object>} - Dependency analysis
   */
  async analyzeDependencies() {
    const analysis = {
      dependencyMap: {},
      missingDependencies: [],
      circularDependencies: [],
      unusedDependencies: [],
      recommendations: []
    };

    try {
      // Get dependency map from agent discovery
      const dependencyMap = this.agentDiscovery.getDependencyMap();
      analysis.dependencyMap = Object.fromEntries(dependencyMap);

      // Check for missing dependencies in file system
      const rootPath = this.options.rootPath;
      const dependencyPaths = [
        path.join(rootPath, 'bmad-core', 'tasks'),
        path.join(rootPath, 'bmad-core', 'templates'),
        path.join(rootPath, 'bmad-core', 'checklists'),
        path.join(rootPath, 'common', 'tasks'),
        path.join(rootPath, 'common', 'utils')
      ];

      for (const depPath of dependencyPaths) {
        if (!await fs.pathExists(depPath)) {
          analysis.missingDependencies.push({
            type: 'missing_dependency_directory',
            path: depPath,
            severity: 'medium',
            message: `Dependency directory not found: ${depPath}`,
            recommendation: 'Ensure all required dependency directories exist'
          });
        }
      }

      // Check for expansion pack dependency directories
      const expansionPacksPath = path.join(rootPath, 'expansion-packs');
      if (await fs.pathExists(expansionPacksPath)) {
        const expansionDirs = await fs.readdir(expansionPacksPath);
        
        for (const expansionDir of expansionDirs) {
          const expansionPath = path.join(expansionPacksPath, expansionDir);
          const stat = await fs.stat(expansionPath);
          
          if (stat.isDirectory()) {
            const requiredDirs = ['agents', 'tasks', 'templates'];
            
            for (const requiredDir of requiredDirs) {
              const dirPath = path.join(expansionPath, requiredDir);
              if (!await fs.pathExists(dirPath)) {
                analysis.missingDependencies.push({
                  type: 'missing_expansion_directory',
                  expansionPack: expansionDir,
                  directory: requiredDir,
                  path: dirPath,
                  severity: 'low',
                  message: `Missing ${requiredDir} directory in expansion pack: ${expansionDir}`,
                  recommendation: `Create ${requiredDir} directory in expansion pack or remove unused expansion pack`
                });
              }
            }
          }
        }
      }

    } catch (error) {
      analysis.analysisError = {
        message: error.message,
        stack: error.stack
      };
    }

    return analysis;
  }

  /**
   * Analyze file system structure and permissions
   * @returns {Promise<Object>} - File system analysis
   */
  async analyzeFileSystem() {
    const analysis = {
      directoryStructure: {},
      permissions: {},
      diskSpace: {},
      issues: []
    };

    const rootPath = this.options.rootPath;

    // Check required directories
    const requiredDirs = [
      '.kiro',
      '.kiro/agents',
      '.kiro/steering',
      '.kiro/hooks',
      '.kiro/logs',
      '.kiro/reports',
      'bmad-core',
      'bmad-core/agents',
      'bmad-core/tasks',
      'bmad-core/templates'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(rootPath, dir);
      
      try {
        const exists = await fs.pathExists(dirPath);
        const writable = exists ? await this.checkWritePermissions(dirPath) : false;
        
        analysis.directoryStructure[dir] = {
          exists,
          writable,
          path: dirPath
        };

        if (!exists) {
          analysis.issues.push({
            type: 'missing_directory',
            severity: dir.startsWith('.kiro') ? 'medium' : 'high',
            directory: dir,
            message: `Required directory missing: ${dir}`,
            recommendation: `Create directory: ${dirPath}`
          });
        } else if (!writable) {
          analysis.issues.push({
            type: 'permission_issue',
            severity: 'high',
            directory: dir,
            message: `Directory not writable: ${dir}`,
            recommendation: `Fix permissions for directory: ${dirPath}`
          });
        }
      } catch (error) {
        analysis.issues.push({
          type: 'directory_access_error',
          severity: 'high',
          directory: dir,
          error: error.message,
          message: `Cannot access directory: ${dir}`,
          recommendation: `Check directory permissions and existence: ${dirPath}`
        });
      }
    }

    return analysis;
  }

  /**
   * Generate recommendations based on diagnostic results
   * @param {Object} results - Diagnostic results
   * @returns {Array} - Recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];

    // System-level recommendations
    if (!results.systemInfo.nodeVersionCompatible) {
      recommendations.push({
        priority: 'high',
        category: 'system',
        title: 'Upgrade Node.js Version',
        description: `Current Node.js version ${results.systemInfo.nodeVersion} may not be compatible. Upgrade to Node.js 16 or higher.`,
        action: 'Upgrade Node.js to version 16 or higher'
      });
    }

    // Conversion health recommendations
    if (results.conversionHealth.overallStatus === 'unhealthy') {
      recommendations.push({
        priority: 'high',
        category: 'conversion',
        title: 'Fix Conversion Issues',
        description: 'Multiple conversion issues detected that require immediate attention.',
        action: 'Review and fix critical conversion errors'
      });
    }

    // Agent structure recommendations
    if (results.agentAnalysis.structuralIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'agents',
        title: 'Fix Agent Structure Issues',
        description: `${results.agentAnalysis.structuralIssues.length} agent structure issues found.`,
        action: 'Review and fix agent configuration and dependency issues'
      });
    }

    // Performance recommendations
    if (results.performanceAnalysis && results.performanceAnalysis.performanceIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        title: 'Optimize Performance',
        description: `${results.performanceAnalysis.performanceIssues.length} performance issues detected.`,
        action: 'Review and optimize slow conversion processes'
      });
    }

    // Error pattern recommendations
    if (results.errorAnalysis.criticalErrors.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'errors',
        title: 'Address Critical Error Patterns',
        description: `${results.errorAnalysis.criticalErrors.length} critical error patterns found.`,
        action: 'Focus on resolving frequent and high-severity errors'
      });
    }

    // File system recommendations
    if (results.fileSystemAnalysis.issues.length > 0) {
      const highSeverityIssues = results.fileSystemAnalysis.issues.filter(i => i.severity === 'high');
      if (highSeverityIssues.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'filesystem',
          title: 'Fix File System Issues',
          description: `${highSeverityIssues.length} critical file system issues found.`,
          action: 'Create missing directories and fix permission issues'
        });
      }
    }

    return recommendations;
  }

  /**
   * Create diagnostic summary
   * @param {Object} results - Diagnostic results
   * @returns {Object} - Summary
   */
  createDiagnosticSummary(results) {
    const summary = {
      overallHealth: 'unknown',
      totalIssues: 0,
      criticalIssues: 0,
      warnings: 0,
      recommendations: results.recommendations.length,
      categories: {
        system: 0,
        conversion: 0,
        agents: 0,
        performance: 0,
        errors: 0,
        filesystem: 0
      }
    };

    // Count issues from all analysis sections
    const allIssues = [
      ...(results.conversionHealth.issues || []),
      ...(results.conversionHealth.warnings || []),
      ...(results.agentAnalysis.validationIssues || []),
      ...(results.agentAnalysis.structuralIssues || []),
      ...(results.performanceAnalysis?.performanceIssues || []),
      ...(results.errorAnalysis.criticalErrors || []),
      ...(results.fileSystemAnalysis.issues || [])
    ];

    summary.totalIssues = allIssues.length;
    summary.criticalIssues = allIssues.filter(issue => issue.severity === 'high').length;
    summary.warnings = allIssues.filter(issue => issue.severity === 'medium' || issue.severity === 'low').length;

    // Determine overall health
    if (summary.criticalIssues > 0) {
      summary.overallHealth = 'critical';
    } else if (summary.warnings > 3) {
      summary.overallHealth = 'warning';
    } else if (summary.warnings > 0) {
      summary.overallHealth = 'good';
    } else {
      summary.overallHealth = 'excellent';
    }

    // Count by category
    results.recommendations.forEach(rec => {
      if (summary.categories.hasOwnProperty(rec.category)) {
        summary.categories[rec.category]++;
      }
    });

    return summary;
  }

  /**
   * Export diagnostic results to file
   * @param {Object} results - Diagnostic results
   * @param {string} outputPath - Output file path
   * @returns {Promise<void>}
   */
  async exportDiagnosticResults(results, outputPath) {
    try {
      await fs.ensureDir(path.dirname(outputPath));
      
      // Create human-readable report
      const report = this.formatDiagnosticReport(results);
      
      // Write both JSON and markdown formats
      const jsonPath = outputPath.replace(/\.[^.]+$/, '.json');
      const mdPath = outputPath.replace(/\.[^.]+$/, '.md');
      
      await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
      await fs.writeFile(mdPath, report);
      
      this.log(`Diagnostic results exported to: ${jsonPath} and ${mdPath}`, 'info');
    } catch (error) {
      this.log(`Failed to export diagnostic results: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Format diagnostic results as human-readable report
   * @param {Object} results - Diagnostic results
   * @returns {string} - Formatted report
   */
  formatDiagnosticReport(results) {
    let report = `# BMad Conversion Diagnostic Report\n\n`;
    report += `**Generated:** ${results.timestamp}\n`;
    report += `**Overall Health:** ${results.summary.overallHealth.toUpperCase()}\n`;
    report += `**Total Issues:** ${results.summary.totalIssues}\n`;
    report += `**Critical Issues:** ${results.summary.criticalIssues}\n\n`;

    // System Information
    report += `## System Information\n\n`;
    report += `- **Platform:** ${results.systemInfo.platform}\n`;
    report += `- **Node.js Version:** ${results.systemInfo.nodeVersion}\n`;
    report += `- **Memory Usage:** ${Math.round(results.systemInfo.memory.heapUsed / 1024 / 1024)}MB\n`;
    report += `- **Working Directory:** ${results.systemInfo.workingDirectory}\n\n`;

    // Conversion Health
    report += `## Conversion Health\n\n`;
    report += `- **Overall Status:** ${results.conversionHealth.overallStatus}\n`;
    report += `- **Total Conversions:** ${results.conversionHealth.conversionStats.totalConversions}\n`;
    report += `- **Successful:** ${results.conversionHealth.conversionStats.successfulConversions}\n`;
    report += `- **Failed:** ${results.conversionHealth.conversionStats.failedConversions}\n\n`;

    // Issues
    if (results.summary.totalIssues > 0) {
      report += `## Issues Found\n\n`;
      
      const allIssues = [
        ...(results.conversionHealth.issues || []),
        ...(results.agentAnalysis.structuralIssues || []),
        ...(results.fileSystemAnalysis.issues || [])
      ];

      allIssues.forEach((issue, index) => {
        report += `### ${index + 1}. ${issue.type} (${issue.severity})\n`;
        report += `${issue.message}\n`;
        if (issue.recommendation) {
          report += `**Recommendation:** ${issue.recommendation}\n`;
        }
        report += `\n`;
      });
    }

    // Recommendations
    if (results.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      
      results.recommendations.forEach((rec, index) => {
        report += `### ${index + 1}. ${rec.title} (${rec.priority})\n`;
        report += `${rec.description}\n`;
        report += `**Action:** ${rec.action}\n\n`;
      });
    }

    return report;
  }

  /**
   * Check write permissions for a directory
   * @param {string} dirPath - Directory path
   * @returns {Promise<boolean>} - Has write permissions
   */
  async checkWritePermissions(dirPath) {
    try {
      await fs.access(dirPath, fs.constants.W_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate median of an array
   * @param {Array} values - Array of numbers
   * @returns {number} - Median value
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0 ? 
      sorted[mid] : 
      (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Get diagnostic results by ID
   * @param {string} diagnosticId - Diagnostic ID
   * @returns {Object|null} - Diagnostic results
   */
  getDiagnosticResults(diagnosticId) {
    return this.diagnosticResults.get(diagnosticId) || null;
  }

  /**
   * Get all diagnostic results
   * @returns {Array} - All diagnostic results
   */
  getAllDiagnosticResults() {
    return Array.from(this.diagnosticResults.values());
  }

  /**
   * Clear diagnostic results
   */
  clearDiagnosticResults() {
    this.diagnosticResults.clear();
    this.log('Diagnostic results cleared', 'info');
  }

  /**
   * Log message with timestamp and level
   * @param {string} message - Message to log
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [ConversionDiagnostics] [${level.toUpperCase()}]`;
    
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

module.exports = ConversionDiagnostics;