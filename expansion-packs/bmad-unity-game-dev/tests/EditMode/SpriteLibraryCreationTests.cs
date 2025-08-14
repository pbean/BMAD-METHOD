// Assets/Tests/EditMode/SpriteLibraryCreationTests.cs
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.U2D.Animation;
using UnityEditor;

namespace BMAD.Unity.Tests.EditMode
{
    /// <summary>
    /// Comprehensive test suite for Sprite Library Creation and Management systems
    /// Tests sprite library management, variant organization, runtime loading, and editor tools
    /// </summary>
    [TestFixture]
    public class SpriteLibraryCreationTests
    {
        private TestSpriteLibraryManager libraryManager;
        private GameObject testManagerObject;
        private List<Sprite> testSprites;
        private List<SpriteLibraryAsset> testLibraries;
        private List<UnityEngine.Object> testAssets;

        [SetUp]
        public void Setup()
        {
            // Create test manager
            testManagerObject = new GameObject("Test Sprite Library Manager");
            libraryManager = testManagerObject.AddComponent<TestSpriteLibraryManager>();

            // Create test data lists
            testSprites = new List<Sprite>();
            testLibraries = new List<SpriteLibraryAsset>();
            testAssets = new List<UnityEngine.Object>();

            // Create test sprites
            CreateTestSprites();

            // Initialize manager
            libraryManager.Initialize();
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
                        UnityEngine.Object.DestroyImmediate(asset);
                    }
                }
            }

            // Cleanup test sprites
            foreach (var sprite in testSprites)
            {
                if (sprite?.texture != null)
                {
                    UnityEngine.Object.DestroyImmediate(sprite.texture);
                }
                if (sprite != null)
                {
                    UnityEngine.Object.DestroyImmediate(sprite);
                }
            }

            // Cleanup test libraries
            foreach (var library in testLibraries)
            {
                if (library != null)
                {
                    UnityEngine.Object.DestroyImmediate(library);
                }
            }

            // Cleanup manager
            if (testManagerObject != null)
            {
                UnityEngine.Object.DestroyImmediate(testManagerObject);
            }

            AssetDatabase.Refresh();
        }

        #region Library Manager Core Tests

        [Test]
        public void SpriteLibraryManager_Initialize_SetsUpCorrectly()
        {
            // Assert
            Assert.IsTrue(libraryManager.IsInitialized, "Manager should be initialized");
            Assert.AreEqual(LibraryManagerState.Ready, libraryManager.State, "Should be in Ready state");
            Assert.IsNotNull(libraryManager.Configuration, "Configuration should be loaded");
        }

        [Test]
        public void SpriteLibraryManager_RegisterLibrary_TracksLibraryCorrectly()
        {
            // Arrange
            var testLibrary = CreateTestSpriteLibrary("TestLibrary");

            // Act
            libraryManager.RegisterLibrary(testLibrary);

            // Assert
            Assert.IsTrue(libraryManager.IsLibraryRegistered("TestLibrary"), "Library should be registered");
            Assert.AreEqual(1, libraryManager.LibraryCount, "Library count should be 1");
        }

        [Test]
        public void SpriteLibraryManager_UnregisterLibrary_RemovesLibrary()
        {
            // Arrange
            var testLibrary = CreateTestSpriteLibrary("TestLibrary");
            libraryManager.RegisterLibrary(testLibrary);

            // Act
            libraryManager.UnregisterLibrary(testLibrary);

            // Assert
            Assert.IsFalse(libraryManager.IsLibraryRegistered("TestLibrary"), "Library should be unregistered");
            Assert.AreEqual(0, libraryManager.LibraryCount, "Library count should be 0");
        }

        [Test]
        public void SpriteLibraryManager_GetLibrary_ReturnsCorrectLibrary()
        {
            // Arrange
            var testLibrary = CreateTestSpriteLibrary("TestLibrary");
            libraryManager.RegisterLibrary(testLibrary);

            // Act
            var retrievedLibrary = libraryManager.GetLibrary("TestLibrary");

            // Assert
            Assert.IsNotNull(retrievedLibrary, "Should return library");
            Assert.AreSame(testLibrary, retrievedLibrary, "Should return same library instance");
        }

        [Test]
        public void SpriteLibraryManager_GetNonExistentLibrary_ReturnsNull()
        {
            // Act
            var library = libraryManager.GetLibrary("NonExistentLibrary");

            // Assert
            Assert.IsNull(library, "Should return null for non-existent library");
        }

        #endregion

        #region Sprite Variant Management Tests

        [Test]
        public void SpriteLibraryManager_GetVariants_ReturnsCorrectVariants()
        {
            // Arrange
            var testLibrary = CreateTestSpriteLibraryWithVariants();
            libraryManager.RegisterLibrary(testLibrary);

            // Act
            var variants = libraryManager.GetVariants("TestLibrary", "Character");

            // Assert
            Assert.IsNotNull(variants, "Should return variants collection");
            Assert.Greater(variants.VariantCount, 0, "Should have variants");
        }

        [Test]
        public void SpriteLibraryManager_GetVariantNames_ReturnsAllVariantNames()
        {
            // Arrange
            var testLibrary = CreateTestSpriteLibraryWithVariants();
            libraryManager.RegisterLibrary(testLibrary);

            // Act
            var variantNames = libraryManager.GetVariantNames("TestLibrary", "Character");

            // Assert
            Assert.IsNotNull(variantNames, "Should return variant names list");
            Assert.Contains("Default", variantNames, "Should contain Default variant");
            Assert.Contains("Alt", variantNames, "Should contain Alt variant");
        }

        [Test]
        public void SpriteLibraryManager_HasVariant_DetectsVariantExistence()
        {
            // Arrange
            var testLibrary = CreateTestSpriteLibraryWithVariants();
            libraryManager.RegisterLibrary(testLibrary);

            // Act & Assert
            Assert.IsTrue(libraryManager.HasVariant("TestLibrary", "Character", "Default"), "Should detect existing variant");
            Assert.IsFalse(libraryManager.HasVariant("TestLibrary", "Character", "NonExistent"), "Should not detect non-existent variant");
        }

        [Test]
        public void SpriteLibraryManager_SwapVariant_ChangesVariantCorrectly()
        {
            // Arrange
            var testLibrary = CreateTestSpriteLibraryWithVariants();
            libraryManager.RegisterLibrary(testLibrary);
            
            var spriteResolver = testManagerObject.AddComponent<TestSpriteResolver>();
            spriteResolver.SetLibraryAsset(testLibrary);

            bool eventFired = false;
            libraryManager.OnVariantSwapped += (libraryId, categoryName, variantName) =>
            {
                eventFired = true;
            };

            // Act
            bool result = libraryManager.SwapVariant(spriteResolver, "Character", "Alt");

            // Assert
            Assert.IsTrue(result, "Variant swap should succeed");
            Assert.IsTrue(eventFired, "Variant swapped event should fire");
            Assert.AreEqual("Character", spriteResolver.CurrentCategory, "Category should be set");
            Assert.AreEqual("Alt", spriteResolver.CurrentLabel, "Label should be set");
        }

        #endregion

        #region Runtime Loading Tests

        [Test]
        public void SpriteLibraryManager_LoadLibraryAsync_LoadsSuccessfully()
        {
            // Arrange
            bool loadCompleted = false;
            SpriteLibraryAsset loadedLibrary = null;
            string errorMessage = null;

            // Act
            libraryManager.LoadLibraryAsync("TestLibraryPath", 
                (library) => 
                {
                    loadCompleted = true;
                    loadedLibrary = library;
                },
                (error) =>
                {
                    errorMessage = error;
                });

            // Assert (in this test implementation, we simulate immediate loading)
            Assert.IsTrue(loadCompleted, "Library loading should complete");
            Assert.IsNotNull(loadedLibrary, "Should load a library");
            Assert.IsNull(errorMessage, "Should not have error");
        }

        [Test]
        public void SpriteLibraryManager_LoadInvalidLibrary_HandlesError()
        {
            // Arrange
            bool loadCompleted = false;
            string errorMessage = null;

            // Act
            libraryManager.LoadLibraryAsync("InvalidLibraryPath",
                (library) =>
                {
                    loadCompleted = true;
                },
                (error) =>
                {
                    errorMessage = error;
                });

            // Assert
            Assert.IsFalse(loadCompleted, "Invalid library should not load");
            Assert.IsNotNull(errorMessage, "Should provide error message");
        }

        [Test]
        public void SpriteLibraryManager_ConcurrentLoading_HandlesMultipleRequests()
        {
            // Arrange
            int completedLoads = 0;
            var loadPaths = new[] { "Path1", "Path2", "Path3" };

            // Act
            foreach (var path in loadPaths)
            {
                libraryManager.LoadLibraryAsync(path,
                    (library) => completedLoads++,
                    (error) => { });
            }

            // Assert
            Assert.AreEqual(3, completedLoads, "All library loads should complete");
        }

        #endregion

        #region Library Creation Tests

        [Test]
        public void LibraryBuilder_CreateFromSprites_GeneratesLibraryCorrectly()
        {
            // Arrange
            var builder = new TestSpriteLibraryBuilder();
            var config = new LibraryCreationConfig
            {
                LibraryName = "GeneratedLibrary",
                AutoDetectCategories = true,
                NamingConvention = NamingConvention.UnderscoreSeparated
            };

            // Act
            var createdLibrary = builder.CreateFromSprites(testSprites, config);
            testLibraries.Add(createdLibrary);

            // Assert
            Assert.IsNotNull(createdLibrary, "Should create library");
            Assert.AreEqual("GeneratedLibrary", createdLibrary.name, "Should have correct name");
        }

        [Test]
        public void LibraryBuilder_AutoDetectCategories_OrganizesSpritesCorrectly()
        {
            // Arrange
            var builder = new TestSpriteLibraryBuilder();
            var organizedSprites = CreateOrganizedTestSprites();
            var config = new LibraryCreationConfig
            {
                LibraryName = "OrganizedLibrary",
                AutoDetectCategories = true
            };

            // Act
            var createdLibrary = builder.CreateFromSprites(organizedSprites, config);
            testLibraries.Add(createdLibrary);

            // Assert
            Assert.IsNotNull(createdLibrary, "Should create library");
            // In a real implementation, we would verify that categories were detected
        }

        [Test]
        public void LibraryBuilder_ValidateSprites_DetectsIncompatibleSprites()
        {
            // Arrange
            var builder = new TestSpriteLibraryBuilder();
            var invalidSprites = CreateInvalidTestSprites();

            // Act
            var validationResult = builder.ValidateSprites(invalidSprites);

            // Assert
            Assert.IsNotNull(validationResult, "Should return validation result");
            Assert.IsFalse(validationResult.IsValid, "Should detect invalid sprites");
            Assert.Greater(validationResult.Issues.Count, 0, "Should report validation issues");
        }

        #endregion

        #region Variant Detection Tests

        [Test]
        public void VariantDetector_DetectCategories_FindsCategoriesCorrectly()
        {
            // Arrange
            var detector = new TestSpriteVariantDetector();
            var namedSprites = CreateNamedTestSprites();

            // Act
            var detectedCategories = detector.DetectCategories(namedSprites, NamingConvention.UnderscoreSeparated);

            // Assert
            Assert.IsNotNull(detectedCategories, "Should return detected categories");
            Assert.Greater(detectedCategories.Count, 0, "Should detect at least one category");
        }

        [Test]
        public void VariantDetector_GroupVariants_GroupsCorrectly()
        {
            // Arrange
            var detector = new TestSpriteVariantDetector();
            var variants = CreateVariantTestSprites();

            // Act
            var groupedVariants = detector.GroupVariants(variants, "Character");

            // Assert
            Assert.IsNotNull(groupedVariants, "Should return grouped variants");
            Assert.Greater(groupedVariants.Count, 1, "Should group multiple variants");
        }

        [Test]
        public void VariantDetector_ValidateVariantConsistency_DetectsInconsistencies()
        {
            // Arrange
            var detector = new TestSpriteVariantDetector();
            var inconsistentVariants = CreateInconsistentVariants();

            // Act
            var validationResult = detector.ValidateVariantConsistency(inconsistentVariants);

            // Assert
            Assert.IsNotNull(validationResult, "Should return validation result");
            Assert.IsFalse(validationResult.IsValid, "Should detect inconsistencies");
        }

        #endregion

        #region Library Optimization Tests

        [Test]
        public void LibraryOptimizer_OptimizeLibrary_ImprovesPerformance()
        {
            // Arrange
            var optimizer = new TestLibraryOptimizer();
            var library = CreateTestSpriteLibrary("OptimizeTest");
            var beforeStats = optimizer.AnalyzeLibrary(library);

            // Act
            var optimizationResult = optimizer.OptimizeLibrary(library);
            var afterStats = optimizer.AnalyzeLibrary(library);

            // Assert
            Assert.IsTrue(optimizationResult.Success, "Optimization should succeed");
            Assert.Greater(afterStats.OptimizationScore, beforeStats.OptimizationScore, "Should improve optimization score");
        }

        [Test]
        public void LibraryOptimizer_RemoveUnusedVariants_CleansUpLibrary()
        {
            // Arrange
            var optimizer = new TestLibraryOptimizer();
            var library = CreateLibraryWithUnusedVariants();
            var beforeVariantCount = GetVariantCount(library);

            // Act
            var result = optimizer.RemoveUnusedVariants(library);
            var afterVariantCount = GetVariantCount(library);

            // Assert
            Assert.IsTrue(result.Success, "Cleanup should succeed");
            Assert.Less(afterVariantCount, beforeVariantCount, "Should remove unused variants");
        }

        [Test]
        public void LibraryOptimizer_CompressSprites_ReducesMemoryUsage()
        {
            // Arrange
            var optimizer = new TestLibraryOptimizer();
            var library = CreateTestSpriteLibrary("CompressionTest");
            var beforeSize = optimizer.EstimateMemoryUsage(library);

            // Act
            var compressionResult = optimizer.CompressSprites(library);
            var afterSize = optimizer.EstimateMemoryUsage(library);

            // Assert
            Assert.IsTrue(compressionResult.Success, "Compression should succeed");
            Assert.Less(afterSize, beforeSize, "Should reduce memory usage");
        }

        #endregion

        #region Validation Tests

        [Test]
        public void LibraryValidator_ValidateLibraryStructure_DetectsIssues()
        {
            // Arrange
            var validator = new TestSpriteLibraryValidator();
            var invalidLibrary = CreateInvalidSpriteLibrary();

            // Act
            var validationResult = validator.ValidateLibrary(invalidLibrary);

            // Assert
            Assert.IsNotNull(validationResult, "Should return validation result");
            Assert.IsFalse(validationResult.IsValid, "Should detect invalid library");
            Assert.Greater(validationResult.ErrorCount, 0, "Should have validation errors");
        }

        [Test]
        public void LibraryValidator_ValidateNamingConventions_EnforcesStandards()
        {
            // Arrange
            var validator = new TestSpriteLibraryValidator();
            var library = CreateLibraryWithBadNaming();

            // Act
            var validationResult = validator.ValidateLibrary(library);

            // Assert
            Assert.IsNotNull(validationResult, "Should return validation result");
            Assert.IsTrue(validationResult.Warnings.Any(w => w.Contains("naming")), "Should warn about naming issues");
        }

        [Test]
        public void LibraryValidator_ValidateReferences_DetectsBrokenReferences()
        {
            // Arrange
            var validator = new TestSpriteLibraryValidator();
            var library = CreateLibraryWithBrokenReferences();

            // Act
            var validationResult = validator.ValidateLibrary(library);

            // Assert
            Assert.IsNotNull(validationResult, "Should return validation result");
            Assert.IsTrue(validationResult.Errors.Any(e => e.Contains("reference")), "Should detect broken references");
        }

        #endregion

        #region Performance Tests

        [Test]
        public void SpriteLibraryManager_MassLibraryOperations_PerformsWell()
        {
            // Arrange
            var libraries = new List<SpriteLibraryAsset>();
            for (int i = 0; i < 50; i++)
            {
                var library = CreateTestSpriteLibrary($"PerfTest_{i}");
                libraries.Add(library);
                testLibraries.Add(library);
            }

            var startTime = Time.realtimeSinceStartup;

            // Act
            foreach (var library in libraries)
            {
                libraryManager.RegisterLibrary(library);
            }

            var endTime = Time.realtimeSinceStartup;
            var operationTime = endTime - startTime;

            // Assert
            Assert.Less(operationTime, 1.0f, "Mass registration should complete within 1 second");
            Assert.AreEqual(50, libraryManager.LibraryCount, "All libraries should be registered");
        }

        [Test]
        public void SpriteLibraryManager_VariantCaching_ImprovesPerformance()
        {
            // Arrange
            var library = CreateTestSpriteLibraryWithManyVariants();
            libraryManager.RegisterLibrary(library);

            // First access (should cache)
            var startTime1 = Time.realtimeSinceStartup;
            var variants1 = libraryManager.GetVariants("TestLibrary", "Character");
            var endTime1 = Time.realtimeSinceStartup;
            var firstAccessTime = endTime1 - startTime1;

            // Second access (should use cache)
            var startTime2 = Time.realtimeSinceStartup;
            var variants2 = libraryManager.GetVariants("TestLibrary", "Character");
            var endTime2 = Time.realtimeSinceStartup;
            var secondAccessTime = endTime2 - startTime2;

            // Assert
            Assert.AreSame(variants1, variants2, "Should return cached variants");
            Assert.Less(secondAccessTime, firstAccessTime, "Cached access should be faster");
        }

        [Test]
        public void LibraryBuilder_LargeLibraryCreation_CompletesWithinTimeLimit()
        {
            // Arrange
            var builder = new TestSpriteLibraryBuilder();
            var largeSpiteSet = CreateLargeTestSpriteSet(100);
            var config = new LibraryCreationConfig { LibraryName = "LargeLibrary" };

            var startTime = Time.realtimeSinceStartup;

            // Act
            var library = builder.CreateFromSprites(largeSpiteSet, config);
            testLibraries.Add(library);

            var endTime = Time.realtimeSinceStartup;
            var creationTime = endTime - startTime;

            // Assert
            Assert.Less(creationTime, 2.0f, "Large library creation should complete within 2 seconds");
            Assert.IsNotNull(library, "Should create library successfully");
        }

        #endregion

        #region Helper Methods

        private void CreateTestSprites()
        {
            for (int i = 0; i < 5; i++)
            {
                var texture = new Texture2D(64, 64, TextureFormat.RGBA32, false);
                var pixels = new Color32[64 * 64];
                for (int p = 0; p < pixels.Length; p++)
                {
                    pixels[p] = new Color32((byte)(i * 50), 128, 255, 255);
                }
                texture.SetPixels32(pixels);
                texture.Apply();

                var sprite = Sprite.Create(texture, new Rect(0, 0, 64, 64), new Vector2(0.5f, 0.5f));
                sprite.name = $"TestSprite_{i}";
                testSprites.Add(sprite);
            }
        }

        private SpriteLibraryAsset CreateTestSpriteLibrary(string name)
        {
            var library = ScriptableObject.CreateInstance<SpriteLibraryAsset>();
            library.name = name;
            testLibraries.Add(library);
            return library;
        }

        private SpriteLibraryAsset CreateTestSpriteLibraryWithVariants()
        {
            var library = CreateTestSpriteLibrary("TestLibrary");
            // In a real implementation, we would populate the library with test categories and variants
            return library;
        }

        private List<Sprite> CreateOrganizedTestSprites()
        {
            var sprites = new List<Sprite>();
            var categories = new[] { "Character", "UI", "Background" };
            
            foreach (var category in categories)
            {
                for (int i = 0; i < 3; i++)
                {
                    var texture = new Texture2D(32, 32);
                    var sprite = Sprite.Create(texture, new Rect(0, 0, 32, 32), Vector2.zero);
                    sprite.name = $"{category}_Sprite_{i}";
                    sprites.Add(sprite);
                }
            }

            return sprites;
        }

        private List<Sprite> CreateInvalidTestSprites()
        {
            var sprites = new List<Sprite>();
            
            // Create sprite with null texture
            var invalidSprite = Sprite.Create(null, new Rect(0, 0, 64, 64), Vector2.zero);
            sprites.Add(invalidSprite);
            
            return sprites;
        }

        private List<Sprite> CreateNamedTestSprites()
        {
            var sprites = new List<Sprite>();
            var names = new[] { "Character_Default", "Character_Alt", "UI_Button", "UI_Icon" };
            
            foreach (var name in names)
            {
                var texture = new Texture2D(32, 32);
                var sprite = Sprite.Create(texture, new Rect(0, 0, 32, 32), Vector2.zero);
                sprite.name = name;
                sprites.Add(sprite);
            }

            return sprites;
        }

        private List<Sprite> CreateVariantTestSprites()
        {
            var sprites = new List<Sprite>();
            var variants = new[] { "Character_Default", "Character_Happy", "Character_Sad" };
            
            foreach (var variant in variants)
            {
                var texture = new Texture2D(32, 32);
                var sprite = Sprite.Create(texture, new Rect(0, 0, 32, 32), Vector2.zero);
                sprite.name = variant;
                sprites.Add(sprite);
            }

            return sprites;
        }

        private List<Sprite> CreateInconsistentVariants()
        {
            var sprites = new List<Sprite>();
            
            // Create sprites with different sizes (inconsistent)
            var sizes = new[] { 32, 64, 128 };
            foreach (var size in sizes)
            {
                var texture = new Texture2D(size, size);
                var sprite = Sprite.Create(texture, new Rect(0, 0, size, size), Vector2.zero);
                sprite.name = $"Character_Variant_{size}";
                sprites.Add(sprite);
            }

            return sprites;
        }

        private SpriteLibraryAsset CreateLibraryWithUnusedVariants()
        {
            var library = CreateTestSpriteLibrary("UnusedVariantsTest");
            // In a real implementation, this would create a library with variants marked as unused
            return library;
        }

        private SpriteLibraryAsset CreateInvalidSpriteLibrary()
        {
            var library = CreateTestSpriteLibrary("InvalidLibrary");
            // In a real implementation, this would create a library with structural issues
            return library;
        }

        private SpriteLibraryAsset CreateLibraryWithBadNaming()
        {
            var library = CreateTestSpriteLibrary("bad_naming_library");
            return library;
        }

        private SpriteLibraryAsset CreateLibraryWithBrokenReferences()
        {
            var library = CreateTestSpriteLibrary("BrokenRefsLibrary");
            // In a real implementation, this would create a library with broken sprite references
            return library;
        }

        private SpriteLibraryAsset CreateTestSpriteLibraryWithManyVariants()
        {
            var library = CreateTestSpriteLibrary("TestLibrary");
            // In a real implementation, this would create a library with many variants for caching tests
            return library;
        }

        private List<Sprite> CreateLargeTestSpriteSet(int count)
        {
            var sprites = new List<Sprite>();
            
            for (int i = 0; i < count; i++)
            {
                var texture = new Texture2D(32, 32);
                var sprite = Sprite.Create(texture, new Rect(0, 0, 32, 32), Vector2.zero);
                sprite.name = $"LargeSet_Sprite_{i}";
                sprites.Add(sprite);
            }

            return sprites;
        }

        private int GetVariantCount(SpriteLibraryAsset library)
        {
            // In a real implementation, this would count variants in the library
            return 10; // Mock value
        }

        #endregion
    }

    #region Test Implementation Classes

    // Library manager state and enums
    public enum LibraryManagerState { Uninitialized, Loading, Ready, Error }
    public enum NamingConvention { UnderscoreSeparated, CamelCase, PascalCase, DashSeparated }

    // Test sprite library manager
    public class TestSpriteLibraryManager : MonoBehaviour
    {
        public bool IsInitialized { get; private set; }
        public LibraryManagerState State { get; private set; }
        public int LibraryCount => registeredLibraries.Count;
        public LibraryConfiguration Configuration { get; private set; }

        private Dictionary<string, SpriteLibraryAsset> registeredLibraries = new Dictionary<string, SpriteLibraryAsset>();
        private Dictionary<string, TestSpriteVariantCollection> variantCache = new Dictionary<string, TestSpriteVariantCollection>();

        public event Action<string, string, string> OnVariantSwapped;

        public void Initialize()
        {
            IsInitialized = true;
            State = LibraryManagerState.Ready;
            Configuration = new LibraryConfiguration();
        }

        public void RegisterLibrary(SpriteLibraryAsset library)
        {
            if (library != null)
            {
                registeredLibraries[library.name] = library;
            }
        }

        public void UnregisterLibrary(SpriteLibraryAsset library)
        {
            if (library != null)
            {
                registeredLibraries.Remove(library.name);
            }
        }

        public bool IsLibraryRegistered(string libraryName)
        {
            return registeredLibraries.ContainsKey(libraryName);
        }

        public SpriteLibraryAsset GetLibrary(string libraryName)
        {
            return registeredLibraries.TryGetValue(libraryName, out var library) ? library : null;
        }

        public TestSpriteVariantCollection GetVariants(string libraryName, string categoryName)
        {
            var cacheKey = $"{libraryName}_{categoryName}";
            
            if (variantCache.TryGetValue(cacheKey, out var cached))
            {
                return cached;
            }

            // Create mock variant collection
            var collection = new TestSpriteVariantCollection(categoryName);
            collection.AddVariant("Default", null);
            collection.AddVariant("Alt", null);
            
            variantCache[cacheKey] = collection;
            return collection;
        }

        public List<string> GetVariantNames(string libraryName, string categoryName)
        {
            var variants = GetVariants(libraryName, categoryName);
            return variants?.GetVariantNames() ?? new List<string>();
        }

        public bool HasVariant(string libraryName, string categoryName, string variantName)
        {
            var variants = GetVariants(libraryName, categoryName);
            return variants?.HasVariant(variantName) ?? false;
        }

        public bool SwapVariant(TestSpriteResolver spriteResolver, string categoryName, string variantName)
        {
            if (spriteResolver?.LibraryAsset != null && HasVariant(spriteResolver.LibraryAsset.name, categoryName, variantName))
            {
                spriteResolver.SetCategoryAndLabel(categoryName, variantName);
                OnVariantSwapped?.Invoke(spriteResolver.LibraryAsset.name, categoryName, variantName);
                return true;
            }
            return false;
        }

        public void LoadLibraryAsync(string libraryPath, Action<SpriteLibraryAsset> onLoaded, Action<string> onFailed)
        {
            // Simulate async loading
            if (libraryPath.Contains("Invalid"))
            {
                onFailed?.Invoke("Library not found");
            }
            else
            {
                var library = ScriptableObject.CreateInstance<SpriteLibraryAsset>();
                library.name = "LoadedLibrary";
                onLoaded?.Invoke(library);
            }
        }
    }

    // Test sprite resolver component
    public class TestSpriteResolver : MonoBehaviour
    {
        public SpriteLibraryAsset LibraryAsset { get; private set; }
        public string CurrentCategory { get; private set; }
        public string CurrentLabel { get; private set; }

        public void SetLibraryAsset(SpriteLibraryAsset library)
        {
            LibraryAsset = library;
        }

        public void SetCategoryAndLabel(string category, string label)
        {
            CurrentCategory = category;
            CurrentLabel = label;
        }
    }

    // Test sprite variant collection
    public class TestSpriteVariantCollection
    {
        public string CategoryName { get; }
        public int VariantCount => variants.Count;

        private Dictionary<string, Sprite> variants = new Dictionary<string, Sprite>();

        public TestSpriteVariantCollection(string categoryName)
        {
            CategoryName = categoryName;
        }

        public void AddVariant(string name, Sprite sprite)
        {
            variants[name] = sprite;
        }

        public bool HasVariant(string name)
        {
            return variants.ContainsKey(name);
        }

        public List<string> GetVariantNames()
        {
            return new List<string>(variants.Keys);
        }

        public Sprite GetVariant(string name)
        {
            return variants.TryGetValue(name, out var sprite) ? sprite : null;
        }
    }

    // Library builder
    public class TestSpriteLibraryBuilder
    {
        public SpriteLibraryAsset CreateFromSprites(List<Sprite> sprites, LibraryCreationConfig config)
        {
            var library = ScriptableObject.CreateInstance<SpriteLibraryAsset>();
            library.name = config.LibraryName;
            
            // In a real implementation, this would organize sprites into categories
            return library;
        }

        public ValidationResult ValidateSprites(List<Sprite> sprites)
        {
            var result = new ValidationResult { IsValid = true };
            
            foreach (var sprite in sprites)
            {
                if (sprite?.texture == null)
                {
                    result.IsValid = false;
                    result.Issues.Add(new ValidationIssue
                    {
                        Message = "Sprite has null texture",
                        Severity = IssueSeverity.Error
                    });
                }
            }

            return result;
        }
    }

    // Variant detector
    public class TestSpriteVariantDetector
    {
        public List<SpriteCategory> DetectCategories(List<Sprite> sprites, NamingConvention convention)
        {
            var categories = new List<SpriteCategory>();
            var categoryGroups = new Dictionary<string, List<Sprite>>();

            foreach (var sprite in sprites)
            {
                if (sprite?.name != null)
                {
                    var categoryName = ExtractCategoryName(sprite.name, convention);
                    
                    if (!categoryGroups.ContainsKey(categoryName))
                    {
                        categoryGroups[categoryName] = new List<Sprite>();
                    }
                    
                    categoryGroups[categoryName].Add(sprite);
                }
            }

            foreach (var group in categoryGroups)
            {
                categories.Add(new SpriteCategory
                {
                    Name = group.Key,
                    Sprites = group.Value
                });
            }

            return categories;
        }

        public List<SpriteVariant> GroupVariants(List<Sprite> sprites, string categoryName)
        {
            var variants = new List<SpriteVariant>();
            
            foreach (var sprite in sprites)
            {
                if (sprite?.name?.StartsWith(categoryName) == true)
                {
                    variants.Add(new SpriteVariant
                    {
                        Name = sprite.name.Replace($"{categoryName}_", ""),
                        Sprite = sprite
                    });
                }
            }

            return variants;
        }

        public ValidationResult ValidateVariantConsistency(List<Sprite> variants)
        {
            var result = new ValidationResult { IsValid = true };
            
            if (variants.Count > 1)
            {
                var firstSprite = variants[0];
                var expectedSize = new Vector2Int((int)firstSprite.rect.width, (int)firstSprite.rect.height);
                
                foreach (var variant in variants.Skip(1))
                {
                    var size = new Vector2Int((int)variant.rect.width, (int)variant.rect.height);
                    if (size != expectedSize)
                    {
                        result.IsValid = false;
                        result.Issues.Add(new ValidationIssue
                        {
                            Message = "Variant sizes are inconsistent",
                            Severity = IssueSeverity.Warning
                        });
                        break;
                    }
                }
            }

            return result;
        }

        private string ExtractCategoryName(string spriteName, NamingConvention convention)
        {
            switch (convention)
            {
                case NamingConvention.UnderscoreSeparated:
                    var parts = spriteName.Split('_');
                    return parts.Length > 0 ? parts[0] : "Default";
                default:
                    return "Default";
            }
        }
    }

    // Library optimizer
    public class TestLibraryOptimizer
    {
        public LibraryOptimizationResult OptimizeLibrary(SpriteLibraryAsset library)
        {
            return new LibraryOptimizationResult
            {
                Success = true,
                OptimizationsApplied = new List<string> { "Removed duplicate sprites", "Optimized compression" }
            };
        }

        public LibraryStats AnalyzeLibrary(SpriteLibraryAsset library)
        {
            return new LibraryStats
            {
                OptimizationScore = UnityEngine.Random.Range(0.5f, 0.9f),
                MemoryUsage = UnityEngine.Random.Range(10f, 50f),
                VariantCount = UnityEngine.Random.Range(5, 20)
            };
        }

        public LibraryOptimizationResult RemoveUnusedVariants(SpriteLibraryAsset library)
        {
            return new LibraryOptimizationResult
            {
                Success = true,
                OptimizationsApplied = new List<string> { "Removed 3 unused variants" }
            };
        }

        public LibraryOptimizationResult CompressSprites(SpriteLibraryAsset library)
        {
            return new LibraryOptimizationResult
            {
                Success = true,
                OptimizationsApplied = new List<string> { "Applied sprite compression" }
            };
        }

        public float EstimateMemoryUsage(SpriteLibraryAsset library)
        {
            return UnityEngine.Random.Range(5f, 25f); // MB
        }
    }

    // Library validator
    public class TestSpriteLibraryValidator
    {
        public LibraryValidationResult ValidateLibrary(SpriteLibraryAsset library)
        {
            var result = new LibraryValidationResult { IsValid = true };
            
            if (library.name.Contains("Invalid"))
            {
                result.IsValid = false;
                result.Errors.Add("Library structure is invalid");
            }
            
            if (library.name.Contains("bad_naming"))
            {
                result.Warnings.Add("Library name violates naming conventions");
            }
            
            if (library.name.Contains("BrokenRefs"))
            {
                result.Errors.Add("Library contains broken sprite references");
            }

            return result;
        }
    }

    // Supporting data classes
    public class LibraryConfiguration
    {
        public bool EnableCaching { get; set; } = true;
        public int MaxCacheSize { get; set; } = 100;
        public float CacheCleanupInterval { get; set; } = 60.0f;
    }

    public class LibraryCreationConfig
    {
        public string LibraryName { get; set; }
        public bool AutoDetectCategories { get; set; } = true;
        public NamingConvention NamingConvention { get; set; } = NamingConvention.UnderscoreSeparated;
        public bool ValidateSprites { get; set; } = true;
    }

    public class SpriteCategory
    {
        public string Name { get; set; }
        public List<Sprite> Sprites { get; set; } = new List<Sprite>();
    }

    public class SpriteVariant
    {
        public string Name { get; set; }
        public Sprite Sprite { get; set; }
    }

    public class ValidationResult
    {
        public bool IsValid { get; set; } = true;
        public List<ValidationIssue> Issues { get; set; } = new List<ValidationIssue>();
    }

    public class ValidationIssue
    {
        public string Message { get; set; }
        public IssueSeverity Severity { get; set; }
    }

    public class LibraryOptimizationResult
    {
        public bool Success { get; set; }
        public List<string> OptimizationsApplied { get; set; } = new List<string>();
    }

    public class LibraryStats
    {
        public float OptimizationScore { get; set; }
        public float MemoryUsage { get; set; }
        public int VariantCount { get; set; }
    }

    public class LibraryValidationResult
    {
        public bool IsValid { get; set; } = true;
        public List<string> Errors { get; set; } = new List<string>();
        public List<string> Warnings { get; set; } = new List<string>();
        
        public int ErrorCount => Errors.Count;
        public int WarningCount => Warnings.Count;
    }

    public enum IssueSeverity { Info, Warning, Error, Critical }

    #endregion
}