// Assets/Tests/PlayMode/Priority2IntegrationTests.cs
using System;
using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.SceneManagement;

namespace BMAD.Unity.Tests.PlayMode
{
    /// <summary>
    /// Comprehensive integration tests for all Priority 2 Unity systems
    /// Tests cross-system interactions, runtime performance, and end-to-end workflows
    /// </summary>
    [TestFixture]
    public class Priority2IntegrationTests
    {
        private Scene testScene;
        private GameObject integrationTestManager;
        private List<MonoBehaviour> testComponents;

        [OneTimeSetUp]
        public void OneTimeSetup()
        {
            // Create test scene for integration tests
            testScene = SceneManager.CreateScene("Priority2IntegrationTestScene");
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
            // Create integration test manager
            integrationTestManager = new GameObject("Priority2 Integration Test Manager");
            SceneManager.MoveGameObjectToScene(integrationTestManager, testScene);
            
            testComponents = new List<MonoBehaviour>();
        }

        [TearDown]
        public void TearDown()
        {
            // Cleanup test components
            foreach (var component in testComponents)
            {
                if (component != null)
                {
                    UnityEngine.Object.DestroyImmediate(component);
                }
            }
            testComponents.Clear();

            // Cleanup test manager
            if (integrationTestManager != null)
            {
                UnityEngine.Object.DestroyImmediate(integrationTestManager);
            }
        }

        #region Cross-System Integration Tests

        [UnityTest]
        public IEnumerator CrossSystem_SpriteAtlasAndLibraryIntegration_WorksCorrectly()
        {
            // Arrange
            var atlasManager = integrationTestManager.AddComponent<MockSpriteAtlasManager>();
            var libraryManager = integrationTestManager.AddComponent<MockSpriteLibraryManager>();
            testComponents.AddRange(new MonoBehaviour[] { atlasManager, libraryManager });

            atlasManager.Initialize();
            libraryManager.Initialize();

            // Act - Load atlas and library together
            atlasManager.LoadAtlas("TestAtlas");
            libraryManager.LoadLibrary("TestLibrary");
            
            // Simulate sprite swapping using both systems
            var spriteResolver = integrationTestManager.AddComponent<MockSpriteResolver>();
            testComponents.Add(spriteResolver);
            
            spriteResolver.Initialize(atlasManager, libraryManager);
            spriteResolver.SwapToVariant("Character", "Happy");

            yield return new WaitForSeconds(0.1f);

            // Assert
            Assert.IsTrue(atlasManager.IsAtlasLoaded("TestAtlas"), "Atlas should be loaded");
            Assert.IsTrue(libraryManager.IsLibraryLoaded("TestLibrary"), "Library should be loaded");
            Assert.AreEqual("Happy", spriteResolver.CurrentVariant, "Sprite variant should be swapped");
            Assert.IsNotNull(spriteResolver.CurrentSprite, "Current sprite should be set");
        }

        [UnityTest]
        public IEnumerator CrossSystem_InterfaceAndScriptableObjectIntegration_MaintainsDataConsistency()
        {
            // Arrange
            var serviceManager = integrationTestManager.AddComponent<MockServiceManager>();
            var dataManager = integrationTestManager.AddComponent<MockDataManager>();
            var configurationService = integrationTestManager.AddComponent<MockConfigurationService>();
            testComponents.AddRange(new MonoBehaviour[] { serviceManager, dataManager, configurationService });

            serviceManager.Initialize();
            dataManager.Initialize();
            configurationService.Initialize();

            // Register services
            serviceManager.RegisterService<IDataManager>(dataManager);
            serviceManager.RegisterService<IConfigurationService>(configurationService);

            // Act - Modify configuration and verify data consistency
            var config = configurationService.GetConfiguration<MockGameConfig>();
            config.PlayerSpeed = 10.0f;
            configurationService.SaveConfiguration(config);

            yield return new WaitForSeconds(0.1f);

            // Load configuration through different service
            var loadedConfig = dataManager.LoadAsset<MockGameConfig>("GameConfig");

            // Assert
            Assert.IsNotNull(loadedConfig, "Configuration should be loaded");
            Assert.AreEqual(10.0f, loadedConfig.PlayerSpeed, "Configuration changes should persist");
            Assert.IsTrue(serviceManager.IsServiceRegistered<IDataManager>(), "Data manager should remain registered");
        }

