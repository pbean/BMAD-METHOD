# Process Architecture Platform Phase Task

## Objective

Process the platform phase of the game architecture using the platform sub-template to define platform-specific configurations, UI architecture, and performance optimizations.

## Prerequisites

- Foundation and Systems architecture phases must be completed
- Target platforms must be clearly defined from foundation phase
- Game systems architecture must be documented and approved
- Performance requirements should be understood

## Instructions

### Step 1: Context Preparation

1. **Review Previous Phase Outputs**

   - Review `docs/game-architecture-foundation.md` for platform decisions
   - Review `docs/game-architecture-systems.md` for system requirements
   - Confirm target platforms and performance requirements
   - Understand technology constraints from previous phases

2. **Analyze Platform Requirements**

   - Review platform-specific technical requirements
   - Understand performance targets for each platform
   - Identify platform-specific features and limitations
   - Consider cross-platform compatibility needs

3. **Prepare Platform Architecture Template**
   - Use template: `{root}/templates/game-architecture-platform-tmpl.yaml`
   - This template focuses on platform configurations and optimizations
   - Expected output: `docs/game-architecture-platform.md`

### Step 2: Platform Phase Processing

1. **Process Template Sections Sequentially**

   - Work through each section of the platform template
   - Reference foundation and systems architecture throughout
   - Focus on platform-specific Unity configurations
   - Address cross-platform compatibility requirements

2. **Key Platform Decisions to Document**
   - UI architecture and framework selection
   - Rendering pipeline configuration for target platforms
   - Performance optimization strategies
   - Platform-specific integrations and services
   - Cross-platform compatibility approaches

### Step 3: UI Architecture Design

1. **UI Framework Selection**

   - Choose between Unity UI (uGUI), UI Toolkit, or hybrid approach
   - Consider platform-specific UI requirements
   - Plan responsive design for different screen sizes
   - Design UI navigation and state management patterns

2. **UI Component Architecture**
   - Define base UI components and composite systems
   - Plan UI data binding and update patterns
   - Design modal and popup handling systems
   - Consider accessibility and localization requirements

### Step 4: Rendering and Performance Configuration

1. **Render Pipeline Optimization**

   - Configure render pipeline for target platforms
   - Define quality settings and LOD systems
   - Plan shader and material optimization strategies
   - Design lighting and post-processing setups

2. **Performance Target Definition**
   - Set specific performance targets for each platform
   - Define performance budgets (CPU, GPU, memory)
   - Plan performance monitoring and profiling strategies
   - Design optimization techniques for each platform

### Step 5: Platform Services Integration

1. **Platform-Specific Services**

   - Plan integration with platform stores and services
   - Design authentication and user account systems
   - Consider platform-specific features (haptics, notifications)
   - Plan analytics and telemetry integration

2. **Cross-Platform Abstraction**
   - Design abstraction layers for platform differences
   - Plan for consistent experience across platforms
   - Address input method differences
   - Handle platform-specific technical limitations

### Step 6: Audio and VFX Configuration

1. **Audio Architecture**

   - Configure Unity Audio system for platforms
   - Plan audio asset organization and compression
   - Design audio mixing for different hardware capabilities
   - Consider platform audio limitations and requirements

2. **VFX and Particle Systems**
   - Choose VFX framework based on platform capabilities
   - Define particle effect performance budgets
   - Plan scalable VFX for different quality settings
   - Design VFX asset organization and reusability

### Step 7: Quality Validation

1. **Platform Architecture Review**

   - Verify platform configurations support all target platforms
   - Confirm performance targets are achievable
   - Validate cross-platform compatibility approach
   - Ensure platform architecture integrates with systems design

2. **Performance Validation**
   - Review performance targets against platform capabilities
   - Confirm optimization strategies are feasible
   - Validate that UI scales appropriately across platforms
   - Check that audio and VFX budgets are realistic

## Deliverables

- Complete `docs/game-architecture-platform.md` document
- Platform summary for use in advanced phase
- Performance targets and optimization strategies
- Platform integration and service configuration plans
- Cross-platform compatibility validation approach

## Success Criteria

- All platform template sections are completed with appropriate detail
- Platform configurations support all target platforms effectively
- Performance targets are realistic and measurable
- UI architecture scales appropriately across platforms
- Platform integrations are well-designed and feasible
- Cross-platform compatibility approach is comprehensive

## Next Steps

After successful completion of this platform phase:

1. Proceed to advanced architecture phase using `process-architecture-advanced.md`
2. Use platform architecture to inform advanced feature integration
3. Ensure advanced features align with platform capabilities

## Notes

- This is Phase 3 of 4 in the multi-phase architecture process
- Platform decisions must align with foundation and systems architecture
- Focus on Unity platform-specific optimizations and configurations
- Consider the full range of target platform capabilities and limitations
- Plan for ongoing platform compatibility as new platforms are added
