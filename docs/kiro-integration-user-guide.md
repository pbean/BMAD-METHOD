# BMad Method Kiro Integration User Guide

## Overview

This guide walks you through using BMad Method with Kiro IDE, leveraging Kiro's unique features like specs, steering rules, hooks, and advanced AI assistant capabilities for a native development experience.

## Installation and Setup

### Prerequisites

- Kiro IDE installed and configured
- Node.js v20+ installed
- A Kiro workspace initialized (`.kiro` directory present)

### Installing BMad Method for Kiro

#### New Installation

1. **Install BMad Method with complete Kiro integration:**

   ```bash
   npx bmad-method install --ide=kiro
   ```

   This command performs:
   - **Agent Discovery**: Scans all BMad core and expansion pack agents
   - **Complete Agent Conversion**: Transforms all agents to Kiro-compatible format
   - **Context Integration**: Adds Kiro-specific context injection to each agent
   - **Dependency Resolution**: Includes all agent dependencies (tasks, templates, checklists)
   - **Native Registration**: Registers agents with Kiro's agent system
   - **Steering Generation**: Creates auto-generated steering rules for each agent
   - **Hook Creation**: Generates domain-specific automation hooks
   - **Template Conversion**: Converts BMad templates to Kiro spec format

2. **Verify complete installation:**

   ```bash
   npx bmad-method validate --ide=kiro
   ```

   This validates:
   - All BMad agents are converted and registered
   - Agent dependencies are properly resolved
   - Kiro integration is functioning correctly
   - No conversion errors or missing components

3. **Check installation status:**
   - **Agent List**: All BMad agents appear in Kiro's agent selection
   - **File Structure**: `.kiro/agents/` contains all converted agent files
   - **Steering Rules**: `.kiro/steering/` has BMad-specific steering rules
   - **Hooks**: `.kiro/hooks/` contains generated automation hooks
   - **Spec Templates**: `.kiro/spec-templates/` has converted templates

#### Installing with Expansion Packs

1. **Install with specific expansion packs:**

   ```bash
   npx bmad-method install --ide=kiro --expansion=bmad-2d-phaser-game-dev,bmad-infrastructure-devops
   ```

2. **Install all available expansion packs:**

   ```bash
   npx bmad-method install --ide=kiro --expansion=all
   ```

Each expansion pack adds:
- Domain-specific agents with specialized knowledge
- Expansion-specific templates and workflows
- Domain-focused steering rules and context
- Automated hooks for domain workflows

#### Upgrading Existing Installation

The installer automatically detects and upgrades incomplete installations:

```bash
npx bmad-method install --ide=kiro --upgrade
```

**Upgrade Process:**
1. **Detection**: Analyzes current installation state
2. **Missing Agent Conversion**: Converts any missing agents
3. **Dependency Resolution**: Ensures all dependencies are included
4. **Customization Preservation**: Maintains your custom steering rules and hooks
5. **Migration**: Converts steering-based workarounds to native agents
6. **Validation**: Confirms upgrade completeness

**Force Complete Reinstall:**

```bash
npx bmad-method install --ide=kiro --force-upgrade
```

This performs a complete reinstallation while preserving customizations.

## Agent Activation and Usage

### How Agent Activation Works

BMad agents are natively registered with Kiro's agent system, allowing seamless activation through Kiro's standard interface:

1. **Agent Discovery**: All converted BMad agents appear in Kiro's agent selection
2. **Native Activation**: Agents activate through Kiro's standard mechanisms
3. **Context Integration**: Activated agents automatically access Kiro's context system
4. **Dependency Loading**: Agent dependencies (tasks, templates, checklists) are automatically available
5. **Steering Application**: Project-specific steering rules are automatically applied

### Available BMad Agents

#### Core BMad Agents

After installation, these agents are available in Kiro:

- **BMad Product Manager** (`bmad-pm`): Creates PRDs and product specifications
- **BMad Architect** (`bmad-architect`): Designs technical architecture and system design
- **BMad Developer** (`bmad-dev`): Implements code following BMad development patterns
- **BMad Analyst** (`bmad-analyst`): Performs research and analysis tasks
- **BMad QA** (`bmad-qa`): Reviews code and ensures quality standards
- **BMad Scrum Master** (`bmad-sm`): Manages agile processes and story creation
- **BMad UX Expert** (`bmad-ux-expert`): Provides user experience guidance

#### Expansion Pack Agents

Depending on installed expansion packs:

**Game Development** (`bmad-2d-phaser-game-dev`, `bmad-2d-unity-game-dev`):
- **Game Designer**: Creates game design documents and mechanics
- **Game Developer**: Implements game logic and systems
- **Game Architect**: Designs game architecture and technical systems

**Infrastructure/DevOps** (`bmad-infrastructure-devops`):
- **Infrastructure Platform Engineer**: Manages cloud infrastructure and DevOps

### Agent Activation Methods

#### Method 1: Direct Agent Selection

1. **Open Kiro Chat**
2. **Select Agent**: Choose from the agent dropdown/selection interface
3. **Automatic Activation**: Agent activates with full context and dependencies

#### Method 2: Agent Request in Chat

```
@bmad-architect please review the current system design
```

#### Method 3: Spec-Based Activation

When working with Kiro specs, agents are automatically suggested and activated based on task requirements.

### Core Workflow Integration

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

### 3. Complete Workflow Examples

#### Example 1: Building a REST API

**Step 1: Product Planning**

```
Agent: BMad Product Manager
Request: Create a PRD for a REST API that manages user profiles and authentication
```

**Result**: Creates `.kiro/specs/user-api/requirements.md` with detailed requirements

**Step 2: Architecture Design**

```
Agent: BMad Architect
Context: #Folder .kiro/specs/user-api
Request: Design the technical architecture for this user API system
```

**Result**: Updates `.kiro/specs/user-api/design.md` with technical architecture

**Step 3: Implementation Planning**

```
Agent: BMad Scrum Master
Context: #Folder .kiro/specs/user-api
Request: Break down the architecture into implementable development tasks
```

**Result**: Creates detailed task list in `.kiro/specs/user-api/tasks.md`

**Step 4: Development Execution**

Click "Start task" on individual tasks, which automatically activates BMad Dev agent with full context.

#### Example 2: Game Development with Expansion Pack

**Prerequisites**: Install game development expansion pack

```bash
npx bmad-method install --ide=kiro --expansion=bmad-2d-phaser-game-dev
```

**Step 1: Game Design**

```
Agent: Game Designer
Request: Create a design document for a 2D platformer game with collectibles and power-ups
```

**Step 2: Technical Architecture**

```
Agent: Game Architect
Context: #Folder .kiro/specs/platformer-game
Request: Design the technical architecture using Phaser.js framework
```

**Step 3: Implementation**

```
Agent: Game Developer
Context: #Folder .kiro/specs/platformer-game
Task: Implement player movement and collision detection system
```

#### Example 3: Infrastructure Setup

**Prerequisites**: Install infrastructure expansion pack

```bash
npx bmad-method install --ide=kiro --expansion=bmad-infrastructure-devops
```

**Step 1: Infrastructure Planning**

```
Agent: BMad Architect
Request: Design a cloud infrastructure for a Node.js application with database and caching
```

**Step 2: DevOps Implementation**

```
Agent: Infrastructure Platform Engineer
Context: #Folder .kiro/specs/cloud-infrastructure
Request: Create Terraform configurations for the designed infrastructure
```

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

## Complete Agent Conversion Process

### Understanding the Conversion Pipeline

The BMad-to-Kiro conversion process transforms BMad agents into fully native Kiro agents through several stages:

#### Stage 1: Agent Discovery and Scanning

```
BMad Core Agents (bmad-core/agents/*.md)
├── bmad-pm.md
├── bmad-architect.md  
├── bmad-dev.md
├── bmad-analyst.md
├── bmad-qa.md
├── bmad-sm.md
└── bmad-ux-expert.md

Expansion Pack Agents (expansion-packs/*/agents/*.md)
├── bmad-2d-phaser-game-dev/agents/
│   ├── game-designer.md
│   ├── game-developer.md
│   └── game-sm.md
└── bmad-infrastructure-devops/agents/
    └── infra-devops-platform.md
```

#### Stage 2: Agent Transformation

Each agent undergoes comprehensive transformation:

**Original BMad Agent Structure:**
```yaml
---
name: "BMad Architect"
description: "Technical architecture and system design expert"
dependencies:
  tasks: ["create-architecture", "review-design"]
  templates: ["architecture-tmpl.yaml"]
  checklists: ["architect-checklist.md"]
---

# BMad Architect Agent Content...
```

**Converted Kiro Agent Structure:**
```yaml
---
name: "BMad Architect"
description: "Technical architecture and system design expert"
kiro_integration:
  context_injection: true
  steering_integration: true
  native_registration: true
dependencies:
  tasks: ["create-architecture", "review-design"]
  templates: ["architecture-tmpl.yaml"]
  checklists: ["architect-checklist.md"]
  kiro_context: ["#File", "#Folder", "#Codebase", "#Problems"]
---

# Enhanced agent content with Kiro context integration...
```

#### Stage 3: Context Injection

Agents receive Kiro-specific context integration:

```javascript
// Context injection adds Kiro awareness
const contextPrompts = {
  fileContext: "Use #File to understand current work context",
  projectContext: "Use #Codebase for full project understanding", 
  problemContext: "Use #Problems to identify current issues",
  changeContext: "Use #Git Diff to understand recent changes"
};
```

#### Stage 4: Dependency Resolution

All agent dependencies are automatically resolved and included:

```
Agent Dependencies Resolution:
├── Tasks: Copied to .kiro/tasks/
├── Templates: Converted to .kiro/spec-templates/
├── Checklists: Copied to .kiro/checklists/
├── Data: Integrated into steering rules
└── Workflows: Converted to Kiro task sequences
```

#### Stage 5: Native Registration

Agents are registered with Kiro's native agent system:

```javascript
// Agent registration with Kiro
await kiro.agents.register({
  id: 'bmad-architect',
  name: 'BMad Architect', 
  description: 'Technical architecture and system design expert',
  activationHandler: createKiroActivationHandler(agent),
  dependencies: resolvedDependencies,
  contextProviders: ['file', 'codebase', 'problems', 'git']
});
```

### Conversion Validation and Quality Assurance

#### Automated Validation Checks

The conversion process includes comprehensive validation:

1. **Agent Format Validation**: Ensures proper YAML headers and content structure
2. **Dependency Validation**: Verifies all referenced dependencies exist and are accessible
3. **Context Integration Validation**: Tests Kiro context provider integration
4. **Registration Validation**: Confirms successful registration with Kiro's agent system
5. **Activation Validation**: Tests agent activation and basic functionality

#### Conversion Monitoring

Real-time monitoring tracks conversion progress:

```bash
# View conversion progress
npx bmad-method monitor --ide=kiro

# Check conversion statistics
npx bmad-method stats --ide=kiro --conversion
```

**Monitoring Output:**
```
Agent Conversion Progress:
├── Total Agents: 12
├── Successfully Converted: 11
├── Failed Conversions: 1
├── Conversion Rate: 91.7%
└── Average Conversion Time: 2.3s per agent

Failed Agents:
└── bmad-custom-agent: Missing dependency 'custom-task.md'
```

### Template and Workflow Conversion

#### Template Conversion Process

BMad YAML templates are converted to Kiro spec format:

**Original BMad Template:**
```yaml
# architecture-tmpl.yaml
name: "Architecture Template"
instructions: |
  Create a technical architecture document with:
  1. System overview
  2. Component design
  3. Data flow diagrams
sections:
  - overview
  - components  
  - data_models
```

**Converted Kiro Spec Template:**
```markdown
# Architecture Spec Template

## Requirements
- System architecture requirements
- Performance and scalability needs
- Integration requirements

## Design  
- System overview and architecture
- Component design and interactions
- Data flow and storage design

## Tasks
- [ ] 1. Create system architecture diagram
- [ ] 2. Design component interfaces
- [ ] 3. Define data models and relationships
```

