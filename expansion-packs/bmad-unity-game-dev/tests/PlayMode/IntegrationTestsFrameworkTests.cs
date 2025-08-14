// Assets/Tests/PlayMode/IntegrationTestsFrameworkTests.cs
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.SceneManagement;

namespace BMAD.Unity.Tests.PlayMode
{
    /// <summary>
    /// Comprehensive test suite for Integration Tests Framework
    /// Tests runtime integration testing, cross-system validation, and end-to-end workflows
    /// </summary>
    [TestFixture]
    public class IntegrationTestsFrameworkTests
    {
        private TestIntegrationRunner integrationRunner;
        private GameObject testManagerObject;
        private Scene testScene;

        [OneTimeSetUp]
        public void OneTimeSetup()
        {
            // Create test scene
            testScene = SceneManager.CreateScene("IntegrationTestScene");
            SceneManager.SetActiveScene(testScene);
        }

        [OneTimeTearDown] 
        public void OneTimeTearDown()
        {
            // Cleanup test scene
            if (testScene.IsValid())
            {
                SceneManager.UnloadSceneAsync(testScene);
            }
        }

        [SetUp]
        public void Setup()
        {
            // Create integration test runner
            testManagerObject = new GameObject("Integration Test Manager");
            SceneManager.MoveGameObjectToScene(testManagerObject, testScene);
            
            integrationRunner = testManagerObject.AddComponent<TestIntegrationRunner>();
            integrationRunner.Initialize();
        }

        [TearDown]
        public void TearDown()
        {
            // Cleanup test objects
            if (testManagerObject != null)
            {
                UnityEngine.Object.DestroyImmediate(testManagerObject);
            }
        }

        #region Integration Runner Tests

        [Test]
        public void IntegrationRunner_Initialize_SetsUpCorrectly()
        {
            // Assert
            Assert.IsTrue(integrationRunner.IsInitialized, "Integration runner should be initialized");
            Assert.AreEqual(IntegrationState.Ready, integrationRunner.State, "Should be in Ready state");
            Assert.IsNotNull(integrationRunner.TestSuites, "Test suites should be available");
        }

        [UnityTest]
        public IEnumerator IntegrationRunner_RunTestSuite_ExecutesAllTests()
        {
            // Arrange
            var testSuite = new TestIntegrationSuite("BasicSuite");
            testSuite.AddTest(new TestIntegrationTest("Test1", () => true));
            testSuite.AddTest(new TestIntegrationTest("Test2", () => true));
            testSuite.AddTest(new TestIntegrationTest("Test3", () => true));
            
            integrationRunner.RegisterTestSuite(testSuite);

            bool completed = false;
            IntegrationTestResult result = null;

            // Act
            integrationRunner.RunTestSuite("BasicSuite", (testResult) =>
            {
                completed = true;
                result = testResult;
            });

            // Wait for completion
            yield return new WaitUntil(() => completed);

            // Assert
            Assert.IsTrue(completed, "Test suite should complete");
            Assert.IsNotNull(result, "Should return test result");
            Assert.IsTrue(result.Success, "All tests should pass");
            Assert.AreEqual(3, result.TestResults.Count, "Should execute all tests");
        }

        [UnityTest]
        public IEnumerator IntegrationRunner_RunFailingTest_HandlesFailureCorrectly()
        {
            // Arrange
            var testSuite = new TestIntegrationSuite("FailingSuite");
            testSuite.AddTest(new TestIntegrationTest("PassingTest", () => true));
            testSuite.AddTest(new TestIntegrationTest("FailingTest", () => false));
            
            integrationRunner.RegisterTestSuite(testSuite);

            bool completed = false;
            IntegrationTestResult result = null;

            // Act
            integrationRunner.RunTestSuite("FailingSuite", (testResult) =>
            {
                completed = true;
                result = testResult;
            });

            yield return new WaitUntil(() => completed);

            // Assert
            Assert.IsTrue(completed, "Test suite should complete");
            Assert.IsFalse(result.Success, "Suite should fail due to failing test");
            Assert.AreEqual(1, result.FailedTests.Count, "Should have one failed test");
            Assert.AreEqual("FailingTest", result.FailedTests[0].TestName, "Should identify correct failed test");
        }

