/**
 * File Context Integrator
 * Ensures converted BMad agents work seamlessly with Kiro's file context system
 */

const BaseTransformer = require('./base-transformer');
const path = require('path');

class FileContextIntegrator extends BaseTransformer {
  constructor(options = {}) {
    super(options);
    
    // Kiro's file context providers and their capabilities
    this.kiroContextProviders = {
      '#File': {
        description: 'Current file content and metadata',
        capabilities: ['content', 'syntax', 'errors', 'cursor_position'],
        workspaceBoundary: true,
        multiFileSupport: false
      },
      '#Folder': {
        description: 'Directory structure and file listings',
        capabilities: ['structure', 'file_types', 'organization'],
        workspaceBoundary: true,
        multiFileSupport: true
      },
      '#Codebase': {
        description: 'Full project understanding and indexing',
        capabilities: ['architecture', 'dependencies', 'patterns', 'search'],
        workspaceBoundary: true,
        multiFileSupport: true
      },
      '#Problems': {
        description: 'Build errors, linting issues, and diagnostics',
        capabilities: ['errors', 'warnings', 'diagnostics', 'suggestions'],
        workspaceBoundary: true,
        multiFileSupport: true
      },
      '#Terminal': {
        description: 'Command output and build logs',
        capabilities: ['output', 'errors', 'commands', 'history'],
        workspaceBoundary: true,
        multiFileSupport: false
      },
      '#Git Diff': {
        description: 'Version control changes and history',
        capabilities: ['changes', 'history', 'branches', 'commits'],
        workspaceBoundary: true,
        multiFileSupport: true
      }
    };

    // Agent-specific file context requirements
    this.agentFileContextRequirements = {
      'dev': {
        primary: ['#File', '#Problems', '#Terminal'],
        secondary: ['#Git Diff', '#Folder'],
        multiFileOperations: ['refactoring', 'debugging', 'testing'],
        workspaceBoundaryRules: ['respect-gitignore', 'stay-in-project', 'validate-paths']
      },
      'qa': {
        primary: ['#Problems', '#File', '#Terminal'],
        secondary: ['#Git Diff', '#Codebase'],
        multiFileOperations: ['test-coverage', 'quality-analysis', 'regression-testing'],
        workspaceBoundaryRules: ['respect-gitignore', 'stay-in-project', 'validate-test-paths']
      },
      'architect': {
        primary: ['#Codebase', '#Folder'],
        secondary: ['#File', '#Problems'],
        multiFileOperations: ['architecture-analysis', 'dependency-mapping', 'refactoring'],
        workspaceBoundaryRules: ['respect-gitignore', 'stay-in-project', 'analyze-structure']
      },
      'pm': {
        primary: ['#Folder', '#Codebase'],
        secondary: ['#Problems', '#Git Diff'],
        multiFileOperations: ['project-analysis', 'progress-tracking', 'documentation'],
        workspaceBoundaryRules: ['respect-gitignore', 'stay-in-project', 'focus-on-deliverables']
      },
      'analyst': {
        primary: ['#Codebase', '#Folder'],
        secondary: ['#File', '#Problems'],
        multiFileOperations: ['requirements-analysis', 'gap-analysis', 'documentation'],
        workspaceBoundaryRules: ['respect-gitignore', 'stay-in-project', 'comprehensive-analysis']
      },
      'sm': {
        primary: ['#Folder', '#Git Diff'],
        secondary: ['#Problems', '#Terminal'],
        multiFileOperations: ['progress-tracking', 'workflow-analysis', 'team-coordination'],
        workspaceBoundaryRules: ['respect-gitignore', 'stay-in-project', 'track-deliverables']
      }
    };

    // Workspace boundary validation rules
    this.workspaceBoundaryRules = {
      'respect-gitignore': {
        description: 'Honor .gitignore patterns and exclude ignored files',
        implementation: 'validateGitignoreCompliance'
      },
      'stay-in-project': {
        description: 'Only operate within the current project workspace',
        implementation: 'validateProjectBoundaries'
      },
      'validate-paths': {
        description: 'Ensure all file paths are valid and accessible',
        implementation: 'validateFilePaths'
      },
      'validate-test-paths': {
        description: 'Validate test file locations and naming conventions',
        implementation: 'validateTestFilePaths'
      },
      'analyze-structure': {
        description: 'Understand and respect project structure patterns',
        implementation: 'analyzeProjectStructure'
      },
      'focus-on-deliverables': {
        description: 'Focus on user-facing and deliverable components',
        implementation: 'identifyDeliverables'
      },
      'comprehensive-analysis': {
        description: 'Perform thorough analysis while respecting boundaries',
        implementation: 'performComprehensiveAnalysis'
      },
      'track-deliverables': {
        description: 'Track progress on key deliverables and milestones',
        implementation: 'trackDeliverableProgress'
      }
    };

    // Multi-file operation patterns
    this.multiFileOperationPatterns = {
      'refactoring': {
        description: 'Code refactoring across multiple files',
        requiredContext: ['#File', '#Codebase', '#Problems'],
        workspaceValidation: ['validate-paths', 'respect-gitignore'],
        operationSteps: ['analyze-dependencies', 'plan-changes', 'validate-impact', 'execute-refactor']
      },
      'debugging': {
        description: 'Debug issues spanning multiple files',
        requiredContext: ['#File', '#Problems', '#Terminal', '#Git Diff'],
        workspaceValidation: ['validate-paths', 'respect-gitignore'],
        operationSteps: ['identify-issue', 'trace-dependencies', 'analyze-logs', 'propose-fix']
      },
      'testing': {
        description: 'Test implementation and coverage analysis',
        requiredContext: ['#File', '#Problems', '#Terminal', '#Codebase'],
        workspaceValidation: ['validate-test-paths', 'respect-gitignore'],
        operationSteps: ['analyze-coverage', 'identify-gaps', 'plan-tests', 'implement-tests']
      },
      'architecture-analysis': {
        description: 'Analyze and document system architecture',
        requiredContext: ['#Codebase', '#Folder', '#File'],
        workspaceValidation: ['analyze-structure', 'respect-gitignore'],
        operationSteps: ['map-components', 'analyze-dependencies', 'document-patterns', 'identify-improvements']
      },
      'quality-analysis': {
        description: 'Comprehensive code quality assessment',
        requiredContext: ['#Codebase', '#Problems', '#File'],
        workspaceValidation: ['comprehensive-analysis', 'respect-gitignore'],
        operationSteps: ['analyze-metrics', 'identify-issues', 'assess-patterns', 'recommend-improvements']
      }
    };
  }