#### Workflow Integration

BMad workflows become Kiro task sequences with automation hooks:

```yaml
# Generated hook for workflow automation
name: "BMad Architecture Workflow"
trigger:
  type: "spec_created"
  pattern: "architecture-*"
action:
  sequence:
    - agent: "bmad-architect"
      task: "create-architecture-overview"
    - agent: "bmad-architect" 
      task: "design-system-components"
    - agent: "bmad-dev"
      task: "validate-technical-feasibility"
```

### Context Integration

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

### Advanced Context Integration

BMad agents use enhanced context integration:

```
Agent Request: "Refactor the user service to improve performance"

Automatic Context Resolution:
├── #File: Current user service file
├── #Folder: Services directory structure  
├── #Codebase: Full project understanding
├── #Problems: Performance-related issues
├── #Git Diff: Recent service changes
└── Steering Rules: Project-specific patterns and conventions
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

### Agent Conversion Issues

#### 1. Incomplete Agent Conversion

**Problem**: Some BMad agents are missing from Kiro's agent list.

**Symptoms**:
- Not all expected agents appear in Kiro's agent selection
- Some expansion pack agents are missing
- Agent count doesn't match expected total

**Diagnosis**:

```bash
# Check conversion status
npx bmad-method validate --ide=kiro --verbose

# Run diagnostic analysis
npx bmad-method diagnose --ide=kiro
```

**Solutions**:

```bash
# Perform incremental conversion for missing agents
npx bmad-method install --ide=kiro --incremental

# Force complete reconversion
npx bmad-method install --ide=kiro --force-upgrade

# Convert specific missing agents
npx bmad-method convert-agent --ide=kiro --agent=bmad-architect,bmad-dev
```

#### 2. Agent Conversion Failures

**Problem**: Specific agents fail to convert properly.

**Symptoms**:
- Conversion process reports errors for specific agents
- Agents appear in list but don't activate correctly
- Missing dependencies or malformed agent files

**Diagnosis**:

```bash
# Check conversion logs
cat .kiro/logs/conversion-*.log

# Run detailed diagnostics
npx bmad-method diagnose --ide=kiro --detailed --agent=<agent-id>
```

**Solutions**:

```bash
# Retry conversion for failed agents
npx bmad-method retry-conversion --ide=kiro --failed-only

# Convert with diagnostic mode
npx bmad-method install --ide=kiro --diagnostic-mode

# Manual agent validation
npx bmad-method validate-agent --ide=kiro --agent=<agent-id>
```

#### 3. Dependency Resolution Errors

**Problem**: Agents are missing required dependencies (tasks, templates, checklists).

**Symptoms**:
- Agents activate but can't access required resources
- Missing template or task references
- Incomplete agent functionality

**Diagnosis**:

```bash
# Check dependency resolution
npx bmad-method check-dependencies --ide=kiro

# Analyze missing dependencies
npx bmad-method diagnose --ide=kiro --dependencies
```

**Solutions**:

```bash
# Resolve missing dependencies
npx bmad-method resolve-dependencies --ide=kiro

# Reinstall with dependency validation
npx bmad-method install --ide=kiro --validate-dependencies

# Manual dependency check
npx bmad-method validate --ide=kiro --check-dependencies
```

### Agent Activation Issues

#### 4. BMad Agents Not Appearing in Kiro

**Problem**: Converted agents don't show up in Kiro's agent selection.

**Symptoms**:
- Empty or incomplete agent list in Kiro
- Agents exist in `.kiro/agents/` but aren't registered
- Kiro doesn't recognize BMad agents

**Diagnosis**:

```bash
# Check agent registration status
npx bmad-method check-registration --ide=kiro

# Verify Kiro workspace detection
npx bmad-method detect-kiro --verbose
```

**Solutions**:

```bash
# Re-register all agents
npx bmad-method register-agents --ide=kiro

# Restart Kiro IDE to refresh agent cache
# Check Kiro agent registry in IDE settings

