#!/usr/bin/env node

/**
 * Test Complete Steering Integration
 * Tests the complete integration of steering system with agent transformation
 */

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const AgentDiscovery = require('./agent-discovery');
const AgentTransformer = require('./agent-transformer');
const SteeringSystemIntegration = require('./steering-system-integration');

class CompleteSteeringIntegrationTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    
    this.testDir = path.join(__dirname, 'test-output', 'complete-steering-integration');
  }

  /**
   * Log test messages
   */
  log(message, level = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warn: chalk.yellow,
      error: chalk.red
    };
    
    console.log(colors[level](`[CompleteSteeringIntegrationTest] ${message}`));
  }

  /**
   * Run complete integration test
   */
  async runCompleteIntegrationTest() {
    this.log('Starting Complete Steering Integration test...');
    
    try {
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Test complete workflow
      await this.testCompleteWorkflow();
      
      // Cleanup
      await this.cleanup();
      
      // Report results
      this.reportResults();
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(error.message);
    }
  }

  /**
   * Setup test environment with mock BMad agents
   */
  async setupTestEnvironment() {
    this.log('Setting up test environment with mock BMad agents...');
    
    // Create test directory structure
    await fs.ensureDir(this.testDir);
    
    // Create mock BMad core structure
    const bmadCoreDir = path.join(this.testDir, 'bmad-core');
    await fs.ensureDir(path.join(bmadCoreDir, 'agents'));
    await fs.ensureDir(path.join(bmadCoreDir, 'tasks'));
    await fs.ensureDir(path.join(bmadCoreDir, 'templates'));
    
    // Create mock expansion pack structure
    const expansionPackDir = path.join(this.testDir, 'expansion-packs', 'bmad-2d-phaser-game-dev');
    await fs.ensureDir(path.join(expansionPackDir, 'agents'));
    
    // Create mock Kiro structure
    const kiroDir = path.join(this.testDir, '.kiro');
    await fs.ensureDir(path.join(kiroDir, 'steering'));
    await fs.ensureDir(path.join(kiroDir, 'agents'));
    
    // Create mock BMad agent files
    await this.createMockBMadAgents();
    
    this.log('Test environment setup complete', 'success');
  }

  /**
   * Create mock BMad agent files
   */
  async createMockBMadAgents() {
    // Core agent: Developer
    const devAgentContent = `---
agent:
  id: dev
  name: Developer
  title: Software Developer
  icon: 👨‍💻
  whenToUse: "When you need to implement code, debug issues, or review technical solutions"

persona:
  role: Software Developer
  style: Professional and detail-oriented
  identity: I am a skilled software developer focused on writing clean, maintainable code
  focus: Code implementation, debugging, and technical problem-solving
  core_principles:
    - Write clean, readable, and maintainable code
    - Follow test-driven development practices
    - Continuous learning and improvement
    - Collaborative development and code review

commands:
  - implement-feature: Implement new features based on requirements
  - review-code: Review code changes for quality and best practices
  - debug-issue: Debug and fix technical issues
  - optimize-performance: Optimize code for better performance

dependencies:
  tasks:
    - implement-feature
    - review-code
  templates:
    - story-tmpl
  checklists:
    - story-dod-checklist
  data:
    - bmad-kb
    - technical-preferences
---

# Developer Agent

I am a skilled software developer focused on implementing high-quality code solutions.

## My Expertise

- Code implementation and architecture
- Debugging and troubleshooting
- Code review and quality assurance
- Performance optimization
- Testing and validation

## How I Work

1. Analyze requirements and technical specifications
2. Design clean, maintainable code solutions
3. Implement features following best practices
4. Test thoroughly and debug issues
5. Review and optimize for performance
`;

    await fs.writeFile(
      path.join(this.testDir, 'bmad-core', 'agents', 'dev.md'),
      devAgentContent
    );

    // Expansion pack agent: Game Developer
    const gameDevAgentContent = `---
agent:
  id: game-developer
  name: Game Developer
  title: Phaser.js Game Developer
  icon: 🎮
  whenToUse: "When you need to develop 2D games using Phaser.js framework"

persona:
  role: Game Developer
  style: Creative and technical
  identity: I am a specialized game developer with expertise in Phaser.js 2D game development
  focus: Game programming, performance optimization, and player experience
  core_principles:
    - Create engaging and performant games
    - Follow game development best practices
    - Optimize for smooth gameplay experience
    - Maintain clean game architecture

commands:
  - create-game-scene: Create new game scenes
  - implement-game-mechanics: Implement game mechanics and systems
  - optimize-game-performance: Optimize game performance
  - debug-game-issues: Debug game-specific issues

dependencies:
  tasks:
    - create-game-story
    - game-design-brainstorming
  templates:
    - game-story-tmpl
    - game-design-doc-tmpl
  checklists:
    - game-story-dod-checklist
  data:
    - bmad-kb
    - development-guidelines
---

# Game Developer Agent

I am a specialized game developer with expertise in Phaser.js 2D game development.

## My Expertise

- Phaser.js framework and game development
- 2D game mechanics and systems
- Game performance optimization
- Asset management and loading
- Game state management

## How I Work

1. Analyze game requirements and design documents
2. Implement game mechanics using Phaser.js
3. Optimize for performance and smooth gameplay
4. Test game functionality and user experience
5. Debug and resolve game-specific issues
`;

    await fs.writeFile(
      path.join(this.testDir, 'expansion-packs', 'bmad-2d-phaser-game-dev', 'agents', 'game-developer.md'),
      gameDevAgentContent
    );
  }

  /**
   * Test complete workflow: Discovery → Transformation → Steering Integration
   */
  async testCompleteWorkflow() {
    this.log('Testing complete workflow: Discovery → Transformation → Steering Integration');
    
    try {
      // Step 1: Agent Discovery
      this.log('Step 1: Running agent discovery...');
      const agentDiscovery = new AgentDiscovery({
        rootPath: this.testDir,
        verbose: false
      });
      
      const discoveredAgents = await agentDiscovery.scanAllAgents();
      
      if (discoveredAgents.length >= 2) {
        this.log(`✓ Discovered ${discoveredAgents.length} agents`, 'success');
        this.testResults.passed++;
      } else {
        throw new Error(`Expected at least 2 agents, found ${discoveredAgents.length}`);
      }

      // Step 2: Agent Transformation with Steering Integration
      this.log('Step 2: Running agent transformation with steering integration...');
      const agentTransformer = new AgentTransformer({
        verbose: false
      });

      let transformedAgents = 0;
      for (const agent of discoveredAgents) {
        const outputPath = path.join(this.testDir, '.kiro', 'agents', `${agent.id}.md`);
        
        const success = await agentTransformer.transformAgentForKiro(
          agent.filePath,
          outputPath,
          {
            agentId: agent.id,
            expansionPack: agent.expansionPack,
            source: agent.source,
            enableKiroFeatures: true,
            enableExpansionPackFeatures: true,
            kiroPath: this.testDir,  // Pass kiroPath directly in options
            context: {
              kiroPath: this.testDir,
              source: agent.source,
              expansionPack: agent.expansionPack
            }
          }
        );
        
        if (success) {
          transformedAgents++;
        }
      }

      if (transformedAgents === discoveredAgents.length) {
        this.log(`✓ Transformed ${transformedAgents} agents successfully`, 'success');
        this.testResults.passed++;
      } else {
        throw new Error(`Expected ${discoveredAgents.length} transformed agents, got ${transformedAgents}`);
      }

      // Step 3: Verify Steering Files Generated
      this.log('Step 3: Verifying steering files were generated...');
      
      const steeringDir = path.join(this.testDir, '.kiro', 'steering');
      const steeringFiles = await fs.readdir(steeringDir);
      
      // Debug: List all steering files found
      this.log(`Found steering files: ${steeringFiles.join(', ')}`, 'info');
      
      // Check for core steering files
      const expectedCoreFiles = ['bmad-method.md', 'tech-preferences.md'];
      const coreFilesPresent = expectedCoreFiles.every(file => steeringFiles.includes(file));
      
      if (coreFilesPresent) {
        this.log('✓ Core steering files generated', 'success');
        this.testResults.passed++;
      } else {
        throw new Error('Core steering files missing');
      }

      // Check for agent-specific steering files
      const expectedAgentFiles = ['bmad-dev.md', 'bmad-game-developer.md'];
      const agentFilesPresent = expectedAgentFiles.every(file => steeringFiles.includes(file));
      
      if (agentFilesPresent) {
        this.log('✓ Agent-specific steering files generated', 'success');
        this.testResults.passed++;
      } else {
        throw new Error('Agent-specific steering files missing');
      }

      // Check for expansion pack steering file
      if (steeringFiles.includes('bmad-2d-phaser-game-dev.md')) {
        this.log('✓ Expansion pack steering file generated', 'success');
        this.testResults.passed++;
      } else {
        throw new Error('Expansion pack steering file missing');
      }

      // Step 4: Verify Transformed Agent Content
      this.log('Step 4: Verifying transformed agent content includes steering integration...');
      
      const devAgentPath = path.join(this.testDir, '.kiro', 'agents', 'dev.md');
      const devAgentContent = await fs.readFile(devAgentPath, 'utf8');
      
      if (devAgentContent.includes('Steering Rules Integration') && 
          devAgentContent.includes('Fallback Activation') &&
          devAgentContent.includes('bmad-dev.md')) {
        this.log('✓ Core agent includes steering integration', 'success');
        this.testResults.passed++;
      } else {
        throw new Error('Core agent missing steering integration');
      }

      const gameDevAgentPath = path.join(this.testDir, '.kiro', 'agents', 'game-developer.md');
      const gameDevAgentContent = await fs.readFile(gameDevAgentPath, 'utf8');
      
      if (gameDevAgentContent.includes('Steering Rules Integration') && 
          gameDevAgentContent.includes('bmad-2d-phaser-game-dev.md') &&
          gameDevAgentContent.includes('bmad-game-developer.md')) {
        this.log('✓ Expansion pack agent includes steering integration', 'success');
        this.testResults.passed++;
      } else {
        throw new Error('Expansion pack agent missing steering integration');
      }

      // Step 5: Test Fallback Activation
      this.log('Step 5: Testing fallback activation functionality...');
      
      const steeringSystem = new SteeringSystemIntegration({
        verbose: false,
        kiroPath: this.testDir
      });

      // Manually populate the agent steering map since we're using a new instance
      const devSteeringPath = path.join(this.testDir, '.kiro', 'steering', 'bmad-dev.md');
      steeringSystem.agentSteeringMap.set('dev', devSteeringPath);

      const fallbackResult = await steeringSystem.createSteeringBasedFallback('dev', {
        task: 'Implement user authentication',
        instructions: 'Focus on security best practices',
        context: 'Web application with JWT tokens'
      });

      if (fallbackResult.success && fallbackResult.fallbackEnabled) {
        this.log('✓ Fallback activation works correctly', 'success');
        this.testResults.passed++;
      } else {
        throw new Error(`Fallback activation failed: ${fallbackResult.error}`);
      }

      // Step 6: Validate Complete Integration
      this.log('Step 6: Validating complete steering system integration...');
      
      const validationResult = await steeringSystem.validateSteeringSystemIntegration();
      
      if (validationResult.valid) {
        this.log('✓ Complete steering system integration is valid', 'success');
        this.testResults.passed++;
        
        this.log(`✓ Integration statistics: ${validationResult.statistics.totalFiles} total files, ${validationResult.statistics.agentFiles} agent files, ${validationResult.statistics.expansionPackFiles} expansion pack files`, 'success');
        this.testResults.passed++;
        
      } else {
        throw new Error(`Integration validation failed: ${validationResult.errors.join(', ')}`);
      }

      this.log('Complete workflow test passed successfully!', 'success');
      
    } catch (error) {
      this.log(`✗ Complete workflow test failed: ${error.message}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(error.message);
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    this.log('Cleaning up test environment...');
    
    try {
      await fs.remove(this.testDir);
      this.log('Test environment cleaned up', 'success');
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'warn');
    }
  }

  /**
   * Report test results
   */
  reportResults() {
    this.log('\n=== Complete Steering Integration Test Results ===');
    this.log(`Passed: ${this.testResults.passed}`, 'success');
    this.log(`Failed: ${this.testResults.failed}`, this.testResults.failed > 0 ? 'error' : 'info');
    
    if (this.testResults.errors.length > 0) {
      this.log('\nErrors:', 'error');
      this.testResults.errors.forEach(error => {
        this.log(`  - ${error}`, 'error');
      });
    }
    
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? (this.testResults.passed / total * 100).toFixed(1) : 0;
    
    this.log(`\nSuccess Rate: ${successRate}%`, successRate >= 80 ? 'success' : 'warn');
    
    if (this.testResults.failed === 0) {
      this.log('\n🎉 Complete steering integration test passed!', 'success');
      this.log('\nTask 6.2 "Create steering system integration" is now complete with:', 'success');
      this.log('✓ Auto-generation of steering files for each converted agent', 'success');
      this.log('✓ BMad-specific context and instructions in steering', 'success');
      this.log('✓ Expansion pack domain knowledge in steering', 'success');
      this.log('✓ Steering-based fallback for agent activation', 'success');
    } else {
      this.log('\n❌ Some tests failed. Please review the errors above.', 'error');
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new CompleteSteeringIntegrationTest();
  test.runCompleteIntegrationTest().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = CompleteSteeringIntegrationTest;