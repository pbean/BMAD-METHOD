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
    
    // Domain-specific hook templates for expansion packs
    this.domainHookTemplates = {
      gamedev: this._getGameDevHookTemplates(),
      infrastructure: this._getInfrastructureHookTemplates(),
      unity: this._getUnityGameDevHookTemplates()
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
   * Generate domain-specific hooks for expansion pack agents
   * @param {Object} expansionPack - Expansion pack configuration
   * @param {Array} agents - Agents in the expansion pack
   * @param {Object} config - Hook generation configuration
   * @returns {Promise<Array>} - Generated domain-specific hooks
   */
  async generateDomainSpecificHooks(expansionPack, agents = [], config = {}) {
    this.log(`Generating domain-specific hooks for ${expansionPack.name}`);
    
    const hooks = [];
    const domain = this._identifyDomain(expansionPack);
    
    if (!domain) {
      this.log(`No domain-specific hooks available for ${expansionPack.name}`, 'warn');
      return hooks;
    }
    
    // Generate hooks based on domain type
    switch (domain) {
      case 'gamedev':
        const gameHooks = await this._generateGameDevelopmentHooks(expansionPack, agents, config);
        hooks.push(...gameHooks);
        break;
        
      case 'infrastructure':
        const infraHooks = await this._generateInfrastructureHooks(expansionPack, agents, config);
        hooks.push(...infraHooks);
        break;
        
      case 'unity':
        const unityHooks = await this._generateUnityGameDevHooks(expansionPack, agents, config);
        hooks.push(...unityHooks);
        break;
        
      default:
        this.log(`Unknown domain type: ${domain}`, 'warn');
    }
    
    // Generate workflow automation hooks based on expansion pack workflows
    const workflowHooks = await this._generateWorkflowAutomationHooks(expansionPack, agents, config);
    hooks.push(...workflowHooks);
    
    // Generate manual trigger hooks for expansion pack agents
    const manualHooks = await this._generateExpansionManualHooks(expansionPack, agents, config);
    hooks.push(...manualHooks);
    
    this.log(`Generated ${hooks.length} domain-specific hooks for ${expansionPack.name}`);
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
    
    // Generate domain-specific hooks if expansion packs are configured
    if (config.expansionPacks && config.expansionPacks.length > 0) {
      for (const expansionPack of config.expansionPacks) {
        const domainHooks = await this.generateDomainSpecificHooks(
          expansionPack, 
          expansionPack.agents || [], 
          config
        );
        allHooks.push(...domainHooks);
      }
    }
    
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
        
        // Convert hook to YAML format with Kiro event system integration
        const kiroIntegratedHook = this._integrateWithKiroEventSystem(hook);
        const yamlContent = yaml.dump(kiroIntegratedHook, {
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
   * Integrate hook with Kiro's event system
   * @param {Object} hook - Hook configuration
   * @returns {Object} - Hook with Kiro event system integration
   */
  _integrateWithKiroEventSystem(hook) {
    const integratedHook = { ...hook };
    
    // Add Kiro-specific event system properties
    integratedHook.kiro_integration = {
      version: '1.0',
      event_system_compatible: true,
      supports_context_injection: true,
      supports_agent_activation: true
    };
    
    // Ensure trigger has proper Kiro event format
    if (integratedHook.trigger) {
      integratedHook.trigger.kiro_event_type = this._mapToKiroEventType(integratedHook.trigger.type);
      
      // Add event system specific properties
      if (integratedHook.trigger.type === 'file_change' || integratedHook.trigger.type === 'file_save') {
        integratedHook.trigger.watch_mode = 'active';
        integratedHook.trigger.event_debounce = integratedHook.settings?.debounce_ms || 1000;
      }
      
      if (integratedHook.trigger.type === 'manual') {
        integratedHook.trigger.ui_integration = {
          command_palette: integratedHook.settings?.show_in_command_palette || false,
          button_location: 'agent_panel',
          keyboard_shortcut: integratedHook.settings?.keyboard_shortcut || null
        };
      }
    }
    
    // Ensure action has proper Kiro agent activation format
    if (integratedHook.action) {
      integratedHook.action.activation_method = 'kiro_native';
      integratedHook.action.context_injection = true;
      integratedHook.action.agent_registry_lookup = true;
      
      // Add context validation
      if (integratedHook.action.context && Array.isArray(integratedHook.action.context)) {
        integratedHook.action.context_validation = {
          required_contexts: integratedHook.action.context,
          validate_before_execution: true
        };
      }
    }
    
    // Add error handling and retry configuration
    integratedHook.error_handling = {
      retry_attempts: 3,
      retry_delay_ms: 1000,
      fallback_to_steering: true,
      log_errors: true
    };
    
    return integratedHook;
  }

  /**
   * Map trigger type to Kiro event system type
   * @param {string} triggerType - Original trigger type
   * @returns {string} - Kiro event system type
   */
  _mapToKiroEventType(triggerType) {
    const eventTypeMap = {
      'file_change': 'kiro.file.changed',
      'file_save': 'kiro.file.saved',
      'git_commit': 'kiro.git.commit',
      'git_push': 'kiro.git.push',
      'git_pull_request': 'kiro.git.pull_request',
      'git_merge': 'kiro.git.merge',
      'git_branch_create': 'kiro.git.branch.created',
      'build_complete': 'kiro.build.completed',
      'manual': 'kiro.user.manual_trigger'
    };
    
    return eventTypeMap[triggerType] || `kiro.custom.${triggerType}`;
  }

  /**
   * Generate workflow automation hooks based on agent capabilities
   * @param {Array} agents - Agent configurations with capabilities
   * @param {Object} config - Hook generation configuration
   * @returns {Promise<Array>} - Generated capability-based hooks
   */
  async generateHooksFromAgentCapabilities(agents, config = {}) {
    this.log('Generating hooks based on agent capabilities');
    
    const hooks = [];
    
    for (const agent of agents) {
      if (!agent.capabilities || !Array.isArray(agent.capabilities)) {
        continue;
      }
      
      for (const capability of agent.capabilities) {
        const capabilityHooks = await this._generateCapabilityHooks(agent, capability, config);
        hooks.push(...capabilityHooks);
      }
    }
    
    this.log(`Generated ${hooks.length} capability-based hooks`);
    return hooks;
  }

  /**
   * Generate hooks for a specific agent capability
   * @param {Object} agent - Agent configuration
   * @param {Object} capability - Capability definition
   * @param {Object} config - Configuration
   * @returns {Promise<Array>} - Generated hooks for the capability
   */
  async _generateCapabilityHooks(agent, capability, config) {
    const hooks = [];
    
    // Generate automatic trigger hooks based on capability triggers
    if (capability.triggers && Array.isArray(capability.triggers)) {
      for (const trigger of capability.triggers) {
        const autoHook = {
          name: `${agent.name} - ${capability.name} Auto Trigger`,
          description: `Automatically trigger ${capability.name} capability of ${agent.name}`,
          trigger: {
            type: trigger.type || 'file_change',
            pattern: trigger.pattern || '**/*',
            condition: trigger.condition || 'file_modified'
          },
          action: {
            agent: agent.id || agent.name,
            task: capability.task || 'execute-capability',
            context: capability.context || ['#File', '#Folder']
          },
          settings: {
            auto_trigger: true,
            debounce_ms: trigger.debounce_ms || 1000
          },
          metadata: {
            bmad_integration: true,
            capability_based: true,
            agent_name: agent.name,
            capability_name: capability.name,
            generated_at: new Date().toISOString()
          }
        };
        
        hooks.push(autoHook);
      }
    }
    
    // Generate manual trigger hook for the capability
    const manualHook = {
      name: `${agent.name} - ${capability.name}`,
      description: `Manually trigger ${capability.name} capability of ${agent.name}`,
      trigger: {
        type: 'manual',
        button_text: `${capability.name}`,
        category: agent.name
      },
      action: {
        agent: agent.id || agent.name,
        task: capability.task || 'execute-capability',
        context: capability.context || ['#File', '#Folder', '#Codebase']
      },
      settings: {
        show_in_command_palette: true,
        capability_execution: true
      },
      metadata: {
        bmad_integration: true,
        capability_based: true,
        agent_name: agent.name,
        capability_name: capability.name,
        manual_trigger: true,
        generated_at: new Date().toISOString()
      }
    };
    
    hooks.push(manualHook);
    
    return hooks;
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
      description: 'Trigger BMad QA agent for code review when code files are saved',
      trigger: {
        type: 'file_change',
        pattern: '**/*.{js,ts,py,java,cpp,c,go,rs}',
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

  /**
   * Identify domain type from expansion pack configuration
   * @param {Object} expansionPack - Expansion pack configuration
   * @returns {string|null} - Domain identifier
   */
  _identifyDomain(expansionPack) {
    const name = expansionPack.name.toLowerCase();
    
    if (name.includes('phaser') || name.includes('2d-phaser')) {
      return 'gamedev';
    }
    
    if (name.includes('unity') || name.includes('2d-unity')) {
      return 'unity';
    }
    
    if (name.includes('infrastructure') || name.includes('devops')) {
      return 'infrastructure';
    }
    
    // Check description for domain indicators
    const description = (expansionPack.description || '').toLowerCase();
    if (description.includes('game') && description.includes('development')) {
      return name.includes('unity') ? 'unity' : 'gamedev';
    }
    
    if (description.includes('infrastructure') || description.includes('devops')) {
      return 'infrastructure';
    }
    
    return null;
  }

  /**
   * Generate game development specific hooks
   * @param {Object} expansionPack - Expansion pack configuration
   * @param {Array} agents - Agents in the expansion pack
   * @param {Object} config - Configuration
   * @returns {Promise<Array>} - Game development hooks
   */
  async _generateGameDevelopmentHooks(expansionPack, agents, config) {
    this.log('Generating game development hooks');
    
    const hooks = [];
    
    // Game asset update hook - triggers when game assets are modified
    const assetUpdateHook = {
      name: 'Game Asset Update',
      description: 'Automatically update game configuration when assets are modified',
      trigger: {
        type: 'file_change',
        pattern: ['assets/**/*.{png,jpg,jpeg,gif,svg,json,xml}', 'src/assets/**/*'],
        condition: 'asset_modified'
      },
      action: {
        agent: 'game-developer',
        task: 'update-asset-references',
        context: ['#File', '#Folder', '#Codebase']
      },
      settings: {
        debounce_ms: 1000,
        batch_changes: true
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'asset_management',
        domain: 'gamedev',
        generated_at: new Date().toISOString()
      }
    };

    // Game design document update hook
    const gameDesignUpdateHook = {
      name: 'Game Design Update',
      description: 'Update game implementation when design documents change',
      trigger: {
        type: 'file_change',
        pattern: ['docs/design/game-*.md', 'docs/design/level-*.md'],
        condition: 'design_modified'
      },
      action: {
        agent: 'game-designer',
        task: 'sync-design-to-implementation',
        context: ['#File', '#Folder', '#Codebase']
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'design_sync',
        domain: 'gamedev',
        generated_at: new Date().toISOString()
      }
    };

    // Game build and test hook
    const gameBuildHook = {
      name: 'Game Build Validation',
      description: 'Validate game build and performance when code changes',
      trigger: {
        type: 'file_save',
        pattern: ['src/**/*.{ts,js}', 'src/game/**/*'],
        condition: 'game_code_modified'
      },
      action: {
        agent: 'game-developer',
        task: 'validate-game-build',
        context: ['#File', '#Terminal', '#Problems']
      },
      settings: {
        debounce_ms: 2000,
        auto_trigger: true,
        performance_check: true
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'build_validation',
        domain: 'gamedev',
        generated_at: new Date().toISOString()
      }
    };

    // Game playtesting hook
    const playtestHook = {
      name: 'Game Playtest Trigger',
      description: 'Trigger playtesting when game mechanics are implemented',
      trigger: {
        type: 'manual',
        button_text: 'Start Playtest Session',
        category: 'Game Development'
      },
      action: {
        agent: 'game-designer',
        task: 'conduct-playtest-session',
        context: ['#File', '#Folder', '#Terminal']
      },
      settings: {
        show_in_command_palette: true,
        confirm_before_action: false
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'playtesting',
        domain: 'gamedev',
        generated_at: new Date().toISOString()
      }
    };

    hooks.push(assetUpdateHook, gameDesignUpdateHook, gameBuildHook, playtestHook);
    
    this.log(`Generated ${hooks.length} game development hooks`);
    return hooks;
  }

  /**
   * Generate Unity game development specific hooks
   * @param {Object} expansionPack - Expansion pack configuration
   * @param {Array} agents - Agents in the expansion pack
   * @param {Object} config - Configuration
   * @returns {Promise<Array>} - Unity game development hooks
   */
  async _generateUnityGameDevHooks(expansionPack, agents, config) {
    this.log('Generating Unity game development hooks');
    
    const hooks = [];
    
    // Unity scene update hook
    const sceneUpdateHook = {
      name: 'Unity Scene Update',
      description: 'Update game logic when Unity scenes are modified',
      trigger: {
        type: 'file_change',
        pattern: ['Assets/Scenes/**/*.unity', 'Assets/**/*.prefab'],
        condition: 'unity_asset_modified'
      },
      action: {
        agent: 'game-developer',
        task: 'sync-unity-scene-changes',
        context: ['#File', '#Folder', '#Codebase']
      },
      settings: {
        debounce_ms: 1500,
        unity_integration: true
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'unity_scene_sync',
        domain: 'unity',
        generated_at: new Date().toISOString()
      }
    };

    // Unity script compilation hook
    const scriptCompilationHook = {
      name: 'Unity Script Compilation',
      description: 'Validate Unity C# scripts on save',
      trigger: {
        type: 'file_save',
        pattern: ['Assets/**/*.cs', 'Scripts/**/*.cs'],
        condition: 'csharp_script_modified'
      },
      action: {
        agent: 'game-developer',
        task: 'validate-unity-scripts',
        context: ['#File', '#Problems', '#Terminal']
      },
      settings: {
        debounce_ms: 1000,
        compile_check: true,
        unity_console_integration: true
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'script_validation',
        domain: 'unity',
        generated_at: new Date().toISOString()
      }
    };

    // Unity build hook
    const unityBuildHook = {
      name: 'Unity Build Validation',
      description: 'Validate Unity build settings and performance',
      trigger: {
        type: 'manual',
        button_text: 'Validate Unity Build',
        category: 'Unity Development'
      },
      action: {
        agent: 'game-developer',
        task: 'validate-unity-build',
        context: ['#Folder', '#Terminal', '#Problems']
      },
      settings: {
        show_in_command_palette: true,
        unity_build_check: true
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'build_validation',
        domain: 'unity',
        generated_at: new Date().toISOString()
      }
    };

    hooks.push(sceneUpdateHook, scriptCompilationHook, unityBuildHook);
    
    this.log(`Generated ${hooks.length} Unity game development hooks`);
    return hooks;
  }

  /**
   * Generate infrastructure and DevOps specific hooks
   * @param {Object} expansionPack - Expansion pack configuration
   * @param {Array} agents - Agents in the expansion pack
   * @param {Object} config - Configuration
   * @returns {Promise<Array>} - Infrastructure hooks
   */
  async _generateInfrastructureHooks(expansionPack, agents, config) {
    this.log('Generating infrastructure and DevOps hooks');
    
    const hooks = [];
    
    // Infrastructure configuration update hook
    const infraConfigHook = {
      name: 'Infrastructure Config Update',
      description: 'Validate infrastructure configuration when IaC files change',
      trigger: {
        type: 'file_change',
        pattern: ['**/*.tf', '**/*.yaml', '**/*.yml', 'infrastructure/**/*', 'terraform/**/*'],
        condition: 'infrastructure_config_modified'
      },
      action: {
        agent: 'infra-devops-platform',
        task: 'validate-infrastructure-config',
        context: ['#File', '#Folder', '#Terminal', '#Problems']
      },
      settings: {
        debounce_ms: 2000,
        terraform_validation: true,
        security_scan: true
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'infrastructure_validation',
        domain: 'infrastructure',
        generated_at: new Date().toISOString()
      }
    };

    // Deployment pipeline hook
    const deploymentHook = {
      name: 'Deployment Pipeline Trigger',
      description: 'Trigger deployment validation when deployment configs change',
      trigger: {
        type: 'file_change',
        pattern: ['.github/workflows/**/*.yml', 'deploy/**/*', 'k8s/**/*.yaml'],
        condition: 'deployment_config_modified'
      },
      action: {
        agent: 'infra-devops-platform',
        task: 'validate-deployment-pipeline',
        context: ['#File', '#Folder', '#Git Diff', '#Terminal']
      },
      settings: {
        pipeline_validation: true,
        security_check: true
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'deployment_validation',
        domain: 'infrastructure',
        generated_at: new Date().toISOString()
      }
    };

    // Infrastructure monitoring hook
    const monitoringHook = {
      name: 'Infrastructure Monitoring Setup',
      description: 'Set up monitoring when infrastructure is deployed',
      trigger: {
        type: 'manual',
        button_text: 'Setup Infrastructure Monitoring',
        category: 'Infrastructure'
      },
      action: {
        agent: 'infra-devops-platform',
        task: 'setup-infrastructure-monitoring',
        context: ['#Folder', '#Terminal', '#Codebase']
      },
      settings: {
        show_in_command_palette: true,
        monitoring_integration: true
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'monitoring_setup',
        domain: 'infrastructure',
        generated_at: new Date().toISOString()
      }
    };

    // Security audit hook
    const securityAuditHook = {
      name: 'Infrastructure Security Audit',
      description: 'Perform security audit of infrastructure configuration',
      trigger: {
        type: 'manual',
        button_text: 'Run Security Audit',
        category: 'Infrastructure Security'
      },
      action: {
        agent: 'infra-devops-platform',
        task: 'audit-infrastructure-security',
        context: ['#Folder', '#Terminal', '#Problems']
      },
      settings: {
        show_in_command_palette: true,
        security_scan: true,
        compliance_check: true
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'security_audit',
        domain: 'infrastructure',
        generated_at: new Date().toISOString()
      }
    };

    hooks.push(infraConfigHook, deploymentHook, monitoringHook, securityAuditHook);
    
    this.log(`Generated ${hooks.length} infrastructure hooks`);
    return hooks;
  }

  /**
   * Generate workflow automation hooks based on expansion pack workflows
   * @param {Object} expansionPack - Expansion pack configuration
   * @param {Array} agents - Agents in the expansion pack
   * @param {Object} config - Configuration
   * @returns {Promise<Array>} - Workflow automation hooks
   */
  async _generateWorkflowAutomationHooks(expansionPack, agents, config) {
    this.log(`Generating workflow automation hooks for ${expansionPack.name}`);
    
    const hooks = [];
    
    // Generic workflow progression hook for expansion packs
    const workflowProgressionHook = {
      name: `${expansionPack.name} Workflow Progression`,
      description: `Automatically progress ${expansionPack.name} workflow when phases complete`,
      trigger: {
        type: 'file_change',
        pattern: ['docs/**/*.md', '.kiro/specs/**/*.md'],
        condition: 'workflow_phase_complete'
      },
      action: {
        agent: agents.find(a => a.includes('sm')) || agents[0] || 'bmad-scrum-master',
        task: 'progress-expansion-workflow',
        context: ['#File', '#Folder', '#Git Diff', '#Codebase']
      },
      settings: {
        expansion_pack_specific: true,
        workflow_validation: true
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'expansion_workflow_progression',
        generated_at: new Date().toISOString()
      }
    };

    // Expansion pack documentation sync hook
    const docSyncHook = {
      name: `${expansionPack.name} Documentation Sync`,
      description: `Sync ${expansionPack.name} documentation with implementation`,
      trigger: {
        type: 'file_change',
        pattern: ['docs/**/*.md', 'README.md'],
        condition: 'expansion_docs_modified'
      },
      action: {
        agent: agents.find(a => a.includes('architect') || a.includes('designer')) || agents[0] || 'bmad-architect',
        task: 'sync-expansion-documentation',
        context: ['#File', '#Folder', '#Codebase']
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'documentation_sync',
        generated_at: new Date().toISOString()
      }
    };

    hooks.push(workflowProgressionHook, docSyncHook);
    
    this.log(`Generated ${hooks.length} workflow automation hooks`);
    return hooks;
  }

  /**
   * Generate manual trigger hooks for expansion pack agents
   * @param {Object} expansionPack - Expansion pack configuration
   * @param {Array} agents - Agents in the expansion pack
   * @param {Object} config - Configuration
   * @returns {Promise<Array>} - Manual trigger hooks
   */
  async _generateExpansionManualHooks(expansionPack, agents, config) {
    this.log(`Generating manual trigger hooks for ${expansionPack.name}`);
    
    const hooks = [];
    
    // Create manual hooks for each agent in the expansion pack
    for (const agentName of agents) {
      const manualAgentHook = {
        name: `Activate ${agentName}`,
        description: `Manually activate ${agentName} from ${expansionPack.name}`,
        trigger: {
          type: 'manual',
          button_text: `Activate ${agentName}`,
          category: expansionPack.name
        },
        action: {
          agent: agentName,
          task: 'agent-activation',
          context: ['#File', '#Folder', '#Codebase']
        },
        settings: {
          show_in_command_palette: true,
          expansion_pack_agent: true
        },
        metadata: {
          bmad_integration: true,
          expansion_pack: expansionPack.name,
          workflow_type: 'manual_agent_activation',
          agent_name: agentName,
          generated_at: new Date().toISOString()
        }
      };
      
      hooks.push(manualAgentHook);
    }

    // Create expansion pack workflow reset hook
    const workflowResetHook = {
      name: `Reset ${expansionPack.name} Workflow`,
      description: `Reset ${expansionPack.name} workflow state and start fresh`,
      trigger: {
        type: 'manual',
        button_text: `Reset ${expansionPack.name} Workflow`,
        category: expansionPack.name
      },
      action: {
        agent: agents.find(a => a.includes('sm')) || agents[0] || 'bmad-scrum-master',
        task: 'reset-expansion-workflow',
        context: ['#Folder', '#Codebase']
      },
      settings: {
        show_in_command_palette: true,
        confirm_before_action: true,
        warning_message: `This will reset all ${expansionPack.name} workflow progress. Are you sure?`
      },
      metadata: {
        bmad_integration: true,
        expansion_pack: expansionPack.name,
        workflow_type: 'expansion_workflow_reset',
        generated_at: new Date().toISOString()
      }
    };

    hooks.push(workflowResetHook);
    
    this.log(`Generated ${hooks.length} manual trigger hooks`);
    return hooks;
  }

  /**
   * Get game development hook templates
   * @returns {Object} - Game development hook templates
   */
  _getGameDevHookTemplates() {
    return {
      assetUpdate: {
        name: 'Game Asset Update',
        trigger: { type: 'file_change', pattern: 'assets/**/*' },
        action: { agent: 'game-developer', task: 'update-asset-references' }
      },
      buildValidation: {
        name: 'Game Build Validation',
        trigger: { type: 'file_save', pattern: 'src/**/*.{ts,js}' },
        action: { agent: 'game-developer', task: 'validate-game-build' }
      },
      playtesting: {
        name: 'Game Playtest Trigger',
        trigger: { type: 'manual', button_text: 'Start Playtest' },
        action: { agent: 'game-designer', task: 'conduct-playtest-session' }
      }
    };
  }

  /**
   * Get Unity game development hook templates
   * @returns {Object} - Unity game development hook templates
   */
  _getUnityGameDevHookTemplates() {
    return {
      sceneUpdate: {
        name: 'Unity Scene Update',
        trigger: { type: 'file_change', pattern: 'Assets/Scenes/**/*.unity' },
        action: { agent: 'game-developer', task: 'sync-unity-scene-changes' }
      },
      scriptValidation: {
        name: 'Unity Script Validation',
        trigger: { type: 'file_save', pattern: 'Assets/**/*.cs' },
        action: { agent: 'game-developer', task: 'validate-unity-scripts' }
      }
    };
  }

  /**
   * Get infrastructure hook templates
   * @returns {Object} - Infrastructure hook templates
   */
  _getInfrastructureHookTemplates() {
    return {
      configValidation: {
        name: 'Infrastructure Config Validation',
        trigger: { type: 'file_change', pattern: '**/*.tf' },
        action: { agent: 'infra-devops-platform', task: 'validate-infrastructure-config' }
      },
      deploymentValidation: {
        name: 'Deployment Pipeline Validation',
        trigger: { type: 'file_change', pattern: '.github/workflows/**/*.yml' },
        action: { agent: 'infra-devops-platform', task: 'validate-deployment-pipeline' }
      },
      securityAudit: {
        name: 'Infrastructure Security Audit',
        trigger: { type: 'manual', button_text: 'Run Security Audit' },
        action: { agent: 'infra-devops-platform', task: 'audit-infrastructure-security' }
      }
    };
  }

  // Legacy methods for backward compatibility with existing tests
  
  /**
   * Generate hooks from workflow (legacy method for tests)
   * @param {Object} workflow - Workflow configuration
   * @param {string} outputPath - Output path for hooks
   * @returns {Promise<boolean>} - Success status
   */
  async generateHooksFromWorkflow(workflow, outputPath) {
    if (!workflow) {
      return false;
    }
    
    try {
      const hooks = await this.generateWorkflowHooks({
        workflow: workflow,
        storyLocation: 'docs/stories',
        specLocation: '.kiro/specs'
      });
      
      if (outputPath) {
        return await this.saveHooks(hooks, outputPath);
      }
      
      return hooks.length > 0;
    } catch (error) {
      this.log(`Error generating hooks from workflow: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Create story progression hook (legacy method for tests)
   * @returns {Object} - Story progression hook
   */
  createStoryProgressionHook() {
    return this._getStoryProgressionTemplate();
  }

  /**
   * Create code review hook (legacy method for tests)
   * @returns {Object} - Code review hook
   */
  createCodeReviewHook() {
    return this._getCodeReviewTemplate();
  }

  /**
   * Create git commit hook (legacy method for tests)
   * @returns {Object} - Git commit hook
   */
  createGitCommitHook() {
    return {
      name: 'BMad Git Commit Status Update',
      description: 'Update story status when commits are made',
      trigger: {
        type: 'git_commit',
        condition: 'commit_created'
      },
      action: {
        agent: 'bmad-scrum-master',
        task: 'update-story-status',
        context: ['#Git Diff', '#File']
      }
    };
  }

  /**
   * Create documentation update hook (legacy method for tests)
   * @returns {Object} - Documentation update hook
   */
  createDocumentationUpdateHook() {
    return {
      name: 'BMad Documentation Update',
      description: 'Update specs when documentation changes',
      trigger: {
        type: 'file_change',
        pattern: 'docs/requirements/**/*.md',
        condition: 'documentation_modified'
      },
      action: {
        agent: 'bmad-architect',
        task: 'update-spec-requirements',
        context: ['#File', '#Folder', '#Codebase']
      }
    };
  }

  /**
   * Create manual workflow control hook (legacy method for tests)
   * @returns {Object} - Manual workflow control hook
   */
  createManualWorkflowControlHook() {
    return {
      name: 'BMad Manual Workflow Control',
      description: 'Manually control BMad workflow progression',
      trigger: {
        type: 'manual',
        button_text: 'Control Workflow'
      },
      action: {
        agent: 'bmad-scrum-master',
        task: 'manual-workflow-control',
        context: ['#File', '#Folder', '#Codebase']
      }
    };
  }

  /**
   * Create build status hook (legacy method for tests)
   * @returns {Object} - Build status hook
   */
  createBuildStatusHook() {
    return {
      name: 'BMad Build Status Integration',
      description: 'Integrate build results with story status',
      trigger: {
        type: 'build_complete',
        condition: 'build_status_changed'
      },
      action: {
        agent: 'bmad-dev',
        task: 'integrate-build-results',
        context: ['#Terminal', '#Problems']
      }
    };
  }

  /**
   * Validate hook configuration (legacy method for tests)
   * @param {Object} hook - Hook configuration to validate
   * @returns {boolean} - Validation result
   */
  validateHookConfiguration(hook) {
    if (!hook || typeof hook !== 'object') {
      return false;
    }

    // Check required fields
    if (!hook.name || !hook.description) {
      return false;
    }

    // Check trigger
    if (!hook.trigger || !hook.trigger.type) {
      return false;
    }

    // Validate trigger type
    const validTriggerTypes = [
      'file_change', 'file_save', 'git_commit', 'git_push', 
      'git_pull_request', 'git_merge', 'build_complete', 'manual'
    ];
    
    if (!validTriggerTypes.includes(hook.trigger.type)) {
      return false;
    }

    // Check action
    if (!hook.action || !hook.action.agent) {
      return false;
    }

    return true;
  }

  /**
   * Generate YAML for hook configuration (legacy method for tests)
   * @param {Object} hook - Hook configuration
   * @returns {string} - YAML string
   */
  generateHookYAML(hook) {
    try {
      return yaml.dump(hook, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });
    } catch (error) {
      this.log(`Error generating YAML: ${error.message}`, 'error');
      return '';
    }
  }
}

module.exports = HookGenerator;