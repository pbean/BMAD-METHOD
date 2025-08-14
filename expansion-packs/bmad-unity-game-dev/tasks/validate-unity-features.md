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

### 14. Unity Profiler API Automation Validation ⚡ PRIORITY 3

**[[LLM: This is the newly integrated Unity Profiler API automation framework for Priority 3 implementation. Enable automated performance validation, threshold enforcement, and CI/CD integration.]]**

- **Profiler Integration Setup**: Verify UnityProfilerIntegrationManager is properly initialized
- **Performance Threshold Configuration**: Validate platform-specific thresholds are correctly configured
- **Automated Performance Testing**: Ensure Unity Test Framework integration is functional
- **Memory Leak Detection**: Verify MemoryLeakDetector automation is operational
- **Performance Regression Detection**: Validate baseline comparison and historical tracking
- **CI/CD Pipeline Integration**: Ensure performance reporting works in automated environments
- **Platform-Specific Validation**: Verify thresholds work across Mobile/Desktop/Console/VR platforms

#### 14.1 Profiler Automation Framework Validation

```csharp
// Validate Unity Profiler Integration Manager initialization
using BMAD.Unity.ProfilerAutomation;

[Test]
public void ValidateProfilerAutomationInitialization()
{
    // Verify profiler recorders are active
    var metrics = UnityProfilerIntegrationManager.CapturePerformanceMetrics(30);
    Assert.IsTrue(metrics.averageFrameTime > 0, "Frame time recording not active");
    Assert.IsTrue(metrics.totalMemoryUsed > 0, "Memory recording not active");

    Debug.Log($"[BMAD Profiler Validation] Frame time: {metrics.averageFrameTime:F2}ms, Memory: {metrics.totalMemoryUsed / (1024 * 1024)}MB");
}

[Test]
public void ValidatePerformanceThresholds()
{
    var metrics = UnityProfilerIntegrationManager.CapturePerformanceMetrics(60);
    bool thresholdsValid = UnityProfilerIntegrationManager.ValidatePerformanceThresholds(metrics);

    if (!thresholdsValid)
    {
        Debug.LogWarning($"Performance thresholds exceeded: {string.Join(", ", metrics.thresholdViolations)}");
    }

    Assert.IsTrue(metrics.thresholdViolations != null, "Threshold validation system not working");
}
```

#### 14.2 Automated Performance Testing Integration

```csharp
[UnityTest]
public IEnumerator ValidateAutomatedPerformanceTesting()
{
    // Start automated performance test
    yield return UnityProfilerIntegrationManager.AutomatedPerformanceTest();

    // Verify performance data was captured
    var metrics = UnityProfilerIntegrationManager.CapturePerformanceMetrics(30);
    Assert.IsTrue(metrics.measurementTime != default(DateTime), "Performance measurement timestamp missing");
    Assert.IsFalse(string.IsNullOrEmpty(metrics.sceneName), "Scene name not captured");
    Assert.IsFalse(string.IsNullOrEmpty(metrics.platformTarget), "Platform target not identified");
}

[Test]
public void ValidateMemoryLeakDetection()
{
    // Take baseline memory snapshot
    UnityProfilerIntegrationManager.MemoryLeakDetector.TakeMemorySnapshot("baseline");

    // Simulate potential memory allocation
    var tempObjects = new GameObject[100];
    for (int i = 0; i < tempObjects.Length; i++)
    {
        tempObjects[i] = new GameObject($"TempObject_{i}");
    }

    // Take post-allocation snapshot
    UnityProfilerIntegrationManager.MemoryLeakDetector.TakeMemorySnapshot("post_allocation");

    // Cleanup
    for (int i = 0; i < tempObjects.Length; i++)
    {
        DestroyImmediate(tempObjects[i]);
    }

    // Take post-cleanup snapshot
    UnityProfilerIntegrationManager.MemoryLeakDetector.TakeMemorySnapshot("post_cleanup");

    // Validate memory leak detection works
    bool memoryLeakDetected = !UnityProfilerIntegrationManager.MemoryLeakDetector.DetectMemoryLeak("baseline", "post_cleanup", 5f);
    Assert.IsFalse(memoryLeakDetected, "Memory leak detector should not report leak after cleanup");
}
```

#### 14.3 Performance Regression Detection Validation

```csharp
[Test]
public void ValidatePerformanceRegressionDetection()
{
    // Capture current performance metrics
    var currentMetrics = UnityProfilerIntegrationManager.CapturePerformanceMetrics(60);

    // Save as baseline (simulating first run)
    UnityProfilerIntegrationManager.SavePerformanceBaseline(currentMetrics, "test_commit_hash");

    // Simulate performance regression by creating slightly worse metrics
    var regressedMetrics = currentMetrics;
    regressedMetrics.averageFrameTime *= 1.15f; // 15% worse frame time
    regressedMetrics.totalMemoryUsed = (long)(regressedMetrics.totalMemoryUsed * 1.12f); // 12% more memory

    // Detect regressions
    var regressions = UnityProfilerIntegrationManager.DetectPerformanceRegressions(regressedMetrics, 0.10f);

    Assert.IsTrue(regressions.Count > 0, "Regression detection should identify performance degradation");
    Debug.Log($"[BMAD Profiler Validation] Detected {regressions.Count} regressions: {string.Join("; ", regressions)}");
}
```

