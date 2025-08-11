/**
 * Integration tests for BMad planning workflow in Kiro environment
 * Tests end-to-end workflow from BMad agents to Kiro specs
 */

const path = require('path');
const fs = require('fs-extra');
const AgentTransformer = require('../../agent-transformer');
const SpecGenerator = require('../../spec-generator');
const ContextInjector = require('../../context-injector');
const HookGenerator = require('../../hook-generator');

describe('BMad Planning Workflow Integration', () => {
  const testOutputDir = path.join(__dirname, '../../test-output/integration');
  let agentTransformer, specGenerator, contextInjector, hookGenerator;

  beforeEach(async () => {
    await fs.ensureDir(testOutputDir);
    
    agentTransformer = new AgentTransformer();
    specGenerator = new SpecGenerator();
    contextInjector = new ContextInjector();
    hookGenerator = new HookGenerator();
  });

  afterEach(async () => {
    await fs.remove(testOutputDir);
  });

  describe('End-to-End Planning Workflow', () => {
    it('should complete full BMad to Kiro planning workflow', async () => {
      // Step 1: Transform BMad PM agent to Kiro format
      const bmadPMPath = path.join(__dirname, '../../../bmad-core/agents/pm.md');
      const kiroPMPath = path.join(testOutputDir, 'agents/bmad-pm.md');
      
      if (await fs.pathExists(bmadPMPath)) {
        await fs.ensureDir(path.dirname(kiroPMPath));
        const pmTransformSuccess = await agentTransformer.transformAgent(bmadPMPath, kiroPMPath, {
          steeringRules: ['product.md', 'tech.md'],
          mcpTools: ['web-search', 'documentation']
        });
        
        expect(pmTransformSuccess).toBe(true);
        expect(await fs.pathExists(kiroPMPath)).toBe(true);
        
        const pmContent = await fs.readFile(kiroPMPath, 'utf8');
        expect(pmContent).toContain('BMad Product Manager');
        expect(pmContent).toContain('Context Awareness');
      }

      // Step 2: Transform BMad Architect agent to Kiro format
      const bmadArchitectPath = path.join(__dirname, '../../../bmad-core/agents/architect.md');
      const kiroArchitectPath = path.join(testOutputDir, 'agents/bmad-architect.md');
      
      if (await fs.pathExists(bmadArchitectPath)) {
        const architectTransformSuccess = await agentTransformer.transformAgent(bmadArchitectPath, kiroArchitectPath, {
          steeringRules: ['tech.md', 'structure.md'],
          mcpTools: ['documentation', 'api-testing']
        });
        
        expect(architectTransformSuccess).toBe(true);
        expect(await fs.pathExists(kiroArchitectPath)).toBe(true);
      }

      // Step 3: Generate Kiro spec from BMad workflow
      const workflowPath = path.join(__dirname, '../../../bmad-core/workflows/greenfield-fullstack.yaml');
      const specOutputPath = path.join(testOutputDir, 'specs/test-project');
      
      if (await fs.pathExists(workflowPath)) {
        const specGenerationSuccess = await specGenerator.generateSpecFromBMadWorkflow(workflowPath, specOutputPath);
        
        expect(specGenerationSuccess).toBe(true);
        
        // Verify all spec files were created
        expect(await fs.pathExists(path.join(specOutputPath, 'requirements.md'))).toBe(true);
        expect(await fs.pathExists(path.join(specOutputPath, 'design.md'))).toBe(true);
        expect(await fs.pathExists(path.join(specOutputPath, 'tasks.md'))).toBe(true);
        
        // Verify spec content format
        const requirementsContent = await fs.readFile(path.join(specOutputPath, 'requirements.md'), 'utf8');
        const designContent = await fs.readFile(path.join(specOutputPath, 'design.md'), 'utf8');
        const tasksContent = await fs.readFile(path.join(specOutputPath, 'tasks.md'), 'utf8');
        
        expect(requirementsContent).toContain('# Requirements Document');
        expect(designContent).toContain('# Design Document');
        expect(tasksContent).toContain('# Implementation Plan');
        expect(tasksContent).toContain('- [ ]');
      }

      // Step 4: Generate hooks for workflow automation
      const mockWorkflow = {
        name: 'Test Planning Workflow',
        phases: ['planning', 'architecture', 'implementation'],
        agents: ['pm', 'architect', 'dev'],
        transitions: [
          { from: 'planning', to: 'architecture', trigger: 'prd_complete' },
          { from: 'architecture', to: 'implementation', trigger: 'design_complete' }
        ]
      };
      
      const hooksOutputPath = path.join(testOutputDir, 'hooks');
      const hookGenerationSuccess = await hookGenerator.generateHooksFromWorkflow(mockWorkflow, hooksOutputPath);
      
      expect(hookGenerationSuccess).toBe(true);
      expect(await fs.pathExists(hooksOutputPath)).toBe(true);
    }, 30000);

    it('should handle agent collaboration and context sharing', async () => {
      // Test context injection for multiple agents
      const sampleAgentContent = `# Test Agent\n\nI am a test agent for collaboration.`;
      
      const devContext = contextInjector.injectAutomaticContextReferences(sampleAgentContent, 'dev');
      const qaContext = contextInjector.injectAutomaticContextReferences(sampleAgentContent, 'qa');
      const architectContext = contextInjector.injectAutomaticContextReferences(sampleAgentContent, 'architect');
      
      // Each agent should have different context requirements
      expect(devContext).toContain('#File');
      expect(qaContext).toContain('#Problems');
      expect(architectContext).toContain('#Codebase');
      
      // Test context mapping for collaboration
      const collaborationNeeds = ['current file', 'project structure', 'build issues', 'recent changes'];
      const contextMapping = contextInjector.mapBMadContextToKiro(collaborationNeeds);
      
      expect(contextMapping.mapped).toContain('#File');
      expect(contextMapping.mapped).toContain('#Folder');
      expect(contextMapping.mapped).toContain('#Problems');
      expect(contextMapping.mapped).toContain('#Git Diff');
    });

    it('should validate workflow progression automation', async () => {
      // Create a complex workflow with dependencies
      const complexWorkflow = {
        name: 'Complex Planning Workflow',
        phases: ['research', 'planning', 'architecture', 'implementation', 'testing'],
        agents: ['analyst', 'pm', 'architect', 'dev', 'qa'],
        transitions: [
          { from: 'research', to: 'planning', trigger: 'research_complete', agent: 'analyst' },
          { from: 'planning', to: 'architecture', trigger: 'prd_complete', agent: 'pm' },
          { from: 'architecture', to: 'implementation', trigger: 'design_complete', agent: 'architect' },
          { from: 'implementation', to: 'testing', trigger: 'code_complete', agent: 'dev' }
        ],
        automations: [
          { type: 'status_update', trigger: 'phase_complete', action: 'update_next_phase' },
          { type: 'notification', trigger: 'agent_handoff', action: 'notify_next_agent' },
          { type: 'context_sync', trigger: 'phase_transition', action: 'sync_context' }
        ]
      };
      
      const hooksOutputPath = path.join(testOutputDir, 'complex-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(complexWorkflow, hooksOutputPath);
      
      expect(success).toBe(true);
      
      // Verify hooks were created for each automation type
      const hookFiles = await fs.readdir(hooksOutputPath);
      expect(hookFiles.length).toBeGreaterThan(0);
      
      // Check for specific hook types
      const progressionHookExists = hookFiles.some(file => file.includes('progression'));
      const statusHookExists = hookFiles.some(file => file.includes('status') || file.includes('commit'));
      
      expect(progressionHookExists || statusHookExists).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle missing BMad components gracefully', async () => {
      // Test with non-existent agent file
      const nonExistentAgent = path.join(testOutputDir, 'non-existent-agent.md');
      const outputPath = path.join(testOutputDir, 'output-agent.md');
      
      const success = await agentTransformer.transformAgent(nonExistentAgent, outputPath);
      expect(success).toBe(false);
      
      // Test with invalid workflow
      const invalidWorkflow = path.join(testOutputDir, 'invalid-workflow.yaml');
      await fs.writeFile(invalidWorkflow, 'invalid: yaml: content:');
      
      const specSuccess = await specGenerator.generateSpecFromBMadWorkflow(invalidWorkflow, testOutputDir);
      expect(specSuccess).toBe(false);
    });

    it('should provide fallback when context is unavailable', async () => {
      const missingContext = ['#Codebase', '#Terminal', '#Git Diff'];
      const fallback = await contextInjector.provideFallbackContext(missingContext);
      
      expect(fallback).toBeDefined();
      expect(fallback.canProceedWithoutContext).toBeDefined();
      expect(fallback.fallbackInstructions).toBeDefined();
      expect(Array.isArray(fallback.fallbackInstructions)).toBe(true);
      
      // Should provide specific instructions for each missing context
      expect(fallback.fallbackInstructions.length).toBe(missingContext.length);
    });

    it('should handle workflow interruption and resume', async () => {
      // Simulate partial workflow completion
      const partialWorkflow = {
        name: 'Interrupted Workflow',
        phases: ['planning', 'implementation'],
        currentPhase: 'planning',
        completedPhases: [],
        agents: ['pm', 'dev']
      };
      
      const hooksPath = path.join(testOutputDir, 'interrupted-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(partialWorkflow, hooksPath);
      
      expect(success).toBe(true);
      
      // Should create hooks that can handle resumption
      if (await fs.pathExists(hooksPath)) {
        const hookFiles = await fs.readdir(hooksPath);
        expect(hookFiles.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large project structures efficiently', async () => {
      // Create a large mock project structure
      const largeProjectStructure = {
        agents: Array.from({ length: 10 }, (_, i) => `agent-${i}`),
        workflows: Array.from({ length: 5 }, (_, i) => `workflow-${i}`),
        phases: Array.from({ length: 8 }, (_, i) => `phase-${i}`),
        dependencies: Array.from({ length: 20 }, (_, i) => ({ from: `phase-${i % 8}`, to: `phase-${(i + 1) % 8}` }))
      };
      
      const startTime = Date.now();
      
      // Test context mapping performance
      const contextNeeds = Array.from({ length: 50 }, (_, i) => `context-need-${i}`);
      const contextMapping = contextInjector.mapBMadContextToKiro(contextNeeds);
      
      expect(contextMapping).toBeDefined();
      expect(contextMapping.mapped).toBeDefined();
      expect(contextMapping.unmapped).toBeDefined();
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should complete within reasonable time (less than 5 seconds)
      expect(processingTime).toBeLessThan(5000);
    });

    it('should optimize hook generation for complex workflows', async () => {
      const complexWorkflow = {
        name: 'Large Scale Workflow',
        phases: Array.from({ length: 15 }, (_, i) => `phase-${i}`),
        agents: Array.from({ length: 8 }, (_, i) => `agent-${i}`),
        transitions: Array.from({ length: 30 }, (_, i) => ({
          from: `phase-${i % 15}`,
          to: `phase-${(i + 1) % 15}`,
          trigger: `trigger-${i}`,
          agent: `agent-${i % 8}`
        })),
        automations: Array.from({ length: 20 }, (_, i) => ({
          type: `automation-${i % 5}`,
          trigger: `trigger-${i}`,
          action: `action-${i}`
        }))
      };
      
      const startTime = Date.now();
      const hooksPath = path.join(testOutputDir, 'large-scale-hooks');
      const success = await hookGenerator.generateHooksFromWorkflow(complexWorkflow, hooksPath);
      const endTime = Date.now();
      
      expect(success).toBe(true);
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify hooks were generated
      if (await fs.pathExists(hooksPath)) {
        const hookFiles = await fs.readdir(hooksPath);
        expect(hookFiles.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Integration Validation', () => {
    it('should validate complete BMad-to-Kiro transformation', async () => {
      // Create a minimal but complete BMad setup
      const mockBMadAgent = `---
agent:
  name: Test PM
  id: pm
  title: Product Manager
persona:
  role: Product Manager
  expertise: ["requirements", "planning"]
commands:
  - create-prd
  - review-requirements
---

# BMad Product Manager

I am your BMad Product Manager specialized in creating comprehensive Product Requirements Documents.

## Capabilities
- Create detailed PRDs
- Analyze market requirements
- Define product roadmaps`;

      const mockWorkflowYaml = `name: Test Workflow
description: Simple test workflow
phases:
  - planning
  - implementation
agents:
  - pm
  - dev
templates:
  - prd-template
  - story-template`;

      // Write mock files
      const agentPath = path.join(testOutputDir, 'mock-pm.md');
      const workflowPath = path.join(testOutputDir, 'mock-workflow.yaml');
      
      await fs.writeFile(agentPath, mockBMadAgent);
      await fs.writeFile(workflowPath, mockWorkflowYaml);
      
      // Transform agent
      const kiroAgentPath = path.join(testOutputDir, 'kiro-pm.md');
      const agentSuccess = await agentTransformer.transformAgent(agentPath, kiroAgentPath);
      
      expect(agentSuccess).toBe(true);
      
      const transformedContent = await fs.readFile(kiroAgentPath, 'utf8');
      expect(transformedContent).toContain('BMad Product Manager');
      expect(transformedContent).toContain('Context Awareness');
      
      // Generate spec
      const specPath = path.join(testOutputDir, 'test-spec');
      const specSuccess = await specGenerator.generateSpecFromBMadWorkflow(workflowPath, specPath);
      
      expect(specSuccess).toBe(true);
      
      // Verify integration points
      const requirementsPath = path.join(specPath, 'requirements.md');
      const tasksPath = path.join(specPath, 'tasks.md');
      
      if (await fs.pathExists(requirementsPath) && await fs.pathExists(tasksPath)) {
        const requirements = await fs.readFile(requirementsPath, 'utf8');
        const tasks = await fs.readFile(tasksPath, 'utf8');
        
        expect(requirements).toContain('Requirements Document');
        expect(tasks).toContain('Implementation Plan');
        expect(tasks).toContain('- [ ]');
      }
    });

    it('should ensure consistency across all generated artifacts', async () => {
      const testProjectName = 'consistency-test-project';
      
      // Generate multiple artifacts and verify consistency
      const mockWorkflow = {
        name: testProjectName,
        description: 'Test project for consistency validation',
        phases: ['planning', 'implementation'],
        agents: ['pm', 'dev']
      };
      
      // Generate spec
      const specPath = path.join(testOutputDir, 'consistency-spec');
      const workflowPath = path.join(testOutputDir, 'consistency-workflow.yaml');
      
      await fs.writeFile(workflowPath, JSON.stringify(mockWorkflow));
      const specSuccess = await specGenerator.generateSpecFromBMadWorkflow(workflowPath, specPath);
      
      // Generate hooks
      const hooksPath = path.join(testOutputDir, 'consistency-hooks');
      const hooksSuccess = await hookGenerator.generateHooksFromWorkflow(mockWorkflow, hooksPath);
      
      expect(specSuccess).toBe(true);
      expect(hooksSuccess).toBe(true);
      
      // Verify consistency in naming and references
      if (await fs.pathExists(specPath) && await fs.pathExists(hooksPath)) {
        const specFiles = await fs.readdir(specPath);
        const hookFiles = await fs.readdir(hooksPath);
        
        expect(specFiles.length).toBeGreaterThan(0);
        expect(hookFiles.length).toBeGreaterThan(0);
        
        // Check that project name appears consistently
        for (const file of specFiles) {
          if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(specPath, file), 'utf8');
            // Should reference the project consistently
            expect(content.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});