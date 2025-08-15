#!/usr/bin/env node

/**
 * Test Complete Agent Conversion Integration
 * Tests the enhanced KiroInstaller.addKiroEnhancements method
 */

const path = require('path');
const fs = require('fs-extra');
const KiroInstaller = require('./kiro-installer');

async function testCompleteAgentConversion() {
  console.log('🧪 Testing Complete Agent Conversion Integration\n');

  const testDir = path.join(__dirname, 'test-output', 'complete-conversion-test');
  
  try {
    // Clean up any previous test
    await fs.remove(testDir);
    await fs.ensureDir(testDir);

    // Create mock BMad installation structure
    await setupMockBMadInstallation(testDir);

    // Initialize KiroInstaller
    const installer = new KiroInstaller();

    // Mock spinner
    const mockSpinner = {
      text: '',
      succeed: (msg) => console.log(`✓ ${msg}`),
      fail: (msg) => console.log(`✗ ${msg}`),
      warn: (msg) => console.log(`⚠ ${msg}`)
    };

    // Test configuration
    const config = {
      expansionPacks: ['bmad-2d-phaser-game-dev'],
      generateHooks: true,
      installType: 'full'
    };

    console.log('📋 Test Configuration:');
    console.log(`   Test Directory: ${testDir}`);
    console.log(`   Expansion Packs: ${config.expansionPacks.join(', ')}`);
    console.log(`   Generate Hooks: ${config.generateHooks}`);
    console.log('');

    // Run the enhanced addKiroEnhancements method
    console.log('🚀 Running Complete Agent Conversion...\n');
    
    const result = await installer.addKiroEnhancements(config, testDir, mockSpinner);

    // Verify results
    console.log('\n📊 Verification Results:');
    await verifyConversionResults(testDir, result);

    console.log('\n✅ Complete Agent Conversion Test Completed Successfully!');
    return true;

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function setupMockBMadInstallation(testDir) {
  console.log('🏗️ Setting up mock BMad installation...');

  // Create bmad-core structure
  const coreAgentsDir = path.join(testDir, 'bmad-core', 'agents');
  await fs.ensureDir(coreAgentsDir);

  // Create mock core agents
  const coreAgents = [
    {
      name: 'architect.md',
      content: `---
agent:
  id: architect
  name: Architect
  title: Software Architect
  icon: 🏗️
persona:
  role: Software Architect
  style: Technical and systematic
dependencies:
  tasks:
    - create-architecture-doc.md
  templates:
    - architecture-tmpl.yaml
---

# Software Architect

I am a software architect focused on creating robust, scalable system designs.
`
    },
    {
      name: 'dev.md',
      content: `---
agent:
  id: dev
  name: Developer
  title: Software Developer
  icon: 👨‍💻
persona:
  role: Software Developer
  style: Practical and efficient
dependencies:
  tasks:
    - implement-feature.md
  templates:
    - story-tmpl.yaml
---

# Software Developer

I am a software developer focused on implementing features efficiently.
`
    }
  ];

  for (const agent of coreAgents) {
    await fs.writeFile(path.join(coreAgentsDir, agent.name), agent.content);
  }

  // Create expansion pack structure
  const expansionDir = path.join(testDir, 'expansion-packs', 'bmad-2d-phaser-game-dev');
  const expansionAgentsDir = path.join(expansionDir, 'agents');
  await fs.ensureDir(expansionAgentsDir);

  // Create mock expansion pack agents
  const expansionAgents = [
    {
      name: 'game-developer.md',
      content: `---
agent:
  id: game-developer
  name: Game Developer
  title: Game Developer
  icon: 🎮
persona:
  role: Game Developer
  style: Creative and technical
dependencies:
  tasks:
    - create-game-feature.md
  templates:
    - game-story-tmpl.yaml
---

# Game Developer

I am a game developer specialized in 2D Phaser game development.
`
    }
  ];

  for (const agent of expansionAgents) {
    await fs.writeFile(path.join(expansionAgentsDir, agent.name), agent.content);
  }

  // Create expansion pack config
  const expansionConfig = {
    title: 'BMad 2D Phaser Game Development',
    domain: 'game-development',
    version: '1.0.0'
  };

  await fs.writeFile(
    path.join(expansionDir, 'config.yaml'),
    require('js-yaml').dump(expansionConfig)
  );

  console.log('✓ Mock BMad installation created');
}

async function verifyConversionResults(testDir, result) {
  const checks = [];

  // Check if .kiro directory was created
  const kiroDir = path.join(testDir, '.kiro');
  checks.push({
    name: 'Kiro directory created',
    passed: await fs.pathExists(kiroDir)
  });

  // Check if agents were converted
  const agentsDir = path.join(kiroDir, 'agents');
  const agentFiles = await fs.pathExists(agentsDir) ? await fs.readdir(agentsDir) : [];
  const mdFiles = agentFiles.filter(f => f.endsWith('.md'));
  
  checks.push({
    name: 'Agents converted to Kiro format',
    passed: mdFiles.length > 0,
    details: `Found ${mdFiles.length} converted agents: ${mdFiles.join(', ')}`
  });

  // Check if steering rules were created
  const steeringDir = path.join(kiroDir, 'steering');
  const steeringFiles = await fs.pathExists(steeringDir) ? await fs.readdir(steeringDir) : [];
  
  checks.push({
    name: 'Steering rules created',
    passed: steeringFiles.length > 0,
    details: `Found ${steeringFiles.length} steering files: ${steeringFiles.join(', ')}`
  });

  // Check if hooks were generated
  const hooksDir = path.join(kiroDir, 'hooks');
  const hookFiles = await fs.pathExists(hooksDir) ? await fs.readdir(hooksDir) : [];
  
  checks.push({
    name: 'Hooks generated',
    passed: hookFiles.length > 0,
    details: `Found ${hookFiles.length} hook files: ${hookFiles.join(', ')}`
  });

  // Check validation result
  checks.push({
    name: 'Validation passed',
    passed: result && result.isValid,
    details: result ? `Errors: ${result.errors?.length || 0}, Warnings: ${result.warnings?.length || 0}` : 'No result'
  });

  // Display results
  for (const check of checks) {
    const status = check.passed ? '✅' : '❌';
    console.log(`   ${status} ${check.name}`);
    if (check.details) {
      console.log(`      ${check.details}`);
    }
  }

  const passedCount = checks.filter(c => c.passed).length;
  console.log(`\n   Overall: ${passedCount}/${checks.length} checks passed`);

  return passedCount === checks.length;
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCompleteAgentConversion()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteAgentConversion };