# Kiro Integration Adapter

This directory contains the core infrastructure for integrating BMad Method with Kiro IDE, providing native Kiro experiences that leverage Kiro's unique capabilities.

## Architecture Overview

The Kiro adapter follows a transformation-based approach, converting BMad's generic components into Kiro-native implementations:

```
BMad Core Framework → Kiro Integration Layer → Kiro IDE Environment
```

## Core Components

### Base Infrastructure

- **`index.js`** - Main entry point and orchestration
- **`base-transformer.js`** - Common transformation functionality
- **`kiro-detector.js`** - Workspace detection and validation
- **`utils.js`** - Shared utility functions

### Transformation Components

- **`agent-transformer.js`** - Converts BMad agents to Kiro-native agents
- **`spec-generator.js`** - Transforms workflows into Kiro specs
- **`context-injector.js`** - Integrates Kiro's context system
- **`hook-generator.js`** - Creates workflow automation hooks
- **`mcp-integrator.js`** - Enables MCP tool integration

## Key Features

### 1. Agent Transformation
- Preserves BMad personas while adding Kiro capabilities
- Injects context awareness (#File, #Folder, #Codebase, etc.)
- Integrates steering rules and MCP tools
- Maintains BMad dependencies and workflows

### 2. Workspace Detection
- Identifies Kiro workspace environments
- Validates required directory structure
- Provides setup guidance for initialization
- Handles missing components gracefully

### 3. Context Integration
- Maps BMad context needs to Kiro providers
- Enables automatic context injection
- Provides fallback mechanisms
- Supports dynamic context loading

### 4. Error Handling
- Comprehensive validation and error reporting
- Backup creation for safe transformations
- Graceful degradation when features unavailable
- Clear guidance for resolution

## Usage

### Basic Integration

```javascript
const KiroAdapter = require('./kiro-adapter');

const adapter = new KiroAdapter();

// Initialize Kiro integration
const success = await adapter.initialize('/path/to/project');

if (success) {
  console.log('Kiro integration ready');
}
```

### Agent Transformation

```javascript
const { AgentTransformer } = require('./kiro-adapter');

const transformer = new AgentTransformer();

await transformer.transformAgent(
  'bmad-core/agents/pm.md',
  '.kiro/agents/bmad-pm.md'
);
```

### Workspace Detection

```javascript
const { KiroDetector } = require('./kiro-adapter');

const detector = new KiroDetector();
const workspaceInfo = await detector.getWorkspaceInfo();

console.log('Kiro features:', workspaceInfo.availableFeatures);
console.log('Existing specs:', workspaceInfo.existingSpecs);
```

## Implementation Status

This infrastructure provides the foundation for Kiro integration. Individual components contain placeholder implementations that will be completed in subsequent tasks:

- ✅ **Task 1**: Infrastructure setup (current)
- 🔄 **Task 2**: Agent transformation system
- 🔄 **Task 3**: Spec generation system
- 🔄 **Task 4**: Installation and CLI integration
- 🔄 **Task 5**: Hook generation and automation
- 🔄 **Task 6**: MCP tool support
- 🔄 **Task 7**: Steering rule integration

## Development Guidelines

### Adding New Components

1. Extend `BaseTransformer` for transformation logic
2. Follow error handling patterns from existing components
3. Add comprehensive logging and validation
4. Include backup mechanisms for file operations
5. Provide clear error messages and guidance

### Testing Integration

```javascript
// Test workspace detection
const isKiro = await detector.detectKiroWorkspace();

// Test agent transformation
const success = await transformer.transformAgent(input, output);

// Validate results
const validation = await utils.validateKiroSpecStructure(specPath);
```

## Configuration

The adapter respects various configuration options:

```javascript
const adapter = new KiroAdapter({
  preserveOriginal: true,    // Create backups
  addKiroMetadata: true,     // Add integration metadata
  validateOutput: true,      // Validate transformations
  steeringRules: ['custom.md'], // Additional steering rules
  mcpTools: ['custom-tool']  // Additional MCP tools
});
```

## Error Handling

All components implement comprehensive error handling:

- **Validation Errors**: Clear messages about missing requirements
- **Transformation Errors**: Detailed information about failures
- **File System Errors**: Graceful handling of permission/access issues
- **Configuration Errors**: Guidance for fixing invalid configurations

## Next Steps

1. Implement agent transformation logic (Task 2.1)
2. Add spec generation capabilities (Task 3.1)
3. Integrate with BMad CLI installation (Task 4.1)
4. Create hook generation system (Task 5.1)
5. Add MCP tool discovery and integration (Task 6.1)