/**
 * Test Steering Conflict Resolver
 * Tests the steering rule conflict resolution functionality
 */

const SteeringConflictResolver = require('./steering-conflict-resolver');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class SteeringConflictResolverTester {
  constructor() {
    this.testDir = path.join(__dirname, 'test-output', 'conflict-test');
    this.resolver = new SteeringConflictResolver({ verbose: true });
  }

  async runAllTests() {
    console.log(chalk.blue.bold('\n🧪 Testing Steering Conflict Resolution\n'));

    try {
      await this.setupTestEnvironment();
      await this.testConflictDetection();
      await this.testConflictAnalysis();
      await this.testResolutionGuidance();
      await this.testRuleValidation();
      await this.testUserGuidanceGeneration();
      
      console.log(chalk.green.bold('\n✅ All steering conflict resolution tests passed!\n'));
      return true;
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Steering conflict resolution tests failed:'), error.message);
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
    
    // Create conflicting steering rules
    await this.createConflictingSteeringRules(steeringDir);
    
    console.log(chalk.green('✓ Test environment setup complete'));
  }

  async createConflictingSteeringRules(steeringDir) {
    // Create bmad-method.md with base rules
    const bmadRule = `---
inclusion: always
---

# BMad Method Rules

## Code Style

- Use 4 spaces for indentation
- Write comprehensive comments
- Follow BMad naming conventions

## Architecture

- Use dependency injection
- Follow SOLID principles
`;
    await fs.writeFile(path.join(steeringDir, 'bmad-method.md'), bmadRule);

    // Create tech.md with conflicting rules
    const techRule = `---
inclusion: always
---

# Technical Rules

## Code Style

- Use 2 spaces for indentation
- Use TypeScript conventions
- Minimal comments for clean code

## Architecture

- Use dependency injection
- Prefer composition over inheritance
`;
    await fs.writeFile(path.join(steeringDir, 'tech.md'), techRule);

    // Create project-specific.md with overrides
    const projectRule = `---
inclusion: always
---

# Project Specific Rules

## Code Style

- Use tabs for indentation
- Custom naming conventions
- Detailed documentation required

## Security

- Validate all inputs
- Use HTTPS only
`;
    await fs.writeFile(path.join(steeringDir, 'project-specific.md'), projectRule);

    // Create invalid rule file for validation testing
    const invalidRule = `---
inclusion: invalidValue
fileMatchPattern: 
---

# Invalid Rule

## Empty Section

`;
    await fs.writeFile(path.join(steeringDir, 'invalid.md'), invalidRule);
  }

  async testConflictDetection() {
    console.log(chalk.yellow('Testing conflict detection...'));
    
    // Mock rule data structure
    const allRules = {
      'bmad-method.md': {
        inclusion: 'always',
        content: {
          code_style: ['Use 4 spaces for indentation', 'Write comprehensive comments'],
          architecture: ['Use dependency injection', 'Follow SOLID principles']
        }
      },
      'tech.md': {
        inclusion: 'always',
        content: {
          code_style: ['Use 2 spaces for indentation', 'Minimal comments'],
          architecture: ['Use dependency injection', 'Prefer composition']
        }
      },
      'project-specific.md': {
        inclusion: 'always',
        content: {
          code_style: ['Use tabs for indentation', 'Custom naming conventions'],
          security: ['Validate all inputs', 'Use HTTPS only']
        }
      }
    };
    
    const conflicts = this.resolver.detectConflicts(allRules, 'dev');
    
    if (conflicts.length === 0) {
      throw new Error('No conflicts detected when conflicts should exist');
    }
    
    // Should detect code_style conflict
    const codeStyleConflict = conflicts.find(c => c.key === 'code_style');
    if (!codeStyleConflict) {
      throw new Error('Code style conflict not detected');
    }
    
    if (codeStyleConflict.sources.length !== 3) {
      throw new Error(`Expected 3 conflicting sources, got ${codeStyleConflict.sources.length}`);
    }
    
    console.log(chalk.green('✓ Conflict detection works'));
    console.log(chalk.gray(`  Detected ${conflicts.length} conflicts`));
  }

  async testConflictAnalysis() {
    console.log(chalk.yellow('Testing conflict analysis...'));
    
    const sources = [
      {
        source: 'bmad-method.md',
        value: ['Use 4 spaces for indentation'],
        precedence: 1
      },
      {
        source: 'tech.md',
        value: ['Use 2 spaces for indentation'],
        precedence: 4
      },
      {
        source: 'project-specific.md',
        value: ['Use tabs for indentation'],
        precedence: 6
      }
    ];
    
    const conflict = this.resolver.analyzeConflict('code_style', sources, 'dev');
    
    if (!conflict) {
      throw new Error('Conflict analysis returned null');
    }
    
    if (conflict.severity === 'none') {
      throw new Error('Should detect conflict severity');
    }
    
    if (conflict.type !== 'bmad-vs-project') {
      throw new Error(`Expected bmad-vs-project conflict type, got ${conflict.type}`);
    }
    
    if (!conflict.resolution) {
      throw new Error('No resolution provided');
    }
    
    // Should choose highest precedence (project-specific.md)
    if (conflict.resolution.chosenSource !== 'project-specific.md') {
      throw new Error(`Expected project-specific.md to win, got ${conflict.resolution.chosenSource}`);
    }
    
    console.log(chalk.green('✓ Conflict analysis works'));
    console.log(chalk.gray(`  Severity: ${conflict.severity}, Type: ${conflict.type}`));
  }

  async testResolutionGuidance() {
    console.log(chalk.yellow('Testing resolution guidance...'));
    
    const conflicts = [
      {
        key: 'code_style',
        agentId: 'dev',
        severity: 'high',
        type: 'bmad-vs-project',
        sources: [
          { source: 'project-specific.md', value: ['Use tabs'], precedence: 6 },
          { source: 'tech.md', value: ['Use 2 spaces'], precedence: 4 }
        ],
        resolution: {
          strategy: 'precedence',
          chosenSource: 'project-specific.md',
          requiresUserReview: true
        }
      }
    ];
    
    const results = await this.resolver.provideResolutionGuidance(conflicts, this.testDir);
    
    if (!results) {
      throw new Error('No resolution results returned');
    }
    
    if (results.totalConflicts !== 1) {
      throw new Error(`Expected 1 conflict, got ${results.totalConflicts}`);
    }
    
    if (results.highSeverityConflicts !== 1) {
      throw new Error(`Expected 1 high severity conflict, got ${results.highSeverityConflicts}`);
    }
    
    if (!results.guidanceGenerated) {
      throw new Error('Guidance should have been generated');
    }
    
    // Check if guidance file was created
    const guidePath = path.join(this.testDir, '.kiro', 'steering', 'CONFLICT_RESOLUTION_GUIDE.md');
    if (!await fs.pathExists(guidePath)) {
      throw new Error('Conflict resolution guide not created');
    }
    
    const guideContent = await fs.readFile(guidePath, 'utf8');
    if (!guideContent.includes('HIGH Severity Conflicts')) {
      throw new Error('High severity section not found in guide');
    }
    
    console.log(chalk.green('✓ Resolution guidance works'));
    console.log(chalk.gray(`  Generated guidance for ${results.totalConflicts} conflicts`));
  }

  async testRuleValidation() {
    console.log(chalk.yellow('Testing rule validation...'));
    
    const validation = await this.resolver.validateRuleConsistency(this.testDir);
    
    if (!validation) {
      throw new Error('No validation results returned');
    }
    
    // Should detect the invalid rule file
    if (validation.valid) {
      throw new Error('Validation should fail due to invalid rule file');
    }
    
    if (validation.errors.length === 0) {
      throw new Error('Should have validation errors');
    }
    
    // Check specific validation for invalid.md
    const invalidValidation = validation.fileValidation['invalid.md'];
    if (!invalidValidation || invalidValidation.valid) {
      throw new Error('Invalid rule file should fail validation');
    }
    
    console.log(chalk.green('✓ Rule validation works'));
    console.log(chalk.gray(`  Found ${validation.errors.length} errors, ${validation.warnings.length} warnings`));
  }

  async testUserGuidanceGeneration() {
    console.log(chalk.yellow('Testing user guidance generation...'));
    
    const conflict = {
      key: 'code_style',
      agentId: 'dev',
      severity: 'high',
      type: 'bmad-vs-project',
      sources: [
        { source: 'project-specific.md', value: ['Use tabs'], precedence: 6 },
        { source: 'bmad-method.md', value: ['Use 4 spaces'], precedence: 1 }
      ]
    };
    
    const guidance = this.resolver.generateUserGuidance(conflict);
    
    if (!guidance) {
      throw new Error('No guidance generated');
    }
    
    if (!guidance.includes('## Steering Rule Conflict: code_style')) {
      throw new Error('Conflict title not found in guidance');
    }
    
    if (!guidance.includes('**Severity:** HIGH')) {
      throw new Error('Severity not found in guidance');
    }
    
    if (!guidance.includes('**Options:**')) {
      throw new Error('Options section not found in guidance');
    }
    
    // Test high severity guidance
    const highSeverityGuidance = this.resolver.generateHighSeverityGuidance(conflict);
    if (!highSeverityGuidance.includes('HIGH SEVERITY CONFLICT')) {
      throw new Error('High severity warning not found');
    }
    
    // Test BMad project guidance
    const bmadGuidance = this.resolver.generateBMadProjectGuidance(conflict);
    if (!bmadGuidance.includes('BMad vs Project Conflict')) {
      throw new Error('BMad project conflict guidance not found');
    }
    
    console.log(chalk.green('✓ User guidance generation works'));
  }

  async testSeverityDetermination() {
    console.log(chalk.yellow('Testing severity determination...'));
    
    // Test critical key (high severity)
    const criticalSources = [
      { value: ['Use tabs'], precedence: 6 },
      { value: ['Use spaces'], precedence: 4 }
    ];
    
    const criticalSeverity = this.resolver.determineSeverity('code_style', criticalSources);
    if (criticalSeverity !== 'high') {
      throw new Error(`Expected high severity for code_style, got ${criticalSeverity}`);
    }
    
    // Test same values (no conflict)
    const sameSources = [
      { value: ['Use tabs'], precedence: 6 },
      { value: ['Use tabs'], precedence: 4 }
    ];
    
    const sameSeverity = this.resolver.determineSeverity('some_rule', sameSources);
    if (sameSeverity !== 'none') {
      throw new Error(`Expected no severity for same values, got ${sameSeverity}`);
    }
    
    console.log(chalk.green('✓ Severity determination works'));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SteeringConflictResolverTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Test execution failed:'), error);
      process.exit(1);
    });
}

module.exports = SteeringConflictResolverTester;