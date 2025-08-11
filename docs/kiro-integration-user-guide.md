# BMad Method Kiro Integration User Guide

## Overview

This guide walks you through using BMad Method with Kiro IDE, leveraging Kiro's unique features like specs, steering rules, hooks, and advanced AI assistant capabilities for a native development experience.

## Installation and Setup

### Prerequisites

- Kiro IDE installed and configured
- Node.js v20+ installed
- A Kiro workspace initialized (`.kiro` directory present)

### Installing BMad Method for Kiro

1. **Install BMad Method with Kiro integration:**
   ```bash
   npx bmad-method install --ide=kiro
   ```

2. **Verify installation:**
   - Check that BMad agents appear in Kiro's agent selection interface
   - Verify `.kiro/agents/` contains BMad agent files
   - Confirm `.kiro/steering/` has BMad-specific steering rules

3. **Optional: Install expansion packs:**
   ```bash
   npx bmad-method install --ide=kiro --expansion=bmad-2d-phaser-game-dev
   ```

### Upgrading Existing Installation

```bash
npx bmad-method install --ide=kiro --upgrade
```

This preserves your custom steering rules, hooks, and project configurations.

## Core Workflow Integration

### 1. Planning with BMad Agents in Kiro

BMad's planning workflow creates native Kiro specs that integrate seamlessly with Kiro's spec-driven development.

#### Starting a New Project

1. **Invoke the BMad Product Manager:**
   - Open Kiro chat
   - Select "BMad Product Manager" from agent list
   - The agent automatically accesses your project context via `#Codebase`

2. **Create Product Requirements:**
   ```
   Create a PRD for a task management application with user authentication and real-time collaboration features.
   ```

3. **Generate Kiro Spec:**
   The PM agent creates a spec at `.kiro/specs/task-management/` with:
   - `requirements.md` - EARS format requirements
   - `design.md` - Architecture and technical design
   - `tasks.md` - Executable implementation tasks

#### Architecture Planning

1. **Invoke BMad Architect:**
   - Select "BMad Architect" agent
   - Reference the created spec: `#Folder .kiro/specs/task-management`

2. **Create Technical Design:**
   ```
   Review the requirements and create a detailed technical architecture for this task management system.
   ```

### 2. Development with Spec Tasks

#### Executing Tasks

1. **Open the tasks file:**
   - Navigate to `.kiro/specs/your-project/tasks.md`
   - Click "Start task" next to any task

2. **Task Execution:**
   - Kiro automatically invokes the appropriate BMad agent
   - Agent receives full task context and project awareness
   - Progress is tracked through Kiro's task status system

#### Example Task Execution

```markdown
- [ ] 1.1 Create user authentication models
  - Implement User, Session, and Permission models
  - Add validation and security measures
  - Write unit tests for all models
  - _Requirements: 1.2, 3.1_
```

When you click "Start task", the BMad Dev agent:
- Accesses current project structure via `#Codebase`
- Reviews requirements 1.2 and 3.1 automatically
- Implements the models with full context awareness

### 3. Automated Workflows with Hooks

BMad creates intelligent Kiro hooks for workflow automation:

#### Story Progression Hook
Automatically advances to the next development story when current tasks are completed.

#### Code Review Hook
Triggers BMad QA agent review when code files are saved:
```yaml
# .kiro/hooks/bmad-code-review.yaml
name: "BMad Code Review"
trigger:
  type: "file_save"
  pattern: "src/**/*.{js,ts,py}"
action:
  agent: "bmad-qa"
  task: "review-code-changes"
```

#### Documentation Update Hook
Updates project documentation when requirements change:
```yaml
# .kiro/hooks/bmad-doc-update.yaml
name: "BMad Documentation Update"
trigger:
  type: "file_change"
  pattern: ".kiro/specs/*/requirements.md"
action:
  agent: "bmad-architect"
  task: "update-architecture-docs"
```

## Context Integration

### Automatic Context Awareness

BMad agents automatically leverage Kiro's context system:

- **Current Work**: `#File` and `#Folder` for immediate context
- **Project Understanding**: `#Codebase` for full project awareness
- **Issue Tracking**: `#Problems` for current development issues
- **Change Awareness**: `#Git Diff` for recent modifications
- **Build Status**: `#Terminal` for build and test results

### Example Context Usage

When the BMad Dev agent works on a bug fix:

```
Fix the authentication issue in the login component.

Context automatically provided:
- #File: Current login component file
- #Problems: TypeScript errors and linting issues
- #Git Diff: Recent changes to authentication system
- #Terminal: Test failure output
```

