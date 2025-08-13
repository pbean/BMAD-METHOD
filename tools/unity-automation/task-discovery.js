/**
 * Unity Validation Task Discovery
 * Discovers and configures available validation tasks for automation
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

class TaskDiscovery {
  constructor() {
    this.rootDir = process.cwd();
    this.unityExpansionDir = path.join(this.rootDir, 'expansion-packs', 'bmad-unity-game-dev');
    this.tasksDir = path.join(this.unityExpansionDir, 'tasks');
  }

  async discoverValidationTasks() {
    const validationTasks = [];
    
    try {
      const taskFiles = await fs.readdir(this.tasksDir);
      
      for (const taskFile of taskFiles) {
        if (taskFile.startsWith('validate-') && taskFile.endsWith('.md')) {
          const taskName = taskFile.replace('validate-', '').replace('.md', '');
          const taskPath = path.join(this.tasksDir, taskFile);
          
          const taskConfig = await this.analyzeTask(taskPath, taskName);
          if (taskConfig) {
            validationTasks.push(taskConfig);
          }
        }
      }
      
      console.log(`Discovered ${validationTasks.length} validation tasks`);
      return validationTasks;
    } catch (error) {
      console.error('Error discovering validation tasks:', error);
      return [];
    }
  }

  async analyzeTask(taskPath, taskName) {
    try {
      const content = await fs.readFile(taskPath, 'utf8');
      
      // Extract task metadata
      const config = {
        name: taskName,
        file: taskPath,
        title: this.extractTitle(content),
        purpose: this.extractPurpose(content),
        dependencies: this.extractDependencies(content),
        platforms: this.extractPlatforms(content),
        unityRequired: this.requiresUnity(content),
        estimatedTime: this.estimateExecutionTime(content),
        complexity: this.assessComplexity(content),
        priority: this.determinePriority(taskName)
      };
      
      console.log(`Analyzed task: ${taskName} (Unity: ${config.unityRequired}, Time: ${config.estimatedTime}ms)`);
      return config;
    } catch (error) {
      console.error(`Error analyzing task ${taskName}:`, error);
      return null;
    }
  }

  extractTitle(content) {
    const titleMatch = content.match(/^# (.+)$/m);
    return titleMatch ? titleMatch[1] : 'Unknown Task';
  }

  extractPurpose(content) {
    const purposeMatch = content.match(/## Purpose\n\n(.*?)(?=\n##|\n$)/s);
    return purposeMatch ? purposeMatch[1].trim() : 'No purpose defined';
  }

  extractDependencies(content) {
    const dependencies = [];
    
    // Look for Unity package dependencies
    const packageMatches = content.match(/com\.unity\.\S+/g);
    if (packageMatches) {
      dependencies.push(...packageMatches);
    }
    
    // Look for system dependencies
    if (content.includes('Unity Editor')) dependencies.push('unity-editor');
    if (content.includes('Physics2D')) dependencies.push('physics2d');
    if (content.includes('Physics3D')) dependencies.push('physics3d');
    if (content.includes('Rendering Pipeline')) dependencies.push('render-pipeline');
    
    return dependencies;
  }

  extractPlatforms(content) {
    const platforms = ['cross-platform']; // Default
    
    if (content.includes('mobile') || content.includes('Mobile')) platforms.push('mobile');
    if (content.includes('console') || content.includes('Console')) platforms.push('console');
    if (content.includes('PC') || content.includes('desktop')) platforms.push('desktop');
    if (content.includes('VR') || content.includes('AR')) platforms.push('xr');
    
    return platforms;
  }

  requiresUnity(content) {
    const unityRequiredIndicators = [
      'Unity Editor',
      'EditMode test',
      'PlayMode test',
      'Unity API',
      'UnityEngine',
      'editor-integration',
      '3d-systems',
      '2d-systems'
    ];
    
    return unityRequiredIndicators.some(indicator => content.includes(indicator));
  }

  estimateExecutionTime(content) {
    // Estimate based on content complexity
    const lines = content.split('\n').length;
    const sections = (content.match(/^### /gm) || []).length;
    const validationSteps = (content.match(/validate|verify|check/gi) || []).length;
    
    // Base time + complexity factors
    let estimatedTime = 30000; // 30 seconds base
    estimatedTime += lines * 50; // 50ms per line
    estimatedTime += sections * 2000; // 2 seconds per section
    estimatedTime += validationSteps * 500; // 500ms per validation step
    
    return Math.min(estimatedTime, 300000); // Cap at 5 minutes
  }

  assessComplexity(content) {
    const complexityIndicators = {
      low: ['configuration', 'settings', 'basic'],
      medium: ['integration', 'workflow', 'pipeline'],
      high: ['performance', 'optimization', 'advanced', 'architecture']
    };
    
    const contentLower = content.toLowerCase();
    
    for (const [level, indicators] of Object.entries(complexityIndicators)) {
      if (indicators.some(indicator => contentLower.includes(indicator))) {
        return level;
      }
    }
    
    return 'medium'; // Default
  }

  determinePriority(taskName) {
    const priorityMap = {
      'unity-features': 1,
      '2d-systems': 2,
      '3d-systems': 2,
      'editor-integration': 3,
      'gaming-services': 4,
      'asset-integration': 3
    };
    
    return priorityMap[taskName] || 5;
  }

  async generateTaskMatrix() {
    const tasks = await this.discoverValidationTasks();
    
    // Generate matrix for CI/CD
    const matrix = {
      include: tasks.map(task => ({
        task: task.name,
        title: task.title,
        unity_required: task.unityRequired,
        estimated_time: task.estimatedTime,
        complexity: task.complexity,
        priority: task.priority,
        platforms: task.platforms
      }))
    };
    
    return matrix;
  }
}

async function main() {
  const discovery = new TaskDiscovery();
  
  try {
    const tasks = await discovery.discoverValidationTasks();
    const taskNames = tasks.map(t => t.name);
    
    // Write simple task list for GitHub Actions
    await fs.writeFile('.validation-tasks.json', JSON.stringify(taskNames, null, 2));
    
    // Write full task matrix for advanced usage
    const matrix = await discovery.generateTaskMatrix();
    await fs.writeFile('.validation-matrix.json', JSON.stringify(matrix, null, 2));
    
    console.log('Task discovery completed successfully');
    console.log('Available tasks:', taskNames.join(', '));
    
  } catch (error) {
    console.error('Task discovery failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TaskDiscovery;
