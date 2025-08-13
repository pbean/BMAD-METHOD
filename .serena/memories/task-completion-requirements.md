# Task Completion Requirements for BMAD-METHOD

## Mandatory Steps Before Committing

1. **Format Code**: `npm run format` - Formats all markdown files with Prettier
2. **Validate Configuration**: `npm run validate` - Ensures all YAML is valid
3. **Build Verification**: `npm run build` - Verifies all agents/teams build successfully
4. **Git Safety**: Ensure working in git repo and create safety commit before major changes

## Code Modification Protocol (CRITICAL)

**NO DIRECT CODE EDITS**: All code changes must follow this workflow:

1. **Proposal Generation**: Create diffs/patches in reports
2. **Review Stage**: Critic agent reviews proposed changes
3. **Approval/Rejection**: Critic approves or rejects with specific feedback
4. **Execution**: Only after approval, Executor agent applies changes

## Sub-Agent Output Requirements

- **All sub-agents MUST write reports to `reports/` directory**
- **Report filename format**: `reports/[agent-type]-[task-description]-[timestamp].md`
- **JSON output required** with fields: report_path, summary, next_agent, next_task, confidence
- **Use standardized report template** from `.claude/template/report.md`

## Quality Assurance Checklist

- [ ] All changes formatted with Prettier
- [ ] YAML validation passes
- [ ] Build process completes successfully
- [ ] Agent reports written to correct directory
- [ ] Critic review completed for code changes
- [ ] Git commit created as safety checkpoint
- [ ] Documentation updated if applicable

## Agent Workflow Requirements

- Sub-agents operate with isolated context
- Use MCP Memory Server for shared context (NOT direct inheritance)
- Follow `.claude/workflows/` for structured task chains
- Always conclude complex workflows with Synthesis Agent
- Document patterns in Serena MCP server
- Update MCP Memory Server with insights before returning

## Testing & Validation

- Run applicable tests before completion
- Verify expansion packs if modified
- Test bundle generation for web UI consumption
- Validate template processing and placeholder substitution
