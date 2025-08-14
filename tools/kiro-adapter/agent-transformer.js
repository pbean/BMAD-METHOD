/**
 * Agent Transformer
 * Transforms BMad agents into Kiro-native agents with context awareness
 */

const BaseTransformer = require('./base-transformer');
const ContextInjector = require('./context-injector');
const MCPIntegrator = require('./mcp-integrator');
const path = require('path');

class AgentTransformer extends BaseTransformer {
  constructor(options = {}) {
    super(options);
    this.contextInjector = new ContextInjector(options);
    this.mcpIntegrator = new MCPIntegrator(options);
    this.kiroContextProviders = [
      '#File',
      '#Folder', 
      '#Problems',
      '#Terminal',
      '#Git Diff',
      '#Codebase'
    ];
  }

  /**
   * Transform BMad agent to Kiro-native agent
   * @param {string} bmadAgentPath - Path to BMad agent file
   * @param {string} kiroOutputPath - Output path for Kiro agent
   * @param {Object} options - Transformation options
   * @returns {Promise<boolean>} - Success status
   */
  async transformAgent(bmadAgentPath, kiroOutputPath, options = {}) {
    this.log(`Transforming agent: ${this.getRelativePath(bmadAgentPath)} -> ${this.getRelativePath(kiroOutputPath)}`);

    return await this.transformFile(
      bmadAgentPath,
      kiroOutputPath,
      (content, inputPath) => this.performAgentTransformation(content, inputPath, options)
    );
  }

  /**
   * Transform BMad agent specifically for Kiro with expansion pack support
   * @param {string} bmadAgentPath - Path to BMad agent file
   * @param {string} kiroOutputPath - Output path for Kiro agent
   * @param {Object} options - Transformation options
   * @returns {Promise<boolean>} - Success status
   */
  async transformAgentForKiro(bmadAgentPath, kiroOutputPath, options = {}) {
    this.log(`Transforming agent for Kiro: ${this.getRelativePath(bmadAgentPath)} -> ${this.getRelativePath(kiroOutputPath)}`);

    // Enhanced options for Kiro-specific transformation
    const kiroOptions = {
      ...options,
      enableKiroFeatures: true,
      addExpansionPackSupport: options.expansionPack ? true : false,
      expansionPackId: options.expansionPack,
      enableExpansionPackFeatures: options.enableExpansionPackFeatures || false
    };

    return await this.transformFile(
      bmadAgentPath,
      kiroOutputPath,
      (content, inputPath) => this.performKiroAgentTransformation(content, inputPath, kiroOptions)
    );
  }

  /**
   * Parse BMad agent content (handles embedded YAML blocks)
   * @param {string} content - BMad agent content
   * @returns {Object} - Parsed front matter and content
   */
  parseBMadAgent(content) {
    // First try standard front matter parsing
    const standardParsed = this.parseYAMLFrontMatter(content);
    if (Object.keys(standardParsed.frontMatter).length > 0) {
      return standardParsed;
    }

    // If no standard front matter, look for embedded YAML block
    const yamlBlockRegex = /```yaml\s*\n([\s\S]*?)\n```/;
    const match = content.match(yamlBlockRegex);

    if (!match) {
      return {
        frontMatter: {},
        content: content
      };
    }

    try {
      const yaml = require('js-yaml');
      const frontMatter = yaml.load(match[1]) || {};
      
      // Remove the YAML block from content
      const markdownContent = content.replace(yamlBlockRegex, '').trim();

      return {
        frontMatter,
        content: markdownContent
      };
    } catch (error) {
      console.error('Error parsing embedded YAML:', error.message);
      return {
        frontMatter: {},
        content: content
      };
    }
  }

