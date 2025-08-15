/**
 * File Context Integration Test
 * Tests the complete file context integration workflow
 */

const AgentTransformer = require('./agent-transformer');
const FileContextIntegrator = require('./file-context-integrator');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

class FileContextIntegrationTester {
  constructor() {
    this.transformer = new AgentTransformer({
      logLevel: 'info',
      enableDiagnostics: true
    });
    this.integrator = new FileContextIntegrator({
      logLevel: 'info'
    });
  }

  /**
   * Run comprehensive file context integration tests
   */
  async runTests() {
    console.log(chalk.blue('🧪 Starting File Context Integration Tests\n'));

    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };

    // Test 1: Basic file context integration
    await this.runTest('Basic File Context Integration', async () => {
      return await this.testBasicFileContextIntegration();
    }, results);

    // Test 2: Agent-specific context requirements
    await this.runTest('Agent-Specific Context Requirements', async () => {
      return await this.testAgentSpecificContextRequirements();
    }, results);

    // Test 3: Expansion pack context integration
    await this.runTest('Expansion Pack Context Integration', async () => {
      return await this.testExpansionPackContextIntegration();
    }, results);

    // Test 4: Workspace boundary validation
    await this.runTest('Workspace Boundary Validation', async () => {
      return await this.testWorkspaceBoundaryValidation();
    }, results);

    // Test 5: Multi-file operation support
    await this.runTest('Multi-File Operation Support', async () => {
      return await this.testMultiFileOperationSupport();
    }, results);

    // Test 6: Project understanding integration
    await this.runTest('Project Understanding Integration', async () => {
      return await this.testProjectUnderstandingIntegration();
    }, results);

    // Test 7: Complete transformation workflow
    await this.runTest('Complete Transformation Workflow', async () => {
      return await this.testCompleteTransformationWorkflow();
    }, results);

    // Print summary
    this.printTestSummary(results);

