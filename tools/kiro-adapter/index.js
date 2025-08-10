/**
 * Kiro Integration Adapter
 * Main entry point for BMad Method Kiro IDE integration
 */

const KiroDetector = require('./kiro-detector');
const AgentTransformer = require('./agent-transformer');
const SpecGenerator = require('./spec-generator');
const ContextInjector = require('./context-injector');
const HookGenerator = require('./hook-generator');
const MCPIntegrator = require('./mcp-integrator');

class KiroAdapter {
  constructor(options = {}) {
    this.options = options;
    this.detector = new KiroDetector();
    this.agentTransformer = new AgentTransformer();
    this.specGenerator = new SpecGenerator();
    this.contextInjector = new ContextInjector();
    this.hookGenerator = new HookGenerator();
    this.mcpIntegrator = new MCPIntegrator();
  }

  /**
   * Initialize Kiro integration for BMad Method
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(projectPath) {
    try {
      // Detect Kiro workspace
      const isKiroWorkspace = await this.detector.detectKiroWorkspace(projectPath);
      
      if (!isKiroWorkspace) {
        throw new Error('Kiro workspace not detected. Please ensure you are in a Kiro project directory.');
      }

      console.log('✓ Kiro workspace detected');
      return true;
    } catch (error) {
      console.error('Failed to initialize Kiro integration:', error.message);
      return false;
    }
  }

  /**
   * Get Kiro workspace information
   * @param {string} projectPath - Path to the project directory
   * @returns {Promise<Object>} - Workspace information
   */
  async getWorkspaceInfo(projectPath) {
    return await this.detector.getWorkspaceInfo(projectPath);
  }
}

module.exports = KiroAdapter;