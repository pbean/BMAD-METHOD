# Unity Editor Automation Task

## Purpose

To create Unity Editor scripts and tools that automate repetitive development tasks, improve workflow efficiency, and ensure consistency across the project. This task establishes Editor-side automation patterns that AI agents can leverage for Unity game development.

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Load Configuration and Validate Unity Project

- Load `{root}/config.yaml` from the expansion pack directory
- Extract key configurations: `gamearchitecture.*`, `gameDimension`, `devStoryLocation`
- Verify Unity Editor project structure:
  - Check for `Assets/Scripts/Editor/` directory (create if missing)
  - Check for `ProjectSettings/` directory
  - Verify Unity version from `ProjectSettings/ProjectVersion.txt`
- If not a Unity project, HALT and inform user: "Unity Editor automation requires a valid Unity project."

### 1. Analyze Current Editor Tooling

#### 1.1 Inventory Existing Editor Scripts

Scan for existing Editor automation:

- Custom inspectors in `Assets/Scripts/Editor/`
- Property drawers and decorator drawers
- Editor windows and utilities
- Build preprocessing scripts
- Asset postprocessors

#### 1.2 Identify Automation Opportunities

Based on project analysis, identify areas for automation:

- **Asset Management**: Import settings, naming conventions
- **Scene Setup**: Standard scene hierarchy, required components
- **Prefab Workflows**: Prefab validation, variant creation
- **Build Process**: Platform-specific settings, build validation
- **Development Tools**: Debug utilities, profiling helpers

### 2. Core Editor Menu Structure

#### 2.1 Create BMAD Menu Framework

Generate `Assets/Scripts/Editor/BMadMenu.cs`:

```csharp
using UnityEditor;
using UnityEngine;

public static class BMadMenu
{
    private const string MenuRoot = "BMad/";

    [MenuItem(MenuRoot + "Setup/Initialize Project")]
    public static void InitializeProject()
    {
        // Project initialization logic
        // Reference: gamearchitecture/unity-project-structure.md
    }

    [MenuItem(MenuRoot + "Setup/Validate Configuration")]
    public static void ValidateConfiguration()
    {
        // Configuration validation
        // Reference: config.yaml settings
    }

    [MenuItem(MenuRoot + "Tools/Create Story Scene")]
    public static void CreateStoryScene()
    {
        // Scene creation based on story requirements
        // Reference: devStoryLocation patterns
    }
}
```

### 3. Asset Pipeline Automation

#### 3.1 Create Asset Import Automation

Generate `Assets/Scripts/Editor/AssetImportAutomation.cs`:

```csharp
using UnityEditor;
using UnityEngine;

public class AssetImportAutomation : AssetPostprocessor
{
    // Texture import settings
    void OnPreprocessTexture()
    {
        TextureImporter importer = assetImporter as TextureImporter;

        // Apply settings based on path
        if (assetPath.Contains("Sprites"))
        {
            ConfigureForSprites(importer);
        }
        else if (assetPath.Contains("UI"))
        {
            ConfigureForUI(importer);
        }
        // Reference: gamearchitecture/asset-pipeline.md
    }

    // Model import settings (3D projects)
    void OnPreprocessModel()
    {
        ModelImporter importer = assetImporter as ModelImporter;
        // Configure based on gameDimension
        // Reference: gamearchitecture/3d-assets.md
    }

    // Audio import settings
    void OnPreprocessAudio()
    {
        AudioImporter importer = assetImporter as AudioImporter;
        // Configure compression and load type
        // Reference: gamearchitecture/audio-architecture.md
    }
}
```

### 4. Scene Management Automation

#### 4.1 Scene Setup Tools

Generate `Assets/Scripts/Editor/SceneSetupTools.cs`:

```csharp
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

public class SceneSetupTools : EditorWindow
{
    [MenuItem("BMad/Tools/Scene Setup Wizard")]
    public static void ShowWindow()
    {
        GetWindow<SceneSetupTools>("Scene Setup");
    }

    private void OnGUI()
    {
        GUILayout.Label("Scene Setup Wizard", EditorStyles.boldLabel);

        if (GUILayout.Button("Create Gameplay Scene"))
        {
            CreateGameplayScene();
        }

        if (GUILayout.Button("Create UI Scene"))
        {
            CreateUIScene();
        }

        if (GUILayout.Button("Validate Current Scene"))
        {
            ValidateScene();
        }
    }

    private static void CreateGameplayScene()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects);

        // Add required gameplay components
        CreateCameraSystem();
        CreateInputSystem();
        CreateGameManager();

        // Reference: gamearchitecture/scene-management.md
    }
}
```

