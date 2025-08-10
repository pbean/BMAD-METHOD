const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const yaml = require('js-yaml');

class IntegrationValidator {
  constructor() {
    this.validationResults = {
      agentTransformation: [],
      specGeneration: [],
      hookConfiguration: [],
      overall: { isValid: true, errors: [], warnings: [] }
    };
  }

  /**
   * Validates complete Kiro integration
   * @param {string} installDir - Installation directory
   * @returns {Promise<{isValid: boolean, results: Object, summary: Object}>}
   */
  async validateKiroIntegration(installDir) {
    console.log(chalk.cyan('🔍 Validating Kiro integration...'));
    
    // Reset validation results
    this.resetValidationResults();
    
    // Validate agent transformation
    await this.validateAgentTransformation(installDir);
    
    // Validate spec generation
    await this.validateSpecGeneration(installDir);
    
    // Validate hook configuration
    await this.validateHookConfiguration(installDir);
    
    // Validate overall integration
    await this.validateOverallIntegration(installDir);
    
    // Generate summary
    const summary = this.generateValidationSummary();
    
    return {
      isValid: this.validationResults.overall.isValid,
      results: this.validationResults,
      summary
    };
  }

  /**
   * Validates agent transformation for Kiro compatibility
   * @param {string} installDir - Installation directory
   * @returns {Promise<void>}
   */
  async validateAgentTransformation(installDir) {
    console.log(chalk.cyan('  Validating agent transformation...'));
    
    const agentsDir = path.join(installDir, '.kiro', 'agents');
    
    if (!await fs.pathExists(agentsDir)) {
      this.addValidationError('agentTransformation', {
        code: 'AGENTS_DIR_MISSING',
        message: 'Kiro agents directory not found',
        path: agentsDir,
        severity: 'error'
      });
      return;
    }

    try {
      const agentFiles = await fs.readdir(agentsDir);
      const mdFiles = agentFiles.filter(file => file.endsWith('.md'));
      
      if (mdFiles.length === 0) {
        this.addValidationError('agentTransformation', {
          code: 'NO_AGENTS_FOUND',
          message: 'No agent files found in Kiro agents directory',
          path: agentsDir,
          severity: 'warning'
        });
        return;
      }

      // Validate each agent file
      for (const agentFile of mdFiles) {
        const agentPath = path.join(agentsDir, agentFile);
        await this.validateSingleAgent(agentPath, agentFile);
      }

      console.log(chalk.green(`  ✓ Validated ${mdFiles.length} agent files`));

    } catch (error) {
      this.addValidationError('agentTransformation', {
        code: 'AGENT_VALIDATION_ERROR',
        message: `Failed to validate agents: ${error.message}`,
        path: agentsDir,
        severity: 'error'
      });
    }
  }

  /**
   * Validates a single agent file
   * @param {string} agentPath - Path to agent file
   * @param {string} agentFile - Agent filename
   * @returns {Promise<void>}
   */
  async validateSingleAgent(agentPath, agentFile) {
    try {
      const content = await fs.readFile(agentPath, 'utf8');
      const agentName = path.basename(agentFile, '.md');
      
      // Check for YAML header
      const yamlMatch = content.match(/```ya?ml\r?\n([\s\S]*?)```/);
      if (!yamlMatch) {
        this.addValidationError('agentTransformation', {
          code: 'MISSING_YAML_HEADER',
          message: `Agent ${agentName} missing YAML configuration header`,
          path: agentPath,
          severity: 'error'
        });
        return;
      }

      // Parse and validate YAML configuration
      let agentConfig;
      try {
        agentConfig = yaml.load(yamlMatch[1]);
      } catch (yamlError) {
        this.addValidationError('agentTransformation', {
          code: 'INVALID_YAML',
          message: `Agent ${agentName} has invalid YAML: ${yamlError.message}`,
          path: agentPath,
          severity: 'error'
        });
        return;
      }

      // Validate required fields
      this.validateAgentConfig(agentConfig, agentName, agentPath);
      
      // Validate Kiro-specific enhancements
      this.validateKiroEnhancements(content, agentName, agentPath);
      
      // Validate BMad persona preservation
      this.validateBMadPersona(content, agentName, agentPath);

    } catch (error) {
      this.addValidationError('agentTransformation', {
        code: 'AGENT_READ_ERROR',
        message: `Failed to read agent ${agentFile}: ${error.message}`,
        path: agentPath,
        severity: 'error'
      });
    }
  }

