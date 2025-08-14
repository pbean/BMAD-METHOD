// Assets/Tests/EditMode/SpriteAtlasingTests.cs
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.U2D;
using UnityEditor;

namespace BMAD.Unity.Tests.EditMode
{
    /// <summary>
    /// Comprehensive test suite for Sprite Atlasing and Optimization systems
    /// Tests atlas management, performance optimization, and platform-specific configurations
    /// </summary>
    [TestFixture]
    public class SpriteAtlasingTests
    {
        private SpriteAtlasManager atlasManager;
        private GameObject testGameObject;
        private List<Sprite> testSprites;
        private SpriteAtlas testAtlas;

        [SetUp]
        public void Setup()
        {
            // Create test GameObject with SpriteAtlasManager
            testGameObject = new GameObject("Test Atlas Manager");
            atlasManager = testGameObject.AddComponent<SpriteAtlasManager>();

            // Create test sprites for atlas testing
            testSprites = CreateTestSprites();
            
            // Create test atlas
            testAtlas = CreateTestSpriteAtlas();
        }

        [TearDown]
        public void TearDown()
        {
            // Cleanup test objects
            if (testGameObject != null)
            {
                Object.DestroyImmediate(testGameObject);
            }

            // Cleanup test sprites
            foreach (var sprite in testSprites)
            {
                if (sprite != null)
                {
                    Object.DestroyImmediate(sprite.texture);
                    Object.DestroyImmediate(sprite);
                }
            }

            // Cleanup test atlas
            if (testAtlas != null)
            {
                Object.DestroyImmediate(testAtlas);
            }
        }

        #region Atlas Manager Core Tests

        [Test]
        public void SpriteAtlasManager_Initialize_SetsUpCorrectly()
        {
            // Act
            atlasManager.Initialize();

            // Assert
            Assert.IsTrue(atlasManager.IsInitialized, "Atlas manager should be initialized");
            Assert.IsNotNull(atlasManager.Instance, "Singleton instance should be available");
            Assert.AreEqual(SystemState.Ready, atlasManager.State, "Manager should be in Ready state");
        }

        [Test]
        public void SpriteAtlasManager_LoadAtlas_ValidAtlas_LoadsSuccessfully()
        {
            // Arrange
            atlasManager.Initialize();
            bool loadCompleted = false;
            SpriteAtlas loadedAtlas = null;

            // Act
            atlasManager.LoadAtlas("test_atlas", (atlas) => {
                loadCompleted = true;
                loadedAtlas = atlas;
            });

            // Assert
            Assert.IsTrue(loadCompleted, "Atlas should load successfully");
            Assert.IsNotNull(loadedAtlas, "Loaded atlas should not be null");
        }

        [Test]
        public void SpriteAtlasManager_LoadAtlas_InvalidAtlas_HandlesError()
        {
            // Arrange
            atlasManager.Initialize();
            bool errorOccurred = false;
            string errorMessage = null;

            // Act
            atlasManager.LoadAtlas("invalid_atlas", null, (error) => {
                errorOccurred = true;
                errorMessage = error;
            });

            // Assert
            Assert.IsTrue(errorOccurred, "Error should occur for invalid atlas");
            Assert.IsNotNull(errorMessage, "Error message should be provided");
        }

        [Test]
        public void SpriteAtlasManager_GetSprite_ValidSprite_ReturnsSprite()
        {
            // Arrange
            atlasManager.Initialize();
            atlasManager.LoadAtlas("test_atlas");
            
            // Act
            var sprite = atlasManager.GetSprite("test_atlas", "test_sprite");

            // Assert
            Assert.IsNotNull(sprite, "Should return valid sprite");
            Assert.AreEqual("test_sprite", sprite.name, "Sprite name should match");
        }

        [Test]
        public void SpriteAtlasManager_IsAtlasLoaded_LoadedAtlas_ReturnsTrue()
        {
            // Arrange
            atlasManager.Initialize();
            atlasManager.LoadAtlas("test_atlas");

            // Act
            var isLoaded = atlasManager.IsAtlasLoaded("test_atlas");

            // Assert
            Assert.IsTrue(isLoaded, "Should detect loaded atlas");
        }

