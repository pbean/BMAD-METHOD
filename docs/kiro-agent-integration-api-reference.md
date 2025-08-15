# Kiro Agent Integration API Reference

## Core Classes and Interfaces

### AgentDiscovery

Discovers and catalogs BMad agents from various sources.

#### Constructor
```javascript
new AgentDiscovery(options?: DiscoveryOptions)
```

**Parameters:**
- `options` (optional): Configuration options for discovery

**DiscoveryOptions Interface:**
```typescript
interface DiscoveryOptions {
  coreAgentsPath?: string;        // Default: 'bmad-core/agents/'
  expansionPacksPath?: string;    // Default: 'expansion-packs/*/agents/'
  includeDisabled?: boolean;      // Default: false
  validateStructure?: boolean;    // Default: true
}
```

#### Methods

##### `scanAllAgents(): Promise<AgentMetadata[]>`
Discovers all available BMad agents.

**Returns:** Promise resolving to array of agent metadata
**Throws:** `DiscoveryError` if scanning fails

**Example:**
```javascript
const discovery = new AgentDiscovery();
const agents = await discovery.scanAllAgents();
console.log(`Found ${agents.length} agents`);
```

##### `scanDirectory(path: string): Promise<AgentMetadata[]>`
Scans a specific directory for agents.

**Parameters:**
- `path`: Directory path to scan

**Returns:** Promise resolving to array of agent metadata
**Throws:** `DiscoveryError` if directory doesn't exist or is inaccessible

##### `scanExpansionPacks(): Promise<AgentMetadata[]>`
Discovers agents from all expansion packs.

**Returns:** Promise resolving to array of expansion pack agent metadata

##### `extractMetadata(filePath: string): Promise<AgentMetadata>`
Extracts metadata from a single agent file.

**Parameters:**
- `filePath`: Path to agent file

**Returns:** Promise resolving to agent metadata
**Throws:** `MetadataExtractionError` if file is invalid

#### Events

The AgentDiscovery class extends EventEmitter and emits:

- `agent-found`: Emitted when an agent is discovered
- `scan-complete`: Emitted when scanning is complete
- `error`: Emitted when an error occurs during discovery

### AgentTransformer

Transforms BMad agents to Kiro-compatible format.

#### Constructor
```javascript
new AgentTransformer(options?: TransformationOptions)
```

**TransformationOptions Interface:**
```typescript
interface TransformationOptions {
  enableContextInjection?: boolean;    // Default: true
  generateSteeringRules?: boolean;     // Default: true
  createHooks?: boolean;               // Default: true
  preserveOriginal?: boolean;          // Default: false
  outputDirectory?: string;            // Default: '.kiro/agents/'
}
```

#### Methods

##### `transformAgent(metadata: AgentMetadata): Promise<ConvertedAgent>`
Transforms a single BMad agent to Kiro format.

**Parameters:**
- `metadata`: Agent metadata from discovery phase

**Returns:** Promise resolving to converted agent object
**Throws:** `TransformationError` if conversion fails

**Example:**
```javascript
const transformer = new AgentTransformer();
const converted = await transformer.transformAgent(agentMetadata);
```

##### `batchTransform(agents: AgentMetadata[]): Promise<ConvertedAgent[]>`
Transforms multiple agents in batch.

**Parameters:**
- `agents`: Array of agent metadata objects

**Returns:** Promise resolving to array of converted agents
**Throws:** `BatchTransformationError` with details of failed conversions

##### `addTransformationRule(rule: TransformationRule): void`
Adds a custom transformation rule.

**Parameters:**
- `rule`: Custom transformation rule

**TransformationRule Interface:**
```typescript
interface TransformationRule {
  name: string;
  applies(agent: AgentMetadata): boolean;
  transform(agent: AgentMetadata): Promise<Partial<ConvertedAgent>>;
  priority?: number; // Default: 0, higher numbers run first
}
```

### KiroContextInjector

Injects Kiro-specific context into converted agents.

#### Constructor
```javascript
new KiroContextInjector(options?: ContextInjectionOptions)
```

**ContextInjectionOptions Interface:**
```typescript
interface ContextInjectionOptions {
  steeringTemplate?: string;
  hookTemplate?: string;
  contextPromptTemplate?: string;
  expansionPackContext?: Map<string, any>;
}
```

#### Methods

