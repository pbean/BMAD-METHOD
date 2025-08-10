const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

class RuntimeErrorHandler {
  constructor() {
    this.errorLog = [];
    this.fallbackStrategies = new Map();
    this.contextProviderFallbacks = new Map();
    this.mcpToolFallbacks = new Map();
    
    this.initializeFallbackStrategies();
  }

  /**
   * Initializes fallback strategies for different error scenarios
   */
  initializeFallbackStrategies() {
    // Context provider fallbacks
    this.contextProviderFallbacks.set('#File', [
      'manual_file_input',
      'recent_files_list',
      'directory_scan'
    ]);
    
    this.contextProviderFallbacks.set('#Folder', [
      'manual_directory_input',
      'project_structure_scan',
      'git_file_list'
    ]);
    
    this.contextProviderFallbacks.set('#Codebase', [
      'file_search',
      'git_grep',
      'manual_code_reference'
    ]);
    
    this.contextProviderFallbacks.set('#Problems', [
      'manual_error_input',
      'log_file_scan',
      'build_output_check'
    ]);
    
    this.contextProviderFallbacks.set('#Terminal', [
      'manual_command_history',
      'shell_history_file',
      'process_list'
    ]);
    
    this.contextProviderFallbacks.set('#Git Diff', [
      'git_status_command',
      'git_log_recent',
      'manual_change_description'
    ]);

    // MCP tool fallbacks
    this.mcpToolFallbacks.set('web-search', [
      'manual_research_guidance',
      'documentation_links',
      'knowledge_base_search'
    ]);
    
    this.mcpToolFallbacks.set('documentation', [
      'inline_documentation',
      'comment_generation',
      'readme_templates'
    ]);
    
    this.mcpToolFallbacks.set('api-testing', [
      'curl_command_generation',
      'test_script_templates',
      'manual_testing_guidance'
    ]);
  }

  /**
   * Handles context provider errors with fallback options
   * @param {string} contextProvider - The context provider that failed
   * @param {Error} error - The error that occurred
   * @param {Object} agentContext - Current agent context
   * @returns {Promise<{success: boolean, fallbackData: any, fallbackMethod: string}>}
   */
  async handleContextProviderError(contextProvider, error, agentContext = {}) {
    this.logError('CONTEXT_PROVIDER_ERROR', {
      provider: contextProvider,
      error: error.message,
      agent: agentContext.agentName,
      timestamp: new Date().toISOString()
    });

    console.log(chalk.yellow(`⚠️  Context provider ${contextProvider} failed: ${error.message}`));
    
    const fallbackMethods = this.contextProviderFallbacks.get(contextProvider) || [];
    
    for (const fallbackMethod of fallbackMethods) {
      try {
        console.log(chalk.cyan(`🔄 Trying fallback method: ${fallbackMethod}`));
        
        const fallbackResult = await this.executeContextFallback(
          contextProvider, 
          fallbackMethod, 
          agentContext
        );
        
        if (fallbackResult.success) {
          console.log(chalk.green(`✓ Fallback successful using: ${fallbackMethod}`));
          return {
            success: true,
            fallbackData: fallbackResult.data,
            fallbackMethod
          };
        }
      } catch (fallbackError) {
        console.log(chalk.yellow(`⚠️  Fallback ${fallbackMethod} also failed: ${fallbackError.message}`));
        continue;
      }
    }

    // All fallbacks failed, provide manual guidance
    const manualGuidance = this.getManualContextGuidance(contextProvider, agentContext);
    console.log(chalk.magenta('\n💡 Manual Context Guidance:'));
    console.log(chalk.magenta(manualGuidance));

    return {
      success: false,
      fallbackData: null,
      fallbackMethod: 'manual_guidance',
      guidance: manualGuidance
    };
  }

