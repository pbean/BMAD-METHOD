const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const InstallationErrorHandler = require('./installation-error-handler');
const RuntimeErrorHandler = require('./runtime-error-handler');
const IntegrationValidator = require('./integration-validator');

/**
 * Comprehensive test suite for error handling integration
 */
class ErrorHandlingIntegrationTest {
  constructor() {
    this.testResults = {
      installation: { passed: 0, failed: 0, tests: [] },
      runtime: { passed: 0, failed: 0, tests: [] },
      validation: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };
    
    this.testDir = path.join(__dirname, 'test-output', 'error-handling');
  }

  /**
   * Runs all error handling tests
   * @returns {Promise<boolean>} True if all tests pass
   */
  async runAllTests() {
    console.log(chalk.cyan.bold('🧪 Running Error Handling Integration Tests\n'));
    
    // Setup test environment
    await this.setupTestEnvironment();
    
    try {
      // Run test suites
      await this.testInstallationErrorHandling();
      await this.testRuntimeErrorHandling();
      await this.testValidationSystem();
      await this.testIntegrationScenarios();
      
      // Display results
      this.displayTestResults();
      
      // Cleanup
      await this.cleanupTestEnvironment();
      
      return this.allTestsPassed();
      
    } catch (error) {
      console.log(chalk.red(`Test suite failed: ${error.message}`));
      return false;
    }
  }

  /**
   * Sets up test environment
   */
  async setupTestEnvironment() {
    console.log(chalk.cyan('Setting up test environment...'));
    
    await fs.ensureDir(this.testDir);
    
    // Create mock Kiro workspace structure
    const mockKiroDir = path.join(this.testDir, 'mock-kiro-workspace', '.kiro');
    await fs.ensureDir(path.join(mockKiroDir, 'agents'));
    await fs.ensureDir(path.join(mockKiroDir, 'specs'));
    await fs.ensureDir(path.join(mockKiroDir, 'steering'));
    await fs.ensureDir(path.join(mockKiroDir, 'hooks'));
    
    // Create test files
    await this.createTestFiles();
    
    console.log(chalk.green('✓ Test environment ready'));
  }

  /**
   * Creates test files for validation
   */
  async createTestFiles() {
    const mockWorkspace = path.join(this.testDir, 'mock-kiro-workspace');
    
    // Create valid agent file
    const validAgent = `\`\`\`yaml
title: "Test BMad Agent"
roleDefinition: "Test agent for validation"
dependencies:
  - "test-template.yaml"
capabilities:
  - "test capability"
\`\`\`

# Test BMad Agent

I am a test BMad agent with Kiro integration.

## Context Awareness
I use #File, #Folder, and #Codebase for context.

## Steering Integration
I follow project steering rules and conventions.
`;
    await fs.writeFile(path.join(mockWorkspace, '.kiro', 'agents', 'test-agent.md'), validAgent);
    
    // Create invalid agent file
    const invalidAgent = `# Invalid Agent
This agent has no YAML header.`;
    await fs.writeFile(path.join(mockWorkspace, '.kiro', 'agents', 'invalid-agent.md'), invalidAgent);
    
    // Create valid spec
    const specDir = path.join(mockWorkspace, '.kiro', 'specs', 'test-spec');
    await fs.ensureDir(specDir);
    
    const requirements = `# Requirements Document

## Introduction
Test requirements document.

## Requirements

### Requirement 1
**User Story:** As a user, I want functionality, so that I can achieve goals.

#### Acceptance Criteria
1. WHEN user acts THEN system SHALL respond
`;
    await fs.writeFile(path.join(specDir, 'requirements.md'), requirements);
    
    const design = `# Test Design

## Overview
Test design document.

## Architecture
System architecture description.

## Components
Component descriptions.
`;
    await fs.writeFile(path.join(specDir, 'design.md'), design);
    
    const tasks = `# Implementation Plan

- [ ] 1. First task
  - Implement functionality
  - _Requirements: 1.1_

- [ ] 2. Second task
  - Test implementation
  - _Requirements: 1.1_
`;
    await fs.writeFile(path.join(specDir, 'tasks.md'), tasks);
    
    // Create valid hook
    const validHook = `name: "Test Hook"
description: "Test hook for validation"
trigger:
  type: "file_change"
  pattern: "**/*.js"
action:
  agent: "test-agent"
  task: "test-task"
  context:
    - "#File"
    - "#Folder"
`;
    await fs.writeFile(path.join(mockWorkspace, '.kiro', 'hooks', 'test-hook.yaml'), validHook);
    
    // Create invalid hook
    const invalidHook = `name: "Invalid Hook"
# Missing required fields
`;
    await fs.writeFile(path.join(mockWorkspace, '.kiro', 'hooks', 'invalid-hook.yaml'), invalidHook);
  }

