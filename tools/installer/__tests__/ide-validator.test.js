/**
 * Unit tests for IdeValidator
 * Tests the requiresSpecialIdeHandling function and IDE validation logic
 */

const IdeValidator = require('../lib/ide-validator');

describe('IdeValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new IdeValidator();
  });

  describe('requiresSpecialIdeHandling', () => {
    describe('with various IDE combinations', () => {
      it('should return true when Kiro is included with other IDEs', () => {
        const ides = ['cursor', 'kiro', 'github-copilot'];
        const result = validator.requiresSpecialIdeHandling(ides);
        expect(result).toBe(true);
      });

      it('should return true when only Kiro is selected', () => {
        const ides = ['kiro'];
        const result = validator.requiresSpecialIdeHandling(ides);
        expect(result).toBe(true);
      });

      it('should return false when only other IDEs are selected', () => {
        const ides = ['cursor', 'github-copilot', 'windsurf'];
        const result = validator.requiresSpecialIdeHandling(ides);
        expect(result).toBe(false);
      });

      it('should return false when no IDEs are selected', () => {
        const ides = [];
        const result = validator.requiresSpecialIdeHandling(ides);
        expect(result).toBe(false);
      });

      it('should handle mixed case Kiro correctly', () => {
        const ides = ['cursor', 'KIRO', 'github-copilot'];
        // Note: This test assumes the function receives pre-sanitized input
        // The actual sanitization happens in validateAndSanitizeIdes
        const sanitizedIdes = validator.validateAndSanitizeIdes(ides);
        const result = validator.requiresSpecialIdeHandling(sanitizedIdes);
        expect(result).toBe(true);
      });
    });

    describe('with empty/undefined arrays', () => {
      it('should return falsy for undefined input', () => {
        const result = validator.requiresSpecialIdeHandling(undefined);
        expect(result).toBeFalsy();
      });

      it('should return falsy for null input', () => {
        const result = validator.requiresSpecialIdeHandling(null);
        expect(result).toBeFalsy();
      });

      it('should return false for empty array', () => {
        const result = validator.requiresSpecialIdeHandling([]);
        expect(result).toBe(false);
      });

      it('should return false for non-array input', () => {
        const result = validator.requiresSpecialIdeHandling('kiro');
        expect(result).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return false when array contains only empty strings', () => {
        const ides = ['', '  ', '\t'];
        const result = validator.requiresSpecialIdeHandling(ides);
        expect(result).toBe(false);
      });

      it('should return true when Kiro is present among invalid IDEs', () => {
        const ides = ['invalid-ide', 'kiro', 'another-invalid'];
        // This should be handled by validation first, but testing the function directly
        const result = validator.requiresSpecialIdeHandling(ides);
        expect(result).toBe(true);
      });

      it('should handle array with duplicate Kiro entries', () => {
        const ides = ['kiro', 'cursor', 'kiro'];
        const result = validator.requiresSpecialIdeHandling(ides);
        expect(result).toBe(true);
      });
    });
  });

  describe('validateIdeArray', () => {
    describe('input validation', () => {
      it('should reject undefined input', () => {
        const result = validator.validateIdeArray(undefined);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('IDE array is undefined or null');
      });

      it('should reject null input', () => {
        const result = validator.validateIdeArray(null);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('IDE array is undefined or null');
      });

      it('should reject non-array input', () => {
        const result = validator.validateIdeArray('kiro');
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('IDE input must be an array');
      });

      it('should accept empty array with warning', () => {
        const result = validator.validateIdeArray([]);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('No IDEs selected - no IDE integration will be configured');
        expect(result.sanitizedIdes).toEqual([]);
      });
    });

    describe('IDE validation', () => {
      it('should accept valid IDEs', () => {
        const ides = ['cursor', 'kiro', 'github-copilot'];
        const result = validator.validateIdeArray(ides);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedIdes).toEqual(['cursor', 'kiro', 'github-copilot']);
      });

      it('should reject invalid IDEs', () => {
        const ides = ['invalid-ide', 'another-invalid'];
        const result = validator.validateIdeArray(ides);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Unsupported IDE(s): invalid-ide, another-invalid');
      });

      it('should normalize IDE names to lowercase', () => {
        const ides = ['CURSOR', 'Kiro', 'GITHUB-COPILOT'];
        const result = validator.validateIdeArray(ides);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedIdes).toEqual(['cursor', 'kiro', 'github-copilot']);
      });

      it('should handle mixed valid and invalid IDEs', () => {
        const ides = ['cursor', 'invalid-ide', 'kiro'];
        const result = validator.validateIdeArray(ides);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Unsupported IDE(s): invalid-ide');
      });
    });

    describe('duplicate handling', () => {
      it('should remove duplicate IDEs', () => {
        const ides = ['cursor', 'kiro', 'cursor', 'github-copilot'];
        const result = validator.validateIdeArray(ides);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedIdes).toEqual(['cursor', 'kiro', 'github-copilot']);
        expect(result.warnings).toContain('Duplicate IDE(s) removed: cursor');
      });

      it('should handle case-insensitive duplicates', () => {
        const ides = ['cursor', 'CURSOR', 'kiro'];
        const result = validator.validateIdeArray(ides);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedIdes).toEqual(['cursor', 'kiro']);
        expect(result.warnings).toContain('Duplicate IDE(s) removed: CURSOR');
      });
    });

    describe('special cases', () => {
      it('should filter out "other" from final list', () => {
        const ides = ['cursor', 'other', 'kiro'];
        const result = validator.validateIdeArray(ides);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedIdes).toEqual(['cursor', 'kiro']);
        expect(result.sanitizedIdes).not.toContain('other');
      });

      it('should reject non-string values', () => {
        const ides = ['cursor', 123, 'kiro', null];
        const result = validator.validateIdeArray(ides);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('123 (type: number)');
        expect(result.errors[0]).toContain('null (type: object)');
      });

      it('should reject empty strings', () => {
        const ides = ['cursor', '', '  ', 'kiro'];
        const result = validator.validateIdeArray(ides);
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('empty string');
      });
    });
  });

  describe('validateAndSanitizeIdes', () => {
    it('should return sanitized array for valid input', () => {
      const ides = ['CURSOR', 'kiro', 'GITHUB-COPILOT'];
      const result = validator.validateAndSanitizeIdes(ides);
      expect(result).toEqual(['cursor', 'kiro', 'github-copilot']);
    });

    it('should return sanitized array for valid input with correct casing', () => {
      const ides = ['CURSOR', 'kiro', 'github-copilot'];
      const result = validator.validateAndSanitizeIdes(ides);
      expect(result).toEqual(['cursor', 'kiro', 'github-copilot']);
    });

    it('should throw error for invalid input', () => {
      const ides = ['invalid-ide'];
      expect(() => validator.validateAndSanitizeIdes(ides)).toThrow('IDE validation failed');
    });

    it('should handle empty array', () => {
      const ides = [];
      const result = validator.validateAndSanitizeIdes(ides);
      expect(result).toEqual([]);
    });
  });

  describe('getSupportedIdes', () => {
    it('should return list of supported IDEs', () => {
      const supportedIdes = validator.getSupportedIdes();
      expect(Array.isArray(supportedIdes)).toBe(true);
      expect(supportedIdes).toContain('kiro');
      expect(supportedIdes).toContain('cursor');
      expect(supportedIdes).toContain('github-copilot');
      expect(supportedIdes).not.toContain('other'); // Should be filtered out
    });

    it('should not modify the original supported IDEs array', () => {
      const supportedIdes1 = validator.getSupportedIdes();
      const supportedIdes2 = validator.getSupportedIdes();
      
      supportedIdes1.push('test-ide');
      expect(supportedIdes2).not.toContain('test-ide');
    });
  });
});