# Unity Integration Testing and Quality Assurance Task

## Purpose

To establish comprehensive integration testing frameworks that validate system interactions, component dependencies, and end-to-end workflows in Unity projects. This task extends `playmode-tests.md` and `interface-design.md` to provide advanced integration testing patterns including cross-system validation, data flow testing, performance benchmarking, and automated quality assurance that ensures reliable software delivery and maintains code quality throughout development cycles.

## Prerequisites

- Unity project with PlayMode testing framework established and validated
- Interface design patterns implemented with dependency injection support
- Component architecture established with proper service management
- Unity Test Framework configured with both EditMode and PlayMode capabilities
- Understanding of integration testing concepts and system boundaries
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Integration Testing Architecture Foundation

#### 1.1 Integration Test Framework and Infrastructure

[[LLM: Analyze the project's system architecture, component dependencies, and integration points to design a comprehensive integration testing framework. Consider Unity's testing capabilities, async operations, scene management, and performance requirements. Design test infrastructure that supports cross-system validation, data integrity testing, and end-to-end workflow verification while maintaining test isolation and reproducibility.]]

**Core Integration Testing Framework**:

```csharp
// Assets/Scripts/Testing/Integration/IntegrationTestFramework.cs
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.TestTools;
using NUnit.Framework;
using {{project_namespace}}.Interfaces.Core;
using {{project_namespace}}.Interfaces.Services;

namespace {{project_namespace}}.Testing.Integration
{
    /// <summary>
    /// Comprehensive integration testing framework for Unity systems
    /// Provides infrastructure for cross-system validation and end-to-end testing
    /// </summary>
    public abstract class IntegrationTestBase : MonoBehaviour
    {
        [Header("Test Configuration")]
        [SerializeField] protected TestConfiguration testConfiguration;
        [SerializeField] protected bool enableDetailedLogging = true;
        [SerializeField] protected bool enablePerformanceTracking = true;
        [SerializeField] protected float testTimeoutSeconds = 30.0f;

        [Header("Test Environment")]
        [SerializeField] protected List<GameObject> testPrefabs = new List<GameObject>();
        [SerializeField] protected List<ScriptableObject> testData = new List<ScriptableObject>();
        [SerializeField] protected TestSceneConfiguration sceneConfiguration;

        protected TestContext testContext;
        protected IServiceManager serviceManager;
        protected TestResultCollector resultCollector;
        protected PerformanceMonitor performanceMonitor;
        protected TestDataManager testDataManager;

        private readonly List<GameObject> instantiatedObjects = new List<GameObject>();
        private readonly List<IDisposable> disposableResources = new List<IDisposable>();
        private bool isTestRunning = false;
        private DateTime testStartTime;

        /// <summary>
        /// Current test context
        /// </summary>
        public TestContext Context => testContext;

        /// <summary>
        /// Whether a test is currently running
        /// </summary>
        public bool IsTestRunning => isTestRunning;

        /// <summary>
        /// Test execution time
        /// </summary>
        public TimeSpan TestExecutionTime => DateTime.UtcNow - testStartTime;

        #region NUnit Test Lifecycle

        [OneTimeSetUp]
        public virtual void OneTimeSetUp()
        {
            LogDebug("Starting integration test one-time setup");

            try
            {
                // Initialize test infrastructure
                InitializeTestInfrastructure();

                // Setup test environment
                SetupTestEnvironment();

                LogDebug("Integration test one-time setup completed");
            }
            catch (Exception ex)
            {
                LogError($"One-time setup failed: {ex.Message}");
                throw;
            }
        }

        [SetUp]
        public virtual void SetUp()
        {
            LogDebug($"Setting up test: {TestContext.CurrentContext.Test.Name}");

            try
            {
                testStartTime = DateTime.UtcNow;
                isTestRunning = true;

                // Create test context
                CreateTestContext();

                // Initialize test data
                InitializeTestData();

                // Setup test systems
                SetupTestSystems();

                // Start performance monitoring
                if (enablePerformanceTracking)
                {
                    performanceMonitor?.StartMonitoring();
                }

                LogDebug("Test setup completed");
            }
            catch (Exception ex)
            {
                LogError($"Test setup failed: {ex.Message}");
                TearDown();
                throw;
            }
        }

        [TearDown]
        public virtual void TearDown()
        {
            LogDebug($"Tearing down test: {TestContext.CurrentContext.Test.Name}");

            try
            {
                // Stop performance monitoring
                if (enablePerformanceTracking)
                {
                    performanceMonitor?.StopMonitoring();
                }

                // Collect test results
                CollectTestResults();

                // Cleanup test systems
                CleanupTestSystems();

                // Cleanup test data
                CleanupTestData();

                // Cleanup instantiated objects
                CleanupInstantiatedObjects();

                // Dispose resources
                DisposeResources();

                isTestRunning = false;

                LogDebug("Test teardown completed");
            }
            catch (Exception ex)
            {
                LogError($"Test teardown failed: {ex.Message}");
            }
        }

        [OneTimeTearDown]
        public virtual void OneTimeTearDown()
        {
            LogDebug("Starting integration test one-time teardown");

            try
            {
                // Cleanup test infrastructure
                CleanupTestInfrastructure();

                LogDebug("Integration test one-time teardown completed");
            }
            catch (Exception ex)
            {
                LogError($"One-time teardown failed: {ex.Message}");
            }
        }

        #endregion

        #region Test Infrastructure

        protected virtual void InitializeTestInfrastructure()
        {
            // Initialize result collector
            resultCollector = new TestResultCollector();

            // Initialize performance monitor
            if (enablePerformanceTracking)
            {
                performanceMonitor = new PerformanceMonitor();
            }

            // Initialize test data manager
            testDataManager = new TestDataManager();

            // Initialize service manager
            InitializeServiceManager();
        }

        protected virtual void InitializeServiceManager()
        {
            var serviceManagerGO = new GameObject("Test Service Manager");
            serviceManager = serviceManagerGO.AddComponent<TestServiceManager>();
            instantiatedObjects.Add(serviceManagerGO);

            // Register test services
            RegisterTestServices();
        }

        protected virtual void RegisterTestServices()
        {
            // Register core test services
            serviceManager.RegisterService<ITestResultCollector>(resultCollector);
            serviceManager.RegisterService<IPerformanceMonitor>(performanceMonitor);
            serviceManager.RegisterService<ITestDataManager>(testDataManager);

            // Allow derived classes to register additional services
            RegisterCustomServices();
        }

        /// <summary>
        /// Override this method to register custom test services
        /// </summary>
        protected virtual void RegisterCustomServices()
        {
            // Base implementation - override in derived classes
        }

        protected virtual void CreateTestContext()
        {
            testContext = new TestContext
            {
                TestName = TestContext.CurrentContext.Test.Name,
                TestId = Guid.NewGuid().ToString(),
                StartTime = testStartTime,
                Configuration = testConfiguration,
                ServiceManager = serviceManager,
                ResultCollector = resultCollector,
                PerformanceMonitor = performanceMonitor,
                DataManager = testDataManager
            };
        }

        #endregion

        #region Test Environment Setup

        protected virtual void SetupTestEnvironment()
        {
            // Setup test scene if configured
            if (sceneConfiguration != null)
            {
                SetupTestScene();
            }

            // Setup test data
            SetupTestData();
        }

        protected virtual void SetupTestScene()
        {
            // Load additional scenes if needed
            foreach (var sceneName in sceneConfiguration.AdditionalScenes)
            {
                if (!string.IsNullOrEmpty(sceneName))
                {
                    UnityEngine.SceneManagement.SceneManager.LoadScene(sceneName,
                        UnityEngine.SceneManagement.LoadSceneMode.Additive);
                }
            }

            // Instantiate test objects
            InstantiateTestObjects();
        }

        protected virtual void InstantiateTestObjects()
        {
            foreach (var prefab in testPrefabs)
            {
                if (prefab != null)
                {
                    var instance = Instantiate(prefab);
                    instantiatedObjects.Add(instance);
                }
            }
        }

        protected virtual void SetupTestData()
        {
            foreach (var data in testData)
            {
                if (data != null)
                {
                    testDataManager.RegisterTestData(data);
                }
            }
        }

        #endregion

        #region Test Execution Helpers

        /// <summary>
        /// Execute an integration test with timeout and error handling
        /// </summary>
        protected async Task<TestResult> ExecuteIntegrationTest(Func<Task<TestResult>> testAction, string testName = null)
        {
            testName = testName ?? TestContext.CurrentContext.Test.Name;

            try
            {
                LogDebug($"Executing integration test: {testName}");

                var timeoutTask = Task.Delay(TimeSpan.FromSeconds(testTimeoutSeconds));
                var testTask = testAction();

                var completedTask = await Task.WhenAny(testTask, timeoutTask);

                if (completedTask == timeoutTask)
                {
                    var timeoutResult = new TestResult
                    {
                        TestName = testName,
                        Success = false,
                        ErrorMessage = $"Test timed out after {testTimeoutSeconds} seconds",
                        ExecutionTime = TimeSpan.FromSeconds(testTimeoutSeconds)
                    };

                    resultCollector.AddResult(timeoutResult);
                    return timeoutResult;
                }

                var result = await testTask;
                result.TestName = testName;
                result.ExecutionTime = TestExecutionTime;

                resultCollector.AddResult(result);
                LogDebug($"Integration test completed: {testName} (Success: {result.Success})");

                return result;
            }
            catch (Exception ex)
            {
                var errorResult = new TestResult
                {
                    TestName = testName,
                    Success = false,
                    ErrorMessage = ex.Message,
                    Exception = ex,
                    ExecutionTime = TestExecutionTime
                };

                resultCollector.AddResult(errorResult);
                LogError($"Integration test failed: {testName} - {ex.Message}");

                return errorResult;
            }
        }

        /// <summary>
        /// Wait for a condition to be met with timeout
        /// </summary>
        protected async Task<bool> WaitForCondition(Func<bool> condition, float timeoutSeconds = 10.0f, float checkInterval = 0.1f)
        {
            var startTime = Time.time;

            while (Time.time - startTime < timeoutSeconds)
            {
                if (condition())
                {
                    return true;
                }

                await Task.Delay(Mathf.RoundToInt(checkInterval * 1000));
            }

            return false;
        }

        /// <summary>
        /// Assert that systems are properly integrated
        /// </summary>
        protected void AssertSystemIntegration(IComponentSystem system1, IComponentSystem system2, string relationshipDescription = null)
        {
            Assert.IsNotNull(system1, $"System 1 is null");
            Assert.IsNotNull(system2, $"System 2 is null");
            Assert.IsTrue(system1.IsValid(), $"System 1 ({system1.SystemId}) is not valid");
            Assert.IsTrue(system2.IsValid(), $"System 2 ({system2.SystemId}) is not valid");

            // Additional relationship-specific validation can be added here
            if (!string.IsNullOrEmpty(relationshipDescription))
            {
                LogDebug($"Validated system integration: {relationshipDescription}");
            }
        }

        /// <summary>
        /// Validate data flow between systems
        /// </summary>
        protected async Task<bool> ValidateDataFlow<T>(IDataSource<T> source, IDataConsumer<T> consumer, T testData, float timeoutSeconds = 5.0f)
        {
            var dataReceived = false;
            T receivedData = default;

            // Setup data consumer
            consumer.OnDataReceived += (data) =>
            {
                receivedData = data;
                dataReceived = true;
            };

            // Send test data
            source.SendData(testData);

            // Wait for data to be received
            var success = await WaitForCondition(() => dataReceived, timeoutSeconds);

            if (success)
            {
                Assert.AreEqual(testData, receivedData, "Received data does not match sent data");
            }

            return success;
        }

        #endregion

        #region Test System Management

        protected virtual void InitializeTestData()
        {
            // Override in derived classes to setup specific test data
        }

        protected virtual void SetupTestSystems()
        {
            // Override in derived classes to setup specific test systems
        }

        protected virtual void CleanupTestSystems()
        {
            // Override in derived classes to cleanup specific test systems
        }

        protected virtual void CleanupTestData()
        {
            testDataManager?.ClearTestData();
        }

        #endregion

        #region Resource Management

        protected void RegisterDisposable(IDisposable disposable)
        {
            if (disposable != null)
            {
                disposableResources.Add(disposable);
            }
        }

        protected T CreateTestObject<T>(T prefab) where T : UnityEngine.Object
        {
            var instance = Instantiate(prefab);

            if (instance is GameObject go)
            {
                instantiatedObjects.Add(go);
            }

            return instance;
        }

        private void CleanupInstantiatedObjects()
        {
            foreach (var obj in instantiatedObjects)
            {
                if (obj != null)
                {
                    DestroyImmediate(obj);
                }
            }
            instantiatedObjects.Clear();
        }

        private void DisposeResources()
        {
            foreach (var resource in disposableResources)
            {
                try
                {
                    resource?.Dispose();
                }
                catch (Exception ex)
                {
                    LogError($"Failed to dispose resource: {ex.Message}");
                }
            }
            disposableResources.Clear();
        }

        private void CleanupTestInfrastructure()
        {
            resultCollector?.Dispose();
            performanceMonitor?.Dispose();
            testDataManager?.Dispose();
        }

        #endregion

        #region Test Results and Reporting

        protected virtual void CollectTestResults()
        {
            if (resultCollector != null)
            {
                var summary = resultCollector.GenerateSummary();
                LogDebug($"Test results: {summary.TotalTests} tests, {summary.PassedTests} passed, {summary.FailedTests} failed");

                if (enablePerformanceTracking && performanceMonitor != null)
                {
                    var performanceReport = performanceMonitor.GenerateReport();
                    LogDebug($"Performance: Avg FPS: {performanceReport.AverageFrameRate:F1}, Memory: {performanceReport.PeakMemoryUsage:F1}MB");
                }
            }
        }

        #endregion

        #region Logging

        protected void LogDebug(string message)
        {
            if (enableDetailedLogging)
            {
                Debug.Log($"[IntegrationTest] {message}");
            }
        }

        protected void LogWarning(string message)
        {
            Debug.LogWarning($"[IntegrationTest] {message}");
        }

        protected void LogError(string message)
        {
            Debug.LogError($"[IntegrationTest] {message}");
        }

        #endregion
    }

    /// <summary>
    /// Test context container for integration tests
    /// </summary>
    public class TestContext
    {
        public string TestName { get; set; }
        public string TestId { get; set; }
        public DateTime StartTime { get; set; }
        public TestConfiguration Configuration { get; set; }
        public IServiceManager ServiceManager { get; set; }
        public TestResultCollector ResultCollector { get; set; }
        public PerformanceMonitor PerformanceMonitor { get; set; }
        public TestDataManager DataManager { get; set; }
    }

    /// <summary>
    /// Test configuration container
    /// </summary>
    [Serializable]
    public class TestConfiguration
    {
        [Header("General Settings")]
        public string TestSuiteName = "Integration Tests";
        public bool EnableParallelExecution = false;
        public bool EnableRetryOnFailure = true;
        public int MaxRetryAttempts = 3;

        [Header("Performance Settings")]
        public bool EnablePerformanceMonitoring = true;
        public float PerformanceThresholdFPS = 30.0f;
        public float MemoryThresholdMB = 100.0f;

        [Header("Timeout Settings")]
        public float DefaultTestTimeoutSeconds = 30.0f;
        public float SystemInitTimeoutSeconds = 10.0f;
        public float DataFlowTimeoutSeconds = 5.0f;
    }

    /// <summary>
    /// Test scene configuration
    /// </summary>
    [Serializable]
    public class TestSceneConfiguration
    {
        public List<string> AdditionalScenes = new List<string>();
        public bool UnloadScenesAfterTest = true;
        public bool ResetSceneState = true;
    }
}
```

