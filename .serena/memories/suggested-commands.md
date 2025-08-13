# Essential BMAD-METHOD Commands

## Build Commands
- `npm run build` - Build all agents and teams (resolves dependencies, creates dist/)
- `npm run build:agents` - Build only agents 
- `npm run build:teams` - Build only teams
- `npm run validate` - Validate YAML files and configurations

## Installation & Updates
- `npx bmad-method install` - Install/update BMad in a project (primary method)
- `npm run install:bmad` - Alternative installation command
- `git pull && npm run install:bmad` - Update existing installation

## Version Management
- `npm run version:all` - Bump all component versions
- `npm run version:all:minor` - Bump all to minor version
- `npm run version:all:major` - Bump all to major version
- `npm run version:all:patch` - Bump all to patch version
- `npm run version:patch/minor/major` - Bump framework version
- `npm run version:expansion` - Bump expansion pack version

## Development Workflow
- `npm run format` - Format all markdown files with Prettier (MANDATORY before commits)
- `npm run list:agents` - List all available agents
- `npm run release:test` - Test semantic release configuration

## Quality Assurance
- Run tests: `jest` (if tests exist)
- Lint staged files: Automatic via husky pre-commit hooks
- Format check: `prettier --check "**/*.md"`

## Utility Commands
- `npm run flatten` - Create AI-optimized codebase XML for analysis
- Standard Linux commands: `ls`, `cd`, `grep`, `find`, `git` (all standard)
- Node.js entry point: `tools/cli.js` for programmatic access