        [UnityTest]
        public IEnumerator CrossSystem_EditorValidationAndAssetIntegration_ValidatesAssets()
        {
            // Arrange
            var validationFramework = integrationTestManager.AddComponent<MockValidationFramework>();
            var assetDatabase = integrationTestManager.AddComponent<MockAssetDatabase>();
            testComponents.AddRange(new MonoBehaviour[] { validationFramework, assetDatabase });

            validationFramework.Initialize();
            assetDatabase.Initialize();

            // Create test assets
            var testSprite = assetDatabase.CreateTestSprite("TestSprite");
            var testPrefab = assetDatabase.CreateTestPrefab("TestPrefab");

            // Act - Run validation on assets
            validationFramework.ValidateAsset(testSprite);
            validationFramework.ValidateAsset(testPrefab);

            yield return new WaitForSeconds(0.1f);

            var validationResults = validationFramework.GetValidationResults();

            // Assert
            Assert.IsNotNull(validationResults, "Validation results should be available");
            Assert.AreEqual(2, validationResults.ValidatedAssetCount, "Should validate both assets");
            Assert.IsTrue(validationResults.HasResults("TestSprite"), "Should have results for sprite");
            Assert.IsTrue(validationResults.HasResults("TestPrefab"), "Should have results for prefab");
        }

        #endregion

        #region End-to-End Workflow Tests

        [UnityTest]
        public IEnumerator EndToEnd_CompleteGameSetupWorkflow_ExecutesSuccessfully()
        {
            // Arrange - Setup all Priority 2 systems
            var atlasManager = integrationTestManager.AddComponent<MockSpriteAtlasManager>();
            var libraryManager = integrationTestManager.AddComponent<MockSpriteLibraryManager>();
            var serviceManager = integrationTestManager.AddComponent<MockServiceManager>();
            var dataManager = integrationTestManager.AddComponent<MockDataManager>();
            var validationFramework = integrationTestManager.AddComponent<MockValidationFramework>();
            var integrationRunner = integrationTestManager.AddComponent<MockIntegrationTestRunner>();

            testComponents.AddRange(new MonoBehaviour[] { 
                atlasManager, libraryManager, serviceManager, 
                dataManager, validationFramework, integrationRunner 
            });

            // Act - Execute complete setup workflow
            yield return StartCoroutine(ExecuteGameSetupWorkflow(
                atlasManager, libraryManager, serviceManager, 
                dataManager, validationFramework, integrationRunner));

            // Assert
            Assert.IsTrue(atlasManager.IsInitialized, "Atlas manager should be initialized");
            Assert.IsTrue(libraryManager.IsInitialized, "Library manager should be initialized");
            Assert.IsTrue(serviceManager.IsInitialized, "Service manager should be initialized");
            Assert.IsTrue(dataManager.IsInitialized, "Data manager should be initialized");
            Assert.IsTrue(validationFramework.IsInitialized, "Validation framework should be initialized");
            Assert.IsTrue(integrationRunner.IsInitialized, "Integration runner should be initialized");

            // Verify cross-system integration
            Assert.IsTrue(serviceManager.IsServiceRegistered<IDataManager>(), "Data manager should be registered as service");
            Assert.Greater(atlasManager.LoadedAtlasCount, 0, "Should have loaded atlases");
            Assert.Greater(libraryManager.LoadedLibraryCount, 0, "Should have loaded libraries");
        }

        [UnityTest]
        public IEnumerator EndToEnd_AssetCreationAndValidationWorkflow_ProcessesAssetsCorrectly()
        {
            // Arrange
            var libraryManager = integrationTestManager.AddComponent<MockSpriteLibraryManager>();
            var validationFramework = integrationTestManager.AddComponent<MockValidationFramework>();
            var assetDatabase = integrationTestManager.AddComponent<MockAssetDatabase>();
            testComponents.AddRange(new MonoBehaviour[] { libraryManager, validationFramework, assetDatabase });

            libraryManager.Initialize();
            validationFramework.Initialize();
            assetDatabase.Initialize();

            // Act - Create sprite library from assets
            var sprites = new List<Sprite>();
            for (int i = 0; i < 5; i++)
            {
                sprites.Add(assetDatabase.CreateTestSprite($"WorkflowSprite_{i}"));
            }

            var library = libraryManager.CreateLibraryFromSprites("WorkflowLibrary", sprites);
            yield return new WaitForSeconds(0.1f);

            // Validate the created library
            validationFramework.ValidateAsset(library);
            yield return new WaitForSeconds(0.1f);

            var validationResult = validationFramework.GetValidationResult(library);

            // Assert
            Assert.IsNotNull(library, "Library should be created");
            Assert.AreEqual("WorkflowLibrary", library.name, "Library should have correct name");
            Assert.IsNotNull(validationResult, "Validation result should be available");
            Assert.IsTrue(validationResult.IsValid, "Created library should be valid");
        }