### 2. System Integration Testing Patterns

#### 2.1 Cross-System Validation and Data Flow Testing

[[LLM: Create comprehensive integration testing patterns that validate interactions between different Unity systems. Design test scenarios for component communication, service dependencies, event propagation, and data synchronization. Include patterns for testing UI-Game logic integration, audio-visual synchronization, and performance impact validation across system boundaries.]]

**System Integration Test Patterns**:

```csharp
// Assets/Scripts/Testing/Integration/SystemIntegrationTests.cs
using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.TestTools;
using NUnit.Framework;
using {{project_namespace}}.Testing.Integration;
using {{project_namespace}}.Interfaces.Core;
using {{project_namespace}}.Interfaces.Services;

namespace {{project_namespace}}.Testing.Integration
{
    /// <summary>
    /// Comprehensive system integration tests for validating cross-system interactions
    /// </summary>
    [TestFixture]
    public class SystemIntegrationTests : IntegrationTestBase
    {
        [Header("System Test Configuration")]
        [SerializeField] private List<IComponentSystem> testSystems = new List<IComponentSystem>();
        [SerializeField] private SystemIntegrationTestData testData;
        [SerializeField] private bool enableStressTest = false;
        [SerializeField] private int stressTestIterations = 100;

        private SystemTestOrchestrator orchestrator;
        private DataFlowValidator dataFlowValidator;
        private EventPropagationTester eventTester;
        private PerformanceImpactAnalyzer performanceAnalyzer;

        #region Setup and Teardown

        protected override void RegisterCustomServices()
        {
            base.RegisterCustomServices();

            orchestrator = new SystemTestOrchestrator();
            dataFlowValidator = new DataFlowValidator();
            eventTester = new EventPropagationTester();
            performanceAnalyzer = new PerformanceImpactAnalyzer();

            serviceManager.RegisterService<ISystemTestOrchestrator>(orchestrator);
            serviceManager.RegisterService<IDataFlowValidator>(dataFlowValidator);
            serviceManager.RegisterService<IEventPropagationTester>(eventTester);
            serviceManager.RegisterService<IPerformanceImpactAnalyzer>(performanceAnalyzer);
        }

        protected override void SetupTestSystems()
        {
            base.SetupTestSystems();

            // Initialize test systems
            foreach (var system in testSystems)
            {
                if (system != null)
                {
                    orchestrator.RegisterSystem(system);
                }
            }

            // Setup data flow monitoring
            dataFlowValidator.Initialize(testSystems);

            // Setup event monitoring
            eventTester.Initialize();

            // Setup performance monitoring
            performanceAnalyzer.Initialize(testSystems);
        }

        #endregion

        #region Service Integration Tests

        [Test]
        public async Task TestServiceManagerIntegration()
        {
            await ExecuteIntegrationTest(async () =>
            {
                var result = new TestResult();

                // Test service registration and retrieval
                var testService = new TestService();
                serviceManager.RegisterService<ITestService>(testService);

                var retrievedService = serviceManager.GetService<ITestService>();
                Assert.AreEqual(testService, retrievedService, "Service retrieval failed");

                // Test service dependency resolution
                var dependentService = new DependentTestService();
                serviceManager.RegisterService<IDependentTestService>(dependentService);

                var injectionResult = serviceManager.InjectDependencies(dependentService);
                Assert.IsTrue(injectionResult, "Dependency injection failed");

                // Test service lifecycle
                Assert.IsTrue(testService.IsInitialized, "Service not properly initialized");

                result.Success = true;
                result.Message = "Service manager integration validated";

                return result;
            });
        }

        [Test]
        public async Task TestEventBusIntegration()
        {
            await ExecuteIntegrationTest(async () =>
            {
                var result = new TestResult();

                // Setup event bus
                var eventBus = serviceManager.GetService<IEventBusService>();
                Assert.IsNotNull(eventBus, "Event bus service not available");

                // Test event subscription and publishing
                var eventReceived = false;
                TestGameEvent receivedEvent = null;

                eventBus.Subscribe<TestGameEvent>((e) =>
                {
                    eventReceived = true;
                    receivedEvent = e;
                });

                var testEvent = new TestGameEvent
                {
                    EventId = "test_integration",
                    TestData = "Integration test data"
                };

                eventBus.Publish(testEvent);

                // Wait for event propagation
                await WaitForCondition(() => eventReceived, 5.0f);

                Assert.IsTrue(eventReceived, "Event was not received");
                Assert.AreEqual(testEvent.EventId, receivedEvent.EventId, "Event data mismatch");

                result.Success = true;
                result.Message = "Event bus integration validated";

                return result;
            });
        }

        #endregion

        #region Component System Integration Tests

        [Test]
        public async Task TestComponentSystemCommunication()
        {
            await ExecuteIntegrationTest(async () =>
            {
                var result = new TestResult();

                // Setup test components
                var sourceComponent = CreateTestObject(testData.SourceComponentPrefab);
                var targetComponent = CreateTestObject(testData.TargetComponentPrefab);

                var sourceSystem = sourceComponent.GetComponent<IDataSource<TestData>>();
                var targetSystem = targetComponent.GetComponent<IDataConsumer<TestData>>();

                Assert.IsNotNull(sourceSystem, "Source system not found");
                Assert.IsNotNull(targetSystem, "Target system not found");

                // Test data flow
                var testDataObject = new TestData { Value = "Integration Test", Timestamp = DateTime.UtcNow };
                var success = await ValidateDataFlow(sourceSystem, targetSystem, testDataObject);

                Assert.IsTrue(success, "Data flow validation failed");

                result.Success = true;
                result.Message = "Component system communication validated";

                return result;
            });
        }

        [Test]
        public async Task TestSystemLifecycleIntegration()
        {
            await ExecuteIntegrationTest(async () =>
            {
                var result = new TestResult();

                // Test system initialization order
                var initializationOrder = new List<string>();

                foreach (var system in testSystems)
                {
                    system.OnStateChanged += (state) =>
                    {
                        if (state == SystemState.Ready)
                        {
                            initializationOrder.Add(system.SystemId);
                        }
                    };
                }

                // Initialize systems
                await orchestrator.InitializeSystemsAsync();

                // Verify initialization order based on priority
                var expectedOrder = testSystems
                    .OrderBy(s => s.InitializationPriority)
                    .Select(s => s.SystemId)
                    .ToList();

                CollectionAssert.AreEqual(expectedOrder, initializationOrder, "System initialization order incorrect");

                // Test system state consistency
                foreach (var system in testSystems)
                {
                    Assert.AreEqual(SystemState.Ready, system.State, $"System {system.SystemId} not in ready state");
                    Assert.IsTrue(system.IsValid(), $"System {system.SystemId} is not valid");
                }

                result.Success = true;
                result.Message = "System lifecycle integration validated";

                return result;
            });
        }

        #endregion

        #region Data Flow Integration Tests

        [Test]
        public async Task TestDataFlowIntegrity()
        {
            await ExecuteIntegrationTest(async () =>
            {
                var result = new TestResult();

                // Setup data flow chain
                var dataChain = await dataFlowValidator.CreateDataFlowChain(testSystems);
                Assert.IsNotNull(dataChain, "Failed to create data flow chain");

                // Test data integrity through the chain
                var originalData = new IntegrationTestData
                {
                    Id = Guid.NewGuid().ToString(),
                    Payload = "Test data integrity",
                    ProcessingSteps = new List<string>()
                };

                var finalData = await dataFlowValidator.ProcessDataThroughChain(dataChain, originalData);

                Assert.IsNotNull(finalData, "Data was lost during processing");
                Assert.AreEqual(originalData.Id, finalData.Id, "Data ID changed during processing");
                Assert.IsTrue(finalData.ProcessingSteps.Count > 0, "No processing steps recorded");

                // Validate each processing step
                foreach (var step in finalData.ProcessingSteps)
                {
                    Assert.IsTrue(testSystems.Any(s => s.SystemId == step), $"Unknown processing step: {step}");
                }

                result.Success = true;
                result.Message = "Data flow integrity validated";

                return result;
            });
        }

        [Test]
        public async Task TestDataSynchronization()
        {
            await ExecuteIntegrationTest(async () =>
            {
                var result = new TestResult();

                // Setup synchronized data sources
                var dataSources = testSystems.OfType<ISynchronizedDataSource>().ToList();
                Assert.IsTrue(dataSources.Count >= 2, "Need at least 2 synchronized data sources for this test");

                // Test data synchronization
                var syncData = new SynchronizedTestData
                {
                    SyncId = Guid.NewGuid().ToString(),
                    Version = 1,
                    Content = "Synchronization test"
                };

                // Update data in first source
                dataSources[0].UpdateData(syncData);

                // Wait for synchronization
                await WaitForCondition(() =>
                    dataSources.All(source => source.GetData(syncData.SyncId)?.Version == syncData.Version),
                    10.0f);

                // Validate synchronization
                foreach (var source in dataSources)
                {
                    var syncedData = source.GetData(syncData.SyncId);
                    Assert.IsNotNull(syncedData, $"Data not synchronized to source {source.GetType().Name}");
                    Assert.AreEqual(syncData.Version, syncedData.Version, "Data version mismatch");
                    Assert.AreEqual(syncData.Content, syncedData.Content, "Data content mismatch");
                }

                result.Success = true;
                result.Message = "Data synchronization validated";

                return result;
            });
        }

        #endregion

        #region Performance Integration Tests

        [Test]
        public async Task TestSystemPerformanceImpact()
        {
            await ExecuteIntegrationTest(async () =>
            {
                var result = new TestResult();

                // Baseline performance measurement
                performanceAnalyzer.StartBaslineMeasurement();
                await Task.Delay(1000); // Wait 1 second for baseline
                var baseline = performanceAnalyzer.GetBaselineMetrics();

                // Load test systems
                foreach (var system in testSystems)
                {
                    await orchestrator.LoadSystemAsync(system);
                }

                // Stress test if enabled
                if (enableStressTest)
                {
                    await RunStressTest();
                }

                // Performance measurement with systems loaded
                performanceAnalyzer.StartLoadMeasurement();
                await Task.Delay(1000); // Wait 1 second for load measurement
                var loadMetrics = performanceAnalyzer.GetLoadMetrics();

                // Validate performance impact
                var performanceImpact = performanceAnalyzer.CalculatePerformanceImpact(baseline, loadMetrics);

                Assert.IsTrue(performanceImpact.FrameRateImpact < 0.3f,
                    $"Frame rate impact too high: {performanceImpact.FrameRateImpact:P}");
                Assert.IsTrue(performanceImpact.MemoryImpact < 0.5f,
                    $"Memory impact too high: {performanceImpact.MemoryImpact:P}");

                result.Success = true;
                result.Message = $"Performance impact within acceptable limits (FPS: {performanceImpact.FrameRateImpact:P}, Memory: {performanceImpact.MemoryImpact:P})";

                return result;
            });
        }

        private async Task RunStressTest()
        {
            for (int i = 0; i < stressTestIterations; i++)
            {
                // Simulate high load scenario
                await orchestrator.SimulateHighLoadScenario();

                // Check for performance degradation
                var currentMetrics = performanceAnalyzer.GetCurrentMetrics();
                if (currentMetrics.FrameRate < testConfiguration.PerformanceThresholdFPS)
                {
                    LogWarning($"Performance degradation detected at iteration {i}");
                    break;
                }

                await Task.Yield(); // Allow other tasks to run
            }
        }

        #endregion

        #region Error Handling Integration Tests

        [Test]
        public async Task TestErrorPropagationAndRecovery()
        {
            await ExecuteIntegrationTest(async () =>
            {
                var result = new TestResult();

                // Setup error monitoring
                var errorCaptured = false;
                string errorMessage = null;

                foreach (var system in testSystems)
                {
                    if (system is IErrorReportingSystem errorSystem)
                    {
                        errorSystem.OnErrorReported += (error) =>
                        {
                            errorCaptured = true;
                            errorMessage = error.Message;
                        };
                    }
                }

                // Trigger an error in one system
                var errorTrigger = testSystems.OfType<IErrorTriggerSystem>().FirstOrDefault();
                Assert.IsNotNull(errorTrigger, "No error trigger system available");

                errorTrigger.TriggerError("Integration test error");

                // Wait for error propagation
                await WaitForCondition(() => errorCaptured, 5.0f);

                Assert.IsTrue(errorCaptured, "Error was not captured");
                Assert.IsNotNull(errorMessage, "Error message is null");

                // Test error recovery
                var recoverySuccessful = await errorTrigger.AttemptRecovery();
                Assert.IsTrue(recoverySuccessful, "Error recovery failed");

                // Verify system states after recovery
                foreach (var system in testSystems)
                {
                    Assert.IsTrue(system.IsValid(), $"System {system.SystemId} not valid after recovery");
                }

                result.Success = true;
                result.Message = "Error propagation and recovery validated";

                return result;
            });
        }

        #endregion

        #region Utility Methods

        private async Task<bool> ValidateSystemDependencies()
        {
            foreach (var system in testSystems)
            {
                var dependencies = orchestrator.GetSystemDependencies(system);
                foreach (var dependency in dependencies)
                {
                    if (!testSystems.Contains(dependency))
                    {
                        LogError($"System {system.SystemId} has unmet dependency: {dependency.SystemId}");
                        return false;
                    }
                }
            }
            return true;
        }

        #endregion
    }

    #region Supporting Classes and Interfaces

    /// <summary>
    /// Test data container for integration tests
    /// </summary>
    [Serializable]
    public class SystemIntegrationTestData
    {
        public GameObject SourceComponentPrefab;
        public GameObject TargetComponentPrefab;
        public List<TestEventData> TestEvents = new List<TestEventData>();
        public PerformanceTestConfiguration PerformanceConfig;
    }

    /// <summary>
    /// Integration test data structure
    /// </summary>
    [Serializable]
    public class IntegrationTestData
    {
        public string Id;
        public string Payload;
        public List<string> ProcessingSteps;
        public DateTime ProcessingStartTime;
        public DateTime ProcessingEndTime;
    }

    /// <summary>
    /// Synchronized test data structure
    /// </summary>
    [Serializable]
    public class SynchronizedTestData
    {
        public string SyncId;
        public int Version;
        public string Content;
        public DateTime LastModified;
    }

    /// <summary>
    /// Test event data structure
    /// </summary>
    [Serializable]
    public class TestEventData
    {
        public string EventType;
        public string Payload;
        public float DelaySeconds;
    }

    /// <summary>
    /// Performance test configuration
    /// </summary>
    [Serializable]
    public class PerformanceTestConfiguration
    {
        public float MaxFrameTimeMs = 33.33f; // 30 FPS
        public float MaxMemoryUsageMB = 100.0f;
        public int StressTestDuration = 60; // seconds
    }

    /// <summary>
    /// Interface for systems that can report errors
    /// </summary>
    public interface IErrorReportingSystem : IComponentSystem
    {
        event Action<SystemError> OnErrorReported;
    }

    /// <summary>
    /// Interface for systems that can trigger errors for testing
    /// </summary>
    public interface IErrorTriggerSystem : IComponentSystem
    {
        void TriggerError(string errorMessage);
        Task<bool> AttemptRecovery();
    }

    /// <summary>
    /// Interface for synchronized data sources
    /// </summary>
    public interface ISynchronizedDataSource
    {
        void UpdateData(SynchronizedTestData data);
        SynchronizedTestData GetData(string syncId);
    }

    /// <summary>
    /// System error data structure
    /// </summary>
    public class SystemError
    {
        public string SystemId;
        public string Message;
        public Exception Exception;
        public DateTime Timestamp;
        public ErrorSeverity Severity;
    }

    /// <summary>
    /// Error severity enumeration
    /// </summary>
    public enum ErrorSeverity
    {
        Info,
        Warning,
        Error,
        Critical
    }

    #endregion
}
```