# Validate agent file format
npx bmad-method validate --ide=kiro --agents-only
```

#### 5. Agent Activation Failures

**Problem**: Agents appear in list but fail to activate when requested.

**Symptoms**:
- Agent selection works but activation fails
- Error messages when trying to use agents
- Agents timeout during activation

**Diagnosis**:

```bash
# Check activation logs
cat .kiro/logs/activation-*.log

# Test agent activation
npx bmad-method test-activation --ide=kiro --agent=<agent-id>
```

**Solutions**:

```bash
# Reset agent activation system
npx bmad-method reset-activation --ide=kiro

# Use fallback activation through steering
# (Agents will work through steering rules if native activation fails)

# Clear agent cache and re-register
npx bmad-method clear-cache --ide=kiro
npx bmad-method register-agents --ide=kiro
```

### Context and Integration Issues

#### 6. Context Not Loading Properly

**Problem**: Agents can't access project context or Kiro features.

**Symptoms**:
- Agents don't understand project structure
- Missing file context or codebase awareness
- Agents behave like generic assistants

**Diagnosis**:

```bash
# Check context integration
npx bmad-method test-context --ide=kiro

# Verify Kiro workspace structure
npx bmad-method validate-workspace --ide=kiro
```

**Solutions**:
- Ensure you're in a Kiro workspace (`.kiro` directory present)
- Check Kiro context providers are enabled in IDE settings
- Try manually providing context with `#File` or `#Codebase`
- Restart Kiro IDE to refresh context providers

#### 7. Steering Rules Not Applied

**Problem**: Agents ignore project conventions and steering rules.

**Symptoms**:
- Agents don't follow project-specific guidelines
- Missing domain-specific knowledge
- Generic responses instead of contextual ones

**Solutions**:
- Verify steering rules exist in `.kiro/steering/`
- Check rule file format and YAML front matter
- Ensure rules are not conflicting (check resolution guidance)
- Test steering rules with manual agent activation

#### 8. Hooks Not Triggering

**Problem**: Automated workflows and hooks don't execute.

**Solutions**:
- Check hook configuration in `.kiro/hooks/`
- Verify hook triggers match your file patterns
- Test hooks manually through Kiro's Agent Hooks UI
- Check hook permissions and execution rights

### Expansion Pack Issues

#### 9. Expansion Pack Agents Missing

**Problem**: Expansion pack specific agents aren't available.

**Diagnosis**:

```bash
# Check expansion pack installation
npx bmad-method list-expansions --ide=kiro

# Validate expansion pack conversion
npx bmad-method validate --ide=kiro --expansion=<pack-id>
```

**Solutions**:

```bash
# Reinstall expansion pack
npx bmad-method install --ide=kiro --expansion=<pack-id> --force

# Convert expansion pack agents specifically
npx bmad-method convert-expansion --ide=kiro --pack=<pack-id>
```

#### 10. Domain-Specific Features Not Working

**Problem**: Expansion pack domain features aren't functioning.

**Solutions**:
- Check expansion pack steering rules in `.kiro/steering/`
- Verify domain-specific hooks are generated
- Ensure expansion pack templates are converted to specs

### Performance and System Issues

#### 11. Slow Agent Activation

**Problem**: Agents take too long to activate or respond slowly.

**Diagnosis**:

```bash
# Check performance metrics
npx bmad-method performance --ide=kiro

# Analyze activation times
npx bmad-method diagnose --ide=kiro --performance
```

**Solutions**:
- Clear agent cache and logs
- Reduce number of active agents
- Check system resources and Kiro IDE performance
- Use incremental agent loading

#### 12. MCP Tools Unavailable

**Problem**: Agents can't access external tools through MCP.

**Solutions**:
- Check MCP configuration in `.kiro/settings/mcp.json`
- Install required MCP servers: `uv` and `uvx`
- Verify MCP server status in Kiro's MCP Server view
- Test MCP tools independently

### Diagnostic Tools and Commands

#### Comprehensive Diagnostics

```bash
# Run full diagnostic suite
npx bmad-method diagnose --ide=kiro --comprehensive

# Generate diagnostic report
npx bmad-method diagnose --ide=kiro --export=diagnostic-report.json

# Check specific component
npx bmad-method diagnose --ide=kiro --component=agent-conversion
```