### 5. Prefab Management Tools

#### 5.1 Prefab Validation System

Generate `Assets/Scripts/Editor/PrefabValidator.cs`:

```csharp
using UnityEditor;
using UnityEngine;
using System.Collections.Generic;

public class PrefabValidator : EditorWindow
{
    [MenuItem("BMad/Validation/Prefab Validator")]
    public static void ShowWindow()
    {
        GetWindow<PrefabValidator>("Prefab Validator");
    }

    private void OnGUI()
    {
        if (GUILayout.Button("Validate All Prefabs"))
        {
            ValidateAllPrefabs();
        }

        if (GUILayout.Button("Fix Common Issues"))
        {
            FixCommonPrefabIssues();
        }
    }

    private void ValidateAllPrefabs()
    {
        string[] prefabPaths = AssetDatabase.FindAssets("t:Prefab");

        foreach (string guid in prefabPaths)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);
            GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);

            // Validation checks
            ValidatePrefabStructure(prefab);
            ValidateComponents(prefab);
            ValidateNamingConvention(prefab);
        }

        // Reference: gamearchitecture/prefab-standards.md
    }
}
```

### 6. Build Automation

#### 6.1 Build Pipeline Automation

Generate `Assets/Scripts/Editor/BuildAutomation.cs`:

```csharp
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

public class BuildAutomation : IPreprocessBuildWithReport, IPostprocessBuildWithReport
{
    public int callbackOrder => 0;

    public void OnPreprocessBuild(BuildReport report)
    {
        Debug.Log("BMad: Pre-build validation starting...");

        // Validate project settings
        ValidateQualitySettings();
        ValidatePlayerSettings();
        ValidatePackages();

        // Platform-specific setup
        ConfigurePlatformSettings(report.summary.platform);

        // Reference: gamearchitecture/build-configuration.md
    }

    public void OnPostprocessBuild(BuildReport report)
    {
        Debug.Log($"BMad: Build completed - {report.summary.result}");

        // Generate build report
        GenerateBuildReport(report);

        // Archive build artifacts if needed
        ArchiveBuildArtifacts(report);
    }
}

public static class BuildMenu
{
    [MenuItem("BMad/Build/All Platforms")]
    public static void BuildAllPlatforms()
    {
        BuildForPlatform(BuildTarget.StandaloneWindows64);
        BuildForPlatform(BuildTarget.StandaloneOSX);
        BuildForPlatform(BuildTarget.WebGL);
        // Add other platforms as needed
    }
}
```

### 7. Custom Inspector Templates

#### 7.1 Generate Inspector Template

Create template for custom inspectors:

```csharp
// Assets/Scripts/Editor/Templates/CustomInspectorTemplate.cs
using UnityEditor;
using UnityEngine;

[CustomEditor(typeof(YourComponent))]
public class YourComponentEditor : Editor
{
    private SerializedProperty propertyExample;

    private void OnEnable()
    {
        // Cache serialized properties
        propertyExample = serializedObject.FindProperty("propertyName");
    }

    public override void OnInspectorGUI()
    {
        serializedObject.Update();

        // Custom GUI layout
        EditorGUILayout.LabelField("Custom Inspector", EditorStyles.boldLabel);

        EditorGUILayout.PropertyField(propertyExample);

        // Add helpful buttons
        if (GUILayout.Button("Perform Action"))
        {
            var component = target as YourComponent;
            component?.PerformAction();
        }

        serializedObject.ApplyModifiedProperties();
    }
}
```

### 8. Development Workflow Tools

#### 8.1 Story Integration Tools

Generate `Assets/Scripts/Editor/StoryIntegrationTools.cs`:

```csharp
using UnityEditor;
using UnityEngine;
using System.IO;

public class StoryIntegrationTools : EditorWindow
{
    [MenuItem("BMad/Stories/Import Story Requirements")]
    public static void ImportStoryRequirements()
    {
        // Read story files from devStoryLocation
        string storyPath = GetStoryPath();

        if (Directory.Exists(storyPath))
        {
            // Parse story files and create tasks
            ParseStoryFiles(storyPath);
        }
    }

    [MenuItem("BMad/Stories/Generate Story Scene")]
    public static void GenerateStoryScene()
    {
        // Create scene based on current story requirements
        // Reference: create-game-story.md task
    }

    [MenuItem("BMad/Stories/Validate Story Implementation")]
    public static void ValidateStoryImplementation()
    {
        // Check if story requirements are met
        // Reference: validate-game-story.md task
    }
}
```