  /**
   * Executes specific context fallback methods
   * @param {string} contextProvider - The context provider
   * @param {string} fallbackMethod - The fallback method to execute
   * @param {Object} agentContext - Current agent context
   * @returns {Promise<{success: boolean, data: any}>}
   */
  async executeContextFallback(contextProvider, fallbackMethod, agentContext) {
    const workingDir = agentContext.workingDirectory || process.cwd();
    
    switch (fallbackMethod) {
      case 'manual_file_input':
        return {
          success: true,
          data: {
            message: 'Please specify the file you want to work with',
            prompt: 'Which file would you like me to analyze or modify?'
          }
        };
      
      case 'recent_files_list':
        return await this.getRecentFiles(workingDir);
      
      case 'directory_scan':
        return await this.scanDirectory(workingDir);
      
      case 'manual_directory_input':
        return {
          success: true,
          data: {
            message: 'Please specify the directory structure you want to work with',
            prompt: 'Which directories or files are relevant to your task?'
          }
        };
      
      case 'project_structure_scan':
        return await this.scanProjectStructure(workingDir);
      
      case 'git_file_list':
        return await this.getGitTrackedFiles(workingDir);
      
      case 'file_search':
        return {
          success: true,
          data: {
            message: 'Codebase search unavailable. Please specify files to examine',
            prompt: 'Which specific files or patterns should I look for?'
          }
        };
      
      case 'git_grep':
        return await this.executeGitGrep(workingDir, agentContext.searchTerm);
      
      case 'manual_error_input':
        return {
          success: true,
          data: {
            message: 'Please describe the problems or errors you\'re encountering',
            prompt: 'What issues are you seeing? Include error messages if available.'
          }
        };
      
      case 'log_file_scan':
        return await this.scanLogFiles(workingDir);
      
      case 'build_output_check':
        return await this.checkBuildOutput(workingDir);
      
      case 'manual_command_history':
        return {
          success: true,
          data: {
            message: 'Please share relevant terminal commands or output',
            prompt: 'What commands have you run recently? Any relevant output?'
          }
        };
      
      case 'shell_history_file':
        return await this.readShellHistory();
      
      case 'git_status_command':
        return await this.executeGitStatus(workingDir);
      
      case 'git_log_recent':
        return await this.getRecentGitLog(workingDir);
      
      case 'manual_change_description':
        return {
          success: true,
          data: {
            message: 'Please describe the changes you\'ve made',
            prompt: 'What files have you modified? What changes did you make?'
          }
        };
      
      default:
        throw new Error(`Unknown fallback method: ${fallbackMethod}`);
    }
  }

  /**
   * Handles MCP tool errors with alternative workflows
   * @param {string} toolName - The MCP tool that failed
   * @param {Error} error - The error that occurred
   * @param {Object} agentContext - Current agent context
   * @returns {Promise<{success: boolean, alternativeWorkflow: string, guidance: string}>}
   */
  async handleMCPToolError(toolName, error, agentContext = {}) {
    this.logError('MCP_TOOL_ERROR', {
      tool: toolName,
      error: error.message,
      agent: agentContext.agentName,
      timestamp: new Date().toISOString()
    });

    console.log(chalk.yellow(`⚠️  MCP tool ${toolName} failed: ${error.message}`));
    
    const fallbackMethods = this.mcpToolFallbacks.get(toolName) || [];
    
    for (const fallbackMethod of fallbackMethods) {
      try {
        console.log(chalk.cyan(`🔄 Trying alternative workflow: ${fallbackMethod}`));
        
        const alternativeResult = await this.executeMCPFallback(
          toolName, 
          fallbackMethod, 
          agentContext
        );
        
        if (alternativeResult.success) {
          console.log(chalk.green(`✓ Alternative workflow available: ${fallbackMethod}`));
          return {
            success: true,
            alternativeWorkflow: fallbackMethod,
            guidance: alternativeResult.guidance,
            data: alternativeResult.data
          };
        }
      } catch (fallbackError) {
        console.log(chalk.yellow(`⚠️  Alternative ${fallbackMethod} not available: ${fallbackError.message}`));
        continue;
      }
    }

    // Provide setup guidance for the missing MCP tool
    const setupGuidance = this.getMCPSetupGuidance(toolName);
    console.log(chalk.magenta('\n🛠️  MCP Tool Setup Guidance:'));
    console.log(chalk.magenta(setupGuidance));

    return {
      success: false,
      alternativeWorkflow: 'manual_process',
      guidance: setupGuidance
    };
  }

