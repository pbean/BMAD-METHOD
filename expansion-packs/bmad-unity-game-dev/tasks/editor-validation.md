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

[[LLM: IF existing validation system detected THEN integrate and enhance current quality checks, ELSE design comprehensive validation framework from scratch. Dynamically assess project type (indie/enterprise), team size (solo/large team), and current quality issues to determine optimal validation strategy. Include adaptive validation rules based on project complexity and development workflows.

EXISTING SYSTEM INTEGRATION:
IF existing validation system detected:
  - Analyze current validation coverage and identify gaps
  - Integrate with existing quality tools and CI/CD pipelines
  - Enhance current validation rules with advanced pattern detection
  - Preserve existing workflow while adding sophisticated quality gates
ELSE:
  - Design comprehensive validation framework from foundation
  - Establish core validation patterns and rule engine
  - Create extensible architecture for custom validation rules
  - Build editor integration with real-time validation feedback

PROJECT TYPE OPTIMIZATION:
IF indie/small project:
  - Focus on essential validation rules (asset references, naming)
  - Optimize for fast feedback and minimal setup overhead
  - Implement automated fixes for common issues
  - Provide simple configuration with smart defaults
ELSE IF enterprise/large team project:
  - Implement comprehensive validation coverage (code, assets, config)
  - Add team-wide validation standards and compliance checking
  - Include advanced reporting and analytics for quality metrics
  - Support custom validation rules and team-specific requirements

TEAM SIZE ADAPTATION:
IF solo developer:
  - Prioritize automated validation with minimal manual intervention
  - Focus on catching common mistakes and asset issues
  - Provide quick fixes and optimization suggestions
  - Streamline validation UI for single-user workflow
ELSE IF small team (2-5 developers):
  - Add collaborative validation features and shared standards
  - Implement validation rule sharing and consistency checking
  - Include team notification systems for critical validation failures
  - Support role-based validation configurations
ELSE IF large team (6+ developers):
  - Design enterprise-scale validation with centralized management
  - Implement validation metrics and team performance tracking
  - Add automated validation orchestration and CI integration
  - Support complex validation workflows and approval processes

CURRENT QUALITY ASSESSMENT:
IF high technical debt detected:
  - Prioritize validation rules for code refactoring and cleanup
  - Implement progressive validation to gradually improve quality
  - Add debt tracking and improvement measurement tools
  - Focus on preventing additional quality degradation
ELSE IF greenfield project:
  - Establish comprehensive validation from project start
  - Implement strict quality gates to prevent technical debt
  - Add proactive validation patterns for emerging issues
  - Focus on maintaining high quality standards throughout development

UNITY VERSION COMPATIBILITY:
IF Unity 2022.3+ LTS:
  - Use latest Editor APIs and validation capabilities
  - Leverage improved asset pipeline and validation hooks
  - Implement modern validation patterns and performance optimizations
ELSE IF Unity 2021.3 LTS:
  - Use compatible validation approaches with legacy API support
  - Implement fallback validation strategies for missing features
ELSE:
  - Provide upgrade recommendations for improved validation capabilities
  - Use legacy-compatible validation patterns with limited functionality

ERROR HANDLING AND ADAPTATION:
IF insufficient editor scripting setup:
  - Provide automated editor environment configuration
  - Guide through manual setup with validation checkpoints
IF incompatible project structure:
  - Suggest project organization improvements
  - Provide migration tools for better validation integration
IF performance constraints detected:
  - Optimize validation execution for large projects
  - Implement incremental and background validation strategies]]

**Core Editor Validation Framework**:

