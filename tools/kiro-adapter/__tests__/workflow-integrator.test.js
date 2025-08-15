/**
 * Unit tests for WorkflowIntegrator
 * Tests the conversion of BMad workflows to Kiro task sequences and hooks
 */

const WorkflowIntegrator = require('../workflow-integrator');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

// Mock fs-extra
jest.mock('fs-extra');

describe('WorkflowIntegrator', () => {
  let integrator;
  let mockRootPath;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRootPath = '/mock/project';
    integrator = new WorkflowIntegrator({
      sourceDirectories: {
        core: path.join(mockRootPath, 'bmad-core/workflows/'),
        expansionPacks: path.join(mockRootPath, 'expansion-packs/*/workflows/')
      },
      outputDirectories: {
        hooks: path.join(mockRootPath, '.kiro/hooks/'),
        specs: path.join(mockRootPath, '.kiro/workflow-specs/'),
        tasks: path.join(mockRootPath, '.kiro/workflow-tasks/')
      }
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultIntegrator = new WorkflowIntegrator();
      expect(defaultIntegrator.options.sourceDirectories).toBeDefined();
      expect(defaultIntegrator.options.outputDirectories).toBeDefined();
    });

    it('should accept custom options', () => {
      const customIntegrator = new WorkflowIntegrator({
        outputDirectories: {
          hooks: '/custom/hooks'
        }
      });
      expect(customIntegrator.options.outputDirectories.hooks).toBe('/custom/hooks');
    });
  });

  describe('convertAllWorkflows', () => {
    beforeEach(() => {
      // Mock workflow files
      fs.pathExists.mockImplementation((path) => {
        if (path.includes('workflows')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      fs.readdir.mockImplementation((path) => {
        if (path.includes('bmad-core/workflows')) {
          return Promise.resolve(['greenfield-fullstack.yaml', 'brownfield-service.yaml', 'greenfield-ui.yaml']);
        }
        if (path.includes('expansion-packs')) {
          return Promise.resolve(['bmad-2d-phaser-game-dev', 'bmad-infrastructure-devops']);
        }
        if (path.includes('bmad-2d-phaser-game-dev/workflows')) {
          return Promise.resolve(['game-dev-greenfield.yaml', 'game-prototype.yaml']);
        }
        if (path.includes('bmad-infrastructure-devops/workflows')) {
          return Promise.resolve(['infrastructure-setup.yaml']);
        }
        return Promise.resolve([]);
      });

      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.ensureDir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
    });

    it('should convert all core workflows successfully', async () => {
      const mockWorkflow = {
        workflow: {
          name: 'Greenfield Full-Stack Development',
          id: 'greenfield-fullstack',
          description: 'Complete workflow for new full-stack projects'
        },
        phases: [
          {
            name: 'Planning',
            agents: ['analyst', 'pm'],
            tasks: ['requirements-gathering', 'prd-creation']
          },
          {
            name: 'Architecture',
            agents: ['architect'],
            tasks: ['system-design', 'tech-stack-selection']
          },
          {
            name: 'Development',
            agents: ['dev'],
            tasks: ['implementation', 'testing']
          }
        ],
        automation: {
          triggers: ['project-start', 'milestone-complete'],
          hooks: ['auto-testing', 'deployment-prep']
        }
      };

      fs.readFile.mockResolvedValue(yaml.dump(mockWorkflow));

      const results = await integrator.convertAllWorkflows();

      expect(results.converted.length).toBeGreaterThanOrEqual(3);
      expect(results.errors.length).toBe(0);
      expect(results.summary.total).toBeGreaterThanOrEqual(3);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should convert expansion pack workflows', async () => {
      const mockGameWorkflow = {
        workflow: {
          name: 'Game Development Workflow',
          id: 'game-dev-greenfield',
          description: 'Workflow for new game development projects'
        },
        phases: [
          {
            name: 'Concept',
            agents: ['game-designer'],
            tasks: ['concept-development', 'game-design-doc']
          },
          {
            name: 'Development',
            agents: ['game-developer'],
            tasks: ['prototype-creation', 'core-mechanics']
          }
        ],
        automation: {
          triggers: ['concept-approved', 'milestone-reached'],
          hooks: ['build-automation', 'playtesting-setup']
        }
      };

      fs.readFile.mockResolvedValue(yaml.dump(mockGameWorkflow));

      const results = await integrator.convertAllWorkflows();
      const gameWorkflows = results.converted.filter(w => w.expansionPack === 'bmad-2d-phaser-game-dev');

      expect(gameWorkflows.length).toBeGreaterThanOrEqual(2);
      expect(gameWorkflows[0].originalWorkflow).toBeDefined();
      expect(gameWorkflows[0].kiroTasks).toBeDefined();
      expect(gameWorkflows[0].generatedHooks).toBeDefined();
    });

    it('should handle workflow conversion errors gracefully', async () => {
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('greenfield-fullstack.yaml')) {
          return Promise.resolve('invalid: yaml: content:');
        }
        return Promise.resolve(yaml.dump({ workflow: { name: 'Valid Workflow' } }));
      });

      const results = await integrator.convertAllWorkflows();

      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.errors[0]).toContain('greenfield-fullstack.yaml');
      expect(results.converted.length).toBeGreaterThan(0); // Other workflows should still convert
    });
  });

  describe('convertToKiroTasks', () => {
    it('should convert BMad workflow to Kiro task sequences', () => {
      const bmadWorkflow = {
        workflow: {
          name: 'Test Workflow',
          id: 'test-workflow',
          description: 'A test workflow'
        },
        phases: [
          {
            name: 'Planning',
            agents: ['analyst', 'pm'],
            tasks: ['requirements-gathering', 'prd-creation'],
            deliverables: ['requirements-doc', 'prd']
          },
          {
            name: 'Development',
            agents: ['dev'],
            tasks: ['implementation', 'testing'],
            deliverables: ['working-code', 'test-results']
          }
        ]
      };

      const kiroTasks = integrator.convertToKiroTasks(bmadWorkflow);

      expect(kiroTasks).toBeDefined();
      expect(kiroTasks.phases).toHaveLength(2);
      expect(kiroTasks.phases[0].name).toBe('Planning');
      expect(kiroTasks.phases[0].tasks).toContain('requirements-gathering');
      expect(kiroTasks.phases[1].name).toBe('Development');
      expect(kiroTasks.totalTasks).toBe(4);
    });

    it('should handle workflows with dependencies', () => {
      const workflowWithDeps = {
        workflow: {
          name: 'Complex Workflow',
          id: 'complex-workflow'
        },
        phases: [
          {
            name: 'Phase 1',
            agents: ['agent1'],
            tasks: ['task1', 'task2']
          },
          {
            name: 'Phase 2',
            agents: ['agent2'],
            tasks: ['task3'],
            dependencies: ['Phase 1']
          }
        ]
      };

      const kiroTasks = integrator.convertToKiroTasks(workflowWithDeps);

      expect(kiroTasks.phases[1].dependencies).toEqual(['Phase 1']);
      expect(kiroTasks.dependencyGraph).toBeDefined();
    });

    it('should generate task sequences with proper ordering', () => {
      const workflow = {
        workflow: { name: 'Ordered Workflow', id: 'ordered' },
        phases: [
          {
            name: 'Setup',
            agents: ['pm'],
            tasks: ['project-init'],
            order: 1
          },
          {
            name: 'Implementation',
            agents: ['dev'],
            tasks: ['coding'],
            order: 3
          },
          {
            name: 'Design',
            agents: ['architect'],
            tasks: ['architecture'],
            order: 2
          }
        ]
      };

      const kiroTasks = integrator.convertToKiroTasks(workflow);

      expect(kiroTasks.phases[0].name).toBe('Setup');
      expect(kiroTasks.phases[1].name).toBe('Design');
      expect(kiroTasks.phases[2].name).toBe('Implementation');
    });
  });

  describe('generateHooks', () => {
    it('should generate hooks from workflow automation', () => {
      const workflow = {
        workflow: {
          name: 'Automated Workflow',
          id: 'automated-workflow'
        },
        automation: {
          triggers: ['file-save', 'git-commit', 'milestone-complete'],
          hooks: ['run-tests', 'update-docs', 'deploy-staging']
        }
      };

      const hooks = integrator.generateHooks(workflow);

      expect(hooks).toHaveLength(3);
      expect(hooks[0].trigger).toBe('file-save');
      expect(hooks[0].action).toBe('run-tests');
      expect(hooks[1].trigger).toBe('git-commit');
      expect(hooks[1].action).toBe('update-docs');
      expect(hooks[2].trigger).toBe('milestone-complete');
      expect(hooks[2].action).toBe('deploy-staging');
    });

    it('should generate domain-specific hooks for expansion packs', () => {
      const gameWorkflow = {
        workflow: {
          name: 'Game Development Workflow',
          id: 'game-dev'
        },
        automation: {
          triggers: ['asset-update', 'build-complete'],
          hooks: ['rebuild-game', 'run-playtests']
        },
        expansionPack: 'bmad-2d-phaser-game-dev'
      };

      const hooks = integrator.generateHooks(gameWorkflow);

      expect(hooks).toHaveLength(2);
      expect(hooks[0].domain).toBe('game-development');
      expect(hooks[0].expansionPack).toBe('bmad-2d-phaser-game-dev');
      expect(hooks[1].domain).toBe('game-development');
    });

    it('should handle workflows without automation', () => {
      const workflow = {
        workflow: {
          name: 'Manual Workflow',
          id: 'manual'
        },
        phases: [
          { name: 'Phase 1', agents: ['agent1'], tasks: ['task1'] }
        ]
      };

      const hooks = integrator.generateHooks(workflow);

      expect(hooks).toHaveLength(0);
    });

    it('should generate default hooks for common patterns', () => {
      const workflow = {
        workflow: {
          name: 'Standard Workflow',
          id: 'standard'
        },
        phases: [
          {
            name: 'Development',
            agents: ['dev'],
            tasks: ['coding', 'testing']
          }
        ]
      };

      const hooks = integrator.generateHooks(workflow, { generateDefaults: true });

      expect(hooks.length).toBeGreaterThan(0);
      expect(hooks.some(h => h.trigger === 'file-save')).toBe(true);
      expect(hooks.some(h => h.action.includes('test'))).toBe(true);
    });
  });

  describe('createWorkflowSpec', () => {
    it('should create Kiro spec from workflow', () => {
      const workflow = {
        workflow: {
          name: 'Test Workflow',
          id: 'test-workflow',
          description: 'A test workflow for validation'
        },
        phases: [
          {
            name: 'Planning',
            agents: ['pm'],
            tasks: ['planning-task']
          }
        ]
      };

      const spec = integrator.createWorkflowSpec(workflow);

      expect(spec.specType).toBe('bmad-workflow');
      expect(spec.originalWorkflow).toBe('test-workflow');
      expect(spec.requirements).toBeDefined();
      expect(spec.design).toBeDefined();
      expect(spec.tasks).toBeDefined();
    });

    it('should extract requirements from workflow phases', () => {
      const workflow = {
        workflow: {
          name: 'Requirements Workflow',
          description: 'Workflow with clear requirements'
        },
        phases: [
          {
            name: 'Requirements Gathering',
            description: 'Gather and document requirements',
            deliverables: ['requirements-doc']
          },
          {
            name: 'Validation',
            description: 'Validate requirements with stakeholders',
            deliverables: ['validated-requirements']
          }
        ]
      };

      const spec = integrator.createWorkflowSpec(workflow);

      expect(spec.requirements).toContain('Requirements Gathering');
      expect(spec.requirements).toContain('Gather and document requirements');
      expect(spec.requirements).toContain('Validation');
    });

    it('should extract design from workflow structure', () => {
      const workflow = {
        workflow: {
          name: 'Design Workflow',
          description: 'Workflow with design phases'
        },
        phases: [
          {
            name: 'Architecture Design',
            description: 'Design system architecture',
            agents: ['architect']
          },
          {
            name: 'Implementation Planning',
            description: 'Plan implementation approach',
            agents: ['dev']
          }
        ]
      };

      const spec = integrator.createWorkflowSpec(workflow);

      expect(spec.design).toContain('Architecture Design');
      expect(spec.design).toContain('Design system architecture');
      expect(spec.design).toContain('Implementation Planning');
    });

    it('should convert phases to tasks', () => {
      const workflow = {
        workflow: {
          name: 'Task Workflow'
        },
        phases: [
          {
            name: 'Phase 1',
            tasks: ['task1', 'task2']
          },
          {
            name: 'Phase 2',
            tasks: ['task3']
          }
        ]
      };

      const spec = integrator.createWorkflowSpec(workflow);

      expect(spec.tasks).toHaveLength(3);
      expect(spec.tasks[0]).toContain('task1');
      expect(spec.tasks[1]).toContain('task2');
      expect(spec.tasks[2]).toContain('task3');
    });
  });

  describe('validateWorkflowFormat', () => {
    it('should validate correct workflow format', () => {
      const validWorkflow = {
        workflow: {
          name: 'Valid Workflow',
          id: 'valid-workflow',
          description: 'A valid workflow'
        },
        phases: [
          {
            name: 'Phase 1',
            agents: ['agent1'],
            tasks: ['task1']
          }
        ]
      };

      const result = integrator.validateWorkflowFormat(validWorkflow);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const invalidWorkflow = {
        workflow: {
          // Missing name and id
          description: 'A workflow without name'
        },
        phases: []
      };

      const result = integrator.validateWorkflowFormat(invalidWorkflow);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('should validate phase format', () => {
      const workflowWithInvalidPhases = {
        workflow: {
          name: 'Workflow',
          id: 'workflow'
        },
        phases: [
          {
            name: 'Valid Phase',
            agents: ['agent1'],
            tasks: ['task1']
          },
          {
            // Missing name, agents, and tasks
          }
        ]
      };

      const result = integrator.validateWorkflowFormat(workflowWithInvalidPhases);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('phase'))).toBe(true);
    });

    it('should validate agent references', () => {
      const workflowWithInvalidAgents = {
        workflow: {
          name: 'Workflow',
          id: 'workflow'
        },
        phases: [
          {
            name: 'Phase',
            agents: [], // Empty agents array
            tasks: ['task1']
          }
        ]
      };

      const result = integrator.validateWorkflowFormat(workflowWithInvalidAgents);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('agents'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      fs.pathExists.mockRejectedValue(new Error('File system error'));

      const results = await integrator.convertAllWorkflows();

      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.errors[0]).toContain('File system error');
    });

    it('should handle YAML parsing errors', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue(['invalid.yaml']);
      fs.readFile.mockResolvedValue('invalid: yaml: content:');

      const results = await integrator.convertAllWorkflows();

      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.errors[0]).toContain('invalid.yaml');
    });

    it('should handle write errors gracefully', async () => {
      const mockWorkflow = {
        workflow: { name: 'Test', id: 'test' },
        phases: []
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue(['test.yaml']);
      fs.readFile.mockResolvedValue(yaml.dump(mockWorkflow));
      fs.writeFile.mockRejectedValue(new Error('Write error'));

      const results = await integrator.convertAllWorkflows();

      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.errors[0]).toContain('Write error');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex multi-phase workflows', async () => {
      const complexWorkflow = {
        workflow: {
          name: 'Complex Multi-Phase Workflow',
          id: 'complex-workflow',
          description: 'A complex workflow with multiple phases and dependencies'
        },
        phases: [
          {
            name: 'Discovery',
            agents: ['analyst'],
            tasks: ['market-research', 'user-interviews'],
            deliverables: ['research-report'],
            duration: '2 weeks'
          },
          {
            name: 'Planning',
            agents: ['pm', 'analyst'],
            tasks: ['requirements-gathering', 'prd-creation'],
            deliverables: ['prd', 'project-plan'],
            dependencies: ['Discovery'],
            duration: '1 week'
          },
          {
            name: 'Architecture',
            agents: ['architect'],
            tasks: ['system-design', 'tech-selection'],
            deliverables: ['architecture-doc'],
            dependencies: ['Planning'],
            duration: '1 week'
          },
          {
            name: 'Development',
            agents: ['dev'],
            tasks: ['implementation', 'unit-testing'],
            deliverables: ['working-code'],
            dependencies: ['Architecture'],
            duration: '4 weeks'
          }
        ],
        automation: {
          triggers: ['phase-complete', 'deliverable-ready'],
          hooks: ['notify-stakeholders', 'update-project-status']
        }
      };

      const kiroTasks = integrator.convertToKiroTasks(complexWorkflow);
      const hooks = integrator.generateHooks(complexWorkflow);
      const spec = integrator.createWorkflowSpec(complexWorkflow);

      expect(kiroTasks.phases).toHaveLength(4);
      expect(kiroTasks.dependencyGraph).toBeDefined();
      expect(hooks).toHaveLength(2);
      expect(spec.tasks).toHaveLength(8); // Total tasks across all phases
    });

    it('should preserve workflow metadata in conversion', () => {
      const workflow = {
        workflow: {
          name: 'Test Workflow',
          id: 'test-workflow',
          description: 'Test description',
          version: '1.0.0',
          author: 'Test Author',
          tags: ['development', 'testing']
        },
        phases: []
      };

      const spec = integrator.createWorkflowSpec(workflow);

      expect(spec.metadata).toBeDefined();
      expect(spec.metadata.originalName).toBe('Test Workflow');
      expect(spec.metadata.version).toBe('1.0.0');
      expect(spec.metadata.author).toBe('Test Author');
      expect(spec.metadata.tags).toEqual(['development', 'testing']);
    });

    it('should handle workflows with conditional phases', () => {
      const conditionalWorkflow = {
        workflow: {
          name: 'Conditional Workflow',
          id: 'conditional'
        },
        phases: [
          {
            name: 'Base Phase',
            agents: ['agent1'],
            tasks: ['base-task']
          },
          {
            name: 'Optional Phase',
            agents: ['agent2'],
            tasks: ['optional-task'],
            condition: 'if feature-flag enabled'
          }
        ]
      };

      const kiroTasks = integrator.convertToKiroTasks(conditionalWorkflow);

      expect(kiroTasks.phases[1].condition).toBe('if feature-flag enabled');
      expect(kiroTasks.conditionalPhases).toHaveLength(1);
    });
  });
});