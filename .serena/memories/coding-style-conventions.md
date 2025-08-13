# BMAD-METHOD Coding Style & Conventions

## File Structure Conventions

- **Agents**: `bmad-core/agents/*.md` - Markdown files with YAML front-matter
- **Templates**: Self-contained with `{{placeholders}}` and `[[LLM: instructions]]`
- **Configuration**: YAML files for all configuration
- **Sub-Agents**: `.claude/agents/*.md` with strict front-matter structure
- **Workflows**: `.claude/workflows/*.yaml` with phase-based execution

## Naming Conventions

- **Files**: kebab-case (e.g., `bmad-orchestrator.md`, `create-doc.md`)
- **Agent IDs**: lowercase with hyphens (e.g., `agent-design-critic`)
- **Directories**: kebab-case throughout
- **Variables**: camelCase in JavaScript, kebab-case in YAML

## Agent Definition Standards

### Required YAML Front-matter:

```yaml
name: agent-name
description: "Detailed description with trigger phrases MUST BE USED and Use PROACTIVELY"
color: ColorName # For visual tracking
model: sonnet | opus | haiku
tools: tool1, tool2, tool3
```

### Agent Content Structure:

1. Expert persona with years of experience and accomplishments
2. Deep-scope principles with "When Invoked" section
3. Specialized skills with thinking level rubrics
4. Tasks with thinking level rubrics
5. "Tasks other agents can perform next" table
6. Operating protocol with JSON output requirement

## Development Standards

- **Formatting**: Prettier for all markdown (enforced by lint-staged)
- **Version Control**: Semantic versioning, conventional commits
- **Dependencies**: Declare all dependencies in agent YAML
- **Testing**: Jest framework when applicable
- **Documentation**: Self-documenting code with embedded instructions

## Template Processing

- Use `{{variable_name}}` for dynamic content substitution
- Use `[[LLM: specific instructions]]` for AI-only processing directives
- Templates must be self-contained with all necessary context

## Quality Gates

- All markdown must pass Prettier formatting
- YAML must validate via `npm run validate`
- Agent definitions require critic review before finalization
- Build process must complete without errors (`npm run build`)
