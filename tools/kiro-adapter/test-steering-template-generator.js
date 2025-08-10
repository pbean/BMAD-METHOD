/**
 * Test Steering Template Generator
 * Tests the steering rule template generation functionality
 */

const SteeringTemplateGenerator = require('./steering-template-generator');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class SteeringTemplateGeneratorTester {
  constructor() {
    this.testDir = path.join(__dirname, 'test-output', 'template-test');
    this.generator = new SteeringTemplateGenerator({ verbose: true });
  }

  async runAllTests() {
    console.log(chalk.blue.bold('\n🧪 Testing Steering Template Generation\n'));

    try {
      await this.setupTestEnvironment();
      await this.testCoreBMadRulesGeneration();
      await this.testTechnicalPreferencesGeneration();
      await this.testProjectStructureGeneration();
      await this.testProjectTypeSpecificRules();
      await this.testLanguageSpecificTemplates();
      await this.testFrameworkSpecificTemplates();
      
      console.log(chalk.green.bold('\n✅ All steering template generation tests passed!\n'));
      return true;
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Steering template generation tests failed:'), error.message);
      return false;
    }
  }

  async setupTestEnvironment() {
    console.log(chalk.yellow('Setting up test environment...'));
    
    // Clean and create test directory
    await fs.remove(this.testDir);
    await fs.ensureDir(this.testDir);
    
    console.log(chalk.green('✓ Test environment setup complete'));
  }

  async testCoreBMadRulesGeneration() {
    console.log(chalk.yellow('Testing core BMad rules generation...'));
    
    await this.generator.generateBMadSteeringRules(this.testDir, 'generic');
    
    const bmadRulePath = path.join(this.testDir, '.kiro', 'steering', 'bmad-method.md');
    
    if (!await fs.pathExists(bmadRulePath)) {
      throw new Error('BMad method rules file not created');
    }
    
    const content = await fs.readFile(bmadRulePath, 'utf8');
    
    // Verify content contains expected sections
    if (!content.includes('## Core Principles')) {
      throw new Error('Core Principles section not found');
    }
    
    if (!content.includes('## Agent Behavior Standards')) {
      throw new Error('Agent Behavior Standards section not found');
    }
    
    if (!content.includes('## Quality Assurance')) {
      throw new Error('Quality Assurance section not found');
    }
    
    console.log(chalk.green('✓ Core BMad rules generation works'));
  }

  async testTechnicalPreferencesGeneration() {
    console.log(chalk.yellow('Testing technical preferences generation...'));
    
    const techPrefPath = path.join(this.testDir, '.kiro', 'steering', 'tech-preferences.md');
    
    if (!await fs.pathExists(techPrefPath)) {
      throw new Error('Technical preferences file not created');
    }
    
    const content = await fs.readFile(techPrefPath, 'utf8');
    
    // Verify content contains expected sections
    if (!content.includes('## Code Style')) {
      throw new Error('Code Style section not found');
    }
    
    if (!content.includes('## Architecture Patterns')) {
      throw new Error('Architecture Patterns section not found');
    }
    
    if (!content.includes('## Testing Standards')) {
      throw new Error('Testing Standards section not found');
    }
    
    console.log(chalk.green('✓ Technical preferences generation works'));
  }

  async testProjectStructureGeneration() {
    console.log(chalk.yellow('Testing project structure generation...'));
    
    const structurePath = path.join(this.testDir, '.kiro', 'steering', 'structure.md');
    
    if (!await fs.pathExists(structurePath)) {
      throw new Error('Project structure file not created');
    }
    
    const content = await fs.readFile(structurePath, 'utf8');
    
    // Verify content contains expected sections
    if (!content.includes('## Directory Organization')) {
      throw new Error('Directory Organization section not found');
    }
    
    if (!content.includes('## BMad Workflow Organization')) {
      throw new Error('BMad Workflow Organization section not found');
    }
    
    console.log(chalk.green('✓ Project structure generation works'));
  }

  async testProjectTypeSpecificRules() {
    console.log(chalk.yellow('Testing project type specific rules...'));
    
    // Test React project type
    await this.generator.generateBMadSteeringRules(this.testDir, 'react', { overwrite: true });
    
    const reactRulePath = path.join(this.testDir, '.kiro', 'steering', 'react.md');
    
    if (!await fs.pathExists(reactRulePath)) {
      throw new Error('React specific rules file not created');
    }
    
    const reactContent = await fs.readFile(reactRulePath, 'utf8');
    
    if (!reactContent.includes('## React Development Guidelines')) {
      throw new Error('React Development Guidelines section not found');
    }
    
    if (!reactContent.includes('### Component Development')) {
      throw new Error('Component Development section not found');
    }
    
    console.log(chalk.green('✓ Project type specific rules generation works'));
  }

  async testLanguageSpecificTemplates() {
    console.log(chalk.yellow('Testing language specific templates...'));
    
    const techStack = {
      javascript: { version: 'ES2020' },
      typescript: { strict: true },
      python: { version: '3.9' }
    };
    
    await this.generator.createTechnicalStandardsTemplates(this.testDir, techStack);
    
    // Check JavaScript template
    const jsTemplatePath = path.join(this.testDir, '.kiro', 'steering', 'javascript.md');
    if (!await fs.pathExists(jsTemplatePath)) {
      throw new Error('JavaScript template not created');
    }
    
    const jsContent = await fs.readFile(jsTemplatePath, 'utf8');
    if (!jsContent.includes('fileMatchPattern: ".*\\\\.(js|jsx)$"')) {
      throw new Error('JavaScript file pattern not found');
    }
    
    // Check TypeScript template
    const tsTemplatePath = path.join(this.testDir, '.kiro', 'steering', 'typescript.md');
    if (!await fs.pathExists(tsTemplatePath)) {
      throw new Error('TypeScript template not created');
    }
    
    const tsContent = await fs.readFile(tsTemplatePath, 'utf8');
    if (!tsContent.includes('## Type Safety')) {
      throw new Error('TypeScript Type Safety section not found');
    }
    
    console.log(chalk.green('✓ Language specific templates generation works'));
  }

  async testFrameworkSpecificTemplates() {
    console.log(chalk.yellow('Testing framework specific templates...'));
    
    const techStack = {
      frameworks: ['express', 'react']
    };
    
    await this.generator.createTechnicalStandardsTemplates(this.testDir, techStack);
    
    // Check Express template
    const expressTemplatePath = path.join(this.testDir, '.kiro', 'steering', 'express.md');
    if (!await fs.pathExists(expressTemplatePath)) {
      throw new Error('Express template not created');
    }
    
    const expressContent = await fs.readFile(expressTemplatePath, 'utf8');
    if (!expressContent.includes('## Application Structure')) {
      throw new Error('Express Application Structure section not found');
    }
    
    console.log(chalk.green('✓ Framework specific templates generation works'));
  }

  async testOverwriteProtection() {
    console.log(chalk.yellow('Testing overwrite protection...'));
    
    // Create a custom rule
    const customRulePath = path.join(this.testDir, '.kiro', 'steering', 'custom.md');
    await fs.writeFile(customRulePath, '# Custom Rule\nThis should not be overwritten');
    
    // Try to generate rules again without overwrite flag
    await this.generator.generateBMadSteeringRules(this.testDir, 'generic');
    
    // Custom rule should still exist
    if (!await fs.pathExists(customRulePath)) {
      throw new Error('Custom rule was deleted');
    }
    
    const customContent = await fs.readFile(customRulePath, 'utf8');
    if (!customContent.includes('This should not be overwritten')) {
      throw new Error('Custom rule was overwritten');
    }
    
    console.log(chalk.green('✓ Overwrite protection works'));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SteeringTemplateGeneratorTester();
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Test execution failed:'), error);
      process.exit(1);
    });
}

module.exports = SteeringTemplateGeneratorTester;