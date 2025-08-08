const path = require("path");
const fs = require("fs-extra");
const yaml = require("js-yaml");
const chalk = require("chalk");
const inquirer = require("inquirer");
const glob = require("glob");
const fileManager = require("./file-manager");
const configLoader = require("./config-loader");
const { extractYamlFromAgent } = require("../../lib/yaml-utils");
const BaseIdeSetup = require("./ide-base-setup");
const resourceLocator = require("./resource-locator");


class IdeSetup extends BaseIdeSetup {
  constructor() {
    super();
    this.ideAgentConfig = null;
  }

  async loadIdeAgentConfig() {
    if (this.ideAgentConfig) return this.ideAgentConfig;
    
    try {
      const configPath = path.join(__dirname, '..', 'config', 'ide-agent-config.yaml');
      const configContent = await fs.readFile(configPath, 'utf8');
      this.ideAgentConfig = yaml.load(configContent);
      return this.ideAgentConfig;
    } catch (error) {
      console.warn('Failed to load IDE agent configuration, using defaults');
      return {
        'roo-permissions': {},
        'cline-order': {}
      };
    }
  }

  async setup(ide, installDir, selectedAgent = null, spinner = null, preConfiguredSettings = null, config = {}) {
    const ideConfig = await configLoader.getIdeConfiguration(ide);

    if (!ideConfig) {
      console.log(chalk.yellow(`
No configuration available for ${ide}`));
      return false;
    }

    switch (ide) {
      case "cursor":
        return this.setupCursor(installDir, selectedAgent);
      case "claude-code":
        return this.setupClaudeCode(installDir, selectedAgent, config.claudeV2, config);
      case "windsurf":
        return this.setupWindsurf(installDir, selectedAgent);
      case "trae":
        return this.setupTrae(installDir, selectedAgent);
      case "roo":
        return this.setupRoo(installDir, selectedAgent);
      case "cline":
        return this.setupCline(installDir, selectedAgent);
      case "kilo":
        return this.setupKilocode(installDir, selectedAgent);
      case "gemini":
        return this.setupGeminiCli(installDir, selectedAgent);
      case "github-copilot":
        return this.setupGitHubCopilot(installDir, selectedAgent, spinner, preConfiguredSettings);
      case "qwen-code":
        return this.setupQwenCode(installDir, selectedAgent);
      default:
        console.log(chalk.yellow(`
IDE ${ide} not yet supported`));
        return false;
    }
  }

  async setupCursor(installDir, selectedAgent) {
    const cursorRulesDir = path.join(installDir, ".cursor", "rules");
    const agents = selectedAgent ? [selectedAgent] : await this.getAllAgentIds(installDir);

    await fileManager.ensureDirectory(cursorRulesDir);

    for (const agentId of agents) {
      const agentPath = await this.findAgentPath(agentId, installDir);

      if (agentPath) {
        const mdcContent = await this.createAgentRuleContent(agentId, agentPath, installDir, 'mdc');
        const mdcPath = path.join(cursorRulesDir, `${agentId}.mdc`);
        await fileManager.writeFile(mdcPath, mdcContent);
        console.log(chalk.green(`✓ Created rule: ${agentId}.mdc`));
      }
    }

    console.log(chalk.green(`\n✓ Created Cursor rules in ${cursorRulesDir}`));
    return true;
  }

  async setupClaudeCode(installDir, selectedAgent, claudeV2 = false, config = {}) {
    if (claudeV2) {
      return this.setupClaudeCodeSubAgents(installDir, selectedAgent, config);
    }

    // Setup bmad-core commands
    const coreSlashPrefix = await this.getCoreSlashPrefix(installDir);
    const coreAgents = selectedAgent ? [selectedAgent] : await this.getCoreAgentIds(installDir);
    const coreTasks = await this.getCoreTaskIds(installDir);
    await this.setupClaudeCodeForPackage(installDir, "core", coreSlashPrefix, coreAgents, coreTasks, ".bmad-core");

    // Setup expansion pack commands
    const expansionPacks = await this.getInstalledExpansionPacks(installDir);
    for (const packInfo of expansionPacks) {
      const packSlashPrefix = await this.getExpansionPackSlashPrefix(packInfo.path);
      const packAgents = await this.getExpansionPackAgents(packInfo.path);
      const packTasks = await this.getExpansionPackTasks(packInfo.path);
      
      if (packAgents.length > 0 || packTasks.length > 0) {
        // Use the actual directory name where the expansion pack is installed
        const rootPath = path.relative(installDir, packInfo.path);
        await this.setupClaudeCodeForPackage(installDir, packInfo.name, packSlashPrefix, packAgents, packTasks, rootPath);
      }
    }

    return true;
  }

  async setupClaudeCodeForPackage(installDir, packageName, slashPrefix, agentIds, taskIds, rootPath) {
    const commandsBaseDir = path.join(installDir, ".claude", "commands", slashPrefix);
    const agentsDir = path.join(commandsBaseDir, "agents");
    const tasksDir = path.join(commandsBaseDir, "tasks");

    // Ensure directories exist
    await fileManager.ensureDirectory(agentsDir);
    await fileManager.ensureDirectory(tasksDir);

    // Setup agents
    for (const agentId of agentIds) {
      // Find the agent file - for expansion packs, prefer the expansion pack version
      let agentPath;
      if (packageName !== "core") {
        // For expansion packs, first try to find the agent in the expansion pack directory
        const expansionPackPath = path.join(installDir, rootPath, "agents", `${agentId}.md`);
        if (await fileManager.pathExists(expansionPackPath)) {
          agentPath = expansionPackPath;
        } else {
          // Fall back to core if not found in expansion pack
          agentPath = await this.findAgentPath(agentId, installDir);
        }
      } else {
        // For core, use the normal search
        agentPath = await this.findAgentPath(agentId, installDir);
      }
      
      const commandPath = path.join(agentsDir, `${agentId}.md`);

      if (agentPath) {
        // Create command file with agent content
        let agentContent = await fileManager.readFile(agentPath);
        
        // Replace {root} placeholder with the appropriate root path for this context
        agentContent = agentContent.replace(/{root}/g, rootPath);

        // Add command header
        let commandContent = `# /${agentId} Command\n\n`;
        commandContent += `When this command is used, adopt the following agent persona:\n\n`;
        commandContent += agentContent;

        await fileManager.writeFile(commandPath, commandContent);
        console.log(chalk.green(`✓ Created agent command: /${agentId}`));
      }
    }

    // Setup tasks
    for (const taskId of taskIds) {
      // Find the task file - for expansion packs, prefer the expansion pack version
      let taskPath;
      if (packageName !== "core") {
        // For expansion packs, first try to find the task in the expansion pack directory
        const expansionPackPath = path.join(installDir, rootPath, "tasks", `${taskId}.md`);
        if (await fileManager.pathExists(expansionPackPath)) {
          taskPath = expansionPackPath;
        } else {
          // Fall back to core if not found in expansion pack
          taskPath = await this.findTaskPath(taskId, installDir);
        }
      } else {
        // For core, use the normal search
        taskPath = await this.findTaskPath(taskId, installDir);
      }
      
      const commandPath = path.join(tasksDir, `${taskId}.md`);

      if (taskPath) {
        // Create command file with task content
        let taskContent = await fileManager.readFile(taskPath);
        
        // Replace {root} placeholder with the appropriate root path for this context
        taskContent = taskContent.replace(/{root}/g, rootPath);

        // Add command header
        let commandContent = `# /${taskId} Task\n\n`;
        commandContent += `When this command is used, execute the following task:\n\n`;
        commandContent += taskContent;

        await fileManager.writeFile(commandPath, commandContent);
        console.log(chalk.green(`✓ Created task command: /${taskId}`));
      }
    }

    console.log(chalk.green(`\n✓ Created Claude Code commands for ${packageName} in ${commandsBaseDir}`));
    console.log(chalk.dim(`  - Agents in: ${agentsDir}`));
    console.log(chalk.dim(`  - Tasks in: ${tasksDir}`));
  }