##### `injectContext(agent: AgentMetadata, options?: InjectionOptions): Promise<KiroIntegration>`
Injects Kiro integration context into an agent.

**Parameters:**
- `agent`: Agent metadata
- `options`: Optional injection configuration

**Returns:** Promise resolving to Kiro integration object

**InjectionOptions Interface:**
```typescript
interface InjectionOptions {
  generateSteering?: boolean;
  generateHooks?: boolean;
  includeExpansionContext?: boolean;
  customContext?: Record<string, any>;
}
```

##### `generateSteeringRules(agent: AgentMetadata): Promise<string[]>`
Generates steering rules for an agent.

**Parameters:**
- `agent`: Agent metadata

**Returns:** Promise resolving to array of steering rule file paths

##### `generateHooks(agent: AgentMetadata): Promise<string[]>`
Generates automation hooks for an agent.

**Parameters:**
- `agent`: Agent metadata

**Returns:** Promise resolving to array of hook file paths

### DependencyResolver

Resolves and manages agent dependencies.

#### Constructor
```javascript
new DependencyResolver(options?: DependencyOptions)
```

**DependencyOptions Interface:**
```typescript
interface DependencyOptions {
  basePath?: string;              // Default: process.cwd()
  validateDependencies?: boolean; // Default: true
  autoResolve?: boolean;         // Default: true
}
```

#### Methods

##### `resolveDependencies(agent: AgentMetadata): Promise<ResolvedDependencies>`
Resolves all dependencies for an agent.

**Parameters:**
- `agent`: Agent metadata

**Returns:** Promise resolving to resolved dependencies object

**ResolvedDependencies Interface:**
```typescript
interface ResolvedDependencies {
  tasks: ResolvedResource[];
  templates: ResolvedResource[];
  checklists: ResolvedResource[];
  data: ResolvedResource[];
  missing: string[];
  errors: DependencyError[];
}

interface ResolvedResource {
  name: string;
  path: string;
  content: string;
  lastModified: Date;
}
```

##### `validateDependencies(dependencies: string[]): Promise<ValidationResult>`
Validates that all dependencies exist and are accessible.

**Parameters:**
- `dependencies`: Array of dependency names

**Returns:** Promise resolving to validation result

### KiroAgentRegistry

Manages agent registration with Kiro's native system.

#### Constructor
```javascript
new KiroAgentRegistry(options?: RegistryOptions)
```

**RegistryOptions Interface:**
```typescript
interface RegistryOptions {
  autoRegister?: boolean;        // Default: true
  retryAttempts?: number;        // Default: 3
  retryDelay?: number;           // Default: 1000ms
  enableFallback?: boolean;      // Default: true
}
```

#### Methods

##### `registerAgent(agent: ConvertedAgent): Promise<void>`
Registers an agent with Kiro's native system.

**Parameters:**
- `agent`: Converted agent object

**Throws:** `RegistrationError` if registration fails

##### `registerBatch(agents: ConvertedAgent[]): Promise<RegistrationResult[]>`
Registers multiple agents in batch.

**Parameters:**
- `agents`: Array of converted agents

**Returns:** Promise resolving to array of registration results

**RegistrationResult Interface:**
```typescript
interface RegistrationResult {
  agentId: string;
  success: boolean;
  error?: Error;
  retryCount: number;
}
```

##### `unregisterAgent(agentId: string): Promise<void>`
Unregisters an agent from Kiro.

**Parameters:**
- `agentId`: Unique agent identifier

##### `getRegisteredAgents(): Map<string, ConvertedAgent>`
Returns all currently registered agents.

**Returns:** Map of agent ID to converted agent object

##### `isRegistered(agentId: string): boolean`
Checks if an agent is registered.

**Parameters:**
- `agentId`: Agent identifier

**Returns:** True if agent is registered

### ActivationManager

Manages agent activation and lifecycle.

#### Constructor
```javascript
new ActivationManager(options?: ActivationOptions)
```

**ActivationOptions Interface:**
```typescript
interface ActivationOptions {
  maxConcurrentActivations?: number; // Default: 10
  activationTimeout?: number;        // Default: 30000ms
  enableStateManagement?: boolean;   // Default: true
  persistActivations?: boolean;      // Default: true
}
```

#### Methods

##### `activateAgent(agentId: string, context?: ActivationContext): Promise<AgentInstance>`
Activates a registered agent.

