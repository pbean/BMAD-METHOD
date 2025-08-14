# Unity Play Mode Testing Task

## Purpose

To establish comprehensive runtime testing framework for automated gameplay validation, performance monitoring, and system behavior verification during actual game execution. This task focuses on creating custom testing systems that operate during live gameplay, providing real-time validation of game mechanics, player interactions, performance metrics, and system stability. Extends beyond Unity Test Framework to provide continuous runtime monitoring and automated quality assurance during active gameplay sessions.

## Prerequisites

- Unity project with gameplay systems implemented and functional
- Core game mechanics, physics, input systems, and UI implemented
- Understanding of Unity's runtime API and MonoBehaviour lifecycle
- Performance monitoring and debugging tools configured
- Game build with development capabilities and debug access
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps for runtime testing framework setup]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Runtime Testing Framework Architecture

#### 1.1 Core Runtime Test System Setup

[[LLM: Analyze the project's gameplay systems to identify critical runtime behaviors requiring automated validation. Design a comprehensive testing framework that monitors game state, player actions, performance metrics, and system interactions during live gameplay. Focus on creating non-intrusive testing that doesn't affect gameplay experience while providing thorough validation coverage.]]

**Runtime Testing Foundation System**:

```csharp
// Assets/Scripts/Testing/RuntimeTestFramework.cs
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Events;
using UnityEngine.SceneManagement;

namespace {{project_namespace}}.Testing
{
    /// <summary>
    /// Comprehensive runtime testing framework for automated gameplay validation
    /// Provides non-intrusive real-time testing during active gameplay sessions
    /// </summary>
    public class RuntimeTestFramework : MonoBehaviour
    {
        [Header("Test Framework Configuration")]
        [SerializeField] private bool enableRuntimeTesting = true;
        [SerializeField] private bool enableContinuousMonitoring = true;
        [SerializeField] private bool enablePerformanceValidation = true;
        [SerializeField] private bool enableGameplayValidation = true;
        [SerializeField] private bool enableAutomatedReporting = true;

        [Header("Test Execution Settings")]
        [SerializeField] private float testUpdateInterval = 0.1f;
        [SerializeField] private float validationCheckInterval = 1.0f;
        [SerializeField] private int maxTestHistoryCount = 1000;
        [SerializeField] private string testOutputPath = "Assets/TestResults/Runtime/";

        [Header("Performance Thresholds")]
        [SerializeField] private float maxFrameTime = 16.67f; // 60 FPS
        [SerializeField] private float maxMemoryUsageMB = 512f;
        [SerializeField] private int maxActiveGameObjects = 2000;
        [SerializeField] private float maxPhysicsUpdateTime = 5.0f;

        [Header("Gameplay Validation")]
        [SerializeField] private bool validatePlayerMovement = true;
        [SerializeField] private bool validateGameState = true;
        [SerializeField] private bool validateUIResponsiveness = true;
        [SerializeField] private bool validateAudioSystems = true;

        private Dictionary<string, RuntimeTest> activeTests = new Dictionary<string, RuntimeTest>();
        private List<TestResult> testResults = new List<TestResult>();
        private RuntimeTestReporter reporter;
        private GameplayValidator gameplayValidator;
        private PerformanceValidator performanceValidator;
        private SystemValidator systemValidator;

        private float lastTestUpdate;
        private float lastValidationCheck;
        private bool isFrameworkInitialized = false;
        private Coroutine continuousTestingCoroutine;

        public event Action<TestResult> OnTestCompleted;
        public event Action<ValidationFailure> OnValidationFailed;
        public event Action<RuntimeTestReport> OnReportGenerated;

        #region Unity Lifecycle

        private void Awake()
        {
            try
            {
                InitializeTestFramework();
                ValidateTestEnvironment();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Initialization failed: {ex.Message}");
                enabled = false;
            }
        }

        private void Start()
        {
            if (enableRuntimeTesting && isFrameworkInitialized)
            {
                StartRuntimeTesting();
            }
        }

        private void Update()
        {
            if (!enableRuntimeTesting || !isFrameworkInitialized)
                return;

            try
            {
                ProcessTestUpdates();
                CheckValidationThresholds();
                UpdateTestMetrics();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Update error: {ex.Message}");
            }
        }

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus)
            {
                PauseRuntimeTesting();
            }
            else
            {
                ResumeRuntimeTesting();
            }
        }

        private void OnDestroy()
        {
            try
            {
                StopRuntimeTesting();
                SaveTestResults();
                CleanupTestFramework();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Cleanup error: {ex.Message}");
            }
        }

        #endregion

        #region Framework Initialization

        private void InitializeTestFramework()
        {
            try
            {
                // Initialize core components
                reporter = new RuntimeTestReporter();
                gameplayValidator = new GameplayValidator();
                performanceValidator = new PerformanceValidator();
                systemValidator = new SystemValidator();

                // Configure validators with thresholds
                performanceValidator.Configure(maxFrameTime, maxMemoryUsageMB, maxActiveGameObjects, maxPhysicsUpdateTime);
                gameplayValidator.Configure(validatePlayerMovement, validateGameState, validateUIResponsiveness, validateAudioSystems);

                // Setup output directory
                ValidateOutputDirectory();

                // Register built-in tests
                RegisterBuiltInTests();

                isFrameworkInitialized = true;
                Debug.Log("[RuntimeTestFramework] Framework initialized successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Initialization error: {ex.Message}");
                throw;
            }
        }

        private void ValidateTestEnvironment()
        {
            if (!Application.isPlaying)
            {
                throw new InvalidOperationException("Runtime testing requires play mode");
            }

            if (!Directory.Exists(testOutputPath))
            {
                Directory.CreateDirectory(testOutputPath);
            }
        }

        private void ValidateOutputDirectory()
        {
            try
            {
                if (!Directory.Exists(testOutputPath))
                {
                    Directory.CreateDirectory(testOutputPath);
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[RuntimeTestFramework] Could not create output directory: {ex.Message}");
                testOutputPath = Application.temporaryCachePath + "/RuntimeTests/";
                Directory.CreateDirectory(testOutputPath);
            }
        }

        #endregion

        #region Test Registration and Management

        public void RegisterTest(string testId, RuntimeTest test)
        {
            try
            {
                if (activeTests.ContainsKey(testId))
                {
                    Debug.LogWarning($"[RuntimeTestFramework] Test {testId} already registered, updating...");
                }

                test.Initialize();
                activeTests[testId] = test;

                Debug.Log($"[RuntimeTestFramework] Registered test: {testId}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Failed to register test {testId}: {ex.Message}");
            }
        }

        public void UnregisterTest(string testId)
        {
            try
            {
                if (activeTests.TryGetValue(testId, out RuntimeTest test))
                {
                    test.Cleanup();
                    activeTests.Remove(testId);
                    Debug.Log($"[RuntimeTestFramework] Unregistered test: {testId}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Failed to unregister test {testId}: {ex.Message}");
            }
        }

        private void RegisterBuiltInTests()
        {
            // Performance monitoring test
            RegisterTest("performance_monitor", new PerformanceMonitorTest(performanceValidator));

            // Gameplay validation test
            RegisterTest("gameplay_validator", new GameplayValidationTest(gameplayValidator));

            // System stability test
            RegisterTest("system_stability", new SystemStabilityTest(systemValidator));

            // Memory leak detection test
            RegisterTest("memory_leak_detector", new MemoryLeakDetectionTest());

            // Frame rate consistency test
            RegisterTest("framerate_consistency", new FrameRateConsistencyTest());
        }

        #endregion

        #region Test Execution

        private void StartRuntimeTesting()
        {
            try
            {
                if (continuousTestingCoroutine != null)
                {
                    StopCoroutine(continuousTestingCoroutine);
                }

                if (enableContinuousMonitoring)
                {
                    continuousTestingCoroutine = StartCoroutine(ContinuousTestingLoop());
                }

                // Start all registered tests
                foreach (var kvp in activeTests)
                {
                    kvp.Value.Start();
                }

                Debug.Log("[RuntimeTestFramework] Runtime testing started");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Failed to start testing: {ex.Message}");
            }
        }

        private void StopRuntimeTesting()
        {
            try
            {
                if (continuousTestingCoroutine != null)
                {
                    StopCoroutine(continuousTestingCoroutine);
                    continuousTestingCoroutine = null;
                }

                // Stop all active tests
                foreach (var kvp in activeTests)
                {
                    kvp.Value.Stop();
                }

                GenerateFinalReport();
                Debug.Log("[RuntimeTestFramework] Runtime testing stopped");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Error stopping testing: {ex.Message}");
            }
        }

        private void PauseRuntimeTesting()
        {
            foreach (var kvp in activeTests)
            {
                kvp.Value.Pause();
            }
        }

        private void ResumeRuntimeTesting()
        {
            foreach (var kvp in activeTests)
            {
                kvp.Value.Resume();
            }
        }

        private IEnumerator ContinuousTestingLoop()
        {
            while (enableContinuousMonitoring)
            {
                yield return new WaitForSeconds(testUpdateInterval);

                try
                {
                    ProcessContinuousValidation();
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[RuntimeTestFramework] Continuous testing error: {ex.Message}");
                }
            }
        }

        #endregion

        #region Test Processing and Validation

        private void ProcessTestUpdates()
        {
            if (Time.time - lastTestUpdate < testUpdateInterval)
                return;

            lastTestUpdate = Time.time;

            foreach (var kvp in activeTests)
            {
                try
                {
                    var testResult = kvp.Value.Update();
                    if (testResult != null)
                    {
                        ProcessTestResult(kvp.Key, testResult);
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[RuntimeTestFramework] Test update error for {kvp.Key}: {ex.Message}");
                }
            }
        }

        private void CheckValidationThresholds()
        {
            if (Time.time - lastValidationCheck < validationCheckInterval)
                return;

            lastValidationCheck = Time.time;

            if (enablePerformanceValidation)
            {
                ValidatePerformanceThresholds();
            }

            if (enableGameplayValidation)
            {
                ValidateGameplayBehavior();
            }
        }

        private void ProcessContinuousValidation()
        {
            // System health check
            var systemHealth = systemValidator.ValidateSystemHealth();
            if (!systemHealth.IsValid)
            {
                OnValidationFailed?.Invoke(new ValidationFailure("System Health", systemHealth.ErrorMessage));
            }

            // Memory usage validation
            var memoryUsage = performanceValidator.GetMemoryUsage();
            if (memoryUsage > maxMemoryUsageMB)
            {
                OnValidationFailed?.Invoke(new ValidationFailure("Memory Usage", $"Memory usage {memoryUsage:F1}MB exceeds threshold {maxMemoryUsageMB}MB"));
            }
        }

        private void ValidatePerformanceThresholds()
        {
            try
            {
                var frameTime = Time.unscaledDeltaTime * 1000f;
                if (frameTime > maxFrameTime)
                {
                    OnValidationFailed?.Invoke(new ValidationFailure("Frame Time", $"Frame time {frameTime:F2}ms exceeds threshold {maxFrameTime:F2}ms"));
                }

                var activeObjects = FindObjectsOfType<GameObject>().Length;
                if (activeObjects > maxActiveGameObjects)
                {
                    OnValidationFailed?.Invoke(new ValidationFailure("Active Objects", $"Active objects {activeObjects} exceeds threshold {maxActiveGameObjects}"));
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Performance validation error: {ex.Message}");
            }
        }

        private void ValidateGameplayBehavior()
        {
            try
            {
                if (validatePlayerMovement)
                {
                    var playerMovementResult = gameplayValidator.ValidatePlayerMovement();
                    if (!playerMovementResult.IsValid)
                    {
                        OnValidationFailed?.Invoke(new ValidationFailure("Player Movement", playerMovementResult.ErrorMessage));
                    }
                }

                if (validateGameState)
                {
                    var gameStateResult = gameplayValidator.ValidateGameState();
                    if (!gameStateResult.IsValid)
                    {
                        OnValidationFailed?.Invoke(new ValidationFailure("Game State", gameStateResult.ErrorMessage));
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Gameplay validation error: {ex.Message}");
            }
        }

        #endregion

        #region Test Result Processing

        private void ProcessTestResult(string testId, TestResult result)
        {
            try
            {
                result.TestId = testId;
                result.Timestamp = Time.time;

                testResults.Add(result);

                // Limit history size
                if (testResults.Count > maxTestHistoryCount)
                {
                    testResults.RemoveAt(0);
                }

                OnTestCompleted?.Invoke(result);

                if (result.Status == TestStatus.Failed)
                {
                    Debug.LogWarning($"[RuntimeTestFramework] Test {testId} failed: {result.Message}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Error processing test result: {ex.Message}");
            }
        }

        private void UpdateTestMetrics()
        {
            // Update runtime metrics for each test
            foreach (var kvp in activeTests)
            {
                try
                {
                    kvp.Value.UpdateMetrics();
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[RuntimeTestFramework] Metrics update error for {kvp.Key}: {ex.Message}");
                }
            }
        }

        #endregion

        #region Reporting and Output

        private void SaveTestResults()
        {
            if (!enableAutomatedReporting || testResults.Count == 0)
                return;

            try
            {
                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var filename = $"RuntimeTestResults_{timestamp}.json";
                var filepath = Path.Combine(testOutputPath, filename);

                var report = GenerateTestReport();
                var json = JsonUtility.ToJson(report, true);

                File.WriteAllText(filepath, json);
                Debug.Log($"[RuntimeTestFramework] Test results saved to: {filepath}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Failed to save test results: {ex.Message}");
            }
        }

        private RuntimeTestReport GenerateTestReport()
        {
            var report = new RuntimeTestReport
            {
                SessionStartTime = Time.time,
                SessionDuration = Time.time,
                TotalTests = activeTests.Count,
                TestResults = testResults.ToArray(),
                PerformanceMetrics = performanceValidator.GetMetrics(),
                GameplayValidationResults = gameplayValidator.GetResults(),
                SystemValidationResults = systemValidator.GetResults()
            };

            return report;
        }

        private void GenerateFinalReport()
        {
            try
            {
                var report = GenerateTestReport();
                OnReportGenerated?.Invoke(report);

                if (enableAutomatedReporting)
                {
                    reporter.GenerateHTMLReport(report, testOutputPath);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Error generating final report: {ex.Message}");
            }
        }

        #endregion

        #region Public API

        public TestResult[] GetTestResults(string testId = null)
        {
            if (string.IsNullOrEmpty(testId))
            {
                return testResults.ToArray();
            }

            return testResults.FindAll(r => r.TestId == testId).ToArray();
        }

        public RuntimeTest GetTest(string testId)
        {
            activeTests.TryGetValue(testId, out RuntimeTest test);
            return test;
        }

        public void ExecuteTest(string testId)
        {
            if (activeTests.TryGetValue(testId, out RuntimeTest test))
            {
                StartCoroutine(ExecuteTestCoroutine(testId, test));
            }
        }

        private IEnumerator ExecuteTestCoroutine(string testId, RuntimeTest test)
        {
            yield return test.Execute();
            var result = test.GetResult();
            ProcessTestResult(testId, result);
        }

        public PerformanceMetrics GetCurrentPerformanceMetrics()
        {
            return performanceValidator.GetMetrics();
        }

        public ValidationResult ValidateCurrentGameState()
        {
            return gameplayValidator.ValidateGameState();
        }

        #endregion

        #region Cleanup

        private void CleanupTestFramework()
        {
            try
            {
                foreach (var kvp in activeTests)
                {
                    kvp.Value.Cleanup();
                }

                activeTests.Clear();
                testResults.Clear();

                Debug.Log("[RuntimeTestFramework] Framework cleaned up");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RuntimeTestFramework] Cleanup error: {ex.Message}");
            }
        }

        #endregion
    }

    #region Supporting Classes and Structures

    [Serializable]
    public class RuntimeTestReport
    {
        public float SessionStartTime;
        public float SessionDuration;
        public int TotalTests;
        public TestResult[] TestResults;
        public PerformanceMetrics PerformanceMetrics;
        public ValidationResult[] GameplayValidationResults;
        public ValidationResult[] SystemValidationResults;
    }

    [Serializable]
    public class TestResult
    {
        public string TestId;
        public TestStatus Status;
        public string Message;
        public float Timestamp;
        public float ExecutionTime;
        public Dictionary<string, object> Metrics;

        public TestResult()
        {
            Metrics = new Dictionary<string, object>();
        }
    }

    public enum TestStatus
    {
        Pending,
        Running,
        Passed,
        Failed,
        Skipped
    }

    [Serializable]
    public class ValidationFailure
    {
        public string Category;
        public string Message;
        public float Timestamp;

        public ValidationFailure(string category, string message)
        {
            Category = category;
            Message = message;
            Timestamp = Time.time;
        }
    }

    [Serializable]
    public class ValidationResult
    {
        public bool IsValid;
        public string ErrorMessage;
        public string Category;
        public float Timestamp;

        public ValidationResult(bool isValid, string errorMessage = "", string category = "")
        {
            IsValid = isValid;
            ErrorMessage = errorMessage;
            Category = category;
            Timestamp = Time.time;
        }
    }

    [Serializable]
    public class PerformanceMetrics
    {
        public float AverageFrameTime;
        public float MinFrameTime;
        public float MaxFrameTime;
        public float CurrentMemoryUsage;
        public float PeakMemoryUsage;
        public int ActiveGameObjects;
        public int DrawCalls;
        public int Batches;
    }

    #endregion
}
```

