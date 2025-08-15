#!/usr/bin/env node

/**
 * Activation Monitor CLI
 * Command-line interface for viewing activation monitoring data
 */

const fs = require('fs-extra');
const path = require('path');
const ActivationMonitor = require('./activation-monitor');
const KiroAgentRegistry = require('./kiro-agent-registry');
const ActivationManager = require('./activation-manager');

class ActivationMonitorCLI {
  constructor() {
    this.rootPath = process.cwd();
    this.monitor = null;
    this.registry = null;
    this.activationManager = null;
  }

  /**
   * Initialize the CLI
   * @returns {Promise<boolean>} - Success status
   */
  async initialize() {
    try {
      // Initialize registry
      this.registry = new KiroAgentRegistry({ rootPath: this.rootPath });
      await this.registry.initialize();

      // Initialize activation manager
      this.activationManager = new ActivationManager({ 
        rootPath: this.rootPath,
        registry: this.registry
      });
      await this.activationManager.initialize();

      // Initialize monitor
      this.monitor = new ActivationMonitor({
        rootPath: this.rootPath,
        registry: this.registry,
        activationManager: this.activationManager,
        enableDetailedLogging: false
      });
      await this.monitor.initialize();

      return true;
    } catch (error) {
      console.error('Failed to initialize Activation Monitor CLI:', error.message);
      return false;
    }
  }

  /**
   * Display activation statistics
   */
  displayActivationStats() {
    const stats = this.monitor.getActivationStatistics();
    
    console.log('\n📊 Activation Statistics');
    console.log('========================');
    console.log(`Total Activations: ${stats.totalActivations}`);
    console.log(`Successful: ${stats.successfulActivations} (${stats.successRate}%)`);
    console.log(`Failed: ${stats.failedActivations}`);
    console.log(`Total Errors: ${stats.totalErrors}`);
    console.log(`Monitoring Active: ${stats.isMonitoring ? '✓' : '✗'}`);
  }

  /**
   * Display performance statistics
   */
  displayPerformanceStats() {
    const performanceStats = this.monitor.getPerformanceStatistics();
    
    console.log('\n⚡ Performance Statistics');
    console.log('=========================');
    
    if (Object.keys(performanceStats).length === 0) {
      console.log('No performance data available');
      return;
    }

    // Sort by average duration
    const sortedAgents = Object.entries(performanceStats)
      .sort(([,a], [,b]) => b.averageDuration - a.averageDuration);

    console.log('Agent ID'.padEnd(25) + 'Avg Duration'.padEnd(15) + 'Total'.padEnd(10) + 'Rating');
    console.log('-'.repeat(70));

    for (const [agentId, stats] of sortedAgents) {
      const avgDuration = `${stats.averageDuration}ms`;
      const rating = this.getRatingEmoji(stats.performanceRating);
      
      console.log(
        agentId.padEnd(25) + 
        avgDuration.padEnd(15) + 
        stats.totalActivations.toString().padEnd(10) + 
        `${rating} ${stats.performanceRating}`
      );
    }
  }

  /**
   * Display usage analytics
   */
  displayUsageAnalytics() {
    const usageStats = this.monitor.getUsageAnalytics();
    
    console.log('\n📈 Usage Analytics');
    console.log('==================');
    
    if (Object.keys(usageStats).length === 0) {
      console.log('No usage data available');
      return;
    }

    // Sort by popularity score
    const sortedAgents = Object.entries(usageStats)
      .sort(([,a], [,b]) => b.popularityScore - a.popularityScore);

    console.log('Agent ID'.padEnd(25) + 'Activations'.padEnd(12) + 'Effectiveness'.padEnd(15) + 'Popularity');
    console.log('-'.repeat(70));

    for (const [agentId, stats] of sortedAgents) {
      const effectiveness = `${stats.effectiveness}%`;
      const popularity = stats.popularityScore.toFixed(1);
      
      console.log(
        agentId.padEnd(25) + 
        stats.totalActivations.toString().padEnd(12) + 
        effectiveness.padEnd(15) + 
        popularity
      );
    }
  }

