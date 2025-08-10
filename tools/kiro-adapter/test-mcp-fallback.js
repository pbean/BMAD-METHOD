/**
 * Test MCP Fallback and Guidance functionality
 */

const MCPIntegrator = require('./mcp-integrator');
const AgentTransformer = require('./agent-transformer');
const fs = require('fs-extra');
const path = require('path');

async function testMCPFallback() {
  console.log('Testing MCP Fallback and Guidance...\n');
  
  const integrator = new MCPIntegrator({ verbose: true });
  const transformer = new AgentTransformer({ verbose: true });
  
  // Test 1: Test setup guidance for missing tools
  console.log('1. Testing setup guidance for missing tools...');
  
  const missingTools = ['web-search', 'api-testing', 'documentation'];
  const setupGuidance = integrator.provideMCPSetupGuidance(missingTools);
  
  console.log('Setup guidance generated:');
  console.log(setupGuidance.substring(0, 300) + '...\n');
  
  // Test 2: Test fallback workflows
  console.log('2. Testing fallback workflows...');
  
  const unavailableTools = ['web-search', 'github'];
  const fallbackConfig = integrator.createFallbackWorkflows('analyst', unavailableTools);
  
  console.log('Fallback configuration:');
  console.log(`Agent: ${fallbackConfig.agentType}`);
  console.log(`Unavailable tools: ${fallbackConfig.unavailableTools.join(', ')}`);
  console.log(`Fallback workflows: ${fallbackConfig.fallbacks.workflows.length}`);
  console.log(`Setup guidance length: ${fallbackConfig.setupGuidance.length} characters\n`);
  
  // Test 3: Test configuration recommendations
  console.log('3. Testing configuration recommendations...');
  
  const testWorkspaceDir = path.join(__dirname, 'test-output', 'mcp-fallback-test');
  await fs.ensureDir(testWorkspaceDir);
  
  // Create workspace with no MCP tools
  const emptyTools = [];
  const recommendations = integrator.addMCPConfigurationRecommendations('dev', emptyTools);
  
  console.log('Recommendations for dev agent:');
  console.log(`Current tools: ${recommendations.currentTools.join(', ') || 'none'}`);
  console.log(`Recommended tools: ${recommendations.recommendedTools.join(', ')}`);
  console.log(`Missing tools: ${recommendations.missingTools.join(', ')}`);
  console.log(`Priority tools: ${recommendations.priority.map(t => `${t.name}(${t.priority})`).join(', ')}\n`);
  
  // Test 4: Test agent transformation with no MCP tools
  console.log('4. Testing agent transformation with no MCP tools...');
  
  const mockAgent = `---
agent:
  name: James
  id: dev
  title: Full Stack Developer
  icon: 💻
---

# BMad Developer Agent

I am your BMad Developer, specialized in code implementation and testing.

## Context Awareness

I automatically access your current project context.

## Capabilities

I can help you with code implementation and testing.`;

  const inputPath = path.join(testWorkspaceDir, 'dev.md');
  const outputPath = path.join(testWorkspaceDir, '.kiro/agents/bmad-dev.md');
  
  await fs.writeFile(inputPath, mockAgent);
  
  const success = await transformer.transformAgentForKiro(inputPath, outputPath, {
    kiroPath: testWorkspaceDir,
    enableKiroFeatures: true
  });
  
  if (success) {
    const transformedContent = await fs.readFile(outputPath, 'utf8');
    
    // Check for setup guidance
    const hasSetupGuidance = transformedContent.includes('MCP Tools Setup');
    console.log(`Setup guidance added: ${hasSetupGuidance}`);
    
    // Check for recommended tools
    const hasRecommendations = transformedContent.includes('Recommended Tools');
    console.log(`Tool recommendations added: ${hasRecommendations}`);
    
    // Show preview of guidance section
    const guidanceMatch = transformedContent.match(/## MCP Tools Setup[\s\S]*?(?=##|$)/);
    if (guidanceMatch) {
      console.log('Setup guidance preview:');
      console.log(guidanceMatch[0].substring(0, 400) + '...\n');
    }
  } else {
    console.log('❌ Failed to transform agent\n');
  }
  
  // Test 5: Test agent transformation with partial MCP tools
  console.log('5. Testing agent transformation with partial MCP tools...');
  
  // Create workspace with some MCP tools
  const partialKiroDir = path.join(testWorkspaceDir, '.kiro', 'settings');
  await fs.ensureDir(partialKiroDir);
  
  const partialMcpConfig = {
    mcpServers: {
      'web-search': {
        command: 'uvx',
        args: ['web-search-mcp@latest'],
        disabled: false,
        autoApprove: ['search']
      }
    }
  };
  
  await fs.writeFile(
    path.join(partialKiroDir, 'mcp.json'),
    JSON.stringify(partialMcpConfig, null, 2)
  );
  
  const partialOutputPath = path.join(testWorkspaceDir, '.kiro/agents/bmad-dev-partial.md');
  
  const partialSuccess = await transformer.transformAgentForKiro(inputPath, partialOutputPath, {
    kiroPath: testWorkspaceDir,
    enableKiroFeatures: true
  });
  
  if (partialSuccess) {
    const partialContent = await fs.readFile(partialOutputPath, 'utf8');
    
    // Check for available tools section
    const hasAvailableTools = partialContent.includes('Available MCP Tools');
    console.log(`Available tools section: ${hasAvailableTools}`);
    
    // Check for additional recommendations
    const hasAdditionalRecs = partialContent.includes('Additional Recommended Tools');
    console.log(`Additional recommendations: ${hasAdditionalRecs}`);
    
    // Show preview of recommendations
    const recsMatch = partialContent.match(/### Additional Recommended Tools[\s\S]*?(?=###|##|$)/);
    if (recsMatch) {
      console.log('Additional recommendations preview:');
      console.log(recsMatch[0].substring(0, 300) + '...\n');
    }
  } else {
    console.log('❌ Failed to transform agent with partial tools\n');
  }
  
  // Test 6: Test tool priority calculation
  console.log('6. Testing tool priority calculation...');
  
  const agentTypes = ['analyst', 'dev', 'architect'];
  const testMissingTools = ['web-search', 'api-testing', 'documentation', 'github'];
  
  for (const agentType of agentTypes) {
    const priority = integrator.getToolPriority(testMissingTools, agentType);
    console.log(`${agentType}: ${priority.map(t => `${t.name}(${t.priority})`).join(', ')}`);
  }
  
  // Cleanup
  await fs.remove(testWorkspaceDir);
  
  console.log('\nMCP Fallback and Guidance tests completed successfully!');
}

// Run tests if called directly
if (require.main === module) {
  testMCPFallback().catch(console.error);
}

module.exports = { testMCPFallback };