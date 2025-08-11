#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Minimal test runner with concise output
class MinimalTestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  runTest(testFile) {
    try {
      console.log(`Testing: ${path.basename(testFile)}`);
      
      // Run jest with minimal output
      const result = execSync(
        `npx jest "${testFile}" --silent --noStackTrace --reporters=default`,
        { 
          cwd: path.dirname(__dirname),
          encoding: 'utf8',
          timeout: 30000
        }
      );
      
      // Parse minimal result
      if (result.includes('PASS')) {
        this.results.passed++;
        console.log('✓ PASS');
      } else {
        this.results.failed++;
        console.log('✗ FAIL');
      }
      
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({
        test: path.basename(testFile),
        error: error.message.split('\n')[0] // Only first line
      });
      console.log('✗ ERROR');
    }
  }

  runPerformanceTests() {
    console.log('\n=== Performance Tests ===');
    
    const performanceTests = [
      'tools/kiro-adapter/__tests__/performance/agent-transformation.test.js',
      'tools/kiro-adapter/__tests__/performance/hook-execution.test.js',
      'tools/kiro-adapter/__tests__/performance/context-loading.test.js'
    ];

    performanceTests.forEach(test => this.runTest(test));
  }

  runIntegrationTests() {
    console.log('\n=== Integration Tests ===');
    
    const integrationTests = [
      'tools/kiro-adapter/__tests__/integration/agent-collaboration.test.js',
      'tools/kiro-adapter/__tests__/integration/hook-automation.test.js',
      'tools/kiro-adapter/__tests__/integration/bmad-planning-workflow.test.js'
    ];

    integrationTests.forEach(test => this.runTest(test));
  }

  printSummary() {
    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    
    if (this.results.errors.length > 0) {
      console.log('\nErrors:');
      this.results.errors.forEach(err => {
        console.log(`- ${err.test}: ${err.error}`);
      });
    }
  }
}

// Run tests
const runner = new MinimalTestRunner();

if (process.argv.includes('--performance')) {
  runner.runPerformanceTests();
} else if (process.argv.includes('--integration')) {
  runner.runIntegrationTests();
} else {
  runner.runPerformanceTests();
  runner.runIntegrationTests();
}

runner.printSummary();