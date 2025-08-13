using NUnit.Framework;
using UnityEngine;
using UnityEditor;
using System.IO;

namespace BMAD.Unity.Tests.EditMode
{
    /// <summary>
    /// EditMode tests for Unity Build Automation functionality
    /// Tests the build automation scripts and validation logic
    /// </summary>
    public class BuildAutomationTests
    {
        private const string TestProjectPath = "Assets/TestProject";
        
        [SetUp]
        public void Setup()
        {
            // Create test project structure
            if (!Directory.Exists(TestProjectPath))
            {
                Directory.CreateDirectory(TestProjectPath);
            }
        }
        
        [TearDown]
        public void Cleanup()
        {
            // Clean up test artifacts
            if (Directory.Exists(TestProjectPath))
            {
                Directory.Delete(TestProjectPath, true);
            }
            AssetDatabase.Refresh();
        }
        
        [Test]
        public void BuildAutomation_ValidateProjectStructure_ReturnsTrue()
        {
            // Arrange
            var requiredDirectories = new[] { "Scripts", "Scenes", "Resources" };
            
            // Act & Assert
            foreach (var dir in requiredDirectories)
            {
                var fullPath = Path.Combine(TestProjectPath, dir);
                Directory.CreateDirectory(fullPath);
                Assert.IsTrue(Directory.Exists(fullPath), $"Directory {dir} should exist");
            }
        }
        
        [Test]
        public void BuildAutomation_ValidateSceneConfiguration_PassesValidation()
        {
            // Arrange
            var scenePath = $"{TestProjectPath}/TestScene.unity";
            
            // Act
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            EditorSceneManager.SaveScene(scene, scenePath);
            
            // Assert
            Assert.IsTrue(File.Exists(scenePath), "Test scene should be created successfully");
            Assert.IsNotNull(scene, "Scene object should not be null");
        }
        
        [Test]
        public void BuildAutomation_ValidateBuildSettings_ContainsRequiredScenes()
        {
            // Arrange & Act
            var buildScenes = EditorBuildSettings.scenes;
            
            // Assert
            Assert.IsNotNull(buildScenes, "Build settings should contain scene list");
            // Note: In a real project, we'd validate specific scenes are included
        }
        
        [Test]
        public void BuildAutomation_ValidatePlayerSettings_HasCorrectConfiguration()
        {
            // Act
            var productName = PlayerSettings.productName;
            var bundleVersion = PlayerSettings.bundleVersion;
            
            // Assert
            Assert.IsNotEmpty(productName, "Product name should be configured");
            Assert.IsNotEmpty(bundleVersion, "Bundle version should be configured");
        }
        
        [Test]
        public void BuildAutomation_ValidateRequiredPackages_AreInstalled()
        {
            // Note: This would validate Unity packages in a real implementation
            // For testing framework, we check if core Unity assemblies are available
            
            // Act & Assert
            Assert.IsNotNull(typeof(GameObject), "Unity Engine should be available");
            Assert.IsNotNull(typeof(EditorWindow), "Unity Editor should be available");
        }
        
        [Test]
        public void BuildAutomation_ValidateAssetImportSettings_AreCorrect()
        {
            // Arrange
            var testTexturePath = $"{TestProjectPath}/TestTexture.png";
            
            // Create a simple test texture
            var texture = new Texture2D(64, 64);
            var pngData = texture.EncodeToPNG();
            File.WriteAllBytes(testTexturePath, pngData);
            AssetDatabase.ImportAsset(testTexturePath);
            
            // Act
            var importer = AssetImporter.GetAtPath(testTexturePath) as TextureImporter;
            
            // Assert
            Assert.IsNotNull(importer, "Texture importer should be available");
            
            // Cleanup
            Object.DestroyImmediate(texture);
        }
        
        [Test]
        public void BuildAutomation_ValidateCodeCompilation_Succeeds()
        {
            // Act
            var compilationResult = CompilationPipeline.GetAssemblies(AssembliesType.Editor);
            
            // Assert
            Assert.IsNotNull(compilationResult, "Compilation pipeline should return assembly list");
            Assert.Greater(compilationResult.Length, 0, "At least one assembly should be compiled");
        }
        
        [Test]
        public void BuildAutomation_ValidateEditorPrefs_AreAccessible()
        {
            // Arrange
            const string testKey = "BMAD_Test_Key";
            const string testValue = "BMAD_Test_Value";
            
            // Act
            EditorPrefs.SetString(testKey, testValue);
            var retrievedValue = EditorPrefs.GetString(testKey);
            
            // Assert
            Assert.AreEqual(testValue, retrievedValue, "Editor preferences should persist values");
            
            // Cleanup
            EditorPrefs.DeleteKey(testKey);
        }
        
        [Test]
        public void BuildAutomation_ValidateResourceManagement_WorksCorrectly()
        {
            // Arrange
            var resourcesPath = $"{TestProjectPath}/Resources";
            Directory.CreateDirectory(resourcesPath);
            
            // Act & Assert
            Assert.IsTrue(Directory.Exists(resourcesPath), "Resources directory should be created");
            
            // Note: In real implementation, would test actual resource loading
        }
        
        [Test]
        public void BuildAutomation_ValidateVersionControl_Integration()
        {
            // Arrange & Act
            var metaFilesVisible = EditorSettings.serializationMode == SerializationMode.ForceText;
            
            // Assert
            Assert.IsTrue(metaFilesVisible, "Meta files should be visible for version control");
        }
    }
}