  /**
   * Perform Kiro-specific agent transformation with expansion pack support
   * @param {string} content - Original agent content
   * @param {string} inputPath - Input file path
   * @param {Object} options - Transformation options
   * @returns {string} - Transformed content
   */
  async performKiroAgentTransformation(content, inputPath, options) {
    try {
      // Parse BMad agent content (handles both front matter and embedded YAML)
      const { frontMatter, content: markdownContent } = this.parseBMadAgent(content);

      // Create enhanced front matter for Kiro with expansion pack support
      const kiroFrontMatter = this.createKiroFrontMatterWithExpansionPack(frontMatter, inputPath, options);

      // Inject context awareness into content using the context injector
      const agentId = frontMatter.agent?.id || path.basename(inputPath, '.md');
      const contextAwareContent = this.contextInjector.injectAutomaticContextReferences(
        markdownContent, 
        agentId,
        {
          expansionPack: options.expansionPack,
          enableExpansionPackFeatures: options.enableExpansionPackFeatures
        }
      );

      // Add steering integration with expansion pack rules
      const steeringIntegratedContent = this.addSteeringIntegrationWithExpansionPack(contextAwareContent, options);

      // Add MCP tool integration
      const mcpIntegratedContent = await this.addMCPToolIntegration(steeringIntegratedContent, agentId, options);

      // Add expansion pack specific capabilities
      const expansionEnhancedContent = this.addExpansionPackCapabilities(mcpIntegratedContent, options);

      // Preserve BMad persona while adding Kiro and expansion pack capabilities
      const finalContent = this.preserveBMadPersonaWithKiroEnhancements(expansionEnhancedContent, frontMatter, options);

      // Combine and return
      return this.combineContent(kiroFrontMatter, finalContent);
    } catch (error) {
      console.error('Error in Kiro agent transformation:', error.message);
      throw error;
    }
  }

  /**
   * Perform the actual agent transformation
   * @param {string} content - Original agent content
   * @param {string} inputPath - Input file path
   * @param {Object} options - Transformation options
   * @returns {string} - Transformed content
   */
  async performAgentTransformation(content, inputPath, options) {
    try {
      // Parse BMad agent content (handles both front matter and embedded YAML)
      const { frontMatter, content: markdownContent } = this.parseBMadAgent(content);

      // Create enhanced front matter for Kiro
      const kiroFrontMatter = this.createKiroFrontMatter(frontMatter, inputPath, options);

      // Inject context awareness into content using the context injector
      const agentId = frontMatter.agent?.id || path.basename(inputPath, '.md');
      const contextAwareContent = this.contextInjector.injectAutomaticContextReferences(
        markdownContent, 
        agentId,
        {
          expansionPack: options.expansionPack || null,
          enableExpansionPackFeatures: options.enableExpansionPackFeatures || false
        }
      );

      // Add steering integration
      const steeringIntegratedContent = this.addSteeringIntegration(contextAwareContent);

      // Add MCP tool integration
      const mcpIntegratedContent = await this.addMCPToolIntegration(steeringIntegratedContent, agentId, options);

      // Preserve BMad persona while adding Kiro capabilities
      const finalContent = this.preserveBMadPersona(mcpIntegratedContent, frontMatter);

      // Combine and return
      return this.combineContent(kiroFrontMatter, finalContent);
    } catch (error) {
      console.error('Error in agent transformation:', error.message);
      throw error;
    }
  }

  /**
   * Create Kiro-specific front matter
   * @param {Object} originalFrontMatter - Original BMad front matter
   * @param {string} inputPath - Input file path
   * @param {Object} options - Transformation options
   * @returns {Object} - Enhanced front matter
   */
  createKiroFrontMatter(originalFrontMatter, inputPath, options) {
    const agentName = this.extractAgentName(originalFrontMatter, inputPath);
    const role = this.extractAgentRole(originalFrontMatter);

    const kiroFrontMatter = {
      name: agentName,
      role: role,
      context_providers: this.getRelevantContextProviders(originalFrontMatter),
      steering_rules: this.getSteeringRules(originalFrontMatter, options),
      mcp_tools: this.getMCPTools(originalFrontMatter, options),
      bmad_dependencies: this.getBMadDependencies(originalFrontMatter),
      bmad_original: {
        agent: originalFrontMatter.agent,
        persona: originalFrontMatter.persona,
        commands: originalFrontMatter.commands
      }
    };

    // Add Kiro integration metadata
    return this.addKiroMetadata(kiroFrontMatter, {
      bmadSource: path.basename(inputPath),
      agentType: 'bmad-native',
      transformedAt: new Date().toISOString()
    });
  }