        [UnityTest]
        public IEnumerator IntegrationRunner_RunAsyncTest_HandlesAsyncCorrectly()
        {
            // Arrange
            var testSuite = new TestIntegrationSuite("AsyncSuite");
            testSuite.AddTest(new TestAsyncIntegrationTest("AsyncTest", AsyncTestMethod));
            
            integrationRunner.RegisterTestSuite(testSuite);

            bool completed = false;
            IntegrationTestResult result = null;

            // Act
            integrationRunner.RunTestSuite("AsyncSuite", (testResult) =>
            {
                completed = true;
                result = testResult;
            });

            yield return new WaitUntil(() => completed);

            // Assert
            Assert.IsTrue(completed, "Async test suite should complete");
            Assert.IsTrue(result.Success, "Async test should pass");
        }

        private IEnumerator AsyncTestMethod()
        {
            yield return new WaitForSeconds(0.1f);
            // Test passes if we reach here without exception
        }

        #endregion

        #region Cross-System Integration Tests

        [UnityTest]
        public IEnumerator CrossSystemIntegration_ServiceCommunication_WorksCorrectly()
        {
            // Arrange
            var serviceA = testManagerObject.AddComponent<TestServiceA>();
            var serviceB = testManagerObject.AddComponent<TestServiceB>();
            
            serviceA.Initialize();
            serviceB.Initialize();

            // Act
            serviceA.SendMessage("Hello from A");
            yield return new WaitForSeconds(0.1f);

            // Assert
            Assert.IsTrue(serviceB.MessageReceived, "Service B should receive message from Service A");
            Assert.AreEqual("Hello from A", serviceB.LastMessage, "Message content should match");
        }

        [UnityTest]
        public IEnumerator CrossSystemIntegration_EventSystem_PropagatesEventsCorrectly()
        {
            // Arrange
            var eventSystem = testManagerObject.AddComponent<TestEventSystem>();
            var eventListener = testManagerObject.AddComponent<TestEventListener>();
            
            eventSystem.Initialize();
            eventListener.Initialize();
            eventListener.SubscribeToEvents(eventSystem);

            // Act
            eventSystem.TriggerEvent("TestEvent", "Test Data");
            yield return new WaitForEndOfFrame();

            // Assert
            Assert.IsTrue(eventListener.EventReceived, "Event listener should receive event");
            Assert.AreEqual("TestEvent", eventListener.LastEventType, "Event type should match");
            Assert.AreEqual("Test Data", eventListener.LastEventData, "Event data should match");
        }

        [UnityTest]
        public IEnumerator CrossSystemIntegration_StateManager_MaintainsConsistency()
        {
            // Arrange
            var stateManager = testManagerObject.AddComponent<TestStateManager>();
            var stateListener1 = testManagerObject.AddComponent<TestStateListener>();
            var stateListener2 = testManagerObject.AddComponent<TestStateListener>();
            
            stateManager.Initialize();
            stateListener1.Initialize(stateManager);
            stateListener2.Initialize(stateManager);

            // Act
            stateManager.ChangeState("NewState");
            yield return new WaitForEndOfFrame();

            // Assert
            Assert.AreEqual("NewState", stateManager.CurrentState, "State manager should update state");
            Assert.AreEqual("NewState", stateListener1.CurrentState, "Listener 1 should sync state");
            Assert.AreEqual("NewState", stateListener2.CurrentState, "Listener 2 should sync state");
        }

        #endregion

        #region Performance Integration Tests

        [UnityTest]
        public IEnumerator PerformanceIntegration_SystemStartup_CompletesWithinTimeLimit()
        {
            // Arrange
            var systems = new List<ITestSystem>();
            for (int i = 0; i < 10; i++)
            {
                var system = new TestSystem($"System{i}");
                systems.Add(system);
            }

            var startTime = Time.realtimeSinceStartup;

            // Act
            foreach (var system in systems)
            {
                system.Initialize();
            }

            yield return new WaitUntil(() => systems.All(s => s.IsInitialized));

            var endTime = Time.realtimeSinceStartup;
            var initializationTime = endTime - startTime;

            // Assert
            Assert.Less(initializationTime, 1.0f, "System startup should complete within 1 second");
            Assert.IsTrue(systems.All(s => s.IsInitialized), "All systems should be initialized");
        }