  /**
   * Display health check results
   */
  displayHealthChecks() {
    const healthResults = this.monitor.getHealthCheckResults();
    
    console.log('\n🏥 Health Check Results');
    console.log('=======================');
    
    if (Object.keys(healthResults).length === 0) {
      console.log('No health check data available');
      return;
    }

    console.log('Agent ID'.padEnd(25) + 'Status'.padEnd(12) + 'Last Check');
    console.log('-'.repeat(60));

    for (const [agentId, health] of Object.entries(healthResults)) {
      const statusEmoji = this.getHealthEmoji(health.status);
      const lastCheck = health.lastCheck ? 
        new Date(health.lastCheck).toLocaleString() : 'Never';
      
      console.log(
        agentId.padEnd(25) + 
        `${statusEmoji} ${health.status}`.padEnd(12) + 
        lastCheck
      );
    }
  }

  /**
   * Display most popular agents
   */
  displayMostPopular() {
    const popular = this.monitor.getMostPopularAgents(10);
    
    console.log('\n🌟 Most Popular Agents');
    console.log('======================');
    
    if (popular.length === 0) {
      console.log('No popularity data available');
      return;
    }

    console.log('Rank'.padEnd(6) + 'Agent ID'.padEnd(25) + 'Score'.padEnd(10) + 'Activations');
    console.log('-'.repeat(60));

    popular.forEach((agent, index) => {
      const rank = `#${index + 1}`;
      const score = agent.popularityScore.toFixed(1);
      
      console.log(
        rank.padEnd(6) + 
        agent.agentId.padEnd(25) + 
        score.padEnd(10) + 
        agent.totalActivations
      );
    });
  }

  /**
   * Display performance issues
   */
  displayPerformanceIssues() {
    const issues = this.monitor.getPerformanceIssues();
    
    console.log('\n⚠️  Performance Issues');
    console.log('======================');
    
    if (issues.length === 0) {
      console.log('No performance issues detected ✓');
      return;
    }

    for (const issue of issues) {
      const severityEmoji = issue.severity === 'high' ? '🔴' : '🟡';
      console.log(`${severityEmoji} ${issue.agentId}: ${issue.issue}`);
      
      if (issue.averageDuration) {
        console.log(`   Average Duration: ${issue.averageDuration}ms (threshold: ${issue.threshold}ms)`);
      }
      if (issue.slowPercentage) {
        console.log(`   Slow Activations: ${issue.slowPercentage}%`);
      }
      console.log();
    }
  }

  /**
   * Display low effectiveness agents
   */
  displayLowEffectiveness() {
    const lowEffectiveness = this.monitor.getLowEffectivenessAgents();
    
    console.log('\n📉 Low Effectiveness Agents');
    console.log('===========================');
    
    if (lowEffectiveness.length === 0) {
      console.log('All agents have good effectiveness ✓');
      return;
    }

    for (const agent of lowEffectiveness) {
      const severityEmoji = agent.severity === 'high' ? '🔴' : '🟡';
      console.log(`${severityEmoji} ${agent.agentId}: ${agent.effectiveness}% effectiveness`);
      console.log(`   Activations: ${agent.totalActivations}, Failures: ${agent.totalFailures}`);
      console.log();
    }
  }

  /**
   * Display comprehensive report
   */
  displayComprehensiveReport() {
    console.log('\n🔍 Comprehensive Activation Monitoring Report');
    console.log('=============================================');
    
    this.displayActivationStats();
    this.displayPerformanceStats();
    this.displayUsageAnalytics();
    this.displayHealthChecks();
    this.displayMostPopular();
    this.displayPerformanceIssues();
    this.displayLowEffectiveness();
    
    const report = this.monitor.getMonitoringReport();
    console.log('\n📋 Report Metadata');
    console.log('==================');
    console.log(`Generated: ${report.metadata.reportGeneratedAt.toLocaleString()}`);
    console.log(`Agents Monitored: ${report.insights.totalAgentsMonitored}`);
    console.log(`Retention Period: ${report.metadata.retentionDays} days`);
    console.log(`Health Check Interval: ${Math.round(report.metadata.healthCheckInterval / 1000 / 60)} minutes`);
  }