```csharp
// Assets/Scripts/Editor/Validation/EditorValidationFramework.cs
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
        private AdaptiveValidationEngine adaptiveEngine;
        
        private Vector2 scrollPosition;
        private int selectedTabIndex = 0;
        private bool isValidating = false;
        private float lastValidationTime = 0f;
        private ValidationSummary currentSummary;
        
        private ProjectQualityAnalyzer qualityAnalyzer;
        private ValidationMetricsCollector metricsCollector;
        private TeamValidationCoordinator teamCoordinator;
        
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
            InitializeAdaptiveEngine();
            InitializeValidators();
            InitializeValidationRunner();
            InitializeMonitors();
            InitializeQualityAnalysis();
            
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
        
        private void InitializeAdaptiveEngine()
        {
            adaptiveEngine = new AdaptiveValidationEngine();
            
            // Analyze project characteristics
            var projectAnalysis = adaptiveEngine.AnalyzeProject();
            
            // Adapt validation strategy based on project characteristics
            AdaptValidationStrategy(projectAnalysis);
        }
        
        private void AdaptValidationStrategy(ProjectAnalysis analysis)
        {
            // Adapt based on project type
            switch (analysis.ProjectType)
            {
                case ProjectType.Indie:
                    configuration.ValidationDepth = ValidationDepth.Essential;
                    configuration.EnableAutomaticFixes = true;
                    configuration.RealtimeValidationInterval = 3.0f;
                    break;
                    
                case ProjectType.Enterprise:
                    configuration.ValidationDepth = ValidationDepth.Comprehensive;
                    configuration.EnableMetricsCollection = true;
                    configuration.EnableTeamReporting = true;
                    configuration.RealtimeValidationInterval = 1.0f;
                    break;
                    
                case ProjectType.Educational:
                    configuration.ValidationDepth = ValidationDepth.Moderate;
                    configuration.EnableLearningMode = true;
                    configuration.ProvideDetailedExplanations = true;
                    break;
            }
            
            // Adapt based on team size
            switch (analysis.TeamSize)
            {
                case TeamSize.Solo:
                    configuration.EnableCollaborativeValidation = false;
                    configuration.FocusOnAutomation = true;
                    break;
                    
                case TeamSize.Small:
                    configuration.EnableCollaborativeValidation = true;
                    configuration.EnableSharedStandards = true;
                    break;
                    
                case TeamSize.Large:
                    configuration.EnableEnterpriseFeatures = true;
                    configuration.EnableCentralizedManagement = true;
                    configuration.EnableAdvancedReporting = true;
                    break;
            }
            
            // Adapt based on current quality level
            if (analysis.TechnicalDebtLevel > 0.7f)
            {
                configuration.EnableProgressiveValidation = true;
                configuration.PrioritizeDebtReduction = true;
                configuration.FocusOnCriticalIssues = true;
            }
            
            // Apply Unity version specific optimizations
            AdaptForUnityVersion(analysis.UnityVersion);
        }
        
        private void AdaptForUnityVersion(string unityVersion)
        {
            var version = new System.Version(unityVersion);
            
            if (version >= new System.Version("2022.3"))
            {
                configuration.UseModernValidationAPIs = true;
                configuration.EnablePerformanceOptimizations = true;
                configuration.EnableAdvancedAssetPipeline = true;
            }
            else if (version >= new System.Version("2021.3"))
            {
                configuration.UseCompatibleValidationAPIs = true;
                configuration.EnableBasicOptimizations = true;
            }
            else
            {
                configuration.UseLegacyValidationMode = true;
                Debug.LogWarning("Unity version is older than recommended. Consider upgrading for better validation features.");
            }
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
            
            // Adaptive validators based on project analysis
            AddAdaptiveValidators();
            
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
        
        private void AddAdaptiveValidators()
        {
            var projectAnalysis = adaptiveEngine.GetCurrentAnalysis();
            
            // Add validators based on detected project characteristics
            if (projectAnalysis.HasUIElements)
            {
                validators.Add(new UIValidationValidator());
                validators.Add(new CanvasSettingsValidator());
            }
            
            if (projectAnalysis.Has2DAssets)
            {
                validators.Add(new SpriteAtlasValidator());
                validators.Add(new TilemapValidator());
            }
            
            if (projectAnalysis.Has3DAssets)
            {
                validators.Add(new MeshValidator());
                validators.Add(new MaterialValidator());
                validators.Add(new LightingValidator());
            }
            
            if (projectAnalysis.HasAnimations)
            {
                validators.Add(new AnimationClipValidator());
                validators.Add(new AnimatorControllerValidator());
            }
            
            if (projectAnalysis.HasScriptableObjects)
            {
                validators.Add(new ScriptableObjectValidator());
            }
            
            if (projectAnalysis.UsesAddressables)
            {
                validators.Add(new AddressableAssetsValidator());
            }
            
            if (projectAnalysis.HasCustomPackages)
            {
                validators.Add(new PackageIntegrityValidator());
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
            
            // Configure runner based on project characteristics
            var projectAnalysis = adaptiveEngine.GetCurrentAnalysis();
            validationRunner.ConfigureForProject(projectAnalysis);
        }
        
        private void InitializeMonitors()
        {
            if (enableAssetValidation)
            {
                assetMonitor = new AssetValidationMonitor();
                assetMonitor.OnAssetChanged += OnAssetChanged;
                assetMonitor.ConfigureForProject(adaptiveEngine.GetCurrentAnalysis());
            }
            
            if (enableCodeValidation)
            {
                codeAnalyzer = new CodeValidationAnalyzer();
                codeAnalyzer.OnCodeAnalysisComplete += OnCodeAnalysisComplete;
                codeAnalyzer.ConfigureForProject(adaptiveEngine.GetCurrentAnalysis());
            }
            
            if (enableSceneValidation)
            {
                sceneInspector = new SceneValidationInspector();
                sceneInspector.OnSceneValidated += OnSceneValidated;
                sceneInspector.ConfigureForProject(adaptiveEngine.GetCurrentAnalysis());
            }
            
            settingsValidator = new ProjectSettingsValidator();
            settingsValidator.ConfigureForProject(adaptiveEngine.GetCurrentAnalysis());
        }
        
        private void InitializeQualityAnalysis()
        {
            qualityAnalyzer = new ProjectQualityAnalyzer();
            qualityAnalyzer.OnQualityMetricsUpdated += OnQualityMetricsUpdated;
            
            if (configuration.EnableMetricsCollection)
            {
                metricsCollector = new ValidationMetricsCollector();
                metricsCollector.StartCollection();
            }
            
            if (configuration.EnableTeamReporting)
            {
                teamCoordinator = new TeamValidationCoordinator();
                teamCoordinator.Initialize(configuration.TeamSettings);
            }
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
            
            if (GUILayout.Button("Auto-Fix", EditorStyles.toolbarButton, GUILayout.Width(60)))
            {
                ApplyAutomaticFixes();
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
                var qualityScore = qualityAnalyzer?.GetCurrentQualityScore() ?? 0f;
                summaryText += $" | Quality: {qualityScore:P0}";
                
                GUILayout.Label(summaryText, EditorStyles.toolbarLabel);
            }
            
            if (GUILayout.Button("Settings", EditorStyles.toolbarButton, GUILayout.Width(60)))
            {
                ValidationSettingsWindow.ShowWindow(configuration);
            }
            
            EditorGUILayout.EndHorizontal();
        }
        
        private void DrawTabNavigation()
        {
            string[] tabNames = { "All Issues", "Assets", "Code", "Scenes", "Settings", "Categories", "Metrics", "Team" };
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
                case 6: DrawMetricsView(); break;
                case 7: DrawTeamView(); break;
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
            
            if (result.HasExplanation && GUILayout.Button("?", GUILayout.Width(20)))
            {
                ShowExplanation(result);
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
                
                var categoryResults = validationResults.Count(r => r.Category == category.Name);
                EditorGUILayout.LabelField($"{categoryResults} issues", GUILayout.Width(80));
                
                if (GUILayout.Button("Configure", GUILayout.Width(80)))
                {
                    ConfigureCategory(category);
                }
                
                EditorGUILayout.EndHorizontal();
            }
        }
        
        private void DrawMetricsView()
        {
            if (metricsCollector == null)
            {
                EditorGUILayout.HelpBox("Metrics collection is disabled. Enable in settings to view quality metrics.", MessageType.Info);
                return;
            }
            
            EditorGUILayout.LabelField("Quality Metrics", EditorStyles.boldLabel);
            EditorGUILayout.Space();
            
            var metrics = metricsCollector.GetCurrentMetrics();
            
            EditorGUILayout.LabelField($"Overall Quality Score: {metrics.OverallQualityScore:P0}");
            EditorGUILayout.LabelField($"Code Quality: {metrics.CodeQuality:P0}");
            EditorGUILayout.LabelField($"Asset Quality: {metrics.AssetQuality:P0}");
            EditorGUILayout.LabelField($"Project Structure: {metrics.ProjectStructure:P0}");
            
            EditorGUILayout.Space();
            
            EditorGUILayout.LabelField("Quality Trends", EditorStyles.boldLabel);
            DrawQualityChart(metrics.QualityHistory);
            
            EditorGUILayout.Space();
            
            EditorGUILayout.LabelField("Recommendations", EditorStyles.boldLabel);
            foreach (var recommendation in metrics.QualityRecommendations)
            {
                EditorGUILayout.HelpBox(recommendation, MessageType.Info);
            }
        }
        
        private void DrawTeamView()
        {
            if (teamCoordinator == null)
            {
                EditorGUILayout.HelpBox("Team features are disabled. Enable in settings for collaborative validation.", MessageType.Info);
                return;
            }
            
            EditorGUILayout.LabelField("Team Validation", EditorStyles.boldLabel);
            EditorGUILayout.Space();
            
            var teamStatus = teamCoordinator.GetTeamStatus();
            
            EditorGUILayout.LabelField($"Team Members: {teamStatus.ActiveMembers}");
            EditorGUILayout.LabelField($"Shared Standards: {teamStatus.SharedStandards}");
            EditorGUILayout.LabelField($"Validation Sync: {(teamStatus.InSync ? "✓" : "✗")}");
            
            EditorGUILayout.Space();
            
            if (GUILayout.Button("Sync Team Standards"))
            {
                teamCoordinator.SyncTeamStandards();
            }
            
            if (GUILayout.Button("Generate Team Report"))
            {
                teamCoordinator.GenerateTeamReport();
            }
        }
        
        private void DrawQualityChart(List<QualityMetricPoint> history)
        {
            if (history == null || history.Count < 2) return;
            
            var rect = GUILayoutUtility.GetRect(100, 100);
            
            // Simple quality trend visualization
            // In a real implementation, this would be a proper chart
            GUI.Box(rect, "Quality Trend Chart (placeholder)");
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
            
            var projectType = adaptiveEngine.GetCurrentAnalysis().ProjectType;
            EditorGUILayout.LabelField($"Project: {projectType}", EditorStyles.toolbarLabel);
            
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
        
        private void ApplyAutomaticFixes()
        {
            if (!configuration.EnableAutomaticFixes)
            {
                EditorUtility.DisplayDialog("Auto-Fix Disabled", "Automatic fixes are disabled in settings.", "OK");
                return;
            }
            
            var fixableResults = validationResults.Where(r => r.HasFix).ToList();
            
            if (fixableResults.Count == 0)
            {
                EditorUtility.DisplayDialog("No Fixes Available", "No automatic fixes are available for current issues.", "OK");
                return;
            }
            
            var applyCount = 0;
            foreach (var result in fixableResults)
            {
                try
                {
                    if (result.FixAction != null)
                    {
                        result.FixAction.Invoke();
                        applyCount++;
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogError($"Failed to apply automatic fix: {ex.Message}");
                }
            }
            
            if (applyCount > 0)
            {
                ShowNotification(new GUIContent($"Applied {applyCount} automatic fixes"));
                RunFullValidation(); // Re-validate after fixes
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
            
            // Update quality metrics
            if (metricsCollector != null)
            {
                metricsCollector.RecordValidationResults(results);
            }
            
            // Update team status
            if (teamCoordinator != null)
            {
                teamCoordinator.ReportValidationResults(results);
            }
            
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
        
        private void OnQualityMetricsUpdated(QualityMetrics metrics)
        {
            // Handle quality metrics updates
            if (selectedTabIndex == 6) // Metrics tab
            {
                Repaint();
            }
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
        
        private void ShowExplanation(ValidationResult result)
        {
            ValidationExplanationWindow.ShowWindow(result);
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
            metricsCollector?.Dispose();
            teamCoordinator?.Dispose();
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
    /// Project type enumeration for adaptive validation
    /// </summary>
    public enum ProjectType
    {
        Indie,
        Enterprise,
        Educational,
        Prototype
    }
    
    /// <summary>
    /// Team size enumeration for validation adaptation
    /// </summary>
    public enum TeamSize
    {
        Solo,
        Small,
        Large
    }
    
    /// <summary>
    /// Validation depth enumeration
    /// </summary>
    public enum ValidationDepth
    {
        Essential,
        Moderate,
        Comprehensive
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
        public bool HasExplanation;
        public string Explanation;
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
    /// Project analysis for adaptive validation
    /// </summary>
    public class ProjectAnalysis
    {
        public ProjectType ProjectType;
        public TeamSize TeamSize;
        public string UnityVersion;
        public float TechnicalDebtLevel;
        public bool HasUIElements;
        public bool Has2DAssets;
        public bool Has3DAssets;
        public bool HasAnimations;
        public bool HasScriptableObjects;
        public bool UsesAddressables;
        public bool HasCustomPackages;
        public int TotalAssets;
        public int TotalScripts;
        public int TotalScenes;
    }
    
    /// <summary>
    /// Quality metrics for project health tracking
    /// </summary>
    public class QualityMetrics
    {
        public float OverallQualityScore;
        public float CodeQuality;
        public float AssetQuality;
        public float ProjectStructure;
        public List<QualityMetricPoint> QualityHistory;
        public List<string> QualityRecommendations;
    }
    
    /// <summary>
    /// Quality metric point for trend tracking
    /// </summary>
    public class QualityMetricPoint
    {
        public DateTime Timestamp;
        public float QualityScore;
        public int IssueCount;
    }
    
    /// <summary>
    /// Team validation status
    /// </summary>
    public class TeamValidationStatus
    {
        public int ActiveMembers;
        public int SharedStandards;
        public bool InSync;
        public DateTime LastSync;
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
        
        [Header("Adaptive Settings")]
        public ValidationDepth ValidationDepth = ValidationDepth.Moderate;
        public bool EnableAutomaticFixes = true;
        public bool EnableProgressiveValidation = false;
        public bool PrioritizeDebtReduction = false;
        public bool FocusOnCriticalIssues = false;
        
        [Header("Advanced Features")]
        public bool UseModernValidationAPIs = true;
        public bool EnablePerformanceOptimizations = true;
        public bool EnableAdvancedAssetPipeline = false;
        public bool UseLegacyValidationMode = false;
        
        [Header("Team Features")]
        public bool EnableCollaborativeValidation = false;
        public bool EnableSharedStandards = false;
        public bool EnableTeamReporting = false;
        public bool EnableMetricsCollection = false;
        public bool EnableEnterpriseFeatures = false;
        public bool EnableCentralizedManagement = false;
        public bool EnableAdvancedReporting = false;
        
        [Header("Learning Mode")]
        public bool EnableLearningMode = false;
        public bool ProvideDetailedExplanations = false;
        public bool FocusOnAutomation = false;
        
        [Header("Custom Validators")]
        public List<Type> CustomValidators = new List<Type>();
        
        [Header("Team Settings")]
        public TeamValidationSettings TeamSettings;
        
        public static ValidationConfiguration LoadOrCreate()
        {
            var config = AssetDatabase.LoadAssetAtPath<ValidationConfiguration>("Assets/Editor/Validation/ValidationConfiguration.asset");
            
            if (config == null)
            {
                config = CreateInstance<ValidationConfiguration>();
                
                // Ensure directory exists
                var directory = "Assets/Editor/Validation";
                if (!AssetDatabase.IsValidFolder(directory))
                {
                    Directory.CreateDirectory(directory);
                    AssetDatabase.Refresh();
                }
                
                AssetDatabase.CreateAsset(config, "Assets/Editor/Validation/ValidationConfiguration.asset");
                AssetDatabase.SaveAssets();
            }
            
            return config;
        }
    }
    
    /// <summary>
    /// Team validation settings
    /// </summary>
    [Serializable]
    public class TeamValidationSettings
    {
        public string TeamName;
        public List<string> TeamMembers;
        public string SharedStandardsPath;
        public bool AutoSyncStandards;
        public float SyncInterval;
    }
    
    #endregion
}
```

### 2. Advanced Asset and Code Validation Systems

#### 2.1 Comprehensive Asset and Code Analysis

[[LLM: Create specialized validation systems for different asset types and code analysis. Design validators for textures, audio, prefabs, scenes, and scripts that check for common issues, performance problems, and project standards compliance. Include automated fixes where possible and detailed reporting for manual resolution.]]

**Asset and Code Validation Systems**:

```csharp
// Assets/Scripts/Editor/Validation/Validators/AdvancedValidators.cs
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
    /// Advanced texture format validator with adaptive optimization
    /// </summary>
    public class AdvancedTextureFormatValidator : IValidator
    {
        public string Name => "Advanced Texture Format Validator";
        public string Category => "Assets";
        public string Description => "Validates texture import settings with platform-specific optimization";
        public ValidationType ValidationType => ValidationType.Asset;
        public bool IsQuickValidator => true;
        
        private ProjectAnalysis projectAnalysis;
        private readonly Dictionary<TextureImporterType, int> maxTextureSizes = new Dictionary<TextureImporterType, int>();
        
        public void Initialize()
        {
            // Initialize based on project analysis
            var adaptiveEngine = new AdaptiveValidationEngine();
            projectAnalysis = adaptiveEngine.GetCurrentAnalysis();
            
            // Adapt texture size limits based on project type
            switch (projectAnalysis.ProjectType)
            {
                case ProjectType.Indie:
                    maxTextureSizes[TextureImporterType.Default] = 1024;
                    maxTextureSizes[TextureImporterType.Sprite] = 512;
                    break;
                case ProjectType.Enterprise:
                    maxTextureSizes[TextureImporterType.Default] = 2048;
                    maxTextureSizes[TextureImporterType.Sprite] = 1024;
                    break;
            }
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
            
            // Adaptive validation based on project characteristics
            ValidateTextureSize(texture, textureImporter, assetPath, results);
            ValidateCompressionSettings(textureImporter, assetPath, results);
            ValidatePlatformSettings(textureImporter, assetPath, results);
            ValidateMemoryUsage(texture, assetPath, results);
            
            if (projectAnalysis.Has2DAssets)
            {
                ValidateSpriteSpecificSettings(textureImporter, assetPath, results);
            }
        }
        
        private void ValidateTextureSize(Texture2D texture, TextureImporter importer, string assetPath, List<ValidationResult> results)
        {
            var maxSize = maxTextureSizes.ContainsKey(importer.textureType) ? 
                maxTextureSizes[importer.textureType] : 2048;
            
            if (texture.width > maxSize || texture.height > maxSize)
            {
                results.Add(new ValidationResult
                {
                    Message = $"Texture size ({texture.width}x{texture.height}) exceeds recommended maximum ({maxSize}x{maxSize}) for {projectAnalysis.ProjectType} project",
                    Category = Category,
                    Severity = ValidationSeverity.Warning,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasFix = true,
                    FixAction = () => ResizeTexture(importer, maxSize),
                    HasExplanation = true,
                    Explanation = $"Large textures consume more memory and may impact performance on target platforms. For {projectAnalysis.ProjectType} projects, consider using smaller textures or texture streaming."
                });
            }
            
            // Check for non-power-of-two textures with context-aware recommendations
            if (!Mathf.IsPowerOfTwo(texture.width) || !Mathf.IsPowerOfTwo(texture.height))
            {
                if (importer.textureType != TextureImporterType.GUI && importer.textureType != TextureImporterType.Sprite)
                {
                    var severity = projectAnalysis.ProjectType == ProjectType.Enterprise ? 
                        ValidationSeverity.Warning : ValidationSeverity.Info;
                    
                    results.Add(new ValidationResult
                    {
                        Message = $"Texture has non-power-of-two dimensions ({texture.width}x{texture.height}), which may impact GPU performance",
                        Category = Category,
                        Severity = severity,
                        AssetPath = assetPath,
                        ValidatorName = Name,
                        HasExplanation = true,
                        Explanation = "Non-power-of-two textures may use more memory and processing time on some graphics hardware. Consider resizing to the nearest power-of-two dimensions."
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
                var severity = projectAnalysis.ProjectType == ProjectType.Indie ? 
                    ValidationSeverity.Warning : ValidationSeverity.Info;
                
                results.Add(new ValidationResult
                {
                    Message = "Texture uses uncompressed format, consider using compressed format for better performance",
                    Category = Category,
                    Severity = severity,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasFix = true,
                    FixAction = () => ApplyCompressionSettings(importer),
                    HasExplanation = true,
                    Explanation = "Compressed textures use significantly less memory and bandwidth, improving performance especially on mobile devices."
                });
            }
        }
        
        private void ValidatePlatformSettings(TextureImporter importer, string assetPath, List<ValidationResult> results)
        {
            // Check for missing platform-specific settings
            var platformOverrides = importer.GetAllPlatformSettings();
            var targetPlatforms = GetTargetPlatforms();
            
            foreach (var platform in targetPlatforms)
            {
                if (!platformOverrides.Any(p => p.name == platform))
                {
                    results.Add(new ValidationResult
                    {
                        Message = $"Missing platform-specific texture settings for {platform}",
                        Category = Category,
                        Severity = ValidationSeverity.Info,
                        AssetPath = assetPath,
                        ValidatorName = Name,
                        HasFix = true,
                        FixAction = () => AddPlatformSettings(importer, platform),
                        HasExplanation = true,
                        Explanation = $"Platform-specific texture settings allow for optimized texture formats and sizes for {platform} deployment."
                    });
                }
            }
        }
        
        private void ValidateMemoryUsage(Texture2D texture, string assetPath, List<ValidationResult> results)
        {
            var estimatedMemory = CalculateTextureMemoryUsage(texture);
            var memoryThreshold = projectAnalysis.ProjectType == ProjectType.Indie ? 4.0f : 16.0f; // MB
            
            if (estimatedMemory > memoryThreshold)
            {
                results.Add(new ValidationResult
                {
                    Message = $"Texture uses approximately {estimatedMemory:F1}MB of memory, which is above the {memoryThreshold}MB threshold for {projectAnalysis.ProjectType} projects",
                    Category = Category,
                    Severity = ValidationSeverity.Warning,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasExplanation = true,
                    Explanation = "High memory usage textures can impact performance and may cause issues on devices with limited memory."
                });
            }
        }
        
        private void ValidateSpriteSpecificSettings(TextureImporter importer, string assetPath, List<ValidationResult> results)
        {
            if (importer.textureType == TextureImporterType.Sprite)
            {
                if (importer.mipmapEnabled)
                {
                    results.Add(new ValidationResult
                    {
                        Message = "Sprite textures should not have mipmaps enabled",
                        Category = Category,
                        Severity = ValidationSeverity.Warning,
                        AssetPath = assetPath,
                        ValidatorName = Name,
                        HasFix = true,
                        FixAction = () => DisableMipmaps(importer),
                        HasExplanation = true,
                        Explanation = "Mipmaps on sprite textures waste memory as sprites are typically rendered at their original size."
                    });
                }
            }
        }
        
        private List<string> GetTargetPlatforms()
        {
            // Determine target platforms based on project analysis
            var platforms = new List<string>();
            
            // Add platforms based on project type and detected build targets
            platforms.Add("Standalone");
            
            if (projectAnalysis.ProjectType == ProjectType.Indie)
            {
                platforms.Add("Android");
                platforms.Add("iOS");
            }
            
            return platforms;
        }
        
        private float CalculateTextureMemoryUsage(Texture2D texture)
        {
            if (texture == null) return 0f;
            
            int width = texture.width;
            int height = texture.height;
            int bytesPerPixel = GetBytesPerPixel(texture.format);
            
            return (width * height * bytesPerPixel) / (1024f * 1024f);
        }
        
        private int GetBytesPerPixel(TextureFormat format)
        {
            switch (format)
            {
                case TextureFormat.RGBA32:
                case TextureFormat.ARGB32:
                    return 4;
                case TextureFormat.RGB24:
                    return 3;
                case TextureFormat.RGBA4444:
                case TextureFormat.RGB565:
                    return 2;
                case TextureFormat.Alpha8:
                    return 1;
                case TextureFormat.DXT1:
                    return 1;
                case TextureFormat.DXT5:
                    return 1;
                default:
                    return 4;
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
        
        private void AddPlatformSettings(TextureImporter importer, string platform)
        {
            var platformSettings = importer.GetPlatformTextureSettings(platform);
            platformSettings.overridden = true;
            
            // Set platform-appropriate compression format
            switch (platform)
            {
                case "Android":
                    platformSettings.format = TextureImporterFormat.ASTC_6x6;
                    break;
                case "iOS":
                    platformSettings.format = TextureImporterFormat.ASTC_6x6;
                    break;
                default:
                    platformSettings.format = TextureImporterFormat.DXT5;
                    break;
            }
            
            importer.SetPlatformTextureSettings(platformSettings);
            EditorUtility.SetDirty(importer);
            importer.SaveAndReimport();
        }
    }
    
    /// <summary>
    /// Advanced script compilation validator with team standards support
    /// </summary>
    public class AdvancedScriptCompilationValidator : IValidator
    {
        public string Name => "Advanced Script Compilation Validator";
        public string Category => "Code";
        public string Description => "Validates script compilation and coding standards with team compliance";
        public ValidationType ValidationType => ValidationType.Code;
        public bool IsQuickValidator => true;
        
        private ProjectAnalysis projectAnalysis;
        private readonly List<string> requiredNamespaces = new List<string>();
        private readonly Regex namingConventionRegex = new Regex(@"^[A-Z][a-zA-Z0-9]*$");
        private TeamValidationSettings teamSettings;
        
        public void Initialize()
        {
            var adaptiveEngine = new AdaptiveValidationEngine();
            projectAnalysis = adaptiveEngine.GetCurrentAnalysis();
            
            requiredNamespaces.Add("{{project_namespace}}");
            
            // Load team settings if available
            var config = ValidationConfiguration.LoadOrCreate();
            teamSettings = config.TeamSettings;
        }
        
        public List<ValidationResult> Validate()
        {
            var results = new List<ValidationResult>();
            var scriptGUIDs = AssetDatabase.FindAssets("t:Script");
            
            foreach (var guid in scriptGUIDs)
            {
                var assetPath = AssetDatabase.GUIDToAssetPath(guid);
                if (ShouldValidateScript(assetPath))
                {
                    ValidateScript(assetPath, results);
                }
            }
            
            return results;
        }
        
        public bool CanValidate(string assetPath)
        {
            return assetPath.EndsWith(".cs") && ShouldValidateScript(assetPath);
        }
        
        private bool ShouldValidateScript(string assetPath)
        {
            // Skip editor scripts for runtime validation
            if (assetPath.Contains("/Editor/") && !assetPath.Contains("/Tests/"))
            {
                return false;
            }
            
            // Skip third-party scripts
            if (assetPath.Contains("/Plugins/") || assetPath.Contains("/Third Party/"))
            {
                return false;
            }
            
            return true;
        }
        
        private void ValidateScript(string assetPath, List<ValidationResult> results)
        {
            if (!File.Exists(assetPath)) return;
            
            var scriptContent = File.ReadAllText(assetPath);
            var lines = scriptContent.Split('\n');
            
            // Core validations
            ValidateNamespace(scriptContent, assetPath, results);
            ValidateNamingConventions(scriptContent, assetPath, results);
            ValidateCodeStructure(scriptContent, assetPath, results);
            ValidateDocumentation(lines, assetPath, results);
            
            // Team-specific validations
            if (teamSettings != null && projectAnalysis.TeamSize != TeamSize.Solo)
            {
                ValidateTeamStandards(scriptContent, assetPath, results);
            }
            
            // Project-specific validations
            ValidateProjectSpecificRules(scriptContent, assetPath, results);
        }
        
        private void ValidateNamespace(string scriptContent, string assetPath, List<ValidationResult> results)
        {
            bool hasRequiredNamespace = requiredNamespaces.Any(ns => scriptContent.Contains($"namespace {ns}"));
            
            if (!hasRequiredNamespace && !scriptContent.Contains("namespace "))
            {
                var severity = projectAnalysis.TeamSize == TeamSize.Large ? 
                    ValidationSeverity.Error : ValidationSeverity.Warning;
                
                results.Add(new ValidationResult
                {
                    Message = "Script should use a namespace to avoid naming conflicts",
                    Category = Category,
                    Severity = severity,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasFix = true,
                    FixAction = () => AddNamespace(assetPath),
                    HasExplanation = true,
                    Explanation = "Namespaces help organize code and prevent naming conflicts, especially important in larger projects and when using third-party packages."
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
                        ValidatorName = Name,
                        HasExplanation = true,
                        Explanation = "Class names should match their file names for better code organization and maintainability."
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
                        ValidatorName = Name,
                        HasExplanation = true,
                        Explanation = "C# classes should follow PascalCase naming convention (e.g., PlayerController, GameManager)."
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
                    Message = "Empty catch block found, consider adding error handling or logging",
                    Category = Category,
                    Severity = ValidationSeverity.Warning,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasExplanation = true,
                    Explanation = "Empty catch blocks hide errors and make debugging difficult. Consider logging the exception or handling it appropriately."
                });
            }
            
            // Check for Debug.Log in release code
            if (scriptContent.Contains("Debug.Log") && !assetPath.Contains("Test"))
            {
                var severity = projectAnalysis.ProjectType == ProjectType.Enterprise ? 
                    ValidationSeverity.Warning : ValidationSeverity.Info;
                
                results.Add(new ValidationResult
                {
                    Message = "Debug.Log found in production code, consider using a logging service or conditional compilation",
                    Category = Category,
                    Severity = severity,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasExplanation = true,
                    Explanation = "Debug.Log calls remain in release builds and can impact performance. Consider using a proper logging framework or conditional compilation directives."
                });
            }
            
            // Check for magic numbers
            ValidateMagicNumbers(scriptContent, assetPath, results);
            
            // Check for proper using statements
            ValidateUsingStatements(scriptContent, assetPath, results);
        }
        
        private void ValidateMagicNumbers(string scriptContent, string assetPath, List<ValidationResult> results)
        {
            // Simple magic number detection (numbers > 1 that aren't in obvious contexts)
            var magicNumberPattern = @"(?<!\w)([2-9]|\d{2,})(?!\w|\.|\d)";
            var matches = Regex.Matches(scriptContent, magicNumberPattern);
            
            if (matches.Count > 5) // Threshold for too many magic numbers
            {
                results.Add(new ValidationResult
                {
                    Message = $"Multiple magic numbers detected ({matches.Count} instances), consider using named constants",
                    Category = Category,
                    Severity = ValidationSeverity.Info,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasExplanation = true,
                    Explanation = "Magic numbers make code harder to understand and maintain. Consider defining named constants or configuration values."
                });
            }
        }
        
        private void ValidateUsingStatements(string scriptContent, string assetPath, List<ValidationResult> results)
        {
            var lines = scriptContent.Split('\n');
            var usingLines = lines.Where(line => line.Trim().StartsWith("using ") && !line.Contains("//")).ToList();
            
            // Check for unused using statements (simplified check)
            foreach (var usingLine in usingLines)
            {
                var namespaceName = ExtractNamespaceFromUsing(usingLine);
                if (!string.IsNullOrEmpty(namespaceName) && !IsNamespaceUsed(scriptContent, namespaceName))
                {
                    results.Add(new ValidationResult
                    {
                        Message = $"Unused using statement: {usingLine.Trim()}",
                        Category = Category,
                        Severity = ValidationSeverity.Info,
                        AssetPath = assetPath,
                        ValidatorName = Name,
                        HasExplanation = true,
                        Explanation = "Unused using statements add clutter and can slightly impact compilation time."
                    });
                }
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
                if (line.StartsWith("public") && line.Contains("(") && line.Contains(")") && !line.Contains("="))
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
            
            var documentationThreshold = projectAnalysis.TeamSize == TeamSize.Large ? 0.8f : 0.5f;
            
            if (publicMethods > 0 && documentedMethods < publicMethods * documentationThreshold)
            {
                var severity = projectAnalysis.TeamSize == TeamSize.Large ? 
                    ValidationSeverity.Warning : ValidationSeverity.Info;
                
                results.Add(new ValidationResult
                {
                    Message = $"Only {documentedMethods}/{publicMethods} public methods are documented (expected {documentationThreshold:P0})",
                    Category = Category,
                    Severity = severity,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasExplanation = true,
                    Explanation = "Well-documented public APIs improve code maintainability and help team members understand the codebase."
                });
            }
        }
        
        private void ValidateTeamStandards(string scriptContent, string assetPath, List<ValidationResult> results)
        {
            if (teamSettings?.TeamMembers != null && teamSettings.TeamMembers.Count > 1)
            {
                // Check for team-specific coding standards
                ValidateTeamNamingConventions(scriptContent, assetPath, results);
                ValidateTeamCodePatterns(scriptContent, assetPath, results);
            }
        }
        
        private void ValidateTeamNamingConventions(string scriptContent, string assetPath, List<ValidationResult> results)
        {
            // Example: Check for private field naming convention
            var privateFieldPattern = @"private\s+\w+\s+(\w+)";
            var matches = Regex.Matches(scriptContent, privateFieldPattern);
            
            foreach (Match match in matches)
            {
                var fieldName = match.Groups[1].Value;
                if (!fieldName.StartsWith("_") && !fieldName.StartsWith("m_"))
                {
                    results.Add(new ValidationResult
                    {
                        Message = $"Private field '{fieldName}' should follow team naming convention (prefix with _ or m_)",
                        Category = Category,
                        Severity = ValidationSeverity.Info,
                        AssetPath = assetPath,
                        ValidatorName = Name,
                        HasExplanation = true,
                        Explanation = "Consistent naming conventions help team members quickly understand code structure and ownership."
                    });
                }
            }
        }
        
        private void ValidateTeamCodePatterns(string scriptContent, string assetPath, List<ValidationResult> results)
        {
            // Example: Check for team-preferred patterns
            if (scriptContent.Contains("GameObject.Find") && projectAnalysis.TeamSize == TeamSize.Large)
            {
                results.Add(new ValidationResult
                {
                    Message = "GameObject.Find usage detected, consider using dependency injection or references for better performance",
                    Category = Category,
                    Severity = ValidationSeverity.Warning,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasExplanation = true,
                    Explanation = "GameObject.Find can be slow and fragile. Consider using direct references, dependency injection, or a service locator pattern."
                });
            }
        }
        
        private void ValidateProjectSpecificRules(string scriptContent, string assetPath, List<ValidationResult> results)
        {
            // Validate based on project characteristics
            if (projectAnalysis.Has2DAssets && scriptContent.Contains("Rigidbody") && !scriptContent.Contains("Rigidbody2D"))
            {
                results.Add(new ValidationResult
                {
                    Message = "3D Rigidbody usage detected in 2D project, consider using Rigidbody2D",
                    Category = Category,
                    Severity = ValidationSeverity.Warning,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasExplanation = true,
                    Explanation = "Using 3D physics components in 2D projects can cause unexpected behavior and performance issues."
                });
            }
            
            if (projectAnalysis.UsesAddressables && scriptContent.Contains("Resources.Load"))
            {
                results.Add(new ValidationResult
                {
                    Message = "Resources.Load usage detected in Addressables project, consider using Addressable asset loading",
                    Category = Category,
                    Severity = ValidationSeverity.Info,
                    AssetPath = assetPath,
                    ValidatorName = Name,
                    HasExplanation = true,
                    Explanation = "Addressable assets provide better memory management and loading flexibility than the Resources system."
                });
            }
        }
        
        private string ExtractNamespaceFromUsing(string usingLine)
        {
            var match = Regex.Match(usingLine, @"using\s+([\w\.]+);");
            return match.Success ? match.Groups[1].Value : string.Empty;
        }
        
        private bool IsNamespaceUsed(string scriptContent, string namespaceName)
        {
            // Simplified check - in reality, this would be more sophisticated
            var lastPart = namespaceName.Split('.').Last();
            return scriptContent.Contains(lastPart) && scriptContent.IndexOf(lastPart) != scriptContent.LastIndexOf(lastPart);
        }
        
        private void AddNamespace(string assetPath)
        {
            try
            {
                var scriptContent = File.ReadAllText(assetPath);
                var namespaceName = $"{{{{project_namespace}}}}.{Path.GetFileNameWithoutExtension(assetPath)}";
                
                // Simple namespace addition (in reality, this would be more sophisticated)
                var usingIndex = scriptContent.LastIndexOf("using ");
                if (usingIndex >= 0)
                {
                    var nextLineIndex = scriptContent.IndexOf('\n', usingIndex);
                    if (nextLineIndex >= 0)
                    {
                        var insertPosition = nextLineIndex + 1;
                        var namespacedContent = scriptContent.Substring(0, insertPosition) +
                                             $"\nnamespace {namespaceName}\n{{\n" +
                                             scriptContent.Substring(insertPosition) +
                                             "\n}";
                        
                        File.WriteAllText(assetPath, namespacedContent);
                        AssetDatabase.Refresh();
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to add namespace to {assetPath}: {ex.Message}");
            }
        }
    }
}
```