        [UnityTest]
        public IEnumerator PerformanceIntegration_FrameRate_MaintainsTargetFPS()
        {
            // Arrange
            var frameRateMonitor = testManagerObject.AddComponent<TestFrameRateMonitor>();
            frameRateMonitor.Initialize();

            var heavyLoad = testManagerObject.AddComponent<TestHeavyLoadSystem>();
            heavyLoad.Initialize();

            // Act - Run for a few seconds to measure frame rate
            yield return new WaitForSeconds(2.0f);

            // Assert
            var averageFPS = frameRateMonitor.GetAverageFPS();
            Assert.Greater(averageFPS, 30.0f, "Should maintain at least 30 FPS under load");
        }

        [UnityTest]
        public IEnumerator PerformanceIntegration_MemoryUsage_StaysWithinLimits()
        {
            // Arrange
            var memoryMonitor = testManagerObject.AddComponent<TestMemoryMonitor>();
            memoryMonitor.Initialize();
            var initialMemory = memoryMonitor.GetCurrentMemoryUsage();

            var memoryIntensiveSystem = testManagerObject.AddComponent<TestMemoryIntensiveSystem>();
            memoryIntensiveSystem.Initialize();

            // Act - Run operations that use memory
            for (int i = 0; i < 100; i++)
            {
                memoryIntensiveSystem.AllocateMemory();
                yield return null;
            }

            yield return new WaitForSeconds(1.0f);

            var finalMemory = memoryMonitor.GetCurrentMemoryUsage();
            var memoryIncrease = finalMemory - initialMemory;

            // Assert
            Assert.Less(memoryIncrease, 50.0f, "Memory increase should be less than 50MB");
        }

        #endregion

        #region End-to-End Workflow Tests

        [UnityTest]
        public IEnumerator EndToEndWorkflow_GameplayFlow_ExecutesCorrectly()
        {
            // Arrange
            var gameManager = testManagerObject.AddComponent<TestGameManager>();
            var player = testManagerObject.AddComponent<TestPlayer>();
            var ui = testManagerObject.AddComponent<TestUI>();
            
            gameManager.Initialize();
            player.Initialize();
            ui.Initialize();

            // Act - Simulate a complete gameplay flow
            gameManager.StartGame();
            yield return new WaitForSeconds(0.1f);

            player.StartMoving();
            yield return new WaitForSeconds(0.1f);

            player.InteractWithObject();
            yield return new WaitForSeconds(0.1f);

            gameManager.EndGame();
            yield return new WaitForSeconds(0.1f);

            // Assert
            Assert.IsTrue(gameManager.GameStarted, "Game should start");
            Assert.IsTrue(player.IsMoving || player.HasMoved, "Player should move");
            Assert.IsTrue(player.HasInteracted, "Player should interact");
            Assert.IsTrue(gameManager.GameEnded, "Game should end");
            Assert.IsTrue(ui.IsDisplayingResults, "UI should display results");
        }

        [UnityTest]
        public IEnumerator EndToEndWorkflow_SaveLoadSystem_PreservesGameState()
        {
            // Arrange
            var saveSystem = testManagerObject.AddComponent<TestSaveSystem>();
            var gameState = testManagerObject.AddComponent<TestGameState>();
            
            saveSystem.Initialize();
            gameState.Initialize();

            // Set initial state
            gameState.PlayerLevel = 5;
            gameState.PlayerScore = 1000;
            gameState.PlayerName = "TestPlayer";

            // Act - Save game state
            saveSystem.SaveGame(gameState);
            yield return new WaitForSeconds(0.1f);

            // Modify state
            gameState.PlayerLevel = 10;
            gameState.PlayerScore = 2000;
            gameState.PlayerName = "ModifiedPlayer";

            // Load game state
            saveSystem.LoadGame(gameState);
            yield return new WaitForSeconds(0.1f);

            // Assert
            Assert.AreEqual(5, gameState.PlayerLevel, "Player level should be restored");
            Assert.AreEqual(1000, gameState.PlayerScore, "Player score should be restored");
            Assert.AreEqual("TestPlayer", gameState.PlayerName, "Player name should be restored");
        }

        #endregion

        #region Error Handling Tests

