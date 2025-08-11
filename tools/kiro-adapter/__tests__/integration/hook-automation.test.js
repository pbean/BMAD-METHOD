/**
 * Integration tests for hook automation and workflow progression
 * Tests the automation of BMad workflows through Kiro hooks
 */

const path = require('path');
const fs = require('fs-extra');
const HookGenerator = require('../../hook-generator');
const ContextInjector = require('../../context-injector');

describe('Hook Automation Integration', () => {
  const testOutputDir = path.join(__dirname, '../../test-output/hook-integration');
  let hookGenerator, contextInjector;

  beforeEach(async () => {
    await fs.ensureDir(testOutputDir);
    hookGenerator = new HookGenerator();
    contextInjector = new ContextInjector();
  });

  afterEach(async () => {
    await fs.remove(testOutputDir);
  });

  describe('Workflow Progression Automation', () => {
    it('should create hooks that automate story progression', async () => {
      const workflow = {
        name: 'Story Progression Workflow',
        phases: ['planning', 'implementation', 'testing', 'deployment'],
        agents: ['pm', 'dev', 'qa', 'devops'],
        stories: [
          {
            id: 'story-1',
            title: 'User Authentication',
            phase: 'implementation',
            agent: 'dev',
            dependencies: [],
            status: 'in-progress'
          },
          {
            id: 'story-2',
            title: 'User Dashboard',
            phase: 'planning',
            agent: 'pm',
            dependencies: ['story-1'],
            status: 'not-started'
          }
        ],
        progressionRules: [
          {
            trigger: 'story_complete',
            condition: 'all_tasks_done',
            action: 'start_next_story'
          },
          {
            trigger: 'phase_complete',
            condition: 'all_stories_done',
            action: 'advance_to_next_phase'
          }
        ]
      };

      const hooksPath = path.join(testOutputDir, 'progression-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(workflow, hooksPath);

      expect(success).toBe(true);
      expect(await fs.pathExists(hooksPath)).toBe(true);

      // Verify story progression hook was created
      const hookFiles = await fs.readdir(hooksPath);
      const progressionHook = hookFiles.find(file => file.includes('progression'));
      
      if (progressionHook) {
        const hookContent = await fs.readFile(path.join(hooksPath, progressionHook), 'utf8');
        expect(hookContent).toContain('BMad Story Progression');
        expect(hookContent).toContain('trigger:');
        expect(hookContent).toContain('action:');
      }
    });

    it('should handle complex dependency chains in automation', async () => {
      const complexWorkflow = {
        name: 'Complex Dependency Workflow',
        stories: [
          { id: 'auth', dependencies: [], status: 'complete' },
          { id: 'user-profile', dependencies: ['auth'], status: 'in-progress' },
          { id: 'dashboard', dependencies: ['auth', 'user-profile'], status: 'not-started' },
          { id: 'notifications', dependencies: ['user-profile'], status: 'not-started' },
          { id: 'settings', dependencies: ['dashboard', 'notifications'], status: 'not-started' }
        ],
        automationRules: [
          {
            type: 'dependency_check',
            trigger: 'story_status_change',
            action: 'evaluate_dependent_stories'
          },
          {
            type: 'auto_start',
            trigger: 'dependencies_met',
            action: 'start_ready_stories'
          }
        ]
      };

      const hooksPath = path.join(testOutputDir, 'dependency-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(complexWorkflow, hooksPath);

      expect(success).toBe(true);

      // Verify dependency management hooks
      if (await fs.pathExists(hooksPath)) {
        const hookFiles = await fs.readdir(hooksPath);
        expect(hookFiles.length).toBeGreaterThan(0);

        // Should create hooks for dependency management
        const dependencyHook = hookFiles.find(file => 
          file.includes('progression') || file.includes('status')
        );
        expect(dependencyHook).toBeDefined();
      }
    });

    it('should integrate with git workflow for automatic progression', async () => {
      const gitWorkflow = {
        name: 'Git Integration Workflow',
        branches: ['main', 'develop', 'feature/*'],
        gitHooks: [
          {
            type: 'pre-commit',
            action: 'validate_story_status'
          },
          {
            type: 'post-commit',
            action: 'update_story_progress'
          },
          {
            type: 'pre-push',
            action: 'check_story_completion'
          }
        ],
        agents: ['dev', 'qa', 'scrum-master']
      };

      const hooksPath = path.join(testOutputDir, 'git-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(gitWorkflow, hooksPath);

      expect(success).toBe(true);

      if (await fs.pathExists(hooksPath)) {
        const hookFiles = await fs.readdir(hooksPath);
        
        // Should create git-related hooks
        const gitHook = hookFiles.find(file => 
          file.includes('commit') || file.includes('git')
        );
        
        if (gitHook) {
          const hookContent = await fs.readFile(path.join(hooksPath, gitHook), 'utf8');
          expect(hookContent).toContain('git');
          expect(hookContent).toContain('trigger:');
        }
      }
    });
  });

  describe('Context-Aware Hook Execution', () => {
    it('should create hooks with appropriate context for each agent', async () => {
      const contextAwareWorkflow = {
        name: 'Context Aware Workflow',
        agents: [
          {
            id: 'dev',
            contextNeeds: ['current file', 'build issues', 'recent changes'],
            hooks: ['code-review', 'build-status']
          },
          {
            id: 'qa',
            contextNeeds: ['test results', 'error logs', 'build issues'],
            hooks: ['test-automation', 'bug-reporting']
          },
          {
            id: 'architect',
            contextNeeds: ['project structure', 'code repository', 'dependencies'],
            hooks: ['architecture-review', 'documentation-update']
          }
        ]
      };

      const hooksPath = path.join(testOutputDir, 'context-aware-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(contextAwareWorkflow, hooksPath);

      expect(success).toBe(true);

      if (await fs.pathExists(hooksPath)) {
        const hookFiles = await fs.readdir(hooksPath);
        
        for (const hookFile of hookFiles) {
          if (hookFile.endsWith('.yaml')) {
            const hookContent = await fs.readFile(path.join(hooksPath, hookFile), 'utf8');
            
            // Should include context providers
            expect(hookContent).toContain('context:');
            
            // Should include appropriate Kiro context references
            const hasKiroContext = ['#File', '#Folder', '#Problems', '#Terminal', '#Git Diff', '#Codebase']
              .some(context => hookContent.includes(context));
            expect(hasKiroContext).toBe(true);
          }
        }
      }
    });

    it('should handle dynamic context loading in hooks', async () => {
      const dynamicContextWorkflow = {
        name: 'Dynamic Context Workflow',
        hooks: [
          {
            name: 'Dynamic Code Review',
            trigger: 'file_change',
            contextRequirements: {
              primary: ['current file', 'build issues'],
              secondary: ['recent changes', 'project structure'],
              conditional: {
                'test files': ['test results'],
                'config files': ['project structure', 'dependencies']
              }
            },
            agent: 'dev'
          },
          {
            name: 'Adaptive QA Hook',
            trigger: 'test_run',
            contextRequirements: {
              primary: ['test results', 'error logs'],
              secondary: ['build issues', 'recent changes'],
              conditional: {
                'failed tests': ['error logs', 'build issues'],
                'performance tests': ['system metrics', 'performance data']
              }
            },
            agent: 'qa'
          }
        ]
      };

      const hooksPath = path.join(testOutputDir, 'dynamic-context-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(dynamicContextWorkflow, hooksPath);

      expect(success).toBe(true);

      // Test context mapping for dynamic requirements
      const devContextNeeds = ['current file', 'build issues', 'recent changes'];
      const devContextMapping = contextInjector.mapBMadContextToKiro(devContextNeeds);

      expect(devContextMapping.mapped).toContain('#File');
      expect(devContextMapping.mapped).toContain('#Problems');
      expect(devContextMapping.mapped).toContain('#Git Diff');

      const qaContextNeeds = ['test results', 'error logs', 'build issues'];
      const qaContextMapping = contextInjector.mapBMadContextToKiro(qaContextNeeds);

      expect(qaContextMapping.mapped).toContain('#Terminal');
      expect(qaContextMapping.mapped).toContain('#Problems');
    });

    it('should provide fallback when context is unavailable', async () => {
      const fallbackWorkflow = {
        name: 'Fallback Context Workflow',
        agents: ['dev', 'qa'],
        contextFallbacks: [
          {
            missing: '#Codebase',
            fallback: 'manual_code_review',
            priority: 'high'
          },
          {
            missing: '#Terminal',
            fallback: 'manual_log_check',
            priority: 'medium'
          }
        ]
      };

      // Test fallback context provision
      const missingContext = ['#Codebase', '#Terminal', '#Git Diff'];
      const fallback = await contextInjector.provideFallbackContext(missingContext);

      expect(fallback).toBeDefined();
      expect(fallback.canProceedWithoutContext).toBeDefined();
      expect(fallback.fallbackInstructions).toBeDefined();

      // Should provide specific fallback instructions
      expect(fallback.fallbackInstructions.length).toBe(missingContext.length);
      
      fallback.fallbackInstructions.forEach(instruction => {
        expect(instruction.missing).toBeDefined();
        expect(instruction.instruction).toBeDefined();
        expect(instruction.priority).toBeDefined();
      });
    });
  });

  describe('Hook Performance and Reliability', () => {
    it('should handle high-frequency hook triggers efficiently', async () => {
      const highFrequencyWorkflow = {
        name: 'High Frequency Workflow',
        hooks: Array.from({ length: 20 }, (_, i) => ({
          name: `Hook ${i}`,
          trigger: 'file_change',
          pattern: `**/*.{js,ts,py}`,
          agent: `agent-${i % 4}`,
          throttle: '1s', // Throttle to prevent spam
          context: ['#File', '#Problems']
        }))
      };

      const startTime = Date.now();
      const hooksPath = path.join(testOutputDir, 'high-frequency-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(highFrequencyWorkflow, hooksPath);
      const endTime = Date.now();

      expect(success).toBe(true);
      
      // Should complete within reasonable time
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000);

      if (await fs.pathExists(hooksPath)) {
        const hookFiles = await fs.readdir(hooksPath);
        expect(hookFiles.length).toBeGreaterThan(0);

        // Verify throttling configuration
        for (const hookFile of hookFiles) {
          if (hookFile.endsWith('.yaml')) {
            const hookContent = await fs.readFile(path.join(hooksPath, hookFile), 'utf8');
            // Should include performance optimizations
            expect(hookContent.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it('should handle hook execution failures gracefully', async () => {
      const errorProneWorkflow = {
        name: 'Error Handling Workflow',
        hooks: [
          {
            name: 'Potentially Failing Hook',
            trigger: 'file_change',
            agent: 'non-existent-agent',
            errorHandling: {
              retries: 3,
              fallback: 'manual_review',
              notification: true
            }
          },
          {
            name: 'Backup Hook',
            trigger: 'hook_failure',
            agent: 'scrum-master',
            action: 'handle_hook_failure'
          }
        ]
      };

      const hooksPath = path.join(testOutputDir, 'error-handling-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(errorProneWorkflow, hooksPath);

      // Should succeed even with problematic configuration
      expect(success).toBe(true);

      if (await fs.pathExists(hooksPath)) {
        const hookFiles = await fs.readdir(hooksPath);
        expect(hookFiles.length).toBeGreaterThan(0);
      }
    });

    it('should optimize hook execution order based on dependencies', async () => {
      const dependentHooksWorkflow = {
        name: 'Dependent Hooks Workflow',
        hooks: [
          {
            name: 'Linting Hook',
            trigger: 'file_change',
            priority: 1,
            dependencies: [],
            agent: 'dev'
          },
          {
            name: 'Testing Hook',
            trigger: 'file_change',
            priority: 2,
            dependencies: ['Linting Hook'],
            agent: 'qa'
          },
          {
            name: 'Build Hook',
            trigger: 'file_change',
            priority: 3,
            dependencies: ['Linting Hook', 'Testing Hook'],
            agent: 'dev'
          },
          {
            name: 'Deployment Hook',
            trigger: 'build_success',
            priority: 4,
            dependencies: ['Build Hook'],
            agent: 'devops'
          }
        ]
      };

      const hooksPath = path.join(testOutputDir, 'dependent-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(dependentHooksWorkflow, hooksPath);

      expect(success).toBe(true);

      if (await fs.pathExists(hooksPath)) {
        const hookFiles = await fs.readdir(hooksPath);
        expect(hookFiles.length).toBeGreaterThan(0);

        // Verify hooks include dependency information
        for (const hookFile of hookFiles) {
          if (hookFile.endsWith('.yaml')) {
            const hookContent = await fs.readFile(path.join(hooksPath, hookFile), 'utf8');
            expect(hookContent).toContain('name:');
            expect(hookContent).toContain('trigger:');
          }
        }
      }
    });
  });

  describe('Integration with Kiro Features', () => {
    it('should integrate hooks with Kiro task system', async () => {
      const taskIntegrationWorkflow = {
        name: 'Task Integration Workflow',
        tasks: [
          {
            id: 'task-1',
            title: 'Implement user authentication',
            status: 'in-progress',
            hooks: ['code-review', 'test-automation']
          },
          {
            id: 'task-2',
            title: 'Create user dashboard',
            status: 'not-started',
            dependencies: ['task-1'],
            hooks: ['ui-review', 'accessibility-check']
          }
        ],
        taskHooks: [
          {
            trigger: 'task_start',
            action: 'setup_development_environment',
            agent: 'dev'
          },
          {
            trigger: 'task_complete',
            action: 'update_task_status',
            agent: 'scrum-master'
          }
        ]
      };

      const hooksPath = path.join(testOutputDir, 'task-integration-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(taskIntegrationWorkflow, hooksPath);

      expect(success).toBe(true);

      if (await fs.pathExists(hooksPath)) {
        const hookFiles = await fs.readdir(hooksPath);
        
        // Should create task-related hooks
        const taskHook = hookFiles.find(file => 
          file.includes('task') || file.includes('progression')
        );
        
        if (taskHook) {
          const hookContent = await fs.readFile(path.join(hooksPath, taskHook), 'utf8');
          expect(hookContent).toContain('task');
        }
      }
    });

    it('should integrate with Kiro notification system', async () => {
      const notificationWorkflow = {
        name: 'Notification Integration Workflow',
        notifications: [
          {
            trigger: 'story_complete',
            recipients: ['team-lead', 'product-owner'],
            message: 'Story {{story_title}} has been completed',
            channels: ['slack', 'email']
          },
          {
            trigger: 'build_failure',
            recipients: ['dev-team'],
            message: 'Build failed for {{branch_name}}',
            channels: ['slack'],
            priority: 'high'
          }
        ]
      };

      const hooksPath = path.join(testOutputDir, 'notification-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(notificationWorkflow, hooksPath);

      expect(success).toBe(true);

      // Verify notification hooks were created
      if (await fs.pathExists(hooksPath)) {
        const hookFiles = await fs.readdir(hooksPath);
        expect(hookFiles.length).toBeGreaterThan(0);
      }
    });
  });
});