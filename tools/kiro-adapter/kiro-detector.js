/**
 * Kiro Workspace Detection
 * Identifies and validates Kiro workspace environments
 */

const fs = require('fs-extra');
const path = require('path');

class KiroDetector {
  constructor() {
    this.kiroDirectories = ['.kiro'];
    this.kiroFiles = ['.kiro/settings', '.kiro/agents', '.kiro/specs', '.kiro/steering'];
    this.requiredFeatures = ['specs', 'steering', 'hooks'];
  }

  /**
   * Detect if current directory is a Kiro workspace
   * @param {string} projectPath - Path to check
   * @returns {Promise<boolean>} - True if Kiro workspace detected
   */
  async detectKiroWorkspace(projectPath = process.cwd()) {
    try {
      // Check for .kiro directory
      const kiroPath = path.join(projectPath, '.kiro');
      const kiroExists = await fs.pathExists(kiroPath);
      
      if (!kiroExists) {
        return false;
      }

      // Validate Kiro directory structure
      const hasValidStructure = await this.validateKiroStructure(projectPath);
      
      return hasValidStructure;
    } catch (error) {
      console.error('Error detecting Kiro workspace:', error.message);
      return false;
    }
  }

  /**
   * Validate Kiro directory structure
   * @param {string} projectPath - Path to validate
   * @returns {Promise<boolean>} - True if structure is valid
   */
  async validateKiroStructure(projectPath) {
    try {
      const kiroPath = path.join(projectPath, '.kiro');
      
      // Check for essential directories
      const essentialDirs = ['specs', 'steering'];
      for (const dir of essentialDirs) {
        const dirPath = path.join(kiroPath, dir);
        const exists = await fs.pathExists(dirPath);
        if (!exists) {
          console.warn(`Missing Kiro directory: .kiro/${dir}`);
          // Create missing directories
          await fs.ensureDir(dirPath);
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating Kiro structure:', error.message);
      return false;
    }
  }

  /**
   * Get detailed workspace information
   * @param {string} projectPath - Path to analyze
   * @returns {Promise<Object>} - Workspace details
   */
  async getWorkspaceInfo(projectPath = process.cwd()) {
    const info = {
      isKiroWorkspace: false,
      kiroPath: null,
      availableFeatures: [],
      existingSpecs: [],
      steeringRules: [],
      hooks: [],
      mcpConfig: null
    };

    try {
      const kiroPath = path.join(projectPath, '.kiro');
      info.kiroPath = kiroPath;
      info.isKiroWorkspace = await this.detectKiroWorkspace(projectPath);

      if (!info.isKiroWorkspace) {
        return info;
      }

      // Analyze available features
      info.availableFeatures = await this.analyzeAvailableFeatures(kiroPath);
      
      // Get existing specs
      info.existingSpecs = await this.getExistingSpecs(kiroPath);
      
      // Get steering rules
      info.steeringRules = await this.getSteeringRules(kiroPath);
      
      // Get hooks
      info.hooks = await this.getHooks(kiroPath);
      
      // Get MCP configuration
      info.mcpConfig = await this.getMCPConfig(kiroPath);

      return info;
    } catch (error) {
      console.error('Error getting workspace info:', error.message);
      return info;
    }
  }

  /**
   * Analyze available Kiro features
   * @param {string} kiroPath - Path to .kiro directory
   * @returns {Promise<Array>} - List of available features
   */
  async analyzeAvailableFeatures(kiroPath) {
    const features = [];
    
    const featureChecks = [
      { name: 'specs', path: 'specs' },
      { name: 'steering', path: 'steering' },
      { name: 'hooks', path: 'hooks' },
      { name: 'agents', path: 'agents' },
      { name: 'settings', path: 'settings' }
    ];

    for (const feature of featureChecks) {
      const featurePath = path.join(kiroPath, feature.path);
      const exists = await fs.pathExists(featurePath);
      if (exists) {
        features.push(feature.name);
      }
    }

    return features;
  }

  /**
   * Get existing specs in workspace
   * @param {string} kiroPath - Path to .kiro directory
   * @returns {Promise<Array>} - List of spec names
   */
  async getExistingSpecs(kiroPath) {
    try {
      const specsPath = path.join(kiroPath, 'specs');
      const exists = await fs.pathExists(specsPath);
      
      if (!exists) {
        return [];
      }

      const entries = await fs.readdir(specsPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      console.error('Error reading specs:', error.message);
      return [];
    }
  }

  /**
   * Get steering rules in workspace
   * @param {string} kiroPath - Path to .kiro directory
   * @returns {Promise<Array>} - List of steering rule files
   */
  async getSteeringRules(kiroPath) {
    try {
      const steeringPath = path.join(kiroPath, 'steering');
      const exists = await fs.pathExists(steeringPath);
      
      if (!exists) {
        return [];
      }

      const files = await fs.readdir(steeringPath);
      return files.filter(file => file.endsWith('.md'));
    } catch (error) {
      console.error('Error reading steering rules:', error.message);
      return [];
    }
  }

  /**
   * Get hooks in workspace
   * @param {string} kiroPath - Path to .kiro directory
   * @returns {Promise<Array>} - List of hook files
   */
  async getHooks(kiroPath) {
    try {
      const hooksPath = path.join(kiroPath, 'hooks');
      const exists = await fs.pathExists(hooksPath);
      
      if (!exists) {
        return [];
      }

      const files = await fs.readdir(hooksPath);
      return files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
    } catch (error) {
      console.error('Error reading hooks:', error.message);
      return [];
    }
  }

  /**
   * Get MCP configuration
   * @param {string} kiroPath - Path to .kiro directory
   * @returns {Promise<Object|null>} - MCP configuration or null
   */
  async getMCPConfig(kiroPath) {
    try {
      const mcpConfigPath = path.join(kiroPath, 'settings', 'mcp.json');
      const exists = await fs.pathExists(mcpConfigPath);
      
      if (!exists) {
        return null;
      }

      const configContent = await fs.readFile(mcpConfigPath, 'utf8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error('Error reading MCP config:', error.message);
      return null;
    }
  }

  /**
   * Provide setup guidance for Kiro workspace initialization
   * @returns {string} - Setup instructions
   */
  getSetupGuidance() {
    return `
To set up a Kiro workspace for BMad Method integration:

1. Initialize Kiro workspace:
   - Ensure you have Kiro IDE installed
   - Open your project in Kiro IDE
   - Kiro will automatically create the .kiro directory structure

2. Required directories will be created automatically:
   - .kiro/specs/ (for spec-driven development)
   - .kiro/steering/ (for project conventions)
   - .kiro/hooks/ (for workflow automation)
   - .kiro/agents/ (for custom agents)

3. Optional setup:
   - Configure MCP tools in .kiro/settings/mcp.json
   - Add project-specific steering rules
   - Set up custom hooks for automation

4. Run BMad installation:
   npx bmad-method install --ide=kiro

For more information, visit: https://kiro.ai/docs
`;
  }
}

module.exports = KiroDetector;