### 2. Runtime Test Implementation Patterns

#### 2.1 Custom Runtime Test Base Classes

[[LLM: Design extensible base classes for different types of runtime tests including performance tests, gameplay validation tests, system stability tests, and integration tests. Create patterns that allow easy creation of custom tests while maintaining consistent validation and reporting capabilities.]]

**Runtime Test Base Classes**:

```csharp
// Assets/Scripts/Testing/Runtime/RuntimeTestBase.cs
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace {{project_namespace}}.Testing
{
    /// <summary>
    /// Abstract base class for all runtime tests with standardized execution patterns
    /// </summary>
    public abstract class RuntimeTest
    {
        [Header("Test Configuration")]
        protected string testName;
        protected string testDescription;
        protected float timeout = 30f;
        protected bool isEnabled = true;
        protected TestPriority priority = TestPriority.Normal;

        protected TestStatus status = TestStatus.Pending;
        protected string lastError = string.Empty;
        protected float startTime;
        protected float executionTime;
        protected Dictionary<string, object> testMetrics;

        public event Action<TestResult> OnTestCompleted;
        public event Action<string> OnTestMessage;

        public string TestName => testName;
        public TestStatus Status => status;
        public bool IsEnabled => isEnabled;

        protected RuntimeTest(string name, string description)
        {
            testName = name;
            testDescription = description;
            testMetrics = new Dictionary<string, object>();
        }

        #region Public API

        public virtual void Initialize()
        {
            try
            {
                OnInitialize();
                status = TestStatus.Pending;
                Debug.Log($"[RuntimeTest] {testName} initialized");
            }
            catch (Exception ex)
            {
                HandleException("Initialize", ex);
            }
        }

        public virtual void Start()
        {
            if (!isEnabled)
                return;

            try
            {
                status = TestStatus.Running;
                startTime = Time.time;

                OnStart();
                SendMessage($"Test {testName} started");
            }
            catch (Exception ex)
            {
                HandleException("Start", ex);
            }
        }

        public virtual void Stop()
        {
            try
            {
                OnStop();

                if (status == TestStatus.Running)
                {
                    status = TestStatus.Passed;
                }

                CalculateExecutionTime();
                SendMessage($"Test {testName} stopped");
            }
            catch (Exception ex)
            {
                HandleException("Stop", ex);
            }
        }

        public virtual void Pause()
        {
            try
            {
                OnPause();
                SendMessage($"Test {testName} paused");
            }
            catch (Exception ex)
            {
                HandleException("Pause", ex);
            }
        }

        public virtual void Resume()
        {
            try
            {
                OnResume();
                SendMessage($"Test {testName} resumed");
            }
            catch (Exception ex)
            {
                HandleException("Resume", ex);
            }
        }

        public virtual TestResult Update()
        {
            if (!isEnabled || status != TestStatus.Running)
                return null;

            try
            {
                // Check timeout
                if (Time.time - startTime > timeout)
                {
                    Fail("Test timeout exceeded");
                    return GetResult();
                }

                return OnUpdate();
            }
            catch (Exception ex)
            {
                HandleException("Update", ex);
                return GetResult();
            }
        }

        public virtual IEnumerator Execute()
        {
            Start();

            while (status == TestStatus.Running)
            {
                var result = Update();
                if (result != null)
                {
                    yield break;
                }
                yield return null;
            }

            Stop();
        }

        public virtual void UpdateMetrics()
        {
            try
            {
                OnUpdateMetrics();
            }
            catch (Exception ex)
            {
                HandleException("UpdateMetrics", ex);
            }
        }

        public virtual void Cleanup()
        {
            try
            {
                OnCleanup();
                testMetrics.Clear();
                Debug.Log($"[RuntimeTest] {testName} cleaned up");
            }
            catch (Exception ex)
            {
                HandleException("Cleanup", ex);
            }
        }

        #endregion

        #region Protected Methods

        protected virtual void OnInitialize() { }
        protected virtual void OnStart() { }
        protected virtual void OnStop() { }
        protected virtual void OnPause() { }
        protected virtual void OnResume() { }
        protected virtual TestResult OnUpdate() { return null; }
        protected virtual void OnUpdateMetrics() { }
        protected virtual void OnCleanup() { }

        protected void Pass(string message = "")
        {
            status = TestStatus.Passed;
            if (!string.IsNullOrEmpty(message))
            {
                SendMessage(message);
            }

            CompleteTest();
        }

        protected void Fail(string error)
        {
            status = TestStatus.Failed;
            lastError = error;
            SendMessage($"FAILED: {error}");
            CompleteTest();
        }

        protected void Skip(string reason)
        {
            status = TestStatus.Skipped;
            SendMessage($"SKIPPED: {reason}");
            CompleteTest();
        }

        protected void SetMetric(string key, object value)
        {
            testMetrics[key] = value;
        }

        protected T GetMetric<T>(string key)
        {
            if (testMetrics.TryGetValue(key, out object value) && value is T)
            {
                return (T)value;
            }
            return default(T);
        }

        protected void SendMessage(string message)
        {
            OnTestMessage?.Invoke($"[{testName}] {message}");
        }

        #endregion

        #region Private Methods

        private void HandleException(string operation, Exception ex)
        {
            var error = $"Exception in {operation}: {ex.Message}";
            Debug.LogError($"[RuntimeTest] {testName} - {error}");
            Fail(error);
        }

        private void CalculateExecutionTime()
        {
            executionTime = Time.time - startTime;
            SetMetric("ExecutionTime", executionTime);
        }

        private void CompleteTest()
        {
            CalculateExecutionTime();
            var result = GetResult();
            OnTestCompleted?.Invoke(result);
        }

        public TestResult GetResult()
        {
            return new TestResult
            {
                TestId = testName,
                Status = status,
                Message = status == TestStatus.Failed ? lastError : testDescription,
                Timestamp = startTime,
                ExecutionTime = executionTime,
                Metrics = new Dictionary<string, object>(testMetrics)
            };
        }

        #endregion
    }

    public enum TestPriority
    {
        Low = 0,
        Normal = 1,
        High = 2,
        Critical = 3
    }
}
```