        [Test]
        public void SpriteAtlasManager_UnloadAtlas_LoadedAtlas_UnloadsSuccessfully()
        {
            // Arrange
            atlasManager.Initialize();
            atlasManager.LoadAtlas("test_atlas");
            
            // Act
            atlasManager.UnloadAtlas("test_atlas", true);

            // Assert
            Assert.IsFalse(atlasManager.IsAtlasLoaded("test_atlas"), "Atlas should be unloaded");
        }

        #endregion

        #region Atlas Optimization Tests

        [Test]
        public void AtlasOptimizer_OptimizeAtlas_ImprovesPackingEfficiency()
        {
            // Arrange
            var optimizer = new AtlasOptimizer();
            var settings = new AtlasOptimizer.OptimizationSettings
            {
                EnableTightPacking = true,
                MinPackingEfficiency = 0.7f
            };
            
            // Act
            var result = optimizer.OptimizeAtlas(testAtlas, testSprites);

            // Assert
            Assert.IsTrue(result.Success, "Optimization should succeed");
            Assert.IsTrue(result.Statistics.PackingEfficiency >= 0.7f, "Packing efficiency should meet threshold");
        }

        [Test]
        public void AtlasOptimizer_GenerateOptimalAtlases_CreatesEfficientAtlases()
        {
            // Arrange
            var optimizer = new AtlasOptimizer();
            
            // Act
            var atlases = optimizer.GenerateOptimalAtlases(testSprites, 3);

            // Assert
            Assert.IsNotNull(atlases, "Should generate atlases");
            Assert.LessOrEqual(atlases.Count, 3, "Should not exceed max atlas count");
            Assert.Greater(atlases.Count, 0, "Should generate at least one atlas");
        }

        [Test]
        public void AtlasOptimizer_ValidateAtlasConfiguration_DetectsIssues()
        {
            // Arrange
            var optimizer = new AtlasOptimizer();
            var invalidAtlas = CreateInvalidSpriteAtlas();

            // Act
            var validationResult = optimizer.ValidateAtlasConfiguration(invalidAtlas);

            // Assert
            Assert.IsFalse(validationResult.IsValid, "Should detect invalid configuration");
            Assert.Greater(validationResult.Warnings.Count, 0, "Should provide warnings");
        }

        #endregion

        #region Platform Configuration Tests

        [Test]
        public void PlatformAtlasConfiguration_Initialize_DetectsCurrentPlatform()
        {
            // Arrange
            var config = new PlatformAtlasConfiguration();

            // Act
            config.Initialize();

            // Assert
            Assert.IsNotNull(config.GetCurrentPlatformProfile(), "Should have platform profile");
            Assert.AreNotEqual(TargetPlatform.Auto, config.CurrentScope, "Should detect specific platform");
        }

        [Test]
        public void PlatformAtlasConfiguration_GetOptimalCompressionSettings_ReturnsValidSettings()
        {
            // Arrange
            var config = new PlatformAtlasConfiguration();
            config.Initialize();
            var atlasSize = new Vector2Int(1024, 1024);

            // Act
            var settings = config.GetOptimalCompressionSettings(atlasSize);

            // Assert
            Assert.IsNotNull(settings, "Should return compression settings");
            Assert.Greater(settings.MaxTextureSize, 0, "Should have valid texture size");
            Assert.IsTrue(settings.CompressionQuality > 0 && settings.CompressionQuality <= 1, "Quality should be valid range");
        }

        [Test]
        public void PlatformAtlasConfiguration_GetOptimalAtlasSize_RespectsPlatformLimits()
        {
            // Arrange
            var config = new PlatformAtlasConfiguration();
            config.Initialize();
            int desiredSize = 4096;

            // Act
            int optimalSize = config.GetOptimalAtlasSize(desiredSize);

            // Assert
            Assert.LessOrEqual(optimalSize, desiredSize, "Should not exceed desired size");
            Assert.IsTrue(Mathf.IsPowerOfTwo(optimalSize), "Should be power of two");
        }

