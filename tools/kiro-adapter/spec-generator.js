/**
 * Spec Generator
 * Converts BMad planning workflows into native Kiro specs
 */

const BaseTransformer = require('./base-transformer');
const path = require('path');
const fs = require('fs-extra');

class SpecGenerator extends BaseTransformer {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Generate Kiro spec from BMad workflow
   * @param {string} workflowPath - Path to BMad workflow
   * @param {string} specOutputPath - Output path for Kiro spec
   * @returns {Promise<boolean>} - Success status
   */
  async generateSpecFromBMadWorkflow(workflowPath, specOutputPath) {
    this.log(`Generating spec from workflow: ${this.getRelativePath(workflowPath)} -> ${this.getRelativePath(specOutputPath)}`);
    
    try {
      // Read the workflow file
      const workflowContent = await this.readFile(workflowPath);
      if (!workflowContent) {
        this.log(`Failed to read workflow file: ${workflowPath}`, 'error');
        return false;
      }

      // Parse workflow YAML
      const yaml = require('js-yaml');
      const workflow = yaml.load(workflowContent);
      
      if (!workflow || !workflow.workflow) {
        this.log('Invalid workflow format', 'error');
        return false;
      }

      // Ensure spec output directory exists
      await fs.ensureDir(specOutputPath);

      // Generate requirements.md from workflow
      const requirementsContent = this.createRequirementsFromWorkflow(workflow);
      const requirementsPath = path.join(specOutputPath, 'requirements.md');
      await this.writeFile(requirementsPath, requirementsContent);

      // Generate design.md from workflow
      const designContent = this.createDesignFromWorkflow(workflow);
      const designPath = path.join(specOutputPath, 'design.md');
      await this.writeFile(designPath, designContent);

      // Generate tasks.md from workflow
      const tasksContent = this.createTasksFromWorkflow(workflow);
      const tasksPath = path.join(specOutputPath, 'tasks.md');
      await this.writeFile(tasksPath, tasksContent);

      this.log(`Successfully generated Kiro spec at: ${this.getRelativePath(specOutputPath)}`);
      return true;

    } catch (error) {
      this.log(`Error generating spec from workflow: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Create requirements.md from BMad PRD template
   * @param {Object} prdTemplate - PRD template data
   * @returns {string} - Requirements document content
   */
  createRequirementsFromPRD(prdTemplate) {
    if (!prdTemplate || !prdTemplate.template) {
      return this.createEmptyRequirements();
    }

    const template = prdTemplate.template;
    let content = `# Requirements Document

## Introduction

${template.name || 'Feature Requirements'} - Generated from BMad PRD Template

This document outlines the requirements for ${template.output?.title || 'the feature'}, converted from BMad Method planning workflow to Kiro spec format.

## Requirements

`;

    // Extract requirements from PRD template sections
    if (template.sections) {
      let reqNumber = 1;
      
      for (const section of template.sections) {
        if (this.isRequirementSection(section)) {
          content += this.convertSectionToRequirement(section, reqNumber);
          reqNumber++;
        }
      }
    }

    return content;
  }

  /**
   * Create design.md from BMad Architecture template
   * @param {Object} archTemplate - Architecture template data
   * @returns {string} - Design document content
   */
  createDesignFromArchitecture(archTemplate) {
    if (!archTemplate || !archTemplate.template) {
      return this.createEmptyDesign();
    }

    const template = archTemplate.template;
    let content = `# Design Document

## Overview

${template.name || 'Architecture Design'} - Generated from BMad Architecture Template

This document outlines the design for ${template.output?.title || 'the system'}, converted from BMad Method architecture workflow to Kiro spec format.

## Architecture

`;

    // Extract architecture sections
    if (template.sections) {
      for (const section of template.sections) {
        if (this.isArchitectureSection(section)) {
          content += this.convertArchitectureSection(section);
        }
      }
    }

    content += `
## Components and Interfaces

[Component definitions will be populated during architecture phase]

## Data Models

[Data model definitions will be populated during architecture phase]

## Error Handling

[Error handling strategy will be defined during architecture phase]

## Testing Strategy

[Testing approach will be defined during architecture phase]
`;

    return content;
  }

  /**
   * Create tasks.md from BMad development stories
   * @param {Object} storiesData - Stories data
   * @returns {string} - Tasks document content
   */
  createTasksFromStories(storiesData) {
    if (!storiesData || !Array.isArray(storiesData)) {
      return this.createEmptyTasks();
    }

    let content = `# Implementation Plan

`;

    let taskNumber = 1;
    for (const story of storiesData) {
      content += this.convertStoryToExecutableTask(story, taskNumber);
      taskNumber++;
    }

    return content;
  }

  /**
   * Create tasks from BMad story template structure
   * @param {Object} storyTemplate - BMad story template
   * @returns {string} - Tasks document content
   */
  createTasksFromStoryTemplate(storyTemplate) {
    if (!storyTemplate) {
      console.log('No story template found');
      return this.createEmptyTasks();
    }

    let content = `# Implementation Plan

`;

    // Check for sections at root level or under template
    let sections = storyTemplate.sections;
    if (!sections && storyTemplate.template) {
      sections = storyTemplate.template.sections;
    }

    if (sections && Array.isArray(sections)) {
      let taskNumber = 1;
      
      // Group related sections into executable tasks
      const taskGroups = this.groupStoryTemplateIntoTasks(sections);
      
      for (const taskGroup of taskGroups) {
        content += this.convertTaskGroupToKiroTask(taskGroup, taskNumber);
        taskNumber++;
      }
    } else {
      // No sections found - creating tasks from template structure
      
      // Create tasks based on template metadata
      const template = storyTemplate.template || storyTemplate;
      
      content += `- [ ] 1. Create story document structure
  - Set up story template: ${template.name || 'Story Document'}
  - Configure story format: ${template.output?.format || 'markdown'}
  - Define story workflow: ${storyTemplate.workflow?.mode || 'interactive'}
  - Context: #File, #Folder
  - Agent: bmad-sm
  - _Requirements: Story template setup_

`;

      // Add tasks based on agent config if available
      if (storyTemplate.agent_config?.editable_sections) {
        content += `- [ ] 2. Implement story sections
  - Editable sections: ${storyTemplate.agent_config.editable_sections.join(', ')}
  - Enable section editing workflow
  - Context: #File, #Codebase
  - Agent: bmad-sm
  - _Requirements: Story section management_

`;
      }
    }

    return content;
  }

  /**
   * Create requirements from workflow
   * @private
   */
  createRequirementsFromWorkflow(workflow) {
    const workflowData = workflow.workflow;
    
    let content = `# Requirements Document

## Introduction

${workflowData.name || 'Feature Requirements'} - Generated from BMad Workflow

${workflowData.description || 'This document outlines the requirements for the feature, converted from BMad Method planning workflow to Kiro spec format.'}

## Requirements

`;

    // Convert workflow sequence to requirements
    if (workflowData.sequence) {
      let reqNumber = 1;
      
      for (const step of workflowData.sequence) {
        if (step.agent && step.creates) {
          content += `### Requirement ${reqNumber}

**User Story:** As a developer using BMad Method, I want the ${step.agent} agent to create ${step.creates}, so that I can follow the structured development workflow.

#### Acceptance Criteria

1. WHEN the ${step.agent} agent is invoked THEN it SHALL create ${step.creates}
`;
          
          if (step.requires) {
            const requires = Array.isArray(step.requires) ? step.requires : [step.requires];
            content += `2. WHEN creating ${step.creates} THEN the system SHALL have access to ${requires.join(', ')}\n`;
          }
          
          if (step.notes) {
            content += `3. WHEN the task is complete THEN ${step.notes.replace(/\n/g, ' ').substring(0, 100)}...\n`;
          }
          
          content += '\n';
          reqNumber++;
        }
      }
    }

    return content;
  }

  /**
   * Create design from workflow
   * @private
   */
  createDesignFromWorkflow(workflow) {
    const workflowData = workflow.workflow;
    
    let content = `# Design Document

## Overview

${workflowData.name || 'System Design'} - Generated from BMad Workflow

${workflowData.description || 'This document outlines the design for the system, converted from BMad Method workflow to Kiro spec format.'}

## Architecture

### Workflow Architecture

The system follows the BMad Method ${workflowData.type || 'development'} workflow pattern:

`;

    // Add workflow diagram if available
    if (workflowData.flow_diagram) {
      content += workflowData.flow_diagram + '\n\n';
    }

    // Add sequence information
    if (workflowData.sequence) {
      content += `### Process Flow

The workflow consists of ${workflowData.sequence.length} main steps:

`;
      
      for (let i = 0; i < workflowData.sequence.length; i++) {
        const step = workflowData.sequence[i];
        content += `${i + 1}. **${step.agent || 'System'}**: ${step.creates || step.action || 'Performs workflow step'}\n`;
      }
      
      content += '\n';
    }

    content += `
## Components and Interfaces

### Agent Components

The system utilizes specialized BMad agents for different workflow phases:

`;

    // Extract unique agents from sequence
    if (workflowData.sequence) {
      const agents = [...new Set(workflowData.sequence.map(step => step.agent).filter(Boolean))];
      
      for (const agent of agents) {
        content += `- **${agent}**: Handles ${agent}-specific workflow tasks\n`;
      }
    }

    content += `
## Data Models

### Workflow Artifacts

The workflow produces the following key artifacts:

`;

    // Extract artifacts from sequence
    if (workflowData.sequence) {
      const artifacts = [...new Set(workflowData.sequence.map(step => step.creates).filter(Boolean))];
      
      for (const artifact of artifacts) {
        content += `- **${artifact}**: Generated during workflow execution\n`;
      }
    }

    content += `
## Error Handling

Error handling follows BMad Method best practices:

- Workflow validation at each step
- Artifact dependency checking
- Agent handoff verification
- Rollback capabilities for failed steps

## Testing Strategy

Testing approach for BMad workflow integration:

- Unit tests for individual workflow steps
- Integration tests for agent handoffs
- End-to-end workflow validation
- Artifact quality verification
`;

    return content;
  }

  /**
   * Create tasks from workflow
   * @private
   */
  createTasksFromWorkflow(workflow) {
    const workflowData = workflow.workflow;
    
    let content = `# Implementation Plan

`;

    if (workflowData.sequence) {
      let taskNumber = 1;
      
      for (const step of workflowData.sequence) {
        if (step.agent && (step.creates || step.action)) {
          content += `- [ ] ${taskNumber}. Implement ${step.agent} agent workflow step
  - ${step.creates ? `Create ${step.creates}` : `Execute ${step.action}`}
`;
          
          if (step.requires) {
            const requires = Array.isArray(step.requires) ? step.requires : [step.requires];
            content += `  - Ensure access to required inputs: ${requires.join(', ')}\n`;
          }
          
          if (step.notes) {
            const notes = step.notes.replace(/\n/g, ' ').substring(0, 150);
            content += `  - Implementation notes: ${notes}${notes.length >= 150 ? '...' : ''}\n`;
          }
          
          content += `  - _Requirements: Workflow step ${taskNumber}_\n\n`;
          taskNumber++;
        }
      }
    }

    return content;
  }

  /**
   * Helper methods for template processing
   * @private
   */
  isRequirementSection(section) {
    const requirementKeywords = ['requirements', 'functional', 'non-functional', 'goals', 'epic'];
    return requirementKeywords.some(keyword => 
      section.id?.toLowerCase().includes(keyword) || 
      section.title?.toLowerCase().includes(keyword)
    );
  }

  isArchitectureSection(section) {
    const archKeywords = ['architecture', 'technical', 'tech-stack', 'components', 'data-models'];
    return archKeywords.some(keyword => 
      section.id?.toLowerCase().includes(keyword) || 
      section.title?.toLowerCase().includes(keyword)
    );
  }

  convertSectionToRequirement(section, reqNumber) {
    let content = `### Requirement ${reqNumber}

**User Story:** As a user, I want ${section.title || section.id}, so that I can achieve the intended functionality.

#### Acceptance Criteria

`;

    if (section.instruction) {
      content += `1. WHEN implementing this requirement THEN the system SHALL ${section.instruction}\n`;
    }

    if (section.sections) {
      let criteriaNumber = 2;
      for (const subsection of section.sections) {
        content += `${criteriaNumber}. WHEN ${subsection.title || subsection.id} is needed THEN the system SHALL provide appropriate functionality\n`;
        criteriaNumber++;
      }
    }

    content += '\n';
    return content;
  }

  convertArchitectureSection(section) {
    let content = `### ${section.title || section.id}

`;

    if (section.instruction) {
      content += `${section.instruction}\n\n`;
    }

    if (section.sections) {
      for (const subsection of section.sections) {
        content += `#### ${subsection.title || subsection.id}\n\n`;
        if (subsection.instruction) {
          content += `${subsection.instruction}\n\n`;
        }
      }
    }

    return content;
  }

