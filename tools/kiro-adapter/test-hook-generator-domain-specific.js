#!/usr/bin/env node

/**
 * Test script for domain-specific hook generation functionality
 * Tests the enhanced HookGenerator with expansion pack support
 */

const HookGenerator = require('./hook-generator');
const path = require('path');
const fs = require('fs-extra');

async function testDomainSpecificHookGeneration() {
  console.log('🧪 Testing Domain-Specific Hook Generation...\n');
  
  const generator = new HookGenerator({ verbose: true });
  const testOutputDir = path.join(__dirname, 'test-output', 'domain-hooks');
  
  // Clean up previous test output
  await fs.remove(testOutputDir);
  await fs.ensureDir(testOutputDir);
  
  // Test data: Mock expansion packs
  const mockExpansionPacks = [
    {
      name: 'bmad-2d-phaser-game-dev',
      description: '2D Game Development expansion pack for BMad Method - Phaser 3 & TypeScript focused',
      agents: ['game-designer', 'game-developer', 'game-sm']
    },
    {
      name: 'bmad-2d-unity-game-dev',
      description: '2D Game Development expansion pack for BMad Method - Unity & C# focused',
      agents: ['game-designer', 'game-developer', 'game-sm']
    },
    {
      name: 'bmad-infrastructure-devops',
      description: 'Infrastructure and DevOps expansion pack for BMad Method',
      agents: ['infra-devops-platform']
    }
  ];
  
  let totalHooks = 0;
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: Generate domain-specific hooks for each expansion pack
  console.log('📋 Test 1: Generate domain-specific hooks for expansion packs');
  
  for (const expansionPack of mockExpansionPacks) {
    try {
      console.log(`\n  Testing ${expansionPack.name}...`);
      
      const hooks = await generator.generateDomainSpecificHooks(
        expansionPack,
        expansionPack.agents,
        { enableDebugHooks: false }
      );
      
      if (hooks.length > 0) {
        console.log(`  ✅ Generated ${hooks.length} hooks for ${expansionPack.name}`);
        totalHooks += hooks.length;
        
        // Verify hooks have required properties
        for (const hook of hooks) {
          if (!hook.name || !hook.trigger || !hook.action) {
            throw new Error(`Invalid hook structure: ${JSON.stringify(hook, null, 2)}`);
          }
          
          if (!hook.metadata || !hook.metadata.expansion_pack) {
            throw new Error(`Hook missing expansion pack metadata: ${hook.name}`);
          }
        }
        
        // Save hooks for inspection
        const packOutputDir = path.join(testOutputDir, expansionPack.name);
        await fs.ensureDir(packOutputDir);
        const success = await generator.saveHooks(hooks, packOutputDir);
        
        if (success) {
          console.log(`  ✅ Saved hooks to ${packOutputDir}`);
        } else {
          throw new Error('Failed to save hooks');
        }
        
        testsPassed++;
      } else {
        console.log(`  ⚠️  No hooks generated for ${expansionPack.name}`);
      }
      
    } catch (error) {
      console.error(`  ❌ Failed to generate hooks for ${expansionPack.name}: ${error.message}`);
      testsFailed++;
    }
  }
  
  // Test 2: Test workflow automation hooks with expansion packs
  console.log('\n📋 Test 2: Generate complete workflow hooks with expansion packs');
  
  try {
    const workflowConfig = {
      expansionPacks: mockExpansionPacks,
      storyLocation: 'docs/stories',
      specLocation: '.kiro/specs'
    };
    
    const allHooks = await generator.generateWorkflowHooks(workflowConfig);
    
    if (allHooks.length > 0) {
      console.log(`  ✅ Generated ${allHooks.length} total workflow hooks`);
      
      // Count expansion pack specific hooks
      const expansionHooks = allHooks.filter(hook => 
        hook.metadata && hook.metadata.expansion_pack
      );
      
      console.log(`  ✅ ${expansionHooks.length} expansion pack specific hooks included`);
      
      // Save all hooks
      const allHooksDir = path.join(testOutputDir, 'complete-workflow');
      await fs.ensureDir(allHooksDir);
      const success = await generator.saveHooks(allHooks, allHooksDir);
      
      if (success) {
        console.log(`  ✅ Saved complete workflow hooks to ${allHooksDir}`);
        testsPassed++;
      } else {
        throw new Error('Failed to save complete workflow hooks');
      }
      
    } else {
      throw new Error('No workflow hooks generated');
    }
    
  } catch (error) {
    console.error(`  ❌ Failed to generate complete workflow hooks: ${error.message}`);
    testsFailed++;
  }
  
  // Test 3: Test agent capability-based hook generation
  console.log('\n📋 Test 3: Generate hooks from agent capabilities');
  
  try {
    const mockAgentsWithCapabilities = [
      {
        id: 'game-designer',
        name: 'Game Designer',
        capabilities: [
          {
            name: 'Design Game Mechanics',
            task: 'design-game-mechanics',
            context: ['#File', '#Folder', '#Codebase'],
            triggers: [
              {
                type: 'file_change',
                pattern: 'docs/design/**/*.md',
                condition: 'design_doc_modified'
              }
            ]
          },
          {
            name: 'Validate Game Balance',
            task: 'validate-game-balance',
            context: ['#File', '#Terminal']
          }
        ]
      },
      {
        id: 'infra-devops-platform',
        name: 'Infrastructure DevOps Platform',
        capabilities: [
          {
            name: 'Validate Infrastructure',
            task: 'validate-infrastructure',
            context: ['#File', '#Folder', '#Terminal'],
            triggers: [
              {
                type: 'file_change',
                pattern: '**/*.tf',
                condition: 'terraform_modified'
              }
            ]
          }
        ]
      }
    ];
    
    const capabilityHooks = await generator.generateHooksFromAgentCapabilities(
      mockAgentsWithCapabilities,
      {}
    );
    
    if (capabilityHooks.length > 0) {
      console.log(`  ✅ Generated ${capabilityHooks.length} capability-based hooks`);
      
      // Verify capability hooks have proper structure
      for (const hook of capabilityHooks) {
        if (!hook.metadata || !hook.metadata.capability_based) {
          throw new Error(`Hook missing capability metadata: ${hook.name}`);
        }
      }
      
      // Save capability hooks
      const capabilityHooksDir = path.join(testOutputDir, 'capability-hooks');
      await fs.ensureDir(capabilityHooksDir);
      const success = await generator.saveHooks(capabilityHooks, capabilityHooksDir);
      
      if (success) {
        console.log(`  ✅ Saved capability hooks to ${capabilityHooksDir}`);
        testsPassed++;
      } else {
        throw new Error('Failed to save capability hooks');
      }
      
    } else {
      throw new Error('No capability hooks generated');
    }
    
  } catch (error) {
    console.error(`  ❌ Failed to generate capability hooks: ${error.message}`);
    testsFailed++;
  }
  
  // Test 4: Test Kiro event system integration
  console.log('\n📋 Test 4: Test Kiro event system integration');
  
  try {
    const testHook = {
      name: 'Test Hook',
      description: 'Test hook for Kiro integration',
      trigger: {
        type: 'file_change',
        pattern: '**/*.js'
      },
      action: {
        agent: 'test-agent',
        task: 'test-task',
        context: ['#File', '#Problems']
      },
      settings: {
        debounce_ms: 2000,
        show_in_command_palette: true
      }
    };
    
    const integratedHook = generator._integrateWithKiroEventSystem(testHook);
    
    // Verify Kiro integration properties
    if (!integratedHook.kiro_integration) {
      throw new Error('Missing kiro_integration properties');
    }
    
    if (!integratedHook.trigger.kiro_event_type) {
      throw new Error('Missing kiro_event_type in trigger');
    }
    
    if (!integratedHook.action.activation_method) {
      throw new Error('Missing activation_method in action');
    }
    
    if (!integratedHook.error_handling) {
      throw new Error('Missing error_handling configuration');
    }
    
    console.log('  ✅ Kiro event system integration working correctly');
    console.log(`  ✅ Event type mapped to: ${integratedHook.trigger.kiro_event_type}`);
    console.log(`  ✅ Activation method: ${integratedHook.action.activation_method}`);
    
    testsPassed++;
    
  } catch (error) {
    console.error(`  ❌ Kiro event system integration failed: ${error.message}`);
    testsFailed++;
  }
  
  // Test 5: Verify hook file structure and content
  console.log('\n📋 Test 5: Verify generated hook files');
  
  try {
    const hookFiles = await fs.readdir(path.join(testOutputDir, 'complete-workflow'));
    
    if (hookFiles.length === 0) {
      throw new Error('No hook files found');
    }
    
    console.log(`  ✅ Found ${hookFiles.length} hook files`);
    
    // Verify a few hook files have valid YAML content
    let validFiles = 0;
    for (const file of hookFiles.slice(0, 3)) { // Check first 3 files
      if (file.endsWith('.yaml')) {
        const filePath = path.join(testOutputDir, 'complete-workflow', file);
        const content = await fs.readFile(filePath, 'utf8');
        
        if (content.includes('name:') && content.includes('trigger:') && content.includes('action:')) {
          validFiles++;
        }
      }
    }
    
    if (validFiles > 0) {
      console.log(`  ✅ ${validFiles} hook files have valid YAML structure`);
      testsPassed++;
    } else {
      throw new Error('No valid hook files found');
    }
    
  } catch (error) {
    console.error(`  ❌ Hook file verification failed: ${error.message}`);
    testsFailed++;
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`  Total hooks generated: ${totalHooks}`);
  console.log(`  Tests passed: ${testsPassed}`);
  console.log(`  Tests failed: ${testsFailed}`);
  console.log(`  Success rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All domain-specific hook generation tests passed!');
    console.log(`📁 Test output saved to: ${testOutputDir}`);
    return true;
  } else {
    console.log('\n❌ Some tests failed. Check the output above for details.');
    return false;
  }
}

// Run the test
if (require.main === module) {
  testDomainSpecificHookGeneration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testDomainSpecificHookGeneration };