# Validate Unity Features Task

## Purpose

To comprehensively validate Unity feature implementation and integration within game development projects, ensuring proper Unity API usage, package dependencies, component architecture, and cross-platform compatibility. This specialized validation prevents Unity-specific hallucinations, validates technical implementation readiness, and ensures feature specifications align with Unity's capabilities and project requirements.

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Load Core Configuration and Inputs

- Load `{root}/config.yaml` from the expansion pack directory
- If the file does not exist, HALT and inform the user: "config.yaml not found in expansion pack. This file is required for Unity feature validation."
- Extract key configurations: `gameDimension`, `unityEditorLocation`, `gamearchitecture.*`, `devStoryLocation`
- Identify and load the following inputs:
  - **Feature specification**: The Unity feature implementation to validate (provided by user or discovered in project docs)
  - **Unity project structure**: Project settings, package manifest, and asset organization
  - **Architecture documents**: Based on configuration (sharded or monolithic)
  - **Unity version**: From ProjectVersion.txt and package dependencies

### 1. Determine Project Dimension and Unity Context

- Load the Game Design Document (`{{gdd.gddFile}}` from `config.yaml`) or fallback to project analysis
- Extract `gameDimension` from config.yaml or search for **Dimension:** field in GDD
- Set variable `projectDimension` to "2D" or "3D" based on configuration
- If dimension cannot be determined, HALT and inform user: "Project dimension (2D or 3D) not found. Please update config.yaml with 'gameDimension' field."
- Load Unity version from `ProjectSettings/ProjectVersion.txt`
- Validate Unity LTS compatibility and feature support matrix

### 2. Unity Feature Specification Completeness Validation

- **Unity API accuracy verification**: Validate all Unity API references against official documentation
- **Feature scope definition**: Ensure feature boundaries and integration points are clearly defined
- **Component dependency mapping**: Verify all required Unity components and their relationships
- **Package requirements**: Validate all required Unity packages and their minimum versions
- **Platform compatibility**: Verify feature support across target platforms
- **Performance implications**: Assess performance impact and optimization requirements
- **Memory usage**: Validate memory allocation patterns and garbage collection considerations

### 3. Unity Project Structure and Integration Validation

- **Unity file organization**: Verify feature assets follow project structure conventions
- **Namespace compliance**: Ensure C# scripts follow project namespace patterns
- **Assembly definition alignment**: Validate feature fits within assembly organization
- **Scene integration**: Verify feature integrates properly with existing scene structure
- **Prefab architecture**: Validate prefab design follows component composition patterns
- **Asset referencing**: Ensure proper asset reference management and serialization
- **Resource management**: Validate resource loading and unloading patterns

### 4. Unity Component Architecture Validation

- **MonoBehaviour lifecycle**: Verify proper Unity lifecycle method usage (Awake, Start, Update, etc.)
- **Component communication**: Validate inter-component communication patterns and dependencies
- **Event system integration**: Verify UnityEvent, C# event, or message system usage
- **Serialization compliance**: Validate [SerializeField], public field, and ScriptableObject usage
- **Performance patterns**: Ensure optimal update patterns and component organization
- **Interface implementation**: Validate proper interface usage and dependency injection
- **Component pooling**: Verify object pooling patterns for performance-critical features

### 5. Unity API and Package Dependency Validation

- **Unity API version compatibility**: Verify all API calls are available in target Unity version
- **Package version constraints**: Validate package dependencies and version conflicts
- **Deprecated API usage**: Check for deprecated Unity APIs and suggest modern alternatives
- **Platform-specific APIs**: Verify platform-specific Unity API usage and availability
- **Package integration**: Validate proper package usage patterns and configurations
- **Third-party compatibility**: Assess third-party package integration and conflicts
- **Forward compatibility**: Evaluate compatibility with future Unity versions

### 6. Platform and Performance Validation

- **Cross-platform compatibility**: Verify feature works across target platforms (mobile, desktop, console)
- **Performance benchmarking**: Validate performance targets are realistic and measurable
- **Memory constraints**: Verify feature fits within platform memory budgets
- **Input system integration**: Validate input handling across different input methods
- **Rendering pipeline compatibility**: Ensure compatibility with URP/HDRP/Built-in pipeline
- **Audio system integration**: Validate audio features and platform-specific audio requirements
- **Build size impact**: Assess feature impact on final build size

### 7. Unity Test Framework Integration Validation

- **Test coverage requirements**: Verify testable components and test strategy
- **EditMode test compatibility**: Validate features can be tested in EditMode tests
- **PlayMode test integration**: Ensure features support PlayMode testing scenarios
- **Performance testing**: Validate performance testing approaches and benchmarks
- **Platform testing**: Verify testing strategies for different target platforms
- **Automated testing**: Ensure features support CI/CD and automated testing workflows
- **Test isolation**: Validate test independence and setup/teardown requirements

### 8. Unity Editor Integration and Workflow Validation