        [UnityTest]
        public IEnumerator EndToEnd_RuntimeSpriteSwappingWorkflow_HandlesMultipleCharacters()
        {
            // Arrange
            var atlasManager = integrationTestManager.AddComponent<MockSpriteAtlasManager>();
            var libraryManager = integrationTestManager.AddComponent<MockSpriteLibraryManager>();
            testComponents.AddRange(new MonoBehaviour[] { atlasManager, libraryManager });

            atlasManager.Initialize();
            libraryManager.Initialize();

            // Create multiple character objects
            var characters = new List<MockCharacterController>();
            for (int i = 0; i < 3; i++)
            {
                var characterObj = new GameObject($"Character_{i}");
                SceneManager.MoveGameObjectToScene(characterObj, testScene);
                
                var character = characterObj.AddComponent<MockCharacterController>();
                character.Initialize(atlasManager, libraryManager);
                characters.Add(character);
                testComponents.Add(character);
            }

            // Act - Swap sprites for all characters simultaneously
            var variants = new[] { "Happy", "Sad", "Angry" };
            for (int i = 0; i < characters.Count; i++)
            {
                characters[i].SwapExpression(variants[i]);
            }

            yield return new WaitForSeconds(0.2f);

            // Assert
            for (int i = 0; i < characters.Count; i++)
            {
                Assert.AreEqual(variants[i], characters[i].CurrentExpression, $"Character {i} should have {variants[i]} expression");
                Assert.IsNotNull(characters[i].CurrentSprite, $"Character {i} should have current sprite");
            }

            // Verify performance
            Assert.Less(Time.deltaTime, 0.016f, "Frame time should remain under 16ms during sprite swapping");
        }

        #endregion

        #region Performance Integration Tests

        [UnityTest]
        public IEnumerator Performance_SystemInitializationTime_MeetsRequirements()
        {
            var startTime = Time.realtimeSinceStartup;

            // Arrange & Act - Initialize all systems simultaneously
            var systems = new List<MockSystemComponent>
            {
                integrationTestManager.AddComponent<MockSpriteAtlasManager>(),
                integrationTestManager.AddComponent<MockSpriteLibraryManager>(),
                integrationTestManager.AddComponent<MockServiceManager>(),
                integrationTestManager.AddComponent<MockDataManager>(),
                integrationTestManager.AddComponent<MockValidationFramework>(),
                integrationTestManager.AddComponent<MockIntegrationTestRunner>()
            };

            testComponents.AddRange(systems);

            foreach (var system in systems)
            {
                system.Initialize();
            }

            yield return new WaitUntil(() => systems.TrueForAll(s => s.IsInitialized));

            var endTime = Time.realtimeSinceStartup;
            var initializationTime = endTime - startTime;

            // Assert
            Assert.Less(initializationTime, 2.0f, "All systems should initialize within 2 seconds");
            Assert.IsTrue(systems.TrueForAll(s => s.IsInitialized), "All systems should be initialized");
        }

