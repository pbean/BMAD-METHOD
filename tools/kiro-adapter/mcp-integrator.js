/**
 * MCP Integrator
 * Enables BMad agents to leverage Kiro's MCP tools for external integrations
 */

const BaseTransformer = require('./base-transformer');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class MCPIntegrator extends BaseTransformer {
  constructor(options = {}) {
    super(options);
    this.mcpToolMappings = {
      'web-search': ['analyst', 'pm', 'architect'],
      'api-testing': ['dev', 'qa'],
      'documentation': ['architect', 'pm', 'analyst'],
      'http-client': ['dev', 'qa'],
      'database': ['dev', 'architect'],
      'file-system': ['dev', 'architect'],
      'git': ['dev', 'sm'],
      'aws-docs': ['architect', 'dev'],
      'github': ['dev', 'sm', 'pm']
    };
    
    // Common MCP tool patterns and their capabilities
    this.mcpToolCapabilities = {
      'web-search': ['research', 'market-analysis', 'documentation-lookup'],
      'api-testing': ['endpoint-testing', 'integration-testing', 'api-validation'],
      'documentation': ['doc-generation', 'spec-creation', 'knowledge-base'],
      'http-client': ['api-calls', 'webhook-testing', 'service-integration'],
      'database': ['schema-design', 'query-optimization', 'data-modeling'],
      'file-system': ['file-operations', 'project-structure', 'code-organization'],
      'git': ['version-control', 'branch-management', 'commit-analysis'],
      'aws-docs': ['cloud-architecture', 'service-documentation', 'best-practices'],
      'github': ['repository-management', 'issue-tracking', 'pr-automation']
    };
  }

  /**
   * Discover available MCP tools from Kiro configuration
   * @param {string} kiroPath - Path to Kiro workspace
   * @returns {Promise<Array>} - Available MCP tools
   */
  async discoverAvailableMCPTools(kiroPath) {
    const availableTools = [];
    
    try {
      // Check workspace-level MCP configuration
      const workspaceMcpPath = path.join(kiroPath, '.kiro', 'settings', 'mcp.json');
      if (await fs.pathExists(workspaceMcpPath)) {
        const workspaceConfig = await this.loadMCPConfig(workspaceMcpPath);
        availableTools.push(...this.extractToolsFromConfig(workspaceConfig, 'workspace'));
      }
      
      // Check user-level MCP configuration
      const userMcpPath = path.join(os.homedir(), '.kiro', 'settings', 'mcp.json');
      if (await fs.pathExists(userMcpPath)) {
        const userConfig = await this.loadMCPConfig(userMcpPath);
        availableTools.push(...this.extractToolsFromConfig(userConfig, 'user'));
      }
      
      // Remove duplicates, prioritizing workspace config over user config
      const uniqueTools = this.deduplicateTools(availableTools);
      
      this.log(`Discovered ${uniqueTools.length} MCP tools: ${uniqueTools.map(t => t.name).join(', ')}`);
      return uniqueTools;
      
    } catch (error) {
      this.log(`Error discovering MCP tools: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Map BMad agent needs to appropriate MCP tools
   * @param {string} agentType - Type of BMad agent
   * @param {Array} availableTools - Available MCP tools
   * @returns {Array} - Mapped tools for agent
   */
  mapAgentToMCPTools(agentType, availableTools) {
    const agentToolNeeds = this.getAgentToolNeeds(agentType);
    const mappedTools = [];
    
    for (const tool of availableTools) {
      if (this.isToolRelevantForAgent(tool, agentType, agentToolNeeds)) {
        mappedTools.push({
          name: tool.name,
          capabilities: tool.capabilities,
          priority: this.calculateToolPriority(tool, agentType),
          usage: this.getToolUsageGuidance(tool, agentType)
        });
      }
    }
    
    // Sort by priority (higher priority first)
    mappedTools.sort((a, b) => b.priority - a.priority);
    
    this.log(`Mapped ${mappedTools.length} tools for ${agentType} agent`);
    return mappedTools;
  }

  /**
   * Provide setup guidance when required MCP tools are missing
   * @param {Array} missingTools - List of missing tools
   * @returns {string} - Setup guidance
   */
  provideMCPSetupGuidance(missingTools) {
    if (!missingTools || missingTools.length === 0) {
      return '';
    }

    const guidance = [];
    guidance.push('## MCP Tool Setup Guidance\n');
    guidance.push('The following MCP tools would enhance your BMad workflow but are not currently configured:\n');

    for (const tool of missingTools) {
      const toolGuidance = this.getToolSetupInstructions(tool);
      guidance.push(`### ${tool}`);
      guidance.push(toolGuidance);
      guidance.push('');
    }

    guidance.push('### General MCP Setup');
    guidance.push('To configure MCP tools in Kiro:');
    guidance.push('1. Create or edit `.kiro/settings/mcp.json` in your workspace');
    guidance.push('2. Add the desired MCP server configuration');
    guidance.push('3. Restart Kiro or reconnect MCP servers from the MCP Server view');
    guidance.push('4. Tools will be automatically available to BMad agents');
    guidance.push('');
    guidance.push('For more information, see the Kiro MCP documentation or use the command palette to search for "MCP".');

    return guidance.join('\n');
  }

  /**
   * Create fallback workflows when MCP tools are unavailable
   * @param {string} agentType - Type of BMad agent
   * @param {Array} unavailableTools - Unavailable tools
   * @returns {Object} - Fallback workflow configuration
   */
  createFallbackWorkflows(agentType, unavailableTools) {
    const fallbacks = {
      workflows: [],
      guidance: [],
      alternatives: []
    };

    for (const tool of unavailableTools) {
      const fallback = this.getToolFallback(tool, agentType);
      if (fallback) {
        fallbacks.workflows.push(fallback.workflow);
        fallbacks.guidance.push(fallback.guidance);
        fallbacks.alternatives.push(fallback.alternative);
      }
    }

    return {
      agentType,
      unavailableTools,
      fallbacks,
      setupGuidance: this.provideMCPSetupGuidance(unavailableTools),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Load MCP configuration from file
   * @param {string} configPath - Path to MCP config file
   * @returns {Promise<Object>} - MCP configuration
   */
  async loadMCPConfig(configPath) {
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      this.log(`Failed to load MCP config from ${configPath}: ${error.message}`, 'error');
      return { mcpServers: {} };
    }
  }

  /**
   * Extract tools from MCP configuration
   * @param {Object} config - MCP configuration object
   * @param {string} source - Source of configuration (workspace/user)
   * @returns {Array} - Extracted tools
   */
  extractToolsFromConfig(config, source) {
    const tools = [];
    
    if (!config.mcpServers) {
      return tools;
    }
    
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      if (serverConfig.disabled) {
        continue;
      }
      
      const tool = {
        name: serverName,
        source: source,
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env || {},
        autoApprove: serverConfig.autoApprove || [],
        capabilities: this.inferToolCapabilities(serverName),
        enabled: !serverConfig.disabled
      };
      
      tools.push(tool);
    }
    
    return tools;
  }

  /**
   * Remove duplicate tools, prioritizing workspace over user config
   * @param {Array} tools - Array of tools
   * @returns {Array} - Deduplicated tools
   */
  deduplicateTools(tools) {
    const toolMap = new Map();
    
    // Process tools, workspace config takes precedence
    for (const tool of tools) {
      const existing = toolMap.get(tool.name);
      if (!existing || tool.source === 'workspace') {
        toolMap.set(tool.name, tool);
      }
    }
    
    return Array.from(toolMap.values());
  }

  /**
   * Infer tool capabilities from tool name
   * @param {string} toolName - Name of the tool
   * @returns {Array} - Inferred capabilities
   */
  inferToolCapabilities(toolName) {
    // Check for exact matches first
    if (this.mcpToolCapabilities[toolName]) {
      return this.mcpToolCapabilities[toolName];
    }
    
    // Check for partial matches
    for (const [pattern, capabilities] of Object.entries(this.mcpToolCapabilities)) {
      if (toolName.includes(pattern) || pattern.includes(toolName)) {
        return capabilities;
      }
    }
    
    // Default capabilities based on common patterns
    if (toolName.includes('search') || toolName.includes('web')) {
      return ['research', 'data-gathering'];
    }
    if (toolName.includes('api') || toolName.includes('http')) {
      return ['api-testing', 'integration-testing'];
    }
    if (toolName.includes('doc') || toolName.includes('wiki')) {
      return ['documentation', 'knowledge-base'];
    }
    if (toolName.includes('git') || toolName.includes('github')) {
      return ['version-control', 'repository-management'];
    }
    if (toolName.includes('aws') || toolName.includes('cloud')) {
      return ['cloud-services', 'infrastructure'];
    }
    
    return ['general-purpose'];
  }

  /**
   * Get tool needs for specific agent type
   * @param {string} agentType - Type of BMad agent
   * @returns {Array} - Tool needs for the agent
   */
  getAgentToolNeeds(agentType) {
    const agentNeeds = {
      'analyst': ['research', 'market-analysis', 'data-gathering', 'web-search'],
      'pm': ['research', 'documentation', 'project-management', 'communication'],
      'architect': ['documentation', 'cloud-services', 'infrastructure', 'best-practices'],
      'dev': ['api-testing', 'integration-testing', 'version-control', 'file-operations'],
      'qa': ['api-testing', 'integration-testing', 'endpoint-testing', 'validation'],
      'sm': ['project-management', 'version-control', 'repository-management', 'tracking']
    };
    
    return agentNeeds[agentType] || ['general-purpose'];
  }

  /**
   * Check if tool is relevant for agent
   * @param {Object} tool - Tool object
   * @param {string} agentType - Agent type
   * @param {Array} agentNeeds - Agent tool needs
   * @returns {boolean} - Whether tool is relevant
   */
  isToolRelevantForAgent(tool, agentType, agentNeeds) {
    // Check if agent type is in tool mappings
    if (this.mcpToolMappings[tool.name] && 
        this.mcpToolMappings[tool.name].includes(agentType)) {
      return true;
    }
    
    // Check if tool capabilities match agent needs
    const toolCapabilities = tool.capabilities || [];
    return agentNeeds.some(need => 
      toolCapabilities.some(capability => 
        capability.includes(need) || need.includes(capability)
      )
    );
  }

  /**
   * Calculate tool priority for agent
   * @param {Object} tool - Tool object
   * @param {string} agentType - Agent type
   * @returns {number} - Priority score (higher is better)
   */
  calculateToolPriority(tool, agentType) {
    let priority = 0;
    
    // Higher priority for tools explicitly mapped to agent
    if (this.mcpToolMappings[tool.name] && 
        this.mcpToolMappings[tool.name].includes(agentType)) {
      priority += 10;
    }
    
    // Priority based on capability match
    const agentNeeds = this.getAgentToolNeeds(agentType);
    const toolCapabilities = tool.capabilities || [];
    
    for (const need of agentNeeds) {
      for (const capability of toolCapabilities) {
        if (capability.includes(need) || need.includes(capability)) {
          priority += 5;
        }
      }
    }
    
    // Bonus for workspace-level tools (more specific to project)
    if (tool.source === 'workspace') {
      priority += 2;
    }
    
    return priority;
  }

  /**
   * Get tool usage guidance for agent
   * @param {Object} tool - Tool object
   * @param {string} agentType - Agent type
   * @returns {string} - Usage guidance
   */
  getToolUsageGuidance(tool, agentType) {
    const agentGuidance = {
      'analyst': {
        'web-search': 'Use for market research, competitor analysis, and trend investigation',
        'documentation': 'Use for creating research reports and analysis documents',
        'default': 'Use for research and data gathering activities'
      },
      'pm': {
        'web-search': 'Use for market research and requirement validation',
        'documentation': 'Use for creating PRDs and project documentation',
        'github': 'Use for project tracking and issue management',
        'default': 'Use for project planning and documentation activities'
      },
      'architect': {
        'documentation': 'Use for creating architecture documents and technical specs',
        'aws-docs': 'Use for cloud architecture guidance and best practices',
        'api-testing': 'Use for API design validation and testing',
        'default': 'Use for architecture design and technical documentation'
      },
      'dev': {
        'api-testing': 'Use for endpoint testing and API validation',
        'http-client': 'Use for service integration and API calls',
        'git': 'Use for version control and code management',
        'default': 'Use for development and testing activities'
      },
      'qa': {
        'api-testing': 'Use for comprehensive API testing and validation',
        'http-client': 'Use for integration testing and service validation',
        'default': 'Use for testing and quality assurance activities'
      },
      'sm': {
        'github': 'Use for sprint planning and issue tracking',
        'git': 'Use for release management and branch coordination',
        'default': 'Use for project management and coordination activities'
      }
    };
    
    const agentSpecificGuidance = agentGuidance[agentType] || {};
    return agentSpecificGuidance[tool.name] || agentSpecificGuidance.default || 
           'Use this tool to enhance your workflow capabilities';
  }

  /**
   * Add automatic MCP tool usage to agent workflows
   * @param {string} agentContent - Agent content
   * @param {Array} mappedTools - Mapped tools for agent
   * @returns {string} - Enhanced agent content
   */
  addAutomaticMCPUsage(agentContent, mappedTools) {
    if (!mappedTools || mappedTools.length === 0) {
      return agentContent;
    }
    
    // Add MCP tools section to agent content
    const mcpSection = this.generateMCPSection(mappedTools);
    
    // Find a good place to insert the MCP section
    const contextAwarenessMatch = agentContent.match(/## Context Awareness[\s\S]*?(?=##|$)/);
    if (contextAwarenessMatch) {
      // Insert after Context Awareness section
      const insertPoint = contextAwarenessMatch.index + contextAwarenessMatch[0].length;
      return agentContent.slice(0, insertPoint) + '\n\n' + mcpSection + '\n' + 
             agentContent.slice(insertPoint);
    }
    
    // If no Context Awareness section, add before Capabilities
    const capabilitiesMatch = agentContent.match(/## Capabilities/);
    if (capabilitiesMatch) {
      const insertPoint = capabilitiesMatch.index;
      return agentContent.slice(0, insertPoint) + mcpSection + '\n\n' + 
             agentContent.slice(insertPoint);
    }
    
    // Fallback: append to end
    return agentContent + '\n\n' + mcpSection;
  }

  /**
   * Generate MCP tools section for agent
   * @param {Array} mappedTools - Mapped tools
   * @returns {string} - MCP section content
   */
  generateMCPSection(mappedTools) {
    const toolList = mappedTools.map(tool => 
      `- **${tool.name}**: ${tool.usage}`
    ).join('\n');
    
    return `## Available MCP Tools

I have access to the following external tools to enhance my capabilities:

${toolList}

These tools are automatically available when needed and will be used seamlessly during our interactions to provide more comprehensive assistance.`;
  }

  /**
   * Get setup instructions for a specific tool
   * @param {string} toolName - Name of the tool
   * @returns {string} - Setup instructions
   */
  getToolSetupInstructions(toolName) {
    const instructions = {
      'web-search': `**Web Search MCP Tool**
- Install: \`uvx web-search-mcp@latest\`
- Configuration:
\`\`\`json
{
  "mcpServers": {
    "web-search": {
      "command": "uvx",
      "args": ["web-search-mcp@latest"],
      "disabled": false,
      "autoApprove": ["search"]
    }
  }
}
\`\`\`
- Benefits: Enables real-time web research, market analysis, and competitive intelligence`,

      'api-testing': `**API Testing MCP Tool**
- Install: \`uvx api-testing-mcp@latest\`
- Configuration:
\`\`\`json
{
  "mcpServers": {
    "api-testing": {
      "command": "uvx",
      "args": ["api-testing-mcp@latest"],
      "disabled": false,
      "autoApprove": ["test", "validate"]
    }
  }
}
\`\`\`
- Benefits: Automated API endpoint testing, integration validation, and service health checks`,

      'documentation': `**Documentation MCP Tool**
- Install: \`uvx documentation-mcp@latest\`
- Configuration:
\`\`\`json
{
  "mcpServers": {
    "documentation": {
      "command": "uvx",
      "args": ["documentation-mcp@latest"],
      "disabled": false,
      "autoApprove": ["generate", "update"]
    }
  }
}
\`\`\`
- Benefits: Automated documentation generation, spec creation, and knowledge base management`,

      'github': `**GitHub MCP Tool**
- Install: \`uvx github-mcp@latest\`
- Configuration:
\`\`\`json
{
  "mcpServers": {
    "github": {
      "command": "uvx",
      "args": ["github-mcp@latest"],
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      },
      "disabled": false,
      "autoApprove": ["read"]
    }
  }
}
\`\`\`
- Benefits: Repository management, issue tracking, PR automation, and project coordination`,

      'aws-docs': `**AWS Documentation MCP Tool**
- Install: \`uvx awslabs.aws-documentation-mcp-server@latest\`
- Configuration:
\`\`\`json
{
  "mcpServers": {
    "aws-docs": {
      "command": "uvx",
      "args": ["awslabs.aws-documentation-mcp-server@latest"],
      "env": {
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
\`\`\`
- Benefits: Access to AWS service documentation, best practices, and architecture guidance`
    };

    return instructions[toolName] || `**${toolName}**
- This tool would enhance your workflow but specific setup instructions are not available
- Check the MCP tool registry or documentation for installation details
- Add the tool configuration to your \`.kiro/settings/mcp.json\` file`;
  }

  /**
   * Get fallback workflow for unavailable tool
   * @param {string} toolName - Name of the tool
   * @param {string} agentType - Type of agent
   * @returns {Object} - Fallback configuration
   */
  getToolFallback(toolName, agentType) {
    const fallbacks = {
      'web-search': {
        workflow: 'manual-research',
        guidance: 'I can guide you through manual research processes using available context and knowledge',
        alternative: 'Use #Codebase context and existing documentation for research, or manually search and share findings'
      },
      'api-testing': {
        workflow: 'manual-testing',
        guidance: 'I can provide testing scripts and guidance for manual API testing',
        alternative: 'Use curl commands, Postman, or write custom test scripts based on my guidance'
      },
      'documentation': {
        workflow: 'manual-documentation',
        guidance: 'I can help structure and write documentation manually using available context',
        alternative: 'Create documentation files manually with my guidance and templates'
      },
      'github': {
        workflow: 'manual-git',
        guidance: 'I can provide git commands and GitHub workflow guidance',
        alternative: 'Use git CLI commands and GitHub web interface with my step-by-step guidance'
      },
      'aws-docs': {
        workflow: 'manual-aws-research',
        guidance: 'I can provide AWS architecture guidance based on general knowledge',
        alternative: 'Manually reference AWS documentation and share relevant sections for analysis'
      }
    };

    const baseFallback = fallbacks[toolName];
    if (!baseFallback) {
      return {
        workflow: 'manual-alternative',
        guidance: `I can provide guidance for ${toolName} tasks using available context and knowledge`,
        alternative: `Perform ${toolName} tasks manually with my step-by-step guidance`
      };
    }

    return baseFallback;
  }

  /**
   * Add MCP configuration recommendations for BMad workflows
   * @param {string} agentType - Type of BMad agent
   * @param {Array} availableTools - Currently available tools
   * @returns {Object} - Configuration recommendations
   */
  addMCPConfigurationRecommendations(agentType, availableTools) {
    const agentNeeds = this.getAgentToolNeeds(agentType);
    const availableToolNames = availableTools.map(t => t.name);
    const missingTools = [];

    // Find recommended tools that are missing
    const recommendedTools = this.getRecommendedToolsForAgent(agentType);
    for (const tool of recommendedTools) {
      if (!availableToolNames.includes(tool)) {
        missingTools.push(tool);
      }
    }

    return {
      agentType,
      currentTools: availableToolNames,
      recommendedTools,
      missingTools,
      setupGuidance: this.provideMCPSetupGuidance(missingTools),
      priority: this.getToolPriority(missingTools, agentType)
    };
  }

  /**
   * Get recommended tools for specific agent type
   * @param {string} agentType - Type of agent
   * @returns {Array} - Recommended tool names
   */
  getRecommendedToolsForAgent(agentType) {
    const recommendations = {
      'analyst': ['web-search', 'documentation', 'github'],
      'pm': ['web-search', 'documentation', 'github'],
      'architect': ['documentation', 'aws-docs', 'web-search', 'api-testing'],
      'dev': ['api-testing', 'github', 'aws-docs'],
      'qa': ['api-testing', 'github', 'web-search'],
      'sm': ['github', 'web-search', 'documentation']
    };

    return recommendations[agentType] || ['web-search', 'documentation'];
  }

  /**
   * Get priority ranking for missing tools
   * @param {Array} missingTools - Missing tool names
   * @param {string} agentType - Type of agent
   * @returns {Array} - Tools sorted by priority
   */
  getToolPriority(missingTools, agentType) {
    const priorities = {
      'analyst': { 'web-search': 10, 'documentation': 8, 'github': 6 },
      'pm': { 'web-search': 9, 'documentation': 10, 'github': 8 },
      'architect': { 'documentation': 10, 'aws-docs': 9, 'web-search': 7, 'api-testing': 6 },
      'dev': { 'api-testing': 10, 'github': 9, 'aws-docs': 7 },
      'qa': { 'api-testing': 10, 'github': 8, 'web-search': 6 },
      'sm': { 'github': 10, 'web-search': 8, 'documentation': 7 }
    };

    const agentPriorities = priorities[agentType] || {};
    
    return missingTools
      .map(tool => ({
        name: tool,
        priority: agentPriorities[tool] || 5
      }))
      .sort((a, b) => b.priority - a.priority);
  }
}

module.exports = MCPIntegrator;