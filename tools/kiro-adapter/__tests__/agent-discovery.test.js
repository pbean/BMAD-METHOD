/**
 * Tests for AgentDiscovery class
 */

const AgentDiscovery = require('../agent-discovery');
const fs = require('fs-extra');
const path = require('path');

// Mock fs-extra
jest.mock('fs-extra');

describe('AgentDiscovery', () => {
  let agentDiscovery;
  let mockRootPath;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRootPath = '/mock/project';
    agentDiscovery = new AgentDiscovery({
      rootPath: mockRootPath,
      verbose: false,
      validateDependencies: true
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const discovery = new AgentDiscovery();
      expect(discovery.options.rootPath).toBe(process.cwd());
      expect(discovery.options.verbose).toBe(false);
      expect(discovery.options.validateDependencies).toBe(true);
    });

    it('should initialize with custom options', () => {
      const options = {
        rootPath: '/custom/path',
        verbose: true,
        validateDependencies: false
      };
      const discovery = new AgentDiscovery(options);
      expect(discovery.options).toMatchObject(options);
    });
  });

  describe('scanAllAgents', () => {
    beforeEach(() => {
      // Mock core agents directory
      fs.pathExists.mockImplementation((path) => {
        if (path.includes('bmad-core/agents')) return Promise.resolve(true);
        if (path.includes('expansion-packs')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      fs.readdir.mockImplementation((path) => {
        if (path.includes('bmad-core/agents')) {
          return Promise.resolve(['pm.md', 'architect.md', 'dev.md']);
        }
        if (path.includes('expansion-packs')) {
          return Promise.resolve(['bmad-2d-phaser-game-dev', 'bmad-infrastructure-devops']);
        }
        if (path.includes('bmad-2d-phaser-game-dev/agents')) {
          return Promise.resolve(['game-developer.md', 'game-designer.md']);
        }
        if (path.includes('bmad-infrastructure-devops/agents')) {
          return Promise.resolve(['infra-devops-platform.md']);
        }
        return Promise.resolve([]);
      });

      fs.stat.mockResolvedValue({ isDirectory: () => true });
    });

    it('should scan all agents successfully', async () => {
      // Mock agent file content
      const mockAgentContent = `# pm

ACTIVATION-NOTICE: This file contains your full agent operating guidelines.

\`\`\`yaml
agent:
  name: John
  id: pm
  title: Product Manager
  icon: 📋
  whenToUse: Use for creating PRDs
persona:
  role: Product Manager
  style: Analytical
  identity: PM specialized in documentation
  focus: Creating PRDs
commands:
  - help: Show available commands
dependencies:
  tasks:
    - create-doc.md
  templates:
    - prd-tmpl.yaml
\`\`\``;

      fs.readFile.mockResolvedValue(mockAgentContent);
      fs.existsSync = jest.fn().mockReturnValue(true);

      const agents = await agentDiscovery.scanAllAgents();

      expect(agents.length).toBeGreaterThanOrEqual(3); // At least 3 core agents
      expect(fs.pathExists).toHaveBeenCalledWith(path.join(mockRootPath, 'bmad-core', 'agents'));
      expect(fs.pathExists).toHaveBeenCalledWith(path.join(mockRootPath, 'expansion-packs'));
    });

    it('should handle missing core agents directory', async () => {
      fs.pathExists.mockImplementation((path) => {
        if (path.includes('bmad-core/agents')) return Promise.resolve(false);
        if (path.includes('expansion-packs')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      fs.readdir.mockImplementation((path) => {
        if (path.includes('expansion-packs')) {
          return Promise.resolve(['bmad-2d-phaser-game-dev']);
        }
        return Promise.resolve([]);
      });

      const mockAgentContent = `# game-developer
\`\`\`yaml
agent:
  name: Maya
  id: game-developer
  title: Game Developer
persona:
  role: Game Developer
\`\`\``;

      fs.readFile.mockResolvedValue(mockAgentContent);

      const agents = await agentDiscovery.scanAllAgents();

      expect(agents.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors during scanning', async () => {
      fs.pathExists.mockRejectedValue(new Error('File system error'));

      await expect(agentDiscovery.scanAllAgents()).rejects.toThrow('File system error');
    });
  });

  describe('scanCoreAgents', () => {
    it('should scan core agents directory', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue(['pm.md', 'architect.md', 'not-agent.txt']);

      const mockAgentContent = `# pm
\`\`\`yaml
agent:
  name: John
  id: pm
  title: Product Manager
persona:
  role: Product Manager
\`\`\``;

      fs.readFile.mockResolvedValue(mockAgentContent);

      const agents = await agentDiscovery.scanCoreAgents();

      expect(agents).toHaveLength(2); // Only .md files
      expect(agents[0].source).toBe('bmad-core');
      expect(agents[0].type).toBe('core');
    });

    it('should return empty array if core agents directory does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);

      const agents = await agentDiscovery.scanCoreAgents();

      expect(agents).toHaveLength(0);
    });
  });

  describe('scanExpansionPackAgents', () => {
    it('should scan expansion pack agents', async () => {
      fs.pathExists.mockImplementation((path) => {
        if (path.includes('expansion-packs')) return Promise.resolve(true);
        if (path.includes('agents')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      fs.readdir.mockImplementation((path) => {
        if (path.includes('expansion-packs') && !path.includes('agents')) {
          return Promise.resolve(['bmad-2d-phaser-game-dev']);
        }
        if (path.includes('agents')) {
          return Promise.resolve(['game-developer.md']);
        }
        return Promise.resolve([]);
      });

      fs.stat.mockResolvedValue({ isDirectory: () => true });

      const mockAgentContent = `# game-developer
\`\`\`yaml
agent:
  name: Maya
  id: game-developer
  title: Game Developer
persona:
  role: Game Developer
\`\`\``;

      fs.readFile.mockResolvedValue(mockAgentContent);

      const agents = await agentDiscovery.scanExpansionPackAgents();

      expect(agents).toHaveLength(1);
      expect(agents[0].source).toBe('expansion-pack');
      expect(agents[0].type).toBe('expansion');
      expect(agents[0].expansionPack).toBe('bmad-2d-phaser-game-dev');
    });

    it('should return empty array if expansion packs directory does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);

      const agents = await agentDiscovery.scanExpansionPackAgents();

      expect(agents).toHaveLength(0);
    });
  });

  describe('extractAgentMetadata', () => {
    it('should extract metadata from valid agent file', async () => {
      const mockContent = `# pm

ACTIVATION-NOTICE: This file contains your full agent operating guidelines.

\`\`\`yaml
agent:
  name: John
  id: pm
  title: Product Manager
  icon: 📋
  whenToUse: Use for creating PRDs
persona:
  role: Product Manager
  style: Analytical
  identity: PM specialized in documentation
  focus: Creating PRDs
  core_principles:
    - User-focused
    - Data-driven
commands:
  - help: Show available commands
  - create: Create new document
dependencies:
  tasks:
    - create-doc.md
  templates:
    - prd-tmpl.yaml
\`\`\``;

      fs.readFile.mockResolvedValue(mockContent);
      fs.existsSync = jest.fn().mockReturnValue(true);

      const metadata = await agentDiscovery.extractAgentMetadata('/path/to/pm.md', {
        source: 'bmad-core',
        type: 'core'
      });

      expect(metadata).toBeTruthy();
      expect(metadata.id).toBe('pm');
      expect(metadata.name).toBe('John');
      expect(metadata.title).toBe('Product Manager');
      expect(metadata.icon).toBe('📋');
      expect(metadata.source).toBe('bmad-core');
      expect(metadata.type).toBe('core');
      expect(metadata.persona.role).toBe('Product Manager');
      expect(metadata.persona.core_principles).toEqual(['User-focused', 'Data-driven']);
      expect(metadata.commands).toHaveLength(2);
      expect(metadata.dependencies.tasks).toEqual(['create-doc.md']);
      expect(metadata.dependencies.templates).toEqual(['prd-tmpl.yaml']);
      expect(metadata.isValid).toBe(true);
    });

    it('should handle agent file with front matter', async () => {
      const mockContent = `---
agent:
  name: Sarah
  id: architect
  title: Architect
persona:
  role: System Architect
---

# Architect Agent

This is the architect agent content.`;

      fs.readFile.mockResolvedValue(mockContent);

      const metadata = await agentDiscovery.extractAgentMetadata('/path/to/architect.md');

      expect(metadata).toBeTruthy();
      expect(metadata.id).toBe('architect');
      expect(metadata.name).toBe('Sarah');
      expect(metadata.title).toBe('Architect');
    });

    it('should return null for invalid agent file', async () => {
      const mockContent = `# Invalid Agent

This file has no YAML configuration.`;

      fs.readFile.mockResolvedValue(mockContent);

      const metadata = await agentDiscovery.extractAgentMetadata('/path/to/invalid.md');

      expect(metadata).toBeNull();
      expect(agentDiscovery.validationErrors).toHaveLength(1);
    });

    it('should handle file read errors', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      const metadata = await agentDiscovery.extractAgentMetadata('/path/to/missing.md');

      expect(metadata).toBeNull();
      expect(agentDiscovery.validationErrors).toHaveLength(1);
    });
  });

  describe('parseBMadAgent', () => {
    it('should parse embedded YAML block', () => {
      const content = `# Agent

Some content here.

\`\`\`yaml
agent:
  name: Test
  id: test
persona:
  role: Tester
\`\`\`

More content.`;

      const result = agentDiscovery.parseBMadAgent(content);

      expect(result.frontMatter.agent.name).toBe('Test');
      expect(result.frontMatter.agent.id).toBe('test');
      expect(result.frontMatter.persona.role).toBe('Tester');
      expect(result.content).not.toContain('```yaml');
    });

    it('should parse standard front matter', () => {
      const content = `---
agent:
  name: Test
  id: test
---

# Agent Content`;

      const result = agentDiscovery.parseBMadAgent(content);

      expect(result.frontMatter.agent.name).toBe('Test');
      expect(result.content).toBe('# Agent Content');
    });

    it('should handle content with no YAML', () => {
      const content = `# Agent

Just markdown content.`;

      const result = agentDiscovery.parseBMadAgent(content);

      expect(result.frontMatter).toEqual({});
      expect(result.content).toBe(content);
    });

    it('should handle invalid YAML', () => {
      const content = `# Agent

\`\`\`yaml
invalid: yaml: content:
  - broken
\`\`\``;

      const result = agentDiscovery.parseBMadAgent(content);

      expect(result.frontMatter).toEqual({});
      expect(result.content).toBe(content);
    });
  });

  describe('validateAgentFormat', () => {
    it('should validate valid agent metadata', () => {
      const metadata = {
        id: 'test',
        name: 'Test Agent',
        title: 'Test',
        persona: { role: 'Tester' },
        filePath: '/path/to/test.md',
        rawContent: 'content',
        parsedContent: { frontMatter: { agent: { id: 'test' } } },
        commands: [{ name: 'help', description: 'Help command' }]
      };

      fs.existsSync = jest.fn().mockReturnValue(true);

      const result = agentDiscovery.validateAgentFormat(metadata);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify validation errors', () => {
      const metadata = {
        // Missing required fields
        persona: {},
        commands: [{ description: 'Command without name' }],
        parsedContent: { frontMatter: {} }
      };

      fs.existsSync = jest.fn().mockReturnValue(false);

      const result = agentDiscovery.validateAgentFormat(metadata);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Missing agent ID');
      expect(result.errors).toContain('Missing agent name');
      expect(result.errors).toContain('Missing agent title');
      expect(result.errors).toContain('Missing persona role');
    });
  });

  describe('validateAgentDependencies', () => {
    it('should validate existing dependencies', async () => {
      const agentMetadata = {
        filePath: '/path/to/agent.md',
        source: 'bmad-core',
        expansionPack: null,
        dependencies: {
          tasks: ['create-doc.md'],
          templates: ['prd-tmpl.yaml']
        },
        validationErrors: []
      };

      fs.pathExists.mockResolvedValue(true);

      await agentDiscovery.validateAgentDependencies(agentMetadata);

      expect(agentMetadata.validationErrors).toHaveLength(0);
      expect(agentDiscovery.dependencyMap.get('create-doc.md')).toContain(agentMetadata.id);
    });

    it('should identify missing dependencies', async () => {
      const agentMetadata = {
        id: 'test-agent',
        filePath: '/path/to/agent.md',
        source: 'bmad-core',
        expansionPack: null,
        dependencies: {
          tasks: ['missing-task.md'],
          templates: ['missing-template.yaml']
        },
        validationErrors: []
      };

      fs.pathExists.mockResolvedValue(false);

      await agentDiscovery.validateAgentDependencies(agentMetadata);

      expect(agentMetadata.validationErrors).toHaveLength(2);
      expect(agentMetadata.validationErrors[0]).toContain('Missing dependency: tasks/missing-task.md');
      expect(agentMetadata.validationErrors[1]).toContain('Missing dependency: templates/missing-template.yaml');
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      // Add some mock agents
      agentDiscovery.discoveredAgents.set('pm', {
        id: 'pm',
        source: 'bmad-core',
        expansionPack: null
      });
      agentDiscovery.discoveredAgents.set('game-dev', {
        id: 'game-dev',
        source: 'expansion-pack',
        expansionPack: 'bmad-2d-phaser-game-dev'
      });
    });

    it('should get agent by ID', () => {
      const agent = agentDiscovery.getAgent('pm');
      expect(agent).toBeTruthy();
      expect(agent.id).toBe('pm');
    });

    it('should return null for non-existent agent', () => {
      const agent = agentDiscovery.getAgent('non-existent');
      expect(agent).toBeNull();
    });

    it('should get agents by source', () => {
      const coreAgents = agentDiscovery.getAgentsBySource('bmad-core');
      expect(coreAgents).toHaveLength(1);
      expect(coreAgents[0].id).toBe('pm');

      const expansionAgents = agentDiscovery.getAgentsBySource('expansion-pack');
      expect(expansionAgents).toHaveLength(1);
      expect(expansionAgents[0].id).toBe('game-dev');
    });

    it('should get agents by expansion pack', () => {
      const phaserAgents = agentDiscovery.getAgentsByExpansionPack('bmad-2d-phaser-game-dev');
      expect(phaserAgents).toHaveLength(1);
      expect(phaserAgents[0].id).toBe('game-dev');
    });

    it('should generate statistics', () => {
      const stats = agentDiscovery.getStatistics();
      expect(stats.total).toBe(2);
      expect(stats.core).toBe(1);
      expect(stats.expansionPack).toBe(1);
      expect(stats.expansionPacks).toEqual(['bmad-2d-phaser-game-dev']);
    });
  });

  describe('generateAgentName', () => {
    it('should generate names for known agent types', () => {
      expect(agentDiscovery.generateAgentName('/path/to/pm.md')).toBe('Product Manager');
      expect(agentDiscovery.generateAgentName('/path/to/architect.md')).toBe('Architect');
      expect(agentDiscovery.generateAgentName('/path/to/game-developer.md')).toBe('Game Developer');
    });

    it('should generate names for unknown agent types', () => {
      expect(agentDiscovery.generateAgentName('/path/to/custom-agent.md')).toBe('Custom Agent');
      expect(agentDiscovery.generateAgentName('/path/to/my-special-agent.md')).toBe('My Special Agent');
    });
  });

  describe('extractCommands', () => {
    it('should extract commands from array format', () => {
      const commands = ['help', { create: 'Create document' }];
      const result = agentDiscovery.extractCommands(commands);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'help', description: null });
      expect(result[1]).toEqual({ name: 'create', description: 'Create document' });
    });

    it('should extract commands from object format', () => {
      const commands = {
        help: 'Show help',
        create: 'Create document'
      };
      const result = agentDiscovery.extractCommands(commands);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'help', description: 'Show help' });
      expect(result[1]).toEqual({ name: 'create', description: 'Create document' });
    });

    it('should handle empty or invalid commands', () => {
      expect(agentDiscovery.extractCommands(null)).toEqual([]);
      expect(agentDiscovery.extractCommands(undefined)).toEqual([]);
      expect(agentDiscovery.extractCommands([])).toEqual([]);
    });
  });

  describe('extractDependencies', () => {
    it('should extract dependencies from object format', () => {
      const dependencies = {
        tasks: ['create-doc.md', 'review-doc.md'],
        templates: ['prd-tmpl.yaml'],
        custom: ['custom-dep.md']
      };
      const result = agentDiscovery.extractDependencies(dependencies);

      expect(result.tasks).toEqual(['create-doc.md', 'review-doc.md']);
      expect(result.templates).toEqual(['prd-tmpl.yaml']);
      expect(result.other).toEqual([{ type: 'custom', name: 'custom-dep.md' }]);
    });

    it('should handle empty or invalid dependencies', () => {
      const result = agentDiscovery.extractDependencies(null);
      expect(result.tasks).toEqual([]);
      expect(result.templates).toEqual([]);
      expect(result.other).toEqual([]);
    });
  });
});