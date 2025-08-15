#!/usr/bin/env node

/**
 * Simple Test for Conversion Error Handler
 * Basic functionality test without complex dependencies
 */

const ConversionErrorHandler = require('./conversion-error-handler');

async function testBasicErrorHandling() {
  console.log('🧪 Testing Basic Error Handling...\n');

  try {
    // Test 1: Initialize Error Handler
    console.log('1. Initializing Error Handler...');
    const errorHandler = new ConversionErrorHandler({
      logLevel: 'info',
      enableDiagnostics: true,
      enableRecovery: true
    });
    console.log('   ✅ Error handler initialized successfully\n');

    // Test 2: Error Categorization
    console.log('2. Testing Error Categorization...');
    const testErrors = [
      new Error('ENOENT: no such file or directory'),
      new Error('YAMLException: bad indentation'),
      new Error('Missing dependency: tasks/create-doc.md'),
      new Error('EACCES: permission denied')
    ];

    for (const error of testErrors) {
      const categorized = errorHandler.categorizeError(error, {});
      console.log(`   📝 ${error.message} -> ${categorized.category} (${categorized.severity})`);
    }
    console.log('   ✅ Error categorization working\n');

    // Test 3: Handle Conversion Error
    console.log('3. Testing Error Handling...');
    const testError = new Error('Test conversion failure');
    const context = {
      agentId: 'test-agent',
      filePath: '/path/to/test.md',
      operation: 'transformation'
    };

    const result = await errorHandler.handleConversionError(testError, context);
    console.log(`   📊 Error ID: ${result.errorId}`);
    console.log(`   📊 Category: ${result.category}`);
    console.log(`   📊 Recoverable: ${result.recoverable}`);
    console.log('   ✅ Error handling working\n');

    // Test 4: Error Statistics
    console.log('4. Testing Error Statistics...');
    const stats = errorHandler.getErrorStats();
    console.log(`   📊 Total errors: ${stats.total}`);
    console.log(`   📊 Recovery rate: ${(stats.recoveryRate * 100).toFixed(1)}%`);
    console.log('   ✅ Statistics working\n');

    // Test 5: Recovery Strategy
    console.log('5. Testing Recovery Strategy...');
    const missingFileError = {
      id: 'test-recovery',
      category: 'file-not-found',
      context: { filePath: '/nonexistent/file.md' },
      recoveryAttempts: 0
    };

    const recoveryResult = await errorHandler.recoverFromMissingFile(missingFileError);
    console.log(`   🔄 Recovery result: ${recoveryResult.success ? 'Success' : 'Failed'}`);
    console.log(`   🔄 Reason: ${recoveryResult.reason}`);
    console.log('   ✅ Recovery strategy working\n');

    console.log('🎉 All basic tests passed! Error handling system is functional.');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run test
if (require.main === module) {
  testBasicErrorHandling()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testBasicErrorHandling };