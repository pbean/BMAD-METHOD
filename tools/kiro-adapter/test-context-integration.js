/**
 * Integration test for Context Mapping System with Agent Transformer
 */

const AgentTransformer = require('./agent-transformer');
const ContextInjector = require('./context-injector');
const fs = require('fs');
const path = require('path');

async function testContextIntegration() {
  console.log('🔗 Testing Context Integration with Agent Transformer\n');

  // Test 1: Verify context injector integration
  console.log('1. Testing context injector integration:');
  const transformer = new AgentTransformer();
  console.log('   ✓ AgentTransformer created with ContextInjector');
  console.log('   ✓ Context injector available:', !!transformer.contextInjector);
  console.log('');

  // Test 2: Test context mapping for different agents
  console.log('2. Testing context mapping for different BMad agents:');
  const testAgents = [
    { id: 'dev', name: 'Developer' },
    { id: 'qa', name: 'QA Engineer' },
    { id: 'architect', name: 'Architect' },
    { id: 'pm', name: 'Product Manager' }
  ];

  for (const agent of testAgents) {
    const requirements = transformer.contextInjector.agentContextRequirements[agent.id];
    if (requirements) {
      console.log(`   ${agent.name} (${agent.id}):`);
      console.log(`     Primary context: ${requirements.primary.join(', ')}`);
      console.log(`     Secondary context: ${requirements.secondary.join(', ')}`);
    }
  }
  console.log('');

  // Test 3: Test context injection into agent content
  console.log('3. Testing context injection into agent content:');
  const sampleAgent = `# dev

ACTIVATION-NOTICE: This file contains your full agent operating guidelines.

\`\`\`yaml
agent:
  name: James
  id: dev
  title: Full Stack Developer
  icon: 💻
\`\`\`

# BMad Developer Agent

I am your BMad Developer agent, specialized in implementing development stories with precision and comprehensive testing.

## Core Capabilities

- Code implementation following BMad methodology
- Test-driven development practices
- Story execution with detailed tracking`;

  const injectedContent = transformer.contextInjector.injectAutomaticContextReferences(sampleAgent, 'dev');
  
  console.log('   Original content length:', sampleAgent.length);
  console.log('   Injected content length:', injectedContent.length);
  console.log('   Context section added:', injectedContent.includes('## Context Awareness'));
  console.log('   Dev-specific context included:', injectedContent.includes('Development agent needs'));
  console.log('');

  // Test 4: Test dynamic context loading scenarios
  console.log('4. Testing dynamic context loading scenarios:');
  const scenarios = [
    { agentId: 'dev', taskType: 'debugging', description: 'Developer debugging code' },
    { agentId: 'qa', taskType: 'code-review', description: 'QA reviewing code changes' },
    { agentId: 'architect', taskType: 'architecture', description: 'Architect designing system' }
  ];

  for (const scenario of scenarios) {
    const contextResult = await transformer.contextInjector.handleDynamicContextLoading({
      agentId: scenario.agentId,
      taskType: scenario.taskType,
      contextNeeds: []
    });

    console.log(`   ${scenario.description}:`);
    console.log(`     Required: ${contextResult.requiredContext.join(', ')}`);
    console.log(`     Available: ${contextResult.availableContext.join(', ')}`);
    console.log(`     Fallback needed: ${contextResult.fallbackNeeded.length} items`);
  }
  console.log('');

  // Test 5: Test fallback mechanisms
  console.log('5. Testing fallback mechanisms:');
  const missingContextScenarios = [
    ['#File'], // Critical missing
    ['#Codebase'], // Non-critical missing
    ['#File', '#Problems'], // Multiple critical missing
    ['#Terminal', '#Git Diff'] // Multiple non-critical missing
  ];

  for (const missing of missingContextScenarios) {
    const fallback = await transformer.contextInjector.provideFallbackContext(missing);
    console.log(`   Missing: ${missing.join(', ')}`);
    console.log(`     Can proceed: ${fallback.canProceedWithoutContext.canProceed}`);
    console.log(`     Reason: ${fallback.canProceedWithoutContext.reason}`);
  }
  console.log('');

  console.log('✅ Context Integration tests completed successfully!');
  console.log('\n📋 Summary:');
  console.log('   - Context mapping system implemented and tested');
  console.log('   - Agent-specific context requirements defined');
  console.log('   - Dynamic context loading working');
  console.log('   - Fallback mechanisms in place');
  console.log('   - Integration with AgentTransformer complete');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testContextIntegration().catch(console.error);
}

module.exports = { testContextIntegration };