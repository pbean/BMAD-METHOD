#!/usr/bin/env node

/**
 * Test Activation Monitoring Integration
 * Tests the complete activation monitoring system with real components
 */

const fs = require('fs-extra');
const path = require('path');
const ActivationMonitor = require('./activation-monitor');
const KiroAgentRegistry = require('./kiro-agent-registry');
const ActivationManager = require('./activation-manager');

class ActivationMonitoringTest {
  constructor() {
    this.testDir = path.join(__dirname, 'test-output', 'activation-monitoring');
    this.registry = null;
    this.activationManager = null;
    this.monitor = null;
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
      console.log('Setting up activation monitoring test environment...');
      
      // Create test directory
      await fs.ensureDir(this.testDir);
      
      // Create test agent files
      await this.createTestAgents();
      
      // Initialize components
      await this.initializeComponents();
      
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

    // Create test agents
    const testAgents = [
      {
        id: 'test-architect',
        name: 'Test Architect',
        content: `---
id: test-architect
name: Test Architect
description: Test architect agent for monitoring
---

# Test Architect Agent

This is a test architect agent for activation monitoring.`
      },
      {
        id: 'test-developer',
        name: 'Test Developer',
        content: `---
id: test-developer
name: Test Developer
description: Test developer agent for monitoring
---

# Test Developer Agent

This is a test developer agent for activation monitoring.`
      },
      {
        id: 'test-pm',
        name: 'Test Project Manager',
        content: `---
id: test-pm
name: Test Project Manager
description: Test PM agent for monitoring
---

# Test Project Manager Agent

This is a test project manager agent for activation monitoring.`
      }
    ];

    for (const agent of testAgents) {
      const agentPath = path.join(agentsDir, `${agent.id}.md`);
      await fs.writeFile(agentPath, agent.content);
    }

    console.log(`✓ Created ${testAgents.length} test agents`);
  }

