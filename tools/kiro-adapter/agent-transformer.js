/**
 * Agent Transformer
 * Transforms BMad agents into Kiro-native agents with context awareness
 */

const BaseTransformer = require('./base-transformer');
const ContextInjector = require('./context-injector');
const FileContextIntegrator = require('./file-context-integrator');
const MCPIntegrator = require('./mcp-integrator');
const ConversionErrorHandler = require('./conversion-error-handler');
const ConversionMonitor = require('./conversion-monitor');
const path = require('path');

class AgentTransformer extends BaseTransformer {
  constructor(options = {}) {
    super(options);
    this.contextInjector = new ContextInjector(options);
    this.fileContextIntegrator = new FileContextIntegrator(options);
    this.mcpIntegrator = new MCPIntegrator(options);
    this.errorHandler = new ConversionErrorHandler({
      logLevel: options.logLevel || 'info',
      enableDiagnostics: options.enableDiagnostics !== false,
      enableRecovery: options.enableRecovery !== false,
      diagnosticMode: options.diagnosticMode || false,
      ...options
    });

    // Initialize conversion monitor
    this.monitor = new ConversionMonitor({
      logLevel: options.logLevel || 'info',
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableDetailedLogging: options.enableDetailedLogging !== false,
      logDirectory: options.logDirectory || path.join(process.cwd(), '.kiro', 'logs'),
      reportDirectory: options.reportDirectory || path.join(process.cwd(), '.kiro', 'reports'),
      ...options
    });
    this.kiroContextProviders = [
      '#File',
      '#Folder', 
      '#Problems',
      '#Terminal',
      '#Git Diff',
      '#Codebase'
    ];

    // Track conversion attempts and failures
    this.conversionAttempts = new Map();
    this.failedConversions = new Set();
    
    // Set up error handler event listeners
    this.setupErrorHandlerListeners();
  }

  /**
   * Set up error handler event listeners
   */
  setupErrorHandlerListeners() {
    this.errorHandler.on('conversionError', (errorDetails) => {
      this.log(`Conversion error for ${errorDetails.context.agentId}: ${errorDetails.error.message}`, 'error');
    });

    this.errorHandler.on('recoverySuccess', (errorDetails, result) => {
      this.log(`Recovery successful for ${errorDetails.context.agentId}: ${result.reason}`, 'info');
    });

    this.errorHandler.on('recoveryFailed', (errorDetails, result) => {
      this.log(`Recovery failed for ${errorDetails.context.agentId}: ${result.reason}`, 'warn');
    });
  }

  /**
   * Perform incremental re-conversion for failed agents
   * @param {Array} failedAgentIds - List of agent IDs that failed conversion
   * @param {Object} options - Re-conversion options
   * @returns {Promise<Object>} - Re-conversion results
   */
  async performIncrementalReconversion(failedAgentIds = null, options = {}) {
    const agentsToReconvert = failedAgentIds || Array.from(this.failedConversions);
    
    if (agentsToReconvert.length === 0) {
      this.log('No failed conversions to retry', 'info');
      return { success: true, reconverted: [], stillFailed: [] };
    }

    this.log(`Starting incremental re-conversion for ${agentsToReconvert.length} agents`, 'info');
    
    const results = {
      reconverted: [],
      stillFailed: [],
      errors: []
    };

    for (const agentId of agentsToReconvert) {
      try {
        this.log(`Re-converting agent: ${agentId}`, 'info');
        
        // Find the original agent file path
        const agentPath = await this.findAgentPath(agentId, options);
        if (!agentPath) {
          results.errors.push({ agentId, error: 'Agent file not found' });
          continue;
        }

        // Determine output path
        const outputPath = options.outputPath || 
          path.join(process.cwd(), '.kiro', 'agents', `${agentId}.md`);

        // Attempt re-conversion with enhanced error handling
        const reconversionOptions = {
          ...options,
          agentId,
          isReconversion: true,
          previousAttempts: this.conversionAttempts.get(agentId) || 0
        };

        const success = await this.transformAgent(agentPath, outputPath, reconversionOptions);
        
        if (success) {
          results.reconverted.push(agentId);
          this.failedConversions.delete(agentId);
          this.log(`Successfully re-converted agent: ${agentId}`, 'info');
        } else {
          results.stillFailed.push(agentId);
          this.log(`Re-conversion still failed for agent: ${agentId}`, 'warn');
        }
      } catch (error) {
        results.stillFailed.push(agentId);
        results.errors.push({ agentId, error: error.message });
        this.log(`Re-conversion error for ${agentId}: ${error.message}`, 'error');
      }
    }

    this.log(`Re-conversion complete. Success: ${results.reconverted.length}, Failed: ${results.stillFailed.length}`, 'info');
    
    return {
      success: results.stillFailed.length === 0,
      ...results
    };
  }

  /**
   * Find agent file path by agent ID
   * @param {string} agentId - Agent identifier
   * @param {Object} options - Search options
   * @returns {Promise<string|null>} - Agent file path or null
   */
  async findAgentPath(agentId, options = {}) {
    const fs = require('fs-extra');
    const possiblePaths = [
      // Core agents
      path.join(process.cwd(), 'bmad-core', 'agents', `${agentId}.md`),
      // Expansion pack agents
      ...this.getExpansionPackAgentPaths(agentId),
      // Custom paths from options
      ...(options.searchPaths || [])
    ];

    for (const agentPath of possiblePaths) {
      if (await fs.pathExists(agentPath)) {
        return agentPath;
      }
    }

    return null;
  }

  /**
   * Get possible expansion pack agent paths
   * @param {string} agentId - Agent identifier
   * @returns {Array} - Array of possible paths
   */
  getExpansionPackAgentPaths(agentId) {
    const glob = require('glob');
    const expansionPacksPath = path.join(process.cwd(), 'expansion-packs');
    
    try {
      const expansionDirs = glob.sync('*/agents', { cwd: expansionPacksPath });
      return expansionDirs.map(dir => 
        path.join(expansionPacksPath, dir, `${agentId}.md`)
      );
    } catch (error) {
      this.log(`Error scanning expansion packs: ${error.message}`, 'warn');
      return [];
    }
  }

