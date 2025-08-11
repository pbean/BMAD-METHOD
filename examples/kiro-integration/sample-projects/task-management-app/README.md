# Task Management App - BMad + Kiro Example

A complete full-stack task management application demonstrating BMad Method integration with Kiro IDE.

## Project Overview

This example showcases:
- **Planning Phase**: BMad PM and Architect agents create comprehensive specs
- **Development Phase**: Spec-driven development with automated task execution
- **Quality Assurance**: Automated code review and testing workflows
- **Context Integration**: Full project awareness through Kiro's context system
- **Automation**: Intelligent hooks for workflow progression

## Features

- User authentication and authorization
- Real-time task collaboration
- Project management with teams
- Notification system
- Mobile-responsive design
- REST API with GraphQL subscriptions

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express and GraphQL
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: WebSocket connections
- **Testing**: Jest, React Testing Library, Cypress
- **Deployment**: Docker containers

## Getting Started

### Prerequisites

- Kiro IDE installed
- Node.js v20+
- PostgreSQL database
- Docker (optional)

### Setup

1. **Initialize Kiro workspace:**
   ```bash
   kiro init
   ```

2. **Install BMad Method:**
   ```bash
   npx bmad-method install --ide=kiro
   ```

3. **Install project dependencies:**
   ```bash
   npm install
   ```

4. **Set up database:**
   ```bash
   npm run db:setup
   ```

5. **Start development servers:**
   ```bash
   npm run dev
   ```

## BMad Workflow Demonstration

### Phase 1: Planning with BMad Agents

1. **Product Requirements (BMad PM Agent):**
   - Open Kiro chat and select "BMad Product Manager"
   - Run: "Create a comprehensive PRD for this task management application"
   - Review generated spec at `.kiro/specs/task-management/requirements.md`

2. **Technical Architecture (BMad Architect Agent):**
   - Select "BMad Architect" agent
   - Run: "Design the technical architecture based on the requirements"
   - Review generated design at `.kiro/specs/task-management/design.md`

3. **Development Planning (BMad Scrum Master Agent):**
   - Select "BMad Scrum Master" agent
   - Run: "Create development stories and tasks for this project"
   - Review generated tasks at `.kiro/specs/task-management/tasks.md`

### Phase 2: Development with Kiro Specs

1. **Execute Tasks:**
   - Open `.kiro/specs/task-management/tasks.md`
   - Click "Start task" next to any task
   - BMad Dev agent automatically provides implementation guidance

2. **Automated Workflows:**
   - Code review triggers when files are saved
   - Documentation updates when requirements change
   - Test execution on git commits

### Phase 3: Quality Assurance

1. **Code Review (BMad QA Agent):**
   - Automatic reviews triggered by file saves
   - Manual reviews via "BMad QA" agent
   - Integration with Kiro's #Problems context

2. **Testing Automation:**
   - Unit tests generated with implementation
   - Integration tests for API endpoints
   - E2E tests for user workflows

## Kiro Integration Features

### Context Awareness

The project demonstrates automatic context integration:

```markdown
# Example: BMad Dev Agent working on authentication
Context automatically provided:
- #File: Current authentication component
- #Codebase: Full project structure and dependencies
- #Problems: TypeScript errors and linting issues
- #Git Diff: Recent changes to auth system
- #Terminal: Test results and build status
```

### Steering Rules

Project-specific conventions in `.kiro/steering/`:

- `tech-stack.md`: Technology preferences and patterns
- `code-style.md`: Coding standards and formatting rules
- `architecture.md`: Architectural decisions and patterns
- `testing.md`: Testing strategies and requirements

### Automated Hooks

Intelligent automation in `.kiro/hooks/`:

- `story-progression.yaml`: Advances to next story when tasks complete
- `code-review.yaml`: Triggers QA review on file saves
- `doc-update.yaml`: Updates documentation on requirement changes
- `test-runner.yaml`: Runs tests on git commits

### MCP Tool Integration

External tool integration examples:

- **Web Search**: Market research for feature validation
- **API Testing**: Automated endpoint testing and validation
- **Documentation**: Auto-generated API docs and user guides

