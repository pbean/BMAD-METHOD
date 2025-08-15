#!/usr/bin/env node

/**
 * Test Activation Error Handling
 * Comprehensive test for activation error handling and recovery mechanisms
 */

const ActivationErrorHandler = require('./activation-error-handler');
const ActivationManager = require('./activation-manager');
const KiroAgentRegistry = require('./kiro-agent-registry');
const fs = require('fs-extra');
const path = require('path');

class ActivationErrorHandlingTest {
  constructor() {
    this.testResults = [];
    this.testDir = path.join(__dirname, 'test-output', 'activation-error-handling');
  }

  async runAllTests() {
    console.log('🧪 Starting Activation Error Handling Tests...\n');

    try {
      await this.setupTestEnvironment();
      
      // Test error handler directly
      await this.testErrorHandlerBasics();
      await this.testErrorCategorization();
      await this.testRetryMechanism();
      await this.testFallbackActivation();
      await this.testManualOverrides();
      
      // Test integration with activation manager
      await this.testActivationManagerIntegration();
      await this.testEndToEndErrorRecovery();
      
      await this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      console.error(error.stack);
    }
  }

  async setupTestEnvironment() {
    console.log('📁 Setting up test environment...');
    
    await fs.ensureDir(this.testDir);
    await fs.ensureDir(path.join(this.testDir, '.kiro', 'logs'));
    await fs.ensureDir(path.join(this.testDir, '.kiro', 'steering'));
    await fs.ensureDir(path.join(this.testDir, '.kiro', 'agents'));
    
    console.log('✅ Test environment ready\n');
  }

  async testErrorHandlerBasics() {
    console.log('🔧 Testing Error Handler Basics...');
    
    const errorHandler = new ActivationErrorHandler({
      rootPath: this.testDir,
      logLevel: 'info',
      maxRetryAttempts: 2,
      retryDelay: 100
    });

    try {
      // Test basic error handling
      const error = new Error('Test activation error');
      const context = {
        agentId: 'test-agent',
        operation: 'activation',
        phase: 'initial'
      };

      const result = await errorHandler.handleActivationError(error, context);
      
      this.assert(result.errorId, 'Error ID should be generated');
      this.assert(result.category, 'Error should be categorized');
      this.assert(result.message, 'User-friendly message should be provided');
      this.assert(result.troubleshootingSteps || result.recovered, 'Troubleshooting steps should be provided or error should be recovered');
      
      console.log('✅ Basic error handling works');
      
      // Test error statistics
      const stats = errorHandler.getErrorStats();
      this.assert(stats.total === 1, 'Error count should be tracked');
      
      console.log('✅ Error statistics tracking works');
      
    } catch (error) {
      this.recordFailure('Error Handler Basics', error);
    }
  }

  async testErrorCategorization() {
    console.log('🏷️  Testing Error Categorization...');
    
    const errorHandler = new ActivationErrorHandler({
      rootPath: this.testDir,
      enableRetry: false,
      enableFallback: false
    });

    const testCases = [
      {
        error: new Error('Agent not found in registry: test-agent'),
        expectedCategory: 'agent-not-found',
        context: { agentId: 'test-agent' }
      },
      {
        error: new Error('Registration failed for agent'),
        expectedCategory: 'registration-failed',
        context: { agentId: 'test-agent', operation: 'registration' }
      },
      {
        error: new Error('Missing dependency: test-task.md'),
        expectedCategory: 'dependency-missing',
        context: { agentId: 'test-agent', operation: 'dependency-loading' }
      },
      {
        error: new Error('Maximum concurrent agents limit reached'),
        expectedCategory: 'resource-exhausted',
        context: { agentId: 'test-agent' }
      },
      {
        error: Object.assign(new Error('Permission denied'), { code: 'EACCES' }),
        expectedCategory: 'permission-denied',
        context: { agentId: 'test-agent' }
      }
    ];

    try {
      for (const testCase of testCases) {
        const result = await errorHandler.handleActivationError(testCase.error, testCase.context);
        
        this.assert(
          result.category === testCase.expectedCategory,
          `Error should be categorized as ${testCase.expectedCategory}, got ${result.category}`
        );
        
        console.log(`✅ Correctly categorized: ${testCase.expectedCategory}`);
      }
      
    } catch (error) {
      this.recordFailure('Error Categorization', error);
    }
  }