  convertStoryToExecutableTask(story, taskNumber) {
    let content = `- [ ] ${taskNumber}. ${story.title || `Implement Story ${taskNumber}`}
`;

    if (story.description) {
      content += `  - ${story.description}\n`;
    }

    // Add story details as task context
    if (story.userStory) {
      content += `  - User Story: ${story.userStory}\n`;
    }

    // Convert acceptance criteria to task requirements
    if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
      content += `  - Acceptance Criteria:\n`;
      for (let i = 0; i < story.acceptanceCriteria.length; i++) {
        content += `    - AC${i + 1}: ${story.acceptanceCriteria[i]}\n`;
      }
    }

    // Add subtasks if available
    if (story.tasks && Array.isArray(story.tasks)) {
      for (let i = 0; i < story.tasks.length; i++) {
        const subtask = story.tasks[i];
        content += `- [ ] ${taskNumber}.${i + 1} ${subtask.title || subtask}\n`;
        if (subtask.description) {
          content += `  - ${subtask.description}\n`;
        }
        if (subtask.acceptanceCriteria) {
          content += `  - Acceptance criteria reference: AC${subtask.acceptanceCriteria}\n`;
        }
      }
    }

    // Add dependency information
    if (story.dependencies && Array.isArray(story.dependencies)) {
      content += `  - Dependencies: ${story.dependencies.join(', ')}\n`;
    }

