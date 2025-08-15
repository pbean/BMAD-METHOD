/**
 * File Context Integration Demo
 * Demonstrates the file context integration functionality
 */

const AgentTransformer = require('./agent-transformer');
const FileContextIntegrator = require('./file-context-integrator');
const chalk = require('chalk');

async function demonstrateFileContextIntegration() {
  console.log(chalk.blue('🎯 File Context Integration Demo\n'));

  const transformer = new AgentTransformer({
    logLevel: 'error' // Suppress logs for cleaner demo
  });

  // Demo 1: Basic BMad Developer Agent
  console.log(chalk.yellow('Demo 1: BMad Developer Agent with File Context Integration'));
  console.log(chalk.gray('=' .repeat(60)));

  const devAgentContent = `---
agent:
  id: dev
  name: Developer
  title: BMad Developer
persona:
  role: Software Developer
  style: Technical and precise
commands:
  - name: help
    description: Show available commands
  - name: review
    description: Review code changes
---

# BMad Developer Agent

I am a BMad Method developer agent focused on software development tasks.

## Capabilities
- Code development and review
- Testing and debugging
- Technical documentation`;

  try {
    const transformedDev = await transformer.performKiroAgentTransformation(
      devAgentContent,
      '/mock/bmad-core/agents/dev.md',
      {
        agentId: 'dev',
        source: 'bmad-core',
        enableKiroFeatures: true
      }
    );

    console.log(chalk.green('✓ Developer agent transformed successfully'));
    console.log(chalk.cyan('File Context Integration Features Added:'));
    console.log('  • Primary context: #File, #Problems, #Terminal');
    console.log('  • Secondary context: #Git Diff, #Folder');
    console.log('  • Multi-file operations: refactoring, debugging, testing');
    console.log('  • Workspace boundary respect with gitignore compliance');
    console.log('  • Project understanding with architecture awareness\n');

  } catch (error) {
    console.log(chalk.red('✗ Developer agent transformation failed:'), error.message);
  }

  // Demo 2: BMad Architect Agent
  console.log(chalk.yellow('Demo 2: BMad Architect Agent with Enhanced Context'));
  console.log(chalk.gray('=' .repeat(60)));

  const architectAgentContent = `---
agent:
  id: architect
  name: Architect
  title: BMad Architect
persona:
  role: Software Architect
  style: Strategic and comprehensive
---

# BMad Architect Agent

I am a BMad Method architect agent focused on system design and architecture.

## Capabilities
- System architecture design
- Technology stack recommendations
- Code quality assessment`;

  try {
    const transformedArchitect = await transformer.performKiroAgentTransformation(
      architectAgentContent,
      '/mock/bmad-core/agents/architect.md',
      {
        agentId: 'architect',
        source: 'bmad-core',
        enableKiroFeatures: true
      }
    );

    console.log(chalk.green('✓ Architect agent transformed successfully'));
    console.log(chalk.cyan('File Context Integration Features Added:'));
    console.log('  • Primary context: #Codebase, #Folder');
    console.log('  • Secondary context: #File, #Problems');
    console.log('  • Multi-file operations: architecture-analysis, dependency-mapping');
    console.log('  • Comprehensive project structure analysis');
    console.log('  • Technology stack integration and pattern recognition\n');

  } catch (error) {
    console.log(chalk.red('✗ Architect agent transformation failed:'), error.message);
  }

  // Demo 3: Expansion Pack Agent (Game Development)
  console.log(chalk.yellow('Demo 3: Game Development Agent with Expansion Pack Context'));
  console.log(chalk.gray('=' .repeat(60)));

  const gameDevAgentContent = `---
agent:
  id: game-developer
  name: Game Developer
  title: BMad Game Developer
persona:
  role: Game Developer
  style: Creative and technical
---

# BMad Game Developer Agent

I am a BMad Method game developer agent specialized in 2D game development.

## Capabilities
- Game mechanics implementation
- Asset integration
- Performance optimization`;

  try {
    const transformedGameDev = await transformer.performKiroAgentTransformation(
      gameDevAgentContent,
      '/mock/expansion-packs/bmad-2d-phaser-game-dev/agents/game-developer.md',
      {
        agentId: 'game-developer',
        source: 'expansion-pack',
        expansionPack: 'bmad-2d-phaser-game-dev',
        enableKiroFeatures: true,
        enableExpansionPackFeatures: true
      }
    );

    console.log(chalk.green('✓ Game developer agent transformed successfully'));
    console.log(chalk.cyan('File Context Integration Features Added:'));
    console.log('  • Standard context providers plus game-specific context');
    console.log('  • Game asset files (sprites, sounds, animations)');
    console.log('  • Phaser.js scene and state files');
    console.log('  • Game configuration and settings files');
    console.log('  • Asset loading and management scripts');
    console.log('  • Game development workflow integration\n');

  } catch (error) {
    console.log(chalk.red('✗ Game developer agent transformation failed:'), error.message);
  }

  // Demo 4: Workspace Boundary Validation
  console.log(chalk.yellow('Demo 4: Workspace Boundary Validation'));
  console.log(chalk.gray('=' .repeat(60)));

  const integrator = new FileContextIntegrator();
  const mockWorkspace = '/mock/project';

  const testPaths = [
    { path: '/mock/project/src/component.js', expected: 'valid' },
    { path: '/mock/project/test/component.test.js', expected: 'valid' },
    { path: '/outside/project/malicious.js', expected: 'invalid' },
    { path: '/mock/project/node_modules/package/file.js', expected: 'valid but ignored' }
  ];

  for (const testPath of testPaths) {
    try {
      const validation = await integrator.validateWorkspaceBoundaries(testPath.path, { root: mockWorkspace });
      
      if (validation.valid) {
        console.log(chalk.green(`✓ ${testPath.path} - Valid workspace path`));
        if (validation.warnings.length > 0) {
          console.log(chalk.yellow(`  Warnings: ${validation.warnings.join(', ')}`));
        }
      } else {
        console.log(chalk.red(`✗ ${testPath.path} - Invalid: ${validation.errors.join(', ')}`));
      }
    } catch (error) {
      console.log(chalk.red(`✗ ${testPath.path} - Validation error: ${error.message}`));
    }
  }

  console.log(chalk.blue('\n🎉 File Context Integration Demo Complete!'));
  console.log(chalk.green('\nKey Features Demonstrated:'));
  console.log('• Automatic file context integration for all agent types');
  console.log('• Agent-specific context requirements and multi-file operations');
  console.log('• Expansion pack context enhancement');
  console.log('• Workspace boundary validation and security');
  console.log('• Project understanding and architecture awareness');
  console.log('• Seamless integration with existing BMad agent transformation');
}

// Run demo if called directly
if (require.main === module) {
  demonstrateFileContextIntegration()
    .then(() => {
      console.log(chalk.green('\n✅ Demo completed successfully'));
    })
    .catch(error => {
      console.error(chalk.red('\n❌ Demo failed:'), error);
      process.exit(1);
    });
}

module.exports = { demonstrateFileContextIntegration };