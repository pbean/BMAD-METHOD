/**
 * Kiro Agent Registry
 * Handles registration and management of BMad agents with Kiro's native agent system
 */

const fs = require('fs-extra');
const path = require('path');
const EventEmitter = require('events');

class KiroAgentRegistry extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      rootPath: process.cwd(),
      kiroAgentsPath: '.kiro/agents',
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    };
    
    this.registeredAgents = new Map();
    this.registrationErrors = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the registry and discover agents
   * @returns {Promise<boolean>} - Success status
   */
  async initialize() {
    try {
      console.log('Initializing Kiro Agent Registry...');
      
      // Ensure .kiro/agents directory exists
      const agentsPath = path.join(this.options.rootPath, this.options.kiroAgentsPath);
      await fs.ensureDir(agentsPath);
      
      // Discover and register all agents
      await this.discoverAndRegisterAgents();
      
      this.isInitialized = true;
      this.emit('initialized');
      console.log(`✓ Registry initialized with ${this.registeredAgents.size} agents`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Kiro Agent Registry:', error.message);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Discover and register all agents in the .kiro/agents directory
   * @returns {Promise<void>}
   */
  async discoverAndRegisterAgents() {
    const agentsPath = path.join(this.options.rootPath, this.options.kiroAgentsPath);
    
    if (!await fs.pathExists(agentsPath)) {
      console.warn('No .kiro/agents directory found');
      return;
    }

    const agentFiles = await this.findAgentFiles(agentsPath);
    console.log(`Found ${agentFiles.length} agent files to register`);

    for (const agentFile of agentFiles) {
      await this.registerAgentFromFile(agentFile);
    }
  }

  /**
   * Find all agent files in the agents directory
   * @param {string} agentsPath - Path to agents directory
   * @returns {Promise<Array<string>>} - Array of agent file paths
   */
  async findAgentFiles(agentsPath) {
    const files = [];
    
    const scanDirectory = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    };
    
    await scanDirectory(agentsPath);
    return files;
  }

  /**
   * Register an agent from a file
   * @param {string} agentFilePath - Path to agent file
   * @returns {Promise<boolean>} - Success status
   */
  async registerAgentFromFile(agentFilePath) {
    try {
      const agentMetadata = await this.parseAgentFile(agentFilePath);
      return await this.registerAgent(agentMetadata);
    } catch (error) {
      console.error(`Failed to register agent from ${agentFilePath}:`, error.message);
      this.registrationErrors.set(agentFilePath, error);
      return false;
    }
  }

  /**
   * Parse agent metadata from file
   * @param {string} agentFilePath - Path to agent file
   * @returns {Promise<Object>} - Agent metadata
   */
  async parseAgentFile(agentFilePath) {
    const content = await fs.readFile(agentFilePath, 'utf8');
    const relativePath = path.relative(this.options.rootPath, agentFilePath);
    
    // Extract agent ID from filename or content
    const filename = path.basename(agentFilePath, '.md');
    const agentId = this.extractAgentId(content, filename);
    
    // Extract agent name and description
    const name = this.extractAgentName(content, agentId);
    const description = this.extractAgentDescription(content);
    
    // Determine source type and expansion pack
    const sourceInfo = this.determineSourceInfo(agentFilePath);
    
    return {
      id: agentId,
      name: name,
      description: description,
      source: sourceInfo.source,
      expansionPack: sourceInfo.expansionPack,
      filePath: agentFilePath,
      relativePath: relativePath,
      content: content,
      lastModified: (await fs.stat(agentFilePath)).mtime
    };
  }

  /**
   * Get count of registered agents
   * @returns {number} - Number of registered agents
   */
  getRegisteredAgentCount() {
    return this.registeredAgents.size;
  }

  /**
   * Get all registered agents
   * @returns {Map} - Map of registered agents
   */
  getRegisteredAgents() {
    return this.registeredAgents;
  }

  /**
   * Get registration errors
   * @returns {Map} - Map of registration errors
   */
  getRegistrationErrors() {
    return this.registrationErrors;
  }

  /**
   * Extract agent ID from content or filename
   * @param {string} content - Agent file content
   * @param {string} filename - Agent filename
   * @returns {string} - Agent ID
   */
  extractAgentId(content, filename) {
    // Try to extract from YAML frontmatter
    const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (yamlMatch) {
      const idMatch = yamlMatch[1].match(/^id:\s*(.+)$/m);
      if (idMatch) {
        return idMatch[1].trim();
      }
    }
    
    // Try to extract from # Agent: format
    const agentMatch = content.match(/^#\s*Agent:\s*(.+)$/m);
    if (agentMatch) {
      return this.normalizeAgentId(agentMatch[1].trim());
    }
    
    // Fall back to filename
    return this.normalizeAgentId(filename);
  }

  /**
   * Extract agent name from content
   * @param {string} content - Agent file content
   * @param {string} fallbackId - Fallback agent ID
   * @returns {string} - Agent name
   */
  extractAgentName(content, fallbackId) {
    // Try to extract from YAML frontmatter
    const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (yamlMatch) {
      const nameMatch = yamlMatch[1].match(/^name:\s*(.+)$/m);
      if (nameMatch) {
        return nameMatch[1].trim();
      }
    }
    
    // Try to extract from first heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].replace(/^Agent:\s*/, '').trim();
    }
    
    // Fall back to formatted ID
    return this.formatAgentName(fallbackId);
  }

  /**
   * Extract agent description from content
   * @param {string} content - Agent file content
   * @returns {string} - Agent description
   */
  extractAgentDescription(content) {
    // Try to extract from YAML frontmatter
    const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (yamlMatch) {
      const descMatch = yamlMatch[1].match(/^description:\s*(.+)$/m);
      if (descMatch) {
        return descMatch[1].trim();
      }
    }
    
    // Try to extract first paragraph after heading
    const lines = content.split('\n');
    let foundHeading = false;
    
    for (const line of lines) {
      if (line.startsWith('#')) {
        foundHeading = true;
        continue;
      }
      
      if (foundHeading && line.trim() && !line.startsWith('#')) {
        return line.trim();
      }
    }
    
    return 'BMad Method Agent';
  }

  /**
   * Determine source information from file path
   * @param {string} agentFilePath - Path to agent file
   * @returns {Object} - Source information
   */
  determineSourceInfo(agentFilePath) {
    const relativePath = path.relative(this.options.rootPath, agentFilePath);
    
    if (relativePath.includes('expansion-packs/')) {
      const parts = relativePath.split('/');
      const expansionIndex = parts.indexOf('expansion-packs');
      if (expansionIndex >= 0 && parts.length > expansionIndex + 1) {
        return {
          source: 'expansion-pack',
          expansionPack: parts[expansionIndex + 1]
        };
      }
    }
    
    return {
      source: 'bmad-core',
      expansionPack: null
    };
  }

  /**
   * Register an agent with Kiro's native system
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Promise<boolean>} - Success status
   */
  async registerAgent(agentMetadata) {
    const { id, name, description } = agentMetadata;
    
    try {
      console.log(`Registering agent: ${id} (${name})`);
      
      // Create activation handler for this agent
      const activationHandler = this.createActivationHandler(agentMetadata);
      
      // Register with Kiro's agent system (simulated for now)
      const registrationData = {
        id: id,
        name: name,
        description: description,
        activationHandler: activationHandler,
        metadata: agentMetadata
      };
      
      // Store in our registry
      this.registeredAgents.set(id, registrationData);
      
      // Emit registration event
      this.emit('agentRegistered', agentMetadata);
      
      console.log(`✓ Agent registered: ${id}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to register agent ${id}:`, error.message);
      
      // Retry registration with exponential backoff
      return await this.retryRegistration(agentMetadata);
    }
  }

  /**
   * Create activation handler for an agent
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Function} - Activation handler function
   */
  createActivationHandler(agentMetadata) {
    return async (context = {}) => {
      try {
        console.log(`Activating agent: ${agentMetadata.id}`);
        
        // Load agent dependencies
        await this.loadAgentDependencies(agentMetadata);
        
        // Apply steering rules
        await this.applySteeringRules(agentMetadata);
        
        // Create agent instance
        const instance = await this.createAgentInstance(agentMetadata, context);
        
        this.emit('agentActivated', agentMetadata, instance);
        return instance;
        
      } catch (error) {
        console.error(`Failed to activate agent ${agentMetadata.id}:`, error.message);
        this.emit('agentActivationFailed', agentMetadata, error);
        throw error;
      }
    };
  }

  /**
   * Load dependencies for an agent
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Promise<void>}
   */
  async loadAgentDependencies(agentMetadata) {
    // This would load tasks, templates, checklists, etc.
    // For now, we'll just log the action
    console.log(`Loading dependencies for agent: ${agentMetadata.id}`);
  }

  /**
   * Apply steering rules for an agent
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Promise<void>}
   */
  async applySteeringRules(agentMetadata) {
    // This would apply Kiro steering rules
    // For now, we'll just log the action
    console.log(`Applying steering rules for agent: ${agentMetadata.id}`);
  }

  /**
   * Create agent instance
   * @param {Object} agentMetadata - Agent metadata
   * @param {Object} context - Activation context
   * @returns {Promise<Object>} - Agent instance
   */
  async createAgentInstance(agentMetadata, context) {
    return {
      id: agentMetadata.id,
      name: agentMetadata.name,
      description: agentMetadata.description,
      metadata: agentMetadata,
      context: context,
      activatedAt: new Date()
    };
  }

  /**
   * Retry agent registration with exponential backoff
   * @param {Object} agentMetadata - Agent metadata
   * @returns {Promise<boolean>} - Success status
   */
  async retryRegistration(agentMetadata) {
    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        console.log(`Retry attempt ${attempt}/${this.options.retryAttempts} for agent: ${agentMetadata.id}`);
        
        // Wait with exponential backoff
        await this.sleep(this.options.retryDelay * Math.pow(2, attempt - 1));
        
        // Try registration again
        const success = await this.registerAgent(agentMetadata);
        if (success) {
          return true;
        }
        
      } catch (error) {
        console.error(`Retry ${attempt} failed for agent ${agentMetadata.id}:`, error.message);
      }
    }
    
    console.error(`All retry attempts failed for agent: ${agentMetadata.id}`);
    this.registrationErrors.set(agentMetadata.id, new Error('Registration failed after all retries'));
    return false;
  }

  /**
   * Get registered agent by ID
   * @param {string} agentId - Agent ID
   * @returns {Object|null} - Registered agent or null
   */
  getRegisteredAgent(agentId) {
    return this.registeredAgents.get(agentId) || null;
  }

  /**
   * Get all registered agents
   * @returns {Map} - Map of registered agents
   */
  getAllRegisteredAgents() {
    return new Map(this.registeredAgents);
  }

  /**
   * Get registration errors
   * @returns {Map} - Map of registration errors
   */
  getRegistrationErrors() {
    return new Map(this.registrationErrors);
  }

  /**
   * Get registry statistics
   * @returns {Object} - Registry statistics
   */
  getStatistics() {
    return {
      totalRegistered: this.registeredAgents.size,
      totalErrors: this.registrationErrors.size,
      isInitialized: this.isInitialized,
      registeredAgentIds: Array.from(this.registeredAgents.keys()),
      errorAgentIds: Array.from(this.registrationErrors.keys())
    };
  }

  /**
   * Normalize agent ID
   * @param {string} id - Raw agent ID
   * @returns {string} - Normalized agent ID
   */
  normalizeAgentId(id) {
    return id.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Format agent name from ID
   * @param {string} id - Agent ID
   * @returns {string} - Formatted agent name
   */
  formatAgentName(id) {
    return id.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = KiroAgentRegistry;