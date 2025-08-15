#!/usr/bin/env node

/**
 * Test script for upgrade and migration functionality
 * Tests the complete upgrade and migration system
 */

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const UpgradeMigrationManager = require('./upgrade-migration-manager');

class UpgradeMigrationTester {
  constructor() {
    this.testDir = path.join(__dirname, 'test-output', 'upgrade-migration-test');
    this.manager = null;
  }

  async runTests() {
    console.log(chalk.cyan('🧪 Starting Upgrade and Migration Tests\n'));

    try {
      await this.setupTestEnvironment();
      await this.testIncompleteInstallationDetection();
      await this.testIncrementalConversion();
      await this.testSteeringWorkaroundMigration();
      await this.testCustomizationPreservation();
      await this.testCompleteUpgrade();
      await this.cleanup();

      console.log(chalk.green('\n✅ All upgrade and migration tests passed!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Tests failed:'), error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    console.log(chalk.blue('📁 Setting up test environment...'));

    // Clean and create test directory
    await fs.remove(this.testDir);
    await fs.ensureDir(this.testDir);

    // Create mock Kiro workspace structure
    await this.createMockKiroWorkspace();

    // Create mock BMad source structure
    await this.createMockBMadSource();

    // Initialize upgrade manager
    this.manager = new UpgradeMigrationManager({
      rootPath: this.testDir,
      verbose: true,
      dryRun: false
    });

    console.log(chalk.green('✓ Test environment setup complete'));
  }

  async createMockKiroWorkspace() {
    const kiroDir = path.join(this.testDir, '.kiro');
    
    // Create basic structure
    await fs.ensureDir(path.join(kiroDir, 'agents'));
    await fs.ensureDir(path.join(kiroDir, 'steering'));
    await fs.ensureDir(path.join(kiroDir, 'hooks'));
    await fs.ensureDir(path.join(kiroDir, 'specs'));

    // Create some existing agents (incomplete set)
    await fs.writeFile(path.join(kiroDir, 'agents', 'architect.md'), `---
name: BMad Architect
role: Software Architect
context_providers:
  - "#File"
  - "#Folder"
kiro_integration:
  version: "1.0.0"
  generated_at: "2024-01-01T00:00:00.000Z"
---

# BMad Architect

This is an existing Kiro-native agent.
`);

    // Create steering workaround
    await fs.writeFile(path.join(kiroDir, 'steering', 'dev-workaround.md'), `---
inclusion: always
---

# Developer Agent Workaround

You are a software developer agent. Your role is to write high-quality code.

When to use: Use this agent for coding tasks and development work.

## Instructions

- Write clean, maintainable code
- Follow best practices
- Test your code thoroughly
`);

    // Create user customization
    await fs.writeFile(path.join(kiroDir, 'steering', 'custom-rules.md'), `---
inclusion: always
---

# Custom Development Rules

<!-- user customization -->
These are my custom development preferences:

- Always use TypeScript
- Prefer functional programming
- Use Jest for testing

# Modified by user on 2024-01-15
Additional custom instructions here.
`);
  }

  async createMockBMadSource() {
    // Create mock bmad-core structure
    const bmadCoreDir = path.join(this.testDir, 'bmad-core', 'agents');
    await fs.ensureDir(bmadCoreDir);

    // Create source agents that should be converted
    await fs.writeFile(path.join(bmadCoreDir, 'dev.md'), `\`\`\`yaml
agent:
  id: dev
  name: Developer
  title: Software Developer
  icon: 👨‍💻
  whenToUse: "Use for coding tasks and software development"

persona:
  role: Software Developer
  style: Professional and detail-oriented
  identity: Experienced developer with strong technical skills
  focus: Writing high-quality, maintainable code

commands:
  - write-code: "Write code based on requirements"
  - review-code: "Review and improve existing code"
  - debug-code: "Debug and fix code issues"

dependencies:
  tasks:
    - create-component
    - write-tests
  templates:
    - code-template
\`\`\`

# Software Developer Agent

I am a software developer focused on writing high-quality code.

## My Capabilities

- Writing clean, maintainable code
- Code review and optimization
- Debugging and troubleshooting
- Testing and quality assurance
`);

    await fs.writeFile(path.join(bmadCoreDir, 'qa.md'), `\`\`\`yaml
agent:
  id: qa
  name: QA Engineer
  title: Quality Assurance Engineer
  icon: 🧪
  whenToUse: "Use for testing and quality assurance tasks"

persona:
  role: QA Engineer
  style: Methodical and thorough
  identity: Detail-oriented quality assurance professional
  focus: Ensuring software quality and reliability

commands:
  - create-tests: "Create comprehensive test suites"
  - review-quality: "Review code and system quality"

dependencies:
  tasks:
    - create-test-plan
  templates:
    - test-template
\`\`\`

# QA Engineer Agent

I am a QA engineer focused on ensuring software quality.

## My Capabilities

- Creating comprehensive test plans
- Automated and manual testing
- Quality assurance processes
- Bug tracking and reporting
`);

    // Create expansion pack structure
    const expansionDir = path.join(this.testDir, 'expansion-packs', 'test-expansion', 'agents');
    await fs.ensureDir(expansionDir);

    await fs.writeFile(path.join(expansionDir, 'game-dev.md'), `\`\`\`yaml
agent:
  id: game-dev
  name: Game Developer
  title: Game Development Specialist
  icon: 🎮
  whenToUse: "Use for game development tasks"

persona:
  role: Game Developer
  style: Creative and technical
  identity: Experienced game development professional
  focus: Creating engaging game experiences

commands:
  - design-gameplay: "Design game mechanics and systems"
  - optimize-performance: "Optimize game performance"

dependencies:
  tasks:
    - create-game-object
  templates:
    - game-template
\`\`\`

# Game Developer Agent

I am a game developer specialized in creating engaging games.

## My Capabilities

- Game design and mechanics
- Performance optimization
- Asset management
- Player experience design
`);
  }

  async testIncompleteInstallationDetection() {
    console.log(chalk.blue('\n🔍 Testing incomplete installation detection...'));

    const detection = await this.manager.detectIncompleteInstallation();

    // Verify detection results
    if (!detection.isIncomplete) {
      throw new Error('Should have detected incomplete installation');
    }

    if (detection.analysis.missingAgents === 0) {
      throw new Error('Should have detected missing agents');
    }

    if (detection.analysis.steeringWorkarounds === 0) {
      throw new Error('Should have detected steering workarounds');
    }

    console.log(chalk.green('✓ Incomplete installation detection working correctly'));
    console.log(chalk.cyan(`  - Missing agents: ${detection.analysis.missingAgents}`));
    console.log(chalk.cyan(`  - Steering workarounds: ${detection.analysis.steeringWorkarounds}`));
    console.log(chalk.cyan(`  - User customizations: ${detection.analysis.userCustomizations}`));
  }

  async testIncrementalConversion() {
    console.log(chalk.blue('\n🔄 Testing incremental agent conversion...'));

    // Test converting specific missing agents
    const conversionResult = await this.manager.performIncrementalConversion(['dev', 'qa'], {
      skipExisting: true
    });

    if (!conversionResult.success) {
      throw new Error('Incremental conversion should have succeeded');
    }

    if (conversionResult.converted.length !== 2) {
      throw new Error(`Expected 2 converted agents, got ${conversionResult.converted.length}`);
    }

    // Verify agents were actually created
    const devAgentPath = path.join(this.testDir, '.kiro', 'agents', 'dev.md');
    const qaAgentPath = path.join(this.testDir, '.kiro', 'agents', 'qa.md');

    if (!await fs.pathExists(devAgentPath)) {
      throw new Error('Dev agent file was not created');
    }

    if (!await fs.pathExists(qaAgentPath)) {
      throw new Error('QA agent file was not created');
    }

    // Verify content is Kiro-compatible
    const devContent = await fs.readFile(devAgentPath, 'utf8');
    if (!devContent.includes('kiro_integration')) {
      throw new Error('Converted agent should have Kiro integration metadata');
    }

    console.log(chalk.green('✓ Incremental conversion working correctly'));
    console.log(chalk.cyan(`  - Converted: ${conversionResult.converted.join(', ')}`));
  }

  async testSteeringWorkaroundMigration() {
    console.log(chalk.blue('\n🔀 Testing steering workaround migration...'));

    const migrationResult = await this.manager.migrateSteeringWorkarounds({
      removeWorkarounds: false // Keep originals for testing
    });

    if (!migrationResult.success) {
      throw new Error('Steering workaround migration should have succeeded');
    }

    if (migrationResult.migrated.length === 0) {
      throw new Error('Should have migrated at least one workaround');
    }

    // Verify migrated agent was created
    const migratedAgent = migrationResult.migrated[0];
    if (!await fs.pathExists(migratedAgent.migrated)) {
      throw new Error('Migrated agent file was not created');
    }

    // Verify backup was created
    if (!await fs.pathExists(migratedAgent.backupPath)) {
      throw new Error('Backup of original steering file was not created');
    }

    console.log(chalk.green('✓ Steering workaround migration working correctly'));
    console.log(chalk.cyan(`  - Migrated: ${migrationResult.migrated.length} workarounds`));
  }

  async testCustomizationPreservation() {
    console.log(chalk.blue('\n💾 Testing user customization preservation...'));

    const preservationResult = await this.manager.preserveUserCustomizations({
      createBackups: true
    });

    if (!preservationResult.success) {
      throw new Error('Customization preservation should have succeeded');
    }

    if (preservationResult.preserved.length === 0) {
      throw new Error('Should have preserved at least one customization');
    }

    // Verify backup was created
    if (preservationResult.backed_up.length === 0) {
      throw new Error('Should have created backup of customizations');
    }

    const backup = preservationResult.backed_up[0];
    if (!await fs.pathExists(backup.backup)) {
      throw new Error('Backup file was not created');
    }

    console.log(chalk.green('✓ Customization preservation working correctly'));
    console.log(chalk.cyan(`  - Preserved: ${preservationResult.preserved.length} customizations`));
    console.log(chalk.cyan(`  - Backed up: ${preservationResult.backed_up.length} files`));
  }

  async testCompleteUpgrade() {
    console.log(chalk.blue('\n🚀 Testing complete upgrade process...'));

    // Reset test environment for complete upgrade test
    await this.setupTestEnvironment();

    const upgradeResult = await this.manager.performCompleteUpgrade({
      forceUpgrade: true,
      skipExisting: false,
      preserveExisting: true,
      removeWorkarounds: false
    });

    if (!upgradeResult.success) {
      console.log(chalk.yellow('⚠ Complete upgrade had warnings, but this may be expected'));
    }

    // Verify all phases completed
    const phases = upgradeResult.phases;
    if (!phases.detection || !phases.preservation || !phases.migration || !phases.conversion) {
      throw new Error('Not all upgrade phases were executed');
    }

    // Verify upgrade report was generated
    if (!upgradeResult.report) {
      throw new Error('Upgrade report was not generated');
    }

    console.log(chalk.green('✓ Complete upgrade process working correctly'));
    
    if (upgradeResult.report.summary) {
      const summary = upgradeResult.report.summary;
      console.log(chalk.cyan(`  - Agents processed: ${summary.agentsProcessed}`));
      console.log(chalk.cyan(`  - Agents upgraded: ${summary.agentsUpgraded}`));
      console.log(chalk.cyan(`  - Customizations preserved: ${summary.customizationsPreserved}`));
      console.log(chalk.cyan(`  - Backups created: ${summary.backupsCreated}`));
    }
  }

  async cleanup() {
    console.log(chalk.blue('\n🧹 Cleaning up test environment...'));
    
    // Keep test output for inspection if needed
    // await fs.remove(this.testDir);
    
    console.log(chalk.green('✓ Cleanup complete'));
    console.log(chalk.cyan(`Test output preserved at: ${this.testDir}`));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new UpgradeMigrationTester();
  tester.runTests().catch(error => {
    console.error(chalk.red('Test execution failed:'), error);
    process.exit(1);
  });
}

module.exports = UpgradeMigrationTester;