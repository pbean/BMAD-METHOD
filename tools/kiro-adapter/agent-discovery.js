/**
 * Agent Discovery System
 * Enhanced agent discovery and scanning for BMad agents (core and expansion packs)
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');

class AgentDiscovery {
  constructor(options = {}) {
    this.options = {
      rootPath: options.rootPath || process.cwd(),
      verbose: options.verbose || false,
      validateDependencies: options.validateDependencies !== false,
      ...options
    };
    
    this.discoveredAgents = new Map();
    this.validationErrors = [];
    this.dependencyMap = new Map();
  }

  /**
   * Scan all BMad agents (core and expansion packs)
   * @returns {Promise<Array>} Array of discovered agent metadata
   */
  async scanAllAgents() {
    this.log('Starting comprehensive agent discovery...');
    
    try {
      // Clear previous results
      this.discoveredAgents.clear();
      this.validationErrors = [];
      this.dependencyMap.clear();

      // Scan core agents
      const coreAgents = await this.scanCoreAgents();
      this.log(`Found ${coreAgents.length} core agents`);

      // Scan expansion pack agents
      const expansionAgents = await this.scanExpansionPackAgents();
      this.log(`Found ${expansionAgents.length} expansion pack agents`);

      // Combine and validate all agents
      const allAgents = [...coreAgents, ...expansionAgents];
      
      if (this.options.validateDependencies) {
        await this.validateAllDependencies(allAgents);
      }

      this.log(`Total agents discovered: ${allAgents.length}`);
      return allAgents;
      
    } catch (error) {
      this.log(`Error during agent discovery: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Scan core BMad agents from bmad-core/agents/
   * @returns {Promise<Array>} Array of core agent metadata
   */
  async scanCoreAgents() {
    const coreAgentsPath = path.join(this.options.rootPath, 'bmad-core', 'agents');
    
    if (!await fs.pathExists(coreAgentsPath)) {
      this.log(`Core agents directory not found: ${coreAgentsPath}`, 'warn');
      return [];
    }

    return await this.scanAgentsInDirectory(coreAgentsPath, {
      source: 'bmad-core',
      type: 'core'
    });
  }

  /**
   * Scan expansion pack agents from expansion-packs/[pack-name]/agents/
   * @returns {Promise<Array>} Array of expansion pack agent metadata
   */
  async scanExpansionPackAgents() {
    const expansionPacksPath = path.join(this.options.rootPath, 'expansion-packs');
    
    if (!await fs.pathExists(expansionPacksPath)) {
      this.log(`Expansion packs directory not found: ${expansionPacksPath}`, 'warn');
      return [];
    }

    const expansionAgents = [];
    
    // Find all expansion pack directories
    const expansionDirs = await fs.readdir(expansionPacksPath);
    
    for (const expansionDir of expansionDirs) {
      const expansionPath = path.join(expansionPacksPath, expansionDir);
      const agentsPath = path.join(expansionPath, 'agents');
      
      // Skip if not a directory or no agents folder
      if (!await fs.pathExists(agentsPath)) {
        continue;
      }

      const stat = await fs.stat(expansionPath);
      if (!stat.isDirectory()) {
        continue;
      }

      this.log(`Scanning expansion pack: ${expansionDir}`);
      
      const packAgents = await this.scanAgentsInDirectory(agentsPath, {
        source: 'expansion-pack',
        type: 'expansion',
        expansionPack: expansionDir
      });

      expansionAgents.push(...packAgents);
    }

    return expansionAgents;
  }

  /**
   * Scan agents in a specific directory
   * @param {string} directoryPath - Path to agents directory
   * @param {Object} metadata - Additional metadata for agents
   * @returns {Promise<Array>} Array of agent metadata
   */
  async scanAgentsInDirectory(directoryPath, metadata = {}) {
    const agents = [];
    
    try {
      const agentFiles = await fs.readdir(directoryPath);
      
      for (const file of agentFiles) {
        if (!file.endsWith('.md')) {
          continue;
        }

        const filePath = path.join(directoryPath, file);
        const agentMetadata = await this.extractAgentMetadata(filePath, metadata);
        
        if (agentMetadata) {
          agents.push(agentMetadata);
          this.discoveredAgents.set(agentMetadata.id, agentMetadata);
        }
      }
      
    } catch (error) {
      this.log(`Error scanning directory ${directoryPath}: ${error.message}`, 'error');
    }

    return agents;
  }

  /**
   * Extract metadata from a BMad agent file
   * @param {string} filePath - Path to agent file
   * @param {Object} additionalMetadata - Additional metadata to include
   * @returns {Promise<Object|null>} Agent metadata or null if invalid
   */
  async extractAgentMetadata(filePath, additionalMetadata = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const parsedAgent = this.parseBMadAgent(content);
      
      if (!parsedAgent.frontMatter || Object.keys(parsedAgent.frontMatter).length === 0) {
        this.addValidationError(filePath, 'No valid YAML configuration found');
        return null;
      }

      const agent = parsedAgent.frontMatter.agent || {};
      const persona = parsedAgent.frontMatter.persona || {};
      const commands = parsedAgent.frontMatter.commands || [];
      const dependencies = parsedAgent.frontMatter.dependencies || {};

      // Create comprehensive metadata
      const metadata = {
        // Basic identification
        id: agent.id || path.basename(filePath, '.md'),
        name: agent.name || this.generateAgentName(filePath),
        title: agent.title || 'Assistant',
        icon: agent.icon || '🤖',
        
        // File information
        filePath: filePath,
        relativePath: path.relative(this.options.rootPath, filePath),
        fileName: path.basename(filePath),
        
        // Source information
        source: additionalMetadata.source || 'unknown',
        type: additionalMetadata.type || 'unknown',
        expansionPack: additionalMetadata.expansionPack || null,
        
        // Agent configuration
        whenToUse: agent.whenToUse || null,
        customization: agent.customization || null,
        
        // Persona information
        persona: {
          role: persona.role || null,
          style: persona.style || null,
          identity: persona.identity || null,
          focus: persona.focus || null,
          core_principles: persona.core_principles || []
        },
        
        // Commands and capabilities
        commands: this.extractCommands(commands),
        
        // Dependencies
        dependencies: this.extractDependencies(dependencies),
        
        // Validation status
        isValid: true,
        validationErrors: [],
        
        // Timestamps
        discoveredAt: new Date().toISOString(),
        
        // Raw content for transformation
        rawContent: content,
        parsedContent: parsedAgent,
        
        // Additional metadata
        ...additionalMetadata
      };

      // Validate the agent
      const validationResult = this.validateAgentFormat(metadata);
      metadata.isValid = validationResult.isValid;
      metadata.validationErrors = validationResult.errors;

      if (!metadata.isValid) {
        this.log(`Validation failed for ${filePath}: ${validationResult.errors.join(', ')}`, 'warn');
      }

      return metadata;
      
    } catch (error) {
      this.addValidationError(filePath, `Failed to extract metadata: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse BMad agent content (handles embedded YAML blocks)
   * @param {string} content - BMad agent content
   * @returns {Object} - Parsed front matter and content
   */
  parseBMadAgent(content) {
    // First try standard front matter parsing
    const standardParsed = this.parseYAMLFrontMatter(content);
    if (Object.keys(standardParsed.frontMatter).length > 0) {
      return standardParsed;
    }

    // If no standard front matter, look for embedded YAML block
    const yamlBlockRegex = /```yaml\s*\n([\s\S]*?)\n```/;
    const match = content.match(yamlBlockRegex);

    if (!match) {
      return {
        frontMatter: {},
        content: content
      };
    }

    try {
      const frontMatter = yaml.load(match[1]) || {};
      
      // Remove the YAML block from content
      const markdownContent = content.replace(yamlBlockRegex, '').trim();

      return {
        frontMatter,
        content: markdownContent
      };
    } catch (error) {
      this.log(`Error parsing embedded YAML: ${error.message}`, 'error');
      return {
        frontMatter: {},
        content: content
      };
    }
  }

  /**
   * Parse YAML front matter from content
   * @param {string} content - File content
   * @returns {Object} - Parsed front matter and content
   */
  parseYAMLFrontMatter(content) {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);

    if (!match) {
      return {
        frontMatter: {},
        content: content
      };
    }

    try {
      const frontMatter = yaml.load(match[1]) || {};
      const markdownContent = match[2];

      return {
        frontMatter,
        content: markdownContent
      };
    } catch (error) {
      this.log(`Error parsing YAML front matter: ${error.message}`, 'error');
      return {
        frontMatter: {},
        content: content
      };
    }
  }

  /**
   * Extract commands from agent configuration
   * @param {Array|Object} commands - Commands configuration
   * @returns {Array} - Normalized commands array
   */
  extractCommands(commands) {
    if (!commands) return [];
    
    if (Array.isArray(commands)) {
      return commands.map(cmd => {
        if (typeof cmd === 'string') {
          return { name: cmd, description: null };
        }
        if (typeof cmd === 'object') {
          const [name, description] = Object.entries(cmd)[0] || ['unknown', null];
          return { name, description };
        }
        return { name: 'unknown', description: null };
      });
    }
    
    if (typeof commands === 'object') {
      return Object.entries(commands).map(([name, description]) => ({
        name,
        description: typeof description === 'string' ? description : null
      }));
    }
    
    return [];
  }

  /**
   * Extract dependencies from agent configuration
   * @param {Object} dependencies - Dependencies configuration
   * @returns {Object} - Normalized dependencies object
   */
  extractDependencies(dependencies) {
    if (!dependencies || typeof dependencies !== 'object') {
      return {
        tasks: [],
        templates: [],
        checklists: [],
        data: [],
        utils: [],
        other: []
      };
    }

    const normalized = {
      tasks: [],
      templates: [],
      checklists: [],
      data: [],
      utils: [],
      other: []
    };

    // Handle different dependency structures
    for (const [key, value] of Object.entries(dependencies)) {
      if (Array.isArray(value)) {
        if (normalized.hasOwnProperty(key)) {
          normalized[key] = value;
        } else {
          normalized.other.push(...value.map(v => ({ type: key, name: v })));
        }
      } else if (typeof value === 'string') {
        if (normalized.hasOwnProperty(key)) {
          normalized[key] = [value];
        } else {
          normalized.other.push({ type: key, name: value });
        }
      }
    }

    return normalized;
  }

  /**
   * Validate agent format and structure
   * @param {Object} agentMetadata - Agent metadata to validate
   * @returns {Object} - Validation result with isValid and errors
   */
  validateAgentFormat(agentMetadata) {
    const errors = [];

    // Required fields validation
    if (!agentMetadata.id) {
      errors.push('Missing agent ID');
    }

    if (!agentMetadata.name) {
      errors.push('Missing agent name');
    }

    if (!agentMetadata.title) {
      errors.push('Missing agent title');
    }

    // Persona validation
    if (!agentMetadata.persona.role) {
      errors.push('Missing persona role');
    }

    // File validation
    if (!agentMetadata.filePath || !fs.existsSync(agentMetadata.filePath)) {
      errors.push('Agent file does not exist');
    }

    // Content validation
    if (!agentMetadata.rawContent || agentMetadata.rawContent.trim().length === 0) {
      errors.push('Agent file is empty');
    }

    // YAML structure validation
    if (!agentMetadata.parsedContent.frontMatter.agent) {
      errors.push('Missing agent configuration in YAML');
    }

    // Commands validation (if present)
    if (agentMetadata.commands.length > 0) {
      const invalidCommands = agentMetadata.commands.filter(cmd => !cmd.name);
      if (invalidCommands.length > 0) {
        errors.push(`${invalidCommands.length} commands missing names`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate all agent dependencies
   * @param {Array} agents - Array of agent metadata
   * @returns {Promise<void>}
   */
  async validateAllDependencies(agents) {
    this.log('Validating agent dependencies...');
    
    for (const agent of agents) {
      await this.validateAgentDependencies(agent);
    }
  }

  /**
   * Validate dependencies for a specific agent
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Promise<void>}
   */
  async validateAgentDependencies(agentMetadata) {
    const { dependencies, source, expansionPack } = agentMetadata;
    
    for (const [type, deps] of Object.entries(dependencies)) {
      if (type === 'other') continue;
      
      for (const dep of deps) {
        const possiblePaths = this.getDependencyPaths(source, expansionPack, type, dep);
        let found = false;
        let foundPath = null;
        
        // Check all possible paths
        for (const depPath of possiblePaths) {
          if (await fs.pathExists(depPath)) {
            found = true;
            foundPath = depPath;
            break;
          }
        }
        
        if (!found) {
          this.addValidationError(
            agentMetadata.filePath,
            `Missing dependency: ${type}/${dep} (checked: ${possiblePaths.join(', ')})`
          );
          agentMetadata.validationErrors.push(`Missing dependency: ${type}/${dep}`);
        } else {
          // Track dependency for mapping
          if (!this.dependencyMap.has(dep)) {
            this.dependencyMap.set(dep, []);
          }
          this.dependencyMap.get(dep).push(agentMetadata.id);
          
          // Store the resolved path for later use
          if (!agentMetadata.resolvedDependencies) {
            agentMetadata.resolvedDependencies = {};
          }
          if (!agentMetadata.resolvedDependencies[type]) {
            agentMetadata.resolvedDependencies[type] = {};
          }
          agentMetadata.resolvedDependencies[type][dep] = foundPath;
        }
      }
    }
  }

  /**
   * Get base path for dependencies based on source
   * @param {string} source - Agent source (bmad-core or expansion-pack)
   * @param {string} expansionPack - Expansion pack name (if applicable)
   * @returns {string} - Base path for dependencies
   */
  getBasePath(source, expansionPack) {
    if (source === 'bmad-core') {
      return path.join(this.options.rootPath, 'bmad-core');
    } else if (source === 'expansion-pack' && expansionPack) {
      return path.join(this.options.rootPath, 'expansion-packs', expansionPack);
    } else {
      return path.join(this.options.rootPath, 'common');
    }
  }

  /**
   * Get all possible paths for a dependency (checks common/ directory as fallback)
   * @param {string} source - Agent source
   * @param {string} expansionPack - Expansion pack name
   * @param {string} type - Dependency type (tasks, templates, etc.)
   * @param {string} dep - Dependency name
   * @returns {Array} - Array of possible paths to check
   */
  getDependencyPaths(source, expansionPack, type, dep) {
    const paths = [];
    
    // Primary path based on source
    const basePath = this.getBasePath(source, expansionPack);
    paths.push(path.join(basePath, type, dep));
    
    // Fallback to common directory if not in primary location
    if (source !== 'common') {
      const commonPath = path.join(this.options.rootPath, 'common', type, dep);
      paths.push(commonPath);
    }
    
    // For expansion packs, also check bmad-core as fallback
    if (source === 'expansion-pack') {
      const corePath = path.join(this.options.rootPath, 'bmad-core', type, dep);
      paths.push(corePath);
    }
    
    return paths;
  }

  /**
   * Generate agent name from file path
   * @param {string} filePath - Path to agent file
   * @returns {string} - Generated agent name
   */
  generateAgentName(filePath) {
    const fileName = path.basename(filePath, '.md');
    
    // Handle specific BMad agent file names
    const agentNameMap = {
      'pm': 'Product Manager',
      'architect': 'Architect', 
      'dev': 'Developer',
      'qa': 'QA Engineer',
      'sm': 'Scrum Master',
      'po': 'Product Owner',
      'analyst': 'Business Analyst',
      'ux-expert': 'UX Expert',
      'game-developer': 'Game Developer',
      'game-designer': 'Game Designer',
      'game-sm': 'Game Scrum Master'
    };
    
    return agentNameMap[fileName] || fileName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Add validation error
   * @param {string} filePath - File path where error occurred
   * @param {string} error - Error message
   */
  addValidationError(filePath, error) {
    this.validationErrors.push({
      filePath,
      error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get all discovered agents
   * @returns {Map} - Map of agent ID to metadata
   */
  getDiscoveredAgents() {
    return this.discoveredAgents;
  }

  /**
   * Get agent by ID
   * @param {string} agentId - Agent ID
   * @returns {Object|null} - Agent metadata or null
   */
  getAgent(agentId) {
    return this.discoveredAgents.get(agentId) || null;
  }

  /**
   * Get agents by source
   * @param {string} source - Source type (bmad-core, expansion-pack)
   * @returns {Array} - Array of agent metadata
   */
  getAgentsBySource(source) {
    return Array.from(this.discoveredAgents.values())
      .filter(agent => agent.source === source);
  }

  /**
   * Get agents by expansion pack
   * @param {string} expansionPack - Expansion pack name
   * @returns {Array} - Array of agent metadata
   */
  getAgentsByExpansionPack(expansionPack) {
    return Array.from(this.discoveredAgents.values())
      .filter(agent => agent.expansionPack === expansionPack);
  }

  /**
   * Get validation errors
   * @returns {Array} - Array of validation errors
   */
  getValidationErrors() {
    return this.validationErrors;
  }

  /**
   * Get dependency map
   * @returns {Map} - Map of dependency to agents that use it
   */
  getDependencyMap() {
    return this.dependencyMap;
  }

  /**
   * Get discovery statistics
   * @returns {Object} - Discovery statistics
   */
  getStatistics() {
    const agents = Array.from(this.discoveredAgents.values());
    
    return {
      total: agents.length,
      core: agents.filter(a => a.source === 'bmad-core').length,
      expansionPack: agents.filter(a => a.source === 'expansion-pack').length,
      valid: agents.filter(a => a.isValid).length,
      invalid: agents.filter(a => !a.isValid).length,
      validationErrors: this.validationErrors.length,
      expansionPacks: [...new Set(agents.map(a => a.expansionPack).filter(Boolean))],
      dependencies: this.dependencyMap.size
    };
  }

  /**
   * Log message with optional level
   * @param {string} message - Message to log
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    if (!this.options.verbose && level === 'info') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [AgentDiscovery] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
}

module.exports = AgentDiscovery;