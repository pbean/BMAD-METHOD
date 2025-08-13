/**
 * Unity Validation Summary Generator
 * Creates human-readable summaries and GitHub/Azure DevOps integration
 */

const fs = require('fs').promises;
const path = require('path');

class ValidationSummaryGenerator {
  constructor() {
    this.data = null;
  }

  async generateSummary(inputFile, outputFile, options = {}) {
    try {
      const content = await fs.readFile(inputFile, 'utf8');
      this.data = JSON.parse(content);
      
      const summary = this.createMarkdownSummary();
      await fs.writeFile(outputFile, summary);
      
      if (options.githubSummary) {
        console.log('## Unity Validation Summary\n');
        console.log(this.createGitHubStepSummary());
      }
      
      console.log(`Summary generated: ${outputFile}`);
      return summary;
      
    } catch (error) {
      console.error('Summary generation failed:', error);
      throw error;
    }
  }

  createMarkdownSummary() {
    const data = this.data;
    
    const statusEmoji = {
      'PASSED': '✅',
      'FAILED': '❌',
      'WARNING': '⚠️',
      'ERROR': '💥',
      'NO_RESULTS': '❓'
    };

    let summary = `# Unity Expansion Pack Validation Summary

**Generated:** ${new Date(data.timestamp).toLocaleString()}  
**Overall Status:** ${statusEmoji[data.overall_status]} ${data.overall_status}  
**Overall Score:** ${data.overall_score}/10

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| Total Tasks | ${data.total_tasks} |
| Passed Tasks | ${data.passed_tasks} |
| Failed Tasks | ${data.failed_tasks} |
| Error Tasks | ${data.error_tasks} |
| Critical Issues | ${data.total_critical_issues} |
| Warnings | ${data.total_warnings} |
| Total Execution Time | ${Math.round(data.total_execution_time / 1000)}s |

## 🎯 Task Validation Results

`;

    for (const [taskName, task] of Object.entries(data.task_details)) {
      const platformCount = Object.keys(task.platforms).length;
      const timeSeconds = Math.round(task.total_execution_time / 1000);
      
      summary += `### ${taskName}

**Status:** ${statusEmoji[task.overall_status]} ${task.overall_status}  
**Score:** ${task.average_score}/10  
**Platforms:** ${platformCount}  
**Execution Time:** ${timeSeconds}s

`;

      for (const [platform, platformResult] of Object.entries(task.platforms)) {
        summary += `- **${platform}:** ${statusEmoji[platformResult.status]} ${platformResult.status} (${platformResult.score}/10)\n`;
      }

      summary += '\n';
    }

    summary += `## 🖥️ Platform Summary

| Platform | Tasks | Passed | Failed | Avg Score |
|----------|-------|--------|--------|-----------|
`;

    for (const [platform, platformData] of Object.entries(data.platform_summary)) {
      summary += `| ${platform} | ${platformData.total_tasks} | ${platformData.passed_tasks} | ${platformData.failed_tasks} | ${platformData.average_score}/10 |\n`;
    }

    if (data.overall_status === 'PASSED') {
      summary += `\n## 🏆 Success!

The Unity expansion pack validation has passed successfully. All validation tasks completed with satisfactory scores.

## 🚀 Next Steps

1. **Deploy to Production:** The expansion pack is ready for deployment
2. **Monitor Performance:** Set up monitoring for production usage
3. **Documentation:** Ensure all documentation is current
`;
    } else {
      summary += `\n## ⚠️ Action Required

The Unity expansion pack validation requires attention before deployment.

## 🔧 Recommended Actions

1. Review failed validation tasks
2. Address critical issues
3. Re-run validation after fixes
`;
    }

    summary += `\n---

**Framework:** Unity CI/CD Automation v1.0.0  
**Report ID:** ${data.timestamp}
`;

    return summary;
  }

  createGitHubStepSummary() {
    const data = this.data;
    
    const statusEmoji = {
      'PASSED': '✅',
      'FAILED': '❌', 
      'WARNING': '⚠️',
      'ERROR': '💥'
    };

    let githubSummary = `### ${statusEmoji[data.overall_status]} Unity Validation Results

**Overall Score:** ${data.overall_score}/10  
**Status:** ${data.overall_status}

| 📊 Metric | Value |
|-----------|-------|
| Tasks Completed | ${data.total_tasks} |
| ✅ Passed | ${data.passed_tasks} |
| ❌ Failed | ${data.failed_tasks} |
| 💥 Errors | ${data.error_tasks} |
| ⏱️ Total Time | ${Math.round(data.total_execution_time / 1000)}s |

`;

    if (data.overall_status !== 'PASSED') {
      githubSummary += `#### 🔧 Actions Required

1. Review detailed validation report
2. Address any critical issues
3. Re-run validation after fixes

`;
    }

    githubSummary += `<details>
<summary>📋 Task Details</summary>

| Task | Status | Score |
|------|--------|-------|
`;

    for (const [taskName, task] of Object.entries(data.task_details)) {
      const status = task.overall_status;
      const emoji = statusEmoji[status] || '❓';
      githubSummary += `| ${taskName} | ${emoji} ${status} | ${task.average_score}/10 |\n`;
    }

    githubSummary += `
</details>
`;

    return githubSummary;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = {
    input: null,
    output: null,
    githubSummary: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input') {
      options.input = args[++i];
    } else if (arg === '--output') {
      options.output = args[++i];
    } else if (arg === '--github-summary') {
      options.githubSummary = true;
    }
  }
  
  if (!options.input || !options.output) {
    console.error('Input and output files are required');
    process.exit(1);
  }
  
  try {
    const generator = new ValidationSummaryGenerator();
    await generator.generateSummary(options.input, options.output, options);
    console.log('Summary generation completed');
  } catch (error) {
    console.error('Summary generation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ValidationSummaryGenerator };
