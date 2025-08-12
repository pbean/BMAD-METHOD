using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace BMAD.Unity.EditorTools
{
    /// <summary>
    /// Comprehensive project settings, dependencies, and quality validation system.
    /// Implements BMAD methodology for maintaining project standards and best practices.
    /// </summary>
    public class ProjectValidator : EditorWindow
    {
        #region Validation Categories

        public enum ValidationCategory
        {
            All,
            ProjectSettings,
            Dependencies,
            Assets,
            Performance,
            Quality,
            Platform,
            Security
        }

        public enum ValidationSeverity
        {
            Info,
            Warning,
            Error,
            Critical
        }

        [System.Serializable]
        public class ValidationResult
        {
            public string title;
            public string description;
            public ValidationSeverity severity;
            public ValidationCategory category;
            public string recommendation;
            public System.Action fixAction;
            public bool canAutoFix;

            public ValidationResult(string title, string description, ValidationSeverity severity, 
                ValidationCategory category, string recommendation, System.Action fixAction = null)
            {
                this.title = title;
                this.description = description;
                this.severity = severity;
                this.category = category;
                this.recommendation = recommendation;
                this.fixAction = fixAction;
                this.canAutoFix = fixAction != null;
            }
        }

        #endregion

        #region Window State

        private Vector2 scrollPosition;
        private ValidationCategory selectedCategory = ValidationCategory.All;
        private List<ValidationResult> validationResults = new List<ValidationResult>();
        private bool isValidating = false;
        private bool showOnlyIssues = true;
        private ValidationSeverity minimumSeverity = ValidationSeverity.Info;

        private Dictionary<ValidationSeverity, int> severityCounts = new Dictionary<ValidationSeverity, int>();

        #endregion

        #region Menu Items

        /// <summary>
        /// Opens the Project Validator window.
        /// </summary>
        [MenuItem("BMAD/Project Management/Project Validator", priority = 500)]
        public static void OpenProjectValidator()
        {
            var window = GetWindow<ProjectValidator>("Project Validator");
            window.minSize = new Vector2(700, 500);
            window.Show();
        }

        /// <summary>
        /// Runs a quick validation check and displays results in console.
        /// </summary>
        [MenuItem("BMAD/Project Management/Quick Validation Check", priority = 501)]
        public static void QuickValidationCheck()
        {
            var validator = new ProjectValidator();
            validator.RunValidation();
            
            var results = validator.validationResults;
            var errorCount = results.Count(r => r.severity == ValidationSeverity.Error || r.severity == ValidationSeverity.Critical);
            var warningCount = results.Count(r => r.severity == ValidationSeverity.Warning);
            
            if (errorCount > 0)
            {
                Debug.LogError($"[ProjectValidator] Validation failed: {errorCount} errors, {warningCount} warnings");
            }
            else if (warningCount > 0)
            {
                Debug.LogWarning($"[ProjectValidator] Validation completed with {warningCount} warnings");
            }
            else
            {
                Debug.Log("[ProjectValidator] Validation passed - no issues found");
            }
        }

        /// <summary>
        /// Validates project for release readiness.
        /// </summary>
        [MenuItem("BMAD/Project Management/Release Validation", priority = 502)]
        public static void ReleaseValidation()
        {
            var validator = new ProjectValidator();
            validator.RunReleaseValidation();
            
            var results = validator.validationResults;
            var criticalIssues = results.Where(r => r.severity == ValidationSeverity.Critical || r.severity == ValidationSeverity.Error).ToList();
            
            if (criticalIssues.Any())
            {
                var message = $"Project is not ready for release. Found {criticalIssues.Count} critical issues:\n\n";
                foreach (var issue in criticalIssues.Take(5))
                {
                    message += $"• {issue.title}\n";
                }
                if (criticalIssues.Count > 5)
                {
                    message += $"... and {criticalIssues.Count - 5} more issues.";
                }
                
                EditorUtility.DisplayDialog("Release Validation Failed", message, "Open Validator");
                OpenProjectValidator();
            }
            else
            {
                EditorUtility.DisplayDialog("Release Validation Passed", 
                    "Project appears ready for release. All critical checks passed.", "OK");
            }
        }

        /// <summary>
        /// Auto-fixes all fixable issues.
        /// </summary>
        [MenuItem("BMAD/Project Management/Auto-Fix Issues", priority = 503)]
        public static void AutoFixIssues()
        {
            if (EditorUtility.DisplayDialog("Auto-Fix Issues", 
                "This will automatically fix all auto-fixable validation issues. Continue?", 
                "Fix", "Cancel"))
            {
                var validator = new ProjectValidator();
                validator.RunValidation();
                validator.AutoFixIssues();
            }
        }

        #endregion

        #region GUI

        private void OnEnable()
        {
            RunValidation();
        }

        private void OnGUI()
        {
            DrawHeader();
            DrawToolbar();
            DrawFilters();
            
            scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);
            DrawValidationResults();
            EditorGUILayout.EndScrollView();
            
            DrawStatusBar();
        }

        private void DrawHeader()
        {
            GUILayout.Label("BMAD Project Validator", EditorStyles.boldLabel);
            GUILayout.Space(5);
            
            EditorGUILayout.HelpBox(
                "Validates project settings, dependencies, assets, and quality standards. " +
                "Follow BMAD methodology for optimal project health.", MessageType.Info);
            GUILayout.Space(10);
        }

        private void DrawToolbar()
        {
            EditorGUILayout.BeginHorizontal(EditorStyles.toolbar);
            
            if (GUILayout.Button("Validate", EditorStyles.toolbarButton, GUILayout.Width(70)))
            {
                RunValidation();
            }
            
            if (GUILayout.Button("Auto-Fix", EditorStyles.toolbarButton, GUILayout.Width(70)))
            {
                AutoFixIssues();
            }
            
            GUILayout.FlexibleSpace();
            
            if (GUILayout.Button("Export Report", EditorStyles.toolbarButton, GUILayout.Width(90)))
            {
                ExportValidationReport();
            }
            
            EditorGUILayout.EndHorizontal();
            GUILayout.Space(5);
        }

        private void DrawFilters()
        {
            EditorGUILayout.BeginHorizontal();
            
            selectedCategory = (ValidationCategory)EditorGUILayout.EnumPopup("Category:", selectedCategory, GUILayout.Width(200));
            minimumSeverity = (ValidationSeverity)EditorGUILayout.EnumPopup("Min Severity:", minimumSeverity, GUILayout.Width(200));
            showOnlyIssues = EditorGUILayout.Toggle("Issues Only", showOnlyIssues, GUILayout.Width(100));
            
            EditorGUILayout.EndHorizontal();
            GUILayout.Space(10);
        }

        private void DrawValidationResults()
        {
            if (isValidating)
            {
                EditorGUILayout.LabelField("Validating project...", EditorStyles.centeredGreyMiniLabel);
                return;
            }
            
            if (validationResults.Count == 0)
            {
                EditorGUILayout.LabelField("No validation results. Click 'Validate' to run checks.", 
                    EditorStyles.centeredGreyMiniLabel);
                return;
            }
            
            var filteredResults = FilterResults();
            
            if (filteredResults.Count == 0)
            {
                EditorGUILayout.LabelField("No results match current filters.", 
                    EditorStyles.centeredGreyMiniLabel);
                return;
            }
            
            foreach (var result in filteredResults)
            {
                DrawValidationResult(result);
            }
        }

        private void DrawValidationResult(ValidationResult result)
        {
            var bgColor = GetSeverityColor(result.severity);
            var originalBgColor = GUI.backgroundColor;
            GUI.backgroundColor = bgColor;
            
            EditorGUILayout.BeginVertical(EditorStyles.helpBox);
            GUI.backgroundColor = originalBgColor;
            
            // Header
            EditorGUILayout.BeginHorizontal();
            
            var severityIcon = GetSeverityIcon(result.severity);
            GUILayout.Label(severityIcon, GUILayout.Width(20));
            
            EditorGUILayout.LabelField(result.title, EditorStyles.boldLabel);
            
            GUILayout.FlexibleSpace();
            
            if (result.canAutoFix && GUILayout.Button("Fix", GUILayout.Width(40)))
            {
                try
                {
                    result.fixAction?.Invoke();
                    RunValidation(); // Re-validate after fix
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[ProjectValidator] Failed to auto-fix '{result.title}': {ex.Message}");
                }
            }
            
            EditorGUILayout.EndHorizontal();
            
            // Content
            EditorGUILayout.LabelField($"Category: {result.category}", EditorStyles.miniLabel);
            EditorGUILayout.LabelField(result.description, EditorStyles.wordWrappedLabel);
            
            if (!string.IsNullOrEmpty(result.recommendation))
            {
                EditorGUILayout.Space(3);
                EditorGUILayout.LabelField("Recommendation:", EditorStyles.boldLabel);
                EditorGUILayout.LabelField(result.recommendation, EditorStyles.wordWrappedLabel);
            }
            
            EditorGUILayout.EndVertical();
            GUILayout.Space(5);
        }

        private void DrawStatusBar()
        {
            EditorGUILayout.BeginHorizontal(EditorStyles.toolbar);
            
            var statusText = "Ready";
            if (isValidating)
            {
                statusText = "Validating...";
            }
            else if (validationResults.Count > 0)
            {
                var filteredCount = FilterResults().Count;
                statusText = $"Showing {filteredCount} of {validationResults.Count} results";
                
                if (severityCounts.Any())
                {
                    statusText += " | ";
                    var counts = new List<string>();
                    foreach (var kvp in severityCounts.OrderBy(x => x.Key))
                    {
                        if (kvp.Value > 0)
                        {
                            counts.Add($"{kvp.Value} {kvp.Key}");
                        }
                    }
                    statusText += string.Join(", ", counts);
                }
            }
            
            GUILayout.Label(statusText, EditorStyles.miniLabel);
            GUILayout.FlexibleSpace();
            EditorGUILayout.EndHorizontal();
        }

        #endregion

        #region Validation Logic

        private void RunValidation()
        {
            isValidating = true;
            validationResults.Clear();
            severityCounts.Clear();
            
            Repaint();
            
            try
            {
                // Run all validation checks
                ValidateProjectSettings();
                ValidateDependencies();
                ValidateAssets();
                ValidatePerformance();
                ValidateQuality();
                ValidatePlatformSettings();
                ValidateSecurity();
                
                // Count results by severity
                foreach (ValidationSeverity severity in Enum.GetValues(typeof(ValidationSeverity)))
                {
                    severityCounts[severity] = validationResults.Count(r => r.severity == severity);
                }
                
                Debug.Log($"[ProjectValidator] Validation completed: {validationResults.Count} results");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[ProjectValidator] Validation failed: {ex.Message}");
            }
            finally
            {
                isValidating = false;
                Repaint();
            }
        }

        private void RunReleaseValidation()
        {
            RunValidation();
            
            // Add release-specific validations
            ValidateReleaseReadiness();
        }

        private void ValidateProjectSettings()
        {
            // Company name
            if (string.IsNullOrEmpty(PlayerSettings.companyName))
            {
                AddResult("Missing Company Name", 
                    "Company name is not set in Player Settings.", 
                    ValidationSeverity.Warning, ValidationCategory.ProjectSettings,
                    "Set a company name in Player Settings for proper app identification.",
                    () => { /* Open player settings */ });
            }
            
            // Product name
            if (string.IsNullOrEmpty(PlayerSettings.productName))
            {
                AddResult("Missing Product Name", 
                    "Product name is not set in Player Settings.", 
                    ValidationSeverity.Error, ValidationCategory.ProjectSettings,
                    "Set a product name in Player Settings.",
                    () => { /* Open player settings */ });
            }
            
            // Version
            if (PlayerSettings.bundleVersion == "0.1")
            {
                AddResult("Default Version Number", 
                    "Bundle version is still set to default '0.1'.", 
                    ValidationSeverity.Warning, ValidationCategory.ProjectSettings,
                    "Update the version number to reflect your current release.");
            }
            
            // Color space
            if (PlayerSettings.colorSpace != ColorSpace.Linear)
            {
                AddResult("Color Space Not Linear", 
                    "Color space is not set to Linear, which may affect lighting quality.", 
                    ValidationSeverity.Warning, ValidationCategory.Quality,
                    "Consider using Linear color space for better lighting in 3D projects.",
                    () => PlayerSettings.colorSpace = ColorSpace.Linear);
            }
            
            // Graphics API validation
            ValidateGraphicsAPI();
        }

        private void ValidateGraphicsAPI()
        {
            var currentTarget = EditorUserBuildSettings.activeBuildTarget;
            var graphicsApis = PlayerSettings.GetGraphicsAPIs(currentTarget);
            
            if (graphicsApis.Contains(GraphicsDeviceType.OpenGLES2))
            {
                AddResult("Legacy Graphics API", 
                    "OpenGL ES 2.0 is enabled, which may limit rendering features.", 
                    ValidationSeverity.Warning, ValidationCategory.Platform,
                    "Consider removing OpenGL ES 2.0 for better rendering capabilities.");
            }
        }

        private void ValidateDependencies()
        {
            // Check for essential packages
            var manifestPath = Path.Combine(Application.dataPath, "../Packages/manifest.json");
            if (File.Exists(manifestPath))
            {
                var manifestText = File.ReadAllText(manifestPath);
                
                // Check for URP
                if (!manifestText.Contains("com.unity.render-pipelines.universal"))
                {
                    AddResult("URP Not Installed", 
                        "Universal Render Pipeline is not installed.", 
                        ValidationSeverity.Info, ValidationCategory.Dependencies,
                        "Consider installing URP for optimized rendering across platforms.");
                }
                
                // Check for TextMeshPro
                if (!manifestText.Contains("com.unity.textmeshpro"))
                {
                    AddResult("TextMeshPro Not Installed", 
                        "TextMeshPro is not installed.", 
                        ValidationSeverity.Warning, ValidationCategory.Dependencies,
                        "Install TextMeshPro for advanced text rendering capabilities.");
                }
            }
        }

        private void ValidateAssets()
        {
            // Large textures
            var textureGuids = AssetDatabase.FindAssets("t:Texture2D");
            var largeTextures = 0;
            
            foreach (var guid in textureGuids.Take(100)) // Limit for performance
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
                
                if (texture != null && (texture.width > 2048 || texture.height > 2048))
                {
                    largeTextures++;
                }
            }
            
            if (largeTextures > 0)
            {
                AddResult($"Large Textures Found", 
                    $"Found {largeTextures} textures larger than 2048x2048.", 
                    ValidationSeverity.Warning, ValidationCategory.Performance,
                    "Consider optimizing large textures for better performance and memory usage.");
            }
            
            // Missing materials
            ValidateMissingMaterials();
        }

        private void ValidateMissingMaterials()
        {
            var renderers = GameObject.FindObjectsOfType<Renderer>();
            var missingMaterials = renderers.Count(r => r.sharedMaterial == null);
            
            if (missingMaterials > 0)
            {
                AddResult("Missing Materials", 
                    $"Found {missingMaterials} renderers with missing materials.", 
                    ValidationSeverity.Warning, ValidationCategory.Assets,
                    "Assign materials to all renderers to avoid rendering issues.");
            }
        }

        private void ValidatePerformance()
        {
            // Check for expensive components
            var particleSystems = GameObject.FindObjectsOfType<ParticleSystem>().Length;
            if (particleSystems > 50)
            {
                AddResult("Many Particle Systems", 
                    $"Scene contains {particleSystems} particle systems.", 
                    ValidationSeverity.Warning, ValidationCategory.Performance,
                    "Consider pooling or optimizing particle systems for better performance.");
            }
            
            // Check render settings
            if (RenderSettings.fog && RenderSettings.fogMode == FogMode.ExponentialSquared)
            {
                AddResult("Expensive Fog Mode", 
                    "Exponential Squared fog mode is performance-intensive.", 
                    ValidationSeverity.Info, ValidationCategory.Performance,
                    "Consider using Linear fog mode for better performance.");
            }
        }

        private void ValidateQuality()
        {
            // Shadow settings
            var qualitySettings = QualitySettings.GetQualityLevel();
            var shadowDistance = QualitySettings.shadowDistance;
            
            if (shadowDistance > 150)
            {
                AddResult("High Shadow Distance", 
                    $"Shadow distance is set to {shadowDistance:F0}m, which may impact performance.", 
                    ValidationSeverity.Info, ValidationCategory.Quality,
                    "Consider reducing shadow distance for better performance.",
                    () => QualitySettings.shadowDistance = 100);
            }
            
            // Pixel light count
            var pixelLightCount = QualitySettings.pixelLightCount;
            if (pixelLightCount > 4)
            {
                AddResult("High Pixel Light Count", 
                    $"Pixel light count is set to {pixelLightCount}.", 
                    ValidationSeverity.Warning, ValidationCategory.Performance,
                    "High pixel light counts can impact performance on mobile devices.",
                    () => QualitySettings.pixelLightCount = 2);
            }
        }

        private void ValidatePlatformSettings()
        {
            var currentTarget = EditorUserBuildSettings.activeBuildTarget;
            
            // Android specific
            if (currentTarget == BuildTarget.Android)
            {
                if (PlayerSettings.Android.minSdkVersion < AndroidSdkVersions.AndroidApiLevel21)
                {
                    AddResult("Low Android API Level", 
                        "Minimum Android API level is below 21 (Android 5.0).", 
                        ValidationSeverity.Warning, ValidationCategory.Platform,
                        "Consider targeting API level 21 or higher for better compatibility.");
                }
            }
            
            // iOS specific
            if (currentTarget == BuildTarget.iOS)
            {
                if (PlayerSettings.iOS.targetOSVersionString.CompareTo("11.0") < 0)
                {
                    AddResult("Low iOS Target Version", 
                        "iOS target version is below 11.0.", 
                        ValidationSeverity.Warning, ValidationCategory.Platform,
                        "Consider targeting iOS 11.0 or higher for App Store compliance.");
                }
            }
        }

        private void ValidateSecurity()
        {
            // Check for development build in release
            if (EditorUserBuildSettings.development)
            {
                AddResult("Development Build Enabled", 
                    "Development build is enabled.", 
                    ValidationSeverity.Warning, ValidationCategory.Security,
                    "Disable development build for release builds.",
                    () => EditorUserBuildSettings.development = false);
            }
            
            // Check for auto-connect profiler
            if (EditorUserBuildSettings.connectProfiler)
            {
                AddResult("Auto-Connect Profiler Enabled", 
                    "Auto-connect profiler is enabled.", 
                    ValidationSeverity.Warning, ValidationCategory.Security,
                    "Disable auto-connect profiler for release builds.",
                    () => EditorUserBuildSettings.connectProfiler = false);
            }
        }

        private void ValidateReleaseReadiness()
        {
            // Icon validation
            var icons = PlayerSettings.GetIconsForTargetGroup(BuildTargetGroup.Unknown);
            if (icons.All(icon => icon == null))
            {
                AddResult("Missing Application Icons", 
                    "No application icons are set.", 
                    ValidationSeverity.Error, ValidationCategory.ProjectSettings,
                    "Set application icons for proper app presentation.");
            }
            
            // Build scenes validation
            var enabledScenes = EditorBuildSettings.scenes.Where(s => s.enabled).ToArray();
            if (enabledScenes.Length == 0)
            {
                AddResult("No Build Scenes", 
                    "No scenes are enabled in Build Settings.", 
                    ValidationSeverity.Critical, ValidationCategory.ProjectSettings,
                    "Add and enable scenes in Build Settings.");
            }
        }

        #endregion

        #region Helper Methods

        private void AddResult(string title, string description, ValidationSeverity severity, 
            ValidationCategory category, string recommendation, System.Action fixAction = null)
        {
            validationResults.Add(new ValidationResult(title, description, severity, category, recommendation, fixAction));
        }

        private List<ValidationResult> FilterResults()
        {
            return validationResults.Where(result =>
            {
                // Category filter
                if (selectedCategory != ValidationCategory.All && result.category != selectedCategory)
                    return false;
                
                // Severity filter
                if (result.severity < minimumSeverity)
                    return false;
                
                // Issues only filter
                if (showOnlyIssues && result.severity == ValidationSeverity.Info)
                    return false;
                
                return true;
            }).OrderByDescending(r => r.severity).ToList();
        }

        private void AutoFixIssues()
        {
            var fixableResults = validationResults.Where(r => r.canAutoFix).ToList();
            var fixed = 0;
            
            foreach (var result in fixableResults)
            {
                try
                {
                    result.fixAction?.Invoke();
                    fixed++;
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[ProjectValidator] Failed to auto-fix '{result.title}': {ex.Message}");
                }
            }
            
            if (fixed > 0)
            {
                Debug.Log($"[ProjectValidator] Auto-fixed {fixed} issues");
                RunValidation(); // Re-validate
            }
            else
            {
                Debug.Log("[ProjectValidator] No auto-fixable issues found");
            }
        }

        private void ExportValidationReport()
        {
            try
            {
                var report = GenerateValidationReport();
                var exportPath = EditorUtility.SaveFilePanel("Export Validation Report", 
                    "", "validation-report", "txt");
                
                if (!string.IsNullOrEmpty(exportPath))
                {
                    File.WriteAllText(exportPath, report);
                    Debug.Log($"[ProjectValidator] Validation report exported to: {exportPath}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[ProjectValidator] Failed to export validation report: {ex.Message}");
            }
        }

        private string GenerateValidationReport()
        {
            var report = "BMAD Project Validation Report\n";
            report += $"Generated: {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n";
            report += $"Unity Version: {Application.unityVersion}\n";
            report += $"Project: {PlayerSettings.productName}\n";
            report += new string('=', 50) + "\n\n";
            
            // Summary
            report += "SUMMARY\n";
            report += new string('-', 20) + "\n";
            foreach (var kvp in severityCounts.OrderBy(x => x.Key))
            {
                report += $"{kvp.Key}: {kvp.Value}\n";
            }
            report += "\n";
            
            // Detailed results
            report += "DETAILED RESULTS\n";
            report += new string('-', 30) + "\n";
            
            foreach (var result in validationResults.OrderByDescending(r => r.severity))
            {
                report += $"\n[{result.severity}] {result.title}\n";
                report += $"Category: {result.category}\n";
                report += $"Description: {result.description}\n";
                if (!string.IsNullOrEmpty(result.recommendation))
                {
                    report += $"Recommendation: {result.recommendation}\n";
                }
                report += new string('-', 40) + "\n";
            }
            
            return report;
        }

        private Color GetSeverityColor(ValidationSeverity severity)
        {
            return severity switch
            {
                ValidationSeverity.Critical => new Color(1f, 0.8f, 0.8f),
                ValidationSeverity.Error => new Color(1f, 0.9f, 0.9f),
                ValidationSeverity.Warning => new Color(1f, 1f, 0.8f),
                ValidationSeverity.Info => new Color(0.9f, 0.9f, 1f),
                _ => Color.white
            };
        }

        private string GetSeverityIcon(ValidationSeverity severity)
        {
            return severity switch
            {
                ValidationSeverity.Critical => "⚠",
                ValidationSeverity.Error => "✗",
                ValidationSeverity.Warning => "⚠",
                ValidationSeverity.Info => "ℹ",
                _ => "?"
            };
        }

        #endregion
    }
}
