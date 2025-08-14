/**
 * Context Injector
 * Enhances BMad agents with Kiro's advanced context system integration
 */

const BaseTransformer = require('./base-transformer');

class ContextInjector extends BaseTransformer {
  constructor(options = {}) {
    super(options);
    
    // Core context mappings from BMad needs to Kiro providers
    this.contextMappings = {
      'current file': '#File',
      'project structure': '#Folder',
      'full codebase': '#Codebase', 
      'build issues': '#Problems',
      'terminal output': '#Terminal',
      'recent changes': '#Git Diff'
    };

    // Agent-specific context requirements based on BMad agent roles
    this.agentContextRequirements = {
      'dev': {
        primary: ['#File', '#Problems', '#Terminal', '#Git Diff'],
        secondary: ['#Folder', '#Codebase'],
        description: 'Development agent needs current file context, build issues, and recent changes'
      },
      'qa': {
        primary: ['#Problems', '#Git Diff', '#File'],
        secondary: ['#Terminal', '#Codebase'],
        description: 'QA agent needs to review code issues, changes, and current files'
      },
      'architect': {
        primary: ['#Codebase', '#Folder'],
        secondary: ['#File', '#Problems', '#Terminal'],
        description: 'Architect needs full codebase understanding and project structure'
      },
      'pm': {
        primary: ['#Folder', '#Codebase'],
        secondary: ['#Problems', '#Terminal'],
        description: 'PM needs project overview and structure understanding'
      },
      'analyst': {
        primary: ['#Codebase', '#Folder'],
        secondary: ['#File', '#Problems'],
        description: 'Analyst needs comprehensive project understanding'
      },
      'sm': {
        primary: ['#Folder', '#File'],
        secondary: ['#Problems', '#Terminal', '#Git Diff'],
        description: 'Scrum Master needs project structure and current work context'
      }
    };

    // Context availability fallbacks
    this.fallbackStrategies = {
      '#File': 'Ask user to open relevant file or provide file path',
      '#Folder': 'Request project structure overview or specific directory listing',
      '#Codebase': 'Ask for relevant code snippets or architectural overview',
      '#Problems': 'Request current error messages or build output',
      '#Terminal': 'Ask for recent command output or build logs',
      '#Git Diff': 'Request recent changes summary or specific diff output'
    };
  }

