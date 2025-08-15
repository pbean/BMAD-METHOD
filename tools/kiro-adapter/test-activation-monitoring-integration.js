#!/usr/bin/env node

/**
 * Test Activation Monitoring Integration with KiroAdapter
 * Tests the complete integration of activation monitoring with the main adapter
 */

const fs = require('fs-extra');
const path = require('path');
const KiroAdapter = require('./index');

class ActivationMonitoringIntegrationTest {
  constructor() {
    this.testDir = path.join(__dirname, 'test-output', 'activation-monitoring-integration');
    this.adapter = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Setup test environment
   */
  async setup() {
    try {
      console.log('Setting up activation monitoring integration test...');
      
      // Create test directory
      await fs.ensureDir(this.testDir);
      
      // Create test agent files
      await this.createTestAgents();
      
      // Initialize adapter
      this.adapter = new KiroAdapter({
        rootPath: this.testDir,
        healthCheckInterval: 1000, // 1 second for testing
        performanceThreshold: 2000,
        enableDetailedLogging: false
      });
      
      console.log('✓ Test environment setup complete');
      return true;
    } catch (error) {
      console.error('Failed to setup test environment:', error.message);
      return false;
    }
  }

  /**
   * Create test agent files
   */
  async createTestAgents() {
    const agentsDir = path.join(this.testDir, '.kiro', 'agents');
    await fs.ensureDir(agentsDir);

    const testAgents = [
      {
        id: 'integration-test-architect',
        name: 'Integration Test Architect',
        content: `---
id: integration-test-architect
name: Integration Test Architect
description: Test architect agent for integration monitoring
---

# Integration Test Architect Agent

This is a test architect agent for activation monitoring integration.`
      },
      {
        id: 'integration-test-developer',
        name: 'Integration Test Developer',
        content: `---
id: integration-test-developer
name: Integration Test Developer
description: Test developer agent for integration monitoring
---

# Integration Test Developer Agent

This is a test developer agent for activation monitoring integration.`
      }
    ];

    for (const agent of testAgents) {
      const agentPath = path.join(agentsDir, `${agent.id}.md`);
      await fs.writeFile(agentPath, agent.content);
    }

    console.log(`✓ Created ${testAgents.length} test agents`);
  }

  /**
   * Run a test case
   * @param {string} testName - Test name
   * @param {Function} testFunction - Test function
   */
  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Running test: ${testName}`);
      await testFunction();
      this.testResults.passed++;
      console.log(`✅ Test passed: ${testName}`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
      console.error(`❌ Test failed: ${testName} - ${error.message}`);
    }
  }

  /**
   * Test adapter initialization with monitoring
   */
  async testAdapterInitialization() {
    // Initialize the adapter
    const success = await this.adapter.initializeAgentSystem();
    if (!success) {
      throw new Error('Failed to initialize adapter agent system');
    }

    // Check that monitoring is available
    const monitoringStats = this.adapter.getActivationMonitoringStatistics();
    if (!monitoringStats) {
      throw new Error('Activation monitoring not available');
    }

    console.log('  ✓ Adapter initialized with monitoring support');
  }

  /**
   * Test monitoring statistics access
   */
  async testMonitoringStatisticsAccess() {
    // Test all monitoring statistics methods
    const activationStats = this.adapter.getActivationMonitoringStatistics();
    const performanceStats = this.adapter.getPerformanceStatistics();
    const usageAnalytics = this.adapter.getUsageAnalytics();
    const healthResults = this.adapter.getHealthCheckResults();
    const popularAgents = this.adapter.getMostPopularAgents(5);
    const performanceIssues = this.adapter.getPerformanceIssues();
    const lowEffectiveness = this.adapter.getLowEffectivenessAgents();
    const comprehensiveReport = this.adapter.getActivationMonitoringReport();

    // Verify all methods return expected data types
    if (typeof activationStats !== 'object') {
      throw new Error('Invalid activation statistics');
    }
    if (typeof performanceStats !== 'object') {
      throw new Error('Invalid performance statistics');
    }
    if (typeof usageAnalytics !== 'object') {
      throw new Error('Invalid usage analytics');
    }
    if (typeof healthResults !== 'object') {
      throw new Error('Invalid health results');
    }
    if (!Array.isArray(popularAgents)) {
      throw new Error('Invalid popular agents result');
    }
    if (!Array.isArray(performanceIssues)) {
      throw new Error('Invalid performance issues result');
    }
    if (!Array.isArray(lowEffectiveness)) {
      throw new Error('Invalid low effectiveness result');
    }
    if (typeof comprehensiveReport !== 'object') {
      throw new Error('Invalid comprehensive report');
    }

    console.log('  ✓ All monitoring statistics methods accessible');
  }

  /**
   * Test agent registration and monitoring
   */
  async testAgentRegistrationMonitoring() {
    // Register all agents
    const registrationSuccess = await this.adapter.registerAllAgents();
    if (!registrationSuccess) {
      console.warn('  ⚠ Some agents failed to register (expected in test environment)');
    }

    // Check registry statistics
    const registryStats = this.adapter.getRegistryStatistics();
    if (typeof registryStats.totalRegistered !== 'number') {
      throw new Error('Invalid registry statistics');
    }

    console.log(`  ✓ Agent registration monitored (${registryStats.totalRegistered} agents)`);
  }

  /**
   * Test health checks integration
   */
  async testHealthChecksIntegration() {
    // Wait for health checks to run
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get health check results
    const healthResults = this.adapter.getHealthCheckResults();
    if (typeof healthResults !== 'object') {
      throw new Error('Health check results not available');
    }

    console.log(`  ✓ Health checks integrated (${Object.keys(healthResults).length} agents checked)`);
  }

  /**
   * Test monitoring report generation
   */
  async testMonitoringReportGeneration() {
    const report = this.adapter.getActivationMonitoringReport();
    
    // Verify report structure
    const requiredSections = ['overview', 'performance', 'usage', 'health', 'insights', 'metadata'];
    for (const section of requiredSections) {
      if (!report[section]) {
        throw new Error(`Missing report section: ${section}`);
      }
    }

    // Verify metadata
    if (!report.metadata.reportGeneratedAt) {
      throw new Error('Missing report generation timestamp');
    }

    console.log('  ✓ Monitoring report generation verified');
  }

  /**
   * Test monitoring reset functionality
   */
  async testMonitoringReset() {
    // Reset monitoring metrics
    this.adapter.resetActivationMonitoringMetrics();

    // Verify reset
    const stats = this.adapter.getActivationMonitoringStatistics();
    if (stats.totalActivations !== 0) {
      throw new Error('Monitoring metrics not properly reset');
    }

    console.log('  ✓ Monitoring reset functionality verified');
  }

  /**
   * Test adapter shutdown with monitoring
   */
  async testAdapterShutdown() {
    // Shutdown should complete without errors
    await this.adapter.shutdown();

    console.log('  ✓ Adapter shutdown with monitoring completed');
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🚀 Starting Activation Monitoring Integration Tests');
    console.log('==================================================');
    
    const tests = [
      ['Adapter Initialization', () => this.testAdapterInitialization()],
      ['Monitoring Statistics Access', () => this.testMonitoringStatisticsAccess()],
      ['Agent Registration Monitoring', () => this.testAgentRegistrationMonitoring()],
      ['Health Checks Integration', () => this.testHealthChecksIntegration()],
      ['Monitoring Report Generation', () => this.testMonitoringReportGeneration()],
      ['Monitoring Reset', () => this.testMonitoringReset()],
      ['Adapter Shutdown', () => this.testAdapterShutdown()]
    ];
    
    for (const [testName, testFunction] of tests) {
      await this.runTest(testName, testFunction);
    }
    
    // Display final results
    this.displayResults();
  }

  /**
   * Display test results
   */
  displayResults() {
    console.log('\n📊 Integration Test Results Summary');
    console.log('===================================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      for (const error of this.testResults.errors) {
        console.log(`  • ${error.test}: ${error.error}`);
      }
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    try {
      // Remove test directory
      await fs.remove(this.testDir);
      console.log('✓ Test environment cleaned up');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }

  /**
   * Run the complete integration test suite
   */
  async run() {
    try {
      const setupSuccess = await this.setup();
      if (!setupSuccess) {
        console.error('❌ Test setup failed');
        process.exit(1);
      }
      
      await this.runAllTests();
      
      const success = this.testResults.failed === 0;
      console.log(success ? '\n🎉 All integration tests passed!' : '\n💥 Some integration tests failed!');
      
      return success;
    } catch (error) {
      console.error('Integration test execution failed:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new ActivationMonitoringIntegrationTest();
  test.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Integration test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = ActivationMonitoringIntegrationTest;