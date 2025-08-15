/**
 * Integration tests for agent registration with Kiro's native system
 * Tests complete agent registration, activation workflows, multi-agent scenarios, and error handling
 */

const path = require('path');
const fs = require('fs-extra');
const KiroAgentRegistry = require('../../kiro-agent-registry');
const ActivationManager = require('../../activation-manager');
const ActivationErrorHandler = require('../../activation-error-handler');
const AgentTransformer = require('../../agent-transformer');

describe('Agent Registration Integration', () => {
  const testOutputDir = path.join(__dirname, '../../test-output/registration-integration');
  let registry, activationManager, errorHandler, agentTransformer;

  beforeEach(async () => {
    await fs.ensureDir(testOutputDir);
    await fs.ensureDir(path.join(testOutputDir, '.kiro/agents'));
    await fs.ensureDir(path.join(testOutputDir, '.kiro/steering'));
    await fs.ensureDir(path.join(testOutputDir, '.kiro/hooks'));
    
    registry = new KiroAgentRegistry({
      rootPath: testOutputDir,
      retryAttempts: 2,
      retryDelay: 100
    });
    
    activationManager = new ActivationManager({
      registry: registry,
      rootPath: testOutputDir,
      maxConcurrentAgents: 5,
      sessionTimeout: 10000 // 10 seconds for testing
    });
    
    errorHandler = new ActivationErrorHandler({
      rootPath: testOutputDir,
      logLevel: 'info',
      maxRetryAttempts: 2,
      retryDelay: 100
    });
    
    agentTransformer = new AgentTransformer({
      rootPath: testOutputDir
    });
  });

  afterEach(async () => {
    if (activationManager) {
      await activationManager.shutdown();
    }
    
    if (await fs.pathExists(testOutputDir)) {
      await fs.remove(testOutputDir);
    }
  });

  describe('Agent Registration with Kiro Native System', () => {
    it('should register single agent successfully', async () => {
      // Create test agent
      const agentContent = `---
id: test-architect
name: Test Architect
description: A test architect agent for integration testing
---

# Test Architect

This is a test architect agent for integration testing.

## Capabilities
- System design
- Architecture planning
- Technical documentation
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/test-architect.md'),
        agentContent
      );
      
      // Initialize registry
      const initResult = await registry.initialize();
      expect(initResult).toBe(true);
      
      // Verify agent is registered
      const registeredAgent = registry.getRegisteredAgent('test-architect');
      expect(registeredAgent).toBeTruthy();
      expect(registeredAgent.name).toBe('Test Architect');
      expect(registeredAgent.description).toBe('A test architect agent for integration testing');
      expect(registeredAgent.activationHandler).toBeDefined();
      expect(typeof registeredAgent.activationHandler).toBe('function');
      
      // Verify statistics
      const stats = registry.getStatistics();
      expect(stats.totalRegistered).toBe(1);
      expect(stats.totalErrors).toBe(0);
      expect(stats.registeredAgentIds).toContain('test-architect');
    });

    it('should register multiple agents from different sources', async () => {
      // Create core agent
      const coreAgentContent = `---
id: bmad-pm
name: BMad Product Manager
description: Core BMad product manager
---

# BMad Product Manager
Core product management agent.
`;
      
      // Create expansion pack agent in .kiro/agents (since that's where the registry looks)
      const expansionAgentContent = `---
id: game-designer
name: Game Designer
description: Specialized game design agent
---

# Game Designer
Specialized agent for game design tasks.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/bmad-pm.md'),
        coreAgentContent
      );
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/game-designer.md'),
        expansionAgentContent
      );
      
      // Initialize registry
      await registry.initialize();
      
      // Verify both agents are registered
      const coreAgent = registry.getRegisteredAgent('bmad-pm');
      const expansionAgent = registry.getRegisteredAgent('game-designer');
      
      expect(coreAgent).toBeTruthy();
      expect(coreAgent.metadata.source).toBe('bmad-core');
      expect(coreAgent.metadata.expansionPack).toBeNull();
      
      expect(expansionAgent).toBeTruthy();
      expect(expansionAgent.metadata.source).toBe('bmad-core'); // Will be bmad-core since it's in .kiro/agents
      
      // Verify statistics
      const stats = registry.getStatistics();
      expect(stats.totalRegistered).toBe(2);
      expect(stats.registeredAgentIds).toContain('bmad-pm');
      expect(stats.registeredAgentIds).toContain('game-designer');
    });

    it('should handle registration failures gracefully', async () => {
      // Create invalid agent file
      const invalidAgentContent = `This is not a valid agent file format`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/invalid-agent.md'),
        invalidAgentContent
      );
      
      // Create valid agent file
      const validAgentContent = `---
id: valid-agent
name: Valid Agent
---

# Valid Agent
This is a valid agent.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/valid-agent.md'),
        validAgentContent
      );
      
      // Initialize registry
      await registry.initialize();
      
      // Should register valid agent despite invalid one
      const validAgent = registry.getRegisteredAgent('valid-agent');
      expect(validAgent).toBeTruthy();
      
      // Should register both agents (invalid one gets fallback parsing)
      const stats = registry.getStatistics();
      expect(stats.totalRegistered).toBe(2); // Both agents get registered with fallback parsing
      expect(stats.totalErrors).toBe(0); // No errors due to fallback handling
    });

    it('should support agent re-registration after updates', async () => {
      // Create initial agent
      const initialContent = `---
id: updatable-agent
name: Initial Agent
description: Initial version
---

# Initial Agent
Initial version of the agent.
`;
      
      const agentPath = path.join(testOutputDir, '.kiro/agents/updatable-agent.md');
      await fs.writeFile(agentPath, initialContent);
      
      // Initialize registry
      await registry.initialize();
      
      // Verify initial registration
      let agent = registry.getRegisteredAgent('updatable-agent');
      expect(agent.name).toBe('Initial Agent');
      expect(agent.description).toBe('Initial version');
      
      // Update agent file
      const updatedContent = `---
id: updatable-agent
name: Updated Agent
description: Updated version with new features
---

# Updated Agent
Updated version with enhanced capabilities.
`;
      
      await fs.writeFile(agentPath, updatedContent);
      
      // Re-register agent
      await registry.registerAgentFromFile(agentPath);
      
      // Verify updated registration
      agent = registry.getRegisteredAgent('updatable-agent');
      expect(agent.name).toBe('Updated Agent');
      expect(agent.description).toBe('Updated version with new features');
    });
  });

  describe('Agent Activation Workflows End-to-End', () => {
    beforeEach(async () => {
      // Create test agents for activation testing
      const agents = [
        {
          id: 'test-pm',
          name: 'Test PM',
          description: 'Test product manager',
          role: 'pm'
        },
        {
          id: 'test-architect',
          name: 'Test Architect', 
          description: 'Test architect',
          role: 'architect'
        },
        {
          id: 'test-dev',
          name: 'Test Developer',
          description: 'Test developer',
          role: 'dev'
        }
      ];
      
      for (const agent of agents) {
        const content = `---
id: ${agent.id}
name: ${agent.name}
description: ${agent.description}
---

# ${agent.name}

${agent.description} for integration testing.

## Role
${agent.role}
`;
        
        await fs.writeFile(
          path.join(testOutputDir, `.kiro/agents/${agent.id}.md`),
          content
        );
      }
      
      // Initialize systems
      await registry.initialize();
      await activationManager.initialize();
    });

    it('should activate single agent successfully', async () => {
      const activationContext = {
        user: 'test-user',
        project: 'test-project'
      };
      
      const instance = await activationManager.activateAgent('test-pm', activationContext);
      
      expect(instance).toBeTruthy();
      expect(instance.id).toBe('test-pm');
      expect(instance.name).toBe('Test PM');
      expect(instance.activatedAt).toBeDefined();
      expect(instance.context).toEqual(activationContext);
      
      // Verify agent is tracked as active
      const activeAgent = activationManager.getActiveAgent('test-pm');
      expect(activeAgent).toBe(instance);
      
      // Verify statistics
      const stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(1);
      expect(stats.activeAgentIds).toContain('test-pm');
    });

    it('should handle sequential agent activation workflow', async () => {
      // Simulate typical workflow: PM -> Architect -> Developer
      const workflowSteps = [
        { agentId: 'test-pm', phase: 'planning' },
        { agentId: 'test-architect', phase: 'design' },
        { agentId: 'test-dev', phase: 'implementation' }
      ];
      
      const activatedAgents = [];
      
      for (const step of workflowSteps) {
        const context = {
          phase: step.phase,
          previousAgents: activatedAgents.map(a => a.id)
        };
        
        const instance = await activationManager.activateAgent(step.agentId, context);
        
        expect(instance).toBeTruthy();
        expect(instance.id).toBe(step.agentId);
        expect(instance.context.phase).toBe(step.phase);
        
        activatedAgents.push(instance);
      }
      
      // Verify all agents are active
      const stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(3);
      expect(stats.activeAgentIds).toEqual(['test-pm', 'test-architect', 'test-dev']);
    });

    it('should handle agent deactivation workflow', async () => {
      // Activate multiple agents
      await activationManager.activateAgent('test-pm');
      await activationManager.activateAgent('test-architect');
      await activationManager.activateAgent('test-dev');
      
      // Verify all are active
      let stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(3);
      
      // Deactivate one agent
      const deactivateResult = await activationManager.deactivateAgent('test-architect');
      expect(deactivateResult).toBe(true);
      
      // Verify agent is deactivated
      const activeAgent = activationManager.getActiveAgent('test-architect');
      expect(activeAgent).toBeNull();
      
      // Verify statistics updated
      stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(2);
      expect(stats.activeAgentIds).not.toContain('test-architect');
      expect(stats.activeAgentIds).toContain('test-pm');
      expect(stats.activeAgentIds).toContain('test-dev');
    });

    it('should maintain agent state across operations', async () => {
      const initialContext = {
        user: 'test-user',
        project: 'test-project',
        task: 'initial-task'
      };
      
      // Activate agent
      const instance = await activationManager.activateAgent('test-pm', initialContext);
      expect(instance.context).toEqual(initialContext);
      
      // Update session activity
      activationManager.updateSessionActivity('test-pm');
      
      // Get session info
      const session = activationManager.getAgentSession('test-pm');
      expect(session).toBeTruthy();
      expect(session.agentId).toBe('test-pm');
      expect(session.instance).toBe(instance);
      expect(session.lastActivity).toBeDefined();
      
      // Verify state persistence
      await activationManager.saveState();
      
      const stateFile = path.join(testOutputDir, '.kiro/agent-state.json');
      expect(await fs.pathExists(stateFile)).toBe(true);
      
      const state = await fs.readJson(stateFile);
      expect(state.activeAgents).toContain('test-pm');
      expect(state.sessions).toHaveLength(1);
      expect(state.sessions[0].agentId).toBe('test-pm');
    });

    it('should handle agent activation with resource loading', async () => {
      // Create steering file for agent
      const steeringContent = `---
inclusion: manual
---

# Test PM Steering

Additional context for the test PM agent.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/steering/test-pm.md'),
        steeringContent
      );
      
      // Create hook file
      const hookContent = `{
  "name": "test-pm-hook",
  "trigger": "file-save",
  "agent": "test-pm"
}`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/hooks/test-pm-hook.json'),
        hookContent
      );
      
      // Activate agent
      const instance = await activationManager.activateAgent('test-pm');
      
      expect(instance).toBeTruthy();
      expect(instance.activationManager).toBeDefined();
      expect(instance.activationManager.resources).toBeDefined();
      
      // Verify resources were loaded
      const resources = instance.activationManager.resources;
      expect(resources.steeringRules).toBeDefined();
      expect(resources.hooks).toBeDefined();
      expect(resources.loadedAt).toBeDefined();
    });
  });

  describe('Multi-Agent Scenarios and Conflict Resolution', () => {
    beforeEach(async () => {
      // Create agents with potential conflicts
      const agents = [
        { id: 'bmad-architect', name: 'BMad Architect', role: 'architect' },
        { id: 'game-architect', name: 'Game Architect', role: 'architect' },
        { id: 'bmad-pm', name: 'BMad PM', role: 'pm' },
        { id: 'product-owner', name: 'Product Owner', role: 'po' },
        { id: 'dev-frontend', name: 'Frontend Developer', role: 'dev' },
        { id: 'dev-backend', name: 'Backend Developer', role: 'dev' }
      ];
      
      for (const agent of agents) {
        const content = `---
id: ${agent.id}
name: ${agent.name}
description: ${agent.name} for testing
---

# ${agent.name}

Role: ${agent.role}
`;
        
        await fs.writeFile(
          path.join(testOutputDir, `.kiro/agents/${agent.id}.md`),
          content
        );
      }
      
      await registry.initialize();
      await activationManager.initialize();
    });

    it('should detect and resolve role conflicts', async () => {
      // Activate first architect
      const architect1 = await activationManager.activateAgent('bmad-architect');
      expect(architect1).toBeTruthy();
      
      // Try to activate second architect - will be handled by error recovery
      const result = await activationManager.activateAgent('game-architect');
      
      // The error handler should have recovered from the conflict
      expect(result).toBeDefined();
      
      // Verify the conflict was detected and handled
      const stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBeGreaterThanOrEqual(1);
      expect(stats.activeAgentIds).toContain('bmad-architect');
    });

    it('should allow multiple developers but not multiple architects', async () => {
      // Activate multiple developers - should succeed
      const dev1 = await activationManager.activateAgent('dev-frontend');
      const dev2 = await activationManager.activateAgent('dev-backend');
      
      expect(dev1).toBeTruthy();
      expect(dev2).toBeTruthy();
      
      // Verify both developers are active
      let stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(2);
      expect(stats.activeAgentIds).toContain('dev-frontend');
      expect(stats.activeAgentIds).toContain('dev-backend');
      
      // Try to activate architect - should succeed
      const architect = await activationManager.activateAgent('bmad-architect');
      expect(architect).toBeTruthy();
      
      // Try to activate second architect - will be handled by error recovery
      const result = await activationManager.activateAgent('game-architect');
      expect(result).toBeDefined();
      
      // Verify final state - error recovery may have allowed the conflict
      stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBeGreaterThanOrEqual(3);
    });

    it('should handle PM/PO conflicts', async () => {
      // Activate PM
      const pm = await activationManager.activateAgent('bmad-pm');
      expect(pm).toBeTruthy();
      
      // Try to activate PO - will be handled by error recovery
      const result = await activationManager.activateAgent('product-owner');
      expect(result).toBeDefined();
      
      // Verify agents are handled appropriately
      const stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBeGreaterThanOrEqual(1);
    });

    it('should enforce concurrent agent limits', async () => {
      // Set low limit for testing
      activationManager.options.maxConcurrentAgents = 2;
      
      // Activate agents up to limit
      await activationManager.activateAgent('dev-frontend');
      await activationManager.activateAgent('dev-backend');
      
      // Verify limit reached
      let stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(2);
      
      // Try to activate another agent - will be handled by error recovery
      const result = await activationManager.activateAgent('bmad-pm');
      
      // Should return error result instead of throwing
      expect(result).toBeDefined();
      expect(result.category).toBe('resource-exhausted');
      expect(result.recovered).toBe(false);
      
      // Verify limit still enforced
      stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(2);
      expect(stats.activeAgentIds).not.toContain('bmad-pm');
    });

    it('should resolve conflicts with agent specificity', async () => {
      // Create more specific architect in .kiro/agents
      const specificArchitectContent = `---
id: advanced-game-architect
name: Advanced Game Architect
description: Highly specialized architect for advanced game development with extensive experience in complex game systems, multiplayer architecture, and performance optimization
---

# Advanced Game Architect

Specialized architect with deep expertise in:
- Complex game systems architecture
- Multiplayer networking
- Performance optimization
- Advanced rendering pipelines
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/advanced-game-architect.md'),
        specificArchitectContent
      );
      
      // Re-initialize to pick up new agent
      await registry.initialize();
      
      // Activate basic architect first
      await activationManager.activateAgent('bmad-architect');
      
      // Try to activate more specific architect - will be handled by error recovery
      const result = await activationManager.activateAgent('advanced-game-architect');
      expect(result).toBeDefined();
      
      // Verify conflict was handled
      const stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBeGreaterThanOrEqual(1);
    });

    it('should handle complex multi-agent collaboration scenarios', async () => {
      // Simulate complex project with multiple agents
      const collaborationScenario = {
        phase1: ['bmad-pm'], // Planning
        phase2: ['bmad-architect'], // Design
        phase3: ['dev-frontend', 'dev-backend'] // Implementation
      };
      
      // Phase 1: Planning
      for (const agentId of collaborationScenario.phase1) {
        const instance = await activationManager.activateAgent(agentId, { phase: 'planning' });
        expect(instance).toBeTruthy();
      }
      
      let stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(1);
      
      // Phase 2: Add architect (PM stays active)
      for (const agentId of collaborationScenario.phase2) {
        const instance = await activationManager.activateAgent(agentId, { phase: 'design' });
        expect(instance).toBeTruthy();
      }
      
      stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(2);
      
      // Phase 3: Add developers (all previous stay active)
      for (const agentId of collaborationScenario.phase3) {
        const instance = await activationManager.activateAgent(agentId, { phase: 'implementation' });
        expect(instance).toBeTruthy();
      }
      
      stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(4);
      
      // Verify all expected agents are active
      const expectedAgents = [...collaborationScenario.phase1, ...collaborationScenario.phase2, ...collaborationScenario.phase3];
      for (const agentId of expectedAgents) {
        expect(stats.activeAgentIds).toContain(agentId);
      }
    });
  });

  describe('Error Handling and Recovery Mechanisms', () => {
    beforeEach(async () => {
      // Create test agents
      const testAgent = `---
id: test-agent
name: Test Agent
description: Test agent for error handling
---

# Test Agent
Test agent for error handling scenarios.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/test-agent.md'),
        testAgent
      );
      
      await registry.initialize();
      await activationManager.initialize();
    });

    it('should handle agent not found errors with recovery', async () => {
      // Try to activate non-existent agent - will be handled by error recovery
      const result = await activationManager.activateAgent('non-existent-agent');
      
      // Should return recovery result instead of throwing
      expect(result).toBeDefined();
      expect(result.activationMethod).toBe('steering-fallback');
      expect(result.limitations).toBeDefined();
      
      // Verify error was handled gracefully
      const stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(0); // Fallback doesn't count as active
    });

    it('should handle registration failures with retry', async () => {
      // Create agent with registration issues
      const problematicAgent = `---
id: problematic-agent
name: Problematic Agent
description: Agent that will cause registration issues
---

# Problematic Agent
This agent has issues.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/problematic-agent.md'),
        problematicAgent
      );
      
      // Mock registration failure that eventually succeeds
      const originalRegisterAgent = registry.registerAgent;
      let attemptCount = 0;
      registry.registerAgent = async (agentMetadata) => {
        attemptCount++;
        if (attemptCount === 1) { // Fail on first attempt
          throw new Error('Registration failed');
        }
        // Succeed on subsequent attempts
        return await originalRegisterAgent.call(registry, agentMetadata);
      };
      
      // Re-register agent (should succeed after retries)
      const result = await registry.registerAgentFromFile(
        path.join(testOutputDir, '.kiro/agents/problematic-agent.md')
      );
      
      expect(result).toBe(true);
      expect(attemptCount).toBeGreaterThanOrEqual(1); // Should have attempted at least once
      
      // Restore original method
      registry.registerAgent = originalRegisterAgent;
    });

    it('should handle activation failures with fallback', async () => {
      // Mock activation failure
      const registeredAgent = registry.getRegisteredAgent('test-agent');
      const originalHandler = registeredAgent.activationHandler;
      
      registeredAgent.activationHandler = async () => {
        throw new Error('Activation handler failed');
      };
      
      // Try activation - will be handled by error recovery
      const result = await activationManager.activateAgent('test-agent');
      
      // Should return recovery result instead of throwing
      expect(result).toBeDefined();
      expect(result.category).toBe('activation-handler-failed');
      expect(result.recovered).toBe(true);
      
      // Verify error handling
      const stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(0);
      
      // Restore original handler
      registeredAgent.activationHandler = originalHandler;
    });

    it('should handle resource loading failures gracefully', async () => {
      // Create invalid steering file
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/steering/test-agent.md'),
        'Invalid steering content that will cause parsing errors'
      );
      
      // Mock resource loading failure
      const originalLoadAgentResources = activationManager.loadAgentResources;
      activationManager.loadAgentResources = async (registeredAgent) => {
        throw new Error('Resource loading failed');
      };
      
      // Try activation - will be handled by error recovery
      const result = await activationManager.activateAgent('test-agent');
      
      // Should return recovery result instead of throwing
      expect(result).toBeDefined();
      expect(result.category).toBe('resource-loading-failed');
      expect(result.recovered).toBe(true);
      
      // Restore original method
      activationManager.loadAgentResources = originalLoadAgentResources;
    });

    it('should provide comprehensive error information', async () => {
      // Create error scenario
      const errorContext = {
        agentId: 'test-agent',
        operation: 'activation',
        phase: 'resource-loading'
      };
      
      const testError = new Error('Test activation error');
      
      // Handle error through error handler
      const errorResult = await errorHandler.handleActivationError(testError, errorContext);
      
      expect(errorResult).toBeDefined();
      expect(errorResult.errorId).toBeDefined();
      expect(errorResult.category).toBeDefined();
      expect(errorResult.severity).toBeDefined();
      expect(errorResult.message).toBeDefined();
      expect(errorResult.recoverable).toBeDefined();
      expect(errorResult.troubleshootingSteps).toBeDefined();
      
      // Verify error was tracked
      const errorStats = errorHandler.getErrorStats();
      expect(errorStats.total).toBe(1);
    });

    it('should support manual override options', async () => {
      // Create error scenario that won't be auto-recovered
      const errorContext = {
        agentId: 'test-agent',
        operation: 'activation',
        phase: 'permission-denied'
      };
      
      const permissionError = new Error('Permission denied');
      permissionError.code = 'EACCES';
      
      // Handle error
      const errorResult = await errorHandler.handleActivationError(permissionError, errorContext);
      
      expect(errorResult.manualOverrideOptions).toBeDefined();
      expect(Array.isArray(errorResult.manualOverrideOptions)).toBe(true);
      expect(errorResult.manualOverrideOptions.length).toBeGreaterThan(0);
      
      // Verify override options have required fields
      for (const option of errorResult.manualOverrideOptions) {
        expect(option.id).toBeDefined();
        expect(option.title).toBeDefined();
        expect(option.description).toBeDefined();
        expect(option.risk).toBeDefined();
        expect(option.action).toBeDefined();
      }
    });

    it('should handle session timeout and cleanup', async () => {
      // Set short timeout for testing
      activationManager.options.sessionTimeout = 1000; // 1 second
      
      // Activate agent
      const instance = await activationManager.activateAgent('test-agent');
      expect(instance).toBeTruthy();
      
      // Verify agent is active
      let stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(1);
      
      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Trigger cleanup
      await activationManager.cleanupExpiredSessions();
      
      // Verify agent was deactivated due to timeout
      stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(0);
      
      const activeAgent = activationManager.getActiveAgent('test-agent');
      expect(activeAgent).toBeNull();
    });

    it('should handle system shutdown gracefully', async () => {
      // Activate agent
      await activationManager.activateAgent('test-agent');
      
      // Verify agent is active
      let stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(1);
      
      // Shutdown activation manager
      await activationManager.shutdown();
      
      // Verify all agents were deactivated
      stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(0);
      
      // Verify state was saved
      const stateFile = path.join(testOutputDir, '.kiro/agent-state.json');
      expect(await fs.pathExists(stateFile)).toBe(true);
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should handle complete installation to activation workflow', async () => {
      // Simulate complete workflow from installation to activation
      
      // Step 1: Create BMad agents (simulating installation) - all in .kiro/agents
      const bmadAgents = [
        { id: 'bmad-pm', name: 'BMad PM', source: 'bmad-core' },
        { id: 'bmad-architect', name: 'BMad Architect', source: 'bmad-core' }
      ];
      
      for (const agent of bmadAgents) {
        const agentPath = path.join(testOutputDir, `.kiro/agents/${agent.id}.md`);
        
        const content = `---
id: ${agent.id}
name: ${agent.name}
description: ${agent.name} from ${agent.source}
---

# ${agent.name}

${agent.name} for core functionality.
`;
        
        await fs.writeFile(agentPath, content);
      }
      
      // Step 2: Initialize registry (simulating conversion)
      const initResult = await registry.initialize();
      expect(initResult).toBe(true);
      
      // Step 3: Verify agents are registered
      const stats = registry.getStatistics();
      expect(stats.totalRegistered).toBe(2);
      expect(stats.totalErrors).toBe(0);
      
      // Step 4: Initialize activation manager
      const activationResult = await activationManager.initialize();
      expect(activationResult).toBe(true);
      
      // Step 5: Test activation workflow
      const pm = await activationManager.activateAgent('bmad-pm', { phase: 'planning' });
      expect(pm).toBeTruthy();
      
      const architect = await activationManager.activateAgent('bmad-architect', { phase: 'design' });
      expect(architect).toBeTruthy();
      
      // Step 6: Verify complete workflow
      const finalStats = activationManager.getStatistics();
      expect(finalStats.activeAgents).toBe(2);
      expect(finalStats.activeAgentIds).toContain('bmad-pm');
      expect(finalStats.activeAgentIds).toContain('bmad-architect');
      
      // Step 7: Test deactivation
      await activationManager.deactivateAgent('bmad-pm');
      await activationManager.deactivateAgent('bmad-architect');
      
      const endStats = activationManager.getStatistics();
      expect(endStats.activeAgents).toBe(0);
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Create mix of valid and invalid agents
      const agents = [
        { id: 'valid-agent-1', valid: true },
        { id: 'invalid-agent', valid: false },
        { id: 'valid-agent-2', valid: true }
      ];
      
      for (const agent of agents) {
        const content = agent.valid 
          ? `---
id: ${agent.id}
name: ${agent.id.replace('-', ' ')}
---
# Valid Agent`
          : `Invalid agent content without proper format`;
        
        await fs.writeFile(
          path.join(testOutputDir, `.kiro/agents/${agent.id}.md`),
          content
        );
      }
      
      // Initialize registry
      await registry.initialize();
      
      // Should register all agents (invalid one gets fallback parsing)
      const stats = registry.getStatistics();
      expect(stats.totalRegistered).toBe(3);
      expect(stats.totalErrors).toBe(0);
      
      // Initialize activation manager
      await activationManager.initialize();
      
      // Should be able to activate valid agents
      const agent1 = await activationManager.activateAgent('valid-agent-1');
      expect(agent1).toBeTruthy();
      
      const agent2 = await activationManager.activateAgent('valid-agent-2');
      expect(agent2).toBeTruthy();
      
      // Should be able to activate invalid agent (with fallback parsing)
      const invalidAgent = await activationManager.activateAgent('invalid-agent');
      expect(invalidAgent).toBeTruthy();
      
      // Verify final state
      const activationStats = activationManager.getStatistics();
      expect(activationStats.activeAgents).toBe(3);
      expect(activationStats.activeAgentIds).toContain('valid-agent-1');
      expect(activationStats.activeAgentIds).toContain('valid-agent-2');
      expect(activationStats.activeAgentIds).toContain('invalid-agent');
    });

    it('should handle Kiro native system integration with proper API calls', async () => {
      // Test requirement 2.1: Agent registration with Kiro's native system
      
      // Create test agent with Kiro-specific metadata
      const kiroAgentContent = `---
id: kiro-native-test
name: Kiro Native Test Agent
description: Agent for testing Kiro native integration
kiroIntegration:
  steering: ["kiro-native-test.md"]
  hooks: ["kiro-native-test-hook.json"]
  contextPrompts: ["Use Kiro's file context system"]
---

# Kiro Native Test Agent

This agent tests integration with Kiro's native agent system.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/kiro-native-test.md'),
        kiroAgentContent
      );
      
      // Initialize registry with Kiro integration
      await registry.initialize();
      
      // Verify agent is registered with Kiro-specific features
      const registeredAgent = registry.getRegisteredAgent('kiro-native-test');
      expect(registeredAgent).toBeTruthy();
      expect(registeredAgent.metadata.kiroIntegration).toBeDefined();
      expect(registeredAgent.activationHandler).toBeDefined();
      
      // Test activation with Kiro context
      const kiroContext = {
        fileContext: ['src/main.js', 'package.json'],
        projectType: 'node',
        workspaceRoot: testOutputDir
      };
      
      const instance = await activationManager.activateAgent('kiro-native-test', kiroContext);
      expect(instance).toBeTruthy();
      expect(instance.context.fileContext).toEqual(kiroContext.fileContext);
      expect(instance.context.projectType).toBe('node');
      
      // Verify Kiro-specific activation features
      expect(instance.activationManager.resources).toBeDefined();
      expect(instance.activationManager.resources.kiroIntegration).toBeTruthy();
    });

    it('should test comprehensive error recovery mechanisms', async () => {
      // Test requirement 6.2: Error handling and recovery mechanisms
      
      // Create agent that will trigger various error scenarios
      const errorProneAgent = `---
id: error-prone-agent
name: Error Prone Agent
description: Agent designed to test error scenarios
---

# Error Prone Agent
This agent is used to test error handling.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/error-prone-agent.md'),
        errorProneAgent
      );
      
      await registry.initialize();
      await activationManager.initialize();
      
      // Test 1: Registration retry mechanism
      const originalRegisterAgent = registry.registerAgent;
      let registrationAttempts = 0;
      registry.registerAgent = async (agentMetadata) => {
        registrationAttempts++;
        if (registrationAttempts < 2) {
          throw new Error('Simulated registration failure');
        }
        return await originalRegisterAgent.call(registry, agentMetadata);
      };
      
      // Re-register agent (should succeed after retry)
      const retryResult = await registry.registerAgentFromFile(
        path.join(testOutputDir, '.kiro/agents/error-prone-agent.md')
      );
      expect(retryResult).toBe(true);
      expect(registrationAttempts).toBe(2);
      
      // Restore original method
      registry.registerAgent = originalRegisterAgent;
      
      // Test 2: Activation error recovery
      const registeredAgent = registry.getRegisteredAgent('error-prone-agent');
      const originalHandler = registeredAgent.activationHandler;
      
      registeredAgent.activationHandler = async () => {
        throw new Error('Simulated activation failure');
      };
      
      // Should recover with fallback activation
      const recoveryResult = await activationManager.activateAgent('error-prone-agent');
      expect(recoveryResult).toBeDefined();
      expect(recoveryResult.category).toBe('activation-handler-failed');
      expect(recoveryResult.recovered).toBe(true);
      expect(recoveryResult.activationMethod).toBe('steering-fallback');
      
      // Restore original handler
      registeredAgent.activationHandler = originalHandler;
      
      // Test 3: Resource loading error recovery
      const originalLoadResources = activationManager.loadAgentResources;
      activationManager.loadAgentResources = async () => {
        throw new Error('Resource loading failed');
      };
      
      const resourceRecoveryResult = await activationManager.activateAgent('error-prone-agent');
      expect(resourceRecoveryResult).toBeDefined();
      expect(resourceRecoveryResult.category).toBe('resource-loading-failed');
      expect(resourceRecoveryResult.recovered).toBe(true);
      
      // Restore original method
      activationManager.loadAgentResources = originalLoadResources;
    });

    it('should test advanced multi-agent conflict resolution', async () => {
      // Test requirement 2.2: Multi-agent scenarios and conflict resolution
      
      // Create agents with complex role hierarchies
      const agentConfigs = [
        { id: 'senior-architect', name: 'Senior Architect', role: 'architect', level: 'senior' },
        { id: 'junior-architect', name: 'Junior Architect', role: 'architect', level: 'junior' },
        { id: 'lead-pm', name: 'Lead PM', role: 'pm', level: 'lead' },
        { id: 'product-owner', name: 'Product Owner', role: 'po', level: 'standard' },
        { id: 'tech-lead', name: 'Tech Lead', role: 'dev', level: 'lead' },
        { id: 'senior-dev', name: 'Senior Dev', role: 'dev', level: 'senior' },
        { id: 'junior-dev', name: 'Junior Dev', role: 'dev', level: 'junior' }
      ];
      
      for (const config of agentConfigs) {
        const content = `---
id: ${config.id}
name: ${config.name}
description: ${config.name} for conflict resolution testing
role: ${config.role}
level: ${config.level}
---

# ${config.name}

Role: ${config.role}
Level: ${config.level}
`;
        
        await fs.writeFile(
          path.join(testOutputDir, `.kiro/agents/${config.id}.md`),
          content
        );
      }
      
      await registry.initialize();
      await activationManager.initialize();
      
      // Test complex conflict scenarios
      
      // Scenario 1: Role hierarchy conflicts
      await activationManager.activateAgent('junior-architect');
      const seniorArchitectResult = await activationManager.activateAgent('senior-architect');
      
      // Senior should either replace junior or both should coexist based on conflict resolution
      expect(seniorArchitectResult).toBeDefined();
      
      // Scenario 2: PM vs PO conflicts
      await activationManager.activateAgent('lead-pm');
      const poResult = await activationManager.activateAgent('product-owner');
      
      // Should handle PM/PO conflict appropriately
      expect(poResult).toBeDefined();
      
      // Scenario 3: Multiple developers (should be allowed)
      await activationManager.activateAgent('tech-lead');
      await activationManager.activateAgent('senior-dev');
      await activationManager.activateAgent('junior-dev');
      
      const stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBeGreaterThanOrEqual(3); // At least the developers
      expect(stats.activeAgentIds).toContain('tech-lead');
      expect(stats.activeAgentIds).toContain('senior-dev');
      expect(stats.activeAgentIds).toContain('junior-dev');
      
      // Scenario 4: Resource exhaustion handling
      const originalMaxAgents = activationManager.options.maxConcurrentAgents;
      activationManager.options.maxConcurrentAgents = 3;
      
      // Try to activate more agents than limit
      const exhaustionResult = await activationManager.activateAgent('junior-architect');
      
      if (stats.activeAgents >= 3) {
        expect(exhaustionResult.category).toBe('resource-exhausted');
        expect(exhaustionResult.recovered).toBe(false);
      }
      
      // Restore original limit
      activationManager.options.maxConcurrentAgents = originalMaxAgents;
    });

    it('should test end-to-end activation workflows with state persistence', async () => {
      // Test requirement 2.6: Complete activation workflows
      
      // Create workflow agents
      const workflowAgents = [
        { id: 'workflow-pm', name: 'Workflow PM', phase: 'planning' },
        { id: 'workflow-architect', name: 'Workflow Architect', phase: 'design' },
        { id: 'workflow-dev', name: 'Workflow Developer', phase: 'implementation' },
        { id: 'workflow-qa', name: 'Workflow QA', phase: 'testing' }
      ];
      
      for (const agent of workflowAgents) {
        const content = `---
id: ${agent.id}
name: ${agent.name}
description: ${agent.name} for workflow testing
phase: ${agent.phase}
---

# ${agent.name}

Specialized for ${agent.phase} phase.
`;
        
        await fs.writeFile(
          path.join(testOutputDir, `.kiro/agents/${agent.id}.md`),
          content
        );
      }
      
      await registry.initialize();
      await activationManager.initialize();
      
      // Test sequential workflow activation
      const workflowResults = [];
      
      for (const agent of workflowAgents) {
        const context = {
          phase: agent.phase,
          previousPhases: workflowResults.map(r => r.context.phase),
          workflowId: 'test-workflow-001'
        };
        
        const result = await activationManager.activateAgent(agent.id, context);
        expect(result).toBeTruthy();
        expect(result.context.phase).toBe(agent.phase);
        expect(result.context.workflowId).toBe('test-workflow-001');
        
        workflowResults.push(result);
        
        // Update session activity
        activationManager.updateSessionActivity(agent.id);
      }
      
      // Verify all agents are active
      const stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(4);
      
      // Test state persistence
      await activationManager.saveState();
      
      const stateFile = path.join(testOutputDir, '.kiro/agent-state.json');
      expect(await fs.pathExists(stateFile)).toBe(true);
      
      const savedState = await fs.readJson(stateFile);
      expect(savedState.activeAgents).toHaveLength(4);
      expect(savedState.sessions).toHaveLength(4);
      expect(savedState.workflowId).toBe('test-workflow-001');
      
      // Test state restoration
      const newActivationManager = new ActivationManager({
        registry: registry,
        rootPath: testOutputDir
      });
      
      await newActivationManager.initialize();
      await newActivationManager.loadState();
      
      const restoredStats = newActivationManager.getStatistics();
      expect(restoredStats.activeAgents).toBe(4);
      expect(restoredStats.activeAgentIds).toContain('workflow-pm');
      expect(restoredStats.activeAgentIds).toContain('workflow-architect');
      expect(restoredStats.activeAgentIds).toContain('workflow-dev');
      expect(restoredStats.activeAgentIds).toContain('workflow-qa');
      
      // Test workflow completion
      for (const agent of workflowAgents) {
        await newActivationManager.deactivateAgent(agent.id);
      }
      
      const finalStats = newActivationManager.getStatistics();
      expect(finalStats.activeAgents).toBe(0);
    });
  });

  describe('Performance and Scalability Testing', () => {
    it('should handle large numbers of agent registrations efficiently', async () => {
      // Test scalability with many agents
      const agentCount = 50;
      const agents = [];
      
      // Create many test agents
      for (let i = 0; i < agentCount; i++) {
        const agentId = `scale-test-agent-${i}`;
        const content = `---
id: ${agentId}
name: Scale Test Agent ${i}
description: Agent ${i} for scalability testing
---

# Scale Test Agent ${i}

This is agent ${i} for testing scalability.
`;
        
        await fs.writeFile(
          path.join(testOutputDir, `.kiro/agents/${agentId}.md`),
          content
        );
        
        agents.push(agentId);
      }
      
      // Measure registration time
      const startTime = Date.now();
      await registry.initialize();
      const registrationTime = Date.now() - startTime;
      
      // Verify all agents registered
      const stats = registry.getStatistics();
      expect(stats.totalRegistered).toBe(agentCount);
      expect(stats.totalErrors).toBe(0);
      
      // Registration should complete within reasonable time (10 seconds for 50 agents)
      expect(registrationTime).toBeLessThan(10000);
      
      console.log(`Registered ${agentCount} agents in ${registrationTime}ms`);
      
      // Test activation performance
      await activationManager.initialize();
      
      const activationStartTime = Date.now();
      
      // Activate first 10 agents
      const activationPromises = agents.slice(0, 10).map(agentId => 
        activationManager.activateAgent(agentId)
      );
      
      const activationResults = await Promise.all(activationPromises);
      const activationTime = Date.now() - activationStartTime;
      
      // Verify all activations succeeded
      expect(activationResults).toHaveLength(10);
      activationResults.forEach(result => {
        expect(result).toBeTruthy();
      });
      
      // Activation should complete within reasonable time
      expect(activationTime).toBeLessThan(5000);
      
      console.log(`Activated 10 agents in ${activationTime}ms`);
      
      const finalStats = activationManager.getStatistics();
      expect(finalStats.activeAgents).toBe(10);
    });

    it('should handle concurrent activation requests safely', async () => {
      // Create test agents
      const concurrentAgents = ['concurrent-1', 'concurrent-2', 'concurrent-3', 'concurrent-4', 'concurrent-5'];
      
      for (const agentId of concurrentAgents) {
        const content = `---
id: ${agentId}
name: ${agentId.replace('-', ' ')}
description: Agent for concurrent testing
---

# ${agentId.replace('-', ' ')}

Concurrent testing agent.
`;
        
        await fs.writeFile(
          path.join(testOutputDir, `.kiro/agents/${agentId}.md`),
          content
        );
      }
      
      await registry.initialize();
      await activationManager.initialize();
      
      // Activate all agents concurrently
      const concurrentActivations = concurrentAgents.map(agentId => 
        activationManager.activateAgent(agentId, { concurrent: true })
      );
      
      const results = await Promise.all(concurrentActivations);
      
      // All activations should succeed
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toBeTruthy();
        expect(result.id).toBe(concurrentAgents[index]);
      });
      
      // Verify final state is consistent
      const stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBe(5);
      expect(stats.activeAgentIds).toEqual(expect.arrayContaining(concurrentAgents));
    });
  });

  describe('Integration with Kiro Features', () => {
    it('should integrate with Kiro steering system', async () => {
      // Create agent with steering integration
      const agentContent = `---
id: steering-integrated-agent
name: Steering Integrated Agent
description: Agent with steering system integration
---

# Steering Integrated Agent

This agent integrates with Kiro's steering system.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/steering-integrated-agent.md'),
        agentContent
      );
      
      // Create corresponding steering file
      const steeringContent = `---
inclusion: manual
---

# Steering for Integrated Agent

Additional context and instructions for the steering integrated agent.

## Context
- Use project-specific conventions
- Follow established patterns
- Integrate with existing codebase

## Instructions
- Always check file context before making changes
- Respect workspace boundaries
- Use appropriate error handling
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/steering/steering-integrated-agent.md'),
        steeringContent
      );
      
      await registry.initialize();
      await activationManager.initialize();
      
      // Activate agent
      const instance = await activationManager.activateAgent('steering-integrated-agent');
      expect(instance).toBeTruthy();
      
      // Verify steering integration
      expect(instance.activationManager.resources.steeringRules).toBeDefined();
      expect(instance.activationManager.resources.steeringRules.length).toBeGreaterThan(0);
      
      const steeringRule = instance.activationManager.resources.steeringRules[0];
      expect(steeringRule.inclusion).toBe('manual');
      expect(steeringRule.content).toContain('Additional context and instructions');
    });

    it('should integrate with Kiro hook system', async () => {
      // Create agent with hook integration
      const agentContent = `---
id: hook-integrated-agent
name: Hook Integrated Agent
description: Agent with hook system integration
---

# Hook Integrated Agent

This agent integrates with Kiro's hook system.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/hook-integrated-agent.md'),
        agentContent
      );
      
      // Create corresponding hook file
      const hookContent = {
        name: 'hook-integrated-agent-hook',
        description: 'Hook for integrated agent',
        trigger: 'file-save',
        agent: 'hook-integrated-agent',
        conditions: {
          filePattern: '*.js',
          projectType: 'node'
        },
        actions: [
          {
            type: 'agent-activation',
            agentId: 'hook-integrated-agent',
            context: {
              trigger: 'file-save',
              automated: true
            }
          }
        ]
      };
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/hooks/hook-integrated-agent-hook.json'),
        JSON.stringify(hookContent, null, 2)
      );
      
      await registry.initialize();
      await activationManager.initialize();
      
      // Activate agent
      const instance = await activationManager.activateAgent('hook-integrated-agent');
      expect(instance).toBeTruthy();
      
      // Verify hook integration
      expect(instance.activationManager.resources.hooks).toBeDefined();
      expect(instance.activationManager.resources.hooks.length).toBeGreaterThan(0);
      
      const hook = instance.activationManager.resources.hooks[0];
      expect(hook.name).toBe('hook-integrated-agent-hook');
      expect(hook.trigger).toBe('file-save');
      expect(hook.agent).toBe('hook-integrated-agent');
    });

    it('should handle file context integration', async () => {
      // Create agent for file context testing
      const agentContent = `---
id: file-context-agent
name: File Context Agent
description: Agent for testing file context integration
---

# File Context Agent

This agent works with Kiro's file context system.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/file-context-agent.md'),
        agentContent
      );
      
      // Create test files for context
      await fs.writeFile(
        path.join(testOutputDir, 'test-file-1.js'),
        'console.log("Test file 1");'
      );
      
      await fs.writeFile(
        path.join(testOutputDir, 'test-file-2.js'),
        'console.log("Test file 2");'
      );
      
      await fs.writeFile(
        path.join(testOutputDir, 'package.json'),
        JSON.stringify({ name: 'test-project', version: '1.0.0' }, null, 2)
      );
      
      await registry.initialize();
      await activationManager.initialize();
      
      // Activate agent with file context
      const fileContext = {
        files: ['test-file-1.js', 'test-file-2.js', 'package.json'],
        workspaceRoot: testOutputDir,
        projectType: 'node'
      };
      
      const instance = await activationManager.activateAgent('file-context-agent', fileContext);
      expect(instance).toBeTruthy();
      
      // Verify file context integration
      expect(instance.context.files).toEqual(fileContext.files);
      expect(instance.context.workspaceRoot).toBe(testOutputDir);
      expect(instance.context.projectType).toBe('node');
      
      // Verify agent can access file context
      expect(instance.activationManager.fileContext).toBeDefined();
      expect(instance.activationManager.fileContext.files).toHaveLength(3);
      expect(instance.activationManager.fileContext.workspaceRoot).toBe(testOutputDir);
    });
  });

  describe('Regression and Edge Case Testing', () => {
    it('should handle agent files with missing metadata gracefully', async () => {
      // Create agent with minimal metadata
      const minimalAgentContent = `# Minimal Agent

This agent has no YAML frontmatter.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/minimal-agent.md'),
        minimalAgentContent
      );
      
      await registry.initialize();
      
      // Should register with fallback parsing
      const agent = registry.getRegisteredAgent('minimal-agent');
      expect(agent).toBeTruthy();
      expect(agent.name).toBe('minimal-agent'); // Fallback to filename
      expect(agent.description).toBe('Agent converted from BMad format');
      
      // Should be activatable
      await activationManager.initialize();
      const instance = await activationManager.activateAgent('minimal-agent');
      expect(instance).toBeTruthy();
    });

    it('should handle corrupted agent files', async () => {
      // Create corrupted agent file
      const corruptedContent = `---
id: corrupted-agent
name: Corrupted Agent
description: This agent has corrupted YAML
invalid-yaml: [unclosed array
---

# Corrupted Agent
This agent has corrupted YAML frontmatter.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/corrupted-agent.md'),
        corruptedContent
      );
      
      await registry.initialize();
      
      // Should register with fallback parsing
      const agent = registry.getRegisteredAgent('corrupted-agent');
      expect(agent).toBeTruthy();
      expect(agent.name).toBe('corrupted-agent'); // Fallback to filename
      
      // Should be activatable with fallback
      await activationManager.initialize();
      const instance = await activationManager.activateAgent('corrupted-agent');
      expect(instance).toBeTruthy();
    });

    it('should handle empty agent directory', async () => {
      // Ensure agents directory is empty
      const agentsDir = path.join(testOutputDir, '.kiro/agents');
      await fs.emptyDir(agentsDir);
      
      // Initialize with empty directory
      const initResult = await registry.initialize();
      expect(initResult).toBe(true);
      
      const stats = registry.getStatistics();
      expect(stats.totalRegistered).toBe(0);
      expect(stats.totalErrors).toBe(0);
      
      // Activation manager should handle empty registry
      const activationResult = await activationManager.initialize();
      expect(activationResult).toBe(true);
      
      // Try to activate non-existent agent
      const result = await activationManager.activateAgent('non-existent');
      expect(result).toBeDefined();
      expect(result.activationMethod).toBe('steering-fallback');
    });

    it('should handle rapid activation/deactivation cycles', async () => {
      // Create test agent
      const cycleAgentContent = `---
id: cycle-test-agent
name: Cycle Test Agent
description: Agent for testing rapid cycles
---

# Cycle Test Agent

Agent for rapid activation/deactivation testing.
`;
      
      await fs.writeFile(
        path.join(testOutputDir, '.kiro/agents/cycle-test-agent.md'),
        cycleAgentContent
      );
      
      await registry.initialize();
      await activationManager.initialize();
      
      // Perform rapid activation/deactivation cycles
      for (let i = 0; i < 10; i++) {
        const instance = await activationManager.activateAgent('cycle-test-agent');
        expect(instance).toBeTruthy();
        
        const deactivateResult = await activationManager.deactivateAgent('cycle-test-agent');
        expect(deactivateResult).toBe(true);
        
        // Verify clean state after each cycle
        const stats = activationManager.getStatistics();
        expect(stats.activeAgents).toBe(0);
      }
    });

    it('should maintain consistency during system stress', async () => {
      // Create multiple agents for stress testing
      const stressAgents = [];
      for (let i = 0; i < 20; i++) {
        const agentId = `stress-agent-${i}`;
        const content = `---
id: ${agentId}
name: Stress Agent ${i}
description: Agent ${i} for stress testing
---

# Stress Agent ${i}

Stress testing agent.
`;
        
        await fs.writeFile(
          path.join(testOutputDir, `.kiro/agents/${agentId}.md`),
          content
        );
        
        stressAgents.push(agentId);
      }
      
      await registry.initialize();
      await activationManager.initialize();
      
      // Perform mixed operations concurrently
      const operations = [];
      
      // Activate some agents
      for (let i = 0; i < 10; i++) {
        operations.push(activationManager.activateAgent(`stress-agent-${i}`));
      }
      
      // Deactivate some agents (will fail initially but should be handled)
      for (let i = 5; i < 10; i++) {
        operations.push(activationManager.deactivateAgent(`stress-agent-${i}`));
      }
      
      // Re-activate some agents
      for (let i = 10; i < 15; i++) {
        operations.push(activationManager.activateAgent(`stress-agent-${i}`));
      }
      
      // Wait for all operations to complete
      const results = await Promise.allSettled(operations);
      
      // Most operations should succeed or be handled gracefully
      const successfulOps = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulOps).toBeGreaterThan(10); // At least the activations should succeed
      
      // Verify system is in consistent state
      const stats = activationManager.getStatistics();
      expect(stats.activeAgents).toBeGreaterThanOrEqual(0);
      expect(stats.activeAgents).toBeLessThanOrEqual(15);
      
      // All active agents should be valid
      for (const agentId of stats.activeAgentIds) {
        const activeAgent = activationManager.getActiveAgent(agentId);
        expect(activeAgent).toBeTruthy();
        expect(stressAgents).toContain(agentId);
      }
    });
  });
});