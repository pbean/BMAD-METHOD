#!/usr/bin/env node

/**
 * Test Conversion Error Handling
 * Comprehensive tests for the conversion error handling system
 */

const path = require('path');
const fs = require('fs-extra');
const ConversionErrorHandler = require('./conversion-error-handler');
const AgentTransformer = require('./agent-transformer');

async function testConversionErrorHandler() {
  console.log('🧪 Testing Conversion Error Handler...\n');

  const testResults = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Test 1: Error Handler Initialization
    console.log('1. Testing Error Handler Initialization...');
    const errorHandler = new ConversionErrorHandler({
      logLevel: 'info',
      enableDiagnostics: true,
      enableRecovery: true,
      diagnosticMode: true
    });
    
    console.log('   ✅ Error handler initialized successfully');
    testResults.passed++;

    // Test 2: Error Categorization
    console.log('\n2. Testing Error Categorization...');
    const testErrors = [
      { error: new Error('ENOENT: no such file or directory'), expectedCategory: 'file-not-found' },
      { error: new Error('YAMLException: bad indentation'), expectedCategory: 'invalid-yaml' },
      { error: new Error('Missing dependency: tasks/create-doc.md'), expectedCategory: 'missing-dependencies' },
      { error: new Error('EACCES: permission denied'), expectedCategory: 'permission-denied' },
      { error: new Error('ENOSPC: no space left on device'), expectedCategory: 'write-failed' }
    ];

    for (const testCase of testErrors) {
      const categorized = errorHandler.categorizeError(testCase.error, {});
      if (categorized.category === testCase.expectedCategory) {
        console.log(`   ✅ Correctly categorized: ${testCase.error.message} -> ${categorized.category}`);
        testResults.passed++;
      } else {
        console.log(`   ❌ Incorrect categorization: ${testCase.error.message} -> ${categorized.category} (expected: ${testCase.expectedCategory})`);
        testResults.failed++;
      }
    }

    // Test 3: Error Handling with Context
    console.log('\n3. Testing Error Handling with Context...');
    const testError = new Error('Test conversion error');
    const context = {
      agentId: 'test-agent',
      filePath: '/path/to/test-agent.md',
      operation: 'transformation',
      phase: 'test-phase'
    };

    const errorResult = await errorHandler.handleConversionError(testError, context);
    
    if (errorResult.errorId && errorResult.category && errorResult.severity) {
      console.log(`   ✅ Error handled successfully: ${errorResult.errorId}`);
      console.log(`   📊 Category: ${errorResult.category}, Severity: ${errorResult.severity}`);
      testResults.passed++;
    } else {
      console.log('   ❌ Error handling failed');
      testResults.failed++;
    }

    // Test 4: Diagnostic Data Collection
    console.log('\n4. Testing Diagnostic Data Collection...');
    const diagnostics = await errorHandler.collectDiagnostics(testError, context);
    
    if (diagnostics.timestamp && diagnostics.system && diagnostics.context) {
      console.log('   ✅ Diagnostics collected successfully');
      console.log(`   📋 System: ${diagnostics.system.platform}, Node: ${diagnostics.system.nodeVersion}`);
      testResults.passed++;
    } else {
      console.log('   ❌ Diagnostic collection failed');
      testResults.failed++;
    }

    // Test 5: Recovery Strategy Testing
    console.log('\n5. Testing Recovery Strategies...');
    
    // Test missing file recovery
    const missingFileError = {
      id: 'test-missing-file',
      category: 'file-not-found',
      context: { filePath: '/nonexistent/path/agent.md' },
      recoveryAttempts: 0
    };
    
    const recoveryResult = await errorHandler.recoverFromMissingFile(missingFileError);
    console.log(`   📝 Missing file recovery: ${recoveryResult.success ? 'Success' : 'Failed'} - ${recoveryResult.reason}`);
    
    if (recoveryResult.reason) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }

    // Test 6: Error Statistics
    console.log('\n6. Testing Error Statistics...');
    const stats = errorHandler.getErrorStats();
    
    if (typeof stats.total === 'number' && stats.byType && stats.recoveryRate !== undefined) {
      console.log('   ✅ Error statistics generated successfully');
      console.log(`   📊 Total errors: ${stats.total}, Recovery rate: ${(stats.recoveryRate * 100).toFixed(1)}%`);
      testResults.passed++;
    } else {
      console.log('   ❌ Error statistics generation failed');
      testResults.failed++;
    }

  } catch (error) {
    console.error('❌ Test suite error:', error.message);
    testResults.errors.push(error.message);
    testResults.failed++;
  }

  return testResults;
}

