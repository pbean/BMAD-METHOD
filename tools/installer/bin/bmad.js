#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs').promises;
const yaml = require('js-yaml');
const chalk = require('chalk');
const inquirer = require('inquirer');

// Import IDE validator and error reporter
let IdeValidator, ErrorReporter;
try {
  IdeValidator = require('../lib/ide-validator');
  ErrorReporter = require('../lib/error-reporter');
} catch (e) {
  try {
    IdeValidator = require('../../../tools/installer/lib/ide-validator');
    ErrorReporter = require('../../../tools/installer/lib/error-reporter');
  } catch (e2) {
    console.error('Error: Could not load required modules.');
    process.exit(1);
  }
}

// Handle both execution contexts (from root via npx or from installer directory)
let version;
let installer;
try {
  // Try installer context first (when run from tools/installer/)
  version = require('../package.json').version;
  installer = require('../lib/installer');
} catch (e) {
  // Fall back to root context (when run via npx from GitHub)
  console.log(`Installer context not found (${e.message}), trying root context...`);
  try {
    version = require('../../../package.json').version;
    installer = require('../../../tools/installer/lib/installer');
  } catch (e2) {
    console.error('Error: Could not load required modules. Please ensure you are running from the correct directory.');
    console.error('Debug info:', {
      __dirname,
      cwd: process.cwd(),
      error: e2.message
    });
    process.exit(1);
  }
}

program
  .version(version)
  .description('BMad Method installer - Universal AI agent framework for any domain');