  /**
   * Executes MCP tool fallback methods
   * @param {string} toolName - The MCP tool name
   * @param {string} fallbackMethod - The fallback method to execute
   * @param {Object} agentContext - Current agent context
   * @returns {Promise<{success: boolean, guidance: string, data?: any}>}
   */
  async executeMCPFallback(toolName, fallbackMethod, agentContext) {
    switch (fallbackMethod) {
      case 'manual_research_guidance':
        return {
          success: true,
          guidance: `Since web search is unavailable, please:
1. Research the topic manually using your preferred search engine
2. Gather relevant information from documentation
3. Share key findings for analysis
4. Consider setting up web-search MCP tool for future use`,
          data: { requiresManualInput: true }
        };
      
      case 'documentation_links':
        return {
          success: true,
          guidance: `Documentation generation unavailable. Alternative approaches:
1. Create documentation manually using templates
2. Use inline comments for code documentation
3. Reference existing documentation patterns in the project
4. Consider setting up documentation MCP tools`,
          data: { templates: await this.getDocumentationTemplates() }
        };
      
      case 'curl_command_generation':
        return {
          success: true,
          guidance: `API testing tools unavailable. Use these alternatives:
1. Generate curl commands for manual testing
2. Create test scripts using available tools
3. Use browser developer tools for API testing
4. Set up HTTP client MCP tools for automation`,
          data: { curlTemplates: this.getCurlTemplates() }
        };
      
      case 'inline_documentation':
        return {
          success: true,
          guidance: 'Generate inline documentation and comments directly in code',
          data: { documentationPatterns: this.getDocumentationPatterns() }
        };
      
      case 'comment_generation':
        return {
          success: true,
          guidance: 'Add comprehensive comments to explain complex logic',
          data: { commentTemplates: this.getCommentTemplates() }
        };
      
      case 'readme_templates':
        return {
          success: true,
          guidance: 'Use README templates for project documentation',
          data: { readmeTemplates: this.getReadmeTemplates() }
        };
      
      case 'test_script_templates':
        return {
          success: true,
          guidance: 'Create test scripts using available testing frameworks',
          data: { testTemplates: this.getTestScriptTemplates() }
        };
      
      case 'manual_testing_guidance':
        return {
          success: true,
          guidance: `Manual testing approach:
1. Define test cases and scenarios
2. Create step-by-step testing procedures
3. Document expected vs actual results
4. Use available debugging tools`,
          data: { testingProcedures: this.getManualTestingProcedures() }
        };
      
      default:
        throw new Error(`Unknown MCP fallback method: ${fallbackMethod}`);
    }
  }

  /**
   * Handles hook execution errors with manual fallback
   * @param {string} hookName - The hook that failed
   * @param {Error} error - The error that occurred
   * @param {Object} hookContext - Hook execution context
   * @returns {Promise<{success: boolean, manualSteps: Array, guidance: string}>}
   */
  async handleHookExecutionError(hookName, error, hookContext = {}) {
    this.logError('HOOK_EXECUTION_ERROR', {
      hook: hookName,
      error: error.message,
      context: hookContext,
      timestamp: new Date().toISOString()
    });

    console.log(chalk.yellow(`⚠️  Hook ${hookName} failed: ${error.message}`));
    
    // Provide manual steps to achieve the hook's intended outcome
    const manualSteps = this.getManualHookSteps(hookName, hookContext);
    
    console.log(chalk.cyan('\n🔧 Manual Steps to Complete Hook Action:'));
    manualSteps.forEach((step, index) => {
      console.log(chalk.cyan(`${index + 1}. ${step}`));
    });

    // Provide hook debugging guidance
    const debugGuidance = this.getHookDebugGuidance(hookName, error);
    console.log(chalk.magenta('\n🐛 Hook Debug Guidance:'));
    console.log(chalk.magenta(debugGuidance));

    return {
      success: false,
      manualSteps,
      guidance: debugGuidance
    };
  }