#### Validation Commands

```bash
# Validate complete installation
npx bmad-method validate --ide=kiro --comprehensive

# Check specific aspects
npx bmad-method validate --ide=kiro --agents
npx bmad-method validate --ide=kiro --dependencies
npx bmad-method validate --ide=kiro --integration
```

#### Monitoring and Logs

```bash
# View conversion logs
cat .kiro/logs/conversion-*.log

# Check activation monitoring
cat .kiro/logs/activation-*.log

# View diagnostic reports
ls .kiro/reports/diagnostic-*.json
```

### Getting Help

1. **Run Diagnostics First**:

   ```bash
   npx bmad-method diagnose --ide=kiro --export=my-diagnostic.json
   ```

2. **Check System Status**:

   ```bash
   npx bmad-method status --ide=kiro
   ```

3. **Community Support**:
   - GitHub Issues: Report bugs with diagnostic output
   - Include diagnostic report when reporting issues
   - Check existing issues for similar problems

4. **Emergency Recovery**:

   ```bash
   # Complete reinstall preserving customizations
   npx bmad-method install --ide=kiro --force-upgrade --preserve-custom
   
   # Reset to clean state (removes customizations)
   npx bmad-method reset --ide=kiro --clean
   ```

## Practical Usage Examples

### Example 1: Full-Stack Web Application Development

**Scenario**: Building a task management web application

#### Phase 1: Product Planning

```
Agent: BMad Product Manager
Request: Create a comprehensive PRD for a task management application with the following features:
- User authentication and authorization
- Task creation, editing, and deletion
- Project organization and team collaboration
- Real-time notifications
- Mobile-responsive design

Context: #Codebase (empty project)
```

**Output**: Creates `.kiro/specs/task-management-app/requirements.md` with detailed EARS requirements

#### Phase 2: Technical Architecture

```
Agent: BMad Architect  
Context: #Folder .kiro/specs/task-management-app
Request: Design a scalable technical architecture for this task management system using:
- React frontend with TypeScript
- Node.js/Express backend
- PostgreSQL database
- Redis for caching
- WebSocket for real-time features
```

**Output**: Updates `.kiro/specs/task-management-app/design.md` with comprehensive architecture

#### Phase 3: Development Planning

```
Agent: BMad Scrum Master
Context: #Folder .kiro/specs/task-management-app  
Request: Break down the architecture into a prioritized backlog of development tasks, focusing on MVP first
```

**Output**: Creates detailed task breakdown in `.kiro/specs/task-management-app/tasks.md`

#### Phase 4: Implementation

**Backend Development:**
```
Agent: BMad Developer
Context: #Folder .kiro/specs/task-management-app
Task: Implement user authentication system with JWT tokens
Files: #File src/auth/auth.service.js
```

**Frontend Development:**
```
Agent: BMad Developer  
Context: #File src/components/TaskList.tsx, #Folder .kiro/specs/task-management-app
Task: Create responsive task list component with drag-and-drop functionality
```

**Quality Assurance:**
```
Agent: BMad QA
Context: #File src/auth/auth.service.js, #Problems (current test failures)
Request: Review the authentication implementation and create comprehensive test suite
```

### Example 2: Game Development with Expansion Pack

**Prerequisites**: 
```bash
npx bmad-method install --ide=kiro --expansion=bmad-2d-phaser-game-dev
```

#### Game Design Phase

```
Agent: Game Designer
Request: Create a game design document for a 2D side-scrolling platformer with:
- Player character with multiple abilities
- Enemy AI and combat system  
- Collectible items and power-ups
- Multiple levels with increasing difficulty
- Boss battles and story progression
```

**Output**: Creates comprehensive game design spec

#### Technical Implementation

```
Agent: Game Architect
Context: #Folder .kiro/specs/platformer-game
Request: Design the technical architecture using Phaser.js 3.x with:
- Modular scene management
- Entity component system for game objects
- State management for game progression
- Asset loading and optimization strategy
```

#### Game Development

