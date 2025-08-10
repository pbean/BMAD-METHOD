/**
 * Complete Steering Integration Test
 * Tests the full steering rule integration system
 */

const SteeringIntegrator = require('./steering-integrator');
const SteeringTemplateGenerator = require('./steering-template-generator');
const SteeringConflictResolver = require('./steering-conflict-resolver');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class CompleteSteeringIntegrationTester {
  constructor() {
    this.testDir = path.join(__dirname, 'test-output', 'complete-integration-test');
    this.integrator = new SteeringIntegrator({ verbose: true });
    this.templateGenerator = new SteeringTemplateGenerator({ verbose: true });
    this.conflictResolver = new SteeringConflictResolver({ verbose: true });
  }

  async runAllTests() {
    console.log(chalk.blue.bold('\n🧪 Testing Complete Steering Integration System\n'));

    try {
      await this.setupTestEnvironment();
      await this.testFullWorkflow();
      await this.testConflictResolutionWorkflow();
      await this.testValidationWorkflow();
      
      console.log(chalk.green.bold('\n✅ All complete steering integration tests passed!\n'));
      return true;
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Complete steering integration tests failed:'), error.message);
      console.error(error.stack);
      return false;
    }
  }

  async setupTestEnvironment() {
    console.log(chalk.yellow('Setting up complete test environment...'));
    
    // Clean and create test directory
    await fs.remove(this.testDir);
    await fs.ensureDir(this.testDir);
    
    console.log(chalk.green('✓ Complete test environment setup complete'));
  }

  async testFullWorkflow() {
    console.log(chalk.yellow('Testing full steering integration workflow...'));
    
    // Step 1: Generate BMad steering rules for a React project
    await this.templateGenerator.generateBMadSteeringRules(this.testDir, 'react');
    
    // Step 2: Create additional language-specific templates
    const techStack = {
      typescript: { strict: true },
      frameworks: ['react']
    };
    await this.templateGenerator.createTechnicalStandardsTemplates(this.testDir, techStack);
    
    // Step 3: Apply steering rules for a dev agent
    const projectContext = {
      agentId: 'dev',
      currentFile: 'src/component.tsx',
      projectType: 'react'
    };
    
    const appliedRules = await this.integrator.readAndApplySteeringRules(
      this.testDir, 
      'dev', 
      projectContext
    );
    
    // Verify rules were applied
    if (!appliedRules || Object.keys(appliedRules).length === 0) {
      throw new Error('No steering rules were applied in full workflow');
    }
    
    // Should have core BMad rules
    if (!appliedRules.core_principles) {
      throw new Error('Core BMad principles not found');
    }
    
    // Should have React-specific rules
    console.log('Available rules:', Object.keys(appliedRules));
    if (!appliedRules.react_development_guidelines) {
      throw new Error('React development guidelines not found');
    }
    
    // Should have TypeScript rules (due to .tsx file)
    if (!appliedRules.type_safety) {
      throw new Error('TypeScript type safety rules not found');
    }
    
    console.log(chalk.green('✓ Full workflow integration works'));
    console.log(chalk.gray(`  Applied ${Object.keys(appliedRules).length} rules from multiple sources`));
  }

  async testConflictResolutionWorkflow() {
    console.log(chalk.yellow('Testing conflict resolution workflow...'));
    
    // Create conflicting rules
    const steeringDir = path.join(this.testDir, '.kiro', 'steering');
    
    // Add a conflicting project-specific rule
    const conflictingRule = `---
inclusion: always
---

# Conflicting Project Rules

## Component Development

- Use class components instead of functional components
- Avoid hooks in favor of lifecycle methods
- Use different naming conventions

## Code Style

- Use 8 spaces for indentation
- Different comment style
`;
    await fs.writeFile(path.join(steeringDir, 'conflicting-project.md'), conflictingRule);
    
    // Clear cache to force reload
    this.integrator.clearCache();
    
    // Apply rules again - should detect and resolve conflicts
    const appliedRules = await this.integrator.readAndApplySteeringRules(
      this.testDir, 
      'react-dev', 
      { agentId: 'react-dev' }
    );
    
    // Should still have rules applied despite conflicts
    if (!appliedRules || Object.keys(appliedRules).length === 0) {
      throw new Error('No rules applied after conflicts introduced');
    }
    
    // Check if conflict resolution guide was created
    const guidePath = path.join(steeringDir, 'CONFLICT_RESOLUTION_GUIDE.md');
    if (await fs.pathExists(guidePath)) {
      const guideContent = await fs.readFile(guidePath, 'utf8');
      if (!guideContent.includes('Steering Rule Conflict Resolution Guide')) {
        throw new Error('Conflict resolution guide content invalid');
      }
    }
    
    console.log(chalk.green('✓ Conflict resolution workflow works'));
  }

  async testValidationWorkflow() {
    console.log(chalk.yellow('Testing validation workflow...'));
    
    // Run comprehensive validation
    const validation = await this.integrator.validateSteeringRuleConsistency(this.testDir);
    
    if (!validation) {
      throw new Error('No validation results returned');
    }
    
    // Should have file validation results
    if (!validation.fileValidation || Object.keys(validation.fileValidation).length === 0) {
      throw new Error('No file validation results');
    }
    
    // Check specific file validations
    const bmadValidation = validation.fileValidation['bmad-method.md'];
    if (!bmadValidation) {
      throw new Error('BMad method file not validated');
    }
    
    if (!bmadValidation.valid) {
      throw new Error('BMad method file should be valid');
    }
    
    console.log(chalk.green('✓ Validation workflow works'));
    console.log(chalk.gray(`  Validated ${Object.keys(validation.fileValidation).length} files`));
  }

  async testCacheManagement() {
    console.log(chalk.yellow('Testing cache management across components...'));
    
    const agentId = 'test-cache-agent';
    
    // Load rules (should cache)
    await this.integrator.readAndApplySteeringRules(this.testDir, agentId, {});
    
    // Check cache exists
    const cached = this.integrator.getCachedSteeringRules(agentId);
    if (!cached) {
      throw new Error('Rules not cached');
    }
    
    // Clear cache
    this.integrator.clearCache(agentId);
    
    // Verify cache cleared
    const clearedCache = this.integrator.getCachedSteeringRules(agentId);
    if (clearedCache) {
      throw new Error('Cache not properly cleared');
    }
    
    console.log(chalk.green('✓ Cache management works'));
  }

  async testDynamicRuleLoading() {
    console.log(chalk.yellow('Testing dynamic rule loading...'));
    
    // Test with different file contexts
    const contexts = [
      { currentFile: 'src/component.tsx', expectedRules: ['type_safety'] },
      { currentFile: 'src/utils.js', expectedRules: ['code_style'] },
      { currentFile: 'README.md', expectedRules: [] }
    ];
    
    for (const context of contexts) {
      this.integrator.clearCache(); // Clear cache for fresh load
      
      const appliedRules = await this.integrator.readAndApplySteeringRules(
        this.testDir,
        'dynamic-test',
        { ...context, agentId: 'dynamic-test' }
      );
      
      // Check if expected rules are present
      for (const expectedRule of context.expectedRules) {
        if (!appliedRules[expectedRule]) {
          throw new Error(`Expected rule ${expectedRule} not found for file ${context.currentFile}`);
        }
      }
    }
    
    console.log(chalk.green('✓ Dynamic rule loading works'));
  }

  async testErrorHandling() {
    console.log(chalk.yellow('Testing error handling...'));
    
    // Test with non-existent directory
    try {
      await this.integrator.readAndApplySteeringRules('/non/existent/path', 'test-agent', {});
      // Should create default rules, not throw error
    } catch (error) {
      // This is acceptable - some errors are expected
    }
    
    // Test with invalid YAML
    const steeringDir = path.join(this.testDir, '.kiro', 'steering');
    const invalidYamlRule = `---
invalid: yaml: content: [
---

# Invalid YAML Rule
This should still work despite invalid YAML
`;
    await fs.writeFile(path.join(steeringDir, 'invalid-yaml.md'), invalidYamlRule);
    
    // Should handle gracefully
    const appliedRules = await this.integrator.readAndApplySteeringRules(
      this.testDir,
      'error-test',
      { agentId: 'error-test' }
    );
    
    // Should still have other rules
    if (!appliedRules || Object.keys(appliedRules).length === 0) {
      throw new Error('All rules failed due to one invalid file');
    }
    
    console.log(chalk.green('✓ Error handling works'));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CompleteSteeringIntegrationTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Test execution failed:'), error);
      process.exit(1);
    });
}

module.exports = CompleteSteeringIntegrationTester;