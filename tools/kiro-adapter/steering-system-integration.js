/**
 * Steering System Integration
 * Comprehensive steering system integration for BMad agents in Kiro
 * Handles auto-generation, expansion pack support, and fallback activation
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const SteeringTemplateGenerator = require('./steering-template-generator');
const SteeringIntegrator = require('./steering-integrator');

class SteeringSystemIntegration {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      kiroPath: options.kiroPath || process.cwd(),
      enableFallbackActivation: options.enableFallbackActivation !== false,
      generateExpansionPackRules: options.generateExpansionPackRules !== false,
      ...options
    };
    
    this.steeringGenerator = new SteeringTemplateGenerator({
      verbose: this.options.verbose
    });
    
    this.steeringIntegrator = new SteeringIntegrator({
      verbose: this.options.verbose
    });
    
    this.generatedFiles = new Set();
    this.expansionPackRules = new Map();
    this.agentSteeringMap = new Map();
  }

  /**
   * Log messages with optional color
   * @param {string} message - Message to log
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    // Always log errors and success messages, respect verbose for info
    if (!this.options.verbose && level === 'info') return;
    
    const colors = {
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green
    };
    
    console.log(colors[level](`[SteeringSystemIntegration] ${message}`));
  }

  /**
   * Auto-generate steering files for all converted agents
   * @param {Array} agentMetadataList - List of agent metadata from discovery
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generation results
   */
  async autoGenerateSteeringFiles(agentMetadataList, options = {}) {
    this.log('Starting auto-generation of steering files for all agents');
    
    const results = {
      totalAgents: agentMetadataList.length,
      coreSteeringGenerated: false,
      agentFilesGenerated: 0,
      expansionPackFilesGenerated: 0,
      fallbackActivationEnabled: 0,
      errors: []
    };

    try {
      // Generate core BMad steering rules first
      await this.generateCoreBMadSteeringRules();
      results.coreSteeringGenerated = true;

      // Group agents by expansion pack for efficient processing
      const agentsByExpansionPack = this.groupAgentsByExpansionPack(agentMetadataList);

      // Generate expansion pack steering files
      for (const [expansionPack, agents] of agentsByExpansionPack.entries()) {
        if (expansionPack && expansionPack !== 'core') {
          try {
            await this.generateExpansionPackSteeringFile(expansionPack, agents);
            results.expansionPackFilesGenerated++;
          } catch (error) {
            results.errors.push({
              type: 'expansion-pack',
              expansionPack,
              error: error.message
            });
          }
        }
      }

      // Generate agent-specific steering files
      for (const agentMetadata of agentMetadataList) {
        try {
          await this.generateAgentSpecificSteeringFile(agentMetadata, options);
          results.agentFilesGenerated++;

          // Enable fallback activation if requested
          if (this.options.enableFallbackActivation) {
            await this.enableFallbackActivation(agentMetadata);
            results.fallbackActivationEnabled++;
          }
        } catch (error) {
          results.errors.push({
            type: 'agent-specific',
            agentId: agentMetadata.id,
            error: error.message
          });
        }
      }

      this.log(`Steering file generation complete: ${results.agentFilesGenerated} agent files, ${results.expansionPackFilesGenerated} expansion pack files`, 'success');
      
      return results;
    } catch (error) {
      this.log(`Error during steering file generation: ${error.message}`, 'error');
      results.errors.push({
        type: 'general',
        error: error.message
      });
      return results;
    }
  }

  /**
   * Generate core BMad steering rules
   * @returns {Promise<void>}
   */
  async generateCoreBMadSteeringRules() {
    try {
      this.log('Generating core BMad steering rules');
      
      const steeringDir = path.join(this.options.kiroPath, '.kiro', 'steering');
      await fs.ensureDir(steeringDir);

      // Generate bmad-method.md if it doesn't exist
      const bmadMethodPath = path.join(steeringDir, 'bmad-method.md');
      if (!await fs.pathExists(bmadMethodPath)) {
        const bmadMethodContent = this.generateBMadMethodSteeringContent();
        await fs.writeFile(bmadMethodPath, bmadMethodContent);
        this.generatedFiles.add(bmadMethodPath);
        this.log('Generated bmad-method.md steering file', 'success');
      } else {
        this.log('bmad-method.md already exists, skipping');
      }

      // Generate tech-preferences.md if it doesn't exist
      const techPreferencesPath = path.join(steeringDir, 'tech-preferences.md');
      if (!await fs.pathExists(techPreferencesPath)) {
        const techPreferencesContent = this.generateTechPreferencesSteeringContent();
        await fs.writeFile(techPreferencesPath, techPreferencesContent);
        this.generatedFiles.add(techPreferencesPath);
        this.log('Generated tech-preferences.md steering file', 'success');
      } else {
        this.log('tech-preferences.md already exists, skipping');
      }
    } catch (error) {
      this.log(`Error generating core BMad steering rules: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate BMad Method steering content
   * @returns {string} - BMad Method steering content
   */
  generateBMadMethodSteeringContent() {
    return `---
inclusion: always
---

# BMad Method Integration Rules

## Core Principles

- Follow BMad Method's structured approach to development
- Maintain agent specialization and expertise areas
- Use spec-driven development for complex features
- Leverage Kiro's context system for enhanced project awareness
- Apply steering rules consistently across all agent interactions

## Agent Behavior Standards

- Preserve BMad persona while leveraging Kiro capabilities
- Use context providers (#File, #Folder, #Codebase) automatically
- Reference steering rules for consistency in recommendations
- Integrate with MCP tools when available for enhanced functionality
- Follow BMad workflow patterns enhanced with Kiro features

## Quality Assurance

- Maintain BMad's rigorous quality assurance processes
- Use checklists and validation steps for all deliverables
- Ensure documentation is comprehensive and up-to-date
- Follow test-driven development practices where applicable
- Implement proper error handling and logging

## Workflow Integration

- Use Kiro specs for BMad planning workflows (PRD → requirements.md)
- Convert BMad stories to executable Kiro tasks
- Leverage Kiro hooks for workflow automation
- Maintain BMad's two-phase approach (planning then implementation)
- Ensure seamless handoffs between BMad agents

## Context Management

- Automatically inject relevant project context into agent prompts
- Use #Codebase for architectural consistency
- Reference #Problems and #Terminal for debugging context
- Leverage #Git Diff for change-aware recommendations
- Apply project-specific conventions from steering rules

## Fallback Activation Support

- Enable steering-based agent activation when native activation fails
- Provide clear instructions for manual agent activation
- Maintain agent capabilities through steering rule definitions
- Support graceful degradation of agent functionality
`;
  }

  /**
   * Generate tech preferences steering content
   * @returns {string} - Tech preferences steering content
   */
  generateTechPreferencesSteeringContent() {
    return `---
inclusion: always
---

# Technical Preferences

## Code Style

- Use consistent indentation (2 spaces for JavaScript/TypeScript, 4 for Python)
- Follow language-specific naming conventions
- Write descriptive variable and function names
- Include comprehensive comments for complex logic
- Use meaningful commit messages following conventional commits

## Architecture Patterns

- Prefer composition over inheritance
- Use dependency injection where appropriate
- Follow SOLID principles
- Implement proper error handling and logging
- Design for testability and maintainability

## Testing Standards

- Write unit tests for all business logic
- Use integration tests for API endpoints
- Implement end-to-end tests for critical user flows
- Maintain test coverage above 80%
- Use descriptive test names and arrange-act-assert pattern

## Documentation Requirements

- Keep README files up-to-date with setup instructions
- Document API endpoints with examples
- Include architecture decision records (ADRs)
- Use clear, concise comments in code
- Maintain changelog for releases

## Performance Guidelines

- Optimize for readability first, performance second
- Use appropriate data structures and algorithms
- Implement caching strategies where beneficial
- Monitor and profile performance bottlenecks
- Consider lazy loading for large datasets

## Security Practices

- Validate all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Keep dependencies up-to-date
- Follow principle of least privilege
`;
  }

  /**
   * Group agents by expansion pack
   * @param {Array} agentMetadataList - List of agent metadata
   * @returns {Map} - Map of expansion pack to agents
   */
  groupAgentsByExpansionPack(agentMetadataList) {
    const grouped = new Map();
    
    for (const agent of agentMetadataList) {
      const expansionPack = agent.expansionPack || 'core';
      
      if (!grouped.has(expansionPack)) {
        grouped.set(expansionPack, []);
      }
      
      grouped.get(expansionPack).push(agent);
    }
    
    return grouped;
  }

  /**
   * Generate expansion pack steering file
   * @param {string} expansionPack - Expansion pack name
   * @param {Array} agents - Agents in this expansion pack
   * @returns {Promise<void>}
   */
  async generateExpansionPackSteeringFile(expansionPack, agents) {
    this.log(`Generating expansion pack steering file for: ${expansionPack}`);
    
    const steeringDir = path.join(this.options.kiroPath, '.kiro', 'steering');
    const steeringFilePath = path.join(steeringDir, `${expansionPack}.md`);
    
    // Don't overwrite existing files unless explicitly requested
    if (await fs.pathExists(steeringFilePath) && !this.options.overwrite) {
      this.log(`Expansion pack steering file already exists: ${expansionPack}.md`);
      return;
    }

    const expansionSteeringContent = this.generateExpansionPackSteeringContent(expansionPack, agents);
    await fs.writeFile(steeringFilePath, expansionSteeringContent);
    
    this.generatedFiles.add(steeringFilePath);
    this.expansionPackRules.set(expansionPack, steeringFilePath);
    
    this.log(`Generated expansion pack steering file: ${expansionPack}.md`, 'success');
  }

  /**
   * Generate expansion pack steering content
   * @param {string} expansionPack - Expansion pack name
   * @param {Array} agents - Agents in this expansion pack
   * @returns {string} - Expansion pack steering content
   */
  generateExpansionPackSteeringContent(expansionPack, agents) {
    const domainInfo = this.getExpansionPackDomainInfo(expansionPack);
    const agentList = agents.map(a => `- **${a.name}** (${a.id}): ${a.persona.role || 'Development Assistant'}`).join('\n');
    
    return `---
inclusion: always
projectType: "${expansionPack}"
---

# ${domainInfo.displayName} Domain Steering Rules

## Domain Overview
${domainInfo.description}

## Available Agents
${agentList}

## Core Technologies
${domainInfo.technologies.map(t => `- ${t}`).join('\n')}

## Development Patterns
${domainInfo.patterns.map(p => `- ${p}`).join('\n')}

## Quality Standards
${domainInfo.qualityStandards.map(q => `- ${q}`).join('\n')}

## Best Practices
${domainInfo.bestPractices.map(b => `- ${b}`).join('\n')}

## Tool Integration
${domainInfo.tools.map(t => `- ${t}`).join('\n')}

## BMad Method Alignment
- Apply BMad's structured approach to ${domainInfo.domain} development
- Use domain-specific agents for specialized tasks
- Maintain quality assurance processes adapted to ${domainInfo.domain}
- Follow ${domainInfo.domain} industry standards and conventions

## Kiro Integration
- Use context providers relevant to ${domainInfo.domain} development
- Apply domain-specific steering rules consistently
- Integrate with ${domainInfo.domain} tooling through MCP when available
- Respect ${domainInfo.domain} project structures and conventions

## Agent Activation Guidance
When working on ${domainInfo.domain} projects:
1. Use domain-specific agents for specialized tasks
2. Leverage expansion pack knowledge and patterns
3. Apply domain-specific quality standards
4. Follow established ${domainInfo.domain} workflows and conventions
`;
  }

  /**
   * Generate agent-specific steering file
   * @param {Object} agentMetadata - Agent metadata
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateAgentSpecificSteeringFile(agentMetadata, options = {}) {
    const { id, name, persona, expansionPack } = agentMetadata;
    
    this.log(`Generating agent-specific steering file for: ${id}`);
    
    const steeringDir = path.join(this.options.kiroPath, '.kiro', 'steering');
    const steeringFilePath = path.join(steeringDir, `bmad-${id}.md`);
    
    // Don't overwrite existing files unless explicitly requested
    if (await fs.pathExists(steeringFilePath) && !options.overwrite) {
      this.log(`Agent steering file already exists: bmad-${id}.md`);
      return;
    }

    const agentSteeringContent = this.generateAgentSteeringContent(agentMetadata);
    await fs.writeFile(steeringFilePath, agentSteeringContent);
    
    this.generatedFiles.add(steeringFilePath);
    this.agentSteeringMap.set(id, steeringFilePath);
    
    this.log(`Generated agent-specific steering file: bmad-${id}.md`, 'success');
  }

  /**
   * Generate agent steering content
   * @param {Object} agentMetadata - Agent metadata
   * @returns {string} - Agent steering content
   */
  generateAgentSteeringContent(agentMetadata) {
    const { id, name, persona, commands, dependencies, expansionPack } = agentMetadata;
    
    let content = `---
inclusion: manual
agentFilter: "${id}"
---

# ${name} Agent Steering Rules

## Agent Identity
- **Role**: ${persona.role || 'Development Assistant'}
- **Focus**: ${persona.focus || 'General development support'}
- **Style**: ${persona.style || 'Professional and helpful'}
- **Activation**: Use when ${this.getAgentActivationGuidance(id)}

## Core Principles
${(persona.core_principles || this.getDefaultCorePrinciples(id)).map(p => `- ${p}`).join('\n')}

## Capabilities
${this.getAgentCapabilities(agentMetadata).map(c => `- ${c}`).join('\n')}

## Available Commands
${(commands || []).map(cmd => `- \`*${cmd.name || cmd}\`: ${cmd.description || 'No description available'}`).join('\n')}

## Context Requirements
${this.getAgentContextRequirements(id).map(c => `- ${c}`).join('\n')}

## Dependencies
${this.formatDependencies(dependencies)}

## BMad Method Integration
- Follow BMad's structured development approach
- Maintain agent specialization and expertise
- Use spec-driven development for complex features
- Apply quality assurance processes consistently

## Kiro Integration
- Leverage Kiro's context system (#File, #Folder, #Codebase, etc.)
- Use steering rules for consistent guidance
- Integrate with MCP tools when available
- Respect project-specific conventions and standards`;

    // Add expansion pack specific content
    if (expansionPack) {
      const domainInfo = this.getExpansionPackDomainInfo(expansionPack);
      content += `

## ${domainInfo.displayName} Domain Expertise
Apply specialized knowledge of ${domainInfo.domain} development:
${domainInfo.domainGuidance || domainInfo.description}

## Domain-Specific Patterns
${domainInfo.patterns.map(p => `- ${p}`).join('\n')}`;
    }

    content += `

## Fallback Activation Instructions
If native agent activation fails, you can activate this agent by:
1. Modifying this steering file and setting inclusion to "always"
2. Including specific instructions for the agent's behavior
3. Referencing the agent's capabilities and expertise in your prompts
4. Using context providers to give the agent necessary information

### Manual Activation Example
\`\`\`markdown
---
inclusion: always
---

# Activate ${name} Agent

I need the ${name} agent to help with [specific task].

## Task Context
[Provide relevant context about the task]

## Expected Outcome
[Describe what you want the agent to accomplish]

## Available Resources
[List any relevant files, documentation, or resources]
\`\`\`

## Quality Standards
- Maintain high code quality and consistency
- Follow established patterns and conventions
- Provide comprehensive documentation
- Include testing considerations in recommendations
- Ensure accessibility compliance where applicable
`;

    return content;
  }

  /**
   * Enable fallback activation for an agent
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Promise<void>}
   */
  async enableFallbackActivation(agentMetadata) {
    const { id } = agentMetadata;
    const steeringFilePath = this.agentSteeringMap.get(id);
    
    if (!steeringFilePath) {
      this.log(`No steering file found for agent: ${id}`, 'warn');
      return;
    }

    // Create a fallback activation guide
    const fallbackGuidePath = path.join(
      this.options.kiroPath, 
      '.kiro', 
      'steering', 
      `FALLBACK_ACTIVATION_${id.toUpperCase()}.md`
    );
    
    const fallbackContent = this.generateFallbackActivationGuide(agentMetadata);
    await fs.writeFile(fallbackGuidePath, fallbackContent);
    
    this.generatedFiles.add(fallbackGuidePath);
    this.log(`Generated fallback activation guide for: ${id}`, 'success');
  }

  /**
   * Generate fallback activation guide
   * @param {Object} agentMetadata - Agent metadata
   * @returns {string} - Fallback activation guide content
   */
  generateFallbackActivationGuide(agentMetadata) {
    const { id, name, persona } = agentMetadata;
    
    return `# ${name} Agent Fallback Activation Guide

## When to Use This Guide
Use this guide when the native ${name} agent activation fails in Kiro.

## Quick Activation Steps

### Step 1: Modify Steering File
Edit \`.kiro/steering/bmad-${id}.md\` and change:
\`\`\`yaml
---
inclusion: manual
---
\`\`\`

To:
\`\`\`yaml
---
inclusion: always
---
\`\`\`

### Step 2: Activate Through Prompt
Use this prompt template:

\`\`\`
I need the ${name} agent to help with [describe your task].

As the ${persona.role || 'Development Assistant'}, please:
1. [Specific request 1]
2. [Specific request 2]
3. [Specific request 3]

Context:
- Current file: [file path or description]
- Project type: [project description]
- Specific requirements: [any constraints or requirements]
\`\`\`

### Step 3: Provide Context
Make sure to include relevant context:
- Use #File for current file context
- Use #Folder for project structure
- Use #Codebase for full project understanding
- Use #Problems for current issues
- Use #Terminal for build/error output

## Troubleshooting

### If the agent doesn't respond appropriately:
1. Check that the steering file modification was saved
2. Restart Kiro if necessary
3. Try being more specific in your requests
4. Include more context about your project and goals

### If you need to deactivate:
Change the steering file back to:
\`\`\`yaml
---
inclusion: manual
---
\`\`\`

## Agent Capabilities Reminder
${this.getAgentCapabilities(agentMetadata).map(c => `- ${c}`).join('\n')}

## Best Practices
- Be specific about what you want the agent to do
- Provide relevant context and constraints
- Ask for explanations when you need to understand the reasoning
- Use the agent's specialized knowledge and expertise
`;
  }

  /**
   * Create steering-based fallback for agent activation
   * @param {string} agentId - Agent identifier
   * @param {Object} activationContext - Context for activation
   * @returns {Promise<Object>} - Fallback activation result
   */
  async createSteeringBasedFallback(agentId, activationContext = {}) {
    this.log(`Creating steering-based fallback for agent: ${agentId}`);
    
    const steeringFilePath = this.agentSteeringMap.get(agentId);
    
    if (!steeringFilePath) {
      return {
        success: false,
        error: `No steering file found for agent: ${agentId}`,
        fallbackAvailable: false
      };
    }

    try {
      // Read current steering file
      const currentContent = await fs.readFile(steeringFilePath, 'utf8');
      
      // Modify to enable always inclusion
      const modifiedContent = currentContent.replace(
        /inclusion:\s*manual/g,
        'inclusion: always'
      );
      
      // Add activation context if provided
      let finalContent = modifiedContent;
      if (activationContext.task || activationContext.instructions) {
        finalContent += `\n\n## Current Activation Context\n`;
        if (activationContext.task) {
          finalContent += `**Task**: ${activationContext.task}\n`;
        }
        if (activationContext.instructions) {
          finalContent += `**Instructions**: ${activationContext.instructions}\n`;
        }
        if (activationContext.context) {
          finalContent += `**Context**: ${activationContext.context}\n`;
        }
      }
      
      // Write modified content
      await fs.writeFile(steeringFilePath, finalContent);
      
      this.log(`Enabled steering-based fallback for agent: ${agentId}`, 'success');
      
      return {
        success: true,
        fallbackEnabled: true,
        steeringFilePath,
        instructions: `Agent ${agentId} is now activated through steering rules. You can interact with it normally.`,
        deactivationInstructions: `To deactivate, change 'inclusion: always' back to 'inclusion: manual' in ${steeringFilePath}`
      };
      
    } catch (error) {
      this.log(`Error creating steering-based fallback for ${agentId}: ${error.message}`, 'error');
      
      return {
        success: false,
        error: error.message,
        fallbackAvailable: true
      };
    }
  }

  /**
   * Add BMad-specific context and instructions to steering
   * @param {string} agentId - Agent identifier
   * @param {Object} bmadContext - BMad-specific context
   * @returns {Promise<void>}
   */
  async addBMadSpecificContext(agentId, bmadContext) {
    const steeringFilePath = this.agentSteeringMap.get(agentId);
    
    if (!steeringFilePath) {
      this.log(`No steering file found for agent: ${agentId}`, 'warn');
      return;
    }

    try {
      const currentContent = await fs.readFile(steeringFilePath, 'utf8');
      
      let bmadContextSection = `\n## BMad-Specific Context\n`;
      
      if (bmadContext.workflow) {
        bmadContextSection += `**Current Workflow**: ${bmadContext.workflow}\n`;
      }
      
      if (bmadContext.phase) {
        bmadContextSection += `**Development Phase**: ${bmadContext.phase}\n`;
      }
      
      if (bmadContext.dependencies) {
        bmadContextSection += `**Active Dependencies**: ${bmadContext.dependencies.join(', ')}\n`;
      }
      
      if (bmadContext.qualityGates) {
        bmadContextSection += `**Quality Gates**: ${bmadContext.qualityGates.join(', ')}\n`;
      }
      
      if (bmadContext.teamContext) {
        bmadContextSection += `**Team Context**: ${bmadContext.teamContext}\n`;
      }
      
      const updatedContent = currentContent + bmadContextSection;
      await fs.writeFile(steeringFilePath, updatedContent);
      
      this.log(`Added BMad-specific context to agent: ${agentId}`, 'success');
      
    } catch (error) {
      this.log(`Error adding BMad context to ${agentId}: ${error.message}`, 'error');
    }
  }

  /**
   * Implement expansion pack domain knowledge in steering
   * @param {string} expansionPack - Expansion pack name
   * @param {Object} domainKnowledge - Domain-specific knowledge
   * @returns {Promise<void>}
   */
  async implementExpansionPackDomainKnowledge(expansionPack, domainKnowledge) {
    const steeringFilePath = this.expansionPackRules.get(expansionPack);
    
    if (!steeringFilePath) {
      this.log(`No expansion pack steering file found for: ${expansionPack}`, 'warn');
      return;
    }

    try {
      const currentContent = await fs.readFile(steeringFilePath, 'utf8');
      
      let domainSection = `\n## Enhanced Domain Knowledge\n`;
      
      if (domainKnowledge.frameworks) {
        domainSection += `**Frameworks**: ${domainKnowledge.frameworks.join(', ')}\n`;
      }
      
      if (domainKnowledge.libraries) {
        domainSection += `**Libraries**: ${domainKnowledge.libraries.join(', ')}\n`;
      }
      
      if (domainKnowledge.patterns) {
        domainSection += `**Patterns**:\n${domainKnowledge.patterns.map(p => `- ${p}`).join('\n')}\n`;
      }
      
      if (domainKnowledge.antiPatterns) {
        domainSection += `**Anti-Patterns to Avoid**:\n${domainKnowledge.antiPatterns.map(p => `- ${p}`).join('\n')}\n`;
      }
      
      if (domainKnowledge.resources) {
        domainSection += `**Resources**:\n${domainKnowledge.resources.map(r => `- ${r}`).join('\n')}\n`;
      }
      
      const updatedContent = currentContent + domainSection;
      await fs.writeFile(steeringFilePath, updatedContent);
      
      this.log(`Enhanced domain knowledge for expansion pack: ${expansionPack}`, 'success');
      
    } catch (error) {
      this.log(`Error enhancing domain knowledge for ${expansionPack}: ${error.message}`, 'error');
    }
  }

  /**
   * Get generated files list
   * @returns {Array} - List of generated file paths
   */
  getGeneratedFiles() {
    return Array.from(this.generatedFiles);
  }

  /**
   * Get agent steering map
   * @returns {Map} - Map of agent ID to steering file path
   */
  getAgentSteeringMap() {
    return this.agentSteeringMap;
  }

  /**
   * Get expansion pack rules map
   * @returns {Map} - Map of expansion pack to steering file path
   */
  getExpansionPackRules() {
    return this.expansionPackRules;
  }

  /**
   * Validate steering system integration
   * @returns {Promise<Object>} - Validation results
   */
  async validateSteeringSystemIntegration() {
    this.log('Validating steering system integration');
    
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      statistics: {
        totalFiles: this.generatedFiles.size,
        agentFiles: this.agentSteeringMap.size,
        expansionPackFiles: this.expansionPackRules.size
      }
    };

    // Validate generated files exist
    for (const filePath of this.generatedFiles) {
      if (!await fs.pathExists(filePath)) {
        validation.valid = false;
        validation.errors.push(`Generated file not found: ${filePath}`);
      }
    }

    // Use steering integrator for comprehensive validation
    try {
      const steeringValidation = await this.steeringIntegrator.validateSteeringRuleConsistency(
        this.options.kiroPath
      );
      
      if (!steeringValidation.valid) {
        validation.valid = false;
        validation.errors.push(...steeringValidation.errors);
      }
      
      validation.warnings.push(...steeringValidation.warnings);
      
    } catch (error) {
      validation.warnings.push(`Could not validate steering rule consistency: ${error.message}`);
    }

    this.log(`Steering system validation complete: ${validation.valid ? 'PASSED' : 'FAILED'}`, validation.valid ? 'success' : 'error');
    
    return validation;
  }

  // Helper methods for agent metadata
  getAgentActivationGuidance(agentId) {
    const guidanceMap = {
      'pm': 'planning products, gathering requirements, or managing roadmaps',
      'architect': 'designing systems, making technical decisions, or reviewing architecture',
      'dev': 'implementing code, debugging issues, or reviewing technical solutions',
      'qa': 'testing applications, ensuring quality, or designing test strategies',
      'sm': 'facilitating agile processes, removing impediments, or improving team workflows',
      'po': 'managing product backlogs, writing user stories, or prioritizing features',
      'analyst': 'analyzing requirements, documenting processes, or gathering business needs',
      'ux-expert': 'designing user experiences, conducting research, or improving usability'
    };
    
    return guidanceMap[agentId] || 'general development tasks or technical guidance is needed';
  }

  getDefaultCorePrinciples(agentId) {
    const principleMap = {
      'pm': [
        'Customer-centric product development',
        'Data-driven decision making',
        'Clear communication and stakeholder alignment',
        'Iterative improvement and feedback incorporation'
      ],
      'architect': [
        'Scalable and maintainable system design',
        'Technology choices based on requirements',
        'Documentation and knowledge sharing',
        'Performance and security considerations'
      ],
      'dev': [
        'Clean, readable, and maintainable code',
        'Test-driven development practices',
        'Continuous learning and improvement',
        'Collaborative development and code review'
      ],
      'qa': [
        'Quality is everyone\'s responsibility',
        'Prevention over detection',
        'Comprehensive test coverage',
        'Continuous improvement of testing processes'
      ]
    };
    
    return principleMap[agentId] || [
      'Quality and excellence in all deliverables',
      'Clear communication and collaboration',
      'Continuous learning and improvement',
      'User-focused solutions and outcomes'
    ];
  }

  getAgentCapabilities(agentMetadata) {
    const { id, commands, persona } = agentMetadata;
    
    // Extract from commands if available
    if (commands && commands.length > 0) {
      return commands.map(cmd => {
        const name = cmd.name || cmd;
        const description = cmd.description || 'No description available';
        return `${name}: ${description}`;
      });
    }
    
    // Fallback to default capabilities based on agent ID
    const capabilityMap = {
      'pm': [
        'Product roadmap development',
        'Requirements gathering and analysis',
        'Stakeholder communication',
        'Market research and competitive analysis',
        'Feature prioritization and backlog management'
      ],
      'architect': [
        'System architecture design',
        'Technology stack evaluation',
        'Design pattern recommendations',
        'Performance and scalability planning',
        'Technical documentation creation'
      ],
      'dev': [
        'Code implementation and review',
        'Debugging and troubleshooting',
        'API design and development',
        'Database design and optimization',
        'Testing and quality assurance'
      ],
      'qa': [
        'Test strategy development',
        'Test case design and execution',
        'Automated testing implementation',
        'Quality metrics and reporting',
        'Defect tracking and resolution'
      ]
    };
    
    return capabilityMap[id] || [
      'General development assistance',
      'Code review and feedback',
      'Best practices guidance',
      'Problem-solving support'
    ];
  }

  getAgentContextRequirements(agentId) {
    const contextMap = {
      'pm': [
        'Product requirements and specifications',
        'Market research and competitive analysis',
        'Stakeholder feedback and priorities',
        'Business objectives and constraints'
      ],
      'architect': [
        'System requirements and constraints',
        'Technology stack and infrastructure',
        'Performance and scalability requirements',
        'Integration points and dependencies'
      ],
      'dev': [
        'Current codebase and file context',
        'Build errors and terminal output',
        'Git changes and recent modifications',
        'Project structure and dependencies'
      ],
      'qa': [
        'Test requirements and acceptance criteria',
        'Application functionality and features',
        'Bug reports and defect tracking',
        'Testing environment and data'
      ]
    };
    
    return contextMap[agentId] || [
      'Project context and requirements',
      'Current file and codebase state',
      'Recent changes and modifications',
      'Build status and error messages'
    ];
  }

  formatDependencies(dependencies) {
    if (!dependencies || typeof dependencies !== 'object') {
      return '- No specific dependencies defined';
    }

    let formatted = '';
    
    for (const [type, deps] of Object.entries(dependencies)) {
      if (Array.isArray(deps) && deps.length > 0) {
        formatted += `**${type.charAt(0).toUpperCase() + type.slice(1)}**:\n`;
        formatted += deps.map(dep => `- ${dep}`).join('\n') + '\n';
      }
    }
    
    return formatted || '- No specific dependencies defined';
  }

  getExpansionPackDomainInfo(expansionPack) {
    const infoMap = {
      'bmad-2d-phaser-game-dev': {
        displayName: 'Phaser.js 2D Game Development',
        domain: 'game development',
        description: 'Specialized guidance for 2D game development using Phaser.js framework',
        technologies: [
          'Phaser.js game framework',
          'JavaScript/TypeScript for game logic',
          'HTML5 Canvas and WebGL rendering',
          'Web Audio API for sound',
          'Node.js for development tooling'
        ],
        patterns: [
          'Scene-based game architecture',
          'Component-entity systems',
          'State machines for game logic',
          'Object pooling for performance',
          'Event-driven system communication'
        ],
        qualityStandards: [
          'Consistent frame rate performance',
          'Memory-efficient asset management',
          'Cross-browser compatibility',
          'Responsive design for multiple screen sizes',
          'Accessible game controls and interfaces'
        ],
        bestPractices: [
          'Modular game code organization',
          'Asset optimization and loading strategies',
          'Performance profiling and optimization',
          'Game state persistence and save systems',
          'User experience and game feel considerations'
        ],
        tools: [
          'Phaser.js development tools',
          'Texture atlas generators',
          'Audio editing and compression tools',
          'Browser developer tools for debugging',
          'Performance monitoring and profiling'
        ]
      },
      'bmad-2d-unity-game-dev': {
        displayName: 'Unity 2D Game Development',
        domain: 'game development',
        description: 'Specialized guidance for 2D game development using Unity engine',
        technologies: [
          'Unity 2D engine and tools',
          'C# programming language',
          'Unity Physics2D system',
          'Unity Animation system',
          'Unity Asset Pipeline'
        ],
        patterns: [
          'MonoBehaviour component architecture',
          'ScriptableObject data systems',
          'Unity Event system patterns',
          'Coroutine-based async operations',
          'Prefab composition patterns'
        ],
        qualityStandards: [
          'Consistent performance across target platforms',
          'Efficient memory usage and garbage collection',
          'Proper asset organization and naming',
          'Code maintainability and modularity',
          'Platform-specific optimization'
        ],
        bestPractices: [
          'Unity project structure organization',
          'Component-based architecture design',
          'Asset workflow and pipeline optimization',
          'Performance profiling and optimization',
          'Version control best practices for Unity'
        ],
        tools: [
          'Unity Editor and built-in tools',
          'Unity Profiler for performance analysis',
          'Unity Package Manager',
          'Version control systems (Git with LFS)',
          'Third-party Unity extensions and tools'
        ]
      },
      'bmad-infrastructure-devops': {
        displayName: 'Infrastructure and DevOps',
        domain: 'infrastructure',
        description: 'Specialized guidance for infrastructure automation and DevOps practices',
        technologies: [
          'Infrastructure as Code (Terraform, CloudFormation)',
          'Container technologies (Docker, Kubernetes)',
          'CI/CD platforms (GitHub Actions, GitLab CI)',
          'Cloud platforms (AWS, Azure, GCP)',
          'Monitoring and observability tools'
        ],
        patterns: [
          'Infrastructure as Code patterns',
          'GitOps deployment workflows',
          'Microservices architecture',
          'Event-driven architectures',
          'Immutable infrastructure patterns'
        ],
        qualityStandards: [
          'Infrastructure reliability and availability',
          'Security and compliance requirements',
          'Cost optimization and resource efficiency',
          'Scalability and performance standards',
          'Disaster recovery and backup strategies'
        ],
        bestPractices: [
          'Version-controlled infrastructure definitions',
          'Automated testing of infrastructure changes',
          'Progressive deployment strategies',
          'Comprehensive monitoring and alerting',
          'Security scanning and vulnerability management'
        ],
        tools: [
          'Infrastructure provisioning tools',
          'Container orchestration platforms',
          'CI/CD pipeline tools',
          'Monitoring and logging solutions',
          'Security scanning and compliance tools'
        ]
      }
    };
    
    return infoMap[expansionPack] || {
      displayName: expansionPack,
      domain: 'development',
      description: `Specialized guidance for ${expansionPack} development`,
      technologies: ['Domain-specific technologies'],
      patterns: ['Domain-specific patterns'],
      qualityStandards: ['Domain-specific quality standards'],
      bestPractices: ['Domain-specific best practices'],
      tools: ['Domain-specific tools']
    };
  }
}

module.exports = SteeringSystemIntegration;