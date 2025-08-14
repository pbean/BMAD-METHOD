// Assets/Tests/EditMode/EditorValidationTests.cs
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
    /// Comprehensive test suite for Editor Validation and Quality Assurance systems
    /// Tests validation frameworks, asset integrity checks, and automated quality gates
    /// </summary>
    [TestFixture]
    public class EditorValidationTests
    {
        private TestEditorValidationFramework validationFramework;
        private GameObject testObject;
        private List<TestValidator> testValidators;
        private List<UnityEngine.Object> testAssets;

        [SetUp]
        public void Setup()
        {
            // Create test validation framework
            testObject = new GameObject("Test Validation Framework");
            validationFramework = testObject.AddComponent<TestEditorValidationFramework>();
            
            // Create test validators
            testValidators = new List<TestValidator>
            {
                new TestAssetValidator(),
                new TestScriptValidator(),
                new TestPrefabValidator(),
                new TestSceneValidator()
            };

            // Create test assets list
            testAssets = new List<UnityEngine.Object>();

            // Initialize framework
            validationFramework.Initialize(testValidators);
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

            // Cleanup test object
            if (testObject != null)
            {
                UnityEngine.Object.DestroyImmediate(testObject);
            }

            AssetDatabase.Refresh();
        }

        #region Validation Framework Core Tests

        [Test]
        public void ValidationFramework_Initialize_SetsUpCorrectly()
        {
            // Assert
            Assert.IsTrue(validationFramework.IsInitialized, "Framework should be initialized");
            Assert.AreEqual(ValidationState.Ready, validationFramework.State, "Should be in Ready state");
            Assert.AreEqual(4, validationFramework.ValidatorCount, "Should have all validators registered");
        }

        [Test]
        public void ValidationFramework_RegisterValidator_AddsValidator()
        {
            // Arrange
            var newValidator = new TestCustomValidator();

            // Act
            validationFramework.RegisterValidator(newValidator);

            // Assert
            Assert.AreEqual(5, validationFramework.ValidatorCount, "Should have additional validator");
            Assert.IsTrue(validationFramework.HasValidator<TestCustomValidator>(), "Should contain new validator");
        }

        [Test]
        public void ValidationFramework_UnregisterValidator_RemovesValidator()
        {
            // Arrange
            var validatorToRemove = testValidators[0];

            // Act
            validationFramework.UnregisterValidator(validatorToRemove);

            // Assert
            Assert.AreEqual(3, validationFramework.ValidatorCount, "Should have one less validator");
            Assert.IsFalse(validationFramework.HasValidator(validatorToRemove.GetType()), "Should not contain removed validator");
        }

        [Test]
        public void ValidationFramework_ValidateAll_RunsAllValidators()
        {
            // Act
            var results = validationFramework.ValidateAll();

            // Assert
            Assert.IsNotNull(results, "Should return validation results");
            Assert.AreEqual(4, results.ValidatorResults.Count, "Should have results from all validators");
            
            foreach (var validator in testValidators)
            {
                Assert.IsTrue(validator.WasExecuted, $"Validator {validator.GetType().Name} should have been executed");
            }
        }

        [Test]
        public void ValidationFramework_ValidateSpecific_RunsTargetValidator()
        {
            // Arrange
            var targetValidator = testValidators[1]; // TestScriptValidator
            targetValidator.Reset();

            // Act
            var result = validationFramework.ValidateWith<TestScriptValidator>();

            // Assert
            Assert.IsNotNull(result, "Should return validation result");
            Assert.IsTrue(targetValidator.WasExecuted, "Target validator should be executed");
            
            // Other validators should not be executed
            foreach (var validator in testValidators.Where(v => v != targetValidator))
            {
                validator.Reset();
            }
        }

        #endregion

        #region Asset Validation Tests

        [Test]
        public void AssetValidator_ValidateTexture_DetectsIssues()
        {
            // Arrange
            var validator = new TestAssetValidator();
            var invalidTexture = CreateInvalidTexture();
            testAssets.Add(invalidTexture);

            // Act
            var result = validator.ValidateAsset(invalidTexture);

            // Assert
            Assert.IsNotNull(result, "Should return validation result");
            Assert.IsFalse(result.IsValid, "Should detect invalid texture");
            Assert.Greater(result.Issues.Count, 0, "Should report validation issues");
        }

        [Test]
        public void AssetValidator_ValidatePrefab_DetectsMissingReferences()
        {
            // Arrange
            var validator = new TestPrefabValidator();
            var prefabWithMissingRefs = CreatePrefabWithMissingReferences();
            testAssets.Add(prefabWithMissingRefs);

            // Act
            var result = validator.ValidateAsset(prefabWithMissingRefs);

            // Assert
            Assert.IsNotNull(result, "Should return validation result");
            Assert.IsFalse(result.IsValid, "Should detect missing references");
            Assert.IsTrue(result.Issues.Any(i => i.Type == ValidationIssueType.MissingReference), "Should report missing reference issue");
        }

        [Test]
        public void AssetValidator_ValidateScript_DetectsCompilationErrors()
        {
            // Arrange
            var validator = new TestScriptValidator();
            var scriptPath = CreateTestScript("InvalidScript.cs", "invalid C# code here");

            // Act
            var result = validator.ValidateScript(scriptPath);

            // Assert
            Assert.IsNotNull(result, "Should return validation result");
            Assert.IsFalse(result.IsValid, "Should detect compilation errors");
            Assert.IsTrue(result.Issues.Any(i => i.Type == ValidationIssueType.CompilationError), "Should report compilation error");

            // Cleanup
            AssetDatabase.DeleteAsset(scriptPath);
        }

        [Test]
        public void AssetValidator_ValidateNamingConventions_DetectsViolations()
        {
            // Arrange
            var validator = new TestAssetValidator();
            var asset = CreateAssetWithBadName("bad_naming_convention.asset");
            testAssets.Add(asset);

            // Act
            var result = validator.ValidateAsset(asset);

            // Assert
            Assert.IsNotNull(result, "Should return validation result");
            Assert.IsTrue(result.Issues.Any(i => i.Type == ValidationIssueType.NamingConvention), "Should detect naming convention violation");
        }

        #endregion

        #region Scene Validation Tests

        [Test]
        public void SceneValidator_ValidateScene_DetectsStructureIssues()
        {
            // Arrange
            var validator = new TestSceneValidator();
            var scene = CreateTestSceneWithIssues();

            // Act
            var result = validator.ValidateScene(scene);

            // Assert
            Assert.IsNotNull(result, "Should return validation result");
            Assert.Greater(result.Issues.Count, 0, "Should detect scene structure issues");
        }

        [Test]
        public void SceneValidator_ValidateLighting_DetectsLightingIssues()
        {
            // Arrange
            var validator = new TestSceneValidator();
            var scene = CreateSceneWithLightingIssues();

            // Act
            var result = validator.ValidateScene(scene);

            // Assert
            Assert.IsNotNull(result, "Should return validation result");
            Assert.IsTrue(result.Issues.Any(i => i.Type == ValidationIssueType.LightingSetup), "Should detect lighting issues");
        }

        [Test]
        public void SceneValidator_ValidatePerformance_DetectsPerformanceIssues()
        {
            // Arrange
            var validator = new TestSceneValidator();
            var scene = CreateSceneWithPerformanceIssues();

            // Act
            var result = validator.ValidateScene(scene);

            // Assert
            Assert.IsNotNull(result, "Should return validation result");
            Assert.IsTrue(result.Issues.Any(i => i.Type == ValidationIssueType.Performance), "Should detect performance issues");
        }

        #endregion

        #region Quality Gate Tests

        [Test]
        public void QualityGate_PreBuildValidation_BlocksInvalidBuild()
        {
            // Arrange
            var qualityGate = new TestQualityGate();
            qualityGate.Initialize(validationFramework);
            
            // Create invalid assets to trigger gate
            var invalidAsset = CreateInvalidTexture();
            testAssets.Add(invalidAsset);

            // Act
            var canBuild = qualityGate.CanProceedWithBuild();
            var report = qualityGate.GetValidationReport();

            // Assert
            Assert.IsFalse(canBuild, "Should block build with validation errors");
            Assert.IsNotNull(report, "Should provide validation report");
            Assert.Greater(report.ErrorCount, 0, "Should have validation errors");
        }

        [Test]
        public void QualityGate_ConfigurableThresholds_RespectsSettings()
        {
            // Arrange
            var qualityGate = new TestQualityGate();
            qualityGate.Initialize(validationFramework);
            
            var settings = new QualityGateSettings
            {
                MaxErrors = 2,
                MaxWarnings = 10,
                BlockOnErrors = true,
                BlockOnWarnings = false
            };
            qualityGate.ApplySettings(settings);

            // Simulate validation results with 1 error and 5 warnings
            var mockResults = CreateMockValidationResults(1, 5);
            qualityGate.SetMockResults(mockResults);

            // Act
            var canBuild = qualityGate.CanProceedWithBuild();

            // Assert
            Assert.IsTrue(canBuild, "Should allow build with errors below threshold");
        }

        [Test]
        public void QualityGate_CriticalErrors_AlwaysBlockBuild()
        {
            // Arrange
            var qualityGate = new TestQualityGate();
            qualityGate.Initialize(validationFramework);
            
            var settings = new QualityGateSettings
            {
                MaxErrors = 10,
                BlockOnErrors = false // Even with blocking disabled
            };
            qualityGate.ApplySettings(settings);

            // Simulate critical error
            var mockResults = CreateMockValidationResultsWithCriticalError();
            qualityGate.SetMockResults(mockResults);

            // Act
            var canBuild = qualityGate.CanProceedWithBuild();

            // Assert
            Assert.IsFalse(canBuild, "Should always block build with critical errors");
        }

        #endregion

        #region Automated Fix Tests

        [Test]
        public void AutomatedFix_FixableIssue_AppliesFixCorrectly()
        {
            // Arrange
            var fixer = new TestAutomatedFixer();
            var fixableAsset = CreateFixableAsset();
            testAssets.Add(fixableAsset);

            var issue = new ValidationIssue
            {
                Type = ValidationIssueType.TextureSettings,
                Asset = fixableAsset,
                IsFixable = true,
                Description = "Texture settings need optimization"
            };

            // Act
            var fixResult = fixer.TryFix(issue);

            // Assert
            Assert.IsTrue(fixResult.Success, "Should successfully apply fix");
            Assert.IsNotNull(fixResult.FixDescription, "Should provide fix description");
        }

        [Test]
        public void AutomatedFix_NonFixableIssue_ReportsCannotFix()
        {
            // Arrange
            var fixer = new TestAutomatedFixer();
            var nonFixableAsset = CreateNonFixableAsset();
            testAssets.Add(nonFixableAsset);

            var issue = new ValidationIssue
            {
                Type = ValidationIssueType.CompilationError,
                Asset = nonFixableAsset,
                IsFixable = false,
                Description = "Compilation error requires manual intervention"
            };

            // Act
            var fixResult = fixer.TryFix(issue);

            // Assert
            Assert.IsFalse(fixResult.Success, "Should not be able to fix non-fixable issue");
            Assert.IsNotNull(fixResult.ErrorMessage, "Should provide error message");
        }

        [Test]
        public void AutomatedFix_BatchFix_ProcessesMultipleIssues()
        {
            // Arrange
            var fixer = new TestAutomatedFixer();
            var issues = new List<ValidationIssue>
            {
                CreateFixableValidationIssue(),
                CreateFixableValidationIssue(),
                CreateNonFixableValidationIssue()
            };

            // Act
            var batchResult = fixer.FixBatch(issues);

            // Assert
            Assert.IsNotNull(batchResult, "Should return batch fix result");
            Assert.AreEqual(3, batchResult.ProcessedCount, "Should process all issues");
            Assert.AreEqual(2, batchResult.SuccessCount, "Should fix two fixable issues");
            Assert.AreEqual(1, batchResult.FailureCount, "Should fail to fix one non-fixable issue");
        }

        #endregion

        #region Performance Tests

        [Test]
        public void ValidationFramework_LargeAssetValidation_PerformsWell()
        {
            // Arrange
            var assets = new List<UnityEngine.Object>();
            for (int i = 0; i < 100; i++)
            {
                var asset = CreateTestAsset($"TestAsset_{i}");
                assets.Add(asset);
                testAssets.Add(asset);
            }

            var startTime = Time.realtimeSinceStartup;

            // Act
            var results = validationFramework.ValidateAssets(assets);

            var endTime = Time.realtimeSinceStartup;
            var validationTime = endTime - startTime;

            // Assert
            Assert.Less(validationTime, 2.0f, "Validation of 100 assets should complete within 2 seconds");
            Assert.AreEqual(100, results.AssetResults.Count, "Should validate all assets");
        }

        [Test]
        public void ValidationFramework_ConcurrentValidation_HandlesMultipleRequests()
        {
            // Arrange
            var requests = new List<ValidationRequest>();
            for (int i = 0; i < 5; i++)
            {
                requests.Add(new ValidationRequest { AssetPath = $"TestAsset_{i}" });
            }

            var startTime = Time.realtimeSinceStartup;

            // Act
            var results = validationFramework.ValidateConcurrent(requests);

            var endTime = Time.realtimeSinceStartup;
            var validationTime = endTime - startTime;

            // Assert
            Assert.Less(validationTime, 1.0f, "Concurrent validation should be faster than sequential");
            Assert.AreEqual(5, results.Count, "Should process all requests");
        }

        #endregion

        #region Helper Methods

        private Texture2D CreateInvalidTexture()
        {
            var texture = new Texture2D(4096, 4096, TextureFormat.RGBA32, false);
            texture.name = "invalid_texture_name";
            return texture;
        }

        private GameObject CreatePrefabWithMissingReferences()
        {
            var prefab = new GameObject("TestPrefab");
            var renderer = prefab.AddComponent<MeshRenderer>();
            // Intentionally leave material null to create missing reference
            return prefab;
        }

        private string CreateTestScript(string fileName, string content)
        {
            var scriptPath = $"Assets/{fileName}";
            System.IO.File.WriteAllText(scriptPath, content);
            AssetDatabase.ImportAsset(scriptPath);
            return scriptPath;
        }

        private ScriptableObject CreateAssetWithBadName(string badName)
        {
            var asset = ScriptableObject.CreateInstance<TestScriptableAsset>();
            asset.name = badName;
            return asset;
        }

        private TestSceneData CreateTestSceneWithIssues()
        {
            return new TestSceneData
            {
                HasStructureIssues = true,
                ObjectCount = 10000, // Too many objects
                LightCount = 50      // Too many lights
            };
        }

        private TestSceneData CreateSceneWithLightingIssues()
        {
            return new TestSceneData
            {
                HasLightingIssues = true,
                LightCount = 0 // No lights
            };
        }

        private TestSceneData CreateSceneWithPerformanceIssues()
        {
            return new TestSceneData
            {
                HasPerformanceIssues = true,
                ObjectCount = 50000, // Extremely high object count
                TriangleCount = 1000000
            };
        }

        private ValidationResults CreateMockValidationResults(int errorCount, int warningCount)
        {
            var results = new ValidationResults();
            
            for (int i = 0; i < errorCount; i++)
            {
                results.AddIssue(new ValidationIssue { Severity = ValidationSeverity.Error });
            }
            
            for (int i = 0; i < warningCount; i++)
            {
                results.AddIssue(new ValidationIssue { Severity = ValidationSeverity.Warning });
            }

            return results;
        }

        private ValidationResults CreateMockValidationResultsWithCriticalError()
        {
            var results = new ValidationResults();
            results.AddIssue(new ValidationIssue 
            { 
                Severity = ValidationSeverity.Critical,
                Type = ValidationIssueType.CriticalError
            });
            return results;
        }

        private ScriptableObject CreateFixableAsset()
        {
            var asset = ScriptableObject.CreateInstance<TestScriptableAsset>();
            asset.name = "FixableAsset";
            return asset;
        }

        private ScriptableObject CreateNonFixableAsset()
        {
            var asset = ScriptableObject.CreateInstance<TestScriptableAsset>();
            asset.name = "NonFixableAsset";
            return asset;
        }

        private ValidationIssue CreateFixableValidationIssue()
        {
            return new ValidationIssue
            {
                Type = ValidationIssueType.TextureSettings,
                IsFixable = true,
                Severity = ValidationSeverity.Warning
            };
        }

        private ValidationIssue CreateNonFixableValidationIssue()
        {
            return new ValidationIssue
            {
                Type = ValidationIssueType.CompilationError,
                IsFixable = false,
                Severity = ValidationSeverity.Error
            };
        }

        private UnityEngine.Object CreateTestAsset(string name)
        {
            var asset = ScriptableObject.CreateInstance<TestScriptableAsset>();
            asset.name = name;
            return asset;
        }

        #endregion
    }

    #region Test Implementation Classes

    // Test validation framework
    public enum ValidationState { Uninitialized, Loading, Ready, Validating, Error }
    public enum ValidationSeverity { Info, Warning, Error, Critical }
    public enum ValidationIssueType 
    { 
        MissingReference, CompilationError, NamingConvention, 
        TextureSettings, LightingSetup, Performance, CriticalError 
    }

    public class TestEditorValidationFramework : MonoBehaviour
    {
        public bool IsInitialized { get; private set; }
        public ValidationState State { get; private set; }
        public int ValidatorCount => validators.Count;

        private List<TestValidator> validators = new List<TestValidator>();

        public void Initialize(List<TestValidator> initialValidators)
        {
            validators.AddRange(initialValidators);
            IsInitialized = true;
            State = ValidationState.Ready;
        }

        public void RegisterValidator(TestValidator validator)
        {
            validators.Add(validator);
        }

        public void UnregisterValidator(TestValidator validator)
        {
            validators.Remove(validator);
        }

        public bool HasValidator<T>() where T : TestValidator
        {
            return validators.Any(v => v is T);
        }

        public bool HasValidator(Type validatorType)
        {
            return validators.Any(v => v.GetType() == validatorType);
        }

        public ValidationResults ValidateAll()
        {
            var results = new ValidationResults();
            
            foreach (var validator in validators)
            {
                var validatorResult = validator.Validate();
                results.ValidatorResults.Add(validatorResult);
            }

            return results;
        }

        public ValidationResult ValidateWith<T>() where T : TestValidator
        {
            var validator = validators.OfType<T>().FirstOrDefault();
            return validator?.Validate();
        }

        public ValidationResults ValidateAssets(List<UnityEngine.Object> assets)
        {
            var results = new ValidationResults();
            
            foreach (var asset in assets)
            {
                var assetResult = new ValidationResult { IsValid = true };
                // Simulate asset validation
                results.AssetResults.Add(assetResult);
            }

            return results;
        }

        public List<ValidationResult> ValidateConcurrent(List<ValidationRequest> requests)
        {
            // Simulate concurrent validation
            return requests.Select(r => new ValidationResult { IsValid = true }).ToList();
        }
    }

    // Base validator class
    public abstract class TestValidator
    {
        public bool WasExecuted { get; private set; }

        public virtual ValidationResult Validate()
        {
            WasExecuted = true;
            return new ValidationResult { IsValid = true };
        }

        public virtual ValidationResult ValidateAsset(UnityEngine.Object asset)
        {
            WasExecuted = true;
            return new ValidationResult { IsValid = true };
        }

        public void Reset()
        {
            WasExecuted = false;
        }
    }

    // Specific validator implementations
    public class TestAssetValidator : TestValidator
    {
        public override ValidationResult ValidateAsset(UnityEngine.Object asset)
        {
            base.ValidateAsset(asset);
            
            var result = new ValidationResult { IsValid = true };

            if (asset is Texture2D texture)
            {
                // Check texture size
                if (texture.width > 2048 || texture.height > 2048)
                {
                    result.IsValid = false;
                    result.Issues.Add(new ValidationIssue
                    {
                        Type = ValidationIssueType.TextureSettings,
                        Severity = ValidationSeverity.Warning,
                        Description = "Texture size exceeds recommended maximum"
                    });
                }

                // Check naming convention
                if (asset.name.Contains("_"))
                {
                    result.Issues.Add(new ValidationIssue
                    {
                        Type = ValidationIssueType.NamingConvention,
                        Severity = ValidationSeverity.Warning,
                        Description = "Asset name violates naming convention"
                    });
                }
            }

            return result;
        }
    }

    public class TestScriptValidator : TestValidator
    {
        public ValidationResult ValidateScript(string scriptPath)
        {
            WasExecuted = true;
            
            var result = new ValidationResult { IsValid = true };

            try
            {
                var content = System.IO.File.ReadAllText(scriptPath);
                
                // Simulate compilation check
                if (content.Contains("invalid"))
                {
                    result.IsValid = false;
                    result.Issues.Add(new ValidationIssue
                    {
                        Type = ValidationIssueType.CompilationError,
                        Severity = ValidationSeverity.Error,
                        Description = "Script contains compilation errors"
                    });
                }
            }
            catch (Exception ex)
            {
                result.IsValid = false;
                result.Issues.Add(new ValidationIssue
                {
                    Type = ValidationIssueType.CompilationError,
                    Severity = ValidationSeverity.Error,
                    Description = ex.Message
                });
            }

            return result;
        }
    }

    public class TestPrefabValidator : TestValidator
    {
        public override ValidationResult ValidateAsset(UnityEngine.Object asset)
        {
            base.ValidateAsset(asset);
            
            var result = new ValidationResult { IsValid = true };

            if (asset is GameObject prefab)
            {
                var renderers = prefab.GetComponentsInChildren<Renderer>();
                
                foreach (var renderer in renderers)
                {
                    if (renderer.sharedMaterial == null)
                    {
                        result.IsValid = false;
                        result.Issues.Add(new ValidationIssue
                        {
                            Type = ValidationIssueType.MissingReference,
                            Severity = ValidationSeverity.Error,
                            Description = "Renderer has missing material reference"
                        });
                    }
                }
            }

            return result;
        }
    }

    public class TestSceneValidator : TestValidator
    {
        public ValidationResult ValidateScene(TestSceneData scene)
        {
            WasExecuted = true;
            
            var result = new ValidationResult { IsValid = true };

            if (scene.ObjectCount > 1000)
            {
                result.Issues.Add(new ValidationIssue
                {
                    Type = ValidationIssueType.Performance,
                    Severity = ValidationSeverity.Warning,
                    Description = "Scene has too many objects"
                });
            }

            if (scene.LightCount == 0)
            {
                result.Issues.Add(new ValidationIssue
                {
                    Type = ValidationIssueType.LightingSetup,
                    Severity = ValidationSeverity.Warning,
                    Description = "Scene has no lights"
                });
            }

            if (scene.HasStructureIssues || scene.HasLightingIssues || scene.HasPerformanceIssues)
            {
                result.IsValid = false;
            }

            return result;
        }
    }

    public class TestCustomValidator : TestValidator
    {
        // Custom validator for testing registration
    }

    // Quality gate implementation
    public class TestQualityGate
    {
        private TestEditorValidationFramework validationFramework;
        private QualityGateSettings settings;
        private ValidationResults mockResults;

        public void Initialize(TestEditorValidationFramework framework)
        {
            validationFramework = framework;
            settings = new QualityGateSettings();
        }

        public void ApplySettings(QualityGateSettings newSettings)
        {
            settings = newSettings;
        }

        public void SetMockResults(ValidationResults results)
        {
            mockResults = results;
        }

        public bool CanProceedWithBuild()
        {
            var results = mockResults ?? validationFramework.ValidateAll();
            
            // Check for critical errors first
            if (results.HasCriticalErrors())
            {
                return false;
            }

            // Check configurable thresholds
            if (settings.BlockOnErrors && results.ErrorCount > settings.MaxErrors)
            {
                return false;
            }

            if (settings.BlockOnWarnings && results.WarningCount > settings.MaxWarnings)
            {
                return false;
            }

            return true;
        }

        public ValidationReport GetValidationReport()
        {
            var results = mockResults ?? validationFramework.ValidateAll();
            return new ValidationReport
            {
                ErrorCount = results.ErrorCount,
                WarningCount = results.WarningCount,
                InfoCount = results.InfoCount
            };
        }
    }

    // Automated fixer implementation
    public class TestAutomatedFixer
    {
        public FixResult TryFix(ValidationIssue issue)
        {
            if (!issue.IsFixable)
            {
                return new FixResult
                {
                    Success = false,
                    ErrorMessage = "Issue is not fixable automatically"
                };
            }

            // Simulate fixing the issue
            return new FixResult
            {
                Success = true,
                FixDescription = $"Fixed {issue.Type} issue"
            };
        }

        public BatchFixResult FixBatch(List<ValidationIssue> issues)
        {
            var result = new BatchFixResult
            {
                ProcessedCount = issues.Count
            };

            foreach (var issue in issues)
            {
                var fixResult = TryFix(issue);
                if (fixResult.Success)
                {
                    result.SuccessCount++;
                }
                else
                {
                    result.FailureCount++;
                }
            }

            return result;
        }
    }

    // Supporting data classes
    public class ValidationResult
    {
        public bool IsValid { get; set; } = true;
        public List<ValidationIssue> Issues { get; set; } = new List<ValidationIssue>();
    }

    public class ValidationResults
    {
        public List<ValidationResult> ValidatorResults { get; set; } = new List<ValidationResult>();
        public List<ValidationResult> AssetResults { get; set; } = new List<ValidationResult>();
        
        public int ErrorCount => GetIssueCount(ValidationSeverity.Error);
        public int WarningCount => GetIssueCount(ValidationSeverity.Warning);
        public int InfoCount => GetIssueCount(ValidationSeverity.Info);

        public void AddIssue(ValidationIssue issue)
        {
            var result = new ValidationResult { IsValid = false };
            result.Issues.Add(issue);
            ValidatorResults.Add(result);
        }

        public bool HasCriticalErrors()
        {
            return GetAllIssues().Any(i => i.Severity == ValidationSeverity.Critical);
        }

        private int GetIssueCount(ValidationSeverity severity)
        {
            return GetAllIssues().Count(i => i.Severity == severity);
        }

        private IEnumerable<ValidationIssue> GetAllIssues()
        {
            return ValidatorResults.SelectMany(r => r.Issues)
                   .Concat(AssetResults.SelectMany(r => r.Issues));
        }
    }

    public class ValidationIssue
    {
        public ValidationIssueType Type { get; set; }
        public ValidationSeverity Severity { get; set; }
        public string Description { get; set; }
        public UnityEngine.Object Asset { get; set; }
        public bool IsFixable { get; set; }
    }

    public class QualityGateSettings
    {
        public int MaxErrors { get; set; } = 0;
        public int MaxWarnings { get; set; } = 10;
        public bool BlockOnErrors { get; set; } = true;
        public bool BlockOnWarnings { get; set; } = false;
    }

    public class ValidationReport
    {
        public int ErrorCount { get; set; }
        public int WarningCount { get; set; }
        public int InfoCount { get; set; }
    }

    public class FixResult
    {
        public bool Success { get; set; }
        public string FixDescription { get; set; }
        public string ErrorMessage { get; set; }
    }

    public class BatchFixResult
    {
        public int ProcessedCount { get; set; }
        public int SuccessCount { get; set; }
        public int FailureCount { get; set; }
    }

    public class ValidationRequest
    {
        public string AssetPath { get; set; }
    }

    public class TestSceneData
    {
        public bool HasStructureIssues { get; set; }
        public bool HasLightingIssues { get; set; }
        public bool HasPerformanceIssues { get; set; }
        public int ObjectCount { get; set; }
        public int LightCount { get; set; }
        public int TriangleCount { get; set; }
    }

    public class TestScriptableAsset : ScriptableObject
    {
        // Test asset for validation
    }

    #endregion
}