    return results.failed === 0;
  }

  /**
   * Test basic file context integration
   */
  async testBasicFileContextIntegration() {
    const agentContent = `# BMad Developer Agent

This is a development agent for BMad Method.

## Capabilities
- Code development
- Testing
- Debugging`;

    const agentMetadata = {
      id: 'dev',
      expansionPack: null
    };

    const result = this.integrator.integrateFileContextSystem(agentContent, agentMetadata);

    // Verify file context integration sections are present
    const requiredSections = [
      '## File Context Integration',
      'Primary Context Sources:',
      '**#File**: Current file content and metadata',
      '**#Problems**: Build errors, linting issues, and diagnostics',
      '**#Terminal**: Command output and build logs',
      '## Project Understanding Integration',
      '## Workspace Boundary Respect',
      '## Multi-File Operation Support'
    ];

    for (const section of requiredSections) {
      if (!result.includes(section)) {
        throw new Error(`Missing required section: ${section}`);
      }
    }

    // Verify context-aware operations are described
    if (!result.includes('Context-Aware Operations')) {
      throw new Error('Missing context-aware operations description');
    }

    return { success: true, message: 'Basic file context integration working correctly' };
  }

  /**
   * Test agent-specific context requirements
   */
  async testAgentSpecificContextRequirements() {
    const testCases = [
      {
        agentId: 'dev',
        expectedPrimary: ['#File', '#Problems', '#Terminal'],
        expectedOperations: ['refactoring', 'debugging', 'testing']
      },
      {
        agentId: 'architect',
        expectedPrimary: ['#Codebase', '#Folder'],
        expectedOperations: ['architecture-analysis', 'dependency-mapping']
      },
      {
        agentId: 'qa',
        expectedPrimary: ['#Problems', '#File', '#Terminal'],
        expectedOperations: ['test-coverage', 'quality-analysis']
      }
    ];

    for (const testCase of testCases) {
      const agentContent = `# BMad ${testCase.agentId} Agent\n\nTest agent content.`;
      const agentMetadata = { id: testCase.agentId, expansionPack: null };

      const result = this.integrator.integrateFileContextSystem(agentContent, agentMetadata);

      // Check primary context sources
      for (const primaryContext of testCase.expectedPrimary) {
        if (!result.includes(`**${primaryContext}**:`)) {
          throw new Error(`Missing primary context ${primaryContext} for ${testCase.agentId} agent`);
        }
      }

      // Check multi-file operations
      for (const operation of testCase.expectedOperations) {
        const operationPattern = this.integrator.multiFileOperationPatterns[operation];
        if (operationPattern && !result.includes(operationPattern.description)) {
          throw new Error(`Missing operation ${operation} for ${testCase.agentId} agent`);
        }
      }
    }

    return { success: true, message: 'Agent-specific context requirements working correctly' };
  }

  /**
   * Test expansion pack context integration
   */
  async testExpansionPackContextIntegration() {
    const testCases = [
      {
        expansionPack: 'bmad-2d-phaser-game-dev',
        expectedContext: ['Game asset files', 'Phaser.js scene and state files']
      },
      {
        expansionPack: 'bmad-2d-unity-game-dev',
        expectedContext: ['Unity scene files and prefabs', 'C# script files']
      },
      {
        expansionPack: 'bmad-infrastructure-devops',
        expectedContext: ['Infrastructure as Code files', 'CI/CD pipeline configurations']
      }
    ];

    for (const testCase of testCases) {
      const agentContent = `# BMad Game Developer Agent\n\nTest expansion pack agent.`;
      const agentMetadata = {
        id: 'dev',
        expansionPack: testCase.expansionPack
      };

      const result = this.integrator.integrateFileContextSystem(agentContent, agentMetadata);

      // Check expansion pack specific context
      if (!result.includes(`${testCase.expansionPack} Specific Context:`)) {
        throw new Error(`Missing expansion pack context section for ${testCase.expansionPack}`);
      }

      for (const contextItem of testCase.expectedContext) {
        if (!result.includes(contextItem)) {
          throw new Error(`Missing expansion context item: ${contextItem}`);
        }
      }
    }

    return { success: true, message: 'Expansion pack context integration working correctly' };
  }

  /**
   * Test workspace boundary validation
   */
  async testWorkspaceBoundaryValidation() {
    const mockWorkspaceRoot = '/mock/workspace';
    
    // Test valid path within workspace
    const validPath = path.join(mockWorkspaceRoot, 'src', 'component.js');
    const validResult = await this.integrator.validateWorkspaceBoundaries(validPath, { root: mockWorkspaceRoot });
    
    if (!validResult.valid) {
      throw new Error('Valid workspace path should be accepted');
    }

    // Test invalid path outside workspace
    const invalidPath = '/outside/workspace/file.js';
    const invalidResult = await this.integrator.validateWorkspaceBoundaries(invalidPath, { root: mockWorkspaceRoot });
    
    if (invalidResult.valid) {
      throw new Error('Invalid workspace path should be rejected');
    }

    if (!invalidResult.errors.includes('Path is outside workspace boundaries')) {
      throw new Error('Should report boundary violation error');
    }

    return { success: true, message: 'Workspace boundary validation working correctly' };
  }

  /**
   * Test multi-file operation support
   */
  async testMultiFileOperationSupport() {
    const agentContent = `# BMad Developer Agent\n\nTest agent.`;
    const agentMetadata = { id: 'dev', expansionPack: null };

    const result = this.integrator.integrateFileContextSystem(agentContent, agentMetadata);

    // Check for multi-file operation patterns
    const expectedOperations = ['refactoring', 'debugging', 'testing'];
    const operationDescriptions = [
      'Code refactoring across multiple files',
      'Debug issues spanning multiple files',
      'Test implementation and coverage analysis'
    ];

    for (const description of operationDescriptions) {
      if (!result.includes(description)) {
        throw new Error(`Missing multi-file operation description: ${description}`);
      }
    }

    // Check for operation workflow
    const workflowSteps = [
      'Context Gathering',
      'Impact Analysis',
      'Dependency Mapping',
      'Change Planning',
      'Validation',
      'Execution'
    ];

    for (const step of workflowSteps) {
      if (!result.includes(step)) {
        throw new Error(`Missing workflow step: ${step}`);
      }
    }

    return { success: true, message: 'Multi-file operation support working correctly' };
  }

  /**
   * Test project understanding integration
   */
  async testProjectUnderstandingIntegration() {
    const agentContent = `# BMad Architect Agent\n\nTest architect agent.`;
    const agentMetadata = { id: 'architect', expansionPack: null };

    const result = this.integrator.integrateFileContextSystem(agentContent, agentMetadata);

    // Check for project understanding components
    const expectedComponents = [
      'Architecture Awareness:',
      'Dependency Intelligence:',
      'Pattern Recognition:',
      'Technology Stack Integration:'
    ];

    for (const component of expectedComponents) {
      if (!result.includes(component)) {
        throw new Error(`Missing project understanding component: ${component}`);
      }
    }

    // Check for architecture-focused insights
    if (!result.includes('architecture-focused insights')) {
      throw new Error('Missing architecture-focused insights for architect agent');
    }

    return { success: true, message: 'Project understanding integration working correctly' };
  }

  /**
   * Test complete transformation workflow
   */
  async testCompleteTransformationWorkflow() {
    // Create a mock BMad agent file
    const mockAgentContent = `---
agent:
  id: dev
  name: Developer
  title: BMad Developer
persona:
  role: Software Developer
  style: Technical and precise
commands:
  - name: help
    description: Show available commands
---

# BMad Developer Agent

I am a BMad Method developer agent focused on software development tasks.

## Capabilities
- Code development and review
- Testing and debugging
- Technical documentation`;

    const inputPath = '/mock/bmad-core/agents/dev.md';
    const outputPath = '/mock/.kiro/agents/dev.md';

    // Mock the transformation
    const options = {
      agentId: 'dev',
      source: 'bmad-core',
      expansionPack: null,
      enableKiroFeatures: true
    };

    try {
      const result = await this.transformer.performKiroAgentTransformation(
        mockAgentContent,
        inputPath,
        options
      );

      // Verify file context integration is present
      if (!result.includes('## File Context Integration')) {
        throw new Error('File context integration not added during transformation');
      }

      if (!result.includes('Primary Context Sources:')) {
        throw new Error('Primary context sources not included');
      }

      if (!result.includes('## Project Understanding Integration')) {
        throw new Error('Project understanding integration not added');
      }

      if (!result.includes('## Workspace Boundary Respect')) {
        throw new Error('Workspace boundary respect not added');
      }

      if (!result.includes('## Multi-File Operation Support')) {
        throw new Error('Multi-file operation support not added');
      }

      // Verify BMad persona is preserved
      if (!result.includes('BMad Developer')) {
        throw new Error('BMad persona not preserved');
      }

      return { success: true, message: 'Complete transformation workflow working correctly' };
    } catch (error) {
      throw new Error(`Transformation workflow failed: ${error.message}`);
    }
  }

  /**
   * Run a single test with error handling
   */
  async runTest(testName, testFunction, results) {
    try {
      console.log(chalk.yellow(`Running: ${testName}`));
      const result = await testFunction();
      console.log(chalk.green(`✓ ${testName}: ${result.message}`));
      results.passed++;
      results.tests.push({ name: testName, status: 'passed', message: result.message });
    } catch (error) {
      console.log(chalk.red(`✗ ${testName}: ${error.message}`));
      results.failed++;
      results.tests.push({ name: testName, status: 'failed', error: error.message });
    }
    console.log('');
  }

  /**
   * Print test summary
   */
  printTestSummary(results) {
    console.log(chalk.blue('📊 Test Summary'));
    console.log(chalk.blue('================'));
    console.log(`Total Tests: ${results.passed + results.failed}`);
    console.log(chalk.green(`Passed: ${results.passed}`));
    console.log(chalk.red(`Failed: ${results.failed}`));
    
    if (results.failed > 0) {
      console.log(chalk.red('\n❌ Failed Tests:'));
      results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(chalk.red(`  - ${test.name}: ${test.error}`));
        });
    } else {
      console.log(chalk.green('\n🎉 All tests passed!'));
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new FileContextIntegrationTester();
  tester.runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Test execution failed:'), error);
      process.exit(1);
    });
}

module.exports = FileContextIntegrationTester;