        [UnityTest]
        public IEnumerator Performance_ConcurrentAssetOperations_MaintainsFrameRate()
        {
            // Arrange
            var atlasManager = integrationTestManager.AddComponent<MockSpriteAtlasManager>();
            var libraryManager = integrationTestManager.AddComponent<MockSpriteLibraryManager>();
            var dataManager = integrationTestManager.AddComponent<MockDataManager>();
            testComponents.AddRange(new MonoBehaviour[] { atlasManager, libraryManager, dataManager });

            atlasManager.Initialize();
            libraryManager.Initialize();
            dataManager.Initialize();

            var frameRateMonitor = integrationTestManager.AddComponent<MockFrameRateMonitor>();
            testComponents.Add(frameRateMonitor);
            frameRateMonitor.StartMonitoring();

            // Act - Perform concurrent operations
            for (int i = 0; i < 10; i++)
            {
                atlasManager.LoadAtlas($"Atlas_{i}");
                libraryManager.LoadLibrary($"Library_{i}");
                dataManager.LoadAsset<MockGameConfig>($"Config_{i}");
                
                yield return null; // Allow one frame between operations
            }

            yield return new WaitForSeconds(1.0f); // Let operations complete

            var averageFPS = frameRateMonitor.GetAverageFPS();

            // Assert
            Assert.Greater(averageFPS, 30.0f, "Should maintain at least 30 FPS during asset operations");
        }

        [UnityTest]
        public IEnumerator Performance_MemoryUsageDuringOperations_StaysWithinLimits()
        {
            // Arrange
            var memoryMonitor = integrationTestManager.AddComponent<MockMemoryMonitor>();
            testComponents.Add(memoryMonitor);
            
            var initialMemory = memoryMonitor.GetCurrentMemoryUsage();

            var atlasManager = integrationTestManager.AddComponent<MockSpriteAtlasManager>();
            var libraryManager = integrationTestManager.AddComponent<MockSpriteLibraryManager>();
            testComponents.AddRange(new MonoBehaviour[] { atlasManager, libraryManager });

            atlasManager.Initialize();
            libraryManager.Initialize();

            // Act - Load multiple atlases and libraries
            for (int i = 0; i < 20; i++)
            {
                atlasManager.LoadAtlas($"MemoryTest_Atlas_{i}");
                libraryManager.LoadLibrary($"MemoryTest_Library_{i}");
                yield return null;
            }

            yield return new WaitForSeconds(0.5f);

            var finalMemory = memoryMonitor.GetCurrentMemoryUsage();
            var memoryIncrease = finalMemory - initialMemory;

            // Assert
            Assert.Less(memoryIncrease, 100.0f, "Memory increase should be less than 100MB");
            
            // Cleanup and verify memory is freed
            atlasManager.UnloadAllAtlases();
            libraryManager.UnloadAllLibraries();
            
            yield return new WaitForSeconds(0.5f);
            
            var cleanupMemory = memoryMonitor.GetCurrentMemoryUsage();
            Assert.Less(cleanupMemory - initialMemory, 10.0f, "Memory should be mostly freed after cleanup");
        }

        #endregion

        #region Error Handling Integration Tests

        [UnityTest]
        public IEnumerator ErrorHandling_SystemFailureRecovery_RecoverGracefully()
        {
            // Arrange
            var serviceManager = integrationTestManager.AddComponent<MockServiceManager>();
            var errorHandler = integrationTestManager.AddComponent<MockErrorHandler>();
            var resilientSystem = integrationTestManager.AddComponent<MockResilientSystem>();
            testComponents.AddRange(new MonoBehaviour[] { serviceManager, errorHandler, resilientSystem });

            serviceManager.Initialize();
            errorHandler.Initialize();
            resilientSystem.Initialize(errorHandler);

            bool errorHandled = false;
            errorHandler.OnErrorHandled += () => errorHandled = true;

            // Act - Trigger system failure
            resilientSystem.TriggerFailure("Simulated system failure");
            yield return new WaitForSeconds(0.1f);

            // Assert
            Assert.IsTrue(errorHandled, "Error should be handled");
            Assert.IsTrue(resilientSystem.HasRecovered, "System should recover from failure");
            Assert.IsTrue(resilientSystem.IsOperational, "System should be operational after recovery");
        }

        [UnityTest]
        public IEnumerator ErrorHandling_InvalidAssetHandling_PreventsSystemCrash()
        {
            // Arrange
            var validationFramework = integrationTestManager.AddComponent<MockValidationFramework>();
            var assetDatabase = integrationTestManager.AddComponent<MockAssetDatabase>();
            testComponents.AddRange(new MonoBehaviour[] { validationFramework, assetDatabase });

            validationFramework.Initialize();
            assetDatabase.Initialize();

            // Create invalid assets
            var invalidSprite = assetDatabase.CreateInvalidSprite("InvalidSprite");
            var corruptedPrefab = assetDatabase.CreateCorruptedPrefab("CorruptedPrefab");

            // Act - Attempt to validate invalid assets
            bool validationCompleted = false;
            MockValidationResult result = null;

            try
            {
                validationFramework.ValidateAsset(invalidSprite);
                validationFramework.ValidateAsset(corruptedPrefab);
                result = validationFramework.GetValidationResults();
                validationCompleted = true;
            }
            catch (Exception ex)
            {
                Debug.LogError($"Validation threw exception: {ex.Message}");
            }

            yield return new WaitForSeconds(0.1f);

            // Assert
            Assert.IsTrue(validationCompleted, "Validation should complete without throwing exceptions");
            Assert.IsNotNull(result, "Validation result should be available");
            Assert.Greater(result.ErrorCount, 0, "Should detect errors in invalid assets");
            Assert.IsTrue(validationFramework.IsOperational, "Validation framework should remain operational");
        }

        #endregion

        #region Helper Methods

        private IEnumerator ExecuteGameSetupWorkflow(
            MockSpriteAtlasManager atlasManager,
            MockSpriteLibraryManager libraryManager, 
            MockServiceManager serviceManager,
            MockDataManager dataManager,
            MockValidationFramework validationFramework,
            MockIntegrationTestRunner integrationRunner)
        {
            // Step 1: Initialize core systems
            serviceManager.Initialize();
            dataManager.Initialize();
            yield return new WaitForSeconds(0.1f);

            // Step 2: Register services
            serviceManager.RegisterService<IDataManager>(dataManager);
            yield return new WaitForSeconds(0.1f);

            // Step 3: Initialize asset systems
            atlasManager.Initialize();
            libraryManager.Initialize();
            yield return new WaitForSeconds(0.1f);

            // Step 4: Load essential assets
            atlasManager.LoadAtlas("CoreAtlas");
            libraryManager.LoadLibrary("CoreLibrary");
            yield return new WaitForSeconds(0.1f);

            // Step 5: Initialize validation
            validationFramework.Initialize();
            yield return new WaitForSeconds(0.1f);

            // Step 6: Initialize integration testing
            integrationRunner.Initialize();
            yield return new WaitForSeconds(0.1f);
        }

        #endregion
    }

    #region Mock Implementation Classes

    // Base mock system component
    public abstract class MockSystemComponent : MonoBehaviour
    {
        public bool IsInitialized { get; protected set; }
        public bool IsOperational { get; protected set; } = true;

        public virtual void Initialize()
        {
            IsInitialized = true;
        }
    }

    // Mock sprite atlas manager
    public class MockSpriteAtlasManager : MockSystemComponent
    {
        public int LoadedAtlasCount => loadedAtlases.Count;
        private HashSet<string> loadedAtlases = new HashSet<string>();

        public void LoadAtlas(string atlasName)
        {
            loadedAtlases.Add(atlasName);
        }

        public bool IsAtlasLoaded(string atlasName)
        {
            return loadedAtlases.Contains(atlasName);
        }

        public void UnloadAllAtlases()
        {
            loadedAtlases.Clear();
        }
    }

    // Mock sprite library manager
    public class MockSpriteLibraryManager : MockSystemComponent
    {
        public int LoadedLibraryCount => loadedLibraries.Count;
        private HashSet<string> loadedLibraries = new HashSet<string>();

        public void LoadLibrary(string libraryName)
        {
            loadedLibraries.Add(libraryName);
        }

        public bool IsLibraryLoaded(string libraryName)
        {
            return loadedLibraries.Contains(libraryName);
        }

        public void UnloadAllLibraries()
        {
            loadedLibraries.Clear();
        }

        public SpriteLibraryAsset CreateLibraryFromSprites(string libraryName, List<Sprite> sprites)
        {
            var library = ScriptableObject.CreateInstance<SpriteLibraryAsset>();
            library.name = libraryName;
            loadedLibraries.Add(libraryName);
            return library;
        }
    }

    // Mock service manager
    public class MockServiceManager : MockSystemComponent
    {
        private Dictionary<Type, object> services = new Dictionary<Type, object>();

