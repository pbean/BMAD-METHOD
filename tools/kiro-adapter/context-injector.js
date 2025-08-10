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
   * @returns {string} - Content with context injection
   */
  injectAutomaticContextReferences(content, agentId) {
    const requirements = this.agentContextRequirements[agentId];
    if (!requirements) {
      return content;
    }

    // Create context awareness section
    const contextSection = this._generateContextAwarenessSection(requirements);
    
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
  _generateContextAwarenessSection(requirements) {
    const { primary, secondary, description } = requirements;
    
    return `## Context Awareness

${description}

### Automatic Context Access
I automatically access your current project context through:
${primary.map(ctx => `- ${ctx} (primary context)`).join('\n')}
${secondary.map(ctx => `- ${ctx} (secondary context)`).join('\n')}

### Context Integration
When working on tasks, I will:
1. Automatically reference relevant context from the above sources
2. Provide context-aware guidance based on your current project state
3. Request additional context if needed for specific tasks
4. Fall back to manual context gathering when automatic context is unavailable`;
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
}

module.exports = ContextInjector;