    // Add context integration for automatic agent invocation
    content += `  - Context: #File, #Folder, #Codebase\n`;
    content += `  - Agent: bmad-dev\n`;

    content += `  - _Requirements: ${story.requirementRefs || `Story ${taskNumber}`}_\n\n`;
    return content;
  }

  /**
   * Group story template sections into logical executable tasks
   * @private
   */
  groupStoryTemplateIntoTasks(sections) {
    const taskGroups = [];
    
    // Debug: log section IDs to understand the structure (can be removed in production)
    // console.log('Available sections:', sections.map(s => s.id));
    
    // Group 1: Story Creation and Planning
    const planningGroup = {
      title: 'Create and plan story',
      sections: sections.filter(s => 
        ['status', 'story', 'acceptance-criteria'].includes(s.id)
      ),
      agent: 'bmad-sm',
      context: ['#File', '#Folder']
    };
    if (planningGroup.sections.length > 0) {
      taskGroups.push(planningGroup);
    }

    // Group 2: Task Breakdown and Development Notes
    const breakdownGroup = {
      title: 'Break down story into implementation tasks',
      sections: sections.filter(s => 
        ['tasks-subtasks', 'dev-notes'].includes(s.id)
      ),
      agent: 'bmad-sm',
      context: ['#File', '#Codebase', '#Problems']
    };
    if (breakdownGroup.sections.length > 0) {
      taskGroups.push(breakdownGroup);
    }

    // Group 3: Implementation
    const implementationGroup = {
      title: 'Implement story functionality',
      sections: sections.filter(s => 
        ['dev-agent-record'].includes(s.id) || s.owner === 'dev-agent'
      ),
      agent: 'bmad-dev',
      context: ['#File', '#Folder', '#Codebase', '#Problems', '#Terminal', '#Git Diff']
    };
    if (implementationGroup.sections.length > 0) {
      taskGroups.push(implementationGroup);
    }

    // Group 4: Quality Assurance
    const qaGroup = {
      title: 'Review and validate story implementation',
      sections: sections.filter(s => 
        ['qa-results'].includes(s.id) || s.owner === 'qa-agent'
      ),
      agent: 'bmad-qa',
      context: ['#File', '#Folder', '#Problems', '#Git Diff']
    };
    if (qaGroup.sections.length > 0) {
      taskGroups.push(qaGroup);
    }

    // If no groups were created, create a generic task group
    if (taskGroups.length === 0) {
      taskGroups.push({
        title: 'Implement story workflow',
        sections: sections.slice(0, Math.min(3, sections.length)), // Take first few sections
        agent: 'bmad-dev',
        context: ['#File', '#Folder', '#Codebase']
      });
    }

    return taskGroups;
  }

  /**
   * Convert task group to Kiro task format
   * @private
   */
  convertTaskGroupToKiroTask(taskGroup, taskNumber) {
    let content = `- [ ] ${taskNumber}. ${taskGroup.title}
`;

    // Add section details
    if (taskGroup.sections && taskGroup.sections.length > 0) {
      for (const section of taskGroup.sections) {
        content += `  - ${section.title || section.id}: ${section.instruction || 'Complete section requirements'}\n`;
      }
    }

    // Add context integration
    if (taskGroup.context && taskGroup.context.length > 0) {
      content += `  - Context: ${taskGroup.context.join(', ')}\n`;
    }

    // Add agent assignment
    if (taskGroup.agent) {
      content += `  - Agent: ${taskGroup.agent}\n`;
    }

    // Add task dependency mapping
    if (taskNumber > 1) {
      content += `  - Dependencies: Task ${taskNumber - 1} completion\n`;
    }

    content += `  - _Requirements: Story workflow step ${taskNumber}_\n\n`;
    return content;
  }

  createEmptyRequirements() {
    return `# Requirements Document

## Introduction

This document outlines the requirements for the feature.

## Requirements

### Requirement 1

**User Story:** As a user, I want [functionality], so that I can [benefit].

#### Acceptance Criteria

1. WHEN [condition] THEN the system SHALL [response]

`;
  }

  createEmptyDesign() {
    return `# Design Document

## Overview

This document outlines the design for the system.

## Architecture

[Architecture description]

## Components and Interfaces

[Component definitions]

## Data Models

[Data model definitions]

## Error Handling

[Error handling strategy]

## Testing Strategy

[Testing approach]
`;
  }

  /**
   * Create tasks with proper dependency mapping
   * @param {Array} stories - Array of BMad stories
   * @param {Object} options - Task generation options
   * @returns {string} - Tasks document with dependency mapping
   */
  createTasksWithDependencyMapping(stories, options = {}) {
    if (!stories || !Array.isArray(stories)) {
      return this.createEmptyTasks();
    }

    let content = `# Implementation Plan

`;

    // Sort stories by epic and story number if available
    const sortedStories = this.sortStoriesByDependency(stories);
    
    let taskNumber = 1;
    const taskDependencies = new Map();

    for (const story of sortedStories) {
      const taskInfo = this.convertStoryToExecutableTaskWithDeps(story, taskNumber, taskDependencies);
      content += taskInfo.content;
      
      // Track dependencies for future tasks
      taskDependencies.set(taskNumber, {
        title: story.title,
        outputs: story.outputs || [],
        requirements: story.requirements || []
      });
      
      taskNumber++;
    }

    return content;
  }

  /**
   * Sort stories by dependency order
   * @private
   */
  sortStoriesByDependency(stories) {
    // Simple sorting by epic.story number if available
    return stories.sort((a, b) => {
      const aEpic = a.epicNumber || 0;
      const bEpic = b.epicNumber || 0;
      const aStory = a.storyNumber || 0;
      const bStory = b.storyNumber || 0;
      
      if (aEpic !== bEpic) {
        return aEpic - bEpic;
      }
      return aStory - bStory;
    });
  }

  /**
   * Convert story to executable task with dependency tracking
   * @private
   */
  convertStoryToExecutableTaskWithDeps(story, taskNumber, existingDeps) {
    let content = `- [ ] ${taskNumber}. ${story.title || `Implement Story ${taskNumber}`}
`;

    // Add story context
    if (story.userStory) {
      content += `  - User Story: ${story.userStory}\n`;
    } else if (story.description) {
      content += `  - Description: ${story.description}\n`;
    }

    // Add acceptance criteria as task requirements
    if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
      content += `  - Acceptance Criteria:\n`;
      for (let i = 0; i < story.acceptanceCriteria.length; i++) {
        content += `    - AC${i + 1}: ${story.acceptanceCriteria[i]}\n`;
      }
    }

    // Add implementation tasks as subtasks
    if (story.implementationTasks && Array.isArray(story.implementationTasks)) {
      for (let i = 0; i < story.implementationTasks.length; i++) {
        const task = story.implementationTasks[i];
        content += `- [ ] ${taskNumber}.${i + 1} ${task.title || task}\n`;
        if (typeof task === 'object' && task.description) {
          content += `  - ${task.description}\n`;
        }
        if (typeof task === 'object' && task.acceptanceCriteria) {
          content += `  - References: AC${task.acceptanceCriteria}\n`;
        }
      }
    }

    // Add dependency mapping
    const dependencies = this.calculateTaskDependencies(story, existingDeps);
    if (dependencies.length > 0) {
      content += `  - Dependencies: ${dependencies.join(', ')}\n`;
    }

    // Add context for automatic agent invocation
    const contextProviders = this.determineRequiredContext(story);
    content += `  - Context: ${contextProviders.join(', ')}\n`;

    // Add appropriate agent assignment
    const agent = this.determineStoryAgent(story);
    content += `  - Agent: ${agent}\n`;

    // Add requirement references
    const reqRefs = story.requirementRefs || [`Story ${taskNumber}`];
    content += `  - _Requirements: ${reqRefs.join(', ')}_\n\n`;

    return { content, dependencies };
  }

  /**
   * Calculate task dependencies based on story requirements
   * @private
   */
  calculateTaskDependencies(story, existingDeps) {
    const dependencies = [];
    
    // Check for explicit dependencies
    if (story.dependencies && Array.isArray(story.dependencies)) {
      dependencies.push(...story.dependencies);
    }

    // Check for implicit dependencies based on story requirements
    if (story.requires && Array.isArray(story.requires)) {
      for (const requirement of story.requires) {
        // Find tasks that produce this requirement
        for (const [taskNum, taskInfo] of existingDeps) {
          if (taskInfo.outputs.includes(requirement)) {
            dependencies.push(`Task ${taskNum}`);
          }
        }
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Determine required context providers for a story
   * @private
   */
  determineRequiredContext(story) {
    const context = ['#File', '#Folder'];
    
    // Add context based on story type
    if (story.type === 'backend' || story.tags?.includes('api')) {
      context.push('#Terminal', '#Problems');
    }
    
    if (story.type === 'frontend' || story.tags?.includes('ui')) {
      context.push('#Problems');
    }
    
    if (story.tags?.includes('database') || story.tags?.includes('data')) {
      context.push('#Codebase');
    }
    
    // Always add codebase for complex stories
    if (story.complexity === 'high' || (story.acceptanceCriteria && story.acceptanceCriteria.length > 3)) {
      context.push('#Codebase');
    }

    // Add git diff for stories that modify existing code
    if (story.type === 'enhancement' || story.tags?.includes('modification')) {
      context.push('#Git Diff');
    }

    return [...new Set(context)];
  }

  /**
   * Determine appropriate BMad agent for story
   * @private
   */
  determineStoryAgent(story) {
    // Check for explicit agent assignment
    if (story.agent) {
      return story.agent;
    }

    // Determine based on story type or phase
    if (story.phase === 'planning' || story.type === 'epic') {
      return 'bmad-sm';
    }
    
    if (story.phase === 'implementation' || story.type === 'development') {
      return 'bmad-dev';
    }
    
    if (story.phase === 'review' || story.type === 'qa') {
      return 'bmad-qa';
    }

    // Default to dev agent for implementation stories
    return 'bmad-dev';
  }

  /**
   * Generate Kiro-executable tasks with BMad agent integration
   * @param {Array} stories - BMad stories
   * @param {Object} options - Integration options
   * @returns {string} - Kiro-integrated tasks document
   */
  generateKiroIntegratedTasks(stories, options = {}) {
    if (!stories || !Array.isArray(stories)) {
      return this.createEmptyTasks();
    }

    let content = `# Implementation Plan

`;

    // Add integration metadata
    if (options.addIntegrationMetadata) {
      content += `<!-- BMad-Kiro Integration Metadata
Generated: ${new Date().toISOString()}
BMad Version: ${options.bmadVersion || '1.0.0'}
Kiro Integration: ${options.kiroVersion || '1.0.0'}
-->

`;
    }

    let taskNumber = 1;
    for (const story of stories) {
      content += this.convertStoryToKiroExecutableTask(story, taskNumber, options);
      taskNumber++;
    }

    return content;
  }

  /**
   * Convert story to Kiro-executable task with full integration
   * @private
   */
  convertStoryToKiroExecutableTask(story, taskNumber, options = {}) {
    let content = `- [ ] ${taskNumber}. ${story.title || `Implement Story ${taskNumber}`}
`;

    // Add story context and user story
    if (story.userStory) {
      content += `  - User Story: ${story.userStory}\n`;
    } else if (story.description) {
      content += `  - Description: ${story.description}\n`;
    }

    // Add acceptance criteria with Kiro task integration
    if (story.acceptanceCriteria && Array.isArray(story.acceptanceCriteria)) {
      content += `  - Acceptance Criteria:\n`;
      for (let i = 0; i < story.acceptanceCriteria.length; i++) {
        content += `    - AC${i + 1}: ${story.acceptanceCriteria[i]}\n`;
      }
    }

    // Add Kiro task execution metadata
    content += `  - Execution Mode: Kiro Task System\n`;
    content += `  - Task Status: Tracked automatically by Kiro\n`;

    // Add BMad agent integration
    const agent = this.determineStoryAgent(story);
    content += `  - Primary Agent: ${agent}\n`;
    
    // Add agent invocation instructions
    content += `  - Agent Invocation: Click "Start task" to invoke ${agent} with full context\n`;

    // Add context providers for automatic context injection
    const contextProviders = this.determineRequiredContext(story);
    content += `  - Auto Context: ${contextProviders.join(', ')}\n`;

    // Add task completion triggers
    content += `  - Completion Triggers:\n`;
    content += `    - Automatic status update when task marked complete\n`;
    content += `    - Workflow progression to next dependent task\n`;
    if (story.completionTriggers) {
      for (const trigger of story.completionTriggers) {
        content += `    - ${trigger}\n`;
      }
    }

    // Add dependency information for proper execution order
    if (story.dependencies && Array.isArray(story.dependencies)) {
      content += `  - Dependencies: ${story.dependencies.join(', ')}\n`;
      content += `  - Dependency Check: Kiro will verify dependencies before task execution\n`;
    }

    // Add subtasks if available
    if (story.implementationTasks && Array.isArray(story.implementationTasks)) {
      for (let i = 0; i < story.implementationTasks.length; i++) {
        const task = story.implementationTasks[i];
        content += `- [ ] ${taskNumber}.${i + 1} ${task.title || task}\n`;
        if (typeof task === 'object') {
          if (task.description) {
            content += `  - ${task.description}\n`;
          }
          if (task.agent) {
            content += `  - Agent: ${task.agent}\n`;
          } else {
            content += `  - Agent: ${agent}\n`;
          }
          content += `  - Context: ${contextProviders.slice(0, 3).join(', ')}\n`;
        }
      }
    }

    // Add workflow advancement configuration
    content += `  - Workflow Advancement:\n`;
    content += `    - On completion: Update task status to completed\n`;
    content += `    - Next action: ${this.determineNextAction(story, taskNumber)}\n`;

    // Add requirement references
    const reqRefs = story.requirementRefs || [`Story ${taskNumber}`];
    content += `  - _Requirements: ${reqRefs.join(', ')}_\n\n`;

    return content;
  }

  /**
   * Determine next action after task completion
   * @private
   */
  determineNextAction(story, taskNumber) {
    if (story.nextAction) {
      return story.nextAction;
    }

    // Default next actions based on story type
    if (story.type === 'epic-start') {
      return 'Begin first story in epic';
    } else if (story.type === 'epic-end') {
      return 'Complete epic and start next epic';
    } else {
      return `Proceed to Task ${taskNumber + 1} if available`;
    }
  }

  /**
   * Generate task status update configuration
   * @param {Array} tasks - Task list
   * @returns {Object} - Status update configuration
   */
  generateTaskStatusConfig(tasks) {
    const config = {
      version: '1.0.0',
      integration: 'bmad-kiro',
      statusTracking: {
        enabled: true,
        autoUpdate: true,
        progressNotifications: true
      },
      taskStates: [
        { state: 'not_started', description: 'Task not yet begun' },
        { state: 'in_progress', description: 'Task currently being executed' },
        { state: 'completed', description: 'Task successfully completed' },
        { state: 'blocked', description: 'Task blocked by dependencies' },
        { state: 'failed', description: 'Task execution failed' }
      ],
      workflowTriggers: []
    };

    // Add workflow triggers for each task
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      config.workflowTriggers.push({
        taskId: `task-${i + 1}`,
        onCompletion: {
          action: 'advance_workflow',
          nextTask: i + 1 < tasks.length ? `task-${i + 2}` : null,
          notifications: [`Task ${i + 1} completed: ${task.title}`]
        },
        onFailure: {
          action: 'halt_workflow',
          notifications: [`Task ${i + 1} failed: ${task.title}`]
        }
      });
    }

    return config;
  }

  /**
   * Create task execution integration metadata
   * @param {Object} options - Integration options
   * @returns {string} - Integration metadata as YAML comment
   */
  createTaskExecutionMetadata(options = {}) {
    const metadata = {
      integration: {
        type: 'bmad-kiro',
        version: options.version || '1.0.0',
        features: {
          autoContext: true,
          agentInvocation: true,
          statusTracking: true,
          workflowProgression: true
        }
      },
      execution: {
        mode: 'kiro-task-system',
        agentIntegration: 'bmad-agents',
        contextProviders: ['#File', '#Folder', '#Codebase', '#Problems', '#Terminal', '#Git Diff'],
        statusUpdates: 'automatic'
      }
    };

    const yaml = require('js-yaml');
    const yamlString = yaml.dump(metadata, { indent: 2 });
    
    return `<!-- BMad-Kiro Task Integration Metadata
${yamlString}
-->

`;
  }

  createEmptyTasks() {
    return `# Implementation Plan

- [ ] 1. Initial setup and configuration
  - Set up project structure
  - Configure development environment
  - Context: #File, #Folder
  - Agent: bmad-dev
  - Execution Mode: Kiro Task System
  - _Requirements: 1.1_

`;
  }
}

module.exports = SpecGenerator;