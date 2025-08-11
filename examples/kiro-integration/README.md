# BMad Method Kiro Integration Examples

This directory contains example projects, templates, and expansion packs demonstrating BMad Method integration with Kiro IDE.

## Directory Structure

```
examples/kiro-integration/
├── sample-projects/           # Complete example projects
│   ├── task-management-app/   # Full-stack web application
│   ├── api-service/          # REST API service
│   └── mobile-app/           # React Native mobile app
├── templates/                # Project templates
│   ├── web-app-template/     # Web application starter
│   ├── api-template/         # API service starter
│   └── fullstack-template/   # Full-stack starter
├── expansion-packs/          # Example expansion packs
│   ├── ecommerce-pack/       # E-commerce development
│   └── data-science-pack/    # Data science workflows
└── workflows/                # Example workflow configurations
    ├── agile-sprint/         # Sprint-based development
    └── continuous-delivery/  # CD pipeline integration
```

## Getting Started

1. **Choose an example project:**
   ```bash
   cd examples/kiro-integration/sample-projects/task-management-app
   ```

2. **Initialize Kiro workspace:**
   ```bash
   kiro init
   ```

3. **Install BMad Method:**
   ```bash
   npx bmad-method install --ide=kiro
   ```

4. **Follow the project README for specific setup instructions**

## Example Projects

### Task Management App
A complete full-stack application demonstrating:
- BMad planning workflow → Kiro specs
- Automated development with hooks
- Context-aware agent collaboration
- MCP tool integration for external APIs

### API Service
A REST API service showcasing:
- Architecture-driven development
- Test-driven development with BMad QA agent
- Automated documentation generation
- Database integration patterns

### Mobile App
A React Native application featuring:
- Cross-platform development workflow
- UI/UX collaboration with BMad agents
- Device testing automation
- App store deployment pipeline

## Templates

Each template provides a starting point for new projects with:
- Pre-configured Kiro workspace
- BMad agents installed and configured
- Sample steering rules for the project type
- Automated workflow hooks
- Example specs and tasks

## Expansion Packs

Example expansion packs demonstrate how to:
- Create domain-specific BMad agents
- Integrate with Kiro's advanced features
- Provide specialized templates and workflows
- Handle domain-specific MCP tool requirements

## Contributing Examples

To contribute new examples:

1. Follow the established directory structure
2. Include comprehensive README files
3. Provide working Kiro workspace configurations
4. Add automated tests where applicable
5. Document any special requirements or setup steps