  /**
   * Extract agent name from front matter or file path
   * @param {Object} frontMatter - Front matter object
   * @param {string} inputPath - Input file path
   * @returns {string} - Agent name
   */
  extractAgentName(frontMatter, inputPath) {
    // Check for agent.name or agent.title in the YAML structure
    if (frontMatter.agent && frontMatter.agent.name) {
      return `BMad ${frontMatter.agent.title || frontMatter.agent.name}`;
    }
    
    if (frontMatter.name) {
      return `BMad ${frontMatter.name}`;
    }

    const fileName = path.basename(inputPath, '.md');
    
    // Handle specific BMad agent file names
    const agentNameMap = {
      'pm': 'Product Manager',
      'architect': 'Architect', 
      'dev': 'Developer',
      'qa': 'QA Engineer',
      'sm': 'Scrum Master',
      'po': 'Product Owner',
      'analyst': 'Business Analyst',
      'ux-expert': 'UX Expert'
    };
    
    const agentName = agentNameMap[fileName] || fileName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return `BMad ${agentName}`;
  }

  /**
   * Extract agent role from front matter
   * @param {Object} frontMatter - Front matter object
   * @returns {string} - Agent role
   */
  extractAgentRole(frontMatter) {
    // Check for agent.title first
    if (frontMatter.agent && frontMatter.agent.title) {
      return frontMatter.agent.title;
    }
    
    if (frontMatter.role) {
      return frontMatter.role;
    }

    // Infer role from agent.id or common BMad agent patterns
    const agentId = frontMatter.agent && frontMatter.agent.id;
    const roleMap = {
      'pm': 'Product Management',
      'architect': 'Software Architecture', 
      'dev': 'Software Development',
      'qa': 'Quality Assurance',
      'sm': 'Scrum Management',
      'po': 'Product Ownership',
      'analyst': 'Business Analysis',
      'ux-expert': 'User Experience Design'
    };

    if (agentId && roleMap[agentId]) {
      return roleMap[agentId];
    }

    // Fallback to checking name
    for (const [key, value] of Object.entries(roleMap)) {
      if (frontMatter.name && frontMatter.name.toLowerCase().includes(key)) {
        return value;
      }
    }

    return 'Development Support';
  }

  /**
   * Get relevant context providers for the agent
   * @param {Object} frontMatter - Front matter object
   * @returns {Array} - List of context providers
   */
  getRelevantContextProviders(frontMatter) {
    // Default context providers for all agents
    const defaultProviders = ['#File', '#Folder', '#Codebase'];

    // Role-specific context providers
    const roleSpecificProviders = {
      'qa': ['#Problems', '#Terminal', '#Git Diff'],
      'dev': ['#Problems', '#Terminal', '#Git Diff'],
      'architect': ['#Codebase'],
      'pm': ['#Folder'],
      'analyst': ['#Codebase', '#Folder']
    };

    const agentType = this.getAgentType(frontMatter);
    const specificProviders = roleSpecificProviders[agentType] || [];

    return [...new Set([...defaultProviders, ...specificProviders])];
  }

  /**
   * Get agent type from front matter
   * @param {Object} frontMatter - Front matter object
   * @returns {string} - Agent type
   */
  getAgentType(frontMatter) {
    // Check agent.id first (most reliable)
    if (frontMatter.agent && frontMatter.agent.id) {
      return frontMatter.agent.id;
    }
    
    if (!frontMatter.name) return 'generic';

    const name = frontMatter.name.toLowerCase();
    if (name.includes('qa')) return 'qa';
    if (name.includes('dev')) return 'dev';
    if (name.includes('architect')) return 'architect';
    if (name.includes('pm')) return 'pm';
    if (name.includes('analyst')) return 'analyst';
    
    return 'generic';
  }

  /**
   * Get steering rules for the agent
   * @param {Object} frontMatter - Front matter object
   * @param {Object} options - Transformation options
   * @returns {Array} - List of steering rule files
   */
  getSteeringRules(frontMatter, options) {
    const defaultRules = ['product.md', 'tech.md', 'structure.md'];
    const customRules = options.steeringRules || [];
    
    return [...new Set([...defaultRules, ...customRules])];
  }

  /**
   * Get MCP tools for the agent
   * @param {Object} frontMatter - Front matter object
   * @param {Object} options - Transformation options
   * @returns {Array} - List of MCP tools
   */
  getMCPTools(frontMatter, options) {
    const agentType = this.getAgentType(frontMatter);
    
    // Use MCP integrator's tool mappings for more sophisticated mapping
    const toolMap = this.mcpIntegrator.mcpToolMappings;
    const relevantTools = [];
    
    // Find tools that are mapped to this agent type
    for (const [toolName, agentTypes] of Object.entries(toolMap)) {
      if (agentTypes.includes(agentType)) {
        relevantTools.push(toolName);
      }
    }
    
    // Fallback to default tools if no specific mapping found
    const defaultTools = relevantTools.length > 0 ? relevantTools : ['web-search'];
    const customTools = options.mcpTools || [];

    return [...new Set([...defaultTools, ...customTools])];
  }

