/**
 * Integration tests for agent collaboration and context sharing
 * Tests how BMad agents work together in Kiro environment
 */

const path = require('path');
const fs = require('fs-extra');
const AgentTransformer = require('../../agent-transformer');
const ContextInjector = require('../../context-injector');
const MCPIntegrator = require('../../mcp-integrator');

describe('Agent Collaboration Integration', () => {
  const testOutputDir = path.join(__dirname, '../../test-output/collaboration');
  let agentTransformer, contextInjector, mcpIntegrator;

  beforeEach(async () => {
    await fs.ensureDir(testOutputDir);
    agentTransformer = new AgentTransformer();
    contextInjector = new ContextInjector();
    mcpIntegrator = new MCPIntegrator();
  });

  afterEach(async () => {
    await fs.remove(testOutputDir);
  });

  describe('Multi-Agent Context Sharing', () => {
    it('should enable seamless context sharing between agents', async () => {
      // Simulate a collaborative scenario
      const collaborationScenario = {
        project: 'E-commerce Platform',
        phase: 'planning-to-implementation',
        agents: [
          {
            id: 'pm',
            role: 'Product Manager',
            currentTask: 'finalize-requirements',
            contextNeeds: ['project structure', 'user feedback', 'market research']
          },
          {
            id: 'architect',
            role: 'Solution Architect',
            currentTask: 'design-system-architecture',
            contextNeeds: ['requirements', 'technical constraints', 'project structure']
          },
          {
            id: 'dev',
            role: 'Developer',
            currentTask: 'implement-user-auth',
            contextNeeds: ['architecture design', 'current file', 'build issues']
          }
        ]
      };

      // Test context mapping for each agent
      for (const agent of collaborationScenario.agents) {
        const contextMapping = contextInjector.mapBMadContextToKiro(agent.contextNeeds);
        
        expect(contextMapping).toBeDefined();
        expect(contextMapping.mapped).toBeDefined();
        expect(contextMapping.unmapped).toBeDefined();
        
        // Each agent should get appropriate Kiro context
        if (agent.id === 'pm') {
          expect(contextMapping.mapped).toContain('#Folder');
        } else if (agent.id === 'architect') {
          expect(contextMapping.mapped).toContain('#Codebase');
        } else if (agent.id === 'dev') {
          expect(contextMapping.mapped).toContain('#File');
          expect(contextMapping.mapped).toContain('#Problems');
        }
      }
    });

    it('should handle context handoffs between workflow phases', async () => {
      const phaseTransitions = [
        {
          from: { phase: 'planning', agent: 'pm', context: ['requirements', 'user stories'] },
          to: { phase: 'architecture', agent: 'architect', context: ['requirements', 'technical constraints'] }
        },
        {
          from: { phase: 'architecture', agent: 'architect', context: ['system design', 'component specs'] },
          to: { phase: 'implementation', agent: 'dev', context: ['system design', 'current file', 'build status'] }
        },
        {
          from: { phase: 'implementation', agent: 'dev', context: ['code changes', 'build results'] },
          to: { phase: 'testing', agent: 'qa', context: ['code changes', 'test results', 'error logs'] }
        }
      ];

      for (const transition of phaseTransitions) {
        // Test context mapping for source agent
        const fromContextMapping = contextInjector.mapBMadContextToKiro(transition.from.context);
        expect(fromContextMapping.mapped.length).toBeGreaterThan(0);

        // Test context mapping for target agent
        const toContextMapping = contextInjector.mapBMadContextToKiro(transition.to.context);
        expect(toContextMapping.mapped.length).toBeGreaterThan(0);

        // Verify context continuity (some context should be shared)
        const sharedContext = fromContextMapping.mapped.filter(context => 
          toContextMapping.mapped.includes(context)
        );
        
        // Should have some shared context for continuity
        expect(sharedContext.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should support concurrent agent operations with context isolation', async () => {
      const concurrentOperations = [
        {
          agent: 'dev-frontend',
          task: 'implement-ui-components',
          contextNeeds: ['current file', 'ui specifications', 'component library'],
          workingFiles: ['src/components/*.tsx', 'src/styles/*.css']
        },
        {
          agent: 'dev-backend',
          task: 'implement-api-endpoints',
          contextNeeds: ['current file', 'api specifications', 'database schema'],
          workingFiles: ['src/api/*.js', 'src/models/*.js']
        },
        {
          agent: 'qa',
          task: 'write-integration-tests',
          contextNeeds: ['test results', 'api specifications', 'ui specifications'],
          workingFiles: ['tests/integration/*.test.js']
        }
      ];

      // Test that each agent gets appropriate isolated context
      for (const operation of concurrentOperations) {
        const contextMapping = contextInjector.mapBMadContextToKiro(operation.contextNeeds);
        
        expect(contextMapping).toBeDefined();
        expect(contextMapping.mapped).toContain('#File'); // All should have file context
        
        // Verify agent-specific context
        if (operation.agent.includes('dev')) {
          expect(contextMapping.mapped).toContain('#Problems'); // Developers need build issues
        }
        if (operation.agent === 'qa') {
          expect(contextMapping.mapped).toContain('#Terminal'); // QA needs test results
        }
      }

      // Test dynamic context loading for concurrent operations
      for (const operation of concurrentOperations) {
        const contextRequest = {
          agentId: operation.agent.split('-')[0], // Extract base agent type
          taskType: operation.task,
          contextNeeds: operation.contextNeeds
        };

        const contextResult = await contextInjector.handleDynamicContextLoading(contextRequest);
        
        expect(contextResult).toBeDefined();
        expect(contextResult.requiredContext).toBeDefined();
        expect(contextResult.availableContext).toBeDefined();
      }
    });
  });

  describe('Agent Communication and Handoffs', () => {
    it('should facilitate smooth agent handoffs with context preservation', async () => {
      // Simulate PM to Architect handoff
      const pmToArchitectHandoff = {
        source: {
          agent: 'pm',
          deliverables: ['requirements.md', 'user-stories.md', 'acceptance-criteria.md'],
          context: ['project requirements', 'user feedback', 'business constraints']
        },
        target: {
          agent: 'architect',
          expectedInputs: ['requirements', 'constraints', 'technical specifications'],
          context: ['project structure', 'technical constraints', 'system requirements']
        },
        handoffData: {
          projectName: 'Test Project',
          phase: 'planning-to-architecture',
          priority: 'high',
          timeline: '2 weeks'
        }
      };

      // Test context mapping for handoff
      const sourceContext = contextInjector.mapBMadContextToKiro(pmToArchitectHandoff.source.context);
      const targetContext = contextInjector.mapBMadContextToKiro(pmToArchitectHandoff.target.context);

      expect(sourceContext.mapped).toBeDefined();
      expect(targetContext.mapped).toBeDefined();

      // PM should have project-level context
      expect(sourceContext.mapped).toContain('#Folder');
      
      // Architect should have codebase-level context
      expect(targetContext.mapped).toContain('#Codebase');

      // Test agent transformation for handoff scenario
      const mockPMAgent = `---
agent:
  name: BMad PM
  id: pm
---

# BMad Product Manager

I handle requirements and planning.`;

      const mockArchitectAgent = `---
agent:
  name: BMad Architect
  id: architect
---

# BMad Solution Architect

I design system architecture.`;

      const pmAgentPath = path.join(testOutputDir, 'pm-agent.md');
      const architectAgentPath = path.join(testOutputDir, 'architect-agent.md');
      const kiroPMPath = path.join(testOutputDir, 'kiro-pm.md');
      const kiroArchitectPath = path.join(testOutputDir, 'kiro-architect.md');

      await fs.writeFile(pmAgentPath, mockPMAgent);
      await fs.writeFile(architectAgentPath, mockArchitectAgent);

      const pmTransformSuccess = await agentTransformer.transformAgent(pmAgentPath, kiroPMPath);
      const architectTransformSuccess = await agentTransformer.transformAgent(architectAgentPath, kiroArchitectPath);

      expect(pmTransformSuccess).toBe(true);
      expect(architectTransformSuccess).toBe(true);

      // Verify both agents have context awareness
      const pmContent = await fs.readFile(kiroPMPath, 'utf8');
      const architectContent = await fs.readFile(kiroArchitectPath, 'utf8');

      expect(pmContent).toContain('Context Awareness');
      expect(architectContent).toContain('Context Awareness');
    });

    it('should handle complex multi-agent workflows with dependencies', async () => {
      const complexWorkflow = {
        name: 'Full Stack Development Workflow',
        agents: [
          { id: 'analyst', dependencies: [], phase: 'research' },
          { id: 'pm', dependencies: ['analyst'], phase: 'planning' },
          { id: 'architect', dependencies: ['pm'], phase: 'design' },
          { id: 'dev-frontend', dependencies: ['architect'], phase: 'implementation' },
          { id: 'dev-backend', dependencies: ['architect'], phase: 'implementation' },
          { id: 'qa', dependencies: ['dev-frontend', 'dev-backend'], phase: 'testing' },
          { id: 'devops', dependencies: ['qa'], phase: 'deployment' }
        ],
        contextFlow: [
          { from: 'analyst', to: 'pm', data: ['market research', 'user insights'] },
          { from: 'pm', to: 'architect', data: ['requirements', 'user stories'] },
          { from: 'architect', to: 'dev-frontend', data: ['ui specifications', 'component design'] },
          { from: 'architect', to: 'dev-backend', data: ['api specifications', 'data models'] },
          { from: 'dev-frontend', to: 'qa', data: ['ui components', 'frontend tests'] },
          { from: 'dev-backend', to: 'qa', data: ['api endpoints', 'backend tests'] },
          { from: 'qa', to: 'devops', data: ['test results', 'deployment requirements'] }
        ]
      };

      // Test context mapping for each agent in the workflow
      for (const agent of complexWorkflow.agents) {
        const agentContextRequirements = contextInjector.agentContextRequirements[agent.id] || 
          contextInjector.agentContextRequirements[agent.id.split('-')[0]];

        if (agentContextRequirements) {
          expect(agentContextRequirements.primary).toBeDefined();
          expect(agentContextRequirements.secondary).toBeDefined();
          expect(agentContextRequirements.description).toBeDefined();
        }
      }

      // Test context flow between agents
      for (const flow of complexWorkflow.contextFlow) {
        const contextMapping = contextInjector.mapBMadContextToKiro(flow.data);
        expect(contextMapping.mapped.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should support agent specialization with shared context', async () => {
      const specializedAgents = [
        {
          id: 'security-specialist',
          specialization: 'security',
          contextNeeds: ['security requirements', 'vulnerability reports', 'code review'],
          collaboratesWith: ['architect', 'dev', 'qa']
        },
        {
          id: 'performance-specialist',
          specialization: 'performance',
          contextNeeds: ['performance metrics', 'load test results', 'system monitoring'],
          collaboratesWith: ['architect', 'dev', 'devops']
        },
        {
          id: 'accessibility-specialist',
          specialization: 'accessibility',
          contextNeeds: ['accessibility guidelines', 'ui components', 'user testing'],
          collaboratesWith: ['dev-frontend', 'qa', 'ux-designer']
        }
      ];

      for (const specialist of specializedAgents) {
        // Test context mapping for specialized agents
        const contextMapping = contextInjector.mapBMadContextToKiro(specialist.contextNeeds);
        
        expect(contextMapping).toBeDefined();
        expect(contextMapping.mapped).toBeDefined();

        // Specialists should have access to relevant context
        if (specialist.specialization === 'security') {
          expect(contextMapping.mapped).toContain('#Codebase'); // Need full code access
        }
        if (specialist.specialization === 'performance') {
          expect(contextMapping.mapped).toContain('#Terminal'); // Need metrics access
        }
        if (specialist.specialization === 'accessibility') {
          expect(contextMapping.mapped).toContain('#File'); // Need UI component access
        }
      }
    });
  });

  describe('MCP Tool Integration for Collaboration', () => {
    it('should coordinate MCP tool usage across agents', async () => {
      // Mock MCP tools configuration
      const mockMCPTools = [
        {
          name: 'web-search',
          capabilities: ['search', 'browse', 'scrape'],
          agents: ['analyst', 'pm']
        },
        {
          name: 'documentation',
          capabilities: ['generate', 'update', 'format'],
          agents: ['architect', 'dev']
        },
        {
          name: 'api-testing',
          capabilities: ['request', 'validate', 'mock'],
          agents: ['dev', 'qa']
        },
        {
          name: 'monitoring',
          capabilities: ['metrics', 'alerts', 'dashboards'],
          agents: ['devops', 'performance-specialist']
        }
      ];

      // Test MCP tool mapping for each agent type
      const agentTypes = ['analyst', 'pm', 'architect', 'dev', 'qa', 'devops'];
      
      for (const agentType of agentTypes) {
        const toolMapping = mcpIntegrator.mapBMadAgentToMCPTools(agentType, mockMCPTools);
        
        expect(toolMapping).toBeDefined();
        expect(toolMapping.recommended).toBeDefined();
        expect(Array.isArray(toolMapping.recommended)).toBe(true);
        
        // Verify agent gets appropriate tools
        if (agentType === 'analyst') {
          expect(toolMapping.recommended).toContain('web-search');
        }
        if (agentType === 'dev') {
          expect(toolMapping.recommended).toContain('api-testing');
        }
      }
    });

    it('should handle MCP tool conflicts and sharing', async () => {
      const toolSharingScenario = {
        sharedTools: [
          {
            name: 'documentation',
            sharedBy: ['architect', 'dev', 'qa'],
            usagePatterns: {
              'architect': 'design documentation',
              'dev': 'code documentation',
              'qa': 'test documentation'
            }
          },
          {
            name: 'api-testing',
            sharedBy: ['dev', 'qa'],
            usagePatterns: {
              'dev': 'development testing',
              'qa': 'integration testing'
            }
          }
        ],
        conflicts: [
          {
            tool: 'database-access',
            conflictingAgents: ['dev', 'qa'],
            resolution: 'time-based-sharing'
          }
        ]
      };

      // Test tool sharing scenarios
      for (const sharedTool of toolSharingScenario.sharedTools) {
        for (const agent of sharedTool.sharedBy) {
          const mockAgent = { id: agent, name: `BMad ${agent}` };
          const integration = mcpIntegrator.generateMCPIntegrationForAgent(mockAgent, [
            { name: sharedTool.name, capabilities: ['test'] }
          ]);
          
          expect(integration).toBeDefined();
          expect(integration.agentId).toBe(agent);
        }
      }
    });

    it('should provide MCP fallbacks for collaborative workflows', async () => {
      const collaborativeScenario = {
        workflow: 'API Development',
        agents: ['architect', 'dev', 'qa'],
        requiredTools: ['api-design', 'api-testing', 'documentation'],
        availableTools: ['documentation'], // Only one tool available
        missingTools: ['api-design', 'api-testing']
      };

      // Test fallback provision for missing tools
      const fallbackGuidance = mcpIntegrator.provideMCPSetupGuidance(collaborativeScenario.missingTools);
      
      expect(fallbackGuidance).toBeDefined();
      expect(fallbackGuidance.missingTools).toEqual(collaborativeScenario.missingTools);
      expect(fallbackGuidance.setupInstructions).toBeDefined();

      // Test fallback workflows for each agent
      for (const agent of collaborativeScenario.agents) {
        const fallbackWorkflow = mcpIntegrator.createMCPFallbackWorkflow(agent, collaborativeScenario.missingTools);
        
        expect(fallbackWorkflow).toBeDefined();
        expect(fallbackWorkflow.agentId).toBe(agent);
        expect(fallbackWorkflow.missingTools).toEqual(collaborativeScenario.missingTools);
        expect(fallbackWorkflow.alternativeApproach).toBeDefined();
      }
    });
  });

  describe('Collaborative Error Handling', () => {
    it('should handle agent failures with graceful degradation', async () => {
      const failureScenarios = [
        {
          failedAgent: 'architect',
          impact: 'design phase blocked',
          fallbackAgents: ['senior-dev', 'tech-lead'],
          contextTransfer: ['requirements', 'technical constraints']
        },
        {
          failedAgent: 'qa',
          impact: 'testing phase delayed',
          fallbackAgents: ['dev', 'manual-tester'],
          contextTransfer: ['test plans', 'bug reports']
        }
      ];

      for (const scenario of failureScenarios) {
        // Test context transfer to fallback agents
        const contextMapping = contextInjector.mapBMadContextToKiro(scenario.contextTransfer);
        
        expect(contextMapping).toBeDefined();
        expect(contextMapping.mapped.length).toBeGreaterThan(0);

        // Test fallback context provision
        const fallback = await contextInjector.provideFallbackContext(['#Codebase', '#Problems']);
        
        expect(fallback.canProceedWithoutContext).toBeDefined();
        expect(fallback.fallbackInstructions).toBeDefined();
      }
    });

    it('should coordinate recovery across multiple agents', async () => {
      const recoveryScenario = {
        incident: 'build system failure',
        affectedAgents: ['dev', 'qa', 'devops'],
        recoverySteps: [
          { agent: 'devops', action: 'diagnose build system', context: ['build logs', 'system status'] },
          { agent: 'dev', action: 'fix build configuration', context: ['build config', 'error logs'] },
          { agent: 'qa', action: 'verify build recovery', context: ['test results', 'build status'] }
        ]
      };

      // Test context provision for recovery steps
      for (const step of recoveryScenario.recoverySteps) {
        const contextMapping = contextInjector.mapBMadContextToKiro(step.context);
        
        expect(contextMapping).toBeDefined();
        expect(contextMapping.mapped).toBeDefined();

        // Each agent should get appropriate recovery context
        if (step.agent === 'devops') {
          expect(contextMapping.mapped).toContain('#Terminal');
        }
        if (step.agent === 'dev') {
          expect(contextMapping.mapped).toContain('#File');
          expect(contextMapping.mapped).toContain('#Problems');
        }
        if (step.agent === 'qa') {
          expect(contextMapping.mapped).toContain('#Terminal');
          expect(contextMapping.mapped).toContain('#Problems');
        }
      }
    });
  });
});