  /**
   * Integrate file context system for converted BMad agents
   * @param {string} agentContent - Agent content to enhance
   * @param {Object} agentMetadata - Agent metadata including ID and type
   * @param {Object} options - Integration options
   * @returns {string} - Enhanced content with file context integration
   */
  integrateFileContextSystem(agentContent, agentMetadata, options = {}) {
    const { id: agentId, expansionPack } = agentMetadata;
    const requirements = this.agentFileContextRequirements[agentId] || this.getDefaultRequirements();

    // Add file context awareness section
    const contextAwarenessSection = this.generateFileContextAwarenessSection(requirements, agentId, expansionPack);
    
    // Add project understanding integration
    const projectUnderstandingSection = this.generateProjectUnderstandingSection(requirements, agentId);
    
    // Add workspace boundary respect section
    const workspaceBoundarySection = this.generateWorkspaceBoundarySection(requirements, agentId);
    
    // Add multi-file operation support
    const multiFileOperationSection = this.generateMultiFileOperationSection(requirements, agentId);

    // Combine all sections
    const fileContextIntegration = [
      contextAwarenessSection,
      projectUnderstandingSection,
      workspaceBoundarySection,
      multiFileOperationSection
    ].join('\n\n');

    // Insert the integration section after any existing context section
    return this.insertFileContextIntegration(agentContent, fileContextIntegration);
  }

  /**
   * Generate file context awareness section
   * @param {Object} requirements - Agent file context requirements
   * @param {string} agentId - Agent identifier
   * @param {string} expansionPack - Expansion pack name if applicable
   * @returns {string} - File context awareness section
   */
  generateFileContextAwarenessSection(requirements, agentId, expansionPack) {
    const { primary, secondary } = requirements;
    
    let section = `## File Context Integration

### Automatic Context Access
I seamlessly integrate with Kiro's file context system to understand your current work:

**Primary Context Sources:**
${primary.map(provider => {
  const info = this.kiroContextProviders[provider];
  return `- **${provider}**: ${info.description}`;
}).join('\n')}

**Secondary Context Sources:**
${secondary.map(provider => {
  const info = this.kiroContextProviders[provider];
  return `- **${provider}**: ${info.description}`;
}).join('\n')}`;

    // Add expansion pack specific context if applicable
    if (expansionPack) {
      const expansionContext = this.getExpansionPackFileContext(expansionPack);
      if (expansionContext.length > 0) {
        section += `\n\n**${expansionPack} Specific Context:**
${expansionContext.map(ctx => `- ${ctx}`).join('\n')}`;
      }
    }

    section += `\n\n### Context-Aware Operations
When you interact with me, I automatically:
1. **Analyze Current File**: Understand the file you're working with, its purpose, and current state
2. **Assess Project Context**: Consider how the current file fits within your overall project structure
3. **Identify Related Files**: Recognize dependencies and related components that might be affected
4. **Check for Issues**: Review any problems, errors, or warnings in the current context
5. **Consider Recent Changes**: Factor in recent modifications and their potential impact`;

    return section;
  }

