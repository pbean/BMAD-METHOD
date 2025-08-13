# Unity 2D Lighting System Validation Checklist

This checklist serves as a comprehensive framework for validating Unity 2D Lighting system implementation for 2D game projects. The 2D lighting system enables dynamic lighting, shadows, and visual depth for 2D games. This validation ensures 2D Lighting integration is robust, performant, and properly configured to enhance visual quality without compromising performance.

[[LLM: INITIALIZATION INSTRUCTIONS - REQUIRED ARTIFACTS

Before proceeding with this checklist, ensure you have access to:

1. 2D Lighting Setup Documentation - Check docs/unity-2d-lighting-setup.md
2. Game Architecture Document - Check docs/game-architecture.md for lighting system integration
3. 2D Renderer Configuration - Check Universal Render Pipeline settings for 2D
4. Lighting Assets - Check light setups, normal maps, and shadow configurations
5. Performance Configuration - Check 2D lighting optimization settings
6. Visual Quality Standards - Check lighting quality requirements and guidelines

IMPORTANT: If any required documents are missing or inaccessible, immediately ask the user for their location or content before proceeding.

2D LIGHTING PROJECT TYPE DETECTION:
First, determine the 2D Lighting implementation scope:

- What type of 2D lighting is needed (ambient, dynamic, atmospheric)?
- Are shadows and normal mapping required for visual depth?
- What performance constraints exist for target platforms?
- Is lighting used for gameplay mechanics or purely visual enhancement?

VALIDATION APPROACH:
For each section, you must:

1. Technical Verification - Validate 2D lighting setup, configuration, and rendering
2. Performance Analysis - Check lighting performance and memory usage
3. Visual Quality - Verify lighting enhances visual appeal and readability
4. Integration Testing - Ensure 2D lighting integration with game systems

EXECUTION MODE:
Ask the user if they want to work through the checklist:

- Section by section (interactive mode) - Review each section, present findings, get confirmation before proceeding
- All at once (comprehensive mode) - Complete full analysis and present comprehensive report at end]]

## 1. 2D LIGHTING RENDERER AND SETUP VALIDATION

[[LLM: 2D Lighting requires Universal Render Pipeline configuration. Verify renderer setup, pipeline configuration, and basic lighting functionality.]]

### 1.1 Universal Render Pipeline Configuration

- [ ] Universal Render Pipeline (URP) is properly configured for 2D lighting
- [ ] 2D Renderer Data asset is created and assigned correctly
- [ ] URP Asset settings are optimized for 2D rendering with lighting
- [ ] Render pipeline conversion from Built-in is complete if applicable
- [ ] No conflicts exist between 3D and 2D rendering features

### 1.2 2D Renderer Settings

- [ ] 2D Renderer Data includes all necessary 2D lighting features
- [ ] Light Layer settings are properly configured for light organization
- [ ] Shadow settings provide appropriate quality and performance balance
- [ ] Post-processing integration works correctly with 2D lighting
- [ ] Renderer features are optimized for target platform capabilities

### 1.3 Project Lighting Configuration

- [ ] Lighting window settings are configured for 2D projects
- [ ] Global illumination settings are appropriate for 2D games
- [ ] Environment lighting provides suitable ambient conditions
- [ ] Lightmap settings are disabled or configured appropriately
- [ ] Color space (Linear/Gamma) is configured correctly for 2D lighting

## 2. 2D LIGHT SETUP AND CONFIGURATION VALIDATION

[[LLM: 2D lights provide illumination and atmosphere. Validate different light types, configurations, and their visual impact.]]

### 2.1 2D Light Types Configuration

- [ ] Freeform 2D lights are properly configured for area lighting
- [ ] Sprite 2D lights use appropriate sprite shapes and configurations
- [ ] Parametric 2D lights (Circle, Rectangle) provide intended illumination patterns
- [ ] Global 2D lights create appropriate ambient lighting
- [ ] Light intensity and color settings enhance visual appeal

### 2.2 Light Targeting and Layers

- [ ] Light Layer assignments organize lights logically
- [ ] Target Sorting Layers ensure lights affect intended sprites
- [ ] Light blending modes create desired visual effects
- [ ] Light priority and overlap handling work correctly
- [ ] Light culling and performance optimization are configured