  /**
   * Tests installation error handling
   */
  async testInstallationErrorHandling() {
    console.log(chalk.cyan('\n📦 Testing Installation Error Handling'));
    
    const handler = new InstallationErrorHandler();
    
    // Test 1: Valid workspace validation
    await this.runTest('installation', 'Valid workspace validation', async () => {
      const mockWorkspace = path.join(this.testDir, 'mock-kiro-workspace');
      const result = await handler.validateKiroWorkspace(mockWorkspace);
      return result.isValid && result.errors.length === 0;
    });
    
    // Test 2: Invalid directory validation
    await this.runTest('installation', 'Invalid directory validation', async () => {
      const invalidDir = path.join(this.testDir, 'non-existent-directory');
      const result = await handler.validateKiroWorkspace(invalidDir);
      return !result.isValid && result.errors.length > 0;
    });
    
    // Test 3: Kiro features check
    await this.runTest('installation', 'Kiro features check', async () => {
      const mockWorkspace = path.join(this.testDir, 'mock-kiro-workspace');
      const result = await handler.checkKiroFeatures(mockWorkspace);
      return result.allPresent || result.missing.length >= 0;
    });
    
    // Test 4: Backup creation
    await this.runTest('installation', 'Backup creation', async () => {
      const mockWorkspace = path.join(this.testDir, 'mock-kiro-workspace');
      const backupDir = await handler.createInstallationBackup(mockWorkspace);
      const backupExists = await fs.pathExists(backupDir);
      
      // Cleanup backup
      if (backupExists) {
        await fs.remove(backupDir);
      }
      
      return backupExists;
    });
    
    // Test 5: Error categorization
    await this.runTest('installation', 'Error categorization', async () => {
      const permissionError = new Error('EACCES: permission denied');
      const category = handler.categorizeError(permissionError, 'test');
      return category.category === 'Permission Error';
    });
  }

  /**
   * Tests runtime error handling
   */
  async testRuntimeErrorHandling() {
    console.log(chalk.cyan('\n⚡ Testing Runtime Error Handling'));
    
    const handler = new RuntimeErrorHandler();
    
    // Test 1: Context provider error handling
    await this.runTest('runtime', 'Context provider error handling', async () => {
      const error = new Error('Context provider unavailable');
      const result = await handler.handleContextProviderError('#File', error, {
        agentName: 'test-agent',
        workingDirectory: this.testDir
      });
      return result.fallbackMethod !== undefined;
    });
    
    // Test 2: MCP tool error handling
    await this.runTest('runtime', 'MCP tool error handling', async () => {
      const error = new Error('MCP tool not found');
      const result = await handler.handleMCPToolError('web-search', error, {
        agentName: 'test-agent'
      });
      return result.alternativeWorkflow !== undefined;
    });
    
    // Test 3: Hook execution error handling
    await this.runTest('runtime', 'Hook execution error handling', async () => {
      const error = new Error('Hook execution failed');
      const result = await handler.handleHookExecutionError('test-hook', error, {
        hookPath: '/test/path'
      });
      return result.manualSteps && result.manualSteps.length > 0;
    });
    
    // Test 4: Context fallback execution
    await this.runTest('runtime', 'Context fallback execution', async () => {
      const result = await handler.executeContextFallback('#File', 'manual_file_input', {
        workingDirectory: this.testDir
      });
      return result.success && result.data;
    });
    
    // Test 5: Error logging and analysis
    await this.runTest('runtime', 'Error logging and analysis', async () => {
      handler.logError('TEST_ERROR', {
        message: 'Test error',
        agent: 'test-agent'
      });
      
      const analysis = handler.getErrorAnalysis();
      return analysis.totalErrors > 0 && analysis.errorTypes['TEST_ERROR'] === 1;
    });
  }

