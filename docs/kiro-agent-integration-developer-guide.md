# Kiro Agent Integration Developer Guide

## Overview

This guide provides comprehensive documentation for developers working with the BMad Method Kiro integration system. It covers the agent conversion architecture, extension patterns, API documentation, and contribution guidelines.

## Architecture Overview

The Kiro agent integration system transforms BMad Method agents into Kiro-compatible format through a multi-phase conversion pipeline:

```
BMad Agents → Discovery → Transformation → Registration → Activation
```

### Core Components

#### 1. Agent Discovery System
- **Purpose**: Scans and catalogs all BMad agents (core and expansion packs)
- **Location**: `tools/kiro-adapter/agent-discovery.js`
- **Key Classes**: `AgentDiscovery`

#### 2. Agent Transformation Pipeline
- **Purpose**: Converts BMad agents to Kiro format with proper context injection
- **Location**: `tools/kiro-adapter/agent-transformer.js`
- **Key Classes**: `AgentTransformer`, `KiroContextInjector`

#### 3. Template and Workflow Conversion
- **Purpose**: Converts BMad templates and workflows to Kiro specs
- **Location**: `tools/kiro-adapter/template-converter.js`
- **Key Classes**: `TemplateConverter`, `WorkflowIntegrator`

#### 4. Agent Registration System
- **Purpose**: Registers converted agents with Kiro's native system
- **Location**: `tools/kiro-adapter/kiro-agent-registry.js`
- **Key Classes**: `KiroAgentRegistry`, `ActivationManager`

## Agent Conversion Architecture

### Discovery Phase

The discovery system scans for agents in multiple locations:

```javascript
// Core agents
bmad-core/agents/*.md

// Expansion pack agents
expansion-packs/*/agents/*.md
```

**Key Methods:**
- `AgentDiscovery.scanAllAgents()` - Discovers all available agents
- `AgentDiscovery.scanExpansionPacks()` - Scans expansion pack agents
- `AgentDiscovery.extractMetadata()` - Extracts agent metadata

### Transformation Phase

Agents undergo multi-step transformation:

1. **Context Injection**: Adds Kiro-specific context and integration points
2. **Dependency Resolution**: Identifies and includes required resources
3. **Steering Generation**: Creates steering rules for agent behavior
4. **Hook Generation**: Creates automation hooks for workflows

**Key Methods:**
- `AgentTransformer.transformAgent()` - Main transformation entry point
- `KiroContextInjector.injectContext()` - Adds Kiro integration context
- `DependencyResolver.resolveDependencies()` - Handles agent dependencies

### Registration Phase

Converted agents are registered with Kiro's native agent system:

```javascript
const registry = new KiroAgentRegistry();
await registry.registerAgent(convertedAgent);
```

**Key Methods:**
- `KiroAgentRegistry.registerAgent()` - Registers agent with Kiro
- `ActivationManager.createActivationHandler()` - Creates activation logic
- `ActivationManager.loadDependencies()` - Ensures dependencies are available

## Data Models

### Agent Metadata Structure

```javascript
{
  id: string,                    // Unique agent identifier
  name: string,                  // Display name
  description: string,           // Agent description
  source: 'bmad-core' | 'expansion-pack',
  expansionPack?: string,        // Expansion pack name if applicable
  dependencies: {
    tasks: string[],             // Required task files
    templates: string[],         // Required template files
    checklists: string[],        // Required checklist files
    data: string[]               // Required data files
  },
  kiroIntegration: {
    steering: string[],          // Generated steering files
    hooks: string[],             // Generated hook files
    contextPrompts: string[]     // Context injection prompts
  },
  originalPath: string,          // Source file path
  convertedPath: string          // Output file path
}
```

### Conversion Configuration

```javascript
{
  sourceDirectories: {
    core: 'bmad-core/agents/',
    expansionPacks: 'expansion-packs/*/agents/'
  },
  outputDirectories: {
    agents: '.kiro/agents/',
    steering: '.kiro/steering/',
    hooks: '.kiro/hooks/',
    templates: '.kiro/spec-templates/'
  },
  conversionOptions: {
    enableContextInjection: boolean,
    generateSteeringRules: boolean,
    createHooks: boolean,
    convertTemplates: boolean
  }
}
```

## API Documentation

### AgentDiscovery API

