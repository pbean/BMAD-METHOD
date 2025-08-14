// Assets/Tests/EditMode/ScriptableObjectSetupTests.cs
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEditor;

namespace BMAD.Unity.Tests.EditMode
{
    /// <summary>
    /// Comprehensive test suite for ScriptableObject Setup and Data Architecture systems
    /// Tests data serialization, configuration management, asset creation, and validation
    /// </summary>
    [TestFixture]
    public class ScriptableObjectSetupTests
    {
        private TestDataManager dataManager;
        private List<TestScriptableObject> testAssets;
        private string testAssetPath = "Assets/Tests/TestData/";

        [SetUp]
        public void Setup()
        {
            // Create test data manager
            dataManager = ScriptableObject.CreateInstance<TestDataManager>();
            dataManager.Initialize();

            // Create test assets list
            testAssets = new List<TestScriptableObject>();

            // Ensure test directory exists
            if (!AssetDatabase.IsValidFolder(testAssetPath))
            {
                AssetDatabase.CreateFolder("Assets/Tests", "TestData");
            }
        }

        [TearDown]
        public void TearDown()
        {
            // Cleanup test assets
            foreach (var asset in testAssets)
            {
                if (asset != null)
                {
                    var assetPath = AssetDatabase.GetAssetPath(asset);
                    if (!string.IsNullOrEmpty(assetPath))
                    {
                        AssetDatabase.DeleteAsset(assetPath);
                    }
                    else
                    {
                        ScriptableObject.DestroyImmediate(asset);
                    }
                }
            }

            // Cleanup data manager
            if (dataManager != null)
            {
                ScriptableObject.DestroyImmediate(dataManager);
            }

            // Clean test directory
            if (AssetDatabase.IsValidFolder(testAssetPath))
            {
                AssetDatabase.DeleteAsset(testAssetPath);
            }

            AssetDatabase.Refresh();
        }

        #region ScriptableObject Creation Tests

        [Test]
        public void ScriptableObject_CreateInstance_CreatesCorrectly()
        {
            // Act
            var testObject = ScriptableObject.CreateInstance<TestScriptableObject>();
            testAssets.Add(testObject);

            // Assert
            Assert.IsNotNull(testObject, "ScriptableObject should be created");
            Assert.IsInstanceOf<TestScriptableObject>(testObject, "Should be correct type");
            Assert.AreEqual("TestScriptableObject", testObject.GetType().Name, "Should have correct type name");
        }

        [Test]
        public void ScriptableObject_CreateAsset_SavesCorrectly()
        {
            // Arrange
            var testObject = ScriptableObject.CreateInstance<TestScriptableObject>();
            testObject.TestValue = 42;
            testObject.TestName = "Test Asset";
            testAssets.Add(testObject);

            var assetPath = testAssetPath + "TestAsset.asset";

            // Act
            AssetDatabase.CreateAsset(testObject, assetPath);
            AssetDatabase.SaveAssets();

            // Assert
            Assert.IsTrue(AssetDatabase.LoadAssetAtPath<TestScriptableObject>(assetPath) != null, "Asset should be saved");
            var loadedAsset = AssetDatabase.LoadAssetAtPath<TestScriptableObject>(assetPath);
            Assert.AreEqual(42, loadedAsset.TestValue, "Value should be preserved");
            Assert.AreEqual("Test Asset", loadedAsset.TestName, "Name should be preserved");
        }

        [Test]
        public void ScriptableObject_Serialization_PreservesData()
        {
            // Arrange
            var testObject = ScriptableObject.CreateInstance<TestScriptableObject>();
            testObject.TestValue = 100;
            testObject.TestName = "Serialization Test";
            testObject.TestList = new List<string> { "Item1", "Item2", "Item3" };
            testObject.TestData = new TestSerializableData
            {
                IntValue = 50,
                FloatValue = 3.14f,
                BoolValue = true
            };
            testAssets.Add(testObject);

            // Act
            string json = JsonUtility.ToJson(testObject);
            var deserializedObject = ScriptableObject.CreateInstance<TestScriptableObject>();
            JsonUtility.FromJsonOverwrite(json, deserializedObject);
            testAssets.Add(deserializedObject);

            // Assert
            Assert.AreEqual(testObject.TestValue, deserializedObject.TestValue, "TestValue should be preserved");
            Assert.AreEqual(testObject.TestName, deserializedObject.TestName, "TestName should be preserved");
            Assert.AreEqual(testObject.TestList.Count, deserializedObject.TestList.Count, "List count should match");
            Assert.AreEqual(testObject.TestData.IntValue, deserializedObject.TestData.IntValue, "Nested data should be preserved");
        }

