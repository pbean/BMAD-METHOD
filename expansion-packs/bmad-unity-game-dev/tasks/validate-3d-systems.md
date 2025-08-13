# Validate 3D Systems Task

## Purpose

To comprehensively validate Unity 3D-specific system implementations including 3D physics, mesh rendering, animation, lighting systems, spatial audio, and platform-specific optimizations. This specialized validation ensures 3D game systems follow Unity best practices, prevent 3D-specific hallucinations, and validate performance characteristics unique to 3D game development workflows.

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Load Core Configuration and Validate 3D Context

- Load `{root}/config.yaml` from the expansion pack directory
- If the file does not exist, HALT and inform the user: "config.yaml not found in expansion pack. This file is required for 3D system validation."
- Extract key configurations: `gameDimension`, `unityEditorLocation`, `gamearchitecture.*`, `devStoryLocation`
- Verify project is configured for 3D development:
  - Check `gameDimension` is set to "3D" in config.yaml
  - Verify ProjectSettings contains 3D renderer pipeline configuration
  - If not 3D project, HALT and inform user: "This validation is for 3D projects only. Current project dimension is not 3D."
- Load Unity 3D rendering pipeline and package dependencies

### 1. Unity 3D Rendering Pipeline Validation

- **Render Pipeline selection verification**: Validate rendering pipeline choice and configuration:
  - Built-in Render Pipeline (Legacy) for simple 3D projects
  - Universal Render Pipeline (URP) for cross-platform optimization
  - High Definition Render Pipeline (HDRP) for high-end visuals
- **Pipeline asset configuration**: Verify Render Pipeline Asset settings and quality levels
- **Shader compatibility**: Validate shader usage matches selected render pipeline
- **Lighting model validation**: Verify appropriate lighting model for project requirements
- **Post-processing integration**: Validate post-processing stack configuration and performance
- **Quality settings optimization**: Verify quality levels for different target platforms

### 2. 3D Physics System Validation

- **Physics3D configuration**: Validate Physics settings in Project Settings
- **Rigidbody implementation**: Verify proper Rigidbody usage, constraints, and optimization:
  - Mass and drag calculations
  - Kinematic vs dynamic rigidbody selection
  - Continuous vs discrete collision detection
- **3D Collider types and setup**: Validate appropriate 3D collider selection:
  - BoxCollider for rectangular volumes
  - SphereCollider for spherical objects
  - CapsuleCollider for character controllers
  - MeshCollider for complex geometry (convex vs non-convex)
  - TerrainCollider for terrain systems
- **Physics Materials**: Verify friction, bounciness, and combine mode settings
- **Joints and constraints**: Validate 3D joint systems (Fixed, Hinge, Spring, Character)
- **Physics performance**: Validate physics solver iterations and fixed timestep settings

### 3. 3D Mesh and Geometry Validation

- **Mesh optimization**: Validate 3D model import settings and optimization:
  - Polygon count appropriate for target platforms
  - LOD (Level of Detail) system implementation
  - Mesh compression settings and quality
  - Normal and tangent generation settings
- **Material and shader integration**: Verify proper material assignment and shader usage
- **Texture mapping validation**: Verify UV mapping and texture coordinate setup
- **Mesh collider optimization**: Validate mesh collider generation and performance
- **Skinned mesh rendering**: Verify character animation mesh setup and bone limits
- **Terrain system integration**: Validate Unity Terrain system usage and optimization

### 4. 3D Animation System Validation

- **Animation system selection**: Validate 3D animation approach:
  - Humanoid vs Generic rig configuration
  - Mecanim Animator Controller setup
  - Animation Clips import and compression
  - Avatar mask configuration for layer animation
- **Skeletal animation optimization**: Verify bone hierarchy and animation performance:
  - Bone count limitations for target platforms
  - Animation compression settings
  - Animation culling and optimization