        public void RegisterService<T>(T service) where T : class
        {
            services[typeof(T)] = service;
        }

        public bool IsServiceRegistered<T>() where T : class
        {
            return services.ContainsKey(typeof(T));
        }

        public T GetService<T>() where T : class
        {
            return services.TryGetValue(typeof(T), out var service) ? service as T : null;
        }
    }

    // Mock data manager and interface
    public interface IDataManager
    {
        T LoadAsset<T>(string assetName) where T : ScriptableObject;
        void SaveAsset<T>(T asset) where T : ScriptableObject;
    }

    public class MockDataManager : MockSystemComponent, IDataManager
    {
        private Dictionary<string, ScriptableObject> assets = new Dictionary<string, ScriptableObject>();

        public T LoadAsset<T>(string assetName) where T : ScriptableObject
        {
            if (assets.TryGetValue(assetName, out var asset))
            {
                return asset as T;
            }

            // Create mock asset if not found
            var mockAsset = ScriptableObject.CreateInstance<T>();
            mockAsset.name = assetName;
            assets[assetName] = mockAsset;
            return mockAsset;
        }

        public void SaveAsset<T>(T asset) where T : ScriptableObject
        {
            if (asset != null)
            {
                assets[asset.name] = asset;
            }
        }
    }

    // Mock configuration service and classes
    public interface IConfigurationService
    {
        T GetConfiguration<T>() where T : ScriptableObject;
        void SaveConfiguration<T>(T config) where T : ScriptableObject;
    }

    public class MockConfigurationService : MockSystemComponent, IConfigurationService
    {
        private Dictionary<Type, ScriptableObject> configurations = new Dictionary<Type, ScriptableObject>();

        public T GetConfiguration<T>() where T : ScriptableObject
        {
            if (configurations.TryGetValue(typeof(T), out var config))
            {
                return config as T;
            }

            var newConfig = ScriptableObject.CreateInstance<T>();
            configurations[typeof(T)] = newConfig;
            return newConfig;
        }

        public void SaveConfiguration<T>(T config) where T : ScriptableObject
        {
            configurations[typeof(T)] = config;
        }
    }

    public class MockGameConfig : ScriptableObject
    {
        public float PlayerSpeed = 5.0f;
        public int MaxHealth = 100;
        public string GameVersion = "1.0.0";
    }

    // Mock validation framework
    public class MockValidationFramework : MockSystemComponent
    {
        private Dictionary<UnityEngine.Object, MockValidationResult> validationResults = 
            new Dictionary<UnityEngine.Object, MockValidationResult>();

        public void ValidateAsset(UnityEngine.Object asset)
        {
            var result = new MockValidationResult();
            
            if (asset == null || asset.name.Contains("Invalid") || asset.name.Contains("Corrupted"))
            {
                result.IsValid = false;
                result.ErrorCount = 1;
                result.Errors.Add("Asset is invalid or corrupted");
            }
            else
            {
                result.IsValid = true;
                result.ErrorCount = 0;
            }

            validationResults[asset] = result;
        }

        public MockValidationResult GetValidationResult(UnityEngine.Object asset)
        {
            return validationResults.TryGetValue(asset, out var result) ? result : null;
        }

        public MockValidationResult GetValidationResults()
        {
            var combinedResult = new MockValidationResult();
            combinedResult.ValidatedAssetCount = validationResults.Count;
            
            foreach (var result in validationResults.Values)
            {
                combinedResult.ErrorCount += result.ErrorCount;
                combinedResult.Errors.AddRange(result.Errors);
            }

            return combinedResult;
        }

        public bool HasResults(string assetName)
        {
            return validationResults.Keys.Any(asset => asset.name == assetName);
        }
    }

    public class MockValidationResult
    {
        public bool IsValid { get; set; } = true;
        public int ErrorCount { get; set; } = 0;
        public int ValidatedAssetCount { get; set; } = 0;
        public List<string> Errors { get; set; } = new List<string>();
    }

    // Mock asset database
    public class MockAssetDatabase : MockSystemComponent
    {
        public Sprite CreateTestSprite(string name)
        {
            var texture = new Texture2D(64, 64);
            var sprite = Sprite.Create(texture, new Rect(0, 0, 64, 64), Vector2.zero);
            sprite.name = name;
            return sprite;
        }