        #endregion

        #region Data Management Tests

        [Test]
        public void DataManager_Initialize_SetsUpCorrectly()
        {
            // Assert
            Assert.IsTrue(dataManager.IsInitialized, "DataManager should be initialized");
            Assert.AreEqual(DataManagerState.Ready, dataManager.State, "Should be in Ready state");
            Assert.IsNotNull(dataManager.Configuration, "Configuration should be loaded");
        }

        [Test]
        public void DataManager_RegisterAsset_TracksAsset()
        {
            // Arrange
            var testAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            testAssets.Add(testAsset);

            // Act
            dataManager.RegisterAsset(testAsset);

            // Assert
            Assert.IsTrue(dataManager.IsAssetRegistered(testAsset), "Asset should be registered");
            Assert.Contains(testAsset, dataManager.GetRegisteredAssets().ToArray(), "Asset should be in registry");
        }

        [Test]
        public void DataManager_UnregisterAsset_RemovesFromTracking()
        {
            // Arrange
            var testAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            testAssets.Add(testAsset);
            dataManager.RegisterAsset(testAsset);

            // Act
            dataManager.UnregisterAsset(testAsset);

            // Assert
            Assert.IsFalse(dataManager.IsAssetRegistered(testAsset), "Asset should be unregistered");
            Assert.IsFalse(dataManager.GetRegisteredAssets().Contains(testAsset), "Asset should not be in registry");
        }

        [Test]
        public void DataManager_LoadAsset_ReturnsCorrectAsset()
        {
            // Arrange
            var testAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            testAsset.name = "TestLoadAsset";
            testAssets.Add(testAsset);
            
            var assetPath = testAssetPath + "TestLoadAsset.asset";
            AssetDatabase.CreateAsset(testAsset, assetPath);
            AssetDatabase.SaveAssets();

            // Act
            var loadedAsset = dataManager.LoadAsset<TestScriptableObject>("TestLoadAsset");

            // Assert
            Assert.IsNotNull(loadedAsset, "Asset should be loaded");
            Assert.AreEqual("TestLoadAsset", loadedAsset.name, "Asset name should match");
        }

        [Test]
        public void DataManager_SaveAsset_PersistsChanges()
        {
            // Arrange
            var testAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            testAsset.TestValue = 50;
            testAssets.Add(testAsset);
            
            var assetPath = testAssetPath + "TestSaveAsset.asset";
            AssetDatabase.CreateAsset(testAsset, assetPath);

            // Act
            testAsset.TestValue = 75;
            dataManager.SaveAsset(testAsset);

            // Reload asset to verify persistence
            AssetDatabase.Refresh();
            var reloadedAsset = AssetDatabase.LoadAssetAtPath<TestScriptableObject>(assetPath);

            // Assert
            Assert.AreEqual(75, reloadedAsset.TestValue, "Changes should be persisted");
        }

        [Test]
        public void DataManager_CreateAsset_GeneratesNewAsset()
        {
            // Act
            var createdAsset = dataManager.CreateAsset<TestScriptableObject>("CreatedAsset");
            testAssets.Add(createdAsset);

            // Assert
            Assert.IsNotNull(createdAsset, "Asset should be created");
            Assert.AreEqual("CreatedAsset", createdAsset.name, "Asset should have correct name");
            Assert.IsTrue(dataManager.IsAssetRegistered(createdAsset), "Created asset should be registered");
        }

        #endregion

        #region Configuration Management Tests

        [Test]
        public void Configuration_LoadDefault_LoadsCorrectValues()
        {
            // Arrange
            var config = ScriptableObject.CreateInstance<TestConfiguration>();
            testAssets.Add(config);

            // Act
            config.LoadDefaults();

            // Assert
            Assert.AreEqual("Default", config.DefaultName, "Should load default name");
            Assert.AreEqual(10, config.DefaultValue, "Should load default value");
            Assert.IsTrue(config.DefaultEnabled, "Should load default enabled state");
        }

        [Test]
        public void Configuration_Validate_DetectsInvalidSettings()
        {
            // Arrange
            var config = ScriptableObject.CreateInstance<TestConfiguration>();
            config.DefaultValue = -5; // Invalid value
            testAssets.Add(config);

            // Act
            var validationResult = config.Validate();

            // Assert
            Assert.IsFalse(validationResult.IsValid, "Should detect invalid configuration");
            Assert.Greater(validationResult.Errors.Count, 0, "Should have validation errors");
        }

