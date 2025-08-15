/**
 * Test Conversion Monitoring System
 * Comprehensive test for the conversion monitoring implementation
 */

const path = require('path');
const fs = require('fs-extra');
const ConversionMonitor = require('./conversion-monitor');
const ConversionDiagnostics = require('./conversion-diagnostics');
const AgentDiscovery = require('./agent-discovery');
const AgentTransformer = require('./agent-transformer');

class ConversionMonitoringTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Run all monitoring tests
   */
  async runAllTests() {
    console.log('🧪 Starting Conversion Monitoring Tests...\n');

    try {
      await this.testConversionMonitor();
      await this.testConversionDiagnostics();
      await this.testIntegratedWorkflow();
      
      this.displayResults();
      
      return this.testResults.failed === 0;
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      return false;
    }
  }

  /**
   * Test ConversionMonitor functionality
   */
  async testConversionMonitor() {
    console.log('📊 Testing ConversionMonitor...');

    const monitor = new ConversionMonitor({
      logLevel: 'info',
      enablePerformanceMonitoring: true,
      enableDetailedLogging: true,
      logDirectory: path.join(__dirname, 'test-logs'),
      reportDirectory: path.join(__dirname, 'test-reports')
    });

    // Test session management
    await this.test('Session Creation', async () => {
      const sessionId = 'test-session-1';
      const session = monitor.startConversionSession(sessionId, {
        type: 'test',
        source: 'unit-test',
        agentCount: 2
      });

      if (!session || session.id !== sessionId) {
        throw new Error('Session not created correctly');
      }

      return true;
    });

    // Test conversion tracking
    await this.test('Conversion Tracking', async () => {
      const sessionId = 'test-session-1';
      const conversionId = 'test-conversion-1';
      
      const conversion = monitor.startConversion(sessionId, conversionId, {
        agentId: 'test-agent',
        source: 'test',
        type: 'agent'
      });

      if (!conversion || conversion.id !== conversionId) {
        throw new Error('Conversion not created correctly');
      }

      // Test step logging
      monitor.logConversionStep(conversionId, 'test-step', { data: 'test' });
      monitor.completeConversionStep(conversionId, 'test-step', { success: true });

      // Complete conversion
      monitor.completeConversion(conversionId, { success: true });

      return true;
    });

    // Test statistics
    await this.test('Statistics Generation', async () => {
      const stats = monitor.getStatistics();
      
      if (typeof stats.totalConversions !== 'number') {
        throw new Error('Statistics not generated correctly');
      }

      return true;
    });

    // Test diagnostic report
    await this.test('Diagnostic Report Generation', async () => {
      const report = await monitor.generateDiagnosticReport({
        includeDetailedErrors: true,
        includePatterns: true
      });

      if (!report || !report.timestamp) {
        throw new Error('Diagnostic report not generated correctly');
      }

      return true;
    });

    // Complete session
    monitor.completeConversionSession('test-session-1', { success: true });

    console.log('✅ ConversionMonitor tests completed\n');
  }

  /**
   * Test ConversionDiagnostics functionality
   */
  async testConversionDiagnostics() {
    console.log('🔍 Testing ConversionDiagnostics...');

    const diagnostics = new ConversionDiagnostics({
      rootPath: process.cwd(),
      logLevel: 'info',
      enableDetailedAnalysis: true,
      enablePerformanceAnalysis: true,
      outputDirectory: path.join(__dirname, 'test-diagnostics')
    });

    // Test system info collection
    await this.test('System Info Collection', async () => {
      const systemInfo = await diagnostics.collectSystemInfo();
      
      if (!systemInfo || !systemInfo.platform || !systemInfo.nodeVersion) {
        throw new Error('System info not collected correctly');
      }

      return true;
    });

    // Test conversion health analysis
    await this.test('Conversion Health Analysis', async () => {
      const health = await diagnostics.analyzeConversionHealth();
      
      if (!health || !health.overallStatus) {
        throw new Error('Conversion health not analyzed correctly');
      }

      return true;
    });

    // Test file system analysis
    await this.test('File System Analysis', async () => {
      const fsAnalysis = await diagnostics.analyzeFileSystem();
      
      if (!fsAnalysis || !fsAnalysis.directoryStructure) {
        throw new Error('File system analysis not performed correctly');
      }

      return true;
    });

    console.log('✅ ConversionDiagnostics tests completed\n');
  }

  /**
   * Test integrated workflow with monitoring
   */
  async testIntegratedWorkflow() {
    console.log('🔄 Testing Integrated Workflow...');

    // Test agent discovery with monitoring
    await this.test('Agent Discovery with Monitoring', async () => {
      const discovery = new AgentDiscovery({
        rootPath: process.cwd(),
        enableMonitoring: true,
        logLevel: 'warn' // Reduce noise
      });

      const agents = await discovery.scanAllAgents();
      
      if (!Array.isArray(agents)) {
        throw new Error('Agent discovery with monitoring failed');
      }

      return true;
    });

    // Test agent transformation with monitoring
    await this.test('Agent Transformation with Monitoring', async () => {
      const transformer = new AgentTransformer({
        logLevel: 'warn', // Reduce noise
        enablePerformanceMonitoring: true,
        enableDetailedLogging: false
      });

      // Create a test agent file
      const testAgentPath = path.join(__dirname, 'test-agent.md');
      const testOutputPath = path.join(__dirname, 'test-output.md');
      
      const testAgentContent = `---
agent:
  id: test-agent
  name: Test Agent
  title: Test Assistant
persona:
  role: Test Role
  style: Test Style
---

# Test Agent

This is a test agent for monitoring.`;

      await fs.writeFile(testAgentPath, testAgentContent);

      try {
        const success = await transformer.transformAgent(
          testAgentPath,
          testOutputPath,
          {
            agentId: 'test-agent',
            source: 'test'
          }
        );

        if (!success) {
          throw new Error('Agent transformation with monitoring failed');
        }

        // Verify output file was created
        const outputExists = await fs.pathExists(testOutputPath);
        if (!outputExists) {
          throw new Error('Output file not created');
        }

        return true;
      } finally {
        // Clean up test files
        await fs.remove(testAgentPath).catch(() => {});
        await fs.remove(testOutputPath).catch(() => {});
      }
    });

    console.log('✅ Integrated Workflow tests completed\n');
  }

  /**
   * Run a single test with error handling
   */
  async test(testName, testFunction) {
    try {
      const result = await testFunction();
      if (result) {
        console.log(`  ✅ ${testName}`);
        this.testResults.passed++;
      } else {
        console.log(`  ❌ ${testName} - Test returned false`);
        this.testResults.failed++;
        this.testResults.errors.push(`${testName}: Test returned false`);
      }
    } catch (error) {
      console.log(`  ❌ ${testName} - ${error.message}`);
      this.testResults.failed++;
      this.testResults.errors.push(`${testName}: ${error.message}`);
    }
  }

  /**
   * Display test results
   */
  displayResults() {
    console.log('📊 Test Results:');
    console.log(`  Passed: ${this.testResults.passed}`);
    console.log(`  Failed: ${this.testResults.failed}`);
    console.log(`  Total: ${this.testResults.passed + this.testResults.failed}`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n⚠️  ${this.testResults.failed} test(s) failed.`);
    }
  }

  /**
   * Clean up test artifacts
   */
  async cleanup() {
    const testDirs = [
      path.join(__dirname, 'test-logs'),
      path.join(__dirname, 'test-reports'),
      path.join(__dirname, 'test-diagnostics')
    ];

    for (const dir of testDirs) {
      try {
        await fs.remove(dir);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new ConversionMonitoringTest();
  
  test.runAllTests()
    .then(async (success) => {
      await test.cleanup();
      process.exit(success ? 0 : 1);
    })
    .catch(async (error) => {
      console.error('Test execution failed:', error);
      await test.cleanup();
      process.exit(1);
    });
}

module.exports = ConversionMonitoringTest;