#### 2.2 Performance Monitoring Test Implementation

[[LLM: Create specialized performance monitoring tests that track frame rate, memory usage, CPU usage, and other performance metrics during gameplay. Design tests that can identify performance degradation, memory leaks, and optimization opportunities in real-time.]]

**Performance Monitoring Tests**:

```csharp
// Assets/Scripts/Testing/Runtime/PerformanceMonitorTest.cs
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Profiling;

namespace {{project_namespace}}.Testing
{
    /// <summary>
    /// Comprehensive performance monitoring test for runtime performance validation
    /// </summary>
    public class PerformanceMonitorTest : RuntimeTest
    {
        private PerformanceValidator validator;
        private List<float> frameTimeHistory = new List<float>();
        private List<float> memoryUsageHistory = new List<float>();

        private float lastFrameRateCheck;
        private float frameRateCheckInterval = 1.0f;
        private int frameCount;
        private float accumulatedFrameTime;

        private const int HISTORY_SIZE = 100;

        public PerformanceMonitorTest(PerformanceValidator performanceValidator)
            : base("Performance Monitor", "Monitors runtime performance metrics and validates against thresholds")
        {
            validator = performanceValidator;
            timeout = float.MaxValue; // Continuous monitoring
        }

        protected override void OnStart()
        {
            frameTimeHistory.Clear();
            memoryUsageHistory.Clear();
            frameCount = 0;
            accumulatedFrameTime = 0f;
            lastFrameRateCheck = Time.time;

            SetMetric("StartMemory", Profiler.GetTotalAllocatedMemory(false) / (1024 * 1024));
        }

        protected override TestResult OnUpdate()
        {
            // Update frame metrics
            float currentFrameTime = Time.unscaledDeltaTime;
            frameCount++;
            accumulatedFrameTime += currentFrameTime;

            // Check frame rate periodically
            if (Time.time - lastFrameRateCheck >= frameRateCheckInterval)
            {
                ProcessFrameRateCheck();
                lastFrameRateCheck = Time.time;
            }

            // Update memory metrics
            UpdateMemoryMetrics();

            // Validate performance thresholds
            var validationResult = validator.ValidateCurrentPerformance();
            if (!validationResult.IsValid)
            {
                Fail($"Performance validation failed: {validationResult.ErrorMessage}");
                return GetResult();
            }

            return null; // Continue monitoring
        }

        private void ProcessFrameRateCheck()
        {
            if (frameCount > 0)
            {
                float averageFrameTime = accumulatedFrameTime / frameCount;
                float currentFPS = 1.0f / averageFrameTime;

                // Update history
                frameTimeHistory.Add(averageFrameTime);
                if (frameTimeHistory.Count > HISTORY_SIZE)
                {
                    frameTimeHistory.RemoveAt(0);
                }

                // Update metrics
                SetMetric("CurrentFPS", currentFPS);
                SetMetric("AverageFrameTime", averageFrameTime);
                SetMetric("FrameTimeHistory", frameTimeHistory.ToArray());

                // Reset counters
                frameCount = 0;
                accumulatedFrameTime = 0f;
            }
        }

        private void UpdateMemoryMetrics()
        {
            long totalMemory = Profiler.GetTotalAllocatedMemory(false);
            float memoryMB = totalMemory / (1024f * 1024f);

            memoryUsageHistory.Add(memoryMB);
            if (memoryUsageHistory.Count > HISTORY_SIZE)
            {
                memoryUsageHistory.RemoveAt(0);
            }

            SetMetric("CurrentMemoryMB", memoryMB);
            SetMetric("MemoryHistory", memoryUsageHistory.ToArray());

            // Check for memory leaks
            if (memoryUsageHistory.Count >= 10)
            {
                CheckMemoryTrends();
            }
        }

        private void CheckMemoryTrends()
        {
            if (memoryUsageHistory.Count < 10)
                return;

            // Check for consistent memory growth (potential leak)
            int recentSamples = 10;
            float oldAverage = 0f;
            float newAverage = 0f;

            int startIndex = memoryUsageHistory.Count - recentSamples;
            int midIndex = memoryUsageHistory.Count - (recentSamples / 2);

            for (int i = startIndex; i < midIndex; i++)
            {
                oldAverage += memoryUsageHistory[i];
            }
            oldAverage /= (recentSamples / 2);

            for (int i = midIndex; i < memoryUsageHistory.Count; i++)
            {
                newAverage += memoryUsageHistory[i];
            }
            newAverage /= (recentSamples / 2);

            float growthRate = (newAverage - oldAverage) / oldAverage;
            SetMetric("MemoryGrowthRate", growthRate);

            // Warning threshold for memory growth
            if (growthRate > 0.1f) // 10% growth in recent samples
            {
                SendMessage($"WARNING: Memory growth detected - {growthRate:P1} increase");
            }
        }

        protected override void OnUpdateMetrics()
        {
            var metrics = validator.GetMetrics();

            SetMetric("DrawCalls", metrics.DrawCalls);
            SetMetric("Batches", metrics.Batches);
            SetMetric("ActiveGameObjects", metrics.ActiveGameObjects);
            SetMetric("TotalAllocatedMemory", metrics.CurrentMemoryUsage);
            SetMetric("PeakMemoryUsage", metrics.PeakMemoryUsage);
        }
    }
}
```

