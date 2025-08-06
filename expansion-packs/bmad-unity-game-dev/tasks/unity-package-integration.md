# Unity Package Integration Task

## Purpose

To guide package-specific configuration and integration for Unity packages, documenting APIs, setup requirements, and best practices. This task ensures installed Unity packages are properly configured, integrated with the game architecture, and their APIs are documented for AI agent development.

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Prerequisites and Configuration Load

- Load `{root}/config.yaml` from the expansion pack directory
- Verify `unity-package-setup` task has been completed:
  - Check for `docs/unity-packages.md` existence
  - Verify `Packages/manifest.json` is up to date
- If prerequisites not met, HALT and inform user: "Please run unity-package-setup task first to install required packages."
- Load package list from manifest.json
- Identify packages requiring integration based on architecture docs

### 1. Package-Specific Integration Analysis

#### 1.1 Categorize Packages by Integration Complexity

**Simple Packages** (configuration only):
- TextMeshPro
- ProBuilder
- 2D Sprite

**Medium Complexity** (configuration + code setup):
- Input System
- Cinemachine
- Timeline

**Complex Packages** (architecture impact):
- Addressables
- URP/HDRP
- Multiplayer/Netcode
- Unity Gaming Services

#### 1.2 Read Architecture Requirements

For each package category, read relevant architecture docs:
- If `gamearchitectureSharded: true`:
  - Read `{gamearchitectureShardedLocation}/index.md` to find correct filenames
  - Look for tech stack file (e.g., `3-tech-stack.md`) - Package versions and rationale
  - Look for project structure file (e.g., `8-unity-project-structure.md`) - Folder conventions
  - Fallback: Search directory for `*tech-stack*.md` and `*project-structure*.md` patterns
- Else: Use sections from monolithic `gamearchitectureFile`
- Package-specific architecture sections if they exist

### 2. Input System Integration

#### 2.1 Configure Input System Settings

**Project Settings Configuration**:
```json
// ProjectSettings/InputSystem.asset configuration
{
  "updateMode": "ProcessEventsInDynamicUpdate",
  "compensateForScreenOrientation": true,
  "defaultButtonPressPoint": 0.5,
  "supportedDevices": ["Keyboard", "Mouse", "Gamepad", "Touchscreen"]
}
```

#### 2.2 Create Input Action Assets

Generate template structure:
```text
Assets/
├── Settings/
│   └── Input/
│       ├── GameControls.inputactions
│       ├── UIControls.inputactions
│       └── InputActionMaps/
│           ├── PlayerActionMap.cs (generated)
│           └── UIActionMap.cs (generated)
```

#### 2.3 Document Input Integration Pattern

Create integration guide in `docs/package-integration/input-system.md`:

```markdown
# Input System Integration Guide

## Action Maps Configuration

### Player Controls
- **Movement**: WASD/Left Stick
- **Jump**: Space/South Button
- **Interact**: E/West Button
[Source: Settings/Input/GameControls.inputactions]

## Component Integration

### Required Components
```csharp
// On Player GameObject
[RequireComponent(typeof(PlayerInput))]
public class PlayerController : MonoBehaviour
{
    private GameControls _controls;
    
    private void Awake()
    {
        _controls = new GameControls();
    }
}
```
[Source: gamearchitecture/input-system.md]

### Event System Setup
- Add InputSystemUIInputModule to EventSystem
- Remove StandaloneInputModule
- Configure UI action references
```

### 3. Rendering Pipeline Integration

#### 3.1 URP/HDRP Configuration

**For URP Projects**:

Create pipeline assets:
```text
Assets/
├── Settings/
│   └── URP/
│       ├── UniversalRenderPipelineAsset.asset
│       ├── UniversalRenderPipelineAsset_Renderer.asset
│       └── QualitySettings/
│           ├── Low.asset
│           ├── Medium.asset
│           └── High.asset
```

Configure quality tiers:
```json
// Quality configuration per platform
{
  "Mobile": "Low",
  "Desktop": "High",
  "Console": "Medium"
}
```

#### 3.2 Shader and Material Setup

- Convert Built-in materials to URP/HDRP
- Document shader upgrade process
- Create material library structure:
  ```text
  Assets/Art/Materials/
  ├── Environment/
  ├── Characters/
  └── UI/
  ```

### 4. Addressables Integration

#### 4.1 Initialize Addressables System

**Create Addressable Groups**:
```text
Assets/
├── AddressableAssetsData/
│   ├── AddressableAssetSettings.asset
│   └── AssetGroups/
│       ├── Default Local Group.asset
│       ├── Character Assets.asset
│       ├── Environment Assets.asset
│       └── Audio Assets.asset
```

#### 4.2 Configure Build and Load Paths