#### `scanAllAgents(): Promise<AgentMetadata[]>`
Discovers all BMad agents in the project.

**Returns**: Array of agent metadata objects
**Throws**: `DiscoveryError` if scanning fails

#### `scanDirectory(path: string): Promise<AgentMetadata[]>`
Scans a specific directory for agents.

**Parameters**:
- `path`: Directory path to scan

**Returns**: Array of agent metadata objects

### AgentTransformer API

#### `transformAgent(metadata: AgentMetadata): Promise<ConvertedAgent>`
Transforms a BMad agent to Kiro format.

**Parameters**:
- `metadata`: Agent metadata from discovery phase

**Returns**: Converted agent object
**Throws**: `TransformationError` if conversion fails

#### `batchTransform(agents: AgentMetadata[]): Promise<ConvertedAgent[]>`
Transforms multiple agents in batch.

**Parameters**:
- `agents`: Array of agent metadata objects

**Returns**: Array of converted agent objects

### KiroAgentRegistry API

#### `registerAgent(agent: ConvertedAgent): Promise<void>`
Registers an agent with Kiro's native system.

**Parameters**:
- `agent`: Converted agent object

**Throws**: `RegistrationError` if registration fails

#### `getRegisteredAgents(): Map<string, ConvertedAgent>`
Returns all currently registered agents.

**Returns**: Map of agent ID to converted agent object

### ActivationManager API

#### `activateAgent(agentId: string, context: any): Promise<AgentInstance>`
Activates a registered agent.

**Parameters**:
- `agentId`: Unique agent identifier
- `context`: Activation context

**Returns**: Active agent instance
**Throws**: `ActivationError` if activation fails

## Extension Guide

### Adding New Agent Types

To support new types of BMad agents:

1. **Extend Agent Discovery**:
```javascript
class CustomAgentDiscovery extends AgentDiscovery {
  async scanCustomAgents() {
    // Custom scanning logic
  }
}
```

2. **Create Custom Transformer**:
```javascript
class CustomAgentTransformer extends AgentTransformer {
  transformCustomAgent(metadata) {
    // Custom transformation logic
  }
}
```

3. **Register Custom Types**:
```javascript
const registry = new KiroAgentRegistry();
registry.addTransformer('custom-type', new CustomAgentTransformer());
```

### Adding New Conversion Rules

Create custom conversion rules for specific agent patterns:

```javascript
class CustomConversionRule {
  applies(agent) {
    // Return true if this rule applies to the agent
  }
  
  transform(agent) {
    // Apply custom transformation
  }
}

// Register the rule
AgentTransformer.addRule(new CustomConversionRule());
```

### Creating Custom Context Injectors

For domain-specific context injection:

```javascript
class DomainContextInjector extends KiroContextInjector {
  injectDomainContext(agent, domain) {
    return {
      ...agent,
      domainSpecificContext: this.generateDomainContext(domain)
    };
  }
}
```

## Testing Framework

### Unit Testing

Test individual components:

```javascript
// Test agent discovery
describe('AgentDiscovery', () => {
  it('should discover all core agents', async () => {
    const discovery = new AgentDiscovery();
    const agents = await discovery.scanAllAgents();
    expect(agents.length).toBeGreaterThan(0);
  });
});

// Test agent transformation
describe('AgentTransformer', () => {
  it('should transform agent correctly', async () => {
    const transformer = new AgentTransformer();
    const result = await transformer.transformAgent(mockAgent);
    expect(result.kiroIntegration).toBeDefined();
  });
});
```

### Integration Testing

Test component interactions:

```javascript
describe('Agent Integration', () => {
  it('should complete full conversion pipeline', async () => {
    const discovery = new AgentDiscovery();
    const transformer = new AgentTransformer();
    const registry = new KiroAgentRegistry();
    
    const agents = await discovery.scanAllAgents();
    const converted = await transformer.batchTransform(agents);
    
    for (const agent of converted) {
      await registry.registerAgent(agent);
    }
    
    expect(registry.getRegisteredAgents().size).toBe(converted.length);
  });
});
```

### End-to-End Testing

Test complete workflows:

```javascript
describe('E2E Agent Workflow', () => {
  it('should install, convert, and activate agents', async () => {
    // Install BMad Method
    await installer.install();
    
    // Convert agents
    await converter.convertAll();
    
    // Activate agent
    const agent = await activationManager.activateAgent('bmad-architect');
    expect(agent).toBeDefined();
  });
});
```

