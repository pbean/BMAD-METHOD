# Kiro Agent Integration Extension Guide

## Overview

This guide provides detailed instructions for extending the Kiro Agent Integration system to support new types of BMad agents, custom transformation rules, and domain-specific integrations.

## Table of Contents

1. [Extension Architecture](#extension-architecture)
2. [Adding New Agent Types](#adding-new-agent-types)
3. [Custom Transformation Rules](#custom-transformation-rules)
4. [Domain-Specific Context Injection](#domain-specific-context-injection)
5. [Custom Hook Generators](#custom-hook-generators)
6. [Template Conversion Extensions](#template-conversion-extensions)
7. [Expansion Pack Integration](#expansion-pack-integration)
8. [Plugin System](#plugin-system)
9. [Testing Extensions](#testing-extensions)
10. [Best Practices](#best-practices)

## Extension Architecture

The Kiro Agent Integration system is designed with extensibility in mind. Key extension points include:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discovery     │    │  Transformation │    │   Registration  │
│   Extensions    │    │   Extensions    │    │   Extensions    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Custom Scanners │    │ Transform Rules │    │ Custom Handlers │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Extension Interfaces

#### IAgentScanner
```typescript
interface IAgentScanner {
  name: string;
  priority: number;
  applies(path: string): boolean;
  scan(path: string): Promise<AgentMetadata[]>;
}
```

#### ITransformationRule
```typescript
interface ITransformationRule {
  name: string;
  priority: number;
  applies(agent: AgentMetadata): boolean;
  transform(agent: AgentMetadata): Promise<Partial<ConvertedAgent>>;
}
```

#### IContextInjector
```typescript
interface IContextInjector {
  name: string;
  injectContext(agent: AgentMetadata, options?: any): Promise<KiroIntegration>;
}
```

## Adding New Agent Types

### Step 1: Create Agent Scanner

Create a custom scanner for your new agent type:

```javascript
// tools/kiro-adapter/scanners/custom-agent-scanner.js
const { BaseAgentScanner } = require('../base-scanner');

class CustomAgentScanner extends BaseAgentScanner {
  constructor() {
    super();
    this.name = 'custom-agent-scanner';
    this.priority = 10; // Higher priority runs first
  }

  /**
   * Determines if this scanner applies to the given path
   * @param {string} path - Directory or file path
   * @returns {boolean} True if this scanner should process the path
   */
  applies(path) {
    return path.includes('custom-agents') || 
           path.endsWith('.custom-agent');
  }

  /**
   * Scans for custom agents in the given path
   * @param {string} path - Path to scan
   * @returns {Promise<AgentMetadata[]>} Array of discovered agents
   */
  async scan(path) {
    const agents = [];
    const files = await this.getFiles(path, '*.custom-agent');
    
    for (const file of files) {
      try {
        const metadata = await this.extractCustomMetadata(file);
        agents.push(metadata);
      } catch (error) {
        this.logger.warn(`Failed to process custom agent ${file}:`, error);
      }
    }
    
    return agents;
  }

  /**
   * Extracts metadata from custom agent file
   * @param {string} filePath - Path to agent file
   * @returns {Promise<AgentMetadata>} Agent metadata
   */
  async extractCustomMetadata(filePath) {
    const content = await this.readFile(filePath);
    const parsed = this.parseCustomFormat(content);
    
    return {
      id: parsed.id || this.generateId(filePath),
      name: parsed.name || 'Unnamed Custom Agent',
      description: parsed.description || '',
      source: 'custom',
      customType: parsed.type,
      filePath,
      lastModified: await this.getLastModified(filePath),
      dependencies: this.extractDependencies(parsed),
      customMetadata: parsed.metadata || {},
      content: content
    };
  }

  /**
   * Parses custom agent file format
   * @param {string} content - File content
   * @returns {object} Parsed agent data
   */
  parseCustomFormat(content) {
    // Implement your custom parsing logic
    // This could be JSON, YAML, XML, or any custom format
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid custom agent format: ${error.message}`);
    }
  }
}

module.exports = CustomAgentScanner;
```

### Step 2: Register Scanner

Register your scanner with the discovery system:

```javascript
// tools/kiro-adapter/agent-discovery.js
const CustomAgentScanner = require('./scanners/custom-agent-scanner');

class AgentDiscovery {
  constructor(options = {}) {
    this.scanners = [
      new DefaultAgentScanner(),
      new ExpansionPackScanner(),
      new CustomAgentScanner(), // Add your scanner
      ...this.loadCustomScanners(options.customScanners)
    ];
  }

  /**
   * Loads additional custom scanners
   * @param {string[]} scannerPaths - Paths to custom scanner modules
   * @returns {IAgentScanner[]} Array of scanner instances
   */
  loadCustomScanners(scannerPaths = []) {
    return scannerPaths.map(path => {
      const ScannerClass = require(path);
      return new ScannerClass();
    });
  }
}
```

### Step 3: Create Tests

Add comprehensive tests for your scanner:

```javascript
// tools/kiro-adapter/__tests__/scanners/custom-agent-scanner.test.js
const CustomAgentScanner = require('../../scanners/custom-agent-scanner');
const { createTempDir, createTestFile } = require('../utils/test-helpers');

describe('CustomAgentScanner', () => {
  let scanner;
  let tempDir;

  beforeEach(async () => {
    scanner = new CustomAgentScanner();
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('applies', () => {
    it('should apply to custom-agents directories', () => {
      expect(scanner.applies('path/to/custom-agents')).toBe(true);
    });

    it('should apply to .custom-agent files', () => {
      expect(scanner.applies('agent.custom-agent')).toBe(true);
    });

    it('should not apply to regular directories', () => {
      expect(scanner.applies('regular/path')).toBe(false);
    });
  });

  describe('scan', () => {
    it('should discover custom agents', async () => {
      // Create test custom agent file
      const agentContent = JSON.stringify({
        id: 'test-custom-agent',
        name: 'Test Custom Agent',
        description: 'A test custom agent',
        type: 'custom-type',
        dependencies: {
          tasks: ['custom-task.md']
        }
      });

      await createTestFile(
        `${tempDir}/test-agent.custom-agent`,
        agentContent
      );

      const agents = await scanner.scan(tempDir);

      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('test-custom-agent');
      expect(agents[0].source).toBe('custom');
      expect(agents[0].customType).toBe('custom-type');
    });

    it('should handle malformed custom agent files', async () => {
      await createTestFile(
        `${tempDir}/invalid.custom-agent`,
        'invalid json content'
      );

      const agents = await scanner.scan(tempDir);

      expect(agents).toHaveLength(0);
      // Should log warning but not throw
    });
  });
});
```

## Custom Transformation Rules

### Creating Transformation Rules

Transformation rules allow you to customize how specific types of agents are converted:

```javascript
// tools/kiro-adapter/transformation-rules/custom-rule.js
class CustomTransformationRule {
  constructor() {
    this.name = 'custom-transformation-rule';
    this.priority = 5; // Lower priority runs after higher priority rules
  }

  /**
   * Determines if this rule applies to the given agent
   * @param {AgentMetadata} agent - Agent metadata
   * @returns {boolean} True if rule should be applied
   */
  applies(agent) {
    return agent.source === 'custom' && 
           agent.customType === 'special-agent';
  }

  /**
   * Transforms the agent according to custom rules
   * @param {AgentMetadata} agent - Agent to transform
   * @returns {Promise<Partial<ConvertedAgent>>} Transformation result
   */
  async transform(agent) {
    const baseTransformation = await this.getBaseTransformation(agent);
    
    return {
      ...baseTransformation,
      kiroIntegration: {
        ...baseTransformation.kiroIntegration,
        steering: [
          ...baseTransformation.kiroIntegration.steering,
          await this.generateCustomSteering(agent)
        ],
        hooks: [
          ...baseTransformation.kiroIntegration.hooks,
          await this.generateCustomHooks(agent)
        ],
        contextPrompts: [
          ...baseTransformation.kiroIntegration.contextPrompts,
          this.generateCustomContext(agent)
        ]
      },
      customProperties: {
        specialFeature: agent.customMetadata.specialFeature,
        customConfig: this.processCustomConfig(agent.customMetadata.config)
      }
    };
  }

  /**
   * Generates custom steering rules for the agent
   * @param {AgentMetadata} agent - Agent metadata
   * @returns {Promise<string>} Path to generated steering file
   */
  async generateCustomSteering(agent) {
    const steeringContent = `
# Custom Steering for ${agent.name}

## Special Instructions

This agent has custom capabilities that require special handling:

- Custom feature: ${agent.customMetadata.specialFeature}
- Configuration: ${JSON.stringify(agent.customMetadata.config, null, 2)}

## Context Integration

When working with this agent, consider:
1. The special feature requirements
2. Custom configuration parameters
3. Domain-specific constraints

## Usage Guidelines

${this.generateUsageGuidelines(agent)}
`;

    const steeringPath = `.kiro/steering/${agent.id}-custom.md`;
    await this.writeFile(steeringPath, steeringContent);
    return steeringPath;
  }

  /**
   * Generates custom hooks for the agent
   * @param {AgentMetadata} agent - Agent metadata
   * @returns {Promise<string>} Path to generated hook file
   */
  async generateCustomHooks(agent) {
    const hookContent = `
// Custom hooks for ${agent.name}

module.exports = {
  name: '${agent.id}-custom-hooks',
  
  triggers: [
    {
      event: 'file-save',
      pattern: '*.${agent.customMetadata.fileExtension}',
      action: 'process-custom-file'
    }
  ],
  
  actions: {
    'process-custom-file': async (context) => {
      // Custom processing logic
      const processor = new CustomFileProcessor(${JSON.stringify(agent.customMetadata.config)});
      return await processor.process(context.file);
    }
  }
};
`;

    const hookPath = `.kiro/hooks/${agent.id}-custom.js`;
    await this.writeFile(hookPath, hookContent);
    return hookPath;
  }

  /**
   * Generates custom context prompts
   * @param {AgentMetadata} agent - Agent metadata
   * @returns {string} Custom context prompt
   */
  generateCustomContext(agent) {
    return `
You are working with a custom agent (${agent.name}) that has special capabilities:

Special Feature: ${agent.customMetadata.specialFeature}
Configuration: ${JSON.stringify(agent.customMetadata.config)}

When using this agent:
1. Always consider the special feature requirements
2. Apply the custom configuration parameters
3. Follow domain-specific best practices
4. Validate outputs against custom criteria
`;
  }
}

module.exports = CustomTransformationRule;
```

### Registering Transformation Rules

```javascript
// tools/kiro-adapter/agent-transformer.js
const CustomTransformationRule = require('./transformation-rules/custom-rule');

class AgentTransformer {
  constructor(options = {}) {
    this.rules = [
      new DefaultTransformationRule(),
      new ExpansionPackRule(),
      new CustomTransformationRule(), // Add your rule
      ...this.loadCustomRules(options.customRules)
    ];
    
    // Sort by priority (higher first)
    this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Applies all applicable transformation rules to an agent
   * @param {AgentMetadata} agent - Agent to transform
   * @returns {Promise<ConvertedAgent>} Transformed agent
   */
  async transformAgent(agent) {
    let result = this.createBaseAgent(agent);
    
    for (const rule of this.rules) {
      if (rule.applies(agent)) {
        const transformation = await rule.transform(agent);
        result = this.mergeTransformations(result, transformation);
      }
    }
    
    return result;
  }
}
```

## Domain-Specific Context Injection

### Creating Context Injectors

For domain-specific context injection:

```javascript
// tools/kiro-adapter/context-injectors/game-dev-injector.js
const { BaseContextInjector } = require('../base-context-injector');

class GameDevContextInjector extends BaseContextInjector {
  constructor() {
    super();
    this.name = 'game-dev-context-injector';
  }

  /**
   * Injects game development specific context
   * @param {AgentMetadata} agent - Agent metadata
   * @param {object} options - Injection options
   * @returns {Promise<KiroIntegration>} Kiro integration object
   */
  async injectContext(agent, options = {}) {
    const baseContext = await super.injectContext(agent, options);
    
    if (!this.isGameDevAgent(agent)) {
      return baseContext;
    }

    const gameDevContext = await this.generateGameDevContext(agent);
    
    return {
      ...baseContext,
      steering: [
        ...baseContext.steering,
        await this.createGameDevSteering(agent)
      ],
      hooks: [
        ...baseContext.hooks,
        await this.createGameDevHooks(agent)
      ],
      contextPrompts: [
        ...baseContext.contextPrompts,
        gameDevContext.contextPrompt
      ],
      domainSpecific: {
        gameEngine: gameDevContext.gameEngine,
        targetPlatforms: gameDevContext.targetPlatforms,
        gameGenre: gameDevContext.gameGenre,
        developmentPhase: gameDevContext.developmentPhase
      }
    };
  }

  /**
   * Determines if agent is game development related
   * @param {AgentMetadata} agent - Agent metadata
   * @returns {boolean} True if game dev agent
   */
  isGameDevAgent(agent) {
    return agent.expansionPack?.includes('game') ||
           agent.id.includes('game') ||
           agent.dependencies.tasks.some(task => task.includes('game'));
  }

  /**
   * Generates game development specific context
   * @param {AgentMetadata} agent - Agent metadata
   * @returns {Promise<object>} Game dev context
   */
  async generateGameDevContext(agent) {
    const expansionPackConfig = await this.loadExpansionPackConfig(agent.expansionPack);
    
    return {
      gameEngine: expansionPackConfig.gameEngine || 'Unity',
      targetPlatforms: expansionPackConfig.targetPlatforms || ['PC', 'Mobile'],
      gameGenre: this.detectGameGenre(agent),
      developmentPhase: this.detectDevelopmentPhase(agent),
      contextPrompt: this.generateGameDevPrompt(agent, expansionPackConfig)
    };
  }

  /**
   * Creates game development steering rules
   * @param {AgentMetadata} agent - Agent metadata
   * @returns {Promise<string>} Steering file path
   */
  async createGameDevSteering(agent) {
    const steeringContent = `
# Game Development Steering for ${agent.name}

## Game Development Context

This agent specializes in game development and should:

1. **Follow Game Development Best Practices**
   - Use appropriate design patterns (Component, Observer, State Machine)
   - Consider performance implications for real-time systems
   - Implement proper resource management
   - Follow platform-specific guidelines

2. **Game Engine Integration**
   - Understand ${this.getGameEngine(agent)} specific APIs and workflows
   - Generate code compatible with the target engine
   - Consider engine-specific optimization techniques

3. **Platform Considerations**
   - Account for target platform limitations
   - Implement platform-specific features when needed
   - Consider input methods and screen sizes

4. **Game Design Principles**
   - Focus on player experience and engagement
   - Consider game balance and progression
   - Implement appropriate feedback systems

## Code Generation Guidelines

When generating game code:
- Use meaningful variable names that reflect game concepts
- Include comments explaining game logic
- Structure code for easy iteration and testing
- Consider multiplayer implications if applicable

## Testing Considerations

- Include unit tests for game logic
- Consider integration tests for game systems
- Plan for playtesting and user feedback
- Implement debugging and profiling tools
`;

    const steeringPath = `.kiro/steering/${agent.id}-gamedev.md`;
    await this.writeFile(steeringPath, steeringContent);
    return steeringPath;
  }
}

module.exports = GameDevContextInjector;
```

## Custom Hook Generators

### Creating Hook Generators

```javascript
// tools/kiro-adapter/hook-generators/workflow-hook-generator.js
class WorkflowHookGenerator {
  constructor() {
    this.name = 'workflow-hook-generator';
  }

  /**
   * Generates workflow-based hooks for an agent
   * @param {AgentMetadata} agent - Agent metadata
   * @returns {Promise<string[]>} Array of generated hook file paths
   */
  async generateHooks(agent) {
    const hooks = [];
    
    if (this.hasWorkflowCapabilities(agent)) {
      hooks.push(await this.generateWorkflowTriggerHook(agent));
      hooks.push(await this.generateProgressTrackingHook(agent));
      hooks.push(await this.generateValidationHook(agent));
    }
    
    return hooks;
  }

  /**
   * Generates workflow trigger hook
   * @param {AgentMetadata} agent - Agent metadata
   * @returns {Promise<string>} Hook file path
   */
  async generateWorkflowTriggerHook(agent) {
    const hookContent = `
// Workflow trigger hook for ${agent.name}

module.exports = {
  name: '${agent.id}-workflow-trigger',
  description: 'Triggers ${agent.name} workflow based on project state',
  
  triggers: [
    {
      event: 'project-initialized',
      condition: (context) => {
        return context.projectType === '${this.getProjectType(agent)}';
      }
    },
    {
      event: 'milestone-completed',
      condition: (context) => {
        return context.milestone === '${this.getTriggerMilestone(agent)}';
      }
    }
  ],
  
  actions: {
    'trigger-workflow': async (context) => {
      const workflowManager = require('../workflow-manager');
      const workflow = await workflowManager.loadWorkflow('${agent.id}-workflow');
      
      return await workflow.execute(context);
    }
  },
  
  settings: {
    autoTrigger: true,
    priority: ${this.getHookPriority(agent)},
    timeout: 30000
  }
};
`;

    const hookPath = `.kiro/hooks/${agent.id}-workflow-trigger.js`;
    await this.writeFile(hookPath, hookContent);
    return hookPath;
  }

  /**
   * Generates progress tracking hook
   * @param {AgentMetadata} agent - Agent metadata
   * @returns {Promise<string>} Hook file path
   */
  async generateProgressTrackingHook(agent) {
    const hookContent = `
// Progress tracking hook for ${agent.name}

module.exports = {
  name: '${agent.id}-progress-tracker',
  description: 'Tracks progress of ${agent.name} workflow',
  
  triggers: [
    {
      event: 'task-completed',
      pattern: '${agent.id}-*'
    },
    {
      event: 'workflow-step-completed',
      pattern: '${agent.id}-workflow'
    }
  ],
  
  actions: {
    'update-progress': async (context) => {
      const progressTracker = require('../progress-tracker');
      
      await progressTracker.updateProgress({
        workflowId: '${agent.id}-workflow',
        stepId: context.stepId,
        status: context.status,
        timestamp: new Date(),
        metadata: context.metadata
      });
      
      // Notify user of progress
      if (context.status === 'completed') {
        await this.notifyUser(\`Step \${context.stepId} completed successfully\`);
      }
    }
  }
};
`;

    const hookPath = `.kiro/hooks/${agent.id}-progress-tracker.js`;
    await this.writeFile(hookPath, hookContent);
    return hookPath;
  }
}

module.exports = WorkflowHookGenerator;
```

## Template Conversion Extensions

### Custom Template Converters

```javascript
// tools/kiro-adapter/template-converters/custom-template-converter.js
class CustomTemplateConverter {
  constructor() {
    this.name = 'custom-template-converter';
  }

  /**
   * Determines if this converter applies to the template
   * @param {string} templatePath - Path to template file
   * @returns {boolean} True if converter applies
   */
  applies(templatePath) {
    return templatePath.includes('custom-templates') ||
           templatePath.endsWith('.custom-template');
  }

  /**
   * Converts custom template to Kiro spec format
   * @param {string} templatePath - Path to template file
   * @returns {Promise<ConvertedTemplate>} Converted template
   */
  async convertTemplate(templatePath) {
    const templateContent = await this.readFile(templatePath);
    const parsed = this.parseCustomTemplate(templateContent);
    
    const spec = {
      id: parsed.id || this.generateId(templatePath),
      name: parsed.name || 'Unnamed Custom Template',
      description: parsed.description || '',
      specType: 'custom-template',
      originalTemplate: templatePath,
      requirements: await this.generateRequirements(parsed),
      design: await this.generateDesign(parsed),
      tasks: await this.generateTasks(parsed),
      customProperties: parsed.customProperties || {}
    };
    
    const outputPath = `.kiro/spec-templates/${spec.id}.md`;
    await this.writeSpecFile(outputPath, spec);
    
    return {
      ...spec,
      outputPath
    };
  }

  /**
   * Parses custom template format
   * @param {string} content - Template content
   * @returns {object} Parsed template data
   */
  parseCustomTemplate(content) {
    // Implement custom template parsing logic
    const sections = this.splitIntoSections(content);
    
    return {
      id: this.extractId(sections.header),
      name: this.extractName(sections.header),
      description: this.extractDescription(sections.header),
      instructions: sections.instructions,
      parameters: this.parseParameters(sections.parameters),
      customProperties: this.parseCustomProperties(sections.custom)
    };
  }

  /**
   * Generates requirements from template
   * @param {object} parsed - Parsed template data
   * @returns {Promise<string>} Requirements markdown
   */
  async generateRequirements(parsed) {
    const requirements = [];
    
    // Extract requirements from instructions
    const instructionRequirements = this.extractRequirementsFromInstructions(parsed.instructions);
    requirements.push(...instructionRequirements);
    
    // Generate requirements from parameters
    const parameterRequirements = this.generateParameterRequirements(parsed.parameters);
    requirements.push(...parameterRequirements);
    
    return this.formatRequirements(requirements);
  }

  /**
   * Generates design from template
   * @param {object} parsed - Parsed template data
   * @returns {Promise<string>} Design markdown
   */
  async generateDesign(parsed) {
    return `
# ${parsed.name} Design

## Overview
${parsed.description}

## Architecture
${this.generateArchitectureFromInstructions(parsed.instructions)}

## Components
${this.generateComponentsFromParameters(parsed.parameters)}

## Implementation Details
${this.generateImplementationDetails(parsed.customProperties)}
`;
  }

  /**
   * Generates tasks from template
   * @param {object} parsed - Parsed template data
   * @returns {Promise<string[]>} Array of task descriptions
   */
  async generateTasks(parsed) {
    const tasks = [];
    
    // Convert instructions to tasks
    const instructionTasks = this.convertInstructionsToTasks(parsed.instructions);
    tasks.push(...instructionTasks);
    
    // Generate validation tasks
    const validationTasks = this.generateValidationTasks(parsed.parameters);
    tasks.push(...validationTasks);
    
    return tasks;
  }
}

module.exports = CustomTemplateConverter;
```

## Expansion Pack Integration

### Creating Expansion Pack Adapters

```javascript
// tools/kiro-adapter/expansion-adapters/domain-adapter.js
class DomainExpansionAdapter {
  constructor(domain) {
    this.domain = domain;
    this.name = `${domain}-expansion-adapter`;
  }

  /**
   * Adapts expansion pack agents for Kiro integration
   * @param {AgentMetadata[]} agents - Expansion pack agents
   * @returns {Promise<AgentMetadata[]>} Adapted agents
   */
  async adaptAgents(agents) {
    const adapted = [];
    
    for (const agent of agents) {
      if (this.belongsToDomain(agent)) {
        const adaptedAgent = await this.adaptAgent(agent);
        adapted.push(adaptedAgent);
      }
    }
    
    return adapted;
  }

  /**
   * Adapts individual agent for domain
   * @param {AgentMetadata} agent - Agent to adapt
   * @returns {Promise<AgentMetadata>} Adapted agent
   */
  async adaptAgent(agent) {
    const domainContext = await this.loadDomainContext();
    
    return {
      ...agent,
      domainSpecific: {
        domain: this.domain,
        context: domainContext,
        specializations: this.getAgentSpecializations(agent),
        integrations: this.getRequiredIntegrations(agent)
      },
      dependencies: {
        ...agent.dependencies,
        domainData: this.getDomainDataDependencies(agent),
        domainTemplates: this.getDomainTemplateDependencies(agent)
      }
    };
  }

  /**
   * Loads domain-specific context
   * @returns {Promise<object>} Domain context
   */
  async loadDomainContext() {
    const contextPath = `expansion-packs/${this.domain}/data/domain-context.yaml`;
    
    try {
      const content = await this.readFile(contextPath);
      return yaml.load(content);
    } catch (error) {
      this.logger.warn(`Failed to load domain context for ${this.domain}:`, error);
      return {};
    }
  }

  /**
   * Gets agent specializations for the domain
   * @param {AgentMetadata} agent - Agent metadata
   * @returns {string[]} Array of specializations
   */
  getAgentSpecializations(agent) {
    const specializations = [];
    
    // Analyze agent content for domain-specific patterns
    if (agent.content.includes('game')) {
      specializations.push('game-development');
    }
    
    if (agent.content.includes('infrastructure')) {
      specializations.push('infrastructure-management');
    }
    
    // Add more domain-specific detection logic
    
    return specializations;
  }
}

module.exports = DomainExpansionAdapter;
```

## Plugin System

### Creating Plugin Interface

```javascript
// tools/kiro-adapter/plugins/plugin-interface.js
class KiroIntegrationPlugin {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.hooks = new Map();
    this.transformers = new Map();
    this.scanners = new Map();
  }

  /**
   * Registers a hook with the plugin
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  registerHook(event, handler) {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event).push(handler);
  }

  /**
   * Registers a transformer with the plugin
   * @param {string} type - Agent type
   * @param {ITransformationRule} transformer - Transformer instance
   */
  registerTransformer(type, transformer) {
    this.transformers.set(type, transformer);
  }

  /**
   * Registers a scanner with the plugin
   * @param {string} type - Scanner type
   * @param {IAgentScanner} scanner - Scanner instance
   */
  registerScanner(type, scanner) {
    this.scanners.set(type, scanner);
  }

  /**
   * Initializes the plugin
   * @param {object} context - Plugin context
   */
  async initialize(context) {
    // Override in subclasses
  }

  /**
   * Cleanup when plugin is unloaded
   */
  async cleanup() {
    // Override in subclasses
  }
}

module.exports = KiroIntegrationPlugin;
```

### Example Plugin Implementation

```javascript
// tools/kiro-adapter/plugins/game-dev-plugin.js
const KiroIntegrationPlugin = require('./plugin-interface');
const GameDevScanner = require('../scanners/game-dev-scanner');
const GameDevTransformer = require('../transformers/game-dev-transformer');

class GameDevPlugin extends KiroIntegrationPlugin {
  constructor() {
    super('game-dev-plugin', '1.0.0');
  }

  async initialize(context) {
    // Register scanners
    this.registerScanner('unity-agents', new GameDevScanner('unity'));
    this.registerScanner('unreal-agents', new GameDevScanner('unreal'));
    
    // Register transformers
    this.registerTransformer('game-agent', new GameDevTransformer());
    
    // Register hooks
    this.registerHook('agent-discovered', this.onAgentDiscovered.bind(this));
    this.registerHook('agent-transformed', this.onAgentTransformed.bind(this));
    
    // Initialize game development context
    await this.initializeGameDevContext(context);
  }

  async onAgentDiscovered(agent) {
    if (this.isGameDevAgent(agent)) {
      // Add game development metadata
      agent.gameDevMetadata = await this.extractGameDevMetadata(agent);
    }
  }

  async onAgentTransformed(agent) {
    if (this.isGameDevAgent(agent)) {
      // Add game development specific integrations
      await this.addGameDevIntegrations(agent);
    }
  }

  async initializeGameDevContext(context) {
    // Load game development templates
    // Set up game engine integrations
    // Initialize asset management
  }
}

module.exports = GameDevPlugin;
```

## Testing Extensions

### Testing Custom Scanners

```javascript
// tools/kiro-adapter/__tests__/extensions/custom-scanner.test.js
describe('Custom Scanner Extensions', () => {
  let customScanner;
  let testEnvironment;

  beforeEach(async () => {
    customScanner = new CustomAgentScanner();
    testEnvironment = await setupTestEnvironment();
  });

  describe('scanner registration', () => {
    it('should register custom scanner with discovery system', () => {
      const discovery = new AgentDiscovery({
        customScanners: ['./scanners/custom-agent-scanner']
      });
      
      expect(discovery.scanners).toContainEqual(
        expect.objectContaining({ name: 'custom-agent-scanner' })
      );
    });
  });

  describe('custom agent detection', () => {
    it('should detect custom agent format', async () => {
      await testEnvironment.createCustomAgent({
        id: 'test-custom',
        type: 'special-agent',
        customProperty: 'test-value'
      });

      const agents = await customScanner.scan(testEnvironment.path);
      
      expect(agents).toHaveLength(1);
      expect(agents[0].customType).toBe('special-agent');
      expect(agents[0].customMetadata.customProperty).toBe('test-value');
    });
  });
});
```

### Testing Transformation Rules

```javascript
// tools/kiro-adapter/__tests__/extensions/transformation-rules.test.js
describe('Custom Transformation Rules', () => {
  let transformer;
  let customRule;

  beforeEach(() => {
    customRule = new CustomTransformationRule();
    transformer = new AgentTransformer({
      customRules: [customRule]
    });
  });

  describe('rule application', () => {
    it('should apply custom rule to matching agents', async () => {
      const agent = createMockAgent({
        source: 'custom',
        customType: 'special-agent'
      });

      const result = await transformer.transformAgent(agent);

      expect(result.customProperties).toBeDefined();
      expect(result.kiroIntegration.steering).toContain(
        expect.stringMatching(/custom\.md$/)
      );
    });

    it('should not apply rule to non-matching agents', async () => {
      const agent = createMockAgent({
        source: 'bmad-core'
      });

      const result = await transformer.transformAgent(agent);

      expect(result.customProperties).toBeUndefined();
    });
  });
});
```

### Testing Plugin System

```javascript
// tools/kiro-adapter/__tests__/extensions/plugin-system.test.js
describe('Plugin System', () => {
  let pluginManager;
  let testPlugin;

  beforeEach(() => {
    pluginManager = new PluginManager();
    testPlugin = new TestPlugin();
  });

  describe('plugin loading', () => {
    it('should load and initialize plugin', async () => {
      await pluginManager.loadPlugin(testPlugin);

      expect(pluginManager.getLoadedPlugins()).toContain(testPlugin);
      expect(testPlugin.initialized).toBe(true);
    });

    it('should register plugin components', async () => {
      await pluginManager.loadPlugin(testPlugin);

      expect(pluginManager.getScanners()).toContain(
        expect.objectContaining({ name: 'test-scanner' })
      );
      expect(pluginManager.getTransformers()).toContain(
        expect.objectContaining({ name: 'test-transformer' })
      );
    });
  });

  describe('plugin hooks', () => {
    it('should execute plugin hooks on events', async () => {
      const hookSpy = jest.spyOn(testPlugin, 'onAgentDiscovered');
      await pluginManager.loadPlugin(testPlugin);

      const agent = createMockAgent();
      await pluginManager.emitEvent('agent-discovered', agent);

      expect(hookSpy).toHaveBeenCalledWith(agent);
    });
  });
});
```

## Best Practices

### Extension Development Guidelines

1. **Follow Interface Contracts**
   - Implement all required interface methods
   - Handle errors gracefully
   - Provide meaningful error messages

2. **Maintain Backward Compatibility**
   - Don't break existing functionality
   - Provide migration paths for changes
   - Version your extensions appropriately

3. **Performance Considerations**
   - Optimize for common use cases
   - Implement caching where appropriate
   - Monitor memory usage

4. **Testing Requirements**
   - Write comprehensive tests
   - Include edge cases
   - Test integration with core system

5. **Documentation Standards**
   - Document all public APIs
   - Provide usage examples
   - Include troubleshooting guides

### Common Pitfalls to Avoid

1. **Tight Coupling**
   - Don't depend on internal implementation details
   - Use provided interfaces and extension points
   - Make extensions configurable

2. **Resource Leaks**
   - Clean up resources in cleanup methods
   - Handle async operations properly
   - Monitor memory usage

3. **Error Handling**
   - Don't let extension errors crash the system
   - Provide meaningful error messages
   - Implement proper logging

4. **Configuration Management**
   - Make extensions configurable
   - Validate configuration parameters
   - Provide sensible defaults

### Extension Lifecycle

1. **Development Phase**
   - Plan extension architecture
   - Implement core functionality
   - Write comprehensive tests

2. **Integration Phase**
   - Test with core system
   - Validate performance impact
   - Update documentation

3. **Deployment Phase**
   - Package extension properly
   - Provide installation instructions
   - Monitor for issues

4. **Maintenance Phase**
   - Keep up with core system changes
   - Address user feedback
   - Maintain compatibility

This extension guide provides the foundation for creating powerful extensions to the Kiro Agent Integration system. For specific implementation examples, refer to the existing extension implementations in the codebase.