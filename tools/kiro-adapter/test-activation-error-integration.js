#!/usr/bin/env node

/**
 * Test Activation Error Integration
 * Test integration between activation error handler and existing components
 */

const ActivationErrorHandler = require('./activation-error-handler');
const ActivationManager = require('./activation-manager');
const KiroAgentRegistry = require('./kiro-agent-registry');
const fs = require('fs-extra');
const path = require('path');

async function testActivationErrorIntegration() {
  console.log('🔗 Testing Activation Error Integration...\n');

  const testDir = path.join(__dirname, 'test-output', 'activation-error-integration');
  await fs.ensureDir(testDir);
  await fs.ensureDir(path.join(testDir, '.kiro', 'agents'));
  await fs.ensureDir(path.join(testDir, '.kiro', 'steering'));

  try {
    // Create a mock agent file for testing
    const mockAgentPath = path.join(testDir, '.kiro', 'agents', 'test-agent.md');
    const mockAgentContent = `---
id: test-agent
name: Test Agent
description: A test agent for integration testing
---

# Test Agent

This is a test agent for integration testing.
`;
    await fs.writeFile(mockAgentPath, mockAgentContent);

    // Initialize components
    const registry = new KiroAgentRegistry({
      rootPath: testDir,
      retryAttempts: 1
    });

    const activationManager = new ActivationManager(registry, {
      rootPath: testDir,
      enableRetry: true,
      enableFallback: true,
      maxRetryAttempts: 2,
      retryDelay: 100,
      steeringFallbackEnabled: true,
      manualOverrideEnabled: true
    });

    await registry.initialize();
    await activationManager.initialize();

    console.log('✅ Components initialized successfully');

    // Test 1: Successful activation of existing agent
    console.log('\n📋 Test 1: Activating existing agent...');
    try {
      const result1 = await activationManager.activateAgent('test-agent');
      if (result1.id === 'test-agent') {
        console.log('✅ Successfully activated existing agent');
      } else {
        console.log('⚠️  Agent activated with modifications:', result1);
      }
    } catch (error) {
      console.log('❌ Failed to activate existing agent:', error.message);
    }

    // Test 2: Activation of non-existent agent (should use fallback)
    console.log('\n📋 Test 2: Activating non-existent agent...');
    const result2 = await activationManager.activateAgent('non-existent-agent');
    
    if (result2.activationMethod === 'steering-fallback') {
      console.log('✅ Non-existent agent activated via steering fallback');
      console.log(`   Steering file: ${result2.steeringFile}`);
      console.log(`   Limitations: ${result2.limitations?.length || 0} items`);
    } else if (result2.errorId) {
      console.log('⚠️  Agent activation failed with error:', result2.message);
      console.log(`   Manual override options: ${result2.manualOverrideOptions?.length || 0}`);
      
      // Test manual override
      if (result2.manualOverrideOptions?.length > 0) {
        console.log('\n📋 Test 2a: Testing manual override...');
        const overrideOption = result2.manualOverrideOptions[0];
        const overrideResult = await activationManager.executeManualOverride(
          result2.errorId,
          overrideOption.id
        );
        
        if (overrideResult.success) {
          console.log(`✅ Manual override "${overrideOption.id}" executed successfully`);
        } else {
          console.log(`❌ Manual override failed: ${overrideResult.reason}`);
        }
      }
    }

    // Test 3: Check error statistics
    console.log('\n📋 Test 3: Checking error statistics...');
    const errorStats = activationManager.getActivationErrorStats();
    console.log(`   Total errors: ${errorStats.total}`);
    console.log(`   Recovered: ${errorStats.recovered}`);
    console.log(`   Fallback used: ${errorStats.fallbackUsed}`);
    console.log(`   Manual overrides: ${errorStats.manualOverrides}`);
    console.log(`   Recovery rate: ${(errorStats.recoveryRate * 100).toFixed(1)}%`);

    // Test 4: Check generated steering files
    console.log('\n📋 Test 4: Checking generated steering files...');
    const steeringDir = path.join(testDir, '.kiro', 'steering');
    const steeringFiles = await fs.readdir(steeringDir);
    const fallbackFiles = steeringFiles.filter(f => f.includes('fallback'));
    
    console.log(`   Generated ${fallbackFiles.length} fallback steering files`);
    
    if (fallbackFiles.length > 0) {
      const sampleFile = path.join(steeringDir, fallbackFiles[0]);
      const content = await fs.readFile(sampleFile, 'utf8');
      
      if (content.includes('Fallback Activation')) {
        console.log('✅ Steering fallback files contain correct content');
      } else {
        console.log('⚠️  Steering fallback files may have incorrect content');
      }
    }

    // Test 5: Test error clearing
    console.log('\n📋 Test 5: Testing error history clearing...');
    const errorsBefore = activationManager.getActivationErrors().length;
    activationManager.clearActivationErrors();
    const errorsAfter = activationManager.getActivationErrors().length;
    
    if (errorsAfter === 0 && errorsBefore > 0) {
      console.log('✅ Error history cleared successfully');
    } else {
      console.log(`⚠️  Error clearing may not work correctly (before: ${errorsBefore}, after: ${errorsAfter})`);
    }

    await activationManager.shutdown();
    console.log('\n🎉 Activation Error Integration Test Complete!');

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error(error.stack);
  }
}

// Run test if called directly
if (require.main === module) {
  testActivationErrorIntegration().catch(console.error);
}

module.exports = testActivationErrorIntegration;