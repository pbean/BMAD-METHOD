#!/usr/bin/env node

/**
 * Test Steering System Integration
 * Tests the comprehensive steering system integration for BMad agents
 */

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const SteeringSystemIntegration = require('./steering-system-integration');
const AgentDiscovery = require('./agent-discovery');

class SteeringSystemIntegrationTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    
    this.testDir = path.join(__dirname, 'test-output', 'steering-system-integration');
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
    
    console.log(colors[level](`[SteeringSystemIntegrationTest] ${message}`));
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.log('Starting Steering System Integration tests...');
    
    try {
      // Setup test environment
      await this.setupTestEnvironment();
      
      // Run individual tests
      await this.testCoreSteeringGeneration();
      await this.testAgentSpecificSteeringGeneration();
      await this.testExpansionPackSteeringGeneration();
      await this.testFallbackActivation();
      await this.testBMadContextIntegration();
      await this.testExpansionPackDomainKnowledge();
      await this.testSteeringValidation();
      
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
   * Setup test environment
   */
  async setupTestEnvironment() {
    this.log('Setting up test environment...');
    
    // Create test directory
    await fs.ensureDir(this.testDir);
    
    // Create mock .kiro structure
    const kiroDir = path.join(this.testDir, '.kiro');
    await fs.ensureDir(path.join(kiroDir, 'steering'));
    await fs.ensureDir(path.join(kiroDir, 'agents'));
    
    this.log('Test environment setup complete', 'success');
  }

  /**
   * Test core steering generation
   */
  async testCoreSteeringGeneration() {
    this.log('Testing core steering generation...');
    
    try {
      const steeringSystem = new SteeringSystemIntegration({
        verbose: false,
        kiroPath: this.testDir
      });
      
      await steeringSystem.generateCoreBMadSteeringRules();
      
      // Verify files were created
      const bmadMethodPath = path.join(this.testDir, '.kiro', 'steering', 'bmad-method.md');
      const techPreferencesPath = path.join(this.testDir, '.kiro', 'steering', 'tech-preferences.md');
      
      if (await fs.pathExists(bmadMethodPath) && await fs.pathExists(techPreferencesPath)) {
        this.log('✓ Core steering files generated successfully', 'success');
        this.testResults.passed++;
        
        // Verify content
        const bmadContent = await fs.readFile(bmadMethodPath, 'utf8');
        if (bmadContent.includes('BMad Method Integration Rules') && 
            bmadContent.includes('Fallback Activation Support')) {
          this.log('✓ BMad method steering content is correct', 'success');
          this.testResults.passed++;
        } else {
          throw new Error('BMad method steering content is incomplete');
        }
        
      } else {
        throw new Error('Core steering files were not created');
      }
      
    } catch (error) {
      this.log(`✗ Core steering generation test failed: ${error.message}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(error.message);
    }
  }

  /**
   * Test agent-specific steering generation
   */
  async testAgentSpecificSteeringGeneration() {
    this.log('Testing agent-specific steering generation...');
    
    try {
      const steeringSystem = new SteeringSystemIntegration({
        verbose: false,
        kiroPath: this.testDir
      });
      
      const testAgentMetadata = {
        id: 'dev',
        name: 'Developer',
        persona: {
          role: 'Software Developer',
          focus: 'Code implementation and quality',
          style: 'Professional and helpful',
          core_principles: ['Clean code', 'Test-driven development']
        },
        commands: [
          { name: 'implement-feature', description: 'Implement feature code' },
          { name: 'review-code', description: 'Review code changes' }
        ],
        dependencies: {
          tasks: ['implement-feature'],
          templates: ['story-tmpl'],
          checklists: ['story-dod-checklist']
        },
        expansionPack: null,
        source: 'bmad-core'
      };
      
      await steeringSystem.generateAgentSpecificSteeringFile(testAgentMetadata);
      
      // Verify file was created
      const agentSteeringPath = path.join(this.testDir, '.kiro', 'steering', 'bmad-dev.md');
      
      if (await fs.pathExists(agentSteeringPath)) {
        this.log('✓ Agent-specific steering file generated successfully', 'success');
        this.testResults.passed++;
        
        // Verify content
        const agentContent = await fs.readFile(agentSteeringPath, 'utf8');
        if (agentContent.includes('Developer Agent Steering Rules') && 
            agentContent.includes('Fallback Activation Instructions') &&
            agentContent.includes('implement-feature')) {
          this.log('✓ Agent steering content is correct', 'success');
          this.testResults.passed++;
        } else {
          throw new Error('Agent steering content is incomplete');
        }
        
      } else {
        throw new Error('Agent-specific steering file was not created');
      }
      
    } catch (error) {
      this.log(`✗ Agent-specific steering generation test failed: ${error.message}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(error.message);
    }
  }

  /**
   * Test expansion pack steering generation
   */
  async testExpansionPackSteeringGeneration() {
    this.log('Testing expansion pack steering generation...');
    
    try {
      const steeringSystem = new SteeringSystemIntegration({
        verbose: false,
        kiroPath: this.testDir
      });
      
      const testAgents = [
        {
          id: 'game-developer',
          name: 'Game Developer',
          persona: { role: 'Game Developer' },
          expansionPack: 'bmad-2d-phaser-game-dev'
        }
      ];
      
      await steeringSystem.generateExpansionPackSteeringFile('bmad-2d-phaser-game-dev', testAgents);
      
      // Verify file was created
      const expansionSteeringPath = path.join(this.testDir, '.kiro', 'steering', 'bmad-2d-phaser-game-dev.md');
      
      if (await fs.pathExists(expansionSteeringPath)) {
        this.log('✓ Expansion pack steering file generated successfully', 'success');
        this.testResults.passed++;
        
        // Verify content
        const expansionContent = await fs.readFile(expansionSteeringPath, 'utf8');
        if (expansionContent.includes('Phaser.js 2D Game Development') && 
            expansionContent.includes('Available Agents') &&
            expansionContent.includes('Game Developer')) {
          this.log('✓ Expansion pack steering content is correct', 'success');
          this.testResults.passed++;
        } else {
          throw new Error('Expansion pack steering content is incomplete');
        }
        
      } else {
        throw new Error('Expansion pack steering file was not created');
      }
      
    } catch (error) {
      this.log(`✗ Expansion pack steering generation test failed: ${error.message}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(error.message);
    }
  }

  /**
   * Test fallback activation
   */
  async testFallbackActivation() {
    this.log('Testing fallback activation...');
    
    try {
      const steeringSystem = new SteeringSystemIntegration({
        verbose: false,
        kiroPath: this.testDir
      });
      
      // First create an agent steering file
      const testAgentMetadata = {
        id: 'architect',
        name: 'Architect',
        persona: { role: 'Software Architect' }
      };
      
      await steeringSystem.generateAgentSpecificSteeringFile(testAgentMetadata);
      
      // Test fallback activation
      const fallbackResult = await steeringSystem.createSteeringBasedFallback('architect', {
        task: 'Design system architecture',
        instructions: 'Focus on scalability and maintainability',
        context: 'Web application project'
      });
      
      if (fallbackResult.success && fallbackResult.fallbackEnabled) {
        this.log('✓ Fallback activation created successfully', 'success');
        this.testResults.passed++;
        
        // Verify the steering file was modified
        const steeringPath = path.join(this.testDir, '.kiro', 'steering', 'bmad-architect.md');
        const steeringContent = await fs.readFile(steeringPath, 'utf8');
        
        if (steeringContent.includes('inclusion: always') && 
            steeringContent.includes('Current Activation Context')) {
          this.log('✓ Steering file modified correctly for fallback', 'success');
          this.testResults.passed++;
        } else {
          throw new Error('Steering file not modified correctly for fallback');
        }
        
      } else {
        throw new Error(`Fallback activation failed: ${fallbackResult.error}`);
      }
      
    } catch (error) {
      this.log(`✗ Fallback activation test failed: ${error.message}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(error.message);
    }
  }

  /**
   * Test BMad context integration
   */
  async testBMadContextIntegration() {
    this.log('Testing BMad context integration...');
    
    try {
      const steeringSystem = new SteeringSystemIntegration({
        verbose: false,
        kiroPath: this.testDir
      });
      
      // First create an agent steering file
      const testAgentMetadata = {
        id: 'pm',
        name: 'Product Manager',
        persona: { role: 'Product Manager' }
      };
      
      await steeringSystem.generateAgentSpecificSteeringFile(testAgentMetadata);
      
      // Add BMad-specific context
      await steeringSystem.addBMadSpecificContext('pm', {
        workflow: 'Product Planning',
        phase: 'Requirements Gathering',
        dependencies: ['prd-template', 'stakeholder-feedback'],
        qualityGates: ['Requirements Review', 'Stakeholder Approval'],
        teamContext: 'Cross-functional product team'
      });
      
      // Verify context was added
      const steeringPath = path.join(this.testDir, '.kiro', 'steering', 'bmad-pm.md');
      const steeringContent = await fs.readFile(steeringPath, 'utf8');
      
      if (steeringContent.includes('BMad-Specific Context') && 
          steeringContent.includes('Product Planning') &&
          steeringContent.includes('Requirements Gathering')) {
        this.log('✓ BMad context integration successful', 'success');
        this.testResults.passed++;
      } else {
        throw new Error('BMad context was not added correctly');
      }
      
    } catch (error) {
      this.log(`✗ BMad context integration test failed: ${error.message}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(error.message);
    }
  }

  /**
   * Test expansion pack domain knowledge
   */
  async testExpansionPackDomainKnowledge() {
    this.log('Testing expansion pack domain knowledge...');
    
    try {
      const steeringSystem = new SteeringSystemIntegration({
        verbose: false,
        kiroPath: this.testDir
      });
      
      // First create expansion pack steering file
      const testAgents = [
        { id: 'game-developer', name: 'Game Developer', persona: { role: 'Game Developer' } }
      ];
      
      await steeringSystem.generateExpansionPackSteeringFile('bmad-2d-unity-game-dev', testAgents);
      
      // Add domain knowledge
      await steeringSystem.implementExpansionPackDomainKnowledge('bmad-2d-unity-game-dev', {
        frameworks: ['Unity 2D', 'Unity Physics2D'],
        libraries: ['Unity UI', 'Unity Analytics'],
        patterns: ['Component-based architecture', 'ScriptableObject data systems'],
        antiPatterns: ['Singleton overuse', 'Update method abuse'],
        resources: ['Unity Documentation', 'Unity Learn Platform']
      });
      
      // Verify domain knowledge was added
      const steeringPath = path.join(this.testDir, '.kiro', 'steering', 'bmad-2d-unity-game-dev.md');
      const steeringContent = await fs.readFile(steeringPath, 'utf8');
      
      if (steeringContent.includes('Enhanced Domain Knowledge') && 
          steeringContent.includes('Unity 2D') &&
          steeringContent.includes('Anti-Patterns to Avoid')) {
        this.log('✓ Expansion pack domain knowledge integration successful', 'success');
        this.testResults.passed++;
      } else {
        throw new Error('Domain knowledge was not added correctly');
      }
      
    } catch (error) {
      this.log(`✗ Expansion pack domain knowledge test failed: ${error.message}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(error.message);
    }
  }

  /**
   * Test steering validation
   */
  async testSteeringValidation() {
    this.log('Testing steering validation...');
    
    try {
      const steeringSystem = new SteeringSystemIntegration({
        verbose: false,
        kiroPath: this.testDir
      });
      
      // Generate some steering files first
      await steeringSystem.generateCoreBMadSteeringRules();
      
      const testAgentMetadata = {
        id: 'qa',
        name: 'QA Engineer',
        persona: { role: 'QA Engineer' }
      };
      
      await steeringSystem.generateAgentSpecificSteeringFile(testAgentMetadata);
      
      // Run validation
      const validationResult = await steeringSystem.validateSteeringSystemIntegration();
      
      if (validationResult.valid) {
        this.log('✓ Steering validation passed', 'success');
        this.testResults.passed++;
        
        if (validationResult.statistics.totalFiles > 0) {
          this.log(`✓ Validation statistics: ${validationResult.statistics.totalFiles} files`, 'success');
          this.testResults.passed++;
        }
        
      } else {
        this.log(`✗ Steering validation failed: ${validationResult.errors.join(', ')}`, 'error');
        this.testResults.failed++;
        this.testResults.errors.push('Steering validation failed');
      }
      
    } catch (error) {
      this.log(`✗ Steering validation test failed: ${error.message}`, 'error');
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
      // Remove test directory
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
    this.log('\n=== Steering System Integration Test Results ===');
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
      this.log('\n🎉 All steering system integration tests passed!', 'success');
    } else {
      this.log('\n❌ Some tests failed. Please review the errors above.', 'error');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new SteeringSystemIntegrationTest();
  test.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = SteeringSystemIntegrationTest;