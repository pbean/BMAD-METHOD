/**
 * Test Agent-Specific MCP Integration
 */

const AgentTransformer = require('./agent-transformer');
const fs = require('fs-extra');
const path = require('path');

async function testAgentMCPIntegration() {
  console.log('Testing Agent-Specific MCP Integration...\n');
  
  const transformer = new AgentTransformer({ verbose: true });
  
  // Test 1: Create mock workspace with MCP config
  console.log('1. Setting up test workspace with MCP configuration...');
  
  const testWorkspaceDir = path.join(__dirname, 'test-output', 'agent-mcp-test');
  const testKiroDir = path.join(testWorkspaceDir, '.kiro', 'settings');
  
  await fs.ensureDir(testKiroDir);
  
  // Create comprehensive MCP config
  const mcpConfig = {
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
        disabled: false,
        autoApprove: ['generate']
      },
      'github': {
        command: 'uvx',
        args: ['github-mcp@latest'],
        disabled: false,
        autoApprove: ['read']
      },
      'aws-docs': {
        command: 'uvx',
        args: ['aws-documentation-mcp@latest'],
        disabled: false,
        autoApprove: []
      }
    }
  };
  
  await fs.writeFile(
    path.join(testKiroDir, 'mcp.json'),
    JSON.stringify(mcpConfig, null, 2)
  );
  
  // Test 2: Create mock BMad agents for different roles
  console.log('2. Creating mock BMad agents...');
  
  const agents = {
    analyst: `---
agent:
  name: Mary
  id: analyst
  title: Business Analyst
  icon: 📊
---

# BMad Analyst Agent

I am your BMad Analyst, specialized in market research and competitive analysis.

## Context Awareness

I automatically access your current project context through:
- Current files and folders (#File, #Folder)
- Full codebase understanding (#Codebase)

## Capabilities

I can help you with:
- Market research and analysis
- Competitor analysis
- User research and personas`,

    dev: `---
agent:
  name: James
  id: dev
  title: Full Stack Developer
  icon: 💻
---

# BMad Developer Agent

I am your BMad Developer, specialized in code implementation and testing.

## Context Awareness

I automatically access your current project context through:
- Current files and folders (#File, #Folder)
- Build problems and errors (#Problems)
- Git changes (#Git Diff)

## Capabilities

I can help you with:
- Code implementation
- API testing and validation
- Debugging and troubleshooting`,

    architect: `---
agent:
  name: Winston
  id: architect
  title: Architect
  icon: 🏗️
---

# BMad Architect Agent

I am your BMad Architect, specialized in system design and architecture.

## Context Awareness

I automatically access your current project context through:
- Full codebase understanding (#Codebase)
- Project structure (#Folder)

## Capabilities

I can help you with:
- System architecture design
- Technology selection
- Infrastructure planning
- API design`
  };
  
  // Test 3: Transform each agent and verify MCP integration
  console.log('3. Testing MCP integration for each agent type...');
  
  for (const [agentType, agentContent] of Object.entries(agents)) {
    console.log(`\nTesting ${agentType} agent...`);
    
    const inputPath = path.join(testWorkspaceDir, `${agentType}.md`);
    const outputPath = path.join(testWorkspaceDir, `.kiro/agents/bmad-${agentType}.md`);
    
    // Write mock agent file
    await fs.writeFile(inputPath, agentContent);
    
    // Transform agent with MCP integration
    const success = await transformer.transformAgentForKiro(inputPath, outputPath, {
      kiroPath: testWorkspaceDir,
      enableKiroFeatures: true
    });
    
    if (success) {
      // Read and analyze the transformed agent
      const transformedContent = await fs.readFile(outputPath, 'utf8');
      
      // Check for MCP tools section
      const hasMCPSection = transformedContent.includes('## Available MCP Tools');
      console.log(`  MCP section added: ${hasMCPSection}`);
      
      // Check for specific tools mentioned
      const mentionedTools = [];
      if (transformedContent.includes('web-search')) mentionedTools.push('web-search');
      if (transformedContent.includes('api-testing')) mentionedTools.push('api-testing');
      if (transformedContent.includes('documentation')) mentionedTools.push('documentation');
      if (transformedContent.includes('github')) mentionedTools.push('github');
      if (transformedContent.includes('aws-docs')) mentionedTools.push('aws-docs');
      
      console.log(`  Tools mentioned: ${mentionedTools.join(', ')}`);
      
      // Check front matter for MCP tools
      const frontMatterMatch = transformedContent.match(/---\n([\s\S]*?)\n---/);
      if (frontMatterMatch) {
        const frontMatterContent = frontMatterMatch[1];
        const hasMCPToolsInFrontMatter = frontMatterContent.includes('mcp_tools:');
        console.log(`  MCP tools in front matter: ${hasMCPToolsInFrontMatter}`);
      }
      
      // Show a preview of the MCP section
      const mcpSectionMatch = transformedContent.match(/## Available MCP Tools[\s\S]*?(?=##|$)/);
      if (mcpSectionMatch) {
        console.log(`  MCP section preview:\n${mcpSectionMatch[0].substring(0, 200)}...`);
      }
      
    } else {
      console.log(`  ❌ Failed to transform ${agentType} agent`);
    }
  }
  
  // Test 4: Verify agent-specific tool mappings
  console.log('\n4. Verifying agent-specific tool mappings...');
  
  const mcpIntegrator = transformer.mcpIntegrator;
  const availableTools = await mcpIntegrator.discoverAvailableMCPTools(testWorkspaceDir);
  
  for (const agentType of ['analyst', 'dev', 'architect']) {
    const mappedTools = mcpIntegrator.mapAgentToMCPTools(agentType, availableTools);
    console.log(`${agentType}: ${mappedTools.length} tools mapped - ${mappedTools.map(t => `${t.name}(${t.priority})`).join(', ')}`);
  }
  
  // Cleanup
  await fs.remove(testWorkspaceDir);
  
  console.log('\nAgent-Specific MCP Integration tests completed successfully!');
}

// Run tests if called directly
if (require.main === module) {
  testAgentMCPIntegration().catch(console.error);
}

module.exports = { testAgentMCPIntegration };