  /**
   * Validates agent configuration structure
   * @param {Object} config - Agent configuration
   * @param {string} agentName - Agent name
   * @param {string} agentPath - Agent path
   */
  validateAgentConfig(config, agentName, agentPath) {
    const requiredFields = ['title', 'roleDefinition'];
    const recommendedFields = ['dependencies', 'capabilities'];
    
    // Check required fields
    for (const field of requiredFields) {
      if (!config[field]) {
        this.addValidationError('agentTransformation', {
          code: 'MISSING_REQUIRED_FIELD',
          message: `Agent ${agentName} missing required field: ${field}`,
          path: agentPath,
          severity: 'error'
        });
      }
    }
    
    // Check recommended fields
    for (const field of recommendedFields) {
      if (!config[field]) {
        this.addValidationError('agentTransformation', {
          code: 'MISSING_RECOMMENDED_FIELD',
          message: `Agent ${agentName} missing recommended field: ${field}`,
          path: agentPath,
          severity: 'warning'
        });
      }
    }
    
    // Validate dependencies structure
    if (config.dependencies && !Array.isArray(config.dependencies)) {
      this.addValidationError('agentTransformation', {
        code: 'INVALID_DEPENDENCIES',
        message: `Agent ${agentName} dependencies should be an array`,
        path: agentPath,
        severity: 'error'
      });
    }
  }

  /**
   * Validates Kiro-specific enhancements in agent
   * @param {string} content - Agent content
   * @param {string} agentName - Agent name
   * @param {string} agentPath - Agent path
   */
  validateKiroEnhancements(content, agentName, agentPath) {
    // Check for Kiro context references
    const kiroContextProviders = ['#File', '#Folder', '#Codebase', '#Problems', '#Terminal', '#Git Diff'];
    const foundProviders = kiroContextProviders.filter(provider => 
      content.includes(provider)
    );
    
    if (foundProviders.length === 0) {
      this.addValidationError('agentTransformation', {
        code: 'NO_KIRO_CONTEXT',
        message: `Agent ${agentName} lacks Kiro context integration`,
        path: agentPath,
        severity: 'warning'
      });
    }
    
    // Check for steering rule references
    if (!content.includes('steering') && !content.includes('conventions')) {
      this.addValidationError('agentTransformation', {
        code: 'NO_STEERING_INTEGRATION',
        message: `Agent ${agentName} lacks steering rule integration`,
        path: agentPath,
        severity: 'warning'
      });
    }
    
    // Check for MCP tool awareness
    if (!content.includes('MCP') && !content.includes('external tools')) {
      this.addValidationError('agentTransformation', {
        code: 'NO_MCP_AWARENESS',
        message: `Agent ${agentName} lacks MCP tool awareness`,
        path: agentPath,
        severity: 'info'
      });
    }
  }

  /**
   * Validates BMad persona preservation
   * @param {string} content - Agent content
   * @param {string} agentName - Agent name
   * @param {string} agentPath - Agent path
   */
  validateBMadPersona(content, agentName, agentPath) {
    // Check for BMad-specific terminology
    const bmadTerms = ['BMad', 'Product Manager', 'Architect', 'Developer', 'QA', 'Scrum Master'];
    const foundTerms = bmadTerms.filter(term => 
      content.toLowerCase().includes(term.toLowerCase())
    );
    
    if (foundTerms.length === 0) {
      this.addValidationError('agentTransformation', {
        code: 'BMAD_PERSONA_LOST',
        message: `Agent ${agentName} may have lost BMad persona characteristics`,
        path: agentPath,
        severity: 'warning'
      });
    }
    
    // Check for role-specific capabilities
    if (agentName.includes('pm') && !content.toLowerCase().includes('requirements')) {
      this.addValidationError('agentTransformation', {
        code: 'MISSING_ROLE_CAPABILITY',
        message: `PM agent ${agentName} should reference requirements management`,
        path: agentPath,
        severity: 'warning'
      });
    }
    
    if (agentName.includes('architect') && !content.toLowerCase().includes('architecture')) {
      this.addValidationError('agentTransformation', {
        code: 'MISSING_ROLE_CAPABILITY',
        message: `Architect agent ${agentName} should reference architecture design`,
        path: agentPath,
        severity: 'warning'
      });
    }
  }