- **Editor script integration**: Validate custom editor tools and inspector customizations
- **Asset pipeline compatibility**: Ensure features work with Unity's asset import pipeline
- **Editor performance**: Verify editor performance impact during development
- **Build process integration**: Validate features don't break build process or settings
- **Version control**: Ensure features are version control friendly (proper .meta files, etc.)
- **Team collaboration**: Validate features support multi-developer workflows
- **Editor extension requirements**: Verify any required editor extensions or tools

### 9. Unity Security and Distribution Validation

- **Code obfuscation compatibility**: Verify features work with code protection measures
- **Platform store compliance**: Ensure features meet platform store requirements
- **Content security**: Validate secure handling of game content and assets
- **Anti-cheat compatibility**: Verify features don't interfere with anti-cheat systems
- **Player data handling**: Validate proper player data storage and privacy compliance
- **Network security**: Ensure networked features implement proper security measures
- **Asset protection**: Verify asset protection and intellectual property security

### 10. Unity Feature Implementation Sequence Validation

- **Development workflow order**: Verify feature implementation follows proper Unity development sequence
- **Asset creation dependencies**: Validate asset creation and import order
- **Component implementation order**: Ensure script and component dependencies are properly sequenced
- **Testing integration timing**: Verify test creation aligns with development milestones
- **Performance optimization timing**: Validate when performance optimization should occur
- **Platform integration sequence**: Ensure platform-specific features are implemented in correct order

### 11. Unity Anti-Hallucination Verification

- **Unity API existence verification**: Every Unity API reference must be verified against current Unity documentation
- **Package availability confirmation**: All Unity package references must specify valid, available versions
- **Platform capability verification**: All platform-specific features must be verified as available on target platforms
- **Performance claims validation**: All performance targets must be realistic based on platform capabilities
- **Unity version compatibility**: All feature specifications must be compatible with specified Unity version
- **Third-party integration accuracy**: All third-party Unity asset/package integrations must be verified

### 12. Unity Feature Implementation Readiness Assessment

- **Technical specification completeness**: Can the feature be implemented without external Unity documentation?
- **Asset requirements clarity**: Are all required assets, import settings, and configurations clearly specified?
- **Component architecture clarity**: Are all Unity component relationships and dependencies explicitly defined?
- **Performance testing readiness**: Are Unity Profiler usage and performance validation approaches clearly specified?
- **Platform deployment readiness**: Are platform-specific build and deployment requirements clearly defined?
- **Team integration readiness**: Are multi-developer workflow and collaboration requirements specified?

### 13. Generate Unity Feature Validation Report

Provide a structured validation report including:

#### Unity Feature Specification Compliance Issues

- Missing Unity-specific technical implementation details
- Unclear component architecture or dependency relationships
- Incomplete asset requirements or import specifications
- Missing platform-specific implementation considerations

#### Critical Unity Issues (Must Fix - Implementation Blocked)

- Inaccurate or unverifiable Unity API references
- Missing essential Unity package dependencies or version specifications
- Incomplete Unity component architecture or lifecycle implementation
- Missing required Unity Test Framework integration specifications
- Performance requirements that exceed platform capabilities

#### Unity-Specific Should-Fix Issues (Important Quality Improvements)

- Suboptimal Unity component organization or performance patterns
- Missing platform-specific optimization considerations
- Incomplete Unity Editor integration or workflow specifications
- Missing Unity asset pipeline optimization requirements
- Insufficient Unity security or distribution considerations

#### Unity Development Nice-to-Have Improvements (Optional Enhancements)

- Additional Unity performance optimization guidance
- Enhanced Unity Editor tool integration opportunities
- Improved Unity asset organization and management patterns
- Additional Unity platform compatibility considerations
- Enhanced Unity debugging and profiling integration

#### Unity Anti-Hallucination Findings

- Unverifiable Unity API claims or outdated Unity references
- Missing Unity package version specifications or invalid versions
- Inconsistencies with Unity project architecture requirements
- Invented Unity components, packages, or development patterns
- Unrealistic performance claims or platform capability assumptions

#### Unity Feature Platform and Performance Assessment

- **Cross-Platform Compatibility**: Input methods, rendering pipelines, and platform-specific features
- **Performance Impact Assessment**: Frame rate, memory usage, and build size implications
- **Unity Version Compatibility**: Compatibility with specified Unity version and future updates
- **Asset Pipeline Integration**: Import settings, asset optimization, and build process impact

#### Final Unity Feature Implementation Assessment

- **GO**: Feature specification is ready for Unity implementation with complete technical context
- **NO-GO**: Feature requires Unity-specific fixes before implementation can begin
- **Unity Implementation Readiness Score**: 1-10 scale based on Unity technical completeness
- **Feature Development Confidence Level**: High/Medium/Low for successful Unity implementation
- **Platform Deployment Readiness**: Assessment of multi-platform deployment preparedness
- **Performance Optimization Readiness**: Assessment of Unity performance testing and optimization preparedness

#### Recommended Next Steps

Based on validation results, provide specific recommendations for:

- Unity technical specification improvements needed
- Required Unity package installations or upgrades
- Unity component architecture refinements required
- Performance testing and Unity Profiler setup recommendations
- Platform-specific Unity development environment setup needs
- Unity Test Framework implementation and integration requirements