        [UnityTest]
        public IEnumerator ErrorHandling_SystemFailure_HandlesGracefully()
        {
            // Arrange
            var errorProneSystem = testManagerObject.AddComponent<TestErrorProneSystem>();
            var errorHandler = testManagerObject.AddComponent<TestErrorHandler>();
            
            errorHandler.Initialize();
            errorProneSystem.Initialize(errorHandler);

            bool errorHandled = false;
            errorHandler.OnErrorHandled += () => errorHandled = true;

            // Act - Trigger system failure
            errorProneSystem.TriggerError();
            yield return new WaitForSeconds(0.1f);

            // Assert
            Assert.IsTrue(errorHandled, "Error should be handled gracefully");
            Assert.IsTrue(errorProneSystem.HasRecovered, "System should recover from error");
        }

        [UnityTest]
        public IEnumerator ErrorHandling_NetworkFailure_FallsBackCorrectly()
        {
            // Arrange
            var networkSystem = testManagerObject.AddComponent<TestNetworkSystem>();
            var fallbackSystem = testManagerObject.AddComponent<TestFallbackSystem>();
            
            networkSystem.Initialize();
            fallbackSystem.Initialize();
            networkSystem.SetFallbackSystem(fallbackSystem);

            // Act - Simulate network failure
            networkSystem.SimulateNetworkFailure();
            yield return new WaitForSeconds(0.1f);

            // Assert
            Assert.IsTrue(networkSystem.HasFailed, "Network system should detect failure");
            Assert.IsTrue(fallbackSystem.IsActive, "Fallback system should be activated");
        }

        #endregion
    }

    #region Test Implementation Classes

    // Integration test framework classes
    public enum IntegrationState { Uninitialized, Loading, Ready, Running, Error }

    public class TestIntegrationRunner : MonoBehaviour
    {
        public bool IsInitialized { get; private set; }
        public IntegrationState State { get; private set; }
        public List<TestIntegrationSuite> TestSuites { get; private set; }

        public void Initialize()
        {
            IsInitialized = true;
            State = IntegrationState.Ready;
            TestSuites = new List<TestIntegrationSuite>();
        }

        public void RegisterTestSuite(TestIntegrationSuite testSuite)
        {
            TestSuites.Add(testSuite);
        }

        public void RunTestSuite(string suiteName, Action<IntegrationTestResult> onComplete)
        {
            StartCoroutine(RunTestSuiteCoroutine(suiteName, onComplete));
        }

        private IEnumerator RunTestSuiteCoroutine(string suiteName, Action<IntegrationTestResult> onComplete)
        {
            State = IntegrationState.Running;
            
            var suite = TestSuites.FirstOrDefault(s => s.Name == suiteName);
            if (suite == null)
            {
                onComplete?.Invoke(new IntegrationTestResult { Success = false });
                yield break;
            }

            var result = new IntegrationTestResult { Success = true };
            
            foreach (var test in suite.Tests)
            {
                var testResult = new TestResult { TestName = test.Name };
                
                try
                {
                    if (test is TestAsyncIntegrationTest asyncTest)
                    {
                        yield return StartCoroutine(asyncTest.ExecuteAsync());
                        testResult.Success = true;
                    }
                    else
                    {
                        testResult.Success = test.Execute();
                    }
                }
                catch (Exception ex)
                {
                    testResult.Success = false;
                    testResult.ErrorMessage = ex.Message;
                }

                result.TestResults.Add(testResult);
                
                if (!testResult.Success)
                {
                    result.Success = false;
                    result.FailedTests.Add(testResult);
                }

                yield return null;
            }

            State = IntegrationState.Ready;
            onComplete?.Invoke(result);
        }
    }

    // Test classes and interfaces
    public class TestIntegrationSuite
    {
        public string Name { get; }
        public List<IIntegrationTest> Tests { get; }

        public TestIntegrationSuite(string name)
        {
            Name = name;
            Tests = new List<IIntegrationTest>();
        }

        public void AddTest(IIntegrationTest test)
        {
            Tests.Add(test);
        }
    }

    public interface IIntegrationTest
    {
        string Name { get; }
        bool Execute();
    }

    public class TestIntegrationTest : IIntegrationTest
    {
        public string Name { get; }
        private readonly Func<bool> testMethod;

        public TestIntegrationTest(string name, Func<bool> testMethod)
        {
            Name = name;
            this.testMethod = testMethod;
        }

        public bool Execute()
        {
            return testMethod?.Invoke() ?? false;
        }
    }