## Success Criteria

This Unity Integration Testing and Quality Assurance Task provides:

- **Comprehensive Integration Testing Framework**: Complete infrastructure for cross-system validation and end-to-end testing
- **System Communication Validation**: Tests for component interactions, service dependencies, and event propagation
- **Data Flow Integrity Testing**: Validation of data flow chains, synchronization, and integrity across system boundaries
- **Performance Impact Analysis**: Monitoring and validation of system performance under integration scenarios
- **Error Handling and Recovery Testing**: Comprehensive error propagation and system recovery validation
- **Automated Quality Assurance**: Continuous validation of system integration health and reliability
- **Test Infrastructure Management**: Robust setup, teardown, and resource management for reliable test execution
- **Performance Monitoring**: Real-time performance tracking during integration testing scenarios
- **Configurable Test Scenarios**: Flexible test configuration supporting various integration testing requirements
- **Production-Ready Testing**: Enterprise-grade testing patterns suitable for complex Unity applications

## Integration Points

This task integrates with:

- `playmode-tests.md` - Extends PlayMode testing with integration testing capabilities
- `interface-design.md` - Validates interface contracts and dependency injection patterns
- `component-architecture.md` - Tests component system interactions and lifecycle management
- `scriptableobject-setup.md` - Validates ScriptableObject-based data flow and configuration systems
- `editor-validation.md` - Provides runtime validation for editor tool integration

## Notes

This integration testing framework establishes a robust quality assurance foundation that validates system interactions, data flow integrity, and performance characteristics across Unity component boundaries. The framework supports both continuous integration scenarios and comprehensive system validation during development cycles.

The architecture provides scalable testing patterns that grow with project complexity while maintaining test reliability and execution performance essential for professional Unity development workflows.