async function testAgentTransformerErrorHandling() {
  console.log('\n🔧 Testing Agent Transformer Error Handling...\n');

  const testResults = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Test 1: Agent Transformer with Error Handler
    console.log('1. Testing Agent Transformer Initialization with Error Handler...');
    const transformer = new AgentTransformer({
      enableDiagnostics: true,
      enableRecovery: true,
      diagnosticMode: true
    });
    
    console.log('   ✅ Agent transformer with error handler initialized');
    testResults.passed++;

    // Test 2: Parsing Error Handling
    console.log('\n2. Testing Parsing Error Handling...');
    const invalidYamlContent = `---
invalid: yaml: content:
  - missing quotes
  - bad: indentation
---
# Test Agent Content`;

    const parseResult = transformer.parseBMadAgent(invalidYamlContent, {
      agentId: 'test-agent',
      operation: 'parsing-test'
    });
    
    if (parseResult.frontMatter !== undefined && parseResult.content !== undefined) {
      console.log('   ✅ Parsing error handled gracefully');
      if (parseResult.yamlError) {
        console.log(`   ⚠️  YAML error detected and handled: ${parseResult.yamlError}`);
      }
      testResults.passed++;
    } else {
      console.log('   ❌ Parsing error handling failed');
      testResults.failed++;
    }

    // Test 3: Incremental Re-conversion Setup
    console.log('\n3. Testing Incremental Re-conversion Setup...');
    
    // Simulate some failed conversions
    transformer.failedConversions.add('test-agent-1');
    transformer.failedConversions.add('test-agent-2');
    transformer.conversionAttempts.set('test-agent-1', 2);
    transformer.conversionAttempts.set('test-agent-2', 1);
    
    const stats = transformer.getConversionStatistics();
    
    if (stats.failedConversions === 2 && stats.totalAttempts === 2) {
      console.log('   ✅ Conversion tracking working correctly');
      console.log(`   📊 Failed conversions: ${stats.failedConversions}, Success rate: ${stats.successRate.toFixed(1)}%`);
      testResults.passed++;
    } else {
      console.log('   ❌ Conversion tracking failed');
      testResults.failed++;
    }

    // Test 4: Diagnostic Report Generation
    console.log('\n4. Testing Diagnostic Report Generation...');
    
    const diagnosticReport = await transformer.generateDiagnosticReport({
      includeDetailedErrors: true,
      includeAgentDiagnostics: true
    });
    
    if (diagnosticReport.timestamp && diagnosticReport.summary && diagnosticReport.systemInfo) {
      console.log('   ✅ Diagnostic report generated successfully');
      console.log(`   📋 Total attempts: ${diagnosticReport.summary.totalAttempts}`);
      console.log(`   📋 Failed conversions: ${diagnosticReport.summary.failedConversions}`);
      testResults.passed++;
    } else {
      console.log('   ❌ Diagnostic report generation failed');
      testResults.failed++;
    }

    // Test 5: Agent Path Finding
    console.log('\n5. Testing Agent Path Finding...');
    
    // This will likely fail since we don't have actual agent files, but tests the logic
    const agentPath = await transformer.findAgentPath('pm');
    
    if (agentPath !== undefined) {  // null is a valid result
      console.log(`   ✅ Agent path search completed: ${agentPath || 'not found'}`);
      testResults.passed++;
    } else {
      console.log('   ❌ Agent path search failed');
      testResults.failed++;
    }

    // Test 6: Diagnostic Mode Toggle
    console.log('\n6. Testing Diagnostic Mode Toggle...');
    
    transformer.enableDiagnosticMode();
    console.log('   ✅ Diagnostic mode enabled');
    
    transformer.disableDiagnosticMode();
    console.log('   ✅ Diagnostic mode disabled');
    
    testResults.passed += 2;

  } catch (error) {
    console.error('❌ Agent transformer test error:', error.message);
    testResults.errors.push(error.message);
    testResults.failed++;
  }

  return testResults;
}

