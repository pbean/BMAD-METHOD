/**
 * Hook Generator
 * Creates intelligent Kiro hooks that automate BMad workflow progression
 */

const BaseTransformer = require('./base-transformer');
const path = require('path');
const yaml = require('js-yaml');

class HookGenerator extends BaseTransformer {
  constructor(options = {}) {
    super(options);
    this.hookTemplates = {
      storyProgression: this._getStoryProgressionTemplate(),
      codeReview: this._getCodeReviewTemplate(),
      documentationUpdate: this._getDocumentationUpdateTemplate(),
      buildStatus: this._getBuildStatusTemplate()
    };
  }

  /**
   * Generate hooks for automatic story progression
   * @param {Object} workflowConfig - Workflow configuration
   * @returns {Promise<Array>} - Generated hook configurations
   */
  async generateStoryProgressionHooks(workflowConfig = {}) {
    this.log('Generating story progression hooks');
    
    const hooks = [];
    const config = {
      storyLocation: workflowConfig.devStoryLocation || 'docs/stories',
      specLocation: workflowConfig.specLocation || '.kiro/specs',
      ...workflowConfig
    };

    // Story completion hook - triggers when story status changes to "Done"
    const storyCompletionHook = {
      name: 'BMad Story Completion',
      description: 'Automatically progress to next story when current story is marked as Done',
      trigger: {
        type: 'file_change',
        pattern: `${config.storyLocation}/*.story.md`,
        condition: 'story_status_done'
      },
      action: {
        agent: 'bmad-scrum-master',
        task: 'create-next-story',
        context: ['#File', '#Git Diff', '#Codebase']
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'story_progression',
        generated_at: new Date().toISOString()
      }
    };

    // Task completion hook - triggers when spec tasks are completed
    const taskCompletionHook = {
      name: 'BMad Task Completion',
      description: 'Update story status when spec tasks are completed',
      trigger: {
        type: 'file_change',
        pattern: `${config.specLocation}/*/tasks.md`,
        condition: 'task_marked_complete'
      },
      action: {
        agent: 'bmad-scrum-master',
        task: 'update-story-status',
        context: ['#File', '#Folder']
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'task_completion',
        generated_at: new Date().toISOString()
      }
    };

    hooks.push(storyCompletionHook, taskCompletionHook);
    
    this.log(`Generated ${hooks.length} story progression hooks`);
    return hooks;
  }

  /**
   * Create file-save triggers for code review workflows
   * @param {Object} reviewConfig - Review configuration
   * @returns {Promise<Array>} - Generated review hooks
   */
  async createCodeReviewHooks(reviewConfig = {}) {
    this.log('Generating code review hooks');
    
    const hooks = [];
    const config = {
      codePatterns: reviewConfig.codePatterns || ['src/**/*.{js,ts,jsx,tsx}', 'lib/**/*.{js,ts}'],
      reviewAgent: reviewConfig.reviewAgent || 'bmad-qa',
      autoReview: reviewConfig.autoReview !== false,
      ...reviewConfig
    };

    // Code file save hook - triggers QA review when code files are saved
    const codeReviewHook = {
      name: 'BMad Code Review',
      description: 'Trigger BMad QA agent review when code files are saved',
      trigger: {
        type: 'file_save',
        pattern: config.codePatterns,
        condition: 'file_modified'
      },
      action: {
        agent: config.reviewAgent,
        task: 'review-code-changes',
        context: ['#File', '#Git Diff', '#Problems', '#Terminal']
      },
      settings: {
        auto_trigger: config.autoReview,
        debounce_ms: 2000 // Wait 2 seconds after last save
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'code_review',
        generated_at: new Date().toISOString()
      }
    };

    // Test file update hook - triggers when tests are modified
    const testUpdateHook = {
      name: 'BMad Test Review',
      description: 'Review test coverage when test files are updated',
      trigger: {
        type: 'file_save',
        pattern: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}', 'tests/**/*'],
        condition: 'test_file_modified'
      },
      action: {
        agent: config.reviewAgent,
        task: 'review-test-coverage',
        context: ['#File', '#Folder', '#Terminal']
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'test_review',
        generated_at: new Date().toISOString()
      }
    };

    hooks.push(codeReviewHook, testUpdateHook);
    
