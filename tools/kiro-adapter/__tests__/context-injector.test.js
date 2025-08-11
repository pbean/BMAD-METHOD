/**
 * Unit tests for ContextInjector
 * Tests the context mapping and injection system
 */

const ContextInjector = require('../context-injector');

describe('ContextInjector', () => {
  let injector;

  beforeEach(() => {
    injector = new ContextInjector();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(injector).toBeDefined();
      expect(injector.contextMapping).toBeDefined();
      expect(injector.agentContextRequirements).toBeDefined();
    });

    it('should accept custom options', () => {
      const customInjector = new ContextInjector({
        enableFallback: false,
        validateContext: false
      });
      expect(customInjector.options.enableFallback).toBe(false);
    });
  });

  describe('mapBMadContextToKiro', () => {
    it('should map known BMad context needs to Kiro providers', () => {
      const bmadNeeds = ['current file', 'project structure', 'build issues'];
      const result = injector.mapBMadContextToKiro(bmadNeeds);
      
      expect(result).toBeDefined();
      expect(result.mapped).toBeDefined();
      expect(result.unmapped).toBeDefined();
      
      expect(result.mapped).toContain('#File');
      expect(result.mapped).toContain('#Folder');
      expect(result.mapped).toContain('#Problems');
    });

    it('should handle unknown context needs', () => {
      const bmadNeeds = ['unknown context', 'mysterious data'];
      const result = injector.mapBMadContextToKiro(bmadNeeds);
      
      expect(result.unmapped).toContain('unknown context');
      expect(result.unmapped).toContain('mysterious data');
    });

    it('should handle empty input', () => {
      const result = injector.mapBMadContextToKiro([]);
      
      expect(result.mapped).toEqual([]);
      expect(result.unmapped).toEqual([]);
    });

    it('should handle duplicate context needs', () => {
      const bmadNeeds = ['current file', 'current file', 'project structure'];
      const result = injector.mapBMadContextToKiro(bmadNeeds);
      
      // Should deduplicate
      const fileCount = result.mapped.filter(item => item === '#File').length;
      expect(fileCount).toBe(1);
    });
  });

  describe('agentContextRequirements', () => {
    it('should have requirements for all core agent types', () => {
      const coreAgents = ['dev', 'qa', 'architect', 'pm'];
      
      coreAgents.forEach(agentId => {
        expect(injector.agentContextRequirements[agentId]).toBeDefined();
        expect(injector.agentContextRequirements[agentId].primary).toBeDefined();
        expect(injector.agentContextRequirements[agentId].secondary).toBeDefined();
        expect(injector.agentContextRequirements[agentId].description).toBeDefined();
      });
    });

    it('should have appropriate context for dev agent', () => {
      const devRequirements = injector.agentContextRequirements.dev;
      
      expect(devRequirements.primary).toContain('#File');
      expect(devRequirements.primary).toContain('#Problems');
      expect(devRequirements.secondary).toContain('#Git Diff');
    });

    it('should have appropriate context for qa agent', () => {
      const qaRequirements = injector.agentContextRequirements.qa;
      
      expect(qaRequirements.primary).toContain('#Problems');
      expect(qaRequirements.primary).toContain('#Terminal');
      expect(qaRequirements.secondary).toContain('#Git Diff');
    });

    it('should have appropriate context for architect agent', () => {
      const archRequirements = injector.agentContextRequirements.architect;
      
      expect(archRequirements.primary).toContain('#Codebase');
      expect(archRequirements.primary).toContain('#Folder');
    });

    it('should have appropriate context for pm agent', () => {
      const pmRequirements = injector.agentContextRequirements.pm;
      
      expect(pmRequirements.primary).toContain('#Folder');
      expect(pmRequirements.secondary).toContain('#Codebase');
    });
  });

  describe('handleDynamicContextLoading', () => {
    it('should determine required context for dev agent code review', async () => {
      const contextRequest = {
        agentId: 'dev',
        taskType: 'code-review',
        contextNeeds: ['current file', 'build issues']
      };
      
      const result = await injector.handleDynamicContextLoading(contextRequest);
      
      expect(result).toBeDefined();
      expect(result.requiredContext).toContain('#File');
      expect(result.requiredContext).toContain('#Problems');
      expect(result.availableContext).toBeDefined();
      expect(result.fallbackNeeded).toBeDefined();
    });

    it('should handle qa agent testing context', async () => {
      const contextRequest = {
        agentId: 'qa',
        taskType: 'testing',
        contextNeeds: ['test results', 'error logs']
      };
      
      const result = await injector.handleDynamicContextLoading(contextRequest);
      
      expect(result.requiredContext).toContain('#Terminal');
      expect(result.requiredContext).toContain('#Problems');
    });

    it('should handle architect agent design context', async () => {
      const contextRequest = {
        agentId: 'architect',
        taskType: 'design',
        contextNeeds: ['project structure', 'code repository']
      };
      
      const result = await injector.handleDynamicContextLoading(contextRequest);
      
      expect(result.requiredContext).toContain('#Codebase');
      expect(result.requiredContext).toContain('#Folder');
    });

    it('should handle unknown agent gracefully', async () => {
      const contextRequest = {
        agentId: 'unknown-agent',
        taskType: 'unknown-task',
        contextNeeds: ['some context']
      };
      
      const result = await injector.handleDynamicContextLoading(contextRequest);
      
      expect(result).toBeDefined();
      expect(result.fallbackNeeded).toBe(true);
    });

    it('should handle empty context needs', async () => {
      const contextRequest = {
        agentId: 'dev',
        taskType: 'code-review',
        contextNeeds: []
      };
      
      const result = await injector.handleDynamicContextLoading(contextRequest);
      
      expect(result.requiredContext).toBeDefined();
      expect(Array.isArray(result.requiredContext)).toBe(true);
    });
  });

  describe('provideFallbackContext', () => {
    it('should provide fallback instructions for missing context', async () => {
      const missingContext = ['#Codebase', '#Terminal', '#Git Diff'];
      
      const result = await injector.provideFallbackContext(missingContext);
      
      expect(result).toBeDefined();
      expect(result.canProceedWithoutContext).toBeDefined();
      expect(result.fallbackInstructions).toBeDefined();
      expect(Array.isArray(result.fallbackInstructions)).toBe(true);
      
      result.fallbackInstructions.forEach(instruction => {
        expect(instruction.missing).toBeDefined();
        expect(instruction.instruction).toBeDefined();
        expect(instruction.priority).toBeDefined();
      });
    });

    it('should prioritize critical context', async () => {
      const missingContext = ['#File', '#Codebase'];
      
      const result = await injector.provideFallbackContext(missingContext);
      
      const fileInstruction = result.fallbackInstructions.find(i => i.missing === '#File');
      const codebaseInstruction = result.fallbackInstructions.find(i => i.missing === '#Codebase');
      
      expect(fileInstruction.priority).toBe('high');
      expect(codebaseInstruction.priority).toBe('medium');
    });

    it('should handle empty missing context', async () => {
      const result = await injector.provideFallbackContext([]);
      
      expect(result.canProceedWithoutContext.canProceed).toBe(true);
      expect(result.fallbackInstructions).toEqual([]);
    });

    it('should determine if task can proceed without context', async () => {
      const nonCriticalMissing = ['#Terminal', '#Git Diff'];
      const result = await injector.provideFallbackContext(nonCriticalMissing);
      
      expect(result.canProceedWithoutContext.canProceed).toBe(true);
      
      const criticalMissing = ['#File', '#Codebase'];
      const criticalResult = await injector.provideFallbackContext(criticalMissing);
      
      expect(criticalResult.canProceedWithoutContext.canProceed).toBe(false);
    });
  });

  describe('injectAutomaticContextReferences', () => {
    const sampleAgentContent = `# dev

ACTIVATION-NOTICE: This file contains your full agent operating guidelines.

\`\`\`yaml
agent:
  name: James
  id: dev
  title: Full Stack Developer
\`\`\`

# BMad Developer Agent

I am your BMad Developer agent specialized in full-stack development.`;

    it('should inject context awareness section', () => {
      const result = injector.injectAutomaticContextReferences(sampleAgentContent, 'dev');
      
      expect(result).toContain('## Context Awareness');
      expect(result).toContain('#File');
      expect(result).toContain('#Problems');
      expect(result.length).toBeGreaterThan(sampleAgentContent.length);
    });

    it('should not duplicate existing context section', () => {
      const contentWithContext = sampleAgentContent + '\n\n## Context Awareness\nExisting context section';
      const result = injector.injectAutomaticContextReferences(contentWithContext, 'dev');
      
      const matches = result.match(/## Context Awareness/g);
      expect(matches).toHaveLength(1);
    });

    it('should inject agent-specific context', () => {
      const devResult = injector.injectAutomaticContextReferences(sampleAgentContent, 'dev');
      const qaResult = injector.injectAutomaticContextReferences(sampleAgentContent, 'qa');
      
      expect(devResult).toContain('#File');
      expect(qaResult).toContain('#Terminal');
      expect(devResult).not.toEqual(qaResult);
    });

    it('should handle unknown agent type', () => {
      const result = injector.injectAutomaticContextReferences(sampleAgentContent, 'unknown');
      
      expect(result).toContain('## Context Awareness');
      expect(result).toContain('basic context');
    });

    it('should preserve original content structure', () => {
      const result = injector.injectAutomaticContextReferences(sampleAgentContent, 'dev');
      
      expect(result).toContain('BMad Developer Agent');
      expect(result).toContain('ACTIVATION-NOTICE');
      expect(result).toContain('```yaml');
    });
  });

  describe('contextMapping', () => {
    it('should have comprehensive mapping for common BMad needs', () => {
      const commonNeeds = [
        'current file',
        'project structure',
        'build issues',
        'recent changes',
        'error messages',
        'code repository'
      ];
      
      commonNeeds.forEach(need => {
        expect(injector.contextMapping[need]).toBeDefined();
      });
    });

    it('should map to valid Kiro context providers', () => {
      const validProviders = ['#File', '#Folder', '#Problems', '#Terminal', '#Git Diff', '#Codebase'];
      
      Object.values(injector.contextMapping).forEach(provider => {
        expect(validProviders).toContain(provider);
      });
    });
  });

  describe('error handling', () => {
    it('should handle null input gracefully', () => {
      expect(() => injector.mapBMadContextToKiro(null)).not.toThrow();
      expect(() => injector.injectAutomaticContextReferences(null, 'dev')).not.toThrow();
    });

    it('should handle undefined agent ID', () => {
      const result = injector.injectAutomaticContextReferences(sampleAgentContent, undefined);
      expect(result).toBeDefined();
      expect(result).toContain('## Context Awareness');
    });

    it('should handle malformed content', () => {
      const malformedContent = '# Incomplete content without proper structure';
      const result = injector.injectAutomaticContextReferences(malformedContent, 'dev');
      
      expect(result).toBeDefined();
      expect(result).toContain('## Context Awareness');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex multi-agent context requirements', async () => {
      const complexRequest = {
        agentId: 'dev',
        taskType: 'full-stack-development',
        contextNeeds: [
          'current file',
          'project structure',
          'build issues',
          'recent changes',
          'test results'
        ]
      };
      
      const result = await injector.handleDynamicContextLoading(complexRequest);
      
      expect(result.requiredContext).toContain('#File');
      expect(result.requiredContext).toContain('#Folder');
      expect(result.requiredContext).toContain('#Problems');
      expect(result.requiredContext).toContain('#Git Diff');
      expect(result.requiredContext).toContain('#Terminal');
    });

    it('should optimize context loading for performance', () => {
      const largeContextNeeds = Array(100).fill('current file');
      const result = injector.mapBMadContextToKiro(largeContextNeeds);
      
      // Should deduplicate for performance
      expect(result.mapped.length).toBe(1);
      expect(result.mapped[0]).toBe('#File');
    });
  });
});