  /**
   * Get BMad dependencies from front matter
   * @param {Object} frontMatter - Front matter object
   * @returns {Array} - List of BMad dependencies
   */
  getBMadDependencies(frontMatter) {
    const dependencies = [];

    if (frontMatter.dependencies) {
      // Handle BMad dependencies structure (object with tasks, templates, etc.)
      if (typeof frontMatter.dependencies === 'object') {
        Object.values(frontMatter.dependencies).forEach(depArray => {
          if (Array.isArray(depArray)) {
            dependencies.push(...depArray);
          }
        });
      } else if (Array.isArray(frontMatter.dependencies)) {
        dependencies.push(...frontMatter.dependencies);
      }
    }

    // Add common BMad dependencies based on agent type
    const commonDeps = [
      'common/tasks/create-doc.md',
      'common/utils/workflow-management.md'
    ];

    return [...new Set([...dependencies, ...commonDeps])];
  }



  /**
   * Add steering integration to agent content
   * @param {string} content - Content with context awareness
   * @returns {string} - Content with steering integration
   */
  addSteeringIntegration(content) {
    const steeringNote = `
## Steering Rules Integration

I automatically apply project-specific conventions and technical preferences from your Kiro steering rules:
- **product.md**: Product and business context
- **tech.md**: Technical stack and preferences  
- **structure.md**: Project structure and conventions

These rules ensure consistency across all my recommendations and align with your project's established patterns.

`;

    // Add steering section before any existing "Capabilities" or similar section
    const capabilitiesIndex = content.toLowerCase().indexOf('## capabilities');
    if (capabilitiesIndex !== -1) {
      return content.slice(0, capabilitiesIndex) + steeringNote + content.slice(capabilitiesIndex);
    }

    // Otherwise append to the end
    return content + steeringNote;
  }

  /**
   * Add MCP tool integration to agent content
   * @param {string} content - Content to enhance
   * @param {string} agentId - Agent identifier
   * @param {Object} options - Transformation options
   * @returns {Promise<string>} - Content with MCP integration
   */
  async addMCPToolIntegration(content, agentId, options) {
    try {
      // Skip MCP integration if disabled
      if (options.disableMCP) {
        return content;
      }

      // Discover available MCP tools from Kiro workspace
      const kiroPath = options.kiroPath || process.cwd();
      const availableTools = await this.mcpIntegrator.discoverAvailableMCPTools(kiroPath);
      
      // Get configuration recommendations regardless of available tools
      const recommendations = this.mcpIntegrator.addMCPConfigurationRecommendations(agentId, availableTools);
      
      if (availableTools.length === 0) {
        this.log('No MCP tools discovered, adding setup guidance');
        return this.addMCPSetupGuidance(content, agentId, recommendations);
      }

      // Map tools to agent
      const mappedTools = this.mcpIntegrator.mapAgentToMCPTools(agentId, availableTools);
      
      if (mappedTools.length === 0) {
        this.log(`No relevant MCP tools found for ${agentId} agent, adding recommendations`);
        return this.addMCPSetupGuidance(content, agentId, recommendations);
      }

      // Add MCP tools section to content
      let mcpEnhancedContent = this.mcpIntegrator.addAutomaticMCPUsage(content, mappedTools);
      
      // Add recommendations for missing tools if any
      if (recommendations.missingTools.length > 0) {
        mcpEnhancedContent = this.addMCPRecommendations(mcpEnhancedContent, recommendations);
      }
      
      this.log(`Added ${mappedTools.length} MCP tools to ${agentId} agent`);
      return mcpEnhancedContent;
      
    } catch (error) {
      this.log(`Error adding MCP integration: ${error.message}`, 'error');
      return content; // Return original content on error
    }
  }

