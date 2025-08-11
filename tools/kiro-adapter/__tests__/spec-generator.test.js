/**
 * Unit tests for SpecGenerator
 * Tests the generation of Kiro specs from BMad workflows
 */

const SpecGenerator = require('../spec-generator');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('js-yaml');

describe('SpecGenerator', () => {
  let generator;
  const testOutputDir = path.join(__dirname, '../test-output');

  beforeEach(() => {
    generator = new SpecGenerator();
  });

  afterEach(async () => {
    // Clean up test output
    await fs.remove(testOutputDir);
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(generator).toBeDefined();
      expect(generator.options).toBeDefined();
    });

    it('should accept custom options', () => {
      const customGenerator = new SpecGenerator({
        includeMetadata: false,
        validateOutput: false
      });
      expect(customGenerator.options.includeMetadata).toBe(false);
    });
  });

  describe('generateSpecFromBMadWorkflow', () => {
    const workflowPath = path.join(__dirname, '../../../bmad-core/workflows/greenfield-fullstack.yaml');
    const specOutputPath = path.join(testOutputDir, 'test-spec');

    beforeEach(async () => {
      await fs.ensureDir(testOutputDir);
    });

    it('should generate complete spec from workflow', async () => {
      // Skip if workflow file doesn't exist
      if (!await fs.pathExists(workflowPath)) {
        return;
      }

      const success = await generator.generateSpecFromBMadWorkflow(workflowPath, specOutputPath);
      expect(success).toBe(true);

      // Check if all spec files were created
      expect(await fs.pathExists(path.join(specOutputPath, 'requirements.md'))).toBe(true);
      expect(await fs.pathExists(path.join(specOutputPath, 'design.md'))).toBe(true);
      expect(await fs.pathExists(path.join(specOutputPath, 'tasks.md'))).toBe(true);
    });

    it('should handle missing workflow file gracefully', async () => {
      const nonExistentPath = path.join(__dirname, 'non-existent-workflow.yaml');
      const success = await generator.generateSpecFromBMadWorkflow(nonExistentPath, specOutputPath);
      
      expect(success).toBe(false);
    });

    it('should create valid Kiro spec format', async () => {
      if (!await fs.pathExists(workflowPath)) {
        return;
      }

      await generator.generateSpecFromBMadWorkflow(workflowPath, specOutputPath);
      
      const requirementsContent = await fs.readFile(path.join(specOutputPath, 'requirements.md'), 'utf8');
      const designContent = await fs.readFile(path.join(specOutputPath, 'design.md'), 'utf8');
      const tasksContent = await fs.readFile(path.join(specOutputPath, 'tasks.md'), 'utf8');

      // Validate requirements format
      expect(requirementsContent).toContain('# Requirements Document');
      expect(requirementsContent).toContain('## Introduction');
      expect(requirementsContent).toContain('## Requirements');

      // Validate design format
      expect(designContent).toContain('# Design Document');
      expect(designContent).toContain('## Overview');
      expect(designContent).toContain('## Architecture');

      // Validate tasks format
      expect(tasksContent).toContain('# Implementation Plan');
      expect(tasksContent).toContain('- [ ]');
    });
  });

  describe('createRequirementsFromPRD', () => {
    let prdTemplate;

    beforeEach(async () => {
      const prdTemplatePath = path.join(__dirname, '../../../bmad-core/templates/prd-tmpl.yaml');
      
      if (await fs.pathExists(prdTemplatePath)) {
        const prdContent = await fs.readFile(prdTemplatePath, 'utf8');
        prdTemplate = yaml.load(prdContent);
      } else {
        // Mock PRD template for testing
        prdTemplate = {
          name: 'Test PRD Template',
          description: 'Test template for PRD generation',
          sections: {
            overview: 'Test project overview',
            objectives: ['Objective 1', 'Objective 2'],
            requirements: [
              {
                id: 'REQ-1',
                title: 'User Authentication',
                description: 'Users must be able to authenticate',
                priority: 'high'
              }
            ]
          }
        };
      }
    });

    it('should generate requirements document from PRD template', () => {
      const requirements = generator.createRequirementsFromPRD(prdTemplate);
      
      expect(requirements).toBeDefined();
      expect(requirements.length).toBeGreaterThan(100);
      expect(requirements).toContain('# Requirements Document');
      expect(requirements).toContain('## Introduction');
      expect(requirements).toContain('## Requirements');
    });

    it('should include EARS format requirements', () => {
      const requirements = generator.createRequirementsFromPRD(prdTemplate);
      
      expect(requirements).toContain('WHEN');
      expect(requirements).toContain('THEN');
      expect(requirements).toContain('SHALL');
    });

    it('should handle empty PRD template', () => {
      const emptyTemplate = {};
      const requirements = generator.createRequirementsFromPRD(emptyTemplate);
      
      expect(requirements).toBeDefined();
      expect(requirements).toContain('# Requirements Document');
    });
  });

  describe('createDesignFromArchitecture', () => {
    let archTemplate;

    beforeEach(async () => {
      const archTemplatePath = path.join(__dirname, '../../../bmad-core/templates/architecture-tmpl.yaml');
      
      if (await fs.pathExists(archTemplatePath)) {
        const archContent = await fs.readFile(archTemplatePath, 'utf8');
        archTemplate = yaml.load(archContent);
      } else {
        // Mock architecture template for testing
        archTemplate = {
          name: 'Test Architecture Template',
          description: 'Test template for architecture design',
          components: [
            {
              name: 'Frontend',
              type: 'React Application',
              responsibilities: ['User Interface', 'State Management']
            },
            {
              name: 'Backend',
              type: 'Node.js API',
              responsibilities: ['Business Logic', 'Data Access']
            }
          ],
          dataModels: [
            {
              name: 'User',
              fields: ['id', 'email', 'password']
            }
          ]
        };
      }
    });

    it('should generate design document from architecture template', () => {
      const design = generator.createDesignFromArchitecture(archTemplate);
      
      expect(design).toBeDefined();
      expect(design.length).toBeGreaterThan(100);
      expect(design).toContain('# Design Document');
      expect(design).toContain('## Overview');
      expect(design).toContain('## Architecture');
    });

    it('should include components and interfaces section', () => {
      const design = generator.createDesignFromArchitecture(archTemplate);
      
      expect(design).toContain('## Components and Interfaces');
    });

    it('should include data models section', () => {
      const design = generator.createDesignFromArchitecture(archTemplate);
      
      expect(design).toContain('## Data Models');
    });

    it('should handle empty architecture template', () => {
      const emptyTemplate = {};
      const design = generator.createDesignFromArchitecture(emptyTemplate);
      
      expect(design).toBeDefined();
      expect(design).toContain('# Design Document');
    });
  });

  describe('createTasksFromStories', () => {
    const mockStories = [
      {
        title: 'User Authentication',
        userStory: 'As a user, I want to authenticate securely, so that I can access the application',
        description: 'Implement user login and registration',
        acceptanceCriteria: ['User can register with email', 'User can login with credentials'],
        implementationTasks: [
          { title: 'Create login form', description: 'Build login UI component' },
          { title: 'Implement auth service', description: 'Create authentication service' }
        ],
        type: 'backend',
        phase: 'implementation',
        epicNumber: 1,
        storyNumber: 1,
        requirementRefs: ['1.1', '1.2']
      },
      {
        title: 'Dashboard Display',
        userStory: 'As a user, I want to see my dashboard, so that I can view key metrics',
        description: 'Create user dashboard with key metrics',
        acceptanceCriteria: ['Dashboard shows user data', 'Metrics are updated in real-time'],
        implementationTasks: [
          { title: 'Create dashboard component', description: 'Build React dashboard component' },
          { title: 'Implement data fetching', description: 'Add API calls for metrics' }
        ],
        type: 'frontend',
        phase: 'implementation',
        epicNumber: 1,
        storyNumber: 2,
        dependencies: ['User Authentication'],
        requirementRefs: ['1.3', '1.4']
      }
    ];

    it('should generate tasks document from stories', () => {
      const tasks = generator.createTasksFromStories(mockStories);
      
      expect(tasks).toBeDefined();
      expect(tasks.length).toBeGreaterThan(100);
      expect(tasks).toContain('# Implementation Plan');
      expect(tasks).toContain('- [ ]');
    });

    it('should include task status markers', () => {
      const tasks = generator.createTasksFromStories(mockStories);
      
      expect(tasks).toContain('- [ ]');
      expect(tasks).toMatch(/- \[ \] \d+\./);
    });

    it('should include requirement references', () => {
      const tasks = generator.createTasksFromStories(mockStories);
      
      expect(tasks).toContain('_Requirements: 1.1');
      expect(tasks).toContain('_Requirements: 1.3');
    });

    it('should handle dependencies between stories', () => {
      const tasks = generator.createTasksFromStories(mockStories);
      
      expect(tasks).toContain('User Authentication');
      expect(tasks).toContain('Dashboard Display');
    });

    it('should handle empty stories array', () => {
      const tasks = generator.createTasksFromStories([]);
      
      expect(tasks).toBeDefined();
      expect(tasks).toContain('# Implementation Plan');
    });
  });

  describe('createTasksWithDependencyMapping', () => {
    const mockStories = [
      {
        title: 'User Authentication',
        dependencies: [],
        requirementRefs: ['1.1']
      },
      {
        title: 'Dashboard Display',
        dependencies: ['User Authentication'],
        requirementRefs: ['1.2']
      }
    ];

    it('should create tasks with proper dependency mapping', () => {
      const tasks = generator.createTasksWithDependencyMapping(mockStories);
      
      expect(tasks).toBeDefined();
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks).toContain('User Authentication');
      expect(tasks).toContain('Dashboard Display');
    });

    it('should respect dependency order', () => {
      const tasks = generator.createTasksWithDependencyMapping(mockStories);
      
      const authIndex = tasks.indexOf('User Authentication');
      const dashboardIndex = tasks.indexOf('Dashboard Display');
      
      expect(authIndex).toBeLessThan(dashboardIndex);
    });
  });

  describe('createTasksFromStoryTemplate', () => {
    let storyTemplate;

    beforeEach(async () => {
      const storyTemplatePath = path.join(__dirname, '../../../bmad-core/templates/story-tmpl.yaml');
      
      if (await fs.pathExists(storyTemplatePath)) {
        const storyContent = await fs.readFile(storyTemplatePath, 'utf8');
        storyTemplate = yaml.load(storyContent);
      } else {
        // Mock story template for testing
        storyTemplate = {
          name: 'Test Story Template',
          description: 'Test template for story generation',
          structure: {
            userStory: 'As a [role], I want [feature], so that [benefit]',
            acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
            implementationTasks: [
              { title: 'Task 1', description: 'Implementation task 1' },
              { title: 'Task 2', description: 'Implementation task 2' }
            ]
          }
        };
      }
    });

    it('should generate tasks from story template', () => {
      const tasks = generator.createTasksFromStoryTemplate(storyTemplate);
      
      expect(tasks).toBeDefined();
      expect(tasks.length).toBeGreaterThan(50);
      expect(tasks).toContain('# Implementation Plan');
    });

    it('should handle missing story template', () => {
      const tasks = generator.createTasksFromStoryTemplate(null);
      
      expect(tasks).toBeDefined();
      expect(tasks).toContain('# Implementation Plan');
    });
  });

  describe('error handling', () => {
    it('should handle invalid YAML in workflow file', async () => {
      const invalidYamlPath = path.join(testOutputDir, 'invalid.yaml');
      await fs.ensureDir(testOutputDir);
      await fs.writeFile(invalidYamlPath, 'invalid: yaml: content:');
      
      const success = await generator.generateSpecFromBMadWorkflow(invalidYamlPath, testOutputDir);
      expect(success).toBe(false);
    });

    it('should handle file system errors gracefully', async () => {
      const invalidOutputPath = '/invalid/path/spec';
      const workflowPath = path.join(__dirname, '../../../bmad-core/workflows/greenfield-fullstack.yaml');
      
      const success = await generator.generateSpecFromBMadWorkflow(workflowPath, invalidOutputPath);
      expect(success).toBe(false);
    });
  });

  describe('validation', () => {
    it('should validate generated spec format', async () => {
      const mockWorkflow = {
        name: 'Test Workflow',
        phases: ['planning', 'implementation'],
        agents: ['pm', 'dev']
      };

      const workflowPath = path.join(testOutputDir, 'test-workflow.yaml');
      const specOutputPath = path.join(testOutputDir, 'test-spec');
      
      await fs.ensureDir(testOutputDir);
      await fs.writeFile(workflowPath, yaml.dump(mockWorkflow));

      const success = await generator.generateSpecFromBMadWorkflow(workflowPath, specOutputPath);
      expect(success).toBe(true);

      // Validate that generated files follow Kiro spec format
      const files = ['requirements.md', 'design.md', 'tasks.md'];
      for (const file of files) {
        const filePath = path.join(specOutputPath, file);
        expect(await fs.pathExists(filePath)).toBe(true);
        
        const content = await fs.readFile(filePath, 'utf8');
        expect(content.length).toBeGreaterThan(0);
      }
    });
  });
});