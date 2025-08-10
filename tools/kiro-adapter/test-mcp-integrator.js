/**
 * Test MCP Integrator functionality
 */

const MCPIntegrator = require('./mcp-integrator');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

async function testMCPIntegrator() {
  console.log('Testing MCP Integrator...\n');
  
  const integrator = new MCPIntegrator({ verbose: true });
  
  // Test 1: Create mock MCP configurations
  console.log('1. Testing MCP configuration loading...');
  
  const testWorkspaceDir = path.join(__dirname, 'test-output', 'mcp-test-workspace');
  const testKiroDir = path.join(testWorkspaceDir, '.kiro', 'settings');
  
  await fs.ensureDir(testKiroDir);
  
  // Create mock workspace MCP config
  const workspaceMcpConfig = {
    mcpServers: {
      'web-search': {
        command: 'uvx',
        args: ['web-search-mcp@latest'],
        disabled: false,
        autoApprove: ['search']
      },
      'api-testing': {
        command: 'uvx',
        args: ['api-test-mcp@latest'],
        disabled: false,
        autoApprove: ['test']
      },
      'documentation': {
        command: 'uvx',
        args: ['docs-mcp@latest'],
        disabled: true,
        autoApprove: []
      }
    }
  };
  
  await fs.writeFile(
    path.join(testKiroDir, 'mcp.json'),
    JSON.stringify(workspaceMcpConfig, null, 2)
  );
  
  // Test tool discovery
  const discoveredTools = await integrator.discoverAvailableMCPTools(testWorkspaceDir);
  console.log(`Discovered ${discoveredTools.length} tools:`, discoveredTools.map(t => t.name));
  
  // Test 2: Test agent-tool mapping
  console.log('\n2. Testing agent-tool mapping...');
  
  const agentTypes = ['analyst', 'pm', 'architect', 'dev', 'qa', 'sm'];
  
  for (const agentType of agentTypes) {
    const mappedTools = integrator.mapAgentToMCPTools(agentType, discoveredTools);
    console.log(`${agentType} agent mapped to ${mappedTools.length} tools:`, 
                mappedTools.map(t => `${t.name}(${t.priority})`));
  }
  
  // Test 3: Test automatic MCP usage integration
  console.log('\n3. Testing automatic MCP usage integration...');
  
  const sampleAgentContent = `# BMad Analyst Agent

I am your BMad Analyst, specialized in market research and competitive analysis.

## Context Awareness

I automatically access your current project context through:
- Current files and folders (#File, #Folder)
- Full codebase understanding (#Codebase)

## Capabilities

I can help you with:
- Market research and analysis
- Competitor analysis
- User research and personas`;

  const analystTools = integrator.mapAgentToMCPTools('analyst', discoveredTools);
  const enhancedContent = integrator.addAutomaticMCPUsage(sampleAgentContent, analystTools);
  
  console.log('Enhanced agent content preview:');
  console.log(enhancedContent.substring(0, 500) + '...\n');
  
  // Test 4: Test capability inference
  console.log('4. Testing capability inference...');
  
  const testTools = [
    'github-mcp',
    'aws-documentation-mcp',
    'http-client-mcp',
    'unknown-tool-mcp'
  ];
  
  for (const toolName of testTools) {
    const capabilities = integrator.inferToolCapabilities(toolName);
    console.log(`${toolName}: ${capabilities.join(', ')}`);
  }
  
  // Test 5: Test tool priority calculation
  console.log('\n5. Testing tool priority calculation...');
  
  const mockTool = {
    name: 'web-search',
    capabilities: ['research', 'market-analysis'],
    source: 'workspace'
  };
  
  for (const agentType of ['analyst', 'dev', 'architect']) {
    const priority = integrator.calculateToolPriority(mockTool, agentType);
    console.log(`web-search priority for ${agentType}: ${priority}`);
  }
  
  // Cleanup
  await fs.remove(testWorkspaceDir);
  
  console.log('\nMCP Integrator tests completed successfully!');
}

// Run tests if called directly
if (require.main === module) {
  testMCPIntegrator().catch(console.error);
}

module.exports = { testMCPIntegrator };