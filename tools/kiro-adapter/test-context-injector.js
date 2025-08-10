/**
 * Test script for Context Injector
 * Tests the context mapping system functionality
 */

const ContextInjector = require('./context-injector');

async function testContextMappingSystem() {
  console.log('🧪 Testing Context Mapping System\n');
  
  const injector = new ContextInjector();

  // Test 1: BMad context to Kiro mapping
  console.log('1. Testing BMad context to Kiro mapping:');
  const bmadNeeds = [
    'current file',
    'project structure', 
    'build issues',
    'recent changes',
    'error messages',
    'code repository'
  ];
  
  const mappingResult = injector.mapBMadContextToKiro(bmadNeeds);
  console.log('   BMad needs:', bmadNeeds);
  console.log('   Mapped to Kiro:', mappingResult.mapped);
  console.log('   Unmapped:', mappingResult.unmapped);
  console.log('');

  // Test 2: Agent-specific context requirements
  console.log('2. Testing agent-specific context requirements:');
  const agents = ['dev', 'qa', 'architect', 'pm'];
  
  for (const agentId of agents) {
    const requirements = injector.agentContextRequirements[agentId];
    if (requirements) {
      console.log(`   ${agentId.toUpperCase()} Agent:`);
      console.log(`     Primary: ${requirements.primary.join(', ')}`);
      console.log(`     Secondary: ${requirements.secondary.join(', ')}`);
      console.log(`     Description: ${requirements.description}`);
    }
  }
  console.log('');

  // Test 3: Dynamic context loading
  console.log('3. Testing dynamic context loading:');
  const contextRequest = {
    agentId: 'dev',
    taskType: 'code-review',
    contextNeeds: ['current file', 'build issues']
  };
  
  const contextResult = await injector.handleDynamicContextLoading(contextRequest);
  console.log('   Request:', contextRequest);
  console.log('   Required context:', contextResult.requiredContext);
  console.log('   Available context:', contextResult.availableContext);
  console.log('   Fallback needed:', contextResult.fallbackNeeded);
  console.log('');

  // Test 4: Fallback context handling
  console.log('4. Testing fallback context handling:');
  const missingContext = ['#Codebase', '#Terminal', '#Git Diff'];
  
  const fallbackResult = await injector.provideFallbackContext(missingContext);
  console.log('   Missing context:', missingContext);
  console.log('   Can proceed:', fallbackResult.canProceedWithoutContext.canProceed);
  console.log('   Reason:', fallbackResult.canProceedWithoutContext.reason);
  console.log('   Fallback instructions:');
  fallbackResult.fallbackInstructions.forEach(f => {
    console.log(`     - ${f.missing}: ${f.instruction} (priority: ${f.priority})`);
  });
  console.log('');

  // Test 5: Context injection into agent content
  console.log('5. Testing context injection into agent content:');
  const sampleAgentContent = `# dev

ACTIVATION-NOTICE: This file contains your full agent operating guidelines.

\`\`\`yaml
agent:
  name: James
  id: dev
  title: Full Stack Developer
\`\`\`

# BMad Developer Agent

I am your BMad Developer agent...`;

  const injectedContent = injector.injectAutomaticContextReferences(sampleAgentContent, 'dev');
  console.log('   Original content length:', sampleAgentContent.length);
  console.log('   Injected content length:', injectedContent.length);
  console.log('   Context section added:', injectedContent.includes('## Context Awareness'));
  console.log('');

  console.log('✅ Context Mapping System tests completed successfully!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testContextMappingSystem().catch(console.error);
}

module.exports = { testContextMappingSystem };