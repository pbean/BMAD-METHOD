# Validate 2D Systems Task

## Purpose

To comprehensively validate Unity 2D-specific system implementations including 2D physics, sprite rendering, animation, tilemap systems, lighting, and platform-specific optimizations. This specialized validation ensures 2D game systems follow Unity best practices, prevent 2D-specific hallucinations, and validate performance characteristics unique to 2D game development workflows.

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Load Core Configuration and Validate 2D Context

- Load `{root}/config.yaml` from the expansion pack directory
- If the file does not exist, HALT and inform the user: "config.yaml not found in expansion pack. This file is required for 2D system validation."
- Extract key configurations: `gameDimension`, `unityEditorLocation`, `gamearchitecture.*`, `devStoryLocation`
- Verify project is configured for 2D development:
  - Check `gameDimension` is set to "2D" in config.yaml
  - Verify ProjectSettings/EditorBuildSettings.txt contains 2D renderer settings
  - If not 2D project, HALT and inform user: "This validation is for 2D projects only. Current project dimension is not 2D."
- Load Unity 2D package dependencies and versions

### 1. Unity 2D Package Dependencies Validation

- **2D Core packages verification**: Validate presence and versions of essential 2D packages:
  - `com.unity.2d.sprite` (minimum version based on Unity version)
  - `com.unity.2d.animation` (for skeletal animation systems)
  - `com.unity.2d.psdimporter` (for Photoshop workflow integration)
  - `com.unity.2d.tilemap` (for tile-based level design)
  - `com.unity.2d.tilemap.extras` (for advanced tilemap features)
- **2D Lighting packages**: Verify 2D lighting system packages if used:
  - `com.unity.render-pipelines.universal` (for URP 2D lighting)
  - `com.unity.2d.lights` (if using legacy 2D lighting)
- **2D Physics validation**: Ensure proper 2D physics configuration
- **Package compatibility matrix**: Verify all 2D packages are compatible with Unity version

### 2. 2D Rendering Pipeline and Visual Systems Validation

- **Sprite rendering optimization**: Validate sprite atlas configuration and batching
- **2D Renderer settings**: Verify 2D Renderer Data asset configuration for URP
- **Sprite sorting layers**: Validate sorting layer setup and depth management
- **2D Camera configuration**: Verify orthographic camera setup and projection settings
- **Pixel perfect rendering**: Validate Pixel Perfect Camera component if targeting pixel art
- **Sprite masking systems**: Verify SpriteMask and SpriteMask Interaction usage
- **2D lighting integration**: Validate 2D Light setup and normal map usage if applicable

### 3. 2D Physics System Validation

- **Physics2D configuration**: Validate Physics2D settings in Project Settings
- **Rigidbody2D implementation**: Verify proper Rigidbody2D usage and constraints
- **Collider2D types and setup**: Validate appropriate 2D collider selection and configuration:
  - BoxCollider2D for rectangular boundaries
  - CircleCollider2D for circular objects
  - PolygonCollider2D for complex shapes
  - EdgeCollider2D for lines and edges
  - CompositeCollider2D for compound shapes
- **Physics Materials 2D**: Verify friction, bounciness, and physics material settings
- **Trigger detection**: Validate OnTrigger2D event implementations
- **Collision detection**: Verify OnCollision2D event handling and physics callbacks
- **Performance optimization**: Validate physics simulation frequency and sleeping

### 4. 2D Animation System Validation

- **Sprite animation approaches**: Validate animation system selection:
  - Frame-based sprite animation vs skeletal animation
  - Unity Animator vs simple sprite swapping
  - 2D Animation package vs traditional approaches
- **Sprite Library integration**: Verify Sprite Library Asset setup for character variants
- **Bone-based animation**: Validate 2D skeletal rigging and IK chains if used
- **Animation Controller setup**: Verify 2D-specific animator state machines
- **Sprite swapping systems**: Validate runtime sprite replacement and customization
- **Animation performance**: Verify efficient animation update patterns and culling

### 5. 2D Tilemap System Validation

- **Tilemap structure**: Validate Tilemap and TilemapRenderer component setup
- **Grid configuration**: Verify Grid component cell size and layout settings
- **Tile asset creation**: Validate proper Tile asset creation and configuration
- **Rule Tiles integration**: Verify Rule Tile usage for automatic tile placement
- **Animated tiles**: Validate Animated Tile setup for dynamic tile content
- **Tilemap colliders**: Verify TilemapCollider2D and CompositeCollider2D usage
- **Performance optimization**: Validate tilemap chunk loading and culling

### 6. 2D Input and Control System Validation

- **2D movement patterns**: Validate 2D character controller implementations
- **Touch input handling**: Verify mobile-specific 2D input systems
- **Virtual joystick integration**: Validate on-screen control setup for mobile
- **2D camera follow systems**: Verify camera tracking and boundary constraints
- **Multi-touch support**: Validate gesture recognition for 2D interactions
- **Input responsiveness**: Verify input polling and update frequency for 2D gameplay

### 7. 2D Audio and Effects Integration Validation

- **2D audio positioning**: Validate AudioSource 2D spatial blend settings
- **Audio occlusion**: Verify 2D-appropriate audio obstruction handling
- **Particle systems for 2D**: Validate 2D-facing particle effect configurations
- **Visual effects integration**: Verify 2D-appropriate VFX Graph usage
- **UI audio integration**: Validate UI sound effect implementation patterns
- **Audio performance**: Verify efficient audio loading and management for 2D