```
Agent: Game Developer
Context: #File src/entities/Player.js, #Folder .kiro/specs/platformer-game
Task: Implement player movement system with physics-based jumping and collision detection
```

### Example 3: Infrastructure and DevOps

**Prerequisites**:
```bash
npx bmad-method install --ide=kiro --expansion=bmad-infrastructure-devops
```

#### Infrastructure Planning

```
Agent: BMad Architect
Request: Design cloud infrastructure for a high-availability web application with:
- Auto-scaling application servers
- Load balancing and CDN
- Database clustering and backups
- Monitoring and logging
- CI/CD pipeline integration
```

#### DevOps Implementation

```
Agent: Infrastructure Platform Engineer
Context: #Folder .kiro/specs/cloud-infrastructure
Task: Create Terraform configurations for AWS deployment with:
- ECS Fargate for containerized applications
- RDS PostgreSQL with read replicas
- ElastiCache Redis cluster
- CloudWatch monitoring and alerts
```

### Example 4: Code Review and Quality Assurance

#### Automated Code Review

```
Agent: BMad QA
Context: #File src/services/userService.js, #Git Diff (recent changes)
Request: Review the recent changes to the user service for:
- Code quality and best practices
- Security vulnerabilities
- Performance implications
- Test coverage gaps
```

#### Architecture Review

```
Agent: BMad Architect
Context: #Folder src/architecture, #Problems (performance issues)
Request: Review the current system architecture and identify bottlenecks causing the reported performance issues
```

### Example 5: Research and Analysis

#### Market Research

```
Agent: BMad Analyst
Request: Research the current state of task management applications, analyzing:
- Top 5 competitors and their key features
- Market trends and user preferences
- Technology stack choices and their trade-offs
- Pricing models and monetization strategies
```

#### Technical Research

```
Agent: BMad Analyst
Context: #Folder .kiro/specs/task-management-app
Request: Research and recommend the best real-time communication solutions for our task management app, comparing:
- WebSockets vs Server-Sent Events
- Third-party services (Pusher, Ably) vs self-hosted
- Performance and scalability considerations
- Implementation complexity and costs
```

## Best Practices

### 1. Agent Selection and Usage

- **Use Specific Agents**: Choose the most appropriate agent for each task
- **Combine Agents**: Use multiple agents in sequence for complex workflows
- **Context Handoff**: Pass context between agents using specs and file references

### 2. Spec Organization

- Use descriptive spec names that match feature scope
- Keep requirements focused and testable
- Break large features into multiple specs
- Maintain clear traceability from requirements to tasks

### 3. Task Granularity

- Make tasks small enough to complete in one session
- Include clear acceptance criteria and success metrics
- Reference specific requirements for traceability
- Use incremental development approaches

### 4. Context Management

- Let Kiro provide context automatically when possible
- Use specific context providers (`#File` vs `#Codebase`) based on need
- Provide additional context in chat when automatic context is insufficient
- Reference related specs and documentation explicitly

### 5. Steering Rules Optimization

- Keep rules specific and actionable
- Avoid conflicting rules across different files
- Update rules as project evolves and patterns emerge
- Use domain-specific steering for expansion packs

### 6. Hook Usage and Automation

- Start with manual hooks before automating workflows
- Test hooks thoroughly before relying on automation
- Provide fallback manual processes for critical workflows
- Use hooks for repetitive tasks and quality gates

### 7. Quality Assurance Integration

- Use BMad QA agent for regular code reviews
- Implement automated quality checks through hooks
- Maintain consistent coding standards across the project
- Regular architecture reviews for large projects

### 8. Expansion Pack Integration

- Install relevant expansion packs for your domain
- Use domain-specific agents for specialized tasks
- Leverage expansion pack templates and workflows
- Maintain consistency between core and expansion pack patterns

## Next Steps

1. **Explore Expansion Packs**: Try domain-specific BMad extensions
2. **Customize Agents**: Modify agent prompts for your specific needs
3. **Create Custom Hooks**: Build automation for your unique workflows
4. **Share Templates**: Contribute project templates back to the community

For more advanced usage, see the [Developer Documentation](kiro-integration-developer-guide.md).