        [Test]
        public void Configuration_ApplySettings_UpdatesSystem()
        {
            // Arrange
            var config = ScriptableObject.CreateInstance<TestConfiguration>();
            config.DefaultValue = 25;
            testAssets.Add(config);

            // Act
            config.ApplySettings();

            // Assert
            // In a real implementation, this would verify that the configuration
            // has been applied to the relevant systems
            Assert.IsTrue(config.IsApplied, "Configuration should be applied");
        }

        [Test]
        public void Configuration_ResetToDefaults_RestoresDefaultValues()
        {
            // Arrange
            var config = ScriptableObject.CreateInstance<TestConfiguration>();
            config.DefaultValue = 99;
            config.DefaultName = "Modified";
            testAssets.Add(config);

            // Act
            config.ResetToDefaults();

            // Assert
            Assert.AreEqual("Default", config.DefaultName, "Name should be reset to default");
            Assert.AreEqual(10, config.DefaultValue, "Value should be reset to default");
        }

        #endregion

        #region Asset Reference Tests

        [Test]
        public void AssetReference_ResolveReference_ReturnsCorrectAsset()
        {
            // Arrange
            var targetAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            testAssets.Add(targetAsset);
            
            var assetPath = testAssetPath + "TargetAsset.asset";
            AssetDatabase.CreateAsset(targetAsset, assetPath);
            AssetDatabase.SaveAssets();

            var assetReference = new TestAssetReference();
            assetReference.AssetGUID = AssetDatabase.AssetPathToGUID(assetPath);

            // Act
            var resolvedAsset = assetReference.ResolveReference<TestScriptableObject>();

            // Assert
            Assert.IsNotNull(resolvedAsset, "Reference should resolve to asset");
            Assert.AreSame(targetAsset, resolvedAsset, "Should return the same asset instance");
        }

        [Test]
        public void AssetReference_IsValid_DetectsValidReference()
        {
            // Arrange
            var targetAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            testAssets.Add(targetAsset);
            
            var assetPath = testAssetPath + "ValidAsset.asset";
            AssetDatabase.CreateAsset(targetAsset, assetPath);
            AssetDatabase.SaveAssets();

            var validReference = new TestAssetReference();
            validReference.AssetGUID = AssetDatabase.AssetPathToGUID(assetPath);

            var invalidReference = new TestAssetReference();
            invalidReference.AssetGUID = "invalid-guid";

            // Act & Assert
            Assert.IsTrue(validReference.IsValid(), "Valid reference should be detected");
            Assert.IsFalse(invalidReference.IsValid(), "Invalid reference should be detected");
        }

        [Test]
        public void AssetReference_SetReference_UpdatesGUID()
        {
            // Arrange
            var targetAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            testAssets.Add(targetAsset);
            
            var assetPath = testAssetPath + "RefAsset.asset";
            AssetDatabase.CreateAsset(targetAsset, assetPath);
            AssetDatabase.SaveAssets();

            var assetReference = new TestAssetReference();

            // Act
            assetReference.SetReference(targetAsset);

            // Assert
            var expectedGUID = AssetDatabase.AssetPathToGUID(assetPath);
            Assert.AreEqual(expectedGUID, assetReference.AssetGUID, "GUID should be set correctly");
        }

        #endregion

        #region Data Validation Tests

        [Test]
        public void DataValidator_ValidateAsset_DetectsValidAsset()
        {
            // Arrange
            var validator = new TestDataValidator();
            var validAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            validAsset.TestValue = 50;
            validAsset.TestName = "Valid Asset";
            testAssets.Add(validAsset);

            // Act
            var result = validator.ValidateAsset(validAsset);

            // Assert
            Assert.IsNotNull(result, "Should return validation result");
            Assert.IsTrue(result.IsValid, "Valid asset should pass validation");
            Assert.AreEqual(0, result.Errors.Count, "Should have no errors");
        }

        [Test]
        public void DataValidator_ValidateAsset_DetectsInvalidAsset()
        {
            // Arrange
            var validator = new TestDataValidator();
            var invalidAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            invalidAsset.TestValue = -1; // Invalid value
            invalidAsset.TestName = ""; // Invalid name
            testAssets.Add(invalidAsset);

            // Act
            var result = validator.ValidateAsset(invalidAsset);

            // Assert
            Assert.IsNotNull(result, "Should return validation result");
            Assert.IsFalse(result.IsValid, "Invalid asset should fail validation");
            Assert.Greater(result.Errors.Count, 0, "Should have validation errors");
        }