### 8. 2D Platform-Specific Optimization Validation

- **Mobile performance**: Validate 2D rendering performance on mobile devices:
  - Texture compression settings for mobile GPUs
  - Draw call optimization through sprite atlasing
  - Overdraw reduction strategies
  - Memory usage optimization for texture streaming
- **Sprite atlas configuration**: Verify optimal atlas packing and format settings
- **Resolution scaling**: Validate 2D UI scaling for different screen resolutions
- **Battery optimization**: Verify frame rate management and power consumption
- **Build size optimization**: Validate texture compression and asset optimization

### 9. 2D Asset Pipeline and Import Validation

- **Sprite import settings**: Validate texture import settings for 2D sprites:
  - Sprite Mode selection (Single vs Multiple)
  - Pixels Per Unit configuration
  - Filter Mode settings (Point vs Bilinear)
  - Compression format selection per platform
- **Texture atlas generation**: Verify automatic sprite atlas creation and packing
- **2D asset workflow**: Validate PSD Importer workflow if using Photoshop
- **Asset organization**: Verify 2D asset folder structure and naming conventions
- **Version control**: Ensure 2D assets are properly tracked and .meta files included

### 10. 2D UI System Integration Validation

- **Canvas Scaler setup**: Validate UI scaling for 2D game UI elements
- **2D UI positioning**: Verify anchoring and positioning for responsive 2D UI
- **Sprite-based UI**: Validate custom 2D sprite usage in UI elements
- **Screen space overlay**: Verify proper UI layering over 2D game content
- **Mobile UI considerations**: Validate touch target sizes and accessibility
- **UI animation integration**: Verify UI animation compatibility with 2D systems

### 11. 2D Anti-Hallucination Verification

- **2D API accuracy**: Every Unity 2D API reference must be verified against Unity 2D documentation
- **2D package version verification**: All 2D package references must specify valid versions
- **2D physics limitations**: Verify all physics claims are accurate for 2D physics system
- **Sprite rendering claims**: Validate all sprite rendering and optimization claims
- **2D lighting accuracy**: Verify 2D lighting system capabilities and limitations
- **Platform 2D support**: Verify 2D-specific features are available on target platforms

### 12. 2D Performance and Memory Validation

- **Sprite batching verification**: Validate draw call reduction through proper sprite batching
- **Texture memory management**: Verify efficient texture loading and streaming
- **2D physics performance**: Validate Physics2D simulation performance and optimization
- **Animation performance**: Verify 2D animation system efficiency and culling
- **Mobile memory constraints**: Validate texture resolution and compression for mobile
- **Garbage collection**: Verify GC-friendly patterns in 2D systems

### 13. Generate 2D Systems Validation Report

Provide a structured validation report including:

#### 2D System Configuration Compliance Issues

- Missing essential 2D Unity packages or incorrect versions
- Improper 2D renderer configuration or pipeline setup
- Incorrect sprite import settings or atlas configuration
- Missing 2D physics setup or collision detection

#### Critical 2D Issues (Must Fix - Implementation Blocked)

- Inaccurate Unity 2D API usage or deprecated method calls
- Missing essential 2D package dependencies
- Incorrect 2D physics configuration causing gameplay issues
- Performance-critical sprite rendering problems
- Mobile platform incompatibility with 2D systems

#### 2D-Specific Should-Fix Issues (Important Quality Improvements)

- Suboptimal sprite atlas packing or texture compression
- Inefficient 2D animation patterns or update frequency
- Missing 2D lighting setup for visual quality
- Inadequate 2D audio spatial configuration
- Poor 2D UI scaling for multiple resolutions

#### 2D Development Nice-to-Have Improvements (Optional Enhancements)

- Enhanced 2D particle effects and visual polish
- Advanced 2D shader usage for visual effects
- Improved 2D asset organization and workflow optimization
- Additional 2D platform-specific optimizations
- Enhanced 2D debugging and profiling integration

#### 2D Anti-Hallucination Findings

- Unverifiable Unity 2D API claims or outdated references
- Incorrect 2D physics behavior assumptions
- Invalid 2D package feature claims
- Unrealistic 2D performance targets for mobile platforms
- Invented 2D rendering techniques or optimization methods

#### 2D Platform and Performance Assessment

- **Mobile 2D Performance**: Frame rate, memory usage, and battery consumption analysis
- **2D Rendering Efficiency**: Draw calls, texture usage, and batching effectiveness
- **2D Physics Optimization**: Collision detection performance and optimization opportunities
- **Cross-Platform 2D Compatibility**: Platform-specific 2D feature availability and limitations

#### Final 2D Systems Implementation Assessment

- **GO**: 2D systems are properly configured and ready for implementation
- **NO-GO**: 2D systems require fixes before development can proceed
- **2D Implementation Readiness Score**: 1-10 scale based on 2D technical completeness
- **2D Performance Confidence Level**: High/Medium/Low for target platform performance
- **Mobile 2D Deployment Readiness**: Assessment of mobile platform optimization
- **2D Visual Quality Readiness**: Assessment of rendering and visual system setup

#### Recommended Next Steps

Based on validation results, provide specific recommendations for:

- Required 2D Unity package installations or upgrades
- 2D renderer configuration and optimization improvements
- Sprite import settings and atlas optimization recommendations
- 2D physics system configuration and performance tuning
- Mobile-specific 2D optimization setup requirements
- 2D asset workflow and pipeline optimization suggestions
