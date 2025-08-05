# Orchestrate Architecture Phases Task

## Objective

Coordinate the complete multi-phase game architecture process using the orchestrator template to ensure all phases are processed sequentially and integrated into a comprehensive architecture document.

## Prerequisites

- Game Design Document (GDD) must be available and reviewed
- Project scope and requirements must be clearly defined
- All phase coordination tasks must be available
- Stakeholder availability for approvals should be confirmed

## Instructions

### Step 1: Architecture Process Preparation

1. **Initialize Architecture Process**

   - Use template: `{root}/templates/game-architecture-orchestrator-tmpl.yaml`
   - Expected final output: `docs/game-architecture-complete.md`
   - Prepare to process all four architecture phases sequentially

2. **Context Validation**
   - Confirm Game Design Document (GDD) is accessible
   - Verify technical preferences and constraints are documented
   - Ensure target platforms and scope are clearly defined
   - Validate stakeholder availability for phase approvals

### Step 2: Phase 1 - Foundation Architecture

1. **Execute Foundation Phase**

   - Process using task: `{root}/tasks/process-architecture-foundation.md`
   - Generate complete foundation architecture document
   - Document all key technology choices and architectural patterns
   - Obtain stakeholder approval for foundation decisions

2. **Foundation Phase Validation**
   - Verify foundation architecture is complete and approved
   - Document foundation summary in orchestrator template
   - Confirm technology choices are definitive for subsequent phases
   - Prepare foundation context for systems phase

### Step 3: Phase 2 - Systems Architecture

1. **Execute Systems Phase**

   - Process using task: `{root}/tasks/process-architecture-systems.md`
   - Reference foundation architecture decisions throughout
   - Generate complete systems architecture document
   - Ensure systems support all GDD gameplay mechanics

2. **Systems Phase Validation**
   - Verify systems architecture integrates with foundation decisions
   - Document systems summary in orchestrator template
   - Confirm component and data model designs are complete
   - Prepare systems context for platform phase

### Step 4: Phase 3 - Platform Architecture

1. **Execute Platform Phase**

   - Process using task: `{root}/tasks/process-architecture-platform.md`
   - Reference foundation and systems architecture throughout
   - Generate complete platform architecture document
   - Address all target platform requirements and optimizations

2. **Platform Phase Validation**
   - Verify platform architecture supports all target platforms
   - Document platform summary in orchestrator template
   - Confirm performance targets and optimization strategies
   - Prepare platform context for advanced phase

### Step 5: Phase 4 - Advanced Architecture

1. **Execute Advanced Phase**

   - Process using task: `{root}/tasks/process-architecture-advanced.md`
   - Reference all previous architectural phases
   - Generate complete advanced architecture document
   - Address production operations and long-term considerations

2. **Advanced Phase Validation**
   - Verify advanced architecture integrates with all previous phases
   - Document advanced summary in orchestrator template
   - Confirm production readiness and scalability considerations
   - Prepare for complete architecture synthesis

### Step 6: Architecture Integration and Synthesis

1. **Complete Architecture Overview**

   - Synthesize all four phases into coherent architecture
   - Validate architectural consistency across all phases
   - Confirm complete architecture addresses all project requirements
   - Document architectural coherence and phase integration

2. **Requirements Validation**
   - Verify complete architecture supports all GDD requirements
   - Confirm technical constraints are properly addressed
   - Validate that success metrics can be measured
   - Ensure architecture provides clear implementation guidance

### Step 7: Implementation Strategy Definition

1. **Implementation Planning**

   - Define implementation sequence and dependencies
   - Identify critical path items and potential risks
   - Plan milestone deliverables and validation checkpoints
   - Design iterative refinement and evolution processes

2. **Risk Mitigation Strategy**
   - Identify technical, integration, and timeline risks
   - Plan mitigation strategies for each identified risk
   - Design fallback approaches for critical components
   - Plan quality gates and validation checkpoints

### Step 8: Architecture Governance

1. **Governance Framework**

   - Define architecture review and update processes
   - Establish roles and responsibilities for architecture decisions
   - Plan architecture documentation maintenance procedures
   - Create change management processes for architectural updates

2. **Long-term Architecture Management**
   - Plan periodic architecture reviews and updates
   - Design processes for evaluating new technology adoption
   - Plan for team scaling and organizational changes
   - Create knowledge transfer and documentation strategies

### Step 9: Document Consolidation

1. **Consolidate Architecture Documents**

   - Execute task: `{root}/tasks/consolidate-architecture-documents.md`
   - Combine all phase documents into single comprehensive document
   - Generate `docs/game-architecture-complete.md` with all phase content
   - Ensure document is ready for markdowntree-parser processing

2. **Validate Consolidated Document**
   - Verify all phase content is properly integrated
   - Confirm cross-references between phases work correctly
   - Test document structure is compatible with sharding tools
   - Ensure document provides comprehensive architecture reference

### Step 10: Final Validation and Approval

1. **Complete Architecture Review**

   - Conduct comprehensive review of consolidated architecture document
   - Validate integration and consistency across all phases
   - Confirm alignment with project goals and constraints
   - Review implementation feasibility and resource requirements

2. **Stakeholder Approval Process**
   - Present consolidated architecture document to all stakeholders
   - Address any concerns or requested modifications
   - Obtain formal approval for complete architecture
   - Document approved architecture as definitive reference

## Deliverables

- Complete `docs/game-architecture-complete.md` document containing all phases
- Individual phase documents (foundation, systems, platform, advanced)
- Implementation strategy and risk mitigation plans
- Architecture governance framework and processes
- Final stakeholder approval and sign-off documentation

## Success Criteria

- All four architecture phases are completed and integrated
- Complete architecture is coherent and consistent across phases
- Architecture comprehensively addresses all GDD requirements
- Implementation strategy provides clear guidance for development teams
- Architecture governance supports long-term maintenance and evolution
- All stakeholders have approved the complete architecture

## Quality Gates

1. **Foundation Phase**: Technology choices approved, project structure defined
2. **Systems Phase**: Game systems support all GDD mechanics, integration validated
3. **Platform Phase**: All target platforms supported, performance targets defined
4. **Advanced Phase**: Production readiness confirmed, scalability addressed
5. **Complete Architecture**: Integration validated, stakeholder approval obtained

## Next Steps

After successful completion of the orchestrated architecture process:

1. Begin implementation following the defined phase sequence
2. Establish architecture governance and regular review processes
3. Monitor implementation progress against architectural guidelines
4. Plan architecture evolution and update cycles

## Notes

- This orchestration process ensures comprehensive architecture coverage
- Each phase builds upon and references previous architectural decisions
- Quality gates prevent progression with incomplete or inconsistent architecture
- The multi-phase approach prevents AI context window overflow while maintaining completeness
- Final integration ensures architectural coherence across all phases
