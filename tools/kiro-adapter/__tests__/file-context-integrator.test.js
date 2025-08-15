/**
 * File Context Integrator Tests
 * Tests for file context integration functionality
 */

const FileContextIntegrator = require('../file-context-integrator');
const path = require('path');
const fs = require('fs-extra');

describe('FileContextIntegrator', () => {
  let integrator;
  let mockWorkspaceRoot;

  beforeEach(() => {
    integrator = new FileContextIntegrator({
      logLevel: 'error' // Suppress logs during tests
    });
    mockWorkspaceRoot = '/mock/workspace';
  });

  describe('integrateFileContextSystem', () => {
    it('should integrate file context system for dev agent', () => {
      const agentContent = `# BMad Developer Agent

This is a development agent for BMad Method.

## Capabilities
- Code development
- Testing
- Debugging`;

      const agentMetadata = {
        id: 'dev',
        expansionPack: null
      };

      const result = integrator.integrateFileContextSystem(agentContent, agentMetadata);

      expect(result).toContain('## File Context Integration');
      expect(result).toContain('Primary Context Sources:');
      expect(result).toContain('**#File**: Current file content and metadata');
      expect(result).toContain('**#Problems**: Build errors, linting issues, and diagnostics');
      expect(result).toContain('**#Terminal**: Command output and build logs');
      expect(result).toContain('## Project Understanding Integration');
      expect(result).toContain('## Workspace Boundary Respect');
      expect(result).toContain('## Multi-File Operation Support');
    });

    it('should integrate file context system for architect agent', () => {
      const agentContent = `# BMad Architect Agent

This is an architecture agent for BMad Method.`;

      const agentMetadata = {
        id: 'architect',
        expansionPack: null
      };

      const result = integrator.integrateFileContextSystem(agentContent, agentMetadata);

      expect(result).toContain('**#Codebase**: Full project understanding and indexing');
      expect(result).toContain('**#Folder**: Directory structure and file listings');
      expect(result).toContain('architecture-focused insights');
      expect(result).toContain('Analyze and document system architecture');
    });

    it('should integrate expansion pack specific context', () => {
      const agentContent = `# BMad Game Developer Agent

This is a game development agent.`;

      const agentMetadata = {
        id: 'dev',
        expansionPack: 'bmad-2d-phaser-game-dev'
      };

      const result = integrator.integrateFileContextSystem(agentContent, agentMetadata);

      expect(result).toContain('bmad-2d-phaser-game-dev Specific Context:');
      expect(result).toContain('Game asset files (sprites, sounds, animations)');
      expect(result).toContain('Phaser.js scene and state files');
    });

    it('should handle unknown agent types with default requirements', () => {
      const agentContent = `# Unknown Agent

This is an unknown agent type.`;

      const agentMetadata = {
        id: 'unknown-agent',
        expansionPack: null
      };

      const result = integrator.integrateFileContextSystem(agentContent, agentMetadata);

      expect(result).toContain('## File Context Integration');
      expect(result).toContain('**#File**: Current file content and metadata');
      expect(result).toContain('**#Folder**: Directory structure and file listings');
    });
  });

  describe('generateFileContextAwarenessSection', () => {
    it('should generate context awareness section with primary and secondary sources', () => {
      const requirements = {
        primary: ['#File', '#Problems'],
        secondary: ['#Folder', '#Codebase']
      };

      const result = integrator.generateFileContextAwarenessSection(requirements, 'dev', null);

      expect(result).toContain('## File Context Integration');
      expect(result).toContain('Primary Context Sources:');
      expect(result).toContain('**#File**: Current file content and metadata');
      expect(result).toContain('**#Problems**: Build errors, linting issues, and diagnostics');
      expect(result).toContain('Secondary Context Sources:');
      expect(result).toContain('**#Folder**: Directory structure and file listings');
      expect(result).toContain('**#Codebase**: Full project understanding and indexing');
    });

    it('should include expansion pack context when provided', () => {
      const requirements = {
        primary: ['#File'],
        secondary: ['#Folder']
      };

      const result = integrator.generateFileContextAwarenessSection(requirements, 'dev', 'bmad-2d-unity-game-dev');

      expect(result).toContain('bmad-2d-unity-game-dev Specific Context:');
      expect(result).toContain('Unity scene files and prefabs');
      expect(result).toContain('C# script files and MonoBehaviour components');
    });
  });

  describe('generateProjectUnderstandingSection', () => {
    it('should generate project understanding section for different agent types', () => {
      const requirements = { primary: ['#File'], secondary: ['#Folder'] };

      const devResult = integrator.generateProjectUnderstandingSection(requirements, 'dev');
      expect(devResult).toContain('development-focused insights');

      const qaResult = integrator.generateProjectUnderstandingSection(requirements, 'qa');
      expect(qaResult).toContain('quality assurance-focused insights');

      const architectResult = integrator.generateProjectUnderstandingSection(requirements, 'architect');
      expect(architectResult).toContain('architecture-focused insights');
    });

    it('should include architecture awareness and dependency intelligence', () => {
      const requirements = { primary: ['#Codebase'], secondary: ['#Folder'] };

      const result = integrator.generateProjectUnderstandingSection(requirements, 'architect');

      expect(result).toContain('Architecture Awareness:');
      expect(result).toContain('Dependency Intelligence:');
      expect(result).toContain('Pattern Recognition:');
      expect(result).toContain('Technology Stack Integration:');
    });
  });

  describe('generateWorkspaceBoundarySection', () => {
    it('should generate workspace boundary section with security measures', () => {
      const requirements = {
        workspaceBoundaryRules: ['respect-gitignore', 'stay-in-project', 'validate-paths']
      };

      const result = integrator.generateWorkspaceBoundarySection(requirements, 'dev');

      expect(result).toContain('## Workspace Boundary Respect');
      expect(result).toContain('Boundary Enforcement:');
      expect(result).toContain('Honor .gitignore patterns and exclude ignored files');
      expect(result).toContain('Only operate within the current project workspace');
      expect(result).toContain('Ensure all file paths are valid and accessible');
      expect(result).toContain('Security Measures:');
      expect(result).toContain('Project Integrity:');
    });
  });

  describe('generateMultiFileOperationSection', () => {
    it('should generate multi-file operation section with supported operations', () => {
      const requirements = {
        multiFileOperations: ['refactoring', 'debugging', 'testing']
      };

      const result = integrator.generateMultiFileOperationSection(requirements, 'dev');

      expect(result).toContain('## Multi-File Operation Support');
      expect(result).toContain('Supported Multi-File Operations:');
      expect(result).toContain('Code refactoring across multiple files');
      expect(result).toContain('Debug issues spanning multiple files');
      expect(result).toContain('Test implementation and coverage analysis');
      expect(result).toContain('Operation Workflow:');
      expect(result).toContain('Safety Measures:');
    });
  });

  describe('validateWorkspaceBoundaries', () => {
    it('should validate file paths within workspace boundaries', async () => {
      const filePath = path.join(mockWorkspaceRoot, 'src', 'component.js');
      const workspaceConfig = { root: mockWorkspaceRoot };

      // Mock fs.pathExists and fs.access
      jest.spyOn(fs, 'pathExists').mockResolvedValue(true);
      jest.spyOn(fs, 'access').mockResolvedValue();

      const result = await integrator.validateWorkspaceBoundaries(filePath, workspaceConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedPath).toBe(path.resolve(filePath));
    });

    it('should reject paths outside workspace boundaries', async () => {
      const filePath = '/outside/workspace/file.js';
      const workspaceConfig = { root: mockWorkspaceRoot };

      const result = await integrator.validateWorkspaceBoundaries(filePath, workspaceConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Path is outside workspace boundaries');
    });

    it('should handle non-existent files with warnings', async () => {
      const filePath = path.join(mockWorkspaceRoot, 'nonexistent.js');
      const workspaceConfig = { root: mockWorkspaceRoot };

      jest.spyOn(fs, 'pathExists').mockResolvedValue(false);

      const result = await integrator.validateWorkspaceBoundaries(filePath, workspaceConfig);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('File does not exist');
    });
  });

  describe('checkGitignorePatterns', () => {
    it('should check if file matches gitignore patterns', async () => {
      const relativePath = 'node_modules/package/file.js';
      const workspaceRoot = mockWorkspaceRoot;

      jest.spyOn(fs, 'pathExists').mockResolvedValue(true);
      jest.spyOn(fs, 'readFile').mockResolvedValue('node_modules/\n*.log\n.env');

      const result = await integrator.checkGitignorePatterns(relativePath, workspaceRoot);

      expect(result).toBe(true);
    });

    it('should return false for files not matching gitignore patterns', async () => {
      const relativePath = 'src/component.js';
      const workspaceRoot = mockWorkspaceRoot;

      jest.spyOn(fs, 'pathExists').mockResolvedValue(true);
      jest.spyOn(fs, 'readFile').mockResolvedValue('node_modules/\n*.log\n.env');

      const result = await integrator.checkGitignorePatterns(relativePath, workspaceRoot);

      expect(result).toBe(false);
    });

    it('should return false when no gitignore file exists', async () => {
      const relativePath = 'src/component.js';
      const workspaceRoot = mockWorkspaceRoot;

      jest.spyOn(fs, 'pathExists').mockResolvedValue(false);

      const result = await integrator.checkGitignorePatterns(relativePath, workspaceRoot);

      expect(result).toBe(false);
    });
  });

  describe('matchesGitignorePattern', () => {
    it('should match directory patterns', () => {
      expect(integrator.matchesGitignorePattern('node_modules/package/file.js', 'node_modules/')).toBe(true);
      expect(integrator.matchesGitignorePattern('src/node_modules/file.js', 'node_modules/')).toBe(true);
      expect(integrator.matchesGitignorePattern('src/file.js', 'node_modules/')).toBe(false);
    });

    it('should match wildcard patterns', () => {
      expect(integrator.matchesGitignorePattern('file.log', '*.log')).toBe(true);
      expect(integrator.matchesGitignorePattern('debug.log', '*.log')).toBe(true);
      expect(integrator.matchesGitignorePattern('file.txt', '*.log')).toBe(false);
    });

    it('should match exact patterns', () => {
      expect(integrator.matchesGitignorePattern('.env', '.env')).toBe(true);
      expect(integrator.matchesGitignorePattern('config/.env', '.env')).toBe(true);
      expect(integrator.matchesGitignorePattern('.environment', '.env')).toBe(false);
    });
  });

  describe('analyzeProjectStructure', () => {
    it('should analyze project structure and identify patterns', async () => {
      const mockStructure = {
        name: 'project',
        type: 'directory',
        children: [
          { name: 'src', type: 'directory', children: [] },
          { name: 'test', type: 'directory', children: [] },
          { name: 'docs', type: 'directory', children: [] },
          { name: 'package.json', type: 'file', extension: '.json' }
        ]
      };

      jest.spyOn(integrator, 'buildDirectoryStructure').mockResolvedValue(mockStructure);

      const result = await integrator.analyzeProjectStructure(mockWorkspaceRoot);

      expect(result.structure).toEqual(mockStructure);
      expect(result.patterns).toContain('source-separation');
      expect(result.patterns).toContain('test-separation');
      expect(result.patterns).toContain('documentation-structure');
      expect(result.boundaries).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('identifyStructurePatterns', () => {
    it('should identify common project structure patterns', () => {
      const structure = {
        name: 'project',
        type: 'directory',
        children: [
          { name: 'src', type: 'directory' },
          { name: 'test', type: 'directory' },
          { name: 'docs', type: 'directory' },
          { name: 'config', type: 'directory' },
          { name: 'assets', type: 'directory' }
        ]
      };

      const patterns = integrator.identifyStructurePatterns(structure);

      expect(patterns).toContain('source-separation');
      expect(patterns).toContain('test-separation');
      expect(patterns).toContain('documentation-structure');
      expect(patterns).toContain('configuration-separation');
      expect(patterns).toContain('asset-organization');
    });

    it('should handle projects without common patterns', () => {
      const structure = {
        name: 'project',
        type: 'directory',
        children: [
          { name: 'index.js', type: 'file' },
          { name: 'README.md', type: 'file' }
        ]
      };

      const patterns = integrator.identifyStructurePatterns(structure);

      expect(patterns).toHaveLength(0);
    });
  });

  describe('getExpansionPackFileContext', () => {
    it('should return context for Phaser game development', () => {
      const context = integrator.getExpansionPackFileContext('bmad-2d-phaser-game-dev');

      expect(context).toContain('Game asset files (sprites, sounds, animations)');
      expect(context).toContain('Phaser.js scene and state files');
      expect(context).toContain('Game configuration and settings files');
      expect(context).toContain('Asset loading and management scripts');
    });

    it('should return context for Unity game development', () => {
      const context = integrator.getExpansionPackFileContext('bmad-2d-unity-game-dev');

      expect(context).toContain('Unity scene files and prefabs');
      expect(context).toContain('C# script files and MonoBehaviour components');
      expect(context).toContain('Unity asset files and import settings');
      expect(context).toContain('Animation controllers and state machines');
    });

    it('should return context for infrastructure DevOps', () => {
      const context = integrator.getExpansionPackFileContext('bmad-infrastructure-devops');

      expect(context).toContain('Infrastructure as Code files (Terraform, CloudFormation)');
      expect(context).toContain('CI/CD pipeline configurations');
      expect(context).toContain('Container definitions and orchestration files');
      expect(context).toContain('Configuration and environment files');
    });

    it('should return empty array for unknown expansion packs', () => {
      const context = integrator.getExpansionPackFileContext('unknown-expansion');

      expect(context).toHaveLength(0);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});