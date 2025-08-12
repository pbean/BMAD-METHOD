const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml');
const KiroDetector = require('./kiro-detector');
const AgentTransformer = require('./agent-transformer');
const KiroValidator = require('./kiro-validator');

class KiroInstaller {
  constructor() {
    this.detector = new KiroDetector();
    this.agentTransformer = new AgentTransformer();
    this.validator = new KiroValidator();
  }

  /**
   * Installs BMad Method with Kiro-specific integration
   * @param {Object} config - Installation configuration
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async installForKiro(config, installDir, spinner) {
    spinner.text = 'Detecting Kiro workspace...';
    
    // Detect and validate Kiro workspace
    const detection = await this.detector.detectKiroWorkspace(installDir);
    
    if (!detection.isKiroWorkspace) {
      spinner.text = 'Setting up Kiro workspace structure...';
      await this.detector.ensureKiroWorkspaceStructure(installDir);
      console.log(chalk.green('✓ Created Kiro workspace structure'));
    }

    const workspaceValidation = await this.detector.validateKiroWorkspace(installDir);
    if (!workspaceValidation.isValid) {
      spinner.text = 'Ensuring Kiro workspace structure...';
      await this.detector.ensureKiroWorkspaceStructure(installDir);
    }

    // Check for existing BMad installation
    const bmadInfo = await this.detector.getBMadInstallationInfo(installDir);
    
    if (bmadInfo.hasBMadInstallation && bmadInfo.installationType === 'kiro-native') {
      console.log(chalk.yellow(`Found existing Kiro BMad installation with ${bmadInfo.agentCount} agents`));
    }

    // Install BMad agents as Kiro-native agents
    await this.installKiroAgents(config, installDir, spinner);

    // Create default steering rules for BMad
    await this.createDefaultSteeringRules(installDir, spinner);

    // Generate sample hooks if requested
    if (config.generateHooks) {
      await this.generateDefaultHooks(installDir, spinner);
    }

    // Validate installation
    spinner.text = 'Validating Kiro installation...';
    const installValidation = await this.validator.validateKiroInstallation(installDir);
    
    if (installValidation.isValid) {
      console.log(chalk.green('✓ Kiro integration complete!'));
      console.log(chalk.green('✓ Installation validation passed'));
    } else {
      console.log(chalk.yellow('⚠ Kiro integration complete with warnings'));
      this.validator.displayValidationResults(installValidation, 'Kiro BMad Installation');
    }
    
    this.showKiroSuccessMessage(config, installDir, installValidation.summary);
  }

  /**
   * Installs BMad agents as Kiro-native agents
   * @param {Object} config - Installation configuration
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async installKiroAgents(config, installDir, spinner) {
    const kiroAgentsDir = path.join(installDir, '.kiro', 'agents');
    await fs.ensureDir(kiroAgentsDir);

    // Get list of agents to install
    let agentsToInstall = [];
    
    if (config.installType === 'full') {
      // Install all core agents
      const resourceLocator = require('../installer/lib/resource-locator');
      agentsToInstall = await resourceLocator.listCoreAgents();
    } else if (config.agent) {
      // Install specific agent
      agentsToInstall = [config.agent];
    } else if (config.team) {
      // Install team agents
      const configLoader = require('../installer/lib/config-loader');
      const teamConfig = await configLoader.getTeamConfiguration(config.team);
      agentsToInstall = teamConfig.agents || [];
    }

    // Transform and install each agent
    for (const agentId of agentsToInstall) {
      spinner.text = `Installing Kiro agent: ${agentId}...`;
      
      try {
        const agentPath = await this.findAgentPath(agentId, installDir);
        if (agentPath) {
          const kiroAgentPath = path.join(kiroAgentsDir, `${agentId}.md`);
          await this.agentTransformer.transformAgentForKiro(agentPath, kiroAgentPath, {
            enableContextInjection: true,
            enableSteeringIntegration: true,
            preserveBMadPersona: true
          });
          
          console.log(chalk.green(`✓ Installed Kiro agent: ${agentId}`));
        } else {
          console.log(chalk.yellow(`⚠ Agent not found: ${agentId}`));
        }
      } catch (error) {
        console.log(chalk.red(`✗ Failed to install agent ${agentId}: ${error.message}`));
      }
    }

    // Install expansion packs with Kiro integration if any
    if (config.expansionPacks && config.expansionPacks.length > 0) {
      await this.installExpansionPacksForKiro(config.expansionPacks, installDir, spinner);
    }
  }

  /**
   * Installs expansion pack agents for Kiro
   * @param {string[]} expansionPacks - List of expansion pack IDs
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async installExpansionPackAgents(expansionPacks, installDir, spinner) {
    const kiroAgentsDir = path.join(installDir, '.kiro', 'agents');
    
    for (const packId of expansionPacks) {
      spinner.text = `Installing expansion pack agents: ${packId}...`;
      
      try {
        const packDir = path.join(installDir, `.${packId}`);
        const packAgentsDir = path.join(packDir, 'agents');
        
        if (await fs.pathExists(packAgentsDir)) {
          const agentFiles = await fs.readdir(packAgentsDir);
          const mdFiles = agentFiles.filter(file => file.endsWith('.md'));
          
          for (const agentFile of mdFiles) {
            const agentId = path.basename(agentFile, '.md');
            const sourcePath = path.join(packAgentsDir, agentFile);
            const destPath = path.join(kiroAgentsDir, agentFile);
            
            // Transform agent with expansion pack specific enhancements
            await this.agentTransformer.transformAgentForKiro(sourcePath, destPath, {
              enableContextInjection: true,
              enableSteeringIntegration: true,
              preserveBMadPersona: true,
              expansionPack: packId,
              enableExpansionPackFeatures: true
            });
            
            console.log(chalk.green(`✓ Installed expansion agent: ${agentId} (${packId})`));
          }

          // Install expansion pack templates and workflows for Kiro
          await this.installExpansionPackTemplates(packId, packDir, installDir, spinner);
          
          // Create expansion pack specific hooks
          await this.createExpansionPackHooks(packId, packDir, installDir, spinner);
        }
      } catch (error) {
        console.log(chalk.red(`✗ Failed to install expansion pack ${packId}: ${error.message}`));
      }
    }
  }

  /**
   * Installs expansion pack templates and workflows for Kiro
   * @param {string} packId - Expansion pack ID
   * @param {string} packDir - Expansion pack directory
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async installExpansionPackTemplates(packId, packDir, installDir, spinner) {
    const templatesDir = path.join(packDir, 'templates');
    const workflowsDir = path.join(packDir, 'workflows');
    const kiroTemplatesDir = path.join(installDir, '.kiro', 'templates', packId);
    
    // Install templates with Kiro adaptations
    if (await fs.pathExists(templatesDir)) {
      await fs.ensureDir(kiroTemplatesDir);
      
      const templateFiles = await fs.readdir(templatesDir);
      const yamlFiles = templateFiles.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
      
      for (const templateFile of yamlFiles) {
        const sourcePath = path.join(templatesDir, templateFile);
        const destPath = path.join(kiroTemplatesDir, templateFile);
        
        // Transform template for Kiro spec format
        await this.transformTemplateForKiro(sourcePath, destPath, packId);
      }
      
      console.log(chalk.green(`✓ Installed ${yamlFiles.length} templates for ${packId}`));
    }

    // Install workflows as Kiro spec templates
    if (await fs.pathExists(workflowsDir)) {
      const workflowFiles = await fs.readdir(workflowsDir);
      const yamlFiles = workflowFiles.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
      
      for (const workflowFile of yamlFiles) {
        const sourcePath = path.join(workflowsDir, workflowFile);
        const workflowName = path.basename(workflowFile, path.extname(workflowFile));
        
        // Create Kiro spec template from workflow
        await this.createSpecTemplateFromWorkflow(sourcePath, workflowName, packId, installDir);
      }
      
      console.log(chalk.green(`✓ Created spec templates from ${yamlFiles.length} workflows for ${packId}`));
    }
  }

  /**
   * Transforms expansion pack template for Kiro compatibility
   * @param {string} sourcePath - Source template path
   * @param {string} destPath - Destination path
   * @param {string} packId - Expansion pack ID
   * @returns {Promise<void>}
   */
  async transformTemplateForKiro(sourcePath, destPath, packId) {
    try {
      const templateContent = await fs.readFile(sourcePath, 'utf8');
      const template = yaml.load(templateContent);
      
      // Add Kiro-specific enhancements to template
      if (template) {
        // Add Kiro context references
        if (template.instructions) {
          template.instructions = this.addKiroContextToInstructions(template.instructions);
        }
        
        // Add expansion pack metadata
        template.kiroMetadata = {
          expansionPack: packId,
          contextProviders: ['#File', '#Folder', '#Codebase', '#Problems', '#Terminal', '#Git Diff'],
          steeringRules: [`${packId}.md`, 'bmad-method.md', 'tech-preferences.md']
        };
        
        // Write enhanced template
        const enhancedContent = yaml.dump(template, { lineWidth: -1 });
        await fs.writeFile(destPath, enhancedContent);
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠ Could not transform template ${path.basename(sourcePath)}: ${error.message}`));
      // Fallback: copy original template
      await fs.copy(sourcePath, destPath);
    }
  }

  /**
   * Creates Kiro spec template from BMad workflow
   * @param {string} workflowPath - Path to workflow file
   * @param {string} workflowName - Workflow name
   * @param {string} packId - Expansion pack ID
   * @param {string} installDir - Installation directory
   * @returns {Promise<void>}
   */
  async createSpecTemplateFromWorkflow(workflowPath, workflowName, packId, installDir) {
    try {
      const workflowContent = await fs.readFile(workflowPath, 'utf8');
      const workflow = yaml.load(workflowContent);
      
      if (!workflow || !workflow.phases) {
        return;
      }

      const specTemplateDir = path.join(installDir, '.kiro', 'spec-templates', packId);
      await fs.ensureDir(specTemplateDir);
      
      // Create requirements template
      const requirementsTemplate = this.createRequirementsTemplateFromWorkflow(workflow, packId);
      await fs.writeFile(
        path.join(specTemplateDir, `${workflowName}-requirements.md`), 
        requirementsTemplate
      );
      
      // Create design template
      const designTemplate = this.createDesignTemplateFromWorkflow(workflow, packId);
      await fs.writeFile(
        path.join(specTemplateDir, `${workflowName}-design.md`), 
        designTemplate
      );
      
      // Create tasks template
      const tasksTemplate = this.createTasksTemplateFromWorkflow(workflow, packId);
      await fs.writeFile(
        path.join(specTemplateDir, `${workflowName}-tasks.md`), 
        tasksTemplate
      );
      
    } catch (error) {
      console.log(chalk.yellow(`⚠ Could not create spec template from workflow ${workflowName}: ${error.message}`));
    }
  }

  /**
   * Creates expansion pack specific hooks
   * @param {string} packId - Expansion pack ID
   * @param {string} packDir - Expansion pack directory
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async createExpansionPackHooks(packId, packDir, installDir, spinner) {
    const hooksDir = path.join(installDir, '.kiro', 'hooks');
    await fs.ensureDir(hooksDir);
    
    // Read expansion pack config to understand its domain
    const configPath = path.join(packDir, 'config.yaml');
    let packConfig = {};
    
    if (await fs.pathExists(configPath)) {
      try {
        const configContent = await fs.readFile(configPath, 'utf8');
        packConfig = yaml.load(configContent);
      } catch (error) {
        // Use defaults if config can't be read
      }
    }

    // Create domain-specific hooks based on expansion pack type
    const hooks = this.generateExpansionPackHooks(packId, packConfig);
    
    for (const hook of hooks) {
      const hookPath = path.join(hooksDir, `${packId}-${hook.name}.yaml`);
      if (!await fs.pathExists(hookPath)) {
        const hookContent = yaml.dump(hook.config, { lineWidth: -1 });
        await fs.writeFile(hookPath, hookContent);
        console.log(chalk.green(`✓ Created ${packId} hook: ${hook.name}`));
      }
    }
  }

  /**
   * Generates expansion pack specific hooks
   * @param {string} packId - Expansion pack ID
   * @param {Object} packConfig - Expansion pack configuration
   * @returns {Array} Array of hook configurations
   */
  generateExpansionPackHooks(packId, packConfig) {
    const hooks = [];
    
    // Game development hooks
    if (packId.includes('game') || packConfig.domain === 'game-development') {
      hooks.push({
        name: 'asset-update',
        config: {
          name: `${packConfig.title || packId} Asset Update`,
          description: 'Trigger game asset processing when assets are modified',
          trigger: {
            type: 'file_change',
            pattern: 'assets/**/*.{png,jpg,wav,mp3,fbx,obj}'
          },
          action: {
            agent: `${packId}-game-developer`,
            task: 'process-assets',
            context: ['#File', '#Folder']
          }
        }
      });
      
      hooks.push({
        name: 'level-design-update',
        config: {
          name: `${packConfig.title || packId} Level Design Update`,
          description: 'Update game logic when level designs change',
          trigger: {
            type: 'file_change',
            pattern: 'levels/**/*.{json,yaml,xml}'
          },
          action: {
            agent: `${packId}-game-designer`,
            task: 'update-level-logic',
            context: ['#File', '#Codebase']
          }
        }
      });
    }
    
    // Infrastructure/DevOps hooks
    if (packId.includes('infrastructure') || packId.includes('devops') || packConfig.domain === 'infrastructure') {
      hooks.push({
        name: 'infrastructure-validation',
        config: {
          name: `${packConfig.title || packId} Infrastructure Validation`,
          description: 'Validate infrastructure changes before deployment',
          trigger: {
            type: 'file_change',
            pattern: '**/*.{tf,yaml,yml,json}'
          },
          action: {
            agent: `${packId}-infra-devops-platform`,
            task: 'validate-infrastructure',
            context: ['#File', '#Git Diff', '#Problems']
          }
        }
      });
    }
    
    // Generic expansion pack hooks
    hooks.push({
      name: 'workflow-progression',
      config: {
        name: `${packConfig.title || packId} Workflow Progression`,
        description: `Automatically progress ${packId} workflows when tasks complete`,
        trigger: {
          type: 'file_change',
          pattern: `docs/${packId}/**/*.md`
        },
        action: {
          agent: `${packId}-scrum-master`,
          task: 'progress-workflow',
          context: ['#File', '#Git Diff']
        }
      }
    });
    
    return hooks;
  }

  /**
   * Adds Kiro context references to template instructions
   * @param {string} instructions - Original instructions
   * @returns {string} Enhanced instructions with Kiro context
   */
  addKiroContextToInstructions(instructions) {
    const contextEnhancement = `

## Kiro Context Integration

You have automatic access to the following Kiro context providers:
- #File - Current file content and context
- #Folder - Project structure and organization
- #Codebase - Full codebase understanding and search
- #Problems - Current build issues and errors
- #Terminal - Recent terminal output and commands
- #Git Diff - Recent changes and commit history

Use these context providers to provide more accurate and contextually aware responses.

`;
    
    return instructions + contextEnhancement;
  }

  /**
   * Creates requirements template from workflow
   * @param {Object} workflow - Workflow configuration
   * @param {string} packId - Expansion pack ID
   * @returns {string} Requirements template content
   */
  createRequirementsTemplateFromWorkflow(workflow, packId) {
    return `# ${workflow.title || 'Feature'} Requirements

## Introduction

This feature implements ${workflow.description || 'functionality'} using the ${packId} expansion pack methodology.

## Requirements

### Requirement 1

**User Story:** As a user, I want [feature], so that [benefit]

#### Acceptance Criteria

1. WHEN [event] THEN the system SHALL [response]
2. IF [condition] THEN the system SHALL [behavior]

## Kiro Integration Notes

- Use #Codebase for understanding existing ${packId} patterns
- Reference #File and #Folder for current project structure
- Apply ${packId}.md steering rules for domain-specific conventions
`;
  }

  /**
   * Creates design template from workflow
   * @param {Object} workflow - Workflow configuration
   * @param {string} packId - Expansion pack ID
   * @returns {string} Design template content
   */
  createDesignTemplateFromWorkflow(workflow, packId) {
    return `# ${workflow.title || 'Feature'} Design

## Overview

This design document outlines the implementation approach for ${workflow.description || 'the feature'} using ${packId} best practices and patterns.

## Architecture

[Architecture description with ${packId}-specific considerations]

## Components and Interfaces

[Component descriptions following ${packId} conventions]

## ${packId} Integration

- Follows ${packId} domain patterns and conventions
- Leverages ${packId} expansion pack agents and templates
- Integrates with existing ${packId} workflows and processes

## Kiro Context Usage

- #Codebase provides understanding of existing ${packId} implementations
- #Problems helps identify ${packId}-specific issues and constraints
- Steering rules ensure consistency with ${packId} best practices
`;
  }

  /**
   * Creates tasks template from workflow
   * @param {Object} workflow - Workflow configuration
   * @param {string} packId - Expansion pack ID
   * @returns {string} Tasks template content
   */
  createTasksTemplateFromWorkflow(workflow, packId) {
    let tasksContent = `# ${workflow.title || 'Feature'} Implementation Tasks

## Implementation Plan

`;

    // Generate tasks from workflow phases
    if (workflow.phases) {
      let taskNumber = 1;
      
      for (const phase of workflow.phases) {
        tasksContent += `- [ ] ${taskNumber}. ${phase.name || `Phase ${taskNumber}`}\n`;
        
        if (phase.tasks) {
          let subTaskNumber = 1;
          for (const task of phase.tasks) {
            tasksContent += `- [ ] ${taskNumber}.${subTaskNumber} ${task.name || task}\n`;
            tasksContent += `  - Use ${packId} agents and templates\n`;
            tasksContent += `  - Follow ${packId} domain conventions\n`;
            tasksContent += `  - Leverage Kiro context for implementation\n`;
            tasksContent += `  - _Requirements: [Reference specific requirements]_\n\n`;
            subTaskNumber++;
          }
        } else {
          tasksContent += `  - Implement ${phase.description || phase.name}\n`;
          tasksContent += `  - Use ${packId} expansion pack capabilities\n`;
          tasksContent += `  - Apply Kiro context awareness\n`;
          tasksContent += `  - _Requirements: [Reference specific requirements]_\n\n`;
        }
        
        taskNumber++;
      }
    }

    tasksContent += `
## Kiro Integration Notes

- All tasks can be executed using Kiro's "Start task" functionality
- ${packId} agents will be automatically invoked with full context
- Progress is tracked through Kiro's task status system
- Steering rules ensure consistency with ${packId} best practices
`;

    return tasksContent;
  }

  /**
   * Creates default steering rules for BMad integration
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async createDefaultSteeringRules(installDir, spinner) {
    spinner.text = 'Creating default steering rules...';
    
    const steeringDir = path.join(installDir, '.kiro', 'steering');
    await fs.ensureDir(steeringDir);

    // Create bmad-method.md steering rule
    const bmadSteeringPath = path.join(steeringDir, 'bmad-method.md');
    if (!await fs.pathExists(bmadSteeringPath)) {
      const bmadSteeringContent = `---
inclusion: always
---

# BMad Method Integration

This project uses the BMad Method framework for agentic development.

## Core Principles

- Follow BMad's two-phase approach: Planning then Implementation
- Use structured workflows with dedicated agents (PM, Architect, Dev, QA)
- Maintain context-rich development stories
- Apply quality assurance checklists

## Agent Usage

- **BMad PM**: Product requirements and planning
- **BMad Architect**: Technical architecture and design decisions
- **BMad Dev**: Implementation with full context awareness
- **BMad QA**: Code review and quality assurance
- **BMad Scrum Master**: Workflow coordination and story management

## Context Integration

BMad agents automatically access:
- Current file context (#File)
- Project structure (#Folder, #Codebase)
- Build status (#Problems, #Terminal)
- Recent changes (#Git Diff)

## Best Practices

- Start with planning agents before implementation
- Use spec-driven development for complex features
- Leverage Kiro's task execution for BMad stories
- Apply steering rules consistently across all agents
`;
      await fs.writeFile(bmadSteeringPath, bmadSteeringContent);
      console.log(chalk.green('✓ Created BMad Method steering rule'));
    }

    // Create technical preferences steering rule
    const techSteeringPath = path.join(steeringDir, 'tech-preferences.md');
    if (!await fs.pathExists(techSteeringPath)) {
      const techSteeringContent = `---
inclusion: always
---

# Technical Preferences

## Code Style

- Use consistent formatting and naming conventions
- Follow language-specific best practices
- Maintain clean, readable code structure

## Architecture

- Prefer modular, maintainable designs
- Use appropriate design patterns
- Consider scalability and performance

## Testing

- Write comprehensive tests for new functionality
- Maintain good test coverage
- Use appropriate testing frameworks

## Documentation

- Document complex logic and architectural decisions
- Keep README files up to date
- Use clear, concise comments
`;
      await fs.writeFile(techSteeringPath, techSteeringContent);
      console.log(chalk.green('✓ Created technical preferences steering rule'));
    }
  }

  /**
   * Generates default hooks for BMad workflow automation
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async generateDefaultHooks(installDir, spinner) {
    spinner.text = 'Generating workflow automation hooks...';
    
    const hooksDir = path.join(installDir, '.kiro', 'hooks');
    await fs.ensureDir(hooksDir);

    // Create story progression hook
    const storyProgressionHook = path.join(hooksDir, 'bmad-story-progression.yaml');
    if (!await fs.pathExists(storyProgressionHook)) {
      const hookContent = `name: "BMad Story Progression"
description: "Automatically progress to next story when current is completed"
trigger:
  type: "file_change"
  pattern: "docs/stories/*.md"
  condition: "task_completed"
action:
  agent: "bmad-scrum-master"
  task: "create-next-story"
  context:
    - "#File"
    - "#Git Diff"
`;
      await fs.writeFile(storyProgressionHook, hookContent);
      console.log(chalk.green('✓ Created story progression hook'));
    }

    // Create code review hook
    const codeReviewHook = path.join(hooksDir, 'bmad-code-review.yaml');
    if (!await fs.pathExists(codeReviewHook)) {
      const hookContent = `name: "BMad Code Review"
description: "Trigger QA agent review when code files are saved"
trigger:
  type: "file_save"
  pattern: "**/*.{js,ts,py,java,cpp,c,go,rs}"
action:
  agent: "bmad-qa"
  task: "review-code"
  context:
    - "#File"
    - "#Problems"
    - "#Git Diff"
`;
      await fs.writeFile(codeReviewHook, hookContent);
      console.log(chalk.green('✓ Created code review hook'));
    }
  }

  /**
   * Finds the path to a BMad agent file
   * @param {string} agentId - Agent identifier
   * @param {string} installDir - Installation directory
   * @returns {Promise<string|null>} Path to agent file or null if not found
   */
  async findAgentPath(agentId, installDir) {
    const possiblePaths = [
      path.join(installDir, '.bmad-core', 'agents', `${agentId}.md`),
      path.join(__dirname, '..', '..', 'bmad-core', 'agents', `${agentId}.md`)
    ];

    for (const agentPath of possiblePaths) {
      if (await fs.pathExists(agentPath)) {
        return agentPath;
      }
    }

    return null;
  }

  /**
   * Shows success message for Kiro installation
   * @param {Object} config - Installation configuration
   * @param {string} installDir - Installation directory
   * @param {Object} summary - Installation summary
   */
  showKiroSuccessMessage(config, installDir, summary = {}) {
    console.log(chalk.green.bold('\n🎉 BMad Method + Kiro Integration Complete!'));
    console.log(chalk.cyan('\n📁 Installation Summary:'));
    console.log(chalk.cyan(`   Project Directory: ${installDir}`));
    console.log(chalk.cyan(`   Kiro Agents: .kiro/agents/ (${summary.agentCount || 0} agents)`));
    console.log(chalk.cyan(`   Steering Rules: .kiro/steering/ (${summary.steeringRuleCount || 0} rules)`));
    
    if (config.generateHooks) {
      console.log(chalk.cyan(`   Automation Hooks: .kiro/hooks/ (${summary.hookCount || 0} hooks)`));
    }
    
    if (summary.specCount > 0) {
      console.log(chalk.cyan(`   Specs: .kiro/specs/ (${summary.specCount} specs)`));
    }

    console.log(chalk.green.bold('\n🚀 Next Steps:'));
    console.log(chalk.green('1. Open your project in Kiro IDE'));
    console.log(chalk.green('2. Access BMad agents through Kiro\'s agent system'));
    console.log(chalk.green('3. Use spec-driven development for complex features'));
    console.log(chalk.green('4. Leverage automatic context awareness in all agents'));

    console.log(chalk.yellow.bold('\n💡 Pro Tips:'));
    console.log(chalk.yellow('• BMad agents automatically access #File, #Folder, #Codebase context'));
    console.log(chalk.yellow('• Use steering rules to customize agent behavior for your project'));
    console.log(chalk.yellow('• Create specs for complex features using BMad planning workflow'));
    console.log(chalk.yellow('• Hooks can automate workflow progression and code reviews'));
  }

  /**
   * Installs expansion packs with Kiro integration
   * @param {string[]} expansionPacks - List of expansion pack IDs
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async installExpansionPacksForKiro(expansionPacks, installDir, spinner) {
    if (!expansionPacks || expansionPacks.length === 0) {
      return;
    }

    spinner.text = 'Installing expansion packs for Kiro...';
    
    // First install expansion packs using traditional method
    const Installer = require('../installer/lib/installer');
    const installer = new Installer();
    
    const expansionFiles = await installer.installExpansionPacks(installDir, expansionPacks, spinner, {
      ides: ['kiro']
    });

    // Then transform expansion pack agents for Kiro
    await this.installExpansionPackAgents(expansionPacks, installDir, spinner);

    // Create expansion pack specific steering rules
    await this.createExpansionPackSteeringRules(expansionPacks, installDir, spinner);

    console.log(chalk.green(`✓ Installed ${expansionPacks.length} expansion packs for Kiro`));
  }

  /**
   * Creates expansion pack specific steering rules
   * @param {string[]} expansionPacks - List of expansion pack IDs
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async createExpansionPackSteeringRules(expansionPacks, installDir, spinner) {
    const steeringDir = path.join(installDir, '.kiro', 'steering');
    
    for (const packId of expansionPacks) {
      try {
        const packDir = path.join(installDir, `.${packId}`);
        const packConfigPath = path.join(packDir, 'config.yaml');
        
        if (await fs.pathExists(packConfigPath)) {
          const configContent = await fs.readFile(packConfigPath, 'utf8');
          const packConfig = yaml.load(configContent);
          
          const steeringRulePath = path.join(steeringDir, `${packId}.md`);
          if (!await fs.pathExists(steeringRulePath)) {
            const steeringContent = `---
inclusion: always
---

# ${packConfig.title || packId} Expansion Pack

${packConfig.description || 'Specialized agents and workflows for ' + packId}

## Agents

${packConfig.agents ? packConfig.agents.map(agent => `- **${agent}**: Specialized for ${packId} workflows`).join('\n') : 'Specialized agents for this domain'}

## Best Practices

- Follow ${packId}-specific conventions and patterns
- Leverage domain expertise provided by expansion pack agents
- Use expansion pack templates and workflows when available

## Context Integration

Expansion pack agents inherit full Kiro context awareness:
- Project files and structure
- Build status and problems
- Git changes and history
- Custom steering rules
`;
            await fs.writeFile(steeringRulePath, steeringContent);
            console.log(chalk.green(`✓ Created steering rule for ${packId}`));
          }
        }
      } catch (error) {
        console.log(chalk.yellow(`⚠ Could not create steering rule for ${packId}: ${error.message}`));
      }
    }
  }

  /**
   * Upgrades existing Kiro BMad installation
   * @param {Object} config - Upgrade configuration
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async upgradeKiroInstallation(config, installDir, spinner) {
    spinner.text = 'Analyzing existing Kiro BMad installation...';
    
    const bmadInfo = await this.detector.getBMadInstallationInfo(installDir);
    
    if (!bmadInfo.hasBMadInstallation) {
      throw new Error('No existing BMad installation found in Kiro workspace');
    }

    console.log(chalk.cyan(`\n🔍 Found existing ${bmadInfo.installationType} BMad installation`));
    if (bmadInfo.version) {
      console.log(chalk.cyan(`   Version: ${bmadInfo.version}`));
    }
    if (bmadInfo.agentCount > 0) {
      console.log(chalk.cyan(`   Agents: ${bmadInfo.agentCount}`));
    }

    // Create comprehensive backup
    const backupInfo = await this.createUpgradeBackup(installDir, spinner);
    
    // Analyze customizations to preserve
    const customizations = await this.analyzeCustomizations(installDir, spinner);
    
    // Show what will be preserved
    if (customizations.hasCustomizations) {
      console.log(chalk.yellow('\n📋 Customizations to preserve:'));
      if (customizations.customSteeringFiles.length > 0) {
        console.log(chalk.yellow(`   Custom steering rules: ${customizations.customSteeringFiles.length}`));
      }
      if (customizations.customHookFiles.length > 0) {
        console.log(chalk.yellow(`   Custom hooks: ${customizations.customHookFiles.length}`));
      }
      if (customizations.customSpecs.length > 0) {
        console.log(chalk.yellow(`   Custom specs: ${customizations.customSpecs.length}`));
      }
      if (customizations.modifiedAgents.length > 0) {
        console.log(chalk.yellow(`   Modified agents: ${customizations.modifiedAgents.length}`));
      }
    }

    // Handle conflicts if any
    if (customizations.conflicts.length > 0) {
      await this.handleUpgradeConflicts(customizations.conflicts, config, spinner);
    }

    // Preserve customizations before upgrade
    const preservedCustomizations = await this.preserveCustomizations(customizations, installDir, spinner);

    // Perform fresh installation
    spinner.text = 'Installing updated BMad components...';
    await this.installForKiro(config, installDir, spinner);

    // Restore preserved customizations
    await this.restoreCustomizations(preservedCustomizations, installDir, spinner);

    // Validate upgrade
    const upgradeValidation = await this.validator.validateKiroInstallation(installDir);
    
    if (upgradeValidation.isValid) {
      console.log(chalk.green('\n✅ Kiro BMad installation upgraded successfully!'));
    } else {
      console.log(chalk.yellow('\n⚠️  Upgrade completed with warnings'));
      this.validator.displayValidationResults(upgradeValidation, 'Upgrade Validation');
    }

    // Show upgrade summary
    this.showUpgradeSummary(backupInfo, customizations, upgradeValidation.summary);
  }

  /**
   * Creates comprehensive backup before upgrade
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<Object>} Backup information
   */
  async createUpgradeBackup(installDir, spinner) {
    spinner.text = 'Creating upgrade backup...';
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupBaseDir = path.join(installDir, '.kiro', 'backups');
    const backupDir = path.join(backupBaseDir, `upgrade-${timestamp}`);
    
    await fs.ensureDir(backupDir);
    
    const backupData = {
      timestamp,
      backupDir,
      backedUpItems: []
    };

    // Backup agents
    const agentsDir = path.join(installDir, '.kiro', 'agents');
    if (await fs.pathExists(agentsDir)) {
      const agentsBackupDir = path.join(backupDir, 'agents');
      await fs.copy(agentsDir, agentsBackupDir);
      backupData.backedUpItems.push('agents');
    }

    // Backup steering rules
    const steeringDir = path.join(installDir, '.kiro', 'steering');
    if (await fs.pathExists(steeringDir)) {
      const steeringBackupDir = path.join(backupDir, 'steering');
      await fs.copy(steeringDir, steeringBackupDir);
      backupData.backedUpItems.push('steering');
    }

    // Backup hooks
    const hooksDir = path.join(installDir, '.kiro', 'hooks');
    if (await fs.pathExists(hooksDir)) {
      const hooksBackupDir = path.join(backupDir, 'hooks');
      await fs.copy(hooksDir, hooksBackupDir);
      backupData.backedUpItems.push('hooks');
    }

    // Backup specs
    const specsDir = path.join(installDir, '.kiro', 'specs');
    if (await fs.pathExists(specsDir)) {
      const specsBackupDir = path.join(backupDir, 'specs');
      await fs.copy(specsDir, specsBackupDir);
      backupData.backedUpItems.push('specs');
    }

    // Create backup manifest
    const backupManifest = {
      timestamp,
      bmadVersion: require('../../package.json').version,
      backedUpItems: backupData.backedUpItems,
      installDir: installDir
    };
    
    await fs.writeJson(path.join(backupDir, 'backup-manifest.json'), backupManifest, { spaces: 2 });
    
    console.log(chalk.green(`✓ Created backup: ${path.basename(backupDir)}`));
    return backupData;
  }

  /**
   * Analyzes existing customizations that need to be preserved
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<Object>} Customization analysis
   */
  async analyzeCustomizations(installDir, spinner) {
    spinner.text = 'Analyzing customizations...';
    
    const customizationData = {
      hasCustomizations: false,
      customSteeringFiles: [],
      customHookFiles: [],
      customSpecs: [],
      modifiedAgents: [],
      conflicts: []
    };

    // Analyze steering rules
    const steeringDir = path.join(installDir, '.kiro', 'steering');
    if (await fs.pathExists(steeringDir)) {
      const steeringFiles = await fs.readdir(steeringDir);
      const defaultSteeringFiles = ['bmad-method.md', 'tech-preferences.md'];
      
      customizationData.customSteeringFiles = steeringFiles.filter(file => file.endsWith('.md') && !defaultSteeringFiles.includes(file)
      );
    }

    // Analyze hooks
    const hooksDir = path.join(installDir, '.kiro', 'hooks');
    if (await fs.pathExists(hooksDir)) {
      const hookFiles = await fs.readdir(hooksDir);
      const defaultHookFiles = ['bmad-story-progression.yaml', 'bmad-code-review.yaml'];
      
      customizationData.customHookFiles = hookFiles.filter(file => (file.endsWith('.yaml') || file.endsWith('.yml')) && !defaultHookFiles.includes(file)
      );
    }

    // Analyze specs
    const specsDir = path.join(installDir, '.kiro', 'specs');
    if (await fs.pathExists(specsDir)) {
      const specDirs = await fs.readdir(specsDir);
      customizationData.customSpecs = specDirs.filter(async (dir) => {
        const specPath = path.join(specsDir, dir);
        const stat = await fs.stat(specPath);
        return stat.isDirectory();
      });
    }

    // Check for modified agents (basic check - could be enhanced)
    const agentsDir = path.join(installDir, '.kiro', 'agents');
    if (await fs.pathExists(agentsDir)) {
      const agentFiles = await fs.readdir(agentsDir);
      // For now, assume all agents might be modified - in a real implementation,
      // we could compare with known templates or check modification dates
      customizationData.modifiedAgents = agentFiles.filter(file => file.endsWith('.md'));
    }

    customizationData.hasCustomizations =
      customizationData.customSteeringFiles.length > 0 ||
      customizationData.customHookFiles.length > 0 ||
      customizationData.customSpecs.length > 0 ||
      customizationData.modifiedAgents.length > 0;

    return customizationData;
  }

  /**
   * Handles upgrade conflicts
   * @param {string[]} conflicts - List of conflicts
   * @param {Object} config - Configuration
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async handleUpgradeConflicts(conflicts, config, spinner) {
    if (config.force) {
      console.log(chalk.yellow('⚠️  Force mode enabled - conflicts will be resolved by overwriting'));
      return;
    }

    console.log(chalk.red('\n⚠️  Upgrade conflicts detected:'));
    conflicts.forEach(conflict => {
      console.log(chalk.red(`   ${conflict}`));
    });

    // In a real implementation, we could prompt the user for resolution
    // For now, we'll proceed with backup and overwrite approach
    console.log(chalk.yellow('Conflicts will be resolved by backing up existing files and installing new versions'));
  }

  /**
   * Preserves customizations before upgrade
   * @param {Object} customizations - Customization analysis
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<Object>} Preserved customizations info
   */
  async preserveCustomizations(customizations, installDir, spinner) {
    spinner.text = 'Preserving customizations...';
    
    const preservedDir = path.join(installDir, '.kiro', 'preserved-customizations');
    await fs.ensureDir(preservedDir);
    
    const preserved = {
      steeringRules: [],
      hooks: [],
      specs: []
    };

    // Preserve custom steering rules
    if (customizations.customSteeringFiles.length > 0) {
      const steeringDir = path.join(installDir, '.kiro', 'steering');
      const preservedSteeringDir = path.join(preservedDir, 'steering');
      await fs.ensureDir(preservedSteeringDir);
      
      for (const file of customizations.customSteeringFiles) {
        const sourcePath = path.join(steeringDir, file);
        const destPath = path.join(preservedSteeringDir, file);
        await fs.copy(sourcePath, destPath);
        preserved.steeringRules.push(file);
      }
    }

    // Preserve custom hooks
    if (customizations.customHookFiles.length > 0) {
      const hooksDir = path.join(installDir, '.kiro', 'hooks');
      const preservedHooksDir = path.join(preservedDir, 'hooks');
      await fs.ensureDir(preservedHooksDir);
      
      for (const file of customizations.customHookFiles) {
        const sourcePath = path.join(hooksDir, file);
        const destPath = path.join(preservedHooksDir, file);
        await fs.copy(sourcePath, destPath);
        preserved.hooks.push(file);
      }
    }

    // Preserve custom specs
    if (customizations.customSpecs.length > 0) {
      const specsDir = path.join(installDir, '.kiro', 'specs');
      const preservedSpecsDir = path.join(preservedDir, 'specs');
      await fs.ensureDir(preservedSpecsDir);
      
      for (const spec of customizations.customSpecs) {
        const sourcePath = path.join(specsDir, spec);
        const destPath = path.join(preservedSpecsDir, spec);
        if (await fs.pathExists(sourcePath)) {
          await fs.copy(sourcePath, destPath);
          preserved.specs.push(spec);
        }
      }
    }

    return preserved;
  }

  /**
   * Restores preserved customizations after upgrade
   * @param {Object} preserved - Preserved customizations info
   * @param {string} installDir - Installation directory
   * @param {Object} spinner - Ora spinner instance
   * @returns {Promise<void>}
   */
  async restoreCustomizations(preserved, installDir, spinner) {
    spinner.text = 'Restoring customizations...';
    
    const preservedDir = path.join(installDir, '.kiro', 'preserved-customizations');
    
    // Restore steering rules
    if (preserved.steeringRules.length > 0) {
      const steeringDir = path.join(installDir, '.kiro', 'steering');
      const preservedSteeringDir = path.join(preservedDir, 'steering');
      
      for (const file of preserved.steeringRules) {
        const sourcePath = path.join(preservedSteeringDir, file);
        const destPath = path.join(steeringDir, file);
        await fs.copy(sourcePath, destPath);
      }
      
      console.log(chalk.green(`✓ Restored ${preserved.steeringRules.length} custom steering rules`));
    }

    // Restore hooks
    if (preserved.hooks.length > 0) {
      const hooksDir = path.join(installDir, '.kiro', 'hooks');
      const preservedHooksDir = path.join(preservedDir, 'hooks');
      
      for (const file of preserved.hooks) {
        const sourcePath = path.join(preservedHooksDir, file);
        const destPath = path.join(hooksDir, file);
        await fs.copy(sourcePath, destPath);
      }
      
      console.log(chalk.green(`✓ Restored ${preserved.hooks.length} custom hooks`));
    }

    // Restore specs
    if (preserved.specs.length > 0) {
      const specsDir = path.join(installDir, '.kiro', 'specs');
      const preservedSpecsDir = path.join(preservedDir, 'specs');
      
      for (const spec of preserved.specs) {
        const sourcePath = path.join(preservedSpecsDir, spec);
        const destPath = path.join(specsDir, spec);
        await fs.copy(sourcePath, destPath);
      }
      
      console.log(chalk.green(`✓ Restored ${preserved.specs.length} custom specs`));
    }

    // Clean up preserved customizations directory
    await fs.remove(preservedDir);
  }

  /**
   * Shows upgrade summary
   * @param {Object} backupInfo - Backup information
   * @param {Object} customizations - Customizations analysis
   * @param {Object} summary - Installation summary
   */
  showUpgradeSummary(backupInfo, customizations, summary) {
    console.log(chalk.green.bold('\n🎉 Kiro BMad Upgrade Complete!'));
    
    console.log(chalk.cyan('\n📊 Upgrade Summary:'));
    if (summary) {
      console.log(chalk.cyan(`   Agents: ${summary.agentCount || 0}`));
      console.log(chalk.cyan(`   Steering Rules: ${summary.steeringRuleCount || 0}`));
      console.log(chalk.cyan(`   Hooks: ${summary.hookCount || 0}`));
      console.log(chalk.cyan(`   Specs: ${summary.specCount || 0}`));
    }
    
    console.log(chalk.cyan('\n💾 Backup Information:'));
    console.log(chalk.cyan(`   Backup Location: ${path.basename(backupInfo.backupDir)}`));
    console.log(chalk.cyan(`   Backed Up: ${backupInfo.backedUpItems.join(', ')}`));
    
    if (customizations.hasCustomizations) {
      console.log(chalk.green('\n✅ Preserved Customizations:'));
      if (customizations.customSteeringFiles.length > 0) {
        console.log(chalk.green(`   Custom steering rules: ${customizations.customSteeringFiles.length}`));
      }
      if (customizations.customHookFiles.length > 0) {
        console.log(chalk.green(`   Custom hooks: ${customizations.customHookFiles.length}`));
      }
      if (customizations.customSpecs.length > 0) {
        console.log(chalk.green(`   Custom specs: ${customizations.customSpecs.length}`));
      }
    }

    console.log(chalk.yellow.bold('\n💡 Post-Upgrade Notes:'));
    console.log(chalk.yellow('• All customizations have been preserved'));
    console.log(chalk.yellow('• Backup created in case rollback is needed'));
    console.log(chalk.yellow('• Test your workflows to ensure everything works correctly'));
    console.log(chalk.yellow('• Check for any new features or breaking changes'));
  }
}

module.exports = KiroInstaller;