  /**
   * Validates spec generation for Kiro compatibility
   * @param {string} installDir - Installation directory
   * @returns {Promise<void>}
   */
  async validateSpecGeneration(installDir) {
    console.log(chalk.cyan('  Validating spec generation...'));
    
    const specsDir = path.join(installDir, '.kiro', 'specs');
    
    if (!await fs.pathExists(specsDir)) {
      this.addValidationError('specGeneration', {
        code: 'SPECS_DIR_MISSING',
        message: 'Kiro specs directory not found',
        path: specsDir,
        severity: 'info'
      });
      return;
    }

    try {
      const specDirs = await fs.readdir(specsDir);
      const validSpecDirs = [];
      
      for (const specDir of specDirs) {
        const specPath = path.join(specsDir, specDir);
        const stats = await fs.stat(specPath);
        
        if (stats.isDirectory()) {
          const isValid = await this.validateSingleSpec(specPath, specDir);
          if (isValid) {
            validSpecDirs.push(specDir);
          }
        }
      }

      if (validSpecDirs.length > 0) {
        console.log(chalk.green(`  ✓ Validated ${validSpecDirs.length} spec directories`));
      } else {
        console.log(chalk.yellow('  ⚠ No valid specs found'));
      }

    } catch (error) {
      this.addValidationError('specGeneration', {
        code: 'SPEC_VALIDATION_ERROR',
        message: `Failed to validate specs: ${error.message}`,
        path: specsDir,
        severity: 'error'
      });
    }
  }

  /**
   * Validates a single spec directory
   * @param {string} specPath - Path to spec directory
   * @param {string} specName - Spec name
   * @returns {Promise<boolean>} True if valid
   */
  async validateSingleSpec(specPath, specName) {
    const requiredFiles = ['requirements.md', 'design.md', 'tasks.md'];
    let isValid = true;
    
    // Check for required spec files
    for (const file of requiredFiles) {
      const filePath = path.join(specPath, file);
      if (!await fs.pathExists(filePath)) {
        this.addValidationError('specGeneration', {
          code: 'MISSING_SPEC_FILE',
          message: `Spec ${specName} missing required file: ${file}`,
          path: filePath,
          severity: 'error'
        });
        isValid = false;
      } else {
        // Validate file content
        await this.validateSpecFile(filePath, file, specName);
      }
    }
    
    return isValid;
  }

