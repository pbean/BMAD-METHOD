/**
 * Unit tests for HookGenerator
 * Tests the generation of Kiro hooks for BMad workflow automation
 */

const HookGenerator = require('../hook-generator');
const path = require('path');
const fs = require('fs-extra');

describe('HookGenerator', () => {
  let generator;
  const testOutputDir = path.join(__dirname, '../test-output');

  beforeEach(() => {
    generator = new HookGenerator();
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
      const customGenerator = new HookGenerator({
        enableAutoTrigger: false,
        validateHooks: false
      });
      expect(customGenerator.options.enableAutoTrigger).toBe(false);
    });
  });

  describe('generateHooksFromWorkflow', () => {
    const mockWorkflow = {
      name: 'Test Workflow',
      phases: ['planning', 'implementation', 'testing'],
      agents: ['pm', 'dev', 'qa'],
      transitions: [
        { from: 'planning', to: 'implementation', trigger: 'prd_complete' },
        { from: 'implementation', to: 'testing', trigger: 'code_complete' }
      ]
    };

    beforeEach(async () => {
      await fs.ensureDir(testOutputDir);
    });

    it('should generate hooks for workflow automation', async () => {
      const hooksOutputPath = path.join(testOutputDir, 'hooks');
      const success = await generator.generateHooksFromWorkflow(mockWorkflow, hooksOutputPath);
      
      expect(success).toBe(true);
      expect(await fs.pathExists(hooksOutputPath)).toBe(true);
    });

    it('should create story progression hooks', async () => {
      const hooksOutputPath = path.join(testOutputDir, 'hooks');
      await generator.generateHooksFromWorkflow(mockWorkflow, hooksOutputPath);
      
      const progressionHookPath = path.join(hooksOutputPath, 'bmad-story-progression.yaml');
      expect(await fs.pathExists(progressionHookPath)).toBe(true);
      
      const hookContent = await fs.readFile(progressionHookPath, 'utf8');
      expect(hookContent).toContain('name: "BMad Story Progression"');
      expect(hookContent).toContain('trigger:');
      expect(hookContent).toContain('action:');
    });

    it('should create file-save hooks for code review', async () => {
      const hooksOutputPath = path.join(testOutputDir, 'hooks');
      await generator.generateHooksFromWorkflow(mockWorkflow, hooksOutputPath);
      
      const codeReviewHookPath = path.join(hooksOutputPath, 'bmad-code-review.yaml');
      expect(await fs.pathExists(codeReviewHookPath)).toBe(true);
      
      const hookContent = await fs.readFile(codeReviewHookPath, 'utf8');
      expect(hookContent).toContain('type: "file_change"');
      expect(hookContent).toContain('agent: "bmad-qa"');
    });

    it('should handle empty workflow gracefully', async () => {
      const emptyWorkflow = {};
      const hooksOutputPath = path.join(testOutputDir, 'hooks');
      
      const success = await generator.generateHooksFromWorkflow(emptyWorkflow, hooksOutputPath);
      expect(success).toBe(true);
    });
  });

  describe('createStoryProgressionHook', () => {
    it('should create valid story progression hook configuration', () => {
      const hook = generator.createStoryProgressionHook();
      
      expect(hook).toBeDefined();
      expect(hook.name).toBe('BMad Story Progression');
      expect(hook.description).toContain('automatically progress');
      expect(hook.trigger).toBeDefined();
      expect(hook.trigger.type).toBe('file_change');
      expect(hook.action).toBeDefined();
      expect(hook.action.agent).toBe('bmad-scrum-master');
    });

    it('should include proper trigger conditions', () => {
      const hook = generator.createStoryProgressionHook();
      
      expect(hook.trigger.pattern).toContain('*.md');
      expect(hook.trigger.condition).toBe('task_completed');
    });

    it('should include context providers', () => {
      const hook = generator.createStoryProgressionHook();
      
      expect(hook.action.context).toContain('#File');
      expect(hook.action.context).toContain('#Git Diff');
    });
  });

  describe('createCodeReviewHook', () => {
    it('should create valid code review hook configuration', () => {
      const hook = generator.createCodeReviewHook();
      
      expect(hook).toBeDefined();
      expect(hook.name).toBe('BMad Code Review');
      expect(hook.description).toContain('code review');
      expect(hook.trigger.type).toBe('file_change');
      expect(hook.action.agent).toBe('bmad-qa');
    });

    it('should target code file patterns', () => {
      const hook = generator.createCodeReviewHook();
      
      const pattern = hook.trigger.pattern;
      expect(pattern).toMatch(/\*\.(js|ts|py|java|cpp|c|go|rs)/);
    });

    it('should include appropriate context for code review', () => {
      const hook = generator.createCodeReviewHook();
      
      expect(hook.action.context).toContain('#File');
      expect(hook.action.context).toContain('#Problems');
      expect(hook.action.context).toContain('#Git Diff');
    });
  });

  describe('createGitCommitHook', () => {
    it('should create valid git commit hook configuration', () => {
      const hook = generator.createGitCommitHook();
      
      expect(hook).toBeDefined();
      expect(hook.name).toBe('BMad Git Commit Status Update');
      expect(hook.trigger.type).toBe('git_commit');
      expect(hook.action.agent).toBe('bmad-scrum-master');
    });

    it('should include git-specific context', () => {
      const hook = generator.createGitCommitHook();
      
      expect(hook.action.context).toContain('#Git Diff');
      expect(hook.action.context).toContain('#File');
    });

    it('should have appropriate task for status updates', () => {
      const hook = generator.createGitCommitHook();
      
      expect(hook.action.task).toBe('update-story-status');
    });
  });

  describe('createDocumentationUpdateHook', () => {
    it('should create valid documentation update hook', () => {
      const hook = generator.createDocumentationUpdateHook();
      
      expect(hook).toBeDefined();
      expect(hook.name).toBe('BMad Documentation Update');
      expect(hook.trigger.type).toBe('file_change');
      expect(hook.action.agent).toBe('bmad-architect');
    });

    it('should target documentation files', () => {
      const hook = generator.createDocumentationUpdateHook();
      
      const pattern = hook.trigger.pattern;
      expect(pattern).toContain('requirements');
      expect(pattern).toContain('*.md');
    });

    it('should include codebase context for documentation', () => {
      const hook = generator.createDocumentationUpdateHook();
      
      expect(hook.action.context).toContain('#Codebase');
      expect(hook.action.context).toContain('#Folder');
    });
  });

  describe('createManualWorkflowControlHook', () => {
    it('should create valid manual control hook', () => {
      const hook = generator.createManualWorkflowControlHook();
      
      expect(hook).toBeDefined();
      expect(hook.name).toBe('BMad Manual Workflow Control');
      expect(hook.trigger.type).toBe('manual');
      expect(hook.action.agent).toBe('bmad-scrum-master');
    });

    it('should be manually triggered', () => {
      const hook = generator.createManualWorkflowControlHook();
      
      expect(hook.trigger.type).toBe('manual');
      expect(hook.description).toContain('manual');
    });

    it('should include comprehensive context', () => {
      const hook = generator.createManualWorkflowControlHook();
      
      expect(hook.action.context).toContain('#File');
      expect(hook.action.context).toContain('#Folder');
      expect(hook.action.context).toContain('#Codebase');
    });
  });

  describe('createBuildStatusHook', () => {
    it('should create valid build status hook', () => {
      const hook = generator.createBuildStatusHook();
      
      expect(hook).toBeDefined();
      expect(hook.name).toBe('BMad Build Status Integration');
      expect(hook.trigger.type).toBe('build_complete');
      expect(hook.action.agent).toBe('bmad-dev');
    });

    it('should include build-related context', () => {
      const hook = generator.createBuildStatusHook();
      
      expect(hook.action.context).toContain('#Terminal');
      expect(hook.action.context).toContain('#Problems');
    });

    it('should have appropriate task for build integration', () => {
      const hook = generator.createBuildStatusHook();
      
      expect(hook.action.task).toBe('integrate-build-results');
    });
  });

  describe('validateHookConfiguration', () => {
    it('should validate correct hook configuration', () => {
      const validHook = {
        name: 'Test Hook',
        description: 'Test hook description',
        trigger: {
          type: 'file_change',
          pattern: '*.js'
        },
        action: {
          agent: 'bmad-dev',
          task: 'test-task',
          context: ['#File']
        }
      };
      
      const isValid = generator.validateHookConfiguration(validHook);
      expect(isValid).toBe(true);
    });

    it('should reject hook without required fields', () => {
      const invalidHook = {
        name: 'Test Hook'
        // Missing required fields
      };
      
      const isValid = generator.validateHookConfiguration(invalidHook);
      expect(isValid).toBe(false);
    });

    it('should reject hook with invalid trigger type', () => {
      const invalidHook = {
        name: 'Test Hook',
        description: 'Test description',
        trigger: {
          type: 'invalid_trigger_type'
        },
        action: {
          agent: 'bmad-dev'
        }
      };
      
      const isValid = generator.validateHookConfiguration(invalidHook);
      expect(isValid).toBe(false);
    });

    it('should validate trigger patterns', () => {
      const hookWithPattern = {
        name: 'Test Hook',
        description: 'Test description',
        trigger: {
          type: 'file_change',
          pattern: '*.{js,ts,py}'
        },
        action: {
          agent: 'bmad-dev',
          task: 'test-task'
        }
      };
      
      const isValid = generator.validateHookConfiguration(hookWithPattern);
      expect(isValid).toBe(true);
    });
  });

  describe('generateHookYAML', () => {
    it('should generate valid YAML for hook configuration', () => {
      const hook = {
        name: 'Test Hook',
        description: 'Test hook description',
        trigger: {
          type: 'file_change',
          pattern: '*.js'
        },
        action: {
          agent: 'bmad-dev',
          task: 'test-task',
          context: ['#File', '#Problems']
        }
      };
      
      const yaml = generator.generateHookYAML(hook);
      
      expect(yaml).toBeDefined();
      expect(yaml).toContain('name: "Test Hook"');
      expect(yaml).toContain('type: "file_change"');
      expect(yaml).toContain('agent: "bmad-dev"');
      expect(yaml).toContain('- "#File"');
    });

    it('should handle complex hook configurations', () => {
      const complexHook = {
        name: 'Complex Hook',
        description: 'Complex hook with multiple conditions',
        trigger: {
          type: 'file_change',
          pattern: '**/*.{js,ts}',
          condition: 'task_completed',
          exclude: ['node_modules/**', 'dist/**']
        },
        action: {
          agent: 'bmad-dev',
          task: 'complex-task',
          context: ['#File', '#Folder', '#Problems', '#Git Diff'],
          parameters: {
            reviewLevel: 'thorough',
            includeTests: true
          }
        }
      };
      
      const yaml = generator.generateHookYAML(complexHook);
      
      expect(yaml).toContain('exclude:');
      expect(yaml).toContain('parameters:');
      expect(yaml).toContain('reviewLevel: "thorough"');
    });
  });

  describe('error handling', () => {
    it('should handle invalid workflow gracefully', async () => {
      const invalidWorkflow = null;
      const hooksOutputPath = path.join(testOutputDir, 'hooks');
      
      const success = await generator.generateHooksFromWorkflow(invalidWorkflow, hooksOutputPath);
      expect(success).toBe(false);
    });

    it('should handle file system errors', async () => {
      const mockWorkflow = { name: 'Test' };
      const invalidOutputPath = '/invalid/path/hooks';
      
      const success = await generator.generateHooksFromWorkflow(mockWorkflow, invalidOutputPath);
      expect(success).toBe(false);
    });

    it('should handle YAML generation errors', () => {
      const invalidHook = {
        name: 'Test',
        circular: null
      };
      invalidHook.circular = invalidHook; // Create circular reference
      
      expect(() => generator.generateHookYAML(invalidHook)).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should generate hooks for complete BMad workflow', async () => {
      const fullWorkflow = {
        name: 'Full Stack Development Workflow',
        phases: ['planning', 'architecture', 'implementation', 'testing', 'deployment'],
        agents: ['pm', 'architect', 'dev', 'qa'],
        transitions: [
          { from: 'planning', to: 'architecture', trigger: 'prd_complete' },
          { from: 'architecture', to: 'implementation', trigger: 'design_complete' },
          { from: 'implementation', to: 'testing', trigger: 'code_complete' },
          { from: 'testing', to: 'deployment', trigger: 'tests_pass' }
        ],
        automations: [
          { type: 'code_review', trigger: 'file_save', agent: 'qa' },
          { type: 'documentation', trigger: 'requirements_change', agent: 'architect' },
          { type: 'status_update', trigger: 'git_commit', agent: 'scrum-master' }
        ]
      };
      
      const hooksOutputPath = path.join(testOutputDir, 'full-hooks');
      const success = await generator.generateHooksFromWorkflow(fullWorkflow, hooksOutputPath);
      
      expect(success).toBe(true);
      
      // Check that multiple hook files were created
      const hookFiles = await fs.readdir(hooksOutputPath);
      expect(hookFiles.length).toBeGreaterThan(3);
      
      // Verify each hook file is valid YAML
      for (const hookFile of hookFiles) {
        if (hookFile.endsWith('.yaml')) {
          const hookPath = path.join(hooksOutputPath, hookFile);
          const content = await fs.readFile(hookPath, 'utf8');
          expect(content).toContain('name:');
          expect(content).toContain('trigger:');
          expect(content).toContain('action:');
        }
      }
    });

    it('should create hooks with proper agent dependencies', async () => {
      const workflowWithDeps = {
        name: 'Dependent Workflow',
        agents: ['pm', 'dev', 'qa'],
        dependencies: {
          'dev': ['pm'],
          'qa': ['dev']
        }
      };
      
      const hooksOutputPath = path.join(testOutputDir, 'dep-hooks');
      await generator.generateHooksFromWorkflow(workflowWithDeps, hooksOutputPath);
      
      const progressionHookPath = path.join(hooksOutputPath, 'bmad-story-progression.yaml');
      const hookContent = await fs.readFile(progressionHookPath, 'utf8');
      
      // Should respect agent dependencies in hook generation
      expect(hookContent).toContain('agent:');
    });
  });
});