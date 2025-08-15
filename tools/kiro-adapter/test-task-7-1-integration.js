#!/usr/bin/env node

/**
 * Task 7.1 Integration Test
 * Tests the complete integration with existing KiroInstaller
 * Verifies all requirements: 1.1, 1.2, 1.6, 4.1
 */

const path = require('path');
const fs = require('fs-extra');
const KiroInstaller = require('./kiro-installer');

async function testTask71Integration() {
  console.log('🧪 Testing Task 7.1: Integrate with existing KiroInstaller\n');

  const testDir = path.join(__dirname, 'test-output', 'task-7-1-integration');
  
  try {
    // Clean up any previous test
    await fs.remove(testDir);
    await fs.ensureDir(testDir);

    // Create comprehensive mock BMad installation
    await setupComprehensiveMockInstallation(testDir);

    // Initialize KiroInstaller
    const installer = new KiroInstaller();

    // Mock spinner with progress tracking
    const progressLog = [];
    const mockSpinner = {
      text: '',
      succeed: (msg) => {
        console.log(`✓ ${msg}`);
        progressLog.push({ type: 'success', message: msg });
      },
      fail: (msg) => {
        console.log(`✗ ${msg}`);
        progressLog.push({ type: 'failure', message: msg });
      },
      warn: (msg) => {
        console.log(`⚠ ${msg}`);
        progressLog.push({ type: 'warning', message: msg });
      }
    };

    // Test configuration with multiple expansion packs
    const config = {
      expansionPacks: ['bmad-2d-phaser-game-dev', 'bmad-infrastructure-devops'],
      generateHooks: true,
      installType: 'full'
    };

    console.log('📋 Test Configuration:');
    console.log(`   Test Directory: ${testDir}`);
    console.log(`   Expansion Packs: ${config.expansionPacks.join(', ')}`);
    console.log(`   Generate Hooks: ${config.generateHooks}`);
    console.log('');

    // Test Requirement 1.1: Convert ALL BMad core agents
    console.log('🎯 Testing Requirement 1.1: Convert ALL BMad core agents');
    
    // Test Requirement 1.2: Convert ALL expansion pack agents  
    console.log('🎯 Testing Requirement 1.2: Convert ALL expansion pack agents');
    
    // Test Requirement 1.6: Add progress reporting
    console.log('🎯 Testing Requirement 1.6: Add progress reporting');
    
    // Test Requirement 4.1: Implement validation of conversion completeness
    console.log('🎯 Testing Requirement 4.1: Implement validation of conversion completeness');

    // Run the enhanced addKiroEnhancements method
    console.log('\n🚀 Running Enhanced KiroInstaller.addKiroEnhancements...\n');
    
    const startTime = Date.now();
    const result = await installer.addKiroEnhancements(config, testDir, mockSpinner);
    const duration = Date.now() - startTime;

    // Verify all requirements
    console.log('\n📊 Requirements Verification:');
    const requirementResults = await verifyAllRequirements(testDir, result, progressLog, config);

    // Display comprehensive results
    console.log('\n📈 Performance Metrics:');
    console.log(`   Total Duration: ${duration}ms`);
    console.log(`   Progress Events: ${progressLog.length}`);
    
    // Check if all requirements passed
    const allRequirementsPassed = Object.values(requirementResults).every(r => r.passed);
    
    if (allRequirementsPassed) {
      console.log('\n✅ Task 7.1 Integration Test PASSED - All Requirements Met!');
      return true;
    } else {
      console.log('\n❌ Task 7.1 Integration Test FAILED - Some Requirements Not Met');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function setupComprehensiveMockInstallation(testDir) {
  console.log('🏗️ Setting up comprehensive mock BMad installation...');

  // Create bmad-core structure with multiple agents
  const coreAgentsDir = path.join(testDir, 'bmad-core', 'agents');
  await fs.ensureDir(coreAgentsDir);

  const coreAgents = [
    { name: 'architect.md', role: 'Software Architect', id: 'architect' },
    { name: 'dev.md', role: 'Software Developer', id: 'dev' },
    { name: 'pm.md', role: 'Product Manager', id: 'pm' },
    { name: 'qa.md', role: 'QA Engineer', id: 'qa' },
    { name: 'analyst.md', role: 'Business Analyst', id: 'analyst' }
  ];

  for (const agent of coreAgents) {
    const content = `---
agent:
  id: ${agent.id}
  name: ${agent.role}
  title: ${agent.role}
  icon: 🤖
persona:
  role: ${agent.role}
  style: Professional and systematic
dependencies:
  tasks:
    - create-${agent.id}-doc.md
  templates:
    - ${agent.id}-tmpl.yaml
---

# ${agent.role}

I am a ${agent.role.toLowerCase()} focused on delivering high-quality results.
`;
    await fs.writeFile(path.join(coreAgentsDir, agent.name), content);
  }

  // Create multiple expansion packs
  const expansionPacks = [
    {
      name: 'bmad-2d-phaser-game-dev',
      title: 'BMad 2D Phaser Game Development',
      domain: 'game-development',
      agents: [
        { name: 'game-developer.md', role: 'Game Developer', id: 'game-developer' },
        { name: 'game-designer.md', role: 'Game Designer', id: 'game-designer' }
      ]
    },
    {
      name: 'bmad-infrastructure-devops',
      title: 'BMad Infrastructure DevOps',
      domain: 'infrastructure',
      agents: [
        { name: 'infra-engineer.md', role: 'Infrastructure Engineer', id: 'infra-engineer' },
        { name: 'devops-specialist.md', role: 'DevOps Specialist', id: 'devops-specialist' }
      ]
    }
  ];

  for (const pack of expansionPacks) {
    const packDir = path.join(testDir, 'expansion-packs', pack.name);
    const packAgentsDir = path.join(packDir, 'agents');
    await fs.ensureDir(packAgentsDir);

    // Create agents for this expansion pack
    for (const agent of pack.agents) {
      const content = `---
agent:
  id: ${agent.id}
  name: ${agent.role}
  title: ${agent.role}
  icon: 🎮
persona:
  role: ${agent.role}
  style: Creative and technical
dependencies:
  tasks:
    - create-${pack.domain}-feature.md
  templates:
    - ${pack.domain}-tmpl.yaml
---

# ${agent.role}

I am a ${agent.role.toLowerCase()} specialized in ${pack.domain}.
`;
      await fs.writeFile(path.join(packAgentsDir, agent.name), content);
    }

    // Create expansion pack config
    const packConfig = {
      title: pack.title,
      domain: pack.domain,
      version: '1.0.0'
    };

    await fs.writeFile(
      path.join(packDir, 'config.yaml'),
      require('js-yaml').dump(packConfig)
    );
  }

  console.log('✓ Comprehensive mock BMad installation created');
  console.log(`   Core agents: ${coreAgents.length}`);
  console.log(`   Expansion packs: ${expansionPacks.length}`);
  console.log(`   Total expansion agents: ${expansionPacks.reduce((sum, pack) => sum + pack.agents.length, 0)}`);
}

async function verifyAllRequirements(testDir, result, progressLog, config) {
  const requirements = {};

  // Requirement 1.1: Convert ALL BMad core agents
  requirements['1.1'] = await verifyRequirement11(testDir);
  
  // Requirement 1.2: Convert ALL expansion pack agents
  requirements['1.2'] = await verifyRequirement12(testDir, config.expansionPacks);
  
  // Requirement 1.6: Add progress reporting
  requirements['1.6'] = verifyRequirement16(progressLog);
  
  // Requirement 4.1: Implement validation of conversion completeness
  requirements['4.1'] = verifyRequirement41(result);

  // Display results
  for (const [reqId, reqResult] of Object.entries(requirements)) {
    const status = reqResult.passed ? '✅' : '❌';
    console.log(`   ${status} Requirement ${reqId}: ${reqResult.description}`);
    if (reqResult.details) {
      console.log(`      ${reqResult.details}`);
    }
    if (!reqResult.passed && reqResult.issues) {
      for (const issue of reqResult.issues) {
        console.log(`      ⚠ ${issue}`);
      }
    }
  }

  return requirements;
}

async function verifyRequirement11(testDir) {
  // Verify ALL BMad core agents are converted
  const coreAgentsDir = path.join(testDir, 'bmad-core', 'agents');
  const kiroAgentsDir = path.join(testDir, '.kiro', 'agents');
  
  const coreAgentFiles = await fs.readdir(coreAgentsDir);
  const kiroAgentFiles = await fs.readdir(kiroAgentsDir);
  
  const coreAgentCount = coreAgentFiles.filter(f => f.endsWith('.md')).length;
  const convertedCoreAgents = kiroAgentFiles.filter(f => {
    const agentName = f.replace('.md', '');
    return ['architect', 'dev', 'pm', 'qa', 'analyst'].includes(agentName);
  }).length;
  
  return {
    passed: convertedCoreAgents === coreAgentCount && coreAgentCount > 0,
    description: 'Convert ALL BMad core agents to Kiro format',
    details: `Found ${coreAgentCount} core agents, converted ${convertedCoreAgents}`,
    issues: convertedCoreAgents !== coreAgentCount ? ['Not all core agents were converted'] : []
  };
}

async function verifyRequirement12(testDir, expansionPacks) {
  // Verify ALL expansion pack agents are converted
  const kiroAgentsDir = path.join(testDir, '.kiro', 'agents');
  const kiroAgentFiles = await fs.readdir(kiroAgentsDir);
  
  let totalExpansionAgents = 0;
  let convertedExpansionAgents = 0;
  
  for (const packName of expansionPacks) {
    const packAgentsDir = path.join(testDir, 'expansion-packs', packName, 'agents');
    if (await fs.pathExists(packAgentsDir)) {
      const packAgentFiles = await fs.readdir(packAgentsDir);
      const packAgentCount = packAgentFiles.filter(f => f.endsWith('.md')).length;
      totalExpansionAgents += packAgentCount;
      
      // Check if these agents were converted
      for (const agentFile of packAgentFiles) {
        if (agentFile.endsWith('.md') && kiroAgentFiles.includes(agentFile)) {
          convertedExpansionAgents++;
        }
      }
    }
  }
  
  return {
    passed: convertedExpansionAgents === totalExpansionAgents && totalExpansionAgents > 0,
    description: 'Convert ALL expansion pack agents to Kiro format',
    details: `Found ${totalExpansionAgents} expansion agents, converted ${convertedExpansionAgents}`,
    issues: convertedExpansionAgents !== totalExpansionAgents ? ['Not all expansion pack agents were converted'] : []
  };
}

function verifyRequirement16(progressLog) {
  // Verify progress reporting is implemented
  const hasProgressReporting = progressLog.length > 0;
  const hasConversionProgress = progressLog.some(log => 
    log.message.includes('Converting agent') || 
    log.message.includes('Discovered') ||
    log.message.includes('converted')
  );
  
  return {
    passed: hasProgressReporting && hasConversionProgress,
    description: 'Add progress reporting for conversion process',
    details: `Captured ${progressLog.length} progress events`,
    issues: !hasProgressReporting ? ['No progress reporting found'] : 
            !hasConversionProgress ? ['No conversion progress events found'] : []
  };
}

function verifyRequirement41(result) {
  // Verify validation of conversion completeness is implemented
  const hasValidation = result && typeof result === 'object';
  const hasValidationResult = hasValidation && typeof result.isValid === 'boolean';
  const hasConversionSummary = hasValidation && result.summary && result.summary.conversion;
  
  return {
    passed: hasValidation && hasValidationResult && hasConversionSummary,
    description: 'Implement validation of conversion completeness',
    details: hasValidation ? 
      `Validation result: ${result.isValid}, Errors: ${result.errors?.length || 0}, Warnings: ${result.warnings?.length || 0}` :
      'No validation result found',
    issues: !hasValidation ? ['No validation result returned'] :
            !hasValidationResult ? ['No validation status found'] :
            !hasConversionSummary ? ['No conversion summary in validation'] : []
  };
}

// Run the test if this file is executed directly
if (require.main === module) {
  testTask71Integration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testTask71Integration };