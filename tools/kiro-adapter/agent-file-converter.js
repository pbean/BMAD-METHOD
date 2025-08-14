/**
 * Agent File Converter
 * Transforms BMad agent markdown files to Kiro-compatible format
 */

const fs = require('fs-extra');
const path = require('path');
const BaseTransformer = require('./base-transformer');
const ContextInjector = require('./context-injector');
const DependencyResolver = require('./dependency-resolver');

class AgentFileConverter extends BaseTransformer {
  constructor(options = {}) {
    super(options);
    this.contextInjector = new ContextInjector(options);
    this.dependencyResolver = new DependencyResolver(options);
    this.conversionStats = {
      total: 0,
      successful: 0,
      failed: 0,
      warnings: 0
    };
    this.conversionErrors = [];
  }

  /**
   * Transform BMad agent markdown files to Kiro-compatible format
   * @param {Object} agentMetadata - Agent metadata from discovery
   * @param {string} outputPath - Output path for converted agent
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} - Conversion result
   */
  async convertAgent(agentMetadata, outputPath, options = {}) {
    this.log(`Converting agent: ${agentMetadata.id} -> ${this.getRelativePath(outputPath)}`);
    this.conversionStats.total++;

    try {
      // Resolve dependencies first
      const dependencyResult = await this.dependencyResolver.scanAgentDependencies(agentMetadata);
      
      // Create conversion context
      const conversionContext = {
        agentMetadata,
        dependencyResult,
        options: {
          preservePersona: true,
          addKiroIntegration: true,
          generateSteeringRules: true,
          ...options
        }
      };

      // Perform the conversion
      const convertedContent = await this.performConversion(conversionContext);
      
      // Write the converted file
      const success = await this.writeFile(outputPath, convertedContent);
      
      if (success) {
        this.conversionStats.successful++;
        
        // Generate additional files if requested
        const additionalFiles = await this.generateAdditionalFiles(conversionContext, outputPath);
        
        return {
          success: true,
          agentId: agentMetadata.id,
          outputPath: outputPath,
          dependencyResult,
          additionalFiles,
          warnings: this.extractWarnings(dependencyResult)
        };
      } else {
        throw new Error('Failed to write converted file');
      }
      
    } catch (error) {
      this.conversionStats.failed++;
      this.conversionErrors.push({
        agentId: agentMetadata.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.log(`Conversion failed for ${agentMetadata.id}: ${error.message}`, 'error');
      
      return {
        success: false,
        agentId: agentMetadata.id,
        error: error.message,
        dependencyResult: null
      };
    }
  }

  /**
   * Perform batch conversion for all discovered agents
   * @param {Array} agentMetadataList - Array of agent metadata
   * @param {string} outputDirectory - Output directory for converted agents
   * @param {Object} options - Batch conversion options
   * @returns {Promise<Object>} - Batch conversion results
   */
  async batchConvertAgents(agentMetadataList, outputDirectory, options = {}) {
    this.log(`Starting batch conversion of ${agentMetadataList.length} agents`);
    
    // Reset stats
    this.conversionStats = { total: 0, successful: 0, failed: 0, warnings: 0 };
    this.conversionErrors = [];

    const results = {
      successful: [],
      failed: [],
      warnings: [],
      statistics: null
    };

    // Ensure output directory exists
    await fs.ensureDir(outputDirectory);

    // Convert each agent
    for (const agentMetadata of agentMetadataList) {
      const outputPath = path.join(outputDirectory, `${agentMetadata.id}.md`);
      const result = await this.convertAgent(agentMetadata, outputPath, options);
      
      if (result.success) {
        results.successful.push(result);
        if (result.warnings && result.warnings.length > 0) {
          results.warnings.push(...result.warnings);
          this.conversionStats.warnings += result.warnings.length;
        }
      } else {
        results.failed.push(result);
      }
    }

    results.statistics = { ...this.conversionStats };
    
    this.log(`Batch conversion completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    return results;
  }

  /**
   * Perform the actual conversion
   * @param {Object} conversionContext - Conversion context
   * @returns {Promise<string>} - Converted content
   */
  async performConversion(conversionContext) {
    const { agentMetadata, dependencyResult, options } = conversionContext;
    const { rawContent, parsedContent } = agentMetadata;

    // Parse the original content
    const { frontMatter, content: markdownContent } = parsedContent;

    // Create Kiro-compatible front matter
    const kiroFrontMatter = this.createKiroFrontMatter(agentMetadata, dependencyResult, options);

    // Transform the content
    let transformedContent = markdownContent;

    // Inject context awareness
    if (options.addKiroIntegration) {
      transformedContent = this.contextInjector.injectAutomaticContextReferences(
        transformedContent, 
        agentMetadata.id,
        {
          expansionPack: agentMetadata.expansionPack,
          dependencies: dependencyResult.resolvedDependencies
        }
      );
    }

    // Add dependency integration
    transformedContent = this.addDependencyIntegration(transformedContent, dependencyResult);

    // Preserve BMad persona while adding Kiro capabilities
    if (options.preservePersona) {
      transformedContent = this.preserveBMadPersona(transformedContent, agentMetadata);
    }

    // Add Kiro-specific enhancements
    transformedContent = this.addKiroEnhancements(transformedContent, agentMetadata, options);

    // Combine front matter and content
    return this.combineContent(kiroFrontMatter, transformedContent);
  }

  /**
   * Create Kiro-compatible front matter
   * @param {Object} agentMetadata - Agent metadata
   * @param {Object} dependencyResult - Dependency resolution result
   * @param {Object} options - Conversion options
   * @returns {Object} - Kiro front matter
   */
  createKiroFrontMatter(agentMetadata, dependencyResult, options) {
    const { id, name, title, persona, commands, source, expansionPack } = agentMetadata;

    const kiroFrontMatter = {
      // Basic agent information
      name: `BMad ${name}`,
      description: this.generateAgentDescription(agentMetadata),
      version: '1.0.0',
      
      // Agent configuration
      agent_type: 'bmad-converted',
      bmad_source: source,
      bmad_agent_id: id,
      
      // Context providers
      context_providers: this.getContextProviders(agentMetadata),
      
      // Steering rules
      steering_rules: this.getSteeringRules(agentMetadata, options),
      
      // Dependencies
      dependencies: this.formatDependenciesForKiro(dependencyResult),
      
      // Commands
      commands: this.formatCommandsForKiro(commands),
      
      // Persona preservation
      bmad_persona: {
        role: persona.role,
        style: persona.style,
        identity: persona.identity,
        focus: persona.focus,
        core_principles: persona.core_principles
      },
      
      // Kiro integration metadata
      kiro_integration: {
        converted_at: new Date().toISOString(),
        converter_version: '1.0.0',
        features: this.getEnabledFeatures(options),
        context_injection: true,
        dependency_resolution: dependencyResult.errors.length === 0
      }
    };

    // Add expansion pack information
    if (expansionPack) {
      kiroFrontMatter.expansion_pack = {
        id: expansionPack,
        enabled: true,
        domain_context: true
      };
    }

    return kiroFrontMatter;
  }

  /**
   * Generate agent description
   * @param {Object} agentMetadata - Agent metadata
   * @returns {string} - Agent description
   */
  generateAgentDescription(agentMetadata) {
    const { persona, expansionPack } = agentMetadata;
    
    let description = `BMad Method ${persona.role || 'Assistant'} with Kiro IDE integration. `;
    
    if (persona.focus) {
      description += `Specialized in ${persona.focus.toLowerCase()}. `;
    }
    
    if (expansionPack) {
      description += `Enhanced with ${expansionPack} domain expertise. `;
    }
    
    description += 'Provides structured workflows, context-aware guidance, and maintains BMad Method quality standards.';
    
    return description;
  }

  /**
   * Get context providers for the agent
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Array} - Context providers
   */
  getContextProviders(agentMetadata) {
    const { id } = agentMetadata;
    const requirements = this.contextInjector.agentContextRequirements[id];
    
    if (requirements) {
      return [...requirements.primary, ...requirements.secondary];
    }
    
    // Default context providers
    return ['#File', '#Folder', '#Codebase'];
  }

  /**
   * Get steering rules for the agent
   * @param {Object} agentMetadata - Agent metadata
   * @param {Object} options - Conversion options
   * @returns {Array} - Steering rules
   */
  getSteeringRules(agentMetadata, options) {
    const rules = ['product.md', 'tech.md', 'structure.md'];
    
    // Add agent-specific steering rule
    rules.push(`bmad-${agentMetadata.id}.md`);
    
    // Add expansion pack steering rules
    if (agentMetadata.expansionPack) {
      rules.push(`${agentMetadata.expansionPack}.md`);
    }
    
    return rules;
  }

  /**
   * Format dependencies for Kiro
   * @param {Object} dependencyResult - Dependency resolution result
   * @returns {Object} - Formatted dependencies
   */
  formatDependenciesForKiro(dependencyResult) {
    const formatted = {
      resolved: {},
      missing: {},
      auto_load: [],
      on_demand: []
    };

    // Format resolved dependencies
    for (const [type, deps] of Object.entries(dependencyResult.resolvedDependencies)) {
      formatted.resolved[type] = Object.keys(deps);
      
      // Auto-load critical dependencies
      if (type === 'tasks' && Object.keys(deps).length > 0) {
        formatted.auto_load.push(...Object.keys(deps).slice(0, 2));
      }
      
      // On-demand loading for templates and checklists
      if (['templates', 'checklists'].includes(type)) {
        formatted.on_demand.push(...Object.keys(deps));
      }
    }

    // Format missing dependencies
    for (const [type, deps] of Object.entries(dependencyResult.missingDependencies)) {
      if (deps.length > 0) {
        formatted.missing[type] = deps.map(dep => dep.name);
      }
    }

    return formatted;
  }

  /**
   * Format commands for Kiro
   * @param {Array} commands - BMad commands
   * @returns {Object} - Formatted commands
   */
  formatCommandsForKiro(commands) {
    const formatted = {
      bmad_commands: {},
      kiro_integration: {
        context_aware: true,
        steering_enabled: true,
        dependency_validation: true
      }
    };

    for (const command of commands) {
      formatted.bmad_commands[command.name] = {
        description: command.description,
        requires_context: this.commandRequiresContext(command.name),
        validates_dependencies: true
      };
    }

    return formatted;
  }

  /**
   * Check if command requires context
   * @param {string} commandName - Command name
   * @returns {boolean} - Whether command requires context
   */
  commandRequiresContext(commandName) {
    const contextRequiredCommands = [
      'analyze', 'review', 'refactor', 'optimize', 'debug', 'test'
    ];
    
    return contextRequiredCommands.some(cmd => 
      commandName.toLowerCase().includes(cmd)
    );
  }

  /**
   * Get enabled features
   * @param {Object} options - Conversion options
   * @returns {Array} - Enabled features
   */
  getEnabledFeatures(options) {
    const features = [];
    
    if (options.addKiroIntegration) features.push('context_injection');
    if (options.generateSteeringRules) features.push('steering_rules');
    if (options.preservePersona) features.push('persona_preservation');
    
    return features;
  }

  /**
   * Add dependency integration to content
   * @param {string} content - Content to enhance
   * @param {Object} dependencyResult - Dependency resolution result
   * @returns {string} - Content with dependency integration
   */
  addDependencyIntegration(content, dependencyResult) {
    const { resolvedDependencies, missingDependencies } = dependencyResult;
    
    let dependencySection = '\n## Dependency Integration\n\n';
    
    // Add resolved dependencies information
    const totalResolved = Object.values(resolvedDependencies)
      .reduce((sum, deps) => sum + Object.keys(deps).length, 0);
    
    if (totalResolved > 0) {
      dependencySection += `I have access to ${totalResolved} BMad Method resources:\n`;
      
      for (const [type, deps] of Object.entries(resolvedDependencies)) {
        if (Object.keys(deps).length > 0) {
          dependencySection += `- **${type}**: ${Object.keys(deps).join(', ')}\n`;
        }
      }
      dependencySection += '\n';
    }

    // Add missing dependencies warning
    const totalMissing = Object.values(missingDependencies)
      .reduce((sum, deps) => sum + deps.length, 0);
    
    if (totalMissing > 0) {
      dependencySection += `⚠️ **Missing Dependencies** (${totalMissing} items):\n`;
      
      for (const [type, deps] of Object.entries(missingDependencies)) {
        if (deps.length > 0) {
          dependencySection += `- **${type}**: ${deps.map(d => d.name).join(', ')}\n`;
        }
      }
      dependencySection += '\nSome functionality may be limited until these dependencies are resolved.\n\n';
    }

    // Add dependency usage guidance
    dependencySection += `### Using Dependencies
- Dependencies are automatically loaded when needed
- Use \`*help\` to see available BMad commands
- Missing dependencies will be reported with suggestions for resolution
- All dependencies maintain their original BMad Method functionality\n`;

    return content + dependencySection;
  }

  /**
   * Preserve BMad persona while adding Kiro capabilities
   * @param {string} content - Content to enhance
   * @param {Object} agentMetadata - Agent metadata
   * @returns {string} - Content with preserved persona
   */
  preserveBMadPersona(content, agentMetadata) {
    const { name, persona, commands } = agentMetadata;
    
    // Create persona introduction
    const personaIntro = `# ${name}

I am your **${name}**, bringing BMad Method expertise directly into your Kiro IDE environment.

## My Identity
- **Role**: ${persona.role || 'Development Assistant'}
- **Focus**: ${persona.focus || 'Structured development workflows'}
- **Style**: ${persona.style || 'Professional and systematic'}

${persona.identity ? `**About me**: ${persona.identity}` : ''}

## My Approach
${persona.core_principles && persona.core_principles.length > 0 
  ? persona.core_principles.map(principle => `- ${principle}`).join('\n')
  : '- Follow BMad Method structured workflows\n- Maintain quality and consistency\n- Provide actionable guidance'
}

## Enhanced with Kiro
I maintain all my BMad Method capabilities while leveraging Kiro's advanced features:
- **Context Awareness**: I understand your current project state
- **Steering Rules**: I follow your project-specific conventions
- **Real-time Integration**: I work with your actual codebase and files

`;

    // Insert persona introduction at the beginning
    return personaIntro + '\n' + content;
  }

  /**
   * Add Kiro-specific enhancements
   * @param {string} content - Content to enhance
   * @param {Object} agentMetadata - Agent metadata
   * @param {Object} options - Conversion options
   * @returns {string} - Enhanced content
   */
  addKiroEnhancements(content, agentMetadata, options) {
    let enhanced = content;

    // Add Kiro integration section
    const kiroSection = `
## Kiro IDE Integration

### Automatic Features
- **File Context**: I automatically understand the files you're working with
- **Project Awareness**: I know your project structure and patterns
- **Problem Detection**: I can see current issues and build problems
- **Change Tracking**: I'm aware of recent modifications and git changes

### Steering Rules
I automatically apply your project's conventions and preferences:
- Technical stack preferences
- Code style and formatting rules
- Project structure conventions
- Domain-specific best practices

### Getting Started
1. Open any file to give me context about your current work
2. Use my BMad commands (start with \`*help\`)
3. Ask questions about your code, architecture, or project direction
4. I'll provide structured, context-aware guidance following BMad Method principles

`;

    enhanced += kiroSection;

    // Add expansion pack enhancements
    if (agentMetadata.expansionPack) {
      const expansionSection = this.generateExpansionPackSection(agentMetadata.expansionPack);
      enhanced += expansionSection;
    }

    return enhanced;
  }

  /**
   * Generate expansion pack specific section
   * @param {string} expansionPack - Expansion pack name
   * @returns {string} - Expansion pack section
   */
  generateExpansionPackSection(expansionPack) {
    const expansionSectionMap = {
      'bmad-2d-phaser-game-dev': `
## Phaser.js Game Development Expertise

### Specialized Knowledge
- **Phaser.js Framework**: Scene management, game loops, and state handling
- **2D Game Architecture**: Entity systems, collision detection, and physics
- **Asset Management**: Sprite loading, animation, and optimization
- **Game Design Patterns**: State machines, object pooling, and performance optimization

### Game Development Workflow
I follow game development best practices while maintaining BMad Method structure:
1. Game design document creation and validation
2. Technical architecture planning
3. Iterative development with playtesting
4. Performance optimization and deployment

`,
      'bmad-2d-unity-game-dev': `
## Unity 2D Game Development Expertise

### Specialized Knowledge
- **Unity Engine**: Scene management, prefab systems, and component architecture
- **2D Game Development**: Physics2D, animation controllers, and UI systems
- **Unity Workflows**: Asset pipeline, build settings, and platform deployment
- **C# Game Programming**: MonoBehaviour patterns, coroutines, and Unity APIs

### Unity Development Workflow
I combine Unity best practices with BMad Method structure:
1. Game concept and technical design
2. Unity project setup and architecture
3. Component-based development approach
4. Testing, optimization, and build management

`,
      'bmad-infrastructure-devops': `
## Infrastructure & DevOps Expertise

### Specialized Knowledge
- **Infrastructure as Code**: Terraform, CloudFormation, and Kubernetes manifests
- **CI/CD Pipelines**: GitHub Actions, Jenkins, and deployment automation
- **Container Orchestration**: Docker, Kubernetes, and service mesh
- **Cloud Platforms**: AWS, GCP, Azure services and best practices

### DevOps Workflow
I apply DevOps principles within BMad Method structure:
1. Infrastructure requirements and architecture design
2. Infrastructure as Code implementation
3. CI/CD pipeline setup and optimization
4. Monitoring, security, and maintenance planning

`
    };

    return expansionSectionMap[expansionPack] || '';
  }

  /**
   * Generate additional files (steering rules, etc.)
   * @param {Object} conversionContext - Conversion context
   * @param {string} outputPath - Main output path
   * @returns {Promise<Array>} - Array of additional files created
   */
  async generateAdditionalFiles(conversionContext, outputPath) {
    const { agentMetadata, options } = conversionContext;
    const additionalFiles = [];

    if (options.generateSteeringRules) {
      // Generate agent-specific steering rule
      const steeringRules = this.contextInjector.generateSteeringRules(agentMetadata, options);
      const steeringContent = steeringRules.contextIntegration;
      
      if (steeringContent) {
        const steeringPath = path.join(
          path.dirname(outputPath), 
          '..', 
          'steering', 
          `bmad-${agentMetadata.id}.md`
        );
        
        const steeringRule = this.contextInjector._generateAgentSpecificSteeringRule(agentMetadata);
        if (steeringRule) {
          await fs.ensureDir(path.dirname(steeringPath));
          await fs.writeFile(steeringPath, steeringRule.content, 'utf8');
          additionalFiles.push({
            type: 'steering-rule',
            path: steeringPath,
            description: `Agent-specific steering rules for ${agentMetadata.name}`
          });
        }
      }
    }

    return additionalFiles;
  }

  /**
   * Extract warnings from dependency result
   * @param {Object} dependencyResult - Dependency resolution result
   * @returns {Array} - Array of warnings
   */
  extractWarnings(dependencyResult) {
    const warnings = [...dependencyResult.warnings];
    
    // Add warnings for missing dependencies
    const totalMissing = Object.values(dependencyResult.missingDependencies)
      .reduce((sum, deps) => sum + deps.length, 0);
    
    if (totalMissing > 0) {
      warnings.push(`${totalMissing} dependencies could not be resolved`);
    }

    return warnings;
  }

  /**
   * Get conversion statistics
   * @returns {Object} - Conversion statistics
   */
  getConversionStatistics() {
    return {
      ...this.conversionStats,
      errors: this.conversionErrors,
      successRate: this.conversionStats.total > 0 
        ? (this.conversionStats.successful / this.conversionStats.total * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Clear conversion statistics
   */
  clearStatistics() {
    this.conversionStats = { total: 0, successful: 0, failed: 0, warnings: 0 };
    this.conversionErrors = [];
  }
}

module.exports = AgentFileConverter;