  async testRetryMechanism() {
    console.log('🔄 Testing Retry Mechanism...');
    
    const errorHandler = new ActivationErrorHandler({
      rootPath: this.testDir,
      enableRetry: true,
      enableFallback: false,
      maxRetryAttempts: 3,
      retryDelay: 50,
      exponentialBackoff: true
    });

    try {
      // Test retry with recoverable error
      const error = new Error('Temporary activation failure');
      const context = {
        agentId: 'retry-test-agent',
        operation: 'activation',
        phase: 'activation'
      };

      const result = await errorHandler.handleActivationError(error, context);
      
      this.assert(result.errorId, 'Error should be handled');
      
      // Check that retry attempts were made
      const errors = errorHandler.getActivationErrors();
      const ourError = errors.find(e => e.context.agentId === 'retry-test-agent');
      
      this.assert(ourError, 'Error should be tracked');
      this.assert(ourError.retryAttempts > 0, 'Retry attempts should be made');
      
      console.log(`✅ Retry mechanism executed ${ourError.retryAttempts} attempts`);
      
    } catch (error) {
      this.recordFailure('Retry Mechanism', error);
    }
  }

  async testFallbackActivation() {
    console.log('🔄 Testing Fallback Activation...');
    
    const errorHandler = new ActivationErrorHandler({
      rootPath: this.testDir,
      enableRetry: false,
      enableFallback: true,
      steeringFallbackEnabled: true
    });

    try {
      // Test fallback activation
      const error = new Error('Agent not found in registry: fallback-test-agent');
      const context = {
        agentId: 'fallback-test-agent',
        operation: 'activation',
        phase: 'registry-lookup'
      };

      const result = await errorHandler.handleActivationError(error, context);
      
      this.assert(result.errorId, 'Error should be handled');
      
      // Check if steering fallback file was created
      const steeringFile = path.join(this.testDir, '.kiro', 'steering', 'fallback-test-agent-fallback.md');
      const steeringExists = await fs.pathExists(steeringFile);
      
      if (steeringExists) {
        console.log('✅ Steering fallback file created');
        
        const steeringContent = await fs.readFile(steeringFile, 'utf8');
        this.assert(steeringContent.includes('fallback-test-agent'), 'Steering file should contain agent ID');
        this.assert(steeringContent.includes('Fallback Activation'), 'Steering file should indicate fallback mode');
        
        console.log('✅ Steering fallback content is correct');
      }
      
    } catch (error) {
      this.recordFailure('Fallback Activation', error);
    }
  }

  async testManualOverrides() {
    console.log('🛠️  Testing Manual Overrides...');
    
    const errorHandler = new ActivationErrorHandler({
      rootPath: this.testDir,
      enableRetry: false,
      enableFallback: false,
      manualOverrideEnabled: true
    });

    try {
      // Create an error that offers manual overrides
      const error = new Error('Agent not found in registry: override-test-agent');
      const context = {
        agentId: 'override-test-agent',
        operation: 'activation'
      };

      const result = await errorHandler.handleActivationError(error, context);
      
      this.assert(result.manualOverrideOptions, 'Manual override options should be provided');
      this.assert(result.manualOverrideOptions.length > 0, 'Should have at least one override option');
      
      console.log(`✅ ${result.manualOverrideOptions.length} manual override options provided`);
      
      // Test executing a manual override
      const forceRegisterOption = result.manualOverrideOptions.find(opt => opt.id === 'force-register');
      if (forceRegisterOption) {
        const overrideResult = await errorHandler.executeManualOverride(
          result.errorId,
          'force-register',
          { skipValidation: true }
        );
        
        this.assert(overrideResult.success, 'Manual override should succeed');
        console.log('✅ Manual override execution works');
      }
      
    } catch (error) {
      this.recordFailure('Manual Overrides', error);
    }
  }