  /**
   * Generate project understanding integration section
   * @param {Object} requirements - Agent file context requirements
   * @param {string} agentId - Agent identifier
   * @returns {string} - Project understanding section
   */
  generateProjectUnderstandingSection(requirements, agentId) {
    const agentRole = this.getAgentRole(agentId);
    
    return `## Project Understanding Integration

### Intelligent Project Analysis
I leverage Kiro's project understanding capabilities to provide ${agentRole}-focused insights:

**Architecture Awareness:**
- Understand your project's overall structure and organization patterns
- Recognize architectural decisions and design patterns in use
- Identify key components and their relationships
- Assess compliance with established conventions

**Dependency Intelligence:**
- Map relationships between files and components
- Understand import/export patterns and module dependencies
- Identify potential circular dependencies or architectural issues
- Suggest improvements based on dependency analysis

**Pattern Recognition:**
- Recognize established coding patterns and conventions in your project
- Identify deviations from established patterns
- Suggest consistent approaches based on existing codebase patterns
- Maintain consistency with your project's architectural decisions

**Technology Stack Integration:**
- Understand your specific technology stack and frameworks
- Apply framework-specific best practices and conventions
- Recognize technology-specific patterns and anti-patterns
- Provide recommendations aligned with your chosen technologies`;
  }

  /**
   * Generate workspace boundary respect section
   * @param {Object} requirements - Agent file context requirements
   * @param {string} agentId - Agent identifier
   * @returns {string} - Workspace boundary section
   */
  generateWorkspaceBoundarySection(requirements, agentId) {
    const { workspaceBoundaryRules } = requirements;
    
    let section = `## Workspace Boundary Respect

### Secure and Bounded Operations
I strictly respect your workspace boundaries and project constraints:

**Boundary Enforcement:**`;

    workspaceBoundaryRules.forEach(ruleKey => {
      const rule = this.workspaceBoundaryRules[ruleKey];
      if (rule) {
        section += `\n- **${rule.description}**: Automatically enforced in all operations`;
      }
    });

    section += `\n\n**Security Measures:**
- Never access files outside your current project workspace
- Respect .gitignore patterns and excluded directories
- Validate all file paths before any operations
- Maintain awareness of sensitive files and directories
- Honor project-specific access restrictions

**Project Integrity:**
- Preserve existing project structure and organization
- Maintain consistency with established naming conventions
- Respect version control boundaries and ignore patterns
- Avoid modifications to system or configuration files outside project scope
- Ensure all suggestions align with project constraints`;

    return section;
  }

  /**
   * Generate multi-file operation support section
   * @param {Object} requirements - Agent file context requirements
   * @param {string} agentId - Agent identifier
   * @returns {string} - Multi-file operation section
   */
  generateMultiFileOperationSection(requirements, agentId) {
    const { multiFileOperations } = requirements;
    
    let section = `## Multi-File Operation Support

### Complex Operation Handling
I can intelligently handle operations that span multiple files while maintaining context and consistency:

**Supported Multi-File Operations:**`;

    multiFileOperations.forEach(operationType => {
      const pattern = this.multiFileOperationPatterns[operationType];
      if (pattern) {
        section += `\n- **${pattern.description}**: ${this.getOperationStepsDescription(pattern.operationSteps)}`;
      }
    });

    section += `\n\n**Operation Workflow:**
1. **Context Gathering**: Collect all relevant context from multiple sources
2. **Impact Analysis**: Assess potential impact across related files
3. **Dependency Mapping**: Understand relationships between affected components
4. **Change Planning**: Plan changes with full awareness of dependencies
5. **Validation**: Verify changes maintain project integrity and consistency
6. **Execution**: Implement changes with proper error handling and rollback capability

**Safety Measures:**
- Always analyze dependencies before suggesting changes
- Provide impact assessment for multi-file modifications
- Suggest testing strategies for complex changes
- Maintain backup and rollback recommendations
- Validate changes against project constraints and patterns`;

    return section;
  }