## Steering Rules Integration

### Project-Specific Conventions

BMad agents automatically apply Kiro steering rules:

#### Technical Preferences (`.kiro/steering/tech.md`)
```markdown
# Technical Stack Preferences

- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Jest for unit tests, Cypress for E2E
- **Code Style**: Prettier with ESLint
```

#### Project Structure (`.kiro/steering/structure.md`)
```markdown
# Project Structure Guidelines

- Components in `src/components/`
- API routes in `src/api/`
- Database models in `src/models/`
- Tests alongside source files with `.test.ts` suffix
```

### BMad-Generated Steering Rules

BMad agents create appropriate steering rules for your project type:

- **Web Application**: React/Vue/Angular specific conventions
- **API Service**: REST/GraphQL API guidelines
- **Mobile App**: React Native/Flutter patterns
- **Game Development**: Unity/Phaser specific rules

## MCP Tool Integration

### Available MCP Tools

BMad agents leverage Kiro's MCP integrations:

#### Research and Analysis
- **Web Search**: BMad Analyst uses for market research
- **Documentation**: Access to external API docs and references

#### Development Tools
- **HTTP Client**: BMad Dev agent for API testing
- **Database Tools**: Direct database interaction for data modeling

#### Configuration Example

```json
{
  "mcpServers": {
    "web-search": {
      "command": "uvx",
      "args": ["web-search-mcp-server@latest"],
      "disabled": false
    },
    "http-client": {
      "command": "uvx", 
      "args": ["http-client-mcp-server@latest"],
      "disabled": false
    }
  }
}
```

## Troubleshooting

### Common Issues

#### 1. BMad Agents Not Appearing in Kiro

**Problem**: Agents don't show up in Kiro's agent selection.

**Solution**:
- Verify `.kiro/agents/` directory contains BMad agent files
- Check Kiro agent cache: restart Kiro IDE
- Validate agent file format with `npx bmad-method validate`

#### 2. Context Not Loading Properly

**Problem**: Agents can't access project context.

**Solution**:
- Ensure you're in a Kiro workspace (`.kiro` directory present)
- Check Kiro context providers are enabled
- Try manually providing context with `#File` or `#Codebase`

#### 3. Steering Rules Not Applied

**Problem**: Agents ignore project conventions.

**Solution**:
- Verify steering rules exist in `.kiro/steering/`
- Check rule file format and syntax
- Ensure rules are not conflicting (check resolution guidance)

#### 4. Hooks Not Triggering

**Problem**: Automated workflows don't execute.

**Solution**:
- Check hook configuration in `.kiro/hooks/`
- Verify hook triggers match your file patterns
- Test hooks manually through Kiro's Agent Hooks UI

#### 5. MCP Tools Unavailable

**Problem**: Agents can't access external tools.

**Solution**:
- Check MCP configuration in `.kiro/settings/mcp.json`
- Install required MCP servers: `uv` and `uvx`
- Verify MCP server status in Kiro's MCP Server view

### Getting Help

1. **Validate Installation**:
   ```bash
   npx bmad-method validate --ide=kiro
   ```

2. **Check Logs**:
   - Kiro IDE logs for agent execution issues
   - Hook execution logs in Kiro's Agent Hooks view
   - MCP server logs in Kiro's MCP Server view

3. **Community Support**:
   - GitHub Issues: Report bugs and feature requests
   - Documentation: Check latest updates and examples

## Best Practices

### 1. Spec Organization

- Use descriptive spec names that match feature scope
- Keep requirements focused and testable
- Break large features into multiple specs

### 2. Task Granularity

- Make tasks small enough to complete in one session
- Include clear acceptance criteria
- Reference specific requirements for traceability

### 3. Context Management

- Let Kiro provide context automatically when possible
- Use specific context providers (`#File` vs `#Codebase`) based on need
- Provide additional context in chat when automatic context is insufficient

### 4. Steering Rules

- Keep rules specific and actionable
- Avoid conflicting rules across different files
- Update rules as project evolves

### 5. Hook Usage

- Start with manual hooks before automating workflows
- Test hooks thoroughly before relying on automation
- Provide fallback manual processes for critical workflows

## Next Steps

1. **Explore Expansion Packs**: Try domain-specific BMad extensions
2. **Customize Agents**: Modify agent prompts for your specific needs
3. **Create Custom Hooks**: Build automation for your unique workflows
4. **Share Templates**: Contribute project templates back to the community

For more advanced usage, see the [Developer Documentation](kiro-integration-developer-guide.md).