        [Test]
        public void DataValidator_ValidateAllAssets_ProcessesMultipleAssets()
        {
            // Arrange
            var validator = new TestDataValidator();
            
            var validAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            validAsset.TestValue = 50;
            validAsset.TestName = "Valid";
            testAssets.Add(validAsset);

            var invalidAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            invalidAsset.TestValue = -1;
            invalidAsset.TestName = "";
            testAssets.Add(invalidAsset);

            var assetsToValidate = new List<ScriptableObject> { validAsset, invalidAsset };

            // Act
            var results = validator.ValidateAllAssets(assetsToValidate);

            // Assert
            Assert.AreEqual(2, results.Count, "Should validate all assets");
            Assert.IsTrue(results[0].IsValid, "First asset should be valid");
            Assert.IsFalse(results[1].IsValid, "Second asset should be invalid");
        }

        #endregion

        #region Performance Tests

        [Test]
        public void ScriptableObject_LargeDataSerialization_PerformsWell()
        {
            // Arrange
            var largeAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            largeAsset.TestList = new List<string>();
            for (int i = 0; i < 1000; i++)
            {
                largeAsset.TestList.Add($"Item_{i}");
            }
            testAssets.Add(largeAsset);

            var startTime = Time.realtimeSinceStartup;

            // Act
            string json = JsonUtility.ToJson(largeAsset);
            var deserializedAsset = ScriptableObject.CreateInstance<TestScriptableObject>();
            JsonUtility.FromJsonOverwrite(json, deserializedAsset);
            testAssets.Add(deserializedAsset);

            var endTime = Time.realtimeSinceStartup;
            var serializationTime = endTime - startTime;

            // Assert
            Assert.Less(serializationTime, 0.1f, "Large data serialization should complete within 0.1 seconds");
            Assert.AreEqual(1000, deserializedAsset.TestList.Count, "All data should be preserved");
        }

        [Test]
        public void DataManager_MultipleAssetOperations_PerformsWell()
        {
            // Arrange
            var startTime = Time.realtimeSinceStartup;

            // Act
            for (int i = 0; i < 100; i++)
            {
                var asset = dataManager.CreateAsset<TestScriptableObject>($"PerfTest_{i}");
                testAssets.Add(asset);
                dataManager.RegisterAsset(asset);
            }

            var endTime = Time.realtimeSinceStartup;
            var operationTime = endTime - startTime;

            // Assert
            Assert.Less(operationTime, 1.0f, "100 asset operations should complete within 1 second");
            Assert.AreEqual(100, dataManager.GetRegisteredAssets().Count(), "All assets should be registered");
        }

        #endregion
    }

    #region Test Implementation Classes

    // Test ScriptableObject
    [CreateAssetMenu(fileName = "TestScriptableObject", menuName = "Test/ScriptableObject")]
    public class TestScriptableObject : ScriptableObject
    {
        [SerializeField] public int TestValue;
        [SerializeField] public string TestName;
        [SerializeField] public List<string> TestList = new List<string>();
        [SerializeField] public TestSerializableData TestData = new TestSerializableData();
    }

    // Test serializable data class
    [Serializable]
    public class TestSerializableData
    {
        public int IntValue;
        public float FloatValue;
        public bool BoolValue;
        public Vector3 VectorValue;
        public Color ColorValue;
    }

    // Test data manager
    public enum DataManagerState { Uninitialized, Loading, Ready, Error }

    public class TestDataManager : ScriptableObject
    {
        [SerializeField] private List<ScriptableObject> registeredAssets = new List<ScriptableObject>();
        [SerializeField] private TestConfiguration configuration;

        public bool IsInitialized { get; private set; }
        public DataManagerState State { get; private set; }
        public TestConfiguration Configuration => configuration;

        public void Initialize()
        {
            IsInitialized = true;
            State = DataManagerState.Ready;
            configuration = ScriptableObject.CreateInstance<TestConfiguration>();
            configuration.LoadDefaults();
        }

        public void RegisterAsset(ScriptableObject asset)
        {
            if (asset != null && !registeredAssets.Contains(asset))
            {
                registeredAssets.Add(asset);
            }
        }

