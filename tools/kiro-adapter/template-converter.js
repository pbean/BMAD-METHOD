const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { glob } = require('glob');
const ConversionMonitor = require('./conversion-monitor');

/**
 * Converts BMad YAML templates to Kiro spec format
 * Extracts requirements, design, and tasks from template instructions
 */
class TemplateConverter {
  constructor(options = {}) {
    // Determine the project root directory
    const projectRoot = this.findProjectRoot();
    
    this.options = {
      sourceDirectories: {
        core: path.join(projectRoot, 'bmad-core/templates/'),
        expansionPacks: path.join(projectRoot, 'expansion-packs/*/templates/')
      },
      outputDirectory: path.join(projectRoot, '.kiro/spec-templates/'),
      ...options
    };

    // Initialize conversion monitor
    this.monitor = new ConversionMonitor({
      logLevel: options.logLevel || 'info',
      enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
      enableDetailedLogging: options.enableDetailedLogging !== false,
      logDirectory: path.join(projectRoot, '.kiro', 'logs'),
      reportDirectory: path.join(projectRoot, '.kiro', 'reports'),
      ...options
    });
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
   * Convert all BMad templates to Kiro spec format
   */
  async convertAllTemplates() {
    const results = {
      converted: [],
      errors: [],
      summary: {
        total: 0,
        successful: 0,
        failed: 0
      }
    };

    // Start monitoring session
    const sessionId = `template-conversion-${Date.now()}`;
    this.monitor.startConversionSession(sessionId, {
      type: 'template_conversion',
      source: 'bmad-method',
      operation: 'convert_all_templates'
    });

    try {
      // Discover all template files
      this.monitor.logConversionStep(sessionId, 'discover_templates');
      const templateFiles = await this.discoverTemplates();
      results.summary.total = templateFiles.length;
      this.monitor.completeConversionStep(sessionId, 'discover_templates', {
        success: true,
        templateCount: templateFiles.length
      });

      // Convert each template
      this.monitor.logConversionStep(sessionId, 'convert_templates');
      for (const templateFile of templateFiles) {
        const conversionId = `template-${path.basename(templateFile.path, '.yaml')}-${Date.now()}`;
        
        try {
          this.monitor.startConversion(sessionId, conversionId, {
            templateId: path.basename(templateFile.path, '.yaml'),
            source: templateFile.source,
            expansionPack: templateFile.expansionPack,
            inputPath: templateFile.path,
            type: 'template'
          });

          const convertedTemplate = await this.convertTemplate(templateFile, conversionId);
          results.converted.push(convertedTemplate);
          results.summary.successful++;

          this.monitor.completeConversion(conversionId, {
            success: true,
            outputPath: convertedTemplate.outputPath
          });
        } catch (error) {
          results.errors.push({
            file: templateFile,
            error: error.message
          });
          results.summary.failed++;

          this.monitor.completeConversion(conversionId, {
            success: false,
            error: error.message
          });
        }
      }

      this.monitor.completeConversionStep(sessionId, 'convert_templates', {
        success: true,
        successful: results.summary.successful,
        failed: results.summary.failed
      });

      // Complete monitoring session
      this.monitor.completeConversionSession(sessionId, {
        success: results.summary.failed === 0,
        totalTemplates: results.summary.total,
        successful: results.summary.successful,
        failed: results.summary.failed
      });

      return results;
    } catch (error) {
      this.monitor.completeConversionSession(sessionId, {
        success: false,
        error: error.message
      });
      throw new Error(`Template conversion failed: ${error.message}`);
    }
  }

  /**
   * Discover all BMad template files
   */
  async discoverTemplates() {
    const templateFiles = [];

    // Core templates
    const corePattern = path.join(this.options.sourceDirectories.core, '*.yaml');
    const coreFiles = await glob(corePattern);
    templateFiles.push(...coreFiles.map(file => ({
      path: file,
      source: 'bmad-core',
      expansionPack: null
    })));

    // Expansion pack templates
    const expansionPattern = this.options.sourceDirectories.expansionPacks;
    const expansionDirs = await glob(expansionPattern);
    
    for (const expansionDir of expansionDirs) {
      const expansionName = path.basename(path.dirname(expansionDir));
      const templatePattern = path.join(expansionDir, '*.yaml');
      const expansionFiles = await glob(templatePattern);
      
      templateFiles.push(...expansionFiles.map(file => ({
        path: file,
        source: 'expansion-pack',
        expansionPack: expansionName
      })));
    }

    return templateFiles;
  }  /**
  
 * Convert a single BMad template to Kiro spec format
   */
  async convertTemplate(templateFile, conversionId = null) {
    // Log conversion steps if monitoring is available
    if (conversionId && this.monitor) {
      this.monitor.logConversionStep(conversionId, 'read_template_file');
    }

    const templateContent = await fs.readFile(templateFile.path, 'utf8');
    const templateData = yaml.load(templateContent);

    if (!templateData.template) {
      const error = new Error(`Invalid template format: missing template section in ${templateFile.path}`);
      if (conversionId && this.monitor) {
        this.monitor.failConversionStep(conversionId, 'read_template_file', error);
      }
      throw error;
    }

    if (conversionId && this.monitor) {
      this.monitor.completeConversionStep(conversionId, 'read_template_file', { success: true });
      this.monitor.logConversionStep(conversionId, 'extract_metadata');
    }

    const template = templateData.template;
    const sections = templateData.sections || [];

    // Extract template metadata
    const templateInfo = {
      id: template.id,
      name: template.name,
      version: template.version,
      source: templateFile.source,
      expansionPack: templateFile.expansionPack,
      originalPath: templateFile.path
    };

    if (conversionId && this.monitor) {
      this.monitor.completeConversionStep(conversionId, 'extract_metadata', { 
        success: true, 
        templateId: templateInfo.id,
        sectionCount: sections.length 
      });
      this.monitor.logConversionStep(conversionId, 'convert_to_kiro_spec');
    }

    // Convert to Kiro spec format
    const kiroSpec = {
      specType: 'bmad-template',
      originalTemplate: templateInfo,
      requirements: this.extractRequirements(sections),
      design: this.extractDesign(sections, template),
      tasks: this.extractTasks(sections, template)
    };

    if (conversionId && this.monitor) {
      this.monitor.completeConversionStep(conversionId, 'convert_to_kiro_spec', { 
        success: true,
        requirementCount: kiroSpec.requirements.requirements.length,
        taskCount: kiroSpec.tasks.length
      });
      this.monitor.logConversionStep(conversionId, 'write_output_file');
    }

    // Generate output filename
    const outputFilename = this.generateOutputFilename(templateInfo);
    const outputPath = path.join(this.options.outputDirectory, outputFilename);

    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));

