# Unity Visual Scripting Setup Task

## Purpose

To configure Unity Visual Scripting (formerly Bolt) for creating game logic, interactions, and behaviors without traditional C# programming. This task establishes a comprehensive Visual Scripting environment that enables non-programmers to create complex gameplay systems while maintaining professional development standards. Visual Scripting serves as the primary scripting interface for designers and artists, providing node-based programming for both 2D and 3D game development with seamless integration to traditional code when needed.

## Dependencies

**Prerequisite Tasks**:

- `unity-package-setup.md` - Visual Scripting package installation
- `unity-package-integration.md` - Package configuration and validation

**Integration Points**:

- Timeline System integration (Visual Scripting Timeline tracks)
  - Requires: `unity-timeline-setup.md` task completion
  - Validates: Script Graph playback in Timeline tracks
  - Dependencies: `com.unity.timeline` package >= 1.4.8
- Input System bindings (Visual Scripting Input nodes)
  - Requires: `unity-input-system-setup.md` task completion
  - Validates: Input Action Reference nodes functional
  - Dependencies: `com.unity.inputsystem` package >= 1.4.0
- Animation System integration (Animation State Machine Visual Scripting)
  - Validates: Animation parameter control via Script Graphs
  - Dependencies: Unity built-in animation system
- Audio System integration (Audio playback nodes)
  - Validates: AudioSource component control
  - Dependencies: Unity built-in audio system
- Physics System integration (Physics event nodes)
  - Validates: Collision and trigger detection
  - Dependencies: Unity built-in physics system
- UI System coordination (UI event handling)
  - Validates: Button clicks and UI interactions
  - Dependencies: Unity built-in UI system

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Prerequisites and Configuration Load

[[LLM: Validate Unity project structure and Visual Scripting package compatibility. Adapt validation steps based on detected Unity version. If any validation fails, provide specific remediation steps before proceeding.]]

- Load `{{root}}/config.yaml` from the expansion pack directory
- If config file missing, HALT with error: "config.yaml not found. Please ensure unity-package-setup task completed successfully."
- Verify Visual Scripting package installation (`com.unity.visualscripting`):
  - Check `Packages/manifest.json` for Visual Scripting dependency (minimum version: 1.7.8 for Unity 2021.3 LTS, 1.8.0 for Unity 2022.3 LTS, 1.9.0 for Unity 2023.3 LTS)
  - Validate Visual Scripting package in `Packages/packages-lock.json`
  - Verify Visual Scripting window accessible: Window > Visual Scripting > Visual Scripting Graph
  - If Visual Scripting missing, HALT with error: "Visual Scripting package not installed. Run: unity-package-setup task first."
- Verify prerequisite task completion:
  - Check for `docs/unity-packages.md` from unity-package-setup
  - Check for `docs/package-integration/` directory from unity-package-integration
  - If missing, HALT with error: "Prerequisite tasks not completed. Run unity-package-setup and unity-package-integration first."
- Identify game type ({{game_type}}) from architecture documents
- Load Visual Scripting version compatibility matrix for Unity LTS versions

### 1. Visual Scripting Asset Structure Setup

#### 1.1 Create Directory Structure