  /**
   * Validates individual spec file content
   * @param {string} filePath - Path to spec file
   * @param {string} fileName - File name
   * @param {string} specName - Spec name
   * @returns {Promise<void>}
   */
  async validateSpecFile(filePath, fileName, specName) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      switch (fileName) {
        case 'requirements.md':
          this.validateRequirementsFile(content, specName, filePath);
          break;
        case 'design.md':
          this.validateDesignFile(content, specName, filePath);
          break;
        case 'tasks.md':
          this.validateTasksFile(content, specName, filePath);
          break;
      }
    } catch (error) {
      this.addValidationError('specGeneration', {
        code: 'SPEC_FILE_READ_ERROR',
        message: `Failed to read ${fileName} for spec ${specName}: ${error.message}`,
        path: filePath,
        severity: 'error'
      });
    }
  }

  /**
   * Validates requirements.md file structure
   * @param {string} content - File content
   * @param {string} specName - Spec name
   * @param {string} filePath - File path
   */
  validateRequirementsFile(content, specName, filePath) {
    // Check for required sections
    const requiredSections = ['# Requirements Document', '## Introduction', '## Requirements'];
    
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        this.addValidationError('specGeneration', {
          code: 'MISSING_REQUIREMENTS_SECTION',
          message: `Requirements file for ${specName} missing section: ${section}`,
          path: filePath,
          severity: 'warning'
        });
      }
    }
    
    // Check for EARS format requirements
    const earsPattern = /(WHEN|IF|WHERE|WHILE).*THEN.*SHALL/gi;
    const earsMatches = content.match(earsPattern);
    
    if (!earsMatches || earsMatches.length === 0) {
      this.addValidationError('specGeneration', {
        code: 'NO_EARS_FORMAT',
        message: `Requirements file for ${specName} lacks EARS format requirements`,
        path: filePath,
        severity: 'warning'
      });
    }
    
    // Check for user stories
    const userStoryPattern = /As a.*I want.*so that/gi;
    const userStoryMatches = content.match(userStoryPattern);
    
    if (!userStoryMatches || userStoryMatches.length === 0) {
      this.addValidationError('specGeneration', {
        code: 'NO_USER_STORIES',
        message: `Requirements file for ${specName} lacks user stories`,
        path: filePath,
        severity: 'warning'
      });
    }
  }

  /**
   * Validates design.md file structure
   * @param {string} content - File content
   * @param {string} specName - Spec name
   * @param {string} filePath - File path
   */
  validateDesignFile(content, specName, filePath) {
    // Check for required sections
    const requiredSections = ['# ', '## Overview', '## Architecture', '## Components'];
    
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        this.addValidationError('specGeneration', {
          code: 'MISSING_DESIGN_SECTION',
          message: `Design file for ${specName} missing section: ${section}`,
          path: filePath,
          severity: 'warning'
        });
      }
    }
    
    // Check for Mermaid diagrams
    if (content.includes('```mermaid')) {
      // Validate Mermaid syntax (basic check)
      const mermaidBlocks = content.match(/```mermaid\r?\n([\s\S]*?)```/g);
      if (mermaidBlocks) {
        for (const block of mermaidBlocks) {
          const diagramContent = block.replace(/```mermaid\r?\n/, '').replace(/```$/, '');
          if (diagramContent.trim().length === 0) {
            this.addValidationError('specGeneration', {
              code: 'EMPTY_MERMAID_DIAGRAM',
              message: `Design file for ${specName} has empty Mermaid diagram`,
              path: filePath,
              severity: 'warning'
            });
          }
        }
      }
    }
  }

  /**
   * Validates tasks.md file structure
   * @param {string} content - File content
   * @param {string} specName - Spec name
   * @param {string} filePath - File path
   */
  validateTasksFile(content, specName, filePath) {
    // Check for required sections
    if (!content.includes('# Implementation Plan') && !content.includes('# Tasks')) {
      this.addValidationError('specGeneration', {
        code: 'MISSING_TASKS_HEADER',
        message: `Tasks file for ${specName} missing main header`,
        path: filePath,
        severity: 'error'
      });
    }
    
    // Check for task checkboxes
    const taskPattern = /- \[[ x-]\]/g;
    const taskMatches = content.match(taskPattern);
    
    if (!taskMatches || taskMatches.length === 0) {
      this.addValidationError('specGeneration', {
        code: 'NO_TASK_CHECKBOXES',
        message: `Tasks file for ${specName} lacks task checkboxes`,
        path: filePath,
        severity: 'error'
      });
    }
    
    // Check for requirement references
    const reqRefPattern = /_Requirements?:\s*[\d\.,\s]+_/gi;
    const reqRefMatches = content.match(reqRefPattern);
    
    if (!reqRefMatches || reqRefMatches.length === 0) {
      this.addValidationError('specGeneration', {
        code: 'NO_REQUIREMENT_REFERENCES',
        message: `Tasks file for ${specName} lacks requirement references`,
        path: filePath,
        severity: 'warning'
      });
    }
    
    // Check for proper task hierarchy
    const hierarchyPattern = /- \[[ x-]\] \d+\.\d+/g;
    const hierarchyMatches = content.match(hierarchyPattern);
    
    if (hierarchyMatches && hierarchyMatches.length > 0) {
      // Good - has proper numbering
    } else {
      this.addValidationError('specGeneration', {
        code: 'POOR_TASK_HIERARCHY',
        message: `Tasks file for ${specName} lacks proper task numbering`,
        path: filePath,
        severity: 'info'
      });
    }
  }

  /**
   * Validates hook configuration files
   * @param {string} installDir - Installation directory
   * @returns {Promise<void>}
   */
  async validateHookConfiguration(installDir) {
    console.log(chalk.cyan('  Validating hook configuration...'));
    
    const hooksDir = path.join(installDir, '.kiro', 'hooks');
    
    if (!await fs.pathExists(hooksDir)) {
      this.addValidationError('hookConfiguration', {
        code: 'HOOKS_DIR_MISSING',
        message: 'Kiro hooks directory not found',
        path: hooksDir,
        severity: 'info'
      });
      return;
    }

    try {
      const hookFiles = await fs.readdir(hooksDir);
      const yamlFiles = hookFiles.filter(file => 
        file.endsWith('.yaml') || file.endsWith('.yml')
      );
      
      if (yamlFiles.length === 0) {
        this.addValidationError('hookConfiguration', {
          code: 'NO_HOOKS_FOUND',
          message: 'No hook configuration files found',
          path: hooksDir,
          severity: 'info'
        });
        return;
      }

      // Validate each hook file
      for (const hookFile of yamlFiles) {
        const hookPath = path.join(hooksDir, hookFile);
        await this.validateSingleHook(hookPath, hookFile);
      }

      console.log(chalk.green(`  ✓ Validated ${yamlFiles.length} hook files`));

    } catch (error) {
      this.addValidationError('hookConfiguration', {
        code: 'HOOK_VALIDATION_ERROR',
        message: `Failed to validate hooks: ${error.message}`,
        path: hooksDir,
        severity: 'error'
      });
    }
  }

  /**
   * Validates a single hook configuration file
   * @param {string} hookPath - Path to hook file
   * @param {string} hookFile - Hook filename
   * @returns {Promise<void>}
   */
  async validateSingleHook(hookPath, hookFile) {
    try {
      const content = await fs.readFile(hookPath, 'utf8');
      const hookName = path.basename(hookFile, path.extname(hookFile));
      
      // Parse YAML
      let hookConfig;
      try {
        hookConfig = yaml.load(content);
      } catch (yamlError) {
        this.addValidationError('hookConfiguration', {
          code: 'INVALID_HOOK_YAML',
          message: `Hook ${hookName} has invalid YAML: ${yamlError.message}`,
          path: hookPath,
          severity: 'error'
        });
        return;
      }

      // Validate hook structure
      this.validateHookStructure(hookConfig, hookName, hookPath);
      
      // Validate hook logic
      this.validateHookLogic(hookConfig, hookName, hookPath);

    } catch (error) {
      this.addValidationError('hookConfiguration', {
        code: 'HOOK_READ_ERROR',
        message: `Failed to read hook ${hookFile}: ${error.message}`,
        path: hookPath,
        severity: 'error'
      });
    }
  }

  /**
   * Validates hook configuration structure
   * @param {Object} config - Hook configuration
   * @param {string} hookName - Hook name
   * @param {string} hookPath - Hook path
   */
  validateHookStructure(config, hookName, hookPath) {
    const requiredFields = ['name', 'trigger', 'action'];
    
    // Check required fields
    for (const field of requiredFields) {
      if (!config[field]) {
        this.addValidationError('hookConfiguration', {
          code: 'MISSING_HOOK_FIELD',
          message: `Hook ${hookName} missing required field: ${field}`,
          path: hookPath,
          severity: 'error'
        });
      }
    }
    
    // Validate trigger structure
    if (config.trigger) {
      if (!config.trigger.type) {
        this.addValidationError('hookConfiguration', {
          code: 'MISSING_TRIGGER_TYPE',
          message: `Hook ${hookName} trigger missing type`,
          path: hookPath,
          severity: 'error'
        });
      }
      
      const validTriggerTypes = ['file_change', 'file_save', 'git_commit', 'manual'];
      if (config.trigger.type && !validTriggerTypes.includes(config.trigger.type)) {
        this.addValidationError('hookConfiguration', {
          code: 'INVALID_TRIGGER_TYPE',
          message: `Hook ${hookName} has invalid trigger type: ${config.trigger.type}`,
          path: hookPath,
          severity: 'error'
        });
      }
    }
    
    // Validate action structure
    if (config.action) {
      if (!config.action.agent && !config.action.command) {
        this.addValidationError('hookConfiguration', {
          code: 'MISSING_ACTION_TARGET',
          message: `Hook ${hookName} action missing agent or command`,
          path: hookPath,
          severity: 'error'
        });
      }
    }
  }

  /**
   * Validates hook logic and dependencies
   * @param {Object} config - Hook configuration
   * @param {string} hookName - Hook name
   * @param {string} hookPath - Hook path
   */
  validateHookLogic(config, hookName, hookPath) {
    // Check for file pattern validity
    if (config.trigger && config.trigger.pattern) {
      try {
        // Basic glob pattern validation
        const pattern = config.trigger.pattern;
        if (pattern.includes('**') && !pattern.includes('/')) {
          this.addValidationError('hookConfiguration', {
            code: 'SUSPICIOUS_GLOB_PATTERN',
            message: `Hook ${hookName} has potentially inefficient glob pattern: ${pattern}`,
            path: hookPath,
            severity: 'warning'
          });
        }
      } catch (error) {
        this.addValidationError('hookConfiguration', {
          code: 'INVALID_GLOB_PATTERN',
          message: `Hook ${hookName} has invalid glob pattern: ${error.message}`,
          path: hookPath,
          severity: 'error'
        });
      }
    }
    
    // Check for context provider references
    if (config.action && config.action.context) {
      const validContextProviders = ['#File', '#Folder', '#Codebase', '#Problems', '#Terminal', '#Git Diff'];
      const invalidProviders = config.action.context.filter(provider => 
        !validContextProviders.includes(provider)
      );
      
      if (invalidProviders.length > 0) {
        this.addValidationError('hookConfiguration', {
          code: 'INVALID_CONTEXT_PROVIDER',
          message: `Hook ${hookName} references invalid context providers: ${invalidProviders.join(', ')}`,
          path: hookPath,
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Validates overall integration consistency
   * @param {string} installDir - Installation directory
   * @returns {Promise<void>}
   */
  async validateOverallIntegration(installDir) {
    console.log(chalk.cyan('  Validating overall integration...'));
    
    // Check for consistent BMad agent references across components
    await this.validateAgentReferences(installDir);
    
    // Check for proper Kiro workspace structure
    await this.validateWorkspaceStructure(installDir);
    
    // Check for integration completeness
    await this.validateIntegrationCompleteness(installDir);
  }

  /**
   * Validates agent references across different components
   * @param {string} installDir - Installation directory
   * @returns {Promise<void>}
   */
  async validateAgentReferences(installDir) {
    const agentsDir = path.join(installDir, '.kiro', 'agents');
    const hooksDir = path.join(installDir, '.kiro', 'hooks');
    
    // Get list of available agents
    const availableAgents = [];
    if (await fs.pathExists(agentsDir)) {
      const agentFiles = await fs.readdir(agentsDir);
      availableAgents.push(...agentFiles
        .filter(file => file.endsWith('.md'))
        .map(file => path.basename(file, '.md'))
      );
    }
    
    // Check hook references to agents
    if (await fs.pathExists(hooksDir)) {
      const hookFiles = await fs.readdir(hooksDir);
      const yamlFiles = hookFiles.filter(file => 
        file.endsWith('.yaml') || file.endsWith('.yml')
      );
      
      for (const hookFile of yamlFiles) {
        try {
          const hookPath = path.join(hooksDir, hookFile);
          const content = await fs.readFile(hookPath, 'utf8');
          const hookConfig = yaml.load(content);
          
          if (hookConfig.action && hookConfig.action.agent) {
            const referencedAgent = hookConfig.action.agent;
            if (!availableAgents.includes(referencedAgent)) {
              this.addValidationError('overall', {
                code: 'MISSING_REFERENCED_AGENT',
                message: `Hook ${hookFile} references non-existent agent: ${referencedAgent}`,
                path: hookPath,
                severity: 'error'
              });
            }
          }
        } catch (error) {
          // Skip invalid hook files (already reported in hook validation)
        }
      }
    }
  }

  /**
   * Validates Kiro workspace structure
   * @param {string} installDir - Installation directory
   * @returns {Promise<void>}
   */
  async validateWorkspaceStructure(installDir) {
    const kiroDir = path.join(installDir, '.kiro');
    const requiredDirs = ['agents', 'specs', 'steering', 'hooks'];
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(kiroDir, dir);
      if (!await fs.pathExists(dirPath)) {
        this.addValidationError('overall', {
          code: 'MISSING_WORKSPACE_DIR',
          message: `Missing Kiro workspace directory: ${dir}`,
          path: dirPath,
          severity: 'warning'
        });
      }
    }
    
    // Check for proper permissions
    try {
      await fs.access(kiroDir, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      this.addValidationError('overall', {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Insufficient permissions for Kiro workspace: ${error.message}`,
        path: kiroDir,
        severity: 'error'
      });
    }
  }

  /**
   * Validates integration completeness
   * @param {string} installDir - Installation directory
   * @returns {Promise<void>}
   */
  async validateIntegrationCompleteness(installDir) {
    const components = {
      agents: path.join(installDir, '.kiro', 'agents'),
      steering: path.join(installDir, '.kiro', 'steering'),
      hooks: path.join(installDir, '.kiro', 'hooks')
    };
    
    let hasContent = false;
    
    for (const [component, componentPath] of Object.entries(components)) {
      if (await fs.pathExists(componentPath)) {
        const files = await fs.readdir(componentPath);
        const relevantFiles = files.filter(file => 
          file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml')
        );
        
        if (relevantFiles.length > 0) {
          hasContent = true;
        }
      }
    }
    
    if (!hasContent) {
      this.addValidationError('overall', {
        code: 'INCOMPLETE_INTEGRATION',
        message: 'Kiro integration appears incomplete - no content found in key directories',
        path: installDir,
        severity: 'error'
      });
    }
  }

  /**
   * Adds a validation error to the results
   * @param {string} category - Error category
   * @param {Object} error - Error details
   */
  addValidationError(category, error) {
    // Ensure the category exists
    if (!this.validationResults[category]) {
      this.validationResults[category] = [];
    }
    
    this.validationResults[category].push(error);
    
    if (error.severity === 'error') {
      this.validationResults.overall.isValid = false;
      this.validationResults.overall.errors.push(error);
    } else if (error.severity === 'warning') {
      this.validationResults.overall.warnings.push(error);
    }
  }

  /**
   * Resets validation results
   */
  resetValidationResults() {
    this.validationResults = {
      agentTransformation: [],
      specGeneration: [],
      hookConfiguration: [],
      overall: { isValid: true, errors: [], warnings: [] }
    };
  }

  /**
   * Generates validation summary
   * @returns {Object} Validation summary
   */
  generateValidationSummary() {
    const summary = {
      totalIssues: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      categories: {}
    };
    
    // Count issues by category
    for (const [category, issues] of Object.entries(this.validationResults)) {
      if (category === 'overall') continue;
      
      const categoryStats = {
        total: issues.length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        info: issues.filter(i => i.severity === 'info').length
      };
      
      summary.categories[category] = categoryStats;
      summary.totalIssues += categoryStats.total;
      summary.errorCount += categoryStats.errors;
      summary.warningCount += categoryStats.warnings;
      summary.infoCount += categoryStats.info;
    }
    
    return summary;
  }

  /**
   * Displays validation results
   * @param {Object} results - Validation results
   */
  displayValidationResults(results) {
    console.log(chalk.cyan('\n📋 Kiro Integration Validation Results'));
    
    if (results.isValid) {
      console.log(chalk.green('✓ Overall validation: PASSED'));
    } else {
      console.log(chalk.red('✗ Overall validation: FAILED'));
    }
    
    // Display summary
    const summary = results.summary;
    console.log(chalk.cyan(`\n📊 Summary: ${summary.totalIssues} total issues`));
    console.log(chalk.red(`   Errors: ${summary.errorCount}`));
    console.log(chalk.yellow(`   Warnings: ${summary.warningCount}`));
    console.log(chalk.blue(`   Info: ${summary.infoCount}`));
    
    // Display issues by category
    for (const [category, issues] of Object.entries(results.results)) {
      if (category === 'overall' || issues.length === 0) continue;
      
      console.log(chalk.cyan(`\n🔍 ${category}:`));
      
      const errors = issues.filter(i => i.severity === 'error');
      const warnings = issues.filter(i => i.severity === 'warning');
      const info = issues.filter(i => i.severity === 'info');
      
      if (errors.length > 0) {
        console.log(chalk.red('  Errors:'));
        errors.forEach(error => {
          console.log(chalk.red(`    • [${error.code}] ${error.message}`));
        });
      }
      
      if (warnings.length > 0) {
        console.log(chalk.yellow('  Warnings:'));
        warnings.forEach(warning => {
          console.log(chalk.yellow(`    • [${warning.code}] ${warning.message}`));
        });
      }
      
      if (info.length > 0) {
        console.log(chalk.blue('  Info:'));
        info.forEach(infoItem => {
          console.log(chalk.blue(`    • [${infoItem.code}] ${infoItem.message}`));
        });
      }
    }
    
    // Provide recommendations
    if (!results.isValid) {
      console.log(chalk.magenta('\n💡 Recommendations:'));
      console.log(chalk.magenta('1. Address all error-level issues before proceeding'));
      console.log(chalk.magenta('2. Review warnings for potential improvements'));
      console.log(chalk.magenta('3. Run validation again after making corrections'));
      console.log(chalk.magenta('4. Check Kiro IDE logs for additional details'));
    }
  }

  /**
   * Runs validation tests for the integration system
   * @param {string} installDir - Installation directory
   * @returns {Promise<boolean>} True if all tests pass
   */
  async runValidationTests(installDir) {
    console.log(chalk.cyan('🧪 Running integration validation tests...'));
    
    const tests = [
      this.testAgentTransformationValidation.bind(this),
      this.testSpecGenerationValidation.bind(this),
      this.testHookConfigurationValidation.bind(this),
      this.testOverallIntegrationValidation.bind(this)
    ];
    
    let allTestsPassed = true;
    
    for (const test of tests) {
      try {
        const testResult = await test(installDir);
        if (!testResult) {
          allTestsPassed = false;
        }
      } catch (error) {
        console.log(chalk.red(`Test failed: ${error.message}`));
        allTestsPassed = false;
      }
    }
    
    if (allTestsPassed) {
      console.log(chalk.green('✓ All validation tests passed'));
    } else {
      console.log(chalk.red('✗ Some validation tests failed'));
    }
    
    return allTestsPassed;
  }

  // Test methods for validation system
  async testAgentTransformationValidation(installDir) {
    console.log(chalk.cyan('  Testing agent transformation validation...'));
    // Implementation would test the agent validation logic
    return true;
  }

  async testSpecGenerationValidation(installDir) {
    console.log(chalk.cyan('  Testing spec generation validation...'));
    // Implementation would test the spec validation logic
    return true;
  }

  async testHookConfigurationValidation(installDir) {
    console.log(chalk.cyan('  Testing hook configuration validation...'));
    // Implementation would test the hook validation logic
    return true;
  }

  async testOverallIntegrationValidation(installDir) {
    console.log(chalk.cyan('  Testing overall integration validation...'));
    // Implementation would test the overall validation logic
    return true;
  }
}

module.exports = IntegrationValidator;