  async getExpansionPackConfig(packPath) {
    try {
      const configPath = path.join(packPath, "config.yaml");
      if (await fileManager.pathExists(configPath)) {
        const configContent = await fileManager.readFile(configPath);
        return yaml.load(configContent);
      }
    } catch (error) {
      console.warn(`Failed to read expansion pack config from ${packPath}: ${error.message}`);
    }
    return null;
  }

  async createEnhancedSubAgent(agentId, agentContent, agentConfig, packConfig, installDir) {
    const agent = agentConfig.agent || {};
    const persona = agentConfig.persona || {};
    const corePrinciples = agentConfig.core_principles || persona.core_principles || [];
    const dependencies = agentConfig.dependencies || {};
    const commands = Array.isArray(agentConfig.commands) ? agentConfig.commands : [];
    
    // Create display name and file name based on context
    let displayName, fileName, domain = 'core';
    
    if (packConfig) {
      // For expansion pack agents, use short-title for context
      const packTitle = packConfig['short-title'] || packConfig.name || 'Unknown Pack';
      const agentTitle = agent.title || agentId;
      const agentIcon = agent.icon || '🤖';
      
      displayName = `${agentIcon} ${agentTitle} (${packTitle})`;
      fileName = `${packConfig.name}-${agentId}`;
      domain = packConfig.name;
    } else {
      // For core agents, use simpler naming
      const agentTitle = agent.title || agentId;
      const agentIcon = agent.icon || '🤖';
      
      displayName = `${agentIcon} ${agentTitle}`;
      fileName = agentId;
    }

    // Build clean frontmatter with minimal metadata
    const frontmatter = {
      name: displayName,
      description: agent.whenToUse || `Use for ${agent.title || agentId} tasks`,
      tools: this.getToolsForAgentType(agentId)
    };

    // Build optimized body content
    let body = `You are ${agent.name || agentId}, ${persona.role || 'a specialized assistant'} working within the BMad-Method framework.\n\n`;
    
    // Core identity section
    body += this.buildIdentitySection(persona);
    
    // Key principles (cleaned and limited)
    body += this.buildPrinciplesSection(corePrinciples);
    
    // BMad Resources section
    body += this.buildResourcesSection(dependencies, packConfig);
    
    // Commands section (if relevant)
    body += this.buildCommandsSection(commands);
    
    // Resource access instructions
    body += this.buildResourceAccessInstructions(installDir, packConfig);
    
    // Technology specialization for expansion packs
    if (packConfig?.technology_stack) {
      body += this.buildSpecializationSection(packConfig);
    }
    
    // Activation instruction
    body += `\nWhen activated, greet the user briefly and await their specific request.`;

    // Build the complete sub-agent content
    const yamlFrontmatter = yaml.dump(frontmatter, {
      lineWidth: -1, // Disable line wrapping
      quotingType: '"',
      forceQuotes: false
    });

    const subAgentContent = `---\n${yamlFrontmatter}---\n\n${body}`;

    return {
      content: subAgentContent,
      displayName: displayName,
      fileName: fileName
    };
  }

  inferTechnologyFromPack(packConfig) {
    // Check if expansion pack explicitly specifies technology_stack
    if (packConfig.technology_stack) {
      return packConfig.technology_stack;
    }
    
    // Fallback to general purpose if no technology_stack specified
    return 'general';
  }


  getToolsForAgentType(agentId) {
    const toolMappings = {
      'dev': ['*'],  // Full access for developers
      'architect': ['*'],  // Full access for architects
      'analyst': ['read_file', 'list_files', 'search'],  // Read-only for analysts
      'po': ['read_file', 'list_files'],  // Limited read for product owners
      'pm': ['read_file', 'list_files'],  // Limited read for project managers
      'qa': ['read_file', 'run_command', 'search'],  // Read + test execution for QA
      'ux': ['read_file', 'list_files', 'search'],  // Read-only for UX experts
      'sm': ['read_file', 'write_file', 'list_files'],  // Read/write for scrum masters
    };
    
    // Check if agent ID contains any key
    for (const [key, tools] of Object.entries(toolMappings)) {
      if (agentId.includes(key)) return tools;
    }
    
    return ['*'];  // Default to full access
  }

  buildIdentitySection(persona) {
    if (!persona || (!persona.style && !persona.identity && !persona.focus)) {
      return '';
    }
    
    let section = '## Core Identity\n';
    if (persona.style) section += `- **Style**: ${persona.style}\n`;
    if (persona.identity) section += `- **Identity**: ${persona.identity}\n`;
    if (persona.focus) section += `- **Focus**: ${persona.focus}\n`;
    section += '\n';
    
    return section;
  }

  buildPrinciplesSection(corePrinciples) {
    if (!corePrinciples || corePrinciples.length === 0) {
      return '';
    }
    
    let section = '## Key Principles\n';
    
    // Take up to 5 most relevant principles and clean them
    const cleanedPrinciples = corePrinciples
      .slice(0, 5)
      .map(principle => this.cleanPrinciple(principle))
      .filter(principle => principle.length > 0);
    
    cleanedPrinciples.forEach((principle, i) => {
      section += `${i + 1}. ${principle}\n`;
    });
    
    section += '\n';
    return section;
  }

  cleanPrinciple(principle) {
    if (typeof principle !== 'string') return '';
    
    // Remove CRITICAL:, MANDATORY:, IMPORTANT: prefixes
    let cleaned = principle.replace(/^(CRITICAL|MANDATORY|IMPORTANT):\s*/i, '');
    
    // Remove BMad-specific file references
    cleaned = cleaned.replace(/\{root\}\/[^\s]+/g, '');
    
    // Remove overly specific BMad terminology
    cleaned = cleaned.replace(/story file|Dev Agent Record|BMad-specific|startup commands/gi, '');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Truncate overly long principles
    if (cleaned.length > 120) {
      cleaned = cleaned.substring(0, 117) + '...';
    }
    
    return cleaned;
  }

  buildResourcesSection(dependencies, packConfig) {
    if (!dependencies || Object.keys(dependencies).length === 0) {
      return '';
    }
    
    let section = '## BMad Resources Available\n\n';
    section += 'When users request specific tasks or documentation, you have access to these BMad resources:\n\n';
    
    // Tasks
    if (dependencies.tasks && dependencies.tasks.length > 0) {
      section += '### Tasks\n';
      dependencies.tasks.forEach(task => {
        const taskDesc = this.getResourceDescription(task, 'task');
        section += `- \`${task}\` - ${taskDesc}\n`;
      });
      section += '\n';
    }
    
    // Templates
    if (dependencies.templates && dependencies.templates.length > 0) {
      section += '### Templates\n';
      section += 'Available for document generation (use with create-doc task)\n';
      dependencies.templates.forEach(template => {
        const templateDesc = this.getResourceDescription(template, 'template');
        section += `- \`${template}\` - ${templateDesc}\n`;
      });
      section += '\n';
    }
    
    // Checklists
    if (dependencies.checklists && dependencies.checklists.length > 0) {
      section += '### Checklists\n';
      dependencies.checklists.forEach(checklist => {
        const checklistDesc = this.getResourceDescription(checklist, 'checklist');
        section += `- \`${checklist}\` - ${checklistDesc}\n`;
      });
      section += '\n';
    }
    
    // Data
    if (dependencies.data && dependencies.data.length > 0) {
      section += '### Data\n';
      section += 'Project-specific knowledge bases and preferences\n';
      dependencies.data.forEach(data => {
        section += `- \`${data}\`\n`;
      });
      section += '\n';
    }
    
    return section;
  }