    public class TestAsyncIntegrationTest : IIntegrationTest
    {
        public string Name { get; }
        private readonly Func<IEnumerator> asyncTestMethod;

        public TestAsyncIntegrationTest(string name, Func<IEnumerator> asyncTestMethod)
        {
            Name = name;
            this.asyncTestMethod = asyncTestMethod;
        }

        public bool Execute()
        {
            // Synchronous execution not supported for async tests
            return false;
        }

        public IEnumerator ExecuteAsync()
        {
            if (asyncTestMethod != null)
            {
                yield return asyncTestMethod();
            }
        }
    }

    public class IntegrationTestResult
    {
        public bool Success { get; set; }
        public List<TestResult> TestResults { get; set; } = new List<TestResult>();
        public List<TestResult> FailedTests { get; set; } = new List<TestResult>();
        public string ErrorMessage { get; set; }
    }

    public class TestResult
    {
        public string TestName { get; set; }
        public bool Success { get; set; }
        public string ErrorMessage { get; set; }
        public float ExecutionTime { get; set; }
    }

    // Test service classes
    public class TestServiceA : MonoBehaviour
    {
        public void Initialize() { }

        public void SendMessage(string message)
        {
            var serviceB = FindObjectOfType<TestServiceB>();
            serviceB?.ReceiveMessage(message);
        }
    }

    public class TestServiceB : MonoBehaviour
    {
        public bool MessageReceived { get; private set; }
        public string LastMessage { get; private set; }

        public void Initialize() { }

        public void ReceiveMessage(string message)
        {
            MessageReceived = true;
            LastMessage = message;
        }
    }

    // Test event system
    public class TestEventSystem : MonoBehaviour
    {
        public event Action<string, object> OnEventTriggered;

        public void Initialize() { }

        public void TriggerEvent(string eventType, object data)
        {
            OnEventTriggered?.Invoke(eventType, data);
        }
    }

    public class TestEventListener : MonoBehaviour
    {
        public bool EventReceived { get; private set; }
        public string LastEventType { get; private set; }
        public object LastEventData { get; private set; }

        public void Initialize() { }

        public void SubscribeToEvents(TestEventSystem eventSystem)
        {
            eventSystem.OnEventTriggered += OnEventReceived;
        }

        private void OnEventReceived(string eventType, object data)
        {
            EventReceived = true;
            LastEventType = eventType;
            LastEventData = data;
        }
    }

    // Test state management
    public class TestStateManager : MonoBehaviour
    {
        public string CurrentState { get; private set; } = "Initial";
        public event Action<string> OnStateChanged;

        public void Initialize() { }

        public void ChangeState(string newState)
        {
            CurrentState = newState;
            OnStateChanged?.Invoke(newState);
        }
    }

    public class TestStateListener : MonoBehaviour
    {
        public string CurrentState { get; private set; } = "Initial";
        private TestStateManager stateManager;

        public void Initialize(TestStateManager manager)
        {
            stateManager = manager;
            stateManager.OnStateChanged += OnStateChanged;
        }

        private void OnStateChanged(string newState)
        {
            CurrentState = newState;
        }
    }

    // Test system interfaces and implementations
    public interface ITestSystem
    {
        bool IsInitialized { get; }
        void Initialize();
    }

    public class TestSystem : ITestSystem
    {
        public bool IsInitialized { get; private set; }
        public string Name { get; }

        public TestSystem(string name)
        {
            Name = name;
        }

        public void Initialize()
        {
            IsInitialized = true;
        }
    }

    // Performance monitoring classes
    public class TestFrameRateMonitor : MonoBehaviour
    {
        private List<float> frameTimes = new List<float>();
        private float lastTime;

        public void Initialize()
        {
            lastTime = Time.realtimeSinceStartup;
        }

        private void Update()
        {
            float currentTime = Time.realtimeSinceStartup;
            float deltaTime = currentTime - lastTime;
            frameTimes.Add(deltaTime);
            lastTime = currentTime;

            // Keep only recent frame times
            if (frameTimes.Count > 60)
            {
                frameTimes.RemoveAt(0);
            }
        }

        public float GetAverageFPS()
        {
            if (frameTimes.Count == 0) return 0;
            float averageFrameTime = frameTimes.Average();
            return 1.0f / averageFrameTime;
        }
    }

