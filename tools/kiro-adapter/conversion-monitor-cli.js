#!/usr/bin/env node

/**
 * Conversion Monitor CLI
 * Command-line interface for conversion monitoring and diagnostics
 */

const { Command } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const ConversionMonitor = require('./conversion-monitor');
const ConversionDiagnostics = require('./conversion-diagnostics');
const AgentDiscovery = require('./agent-discovery');
const AgentTransformer = require('./agent-transformer');

const program = new Command();

program
  .name('conversion-monitor')
  .description('BMad Conversion Monitoring and Diagnostics Tool')
  .version('1.0.0');

// Global options
program
  .option('-v, --verbose', 'Enable verbose logging')
  .option('-q, --quiet', 'Suppress non-error output')
  .option('--root-path <path>', 'Project root path', process.cwd())
  .option('--log-level <level>', 'Log level (debug, info, warn, error)', 'info');

// Monitor command
program
  .command('monitor')
  .description('Start conversion monitoring')
  .option('-p, --performance', 'Enable performance monitoring')
  .option('-d, --detailed', 'Enable detailed logging')
  .option('--export <path>', 'Export monitoring data to file')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      const monitor = new ConversionMonitor({
        logLevel: globalOpts.logLevel,
        enablePerformanceMonitoring: options.performance,
        enableDetailedLogging: options.detailed,
        logDirectory: path.join(globalOpts.rootPath, '.kiro', 'logs'),
        reportDirectory: path.join(globalOpts.rootPath, '.kiro', 'reports')
      });

      console.log('🔍 Starting conversion monitoring...');
      console.log(`📁 Root path: ${globalOpts.rootPath}`);
      console.log(`📊 Performance monitoring: ${options.performance ? 'enabled' : 'disabled'}`);
      console.log(`📝 Detailed logging: ${options.detailed ? 'enabled' : 'disabled'}`);

      // Display current statistics
      const stats = monitor.getStatistics();
      console.log('\n📈 Current Statistics:');
      console.log(`  Total conversions: ${stats.totalConversions}`);
      console.log(`  Successful: ${stats.successfulConversions}`);
      console.log(`  Failed: ${stats.failedConversions}`);
      console.log(`  Active conversions: ${stats.activeConversions}`);
      console.log(`  Active sessions: ${stats.activeSessions}`);

      if (options.export) {
        const report = await monitor.generateDiagnosticReport({
          includeDetailedErrors: true,
          includePatterns: true,
          exportPath: options.export
        });
        console.log(`\n📄 Monitoring report exported to: ${options.export}`);
      }

      // Keep process alive for monitoring
      console.log('\n⏳ Monitoring active. Press Ctrl+C to stop.');
      process.on('SIGINT', () => {
        console.log('\n🛑 Stopping monitoring...');
        monitor.shutdown();
        process.exit(0);
      });

      // Prevent process from exiting
      setInterval(() => {
        // Display periodic updates
        const currentStats = monitor.getStatistics();
        if (currentStats.activeConversions > 0) {
          console.log(`⚡ Active conversions: ${currentStats.activeConversions}`);
        }
      }, 10000); // Every 10 seconds

    } catch (error) {
      console.error('❌ Failed to start monitoring:', error.message);
      process.exit(1);
    }
  });

