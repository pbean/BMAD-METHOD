#!/usr/bin/env node

/**
 * CLI for Kiro upgrade and migration functionality
 * Provides command-line access to upgrade and migration features
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const UpgradeMigrationManager = require('./upgrade-migration-manager');
const KiroInstaller = require('./kiro-installer');

const program = new Command();

program
  .name('kiro-upgrade')
  .description('Kiro installation upgrade and migration tools')
  .version('1.0.0');

program
  .command('detect')
  .description('Detect incomplete installations and analyze upgrade needs')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('🔍 Detecting installation state...\n'));

      const manager = new UpgradeMigrationManager({
        rootPath: options.path,
        verbose: options.verbose
      });

      const detection = await manager.detectIncompleteInstallation();

      if (detection.isNewInstallation) {
        console.log(chalk.blue('ℹ New installation detected'));
        console.log(chalk.blue('Run the full Kiro installer to set up BMad Method integration'));
        return;
      }

      if (!detection.isIncomplete) {
        console.log(chalk.green('✅ Installation is complete'));
        console.log(chalk.green('No upgrade needed'));
        return;
      }

      console.log(chalk.yellow('⚠ Incomplete installation detected'));
      
      if (detection.analysis) {
        const analysis = detection.analysis;
        console.log(chalk.cyan('\n📊 Analysis:'));
        console.log(chalk.cyan(`   Total Available: ${analysis.totalAvailable} agents`));
        console.log(chalk.cyan(`   Currently Installed: ${analysis.currentlyInstalled} agents`));
        console.log(chalk.yellow(`   Missing: ${analysis.missingAgents} agents`));
        console.log(chalk.yellow(`   Steering Workarounds: ${analysis.steeringWorkarounds}`));
        console.log(chalk.blue(`   User Customizations: ${analysis.userCustomizations}`));
      }

      if (detection.recommendations) {
        console.log(chalk.cyan('\n📝 Recommendations:'));
        detection.recommendations.forEach(rec => {
          console.log(chalk.cyan(`   • ${rec}`));
        });
      }

      console.log(chalk.cyan('\n💡 Run "kiro-upgrade upgrade" to fix these issues'));

    } catch (error) {
      console.error(chalk.red('❌ Detection failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('upgrade')
  .description('Perform complete upgrade with all migration features')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('-v, --verbose', 'Verbose output')
  .option('--force', 'Force upgrade even if installation appears complete')
  .option('--skip-existing', 'Skip agents that already exist')
  .option('--preserve-existing', 'Backup existing agents before overwriting')
  .option('--remove-workarounds', 'Remove steering workarounds after migration')
  .option('--dry-run', 'Show what would be done without making changes')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('🚀 Starting complete upgrade...\n'));

      const manager = new UpgradeMigrationManager({
        rootPath: options.path,
        verbose: options.verbose,
        dryRun: options.dryRun
      });

      const upgradeResult = await manager.performCompleteUpgrade({
        forceUpgrade: options.force,
        skipExisting: options.skipExisting,
        preserveExisting: options.preserveExisting,
        removeWorkarounds: options.removeWorkarounds
      });

      if (upgradeResult.success) {
        console.log(chalk.green('\n✅ Upgrade completed successfully!'));
      } else {
        console.log(chalk.yellow('\n⚠ Upgrade completed with warnings'));
      }

      if (upgradeResult.report && upgradeResult.report.summary) {
        const summary = upgradeResult.report.summary;
        console.log(chalk.cyan('\n📊 Summary:'));
        console.log(chalk.cyan(`   Agents Processed: ${summary.agentsProcessed}`));
        console.log(chalk.cyan(`   Agents Upgraded: ${summary.agentsUpgraded}`));
        console.log(chalk.cyan(`   Customizations Preserved: ${summary.customizationsPreserved}`));
        console.log(chalk.cyan(`   Backups Created: ${summary.backupsCreated}`));
      }

      if (upgradeResult.report && upgradeResult.report.recommendations) {
        console.log(chalk.cyan('\n📝 Next Steps:'));
        upgradeResult.report.recommendations.forEach(rec => {
          console.log(chalk.cyan(`   • ${rec}`));
        });
      }

    } catch (error) {
      console.error(chalk.red('❌ Upgrade failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('convert')
  .description('Convert specific missing agents incrementally')
  .argument('[agents...]', 'Specific agent IDs to convert (optional)')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('-v, --verbose', 'Verbose output')
  .option('--skip-existing', 'Skip agents that already exist')
  .option('--preserve-existing', 'Backup existing agents before overwriting')
  .action(async (agents, options) => {
    try {
      console.log(chalk.cyan('🔄 Starting incremental agent conversion...\n'));

      const manager = new UpgradeMigrationManager({
        rootPath: options.path,
        verbose: options.verbose
      });

      const conversionResult = await manager.performIncrementalConversion(
        agents.length > 0 ? agents : null,
        {
          skipExisting: options.skipExisting,
          preserveExisting: options.preserveExisting
        }
      );

      if (conversionResult.success) {
        console.log(chalk.green(`\n✅ Successfully converted ${conversionResult.converted.length} agents`));
        
        if (conversionResult.converted.length > 0) {
          console.log(chalk.cyan('Converted agents:'));
          conversionResult.converted.forEach(agent => {
            console.log(chalk.cyan(`   • ${agent}`));
          });
        }
      } else {
        console.log(chalk.red(`\n❌ Conversion failed for ${conversionResult.failed.length} agents`));
        
        if (conversionResult.failed.length > 0) {
          console.log(chalk.red('Failed agents:'));
          conversionResult.failed.forEach(agent => {
            console.log(chalk.red(`   • ${agent}`));
          });
        }
      }

      if (conversionResult.skipped && conversionResult.skipped.length > 0) {
        console.log(chalk.yellow(`\n⚠ Skipped ${conversionResult.skipped.length} existing agents`));
      }

    } catch (error) {
      console.error(chalk.red('❌ Conversion failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('migrate')
  .description('Migrate steering-based workarounds to native agents')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('-v, --verbose', 'Verbose output')
  .option('--remove-workarounds', 'Remove steering workarounds after migration')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('🔀 Starting steering workaround migration...\n'));

      const manager = new UpgradeMigrationManager({
        rootPath: options.path,
        verbose: options.verbose
      });

      const migrationResult = await manager.migrateSteeringWorkarounds({
        removeWorkarounds: options.removeWorkarounds
      });

      if (migrationResult.success) {
        console.log(chalk.green(`\n✅ Successfully migrated ${migrationResult.migrated.length} workarounds`));
        
        if (migrationResult.migrated.length > 0) {
          console.log(chalk.cyan('Migrated workarounds:'));
          migrationResult.migrated.forEach(item => {
            console.log(chalk.cyan(`   • ${item.original} → ${path.basename(item.migrated)}`));
          });
        }
      } else {
        console.log(chalk.red(`\n❌ Migration failed for ${migrationResult.failed.length} workarounds`));
      }

      if (migrationResult.preserved && migrationResult.preserved.length > 0) {
        console.log(chalk.yellow(`\n⚠ Preserved ${migrationResult.preserved.length} complex workarounds`));
        console.log(chalk.yellow('These require manual review:'));
        migrationResult.preserved.forEach(item => {
          console.log(chalk.yellow(`   • ${item.file} - ${item.reason}`));
        });
      }

    } catch (error) {
      console.error(chalk.red('❌ Migration failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('preserve')
  .description('Preserve user customizations during upgrade')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('-v, --verbose', 'Verbose output')
  .option('--create-backups', 'Create backups of customized files')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('💾 Preserving user customizations...\n'));

      const manager = new UpgradeMigrationManager({
        rootPath: options.path,
        verbose: options.verbose,
        backupCustomizations: options.createBackups
      });

      const preservationResult = await manager.preserveUserCustomizations({
        createBackups: options.createBackups
      });

      if (preservationResult.success) {
        console.log(chalk.green(`\n✅ Successfully preserved ${preservationResult.preserved.length} customizations`));
        
        if (preservationResult.preserved.length > 0) {
          console.log(chalk.cyan('Preserved customizations:'));
          preservationResult.preserved.forEach(item => {
            console.log(chalk.cyan(`   • ${path.basename(item.file)} (${item.type})`));
          });
        }
      } else {
        console.log(chalk.red(`\n❌ Preservation failed for ${preservationResult.failed.length} files`));
      }

      if (preservationResult.backed_up && preservationResult.backed_up.length > 0) {
        console.log(chalk.blue(`\n💾 Created ${preservationResult.backed_up.length} backup files`));
      }

    } catch (error) {
      console.error(chalk.red('❌ Preservation failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show current installation status and statistics')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('📊 Checking installation status...\n'));

      const manager = new UpgradeMigrationManager({
        rootPath: options.path,
        verbose: options.verbose
      });

      const detection = await manager.detectIncompleteInstallation();

      console.log(chalk.cyan('🏗️ Installation Status:'));
      
      if (detection.isNewInstallation) {
        console.log(chalk.blue('   Status: New Installation'));
      } else if (detection.isIncomplete) {
        console.log(chalk.yellow('   Status: Incomplete'));
      } else {
        console.log(chalk.green('   Status: Complete'));
      }

      if (detection.analysis) {
        const analysis = detection.analysis;
        console.log(chalk.cyan('\n📈 Statistics:'));
        console.log(chalk.cyan(`   Available Agents: ${analysis.totalAvailable}`));
        console.log(chalk.cyan(`   Installed Agents: ${analysis.currentlyInstalled}`));
        console.log(chalk.cyan(`   Missing Agents: ${analysis.missingAgents}`));
        console.log(chalk.cyan(`   Steering Workarounds: ${analysis.steeringWorkarounds}`));
        console.log(chalk.cyan(`   User Customizations: ${analysis.userCustomizations}`));
      }

      if (detection.installationState) {
        const state = detection.installationState;
        console.log(chalk.cyan('\n🔧 Installation Details:'));
        console.log(chalk.cyan(`   Workspace Valid: ${state.workspaceValid ? 'Yes' : 'No'}`));
        
        if (state.version) {
          console.log(chalk.cyan(`   Version: ${state.version}`));
        }
        
        if (state.lastUpgrade) {
          console.log(chalk.cyan(`   Last Upgrade: ${new Date(state.lastUpgrade).toLocaleDateString()}`));
        }
      }

    } catch (error) {
      console.error(chalk.red('❌ Status check failed:'), error.message);
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('❌ Invalid command: %s'), program.args.join(' '));
  console.log(chalk.cyan('See --help for a list of available commands.'));
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}