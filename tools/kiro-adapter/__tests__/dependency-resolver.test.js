/**
 * Unit tests for dependency resolution and validation
 * Tests the system that resolves agent dependencies on tasks, templates, and checklists
 */

const DependencyResolver = require('../dependency-resolver');
const fs = require('fs-extra');
const path = require('path');

// Mock fs-extra
jest.mock('fs-extra');

describe('DependencyResolver', () => {
  let resolver;
  let mockRootPath;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRootPath = '/mock/project';
    resolver = new DependencyResolver({
      rootPath: mockRootPath,
      validateDependencies: true,
      enableErrorHandling: true
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultResolver = new DependencyResolver();
      expect(defaultResolver.options.rootPath).toBe(process.cwd());
      expect(defaultResolver.options.validateDependencies).toBe(true);
    });

    it('should accept custom options', () => {
      const customResolver = new DependencyResolver({
        rootPath: '/custom/path',
        validateDependencies: false
      });
      expect(customResolver.options.rootPath).toBe('/custom/path');
      expect(customResolver.options.validateDependencies).toBe(false);
    });
  });

  describe('resolveDependencies', () => {
    const mockAgent = {
      id: 'test-agent',
      source: 'bmad-core',
      expansionPack: null,
      dependencies: {
        tasks: ['create-doc.md', 'review-doc.md'],
        templates: ['prd-tmpl.yaml', 'story-tmpl.yaml'],
        checklists: ['story-dod-checklist.md'],
        data: ['technical-preferences.md']
      }
    };

    beforeEach(() => {
      fs.pathExists.mockImplementation((filePath) => {
        // Mock existing dependencies
        if (filePath.includes('create-doc.md')) return Promise.resolve(true);
        if (filePath.includes('prd-tmpl.yaml')) return Promise.resolve(true);
        if (filePath.includes('story-dod-checklist.md')) return Promise.resolve(true);
        if (filePath.includes('technical-preferences.md')) return Promise.resolve(true);
        // Mock missing dependencies
        if (filePath.includes('review-doc.md')) return Promise.resolve(false);
        if (filePath.includes('story-tmpl.yaml')) return Promise.resolve(false);
        return Promise.resolve(false);
      });
    });

    it('should resolve all existing dependencies', async () => {
      const result = await resolver.resolveDependencies(mockAgent);

      expect(result.resolved).toBeDefined();
      expect(result.missing).toBeDefined();
      expect(result.resolved.tasks).toContain('create-doc.md');
      expect(result.resolved.templates).toContain('prd-tmpl.yaml');
      expect(result.resolved.checklists).toContain('story-dod-checklist.md');
      expect(result.resolved.data).toContain('technical-preferences.md');
    });

    it('should identify missing dependencies', async () => {
      const result = await resolver.resolveDependencies(mockAgent);

      expect(result.missing.tasks).toContain('review-doc.md');
      expect(result.missing.templates).toContain('story-tmpl.yaml');
      expect(result.isComplete).toBe(false);
    });

    it('should handle agents with no dependencies', async () => {
      const agentNoDeps = {
        id: 'simple-agent',
        source: 'bmad-core',
        dependencies: {}
      };

      const result = await resolver.resolveDependencies(agentNoDeps);

      expect(result.resolved.tasks).toEqual([]);
      expect(result.resolved.templates).toEqual([]);
      expect(result.missing.tasks).toEqual([]);
      expect(result.isComplete).toBe(true);
    });

    it('should resolve expansion pack dependencies', async () => {
      const expansionAgent = {
        id: 'game-developer',
        source: 'expansion-pack',
        expansionPack: 'bmad-2d-phaser-game-dev',
        dependencies: {
          tasks: ['create-game-story.md'],
          templates: ['game-story-tmpl.yaml']
        }
      };

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('bmad-2d-phaser-game-dev') && filePath.includes('create-game-story.md')) {
          return Promise.resolve(true);
        }
        if (filePath.includes('bmad-2d-phaser-game-dev') && filePath.includes('game-story-tmpl.yaml')) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

      const result = await resolver.resolveDependencies(expansionAgent);

      expect(result.resolved.tasks).toContain('create-game-story.md');
      expect(result.resolved.templates).toContain('game-story-tmpl.yaml');
      expect(result.isComplete).toBe(true);
    });
  });

  describe('validateDependencyPaths', () => {
    it('should validate core agent dependency paths', async () => {
      const dependencies = {
        tasks: ['create-doc.md'],
        templates: ['prd-tmpl.yaml'],
        checklists: ['story-dod-checklist.md']
      };

      fs.pathExists.mockResolvedValue(true);

      const result = await resolver.validateDependencyPaths(dependencies, 'bmad-core');

      expect(result.valid).toEqual(dependencies);
      expect(result.invalid).toEqual({ tasks: [], templates: [], checklists: [] });
      expect(result.allValid).toBe(true);
    });

    it('should validate expansion pack dependency paths', async () => {
      const dependencies = {
        tasks: ['create-game-story.md'],
        templates: ['game-design-doc-tmpl.yaml']
      };

      fs.pathExists.mockImplementation((filePath) => {
        return filePath.includes('bmad-2d-phaser-game-dev');
      });

      const result = await resolver.validateDependencyPaths(
        dependencies, 
        'expansion-pack', 
        'bmad-2d-phaser-game-dev'
      );

      expect(result.valid.tasks).toContain('create-game-story.md');
      expect(result.valid.templates).toContain('game-design-doc-tmpl.yaml');
      expect(result.allValid).toBe(true);
    });

    it('should identify invalid dependency paths', async () => {
      const dependencies = {
        tasks: ['existing-task.md', 'missing-task.md'],
        templates: ['existing-template.yaml', 'missing-template.yaml']
      };

      fs.pathExists.mockImplementation((filePath) => {
        return !filePath.includes('missing-');
      });

      const result = await resolver.validateDependencyPaths(dependencies, 'bmad-core');

      expect(result.valid.tasks).toContain('existing-task.md');
      expect(result.valid.templates).toContain('existing-template.yaml');
      expect(result.invalid.tasks).toContain('missing-task.md');
      expect(result.invalid.templates).toContain('missing-template.yaml');
      expect(result.allValid).toBe(false);
    });
  });

  describe('buildDependencyGraph', () => {
    const mockAgents = [
      {
        id: 'pm',
        dependencies: {
          tasks: ['create-doc.md'],
          templates: ['prd-tmpl.yaml']
        }
      },
      {
        id: 'dev',
        dependencies: {
          tasks: ['create-doc.md', 'review-doc.md'],
          templates: ['story-tmpl.yaml']
        }
      },
      {
        id: 'qa',
        dependencies: {
          tasks: ['review-doc.md'],
          checklists: ['story-dod-checklist.md']
        }
      }
    ];

    it('should build dependency graph for multiple agents', () => {
      const graph = resolver.buildDependencyGraph(mockAgents);

      expect(graph.dependencies).toBeDefined();
      expect(graph.dependents).toBeDefined();
      expect(graph.dependencies['create-doc.md']).toEqual(['pm', 'dev']);
      expect(graph.dependencies['review-doc.md']).toEqual(['dev', 'qa']);
      expect(graph.dependents['pm']).toContain('create-doc.md');
      expect(graph.dependents['dev']).toContain('create-doc.md');
      expect(graph.dependents['dev']).toContain('review-doc.md');
    });

    it('should identify shared dependencies', () => {
      const graph = resolver.buildDependencyGraph(mockAgents);

      expect(graph.shared).toBeDefined();
      expect(graph.shared['create-doc.md']).toEqual(['pm', 'dev']);
      expect(graph.shared['review-doc.md']).toEqual(['dev', 'qa']);
    });

    it('should calculate dependency statistics', () => {
      const graph = resolver.buildDependencyGraph(mockAgents);

      expect(graph.stats).toBeDefined();
      expect(graph.stats.totalDependencies).toBeGreaterThan(0);
      expect(graph.stats.sharedDependencies).toBeGreaterThan(0);
      expect(graph.stats.uniqueDependencies).toBeGreaterThan(0);
    });

    it('should handle agents with no dependencies', () => {
      const agentsWithEmpty = [
        ...mockAgents,
        { id: 'simple-agent', dependencies: {} }
      ];

      const graph = resolver.buildDependencyGraph(agentsWithEmpty);

      expect(graph.dependents['simple-agent']).toEqual([]);
    });
  });

  describe('resolveDependencyConflicts', () => {
    it('should identify version conflicts', () => {
      const dependencies = [
        {
          name: 'shared-template.yaml',
          version: '1.0.0',
          requiredBy: ['agent1']
        },
        {
          name: 'shared-template.yaml',
          version: '2.0.0',
          requiredBy: ['agent2']
        }
      ];

      const conflicts = resolver.resolveDependencyConflicts(dependencies);

      expect(conflicts.versionConflicts).toHaveLength(1);
      expect(conflicts.versionConflicts[0].dependency).toBe('shared-template.yaml');
      expect(conflicts.versionConflicts[0].versions).toEqual(['1.0.0', '2.0.0']);
    });

    it('should suggest conflict resolutions', () => {
      const dependencies = [
        {
          name: 'conflicting-task.md',
          version: '1.0.0',
          requiredBy: ['agent1', 'agent2']
        }
      ];

      const conflicts = resolver.resolveDependencyConflicts(dependencies);

      expect(conflicts.resolutions).toBeDefined();
      expect(conflicts.resolutions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle no conflicts', () => {
      const dependencies = [
        {
          name: 'unique-task.md',
          version: '1.0.0',
          requiredBy: ['agent1']
        }
      ];

      const conflicts = resolver.resolveDependencyConflicts(dependencies);

      expect(conflicts.versionConflicts).toHaveLength(0);
      expect(conflicts.hasConflicts).toBe(false);
    });
  });

  describe('optimizeDependencyLoading', () => {
    it('should optimize loading order based on dependencies', () => {
      const agents = [
        {
          id: 'agent1',
          dependencies: { tasks: ['task1.md'] }
        },
        {
          id: 'agent2',
          dependencies: { tasks: ['task1.md', 'task2.md'] }
        },
        {
          id: 'agent3',
          dependencies: { tasks: ['task2.md'] }
        }
      ];

      const optimization = resolver.optimizeDependencyLoading(agents);

      expect(optimization.loadingOrder).toBeDefined();
      expect(optimization.batchGroups).toBeDefined();
      expect(optimization.sharedFirst).toBeDefined();
    });

    it('should group agents by shared dependencies', () => {
      const agents = [
        {
          id: 'agent1',
          dependencies: { tasks: ['shared-task.md'] }
        },
        {
          id: 'agent2',
          dependencies: { tasks: ['shared-task.md'] }
        },
        {
          id: 'agent3',
          dependencies: { tasks: ['unique-task.md'] }
        }
      ];

      const optimization = resolver.optimizeDependencyLoading(agents);

      expect(optimization.batchGroups.length).toBeGreaterThan(0);
      expect(optimization.batchGroups[0].agents).toContain('agent1');
      expect(optimization.batchGroups[0].agents).toContain('agent2');
    });

    it('should prioritize critical dependencies', () => {
      const agents = [
        {
          id: 'critical-agent',
          dependencies: { tasks: ['critical-task.md'] },
          priority: 'high'
        },
        {
          id: 'normal-agent',
          dependencies: { tasks: ['normal-task.md'] }
        }
      ];

      const optimization = resolver.optimizeDependencyLoading(agents);

      expect(optimization.loadingOrder[0]).toBe('critical-agent');
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      const agent = {
        id: 'test-agent',
        dependencies: { tasks: ['test-task.md'] }
      };

      fs.pathExists.mockRejectedValue(new Error('File system error'));

      const result = await resolver.resolveDependencies(agent);

      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('File system error');
    });

    it('should handle malformed dependency structures', async () => {
      const malformedAgent = {
        id: 'malformed-agent',
        dependencies: 'not-an-object'
      };

      const result = await resolver.resolveDependencies(malformedAgent);

      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle circular dependencies', () => {
      const circularAgents = [
        {
          id: 'agent1',
          dependencies: { tasks: ['task1.md'] },
          dependsOn: ['agent2']
        },
        {
          id: 'agent2',
          dependencies: { tasks: ['task2.md'] },
          dependsOn: ['agent1']
        }
      ];

      const graph = resolver.buildDependencyGraph(circularAgents);

      expect(graph.circularDependencies).toBeDefined();
      expect(graph.circularDependencies.length).toBeGreaterThan(0);
    });
  });

  describe('performance optimization', () => {
    it('should cache dependency resolution results', async () => {
      const agent = {
        id: 'cached-agent',
        dependencies: { tasks: ['cached-task.md'] }
      };

      fs.pathExists.mockResolvedValue(true);

      // First resolution
      const result1 = await resolver.resolveDependencies(agent);
      
      // Second resolution should use cache
      const result2 = await resolver.resolveDependencies(agent);

      expect(result1).toEqual(result2);
      expect(fs.pathExists).toHaveBeenCalledTimes(1); // Should only check once due to caching
    });

    it('should handle large dependency sets efficiently', async () => {
      const largeDependencyAgent = {
        id: 'large-agent',
        dependencies: {
          tasks: Array(100).fill().map((_, i) => `task-${i}.md`),
          templates: Array(50).fill().map((_, i) => `template-${i}.yaml`)
        }
      };

      fs.pathExists.mockResolvedValue(true);

      const startTime = Date.now();
      const result = await resolver.resolveDependencies(largeDependencyAgent);
      const endTime = Date.now();

      expect(result.resolved.tasks).toHaveLength(100);
      expect(result.resolved.templates).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('integration scenarios', () => {
    it('should handle mixed core and expansion pack dependencies', async () => {
      const mixedAgent = {
        id: 'mixed-agent',
        source: 'expansion-pack',
        expansionPack: 'bmad-2d-phaser-game-dev',
        dependencies: {
          tasks: ['create-doc.md'], // Core dependency
          templates: ['game-story-tmpl.yaml'], // Expansion dependency
          checklists: ['story-dod-checklist.md'] // Core dependency
        }
      };

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('bmad-core') && filePath.includes('create-doc.md')) return Promise.resolve(true);
        if (filePath.includes('bmad-2d-phaser-game-dev') && filePath.includes('game-story-tmpl.yaml')) return Promise.resolve(true);
        if (filePath.includes('bmad-core') && filePath.includes('story-dod-checklist.md')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      const result = await resolver.resolveDependencies(mixedAgent);

      expect(result.resolved.tasks).toContain('create-doc.md');
      expect(result.resolved.templates).toContain('game-story-tmpl.yaml');
      expect(result.resolved.checklists).toContain('story-dod-checklist.md');
      expect(result.isComplete).toBe(true);
    });

    it('should validate cross-expansion pack dependencies', async () => {
      const crossExpansionAgent = {
        id: 'cross-agent',
        source: 'expansion-pack',
        expansionPack: 'bmad-2d-phaser-game-dev',
        dependencies: {
          tasks: ['create-game-story.md'], // Own expansion
          templates: ['infrastructure-tmpl.yaml'] // Different expansion
        }
      };

      fs.pathExists.mockImplementation((filePath) => {
        if (filePath.includes('bmad-2d-phaser-game-dev')) return Promise.resolve(true);
        if (filePath.includes('bmad-infrastructure-devops')) return Promise.resolve(false);
        return Promise.resolve(false);
      });

      const result = await resolver.resolveDependencies(crossExpansionAgent);

      expect(result.resolved.tasks).toContain('create-game-story.md');
      expect(result.missing.templates).toContain('infrastructure-tmpl.yaml');
      expect(result.crossExpansionDependencies).toBeDefined();
      expect(result.crossExpansionDependencies.length).toBeGreaterThan(0);
    });
  });
});