  /**
   * Gets manual steps to replace failed hook functionality
   * @param {string} hookName - The hook name
   * @param {Object} hookContext - Hook context
   * @returns {Array} Array of manual steps
   */
  getManualHookSteps(hookName, hookContext) {
    const steps = [];
    
    if (hookName.includes('story-progression')) {
      steps.push('Check current story status in docs/stories/');
      steps.push('Identify completed tasks and next steps');
      steps.push('Manually create or update the next story document');
      steps.push('Update task status markers in relevant files');
      steps.push('Commit changes with appropriate message');
    } else if (hookName.includes('code-review')) {
      steps.push('Review the modified code files manually');
      steps.push('Check for coding standards compliance');
      steps.push('Run tests to ensure functionality');
      steps.push('Document any issues or improvements needed');
      steps.push('Update code review checklist if available');
    } else if (hookName.includes('documentation-update')) {
      steps.push('Identify documentation that needs updating');
      steps.push('Review recent code changes for documentation impact');
      steps.push('Update relevant documentation files');
      steps.push('Ensure documentation consistency across the project');
      steps.push('Commit documentation updates');
    } else {
      steps.push('Review the hook configuration to understand its purpose');
      steps.push('Manually perform the intended hook action');
      steps.push('Check for any side effects or additional steps needed');
      steps.push('Consider debugging the hook for future use');
    }
    
    return steps;
  }

  /**
   * Provides debugging guidance for failed hooks
   * @param {string} hookName - The hook name
   * @param {Error} error - The error that occurred
   * @returns {string} Debug guidance
   */
  getHookDebugGuidance(hookName, error) {
    let guidance = `To debug the ${hookName} hook:\n\n`;
    
    if (error.message.includes('permission')) {
      guidance += '• Check file permissions and user access rights\n';
      guidance += '• Ensure the hook has permission to modify target files\n';
    }
    
    if (error.message.includes('not found') || error.message.includes('ENOENT')) {
      guidance += '• Verify all file paths in the hook configuration\n';
      guidance += '• Check that target files and directories exist\n';
    }
    
    if (error.message.includes('agent')) {
      guidance += '• Verify the specified agent exists and is properly configured\n';
      guidance += '• Check agent dependencies and requirements\n';
    }
    
    guidance += '• Review hook configuration syntax and structure\n';
    guidance += '• Test hook execution in a controlled environment\n';
    guidance += '• Check Kiro IDE logs for additional error details\n';
    guidance += '• Consider simplifying the hook logic for debugging\n';
    
    return guidance;
  }

  /**
   * Gets manual context guidance when all fallbacks fail
   * @param {string} contextProvider - The context provider
   * @param {Object} agentContext - Agent context
   * @returns {string} Manual guidance
   */
  getManualContextGuidance(contextProvider, agentContext) {
    switch (contextProvider) {
      case '#File':
        return `File context unavailable. Please:
• Specify which file you want to work with
• Share relevant file content if needed
• Describe the file's purpose and current state`;
      
      case '#Folder':
        return `Folder context unavailable. Please:
• Describe the project structure
• List relevant directories and files
• Explain the organization of your codebase`;
      
      case '#Codebase':
        return `Codebase search unavailable. Please:
• Specify which files or patterns to examine
• Describe the code you're looking for
• Share relevant code snippets if needed`;
      
      case '#Problems':
        return `Problem detection unavailable. Please:
• Describe any errors or issues you're seeing
• Share error messages or logs
• Explain what's not working as expected`;
      
      case '#Terminal':
        return `Terminal context unavailable. Please:
• Share relevant command output
• Describe what commands you've run
• Include any error messages from the terminal`;
      
      case '#Git Diff':
        return `Git diff unavailable. Please:
• Describe what changes you've made
• List modified files
• Explain the nature of your modifications`;
      
      default:
        return `Context provider ${contextProvider} unavailable. Please provide relevant information manually.`;
    }
  }

  /**
   * Gets MCP tool setup guidance
   * @param {string} toolName - The MCP tool name
   * @returns {string} Setup guidance
   */
  getMCPSetupGuidance(toolName) {
    const baseGuidance = `To set up the ${toolName} MCP tool:\n\n`;
    
    switch (toolName) {
      case 'web-search':
        return baseGuidance + `1. Add web search MCP server to .kiro/settings/mcp.json
2. Configure API keys if required
3. Test the connection using Kiro's MCP interface
4. Example configuration:
   {
     "mcpServers": {
       "web-search": {
         "command": "uvx",
         "args": ["web-search-mcp-server@latest"]
       }
     }
   }`;
      
      case 'documentation':
        return baseGuidance + `1. Install documentation MCP tools
2. Configure documentation generators
3. Set up templates and styles
4. Test documentation generation`;
      
      case 'api-testing':
        return baseGuidance + `1. Install HTTP client MCP tools
2. Configure API endpoints and authentication
3. Set up test environments
4. Test API connectivity`;
      
      default:
        return baseGuidance + `1. Check available MCP servers for ${toolName}
2. Install using uvx or appropriate package manager
3. Configure in .kiro/settings/mcp.json
4. Test the tool integration`;
    }
  }