- **Blend trees and state machines**: Validate complex animation logic
- **IK (Inverse Kinematics)**: Verify IK implementation for procedural animation
- **Animation events**: Validate animation event timing and callback implementation
- **Root motion**: Verify root motion handling for character movement

### 5. 3D Lighting and Visual Systems Validation

- **Lighting setup**: Validate 3D lighting configuration:
  - Directional light for sun/moon simulation
  - Point lights for local illumination
  - Spot lights for focused lighting effects
  - Area lights for realistic lighting (HDRP/URP)
- **Shadow system optimization**: Verify shadow casting and receiving configuration:
  - Shadow distance and cascade settings
  - Shadow resolution and quality optimization
  - Real-time vs baked shadow considerations
- **Global Illumination**: Validate GI setup for realistic lighting:
  - Lightmapping configuration and UV2 generation
  - Light Probes for dynamic object lighting
  - Reflection Probes for environment reflections
  - Real-time GI vs baked lighting trade-offs
- **HDR and tone mapping**: Verify high dynamic range rendering setup
- **Skybox and environment**: Validate skybox configuration and environment lighting

### 6. 3D Camera and Navigation Validation

- **3D Camera controller**: Validate camera movement and control systems:
  - First-person vs third-person camera implementation
  - Camera collision and clipping prevention
  - Smooth camera transitions and interpolation
  - Field of view and projection settings
- **3D Navigation systems**: Verify 3D pathfinding and AI movement:
  - NavMesh generation and configuration
  - NavMesh Agent setup and obstacle avoidance
  - Off-mesh links for complex navigation
  - Dynamic NavMesh updates for changing environments
- **Cinemachine integration**: Validate virtual camera system usage
- **VR/AR camera setup**: Verify XR camera rig configuration if applicable

### 7. 3D Audio System Validation

- **3D Spatial audio**: Validate 3D audio positioning and attenuation:
  - AudioSource 3D spatial blend settings
  - 3D audio rolloff curves and distance attenuation
  - Doppler effect configuration for moving sources
  - Audio occlusion and obstruction handling
- **Audio Mixer 3D integration**: Verify 3D audio mixing and effects processing
- **Reverb zones**: Validate environmental audio reverb setup
- **Audio performance**: Verify efficient 3D audio processing and culling
- **Platform audio optimization**: Validate audio compression and streaming for 3D

### 8. 3D Platform-Specific Optimization Validation

- **Mobile 3D performance**: Validate 3D rendering performance on mobile devices:
  - Polygon count budgets and LOD systems
  - Texture resolution and compression for mobile GPUs
  - Shader complexity optimization for mobile
  - Battery life and thermal management considerations
- **Console optimization**: Verify console-specific 3D optimizations:
  - Platform-specific rendering features usage
  - Memory budget allocation for 3D assets
  - Loading time optimization for large 3D scenes
- **PC/VR optimization**: Validate high-end platform optimizations:
  - High-resolution texture streaming
  - Advanced lighting and post-processing effects
  - Multi-threading utilization for 3D systems

### 9. 3D Asset Pipeline and Import Validation

- **3D Model import settings**: Validate model import configuration:
  - Scale factor and unit conversion
  - Mesh compression and optimization settings
  - Animation import and compression
  - Material extraction and assignment
- **Texture streaming**: Verify texture streaming system for large 3D environments
- **Asset bundling**: Validate 3D asset organization and loading systems
- **Version control**: Ensure 3D assets are properly tracked with appropriate .meta files
- **3D asset workflow**: Validate DCC tool integration (Maya, Blender, 3ds Max)

### 10. 3D Performance Profiling and Optimization Validation

- **Rendering performance**: Validate 3D rendering optimization techniques:
  - Draw call batching and GPU instancing
  - Frustum culling and occlusion culling
  - LOD system effectiveness and transition quality
  - Texture and material optimization
- **Memory profiling**: Verify 3D asset memory usage and optimization:
  - Mesh memory allocation and compression
  - Texture memory streaming and management
  - Animation memory optimization
