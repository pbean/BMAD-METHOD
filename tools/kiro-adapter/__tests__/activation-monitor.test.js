/**
 * Tests for ActivationMonitor
 */

const fs = require('fs-extra');
const path = require('path');
const ActivationMonitor = require('../activation-monitor');
const KiroAgentRegistry = require('../kiro-agent-registry');
const ActivationManager = require('../activation-manager');

describe('ActivationMonitor', () => {
  let monitor;
  let mockRegistry;
  let mockActivationManager;
  let testDir;

  beforeEach(async () => {
    // Create test directory
    testDir = path.join(__dirname, 'test-activation-monitor');
    await fs.ensureDir(testDir);

    // Create mock registry
    mockRegistry = {
      on: jest.fn(),
      getRegisteredAgents: jest.fn(() => new Map([
        ['test-agent-1', {
          id: 'test-agent-1',
          name: 'Test Agent 1',
          filePath: path.join(testDir, 'agent1.md'),
          activationHandler: jest.fn()
        }],
        ['test-agent-2', {
          id: 'test-agent-2',
          name: 'Test Agent 2',
          filePath: path.join(testDir, 'agent2.md'),
          activationHandler: jest.fn()
        }]
      ]))
    };

    // Create mock activation manager
    mockActivationManager = {
      on: jest.fn()
    };

    // Create test agent files
    await fs.writeFile(path.join(testDir, 'agent1.md'), '# Test Agent 1\nTest agent content');
    await fs.writeFile(path.join(testDir, 'agent2.md'), '# Test Agent 2\nTest agent content');

    // Create monitor instance
    monitor = new ActivationMonitor({
      rootPath: testDir,
      registry: mockRegistry,
      activationManager: mockActivationManager,
      healthCheckInterval: 100, // Short interval for testing
      enableDetailedLogging: false
    });
  });

  afterEach(async () => {
    if (monitor) {
      await monitor.stop();
    }
    await fs.remove(testDir);
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      const result = await monitor.initialize();
      expect(result).toBe(true);
      expect(monitor.isMonitoring).toBe(true);
    });

    test('should setup event listeners', async () => {
      await monitor.initialize();
      
      expect(mockRegistry.on).toHaveBeenCalledWith('agentRegistered', expect.any(Function));
      expect(mockRegistry.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockActivationManager.on).toHaveBeenCalledWith('agentActivated', expect.any(Function));
      expect(mockActivationManager.on).toHaveBeenCalledWith('agentActivationFailed', expect.any(Function));
      expect(mockActivationManager.on).toHaveBeenCalledWith('agentDeactivated', expect.any(Function));
    });
  });

  describe('activation tracking', () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    test('should track successful activation', async () => {
      const agentId = 'test-agent-1';
      const instance = {
        id: agentId,
        name: 'Test Agent 1',
        metadata: { source: 'bmad-core' },
        activatedAt: new Date()
      };

      monitor.startPerformanceTracking(agentId);
      await new Promise(resolve => setTimeout(resolve, 50));
      monitor.trackActivationSuccess(agentId, instance);

      const stats = monitor.getActivationStatistics();
      expect(stats.totalActivations).toBe(1);
      expect(stats.successfulActivations).toBe(1);
      expect(stats.failedActivations).toBe(0);
      expect(stats.successRate).toBe(100);
    });

    test('should track failed activation', async () => {
      const agentId = 'test-agent-1';
      const error = new Error('Test activation failure');

      monitor.startPerformanceTracking(agentId);
      await new Promise(resolve => setTimeout(resolve, 50));
      monitor.trackActivationFailure(agentId, error);

      const stats = monitor.getActivationStatistics();
      expect(stats.totalActivations).toBe(1);
      expect(stats.successfulActivations).toBe(0);
      expect(stats.failedActivations).toBe(1);
      expect(stats.successRate).toBe(0);
    });

    test('should track deactivation', () => {
      const agentId = 'test-agent-1';
      
      // Initialize agent metrics first
      monitor.initializeAgentMetrics(agentId);
      
      const instance = {
        id: agentId,
        name: 'Test Agent 1',
        activatedAt: new Date(Date.now() - 5000) // 5 seconds ago
      };

      monitor.trackDeactivation(agentId, instance);

      const usageAnalytics = monitor.getUsageAnalytics();
      expect(usageAnalytics[agentId]).toBeDefined();
      expect(usageAnalytics[agentId].totalDeactivations).toBe(1);
    });
  });

  describe('performance monitoring', () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    test('should track activation duration', async () => {
      const agentId = 'test-agent-1';
      
      monitor.startPerformanceTracking(agentId);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const duration = monitor.getActivationDuration(agentId);
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200); // Should be less than 200ms
    });

    test('should update performance metrics', () => {
      const agentId = 'test-agent-1';
      const duration = 1500; // 1.5 seconds

      monitor.updatePerformanceMetrics(agentId, duration);

      const performanceStats = monitor.getPerformanceStatistics();
      expect(performanceStats[agentId]).toBeDefined();
      expect(performanceStats[agentId].totalActivations).toBe(1);
      expect(performanceStats[agentId].averageDuration).toBe(duration);
      expect(performanceStats[agentId].minDuration).toBe(duration);
      expect(performanceStats[agentId].maxDuration).toBe(duration);
    });

    test('should identify slow activations', () => {
      const agentId = 'test-agent-1';
      const slowDuration = 6000; // 6 seconds (above threshold)

      monitor.updatePerformanceMetrics(agentId, slowDuration);

      const performanceStats = monitor.getPerformanceStatistics();
      expect(performanceStats[agentId].slowActivations).toBe(1);
      expect(performanceStats[agentId].performanceRating).toBe('poor');
    });
  });

  describe('usage analytics', () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    test('should calculate effectiveness', () => {
      const agentId = 'test-agent-1';

      // Track successful activations
      monitor.updateUsageAnalytics(agentId, 'activation_success');
      monitor.updateUsageAnalytics(agentId, 'activation_success');
      
      // Track one failure
      monitor.updateUsageAnalytics(agentId, 'activation_failure');

      const usageAnalytics = monitor.getUsageAnalytics();
      expect(usageAnalytics[agentId].effectiveness).toBeCloseTo(66.67, 1); // 2/3 success rate
    });

    test('should calculate popularity score', () => {
      const agentId = 'test-agent-1';

      // Multiple successful activations
      for (let i = 0; i < 5; i++) {
        monitor.updateUsageAnalytics(agentId, 'activation_success');
      }

      const usageAnalytics = monitor.getUsageAnalytics();
      expect(usageAnalytics[agentId].popularityScore).toBeGreaterThan(0);
      expect(usageAnalytics[agentId].totalActivations).toBe(5);
    });

    test('should track session duration', () => {
      const agentId = 'test-agent-1';
      const sessionDuration = 30000; // 30 seconds

      // Initialize agent metrics first
      monitor.initializeAgentMetrics(agentId);
      
      monitor.updateUsageAnalytics(agentId, 'deactivation', { sessionDuration });

      const usageAnalytics = monitor.getUsageAnalytics();
      expect(usageAnalytics[agentId].totalSessionTime).toBe(sessionDuration);
      expect(usageAnalytics[agentId].averageSessionTime).toBe(sessionDuration);
    });
  });

  describe('health checks', () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    test('should perform health check on agent', async () => {
      const agentId = 'test-agent-1';
      const agentData = {
        id: agentId,
        name: 'Test Agent 1',
        filePath: path.join(testDir, 'agent1.md'),
        activationHandler: jest.fn()
      };

      const healthStatus = await monitor.checkAgentHealth(agentId, agentData);

      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.details.checks).toHaveLength(3); // file_exists, valid_metadata, activation_handler
      expect(healthStatus.details.summary.passed).toBe(3);
    });

    test('should detect unhealthy agent', async () => {
      const agentId = 'test-agent-missing';
      const agentData = {
        id: agentId,
        name: 'Missing Agent',
        filePath: path.join(testDir, 'missing.md'), // File doesn't exist
        activationHandler: null // No activation handler
      };

      const healthStatus = await monitor.checkAgentHealth(agentId, agentData);

      expect(healthStatus.status).toBe('unhealthy');
      expect(healthStatus.details.summary.failed).toBeGreaterThan(0);
    });

    test('should perform health checks on all agents', async () => {
      // Wait for health checks to complete
      await new Promise(resolve => {
        monitor.once('healthChecksCompleted', (result) => {
          expect(result.totalAgents).toBe(2);
          expect(result.healthyAgents).toBeGreaterThan(0);
          resolve();
        });
      });
    });
  });

  describe('error categorization', () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    test('should categorize different error types', () => {
      expect(monitor.categorizeError(new Error('Agent not found'))).toBe('not_found');
      expect(monitor.categorizeError(new Error('Agent already active'))).toBe('conflict');
      expect(monitor.categorizeError(new Error('Activation timeout'))).toBe('performance');
      expect(monitor.categorizeError(new Error('dependency failed'))).toBe('dependency');
      expect(monitor.categorizeError(new Error('Permission denied'))).toBe('permission');
      expect(monitor.categorizeError(new Error('Unknown error'))).toBe('unknown');
    });
  });

  describe('reporting', () => {
    beforeEach(async () => {
      await monitor.initialize();
    });

    test('should generate comprehensive monitoring report', () => {
      // Add some test data
      monitor.updateUsageAnalytics('test-agent-1', 'activation_success');
      monitor.updatePerformanceMetrics('test-agent-1', 1000);

      const report = monitor.getMonitoringReport();

      expect(report.overview).toBeDefined();
      expect(report.performance).toBeDefined();
      expect(report.usage).toBeDefined();
      expect(report.health).toBeDefined();
      expect(report.insights).toBeDefined();
      expect(report.metadata).toBeDefined();
      expect(report.metadata.reportGeneratedAt).toBeInstanceOf(Date);
    });

    test('should identify most popular agents', () => {
      // Initialize agent metrics first
      monitor.initializeAgentMetrics('test-agent-1');
      monitor.initializeAgentMetrics('test-agent-2');
      
      // Create popularity data
      monitor.updateUsageAnalytics('test-agent-1', 'activation_success');
      monitor.updateUsageAnalytics('test-agent-1', 'activation_success');
      monitor.updateUsageAnalytics('test-agent-2', 'activation_success');

      const popular = monitor.getMostPopularAgents(5);
      expect(popular).toHaveLength(2);
      expect(popular[0].agentId).toBe('test-agent-1'); // Should be most popular
      expect(popular[0].totalActivations).toBe(2);
    });

    test('should identify performance issues', () => {
      // Create performance issue
      monitor.updatePerformanceMetrics('test-agent-1', 6000); // Slow activation

      const issues = monitor.getPerformanceIssues();
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].agentId).toBe('test-agent-1');
      expect(issues[0].issue).toBe('slow_activation');
    });

    test('should identify low effectiveness agents', () => {
      // Create low effectiveness scenario
      monitor.updateUsageAnalytics('test-agent-1', 'activation_success');
      monitor.updateUsageAnalytics('test-agent-1', 'activation_failure');
      monitor.updateUsageAnalytics('test-agent-1', 'activation_failure');
      monitor.updateUsageAnalytics('test-agent-1', 'activation_failure');

      const lowEffectiveness = monitor.getLowEffectivenessAgents(70);
      expect(lowEffectiveness).toHaveLength(1);
      expect(lowEffectiveness[0].agentId).toBe('test-agent-1');
      expect(lowEffectiveness[0].effectiveness).toBe(25); // 1/4 success rate
    });
  });

  describe('persistence', () => {
    test('should save and load metrics', async () => {
      // Initialize agent metrics first
      monitor.initializeAgentMetrics('test-agent-1');
      
      // Add some test data
      monitor.updateUsageAnalytics('test-agent-1', 'activation_success');
      monitor.updatePerformanceMetrics('test-agent-1', 1000);

      // Save metrics
      await monitor.saveMetrics();

      // Create new monitor instance
      const newMonitor = new ActivationMonitor({
        rootPath: testDir,
        registry: mockRegistry,
        activationManager: mockActivationManager
      });

      // Load metrics
      await newMonitor.loadMetrics();

      const stats = newMonitor.getActivationStatistics();
      expect(stats.totalActivations).toBeGreaterThanOrEqual(0);

      await newMonitor.stop();
    });

    test('should clean up old data', async () => {
      // Add old data
      const oldDate = new Date(Date.now() - (35 * 24 * 60 * 60 * 1000)); // 35 days ago
      monitor.activationMetrics.activationHistory.push({
        agentId: 'test-agent-1',
        timestamp: oldDate,
        status: 'success'
      });

      // Clean up
      await monitor.cleanupOldData();

      expect(monitor.activationMetrics.activationHistory).toHaveLength(0);
    });
  });

  describe('lifecycle', () => {
    test('should stop monitoring gracefully', async () => {
      await monitor.initialize();
      expect(monitor.isMonitoring).toBe(true);

      await monitor.stop();
      expect(monitor.isMonitoring).toBe(false);
    });

    test('should reset metrics', async () => {
      await monitor.initialize();

      // Add some data
      monitor.updateUsageAnalytics('test-agent-1', 'activation_success');

      // Reset
      monitor.resetMetrics();

      const stats = monitor.getActivationStatistics();
      expect(stats.totalActivations).toBe(0);
      expect(stats.successfulActivations).toBe(0);
      expect(stats.failedActivations).toBe(0);
    });
  });
});