  async testActivationManagerIntegration() {
    console.log('🔗 Testing Activation Manager Integration...');
    
    try {
      // Create mock registry
      const registry = new KiroAgentRegistry({
        rootPath: this.testDir,
        retryAttempts: 1
      });

      // Create activation manager with error handling
      const activationManager = new ActivationManager(registry, {
        rootPath: this.testDir,
        maxConcurrentAgents: 5,
        enableRetry: true,
        enableFallback: true,
        maxRetryAttempts: 2,
        retryDelay: 50
      });

      await activationManager.initialize();
      
      // Test activation of non-existent agent
      const result = await activationManager.activateAgent('non-existent-agent');
      
      // Should return error result instead of throwing
      this.assert(result.errorId || result.id, 'Should return result object');
      
      if (result.errorId) {
        this.assert(result.message, 'Should provide user-friendly error message');
        console.log('✅ Activation manager handles errors gracefully');
      } else if (result.activationMethod === 'steering-fallback') {
        console.log('✅ Activation manager used fallback successfully');
      }
      
      // Test error statistics
      const errorStats = activationManager.getActivationErrorStats();
      this.assert(typeof errorStats.total === 'number', 'Error statistics should be available');
      
      console.log('✅ Error statistics integration works');
      
      await activationManager.shutdown();
      
    } catch (error) {
      this.recordFailure('Activation Manager Integration', error);
    }
  }

  async testEndToEndErrorRecovery() {
    console.log('🎯 Testing End-to-End Error Recovery...');
    
    try {
      // Create a more realistic test scenario
      const registry = new KiroAgentRegistry({
        rootPath: this.testDir,
        retryAttempts: 1
      });

      const activationManager = new ActivationManager(registry, {
        rootPath: this.testDir,
        enableRetry: true,
        enableFallback: true,
        maxRetryAttempts: 2,
        retryDelay: 50,
        steeringFallbackEnabled: true
      });

      await activationManager.initialize();
      
      // Test multiple error scenarios
      const testAgents = [
        'missing-agent',
        'conflict-agent',
        'resource-heavy-agent'
      ];

      for (const agentId of testAgents) {
        console.log(`  Testing recovery for: ${agentId}`);
        
        const result = await activationManager.activateAgent(agentId);
        
        // Should handle each error appropriately
        if (result.errorId) {
          this.assert(result.message, `Should provide error message for ${agentId}`);
          this.assert(result.troubleshootingSteps, `Should provide troubleshooting for ${agentId}`);
        } else if (result.activationMethod === 'steering-fallback') {
          this.assert(result.steeringFile, `Should provide steering file for ${agentId}`);
        }
        
        console.log(`    ✅ ${agentId} handled appropriately`);
      }
      
      // Check overall error statistics
      const finalStats = activationManager.getActivationErrorStats();
      console.log(`✅ Processed ${finalStats.total} activation errors`);
      
      if (finalStats.fallbackUsed > 0) {
        console.log(`✅ Used fallback activation ${finalStats.fallbackUsed} times`);
      }
      
      await activationManager.shutdown();
      
    } catch (error) {
      this.recordFailure('End-to-End Error Recovery', error);
    }
  }

  async generateTestReport() {
    console.log('\n📊 Generating Test Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      testSuite: 'Activation Error Handling',
      totalTests: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'passed').length,
      failed: this.testResults.filter(r => r.status === 'failed').length,
      results: this.testResults
    };

    const reportPath = path.join(this.testDir, 'activation-error-handling-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Test report saved to: ${reportPath}`);
    console.log(`✅ Passed: ${report.passed}`);
    console.log(`❌ Failed: ${report.failed}`);
    
    if (report.failed > 0) {
      console.log('\n❌ Failed Tests:');
      report.results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  - ${r.test}: ${r.error}`));
    }
    
    console.log('\n🎉 Activation Error Handling Test Suite Complete!');
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  recordFailure(testName, error) {
    console.log(`❌ ${testName} failed: ${error.message}`);
    this.testResults.push({
      test: testName,
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  recordSuccess(testName) {
    this.testResults.push({
      test: testName,
      status: 'passed',
      timestamp: new Date().toISOString()
    });
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new ActivationErrorHandlingTest();
  test.runAllTests().catch(console.error);
}

module.exports = ActivationErrorHandlingTest;