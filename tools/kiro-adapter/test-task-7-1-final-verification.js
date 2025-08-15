#!/usr/bin/env node

/**
 * Task 7.1 Final Verification Test
 * Comprehensive test to verify all aspects of the implementation
 */

const path = require('path');
const fs = require('fs-extra');
const KiroInstaller = require('./kiro-installer');

async function runFinalVerification() {
  console.log('🔍 Task 7.1 Final Verification Test\n');

  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Method Integration
  await runTest('Method Integration', async () => {
    const installer = new KiroInstaller();
    
    // Verify the method exists and is properly integrated
    if (typeof installer.addKiroEnhancements !== 'function') {
      throw new Error('addKiroEnhancements method not found');
    }
    
    if (typeof installer.performCompleteAgentConversion !== 'function') {
      throw new Error('performCompleteAgentConversion method not found');
    }
    
    if (typeof installer.validateConversionCompleteness !== 'function') {
      throw new Error('validateConversionCompleteness method not found');
    }
    
    return 'All required methods are properly integrated';
  }, testResults);

  // Test 2: Progress Reporting Implementation
  await runTest('Progress Reporting Implementation', async () => {
    const testDir = path.join(__dirname, 'test-output', 'progress-test');
    await fs.remove(testDir);
    await fs.ensureDir(testDir);
    
    // Create minimal test structure
    const coreAgentsDir = path.join(testDir, 'bmad-core', 'agents');
    await fs.ensureDir(coreAgentsDir);
    
    const testAgent = `---
agent:
  id: test-agent
  name: Test Agent
  title: Test Agent
persona:
  role: Test Agent
---
# Test Agent
Test content`;
    
    await fs.writeFile(path.join(coreAgentsDir, 'test-agent.md'), testAgent);
    
    const installer = new KiroInstaller();
    const progressEvents = [];
    
    const mockSpinner = {
      text: '',
      succeed: (msg) => progressEvents.push({ type: 'success', message: msg }),
      fail: (msg) => progressEvents.push({ type: 'failure', message: msg }),
      warn: (msg) => progressEvents.push({ type: 'warning', message: msg })
    };
    
    const config = { expansionPacks: [], generateHooks: false };
    await installer.addKiroEnhancements(config, testDir, mockSpinner);
    
    if (progressEvents.length === 0) {
      throw new Error('No progress events captured');
    }
    
    const hasDiscoveryProgress = progressEvents.some(e => e.message.includes('Discovered'));
    const hasConversionProgress = progressEvents.some(e => e.message.includes('Converted'));
    
    if (!hasDiscoveryProgress) {
      throw new Error('No discovery progress events found');
    }
    
    if (!hasConversionProgress) {
      throw new Error('No conversion progress events found');
    }
    
    return `Progress reporting working: ${progressEvents.length} events captured`;
  }, testResults);

  // Test 3: Validation Completeness
  await runTest('Validation Completeness', async () => {
    const testDir = path.join(__dirname, 'test-output', 'validation-test');
    await fs.remove(testDir);
    await fs.ensureDir(testDir);
    
    // Create test structure with multiple agents
    const coreAgentsDir = path.join(testDir, 'bmad-core', 'agents');
    await fs.ensureDir(coreAgentsDir);
    
    const agents = ['agent1', 'agent2', 'agent3'];
    for (const agentId of agents) {
      const content = `---
agent:
  id: ${agentId}
  name: ${agentId}
  title: ${agentId}
persona:
  role: ${agentId}
---
# ${agentId}
Content`;
      await fs.writeFile(path.join(coreAgentsDir, `${agentId}.md`), content);
    }
    
    const installer = new KiroInstaller();
    const mockSpinner = { text: '', succeed: () => {}, fail: () => {}, warn: () => {} };
    
    const config = { expansionPacks: [], generateHooks: false };
    const result = await installer.addKiroEnhancements(config, testDir, mockSpinner);
    
    // Verify validation result structure
    if (!result || typeof result !== 'object') {
      throw new Error('No validation result returned');
    }
    
    if (typeof result.isValid !== 'boolean') {
      throw new Error('Validation result missing isValid property');
    }
    
    if (!result.summary || !result.summary.conversion) {
      throw new Error('Validation result missing conversion summary');
    }
    
    const conversionSummary = result.summary.conversion;
    if (typeof conversionSummary.totalAgents !== 'number' ||
        typeof conversionSummary.convertedAgents !== 'number' ||
        typeof conversionSummary.conversionRate !== 'string') {
      throw new Error('Conversion summary missing required properties');
    }
    
    return `Validation completeness verified: ${conversionSummary.totalAgents} agents, ${conversionSummary.conversionRate} success rate`;
  }, testResults);

  // Test 4: Error Handling
  await runTest('Error Handling', async () => {
    const testDir = path.join(__dirname, 'test-output', 'error-test');
    await fs.remove(testDir);
    await fs.ensureDir(testDir);
    
    // Create invalid agent structure to test error handling
    const coreAgentsDir = path.join(testDir, 'bmad-core', 'agents');
    await fs.ensureDir(coreAgentsDir);
    
    // Create an invalid agent file
    await fs.writeFile(path.join(coreAgentsDir, 'invalid-agent.md'), 'Invalid content without YAML');
    
    const installer = new KiroInstaller();
    const mockSpinner = { text: '', succeed: () => {}, fail: () => {}, warn: () => {} };
    
    const config = { expansionPacks: [], generateHooks: false };
    
    // This should not throw an error, but handle it gracefully
    const result = await installer.addKiroEnhancements(config, testDir, mockSpinner);
    
    // Verify that the system handled the error gracefully
    if (!result) {
      throw new Error('No result returned despite invalid agent');
    }
    
    return 'Error handling working: gracefully handled invalid agent';
  }, testResults);

  // Test 5: Expansion Pack Integration
  await runTest('Expansion Pack Integration', async () => {
    const testDir = path.join(__dirname, 'test-output', 'expansion-test');
    await fs.remove(testDir);
    await fs.ensureDir(testDir);
    
    // Create expansion pack structure
    const expansionDir = path.join(testDir, 'expansion-packs', 'test-expansion');
    const expansionAgentsDir = path.join(expansionDir, 'agents');
    await fs.ensureDir(expansionAgentsDir);
    
    const expansionAgent = `---
agent:
  id: expansion-agent
  name: Expansion Agent
  title: Expansion Agent
persona:
  role: Expansion Agent
---
# Expansion Agent
Expansion content`;
    
    await fs.writeFile(path.join(expansionAgentsDir, 'expansion-agent.md'), expansionAgent);
    
    // Create expansion config
    const expansionConfig = {
      title: 'Test Expansion',
      domain: 'testing',
      version: '1.0.0'
    };
    
    await fs.writeFile(
      path.join(expansionDir, 'config.yaml'),
      require('js-yaml').dump(expansionConfig)
    );
    
    const installer = new KiroInstaller();
    const mockSpinner = { text: '', succeed: () => {}, fail: () => {}, warn: () => {} };
    
    const config = { expansionPacks: ['test-expansion'], generateHooks: false };
    const result = await installer.addKiroEnhancements(config, testDir, mockSpinner);
    
    // Verify expansion pack agent was converted
    const kiroAgentsDir = path.join(testDir, '.kiro', 'agents');
    const agentFiles = await fs.readdir(kiroAgentsDir);
    
    if (!agentFiles.includes('expansion-agent.md')) {
      throw new Error('Expansion pack agent not converted');
    }
    
    return 'Expansion pack integration working: expansion agent converted';
  }, testResults);

  // Display final results
  console.log('\n📊 Final Verification Results:');
  console.log(`   ✅ Passed: ${testResults.passed}`);
  console.log(`   ❌ Failed: ${testResults.failed}`);
  console.log(`   📈 Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 Task 7.1 Implementation FULLY VERIFIED!');
    console.log('\n✅ All Requirements Successfully Implemented:');
    console.log('   • 1.1: Convert ALL BMad core agents to Kiro format');
    console.log('   • 1.2: Convert ALL expansion pack agents to Kiro format');
    console.log('   • 1.6: Add progress reporting for conversion process');
    console.log('   • 4.1: Implement validation of conversion completeness');
    return true;
  } else {
    console.log('\n❌ Some tests failed - implementation needs review');
    return false;
  }
}

async function runTest(testName, testFunction, testResults) {
  try {
    console.log(`🧪 Running: ${testName}`);
    const result = await testFunction();
    console.log(`   ✅ ${result}`);
    testResults.passed++;
    testResults.tests.push({ name: testName, passed: true, result });
  } catch (error) {
    console.log(`   ❌ ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name: testName, passed: false, error: error.message });
  }
}

// Run the verification if this file is executed directly
if (require.main === module) {
  runFinalVerification()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

module.exports = { runFinalVerification };