# Web Application Template - BMad + Kiro

A starter template for building modern web applications with BMad Method and Kiro IDE integration.

## Template Features

- **Pre-configured Kiro workspace** with BMad agents
- **Modern tech stack** with React, TypeScript, and Node.js
- **Automated workflows** with intelligent hooks
- **Comprehensive steering rules** for consistent development
- **Example specs** demonstrating BMad planning workflow
- **Testing setup** with Jest and Cypress
- **CI/CD pipeline** configuration

## Quick Start

1. **Create new project from template:**
   ```bash
   npx create-bmad-app my-web-app --template=web-app --ide=kiro
   ```

2. **Initialize and install dependencies:**
   ```bash
   cd my-web-app
   npm install
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

## Included Components

### BMad Agents
- **Product Manager**: Requirements gathering and PRD creation
- **Architect**: Technical design and architecture decisions
- **Developer**: Implementation guidance and code generation
- **QA Engineer**: Code review and testing strategies
- **Scrum Master**: Project planning and story management

### Kiro Integration
- **Specs**: Pre-configured spec templates for common features
- **Steering Rules**: Best practices for web development
- **Hooks**: Automated workflows for development lifecycle
- **Context Providers**: Automatic project awareness

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, GraphQL, Prisma
- **Database**: PostgreSQL with development Docker setup
- **Testing**: Jest, React Testing Library, Cypress
- **Tools**: ESLint, Prettier, Husky git hooks

## Project Structure

```
my-web-app/
├── .kiro/                    # Kiro workspace configuration
│   ├── agents/              # BMad agents (auto-generated)
│   ├── specs/               # Feature specifications
│   ├── steering/            # Development guidelines
│   └── hooks/               # Automated workflows
├── src/
│   ├── frontend/            # React application
│   ├── backend/             # Node.js API
│   └── shared/              # Shared utilities and types
├── tests/                   # Test suites
├── docs/                    # Project documentation
└── scripts/                 # Build and deployment scripts
```

## Development Workflow

### 1. Feature Planning
```bash
# Start with BMad Product Manager
# Create feature requirements and specifications
# Generate Kiro spec with executable tasks
```

### 2. Implementation
```bash
# Execute tasks from .kiro/specs/feature-name/tasks.md
# Click "Start task" to invoke appropriate BMad agent
# Automated code review and testing via hooks
```

### 3. Quality Assurance
```bash
# Automated testing on file saves
# Code review with BMad QA agent
# Performance and security analysis
```

## Customization

### Adding New Features
1. Use BMad PM agent to create requirements
2. Generate Kiro spec with design and tasks
3. Execute tasks with BMad Dev agent
4. Review with BMad QA agent

### Modifying Steering Rules
Edit files in `.kiro/steering/` to customize:
- Code style and formatting preferences
- Technology stack decisions
- Architecture patterns
- Testing strategies

### Creating Custom Hooks
Add new automation in `.kiro/hooks/`:
- File change triggers
- Git commit hooks
- Manual workflow triggers
- Integration with external tools

## Available Scripts

```bash
npm run dev          # Start development servers
npm run build        # Build for production
npm run test         # Run test suite
npm run test:e2e     # Run end-to-end tests
npm run lint         # Run linting
npm run format       # Format code
npm run validate     # Validate BMad configuration
```

## Deployment

### Development
```bash
docker-compose up -d  # Start local services
npm run dev          # Start development
```

### Production
```bash
npm run build        # Build application
npm run start        # Start production server
```

### Docker
```bash
docker build -t my-web-app .
docker run -p 3000:3000 my-web-app
```

## Support

- [BMad Method Documentation](https://github.com/bmad-method/bmad-method)
- [Kiro Integration Guide](../../docs/kiro-integration-user-guide.md)
- [Template Issues](https://github.com/bmad-method/templates/issues)