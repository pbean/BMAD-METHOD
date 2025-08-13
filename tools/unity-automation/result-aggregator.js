/**
 * Unity Validation Result Aggregator
 * Combines multiple validation results into comprehensive reports
 */

const fs = require('fs').promises;
const path = require('path');

class ValidationResultAggregator {
  constructor() {
    this.results = [];
    this.aggregatedData = {
      overall_status: 'UNKNOWN',
      overall_score: 0,
      total_tasks: 0,
      passed_tasks: 0,
      failed_tasks: 0,
      error_tasks: 0,
      total_execution_time: 0,
      total_critical_issues: 0,
      total_warnings: 0,
      total_info_messages: 0,
      platform_summary: {},
      task_details: {},
      timestamp: new Date().toISOString()
    };
  }

  async aggregateResults(inputDir, outputFile, formats = ['json']) {
    console.log(`Aggregating results from: ${inputDir}`);
    
    try {
      await this.collectResults(inputDir);
      this.processAggregation();
      await this.generateOutputs(outputFile, formats);
      
      console.log(`Aggregation completed. Overall status: ${this.aggregatedData.overall_status}`);
      console.log(`Overall score: ${this.aggregatedData.overall_score}/10`);
      
      return this.aggregatedData;
    } catch (error) {
      console.error('Aggregation failed:', error);
      throw error;
    }
  }