  /**
   * Preserve BMad persona while adding Kiro capabilities
   * @param {string} content - Content with Kiro enhancements
   * @param {Object} originalFrontMatter - Original front matter
   * @returns {string} - Final content preserving BMad identity
   */
  preserveBMadPersona(content, originalFrontMatter) {
    // Get agent details from original BMad structure
    const agent = originalFrontMatter.agent || {};
    const persona = originalFrontMatter.persona || {};
    const commands = originalFrontMatter.commands || [];
    
    const agentName = agent.name || 'Agent';
    const agentTitle = agent.title || 'Assistant';
    const specialization = this.getAgentSpecialization(originalFrontMatter);
    
    // Create comprehensive BMad persona introduction
    const bmadIntro = this.createBMadIntroduction(agent, persona, specialization);
    
    // Create BMad capabilities section
    const bmadCapabilities = this.createBMadCapabilities(persona, commands);
    
    // Create BMad workflow section
    const bmadWorkflow = this.createBMadWorkflow(originalFrontMatter);

    // Remove the original activation notice and YAML block since we're transforming to Kiro format
    const cleanedContent = content
      .replace(/ACTIVATION-NOTICE:.*?(?=\n#|\n\n|$)/s, '')
      .replace(/CRITICAL:.*?(?=\n#|\n\n|$)/s, '')
      .replace(/## COMPLETE AGENT DEFINITION FOLLOWS.*?```yaml[\s\S]*?```/s, '')
      .replace(/^# \w+\s*$/m, '') // Remove the original heading like "# pm"
      .trim();

    // Combine all sections
    return [
      bmadIntro,
      cleanedContent,
      bmadCapabilities,
      bmadWorkflow
    ].filter(section => section.trim()).join('\n\n');
  }

  /**
   * Create BMad agent introduction preserving original personality
   * @param {Object} agent - Agent configuration
   * @param {Object} persona - Persona configuration
   * @param {string} specialization - Agent specialization
   * @returns {string} - BMad introduction
   */
  createBMadIntroduction(agent, persona, specialization) {
    const name = agent.name || 'Agent';
    const title = agent.title || 'Assistant';
    const role = persona.role || title;
    const style = persona.style || 'professional and helpful';
    const identity = persona.identity || `${title} specialized in project support`;

    return `I am **${name}**, your BMad ${title}, bringing ${role.toLowerCase()} expertise to your Kiro IDE environment.

**My Identity**: ${identity}

**My Style**: ${style}

**My Specialization**: ${specialization}

**Enhanced with Kiro**: I maintain my BMad Method expertise while leveraging Kiro's context awareness, steering rules, and MCP integrations to provide more targeted and effective assistance.`;
  }

  /**
   * Create BMad capabilities section
   * @param {Object} persona - Persona configuration
   * @param {Array} commands - Available commands
   * @returns {string} - BMad capabilities section
   */
  createBMadCapabilities(persona, commands) {
    let capabilitiesSection = '## My BMad Method Capabilities\n\n';
    
    // Add core principles if available
    if (persona.core_principles && Array.isArray(persona.core_principles)) {
      capabilitiesSection += '**Core Principles I Follow**:\n';
      persona.core_principles.forEach(principle => {
        capabilitiesSection += `- ${principle}\n`;
      });
      capabilitiesSection += '\n';
    }

    // Add focus area
    if (persona.focus) {
      capabilitiesSection += `**Primary Focus**: ${persona.focus}\n\n`;
    }

    // Add available commands
    if (commands && commands.length > 0) {
      capabilitiesSection += '**Available BMad Commands**:\n';
      commands.forEach(cmd => {
        if (typeof cmd === 'object') {
          const [cmdName, cmdDesc] = Object.entries(cmd)[0];
          capabilitiesSection += `- \`*${cmdName}\`: ${cmdDesc}\n`;
        }
      });
      capabilitiesSection += '\n';
    }

    return capabilitiesSection;
  }

  /**
   * Create BMad workflow section
   * @param {Object} originalFrontMatter - Original front matter
   * @returns {string} - BMad workflow section
   */
  createBMadWorkflow(originalFrontMatter) {
    const agent = originalFrontMatter.agent || {};
    
    let workflowSection = '## How I Work with You\n\n';
    
    // Add when to use guidance
    if (agent.whenToUse) {
      workflowSection += `**When to engage me**: ${agent.whenToUse}\n\n`;
    }

    workflowSection += `**My approach**:
1. I leverage both BMad Method structured workflows and Kiro's real-time context
2. I maintain my specialized expertise while adapting to your current project state
3. I follow BMad's systematic approach enhanced with Kiro's intelligent context injection
4. I preserve the quality and rigor of BMad Method while being more responsive to your immediate needs

**Getting started**: Use \`*help\` to see my available commands, or simply describe what you'd like to accomplish and I'll guide you through the appropriate BMad Method workflow.`;

    return workflowSection;
  }

  /**
   * Get agent specialization description
   * @param {Object} frontMatter - Front matter object
   * @returns {string} - Specialization description
   */
  getAgentSpecialization(frontMatter) {
    const specializationMap = {
      'pm': 'creating comprehensive Product Requirements Documents and managing product planning workflows',
      'architect': 'designing software architecture and technical decision-making',
      'dev': 'software development and implementation guidance',
      'qa': 'quality assurance, testing strategies, and code review',
      'sm': 'scrum management and agile workflow coordination',
      'po': 'product ownership and stakeholder management',
      'analyst': 'business analysis and requirements gathering',
      'ux-expert': 'user experience design and usability optimization'
    };

    const agentType = this.getAgentType(frontMatter);
    return specializationMap[agentType] || 'development support and project guidance';
  }
  /**
   * Create Kiro-specific front matter with expansion pack support
   * @param {Object} originalFrontMatter - Original BMad front matter
   * @param {string} inputPath - Input file path
   * @param {Object} options - Transformation options
   * @returns {Object} - Enhanced front matter with expansion pack support
   */
  createKiroFrontMatterWithExpansionPack(originalFrontMatter, inputPath, options) {
    const baseFrontMatter = this.createKiroFrontMatter(originalFrontMatter, inputPath, options);
    
    if (options.expansionPack) {
      // Add expansion pack specific metadata
      baseFrontMatter.expansion_pack = {
        id: options.expansionPack,
        enabled: true,
        features: options.enableExpansionPackFeatures ? ['templates', 'workflows', 'hooks'] : []
      };
      
      // Add expansion pack specific steering rules
      const expansionSteeringRules = [`${options.expansionPack}.md`];
      baseFrontMatter.steering_rules = [...new Set([...baseFrontMatter.steering_rules, ...expansionSteeringRules])];
      
      // Add expansion pack specific MCP tools
      const expansionMCPTools = this.getExpansionPackMCPTools(options.expansionPack);
      baseFrontMatter.mcp_tools = [...new Set([...baseFrontMatter.mcp_tools, ...expansionMCPTools])];
    }
    
    return baseFrontMatter;
  }

  /**
   * Add steering integration with expansion pack rules
   * @param {string} content - Content with context awareness
   * @param {Object} options - Transformation options
   * @returns {string} - Content with enhanced steering integration
   */
  addSteeringIntegrationWithExpansionPack(content, options) {
    let steeringNote = `
## Steering Rules Integration

I automatically apply project-specific conventions and technical preferences from your Kiro steering rules:
- **product.md**: Product and business context
- **tech.md**: Technical stack and preferences  
- **structure.md**: Project structure and conventions`;

    if (options.expansionPack) {
      steeringNote += `
- **${options.expansionPack}.md**: ${options.expansionPack} domain-specific conventions and best practices`;
    }

    steeringNote += `

These rules ensure consistency across all my recommendations and align with your project's established patterns.

`;

    // Add steering section before any existing "Capabilities" or similar section
    const capabilitiesIndex = content.toLowerCase().indexOf('## capabilities');
    if (capabilitiesIndex !== -1) {
      return content.slice(0, capabilitiesIndex) + steeringNote + content.slice(capabilitiesIndex);
    }

    // Otherwise append to the end
    return content + steeringNote;
  }

  /**
   * Add expansion pack specific capabilities
   * @param {string} content - Content with steering integration
   * @param {Object} options - Transformation options
   * @returns {string} - Content with expansion pack capabilities
   */
  addExpansionPackCapabilities(content, options) {
    if (!options.expansionPack) {
      return content;
    }

    const expansionCapabilities = this.generateExpansionPackCapabilities(options.expansionPack);
    
    // Add expansion pack section before workflow section
    const workflowIndex = content.toLowerCase().indexOf('## how i work');
    if (workflowIndex !== -1) {
      return content.slice(0, workflowIndex) + expansionCapabilities + '\n\n' + content.slice(workflowIndex);
    }

    // Otherwise append before the end
    return content + '\n\n' + expansionCapabilities;
  }

  /**
   * Preserve BMad persona with Kiro and expansion pack enhancements
   * @param {string} content - Content with all enhancements
   * @param {Object} originalFrontMatter - Original front matter
   * @param {Object} options - Transformation options
   * @returns {string} - Final content with all enhancements
   */
  preserveBMadPersonaWithKiroEnhancements(content, originalFrontMatter, options) {
    // Start with base BMad persona preservation
    let enhancedContent = this.preserveBMadPersona(content, originalFrontMatter);
    
    // Add expansion pack specific persona enhancements
    if (options.expansionPack) {
      const expansionPersona = this.createExpansionPackPersonaEnhancement(originalFrontMatter, options);
      
      // Insert expansion pack persona after the main introduction
      const firstSectionIndex = enhancedContent.indexOf('\n\n');
      if (firstSectionIndex !== -1) {
        enhancedContent = enhancedContent.slice(0, firstSectionIndex) + 
                         '\n\n' + expansionPersona + 
                         enhancedContent.slice(firstSectionIndex);
      } else {
        enhancedContent = expansionPersona + '\n\n' + enhancedContent;
      }
    }
    
    return enhancedContent;
  }

  /**
   * Generate expansion pack specific capabilities
   * @param {string} expansionPackId - Expansion pack ID
   * @returns {string} - Expansion pack capabilities section
   */
  generateExpansionPackCapabilities(expansionPackId) {
    const capabilityMap = {
      'bmad-2d-phaser-game-dev': `## Game Development Expertise

**Phaser.js Game Development**:
- 2D game architecture and scene management
- Sprite animation and physics integration
- Game state management and progression systems
- Asset optimization and loading strategies

**Game Design Patterns**:
- Entity-Component-System (ECS) architecture
- Game loop optimization and performance tuning
- Input handling and user interaction design
- Audio integration and sound effect management`,

      'bmad-2d-unity-game-dev': `## Unity Game Development Expertise

**Unity 2D Development**:
- Unity scene management and prefab systems
- 2D physics and collision detection
- Animation controllers and state machines
- Unity asset pipeline and optimization

**Game Development Workflow**:
- Unity project structure and organization
- Component-based architecture patterns
- Unity editor scripting and custom tools
- Build pipeline and platform deployment`,

      'bmad-infrastructure-devops': `## Infrastructure & DevOps Expertise

**Infrastructure as Code**:
- Terraform and CloudFormation templates
- Kubernetes deployment and orchestration
- Docker containerization strategies
- CI/CD pipeline design and implementation

**DevOps Best Practices**:
- Infrastructure monitoring and alerting
- Security scanning and compliance
- Automated testing and deployment
- Cloud platform optimization (AWS, GCP, Azure)`
    };

    return capabilityMap[expansionPackId] || `## ${expansionPackId} Domain Expertise

**Specialized Knowledge**:
- Domain-specific patterns and best practices
- Industry-standard tools and workflows
- Performance optimization techniques
- Quality assurance and testing strategies`;
  }

  /**
   * Create expansion pack persona enhancement
   * @param {Object} originalFrontMatter - Original front matter
   * @param {Object} options - Transformation options
   * @returns {string} - Expansion pack persona enhancement
   */
  createExpansionPackPersonaEnhancement(originalFrontMatter, options) {
    const expansionPackId = options.expansionPack;
    const domainMap = {
      'bmad-2d-phaser-game-dev': 'Phaser.js 2D game development',
      'bmad-2d-unity-game-dev': 'Unity 2D game development',
      'bmad-infrastructure-devops': 'Infrastructure and DevOps'
    };

    const domain = domainMap[expansionPackId] || expansionPackId.replace(/-/g, ' ');

    return `**Enhanced with ${domain}**: I bring specialized expertise in ${domain} while maintaining my core BMad Method approach. I understand domain-specific patterns, tools, and best practices that I seamlessly integrate with BMad's structured workflows.`;
  }

  /**
   * Get expansion pack specific MCP tools
   * @param {string} expansionPackId - Expansion pack ID
   * @returns {Array} - List of MCP tools for the expansion pack
   */
  getExpansionPackMCPTools(expansionPackId) {
    const toolMap = {
      'bmad-2d-phaser-game-dev': ['web-search', 'documentation', 'api-testing'],
      'bmad-2d-unity-game-dev': ['web-search', 'documentation', 'file-manager'],
      'bmad-infrastructure-devops': ['web-search', 'api-testing', 'ssh-client', 'kubernetes']
    };

    return toolMap[expansionPackId] || ['web-search', 'documentation'];
  }

  /**
   * Add MCP setup guidance when no tools are available
   * @param {string} content - Agent content
   * @param {string} agentId - Agent identifier
   * @param {Object} recommendations - MCP recommendations
   * @returns {string} - Content with setup guidance
   */
  addMCPSetupGuidance(content, agentId, recommendations) {
    const guidanceSection = `## MCP Tools Setup

I can be enhanced with external tools through Kiro's MCP (Model Context Protocol) integration. Currently, no MCP tools are configured for your workspace.

### Recommended Tools for ${agentId.charAt(0).toUpperCase() + agentId.slice(1)} Agent

${recommendations.priority.map(tool => 
  `- **${tool.name}** (Priority: ${tool.priority}/10): ${this.getToolBenefit(tool.name, agentId)}`
).join('\n')}

### Quick Setup

To enable these tools, add them to your \`.kiro/settings/mcp.json\` configuration file. Use the command palette in Kiro and search for "MCP" to find setup commands and documentation.

Once configured, I'll automatically use these tools to provide enhanced assistance for your ${agentId} workflows.

`;

    // Add guidance section before any existing "Capabilities" or similar section
    const capabilitiesIndex = content.toLowerCase().indexOf('## capabilities');
    if (capabilitiesIndex !== -1) {
      return content.slice(0, capabilitiesIndex) + guidanceSection + content.slice(capabilitiesIndex);
    }

    // Otherwise append to the end
    return content + guidanceSection;
  }

  /**
   * Add MCP recommendations for missing tools
   * @param {string} content - Agent content
   * @param {Object} recommendations - MCP recommendations
   * @returns {string} - Content with recommendations
   */
  addMCPRecommendations(content, recommendations) {
    if (recommendations.missingTools.length === 0) {
      return content;
    }

    const recommendationsSection = `

### Additional Recommended Tools

The following tools would further enhance my capabilities:

${recommendations.priority.map(tool => 
  `- **${tool.name}**: ${this.getToolBenefit(tool.name, recommendations.agentType)}`
).join('\n')}

These tools can be added to your \`.kiro/settings/mcp.json\` configuration file.

`;

    // Add after the existing MCP tools section
    const mcpSectionMatch = content.match(/(## Available MCP Tools[\s\S]*?)(\n## |$)/);
    if (mcpSectionMatch) {
      const beforeNext = mcpSectionMatch[2] || '';
      return content.replace(mcpSectionMatch[0], mcpSectionMatch[1] + recommendationsSection + beforeNext);
    }

    return content + recommendationsSection;
  }

  /**
   * Get benefit description for a tool
   * @param {string} toolName - Name of the tool
   * @param {string} agentType - Type of agent
   * @returns {string} - Benefit description
   */
  getToolBenefit(toolName, agentType) {
    const benefits = {
      'web-search': {
        'analyst': 'Real-time market research and competitive analysis',
        'pm': 'Market validation and requirement research',
        'architect': 'Technology research and best practices lookup',
        'dev': 'Technical documentation and solution research',
        'qa': 'Bug research and testing methodology lookup',
        'sm': 'Project management best practices and methodology research'
      },
      'api-testing': {
        'analyst': 'API analysis for competitive research',
        'pm': 'API requirement validation and testing',
        'architect': 'API design validation and testing',
        'dev': 'Automated endpoint testing and validation',
        'qa': 'Comprehensive API testing and quality assurance',
        'sm': 'API integration status monitoring'
      },
      'documentation': {
        'analyst': 'Automated research report generation',
        'pm': 'PRD and specification document creation',
        'architect': 'Architecture documentation and spec generation',
        'dev': 'Code documentation and API spec creation',
        'qa': 'Test documentation and quality reports',
        'sm': 'Project documentation and status reports'
      },
      'github': {
        'analyst': 'Repository analysis and competitive intelligence',
        'pm': 'Project tracking and issue management',
        'architect': 'Architecture review and code analysis',
        'dev': 'Repository management and code collaboration',
        'qa': 'Issue tracking and quality monitoring',
        'sm': 'Sprint planning and team coordination'
      },
      'aws-docs': {
        'analyst': 'Cloud service analysis and research',
        'pm': 'Cloud solution planning and requirements',
        'architect': 'Cloud architecture guidance and best practices',
        'dev': 'AWS service integration and development',
        'qa': 'Cloud testing and monitoring strategies',
        'sm': 'Cloud project planning and resource management'
      }
    };

    const toolBenefits = benefits[toolName];
    if (toolBenefits && toolBenefits[agentType]) {
      return toolBenefits[agentType];
    }

    return `Enhanced ${toolName} capabilities for ${agentType} workflows`;
  }
}

module.exports = AgentTransformer;