const chalk = require('chalk');

/**
 * IDE validation utilities for BMad installer
 */
class IdeValidator {
  constructor() {
    // Supported IDE list - must match the choices in bmad.js
    this.supportedIdes = [
      'cursor',
      'claude-code', 
      'windsurf',
      'trae',
      'roo',
      'kilo',
      'cline',
      'gemini',
      'qwen-code',
      'github-copilot',
      'kiro',
      'other' // Special case for command line usage
    ];
  }

  /**
   * Validates IDE array input
   * @param {any} ides - IDE array to validate
   * @returns {Object} Validation result with isValid, errors, and sanitizedIdes
   */
  validateIdeArray(ides) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      sanitizedIdes: []
    };

    // Check if ides is defined
    if (ides === undefined || ides === null) {
      result.isValid = false;
      result.errors.push('IDE array is undefined or null');
      return result;
    }

    // Check if ides is an array
    if (!Array.isArray(ides)) {
      result.isValid = false;
      result.errors.push(`IDE input must be an array, received: ${typeof ides}`);
      return result;
    }

    // Handle empty array
    if (ides.length === 0) {
      result.warnings.push('No IDEs selected - no IDE integration will be configured');
      result.sanitizedIdes = [];
      return result;
    }

    // Validate each IDE
    const validIdes = [];
    const invalidIdes = [];
    const duplicateIdes = [];
    const seenIdes = new Set();

    for (const ide of ides) {
      // Check for non-string values
      if (typeof ide !== 'string') {
        invalidIdes.push(`${ide} (type: ${typeof ide})`);
        continue;
      }

      // Check for empty strings
      if (ide.trim() === '') {
        invalidIdes.push('empty string');
        continue;
      }

      const normalizedIde = ide.trim().toLowerCase();

      // Check for duplicates
      if (seenIdes.has(normalizedIde)) {
        duplicateIdes.push(ide);
        continue;
      }
      seenIdes.add(normalizedIde);

      // Check if IDE is supported
      if (!this.supportedIdes.includes(normalizedIde)) {
        invalidIdes.push(ide);
        continue;
      }

      // Filter out 'other' from final list as it's not a real IDE
      if (normalizedIde !== 'other') {
        validIdes.push(normalizedIde);
      }
    }

    // Report validation errors
    if (invalidIdes.length > 0) {
      result.isValid = false;
      result.errors.push(`Unsupported IDE(s): ${invalidIdes.join(', ')}`);
      result.errors.push(`Supported IDEs: ${this.supportedIdes.filter(ide => ide !== 'other').join(', ')}`);
    }

    if (duplicateIdes.length > 0) {
      result.warnings.push(`Duplicate IDE(s) removed: ${duplicateIdes.join(', ')}`);
    }

    result.sanitizedIdes = validIdes;
    return result;
  }

  /**
   * Validates and sanitizes IDE array, throwing error if invalid
   * @param {any} ides - IDE array to validate
   * @returns {string[]} Sanitized IDE array
   * @throws {Error} If validation fails
   */
  validateAndSanitizeIdes(ides) {
    const validation = this.validateIdeArray(ides);
    
    if (!validation.isValid) {
      const errorMessage = `IDE validation failed:\n${validation.errors.join('\n')}`;
      throw new Error(errorMessage);
    }

    // Display warnings if any
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        console.log(chalk.yellow(`⚠ ${warning}`));
      });
    }

    return validation.sanitizedIdes;
  }

  /**
   * Checks if IDE array requires special handling (e.g., Kiro)
   * @param {string[]} ides - Validated IDE array
   * @returns {boolean} True if special IDE handling is required
   */
  requiresSpecialIdeHandling(ides) {
    return ides && Array.isArray(ides) && ides.length > 0 && ides.includes('kiro');
  }

  /**
   * Gets list of supported IDEs
   * @returns {string[]} Array of supported IDE identifiers
   */
  getSupportedIdes() {
    return [...this.supportedIdes.filter(ide => ide !== 'other')];
  }

  /**
   * Formats IDE validation error for display
   * @param {Object} validation - Validation result
   * @returns {string} Formatted error message
   */
  formatValidationError(validation) {
    if (validation.isValid) {
      return '';
    }

    let message = chalk.red('IDE Validation Error:\n');
    validation.errors.forEach(error => {
      message += chalk.red(`  • ${error}\n`);
    });

    if (validation.warnings.length > 0) {
      message += chalk.yellow('\nWarnings:\n');
      validation.warnings.forEach(warning => {
        message += chalk.yellow(`  • ${warning}\n`);
      });
    }

    return message;
  }
}

module.exports = IdeValidator;