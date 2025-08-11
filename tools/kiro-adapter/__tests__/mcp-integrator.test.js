/**
 * Unit tests for MCPIntegrator
 * Tests the MCP tool discovery and integration system
 */

const MCPIntegrator = require('../mcp-integrator');
const path = require('path');
const fs = require('fs-extra');

describe('MCPIntegrator', () => {
  let integrator;
  const testOutputDir = path.join(__dirname, '../test-output');

  beforeEach(() => {
    integrator = new MCPIntegrator();
  });

  afterEach(async () => {
    // Clean up test output
    await fs.remove(testOutputDir);
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(integrator).toBeDefined();
      expect(integrator.options).toBeDefined();
    });

    it('should accept custom options', () => {
      const customIntegrator = new MCPIntegrator({
        enableAutoDiscovery: false,
        validateTools: false
      });
      expect(customIntegrator.options.enableAutoDiscovery).toBe(false);
    });
  });

  describe('discoverAvailableMCPTools', () => {
    beforeEach(async () => {
      await fs.ensureDir(testOutputDir);
    });

    it('should discover MCP tools from Kiro config', async () => {
      // Create mock Kiro MCP config
      const mockMCPConfig = {
        mcpServers: {
          'web-search': {
            command: 'uvx',
            args: ['web-search-mcp@latest'],
            disabled: false,
            autoApprove: ['search', 'browse']
          },
          'documentation': {
            command: 'uvx',
            args: ['docs-mcp@latest'],
            disabled: false,
            autoApprove: ['generate', 'update']
          },
          'disabled-tool': {
            command: 'uvx',
            args: ['disabled-mcp@latest'],
            disabled: true
          }
        }
      };

      const configPath = path.join(testOutputDir, '.kiro/settings/mcp.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJSON(configPath, mockMCPConfig);

      const tools = await integrator.discoverAvailableMCPTools(testOutputDir);
      
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(2); // Should exclude disabled tool
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('web-search');
      expect(toolNames).toContain('documentation');
      expect(toolNames).not.toContain('disabled-tool');
    });

    it('should handle missing MCP config gracefully', async () => {
      const tools = await integrator.discoverAvailableMCPTools(testOutputDir);
      
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBe(0);
    });

    it('should merge workspace and user level configs', async () => {
      // Create workspace config
      const workspaceConfig = {
        mcpServers: {
          'workspace-tool': {
            command: 'uvx',
            args: ['workspace-mcp@latest'],
            disabled: false
          }
        }
      };

      const workspaceConfigPath = path.join(testOutputDir, '.kiro/settings/mcp.json');
      await fs.ensureDir(path.dirname(workspaceConfigPath));
      await fs.writeJSON(workspaceConfigPath, workspaceConfig);

      // Mock user config discovery
      integrator.getUserLevelMCPConfig = jest.fn().mockResolvedValue({
        mcpServers: {
          'user-tool': {
            command: 'uvx',
            args: ['user-mcp@latest'],
            disabled: false
          }
        }
      });

      const tools = await integrator.discoverAvailableMCPTools(testOutputDir);
      
      expect(tools.length).toBe(2);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('workspace-tool');
      expect(toolNames).toContain('user-tool');
    });

    it('should prioritize workspace config over user config', async () => {
      const workspaceConfig = {
        mcpServers: {
          'shared-tool': {
            command: 'uvx',
            args: ['workspace-version@latest'],
            disabled: false,
            priority: 'workspace'
          }
        }
      };

      const workspaceConfigPath = path.join(testOutputDir, '.kiro/settings/mcp.json');
      await fs.ensureDir(path.dirname(workspaceConfigPath));
      await fs.writeJSON(workspaceConfigPath, workspaceConfig);

      integrator.getUserLevelMCPConfig = jest.fn().mockResolvedValue({
        mcpServers: {
          'shared-tool': {
            command: 'uvx',
            args: ['user-version@latest'],
            disabled: false,
            priority: 'user'
          }
        }
      });

      const tools = await integrator.discoverAvailableMCPTools(testOutputDir);
      
      expect(tools.length).toBe(1);
      expect(tools[0].priority).toBe('workspace');
    });
  });

  describe('mapBMadAgentToMCPTools', () => {
    const mockTools = [
      {
        name: 'web-search',
        capabilities: ['search', 'browse', 'scrape'],
        description: 'Web search and browsing tools'
      },
      {
        name: 'documentation',
        capabilities: ['generate', 'update', 'format'],
        description: 'Documentation generation tools'
      },
      {
        name: 'api-testing',
        capabilities: ['request', 'validate', 'mock'],
        description: 'API testing and validation tools'
      }
    ];

    it('should map BMad Analyst to web search tools', () => {
      const mapping = integrator.mapBMadAgentToMCPTools('analyst', mockTools);
      
      expect(mapping).toBeDefined();
      expect(mapping.recommended).toContain('web-search');
      expect(mapping.optional).toBeDefined();
    });

    it('should map BMad Dev to API testing tools', () => {
      const mapping = integrator.mapBMadAgentToMCPTools('dev', mockTools);
      
      expect(mapping.recommended).toContain('api-testing');
      expect(mapping.reasoning).toContain('API testing');
    });

    it('should map BMad Architect to documentation tools', () => {
      const mapping = integrator.mapBMadAgentToMCPTools('architect', mockTools);
      
      expect(mapping.recommended).toContain('documentation');
      expect(mapping.reasoning).toContain('documentation');
    });

    it('should handle unknown agent types', () => {
      const mapping = integrator.mapBMadAgentToMCPTools('unknown-agent', mockTools);
      
      expect(mapping).toBeDefined();
      expect(mapping.recommended).toBeDefined();
      expect(Array.isArray(mapping.recommended)).toBe(true);
    });

    it('should provide reasoning for tool recommendations', () => {
      const mapping = integrator.mapBMadAgentToMCPTools('analyst', mockTools);
      
      expect(mapping.reasoning).toBeDefined();
      expect(mapping.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('generateMCPIntegrationForAgent', () => {
    const mockAgent = {
      id: 'dev',
      name: 'BMad Developer',
      capabilities: ['coding', 'testing', 'debugging']
    };

    const mockTools = [
      {
        name: 'api-testing',
        capabilities: ['request', 'validate'],
        autoApprove: ['request']
      }
    ];

    it('should generate MCP integration configuration for agent', () => {
      const integration = integrator.generateMCPIntegrationForAgent(mockAgent, mockTools);
      
      expect(integration).toBeDefined();
      expect(integration.agentId).toBe('dev');
      expect(integration.mcpTools).toBeDefined();
      expect(integration.usage).toBeDefined();
    });

    it('should include tool usage instructions', () => {
      const integration = integrator.generateMCPIntegrationForAgent(mockAgent, mockTools);
      
      expect(integration.usage.instructions).toBeDefined();
      expect(integration.usage.examples).toBeDefined();
      expect(Array.isArray(integration.usage.examples)).toBe(true);
    });

    it('should include auto-approved tools', () => {
      const integration = integrator.generateMCPIntegrationForAgent(mockAgent, mockTools);
      
      expect(integration.mcpTools[0].autoApprove).toContain('request');
    });

    it('should handle agents with no suitable tools', () => {
      const integration = integrator.generateMCPIntegrationForAgent(mockAgent, []);
      
      expect(integration.mcpTools).toEqual([]);
      expect(integration.fallback).toBeDefined();
    });
  });

  describe('provideMCPSetupGuidance', () => {
    it('should provide setup guidance for missing tools', () => {
      const missingTools = ['web-search', 'documentation'];
      const guidance = integrator.provideMCPSetupGuidance(missingTools);
      
      expect(guidance).toBeDefined();
      expect(guidance.missingTools).toEqual(missingTools);
      expect(guidance.setupInstructions).toBeDefined();
      expect(Array.isArray(guidance.setupInstructions)).toBe(true);
    });

    it('should include installation commands', () => {
      const guidance = integrator.provideMCPSetupGuidance(['web-search']);
      
      const instructions = guidance.setupInstructions;
      expect(instructions.some(i => i.includes('uvx'))).toBe(true);
    });

    it('should provide configuration examples', () => {
      const guidance = integrator.provideMCPSetupGuidance(['web-search']);
      
      expect(guidance.configurationExample).toBeDefined();
      expect(guidance.configurationExample).toContain('mcpServers');
    });

    it('should handle empty missing tools list', () => {
      const guidance = integrator.provideMCPSetupGuidance([]);
      
      expect(guidance.missingTools).toEqual([]);
      expect(guidance.setupInstructions).toEqual([]);
    });
  });

  describe('createMCPFallbackWorkflow', () => {
    it('should create fallback workflow when MCP tools unavailable', () => {
      const agentId = 'analyst';
      const missingTools = ['web-search'];
      
      const fallback = integrator.createMCPFallbackWorkflow(agentId, missingTools);
      
      expect(fallback).toBeDefined();
      expect(fallback.agentId).toBe(agentId);
      expect(fallback.missingTools).toEqual(missingTools);
      expect(fallback.alternativeApproach).toBeDefined();
    });

    it('should provide alternative approaches for research tasks', () => {
      const fallback = integrator.createMCPFallbackWorkflow('analyst', ['web-search']);
      
      expect(fallback.alternativeApproach).toContain('manual research');
    });

    it('should provide alternative approaches for API testing', () => {
      const fallback = integrator.createMCPFallbackWorkflow('dev', ['api-testing']);
      
      expect(fallback.alternativeApproach).toContain('manual testing');
    });

    it('should include manual steps', () => {
      const fallback = integrator.createMCPFallbackWorkflow('analyst', ['web-search']);
      
      expect(fallback.manualSteps).toBeDefined();
      expect(Array.isArray(fallback.manualSteps)).toBe(true);
      expect(fallback.manualSteps.length).toBeGreaterThan(0);
    });
  });

  describe('validateMCPToolConfiguration', () => {
    it('should validate correct MCP tool configuration', () => {
      const validConfig = {
        name: 'web-search',
        command: 'uvx',
        args: ['web-search-mcp@latest'],
        disabled: false,
        autoApprove: ['search']
      };
      
      const isValid = integrator.validateMCPToolConfiguration(validConfig);
      expect(isValid).toBe(true);
    });

    it('should reject configuration without required fields', () => {
      const invalidConfig = {
        name: 'incomplete-tool'
        // Missing command and args
      };
      
      const isValid = integrator.validateMCPToolConfiguration(invalidConfig);
      expect(isValid).toBe(false);
    });

    it('should validate command format', () => {
      const configWithInvalidCommand = {
        name: 'test-tool',
        command: '', // Empty command
        args: ['test@latest'],
        disabled: false
      };
      
      const isValid = integrator.validateMCPToolConfiguration(configWithInvalidCommand);
      expect(isValid).toBe(false);
    });

    it('should validate args array', () => {
      const configWithInvalidArgs = {
        name: 'test-tool',
        command: 'uvx',
        args: 'not-an-array', // Should be array
        disabled: false
      };
      
      const isValid = integrator.validateMCPToolConfiguration(configWithInvalidArgs);
      expect(isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle file system errors when reading config', async () => {
      const nonExistentPath = '/non/existent/path';
      
      const tools = await integrator.discoverAvailableMCPTools(nonExistentPath);
      expect(tools).toEqual([]);
    });

    it('should handle malformed JSON in MCP config', async () => {
      const configPath = path.join(testOutputDir, '.kiro/settings/mcp.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeFile(configPath, '{ invalid json }');
      
      const tools = await integrator.discoverAvailableMCPTools(testOutputDir);
      expect(tools).toEqual([]);
    });

    it('should handle null/undefined inputs gracefully', () => {
      expect(() => integrator.mapBMadAgentToMCPTools(null, [])).not.toThrow();
      expect(() => integrator.mapBMadAgentToMCPTools('dev', null)).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete BMad workflow MCP integration', async () => {
      const mockWorkspaceConfig = {
        mcpServers: {
          'web-search': {
            command: 'uvx',
            args: ['web-search-mcp@latest'],
            disabled: false,
            autoApprove: ['search', 'browse']
          },
          'documentation': {
            command: 'uvx',
            args: ['docs-mcp@latest'],
            disabled: false,
            autoApprove: ['generate']
          },
          'api-testing': {
            command: 'uvx',
            args: ['api-test-mcp@latest'],
            disabled: false,
            autoApprove: ['request', 'validate']
          }
        }
      };

      const configPath = path.join(testOutputDir, '.kiro/settings/mcp.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJSON(configPath, mockWorkspaceConfig);

      const tools = await integrator.discoverAvailableMCPTools(testOutputDir);
      
      // Test integration for each BMad agent type
      const agents = ['analyst', 'dev', 'architect', 'pm', 'qa'];
      
      for (const agentId of agents) {
        const mapping = integrator.mapBMadAgentToMCPTools(agentId, tools);
        expect(mapping).toBeDefined();
        expect(mapping.recommended).toBeDefined();
        
        const mockAgent = { id: agentId, name: `BMad ${agentId}` };
        const integration = integrator.generateMCPIntegrationForAgent(mockAgent, tools);
        expect(integration.agentId).toBe(agentId);
      }
    });

    it('should provide comprehensive setup guidance for new installations', () => {
      const allPossibleTools = [
        'web-search', 'documentation', 'api-testing', 
        'database-tools', 'cloud-integration', 'monitoring'
      ];
      
      const guidance = integrator.provideMCPSetupGuidance(allPossibleTools);
      
      expect(guidance.setupInstructions.length).toBeGreaterThan(0);
      expect(guidance.configurationExample).toContain('mcpServers');
      
      // Should provide instructions for each tool type
      allPossibleTools.forEach(tool => {
        expect(guidance.setupInstructions.some(instruction => 
          instruction.includes(tool) || instruction.includes('uvx')
        )).toBe(true);
      });
    });

    it('should handle mixed availability scenarios', async () => {
      const partialConfig = {
        mcpServers: {
          'web-search': {
            command: 'uvx',
            args: ['web-search-mcp@latest'],
            disabled: false
          },
          'broken-tool': {
            command: 'invalid-command',
            args: [],
            disabled: false
          }
        }
      };

      const configPath = path.join(testOutputDir, '.kiro/settings/mcp.json');
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJSON(configPath, partialConfig);

      const tools = await integrator.discoverAvailableMCPTools(testOutputDir);
      
      // Should include valid tools and exclude invalid ones
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe('web-search');
      
      // Should provide fallback for missing/broken tools
      const fallback = integrator.createMCPFallbackWorkflow('dev', ['api-testing']);
      expect(fallback.alternativeApproach).toBeDefined();
    });
  });
});