[[LLM: Analyze the project's existing folder structure and adapt the directory creation to match established conventions. If Assets/_Project/ doesn't exist, use the project's current structure pattern.]]

```text
{{project_root}}/Assets/
├── _Project/
│   ├── VisualScripting/
│   │   ├── ScriptGraphs/
│   │   │   ├── GameplayLogic/
│   │   │   │   ├── PlayerController/
│   │   │   │   ├── EnemyAI/
│   │   │   │   └── InteractableObjects/
│   │   │   ├── UILogic/
│   │   │   │   ├── MenuSystems/
│   │   │   │   ├── HUD/
│   │   │   │   └── DialogueSystem/
│   │   │   ├── GameSystems/
│   │   │   │   ├── SaveLoad/
│   │   │   │   ├── InventorySystem/
│   │   │   │   └── QuestSystem/
│   │   │   └── Utilities/
│   │   │       ├── CommonFunctions/
│   │   │       └── HelperGraphs/
│   │   ├── StateGraphs/
│   │   │   ├── CharacterStates/
│   │   │   ├── GameStates/
│   │   │   └── SystemStates/
│   │   ├── CustomNodes/
│   │   │   ├── GameplayNodes/
│   │   │   ├── AudioNodes/
│   │   │   └── UtilityNodes/
│   │   ├── Variables/
│   │   │   ├── GraphVariables/
│   │   │   ├── ObjectVariables/
│   │   │   └── SceneVariables/
│   │   └── Templates/
│   │       ├── PlayerTemplates/
│   │       ├── EnemyTemplates/
│   │       └── SystemTemplates/
```

[[LLM: Create directories only if they don't already exist. Log all created directories for tracking.]]

#### 1.2 Visual Scripting Asset Naming Conventions

[[LLM: Generate project-specific naming conventions based on game type ({{game_type}}) and existing asset naming patterns. Adapt examples to match project's domain.]]

```markdown
# Script Graph Naming Pattern: SG*[Category]*[Object]\_[Function]

- SG_Player_Movement_2D
- SG_Enemy_AI_BasicChase
- SG_UI_Menu_MainNavigation
- SG_System_Save_GameProgress

# State Graph Naming Pattern: SM*[Category]*[Object]\_[StateMachine]

- SM_Player_Combat_States
- SM_Enemy_Patrol_Behavior
- SM_Game_Level_Management

# Custom Node Naming Pattern: CN*[Domain]*[Function]

- CN_Audio_PlayRandomSFX
- CN_Gameplay_SpawnPickup
- CN_Utility_DelayedAction
```

[[LLM: Validate naming conventions against existing project standards and suggest modifications if conflicts exist.]]

### 2. Visual Scripting Graph Templates Setup

#### 2.1 Create Script Graph Templates

**Player Controller Template (2D)**:
[[LLM: Include this template only if game_type is "2D" or "2D/3D Hybrid". Skip if purely 3D game.]]

```text
// Assets/_Project/VisualScripting/Templates/PlayerTemplates/SG_Player_Movement_2D.asset
Visual Script Graph Template for 2D Player Movement

Nodes Structure:
┌─[On Update]────────────────────────────────────────────┐
│  ├─[Input: Get Axis "Horizontal"]                      │
│  │  └─[Multiply by Speed Variable]                     │
│  │    └─[Set Velocity X on Rigidbody2D]               │
│  │                                                     │
│  ├─[Input: Get Button Down "Jump"]                     │
│  │  └─[Add Force Y on Rigidbody2D]                    │
│  │                                                     │
│  └─[Animation Control]                                 │
│    ├─[Set Animator Bool "IsMoving"]                   │
│    └─[Set Animator Trigger "Jump"]                    │
└─────────────────────────────────────────────────────────┘

Variables Required:
- moveSpeed (Float): 5.0
- jumpForce (Float): 10.0
- groundLayer (LayerMask): Ground
```

**Player Controller Template (3D)**:
[[LLM: Include this template only if game_type is "3D" or "2D/3D Hybrid". Skip if purely 2D game.]]

```text
// Assets/_Project/VisualScripting/Templates/PlayerTemplates/SG_Player_Movement_3D.asset
Visual Script Graph Template for 3D Player Movement

Nodes Structure:
┌─[On Update]────────────────────────────────────────────┐
│  ├─[Input: Get Axis "Horizontal"]                      │
│  │  └─[Vector3 Right * Input Value]                   │
│  │                                                     │
│  ├─[Input: Get Axis "Vertical"]                        │
│  │  └─[Vector3 Forward * Input Value]                 │
│  │                                                     │
│  └─[Combine Movement Vectors]                          │
│    └─[Character Controller Move]                       │
│                                                        │
│  ├─[Input: Get Button Down "Jump"]                     │
│  │  └─[Ground Check]                                   │
│  │    └─[Add Vertical Velocity]                       │
└─────────────────────────────────────────────────────────┘

Variables Required:
- moveSpeed (Float): 6.0
- jumpHeight (Float): 2.0
- gravity (Float): -9.81
```

#### 2.2 Enemy AI Script Graph Template

```text
// Assets/_Project/VisualScripting/Templates/EnemyTemplates/SG_Enemy_AI_BasicChase.asset
Visual Script Graph Template for Basic Enemy AI

Nodes Structure:
┌─[On Update]────────────────────────────────────────────┐
│  ├─[Find GameObject "Player"]                          │
│  │  └─[Calculate Distance]                             │
│  │    └─[Branch: Distance < Detection Range]           │
│  │      ├─[True: Set State "Chasing"]                 │
│  │      │  └─[Move Towards Player]                     │
│  │      └─[False: Set State "Patrolling"]             │
│  │        └─[Move Between Waypoints]                   │
│  │                                                     │
│  └─[On Collision Enter]                                │
│    └─[Branch: Tag == "Player"]                        │
│      └─[Deal Damage]                                   │
└─────────────────────────────────────────────────────────┘

Variables Required:
- detectionRange (Float): 8.0
- moveSpeed (Float): 3.0
- damage (Int): 10
- currentState (String): "Patrolling"
```

#### 2.3 UI Interaction Script Graph Template

```text
// Assets/_Project/VisualScripting/Templates/SystemTemplates/SG_UI_Menu_MainNavigation.asset
Visual Script Graph Template for Main Menu Navigation

Nodes Structure:
┌─[Button: Play Game]─────────────────────────────────────┐
│  └─[Load Scene "GameLevel"]                            │
│                                                        │
├─[Button: Options]──────────────────────────────────────┤
│  └─[Set Active: OptionsPanel]                         │
│                                                        │
├─[Button: Quit Game]────────────────────────────────────┤
│  └─[Application Quit]                                  │
│                                                        │
└─[On Scene Start]───────────────────────────────────────┤
  └─[Initialize UI State]                               │
    ├─[Set Button Interactable States]                  │
    └─[Play Background Music]                           │
└─────────────────────────────────────────────────────────┘

Variables Required:
- gameSceneName (String): "Level01"
- musicVolume (Float): 0.7
```

### 3. Variable System Configuration

#### 3.1 Graph Variables Setup

```csharp
// Graph Variables Configuration
public class VisualScriptingVariableSetup : MonoBehaviour
{
    [Header("Graph Variable Categories")]
    [SerializeField] private List<GraphVariableCategory> variableCategories;

    [System.Serializable]
    public class GraphVariableCategory
    {
        public string categoryName;
        public List<VariableDefinition> variables;
    }

    [System.Serializable]
    public class VariableDefinition
    {
        public string name;
        public VariableType type;
        public object defaultValue;
        public string description;
    }

    public enum VariableType
    {
        Bool, Int, Float, String, Vector2, Vector3,
        GameObject, Transform, AudioClip, Sprite
    }

    private void Start()
    {
        SetupDefaultVariables();
    }

    private void SetupDefaultVariables()
    {
        try
        {
            // Player Variables
            Variables.Application.Set("PlayerHealth", 100);
            Variables.Application.Set("PlayerMaxHealth", 100);
            Variables.Application.Set("PlayerScore", 0);
            Variables.Application.Set("CurrentLevel", 1);

            // Game State Variables
            Variables.Application.Set("GamePaused", false);
            Variables.Application.Set("GameStarted", false);
            Variables.Application.Set("MenuMusicVolume", 0.7f);
            Variables.Application.Set("SFXVolume", 0.8f);

            // System Variables
            Variables.Application.Set("LastSaveTime", System.DateTime.Now.ToBinary());
            Variables.Application.Set("GraphicsQuality", QualitySettings.GetQualityLevel());

            Debug.Log("[VisualScriptingVariableSetup] Default variables initialized successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VisualScriptingVariableSetup] Failed to initialize variables: {ex.Message}");
        }
    }
}
```

#### 3.2 Variable Scope Management

```csharp
// Variable scope management for Visual Scripting
public class VariableScopeManager : MonoBehaviour
{
    [Header("Variable Scopes")]
    public bool enableApplicationVariables = true;
    public bool enableSceneVariables = true;
    public bool enableObjectVariables = true;
    public bool enableGraphVariables = true;

    [Header("Persistence Settings")]
    public bool persistApplicationVariables = true;
    public bool persistSceneVariables = false;

    private void Awake()
    {
        ConfigureVariableScopes();
    }

    private void ConfigureVariableScopes()
    {
        try
        {
            // Configure Application Variables (Global, persistent)
            if (enableApplicationVariables)
            {
                Variables.Application.Set("AppInitialized", true);
                Variables.Application.Set("SessionStartTime", Time.time);
                Debug.Log("[VariableScopeManager] Application variables configured");
            }

            // Configure Scene Variables (Scene-wide, temporary)
            if (enableSceneVariables)
            {
                Variables.Scene.Set("SceneLoadTime", Time.time);
                Variables.Scene.Set("SceneName", UnityEngine.SceneManagement.SceneManager.GetActiveScene().name);
                Debug.Log("[VariableScopeManager] Scene variables configured");
            }

            // Configure Object Variables (per GameObject)
            if (enableObjectVariables)
            {
                Variables.Object(gameObject).Set("ObjectID", gameObject.GetInstanceID());
                Variables.Object(gameObject).Set("ObjectActive", gameObject.activeInHierarchy);
                Debug.Log("[VariableScopeManager] Object variables configured");
            }

            // Graph Variables are handled per Script Graph asset
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VariableScopeManager] Failed to configure variable scopes: {ex.Message}");
        }
    }

    private void OnApplicationPause(bool pauseStatus)
    {
        if (persistApplicationVariables)
        {
            SaveApplicationVariables();
        }
    }

    private void SaveApplicationVariables()
    {
        try
        {
            // Save critical application variables
            PlayerPrefs.SetInt("PlayerHealth", Variables.Application.Get<int>("PlayerHealth"));
            PlayerPrefs.SetInt("PlayerScore", Variables.Application.Get<int>("PlayerScore"));
            PlayerPrefs.SetInt("CurrentLevel", Variables.Application.Get<int>("CurrentLevel"));
            PlayerPrefs.SetFloat("MusicVolume", Variables.Application.Get<float>("MenuMusicVolume"));
            PlayerPrefs.SetFloat("SFXVolume", Variables.Application.Get<float>("SFXVolume"));
            PlayerPrefs.Save();

            Debug.Log("[VariableScopeManager] Application variables saved");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VariableScopeManager] Failed to save application variables: {ex.Message}");
        }
    }
}
```

### 4. Custom Node Development

#### 4.1 Create Custom Gameplay Nodes

```csharp
// Assets/_Project/VisualScripting/CustomNodes/GameplayNodes/SpawnPickupNode.cs
using Unity.VisualScripting;
using UnityEngine;

[UnitCategory("Custom/Gameplay")]
[UnitTitle("Spawn Pickup")]
[UnitShortTitle("Spawn Pickup")]
public class SpawnPickupNode : Unit
{
    [DoNotSerialize]
    [PortLabelHidden]
    public ControlInput inputTrigger { get; private set; }

    [DoNotSerialize]
    [PortLabelHidden]
    public ControlOutput outputTrigger { get; private set; }

    [DoNotSerialize]
    public ValueInput pickupPrefab { get; private set; }

    [DoNotSerialize]
    public ValueInput spawnPosition { get; private set; }

    [DoNotSerialize]
    public ValueInput pickupType { get; private set; }

    [DoNotSerialize]
    public ValueOutput spawnedObject { get; private set; }

    public enum PickupType { Health, Score, Powerup, Key }

    protected override void Definition()
    {
        inputTrigger = ControlInput(nameof(inputTrigger), Spawn);
        outputTrigger = ControlOutput(nameof(outputTrigger));

        pickupPrefab = ValueInput<GameObject>(nameof(pickupPrefab));
        spawnPosition = ValueInput<Vector3>(nameof(spawnPosition));
        pickupType = ValueInput<PickupType>(nameof(pickupType), PickupType.Health);

        spawnedObject = ValueOutput<GameObject>(nameof(spawnedObject));

        Succession(inputTrigger, outputTrigger);
        Assignment(inputTrigger, spawnedObject);
    }

    private ControlOutput Spawn(Flow flow)
    {
        try
        {
            var prefab = flow.GetValue<GameObject>(pickupPrefab);
            var position = flow.GetValue<Vector3>(spawnPosition);
            var type = flow.GetValue<PickupType>(pickupType);

            if (prefab == null)
            {
                Debug.LogError("[SpawnPickupNode] Pickup prefab cannot be null");
                return outputTrigger;
            }

            var spawned = Object.Instantiate(prefab, position, Quaternion.identity);

            // Configure pickup based on type
            var pickup = spawned.GetComponent<PickupComponent>();
            if (pickup != null)
            {
                pickup.Initialize(type);
            }

            flow.SetValue(spawnedObject, spawned);
            Debug.Log($"[SpawnPickupNode] Successfully spawned {type} pickup at {position}");

            return outputTrigger;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[SpawnPickupNode] Failed to spawn pickup: {ex.Message}");
            return outputTrigger;
        }
    }
}

// Supporting component for pickups
public class PickupComponent : MonoBehaviour
{
    [SerializeField] private SpawnPickupNode.PickupType pickupType;
    [SerializeField] private int value = 10;
    [SerializeField] private AudioClip collectSound;

    public void Initialize(SpawnPickupNode.PickupType type)
    {
        pickupType = type;

        // Configure based on type
        switch (type)
        {
            case SpawnPickupNode.PickupType.Health:
                value = 25;
                break;
            case SpawnPickupNode.PickupType.Score:
                value = 100;
                break;
            case SpawnPickupNode.PickupType.Powerup:
                value = 1;
                break;
            case SpawnPickupNode.PickupType.Key:
                value = 1;
                break;
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            CollectPickup(other.gameObject);
        }
    }

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (other.CompareTag("Player"))
        {
            CollectPickup(other.gameObject);
        }
    }

    private void CollectPickup(GameObject player)
    {
        try
        {
            // Apply pickup effect based on type
            switch (pickupType)
            {
                case SpawnPickupNode.PickupType.Health:
                    var currentHealth = Variables.Application.Get<int>("PlayerHealth");
                    var maxHealth = Variables.Application.Get<int>("PlayerMaxHealth");
                    Variables.Application.Set("PlayerHealth", Mathf.Min(currentHealth + value, maxHealth));
                    break;

                case SpawnPickupNode.PickupType.Score:
                    var currentScore = Variables.Application.Get<int>("PlayerScore");
                    Variables.Application.Set("PlayerScore", currentScore + value);
                    break;

                case SpawnPickupNode.PickupType.Powerup:
                    Variables.Object(player).Set("HasPowerup", true);
                    break;

                case SpawnPickupNode.PickupType.Key:
                    var keys = Variables.Application.Get<int>("KeyCount");
                    Variables.Application.Set("KeyCount", keys + value);
                    break;
            }

            // Play sound effect
            if (collectSound != null)
            {
                AudioSource.PlayClipAtPoint(collectSound, transform.position);
            }

            Debug.Log($"[PickupComponent] Player collected {pickupType} worth {value}");
            Destroy(gameObject);
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[PickupComponent] Failed to collect pickup: {ex.Message}");
        }
    }
}
```

#### 4.2 Create Custom Audio Nodes

```csharp
// Assets/_Project/VisualScripting/CustomNodes/AudioNodes/PlayRandomSFXNode.cs
using Unity.VisualScripting;
using UnityEngine;

[UnitCategory("Custom/Audio")]
[UnitTitle("Play Random SFX")]
[UnitShortTitle("Random SFX")]
public class PlayRandomSFXNode : Unit
{
    [DoNotSerialize]
    [PortLabelHidden]
    public ControlInput inputTrigger { get; private set; }

    [DoNotSerialize]
    [PortLabelHidden]
    public ControlOutput outputTrigger { get; private set; }

    [DoNotSerialize]
    public ValueInput audioClips { get; private set; }

    [DoNotSerialize]
    public ValueInput audioSource { get; private set; }

    [DoNotSerialize]
    public ValueInput volumeRange { get; private set; }

    [DoNotSerialize]
    public ValueInput pitchRange { get; private set; }

    [DoNotSerialize]
    public ValueOutput playedClip { get; private set; }

    protected override void Definition()
    {
        inputTrigger = ControlInput(nameof(inputTrigger), PlayRandomSFX);
        outputTrigger = ControlOutput(nameof(outputTrigger));

        audioClips = ValueInput<AudioClip[]>(nameof(audioClips));
        audioSource = ValueInput<AudioSource>(nameof(audioSource));
        volumeRange = ValueInput<Vector2>(nameof(volumeRange), new Vector2(0.8f, 1.0f));
        pitchRange = ValueInput<Vector2>(nameof(pitchRange), new Vector2(0.9f, 1.1f));

        playedClip = ValueOutput<AudioClip>(nameof(playedClip));

        Succession(inputTrigger, outputTrigger);
        Assignment(inputTrigger, playedClip);
    }

    private ControlOutput PlayRandomSFX(Flow flow)
    {
        try
        {
            var clips = flow.GetValue<AudioClip[]>(audioClips);
            var source = flow.GetValue<AudioSource>(audioSource);
            var volRange = flow.GetValue<Vector2>(volumeRange);
            var pitchRange = flow.GetValue<Vector2>(this.pitchRange);

            if (clips == null || clips.Length == 0)
            {
                Debug.LogWarning("[PlayRandomSFXNode] No audio clips provided");
                return outputTrigger;
            }

            if (source == null)
            {
                Debug.LogError("[PlayRandomSFXNode] AudioSource cannot be null");
                return outputTrigger;
            }

            // Select random clip
            var randomClip = clips[Random.Range(0, clips.Length)];

            // Apply random volume and pitch
            source.clip = randomClip;
            source.volume = Random.Range(volRange.x, volRange.y) * Variables.Application.Get<float>("SFXVolume");
            source.pitch = Random.Range(pitchRange.x, pitchRange.y);

            source.Play();
            flow.SetValue(playedClip, randomClip);

            Debug.Log($"[PlayRandomSFXNode] Playing random SFX: {randomClip.name}");
            return outputTrigger;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[PlayRandomSFXNode] Failed to play random SFX: {ex.Message}");
            return outputTrigger;
        }
    }
}
```

#### 4.3 Create Custom Utility Nodes

```csharp
// Assets/_Project/VisualScripting/CustomNodes/UtilityNodes/DelayedActionNode.cs
using System.Collections;
using Unity.VisualScripting;
using UnityEngine;

[UnitCategory("Custom/Utility")]
[UnitTitle("Delayed Action")]
[UnitShortTitle("Delayed Action")]
public class DelayedActionNode : Unit
{
    [DoNotSerialize]
    [PortLabelHidden]
    public ControlInput inputTrigger { get; private set; }

    [DoNotSerialize]
    [PortLabelHidden]
    public ControlOutput immediateOutput { get; private set; }

    [DoNotSerialize]
    [PortLabelHidden]
    public ControlOutput delayedOutput { get; private set; }

    [DoNotSerialize]
    public ValueInput delay { get; private set; }

    [DoNotSerialize]
    public ValueInput useUnscaledTime { get; private set; }

    protected override void Definition()
    {
        inputTrigger = ControlInput(nameof(inputTrigger), StartDelay);
        immediateOutput = ControlOutput(nameof(immediateOutput));
        delayedOutput = ControlOutput(nameof(delayedOutput));

        delay = ValueInput<float>(nameof(delay), 1.0f);
        useUnscaledTime = ValueInput<bool>(nameof(useUnscaledTime), false);

        Succession(inputTrigger, immediateOutput);
    }

    private ControlOutput StartDelay(Flow flow)
    {
        try
        {
            var delayTime = flow.GetValue<float>(delay);
            var unscaled = flow.GetValue<bool>(useUnscaledTime);

            if (delayTime < 0)
            {
                Debug.LogWarning("[DelayedActionNode] Delay time cannot be negative, using 0");
                delayTime = 0;
            }

            // Start coroutine for delayed execution
            var owner = flow.stack.gameObject;
            if (owner != null)
            {
                var mono = owner.GetComponent<MonoBehaviour>() ?? owner.AddComponent<DelayedActionHelper>();
                mono.StartCoroutine(DelayedExecution(flow, delayTime, unscaled));
            }

            Debug.Log($"[DelayedActionNode] Started delayed action with {delayTime}s delay");
            return immediateOutput;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[DelayedActionNode] Failed to start delayed action: {ex.Message}");
            return immediateOutput;
        }
    }

    private IEnumerator DelayedExecution(Flow flow, float delayTime, bool useUnscaledTime)
    {
        if (useUnscaledTime)
        {
            yield return new WaitForSecondsRealtime(delayTime);
        }
        else
        {
            yield return new WaitForSeconds(delayTime);
        }

        try
        {
            Flow.New(delayedOutput, flow.stack).Run();
            Debug.Log("[DelayedActionNode] Delayed action executed");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[DelayedActionNode] Error executing delayed action: {ex.Message}");
        }
    }
}

// Helper component for delayed actions
public class DelayedActionHelper : MonoBehaviour
{
    // Empty component to provide MonoBehaviour for coroutines
}
```

### 5. State Graph Configuration

#### 5.1 Character State Machine Setup

```text
// Assets/_Project/VisualScripting/StateGraphs/CharacterStates/SM_Player_Combat_States.asset
State Machine for Player Combat System

States:
┌─[Idle State]─────────────────────────────────────────────┐
│  Entry: Reset animation triggers                         │
│  Update: Check for input                                 │
│  Exit: None                                              │
│                                                          │
│  Transitions:                                            │
│  ├─To Attack: Input "Fire1" pressed                     │
│  ├─To Block: Input "Fire2" held                         │
│  └─To Hurt: Health decreased                            │
└──────────────────────────────────────────────────────────┘

┌─[Attack State]───────────────────────────────────────────┐
│  Entry: Play attack animation                           │
│  Update: Handle attack timing                           │
│  Exit: Reset attack flags                               │
│                                                          │
│  Transitions:                                            │
│  ├─To Idle: Animation finished                          │
│  └─To Hurt: Interrupted by damage                       │
└──────────────────────────────────────────────────────────┘

┌─[Block State]────────────────────────────────────────────┐
│  Entry: Activate shield, reduce movement                │
│  Update: Reduce incoming damage by 50%                  │
│  Exit: Restore normal movement                          │
│                                                          │
│  Transitions:                                            │
│  ├─To Idle: Input "Fire2" released                      │
│  └─To Hurt: Shield broken                               │
└──────────────────────────────────────────────────────────┘

┌─[Hurt State]─────────────────────────────────────────────┐
│  Entry: Play hurt animation, invulnerability frames     │
│  Update: Flash sprite, disable input                    │
│  Exit: Restore normal state                             │
│                                                          │
│  Transitions:                                            │
│  ├─To Idle: Animation finished                          │
│  └─To Death: Health <= 0                                │
└──────────────────────────────────────────────────────────┘

Variables:
- playerHealth (Int): Current health
- isInvulnerable (Bool): Immunity to damage
- attackCooldown (Float): Time between attacks
- blockStrength (Float): Damage reduction percentage
```

#### 5.2 Game State Management

```text
// Assets/_Project/VisualScripting/StateGraphs/GameStates/SM_Game_Level_Management.asset
State Machine for Game Level Management

States:
┌─[Loading State]──────────────────────────────────────────┐
│  Entry: Show loading screen, disable player input       │
│  Update: Load level assets, update progress bar         │
│  Exit: Hide loading screen                              │
│                                                          │
│  Transitions:                                            │
│  └─To Playing: Assets loaded and initialized            │
└──────────────────────────────────────────────────────────┘

┌─[Playing State]──────────────────────────────────────────┐
│  Entry: Enable gameplay systems, start background music │
│  Update: Monitor win/lose conditions                    │
│  Exit: Save current progress                            │
│                                                          │
│  Transitions:                                            │
│  ├─To Paused: Pause input detected                      │
│  ├─To GameOver: Player health <= 0                      │
│  └─To Victory: All objectives completed                 │
└──────────────────────────────────────────────────────────┘

┌─[Paused State]───────────────────────────────────────────┐
│  Entry: Pause game time, show pause menu               │
│  Update: Handle pause menu input                        │
│  Exit: Hide pause menu, resume time                     │
│                                                          │
│  Transitions:                                            │
│  ├─To Playing: Resume selected                          │
│  ├─To MainMenu: Quit to menu selected                   │
│  └─To Options: Settings selected                        │
└──────────────────────────────────────────────────────────┘

Variables:
- gameTime (Float): Time elapsed in level
- objectivesCompleted (Int): Completed objectives count
- totalObjectives (Int): Total objectives in level
- isPaused (Bool): Game pause state
```

### 6. Integration with C# Scripts

#### 6.1 C# to Visual Scripting Interface

```csharp
// Assets/_Project/Scripts/VisualScripting/VSIntegrationBridge.cs
using Unity.VisualScripting;
using UnityEngine;

public class VSIntegrationBridge : MonoBehaviour
{
    [Header("Visual Scripting Integration")]
    [SerializeField] private ScriptGraphAsset playerControllerGraph;
    [SerializeField] private ScriptGraphAsset enemyAIGraph;
    [SerializeField] private StateGraphAsset gameStateGraph;

    [Header("C# Component References")]
    [SerializeField] private PlayerController playerController;
    [SerializeField] private GameManager gameManager;
    [SerializeField] private AudioManager audioManager;

    private void Start()
    {
        SetupVisualScriptingBridge();
    }

    private void SetupVisualScriptingBridge()
    {
        try
        {
            // Register C# methods for Visual Scripting access
            CustomEvent.RegisterListener(gameObject, "UpdatePlayerHealth", OnUpdatePlayerHealth);
            CustomEvent.RegisterListener(gameObject, "PlayAudioClip", OnPlayAudioClip);
            CustomEvent.RegisterListener(gameObject, "SaveGameData", OnSaveGameData);
            CustomEvent.RegisterListener(gameObject, "LoadGameData", OnLoadGameData);

            // Initialize shared variables
            Variables.Object(gameObject).Set("BridgeInitialized", true);
            Variables.Object(gameObject).Set("PlayerController", playerController);
            Variables.Object(gameObject).Set("GameManager", gameManager);
            Variables.Object(gameObject).Set("AudioManager", audioManager);

            Debug.Log("[VSIntegrationBridge] Visual Scripting bridge initialized successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSIntegrationBridge] Failed to setup bridge: {ex.Message}");
        }
    }

    private void OnUpdatePlayerHealth(object health)
    {
        try
        {
            if (playerController != null && health is int healthValue)
            {
                playerController.SetHealth(healthValue);
                Variables.Application.Set("PlayerHealth", healthValue);
                Debug.Log($"[VSIntegrationBridge] Player health updated to: {healthValue}");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSIntegrationBridge] Failed to update player health: {ex.Message}");
        }
    }

    private void OnPlayAudioClip(object clipName)
    {
        try
        {
            if (audioManager != null && clipName is string clip)
            {
                audioManager.PlaySFX(clip);
                Debug.Log($"[VSIntegrationBridge] Playing audio clip: {clip}");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSIntegrationBridge] Failed to play audio clip: {ex.Message}");
        }
    }

    private void OnSaveGameData(object saveData)
    {
        try
        {
            if (gameManager != null)
            {
                var playerHealth = Variables.Application.Get<int>("PlayerHealth");
                var playerScore = Variables.Application.Get<int>("PlayerScore");
                var currentLevel = Variables.Application.Get<int>("CurrentLevel");

                gameManager.SaveGame(playerHealth, playerScore, currentLevel);
                Debug.Log("[VSIntegrationBridge] Game data saved successfully");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSIntegrationBridge] Failed to save game data: {ex.Message}");
        }
    }

    private void OnLoadGameData(object loadData)
    {
        try
        {
            if (gameManager != null)
            {
                var saveData = gameManager.LoadGame();
                if (saveData != null)
                {
                    Variables.Application.Set("PlayerHealth", saveData.health);
                    Variables.Application.Set("PlayerScore", saveData.score);
                    Variables.Application.Set("CurrentLevel", saveData.level);
                    Debug.Log("[VSIntegrationBridge] Game data loaded successfully");
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSIntegrationBridge] Failed to load game data: {ex.Message}");
        }
    }

    // Public methods callable from Visual Scripting
    [VisualScriptingCompatible]
    public void TriggerCustomEvent(string eventName, object data = null)
    {
        try
        {
            CustomEvent.Trigger(gameObject, eventName, data);
            Debug.Log($"[VSIntegrationBridge] Custom event triggered: {eventName}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSIntegrationBridge] Failed to trigger custom event: {ex.Message}");
        }
    }

    [VisualScriptingCompatible]
    public T GetComponentReference<T>() where T : Component
    {
        try
        {
            return GetComponent<T>();
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSIntegrationBridge] Failed to get component reference: {ex.Message}");
            return null;
        }
    }
}

// Supporting classes for integration
[System.Serializable]
public class GameSaveData
{
    public int health;
    public int score;
    public int level;
    public string timestamp;
}
```

#### 6.2 Custom Event System for Visual Scripting

```csharp
// Assets/_Project/Scripts/VisualScripting/VSEventSystem.cs
using Unity.VisualScripting;
using UnityEngine;
using System.Collections.Generic;

public class VSEventSystem : MonoBehaviour
{
    [Header("Event Configuration")]
    [SerializeField] private bool enableEventLogging = true;
    [SerializeField] private int maxEventHistory = 100;

    private List<EventRecord> eventHistory = new List<EventRecord>();

    [System.Serializable]
    public class EventRecord
    {
        public string eventName;
        public System.DateTime timestamp;
        public string sourceObject;
        public object eventData;
    }

    public static VSEventSystem Instance { get; private set; }

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            InitializeEventSystem();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void InitializeEventSystem()
    {
        try
        {
            // Register common game events
            RegisterGameEvents();
            Debug.Log("[VSEventSystem] Event system initialized successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSEventSystem] Failed to initialize event system: {ex.Message}");
        }
    }

    private void RegisterGameEvents()
    {
        // Player Events
        EventBus.Register<PlayerHealthChangedEvent>(OnPlayerHealthChanged);
        EventBus.Register<PlayerScoreChangedEvent>(OnPlayerScoreChanged);
        EventBus.Register<PlayerLevelUpEvent>(OnPlayerLevelUp);

        // Game Events
        EventBus.Register<GameStateChangedEvent>(OnGameStateChanged);
        EventBus.Register<LevelCompletedEvent>(OnLevelCompleted);
        EventBus.Register<ItemCollectedEvent>(OnItemCollected);

        // UI Events
        EventBus.Register<MenuOpenedEvent>(OnMenuOpened);
        EventBus.Register<ButtonClickedEvent>(OnButtonClicked);
    }

    // Event handlers that bridge to Visual Scripting
    private void OnPlayerHealthChanged(PlayerHealthChangedEvent evt)
    {
        CustomEvent.Trigger(gameObject, "PlayerHealthChanged", evt.newHealth);
        LogEvent("PlayerHealthChanged", gameObject.name, evt.newHealth);
    }

    private void OnPlayerScoreChanged(PlayerScoreChangedEvent evt)
    {
        CustomEvent.Trigger(gameObject, "PlayerScoreChanged", evt.newScore);
        LogEvent("PlayerScoreChanged", gameObject.name, evt.newScore);
    }

    private void OnPlayerLevelUp(PlayerLevelUpEvent evt)
    {
        CustomEvent.Trigger(gameObject, "PlayerLevelUp", evt.newLevel);
        LogEvent("PlayerLevelUp", gameObject.name, evt.newLevel);
    }

    private void OnGameStateChanged(GameStateChangedEvent evt)
    {
        CustomEvent.Trigger(gameObject, "GameStateChanged", evt.newState.ToString());
        LogEvent("GameStateChanged", gameObject.name, evt.newState);
    }

    private void OnLevelCompleted(LevelCompletedEvent evt)
    {
        CustomEvent.Trigger(gameObject, "LevelCompleted", evt.levelName);
        LogEvent("LevelCompleted", gameObject.name, evt.levelName);
    }

    private void OnItemCollected(ItemCollectedEvent evt)
    {
        CustomEvent.Trigger(gameObject, "ItemCollected", evt.itemName);
        LogEvent("ItemCollected", gameObject.name, evt.itemName);
    }

    private void OnMenuOpened(MenuOpenedEvent evt)
    {
        CustomEvent.Trigger(gameObject, "MenuOpened", evt.menuName);
        LogEvent("MenuOpened", gameObject.name, evt.menuName);
    }

    private void OnButtonClicked(ButtonClickedEvent evt)
    {
        CustomEvent.Trigger(gameObject, "ButtonClicked", evt.buttonName);
        LogEvent("ButtonClicked", gameObject.name, evt.buttonName);
    }

    private void LogEvent(string eventName, string source, object data)
    {
        if (enableEventLogging)
        {
            var record = new EventRecord
            {
                eventName = eventName,
                timestamp = System.DateTime.Now,
                sourceObject = source,
                eventData = data
            };

            eventHistory.Add(record);

            // Limit history size
            if (eventHistory.Count > maxEventHistory)
            {
                eventHistory.RemoveAt(0);
            }

            Debug.Log($"[VSEventSystem] Event logged: {eventName} from {source}");
        }
    }

    // Public methods for Visual Scripting access
    [VisualScriptingCompatible]
    public void TriggerGameEvent(string eventName, object data = null)
    {
        try
        {
            CustomEvent.Trigger(gameObject, eventName, data);
            LogEvent(eventName, "VisualScript", data);
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSEventSystem] Failed to trigger game event: {ex.Message}");
        }
    }

    [VisualScriptingCompatible]
    public List<EventRecord> GetEventHistory()
    {
        return new List<EventRecord>(eventHistory);
    }
}

// Event classes for the event system
public class PlayerHealthChangedEvent
{
    public int newHealth;
    public int previousHealth;
}

public class PlayerScoreChangedEvent
{
    public int newScore;
    public int scoreIncrease;
}

public class PlayerLevelUpEvent
{
    public int newLevel;
    public int previousLevel;
}

public class GameStateChangedEvent
{
    public enum GameState { Menu, Playing, Paused, GameOver, Victory }
    public GameState newState;
    public GameState previousState;
}

public class LevelCompletedEvent
{
    public string levelName;
    public float completionTime;
    public int score;
}

public class ItemCollectedEvent
{
    public string itemName;
    public Vector3 position;
    public int value;
}

public class MenuOpenedEvent
{
    public string menuName;
    public string previousMenu;
}

public class ButtonClickedEvent
{
    public string buttonName;
    public string menuContext;
}
```

### 7. Visual Debugging Tools

#### 7.1 Visual Scripting Debug Panel

```csharp
// Assets/_Project/Scripts/VisualScripting/VSDebugPanel.cs
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.UI;
using System.Collections.Generic;
using System.Linq;

public class VSDebugPanel : MonoBehaviour
{
    [Header("UI References")]
    [SerializeField] private GameObject debugPanel;
    [SerializeField] private Text variableDisplay;
    [SerializeField] private Text graphStateDisplay;
    [SerializeField] private Text eventLogDisplay;
    [SerializeField] private Toggle enableDebugToggle;
    [SerializeField] private Button clearLogButton;

    [Header("Debug Settings")]
    [SerializeField] private bool showAtStartup = false;
    [SerializeField] private KeyCode toggleKey = KeyCode.F12;
    [SerializeField] private float updateInterval = 0.5f;

    private bool isDebugging = false;
    private float lastUpdateTime = 0f;
    private List<string> eventLog = new List<string>();

    private void Start()
    {
        SetupDebugPanel();
    }

    private void Update()
    {
        HandleInput();

        if (isDebugging && Time.time - lastUpdateTime >= updateInterval)
        {
            UpdateDebugDisplay();
            lastUpdateTime = Time.time;
        }
    }

    private void SetupDebugPanel()
    {
        try
        {
            if (debugPanel != null)
            {
                debugPanel.SetActive(showAtStartup);
                isDebugging = showAtStartup;
            }

            if (enableDebugToggle != null)
            {
                enableDebugToggle.isOn = isDebugging;
                enableDebugToggle.onValueChanged.AddListener(OnDebugToggleChanged);
            }

            if (clearLogButton != null)
            {
                clearLogButton.onClick.AddListener(ClearEventLog);
            }

            // Register for Visual Scripting events
            CustomEvent.RegisterListener(gameObject, "VSDebugLog", OnVisualScriptingDebugLog);

            Debug.Log("[VSDebugPanel] Debug panel initialized successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSDebugPanel] Failed to setup debug panel: {ex.Message}");
        }
    }

    private void HandleInput()
    {
        if (Input.GetKeyDown(toggleKey))
        {
            ToggleDebugPanel();
        }
    }

    private void ToggleDebugPanel()
    {
        try
        {
            isDebugging = !isDebugging;

            if (debugPanel != null)
            {
                debugPanel.SetActive(isDebugging);
            }

            if (enableDebugToggle != null)
            {
                enableDebugToggle.isOn = isDebugging;
            }

            Debug.Log($"[VSDebugPanel] Debug panel toggled: {(isDebugging ? "ON" : "OFF")}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSDebugPanel] Failed to toggle debug panel: {ex.Message}");
        }
    }

    private void UpdateDebugDisplay()
    {
        try
        {
            UpdateVariableDisplay();
            UpdateGraphStateDisplay();
            UpdateEventLogDisplay();
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSDebugPanel] Failed to update debug display: {ex.Message}");
        }
    }

    private void UpdateVariableDisplay()
    {
        if (variableDisplay == null) return;

        var displayText = "=== VISUAL SCRIPTING VARIABLES ===\n\n";

        // Application Variables
        displayText += "APPLICATION VARIABLES:\n";
        try
        {
            displayText += $"Player Health: {Variables.Application.Get<int>("PlayerHealth")}\n";
            displayText += $"Player Score: {Variables.Application.Get<int>("PlayerScore")}\n";
            displayText += $"Current Level: {Variables.Application.Get<int>("CurrentLevel")}\n";
            displayText += $"Game Paused: {Variables.Application.Get<bool>("GamePaused")}\n";
            displayText += $"Music Volume: {Variables.Application.Get<float>("MenuMusicVolume"):F2}\n";
        }
        catch (System.Exception ex)
        {
            displayText += $"Error reading application variables: {ex.Message}\n";
        }

        // Scene Variables
        displayText += "\nSCENE VARIABLES:\n";
        try
        {
            displayText += $"Scene Load Time: {Variables.Scene.Get<float>("SceneLoadTime"):F2}\n";
            displayText += $"Scene Name: {Variables.Scene.Get<string>("SceneName")}\n";
        }
        catch (System.Exception ex)
        {
            displayText += $"Error reading scene variables: {ex.Message}\n";
        }

        // Object Variables (for this GameObject)
        displayText += "\nOBJECT VARIABLES:\n";
        try
        {
            displayText += $"Object ID: {Variables.Object(gameObject).Get<int>("ObjectID")}\n";
            displayText += $"Object Active: {Variables.Object(gameObject).Get<bool>("ObjectActive")}\n";
        }
        catch (System.Exception ex)
        {
            displayText += $"Error reading object variables: {ex.Message}\n";
        }

        variableDisplay.text = displayText;
    }

    private void UpdateGraphStateDisplay()
    {
        if (graphStateDisplay == null) return;

        var displayText = "=== SCRIPT GRAPH STATES ===\n\n";

        try
        {
            var scriptMachines = FindObjectsOfType<ScriptMachine>();
            if (scriptMachines != null && scriptMachines.Length > 0)
            {
                foreach (var machine in scriptMachines)
                {
                    if (machine != null && machine.graph != null)
                    {
                        displayText += $"Graph: {machine.graph.name}\n";
                        displayText += $"  Object: {machine.gameObject.name}\n";
                        displayText += $"  Enabled: {machine.enabled}\n";
                        displayText += $"  Active: {machine.gameObject.activeInHierarchy}\n\n";
                    }
                }
            }
            else
            {
                displayText += "No Script Machines found in scene.\n";
            }

            var stateMachines = FindObjectsOfType<StateMachine>();
            if (stateMachines != null && stateMachines.Length > 0)
            {
                displayText += "STATE MACHINES:\n";
                foreach (var stateMachine in stateMachines)
                {
                    if (stateMachine != null && stateMachine.graph != null)
                    {
                        displayText += $"State Machine: {stateMachine.graph.name}\n";
                        displayText += $"  Object: {stateMachine.gameObject.name}\n";
                        displayText += $"  Enabled: {stateMachine.enabled}\n\n";
                    }
                }
            }
        }
        catch (System.Exception ex)
        {
            displayText += $"Error reading graph states: {ex.Message}\n";
        }

        graphStateDisplay.text = displayText;
    }

    private void UpdateEventLogDisplay()
    {
        if (eventLogDisplay == null) return;

        var displayText = "=== EVENT LOG ===\n\n";

        try
        {
            if (eventLog.Count > 0)
            {
                var recentEvents = eventLog.TakeLast(10).ToList();
                foreach (var logEntry in recentEvents)
                {
                    displayText += logEntry + "\n";
                }
            }
            else
            {
                displayText += "No events logged yet.\n";
            }
        }
        catch (System.Exception ex)
        {
            displayText += $"Error reading event log: {ex.Message}\n";
        }

        eventLogDisplay.text = displayText;
    }

    private void OnDebugToggleChanged(bool enabled)
    {
        isDebugging = enabled;
        if (debugPanel != null)
        {
            debugPanel.SetActive(enabled);
        }
    }

    private void ClearEventLog()
    {
        try
        {
            eventLog.Clear();
            UpdateEventLogDisplay();
            Debug.Log("[VSDebugPanel] Event log cleared");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSDebugPanel] Failed to clear event log: {ex.Message}");
        }
    }

    private void OnVisualScriptingDebugLog(object logData)
    {
        try
        {
            var timestamp = System.DateTime.Now.ToString("HH:mm:ss");
            var logEntry = $"[{timestamp}] {logData}";
            eventLog.Add(logEntry);

            // Limit log size
            if (eventLog.Count > 50)
            {
                eventLog.RemoveAt(0);
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSDebugPanel] Failed to log VS debug data: {ex.Message}");
        }
    }

    // Public methods for Visual Scripting access
    [VisualScriptingCompatible]
    public void LogDebugMessage(string message)
    {
        OnVisualScriptingDebugLog(message);
    }

    [VisualScriptingCompatible]
    public void SetVariableValue(string variableName, object value)
    {
        try
        {
            Variables.Application.Set(variableName, value);
            LogDebugMessage($"Variable set: {variableName} = {value}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSDebugPanel] Failed to set variable: {ex.Message}");
        }
    }
}
```

### 8. Performance Optimization for Visual Scripting

#### 8.1 Mobile Performance Settings

[[LLM: Apply mobile optimizations only if target_platform includes mobile devices. Adapt settings based on performance_profile (High/Medium/Low).]]

```csharp
// Assets/_Project/Scripts/VisualScripting/VSPerformanceOptimizer.cs
using Unity.VisualScripting;
using UnityEngine;
using System.Collections.Generic;

public class VSPerformanceOptimizer : MonoBehaviour
{
    [Header("Performance Settings")]
    [SerializeField] private bool enableOptimizations = true;
    [SerializeField] private int maxScriptMachinesPerFrame = 10;
    [SerializeField] private float updateThrottleInterval = 0.016f; // 60 FPS target
    [SerializeField] private bool poolGraphInstances = true;

    [Header("Mobile Specific")]
    [SerializeField] private bool isMobileBuild = false;
    [SerializeField] private int mobileMaxConcurrentGraphs = 5;
    [SerializeField] private float mobileUpdateInterval = 0.033f; // 30 FPS for mobile

    [Header("Monitoring")]
    [SerializeField] private bool enablePerformanceLogging = false;
    [SerializeField] private float logInterval = 5.0f;

    private float lastUpdateTime = 0f;
    private float lastLogTime = 0f;
    private int frameUpdateCount = 0;
    private List<ScriptMachine> managedMachines = new List<ScriptMachine>();
    private Queue<ScriptMachine> updateQueue = new Queue<ScriptMachine>();

    private void Start()
    {
        InitializeOptimizations();
    }

    private void Update()
    {
        if (enableOptimizations)
        {
            ManageScriptMachineUpdates();
        }

        if (enablePerformanceLogging && Time.time - lastLogTime >= logInterval)
        {
            LogPerformanceMetrics();
            lastLogTime = Time.time;
        }
    }

    private void InitializeOptimizations()
    {
        try
        {
            // Detect mobile platform
            isMobileBuild = Application.isMobilePlatform;

            if (isMobileBuild)
            {
                maxScriptMachinesPerFrame = mobileMaxConcurrentGraphs;
                updateThrottleInterval = mobileUpdateInterval;
                Debug.Log("[VSPerformanceOptimizer] Mobile optimizations applied");
            }

            // Find all Script Machines in scene
            RefreshManagedMachines();

            // Apply initial optimizations
            ApplyGraphOptimizations();

            Debug.Log($"[VSPerformanceOptimizer] Initialized with {managedMachines.Count} Script Machines");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceOptimizer] Failed to initialize optimizations: {ex.Message}");
        }
    }

    private void RefreshManagedMachines()
    {
        try
        {
            managedMachines.Clear();
            var allMachines = FindObjectsOfType<ScriptMachine>();

            foreach (var machine in allMachines)
            {
                if (machine != null && machine.graph != null)
                {
                    managedMachines.Add(machine);
                    updateQueue.Enqueue(machine);
                }
            }

            Debug.Log($"[VSPerformanceOptimizer] Found {managedMachines.Count} Script Machines to manage");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceOptimizer] Failed to refresh managed machines: {ex.Message}");
        }
    }

    private void ApplyGraphOptimizations()
    {
        try
        {
            foreach (var machine in managedMachines)
            {
                if (machine != null)
                {
                    // Optimize based on distance from camera
                    var camera = Camera.main;
                    if (camera != null)
                    {
                        var distance = Vector3.Distance(machine.transform.position, camera.transform.position);

                        // Reduce update frequency for distant objects
                        if (distance > 50f && isMobileBuild)
                        {
                            // Disable non-essential Visual Scripting on distant objects
                            var graphReference = machine.GetComponent<Variables>();
                            if (graphReference != null)
                            {
                                Variables.Object(machine.gameObject).Set("VSOptimized", true);
                                Variables.Object(machine.gameObject).Set("VSUpdateInterval", mobileUpdateInterval * 2f);
                            }
                        }
                    }
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceOptimizer] Failed to apply graph optimizations: {ex.Message}");
        }
    }

    private void ManageScriptMachineUpdates()
    {
        try
        {
            if (Time.time - lastUpdateTime < updateThrottleInterval)
                return;

            var updatesThisFrame = 0;
            var maxUpdates = isMobileBuild ? mobileMaxConcurrentGraphs : maxScriptMachinesPerFrame;

            while (updateQueue.Count > 0 && updatesThisFrame < maxUpdates)
            {
                var machine = updateQueue.Dequeue();

                if (machine != null && machine.enabled && machine.gameObject.activeInHierarchy)
                {
                    // Check if this machine needs optimization
                    var shouldUpdate = ShouldUpdateMachine(machine);

                    if (shouldUpdate)
                    {
                        // Machine will update naturally, just count it
                        updatesThisFrame++;
                        frameUpdateCount++;
                    }

                    // Re-queue for next cycle
                    updateQueue.Enqueue(machine);
                }

                if (updatesThisFrame >= maxUpdates)
                    break;
            }

            lastUpdateTime = Time.time;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceOptimizer] Failed to manage script machine updates: {ex.Message}");
        }
    }

    private bool ShouldUpdateMachine(ScriptMachine machine)
    {
        try
        {
            if (machine == null || !machine.enabled)
                return false;

            // Check if machine is optimized
            var variables = Variables.Object(machine.gameObject);
            if (variables.IsDefined("VSOptimized") && variables.Get<bool>("VSOptimized"))
            {
                var customInterval = variables.Get<float>("VSUpdateInterval");
                var lastUpdate = variables.IsDefined("VSLastUpdate") ? variables.Get<float>("VSLastUpdate") : 0f;

                if (Time.time - lastUpdate < customInterval)
                    return false;

                variables.Set("VSLastUpdate", Time.time);
            }

            // Check distance-based optimization
            var camera = Camera.main;
            if (camera != null && isMobileBuild)
            {
                var distance = Vector3.Distance(machine.transform.position, camera.transform.position);

                // Skip updates for very distant objects
                if (distance > 100f)
                    return false;

                // Reduce update frequency for moderately distant objects
                if (distance > 25f && Random.Range(0f, 1f) > 0.5f)
                    return false;
            }

            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceOptimizer] Error checking if machine should update: {ex.Message}");
            return true; // Default to allowing update
        }
    }

    private void LogPerformanceMetrics()
    {
        try
        {
            var activeMachines = managedMachines.Count(m => m != null && m.enabled && m.gameObject.activeInHierarchy);
            var averageFrameTime = Time.deltaTime * 1000f;
            var updatesPerSecond = frameUpdateCount / logInterval;

            Debug.Log($"[VSPerformanceOptimizer] Performance Metrics:");
            Debug.Log($"  Active Script Machines: {activeMachines}/{managedMachines.Count}");
            Debug.Log($"  Average Frame Time: {averageFrameTime:F2}ms");
            Debug.Log($"  VS Updates Per Second: {updatesPerSecond:F1}");
            Debug.Log($"  Mobile Build: {isMobileBuild}");

            // Reset counter
            frameUpdateCount = 0;

            // Warn if performance is poor
            if (averageFrameTime > (isMobileBuild ? 33.3f : 16.67f))
            {
                Debug.LogWarning($"[VSPerformanceOptimizer] Frame time exceeding target ({averageFrameTime:F2}ms)");

                if (activeMachines > (isMobileBuild ? mobileMaxConcurrentGraphs : maxScriptMachinesPerFrame))
                {
                    Debug.LogWarning($"[VSPerformanceOptimizer] Too many active Script Machines for target platform");
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceOptimizer] Failed to log performance metrics: {ex.Message}");
        }
    }

    // Public methods for runtime optimization control
    [VisualScriptingCompatible]
    public void OptimizeMachine(ScriptMachine machine, float updateInterval = 0.1f)
    {
        try
        {
            if (machine != null)
            {
                Variables.Object(machine.gameObject).Set("VSOptimized", true);
                Variables.Object(machine.gameObject).Set("VSUpdateInterval", updateInterval);
                Debug.Log($"[VSPerformanceOptimizer] Optimized machine: {machine.gameObject.name}");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceOptimizer] Failed to optimize machine: {ex.Message}");
        }
    }

    [VisualScriptingCompatible]
    public void RefreshOptimizations()
    {
        RefreshManagedMachines();
        ApplyGraphOptimizations();
    }
}
```

### 9. Timeline Integration for Visual Scripting

#### 9.1 Visual Scripting Timeline Track

```csharp
// Assets/_Project/Scripts/VisualScripting/Timeline/VisualScriptingTrack.cs
using UnityEngine;
using UnityEngine.Playables;
using UnityEngine.Timeline;
using Unity.VisualScripting;

[TrackColor(0.53f, 0.0f, 0.08f)]
[TrackClipType(typeof(VisualScriptingClip))]
[TrackBindingType(typeof(ScriptMachine))]
public class VisualScriptingTrack : TrackAsset
{
    public override Playable CreateTrackMixer(PlayableGraph graph, GameObject go, int inputCount)
    {
        return ScriptPlayable<VisualScriptingMixerBehaviour>.Create(graph, inputCount);
    }
}

[System.Serializable]
public class VisualScriptingClip : PlayableAsset
{
    [Header("Visual Scripting Configuration")]
    public ScriptGraphAsset scriptGraph;
    public string triggerEventName = "TimelineStart";
    public bool pauseScriptOnExit = true;

    [Header("Variables")]
    public List<TimelineVariableBinding> variableBindings = new List<TimelineVariableBinding>();

    public override Playable CreatePlayable(PlayableGraph graph, GameObject owner)
    {
        var playable = ScriptPlayable<VisualScriptingBehaviour>.Create(graph);
        var behaviour = playable.GetBehaviour();

        behaviour.scriptGraph = scriptGraph;
        behaviour.triggerEventName = triggerEventName;
        behaviour.pauseScriptOnExit = pauseScriptOnExit;
        behaviour.variableBindings = variableBindings;

        return playable;
    }
}

[System.Serializable]
public class TimelineVariableBinding
{
    public string variableName;
    public VariableKind scope = VariableKind.Graph;
    public object value;
    public bool setOnEnter = true;
    public bool setOnExit = false;
    public object exitValue;
}

public class VisualScriptingBehaviour : PlayableBehaviour
{
    [System.NonSerialized]
    public ScriptGraphAsset scriptGraph;

    [System.NonSerialized]
    public string triggerEventName;

    [System.NonSerialized]
    public bool pauseScriptOnExit;

    [System.NonSerialized]
    public List<TimelineVariableBinding> variableBindings;

    private bool hasTriggeredEnter = false;
    private ScriptMachine targetMachine;

    public override void OnBehaviourPlay(Playable playable, FrameData info)
    {
        try
        {
            if (!hasTriggeredEnter)
            {
                // Find the bound Script Machine
                var director = info.output.GetUserData() as PlayableDirector;
                if (director != null)
                {
                    targetMachine = director.GetGenericBinding(playable.GetOutput(0).GetSourcePlayable().GetOutput(0).sourceOutputPort) as ScriptMachine;
                }

                if (targetMachine != null)
                {
                    // Set variables on enter
                    SetVariables(true);

                    // Trigger enter event
                    if (!string.IsNullOrEmpty(triggerEventName))
                    {
                        CustomEvent.Trigger(targetMachine.gameObject, triggerEventName);
                    }

                    // Replace graph if specified
                    if (scriptGraph != null)
                    {
                        targetMachine.graph = scriptGraph;
                    }

                    Debug.Log($"[VisualScriptingBehaviour] Started Visual Scripting clip on {targetMachine.gameObject.name}");
                }

                hasTriggeredEnter = true;
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VisualScriptingBehaviour] Error on behaviour play: {ex.Message}");
        }
    }

    public override void OnBehaviourPause(Playable playable, FrameData info)
    {
        try
        {
            if (hasTriggeredEnter && targetMachine != null)
            {
                // Set exit variables
                SetVariables(false);

                // Trigger exit event
                if (!string.IsNullOrEmpty(triggerEventName))
                {
                    CustomEvent.Trigger(targetMachine.gameObject, triggerEventName + "Exit");
                }

                // Pause script if specified
                if (pauseScriptOnExit)
                {
                    targetMachine.enabled = false;
                }

                Debug.Log($"[VisualScriptingBehaviour] Paused Visual Scripting clip on {targetMachine.gameObject.name}");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VisualScriptingBehaviour] Error on behaviour pause: {ex.Message}");
        }
    }

    private void SetVariables(bool isEnter)
    {
        if (variableBindings == null || targetMachine == null)
            return;

        try
        {
            foreach (var binding in variableBindings)
            {
                if ((isEnter && binding.setOnEnter) || (!isEnter && binding.setOnExit))
                {
                    var valueToSet = isEnter ? binding.value : binding.exitValue;

                    switch (binding.scope)
                    {
                        case VariableKind.Application:
                            Variables.Application.Set(binding.variableName, valueToSet);
                            break;
                        case VariableKind.Scene:
                            Variables.Scene.Set(binding.variableName, valueToSet);
                            break;
                        case VariableKind.Object:
                            Variables.Object(targetMachine.gameObject).Set(binding.variableName, valueToSet);
                            break;
                        case VariableKind.Graph:
                            if (targetMachine.graph != null)
                            {
                                Variables.Graph(targetMachine.graph).Set(binding.variableName, valueToSet);
                            }
                            break;
                    }

                    Debug.Log($"[VisualScriptingBehaviour] Set {binding.scope} variable {binding.variableName} = {valueToSet}");
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VisualScriptingBehaviour] Error setting variables: {ex.Message}");
        }
    }
}

public class VisualScriptingMixerBehaviour : PlayableBehaviour
{
    // Mixer handles multiple Visual Scripting clips
    public override void ProcessFrame(Playable playable, FrameData info, object playerData)
    {
        try
        {
            var targetMachine = playerData as ScriptMachine;
            if (targetMachine == null)
                return;

            int inputCount = playable.GetInputCount();

            for (int i = 0; i < inputCount; i++)
            {
                var weight = playable.GetInputWeight(i);
                var inputPlayable = (ScriptPlayable<VisualScriptingBehaviour>)playable.GetInput(i);

                if (weight > 0.001f)
                {
                    // This clip is active
                    var behaviour = inputPlayable.GetBehaviour();
                    if (behaviour != null)
                    {
                        // Handle mixing if needed
                        // For now, we'll just ensure the most recent clip takes precedence
                    }
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VisualScriptingMixerBehaviour] Error processing frame: {ex.Message}");
        }
    }
}
```

### 10. Testing and Validation

#### 10.1 Visual Scripting Integration Tests

```csharp
// Assets/_Project/Tests/VisualScripting/VisualScriptingIntegrationTests.cs
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Unity.VisualScripting;
using System.Collections;

[TestFixture]
public class VisualScriptingIntegrationTests
{
    private GameObject testObject;
    private ScriptMachine scriptMachine;

    [SetUp]
    public void Setup()
    {
        testObject = new GameObject("TestObject");
        scriptMachine = testObject.AddComponent<ScriptMachine>();
    }

    [TearDown]
    public void TearDown()
    {
        if (testObject != null)
        {
            Object.DestroyImmediate(testObject);
        }
    }

    [Test]
    public void VisualScripting_DirectoryStructure_ExistsCorrectly()
    {
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/VisualScripting"));
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/VisualScripting/ScriptGraphs"));
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/VisualScripting/StateGraphs"));
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/VisualScripting/CustomNodes"));
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/VisualScripting/Variables"));
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/VisualScripting/Templates"));
    }

    [Test]
    public void VisualScripting_Variables_WorkCorrectly()
    {
        // Test Application Variables
        Variables.Application.Set("TestVar", 42);
        Assert.AreEqual(42, Variables.Application.Get<int>("TestVar"));

        // Test Scene Variables
        Variables.Scene.Set("SceneTestVar", "Hello World");
        Assert.AreEqual("Hello World", Variables.Scene.Get<string>("SceneTestVar"));

        // Test Object Variables
        Variables.Object(testObject).Set("ObjectTestVar", true);
        Assert.AreEqual(true, Variables.Object(testObject).Get<bool>("ObjectTestVar"));
    }

    [UnityTest]
    public IEnumerator VisualScripting_CustomEvents_TriggerCorrectly()
    {
        bool eventTriggered = false;

        CustomEvent.RegisterListener(testObject, "TestEvent", (data) => {
            eventTriggered = true;
        });

        CustomEvent.Trigger(testObject, "TestEvent");

        yield return new WaitForSeconds(0.1f);

        Assert.IsTrue(eventTriggered);
    }

    [Test]
    public void VisualScripting_ScriptMachine_InitializesCorrectly()
    {
        Assert.IsNotNull(scriptMachine);
        Assert.IsTrue(scriptMachine.enabled);
        Assert.AreEqual(testObject, scriptMachine.gameObject);
    }

    [UnityTest]
    public IEnumerator VisualScripting_PerformanceOptimizer_WorksCorrectly()
    {
        var optimizer = testObject.AddComponent<VSPerformanceOptimizer>();

        yield return new WaitForSeconds(0.1f);

        Assert.IsNotNull(optimizer);
        Assert.IsTrue(optimizer.enabled);
    }

    [Test]
    public void VisualScripting_CustomNodes_CanBeInstantiated()
    {
        // Test SpawnPickupNode
        var spawnNode = new SpawnPickupNode();
        Assert.IsNotNull(spawnNode);

        // Test PlayRandomSFXNode
        var audioNode = new PlayRandomSFXNode();
        Assert.IsNotNull(audioNode);

        // Test DelayedActionNode
        var delayNode = new DelayedActionNode();
        Assert.IsNotNull(delayNode);
    }

    [Test]
    public void VisualScripting_EventSystem_InitializesCorrectly()
    {
        var eventSystem = testObject.AddComponent<VSEventSystem>();
        Assert.IsNotNull(eventSystem);
        Assert.IsTrue(eventSystem.enabled);
    }

    [Test]
    public void VisualScripting_DebugPanel_CanBeCreated()
    {
        var debugPanel = testObject.AddComponent<VSDebugPanel>();
        Assert.IsNotNull(debugPanel);
        Assert.IsTrue(debugPanel.enabled);
    }

    [Test]
    public void VisualScripting_IntegrationBridge_WorksCorrectly()
    {
        var bridge = testObject.AddComponent<VSIntegrationBridge>();
        Assert.IsNotNull(bridge);
        Assert.IsTrue(bridge.enabled);
    }

    [UnityTest]
    public IEnumerator VisualScripting_VariableManager_PersistsData()
    {
        var variableManager = testObject.AddComponent<VisualScriptingVariableSetup>();

        yield return new WaitForSeconds(0.1f);

        // Check if default variables were set
        Assert.AreEqual(100, Variables.Application.Get<int>("PlayerHealth"));
        Assert.AreEqual(0, Variables.Application.Get<int>("PlayerScore"));
        Assert.AreEqual(1, Variables.Application.Get<int>("CurrentLevel"));
    }
}
```

#### 10.2 Performance Validation

[[LLM: Customize performance thresholds based on target_platform. Mobile: 5 active graphs, 33ms frame time. Desktop: 15 active graphs, 16.67ms frame time. Console: 10 active graphs, 16.67ms frame time.]]

```csharp
// Assets/_Project/Scripts/VisualScripting/VSPerformanceValidator.cs
using UnityEngine;
using Unity.VisualScripting;
using System.Collections.Generic;
using System.Linq;

public class VSPerformanceValidator : MonoBehaviour
{
    [Header("Performance Thresholds")]
    [SerializeField] private float maxFrameTime = 16.67f; // 60 FPS target
    [SerializeField] private int maxActiveScriptMachines = 15;
    [SerializeField] private int maxActiveStateMachines = 10;
    [SerializeField] private bool enableDetailedLogging = false;

    [Header("Mobile Specific")]
    [SerializeField] private bool isMobilePlatform = false;
    [SerializeField] private float mobileMaxFrameTime = 33.33f; // 30 FPS for mobile
    [SerializeField] private int mobileMaxActiveGraphs = 5;

    [Header("Memory Monitoring")]
    [SerializeField] private float maxMemoryUsageMB = 50f;
    [SerializeField] private bool enableMemoryProfiling = true;

    private float lastValidationTime = 0f;
    private const float VALIDATION_INTERVAL = 1.0f;
    private List<PerformanceIssue> detectedIssues = new List<PerformanceIssue>();

    [System.Serializable]
    public class PerformanceIssue
    {
        public string issueType;
        public string description;
        public string recommendation;
        public System.DateTime timestamp;
        public float severity; // 0-1, where 1 is critical
    }

    private void Start()
    {
        InitializeValidator();
    }

    private void Update()
    {
        if (Time.time - lastValidationTime >= VALIDATION_INTERVAL)
        {
            ValidatePerformance();
            lastValidationTime = Time.time;
        }
    }

    private void InitializeValidator()
    {
        try
        {
            // Detect platform
            isMobilePlatform = Application.isMobilePlatform;

            if (isMobilePlatform)
            {
                maxFrameTime = mobileMaxFrameTime;
                maxActiveScriptMachines = mobileMaxActiveGraphs;
                maxActiveStateMachines = mobileMaxActiveGraphs;
                Debug.Log("[VSPerformanceValidator] Mobile platform detected, using mobile thresholds");
            }

            Debug.Log($"[VSPerformanceValidator] Initialized with thresholds:");
            Debug.Log($"  Max Frame Time: {maxFrameTime}ms");
            Debug.Log($"  Max Script Machines: {maxActiveScriptMachines}");
            Debug.Log($"  Max State Machines: {maxActiveStateMachines}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceValidator] Failed to initialize: {ex.Message}");
        }
    }

    public bool ValidatePerformance()
    {
        try
        {
            detectedIssues.Clear();
            bool performanceAcceptable = true;

            // Validate frame time
            performanceAcceptable &= ValidateFrameTime();

            // Validate Script Machine count
            performanceAcceptable &= ValidateScriptMachines();

            // Validate State Machine count
            performanceAcceptable &= ValidateStateMachines();

            // Validate memory usage
            if (enableMemoryProfiling)
            {
                performanceAcceptable &= ValidateMemoryUsage();
            }

            // Log results
            if (enableDetailedLogging || !performanceAcceptable)
            {
                LogValidationResults(performanceAcceptable);
            }

            return performanceAcceptable;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceValidator] Validation failed: {ex.Message}");
            return false;
        }
    }

    private bool ValidateFrameTime()
    {
        try
        {
            float currentFrameTime = Time.deltaTime * 1000f;

            if (currentFrameTime > maxFrameTime)
            {
                var issue = new PerformanceIssue
                {
                    issueType = "Frame Time",
                    description = $"Frame time exceeded: {currentFrameTime:F2}ms (max: {maxFrameTime}ms)",
                    recommendation = "Reduce Visual Scripting complexity or enable performance optimizations",
                    timestamp = System.DateTime.Now,
                    severity = Mathf.Clamp01((currentFrameTime - maxFrameTime) / maxFrameTime)
                };
                detectedIssues.Add(issue);
                return false;
            }

            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceValidator] Frame time validation failed: {ex.Message}");
            return false;
        }
    }

    private bool ValidateScriptMachines()
    {
        try
        {
            var scriptMachines = FindObjectsOfType<ScriptMachine>();
            var activeCount = scriptMachines?.Count(sm => sm != null && sm.enabled && sm.gameObject.activeInHierarchy) ?? 0;

            if (activeCount > maxActiveScriptMachines)
            {
                var issue = new PerformanceIssue
                {
                    issueType = "Script Machine Count",
                    description = $"Too many active Script Machines: {activeCount}/{maxActiveScriptMachines}",
                    recommendation = "Disable unnecessary Script Machines or use object pooling",
                    timestamp = System.DateTime.Now,
                    severity = Mathf.Clamp01((float)(activeCount - maxActiveScriptMachines) / maxActiveScriptMachines)
                };
                detectedIssues.Add(issue);
                return false;
            }

            if (enableDetailedLogging)
            {
                Debug.Log($"[VSPerformanceValidator] Script Machines: {activeCount}/{maxActiveScriptMachines} active");
            }

            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceValidator] Script Machine validation failed: {ex.Message}");
            return false;
        }
    }

    private bool ValidateStateMachines()
    {
        try
        {
            var stateMachines = FindObjectsOfType<StateMachine>();
            var activeCount = stateMachines?.Count(sm => sm != null && sm.enabled && sm.gameObject.activeInHierarchy) ?? 0;

            if (activeCount > maxActiveStateMachines)
            {
                var issue = new PerformanceIssue
                {
                    issueType = "State Machine Count",
                    description = $"Too many active State Machines: {activeCount}/{maxActiveStateMachines}",
                    recommendation = "Disable unnecessary State Machines or combine simple states",
                    timestamp = System.DateTime.Now,
                    severity = Mathf.Clamp01((float)(activeCount - maxActiveStateMachines) / maxActiveStateMachines)
                };
                detectedIssues.Add(issue);
                return false;
            }

            if (enableDetailedLogging)
            {
                Debug.Log($"[VSPerformanceValidator] State Machines: {activeCount}/{maxActiveStateMachines} active");
            }

            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceValidator] State Machine validation failed: {ex.Message}");
            return false;
        }
    }

    private bool ValidateMemoryUsage()
    {
        try
        {
            // Estimate Visual Scripting memory usage
            long totalMemory = System.GC.GetTotalMemory(false);
            float memoryMB = totalMemory / (1024f * 1024f);

            if (memoryMB > maxMemoryUsageMB)
            {
                var issue = new PerformanceIssue
                {
                    issueType = "Memory Usage",
                    description = $"High memory usage: {memoryMB:F1}MB (max: {maxMemoryUsageMB}MB)",
                    recommendation = "Clear unused variables or reduce graph complexity",
                    timestamp = System.DateTime.Now,
                    severity = Mathf.Clamp01((memoryMB - maxMemoryUsageMB) / maxMemoryUsageMB)
                };
                detectedIssues.Add(issue);
                return false;
            }

            if (enableDetailedLogging)
            {
                Debug.Log($"[VSPerformanceValidator] Memory Usage: {memoryMB:F1}/{maxMemoryUsageMB}MB");
            }

            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceValidator] Memory validation failed: {ex.Message}");
            return false;
        }
    }

    private void LogValidationResults(bool performanceAcceptable)
    {
        try
        {
            if (performanceAcceptable)
            {
                Debug.Log("[VSPerformanceValidator] Performance validation PASSED");
            }
            else
            {
                Debug.LogWarning($"[VSPerformanceValidator] Performance validation FAILED with {detectedIssues.Count} issues:");

                foreach (var issue in detectedIssues)
                {
                    var logLevel = issue.severity > 0.7f ? "ERROR" : "WARNING";
                    Debug.LogWarning($"  [{logLevel}] {issue.issueType}: {issue.description}");
                    Debug.LogWarning($"    Recommendation: {issue.recommendation}");
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[VSPerformanceValidator] Failed to log validation results: {ex.Message}");
        }
    }

    // Public methods for external access
    public List<PerformanceIssue> GetDetectedIssues()
    {
        return new List<PerformanceIssue>(detectedIssues);
    }

    public bool IsPerformanceAcceptable()
    {
        return ValidatePerformance();
    }

    public void SetMobileOptimizations(bool enabled)
    {
        if (enabled)
        {
            maxFrameTime = mobileMaxFrameTime;
            maxActiveScriptMachines = mobileMaxActiveGraphs;
            maxActiveStateMachines = mobileMaxActiveGraphs;
            Debug.Log("[VSPerformanceValidator] Mobile optimizations enabled");
        }
        else
        {
            maxFrameTime = 16.67f;
            maxActiveScriptMachines = 15;
            maxActiveStateMachines = 10;
            Debug.Log("[VSPerformanceValidator] Desktop optimizations enabled");
        }
    }
}
```

### 11. Documentation and Integration

#### 11.1 Generate Visual Scripting API Reference

Create `docs/package-integration/visual-scripting-system.md`:

````markdown
# Unity Visual Scripting Integration Guide

## Quick Start for Non-Programmers

### Creating Your First Script Graph

1. **Right-click in Project window** → Create → Visual Scripting → Script Graph
2. **Name it** using the convention: `SG_[Category]_[Object]_[Function]`
   - Example: `SG_Player_Movement_2D`
3. **Double-click** to open in Visual Scripting window
4. **Add nodes** by right-clicking and searching for what you need

### Basic Player Movement (2D)

```text
Visual Flow:
[On Update] → [Input Get Axis "Horizontal"] → [Multiply by Speed] → [Set Velocity X]
           → [Input Get Button Down "Jump"] → [Add Force Y]
```
````

**Step by step:**

1. Add "On Update" event (Events > Lifecycle)
2. Add "Input Get Axis" node (Input > Input)
3. Set Axis Name to "Horizontal"
4. Add "Multiply" node (Math > Scalar)
5. Connect Input value to first input, create Speed variable for second
6. Add "Set Velocity" node (Physics 2D > Rigidbody 2D)

### Basic Enemy AI

```text
Visual Flow:
[On Update] → [Find GameObject "Player"] → [Calculate Distance]
           → [Branch: Distance < 10] → [True: Move Towards Player]
                                    → [False: Patrol]
```

### UI Button Interactions

```text
Visual Flow:
[Button OnClick] → [Load Scene] with scene name "Level1"
                → [Play Audio Clip] with button click sound
```

## Variable System

### Variable Scopes

1. **Application Variables** - Global, persist between scenes

   - Use for: Player health, score, settings
   - Access: Variables.Application

2. **Scene Variables** - Scene-wide, reset when scene changes

   - Use for: Current level state, temporary flags
   - Access: Variables.Scene

3. **Object Variables** - Per GameObject

   - Use for: Individual enemy health, pickup values
   - Access: Variables.Object

4. **Graph Variables** - Per Script Graph asset
   - Use for: Graph-specific settings, local state
   - Access: Variables.Graph

### Creating Variables

**In Visual Scripting Graph:**

1. Open Blackboard (Variables tab)
2. Click "+" to add variable
3. Set name, type, and default value
4. Drag to graph to create Get/Set nodes

**Common Variable Types:**

- Bool: true/false values
- Int: Whole numbers (health, score)
- Float: Decimal numbers (speed, time)
- String: Text (player name, level name)
- Vector2/3: Positions, directions
- GameObject: References to objects
- AudioClip: Sound effects and music

## State Machines

### Creating Character States

1. **Create State Graph** → Right-click → Create → Visual Scripting → State Graph
2. **Add States** → Right-click in graph → Create State
3. **Name states** clearly: Idle, Moving, Jumping, Attacking
4. **Add Transitions** → Right-click between states → Add Transition

### State Structure

**Each State has:**

- **Entry**: Runs once when entering state
- **Update**: Runs every frame while in state
- **Exit**: Runs once when leaving state

**Example Player States:**

```text
Idle State:
  Entry: Stop movement, play idle animation
  Update: Check for input
  Exit: None

  Transitions:
  → Moving: Input detected
  → Jumping: Jump button pressed

Moving State:
  Entry: Start move animation
  Update: Apply movement, update animation speed
  Exit: None

  Transitions:
  → Idle: No input
  → Jumping: Jump button pressed
```

## Custom Nodes

### Using Built-in Custom Nodes

**Spawn Pickup Node:**

- Category: Custom/Gameplay
- Use: Create collectible items
- Inputs: Pickup prefab, position, type
- Outputs: Spawned object

**Play Random SFX Node:**

- Category: Custom/Audio
- Use: Play random sound from array
- Inputs: Audio clips array, volume range, pitch range
- Outputs: Played clip

**Delayed Action Node:**

- Category: Custom/Utility
- Use: Execute something after delay
- Inputs: Delay time, use unscaled time
- Outputs: Immediate trigger, delayed trigger

### Creating Simple Custom Nodes

**For Programmers:**

1. Create C# script inheriting from `Unit`
2. Add `[UnitCategory]` attribute for organization
3. Define inputs/outputs in `Definition()` method
4. Implement logic in trigger method

## Integration with C# Scripts

### Calling C# Methods from Visual Scripting

1. **Mark methods** with `[VisualScriptingCompatible]` attribute
2. **Use Custom Event** nodes to communicate
3. **Access components** directly through object references

### Sharing Data

**From C# to Visual Scripting:**

```csharp
Variables.Application.Set("PlayerHealth", newHealth);
CustomEvent.Trigger(gameObject, "HealthChanged", newHealth);
```

**From Visual Scripting to C#:**

```text
[Custom Event: UpdatePlayerHealth] → [C# Method Call]
[Set Variable: PlayerHealth] → [Trigger: HealthChanged]
```

## Performance Tips

### For Mobile Development

1. **Limit active Script Machines** to 5 or fewer
2. **Use Update throttling** for non-critical scripts
3. **Disable distant objects** Script Machines
4. **Combine simple graphs** into fewer, more complex ones
5. **Use Object Pooling** for frequently spawned objects

### General Optimization

1. **Avoid Update loops** for non-real-time logic
2. **Use Events** instead of constant polling
3. **Cache references** instead of Find operations
4. **Limit variable operations** per frame
5. **Use State Machines** for complex behavior

## Debugging Visual Scripts

### Debug Panel (F12)

Shows:

- All Visual Scripting variables
- Active Script Machine status
- Recent events and errors
- Performance metrics

### Debug Techniques

1. **Add Debug Log nodes** to trace execution
2. **Use Variable Inspector** to watch values
3. **Step through** graphs in Visual Scripting window
4. **Check connections** for missing links
5. **Validate inputs** with null checks

## Common Patterns

### Non-Programmer Friendly Workflows

**Collectible Item:**

```text
[On Trigger Enter 2D] → [Branch: Tag == "Player"]
                      → [True: Add to Score]
                      → [Play Collection Sound]
                      → [Destroy Object]
```

**Simple Door:**

```text
[On Trigger Enter] → [Branch: Has Key]
                   → [True: Open Door Animation]
                   → [False: Show "Need Key" Message]
```

**Health Pickup:**

```text
[On Collision] → [Get Player Health]
               → [Branch: Health < Max]
               → [True: Heal Player]
               → [Destroy Pickup]
```

**Enemy Damage:**

```text
[On Collision Enter] → [Branch: Tag == "Player"]
                     → [True: Damage Player]
                     → [Play Hurt Sound]
                     → [Knockback Effect]
```

## Troubleshooting

### Common Issues

**"Node not found" errors:**

- Check Visual Scripting settings
- Regenerate node database
- Verify package installation

**Variables not updating:**

- Check variable scope (Application vs Scene vs Object)
- Verify Set Variable nodes are executing
- Use Debug Panel to monitor values

**Events not triggering:**

- Verify event names match exactly
- Check if receiving object exists
- Ensure Custom Event nodes are connected

**Performance issues:**

- Use Performance Validator
- Check active Script Machine count
- Enable mobile optimizations if needed

### Getting Help

1. **Check Debug Panel** (F12) for errors
2. **Use Performance Validator** for bottlenecks
3. **Review variable scopes** for data issues
4. **Test in isolation** to identify problem areas
5. **Consult Unity Visual Scripting documentation**

## Best Practices

### Organization

1. **Use clear naming** conventions for all assets
2. **Group related nodes** visually
3. **Comment complex logic** with sticky notes
4. **Organize variables** by category in Blackboard
5. **Keep graphs focused** on single responsibilities

### Collaboration

1. **Document graph purpose** in asset description
2. **Use meaningful variable names**
3. **Create reusable subgraphs** for common logic
4. **Test thoroughly** before sharing
5. **Provide usage examples** for custom nodes

### Maintenance

1. **Regular performance audits** using Validator
2. **Clean up unused variables** periodically
3. **Update templates** as patterns emerge
4. **Version control** Visual Scripting assets
5. **Document breaking changes** in team notes

```

### 12. Validation Checklist

- [ ] Visual Scripting package installed and configured
- [ ] Directory structure created with proper organization
- [ ] Script Graph templates created for common scenarios
- [ ] State Graph templates created for character/game states
- [ ] Variable system configured with all scopes working
- [ ] Custom nodes implemented and tested
- [ ] C# integration bridge functional
- [ ] Timeline integration working
- [ ] Debug panel operational
- [ ] Performance optimizer configured
- [ ] Mobile optimizations applied (if target platform includes mobile)
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Documentation complete with non-programmer focus

## Success Criteria

- Visual Scripting system fully integrated with game architecture
- Both 2D and 3D workflows supported and documented
- Non-programmer friendly templates and patterns available
- Custom nodes enhance gameplay development capabilities
- C# script integration enables hybrid development approach
- State machines handle complex behavior management
- Timeline system supports Visual Scripting sequences
- Debug tools enable effective troubleshooting
- Performance optimization maintains target frame rates
- Mobile performance meets platform requirements (<33ms frame time)
- Complete documentation enables non-programmer adoption
- All integration tests passing with performance validation

## Notes

- This task establishes Visual Scripting as the primary non-programmer interface
- Templates and patterns focus on common game development scenarios
- Custom nodes extend functionality while maintaining ease of use
- Integration with existing systems (Timeline, Input, etc.) provides seamless workflow
- Performance optimization ensures Visual Scripting scales to production requirements
- Debug tools support both technical and non-technical team members
- Documentation prioritizes accessibility for designers and artists
- Template placeholders: {{root}}, {{game_type}}, {{target_platform}}, {{project_root}}
- LLM directives guide adaptive processing based on project configuration
- Error handling ensures robust Visual Scripting implementation across platforms
- Mobile considerations integrated throughout for performance-conscious development
```