  async collectResults(inputDir) {
    try {
      const entries = await fs.readdir(inputDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const artifactDir = path.join(inputDir, entry.name);
          await this.processArtifactDirectory(artifactDir);
        }
      }
      
      console.log(`Collected ${this.results.length} validation results`);
    } catch (error) {
      console.warn(`Could not read input directory ${inputDir}:`, error.message);
    }
  }

  async processArtifactDirectory(artifactDir) {
    try {
      const files = await fs.readdir(artifactDir);
      
      for (const file of files) {
        if (file.includes('summary.json')) {
          const filePath = path.join(artifactDir, file);
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const result = JSON.parse(content);
            this.results.push(result);
            console.log(`Loaded result: ${result.task} - ${result.status}`);
          } catch (error) {
            console.warn(`Could not parse result file ${filePath}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.warn(`Could not process artifact directory ${artifactDir}:`, error.message);
    }
  }

  processAggregation() {
    if (this.results.length === 0) {
      this.aggregatedData.overall_status = 'NO_RESULTS';
      return;
    }

    this.aggregatedData.total_tasks = this.results.length;
    this.aggregatedData.passed_tasks = this.results.filter(r => r.status === 'PASSED').length;
    this.aggregatedData.failed_tasks = this.results.filter(r => r.status === 'FAILED').length;
    this.aggregatedData.error_tasks = this.results.filter(r => r.status === 'ERROR').length;

    const totalScore = this.results.reduce((sum, r) => sum + (r.score || 0), 0);
    this.aggregatedData.overall_score = Math.round(totalScore / this.results.length);

    this.aggregatedData.total_execution_time = this.results.reduce((sum, r) => sum + (r.executionTime || 0), 0);
    this.aggregatedData.total_critical_issues = this.results.reduce((sum, r) => sum + (r.critical_issues || 0), 0);
    this.aggregatedData.total_warnings = this.results.reduce((sum, r) => sum + (r.warnings || 0), 0);
    this.aggregatedData.total_info_messages = this.results.reduce((sum, r) => sum + (r.info_messages || 0), 0);

    if (this.aggregatedData.error_tasks > 0) {
      this.aggregatedData.overall_status = 'ERROR';
    } else if (this.aggregatedData.failed_tasks > 0) {
      this.aggregatedData.overall_status = 'FAILED';
    } else if (this.aggregatedData.total_critical_issues > 0 || this.aggregatedData.overall_score < 7) {
      this.aggregatedData.overall_status = 'WARNING';
    } else {
      this.aggregatedData.overall_status = 'PASSED';
    }

    this.generatePlatformSummary();
    this.generateTaskDetails();
  }

  generatePlatformSummary() {
    const platformData = {};

    for (const result of this.results) {
      const platform = result.platform || 'unknown';
      
      if (!platformData[platform]) {
        platformData[platform] = {
          total_tasks: 0,
          passed_tasks: 0,
          failed_tasks: 0,
          error_tasks: 0,
          average_score: 0,
          total_execution_time: 0
        };
      }

      platformData[platform].total_tasks++;
      if (result.status === 'PASSED') platformData[platform].passed_tasks++;
      if (result.status === 'FAILED') platformData[platform].failed_tasks++;
      if (result.status === 'ERROR') platformData[platform].error_tasks++;
      platformData[platform].total_execution_time += result.executionTime || 0;
    }

    for (const [platform, data] of Object.entries(platformData)) {
      const platformResults = this.results.filter(r => (r.platform || 'unknown') === platform);
      const totalScore = platformResults.reduce((sum, r) => sum + (r.score || 0), 0);
      data.average_score = Math.round(totalScore / platformResults.length);
    }

    this.aggregatedData.platform_summary = platformData;
  }

  generateTaskDetails() {
    const taskDetails = {};

    for (const result of this.results) {
      const taskName = result.task;
      
      if (!taskDetails[taskName]) {
        taskDetails[taskName] = {
          platforms: {},
          overall_status: 'UNKNOWN',
          average_score: 0,
          total_execution_time: 0,
          issues_summary: {
            critical: 0,
            warnings: 0,
            info: 0
          }
        };
      }

      const task = taskDetails[taskName];
      const platform = result.platform || 'unknown';
      
      task.platforms[platform] = {
        status: result.status,
        score: result.score || 0,
        execution_time: result.executionTime || 0,
        summary: result.summary || ''
      };

      task.total_execution_time += result.executionTime || 0;
      task.issues_summary.critical += result.critical_issues || 0;
      task.issues_summary.warnings += result.warnings || 0;
      task.issues_summary.info += result.info_messages || 0;
    }

    for (const [taskName, task] of Object.entries(taskDetails)) {
      const taskResults = this.results.filter(r => r.task === taskName);
      const totalScore = taskResults.reduce((sum, r) => sum + (r.score || 0), 0);
      task.average_score = Math.round(totalScore / taskResults.length);

      const platformStatuses = Object.values(task.platforms).map(p => p.status);
      if (platformStatuses.includes('ERROR')) {
        task.overall_status = 'ERROR';
      } else if (platformStatuses.includes('FAILED')) {
        task.overall_status = 'FAILED';
      } else if (task.issues_summary.critical > 0 || task.average_score < 7) {
        task.overall_status = 'WARNING';
      } else {
        task.overall_status = 'PASSED';
      }
    }

    this.aggregatedData.task_details = taskDetails;
  }

  async generateOutputs(outputFile, formats) {
    const promises = [];

    for (const format of formats) {
      switch (format) {
        case 'json':
          promises.push(this.generateJsonOutput(outputFile));
          break;
        case 'html':
          promises.push(this.generateHtmlOutput(outputFile));
          break;
        case 'junit':
          promises.push(this.generateJunitOutput(outputFile));
          break;
      }
    }

    await Promise.allSettled(promises);
  }

  async generateJsonOutput(outputFile) {
    try {
      await fs.writeFile(outputFile, JSON.stringify(this.aggregatedData, null, 2));
      console.log(`JSON aggregate report generated: ${outputFile}`);
    } catch (error) {
      console.error('Failed to generate JSON output:', error);
    }
  }

  async generateHtmlOutput(outputFile) {
    const htmlFile = outputFile.replace('.json', '.html');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unity Validation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Unity Expansion Pack Validation Report</h1>
        <div class="metric">Overall Status: <span class="status-${this.aggregatedData.overall_status.toLowerCase()}">${this.aggregatedData.overall_status}</span></div>
        <div class="metric">Overall Score: ${this.aggregatedData.overall_score}/10</div>
        <div class="metric">Tasks: ${this.aggregatedData.total_tasks}</div>
        <div class="metric">Passed: ${this.aggregatedData.passed_tasks}</div>
        <div class="metric">Failed: ${this.aggregatedData.failed_tasks}</div>
    </div>
    <p>Unity CI/CD automation framework validation completed successfully.</p>
</body>
</html>`;

    try {
      await fs.writeFile(htmlFile, html);
      console.log(`HTML aggregate report generated: ${htmlFile}`);
    } catch (error) {
      console.error('Failed to generate HTML output:', error);
    }
  }

  async generateJunitOutput(outputFile) {
    const junitFile = outputFile.replace('.json', '-junit.xml');
    
    const totalTests = this.aggregatedData.total_tasks;
    const failures = this.aggregatedData.failed_tasks;
    const errors = this.aggregatedData.error_tasks;
    const totalTime = this.aggregatedData.total_execution_time / 1000;
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Unity.Expansion.Pack.Validation" tests="${totalTests}" failures="${failures}" errors="${errors}" time="${totalTime}" timestamp="${this.aggregatedData.timestamp}">`;

    for (const result of this.results) {
      const testName = `Unity_Validation_${result.task}_${result.platform || 'unknown'}`;
      const className = `UnityValidation.${result.task}`;
      const time = (result.executionTime || 0) / 1000;
      
      xml += `
  <testcase name="${testName}" classname="${className}" time="${time}">`;
      
      if (result.status === 'FAILED') {
        xml += `
    <failure message="Validation failed with score ${result.score}/10" type="ValidationFailure">
      <![CDATA[${result.summary}]]>
    </failure>`;
      } else if (result.status === 'ERROR') {
        xml += `
    <error message="Validation error" type="ValidationError">
      <![CDATA[${result.summary}]]>
    </error>`;
      }
      
      xml += `
  </testcase>`;
    }
    
    xml += `
</testsuite>`;

    try {
      await fs.writeFile(junitFile, xml);
      console.log(`JUnit aggregate report generated: ${junitFile}`);
    } catch (error) {
      console.error('Failed to generate JUnit output:', error);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    inputDir: 'validation-artifacts',
    output: 'reports/unity-validation-aggregate.json',
    format: ['json']
  };
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'input-dir') {
      options.inputDir = value;
    } else if (key === 'output') {
      options.output = value;
    } else if (key === 'format') {
      options.format = value.split(',');
    }
  }
  
  try {
    const aggregator = new ValidationResultAggregator();
    const results = await aggregator.aggregateResults(options.inputDir, options.output, options.format);
    
    console.log('\n=== AGGREGATION RESULTS ===');
    console.log(`Overall Status: ${results.overall_status}`);
    console.log(`Overall Score: ${results.overall_score}/10`);
    console.log(`Total Tasks: ${results.total_tasks}`);
    console.log(`Passed: ${results.passed_tasks}`);
    console.log(`Failed: ${results.failed_tasks}`);
    
    process.exit(results.overall_status === 'PASSED' ? 0 : 1);
    
  } catch (error) {
    console.error('Aggregation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ValidationResultAggregator;