**Parameters:**
- `agentId`: Unique agent identifier
- `context`: Optional activation context

**Returns:** Promise resolving to active agent instance
**Throws:** `ActivationError` if activation fails

**ActivationContext Interface:**
```typescript
interface ActivationContext {
  userId?: string;
  projectId?: string;
  workspace?: string;
  preferences?: Record<string, any>;
  resources?: Record<string, any>;
}
```

##### `deactivateAgent(agentId: string): Promise<void>`
Deactivates an active agent.

**Parameters:**
- `agentId`: Agent identifier

##### `getActiveAgents(): Map<string, AgentInstance>`
Returns all currently active agents.

**Returns:** Map of agent ID to agent instance

##### `getAgentState(agentId: string): AgentState | null`
Gets the current state of an agent.

**Parameters:**
- `agentId`: Agent identifier

**Returns:** Agent state object or null if not found

**AgentState Interface:**
```typescript
interface AgentState {
  id: string;
  status: 'inactive' | 'activating' | 'active' | 'error';
  activatedAt?: Date;
  lastActivity?: Date;
  context?: ActivationContext;
  error?: Error;
}
```

### TemplateConverter

Converts BMad templates to Kiro spec format.

#### Constructor
```javascript
new TemplateConverter(options?: TemplateConversionOptions)
```

**TemplateConversionOptions Interface:**
```typescript
interface TemplateConversionOptions {
  outputDirectory?: string;      // Default: '.kiro/spec-templates/'
  preserveInstructions?: boolean; // Default: true
  generateTasks?: boolean;       // Default: true
  validateOutput?: boolean;      // Default: true
}
```

#### Methods

##### `convertTemplate(templatePath: string): Promise<ConvertedTemplate>`
Converts a BMad template to Kiro spec format.

**Parameters:**
- `templatePath`: Path to BMad template file

**Returns:** Promise resolving to converted template object

**ConvertedTemplate Interface:**
```typescript
interface ConvertedTemplate {
  id: string;
  name: string;
  description: string;
  originalTemplate: string;
  specType: string;
  requirements: string;
  design: string;
  tasks: string[];
  outputPath: string;
}
```

##### `convertBatch(templatePaths: string[]): Promise<ConvertedTemplate[]>`
Converts multiple templates in batch.

**Parameters:**
- `templatePaths`: Array of template file paths

**Returns:** Promise resolving to array of converted templates

### WorkflowIntegrator

Integrates BMad workflows with Kiro's task management system.

#### Constructor
```javascript
new WorkflowIntegrator(options?: WorkflowIntegrationOptions)
```

#### Methods

##### `integrateWorkflow(workflowPath: string): Promise<IntegratedWorkflow>`
Integrates a BMad workflow with Kiro.

**Parameters:**
- `workflowPath`: Path to workflow file

**Returns:** Promise resolving to integrated workflow object

## Data Types and Interfaces

### AgentMetadata
```typescript
interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  source: 'bmad-core' | 'expansion-pack';
  expansionPack?: string;
  filePath: string;
  lastModified: Date;
  dependencies: {
    tasks: string[];
    templates: string[];
    checklists: string[];
    data: string[];
  };
  yamlHeader: Record<string, any>;
  content: string;
}
```

### ConvertedAgent
```typescript
interface ConvertedAgent {
  id: string;
  name: string;
  description: string;
  source: 'bmad-core' | 'expansion-pack';
  expansionPack?: string;
  originalPath: string;
  convertedPath: string;
  kiroIntegration: KiroIntegration;
  dependencies: ResolvedDependencies;
  metadata: AgentMetadata;
}
```

### KiroIntegration
```typescript
interface KiroIntegration {
  steering: string[];
  hooks: string[];
  contextPrompts: string[];
  specTemplates: string[];
  activationHandler: string;
}
```

### AgentInstance
```typescript
interface AgentInstance {
  id: string;
  agentId: string;
  status: 'active' | 'busy' | 'idle' | 'error';
  activatedAt: Date;
  lastActivity: Date;
  context: ActivationContext;
  capabilities: string[];
  execute(command: string, params?: any): Promise<any>;
  getState(): AgentState;
  destroy(): Promise<void>;
}
```

## Error Types

### DiscoveryError
Thrown when agent discovery fails.

