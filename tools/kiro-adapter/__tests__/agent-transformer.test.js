/**
 * Unit tests for AgentTransformer
 * Tests the transformation of BMad agents to Kiro-native agents
 */

const AgentTransformer = require('../agent-transformer');
const path = require('path');
const fs = require('fs-extra');

describe('AgentTransformer', () => {
  let transformer;
  const testOutputDir = path.join(__dirname, '../test-output');

  beforeEach(() => {
    transformer = new AgentTransformer({
      preserveOriginal: true,
      addKiroMetadata: true,
      validateOutput: true
    });
  });

  afterEach(async () => {
    // Clean up test output
    await fs.remove(testOutputDir);
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultTransformer = new AgentTransformer();
      expect(defaultTransformer.options).toBeDefined();
      expect(defaultTransformer.options.preserveOriginal).toBe(true);
    });

    it('should accept custom options', () => {
      const customTransformer = new AgentTransformer({
        preserveOriginal: false,
        addKiroMetadata: false
      });
      expect(customTransformer.options.preserveOriginal).toBe(false);
      expect(customTransformer.options.addKiroMetadata).toBe(false);
    });
  });

  describe('transformAgent', () => {
    const bmadAgentPath = path.join(__dirname, '../../../bmad-core/agents/pm.md');
    const kiroOutputPath = path.join(testOutputDir, 'bmad-pm.md');

    beforeEach(async () => {
      await fs.ensureDir(testOutputDir);
    });

    it('should successfully transform a BMad agent to Kiro format', async () => {
      const success = await transformer.transformAgent(bmadAgentPath, kiroOutputPath, {
        steeringRules: ['product.md', 'tech.md'],
        mcpTools: ['web-search']
      });

      expect(success).toBe(true);
      expect(await fs.pathExists(kiroOutputPath)).toBe(true);
    });

    it('should preserve original BMad persona', async () => {
      await transformer.transformAgent(bmadAgentPath, kiroOutputPath);
      const content = await fs.readFile(kiroOutputPath, 'utf8');
      
      // Should contain BMad-specific content
      expect(content).toContain('BMad');
      expect(content).toContain('Product Manager');
    });

    it('should inject Kiro context awareness', async () => {
      await transformer.transformAgent(bmadAgentPath, kiroOutputPath);
      const content = await fs.readFile(kiroOutputPath, 'utf8');
      
      // Should contain Kiro context references
      expect(content).toContain('## Context Awareness');
      expect(content).toContain('#File');
      expect(content).toContain('#Folder');
    });

    it('should add steering rule integration', async () => {
      await transformer.transformAgent(bmadAgentPath, kiroOutputPath, {
        steeringRules: ['product.md', 'tech.md']
      });
      const content = await fs.readFile(kiroOutputPath, 'utf8');
      
      expect(content).toContain('steering_rules:');
      expect(content).toContain('product.md');
      expect(content).toContain('tech.md');
    });

    it('should handle missing input file gracefully', async () => {
      const nonExistentPath = path.join(__dirname, 'non-existent.md');
      const success = await transformer.transformAgent(nonExistentPath, kiroOutputPath);
      
      expect(success).toBe(false);
    });

    it('should validate output format', async () => {
      await transformer.transformAgent(bmadAgentPath, kiroOutputPath);
      const content = await fs.readFile(kiroOutputPath, 'utf8');
      
      // Should have YAML frontmatter
      expect(content).toMatch(/^---\n[\s\S]*?\n---\n/);
      
      // Should have required Kiro metadata
      expect(content).toContain('name:');
      expect(content).toContain('context_providers:');
    });
  });

  describe('injectContextAwareness', () => {
    it('should inject context awareness section', () => {
      const originalContent = '# Test Agent\n\nI am a test agent.';
      const result = transformer.injectContextAwareness(originalContent);
      
      expect(result).toContain('## Context Awareness');
      expect(result).toContain('#File');
      expect(result).toContain('#Folder');
      expect(result).toContain('#Problems');
    });

    it('should not duplicate context awareness section', () => {
      const contentWithContext = '# Test Agent\n\n## Context Awareness\nExisting context';
      const result = transformer.injectContextAwareness(contentWithContext);
      
      const matches = result.match(/## Context Awareness/g);
      expect(matches).toHaveLength(1);
    });
  });

  describe('addSteeringIntegration', () => {
    it('should add steering integration to YAML frontmatter', () => {
      const content = '---\nname: Test Agent\n---\n\n# Content';
      const result = transformer.addSteeringIntegration(content, ['product.md', 'tech.md']);
      
      expect(result).toContain('steering_rules:');
      expect(result).toContain('- "product.md"');
      expect(result).toContain('- "tech.md"');
    });

    it('should handle content without YAML frontmatter', () => {
      const content = '# Test Agent\n\nContent without frontmatter';
      const result = transformer.addSteeringIntegration(content, ['product.md']);
      
      expect(result).toContain('---');
      expect(result).toContain('steering_rules:');
    });
  });

  describe('preserveBMadPersona', () => {
    it('should maintain BMad-specific terminology', () => {
      const content = 'I am a BMad Product Manager specialized in creating PRDs.';
      const result = transformer.preserveBMadPersona(content);
      
      expect(result).toContain('BMad Product Manager');
      expect(result).toContain('PRDs');
    });

    it('should add BMad context preservation note', () => {
      const content = 'I am an agent.';
      const result = transformer.preserveBMadPersona(content);
      
      expect(result).toContain('BMad Method');
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path from project root', () => {
      const absolutePath = path.join(process.cwd(), 'bmad-core/agents/pm.md');
      const relativePath = transformer.getRelativePath(absolutePath);
      
      expect(relativePath).toBe('bmad-core/agents/pm.md');
    });

    it('should handle paths outside project root', () => {
      const outsidePath = '/tmp/some-file.md';
      const result = transformer.getRelativePath(outsidePath);
      
      expect(result).toBe(outsidePath);
    });
  });

  describe('error handling', () => {
    it('should handle file read errors gracefully', async () => {
      const invalidPath = path.join(__dirname, 'invalid-file.md');
      const outputPath = path.join(testOutputDir, 'output.md');
      
      const success = await transformer.transformAgent(invalidPath, outputPath);
      expect(success).toBe(false);
    });

    it('should handle file write errors gracefully', async () => {
      const bmadAgentPath = path.join(__dirname, '../../../bmad-core/agents/pm.md');
      const invalidOutputPath = '/invalid/path/output.md';
      
      const success = await transformer.transformAgent(bmadAgentPath, invalidOutputPath);
      expect(success).toBe(false);
    });
  });

  describe('integration with different agent types', () => {
    const agentTypes = ['pm.md', 'dev.md', 'qa.md', 'architect.md'];

    agentTypes.forEach(agentFile => {
      it(`should transform ${agentFile} successfully`, async () => {
        const bmadAgentPath = path.join(__dirname, '../../../bmad-core/agents', agentFile);
        const kiroOutputPath = path.join(testOutputDir, `bmad-${agentFile}`);
        
        // Skip test if agent file doesn't exist
        if (!await fs.pathExists(bmadAgentPath)) {
          return;
        }

        const success = await transformer.transformAgent(bmadAgentPath, kiroOutputPath);
        expect(success).toBe(true);
        
        const content = await fs.readFile(kiroOutputPath, 'utf8');
        expect(content).toContain('BMad');
        expect(content).toContain('Context Awareness');
      });
    });
  });
});