        public void UnregisterAsset(ScriptableObject asset)
        {
            registeredAssets.Remove(asset);
        }

        public bool IsAssetRegistered(ScriptableObject asset)
        {
            return registeredAssets.Contains(asset);
        }

        public IEnumerable<ScriptableObject> GetRegisteredAssets()
        {
            return registeredAssets.AsReadOnly();
        }

        public T LoadAsset<T>(string assetName) where T : ScriptableObject
        {
            // In a real implementation, this would search for assets by name
            var guids = AssetDatabase.FindAssets($"{assetName} t:{typeof(T).Name}");
            if (guids.Length > 0)
            {
                var assetPath = AssetDatabase.GUIDToAssetPath(guids[0]);
                return AssetDatabase.LoadAssetAtPath<T>(assetPath);
            }
            return null;
        }

        public void SaveAsset(ScriptableObject asset)
        {
            if (asset != null)
            {
                EditorUtility.SetDirty(asset);
                AssetDatabase.SaveAssets();
            }
        }

        public T CreateAsset<T>(string assetName) where T : ScriptableObject
        {
            var asset = ScriptableObject.CreateInstance<T>();
            asset.name = assetName;
            RegisterAsset(asset);
            return asset;
        }
    }

    // Test configuration
    public class TestConfiguration : ScriptableObject
    {
        [SerializeField] public string DefaultName = "Default";
        [SerializeField] public int DefaultValue = 10;
        [SerializeField] public bool DefaultEnabled = true;
        [SerializeField] public bool IsApplied = false;

        public void LoadDefaults()
        {
            DefaultName = "Default";
            DefaultValue = 10;
            DefaultEnabled = true;
        }

        public ValidationResult Validate()
        {
            var result = new ValidationResult { IsValid = true };

            if (DefaultValue < 0)
            {
                result.IsValid = false;
                result.Errors.Add("DefaultValue cannot be negative");
            }

            if (string.IsNullOrEmpty(DefaultName))
            {
                result.IsValid = false;
                result.Errors.Add("DefaultName cannot be empty");
            }

            return result;
        }

        public void ApplySettings()
        {
            // In a real implementation, this would apply settings to relevant systems
            IsApplied = true;
        }

        public void ResetToDefaults()
        {
            LoadDefaults();
        }
    }

    // Test asset reference
    public class TestAssetReference
    {
        [SerializeField] public string AssetGUID;

        public T ResolveReference<T>() where T : UnityEngine.Object
        {
            if (string.IsNullOrEmpty(AssetGUID))
                return null;

            var assetPath = AssetDatabase.GUIDToAssetPath(AssetGUID);
            return AssetDatabase.LoadAssetAtPath<T>(assetPath);
        }

        public bool IsValid()
        {
            if (string.IsNullOrEmpty(AssetGUID))
                return false;

            var assetPath = AssetDatabase.GUIDToAssetPath(AssetGUID);
            return !string.IsNullOrEmpty(assetPath);
        }

        public void SetReference(UnityEngine.Object asset)
        {
            if (asset != null)
            {
                var assetPath = AssetDatabase.GetAssetPath(asset);
                AssetGUID = AssetDatabase.AssetPathToGUID(assetPath);
            }
            else
            {
                AssetGUID = string.Empty;
            }
        }
    }

    // Test data validator
    public class TestDataValidator
    {
        public ValidationResult ValidateAsset(ScriptableObject asset)
        {
            var result = new ValidationResult { IsValid = true };

            if (asset == null)
            {
                result.IsValid = false;
                result.Errors.Add("Asset is null");
                return result;
            }

            if (asset is TestScriptableObject testAsset)
            {
                if (testAsset.TestValue < 0)
                {
                    result.IsValid = false;
                    result.Errors.Add("TestValue cannot be negative");
                }

                if (string.IsNullOrEmpty(testAsset.TestName))
                {
                    result.IsValid = false;
                    result.Errors.Add("TestName cannot be empty");
                }
            }

            return result;
        }

        public List<ValidationResult> ValidateAllAssets(List<ScriptableObject> assets)
        {
            return assets.Select(ValidateAsset).ToList();
        }
    }

    // Supporting classes
    public class ValidationResult
    {
        public bool IsValid { get; set; } = true;
        public List<string> Errors { get; set; } = new List<string>();
        public List<string> Warnings { get; set; } = new List<string>();
        public List<string> Info { get; set; } = new List<string>();
    }

    #endregion
}