  /**
   * Initialize system components
   */
  async initializeComponents() {
    // Initialize registry
    this.registry = new KiroAgentRegistry({ 
      rootPath: this.testDir,
      retryAttempts: 1,
      retryDelay: 100
    });
    await this.registry.initialize();

    // Initialize activation manager
    this.activationManager = new ActivationManager({ 
      rootPath: this.testDir,
      registry: this.registry,
      maxConcurrentAgents: 5,
      sessionTimeout: 60000
    });
    await this.activationManager.initialize();

    // Initialize monitor
    this.monitor = new ActivationMonitor({
      rootPath: this.testDir,
      registry: this.registry,
      activationManager: this.activationManager,
      healthCheckInterval: 1000, // 1 second for testing
      performanceThreshold: 2000,
      enableDetailedLogging: true
    });
    await this.monitor.initialize();

    console.log('✓ All components initialized');
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
   * Test basic monitoring functionality
   */
  async testBasicMonitoring() {
    // Check that monitoring is active
    if (!this.monitor.isMonitoring) {
      throw new Error('Monitor is not active');
    }

    // Check initial statistics
    const stats = this.monitor.getActivationStatistics();
    if (typeof stats.totalActivations !== 'number') {
      throw new Error('Invalid activation statistics');
    }

    console.log('  ✓ Basic monitoring functionality verified');
  }

  /**
   * Test activation tracking
   */
  async testActivationTracking() {
    const agentId = 'test-architect';
    
    // Start performance tracking
    this.monitor.startPerformanceTracking(agentId);
    
    // Simulate activation delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Track successful activation
    const instance = {
      id: agentId,
      name: 'Test Architect',
      metadata: { source: 'bmad-core' },
      activatedAt: new Date()
    };
    
    this.monitor.trackActivationSuccess(agentId, instance);
    
    // Verify tracking
    const stats = this.monitor.getActivationStatistics();
    if (stats.totalActivations !== 1 || stats.successfulActivations !== 1) {
      throw new Error('Activation tracking failed');
    }
    
    // Check performance metrics
    const performanceStats = this.monitor.getPerformanceStatistics();
    if (!performanceStats[agentId] || performanceStats[agentId].totalActivations !== 1) {
      throw new Error('Performance tracking failed');
    }
    
    console.log('  ✓ Activation tracking verified');
  }

  /**
   * Test failure tracking
   */
  async testFailureTracking() {
    const agentId = 'test-developer';
    
    // Start performance tracking
    this.monitor.startPerformanceTracking(agentId);
    
    // Simulate activation delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Track failed activation
    const error = new Error('Test activation failure');
    this.monitor.trackActivationFailure(agentId, error);
    
    // Verify tracking
    const stats = this.monitor.getActivationStatistics();
    if (stats.failedActivations === 0) {
      throw new Error('Failure tracking failed');
    }
    
    // Check usage analytics
    const usageStats = this.monitor.getUsageAnalytics();
    if (!usageStats[agentId] || usageStats[agentId].totalFailures !== 1) {
      throw new Error('Usage analytics tracking failed');
    }
    
    console.log('  ✓ Failure tracking verified');
  }

  /**
   * Test health checks
   */
  async testHealthChecks() {
    // Wait for health checks to run
    await new Promise(resolve => {
      this.monitor.once('healthChecksCompleted', (result) => {
        if (result.totalAgents !== 3) {
          throw new Error(`Expected 3 agents, got ${result.totalAgents}`);
        }
        
        if (result.healthyAgents === 0) {
          throw new Error('No healthy agents detected');
        }
        
        console.log('  ✓ Health checks verified');
        resolve();
      });
    });
  }

  /**
   * Test performance monitoring
   */
  async testPerformanceMonitoring() {
    const agentId = 'test-pm';
    
    // Create slow activation
    this.monitor.startPerformanceTracking(agentId);
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const instance = {
      id: agentId,
      name: 'Test PM',
      metadata: { source: 'bmad-core' },
      activatedAt: new Date()
    };
    
    this.monitor.trackActivationSuccess(agentId, instance);
    
    // Check performance metrics
    const performanceStats = this.monitor.getPerformanceStatistics();
    if (!performanceStats[agentId]) {
      throw new Error('Performance metrics not created');
    }
    
    const metrics = performanceStats[agentId];
    if (metrics.averageDuration <= 0) {
      throw new Error('Invalid average duration');
    }
    
    console.log('  ✓ Performance monitoring verified');
  }

  /**
   * Test usage analytics
   */
  async testUsageAnalytics() {
    const agentId = 'test-architect';
    
    // Add more activations for analytics
    for (let i = 0; i < 3; i++) {
      this.monitor.updateUsageAnalytics(agentId, 'activation_success');
    }
    
    // Add one failure
    this.monitor.updateUsageAnalytics(agentId, 'activation_failure');
    
    // Check analytics
    const usageStats = this.monitor.getUsageAnalytics();
    if (!usageStats[agentId]) {
      throw new Error('Usage analytics not created');
    }
    
    const analytics = usageStats[agentId];
    if (analytics.effectiveness !== 75) { // 3/4 success rate
      throw new Error(`Expected 75% effectiveness, got ${analytics.effectiveness}%`);
    }
    
    if (analytics.popularityScore <= 0) {
      throw new Error('Invalid popularity score');
    }
    
    console.log('  ✓ Usage analytics verified');
  }

  /**
   * Test reporting functionality
   */
  async testReporting() {
    // Generate comprehensive report
    const report = this.monitor.getMonitoringReport();
    
    // Verify report structure
    const requiredSections = ['overview', 'performance', 'usage', 'health', 'insights', 'metadata'];
    for (const section of requiredSections) {
      if (!report[section]) {
        throw new Error(`Missing report section: ${section}`);
      }
    }
    
    // Check insights
    if (!Array.isArray(report.insights.mostPopular)) {
      throw new Error('Invalid most popular agents data');
    }
    
    if (!Array.isArray(report.insights.performanceIssues)) {
      throw new Error('Invalid performance issues data');
    }
    
    // Test specific report functions
    const popular = this.monitor.getMostPopularAgents(5);
    if (!Array.isArray(popular)) {
      throw new Error('Invalid popular agents result');
    }
    
    const issues = this.monitor.getPerformanceIssues();
    if (!Array.isArray(issues)) {
      throw new Error('Invalid performance issues result');
    }
    
    const lowEffectiveness = this.monitor.getLowEffectivenessAgents();
    if (!Array.isArray(lowEffectiveness)) {
      throw new Error('Invalid low effectiveness result');
    }
    
    console.log('  ✓ Reporting functionality verified');
  }

  /**
   * Test persistence
   */
  async testPersistence() {
    // Save metrics
    await this.monitor.saveMetrics();
    
    // Check that metrics file was created
    const metricsFile = path.join(this.testDir, '.kiro', 'activation-metrics.json');
    if (!await fs.pathExists(metricsFile)) {
      throw new Error('Metrics file was not created');
    }
    
    // Verify file content
    const savedData = await fs.readJson(metricsFile);
    if (!savedData.totalActivations || !savedData.performanceMetrics) {
      throw new Error('Invalid saved metrics data');
    }
    
    console.log('  ✓ Persistence functionality verified');
  }

  /**
   * Test error categorization
   */
  async testErrorCategorization() {
    const testCases = [
      { error: new Error('Agent not found'), expected: 'not_found' },
      { error: new Error('Agent already active'), expected: 'conflict' },
      { error: new Error('Activation timeout'), expected: 'performance' },
      { error: new Error('Missing dependency'), expected: 'dependency' },
      { error: new Error('Permission denied'), expected: 'permission' },
      { error: new Error('Unknown error'), expected: 'unknown' }
    ];
    
    for (const testCase of testCases) {
      const category = this.monitor.categorizeError(testCase.error);
      if (category !== testCase.expected) {
        throw new Error(`Expected category ${testCase.expected}, got ${category}`);
      }
    }
    
    console.log('  ✓ Error categorization verified');
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Activation Monitoring Integration Tests');
    console.log('==================================================');
    
    const tests = [
      ['Basic Monitoring', () => this.testBasicMonitoring()],
      ['Activation Tracking', () => this.testActivationTracking()],
      ['Failure Tracking', () => this.testFailureTracking()],
      ['Health Checks', () => this.testHealthChecks()],
      ['Performance Monitoring', () => this.testPerformanceMonitoring()],
      ['Usage Analytics', () => this.testUsageAnalytics()],
      ['Reporting', () => this.testReporting()],
      ['Persistence', () => this.testPersistence()],
      ['Error Categorization', () => this.testErrorCategorization()]
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
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      for (const error of this.testResults.errors) {
        console.log(`  • ${error.test}: ${error.error}`);
      }
    }
    
    // Display monitoring statistics
    console.log('\n📈 Final Monitoring Statistics:');
    const stats = this.monitor.getActivationStatistics();
    console.log(`  Total Activations: ${stats.totalActivations}`);
    console.log(`  Success Rate: ${stats.successRate}%`);
    console.log(`  Total Errors: ${stats.totalErrors}`);
    
    const performanceStats = this.monitor.getPerformanceStatistics();
    console.log(`  Agents with Performance Data: ${Object.keys(performanceStats).length}`);
    
    const usageStats = this.monitor.getUsageAnalytics();
    console.log(`  Agents with Usage Data: ${Object.keys(usageStats).length}`);
    
    const healthResults = this.monitor.getHealthCheckResults();
    console.log(`  Agents with Health Data: ${Object.keys(healthResults).length}`);
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    try {
      if (this.monitor) {
        await this.monitor.stop();
      }
      
      // Remove test directory
      await fs.remove(this.testDir);
      console.log('✓ Test environment cleaned up');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }

  /**
   * Run the complete test suite
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
      console.log(success ? '\n🎉 All tests passed!' : '\n💥 Some tests failed!');
      
      return success;
    } catch (error) {
      console.error('Test execution failed:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const test = new ActivationMonitoringTest();
  test.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = ActivationMonitoringTest;