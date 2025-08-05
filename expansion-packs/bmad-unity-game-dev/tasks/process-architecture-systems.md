# Process Architecture Systems Phase Task

## Objective

Process the systems phase of the game architecture using the systems sub-template to define game data models, core components, and gameplay systems.

## Prerequisites

- Foundation architecture phase must be completed
- Foundation architectural decisions must be documented and approved
- Game Design Document (GDD) mechanics should be clearly understood
- Technology stack from foundation phase must be referenced

## Instructions

### Step 1: Context Preparation

1. **Review Foundation Phase Outputs**

   - Review completed `docs/game-architecture-foundation.md`
   - Confirm technology choices and architectural patterns
   - Understand project structure and development conventions
   - Note any constraints established in the foundation phase

2. **Analyze Game Mechanics Requirements**

   - Review GDD for core gameplay mechanics
   - Identify key game entities and their relationships
   - Understand data flow and system interactions
   - Note performance and scalability requirements

3. **Prepare Systems Architecture Template**
   - Use template: `{root}/templates/game-architecture-systems-tmpl.yaml`
   - This template focuses on data models, components, and gameplay systems
   - Expected output: `docs/game-architecture-systems.md`

### Step 2: Systems Phase Processing

1. **Process Template Sections Sequentially**

   - Work through each section of the systems template
   - Reference foundation architecture decisions throughout
   - Pay attention to Unity-specific patterns (ScriptableObjects, MonoBehaviours)
   - Focus on gameplay systems that support GDD mechanics

2. **Key Systems Decisions to Document**
   - Core game data models using ScriptableObjects
   - Component architecture and communication patterns
   - Gameplay systems and their interactions
   - State management and persistence strategies
   - Input handling and physics configuration

### Step 3: Systems Integration Design

1. **Component Communication Architecture**

   - Design how components discover and reference each other
   - Plan event-driven communication vs direct references
   - Consider Unity Events vs C# Events usage patterns
   - Design for loose coupling and testability

2. **System Coordination Patterns**
   - Define how gameplay systems interact and coordinate
   - Plan system initialization and update patterns
   - Design system lifecycle management
   - Consider performance implications of system interactions

### Step 4: Data Flow and State Management

1. **Game Data Models**

   - Define ScriptableObject-based data models
   - Plan data relationships and references
   - Consider data validation and serialization needs
   - Design for data-driven game configuration

2. **State Management Architecture**
   - Choose appropriate state machine patterns
   - Plan state persistence and save/load systems
   - Design state synchronization across scenes
   - Consider debugging and state visualization needs

### Step 5: Quality Validation

1. **Systems Architecture Review**

   - Verify all systems support GDD mechanics
   - Confirm systems integrate well with foundation architecture
   - Validate component architecture follows Unity best practices
   - Ensure systems are designed for maintainability and testing

2. **Technical Consistency Check**
   - Confirm systems use foundation technology choices
   - Verify naming conventions match foundation standards
   - Ensure architectural patterns are consistently applied
   - Check that systems support planned platforms

## Deliverables

- Complete `docs/game-architecture-systems.md` document
- Systems summary for use in subsequent phases
- Component and system interaction diagrams
- Data model definitions and relationships
- Context preparation for platform architecture phase

## Success Criteria

- All systems template sections are completed with appropriate detail
- Game data models comprehensively support GDD requirements
- Component architecture follows Unity best practices
- System interactions are well-defined and maintainable
- Systems architecture integrates cleanly with foundation architecture
- Performance and scalability considerations are addressed

## Next Steps

After successful completion of this systems phase:

1. Proceed to platform architecture phase using `process-architecture-platform.md`
2. Use systems architecture to inform platform-specific optimizations
3. Ensure platform implementations align with systems design

## Notes

- This is Phase 2 of 4 in the multi-phase architecture process
- Systems design must align with foundation architectural decisions
- Focus on Unity-specific patterns and best practices
- Consider performance implications early in systems design
- Plan for testing and debugging of systems architecture
