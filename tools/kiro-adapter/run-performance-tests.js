#!/usr/bin/env node

/**
 * Performance Test Runner for Kiro Integration
 * Runs performance tests individually to avoid session length issues
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PERFORMANCE_TESTS = [
    'agent-transformation.test.js',
    'context-loading.test.js', 
    'hook-execution.test.js'
];

const PERFORMANCE_TEST_DIR = path.join(__dirname, '__tests__/performance');

function runSingleTest(testFile) {
    console.log(`\n🧪 Running ${testFile}...`);
    
    try {
        const testPath = path.join(PERFORMANCE_TEST_DIR, testFile);
        
        // Check if test file exists
        if (!fs.existsSync(testPath)) {
            console.log(`❌ Test file not found: ${testPath}`);
            return false;
        }

        // Run the test with Jest, capturing only essential output
        const result = execSync(`npx jest "${testPath}" --verbose=false --silent=false --detectOpenHandles`, {
            cwd: __dirname,
            encoding: 'utf8',
            timeout: 30000 // 30 second timeout per test
        });

        console.log(`✅ ${testFile} - PASSED`);
        
        // Extract performance metrics if present
        const lines = result.split('\n');
        const perfLines = lines.filter(line => 
            line.includes('ms') || 
            line.includes('performance') || 
            line.includes('time') ||
            line.includes('PASS') ||
            line.includes('FAIL')
        );
        
        if (perfLines.length > 0) {
            console.log('📊 Performance Summary:');
            perfLines.slice(0, 5).forEach(line => console.log(`   ${line.trim()}`));
        }
        
        return true;
        
    } catch (error) {
        console.log(`❌ ${testFile} - FAILED`);
        console.log(`Error: ${error.message.split('\n')[0]}`);
        return false;
    }
}

function main() {
    console.log('🚀 Starting Kiro Integration Performance Tests');
    console.log('=' .repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    for (const testFile of PERFORMANCE_TESTS) {
        const success = runSingleTest(testFile);
        if (success) {
            passed++;
        } else {
            failed++;
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`📈 Performance Test Summary:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total: ${passed + failed}`);
    
    if (failed === 0) {
        console.log('\n🎉 All performance tests passed!');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some performance tests failed. Check output above.');
        process.exit(1);
    }
}

// Allow running specific test
if (process.argv[2]) {
    const specificTest = process.argv[2];
    if (PERFORMANCE_TESTS.includes(specificTest)) {
        runSingleTest(specificTest);
    } else {
        console.log(`❌ Test not found: ${specificTest}`);
        console.log(`Available tests: ${PERFORMANCE_TESTS.join(', ')}`);
        process.exit(1);
    }
} else {
    main();
}