    this.log(`Generated ${hooks.length} code review hooks`);
    return hooks;
  }

  /**
   * Generate documentation update hooks
   * @param {Object} docConfig - Documentation configuration
   * @returns {Promise<Array>} - Generated documentation hooks
   */
  async createDocumentationUpdateHooks(docConfig = {}) {
    this.log('Generating documentation update hooks');
    
    const hooks = [];
    const config = {
      prdLocation: docConfig.prdLocation || 'docs/prd.md',
      architectureLocation: docConfig.architectureLocation || 'docs/architecture',
      specLocation: docConfig.specLocation || '.kiro/specs',
      ...docConfig
    };

    // Requirements change hook - updates specs when PRD changes
    const requirementsUpdateHook = {
      name: 'BMad Requirements Update',
      description: 'Update Kiro specs when PRD requirements change',
      trigger: {
        type: 'file_change',
        pattern: config.prdLocation,
        condition: 'requirements_modified'
      },
      action: {
        agent: 'bmad-pm',
        task: 'update-spec-requirements',
        context: ['#File', '#Folder', '#Codebase']
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'documentation_update',
        generated_at: new Date().toISOString()
      }
    };

    // Architecture change hook - updates design docs when architecture changes
    const architectureUpdateHook = {
      name: 'BMad Architecture Update',
      description: 'Update Kiro spec design when architecture documents change',
      trigger: {
        type: 'file_change',
        pattern: `${config.architectureLocation}/**/*.md`,
        condition: 'architecture_modified'
      },
      action: {
        agent: 'bmad-architect',
        task: 'update-spec-design',
        context: ['#File', '#Folder', '#Codebase']
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'architecture_update',
        generated_at: new Date().toISOString()
      }
    };

    hooks.push(requirementsUpdateHook, architectureUpdateHook);
    
    this.log(`Generated ${hooks.length} documentation update hooks`);
    return hooks;
  }

  /**
   * Generate all workflow automation hooks
   * @param {Object} config - Complete workflow configuration
   * @returns {Promise<Array>} - All generated hooks
   */
  async generateWorkflowHooks(config = {}) {
    this.log('Generating complete workflow hook suite');
    
    const allHooks = [];
    
    // Generate story progression hooks
    const storyHooks = await this.generateStoryProgressionHooks(config);
    allHooks.push(...storyHooks);
    
    // Generate code review hooks
    const reviewHooks = await this.createCodeReviewHooks(config);
    allHooks.push(...reviewHooks);
    
    // Generate documentation update hooks
    const docHooks = await this.createDocumentationUpdateHooks(config);
    allHooks.push(...docHooks);
    
    // Generate git integration hooks
    const gitHooks = await this.createGitIntegrationHooks(config);
    allHooks.push(...gitHooks);
    
    // Generate manual control hooks
    const manualHooks = await this.createManualControlHooks(config);
    allHooks.push(...manualHooks);
    
    this.log(`Generated ${allHooks.length} total workflow hooks`);
    return allHooks;
  }

  /**
   * Save hooks to Kiro hooks directory
   * @param {Array} hooks - Hook configurations to save
   * @param {string} outputDir - Output directory (default: .kiro/hooks)
   * @returns {Promise<boolean>} - Success status
   */
  async saveHooks(hooks, outputDir = '.kiro/hooks') {
    this.log(`Saving ${hooks.length} hooks to ${outputDir}`);
    
    try {
      await this.validateAndEnsurePath(path.join(outputDir, 'placeholder'));
      
      const savedFiles = [];
      
      for (const hook of hooks) {
        const filename = this._generateHookFilename(hook.name);
        const filepath = path.join(outputDir, filename);
        
        // Convert hook to YAML format
        const yamlContent = yaml.dump(hook, {
          indent: 2,
          lineWidth: -1,
          noRefs: true
        });
        
        const success = await this.writeFile(filepath, yamlContent);
        if (success) {
          savedFiles.push(filepath);
          this.log(`Saved hook: ${filename}`);
        } else {
          this.log(`Failed to save hook: ${filename}`, 'error');
        }
      }
      
      this.log(`Successfully saved ${savedFiles.length}/${hooks.length} hooks`);
      return savedFiles.length === hooks.length;
      
    } catch (error) {
      this.log(`Error saving hooks: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Generate hook filename from hook name
   * @param {string} hookName - Hook name
   * @returns {string} - Filename
   */
  _generateHookFilename(hookName) {
    return hookName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '.yaml';
  }

  /**
   * Get story progression hook template
   * @returns {Object} - Hook template
   */
  _getStoryProgressionTemplate() {
    return {
      name: 'BMad Story Progression',
      description: 'Automatically progress to next story when current is completed',
      trigger: {
        type: 'file_change',
        pattern: 'docs/stories/*.md',
        condition: 'task_completed'
      },
      action: {
        agent: 'bmad-scrum-master',
        task: 'create-next-story',
        context: ['#File', '#Git Diff']
      }
    };
  }

  /**
   * Get code review hook template
   * @returns {Object} - Hook template
   */
  _getCodeReviewTemplate() {
    return {
      name: 'BMad Code Review',
      description: 'Trigger BMad QA agent when code files are saved',
      trigger: {
        type: 'file_save',
        pattern: 'src/**/*.{js,ts,jsx,tsx}',
        condition: 'file_modified'
      },
      action: {
        agent: 'bmad-qa',
        task: 'review-code-changes',
        context: ['#File', '#Git Diff', '#Problems']
      }
    };
  }

  /**
   * Get documentation update hook template
   * @returns {Object} - Hook template
   */
  _getDocumentationUpdateTemplate() {
    return {
      name: 'BMad Documentation Update',
      description: 'Update specs when documentation changes',
      trigger: {
        type: 'file_change',
        pattern: 'docs/**/*.md',
        condition: 'documentation_modified'
      },
      action: {
        agent: 'bmad-pm',
        task: 'update-spec-requirements',
        context: ['#File', '#Folder']
      }
    };
  }

  /**
   * Get build status hook template
   * @returns {Object} - Hook template
   */
  _getBuildStatusTemplate() {
    return {
      name: 'BMad Build Status',
      description: 'Integrate build results with story status',
      trigger: {
        type: 'build_complete',
        condition: 'build_status_changed'
      },
      action: {
        agent: 'bmad-dev',
        task: 'update-story-build-status',
        context: ['#Terminal', '#Problems']
      }
    };
  }

  /**
   * Implement git-commit hooks for status updates
   * @param {Object} gitConfig - Git integration configuration
   * @returns {Promise<Array>} - Generated git hooks
   */
  async createGitIntegrationHooks(gitConfig = {}) {
    this.log('Generating git integration hooks');
    
    const hooks = [];
    const config = {
      storyLocation: gitConfig.storyLocation || 'docs/stories',
      branchPattern: gitConfig.branchPattern || 'feature/*',
      commitMessagePattern: gitConfig.commitMessagePattern || /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/,
      autoUpdateStatus: gitConfig.autoUpdateStatus !== false,
      ...gitConfig
    };

    // Commit hook - updates story status when commits are made
    const commitStatusHook = {
      name: 'BMad Commit Status Update',
      description: 'Automatically update story status when commits are made to feature branches',
      trigger: {
        type: 'git_commit',
        branch_pattern: config.branchPattern,
        condition: 'commit_created'
      },
      action: {
        agent: 'bmad-scrum-master',
        task: 'update-story-from-commit',
        context: ['#Git Diff', '#File', '#Terminal']
      },
      settings: {
        auto_trigger: config.autoUpdateStatus,
        commit_message_validation: config.commitMessagePattern.toString()
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'git_commit',
        generated_at: new Date().toISOString()
      }
    };

    // Branch creation hook - creates new story when feature branch is created
    const branchCreationHook = {
      name: 'BMad Branch Story Creation',
      description: 'Create new story when feature branch is created',
      trigger: {
        type: 'git_branch_create',
        branch_pattern: config.branchPattern,
        condition: 'feature_branch_created'
      },
      action: {
        agent: 'bmad-scrum-master',
        task: 'create-story-from-branch',
        context: ['#Git Diff', '#Codebase']
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'branch_creation',
        generated_at: new Date().toISOString()
      }
    };

    // Merge hook - completes story when feature branch is merged
    const mergeCompletionHook = {
      name: 'BMad Merge Completion',
      description: 'Mark story as complete when feature branch is merged to main',
      trigger: {
        type: 'git_merge',
        source_pattern: config.branchPattern,
        target_branch: 'main',
        condition: 'merge_completed'
      },
      action: {
        agent: 'bmad-scrum-master',
        task: 'complete-story-from-merge',
        context: ['#Git Diff', '#File']
      },
      settings: {
        auto_complete_story: true,
        update_epic_progress: true
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'merge_completion',
        generated_at: new Date().toISOString()
      }
    };

    // Pull request hook - triggers review when PR is created
    const pullRequestHook = {
      name: 'BMad Pull Request Review',
      description: 'Trigger story review when pull request is created',
      trigger: {
        type: 'git_pull_request',
        action: 'opened',
        branch_pattern: config.branchPattern
      },
      action: {
        agent: 'bmad-qa',
        task: 'review-pull-request',
        context: ['#Git Diff', '#File', '#Problems']
      },
      settings: {
        auto_assign_reviewer: true,
        check_story_completion: true
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'pull_request',
        generated_at: new Date().toISOString()
      }
    };

    // Push hook - validates story progress when code is pushed
    const pushValidationHook = {
      name: 'BMad Push Validation',
      description: 'Validate story progress and requirements when code is pushed',
      trigger: {
        type: 'git_push',
        branch_pattern: config.branchPattern,
        condition: 'code_pushed'
      },
      action: {
        agent: 'bmad-dev',
        task: 'validate-story-progress',
        context: ['#Git Diff', '#File', '#Problems', '#Terminal']
      },
      settings: {
        validate_tests: true,
        check_acceptance_criteria: true,
        update_progress: true
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'push_validation',
        generated_at: new Date().toISOString()
      }
    };

    hooks.push(
      commitStatusHook,
      branchCreationHook,
      mergeCompletionHook,
      pullRequestHook,
      pushValidationHook
    );
    
    this.log(`Generated ${hooks.length} git integration hooks`);
    return hooks;
  }

  /**
   * Create user-triggered hooks for workflow control
   * @param {Object} controlConfig - Control configuration
   * @returns {Promise<Array>} - Generated control hooks
   */
  async createManualControlHooks(controlConfig = {}) {
    this.log('Generating manual workflow control hooks');
    
    const hooks = [];
    const config = {
      storyLocation: controlConfig.storyLocation || 'docs/stories',
      prdLocation: controlConfig.prdLocation || 'docs/prd.md',
      architectureLocation: controlConfig.architectureLocation || 'docs/architecture',
      specLocation: controlConfig.specLocation || '.kiro/specs',
      enableDebugHooks: controlConfig.enableDebugHooks !== false,
      ...controlConfig
    };

    // Manual story creation hook - allows user to manually create stories
    const manualStoryCreationHook = {
      name: 'BMad Manual Story Creation',
      description: 'Manually create a new story with user guidance',
      trigger: {
        type: 'manual',
        button_text: 'Create New Story',
        category: 'BMad Workflow'
      },
      action: {
        agent: 'bmad-scrum-master',
        task: 'create-story-manual',
        context: ['#File', '#Folder', '#Codebase']
      },
      settings: {
        show_in_command_palette: true,
        keyboard_shortcut: 'Ctrl+Shift+S'
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'manual_control',
        control_type: 'story_creation',
        generated_at: new Date().toISOString()
      }
    };

    // Manual story progression hook - allows user to manually progress stories
    const manualStoryProgressionHook = {
      name: 'BMad Manual Story Progression',
      description: 'Manually progress to the next story in the workflow',
      trigger: {
        type: 'manual',
        button_text: 'Progress to Next Story',
        category: 'BMad Workflow'
      },
      action: {
        agent: 'bmad-scrum-master',
        task: 'progress-story-manual',
        context: ['#File', '#Git Diff', '#Codebase']
      },
      settings: {
        show_in_command_palette: true,
        confirm_before_action: true
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'manual_control',
        control_type: 'story_progression',
        generated_at: new Date().toISOString()
      }
    };

    // Manual documentation regeneration hook
    const manualDocRegenerationHook = {
      name: 'BMad Regenerate Documentation',
      description: 'Manually regenerate PRD and architecture documents',
      trigger: {
        type: 'manual',
        button_text: 'Regenerate Docs',
        category: 'BMad Documentation'
      },
      action: {
        agent: 'bmad-pm',
        task: 'regenerate-documentation',
        context: ['#File', '#Folder', '#Codebase']
      },
      settings: {
        show_in_command_palette: true,
        backup_existing: true,
        confirm_before_action: true
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'manual_control',
        control_type: 'documentation_regen',
        generated_at: new Date().toISOString()
      }
    };

    // Manual workflow reset hook - allows resetting workflow state
    const manualWorkflowResetHook = {
      name: 'BMad Reset Workflow',
      description: 'Reset BMad workflow state and start fresh',
      trigger: {
        type: 'manual',
        button_text: 'Reset Workflow',
        category: 'BMad Workflow'
      },
      action: {
        agent: 'bmad-pm',
        task: 'reset-workflow-state',
        context: ['#Folder', '#Codebase']
      },
      settings: {
        show_in_command_palette: true,
        confirm_before_action: true,
        warning_message: 'This will reset all workflow progress. Are you sure?'
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'manual_control',
        control_type: 'workflow_reset',
        generated_at: new Date().toISOString()
      }
    };

    // Manual spec sync hook - synchronizes BMad docs with Kiro specs
    const manualSpecSyncHook = {
      name: 'BMad Sync Specs',
      description: 'Manually synchronize BMad documents with Kiro specs',
      trigger: {
        type: 'manual',
        button_text: 'Sync BMad to Specs',
        category: 'BMad Integration'
      },
      action: {
        agent: 'bmad-architect',
        task: 'sync-bmad-to-specs',
        context: ['#File', '#Folder', '#Codebase']
      },
      settings: {
        show_in_command_palette: true,
        backup_existing: true
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'manual_control',
        control_type: 'spec_sync',
        generated_at: new Date().toISOString()
      }
    };

    hooks.push(
      manualStoryCreationHook,
      manualStoryProgressionHook,
      manualDocRegenerationHook,
      manualWorkflowResetHook,
      manualSpecSyncHook
    );

    // Add debug hooks if enabled
    if (config.enableDebugHooks) {
      const debugHooks = this._createDebugHooks(config);
      hooks.push(...debugHooks);
    }
    
    this.log(`Generated ${hooks.length} manual control hooks`);
    return hooks;
  }

  /**
   * Create debug hooks for workflow troubleshooting
   * @param {Object} config - Configuration
   * @returns {Array} - Debug hooks
   */
  _createDebugHooks(config) {
    const debugHooks = [];

    // Workflow status debug hook
    const workflowStatusHook = {
      name: 'BMad Debug Workflow Status',
      description: 'Debug current BMad workflow status and state',
      trigger: {
        type: 'manual',
        button_text: 'Debug Workflow Status',
        category: 'BMad Debug'
      },
      action: {
        agent: 'bmad-scrum-master',
        task: 'debug-workflow-status',
        context: ['#File', '#Folder', '#Git Diff', '#Problems']
      },
      settings: {
        show_in_command_palette: true,
        debug_mode: true
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'manual_control',
        control_type: 'debug_status',
        generated_at: new Date().toISOString()
      }
    };

    // Context validation debug hook
    const contextValidationHook = {
      name: 'BMad Debug Context Validation',
      description: 'Validate BMad context and dependencies',
      trigger: {
        type: 'manual',
        button_text: 'Debug Context',
        category: 'BMad Debug'
      },
      action: {
        agent: 'bmad-architect',
        task: 'debug-context-validation',
        context: ['#File', '#Folder', '#Codebase', '#Problems']
      },
      settings: {
        show_in_command_palette: true,
        debug_mode: true,
        verbose_output: true
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'manual_control',
        control_type: 'debug_context',
        generated_at: new Date().toISOString()
      }
    };

    // Hook execution debug hook
    const hookDebugHook = {
      name: 'BMad Debug Hook Execution',
      description: 'Debug and test hook execution manually',
      trigger: {
        type: 'manual',
        button_text: 'Debug Hooks',
        category: 'BMad Debug'
      },
      action: {
        agent: 'bmad-dev',
        task: 'debug-hook-execution',
        context: ['#Terminal', '#Problems']
      },
      settings: {
        show_in_command_palette: true,
        debug_mode: true,
        test_mode: true
      },
      metadata: {
        bmad_integration: true,
        workflow_type: 'manual_control',
        control_type: 'debug_hooks',
        generated_at: new Date().toISOString()
      }
    };

    debugHooks.push(workflowStatusHook, contextValidationHook, hookDebugHook);
    return debugHooks;
  }
}

module.exports = HookGenerator;