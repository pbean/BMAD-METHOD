/**
 * Unit tests for KiroAgentRegistry
 */

const fs = require('fs-extra');
const path = require('path');
const KiroAgentRegistry = require('../kiro-agent-registry');
const ActivationManager = require('../activation-manager');

describe('KiroAgentRegistry', () => {
  let testDir;
  let registry;

  beforeEach(async () => {
    testDir = path.join(__dirname, '../test-output', 'registry-unit-test');
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.kiro/agents'));
    
    registry = new KiroAgentRegistry({
      rootPath: testDir,
      retryAttempts: 1,
      retryDelay: 100
    });
  });

  afterEach(async () => {
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('initialization', () => {
    test('should initialize successfully with empty agents directory', async () => {
      const result = await registry.initialize();
      expect(result).toBe(true);
      expect(registry.isInitialized).toBe(true);
    });

    test('should create agents directory if it does not exist', async () => {
      await fs.remove(path.join(testDir, '.kiro'));
      
      const result = await registry.initialize();
      expect(result).toBe(true);
      
      const agentsPath = path.join(testDir, '.kiro/agents');
      expect(await fs.pathExists(agentsPath)).toBe(true);
    });
  });

  describe('agent discovery', () => {
    test('should discover agent files in agents directory', async () => {
      // Create test agent file
      const agentContent = `---
id: test-agent
name: Test Agent
description: A test agent
---

# Test Agent

This is a test agent.
`;
      
      await fs.writeFile(
        path.join(testDir, '.kiro/agents/test-agent.md'),
        agentContent
      );
      
      const agentFiles = await registry.findAgentFiles(path.join(testDir, '.kiro/agents'));
      expect(agentFiles).toHaveLength(1);
      expect(agentFiles[0]).toContain('test-agent.md');
    });

    test('should discover agents in subdirectories', async () => {
      await fs.ensureDir(path.join(testDir, '.kiro/agents/core'));
      await fs.ensureDir(path.join(testDir, '.kiro/agents/expansion'));
      
      await fs.writeFile(
        path.join(testDir, '.kiro/agents/core/architect.md'),
        '# Core Architect'
      );
      
      await fs.writeFile(
        path.join(testDir, '.kiro/agents/expansion/game-dev.md'),
        '# Game Developer'
      );
      
      const agentFiles = await registry.findAgentFiles(path.join(testDir, '.kiro/agents'));
      expect(agentFiles).toHaveLength(2);
    });
  });

  describe('agent parsing', () => {
    test('should parse agent metadata from YAML frontmatter', async () => {
      const agentContent = `---
id: yaml-agent
name: YAML Agent
description: Agent with YAML frontmatter
---

# YAML Agent

This agent has YAML frontmatter.
`;
      
      const agentPath = path.join(testDir, '.kiro/agents/yaml-agent.md');
      await fs.writeFile(agentPath, agentContent);
      
      const metadata = await registry.parseAgentFile(agentPath);
      
      expect(metadata.id).toBe('yaml-agent');
      expect(metadata.name).toBe('YAML Agent');
      expect(metadata.description).toBe('Agent with YAML frontmatter');
      expect(metadata.source).toBe('bmad-core');
    });

    test('should extract agent ID from heading when no YAML', async () => {
      const agentContent = `# Agent: My Test Agent

This is a test agent without YAML frontmatter.
`;
      
      const agentPath = path.join(testDir, '.kiro/agents/my-test-agent.md');
      await fs.writeFile(agentPath, agentContent);
      
      const metadata = await registry.parseAgentFile(agentPath);
      
      expect(metadata.id).toBe('my-test-agent');
      expect(metadata.name).toBe('My Test Agent');
    });

    test('should fall back to filename for agent ID', async () => {
      const agentContent = `This is a simple agent file without proper headers.`;
      
      const agentPath = path.join(testDir, '.kiro/agents/fallback-agent.md');
      await fs.writeFile(agentPath, agentContent);
      
      const metadata = await registry.parseAgentFile(agentPath);
      
      expect(metadata.id).toBe('fallback-agent');
      expect(metadata.name).toBe('Fallback Agent');
    });

    test('should detect expansion pack source', async () => {
      const expansionDir = path.join(testDir, 'expansion-packs/game-dev/agents');
      await fs.ensureDir(expansionDir);
      
      const agentPath = path.join(expansionDir, 'game-architect.md');
      await fs.writeFile(agentPath, '# Game Architect');
      
      // Update registry to use test dir as root
      registry.options.rootPath = testDir;
      
      const metadata = await registry.parseAgentFile(agentPath);
      
      expect(metadata.source).toBe('expansion-pack');
      expect(metadata.expansionPack).toBe('game-dev');
    });
  });

  describe('agent registration', () => {
    test('should register agent successfully', async () => {
      const agentMetadata = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent',
        source: 'bmad-core',
        expansionPack: null,
        filePath: '/test/path',
        relativePath: 'test/path',
        content: 'test content',
        lastModified: new Date()
      };
      
      const result = await registry.registerAgent(agentMetadata);
      expect(result).toBe(true);
      
      const registeredAgent = registry.getRegisteredAgent('test-agent');
      expect(registeredAgent).toBeTruthy();
      expect(registeredAgent.name).toBe('Test Agent');
    });

    test('should create activation handler for registered agent', async () => {
      const agentMetadata = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent',
        source: 'bmad-core',
        expansionPack: null,
        filePath: '/test/path',
        relativePath: 'test/path',
        content: 'test content',
        lastModified: new Date()
      };
      
      await registry.registerAgent(agentMetadata);
      
      const registeredAgent = registry.getRegisteredAgent('test-agent');
      expect(registeredAgent.activationHandler).toBeDefined();
      expect(typeof registeredAgent.activationHandler).toBe('function');
    });
  });

  describe('utility methods', () => {
    test('should normalize agent IDs correctly', () => {
      expect(registry.normalizeAgentId('Test Agent')).toBe('test-agent');
      expect(registry.normalizeAgentId('BMad_Architect')).toBe('bmad-architect');
      expect(registry.normalizeAgentId('Game-Dev-Expert')).toBe('game-dev-expert');
      expect(registry.normalizeAgentId('  spaced  out  ')).toBe('spaced-out');
    });

    test('should format agent names correctly', () => {
      expect(registry.formatAgentName('test-agent')).toBe('Test Agent');
      expect(registry.formatAgentName('bmad-architect')).toBe('Bmad Architect');
      expect(registry.formatAgentName('game-dev-expert')).toBe('Game Dev Expert');
    });
  });

  describe('statistics', () => {
    test('should provide accurate statistics', async () => {
      // Create and register test agents
      const agent1Content = '# Agent 1';
      const agent2Content = '# Agent 2';
      
      await fs.writeFile(path.join(testDir, '.kiro/agents/agent1.md'), agent1Content);
      await fs.writeFile(path.join(testDir, '.kiro/agents/agent2.md'), agent2Content);
      
      await registry.initialize();
      
      const stats = registry.getStatistics();
      expect(stats.totalRegistered).toBe(2);
      expect(stats.totalErrors).toBe(0);
      expect(stats.isInitialized).toBe(true);
      expect(stats.registeredAgentIds).toContain('agent1');
      expect(stats.registeredAgentIds).toContain('agent2');
    });
  });
});