### 9. Editor Preferences and Settings

#### 9.1 Create BMAD Editor Settings

Generate `Assets/Scripts/Editor/BMadEditorSettings.cs`:

```csharp
using UnityEditor;
using UnityEngine;

public class BMadEditorSettings : ScriptableObject
{
    [MenuItem("BMad/Settings/Open Preferences")]
    public static void OpenPreferences()
    {
        SettingsService.OpenProjectSettings("Project/BMad Settings");
    }
}

[System.Serializable]
public class BMadSettingsProvider : SettingsProvider
{
    public BMadSettingsProvider(string path, SettingsScope scope)
        : base(path, scope) {}

    [SettingsProvider]
    public static SettingsProvider CreateBMadSettingsProvider()
    {
        var provider = new BMadSettingsProvider("Project/BMad Settings", SettingsScope.Project);

        provider.guiHandler = (searchContext) =>
        {
            EditorGUILayout.LabelField("BMad Method Settings", EditorStyles.boldLabel);

            // Editor automation settings
            EditorGUILayout.Toggle("Auto-validate on save", true);
            EditorGUILayout.Toggle("Auto-import story updates", false);
            EditorGUILayout.Toggle("Enable build preprocessing", true);

            // Reference paths
            EditorGUILayout.TextField("Story Location", "docs/stories");
            EditorGUILayout.TextField("Architecture Docs", "docs/game-architecture");
        };

        return provider;
    }
}
```

### 10. Integration with BMAD Workflow

#### 10.1 Update Configuration

Add Editor automation settings to config.yaml:

```yaml
# Editor Automation Settings
editorAutomation:
  autoValidateOnSave: true
  autoImportStories: false
  enableBuildPreprocessing: true
  customInspectorTemplates: Assets/Scripts/Editor/Templates/
```

#### 10.2 Document Editor Tools

Create `docs/unity-editor-automation.md`:

```markdown
# Unity Editor Automation Guide

## Available Tools

### BMad Menu

- **Setup**: Project initialization and validation
- **Tools**: Scene creation, prefab management
- **Build**: Automated build pipeline
- **Stories**: Story integration and validation

### Keyboard Shortcuts

- `Alt+B, I`: Initialize project
- `Alt+B, V`: Validate configuration
- `Alt+B, S`: Create story scene

### Asset Import Automation

Automatic configuration based on asset location:

- Sprites/: Configured for 2D sprites
- UI/: Optimized for UI usage
- Models/: 3D model import settings

### Custom Inspectors

Templates available in: Assets/Scripts/Editor/Templates/

## Workflow Integration

### Story Development

1. Import story requirements: BMad > Stories > Import
2. Generate scene: BMad > Stories > Generate Scene
3. Validate implementation: BMad > Stories > Validate

### Build Process

1. Pre-build validation automatic
2. Platform-specific configuration
3. Post-build reporting

[Source: unity-editor-automation.md task]
```

### 11. Validation and Testing

#### 11.1 Create Editor Tests

Generate `Assets/Tests/Editor/EditorAutomationTests.cs`:

```csharp
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

public class EditorAutomationTests
{
    [Test]
    public void MenuItems_ShouldExist()
    {
        Assert.IsTrue(Menu.GetEnabled("BMad/Setup/Initialize Project"));
        Assert.IsTrue(Menu.GetEnabled("BMad/Tools/Scene Setup Wizard"));
    }

    [Test]
    public void AssetImporter_ShouldConfigureCorrectly()
    {
        // Test asset import automation
    }

    [Test]
    public void BuildAutomation_ShouldValidateSettings()
    {
        // Test build preprocessing
    }
}
```

### 12. Completion Summary

- Generate final summary report:
  - Editor tools created
  - Menu structure established
  - Automation scripts implemented
  - Integration with BMAD workflow complete
- Commit Editor scripts with message: "Unity Editor automation implemented"
- Provide usage instructions and next steps

## Success Criteria

- BMad menu structure created in Unity Editor
- Asset import automation configured
- Scene setup tools operational
- Prefab validation system working
- Build automation integrated
- Story workflow tools available
- Custom inspector templates provided
- Editor settings accessible
- Documentation complete for AI agents
- Tests validate Editor functionality

## Notes

- Follows BMAD sequential execution patterns
- Integrates with existing config.yaml structure
- References gamearchitecture documentation throughout
- Provides foundation for unity-cloud-services-setup
- All automation follows Unity Editor best practices
