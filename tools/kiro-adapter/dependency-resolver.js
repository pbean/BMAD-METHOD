/**
 * Dependency Resolution System
 * Handles scanning, validation, and resolution of BMad agent dependencies
 */

const fs = require('fs-extra');
const path = require('path');
const BaseTransformer = require('./base-transformer');

class DependencyResolver extends BaseTransformer {
  constructor(options = {}) {
    super(options);
    this.options = {
      rootPath: options.rootPath || process.cwd(),
      validateDependencies: options.validateDependencies !== false,
      autoResolveMissing: options.autoResolveMissing || false,
      ...options
    };
    
    this.dependencyCache = new Map();
    this.resolutionErrors = [];
    this.dependencyGraph = new Map();
  }

  /**
   * Scan and resolve all dependencies for an agent
   * @param {Object} agentMetadata - Agent metadata from discovery
   * @returns {Promise<Object>} - Resolution result with dependencies and errors
   */
  async scanAgentDependencies(agentMetadata) {
    this.log(`Scanning dependencies for agent: ${agentMetadata.id}`);
    
    const { dependencies, source, expansionPack, filePath } = agentMetadata;
    const resolutionResult = {
      agentId: agentMetadata.id,
      resolvedDependencies: {},
      missingDependencies: {},
      errors: [],
      warnings: []
    };

    // Process each dependency type
    for (const [type, deps] of Object.entries(dependencies)) {
      if (type === 'other') continue;
      
      resolutionResult.resolvedDependencies[type] = {};
      resolutionResult.missingDependencies[type] = [];
      
      for (const dep of deps) {
        const resolution = await this.resolveDependency(source, expansionPack, type, dep);
        
        if (resolution.found) {
          resolutionResult.resolvedDependencies[type][dep] = resolution;
        } else {
          resolutionResult.missingDependencies[type].push({
            name: dep,
            searchedPaths: resolution.searchedPaths,
            suggestions: resolution.suggestions
          });
          resolutionResult.errors.push(`Missing ${type} dependency: ${dep}`);
        }
      }
    }

    // Add expansion pack specific dependencies
    if (expansionPack) {
      const expansionDeps = await this.scanExpansionPackDependencies(expansionPack, agentMetadata);
      this.mergeDependencyResults(resolutionResult, expansionDeps);
    }

    // Validate dependency graph for circular dependencies
    const circularDeps = this.detectCircularDependencies(agentMetadata.id, resolutionResult);
    if (circularDeps.length > 0) {
      resolutionResult.warnings.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`);
    }

    return resolutionResult;
  }

  /**
   * Resolve a single dependency
   * @param {string} source - Agent source (bmad-core, expansion-pack)
   * @param {string} expansionPack - Expansion pack name (if applicable)
   * @param {string} type - Dependency type (tasks, templates, etc.)
   * @param {string} dep - Dependency name
   * @returns {Promise<Object>} - Resolution result
   */
  async resolveDependency(source, expansionPack, type, dep) {
    // Check cache first
    const cacheKey = `${source}:${expansionPack}:${type}:${dep}`;
    if (this.dependencyCache.has(cacheKey)) {
      return this.dependencyCache.get(cacheKey);
    }

    const resolution = {
      name: dep,
      type: type,
      found: false,
      path: null,
      content: null,
      metadata: {},
      searchedPaths: [],
      suggestions: []
    };

    // Get all possible paths for this dependency
    const possiblePaths = this.getDependencyPaths(source, expansionPack, type, dep);
    resolution.searchedPaths = possiblePaths;

    // Try to find the dependency
    for (const depPath of possiblePaths) {
      if (await fs.pathExists(depPath)) {
        resolution.found = true;
        resolution.path = depPath;
        
        // Load content and metadata
        try {
          resolution.content = await fs.readFile(depPath, 'utf8');
          resolution.metadata = await this.extractDependencyMetadata(depPath, type);
        } catch (error) {
          this.log(`Error loading dependency ${dep}: ${error.message}`, 'warn');
        }
        
        break;
      }
    }

    // Generate suggestions for missing dependencies
    if (!resolution.found) {
      resolution.suggestions = await this.generateDependencySuggestions(source, expansionPack, type, dep);
    }

    // Cache the result
    this.dependencyCache.set(cacheKey, resolution);
    
    return resolution;
  }

  /**
   * Get all possible paths for a dependency
   * @param {string} source - Agent source
   * @param {string} expansionPack - Expansion pack name
   * @param {string} type - Dependency type
   * @param {string} dep - Dependency name
   * @returns {Array} - Array of possible paths
   */
  getDependencyPaths(source, expansionPack, type, dep) {
    const paths = [];
    
    // Ensure dependency has proper extension
    const depWithExt = this.ensureDependencyExtension(type, dep);
    
    // Primary path based on source
    if (source === 'bmad-core') {
      paths.push(path.join(this.options.rootPath, 'bmad-core', type, depWithExt));
    } else if (source === 'expansion-pack' && expansionPack) {
      paths.push(path.join(this.options.rootPath, 'expansion-packs', expansionPack, type, depWithExt));
    }
    
    // Fallback to common directory
    paths.push(path.join(this.options.rootPath, 'common', type, depWithExt));
    
    // For expansion packs, also check bmad-core as fallback
    if (source === 'expansion-pack') {
      paths.push(path.join(this.options.rootPath, 'bmad-core', type, depWithExt));
    }
    
    // Check alternative naming conventions
    const alternatives = this.getAlternativeNamingConventions(depWithExt);
    for (const alt of alternatives) {
      if (source === 'bmad-core') {
        paths.push(path.join(this.options.rootPath, 'bmad-core', type, alt));
      } else if (source === 'expansion-pack' && expansionPack) {
        paths.push(path.join(this.options.rootPath, 'expansion-packs', expansionPack, type, alt));
      }
      paths.push(path.join(this.options.rootPath, 'common', type, alt));
    }
    
    return paths;
  }

  /**
   * Ensure dependency has proper file extension
   * @param {string} type - Dependency type
   * @param {string} dep - Dependency name
   * @returns {string} - Dependency with proper extension
   */
  ensureDependencyExtension(type, dep) {
    const extensionMap = {
      'tasks': '.md',
      'templates': '.yaml',
      'checklists': '.md',
      'data': '.md',
      'utils': '.md'
    };

    const expectedExt = extensionMap[type] || '.md';
    
    if (dep.endsWith(expectedExt)) {
      return dep;
    }
    
    // Remove any existing extension and add the correct one
    const baseName = path.parse(dep).name;
    return baseName + expectedExt;
  }

  /**
   * Get alternative naming conventions for dependencies
   * @param {string} dep - Dependency name
   * @returns {Array} - Array of alternative names
   */
  getAlternativeNamingConventions(dep) {
    const alternatives = [];
    const baseName = path.parse(dep).name;
    const ext = path.parse(dep).ext;
    
    // Convert between kebab-case and snake_case
    if (baseName.includes('-')) {
      alternatives.push(baseName.replace(/-/g, '_') + ext);
    }
    if (baseName.includes('_')) {
      alternatives.push(baseName.replace(/_/g, '-') + ext);
    }
    
    // Try with and without common prefixes/suffixes
    const prefixes = ['bmad-', 'common-'];
    const suffixes = ['-task', '-template', '-checklist', '-util'];
    
    for (const prefix of prefixes) {
      if (!baseName.startsWith(prefix)) {
        alternatives.push(prefix + baseName + ext);
      } else {
        alternatives.push(baseName.substring(prefix.length) + ext);
      }
    }
    
    for (const suffix of suffixes) {
      if (!baseName.endsWith(suffix.replace('-', ''))) {
        alternatives.push(baseName + suffix + ext);
      }
    }
    
    return alternatives;
  }

  /**
   * Extract metadata from dependency file
   * @param {string} filePath - Path to dependency file
   * @param {string} type - Dependency type
   * @returns {Promise<Object>} - Dependency metadata
   */
  async extractDependencyMetadata(filePath, type) {
    const metadata = {
      type: type,
      filePath: filePath,
      size: 0,
      lastModified: null,
      dependencies: [],
      exports: []
    };

    try {
      const stats = await fs.stat(filePath);
      metadata.size = stats.size;
      metadata.lastModified = stats.mtime;

      const content = await fs.readFile(filePath, 'utf8');
      
      // Extract front matter if present
      const { frontMatter } = this.parseYAMLFrontMatter(content);
      if (frontMatter) {
        metadata.frontMatter = frontMatter;
        
        // Extract dependencies from front matter
        if (frontMatter.dependencies) {
          metadata.dependencies = this.extractDependenciesFromFrontMatter(frontMatter.dependencies);
        }
      }

      // Extract inline dependencies and references
      const inlineDeps = this.extractInlineDependencies(content);
      metadata.dependencies.push(...inlineDeps);

      // Extract exports/provides information
      metadata.exports = this.extractExports(content, type);

    } catch (error) {
      this.log(`Error extracting metadata from ${filePath}: ${error.message}`, 'warn');
    }

    return metadata;
  }

  /**
   * Extract dependencies from front matter
   * @param {Object|Array} dependencies - Dependencies from front matter
   * @returns {Array} - Normalized dependencies array
   */
  extractDependenciesFromFrontMatter(dependencies) {
    const deps = [];
    
    if (Array.isArray(dependencies)) {
      deps.push(...dependencies);
    } else if (typeof dependencies === 'object') {
      Object.values(dependencies).forEach(depArray => {
        if (Array.isArray(depArray)) {
          deps.push(...depArray);
        }
      });
    }
    
    return deps;
  }

  /**
   * Extract inline dependencies from content
   * @param {string} content - File content
   * @returns {Array} - Array of inline dependencies
   */
  extractInlineDependencies(content) {
    const deps = [];
    
    // Look for common dependency patterns
    const patterns = [
      /\[\[([^\]]+)\]\]/g,  // [[dependency]]
      /\{\{([^}]+)\}\}/g,   // {{dependency}}
      /@include\s+([^\s]+)/g, // @include dependency
      /\*\*([^*]+)\*\*/g    // **dependency**
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const dep = match[1].trim();
        if (dep && !deps.includes(dep)) {
          deps.push(dep);
        }
      }
    }
    
    return deps;
  }

  /**
   * Extract exports/provides from content
   * @param {string} content - File content
   * @param {string} type - Dependency type
   * @returns {Array} - Array of exports
   */
  extractExports(content, type) {
    const exports = [];
    
    // Type-specific export extraction
    switch (type) {
      case 'tasks':
        // Extract task names from headers
        const taskHeaders = content.match(/^#+\s+(.+)$/gm);
        if (taskHeaders) {
          exports.push(...taskHeaders.map(h => h.replace(/^#+\s+/, '').trim()));
        }
        break;
        
      case 'templates':
        // Extract template names from YAML
        try {
          const yaml = require('js-yaml');
          const parsed = yaml.load(content);
          if (parsed && parsed.name) {
            exports.push(parsed.name);
          }
        } catch (error) {
          // Ignore YAML parsing errors
        }
        break;
        
      case 'checklists':
        // Extract checklist items
        const checklistItems = content.match(/^-\s+\[.\]\s+(.+)$/gm);
        if (checklistItems) {
          exports.push(...checklistItems.map(item => item.replace(/^-\s+\[.\]\s+/, '').trim()));
        }
        break;
    }
    
    return exports;
  }

  /**
   * Generate suggestions for missing dependencies
   * @param {string} source - Agent source
   * @param {string} expansionPack - Expansion pack name
   * @param {string} type - Dependency type
   * @param {string} dep - Missing dependency name
   * @returns {Promise<Array>} - Array of suggestions
   */
  async generateDependencySuggestions(source, expansionPack, type, dep) {
    const suggestions = [];
    
    try {
      // Find similar files in the expected directories
      const searchDirs = [];
      
      if (source === 'bmad-core') {
        searchDirs.push(path.join(this.options.rootPath, 'bmad-core', type));
      } else if (source === 'expansion-pack' && expansionPack) {
        searchDirs.push(path.join(this.options.rootPath, 'expansion-packs', expansionPack, type));
      }
      searchDirs.push(path.join(this.options.rootPath, 'common', type));
      
      for (const dir of searchDirs) {
        if (await fs.pathExists(dir)) {
          const files = await fs.readdir(dir);
          const similarFiles = this.findSimilarFiles(dep, files);
          suggestions.push(...similarFiles.map(file => ({
            type: 'similar-file',
            suggestion: file,
            directory: dir,
            confidence: this.calculateSimilarity(dep, file)
          })));
        }
      }
      
      // Sort by confidence
      suggestions.sort((a, b) => b.confidence - a.confidence);
      
      // Add creation suggestions
      suggestions.push({
        type: 'create-new',
        suggestion: `Create new ${type} file: ${dep}`,
        directory: source === 'bmad-core' 
          ? path.join(this.options.rootPath, 'bmad-core', type)
          : path.join(this.options.rootPath, 'common', type),
        confidence: 0.5
      });
      
    } catch (error) {
      this.log(`Error generating suggestions for ${dep}: ${error.message}`, 'warn');
    }
    
    return suggestions.slice(0, 5); // Limit to top 5 suggestions
  }

  /**
   * Find files similar to the missing dependency
   * @param {string} target - Target filename
   * @param {Array} files - Available files
   * @returns {Array} - Array of similar files
   */
  findSimilarFiles(target, files) {
    const targetBase = path.parse(target).name.toLowerCase();
    const similar = [];
    
    for (const file of files) {
      const fileBase = path.parse(file).name.toLowerCase();
      const similarity = this.calculateSimilarity(targetBase, fileBase);
      
      if (similarity > 0.3) { // 30% similarity threshold
        similar.push(file);
      }
    }
    
    return similar;
  }

  /**
   * Calculate similarity between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Scan expansion pack specific dependencies
   * @param {string} expansionPack - Expansion pack name
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Promise<Object>} - Expansion pack dependency results
   */
  async scanExpansionPackDependencies(expansionPack, agentMetadata) {
    const expansionDeps = {
      resolvedDependencies: {},
      missingDependencies: {},
      errors: [],
      warnings: []
    };

    // Get expansion pack specific dependencies
    const packDependencies = this.getExpansionPackDependencies(expansionPack);
    
    for (const [type, deps] of Object.entries(packDependencies)) {
      expansionDeps.resolvedDependencies[type] = {};
      expansionDeps.missingDependencies[type] = [];
      
      for (const dep of deps) {
        const resolution = await this.resolveDependency('expansion-pack', expansionPack, type, dep);
        
        if (resolution.found) {
          expansionDeps.resolvedDependencies[type][dep] = resolution;
        } else {
          expansionDeps.missingDependencies[type].push({
            name: dep,
            searchedPaths: resolution.searchedPaths,
            suggestions: resolution.suggestions
          });
          expansionDeps.errors.push(`Missing expansion pack ${type} dependency: ${dep}`);
        }
      }
    }

    return expansionDeps;
  }

  /**
   * Get expansion pack specific dependencies
   * @param {string} expansionPack - Expansion pack name
   * @returns {Object} - Expansion pack dependencies
   */
  getExpansionPackDependencies(expansionPack) {
    const expansionDependencyMap = {
      'bmad-2d-phaser-game-dev': {
        templates: ['game-architecture-tmpl.yaml', 'game-design-doc-tmpl.yaml'],
        tasks: ['create-game-story.md', 'game-design-brainstorming.md'],
        checklists: ['game-design-checklist.md', 'game-story-dod-checklist.md'],
        data: ['development-guidelines.md']
      },
      'bmad-2d-unity-game-dev': {
        templates: ['game-architecture-tmpl.yaml', 'game-design-doc-tmpl.yaml'],
        tasks: ['create-game-story.md', 'game-design-brainstorming.md'],
        checklists: ['game-architect-checklist.md', 'game-design-checklist.md'],
        data: ['development-guidelines.md']
      },
      'bmad-infrastructure-devops': {
        templates: ['infrastructure-architecture-tmpl.yaml'],
        tasks: ['review-infrastructure.md', 'validate-infrastructure.md'],
        checklists: ['infrastructure-checklist.md'],
        data: ['bmad-kb.md']
      }
    };

    return expansionDependencyMap[expansionPack] || {};
  }

  /**
   * Merge dependency resolution results
   * @param {Object} mainResult - Main resolution result
   * @param {Object} additionalResult - Additional result to merge
   */
  mergeDependencyResults(mainResult, additionalResult) {
    // Merge resolved dependencies
    for (const [type, deps] of Object.entries(additionalResult.resolvedDependencies)) {
      if (!mainResult.resolvedDependencies[type]) {
        mainResult.resolvedDependencies[type] = {};
      }
      Object.assign(mainResult.resolvedDependencies[type], deps);
    }

    // Merge missing dependencies
    for (const [type, deps] of Object.entries(additionalResult.missingDependencies)) {
      if (!mainResult.missingDependencies[type]) {
        mainResult.missingDependencies[type] = [];
      }
      mainResult.missingDependencies[type].push(...deps);
    }

    // Merge errors and warnings
    mainResult.errors.push(...additionalResult.errors);
    mainResult.warnings.push(...additionalResult.warnings);
  }

  /**
   * Detect circular dependencies
   * @param {string} agentId - Agent ID
   * @param {Object} resolutionResult - Resolution result
   * @returns {Array} - Array of circular dependency chains
   */
  detectCircularDependencies(agentId, resolutionResult) {
    // Build dependency graph
    this.dependencyGraph.set(agentId, new Set());
    
    for (const [type, deps] of Object.entries(resolutionResult.resolvedDependencies)) {
      for (const [depName, resolution] of Object.entries(deps)) {
        if (resolution.metadata && resolution.metadata.dependencies) {
          for (const subDep of resolution.metadata.dependencies) {
            this.dependencyGraph.get(agentId).add(subDep);
          }
        }
      }
    }

    // Detect cycles using DFS
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const dfs = (node, path) => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).concat([node]));
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);

      const dependencies = this.dependencyGraph.get(node) || new Set();
      for (const dep of dependencies) {
        dfs(dep, [...path, node]);
      }

      recursionStack.delete(node);
    };

    dfs(agentId, []);
    return cycles;
  }

  /**
   * Validate dependency and report errors
   * @param {Object} resolutionResult - Resolution result
   * @returns {Object} - Validation report
   */
  validateDependencyResolution(resolutionResult) {
    const report = {
      isValid: true,
      errors: [],
      warnings: [],
      statistics: {
        totalDependencies: 0,
        resolvedDependencies: 0,
        missingDependencies: 0
      }
    };

    // Count dependencies
    for (const [type, deps] of Object.entries(resolutionResult.resolvedDependencies)) {
      report.statistics.resolvedDependencies += Object.keys(deps).length;
    }

    for (const [type, deps] of Object.entries(resolutionResult.missingDependencies)) {
      report.statistics.missingDependencies += deps.length;
    }

    report.statistics.totalDependencies = 
      report.statistics.resolvedDependencies + report.statistics.missingDependencies;

    // Validate resolution
    if (report.statistics.missingDependencies > 0) {
      report.isValid = false;
      report.errors.push(`${report.statistics.missingDependencies} dependencies could not be resolved`);
    }

    // Add resolution errors and warnings
    report.errors.push(...resolutionResult.errors);
    report.warnings.push(...resolutionResult.warnings);

    return report;
  }

  /**
   * Get dependency cache statistics
   * @returns {Object} - Cache statistics
   */
  getCacheStatistics() {
    return {
      cacheSize: this.dependencyCache.size,
      resolutionErrors: this.resolutionErrors.length,
      dependencyGraphSize: this.dependencyGraph.size
    };
  }

  /**
   * Clear dependency cache
   */
  clearCache() {
    this.dependencyCache.clear();
    this.resolutionErrors = [];
    this.dependencyGraph.clear();
  }
}

module.exports = DependencyResolver;