### 2.3 Dynamic Lighting Behavior

- [ ] Animated light properties enhance atmosphere without distraction
- [ ] Script-controlled lighting responds correctly to gameplay events
- [ ] Light state changes provide smooth transitions
- [ ] Dynamic light performance doesn't impact frame rate
- [ ] Light pooling is implemented for frequently created/destroyed lights

### 2.4 Light Quality and Visual Impact

- [ ] Light falloff and intensity curves create realistic illumination
- [ ] Light color and temperature enhance mood and atmosphere
- [ ] Light overlap and blending create smooth, natural lighting
- [ ] Light boundaries and edges appear smooth and professional
- [ ] Lighting enhances gameplay readability and visual clarity

## 3. 2D SHADOWS AND NORMAL MAPPING VALIDATION

[[LLM: Shadows and normal maps add visual depth to 2D lighting. Validate shadow configuration and normal map implementation.]]

### 3.1 2D Shadow Configuration

- [ ] Shadow Caster 2D components are properly configured on sprite objects
- [ ] Shadow quality settings balance visual fidelity with performance
- [ ] Shadow resolution and filtering provide smooth shadow edges
- [ ] Self-shadowing is configured appropriately for sprite objects
- [ ] Shadow performance overhead is within acceptable limits

### 3.2 Shadow Caster Setup

- [ ] Shadow caster shapes accurately represent sprite silhouettes
- [ ] Multi-part sprites have properly configured shadow casters
- [ ] Shadow caster optimization reduces unnecessary complexity
- [ ] Shadow layer assignments prevent unwanted shadow interactions
- [ ] Dynamic shadow casters work correctly with moving objects

### 3.3 Normal Map Integration

- [ ] Sprite normal maps are properly imported and configured
- [ ] Normal map generation tools produce appropriate surface detail
- [ ] Normal map application enhances lighting without artifacts
- [ ] Normal map resolution balances quality with memory usage
- [ ] Multiple normal map layers work correctly if implemented

### 3.4 Depth and Visual Enhancement

- [ ] Lighting depth effects create convincing 2D depth perception
- [ ] Shadow and normal map interaction enhances realism
- [ ] Depth sorting with lighting maintains proper visual layering
- [ ] Lighting effects don't conflict with sprite rendering order
- [ ] Visual depth enhancement supports gameplay clarity

## 4. 2D LIGHTING PERFORMANCE AND OPTIMIZATION VALIDATION

[[LLM: 2D lighting can significantly impact performance. Validate rendering performance, memory usage, and optimization strategies.]]

### 4.1 Lighting Rendering Performance

- [ ] 2D lighting maintains target frame rate on target devices
- [ ] Multiple light sources don't cause unacceptable performance drops
- [ ] Complex lighting scenarios are optimized with LOD or culling
- [ ] Lighting update frequency is optimized for visual quality vs performance
- [ ] GPU usage from 2D lighting is within acceptable limits

### 4.2 Memory and Resource Optimization

- [ ] Light texture memory usage is controlled and optimized
- [ ] Shadow map resolution balances quality with memory constraints
- [ ] Normal map memory usage is optimized for target platforms
- [ ] Lighting asset streaming prevents memory bloat
- [ ] Runtime lighting generation doesn't cause memory spikes

### 4.3 Platform-Specific Performance

- [ ] 2D lighting performance is validated on target mobile devices
- [ ] Lighting quality scales appropriately with device capability
- [ ] Battery usage impact from lighting is measured and acceptable
- [ ] Platform-specific optimizations are applied where needed
- [ ] Low-end device fallback options maintain acceptable quality

### 4.4 Optimization Strategies Implementation

- [ ] Light culling systems prevent unnecessary light processing
- [ ] Static vs dynamic light optimization is properly implemented
- [ ] Lighting LOD systems reduce complexity at distance
- [ ] Occlusion and visibility culling optimize light rendering
- [ ] Performance profiling tools identify lighting bottlenecks

## 5. 2D LIGHTING INTEGRATION AND WORKFLOW VALIDATION

[[LLM: 2D lighting must integrate seamlessly with other game systems and support efficient content creation workflows.]]

