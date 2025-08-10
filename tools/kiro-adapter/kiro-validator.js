const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

class KiroValidator {
  /**
   * Validates Kiro workspace requirements
   * @param {string} directory - Directory to validate
   * @returns {Promise<{isValid: boolean, errors: string[], warnings: string[]}>}
   */
  async validateKiroWorkspace(directory) {
    const errors = [];
    const warnings = [];

    // Check for .kiro directory
    const kiroDir = path.join(directory, '.kiro');
    if (!await fs.pathExists(kiroDir)) {
      errors.push('Missing .kiro directory - not a Kiro workspace');
      return { isValid: false, errors, warnings };
    }

    // Check for required subdirectories
    const requiredDirs = ['agents', 'specs', 'steering'];
    for (const dir of requiredDirs) {
      const dirPath = path.join(kiroDir, dir);
      if (!await fs.pathExists(dirPath)) {
        warnings.push(`Missing .kiro/${dir} directory - will be created`);
      }
    }

    // Check for Kiro-specific files that indicate proper setup
    const kiroIndicators = [
      'package.json',
      '.kiro/settings',
      '.kiro/agents',
      'tsconfig.json',
      'vscode/settings.json'
    ];

    let hasKiroIndicators = false;
    for (const indicator of kiroIndicators) {
      if (await fs.pathExists(path.join(directory, indicator))) {
        hasKiroIndicators = true;
        break;
      }
    }

    if (!hasKiroIndicators) {
      warnings.push('No clear Kiro IDE indicators found - ensure this is a Kiro workspace');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates BMad agent files for Kiro compatibility
   * @param {string} agentPath - Path to agent file
   * @returns {Promise<{isValid: boolean, errors: string[], warnings: string[]}>}
   */
  async validateAgentForKiro(agentPath) {
    const errors = [];
    const warnings = [];

    if (!await fs.pathExists(agentPath)) {
      errors.push(`Agent file not found: ${agentPath}`);
      return { isValid: false, errors, warnings };
    }

    try {
      const content = await fs.readFile(agentPath, 'utf8');
      
      // Check for YAML header
      const yamlMatch = content.match(/```ya?ml\r?\n([\s\S]*?)```/);
      if (!yamlMatch) {
        warnings.push('No YAML header found - agent may not have proper configuration');
      } else {
        const yaml = require('js-yaml');
        try {
          const agentConfig = yaml.load(yamlMatch[1]);
          
          // Check for required fields
          if (!agentConfig.title) {
            warnings.push('Agent missing title field');
          }
          
          if (!agentConfig.roleDefinition) {
            warnings.push('Agent missing roleDefinition field');
          }
        } catch (yamlError) {
          errors.push(`Invalid YAML in agent header: ${yamlError.message}`);
        }
      }

      // Check for Kiro context references (should be added during transformation)
      const hasKiroContext = content.includes('#File') || 
                           content.includes('#Folder') || 
                           content.includes('#Codebase');
      
      if (!hasKiroContext) {
        warnings.push('Agent may not have Kiro context integration');
      }

    } catch (error) {
      errors.push(`Failed to read agent file: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates Kiro installation integrity
   * @param {string} installDir - Installation directory
   * @returns {Promise<{isValid: boolean, errors: string[], warnings: string[], summary: Object}>}
   */
  async validateKiroInstallation(installDir) {
    const errors = [];
    const warnings = [];
    const summary = {
      agentCount: 0,
      steeringRuleCount: 0,
      hookCount: 0,
      specCount: 0
    };

    // Validate workspace
    const workspaceValidation = await this.validateKiroWorkspace(installDir);
    errors.push(...workspaceValidation.errors);
    warnings.push(...workspaceValidation.warnings);

    if (!workspaceValidation.isValid) {
      return { isValid: false, errors, warnings, summary };
    }

    // Count and validate agents
    const agentsDir = path.join(installDir, '.kiro', 'agents');
    if (await fs.pathExists(agentsDir)) {
      const agentFiles = await fs.readdir(agentsDir);
      const mdFiles = agentFiles.filter(file => file.endsWith('.md'));
      summary.agentCount = mdFiles.length;

      for (const agentFile of mdFiles) {
        const agentPath = path.join(agentsDir, agentFile);
        const agentValidation = await this.validateAgentForKiro(agentPath);
        
        if (!agentValidation.isValid) {
          errors.push(`Agent ${agentFile}: ${agentValidation.errors.join(', ')}`);
        }
        
        if (agentValidation.warnings.length > 0) {
          warnings.push(`Agent ${agentFile}: ${agentValidation.warnings.join(', ')}`);
        }
      }
    }

    // Count steering rules
    const steeringDir = path.join(installDir, '.kiro', 'steering');
    if (await fs.pathExists(steeringDir)) {
      const steeringFiles = await fs.readdir(steeringDir);
      summary.steeringRuleCount = steeringFiles.filter(file => file.endsWith('.md')).length;
    }

    // Count hooks
    const hooksDir = path.join(installDir, '.kiro', 'hooks');
    if (await fs.pathExists(hooksDir)) {
      const hookFiles = await fs.readdir(hooksDir);
      summary.hookCount = hookFiles.filter(file => file.endsWith('.yaml') || file.endsWith('.yml')).length;
    }

    // Count specs
    const specsDir = path.join(installDir, '.kiro', 'specs');
    if (await fs.pathExists(specsDir)) {
      const specDirs = await fs.readdir(specsDir);
      summary.specCount = specDirs.length;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary
    };
  }

  /**
   * Provides setup guidance for Kiro workspace
   * @param {string} directory - Directory to analyze
   * @returns {Promise<string[]>} Array of setup recommendations
   */
  async getSetupGuidance(directory) {
    const recommendations = [];
    
    const validation = await this.validateKiroWorkspace(directory);
    
    if (!validation.isValid) {
      recommendations.push('Initialize Kiro workspace:');
      recommendations.push('  1. Create .kiro directory structure');
      recommendations.push('  2. Set up basic Kiro configuration');
      recommendations.push('  3. Configure Kiro IDE settings');
    }

    if (validation.warnings.length > 0) {
      recommendations.push('Address workspace warnings:');
      validation.warnings.forEach(warning => {
        recommendations.push(`  - ${warning}`);
      });
    }

    // Check for common Kiro setup files
    const commonFiles = [
      { file: 'package.json', desc: 'Node.js project configuration' },
      { file: 'tsconfig.json', desc: 'TypeScript configuration' },
      { file: '.vscode/settings.json', desc: 'VS Code settings for Kiro' }
    ];

    const missingFiles = [];
    for (const { file, desc } of commonFiles) {
      if (!await fs.pathExists(path.join(directory, file))) {
        missingFiles.push(`${file} (${desc})`);
      }
    }

    if (missingFiles.length > 0) {
      recommendations.push('Consider creating common Kiro files:');
      missingFiles.forEach(file => {
        recommendations.push(`  - ${file}`);
      });
    }

    return recommendations;
  }

  /**
   * Displays validation results in a user-friendly format
   * @param {Object} validation - Validation results
   * @param {string} context - Context description
   */
  displayValidationResults(validation, context = 'Kiro Installation') {
    console.log(chalk.cyan(`\n📋 ${context} Validation Results`));
    
    if (validation.isValid) {
      console.log(chalk.green('✓ Validation passed'));
    } else {
      console.log(chalk.red('✗ Validation failed'));
    }

    if (validation.summary) {
      console.log(chalk.cyan('\n📊 Installation Summary:'));
      console.log(chalk.cyan(`   Agents: ${validation.summary.agentCount}`));
      console.log(chalk.cyan(`   Steering Rules: ${validation.summary.steeringRuleCount}`));
      console.log(chalk.cyan(`   Hooks: ${validation.summary.hookCount}`));
      console.log(chalk.cyan(`   Specs: ${validation.summary.specCount}`));
    }

    if (validation.errors.length > 0) {
      console.log(chalk.red('\n❌ Errors:'));
      validation.errors.forEach(error => {
        console.log(chalk.red(`   ${error}`));
      });
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      validation.warnings.forEach(warning => {
        console.log(chalk.yellow(`   ${warning}`));
      });
    }
  }
}

module.exports = KiroValidator;