  getResourceDescription(resourceName, resourceType) {
    // Extract human-readable description from resource name
    const baseName = resourceName.replace(/\.(md|yaml|yml)$/, '');
    
    const descriptions = {
      // Common tasks
      'execute-checklist': 'Run quality assurance checklists',
      'create-doc': 'Create documents from templates',
      'validate-next-story': 'Validate story readiness for development',
      'create-deep-research-prompt': 'Generate research prompts',
      'document-project': 'Document project structure and decisions',
      'shard-doc': 'Split large documents for processing',
      'create-next-story': 'Create development stories',
      'create-game-story': 'Create game development stories',
      'advanced-elicitation': 'Advanced requirements gathering',
      'game-design-brainstorming': 'Brainstorm game design ideas',
      
      // Common templates
      'prd-tmpl': 'Product Requirements Document',
      'architecture-tmpl': 'Technical Architecture Document',
      'story-tmpl': 'Development Story',
      'front-end-architecture-tmpl': 'Frontend Architecture Document',
      'fullstack-architecture-tmpl': 'Full-Stack Architecture Document',
      'brownfield-architecture-tmpl': 'Brownfield Project Architecture',
      'game-architecture-tmpl': 'Game Architecture Document',
      'game-design-doc-tmpl': 'Game Design Document',
      'infrastructure-architecture-tmpl': 'Infrastructure Architecture',
      
      // Common checklists
      'story-dod-checklist': 'Story Definition of Done',
      'architect-checklist': 'Architecture Review Checklist',
      'game-story-dod-checklist': 'Game Story Definition of Done',
      'infrastructure-checklist': 'Infrastructure Review Checklist'
    };
    
    return descriptions[baseName] || this.humanizeResourceName(baseName);
  }