  /**
   * Generate diagnostic report for conversion issues
   * @param {Object} options - Report options
   * @returns {Promise<Object>} - Diagnostic report
   */
  async generateDiagnosticReport(options = {}) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalAttempts: this.conversionAttempts.size,
        failedConversions: this.failedConversions.size,
        successRate: this.calculateSuccessRate()
      },
      conversionAttempts: Object.fromEntries(this.conversionAttempts),
      failedConversions: Array.from(this.failedConversions),
      errorStatistics: this.errorHandler.getErrorStats(),
      systemInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        workingDirectory: process.cwd(),
        memoryUsage: process.memoryUsage()
      }
    };

    // Add detailed error information if requested
    if (options.includeDetailedErrors) {
      report.detailedErrors = this.errorHandler.getConversionErrors();
    }

    // Add agent-specific diagnostics
    if (options.includeAgentDiagnostics) {
      report.agentDiagnostics = await this.generateAgentDiagnostics();
    }

    // Export report if path provided
    if (options.exportPath) {
      const success = await this.errorHandler.exportErrorReport(options.exportPath);
      report.exported = success;
      report.exportPath = success ? options.exportPath : null;
    }

    return report;
  }

  /**
   * Generate agent-specific diagnostic information
   * @returns {Promise<Object>} - Agent diagnostics
   */
  async generateAgentDiagnostics() {
    const fs = require('fs-extra');
    const diagnostics = {
      coreAgents: { found: 0, missing: 0, accessible: 0 },
      expansionPackAgents: { found: 0, missing: 0, accessible: 0 },
      outputDirectories: { exists: false, writable: false },
      dependencies: { available: 0, missing: 0 }
    };

    try {
      // Check core agents directory
      const coreAgentsPath = path.join(process.cwd(), 'bmad-core', 'agents');
      if (await fs.pathExists(coreAgentsPath)) {
        const coreFiles = await fs.readdir(coreAgentsPath);
        diagnostics.coreAgents.found = coreFiles.filter(f => f.endsWith('.md')).length;
        
        // Check accessibility
        for (const file of coreFiles) {
          try {
            await fs.access(path.join(coreAgentsPath, file), fs.constants.R_OK);
            diagnostics.coreAgents.accessible++;
          } catch (error) {
            // File not accessible
          }
        }
      }

      // Check expansion pack agents
      const expansionPacksPath = path.join(process.cwd(), 'expansion-packs');
      if (await fs.pathExists(expansionPacksPath)) {
        const expansionDirs = await fs.readdir(expansionPacksPath);
        for (const dir of expansionDirs) {
          const agentsPath = path.join(expansionPacksPath, dir, 'agents');
          if (await fs.pathExists(agentsPath)) {
            const agentFiles = await fs.readdir(agentsPath);
            const mdFiles = agentFiles.filter(f => f.endsWith('.md'));
            diagnostics.expansionPackAgents.found += mdFiles.length;
            
            // Check accessibility
            for (const file of mdFiles) {
              try {
                await fs.access(path.join(agentsPath, file), fs.constants.R_OK);
                diagnostics.expansionPackAgents.accessible++;
              } catch (error) {
                // File not accessible
              }
            }
          }
        }
      }

      // Check output directories
      const kiroAgentsPath = path.join(process.cwd(), '.kiro', 'agents');
      diagnostics.outputDirectories.exists = await fs.pathExists(kiroAgentsPath);
      
      if (diagnostics.outputDirectories.exists) {
        try {
          await fs.access(kiroAgentsPath, fs.constants.W_OK);
          diagnostics.outputDirectories.writable = true;
        } catch (error) {
          diagnostics.outputDirectories.writable = false;
        }
      }

    } catch (error) {
      this.log(`Error generating agent diagnostics: ${error.message}`, 'error');
    }

    return diagnostics;
  }

  /**
   * Calculate conversion success rate
   * @returns {number} - Success rate as percentage
   */
  calculateSuccessRate() {
    const totalAttempts = this.conversionAttempts.size;
    const failures = this.failedConversions.size;
    
    if (totalAttempts === 0) return 0;
    
    return ((totalAttempts - failures) / totalAttempts) * 100;
  }

  /**
   * Enable diagnostic mode for detailed troubleshooting
   */
  enableDiagnosticMode() {
    this.errorHandler.enableDiagnosticMode();
    this.log('Diagnostic mode enabled for agent transformer', 'info');
  }

  /**
   * Disable diagnostic mode
   */
  disableDiagnosticMode() {
    this.errorHandler.disableDiagnosticMode();
    this.log('Diagnostic mode disabled for agent transformer', 'info');
  }

  /**
   * Get conversion statistics
   * @returns {Object} - Conversion statistics
   */
  getConversionStatistics() {
    return {
      totalAttempts: this.conversionAttempts.size,
      failedConversions: this.failedConversions.size,
      successRate: this.calculateSuccessRate(),
      errorStats: this.errorHandler.getErrorStats(),
      conversionAttempts: Object.fromEntries(this.conversionAttempts),
      failedAgents: Array.from(this.failedConversions)
    };
  }

  /**
   * Clear conversion history and error data
   */
  clearConversionHistory() {
    this.conversionAttempts.clear();
    this.failedConversions.clear();
    this.errorHandler.clearErrors();
    this.log('Conversion history cleared', 'info');
  }

  /**
   * Transform BMad agent to Kiro-native agent
   * @param {string} bmadAgentPath - Path to BMad agent file
   * @param {string} kiroOutputPath - Output path for Kiro agent
   * @param {Object} options - Transformation options
   * @returns {Promise<boolean>} - Success status
   */
  async transformAgent(bmadAgentPath, kiroOutputPath, options = {}) {
    const agentId = options.agentId || path.basename(bmadAgentPath, '.md');
    const context = {
      agentId,
      filePath: bmadAgentPath,
      outputPath: kiroOutputPath,
      operation: 'transformation',
      phase: 'agent-transform',
      source: options.source,
      expansionPack: options.expansionPack
    };

    // Start monitoring conversion
    const conversionId = `transform-${agentId}-${Date.now()}`;
    let sessionId = options.sessionId;
    
    if (!sessionId && this.monitor) {
      sessionId = `transform-session-${Date.now()}`;
      this.monitor.startConversionSession(sessionId, {
        type: 'agent_transformation',
        source: options.source || 'unknown',
        agentCount: 1
      });
    }

    if (this.monitor) {
      this.monitor.startConversion(sessionId, conversionId, {
        agentId,
        source: options.source,
        expansionPack: options.expansionPack,
        inputPath: bmadAgentPath,
        outputPath: kiroOutputPath,
        type: 'agent'
      });
    }

    try {
      this.log(`Transforming agent: ${this.getRelativePath(bmadAgentPath)} -> ${this.getRelativePath(kiroOutputPath)}`);
      
      // Track conversion attempt
      const attemptCount = (this.conversionAttempts.get(agentId) || 0) + 1;
      this.conversionAttempts.set(agentId, attemptCount);

      if (this.monitor) {
        this.monitor.logConversionStep(conversionId, 'start_transformation', {
          attempt: attemptCount,
          inputPath: bmadAgentPath,
          outputPath: kiroOutputPath
        });
      }

      const result = await this.transformFile(
        bmadAgentPath,
        kiroOutputPath,
        (content, inputPath) => this.performAgentTransformation(content, inputPath, { 
          ...options, 
          context,
          conversionId,
          sessionId
        })
      );

      if (result) {
        // Remove from failed conversions if it was previously failed
        this.failedConversions.delete(agentId);
        this.log(`Successfully transformed agent: ${agentId}`, 'info');
        
        if (this.monitor) {
          this.monitor.completeConversion(conversionId, {
            success: true,
            agentId,
            outputPath: kiroOutputPath
          });
        }
      } else {
        this.failedConversions.add(agentId);
        const error = new Error('Transformation returned false');
        
        if (this.monitor) {
          this.monitor.completeConversion(conversionId, {
            success: false,
            error: error.message
          });
        }
        
        throw error;
      }

      return result;
    } catch (error) {
      this.failedConversions.add(agentId);
      
      if (this.monitor) {
        this.monitor.completeConversion(conversionId, {
          success: false,
          error: error.message
        });
      }
      
      // Handle the error with our error handler
      const errorResult = await this.errorHandler.handleConversionError(error, context);
      
      // If recovery was successful, retry the transformation
      if (errorResult.recovered && errorResult.recoveryDetails?.success) {
        this.log(`Retrying transformation after recovery for agent: ${agentId}`, 'info');
        
        // Start new conversion for retry
        const retryConversionId = `retry-${conversionId}`;
        if (this.monitor) {
          this.monitor.startConversion(sessionId, retryConversionId, {
            agentId,
            source: options.source,
            expansionPack: options.expansionPack,
            inputPath: bmadAgentPath,
            outputPath: kiroOutputPath,
            type: 'agent',
            isRetry: true
          });
        }
        
        // Update context with recovery details
        const updatedContext = { ...context, ...errorResult.recoveryDetails };
        const updatedOptions = { 
          ...options, 
          context: updatedContext,
          conversionId: retryConversionId,
          sessionId
        };
        
        try {
          const retryResult = await this.transformFile(
            updatedContext.filePath || bmadAgentPath,
            updatedContext.outputPath || kiroOutputPath,
            (content, inputPath) => this.performAgentTransformation(content, inputPath, updatedOptions)
          );
          
          if (this.monitor) {
            this.monitor.completeConversion(retryConversionId, {
              success: retryResult,
              agentId,
              isRetry: true
            });
          }
          
          return retryResult;
        } catch (retryError) {
          this.log(`Retry failed for agent ${agentId}: ${retryError.message}`, 'error');
          
          if (this.monitor) {
            this.monitor.completeConversion(retryConversionId, {
              success: false,
              error: retryError.message,
              isRetry: true
            });
          }
          
          return false;
        }
      }

      this.log(`Transformation failed for agent ${agentId}: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Transform BMad agent specifically for Kiro with expansion pack support
   * @param {string} bmadAgentPath - Path to BMad agent file
   * @param {string} kiroOutputPath - Output path for Kiro agent
   * @param {Object} options - Transformation options
   * @returns {Promise<boolean>} - Success status
   */
  async transformAgentForKiro(bmadAgentPath, kiroOutputPath, options = {}) {
    const agentId = options.agentId || path.basename(bmadAgentPath, '.md');
    const context = {
      agentId,
      filePath: bmadAgentPath,
      outputPath: kiroOutputPath,
      operation: 'kiro-transformation',
      phase: 'kiro-agent-transform',
      source: options.source,
      expansionPack: options.expansionPack,
      transformationType: 'full'
    };

    try {
      this.log(`Transforming agent for Kiro: ${this.getRelativePath(bmadAgentPath)} -> ${this.getRelativePath(kiroOutputPath)}`);

      // Enhanced options for Kiro-specific transformation
      const kiroOptions = {
        ...options,
        enableKiroFeatures: true,
        addExpansionPackSupport: options.expansionPack ? true : false,
        expansionPackId: options.expansionPack,
        enableExpansionPackFeatures: options.enableExpansionPackFeatures || false,
        context
      };

      // Track conversion attempt
      const attemptCount = (this.conversionAttempts.get(agentId) || 0) + 1;
      this.conversionAttempts.set(agentId, attemptCount);

      const result = await this.transformFile(
        bmadAgentPath,
        kiroOutputPath,
        (content, inputPath) => this.performKiroAgentTransformation(content, inputPath, kiroOptions)
      );

      if (result) {
        this.failedConversions.delete(agentId);
        this.log(`Successfully transformed Kiro agent: ${agentId}`, 'info');
      } else {
        this.failedConversions.add(agentId);
        throw new Error('Kiro transformation returned false');
      }

      return result;
    } catch (error) {
      this.failedConversions.add(agentId);
      
      // Handle the error with our error handler
      const errorResult = await this.errorHandler.handleConversionError(error, context);
      
      // If recovery was successful, retry the transformation
      if (errorResult.recovered && errorResult.recoveryDetails?.success) {
        this.log(`Retrying Kiro transformation after recovery for agent: ${agentId}`, 'info');
        
        // Update context and options with recovery details
        const updatedContext = { ...context, ...errorResult.recoveryDetails };
        const updatedOptions = {
          ...options,
          enableKiroFeatures: !updatedContext.skipOptionalFeatures,
          addExpansionPackSupport: options.expansionPack && !updatedContext.skipOptionalFeatures,
          expansionPackId: options.expansionPack,
          enableExpansionPackFeatures: options.enableExpansionPackFeatures && !updatedContext.skipOptionalFeatures,
          context: updatedContext
        };
        
        try {
          return await this.transformFile(
            updatedContext.filePath || bmadAgentPath,
            updatedContext.outputPath || kiroOutputPath,
            (content, inputPath) => this.performKiroAgentTransformation(content, inputPath, updatedOptions)
          );
        } catch (retryError) {
          this.log(`Kiro transformation retry failed for agent ${agentId}: ${retryError.message}`, 'error');
          return false;
        }
      }

      this.log(`Kiro transformation failed for agent ${agentId}: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Parse BMad agent content (handles embedded YAML blocks)
   * @param {string} content - BMad agent content
   * @param {Object} context - Parsing context for error handling
   * @returns {Object} - Parsed front matter and content
   */
  parseBMadAgent(content, context = {}) {
    try {
      // First try standard front matter parsing
      const standardParsed = this.parseYAMLFrontMatter(content);
      if (Object.keys(standardParsed.frontMatter).length > 0) {
        return standardParsed;
      }

      // If no standard front matter, look for embedded YAML block
      const yamlBlockRegex = /```yaml\s*\n([\s\S]*?)\n```/;
      const match = content.match(yamlBlockRegex);

      if (!match) {
        // No YAML found - this might be valid for some agents
        this.log(`No YAML configuration found in agent content`, 'warn');
        return {
          frontMatter: {},
          content: content
        };
      }

      try {
        const yaml = require('js-yaml');
        const frontMatter = yaml.load(match[1]) || {};
        
        // Remove the YAML block from content
        const markdownContent = content.replace(yamlBlockRegex, '').trim();

        return {
          frontMatter,
          content: markdownContent
        };
      } catch (yamlError) {
        // Handle YAML parsing error with error handler
        const errorContext = {
          ...context,
          operation: 'yaml-parsing',
          phase: 'parse-embedded-yaml',
          yamlContent: match[1]
        };
        
        this.errorHandler.handleConversionError(yamlError, errorContext);
        
        // Return content without YAML parsing
        return {
          frontMatter: {},
          content: content,
          yamlError: yamlError.message
        };
      }
    } catch (error) {
      // Handle general parsing error
      const errorContext = {
        ...context,
        operation: 'content-parsing',
        phase: 'parse-bmad-agent'
      };
      
      this.errorHandler.handleConversionError(error, errorContext);
      
      // Return minimal structure to allow processing to continue
      return {
        frontMatter: {},
        content: content || '',
        parseError: error.message
      };
    }
  }

  /**
   * Perform Kiro-specific agent transformation with expansion pack support
   * @param {string} content - Original agent content
   * @param {string} inputPath - Input file path
   * @param {Object} options - Transformation options
   * @returns {string} - Transformed content
   */
  async performKiroAgentTransformation(content, inputPath, options) {
    const context = options.context || {};
    const agentId = context.agentId || path.basename(inputPath, '.md');
    
    try {
      // Parse BMad agent content (handles both front matter and embedded YAML)
      const parseContext = { ...context, operation: 'parsing', phase: 'parse-content' };
      const { frontMatter, content: markdownContent, yamlError, parseError } = this.parseBMadAgent(content, parseContext);

      // Handle parsing errors but continue with available data
      if (yamlError || parseError) {
        this.log(`Continuing transformation despite parsing issues for ${agentId}`, 'warn');
      }

      // Create enhanced front matter for Kiro with expansion pack support
      let kiroFrontMatter;
      try {
        kiroFrontMatter = this.createKiroFrontMatterWithExpansionPack(frontMatter, inputPath, options);
      } catch (frontMatterError) {
        const fmContext = { ...context, operation: 'front-matter-creation', phase: 'create-kiro-front-matter' };
        await this.errorHandler.handleConversionError(frontMatterError, fmContext);
        
        // Use minimal front matter as fallback
        kiroFrontMatter = {
          name: `BMad ${agentId}`,
          role: 'Development Assistant',
          context_providers: ['#File', '#Folder'],
          kiro_integration: {
            version: '1.0.0',
            generated_at: new Date().toISOString(),
            bmad_source: path.basename(inputPath),
            error: 'Fallback front matter due to creation error'
          }
        };
      }

      // Inject context awareness - skip if disabled by recovery
      let contextAwareContent = markdownContent;
      if (!options.context?.skipOptionalFeatures) {
        try {
          contextAwareContent = this.contextInjector.injectAutomaticContextReferences(
            markdownContent, 
            agentId,
            {
              expansionPack: options.expansionPack,
              enableExpansionPackFeatures: options.enableExpansionPackFeatures
            }
          );
        } catch (contextError) {
          const ctxContext = { ...context, operation: 'context-injection', phase: 'inject-context' };
          await this.errorHandler.handleConversionError(contextError, ctxContext);
          // Continue with original content
          contextAwareContent = markdownContent;
        }
      }

      // Add file context integration - skip if disabled by recovery
      let fileContextIntegratedContent = contextAwareContent;
      if (!options.context?.skipFileContextIntegration) {
        try {
          const agentMetadata = {
            id: agentId,
            expansionPack: options.expansionPack,
            frontMatter: frontMatter
          };
          fileContextIntegratedContent = this.fileContextIntegrator.integrateFileContextSystem(
            contextAwareContent,
            agentMetadata,
            {
              enableExpansionPackFeatures: options.enableExpansionPackFeatures
            }
          );
        } catch (fileContextError) {
          const fcContext = { ...context, operation: 'file-context-integration', phase: 'integrate-file-context' };
          await this.errorHandler.handleConversionError(fileContextError, fcContext);
          // Continue without file context integration
          fileContextIntegratedContent = contextAwareContent;
        }
      }

      // Add steering integration - skip if disabled by recovery
      let steeringIntegratedContent = fileContextIntegratedContent;
      if (!options.context?.skipSteeringGeneration) {
        try {
          steeringIntegratedContent = this.addSteeringIntegrationWithExpansionPack(fileContextIntegratedContent, options);
        } catch (steeringError) {
          const steerContext = { ...context, operation: 'steering-integration', phase: 'add-steering' };
          await this.errorHandler.handleConversionError(steeringError, steerContext);
          // Continue without steering integration
          steeringIntegratedContent = fileContextIntegratedContent;
        }
      }

      // Add MCP tool integration - skip if disabled by recovery
      let mcpIntegratedContent = steeringIntegratedContent;
      if (!options.context?.skipMCPIntegration) {
        try {
          mcpIntegratedContent = await this.addMCPToolIntegration(steeringIntegratedContent, agentId, options);
        } catch (mcpError) {
          const mcpContext = { ...context, operation: 'mcp-integration', phase: 'add-mcp-tools' };
          await this.errorHandler.handleConversionError(mcpError, mcpContext);
          // Continue without MCP integration
          mcpIntegratedContent = steeringIntegratedContent;
        }
      }

      // Add expansion pack specific capabilities - skip if disabled
      let expansionEnhancedContent = mcpIntegratedContent;
      if (options.expansionPack && !options.context?.skipOptionalFeatures) {
        try {
          expansionEnhancedContent = this.addExpansionPackCapabilities(mcpIntegratedContent, options);
        } catch (expansionError) {
          const expContext = { ...context, operation: 'expansion-capabilities', phase: 'add-expansion-features' };
          await this.errorHandler.handleConversionError(expansionError, expContext);
          // Continue without expansion pack features
          expansionEnhancedContent = mcpIntegratedContent;
        }
      }

      // Preserve BMad persona while adding Kiro and expansion pack capabilities
      let finalContent;
      try {
        finalContent = this.preserveBMadPersonaWithKiroEnhancements(expansionEnhancedContent, frontMatter, options);
      } catch (personaError) {
        const personaContext = { ...context, operation: 'persona-preservation', phase: 'preserve-bmad-persona' };
        await this.errorHandler.handleConversionError(personaError, personaContext);
        // Use basic content preservation
        finalContent = expansionEnhancedContent;
      }

      // Combine and return
      try {
        return this.combineContent(kiroFrontMatter, finalContent);
      } catch (combineError) {
        const combineContext = { ...context, operation: 'content-combination', phase: 'combine-final-content' };
        await this.errorHandler.handleConversionError(combineError, combineContext);
        
        // Fallback to simple concatenation
        return `---\nname: ${kiroFrontMatter.name || agentId}\n---\n\n${finalContent}`;
      }
    } catch (error) {
      // Handle any unexpected errors
      const errorContext = { ...context, operation: 'kiro-transformation', phase: 'complete-transformation' };
      await this.errorHandler.handleConversionError(error, errorContext);
      throw error;
    }
  }

  /**
   * Perform the actual agent transformation
   * @param {string} content - Original agent content
   * @param {string} inputPath - Input file path
   * @param {Object} options - Transformation options
   * @returns {string} - Transformed content
   */
  async performAgentTransformation(content, inputPath, options) {
    const context = options.context || {};
    const agentId = context.agentId || path.basename(inputPath, '.md');
    
    try {
      // Parse BMad agent content (handles both front matter and embedded YAML)
      const parseContext = { ...context, operation: 'parsing', phase: 'parse-content' };
      const { frontMatter, content: markdownContent, yamlError, parseError } = this.parseBMadAgent(content, parseContext);

      // Handle parsing errors but continue with available data
      if (yamlError || parseError) {
        this.log(`Continuing transformation despite parsing issues for ${agentId}`, 'warn');
      }

      // Create enhanced front matter for Kiro
      let kiroFrontMatter;
      try {
        kiroFrontMatter = this.createKiroFrontMatter(frontMatter, inputPath, options);
      } catch (frontMatterError) {
        const fmContext = { ...context, operation: 'front-matter-creation', phase: 'create-kiro-front-matter' };
        await this.errorHandler.handleConversionError(frontMatterError, fmContext);
        
        // Use minimal front matter as fallback
        kiroFrontMatter = {
          name: `BMad ${agentId}`,
          role: 'Development Assistant',
          context_providers: ['#File', '#Folder'],
          kiro_integration: {
            version: '1.0.0',
            generated_at: new Date().toISOString(),
            bmad_source: path.basename(inputPath),
            error: 'Fallback front matter due to creation error'
          }
        };
      }

      // Inject context awareness - skip if disabled by recovery
      let contextAwareContent = markdownContent;
      if (!options.context?.skipOptionalFeatures) {
        try {
          contextAwareContent = this.contextInjector.injectAutomaticContextReferences(
            markdownContent, 
            agentId,
            {
              expansionPack: options.expansionPack || null,
              enableExpansionPackFeatures: options.enableExpansionPackFeatures || false
            }
          );
        } catch (contextError) {
          const ctxContext = { ...context, operation: 'context-injection', phase: 'inject-context' };
          await this.errorHandler.handleConversionError(contextError, ctxContext);
          // Continue with original content
          contextAwareContent = markdownContent;
        }
      }

      // Add file context integration - skip if disabled by recovery
      let fileContextIntegratedContent = contextAwareContent;
      if (!options.context?.skipFileContextIntegration) {
        try {
          const agentMetadata = {
            id: agentId,
            expansionPack: options.expansionPack || null,
            frontMatter: frontMatter
          };
          fileContextIntegratedContent = this.fileContextIntegrator.integrateFileContextSystem(
            contextAwareContent,
            agentMetadata,
            {
              enableExpansionPackFeatures: options.enableExpansionPackFeatures || false
            }
          );
        } catch (fileContextError) {
          const fcContext = { ...context, operation: 'file-context-integration', phase: 'integrate-file-context' };
          await this.errorHandler.handleConversionError(fileContextError, fcContext);
          // Continue without file context integration
          fileContextIntegratedContent = contextAwareContent;
        }
      }

      // Add steering integration - skip if disabled by recovery
      let steeringIntegratedContent = fileContextIntegratedContent;
      if (!options.context?.skipSteeringGeneration) {
        try {
          steeringIntegratedContent = this.addSteeringIntegration(fileContextIntegratedContent);
        } catch (steeringError) {
          const steerContext = { ...context, operation: 'steering-integration', phase: 'add-steering' };
          await this.errorHandler.handleConversionError(steeringError, steerContext);
          // Continue without steering integration
          steeringIntegratedContent = fileContextIntegratedContent;
        }
      }

      // Add MCP tool integration - skip if disabled by recovery
      let mcpIntegratedContent = steeringIntegratedContent;
      if (!options.context?.skipMCPIntegration) {
        try {
          mcpIntegratedContent = await this.addMCPToolIntegration(steeringIntegratedContent, agentId, options);
        } catch (mcpError) {
          const mcpContext = { ...context, operation: 'mcp-integration', phase: 'add-mcp-tools' };
          await this.errorHandler.handleConversionError(mcpError, mcpContext);
          // Continue without MCP integration
          mcpIntegratedContent = steeringIntegratedContent;
        }
      }

      // Preserve BMad persona while adding Kiro capabilities
      let finalContent;
      try {
        finalContent = this.preserveBMadPersona(mcpIntegratedContent, frontMatter);
      } catch (personaError) {
        const personaContext = { ...context, operation: 'persona-preservation', phase: 'preserve-bmad-persona' };
        await this.errorHandler.handleConversionError(personaError, personaContext);
        // Use basic content preservation
        finalContent = mcpIntegratedContent;
      }

      // Combine and return
      try {
        return this.combineContent(kiroFrontMatter, finalContent);
      } catch (combineError) {
        const combineContext = { ...context, operation: 'content-combination', phase: 'combine-final-content' };
        await this.errorHandler.handleConversionError(combineError, combineContext);
        
        // Fallback to simple concatenation
        return `---\nname: ${kiroFrontMatter.name || agentId}\n---\n\n${finalContent}`;
      }
    } catch (error) {
      // Handle any unexpected errors
      const errorContext = { ...context, operation: 'agent-transformation', phase: 'complete-transformation' };
      await this.errorHandler.handleConversionError(error, errorContext);
      throw error;
    }
  }

  /**
   * Create Kiro-specific front matter
   * @param {Object} originalFrontMatter - Original BMad front matter
   * @param {string} inputPath - Input file path
   * @param {Object} options - Transformation options
   * @returns {Object} - Enhanced front matter
   */
  createKiroFrontMatter(originalFrontMatter, inputPath, options) {
    const agentName = this.extractAgentName(originalFrontMatter, inputPath);
    const role = this.extractAgentRole(originalFrontMatter);

    const kiroFrontMatter = {
      name: agentName,
      role: role,
      context_providers: this.getRelevantContextProviders(originalFrontMatter),
      steering_rules: this.getSteeringRules(originalFrontMatter, options),
      mcp_tools: this.getMCPTools(originalFrontMatter, options),
      bmad_dependencies: this.getBMadDependencies(originalFrontMatter),
      bmad_original: {
        agent: originalFrontMatter.agent,
        persona: originalFrontMatter.persona,
        commands: originalFrontMatter.commands
      }
    };

    // Add Kiro integration metadata
    return this.addKiroMetadata(kiroFrontMatter, {
      bmadSource: path.basename(inputPath),
      agentType: 'bmad-native',
      transformedAt: new Date().toISOString()
    });
  }

  /**
   * Extract agent name from front matter or file path
   * @param {Object} frontMatter - Front matter object
   * @param {string} inputPath - Input file path
   * @returns {string} - Agent name
   */
  extractAgentName(frontMatter, inputPath) {
    // Check for agent.name or agent.title in the YAML structure
    if (frontMatter.agent && frontMatter.agent.name) {
      return `BMad ${frontMatter.agent.title || frontMatter.agent.name}`;
    }
    
    if (frontMatter.name) {
      return `BMad ${frontMatter.name}`;
    }

    const fileName = path.basename(inputPath, '.md');
    
    // Handle specific BMad agent file names
    const agentNameMap = {
      'pm': 'Product Manager',
      'architect': 'Architect', 
      'dev': 'Developer',
      'qa': 'QA Engineer',
      'sm': 'Scrum Master',
      'po': 'Product Owner',
      'analyst': 'Business Analyst',
      'ux-expert': 'UX Expert'
    };
    
    const agentName = agentNameMap[fileName] || fileName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return `BMad ${agentName}`;
  }

  /**
   * Extract agent role from front matter
   * @param {Object} frontMatter - Front matter object
   * @returns {string} - Agent role
   */
  extractAgentRole(frontMatter) {
    // Check for agent.title first
    if (frontMatter.agent && frontMatter.agent.title) {
      return frontMatter.agent.title;
    }
    
    if (frontMatter.role) {
      return frontMatter.role;
    }

    // Infer role from agent.id or common BMad agent patterns
    const agentId = frontMatter.agent && frontMatter.agent.id;
    const roleMap = {
      'pm': 'Product Management',
      'architect': 'Software Architecture', 
      'dev': 'Software Development',
      'qa': 'Quality Assurance',
      'sm': 'Scrum Management',
      'po': 'Product Ownership',
      'analyst': 'Business Analysis',
      'ux-expert': 'User Experience Design'
    };

    if (agentId && roleMap[agentId]) {
      return roleMap[agentId];
    }

    // Fallback to checking name
    for (const [key, value] of Object.entries(roleMap)) {
      if (frontMatter.name && frontMatter.name.toLowerCase().includes(key)) {
        return value;
      }
    }

    return 'Development Support';
  }

  /**
   * Get relevant context providers for the agent
   * @param {Object} frontMatter - Front matter object
   * @returns {Array} - List of context providers
   */
  getRelevantContextProviders(frontMatter) {
    // Default context providers for all agents
    const defaultProviders = ['#File', '#Folder', '#Codebase'];

    // Role-specific context providers
    const roleSpecificProviders = {
      'qa': ['#Problems', '#Terminal', '#Git Diff'],
      'dev': ['#Problems', '#Terminal', '#Git Diff'],
      'architect': ['#Codebase'],
      'pm': ['#Folder'],
      'analyst': ['#Codebase', '#Folder']
    };

    const agentType = this.getAgentType(frontMatter);
    const specificProviders = roleSpecificProviders[agentType] || [];

    return [...new Set([...defaultProviders, ...specificProviders])];
  }

  /**
   * Get agent type from front matter
   * @param {Object} frontMatter - Front matter object
   * @returns {string} - Agent type
   */
  getAgentType(frontMatter) {
    // Check agent.id first (most reliable)
    if (frontMatter.agent && frontMatter.agent.id) {
      return frontMatter.agent.id;
    }
    
    if (!frontMatter.name) return 'generic';

    const name = frontMatter.name.toLowerCase();
    if (name.includes('qa')) return 'qa';
    if (name.includes('dev')) return 'dev';
    if (name.includes('architect')) return 'architect';
    if (name.includes('pm')) return 'pm';
    if (name.includes('analyst')) return 'analyst';
    
    return 'generic';
  }

  /**
   * Get steering rules for the agent
   * @param {Object} frontMatter - Front matter object
   * @param {Object} options - Transformation options
   * @returns {Array} - List of steering rule files
   */
  getSteeringRules(frontMatter, options) {
    const defaultRules = ['product.md', 'tech.md', 'structure.md'];
    const customRules = options.steeringRules || [];
    
    return [...new Set([...defaultRules, ...customRules])];
  }

  /**
   * Get MCP tools for the agent
   * @param {Object} frontMatter - Front matter object
   * @param {Object} options - Transformation options
   * @returns {Array} - List of MCP tools
   */
  getMCPTools(frontMatter, options) {
    const agentType = this.getAgentType(frontMatter);
    
    // Use MCP integrator's tool mappings for more sophisticated mapping
    const toolMap = this.mcpIntegrator.mcpToolMappings;
    const relevantTools = [];
    
    // Find tools that are mapped to this agent type
    for (const [toolName, agentTypes] of Object.entries(toolMap)) {
      if (agentTypes.includes(agentType)) {
        relevantTools.push(toolName);
      }
    }
    
    // Fallback to default tools if no specific mapping found
    const defaultTools = relevantTools.length > 0 ? relevantTools : ['web-search'];
    const customTools = options.mcpTools || [];

    return [...new Set([...defaultTools, ...customTools])];
  }

  /**
   * Get BMad dependencies from front matter
   * @param {Object} frontMatter - Front matter object
   * @returns {Array} - List of BMad dependencies
   */
  getBMadDependencies(frontMatter) {
    const dependencies = [];

    if (frontMatter.dependencies) {
      // Handle BMad dependencies structure (object with tasks, templates, etc.)
      if (typeof frontMatter.dependencies === 'object') {
        Object.values(frontMatter.dependencies).forEach(depArray => {
          if (Array.isArray(depArray)) {
            dependencies.push(...depArray);
          }
        });
      } else if (Array.isArray(frontMatter.dependencies)) {
        dependencies.push(...frontMatter.dependencies);
      }
    }

    // Add common BMad dependencies based on agent type
    const commonDeps = [
      'common/tasks/create-doc.md',
      'common/utils/workflow-management.md'
    ];

    return [...new Set([...dependencies, ...commonDeps])];
  }



  /**
   * Add steering integration to agent content
   * @param {string} content - Content with context awareness
   * @returns {string} - Content with steering integration
   */
  addSteeringIntegration(content) {
    const steeringNote = `
## Steering Rules Integration

I automatically apply project-specific conventions and technical preferences from your Kiro steering rules:
- **product.md**: Product and business context
- **tech.md**: Technical stack and preferences  
- **structure.md**: Project structure and conventions

These rules ensure consistency across all my recommendations and align with your project's established patterns.

`;

    // Add steering section before any existing "Capabilities" or similar section
    const capabilitiesIndex = content.toLowerCase().indexOf('## capabilities');
    if (capabilitiesIndex !== -1) {
      return content.slice(0, capabilitiesIndex) + steeringNote + content.slice(capabilitiesIndex);
    }

    // Otherwise append to the end
    return content + steeringNote;
  }

  /**
   * Add MCP tool integration to agent content
   * @param {string} content - Content to enhance
   * @param {string} agentId - Agent identifier
   * @param {Object} options - Transformation options
   * @returns {Promise<string>} - Content with MCP integration
   */
  async addMCPToolIntegration(content, agentId, options) {
    try {
      // Skip MCP integration if disabled
      if (options.disableMCP) {
        return content;
      }

      // Discover available MCP tools from Kiro workspace
      const kiroPath = options.kiroPath || process.cwd();
      const availableTools = await this.mcpIntegrator.discoverAvailableMCPTools(kiroPath);
      
      // Get configuration recommendations regardless of available tools
      const recommendations = this.mcpIntegrator.addMCPConfigurationRecommendations(agentId, availableTools);
      
      if (availableTools.length === 0) {
        this.log('No MCP tools discovered, adding setup guidance');
        return this.addMCPSetupGuidance(content, agentId, recommendations);
      }

      // Map tools to agent
      const mappedTools = this.mcpIntegrator.mapAgentToMCPTools(agentId, availableTools);
      
      if (mappedTools.length === 0) {
        this.log(`No relevant MCP tools found for ${agentId} agent, adding recommendations`);
        return this.addMCPSetupGuidance(content, agentId, recommendations);
      }

      // Add MCP tools section to content
      let mcpEnhancedContent = this.mcpIntegrator.addAutomaticMCPUsage(content, mappedTools);
      
      // Add recommendations for missing tools if any
      if (recommendations.missingTools.length > 0) {
        mcpEnhancedContent = this.addMCPRecommendations(mcpEnhancedContent, recommendations);
      }
      
      this.log(`Added ${mappedTools.length} MCP tools to ${agentId} agent`);
      return mcpEnhancedContent;
      
    } catch (error) {
      this.log(`Error adding MCP integration: ${error.message}`, 'error');
      return content; // Return original content on error
    }
  }

  /**
   * Preserve BMad persona while adding Kiro capabilities
   * @param {string} content - Content with Kiro enhancements
   * @param {Object} originalFrontMatter - Original front matter
   * @returns {string} - Final content preserving BMad identity
   */
  preserveBMadPersona(content, originalFrontMatter) {
    // Get agent details from original BMad structure
    const agent = originalFrontMatter.agent || {};
    const persona = originalFrontMatter.persona || {};
    const commands = originalFrontMatter.commands || [];
    
    const agentName = agent.name || 'Agent';
    const agentTitle = agent.title || 'Assistant';
    const specialization = this.getAgentSpecialization(originalFrontMatter);
    
    // Create comprehensive BMad persona introduction
    const bmadIntro = this.createBMadIntroduction(agent, persona, specialization);
    
    // Create BMad capabilities section
    const bmadCapabilities = this.createBMadCapabilities(persona, commands);
    
    // Create BMad workflow section
    const bmadWorkflow = this.createBMadWorkflow(originalFrontMatter);

    // Remove the original activation notice and YAML block since we're transforming to Kiro format
    const cleanedContent = content
      .replace(/ACTIVATION-NOTICE:.*?(?=\n#|\n\n|$)/s, '')
      .replace(/CRITICAL:.*?(?=\n#|\n\n|$)/s, '')
      .replace(/## COMPLETE AGENT DEFINITION FOLLOWS.*?```yaml[\s\S]*?```/s, '')
      .replace(/^# \w+\s*$/m, '') // Remove the original heading like "# pm"
      .trim();

    // Combine all sections
    return [
      bmadIntro,
      cleanedContent,
      bmadCapabilities,
      bmadWorkflow
    ].filter(section => section.trim()).join('\n\n');
  }

  /**
   * Create BMad agent introduction preserving original personality
   * @param {Object} agent - Agent configuration
   * @param {Object} persona - Persona configuration
   * @param {string} specialization - Agent specialization
   * @returns {string} - BMad introduction
   */
  createBMadIntroduction(agent, persona, specialization) {
    const name = agent.name || 'Agent';
    const title = agent.title || 'Assistant';
    const role = persona.role || title;
    const style = persona.style || 'professional and helpful';
    const identity = persona.identity || `${title} specialized in project support`;

    return `I am **${name}**, your BMad ${title}, bringing ${role.toLowerCase()} expertise to your Kiro IDE environment.

**My Identity**: ${identity}

**My Style**: ${style}

**My Specialization**: ${specialization}

**Enhanced with Kiro**: I maintain my BMad Method expertise while leveraging Kiro's context awareness, steering rules, and MCP integrations to provide more targeted and effective assistance.`;
  }

  /**
   * Create BMad capabilities section
   * @param {Object} persona - Persona configuration
   * @param {Array} commands - Available commands
   * @returns {string} - BMad capabilities section
   */
  createBMadCapabilities(persona, commands) {
    let capabilitiesSection = '## My BMad Method Capabilities\n\n';
    
    // Add core principles if available
    if (persona.core_principles && Array.isArray(persona.core_principles)) {
      capabilitiesSection += '**Core Principles I Follow**:\n';
      persona.core_principles.forEach(principle => {
        capabilitiesSection += `- ${principle}\n`;
      });
      capabilitiesSection += '\n';
    }

    // Add focus area
    if (persona.focus) {
      capabilitiesSection += `**Primary Focus**: ${persona.focus}\n\n`;
    }

    // Add available commands
    if (commands && commands.length > 0) {
      capabilitiesSection += '**Available BMad Commands**:\n';
      commands.forEach(cmd => {
        if (typeof cmd === 'object') {
          const [cmdName, cmdDesc] = Object.entries(cmd)[0];
          capabilitiesSection += `- \`*${cmdName}\`: ${cmdDesc}\n`;
        }
      });
      capabilitiesSection += '\n';
    }

    return capabilitiesSection;
  }

  /**
   * Create BMad workflow section
   * @param {Object} originalFrontMatter - Original front matter
   * @returns {string} - BMad workflow section
   */
  createBMadWorkflow(originalFrontMatter) {
    const agent = originalFrontMatter.agent || {};
    
    let workflowSection = '## How I Work with You\n\n';
    
    // Add when to use guidance
    if (agent.whenToUse) {
      workflowSection += `**When to engage me**: ${agent.whenToUse}\n\n`;
    }

    workflowSection += `**My approach**:
1. I leverage both BMad Method structured workflows and Kiro's real-time context
2. I maintain my specialized expertise while adapting to your current project state
3. I follow BMad's systematic approach enhanced with Kiro's intelligent context injection
4. I preserve the quality and rigor of BMad Method while being more responsive to your immediate needs

**Getting started**: Use \`*help\` to see my available commands, or simply describe what you'd like to accomplish and I'll guide you through the appropriate BMad Method workflow.`;

    return workflowSection;
  }

  /**
   * Get agent specialization description
   * @param {Object} frontMatter - Front matter object
   * @returns {string} - Specialization description
   */
  getAgentSpecialization(frontMatter) {
    const specializationMap = {
      'pm': 'creating comprehensive Product Requirements Documents and managing product planning workflows',
      'architect': 'designing software architecture and technical decision-making',
      'dev': 'software development and implementation guidance',
      'qa': 'quality assurance, testing strategies, and code review',
      'sm': 'scrum management and agile workflow coordination',
      'po': 'product ownership and stakeholder management',
      'analyst': 'business analysis and requirements gathering',
      'ux-expert': 'user experience design and usability optimization'
    };

    const agentType = this.getAgentType(frontMatter);
    return specializationMap[agentType] || 'development support and project guidance';
  }
  /**
   * Create Kiro-specific front matter with expansion pack support
   * @param {Object} originalFrontMatter - Original BMad front matter
   * @param {string} inputPath - Input file path
   * @param {Object} options - Transformation options
   * @returns {Object} - Enhanced front matter with expansion pack support
   */
  createKiroFrontMatterWithExpansionPack(originalFrontMatter, inputPath, options) {
    const baseFrontMatter = this.createKiroFrontMatter(originalFrontMatter, inputPath, options);
    
    if (options.expansionPack) {
      // Add expansion pack specific metadata
      baseFrontMatter.expansion_pack = {
        id: options.expansionPack,
        enabled: true,
        features: options.enableExpansionPackFeatures ? ['templates', 'workflows', 'hooks'] : []
      };
      
      // Add expansion pack specific steering rules
      const expansionSteeringRules = [`${options.expansionPack}.md`];
      baseFrontMatter.steering_rules = [...new Set([...baseFrontMatter.steering_rules, ...expansionSteeringRules])];
      
      // Add expansion pack specific MCP tools
      const expansionMCPTools = this.getExpansionPackMCPTools(options.expansionPack);
      baseFrontMatter.mcp_tools = [...new Set([...baseFrontMatter.mcp_tools, ...expansionMCPTools])];
    }
    
    return baseFrontMatter;
  }

  /**
   * Add steering integration with expansion pack rules
   * @param {string} content - Content with context awareness
   * @param {Object} options - Transformation options
   * @returns {string} - Content with enhanced steering integration
   */
  addSteeringIntegrationWithExpansionPack(content, options) {
    // Generate steering files for this agent
    this.generateAgentSteeringFiles(options.agentId || 'unknown', options.expansionPack, options);
    
    let steeringNote = `
## Steering Rules Integration

I automatically apply project-specific conventions and technical preferences from your Kiro steering rules:
- **bmad-method.md**: BMad Method core principles and structured approach
- **product.md**: Product and business context
- **tech.md**: Technical stack and preferences  
- **structure.md**: Project structure and conventions`;

    if (options.expansionPack) {
      steeringNote += `
- **${options.expansionPack}.md**: ${options.expansionPack} domain-specific conventions and best practices`;
    }

    // Add agent-specific steering file reference
    const agentId = options.agentId || 'unknown';
    steeringNote += `
- **bmad-${agentId}.md**: Agent-specific guidance and capabilities`;

    steeringNote += `

### Steering Rule Application
When providing guidance, I will:
1. Reference relevant steering rules for consistency
2. Apply project-specific conventions and standards
3. Ensure recommendations align with established practices
4. Adapt to your project's specific requirements and constraints`;

    // Add expansion pack specific application notes
    if (options.expansionPack) {
      steeringNote += `
5. Apply ${options.expansionPack} domain expertise and specialized knowledge
6. Integrate with ${options.expansionPack} tooling and workflow patterns`;
    }

    steeringNote += `

### Fallback Activation
If native agent activation fails, I can be activated through steering rules:
1. Modify \`.kiro/steering/bmad-${agentId}.md\` and set inclusion to "always"
2. Include specific instructions for the task at hand
3. Reference my capabilities and expertise in your prompts
4. Use manual steering activation as needed

These rules ensure consistency across all my recommendations and align with your project's established patterns.

`;

    // Add steering section before any existing "Capabilities" or similar section
    const capabilitiesIndex = content.toLowerCase().indexOf('## capabilities');
    if (capabilitiesIndex !== -1) {
      return content.slice(0, capabilitiesIndex) + steeringNote + content.slice(capabilitiesIndex);
    }

    // Otherwise append to the end
    return content + steeringNote;
  }

  /**
   * Add expansion pack specific capabilities
   * @param {string} content - Content with steering integration
   * @param {Object} options - Transformation options
   * @returns {string} - Content with expansion pack capabilities
   */
  addExpansionPackCapabilities(content, options) {
    if (!options.expansionPack) {
      return content;
    }

    const expansionCapabilities = this.generateExpansionPackCapabilities(options.expansionPack);
    
    // Add expansion pack section before workflow section
    const workflowIndex = content.toLowerCase().indexOf('## how i work');
    if (workflowIndex !== -1) {
      return content.slice(0, workflowIndex) + expansionCapabilities + '\n\n' + content.slice(workflowIndex);
    }

    // Otherwise append before the end
    return content + '\n\n' + expansionCapabilities;
  }

  /**
   * Preserve BMad persona with Kiro and expansion pack enhancements
   * @param {string} content - Content with all enhancements
   * @param {Object} originalFrontMatter - Original front matter
   * @param {Object} options - Transformation options
   * @returns {string} - Final content with all enhancements
   */
  preserveBMadPersonaWithKiroEnhancements(content, originalFrontMatter, options) {
    // Start with base BMad persona preservation
    let enhancedContent = this.preserveBMadPersona(content, originalFrontMatter);
    
    // Add expansion pack specific persona enhancements
    if (options.expansionPack) {
      const expansionPersona = this.createExpansionPackPersonaEnhancement(originalFrontMatter, options);
      
      // Insert expansion pack persona after the main introduction
      const firstSectionIndex = enhancedContent.indexOf('\n\n');
      if (firstSectionIndex !== -1) {
        enhancedContent = enhancedContent.slice(0, firstSectionIndex) + 
                         '\n\n' + expansionPersona + 
                         enhancedContent.slice(firstSectionIndex);
      } else {
        enhancedContent = expansionPersona + '\n\n' + enhancedContent;
      }
    }
    
    return enhancedContent;
  }

  /**
   * Generate expansion pack specific capabilities
   * @param {string} expansionPackId - Expansion pack ID
   * @returns {string} - Expansion pack capabilities section
   */
  generateExpansionPackCapabilities(expansionPackId) {
    const capabilityMap = {
      'bmad-2d-phaser-game-dev': `## Game Development Expertise

**Phaser.js Game Development**:
- 2D game architecture and scene management
- Sprite animation and physics integration
- Game state management and progression systems
- Asset optimization and loading strategies

**Game Design Patterns**:
- Entity-Component-System (ECS) architecture
- Game loop optimization and performance tuning
- Input handling and user interaction design
- Audio integration and sound effect management`,

      'bmad-2d-unity-game-dev': `## Unity Game Development Expertise

**Unity 2D Development**:
- Unity scene management and prefab systems
- 2D physics and collision detection
- Animation controllers and state machines
- Unity asset pipeline and optimization

**Game Development Workflow**:
- Unity project structure and organization
- Component-based architecture patterns
- Unity editor scripting and custom tools
- Build pipeline and platform deployment`,

      'bmad-infrastructure-devops': `## Infrastructure & DevOps Expertise

**Infrastructure as Code**:
- Terraform and CloudFormation templates
- Kubernetes deployment and orchestration
- Docker containerization strategies
- CI/CD pipeline design and implementation

**DevOps Best Practices**:
- Infrastructure monitoring and alerting
- Security scanning and compliance
- Automated testing and deployment
- Cloud platform optimization (AWS, GCP, Azure)`
    };

    return capabilityMap[expansionPackId] || `## ${expansionPackId} Domain Expertise

**Specialized Knowledge**:
- Domain-specific patterns and best practices
- Industry-standard tools and workflows
- Performance optimization techniques
- Quality assurance and testing strategies`;
  }

  /**
   * Create expansion pack persona enhancement
   * @param {Object} originalFrontMatter - Original front matter
   * @param {Object} options - Transformation options
   * @returns {string} - Expansion pack persona enhancement
   */
  createExpansionPackPersonaEnhancement(originalFrontMatter, options) {
    const expansionPackId = options.expansionPack;
    const domainMap = {
      'bmad-2d-phaser-game-dev': 'Phaser.js 2D game development',
      'bmad-2d-unity-game-dev': 'Unity 2D game development',
      'bmad-infrastructure-devops': 'Infrastructure and DevOps'
    };

    const domain = domainMap[expansionPackId] || expansionPackId.replace(/-/g, ' ');

    return `**Enhanced with ${domain}**: I bring specialized expertise in ${domain} while maintaining my core BMad Method approach. I understand domain-specific patterns, tools, and best practices that I seamlessly integrate with BMad's structured workflows.`;
  }

  /**
   * Get expansion pack specific MCP tools
   * @param {string} expansionPackId - Expansion pack ID
   * @returns {Array} - List of MCP tools for the expansion pack
   */
  getExpansionPackMCPTools(expansionPackId) {
    const toolMap = {
      'bmad-2d-phaser-game-dev': ['web-search', 'documentation', 'api-testing'],
      'bmad-2d-unity-game-dev': ['web-search', 'documentation', 'file-manager'],
      'bmad-infrastructure-devops': ['web-search', 'api-testing', 'ssh-client', 'kubernetes']
    };

    return toolMap[expansionPackId] || ['web-search', 'documentation'];
  }

  /**
   * Add MCP setup guidance when no tools are available
   * @param {string} content - Agent content
   * @param {string} agentId - Agent identifier
   * @param {Object} recommendations - MCP recommendations
   * @returns {string} - Content with setup guidance
   */
  addMCPSetupGuidance(content, agentId, recommendations) {
    const guidanceSection = `## MCP Tools Setup

I can be enhanced with external tools through Kiro's MCP (Model Context Protocol) integration. Currently, no MCP tools are configured for your workspace.

### Recommended Tools for ${agentId.charAt(0).toUpperCase() + agentId.slice(1)} Agent

${recommendations.priority.map(tool => 
  `- **${tool.name}** (Priority: ${tool.priority}/10): ${this.getToolBenefit(tool.name, agentId)}`
).join('\n')}

### Quick Setup

To enable these tools, add them to your \`.kiro/settings/mcp.json\` configuration file. Use the command palette in Kiro and search for "MCP" to find setup commands and documentation.

Once configured, I'll automatically use these tools to provide enhanced assistance for your ${agentId} workflows.

`;

    // Add guidance section before any existing "Capabilities" or similar section
    const capabilitiesIndex = content.toLowerCase().indexOf('## capabilities');
    if (capabilitiesIndex !== -1) {
      return content.slice(0, capabilitiesIndex) + guidanceSection + content.slice(capabilitiesIndex);
    }

    // Otherwise append to the end
    return content + guidanceSection;
  }

  /**
   * Add MCP recommendations for missing tools
   * @param {string} content - Agent content
   * @param {Object} recommendations - MCP recommendations
   * @returns {string} - Content with recommendations
   */
  addMCPRecommendations(content, recommendations) {
    if (recommendations.missingTools.length === 0) {
      return content;
    }

    const recommendationsSection = `

### Additional Recommended Tools

The following tools would further enhance my capabilities:

${recommendations.priority.map(tool => 
  `- **${tool.name}**: ${this.getToolBenefit(tool.name, recommendations.agentType)}`
).join('\n')}

These tools can be added to your \`.kiro/settings/mcp.json\` configuration file.

`;

    // Add after the existing MCP tools section
    const mcpSectionMatch = content.match(/(## Available MCP Tools[\s\S]*?)(\n## |$)/);
    if (mcpSectionMatch) {
      const beforeNext = mcpSectionMatch[2] || '';
      return content.replace(mcpSectionMatch[0], mcpSectionMatch[1] + recommendationsSection + beforeNext);
    }

    return content + recommendationsSection;
  }

  /**
   * Get benefit description for a tool
   * @param {string} toolName - Name of the tool
   * @param {string} agentType - Type of agent
   * @returns {string} - Benefit description
   */
  getToolBenefit(toolName, agentType) {
    const benefits = {
      'web-search': {
        'analyst': 'Real-time market research and competitive analysis',
        'pm': 'Market validation and requirement research',
        'architect': 'Technology research and best practices lookup',
        'dev': 'Technical documentation and solution research',
        'qa': 'Bug research and testing methodology lookup',
        'sm': 'Project management best practices and methodology research'
      },
      'api-testing': {
        'analyst': 'API analysis for competitive research',
        'pm': 'API requirement validation and testing',
        'architect': 'API design validation and testing',
        'dev': 'Automated endpoint testing and validation',
        'qa': 'Comprehensive API testing and quality assurance',
        'sm': 'API integration status monitoring'
      },
      'documentation': {
        'analyst': 'Automated research report generation',
        'pm': 'PRD and specification document creation',
        'architect': 'Architecture documentation and spec generation',
        'dev': 'Code documentation and API spec creation',
        'qa': 'Test documentation and quality reports',
        'sm': 'Project documentation and status reports'
      },
      'github': {
        'analyst': 'Repository analysis and competitive intelligence',
        'pm': 'Project tracking and issue management',
        'architect': 'Architecture review and code analysis',
        'dev': 'Repository management and code collaboration',
        'qa': 'Issue tracking and quality monitoring',
        'sm': 'Sprint planning and team coordination'
      },
      'aws-docs': {
        'analyst': 'Cloud service analysis and research',
        'pm': 'Cloud solution planning and requirements',
        'architect': 'Cloud architecture guidance and best practices',
        'dev': 'AWS service integration and development',
        'qa': 'Cloud testing and monitoring strategies',
        'sm': 'Cloud project planning and resource management'
      }
    };

    const toolBenefits = benefits[toolName];
    if (toolBenefits && toolBenefits[agentType]) {
      return toolBenefits[agentType];
    }

    return `Enhanced ${toolName} capabilities for ${agentType} workflows`;
  }

  /**
   * Generate steering files for converted agents using comprehensive steering system
   * @param {string} agentId - Agent identifier
   * @param {string} expansionPack - Expansion pack name (optional)
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateAgentSteeringFiles(agentId, expansionPack, options = {}) {
    try {
      // Use the comprehensive steering system integration
      const SteeringSystemIntegration = require('./steering-system-integration');
      const kiroPath = options.kiroPath || options.context?.kiroPath || process.cwd();
      const steeringSystem = new SteeringSystemIntegration({
        verbose: this.verbose,
        kiroPath: kiroPath,
        enableFallbackActivation: true,
        generateExpansionPackRules: true
      });

      // Create agent metadata for steering generation
      const agentMetadata = {
        id: agentId,
        name: this.generateAgentDisplayName(agentId),
        persona: {
          role: this.getAgentRole(agentId),
          focus: this.getAgentFocus(agentId),
          style: 'Professional and helpful',
          core_principles: this.getAgentCorePrinciples(agentId)
        },
        commands: this.getAgentCommands(agentId),
        dependencies: this.getAgentDependencies(agentId),
        expansionPack: expansionPack,
        source: options.context?.source || 'bmad-core'
      };

      // Generate core BMad steering rules first (if not already generated)
      await steeringSystem.generateCoreBMadSteeringRules();

      // Generate steering files for this specific agent
      await steeringSystem.generateAgentSpecificSteeringFile(agentMetadata, options);

      // Generate expansion pack steering if applicable
      if (expansionPack) {
        await steeringSystem.generateExpansionPackSteeringFile(expansionPack, [agentMetadata]);
      }

      // Enable fallback activation
      await steeringSystem.enableFallbackActivation(agentMetadata);

      // Add BMad-specific context
      await steeringSystem.addBMadSpecificContext(agentId, {
        workflow: 'BMad Method structured development',
        phase: 'Agent conversion and integration',
        dependencies: ['bmad-method.md', 'tech-preferences.md'],
        qualityGates: ['Code quality', 'Documentation', 'Testing'],
        teamContext: 'Kiro IDE integration with BMad Method'
      });

      this.log(`Generated comprehensive steering files for agent: ${agentId}`, 'info');
    } catch (error) {
      this.log(`Error generating steering files for ${agentId}: ${error.message}`, 'error');
    }
  }

  /**
   * Get agent commands for steering generation
   * @param {string} agentId - Agent identifier
   * @returns {Array} - List of agent commands
   */
  getAgentCommands(agentId) {
    const commandMap = {
      'pm': [
        { name: 'create-prd', description: 'Create Product Requirements Document' },
        { name: 'analyze-requirements', description: 'Analyze and validate requirements' },
        { name: 'prioritize-features', description: 'Prioritize product features' },
        { name: 'stakeholder-review', description: 'Facilitate stakeholder reviews' }
      ],
      'architect': [
        { name: 'design-system', description: 'Design system architecture' },
        { name: 'review-architecture', description: 'Review architectural decisions' },
        { name: 'evaluate-tech-stack', description: 'Evaluate technology choices' },
        { name: 'create-adr', description: 'Create Architecture Decision Record' }
      ],
      'dev': [
        { name: 'implement-feature', description: 'Implement feature code' },
        { name: 'review-code', description: 'Review code changes' },
        { name: 'debug-issue', description: 'Debug and fix issues' },
        { name: 'optimize-performance', description: 'Optimize code performance' }
      ],
      'qa': [
        { name: 'create-test-plan', description: 'Create comprehensive test plan' },
        { name: 'execute-tests', description: 'Execute test cases' },
        { name: 'report-bugs', description: 'Report and track bugs' },
        { name: 'validate-quality', description: 'Validate quality metrics' }
      ]
    };
    
    return commandMap[agentId] || [
      { name: 'assist', description: 'Provide general development assistance' },
      { name: 'review', description: 'Review work and provide feedback' },
      { name: 'guide', description: 'Provide guidance and best practices' }
    ];
  }

  /**
   * Get agent dependencies for steering generation
   * @param {string} agentId - Agent identifier
   * @returns {Object} - Agent dependencies
   */
  getAgentDependencies(agentId) {
    const dependencyMap = {
      'pm': {
        tasks: ['create-prd', 'analyze-requirements', 'stakeholder-review'],
        templates: ['prd-tmpl', 'project-brief-tmpl'],
        checklists: ['pm-checklist', 'story-draft-checklist'],
        data: ['bmad-kb', 'technical-preferences']
      },
      'architect': {
        tasks: ['design-system', 'review-architecture'],
        templates: ['architecture-tmpl', 'fullstack-architecture-tmpl'],
        checklists: ['architect-checklist', 'change-checklist'],
        data: ['bmad-kb', 'technical-preferences']
      },
      'dev': {
        tasks: ['implement-feature', 'review-code'],
        templates: ['story-tmpl'],
        checklists: ['story-dod-checklist'],
        data: ['bmad-kb', 'technical-preferences']
      },
      'qa': {
        tasks: ['create-test-plan', 'execute-tests'],
        templates: ['story-tmpl'],
        checklists: ['story-dod-checklist'],
        data: ['bmad-kb']
      }
    };
    
    return dependencyMap[agentId] || {
      tasks: [],
      templates: [],
      checklists: [],
      data: ['bmad-kb']
    };
  }

  /**
   * Generate agent-specific steering file
   * @param {string} agentId - Agent identifier
   * @param {string} expansionPack - Expansion pack name (optional)
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateAgentSpecificSteeringFile(agentId, expansionPack, options = {}) {
    const fs = require('fs-extra');
    const path = require('path');
    
    const steeringDir = path.join(process.cwd(), '.kiro', 'steering');
    await fs.ensureDir(steeringDir);
    
    const steeringFilePath = path.join(steeringDir, `bmad-${agentId}.md`);
    
    // Don't overwrite existing files unless explicitly requested
    if (await fs.pathExists(steeringFilePath) && !options.overwrite) {
      return;
    }

    const agentMetadata = this.getAgentMetadataForSteering(agentId, options);
    const steeringContent = this.generateAgentSteeringContent(agentMetadata, expansionPack);
    
    await fs.writeFile(steeringFilePath, steeringContent);
    this.log(`Generated agent-specific steering file: ${steeringFilePath}`, 'info');
  }

  /**
   * Generate expansion pack steering file
   * @param {string} expansionPack - Expansion pack name
   * @param {string} agentId - Agent identifier
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateExpansionPackSteeringFile(expansionPack, agentId, options = {}) {
    const fs = require('fs-extra');
    const path = require('path');
    
    const steeringDir = path.join(process.cwd(), '.kiro', 'steering');
    await fs.ensureDir(steeringDir);
    
    const steeringFilePath = path.join(steeringDir, `${expansionPack}.md`);
    
    // Don't overwrite existing files unless explicitly requested
    if (await fs.pathExists(steeringFilePath) && !options.overwrite) {
      return;
    }

    const expansionSteeringContent = this.generateExpansionPackSteeringContent(expansionPack, agentId);
    
    await fs.writeFile(steeringFilePath, expansionSteeringContent);
    this.log(`Generated expansion pack steering file: ${steeringFilePath}`, 'info');
  }

  /**
   * Get agent metadata for steering generation
   * @param {string} agentId - Agent identifier
   * @param {Object} options - Options containing context and metadata
   * @returns {Object} - Agent metadata
   */
  getAgentMetadataForSteering(agentId, options = {}) {
    // Extract metadata from options context or use defaults
    const context = options.context || {};
    
    return {
      id: agentId,
      name: this.generateAgentDisplayName(agentId),
      role: this.getAgentRole(agentId),
      focus: this.getAgentFocus(agentId),
      capabilities: this.getAgentCapabilities(agentId),
      contextRequirements: this.getAgentContextRequirements(agentId),
      expansionPack: options.expansionPack,
      source: context.source || 'bmad-core'
    };
  }

  /**
   * Generate agent steering content
   * @param {Object} agentMetadata - Agent metadata
   * @param {string} expansionPack - Expansion pack name (optional)
   * @returns {string} - Steering file content
   */
  generateAgentSteeringContent(agentMetadata, expansionPack) {
    const { id, name, role, focus, capabilities, contextRequirements } = agentMetadata;
    
    let content = `---
inclusion: manual
agentFilter: "${id}"
---

# ${name} Agent Steering Rules

## Agent Identity
- **Role**: ${role}
- **Focus**: ${focus}
- **Activation**: Use when ${this.getAgentActivationGuidance(id)}

## Core Principles
${this.getAgentCorePrinciples(id).map(p => `- ${p}`).join('\n')}

## Capabilities
${capabilities.map(c => `- ${c}`).join('\n')}

## Context Requirements
${contextRequirements.map(c => `- ${c}`).join('\n')}

## BMad Method Integration
- Follow BMad's structured development approach
- Maintain agent specialization and expertise
- Use spec-driven development for complex features
- Apply quality assurance processes consistently

## Kiro Integration
- Leverage Kiro's context system (#File, #Folder, #Codebase, etc.)
- Use steering rules for consistent guidance
- Integrate with MCP tools when available
- Respect project-specific conventions and standards`;

    // Add expansion pack specific content
    if (expansionPack) {
      content += `

## ${expansionPack} Domain Expertise
${this.getExpansionPackDomainGuidance(expansionPack, id)}

## Domain-Specific Patterns
${this.getExpansionPackPatterns(expansionPack).map(p => `- ${p}`).join('\n')}`;
    }

    content += `

## Fallback Activation Instructions
If native agent activation fails, you can activate this agent by:
1. Creating or modifying this steering file
2. Setting inclusion to "always" or "fileMatch" with appropriate pattern
3. Including specific instructions for the agent's behavior
4. Referencing the agent's capabilities and expertise in your prompts

## Quality Standards
- Maintain high code quality and consistency
- Follow established patterns and conventions
- Provide comprehensive documentation
- Include testing considerations in recommendations
- Ensure accessibility compliance where applicable
`;

    return content;
  }

  /**
   * Generate expansion pack steering content
   * @param {string} expansionPack - Expansion pack name
   * @param {string} agentId - Agent identifier
   * @returns {string} - Expansion pack steering content
   */
  generateExpansionPackSteeringContent(expansionPack, agentId) {
    const domainInfo = this.getExpansionPackInfo(expansionPack);
    
    return `---
inclusion: always
projectType: "${expansionPack}"
---

# ${domainInfo.displayName} Domain Steering Rules

## Domain Overview
${domainInfo.description}

## Core Technologies
${domainInfo.technologies.map(t => `- ${t}`).join('\n')}

## Development Patterns
${domainInfo.patterns.map(p => `- ${p}`).join('\n')}

## Quality Standards
${domainInfo.qualityStandards.map(q => `- ${q}`).join('\n')}

## Best Practices
${domainInfo.bestPractices.map(b => `- ${b}`).join('\n')}

## Tool Integration
${domainInfo.tools.map(t => `- ${t}`).join('\n')}

## BMad Method Alignment
- Apply BMad's structured approach to ${domainInfo.domain} development
- Use domain-specific agents for specialized tasks
- Maintain quality assurance processes adapted to ${domainInfo.domain}
- Follow ${domainInfo.domain} industry standards and conventions

## Kiro Integration
- Use context providers relevant to ${domainInfo.domain} development
- Apply domain-specific steering rules consistently
- Integrate with ${domainInfo.domain} tooling through MCP when available
- Respect ${domainInfo.domain} project structures and conventions
`;
  }

  /**
   * Generate agent display name from ID
   * @param {string} agentId - Agent identifier
   * @returns {string} - Display name
   */
  generateAgentDisplayName(agentId) {
    const nameMap = {
      'pm': 'Product Manager',
      'architect': 'Architect',
      'dev': 'Developer',
      'qa': 'QA Engineer',
      'sm': 'Scrum Master',
      'po': 'Product Owner',
      'analyst': 'Business Analyst',
      'ux-expert': 'UX Expert',
      'game-developer': 'Game Developer',
      'game-designer': 'Game Designer',
      'game-sm': 'Game Scrum Master',
      'infra-devops-platform': 'Infrastructure DevOps Platform'
    };
    
    return nameMap[agentId] || agentId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get agent role description
   * @param {string} agentId - Agent identifier
   * @returns {string} - Role description
   */
  getAgentRole(agentId) {
    const roleMap = {
      'pm': 'Product Manager - Strategic planning and requirements gathering',
      'architect': 'Software Architect - System design and technical leadership',
      'dev': 'Developer - Code implementation and technical problem solving',
      'qa': 'QA Engineer - Quality assurance and testing',
      'sm': 'Scrum Master - Agile process facilitation and team coordination',
      'po': 'Product Owner - Product vision and backlog management',
      'analyst': 'Business Analyst - Requirements analysis and documentation',
      'ux-expert': 'UX Expert - User experience design and research',
      'game-developer': 'Game Developer - Game programming and implementation',
      'game-designer': 'Game Designer - Game mechanics and design',
      'game-sm': 'Game Scrum Master - Agile game development processes',
      'infra-devops-platform': 'Infrastructure DevOps - Platform and deployment automation'
    };
    
    return roleMap[agentId] || 'Development Assistant - General development support';
  }

  /**
   * Get agent focus area
   * @param {string} agentId - Agent identifier
   * @returns {string} - Focus description
   */
  getAgentFocus(agentId) {
    const focusMap = {
      'pm': 'Product strategy, roadmaps, and stakeholder alignment',
      'architect': 'System architecture, technical decisions, and design patterns',
      'dev': 'Code quality, implementation best practices, and technical solutions',
      'qa': 'Testing strategies, quality metrics, and defect prevention',
      'sm': 'Team productivity, process improvement, and agile practices',
      'po': 'Product backlog, user stories, and feature prioritization',
      'analyst': 'Requirements gathering, process analysis, and documentation',
      'ux-expert': 'User research, interface design, and usability testing',
      'game-developer': 'Game programming, performance optimization, and technical implementation',
      'game-designer': 'Game mechanics, player experience, and design systems',
      'game-sm': 'Game development workflows and team coordination',
      'infra-devops-platform': 'Infrastructure automation, deployment pipelines, and platform reliability'
    };
    
    return focusMap[agentId] || 'General development support and guidance';
  }

  /**
   * Get agent capabilities
   * @param {string} agentId - Agent identifier
   * @returns {Array} - List of capabilities
   */
  getAgentCapabilities(agentId) {
    const capabilityMap = {
      'pm': [
        'Product roadmap development',
        'Requirements gathering and analysis',
        'Stakeholder communication',
        'Market research and competitive analysis',
        'Feature prioritization and backlog management'
      ],
      'architect': [
        'System architecture design',
        'Technology stack evaluation',
        'Design pattern recommendations',
        'Performance and scalability planning',
        'Technical documentation creation'
      ],
      'dev': [
        'Code implementation and review',
        'Debugging and troubleshooting',
        'API design and development',
        'Database design and optimization',
        'Testing and quality assurance'
      ],
      'qa': [
        'Test strategy development',
        'Test case design and execution',
        'Automated testing implementation',
        'Quality metrics and reporting',
        'Defect tracking and resolution'
      ],
      'sm': [
        'Sprint planning and facilitation',
        'Team process improvement',
        'Impediment removal',
        'Agile coaching and mentoring',
        'Metrics tracking and reporting'
      ],
      'po': [
        'Product backlog management',
        'User story creation and refinement',
        'Acceptance criteria definition',
        'Stakeholder collaboration',
        'Product vision communication'
      ],
      'analyst': [
        'Business requirements analysis',
        'Process modeling and documentation',
        'Stakeholder interviews and workshops',
        'Gap analysis and recommendations',
        'Solution design and validation'
      ],
      'ux-expert': [
        'User research and persona development',
        'Wireframing and prototyping',
        'Usability testing and analysis',
        'Design system creation',
        'Accessibility compliance'
      ]
    };
    
    return capabilityMap[agentId] || [
      'General development assistance',
      'Code review and feedback',
      'Best practices guidance',
      'Problem-solving support'
    ];
  }

  /**
   * Get agent context requirements
   * @param {string} agentId - Agent identifier
   * @returns {Array} - List of context requirements
   */
  getAgentContextRequirements(agentId) {
    const contextMap = {
      'pm': [
        'Product requirements and specifications',
        'Market research and competitive analysis',
        'Stakeholder feedback and priorities',
        'Business objectives and constraints'
      ],
      'architect': [
        'System requirements and constraints',
        'Technology stack and infrastructure',
        'Performance and scalability requirements',
        'Integration points and dependencies'
      ],
      'dev': [
        'Current codebase and file context',
        'Build errors and terminal output',
        'Git changes and recent modifications',
        'Project structure and dependencies'
      ],
      'qa': [
        'Test requirements and acceptance criteria',
        'Application functionality and features',
        'Bug reports and defect tracking',
        'Testing environment and data'
      ]
    };
    
    return contextMap[agentId] || [
      'Project context and requirements',
      'Current file and codebase state',
      'Recent changes and modifications',
      'Build status and error messages'
    ];
  }

  /**
   * Get agent activation guidance
   * @param {string} agentId - Agent identifier
   * @returns {string} - Activation guidance
   */
  getAgentActivationGuidance(agentId) {
    const guidanceMap = {
      'pm': 'planning products, gathering requirements, or managing roadmaps',
      'architect': 'designing systems, making technical decisions, or reviewing architecture',
      'dev': 'implementing code, debugging issues, or reviewing technical solutions',
      'qa': 'testing applications, ensuring quality, or designing test strategies',
      'sm': 'facilitating agile processes, removing impediments, or improving team workflows',
      'po': 'managing product backlogs, writing user stories, or prioritizing features',
      'analyst': 'analyzing requirements, documenting processes, or gathering business needs',
      'ux-expert': 'designing user experiences, conducting research, or improving usability'
    };
    
    return guidanceMap[agentId] || 'general development tasks or technical guidance is needed';
  }

  /**
   * Get agent core principles
   * @param {string} agentId - Agent identifier
   * @returns {Array} - List of core principles
   */
  getAgentCorePrinciples(agentId) {
    const principleMap = {
      'pm': [
        'Customer-centric product development',
        'Data-driven decision making',
        'Clear communication and stakeholder alignment',
        'Iterative improvement and feedback incorporation'
      ],
      'architect': [
        'Scalable and maintainable system design',
        'Technology choices based on requirements',
        'Documentation and knowledge sharing',
        'Performance and security considerations'
      ],
      'dev': [
        'Clean, readable, and maintainable code',
        'Test-driven development practices',
        'Continuous learning and improvement',
        'Collaborative development and code review'
      ],
      'qa': [
        'Quality is everyone\'s responsibility',
        'Prevention over detection',
        'Comprehensive test coverage',
        'Continuous improvement of testing processes'
      ]
    };
    
    return principleMap[agentId] || [
      'Quality and excellence in all deliverables',
      'Clear communication and collaboration',
      'Continuous learning and improvement',
      'User-focused solutions and outcomes'
    ];
  }

  /**
   * Get expansion pack domain guidance
   * @param {string} expansionPack - Expansion pack name
   * @param {string} agentId - Agent identifier
   * @returns {string} - Domain guidance
   */
  getExpansionPackDomainGuidance(expansionPack, agentId) {
    const guidanceMap = {
      'bmad-2d-phaser-game-dev': `Apply specialized knowledge of Phaser.js game development:
- Scene management and game state handling
- Sprite and animation systems
- Physics and collision detection
- Asset loading and optimization
- Game loop and performance considerations`,
      'bmad-2d-unity-game-dev': `Apply specialized knowledge of Unity 2D game development:
- Unity component system and GameObject hierarchy
- 2D physics and collision systems
- Animation controllers and state machines
- Asset pipeline and resource management
- Unity-specific optimization techniques`,
      'bmad-infrastructure-devops': `Apply specialized knowledge of infrastructure and DevOps:
- Infrastructure as Code (IaC) best practices
- CI/CD pipeline design and implementation
- Container orchestration and deployment
- Monitoring, logging, and observability
- Security and compliance considerations`
    };
    
    return guidanceMap[expansionPack] || `Apply domain-specific expertise for ${expansionPack} development`;
  }

  /**
   * Get expansion pack patterns
   * @param {string} expansionPack - Expansion pack name
   * @returns {Array} - List of patterns
   */
  getExpansionPackPatterns(expansionPack) {
    const patternMap = {
      'bmad-2d-phaser-game-dev': [
        'Scene-based game architecture',
        'Component-entity systems for game objects',
        'State machines for game logic',
        'Object pooling for performance',
        'Event-driven communication between systems'
      ],
      'bmad-2d-unity-game-dev': [
        'MonoBehaviour component patterns',
        'ScriptableObject data architecture',
        'Unity Event system usage',
        'Coroutine-based async operations',
        'Prefab-based object composition'
      ],
      'bmad-infrastructure-devops': [
        'Infrastructure as Code patterns',
        'GitOps deployment workflows',
        'Microservices architecture patterns',
        'Observability and monitoring patterns',
        'Security-first design principles'
      ]
    };
    
    return patternMap[expansionPack] || [
      'Domain-specific architectural patterns',
      'Best practices for the technology stack',
      'Performance optimization techniques',
      'Security and reliability patterns'
    ];
  }

  /**
   * Get expansion pack information
   * @param {string} expansionPack - Expansion pack name
   * @returns {Object} - Expansion pack information
   */
  getExpansionPackInfo(expansionPack) {
    const infoMap = {
      'bmad-2d-phaser-game-dev': {
        displayName: 'Phaser.js 2D Game Development',
        domain: 'game development',
        description: 'Specialized guidance for 2D game development using Phaser.js framework',
        technologies: [
          'Phaser.js game framework',
          'JavaScript/TypeScript for game logic',
          'HTML5 Canvas and WebGL rendering',
          'Web Audio API for sound',
          'Node.js for development tooling'
        ],
        patterns: [
          'Scene-based game architecture',
          'Component-entity systems',
          'State machines for game logic',
          'Object pooling for performance',
          'Event-driven system communication'
        ],
        qualityStandards: [
          'Consistent frame rate performance',
          'Memory-efficient asset management',
          'Cross-browser compatibility',
          'Responsive design for multiple screen sizes',
          'Accessible game controls and interfaces'
        ],
        bestPractices: [
          'Modular game code organization',
          'Asset optimization and loading strategies',
          'Performance profiling and optimization',
          'Game state persistence and save systems',
          'User experience and game feel considerations'
        ],
        tools: [
          'Phaser.js development tools',
          'Texture atlas generators',
          'Audio editing and compression tools',
          'Browser developer tools for debugging',
          'Performance monitoring and profiling'
        ]
      },
      'bmad-2d-unity-game-dev': {
        displayName: 'Unity 2D Game Development',
        domain: 'game development',
        description: 'Specialized guidance for 2D game development using Unity engine',
        technologies: [
          'Unity 2D engine and tools',
          'C# programming language',
          'Unity Physics2D system',
          'Unity Animation system',
          'Unity Asset Pipeline'
        ],
        patterns: [
          'MonoBehaviour component architecture',
          'ScriptableObject data systems',
          'Unity Event system patterns',
          'Coroutine-based async operations',
          'Prefab composition patterns'
        ],
        qualityStandards: [
          'Consistent performance across target platforms',
          'Efficient memory usage and garbage collection',
          'Proper asset organization and naming',
          'Code maintainability and modularity',
          'Platform-specific optimization'
        ],
        bestPractices: [
          'Unity project structure organization',
          'Component-based architecture design',
          'Asset workflow and pipeline optimization',
          'Performance profiling and optimization',
          'Version control best practices for Unity'
        ],
        tools: [
          'Unity Editor and built-in tools',
          'Unity Profiler for performance analysis',
          'Unity Package Manager',
          'Version control systems (Git with LFS)',
          'Third-party Unity extensions and tools'
        ]
      },
      'bmad-infrastructure-devops': {
        displayName: 'Infrastructure and DevOps',
        domain: 'infrastructure',
        description: 'Specialized guidance for infrastructure automation and DevOps practices',
        technologies: [
          'Infrastructure as Code (Terraform, CloudFormation)',
          'Container technologies (Docker, Kubernetes)',
          'CI/CD platforms (GitHub Actions, GitLab CI)',
          'Cloud platforms (AWS, Azure, GCP)',
          'Monitoring and observability tools'
        ],
        patterns: [
          'Infrastructure as Code patterns',
          'GitOps deployment workflows',
          'Microservices architecture',
          'Event-driven architectures',
          'Immutable infrastructure patterns'
        ],
        qualityStandards: [
          'Infrastructure reliability and availability',
          'Security and compliance requirements',
          'Cost optimization and resource efficiency',
          'Scalability and performance standards',
          'Disaster recovery and backup strategies'
        ],
        bestPractices: [
          'Version-controlled infrastructure definitions',
          'Automated testing of infrastructure changes',
          'Progressive deployment strategies',
          'Comprehensive monitoring and alerting',
          'Security scanning and vulnerability management'
        ],
        tools: [
          'Infrastructure provisioning tools',
          'Container orchestration platforms',
          'CI/CD pipeline tools',
          'Monitoring and logging solutions',
          'Security scanning and compliance tools'
        ]
      }
    };
    
    return infoMap[expansionPack] || {
      displayName: expansionPack,
      domain: 'development',
      description: `Specialized guidance for ${expansionPack} development`,
      technologies: ['Domain-specific technologies'],
      patterns: ['Domain-specific patterns'],
      qualityStandards: ['Domain-specific quality standards'],
      bestPractices: ['Domain-specific best practices'],
      tools: ['Domain-specific tools']
    };
  }
}

module.exports = AgentTransformer;