// Diagnostics command
program
  .command('diagnose')
  .description('Run comprehensive conversion diagnostics')
  .option('-p, --performance', 'Include performance analysis')
  .option('-e, --errors', 'Include detailed error analysis')
  .option('-a, --agents', 'Include agent structure analysis')
  .option('--export <path>', 'Export diagnostic report')
  .option('--format <format>', 'Export format (json, md, both)', 'both')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      const diagnostics = new ConversionDiagnostics({
        rootPath: globalOpts.rootPath,
        logLevel: globalOpts.logLevel,
        enableDetailedAnalysis: true,
        enablePerformanceAnalysis: options.performance
      });

      console.log('🔍 Running comprehensive diagnostics...');
      console.log(`📁 Root path: ${globalOpts.rootPath}`);

      const results = await diagnostics.runComprehensiveDiagnostics({
        includePerformance: options.performance,
        exportPath: options.export
      });

      // Display summary
      console.log('\n📊 Diagnostic Summary:');
      console.log(`  Overall Health: ${results.summary.overallHealth.toUpperCase()}`);
      console.log(`  Total Issues: ${results.summary.totalIssues}`);
      console.log(`  Critical Issues: ${results.summary.criticalIssues}`);
      console.log(`  Warnings: ${results.summary.warnings}`);
      console.log(`  Recommendations: ${results.recommendations.length}`);

      // Display system info
      console.log('\n💻 System Information:');
      console.log(`  Platform: ${results.systemInfo.platform}`);
      console.log(`  Node.js: ${results.systemInfo.nodeVersion}`);
      console.log(`  Memory: ${Math.round(results.systemInfo.memory.heapUsed / 1024 / 1024)}MB`);
      console.log(`  Node.js Compatible: ${results.systemInfo.nodeVersionCompatible ? '✅' : '❌'}`);

      // Display conversion health
      console.log('\n🏥 Conversion Health:');
      console.log(`  Status: ${results.conversionHealth.overallStatus.toUpperCase()}`);
      console.log(`  Total Conversions: ${results.conversionHealth.conversionStats.totalConversions}`);
      console.log(`  Success Rate: ${results.conversionHealth.conversionStats.totalConversions > 0 ? 
        ((results.conversionHealth.conversionStats.successfulConversions / results.conversionHealth.conversionStats.totalConversions) * 100).toFixed(1) : 0}%`);

      // Display agent analysis
      if (results.agentAnalysis.discoveryStats) {
        console.log('\n🤖 Agent Analysis:');
        console.log(`  Total Agents: ${results.agentAnalysis.discoveryStats.total}`);
        console.log(`  Core Agents: ${results.agentAnalysis.discoveryStats.core}`);
        console.log(`  Expansion Pack Agents: ${results.agentAnalysis.discoveryStats.expansionPack}`);
        console.log(`  Validation Errors: ${results.agentAnalysis.discoveryStats.validationErrors}`);
      }

      // Display critical issues
      if (results.summary.criticalIssues > 0) {
        console.log('\n🚨 Critical Issues:');
        const criticalIssues = [
          ...(results.conversionHealth.issues || []),
          ...(results.agentAnalysis.structuralIssues || []).filter(i => i.severity === 'high'),
          ...(results.fileSystemAnalysis.issues || []).filter(i => i.severity === 'high')
        ];

        criticalIssues.slice(0, 5).forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.message}`);
          if (issue.recommendation) {
            console.log(`     💡 ${issue.recommendation}`);
          }
        });

        if (criticalIssues.length > 5) {
          console.log(`     ... and ${criticalIssues.length - 5} more issues`);
        }
      }

      // Display top recommendations
      if (results.recommendations.length > 0) {
        console.log('\n💡 Top Recommendations:');
        results.recommendations.slice(0, 3).forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec.title} (${rec.priority})`);
          console.log(`     ${rec.description}`);
          console.log(`     🔧 ${rec.action}`);
        });

        if (results.recommendations.length > 3) {
          console.log(`     ... and ${results.recommendations.length - 3} more recommendations`);
        }
      }

      if (options.export) {
        console.log(`\n📄 Diagnostic report exported to: ${options.export}`);
      }

      // Exit with appropriate code
      process.exit(results.summary.criticalIssues > 0 ? 1 : 0);

    } catch (error) {
      console.error('❌ Failed to run diagnostics:', error.message);
      if (globalOpts.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Display conversion statistics')
  .option('--history <count>', 'Number of recent conversions to show', '10')
  .option('--errors', 'Show error statistics')
  .option('--performance', 'Show performance statistics')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      const monitor = new ConversionMonitor({
        logLevel: globalOpts.logLevel,
        logDirectory: path.join(globalOpts.rootPath, '.kiro', 'logs')
      });

      const stats = monitor.getStatistics();
      
      console.log('📊 Conversion Statistics:');
      console.log(`  Total conversions: ${stats.totalConversions}`);
      console.log(`  Successful: ${stats.successfulConversions} (${stats.totalConversions > 0 ? ((stats.successfulConversions / stats.totalConversions) * 100).toFixed(1) : 0}%)`);
      console.log(`  Failed: ${stats.failedConversions} (${stats.totalConversions > 0 ? ((stats.failedConversions / stats.totalConversions) * 100).toFixed(1) : 0}%)`);
      console.log(`  Average processing time: ${stats.averageProcessingTime.toFixed(0)}ms`);
      console.log(`  Peak memory usage: ${Math.round(stats.peakMemoryUsage / 1024 / 1024)}MB`);
      console.log(`  Performance issues: ${stats.performanceIssues}`);

      // Show conversions by type
      if (Object.keys(stats.conversionsByType).length > 0) {
        console.log('\n📈 Conversions by Type:');
        for (const [type, count] of Object.entries(stats.conversionsByType)) {
          console.log(`  ${type}: ${count}`);
        }
      }

      // Show conversions by source
      if (Object.keys(stats.conversionsBySource).length > 0) {
        console.log('\n📦 Conversions by Source:');
        for (const [source, count] of Object.entries(stats.conversionsBySource)) {
          console.log(`  ${source}: ${count}`);
        }
      }

      // Show recent conversion history
      const history = monitor.getConversionHistory(parseInt(options.history));
      if (history.length > 0) {
        console.log(`\n📜 Recent Conversions (last ${history.length}):`);
        history.forEach((conversion, index) => {
          const status = conversion.status === 'completed' ? '✅' : '❌';
          const duration = conversion.duration ? `${conversion.duration}ms` : 'N/A';
          console.log(`  ${index + 1}. ${status} ${conversion.info.agentId || 'Unknown'} (${duration})`);
        });
      }

      // Show error statistics if requested
      if (options.errors && Object.keys(stats.errorsByCategory).length > 0) {
        console.log('\n🚨 Errors by Category:');
        for (const [category, count] of Object.entries(stats.errorsByCategory)) {
          console.log(`  ${category}: ${count}`);
        }
      }

    } catch (error) {
      console.error('❌ Failed to get statistics:', error.message);
      process.exit(1);
    }
  });

