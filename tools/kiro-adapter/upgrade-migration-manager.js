/**
 * Upgrade and Migration Manager
 * Handles detection of incomplete installations, incremental conversion,
 * and migration of existing steering-based workarounds
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const yaml = require('js-yaml');
const AgentDiscovery = require('./agent-discovery');
const AgentTransformer = require('./agent-transformer');
const ConversionErrorHandler = require('./conversion-error-handler');
const KiroValidator = require('./kiro-validator');

class UpgradeMigrationManager {
  constructor(options = {}) {
    this.options = {
      rootPath: options.rootPath || process.cwd(),
      verbose: options.verbose || false,
      preserveCustomizations: options.preserveCustomizations !== false,
      backupCustomizations: options.backupCustomizations !== false,
      dryRun: options.dryRun || false,
      ...options
    };

    this.agentDiscovery = new AgentDiscovery(this.options);
    this.agentTransformer = new AgentTransformer(this.options);
    this.validator = new KiroValidator();
    this.errorHandler = new ConversionErrorHandler({
      logLevel: options.logLevel || 'info',
      enableDiagnostics: true,
      enableRecovery: true,
      logFilePath: path.join(this.options.rootPath, '.kiro', 'logs', 'upgrade-errors.log')
    });

    // Track upgrade progress
    this.upgradeProgress = {
      startTime: null,
      endTime: null,
      totalAgents: 0,
      processedAgents: 0,
      upgradedAgents: 0,
      skippedAgents: 0,
      failedAgents: [],
      migratedCustomizations: 0,
      preservedCustomizations: 0,
      backupPaths: []
    };

    // Installation state tracking
    this.installationState = {
      isIncomplete: false,
      missingAgents: [],
      existingAgents: [],
      customizations: new Map(),
      steeringWorkarounds: [],
      version: null,
      lastUpgrade: null
    };
  }

  /**
   * Detect existing incomplete installations and analyze upgrade needs
   * @returns {Promise<Object>} - Detection results with upgrade recommendations
   */
  async detectIncompleteInstallation() {
    this.log('Detecting incomplete Kiro installation...', 'info');

    try {
      // Check if Kiro workspace exists
      const kiroDir = path.join(this.options.rootPath, '.kiro');
      if (!await fs.pathExists(kiroDir)) {
        return {
          isIncomplete: false,
          isNewInstallation: true,
          reason: 'No .kiro directory found - appears to be new installation'
        };
      }

      // Analyze current installation state
      await this.analyzeCurrentInstallation();

      // Discover all available agents (what should be installed)
      const availableAgents = await this.agentDiscovery.scanAllAgents();
      this.installationState.totalAvailable = availableAgents.length;

      // Compare with currently installed agents
      const installedAgents = await this.scanInstalledAgents();
      this.installationState.existingAgents = installedAgents;

      // Identify missing agents
      const missingAgents = this.identifyMissingAgents(availableAgents, installedAgents);
      this.installationState.missingAgents = missingAgents;

      // Detect steering-based workarounds
      const steeringWorkarounds = await this.detectSteeringWorkarounds();
      this.installationState.steeringWorkarounds = steeringWorkarounds;

      // Detect user customizations
      const customizations = await this.detectUserCustomizations();
      this.installationState.customizations = customizations;

      // Determine if installation is incomplete
      const isIncomplete = missingAgents.length > 0 || 
                          steeringWorkarounds.length > 0 ||
                          await this.hasIncompleteFeatures();

      this.installationState.isIncomplete = isIncomplete;

      const result = {
        isIncomplete,
        isNewInstallation: false,
        analysis: {
          totalAvailable: availableAgents.length,
          currentlyInstalled: installedAgents.length,
          missingAgents: missingAgents.length,
          steeringWorkarounds: steeringWorkarounds.length,
          userCustomizations: customizations.size,
          needsUpgrade: isIncomplete
        },
        recommendations: this.generateUpgradeRecommendations(),
        installationState: this.installationState
      };

      this.log(`Installation analysis complete. Incomplete: ${isIncomplete}`, 'info');
      return result;

    } catch (error) {
      this.log(`Error detecting incomplete installation: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Perform incremental conversion for missing agents
   * @param {Array} missingAgentIds - Optional list of specific agents to convert
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} - Conversion results
   */
  async performIncrementalConversion(missingAgentIds = null, options = {}) {
    this.log('Starting incremental agent conversion...', 'info');
    this.upgradeProgress.startTime = new Date();

    try {
      // Use detected missing agents if none specified
      const agentsToConvert = missingAgentIds || this.installationState.missingAgents.map(a => a.id);
      
      if (agentsToConvert.length === 0) {
        this.log('No missing agents to convert', 'info');
        return {
          success: true,
          converted: [],
          skipped: [],
          failed: [],
          message: 'No agents needed conversion'
        };
      }

      this.upgradeProgress.totalAgents = agentsToConvert.length;
      this.log(`Converting ${agentsToConvert.length} missing agents...`, 'info');

      const results = {
        converted: [],
        skipped: [],
        failed: [],
        errors: []
      };

      // Ensure output directory exists
      const agentsDir = path.join(this.options.rootPath, '.kiro', 'agents');
      await fs.ensureDir(agentsDir);

      // Convert each missing agent
      for (const agentId of agentsToConvert) {
        try {
          this.log(`Converting agent: ${agentId}`, 'info');
          this.upgradeProgress.processedAgents++;

          // Find the source agent
          const sourceAgent = await this.findSourceAgent(agentId);
          if (!sourceAgent) {
            results.failed.push(agentId);
            results.errors.push({ agentId, error: 'Source agent not found' });
            this.upgradeProgress.failedAgents.push(agentId);
            continue;
          }

          // Check if agent already exists and handle accordingly
          const outputPath = path.join(agentsDir, `${agentId}.md`);
          if (await fs.pathExists(outputPath)) {
            if (options.skipExisting) {
              results.skipped.push(agentId);
              this.upgradeProgress.skippedAgents++;
              this.log(`Skipping existing agent: ${agentId}`, 'info');
              continue;
            } else if (options.preserveExisting) {
              // Backup existing version before overwriting
              await this.backupExistingAgent(agentId, outputPath);
            }
          }

          // Perform conversion
          const conversionOptions = {
            ...options,
            agentId,
            source: sourceAgent.source,
            expansionPack: sourceAgent.expansionPack,
            isIncremental: true
          };

          const success = await this.agentTransformer.transformAgentForKiro(
            sourceAgent.filePath,
            outputPath,
            conversionOptions
          );

          if (success) {
            results.converted.push(agentId);
            this.upgradeProgress.upgradedAgents++;
            this.log(`Successfully converted agent: ${agentId}`, 'info');
          } else {
            results.failed.push(agentId);
            this.upgradeProgress.failedAgents.push(agentId);
            this.log(`Failed to convert agent: ${agentId}`, 'error');
          }

        } catch (error) {
          results.failed.push(agentId);
          results.errors.push({ agentId, error: error.message });
          this.upgradeProgress.failedAgents.push(agentId);
          this.log(`Error converting agent ${agentId}: ${error.message}`, 'error');
        }
      }

      this.upgradeProgress.endTime = new Date();
      
      const success = results.failed.length === 0;
      this.log(`Incremental conversion complete. Success: ${results.converted.length}, Failed: ${results.failed.length}`, 'info');

      return {
        success,
        ...results,
        progress: this.upgradeProgress
      };

    } catch (error) {
      this.log(`Incremental conversion failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Migrate existing steering-based workarounds to native agent system
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} - Migration results
   */
  async migrateSteeringWorkarounds(options = {}) {
    this.log('Starting migration of steering-based workarounds...', 'info');

    try {
      const workarounds = this.installationState.steeringWorkarounds;
      
      if (workarounds.length === 0) {
        this.log('No steering workarounds found to migrate', 'info');
        return {
          success: true,
          migrated: [],
          preserved: [],
          failed: [],
          message: 'No workarounds needed migration'
        };
      }

      const results = {
        migrated: [],
        preserved: [],
        failed: [],
        errors: []
      };

      for (const workaround of workarounds) {
        try {
          this.log(`Migrating steering workaround: ${workaround.file}`, 'info');

          // Analyze the workaround to understand what it does
          const analysis = await this.analyzeSteeringWorkaround(workaround);
          
          if (analysis.canMigrate) {
            // Create native agent equivalent
            const migrationResult = await this.createNativeAgentFromSteering(workaround, analysis, options);
            
            if (migrationResult.success) {
              results.migrated.push({
                original: workaround.file,
                migrated: migrationResult.agentPath,
                backupPath: migrationResult.backupPath
              });

              // Optionally remove or rename the steering workaround
              if (options.removeWorkarounds) {
                await this.removeSteeringWorkaround(workaround, options);
              } else {
                await this.markSteeringWorkaroundMigrated(workaround);
              }

              this.upgradeProgress.migratedCustomizations++;
            } else {
              results.failed.push(workaround.file);
              results.errors.push({ 
                file: workaround.file, 
                error: migrationResult.error 
              });
            }
          } else {
            // Preserve workaround if it can't be migrated
            results.preserved.push({
              file: workaround.file,
              reason: analysis.reason
            });
            this.upgradeProgress.preservedCustomizations++;
          }

        } catch (error) {
          results.failed.push(workaround.file);
          results.errors.push({ 
            file: workaround.file, 
            error: error.message 
          });
          this.log(`Error migrating workaround ${workaround.file}: ${error.message}`, 'error');
        }
      }

      const success = results.failed.length === 0;
      this.log(`Steering workaround migration complete. Migrated: ${results.migrated.length}, Preserved: ${results.preserved.length}, Failed: ${results.failed.length}`, 'info');

      return {
        success,
        ...results
      };

    } catch (error) {
      this.log(`Steering workaround migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Preserve user customizations during upgrade
   * @param {Object} options - Preservation options
   * @returns {Promise<Object>} - Preservation results
   */
  async preserveUserCustomizations(options = {}) {
    this.log('Preserving user customizations during upgrade...', 'info');

    try {
      const customizations = this.installationState.customizations;
      
      if (customizations.size === 0) {
        this.log('No user customizations found to preserve', 'info');
        return {
          success: true,
          preserved: [],
          backed_up: [],
          message: 'No customizations needed preservation'
        };
      }

      const results = {
        preserved: [],
        backed_up: [],
        failed: [],
        errors: []
      };

      for (const [file, customization] of customizations) {
        try {
          this.log(`Preserving customization in: ${file}`, 'info');

          // Create backup if requested
          if (this.options.backupCustomizations) {
            const backupResult = await this.backupCustomization(file, customization, options);
            if (backupResult.success) {
              results.backed_up.push({
                original: file,
                backup: backupResult.backupPath,
                type: customization.type
              });
              this.upgradeProgress.backupPaths.push(backupResult.backupPath);
            }
          }

          // Apply preservation strategy based on customization type
          const preservationResult = await this.applyPreservationStrategy(file, customization, options);
          
          if (preservationResult.success) {
            results.preserved.push({
              file,
              type: customization.type,
              strategy: preservationResult.strategy,
              details: preservationResult.details
            });
            this.upgradeProgress.preservedCustomizations++;
          } else {
            results.failed.push(file);
            results.errors.push({
              file,
              error: preservationResult.error
            });
          }

        } catch (error) {
          results.failed.push(file);
          results.errors.push({
            file,
            error: error.message
          });
          this.log(`Error preserving customization in ${file}: ${error.message}`, 'error');
        }
      }

      const success = results.failed.length === 0;
      this.log(`Customization preservation complete. Preserved: ${results.preserved.length}, Backed up: ${results.backed_up.length}, Failed: ${results.failed.length}`, 'info');

      return {
        success,
        ...results
      };

    } catch (error) {
      this.log(`Customization preservation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Perform complete upgrade with all migration features
   * @param {Object} options - Upgrade options
   * @returns {Promise<Object>} - Complete upgrade results
   */
  async performCompleteUpgrade(options = {}) {
    this.log('Starting complete Kiro installation upgrade...', 'info');

    try {
      // Phase 1: Detect current state
      this.log('Phase 1: Analyzing current installation...', 'info');
      const detection = await this.detectIncompleteInstallation();
      
      if (!detection.isIncomplete && !options.forceUpgrade) {
        return {
          success: true,
          message: 'Installation is already complete - no upgrade needed',
          detection
        };
      }

      // Phase 2: Preserve customizations
      this.log('Phase 2: Preserving user customizations...', 'info');
      const preservationResult = await this.preserveUserCustomizations(options);

      // Phase 3: Migrate steering workarounds
      this.log('Phase 3: Migrating steering workarounds...', 'info');
      const migrationResult = await this.migrateSteeringWorkarounds(options);

      // Phase 4: Incremental agent conversion
      this.log('Phase 4: Converting missing agents...', 'info');
      const conversionResult = await this.performIncrementalConversion(null, options);

      // Phase 5: Validate upgraded installation
      this.log('Phase 5: Validating upgraded installation...', 'info');
      const validationResult = await this.validator.validateKiroInstallation(this.options.rootPath);

      // Phase 6: Generate upgrade report
      const upgradeReport = this.generateUpgradeReport({
        detection,
        preservation: preservationResult,
        migration: migrationResult,
        conversion: conversionResult,
        validation: validationResult
      });

      // Update installation metadata
      await this.updateInstallationMetadata(upgradeReport);

      const overallSuccess = preservationResult.success && 
                           migrationResult.success && 
                           conversionResult.success && 
                           validationResult.isValid;

      this.log(`Complete upgrade finished. Success: ${overallSuccess}`, overallSuccess ? 'info' : 'warn');

      return {
        success: overallSuccess,
        phases: {
          detection,
          preservation: preservationResult,
          migration: migrationResult,
          conversion: conversionResult,
          validation: validationResult
        },
        report: upgradeReport,
        progress: this.upgradeProgress
      };

    } catch (error) {
      this.log(`Complete upgrade failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Analyze current installation state
   * @returns {Promise<void>}
   */
  async analyzeCurrentInstallation() {
    const kiroDir = path.join(this.options.rootPath, '.kiro');
    
    // Check for installation metadata
    const metadataPath = path.join(kiroDir, 'installation-metadata.json');
    if (await fs.pathExists(metadataPath)) {
      try {
        const metadata = await fs.readJson(metadataPath);
        this.installationState.version = metadata.version;
        this.installationState.lastUpgrade = metadata.lastUpgrade;
      } catch (error) {
        this.log(`Error reading installation metadata: ${error.message}`, 'warn');
      }
    }

    // Validate workspace structure
    const validation = await this.validator.validateKiroWorkspace(this.options.rootPath);
    this.installationState.workspaceValid = validation.isValid;
    this.installationState.workspaceErrors = validation.errors;
    this.installationState.workspaceWarnings = validation.warnings;
  }

  /**
   * Scan currently installed agents
   * @returns {Promise<Array>} - Array of installed agent metadata
   */
  async scanInstalledAgents() {
    const agentsDir = path.join(this.options.rootPath, '.kiro', 'agents');
    
    if (!await fs.pathExists(agentsDir)) {
      return [];
    }

    const installedAgents = [];
    const agentFiles = await fs.readdir(agentsDir);
    
    for (const file of agentFiles) {
      if (!file.endsWith('.md')) continue;
      
      const agentId = path.basename(file, '.md');
      const filePath = path.join(agentsDir, file);
      
      try {
        const stats = await fs.stat(filePath);
        installedAgents.push({
          id: agentId,
          filePath,
          size: stats.size,
          modified: stats.mtime,
          isKiroNative: await this.isKiroNativeAgent(filePath)
        });
      } catch (error) {
        this.log(`Error scanning installed agent ${agentId}: ${error.message}`, 'warn');
      }
    }

    return installedAgents;
  }

  /**
   * Identify missing agents by comparing available vs installed
   * @param {Array} availableAgents - All available agents
   * @param {Array} installedAgents - Currently installed agents
   * @returns {Array} - Missing agent metadata
   */
  identifyMissingAgents(availableAgents, installedAgents) {
    const installedIds = new Set(installedAgents.map(a => a.id));
    return availableAgents.filter(agent => !installedIds.has(agent.id));
  }

  /**
   * Detect steering-based workarounds
   * @returns {Promise<Array>} - Array of steering workaround metadata
   */
  async detectSteeringWorkarounds() {
    const steeringDir = path.join(this.options.rootPath, '.kiro', 'steering');
    
    if (!await fs.pathExists(steeringDir)) {
      return [];
    }

    const workarounds = [];
    const steeringFiles = await fs.readdir(steeringDir);
    
    for (const file of steeringFiles) {
      if (!file.endsWith('.md')) continue;
      
      const filePath = path.join(steeringDir, file);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        
        // Detect if this is a workaround (contains agent-like instructions)
        const isWorkaround = this.detectSteeringWorkaround(content, file);
        
        if (isWorkaround) {
          workarounds.push({
            file,
            filePath,
            type: isWorkaround.type,
            agentLike: isWorkaround.agentLike,
            complexity: isWorkaround.complexity
          });
        }
      } catch (error) {
        this.log(`Error analyzing steering file ${file}: ${error.message}`, 'warn');
      }
    }

    return workarounds;
  }

  /**
   * Detect user customizations in existing files
   * @returns {Promise<Map>} - Map of file paths to customization metadata
   */
  async detectUserCustomizations() {
    const customizations = new Map();
    
    // Check agents directory for customizations
    await this.scanDirectoryForCustomizations(
      path.join(this.options.rootPath, '.kiro', 'agents'),
      'agent',
      customizations
    );

    // Check steering directory for customizations
    await this.scanDirectoryForCustomizations(
      path.join(this.options.rootPath, '.kiro', 'steering'),
      'steering',
      customizations
    );

    // Check hooks directory for customizations
    await this.scanDirectoryForCustomizations(
      path.join(this.options.rootPath, '.kiro', 'hooks'),
      'hook',
      customizations
    );

    return customizations;
  }

  /**
   * Scan directory for user customizations
   * @param {string} directory - Directory to scan
   * @param {string} type - Type of files in directory
   * @param {Map} customizations - Map to store results
   * @returns {Promise<void>}
   */
  async scanDirectoryForCustomizations(directory, type, customizations) {
    if (!await fs.pathExists(directory)) {
      return;
    }

    const files = await fs.readdir(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) continue;

        const content = await fs.readFile(filePath, 'utf8');
        const customization = this.analyzeFileForCustomizations(content, filePath, type);
        
        if (customization.hasCustomizations) {
          customizations.set(filePath, customization);
        }
      } catch (error) {
        this.log(`Error analyzing file ${filePath}: ${error.message}`, 'warn');
      }
    }
  }

  /**
   * Check if installation has incomplete features
   * @returns {Promise<boolean>}
   */
  async hasIncompleteFeatures() {
    // Check for missing core directories
    const requiredDirs = ['agents', 'steering', 'hooks', 'specs'];
    const kiroDir = path.join(this.options.rootPath, '.kiro');
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(kiroDir, dir);
      if (!await fs.pathExists(dirPath)) {
        return true;
      }
    }

    // Check for empty or minimal agent directory
    const agentsDir = path.join(kiroDir, 'agents');
    const agentFiles = await fs.readdir(agentsDir);
    const mdFiles = agentFiles.filter(f => f.endsWith('.md'));
    
    // If we have fewer than expected core agents, installation is incomplete
    const expectedCoreAgents = ['architect', 'dev', 'pm', 'qa', 'sm', 'analyst'];
    const hasAllCoreAgents = expectedCoreAgents.every(agent => 
      mdFiles.some(file => file.includes(agent))
    );

    return !hasAllCoreAgents;
  }

  /**
   * Generate upgrade recommendations based on analysis
   * @returns {Array} - Array of recommendation strings
   */
  generateUpgradeRecommendations() {
    const recommendations = [];
    
    if (this.installationState.missingAgents.length > 0) {
      recommendations.push(`Convert ${this.installationState.missingAgents.length} missing agents to Kiro format`);
    }

    if (this.installationState.steeringWorkarounds.length > 0) {
      recommendations.push(`Migrate ${this.installationState.steeringWorkarounds.length} steering-based workarounds to native agents`);
    }

    if (this.installationState.customizations.size > 0) {
      recommendations.push(`Preserve ${this.installationState.customizations.size} user customizations during upgrade`);
    }

    if (!this.installationState.workspaceValid) {
      recommendations.push('Fix workspace structure issues');
    }

    if (recommendations.length === 0) {
      recommendations.push('Installation appears complete - consider validation check');
    }

    return recommendations;
  }

  /**
   * Find source agent by ID
   * @param {string} agentId - Agent identifier
   * @returns {Promise<Object|null>} - Source agent metadata or null
   */
  async findSourceAgent(agentId) {
    // Use agent discovery to find the source
    const allAgents = await this.agentDiscovery.scanAllAgents();
    return allAgents.find(agent => agent.id === agentId) || null;
  }

  /**
   * Backup existing agent before overwriting
   * @param {string} agentId - Agent identifier
   * @param {string} agentPath - Current agent file path
   * @returns {Promise<string>} - Backup file path
   */
  async backupExistingAgent(agentId, agentPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.options.rootPath, '.kiro', 'backups', 'agents');
    await fs.ensureDir(backupDir);
    
    const backupPath = path.join(backupDir, `${agentId}-${timestamp}.md`);
    await fs.copy(agentPath, backupPath);
    
    this.upgradeProgress.backupPaths.push(backupPath);
    this.log(`Backed up existing agent ${agentId} to: ${backupPath}`, 'info');
    
    return backupPath;
  }

  /**
   * Check if agent file is Kiro-native format
   * @param {string} filePath - Agent file path
   * @returns {Promise<boolean>}
   */
  async isKiroNativeAgent(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check for Kiro-specific markers
      const hasKiroMarkers = content.includes('kiro_integration') ||
                           content.includes('context_providers') ||
                           content.includes('#File') ||
                           content.includes('#Folder');
      
      return hasKiroMarkers;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect if steering file is a workaround
   * @param {string} content - File content
   * @param {string} filename - File name
   * @returns {Object|false} - Workaround detection result
   */
  detectSteeringWorkaround(content, filename) {
    // Look for agent-like patterns in steering files
    const agentPatterns = [
      /you are a/i,
      /your role is/i,
      /act as/i,
      /persona:/i,
      /roleDefinition:/i,
      /when to use:/i
    ];

    const agentLikeCount = agentPatterns.reduce((count, pattern) => {
      return count + (pattern.test(content) ? 1 : 0);
    }, 0);

    if (agentLikeCount >= 2) {
      return {
        type: 'agent-workaround',
        agentLike: true,
        complexity: agentLikeCount >= 4 ? 'high' : 'medium',
        patterns: agentLikeCount
      };
    }

    // Check for other workaround patterns
    if (content.includes('bmad') && content.includes('agent')) {
      return {
        type: 'bmad-workaround',
        agentLike: false,
        complexity: 'low',
        patterns: 1
      };
    }

    return false;
  }

  /**
   * Analyze file for user customizations
   * @param {string} content - File content
   * @param {string} filePath - File path
   * @param {string} type - File type
   * @returns {Object} - Customization analysis
   */
  analyzeFileForCustomizations(content, filePath, type) {
    const customizations = {
      hasCustomizations: false,
      type,
      filePath,
      customizationTypes: [],
      preservationStrategy: 'merge'
    };

    // Look for user-added content markers
    const userMarkers = [
      /<!-- user customization -->/i,
      /# custom/i,
      /# user added/i,
      /# modified by/i
    ];

    const hasUserMarkers = userMarkers.some(marker => marker.test(content));
    
    if (hasUserMarkers) {
      customizations.hasCustomizations = true;
      customizations.customizationTypes.push('user-marked');
    }

    // Look for non-standard content that suggests customization
    if (type === 'agent') {
      // Check for custom instructions or modifications
      if (content.includes('custom instructions') || 
          content.includes('modified behavior') ||
          content.length > 5000) { // Unusually long agent file
        customizations.hasCustomizations = true;
        customizations.customizationTypes.push('content-modification');
      }
    }

    // Check file modification time vs creation patterns
    // (This would need additional metadata to implement fully)

    return customizations;
  }

  /**
   * Analyze steering workaround for migration potential
   * @param {Object} workaround - Workaround metadata
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeSteeringWorkaround(workaround) {
    try {
      const content = await fs.readFile(workaround.filePath, 'utf8');
      
      // Determine if we can migrate this to a native agent
      const canMigrate = workaround.agentLike && workaround.complexity !== 'high';
      
      return {
        canMigrate,
        reason: canMigrate ? 'Can be converted to native agent' : 'Too complex or specialized for automatic migration',
        suggestedAgentId: this.extractAgentIdFromSteering(content, workaround.file),
        extractedConfig: canMigrate ? this.extractAgentConfigFromSteering(content) : null
      };
    } catch (error) {
      return {
        canMigrate: false,
        reason: `Analysis failed: ${error.message}`
      };
    }
  }

  /**
   * Create native agent from steering workaround
   * @param {Object} workaround - Workaround metadata
   * @param {Object} analysis - Analysis result
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} - Creation result
   */
  async createNativeAgentFromSteering(workaround, analysis, options) {
    try {
      const agentId = analysis.suggestedAgentId || path.basename(workaround.file, '.md');
      const agentPath = path.join(this.options.rootPath, '.kiro', 'agents', `${agentId}.md`);
      
      // Create backup of steering file
      const backupPath = await this.backupSteeringWorkaround(workaround);
      
      // Generate agent content from steering content
      const agentContent = this.generateAgentFromSteeringContent(
        await fs.readFile(workaround.filePath, 'utf8'),
        analysis.extractedConfig,
        agentId
      );
      
      // Write the new agent file
      if (!this.options.dryRun) {
        await fs.writeFile(agentPath, agentContent);
      }
      
      this.log(`Created native agent ${agentId} from steering workaround`, 'info');
      
      return {
        success: true,
        agentId,
        agentPath,
        backupPath
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Apply preservation strategy for user customization
   * @param {string} filePath - File path
   * @param {Object} customization - Customization metadata
   * @param {Object} options - Preservation options
   * @returns {Promise<Object>} - Preservation result
   */
  async applyPreservationStrategy(filePath, customization, options) {
    try {
      const strategy = customization.preservationStrategy || 'merge';
      
      switch (strategy) {
        case 'merge':
          return await this.mergeCustomization(filePath, customization, options);
        case 'backup':
          return await this.backupCustomization(filePath, customization, options);
        case 'preserve':
          return await this.preserveCustomization(filePath, customization, options);
        default:
          throw new Error(`Unknown preservation strategy: ${strategy}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Merge user customization with new content
   * @param {string} filePath - File path
   * @param {Object} customization - Customization metadata
   * @param {Object} options - Merge options
   * @returns {Promise<Object>} - Merge result
   */
  async mergeCustomization(filePath, customization, options) {
    // This is a simplified implementation - real merging would be more sophisticated
    const backupPath = `${filePath}.pre-upgrade-backup`;
    await fs.copy(filePath, backupPath);
    
    return {
      success: true,
      strategy: 'merge',
      details: {
        backupCreated: backupPath,
        action: 'preserved-with-backup'
      }
    };
  }

  /**
   * Backup user customization
   * @param {string} filePath - File path
   * @param {Object} customization - Customization metadata
   * @param {Object} options - Backup options
   * @returns {Promise<Object>} - Backup result
   */
  async backupCustomization(filePath, customization, options) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.options.rootPath, '.kiro', 'backups', 'customizations');
    await fs.ensureDir(backupDir);
    
    const filename = path.basename(filePath);
    const backupPath = path.join(backupDir, `${filename}-${timestamp}`);
    
    if (!this.options.dryRun) {
      await fs.copy(filePath, backupPath);
    }
    
    return {
      success: true,
      backupPath
    };
  }

  /**
   * Preserve user customization in place
   * @param {string} filePath - File path
   * @param {Object} customization - Customization metadata
   * @param {Object} options - Preservation options
   * @returns {Promise<Object>} - Preservation result
   */
  async preserveCustomization(filePath, customization, options) {
    // Mark file as preserved (don't overwrite during upgrade)
    const preservedMarker = path.join(path.dirname(filePath), `.${path.basename(filePath)}.preserved`);
    
    if (!this.options.dryRun) {
      await fs.writeFile(preservedMarker, JSON.stringify({
        preservedAt: new Date().toISOString(),
        reason: 'User customization detected',
        customization
      }, null, 2));
    }
    
    return {
      success: true,
      strategy: 'preserve',
      details: {
        markerFile: preservedMarker,
        action: 'preserved-in-place'
      }
    };
  }

  /**
   * Generate upgrade report
   * @param {Object} results - Results from all upgrade phases
   * @returns {Object} - Comprehensive upgrade report
   */
  generateUpgradeReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.upgradeProgress.endTime ? 
        this.upgradeProgress.endTime - this.upgradeProgress.startTime : null,
      summary: {
        overallSuccess: results.conversion.success && 
                       results.migration.success && 
                       results.preservation.success,
        agentsProcessed: this.upgradeProgress.processedAgents,
        agentsUpgraded: this.upgradeProgress.upgradedAgents,
        agentsSkipped: this.upgradeProgress.skippedAgents,
        agentsFailed: this.upgradeProgress.failedAgents.length,
        customizationsPreserved: this.upgradeProgress.preservedCustomizations,
        customizationsMigrated: this.upgradeProgress.migratedCustomizations,
        backupsCreated: this.upgradeProgress.backupPaths.length
      },
      phases: {
        detection: {
          success: true,
          ...results.detection
        },
        preservation: results.preservation,
        migration: results.migration,
        conversion: results.conversion,
        validation: results.validation
      },
      backupPaths: this.upgradeProgress.backupPaths,
      recommendations: this.generatePostUpgradeRecommendations(results)
    };

    return report;
  }

  /**
   * Generate post-upgrade recommendations
   * @param {Object} results - Upgrade results
   * @returns {Array} - Array of recommendations
   */
  generatePostUpgradeRecommendations(results) {
    const recommendations = [];

    if (results.conversion.failed.length > 0) {
      recommendations.push(`Review ${results.conversion.failed.length} failed agent conversions`);
    }

    if (results.migration.preserved.length > 0) {
      recommendations.push(`Review ${results.migration.preserved.length} preserved steering workarounds`);
    }

    if (!results.validation.isValid) {
      recommendations.push('Address validation issues found after upgrade');
    }

    if (this.upgradeProgress.backupPaths.length > 0) {
      recommendations.push(`Review backup files created during upgrade (${this.upgradeProgress.backupPaths.length} files)`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Upgrade completed successfully - no further action needed');
    }

    return recommendations;
  }

  /**
   * Update installation metadata after upgrade
   * @param {Object} upgradeReport - Upgrade report
   * @returns {Promise<void>}
   */
  async updateInstallationMetadata(upgradeReport) {
    const metadataPath = path.join(this.options.rootPath, '.kiro', 'installation-metadata.json');
    
    const metadata = {
      version: '1.0.0', // This would come from package.json or similar
      lastUpgrade: new Date().toISOString(),
      upgradeHistory: [],
      features: {
        nativeAgents: true,
        steeringMigration: true,
        customizationPreservation: true
      }
    };

    // Load existing metadata if it exists
    if (await fs.pathExists(metadataPath)) {
      try {
        const existing = await fs.readJson(metadataPath);
        metadata.upgradeHistory = existing.upgradeHistory || [];
      } catch (error) {
        this.log(`Error reading existing metadata: ${error.message}`, 'warn');
      }
    }

    // Add this upgrade to history
    metadata.upgradeHistory.push({
      timestamp: upgradeReport.timestamp,
      duration: upgradeReport.duration,
      summary: upgradeReport.summary
    });

    // Keep only last 10 upgrade records
    if (metadata.upgradeHistory.length > 10) {
      metadata.upgradeHistory = metadata.upgradeHistory.slice(-10);
    }

    if (!this.options.dryRun) {
      await fs.writeJson(metadataPath, metadata, { spaces: 2 });
    }

    this.log('Updated installation metadata', 'info');
  }

  // Helper methods for steering workaround processing
  extractAgentIdFromSteering(content, filename) {
    // Try to extract a meaningful agent ID from the steering content
    const basename = path.basename(filename, '.md');
    
    // Look for agent-like names in content
    const agentMatch = content.match(/agent[:\s]+([a-zA-Z-]+)/i);
    if (agentMatch) {
      return agentMatch[1].toLowerCase();
    }
    
    return basename;
  }

  extractAgentConfigFromSteering(content) {
    // Extract agent-like configuration from steering content
    const config = {
      name: null,
      role: null,
      description: null
    };

    // This is a simplified extraction - real implementation would be more sophisticated
    const roleMatch = content.match(/role[:\s]+([^\n]+)/i);
    if (roleMatch) {
      config.role = roleMatch[1].trim();
    }

    return config;
  }

  generateAgentFromSteeringContent(steeringContent, extractedConfig, agentId) {
    // Generate a basic Kiro agent from steering content
    const agentName = extractedConfig?.name || agentId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const role = extractedConfig?.role || 'Assistant';

    return `---
name: ${agentName}
role: ${role}
context_providers:
  - "#File"
  - "#Folder"
  - "#Problems"
  - "#Terminal"
kiro_integration:
  version: "1.0.0"
  generated_at: "${new Date().toISOString()}"
  migrated_from: "steering-workaround"
  original_steering: true
---

# ${agentName}

This agent was automatically migrated from a steering-based workaround.

## Original Instructions

${steeringContent}

## Kiro Integration

This agent now works natively with Kiro's context system and can access:
- Current file context (#File)
- Project structure (#Folder)
- Build status (#Problems)
- Terminal output (#Terminal)

Please review and customize this agent as needed.
`;
  }

  async backupSteeringWorkaround(workaround) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.options.rootPath, '.kiro', 'backups', 'steering');
    await fs.ensureDir(backupDir);
    
    const backupPath = path.join(backupDir, `${workaround.file}-${timestamp}`);
    await fs.copy(workaround.filePath, backupPath);
    
    return backupPath;
  }

  async removeSteeringWorkaround(workaround, options) {
    if (options.removeWorkarounds && !this.options.dryRun) {
      await fs.remove(workaround.filePath);
      this.log(`Removed steering workaround: ${workaround.file}`, 'info');
    }
  }

  async markSteeringWorkaroundMigrated(workaround) {
    const migratedMarker = `${workaround.filePath}.migrated`;
    if (!this.options.dryRun) {
      await fs.writeFile(migratedMarker, JSON.stringify({
        migratedAt: new Date().toISOString(),
        originalFile: workaround.file,
        migratedTo: 'native-agent'
      }, null, 2));
    }
  }

  /**
   * Log message with timestamp and level
   */
  log(message, level = 'info') {
    if (!this.options.verbose && level === 'info') {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [UpgradeMigrationManager] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(chalk.red(`${prefix} ${message}`));
        break;
      case 'warn':
        console.warn(chalk.yellow(`${prefix} ${message}`));
        break;
      case 'info':
        console.log(chalk.blue(`${prefix} ${message}`));
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
}

module.exports = UpgradeMigrationManager;