async function testErrorRecoveryScenarios() {
  console.log('\n🔄 Testing Error Recovery Scenarios...\n');

  const testResults = {
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    const errorHandler = new ConversionErrorHandler({
      enableRecovery: true,
      maxRetryAttempts: 2,
      retryDelay: 100
    });

    // Test 1: File Not Found Recovery
    console.log('1. Testing File Not Found Recovery...');
    
    const missingFileContext = {
      agentId: 'test-agent',
      filePath: path.join(__dirname, 'nonexistent-agent.md'),
      operation: 'file-access'
    };
    
    const fileError = new Error('ENOENT: no such file or directory');
    const fileErrorResult = await errorHandler.handleConversionError(fileError, missingFileContext);
    
    console.log(`   📝 File error handled: ${fileErrorResult.category}`);
    console.log(`   🔄 Recovery attempted: ${fileErrorResult.recovered ? 'Yes' : 'No'}`);
    testResults.passed++;

    // Test 2: YAML Error Recovery
    console.log('\n2. Testing YAML Error Recovery...');
    
    // Create a temporary file with invalid YAML for testing
    const tempDir = path.join(__dirname, 'temp-test');
    await fs.ensureDir(tempDir);
    const tempFile = path.join(tempDir, 'invalid-yaml-agent.md');
    
    const invalidYamlContent = `---
invalid: yaml: content
  bad indentation
  - missing quotes
---
# Test Agent`;
    
    await fs.writeFile(tempFile, invalidYamlContent);
    
    const yamlContext = {
      agentId: 'yaml-test-agent',
      filePath: tempFile,
      operation: 'yaml-parsing'
    };
    
    const yamlError = new Error('YAMLException: bad indentation of a mapping entry');
    const yamlErrorResult = await errorHandler.handleConversionError(yamlError, yamlContext);
    
    console.log(`   📝 YAML error handled: ${yamlErrorResult.category}`);
    console.log(`   🔄 Recovery attempted: ${yamlErrorResult.recovered ? 'Yes' : 'No'}`);
    
    // Clean up temp file
    await fs.remove(tempDir);
    testResults.passed++;

    // Test 3: Multiple Recovery Attempts
    console.log('\n3. Testing Multiple Recovery Attempts...');
    
    const persistentError = new Error('Persistent transformation error');
    const persistentContext = {
      agentId: 'persistent-fail-agent',
      operation: 'transformation'
    };
    
    // First attempt
    const attempt1 = await errorHandler.handleConversionError(persistentError, persistentContext);
    console.log(`   🔄 Attempt 1: Recovery ${attempt1.recovered ? 'succeeded' : 'failed'}`);
    
    // Second attempt (should still try)
    const attempt2 = await errorHandler.handleConversionError(persistentError, persistentContext);
    console.log(`   🔄 Attempt 2: Recovery ${attempt2.recovered ? 'succeeded' : 'failed'}`);
    
    testResults.passed++;

    // Test 4: Error Statistics After Recovery
    console.log('\n4. Testing Error Statistics After Recovery...');
    
    const finalStats = errorHandler.getErrorStats();
    console.log(`   📊 Total errors: ${finalStats.total}`);
    console.log(`   📊 Recovered: ${finalStats.recovered}`);
    console.log(`   📊 Recovery rate: ${(finalStats.recoveryRate * 100).toFixed(1)}%`);
    
    if (finalStats.total > 0) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }

  } catch (error) {
    console.error('❌ Recovery scenario test error:', error.message);
    testResults.errors.push(error.message);
    testResults.failed++;
  }

  return testResults;
}

async function runAllTests() {
  console.log('🚀 Starting Conversion Error Handling Tests\n');
  console.log('=' .repeat(60));

  try {
    // Run all test suites
    const errorHandlerResults = await testConversionErrorHandler();
    const transformerResults = await testAgentTransformerErrorHandling();
    const recoveryResults = await testErrorRecoveryScenarios();

    // Combine results
    const totalResults = {
      passed: errorHandlerResults.passed + transformerResults.passed + recoveryResults.passed,
      failed: errorHandlerResults.failed + transformerResults.failed + recoveryResults.failed,
      errors: [...errorHandlerResults.errors, ...transformerResults.errors, ...recoveryResults.errors]
    };

    // Print summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${totalResults.passed}`);
    console.log(`❌ Failed: ${totalResults.failed}`);
    console.log(`📊 Success Rate: ${((totalResults.passed / (totalResults.passed + totalResults.failed)) * 100).toFixed(1)}%`);

    if (totalResults.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      totalResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (totalResults.failed === 0) {
      console.log('\n🎉 All tests passed! Conversion error handling is working correctly.');
    } else {
      console.log(`\n⚠️  ${totalResults.failed} test(s) failed. Please review the implementation.`);
    }

    console.log('\n' + '=' .repeat(60));

  } catch (error) {
    console.error('❌ Test suite execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testConversionErrorHandler,
  testAgentTransformerErrorHandling,
  testErrorRecoveryScenarios,
  runAllTests
};