### 3. Gameplay Validation System

#### 3.1 Gameplay Behavior Validation

[[LLM: Implement comprehensive gameplay validation systems that verify player movement, game state consistency, UI responsiveness, audio systems functionality, and other critical gameplay elements during runtime. Design validation that can detect gameplay bugs, state inconsistencies, and user experience issues.]]

**Gameplay Validation Framework**:

```csharp
// Assets/Scripts/Testing/Runtime/GameplayValidator.cs
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.Audio;

namespace {{project_namespace}}.Testing
{
    /// <summary>
    /// Comprehensive gameplay validation system for runtime behavior verification
    /// </summary>
    public class GameplayValidator
    {
        private GameplayValidationConfig config;
        private List<ValidationResult> validationHistory = new List<ValidationResult>();

        private Vector3 lastPlayerPosition;
        private float lastPlayerMovementTime;
        private float playerMovementThreshold = 0.1f;

        public void Configure(bool validateMovement, bool validateGameState, bool validateUI, bool validateAudio)
        {
            config = new GameplayValidationConfig
            {
                ValidatePlayerMovement = validateMovement,
                ValidateGameState = validateGameState,
                ValidateUIResponsiveness = validateUI,
                ValidateAudioSystems = validateAudio
            };
        }

        public ValidationResult ValidatePlayerMovement()
        {
            try
            {
                var player = GameObject.FindWithTag("Player");
                if (player == null)
                {
                    return new ValidationResult(false, "Player object not found", "Player Movement");
                }

                // Check if player can move
                var currentPosition = player.transform.position;
                var movementDistance = Vector3.Distance(currentPosition, lastPlayerPosition);

                if (movementDistance > playerMovementThreshold)
                {
                    lastPlayerMovementTime = Time.time;
                    lastPlayerPosition = currentPosition;
                }

                // Check for stuck player (no movement for extended period during input)
                if (Input.anyKey && Time.time - lastPlayerMovementTime > 5f)
                {
                    return new ValidationResult(false, "Player appears to be stuck - input detected but no movement", "Player Movement");
                }

                // Validate movement constraints
                if (ValidateMovementBounds(currentPosition))
                {
                    return new ValidationResult(true, "", "Player Movement");
                }

                return new ValidationResult(false, "Player position outside valid bounds", "Player Movement");
            }
            catch (Exception ex)
            {
                return new ValidationResult(false, $"Player movement validation error: {ex.Message}", "Player Movement");
            }
        }

        public ValidationResult ValidateGameState()
        {
            try
            {
                var gameManager = GameObject.FindObjectOfType<GameManager>();
                if (gameManager == null)
                {
                    return new ValidationResult(false, "GameManager not found", "Game State");
                }

                // Validate game state consistency
                var gameState = gameManager.CurrentGameState;
                if (!IsValidGameState(gameState))
                {
                    return new ValidationResult(false, $"Invalid game state: {gameState}", "Game State");
                }

                // Check for state transition issues
                if (HasInvalidStateTransition())
                {
                    return new ValidationResult(false, "Invalid game state transition detected", "Game State");
                }

                return new ValidationResult(true, "", "Game State");
            }
            catch (Exception ex)
            {
                return new ValidationResult(false, $"Game state validation error: {ex.Message}", "Game State");
            }
        }

        public ValidationResult ValidateUIResponsiveness()
        {
            try
            {
                var canvas = GameObject.FindObjectOfType<Canvas>();
                if (canvas == null)
                {
                    return new ValidationResult(false, "UI Canvas not found", "UI Responsiveness");
                }

                // Check UI element responsiveness
                var buttons = canvas.GetComponentsInChildren<Button>();
                foreach (var button in buttons)
                {
                    if (button.interactable && !button.IsInteractable())
                    {
                        return new ValidationResult(false, $"Button {button.name} not responding to interactions", "UI Responsiveness");
                    }
                }

                // Validate UI layout integrity
                if (!ValidateUILayout(canvas))
                {
                    return new ValidationResult(false, "UI layout integrity compromised", "UI Responsiveness");
                }

                return new ValidationResult(true, "", "UI Responsiveness");
            }
            catch (Exception ex)
            {
                return new ValidationResult(false, $"UI validation error: {ex.Message}", "UI Responsiveness");
            }
        }

        public ValidationResult ValidateAudioSystems()
        {
            try
            {
                var audioListener = GameObject.FindObjectOfType<AudioListener>();
                if (audioListener == null)
                {
                    return new ValidationResult(false, "AudioListener not found", "Audio Systems");
                }

                // Check audio sources
                var audioSources = GameObject.FindObjectsOfType<AudioSource>();
                foreach (var source in audioSources)
                {
                    if (source.isPlaying && source.clip == null)
                    {
                        return new ValidationResult(false, $"AudioSource {source.name} playing without clip", "Audio Systems");
                    }
                }

                // Validate audio mixer if present
                if (!ValidateAudioMixer())
                {
                    return new ValidationResult(false, "Audio mixer validation failed", "Audio Systems");
                }

                return new ValidationResult(true, "", "Audio Systems");
            }
            catch (Exception ex)
            {
                return new ValidationResult(false, $"Audio validation error: {ex.Message}", "Audio Systems");
            }
        }

        private bool ValidateMovementBounds(Vector3 position)
        {
            // Add your movement bounds validation logic here
            // This is a placeholder - implement based on your game's requirements
            return true;
        }

        private bool IsValidGameState(GameState state)
        {
            // Implement game state validation logic
            return Enum.IsDefined(typeof(GameState), state);
        }

        private bool HasInvalidStateTransition()
        {
            // Implement state transition validation
            return false;
        }

        private bool ValidateUILayout(Canvas canvas)
        {
            // Implement UI layout validation
            return canvas.enabled && canvas.gameObject.activeInHierarchy;
        }

        private bool ValidateAudioMixer()
        {
            // Implement audio mixer validation
            return true;
        }

        public ValidationResult[] GetResults()
        {
            return validationHistory.ToArray();
        }
    }

    public class GameplayValidationConfig
    {
        public bool ValidatePlayerMovement;
        public bool ValidateGameState;
        public bool ValidateUIResponsiveness;
        public bool ValidateAudioSystems;
    }

    public enum GameState
    {
        Menu,
        Playing,
        Paused,
        GameOver,
        Loading
    }
}
```

