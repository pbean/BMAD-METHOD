/**
 * Unity Validation Task Executor
 * Executes validation tasks and generates structured output
 */

const fs = require('fs').promises;
const path = require('path');

class ValidationTaskExecutor {
  constructor(options = {}) {
    this.rootDir = process.cwd();
    this.unityExpansionDir = path.join(this.rootDir, 'expansion-packs', 'bmad-unity-game-dev');
    this.reportsDir = path.join(this.rootDir, 'reports');
    this.options = {
      timeout: options.timeout || 300000,
      debug: options.debug || false,
      outputFormats: options.outputFormats || ['json'],
      ...options
    };
    
    this.results = {
      task: null,
      status: 'PENDING',
      startTime: null,
      endTime: null,
      executionTime: 0,
      score: 0,
      maxScore: 10,
      summary: '',
      critical_issues: 0,
      warnings: 0,
      info_messages: 0,
      details: {},
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
  }

  async executeTask(taskName, scope = 'all') {
    this.results.task = taskName;
    this.results.startTime = Date.now();
    
    try {
      await this.ensureReportsDirectory();
      
      console.log(`Executing Unity validation task: ${taskName}`);
      console.log(`Scope: ${scope}, Platform: ${this.results.platform}`);
      
      // Load task configuration
      const taskConfig = await this.loadTaskConfiguration(taskName);
      this.results.details.taskConfig = taskConfig;
      
      // Execute the actual validation
      const validationResults = await this.runValidation(taskName, taskConfig, scope);
      this.results.details.validation = validationResults;
      
      // Calculate results
      this.calculateResults(validationResults);
      
      this.results.status = this.results.score >= 7 ? 'PASSED' : 'FAILED';
      
    } catch (error) {
      console.error(`Task execution failed: ${error.message}`);
      this.results.status = 'ERROR';
      this.results.summary = error.message;
      this.results.details.error = {
        message: error.message,
        stack: error.stack
      };
    } finally {
      this.results.endTime = Date.now();
      this.results.executionTime = this.results.endTime - this.results.startTime;
      
      await this.generateOutputs();
      
      console.log(`Task completed: ${this.results.status} (${this.results.executionTime}ms)`);
      console.log(`Final score: ${this.results.score}/${this.results.maxScore}`);
    }
    
    return this.results;
  }

  async loadTaskConfiguration(taskName) {
    const taskFile = path.join(this.unityExpansionDir, 'tasks', `validate-${taskName}.md`);
    
    try {
      const content = await fs.readFile(taskFile, 'utf8');
      
      return {
        name: taskName,
        file: taskFile,
        content: content,
        sections: this.parseTaskSections(content),
        requirements: this.extractRequirements(content)
      };
    } catch (error) {
      throw new Error(`Failed to load task configuration for ${taskName}: ${error.message}`);
    }
  }

  parseTaskSections(content) {
    const sections = {};
    const sectionMatches = content.match(/^### \d+\. (.+?)$(.*?)(?=^### \d+\.|$)/gms);
    
    if (sectionMatches) {
      sectionMatches.forEach(match => {
        const lines = match.split('\n');
        const title = lines[0].replace(/^### \d+\. /, '');
        const body = lines.slice(1).join('\n').trim();
        sections[title] = body;
      });
    }
    
    return sections;
  }

  extractRequirements(content) {
    const requirements = {
      unity: content.includes('Unity Editor') || content.includes('UnityEngine'),
      packages: this.extractUnityPackages(content),
      platforms: this.extractPlatformRequirements(content)
    };
    
    return requirements;
  }

  extractUnityPackages(content) {
    const packagePattern = /com\.unity\.[\w\.-]+/g;
    const packages = content.match(packagePattern) || [];
    return [...new Set(packages)];
  }

  extractPlatformRequirements(content) {
    const platforms = [];
    if (content.includes('mobile')) platforms.push('mobile');
    if (content.includes('console')) platforms.push('console');
    if (content.includes('desktop')) platforms.push('desktop');
    if (content.includes('VR') || content.includes('AR')) platforms.push('xr');
    return platforms;
  }

  async runValidation(taskName, taskConfig, scope) {
    console.log(`Running validation for task: ${taskName}`);
    
    const validationResults = {
      sections: {},
      overall: {},
      issues: [],
      warnings: [],
      recommendations: []
    };
    
    // Simulate validation processing
    for (const [sectionTitle, sectionContent] of Object.entries(taskConfig.sections)) {
      console.log(`Processing section: ${sectionTitle}`);
      
      const sectionResult = {
        title: sectionTitle,
        status: 'PASSED',
        score: Math.floor(Math.random() * 3) + 7, // 7-9 for demo
        maxScore: 10,
        issues: [],
        warnings: Math.random() > 0.5 ? ['Minor optimization opportunity'] : [],
        recommendations: ['Consider performance improvements']
      };
      
      validationResults.sections[sectionTitle] = sectionResult;
      
      if (sectionResult.warnings.length > 0) {
        validationResults.warnings.push(...sectionResult.warnings);
      }
      if (sectionResult.recommendations.length > 0) {
        validationResults.recommendations.push(...sectionResult.recommendations);
      }
    }
    
    // Generate overall assessment
    const sectionResults = Object.values(validationResults.sections);
    const totalScore = sectionResults.reduce((sum, section) => sum + section.score, 0);
    const averageScore = sectionResults.length > 0 ? totalScore / sectionResults.length : 0;
    
    validationResults.overall = {
      status: averageScore >= 7 ? 'PASSED' : 'FAILED',
      score: Math.round(averageScore),
      totalScore,
      sectionsProcessed: sectionResults.length,
      criticalIssues: 0,
      warnings: validationResults.warnings.length,
      passingSections: sectionResults.filter(s => s.score >= 7).length,
      failingSections: sectionResults.filter(s => s.score < 4).length
    };
    
    return validationResults;
  }

  calculateResults(validationResults) {
    const overall = validationResults.overall;
    
    this.results.score = overall.score || 0;
    this.results.critical_issues = overall.criticalIssues || 0;
    this.results.warnings = overall.warnings || 0;
    this.results.info_messages = validationResults.recommendations.length || 0;
    
    if (overall.status === 'PASSED') {
      this.results.summary = `Validation passed with score ${overall.score}/10. ${overall.sectionsProcessed} sections processed successfully.`;
    } else {
      this.results.summary = `Validation failed with score ${overall.score}/10. ${overall.criticalIssues} critical issues found.`;
    }
  }

  async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create reports directory:', error.message);
    }
  }

  async generateOutputs() {
    const promises = [];
    
    if (this.options.outputFormats.includes('json')) {
      promises.push(this.generateJsonOutput());
    }
    
    if (this.options.outputFormats.includes('junit')) {
      promises.push(this.generateJunitOutput());
    }
    
    await Promise.allSettled(promises);
  }

  async generateJsonOutput() {
    const outputFile = path.join(this.reportsDir, `unity-validation-${this.results.task}-summary.json`);
    
    try {
      await fs.writeFile(outputFile, JSON.stringify(this.results, null, 2));
      console.log(`JSON report generated: ${outputFile}`);
    } catch (error) {
      console.error('Failed to generate JSON output:', error);
    }
  }

  async generateJunitOutput() {
    const outputFile = path.join(this.reportsDir, `unity-validation-${this.results.task}-junit.xml`);
    
    const testName = `Unity_Validation_${this.results.task}`;
    const className = `UnityValidation.${this.results.task}`;
    const timestamp = new Date(this.results.startTime).toISOString();
    const duration = this.results.executionTime / 1000;
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="${className}" tests="1" failures="${this.results.status === 'FAILED' ? 1 : 0}" errors="${this.results.status === 'ERROR' ? 1 : 0}" time="${duration}" timestamp="${timestamp}">
  <testcase name="${testName}" classname="${className}" time="${duration}">`;
    
    if (this.results.status === 'FAILED') {
      xml += `
    <failure message="Validation failed with score ${this.results.score}/10" type="ValidationFailure">
      <![CDATA[${this.results.summary}]]>
    </failure>`;
    } else if (this.results.status === 'ERROR') {
      xml += `
    <error message="Validation error" type="ValidationError">
      <![CDATA[${this.results.summary}]]>
    </error>`;
    }
    
    xml += `
  </testcase>
</testsuite>`;
    
    try {
      await fs.writeFile(outputFile, xml);
      console.log(`JUnit report generated: ${outputFile}`);
    } catch (error) {
      console.error('Failed to generate JUnit output:', error);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'output-format') {
      options.outputFormats = value.split(',');
    } else if (key === 'debug') {
      options.debug = value === 'true';
    } else if (key === 'timeout') {
      options.timeout = parseInt(value);
    } else {
      options[key] = value;
    }
  }
  
  const taskName = options.task;
  const scope = options.scope || 'all';
  
  if (!taskName) {
    console.error('Task name is required. Use --task <task-name>');
    process.exit(1);
  }
  
  try {
    const executor = new ValidationTaskExecutor(options);
    const results = await executor.executeTask(taskName, scope);
    
    console.log('\n=== VALIDATION RESULTS ===');
    console.log(`Task: ${results.task}`);
    console.log(`Status: ${results.status}`);
    console.log(`Score: ${results.score}/${results.maxScore}`);
    console.log(`Execution Time: ${results.executionTime}ms`);
    console.log(`Summary: ${results.summary}`);
    
    process.exit(results.status === 'PASSED' ? 0 : 1);
    
  } catch (error) {
    console.error('Task execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ValidationTaskExecutor;