// Test command
program
  .command('test')
  .description('Run conversion monitoring test')
  .option('--agents <count>', 'Number of test agents to process', '3')
  .option('--monitor', 'Enable monitoring during test')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      
      console.log('🧪 Running conversion monitoring test...');
      
      let monitor = null;
      if (options.monitor) {
        monitor = new ConversionMonitor({
          logLevel: globalOpts.logLevel,
          enablePerformanceMonitoring: true,
          enableDetailedLogging: true,
          logDirectory: path.join(globalOpts.rootPath, '.kiro', 'logs')
        });
      }

      // Discover agents for testing
      const discovery = new AgentDiscovery({
        rootPath: globalOpts.rootPath,
        enableMonitoring: !!monitor
      });

      const agents = await discovery.scanAllAgents();
      const testAgents = agents.slice(0, parseInt(options.agents));

      console.log(`📋 Found ${agents.length} agents, testing with ${testAgents.length}`);

      // Start monitoring session
      let sessionId = null;
      if (monitor) {
        sessionId = `test-session-${Date.now()}`;
        monitor.startConversionSession(sessionId, {
          type: 'test_conversion',
          source: 'cli_test',
          agentCount: testAgents.length
        });
      }

      // Test conversion with monitoring
      const transformer = new AgentTransformer({
        logLevel: globalOpts.logLevel,
        enablePerformanceMonitoring: true,
        enableDetailedLogging: true
      });

      let successCount = 0;
      let failCount = 0;

      for (const agent of testAgents) {
        const outputPath = path.join(globalOpts.rootPath, '.kiro', 'agents', `test-${agent.id}.md`);
        
        try {
          console.log(`🔄 Testing conversion: ${agent.id}`);
          
          const success = await transformer.transformAgent(
            agent.filePath,
            outputPath,
            {
              agentId: agent.id,
              source: agent.source,
              expansionPack: agent.expansionPack,
              sessionId
            }
          );

          if (success) {
            successCount++;
            console.log(`✅ ${agent.id} - Success`);
          } else {
            failCount++;
            console.log(`❌ ${agent.id} - Failed`);
          }

          // Clean up test file
          if (await fs.pathExists(outputPath)) {
            await fs.remove(outputPath);
          }

        } catch (error) {
          failCount++;
          console.log(`❌ ${agent.id} - Error: ${error.message}`);
        }
      }

      // Complete monitoring session
      if (monitor && sessionId) {
        monitor.completeConversionSession(sessionId, {
          success: failCount === 0,
          totalAgents: testAgents.length,
          successful: successCount,
          failed: failCount
        });
      }

      console.log('\n📊 Test Results:');
      console.log(`  Total: ${testAgents.length}`);
      console.log(`  Successful: ${successCount}`);
      console.log(`  Failed: ${failCount}`);
      console.log(`  Success Rate: ${testAgents.length > 0 ? ((successCount / testAgents.length) * 100).toFixed(1) : 0}%`);

      if (monitor) {
        const stats = monitor.getStatistics();
        console.log('\n📈 Monitoring Statistics:');
        console.log(`  Total conversions tracked: ${stats.totalConversions}`);
        console.log(`  Average processing time: ${stats.averageProcessingTime.toFixed(0)}ms`);
        console.log(`  Peak memory usage: ${Math.round(stats.peakMemoryUsage / 1024 / 1024)}MB`);
      }

      process.exit(failCount > 0 ? 1 : 0);

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      if (globalOpts.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Clear command
program
  .command('clear')
  .description('Clear monitoring data and logs')
  .option('--logs', 'Clear log files')
  .option('--reports', 'Clear report files')
  .option('--all', 'Clear all monitoring data')
  .action(async (options) => {
    try {
      const globalOpts = program.opts();
      
      if (options.all || options.logs) {
        const logsDir = path.join(globalOpts.rootPath, '.kiro', 'logs');
        if (await fs.pathExists(logsDir)) {
          await fs.emptyDir(logsDir);
          console.log('🗑️  Cleared log files');
        }
      }

      if (options.all || options.reports) {
        const reportsDir = path.join(globalOpts.rootPath, '.kiro', 'reports');
        if (await fs.pathExists(reportsDir)) {
          await fs.emptyDir(reportsDir);
          console.log('🗑️  Cleared report files');
        }
      }

      if (options.all) {
        const diagnosticsDir = path.join(globalOpts.rootPath, '.kiro', 'diagnostics');
        if (await fs.pathExists(diagnosticsDir)) {
          await fs.emptyDir(diagnosticsDir);
          console.log('🗑️  Cleared diagnostic files');
        }
      }

      console.log('✅ Monitoring data cleared');

    } catch (error) {
      console.error('❌ Failed to clear data:', error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();