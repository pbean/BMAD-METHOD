const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { glob } = require('glob');

/**
 * Converts BMad workflows to Kiro task sequences
 * Creates workflow-based hooks for automation
 * Integrates with Kiro's task management system
 */
class WorkflowIntegrator {
  constructor(options = {}) {
    // Determine the project root directory
    const projectRoot = this.findProjectRoot();
    
    this.options = {
      sourceDirectories: {
        core: path.join(projectRoot, 'bmad-core/workflows/'),
        expansionPacks: path.join(projectRoot, 'expansion-packs/*/workflows/')
      },
      outputDirectories: {
        hooks: path.join(projectRoot, '.kiro/hooks/'),
        specs: path.join(projectRoot, '.kiro/workflow-specs/'),
        tasks: path.join(projectRoot, '.kiro/workflow-tasks/')
      },
      ...options
    };
  }

  /**
   * Find the project root directory by looking for package.json
   */
  findProjectRoot() {
    let currentDir = __dirname;
    
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    // Fallback to current working directory
    return process.cwd();
  }

  /**
   * Convert all BMad workflows to Kiro format
   */
  async convertAllWorkflows() {
    const results = {
      converted: [],
      errors: [],
      summary: {
        total: 0,
        successful: 0,
        failed: 0
      }
    };

    try {
      // Discover all workflow files
      const workflowFiles = await this.discoverWorkflows();
      results.summary.total = workflowFiles.length;

      // Convert each workflow
      for (const workflowFile of workflowFiles) {
        try {
          const convertedWorkflow = await this.convertWorkflow(workflowFile);
          results.converted.push(convertedWorkflow);
          results.summary.successful++;
        } catch (error) {
          results.errors.push({
            file: workflowFile,
            error: error.message
          });
          results.summary.failed++;
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Workflow conversion failed: ${error.message}`);
    }
  } 
 /**
   * Discover all BMad workflow files
   */
  async discoverWorkflows() {
    const workflowFiles = [];

    // Core workflows
    const corePattern = path.join(this.options.sourceDirectories.core, '*.yaml');
    const coreFiles = await glob(corePattern);
    workflowFiles.push(...coreFiles.map(file => ({
      path: file,
      source: 'bmad-core',
      expansionPack: null
    })));

    // Expansion pack workflows
    const expansionPattern = this.options.sourceDirectories.expansionPacks;
    const expansionDirs = await glob(expansionPattern);
    
    for (const expansionDir of expansionDirs) {
      const expansionName = path.basename(path.dirname(expansionDir));
      const workflowPattern = path.join(expansionDir, '*.yaml');
      const expansionFiles = await glob(workflowPattern);
      
      workflowFiles.push(...expansionFiles.map(file => ({
        path: file,
        source: 'expansion-pack',
        expansionPack: expansionName
      })));
    }

    return workflowFiles;
  }

  /**
   * Convert a single BMad workflow to Kiro format
   */
  async convertWorkflow(workflowFile) {
    const workflowContent = await fs.readFile(workflowFile.path, 'utf8');
    const workflowData = yaml.load(workflowContent);

    if (!workflowData.workflow) {
      throw new Error(`Invalid workflow format: missing workflow section in ${workflowFile.path}`);
    }

    const workflow = workflowData.workflow;

    // Extract workflow metadata
    const workflowInfo = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      type: workflow.type,
      projectTypes: workflow.project_types || [],
      source: workflowFile.source,
      expansionPack: workflowFile.expansionPack,
      originalPath: workflowFile.path
    };

    // Convert workflow to different Kiro formats
    const conversions = {
      hook: await this.convertToHook(workflow, workflowInfo),
      spec: await this.convertToSpec(workflow, workflowInfo),
      tasks: await this.convertToTasks(workflow, workflowInfo)
    };

    return {
      workflowInfo,
      conversions
    };
  }

  /**
   * Convert workflow to Kiro hook format
   */
  async convertToHook(workflow, workflowInfo) {
    const hookName = `${workflowInfo.source === 'expansion-pack' ? workflowInfo.expansionPack + '-' : ''}${workflow.id}`;
    
    const hook = {
      name: workflow.name,
      description: workflow.description,
      trigger: 'manual', // Most BMad workflows are manually triggered
      conditions: this.extractHookConditions(workflow),
      actions: this.extractHookActions(workflow),
      metadata: {
        originalWorkflow: workflowInfo.id,
        source: workflowInfo.source,
        expansionPack: workflowInfo.expansionPack,
        projectTypes: workflowInfo.projectTypes
      }
    };

    // Write hook file
    const hookPath = path.join(this.options.outputDirectories.hooks, `${hookName}.json`);
    await fs.ensureDir(path.dirname(hookPath));
    await fs.writeFile(hookPath, JSON.stringify(hook, null, 2));

    return {
      type: 'hook',
      path: hookPath,
      content: hook
    };
  }  /**
  
 * Convert workflow to Kiro spec format
   */
  async convertToSpec(workflow, workflowInfo) {
    const specName = `${workflowInfo.source === 'expansion-pack' ? workflowInfo.expansionPack + '-' : ''}${workflow.id}`;
    
    const spec = {
      specType: 'bmad-workflow',
      originalWorkflow: workflowInfo,
      requirements: this.extractWorkflowRequirements(workflow),
      design: this.extractWorkflowDesign(workflow, workflowInfo),
      tasks: this.extractWorkflowTasks(workflow)
    };

    // Generate spec content
    const specContent = this.generateWorkflowSpecContent(spec);
    
    // Write spec file
    const specPath = path.join(this.options.outputDirectories.specs, `${specName}.md`);
    await fs.ensureDir(path.dirname(specPath));
    await fs.writeFile(specPath, specContent);

    return {
      type: 'spec',
      path: specPath,
      content: spec
    };
  }

  /**
   * Convert workflow to Kiro task sequences
   */
  async convertToTasks(workflow, workflowInfo) {
    const taskName = `${workflowInfo.source === 'expansion-pack' ? workflowInfo.expansionPack + '-' : ''}${workflow.id}`;
    
    const taskSequences = this.extractTaskSequences(workflow);
    
    // Write task sequences file
    const tasksPath = path.join(this.options.outputDirectories.tasks, `${taskName}-tasks.md`);
    await fs.ensureDir(path.dirname(tasksPath));
    
    const taskContent = this.generateTaskSequenceContent(taskSequences, workflowInfo);
    await fs.writeFile(tasksPath, taskContent);

    return {
      type: 'tasks',
      path: tasksPath,
      content: taskSequences
    };
  }

  /**
   * Extract hook conditions from workflow
   */
  extractHookConditions(workflow) {
    const conditions = [];
    
    // Add project type conditions
    if (workflow.project_types && workflow.project_types.length > 0) {
      conditions.push({
        type: 'project_type',
        values: workflow.project_types
      });
    }

    // Add workflow type condition
    if (workflow.type) {
      conditions.push({
        type: 'workflow_type',
        value: workflow.type
      });
    }

    return conditions;
  }

  /**
   * Extract hook actions from workflow
   */
  extractHookActions(workflow) {
    const actions = [];
    
    // Extract main sequence actions
    if (workflow.sequence) {
      workflow.sequence.forEach((step, index) => {
        if (step.agent) {
          actions.push({
            type: 'agent_activation',
            agent: step.agent,
            creates: step.creates,
            requires: step.requires,
            notes: step.notes,
            order: index + 1
          });
        } else if (step.action) {
          actions.push({
            type: 'workflow_action',
            action: step.action,
            description: step.notes,
            order: index + 1
          });
        }
      });
    }

    return actions;
  }  
/**
   * Extract requirements from workflow
   */
  extractWorkflowRequirements(workflow) {
    const requirements = {
      introduction: `Requirements for the ${workflow.name} workflow process.`,
      requirements: []
    };

    // Generate requirements based on workflow sequence
    if (workflow.sequence) {
      requirements.requirements.push({
        id: 'R1',
        userStory: 'As a user, I want to follow a structured workflow process, so that I can achieve consistent and high-quality results.',
        acceptanceCriteria: [
          'WHEN the workflow is initiated THEN it SHALL guide the user through each step in sequence',
          'WHEN each step is completed THEN it SHALL validate the output before proceeding',
          'WHEN the workflow is complete THEN it SHALL have produced all required deliverables'
        ]
      });

      // Add agent-specific requirements
      const agents = [...new Set(workflow.sequence.filter(s => s.agent).map(s => s.agent))];
      if (agents.length > 0) {
        requirements.requirements.push({
          id: 'R2',
          userStory: 'As a user, I want to work with specialized agents, so that I can leverage domain expertise for each workflow step.',
          acceptanceCriteria: agents.map((agent, index) => 
            `WHEN the ${agent} agent is activated THEN it SHALL provide domain-specific guidance and outputs`
          )
        });
      }
    }

    return requirements;
  }

  /**
   * Extract design information from workflow
   */
  extractWorkflowDesign(workflow, workflowInfo) {
    const design = {
      overview: `This design describes the ${workflow.name} workflow implementation in Kiro. ${workflow.description}`,
      architecture: this.extractWorkflowArchitecture(workflow),
      components: this.extractWorkflowComponents(workflow),
      dataModels: this.extractWorkflowDataModels(workflow),
      errorHandling: 'Workflow includes validation at each step, rollback capabilities, and clear error messaging.',
      testingStrategy: 'Workflow validation through step completion checks, output verification, and end-to-end workflow testing.'
    };

    return design;
  }

  /**
   * Extract workflow architecture
   */
  extractWorkflowArchitecture(workflow) {
    const sequenceLength = workflow.sequence ? workflow.sequence.length : 0;
    const agents = workflow.sequence ? [...new Set(workflow.sequence.filter(s => s.agent).map(s => s.agent))] : [];
    const hasDecisionPoints = workflow.sequence ? workflow.sequence.some(s => s.condition) : false;
    const hasOptionalSteps = workflow.sequence ? workflow.sequence.some(s => s.optional_steps) : false;

    return `Workflow Architecture:
- Type: ${workflow.type || 'standard'}
- Sequence Length: ${sequenceLength} steps
- Agents Involved: ${agents.length} (${agents.join(', ')})
- Decision Points: ${hasDecisionPoints ? 'Yes' : 'No'}
- Optional Steps: ${hasOptionalSteps ? 'Yes' : 'No'}
- Project Types: ${workflow.project_types ? workflow.project_types.join(', ') : 'Any'}`;
  }

  /**
   * Extract workflow components
   */
  extractWorkflowComponents(workflow) {
    const components = [];

    if (workflow.sequence) {
      workflow.sequence.forEach((step, index) => {
        if (step.agent) {
          components.push({
            name: `${step.agent} Agent Step`,
            type: 'agent_step',
            responsibility: `Execute ${step.agent} agent to create ${step.creates || 'output'}`,
            dependencies: step.requires ? (Array.isArray(step.requires) ? step.requires : [step.requires]) : [],
            optional: step.optional || false
          });
        } else if (step.action) {
          components.push({
            name: step.action,
            type: 'workflow_action',
            responsibility: step.notes || 'Execute workflow action',
            dependencies: [],
            optional: step.optional || false
          });
        }
      });
    }

    return components;
  }

  /**
   * Extract workflow data models
   */
  extractWorkflowDataModels(workflow) {
    const models = [];

    // Extract deliverables as data models
    if (workflow.sequence) {
      const deliverables = workflow.sequence
        .filter(step => step.creates)
        .map(step => step.creates);

      deliverables.forEach(deliverable => {
        models.push({
          name: deliverable,
          type: 'deliverable',
          purpose: 'Workflow output artifact',
          attributes: ['content', 'metadata', 'validation_status']
        });
      });
    }

    return models;
  }  /**

   * Extract workflow tasks
   */
  extractWorkflowTasks(workflow) {
    const tasks = [];
    let taskCounter = 1;

    // Generate initialization task
    tasks.push({
      id: `${taskCounter}`,
      title: 'Initialize workflow',
      description: `Set up the ${workflow.name} workflow environment and validate prerequisites`,
      requirements: ['R1'],
      subtasks: [
        'Validate workflow prerequisites',
        'Initialize workflow state tracking',
        'Prepare agent activation environment'
      ]
    });
    taskCounter++;

    // Generate tasks for each workflow step
    if (workflow.sequence) {
      workflow.sequence.forEach((step, index) => {
        if (step.agent) {
          tasks.push({
            id: `${taskCounter}`,
            title: `Execute ${step.agent} agent step`,
            description: `Activate ${step.agent} agent to ${step.creates ? `create ${step.creates}` : 'complete assigned work'}`,
            requirements: ['R1', 'R2'],
            subtasks: [
              `Activate ${step.agent} agent`,
              step.requires ? `Provide required inputs: ${Array.isArray(step.requires) ? step.requires.join(', ') : step.requires}` : 'Gather necessary inputs',
              step.creates ? `Generate ${step.creates}` : 'Complete agent tasks',
              'Validate agent output',
              'Update workflow state'
            ]
          });
        } else if (step.action) {
          tasks.push({
            id: `${taskCounter}`,
            title: `Execute ${step.action}`,
            description: step.notes || `Perform workflow action: ${step.action}`,
            requirements: ['R1'],
            subtasks: [
              'Prepare action environment',
              'Execute action steps',
              'Validate action results',
              'Update workflow progress'
            ]
          });
        }
        taskCounter++;
      });
    }

    // Generate completion task
    tasks.push({
      id: `${taskCounter}`,
      title: 'Complete workflow',
      description: `Finalize the ${workflow.name} workflow and validate all deliverables`,
      requirements: ['R1'],
      subtasks: [
        'Validate all workflow deliverables',
        'Generate workflow completion report',
        'Archive workflow artifacts',
        'Prepare for next phase'
      ]
    });

    return tasks;
  }

  /**
   * Extract task sequences from workflow
   */
  extractTaskSequences(workflow) {
    const sequences = [];

    if (workflow.sequence) {
      let currentSequence = {
        name: 'Main Workflow Sequence',
        steps: []
      };

      workflow.sequence.forEach((step, index) => {
        currentSequence.steps.push({
          order: index + 1,
          type: step.agent ? 'agent_step' : 'action_step',
          agent: step.agent,
          action: step.action,
          creates: step.creates,
          requires: step.requires,
          notes: step.notes,
          optional: step.optional || false,
          condition: step.condition
        });
      });

      sequences.push(currentSequence);
    }

    // Add alternative sequences if they exist
    if (workflow.prototype_sequence) {
      sequences.push({
        name: 'Prototype Sequence',
        steps: workflow.prototype_sequence.map((step, index) => ({
          order: index + 1,
          type: step.agent ? 'agent_step' : 'action_step',
          agent: step.agent,
          action: step.action,
          creates: step.creates,
          requires: step.requires,
          notes: step.notes,
          optional: step.optional || false,
          condition: step.condition
        }))
      });
    }

    return sequences;
  }  /**
  
 * Generate workflow spec content
   */
  generateWorkflowSpecContent(spec) {
    const { originalWorkflow, requirements, design, tasks } = spec;
    
    let content = `# ${originalWorkflow.name} - Workflow Spec\n\n`;
    
    // Metadata
    content += `## Workflow Information\n\n`;
    content += `- **Original ID**: ${originalWorkflow.id}\n`;
    content += `- **Type**: ${originalWorkflow.type}\n`;
    content += `- **Source**: ${originalWorkflow.source}\n`;
    if (originalWorkflow.expansionPack) {
      content += `- **Expansion Pack**: ${originalWorkflow.expansionPack}\n`;
    }
    content += `- **Project Types**: ${originalWorkflow.projectTypes.join(', ')}\n`;
    content += `- **Original Path**: ${originalWorkflow.originalPath}\n\n`;
    content += `**Description**: ${originalWorkflow.description}\n\n`;

    // Requirements
    content += `## Requirements\n\n`;
    content += `${requirements.introduction}\n\n`;
    requirements.requirements.forEach(req => {
      content += `### ${req.id}\n\n`;
      content += `**User Story**: ${req.userStory}\n\n`;
      content += `**Acceptance Criteria**:\n`;
      req.acceptanceCriteria.forEach((criteria, index) => {
        content += `${index + 1}. ${criteria}\n`;
      });
      content += `\n`;
    });

    // Design
    content += `## Design\n\n`;
    content += `### Overview\n${design.overview}\n\n`;
    content += `### Architecture\n${design.architecture}\n\n`;
    
    if (design.components.length > 0) {
      content += `### Components\n`;
      design.components.forEach(component => {
        content += `- **${component.name}** (${component.type}): ${component.responsibility}\n`;
        if (component.dependencies.length > 0) {
          content += `  - Dependencies: ${component.dependencies.join(', ')}\n`;
        }
      });
      content += `\n`;
    }

    if (design.dataModels.length > 0) {
      content += `### Data Models\n`;
      design.dataModels.forEach(model => {
        content += `- **${model.name}** (${model.type}): ${model.purpose}\n`;
      });
      content += `\n`;
    }

    content += `### Error Handling\n${design.errorHandling}\n\n`;
    content += `### Testing Strategy\n${design.testingStrategy}\n\n`;

    // Tasks
    content += `## Implementation Tasks\n\n`;
    tasks.forEach(task => {
      content += `### ${task.id}. ${task.title}\n\n`;
      content += `${task.description}\n\n`;
      content += `**Requirements**: ${task.requirements.join(', ')}\n\n`;
      if (task.subtasks && task.subtasks.length > 0) {
        content += `**Subtasks**:\n`;
        task.subtasks.forEach(subtask => {
          content += `- ${subtask}\n`;
        });
        content += `\n`;
      }
    });

    return content;
  }

  /**
   * Generate task sequence content
   */
  generateTaskSequenceContent(sequences, workflowInfo) {
    let content = `# ${workflowInfo.name} - Task Sequences\n\n`;
    
    content += `## Workflow Information\n\n`;
    content += `- **ID**: ${workflowInfo.id}\n`;
    content += `- **Type**: ${workflowInfo.type}\n`;
    content += `- **Source**: ${workflowInfo.source}\n`;
    if (workflowInfo.expansionPack) {
      content += `- **Expansion Pack**: ${workflowInfo.expansionPack}\n`;
    }
    content += `\n**Description**: ${workflowInfo.description}\n\n`;

    sequences.forEach(sequence => {
      content += `## ${sequence.name}\n\n`;
      
      sequence.steps.forEach(step => {
        content += `### Step ${step.order}: `;
        if (step.agent) {
          content += `${step.agent} Agent`;
        } else if (step.action) {
          content += step.action;
        }
        content += `\n\n`;

        if (step.creates) {
          content += `**Creates**: ${step.creates}\n`;
        }
        if (step.requires) {
          const requires = Array.isArray(step.requires) ? step.requires.join(', ') : step.requires;
          content += `**Requires**: ${requires}\n`;
        }
        if (step.condition) {
          content += `**Condition**: ${step.condition}\n`;
        }
        if (step.optional) {
          content += `**Optional**: Yes\n`;
        }
        if (step.notes) {
          content += `\n**Notes**: ${step.notes}\n`;
        }
        content += `\n`;
      });
    });

    return content;
  }

  /**
   * Get workflow conversion statistics
   */
  async getConversionStats() {
    const workflowFiles = await this.discoverWorkflows();
    const coreWorkflows = workflowFiles.filter(w => w.source === 'bmad-core');
    const expansionWorkflows = workflowFiles.filter(w => w.source === 'expansion-pack');
    
    const expansionPacks = [...new Set(expansionWorkflows.map(w => w.expansionPack))];

    return {
      total: workflowFiles.length,
      core: coreWorkflows.length,
      expansionPacks: expansionPacks.length,
      expansionWorkflows: expansionWorkflows.length,
      expansionPackBreakdown: expansionPacks.map(pack => ({
        name: pack,
        workflows: expansionWorkflows.filter(w => w.expansionPack === pack).length
      }))
    };
  }
}

module.exports = WorkflowIntegrator;