#!/usr/bin/env node

/**
 * Test script for AgentTransformer
 * Tests the transformation of BMad agents to Kiro-native agents
 */

const AgentTransformer = require('./agent-transformer');
const path = require('path');
const fs = require('fs-extra');

async function testAgentTransformer() {
  console.log('Testing AgentTransformer...\n');

  const transformer = new AgentTransformer({
    preserveOriginal: true,
    addKiroMetadata: true,
    validateOutput: true
  });

  // Test with PM agent
  const bmadAgentPath = path.join(__dirname, '../../bmad-core/agents/pm.md');
  const kiroOutputPath = path.join(__dirname, '../../.kiro/agents/bmad-pm.md');

  try {
    console.log(`Input: ${transformer.getRelativePath(bmadAgentPath)}`);
    console.log(`Output: ${transformer.getRelativePath(kiroOutputPath)}`);
    
    const success = await transformer.transformAgent(bmadAgentPath, kiroOutputPath, {
      steeringRules: ['product.md', 'tech.md', 'structure.md'],
      mcpTools: ['web-search', 'documentation']
    });

    if (success) {
      console.log('\n✅ Agent transformation successful!');
      
      // Read and display the result
      const result = await fs.readFile(kiroOutputPath, 'utf8');
      console.log('\n--- Transformed Agent Preview ---');
      console.log(result.substring(0, 1000) + '...\n');
      
    } else {
      console.log('\n❌ Agent transformation failed!');
    }

  } catch (error) {
    console.error('\n❌ Error during transformation:', error.message);
  }
}

// Run test if called directly
if (require.main === module) {
  testAgentTransformer();
}

module.exports = testAgentTransformer;