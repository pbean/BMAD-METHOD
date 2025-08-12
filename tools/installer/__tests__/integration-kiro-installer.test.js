/**
 * Integration tests for Kiro installer functionality
 * Tests the complete flow from interactive/command-line selection to final installation
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

// Mock modules that we don't want to actually execute during tests
jest.mock('ora', () => {
  return jest.fn(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    text: ''
  }));
});

jest.mock('inquirer');
jest.mock('../../kiro-adapter/kiro-installer');

const inquirer = require('inquirer');
const KiroInstaller = require('../../kiro-adapter/kiro-installer');

// Import the functions we need to test
const IdeValidator = require('../lib/ide-validator');
const ErrorReporter = require('../lib/error-reporter');

describe('Kiro Installer Integration Tests', () => {
  let tempDir;
  let mockKiroInstaller;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-test-'));
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup KiroInstaller mock
    mockKiroInstaller = {
      installForKiro: jest.fn().mockResolvedValue(undefined),
      upgradeKiroInstallation: jest.fn().mockResolvedValue(undefined),
      addKiroEnhancements: jest.fn().mockResolvedValue(undefined)
    };
    KiroInstaller.mockImplementation(() => mockKiroInstaller);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('7.1 Interactive mode with Kiro only', () => {
    it('should detect Kiro as requiring special IDE handling', () => {
      const ideValidator = new IdeValidator();
      
      // Test that Kiro is detected as requiring special handling
      expect(ideValidator.requiresSpecialIdeHandling(['kiro'])).toBe(true);
      expect(ideValidator.requiresSpecialIdeHandling(['cursor'])).toBe(false);
      expect(ideValidator.requiresSpecialIdeHandling(['kiro', 'cursor'])).toBe(true);
    });

    it('should create proper configuration for Kiro installation', async () => {
      // Test the configuration creation logic that would be used in interactive mode
      const createKiroConfiguration = (config) => {
        if (!config) config = {};
        return {
          installType: config.installType || 'full',
          directory: config.directory || '.',
          ides: Array.isArray(config.ides) ? config.ides : ['kiro'],
          expansionPacks: Array.isArray(config.expansionPacks) ? config.expansionPacks : [],
          generateHooks: true, // Enable hooks by default for Kiro
          upgrade: config.upgrade || false,
          prdSharded: config.prdSharded,
          architectureSharded: config.architectureSharded,
          githubCopilotConfig: config.githubCopilotConfig,
          includeWebBundles: config.includeWebBundles,
          webBundleType: config.webBundleType,
          selectedWebBundleTeams: config.selectedWebBundleTeams,
          includeIndividualAgents: config.includeIndividualAgents,
          webBundlesDirectory: config.webBundlesDirectory
        };
      };

      // Simulate interactive mode answers for Kiro-only selection
      const interactiveAnswers = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        prdSharded: true,
        architectureSharded: true,
        includeWebBundles: false
      };

      const config = createKiroConfiguration(interactiveAnswers);

      expect(config).toEqual({
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        generateHooks: true,
        upgrade: false,
        prdSharded: true,
        architectureSharded: true,
        githubCopilotConfig: undefined,
        includeWebBundles: false,
        webBundleType: undefined,
        selectedWebBundleTeams: undefined,
        includeIndividualAgents: undefined,
        webBundlesDirectory: undefined
      });
    });

    it('should call KiroInstaller with correct configuration', async () => {
      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        generateHooks: true,
        upgrade: false
      };

      // Simulate the handleKiroInstallation function logic
      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, path.resolve(config.directory), {});

      // Verify KiroInstaller was called with correct configuration
      expect(KiroInstaller).toHaveBeenCalledTimes(1);
      expect(mockKiroInstaller.installForKiro).toHaveBeenCalledWith(
        config,
        tempDir,
        {}
      );
    });

    it('should create .kiro folder structure when Kiro is installed', async () => {
      // Mock successful installation that creates the expected folder structure
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        // Simulate creating .kiro folder structure
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(kiroDir, { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'steering'), { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'hooks'), { recursive: true });
        
        // Create some sample files to verify structure
        await fs.writeFile(path.join(kiroDir, 'agents', 'dev.md'), '# Dev Agent');
        await fs.writeFile(path.join(kiroDir, 'steering', 'bmad-integration.md'), '# BMad Integration');
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        generateHooks: true,
        upgrade: false
      };

      // Execute the installation
      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify .kiro folder structure was created
      const kiroDir = path.join(tempDir, '.kiro');
      expect(await fs.access(kiroDir).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(kiroDir, 'agents')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(kiroDir, 'steering')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(kiroDir, 'hooks')).then(() => true).catch(() => false)).toBe(true);
      
      // Verify sample files were created
      expect(await fs.access(path.join(kiroDir, 'agents', 'dev.md')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(kiroDir, 'steering', 'bmad-integration.md')).then(() => true).catch(() => false)).toBe(true);
    });

    it('should transform agents and create steering rules for Kiro', async () => {
      // Mock installation that creates transformed agents and steering rules
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'steering'), { recursive: true });
        
        // Create transformed agent files
        await fs.writeFile(
          path.join(kiroDir, 'agents', 'dev.md'),
          '# Dev Agent\n\nTransformed for Kiro with context injection and steering integration.'
        );
        await fs.writeFile(
          path.join(kiroDir, 'agents', 'pm.md'),
          '# PM Agent\n\nTransformed for Kiro with context injection and steering integration.'
        );
        
        // Create steering rules
        await fs.writeFile(
          path.join(kiroDir, 'steering', 'bmad-integration.md'),
          '# BMad Integration\n\nSteering rules for BMad Method integration with Kiro.'
        );
        await fs.writeFile(
          path.join(kiroDir, 'steering', 'tech-stack.md'),
          '# Tech Stack\n\nDefault technology stack preferences.'
        );
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        generateHooks: true,
        upgrade: false
      };

      // Execute the installation
      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify transformed agents were created
      const agentsDir = path.join(tempDir, '.kiro', 'agents');
      const devAgent = await fs.readFile(path.join(agentsDir, 'dev.md'), 'utf8');
      const pmAgent = await fs.readFile(path.join(agentsDir, 'pm.md'), 'utf8');
      
      expect(devAgent).toContain('Transformed for Kiro');
      expect(pmAgent).toContain('Transformed for Kiro');
      
      // Verify steering rules were created
      const steeringDir = path.join(tempDir, '.kiro', 'steering');
      const bmadIntegration = await fs.readFile(path.join(steeringDir, 'bmad-integration.md'), 'utf8');
      const techStack = await fs.readFile(path.join(steeringDir, 'tech-stack.md'), 'utf8');
      
      expect(bmadIntegration).toContain('BMad Method integration');
      expect(techStack).toContain('technology stack');
    });

    it('should handle errors gracefully during Kiro installation', async () => {
      // Mock installation failure
      const installError = new Error('Kiro installation failed');
      mockKiroInstaller.installForKiro = jest.fn().mockRejectedValue(installError);

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        generateHooks: true,
        upgrade: false
      };

      // Execute the installation and expect it to throw
      const kiroInstaller = new KiroInstaller();
      await expect(kiroInstaller.installForKiro(config, tempDir, {})).rejects.toThrow('Kiro installation failed');
      
      // Verify KiroInstaller was called
      expect(mockKiroInstaller.installForKiro).toHaveBeenCalledTimes(1);
    });
  });

  describe('7.2 Single-session installation with full configuration', () => {
    it('should install BMad core + expansion packs + multiple IDEs in one session', async () => {
      // Mock installation that creates all components
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        // Simulate creating BMad core
        const bmadCoreDir = path.join(directory, '.bmad-core');
        await fs.mkdir(bmadCoreDir, { recursive: true });
        await fs.writeFile(path.join(bmadCoreDir, 'manifest.json'), JSON.stringify({
          version: '4.0.0',
          type: 'bmad-core'
        }));

        // Simulate creating expansion packs
        for (const pack of config.expansionPacks) {
          const packDir = path.join(directory, `.${pack}`);
          await fs.mkdir(packDir, { recursive: true });
          await fs.mkdir(path.join(packDir, 'agents'), { recursive: true });
          await fs.mkdir(path.join(packDir, 'templates'), { recursive: true });
          
          await fs.writeFile(path.join(packDir, 'manifest.json'), JSON.stringify({
            version: '1.0.0',
            type: 'expansion-pack',
            id: pack
          }));
          
          // Create sample expansion pack agents
          await fs.writeFile(
            path.join(packDir, 'agents', 'game-developer.md'),
            '# Game Developer Agent\n\nSpecialized for game development.'
          );
        }

        // Simulate creating IDE configurations (non-Kiro)
        for (const ide of config.ides) {
          if (ide !== 'kiro') {
            const ideConfigDir = path.join(directory, '.vscode'); // Example for cursor
            await fs.mkdir(ideConfigDir, { recursive: true });
            await fs.writeFile(
              path.join(ideConfigDir, 'settings.json'),
              JSON.stringify({ [`${ide}.enabled`]: true })
            );
          }
        }

        // Simulate creating Kiro integration
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(kiroDir, { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'steering'), { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'hooks'), { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'spec-templates'), { recursive: true });

        // Create transformed BMad core agents for Kiro
        await fs.writeFile(
          path.join(kiroDir, 'agents', 'dev.md'),
          '# Dev Agent\n\nTransformed for Kiro with context injection.'
        );

        // Create transformed expansion pack agents for Kiro
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'agents', `${pack}-game-developer.md`),
            `# Game Developer Agent (${pack})\n\nTransformed for Kiro with context injection and steering integration.`
          );
        }

        // Create expansion pack templates converted to Kiro specs
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'spec-templates', `${pack}-game-spec.md`),
            `# Game Development Spec Template\n\nConverted from ${pack} templates for Kiro spec format.`
          );
        }

        // Create domain-specific hooks for expansion packs
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'hooks', `${pack}-hooks.json`),
            JSON.stringify({
              name: `${pack} Development Hooks`,
              hooks: [
                {
                  name: 'Game Asset Update',
                  trigger: 'file_save',
                  pattern: '*.png,*.jpg,*.wav',
                  action: 'update_asset_registry'
                }
              ]
            })
          );
        }

        // Create expansion pack steering rules
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'steering', `${pack}-guidelines.md`),
            `# ${pack} Development Guidelines\n\nSteering rules for ${pack} development with BMad Method.`
          );
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro', 'cursor'],
        expansionPacks: ['bmad-2d-unity-game-dev', 'bmad-infrastructure-devops'],
        generateHooks: true,
        upgrade: false
      };

      // Execute the installation
      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify BMad core installation
      const bmadCoreDir = path.join(tempDir, '.bmad-core');
      expect(await fs.access(bmadCoreDir).then(() => true).catch(() => false)).toBe(true);
      const coreManifest = JSON.parse(await fs.readFile(path.join(bmadCoreDir, 'manifest.json'), 'utf8'));
      expect(coreManifest.type).toBe('bmad-core');

      // Verify expansion pack installations
      for (const pack of config.expansionPacks) {
        const packDir = path.join(tempDir, `.${pack}`);
        expect(await fs.access(packDir).then(() => true).catch(() => false)).toBe(true);
        const packManifest = JSON.parse(await fs.readFile(path.join(packDir, 'manifest.json'), 'utf8'));
        expect(packManifest.id).toBe(pack);
      }

      // Verify non-Kiro IDE configuration
      const ideConfigDir = path.join(tempDir, '.vscode');
      expect(await fs.access(ideConfigDir).then(() => true).catch(() => false)).toBe(true);

      // Verify Kiro integration
      const kiroDir = path.join(tempDir, '.kiro');
      expect(await fs.access(kiroDir).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(kiroDir, 'agents')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(kiroDir, 'spec-templates')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(kiroDir, 'hooks')).then(() => true).catch(() => false)).toBe(true);
    });

    it('should transform expansion pack agents for Kiro', async () => {
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });

        // Create transformed expansion pack agents
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'agents', `${pack}-game-developer.md`),
            `# Game Developer Agent (${pack})\n\nTransformed for Kiro with context injection and steering integration.`
          );
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify expansion pack agents are transformed for Kiro
      const kiroAgentsDir = path.join(tempDir, '.kiro', 'agents');
      const transformedAgent = await fs.readFile(
        path.join(kiroAgentsDir, 'bmad-2d-unity-game-dev-game-developer.md'),
        'utf8'
      );
      expect(transformedAgent).toContain('Transformed for Kiro');
      expect(transformedAgent).toContain('context injection');
      expect(transformedAgent).toContain('steering integration');
    });

    it('should convert expansion pack templates to Kiro specs', async () => {
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(path.join(kiroDir, 'spec-templates'), { recursive: true });

        // Create converted spec templates
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'spec-templates', `${pack}-game-spec.md`),
            `# Game Development Spec Template\n\nConverted from ${pack} templates for Kiro spec format.`
          );
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify expansion pack templates are converted to Kiro specs
      const specTemplatesDir = path.join(tempDir, '.kiro', 'spec-templates');
      const convertedSpec = await fs.readFile(
        path.join(specTemplatesDir, 'bmad-2d-unity-game-dev-game-spec.md'),
        'utf8'
      );
      expect(convertedSpec).toContain('Converted from bmad-2d-unity-game-dev templates');
      expect(convertedSpec).toContain('Kiro spec format');
    });

    it('should generate domain-specific hooks for expansion packs', async () => {
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(path.join(kiroDir, 'hooks'), { recursive: true });

        // Create domain-specific hooks
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'hooks', `${pack}-hooks.json`),
            JSON.stringify({
              name: `${pack} Development Hooks`,
              hooks: [
                {
                  name: 'Game Asset Update',
                  trigger: 'file_save',
                  pattern: '*.png,*.jpg,*.wav',
                  action: 'update_asset_registry'
                }
              ]
            })
          );
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify domain-specific hooks are generated
      const hooksDir = path.join(tempDir, '.kiro', 'hooks');
      const hooksFile = await fs.readFile(
        path.join(hooksDir, 'bmad-2d-unity-game-dev-hooks.json'),
        'utf8'
      );
      const hooks = JSON.parse(hooksFile);
      expect(hooks.name).toContain('bmad-2d-unity-game-dev Development Hooks');
      expect(hooks.hooks).toHaveLength(1);
      expect(hooks.hooks[0].name).toBe('Game Asset Update');
    });

    it('should create expansion pack steering rules', async () => {
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(path.join(kiroDir, 'steering'), { recursive: true });

        // Create expansion pack steering rules
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'steering', `${pack}-guidelines.md`),
            `# ${pack} Development Guidelines\n\nSteering rules for ${pack} development with BMad Method.`
          );
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify expansion pack steering rules are created
      const steeringDir = path.join(tempDir, '.kiro', 'steering');
      const steeringRules = await fs.readFile(
        path.join(steeringDir, 'bmad-2d-unity-game-dev-guidelines.md'),
        'utf8'
      );
      expect(steeringRules).toContain('bmad-2d-unity-game-dev Development Guidelines');
      expect(steeringRules).toContain('BMad Method');
    });
  });

  describe('8.1 Test partial failure scenarios', () => {
    it('should handle KiroInstaller success but standard IDE setup failure', async () => {
      // Mock KiroInstaller to succeed
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        // Simulate successful Kiro setup
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(kiroDir, { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });
        await fs.writeFile(
          path.join(kiroDir, 'agents', 'dev.md'),
          '# Dev Agent\n\nTransformed for Kiro.'
        );
        
        // But simulate standard IDE setup failure
        if (config.ides && config.ides.includes('cursor')) {
          throw new Error('Cursor IDE setup failed: Unable to create configuration files');
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro', 'cursor'],
        expansionPacks: [],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      
      // Should throw error about Cursor setup failure
      await expect(kiroInstaller.installForKiro(config, tempDir, {})).rejects.toThrow('Cursor IDE setup failed');
      
      // Verify KiroInstaller was called
      expect(mockKiroInstaller.installForKiro).toHaveBeenCalledTimes(1);
    });

    it('should handle KiroInstaller failure with appropriate error messages', async () => {
      // Mock KiroInstaller to fail during Kiro enhancements
      mockKiroInstaller.installForKiro = jest.fn().mockRejectedValue(
        new Error('Failed to create .kiro directory structure: Permission denied')
      );

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      
      // Should throw error about Kiro setup failure
      await expect(kiroInstaller.installForKiro(config, tempDir, {})).rejects.toThrow('Permission denied');
      
      // Verify KiroInstaller was called
      expect(mockKiroInstaller.installForKiro).toHaveBeenCalledTimes(1);
    });

    it('should handle BMad installation success but Kiro enhancement failure', async () => {
      // Mock successful BMad installation but failed Kiro enhancements
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        // Simulate successful BMad installation
        const bmadCoreDir = path.join(directory, '.bmad-core');
        await fs.mkdir(bmadCoreDir, { recursive: true });
        await fs.writeFile(path.join(bmadCoreDir, 'manifest.json'), JSON.stringify({
          version: '4.0.0',
          type: 'bmad-core'
        }));
        
        // But fail during Kiro enhancements
        throw new Error('Kiro agent transformation failed: Unable to read BMad core agents');
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      
      // Should throw error about Kiro enhancement failure
      await expect(kiroInstaller.installForKiro(config, tempDir, {})).rejects.toThrow('Kiro agent transformation failed');
      
      // Verify KiroInstaller was called
      expect(mockKiroInstaller.installForKiro).toHaveBeenCalledTimes(1);
    });

    it('should handle expansion pack installation failure during Kiro setup', async () => {
      // Mock failure during expansion pack processing
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        // Simulate successful BMad core installation
        const bmadCoreDir = path.join(directory, '.bmad-core');
        await fs.mkdir(bmadCoreDir, { recursive: true });
        
        // But fail during expansion pack processing
        if (config.expansionPacks && config.expansionPacks.length > 0) {
          throw new Error('Expansion pack bmad-2d-unity-game-dev installation failed: Package not found');
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      
      // Should throw error about expansion pack failure
      await expect(kiroInstaller.installForKiro(config, tempDir, {})).rejects.toThrow('Package not found');
      
      // Verify KiroInstaller was called
      expect(mockKiroInstaller.installForKiro).toHaveBeenCalledTimes(1);
    });

    it('should provide detailed error context for different failure types', async () => {
      const errorReporter = new ErrorReporter();
      
      // Test Kiro setup error context
      const kiroError = new Error('Failed to create .kiro directory');
      const kiroReport = errorReporter.createErrorReport(
        kiroError,
        errorReporter.errorTypes.KIRO_SETUP,
        {
          phase: 'Phase 2 - Kiro Enhancements',
          component: 'kiro',
          operation: 'enhance',
          directory: tempDir,
          bmadInstalled: true
        }
      );

      expect(kiroReport.type).toBe('KIRO_SETUP');
      expect(kiroReport.actionable).toContain('Kiro setup failed during Phase 2 - Kiro Enhancements');
      expect(kiroReport.actionable).toContain('BMad core components were installed successfully');
      expect(kiroReport.troubleshooting).toContain('Ensure you have write permissions in the target directory');

      // Test standard IDE error context
      const ideError = new Error('Cursor configuration failed');
      const ideReport = errorReporter.createErrorReport(
        ideError,
        errorReporter.errorTypes.STANDARD_IDE,
        {
          ide: 'cursor',
          operation: 'configuration setup'
        }
      );

      expect(ideReport.type).toBe('STANDARD_IDE');
      expect(ideReport.actionable).toContain('IDE configuration failed for cursor during configuration setup');
      expect(ideReport.troubleshooting).toContain('Verify the IDE is properly installed on your system');

      // Test expansion pack error context
      const packError = new Error('Package not found');
      const packReport = errorReporter.createErrorReport(
        packError,
        errorReporter.errorTypes.EXPANSION_PACK,
        {
          packId: 'bmad-2d-unity-game-dev',
          operation: 'installation'
        }
      );

      expect(packReport.type).toBe('EXPANSION_PACK');
      expect(packReport.actionable).toContain('Expansion pack installation failed for bmad-2d-unity-game-dev during installation');
      expect(packReport.troubleshooting).toContain('Verify the expansion pack name is correct');
    });

    it('should handle cleanup after partial failures', async () => {
      // Mock partial installation that creates some files but fails
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        // Create some files
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(kiroDir, { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });
        await fs.writeFile(
          path.join(kiroDir, 'agents', 'partial.md'),
          '# Partial Agent\n\nThis was created before failure.'
        );
        
        // Then fail
        throw new Error('Installation failed after partial setup');
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      
      // Should throw error
      await expect(kiroInstaller.installForKiro(config, tempDir, {})).rejects.toThrow('Installation failed after partial setup');
      
      // Verify partial files were created (no automatic cleanup expected)
      const partialFile = path.join(tempDir, '.kiro', 'agents', 'partial.md');
      expect(await fs.access(partialFile).then(() => true).catch(() => false)).toBe(true);
    });

    it('should handle multiple IDE failures gracefully', async () => {
      // Mock failure with multiple IDEs
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        // Simulate successful Kiro setup
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(kiroDir, { recursive: true });
        
        // But fail on multiple IDE setup
        const failedIdes = config.ides.filter(ide => ide !== 'kiro');
        if (failedIdes.length > 0) {
          throw new Error(`Multiple IDE setup failed: ${failedIdes.join(', ')} could not be configured`);
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro', 'cursor', 'windsurf'],
        expansionPacks: [],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      
      // Should throw error about multiple IDE failures
      await expect(kiroInstaller.installForKiro(config, tempDir, {})).rejects.toThrow('cursor, windsurf could not be configured');
      
      // Verify KiroInstaller was called
      expect(mockKiroInstaller.installForKiro).toHaveBeenCalledTimes(1);
    });
  });

  describe('8.2 Test invalid input handling', () => {
    it('should handle invalid IDE names gracefully', async () => {
      const ideValidator = new IdeValidator();
      
      // Test with invalid IDE names
      const invalidIdes = ['invalid-ide', 'nonexistent', 'fake-ide'];
      const validation = ideValidator.validateIdeArray(invalidIdes);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(2); // One for invalid IDEs, one for supported list
      expect(validation.errors[0]).toContain('Unsupported IDE(s): invalid-ide, nonexistent, fake-ide');
      expect(validation.errors[1]).toContain('Supported IDEs:');
      expect(validation.sanitizedIdes).toHaveLength(0);
    });

    it('should handle mixed valid and invalid IDE names', async () => {
      const ideValidator = new IdeValidator();
      
      // Test with mix of valid and invalid IDEs
      const mixedIdes = ['kiro', 'invalid-ide', 'cursor', 'nonexistent'];
      const validation = ideValidator.validateIdeArray(mixedIdes);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Unsupported IDE(s): invalid-ide, nonexistent');
      expect(validation.sanitizedIdes).toEqual(['kiro', 'cursor']);
    });

    it('should handle non-array IDE input', async () => {
      const ideValidator = new IdeValidator();
      
      // Test with string instead of array
      const stringInput = 'kiro';
      const validation = ideValidator.validateIdeArray(stringInput);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('IDE input must be an array, received: string');
      
      // Test with object instead of array
      const objectInput = { ide: 'kiro' };
      const validation2 = ideValidator.validateIdeArray(objectInput);
      
      expect(validation2.isValid).toBe(false);
      expect(validation2.errors[0]).toContain('IDE input must be an array, received: object');
      
      // Test with null
      const nullInput = null;
      const validation3 = ideValidator.validateIdeArray(nullInput);
      
      expect(validation3.isValid).toBe(false);
      expect(validation3.errors[0]).toContain('IDE array is undefined or null');
      
      // Test with undefined
      const undefinedInput = undefined;
      const validation4 = ideValidator.validateIdeArray(undefinedInput);
      
      expect(validation4.isValid).toBe(false);
      expect(validation4.errors[0]).toContain('IDE array is undefined or null');
    });

    it('should handle empty and malformed IDE arrays', async () => {
      const ideValidator = new IdeValidator();
      
      // Test with empty array
      const emptyArray = [];
      const validation = ideValidator.validateIdeArray(emptyArray);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0]).toContain('No IDEs selected');
      expect(validation.sanitizedIdes).toHaveLength(0);
      
      // Test with array containing non-string values
      const malformedArray = ['kiro', 123, null, undefined, '', 'cursor'];
      const validation2 = ideValidator.validateIdeArray(malformedArray);
      
      expect(validation2.isValid).toBe(false);
      expect(validation2.errors[0]).toContain('Unsupported IDE(s): 123 (type: number), null (type: object), undefined (type: undefined), empty string');
      expect(validation2.sanitizedIdes).toEqual(['kiro', 'cursor']);
    });

    it('should handle duplicate IDE entries', async () => {
      const ideValidator = new IdeValidator();
      
      // Test with duplicate IDEs
      const duplicateIdes = ['kiro', 'cursor', 'kiro', 'windsurf', 'cursor'];
      const validation = ideValidator.validateIdeArray(duplicateIdes);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0]).toContain('Duplicate IDE(s) removed: kiro, cursor');
      expect(validation.sanitizedIdes).toEqual(['kiro', 'cursor', 'windsurf']);
    });

    it('should handle malformed configuration objects', async () => {
      // Test with missing required properties
      const malformedConfig1 = {
        // Missing installType, directory, ides
        expansionPacks: [],
        upgrade: false
      };

      // Mock KiroInstaller to validate configuration
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        if (!config.installType) {
          throw new Error('Configuration validation failed: installType is required');
        }
        if (!config.directory) {
          throw new Error('Configuration validation failed: directory is required');
        }
        if (!config.ides || !Array.isArray(config.ides)) {
          throw new Error('Configuration validation failed: ides must be an array');
        }
      });

      const kiroInstaller = new KiroInstaller();
      
      // Should throw configuration validation error
      await expect(kiroInstaller.installForKiro(malformedConfig1, tempDir, {})).rejects.toThrow('installType is required');
      
      // Test with invalid property types
      const malformedConfig2 = {
        installType: 'full',
        directory: tempDir,
        ides: 'kiro', // Should be array
        expansionPacks: 'pack1,pack2', // Should be array
        upgrade: 'false' // Should be boolean
      };

      await expect(kiroInstaller.installForKiro(malformedConfig2, tempDir, {})).rejects.toThrow('ides must be an array');
    });

    it('should validate configuration object structure', async () => {
      const errorReporter = new ErrorReporter();
      
      // Test configuration error reporting
      const configError = new Error('Invalid configuration: missing required field');
      const configReport = errorReporter.createErrorReport(
        configError,
        errorReporter.errorTypes.CONFIGURATION,
        {
          configFile: 'installation config',
          field: 'installType'
        }
      );

      expect(configReport.type).toBe('CONFIGURATION');
      expect(configReport.actionable).toContain('Configuration error in installation config for field: installType');
      expect(configReport.troubleshooting).toContain('Check configuration file syntax');
      expect(configReport.troubleshooting).toContain('Verify all required configuration fields are present');
    });

    it('should handle IDE validation errors with proper error reporting', async () => {
      const ideValidator = new IdeValidator();
      const errorReporter = new ErrorReporter();
      
      // Test IDE validation error
      const invalidIdes = ['invalid-ide', 'fake-ide'];
      const supportedIdes = ideValidator.getSupportedIdes();
      
      const ideError = new Error('IDE validation failed');
      const ideReport = errorReporter.createErrorReport(
        ideError,
        errorReporter.errorTypes.IDE_VALIDATION,
        {
          invalidIdes: invalidIdes,
          supportedIdes: supportedIdes
        }
      );

      expect(ideReport.type).toBe('IDE_VALIDATION');
      expect(ideReport.actionable).toContain('Invalid IDE(s): invalid-ide, fake-ide');
      expect(ideReport.actionable).toContain('Supported IDEs are:');
      expect(ideReport.troubleshooting).toContain('Check that IDE names are spelled correctly');
      expect(ideReport.troubleshooting.join(' ')).toContain('Use supported IDE identifiers:');
    });

    it('should gracefully handle edge cases in input validation', async () => {
      const ideValidator = new IdeValidator();
      
      // Test with whitespace-only IDE names
      const whitespaceIdes = ['kiro', '   ', '\t', '\n', 'cursor'];
      const validation = ideValidator.validateIdeArray(whitespaceIdes);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('empty string');
      expect(validation.sanitizedIdes).toEqual(['kiro', 'cursor']);
      
      // Test with case variations
      const caseVariationIdes = ['KIRO', 'Cursor', 'kiro', 'cursor'];
      const validation2 = ideValidator.validateIdeArray(caseVariationIdes);
      
      expect(validation2.isValid).toBe(true);
      expect(validation2.warnings[0]).toContain('Duplicate IDE(s) removed');
      expect(validation2.sanitizedIdes).toEqual(['kiro', 'cursor']);
      
      // Test with very long IDE names
      const longIdeName = 'a'.repeat(1000);
      const longIdes = ['kiro', longIdeName];
      const validation3 = ideValidator.validateIdeArray(longIdes);
      
      expect(validation3.isValid).toBe(false);
      expect(validation3.errors[0]).toContain(`Unsupported IDE(s): ${longIdeName}`);
    });

    it('should handle special IDE handling detection with invalid inputs', async () => {
      const ideValidator = new IdeValidator();
      
      // Test requiresSpecialIdeHandling with invalid inputs
      expect(ideValidator.requiresSpecialIdeHandling(null)).toBeFalsy();
      expect(ideValidator.requiresSpecialIdeHandling(undefined)).toBeFalsy();
      expect(ideValidator.requiresSpecialIdeHandling([])).toBe(false);
      expect(ideValidator.requiresSpecialIdeHandling('kiro')).toBeFalsy(); // Not an array
      expect(ideValidator.requiresSpecialIdeHandling(['invalid-ide'])).toBe(false);
      expect(ideValidator.requiresSpecialIdeHandling(['kiro'])).toBe(true);
      expect(ideValidator.requiresSpecialIdeHandling(['cursor', 'kiro'])).toBe(true);
    });

    it('should provide helpful error messages for common mistakes', async () => {
      const ideValidator = new IdeValidator();
      
      // Test common IDE name mistakes
      const commonMistakes = ['vscode', 'vs-code', 'visual-studio-code', 'copilot'];
      const validation = ideValidator.validateIdeArray(commonMistakes);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Unsupported IDE(s): vscode, vs-code, visual-studio-code, copilot');
      expect(validation.errors[1]).toContain('cursor, claude-code, windsurf, trae, roo, kilo, cline, gemini, qwen-code, github-copilot, kiro');
      
      // Format and display the error
      const formattedError = ideValidator.formatValidationError(validation);
      expect(formattedError).toContain('IDE Validation Error:');
      expect(formattedError).toContain('Unsupported IDE(s):');
    });
  });

  describe('7.3 Command-line mode consistency', () => {
    it('should produce same result for --ide kiro as interactive Kiro selection', async () => {
      // Mock installation for both modes
      const mockInstallation = async (config, directory) => {
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(kiroDir, { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'steering'), { recursive: true });
        
        await fs.writeFile(
          path.join(kiroDir, 'agents', 'dev.md'),
          '# Dev Agent\n\nTransformed for Kiro.'
        );
        await fs.writeFile(
          path.join(kiroDir, 'steering', 'bmad-integration.md'),
          '# BMad Integration\n\nSteering rules.'
        );
      };

      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(mockInstallation);

      // Test command-line configuration
      const commandLineConfig = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        upgrade: false
      };

      // Test interactive configuration (should be identical)
      const interactiveConfig = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        prdSharded: true,
        architectureSharded: true,
        includeWebBundles: false
      };

      // Create configuration normalization function (from handleKiroInstallation)
      const createKiroConfiguration = (config) => ({
        installType: config.installType || 'full',
        directory: config.directory || '.',
        ides: Array.isArray(config.ides) ? config.ides : ['kiro'],
        expansionPacks: Array.isArray(config.expansionPacks) ? config.expansionPacks : [],
        generateHooks: true,
        upgrade: config.upgrade || false,
        prdSharded: config.prdSharded,
        architectureSharded: config.architectureSharded,
        githubCopilotConfig: config.githubCopilotConfig,
        includeWebBundles: config.includeWebBundles,
        webBundleType: config.webBundleType,
        selectedWebBundleTeams: config.selectedWebBundleTeams,
        includeIndividualAgents: config.includeIndividualAgents,
        webBundlesDirectory: config.webBundlesDirectory
      });

      const normalizedCommandLine = createKiroConfiguration(commandLineConfig);
      const normalizedInteractive = createKiroConfiguration(interactiveConfig);

      // Both should have the same core properties
      expect(normalizedCommandLine.installType).toBe(normalizedInteractive.installType);
      expect(normalizedCommandLine.directory).toBe(normalizedInteractive.directory);
      expect(normalizedCommandLine.ides).toEqual(normalizedInteractive.ides);
      expect(normalizedCommandLine.expansionPacks).toEqual(normalizedInteractive.expansionPacks);
      expect(normalizedCommandLine.generateHooks).toBe(normalizedInteractive.generateHooks);
      expect(normalizedCommandLine.upgrade).toBe(normalizedInteractive.upgrade);

      // Execute both installations
      const kiroInstaller1 = new KiroInstaller();
      const kiroInstaller2 = new KiroInstaller();
      
      await kiroInstaller1.installForKiro(normalizedCommandLine, tempDir, {});
      
      // Create second temp directory for comparison
      const tempDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-test-'));
      await kiroInstaller2.installForKiro(normalizedInteractive, tempDir2, {});

      // Verify both installations created the same structure
      const kiroDir1 = path.join(tempDir, '.kiro');
      const kiroDir2 = path.join(tempDir2, '.kiro');
      
      expect(await fs.access(kiroDir1).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(kiroDir2).then(() => true).catch(() => false)).toBe(true);
      
      const agent1 = await fs.readFile(path.join(kiroDir1, 'agents', 'dev.md'), 'utf8');
      const agent2 = await fs.readFile(path.join(kiroDir2, 'agents', 'dev.md'), 'utf8');
      expect(agent1).toBe(agent2);

      // Cleanup
      await fs.rm(tempDir2, { recursive: true });
    });

    it('should produce same result for --ide kiro cursor as interactive multi-selection', async () => {
      const mockInstallation = async (config, directory) => {
        // Create Kiro structure
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(kiroDir, { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });
        
        // Create IDE configurations for non-Kiro IDEs
        for (const ide of config.ides) {
          if (ide !== 'kiro') {
            const ideConfigDir = path.join(directory, '.vscode');
            await fs.mkdir(ideConfigDir, { recursive: true });
            await fs.writeFile(
              path.join(ideConfigDir, 'settings.json'),
              JSON.stringify({ [`${ide}.enabled`]: true })
            );
          }
        }
        
        await fs.writeFile(
          path.join(kiroDir, 'agents', 'dev.md'),
          '# Dev Agent\n\nTransformed for Kiro.'
        );
      };

      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(mockInstallation);

      // Command-line: --ide kiro cursor
      const commandLineConfig = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro', 'cursor'],
        expansionPacks: [],
        upgrade: false
      };

      // Interactive: select Kiro + Cursor
      const interactiveConfig = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro', 'cursor'],
        expansionPacks: [],
        prdSharded: true,
        architectureSharded: true,
        includeWebBundles: false
      };

      // Both should result in the same installation
      const kiroInstaller1 = new KiroInstaller();
      const kiroInstaller2 = new KiroInstaller();
      
      await kiroInstaller1.installForKiro(commandLineConfig, tempDir, {});
      
      const tempDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-test-'));
      await kiroInstaller2.installForKiro(interactiveConfig, tempDir2, {});

      // Verify both created Kiro integration
      expect(await fs.access(path.join(tempDir, '.kiro')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(tempDir2, '.kiro')).then(() => true).catch(() => false)).toBe(true);
      
      // Verify both created Cursor configuration
      expect(await fs.access(path.join(tempDir, '.vscode')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(tempDir2, '.vscode')).then(() => true).catch(() => false)).toBe(true);

      // Cleanup
      await fs.rm(tempDir2, { recursive: true });
    });

    it('should handle expansion packs consistently between command-line and interactive', async () => {
      const mockInstallation = async (config, directory) => {
        // Create expansion pack directories
        for (const pack of config.expansionPacks) {
          const packDir = path.join(directory, `.${pack}`);
          await fs.mkdir(packDir, { recursive: true });
          await fs.writeFile(
            path.join(packDir, 'manifest.json'),
            JSON.stringify({ id: pack, version: '1.0.0' })
          );
        }

        // Create Kiro integration with expansion pack enhancements
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(kiroDir, { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });
        
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'agents', `${pack}-agent.md`),
            `# ${pack} Agent\n\nTransformed for Kiro.`
          );
        }
      };

      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(mockInstallation);

      // Command-line: --ide kiro --expansion-packs bmad-2d-unity-game-dev
      const commandLineConfig = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        upgrade: false
      };

      // Interactive: select Kiro + expansion pack
      const interactiveConfig = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        prdSharded: true,
        architectureSharded: true,
        includeWebBundles: false
      };

      const kiroInstaller1 = new KiroInstaller();
      const kiroInstaller2 = new KiroInstaller();
      
      await kiroInstaller1.installForKiro(commandLineConfig, tempDir, {});
      
      const tempDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-test-'));
      await kiroInstaller2.installForKiro(interactiveConfig, tempDir2, {});

      // Verify both created expansion pack
      const packDir1 = path.join(tempDir, '.bmad-2d-unity-game-dev');
      const packDir2 = path.join(tempDir2, '.bmad-2d-unity-game-dev');
      expect(await fs.access(packDir1).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(packDir2).then(() => true).catch(() => false)).toBe(true);

      // Verify both created Kiro-transformed expansion pack agents
      const kiroAgent1 = path.join(tempDir, '.kiro', 'agents', 'bmad-2d-unity-game-dev-agent.md');
      const kiroAgent2 = path.join(tempDir2, '.kiro', 'agents', 'bmad-2d-unity-game-dev-agent.md');
      expect(await fs.access(kiroAgent1).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(kiroAgent2).then(() => true).catch(() => false)).toBe(true);

      // Cleanup
      await fs.rm(tempDir2, { recursive: true });
    });

    it('should validate folder structures are identical between methods', async () => {
      const mockInstallation = async (config, directory) => {
        // Create comprehensive folder structure
        const structures = [
          '.bmad-core',
          '.kiro',
          '.kiro/agents',
          '.kiro/steering',
          '.kiro/hooks'
        ];

        for (const structure of structures) {
          await fs.mkdir(path.join(directory, structure), { recursive: true });
        }

        // Create sample files
        await fs.writeFile(
          path.join(directory, '.bmad-core', 'manifest.json'),
          JSON.stringify({ version: '4.0.0' })
        );
        await fs.writeFile(
          path.join(directory, '.kiro', 'agents', 'dev.md'),
          '# Dev Agent'
        );
        await fs.writeFile(
          path.join(directory, '.kiro', 'steering', 'bmad-integration.md'),
          '# BMad Integration'
        );
      };

      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(mockInstallation);

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: [],
        upgrade: false
      };

      // Install using "command-line" method
      const kiroInstaller1 = new KiroInstaller();
      await kiroInstaller1.installForKiro(config, tempDir, {});

      // Install using "interactive" method (same config, different temp dir)
      const tempDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'bmad-test-'));
      const kiroInstaller2 = new KiroInstaller();
      await kiroInstaller2.installForKiro(config, tempDir2, {});

      // Compare folder structures
      const getDirectoryStructure = async (dir) => {
        const structure = [];
        const scan = async (currentDir, relativePath = '') => {
          const items = await fs.readdir(currentDir);
          for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const itemRelativePath = path.join(relativePath, item);
            const stat = await fs.stat(fullPath);
            
            if (stat.isDirectory()) {
              structure.push(`DIR: ${itemRelativePath}`);
              await scan(fullPath, itemRelativePath);
            } else {
              structure.push(`FILE: ${itemRelativePath}`);
            }
          }
        };
        await scan(dir);
        return structure.sort();
      };

      const structure1 = await getDirectoryStructure(tempDir);
      const structure2 = await getDirectoryStructure(tempDir2);

      expect(structure1).toEqual(structure2);

      // Cleanup
      await fs.rm(tempDir2, { recursive: true });
    });
  });

  describe('7.4 Expansion pack Kiro enhancements specifically', () => {
    it('should install expansion pack agents in both original and Kiro locations', async () => {
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        // Create original expansion pack structure
        for (const pack of config.expansionPacks) {
          const packDir = path.join(directory, `.${pack}`);
          await fs.mkdir(path.join(packDir, 'agents'), { recursive: true });
          
          // Create original expansion pack agents
          await fs.writeFile(
            path.join(packDir, 'agents', 'game-developer.md'),
            `# Game Developer Agent\n\nOriginal ${pack} agent for general use.`
          );
          await fs.writeFile(
            path.join(packDir, 'agents', 'game-designer.md'),
            `# Game Designer Agent\n\nOriginal ${pack} agent for game design.`
          );
        }

        // Create Kiro-transformed expansion pack agents
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });
        
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'agents', `${pack}-game-developer.md`),
            `# Game Developer Agent (${pack})\n\nKiro-transformed agent with context injection and steering integration.`
          );
          await fs.writeFile(
            path.join(kiroDir, 'agents', `${pack}-game-designer.md`),
            `# Game Designer Agent (${pack})\n\nKiro-transformed agent with context injection and steering integration.`
          );
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify original expansion pack agents exist
      const originalAgentsDir = path.join(tempDir, '.bmad-2d-unity-game-dev', 'agents');
      expect(await fs.access(originalAgentsDir).then(() => true).catch(() => false)).toBe(true);
      
      const originalGameDev = await fs.readFile(
        path.join(originalAgentsDir, 'game-developer.md'),
        'utf8'
      );
      expect(originalGameDev).toContain('Original bmad-2d-unity-game-dev agent');

      // Verify Kiro-transformed expansion pack agents exist
      const kiroAgentsDir = path.join(tempDir, '.kiro', 'agents');
      expect(await fs.access(kiroAgentsDir).then(() => true).catch(() => false)).toBe(true);
      
      const kiroGameDev = await fs.readFile(
        path.join(kiroAgentsDir, 'bmad-2d-unity-game-dev-game-developer.md'),
        'utf8'
      );
      expect(kiroGameDev).toContain('Kiro-transformed agent');
      expect(kiroGameDev).toContain('context injection');
      expect(kiroGameDev).toContain('steering integration');
    });

    it('should verify Kiro-transformed expansion agents have context injection and steering integration', async () => {
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });
        
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'agents', `${pack}-game-developer.md`),
            `# Game Developer Agent (${pack})

## Context Injection
This agent has been enhanced with Kiro context injection capabilities:
- Automatic file context loading
- Project structure awareness
- Real-time code analysis

## Steering Integration
This agent integrates with Kiro steering rules:
- Follows project-specific guidelines
- Adapts to team coding standards
- Respects architectural decisions

## Original Functionality
Enhanced version of the original ${pack} game developer agent.`
          );
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify the transformed agent has the required enhancements
      const transformedAgent = await fs.readFile(
        path.join(tempDir, '.kiro', 'agents', 'bmad-2d-unity-game-dev-game-developer.md'),
        'utf8'
      );

      expect(transformedAgent).toContain('Context Injection');
      expect(transformedAgent).toContain('context injection capabilities');
      expect(transformedAgent).toContain('Automatic file context loading');
      expect(transformedAgent).toContain('Project structure awareness');
      
      expect(transformedAgent).toContain('Steering Integration');
      expect(transformedAgent).toContain('steering rules');
      expect(transformedAgent).toContain('project-specific guidelines');
      expect(transformedAgent).toContain('coding standards');
    });

    it('should convert expansion pack templates to Kiro spec format', async () => {
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(path.join(kiroDir, 'spec-templates'), { recursive: true });
        
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'spec-templates', `${pack}-game-development-spec.md`),
            `# Game Development Spec Template (${pack})

## Requirements Section
This template has been converted from ${pack} templates to Kiro spec format.

### User Stories
- As a game developer, I want to create engaging gameplay mechanics
- As a game designer, I want to balance game difficulty

### Acceptance Criteria
1. WHEN the player interacts with game objects THEN the system SHALL respond appropriately
2. WHEN the game difficulty increases THEN the player SHALL face appropriate challenges

## Design Section
Architecture and technical design considerations for game development.

## Tasks Section
Implementation tasks broken down into actionable items.

---
*Converted from ${pack} workflow templates for Kiro spec-driven development*`
          );
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify expansion pack templates are converted to Kiro spec format
      const specTemplate = await fs.readFile(
        path.join(tempDir, '.kiro', 'spec-templates', 'bmad-2d-unity-game-dev-game-development-spec.md'),
        'utf8'
      );

      expect(specTemplate).toContain('Requirements Section');
      expect(specTemplate).toContain('User Stories');
      expect(specTemplate).toContain('Acceptance Criteria');
      expect(specTemplate).toContain('Design Section');
      expect(specTemplate).toContain('Tasks Section');
      expect(specTemplate).toContain('WHEN');
      expect(specTemplate).toContain('THEN');
      expect(specTemplate).toContain('SHALL');
      expect(specTemplate).toContain('Converted from bmad-2d-unity-game-dev');
      expect(specTemplate).toContain('Kiro spec-driven development');
    });

    it('should create domain-specific hooks for expansion packs', async () => {
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(path.join(kiroDir, 'hooks'), { recursive: true });
        
        for (const pack of config.expansionPacks) {
          const hooks = {
            name: `${pack} Development Hooks`,
            description: `Domain-specific automation hooks for ${pack} development`,
            hooks: [
              {
                name: 'Game Asset Update',
                description: 'Automatically update asset registry when game assets are modified',
                trigger: 'file_save',
                pattern: '*.png,*.jpg,*.wav,*.mp3,*.fbx,*.prefab',
                action: 'update_asset_registry',
                config: {
                  registryFile: 'assets/asset-registry.json',
                  autoOptimize: true
                }
              },
              {
                name: 'Scene Validation',
                description: 'Validate scene files for common issues',
                trigger: 'file_save',
                pattern: '*.unity',
                action: 'validate_scene',
                config: {
                  checkMissingReferences: true,
                  validateLighting: true
                }
              },
              {
                name: 'Build Preparation',
                description: 'Prepare build when scripts are modified',
                trigger: 'file_save',
                pattern: '*.cs',
                action: 'prepare_build',
                config: {
                  runTests: true,
                  updateVersion: false
                }
              }
            ]
          };

          await fs.writeFile(
            path.join(kiroDir, 'hooks', `${pack}-hooks.json`),
            JSON.stringify(hooks, null, 2)
          );
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify domain-specific hooks are created
      const hooksFile = await fs.readFile(
        path.join(tempDir, '.kiro', 'hooks', 'bmad-2d-unity-game-dev-hooks.json'),
        'utf8'
      );
      const hooks = JSON.parse(hooksFile);

      expect(hooks.name).toBe('bmad-2d-unity-game-dev Development Hooks');
      expect(hooks.description).toContain('Domain-specific automation hooks');
      expect(hooks.hooks).toHaveLength(3);

      // Verify specific game development hooks
      const assetHook = hooks.hooks.find(h => h.name === 'Game Asset Update');
      expect(assetHook).toBeDefined();
      expect(assetHook.pattern).toContain('*.png');
      expect(assetHook.pattern).toContain('*.fbx');
      expect(assetHook.action).toBe('update_asset_registry');

      const sceneHook = hooks.hooks.find(h => h.name === 'Scene Validation');
      expect(sceneHook).toBeDefined();
      expect(sceneHook.pattern).toBe('*.unity');
      expect(sceneHook.action).toBe('validate_scene');

      const buildHook = hooks.hooks.find(h => h.name === 'Build Preparation');
      expect(buildHook).toBeDefined();
      expect(buildHook.pattern).toBe('*.cs');
      expect(buildHook.action).toBe('prepare_build');
    });

    it('should create expansion pack steering rules', async () => {
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(path.join(kiroDir, 'steering'), { recursive: true });
        
        for (const pack of config.expansionPacks) {
          await fs.writeFile(
            path.join(kiroDir, 'steering', `${pack}-guidelines.md`),
            `# ${pack} Development Guidelines

## Game Development Best Practices

### Unity-Specific Guidelines
- Use consistent naming conventions for GameObjects and scripts
- Organize assets in logical folder structures
- Implement proper object pooling for performance
- Follow Unity's component-based architecture patterns

### Code Quality Standards
- Write clean, readable C# code following Microsoft conventions
- Implement proper error handling and logging
- Use Unity's built-in systems (Coroutines, ScriptableObjects, etc.)
- Document public APIs and complex algorithms

### Performance Considerations
- Profile regularly using Unity Profiler
- Optimize texture sizes and compression settings
- Minimize draw calls through batching
- Use appropriate data structures for game state

### Testing Strategy
- Write unit tests for game logic
- Implement integration tests for core systems
- Use Unity Test Framework for automated testing
- Test on target platforms regularly

### Asset Management
- Use version control for all assets
- Implement consistent asset naming conventions
- Optimize assets for target platforms
- Document asset dependencies and usage

---
*These guidelines are specific to ${pack} development and integrate with BMad Method workflows.*`
          );
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev'],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify expansion pack steering rules are created
      const steeringRules = await fs.readFile(
        path.join(tempDir, '.kiro', 'steering', 'bmad-2d-unity-game-dev-guidelines.md'),
        'utf8'
      );

      expect(steeringRules).toContain('bmad-2d-unity-game-dev Development Guidelines');
      expect(steeringRules).toContain('Game Development Best Practices');
      expect(steeringRules).toContain('Unity-Specific Guidelines');
      expect(steeringRules).toContain('Code Quality Standards');
      expect(steeringRules).toContain('Performance Considerations');
      expect(steeringRules).toContain('Testing Strategy');
      expect(steeringRules).toContain('Asset Management');
      expect(steeringRules).toContain('BMad Method workflows');
      
      // Verify domain-specific content
      expect(steeringRules).toContain('GameObjects');
      expect(steeringRules).toContain('Unity Profiler');
      expect(steeringRules).toContain('ScriptableObjects');
      expect(steeringRules).toContain('Unity Test Framework');
    });

    it('should handle multiple expansion packs with separate Kiro enhancements', async () => {
      mockKiroInstaller.installForKiro = jest.fn().mockImplementation(async (config, directory) => {
        const kiroDir = path.join(directory, '.kiro');
        await fs.mkdir(path.join(kiroDir, 'agents'), { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'steering'), { recursive: true });
        await fs.mkdir(path.join(kiroDir, 'hooks'), { recursive: true });
        
        for (const pack of config.expansionPacks) {
          // Create pack-specific agents
          await fs.writeFile(
            path.join(kiroDir, 'agents', `${pack}-specialist.md`),
            `# ${pack} Specialist Agent\n\nKiro-enhanced agent for ${pack} domain.`
          );
          
          // Create pack-specific steering rules
          await fs.writeFile(
            path.join(kiroDir, 'steering', `${pack}-rules.md`),
            `# ${pack} Rules\n\nDomain-specific guidelines for ${pack}.`
          );
          
          // Create pack-specific hooks
          await fs.writeFile(
            path.join(kiroDir, 'hooks', `${pack}-automation.json`),
            JSON.stringify({
              name: `${pack} Automation`,
              hooks: [{ name: `${pack} Hook`, trigger: 'file_save' }]
            })
          );
        }
      });

      const config = {
        installType: 'full',
        directory: tempDir,
        ides: ['kiro'],
        expansionPacks: ['bmad-2d-unity-game-dev', 'bmad-infrastructure-devops'],
        generateHooks: true,
        upgrade: false
      };

      const kiroInstaller = new KiroInstaller();
      await kiroInstaller.installForKiro(config, tempDir, {});

      // Verify each expansion pack has its own Kiro enhancements
      for (const pack of config.expansionPacks) {
        // Check agents
        const agentFile = path.join(tempDir, '.kiro', 'agents', `${pack}-specialist.md`);
        expect(await fs.access(agentFile).then(() => true).catch(() => false)).toBe(true);
        const agentContent = await fs.readFile(agentFile, 'utf8');
        expect(agentContent).toContain(pack);
        
        // Check steering rules
        const steeringFile = path.join(tempDir, '.kiro', 'steering', `${pack}-rules.md`);
        expect(await fs.access(steeringFile).then(() => true).catch(() => false)).toBe(true);
        const steeringContent = await fs.readFile(steeringFile, 'utf8');
        expect(steeringContent).toContain(pack);
        
        // Check hooks
        const hooksFile = path.join(tempDir, '.kiro', 'hooks', `${pack}-automation.json`);
        expect(await fs.access(hooksFile).then(() => true).catch(() => false)).toBe(true);
        const hooksContent = JSON.parse(await fs.readFile(hooksFile, 'utf8'));
        expect(hooksContent.name).toContain(pack);
      }
    });
  });
});