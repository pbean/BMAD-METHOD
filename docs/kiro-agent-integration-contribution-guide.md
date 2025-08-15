# Kiro Agent Integration Contribution Guide

## Welcome Contributors!

Thank you for your interest in contributing to the Kiro Agent Integration system! This guide will help you understand how to contribute effectively to the project.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Architecture Overview](#architecture-overview)
4. [Contribution Types](#contribution-types)
5. [Development Workflow](#development-workflow)
6. [Testing Guidelines](#testing-guidelines)
7. [Code Style and Standards](#code-style-and-standards)
8. [Documentation Requirements](#documentation-requirements)
9. [Pull Request Process](#pull-request-process)
10. [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

- Node.js v20 or higher
- npm package manager
- Git
- Basic understanding of BMad Method and Kiro IDE
- Familiarity with JavaScript/TypeScript

### Understanding the System

Before contributing, familiarize yourself with:

1. **BMad Method**: The universal AI agent framework
2. **Kiro IDE**: The integrated development environment
3. **Agent Integration**: How BMad agents work within Kiro
4. **Conversion Pipeline**: The transformation process from BMad to Kiro format

### Key Resources

- [Developer Guide](./kiro-agent-integration-developer-guide.md)
- [API Reference](./kiro-agent-integration-api-reference.md)
- [User Guide](./kiro-integration-user-guide.md)
- [BMad Method Documentation](../README.md)

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/bmad-method.git
cd bmad-method

# Add upstream remote
git remote add upstream https://github.com/bmad-method/bmad-method.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Development Environment

```bash
# Install development tools
npm run setup:dev

# Verify installation
npm run validate
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

### 5. Start Development Server

```bash
# Start development environment
npm run dev

# Run specific components
npm run dev:converter
npm run dev:registry
```

## Architecture Overview

### Core Components

Understanding the architecture is crucial for effective contributions:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Agent Discovery │───▶│ Agent Transform │───▶│ Agent Registry  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Expansion Packs │    │ Template Conv.  │    │ Activation Mgr  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Directories

- `tools/kiro-adapter/` - Main integration code
- `tools/kiro-adapter/__tests__/` - Test suites
- `docs/` - Documentation
- `.kiro/specs/complete-kiro-agent-integration/` - Project specifications

## Contribution Types

### 1. Bug Fixes

**What qualifies:**
- Fixing conversion errors
- Resolving registration failures
- Correcting activation issues
- Addressing performance problems

**Process:**
1. Create issue describing the bug
2. Include reproduction steps
3. Propose solution approach
4. Implement fix with tests
5. Submit pull request

### 2. Feature Enhancements

**Examples:**
- New agent transformation rules
- Additional context injection patterns
- Enhanced error handling
- Performance optimizations

**Process:**
1. Discuss feature in GitHub Discussions
2. Create detailed feature proposal
3. Get community feedback
4. Implement with comprehensive tests
5. Update documentation

### 3. New Agent Type Support

**Adding support for new BMad agent types:**

1. **Extend Discovery System:**
```javascript
// tools/kiro-adapter/agent-discovery.js
class AgentDiscovery {
  async scanCustomAgentType() {
    // Implementation for new agent type
  }
}
```

2. **Create Transformation Rules:**
```javascript
// tools/kiro-adapter/transformation-rules/custom-rule.js
module.exports = {
  name: 'custom-agent-rule',
  applies: (agent) => agent.type === 'custom',
  transform: async (agent) => {
    // Custom transformation logic
  }
};
```

3. **Add Tests:**
```javascript
// tools/kiro-adapter/__tests__/custom-agent.test.js
describe('Custom Agent Support', () => {
  it('should discover custom agents', async () => {
    // Test implementation
  });
});
```

### 4. Expansion Pack Integration

**Supporting new expansion packs:**

1. **Create Expansion Pack Adapter:**
```javascript
// tools/kiro-adapter/expansion-adapters/new-domain.js
class NewDomainAdapter {
  async adaptAgents(agents) {
    // Domain-specific adaptation
  }
}
```

2. **Add Domain Context:**
```javascript
// tools/kiro-adapter/context-injectors/new-domain-context.js
class NewDomainContextInjector extends KiroContextInjector {
  injectDomainContext(agent) {
    // Domain-specific context injection
  }
}
```

### 5. Performance Improvements

**Areas for optimization:**
- Batch processing efficiency
- Memory usage optimization
- Caching strategies
- Parallel processing

**Guidelines:**
- Profile before optimizing
- Include benchmarks in tests
- Document performance characteristics
- Consider memory constraints

### 6. Documentation Improvements

**Types of documentation contributions:**
- API documentation updates
- Tutorial improvements
- Example additions
- Architecture clarifications

## Development Workflow

### 1. Planning Phase

Before starting development:

1. **Check existing issues** - Avoid duplicate work
2. **Create or comment on issue** - Discuss approach
3. **Get feedback** - Ensure alignment with project goals
4. **Plan implementation** - Break down into manageable tasks

### 2. Development Phase

#### Branch Naming Convention

```bash
# Feature branches
feature/agent-discovery-enhancement
feature/new-expansion-pack-support

# Bug fix branches
fix/registration-retry-logic
fix/memory-leak-in-transformer

# Documentation branches
docs/api-reference-update
docs/contribution-guide-improvements
```

#### Commit Message Format

```
type(scope): brief description

Detailed explanation of changes (if needed)

Fixes #123
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions/modifications
- `refactor`: Code refactoring
- `perf`: Performance improvements

**Examples:**
```
feat(discovery): add support for custom agent types

Add discovery logic for agents with custom metadata formats.
Includes validation and error handling for malformed agents.

Fixes #456

fix(registry): resolve race condition in batch registration

Implement proper synchronization for concurrent agent registration
to prevent duplicate registrations and state corruption.

Fixes #789
```

### 3. Testing Phase

#### Test Requirements

All contributions must include appropriate tests:

1. **Unit Tests** - Test individual functions/classes
2. **Integration Tests** - Test component interactions
3. **End-to-End Tests** - Test complete workflows

#### Test Structure

```javascript
// tools/kiro-adapter/__tests__/your-feature.test.js
describe('Your Feature', () => {
  beforeEach(() => {
    // Setup test environment
  });

  afterEach(() => {
    // Cleanup
  });

  describe('when condition X', () => {
    it('should do Y', async () => {
      // Test implementation
      expect(result).toBe(expected);
    });

    it('should handle error Z', async () => {
      // Error handling test
      await expect(operation()).rejects.toThrow('Expected error');
    });
  });
});
```

#### Test Coverage Requirements

- Minimum 80% code coverage for new code
- 100% coverage for critical paths
- Include edge cases and error scenarios

### 4. Documentation Phase

#### Required Documentation Updates

1. **API Documentation** - Update if interfaces change
2. **Developer Guide** - Add new patterns/examples
3. **User Guide** - Update if user-facing changes
4. **README** - Update if setup/usage changes

#### Documentation Standards

- Use clear, concise language
- Include code examples
- Provide context and rationale
- Update table of contents
- Check for broken links

## Testing Guidelines

### Test Categories

#### 1. Unit Tests
```javascript
// Test individual components in isolation
describe('AgentTransformer', () => {
  it('should transform basic agent correctly', async () => {
    const transformer = new AgentTransformer();
    const mockAgent = createMockAgent();
    
    const result = await transformer.transformAgent(mockAgent);
    
    expect(result.kiroIntegration).toBeDefined();
    expect(result.convertedPath).toMatch(/\.kiro\/agents\//);
  });
});
```

#### 2. Integration Tests
```javascript
// Test component interactions
describe('Agent Conversion Pipeline', () => {
  it('should complete full conversion workflow', async () => {
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

#### 3. End-to-End Tests
```javascript
// Test complete user workflows
describe('E2E Agent Integration', () => {
  it('should install, convert, and activate agents', async () => {
    // Simulate full user workflow
    await installer.install();
    await converter.convertAll();
    
    const agent = await activationManager.activateAgent('bmad-architect');
    const result = await agent.execute('create-architecture');
    
    expect(result).toBeDefined();
  });
});
```

### Test Utilities

#### Mock Factories
```javascript
// tools/kiro-adapter/__tests__/utils/mock-factory.js
function createMockAgent(overrides = {}) {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    description: 'A test agent',
    source: 'bmad-core',
    dependencies: {
      tasks: [],
      templates: [],
      checklists: [],
      data: []
    },
    ...overrides
  };
}
```

#### Test Helpers
```javascript
// tools/kiro-adapter/__tests__/utils/test-helpers.js
async function setupTestEnvironment() {
  // Create temporary directories
  // Set up mock files
  // Initialize test database
}

async function cleanupTestEnvironment() {
  // Remove temporary files
  // Reset state
}
```

### Performance Testing

#### Benchmark Tests
```javascript
describe('Performance Benchmarks', () => {
  it('should convert 100 agents within time limit', async () => {
    const startTime = Date.now();
    const agents = createMockAgents(100);
    
    await transformer.batchTransform(agents);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(10000); // 10 seconds
  });
});
```

#### Memory Tests
```javascript
it('should not exceed memory limit during large conversions', async () => {
  const initialMemory = process.memoryUsage().heapUsed;
  const agents = createMockAgents(1000);
  
  await transformer.batchTransform(agents);
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  
  expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
});
```

## Code Style and Standards

### JavaScript/TypeScript Standards

#### ESLint Configuration
The project uses ESLint with the following key rules:

```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', '@typescript-eslint/recommended'],
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn'
  }
};
```

#### Naming Conventions

```javascript
// Classes: PascalCase
class AgentTransformer {}

// Functions and variables: camelCase
function transformAgent() {}
const agentMetadata = {};

// Constants: SCREAMING_SNAKE_CASE
const DEFAULT_TIMEOUT = 30000;

// Files: kebab-case
// agent-discovery.js
// template-converter.js
```

#### Function Documentation

```javascript
/**
 * Transforms a BMad agent to Kiro-compatible format
 * @param {AgentMetadata} metadata - Agent metadata from discovery
 * @param {TransformationOptions} options - Transformation options
 * @returns {Promise<ConvertedAgent>} Converted agent object
 * @throws {TransformationError} When conversion fails
 */
async function transformAgent(metadata, options = {}) {
  // Implementation
}
```

### Error Handling Standards

#### Custom Error Classes
```javascript
class TransformationError extends Error {
  constructor(message, agentId, phase, cause) {
    super(message);
    this.name = 'TransformationError';
    this.agentId = agentId;
    this.phase = phase;
    this.cause = cause;
  }
}
```

#### Error Handling Patterns
```javascript
// Async/await with proper error handling
async function processAgent(agent) {
  try {
    const result = await transformer.transformAgent(agent);
    return result;
  } catch (error) {
    logger.error(`Failed to process agent ${agent.id}:`, error);
    throw new ProcessingError(`Agent processing failed: ${error.message}`, agent.id, error);
  }
}

// Graceful degradation
async function batchProcess(agents) {
  const results = [];
  const errors = [];
  
  for (const agent of agents) {
    try {
      const result = await processAgent(agent);
      results.push(result);
    } catch (error) {
      errors.push({ agent: agent.id, error });
      // Continue processing other agents
    }
  }
  
  return { results, errors };
}
```

### Logging Standards

#### Logger Configuration
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

#### Logging Best Practices
```javascript
// Use appropriate log levels
logger.debug('Detailed debugging information');
logger.info('General information about operation');
logger.warn('Warning about potential issues');
logger.error('Error that needs attention');

// Include context in log messages
logger.info('Agent transformation started', {
  agentId: agent.id,
  source: agent.source,
  timestamp: new Date().toISOString()
});

// Log errors with full context
logger.error('Agent transformation failed', {
  agentId: agent.id,
  error: error.message,
  stack: error.stack,
  phase: 'context-injection'
});
```

## Documentation Requirements

### Code Documentation

#### JSDoc Standards
```javascript
/**
 * Discovers and catalogs BMad agents from various sources
 * @class
 */
class AgentDiscovery {
  /**
   * Creates an instance of AgentDiscovery
   * @param {DiscoveryOptions} [options={}] - Configuration options
   */
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Scans all available agent sources
   * @async
   * @returns {Promise<AgentMetadata[]>} Array of discovered agent metadata
   * @throws {DiscoveryError} When scanning fails
   * @example
   * const discovery = new AgentDiscovery();
   * const agents = await discovery.scanAllAgents();
   * console.log(`Found ${agents.length} agents`);
   */
  async scanAllAgents() {
    // Implementation
  }
}
```

#### README Updates

When adding new features, update relevant README files:

```markdown
## New Feature: Custom Agent Types

### Overview
Brief description of the new feature and its purpose.

### Usage
```javascript
// Code example showing how to use the feature
const customAgent = new CustomAgentType(options);
await customAgent.process();
```

### Configuration
Description of any new configuration options.

### Migration
Instructions for migrating from previous versions if applicable.
```

### API Documentation

#### Interface Documentation
```typescript
/**
 * Configuration options for agent discovery
 * @interface DiscoveryOptions
 */
interface DiscoveryOptions {
  /** Path to core agents directory */
  coreAgentsPath?: string;
  
  /** Path pattern for expansion pack agents */
  expansionPacksPath?: string;
  
  /** Whether to include disabled agents */
  includeDisabled?: boolean;
  
  /** Whether to validate agent structure during discovery */
  validateStructure?: boolean;
}
```

#### Method Documentation
```javascript
/**
 * Registers an agent with Kiro's native system
 * @method registerAgent
 * @memberof KiroAgentRegistry
 * @param {ConvertedAgent} agent - The converted agent to register
 * @returns {Promise<void>} Promise that resolves when registration is complete
 * @throws {RegistrationError} When registration fails after all retry attempts
 * @since 1.2.0
 * @example
 * const registry = new KiroAgentRegistry();
 * await registry.registerAgent(convertedAgent);
 */
```

## Pull Request Process

### 1. Pre-submission Checklist

Before submitting a pull request:

- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] New tests added for new functionality
- [ ] Documentation updated as needed
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main
- [ ] No merge conflicts

### 2. Pull Request Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] End-to-end tests added/updated
- [ ] Manual testing completed

## Documentation
- [ ] API documentation updated
- [ ] Developer guide updated
- [ ] User guide updated (if applicable)
- [ ] README updated (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] No console.log statements left in code
- [ ] Error handling implemented
- [ ] Performance considerations addressed

## Related Issues
Fixes #123
Related to #456

## Screenshots (if applicable)
Include screenshots for UI changes.

## Additional Notes
Any additional information for reviewers.
```

### 3. Review Process

#### Automated Checks
- Linting (ESLint)
- Testing (Jest)
- Coverage reporting
- Build verification

#### Manual Review
- Code quality assessment
- Architecture alignment
- Performance implications
- Security considerations
- Documentation completeness

#### Review Criteria
- **Functionality**: Does it work as intended?
- **Code Quality**: Is it well-written and maintainable?
- **Testing**: Are there adequate tests?
- **Documentation**: Is it properly documented?
- **Performance**: Are there performance implications?
- **Security**: Are there security considerations?

### 4. Addressing Feedback

#### Responding to Reviews
- Address all feedback promptly
- Ask for clarification if needed
- Make requested changes
- Update tests and documentation
- Request re-review when ready

#### Common Review Comments
- "Add error handling for this case"
- "This needs a test"
- "Consider performance implications"
- "Update documentation"
- "Follow naming conventions"

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- Be respectful and constructive in all interactions
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Pull Requests**: Code review and collaboration
- **Documentation**: Inline comments and guides

### Getting Help

If you need help:

1. Check existing documentation
2. Search GitHub issues
3. Ask in GitHub Discussions
4. Reach out to maintainers

### Recognition

Contributors are recognized through:

- GitHub contributor graphs
- Release notes acknowledgments
- Community highlights
- Maintainer nominations for significant contributions

## Advanced Contribution Topics

### Creating Extension Points

When adding new functionality, consider creating extension points:

```javascript
// Plugin system example
class AgentTransformer {
  constructor() {
    this.plugins = new Map();
  }
  
  addPlugin(name, plugin) {
    this.plugins.set(name, plugin);
  }
  
  async transform(agent) {
    let result = await this.baseTransform(agent);
    
    for (const [name, plugin] of this.plugins) {
      if (plugin.applies(agent)) {
        result = await plugin.transform(result);
      }
    }
    
    return result;
  }
}
```

### Performance Optimization

When optimizing performance:

1. **Profile first** - Use Node.js profiling tools
2. **Measure impact** - Include benchmarks in tests
3. **Consider trade-offs** - Memory vs. speed vs. complexity
4. **Document changes** - Explain optimization rationale

### Security Considerations

When handling user input or file operations:

1. **Validate inputs** - Sanitize and validate all inputs
2. **Limit resource usage** - Prevent DoS attacks
3. **Secure file operations** - Prevent path traversal
4. **Handle secrets** - Never log sensitive information

### Backward Compatibility

When making changes:

1. **Avoid breaking changes** - Maintain API compatibility
2. **Deprecate gradually** - Provide migration paths
3. **Version appropriately** - Follow semantic versioning
4. **Document changes** - Update migration guides

## Conclusion

Thank you for contributing to the Kiro Agent Integration project! Your contributions help make the BMad Method more powerful and accessible to developers worldwide.

For questions or clarification on any part of this guide, please don't hesitate to reach out through GitHub Discussions or create an issue.

Happy coding! 🚀