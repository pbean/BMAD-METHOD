/**
 * Steering Conflict Resolver
 * Detects conflicting steering rules and provides resolution guidance
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class SteeringConflictResolver {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
    this.conflictHistory = [];
    this.resolutionStrategies = new Map();
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
    
    console.log(colors[level](`[SteeringConflictResolver] ${message}`));
  }

  /**
   * Detect conflicting steering rules between BMad and project-specific rules
   * @param {Object} allRules - All loaded steering rules
   * @param {string} agentId - Agent identifier
   * @returns {Array} - Array of detected conflicts
   */
  detectConflicts(allRules, agentId) {
    this.log(`Detecting conflicts for agent: ${agentId}`);
    
    const conflicts = [];
    const ruleKeys = new Map();
    
    // Group rules by key to detect conflicts
    for (const [filePath, ruleData] of Object.entries(allRules)) {
      if (!ruleData || !ruleData.content) continue;
      
      const fileName = path.basename(filePath);
      
      for (const [key, value] of Object.entries(ruleData.content)) {
        if (!ruleKeys.has(key)) {
          ruleKeys.set(key, []);
        }
        
        ruleKeys.get(key).push({
          source: fileName,
          value,
          filePath,
          inclusion: ruleData.inclusion || 'always',
          precedence: this.calculatePrecedence(fileName, agentId)
        });
      }
    }
    
    // Identify conflicts
    for (const [key, sources] of ruleKeys.entries()) {
      if (sources.length > 1) {
        const conflict = this.analyzeConflict(key, sources, agentId);
        if (conflict.severity !== 'none') {
          conflicts.push(conflict);
        }
      }
    }
    
    this.log(`Detected ${conflicts.length} conflicts`, conflicts.length > 0 ? 'warn' : 'info');
    return conflicts;
  }

  /**
   * Analyze a specific conflict to determine severity and resolution
   * @param {string} key - Rule key
   * @param {Array} sources - Array of rule sources
   * @param {string} agentId - Agent identifier
   * @returns {Object} - Conflict analysis
   */
  analyzeConflict(key, sources, agentId) {
    // Sort sources by precedence (highest first)
    const sortedSources = sources.sort((a, b) => b.precedence - a.precedence);
    
    const conflict = {
      key,
      agentId,
      sources: sortedSources,
      severity: this.determineSeverity(key, sortedSources),
      type: this.determineConflictType(key, sortedSources),
      resolution: null,
      userOverride: null
    };
    
    // Determine resolution strategy
    conflict.resolution = this.determineResolution(conflict);
    
    return conflict;
  }

  /**
   * Determine conflict severity
   * @param {string} key - Rule key
   * @param {Array} sources - Sorted sources by precedence
   * @returns {string} - Severity level
   */
  determineSeverity(key, sources) {
    // Check if values are actually conflicting
    const values = sources.map(s => this.normalizeValue(s.value));
    const uniqueValues = [...new Set(values)];
    
    if (uniqueValues.length === 1) {
      return 'none'; // Same values, no real conflict
    }
    
    // Check for critical conflicts
    const criticalKeys = [
      'code_style',
      'indentation',
      'naming_conventions',
      'architecture_patterns',
      'security_practices'
    ];
    
    if (criticalKeys.includes(key)) {
      return 'high';
    }
    
    // Check precedence difference
    const precedenceDiff = sources[0].precedence - sources[1].precedence;
    if (precedenceDiff >= 3) {
      return 'low'; // Clear precedence winner
    }
    
    return 'medium';
  }

  /**
   * Determine conflict type
   * @param {string} key - Rule key
   * @param {Array} sources - Sorted sources by precedence
   * @returns {string} - Conflict type
   */
  determineConflictType(key, sources) {
    const bmadSources = sources.filter(s => s.source.includes('bmad'));
    const projectSources = sources.filter(s => !s.source.includes('bmad'));
    
    if (bmadSources.length > 0 && projectSources.length > 0) {
      return 'bmad-vs-project';
    }
    
    if (sources.some(s => s.source.includes('tech')) && 
        sources.some(s => s.source.includes('product'))) {
      return 'tech-vs-product';
    }
    
    if (sources.some(s => s.source.includes('general')) && 
        sources.some(s => s.source.includes('specific'))) {
      return 'general-vs-specific';
    }
    
    return 'multiple-sources';
  }

  /**
   * Determine resolution strategy for a conflict
   * @param {Object} conflict - Conflict object
   * @returns {Object} - Resolution strategy
   */
  determineResolution(conflict) {
    const { key, sources, severity, type } = conflict;
    
    // Use highest precedence rule by default
    const winner = sources[0];
    
    const resolution = {
      strategy: 'precedence',
      chosenSource: winner.source,
      chosenValue: winner.value,
      reason: `Using ${winner.source} due to higher precedence (${winner.precedence})`,
      alternatives: sources.slice(1).map(s => ({
        source: s.source,
        value: s.value,
        precedence: s.precedence
      })),
      userGuidance: this.generateUserGuidance(conflict)
    };
    
    // Special handling for high severity conflicts
    if (severity === 'high') {
      resolution.requiresUserReview = true;
      resolution.userGuidance = this.generateHighSeverityGuidance(conflict);
    }
    
    // Special handling for BMad vs project conflicts
    if (type === 'bmad-vs-project') {
      resolution.strategy = 'project-override';
      resolution.reason = 'Project-specific rules override BMad defaults';
      resolution.userGuidance = this.generateBMadProjectGuidance(conflict);
    }
    
    return resolution;
  }

  /**
   * Generate user guidance for conflict resolution
   * @param {Object} conflict - Conflict object
   * @returns {string} - User guidance text
   */
  generateUserGuidance(conflict) {
    const { key, sources, severity, type } = conflict;
    
    let guidance = `## Steering Rule Conflict: ${key}\n\n`;
    guidance += `**Severity:** ${severity.toUpperCase()}\n`;
    guidance += `**Type:** ${type}\n\n`;
    
    guidance += `**Conflicting Rules:**\n`;
    sources.forEach((source, index) => {
      guidance += `${index + 1}. **${source.source}** (precedence: ${source.precedence})\n`;
      guidance += `   - ${this.formatValue(source.value)}\n`;
    });
    
    guidance += `\n**Current Resolution:**\n`;
    guidance += `Using rule from **${sources[0].source}** due to higher precedence.\n\n`;
    
    guidance += `**Options:**\n`;
    guidance += `1. Accept current resolution (recommended)\n`;
    guidance += `2. Create a project-specific override in \`.kiro/steering/project-specific.md\`\n`;
    guidance += `3. Modify the conflicting rule files to align values\n`;
    guidance += `4. Add agent-specific rules in \`.kiro/steering/${conflict.agentId}.md\`\n\n`;
    
    return guidance;
  }

  /**
   * Generate guidance for high severity conflicts
   * @param {Object} conflict - Conflict object
   * @returns {string} - High severity guidance
   */
  generateHighSeverityGuidance(conflict) {
    let guidance = this.generateUserGuidance(conflict);
    
    guidance += `\n⚠️  **HIGH SEVERITY CONFLICT** ⚠️\n\n`;
    guidance += `This conflict involves critical development standards that could affect:\n`;
    guidance += `- Code consistency across the project\n`;
    guidance += `- Team collaboration and code reviews\n`;
    guidance += `- Build and deployment processes\n\n`;
    
    guidance += `**Recommended Actions:**\n`;
    guidance += `1. Review both conflicting rules with your team\n`;
    guidance += `2. Establish a project-wide standard\n`;
    guidance += `3. Update the appropriate steering rule file\n`;
    guidance += `4. Communicate the decision to all team members\n\n`;
    
    return guidance;
  }

  /**
   * Generate guidance for BMad vs project conflicts
   * @param {Object} conflict - Conflict object
   * @returns {string} - BMad project guidance
   */
  generateBMadProjectGuidance(conflict) {
    let guidance = this.generateUserGuidance(conflict);
    
    guidance += `\n🔄 **BMad vs Project Conflict** 🔄\n\n`;
    guidance += `This conflict is between BMad Method defaults and your project-specific preferences.\n\n`;
    
    guidance += `**BMad Method Approach:**\n`;
    guidance += `- BMad provides sensible defaults for development workflows\n`;
    guidance += `- Project-specific rules should override BMad defaults when needed\n`;
    guidance += `- This allows customization while maintaining BMad's structured approach\n\n`;
    
    guidance += `**Resolution Strategy:**\n`;
    guidance += `The project-specific rule will be used, which is the intended behavior.\n`;
    guidance += `BMad agents will adapt to your project's conventions while maintaining their expertise.\n\n`;
    
    return guidance;
  }

  /**
   * Provide clear resolution guidance and user override options
   * @param {Array} conflicts - Array of conflicts
   * @param {string} kiroPath - Path to Kiro workspace
   * @returns {Promise<Object>} - Resolution results
   */
  async provideResolutionGuidance(conflicts, kiroPath) {
    this.log('Providing resolution guidance for conflicts');
    
    const resolutionResults = {
      totalConflicts: conflicts.length,
      highSeverityConflicts: conflicts.filter(c => c.severity === 'high').length,
      resolvedConflicts: 0,
      userActionRequired: [],
      guidanceGenerated: false
    };
    
    if (conflicts.length === 0) {
      this.log('No conflicts to resolve');
      return resolutionResults;
    }
    
    // Generate conflict resolution guide
    await this.generateConflictResolutionGuide(conflicts, kiroPath);
    resolutionResults.guidanceGenerated = true;
    
    // Identify conflicts requiring user action
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');
    const userReviewConflicts = conflicts.filter(c => c.resolution?.requiresUserReview);
    
    resolutionResults.userActionRequired = [
      ...highSeverityConflicts,
      ...userReviewConflicts
    ];
    
    // Auto-resolve low severity conflicts
    const autoResolvableConflicts = conflicts.filter(c => 
      c.severity === 'low' && !c.resolution?.requiresUserReview
    );
    
    resolutionResults.resolvedConflicts = autoResolvableConflicts.length;
    
    this.log(`Resolution guidance complete: ${resolutionResults.resolvedConflicts} auto-resolved, ${resolutionResults.userActionRequired.length} require user action`);
    
    return resolutionResults;
  }

  /**
   * Generate a comprehensive conflict resolution guide
   * @param {Array} conflicts - Array of conflicts
   * @param {string} kiroPath - Path to Kiro workspace
   * @returns {Promise<void>}
   */
  async generateConflictResolutionGuide(conflicts, kiroPath) {
    const guidePath = path.join(kiroPath, '.kiro', 'steering', 'CONFLICT_RESOLUTION_GUIDE.md');
    
    let guide = `# Steering Rule Conflict Resolution Guide\n\n`;
    guide += `Generated on: ${new Date().toISOString()}\n\n`;
    guide += `This guide helps you understand and resolve conflicts between steering rules.\n\n`;
    
    // Summary
    guide += `## Summary\n\n`;
    guide += `- **Total Conflicts:** ${conflicts.length}\n`;
    guide += `- **High Severity:** ${conflicts.filter(c => c.severity === 'high').length}\n`;
    guide += `- **Medium Severity:** ${conflicts.filter(c => c.severity === 'medium').length}\n`;
    guide += `- **Low Severity:** ${conflicts.filter(c => c.severity === 'low').length}\n\n`;
    
    // Conflicts by severity
    const severityGroups = {
      high: conflicts.filter(c => c.severity === 'high'),
      medium: conflicts.filter(c => c.severity === 'medium'),
      low: conflicts.filter(c => c.severity === 'low')
    };
    
    for (const [severity, conflictGroup] of Object.entries(severityGroups)) {
      if (conflictGroup.length === 0) continue;
      
      guide += `## ${severity.toUpperCase()} Severity Conflicts\n\n`;
      
      for (const conflict of conflictGroup) {
        guide += conflict.resolution.userGuidance;
        guide += `\n---\n\n`;
      }
    }
    
    // General guidance
    guide += `## General Resolution Strategies\n\n`;
    guide += `### 1. Precedence-Based Resolution (Default)\n`;
    guide += `Rules with higher precedence automatically override lower precedence rules:\n`;
    guide += `1. Agent-specific rules (highest)\n`;
    guide += `2. Project-specific overrides\n`;
    guide += `3. Product-specific rules\n`;
    guide += `4. Technical stack rules\n`;
    guide += `5. Project structure rules\n`;
    guide += `6. General technical preferences\n`;
    guide += `7. BMad framework defaults (lowest)\n\n`;
    
    guide += `### 2. Creating Override Rules\n`;
    guide += `To resolve conflicts, create or modify these files:\n`;
    guide += `- \`.kiro/steering/project-specific.md\` - Project-wide overrides\n`;
    guide += `- \`.kiro/steering/{agent-id}.md\` - Agent-specific rules\n`;
    guide += `- \`.kiro/steering/{language}.md\` - Language-specific rules\n\n`;
    
    guide += `### 3. Rule Validation\n`;
    guide += `After making changes, validate your steering rules:\n`;
    guide += `\`\`\`bash\n`;
    guide += `# Run steering rule validation\n`;
    guide += `npx bmad-method validate-steering\n`;
    guide += `\`\`\`\n\n`;
    
    await fs.writeFile(guidePath, guide);
    this.log(`Generated conflict resolution guide: ${guidePath}`, 'success');
  }

  /**
   * Implement rule validation and consistency checking
   * @param {string} kiroPath - Path to Kiro workspace
   * @returns {Promise<Object>} - Validation results
   */
  async validateRuleConsistency(kiroPath) {
    this.log('Validating steering rule consistency');
    
    const steeringDir = path.join(kiroPath, '.kiro', 'steering');
    
    if (!await fs.pathExists(steeringDir)) {
      return {
        valid: false,
        errors: ['Steering directory not found'],
        warnings: [],
        suggestions: ['Run BMad installation to create default steering rules']
      };
    }
    
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      fileValidation: {},
      conflictAnalysis: null
    };
    
    try {
      // Validate individual files
      const steeringFiles = await fs.readdir(steeringDir);
      const mdFiles = steeringFiles.filter(f => f.endsWith('.md') && f !== 'CONFLICT_RESOLUTION_GUIDE.md');
      
      for (const file of mdFiles) {
        const filePath = path.join(steeringDir, file);
        const fileValidation = await this.validateSteeringFile(filePath);
        validation.fileValidation[file] = fileValidation;
        
        if (!fileValidation.valid) {
          validation.valid = false;
          validation.errors.push(...fileValidation.errors.map(e => `${file}: ${e}`));
        }
        
        validation.warnings.push(...fileValidation.warnings.map(w => `${file}: ${w}`));
      }
      
      // Analyze conflicts across all files
      if (validation.valid) {
        validation.conflictAnalysis = await this.analyzeAllConflicts(kiroPath);
        
        if (validation.conflictAnalysis.highSeverityConflicts > 0) {
          validation.warnings.push(`Found ${validation.conflictAnalysis.highSeverityConflicts} high severity conflicts`);
        }
      }
      
    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }
    
    this.log(`Validation complete: ${validation.valid ? 'PASSED' : 'FAILED'}`, validation.valid ? 'success' : 'error');
    return validation;
  }

  /**
   * Validate a single steering rule file
   * @param {string} filePath - Path to steering rule file
   * @returns {Promise<Object>} - File validation results
   */
  async validateSteeringFile(filePath) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check for front matter
      const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
      const hasFrontMatter = frontMatterRegex.test(content);
      
      if (!hasFrontMatter) {
        validation.warnings.push('No front matter found - rule will always be included');
      } else {
        // Validate front matter YAML
        const match = content.match(frontMatterRegex);
        try {
          const yaml = require('js-yaml');
          const frontMatter = yaml.load(match[1]);
          
          // Validate inclusion field
          if (frontMatter.inclusion && !['always', 'fileMatch', 'manual'].includes(frontMatter.inclusion)) {
            validation.errors.push(`Invalid inclusion value: ${frontMatter.inclusion}`);
            validation.valid = false;
          }
          
          // Validate fileMatchPattern if inclusion is fileMatch
          if (frontMatter.inclusion === 'fileMatch' && !frontMatter.fileMatchPattern) {
            validation.errors.push('fileMatchPattern required when inclusion is fileMatch');
            validation.valid = false;
          }
          
        } catch (yamlError) {
          validation.errors.push(`Invalid YAML in front matter: ${yamlError.message}`);
          validation.valid = false;
        }
      }
      
      // Check for empty content
      const contentWithoutFrontMatter = content.replace(frontMatterRegex, '').trim();
      if (!contentWithoutFrontMatter) {
        validation.warnings.push('Rule file has no content');
      }
      
      // Check for proper markdown structure
      if (!contentWithoutFrontMatter.includes('#')) {
        validation.warnings.push('No markdown headers found - consider organizing content with headers');
      }
      
    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Failed to read file: ${error.message}`);
    }
    
    return validation;
  }

  /**
   * Analyze all conflicts in the workspace
   * @param {string} kiroPath - Path to Kiro workspace
   * @returns {Promise<Object>} - Conflict analysis
   */
  async analyzeAllConflicts(kiroPath) {
    // This would integrate with the SteeringIntegrator to load all rules
    // and detect conflicts across all agents
    const analysis = {
      totalConflicts: 0,
      highSeverityConflicts: 0,
      mediumSeverityConflicts: 0,
      lowSeverityConflicts: 0,
      conflictsByType: {},
      affectedAgents: []
    };
    
    // For now, return a placeholder analysis
    // In a full implementation, this would load all rules and analyze conflicts
    return analysis;
  }

  /**
   * Calculate precedence for a rule source
   * @param {string} fileName - Rule file name
   * @param {string} agentId - Agent identifier
   * @returns {number} - Precedence value
   */
  calculatePrecedence(fileName, agentId) {
    const precedenceOrder = {
      'bmad-method.md': 1,
      'tech-preferences.md': 2,
      'structure.md': 3,
      'tech.md': 4,
      'product.md': 5,
      'project-specific.md': 6,
      [`${agentId}.md`]: 7
    };
    
    return precedenceOrder[fileName] || 0;
  }

  /**
   * Normalize a rule value for comparison
   * @param {*} value - Rule value
   * @returns {string} - Normalized value
   */
  normalizeValue(value) {
    if (Array.isArray(value)) {
      return value.join(' ').toLowerCase().trim();
    }
    return String(value).toLowerCase().trim();
  }

  /**
   * Format a rule value for display
   * @param {*} value - Rule value
   * @returns {string} - Formatted value
   */
  formatValue(value) {
    if (Array.isArray(value)) {
      return value.map(v => `"${v}"`).join(', ');
    }
    return `"${value}"`;
  }
}

module.exports = SteeringConflictResolver;