    // Write Kiro spec file
    await this.writeKiroSpec(outputPath, kiroSpec);

    if (conversionId && this.monitor) {
      this.monitor.completeConversionStep(conversionId, 'write_output_file', { 
        success: true,
        outputPath: outputPath
      });
    }

    return {
      templateInfo,
      outputPath,
      kiroSpec
    };
  }

  /**
   * Extract requirements from template sections
   */
  extractRequirements(sections) {
    const requirements = {
      introduction: '',
      requirements: []
    };

    // Look for sections that define requirements or user stories
    const requirementSections = sections.filter(section => 
      section.id === 'requirements' || 
      section.title?.toLowerCase().includes('requirement') ||
      section.instruction?.toLowerCase().includes('requirement')
    );

    if (requirementSections.length > 0) {
      requirements.introduction = `Requirements extracted from BMad template sections: ${requirementSections.map(s => s.title || s.id).join(', ')}`;
      
      requirementSections.forEach((section, index) => {
        requirements.requirements.push({
          id: `R${index + 1}`,
          userStory: this.extractUserStory(section),
          acceptanceCriteria: this.extractAcceptanceCriteria(section)
        });
      });
    } else {
      // Generate generic requirements based on template purpose
      requirements.introduction = 'Requirements derived from template structure and instructions';
      requirements.requirements.push({
        id: 'R1',
        userStory: 'As a user, I want to use this template to generate structured documentation, so that I can follow a consistent process.',
        acceptanceCriteria: [
          'WHEN the template is used THEN it SHALL generate all required sections',
          'WHEN sections are completed THEN they SHALL follow the template format',
          'WHEN the document is finished THEN it SHALL be ready for the next workflow step'
        ]
      });
    }

    return requirements;
  }  /**

   * Extract design information from template sections
   */
  extractDesign(sections, template) {
    const design = {
      overview: '',
      architecture: '',
      components: [],
      dataModels: [],
      errorHandling: '',
      testingStrategy: ''
    };

    // Generate overview from template metadata
    design.overview = `This design document describes the structure and implementation of the ${template.name} template. ` +
      `The template generates ${template.output?.format || 'markdown'} documentation following a structured workflow.`;

    // Extract architecture from workflow and sections
    design.architecture = this.extractArchitecture(template, sections);

    // Extract components from sections
    design.components = this.extractComponents(sections);

    // Extract data models from template structure
    design.dataModels = this.extractDataModels(sections);

    // Generate error handling strategy
    design.errorHandling = 'Template processing includes validation of required sections, ' +
      'user input validation, and graceful handling of missing or invalid data.';

    // Generate testing strategy
    design.testingStrategy = 'Template validation through section completion checks, ' +
      'output format verification, and user acceptance testing of generated documents.';

    return design;
  }

  /**
   * Extract tasks from template sections
   */
  extractTasks(sections, template) {
    const tasks = [];
    let taskCounter = 1;

    // Generate setup task
    tasks.push({
      id: `${taskCounter}`,
      title: 'Initialize template processing',
      description: 'Set up template environment and validate input parameters',
      requirements: ['R1'],
      subtasks: [
        'Load template configuration',
        'Validate required parameters',
        'Initialize output structure'
      ]
    });
    taskCounter++;

    // Generate tasks for each major section
    const majorSections = sections.filter(section => 
      !section.id?.includes('changelog') && 
      !section.id?.includes('next-steps')
    );

    majorSections.forEach(section => {
      if (section.sections && section.sections.length > 0) {
        // Section with subsections
        tasks.push({
          id: `${taskCounter}`,
          title: `Process ${section.title || section.id} section`,
          description: `Generate and validate the ${section.title || section.id} section with all subsections`,
          requirements: ['R1'],
          subtasks: section.sections.map(subsection => 
            `Process ${subsection.title || subsection.id} subsection`
          )
        });
      } else {
        // Simple section
        tasks.push({
          id: `${taskCounter}`,
          title: `Generate ${section.title || section.id}`,
          description: `Create the ${section.title || section.id} section according to template specifications`,
          requirements: ['R1'],
          subtasks: [
            'Gather required information',
            'Apply template formatting',
            'Validate section completion'
          ]
        });
      }
      taskCounter++;
    });

    // Generate finalization task
    tasks.push({
      id: `${taskCounter}`,
      title: 'Finalize and validate template output',
      description: 'Complete template processing and validate final output',
      requirements: ['R1'],
      subtasks: [
        'Validate all sections are complete',
        'Apply final formatting',
        'Generate output file',
        'Verify output meets template requirements'
      ]
    });

    return tasks;
  }  /**
   
* Extract user story from section
   */
  extractUserStory(section) {
    // Look for explicit user story format in instruction
    const instruction = section.instruction || '';
    const userStoryMatch = instruction.match(/As a (.+?), I want (.+?), so that (.+?)\./);
    
    if (userStoryMatch) {
      return `As a ${userStoryMatch[1]}, I want ${userStoryMatch[2]}, so that ${userStoryMatch[3]}.`;
    }

    // Generate user story based on section purpose
    const sectionName = section.title || section.id;
    return `As a user, I want to complete the ${sectionName} section, so that I can provide the necessary information for this template.`;
  }

  /**
   * Extract acceptance criteria from section
   */
  extractAcceptanceCriteria(section) {
    const criteria = [];
    const instruction = section.instruction || '';

    // Look for explicit criteria in instruction
    if (instruction.includes('WHEN') && instruction.includes('THEN')) {
      const criteriaMatches = instruction.match(/WHEN (.+?) THEN (.+?)(?=\.|WHEN|$)/g);
      if (criteriaMatches) {
        criteria.push(...criteriaMatches);
      }
    }

    // Generate default criteria if none found
    if (criteria.length === 0) {
      const sectionName = section.title || section.id;
      criteria.push(
        `WHEN the ${sectionName} section is accessed THEN it SHALL display the required fields`,
        `WHEN the section is completed THEN it SHALL validate the input`,
        `WHEN the section is saved THEN it SHALL persist the data for template processing`
      );
    }

    return criteria;
  }

  /**
   * Extract architecture information
   */
  extractArchitecture(template, sections) {
    const workflow = template.workflow || {};
    const mode = workflow.mode || 'standard';
    const elicitation = workflow.elicitation || 'basic';

    return `Template Architecture:
- Workflow Mode: ${mode}
- Elicitation Method: ${elicitation}
- Output Format: ${template.output?.format || 'markdown'}
- Section Count: ${sections.length}
- Interactive Elements: ${sections.filter(s => s.elicit).length}
- Repeatable Sections: ${sections.filter(s => s.repeatable).length}`;
  }

  /**
   * Extract components from sections
   */
  extractComponents(sections) {
    return sections.map(section => ({
      name: section.title || section.id,
      type: section.type || 'content',
      responsibility: section.instruction || 'Process section content',
      repeatable: section.repeatable || false,
      interactive: section.elicit || false,
      subsections: section.sections ? section.sections.length : 0
    }));
  }

  /**
   * Extract data models from sections
   */
  extractDataModels(sections) {
    const models = [];
    
    // Look for sections that define data structures
    sections.forEach(section => {
      if (section.type === 'table' && section.columns) {
        models.push({
          name: section.title || section.id,
          type: 'table',
          columns: section.columns,
          purpose: 'Structured data collection'
        });
      }
      
      if (section.template && section.template.includes('{{')) {
        const templateVars = section.template.match(/\{\{(.+?)\}\}/g) || [];
        models.push({
          name: section.title || section.id,
          type: 'template',
          variables: templateVars.map(v => v.replace(/[{}]/g, '')),
          purpose: 'Template data binding'
        });
      }
    });

    return models;
  }

  /**
   * Generate output filename for converted template
   */
  generateOutputFilename(templateInfo) {
    const baseName = templateInfo.id.replace(/[^a-zA-Z0-9-]/g, '-');
    const source = templateInfo.expansionPack || 'core';
    return `${source}-${baseName}.md`;
  }

  /**
   * Write Kiro spec file
   */
  async writeKiroSpec(outputPath, kiroSpec) {
    const content = this.generateKiroSpecContent(kiroSpec);
    await fs.writeFile(outputPath, content, 'utf8');
  }

  /**
   * Generate Kiro spec markdown content
   */
  generateKiroSpecContent(kiroSpec) {
    const { originalTemplate, requirements, design, tasks } = kiroSpec;
    
    let content = `# ${originalTemplate.name} - Kiro Spec\n\n`;
    
    // Metadata
    content += `## Template Information\n\n`;
    content += `- **Original ID**: ${originalTemplate.id}\n`;
    content += `- **Version**: ${originalTemplate.version}\n`;
    content += `- **Source**: ${originalTemplate.source}\n`;
    if (originalTemplate.expansionPack) {
      content += `- **Expansion Pack**: ${originalTemplate.expansionPack}\n`;
    }
    content += `- **Original Path**: ${originalTemplate.originalPath}\n\n`;

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
   * Get conversion statistics
   */
  async getConversionStats() {
    const templateFiles = await this.discoverTemplates();
    const coreTemplates = templateFiles.filter(t => t.source === 'bmad-core');
    const expansionTemplates = templateFiles.filter(t => t.source === 'expansion-pack');
    
    const expansionPacks = [...new Set(expansionTemplates.map(t => t.expansionPack))];

    return {
      total: templateFiles.length,
      core: coreTemplates.length,
      expansionPacks: expansionPacks.length,
      expansionTemplates: expansionTemplates.length,
      expansionPackBreakdown: expansionPacks.map(pack => ({
        name: pack,
        templates: expansionTemplates.filter(t => t.expansionPack === pack).length
      }))
    };
  }
}

module.exports = TemplateConverter;