```typescript
class DiscoveryError extends Error {
  constructor(message: string, public path?: string, public cause?: Error) {
    super(message);
    this.name = 'DiscoveryError';
  }
}
```

### TransformationError
Thrown when agent transformation fails.

```typescript
class TransformationError extends Error {
  constructor(
    message: string, 
    public agentId?: string, 
    public phase?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'TransformationError';
  }
}
```

### RegistrationError
Thrown when agent registration fails.

```typescript
class RegistrationError extends Error {
  constructor(
    message: string,
    public agentId?: string,
    public retryCount?: number,
    public cause?: Error
  ) {
    super(message);
    this.name = 'RegistrationError';
  }
}
```

### ActivationError
Thrown when agent activation fails.

```typescript
class ActivationError extends Error {
  constructor(
    message: string,
    public agentId?: string,
    public context?: ActivationContext,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ActivationError';
  }
}
```

## Utility Functions

### Configuration Helpers

#### `loadConfiguration(path?: string): Promise<Configuration>`
Loads configuration from file or environment.

#### `validateConfiguration(config: Configuration): ValidationResult`
Validates configuration object.

### File System Helpers

#### `ensureDirectoryExists(path: string): Promise<void>`
Ensures a directory exists, creating it if necessary.

#### `copyWithBackup(source: string, destination: string): Promise<void>`
Copies a file with backup of existing destination.

### Logging Helpers

#### `createLogger(name: string, options?: LoggerOptions): Logger`
Creates a configured logger instance.

#### `logConversionProgress(current: number, total: number): void`
Logs conversion progress.

## Constants

### Default Paths
```typescript
export const DEFAULT_PATHS = {
  CORE_AGENTS: 'bmad-core/agents/',
  EXPANSION_PACKS: 'expansion-packs/*/agents/',
  KIRO_AGENTS: '.kiro/agents/',
  KIRO_STEERING: '.kiro/steering/',
  KIRO_HOOKS: '.kiro/hooks/',
  KIRO_TEMPLATES: '.kiro/spec-templates/'
};
```

### Agent Status Constants
```typescript
export const AGENT_STATUS = {
  INACTIVE: 'inactive',
  ACTIVATING: 'activating',
  ACTIVE: 'active',
  BUSY: 'busy',
  IDLE: 'idle',
  ERROR: 'error'
} as const;
```

### Error Codes
```typescript
export const ERROR_CODES = {
  DISCOVERY_FAILED: 'DISCOVERY_FAILED',
  TRANSFORMATION_FAILED: 'TRANSFORMATION_FAILED',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  ACTIVATION_FAILED: 'ACTIVATION_FAILED',
  DEPENDENCY_MISSING: 'DEPENDENCY_MISSING',
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION'
} as const;
```

## Usage Examples

### Basic Agent Conversion
```javascript
const { AgentDiscovery, AgentTransformer, KiroAgentRegistry } = require('./kiro-adapter');

async function convertAndRegisterAgents() {
  // Discover agents
  const discovery = new AgentDiscovery();
  const agents = await discovery.scanAllAgents();
  
  // Transform agents
  const transformer = new AgentTransformer();
  const converted = await transformer.batchTransform(agents);
  
  // Register with Kiro
  const registry = new KiroAgentRegistry();
  for (const agent of converted) {
    await registry.registerAgent(agent);
  }
  
  console.log(`Successfully converted and registered ${converted.length} agents`);
}
```

### Custom Transformation Rule
```javascript
const customRule = {
  name: 'game-dev-rule',
  applies: (agent) => agent.expansionPack?.includes('game'),
  transform: async (agent) => ({
    kiroIntegration: {
      ...agent.kiroIntegration,
      hooks: [...agent.kiroIntegration.hooks, 'game-dev-hooks.js']
    }
  }),
  priority: 10
};

transformer.addTransformationRule(customRule);
```

### Agent Activation with Context
```javascript
const activationManager = new ActivationManager();

const context = {
  userId: 'user123',
  projectId: 'project456',
  workspace: '/path/to/workspace',
  preferences: {
    codeStyle: 'typescript',
    testFramework: 'jest'
  }
};

const agentInstance = await activationManager.activateAgent('bmad-architect', context);
const result = await agentInstance.execute('create-architecture', { 
  projectType: 'web-app' 
});
```

This API reference provides comprehensive documentation for all public interfaces in the Kiro agent integration system.