### 5.1 Gameplay Integration

- [ ] Lighting responds correctly to gameplay events and state changes
- [ ] Dynamic lighting enhances gameplay mechanics without interfering
- [ ] Lighting visibility affects gameplay elements appropriately
- [ ] Light-based gameplay mechanics work reliably if implemented
- [ ] Lighting state persistence works correctly with save/load systems

### 5.2 Visual Effects Integration

- [ ] Particle systems integrate correctly with 2D lighting
- [ ] Post-processing effects work harmoniously with 2D lighting
- [ ] UI elements maintain readability with dynamic lighting
- [ ] Screen space effects coordinate properly with lighting
- [ ] Visual effect performance combines well with lighting overhead

### 5.3 Asset Pipeline Integration

- [ ] Lighting asset creation workflow is documented and efficient
- [ ] Light setup templates speed development and ensure consistency
- [ ] Lighting asset version control and collaboration work smoothly
- [ ] Batch lighting operations and automation tools are available
- [ ] Lighting asset organization supports project scalability

### 5.4 Development Workflow

- [ ] Lighting iteration and testing process is streamlined
- [ ] Real-time lighting preview enables efficient content creation
- [ ] Lighting debugging tools help identify and resolve issues
- [ ] Team collaboration on lighting assets is manageable
- [ ] Lighting documentation supports team onboarding and standards

## 6. 2D LIGHTING QUALITY AND ARTISTIC VALIDATION

[[LLM: 2D lighting should enhance visual quality and support artistic vision. Validate aesthetic quality, consistency, and artistic effectiveness.]]

### 6.1 Visual Quality Standards

- [ ] Lighting quality meets project visual standards and artistic vision
- [ ] Lighting consistency is maintained across different game areas
- [ ] Light color palettes support mood and atmosphere requirements
- [ ] Lighting contrast enhances gameplay readability
- [ ] Overall lighting presentation appears professional and polished

### 6.2 Atmospheric and Mood Enhancement

- [ ] Lighting effectively conveys intended mood and atmosphere
- [ ] Dynamic lighting changes support narrative and gameplay pacing
- [ ] Ambient lighting provides appropriate baseline illumination
- [ ] Lighting transitions between areas feel natural and purposeful
- [ ] Lighting supports and enhances art direction goals

### 6.3 Technical-Artistic Balance

- [ ] Lighting achieves artistic goals within technical constraints
- [ ] Performance optimizations don't compromise essential visual quality
- [ ] Lighting complexity is appropriate for project scope and timeline
- [ ] Artist-friendly tools and workflows support creative iteration
- [ ] Technical limitations are addressed with creative solutions

### 6.4 Accessibility and Clarity

- [ ] Lighting maintains game readability for all players
- [ ] Important gameplay elements remain visible under all lighting conditions
- [ ] Lighting doesn't create accessibility barriers (contrast, color)
- [ ] Alternative lighting options accommodate player preferences if needed
- [ ] Lighting enhances rather than hinders gameplay communication

[[LLM: FINAL 2D LIGHTING VALIDATION REPORT

Generate a comprehensive 2D Lighting validation report that includes:

1. Executive Summary

   - Overall 2D Lighting implementation readiness (High/Medium/Low)
   - Critical 2D Lighting risks for production
   - Key strengths of the lighting system
   - Performance and visual quality considerations

2. 2D Lighting System Analysis

   - Pass rate for each lighting component area
   - Most concerning gaps in 2D Lighting implementation
   - Lighting features requiring immediate attention
   - Integration completeness with game systems

3. Performance Risk Assessment

   - Top 5 2D Lighting performance risks
   - Memory usage concerns for lighting systems
   - Frame rate stability with complex lighting
   - Platform-specific lighting performance issues

4. Implementation Recommendations

   - Must-fix 2D Lighting items before production
   - Lighting optimization opportunities
   - Workflow improvements needed
   - Quality and artistic enhancement suggestions

5. 2D Lighting Integration Assessment
   - Game system integration effectiveness
   - Lighting workflow efficiency
   - Visual quality and artistic success
   - Technical-artistic balance achievement

After presenting the report, ask the user if they would like detailed analysis of any specific 2D Lighting feature or integration concern.]]