  humanizeResourceName(name) {
    // Convert kebab-case to human readable
    return name
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/Tmpl$/, 'Template')
      .replace(/Dod/, 'DOD');
  }

  buildCommandsSection(commands) {
    if (!commands || commands.length === 0) {
      return '';
    }
    
    // Filter out BMad-specific commands
    const relevantCommands = commands.filter(cmd => {
      const cmdString = typeof cmd === 'string' ? cmd : Object.keys(cmd)[0];
      return !['help', 'exit', 'yolo'].includes(cmdString);
    });
    
    if (relevantCommands.length === 0) {
      return '';
    }
    
    let section = '## Key Commands\n';
    relevantCommands.slice(0, 5).forEach(cmd => {
      if (typeof cmd === 'string') {
        section += `- ${cmd}\n`;
      } else {
        const cmdName = Object.keys(cmd)[0];
        const cmdDesc = cmd[cmdName];
        section += `- **${cmdName}**: ${cmdDesc}\n`;
      }
    });
    section += '\n';
    
    return section;
  }

  buildResourceAccessInstructions(installDir, packConfig) {
    let section = '## Accessing Resources\n\n';
    section += 'To use these resources:\n';
    section += '1. When user requests a task, locate it in the project\'s bmad directories\n';
    section += '2. Follow the task instructions exactly as written\n';
    section += '3. For templates, use with the create-doc workflow\n';
    section += '4. Reference checklists during quality validation\n\n';
    
    section += 'Your project\'s BMad resources are located in:\n';
    section += '- Core: `.bmad-core/`\n';
    
    if (packConfig) {
      section += `- ${packConfig['short-title'] || packConfig.name}: \`.${packConfig.name}/\`\n`;
    }
    
    section += '\n';
    return section;
  }

  buildSpecializationSection(packConfig) {
    let section = '## Specialization\n';
    
    const techContexts = {
      'phaser': `- Phaser 3 framework expertise
- TypeScript game development
- WebGL and Canvas rendering optimization
- Game physics and collision systems
- Cross-platform game deployment`,
      
      'unity': `- Unity 2D game development
- C# scripting and optimization
- Unity component architecture
- Cross-platform deployment
- Unity-specific patterns and practices`,
      
      'infrastructure': `- Infrastructure as Code
- Cloud platform architecture
- DevOps best practices
- Security and compliance
- Monitoring and observability`,
      
      'general': `- Full-stack development
- Modern web technologies
- Best practices and patterns
- Cross-platform solutions`
    };
    
    const techStack = packConfig.technology_stack || 'general';
    section += techContexts[techStack] || techContexts.general;
    section += '\n\n';
    
    return section;
  }

  async setupClaudeCodeSubAgents(installDir, selectedAgent, config) {
    const agentsDir = path.join(installDir, ".claude", "agents");
    await fileManager.ensureDirectory(agentsDir);

    // Only install core agents if not expansion-only
    if (config.installType !== 'expansion-only') {
        const coreAgents = selectedAgent ? [selectedAgent] : await this.getCoreAgentIds(installDir);
        for (const agentId of coreAgents) {
            const agentPath = await this.findAgentPath(agentId, installDir);
            if (agentPath) {
                const agentContent = await fileManager.readFile(agentPath);
                const yamlContent = extractYamlFromAgent(agentContent);
                if (yamlContent) {
                    const agentConfig = yaml.load(yamlContent);
                    const subAgentData = await this.createEnhancedSubAgent(
                        agentId, 
                        agentContent, 
                        agentConfig, 
                        null, // no expansion pack for core agents
                        installDir
                    );
                    const subAgentPath = path.join(agentsDir, `${subAgentData.fileName}.md`);
                    await fileManager.writeFile(subAgentPath, subAgentData.content);
                    console.log(chalk.green(`✓ Created sub-agent: ${subAgentData.displayName}`));
                }
            }
        }
    }

    // Install expansion pack agents if they were selected
    if (config.expansionPacks && config.expansionPacks.length > 0) {
        const expansionPacks = await this.getInstalledExpansionPacks(installDir);
        for (const packInfo of expansionPacks) {
            // Only install if this pack was selected
            if (config.expansionPacks.includes(packInfo.name)) {
                const packConfig = await this.getExpansionPackConfig(packInfo.path);
                const packAgents = await this.getExpansionPackAgents(packInfo.path);
                for (const agentId of packAgents) {
                    const agentPath = path.join(packInfo.path, "agents", `${agentId}.md`);
                    if (await fileManager.pathExists(agentPath)) {
                        const agentContent = await fileManager.readFile(agentPath);
                        const yamlContent = extractYamlFromAgent(agentContent);
                        if (yamlContent) {
                            const agentConfig = yaml.load(yamlContent);
                            const subAgentData = await this.createEnhancedSubAgent(
                                agentId, 
                                agentContent, 
                                agentConfig, 
                                packConfig,
                                installDir
                            );
                            const subAgentPath = path.join(agentsDir, `${subAgentData.fileName}.md`);
                            await fileManager.writeFile(subAgentPath, subAgentData.content);
                            console.log(chalk.green(`✓ Created sub-agent: ${subAgentData.displayName}`));
                        }
                    }
                }
            }
        }
    }

    console.log(chalk.green(`\n✓ Created Claude Code sub-agents in ${agentsDir}`));
    return true;
  }

  async setupWindsurf(installDir, selectedAgent) {
    const windsurfRulesDir = path.join(installDir, ".windsurf", "rules");
    const agents = selectedAgent ? [selectedAgent] : await this.getAllAgentIds(installDir);

    await fileManager.ensureDirectory(windsurfRulesDir);

    for (const agentId of agents) {
      // Find the agent file
      const agentPath = await this.findAgentPath(agentId, installDir);

      if (agentPath) {
        const agentContent = await fileManager.readFile(agentPath);
        const mdPath = path.join(windsurfRulesDir, `${agentId}.md`);

        // Create MD content (similar to Cursor but without frontmatter)
        let mdContent = `# ${agentId.toUpperCase()} Agent Rule\n\n`;
        mdContent += `This rule is triggered when the user types \`@${agentId}\` and activates the ${await this.getAgentTitle(
          agentId,
          installDir
        )} agent persona.\n\n`;
        mdContent += "## Agent Activation\n\n";
        mdContent +=
          "CRITICAL: Read the full YAML, start activation to alter your state of being, follow startup section instructions, stay in this being until told to exit this mode:\n\n";
        mdContent += "```yaml\n";
        // Extract just the YAML content from the agent file
        const yamlContent = extractYamlFromAgent(agentContent);
        if (yamlContent) {
          mdContent += yamlContent;
        } else {
          // If no YAML found, include the whole content minus the header
          mdContent += agentContent.replace(/^#.*$/m, "").trim();
        }
        mdContent += "\n```\n\n";
        mdContent += "## File Reference\n\n";
        const relativePath = path.relative(installDir, agentPath).replace(/\\/g, '/');
        mdContent += `The complete agent definition is available in [${relativePath}](${relativePath}).\n\n`;
        mdContent += "## Usage\n\n";
        mdContent += `When the user types \`@${agentId}\`, activate this ${await this.getAgentTitle(
          agentId,
          installDir
        )} persona and follow all instructions defined in the YAML configuration above.\n`;

        await fileManager.writeFile(mdPath, mdContent);
        console.log(chalk.green(`✓ Created rule: ${agentId}.md`));
      }
    }

    console.log(chalk.green(`\n✓ Created Windsurf rules in ${windsurfRulesDir}`));

    return true;
  }

  async setupTrae(installDir, selectedAgent) {
    const traeRulesDir = path.join(installDir, ".trae", "rules");
    const agents = selectedAgent? [selectedAgent] : await this.getAllAgentIds(installDir);
    
    await fileManager.ensureDirectory(traeRulesDir);
    
    for (const agentId of agents) {
      // Find the agent file
      const agentPath = await this.findAgentPath(agentId, installDir);
      
      if (agentPath) {
        const agentContent = await fileManager.readFile(agentPath);
        const mdPath = path.join(traeRulesDir, `${agentId}.md`);
        
        // Create MD content (similar to Cursor but without frontmatter)
        let mdContent = `# ${agentId.toUpperCase()} Agent Rule\n\n`;
        mdContent += `This rule is triggered when the user types \`@${agentId}\` and activates the ${await this.getAgentTitle(
          agentId,
          installDir
        )} agent persona.\n\n`;
        mdContent += "## Agent Activation\n\n";
        mdContent +=
          "CRITICAL: Read the full YAML, start activation to alter your state of being, follow startup section instructions, stay in this being until told to exit this mode:\n\n";
        mdContent += "```yaml\n";
        // Extract just the YAML content from the agent file
        const yamlContent = extractYamlFromAgent(agentContent);
        if (yamlContent) {
          mdContent += yamlContent;
        }
        else {
          // If no YAML found, include the whole content minus the header
          mdContent += agentContent.replace(/^#.*$/m, "").trim();
        }
        mdContent += "\n```\n\n";
        mdContent += "## File Reference\n\n";
        const relativePath = path.relative(installDir, agentPath).replace(/\\/g, '/');
        mdContent += `The complete agent definition is available in [${relativePath}](${relativePath}).\n\n`;
        mdContent += "## Usage\n\n";
        mdContent += `When the user types \`@${agentId}\`, activate this ${await this.getAgentTitle(
          agentId,
          installDir
        )} persona and follow all instructions defined in the YAML configuration above.\n`;
        
        await fileManager.writeFile(mdPath, mdContent);
        console.log(chalk.green(`✓ Created rule: ${agentId}.md`));
      }
    }
  }

  async findAgentPath(agentId, installDir) {
    // Try to find the agent file in various locations
    const possiblePaths = [
      path.join(installDir, ".bmad-core", "agents", `${agentId}.md`),
      path.join(installDir, "agents", `${agentId}.md`)
    ];
    
    // Also check expansion pack directories
    
    const expansionDirs = glob.sync(".*/agents", { cwd: installDir });
    for (const expDir of expansionDirs) {
      possiblePaths.push(path.join(installDir, expDir, `${agentId}.md`));
    }
    
    for (const agentPath of possiblePaths) {
      if (await fileManager.pathExists(agentPath)) {
        return agentPath;
      }
    }
    
    return null;
  }

  async getAllAgentIds(installDir) {
    
    const allAgentIds = [];
    
    // Check core agents in .bmad-core or root
    let agentsDir = path.join(installDir, ".bmad-core", "agents");
    if (!(await fileManager.pathExists(agentsDir))) {
      agentsDir = path.join(installDir, "agents");
    }
    
    if (await fileManager.pathExists(agentsDir)) {
      const agentFiles = glob.sync("*.md", { cwd: agentsDir });
      allAgentIds.push(...agentFiles.map((file) => path.basename(file, ".md")));
    }
    
    // Also check for expansion pack agents in dot folders
    const expansionDirs = glob.sync(".*/agents", { cwd: installDir });
    for (const expDir of expansionDirs) {
      const fullExpDir = path.join(installDir, expDir);
      const expAgentFiles = glob.sync("*.md", { cwd: fullExpDir });
      allAgentIds.push(...expAgentFiles.map((file) => path.basename(file, ".md")));
    }
    
    // Remove duplicates
    return [...new Set(allAgentIds)];
  }

  async getCoreAgentIds(installDir) {
    const allAgentIds = [];
    
    // Check core agents in .bmad-core or root only
    let agentsDir = path.join(installDir, ".bmad-core", "agents");
    if (!(await fileManager.pathExists(agentsDir))) {
      agentsDir = path.join(installDir, "bmad-core", "agents");
    }
    
    if (await fileManager.pathExists(agentsDir)) {
      
      const agentFiles = glob.sync("*.md", { cwd: agentsDir });
      allAgentIds.push(...agentFiles.map((file) => path.basename(file, ".md")));
    }
    
    return [...new Set(allAgentIds)];
  }

  async getCoreTaskIds(installDir) {
    const allTaskIds = [];
    
    // Check core tasks in .bmad-core or root only
    let tasksDir = path.join(installDir, ".bmad-core", "tasks");
    if (!(await fileManager.pathExists(tasksDir))) {
      tasksDir = path.join(installDir, "bmad-core", "tasks");
    }
    
    if (await fileManager.pathExists(tasksDir)) {
      
      const taskFiles = glob.sync("*.md", { cwd: tasksDir });
      allTaskIds.push(...taskFiles.map((file) => path.basename(file, ".md")));
    }
    
    // Check common tasks
    const commonTasksDir = path.join(installDir, "common", "tasks");
    if (await fileManager.pathExists(commonTasksDir)) {
      const commonTaskFiles = glob.sync("*.md", { cwd: commonTasksDir });
      allTaskIds.push(...commonTaskFiles.map((file) => path.basename(file, ".md")));
    }
    
    return [...new Set(allTaskIds)];
  }

  async getAgentTitle(agentId, installDir) {
    // Try to find the agent file in various locations
    const possiblePaths = [
      path.join(installDir, ".bmad-core", "agents", `${agentId}.md`),
      path.join(installDir, "agents", `${agentId}.md`)
    ];
    
    // Also check expansion pack directories
    
    const expansionDirs = glob.sync(".*/agents", { cwd: installDir });
    for (const expDir of expansionDirs) {
      possiblePaths.push(path.join(installDir, expDir, `${agentId}.md`));
    }
    
    for (const agentPath of possiblePaths) {
      if (await fileManager.pathExists(agentPath)) {
        try {
          const agentContent = await fileManager.readFile(agentPath);
          const yamlMatch = agentContent.match(/```ya?ml\r?\n([\s\S]*?)```/);
          
          if (yamlMatch) {
            const yaml = yamlMatch[1];
            const titleMatch = yaml.match(/title:\s*(.+)/);
            if (titleMatch) {
              return titleMatch[1].trim();
            }
          }
        } catch (error) {
          console.warn(`Failed to read agent title for ${agentId}: ${error.message}`);
        }
      }
    }
    
    // Fallback to formatted agent ID
    return agentId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  async getAllTaskIds(installDir) {
    
    const allTaskIds = [];
    
    // Check core tasks in .bmad-core or root
    let tasksDir = path.join(installDir, ".bmad-core", "tasks");
    if (!(await fileManager.pathExists(tasksDir))) {
      tasksDir = path.join(installDir, "bmad-core", "tasks");
    }
    
    if (await fileManager.pathExists(tasksDir)) {
      const taskFiles = glob.sync("*.md", { cwd: tasksDir });
      allTaskIds.push(...taskFiles.map((file) => path.basename(file, ".md")));
    }
    
    // Check common tasks
    const commonTasksDir = path.join(installDir, "common", "tasks");
    if (await fileManager.pathExists(commonTasksDir)) {
      const commonTaskFiles = glob.sync("*.md", { cwd: commonTasksDir });
      allTaskIds.push(...commonTaskFiles.map((file) => path.basename(file, ".md")));
    }
    
    // Also check for expansion pack tasks in dot folders
    const expansionDirs = glob.sync(".*/tasks", { cwd: installDir });
    for (const expDir of expansionDirs) {
      const fullExpDir = path.join(installDir, expDir);
      const expTaskFiles = glob.sync("*.md", { cwd: fullExpDir });
      allTaskIds.push(...expTaskFiles.map((file) => path.basename(file, ".md")));
    }
    
    // Check expansion-packs folder tasks
    const expansionPacksDir = path.join(installDir, "expansion-packs");
    if (await fileManager.pathExists(expansionPacksDir)) {
      const expPackDirs = glob.sync("*/tasks", { cwd: expansionPacksDir });
      for (const expDir of expPackDirs) {
        const fullExpDir = path.join(expansionPacksDir, expDir);
        const expTaskFiles = glob.sync("*.md", { cwd: fullExpDir });
        allTaskIds.push(...expTaskFiles.map((file) => path.basename(file, ".md")));
      }
    }
    
    // Remove duplicates
    return [...new Set(allTaskIds)];
  }

  async findTaskPath(taskId, installDir) {
    // Try to find the task file in various locations
    const possiblePaths = [
      path.join(installDir, ".bmad-core", "tasks", `${taskId}.md`),
      path.join(installDir, "bmad-core", "tasks", `${taskId}.md`),
      path.join(installDir, "common", "tasks", `${taskId}.md`)
    ];
    
    // Also check expansion pack directories
    
    
    // Check dot folder expansion packs
    const expansionDirs = glob.sync(".*/tasks", { cwd: installDir });
    for (const expDir of expansionDirs) {
      possiblePaths.push(path.join(installDir, expDir, `${taskId}.md`));
    }
    
    // Check expansion-packs folder
    const expansionPacksDir = path.join(installDir, "expansion-packs");
    if (await fileManager.pathExists(expansionPacksDir)) {
      const expPackDirs = glob.sync("*/tasks", { cwd: expansionPacksDir });
      for (const expDir of expPackDirs) {
        possiblePaths.push(path.join(expansionPacksDir, expDir, `${taskId}.md`));
      }
    }
    
    for (const taskPath of possiblePaths) {
      if (await fileManager.pathExists(taskPath)) {
        return taskPath;
      }
    }
    
    return null;
  }

  async getCoreSlashPrefix(installDir) {
    try {
      const coreConfigPath = path.join(installDir, ".bmad-core", "core-config.yaml");
      if (!(await fileManager.pathExists(coreConfigPath))) {
        // Try bmad-core directory
        const altConfigPath = path.join(installDir, "bmad-core", "core-config.yaml");
        if (await fileManager.pathExists(altConfigPath)) {
          const configContent = await fileManager.readFile(altConfigPath);
          const config = yaml.load(configContent);
          return config.slashPrefix || "BMad";
        }
        return "BMad"; // fallback
      }
      
      const configContent = await fileManager.readFile(coreConfigPath);
      const config = yaml.load(configContent);
      return config.slashPrefix || "BMad";
    } catch (error) {
      console.warn(`Failed to read core slashPrefix, using default 'BMad': ${error.message}`);
      return "BMad";
    }
  }

  async getInstalledExpansionPacks(installDir) {
    const expansionPacks = [];
    
    // Check for dot-prefixed expansion packs in install directory
    
    const dotExpansions = glob.sync(".bmad-*", { cwd: installDir });
    
    for (const dotExpansion of dotExpansions) {
      if (dotExpansion !== ".bmad-core") {
        const packPath = path.join(installDir, dotExpansion);
        const packName = dotExpansion.substring(1); // remove the dot
        expansionPacks.push({
          name: packName,
          path: packPath
        });
      }
    }
    
    // Check for expansion-packs directory style
    const expansionPacksDir = path.join(installDir, "expansion-packs");
    if (await fileManager.pathExists(expansionPacksDir)) {
      const packDirs = glob.sync("*", { cwd: expansionPacksDir });
      
      for (const packDir of packDirs) {
        const packPath = path.join(expansionPacksDir, packDir);
        if ((await fileManager.pathExists(packPath)) && 
            (await fileManager.pathExists(path.join(packPath, "config.yaml")))) {
          expansionPacks.push({
            name: packDir,
            path: packPath
          });
        }
      }
    }
    
    return expansionPacks;
  }

  async getExpansionPackSlashPrefix(packPath) {
    try {
      const configPath = path.join(packPath, "config.yaml");
      if (await fileManager.pathExists(configPath)) {
        const configContent = await fileManager.readFile(configPath);
        const config = yaml.load(configContent);
        return config.slashPrefix || path.basename(packPath);
      }
    } catch (error) {
      console.warn(`Failed to read expansion pack slashPrefix from ${packPath}: ${error.message}`);
    }
    
    return path.basename(packPath); // fallback to directory name
  }

  async getExpansionPackAgents(packPath) {
    const agentsDir = path.join(packPath, "agents");
    if (!(await fileManager.pathExists(agentsDir))) {
      return [];
    }
    
    try {
      
      const agentFiles = glob.sync("*.md", { cwd: agentsDir });
      return agentFiles.map(file => path.basename(file, ".md"));
    } catch (error) {
      console.warn(`Failed to read expansion pack agents from ${packPath}: ${error.message}`);
      return [];
    }
  }

  async getExpansionPackTasks(packPath) {
    const tasksDir = path.join(packPath, "tasks");
    if (!(await fileManager.pathExists(tasksDir))) {
      return [];
    }
    
    try {
      
      const taskFiles = glob.sync("*.md", { cwd: tasksDir });
      return taskFiles.map(file => path.basename(file, ".md"));
    } catch (error) {
      console.warn(`Failed to read expansion pack tasks from ${packPath}: ${error.message}`);
      return [];
    }
  }

  async setupRoo(installDir, selectedAgent) {
    const agents = selectedAgent ? [selectedAgent] : await this.getAllAgentIds(installDir);

    // Check for existing .roomodes file in project root
    const roomodesPath = path.join(installDir, ".roomodes");
    let existingModes = [];
    let existingContent = "";

    if (await fileManager.pathExists(roomodesPath)) {
      existingContent = await fileManager.readFile(roomodesPath);
      // Parse existing modes to avoid duplicates
      const modeMatches = existingContent.matchAll(/- slug: ([\w-]+)/g);
      for (const match of modeMatches) {
        existingModes.push(match[1]);
      }
      console.log(chalk.yellow(`Found existing .roomodes file with ${existingModes.length} modes`));
    }

    // Create new modes content
    let newModesContent = "";

    // Load dynamic agent permissions from configuration
    const config = await this.loadIdeAgentConfig();
    const agentPermissions = config['roo-permissions'] || {};

    for (const agentId of agents) {
      // Skip if already exists
      // Check both with and without bmad- prefix to handle both cases
      const checkSlug = agentId.startsWith('bmad-') ? agentId : `bmad-${agentId}`;
      if (existingModes.includes(checkSlug)) {
        console.log(chalk.dim(`Skipping ${agentId} - already exists in .roomodes`));
        continue;
      }

      // Read agent file to extract all information
      const agentPath = await this.findAgentPath(agentId, installDir);

      if (agentPath) {
        const agentContent = await fileManager.readFile(agentPath);

        // Extract YAML content
        const yamlMatch = agentContent.match(/```ya?ml\r?\n([\s\S]*?)```/);
        if (yamlMatch) {
          const yaml = yamlMatch[1];

          // Extract agent info from YAML
          const titleMatch = yaml.match(/title:\s*(.+)/);
          const iconMatch = yaml.match(/icon:\s*(.+)/);
          const whenToUseMatch = yaml.match(/whenToUse:\s*"(.+)"/);
          const roleDefinitionMatch = yaml.match(/roleDefinition:\s*"(.+)"/);

          const title = titleMatch ? titleMatch[1].trim() : await this.getAgentTitle(agentId, installDir);
          const icon = iconMatch ? iconMatch[1].trim() : "🤖";
          const whenToUse = whenToUseMatch ? whenToUseMatch[1].trim() : `Use for ${title} tasks`;
          const roleDefinition = roleDefinitionMatch
            ? roleDefinitionMatch[1].trim()
            : `You are a ${title} specializing in ${title.toLowerCase()} tasks and responsibilities.`;


          // Add permissions based on agent type
          const permissions = agentPermissions[agentId];
          // Build mode entry with proper formatting (matching exact indentation)
          // Avoid double "bmad-" prefix for agents that already have it
          const slug = agentId.startsWith('bmad-') ? agentId : `bmad-${agentId}`;
          newModesContent += ` - slug: ${slug}\n`;
          newModesContent += `   name: '${icon} ${title}'\n`;
          if (permissions) {
          newModesContent += `   description: '${permissions.description}'\n`; 
          }
          newModesContent += `   roleDefinition: ${roleDefinition}\n`;
          newModesContent += `   whenToUse: ${whenToUse}\n`;
          // Get relative path from installDir to agent file
          const relativePath = path.relative(installDir, agentPath).replace(/\\/g, '/');
          newModesContent += `   customInstructions: CRITICAL Read the full YAML from ${relativePath} start activation to alter your state of being follow startup section instructions stay in this being until told to exit this mode\n`;
          newModesContent += `   groups:\n`;
          newModesContent += `    - read\n`;

          if (permissions) {
            newModesContent += `    - - edit\n`;
            newModesContent += `      - fileRegex: ${permissions.fileRegex}\n`;
            newModesContent += `        description: ${permissions.description}\n`;
          } else {
            newModesContent += `    - edit\n`;
          }

          console.log(chalk.green(`✓ Added mode: bmad-${agentId} (${icon} ${title})`));
        }
      }
    }

    // Build final roomodes content
    let roomodesContent = "";
    if (existingContent) {
      // If there's existing content, append new modes to it
      roomodesContent = existingContent.trim() + "\n" + newModesContent;
    } else {
      // Create new .roomodes file with proper YAML structure
      roomodesContent = "customModes:\n" + newModesContent;
    }

    // Write .roomodes file
    await fileManager.writeFile(roomodesPath, roomodesContent);
    console.log(chalk.green("✓ Created .roomodes file in project root"));

    console.log(chalk.green(`\n✓ Roo Code setup complete!`));
    console.log(chalk.dim("Custom modes will be available when you open this project in Roo Code"));

    return true;
  }
  
  async setupKilocode(installDir, selectedAgent) {
    const filePath = path.join(installDir, ".kilocodemodes");
    const agents = selectedAgent ? [selectedAgent] : await this.getAllAgentIds(installDir);

    let existingModes = [], existingContent = "";
    if (await fileManager.pathExists(filePath)) {
      existingContent = await fileManager.readFile(filePath);
      for (const match of existingContent.matchAll(/- slug: ([\w-]+)/g)) {
        existingModes.push(match[1]);
      }
      console.log(chalk.yellow(`Found existing .kilocodemodes file with ${existingModes.length} modes`));
    }

    const config = await this.loadIdeAgentConfig();
    const permissions = config['roo-permissions'] || {}; // reuse same roo permissions block (Kilo Code understands same mode schema)

    let newContent = "";

    for (const agentId of agents) {
      const slug = agentId.startsWith('bmad-') ? agentId : `bmad-${agentId}`;
      if (existingModes.includes(slug)) {
        console.log(chalk.dim(`Skipping ${agentId} - already exists in .kilocodemodes`));
        continue;
      }

      const agentPath = await this.findAgentPath(agentId, installDir);
      if (!agentPath) {
        console.log(chalk.red(`✗ Could not find agent file for ${agentId}`));
        continue;
      }

      const agentContent = await fileManager.readFile(agentPath);
      const yamlMatch = agentContent.match(/```ya?ml\r?\n([\s\S]*?)```/);
      if (!yamlMatch) {
        console.log(chalk.red(`✗ Could not extract YAML block for ${agentId}`));
        continue;
      }

      const yaml = yamlMatch[1];

      // Robust fallback for title and icon
      const title = (yaml.match(/title:\s*(.+)/)?.[1]?.trim()) || await this.getAgentTitle(agentId, installDir);
      const icon = (yaml.match(/icon:\s*(.+)/)?.[1]?.trim()) || '🤖';
      const whenToUse = (yaml.match(/whenToUse:\s*"(.+)"/)?.[1]?.trim()) || `Use for ${title} tasks`;
      const roleDefinition = (yaml.match(/roleDefinition:\s*"(.+)"/)?.[1]?.trim()) ||
        `You are a ${title} specializing in ${title.toLowerCase()} tasks and responsibilities.`;

      const relativePath = path.relative(installDir, agentPath).replace(/\\/g, '/');
      const customInstructions = `CRITICAL Read the full YAML from ${relativePath} start activation to alter your state of being follow startup section instructions stay in this being until told to exit this mode`;

      // Add permissions from config if they exist
      const agentPermission = permissions[agentId];

      // Begin .kilocodemodes block
      newContent += ` - slug: ${slug}\n`;
      newContent += `   name: '${icon} ${title}'\n`;
      if (agentPermission) {
      newContent += `   description: '${agentPermission.description}'\n`; 
      }

      newContent += `   roleDefinition: ${roleDefinition}\n`;
      newContent += `   whenToUse: ${whenToUse}\n`;
      newContent += `   customInstructions: ${customInstructions}\n`;
      newContent += `   groups:\n`;
      newContent += `    - read\n`;


      if (agentPermission) {
        newContent += `    - - edit\n`;
        newContent += `      - fileRegex: ${agentPermission.fileRegex}\n`;
        newContent += `        description: ${agentPermission.description}\n`;
      } else {
        // Fallback to generic edit
        newContent += `    - edit\n`;
      }

      console.log(chalk.green(`✓ Added Kilo mode: ${slug} (${icon} ${title})`));
    }

    const finalContent = existingContent
      ? existingContent.trim() + "\n" + newContent
      : "customModes:\n" + newContent;

    await fileManager.writeFile(filePath, finalContent);
    console.log(chalk.green("✓ Created .kilocodemodes file in project root"));
    console.log(chalk.green(`✓ KiloCode setup complete!`));
    console.log(chalk.dim("Custom modes will be available when you open this project in KiloCode"));

    return true;
  }
  
  async setupCline(installDir, selectedAgent) {
    const clineRulesDir = path.join(installDir, ".clinerules");
    const agents = selectedAgent ? [selectedAgent] : await this.getAllAgentIds(installDir);

    await fileManager.ensureDirectory(clineRulesDir);

    // Load dynamic agent ordering from configuration
    const config = await this.loadIdeAgentConfig();
    const agentOrder = config['cline-order'] || {};

    for (const agentId of agents) {
      // Find the agent file
      const agentPath = await this.findAgentPath(agentId, installDir);

      if (agentPath) {
        const agentContent = await fileManager.readFile(agentPath);

        // Get numeric prefix for ordering
        const order = agentOrder[agentId] || 99;
        const prefix = order.toString().padStart(2, '0');
        const mdPath = path.join(clineRulesDir, `${prefix}-${agentId}.md`);

        // Create MD content for Cline (focused on project standards and role)
        let mdContent = `# ${await this.getAgentTitle(agentId, installDir)} Agent\n\n`;
        mdContent += `This rule defines the ${await this.getAgentTitle(agentId, installDir)} persona and project standards.\n\n`;
        mdContent += "## Role Definition\n\n";
        mdContent +=
          "When the user types `@" + agentId + "`, adopt this persona and follow these guidelines:\n\n";
        mdContent += "```yaml\n";
        // Extract just the YAML content from the agent file
        const yamlContent = extractYamlFromAgent(agentContent);
        if (yamlContent) {
          mdContent += yamlContent;
        } else {
          // If no YAML found, include the whole content minus the header
          mdContent += agentContent.replace(/^#.*$/m, "").trim();
        }
        mdContent += "\n```\n\n";
        mdContent += "## Project Standards\n\n";
        mdContent += `- Always maintain consistency with project documentation in .bmad-core/\n`;
        mdContent += `- Follow the agent's specific guidelines and constraints\n`;
        mdContent += `- Update relevant project files when making changes\n`;
        const relativePath = path.relative(installDir, agentPath).replace(/\\/g, '/');
        mdContent += `- Reference the complete agent definition in [${relativePath}](${relativePath})\n\n`;
        mdContent += "## Usage\n\n";
        mdContent += `Type \`@${agentId}\` to activate this ${await this.getAgentTitle(agentId, installDir)} persona.\n`;

        await fileManager.writeFile(mdPath, mdContent);
        console.log(chalk.green(`✓ Created rule: ${prefix}-${agentId}.md`));
      }
    }

    console.log(chalk.green(`\n✓ Created Cline rules in ${clineRulesDir}`));

    return true;
  }

  async setupGeminiCli(installDir) {
    const geminiDir = path.join(installDir, ".gemini");
    const bmadMethodDir = path.join(geminiDir, "bmad-method");
    await fileManager.ensureDirectory(bmadMethodDir);

    // Update logic for existing settings.json
    const settingsPath = path.join(geminiDir, "settings.json");
    if (await fileManager.pathExists(settingsPath)) {
      try {
        const settingsContent = await fileManager.readFile(settingsPath);
        const settings = JSON.parse(settingsContent);
        let updated = false;
        
        // Handle contextFileName property
        if (settings.contextFileName && Array.isArray(settings.contextFileName)) {
          const originalLength = settings.contextFileName.length;
          settings.contextFileName = settings.contextFileName.filter(
            (fileName) => !fileName.startsWith("agents/")
          );
          if (settings.contextFileName.length !== originalLength) {
            updated = true;
          }
        }
        
        if (updated) {
          await fileManager.writeFile(
            settingsPath,
            JSON.stringify(settings, null, 2)
          );
          console.log(chalk.green("✓ Updated .gemini/settings.json - removed agent file references"));
        }
      } catch (error) {
        console.warn(
          chalk.yellow("Could not update .gemini/settings.json"),
          error
        );
      }
    }

    // Remove old agents directory
    const agentsDir = path.join(geminiDir, "agents");
    if (await fileManager.pathExists(agentsDir)) {
      await fileManager.removeDirectory(agentsDir);
      console.log(chalk.green("✓ Removed old .gemini/agents directory"));
    }

    // Get all available agents
    const agents = await this.getAllAgentIds(installDir);
    let concatenatedContent = "";

    for (const agentId of agents) {
      // Find the source agent file
      const agentPath = await this.findAgentPath(agentId, installDir);

      if (agentPath) {
        const agentContent = await fileManager.readFile(agentPath);
        
        // Create properly formatted agent rule content (similar to trae)
        let agentRuleContent = `# ${agentId.toUpperCase()} Agent Rule\n\n`;
        agentRuleContent += `This rule is triggered when the user types \`*${agentId}\` and activates the ${await this.getAgentTitle(
          agentId,
          installDir
        )} agent persona.\n\n`;
        agentRuleContent += "## Agent Activation\n\n";
        agentRuleContent +=
          "CRITICAL: Read the full YAML, start activation to alter your state of being, follow startup section instructions, stay in this being until told to exit this mode:\n\n";
        agentRuleContent += "```yaml\n";
        // Extract just the YAML content from the agent file
        const yamlContent = extractYamlFromAgent(agentContent);
        if (yamlContent) {
          agentRuleContent += yamlContent;
        }
        else {
          // If no YAML found, include the whole content minus the header
          agentRuleContent += agentContent.replace(/^#.*$/m, "").trim();
        }
        agentRuleContent += "\n```\n\n";
        agentRuleContent += "## File Reference\n\n";
        const relativePath = path.relative(installDir, agentPath).replace(/\\/g, '/');
        agentRuleContent += `The complete agent definition is available in [${relativePath}](${relativePath}).\n\n`;
        agentRuleContent += "## Usage\n\n";
        agentRuleContent += `When the user types \`*${agentId}\`, activate this ${await this.getAgentTitle(
          agentId,
          installDir
        )} persona and follow all instructions defined in the YAML configuration above.\n`;
        
        // Add to concatenated content with separator
        concatenatedContent += agentRuleContent + "\n\n---\n\n";
        console.log(chalk.green(`✓ Added context for @${agentId}`));
      }
    }

    // Write the concatenated content to GEMINI.md
    const geminiMdPath = path.join(bmadMethodDir, "GEMINI.md");
    await fileManager.writeFile(geminiMdPath, concatenatedContent);
    console.log(chalk.green(`\n✓ Created GEMINI.md in ${bmadMethodDir}`));

    return true;
  }

  async setupQwenCode(installDir, selectedAgent) {
    const qwenDir = path.join(installDir, ".qwen");
    const bmadMethodDir = path.join(qwenDir, "bmad-method");
    await fileManager.ensureDirectory(bmadMethodDir);

    // Update logic for existing settings.json
    const settingsPath = path.join(qwenDir, "settings.json");
    if (await fileManager.pathExists(settingsPath)) {
      try {
        const settingsContent = await fileManager.readFile(settingsPath);
        const settings = JSON.parse(settingsContent);
        let updated = false;
        
        // Handle contextFileName property
        if (settings.contextFileName && Array.isArray(settings.contextFileName)) {
          const originalLength = settings.contextFileName.length;
          settings.contextFileName = settings.contextFileName.filter(
            (fileName) => !fileName.startsWith("agents/")
          );
          if (settings.contextFileName.length !== originalLength) {
            updated = true;
          }
        }
        
        if (updated) {
          await fileManager.writeFile(
            settingsPath,
            JSON.stringify(settings, null, 2)
          );
          console.log(chalk.green("✓ Updated .qwen/settings.json - removed agent file references"));
        }
      } catch (error) {
        console.warn(
          chalk.yellow("Could not update .qwen/settings.json"),
          error
        );
      }
    }

    // Remove old agents directory
    const agentsDir = path.join(qwenDir, "agents");
    if (await fileManager.pathExists(agentsDir)) {
      await fileManager.removeDirectory(agentsDir);
      console.log(chalk.green("✓ Removed old .qwen/agents directory"));
    }

    // Get all available agents
    const agents = selectedAgent ? [selectedAgent] : await this.getAllAgentIds(installDir);
    let concatenatedContent = "";

    for (const agentId of agents) {
      // Find the source agent file
      const agentPath = await this.findAgentPath(agentId, installDir);

      if (agentPath) {
        const agentContent = await fileManager.readFile(agentPath);
        
        // Create properly formatted agent rule content (similar to gemini)
        let agentRuleContent = `# ${agentId.toUpperCase()} Agent Rule\n\n`;
        agentRuleContent += `This rule is triggered when the user types \`*${agentId}\` and activates the ${await this.getAgentTitle(
          agentId,
          installDir
        )} agent persona.\n\n`;
        agentRuleContent += "## Agent Activation\n\n";
        agentRuleContent +=
          "CRITICAL: Read the full YAML, start activation to alter your state of being, follow startup section instructions, stay in this being until told to exit this mode:\n\n";
        agentRuleContent += "```yaml\n";
        // Extract just the YAML content from the agent file
        const yamlContent = extractYamlFromAgent(agentContent);
        if (yamlContent) {
          agentRuleContent += yamlContent;
        }
        else {
          // If no YAML found, include the whole content minus the header
          agentRuleContent += agentContent.replace(/^#.*$/m, "").trim();
        }
        agentRuleContent += "\n```\n\n";
        agentRuleContent += "## File Reference\n\n";
        const relativePath = path.relative(installDir, agentPath).replace(/\\/g, '/');
        agentRuleContent += `The complete agent definition is available in [${relativePath}](${relativePath}).\n\n`;
        agentRuleContent += "## Usage\n\n";
        agentRuleContent += `When the user types \`*${agentId}\`, activate this ${await this.getAgentTitle(
          agentId,
          installDir
        )} persona and follow all instructions defined in the YAML configuration above.\n`;
        
        // Add to concatenated content with separator
        concatenatedContent += agentRuleContent + "\n\n---\n\n";
        console.log(chalk.green(`✓ Added context for *${agentId}`));
      }
    }

    // Write the concatenated content to QWEN.md
    const qwenMdPath = path.join(bmadMethodDir, "QWEN.md");
    await fileManager.writeFile(qwenMdPath, concatenatedContent);
    console.log(chalk.green(`\n✓ Created QWEN.md in ${bmadMethodDir}`));

    return true;
  }

  async setupGitHubCopilot(installDir, selectedAgent, spinner = null, preConfiguredSettings = null) {
    // Configure VS Code workspace settings first to avoid UI conflicts with loading spinners
    await this.configureVsCodeSettings(installDir, spinner, preConfiguredSettings);
    
    const chatmodesDir = path.join(installDir, ".github", "chatmodes");
    const agents = selectedAgent ? [selectedAgent] : await this.getAllAgentIds(installDir);
     
    await fileManager.ensureDirectory(chatmodesDir);

    for (const agentId of agents) {
      // Find the agent file
      const agentPath = await this.findAgentPath(agentId, installDir);
      const chatmodePath = path.join(chatmodesDir, `${agentId}.chatmode.md`);

      if (agentPath) {
        // Create chat mode file with agent content
        const agentContent = await fileManager.readFile(agentPath);
        const agentTitle = await this.getAgentTitle(agentId, installDir);
        
        // Extract whenToUse for the description
        const yamlMatch = agentContent.match(/```ya?ml\r?\n([\s\S]*?)```/);
        let description = `Activates the ${agentTitle} agent persona.`;
        if (yamlMatch) {
          const whenToUseMatch = yamlMatch[1].match(/whenToUse:\s*"(.*?)"/);
          if (whenToUseMatch && whenToUseMatch[1]) {
            description = whenToUseMatch[1];
          }
        }
        
        let chatmodeContent = `---
description: "${description.replace(/"/g, '\\"')}"
tools: ['changes', 'codebase', 'fetch', 'findTestFiles', 'githubRepo', 'problems', 'usages', 'editFiles', 'runCommands', 'runTasks', 'runTests', 'search', 'searchResults', 'terminalLastCommand', 'terminalSelection', 'testFailure']
---

`;
        chatmodeContent += agentContent;

        await fileManager.writeFile(chatmodePath, chatmodeContent);
        console.log(chalk.green(`✓ Created chat mode: ${agentId}.chatmode.md`));
      }
    }

    console.log(chalk.green(`\n✓ Github Copilot setup complete!`));
    console.log(chalk.dim(`You can now find the BMad agents in the Chat view's mode selector.`));

    return true;
  }

  async configureVsCodeSettings(installDir, spinner, preConfiguredSettings = null) {
    const vscodeDir = path.join(installDir, ".vscode");
    const settingsPath = path.join(vscodeDir, "settings.json");
    
    await fileManager.ensureDirectory(vscodeDir);
    
    // Read existing settings if they exist
    let existingSettings = {};
    if (await fileManager.pathExists(settingsPath)) {
      try {
        const existingContent = await fileManager.readFile(settingsPath);
        existingSettings = JSON.parse(existingContent);
        console.log(chalk.yellow("Found existing .vscode/settings.json. Merging BMad settings..."));
      } catch (error) {
        console.warn(chalk.yellow("Could not parse existing settings.json. Creating new one."));
        existingSettings = {};
      }
    }
    
    // Use pre-configured settings if provided, otherwise prompt
    let configChoice;
    if (preConfiguredSettings && preConfiguredSettings.configChoice) {
      configChoice = preConfiguredSettings.configChoice;
      console.log(chalk.dim(`Using pre-configured GitHub Copilot settings: ${configChoice}`));
    } else {
      // Clear any previous output and add spacing to avoid conflicts with loaders
      console.log('\n'.repeat(2));
      console.log(chalk.blue("🔧 Github Copilot Agent Settings Configuration"));
      console.log(chalk.dim("BMad works best with specific VS Code settings for optimal agent experience."));
      console.log(''); // Add extra spacing
      
      const response = await inquirer.prompt([
        {
          type: 'list',
          name: 'configChoice',
          message: chalk.yellow('How would you like to configure GitHub Copilot settings?'),
          choices: [
            {
              name: 'Use recommended defaults (fastest setup)',
              value: 'defaults'
            },
            {
              name: 'Configure each setting manually (customize to your preferences)',
              value: 'manual'
            },
            {
              name: 'Skip settings configuration (I\'ll configure manually later)',
              value: 'skip'
            }
          ],
          default: 'defaults'
        }
      ]);
      configChoice = response.configChoice;
    }
    
    let bmadSettings = {};
    
    if (configChoice === 'skip') {
      console.log(chalk.yellow("⚠️  Skipping VS Code settings configuration."));
      console.log(chalk.dim("You can manually configure these settings in .vscode/settings.json:"));
      console.log(chalk.dim("  • chat.agent.enabled: true"));
      console.log(chalk.dim("  • chat.agent.maxRequests: 15"));
      console.log(chalk.dim("  • github.copilot.chat.agent.runTasks: true"));
      console.log(chalk.dim("  • chat.mcp.discovery.enabled: true"));
      console.log(chalk.dim("  • github.copilot.chat.agent.autoFix: true"));
      console.log(chalk.dim("  • chat.tools.autoApprove: false"));
      return true;
    }
    
    if (configChoice === 'defaults') {
      // Use recommended defaults
      bmadSettings = {
        "chat.agent.enabled": true,
        "chat.agent.maxRequests": 15,
        "github.copilot.chat.agent.runTasks": true,
        "chat.mcp.discovery.enabled": true,
        "github.copilot.chat.agent.autoFix": true,
        "chat.tools.autoApprove": false
      };
      console.log(chalk.green("✓ Using recommended BMad defaults for Github Copilot settings"));
    } else {
      // Manual configuration
      console.log(chalk.blue("\n📋 Let's configure each setting for your preferences:"));
      
      // Pause spinner during manual configuration prompts
      let spinnerWasActive = false;
      if (spinner && spinner.isSpinning) {
        spinner.stop();
        spinnerWasActive = true;
      }
      
      const manualSettings = await inquirer.prompt([
        {
          type: 'input',
          name: 'maxRequests',
          message: 'Maximum requests per agent session (recommended: 15)?',
          default: '15',
          validate: (input) => {
            const num = parseInt(input);
            if (isNaN(num) || num < 1 || num > 50) {
              return 'Please enter a number between 1 and 50';
            }
            return true;
          }
        },
        {
          type: 'confirm',
          name: 'runTasks',
          message: 'Allow agents to run workspace tasks (package.json scripts, etc.)?',
          default: true
        },
        {
          type: 'confirm',
          name: 'mcpDiscovery',
          message: 'Enable MCP (Model Context Protocol) server discovery?',
          default: true
        },
        {
          type: 'confirm',
          name: 'autoFix',
          message: 'Enable automatic error detection and fixing in generated code?',
          default: true
        },
        {
          type: 'confirm',
          name: 'autoApprove',
          message: 'Auto-approve ALL tools without confirmation? (⚠️  EXPERIMENTAL - less secure)',
          default: false
        }
      ]);

      // Restart spinner if it was active before prompts
      if (spinner && spinnerWasActive) {
        spinner.start();
      }
      
      bmadSettings = {
        "chat.agent.enabled": true, // Always enabled - required for BMad agents
        "chat.agent.maxRequests": parseInt(manualSettings.maxRequests),
        "github.copilot.chat.agent.runTasks": manualSettings.runTasks,
        "chat.mcp.discovery.enabled": manualSettings.mcpDiscovery,
        "github.copilot.chat.agent.autoFix": manualSettings.autoFix,
        "chat.tools.autoApprove": manualSettings.autoApprove
      };
      
      console.log(chalk.green("✓ Custom settings configured"));
    }
    
    // Merge settings (existing settings take precedence to avoid overriding user preferences)
    const mergedSettings = { ...bmadSettings, ...existingSettings };
    
    // Write the updated settings
    await fileManager.writeFile(settingsPath, JSON.stringify(mergedSettings, null, 2));
    
    console.log(chalk.green("✓ VS Code workspace settings configured successfully"));
    console.log(chalk.dim("  Settings written to .vscode/settings.json:"));
    Object.entries(bmadSettings).forEach(([key, value]) => {
      console.log(chalk.dim(`  • ${key}: ${value}`));
    });
    console.log(chalk.dim(""));
    console.log(chalk.dim("You can modify these settings anytime in .vscode/settings.json"));
  }
}

module.exports = new IdeSetup();