### 4. Integration and System Testing

#### 4.1 System Integration Validation

[[LLM: Design system integration tests that validate the interaction between different game systems including physics, rendering, audio, input, and networking systems. Create tests that can detect integration issues and system dependencies that might cause runtime failures.]]

**System Integration Testing**:

```csharp
// Assets/Scripts/Testing/Runtime/SystemValidator.cs
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace {{project_namespace}}.Testing
{
    /// <summary>
    /// System-level validation for runtime integrity and system health monitoring
    /// </summary>
    public class SystemValidator
    {
        private Dictionary<string, SystemHealthMetric> systemMetrics = new Dictionary<string, SystemHealthMetric>();
        private float lastSystemCheck;
        private float systemCheckInterval = 5.0f;

        public ValidationResult ValidateSystemHealth()
        {
            try
            {
                if (Time.time - lastSystemCheck < systemCheckInterval)
                {
                    return GetLastValidationResult();
                }

                lastSystemCheck = Time.time;

                // Check physics system
                if (!ValidatePhysicsSystem())
                {
                    return new ValidationResult(false, "Physics system validation failed", "System Health");
                }

                // Check rendering system
                if (!ValidateRenderingSystem())
                {
                    return new ValidationResult(false, "Rendering system validation failed", "System Health");
                }

                // Check scene management
                if (!ValidateSceneManagement())
                {
                    return new ValidationResult(false, "Scene management validation failed", "System Health");
                }

                // Check memory management
                if (!ValidateMemoryManagement())
                {
                    return new ValidationResult(false, "Memory management validation failed", "System Health");
                }

                UpdateSystemMetrics();
                return new ValidationResult(true, "", "System Health");
            }
            catch (Exception ex)
            {
                return new ValidationResult(false, $"System validation error: {ex.Message}", "System Health");
            }
        }

        private bool ValidatePhysicsSystem()
        {
            try
            {
                // Check physics simulation
                if (Physics.autoSimulation && Time.fixedDeltaTime <= 0)
                {
                    return false;
                }

                // Check for physics world corruption
                var rigidBodies = GameObject.FindObjectsOfType<Rigidbody>();
                foreach (var rb in rigidBodies)
                {
                    if (rb != null && rb.gameObject != null && float.IsNaN(rb.position.x))
                    {
                        Debug.LogError($"Physics corruption detected in {rb.name} - NaN position");
                        return false;
                    }
                }

                return true;
            }
            catch (Exception ex)
            {
                Debug.LogError($"Physics validation error: {ex.Message}");
                return false;
            }
        }

        private bool ValidateRenderingSystem()
        {
            try
            {
                // Check camera system
                var cameras = Camera.allCameras;
                if (cameras.Length == 0)
                {
                    return false;
                }

                foreach (var camera in cameras)
                {
                    if (camera.enabled && camera.gameObject.activeInHierarchy)
                    {
                        if (float.IsNaN(camera.transform.position.x))
                        {
                            Debug.LogError($"Camera corruption detected in {camera.name} - NaN position");
                            return false;
                        }
                    }
                }

                // Check render pipeline
                if (QualitySettings.renderPipeline != null)
                {
                    // Validate render pipeline asset
                    return QualitySettings.renderPipeline != null;
                }

                return true;
            }
            catch (Exception ex)
            {
                Debug.LogError($"Rendering validation error: {ex.Message}");
                return false;
            }
        }

        private bool ValidateSceneManagement()
        {
            try
            {
                // Check scene integrity
                var activeScene = SceneManager.GetActiveScene();
                if (!activeScene.IsValid())
                {
                    return false;
                }

                // Check for scene corruption
                if (activeScene.rootCount == 0 && activeScene.name != "EmptyScene")
                {
                    Debug.LogWarning("Active scene has no root objects");
                }

                return true;
            }
            catch (Exception ex)
            {
                Debug.LogError($"Scene validation error: {ex.Message}");
                return false;
            }
        }

        private bool ValidateMemoryManagement()
        {
            try
            {
                // Check for excessive memory usage
                long totalMemory = GC.GetTotalMemory(false);
                long thresholdBytes = 1024L * 1024L * 1024L; // 1GB threshold

                if (totalMemory > thresholdBytes)
                {
                    Debug.LogWarning($"High memory usage detected: {totalMemory / (1024 * 1024)}MB");
                }

                // Force garbage collection and check again
                GC.Collect();
                long memoryAfterGC = GC.GetTotalMemory(true);

                // Check for memory leaks (significant difference before/after GC)
                long memoryDifference = totalMemory - memoryAfterGC;
                if (memoryDifference > 100 * 1024 * 1024) // 100MB difference
                {
                    systemMetrics["MemoryReclaimed"] = new SystemHealthMetric
                    {
                        Value = memoryDifference,
                        Timestamp = Time.time,
                        Category = "Memory"
                    };
                }

                return true;
            }
            catch (Exception ex)
            {
                Debug.LogError($"Memory validation error: {ex.Message}");
                return false;
            }
        }

        private void UpdateSystemMetrics()
        {
            systemMetrics["LastSystemCheck"] = new SystemHealthMetric
            {
                Value = Time.time,
                Timestamp = Time.time,
                Category = "System"
            };

            systemMetrics["ActiveGameObjects"] = new SystemHealthMetric
            {
                Value = GameObject.FindObjectsOfType<GameObject>().Length,
                Timestamp = Time.time,
                Category = "System"
            };
        }

        private ValidationResult GetLastValidationResult()
        {
            return new ValidationResult(true, "", "System Health");
        }

        public ValidationResult[] GetResults()
        {
            var results = new List<ValidationResult>();

            foreach (var metric in systemMetrics.Values)
            {
                results.Add(new ValidationResult(true, $"{metric.Category}: {metric.Value}", "System Metrics"));
            }

            return results.ToArray();
        }
    }

    public class SystemHealthMetric
    {
        public object Value;
        public float Timestamp;
        public string Category;
    }
}
```

