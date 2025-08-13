# BMAD-METHOD Project Overview

## Project Purpose
BMad-Method is a Universal AI Agent Framework implementing "Agentic Agile Driven Development". It transforms any domain with specialized AI expertise: software development, creative writing, business strategy, and more.

### Key Innovations:
1. **Agentic Planning**: Dedicated agents (Analyst, PM, Architect) collaborate to create detailed PRDs and Architecture documents
2. **Context-Engineered Development**: Scrum Master transforms plans into hyper-detailed development stories with full context

## Technology Stack
- **Runtime**: Node.js v20+
- **Language**: JavaScript with YAML configuration
- **Package Manager**: npm
- **Dependencies**: 
  - fs-extra, glob, commander for CLI tools
  - js-yaml for configuration parsing
  - chalk, ora for UI/UX
  - husky, lint-staged, prettier for development workflow
- **Testing**: Jest framework
- **Release**: semantic-release with changelog generation

## Architecture
- **Core Directory**: `bmad-core/` contains agents, teams, workflows, templates, tasks, checklists, data
- **Distribution**: `dist/` contains bundled agents for web UI consumption
- **Build System**: `tools/builders/web-builder.js` resolves dependencies and creates bundles
- **Expansion Packs**: Domain-specific extensions in `expansion-packs/`
- **Templates**: Self-contained with embedded LLM instructions using `{{placeholders}}` and `[[LLM: instructions]]`

## Agent System
- **Core Agents**: analyst, architect, dev, pm, qa, sm, ux-expert, bmad-orchestrator
- **Sub-Agents**: 23+ specialized agents in `.claude/agents/` for various technical tasks
- **Workflow System**: YAML-defined workflows in `.claude/workflows/` with sequential and parallel execution