  /**
   * Inject automatic context references into agent prompts
   * @param {string} content - Agent content
   * @param {string} agentId - BMad agent identifier
   * @param {Object} options - Injection options including expansion pack info
   * @returns {string} - Content with context injection
   */
  injectAutomaticContextReferences(content, agentId, options = {}) {
    const requirements = this.agentContextRequirements[agentId];
    if (!requirements) {
      return content;
    }

    // Create context awareness section with expansion pack support
    const contextSection = this._generateContextAwarenessSection(requirements, options);
    
    // Find insertion point after agent definition but before main content
    const yamlEndMatch = content.match(/```\s*$/m);
    if (yamlEndMatch) {
      const insertionPoint = yamlEndMatch.index + yamlEndMatch[0].length;
      const beforeContent = content.substring(0, insertionPoint);
      const afterContent = content.substring(insertionPoint);
      
      return beforeContent + '\n\n' + contextSection + '\n' + afterContent;
    }
    
    // Fallback: append to end
    return content + '\n\n' + contextSection;
  }

  /**
   * Map BMad context needs to Kiro context providers
   * @param {Array} bmadContextNeeds - BMad context requirements
   * @returns {Array} - Mapped Kiro context providers
   */
  mapBMadContextToKiro(bmadContextNeeds) {
    const mappedProviders = [];
    const unmappedNeeds = [];

    for (const need of bmadContextNeeds) {
      const normalizedNeed = need.toLowerCase().trim();
      let mapped = false;

      // Direct mapping check
      for (const [bmadNeed, kiroProvider] of Object.entries(this.contextMappings)) {
        if (normalizedNeed.includes(bmadNeed.toLowerCase())) {
          if (!mappedProviders.includes(kiroProvider)) {
            mappedProviders.push(kiroProvider);
          }
          mapped = true;
          break;
        }
      }

      // Fuzzy matching for common variations
      if (!mapped) {
        if (normalizedNeed.includes('file') || normalizedNeed.includes('code')) {
          if (!mappedProviders.includes('#File')) mappedProviders.push('#File');
          mapped = true;
        } else if (normalizedNeed.includes('structure') || normalizedNeed.includes('directory')) {
          if (!mappedProviders.includes('#Folder')) mappedProviders.push('#Folder');
          mapped = true;
        } else if (normalizedNeed.includes('error') || normalizedNeed.includes('issue')) {
          if (!mappedProviders.includes('#Problems')) mappedProviders.push('#Problems');
          mapped = true;
        } else if (normalizedNeed.includes('command') || normalizedNeed.includes('output')) {
          if (!mappedProviders.includes('#Terminal')) mappedProviders.push('#Terminal');
          mapped = true;
        } else if (normalizedNeed.includes('change') || normalizedNeed.includes('diff')) {
          if (!mappedProviders.includes('#Git Diff')) mappedProviders.push('#Git Diff');
          mapped = true;
        } else if (normalizedNeed.includes('codebase') || normalizedNeed.includes('repository')) {
          if (!mappedProviders.includes('#Codebase')) mappedProviders.push('#Codebase');
          mapped = true;
        }
      }

      if (!mapped) {
        unmappedNeeds.push(need);
      }
    }

    return {
      mapped: mappedProviders,
      unmapped: unmappedNeeds
    };
  }

  /**
   * Handle dynamic context loading based on agent requirements
   * @param {Object} agentRequirements - Agent context requirements
   * @returns {Promise<Object>} - Loaded context data
   */
  async handleDynamicContextLoading(agentRequirements) {
    const { agentId, taskType, contextNeeds = [] } = agentRequirements;
    
    // Get agent-specific requirements
    const agentContext = this.agentContextRequirements[agentId];
    if (!agentContext) {
      return { error: `Unknown agent: ${agentId}` };
    }

    // Determine required context based on agent and task
    const requiredContext = this._determineRequiredContext(agentContext, taskType, contextNeeds);
    
    // Check context availability (simulated - in real implementation would check Kiro)
    const availableContext = await this._checkContextAvailability(requiredContext);
    
    // Generate context instructions
    const contextInstructions = this._generateContextInstructions(
      requiredContext, 
      availableContext
    );

    return {
      agentId,
      taskType,
      requiredContext,
      availableContext,
      contextInstructions,
      fallbackNeeded: requiredContext.filter(ctx => !availableContext.includes(ctx))
    };
  }

  /**
   * Provide fallback context gathering for missing information
   * @param {Array} missingContext - List of missing context items
   * @returns {Promise<Object>} - Fallback context data
   */
  async provideFallbackContext(missingContext) {
    const fallbackInstructions = [];
    const alternativeApproaches = [];

    for (const contextItem of missingContext) {
      const fallback = this.fallbackStrategies[contextItem];
      if (fallback) {
        fallbackInstructions.push({
          missing: contextItem,
          instruction: fallback,
          priority: this._getContextPriority(contextItem)
        });

        // Suggest alternative approaches
        const alternatives = this._getAlternativeContextSources(contextItem);
        if (alternatives.length > 0) {
          alternativeApproaches.push({
            missing: contextItem,
            alternatives
          });
        }
      }
    }

    // Sort by priority (high priority context first)
    fallbackInstructions.sort((a, b) => b.priority - a.priority);

    return {
      missingContext,
      fallbackInstructions,
      alternativeApproaches,
      userGuidance: this._generateUserGuidance(fallbackInstructions),
      canProceedWithoutContext: this._assessProceedability(missingContext)
    };
  }
  /**
   * Generate context awareness section for agent content
   * @private
   */
  _generateContextAwarenessSection(requirements, options = {}) {
    const { primary, secondary, description } = requirements;
    
    let contextSection = `## Context Awareness

${description}

### Automatic Context Access
I automatically access your current project context through:
${primary.map(ctx => `- ${ctx} (primary context)`).join('\n')}
${secondary.map(ctx => `- ${ctx} (secondary context)`).join('\n')}`;

    // Add expansion pack specific context if applicable
    if (options.expansionPack) {
      const expansionContext = this._getExpansionPackContext(options.expansionPack);
      if (expansionContext.length > 0) {
        contextSection += `\n\n### Domain-Specific Context (${options.expansionPack})
${expansionContext.map(ctx => `- ${ctx}`).join('\n')}`;
      }
    }

    contextSection += `

### Context Integration
When working on tasks, I will:
1. Automatically reference relevant context from the above sources
2. Provide context-aware guidance based on your current project state
3. Request additional context if needed for specific tasks
4. Fall back to manual context gathering when automatic context is unavailable`;

    // Add expansion pack specific integration notes
    if (options.expansionPack) {
      contextSection += `
5. Apply ${options.expansionPack} domain-specific patterns and best practices
6. Integrate with ${options.expansionPack} tooling and workflows when available`;
    }

    return contextSection;
  }

  /**
   * Determine required context based on agent, task type, and specific needs
   * @private
   */
  _determineRequiredContext(agentContext, taskType, contextNeeds) {
    let required = [...agentContext.primary];

    // Add task-specific context requirements
    if (taskType === 'code-review') {
      required.push('#Problems', '#Git Diff');
    } else if (taskType === 'debugging') {
      required.push('#Terminal', '#Problems');
    } else if (taskType === 'architecture') {
      required.push('#Codebase', '#Folder');
    } else if (taskType === 'planning') {
      required.push('#Folder', '#Codebase');
    }

    // Add explicitly requested context
    const mappingResult = this.mapBMadContextToKiro(contextNeeds);
    required.push(...mappingResult.mapped);

    // Remove duplicates and return
    return [...new Set(required)];
  }

  /**
   * Check context availability (simulated - would integrate with Kiro in real implementation)
   * @private
   */
  async _checkContextAvailability(requiredContext) {
    // In real implementation, this would check Kiro's context system
    // For now, simulate availability based on common scenarios
    const commonlyAvailable = ['#File', '#Folder', '#Problems'];
    const sometimesAvailable = ['#Terminal', '#Git Diff'];
    const lessAvailable = ['#Codebase'];

    return requiredContext.filter(ctx => {
      if (commonlyAvailable.includes(ctx)) return Math.random() > 0.1; // 90% available
      if (sometimesAvailable.includes(ctx)) return Math.random() > 0.3; // 70% available
      if (lessAvailable.includes(ctx)) return Math.random() > 0.5; // 50% available
      return false;
    });
  }

  /**
   * Generate context instructions for agents
   * @private
   */
  _generateContextInstructions(required, available) {
    const instructions = [];

    for (const context of required) {
      if (available.includes(context)) {
        instructions.push(`✓ ${context} - Available for automatic access`);
      } else {
        const fallback = this.fallbackStrategies[context];
        instructions.push(`⚠ ${context} - Not available. ${fallback}`);
      }
    }

    return instructions;
  }

  /**
   * Get context priority for fallback ordering
   * @private
   */
  _getContextPriority(contextItem) {
    const priorities = {
      '#File': 10,
      '#Problems': 9,
      '#Terminal': 8,
      '#Git Diff': 7,
      '#Folder': 6,
      '#Codebase': 5
    };
    return priorities[contextItem] || 1;
  }

  /**
   * Get alternative context sources when primary is unavailable
   * @private
   */
  _getAlternativeContextSources(contextItem) {
    const alternatives = {
      '#File': ['Ask user to share relevant code snippets', 'Request specific file contents'],
      '#Codebase': ['Ask for architectural overview', 'Request key component descriptions'],
      '#Problems': ['Ask for error messages', 'Request build output or logs'],
      '#Terminal': ['Ask for command output', 'Request recent build/test results'],
      '#Git Diff': ['Ask for recent changes summary', 'Request specific change descriptions'],
      '#Folder': ['Ask for project structure', 'Request directory listing']
    };
    return alternatives[contextItem] || [];
  }

  /**
   * Generate user guidance for missing context
   * @private
   */
  _generateUserGuidance(fallbackInstructions) {
    if (fallbackInstructions.length === 0) {
      return 'All required context is available automatically.';
    }

    const highPriority = fallbackInstructions.filter(f => f.priority >= 8);
    const lowPriority = fallbackInstructions.filter(f => f.priority < 8);

    let guidance = 'To provide the best assistance, I need additional context:\n\n';
    
    if (highPriority.length > 0) {
      guidance += '**Critical Context (please provide):**\n';
      guidance += highPriority.map(f => `- ${f.missing}: ${f.instruction}`).join('\n');
      guidance += '\n\n';
    }

    if (lowPriority.length > 0) {
      guidance += '**Optional Context (helpful but not required):**\n';
      guidance += lowPriority.map(f => `- ${f.missing}: ${f.instruction}`).join('\n');
    }

    return guidance;
  }

  /**
   * Assess whether agent can proceed without missing context
   * @private
   */
  _assessProceedability(missingContext) {
    const critical = ['#File', '#Problems'];
    const hasCriticalMissing = missingContext.some(ctx => critical.includes(ctx));
    
    return {
      canProceed: !hasCriticalMissing,
      reason: hasCriticalMissing 
        ? 'Critical context missing - agent effectiveness will be limited'
        : 'Can proceed with available context, though additional context would be helpful'
    };
  }

  /**
   * Get expansion pack specific context providers
   * @private
   */
  _getExpansionPackContext(expansionPack) {
    const expansionContextMap = {
      'bmad-2d-phaser-game-dev': [
        'Game assets and sprite configurations',
        'Phaser.js scene and state management',
        'Game physics and collision detection setup',
        'Audio and animation asset references'
      ],
      'bmad-2d-unity-game-dev': [
        'Unity project structure and prefabs',
        'Scene hierarchy and component relationships',
        'Unity asset pipeline and import settings',
        'Animation controllers and state machines'
      ],
      'bmad-infrastructure-devops': [
        'Infrastructure as Code templates',
        'CI/CD pipeline configurations',
        'Container and orchestration manifests',
        'Monitoring and alerting configurations'
      ]
    };

    return expansionContextMap[expansionPack] || [];
  }

  /**
   * Generate steering rules for converted agents
   * @param {Object} agentMetadata - Agent metadata from discovery
   * @param {Object} options - Generation options
   * @returns {Object} - Steering rule configuration
   */
  generateSteeringRules(agentMetadata, options = {}) {
    const { id, source, expansionPack, persona, dependencies } = agentMetadata;
    
    const steeringRules = {
      agentId: id,
      rules: [],
      expansionPackRules: [],
      contextIntegration: this._generateContextIntegrationRules(agentMetadata),
      dependencyRules: this._generateDependencyRules(dependencies)
    };

    // Add core steering rules
    steeringRules.rules.push(
      'product.md',
      'tech.md', 
      'structure.md'
    );

    // Add agent-specific steering rules
    const agentSpecificRule = this._generateAgentSpecificSteeringRule(agentMetadata);
    if (agentSpecificRule) {
      steeringRules.rules.push(`bmad-${id}.md`);
    }

    // Add expansion pack steering rules
    if (expansionPack) {
      steeringRules.expansionPackRules.push(`${expansionPack}.md`);
      steeringRules.expansionPackRules.push(`${expansionPack}-${id}.md`);
    }

    return steeringRules;
  }

  /**
   * Generate context integration rules for steering
   * @private
   */
  _generateContextIntegrationRules(agentMetadata) {
    const { id, persona } = agentMetadata;
    const requirements = this.agentContextRequirements[id];
    
    if (!requirements) {
      return {
        primary: ['#File', '#Folder'],
        secondary: ['#Codebase'],
        fallbackStrategy: 'request-manual-context'
      };
    }

    return {
      primary: requirements.primary,
      secondary: requirements.secondary,
      description: requirements.description,
      fallbackStrategy: 'request-manual-context',
      personaAlignment: persona.focus || 'general development support'
    };
  }

  /**
   * Generate dependency rules for steering
   * @private
   */
  _generateDependencyRules(dependencies) {
    const rules = {
      autoLoad: [],
      onDemand: [],
      validation: []
    };

    // Auto-load critical dependencies
    if (dependencies.tasks && dependencies.tasks.length > 0) {
      rules.autoLoad.push(...dependencies.tasks.slice(0, 3)); // Limit to first 3
    }

    // On-demand loading for templates and checklists
    if (dependencies.templates) {
      rules.onDemand.push(...dependencies.templates);
    }
    if (dependencies.checklists) {
      rules.onDemand.push(...dependencies.checklists);
    }

    // Validation rules
    rules.validation.push('validate-dependencies-before-activation');
    rules.validation.push('report-missing-dependencies');

    return rules;
  }

  /**
   * Generate agent-specific steering rule content
   * @private
   */
  _generateAgentSpecificSteeringRule(agentMetadata) {
    const { id, name, persona, commands, dependencies } = agentMetadata;
    
    return {
      filename: `bmad-${id}.md`,
      content: `# ${name} Agent Steering Rules

## Agent Identity
- **Role**: ${persona.role || 'Development Assistant'}
- **Focus**: ${persona.focus || 'General development support'}
- **Style**: ${persona.style || 'Professional and helpful'}

## Core Principles
${persona.core_principles ? persona.core_principles.map(p => `- ${p}`).join('\n') : '- Follow BMad Method structured approach\n- Maintain quality and consistency\n- Provide actionable guidance'}

## Available Commands
${commands.map(cmd => `- \`*${cmd.name}\`: ${cmd.description || 'No description available'}`).join('\n')}

## Context Requirements
- Always request relevant project context before providing guidance
- Validate understanding of current project state
- Adapt recommendations to project-specific constraints

## Dependency Management
- Ensure all required BMad dependencies are available
- Validate dependency versions and compatibility
- Report missing dependencies clearly to user

## Quality Standards
- Follow established coding standards and conventions
- Provide comprehensive documentation
- Include testing considerations in all recommendations
- Maintain consistency with existing project patterns
`
    };
  }

  /**
   * Create context prompts that integrate with Kiro's file understanding
   * @param {Object} agentMetadata - Agent metadata
   * @param {Object} options - Creation options
   * @returns {Array} - Array of context prompt configurations
   */
  createContextPrompts(agentMetadata, options = {}) {
    const { id, persona, expansionPack } = agentMetadata;
    const requirements = this.agentContextRequirements[id];
    
    const prompts = [];

    // File understanding prompts
    prompts.push({
      trigger: 'file-opened',
      prompt: `Analyze the current file in the context of ${persona.role || 'development work'}. Consider:
- File purpose and role in the project
- Code quality and adherence to standards
- Potential improvements or issues
- Relationship to other project components`,
      contextProviders: ['#File', '#Folder']
    });

    // Project structure prompts
    prompts.push({
      trigger: 'folder-selected',
      prompt: `Evaluate the project structure from a ${persona.role || 'development'} perspective:
- Architecture and organization patterns
- Compliance with best practices
- Potential structural improvements
- Missing components or documentation`,
      contextProviders: ['#Folder', '#Codebase']
    });

    // Problem analysis prompts
    if (requirements && requirements.primary.includes('#Problems')) {
      prompts.push({
        trigger: 'problems-detected',
        prompt: `Analyze current issues as a ${persona.role || 'development specialist'}:
- Root cause analysis
- Impact assessment
- Recommended solutions
- Prevention strategies`,
        contextProviders: ['#Problems', '#File', '#Terminal']
      });
    }

    // Expansion pack specific prompts
    if (expansionPack) {
      const expansionPrompts = this._generateExpansionPackPrompts(expansionPack, agentMetadata);
      prompts.push(...expansionPrompts);
    }

    return prompts;
  }

  /**
   * Generate expansion pack specific context prompts
   * @private
   */
  _generateExpansionPackPrompts(expansionPack, agentMetadata) {
    const { id, persona } = agentMetadata;
    
    const expansionPromptMap = {
      'bmad-2d-phaser-game-dev': [
        {
          trigger: 'game-file-opened',
          prompt: `Analyze this game development file for Phaser.js best practices:
- Scene management and lifecycle
- Asset loading and optimization
- Game state and data flow
- Performance considerations`,
          contextProviders: ['#File', '#Folder'],
          filePatterns: ['*.js', '*.ts', '*.json']
        }
      ],
      'bmad-2d-unity-game-dev': [
        {
          trigger: 'unity-file-opened',
          prompt: `Review this Unity project file for 2D game development:
- Component architecture and relationships
- Unity-specific patterns and conventions
- Performance and optimization opportunities
- Asset pipeline considerations`,
          contextProviders: ['#File', '#Folder'],
          filePatterns: ['*.cs', '*.unity', '*.prefab', '*.asset']
        }
      ],
      'bmad-infrastructure-devops': [
        {
          trigger: 'infrastructure-file-opened',
          prompt: `Evaluate this infrastructure configuration:
- Infrastructure as Code best practices
- Security and compliance considerations
- Scalability and maintainability
- Cost optimization opportunities`,
          contextProviders: ['#File', '#Folder'],
          filePatterns: ['*.tf', '*.yaml', '*.yml', '*.json', 'Dockerfile', '*.sh']
        }
      ]
    };

    return expansionPromptMap[expansionPack] || [];
  }
}

module.exports = ContextInjector;