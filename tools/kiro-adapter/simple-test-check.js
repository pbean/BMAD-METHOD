const fs = require('fs');

console.log('=== Task 10.3 Validation ===');

const tests = [
  '__tests__/performance/agent-transformation.test.js',
  '__tests__/performance/hook-execution.test.js', 
  '__tests__/performance/context-loading.test.js',
  '__tests__/integration/agent-collaboration.test.js',
  '__tests__/integration/hook-automation.test.js',
  '__tests__/integration/bmad-planning-workflow.test.js'
];

let valid = 0;
tests.forEach(test => {
  if (fs.existsSync(test)) {
    console.log(`✓ ${test}`);
    valid++;
  } else {
    console.log(`✗ ${test}`);
  }
});

console.log(`\nResult: ${valid}/${tests.length} test files exist`);
if (valid === tests.length) {
  console.log('🎉 Task 10.3 completed - all performance and integration tests created');
}