/**
 * Steering Template Generator
 * Generates default steering rules for BMad project types
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class SteeringTemplateGenerator {
  constructor(options = {}) {
    this.options = options;
    this.verbose = options.verbose || false;
  }

  /**
   * Log messages with optional color
   * @param {string} message - Message to log
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    if (!this.verbose && level === 'info') return;
    
    const colors = {
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
      success: chalk.green
    };
    
    console.log(colors[level](`[SteeringTemplateGenerator] ${message}`));
  }

  /**
   * Generate default steering rules for BMad project types
   * @param {string} kiroPath - Path to Kiro workspace
   * @param {string} projectType - Detected project type
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateBMadSteeringRules(kiroPath, projectType = 'generic', options = {}) {
    this.log(`Generating BMad steering rules for project type: ${projectType}`);
    
    const steeringDir = path.join(kiroPath, '.kiro', 'steering');
    await fs.ensureDir(steeringDir);
    
    // Generate core BMad steering rules
    await this.generateCoreBMadRules(steeringDir, options);
    
    // Generate technical preferences
    await this.generateTechnicalPreferences(steeringDir, projectType, options);
    
    // Generate project structure rules
    await this.generateProjectStructureRules(steeringDir, projectType, options);
    
    // Generate project type specific rules
    await this.generateProjectTypeRules(steeringDir, projectType, options);
    
    this.log('BMad steering rules generation complete', 'success');
  }

  /**
   * Generate core BMad Method steering rules
   * @param {string} steeringDir - Steering directory path
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateCoreBMadRules(steeringDir, options) {
    const bmadRulePath = path.join(steeringDir, 'bmad-method.md');
    
    if (await fs.pathExists(bmadRulePath) && !options.overwrite) {
      this.log('BMad method rules already exist, skipping');
      return;
    }
    
    const bmadRuleContent = `---
inclusion: always
---

# BMad Method Integration Rules

## Core Principles

- Follow BMad Method's structured approach to development
- Maintain agent specialization and expertise areas
- Use spec-driven development for complex features
- Leverage Kiro's context system for enhanced project awareness
- Apply steering rules consistently across all agent interactions

## Agent Behavior Standards

- Preserve BMad persona while leveraging Kiro capabilities
- Use context providers (#File, #Folder, #Codebase) automatically
- Reference steering rules for consistency in recommendations
- Integrate with MCP tools when available for enhanced functionality
- Follow BMad workflow patterns enhanced with Kiro features

## Quality Assurance

- Maintain BMad's rigorous quality assurance processes
- Use checklists and validation steps for all deliverables
- Ensure documentation is comprehensive and up-to-date
- Follow test-driven development practices where applicable
- Implement proper error handling and logging

## Workflow Integration

- Use Kiro specs for BMad planning workflows (PRD → requirements.md)
- Convert BMad stories to executable Kiro tasks
- Leverage Kiro hooks for workflow automation
- Maintain BMad's two-phase approach (planning then implementation)
- Ensure seamless handoffs between BMad agents

## Context Management

- Automatically inject relevant project context into agent prompts
- Use #Codebase for architectural consistency
- Reference #Problems and #Terminal for debugging context
- Leverage #Git Diff for change-aware recommendations
- Apply project-specific conventions from steering rules
`;
    
    await fs.writeFile(bmadRulePath, bmadRuleContent);
    this.log('Generated core BMad method rules', 'success');
  }

  /**
   * Generate technical preferences for different project types
   * @param {string} steeringDir - Steering directory path
   * @param {string} projectType - Project type
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateTechnicalPreferences(steeringDir, projectType, options) {
    const techRulePath = path.join(steeringDir, 'tech-preferences.md');
    
    if (await fs.pathExists(techRulePath) && !options.overwrite) {
      this.log('Technical preferences already exist, skipping');
      return;
    }
    
    const techPreferences = this.getTechnicalPreferencesForProjectType(projectType);
    
    const techRuleContent = `---
inclusion: always
---

# Technical Preferences

## Code Style

${techPreferences.codeStyle ? techPreferences.codeStyle.map(rule => `- ${rule}`).join('\n') : '- Follow consistent coding standards'}

## Architecture Patterns

${techPreferences.architecture ? techPreferences.architecture.map(rule => `- ${rule}`).join('\n') : '- Use appropriate design patterns'}

## Testing Standards

${techPreferences.testing ? techPreferences.testing.map(rule => `- ${rule}`).join('\n') : '- Write comprehensive tests'}

## Documentation Requirements

${techPreferences.documentation ? techPreferences.documentation.map(rule => `- ${rule}`).join('\n') : '- Maintain up-to-date documentation'}

## Performance Guidelines

${techPreferences.performance ? techPreferences.performance.map(rule => `- ${rule}`).join('\n') : '- Optimize for performance'}

## Security Practices

${techPreferences.security ? techPreferences.security.map(rule => `- ${rule}`).join('\n') : '- Follow security best practices'}
`;
    
    await fs.writeFile(techRulePath, techRuleContent);
    this.log(`Generated technical preferences for ${projectType}`, 'success');
  }

  /**
   * Generate project structure rules for BMad workflow organization
   * @param {string} steeringDir - Steering directory path
   * @param {string} projectType - Project type
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateProjectStructureRules(steeringDir, projectType, options) {
    const structureRulePath = path.join(steeringDir, 'structure.md');
    
    if (await fs.pathExists(structureRulePath) && !options.overwrite) {
      this.log('Project structure rules already exist, skipping');
      return;
    }
    
    const structureRules = this.getProjectStructureForType(projectType);
    
    const structureRuleContent = `---
inclusion: always
---

# Project Structure Rules

## Directory Organization

${structureRules.directories ? structureRules.directories.map(rule => `- ${rule}`).join('\n') : '- Organize code logically'}

## File Naming Conventions

${structureRules.fileNaming ? structureRules.fileNaming.map(rule => `- ${rule}`).join('\n') : '- Use consistent naming'}

## BMad Workflow Organization

${structureRules.bmadWorkflow ? structureRules.bmadWorkflow.map(rule => `- ${rule}`).join('\n') : '- Follow BMad workflow patterns'}

## Documentation Structure

${structureRules.documentation ? structureRules.documentation.map(rule => `- ${rule}`).join('\n') : '- Maintain proper documentation'}

## Configuration Management

${structureRules.configuration ? structureRules.configuration.map(rule => `- ${rule}`).join('\n') : '- Manage configuration properly'}
`;
    
    await fs.writeFile(structureRulePath, structureRuleContent);
    this.log(`Generated project structure rules for ${projectType}`, 'success');
  }

  /**
   * Generate project type specific steering rules
   * @param {string} steeringDir - Steering directory path
   * @param {string} projectType - Project type
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateProjectTypeRules(steeringDir, projectType, options) {
    if (projectType === 'generic') {
      this.log('Skipping project type specific rules for generic project');
      return;
    }
    
    const projectRulePath = path.join(steeringDir, `${projectType}.md`);
    
    if (await fs.pathExists(projectRulePath) && !options.overwrite) {
      this.log(`${projectType} specific rules already exist, skipping`);
      return;
    }
    
    const projectSpecificRules = this.getProjectTypeSpecificRules(projectType);
    
    if (!projectSpecificRules) {
      this.log(`No specific rules defined for project type: ${projectType}`, 'warn');
      return;
    }
    
    const projectRuleContent = `---
inclusion: always
projectType: ${projectType}
---

# ${projectType.charAt(0).toUpperCase() + projectType.slice(1)} Project Rules

${projectSpecificRules}
`;
    
    await fs.writeFile(projectRulePath, projectRuleContent);
    this.log(`Generated ${projectType} specific rules`, 'success');
  }

  /**
   * Get technical preferences for a specific project type
   * @param {string} projectType - Project type
   * @returns {Object} - Technical preferences
   */
  getTechnicalPreferencesForProjectType(projectType) {
    const basePreferences = {
      codeStyle: [
        'Use consistent indentation (2 spaces for JS/TS, 4 for Python)',
        'Follow language-specific naming conventions',
        'Write descriptive variable and function names',
        'Include comprehensive comments for complex logic',
        'Use meaningful commit messages following conventional commits'
      ],
      architecture: [
        'Prefer composition over inheritance',
        'Use dependency injection where appropriate',
        'Follow SOLID principles',
        'Implement proper error handling and logging',
        'Design for testability and maintainability'
      ],
      testing: [
        'Write unit tests for all business logic',
        'Use integration tests for API endpoints',
        'Implement end-to-end tests for critical user flows',
        'Maintain test coverage above 80%',
        'Use descriptive test names and arrange-act-assert pattern'
      ],
      documentation: [
        'Keep README files up-to-date with setup instructions',
        'Document API endpoints with examples',
        'Include architecture decision records (ADRs)',
        'Use clear, concise comments in code',
        'Maintain changelog for releases'
      ],
      performance: [
        'Optimize for readability first, performance second',
        'Use appropriate data structures and algorithms',
        'Implement caching where beneficial',
        'Monitor and profile performance bottlenecks',
        'Consider lazy loading for large datasets'
      ],
      security: [
        'Validate all user inputs',
        'Use parameterized queries to prevent SQL injection',
        'Implement proper authentication and authorization',
        'Keep dependencies up-to-date',
        'Follow principle of least privilege'
      ]
    };

    // Customize preferences based on project type
    const typeSpecificPreferences = {
      react: {
        codeStyle: [
          ...basePreferences.codeStyle,
          'Use functional components with hooks',
          'Follow React naming conventions (PascalCase for components)',
          'Use TypeScript for type safety'
        ],
        architecture: [
          ...basePreferences.architecture,
          'Use React Context for global state management',
          'Implement proper component composition',
          'Follow React best practices for performance'
        ]
      },
      'node-backend': {
        codeStyle: [
          ...basePreferences.codeStyle,
          'Use async/await over callbacks',
          'Implement proper error handling middleware'
        ],
        architecture: [
          ...basePreferences.architecture,
          'Use Express.js or Fastify for API development',
          'Implement proper middleware architecture',
          'Use environment variables for configuration'
        ]
      },
      python: {
        codeStyle: [
          ...basePreferences.codeStyle.map(rule => 
            rule.includes('2 spaces') ? 'Use 4 spaces for indentation (PEP 8)' : rule
          ),
          'Follow PEP 8 style guidelines',
          'Use type hints for function parameters and return values'
        ],
        architecture: [
          ...basePreferences.architecture,
          'Use virtual environments for dependency management',
          'Follow Django/Flask best practices for web applications'
        ]
      }
    };

    return typeSpecificPreferences[projectType] || basePreferences;
  }

  /**
   * Get project structure rules for a specific project type
   * @param {string} projectType - Project type
   * @returns {Object} - Project structure rules
   */
  getProjectStructureForType(projectType) {
    const baseStructure = {
      directories: [
        'Organize source code in logical modules/packages',
        'Separate business logic from presentation layer',
        'Use consistent directory naming (kebab-case or snake_case)',
        'Keep configuration files in root or dedicated config directory',
        'Organize tests to mirror source code structure'
      ],
      fileNaming: [
        'Use descriptive file names that indicate purpose',
        'Follow language conventions (camelCase for JS, snake_case for Python)',
        'Use consistent file extensions',
        'Prefix test files with test_ or suffix with .test/.spec',
        'Use index files for clean imports'
      ],
      bmadWorkflow: [
        'Store BMad planning documents in docs/ directory',
        'Use .kiro/specs/ for Kiro spec-driven development',
        'Organize BMad stories by feature or epic',
        'Keep architecture decisions in docs/architecture/',
        'Maintain BMad agent configurations in .kiro/agents/'
      ],
      documentation: [
        'README.md in root with project overview and setup',
        'API documentation in docs/api/',
        'Architecture documentation in docs/architecture/',
        'User guides in docs/guides/',
        'Changelog in root directory'
      ],
      configuration: [
        'Environment-specific config files (.env, config.json)',
        'Build configuration in root (package.json, Makefile)',
        'CI/CD configuration in .github/ or .gitlab/',
        'Docker configuration in root or docker/ directory',
        'IDE configuration in .vscode/ or .idea/'
      ]
    };

    // Customize structure based on project type
    const typeSpecificStructure = {
      react: {
        directories: [
          ...baseStructure.directories,
          'Organize components in src/components/',
          'Use src/hooks/ for custom React hooks',
          'Store assets in src/assets/ or public/',
          'Use src/utils/ for utility functions'
        ]
      },
      'node-backend': {
        directories: [
          ...baseStructure.directories,
          'Organize routes in src/routes/ or routes/',
          'Use src/middleware/ for Express middleware',
          'Store models in src/models/ or models/',
          'Use src/services/ for business logic'
        ]
      },
      python: {
        directories: [
          ...baseStructure.directories,
          'Use src/ layout for Python packages',
          'Store requirements in requirements/ directory',
          'Use scripts/ for utility scripts',
          'Organize modules by domain/feature'
        ]
      }
    };

    return typeSpecificStructure[projectType] || baseStructure;
  }

  /**
   * Get project type specific rules
   * @param {string} projectType - Project type
   * @returns {string|null} - Project specific rules content
   */
  getProjectTypeSpecificRules(projectType) {
    const projectRules = {
      react: `## React Development Guidelines

### Component Development
- Use functional components with hooks over class components
- Implement proper prop validation with TypeScript or PropTypes
- Follow React performance best practices (memo, useMemo, useCallback)
- Use React DevTools for debugging and profiling

### State Management
- Use useState for local component state
- Use useContext for shared state across components
- Consider Redux Toolkit for complex global state
- Implement proper state normalization for complex data

### Styling
- Use CSS Modules or styled-components for component styling
- Follow BEM methodology for CSS class naming
- Implement responsive design with mobile-first approach
- Use CSS variables for consistent theming

### Testing
- Use React Testing Library for component testing
- Test user interactions and behavior, not implementation details
- Use MSW (Mock Service Worker) for API mocking
- Implement visual regression testing for UI components`,

      'node-backend': `## Node.js Backend Development Guidelines

### API Development
- Use RESTful API design principles
- Implement proper HTTP status codes and error responses
- Use middleware for cross-cutting concerns (auth, logging, validation)
- Document APIs with OpenAPI/Swagger specifications

### Database Integration
- Use ORM/ODM for database interactions (Prisma, Mongoose, Sequelize)
- Implement proper database migrations and seeding
- Use connection pooling for database connections
- Implement proper indexing for query performance

### Security
- Use helmet.js for security headers
- Implement rate limiting and request validation
- Use HTTPS in production environments
- Implement proper session management and JWT handling

### Performance
- Use compression middleware for response compression
- Implement caching strategies (Redis, in-memory)
- Use clustering for multi-core utilization
- Monitor performance with APM tools`,

      python: `## Python Development Guidelines

### Code Quality
- Follow PEP 8 style guidelines strictly
- Use type hints for all function signatures
- Implement proper docstrings following Google or NumPy style
- Use linting tools (flake8, pylint) and formatters (black, isort)

### Package Management
- Use virtual environments for all projects
- Pin dependency versions in requirements.txt
- Use requirements-dev.txt for development dependencies
- Consider using Poetry for dependency management

### Web Development (Django/Flask)
- Follow Django/Flask best practices and conventions
- Use Django ORM or SQLAlchemy for database operations
- Implement proper URL routing and view organization
- Use Django REST Framework or Flask-RESTful for APIs

### Testing
- Use pytest for testing framework
- Implement proper test fixtures and factories
- Use coverage.py for test coverage reporting
- Implement integration tests for database operations`,

      'phaser-game': `## Phaser Game Development Guidelines

### Game Architecture
- Use Scene-based architecture for game states
- Implement proper game object lifecycle management
- Use Phaser's built-in physics systems (Arcade, Matter.js)
- Organize game assets in logical directory structure

### Performance
- Optimize sprite atlases and texture usage
- Use object pooling for frequently created/destroyed objects
- Implement proper memory management for game objects
- Use Phaser's built-in performance monitoring tools

### Asset Management
- Use consistent naming conventions for assets
- Optimize images and audio files for web delivery
- Implement proper asset loading and preloading
- Use Phaser's asset management system effectively

### Game Logic
- Separate game logic from presentation layer
- Use state machines for complex game object behavior
- Implement proper input handling and user interaction
- Use Phaser's event system for decoupled communication`
    };

    return projectRules[projectType] || null;
  }

  /**
   * Create templates for technical preferences and coding standards
   * @param {string} kiroPath - Path to Kiro workspace
   * @param {Object} techStack - Detected technology stack
   * @returns {Promise<void>}
   */
  async createTechnicalStandardsTemplates(kiroPath, techStack = {}) {
    this.log('Creating technical standards templates');
    
    const steeringDir = path.join(kiroPath, '.kiro', 'steering');
    await fs.ensureDir(steeringDir);
    
    // Create language-specific templates
    for (const [language, config] of Object.entries(techStack)) {
      await this.createLanguageSpecificTemplate(steeringDir, language, config);
    }
    
    // Create framework-specific templates
    if (techStack.frameworks) {
      for (const framework of techStack.frameworks) {
        await this.createFrameworkSpecificTemplate(steeringDir, framework);
      }
    }
  }

  /**
   * Create language-specific steering rule template
   * @param {string} steeringDir - Steering directory path
   * @param {string} language - Programming language
   * @param {Object} config - Language configuration
   * @returns {Promise<void>}
   */
  async createLanguageSpecificTemplate(steeringDir, language, config) {
    const templatePath = path.join(steeringDir, `${language}.md`);
    
    if (await fs.pathExists(templatePath)) {
      this.log(`${language} template already exists, skipping`);
      return;
    }
    
    const languageRules = this.getLanguageSpecificRules(language, config);
    
    if (languageRules) {
      await fs.writeFile(templatePath, languageRules);
      this.log(`Created ${language} specific template`, 'success');
    }
  }

  /**
   * Get language-specific steering rules
   * @param {string} language - Programming language
   * @param {Object} config - Language configuration
   * @returns {string|null} - Language specific rules
   */
  getLanguageSpecificRules(language, config) {
    const languageTemplates = {
      javascript: `---
inclusion: fileMatch
fileMatchPattern: ".*\\\\.(js|jsx)$"
---

# JavaScript Specific Rules

## Code Style
- Use ES6+ features (arrow functions, destructuring, template literals)
- Prefer const over let, avoid var
- Use meaningful variable names and avoid abbreviations
- Implement proper error handling with try-catch blocks

## Best Practices
- Use strict mode ('use strict')
- Avoid global variables and namespace pollution
- Use modules (import/export) for code organization
- Implement proper async/await patterns

## Performance
- Avoid memory leaks with proper event listener cleanup
- Use efficient array methods (map, filter, reduce)
- Implement debouncing for expensive operations
- Use lazy loading for large modules`,

      typescript: `---
inclusion: fileMatch
fileMatchPattern: ".*\\\\.(ts|tsx)$"
---

# TypeScript Specific Rules

## Type Safety
- Use strict TypeScript configuration
- Avoid 'any' type, use proper type definitions
- Define interfaces for object shapes
- Use union types and type guards appropriately

## Code Organization
- Use barrel exports (index.ts) for clean imports
- Organize types in separate .d.ts files when appropriate
- Use enums for constants with semantic meaning
- Implement proper generic constraints

## Best Practices
- Use utility types (Partial, Pick, Omit) effectively
- Implement proper error handling with typed errors
- Use type assertions sparingly and safely
- Document complex types with JSDoc comments`,

      python: `---
inclusion: fileMatch
fileMatchPattern: ".*\\\\.py$"
---

# Python Specific Rules

## Code Style (PEP 8)
- Use 4 spaces for indentation, never tabs
- Limit lines to 79 characters for code, 72 for comments
- Use snake_case for variables and functions, PascalCase for classes
- Use meaningful names and avoid single-letter variables (except loops)

## Best Practices
- Use list comprehensions and generator expressions appropriately
- Implement proper exception handling with specific exception types
- Use context managers (with statements) for resource management
- Follow the Zen of Python principles

## Type Hints
- Use type hints for all function parameters and return values
- Import types from typing module when needed
- Use Optional for nullable values
- Document complex types with comments`
    };

    return languageTemplates[language] || null;
  }

  /**
   * Create framework-specific steering rule template
   * @param {string} steeringDir - Steering directory path
   * @param {string} framework - Framework name
   * @returns {Promise<void>}
   */
  async createFrameworkSpecificTemplate(steeringDir, framework) {
    const templatePath = path.join(steeringDir, `${framework}.md`);
    
    if (await fs.pathExists(templatePath)) {
      this.log(`${framework} template already exists, skipping`);
      return;
    }
    
    const frameworkRules = this.getFrameworkSpecificRules(framework);
    
    if (frameworkRules) {
      await fs.writeFile(templatePath, frameworkRules);
      this.log(`Created ${framework} specific template`, 'success');
    }
  }

  /**
   * Get framework-specific steering rules
   * @param {string} framework - Framework name
   * @returns {string|null} - Framework specific rules
   */
  getFrameworkSpecificRules(framework) {
    const frameworkTemplates = {
      express: `---
inclusion: always
---

# Express.js Specific Rules

## Application Structure
- Use proper middleware ordering (error handling last)
- Implement route-specific middleware for authentication
- Use express.Router() for modular route organization
- Implement proper request validation middleware

## Security
- Use helmet.js for security headers
- Implement CORS properly for cross-origin requests
- Use express-rate-limit for rate limiting
- Validate and sanitize all user inputs

## Error Handling
- Use centralized error handling middleware
- Return consistent error response format
- Log errors appropriately (don't expose internal errors)
- Use proper HTTP status codes`,

      react: `---
inclusion: fileMatch
fileMatchPattern: ".*\\\\.(jsx|tsx)$"
---

# React Specific Rules

## Component Design
- Use functional components with hooks
- Implement proper prop validation
- Follow single responsibility principle for components
- Use composition over inheritance

## Performance
- Use React.memo for expensive components
- Implement proper key props for lists
- Use useMemo and useCallback judiciously
- Avoid creating objects/functions in render

## State Management
- Use useState for local component state
- Use useContext for shared state
- Consider useReducer for complex state logic
- Implement proper state lifting patterns`
    };

    return frameworkTemplates[framework] || null;
  }
}

module.exports = SteeringTemplateGenerator;