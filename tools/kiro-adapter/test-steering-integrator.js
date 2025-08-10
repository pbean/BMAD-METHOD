/**
 * Test Steering Integrator
 * Tests the steering rule integration functionality
 */

const SteeringIntegrator = require('./steering-integrator');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class SteeringIntegratorTester {
  constructor() {
    this.testDir = path.join(__dirname, 'test-output', 'steering-test');
    this.integrator = new SteeringIntegrator({ verbose: true });
  }

  async runAllTests() {
    console.log(chalk.blue.bold('\n🧪 Testing Steering Rule Integration\n'));

    try {
      await this.setupTestEnvironment();
      await this.testBasicSteeringRuleApplication();
      await this.testRulePrecedenceSystem();
      await this.testDynamicRuleLoading();
      await this.testConflictResolution();
      await this.testRuleValidation();
      
      console.log(chalk.green.bold('\n✅ All steering integration tests passed!\n'));
      return true;
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Steering integration tests failed:'), error.message);
      return false;
    }
  }

  async setupTestEnvironment() {
    console.log(chalk.yellow('Setting up test environment...'));
    
    // Clean and create test directory
    await fs.remove(this.testDir);
    await fs.ensureDir(this.testDir);
    
    // Create mock Kiro workspace structure
    const kiroDir = path.join(this.testDir, '.kiro');
    const steeringDir = path.join(kiroDir, 'steering');
    await fs.ensureDir(steeringDir);
    
    // Create test steering rules
    await this.createTestSteeringRules(steeringDir);
    
    console.log(chalk.green('✓ Test environment setup complete'));
  }

  async createTestSteeringRules(steeringDir) {
    // Create bmad-method.md (lowest precedence)
    const bmadRule = `---
inclusion: always
---

# BMad Method Rules

## Core Principles

- Follow BMad structured approach
- Maintain agent specialization
- Use spec-driven development

## Code Style

- Use 4 spaces for indentation
- Write comprehensive comments
`;
    await fs.writeFile(path.join(steeringDir, 'bmad-method.md'), bmadRule);

    // Create tech.md (higher precedence)
    const techRule = `---
inclusion: always
---

# Technical Stack Rules

## Code Style

- Use 2 spaces for indentation
- Follow TypeScript conventions
- Use ESLint and Prettier

## Architecture

- Use dependency injection
- Follow SOLID principles
- Implement proper error handling
`;
    await fs.writeFile(path.join(steeringDir, 'tech.md'), techRule);

    // Create project-specific.md (highest precedence)
    const projectRule = `---
inclusion: always
---

# Project Specific Rules

## Code Style

- Use tabs for indentation
- Custom naming conventions

## Testing

- Minimum 90% test coverage
- Use Jest for testing
`;
    await fs.writeFile(path.join(steeringDir, 'project-specific.md'), projectRule);

    // Create conditional rule
    const conditionalRule = `---
inclusion: fileMatch
fileMatchPattern: ".*\\\\.ts$"
---

# TypeScript Specific Rules

## Type Safety

- Use strict mode
- Avoid any types
- Define proper interfaces
`;
    await fs.writeFile(path.join(steeringDir, 'typescript.md'), conditionalRule);

    // Create agent-specific rule
    const agentRule = `---
inclusion: always
agentFilter: "dev|architect"
---

# Development Agent Rules

## Development Practices

- Use TDD approach
- Write integration tests
- Document API changes
`;
    await fs.writeFile(path.join(steeringDir, 'dev.md'), agentRule);
  }

  async testBasicSteeringRuleApplication() {
    console.log(chalk.yellow('Testing basic steering rule application...'));
    
    const kiroPath = this.testDir;
    const agentId = 'dev';
    const projectContext = {
      agentId: 'dev',
      currentFile: 'src/main.ts'
    };
    
    const appliedRules = await this.integrator.readAndApplySteeringRules(kiroPath, agentId, projectContext);
    
    // Verify rules were loaded
    if (!appliedRules || Object.keys(appliedRules).length === 0) {
      throw new Error('No steering rules were applied');
    }
    
    // Verify specific rules exist
    if (!appliedRules.core_principles) {
      throw new Error('Core principles rule not found');
    }
    
    if (!appliedRules.code_style) {
      throw new Error('Code style rule not found');
    }
    
    console.log(chalk.green('✓ Basic steering rule application works'));
    console.log(chalk.gray(`  Applied ${Object.keys(appliedRules).length} rules`));
  }

  async testRulePrecedenceSystem() {
    console.log(chalk.yellow('Testing rule precedence system...'));
    
    const kiroPath = this.testDir;
    const agentId = 'architect';
    const projectContext = { agentId: 'architect' };
    
    const appliedRules = await this.integrator.readAndApplySteeringRules(kiroPath, agentId, projectContext);
    
    // Check that higher precedence rules override lower ones
    // project-specific.md should override tech.md which should override bmad-method.md
    const codeStyleRule = appliedRules.code_style;
    
    if (!codeStyleRule) {
      console.log('Available rules:', Object.keys(appliedRules));
      throw new Error('Code style rule not found');
    }
    
    console.log('Code style rule value:', codeStyleRule.value);
    console.log('Code style rule source:', codeStyleRule.source);
    
    // Should use tabs (from project-specific.md) not spaces (from other rules)
    const ruleText = Array.isArray(codeStyleRule.value) ? codeStyleRule.value.join(' ') : codeStyleRule.value;
    if (!ruleText.includes('tabs')) {
      throw new Error(`Rule precedence not working - should use tabs from project-specific.md. Got: ${ruleText}`);
    }
    
    // Verify source tracking
    if (codeStyleRule.source !== 'project-specific.md') {
      throw new Error(`Expected source to be project-specific.md, got ${codeStyleRule.source}`);
    }
    
    console.log(chalk.green('✓ Rule precedence system works'));
    console.log(chalk.gray(`  Code style rule source: ${codeStyleRule.source}`));
  }

  async testDynamicRuleLoading() {
    console.log(chalk.yellow('Testing dynamic rule loading...'));
    
    const kiroPath = this.testDir;
    const projectContext = {
      currentFile: 'src/component.ts',
      agentId: 'dev'
    };
    
    const appliedRules = await this.integrator.readAndApplySteeringRules(kiroPath, 'dev', projectContext);
    
    // Should include TypeScript-specific rules due to .ts file
    if (!appliedRules.type_safety) {
      throw new Error('TypeScript-specific rules not loaded for .ts file');
    }
    
    // Should include development-specific rules due to dev agent
    if (!appliedRules.development_practices) {
      throw new Error('Development-specific rules not loaded for dev agent');
    }
    
    console.log(chalk.green('✓ Dynamic rule loading works'));
    console.log(chalk.gray('  TypeScript and development rules loaded'));
  }

  async testConflictResolution() {
    console.log(chalk.yellow('Testing conflict resolution...'));
    
    // Create conflicting rules
    const steeringDir = path.join(this.testDir, '.kiro', 'steering');
    const conflictRule = `---
inclusion: always
---

# Conflicting Rule

## Code Style

- Use 8 spaces for indentation
- Different naming convention
`;
    await fs.writeFile(path.join(steeringDir, 'conflict.md'), conflictRule);
    
    // Clear cache to force reload
    this.integrator.clearCache();
    
    const kiroPath = this.testDir;
    const appliedRules = await this.integrator.readAndApplySteeringRules(kiroPath, 'test-agent', {});
    
    // Should resolve conflicts using precedence
    const codeStyleRule = appliedRules.code_style;
    if (!codeStyleRule) {
      throw new Error('Code style rule not found after conflict');
    }
    
    // Should still use the highest precedence rule (project-specific.md with tabs)
    const conflictRuleText = Array.isArray(codeStyleRule.value) ? codeStyleRule.value.join(' ') : codeStyleRule.value;
    console.log('Conflict resolution - rule value:', conflictRuleText);
    console.log('Conflict resolution - rule source:', codeStyleRule.source);
    
    if (!conflictRuleText.includes('tabs')) {
      throw new Error(`Conflict resolution failed - should still use highest precedence rule. Got: ${conflictRuleText} from ${codeStyleRule.source}`);
    }
    
    console.log(chalk.green('✓ Conflict resolution works'));
    console.log(chalk.gray(`  Resolved to: ${codeStyleRule.source}`));
  }

  async testRuleValidation() {
    console.log(chalk.yellow('Testing rule validation...'));
    
    const kiroPath = this.testDir;
    const validation = await this.integrator.validateSteeringRuleConsistency(kiroPath);
    
    if (!validation) {
      throw new Error('Validation returned null');
    }
    
    // Should detect conflicts we created
    if (validation.conflicts.length === 0) {
      throw new Error('Should have detected rule conflicts');
    }
    
    // Should still be valid overall (conflicts are warnings, not errors)
    if (!validation.valid && validation.errors.length === 0) {
      throw new Error('Validation should be valid when only conflicts exist');
    }
    
    console.log(chalk.green('✓ Rule validation works'));
    console.log(chalk.gray(`  Found ${validation.conflicts.length} conflicts, ${validation.errors.length} errors`));
  }

  async testCacheManagement() {
    console.log(chalk.yellow('Testing cache management...'));
    
    const kiroPath = this.testDir;
    const agentId = 'test-cache';
    
    // Load rules (should cache)
    await this.integrator.readAndApplySteeringRules(kiroPath, agentId, {});
    
    // Check cache exists
    const cached = this.integrator.getCachedSteeringRules(agentId);
    if (!cached) {
      throw new Error('Rules not cached');
    }
    
    // Clear specific cache
    this.integrator.clearCache(agentId);
    const clearedCache = this.integrator.getCachedSteeringRules(agentId);
    if (clearedCache) {
      throw new Error('Cache not cleared for specific agent');
    }
    
    console.log(chalk.green('✓ Cache management works'));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SteeringIntegratorTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Test execution failed:'), error);
      process.exit(1);
    });
}

module.exports = SteeringIntegratorTester;