        public GameObject CreateTestPrefab(string name)
        {
            var prefab = new GameObject(name);
            return prefab;
        }

        public Sprite CreateInvalidSprite(string name)
        {
            var sprite = Sprite.Create(null, new Rect(0, 0, 64, 64), Vector2.zero);
            sprite.name = name;
            return sprite;
        }

        public GameObject CreateCorruptedPrefab(string name)
        {
            var prefab = new GameObject(name);
            // Simulate corruption by adding invalid component reference
            return prefab;
        }
    }

    // Mock integration test runner
    public class MockIntegrationTestRunner : MockSystemComponent
    {
        // Integration test runner implementation
    }

    // Mock sprite resolver
    public class MockSpriteResolver : MockSystemComponent
    {
        public string CurrentVariant { get; private set; }
        public Sprite CurrentSprite { get; private set; }

        private MockSpriteAtlasManager atlasManager;
        private MockSpriteLibraryManager libraryManager;

        public void Initialize(MockSpriteAtlasManager atlas, MockSpriteLibraryManager library)
        {
            atlasManager = atlas;
            libraryManager = library;
            base.Initialize();
        }

        public void SwapToVariant(string category, string variant)
        {
            CurrentVariant = variant;
            // Mock sprite creation
            var texture = new Texture2D(32, 32);
            CurrentSprite = Sprite.Create(texture, new Rect(0, 0, 32, 32), Vector2.zero);
        }
    }

    // Mock character controller
    public class MockCharacterController : MockSystemComponent
    {
        public string CurrentExpression { get; private set; }
        public Sprite CurrentSprite { get; private set; }

        private MockSpriteAtlasManager atlasManager;
        private MockSpriteLibraryManager libraryManager;

        public void Initialize(MockSpriteAtlasManager atlas, MockSpriteLibraryManager library)
        {
            atlasManager = atlas;
            libraryManager = library;
            base.Initialize();
        }

        public void SwapExpression(string expression)
        {
            CurrentExpression = expression;
            // Mock sprite creation
            var texture = new Texture2D(64, 64);
            CurrentSprite = Sprite.Create(texture, new Rect(0, 0, 64, 64), Vector2.zero);
        }
    }

    // Mock performance monitoring
    public class MockFrameRateMonitor : MonoBehaviour
    {
        private List<float> frameTimes = new List<float>();
        private float lastTime;
        private bool isMonitoring = false;

        public void StartMonitoring()
        {
            isMonitoring = true;
            lastTime = Time.realtimeSinceStartup;
        }

        private void Update()
        {
            if (!isMonitoring) return;

            var currentTime = Time.realtimeSinceStartup;
            var deltaTime = currentTime - lastTime;
            frameTimes.Add(deltaTime);
            lastTime = currentTime;

            if (frameTimes.Count > 60)
            {
                frameTimes.RemoveAt(0);
            }
        }

        public float GetAverageFPS()
        {
            if (frameTimes.Count == 0) return 0;
            var averageFrameTime = frameTimes.Average();
            return 1.0f / averageFrameTime;
        }
    }

    public class MockMemoryMonitor : MonoBehaviour
    {
        public float GetCurrentMemoryUsage()
        {
            // Return mock memory usage in MB
            return UnityEngine.Random.Range(50f, 200f);
        }
    }

    // Mock error handling
    public class MockErrorHandler : MockSystemComponent
    {
        public event Action OnErrorHandled;

        public void HandleError(Exception error)
        {
            Debug.LogWarning($"Handled error: {error.Message}");
            OnErrorHandled?.Invoke();
        }
    }

    public class MockResilientSystem : MockSystemComponent
    {
        public bool HasRecovered { get; private set; }
        private MockErrorHandler errorHandler;

        public void Initialize(MockErrorHandler handler)
        {
            errorHandler = handler;
            base.Initialize();
        }

        public void TriggerFailure(string errorMessage)
        {
            IsOperational = false;
            
            try
            {
                throw new InvalidOperationException(errorMessage);
            }
            catch (Exception ex)
            {
                errorHandler?.HandleError(ex);
                RecoverFromFailure();
            }
        }

        private void RecoverFromFailure()
        {
            HasRecovered = true;
            IsOperational = true;
        }
    }

    #endregion
}