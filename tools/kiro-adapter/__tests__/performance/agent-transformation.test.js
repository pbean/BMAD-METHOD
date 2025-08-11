/**
 * Performance tests for agent transformation and spec generation
 * Tests the scalability and efficiency of BMad to Kiro transformations
 */

const path = require('path');
const fs = require('fs-extra');
const AgentTransformer = require('../../agent-transformer');
const SpecGenerator = require('../../spec-generator');

describe('Agent Transformation Performance', () => {
  const testOutputDir = path.join(__dirname, '../../test-output/performance');
  let agentTransformer, specGenerator;

  beforeEach(async () => {
    await fs.ensureDir(testOutputDir);
    agentTransformer = new AgentTransformer();
    specGenerator = new SpecGenerator();
  });

  afterEach(async () => {
    await fs.remove(testOutputDir);
  });

  describe('Agent Transformation Scalability', () => {
    it('should transform multiple agents efficiently', async () => {
      // Create multiple mock BMad agents
      const agents = Array.from({ length: 20 }, (_, i) => ({
        id: `agent-${i}`,
        content: `---
agent:
  name: Test Agent ${i}
  id: agent-${i}
  title: Test Agent ${i}
persona:
  role: Test Role ${i}
  expertise: ["skill-${i}-1", "skill-${i}-2", "skill-${i}-3"]
commands:
  - command-${i}-1
  - command-${i}-2
---

# BMad Test Agent ${i}

I am test agent ${i} with specialized capabilities in testing and validation.

## Capabilities
${Array.from({ length: 10 }, (_, j) => `- Capability ${i}-${j}`).join('\n')}

## Instructions
${Array.from({ length: 20 }, (_, j) => `Step ${j + 1}: Perform action ${i}-${j}`).join('\n')}
`
      }));

      // Write agent files
      const agentPaths = [];
      for (const agent of agents) {
        const agentPath = path.join(testOutputDir, `${agent.id}.md`);
        await fs.writeFile(agentPath, agent.content);
        agentPaths.push(agentPath);
      }

      const startTime = process.hrtime.bigint();

      // Transform all agents
      const transformationPromises = agentPaths.map(async (agentPath, index) => {
        const outputPath = path.join(testOutputDir, `kiro-agent-${index}.md`);
        return await agentTransformer.transformAgent(agentPath, outputPath, {
          steeringRules: ['product.md', 'tech.md'],
          mcpTools: ['web-search', 'documentation']
        });
      });

      const results = await Promise.all(transformationPromises);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(20);
      results.forEach(result => expect(result).toBe(true));

      // Should complete within 5 seconds for 20 agents
      expect(executionTime).toBeLessThan(5000);
    });

    it('should handle large agent content efficiently', async () => {
      // Create a very large agent file
      const largeAgentContent = `---
agent:
  name: Large Test Agent
  id: large-agent
  title: Large Test Agent
persona:
  role: Comprehensive Agent
  expertise: ${JSON.stringify(Array.from({ length: 100 }, (_, i) => `expertise-${i}`))}
commands: ${JSON.stringify(Array.from({ length: 50 }, (_, i) => `command-${i}`))}
---

# BMad Large Test Agent

I am a comprehensive test agent with extensive capabilities.

${Array.from({ length: 1000 }, (_, i) => `
## Section ${i}

This is section ${i} with detailed information about capability ${i}.

### Subsection ${i}.1
${Array.from({ length: 10 }, (_, j) => `- Point ${i}-${j}: Detailed explanation of point ${j} in section ${i}`).join('\n')}

### Subsection ${i}.2
${Array.from({ length: 5 }, (_, j) => `Step ${j + 1}: Execute action ${i}-${j} with parameters and validation`).join('\n')}
`).join('\n')}
`;

      const largeAgentPath = path.join(testOutputDir, 'large-agent.md');
      const outputPath = path.join(testOutputDir, 'kiro-large-agent.md');

      await fs.writeFile(largeAgentPath, largeAgentContent);

      const startTime = process.hrtime.bigint();
      const success = await agentTransformer.transformAgent(largeAgentPath, outputPath);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000;

      expect(success).toBe(true);
      
      // Should complete within 1 second for large agent
      expect(executionTime).toBeLessThan(1000);

      // Verify output file was created and is larger than input
      const outputContent = await fs.readFile(outputPath, 'utf8');
      expect(outputContent.length).toBeGreaterThan(largeAgentContent.length);
      expect(outputContent).toContain('Context Awareness');
    });

    it('should optimize memory usage during batch transformations', async () => {
      const initialMemory = process.memoryUsage();

      // Create many agents for batch processing
      const batchSize = 50;
      const agents = Array.from({ length: batchSize }, (_, i) => ({
        id: `batch-agent-${i}`,
        content: `---
agent:
  name: Batch Agent ${i}
  id: batch-agent-${i}
---

# BMad Batch Agent ${i}

I am batch agent ${i} for memory testing.

${Array.from({ length: 100 }, (_, j) => `## Section ${j}\nContent for section ${j} in agent ${i}`).join('\n')}
`
      }));

      // Process agents in batches to test memory management
      const batchResults = [];
      const batchSizeLimit = 10;

      for (let i = 0; i < agents.length; i += batchSizeLimit) {
        const batch = agents.slice(i, i + batchSizeLimit);
        
        const batchPromises = batch.map(async (agent, index) => {
          const agentPath = path.join(testOutputDir, `${agent.id}.md`);
          const outputPath = path.join(testOutputDir, `kiro-${agent.id}.md`);
          
          await fs.writeFile(agentPath, agent.content);
          return await agentTransformer.transformAgent(agentPath, outputPath);
        });

        const batchResult = await Promise.all(batchPromises);
        batchResults.push(...batchResult);

        // Force garbage collection between batches if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(batchResults).toHaveLength(batchSize);
      batchResults.forEach(result => expect(result).toBe(true));

      // Memory increase should be reasonable (less than 200MB for 50 agents)
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024);
    });

    it('should maintain performance with complex agent configurations', async () => {
      const complexAgentConfigurations = Array.from({ length: 10 }, (_, i) => ({
        id: `complex-agent-${i}`,
        steeringRules: Array.from({ length: 10 }, (_, j) => `rule-${i}-${j}.md`),
        mcpTools: Array.from({ length: 15 }, (_, j) => `tool-${i}-${j}`),
        contextProviders: ['#File', '#Folder', '#Problems', '#Terminal', '#Git Diff', '#Codebase'],
        customOptions: {
          preserveOriginal: true,
          addKiroMetadata: true,
          validateOutput: true,
          customTransformations: Array.from({ length: 5 }, (_, j) => `transform-${i}-${j}`)
        }
      }));

      const mockAgentContent = `---
agent:
  name: Complex Agent
  id: complex-agent
---

# BMad Complex Agent

I am a complex agent for performance testing.
`;

      const startTime = process.hrtime.bigint();

      const transformationResults = [];
      for (const config of complexAgentConfigurations) {
        const agentPath = path.join(testOutputDir, `${config.id}.md`);
        const outputPath = path.join(testOutputDir, `kiro-${config.id}.md`);
        
        await fs.writeFile(agentPath, mockAgentContent.replace('complex-agent', config.id));
        
        const success = await agentTransformer.transformAgent(agentPath, outputPath, {
          steeringRules: config.steeringRules,
          mcpTools: config.mcpTools,
          ...config.customOptions
        });
        
        transformationResults.push(success);
      }

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(transformationResults).toHaveLength(10);
      transformationResults.forEach(result => expect(result).toBe(true));

      // Should complete within 3 seconds for complex configurations
      expect(executionTime).toBeLessThan(3000);
    });
  });

  describe('Spec Generation Performance', () => {
    it('should generate specs from large workflows efficiently', async () => {
      const largeWorkflow = {
        name: 'Large Performance Test Workflow',
        description: 'A comprehensive workflow for performance testing',
        phases: Array.from({ length: 20 }, (_, i) => `phase-${i}`),
        agents: Array.from({ length: 15 }, (_, i) => `agent-${i}`),
        templates: Array.from({ length: 10 }, (_, i) => `template-${i}`),
        tasks: Array.from({ length: 50 }, (_, i) => `task-${i}`),
        dependencies: Array.from({ length: 100 }, (_, i) => ({
          from: `task-${i % 50}`,
          to: `task-${(i + 1) % 50}`,
          type: 'dependency'
        })),
        metadata: {
          complexity: 'high',
          estimatedDuration: '6 months',
          resources: Array.from({ length: 30 }, (_, i) => `resource-${i}`),
          constraints: Array.from({ length: 20 }, (_, i) => `constraint-${i}`)
        }
      };

      const workflowPath = path.join(testOutputDir, 'large-workflow.yaml');
      const specOutputPath = path.join(testOutputDir, 'large-spec');

      await fs.writeFile(workflowPath, JSON.stringify(largeWorkflow, null, 2));

      const startTime = process.hrtime.bigint();
      const success = await specGenerator.generateSpecFromBMadWorkflow(workflowPath, specOutputPath);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000;

      expect(success).toBe(true);
      
      // Should complete within 2 seconds for large workflow
      expect(executionTime).toBeLessThan(2000);

      // Verify all spec files were created
      expect(await fs.pathExists(path.join(specOutputPath, 'requirements.md'))).toBe(true);
      expect(await fs.pathExists(path.join(specOutputPath, 'design.md'))).toBe(true);
      expect(await fs.pathExists(path.join(specOutputPath, 'tasks.md'))).toBe(true);
    });

    it('should handle concurrent spec generation efficiently', async () => {
      const workflows = Array.from({ length: 10 }, (_, i) => ({
        name: `Concurrent Workflow ${i}`,
        phases: [`phase-${i}-1`, `phase-${i}-2`, `phase-${i}-3`],
        agents: [`agent-${i}-1`, `agent-${i}-2`],
        tasks: Array.from({ length: 10 }, (_, j) => `task-${i}-${j}`)
      }));

      const startTime = process.hrtime.bigint();

      const specPromises = workflows.map(async (workflow, index) => {
        const workflowPath = path.join(testOutputDir, `workflow-${index}.yaml`);
        const specOutputPath = path.join(testOutputDir, `spec-${index}`);
        
        await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
        return await specGenerator.generateSpecFromBMadWorkflow(workflowPath, specOutputPath);
      });

      const results = await Promise.all(specPromises);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(10);
      results.forEach(result => expect(result).toBe(true));

      // Should complete within 3 seconds for 10 concurrent specs
      expect(executionTime).toBeLessThan(3000);
    });

    it('should optimize story-to-task conversion performance', () => {
      const largeStorySet = Array.from({ length: 200 }, (_, i) => ({
        title: `Story ${i}`,
        userStory: `As a user ${i}, I want feature ${i}, so that I can achieve goal ${i}`,
        description: `Detailed description for story ${i} with comprehensive requirements and acceptance criteria`,
        acceptanceCriteria: Array.from({ length: 5 }, (_, j) => `Acceptance criterion ${i}-${j}`),
        implementationTasks: Array.from({ length: 8 }, (_, j) => ({
          title: `Task ${i}-${j}`,
          description: `Implementation task ${j} for story ${i}`,
          acceptanceCriteria: j + 1,
          estimatedHours: (j + 1) * 2
        })),
        type: ['frontend', 'backend', 'fullstack'][i % 3],
        phase: ['planning', 'implementation', 'testing'][i % 3],
        epicNumber: Math.floor(i / 10) + 1,
        storyNumber: i + 1,
        dependencies: i > 0 ? [`Story ${i - 1}`] : [],
        requirementRefs: Array.from({ length: 3 }, (_, j) => `${Math.floor(i / 10) + 1}.${j + 1}`)
      }));

      const startTime = process.hrtime.bigint();
      const tasks = specGenerator.createTasksFromStories(largeStorySet);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000;

      expect(tasks).toBeDefined();
      expect(tasks.length).toBeGreaterThan(1000); // Should generate substantial content
      expect(tasks).toContain('# Implementation Plan');
      expect(tasks).toContain('- [ ]');

      // Should complete within 500ms for 200 stories
      expect(executionTime).toBeLessThan(500);
    });

    it('should handle complex template processing efficiently', () => {
      const complexTemplates = {
        prd: {
          name: 'Complex PRD Template',
          sections: Array.from({ length: 20 }, (_, i) => ({
            name: `Section ${i}`,
            content: Array.from({ length: 10 }, (_, j) => `Content ${i}-${j}`).join('\n'),
            subsections: Array.from({ length: 5 }, (_, j) => ({
              name: `Subsection ${i}-${j}`,
              requirements: Array.from({ length: 3 }, (_, k) => `Requirement ${i}-${j}-${k}`)
            }))
          })),
          metadata: {
            complexity: 'high',
            estimatedPages: 50,
            reviewers: Array.from({ length: 10 }, (_, i) => `reviewer-${i}`)
          }
        },
        architecture: {
          name: 'Complex Architecture Template',
          components: Array.from({ length: 30 }, (_, i) => ({
            name: `Component ${i}`,
            type: ['service', 'database', 'ui', 'api'][i % 4],
            dependencies: Array.from({ length: Math.min(i, 5) }, (_, j) => `Component ${j}`),
            interfaces: Array.from({ length: 3 }, (_, j) => `Interface ${i}-${j}`),
            configuration: Object.fromEntries(
              Array.from({ length: 10 }, (_, j) => [`config-${j}`, `value-${i}-${j}`])
            )
          })),
          dataModels: Array.from({ length: 15 }, (_, i) => ({
            name: `Model ${i}`,
            fields: Array.from({ length: 8 }, (_, j) => `field-${i}-${j}`),
            relationships: Array.from({ length: 3 }, (_, j) => `relationship-${i}-${j}`)
          }))
        }
      };

      const startTime = process.hrtime.bigint();
      
      const requirements = specGenerator.createRequirementsFromPRD(complexTemplates.prd);
      const design = specGenerator.createDesignFromArchitecture(complexTemplates.architecture);
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(requirements).toBeDefined();
      expect(requirements.length).toBeGreaterThan(1000);
      expect(design).toBeDefined();
      expect(design.length).toBeGreaterThan(1000);

      // Should complete within 300ms for complex templates
      expect(executionTime).toBeLessThan(300);
    });
  });

  describe('End-to-End Performance', () => {
    it('should complete full transformation pipeline efficiently', async () => {
      // Create a complete BMad setup
      const bmadAgents = ['pm', 'architect', 'dev', 'qa'];
      const agentContents = bmadAgents.map(agentType => `---
agent:
  name: BMad ${agentType.toUpperCase()}
  id: ${agentType}
---

# BMad ${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent

I am the BMad ${agentType} agent with specialized capabilities.

${Array.from({ length: 20 }, (_, i) => `## Capability ${i + 1}\nDetailed description of capability ${i + 1}`).join('\n')}
`);

      const workflow = {
        name: 'Complete Pipeline Test',
        phases: ['planning', 'architecture', 'implementation', 'testing'],
        agents: bmadAgents,
        stories: Array.from({ length: 20 }, (_, i) => ({
          title: `Story ${i + 1}`,
          phase: ['planning', 'implementation', 'testing'][i % 3],
          agent: bmadAgents[i % 4]
        }))
      };

      const startTime = process.hrtime.bigint();

      // Step 1: Transform all agents
      const agentTransformations = [];
      for (let i = 0; i < bmadAgents.length; i++) {
        const agentPath = path.join(testOutputDir, `${bmadAgents[i]}.md`);
        const outputPath = path.join(testOutputDir, `kiro-${bmadAgents[i]}.md`);
        
        await fs.writeFile(agentPath, agentContents[i]);
        const success = await agentTransformer.transformAgent(agentPath, outputPath);
        agentTransformations.push(success);
      }

      // Step 2: Generate spec from workflow
      const workflowPath = path.join(testOutputDir, 'pipeline-workflow.yaml');
      const specOutputPath = path.join(testOutputDir, 'pipeline-spec');
      
      await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
      const specSuccess = await specGenerator.generateSpecFromBMadWorkflow(workflowPath, specOutputPath);

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(agentTransformations.every(result => result === true)).toBe(true);
      expect(specSuccess).toBe(true);

      // Complete pipeline should finish within 5 seconds
      expect(executionTime).toBeLessThan(5000);

      // Verify all outputs were created
      for (const agentType of bmadAgents) {
        const outputPath = path.join(testOutputDir, `kiro-${agentType}.md`);
        expect(await fs.pathExists(outputPath)).toBe(true);
      }

      expect(await fs.pathExists(path.join(specOutputPath, 'requirements.md'))).toBe(true);
      expect(await fs.pathExists(path.join(specOutputPath, 'design.md'))).toBe(true);
      expect(await fs.pathExists(path.join(specOutputPath, 'tasks.md'))).toBe(true);
    });

    it('should scale linearly with project size', async () => {
      const projectSizes = [
        { agents: 2, stories: 5, name: 'small' },
        { agents: 5, stories: 15, name: 'medium' },
        { agents: 10, stories: 30, name: 'large' }
      ];

      const executionTimes = [];

      for (const size of projectSizes) {
        const startTime = process.hrtime.bigint();

        // Create agents
        const agentPromises = Array.from({ length: size.agents }, async (_, i) => {
          const agentContent = `---
agent:
  name: Agent ${i}
  id: agent-${i}
---

# Agent ${i}

Test agent ${i} for scaling test.
`;
          const agentPath = path.join(testOutputDir, `${size.name}-agent-${i}.md`);
          const outputPath = path.join(testOutputDir, `${size.name}-kiro-agent-${i}.md`);
          
          await fs.writeFile(agentPath, agentContent);
          return await agentTransformer.transformAgent(agentPath, outputPath);
        });

        // Create workflow
        const workflow = {
          name: `${size.name} Scaling Test`,
          agents: Array.from({ length: size.agents }, (_, i) => `agent-${i}`),
          stories: Array.from({ length: size.stories }, (_, i) => ({
            title: `Story ${i}`,
            agent: `agent-${i % size.agents}`
          }))
        };

        const workflowPath = path.join(testOutputDir, `${size.name}-workflow.yaml`);
        const specOutputPath = path.join(testOutputDir, `${size.name}-spec`);
        
        await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));

        // Execute transformations
        const agentResults = await Promise.all(agentPromises);
        const specResult = await specGenerator.generateSpecFromBMadWorkflow(workflowPath, specOutputPath);

        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;

        executionTimes.push(executionTime);

        expect(agentResults.every(result => result === true)).toBe(true);
        expect(specResult).toBe(true);
      }

      // Check that scaling is roughly linear
      const smallToMediumRatio = executionTimes[1] / executionTimes[0];
      const mediumToLargeRatio = executionTimes[2] / executionTimes[1];

      // Ratios should be similar (within 2x of each other) for linear scaling
      expect(Math.max(smallToMediumRatio, mediumToLargeRatio) / Math.min(smallToMediumRatio, mediumToLargeRatio)).toBeLessThan(2);
    });
  });
});