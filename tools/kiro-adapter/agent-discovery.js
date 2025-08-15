/**
 * Agent Discovery System
 * Enhanced agent discovery and scanning for BMad agents (core and expansion packs)
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');
const ConversionErrorHandler = require('./conversion-error-handler');
const ConversionMonitor = require('./conversion-monitor');

class AgentDiscovery {
  constructor(options = {}) {
    this.options = {
      rootPath: options.rootPath || process.cwd(),
      verbose: options.verbose || false,
      validateDependencies: options.validateDependencies !== false,
      enableErrorHandling: options.enableErrorHandling !== false,
      ...options
    };
    
    this.discoveredAgents = new Map();
    this.validationErrors = [];
    this.dependencyMap = new Map();
    
    // Initialize error handler for discovery issues
    if (this.options.enableErrorHandling) {
      this.errorHandler = new ConversionErrorHandler({
        logLevel: options.logLevel || 'warn',
        enableDiagnostics: options.enableDiagnostics !== false,
        enableRecovery: options.enableRecovery !== false,
        logFilePath: path.join(this.options.rootPath, '.kiro', 'logs', 'discovery-errors.log')
      });
    }

    // Initialize conversion monitor for discovery tracking
    if (this.options.enableMonitoring !== false) {
      this.monitor = new ConversionMonitor({
        logLevel: options.logLevel || 'info',
        enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
        enableDetailedLogging: options.enableDetailedLogging !== false,
        logDirectory: path.join(this.options.rootPath, '.kiro', 'logs'),
        reportDirectory: path.join(this.options.rootPath, '.kiro', 'reports')
      });
    }
  }

  /**
   * Scan all BMad agents (core and expansion packs)
   * @returns {Promise<Array>} Array of discovered agent metadata
   */
  async scanAllAgents() {
    this.log('Starting comprehensive agent discovery...');
    
    // Start monitoring session if monitor is available
    let sessionId = null;
    if (this.monitor) {
      sessionId = `discovery-${Date.now()}`;
      this.monitor.startConversionSession(sessionId, {
        type: 'agent_discovery',
        source: 'bmad-method',
        operation: 'scan_all_agents'
      });
    }
    
    try {
      // Clear previous results
      this.discoveredAgents.clear();
      this.validationErrors = [];
      this.dependencyMap.clear();

      // Monitor discovery steps
      if (this.monitor) {
        this.monitor.logConversionStep(sessionId, 'initialize_discovery', {
          operation: 'clear_previous_results'
        });
        this.monitor.completeConversionStep(sessionId, 'initialize_discovery', { success: true });
      }

      // Scan core agents
      if (this.monitor) {
        this.monitor.logConversionStep(sessionId, 'scan_core_agents');
      }
      const coreAgents = await this.scanCoreAgents();
      this.log(`Found ${coreAgents.length} core agents`);
      if (this.monitor) {
        this.monitor.completeConversionStep(sessionId, 'scan_core_agents', { 
          success: true, 
          agentCount: coreAgents.length 
        });
      }

      // Scan expansion pack agents
      if (this.monitor) {
        this.monitor.logConversionStep(sessionId, 'scan_expansion_agents');
      }
      const expansionAgents = await this.scanExpansionPackAgents();
      this.log(`Found ${expansionAgents.length} expansion pack agents`);
      if (this.monitor) {
        this.monitor.completeConversionStep(sessionId, 'scan_expansion_agents', { 
          success: true, 
          agentCount: expansionAgents.length 
        });
      }

      // Combine and validate all agents
      const allAgents = [...coreAgents, ...expansionAgents];
      
      if (this.options.validateDependencies) {
        if (this.monitor) {
          this.monitor.logConversionStep(sessionId, 'validate_dependencies');
        }
        await this.validateAllDependencies(allAgents);
        if (this.monitor) {
          this.monitor.completeConversionStep(sessionId, 'validate_dependencies', { 
            success: true, 
            validationErrors: this.validationErrors.length 
          });
        }
      }

      this.log(`Total agents discovered: ${allAgents.length}`);
      
      // Complete monitoring session
      if (this.monitor) {
        this.monitor.completeConversionSession(sessionId, {
          success: true,
          totalAgents: allAgents.length,
          coreAgents: coreAgents.length,
          expansionAgents: expansionAgents.length,
          validationErrors: this.validationErrors.length
        });
      }
      
      return allAgents;
      
    } catch (error) {
      this.log(`Error during agent discovery: ${error.message}`, 'error');
      
      // Complete monitoring session with error
      if (this.monitor && sessionId) {
        this.monitor.completeConversionSession(sessionId, {
          success: false,
          error: error.message
        });
      }
      
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

      return this.buildAgentMetadata(parsedAgent, filePath, additionalMetadata, {
        filePath,
        operation: 'metadata-extraction',
        phase: 'build-agent-metadata'
      });
      
    } catch (error) {
      const context = {
        filePath,
        operation: 'metadata-extraction',
        phase: 'extract-agent-metadata',
        source: additionalMetadata.source,
        expansionPack: additionalMetadata.expansionPack
      };

      if (this.errorHandler) {
        // Handle the error with our error handler
        this.errorHandler.handleConversionError(error, context).then(errorResult => {
          if (errorResult.recovered && errorResult.recoveryDetails?.success) {
            this.log(`Recovery successful for ${filePath}, retrying metadata extraction`, 'info');
            // Note: In a real implementation, we might want to retry here
          }
        }).catch(handlerError => {
          this.log(`Error handler failed for ${filePath}: ${handlerError.message}`, 'error');
        });
      }

      this.addValidationError(filePath, `Failed to extract metadata: ${error.message}`);
      return null;
    }
  }

  /**
   * Build agent metadata from parsed content
   * @param {Object} parsedAgent - Parsed agent content
   * @param {string} filePath - Agent file path
   * @param {Object} additionalMetadata - Additional metadata
   * @param {Object} context - Processing context
   * @returns {Object} - Agent metadata
   */
  buildAgentMetadata(parsedAgent, filePath, additionalMetadata, context) {
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
      rawContent: parsedAgent.content || '',
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
  }

  /**
   * Parse BMad agent content (handles embedded YAML blocks)
   * @param {string} content - BMad agent content
   * @param {Object} context - Parsing context for error handling
   * @returns {Object} - Parsed front matter and content
   */
  parseBMadAgent(content, context = {}) {
    try {
      // First try standard front matter parsing
      const standardParsed = this.parseYAMLFrontMatter(content);
      if (Object.keys(standardParsed.frontMatter).length > 0) {
        return standardParsed;
      }

      // If no standard front matter, look for embedded YAML block
      const yamlBlockRegex = /```yaml\s*\n([\s\S]*?)\n```/;
      const match = content.match(yamlBlockRegex);

      if (!match) {
        // No YAML found - this might be valid for some agents
        this.log(`No YAML configuration found in agent content`, 'warn');
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
      } catch (yamlError) {
        // Handle YAML parsing error with error handler
        if (this.errorHandler) {
          const errorContext = {
            ...context,
            operation: 'yaml-parsing',
            phase: 'parse-embedded-yaml',
            yamlContent: match[1]
          };
          
          this.errorHandler.handleConversionError(yamlError, errorContext).catch(handlerError => {
            this.log(`Error handler failed during YAML parsing: ${handlerError.message}`, 'error');
          });
        }
        
        this.log(`Error parsing embedded YAML: ${yamlError.message}`, 'error');
        
        // Return content without YAML parsing
        return {
          frontMatter: {},
          content: content,
          yamlError: yamlError.message
        };
      }
    } catch (error) {
      // Handle general parsing error
      if (this.errorHandler) {
        const errorContext = {
          ...context,
          operation: 'content-parsing',
          phase: 'parse-bmad-agent'
        };
        
        this.errorHandler.handleConversionError(error, errorContext).catch(handlerError => {
          this.log(`Error handler failed during content parsing: ${handlerError.message}`, 'error');
        });
      }
      
      this.log(`Error parsing BMad agent content: ${error.message}`, 'error');
      
      // Return minimal structure to allow processing to continue
      return {
        frontMatter: {},
        content: content || '',
        parseError: error.message
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
   * Retry discovery for failed agents
   * @param {Array} failedAgentPaths - Paths of agents that failed discovery
   * @returns {Promise<Object>} - Retry results
   */
  async retryFailedDiscovery(failedAgentPaths = null) {
    const pathsToRetry = failedAgentPaths || this.getFailedAgentPaths();
    
    if (pathsToRetry.length === 0) {
      this.log('No failed agent discoveries to retry', 'info');
      return { success: true, retried: [], stillFailed: [] };
    }

    this.log(`Retrying discovery for ${pathsToRetry.length} failed agents`, 'info');
    
    const results = {
      retried: [],
      stillFailed: [],
      errors: []
    };

    for (const agentPath of pathsToRetry) {
      try {
        this.log(`Retrying discovery for: ${agentPath}`, 'info');
        
        // Determine metadata based on path
        const metadata = this.getMetadataFromPath(agentPath);
        const agentMetadata = await this.extractAgentMetadata(agentPath, metadata);
        
        if (agentMetadata && agentMetadata.isValid) {
          this.discoveredAgents.set(agentMetadata.id, agentMetadata);
          results.retried.push(agentPath);
          this.log(`Successfully retried discovery for: ${agentPath}`, 'info');
        } else {
          results.stillFailed.push(agentPath);
          this.log(`Retry still failed for: ${agentPath}`, 'warn');
        }
      } catch (error) {
        results.stillFailed.push(agentPath);
        results.errors.push({ path: agentPath, error: error.message });
        this.log(`Retry error for ${agentPath}: ${error.message}`, 'error');
      }
    }

    this.log(`Discovery retry complete. Success: ${results.retried.length}, Failed: ${results.stillFailed.length}`, 'info');
    
    return {
      success: results.stillFailed.length === 0,
      ...results
    };
  }

  /**
   * Get paths of agents that failed discovery
   * @returns {Array} - Array of failed agent paths
   */
  getFailedAgentPaths() {
    return this.validationErrors
      .map(error => error.filePath)
      .filter((path, index, self) => self.indexOf(path) === index); // Remove duplicates
  }

  /**
   * Get metadata from agent file path
   * @param {string} agentPath - Agent file path
   * @returns {Object} - Metadata based on path
   */
  getMetadataFromPath(agentPath) {
    const relativePath = path.relative(this.options.rootPath, agentPath);
    
    // Determine if it's core or expansion pack
    if (relativePath.startsWith('bmad-core')) {
      return {
        source: 'bmad-core',
        type: 'core'
      };
    } else if (relativePath.startsWith('expansion-packs')) {
      const pathParts = relativePath.split(path.sep);
      const expansionPack = pathParts[1]; // expansion-packs/[pack-name]/agents/...
      
      return {
        source: 'expansion-pack',
        type: 'expansion',
        expansionPack
      };
    } else {
      return {
        source: 'unknown',
        type: 'unknown'
      };
    }
  }

  /**
   * Generate discovery diagnostic report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} - Diagnostic report
   */
  async generateDiscoveryDiagnosticReport(options = {}) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.getStatistics(),
      discoveredAgents: options.includeAgentDetails ? 
        Array.from(this.discoveredAgents.values()) : 
        Array.from(this.discoveredAgents.keys()),
      validationErrors: this.validationErrors,
      dependencyMap: options.includeDependencyMap ? 
        Object.fromEntries(this.dependencyMap) : 
        { totalDependencies: this.dependencyMap.size },
      systemInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        workingDirectory: process.cwd(),
        rootPath: this.options.rootPath
      }
    };

    // Add error handler statistics if available
    if (this.errorHandler) {
      report.errorHandling = this.errorHandler.getErrorStats();
      
      if (options.includeDetailedErrors) {
        report.detailedErrors = this.errorHandler.getConversionErrors();
      }
    }

    // Export report if path provided
    if (options.exportPath) {
      try {
        await fs.ensureDir(path.dirname(options.exportPath));
        await fs.writeFile(options.exportPath, JSON.stringify(report, null, 2));
        report.exported = true;
        report.exportPath = options.exportPath;
        this.log(`Discovery diagnostic report exported to: ${options.exportPath}`, 'info');
      } catch (error) {
        report.exported = false;
        report.exportError = error.message;
        this.log(`Failed to export discovery report: ${error.message}`, 'error');
      }
    }

    return report;
  }

  /**
   * Enable diagnostic mode for detailed troubleshooting
   */
  enableDiagnosticMode() {
    if (this.errorHandler) {
      this.errorHandler.enableDiagnosticMode();
    }
    this.options.verbose = true;
    this.log('Diagnostic mode enabled for agent discovery', 'info');
  }

  /**
   * Disable diagnostic mode
   */
  disableDiagnosticMode() {
    if (this.errorHandler) {
      this.errorHandler.disableDiagnosticMode();
    }
    this.log('Diagnostic mode disabled for agent discovery', 'info');
  }

  /**
   * Clear discovery history and error data
   */
  clearDiscoveryHistory() {
    this.discoveredAgents.clear();
    this.validationErrors = [];
    this.dependencyMap.clear();
    
    if (this.errorHandler) {
      this.errorHandler.clearErrors();
    }
    
    this.log('Discovery history cleared', 'info');
  }

  /**
   * Get discovery error statistics
   * @returns {Object} - Error statistics
   */
  getDiscoveryErrorStats() {
    const stats = {
      totalValidationErrors: this.validationErrors.length,
      errorsByType: {},
      errorsByAgent: {},
      errorsBySource: {}
    };

    // Categorize validation errors
    for (const error of this.validationErrors) {
      // By error type
      const errorType = this.categorizeValidationError(error.error);
      stats.errorsByType[errorType] = (stats.errorsByType[errorType] || 0) + 1;

      // By agent (from file path)
      const agentId = path.basename(error.filePath, '.md');
      stats.errorsByAgent[agentId] = (stats.errorsByAgent[agentId] || 0) + 1;

      // By source
      const metadata = this.getMetadataFromPath(error.filePath);
      const source = metadata.expansionPack || metadata.source;
      stats.errorsBySource[source] = (stats.errorsBySource[source] || 0) + 1;
    }

    // Add error handler stats if available
    if (this.errorHandler) {
      stats.errorHandlerStats = this.errorHandler.getErrorStats();
    }

    return stats;
  }

  /**
   * Categorize validation error for statistics
   * @param {string} errorMessage - Error message
   * @returns {string} - Error category
   */
  categorizeValidationError(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('yaml') || message.includes('parsing')) {
      return 'yaml-parsing';
    } else if (message.includes('file') || message.includes('not found')) {
      return 'file-access';
    } else if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    } else if (message.includes('dependency') || message.includes('missing')) {
      return 'dependency';
    } else {
      return 'unknown';
    }
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