  /**
   * Insert file context integration into agent content
   * @param {string} agentContent - Original agent content
   * @param {string} fileContextIntegration - File context integration content
   * @returns {string} - Enhanced agent content
   */
  insertFileContextIntegration(agentContent, fileContextIntegration) {
    // Look for existing context section to replace or enhance
    const contextSectionRegex = /## Context Awareness[\s\S]*?(?=\n## |\n# |$)/;
    
    if (contextSectionRegex.test(agentContent)) {
      // Replace existing context section with enhanced version
      return agentContent.replace(contextSectionRegex, fileContextIntegration);
    }

    // Look for a good insertion point (after introduction but before capabilities)
    const capabilitiesIndex = agentContent.toLowerCase().indexOf('## capabilities');
    const commandsIndex = agentContent.toLowerCase().indexOf('## commands');
    const workflowIndex = agentContent.toLowerCase().indexOf('## workflow');
    
    // Find the earliest section to insert before
    const insertionPoints = [capabilitiesIndex, commandsIndex, workflowIndex]
      .filter(index => index !== -1)
      .sort((a, b) => a - b);
    
    if (insertionPoints.length > 0) {
      const insertionPoint = insertionPoints[0];
      return agentContent.slice(0, insertionPoint) + 
             fileContextIntegration + '\n\n' + 
             agentContent.slice(insertionPoint);
    }

    // Fallback: append to end
    return agentContent + '\n\n' + fileContextIntegration;
  }

  /**
   * Get default file context requirements for unknown agents
   * @returns {Object} - Default requirements
   */
  getDefaultRequirements() {
    return {
      primary: ['#File', '#Folder'],
      secondary: ['#Codebase', '#Problems'],
      multiFileOperations: ['refactoring', 'debugging'],
      workspaceBoundaryRules: ['respect-gitignore', 'stay-in-project', 'validate-paths']
    };
  }

  /**
   * Get expansion pack specific file context
   * @param {string} expansionPack - Expansion pack name
   * @returns {Array} - Array of expansion-specific context descriptions
   */
  getExpansionPackFileContext(expansionPack) {
    const expansionContextMap = {
      'bmad-2d-phaser-game-dev': [
        'Game asset files (sprites, sounds, animations)',
        'Phaser.js scene and state files',
        'Game configuration and settings files',
        'Asset loading and management scripts'
      ],
      'bmad-2d-unity-game-dev': [
        'Unity scene files and prefabs',
        'C# script files and MonoBehaviour components',
        'Unity asset files and import settings',
        'Animation controllers and state machines'
      ],
      'bmad-infrastructure-devops': [
        'Infrastructure as Code files (Terraform, CloudFormation)',
        'CI/CD pipeline configurations',
        'Container definitions and orchestration files',
        'Configuration and environment files'
      ]
    };

    return expansionContextMap[expansionPack] || [];
  }

  /**
   * Get agent role description
   * @param {string} agentId - Agent identifier
   * @returns {string} - Agent role description
   */
  getAgentRole(agentId) {
    const roleMap = {
      'dev': 'development',
      'qa': 'quality assurance',
      'architect': 'architecture',
      'pm': 'project management',
      'analyst': 'business analysis',
      'sm': 'scrum management'
    };

    return roleMap[agentId] || 'development support';
  }

  /**
   * Get operation steps description
   * @param {Array} operationSteps - Array of operation step keys
   * @returns {string} - Human-readable description of steps
   */
  getOperationStepsDescription(operationSteps) {
    const stepDescriptions = {
      'analyze-dependencies': 'analyze dependencies',
      'plan-changes': 'plan changes',
      'validate-impact': 'validate impact',
      'execute-refactor': 'execute refactoring',
      'identify-issue': 'identify issues',
      'trace-dependencies': 'trace dependencies',
      'analyze-logs': 'analyze logs',
      'propose-fix': 'propose fixes',
      'analyze-coverage': 'analyze test coverage',
      'identify-gaps': 'identify gaps',
      'plan-tests': 'plan tests',
      'implement-tests': 'implement tests',
      'map-components': 'map components',
      'document-patterns': 'document patterns',
      'identify-improvements': 'identify improvements',
      'analyze-metrics': 'analyze metrics',
      'identify-issues': 'identify issues',
      'assess-patterns': 'assess patterns',
      'recommend-improvements': 'recommend improvements'
    };

    return operationSteps
      .map(step => stepDescriptions[step] || step)
      .join(', ');
  }

