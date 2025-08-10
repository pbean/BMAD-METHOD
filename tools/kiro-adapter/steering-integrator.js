/**
 * Steering Rule Integrator
 * Handles automatic steering rule application, precedence, and conflict resolution for BMad agents in Kiro
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const SteeringConflictResolver = require('./steering-conflict-resolver');

class SteeringIntegrator {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.steeringCache = new Map();
    this.ruleConflicts = [];
    this.conflictResolver = new SteeringConflictResolver(options);
  }

  /**
   * Log messages with optional color
   * @param {string} message - Message to log
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    if (!this.verbose && level === 'info') return;
    
    const colors = {
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green
    };
    
    console.log(colors[level](`[SteeringIntegrator] ${message}`));
  }

  /**
   * Read and apply Kiro steering rules to BMad agent behavior
   * @param {string} kiroPath - Path to Kiro workspace
   * @param {string} agentId - Agent identifier
   * @param {Object} projectContext - Current project context
   * @returns {Promise<Object>} - Applied steering rules
   */
  async readAndApplySteeringRules(kiroPath, agentId, projectContext = {}) {
    this.log(`Reading steering rules for agent: ${agentId}`);
    
    const steeringDir = path.join(kiroPath, '.kiro', 'steering');
    
    if (!await fs.pathExists(steeringDir)) {
      this.log('No steering directory found, creating default rules', 'warn');
      await this.createDefaultSteeringRules(kiroPath);
    }

    // Discover all steering rule files
    const steeringFiles = await this.discoverSteeringRules(steeringDir);
    
    // Load and parse steering rules
    const allRules = await this.loadSteeringRules(steeringFiles, projectContext);
    
    // Apply rule precedence system
    const prioritizedRules = this.applyRulePrecedence(allRules, agentId);
    
    // Detect and resolve conflicts
    const resolvedRules = await this.resolveRuleConflicts(prioritizedRules, agentId);
    
    // Cache the resolved rules
    this.steeringCache.set(agentId, resolvedRules);
    
    this.log(`Applied ${Object.keys(resolvedRules).length} steering rules for ${agentId}`, 'success');
    return resolvedRules;
  }

  /**
   * Create rule precedence system for conflict resolution
   * @param {Object} allRules - All loaded steering rules
   * @param {string} agentId - Agent identifier
   * @returns {Object} - Prioritized rules
   */
  applyRulePrecedence(allRules, agentId) {
    this.log(`Applying rule precedence for ${agentId}`);
    
    // Define precedence order (higher number = higher priority)
    const precedenceOrder = {
      'bmad-method.md': 1,        // BMad framework defaults
      'tech-preferences.md': 2,   // General technical preferences
      'structure.md': 3,          // Project structure rules
      'tech.md': 4,              // Specific technical stack
      'product.md': 5,           // Product-specific rules
      'project-specific.md': 6,   // Project-specific overrides
      [`${agentId}.md`]: 7,      // Agent-specific rules (highest priority)
      'conflict.md': 0           // Test conflict rule (lowest priority)
    };

    // Sort rules by precedence
    const sortedRuleFiles = Object.keys(allRules).sort((a, b) => {
      const aPrecedence = precedenceOrder[path.basename(a)] || 0;
      const bPrecedence = precedenceOrder[path.basename(b)] || 0;
      return aPrecedence - bPrecedence;
    });

    // Apply rules in precedence order, allowing higher priority rules to override
    const prioritizedRules = {};
    
    for (const ruleFile of sortedRuleFiles) {
      const rules = allRules[ruleFile];
      const fileName = path.basename(ruleFile);
      const precedence = precedenceOrder[fileName] || 0;
      
      // Merge rules with precedence tracking
      for (const [key, value] of Object.entries(rules.content || {})) {
        if (!prioritizedRules[key] || prioritizedRules[key].precedence < precedence) {
          prioritizedRules[key] = {
            value,
            source: fileName,
            precedence,
            inclusion: rules.inclusion || 'always'
          };
        } else if (prioritizedRules[key].precedence === precedence) {
          // Same precedence - potential conflict
          this.ruleConflicts.push({
            key,
            sources: [prioritizedRules[key].source, fileName],
            values: [prioritizedRules[key].value, value],
            agentId
          });
        }
      }
    }

    return prioritizedRules;
  }

  /**
   * Add dynamic rule loading based on project context
   * @param {string} kiroPath - Path to Kiro workspace
   * @param {Object} projectContext - Current project context
   * @returns {Promise<Object>} - Dynamically loaded rules
   */
  async loadDynamicRules(kiroPath, projectContext) {
    this.log('Loading dynamic rules based on project context');
    
    const dynamicRules = {};
    
    // Load rules based on file patterns in context
    if (projectContext.currentFile) {
      const fileExt = path.extname(projectContext.currentFile);
      const langSpecificRules = await this.loadLanguageSpecificRules(kiroPath, fileExt);
      Object.assign(dynamicRules, langSpecificRules);
    }
    
    // Load rules based on project type detection
    const projectType = await this.detectProjectType(kiroPath);
    if (projectType) {
      const projectTypeRules = await this.loadProjectTypeRules(kiroPath, projectType);
      Object.assign(dynamicRules, projectTypeRules);
    }
    
    // Load rules based on current git branch
    if (projectContext.gitBranch) {
      const branchRules = await this.loadBranchSpecificRules(kiroPath, projectContext.gitBranch);
      Object.assign(dynamicRules, branchRules);
    }
    
    return dynamicRules;
  }

  /**
   * Discover all steering rule files in the steering directory
   * @param {string} steeringDir - Path to steering directory
   * @returns {Promise<Array>} - List of steering rule files
   */
  async discoverSteeringRules(steeringDir) {
    try {
      const files = await fs.readdir(steeringDir);
      const steeringFiles = files
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(steeringDir, file));
      
      this.log(`Discovered ${steeringFiles.length} steering rule files`);
      return steeringFiles;
    } catch (error) {
      this.log(`Error discovering steering rules: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Load and parse steering rules from files
   * @param {Array} steeringFiles - List of steering rule file paths
   * @param {Object} projectContext - Current project context
   * @returns {Promise<Object>} - Loaded steering rules
   */
  async loadSteeringRules(steeringFiles, projectContext) {
    const allRules = {};
    
    for (const filePath of steeringFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = this.parseSteeringRule(content, filePath, projectContext);
        
        if (parsed && this.shouldIncludeRule(parsed, projectContext)) {
          allRules[filePath] = parsed;
          this.log(`Loaded steering rule: ${path.basename(filePath)}`);
        }
      } catch (error) {
        this.log(`Error loading steering rule ${filePath}: ${error.message}`, 'error');
      }
    }
    
    return allRules;
  }

  /**
   * Parse a steering rule file
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @param {Object} projectContext - Project context
   * @returns {Object} - Parsed steering rule
   */
  parseSteeringRule(content, filePath, projectContext) {
    // Parse front matter
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    if (!match) {
      // No front matter, treat entire content as rule
      return {
        inclusion: 'always',
        content: this.parseRuleContent(content),
        filePath
      };
    }
    
    try {
      const frontMatter = yaml.load(match[1]) || {};
      const ruleContent = match[2];
      
      return {
        inclusion: frontMatter.inclusion || 'always',
        fileMatchPattern: frontMatter.fileMatchPattern,
        agentFilter: frontMatter.agentFilter,
        projectType: frontMatter.projectType,
        content: this.parseRuleContent(ruleContent),
        filePath
      };
    } catch (error) {
      this.log(`Error parsing front matter in ${filePath}: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Parse rule content into structured format
   * @param {string} content - Rule content
   * @returns {Object} - Structured rule content
   */
  parseRuleContent(content) {
    const rules = {};
    
    // Extract sections and convert to key-value pairs
    const sections = content.split(/^##\s+(.+)$/gm);
    
    for (let i = 1; i < sections.length; i += 2) {
      const sectionName = sections[i].trim().toLowerCase().replace(/\s+/g, '_');
      const sectionContent = sections[i + 1] ? sections[i + 1].trim() : '';
      
      // Parse bullet points and other structured content
      if (sectionContent.includes('- ')) {
        rules[sectionName] = sectionContent
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.replace(/^- /, '').trim());
      } else {
        rules[sectionName] = sectionContent;
      }
    }
    
    // If no sections found, treat as general guidance
    if (Object.keys(rules).length === 0) {
      rules.general_guidance = content.trim();
    }
    
    return rules;
  }

  /**
   * Determine if a rule should be included based on context
   * @param {Object} rule - Parsed steering rule
   * @param {Object} projectContext - Project context
   * @returns {boolean} - Whether to include the rule
   */
  shouldIncludeRule(rule, projectContext) {
    // Always include rules marked as 'always'
    if (rule.inclusion === 'always') {
      return true;
    }
    
    // Check file match pattern
    if (rule.inclusion === 'fileMatch' && rule.fileMatchPattern && projectContext.currentFile) {
      const pattern = new RegExp(rule.fileMatchPattern);
      return pattern.test(projectContext.currentFile);
    }
    
    // Check agent filter
    if (rule.agentFilter && projectContext.agentId) {
      const agentPattern = new RegExp(rule.agentFilter);
      return agentPattern.test(projectContext.agentId);
    }
    
    // Check project type
    if (rule.projectType && projectContext.projectType) {
      return rule.projectType === projectContext.projectType;
    }
    
    // Manual inclusion rules are not automatically included
    if (rule.inclusion === 'manual') {
      return false;
    }
    
    return true;
  }

  /**
   * Resolve rule conflicts with user guidance
   * @param {Object} prioritizedRules - Rules with precedence applied
   * @param {string} agentId - Agent identifier
   * @returns {Promise<Object>} - Resolved rules
   */
  async resolveRuleConflicts(prioritizedRules, agentId) {
    if (this.ruleConflicts.length === 0) {
      return prioritizedRules;
    }
    
    this.log(`Found ${this.ruleConflicts.length} rule conflicts for ${agentId}`, 'warn');
    
    // Use the conflict resolver for advanced conflict resolution
    const agentConflicts = this.ruleConflicts.filter(c => c.agentId === agentId);
    
    if (agentConflicts.length > 0) {
      // Get the Kiro path from the first rule source
      const kiroPath = this.getKiroPathFromRules(prioritizedRules);
      
      // Provide resolution guidance
      const resolutionResults = await this.conflictResolver.provideResolutionGuidance(agentConflicts, kiroPath);
      
      if (resolutionResults.userActionRequired.length > 0) {
        this.log(`${resolutionResults.userActionRequired.length} conflicts require user attention`, 'warn');
        this.log('Check .kiro/steering/CONFLICT_RESOLUTION_GUIDE.md for guidance', 'info');
      }
    }
    
    const resolvedRules = { ...prioritizedRules };
    
    for (const conflict of this.ruleConflicts) {
      if (conflict.agentId === agentId) {
        this.log(`Conflict in rule '${conflict.key}' between sources: ${conflict.sources.join(', ')}`, 'warn');
        
        // Use the higher precedence rule (already applied in prioritizedRules)
        this.log(`Using value from ${resolvedRules[conflict.key].source} (higher precedence)`, 'info');
      }
    }
    
    // Clear conflicts for this agent
    this.ruleConflicts = this.ruleConflicts.filter(c => c.agentId !== agentId);
    
    return resolvedRules;
  }

  /**
   * Create default steering rules for BMad integration
   * @param {string} kiroPath - Path to Kiro workspace
   * @returns {Promise<void>}
   */
  async createDefaultSteeringRules(kiroPath) {
    this.log('Creating default steering rules for BMad integration');
    
    const steeringDir = path.join(kiroPath, '.kiro', 'steering');
    await fs.ensureDir(steeringDir);
    
    // Create bmad-method.md steering rule
    const bmadRulePath = path.join(steeringDir, 'bmad-method.md');
    if (!await fs.pathExists(bmadRulePath)) {
      const bmadRuleContent = `---
inclusion: always
---

# BMad Method Integration Rules

## Core Principles

- Follow BMad Method's structured approach to development
- Maintain agent specialization and expertise
- Use spec-driven development for complex features
- Leverage Kiro's context system for enhanced awareness
- Apply steering rules consistently across all agents

## Agent Behavior

- Preserve BMad persona while leveraging Kiro capabilities
- Use context providers (#File, #Folder, #Codebase) automatically
- Reference steering rules for consistency
- Integrate with MCP tools when available
- Follow BMad workflow patterns enhanced with Kiro features

## Quality Standards

- Maintain BMad's quality assurance processes
- Use checklists and validation steps
- Ensure documentation is comprehensive and up-to-date
- Follow test-driven development practices where applicable
`;
      
      await fs.writeFile(bmadRulePath, bmadRuleContent);
      this.log('Created bmad-method.md steering rule', 'success');
    }
    
    // Create tech-preferences.md steering rule
    const techRulePath = path.join(steeringDir, 'tech-preferences.md');
    if (!await fs.pathExists(techRulePath)) {
      const techRuleContent = `---
inclusion: always
---

# Technical Preferences

## Code Style

- Use consistent indentation (2 spaces for JavaScript/TypeScript, 4 for Python)
- Follow language-specific naming conventions
- Write descriptive variable and function names
- Include comprehensive comments for complex logic

## Architecture Patterns

- Prefer composition over inheritance
- Use dependency injection where appropriate
- Follow SOLID principles
- Implement proper error handling and logging

## Testing Standards

- Write unit tests for all business logic
- Use integration tests for API endpoints
- Implement end-to-end tests for critical user flows
- Maintain test coverage above 80%

## Documentation

- Keep README files up-to-date
- Document API endpoints with examples
- Include setup and deployment instructions
- Use clear, concise comments
`;
      
      await fs.writeFile(techRulePath, techRuleContent);
      this.log('Created tech-preferences.md steering rule', 'success');
    }
  }

  /**
   * Load language-specific steering rules
   * @param {string} kiroPath - Path to Kiro workspace
   * @param {string} fileExtension - File extension
   * @returns {Promise<Object>} - Language-specific rules
   */
  async loadLanguageSpecificRules(kiroPath, fileExtension) {
    const langMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust'
    };
    
    const language = langMap[fileExtension];
    if (!language) return {};
    
    const langRulePath = path.join(kiroPath, '.kiro', 'steering', `${language}.md`);
    
    if (await fs.pathExists(langRulePath)) {
      try {
        const content = await fs.readFile(langRulePath, 'utf8');
        return { [langRulePath]: this.parseSteeringRule(content, langRulePath, {}) };
      } catch (error) {
        this.log(`Error loading language-specific rules for ${language}: ${error.message}`, 'error');
      }
    }
    
    return {};
  }

  /**
   * Detect project type from workspace
   * @param {string} kiroPath - Path to Kiro workspace
   * @returns {Promise<string|null>} - Detected project type
   */
  async detectProjectType(kiroPath) {
    try {
      // Check for common project indicators
      const packageJsonPath = path.join(kiroPath, 'package.json');
      const requirementsPath = path.join(kiroPath, 'requirements.txt');
      const cargoPath = path.join(kiroPath, 'Cargo.toml');
      const goModPath = path.join(kiroPath, 'go.mod');
      
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        
        // Check for specific frameworks
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (deps.react || deps['@types/react']) return 'react';
        if (deps.vue || deps['@vue/cli']) return 'vue';
        if (deps.angular || deps['@angular/core']) return 'angular';
        if (deps.express || deps.fastify) return 'node-backend';
        if (deps.phaser) return 'phaser-game';
        
        return 'javascript';
      }
      
      if (await fs.pathExists(requirementsPath)) return 'python';
      if (await fs.pathExists(cargoPath)) return 'rust';
      if (await fs.pathExists(goModPath)) return 'go';
      
    } catch (error) {
      this.log(`Error detecting project type: ${error.message}`, 'error');
    }
    
    return null;
  }

  /**
   * Load project type specific rules
   * @param {string} kiroPath - Path to Kiro workspace
   * @param {string} projectType - Detected project type
   * @returns {Promise<Object>} - Project type specific rules
   */
  async loadProjectTypeRules(kiroPath, projectType) {
    const projectRulePath = path.join(kiroPath, '.kiro', 'steering', `${projectType}.md`);
    
    if (await fs.pathExists(projectRulePath)) {
      try {
        const content = await fs.readFile(projectRulePath, 'utf8');
        return { [projectRulePath]: this.parseSteeringRule(content, projectRulePath, {}) };
      } catch (error) {
        this.log(`Error loading project type rules for ${projectType}: ${error.message}`, 'error');
      }
    }
    
    return {};
  }

  /**
   * Load branch-specific steering rules
   * @param {string} kiroPath - Path to Kiro workspace
   * @param {string} branchName - Current git branch
   * @returns {Promise<Object>} - Branch-specific rules
   */
  async loadBranchSpecificRules(kiroPath, branchName) {
    // Load rules for feature branches, hotfix branches, etc.
    const branchType = this.getBranchType(branchName);
    const branchRulePath = path.join(kiroPath, '.kiro', 'steering', `${branchType}.md`);
    
    if (await fs.pathExists(branchRulePath)) {
      try {
        const content = await fs.readFile(branchRulePath, 'utf8');
        return { [branchRulePath]: this.parseSteeringRule(content, branchRulePath, {}) };
      } catch (error) {
        this.log(`Error loading branch-specific rules for ${branchType}: ${error.message}`, 'error');
      }
    }
    
    return {};
  }

  /**
   * Get branch type from branch name
   * @param {string} branchName - Branch name
   * @returns {string} - Branch type
   */
  getBranchType(branchName) {
    if (branchName.startsWith('feature/')) return 'feature';
    if (branchName.startsWith('hotfix/')) return 'hotfix';
    if (branchName.startsWith('release/')) return 'release';
    if (branchName === 'main' || branchName === 'master') return 'main';
    if (branchName.startsWith('develop')) return 'develop';
    
    return 'generic';
  }

  /**
   * Get cached steering rules for an agent
   * @param {string} agentId - Agent identifier
   * @returns {Object|null} - Cached steering rules
   */
  getCachedSteeringRules(agentId) {
    return this.steeringCache.get(agentId) || null;
  }

  /**
   * Clear steering rule cache
   * @param {string} agentId - Optional agent ID to clear specific cache
   */
  clearCache(agentId = null) {
    if (agentId) {
      this.steeringCache.delete(agentId);
      this.log(`Cleared steering rule cache for ${agentId}`);
    } else {
      this.steeringCache.clear();
      this.log('Cleared all steering rule cache');
    }
  }

  /**
   * Validate steering rule consistency
   * @param {string} kiroPath - Path to Kiro workspace
   * @returns {Promise<Object>} - Validation results
   */
  async validateSteeringRuleConsistency(kiroPath) {
    this.log('Validating steering rule consistency');
    
    // Use the conflict resolver for comprehensive validation
    return await this.conflictResolver.validateRuleConsistency(kiroPath);
  }

  /**
   * Get Kiro workspace path from rule sources
   * @param {Object} rules - Prioritized rules
   * @returns {string} - Kiro workspace path
   */
  getKiroPathFromRules(rules) {
    // Extract path from first rule source
    for (const rule of Object.values(rules)) {
      if (rule.source) {
        // Assume rule sources are relative to .kiro/steering/
        // So we need to go up two levels to get to workspace root
        return process.cwd(); // Fallback to current working directory
      }
    }
    return process.cwd();
  }
}

module.exports = SteeringIntegrator;