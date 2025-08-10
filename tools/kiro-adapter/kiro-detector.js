const path = require('path');
const fs = require('fs-extra');

class KiroDetector {
  /**
   * Detects if the current directory is a Kiro workspace
   * @param {string} directory - Directory to check
   * @returns {Promise<{isKiroWorkspace: boolean, kiroVersion?: string, hasSpecs: boolean, hasSteering: boolean, hasHooks: boolean}>}
   */
  async detectKiroWorkspace(directory) {
    const kiroDir = path.join(directory, '.kiro');
    
    if (!await fs.pathExists(kiroDir)) {
      return {
        isKiroWorkspace: false,
        hasSpecs: false,
        hasSteering: false,
        hasHooks: false
      };
    }

    // Check for Kiro-specific directories
    const specsDir = path.join(kiroDir, 'specs');
    const steeringDir = path.join(kiroDir, 'steering');
    const hooksDir = path.join(kiroDir, 'hooks');
    const agentsDir = path.join(kiroDir, 'agents');

    const hasSpecs = await fs.pathExists(specsDir);
    const hasSteering = await fs.pathExists(steeringDir);
    const hasHooks = await fs.pathExists(hooksDir);
    const hasAgents = await fs.pathExists(agentsDir);

    // Try to detect Kiro version from package.json or other indicators
    let kiroVersion = 'unknown';
    const packageJsonPath = path.join(directory, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageJson = await fs.readJson(packageJsonPath);
        if (packageJson.dependencies && packageJson.dependencies.kiro) {
          kiroVersion = packageJson.dependencies.kiro;
        } else if (packageJson.devDependencies && packageJson.devDependencies.kiro) {
          kiroVersion = packageJson.devDependencies.kiro;
        }
      } catch (error) {
        // Ignore JSON parsing errors
      }
    }

    return {
      isKiroWorkspace: true,
      kiroVersion,
      hasSpecs,
      hasSteering,
      hasHooks,
      hasAgents
    };
  }

  /**
   * Validates that the Kiro workspace has the minimum required structure
   * @param {string} directory - Directory to validate
   * @returns {Promise<{isValid: boolean, missingComponents: string[], recommendations: string[]}>}
   */
  async validateKiroWorkspace(directory) {
    const detection = await this.detectKiroWorkspace(directory);
    
    if (!detection.isKiroWorkspace) {
      return {
        isValid: false,
        missingComponents: ['.kiro directory'],
        recommendations: [
          'Initialize a Kiro workspace by creating a .kiro directory',
          'Set up basic Kiro structure with specs, steering, and agents directories'
        ]
      };
    }

    const missingComponents = [];
    const recommendations = [];

    if (!detection.hasSpecs) {
      missingComponents.push('.kiro/specs directory');
      recommendations.push('Create .kiro/specs directory for spec-driven development');
    }

    if (!detection.hasSteering) {
      missingComponents.push('.kiro/steering directory');
      recommendations.push('Create .kiro/steering directory for project conventions');
    }

    if (!detection.hasAgents) {
      missingComponents.push('.kiro/agents directory');
      recommendations.push('Create .kiro/agents directory for BMad agent integration');
    }

    return {
      isValid: missingComponents.length === 0,
      missingComponents,
      recommendations
    };
  }

  /**
   * Creates the basic Kiro workspace structure if missing
   * @param {string} directory - Directory to set up
   * @returns {Promise<void>}
   */
  async ensureKiroWorkspaceStructure(directory) {
    const kiroDir = path.join(directory, '.kiro');
    
    // Create basic Kiro directories
    await fs.ensureDir(path.join(kiroDir, 'specs'));
    await fs.ensureDir(path.join(kiroDir, 'steering'));
    await fs.ensureDir(path.join(kiroDir, 'agents'));
    await fs.ensureDir(path.join(kiroDir, 'hooks'));

    // Create a basic README in the .kiro directory
    const readmePath = path.join(kiroDir, 'README.md');
    if (!await fs.pathExists(readmePath)) {
      const readmeContent = `# Kiro Workspace Configuration

This directory contains Kiro IDE-specific configuration and agents.

## Structure

- \`agents/\` - BMad Method agents integrated with Kiro
- \`specs/\` - Spec-driven development documents
- \`steering/\` - Project conventions and technical preferences
- \`hooks/\` - Automated workflow hooks

## BMad Integration

This workspace has been configured for BMad Method integration with Kiro IDE.
BMad agents are available through Kiro's agent system with full context awareness.
`;
      await fs.writeFile(readmePath, readmeContent);
    }
  }

  /**
   * Gets existing BMad installation info in a Kiro workspace
   * @param {string} directory - Directory to check
   * @returns {Promise<{hasBMadInstallation: boolean, installationType?: string, version?: string, agentCount?: number}>}
   */
  async getBMadInstallationInfo(directory) {
    const kiroAgentsDir = path.join(directory, '.kiro', 'agents');
    const bmadCoreDir = path.join(directory, '.bmad-core');
    
    let hasBMadInstallation = false;
    let installationType = null;
    let version = null;
    let agentCount = 0;

    // Check for existing BMad agents in Kiro agents directory
    if (await fs.pathExists(kiroAgentsDir)) {
      const agentFiles = await fs.readdir(kiroAgentsDir);
      const bmadAgentFiles = agentFiles.filter(file => 
        file.endsWith('.md') && (file.startsWith('bmad-') || file.includes('bmad'))
      );
      
      if (bmadAgentFiles.length > 0) {
        hasBMadInstallation = true;
        installationType = 'kiro-native';
        agentCount = bmadAgentFiles.length;
      }
    }

    // Check for traditional BMad installation
    if (await fs.pathExists(bmadCoreDir)) {
      const manifestPath = path.join(bmadCoreDir, 'install-manifest.yaml');
      if (await fs.pathExists(manifestPath)) {
        try {
          const yaml = require('js-yaml');
          const manifestContent = await fs.readFile(manifestPath, 'utf8');
          const manifest = yaml.load(manifestContent);
          
          hasBMadInstallation = true;
          installationType = 'traditional';
          version = manifest.version;
        } catch (error) {
          // Ignore manifest parsing errors
        }
      }
    }

    return {
      hasBMadInstallation,
      installationType,
      version,
      agentCount
    };
  }
}

module.exports = KiroDetector;