describe('ActivationManager', () => {
  let testDir;
  let registry;
  let activationManager;

  beforeEach(async () => {
    testDir = path.join(__dirname, '../test-output', 'activation-unit-test');
    await fs.ensureDir(testDir);
    await fs.ensureDir(path.join(testDir, '.kiro/agents'));
    
    registry = new KiroAgentRegistry({
      rootPath: testDir,
      retryAttempts: 1,
      retryDelay: 100
    });
    
    activationManager = new ActivationManager(registry, {
      rootPath: testDir,
      maxConcurrentAgents: 3,
      sessionTimeout: 5000 // 5 seconds for testing
    });
  });

  afterEach(async () => {
    if (activationManager) {
      await activationManager.shutdown();
    }
    
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      const result = await activationManager.initialize();
      expect(result).toBe(true);
    });
  });

  describe('agent activation', () => {
    beforeEach(async () => {
      // Create test agent
      const agentContent = `---
id: test-agent
name: Test Agent
description: A test agent
---

# Test Agent
`;
      
      await fs.writeFile(
        path.join(testDir, '.kiro/agents/test-agent.md'),
        agentContent
      );
      
      await registry.initialize();
      await activationManager.initialize();
    });

    test('should activate agent successfully', async () => {
      const instance = await activationManager.activateAgent('test-agent', {
        user: 'test-user'
      });
      
      expect(instance).toBeTruthy();
      expect(instance.id).toBe('test-agent');
      expect(instance.name).toBe('Test Agent');
      expect(instance.activatedAt).toBeDefined();
    });

    test('should return existing instance if agent already active', async () => {
      const instance1 = await activationManager.activateAgent('test-agent');
      const instance2 = await activationManager.activateAgent('test-agent');
      
      expect(instance1).toBe(instance2);
    });

    test('should throw error for non-existent agent', async () => {
      await expect(
        activationManager.activateAgent('non-existent-agent')
      ).rejects.toThrow('Agent not found in registry');
    });

    test('should enforce concurrent agent limit', async () => {
      // Create multiple test agents with different roles to avoid conflicts
      const agentConfigs = [
        { id: 'test-dev-1', name: 'Test Developer 1' },
        { id: 'test-dev-2', name: 'Test Developer 2' },
        { id: 'test-dev-3', name: 'Test Developer 3' },
        { id: 'test-dev-4', name: 'Test Developer 4' }
      ];
      
      for (const config of agentConfigs) {
        const agentContent = `---
id: ${config.id}
name: ${config.name}
---
# ${config.name}`;
        await fs.writeFile(
          path.join(testDir, `.kiro/agents/${config.id}.md`),
          agentContent
        );
      }
      
      // Re-initialize to pick up new agents
      await registry.initialize();
      
      // Activate up to the limit (3 agents)
      for (let i = 0; i < 3; i++) {
        await activationManager.activateAgent(agentConfigs[i].id);
      }
      
      // Should fail on the 4th agent
      await expect(
        activationManager.activateAgent('test-dev-4')
      ).rejects.toThrow('Maximum concurrent agents limit reached');
    });
  });

  describe('agent deactivation', () => {
    beforeEach(async () => {
      const agentContent = '# Test Agent';
      await fs.writeFile(
        path.join(testDir, '.kiro/agents/test-agent.md'),
        agentContent
      );
      
      await registry.initialize();
      await activationManager.initialize();
    });

    test('should deactivate agent successfully', async () => {
      await activationManager.activateAgent('test-agent');
      
      const result = await activationManager.deactivateAgent('test-agent');
      expect(result).toBe(true);
      
      const activeAgent = activationManager.getActiveAgent('test-agent');
      expect(activeAgent).toBeNull();
    });

    test('should handle deactivation of non-active agent gracefully', async () => {
      const result = await activationManager.deactivateAgent('test-agent');
      expect(result).toBe(true);
    });
  });

  describe('conflict resolution', () => {
    beforeEach(async () => {
      // Create multiple architect agents
      const architect1Content = `---
id: bmad-architect
name: BMad Architect
---
# BMad Architect`;
      
      const architect2Content = `---
id: game-architect
name: Game Architect
---
# Game Architect`;
      
      await fs.writeFile(
        path.join(testDir, '.kiro/agents/bmad-architect.md'),
        architect1Content
      );
      
      await fs.writeFile(
        path.join(testDir, '.kiro/agents/game-architect.md'),
        architect2Content
      );
      
      await registry.initialize();
      await activationManager.initialize();
    });

    test('should detect role conflicts', async () => {
      await activationManager.activateAgent('bmad-architect');
      
      await expect(
        activationManager.activateAgent('game-architect')
      ).rejects.toThrow('Role conflict');
    });

    test('should extract agent roles correctly', () => {
      expect(activationManager.extractAgentRole('bmad-architect')).toBe('architect');
      expect(activationManager.extractAgentRole('project-manager')).toBe('pm');
      expect(activationManager.extractAgentRole('product-owner')).toBe('po');
      expect(activationManager.extractAgentRole('developer')).toBe('dev');
      expect(activationManager.extractAgentRole('qa-engineer')).toBe('qa');
    });
  });

  describe('statistics', () => {
    test('should provide accurate statistics', async () => {
      const stats = activationManager.getStatistics();
      
      expect(stats.activeAgents).toBe(0);
      expect(stats.totalSessions).toBe(0);
      expect(stats.maxConcurrentAgents).toBe(3);
      expect(Array.isArray(stats.activeAgentIds)).toBe(true);
      expect(Array.isArray(stats.sessionInfo)).toBe(true);
    });
  });
});