## Project Structure

```
task-management-app/
├── .kiro/                     # Kiro workspace configuration
│   ├── agents/               # BMad agents (auto-generated)
│   ├── specs/               # Project specifications
│   ├── steering/            # Project conventions
│   └── hooks/               # Automated workflows
├── src/
│   ├── frontend/            # React application
│   ├── backend/             # Node.js API server
│   └── shared/              # Shared types and utilities
├── tests/                   # Test suites
├── docs/                    # Project documentation
├── docker/                  # Container configurations
└── scripts/                 # Build and deployment scripts
```

## Development Workflow

### 1. Feature Development

```bash
# Start new feature
git checkout -b feature/user-notifications

# Open spec task
# Click "Start task" in .kiro/specs/task-management/tasks.md

# BMad Dev agent provides:
# - Implementation guidance
# - Code examples
# - Testing strategies
# - Integration patterns
```

### 2. Code Review Process

```bash
# Save changes triggers automatic review
# BMad QA agent analyzes:
# - Code quality and patterns
# - Test coverage
# - Security considerations
# - Performance implications
```

### 3. Documentation Updates

```bash
# Requirement changes trigger:
# - Architecture document updates
# - API documentation regeneration
# - User guide modifications
# - Deployment guide updates
```

## Testing the Integration

### Unit Tests

```bash
npm run test:unit
```

Tests BMad agent integration:
- Agent transformation accuracy
- Context injection functionality
- Spec generation from workflows
- Hook automation behavior

### Integration Tests

```bash
npm run test:integration
```

Tests end-to-end workflows:
- Complete planning → development cycle
- Agent collaboration and handoffs
- Context sharing between agents
- Automated workflow progression

### Performance Tests

```bash
npm run test:performance
```

Tests integration performance:
- Context loading with large codebase
- Hook execution responsiveness
- Agent transformation speed
- Memory usage optimization

## Customization Examples

### Custom Steering Rules

Create project-specific conventions:

```markdown
# .kiro/steering/api-patterns.md
# API Development Patterns

## REST Endpoint Conventions
- Use plural nouns for resource names
- Implement consistent error handling
- Include request/response validation
- Add comprehensive logging

## GraphQL Schema Patterns
- Use descriptive type names
- Implement proper error handling
- Add field-level authorization
- Include deprecation notices
```

### Custom Hooks

Create specialized automation:

```yaml
# .kiro/hooks/api-validation.yaml
name: "API Endpoint Validation"
description: "Validate API endpoints when routes are modified"
trigger:
  type: "file_change"
  pattern: "src/backend/routes/**/*.js"
action:
  agent: "bmad-dev"
  task: "validate-api-endpoints"
  context:
    - "#File"
    - "#Git Diff"
    - "#Terminal"
```

### Custom MCP Tools

Integrate domain-specific tools:

```json
{
  "mcpServers": {
    "task-management-api": {
      "command": "uvx",
      "args": ["task-management-mcp-server@latest"],
      "env": {
        "API_BASE_URL": "http://localhost:3000/api"
      },
      "disabled": false
    }
  }
}
```

## Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm run start
```

### Docker

```bash
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **BMad agents not appearing:**
   - Verify Kiro workspace initialization
   - Check agent installation: `npx bmad-method validate --ide=kiro`

2. **Context not loading:**
   - Ensure you're in the project root
   - Check Kiro context providers are enabled

3. **Hooks not triggering:**
   - Verify hook configuration in `.kiro/hooks/`
   - Check file patterns match your changes

4. **MCP tools unavailable:**
   - Install required tools: `uv` and `uvx`
   - Check MCP configuration in `.kiro/settings/mcp.json`

### Getting Help

- Check the [User Guide](../../../docs/kiro-integration-user-guide.md)
- Review [Developer Documentation](../../../docs/kiro-integration-developer-guide.md)
- Open GitHub issues for bugs or feature requests

## Contributing

Contributions welcome! Please:

1. Follow the established project structure
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all BMad workflows remain functional

## License

This example project is provided under the same license as BMad Method.