    public class TestHeavyLoadSystem : MonoBehaviour
    {
        public void Initialize() { }

        private void Update()
        {
            // Simulate heavy computation
            for (int i = 0; i < 1000; i++)
            {
                Vector3.Distance(Vector3.zero, Vector3.one);
            }
        }
    }

    public class TestMemoryMonitor : MonoBehaviour
    {
        public void Initialize() { }

        public float GetCurrentMemoryUsage()
        {
            return UnityEngine.Profiling.Profiler.GetTotalAllocatedMemory(false) / (1024 * 1024);
        }
    }

    public class TestMemoryIntensiveSystem : MonoBehaviour
    {
        private List<byte[]> memoryBlocks = new List<byte[]>();

        public void Initialize() { }

        public void AllocateMemory()
        {
            // Allocate 1MB blocks
            byte[] block = new byte[1024 * 1024];
            memoryBlocks.Add(block);
        }
    }

    // Gameplay system test classes
    public class TestGameManager : MonoBehaviour
    {
        public bool GameStarted { get; private set; }
        public bool GameEnded { get; private set; }

        public void Initialize() { }

        public void StartGame()
        {
            GameStarted = true;
        }

        public void EndGame()
        {
            GameEnded = true;
            var ui = FindObjectOfType<TestUI>();
            ui?.ShowResults();
        }
    }

    public class TestPlayer : MonoBehaviour
    {
        public bool IsMoving { get; private set; }
        public bool HasMoved { get; private set; }
        public bool HasInteracted { get; private set; }

        public void Initialize() { }

        public void StartMoving()
        {
            IsMoving = true;
            HasMoved = true;
        }

        public void InteractWithObject()
        {
            HasInteracted = true;
        }
    }

    public class TestUI : MonoBehaviour
    {
        public bool IsDisplayingResults { get; private set; }

        public void Initialize() { }

        public void ShowResults()
        {
            IsDisplayingResults = true;
        }
    }

    // Save/Load system test classes
    public class TestSaveSystem : MonoBehaviour
    {
        private Dictionary<string, object> savedData = new Dictionary<string, object>();

        public void Initialize() { }

        public void SaveGame(TestGameState gameState)
        {
            savedData["PlayerLevel"] = gameState.PlayerLevel;
            savedData["PlayerScore"] = gameState.PlayerScore;
            savedData["PlayerName"] = gameState.PlayerName;
        }

        public void LoadGame(TestGameState gameState)
        {
            if (savedData.ContainsKey("PlayerLevel"))
            {
                gameState.PlayerLevel = (int)savedData["PlayerLevel"];
                gameState.PlayerScore = (int)savedData["PlayerScore"];
                gameState.PlayerName = (string)savedData["PlayerName"];
            }
        }
    }

    public class TestGameState : MonoBehaviour
    {
        public int PlayerLevel { get; set; }
        public int PlayerScore { get; set; }
        public string PlayerName { get; set; }

        public void Initialize() { }
    }

    // Error handling test classes
    public class TestErrorHandler : MonoBehaviour
    {
        public event Action OnErrorHandled;

        public void Initialize() { }

        public void HandleError(Exception error)
        {
            OnErrorHandled?.Invoke();
        }
    }

    public class TestErrorProneSystem : MonoBehaviour
    {
        public bool HasRecovered { get; private set; }
        private TestErrorHandler errorHandler;

        public void Initialize(TestErrorHandler handler)
        {
            errorHandler = handler;
        }

        public void TriggerError()
        {
            try
            {
                throw new InvalidOperationException("Test error");
            }
            catch (Exception ex)
            {
                errorHandler?.HandleError(ex);
                HasRecovered = true;
            }
        }
    }

    public class TestNetworkSystem : MonoBehaviour
    {
        public bool HasFailed { get; private set; }
        private TestFallbackSystem fallbackSystem;

        public void Initialize() { }

        public void SetFallbackSystem(TestFallbackSystem fallback)
        {
            fallbackSystem = fallback;
        }

        public void SimulateNetworkFailure()
        {
            HasFailed = true;
            fallbackSystem?.Activate();
        }
    }

    public class TestFallbackSystem : MonoBehaviour
    {
        public bool IsActive { get; private set; }

        public void Initialize() { }

        public void Activate()
        {
            IsActive = true;
        }
    }

    #endregion
}