  /**
   * Logs errors for debugging and analysis
   * @param {string} errorType - Type of error
   * @param {Object} errorDetails - Error details
   */
  logError(errorType, errorDetails) {
    const errorEntry = {
      type: errorType,
      timestamp: new Date().toISOString(),
      ...errorDetails
    };
    
    this.errorLog.push(errorEntry);
    
    // Keep only the last 100 errors to prevent memory issues
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
  }

  /**
   * Gets error statistics and patterns
   * @returns {Object} Error analysis
   */
  getErrorAnalysis() {
    const analysis = {
      totalErrors: this.errorLog.length,
      errorTypes: {},
      recentErrors: this.errorLog.slice(-10),
      commonPatterns: []
    };
    
    // Count error types
    this.errorLog.forEach(error => {
      analysis.errorTypes[error.type] = (analysis.errorTypes[error.type] || 0) + 1;
    });
    
    // Identify common patterns
    const patterns = {};
    this.errorLog.forEach(error => {
      const pattern = `${error.type}:${error.agent || 'unknown'}`;
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    });
    
    analysis.commonPatterns = Object.entries(patterns)
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    return analysis;
  }

  // Helper methods for fallback implementations
  async getRecentFiles(workingDir) {
    try {
      const files = await fs.readdir(workingDir);
      const recentFiles = files.filter(file => !file.startsWith('.'));
      return {
        success: true,
        data: { files: recentFiles.slice(0, 10) }
      };
    } catch (error) {
      return { success: false, data: null };
    }
  }

  async scanDirectory(workingDir) {
    try {
      const structure = await this.buildDirectoryStructure(workingDir);
      return {
        success: true,
        data: { structure }
      };
    } catch (error) {
      return { success: false, data: null };
    }
  }

  async buildDirectoryStructure(dir, depth = 0, maxDepth = 2) {
    if (depth > maxDepth) return null;
    
    try {
      const items = await fs.readdir(dir);
      const structure = {};
      
      for (const item of items) {
        if (item.startsWith('.')) continue;
        
        const itemPath = path.join(dir, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          structure[item] = await this.buildDirectoryStructure(itemPath, depth + 1, maxDepth);
        } else {
          structure[item] = 'file';
        }
      }
      
      return structure;
    } catch (error) {
      return null;
    }
  }

  async scanProjectStructure(workingDir) {
    try {
      const structure = await this.buildDirectoryStructure(workingDir, 0, 3);
      return {
        success: true,
        data: { projectStructure: structure }
      };
    } catch (error) {
      return { success: false, data: null };
    }
  }

  async getGitTrackedFiles(workingDir) {
    try {
      const { execSync } = require('child_process');
      const output = execSync('git ls-files', { 
        cwd: workingDir, 
        encoding: 'utf8' 
      });
      const files = output.trim().split('\n').filter(Boolean);
      return {
        success: true,
        data: { trackedFiles: files }
      };
    } catch (error) {
      return { success: false, data: null };
    }
  }

  async executeGitGrep(workingDir, searchTerm) {
    if (!searchTerm) {
      return { success: false, data: null };
    }
    
    try {
      const { execSync } = require('child_process');
      const output = execSync(`git grep -n "${searchTerm}"`, { 
        cwd: workingDir, 
        encoding: 'utf8' 
      });
      return {
        success: true,
        data: { searchResults: output.trim().split('\n') }
      };
    } catch (error) {
      return { success: false, data: null };
    }
  }

  async scanLogFiles(workingDir) {
    const logPatterns = ['*.log', 'logs/*.log', 'log/*.log'];
    const logFiles = [];
    
    for (const pattern of logPatterns) {
      try {
        const glob = require('glob');
        const files = glob.sync(pattern, { cwd: workingDir });
        logFiles.push(...files);
      } catch (error) {
        continue;
      }
    }
    
    return {
      success: logFiles.length > 0,
      data: { logFiles }
    };
  }