## Success Criteria

This Unity Editor Validation and Quality Assurance Task provides:

- **Adaptive Validation Framework**: Intelligent system that adapts to project type, team size, and current quality level
- **Comprehensive Asset Validation**: Advanced validators for textures, prefabs, audio, and other Unity assets with context-aware rules
- **Advanced Code Quality Analysis**: Script validation with team standards support, naming conventions, and project-specific rules
- **Real-Time Validation Monitoring**: Continuous validation during development with configurable intervals and performance optimization
- **Automated Quality Gates**: Pre-build validation and asset import monitoring with intelligent issue detection
- **Team Collaboration Features**: Shared validation standards, team reporting, and collaborative quality management
- **Quality Metrics and Analytics**: Comprehensive tracking of project health with trend analysis and improvement recommendations
- **Extensible Validation Architecture**: Plugin system for custom validators with advanced configuration and rule management
- **Educational Features**: Detailed explanations for validation issues with learning mode for skill development
- **Enterprise-Grade Features**: Advanced reporting, centralized management, and integration with CI/CD pipelines

## Integration Points

This task integrates with:
- `unity-editor-integration.md` - Extends editor tools with comprehensive validation capabilities
- `integration-tests.md` - Provides editor-time validation for integration testing scenarios
- `scriptableobject-setup.md` - Validates ScriptableObject configurations and data integrity
- `interface-design.md` - Validates interface implementation and dependency contracts
- `component-architecture.md` - Ensures component system integrity and architectural compliance

## Notes

This editor validation framework establishes a production-ready quality assurance foundation that scales from solo indie development to large enterprise teams. The adaptive validation engine ensures that quality checks are appropriate for the project context while maintaining high standards and preventing technical debt accumulation.

The system supports continuous improvement through metrics collection and team collaboration features, making it an essential tool for professional Unity development workflows.