  /**
   * Validate workspace boundaries for file operations
   * @param {string} filePath - File path to validate
   * @param {Object} workspaceConfig - Workspace configuration
   * @returns {Object} - Validation result
   */
  async validateWorkspaceBoundaries(filePath, workspaceConfig = {}) {
    const fs = require('fs-extra');
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      normalizedPath: null
    };

    try {
      // Normalize the path
      const normalizedPath = path.resolve(filePath);
      validation.normalizedPath = normalizedPath;

      // Check if path is within workspace
      const workspaceRoot = workspaceConfig.root || process.cwd();
      const relativePath = path.relative(workspaceRoot, normalizedPath);
      
      if (relativePath.startsWith('..')) {
        validation.valid = false;
        validation.errors.push('Path is outside workspace boundaries');
        return validation;
      }

      // Check if file exists and is accessible
      if (await fs.pathExists(normalizedPath)) {
        try {
          await fs.access(normalizedPath, fs.constants.R_OK);
        } catch (error) {
          validation.valid = false;
          validation.errors.push('File is not readable');
        }
      } else {
        validation.warnings.push('File does not exist');
      }

      // Check gitignore patterns if available
      if (workspaceConfig.respectGitignore !== false) {
        const isIgnored = await this.checkGitignorePatterns(relativePath, workspaceRoot);
        if (isIgnored) {
          validation.warnings.push('File matches .gitignore patterns');
        }
      }

    } catch (error) {
      validation.valid = false;
      validation.errors.push(`Path validation error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Check if file matches gitignore patterns
   * @param {string} relativePath - Relative file path
   * @param {string} workspaceRoot - Workspace root directory
   * @returns {Promise<boolean>} - True if file should be ignored
   */
  async checkGitignorePatterns(relativePath, workspaceRoot) {
    const fs = require('fs-extra');
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    
    if (!await fs.pathExists(gitignorePath)) {
      return false;
    }

    try {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
      const patterns = gitignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      // Simple pattern matching (could be enhanced with proper gitignore parsing)
      for (const pattern of patterns) {
        if (this.matchesGitignorePattern(relativePath, pattern)) {
          return true;
        }
      }
    } catch (error) {
      this.log(`Error reading .gitignore: ${error.message}`, 'warn');
    }

    return false;
  }

  /**
   * Check if path matches gitignore pattern
   * @param {string} filePath - File path to check
   * @param {string} pattern - Gitignore pattern
   * @returns {boolean} - True if path matches pattern
   */
  matchesGitignorePattern(filePath, pattern) {
    // Simple pattern matching - could be enhanced with proper glob matching
    if (pattern.endsWith('/')) {
      // Directory pattern
      return filePath.startsWith(pattern) || filePath.includes('/' + pattern);
    } else if (pattern.includes('*')) {
      // Wildcard pattern - basic implementation
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      return new RegExp(regexPattern).test(filePath);
    } else {
      // Exact match or exact filename match (not substring)
      const fileName = path.basename(filePath);
      return filePath === pattern || fileName === pattern || filePath.endsWith('/' + pattern);
    }
  }

  /**
   * Analyze project structure for workspace boundary understanding
   * @param {string} workspaceRoot - Workspace root directory
   * @returns {Promise<Object>} - Project structure analysis
   */
  async analyzeProjectStructure(workspaceRoot) {
    const fs = require('fs-extra');
    const analysis = {
      structure: {},
      patterns: [],
      boundaries: [],
      recommendations: []
    };

    try {
      // Analyze directory structure
      analysis.structure = await this.buildDirectoryStructure(workspaceRoot);
      
      // Identify common patterns
      analysis.patterns = this.identifyStructurePatterns(analysis.structure);
      
      // Define workspace boundaries
      analysis.boundaries = this.defineWorkspaceBoundaries(analysis.structure, analysis.patterns);
      
      // Generate recommendations
      analysis.recommendations = this.generateStructureRecommendations(analysis);

    } catch (error) {
      this.log(`Error analyzing project structure: ${error.message}`, 'error');
      analysis.error = error.message;
    }

    return analysis;
  }

  /**
   * Build directory structure recursively
   * @param {string} dirPath - Directory path to analyze
   * @param {number} maxDepth - Maximum recursion depth
   * @returns {Promise<Object>} - Directory structure object
   */
  async buildDirectoryStructure(dirPath, maxDepth = 3) {
    const fs = require('fs-extra');
    const structure = {
      name: path.basename(dirPath),
      type: 'directory',
      children: [],
      path: dirPath
    };

    if (maxDepth <= 0) {
      return structure;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        
        // Skip hidden files and common ignore patterns
        if (entry.name.startsWith('.') && entry.name !== '.gitignore') {
          continue;
        }
        
        if (entry.isDirectory()) {
          const childStructure = await this.buildDirectoryStructure(entryPath, maxDepth - 1);
          structure.children.push(childStructure);
        } else {
          structure.children.push({
            name: entry.name,
            type: 'file',
            path: entryPath,
            extension: path.extname(entry.name)
          });
        }
      }
    } catch (error) {
      this.log(`Error reading directory ${dirPath}: ${error.message}`, 'warn');
    }

    return structure;
  }

  /**
   * Identify common project structure patterns
   * @param {Object} structure - Directory structure object
   * @returns {Array} - Array of identified patterns
   */
  identifyStructurePatterns(structure) {
    const patterns = [];
    
    // Check for common project patterns
    const directories = this.extractDirectoryNames(structure);
    
    if (directories.includes('src') || directories.includes('lib')) {
      patterns.push('source-separation');
    }
    
    if (directories.includes('test') || directories.includes('tests') || directories.includes('__tests__')) {
      patterns.push('test-separation');
    }
    
    if (directories.includes('docs') || directories.includes('documentation')) {
      patterns.push('documentation-structure');
    }
    
    if (directories.includes('config') || directories.includes('configs')) {
      patterns.push('configuration-separation');
    }
    
    if (directories.includes('assets') || directories.includes('public') || directories.includes('static')) {
      patterns.push('asset-organization');
    }

    return patterns;
  }

  /**
   * Extract directory names from structure
   * @param {Object} structure - Directory structure object
   * @returns {Array} - Array of directory names
   */
  extractDirectoryNames(structure) {
    const names = [];
    
    if (structure.children) {
      for (const child of structure.children) {
        if (child.type === 'directory') {
          names.push(child.name);
          names.push(...this.extractDirectoryNames(child));
        }
      }
    }
    
    return names;
  }

  /**
   * Define workspace boundaries based on structure analysis
   * @param {Object} structure - Directory structure object
   * @param {Array} patterns - Identified patterns
   * @returns {Array} - Array of boundary definitions
   */
  defineWorkspaceBoundaries(structure, patterns) {
    const boundaries = [
      {
        type: 'include',
        pattern: 'src/**/*',
        description: 'Source code files'
      },
      {
        type: 'include',
        pattern: 'lib/**/*',
        description: 'Library files'
      },
      {
        type: 'exclude',
        pattern: 'node_modules/**/*',
        description: 'Dependencies'
      },
      {
        type: 'exclude',
        pattern: '.git/**/*',
        description: 'Version control'
      }
    ];

    // Add pattern-specific boundaries
    if (patterns.includes('test-separation')) {
      boundaries.push({
        type: 'include',
        pattern: 'test/**/*',
        description: 'Test files'
      });
    }

    if (patterns.includes('documentation-structure')) {
      boundaries.push({
        type: 'include',
        pattern: 'docs/**/*',
        description: 'Documentation files'
      });
    }

    return boundaries;
  }

  /**
   * Generate structure recommendations
   * @param {Object} analysis - Project structure analysis
   * @returns {Array} - Array of recommendations
   */
  generateStructureRecommendations(analysis) {
    const recommendations = [];
    
    if (!analysis.patterns.includes('source-separation')) {
      recommendations.push({
        type: 'structure',
        priority: 'medium',
        description: 'Consider organizing source code in a dedicated src/ directory'
      });
    }
    
    if (!analysis.patterns.includes('test-separation')) {
      recommendations.push({
        type: 'testing',
        priority: 'high',
        description: 'Consider organizing tests in a dedicated test/ or __tests__/ directory'
      });
    }
    
    if (!analysis.patterns.includes('documentation-structure')) {
      recommendations.push({
        type: 'documentation',
        priority: 'low',
        description: 'Consider adding a docs/ directory for project documentation'
      });
    }

    return recommendations;
  }
}

module.exports = FileContextIntegrator;