program
  .command('install')
  .description('Install BMad Method agents and tools with support for multiple IDEs simultaneously')
  .option('-f, --full', 'Install complete BMad Method')
  .option('-x, --expansion-only', 'Install only expansion packs (no bmad-core)')
  .option('-d, --directory <path>', 'Installation directory')
  .option('-i, --ide <ide...>', 'Configure for specific IDE(s) - supports multiple IDEs simultaneously. Kiro creates .kiro/ folder with agent transformations. Examples: --ide cursor kiro, --ide kiro github-copilot (cursor, claude-code, windsurf, trae, roo, kilo, cline, gemini, qwen-code, github-copilot, kiro, other)')
  .option('-e, --expansion-packs <packs...>', 'Install specific expansion packs (can specify multiple)')
  .option('--upgrade', 'Upgrade existing installation (preserves customizations)')
  .action(async (options) => {
    try {
      if (!options.full && !options.expansionOnly && !options.ide && !options.directory) {
        // Interactive mode
        const answers = await promptInstallation();
        if (!answers._alreadyInstalled) {
          // Validate IDE selection from interactive mode
          const ideValidator = new IdeValidator();
          const errorReporter = new ErrorReporter();
          try {
            answers.ides = ideValidator.validateAndSanitizeIdes(answers.ides);
          } catch (error) {
            errorReporter.reportError(error, errorReporter.errorTypes.IDE_VALIDATION, {
              source: 'interactive',
              invalidIdes: answers.ides,
              supportedIdes: ideValidator.getSupportedIdes()
            });
            process.exit(1);
          }

          // Check if Kiro is selected and route to appropriate installer
          if (requiresSpecialIdeHandling(answers.ides)) {
            await handleKiroInstallation(answers);
          } else {
            // Use regular installer for non-Kiro installations
            await installer.install(answers);
          }
          process.exit(0);
        }
      } else {
        // Direct mode
        let installType = 'full';
        if (options.expansionOnly) installType = 'expansion-only';

        // Validate IDE array input
        const ideValidator = new IdeValidator();
        const errorReporter = new ErrorReporter();
        let validatedIdes = [];
        
        try {
          const rawIdes = options.ide || [];
          validatedIdes = ideValidator.validateAndSanitizeIdes(rawIdes);
        } catch (error) {
          errorReporter.reportError(error, errorReporter.errorTypes.IDE_VALIDATION, {
            source: 'command-line',
            invalidIdes: rawIdes,
            supportedIdes: ideValidator.getSupportedIdes()
          });
          process.exit(1);
        }

        const config = {
          installType,
          directory: options.directory || '.',
          ides: validatedIdes,
          expansionPacks: options.expansionPacks || [],
          upgrade: options.upgrade || false
        };

        // Check if Kiro is selected and route to appropriate installer
        if (requiresSpecialIdeHandling(config.ides)) {
          await handleKiroInstallation(config);
        } else {
          // Use regular installer for non-Kiro installations
          await installer.install(config);
        }
        process.exit(0);
      }
    } catch (error) {
      const errorReporter = new ErrorReporter();
      const errorType = errorReporter.determineErrorType(error, { operation: 'installation' });
      errorReporter.reportError(error, errorType, { operation: 'installation' });
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Update existing BMad installation')
  .option('--force', 'Force update, overwriting modified files')
  .option('--dry-run', 'Show what would be updated without making changes')
  .option('--ide <ide>', 'Update for specific IDE - supports kiro (creates .kiro/ structure), cursor, github-copilot, etc.')
  .action(async (options) => {
    try {
      // Handle Kiro-specific updates
      if (options.ide === 'kiro') {
        const config = {
          installType: 'full',
          directory: '.',
          ides: ['kiro'],
          expansionPacks: [],
          upgrade: true,
          force: options.force,
          dryRun: options.dryRun
        };

        await handleKiroInstallation(config);
        process.exit(0);
      }

      await installer.update();
    } catch (error) {
      console.error(chalk.red('Update failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('list:expansions')
  .description('List available expansion packs')
  .action(async () => {
    try {
      await installer.listExpansionPacks();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show installation status')
  .action(async () => {
    try {
      await installer.showStatus();
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('flatten')
  .description('Flatten codebase to XML format')
  .option('-i, --input <path>', 'Input directory to flatten', process.cwd())
  .option('-o, --output <path>', 'Output file path', 'flattened-codebase.xml')
  .action(async (options) => {
    try {
      await installer.flatten(options);
    } catch (error) {
      console.error(chalk.red('Flatten failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Handles Kiro installation logic for both command-line and interactive modes
 * @param {Object} config - Installation configuration
 * @returns {Promise<void>}
 */
async function handleKiroInstallation(config) {
  // Handle both execution contexts (from root via npx or from installer directory)
  let KiroInstaller;
  try {
    // Try installer context first (when run from tools/installer/)
    KiroInstaller = require('../../kiro-adapter/kiro-installer');
  } catch (e) {
    // Fall back to root context (when run via npx from GitHub)
    try {
      KiroInstaller = require('../../../tools/kiro-adapter/kiro-installer');
    } catch (e2) {
      console.error('Error: Could not load KiroInstaller module.');
      console.error('Debug info:', {
        __dirname,
        cwd: process.cwd(),
        error: e2.message
      });
      throw new Error('KiroInstaller module not found');
    }
  }
  
  const kiroInstaller = new KiroInstaller();
  const ora = require('ora');
  const spinner = ora('Initializing Kiro installation...').start();

  try {
    // Validate IDE array input
    const ideValidator = new IdeValidator();
    const errorReporter = new ErrorReporter();
    let validatedIdes = ['kiro']; // Default to kiro if no IDEs provided
    
    if (config.ides) {
      try {
        validatedIdes = ideValidator.validateAndSanitizeIdes(config.ides);
        // Ensure kiro is included if not already present
        if (!validatedIdes.includes('kiro')) {
          validatedIdes.push('kiro');
        }
      } catch (error) {
        spinner.fail('IDE validation failed');
        errorReporter.reportError(error, errorReporter.errorTypes.IDE_VALIDATION, {
          source: 'kiro-installation',
          invalidIdes: config.ides,
          supportedIdes: ideValidator.getSupportedIdes(),
          phase: 'validation'
        });
        throw error;
      }
    }

    // Ensure consistent configuration object format
    const kiroConfig = {
      installType: config.installType || 'full',
      directory: config.directory || '.',
      ides: validatedIdes,
      expansionPacks: Array.isArray(config.expansionPacks) ? config.expansionPacks : [],
      generateHooks: true, // Enable hooks by default for Kiro
      upgrade: config.upgrade || false,
      // Pass through other configuration options
      prdSharded: config.prdSharded,
      architectureSharded: config.architectureSharded,
      githubCopilotConfig: config.githubCopilotConfig,
      includeWebBundles: config.includeWebBundles,
      webBundleType: config.webBundleType,
      selectedWebBundleTeams: config.selectedWebBundleTeams,
      includeIndividualAgents: config.includeIndividualAgents,
      webBundlesDirectory: config.webBundlesDirectory
    };

    if (kiroConfig.upgrade) {
      await kiroInstaller.upgradeKiroInstallation(kiroConfig, path.resolve(kiroConfig.directory), spinner);
    } else {
      await kiroInstaller.installForKiro(kiroConfig, path.resolve(kiroConfig.directory), spinner);
    }

    spinner.succeed('Kiro installation completed successfully!');
  } catch (error) {
    spinner.fail('Kiro installation failed');
    
    // Don't double-report IDE validation errors
    if (!error.message.includes('IDE validation')) {
      const errorReporter = new ErrorReporter();
      const errorType = errorReporter.determineErrorType(error, { component: 'kiro' });
      errorReporter.reportError(error, errorType, {
        component: 'kiro',
        operation: 'installation',
        directory: config.directory
      });
    }
    
    throw error;
  }
}

/**
 * Checks if the IDE array requires special handling (e.g., Kiro)
 * @param {string[]} ides - Array of IDE names
 * @returns {boolean} True if special IDE handling is required
 */
function requiresSpecialIdeHandling(ides) {
  const ideValidator = new IdeValidator();
  
  try {
    // Validate and sanitize the IDE array first
    const sanitizedIdes = ideValidator.validateAndSanitizeIdes(ides);
    return ideValidator.requiresSpecialIdeHandling(sanitizedIdes);
  } catch (error) {
    console.error(chalk.red('IDE validation error:'), error.message);
    return false;
  }
}

async function promptInstallation() {
  
  // Display ASCII logo
  console.log(chalk.bold.cyan(`
██████╗ ███╗   ███╗ █████╗ ██████╗       ███╗   ███╗███████╗████████╗██╗  ██╗ ██████╗ ██████╗ 
██╔══██╗████╗ ████║██╔══██╗██╔══██╗      ████╗ ████║██╔════╝╚══██╔══╝██║  ██║██╔═══██╗██╔══██╗
██████╔╝██╔████╔██║███████║██║  ██║█████╗██╔████╔██║█████╗     ██║   ███████║██║   ██║██║  ██║
██╔══██╗██║╚██╔╝██║██╔══██║██║  ██║╚════╝██║╚██╔╝██║██╔══╝     ██║   ██╔══██║██║   ██║██║  ██║
██████╔╝██║ ╚═╝ ██║██║  ██║██████╔╝      ██║ ╚═╝ ██║███████╗   ██║   ██║  ██║╚██████╔╝██████╔╝
╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═════╝       ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ 
  `));
  
  console.log(chalk.bold.magenta('🚀 Universal AI Agent Framework for Any Domain'));
  console.log(chalk.bold.blue(`✨ Installer v${version}\n`));

  const answers = {};

  // Ask for installation directory first
  const { directory } = await inquirer.prompt([
    {
      type: 'input',
      name: 'directory',
      message: 'Enter the full path to your project directory where BMad should be installed:',
      validate: (input) => {
        if (!input.trim()) {
          return 'Please enter a valid project path';
        }
        return true;
      }
    }
  ]);
  answers.directory = directory;

  // Detect existing installations
  const installDir = path.resolve(directory);
  const state = await installer.detectInstallationState(installDir);
  
  // Check for existing expansion packs
  const existingExpansionPacks = state.expansionPacks || {};
  
  // Get available expansion packs
  const availableExpansionPacks = await installer.getAvailableExpansionPacks();
  
  // Build choices list
  const choices = [];
  
  // Load core config to get short-title
  const coreConfigPath = path.join(__dirname, '..', '..', '..', 'bmad-core', 'core-config.yaml');
  const coreConfig = yaml.load(await fs.readFile(coreConfigPath, 'utf8'));
  const coreShortTitle = coreConfig['short-title'] || 'BMad Agile Core System';
  
  // Add BMad core option
  let bmadOptionText;
  if (state.type === 'v4_existing') {
    const currentVersion = state.manifest?.version || 'unknown';
    const newVersion = version; // Always use package.json version
    const versionInfo = currentVersion === newVersion 
      ? `(v${currentVersion} - reinstall)`
      : `(v${currentVersion} → v${newVersion})`;
    bmadOptionText = `Update ${coreShortTitle} ${versionInfo} .bmad-core`;
  } else {
    bmadOptionText = `${coreShortTitle} (v${version}) .bmad-core`;
  }
  
  choices.push({
    name: bmadOptionText,
    value: 'bmad-core',
    checked: true
  });
  
  // Add expansion pack options
  for (const pack of availableExpansionPacks) {
    const existing = existingExpansionPacks[pack.id];
    let packOptionText;
    
    if (existing) {
      const currentVersion = existing.manifest?.version || 'unknown';
      const newVersion = pack.version;
      const versionInfo = currentVersion === newVersion 
        ? `(v${currentVersion} - reinstall)`
        : `(v${currentVersion} → v${newVersion})`;
      packOptionText = `Update ${pack.shortTitle} ${versionInfo} .${pack.id}`;
    } else {
      packOptionText = `${pack.shortTitle} (v${pack.version}) .${pack.id}`;
    }
    
    choices.push({
      name: packOptionText,
      value: pack.id,
      checked: false
    });
  }
  
  // Ask what to install
  const { selectedItems } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedItems',
      message: 'Select what to install/update (use space to select, enter to continue):',
      choices: choices,
      validate: (selected) => {
        if (selected.length === 0) {
          return 'Please select at least one item to install';
        }
        return true;
      }
    }
  ]);
  
  // Process selections
  answers.installType = selectedItems.includes('bmad-core') ? 'full' : 'expansion-only';
  answers.expansionPacks = selectedItems.filter(item => item !== 'bmad-core');

  // Ask sharding questions if installing BMad core
  if (selectedItems.includes('bmad-core')) {
    console.log(chalk.cyan('\n📋 Document Organization Settings'));
    console.log(chalk.dim('Configure how your project documentation should be organized.\n'));
    
    // Ask about PRD sharding
    const { prdSharded } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'prdSharded',
        message: 'Will the PRD (Product Requirements Document) be sharded into multiple files?',
        default: true
      }
    ]);
    answers.prdSharded = prdSharded;
    
    // Ask about architecture sharding
    const { architectureSharded } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'architectureSharded',
        message: 'Will the architecture documentation be sharded into multiple files?',
        default: true
      }
    ]);
    answers.architectureSharded = architectureSharded;
    
    // Show warning if architecture sharding is disabled
    if (!architectureSharded) {
      console.log(chalk.yellow.bold('\n⚠️  IMPORTANT: Architecture Sharding Disabled'));
      console.log(chalk.yellow('With architecture sharding disabled, you should still create the files listed'));
      console.log(chalk.yellow('in devLoadAlwaysFiles (like coding-standards.md, tech-stack.md, source-tree.md)'));
      console.log(chalk.yellow('as these are used by the dev agent at runtime.'));
      console.log(chalk.yellow('\nAlternatively, you can remove these files from the devLoadAlwaysFiles list'));
      console.log(chalk.yellow('in your core-config.yaml after installation.'));
      
      const { acknowledge } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'acknowledge',
          message: 'Do you acknowledge this requirement and want to proceed?',
          default: false
        }
      ]);
      
      if (!acknowledge) {
        console.log(chalk.red('Installation cancelled.'));
        process.exit(0);
      }
    }
  }

  // Ask for IDE configuration
  let ides = [];
  let ideSelectionComplete = false;
  
  while (!ideSelectionComplete) {
    console.log(chalk.cyan('\n🛠️  IDE Configuration'));
    console.log(chalk.bold.yellow.bgRed(' ⚠️  IMPORTANT: This is a MULTISELECT! Use SPACEBAR to toggle each IDE! '));
    console.log(chalk.bold.magenta('🔸 Use arrow keys to navigate'));
    console.log(chalk.bold.magenta('🔸 Use SPACEBAR to select/deselect IDEs'));
    console.log(chalk.bold.magenta('🔸 Press ENTER when finished selecting'));
    console.log(chalk.bold.cyan('🔸 You can select MULTIPLE IDEs (e.g., Kiro + Cursor + GitHub Copilot)'));
    console.log(chalk.bold.green('🔸 Kiro IDE creates .kiro/ folder with agent transformations and hooks\n'));
    
    const ideResponse = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'ides',
        message: 'Which IDE(s) do you want to configure? You can select multiple! (SPACEBAR to select, ENTER to confirm):',
        choices: [
          { name: 'Cursor', value: 'cursor' },
          { name: 'Claude Code', value: 'claude-code' },
          { name: 'Windsurf', value: 'windsurf' },
          { name: 'Trae', value: 'trae' }, // { name: 'Trae', value: 'trae'}
          { name: 'Roo Code', value: 'roo' },
          { name: 'Kilo Code', value: 'kilo' },
          { name: 'Cline', value: 'cline' },
          { name: 'Gemini CLI', value: 'gemini' },
          { name: 'Qwen Code', value: 'qwen-code' },
          { name: 'Github Copilot', value: 'github-copilot' },
          { name: 'Kiro IDE (creates .kiro/ folder with agent transformations)', value: 'kiro' }
        ]
      }
    ]);
    
    ides = ideResponse.ides;

    // Confirm no IDE selection if none selected
    if (ides.length === 0) {
      const { confirmNoIde } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmNoIde',
          message: chalk.red('⚠️  You have NOT selected any IDEs. This means NO IDE integration will be set up. Is this correct?'),
          default: false
        }
      ]);
      
      if (!confirmNoIde) {
        console.log(chalk.bold.red('\n🔄 Returning to IDE selection. Remember to use SPACEBAR to select IDEs!\n'));
        continue; // Go back to IDE selection only
      }
    }
    
    ideSelectionComplete = true;
  }

  // Use selected IDEs directly
  answers.ides = ides;

  // Configure GitHub Copilot immediately if selected
  if (ides.includes('github-copilot')) {
    console.log(chalk.cyan('\n🔧 GitHub Copilot Configuration'));
    console.log(chalk.dim('BMad works best with specific VS Code settings for optimal agent experience.\n'));
    
    const { configChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'configChoice',
        message: chalk.yellow('How would you like to configure GitHub Copilot settings?'),
        choices: [
          {
            name: 'Use recommended defaults (fastest setup)',
            value: 'defaults'
          },
          {
            name: 'Configure each setting manually (customize to your preferences)',
            value: 'manual'
          },
          {
            name: 'Skip settings configuration (I\'ll configure manually later)',
            value: 'skip'
          }
        ],
        default: 'defaults'
      }
    ]);
    
    answers.githubCopilotConfig = { configChoice };
  }

  // Ask for web bundles installation
  const { includeWebBundles } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'includeWebBundles',
      message: 'Would you like to include pre-built web bundles? (standalone files for ChatGPT, Claude, Gemini)',
      default: false
    }
  ]);

  if (includeWebBundles) {
    console.log(chalk.cyan('\n📦 Web bundles are standalone files perfect for web AI platforms.'));
    console.log(chalk.dim('   You can choose different teams/agents than your IDE installation.\n'));

    const { webBundleType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'webBundleType',
        message: 'What web bundles would you like to include?',
        choices: [
          {
            name: 'All available bundles (agents, teams, expansion packs)',
            value: 'all'
          },
          {
            name: 'Specific teams only',
            value: 'teams'
          },
          {
            name: 'Individual agents only',
            value: 'agents'
          },
          {
            name: 'Custom selection',
            value: 'custom'
          }
        ]
      }
    ]);

    answers.webBundleType = webBundleType;

    // If specific teams, let them choose which teams
    if (webBundleType === 'teams' || webBundleType === 'custom') {
      const teams = await installer.getAvailableTeams();
      const { selectedTeams } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedTeams',
          message: 'Select team bundles to include:',
          choices: teams.map(t => ({
            name: `${t.icon || '📋'} ${t.name}: ${t.description}`,
            value: t.id,
            checked: webBundleType === 'teams' // Check all if teams-only mode
          })),
          validate: (answer) => {
            if (answer.length < 1) {
              return 'You must select at least one team.';
            }
            return true;
          }
        }
      ]);
      answers.selectedWebBundleTeams = selectedTeams;
    }

    // If custom selection, also ask about individual agents
    if (webBundleType === 'custom') {
      const { includeIndividualAgents } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'includeIndividualAgents',
          message: 'Also include individual agent bundles?',
          default: true
        }
      ]);
      answers.includeIndividualAgents = includeIndividualAgents;
    }

    const { webBundlesDirectory } = await inquirer.prompt([
      {
        type: 'input',
        name: 'webBundlesDirectory',
        message: 'Enter directory for web bundles:',
        default: `${answers.directory}/web-bundles`,
        validate: (input) => {
          if (!input.trim()) {
            return 'Please enter a valid directory path';
          }
          return true;
        }
      }
    ]);
    answers.webBundlesDirectory = webBundlesDirectory;
  }

  answers.includeWebBundles = includeWebBundles;

  return answers;
}

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}