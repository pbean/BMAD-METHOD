/**
 * Base Transformer Class
 * Provides common functionality for all Kiro transformations
 */

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

class BaseTransformer {
  constructor(options = {}) {
    this.options = {
      preserveOriginal: true,
      addKiroMetadata: true,
      validateOutput: true,
      ...options
    };
  }

  /**
   * Parse YAML front matter from markdown content
   * @param {string} content - Markdown content with YAML front matter
   * @returns {Object} - Parsed front matter and content
   */
  parseYAMLFrontMatter(content) {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);

    if (!match) {
      return {
        frontMatter: {},
        content: content
      };
    }

    try {
      const frontMatter = yaml.load(match[1]) || {};
      const markdownContent = match[2];

      return {
        frontMatter,
        content: markdownContent
      };
    } catch (error) {
      console.error('Error parsing YAML front matter:', error.message);
      return {
        frontMatter: {},
        content: content
      };
    }
  }

  /**
   * Generate YAML front matter string
   * @param {Object} frontMatter - Front matter object
   * @returns {string} - YAML front matter string
   */
  generateYAMLFrontMatter(frontMatter) {
    try {
      const yamlString = yaml.dump(frontMatter, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });
      return `---\n${yamlString}---\n`;
    } catch (error) {
      console.error('Error generating YAML front matter:', error.message);
      return '---\n---\n';
    }
  }

  /**
   * Combine front matter and content
   * @param {Object} frontMatter - Front matter object
   * @param {string} content - Markdown content
   * @returns {string} - Complete markdown with front matter
   */
  combineContent(frontMatter, content) {
    const yamlHeader = this.generateYAMLFrontMatter(frontMatter);
    return `${yamlHeader}\n${content}`;
  }

  /**
   * Add Kiro-specific metadata to front matter
   * @param {Object} frontMatter - Original front matter
   * @param {Object} kiroMetadata - Kiro-specific metadata
   * @returns {Object} - Enhanced front matter
   */
  addKiroMetadata(frontMatter, kiroMetadata = {}) {
    if (!this.options.addKiroMetadata) {
      return frontMatter;
    }

    const enhanced = { ...frontMatter };

    // Add Kiro integration metadata
    enhanced.kiro_integration = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      bmad_source: kiroMetadata.bmadSource || 'unknown',
      ...kiroMetadata
    };

    return enhanced;
  }

  /**
   * Validate file path and ensure directory exists
   * @param {string} filePath - Path to validate
   * @returns {Promise<boolean>} - True if valid
   */
  async validateAndEnsurePath(filePath) {
    try {
      const directory = path.dirname(filePath);
      await fs.ensureDir(directory);
      return true;
    } catch (error) {
      console.error('Error ensuring directory:', error.message);
      return false;
    }
  }

  /**
   * Read file with error handling
   * @param {string} filePath - Path to read
   * @returns {Promise<string|null>} - File content or null
   */
  async readFile(filePath) {
    try {
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        console.warn(`File not found: ${filePath}`);
        return null;
      }

      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Write file with error handling and backup
   * @param {string} filePath - Path to write
   * @param {string} content - Content to write
   * @returns {Promise<boolean>} - Success status
   */
  async writeFile(filePath, content) {
    try {
      // Create backup if file exists and preserveOriginal is enabled
      if (this.options.preserveOriginal) {
        const exists = await fs.pathExists(filePath);
        if (exists) {
          const backupPath = `${filePath}.backup`;
          await fs.copy(filePath, backupPath);
        }
      }

      // Ensure directory exists
      await this.validateAndEnsurePath(filePath);

      // Write file
      await fs.writeFile(filePath, content, 'utf8');

      // Validate output if enabled
      if (this.options.validateOutput) {
        const written = await fs.readFile(filePath, 'utf8');
        if (written !== content) {
          throw new Error('File content validation failed');
        }
      }

      return true;
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Transform content with error handling
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {Function} transformFunction - Transformation function
   * @returns {Promise<boolean>} - Success status
   */
  async transformFile(inputPath, outputPath, transformFunction) {
    try {
      const content = await this.readFile(inputPath);
      if (!content) {
        return false;
      }

      const transformed = await transformFunction(content, inputPath);
      if (!transformed) {
        console.error('Transformation function returned null/undefined');
        return false;
      }

      return await this.writeFile(outputPath, transformed);
    } catch (error) {
      console.error('Error in file transformation:', error.message);
      return false;
    }
  }

  /**
   * Get relative path for better error messages
   * @param {string} filePath - Absolute path
   * @returns {string} - Relative path
   */
  getRelativePath(filePath) {
    return path.relative(process.cwd(), filePath);
  }

  /**
   * Log transformation progress
   * @param {string} message - Progress message
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
}

module.exports = BaseTransformer;