- **CPU profiling**: Validate 3D system CPU performance:
  - Physics simulation performance
  - Animation update performance
  - 3D audio processing efficiency

### 11. 3D Anti-Hallucination Verification

- **3D API accuracy**: Every Unity 3D API reference must be verified against Unity 3D documentation
- **Rendering pipeline accuracy**: Validate all rendering pipeline claims and feature availability
- **3D physics limitations**: Verify all physics system claims are accurate for Unity 3D physics
- **Performance claims validation**: Validate all 3D performance targets are realistic for platforms
- **Shader compatibility**: Verify shader usage is compatible with selected render pipeline
- **Platform 3D support**: Verify 3D-specific features are available on target platforms

### 12. 3D XR and Advanced Features Validation

- **VR/AR integration**: Validate XR system integration if applicable:
  - XR camera rig setup and tracking
  - Hand tracking and controller input
  - Spatial mapping and plane detection
  - Performance optimization for XR rendering
- **Advanced 3D features**: Verify advanced Unity 3D feature usage:
  - Compute shaders for GPU processing
  - Geometry shaders for procedural geometry
  - Tessellation for detailed surfaces
  - Advanced particle systems in 3D space

### 13. Generate 3D Systems Validation Report

Provide a structured validation report including:

#### 3D System Configuration Compliance Issues

- Incorrect 3D rendering pipeline selection or configuration
- Improper 3D physics setup or collision detection
- Missing essential 3D lighting or shadow configuration
- Incorrect 3D asset import settings or optimization

#### Critical 3D Issues (Must Fix - Implementation Blocked)

- Inaccurate Unity 3D API usage or deprecated rendering calls
- Performance-critical 3D rendering problems
- 3D physics configuration causing gameplay issues
- Mobile platform incompatibility with 3D complexity
- Missing essential 3D package dependencies

#### 3D-Specific Should-Fix Issues (Important Quality Improvements)

- Suboptimal 3D mesh optimization or LOD configuration
- Inefficient 3D lighting setup or shadow optimization
- Poor 3D audio spatial configuration
- Inadequate 3D navigation system setup
- Missing 3D performance profiling and optimization

#### 3D Development Nice-to-Have Improvements (Optional Enhancements)

- Enhanced 3D visual effects and post-processing
- Advanced 3D shader usage for visual quality
- Improved 3D asset pipeline and workflow optimization
- Additional 3D platform-specific optimizations
- Enhanced 3D debugging and profiling tools integration

#### 3D Anti-Hallucination Findings

- Unverifiable Unity 3D rendering claims or outdated pipeline references
- Incorrect 3D physics behavior assumptions
- Invalid 3D performance optimization techniques
- Unrealistic 3D visual quality targets for mobile platforms
- Invented 3D rendering features or shader techniques

#### 3D Platform and Performance Assessment

- **Mobile 3D Performance**: Frame rate, thermal management, and battery optimization analysis
- **3D Rendering Efficiency**: Draw calls, polygon count, and GPU utilization assessment
- **3D Physics Optimization**: Collision detection performance and simulation efficiency
- **Cross-Platform 3D Compatibility**: Platform-specific 3D feature availability and limitations

#### Final 3D Systems Implementation Assessment

- **GO**: 3D systems are properly configured and ready for implementation
- **NO-GO**: 3D systems require fixes before development can proceed
- **3D Implementation Readiness Score**: 1-10 scale based on 3D technical completeness
- **3D Performance Confidence Level**: High/Medium/Low for target platform performance
- **Mobile 3D Deployment Readiness**: Assessment of mobile platform 3D optimization
- **3D Visual Quality Readiness**: Assessment of rendering pipeline and visual system setup

#### Recommended Next Steps

Based on validation results, provide specific recommendations for:

- 3D rendering pipeline optimization and configuration improvements
- 3D mesh and texture optimization recommendations
- 3D lighting and shadow system optimization
- 3D physics system performance tuning
- Mobile-specific 3D optimization requirements
- 3D asset workflow and pipeline optimization suggestions
