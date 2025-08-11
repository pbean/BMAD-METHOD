#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

// Ultra-minimal test validator
function validateTest(testFile) {
  try {
    // Check if test file exists and has basic structure
    if (!fs.existsSync(testFile)) {
      return { status: 'MISSING', file: testFile };
    }
    
    const content = fs.readFileSync(testFile, 'utf8');
    if (!content.includes('describe') || !content.includes('test')) {
      return { status: 'INVALID', file: testFile };
    }
    
    // Try to run with timeout and capture only exit code
    execSync(`timeout 10s npx jest "${testFile}" --silent --passWithNoTests`, {
      stdio: 'ignore',
      timeout: 10000
    });
    
    return { status: 'PASS', file: testFile };
    
  } catch (error) {
    return { status: 'FAIL', file: testFile };
  }
}

// Test performance files
const performanceTests = [
  'tools/kiro-adapter/__tests__/performance/agent-transformation.test.js',
  'tools/kiro-adapter/__tests__/performance/hook-execution.test.js', 
  'tools/kiro-adapter/__tests__/performance/context-loading.test.js'
];

console.log('Performance Test Validation:');
let passed = 0, failed = 0;

performanceTests.forEach(test => {
  const result = validateTest(test);
  console.log(`${result.status}: ${result.file.split('/').pop()}`);
  
  if (result.status === 'PASS') passed++;
  else failed++;
});

console.log(`\nSummary: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);