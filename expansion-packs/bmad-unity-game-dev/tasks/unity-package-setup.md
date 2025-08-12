# Unity Package Setup Task

## Purpose

To automate Unity Package Manager workflows for game projects, including package installation, configuration, dependency validation, and version management. This task ensures proper Unity package integration with comprehensive documentation for AI agents working on Unity game development.

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Load Core Configuration and Validate Unity Project

- Load `{root}/config.yaml` from the expansion pack directory
- If the file does not exist, HALT and inform the user: "config.yaml not found in expansion pack. This file is required for Unity package management."
- Extract key configurations: `gamearchitecture.*`, `unityEditorLocation`, `gameDimension`
- Verify Unity project structure exists:
  - Check for `ProjectSettings/` directory
  - Check for `Packages/manifest.json`
  - Check for `Assets/` directory
- If not a Unity project, HALT and inform user: "This does not appear to be a Unity project. Please run this task from a Unity project root directory."

### 1. Analyze Current Package State

#### 1.1 Read Package Manifest

- Load `Packages/manifest.json` to identify:
  - Currently installed packages and versions
  - Package registry sources
  - Scoped registries if configured
  - Package lock file status
- Document package categories:
  - **Unity Registry Packages**: Official Unity packages
  - **Scoped Registry Packages**: Third-party registries
  - **Git Packages**: Packages from git repositories
  - **Local Packages**: file:// references
  - **Embedded Packages**: Packages in Packages/ directory

#### 1.2 Identify Package Dependencies

- For each installed package, identify:
  - Direct dependencies declared in manifest.json
  - Transitive dependencies from packages-lock.json
  - Version constraints and compatibility requirements
- Check for version conflicts or deprecated packages
- Note any preview or experimental packages

### 2. Gather Package Requirements

#### 2.1 Project-Specific Package Analysis

Based on `gameDimension` from config:

**If 2D Project**, check for essential packages:

- `com.unity.2d.sprite` - Sprite Editor
- `com.unity.2d.tilemap` - Tilemap system
- `com.unity.2d.animation` - 2D Animation
- `com.unity.2d.pixel-perfect` - Pixel Perfect Camera

**If 3D Project**, check for essential packages:

- `com.unity.render-pipelines.universal` or `com.unity.render-pipelines.high-definition`
- `com.unity.cinemachine` - Advanced camera system
- `com.unity.probuilder` - Level prototyping
- `com.unity.terrain-tools` - Terrain editing

**For Both 2D/3D**, verify common packages:

- `com.unity.inputsystem` - New Input System
- `com.unity.textmeshpro` - Advanced text rendering
- `com.unity.addressables` - Asset management
- `com.unity.test-framework` - Testing framework
- `com.unity.ide.vscode` or `com.unity.ide.rider` - IDE integration

#### 2.2 Architecture-Driven Package Requirements

- If `gamearchitectureSharded: true`:
  - Read `{gamearchitectureShardedLocation}/index.md` to find tech stack filename
  - Look for pattern like `3-tech-stack.md` or `*tech-stack*.md`
  - If not found in index, search for files matching `*tech-stack*.md` in directory
- Else: Look for tech-stack section in monolithic `gamearchitectureFile`
- Extract package requirements mentioned in architecture docs
- Cross-reference with manifest.json
- Document any missing required packages

### 3. Package Installation and Configuration

#### 3.1 Generate Package Installation Script

Create a package setup script that:

```json
{
  "dependencies": {
    // Core Unity packages based on project type
    {{core_packages}},

    // Architecture-specified packages
    {{architecture_packages}},

    // Optional recommended packages
    {{optional_packages}}
  },
  "scopedRegistries": [
    {{scoped_registries}}
  ]
}
```

#### 3.2 Package-Specific Configuration

For each package requiring configuration:

**Input System Package**:

- Create/update `ProjectSettings/InputSystem.asset`
- Document action maps location: `Assets/Settings/Input/`
- Set backend configuration (new/old/both)

**URP/HDRP Package**:

- Create/update pipeline asset: `Assets/Settings/UniversalRenderPipelineAsset.asset`
- Configure quality settings
- Set up renderer features

**Addressables Package**:

- Initialize Addressables settings
- Configure group templates
- Set build and load paths

**Cinemachine Package**:

- Document virtual camera prefab locations
- Configure brain settings in main camera

### 4. Generate Package Documentation

#### 4.1 Create Package Reference Document

Generate `docs/unity-packages.md` with:

```markdown
# Unity Package Configuration

## Package Manifest Summary

### Core Packages

| Package               | Version     | Purpose          | Configuration                    |
| --------------------- | ----------- | ---------------- | -------------------------------- |
| com.unity.inputsystem | {{version}} | New Input System | Settings/Input/InputSystem.asset |
| {{other_packages}}    |             |                  |                                  |

### Package-Specific APIs and Usage

#### Input System

- **Action Assets**: `Assets/Settings/Input/GameControls.inputactions`
- **Player Input Component**: Required on player prefab
- **Event System**: Configure in UI scenes
  [Source: Packages/manifest.json]

#### {{Other Package Sections}}

### Integration Points

#### With Game Architecture

- Input handling follows pattern in `gamearchitecture/input-system.md`
- Rendering pipeline configured per `gamearchitecture/rendering-pipeline.md`
  [Source: gamearchitecture documentation]

### Version Management

#### Update Strategy

- LTS version packages for production
- Preview packages only with explicit approval
- Lock file committed for reproducible builds

#### Compatibility Matrix

| Unity Version | Package Set  | Notes        |
| ------------- | ------------ | ------------ |
| 2022.3 LTS    | Current      | Recommended  |
| 2023.x        | Experimental | Testing only |
```

### 5. Validation and Testing

#### 5.1 Package Validation Checklist

- [ ] All packages resolve without errors
- [ ] No version conflicts in Console
- [ ] Package Manager UI shows no warnings
- [ ] Required packages from architecture docs installed
- [ ] Package configurations created in ProjectSettings/
- [ ] Package-specific assets created in Assets/Settings/

#### 5.2 Generate Setup Verification Script

Create `Scripts/Editor/PackageSetupValidator.cs`:

```csharp
using UnityEditor;
using UnityEditor.PackageManager;
using System.Linq;

public class PackageSetupValidator
{
    [MenuItem("Tools/Validate Package Setup")]
    public static void ValidatePackages()
    {
        // Check for required packages
        var requiredPackages = new[] {
            {{required_package_list}}
        };

        // Validate each package
        // Report missing or misconfigured packages
    }
}
```

### 6. Package Update Workflow

#### 6.1 Document Update Process

Create standardized workflow for package updates:

1. **Pre-Update Checklist**:

   - Backup project or commit current state
   - Review package changelog
   - Check compatibility with Unity version
   - Test in separate branch

2. **Update Execution**:

   - Update packages one at a time
   - Test after each update
   - Document any breaking changes
   - Update package documentation

3. **Post-Update Validation**:
   - Run package validator
   - Execute test suite
   - Profile performance impact
   - Update architecture docs if needed

### 7. Integration with BMAD Workflow

#### 7.1 Update Story Templates

Enhance story creation to include:

- Package requirements for story features
- Package API usage examples
- Configuration prerequisites

#### 7.2 Architecture Documentation Updates

If new packages added:

- Update tech stack document (find actual filename from `index.md`, e.g., `3-tech-stack.md`)
- Document in project structure file (find actual filename from `index.md`, e.g., `8-unity-project-structure.md`)
- Add to `devLoadAlwaysFiles` if critical

### 8. Completion and Handoff

- Execute validation checklist from step 5.1
- Generate summary report:
  - Packages installed/updated
  - Configurations created
  - Documentation generated
  - Any issues or warnings
- Update `docs/unity-packages.md` with final state
- Commit `Packages/manifest.json` and `Packages/packages-lock.json`
- Provide next steps:
  - For new packages: Review generated configurations
  - For updates: Test affected systems
  - For all: Run validation script

## Success Criteria

- Unity Package Manager properly configured for project type (2D/3D)
- All architecture-specified packages installed and configured
- Package documentation comprehensive and accurate
- Package-specific configurations created and documented
- Validation script confirms proper setup
- Integration with BMAD workflows documented
- Version management strategy clear

## Notes

- This task extends BMAD document-project patterns for Unity-specific needs
- Always commit packages-lock.json for reproducible builds
- Package configurations should align with architecture documents
- Preview packages require explicit justification
- Asset Store packages handled by separate unity-asset-integration task