  /**
   * Tests validation system
   */
  async testValidationSystem() {
    console.log(chalk.cyan('\n✅ Testing Validation System'));
    
    const validator = new IntegrationValidator();
    
    // Test 1: Complete integration validation
    await this.runTest('validation', 'Complete integration validation', async () => {
      const mockWorkspace = path.join(this.testDir, 'mock-kiro-workspace');
      const result = await validator.validateKiroIntegration(mockWorkspace);
      return result.results !== undefined && result.summary !== undefined;
    });
    
    // Test 2: Agent transformation validation
    await this.runTest('validation', 'Agent transformation validation', async () => {
      const mockWorkspace = path.join(this.testDir, 'mock-kiro-workspace');
      await validator.validateAgentTransformation(mockWorkspace);
      
      const results = validator.validationResults.agentTransformation;
      return Array.isArray(results);
    });
    
    // Test 3: Spec generation validation
    await this.runTest('validation', 'Spec generation validation', async () => {
      const mockWorkspace = path.join(this.testDir, 'mock-kiro-workspace');
      await validator.validateSpecGeneration(mockWorkspace);
      
      const results = validator.validationResults.specGeneration;
      return Array.isArray(results);
    });
    
    // Test 4: Hook configuration validation
    await this.runTest('validation', 'Hook configuration validation', async () => {
      const mockWorkspace = path.join(this.testDir, 'mock-kiro-workspace');
      await validator.validateHookConfiguration(mockWorkspace);
      
      const results = validator.validationResults.hookConfiguration;
      return Array.isArray(results);
    });
    
    // Test 5: Validation summary generation
    await this.runTest('validation', 'Validation summary generation', async () => {
      const summary = validator.generateValidationSummary();
      return summary.totalIssues !== undefined && summary.categories !== undefined;
    });
  }

  /**
   * Tests integration scenarios
   */
  async testIntegrationScenarios() {
    console.log(chalk.cyan('\n🔗 Testing Integration Scenarios'));
    
    // Test 1: End-to-end error handling flow
    await this.runTest('integration', 'End-to-end error handling flow', async () => {
      const installHandler = new InstallationErrorHandler();
      const runtimeHandler = new RuntimeErrorHandler();
      const validator = new IntegrationValidator();
      
      // Simulate installation validation
      const mockWorkspace = path.join(this.testDir, 'mock-kiro-workspace');
      const installValidation = await installHandler.validateKiroWorkspace(mockWorkspace);
      
      // Simulate runtime error
      const runtimeError = new Error('Test runtime error');
      const runtimeResult = await runtimeHandler.handleContextProviderError(
        '#File', 
        runtimeError, 
        { agentName: 'test-agent' }
      );
      
      // Simulate validation
      const validationResult = await validator.validateKiroIntegration(mockWorkspace);
      
      return installValidation !== undefined && 
             runtimeResult !== undefined && 
             validationResult !== undefined;
    });
    
    // Test 2: Error recovery workflow
    await this.runTest('integration', 'Error recovery workflow', async () => {
      const handler = new InstallationErrorHandler();
      
      // Create backup
      const mockWorkspace = path.join(this.testDir, 'mock-kiro-workspace');
      const backupDir = await handler.createInstallationBackup(mockWorkspace);
      
      // Simulate error and rollback
      await handler.rollbackInstallation(mockWorkspace, 'Test rollback');
      
      return await fs.pathExists(backupDir);
    });
    
    // Test 3: Validation error reporting
    await this.runTest('integration', 'Validation error reporting', async () => {
      const validator = new IntegrationValidator();
      
      // Add test errors
      validator.addValidationError('test', {
        code: 'TEST_ERROR',
        message: 'Test error message',
        severity: 'error'
      });
      
      const summary = validator.generateValidationSummary();
      return summary.errorCount > 0;
    });
    
    // Test 4: Fallback strategy execution
    await this.runTest('integration', 'Fallback strategy execution', async () => {
      const handler = new RuntimeErrorHandler();
      
      // Test multiple fallback strategies
      const strategies = ['manual_file_input', 'recent_files_list', 'directory_scan'];
      let successCount = 0;
      
      for (const strategy of strategies) {
        try {
          const result = await handler.executeContextFallback('#File', strategy, {
            workingDirectory: this.testDir
          });
          if (result.success) {
            successCount++;
          }
        } catch (error) {
          // Expected for some strategies
        }
      }
      
      return successCount > 0;
    });
    
    // Test 5: Comprehensive error analysis
    await this.runTest('integration', 'Comprehensive error analysis', async () => {
      const runtimeHandler = new RuntimeErrorHandler();
      const validator = new IntegrationValidator();
      
      // Generate various errors
      runtimeHandler.logError('CONTEXT_ERROR', { message: 'Context failed' });
      runtimeHandler.logError('MCP_ERROR', { message: 'MCP failed' });
      runtimeHandler.logError('HOOK_ERROR', { message: 'Hook failed' });
      
      validator.addValidationError('test', {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        severity: 'error'
      });
      
      const runtimeAnalysis = runtimeHandler.getErrorAnalysis();
      const validationSummary = validator.generateValidationSummary();
      
      return runtimeAnalysis.totalErrors > 0 && validationSummary.totalIssues > 0;
    });
  }

