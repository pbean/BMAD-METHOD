/**
 * Unit tests for TemplateConverter
 * Tests the conversion of BMad YAML templates to Kiro spec format
 */

const TemplateConverter = require('../template-converter');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

// Mock fs-extra
jest.mock('fs-extra');

describe('TemplateConverter', () => {
  let converter;
  let mockRootPath;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRootPath = '/mock/project';
    converter = new TemplateConverter({
      sourceDirectories: {
        core: path.join(mockRootPath, 'bmad-core/templates/'),
        expansionPacks: path.join(mockRootPath, 'expansion-packs/*/templates/')
      },
      outputDirectory: path.join(mockRootPath, '.kiro/spec-templates/')
    });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultConverter = new TemplateConverter();
      expect(defaultConverter.options.sourceDirectories).toBeDefined();
      expect(defaultConverter.options.outputDirectory).toBeDefined();
    });

    it('should accept custom options', () => {
      const customConverter = new TemplateConverter({
        outputDirectory: '/custom/output'
      });
      expect(customConverter.options.outputDirectory).toBe('/custom/output');
    });
  });

  describe('convertAllTemplates', () => {
    beforeEach(() => {
      // Mock template files
      fs.pathExists.mockImplementation((path) => {
        if (path.includes('templates')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      fs.readdir.mockImplementation((path) => {
        if (path.includes('bmad-core/templates')) {
          return Promise.resolve(['prd-tmpl.yaml', 'architecture-tmpl.yaml', 'story-tmpl.yaml']);
        }
        if (path.includes('expansion-packs')) {
          return Promise.resolve(['bmad-2d-phaser-game-dev']);
        }
        if (path.includes('bmad-2d-phaser-game-dev/templates')) {
          return Promise.resolve(['game-design-doc-tmpl.yaml', 'level-design-doc-tmpl.yaml']);
        }
        return Promise.resolve([]);
      });

      fs.stat.mockResolvedValue({ isDirectory: () => true });
      fs.ensureDir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
    });

    it('should convert all core templates successfully', async () => {
      const mockTemplate = {
        template: {
          name: 'Product Requirements Document',
          id: 'prd-tmpl',
          description: 'Template for creating PRDs'
        },
        sections: {
          overview: {
            title: 'Product Overview',
            instructions: 'Describe the product vision and goals'
          },
          requirements: {
            title: 'Requirements',
            instructions: 'List functional and non-functional requirements'
          }
        },
        llm_instructions: [
          'Create a comprehensive PRD',
          'Focus on user needs and business value',
          'Include technical considerations'
        ]
      };

      fs.readFile.mockResolvedValue(yaml.dump(mockTemplate));

      const results = await converter.convertAllTemplates();

      expect(results.converted.length).toBeGreaterThanOrEqual(3);
      expect(results.errors.length).toBe(0);
      expect(results.summary.total).toBeGreaterThanOrEqual(3);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should convert expansion pack templates', async () => {
      const mockGameTemplate = {
        template: {
          name: 'Game Design Document',
          id: 'game-design-doc-tmpl',
          description: 'Template for game design documents'
        },
        sections: {
          concept: {
            title: 'Game Concept',
            instructions: 'Describe the core game concept and mechanics'
          },
          gameplay: {
            title: 'Gameplay',
            instructions: 'Detail the gameplay mechanics and flow'
          }
        },
        llm_instructions: [
          'Create an engaging game design document',
          'Focus on player experience and fun factor',
          'Include technical implementation notes'
        ]
      };

      fs.readFile.mockResolvedValue(yaml.dump(mockGameTemplate));

      const results = await converter.convertAllTemplates();
      const gameTemplates = results.converted.filter(t => t.expansionPack === 'bmad-2d-phaser-game-dev');

      expect(gameTemplates.length).toBeGreaterThanOrEqual(2);
      expect(gameTemplates[0].originalTemplate).toBeDefined();
      expect(gameTemplates[0].kiroSpec).toBeDefined();
    });

    it('should handle template conversion errors gracefully', async () => {
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('prd-tmpl.yaml')) {
          return Promise.resolve('invalid: yaml: content:');
        }
        return Promise.resolve(yaml.dump({ template: { name: 'Valid Template' } }));
      });

      const results = await converter.convertAllTemplates();

      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.errors[0]).toContain('prd-tmpl.yaml');
      expect(results.converted.length).toBeGreaterThan(0); // Other templates should still convert
    });
  });

  describe('convertToKiroSpec', () => {
    it('should convert BMad template to Kiro spec format', () => {
      const bmadTemplate = {
        template: {
          name: 'Product Requirements Document',
          id: 'prd-tmpl',
          description: 'Template for creating PRDs'
        },
        sections: {
          overview: {
            title: 'Product Overview',
            instructions: 'Describe the product vision and goals'
          },
          requirements: {
            title: 'Requirements',
            instructions: 'List functional and non-functional requirements'
          },
          architecture: {
            title: 'Technical Architecture',
            instructions: 'Outline the technical approach and architecture'
          }
        },
        llm_instructions: [
          'Create a comprehensive PRD',
          'Focus on user needs and business value',
          'Include technical considerations'
        ]
      };

      const kiroSpec = converter.convertToKiroSpec(bmadTemplate);

      expect(kiroSpec.specType).toBe('bmad-template');
      expect(kiroSpec.originalTemplate).toBe('prd-tmpl');
      expect(kiroSpec.requirements).toBeDefined();
      expect(kiroSpec.design).toBeDefined();
      expect(kiroSpec.tasks).toBeDefined();
      expect(kiroSpec.requirements).toContain('Product Overview');
      expect(kiroSpec.design).toContain('Technical Architecture');
    });

    it('should extract requirements from template sections', () => {
      const template = {
        template: { name: 'Test Template', id: 'test' },
        sections: {
          requirements: {
            title: 'Requirements',
            instructions: 'Define functional requirements'
          },
          acceptance_criteria: {
            title: 'Acceptance Criteria',
            instructions: 'List acceptance criteria'
          }
        }
      };

      const kiroSpec = converter.convertToKiroSpec(template);

      expect(kiroSpec.requirements).toContain('Requirements');
      expect(kiroSpec.requirements).toContain('Define functional requirements');
      expect(kiroSpec.requirements).toContain('Acceptance Criteria');
    });

    it('should extract design from template sections', () => {
      const template = {
        template: { name: 'Test Template', id: 'test' },
        sections: {
          architecture: {
            title: 'Architecture',
            instructions: 'Design the system architecture'
          },
          design: {
            title: 'Design Approach',
            instructions: 'Outline the design approach'
          }
        }
      };

      const kiroSpec = converter.convertToKiroSpec(template);

      expect(kiroSpec.design).toContain('Architecture');
      expect(kiroSpec.design).toContain('Design the system architecture');
      expect(kiroSpec.design).toContain('Design Approach');
    });

    it('should convert LLM instructions to tasks', () => {
      const template = {
        template: { name: 'Test Template', id: 'test' },
        llm_instructions: [
          'Create a comprehensive document',
          'Focus on user needs',
          'Include technical details',
          'Review and validate the output'
        ]
      };

      const kiroSpec = converter.convertToKiroSpec(template);

      expect(kiroSpec.tasks).toBeDefined();
      expect(kiroSpec.tasks.length).toBe(4);
      expect(kiroSpec.tasks[0]).toContain('Create a comprehensive document');
      expect(kiroSpec.tasks[3]).toContain('Review and validate the output');
    });
  });

  describe('extractRequirements', () => {
    it('should extract requirements from relevant sections', () => {
      const template = {
        sections: {
          overview: {
            title: 'Overview',
            instructions: 'Product overview content'
          },
          requirements: {
            title: 'Requirements',
            instructions: 'Functional requirements'
          },
          goals: {
            title: 'Goals',
            instructions: 'Business goals'
          },
          unrelated: {
            title: 'Unrelated',
            instructions: 'Not a requirement'
          }
        }
      };

      const requirements = converter.extractRequirements(template);

      expect(requirements).toContain('Overview');
      expect(requirements).toContain('Requirements');
      expect(requirements).toContain('Goals');
      expect(requirements).not.toContain('Unrelated');
    });

    it('should handle templates without requirement sections', () => {
      const template = {
        sections: {
          other: {
            title: 'Other Section',
            instructions: 'Other content'
          }
        }
      };

      const requirements = converter.extractRequirements(template);

      expect(requirements).toBe('No specific requirements sections found in template.');
    });
  });

  describe('extractDesign', () => {
    it('should extract design from relevant sections', () => {
      const template = {
        sections: {
          architecture: {
            title: 'Architecture',
            instructions: 'System architecture'
          },
          design: {
            title: 'Design',
            instructions: 'Design approach'
          },
          implementation: {
            title: 'Implementation',
            instructions: 'Implementation details'
          },
          unrelated: {
            title: 'Unrelated',
            instructions: 'Not design related'
          }
        }
      };

      const design = converter.extractDesign(template);

      expect(design).toContain('Architecture');
      expect(design).toContain('Design');
      expect(design).toContain('Implementation');
      expect(design).not.toContain('Unrelated');
    });

    it('should handle templates without design sections', () => {
      const template = {
        sections: {
          other: {
            title: 'Other Section',
            instructions: 'Other content'
          }
        }
      };

      const design = converter.extractDesign(template);

      expect(design).toBe('No specific design sections found in template.');
    });
  });

  describe('convertToTasks', () => {
    it('should convert LLM instructions to task format', () => {
      const instructions = [
        'Create a comprehensive document',
        'Focus on user needs and business value',
        'Include technical considerations',
        'Review and validate the output'
      ];

      const tasks = converter.convertToTasks(instructions);

      expect(tasks).toHaveLength(4);
      expect(tasks[0]).toContain('- [ ] 1. Create a comprehensive document');
      expect(tasks[1]).toContain('- [ ] 2. Focus on user needs and business value');
      expect(tasks[3]).toContain('- [ ] 4. Review and validate the output');
    });

    it('should handle empty instructions', () => {
      const tasks = converter.convertToTasks([]);

      expect(tasks).toEqual(['- [ ] 1. Implement template-based functionality']);
    });

    it('should handle null instructions', () => {
      const tasks = converter.convertToTasks(null);

      expect(tasks).toEqual(['- [ ] 1. Implement template-based functionality']);
    });
  });

  describe('validateTemplateFormat', () => {
    it('should validate correct template format', () => {
      const validTemplate = {
        template: {
          name: 'Valid Template',
          id: 'valid-tmpl',
          description: 'A valid template'
        },
        sections: {
          section1: {
            title: 'Section 1',
            instructions: 'Instructions for section 1'
          }
        }
      };

      const result = converter.validateTemplateFormat(validTemplate);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const invalidTemplate = {
        template: {
          // Missing name and id
          description: 'A template without name'
        },
        sections: {}
      };

      const result = converter.validateTemplateFormat(invalidTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('should validate section format', () => {
      const templateWithInvalidSections = {
        template: {
          name: 'Template',
          id: 'tmpl'
        },
        sections: {
          validSection: {
            title: 'Valid Section',
            instructions: 'Valid instructions'
          },
          invalidSection: {
            // Missing title and instructions
          }
        }
      };

      const result = converter.validateTemplateFormat(templateWithInvalidSections);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('invalidSection'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      fs.pathExists.mockRejectedValue(new Error('File system error'));

      const results = await converter.convertAllTemplates();

      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.errors[0]).toContain('File system error');
    });

    it('should handle YAML parsing errors', async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue(['invalid.yaml']);
      fs.readFile.mockResolvedValue('invalid: yaml: content:');

      const results = await converter.convertAllTemplates();

      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.errors[0]).toContain('invalid.yaml');
    });

    it('should handle write errors gracefully', async () => {
      const mockTemplate = {
        template: { name: 'Test', id: 'test' },
        sections: {}
      };

      fs.pathExists.mockResolvedValue(true);
      fs.readdir.mockResolvedValue(['test.yaml']);
      fs.readFile.mockResolvedValue(yaml.dump(mockTemplate));
      fs.writeFile.mockRejectedValue(new Error('Write error'));

      const results = await converter.convertAllTemplates();

      expect(results.errors.length).toBeGreaterThan(0);
      expect(results.errors[0]).toContain('Write error');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex templates with multiple sections', async () => {
      const complexTemplate = {
        template: {
          name: 'Complex Template',
          id: 'complex-tmpl',
          description: 'A complex template with many sections'
        },
        sections: {
          overview: { title: 'Overview', instructions: 'Overview instructions' },
          requirements: { title: 'Requirements', instructions: 'Requirements instructions' },
          architecture: { title: 'Architecture', instructions: 'Architecture instructions' },
          implementation: { title: 'Implementation', instructions: 'Implementation instructions' },
          testing: { title: 'Testing', instructions: 'Testing instructions' },
          deployment: { title: 'Deployment', instructions: 'Deployment instructions' }
        },
        llm_instructions: [
          'Analyze the requirements thoroughly',
          'Design a scalable architecture',
          'Implement with best practices',
          'Test comprehensively',
          'Deploy safely'
        ]
      };

      const kiroSpec = converter.convertToKiroSpec(complexTemplate);

      expect(kiroSpec.requirements).toContain('Overview');
      expect(kiroSpec.requirements).toContain('Requirements');
      expect(kiroSpec.design).toContain('Architecture');
      expect(kiroSpec.design).toContain('Implementation');
      expect(kiroSpec.tasks).toHaveLength(5);
    });

    it('should preserve template metadata in conversion', () => {
      const template = {
        template: {
          name: 'Test Template',
          id: 'test-tmpl',
          description: 'Test description',
          version: '1.0.0',
          author: 'Test Author'
        },
        sections: {}
      };

      const kiroSpec = converter.convertToKiroSpec(template);

      expect(kiroSpec.metadata).toBeDefined();
      expect(kiroSpec.metadata.originalName).toBe('Test Template');
      expect(kiroSpec.metadata.version).toBe('1.0.0');
      expect(kiroSpec.metadata.author).toBe('Test Author');
    });
  });
});