#### 14.4 CI/CD Integration Validation

```csharp
[Test]
public void ValidateCICDReportGeneration()
{
    var metrics = UnityProfilerIntegrationManager.CapturePerformanceMetrics(30);

    // Test JSON report generation
    string jsonReport = UnityProfilerIntegrationManager.GeneratePerformanceReport(metrics, "json");
    Assert.IsFalse(string.IsNullOrEmpty(jsonReport), "JSON performance report generation failed");

    // Test XML report generation
    string xmlReport = UnityProfilerIntegrationManager.GeneratePerformanceReport(metrics, "xml");
    Assert.IsFalse(string.IsNullOrEmpty(xmlReport), "XML performance report generation failed");
    Assert.IsTrue(xmlReport.Contains("<PerformanceReport>"), "XML report format invalid");

    // Test Markdown report generation
    string markdownReport = UnityProfilerIntegrationManager.GeneratePerformanceReport(metrics, "markdown");
    Assert.IsFalse(string.IsNullOrEmpty(markdownReport), "Markdown performance report generation failed");
    Assert.IsTrue(markdownReport.Contains("# Performance Report"), "Markdown report format invalid");

    Debug.Log("[BMAD Profiler Validation] All CI/CD report formats validated successfully");
}
```

#### 14.5 Platform-Specific Threshold Validation

```csharp
[Test]
public void ValidatePlatformSpecificThresholds()
{
    var metrics = UnityProfilerIntegrationManager.CapturePerformanceMetrics(30);

    // Test platform threshold configurations
    string[] platforms = { "Mobile_Android", "Mobile_iOS", "Desktop_Windows", "Console_PlayStation", "VR_OculusQuest" };

    foreach (string platform in platforms)
    {
        var platformMetrics = metrics;
        platformMetrics.platformTarget = platform;

        // This should not throw an exception and should provide platform-appropriate validation
        bool thresholdsValid = UnityProfilerIntegrationManager.ValidatePerformanceThresholds(platformMetrics);

        Assert.IsNotNull(platformMetrics.thresholdViolations, $"Threshold validation not working for platform: {platform}");
        Debug.Log($"[BMAD Profiler Validation] Platform {platform} threshold validation: {(thresholdsValid ? "PASSED" : "FAILED")}");
    }
}
```

### 15. Unity Profiler Performance Validation Report Enhancement

**[[LLM: Enhance the validation report with automated performance analysis and recommendations.]]**

#### Automated Performance Analysis Results

- **Performance Threshold Compliance**: Automated validation of platform-specific performance thresholds
- **Memory Usage Analysis**: Automated detection of memory leaks and excessive allocation patterns
- **Rendering Performance**: Automated draw call and SetPass call optimization analysis
- **Performance Regression Status**: Historical performance comparison with baseline detection
- **Platform Optimization Readiness**: Platform-specific performance validation results

#### Critical Unity Profiler Automation Issues (Must Fix - Deployment Blocked)

- Non-functional Unity Profiler API integration or missing ProfilerRecorder initialization
- Platform-specific performance thresholds not configured or inaccessible
- Unity Test Framework integration failing to capture performance metrics
- Memory leak detection system not operational or providing false negatives
- Performance regression detection unable to establish or compare baselines
- CI/CD pipeline integration failing to generate or export performance reports

#### Unity Profiler Should-Fix Issues (Important Performance Improvements)

- Performance thresholds too lenient or strict for target platform requirements
- Memory leak detection sensitivity not calibrated for project-specific usage patterns
- Performance regression detection threshold not aligned with acceptable degradation limits
- CI/CD reporting format not compatible with existing dashboard or monitoring systems
- Platform-specific optimizations not configured for all target deployment platforms

#### Unity Profiler Nice-to-Have Improvements (Enhanced Monitoring)

- Additional performance metrics integration (GPU memory, audio processing, network usage)
- Enhanced historical trending analysis with long-term performance pattern recognition
- Integration with external performance monitoring services or dashboard systems
- Advanced performance optimization recommendations based on automated analysis
- Real-time performance monitoring during development with automated alert systems

#### Final Unity Performance Automation Assessment

- **GO**: Unity Profiler automation framework is operational and ready for production deployment
- **NO-GO**: Unity Profiler automation requires fixes before deployment to prevent performance validation failures
- **Performance Automation Readiness Score**: 1-10 scale based on automation framework completeness and reliability
- **CI/CD Integration Confidence Level**: High/Medium/Low for successful automated performance validation
- **Production Deployment Readiness**: Assessment of enterprise-grade performance monitoring preparedness
- **Performance Regression Prevention Capability**: Assessment of automated performance protection system effectiveness

#### Recommended Unity Profiler Automation Next Steps

Based on automated performance validation results, provide specific recommendations for:

- Unity Profiler API configuration refinements and optimization for project-specific requirements
- Performance threshold calibration based on target platform capabilities and project performance goals
- Memory leak detection system tuning for project-specific allocation patterns and acceptable thresholds
- Performance regression detection baseline establishment and historical data collection strategy
- CI/CD pipeline integration optimization for seamless automated performance validation workflows
- Platform-specific performance monitoring enhancement and multi-platform deployment validation strategies
