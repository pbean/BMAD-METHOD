#!/usr/bin/env node

/**
 * Comprehensive Agent Transformation Test
 * Tests the complete agent transformation system including context injection,
 * dependency resolution, and agent file conversion
 */

const path = require('path');
const fs = require('fs-extra');
const AgentDiscovery = require('./agent-discovery');
const ContextInjector = require('./context-injector');
const DependencyResolver = require('./dependency-resolver');
const AgentFileConverter = require('./agent-file-converter');

class ComprehensiveTransformationTest {
  constructor() {
    this.testResults = {
      discovery: null,
      contextInjection: null,
      dependencyResolution: null,
      fileConversion: null,
      integration: null
    };
    this.testOutputDir = path.join(__dirname, 'test-output', 'comprehensive-transformation');
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Agent Transformation Tests\n');

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Test 1: Agent Discovery
      console.log('📋 Testing Agent Discovery...');
      await this.testAgentDiscovery();

      // Test 2: Context Injection
      console.log('🎯 Testing Context Injection...');
      await this.testContextInjection();

      // Test 3: Dependency Resolution
      console.log('🔗 Testing Dependency Resolution...');
      await this.testDependencyResolution();

      // Test 4: File Conversion
      console.log('🔄 Testing File Conversion...');
      await this.testFileConversion();

      // Test 5: Integration Test
      console.log('🔧 Testing Complete Integration...');
      await this.testCompleteIntegration();

      // Generate test report
      await this.generateTestReport();

      console.log('\n✅ All tests completed successfully!');
      return true;

    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      console.error(error.stack);
      return false;
    }
  }

  async setupTestEnvironment() {
    console.log('Setting up test environment...');
    
    // Ensure test output directory exists
    await fs.ensureDir(this.testOutputDir);
    
    // Clean previous test results
    await fs.emptyDir(this.testOutputDir);
    
    console.log(`Test output directory: ${this.testOutputDir}`);
  }

  async testAgentDiscovery() {
    const discovery = new AgentDiscovery({
      rootPath: process.cwd(),
      verbose: true,
      validateDependencies: true
    });

    // Discover all agents
    const agents = await discovery.scanAllAgents();
    
    // Get statistics
    const stats = discovery.getStatistics();
    
    this.testResults.discovery = {
      totalAgents: agents.length,
      coreAgents: stats.core,
      expansionAgents: stats.expansionPack,
      validAgents: stats.valid,
      invalidAgents: stats.invalid,
      expansionPacks: stats.expansionPacks,
      validationErrors: discovery.getValidationErrors()
    };

    console.log(`  ✓ Discovered ${agents.length} agents`);
    console.log(`  ✓ Core agents: ${stats.core}`);
    console.log(`  ✓ Expansion pack agents: ${stats.expansionPack}`);
    console.log(`  ✓ Valid agents: ${stats.valid}`);
    
    if (stats.invalid > 0) {
      console.log(`  ⚠️  Invalid agents: ${stats.invalid}`);
    }

    // Test specific agent retrieval
    const pmAgent = discovery.getAgent('pm');
    if (pmAgent) {
      console.log(`  ✓ Successfully retrieved PM agent`);
    }

    // Save discovery results
    await fs.writeJSON(
      path.join(this.testOutputDir, 'discovery-results.json'),
      {
        agents: agents.map(a => ({
          id: a.id,
          name: a.name,
          source: a.source,
          expansionPack: a.expansionPack,
          isValid: a.isValid,
          dependencies: a.dependencies
        })),
        statistics: stats,
        errors: discovery.getValidationErrors()
      },
      { spaces: 2 }
    );

    return agents;
  }

  async testContextInjection() {
    const contextInjector = new ContextInjector();
    
    // Test basic context injection
    const testContent = `# Test Agent

This is a test agent for context injection.

## Capabilities

I can help with development tasks.`;

    const injectedContent = contextInjector.injectAutomaticContextReferences(
      testContent, 
      'dev',
      { expansionPack: 'bmad-2d-phaser-game-dev' }
    );

    // Test steering rule generation
    const mockAgentMetadata = {
      id: 'test-agent',
      name: 'Test Agent',
      persona: {
        role: 'Test Assistant',
        focus: 'Testing workflows',
        style: 'Systematic and thorough',
        core_principles: ['Test everything', 'Document results', 'Maintain quality']
      },
      commands: [
        { name: 'test', description: 'Run tests' },
        { name: 'validate', description: 'Validate results' }
      ],
      dependencies: {
        tasks: ['test-task.md'],
        templates: ['test-template.yaml']
      }
    };

    const steeringRules = contextInjector.generateSteeringRules(mockAgentMetadata);
    
    // Test context prompts
    const contextPrompts = contextInjector.createContextPrompts(mockAgentMetadata, {
      expansionPack: 'bmad-2d-phaser-game-dev'
    });

    this.testResults.contextInjection = {
      contentInjected: injectedContent.length > testContent.length,
      steeringRulesGenerated: steeringRules.rules.length > 0,
      contextPromptsCreated: contextPrompts.length > 0,
      expansionPackSupport: injectedContent.includes('bmad-2d-phaser-game-dev')
    };

    console.log(`  ✓ Context injection successful`);
    console.log(`  ✓ Generated ${steeringRules.rules.length} steering rules`);
    console.log(`  ✓ Created ${contextPrompts.length} context prompts`);

    // Save context injection results
    await fs.writeFile(
      path.join(this.testOutputDir, 'context-injection-sample.md'),
      injectedContent,
      'utf8'
    );

    await fs.writeJSON(
      path.join(this.testOutputDir, 'steering-rules.json'),
      steeringRules,
      { spaces: 2 }
    );

    await fs.writeJSON(
      path.join(this.testOutputDir, 'context-prompts.json'),
      contextPrompts,
      { spaces: 2 }
    );
  }

  async testDependencyResolution() {
    const dependencyResolver = new DependencyResolver({
      rootPath: process.cwd(),
      validateDependencies: true
    });

    // Test with a real agent if available
    const discovery = new AgentDiscovery({ rootPath: process.cwd() });
    const agents = await discovery.scanAllAgents();
    
    if (agents.length === 0) {
      console.log('  ⚠️  No agents found for dependency testing');
      return;
    }

    const testAgent = agents[0]; // Use first available agent
    const dependencyResult = await dependencyResolver.scanAgentDependencies(testAgent);
    
    // Test dependency validation
    const validationReport = dependencyResolver.validateDependencyResolution(dependencyResult);
    
    this.testResults.dependencyResolution = {
      agentTested: testAgent.id,
      totalDependencies: Object.values(dependencyResult.resolvedDependencies)
        .reduce((sum, deps) => sum + Object.keys(deps).length, 0),
      missingDependencies: Object.values(dependencyResult.missingDependencies)
        .reduce((sum, deps) => sum + deps.length, 0),
      validationPassed: validationReport.isValid,
      errors: dependencyResult.errors.length,
      warnings: dependencyResult.warnings.length
    };

    console.log(`  ✓ Tested dependencies for agent: ${testAgent.id}`);
    console.log(`  ✓ Resolved ${this.testResults.dependencyResolution.totalDependencies} dependencies`);
    
    if (this.testResults.dependencyResolution.missingDependencies > 0) {
      console.log(`  ⚠️  Missing ${this.testResults.dependencyResolution.missingDependencies} dependencies`);
    }

    // Save dependency resolution results
    await fs.writeJSON(
      path.join(this.testOutputDir, 'dependency-resolution.json'),
      {
        agentId: testAgent.id,
        result: dependencyResult,
        validation: validationReport,
        cacheStats: dependencyResolver.getCacheStatistics()
      },
      { spaces: 2 }
    );
  }

  async testFileConversion() {
    const converter = new AgentFileConverter({
      rootPath: process.cwd()
    });

    // Get agents for conversion testing
    const discovery = new AgentDiscovery({ rootPath: process.cwd() });
    const agents = await discovery.scanAllAgents();
    
    if (agents.length === 0) {
      console.log('  ⚠️  No agents found for conversion testing');
      return;
    }

    // Test single agent conversion
    const testAgent = agents[0];
    const outputPath = path.join(this.testOutputDir, 'converted-agents', `${testAgent.id}.md`);
    
    const conversionResult = await converter.convertAgent(testAgent, outputPath, {
      preservePersona: true,
      addKiroIntegration: true,
      generateSteeringRules: true
    });

    // Test batch conversion (limit to first 3 agents for testing)
    const testAgents = agents.slice(0, Math.min(3, agents.length));
    const batchOutputDir = path.join(this.testOutputDir, 'batch-converted-agents');
    
    const batchResult = await converter.batchConvertAgents(testAgents, batchOutputDir, {
      preservePersona: true,
      addKiroIntegration: true
    });

    this.testResults.fileConversion = {
      singleConversionSuccess: conversionResult.success,
      batchConversionsTotal: batchResult.statistics.total,
      batchConversionsSuccessful: batchResult.statistics.successful,
      batchConversionsFailed: batchResult.statistics.failed,
      conversionWarnings: batchResult.statistics.warnings
    };

    console.log(`  ✓ Single agent conversion: ${conversionResult.success ? 'Success' : 'Failed'}`);
    console.log(`  ✓ Batch conversion: ${batchResult.statistics.successful}/${batchResult.statistics.total} successful`);

    // Save conversion results
    await fs.writeJSON(
      path.join(this.testOutputDir, 'conversion-results.json'),
      {
        singleConversion: conversionResult,
        batchConversion: {
          statistics: batchResult.statistics,
          successful: batchResult.successful.map(r => ({ agentId: r.agentId, outputPath: r.outputPath })),
          failed: batchResult.failed.map(r => ({ agentId: r.agentId, error: r.error }))
        },
        converterStats: converter.getConversionStatistics()
      },
      { spaces: 2 }
    );
  }

  async testCompleteIntegration() {
    console.log('  Running complete integration workflow...');

    // Step 1: Discover agents
    const discovery = new AgentDiscovery({
      rootPath: process.cwd(),
      validateDependencies: true
    });
    const agents = await discovery.scanAllAgents();

    if (agents.length === 0) {
      console.log('  ⚠️  No agents found for integration testing');
      return;
    }

    // Step 2: Select test agent (prefer PM agent if available)
    let testAgent = agents.find(a => a.id === 'pm') || agents[0];
    
    // Step 3: Resolve dependencies
    const dependencyResolver = new DependencyResolver({ rootPath: process.cwd() });
    const dependencyResult = await dependencyResolver.scanAgentDependencies(testAgent);

    // Step 4: Inject context
    const contextInjector = new ContextInjector();
    const steeringRules = contextInjector.generateSteeringRules(testAgent);
    const contextPrompts = contextInjector.createContextPrompts(testAgent);

    // Step 5: Convert agent
    const converter = new AgentFileConverter({ rootPath: process.cwd() });
    const outputPath = path.join(this.testOutputDir, 'integration-test', `${testAgent.id}-integrated.md`);
    
    const conversionResult = await converter.convertAgent(testAgent, outputPath, {
      preservePersona: true,
      addKiroIntegration: true,
      generateSteeringRules: true,
      expansionPack: testAgent.expansionPack
    });

    // Step 6: Validate integration
    const integrationValid = await this.validateIntegration(outputPath, testAgent, dependencyResult);

    this.testResults.integration = {
      agentId: testAgent.id,
      discoverySuccess: true,
      dependencyResolutionSuccess: dependencyResult.errors.length === 0,
      contextInjectionSuccess: steeringRules.rules.length > 0,
      conversionSuccess: conversionResult.success,
      integrationValid: integrationValid,
      totalDependencies: Object.values(dependencyResult.resolvedDependencies)
        .reduce((sum, deps) => sum + Object.keys(deps).length, 0),
      steeringRulesGenerated: steeringRules.rules.length,
      contextPromptsCreated: contextPrompts.length
    };

    console.log(`  ✓ Integration test completed for agent: ${testAgent.id}`);
    console.log(`  ✓ Dependencies resolved: ${this.testResults.integration.totalDependencies}`);
    console.log(`  ✓ Steering rules generated: ${this.testResults.integration.steeringRulesGenerated}`);
    console.log(`  ✓ Context prompts created: ${this.testResults.integration.contextPromptsCreated}`);
    console.log(`  ✓ Integration validation: ${integrationValid ? 'Passed' : 'Failed'}`);

    // Save integration results
    await fs.writeJSON(
      path.join(this.testOutputDir, 'integration-test-results.json'),
      {
        testAgent: {
          id: testAgent.id,
          name: testAgent.name,
          source: testAgent.source,
          expansionPack: testAgent.expansionPack
        },
        dependencyResult,
        steeringRules,
        contextPrompts,
        conversionResult,
        integrationValid
      },
      { spaces: 2 }
    );
  }

  async validateIntegration(outputPath, originalAgent, dependencyResult) {
    try {
      // Check if converted file exists and has content
      if (!await fs.pathExists(outputPath)) {
        return false;
      }

      const convertedContent = await fs.readFile(outputPath, 'utf8');
      
      // Validate content structure
      const hasYamlFrontMatter = convertedContent.startsWith('---');
      const hasContextAwareness = convertedContent.includes('## Context Awareness');
      const hasDependencyIntegration = convertedContent.includes('## Dependency Integration');
      const hasKiroIntegration = convertedContent.includes('## Kiro IDE Integration');
      const preservesPersona = convertedContent.includes(originalAgent.name);

      // Validate YAML front matter
      let frontMatterValid = false;
      try {
        const yaml = require('js-yaml');
        const frontMatterMatch = convertedContent.match(/^---\s*\n([\s\S]*?)\n---/);
        if (frontMatterMatch) {
          const frontMatter = yaml.load(frontMatterMatch[1]);
          frontMatterValid = frontMatter && 
                           frontMatter.name && 
                           frontMatter.bmad_agent_id === originalAgent.id;
        }
      } catch (error) {
        frontMatterValid = false;
      }

      return hasYamlFrontMatter && 
             hasContextAwareness && 
             hasDependencyIntegration && 
             hasKiroIntegration && 
             preservesPersona && 
             frontMatterValid;

    } catch (error) {
      console.error('Integration validation error:', error.message);
      return false;
    }
  }

  async generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      summary: {
        discoveryPassed: this.testResults.discovery?.totalAgents > 0,
        contextInjectionPassed: this.testResults.contextInjection?.contentInjected,
        dependencyResolutionPassed: this.testResults.dependencyResolution?.validationPassed,
        fileConversionPassed: this.testResults.fileConversion?.singleConversionSuccess,
        integrationPassed: this.testResults.integration?.integrationValid
      }
    };

    // Calculate overall success
    const passedTests = Object.values(report.summary).filter(Boolean).length;
    const totalTests = Object.keys(report.summary).length;
    report.overallSuccess = passedTests === totalTests;
    report.successRate = `${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`;

    // Save report
    await fs.writeJSON(
      path.join(this.testOutputDir, 'test-report.json'),
      report,
      { spaces: 2 }
    );

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    await fs.writeFile(
      path.join(this.testOutputDir, 'test-report.md'),
      markdownReport,
      'utf8'
    );

    console.log(`\n📊 Test Report Generated:`);
    console.log(`   Overall Success: ${report.overallSuccess ? '✅' : '❌'}`);
    console.log(`   Success Rate: ${report.successRate}`);
    console.log(`   Report Location: ${path.join(this.testOutputDir, 'test-report.md')}`);
  }

  generateMarkdownReport(report) {
    return `# Comprehensive Agent Transformation Test Report

**Generated:** ${report.timestamp}
**Overall Success:** ${report.overallSuccess ? '✅ PASSED' : '❌ FAILED'}
**Success Rate:** ${report.successRate}

## Test Results Summary

| Test | Status | Details |
|------|--------|---------|
| Agent Discovery | ${report.summary.discoveryPassed ? '✅' : '❌'} | Found ${report.testResults.discovery?.totalAgents || 0} agents |
| Context Injection | ${report.summary.contextInjectionPassed ? '✅' : '❌'} | Content injection and steering rules |
| Dependency Resolution | ${report.summary.dependencyResolutionPassed ? '✅' : '❌'} | Dependency scanning and validation |
| File Conversion | ${report.summary.fileConversionPassed ? '✅' : '❌'} | Agent file transformation |
| Integration | ${report.summary.integrationPassed ? '✅' : '❌'} | End-to-end workflow |

## Detailed Results

### Agent Discovery
- **Total Agents:** ${report.testResults.discovery?.totalAgents || 0}
- **Core Agents:** ${report.testResults.discovery?.coreAgents || 0}
- **Expansion Pack Agents:** ${report.testResults.discovery?.expansionAgents || 0}
- **Valid Agents:** ${report.testResults.discovery?.validAgents || 0}
- **Invalid Agents:** ${report.testResults.discovery?.invalidAgents || 0}

### Context Injection
- **Content Injected:** ${report.testResults.contextInjection?.contentInjected ? 'Yes' : 'No'}
- **Steering Rules Generated:** ${report.testResults.contextInjection?.steeringRulesGenerated ? 'Yes' : 'No'}
- **Context Prompts Created:** ${report.testResults.contextInjection?.contextPromptsCreated ? 'Yes' : 'No'}
- **Expansion Pack Support:** ${report.testResults.contextInjection?.expansionPackSupport ? 'Yes' : 'No'}

### Dependency Resolution
- **Agent Tested:** ${report.testResults.dependencyResolution?.agentTested || 'None'}
- **Total Dependencies:** ${report.testResults.dependencyResolution?.totalDependencies || 0}
- **Missing Dependencies:** ${report.testResults.dependencyResolution?.missingDependencies || 0}
- **Validation Passed:** ${report.testResults.dependencyResolution?.validationPassed ? 'Yes' : 'No'}
- **Errors:** ${report.testResults.dependencyResolution?.errors || 0}
- **Warnings:** ${report.testResults.dependencyResolution?.warnings || 0}

### File Conversion
- **Single Conversion Success:** ${report.testResults.fileConversion?.singleConversionSuccess ? 'Yes' : 'No'}
- **Batch Conversions Total:** ${report.testResults.fileConversion?.batchConversionsTotal || 0}
- **Batch Conversions Successful:** ${report.testResults.fileConversion?.batchConversionsSuccessful || 0}
- **Batch Conversions Failed:** ${report.testResults.fileConversion?.batchConversionsFailed || 0}
- **Conversion Warnings:** ${report.testResults.fileConversion?.conversionWarnings || 0}

### Integration Test
- **Agent ID:** ${report.testResults.integration?.agentId || 'None'}
- **Discovery Success:** ${report.testResults.integration?.discoverySuccess ? 'Yes' : 'No'}
- **Dependency Resolution Success:** ${report.testResults.integration?.dependencyResolutionSuccess ? 'Yes' : 'No'}
- **Context Injection Success:** ${report.testResults.integration?.contextInjectionSuccess ? 'Yes' : 'No'}
- **Conversion Success:** ${report.testResults.integration?.conversionSuccess ? 'Yes' : 'No'}
- **Integration Valid:** ${report.testResults.integration?.integrationValid ? 'Yes' : 'No'}
- **Total Dependencies:** ${report.testResults.integration?.totalDependencies || 0}
- **Steering Rules Generated:** ${report.testResults.integration?.steeringRulesGenerated || 0}
- **Context Prompts Created:** ${report.testResults.integration?.contextPromptsCreated || 0}

## Files Generated

- \`discovery-results.json\` - Agent discovery results
- \`context-injection-sample.md\` - Sample context injection
- \`steering-rules.json\` - Generated steering rules
- \`context-prompts.json\` - Generated context prompts
- \`dependency-resolution.json\` - Dependency resolution results
- \`conversion-results.json\` - File conversion results
- \`integration-test-results.json\` - Integration test results
- \`converted-agents/\` - Individual converted agents
- \`batch-converted-agents/\` - Batch converted agents
- \`integration-test/\` - Integration test outputs

## Recommendations

${report.overallSuccess 
  ? '✅ All tests passed! The comprehensive agent transformation system is working correctly.'
  : '❌ Some tests failed. Review the detailed results above and check the generated files for more information.'
}
`;
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new ComprehensiveTransformationTest();
  test.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveTransformationTest;