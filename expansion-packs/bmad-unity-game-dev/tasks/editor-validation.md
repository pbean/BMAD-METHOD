# Unity Editor Validation and Quality Assurance Task

## Purpose

To establish comprehensive editor-time validation systems that ensure code quality, asset integrity, and project configuration consistency throughout development workflows. This task extends `unity-editor-integration.md` and `integration-tests.md` to provide advanced validation frameworks including asset validation, code analysis, dependency checking, and automated quality gates that maintain project health and prevent integration issues before they reach runtime.

## Prerequisites

- Unity project with editor integration tools established and validated
- Integration testing framework implemented with validation capabilities
- Unity Editor scripting environment configured with custom tools
- Understanding of Unity's asset pipeline and import/validation workflows
- Knowledge of static code analysis and validation patterns
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Editor Validation Framework Foundation

#### 1.1 Core Validation Architecture and Infrastructure

[[LLM: Analyze the project's asset structure, code organization, and quality requirements to design a comprehensive editor validation framework. Consider Unity's asset import pipeline, editor tool integration, and development workflow optimization. Design validation systems that provide real-time feedback, automated quality checks, and comprehensive reporting while maintaining editor performance and usability.]]

**Core Editor Validation Framework**:

```csharp
// Assets/Editor/Validation/EditorValidationFramework.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using UnityEngine;
using UnityEditor;
using {{project_namespace}}.Interfaces.Core;

namespace {{project_namespace}}.Editor.Validation
{
    /// <summary>
    /// Comprehensive editor validation framework for maintaining project quality
    /// Provides real-time validation, automated quality checks, and detailed reporting
    /// </summary>
    public class EditorValidationFramework : EditorWindow
    {
        [MenuItem("{{project_namespace}}/Quality Assurance/Validation Framework")]
        public static void ShowWindow()
        {
            var window = GetWindow<EditorValidationFramework>("Validation Framework");
            window.minSize = new Vector2(800, 600);
            window.Show();
        }
        
        [Header("Validation Configuration")]
        [SerializeField] private ValidationConfiguration configuration;
        [SerializeField] private bool enableRealTimeValidation = true;
        [SerializeField] private bool enableAssetValidation = true;
        [SerializeField] private bool enableCodeValidation = true;
        [SerializeField] private bool enableSceneValidation = true;
        
        [Header("Validation Results")]
        [SerializeField] private bool showOnlyErrors = false;
        [SerializeField] private bool groupByCategory = true;
        [SerializeField] private ValidationSeverity minimumSeverity = ValidationSeverity.Warning;
        
        private readonly List<IValidator> validators = new List<IValidator>();
        private readonly List<ValidationResult> validationResults = new List<ValidationResult>();
        private readonly Dictionary<string, ValidationCategory> categories = new Dictionary<string, ValidationCategory>();
        
        private ValidationRunner validationRunner;
        private AssetValidationMonitor assetMonitor;
        private CodeValidationAnalyzer codeAnalyzer;
        private SceneValidationInspector sceneInspector;
        private ProjectSettingsValidator settingsValidator;
        
        private Vector2 scrollPosition;
        private int selectedTabIndex = 0;
        private bool isValidating = false;
        private float lastValidationTime = 0f;
        private ValidationSummary currentSummary;
        
        #region Unity Editor Lifecycle
        
        private void OnEnable()
        {
            InitializeValidationFramework();
            RegisterEditorCallbacks();
        }
        
        private void OnDisable()
        {
            UnregisterEditorCallbacks();
            CleanupValidationFramework();
        }
        
        private void OnGUI()
        {
            DrawToolbar();
            DrawTabNavigation();
            DrawValidationContent();
            DrawStatusBar();
            
            if (Event.current.type == EventType.Repaint)
            {
                HandleRealTimeValidation();
            }
        }
        
        #endregion
        
        #region Initialization and Setup
        
        private void InitializeValidationFramework()
        {
            LoadConfiguration();
            InitializeValidators();
            InitializeValidationRunner();
            InitializeMonitors();
            
            Debug.Log("[EditorValidation] Validation framework initialized");
        }
        
        private void LoadConfiguration()
        {
            configuration = ValidationConfiguration.LoadOrCreate();
            
            // Apply configuration settings
            enableRealTimeValidation = configuration.EnableRealTimeValidation;
            enableAssetValidation = configuration.EnableAssetValidation;
            enableCodeValidation = configuration.EnableCodeValidation;
            enableSceneValidation = configuration.EnableSceneValidation;
            minimumSeverity = configuration.MinimumSeverity;
        }
        
        private void InitializeValidators()
        {
            // Core validators
            validators.Add(new AssetReferenceValidator());
            validators.Add(new NamingConventionValidator());
            validators.Add(new ScriptCompilationValidator());
            validators.Add(new TextureFormatValidator());
            validators.Add(new AudioClipValidator());
            validators.Add(new PrefabIntegrityValidator());
            validators.Add(new SceneStructureValidator());
            validators.Add(new ProjectSettingsValidator());
            
            // Custom validators from configuration
            LoadCustomValidators();
            
            // Initialize all validators
            foreach (var validator in validators)
            {
                try
                {
                    validator.Initialize();
                    
                    if (!categories.ContainsKey(validator.Category))
                    {
                        categories[validator.Category] = new ValidationCategory
                        {
                            Name = validator.Category,
                            Enabled = true,
                            Validators = new List<IValidator>()
                        };
                    }
                    
                    categories[validator.Category].Validators.Add(validator);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"Failed to initialize validator {validator.GetType().Name}: {ex.Message}");
                }
            }
        }
        
        private void LoadCustomValidators()
        {
            if (configuration.CustomValidators != null)
            {
                foreach (var validatorType in configuration.CustomValidators)
                {
                    try
                    {
                        var validator = Activator.CreateInstance(validatorType) as IValidator;
                        if (validator != null)
                        {
                            validators.Add(validator);
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.LogError($"Failed to load custom validator {validatorType.Name}: {ex.Message}");
                    }
                }
            }
        }
        
        private void InitializeValidationRunner()
        {
            validationRunner = new ValidationRunner();
            validationRunner.OnValidationStarted += OnValidationStarted;
            validationRunner.OnValidationCompleted += OnValidationCompleted;
            validationRunner.OnValidationProgress += OnValidationProgress;
        }
        
        private void InitializeMonitors()
        {
            if (enableAssetValidation)
            {
                assetMonitor = new AssetValidationMonitor();
                assetMonitor.OnAssetChanged += OnAssetChanged;
            }
            
            if (enableCodeValidation)
            {
                codeAnalyzer = new CodeValidationAnalyzer();
                codeAnalyzer.OnCodeAnalysisComplete += OnCodeAnalysisComplete;
            }
            
            if (enableSceneValidation)
            {
                sceneInspector = new SceneValidationInspector();
                sceneInspector.OnSceneValidated += OnSceneValidated;
            }
            
            settingsValidator = new ProjectSettingsValidator();
        }
        
        #endregion
        
        #region GUI Drawing
        
        private void DrawToolbar()
        {
            EditorGUILayout.BeginHorizontal(EditorStyles.toolbar);
            
            if (GUILayout.Button("Validate All", EditorStyles.toolbarButton, GUILayout.Width(80)))
            {
                RunFullValidation();
            }
            
            if (GUILayout.Button("Clear Results", EditorStyles.toolbarButton, GUILayout.Width(80)))
            {
                ClearValidationResults();
            }
            
            GUILayout.Space(10);
            
            enableRealTimeValidation = GUILayout.Toggle(enableRealTimeValidation, "Real-time", EditorStyles.toolbarButton);
            enableAssetValidation = GUILayout.Toggle(enableAssetValidation, "Assets", EditorStyles.toolbarButton);
            enableCodeValidation = GUILayout.Toggle(enableCodeValidation, "Code", EditorStyles.toolbarButton);
            enableSceneValidation = GUILayout.Toggle(enableSceneValidation, "Scenes", EditorStyles.toolbarButton);
            
            GUILayout.FlexibleSpace();
            
            if (currentSummary != null)
            {
                var summaryText = $"Issues: {currentSummary.TotalIssues} | Errors: {currentSummary.ErrorCount} | Warnings: {currentSummary.WarningCount}";
                GUILayout.Label(summaryText, EditorStyles.toolbarLabel);
            }
            
            EditorGUILayout.EndHorizontal();
        }
        
        private void DrawTabNavigation()
        {
            string[] tabNames = { "All Issues", "Assets", "Code", "Scenes", "Settings", "Categories" };
            selectedTabIndex = GUILayout.Toolbar(selectedTabIndex, tabNames);
        }
        
        private void DrawValidationContent()
        {
            scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);
            
            switch (selectedTabIndex)
            {
                case 0: DrawAllIssues(); break;
                case 1: DrawAssetIssues(); break;
                case 2: DrawCodeIssues(); break;
                case 3: DrawSceneIssues(); break;
                case 4: DrawSettingsIssues(); break;
                case 5: DrawCategoryManagement(); break;
            }
            
            EditorGUILayout.EndScrollView();
        }
        
        private void DrawAllIssues()
        {
            DrawValidationResults(validationResults);
        }
        
        private void DrawAssetIssues()
        {
            var assetResults = validationResults.Where(r => r.Category == "Assets").ToList();
            DrawValidationResults(assetResults);
        }
        
        private void DrawCodeIssues()
        {
            var codeResults = validationResults.Where(r => r.Category == "Code").ToList();
            DrawValidationResults(codeResults);
        }
        
        private void DrawSceneIssues()
        {
            var sceneResults = validationResults.Where(r => r.Category == "Scenes").ToList();
            DrawValidationResults(sceneResults);
        }
        
        private void DrawSettingsIssues()
        {
            var settingsResults = validationResults.Where(r => r.Category == "Settings").ToList();
            DrawValidationResults(settingsResults);
        }
        
        private void DrawValidationResults(List<ValidationResult> results)
        {
            if (results == null || results.Count == 0)
            {
                EditorGUILayout.HelpBox("No validation issues found.", MessageType.Info);
                return;
            }
            
            var filteredResults = results.Where(r => 
                r.Severity >= minimumSeverity && 
                (!showOnlyErrors || r.Severity == ValidationSeverity.Error)).ToList();
            
            if (groupByCategory)
            {
                DrawGroupedResults(filteredResults);
            }
            else
            {
                DrawFlatResults(filteredResults);
            }
        }
        
        private void DrawGroupedResults(List<ValidationResult> results)
        {
            var groupedResults = results.GroupBy(r => r.Category).ToList();
            
            foreach (var group in groupedResults)
            {
                EditorGUILayout.BeginVertical("box");
                EditorGUILayout.LabelField(group.Key, EditorStyles.boldLabel);
                
                foreach (var result in group)
                {
                    DrawValidationResult(result);
                }
                
                EditorGUILayout.EndVertical();
                EditorGUILayout.Space();
            }
        }
        
        private void DrawFlatResults(List<ValidationResult> results)
        {
            foreach (var result in results)
            {
                DrawValidationResult(result);
            }
        }
        
        private void DrawValidationResult(ValidationResult result)
        {
            var messageType = GetMessageType(result.Severity);
            var content = new GUIContent(result.Message);
            
            EditorGUILayout.BeginHorizontal();
            
            if (GUILayout.Button(content, GetResultStyle(result.Severity), GUILayout.ExpandWidth(true)))
            {
                HandleResultClick(result);
            }
            
            if (!string.IsNullOrEmpty(result.AssetPath) && GUILayout.Button("Select", GUILayout.Width(50)))
            {
                var asset = AssetDatabase.LoadAssetAtPath<UnityEngine.Object>(result.AssetPath);
                if (asset != null)
                {
                    Selection.activeObject = asset;
                    EditorGUIUtility.PingObject(asset);
                }
            }
            
            if (result.HasFix && GUILayout.Button("Fix", GUILayout.Width(40)))
            {
                ApplyFix(result);
            }
            
            EditorGUILayout.EndHorizontal();
        }
        
        private void DrawCategoryManagement()
        {
            EditorGUILayout.LabelField("Validation Categories", EditorStyles.boldLabel);
            EditorGUILayout.Space();
            
            foreach (var category in categories.Values)
            {
                EditorGUILayout.BeginHorizontal("box");
                
                category.Enabled = EditorGUILayout.Toggle(category.Enabled, GUILayout.Width(20));
                EditorGUILayout.LabelField(category.Name, GUILayout.Width(150));
                EditorGUILayout.LabelField($"{category.Validators.Count} validators", GUILayout.Width(100));
                
                if (GUILayout.Button("Configure", GUILayout.Width(80)))
                {
                    ConfigureCategory(category);
                }
                
                EditorGUILayout.EndHorizontal();
            }
        }
        
        private void DrawStatusBar()
        {
            EditorGUILayout.BeginHorizontal(EditorStyles.toolbar);
            
            if (isValidating)
            {
                EditorGUILayout.LabelField("Validating...", EditorStyles.toolbarLabel);
                var rect = GUILayoutUtility.GetRect(100, 16);
                EditorGUI.ProgressBar(rect, validationRunner.Progress, "");
            }
            else
            {
                EditorGUILayout.LabelField($"Last validation: {GetTimeAgo(lastValidationTime)}", EditorStyles.toolbarLabel);
            }
            
            GUILayout.FlexibleSpace();
            
            minimumSeverity = (ValidationSeverity)EditorGUILayout.EnumPopup(minimumSeverity, EditorStyles.toolbarPopup, GUILayout.Width(80));
            showOnlyErrors = GUILayout.Toggle(showOnlyErrors, "Errors Only", EditorStyles.toolbarButton);
            groupByCategory = GUILayout.Toggle(groupByCategory, "Group", EditorStyles.toolbarButton);
            
            EditorGUILayout.EndHorizontal();
        }
        
        #endregion
        
        #region Validation Execution
        
        private void RunFullValidation()
        {
            if (isValidating)
            {
                Debug.LogWarning("Validation already in progress");
                return;
            }
            
            var activeValidators = GetActiveValidators();
            validationRunner.RunValidation(activeValidators);
        }
        
        private List<IValidator> GetActiveValidators()
        {
            var activeValidators = new List<IValidator>();
            
            foreach (var category in categories.Values)
            {
                if (category.Enabled)
                {
                    activeValidators.AddRange(category.Validators);
                }
            }
            
            // Filter by validation type settings
            return activeValidators.Where(v => IsValidatorEnabled(v)).ToList();
        }
        
        private bool IsValidatorEnabled(IValidator validator)
        {
            switch (validator.ValidationType)
            {
                case ValidationType.Asset: return enableAssetValidation;
                case ValidationType.Code: return enableCodeValidation;
                case ValidationType.Scene: return enableSceneValidation;
                case ValidationType.Settings: return true; // Always enabled
                default: return true;
            }
        }
        
        private void HandleRealTimeValidation()
        {
            if (!enableRealTimeValidation || isValidating)
                return;
                
            if (Time.realtimeSinceStartup - lastValidationTime > configuration.RealTimeValidationInterval)
            {
                RunIncrementalValidation();
                lastValidationTime = Time.realtimeSinceStartup;
            }
        }
        
        private void RunIncrementalValidation()
        {
            // Run only quick validators for real-time validation
            var quickValidators = GetActiveValidators().Where(v => v.IsQuickValidator).ToList();
            
            if (quickValidators.Count > 0)
            {
                validationRunner.RunQuickValidation(quickValidators);
            }
        }
        
        #endregion
        
        #region Event Handlers
        
        private void OnValidationStarted()
        {
            isValidating = true;
            Repaint();
        }
        
        private void OnValidationCompleted(List<ValidationResult> results)
        {
            isValidating = false;
            validationResults.Clear();
            validationResults.AddRange(results);
            
            currentSummary = GenerateValidationSummary(results);
            lastValidationTime = Time.realtimeSinceStartup;
            
            Repaint();
            
            // Show notification for critical issues
            if (currentSummary.ErrorCount > 0)
            {
                ShowNotification(new GUIContent($"{currentSummary.ErrorCount} validation errors found!"));
            }
        }
        
        private void OnValidationProgress(float progress, string currentValidator)
        {
            Repaint();
        }
        
        private void OnAssetChanged(string assetPath)
        {
            if (enableRealTimeValidation && enableAssetValidation)
            {
                ValidateAsset(assetPath);
            }
        }
        
        private void OnCodeAnalysisComplete(List<ValidationResult> results)
        {
            var codeResults = validationResults.Where(r => r.Category != "Code").ToList();
            codeResults.AddRange(results);
            validationResults.Clear();
            validationResults.AddRange(codeResults);
            
            Repaint();
        }
        
        private void OnSceneValidated(List<ValidationResult> results)
        {
            var nonSceneResults = validationResults.Where(r => r.Category != "Scenes").ToList();
            nonSceneResults.AddRange(results);
            validationResults.Clear();
            validationResults.AddRange(nonSceneResults);
            
            Repaint();
        }
        
        #endregion
        
        #region Editor Callbacks
        
        private void RegisterEditorCallbacks()
        {
            EditorApplication.projectChanged += OnProjectChanged;
            EditorApplication.hierarchyChanged += OnHierarchyChanged;
            EditorApplication.playModeStateChanged += OnPlayModeStateChanged;
        }
        
        private void UnregisterEditorCallbacks()
        {
            EditorApplication.projectChanged -= OnProjectChanged;
            EditorApplication.hierarchyChanged -= OnHierarchyChanged;
            EditorApplication.playModeStateChanged -= OnPlayModeStateChanged;
        }
        
        private void OnProjectChanged()
        {
            if (enableRealTimeValidation)
            {
                RunIncrementalValidation();
            }
        }
        
        private void OnHierarchyChanged()
        {
            if (enableRealTimeValidation && enableSceneValidation)
            {
                sceneInspector?.ValidateCurrentScene();
            }
        }
        
        private void OnPlayModeStateChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.ExitingEditMode)
            {
                // Run validation before entering play mode
                RunFullValidation();
            }
        }
        
        #endregion
        
        #region Utility Methods
        
        private void ValidateAsset(string assetPath)
        {
            var assetValidators = validators.Where(v => 
                v.ValidationType == ValidationType.Asset && 
                v.CanValidate(assetPath)).ToList();
                
            if (assetValidators.Count > 0)
            {
                validationRunner.RunAssetValidation(assetValidators, assetPath);
            }
        }
        
        private ValidationSummary GenerateValidationSummary(List<ValidationResult> results)
        {
            return new ValidationSummary
            {
                TotalIssues = results.Count,
                ErrorCount = results.Count(r => r.Severity == ValidationSeverity.Error),
                WarningCount = results.Count(r => r.Severity == ValidationSeverity.Warning),
                InfoCount = results.Count(r => r.Severity == ValidationSeverity.Info),
                Categories = results.GroupBy(r => r.Category).ToDictionary(g => g.Key, g => g.Count())
            };
        }
        
        private void ClearValidationResults()
        {
            validationResults.Clear();
            currentSummary = null;
            Repaint();
        }
        
        private void HandleResultClick(ValidationResult result)
        {
            if (!string.IsNullOrEmpty(result.AssetPath))
            {
                var asset = AssetDatabase.LoadAssetAtPath<UnityEngine.Object>(result.AssetPath);
                if (asset != null)
                {
                    Selection.activeObject = asset;
                    EditorGUIUtility.PingObject(asset);
                }
            }
            
            if (result.LineNumber > 0 && result.AssetPath.EndsWith(".cs"))
            {
                AssetDatabase.OpenAsset(AssetDatabase.LoadAssetAtPath<UnityEngine.Object>(result.AssetPath), result.LineNumber);
            }
        }
        
        private void ApplyFix(ValidationResult result)
        {
            try
            {
                if (result.FixAction != null)
                {
                    result.FixAction.Invoke();
                    
                    // Re-validate to check if fix was successful
                    var validator = validators.FirstOrDefault(v => v.GetType().Name == result.ValidatorName);
                    if (validator != null)
                    {
                        var fixResult = validator.Validate();
                        if (fixResult.All(r => r.Severity != ValidationSeverity.Error))
                        {
                            ShowNotification(new GUIContent("Fix applied successfully!"));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to apply fix: {ex.Message}");
                ShowNotification(new GUIContent("Fix failed!"));
            }
        }
        
        private void ConfigureCategory(ValidationCategory category)
        {
            // Open category configuration window
            CategoryConfigurationWindow.ShowWindow(category);
        }
        
        private MessageType GetMessageType(ValidationSeverity severity)
        {
            switch (severity)
            {
                case ValidationSeverity.Error: return MessageType.Error;
                case ValidationSeverity.Warning: return MessageType.Warning;
                case ValidationSeverity.Info: return MessageType.Info;
                default: return MessageType.None;
            }
        }
        
        private GUIStyle GetResultStyle(ValidationSeverity severity)
        {
            switch (severity)
            {
                case ValidationSeverity.Error: return "ErrorLabel";
                case ValidationSeverity.Warning: return "WarningLabel";
                default: return EditorStyles.label;
            }
        }
        
        private string GetTimeAgo(float timestamp)
        {
            if (timestamp == 0f) return "Never";
            
            var elapsed = Time.realtimeSinceStartup - timestamp;
            if (elapsed < 60f) return "Just now";
            if (elapsed < 3600f) return $"{Mathf.FloorToInt(elapsed / 60f)}m ago";
            return $"{Mathf.FloorToInt(elapsed / 3600f)}h ago";
        }
        
        private void CleanupValidationFramework()
        {
            validationRunner?.Dispose();
            assetMonitor?.Dispose();
            codeAnalyzer?.Dispose();
            sceneInspector?.Dispose();
        }
        
        #endregion
    }
    
    #region Validation Framework Classes
    
    /// <summary>
    /// Base interface for all validators
    /// </summary>
    public interface IValidator
    {
        string Name { get; }
        string Category { get; }
        string Description { get; }
        ValidationType ValidationType { get; }
        bool IsQuickValidator { get; }
        
        void Initialize();
        List<ValidationResult> Validate();
        bool CanValidate(string assetPath);
    }
    
    /// <summary>
    /// Validation type enumeration
    /// </summary>
    public enum ValidationType
    {
        Asset,
        Code,
        Scene,
        Settings
    }
    
    /// <summary>
    /// Validation severity enumeration
    /// </summary>
    public enum ValidationSeverity
    {
        Info = 0,
        Warning = 1,
        Error = 2
    }
    
    /// <summary>
    /// Validation result data structure
    /// </summary>
    [Serializable]
    public class ValidationResult
    {
        public string Id;
        public string Message;
        public string Category;
        public ValidationSeverity Severity;
        public string AssetPath;
        public int LineNumber;
        public string ValidatorName;
        public bool HasFix;
        public Action FixAction;
        public DateTime Timestamp;
        public Dictionary<string, object> Metadata;
        
        public ValidationResult()
        {
            Id = Guid.NewGuid().ToString();
            Timestamp = DateTime.UtcNow;
            Metadata = new Dictionary<string, object>();
        }
    }
    
    /// <summary>
    /// Validation summary statistics
    /// </summary>
    public class ValidationSummary
    {
        public int TotalIssues;
        public int ErrorCount;
        public int WarningCount;
        public int InfoCount;
        public Dictionary<string, int> Categories;
    }
    
    /// <summary>
    /// Validation category configuration
    /// </summary>
    [Serializable]
    public class ValidationCategory
    {
        public string Name;
        public bool Enabled;
        public List<IValidator> Validators;
        public ValidationConfiguration CategoryConfig;
    }
    
    /// <summary>
    /// Validation configuration settings
    /// </summary>
    [Serializable]
    public class ValidationConfiguration : ScriptableObject
    {
        [Header("General Settings")]
        public bool EnableRealTimeValidation = true;
        public bool EnableAssetValidation = true;
        public bool EnableCodeValidation = true;
        public bool EnableSceneValidation = true;
        
        [Header("Real-time Settings")]
        public float RealTimeValidationInterval = 2.0f;
        public bool ValidateOnSave = true;
        public bool ValidateBeforePlayMode = true;
        
        [Header("Severity Settings")]
        public ValidationSeverity MinimumSeverity = ValidationSeverity.Warning;
        public bool TreatWarningsAsErrors = false;
        
        [Header("Custom Validators")]
        public List<Type> CustomValidators = new List<Type>();
        
        public static ValidationConfiguration LoadOrCreate()
        {
            var config = AssetDatabase.LoadAssetAtPath<ValidationConfiguration>("Assets/Editor/Validation/ValidationConfiguration.asset");
            
            if (config == null)
            {
                config = CreateInstance<ValidationConfiguration>();
                AssetDatabase.CreateAsset(config, "Assets/Editor/Validation/ValidationConfiguration.asset");
                AssetDatabase.SaveAssets();
            }
            
            return config;
        }
    }
    
    #endregion
}
```

### 2. Asset and Code Validation Systems

#### 2.1 Comprehensive Asset and Code Analysis

[[LLM: Create specialized validation systems for different asset types and code analysis. Design validators for textures, audio, prefabs, scenes, and scripts that check for common issues, performance problems, and project standards compliance. Include automated fixes where possible and detailed reporting for manual resolution.]]

**Asset and Code Validation Systems**:

```csharp
// Assets/Editor/Validation/Validators/AssetValidators.cs
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEditor;
using {{project_namespace}}.Editor.Validation;

namespace {{project_namespace}}.Editor.Validation.Validators
{
    /// <summary>
    /// Validates texture assets for format, size, and import settings
    /// </summary>
    public class TextureFormatValidator : IValidator
    {
        public string Name => "Texture Format Validator";
        public string Category => "Assets";
        public string Description => "Validates texture import settings and formats";
        public ValidationType ValidationType => ValidationType.Asset;
        public bool IsQuickValidator => true;
        
        private readonly Dictionary<TextureImporterType, int> maxTextureSizes = new Dictionary<TextureImporterType, int>
        {
            { TextureImporterType.Default, 2048 },
            { TextureImporterType.NormalMap, 1024 },
            { TextureImporterType.GUI, 512 },
            { TextureImporterType.Sprite, 1024 }
        };
        
        public void Initialize()
        {
            // Initialize validator-specific settings
        }
        
        public List<ValidationResult> Validate()
        {
            var results = new List<ValidationResult>();
            var textureGUIDs = AssetDatabase.FindAssets("t:Texture2D");
            
            foreach (var guid in textureGUIDs)
            {
                var assetPath = AssetDatabase.GUIDToAssetPath(guid);
                ValidateTexture(assetPath, results);
            }
            
            return results;
        }
        
        public bool CanValidate(string assetPath)
        {
            return assetPath.EndsWith(".png") || assetPath.EndsWith(".jpg") || 
                   assetPath.EndsWith(".jpeg") || assetPath.EndsWith(".tga") ||
                   assetPath.EndsWith(".psd") || assetPath.EndsWith(".exr");
        }
        
        private void ValidateTexture(string assetPath, List<ValidationResult> results)
        {
            var textureImporter = AssetImporter.GetAtPath(assetPath) as TextureImporter;
            if (textureImporter == null) return;
            
            var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(assetPath);
            if (texture == null) return;
            
            // Check texture size
            ValidateTextureSize(texture, textureImporter, assetPath, results);
            
            // Check compression settings
            ValidateCompressionSettings(textureImporter, assetPath, results);
            
            // Check mipmap settings
            ValidateMipmapSettings(textureImporter, assetPath, results);
            
            // Check read/write enabled
            ValidateReadWriteSettings(textureImporter, assetPath, results);
        }
        
        private void ValidateTextureSize(Texture2D texture, TextureImporter importer, string assetPath, List<ValidationResult> results)
        {
            var maxSize = maxTextureSizes.ContainsKey(importer.textureType) ? 
                maxTextureSizes[importer.textureType] : 2048;
            
            if (texture.width > maxSize || texture.height > maxSize)
            {
                results.Add(new ValidationResult
                {
                    Message = $"Texture size ({texture.width}x{texture.height}) exceeds recommended maximum ({maxSize}x{maxSize})",
                    Category = Category,
                    Severity = ValidationSeverity.Warning,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasFix = true,
                    FixAction = () => ResizeTexture(importer, maxSize)
                });
            }
            
            // Check for non-power-of-two textures
            if (!Mathf.IsPowerOfTwo(texture.width) || !Mathf.IsPowerOfTwo(texture.height))
            {
                if (importer.textureType != TextureImporterType.GUI && importer.textureType != TextureImporterType.Sprite)
                {
                    results.Add(new ValidationResult
                    {
                        Message = $"Texture has non-power-of-two dimensions ({texture.width}x{texture.height})",
                        Category = Category,
                        Severity = ValidationSeverity.Warning,
                        AssetPath = assetPath,
                        ValidatorName = Name
                    });
                }
            }
        }
        
        private void ValidateCompressionSettings(TextureImporter importer, string assetPath, List<ValidationResult> results)
        {
            var platformSettings = importer.GetDefaultPlatformTextureSettings();
            
            // Check if compression is disabled
            if (platformSettings.format == TextureImporterFormat.RGBA32 || 
                platformSettings.format == TextureImporterFormat.RGB24)
            {
                results.Add(new ValidationResult
                {
                    Message = "Texture uses uncompressed format, consider using compressed format for better performance",
                    Category = Category,
                    Severity = ValidationSeverity.Info,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasFix = true,
                    FixAction = () => ApplyCompressionSettings(importer)
                });
            }
        }
        
        private void ValidateMipmapSettings(TextureImporter importer, string assetPath, List<ValidationResult> results)
        {
            if (importer.textureType == TextureImporterType.GUI && importer.mipmapEnabled)
            {
                results.Add(new ValidationResult
                {
                    Message = "GUI textures should not have mipmaps enabled",
                    Category = Category,
                    Severity = ValidationSeverity.Warning,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasFix = true,
                    FixAction = () => DisableMipmaps(importer)
                });
            }
        }
        
        private void ValidateReadWriteSettings(TextureImporter importer, string assetPath, List<ValidationResult> results)
        {
            if (importer.isReadable)
            {
                results.Add(new ValidationResult
                {
                    Message = "Texture has Read/Write enabled, which increases memory usage",
                    Category = Category,
                    Severity = ValidationSeverity.Warning,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasFix = true,
                    FixAction = () => DisableReadWrite(importer)
                });
            }
        }
        
        private void ResizeTexture(TextureImporter importer, int maxSize)
        {
            importer.maxTextureSize = maxSize;
            EditorUtility.SetDirty(importer);
            importer.SaveAndReimport();
        }
        
        private void ApplyCompressionSettings(TextureImporter importer)
        {
            var platformSettings = importer.GetDefaultPlatformTextureSettings();
            
            switch (importer.textureType)
            {
                case TextureImporterType.Default:
                    platformSettings.format = TextureImporterFormat.DXT5;
                    break;
                case TextureImporterType.NormalMap:
                    platformSettings.format = TextureImporterFormat.DXT5;
                    break;
                case TextureImporterType.Sprite:
                    platformSettings.format = TextureImporterFormat.DXT5;
                    break;
            }
            
            importer.SetPlatformTextureSettings(platformSettings);
            EditorUtility.SetDirty(importer);
            importer.SaveAndReimport();
        }
        
        private void DisableMipmaps(TextureImporter importer)
        {
            importer.mipmapEnabled = false;
            EditorUtility.SetDirty(importer);
            importer.SaveAndReimport();
        }
        
        private void DisableReadWrite(TextureImporter importer)
        {
            importer.isReadable = false;
            EditorUtility.SetDirty(importer);
            importer.SaveAndReimport();
        }
    }
    
    /// <summary>
    /// Validates prefab integrity and component references
    /// </summary>
    public class PrefabIntegrityValidator : IValidator
    {
        public string Name => "Prefab Integrity Validator";
        public string Category => "Assets";
        public string Description => "Validates prefab integrity and component references";
        public ValidationType ValidationType => ValidationType.Asset;
        public bool IsQuickValidator => false;
        
        public void Initialize()
        {
            // Initialize validator
        }
        
        public List<ValidationResult> Validate()
        {
            var results = new List<ValidationResult>();
            var prefabGUIDs = AssetDatabase.FindAssets("t:Prefab");
            
            foreach (var guid in prefabGUIDs)
            {
                var assetPath = AssetDatabase.GUIDToAssetPath(guid);
                ValidatePrefab(assetPath, results);
            }
            
            return results;
        }
        
        public bool CanValidate(string assetPath)
        {
            return assetPath.EndsWith(".prefab");
        }
        
        private void ValidatePrefab(string assetPath, List<ValidationResult> results)
        {
            var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(assetPath);
            if (prefab == null) return;
            
            // Check for missing scripts
            ValidateMissingScripts(prefab, assetPath, results);
            
            // Check for missing references
            ValidateMissingReferences(prefab, assetPath, results);
            
            // Check prefab hierarchy
            ValidatePrefabHierarchy(prefab, assetPath, results);
            
            // Check component configurations
            ValidateComponentConfigurations(prefab, assetPath, results);
        }
        
        private void ValidateMissingScripts(GameObject prefab, string assetPath, List<ValidationResult> results)
        {
            var components = prefab.GetComponentsInChildren<Component>(true);
            
            foreach (var component in components)
            {
                if (component == null)
                {
                    results.Add(new ValidationResult
                    {
                        Message = "Prefab contains missing script references",
                        Category = Category,
                        Severity = ValidationSeverity.Error,
                        AssetPath = assetPath,
                        ValidatorName = Name
                    });
                    break;
                }
            }
        }
        
        private void ValidateMissingReferences(GameObject prefab, string assetPath, List<ValidationResult> results)
        {
            var components = prefab.GetComponentsInChildren<Component>(true);
            
            foreach (var component in components)
            {
                if (component == null) continue;
                
                var serializedObject = new SerializedObject(component);
                var property = serializedObject.GetIterator();
                
                while (property.NextVisible(true))
                {
                    if (property.propertyType == SerializedPropertyType.ObjectReference)
                    {
                        if (property.objectReferenceValue == null && 
                            !string.IsNullOrEmpty(property.objectReferenceStringValue))
                        {
                            results.Add(new ValidationResult
                            {
                                Message = $"Missing reference in {component.GetType().Name}.{property.name}",
                                Category = Category,
                                Severity = ValidationSeverity.Error,
                                AssetPath = assetPath,
                                ValidatorName = Name
                            });
                        }
                    }
                }
            }
        }
        
        private void ValidatePrefabHierarchy(GameObject prefab, string assetPath, List<ValidationResult> results)
        {
            // Check for excessive nesting
            int maxDepth = CalculateMaxDepth(prefab.transform);
            if (maxDepth > 10)
            {
                results.Add(new ValidationResult
                {
                    Message = $"Prefab hierarchy is too deep ({maxDepth} levels), consider flattening",
                    Category = Category,
                    Severity = ValidationSeverity.Warning,
                    AssetPath = assetPath,
                    ValidatorName = Name
                });
            }
            
            // Check for inactive root object
            if (!prefab.activeInHierarchy)
            {
                results.Add(new ValidationResult
                {
                    Message = "Prefab root object is inactive",
                    Category = Category,
                    Severity = ValidationSeverity.Info,
                    AssetPath = assetPath,
                    ValidatorName = Name
                });
            }
        }
        
        private void ValidateComponentConfigurations(GameObject prefab, string assetPath, List<ValidationResult> results)
        {
            var renderers = prefab.GetComponentsInChildren<Renderer>(true);
            
            foreach (var renderer in renderers)
            {
                if (renderer.sharedMaterials.Any(m => m == null))
                {
                    results.Add(new ValidationResult
                    {
                        Message = $"Renderer on '{renderer.name}' has null material references",
                        Category = Category,
                        Severity = ValidationSeverity.Warning,
                        AssetPath = assetPath,
                        ValidatorName = Name
                    });
                }
            }
        }
        
        private int CalculateMaxDepth(Transform transform, int currentDepth = 0)
        {
            int maxDepth = currentDepth;
            
            for (int i = 0; i < transform.childCount; i++)
            {
                int childDepth = CalculateMaxDepth(transform.GetChild(i), currentDepth + 1);
                maxDepth = Mathf.Max(maxDepth, childDepth);
            }
            
            return maxDepth;
        }
    }
    
    /// <summary>
    /// Validates script compilation and coding standards
    /// </summary>
    public class ScriptCompilationValidator : IValidator
    {
        public string Name => "Script Compilation Validator";
        public string Category => "Code";
        public string Description => "Validates script compilation and coding standards";
        public ValidationType ValidationType => ValidationType.Code;
        public bool IsQuickValidator => true;
        
        private readonly List<string> requiredNamespaces = new List<string> 
        { 
            "{{project_namespace}}" 
        };
        
        private readonly Regex namingConventionRegex = new Regex(@"^[A-Z][a-zA-Z0-9]*$");
        
        public void Initialize()
        {
            // Initialize code validation rules
        }
        
        public List<ValidationResult> Validate()
        {
            var results = new List<ValidationResult>();
            var scriptGUIDs = AssetDatabase.FindAssets("t:Script");
            
            foreach (var guid in scriptGUIDs)
            {
                var assetPath = AssetDatabase.GUIDToAssetPath(guid);
                if (assetPath.Contains("Editor") && !assetPath.Contains("Tests"))
                {
                    continue; // Skip editor scripts for now
                }
                
                ValidateScript(assetPath, results);
            }
            
            return results;
        }
        
        public bool CanValidate(string assetPath)
        {
            return assetPath.EndsWith(".cs");
        }
        
        private void ValidateScript(string assetPath, List<ValidationResult> results)
        {
            if (!File.Exists(assetPath)) return;
            
            var scriptContent = File.ReadAllText(assetPath);
            var lines = scriptContent.Split('\n');
            
            // Validate namespace usage
            ValidateNamespace(scriptContent, assetPath, results);
            
            // Validate naming conventions
            ValidateNamingConventions(scriptContent, assetPath, results);
            
            // Validate code structure
            ValidateCodeStructure(scriptContent, assetPath, results);
            
            // Validate documentation
            ValidateDocumentation(lines, assetPath, results);
        }
        
        private void ValidateNamespace(string scriptContent, string assetPath, List<ValidationResult> results)
        {
            bool hasRequiredNamespace = requiredNamespaces.Any(ns => scriptContent.Contains($"namespace {ns}"));
            
            if (!hasRequiredNamespace && !scriptContent.Contains("namespace "))
            {
                results.Add(new ValidationResult
                {
                    Message = "Script should use a namespace",
                    Category = Category,
                    Severity = ValidationSeverity.Warning,
                    AssetPath = assetPath,
                    ValidatorName = Name
                });
            }
        }
        
        private void ValidateNamingConventions(string scriptContent, string assetPath, List<ValidationResult> results)
        {
            var fileName = Path.GetFileNameWithoutExtension(assetPath);
            
            // Check class name matches file name
            var classMatch = Regex.Match(scriptContent, @"public\s+class\s+(\w+)");
            if (classMatch.Success)
            {
                var className = classMatch.Groups[1].Value;
                if (className != fileName)
                {
                    results.Add(new ValidationResult
                    {
                        Message = $"Class name '{className}' should match file name '{fileName}'",
                        Category = Category,
                        Severity = ValidationSeverity.Error,
                        AssetPath = assetPath,
                        ValidatorName = Name
                    });
                }
                
                // Check naming convention
                if (!namingConventionRegex.IsMatch(className))
                {
                    results.Add(new ValidationResult
                    {
                        Message = $"Class name '{className}' does not follow PascalCase naming convention",
                        Category = Category,
                        Severity = ValidationSeverity.Warning,
                        AssetPath = assetPath,
                        ValidatorName = Name
                    });
                }
            }
        }
        
        private void ValidateCodeStructure(string scriptContent, string assetPath, List<ValidationResult> results)
        {
            // Check for empty catch blocks
            var emptyCatchPattern = @"catch\s*\([^)]*\)\s*\{\s*\}";
            if (Regex.IsMatch(scriptContent, emptyCatchPattern))
            {
                results.Add(new ValidationResult
                {
                    Message = "Empty catch block found, consider adding error handling",
                    Category = Category,
                    Severity = ValidationSeverity.Warning,
                    AssetPath = assetPath,
                    ValidatorName = Name
                });
            }
            
            // Check for Debug.Log in release code
            if (scriptContent.Contains("Debug.Log") && !assetPath.Contains("Test"))
            {
                results.Add(new ValidationResult
                {
                    Message = "Debug.Log found in production code, consider using a logging service",
                    Category = Category,
                    Severity = ValidationSeverity.Info,
                    AssetPath = assetPath,
                    ValidatorName = Name
                });
            }
        }
        
        private void ValidateDocumentation(string[] lines, string assetPath, List<ValidationResult> results)
        {
            var publicMethods = 0;
            var documentedMethods = 0;
            
            for (int i = 0; i < lines.Length; i++)
            {
                var line = lines[i].Trim();
                
                // Check for public methods
                if (line.StartsWith("public") && line.Contains("(") && line.Contains(")"))
                {
                    publicMethods++;
                    
                    // Check if previous lines contain documentation
                    for (int j = i - 1; j >= 0 && j >= i - 5; j--)
                    {
                        if (lines[j].Trim().StartsWith("///"))
                        {
                            documentedMethods++;
                            break;
                        }
                        if (!string.IsNullOrWhiteSpace(lines[j]) && !lines[j].Trim().StartsWith("//"))
                        {
                            break;
                        }
                    }
                }
            }
            
            if (publicMethods > 0 && documentedMethods < publicMethods * 0.5f)
            {
                results.Add(new ValidationResult
                {
                    Message = $"Only {documentedMethods}/{publicMethods} public methods are documented",
                    Category = Category,
                    Severity = ValidationSeverity.Info,
                    AssetPath = assetPath,
                    ValidatorName = Name
                });
            }
        }
    }
}
```

## Success Criteria

This Unity Editor Validation and Quality Assurance Task provides:

- **Comprehensive Validation Framework**: Complete editor-time validation system with real-time monitoring and automated quality checks
- **Asset Validation Systems**: Specialized validators for textures, prefabs, audio, and other Unity assets with automated fixes
- **Code Quality Analysis**: Script compilation validation, naming convention checking, and coding standards enforcement
- **Real-Time Monitoring**: Continuous validation during development with configurable update intervals and severity filtering
- **Automated Quality Gates**: Pre-play mode validation and asset import monitoring to prevent issues before runtime
- **Extensible Architecture**: Plugin system for custom validators and configurable validation rules
- **Detailed Reporting**: Comprehensive validation results with categorization, severity levels, and actionable fix suggestions
- **Editor Integration**: Native Unity Editor window with intuitive interface for managing validation results
- **Performance Optimized**: Efficient validation execution with incremental checking and quick validator patterns
- **Configuration Management**: Flexible configuration system supporting team-wide validation standards and custom rules

## Integration Points

This task integrates with:
- `unity-editor-integration.md` - Extends editor tools with validation capabilities
- `integration-tests.md` - Provides editor-time validation for integration testing scenarios
- `scriptableobject-setup.md` - Validates ScriptableObject configurations and data integrity
- `interface-design.md` - Validates interface implementation and dependency contracts
- `component-architecture.md` - Ensures component system integrity and architectural compliance

## Notes

This editor validation framework establishes a robust quality assurance foundation that prevents common issues, enforces coding standards, and maintains project health throughout development. The system provides immediate feedback to developers while supporting team-wide quality standards and automated validation workflows.

The architecture supports both individual developer productivity and team collaboration by providing consistent validation rules, automated fixes, and comprehensive reporting that scales with project complexity and team size.