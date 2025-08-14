# Unity Editor Integration Task

## Purpose

To establish comprehensive Unity Editor automation patterns for workflow optimization, custom tools development, and build pipeline integration. This task focuses on creating sophisticated Editor scripting solutions that automate repetitive development tasks, enhance team productivity, and integrate seamlessly with Unity's Editor architecture. Provides foundation for advanced Editor workflows including asset processing automation, custom tool development, and project management systems.

## Prerequisites

- Unity project with Editor scripting assemblies configured and Assembly Definition files set up
- Unity Editor development environment with proper folder structure (Editor/, Editor Default Resources/)
- Understanding of Unity's Editor scripting API and immediate mode GUI (IMGUI) systems
- Knowledge of Unity's asset processing pipeline and AssetPostprocessor workflows
- Editor preferences and project settings access for configuration management
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps for Unity Editor scripting environment setup]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Editor Automation Framework Architecture

#### 1.1 Core Editor Automation System

[[LLM: Analyze the project's development workflow to identify repetitive tasks, manual processes, and areas where Editor automation can significantly improve productivity. Design a comprehensive automation framework that handles asset processing, project setup, build automation, and quality assurance workflows. Focus on creating reusable, configurable systems that integrate seamlessly with Unity's Editor architecture.]]

**Editor Automation Foundation System**:

```csharp
// Assets/Editor/Automation/EditorAutomationFramework.cs
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;

namespace {{project_namespace}}.Editor.Automation
{
    /// <summary>
    /// Comprehensive Unity Editor automation framework for workflow optimization
    /// Provides extensible automation patterns for asset processing, build automation, and development workflows
    /// </summary>
    public class EditorAutomationFramework : EditorWindow, IPreprocessBuildWithReport, IPostprocessBuildWithReport
    {
        [Header("Automation Configuration")]
        [SerializeField] private bool enableAssetAutomation = true;
        [SerializeField] private bool enableBuildAutomation = true;
        [SerializeField] private bool enableProjectValidation = true;
        [SerializeField] private bool enablePerformanceMonitoring = true;

        [Header("Asset Processing")]
        [SerializeField] private bool autoOptimizeTextures = true;
        [SerializeField] private bool autoGenerateSpritAtlases = true;
        [SerializeField] private bool autoSetupAudioImport = true;
        [SerializeField] private bool autoValidateAssetNaming = true;

        [Header("Build Configuration")]
        [SerializeField] private bool autoIncrementBuildNumber = true;
        [SerializeField] private bool autoGenerateBuildReport = true;
        [SerializeField] private bool autoCleanupAfterBuild = true;
        [SerializeField] private bool autoValidateBeforeBuild = true;

        private static EditorAutomationConfig config;
        private static List<IEditorAutomationTask> automationTasks = new List<IEditorAutomationTask>();
        private static Dictionary<string, AutomationTaskResult> taskResults = new Dictionary<string, AutomationTaskResult>();

        private Vector2 scrollPosition;
        private string[] automationCategories = { "Asset Processing", "Build Automation", "Project Validation", "Performance", "Custom Tasks" };
        private int selectedCategory = 0;
        private bool showAdvancedSettings = false;

        public int callbackOrder => 0;

        #region Unity Editor Lifecycle

        [MenuItem("{{project_namespace}}/Editor Automation Framework", false, 1)]
        public static void ShowWindow()
        {
            var window = GetWindow<EditorAutomationFramework>("Editor Automation");
            window.minSize = new Vector2(400, 300);
            window.Show();
        }

        private void OnEnable()
        {
            try
            {
                LoadConfiguration();
                InitializeAutomationFramework();
                RegisterBuiltInTasks();
                
                EditorApplication.playModeStateChanged += OnPlayModeStateChanged;
                EditorApplication.projectChanged += OnProjectChanged;
                
                titleContent = new GUIContent("Editor Automation", EditorGUIUtility.IconContent("Settings").image);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[EditorAutomationFramework] Initialization failed: {ex.Message}");
            }
        }

        private void OnDisable()
        {
            try
            {
                SaveConfiguration();
                
                EditorApplication.playModeStateChanged -= OnPlayModeStateChanged;
                EditorApplication.projectChanged -= OnProjectChanged;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[EditorAutomationFramework] Cleanup failed: {ex.Message}");
            }
        }

        private void OnGUI()
        {
            DrawHeader();
            DrawCategoryTabs();
            DrawCategoryContent();
            DrawFooter();
        }

        #endregion

        #region Framework Initialization

        private void LoadConfiguration()
        {
            var configPath = "Assets/Editor/Automation/EditorAutomationConfig.asset";
            config = AssetDatabase.LoadAssetAtPath<EditorAutomationConfig>(configPath);
            
            if (config == null)
            {
                config = CreateInstance<EditorAutomationConfig>();
                
                if (!Directory.Exists(Path.GetDirectoryName(configPath)))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(configPath));
                }
                
                AssetDatabase.CreateAsset(config, configPath);
                AssetDatabase.SaveAssets();
            }
        }

        private void SaveConfiguration()
        {
            if (config != null)
            {
                EditorUtility.SetDirty(config);
                AssetDatabase.SaveAssets();
            }
        }

        private void InitializeAutomationFramework()
        {
            try
            {
                // Initialize automation systems
                AssetPostprocessorAutomation.Initialize(config);
                BuildAutomationSystem.Initialize(config);
                ProjectValidationSystem.Initialize(config);
                
                Debug.Log("[EditorAutomationFramework] Framework initialized successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[EditorAutomationFramework] Framework initialization error: {ex.Message}");
                throw;
            }
        }

        private void RegisterBuiltInTasks()
        {
            // Asset processing tasks
            RegisterTask(new TextureOptimizationTask());
            RegisterTask(new SpriteAtlasGenerationTask());
            RegisterTask(new AudioImportSetupTask());
            RegisterTask(new AssetNamingValidationTask());
            
            // Build automation tasks
            RegisterTask(new BuildNumberIncrementTask());
            RegisterTask(new BuildReportGenerationTask());
            RegisterTask(new PostBuildCleanupTask());
            RegisterTask(new PreBuildValidationTask());
            
            // Project validation tasks
            RegisterTask(new SceneValidationTask());
            RegisterTask(new AssetIntegrityValidationTask());
            RegisterTask(new CodeQualityValidationTask());
            RegisterTask(new PerformanceValidationTask());
        }

        #endregion

        #region Task Management

        public static void RegisterTask(IEditorAutomationTask task)
        {
            try
            {
                if (automationTasks.Any(t => t.TaskId == task.TaskId))
                {
                    Debug.LogWarning($"[EditorAutomationFramework] Task {task.TaskId} already registered, updating...");
                    automationTasks.RemoveAll(t => t.TaskId == task.TaskId);
                }

                task.Initialize();
                automationTasks.Add(task);
                
                Debug.Log($"[EditorAutomationFramework] Registered task: {task.TaskId}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[EditorAutomationFramework] Failed to register task {task.TaskId}: {ex.Message}");
            }
        }

        public static void UnregisterTask(string taskId)
        {
            try
            {
                var task = automationTasks.FirstOrDefault(t => t.TaskId == taskId);
                if (task != null)
                {
                    task.Cleanup();
                    automationTasks.Remove(task);
                    taskResults.Remove(taskId);
                    Debug.Log($"[EditorAutomationFramework] Unregistered task: {taskId}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[EditorAutomationFramework] Failed to unregister task {taskId}: {ex.Message}");
            }
        }

        public static void ExecuteTask(string taskId)
        {
            try
            {
                var task = automationTasks.FirstOrDefault(t => t.TaskId == taskId);
                if (task == null)
                {
                    Debug.LogWarning($"[EditorAutomationFramework] Task not found: {taskId}");
                    return;
                }

                if (!task.CanExecute())
                {
                    Debug.LogWarning($"[EditorAutomationFramework] Task cannot execute: {taskId}");
                    return;
                }

                EditorUtility.DisplayProgressBar("Automation", $"Executing {task.TaskName}...", 0f);
                
                var result = task.Execute();
                taskResults[taskId] = result;

                EditorUtility.ClearProgressBar();

                if (result.Success)
                {
                    Debug.Log($"[EditorAutomationFramework] Task completed successfully: {taskId}");
                }
                else
                {
                    Debug.LogError($"[EditorAutomationFramework] Task failed: {taskId} - {result.ErrorMessage}");
                }
            }
            catch (Exception ex)
            {
                EditorUtility.ClearProgressBar();
                Debug.LogError($"[EditorAutomationFramework] Task execution error for {taskId}: {ex.Message}");
            }
        }

        #endregion

        #region GUI Drawing

        private void DrawHeader()
        {
            EditorGUILayout.Space();
            
            using (new EditorGUILayout.HorizontalScope())
            {
                GUILayout.FlexibleSpace();
                
                var headerStyle = new GUIStyle(EditorStyles.boldLabel)
                {
                    fontSize = 18,
                    alignment = TextAnchor.MiddleCenter
                };
                
                EditorGUILayout.LabelField("Unity Editor Automation Framework", headerStyle);
                GUILayout.FlexibleSpace();
            }
            
            EditorGUILayout.Space();
            EditorGUILayout.LabelField("", GUI.skin.horizontalSlider);
        }

        private void DrawCategoryTabs()
        {
            using (new EditorGUILayout.HorizontalScope())
            {
                for (int i = 0; i < automationCategories.Length; i++)
                {
                    var buttonStyle = selectedCategory == i ? EditorStyles.miniButtonMid : EditorStyles.miniButton;
                    
                    if (GUILayout.Button(automationCategories[i], buttonStyle))
                    {
                        selectedCategory = i;
                    }
                }
            }
            
            EditorGUILayout.Space();
        }

        private void DrawCategoryContent()
        {
            using (var scrollScope = new EditorGUILayout.ScrollViewScope(scrollPosition))
            {
                scrollPosition = scrollScope.scrollPosition;
                
                switch (selectedCategory)
                {
                    case 0: DrawAssetProcessingSettings(); break;
                    case 1: DrawBuildAutomationSettings(); break;
                    case 2: DrawProjectValidationSettings(); break;
                    case 3: DrawPerformanceSettings(); break;
                    case 4: DrawCustomTasksSettings(); break;
                }
            }
        }

        private void DrawAssetProcessingSettings()
        {
            EditorGUILayout.LabelField("Asset Processing Automation", EditorStyles.boldLabel);
            EditorGUILayout.Space();

            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
            {
                autoOptimizeTextures = EditorGUILayout.Toggle("Auto Optimize Textures", autoOptimizeTextures);
                autoGenerateSpritAtlases = EditorGUILayout.Toggle("Auto Generate Sprite Atlases", autoGenerateSpritAtlases);
                autoSetupAudioImport = EditorGUILayout.Toggle("Auto Setup Audio Import", autoSetupAudioImport);
                autoValidateAssetNaming = EditorGUILayout.Toggle("Auto Validate Asset Naming", autoValidateAssetNaming);
            }

            EditorGUILayout.Space();
            DrawTaskExecutionButtons("Asset Processing");
        }

        private void DrawBuildAutomationSettings()
        {
            EditorGUILayout.LabelField("Build Automation", EditorStyles.boldLabel);
            EditorGUILayout.Space();

            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
            {
                autoIncrementBuildNumber = EditorGUILayout.Toggle("Auto Increment Build Number", autoIncrementBuildNumber);
                autoGenerateBuildReport = EditorGUILayout.Toggle("Auto Generate Build Report", autoGenerateBuildReport);
                autoCleanupAfterBuild = EditorGUILayout.Toggle("Auto Cleanup After Build", autoCleanupAfterBuild);
                autoValidateBeforeBuild = EditorGUILayout.Toggle("Auto Validate Before Build", autoValidateBeforeBuild);
            }

            EditorGUILayout.Space();
            DrawTaskExecutionButtons("Build Automation");
        }

        private void DrawProjectValidationSettings()
        {
            EditorGUILayout.LabelField("Project Validation", EditorStyles.boldLabel);
            EditorGUILayout.Space();

            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
            {
                if (GUILayout.Button("Validate All Scenes"))
                {
                    ExecuteTask("scene_validation");
                }
                
                if (GUILayout.Button("Validate Asset Integrity"))
                {
                    ExecuteTask("asset_integrity_validation");
                }
                
                if (GUILayout.Button("Validate Code Quality"))
                {
                    ExecuteTask("code_quality_validation");
                }
            }

            EditorGUILayout.Space();
            DrawValidationResults();
        }

        private void DrawPerformanceSettings()
        {
            EditorGUILayout.LabelField("Performance Monitoring", EditorStyles.boldLabel);
            EditorGUILayout.Space();

            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
            {
                if (GUILayout.Button("Analyze Project Performance"))
                {
                    ExecuteTask("performance_validation");
                }
                
                DrawPerformanceMetrics();
            }
        }

        private void DrawCustomTasksSettings()
        {
            EditorGUILayout.LabelField("Custom Automation Tasks", EditorStyles.boldLabel);
            EditorGUILayout.Space();

            var customTasks = automationTasks.Where(t => t.Category == "Custom").ToList();
            
            if (customTasks.Count == 0)
            {
                EditorGUILayout.HelpBox("No custom tasks registered. Create custom IEditorAutomationTask implementations to add them here.", MessageType.Info);
            }
            else
            {
                foreach (var task in customTasks)
                {
                    DrawCustomTaskInterface(task);
                }
            }
        }

        private void DrawTaskExecutionButtons(string category)
        {
            var categoryTasks = automationTasks.Where(t => t.Category == category).ToList();
            
            foreach (var task in categoryTasks)
            {
                using (new EditorGUILayout.HorizontalScope())
                {
                    EditorGUILayout.LabelField(task.TaskName, GUILayout.Width(200));
                    
                    GUI.enabled = task.CanExecute();
                    if (GUILayout.Button("Execute", GUILayout.Width(80)))
                    {
                        ExecuteTask(task.TaskId);
                    }
                    GUI.enabled = true;
                    
                    if (taskResults.ContainsKey(task.TaskId))
                    {
                        var result = taskResults[task.TaskId];
                        var statusColor = result.Success ? Color.green : Color.red;
                        
                        var originalColor = GUI.color;
                        GUI.color = statusColor;
                        EditorGUILayout.LabelField(result.Success ? "✓" : "✗", GUILayout.Width(20));
                        GUI.color = originalColor;
                    }
                }
            }
        }

        private void DrawValidationResults()
        {
            EditorGUILayout.LabelField("Validation Results", EditorStyles.boldLabel);
            
            foreach (var result in taskResults.Values.Where(r => r.Category == "Validation"))
            {
                var messageType = result.Success ? MessageType.Info : MessageType.Error;
                EditorGUILayout.HelpBox($"{result.TaskName}: {result.Message}", messageType);
            }
        }

        private void DrawPerformanceMetrics()
        {
            if (taskResults.ContainsKey("performance_validation"))
            {
                var result = taskResults["performance_validation"];
                if (result.Success && result.Data.ContainsKey("metrics"))
                {
                    var metrics = result.Data["metrics"] as Dictionary<string, object>;
                    if (metrics != null)
                    {
                        EditorGUILayout.LabelField("Performance Metrics", EditorStyles.boldLabel);
                        
                        foreach (var metric in metrics)
                        {
                            EditorGUILayout.LabelField($"{metric.Key}: {metric.Value}");
                        }
                    }
                }
            }
        }

        private void DrawCustomTaskInterface(IEditorAutomationTask task)
        {
            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
            {
                EditorGUILayout.LabelField(task.TaskName, EditorStyles.boldLabel);
                EditorGUILayout.LabelField(task.Description, EditorStyles.wordWrappedLabel);
                
                using (new EditorGUILayout.HorizontalScope())
                {
                    GUI.enabled = task.CanExecute();
                    if (GUILayout.Button("Execute"))
                    {
                        ExecuteTask(task.TaskId);
                    }
                    GUI.enabled = true;
                    
                    if (GUILayout.Button("Configure"))
                    {
                        task.ShowConfiguration();
                    }
                }
            }
        }

        private void DrawFooter()
        {
            EditorGUILayout.Space();
            EditorGUILayout.LabelField("", GUI.skin.horizontalSlider);
            
            using (new EditorGUILayout.HorizontalScope())
            {
                showAdvancedSettings = EditorGUILayout.Toggle("Show Advanced Settings", showAdvancedSettings);
                
                GUILayout.FlexibleSpace();
                
                if (GUILayout.Button("Export Configuration"))
                {
                    ExportConfiguration();
                }
                
                if (GUILayout.Button("Import Configuration"))
                {
                    ImportConfiguration();
                }
            }
            
            if (showAdvancedSettings)
            {
                DrawAdvancedSettings();
            }
        }

        private void DrawAdvancedSettings()
        {
            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
            {
                EditorGUILayout.LabelField("Advanced Settings", EditorStyles.boldLabel);
                
                enableAssetAutomation = EditorGUILayout.Toggle("Enable Asset Automation", enableAssetAutomation);
                enableBuildAutomation = EditorGUILayout.Toggle("Enable Build Automation", enableBuildAutomation);
                enableProjectValidation = EditorGUILayout.Toggle("Enable Project Validation", enableProjectValidation);
                enablePerformanceMonitoring = EditorGUILayout.Toggle("Enable Performance Monitoring", enablePerformanceMonitoring);
            }
        }

        #endregion

        #region Event Handlers

        private void OnPlayModeStateChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.ExitingEditMode)
            {
                if (autoValidateBeforeBuild)
                {
                    ValidateProjectBeforePlay();
                }
            }
        }

        private void OnProjectChanged()
        {
            if (enableAssetAutomation)
            {
                // Trigger asset validation when project changes
                EditorApplication.delayCall += () => ExecuteTask("asset_integrity_validation");
            }
        }

        #endregion

        #region Build Integration

        public void OnPreprocessBuild(BuildReport report)
        {
            if (!enableBuildAutomation)
                return;

            try
            {
                Debug.Log("[EditorAutomationFramework] Running pre-build automation tasks...");

                if (autoValidateBeforeBuild)
                {
                    ExecuteTask("pre_build_validation");
                }

                if (autoIncrementBuildNumber)
                {
                    ExecuteTask("build_number_increment");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[EditorAutomationFramework] Pre-build automation failed: {ex.Message}");
                throw new BuildFailedException($"Pre-build automation failed: {ex.Message}");
            }
        }

        public void OnPostprocessBuild(BuildReport report)
        {
            if (!enableBuildAutomation)
                return;

            try
            {
                Debug.Log("[EditorAutomationFramework] Running post-build automation tasks...");

                if (autoGenerateBuildReport)
                {
                    ExecuteTask("build_report_generation");
                }

                if (autoCleanupAfterBuild)
                {
                    ExecuteTask("post_build_cleanup");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[EditorAutomationFramework] Post-build automation failed: {ex.Message}");
            }
        }

        #endregion

        #region Configuration Management

        private void ExportConfiguration()
        {
            var path = EditorUtility.SaveFilePanel("Export Automation Configuration", "", "EditorAutomationConfig", "json");
            if (!string.IsNullOrEmpty(path))
            {
                try
                {
                    var json = JsonUtility.ToJson(config, true);
                    File.WriteAllText(path, json);
                    Debug.Log($"[EditorAutomationFramework] Configuration exported to: {path}");
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[EditorAutomationFramework] Export failed: {ex.Message}");
                }
            }
        }

        private void ImportConfiguration()
        {
            var path = EditorUtility.OpenFilePanel("Import Automation Configuration", "", "json");
            if (!string.IsNullOrEmpty(path))
            {
                try
                {
                    var json = File.ReadAllText(path);
                    JsonUtility.FromJsonOverwrite(json, config);
                    EditorUtility.SetDirty(config);
                    Debug.Log($"[EditorAutomationFramework] Configuration imported from: {path}");
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[EditorAutomationFramework] Import failed: {ex.Message}");
                }
            }
        }

        private void ValidateProjectBeforePlay()
        {
            var validationTasks = automationTasks.Where(t => t.Category == "Validation").ToList();
            
            foreach (var task in validationTasks)
            {
                try
                {
                    var result = task.Execute();
                    if (!result.Success)
                    {
                        Debug.LogWarning($"[EditorAutomationFramework] Validation warning: {result.ErrorMessage}");
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[EditorAutomationFramework] Validation error: {ex.Message}");
                }
            }
        }

        #endregion
    }

    #region Supporting Classes and Interfaces

    /// <summary>
    /// Interface for custom automation tasks
    /// </summary>
    public interface IEditorAutomationTask
    {
        string TaskId { get; }
        string TaskName { get; }
        string Description { get; }
        string Category { get; }
        
        void Initialize();
        bool CanExecute();
        AutomationTaskResult Execute();
        void ShowConfiguration();
        void Cleanup();
    }

    [Serializable]
    public class AutomationTaskResult
    {
        public string TaskName;
        public string Category;
        public bool Success;
        public string Message;
        public string ErrorMessage;
        public Dictionary<string, object> Data;
        public float ExecutionTime;

        public AutomationTaskResult()
        {
            Data = new Dictionary<string, object>();
        }
    }

    [CreateAssetMenu(fileName = "EditorAutomationConfig", menuName = "{{project_namespace}}/Editor Automation Config")]
    public class EditorAutomationConfig : ScriptableObject
    {
        [Header("Asset Processing")]
        public bool autoOptimizeTextures = true;
        public bool autoGenerateSpritAtlases = true;
        public bool autoSetupAudioImport = true;
        public bool autoValidateAssetNaming = true;

        [Header("Build Automation")]
        public bool autoIncrementBuildNumber = true;
        public bool autoGenerateBuildReport = true;
        public bool autoCleanupAfterBuild = true;
        public bool autoValidateBeforeBuild = true;

        [Header("Validation Settings")]
        public bool enableRealTimeValidation = true;
        public bool enablePerformanceChecks = true;
        public bool enableCodeQualityChecks = true;

        [Header("Advanced Settings")]
        public string customTasksAssembly = "";
        public string outputDirectory = "Assets/AutomationOutput/";
        public int maxExecutionTimeSeconds = 300;
    }

    #endregion
}
```

### 2. Asset Processing Automation System

#### 2.1 Advanced Asset Postprocessor Implementation

[[LLM: Create sophisticated asset postprocessor systems that automatically optimize imported assets based on project requirements. Design systems that handle texture optimization, audio import settings, model import configuration, and sprite atlas generation. Ensure the system is configurable and can adapt to different project needs while maintaining optimal performance.]]

**Asset Processing Automation**:

```csharp
// Assets/Editor/Automation/AssetPostprocessorAutomation.cs
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEditor;
using UnityEngine.U2D;
using UnityEditor.U2D;

namespace {{project_namespace}}.Editor.Automation
{
    /// <summary>
    /// Comprehensive asset postprocessor automation system for optimized asset import
    /// </summary>
    public class AssetPostprocessorAutomation : AssetPostprocessor
    {
        private static EditorAutomationConfig config;
        private static Dictionary<string, AssetImportSettings> assetImportRules;

        public static void Initialize(EditorAutomationConfig automationConfig)
        {
            config = automationConfig;
            LoadAssetImportRules();
            Debug.Log("[AssetPostprocessorAutomation] Initialized with configuration");
        }

        #region Texture Processing

        void OnPreprocessTexture()
        {
            if (!config.autoOptimizeTextures)
                return;

            try
            {
                var textureImporter = assetImporter as TextureImporter;
                if (textureImporter == null)
                    return;

                ApplyTextureImportSettings(textureImporter);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AssetPostprocessorAutomation] Texture preprocessing error: {ex.Message}");
            }
        }

        void OnPostprocessTexture(Texture2D texture)
        {
            if (!config.autoOptimizeTextures)
                return;

            try
            {
                var textureImporter = assetImporter as TextureImporter;
                if (textureImporter == null)
                    return;

                ValidateTextureSettings(textureImporter, texture);
                
                if (config.autoGenerateSpritAtlases && IsSprite(textureImporter))
                {
                    ScheduleSpriteAtlasGeneration(assetPath);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AssetPostprocessorAutomation] Texture postprocessing error: {ex.Message}");
            }
        }

        private void ApplyTextureImportSettings(TextureImporter importer)
        {
            var assetPath = importer.assetPath;
            var fileName = Path.GetFileName(assetPath);
            var directory = Path.GetDirectoryName(assetPath);

            // Apply settings based on asset location and naming conventions
            if (directory.Contains("UI") || fileName.Contains("_ui"))
            {
                ApplyUITextureSettings(importer);
            }
            else if (directory.Contains("Sprites") || fileName.Contains("_sprite"))
            {
                ApplySpriteTextureSettings(importer);
            }
            else if (directory.Contains("Environment") || fileName.Contains("_env"))
            {
                ApplyEnvironmentTextureSettings(importer);
            }
            else if (directory.Contains("Characters") || fileName.Contains("_char"))
            {
                ApplyCharacterTextureSettings(importer);
            }
            else
            {
                ApplyDefaultTextureSettings(importer);
            }

            // Apply platform-specific settings
            ApplyPlatformSpecificSettings(importer);
        }

        private void ApplyUITextureSettings(TextureImporter importer)
        {
            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Single;
            importer.mipmapEnabled = false;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.filterMode = FilterMode.Bilinear;

            // UI textures should maintain crisp appearance
            var settings = new TextureImporterSettings();
            importer.ReadTextureSettings(settings);
            settings.spriteMeshType = SpriteMeshType.FullRect;
            settings.spriteExtrude = 0;
            settings.spritePivot = SpriteAlignment.Center;
            importer.SetTextureSettings(settings);
        }

        private void ApplySpriteTextureSettings(TextureImporter importer)
        {
            importer.textureType = TextureImporterType.Sprite;
            importer.spriteImportMode = SpriteImportMode.Single;
            importer.mipmapEnabled = false;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.filterMode = FilterMode.Point; // Pixel-perfect sprites

            var settings = new TextureImporterSettings();
            importer.ReadTextureSettings(settings);
            settings.spriteMeshType = SpriteMeshType.Tight;
            settings.spriteExtrude = 1;
            settings.spritePivot = SpriteAlignment.Center;
            importer.SetTextureSettings(settings);

            // Enable sprite atlas packing
            importer.spritePackingTag = GetSpritePackingTag(importer.assetPath);
        }

        private void ApplyEnvironmentTextureSettings(TextureImporter importer)
        {
            importer.textureType = TextureImporterType.Default;
            importer.mipmapEnabled = true;
            importer.wrapMode = TextureWrapMode.Repeat;
            importer.filterMode = FilterMode.Trilinear;
            importer.anisoLevel = 4;
        }

        private void ApplyCharacterTextureSettings(TextureImporter importer)
        {
            importer.textureType = TextureImporterType.Default;
            importer.mipmapEnabled = true;
            importer.wrapMode = TextureWrapMode.Clamp;
            importer.filterMode = FilterMode.Trilinear;
            importer.anisoLevel = 2;
        }

        private void ApplyDefaultTextureSettings(TextureImporter importer)
        {
            importer.textureType = TextureImporterType.Default;
            importer.mipmapEnabled = true;
            importer.wrapMode = TextureWrapMode.Repeat;
            importer.filterMode = FilterMode.Bilinear;
        }

        private void ApplyPlatformSpecificSettings(TextureImporter importer)
        {
            // Android settings
            var androidSettings = new TextureImporterPlatformSettings
            {
                name = "Android",
                overridden = true,
                maxTextureSize = GetOptimalTextureSize(importer),
                format = GetOptimalAndroidFormat(importer),
                compressionQuality = 50,
                crunchedCompression = true
            };
            importer.SetPlatformTextureSettings(androidSettings);

            // iOS settings
            var iosSettings = new TextureImporterPlatformSettings
            {
                name = "iPhone",
                overridden = true,
                maxTextureSize = GetOptimalTextureSize(importer),
                format = GetOptimalIOSFormat(importer),
                compressionQuality = 50
            };
            importer.SetPlatformTextureSettings(iosSettings);

            // Standalone settings
            var standaloneSettings = new TextureImporterPlatformSettings
            {
                name = "Standalone",
                overridden = true,
                maxTextureSize = GetOptimalTextureSize(importer),
                format = GetOptimalStandaloneFormat(importer),
                compressionQuality = 75
            };
            importer.SetPlatformTextureSettings(standaloneSettings);
        }

        private int GetOptimalTextureSize(TextureImporter importer)
        {
            // Get original texture size
            importer.GetSourceTextureWidthAndHeight(out int width, out int height);
            int maxDimension = Mathf.Max(width, height);

            // Round up to next power of 2
            int targetSize = Mathf.NextPowerOfTwo(maxDimension);

            // Cap based on texture type
            if (importer.textureType == TextureImporterType.Sprite)
            {
                return Mathf.Min(targetSize, 2048);
            }
            else
            {
                return Mathf.Min(targetSize, 4096);
            }
        }

        private TextureImporterFormat GetOptimalAndroidFormat(TextureImporter importer)
        {
            if (importer.DoesSourceTextureHaveAlpha())
            {
                return TextureImporterFormat.ETC2_RGBA8Crunched;
            }
            else
            {
                return TextureImporterFormat.ETC2_RGB4Crunched;
            }
        }

        private TextureImporterFormat GetOptimalIOSFormat(TextureImporter importer)
        {
            if (importer.DoesSourceTextureHaveAlpha())
            {
                return TextureImporterFormat.ASTC_4x4;
            }
            else
            {
                return TextureImporterFormat.ASTC_6x6;
            }
        }

        private TextureImporterFormat GetOptimalStandaloneFormat(TextureImporter importer)
        {
            if (importer.DoesSourceTextureHaveAlpha())
            {
                return TextureImporterFormat.DXT5Crunched;
            }
            else
            {
                return TextureImporterFormat.DXT1Crunched;
            }
        }

        #endregion

        #region Audio Processing

        void OnPreprocessAudio()
        {
            if (!config.autoSetupAudioImport)
                return;

            try
            {
                var audioImporter = assetImporter as AudioImporter;
                if (audioImporter == null)
                    return;

                ApplyAudioImportSettings(audioImporter);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AssetPostprocessorAutomation] Audio preprocessing error: {ex.Message}");
            }
        }

        private void ApplyAudioImportSettings(AudioImporter importer)
        {
            var assetPath = importer.assetPath;
            var fileName = Path.GetFileName(assetPath);
            var directory = Path.GetDirectoryName(assetPath);

            // Apply settings based on audio type
            if (directory.Contains("Music") || fileName.Contains("_music"))
            {
                ApplyMusicAudioSettings(importer);
            }
            else if (directory.Contains("SFX") || fileName.Contains("_sfx"))
            {
                ApplySFXAudioSettings(importer);
            }
            else if (directory.Contains("Voice") || fileName.Contains("_voice"))
            {
                ApplyVoiceAudioSettings(importer);
            }
            else if (directory.Contains("Ambient") || fileName.Contains("_ambient"))
            {
                ApplyAmbientAudioSettings(importer);
            }
            else
            {
                ApplyDefaultAudioSettings(importer);
            }
        }

        private void ApplyMusicAudioSettings(AudioImporter importer)
        {
            var settings = new AudioImporterSampleSettings
            {
                loadType = AudioClipLoadType.Streaming,
                compressionFormat = AudioCompressionFormat.Vorbis,
                quality = 0.7f,
                sampleRateSetting = AudioSampleRateSetting.OptimizeSize
            };

            importer.SetOverrideSampleSettings("Standalone", settings);
            importer.SetOverrideSampleSettings("Android", settings);
            importer.SetOverrideSampleSettings("iPhone", settings);
        }

        private void ApplySFXAudioSettings(AudioImporter importer)
        {
            var settings = new AudioImporterSampleSettings
            {
                loadType = AudioClipLoadType.DecompressOnLoad,
                compressionFormat = AudioCompressionFormat.ADPCM,
                quality = 0.75f,
                sampleRateSetting = AudioSampleRateSetting.OptimizeSize
            };

            importer.SetOverrideSampleSettings("Standalone", settings);
            importer.SetOverrideSampleSettings("Android", settings);
            importer.SetOverrideSampleSettings("iPhone", settings);
        }

        private void ApplyVoiceAudioSettings(AudioImporter importer)
        {
            var settings = new AudioImporterSampleSettings
            {
                loadType = AudioClipLoadType.CompressedInMemory,
                compressionFormat = AudioCompressionFormat.Vorbis,
                quality = 0.5f,
                sampleRateSetting = AudioSampleRateSetting.OptimizeSize
            };

            importer.SetOverrideSampleSettings("Standalone", settings);
            importer.SetOverrideSampleSettings("Android", settings);
            importer.SetOverrideSampleSettings("iPhone", settings);
        }

        private void ApplyAmbientAudioSettings(AudioImporter importer)
        {
            var settings = new AudioImporterSampleSettings
            {
                loadType = AudioClipLoadType.Streaming,
                compressionFormat = AudioCompressionFormat.Vorbis,
                quality = 0.6f,
                sampleRateSetting = AudioSampleRateSetting.OptimizeSize
            };

            importer.SetOverrideSampleSettings("Standalone", settings);
            importer.SetOverrideSampleSettings("Android", settings);
            importer.SetOverrideSampleSettings("iPhone", settings);
        }

        private void ApplyDefaultAudioSettings(AudioImporter importer)
        {
            var settings = new AudioImporterSampleSettings
            {
                loadType = AudioClipLoadType.CompressedInMemory,
                compressionFormat = AudioCompressionFormat.Vorbis,
                quality = 0.7f,
                sampleRateSetting = AudioSampleRateSetting.PreserveSampleRate
            };

            importer.SetOverrideSampleSettings("Standalone", settings);
            importer.SetOverrideSampleSettings("Android", settings);
            importer.SetOverrideSampleSettings("iPhone", settings);
        }

        #endregion

        #region Model Processing

        void OnPreprocessModel()
        {
            try
            {
                var modelImporter = assetImporter as ModelImporter;
                if (modelImporter == null)
                    return;

                ApplyModelImportSettings(modelImporter);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AssetPostprocessorAutomation] Model preprocessing error: {ex.Message}");
            }
        }

        private void ApplyModelImportSettings(ModelImporter importer)
        {
            var assetPath = importer.assetPath;
            var directory = Path.GetDirectoryName(assetPath);

            // Apply settings based on model type
            if (directory.Contains("Characters"))
            {
                ApplyCharacterModelSettings(importer);
            }
            else if (directory.Contains("Environment"))
            {
                ApplyEnvironmentModelSettings(importer);
            }
            else if (directory.Contains("Props"))
            {
                ApplyPropModelSettings(importer);
            }
            else
            {
                ApplyDefaultModelSettings(importer);
            }
        }

        private void ApplyCharacterModelSettings(ModelImporter importer)
        {
            importer.meshOptimization = MeshOptimizationFlags.Everything;
            importer.optimizeMeshPolygons = true;
            importer.optimizeMeshVertices = true;
            importer.weldVertices = true;
            importer.importBlendShapes = true;
            importer.importVisibility = false;
            importer.importCameras = false;
            importer.importLights = false;

            // Animation settings
            importer.animationType = ModelImporterAnimationType.Human;
            importer.optimizeGameObjects = true;
        }

        private void ApplyEnvironmentModelSettings(ModelImporter importer)
        {
            importer.meshOptimization = MeshOptimizationFlags.Everything;
            importer.optimizeMeshPolygons = true;
            importer.optimizeMeshVertices = true;
            importer.weldVertices = true;
            importer.importBlendShapes = false;
            importer.importVisibility = false;
            importer.importCameras = false;
            importer.importLights = false;
            importer.importAnimation = false;

            // Generate colliders for environment objects
            importer.addCollider = true;
        }

        private void ApplyPropModelSettings(ModelImporter importer)
        {
            importer.meshOptimization = MeshOptimizationFlags.Everything;
            importer.optimizeMeshPolygons = true;
            importer.optimizeMeshVertices = true;
            importer.weldVertices = true;
            importer.importBlendShapes = false;
            importer.importVisibility = false;
            importer.importCameras = false;
            importer.importLights = false;
            importer.importAnimation = false;
        }

        private void ApplyDefaultModelSettings(ModelImporter importer)
        {
            importer.meshOptimization = MeshOptimizationFlags.Standard;
            importer.optimizeMeshPolygons = true;
            importer.optimizeMeshVertices = true;
            importer.weldVertices = true;
        }

        #endregion

        #region Asset Validation and Naming

        void OnPostprocessAllAssets(string[] importedAssets, string[] deletedAssets, string[] movedAssets, string[] movedFromAssetPaths)
        {
            if (!config.autoValidateAssetNaming)
                return;

            try
            {
                foreach (var asset in importedAssets)
                {
                    ValidateAssetNaming(asset);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AssetPostprocessorAutomation] Asset validation error: {ex.Message}");
            }
        }

        private void ValidateAssetNaming(string assetPath)
        {
            var fileName = Path.GetFileNameWithoutExtension(assetPath);
            var extension = Path.GetExtension(assetPath);
            var directory = Path.GetDirectoryName(assetPath);

            // Check for invalid characters
            if (fileName.Contains(" "))
            {
                Debug.LogWarning($"[AssetValidation] Asset name contains spaces: {assetPath}. Consider using underscores instead.");
            }

            // Check naming conventions
            if (directory.Contains("Textures") && !fileName.Contains("_tex") && !fileName.Contains("_texture"))
            {
                Debug.LogWarning($"[AssetValidation] Texture should follow naming convention: {assetPath}. Consider adding '_tex' suffix.");
            }

            if (directory.Contains("Materials") && !fileName.Contains("_mat") && !fileName.Contains("_material"))
            {
                Debug.LogWarning($"[AssetValidation] Material should follow naming convention: {assetPath}. Consider adding '_mat' suffix.");
            }

            if (directory.Contains("Prefabs") && !fileName.Contains("_prefab") && extension == ".prefab")
            {
                Debug.LogWarning($"[AssetValidation] Prefab should follow naming convention: {assetPath}. Consider adding '_prefab' suffix.");
            }
        }

        #endregion

        #region Sprite Atlas Generation

        private bool IsSprite(TextureImporter importer)
        {
            return importer.textureType == TextureImporterType.Sprite;
        }

        private string GetSpritePackingTag(string assetPath)
        {
            var directory = Path.GetDirectoryName(assetPath);
            var directoryName = Path.GetFileName(directory);
            
            // Use directory name as packing tag
            return directoryName.ToLower().Replace(" ", "_");
        }

        private void ScheduleSpriteAtlasGeneration(string spritePath)
        {
            EditorApplication.delayCall += () => GenerateSpriteAtlas(spritePath);
        }

        private void GenerateSpriteAtlas(string spritePath)
        {
            try
            {
                var directory = Path.GetDirectoryName(spritePath);
                var directoryName = Path.GetFileName(directory);
                var atlasPath = Path.Combine(directory, $"{directoryName}_Atlas.spriteatlas");

                // Check if atlas already exists
                var existingAtlas = AssetDatabase.LoadAssetAtPath<SpriteAtlas>(atlasPath);
                if (existingAtlas != null)
                {
                    // Update existing atlas
                    UpdateSpriteAtlas(existingAtlas, directory);
                }
                else
                {
                    // Create new atlas
                    CreateSpriteAtlas(atlasPath, directory);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AssetPostprocessorAutomation] Sprite atlas generation error: {ex.Message}");
            }
        }

        private void CreateSpriteAtlas(string atlasPath, string spriteDirectory)
        {
            var atlas = new SpriteAtlas();
            
            // Configure atlas settings
            var packingSettings = new SpriteAtlasPackingSettings
            {
                blockOffset = 1,
                enableRotation = false,
                enableTightPacking = true,
                padding = 2
            };
            atlas.SetPackingSettings(packingSettings);

            var textureSettings = new SpriteAtlasTextureSettings
            {
                readable = false,
                generateMipMaps = false,
                sRGB = true,
                filterMode = FilterMode.Bilinear
            };
            atlas.SetTextureSettings(textureSettings);

            // Add sprites from directory
            AddSpritesToAtlas(atlas, spriteDirectory);

            // Save atlas
            AssetDatabase.CreateAsset(atlas, atlasPath);
            AssetDatabase.SaveAssets();
            
            Debug.Log($"[AssetPostprocessorAutomation] Created sprite atlas: {atlasPath}");
        }

        private void UpdateSpriteAtlas(SpriteAtlas atlas, string spriteDirectory)
        {
            // Clear existing objects
            atlas.Remove(atlas.GetPackables());
            
            // Add current sprites
            AddSpritesToAtlas(atlas, spriteDirectory);
            
            EditorUtility.SetDirty(atlas);
            AssetDatabase.SaveAssets();
        }

        private void AddSpritesToAtlas(SpriteAtlas atlas, string spriteDirectory)
        {
            var spriteGUIDs = AssetDatabase.FindAssets("t:Sprite", new[] { spriteDirectory });
            
            foreach (var guid in spriteGUIDs)
            {
                var spritePath = AssetDatabase.GUIDToAssetPath(guid);
                var sprite = AssetDatabase.LoadAssetAtPath<Sprite>(spritePath);
                
                if (sprite != null)
                {
                    atlas.Add(new UnityEngine.Object[] { sprite });
                }
            }
        }

        #endregion

        #region Utility Methods

        private static void LoadAssetImportRules()
        {
            assetImportRules = new Dictionary<string, AssetImportSettings>();
            
            // Load custom import rules from configuration
            var rulesPath = "Assets/Editor/Automation/AssetImportRules.json";
            if (File.Exists(rulesPath))
            {
                try
                {
                    var json = File.ReadAllText(rulesPath);
                    var rules = JsonUtility.FromJson<AssetImportRulesContainer>(json);
                    
                    foreach (var rule in rules.Rules)
                    {
                        assetImportRules[rule.Pattern] = rule.Settings;
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[AssetPostprocessorAutomation] Failed to load import rules: {ex.Message}");
                }
            }
        }

        private void ValidateTextureSettings(TextureImporter importer, Texture2D texture)
        {
            // Validate that texture settings are optimal
            if (texture.width > 4096 || texture.height > 4096)
            {
                Debug.LogWarning($"[AssetValidation] Large texture detected: {importer.assetPath} ({texture.width}x{texture.height}). Consider reducing size.");
            }

            if (importer.textureType == TextureImporterType.Sprite && importer.mipmapEnabled)
            {
                Debug.LogWarning($"[AssetValidation] Sprite has mipmaps enabled: {importer.assetPath}. Sprites typically don't need mipmaps.");
            }
        }

        #endregion
    }

    #region Supporting Data Structures

    [Serializable]
    public class AssetImportRulesContainer
    {
        public AssetImportRule[] Rules;
    }

    [Serializable]
    public class AssetImportRule
    {
        public string Pattern;
        public AssetImportSettings Settings;
    }

    [Serializable]
    public class AssetImportSettings
    {
        public TextureImporterType TextureType;
        public bool MipmapEnabled;
        public TextureWrapMode WrapMode;
        public FilterMode FilterMode;
        public int MaxTextureSize;
        public TextureImporterFormat Format;
        public int CompressionQuality;
    }

    #endregion
}
```

### 3. Build Pipeline Integration and Automation

#### 3.1 Advanced Build Automation System

[[LLM: Design a comprehensive build automation system that integrates with Unity's build pipeline to provide automated build validation, version management, build report generation, and post-build processing. Create systems that can handle multiple build targets, automated testing integration, and deployment preparation.]]

**Build Automation System**:

```csharp
// Assets/Editor/Automation/BuildAutomationSystem.cs
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;

namespace {{project_namespace}}.Editor.Automation
{
    /// <summary>
    /// Comprehensive build automation system for Unity projects
    /// Handles build validation, version management, and automated build processes
    /// </summary>
    public class BuildAutomationSystem : IPreprocessBuildWithReport, IPostprocessBuildWithReport
    {
        private static EditorAutomationConfig config;
        private static BuildAutomationConfig buildConfig;
        private static Dictionary<BuildTarget, BuildConfiguration> buildConfigurations;

        public int callbackOrder => 0;

        public static void Initialize(EditorAutomationConfig automationConfig)
        {
            config = automationConfig;
            LoadBuildConfiguration();
            LoadBuildConfigurations();
            
            Debug.Log("[BuildAutomationSystem] Initialized with configuration");
        }

        #region Build Configuration Management

        private static void LoadBuildConfiguration()
        {
            var configPath = "Assets/Editor/Automation/BuildAutomationConfig.asset";
            buildConfig = AssetDatabase.LoadAssetAtPath<BuildAutomationConfig>(configPath);
            
            if (buildConfig == null)
            {
                buildConfig = ScriptableObject.CreateInstance<BuildAutomationConfig>();
                
                if (!Directory.Exists(Path.GetDirectoryName(configPath)))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(configPath));
                }
                
                AssetDatabase.CreateAsset(buildConfig, configPath);
                AssetDatabase.SaveAssets();
            }
        }

        private static void LoadBuildConfigurations()
        {
            buildConfigurations = new Dictionary<BuildTarget, BuildConfiguration>();

            // Default configurations for common platforms
            buildConfigurations[BuildTarget.StandaloneWindows64] = new BuildConfiguration
            {
                Target = BuildTarget.StandaloneWindows64,
                Name = "Windows 64-bit",
                OutputPath = "Builds/Windows/",
                EnableDevelopmentBuild = false,
                EnableScriptDebugging = false,
                EnableProfiling = false,
                CompressionType = Compression.Lz4HC,
                StripEngineCode = true
            };

            buildConfigurations[BuildTarget.Android] = new BuildConfiguration
            {
                Target = BuildTarget.Android,
                Name = "Android",
                OutputPath = "Builds/Android/",
                EnableDevelopmentBuild = false,
                EnableScriptDebugging = false,
                EnableProfiling = false,
                CompressionType = Compression.Lz4HC,
                StripEngineCode = true
            };

            buildConfigurations[BuildTarget.iOS] = new BuildConfiguration
            {
                Target = BuildTarget.iOS,
                Name = "iOS",
                OutputPath = "Builds/iOS/",
                EnableDevelopmentBuild = false,
                EnableScriptDebugging = false,
                EnableProfiling = false,
                CompressionType = Compression.Lz4HC,
                StripEngineCode = true
            };
        }

        #endregion

        #region Pre-Build Processing

        public void OnPreprocessBuild(BuildReport report)
        {
            try
            {
                Debug.Log("[BuildAutomationSystem] Starting pre-build automation...");

                var buildTarget = report.summary.platform;
                var buildConfig = GetBuildConfiguration(buildTarget);

                // Validate project before build
                if (config.autoValidateBeforeBuild)
                {
                    ValidateProjectForBuild(buildTarget);
                }

                // Increment build number
                if (config.autoIncrementBuildNumber)
                {
                    IncrementBuildNumber();
                }

                // Setup build-specific settings
                SetupBuildSettings(buildConfig);

                // Generate build timestamp
                GenerateBuildTimestamp();

                // Validate assets
                ValidateBuildAssets();

                Debug.Log("[BuildAutomationSystem] Pre-build automation completed successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BuildAutomationSystem] Pre-build automation failed: {ex.Message}");
                throw new BuildFailedException($"Pre-build automation failed: {ex.Message}");
            }
        }

        private void ValidateProjectForBuild(BuildTarget target)
        {
            var validationErrors = new List<string>();

            // Check scenes in build
            var scenes = EditorBuildSettings.scenes;
            if (scenes.Length == 0)
            {
                validationErrors.Add("No scenes added to build settings");
            }

            foreach (var scene in scenes)
            {
                if (scene.enabled && !File.Exists(scene.path))
                {
                    validationErrors.Add($"Build scene not found: {scene.path}");
                }
            }

            // Check player settings
            if (string.IsNullOrEmpty(PlayerSettings.companyName))
            {
                validationErrors.Add("Company name not set in Player Settings");
            }

            if (string.IsNullOrEmpty(PlayerSettings.productName))
            {
                validationErrors.Add("Product name not set in Player Settings");
            }

            // Platform-specific validation
            switch (target)
            {
                case BuildTarget.Android:
                    ValidateAndroidBuildSettings(validationErrors);
                    break;
                case BuildTarget.iOS:
                    ValidateIOSBuildSettings(validationErrors);
                    break;
                case BuildTarget.StandaloneWindows64:
                    ValidateStandaloneBuildSettings(validationErrors);
                    break;
            }

            if (validationErrors.Count > 0)
            {
                var errorMessage = "Build validation failed:\n" + string.Join("\n", validationErrors);
                throw new BuildFailedException(errorMessage);
            }
        }

        private void ValidateAndroidBuildSettings(List<string> errors)
        {
            if (string.IsNullOrEmpty(PlayerSettings.Android.bundleVersionCode.ToString()))
            {
                errors.Add("Android bundle version code not set");
            }

            if (string.IsNullOrEmpty(PlayerSettings.applicationIdentifier))
            {
                errors.Add("Android package name not set");
            }

            if (PlayerSettings.Android.minSdkVersion < AndroidSdkVersions.AndroidApiLevel21)
            {
                errors.Add("Android minimum SDK version should be at least API level 21");
            }
        }

        private void ValidateIOSBuildSettings(List<string> errors)
        {
            if (string.IsNullOrEmpty(PlayerSettings.iOS.buildNumber))
            {
                errors.Add("iOS build number not set");
            }

            if (string.IsNullOrEmpty(PlayerSettings.applicationIdentifier))
            {
                errors.Add("iOS bundle identifier not set");
            }
        }

        private void ValidateStandaloneBuildSettings(List<string> errors)
        {
            // Standalone-specific validations
            if (PlayerSettings.defaultIsNativeResolution && PlayerSettings.fullScreenMode == FullScreenMode.Windowed)
            {
                errors.Add("Native resolution should be disabled for windowed mode");
            }
        }

        private void IncrementBuildNumber()
        {
            try
            {
                switch (EditorUserBuildSettings.activeBuildTarget)
                {
                    case BuildTarget.Android:
                        PlayerSettings.Android.bundleVersionCode++;
                        break;
                    case BuildTarget.iOS:
                        var buildNumber = int.Parse(PlayerSettings.iOS.buildNumber) + 1;
                        PlayerSettings.iOS.buildNumber = buildNumber.ToString();
                        break;
                    default:
                        // For other platforms, increment a custom build number
                        var currentVersion = PlayerSettings.bundleVersion;
                        IncrementVersionString(currentVersion);
                        break;
                }

                Debug.Log($"[BuildAutomationSystem] Build number incremented for {EditorUserBuildSettings.activeBuildTarget}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BuildAutomationSystem] Failed to increment build number: {ex.Message}");
            }
        }

        private void IncrementVersionString(string version)
        {
            var parts = version.Split('.');
            if (parts.Length >= 3 && int.TryParse(parts[2], out int buildNumber))
            {
                parts[2] = (buildNumber + 1).ToString();
                PlayerSettings.bundleVersion = string.Join(".", parts);
            }
        }

        private void SetupBuildSettings(BuildConfiguration buildConfig)
        {
            if (buildConfig == null)
                return;

            EditorUserBuildSettings.development = buildConfig.EnableDevelopmentBuild;
            EditorUserBuildSettings.allowDebugging = buildConfig.EnableScriptDebugging;
            EditorUserBuildSettings.connectProfiler = buildConfig.EnableProfiling;
            EditorUserBuildSettings.buildWithDeepProfilingSupport = buildConfig.EnableProfiling;

            // Set compression
            EditorUserBuildSettings.compression = buildConfig.CompressionType;

            // Platform-specific settings
            switch (buildConfig.Target)
            {
                case BuildTarget.Android:
                    SetupAndroidBuildSettings(buildConfig);
                    break;
                case BuildTarget.iOS:
                    SetupIOSBuildSettings(buildConfig);
                    break;
            }
        }

        private void SetupAndroidBuildSettings(BuildConfiguration buildConfig)
        {
            PlayerSettings.Android.useAPKExpansionFiles = buildConfig.StripEngineCode;
            EditorUserBuildSettings.androidBuildSystem = AndroidBuildSystem.Gradle;
            EditorUserBuildSettings.exportAsGoogleAndroidProject = false;
        }

        private void SetupIOSBuildSettings(BuildConfiguration buildConfig)
        {
            EditorUserBuildSettings.iOSBuildConfigType = buildConfig.EnableDevelopmentBuild ? 
                iOSBuildType.Debug : iOSBuildType.Release;
        }

        private void GenerateBuildTimestamp()
        {
            var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            var timestampPath = "Assets/Resources/BuildTimestamp.txt";
            
            if (!Directory.Exists("Assets/Resources"))
            {
                Directory.CreateDirectory("Assets/Resources");
            }
            
            File.WriteAllText(timestampPath, timestamp);
            AssetDatabase.Refresh();
        }

        private void ValidateBuildAssets()
        {
            // Check for missing asset references
            var allAssets = AssetDatabase.GetAllAssetPaths()
                .Where(path => !path.StartsWith("Packages/") && !path.StartsWith("ProjectSettings/"))
                .ToArray();

            foreach (var assetPath in allAssets)
            {
                if (AssetDatabase.LoadMainAssetAtPath(assetPath) == null && File.Exists(assetPath))
                {
                    Debug.LogWarning($"[BuildValidation] Asset may be corrupted: {assetPath}");
                }
            }
        }

        #endregion

        #region Post-Build Processing

        public void OnPostprocessBuild(BuildReport report)
        {
            try
            {
                Debug.Log("[BuildAutomationSystem] Starting post-build automation...");

                var buildTarget = report.summary.platform;
                var buildConfig = GetBuildConfiguration(buildTarget);

                // Generate build report
                if (config.autoGenerateBuildReport)
                {
                    GenerateBuildReport(report);
                }

                // Cleanup temporary files
                if (config.autoCleanupAfterBuild)
                {
                    CleanupAfterBuild(report);
                }

                // Archive build if successful
                if (report.summary.result == BuildResult.Succeeded)
                {
                    ArchiveBuild(report);
                }

                // Send notifications
                SendBuildNotification(report);

                Debug.Log("[BuildAutomationSystem] Post-build automation completed successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BuildAutomationSystem] Post-build automation failed: {ex.Message}");
            }
        }

        private void GenerateBuildReport(BuildReport report)
        {
            try
            {
                var reportData = new BuildReportData
                {
                    BuildTarget = report.summary.platform.ToString(),
                    BuildResult = report.summary.result.ToString(),
                    BuildTime = report.summary.buildEndedAt - report.summary.buildStartedAt,
                    TotalSize = report.summary.totalSize,
                    TotalTime = report.summary.totalTime,
                    OutputPath = report.summary.outputPath,
                    PlayerSettings = GetPlayerSettingsSnapshot(),
                    BuildSteps = GetBuildSteps(report),
                    AssetInfo = GetAssetInfo(report)
                };

                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var reportPath = Path.Combine(config.outputDirectory, $"BuildReport_{timestamp}.json");
                
                if (!Directory.Exists(config.outputDirectory))
                {
                    Directory.CreateDirectory(config.outputDirectory);
                }

                var json = JsonUtility.ToJson(reportData, true);
                File.WriteAllText(reportPath, json);

                Debug.Log($"[BuildAutomationSystem] Build report generated: {reportPath}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BuildAutomationSystem] Failed to generate build report: {ex.Message}");
            }
        }

        private void CleanupAfterBuild(BuildReport report)
        {
            try
            {
                // Remove temporary build files
                var tempPath = "Temp/StagingArea";
                if (Directory.Exists(tempPath))
                {
                    Directory.Delete(tempPath, true);
                }

                // Clean up generated timestamp file
                var timestampPath = "Assets/Resources/BuildTimestamp.txt";
                if (File.Exists(timestampPath))
                {
                    AssetDatabase.DeleteAsset(timestampPath);
                }

                // Force garbage collection
                GC.Collect();
                EditorUtility.UnloadUnusedAssetsImmediate();

                Debug.Log("[BuildAutomationSystem] Post-build cleanup completed");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BuildAutomationSystem] Post-build cleanup failed: {ex.Message}");
            }
        }

        private void ArchiveBuild(BuildReport report)
        {
            try
            {
                var buildPath = report.summary.outputPath;
                if (!File.Exists(buildPath) && !Directory.Exists(buildPath))
                    return;

                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var archivePath = Path.Combine("BuildArchive", $"{report.summary.platform}_{timestamp}");
                
                if (!Directory.Exists("BuildArchive"))
                {
                    Directory.CreateDirectory("BuildArchive");
                }

                if (Directory.Exists(buildPath))
                {
                    DirectoryInfo source = new DirectoryInfo(buildPath);
                    DirectoryInfo target = new DirectoryInfo(archivePath);
                    CopyDirectory(source, target);
                }
                else if (File.Exists(buildPath))
                {
                    var fileName = Path.GetFileName(buildPath);
                    var archiveFilePath = Path.Combine(archivePath, fileName);
                    Directory.CreateDirectory(archivePath);
                    File.Copy(buildPath, archiveFilePath);
                }

                Debug.Log($"[BuildAutomationSystem] Build archived to: {archivePath}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BuildAutomationSystem] Build archival failed: {ex.Message}");
            }
        }

        private void SendBuildNotification(BuildReport report)
        {
            var result = report.summary.result;
            var platform = report.summary.platform;
            var duration = report.summary.totalTime;

            var message = $"Build {result} for {platform} in {duration:mm\\:ss}";
            
            if (result == BuildResult.Succeeded)
            {
                Debug.Log($"[BuildAutomationSystem] ✅ {message}");
            }
            else
            {
                Debug.LogError($"[BuildAutomationSystem] ❌ {message}");
            }

            // Could extend this to send email notifications, Slack messages, etc.
        }

        #endregion

        #region Utility Methods

        private BuildConfiguration GetBuildConfiguration(BuildTarget target)
        {
            buildConfigurations.TryGetValue(target, out BuildConfiguration config);
            return config;
        }

        private PlayerSettingsSnapshot GetPlayerSettingsSnapshot()
        {
            return new PlayerSettingsSnapshot
            {
                CompanyName = PlayerSettings.companyName,
                ProductName = PlayerSettings.productName,
                BundleVersion = PlayerSettings.bundleVersion,
                ApplicationIdentifier = PlayerSettings.applicationIdentifier,
                DefaultIsNativeResolution = PlayerSettings.defaultIsNativeResolution,
                FullScreenMode = PlayerSettings.fullScreenMode.ToString()
            };
        }

        private BuildStepInfo[] GetBuildSteps(BuildReport report)
        {
            return report.steps.Select(step => new BuildStepInfo
            {
                Name = step.name,
                Duration = step.duration,
                Messages = step.messages.Select(msg => new BuildMessageInfo
                {
                    Content = msg.content,
                    Type = msg.type.ToString()
                }).ToArray()
            }).ToArray();
        }

        private AssetInfo[] GetAssetInfo(BuildReport report)
        {
            var buildAssets = report.GetFiles();
            return buildAssets.Select(asset => new AssetInfo
            {
                Path = asset.path,
                Size = asset.size,
                Role = asset.role.ToString()
            }).ToArray();
        }

        private void CopyDirectory(DirectoryInfo source, DirectoryInfo target)
        {
            if (!target.Exists)
            {
                target.Create();
            }

            foreach (FileInfo file in source.GetFiles())
            {
                file.CopyTo(Path.Combine(target.FullName, file.Name), true);
            }

            foreach (DirectoryInfo directory in source.GetDirectories())
            {
                DirectoryInfo nextTargetSubDir = target.CreateSubdirectory(directory.Name);
                CopyDirectory(directory, nextTargetSubDir);
            }
        }

        #endregion

        #region Menu Items

        [MenuItem("{{project_namespace}}/Build Automation/Build All Platforms")]
        public static void BuildAllPlatforms()
        {
            foreach (var config in buildConfigurations.Values)
            {
                BuildPlayerOptions buildOptions = new BuildPlayerOptions
                {
                    scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray(),
                    locationPathName = config.OutputPath + GetBuildFileName(config.Target),
                    target = config.Target,
                    options = GetBuildOptions(config)
                };

                var report = BuildPipeline.BuildPlayer(buildOptions);
                Debug.Log($"Build {config.Name}: {report.summary.result}");
            }
        }

        [MenuItem("{{project_namespace}}/Build Automation/Clean All Builds")]
        public static void CleanAllBuilds()
        {
            foreach (var config in buildConfigurations.Values)
            {
                var buildPath = config.OutputPath;
                if (Directory.Exists(buildPath))
                {
                    Directory.Delete(buildPath, true);
                    Debug.Log($"Cleaned builds for {config.Name}");
                }
            }
        }

        private static string GetBuildFileName(BuildTarget target)
        {
            switch (target)
            {
                case BuildTarget.StandaloneWindows64:
                    return PlayerSettings.productName + ".exe";
                case BuildTarget.Android:
                    return PlayerSettings.productName + ".apk";
                case BuildTarget.iOS:
                    return PlayerSettings.productName;
                default:
                    return PlayerSettings.productName;
            }
        }

        private static BuildOptions GetBuildOptions(BuildConfiguration config)
        {
            BuildOptions options = BuildOptions.None;
            
            if (config.EnableDevelopmentBuild)
                options |= BuildOptions.Development;
                
            if (config.EnableScriptDebugging)
                options |= BuildOptions.AllowDebugging;
                
            if (config.EnableProfiling)
                options |= BuildOptions.ConnectWithProfiler;

            return options;
        }

        #endregion
    }

    #region Supporting Data Structures

    [CreateAssetMenu(fileName = "BuildAutomationConfig", menuName = "{{project_namespace}}/Build Automation Config")]
    public class BuildAutomationConfig : ScriptableObject
    {
        [Header("Build Settings")]
        public bool autoIncrementVersion = true;
        public bool validateAssetsBeforeBuild = true;
        public bool generateBuildReports = true;
        public bool archiveSuccessfulBuilds = true;

        [Header("Output Settings")]
        public string buildOutputPath = "Builds/";
        public string archivePath = "BuildArchive/";
        public string reportOutputPath = "BuildReports/";

        [Header("Cleanup Settings")]
        public bool cleanupTempFiles = true;
        public bool cleanupOldBuilds = false;
        public int maxArchivedBuilds = 10;
    }

    [Serializable]
    public class BuildConfiguration
    {
        public BuildTarget Target;
        public string Name;
        public string OutputPath;
        public bool EnableDevelopmentBuild;
        public bool EnableScriptDebugging;
        public bool EnableProfiling;
        public Compression CompressionType;
        public bool StripEngineCode;
    }

    [Serializable]
    public class BuildReportData
    {
        public string BuildTarget;
        public string BuildResult;
        public TimeSpan BuildTime;
        public ulong TotalSize;
        public TimeSpan TotalTime;
        public string OutputPath;
        public PlayerSettingsSnapshot PlayerSettings;
        public BuildStepInfo[] BuildSteps;
        public AssetInfo[] AssetInfo;
    }

    [Serializable]
    public class PlayerSettingsSnapshot
    {
        public string CompanyName;
        public string ProductName;
        public string BundleVersion;
        public string ApplicationIdentifier;
        public bool DefaultIsNativeResolution;
        public string FullScreenMode;
    }

    [Serializable]
    public class BuildStepInfo
    {
        public string Name;
        public TimeSpan Duration;
        public BuildMessageInfo[] Messages;
    }

    [Serializable]
    public class BuildMessageInfo
    {
        public string Content;
        public string Type;
    }

    [Serializable]
    public class AssetInfo
    {
        public string Path;
        public ulong Size;
        public string Role;
    }

    #endregion
}
```

## Success Criteria

- [[LLM: Validate that all implemented Editor automation systems integrate seamlessly with Unity's Editor architecture and provide significant productivity improvements for development workflows]]

### Editor Automation Framework Validation ✅

- **Framework Architecture**: Complete Editor automation foundation with extensible task system
- **Asset Processing**: Comprehensive automated asset import optimization for textures, audio, and models
- **Build Automation**: Advanced build pipeline integration with validation, versioning, and reporting
- **Custom Tools**: Extensible framework allowing easy addition of project-specific automation tasks
- **Configuration Management**: Persistent configuration system with import/export capabilities

### Production Readiness Assessment ✅

- **Unity Editor Integration**: 100% Unity Editor API compliance with proper lifecycle management
- **Error Handling**: Comprehensive exception handling with user-friendly error reporting
- **Performance Impact**: Minimal Editor performance overhead with efficient processing patterns
- **Team Adoption**: Clear patterns for team configuration sharing and custom tool development

### Workflow Integration Excellence ✅

- **Development Workflows**: Seamless integration with existing Unity development patterns
- **Build Pipeline**: Complete integration with Unity's build system and CI/CD workflows
- **Asset Management**: Automated asset processing that maintains quality while optimizing performance
- **Project Validation**: Comprehensive validation systems ensuring project integrity and standards compliance

## Integration Points

- **Unity Build Pipeline**: Deep integration with pre/post-build processing hooks
- **Asset Database**: Comprehensive asset processing automation with validation systems
- **Editor GUI**: Professional Editor windows with intuitive configuration interfaces
- **Version Control**: Git-friendly configuration management with team sharing capabilities

## Usage Instructions

1. **Framework Setup**: Open the Editor Automation Framework window from the menu system
2. **Configuration**: Configure automation settings for asset processing, build automation, and validation
3. **Custom Tasks**: Implement IEditorAutomationTask interface for project-specific automation needs
4. **Build Integration**: Automation runs automatically during build processes with configurable options
5. **Team Sharing**: Export/import configuration files for consistent team automation settings

This Unity Editor integration framework provides comprehensive automation patterns that significantly enhance development productivity through intelligent asset processing, build automation, and workflow optimization while maintaining the flexibility to adapt to project-specific requirements.