#!/usr/bin/env node

/**
 * Test script for AgentDiscovery functionality
 * This script tests the enhanced agent discovery and scanning system
 */

const path = require('path');
const AgentDiscovery = require('./agent-discovery');

async function testAgentDiscovery() {
  console.log('🔍 Testing Enhanced Agent Discovery System\n');

  try {
    // Initialize AgentDiscovery with project root
    const projectRoot = path.resolve(__dirname, '../..');
    const discovery = new AgentDiscovery({
      rootPath: projectRoot,
      verbose: true,
      validateDependencies: true
    });

    console.log(`📁 Project root: ${projectRoot}\n`);

    // Test 1: Scan all agents
    console.log('📋 Test 1: Scanning all BMad agents...');
    const startTime = Date.now();
    const agents = await discovery.scanAllAgents();
    const scanTime = Date.now() - startTime;

    console.log(`✅ Discovered ${agents.length} agents in ${scanTime}ms\n`);

    // Test 2: Display statistics
    console.log('📊 Test 2: Agent discovery statistics');
    const stats = discovery.getStatistics();
    console.log(`   Total agents: ${stats.total}`);
    console.log(`   Core agents: ${stats.core}`);
    console.log(`   Expansion pack agents: ${stats.expansionPack}`);
    console.log(`   Valid agents: ${stats.valid}`);
    console.log(`   Invalid agents: ${stats.invalid}`);
    console.log(`   Validation errors: ${stats.validationErrors}`);
    console.log(`   Expansion packs: ${stats.expansionPacks.join(', ')}`);
    console.log(`   Dependencies tracked: ${stats.dependencies}\n`);

    // Test 3: Display core agents
    console.log('🏗️ Test 3: Core agents discovered');
    const coreAgents = discovery.getAgentsBySource('bmad-core');
    coreAgents.forEach(agent => {
      console.log(`   • ${agent.name} (${agent.id}) - ${agent.title}`);
      console.log(`     File: ${agent.relativePath}`);
      console.log(`     Valid: ${agent.isValid ? '✅' : '❌'}`);
      if (!agent.isValid) {
        console.log(`     Errors: ${agent.validationErrors.join(', ')}`);
      }
    });
    console.log();

    // Test 4: Display expansion pack agents
    console.log('🎮 Test 4: Expansion pack agents discovered');
    const expansionAgents = discovery.getAgentsBySource('expansion-pack');
    expansionAgents.forEach(agent => {
      console.log(`   • ${agent.name} (${agent.id}) - ${agent.title}`);
      console.log(`     Pack: ${agent.expansionPack}`);
      console.log(`     File: ${agent.relativePath}`);
      console.log(`     Valid: ${agent.isValid ? '✅' : '❌'}`);
      if (!agent.isValid) {
        console.log(`     Errors: ${agent.validationErrors.join(', ')}`);
      }
    });
    console.log();

    // Test 5: Display validation errors
    const validationErrors = discovery.getValidationErrors();
    if (validationErrors.length > 0) {
      console.log('⚠️ Test 5: Validation errors found');
      validationErrors.forEach(error => {
        console.log(`   • ${error.filePath}: ${error.error}`);
      });
      console.log();
    } else {
      console.log('✅ Test 5: No validation errors found\n');
    }

    // Test 6: Test specific agent retrieval
    console.log('🔍 Test 6: Testing specific agent retrieval');
    const pmAgent = discovery.getAgent('pm');
    if (pmAgent) {
      console.log(`   Found PM agent: ${pmAgent.name}`);
      console.log(`   Commands: ${pmAgent.commands.map(c => c.name).join(', ')}`);
      console.log(`   Dependencies: ${Object.keys(pmAgent.dependencies).filter(k => pmAgent.dependencies[k].length > 0).join(', ')}`);
    } else {
      console.log('   PM agent not found');
    }
    console.log();

    // Test 7: Test dependency mapping
    console.log('🔗 Test 7: Dependency mapping');
    const dependencyMap = discovery.getDependencyMap();
    if (dependencyMap.size > 0) {
      console.log(`   Tracked ${dependencyMap.size} dependencies:`);
      let count = 0;
      for (const [dep, agents] of dependencyMap.entries()) {
        if (count < 5) { // Show first 5 dependencies
          console.log(`   • ${dep} → used by ${agents.join(', ')}`);
        }
        count++;
      }
      if (dependencyMap.size > 5) {
        console.log(`   ... and ${dependencyMap.size - 5} more`);
      }
    } else {
      console.log('   No dependencies tracked');
    }
    console.log();

    // Test 8: Test agent metadata structure
    console.log('📋 Test 8: Sample agent metadata structure');
    if (agents.length > 0) {
      const sampleAgent = agents[0];
      console.log(`   Sample agent: ${sampleAgent.name}`);
      console.log(`   Metadata keys: ${Object.keys(sampleAgent).join(', ')}`);
      console.log(`   Persona keys: ${Object.keys(sampleAgent.persona).join(', ')}`);
      console.log(`   Has raw content: ${!!sampleAgent.rawContent}`);
      console.log(`   Has parsed content: ${!!sampleAgent.parsedContent}`);
    }
    console.log();

    console.log('🎉 All tests completed successfully!');
    
    return {
      success: true,
      agentsFound: agents.length,
      stats,
      validationErrors: validationErrors.length
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testAgentDiscovery()
    .then(result => {
      if (result.success) {
        console.log(`\n✅ Agent Discovery Test Summary:`);
        console.log(`   Agents discovered: ${result.agentsFound}`);
        console.log(`   Validation errors: ${result.validationErrors}`);
        process.exit(0);
      } else {
        console.log(`\n❌ Tests failed: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = testAgentDiscovery;