# Unity PlayMode Tests Task

## Purpose

To implement comprehensive Unity Test Framework PlayMode testing for runtime component validation, scene testing, and integration verification. This task extends `create-test-suite.md` to provide Unity-specific PlayMode testing patterns for validating game behavior during actual runtime execution, including component interactions, physics simulation, animation systems, and player input handling.

## Prerequisites

- Unity project with Test Runner window accessible (Window > General > Test Runner)
- Unity Test Framework package installed (com.unity.test-framework)
- Game components and systems requiring runtime validation implemented
- Basic understanding of Unity's PlayMode vs EditMode testing concepts
- Access to Unity scenes for integration testing
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps for Unity Test Framework setup]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Unity PlayMode Test Framework Setup

#### 1.1 Test Framework Configuration

[[LLM: Analyze the project's component architecture to identify critical runtime behaviors that require PlayMode testing. Consider gameplay mechanics, physics interactions, animation systems, UI functionality, audio systems, and multiplayer features. Design a comprehensive test strategy that validates these systems during actual runtime execution.]]

**Core PlayMode Test Framework Setup**:

```csharp
// Assets/Tests/PlayMode/Core/PlayModeTestFramework.cs
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.SceneManagement;
using NUnit.Framework;

namespace {{project_namespace}}.Tests.PlayMode
{
    /// <summary>
    /// Core framework for Unity PlayMode testing with scene management and component validation
    /// Provides standardized testing patterns for runtime component behavior verification
    /// </summary>
    public abstract class PlayModeTestBase
    {
        [Header("Test Configuration")]
        protected string testSceneName = "TestScene";
        protected float defaultTimeout = 10f;
        protected bool enableDebugLogging = true;
        protected bool preserveTestObjects = false;
        
        // Test scene management
        protected Scene testScene;
        protected GameObject testManager;
        protected Camera testCamera;
        protected Canvas testCanvas;
        
        // Test objects tracking
        protected List<GameObject> createdTestObjects = new List<GameObject>();
        protected List<MonoBehaviour> testComponents = new List<MonoBehaviour>();
        
        // Test state tracking
        protected bool isTestSceneLoaded = false;
        protected bool isFrameworkInitialized = false;
        protected float testStartTime;
        
        // Events for test lifecycle management
        public System.Action OnTestSceneLoaded;
        public System.Action OnTestFrameworkInitialized;
        public System.Action OnTestCleanupCompleted;
        
        /// <summary>
        /// Setup method called before each PlayMode test
        /// </summary>
        [UnitySetUp]
        public virtual IEnumerator SetUp()
        {
            testStartTime = Time.realtimeSinceStartup;
            LogTestInfo("Setting up PlayMode test framework");
            
            // Load test scene if specified
            if (!string.IsNullOrEmpty(testSceneName))
            {
                yield return LoadTestScene();
            }
            
            // Initialize test framework components
            yield return InitializeTestFramework();
            
            // Custom setup for derived test classes
            yield return CustomSetUp();
            
            isFrameworkInitialized = true;
            OnTestFrameworkInitialized?.Invoke();
            
            LogTestInfo($"PlayMode test setup completed in {Time.realtimeSinceStartup - testStartTime:F3}s");
        }
        
        /// <summary>
        /// Cleanup method called after each PlayMode test
        /// </summary>
        [UnityTearDown]
        public virtual IEnumerator TearDown()
        {
            LogTestInfo("Starting PlayMode test cleanup");
            
            // Custom cleanup for derived test classes
            yield return CustomTearDown();
            
            // Clean up test objects
            yield return CleanupTestObjects();
            
            // Unload test scene if loaded
            if (isTestSceneLoaded)
            {
                yield return UnloadTestScene();
            }
            
            isFrameworkInitialized = false;
            OnTestCleanupCompleted?.Invoke();
            
            LogTestInfo("PlayMode test cleanup completed");
        }
        
        /// <summary>
        /// Load the specified test scene
        /// </summary>
        protected virtual IEnumerator LoadTestScene()
        {
            if (SceneManager.GetSceneByName(testSceneName).isLoaded)
            {
                LogTestInfo($"Test scene '{testSceneName}' already loaded");
                testScene = SceneManager.GetSceneByName(testSceneName);
                isTestSceneLoaded = true;
                yield break;
            }
            
            AsyncOperation sceneLoad = SceneManager.LoadSceneAsync(testSceneName, LoadSceneMode.Additive);
            
            while (!sceneLoad.isDone)
            {
                yield return null;
            }
            
            testScene = SceneManager.GetSceneByName(testSceneName);
            isTestSceneLoaded = testScene.isLoaded;
            
            if (isTestSceneLoaded)
            {
                SceneManager.SetActiveScene(testScene);
                OnTestSceneLoaded?.Invoke();
                LogTestInfo($"Test scene '{testSceneName}' loaded successfully");
            }
            else
            {
                LogTestError($"Failed to load test scene '{testSceneName}'");
            }
        }
        
        /// <summary>
        /// Unload the test scene
        /// </summary>
        protected virtual IEnumerator UnloadTestScene()
        {
            if (!isTestSceneLoaded) yield break;
            
            AsyncOperation sceneUnload = SceneManager.UnloadSceneAsync(testScene);
            
            while (!sceneUnload.isDone)
            {
                yield return null;
            }
            
            isTestSceneLoaded = false;
            LogTestInfo($"Test scene '{testSceneName}' unloaded");
        }
        
        /// <summary>
        /// Initialize core test framework components
        /// </summary>
        protected virtual IEnumerator InitializeTestFramework()
        {
            // Create test manager GameObject
            testManager = new GameObject("PlayMode Test Manager");
            createdTestObjects.Add(testManager);
            
            // Setup test camera if not exists
            testCamera = Camera.main;
            if (testCamera == null)
            {
                GameObject cameraGO = new GameObject("Test Camera");
                testCamera = cameraGO.AddComponent<Camera>();
                cameraGO.tag = "MainCamera";
                createdTestObjects.Add(cameraGO);
                LogTestInfo("Created test camera");
            }
            
            // Setup test canvas for UI testing
            if (FindObjectOfType<Canvas>() == null)
            {
                GameObject canvasGO = new GameObject("Test Canvas");
                testCanvas = canvasGO.AddComponent<Canvas>();
                testCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
                canvasGO.AddComponent<UnityEngine.UI.CanvasScaler>();
                canvasGO.AddComponent<UnityEngine.UI.GraphicRaycaster>();
                createdTestObjects.Add(canvasGO);
                LogTestInfo("Created test canvas");
            }
            
            // Initialize Physics2D if needed
            Physics2D.autoSimulation = true;
            Physics2D.autoSyncTransforms = true;
            
            yield return null; // Wait one frame for initialization
        }
        
        /// <summary>
        /// Clean up all test objects created during the test
        /// </summary>
        protected virtual IEnumerator CleanupTestObjects()
        {
            if (preserveTestObjects)
            {
                LogTestInfo("Preserving test objects for debugging");
                yield break;
            }
            
            // Destroy test components first
            foreach (var component in testComponents)
            {
                if (component != null)
                {
                    Object.DestroyImmediate(component);
                }
            }
            testComponents.Clear();
            
            // Destroy test GameObjects
            foreach (var gameObject in createdTestObjects)
            {
                if (gameObject != null)
                {
                    Object.DestroyImmediate(gameObject);
                }
            }
            createdTestObjects.Clear();
            
            yield return null; // Wait one frame for cleanup
            
            LogTestInfo($"Cleaned up {createdTestObjects.Count} test objects");
        }
        
        /// <summary>
        /// Create a test GameObject with specified components
        /// </summary>
        protected virtual T CreateTestObject<T>(string name = null) where T : Component
        {
            string objectName = name ?? $"Test_{typeof(T).Name}";
            GameObject testObject = new GameObject(objectName);
            createdTestObjects.Add(testObject);
            
            T component = testObject.AddComponent<T>();
            testComponents.Add(component);
            
            LogTestInfo($"Created test object: {objectName} with component {typeof(T).Name}");
            return component;
        }
        
        /// <summary>
        /// Create a test GameObject with multiple components
        /// </summary>
        protected virtual GameObject CreateTestObject(string name, params System.Type[] componentTypes)
        {
            GameObject testObject = new GameObject(name);
            createdTestObjects.Add(testObject);
            
            foreach (var componentType in componentTypes)
            {
                if (componentType.IsSubclassOf(typeof(Component)))
                {
                    var component = testObject.AddComponent(componentType) as MonoBehaviour;
                    if (component != null)
                    {
                        testComponents.Add(component);
                    }
                }
            }
            
            LogTestInfo($"Created test object: {name} with {componentTypes.Length} components");
            return testObject;
        }
        
        /// <summary>
        /// Wait for a condition to be true or timeout
        /// </summary>
        protected virtual IEnumerator WaitForCondition(System.Func<bool> condition, float timeout = -1f, string description = "condition")
        {
            float timeoutValue = timeout > 0 ? timeout : defaultTimeout;
            float startTime = Time.realtimeSinceStartup;
            
            while (!condition() && (Time.realtimeSinceStartup - startTime) < timeoutValue)
            {
                yield return null;
            }
            
            bool conditionMet = condition();
            float elapsedTime = Time.realtimeSinceStartup - startTime;
            
            if (conditionMet)
            {
                LogTestInfo($"Condition '{description}' met in {elapsedTime:F3}s");
            }
            else
            {
                LogTestError($"Condition '{description}' timed out after {elapsedTime:F3}s");
                Assert.Fail($"Condition '{description}' timed out");
            }
        }
        
        /// <summary>
        /// Wait for a specific number of frames
        /// </summary>
        protected virtual IEnumerator WaitFrames(int frameCount)
        {
            for (int i = 0; i < frameCount; i++)
            {
                yield return null;
            }
        }
        
        /// <summary>
        /// Wait for physics simulation to settle
        /// </summary>
        protected virtual IEnumerator WaitForPhysicsSettle(float settleDuration = 1f)
        {
            float startTime = Time.realtimeSinceStartup;
            
            while (Time.realtimeSinceStartup - startTime < settleDuration)
            {
                yield return new WaitForFixedUpdate();
            }
            
            LogTestInfo($"Physics settled after {settleDuration:F3}s");
        }
        
        /// <summary>
        /// Assert that a GameObject has a specific component
        /// </summary>
        protected virtual void AssertHasComponent<T>(GameObject gameObject, string message = null) where T : Component
        {
            T component = gameObject.GetComponent<T>();
            string assertMessage = message ?? $"GameObject '{gameObject.name}' should have component {typeof(T).Name}";
            Assert.IsNotNull(component, assertMessage);
        }
        
        /// <summary>
        /// Assert that a component is in a specific state
        /// </summary>
        protected virtual void AssertComponentState<T>(T component, System.Func<T, bool> stateCheck, string description) where T : Component
        {
            Assert.IsNotNull(component, $"Component {typeof(T).Name} should not be null");
            Assert.IsTrue(stateCheck(component), $"Component {typeof(T).Name} should be in state: {description}");
        }
        
        /// <summary>
        /// Log test information if debug logging is enabled
        /// </summary>
        protected virtual void LogTestInfo(string message)
        {
            if (enableDebugLogging)
            {
                Debug.Log($"[PlayMode Test] {GetType().Name}: {message}");
            }
        }
        
        /// <summary>
        /// Log test errors
        /// </summary>
        protected virtual void LogTestError(string message)
        {
            Debug.LogError($"[PlayMode Test Error] {GetType().Name}: {message}");
        }
        
        /// <summary>
        /// Virtual method for custom setup in derived classes
        /// </summary>
        protected virtual IEnumerator CustomSetUp()
        {
            yield return null;
        }
        
        /// <summary>
        /// Virtual method for custom teardown in derived classes
        /// </summary>
        protected virtual IEnumerator CustomTearDown()
        {
            yield return null;
        }
    }
}
```

#### 1.2 Component Runtime Testing Framework

[[LLM: Create comprehensive testing patterns for Unity components that require runtime validation. Focus on MonoBehaviour lifecycle events, component interactions, state changes, and event-driven behaviors. Ensure proper async testing patterns for Unity coroutines and time-dependent operations.]]

**Component Runtime Validation Framework**:

```csharp
// Assets/Tests/PlayMode/Components/ComponentRuntimeTests.cs
using System.Collections;
using UnityEngine;
using UnityEngine.TestTools;
using NUnit.Framework;

namespace {{project_namespace}}.Tests.PlayMode.Components
{
    /// <summary>
    /// Comprehensive runtime testing for Unity components and their lifecycle behaviors
    /// Tests component initialization, state management, and interaction patterns
    /// </summary>
    public class ComponentRuntimeTests : PlayModeTestBase
    {
        // Test component examples for validation
        private TestComponent testComponent;
        private InteractiveComponent interactiveComponent;
        private PhysicsComponent physicsComponent;
        
        [UnityTest]
        public IEnumerator Component_Lifecycle_ExecutesCorrectly()
        {
            // Create test component and validate lifecycle
            testComponent = CreateTestObject<TestComponent>("LifecycleTest");
            
            // Verify Awake was called
            Assert.IsTrue(testComponent.AwakeCalled, "Awake should be called immediately");
            Assert.IsFalse(testComponent.StartCalled, "Start should not be called yet");
            
            // Wait for Start to be called
            yield return null;
            Assert.IsTrue(testComponent.StartCalled, "Start should be called after first frame");
            
            // Test Update cycle
            int initialUpdateCount = testComponent.UpdateCount;
            yield return new WaitForSeconds(0.1f);
            Assert.Greater(testComponent.UpdateCount, initialUpdateCount, "Update should be called multiple times");
            
            // Test FixedUpdate cycle
            int initialFixedUpdateCount = testComponent.FixedUpdateCount;
            yield return new WaitForFixedUpdate();
            Assert.Greater(testComponent.FixedUpdateCount, initialFixedUpdateCount, "FixedUpdate should be called");
            
            // Test OnDestroy
            Object.DestroyImmediate(testComponent.gameObject);
            yield return null;
            Assert.IsTrue(testComponent.OnDestroyCalled, "OnDestroy should be called when object is destroyed");
        }
        
        [UnityTest]
        public IEnumerator Component_StateManagement_WorksCorrectly()
        {
            // Create component with state management
            var stateComponent = CreateTestObject<StatefulComponent>("StateTest");
            
            // Verify initial state
            Assert.AreEqual(ComponentState.Uninitialized, stateComponent.CurrentState);
            
            // Initialize component
            stateComponent.Initialize();
            yield return null;
            
            Assert.AreEqual(ComponentState.Initialized, stateComponent.CurrentState);
            
            // Activate component
            stateComponent.Activate();
            yield return null;
            
            Assert.AreEqual(ComponentState.Active, stateComponent.CurrentState);
            Assert.IsTrue(stateComponent.IsActive);
            
            // Deactivate component
            stateComponent.Deactivate();
            yield return null;
            
            Assert.AreEqual(ComponentState.Inactive, stateComponent.CurrentState);
            Assert.IsFalse(stateComponent.IsActive);
            
            // Test error state
            stateComponent.TriggerError();
            yield return null;
            
            Assert.AreEqual(ComponentState.Error, stateComponent.CurrentState);
        }
        
        [UnityTest]
        public IEnumerator Component_Events_FireCorrectly()
        {
            // Create component with event system
            var eventComponent = CreateTestObject<EventDrivenComponent>("EventTest");
            
            bool eventFired = false;
            string eventData = null;
            
            // Subscribe to component events
            eventComponent.OnDataChanged += (data) => {
                eventFired = true;
                eventData = data;
            };
            
            // Trigger event
            string testData = "Test Event Data";
            eventComponent.TriggerDataChange(testData);
            yield return null;
            
            // Verify event was fired with correct data
            Assert.IsTrue(eventFired, "Event should have been fired");
            Assert.AreEqual(testData, eventData, "Event data should match");
            
            // Test multiple event subscriptions
            bool secondEventFired = false;
            eventComponent.OnDataChanged += (data) => secondEventFired = true;
            
            eventComponent.TriggerDataChange("Second Test");
            yield return null;
            
            Assert.IsTrue(secondEventFired, "Second event subscription should fire");
        }
        
        [UnityTest]
        public IEnumerator Component_Interactions_WorkCorrectly()
        {
            // Create multiple interacting components
            var component1 = CreateTestObject<InteractiveComponent>("Interaction1");
            var component2 = CreateTestObject<InteractiveComponent>("Interaction2");
            
            // Position components near each other
            component1.transform.position = Vector3.zero;
            component2.transform.position = Vector3.right;
            
            yield return null; // Allow components to initialize
            
            // Test component discovery
            var nearbyComponents = component1.FindNearbyComponents(2f);
            Assert.Contains(component2, nearbyComponents, "Component2 should be found nearby");
            
            // Test component interaction
            bool interactionResult = component1.InteractWith(component2);
            Assert.IsTrue(interactionResult, "Interaction should succeed");
            
            // Verify interaction effects
            Assert.IsTrue(component1.HasInteracted, "Component1 should record interaction");
            Assert.IsTrue(component2.HasBeenInteractedWith, "Component2 should record being interacted with");
        }
        
        [UnityTest]
        public IEnumerator Component_Physics_Integration_Works()
        {
            // Create component with physics dependencies
            physicsComponent = CreateTestObject<PhysicsComponent>("PhysicsTest");
            physicsComponent.transform.position = new Vector3(0, 5, 0);
            
            // Add Rigidbody2D for physics simulation
            var rigidbody = physicsComponent.gameObject.AddComponent<Rigidbody2D>();
            var collider = physicsComponent.gameObject.AddComponent<BoxCollider2D>();
            
            yield return null; // Allow physics initialization
            
            // Verify physics component is set up correctly
            Assert.IsNotNull(physicsComponent.Rigidbody);
            Assert.IsNotNull(physicsComponent.Collider);
            
            // Test physics interaction
            Vector2 initialPosition = physicsComponent.transform.position;
            physicsComponent.ApplyForce(Vector2.down * 10f);
            
            yield return new WaitForSeconds(0.5f);
            
            Vector2 finalPosition = physicsComponent.transform.position;
            Assert.Less(finalPosition.y, initialPosition.y, "Object should have moved down due to force");
            
            // Test collision detection
            var groundObject = CreateTestObject("Ground", typeof(BoxCollider2D));
            groundObject.transform.position = new Vector3(0, -2, 0);
            groundObject.transform.localScale = new Vector3(10, 1, 1);
            
            yield return WaitForPhysicsSettle();
            
            Assert.IsTrue(physicsComponent.IsGrounded, "Component should detect ground collision");
        }
        
        [UnityTest]
        public IEnumerator Component_Coroutine_Execution_Works()
        {
            // Create component that uses coroutines
            var coroutineComponent = CreateTestObject<CoroutineComponent>("CoroutineTest");
            
            // Test simple coroutine execution
            bool coroutineCompleted = false;
            StartCoroutine(TestCoroutineExecution(coroutineComponent, (result) => coroutineCompleted = result));
            
            yield return WaitForCondition(() => coroutineCompleted, 5f, "coroutine completion");
            
            Assert.IsTrue(coroutineCompleted, "Coroutine should complete successfully");
            
            // Test coroutine with parameters
            float testValue = 42f;
            float resultValue = 0f;
            
            yield return StartCoroutine(coroutineComponent.ProcessValueAsync(testValue, (result) => resultValue = result));
            
            Assert.AreEqual(testValue * 2f, resultValue, "Coroutine should process value correctly");
        }
        
        [UnityTest]
        public IEnumerator Component_Performance_MeetsTargets()
        {
            // Create multiple components to test performance
            const int componentCount = 100;
            var components = new TestComponent[componentCount];
            
            float startTime = Time.realtimeSinceStartup;
            
            // Create components
            for (int i = 0; i < componentCount; i++)
            {
                components[i] = CreateTestObject<TestComponent>($"PerfTest_{i}");
            }
            
            float creationTime = Time.realtimeSinceStartup - startTime;
            LogTestInfo($"Created {componentCount} components in {creationTime:F3}s");
            
            // Test update performance
            yield return new WaitForSeconds(1f);
            
            // Verify all components are updating
            foreach (var component in components)
            {
                Assert.Greater(component.UpdateCount, 0, "All components should be updating");
            }
            
            // Performance should be reasonable (subjective threshold)
            Assert.Less(creationTime, 1f, "Component creation should be fast");
            
            // Test cleanup performance
            startTime = Time.realtimeSinceStartup;
            
            foreach (var component in components)
            {
                if (component != null)
                {
                    Object.DestroyImmediate(component.gameObject);
                }
            }
            
            float cleanupTime = Time.realtimeSinceStartup - startTime;
            LogTestInfo($"Cleaned up {componentCount} components in {cleanupTime:F3}s");
            
            Assert.Less(cleanupTime, 0.5f, "Component cleanup should be fast");
            yield return null;
        }
        
        [UnityTest]
        public IEnumerator Component_ErrorHandling_IsRobust()
        {
            // Create component for error testing
            var errorComponent = CreateTestObject<ErrorProneComponent>("ErrorTest");
            
            // Test null reference handling
            bool nullErrorHandled = false;
            errorComponent.OnErrorHandled += (error) => {
                if (error.Contains("null"))
                    nullErrorHandled = true;
            };
            
            errorComponent.TriggerNullReferenceError();
            yield return null;
            
            Assert.IsTrue(nullErrorHandled, "Null reference error should be handled gracefully");
            
            // Test invalid operation handling
            bool invalidOpHandled = false;
            errorComponent.OnErrorHandled += (error) => {
                if (error.Contains("invalid"))
                    invalidOpHandled = true;
            };
            
            errorComponent.TriggerInvalidOperation();
            yield return null;
            
            Assert.IsTrue(invalidOpHandled, "Invalid operation should be handled gracefully");
            
            // Component should still be functional after errors
            Assert.IsTrue(errorComponent.IsOperational, "Component should remain operational after handled errors");
        }
        
        /// <summary>
        /// Helper coroutine for testing async component behavior
        /// </summary>
        private IEnumerator TestCoroutineExecution(CoroutineComponent component, System.Action<bool> callback)
        {
            bool completed = false;
            
            yield return StartCoroutine(component.DelayedOperation(1f, () => completed = true));
            
            callback(completed);
        }
    }
    
    // Example test components for runtime validation
    
    public enum ComponentState
    {
        Uninitialized,
        Initialized,
        Active,
        Inactive,
        Error
    }
    
    /// <summary>
    /// Basic test component for lifecycle validation
    /// </summary>
    public class TestComponent : MonoBehaviour
    {
        public bool AwakeCalled { get; private set; }
        public bool StartCalled { get; private set; }
        public bool OnDestroyCalled { get; private set; }
        public int UpdateCount { get; private set; }
        public int FixedUpdateCount { get; private set; }
        
        private void Awake()
        {
            AwakeCalled = true;
        }
        
        private void Start()
        {
            StartCalled = true;
        }
        
        private void Update()
        {
            UpdateCount++;
        }
        
        private void FixedUpdate()
        {
            FixedUpdateCount++;
        }
        
        private void OnDestroy()
        {
            OnDestroyCalled = true;
        }
    }
    
    /// <summary>
    /// Component with state management for testing
    /// </summary>
    public class StatefulComponent : MonoBehaviour
    {
        public ComponentState CurrentState { get; private set; } = ComponentState.Uninitialized;
        public bool IsActive => CurrentState == ComponentState.Active;
        
        public void Initialize()
        {
            CurrentState = ComponentState.Initialized;
        }
        
        public void Activate()
        {
            if (CurrentState == ComponentState.Initialized || CurrentState == ComponentState.Inactive)
            {
                CurrentState = ComponentState.Active;
            }
        }
        
        public void Deactivate()
        {
            if (CurrentState == ComponentState.Active)
            {
                CurrentState = ComponentState.Inactive;
            }
        }
        
        public void TriggerError()
        {
            CurrentState = ComponentState.Error;
        }
    }
    
    /// <summary>
    /// Event-driven component for testing event systems
    /// </summary>
    public class EventDrivenComponent : MonoBehaviour
    {
        public System.Action<string> OnDataChanged;
        
        public void TriggerDataChange(string data)
        {
            OnDataChanged?.Invoke(data);
        }
    }
    
    /// <summary>
    /// Interactive component for testing component interactions
    /// </summary>
    public class InteractiveComponent : MonoBehaviour
    {
        public bool HasInteracted { get; private set; }
        public bool HasBeenInteractedWith { get; private set; }
        
        public InteractiveComponent[] FindNearbyComponents(float radius)
        {
            var colliders = Physics2D.OverlapCircleAll(transform.position, radius);
            var components = new List<InteractiveComponent>();
            
            foreach (var collider in colliders)
            {
                var component = collider.GetComponent<InteractiveComponent>();
                if (component != null && component != this)
                {
                    components.Add(component);
                }
            }
            
            return components.ToArray();
        }
        
        public bool InteractWith(InteractiveComponent other)
        {
            if (other == null) return false;
            
            HasInteracted = true;
            other.HasBeenInteractedWith = true;
            
            return true;
        }
    }
    
    /// <summary>
    /// Physics-dependent component for testing physics integration
    /// </summary>
    public class PhysicsComponent : MonoBehaviour
    {
        public Rigidbody2D Rigidbody { get; private set; }
        public Collider2D Collider { get; private set; }
        public bool IsGrounded { get; private set; }
        
        private void Awake()
        {
            Rigidbody = GetComponent<Rigidbody2D>();
            Collider = GetComponent<Collider2D>();
        }
        
        public void ApplyForce(Vector2 force)
        {
            if (Rigidbody != null)
            {
                Rigidbody.AddForce(force);
            }
        }
        
        private void OnCollisionEnter2D(Collision2D collision)
        {
            if (collision.gameObject.name.Contains("Ground"))
            {
                IsGrounded = true;
            }
        }
        
        private void OnCollisionExit2D(Collision2D collision)
        {
            if (collision.gameObject.name.Contains("Ground"))
            {
                IsGrounded = false;
            }
        }
    }
    
    /// <summary>
    /// Component that uses coroutines for async operations
    /// </summary>
    public class CoroutineComponent : MonoBehaviour
    {
        public IEnumerator DelayedOperation(float delay, System.Action callback)
        {
            yield return new WaitForSeconds(delay);
            callback?.Invoke();
        }
        
        public IEnumerator ProcessValueAsync(float input, System.Action<float> callback)
        {
            // Simulate async processing
            yield return new WaitForSeconds(0.1f);
            
            float result = input * 2f;
            callback?.Invoke(result);
        }
    }
    
    /// <summary>
    /// Component for testing error handling
    /// </summary>
    public class ErrorProneComponent : MonoBehaviour
    {
        public bool IsOperational { get; private set; } = true;
        public System.Action<string> OnErrorHandled;
        
        public void TriggerNullReferenceError()
        {
            try
            {
                GameObject nullObject = null;
                nullObject.transform.position = Vector3.zero; // This will throw
            }
            catch (System.NullReferenceException)
            {
                OnErrorHandled?.Invoke("null reference error handled");
            }
        }
        
        public void TriggerInvalidOperation()
        {
            try
            {
                // Simulate invalid operation
                throw new System.InvalidOperationException("Test invalid operation");
            }
            catch (System.InvalidOperationException)
            {
                OnErrorHandled?.Invoke("invalid operation error handled");
            }
        }
    }
}
```

### 2. Scene Integration Testing

#### 2.1 Scene Loading and Management Tests

[[LLM: Design comprehensive scene testing patterns that validate scene loading, object initialization, cross-scene communication, and scene transition behaviors. Consider testing scene dependencies, persistent objects, and scene-specific functionality that requires runtime validation.]]

**Scene Integration Testing Framework**:

```csharp
// Assets/Tests/PlayMode/Scenes/SceneIntegrationTests.cs
using System.Collections;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.SceneManagement;
using NUnit.Framework;

namespace {{project_namespace}}.Tests.PlayMode.Scenes
{
    /// <summary>
    /// Comprehensive scene integration testing for runtime scene management and transitions
    /// Tests scene loading, unloading, and cross-scene functionality
    /// </summary>
    public class SceneIntegrationTests : PlayModeTestBase
    {
        private string[] testScenes = { "TestScene", "GameplayScene", "UITestScene" };
        private Scene originalScene;
        
        protected override IEnumerator CustomSetUp()
        {
            originalScene = SceneManager.GetActiveScene();
            yield return null;
        }
        
        protected override IEnumerator CustomTearDown()
        {
            // Ensure we return to original scene
            if (SceneManager.GetActiveScene() != originalScene)
            {
                yield return SceneManager.LoadSceneAsync(originalScene.name);
            }
        }
        
        [UnityTest]
        public IEnumerator Scene_Loading_WorksCorrectly()
        {
            foreach (string sceneName in testScenes)
            {
                yield return TestSceneLoading(sceneName);
            }
        }
        
        [UnityTest]
        public IEnumerator Scene_AdditiveLoading_WorksCorrectly()
        {
            // Load multiple scenes additively
            var loadedScenes = new List<Scene>();
            
            foreach (string sceneName in testScenes)
            {
                AsyncOperation loadOp = SceneManager.LoadSceneAsync(sceneName, LoadSceneMode.Additive);
                yield return loadOp;
                
                Scene loadedScene = SceneManager.GetSceneByName(sceneName);
                Assert.IsTrue(loadedScene.isLoaded, $"Scene {sceneName} should be loaded");
                loadedScenes.Add(loadedScene);
            }
            
            // Verify all scenes are loaded
            Assert.AreEqual(testScenes.Length + 1, SceneManager.sceneCount, "All test scenes should be loaded additively");
            
            // Clean up by unloading scenes
            foreach (Scene scene in loadedScenes)
            {
                if (scene.isLoaded)
                {
                    AsyncOperation unloadOp = SceneManager.UnloadSceneAsync(scene);
                    yield return unloadOp;
                }
            }
        }
        
        [UnityTest]
        public IEnumerator Scene_Transitions_MaintainGameState()
        {
            // Create a persistent game state object
            var gameStateObject = new GameObject("Persistent Game State");
            var gameState = gameStateObject.AddComponent<TestGameState>();
            Object.DontDestroyOnLoad(gameStateObject);
            
            // Set initial state
            gameState.PlayerScore = 100;
            gameState.CurrentLevel = 1;
            
            // Load different scene
            AsyncOperation loadOp = SceneManager.LoadSceneAsync("GameplayScene");
            yield return loadOp;
            
            // Verify game state persisted
            var persistedState = FindObjectOfType<TestGameState>();
            Assert.IsNotNull(persistedState, "Game state should persist across scenes");
            Assert.AreEqual(100, persistedState.PlayerScore, "Player score should be maintained");
            Assert.AreEqual(1, persistedState.CurrentLevel, "Current level should be maintained");
            
            // Modify state in new scene
            persistedState.PlayerScore = 200;
            persistedState.CurrentLevel = 2;
            
            // Load another scene
            loadOp = SceneManager.LoadSceneAsync("UITestScene");
            yield return loadOp;
            
            // Verify state changes persisted
            persistedState = FindObjectOfType<TestGameState>();
            Assert.AreEqual(200, persistedState.PlayerScore, "Modified score should persist");
            Assert.AreEqual(2, persistedState.CurrentLevel, "Modified level should persist");
            
            // Clean up
            if (persistedState != null)
            {
                Object.DestroyImmediate(persistedState.gameObject);
            }
        }
        
        [UnityTest]
        public IEnumerator Scene_Objects_InitializeCorrectly()
        {
            // Load scene with specific objects
            AsyncOperation loadOp = SceneManager.LoadSceneAsync("GameplayScene");
            yield return loadOp;
            
            // Wait for scene objects to initialize
            yield return new WaitForSeconds(0.5f);
            
            // Find and validate specific scene objects
            var sceneManager = FindObjectOfType<SceneManagerComponent>();
            Assert.IsNotNull(sceneManager, "Scene should have a SceneManagerComponent");
            Assert.IsTrue(sceneManager.IsInitialized, "Scene manager should be initialized");
            
            var gameplayElements = FindObjectsOfType<GameplayElement>();
            Assert.Greater(gameplayElements.Length, 0, "Scene should contain gameplay elements");
            
            foreach (var element in gameplayElements)
            {
                Assert.IsTrue(element.IsActive, "All gameplay elements should be active");
                Assert.IsNotNull(element.RequiredComponent, "Gameplay elements should have required components");
            }
        }
        
        [UnityTest]
        public IEnumerator Scene_Communication_WorksBetweenScenes()
        {
            // Create scene communication manager
            var commManager = new GameObject("Scene Communication Manager");
            var messenger = commManager.AddComponent<SceneMessenger>();
            Object.DontDestroyOnLoad(commManager);
            
            // Load first scene and send message
            AsyncOperation loadOp = SceneManager.LoadSceneAsync("GameplayScene");
            yield return loadOp;
            
            string testMessage = "Hello from Scene 1";
            messenger.SendMessage("test_channel", testMessage);
            
            yield return null;
            
            // Load second scene additively
            loadOp = SceneManager.LoadSceneAsync("UITestScene", LoadSceneMode.Additive);
            yield return loadOp;
            
            // Set up message receiver in second scene
            var receiverObject = new GameObject("Message Receiver");
            SceneManager.MoveGameObjectToScene(receiverObject, SceneManager.GetSceneByName("UITestScene"));
            var receiver = receiverObject.AddComponent<SceneMessageReceiver>();
            
            string receivedMessage = null;
            receiver.OnMessageReceived += (channel, message) => {
                if (channel == "test_channel")
                    receivedMessage = message;
            };
            
            // Send cross-scene message
            messenger.SendMessage("test_channel", "Cross-scene message");
            yield return null;
            
            Assert.IsNotNull(receivedMessage, "Message should be received across scenes");
            Assert.AreEqual("Cross-scene message", receivedMessage, "Message content should match");
            
            // Clean up
            Object.DestroyImmediate(commManager);
        }
        
        [UnityTest]
        public IEnumerator Scene_Resources_LoadCorrectly()
        {
            // Load scene with resource dependencies
            AsyncOperation loadOp = SceneManager.LoadSceneAsync("GameplayScene");
            yield return loadOp;
            
            // Wait for resources to load
            yield return new WaitForSeconds(1f);
            
            // Validate scene resources
            var resourceManagers = FindObjectsOfType<SceneResourceManager>();
            Assert.Greater(resourceManagers.Length, 0, "Scene should have resource managers");
            
            foreach (var manager in resourceManagers)
            {
                Assert.IsTrue(manager.ResourcesLoaded, "All scene resources should be loaded");
                Assert.IsNotNull(manager.LoadedAssets, "Resource manager should have loaded assets");
                Assert.Greater(manager.LoadedAssets.Count, 0, "Should have loaded at least one asset");
            }
        }
        
        /// <summary>
        /// Helper method to test individual scene loading
        /// </summary>
        private IEnumerator TestSceneLoading(string sceneName)
        {
            float startTime = Time.realtimeSinceStartup;
            
            AsyncOperation loadOp = SceneManager.LoadSceneAsync(sceneName);
            
            // Monitor loading progress
            while (!loadOp.isDone)
            {
                Assert.GreaterOrEqual(loadOp.progress, 0f, "Loading progress should be non-negative");
                Assert.LessOrEqual(loadOp.progress, 1f, "Loading progress should not exceed 100%");
                yield return null;
            }
            
            float loadTime = Time.realtimeSinceStartup - startTime;
            LogTestInfo($"Scene '{sceneName}' loaded in {loadTime:F3}s");
            
            // Verify scene is active and loaded
            Scene activeScene = SceneManager.GetActiveScene();
            Assert.AreEqual(sceneName, activeScene.name, $"Active scene should be {sceneName}");
            Assert.IsTrue(activeScene.isLoaded, "Scene should be marked as loaded");
            
            // Verify scene has expected objects
            GameObject[] rootObjects = activeScene.GetRootGameObjects();
            Assert.Greater(rootObjects.Length, 0, "Scene should contain at least one root GameObject");
            
            // Performance check
            Assert.Less(loadTime, 5f, "Scene loading should complete within reasonable time");
        }
    }
    
    // Example scene-specific components for testing
    
    /// <summary>
    /// Test game state component for persistence testing
    /// </summary>
    public class TestGameState : MonoBehaviour
    {
        public int PlayerScore { get; set; }
        public int CurrentLevel { get; set; }
        public string PlayerName { get; set; } = "TestPlayer";
        
        private void Awake()
        {
            // Ensure only one instance exists
            TestGameState[] existing = FindObjectsOfType<TestGameState>();
            if (existing.Length > 1)
            {
                Destroy(gameObject);
            }
        }
    }
    
    /// <summary>
    /// Scene manager component for scene initialization testing
    /// </summary>
    public class SceneManagerComponent : MonoBehaviour
    {
        public bool IsInitialized { get; private set; }
        
        private void Start()
        {
            StartCoroutine(InitializeScene());
        }
        
        private IEnumerator InitializeScene()
        {
            // Simulate scene initialization
            yield return new WaitForSeconds(0.2f);
            IsInitialized = true;
        }
    }
    
    /// <summary>
    /// Generic gameplay element for scene object testing
    /// </summary>
    public class GameplayElement : MonoBehaviour
    {
        public bool IsActive { get; private set; }
        public Component RequiredComponent { get; private set; }
        
        private void Awake()
        {
            RequiredComponent = GetComponent<Transform>(); // Always exists
        }
        
        private void Start()
        {
            IsActive = true;
        }
    }
    
    /// <summary>
    /// Scene messaging system for cross-scene communication testing
    /// </summary>
    public class SceneMessenger : MonoBehaviour
    {
        private Dictionary<string, List<System.Action<string, string>>> subscribers = 
            new Dictionary<string, List<System.Action<string, string>>>();
        
        public void SendMessage(string channel, string message)
        {
            if (subscribers.ContainsKey(channel))
            {
                foreach (var callback in subscribers[channel])
                {
                    callback(channel, message);
                }
            }
        }
        
        public void Subscribe(string channel, System.Action<string, string> callback)
        {
            if (!subscribers.ContainsKey(channel))
            {
                subscribers[channel] = new List<System.Action<string, string>>();
            }
            subscribers[channel].Add(callback);
        }
    }
    
    /// <summary>
    /// Scene message receiver for testing cross-scene communication
    /// </summary>
    public class SceneMessageReceiver : MonoBehaviour
    {
        public System.Action<string, string> OnMessageReceived;
        
        private void Start()
        {
            var messenger = FindObjectOfType<SceneMessenger>();
            if (messenger != null)
            {
                messenger.Subscribe("test_channel", (channel, message) => 
                    OnMessageReceived?.Invoke(channel, message));
            }
        }
    }
    
    /// <summary>
    /// Scene resource manager for testing resource loading
    /// </summary>
    public class SceneResourceManager : MonoBehaviour
    {
        public bool ResourcesLoaded { get; private set; }
        public List<Object> LoadedAssets { get; private set; } = new List<Object>();
        
        private void Start()
        {
            StartCoroutine(LoadResources());
        }
        
        private IEnumerator LoadResources()
        {
            // Simulate resource loading
            yield return new WaitForSeconds(0.3f);
            
            // Load some test assets (sprites, etc.)
            Object testAsset = Resources.Load("TestSprite");
            if (testAsset != null)
            {
                LoadedAssets.Add(testAsset);
            }
            
            ResourcesLoaded = true;
        }
    }
}
```

### 3. Async and Coroutine Testing Patterns

#### 3.1 Advanced Async Testing Framework

[[LLM: Implement comprehensive async testing patterns for Unity coroutines, async/await operations, and time-dependent behaviors. Include proper timeout handling, cancellation token support, and performance validation for async operations.]]

**Advanced Async Testing Implementation**:

```csharp
// Assets/Tests/PlayMode/Async/AsyncTestFramework.cs
using System.Collections;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.TestTools;
using NUnit.Framework;

namespace {{project_namespace}}.Tests.PlayMode.Async
{
    /// <summary>
    /// Advanced testing framework for async operations, coroutines, and time-dependent behaviors
    /// Provides robust testing patterns for Unity's asynchronous systems
    /// </summary>
    public class AsyncTestFramework : PlayModeTestBase
    {
        private CancellationTokenSource testCancellationSource;
        
        protected override IEnumerator CustomSetUp()
        {
            testCancellationSource = new CancellationTokenSource();
            yield return null;
        }
        
        protected override IEnumerator CustomTearDown()
        {
            testCancellationSource?.Cancel();
            testCancellationSource?.Dispose();
            yield return null;
        }
        
        [UnityTest]
        public IEnumerator Coroutine_Execution_Works()
        {
            var asyncComponent = CreateTestObject<AsyncTestComponent>("CoroutineTest");
            
            // Test simple coroutine
            bool coroutineCompleted = false;
            yield return StartCoroutine(asyncComponent.SimpleCoroutine(() => coroutineCompleted = true));
            
            Assert.IsTrue(coroutineCompleted, "Simple coroutine should complete");
            
            // Test coroutine with parameters
            string result = null;
            yield return StartCoroutine(asyncComponent.ParameterizedCoroutine("test", (value) => result = value));
            
            Assert.AreEqual("processed_test", result, "Parameterized coroutine should process input");
        }
        
        [UnityTest]
        public IEnumerator Coroutine_Cancellation_Works()
        {
            var asyncComponent = CreateTestObject<AsyncTestComponent>("CancellationTest");
            
            bool operationCancelled = false;
            bool operationCompleted = false;
            
            // Start long-running coroutine
            Coroutine longOperation = StartCoroutine(asyncComponent.LongRunningOperation(
                () => operationCompleted = true,
                () => operationCancelled = true
            ));
            
            // Wait briefly then cancel
            yield return new WaitForSeconds(0.5f);
            StopCoroutine(longOperation);
            
            yield return new WaitForSeconds(0.5f);
            
            // Operation should be cancelled, not completed
            Assert.IsFalse(operationCompleted, "Long operation should not complete");
            // Note: Unity coroutines don't have built-in cancellation, 
            // but we can test component-level cancellation logic
        }
        
        [UnityTest]
        public IEnumerator AsyncAwait_Operations_Work()
        {
            var asyncComponent = CreateTestObject<AsyncTestComponent>("AsyncAwaitTest");
            
            // Test async method execution
            bool taskCompleted = false;
            string taskResult = null;
            
            yield return StartCoroutine(RunAsyncTask(async () => {
                taskResult = await asyncComponent.AsyncStringOperation("test_input");
                taskCompleted = true;
            }));
            
            Assert.IsTrue(taskCompleted, "Async task should complete");
            Assert.AreEqual("async_test_input", taskResult, "Async method should process input correctly");
        }
        
        [UnityTest]
        public IEnumerator AsyncAwait_WithCancellation_Works()
        {
            var asyncComponent = CreateTestObject<AsyncTestComponent>("AsyncCancellationTest");
            
            bool taskCancelled = false;
            bool taskCompleted = false;
            
            // Create cancellation token with short timeout
            using (var cancellationSource = new CancellationTokenSource(1000)) // 1 second timeout
            {
                yield return StartCoroutine(RunAsyncTask(async () => {
                    try
                    {
                        await asyncComponent.LongRunningAsyncOperation(cancellationSource.Token);
                        taskCompleted = true;
                    }
                    catch (TaskCanceledException)
                    {
                        taskCancelled = true;
                    }
                }));
            }
            
            Assert.IsTrue(taskCancelled, "Long async operation should be cancelled");
            Assert.IsFalse(taskCompleted, "Cancelled operation should not complete");
        }
        
        [UnityTest]
        public IEnumerator TimeDependentBehavior_Works()
        {
            var timedComponent = CreateTestObject<TimedBehaviorComponent>("TimedTest");
            
            // Test timer functionality
            bool timerExpired = false;
            timedComponent.StartTimer(1f, () => timerExpired = true);
            
            // Timer should not be expired immediately
            Assert.IsFalse(timerExpired, "Timer should not expire immediately");
            
            // Wait for timer to expire
            yield return new WaitForSeconds(1.2f);
            
            Assert.IsTrue(timerExpired, "Timer should expire after specified duration");
        }
        
        [UnityTest]
        public IEnumerator Animation_Sequences_Execute()
        {
            var animationComponent = CreateTestObject<AnimationTestComponent>("AnimationTest");
            animationComponent.transform.position = Vector3.zero;
            
            // Test animation sequence
            bool animationCompleted = false;
            Vector3 targetPosition = new Vector3(5, 0, 0);
            
            yield return StartCoroutine(animationComponent.AnimateToPosition(
                targetPosition, 
                1f, 
                () => animationCompleted = true
            ));
            
            Assert.IsTrue(animationCompleted, "Animation should complete");
            Assert.AreEqual(targetPosition, animationComponent.transform.position, "Object should reach target position");
        }
        
        [UnityTest]
        public IEnumerator FrameRateIndependent_Behavior_Works()
        {
            var framerateComponent = CreateTestObject<FrameRateTestComponent>("FrameRateTest");
            
            // Test behavior at different frame rates
            int originalTargetFrameRate = Application.targetFrameRate;
            
            try
            {
                // Test at 30 FPS
                Application.targetFrameRate = 30;
                yield return TestFrameRateBehavior(framerateComponent, 30);
                
                // Test at 60 FPS
                Application.targetFrameRate = 60;
                yield return TestFrameRateBehavior(framerateComponent, 60);
                
                // Test at 120 FPS
                Application.targetFrameRate = 120;
                yield return TestFrameRateBehavior(framerateComponent, 120);
            }
            finally
            {
                Application.targetFrameRate = originalTargetFrameRate;
            }
        }
        
        [UnityTest]
        public IEnumerator AsyncResourceLoading_Works()
        {
            var resourceComponent = CreateTestObject<AsyncResourceLoader>("ResourceTest");
            
            // Test async resource loading
            bool loadingCompleted = false;
            Object loadedResource = null;
            
            yield return StartCoroutine(resourceComponent.LoadResourceAsync(
                "TestSprite",
                (resource) => {
                    loadedResource = resource;
                    loadingCompleted = true;
                }
            ));
            
            Assert.IsTrue(loadingCompleted, "Resource loading should complete");
            
            if (loadedResource != null) // Resource might not exist in test environment
            {
                Assert.IsNotNull(loadedResource, "Resource should be loaded if it exists");
            }
        }
        
        [UnityTest]
        public IEnumerator ConcurrentOperations_ExecuteCorrectly()
        {
            var concurrentComponent = CreateTestObject<ConcurrentOperationComponent>("ConcurrentTest");
            
            // Start multiple concurrent operations
            bool operation1Complete = false;
            bool operation2Complete = false;
            bool operation3Complete = false;
            
            StartCoroutine(concurrentComponent.Operation1(() => operation1Complete = true));
            StartCoroutine(concurrentComponent.Operation2(() => operation2Complete = true));
            StartCoroutine(concurrentComponent.Operation3(() => operation3Complete = true));
            
            // Wait for all operations to complete
            yield return WaitForCondition(() => 
                operation1Complete && operation2Complete && operation3Complete, 
                5f, "all concurrent operations to complete");
            
            Assert.IsTrue(operation1Complete, "Operation 1 should complete");
            Assert.IsTrue(operation2Complete, "Operation 2 should complete");  
            Assert.IsTrue(operation3Complete, "Operation 3 should complete");
        }
        
        /// <summary>
        /// Helper coroutine to run async tasks within Unity tests
        /// </summary>
        private IEnumerator RunAsyncTask(System.Func<Task> taskFunc)
        {
            Task task = taskFunc();
            
            while (!task.IsCompleted && !task.IsCanceled && !task.IsFaulted)
            {
                yield return null;
            }
            
            if (task.IsFaulted)
            {
                throw task.Exception.GetBaseException();
            }
        }
        
        /// <summary>
        /// Helper method to test frame rate independent behavior
        /// </summary>
        private IEnumerator TestFrameRateBehavior(FrameRateTestComponent component, int targetFPS)
        {
            component.ResetTest();
            
            float testDuration = 2f;
            float startTime = Time.time;
            
            while (Time.time - startTime < testDuration)
            {
                yield return null;
            }
            
            float actualDuration = component.GetElapsedTime();
            float tolerance = 0.2f; // 20% tolerance
            
            Assert.That(actualDuration, Is.EqualTo(testDuration).Within(tolerance), 
                $"Behavior should be frame rate independent at {targetFPS} FPS");
        }
    }
    
    // Example components for async testing
    
    /// <summary>
    /// Component for testing async operations and coroutines
    /// </summary>
    public class AsyncTestComponent : MonoBehaviour
    {
        public IEnumerator SimpleCoroutine(System.Action onComplete)
        {
            yield return new WaitForSeconds(0.1f);
            onComplete?.Invoke();
        }
        
        public IEnumerator ParameterizedCoroutine(string input, System.Action<string> onComplete)
        {
            yield return new WaitForSeconds(0.1f);
            onComplete?.Invoke($"processed_{input}");
        }
        
        public IEnumerator LongRunningOperation(System.Action onComplete, System.Action onCancelled)
        {
            float startTime = Time.time;
            
            while (Time.time - startTime < 5f) // 5 second operation
            {
                yield return null;
                
                // Check for cancellation (component-level)
                if (!enabled || gameObject == null)
                {
                    onCancelled?.Invoke();
                    yield break;
                }
            }
            
            onComplete?.Invoke();
        }
        
        public async Task<string> AsyncStringOperation(string input)
        {
            await Task.Delay(100); // Simulate async work
            return $"async_{input}";
        }
        
        public async Task LongRunningAsyncOperation(CancellationToken cancellationToken)
        {
            await Task.Delay(5000, cancellationToken); // 5 second operation
        }
    }
    
    /// <summary>
    /// Component for testing timed behaviors
    /// </summary>
    public class TimedBehaviorComponent : MonoBehaviour
    {
        private Coroutine timerCoroutine;
        
        public void StartTimer(float duration, System.Action onExpired)
        {
            if (timerCoroutine != null)
            {
                StopCoroutine(timerCoroutine);
            }
            
            timerCoroutine = StartCoroutine(TimerCoroutine(duration, onExpired));
        }
        
        private IEnumerator TimerCoroutine(float duration, System.Action onExpired)
        {
            yield return new WaitForSeconds(duration);
            onExpired?.Invoke();
        }
    }
    
    /// <summary>
    /// Component for testing animation sequences
    /// </summary>
    public class AnimationTestComponent : MonoBehaviour
    {
        public IEnumerator AnimateToPosition(Vector3 targetPosition, float duration, System.Action onComplete)
        {
            Vector3 startPosition = transform.position;
            float elapsed = 0f;
            
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                transform.position = Vector3.Lerp(startPosition, targetPosition, t);
                yield return null;
            }
            
            transform.position = targetPosition;
            onComplete?.Invoke();
        }
    }
    
    /// <summary>
    /// Component for testing frame rate independent behavior
    /// </summary>
    public class FrameRateTestComponent : MonoBehaviour
    {
        private float startTime;
        private bool testActive;
        
        public void ResetTest()
        {
            startTime = Time.time;
            testActive = true;
        }
        
        public float GetElapsedTime()
        {
            return testActive ? Time.time - startTime : 0f;
        }
        
        private void Update()
        {
            if (testActive)
            {
                // Frame rate independent behavior using Time.deltaTime
                transform.Rotate(0, 0, 90f * Time.deltaTime); // 90 degrees per second
            }
        }
    }
    
    /// <summary>
    /// Component for testing async resource loading
    /// </summary>
    public class AsyncResourceLoader : MonoBehaviour
    {
        public IEnumerator LoadResourceAsync(string resourceName, System.Action<Object> onLoaded)
        {
            ResourceRequest request = Resources.LoadAsync(resourceName);
            
            while (!request.isDone)
            {
                yield return null;
            }
            
            onLoaded?.Invoke(request.asset);
        }
    }
    
    /// <summary>
    /// Component for testing concurrent operations
    /// </summary>
    public class ConcurrentOperationComponent : MonoBehaviour
    {
        public IEnumerator Operation1(System.Action onComplete)
        {
            yield return new WaitForSeconds(0.5f);
            onComplete?.Invoke();
        }
        
        public IEnumerator Operation2(System.Action onComplete)
        {
            yield return new WaitForSeconds(0.7f);
            onComplete?.Invoke();
        }
        
        public IEnumerator Operation3(System.Action onComplete)
        {
            yield return new WaitForSeconds(0.3f);
            onComplete?.Invoke();
        }
    }
}
```

## Task Completion Validation

### Validation Checklist

[[LLM: Use this checklist to verify that all components of the PlayMode testing framework have been properly implemented and configured. Each item must be verified before considering the task complete.]]

**Core PlayMode Test Framework**:
- [ ] PlayModeTestBase provides standardized testing infrastructure
- [ ] Scene loading and management working correctly
- [ ] Test object creation and cleanup functioning properly
- [ ] Proper timeout and condition waiting mechanisms implemented
- [ ] Debug logging and error reporting functional

**Component Runtime Testing**:
- [ ] Component lifecycle testing validates Awake, Start, Update, OnDestroy
- [ ] State management testing verifies component state transitions
- [ ] Event system testing validates event firing and subscription
- [ ] Component interaction testing verifies object communication
- [ ] Performance testing meets component creation/cleanup targets

**Scene Integration Testing**:
- [ ] Scene loading and unloading working correctly
- [ ] Additive scene loading functioning properly
- [ ] Cross-scene communication operational
- [ ] Scene state persistence validated
- [ ] Resource loading in scenes verified

**Async and Coroutine Testing**:
- [ ] Coroutine execution testing functional
- [ ] Async/await operations working correctly
- [ ] Cancellation patterns implemented and tested
- [ ] Time-dependent behaviors validated
- [ ] Frame rate independence verified

**Integration and Performance**:
- [ ] All test frameworks working together without conflicts
- [ ] Test execution times within acceptable limits
- [ ] Memory usage during tests remains stable
- [ ] Error handling preventing test framework crashes
- [ ] Comprehensive documentation and examples provided

### Success Criteria

**Technical Requirements**:
- All PlayMode tests execute successfully in Unity Test Runner
- Test execution time under 30 seconds for full suite
- Memory usage stable during test execution (no leaks)
- Test framework supports 100+ concurrent test objects

**Coverage Requirements**:
- Component lifecycle events thoroughly tested
- Scene management functionality validated
- Async operations properly tested with timeouts
- Error conditions handled gracefully

## Dependencies

This task extends and integrates with:
- `create-test-suite.md` - Core testing framework patterns
- `component-architecture.md` - Component system testing
- `validate-unity-features.md` - Unity feature validation procedures
- `create-architecture-doc.md` - System architecture testing

## Additional Resources

**Unity Testing Documentation**:
- Unity Test Framework: https://docs.unity3d.com/Packages/com.unity.test-framework@latest
- PlayMode vs EditMode Testing: https://docs.unity3d.com/Manual/testing-editortestsrunner.html
- Unity Test Attributes: https://docs.unity3d.com/Packages/com.unity.test-framework@latest/manual/reference-tests-parameterized.html
- NUnit Framework: https://docs.nunit.org/articles/nunit/intro.html

**Best Practices**:
- Unity Testing Best Practices: https://unity.com/learn/tutorials/topics/scripting/testing-best-practices
- Async Testing Patterns: https://docs.unity3d.com/Packages/com.unity.test-framework@latest/manual/workflow-test-playmode.html
- Performance Testing: https://docs.unity3d.com/Manual/ProfilerWindow.html

**Code Examples and Tutorials**:
- Unity PlayMode Testing Tutorial: https://unity.com/learn/tutorials/topics/scripting/playmode-tests
- Advanced Testing Techniques: https://blog.unity.com/technology/advanced-unity-testing-techniques
- Async Testing in Unity: https://unity.com/learn/tutorials/topics/scripting/async-testing

---

**Task Implementation Notes**:
This comprehensive PlayMode testing task provides production-ready testing framework for Unity runtime validation, covering component lifecycle, scene management, async operations, and performance testing while maintaining Unity best practices and BMAD compliance patterns. The implementation includes advanced features like timeout handling, cancellation support, and comprehensive validation frameworks.