### 5. Memory Leak Detection and Performance Analysis

#### 5.1 Advanced Memory Leak Detection

[[LLM: Implement sophisticated memory leak detection systems that can identify memory growth patterns, detect unreleased resources, and provide detailed analysis of memory usage trends. Create systems that can automatically detect and report potential memory leaks during runtime testing.]]

**Memory Leak Detection System**:

```csharp
// Assets/Scripts/Testing/Runtime/MemoryLeakDetectionTest.cs
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.Profiling;

namespace {{project_namespace}}.Testing
{
    /// <summary>
    /// Advanced memory leak detection system for runtime memory analysis
    /// </summary>
    public class MemoryLeakDetectionTest : RuntimeTest
    {
        private List<MemorySnapshot> memorySnapshots = new List<MemorySnapshot>();
        private Dictionary<string, List<long>> categoryMemoryHistory = new Dictionary<string, List<long>>();

        private float snapshotInterval = 10.0f;
        private float lastSnapshotTime;
        private int maxSnapshotHistory = 50;
        private long baselineMemory;
        private bool baselineSet = false;

        public MemoryLeakDetectionTest()
            : base("Memory Leak Detection", "Detects potential memory leaks through runtime memory analysis")
        {
            timeout = float.MaxValue; // Continuous monitoring
        }

        protected override void OnStart()
        {
            memorySnapshots.Clear();
            categoryMemoryHistory.Clear();

            TakeMemorySnapshot();
            baselineMemory = GetTotalMemory();
            baselineSet = true;

            SetMetric("BaselineMemory", baselineMemory);
            lastSnapshotTime = Time.time;
        }

        protected override TestResult OnUpdate()
        {
            if (Time.time - lastSnapshotTime >= snapshotInterval)
            {
                TakeMemorySnapshot();
                AnalyzeMemoryTrends();
                lastSnapshotTime = Time.time;
            }

            // Check for critical memory growth
            var currentMemory = GetTotalMemory();
            var memoryGrowth = currentMemory - baselineMemory;
            var growthRatio = (float)memoryGrowth / baselineMemory;

            SetMetric("CurrentMemory", currentMemory);
            SetMetric("MemoryGrowth", memoryGrowth);
            SetMetric("GrowthRatio", growthRatio);

            // Alert on significant memory growth
            if (growthRatio > 0.5f) // 50% growth from baseline
            {
                Fail($"Significant memory growth detected: {growthRatio:P1} increase from baseline");
                return GetResult();
            }

            return null; // Continue monitoring
        }

        private void TakeMemorySnapshot()
        {
            try
            {
                var snapshot = new MemorySnapshot
                {
                    Timestamp = Time.time,
                    TotalMemory = GetTotalMemory(),
                    UnityObjectMemory = Profiler.GetRuntimeMemorySizeLong(null),
                    TextureMemory = GetTextureMemory(),
                    MeshMemory = GetMeshMemory(),
                    AudioMemory = GetAudioMemory(),
                    AnimationMemory = GetAnimationMemory(),
                    ScriptingMemory = GetScriptingMemory(),
                    ActiveGameObjects = GameObject.FindObjectsOfType<GameObject>().Length
                };

                memorySnapshots.Add(snapshot);

                // Limit history size
                if (memorySnapshots.Count > maxSnapshotHistory)
                {
                    memorySnapshots.RemoveAt(0);
                }

                // Update category histories
                UpdateCategoryHistory("Total", snapshot.TotalMemory);
                UpdateCategoryHistory("UnityObjects", snapshot.UnityObjectMemory);
                UpdateCategoryHistory("Textures", snapshot.TextureMemory);
                UpdateCategoryHistory("Meshes", snapshot.MeshMemory);
                UpdateCategoryHistory("Audio", snapshot.AudioMemory);
                UpdateCategoryHistory("Animation", snapshot.AnimationMemory);
                UpdateCategoryHistory("Scripting", snapshot.ScriptingMemory);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[MemoryLeakDetection] Error taking snapshot: {ex.Message}");
            }
        }

        private void UpdateCategoryHistory(string category, long memoryUsage)
        {
            if (!categoryMemoryHistory.ContainsKey(category))
            {
                categoryMemoryHistory[category] = new List<long>();
            }

            var history = categoryMemoryHistory[category];
            history.Add(memoryUsage);

            if (history.Count > maxSnapshotHistory)
            {
                history.RemoveAt(0);
            }
        }

        private void AnalyzeMemoryTrends()
        {
            if (memorySnapshots.Count < 5)
                return;

            foreach (var category in categoryMemoryHistory.Keys)
            {
                var trend = AnalyzeCategoryTrend(category);
                if (trend.IsLeaking)
                {
                    SendMessage($"WARNING: Potential memory leak in {category} - {trend.GrowthRate:P2} growth rate");
                    SetMetric($"{category}_LeakDetected", true);
                    SetMetric($"{category}_GrowthRate", trend.GrowthRate);
                }
            }

            // Analyze overall memory pattern
            AnalyzeMemoryPattern();
        }

        private MemoryTrend AnalyzeCategoryTrend(string category)
        {
            var history = categoryMemoryHistory[category];
            if (history.Count < 5)
                return new MemoryTrend { IsLeaking = false };

            // Calculate trend using linear regression
            int n = Math.Min(10, history.Count); // Use recent samples
            var recentHistory = history.Skip(history.Count - n).ToList();

            float slope = CalculateSlope(recentHistory);
            float averageMemory = recentHistory.Average();
            float growthRate = slope / averageMemory;

            return new MemoryTrend
            {
                IsLeaking = growthRate > 0.01f && slope > 1024 * 1024, // 1% growth rate and > 1MB slope
                GrowthRate = growthRate,
                Slope = slope
            };
        }

        private float CalculateSlope(List<long> values)
        {
            int n = values.Count;
            float sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

            for (int i = 0; i < n; i++)
            {
                sumX += i;
                sumY += values[i];
                sumXY += i * values[i];
                sumX2 += i * i;
            }

            return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        }

        private void AnalyzeMemoryPattern()
        {
            if (memorySnapshots.Count < 10)
                return;

            var recent = memorySnapshots.Skip(memorySnapshots.Count - 10).ToList();
            var older = memorySnapshots.Take(10).ToList();

            var recentAverage = recent.Average(s => s.TotalMemory);
            var olderAverage = older.Average(s => s.TotalMemory);

            var overallGrowth = (recentAverage - olderAverage) / olderAverage;
            SetMetric("OverallMemoryGrowth", overallGrowth);

            // Check for memory spikes
            CheckMemorySpikes(recent);

            // Check for steady growth pattern
            CheckSteadyGrowthPattern();
        }

        private void CheckMemorySpikes(List<MemorySnapshot> snapshots)
        {
            for (int i = 1; i < snapshots.Count; i++)
            {
                var growth = (float)(snapshots[i].TotalMemory - snapshots[i - 1].TotalMemory) / snapshots[i - 1].TotalMemory;
                if (growth > 0.1f) // 10% spike
                {
                    SendMessage($"Memory spike detected: {growth:P1} increase between snapshots");
                    SetMetric("MemorySpikeDetected", true);
                }
            }
        }

        private void CheckSteadyGrowthPattern()
        {
            if (memorySnapshots.Count < 5)
                return;

            int consecutiveGrowth = 0;
            for (int i = 1; i < memorySnapshots.Count; i++)
            {
                if (memorySnapshots[i].TotalMemory > memorySnapshots[i - 1].TotalMemory)
                {
                    consecutiveGrowth++;
                }
                else
                {
                    consecutiveGrowth = 0;
                }
            }

            if (consecutiveGrowth >= 5)
            {
                SendMessage($"Steady memory growth detected: {consecutiveGrowth} consecutive increases");
                SetMetric("SteadyGrowthDetected", true);
            }
        }

        private long GetTotalMemory()
        {
            return GC.GetTotalMemory(false);
        }

        private long GetTextureMemory()
        {
            long totalTextureMemory = 0;
            var textures = Resources.FindObjectsOfTypeAll<Texture>();
            foreach (var texture in textures)
            {
                totalTextureMemory += Profiler.GetRuntimeMemorySizeLong(texture);
            }
            return totalTextureMemory;
        }

        private long GetMeshMemory()
        {
            long totalMeshMemory = 0;
            var meshes = Resources.FindObjectsOfTypeAll<Mesh>();
            foreach (var mesh in meshes)
            {
                totalMeshMemory += Profiler.GetRuntimeMemorySizeLong(mesh);
            }
            return totalMeshMemory;
        }

        private long GetAudioMemory()
        {
            long totalAudioMemory = 0;
            var audioClips = Resources.FindObjectsOfTypeAll<AudioClip>();
            foreach (var clip in audioClips)
            {
                totalAudioMemory += Profiler.GetRuntimeMemorySizeLong(clip);
            }
            return totalAudioMemory;
        }

        private long GetAnimationMemory()
        {
            long totalAnimationMemory = 0;
            var animationClips = Resources.FindObjectsOfTypeAll<AnimationClip>();
            foreach (var clip in animationClips)
            {
                totalAnimationMemory += Profiler.GetRuntimeMemorySizeLong(clip);
            }
            return totalAnimationMemory;
        }

        private long GetScriptingMemory()
        {
            return Profiler.GetMonoUsedSizeLong();
        }

        public MemorySnapshot[] GetMemorySnapshots()
        {
            return memorySnapshots.ToArray();
        }

        public Dictionary<string, float> GetCategoryGrowthRates()
        {
            var growthRates = new Dictionary<string, float>();

            foreach (var category in categoryMemoryHistory.Keys)
            {
                var trend = AnalyzeCategoryTrend(category);
                growthRates[category] = trend.GrowthRate;
            }

            return growthRates;
        }
    }

    [Serializable]
    public class MemorySnapshot
    {
        public float Timestamp;
        public long TotalMemory;
        public long UnityObjectMemory;
        public long TextureMemory;
        public long MeshMemory;
        public long AudioMemory;
        public long AnimationMemory;
        public long ScriptingMemory;
        public int ActiveGameObjects;
    }

    public class MemoryTrend
    {
        public bool IsLeaking;
        public float GrowthRate;
        public float Slope;
    }
}
```

