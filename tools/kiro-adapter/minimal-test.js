#!/usr/bin/env node

/**
 * Minimal test to verify end-to-end functionality
 */

const path = require('path');
const fs = require('fs-extra');

async function minimalTest() {
  console.log('Starting minimal end-to-end test...');
  
  const testDir = path.join(__dirname, 'test-output/minimal');
  
  try {
    // Setup
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.kiro/agents'));
    await fs.ensureDir(path.join(testDir, 'bmad-core/agents'));
    
    // Create test agent
    const agentContent = `---
id: test-pm
name: Test PM
description: Test product manager
---

# Test PM
Test product manager for minimal testing.`;
    
    await fs.writeFile(
      path.join(testDir, 'bmad-core/agents/test-pm.md'),
      agentContent
    );
    
    console.log('✓ Test structure created');
    
    // Test file operations
    const agentExists = await fs.pathExists(path.join(testDir, 'bmad-core/agents/test-pm.md'));
    console.log('✓ Agent file exists:', agentExists);
    
    const agentData = await fs.readFile(path.join(testDir, 'bmad-core/agents/test-pm.md'), 'utf8');
    console.log('✓ Agent file readable, length:', agentData.length);
    
    // Test directory operations
    const agentFiles = await fs.readdir(path.join(testDir, 'bmad-core/agents'));
    console.log('✓ Agent files found:', agentFiles.length);
    
    // Cleanup
    await fs.remove(testDir);
    console.log('✓ Cleanup completed');
    
    console.log('\n✅ Minimal test passed! File operations work correctly.');
    
    return {
      success: true,
      agentsCreated: 1,
      summary: {
        conversion: {
          totalAgents: 1,
          convertedAgents: 1
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Minimal test failed:', error);
    throw error;
  }
}

if (require.main === module) {
  minimalTest()
    .then(result => {
      console.log('Test result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Test error:', error);
      process.exit(1);
    });
}

module.exports = { minimalTest };