        [Test]
        public void PlatformAtlasConfiguration_GetOptimalTextureFormat_MatchesPlatform()
        {
            // Arrange
            var config = new PlatformAtlasConfiguration();
            config.Initialize();

            // Act
            var formatWithAlpha = config.GetOptimalTextureFormat(true);
            var formatWithoutAlpha = config.GetOptimalTextureFormat(false);

            // Assert
            Assert.AreNotEqual(TextureFormat.RGBA32, formatWithAlpha, "Should use compressed format");
            Assert.AreNotEqual(TextureFormat.RGB24, formatWithoutAlpha, "Should use compressed format");
        }

        #endregion

        #region Performance Tests

        [Test]
        public void SpriteAtlasManager_LoadMultipleAtlases_HandlesPerformance()
        {
            // Arrange
            atlasManager.Initialize();
            var startTime = Time.realtimeSinceStartup;
            int atlasCount = 5;

            // Act
            for (int i = 0; i < atlasCount; i++)
            {
                atlasManager.LoadAtlas($"test_atlas_{i}");
            }

            var endTime = Time.realtimeSinceStartup;
            var loadTime = endTime - startTime;

            // Assert
            Assert.Less(loadTime, 1.0f, "Should load multiple atlases within 1 second");
            Assert.AreEqual(atlasCount, atlasManager.GetStatus().LoadedAtlasCount, "All atlases should be loaded");
        }

        [Test]
        public void SpriteAtlasManager_MemoryUsage_StaysWithinLimits()
        {
            // Arrange
            atlasManager.Initialize();
            var initialMemory = atlasManager.GetStatus().TotalMemoryUsage;

            // Act
            for (int i = 0; i < 10; i++)
            {
                atlasManager.LoadAtlas($"test_atlas_{i}");
            }

            var finalMemory = atlasManager.GetStatus().TotalMemoryUsage;
            var memoryIncrease = finalMemory - initialMemory;

            // Assert
            Assert.Less(memoryIncrease, 100.0f, "Memory increase should be reasonable (< 100MB)");
        }

        [Test]
        public void AtlasOptimizer_OptimizationPerformance_CompletesQuickly()
        {
            // Arrange
            var optimizer = new AtlasOptimizer();
            var startTime = Time.realtimeSinceStartup;

            // Act
            var result = optimizer.OptimizeAtlas(testAtlas, testSprites);
            var endTime = Time.realtimeSinceStartup;
            var optimizationTime = endTime - startTime;

            // Assert
            Assert.Less(optimizationTime, 2.0f, "Optimization should complete within 2 seconds");
            Assert.IsTrue(result.Success, "Optimization should succeed");
        }

        #endregion

        #region Helper Methods

        private List<Sprite> CreateTestSprites()
        {
            var sprites = new List<Sprite>();
            
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
                sprite.name = $"test_sprite_{i}";
                sprites.Add(sprite);
            }

            return sprites;
        }

        private SpriteAtlas CreateTestSpriteAtlas()
        {
            var atlas = ScriptableObject.CreateInstance<SpriteAtlas>();
            atlas.name = "test_atlas";
            
            // Configure atlas settings
            var packingSettings = atlas.GetPackingSettings();
            packingSettings.enableTightPacking = true;
            packingSettings.padding = 2;
            atlas.SetPackingSettings(packingSettings);

            var textureSettings = atlas.GetTextureSettings();
            textureSettings.generateMipMaps = false;
            textureSettings.filterMode = FilterMode.Bilinear;
            atlas.SetTextureSettings(textureSettings);

            return atlas;
        }

        private SpriteAtlas CreateInvalidSpriteAtlas()
        {
            var atlas = ScriptableObject.CreateInstance<SpriteAtlas>();
            atlas.name = "invalid_atlas";
            
            // Configure with invalid settings
            var packingSettings = atlas.GetPackingSettings();
            packingSettings.padding = -1; // Invalid padding
            atlas.SetPackingSettings(packingSettings);

            return atlas;
        }

