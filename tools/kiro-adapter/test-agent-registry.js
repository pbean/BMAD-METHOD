/**
 * Test Agent Registry and Activation Manager
 * Tests the native agent registration system
 */

const path = require('path');
const fs = require('fs-extra');
const KiroAgentRegistry = require('./kiro-agent-registry');
const ActivationManager = require('./activation-manager');

async function testAgentRegistry() {
  console.log('=== Testing Agent Registry ===\n');
  
  try {
    // Create test environment
    const testDir = path.join(__dirname, 'test-output', 'registry-test');
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.kiro/agents'));
    
    // Create test agent file
    const testAgentContent = `---
id: test-architect
name: Test Architect
description: A test architect agent for validation
---

# Test Architect Agent

This is a test architect agent used for validating the registration system.

## Role
Software Architect

## Responsibilities
- Design system architecture
- Review technical decisions
- Guide development team
`;
    
    await fs.writeFile(
      path.join(testDir, '.kiro/agents/test-architect.md'),
      testAgentContent
    );
    
    // Initialize registry
    const registry = new KiroAgentRegistry({
      rootPath: testDir
    });
    
    console.log('1. Initializing registry...');
    const initSuccess = await registry.initialize();
    console.log(`   Result: ${initSuccess ? 'SUCCESS' : 'FAILED'}\n`);
    
    // Check statistics
    console.log('2. Registry statistics:');
    const stats = registry.getStatistics();
    console.log(`   Total registered: ${stats.totalRegistered}`);
    console.log(`   Total errors: ${stats.totalErrors}`);
    console.log(`   Registered agents: ${stats.registeredAgentIds.join(', ')}\n`);
    
    // Test agent retrieval
    console.log('3. Testing agent retrieval...');
    const testAgent = registry.getRegisteredAgent('test-architect');
    if (testAgent) {
      console.log(`   Found agent: ${testAgent.name}`);
      console.log(`   Description: ${testAgent.description}`);
      console.log(`   Source: ${testAgent.metadata.source}\n`);
    } else {
      console.log('   ERROR: Test agent not found\n');
    }
    
    return registry;
    
  } catch (error) {
    console.error('Registry test failed:', error.message);
    return null;
  }
}

async function testActivationManager(registry) {
  console.log('=== Testing Activation Manager ===\n');
  
  try {
    if (!registry) {
      console.log('Skipping activation test - no registry available\n');
      return;
    }
    
    // Initialize activation manager
    const activationManager = new ActivationManager(registry, {
      rootPath: registry.options.rootPath
    });
    
    console.log('1. Initializing activation manager...');
    const initSuccess = await activationManager.initialize();
    console.log(`   Result: ${initSuccess ? 'SUCCESS' : 'FAILED'}\n`);
    
    // Test agent activation
    console.log('2. Testing agent activation...');
    try {
      const instance = await activationManager.activateAgent('test-architect', {
        user: 'test-user',
        project: 'test-project'
      });
      
      console.log(`   Activated agent: ${instance.name}`);
      console.log(`   Agent ID: ${instance.id}`);
      console.log(`   Activated at: ${instance.activatedAt}\n`);
      
      // Test activation statistics
      console.log('3. Activation statistics:');
      const activationStats = activationManager.getStatistics();
      console.log(`   Active agents: ${activationStats.activeAgents}`);
      console.log(`   Total sessions: ${activationStats.totalSessions}`);
      console.log(`   Active agent IDs: ${activationStats.activeAgentIds.join(', ')}\n`);
      
      // Test deactivation
      console.log('4. Testing agent deactivation...');
      const deactivateSuccess = await activationManager.deactivateAgent('test-architect');
      console.log(`   Deactivation result: ${deactivateSuccess ? 'SUCCESS' : 'FAILED'}\n`);
      
      // Check final statistics
      const finalStats = activationManager.getStatistics();
      console.log('5. Final statistics:');
      console.log(`   Active agents: ${finalStats.activeAgents}`);
      console.log(`   Total sessions: ${finalStats.totalSessions}\n`);
      
    } catch (error) {
      console.error(`   Activation failed: ${error.message}\n`);
    }
    
    // Shutdown
    await activationManager.shutdown();
    
  } catch (error) {
    console.error('Activation manager test failed:', error.message);
  }
}

async function testConflictResolution() {
  console.log('=== Testing Conflict Resolution ===\n');
  
  try {
    // Create test environment with multiple agents
    const testDir = path.join(__dirname, 'test-output', 'conflict-test');
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.kiro/agents'));
    
    // Create multiple architect agents
    const architect1Content = `---
id: bmad-architect
name: BMad Architect
description: Core BMad architect agent
---

# BMad Architect

Core architect from BMad Method.
`;
    
    const architect2Content = `---
id: game-architect
name: Game Architect
description: Specialized game development architect
---

# Game Architect

Specialized architect for game development projects.
`;
    
    await fs.writeFile(
      path.join(testDir, '.kiro/agents/bmad-architect.md'),
      architect1Content
    );
    
    await fs.writeFile(
      path.join(testDir, '.kiro/agents/game-architect.md'),
      architect2Content
    );
    
    // Initialize system
    const registry = new KiroAgentRegistry({ rootPath: testDir });
    await registry.initialize();
    
    const activationManager = new ActivationManager(registry, { rootPath: testDir });
    await activationManager.initialize();
    
    console.log('1. Activating first architect...');
    const instance1 = await activationManager.activateAgent('bmad-architect');
    console.log(`   Activated: ${instance1.name}\n`);
    
    console.log('2. Attempting to activate second architect (should conflict)...');
    try {
      const instance2 = await activationManager.activateAgent('game-architect');
      console.log(`   Activated: ${instance2.name} (conflict resolution worked)\n`);
    } catch (error) {
      console.log(`   Conflict detected: ${error.message}\n`);
    }
    
    // Check final state
    const stats = activationManager.getStatistics();
    console.log('3. Final state:');
    console.log(`   Active agents: ${stats.activeAgents}`);
    console.log(`   Active agent IDs: ${stats.activeAgentIds.join(', ')}\n`);
    
    await activationManager.shutdown();
    
  } catch (error) {
    console.error('Conflict resolution test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('Starting Agent Registry and Activation Manager Tests\n');
  console.log('=' .repeat(60) + '\n');
  
  try {
    // Test registry
    const registry = await testAgentRegistry();
    
    // Test activation manager
    await testActivationManager(registry);
    
    // Test conflict resolution
    await testConflictResolution();
    
    console.log('=' .repeat(60));
    console.log('All tests completed!\n');
    
  } catch (error) {
    console.error('Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testAgentRegistry,
  testActivationManager,
  testConflictResolution,
  runAllTests
};