## Error Handling Patterns

### Conversion Errors

Handle conversion failures gracefully:

```javascript
try {
  const converted = await transformer.transformAgent(agent);
} catch (error) {
  if (error instanceof TransformationError) {
    logger.warn(`Failed to convert agent ${agent.id}: ${error.message}`);
    // Continue with other agents
  } else {
    throw error; // Re-throw unexpected errors
  }
}
```

### Registration Errors

Implement retry mechanisms:

```javascript
async function registerWithRetry(agent, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await registry.registerAgent(agent);
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

### Activation Errors

Provide fallback mechanisms:

```javascript
async function activateWithFallback(agentId) {
  try {
    return await activationManager.activateAgent(agentId);
  } catch (error) {
    logger.warn(`Native activation failed, trying steering fallback`);
    return await steeringActivator.activate(agentId);
  }
}
```

## Performance Considerations

### Batch Processing

Process agents in batches to avoid memory issues:

```javascript
async function batchProcess(agents, batchSize = 10) {
  const results = [];
  for (let i = 0; i < agents.length; i += batchSize) {
    const batch = agents.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(agent => transformer.transformAgent(agent))
    );
    results.push(...batchResults);
  }
  return results;
}
```

### Caching

Cache conversion results:

```javascript
class CachedTransformer extends AgentTransformer {
  constructor() {
    super();
    this.cache = new Map();
  }
  
  async transformAgent(agent) {
    const cacheKey = `${agent.id}-${agent.lastModified}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = await super.transformAgent(agent);
    this.cache.set(cacheKey, result);
    return result;
  }
}
```

### Memory Management

Monitor memory usage during large conversions:

```javascript
function monitorMemory() {
  const usage = process.memoryUsage();
  if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
    logger.warn('High memory usage detected');
    if (global.gc) global.gc(); // Force garbage collection
  }
}
```

## Debugging and Diagnostics

### Logging Configuration

Configure detailed logging:

```javascript
const logger = require('winston').createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'conversion.log' }),
    new winston.transports.Console()
  ]
});
```

### Diagnostic Tools

Use diagnostic utilities:

```javascript
// Validate agent structure
const diagnostics = new ConversionDiagnostics();
const issues = await diagnostics.validateAgent(agent);

// Monitor conversion progress
const monitor = new ConversionMonitor();
monitor.on('progress', (progress) => {
  console.log(`Conversion progress: ${progress.percentage}%`);
});
```

### Debug Mode

Enable debug mode for detailed output:

```javascript
if (process.env.DEBUG_CONVERSION) {
  transformer.enableDebugMode();
  registry.enableVerboseLogging();
}
```

## Security Considerations

### Input Validation

Validate agent files before processing:

```javascript
function validateAgentFile(content) {
  // Check for malicious content
  if (content.includes('<script>')) {
    throw new SecurityError('Script tags not allowed in agent files');
  }
  
  // Validate YAML structure
  try {
    yaml.load(content);
  } catch (error) {
    throw new ValidationError('Invalid YAML structure');
  }
}
```

### Sandboxing

Isolate agent execution:

```javascript
const vm = require('vm');

function executeAgentCode(code, context) {
  const sandbox = {
    ...context,
    console: { log: (...args) => logger.info(...args) }
  };
  
  return vm.runInNewContext(code, sandbox, {
    timeout: 5000,
    displayErrors: true
  });
}
```

## Deployment Considerations

### Environment Configuration

Configure for different environments:

```javascript
const config = {
  development: {
    enableDebugLogging: true,
    skipValidation: false,
    maxConcurrency: 5
  },
  production: {
    enableDebugLogging: false,
    skipValidation: false,
    maxConcurrency: 20
  }
};
```

### Health Checks

Implement health monitoring:

```javascript
app.get('/health/agents', async (req, res) => {
  const registry = new KiroAgentRegistry();
  const agents = registry.getRegisteredAgents();
  
  res.json({
    status: 'healthy',
    agentCount: agents.size,
    lastUpdate: registry.getLastUpdateTime()
  });
});
```

This developer guide provides the foundation for working with the Kiro agent integration system. For specific implementation examples, see the test files in `tools/kiro-adapter/__tests__/`.