```yaml
# Build paths configuration
BuildPath: Library/com.unity.addressables/aa/[Platform]
LoadPath: {UnityEngine.AddressableAssets.Addressables.RuntimePath}/[Platform]

# Remote paths (if using CDN)
RemoteBuildPath: ServerData/[Platform]
RemoteLoadPath: http://[CDN_URL]/[Platform]
```

#### 4.3 Create Asset Reference Templates

Generate helper scripts:
```csharp
// Assets/Scripts/Addressables/AddressableHelper.cs
public static class AddressableHelper
{
    public static async Task<T> LoadAssetAsync<T>(string key)
    {
        // Implementation following architecture patterns
    }
}
```

### 5. Cinemachine Integration

#### 5.1 Virtual Camera Setup

Create camera prefab structure:
```text
Assets/
├── Prefabs/
│   └── Cameras/
│       ├── MainVirtualCamera.prefab
│       ├── CutsceneVirtualCamera.prefab
│       └── FreeLookCamera.prefab
```

#### 5.2 Configure Brain Settings

```json
// CinemachineBrain configuration
{
  "defaultBlend": {
    "style": "EaseInOut",
    "time": 0.5
  },
  "updateMethod": "SmartUpdate",
  "worldUpOverride": "None"
}
```

### 6. Unity Gaming Services Preparation

#### 6.1 Document Service Requirements

For each Unity Gaming Service planned:

**Analytics**:
- Events to track
- Custom parameters
- Privacy compliance requirements

**Cloud Save**:
- Data structures to save
- Sync strategies
- Conflict resolution

**Remote Config**:
- Configuration parameters
- A/B testing setup
- Update strategies

#### 6.2 Create Service Integration Templates

Generate placeholder integration points:
```csharp
// Assets/Scripts/Services/UnityServicesManager.cs
public class UnityServicesManager : MonoBehaviour
{
    // Prepared for unity-cloud-services-setup task
    // Integration points documented here
}
```

### 7. Package API Documentation

#### 7.1 Generate API Reference

For each integrated package, document:

```markdown
# {{Package Name}} API Reference

## Commonly Used APIs

### {{API Category}}
```csharp
// Example usage
{{code_example}}
```
[Source: Package documentation]

## Integration Points

### With Game Systems
- {{System}}: {{Integration description}}
[Source: gamearchitecture/{{relevant_doc}}.md]

## Best Practices
- {{Practice 1}}
- {{Practice 2}}
[Source: Unity documentation]
```

#### 7.2 Create Code Snippets Library

Generate `docs/package-integration/code-snippets.md`:
- Common initialization patterns
- Typical use cases
- Performance optimizations
- Error handling patterns

### 8. Testing and Validation

#### 8.1 Create Integration Tests

Generate test templates:
```csharp
// Assets/Tests/PackageIntegration/InputSystemTests.cs
[TestFixture]
public class InputSystemTests
{
    [Test]
    public void InputSystem_ActionMaps_LoadCorrectly()
    {
        // Test implementation
    }
}
```

#### 8.2 Validation Checklist

- [ ] All packages configured in ProjectSettings
- [ ] Required assets created in Settings folders
- [ ] Integration documentation complete
- [ ] API examples provided
- [ ] Test coverage for integrations
- [ ] Architecture alignment verified

### 9. Story Template Enhancement

#### 9.1 Update Story Creation

Enhance story templates to include:
```markdown
## Package Dependencies
- Input System: Required for player controls
- Cinemachine: Required for camera features
- [Other packages as needed]

## Package-Specific Tasks
- [ ] Configure Input Action callbacks
- [ ] Set up Virtual Camera priorities
- [ ] [Other package-specific tasks]
```

### 10. Final Documentation and Handoff

#### 10.1 Generate Integration Summary

Create `docs/package-integration-summary.md`:
```markdown
# Package Integration Summary

## Integrated Packages
| Package | Version | Status | Documentation |
|---------|---------|--------|---------------|
| Input System | {{version}} | ✅ Configured | docs/package-integration/input-system.md |
| {{other_packages}} | | | |

## Integration Checklist
- [x] Input System configured and tested
- [x] Rendering pipeline set up
- [ ] Addressables initialized (if needed)
- [ ] Cinemachine cameras configured
- [ ] Gaming Services prepared for integration

## Next Steps
1. Review generated configurations
2. Test integrated systems
3. Run validation suite
4. Proceed with unity-cloud-services-setup if needed
```

#### 10.2 Commit Integration Files

- Stage all configuration files
- Commit with message: "Unity package integration completed"
- Document any manual steps required

### Success Criteria

- All installed packages properly configured
- Package-specific APIs documented with examples
- Integration points with game architecture clear
- Helper scripts and templates generated
- Test coverage for package integrations
- Documentation comprehensive for AI agents
- Story templates enhanced with package context

## Notes

- This task builds on unity-package-setup output
- Focuses on configuration and documentation, not installation
- Prepares groundwork for unity-cloud-services-setup
- All integrations follow BMAD architecture patterns
- Documentation references source files per BMAD standards