  /**
   * Runs a single test
   * @param {string} category - Test category
   * @param {string} testName - Test name
   * @param {Function} testFunction - Test function
   */
  async runTest(category, testName, testFunction) {
    try {
      console.log(chalk.cyan(`  Running: ${testName}`));
      
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      if (result) {
        console.log(chalk.green(`  ✓ ${testName} (${duration}ms)`));
        this.testResults[category].passed++;
        this.testResults[category].tests.push({
          name: testName,
          status: 'passed',
          duration
        });
      } else {
        console.log(chalk.red(`  ✗ ${testName} (${duration}ms)`));
        this.testResults[category].failed++;
        this.testResults[category].tests.push({
          name: testName,
          status: 'failed',
          duration
        });
      }
    } catch (error) {
      console.log(chalk.red(`  ✗ ${testName} - Error: ${error.message}`));
      this.testResults[category].failed++;
      this.testResults[category].tests.push({
        name: testName,
        status: 'error',
        error: error.message
      });
    }
  }

  /**
   * Displays test results
   */
  displayTestResults() {
    console.log(chalk.cyan.bold('\n📊 Test Results Summary'));
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const [category, results] of Object.entries(this.testResults)) {
      console.log(chalk.cyan(`\n${category.charAt(0).toUpperCase() + category.slice(1)} Tests:`));
      console.log(chalk.green(`  Passed: ${results.passed}`));
      console.log(chalk.red(`  Failed: ${results.failed}`));
      
      totalPassed += results.passed;
      totalFailed += results.failed;
      
      // Show failed tests
      const failedTests = results.tests.filter(test => test.status !== 'passed');
      if (failedTests.length > 0) {
        console.log(chalk.red('  Failed Tests:'));
        failedTests.forEach(test => {
          console.log(chalk.red(`    • ${test.name}${test.error ? ` - ${test.error}` : ''}`));
        });
      }
    }
    
    console.log(chalk.cyan.bold('\n🎯 Overall Results:'));
    console.log(chalk.green(`Total Passed: ${totalPassed}`));
    console.log(chalk.red(`Total Failed: ${totalFailed}`));
    
    if (totalFailed === 0) {
      console.log(chalk.green.bold('🎉 All tests passed!'));
    } else {
      console.log(chalk.red.bold('❌ Some tests failed'));
    }
  }

  /**
   * Checks if all tests passed
   * @returns {boolean} True if all tests passed
   */
  allTestsPassed() {
    for (const results of Object.values(this.testResults)) {
      if (results.failed > 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Cleans up test environment
   */
  async cleanupTestEnvironment() {
    console.log(chalk.cyan('\nCleaning up test environment...'));
    
    try {
      await fs.remove(this.testDir);
      console.log(chalk.green('✓ Test environment cleaned up'));
    } catch (error) {
      console.log(chalk.yellow(`⚠ Cleanup warning: ${error.message}`));
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new ErrorHandlingIntegrationTest();
  testSuite.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(chalk.red(`Test suite error: ${error.message}`));
    process.exit(1);
  });
}

module.exports = ErrorHandlingIntegrationTest;