  /**
   * Export report to JSON file
   * @param {string} filename - Output filename
   */
  async exportReport(filename) {
    try {
      const report = this.monitor.getMonitoringReport();
      const outputPath = path.resolve(filename);
      
      await fs.writeJson(outputPath, report, { spaces: 2 });
      console.log(`✓ Report exported to: ${outputPath}`);
    } catch (error) {
      console.error(`Failed to export report: ${error.message}`);
    }
  }

  /**
   * Reset all monitoring data
   */
  async resetData() {
    try {
      this.monitor.resetMetrics();
      console.log('✓ All monitoring data has been reset');
    } catch (error) {
      console.error(`Failed to reset data: ${error.message}`);
    }
  }

  /**
   * Get rating emoji for performance rating
   * @param {string} rating - Performance rating
   * @returns {string} - Emoji
   */
  getRatingEmoji(rating) {
    switch (rating) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'fair': return '🟠';
      case 'poor': return '🔴';
      default: return '⚪';
    }
  }

  /**
   * Get health emoji for health status
   * @param {string} status - Health status
   * @returns {string} - Emoji
   */
  getHealthEmoji(status) {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'unhealthy': return '❌';
      case 'error': return '💥';
      default: return '❓';
    }
  }

  /**
   * Display help information
   */
  displayHelp() {
    console.log('\nActivation Monitor CLI');
    console.log('=====================');
    console.log('\nUsage: node activation-monitor-cli.js [command]');
    console.log('\nCommands:');
    console.log('  stats         Show activation statistics');
    console.log('  performance   Show performance statistics');
    console.log('  usage         Show usage analytics');
    console.log('  health        Show health check results');
    console.log('  popular       Show most popular agents');
    console.log('  issues        Show performance issues');
    console.log('  effectiveness Show low effectiveness agents');
    console.log('  report        Show comprehensive report');
    console.log('  export <file> Export report to JSON file');
    console.log('  reset         Reset all monitoring data');
    console.log('  help          Show this help message');
    console.log('\nExamples:');
    console.log('  node activation-monitor-cli.js stats');
    console.log('  node activation-monitor-cli.js export report.json');
    console.log('  node activation-monitor-cli.js reset');
  }

  /**
   * Run the CLI with command line arguments
   */
  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';

    // Initialize unless it's just help
    if (command !== 'help') {
      const initialized = await this.initialize();
      if (!initialized) {
        process.exit(1);
      }
    }

    try {
      switch (command) {
        case 'stats':
          this.displayActivationStats();
          break;
          
        case 'performance':
          this.displayPerformanceStats();
          break;
          
        case 'usage':
          this.displayUsageAnalytics();
          break;
          
        case 'health':
          this.displayHealthChecks();
          break;
          
        case 'popular':
          this.displayMostPopular();
          break;
          
        case 'issues':
          this.displayPerformanceIssues();
          break;
          
        case 'effectiveness':
          this.displayLowEffectiveness();
          break;
          
        case 'report':
          this.displayComprehensiveReport();
          break;
          
        case 'export':
          const filename = args[1] || 'activation-report.json';
          await this.exportReport(filename);
          break;
          
        case 'reset':
          await this.resetData();
          break;
          
        case 'help':
        default:
          this.displayHelp();
          break;
      }
    } catch (error) {
      console.error(`Command failed: ${error.message}`);
      process.exit(1);
    } finally {
      if (this.monitor) {
        await this.monitor.stop();
      }
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new ActivationMonitorCLI();
  cli.run().catch(error => {
    console.error('CLI execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = ActivationMonitorCLI;