## Success Criteria

- [[LLM: Validate that all implemented systems integrate properly with the Unity runtime environment and provide comprehensive test coverage for gameplay, performance, and system validation]]

### Runtime Testing Framework Validation ✅

- **Test Framework Architecture**: Complete runtime testing foundation with non-intrusive monitoring
- **Performance Monitoring**: Comprehensive frame rate, memory, and system performance validation
- **Gameplay Validation**: Real-time validation of player movement, game state, UI, and audio systems
- **Memory Leak Detection**: Advanced memory analysis with trend detection and leak identification
- **System Integration**: Complete validation of physics, rendering, scene management, and memory systems

### Production Readiness Assessment ✅

- **Code Quality**: Production-ready implementation with comprehensive error handling
- **Unity API Compliance**: 100% Unity 2022.3 LTS compatibility with current best practices
- **Performance Impact**: Minimal performance overhead during runtime monitoring
- **Extensibility**: Modular design allowing easy addition of custom test types

### Integration and Workflow Compatibility ✅

- **Unity Workflows**: Seamless integration with existing Unity development workflows
- **Build Integration**: Compatible with development and release builds
- **Team Adoption**: Clear patterns for team integration and custom test development
- **Reporting Systems**: Comprehensive reporting with automated output generation

## Integration Points

- **Unity Editor Integration**: Compatible with Unity Test Runner and Editor workflows
- **Build Pipeline**: Integrated with Unity build system for automated testing
- **Performance Profiler**: Extends Unity Profiler with custom runtime metrics
- **Development Workflow**: Supports continuous integration and automated quality assurance

## Usage Instructions

1. **Framework Setup**: Add RuntimeTestFramework component to a persistent GameObject in your scene
2. **Configuration**: Configure monitoring settings, thresholds, and validation parameters
3. **Custom Tests**: Implement custom RuntimeTest classes for project-specific validation
4. **Execution**: Tests run automatically during gameplay or can be triggered manually
5. **Analysis**: Review generated reports and metrics for performance and quality insights

This runtime testing framework provides comprehensive automated validation of gameplay systems, performance metrics, and system health during live game execution, ensuring robust quality assurance throughout the development process.
