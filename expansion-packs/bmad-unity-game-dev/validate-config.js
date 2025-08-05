#!/usr/bin/env node

/**
 * Unity Expansion Pack Configuration Validator
 * 
 * This script validates the Unity expansion pack configuration to prevent
 * silent failures and ensure reliable setup for users.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const EXPANSION_DIR = __dirname;
const CONFIG_FILE = path.join(EXPANSION_DIR, 'config.yaml');

class UnityConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validateConfigExists() {
    if (!fs.existsSync(CONFIG_FILE)) {
      this.errors.push('config.yaml file not found');
      return false;
    }
    return true;
  }

  validateYamlStructure() {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8');
      this.config = yaml.load(content);
      return true;
    } catch (error) {
      this.errors.push(`Invalid YAML structure: ${error.message}`);
      return false;
    }
  }

  validateRequiredFields() {
    const requiredFields = [
      'name',
      'version', 
      'short-title',
      'description',
      'author',
      'slashPrefix'
    ];

    for (const field of requiredFields) {
      if (!this.config[field]) {
        this.errors.push(`Missing required field: ${field}`);
      }
    }
  }

  validateUnitySpecificConfig() {
    // Validate game dimension
    if (this.config.gameDimension) {
      const validDimensions = ['2D', '3D'];
      if (!validDimensions.includes(this.config.gameDimension)) {
        this.errors.push(`Invalid gameDimension: ${this.config.gameDimension}. Must be '2D' or '3D'`);
      }
    } else {
      this.warnings.push('gameDimension not specified, will default to 2D');
    }

    // Validate always-loaded files exist
    if (this.config.devLoadAlwaysFiles && Array.isArray(this.config.devLoadAlwaysFiles)) {
      for (const filePath of this.config.devLoadAlwaysFiles) {
        // Note: These files are relative to project docs, not expansion pack
        this.warnings.push(`devLoadAlwaysFiles references: ${filePath} - ensure this exists in your project`);
      }
    }
  }

  validateDocumentConfiguration() {
    // Validate PRD config
    if (this.config.prd) {
      if (!this.config.prd.prdVersion) {
        this.warnings.push('PRD version not specified');
      }
    }

    // Validate architecture config
    if (this.config.architecture) {
      if (!this.config.architecture.architectureVersion) {
        this.warnings.push('Architecture version not specified');
      }
    }

    // Validate GDD config
    if (this.config.gdd) {
      if (!this.config.gdd.gddVersion) {
        this.warnings.push('GDD version not specified');
      }
    }
  }

  validateAgentTeamReferences() {
    // Check if the referenced agents exist
    const teamFile = path.join(EXPANSION_DIR, 'agent-teams', 'unity-game-team.yaml');
    
    if (fs.existsSync(teamFile)) {
      try {
        const teamContent = fs.readFileSync(teamFile, 'utf8');
        const teamConfig = yaml.load(teamContent);
        
        if (teamConfig.agents && Array.isArray(teamConfig.agents)) {
          const expansionAgentsDir = path.join(EXPANSION_DIR, 'agents');
          const coreAgentsDir = path.join(EXPANSION_DIR, '..', '..', 'bmad-core', 'agents');
          
          for (const agentName of teamConfig.agents) {
            const expansionAgentFile = path.join(expansionAgentsDir, `${agentName}.md`);
            const coreAgentFile = path.join(coreAgentsDir, `${agentName}.md`);
            
            // Check if agent exists in expansion pack or core framework
            if (!fs.existsSync(expansionAgentFile) && !fs.existsSync(coreAgentFile)) {
              this.errors.push(`Agent team references missing agent: ${agentName} (not found in expansion pack or core framework)`);
            }
          }
        }
      } catch (error) {
        this.errors.push(`Failed to validate agent team file: ${error.message}`);
      }
    } else {
      this.warnings.push('unity-game-team.yaml not found - team functionality may not work');
    }
  }

  validateDirectoryStructure() {
    const requiredDirs = ['agents', 'agent-teams', 'templates', 'tasks', 'workflows', 'checklists'];
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(EXPANSION_DIR, dir);
      if (!fs.existsSync(dirPath)) {
        this.errors.push(`Missing required directory: ${dir}`);
      }
    }
  }

  validate() {
    console.log('🔍 Validating Unity Expansion Pack Configuration...\n');

    // Step 1: Basic file validation
    if (!this.validateConfigExists()) {
      return this.reportResults();
    }

    // Step 2: YAML structure validation
    if (!this.validateYamlStructure()) {
      return this.reportResults();
    }

    // Step 3: Required fields validation
    this.validateRequiredFields();

    // Step 4: Unity-specific validation
    this.validateUnitySpecificConfig();

    // Step 5: Document configuration validation
    this.validateDocumentConfiguration();

    // Step 6: Agent team references validation
    this.validateAgentTeamReferences();

    // Step 7: Directory structure validation
    this.validateDirectoryStructure();

    return this.reportResults();
  }

  reportResults() {
    let success = true;

    if (this.errors.length > 0) {
      console.log('❌ CONFIGURATION ERRORS:');
      for (const error of this.errors) {
        console.log(`   • ${error}`);
      }
      console.log();
      success = false;
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  CONFIGURATION WARNINGS:');
      for (const warning of this.warnings) {
        console.log(`   • ${warning}`);
      }
      console.log();
    }

    if (success) {
      console.log('✅ Configuration validation passed!');
      console.log('   Unity expansion pack is properly configured.\n');
    } else {
      console.log('❌ Configuration validation failed!');
      console.log('   Please fix the errors above before using the expansion pack.\n');
    }

    return success;
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new UnityConfigValidator();
  const success = validator.validate();
  process.exit(success ? 0 : 1);
}

module.exports = UnityConfigValidator;