  async checkBuildOutput(workingDir) {
    const buildFiles = ['build.log', 'npm-debug.log', 'yarn-error.log'];
    const foundFiles = [];
    
    for (const file of buildFiles) {
      const filePath = path.join(workingDir, file);
      if (await fs.pathExists(filePath)) {
        foundFiles.push(file);
      }
    }
    
    return {
      success: foundFiles.length > 0,
      data: { buildFiles: foundFiles }
    };
  }

  async readShellHistory() {
    try {
      const os = require('os');
      const historyFile = path.join(os.homedir(), '.bash_history');
      
      if (await fs.pathExists(historyFile)) {
        const history = await fs.readFile(historyFile, 'utf8');
        const recentCommands = history.trim().split('\n').slice(-20);
        return {
          success: true,
          data: { recentCommands }
        };
      }
    } catch (error) {
      // Ignore errors
    }
    
    return { success: false, data: null };
  }

  async executeGitStatus(workingDir) {
    try {
      const { execSync } = require('child_process');
      const output = execSync('git status --porcelain', { 
        cwd: workingDir, 
        encoding: 'utf8' 
      });
      return {
        success: true,
        data: { gitStatus: output.trim().split('\n').filter(Boolean) }
      };
    } catch (error) {
      return { success: false, data: null };
    }
  }

  async getRecentGitLog(workingDir) {
    try {
      const { execSync } = require('child_process');
      const output = execSync('git log --oneline -10', { 
        cwd: workingDir, 
        encoding: 'utf8' 
      });
      return {
        success: true,
        data: { recentCommits: output.trim().split('\n') }
      };
    } catch (error) {
      return { success: false, data: null };
    }
  }

  // Template and guidance methods
  async getDocumentationTemplates() {
    return {
      readme: '# Project Title\n\n## Description\n\n## Installation\n\n## Usage\n\n## Contributing',
      api: '## API Documentation\n\n### Endpoints\n\n### Parameters\n\n### Examples',
      changelog: '# Changelog\n\n## [Unreleased]\n\n### Added\n### Changed\n### Fixed'
    };
  }

  getCurlTemplates() {
    return {
      get: 'curl -X GET "https://api.example.com/endpoint" -H "Content-Type: application/json"',
      post: 'curl -X POST "https://api.example.com/endpoint" -H "Content-Type: application/json" -d \'{"key": "value"}\'',
      put: 'curl -X PUT "https://api.example.com/endpoint" -H "Content-Type: application/json" -d \'{"key": "value"}\'',
      delete: 'curl -X DELETE "https://api.example.com/endpoint" -H "Content-Type: application/json"'
    };
  }

  getDocumentationPatterns() {
    return {
      function: '/**\n * Description of function\n * @param {type} param - Parameter description\n * @returns {type} Return description\n */',
      class: '/**\n * Class description\n * @class ClassName\n */',
      module: '/**\n * Module description\n * @module ModuleName\n */'
    };
  }

  getCommentTemplates() {
    return {
      todo: '// TODO: Description of what needs to be done',
      fixme: '// FIXME: Description of what needs to be fixed',
      note: '// NOTE: Important information',
      hack: '// HACK: Temporary solution, needs proper implementation'
    };
  }

  getReadmeTemplates() {
    return {
      basic: '# Project Name\n\n## Description\n\n## Installation\n\n## Usage\n\n## License',
      detailed: '# Project Name\n\n## Table of Contents\n\n## Description\n\n## Prerequisites\n\n## Installation\n\n## Configuration\n\n## Usage\n\n## API Reference\n\n## Contributing\n\n## Testing\n\n## Deployment\n\n## License\n\n## Contact'
    };
  }

  getTestScriptTemplates() {
    return {
      jest: 'describe("Component", () => {\n  test("should do something", () => {\n    expect(true).toBe(true);\n  });\n});',
      mocha: 'describe("Component", function() {\n  it("should do something", function() {\n    // Test implementation\n  });\n});'
    };
  }

  getManualTestingProcedures() {
    return {
      functional: [
        'Define test scenarios and expected outcomes',
        'Execute each test case step by step',
        'Document actual results vs expected results',
        'Report any discrepancies or issues'
      ],
      integration: [
        'Test component interactions',
        'Verify data flow between components',
        'Check error handling and edge cases',
        'Validate system behavior under load'
      ]
    };
  }
}

module.exports = RuntimeErrorHandler;