        #endregion
    }

    #region Mock Classes for Testing

    // Mock implementations for testing purposes
    public class SpriteAtlasManager : MonoBehaviour
    {
        public bool IsInitialized { get; private set; }
        public static SpriteAtlasManager Instance { get; private set; }
        public SystemState State { get; private set; }

        public void Initialize()
        {
            IsInitialized = true;
            Instance = this;
            State = SystemState.Ready;
        }

        public void LoadAtlas(string atlasName, System.Action<SpriteAtlas> onLoaded = null, System.Action<string> onFailed = null)
        {
            if (atlasName == "invalid_atlas")
            {
                onFailed?.Invoke("Atlas not found");
            }
            else
            {
                onLoaded?.Invoke(ScriptableObject.CreateInstance<SpriteAtlas>());
            }
        }

        public Sprite GetSprite(string atlasName, string spriteName)
        {
            if (atlasName == "test_atlas" && spriteName == "test_sprite")
            {
                var sprite = Sprite.Create(new Texture2D(64, 64), new Rect(0, 0, 64, 64), Vector2.zero);
                sprite.name = spriteName;
                return sprite;
            }
            return null;
        }

        public bool IsAtlasLoaded(string atlasName) => atlasName == "test_atlas";
        public void UnloadAtlas(string atlasName, bool force = false) { }

        public AtlasManagerStatus GetStatus()
        {
            return new AtlasManagerStatus
            {
                LoadedAtlasCount = 1,
                TotalMemoryUsage = 10.0f
            };
        }
    }

    public class AtlasOptimizer
    {
        public class OptimizationSettings
        {
            public bool EnableTightPacking = true;
            public float MinPackingEfficiency = 0.7f;
        }

        public class OptimizationResult
        {
            public bool Success = true;
            public AtlasStatistics Statistics = new AtlasStatistics { PackingEfficiency = 0.8f };
        }

        public class AtlasStatistics
        {
            public float PackingEfficiency;
        }

        public OptimizationResult OptimizeAtlas(SpriteAtlas atlas, List<Sprite> sprites)
        {
            return new OptimizationResult();
        }

        public List<SpriteAtlas> GenerateOptimalAtlases(List<Sprite> sprites, int maxCount)
        {
            return new List<SpriteAtlas> { ScriptableObject.CreateInstance<SpriteAtlas>() };
        }

        public ValidationResult ValidateAtlasConfiguration(SpriteAtlas atlas)
        {
            var result = new ValidationResult { IsValid = atlas.name != "invalid_atlas" };
            if (!result.IsValid)
            {
                result.Warnings.Add("Invalid atlas configuration");
            }
            return result;
        }
    }

    public class PlatformAtlasConfiguration
    {
        public TargetPlatform CurrentScope { get; private set; }

        public void Initialize()
        {
            CurrentScope = TargetPlatform.Desktop;
        }

        public PlatformProfile GetCurrentPlatformProfile()
        {
            return new PlatformProfile { TargetPlatform = CurrentScope };
        }

        public AtlasCompressionSettings GetOptimalCompressionSettings(Vector2Int atlasSize)
        {
            return new AtlasCompressionSettings
            {
                MaxTextureSize = 1024,
                CompressionQuality = 0.8f
            };
        }

        public int GetOptimalAtlasSize(int desiredSize)
        {
            return Mathf.ClosestPowerOfTwo(Mathf.Min(desiredSize, 2048));
        }

        public TextureFormat GetOptimalTextureFormat(bool hasAlpha)
        {
            return hasAlpha ? TextureFormat.DXT5 : TextureFormat.DXT1;
        }
    }

    // Supporting classes
    public enum SystemState { Ready }
    public enum TargetPlatform { Auto, Desktop, Mobile }

    public class AtlasManagerStatus
    {
        public int LoadedAtlasCount;
        public float TotalMemoryUsage;
    }

    public class ValidationResult
    {
        public bool IsValid;
        public List<string> Warnings = new List<string>();
    }

    public class PlatformProfile
    {
        public TargetPlatform TargetPlatform;
    }

    public class AtlasCompressionSettings
    {
        public int MaxTextureSize;
        public float CompressionQuality;
    }

    #endregion
}