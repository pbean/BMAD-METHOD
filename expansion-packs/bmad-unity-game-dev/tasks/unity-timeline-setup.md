# Unity Timeline System Integration Task

## Purpose

To configure Unity Timeline for creating cutscenes, cinematics, complex animations, and orchestrated gameplay sequences. This task ensures Timeline is properly integrated with the game architecture, providing patterns for both 2D sprite sequences and 3D cinematic experiences. Timeline serves as the orchestration layer for time-based content, coordinating animations, audio, camera movements, and gameplay events.

## Dependencies

**Prerequisite Tasks**:

- `unity-package-setup.md` - Timeline package installation
- `unity-package-integration.md` - Package configuration

**Integration Points**:

- Cinemachine configuration (Virtual Camera tracks)
  - Requires: `unity-cinemachine-setup.md` task completion
  - Validates: CinemachineTrack availability and Virtual Camera bindings
  - Dependencies: `com.unity.cinemachine` package >= 2.8.0
- Input System bindings (Timeline playback triggers)
  - Requires: `unity-input-system-setup.md` task completion
  - Validates: InputActionReference serialization support
  - Dependencies: `com.unity.inputsystem` package >= 1.4.0
- Audio System integration (Audio tracks)
  - Validates: AudioSource component integration
  - Dependencies: Unity built-in audio system
- Animation System setup (Animation tracks)
  - Validates: Animator component integration
  - Dependencies: Unity built-in animation system
- UI System coordination (UI-based sequences)
  - Validates: Canvas and UI component integration
  - Dependencies: Unity built-in UI system

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Prerequisites and Configuration Load

[[LLM: Validate Unity project structure and Timeline package compatibility. Adapt validation steps based on detected Unity version. If any validation fails, provide specific remediation steps before proceeding.]]

- Load `{{root}}/config.yaml` from the expansion pack directory
- If config file missing, HALT with error: "config.yaml not found. Please ensure unity-package-setup task completed successfully."
- Verify Timeline package installation (`com.unity.timeline`):
  - Check `Packages/manifest.json` for Timeline dependency (minimum version: 1.4.8 for Unity 2020.3 LTS, 1.6.4 for Unity 2021.3 LTS, 1.7.0 for Unity 2022.3 LTS)
  - Validate Timeline package in `Packages/packages-lock.json`
  - Verify Timeline window accessible: Window > Sequencing > Timeline
  - If Timeline missing, HALT with error: "Timeline package not installed. Run: unity-package-setup task first."
- Verify prerequisite task completion:
  - Check for `docs/unity-packages.md` from unity-package-setup
  - Check for `docs/package-integration/` directory from unity-package-integration
  - If missing, HALT with error: "Prerequisite tasks not completed. Run unity-package-setup and unity-package-integration first."
- Identify game type ({{game_type}}) from architecture documents
- Load Timeline version compatibility matrix for Unity LTS versions

### 1. Timeline Asset Structure Setup

#### 1.1 Create Directory Structure

[[LLM: Analyze the project's existing folder structure and adapt the directory creation to match established conventions. If Assets/_Project/ doesn't exist, use the project's current structure pattern.]]

```text
{{project_root}}/Assets/
├── _Project/
│   ├── Timelines/
│   │   ├── Cutscenes/
│   │   │   ├── Intro/
│   │   │   ├── Outro/
│   │   │   └── Chapter[N]/
│   │   ├── Gameplay/
│   │   │   ├── BossSequences/
│   │   │   ├── Tutorials/
│   │   │   └── Events/
│   │   ├── UI/
│   │   │   ├── MenuTransitions/
│   │   │   └── DialogueSequences/
│   │   └── Playables/
│   │       ├── CustomTracks/
│   │       └── CustomClips/
```

[[LLM: Create directories only if they don't already exist. Log all created directories for tracking.]]

#### 1.2 Timeline Asset Naming Conventions

[[LLM: Generate project-specific naming conventions based on game type ({{game_type}}) and existing asset naming patterns. Adapt examples to match project's domain.]]

```markdown
# Naming Pattern: TL*[Type]*[Location]\_[Description]

- TL_Cutscene_Intro_GameStart
- TL_Gameplay_Boss1_PhaseTransition
- TL_UI_MainMenu_Enter
```

[[LLM: Validate naming conventions against existing project standards and suggest modifications if conflicts exist.]]

### 2. Playable Director Configuration

#### 2.1 Create Timeline Manager Component

```csharp
// Assets/Scripts/Timeline/TimelineManager.cs
using UnityEngine;
using UnityEngine.Timeline;
using UnityEngine.Playables;
using System.Collections.Generic;

public class TimelineManager : MonoBehaviour
{
    [System.Serializable]
    public class TimelineEntry
    {
        public string name;
        public PlayableDirector director;
        public TimelineAsset timeline;
        public bool pauseGameplay = true;
    }

    [SerializeField] private List<TimelineEntry> timelines = new List<TimelineEntry>();
    private PlayableDirector currentDirector;

    public static TimelineManager Instance { get; private set; }

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    public void PlayTimeline(string timelineName)
    {
        if (string.IsNullOrEmpty(timelineName))
        {
            Debug.LogError($"[TimelineManager] Timeline name cannot be null or empty");
            return;
        }

        var entry = timelines.Find(t => t.name == timelineName);
        if (entry == null)
        {
            Debug.LogError($"[TimelineManager] Timeline '{timelineName}' not found");
            return;
        }

        if (entry.director == null)
        {
            Debug.LogError($"[TimelineManager] PlayableDirector is null for timeline '{timelineName}'");
            return;
        }

        try
        {
            currentDirector = entry.director;
            currentDirector.playableAsset = entry.timeline;

            if (entry.pauseGameplay)
            {
                Time.timeScale = 0f;
                currentDirector.timeUpdateMode = DirectorUpdateMode.UnscaledGameTime;
            }

            currentDirector.Play();
            Debug.Log($"[TimelineManager] Successfully started timeline '{timelineName}'");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[TimelineManager] Failed to play timeline '{timelineName}': {ex.Message}");
        }
    }

    public void StopCurrentTimeline()
    {
        try
        {
            if (currentDirector != null)
            {
                currentDirector.Stop();
                Time.timeScale = 1f;
                Debug.Log($"[TimelineManager] Timeline stopped successfully");
            }
            else
            {
                Debug.LogWarning($"[TimelineManager] No current timeline to stop");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[TimelineManager] Failed to stop timeline: {ex.Message}");
            Time.timeScale = 1f; // Ensure timescale is reset even on error
        }
    }
}
```

#### 2.2 Configure Playable Directors

[[LLM: Adapt configuration settings based on detected game type ({{game_type}}) and target platform ({{target_platform}}). For mobile games, prefer performance-optimized settings.]]

```csharp
// Playable Director settings per Timeline type
{
  "Cutscenes": {
    "updateMethod": "DSPClock",    // Audio sync priority
    "wrapMode": "None",
    "timeUpdateMode": "UnscaledGameTime"
  },
  "Gameplay": {
    "updateMethod": "GameTime",    // Gameplay sync
    "wrapMode": "Loop",           // For repeating sequences
    "timeUpdateMode": "GameTime"
  },
  "UI": {
    "updateMethod": "UnscaledGameTime",  // UI unaffected by pause
    "wrapMode": "None",
    "timeUpdateMode": "UnscaledGameTime"
  }
}
```

[[LLM: Validate that chosen settings align with performance requirements for {{target_platform}}. Recommend adjustments if needed.]]

### 3. Timeline Track Configuration

#### 3.1 Animation Track Setup (2D and 3D)

**For 2D Sprite Animations**:
[[LLM: Include this section only if game_type is "2D" or "2D/3D Hybrid". Skip if purely 3D game.]]

```csharp
// Configure 2D sprite animation tracks
public class Timeline2DAnimationSetup : MonoBehaviour
{
    [SerializeField] private SpriteRenderer targetSprite;
    [SerializeField] private List<Sprite> animationFrames;

    public void SetupSpriteTrack(TimelineAsset timeline)
    {
        if (timeline == null)
        {
            Debug.LogError("[Timeline2DAnimationSetup] Timeline asset cannot be null");
            return;
        }

        if (targetSprite == null)
        {
            Debug.LogError("[Timeline2DAnimationSetup] Target SpriteRenderer is required");
            return;
        }

        try
        {
            var animTrack = timeline.CreateTrack<AnimationTrack>(null, "2D Sprite Animation");
            // Bind to GameObject with SpriteRenderer
            // Create clips for sprite frame changes
            Debug.Log("[Timeline2DAnimationSetup] 2D sprite animation track created successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Timeline2DAnimationSetup] Failed to create 2D animation track: {ex.Message}");
        }
    }
}
```

**For 3D Character Animations**:
[[LLM: Include this section only if game_type is "3D" or "2D/3D Hybrid". Skip if purely 2D game.]]

```csharp
// Configure 3D character animation tracks
public class Timeline3DAnimationSetup : MonoBehaviour
{
    [SerializeField] private Animator characterAnimator;

    public void Setup3DTrack(TimelineAsset timeline)
    {
        if (timeline == null)
        {
            Debug.LogError("[Timeline3DAnimationSetup] Timeline asset cannot be null");
            return;
        }

        if (characterAnimator == null)
        {
            Debug.LogError("[Timeline3DAnimationSetup] Character Animator is required");
            return;
        }

        try
        {
            var animTrack = timeline.CreateTrack<AnimationTrack>(null, "3D Character Animation");
            animTrack.infiniteClipPreExtrapolation = TrackOffset.ApplyTransformOffsets;
            // Bind to Animator component
            // Add animation clips with blend settings
            Debug.Log("[Timeline3DAnimationSetup] 3D character animation track created successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Timeline3DAnimationSetup] Failed to create 3D animation track: {ex.Message}");
        }
    }
}
```

#### 3.2 Audio Track Configuration

```csharp
// Audio track setup for both 2D and 3D
public class TimelineAudioSetup : MonoBehaviour
{
    [Header("Audio Configuration")]
    [SerializeField] private AudioMixerGroup musicGroup;
    [SerializeField] private AudioMixerGroup sfxGroup;
    [SerializeField] private AudioMixerGroup voiceGroup;

    public void SetupAudioTracks(TimelineAsset timeline)
    {
        // Music track
        var musicTrack = timeline.CreateTrack<AudioTrack>(null, "Music");

        // SFX track
        var sfxTrack = timeline.CreateTrack<AudioTrack>(null, "SFX");

        // Voice/Dialogue track
        var voiceTrack = timeline.CreateTrack<AudioTrack>(null, "Voice");
    }
}
```

#### 3.3 Signal Track for Events

```csharp
// Signal system for Timeline events
[CreateAssetMenu(fileName = "TimelineSignal", menuName = "Timeline/Signals/Game Event")]
public class TimelineGameSignal : SignalAsset { }

public class TimelineSignalReceiver : MonoBehaviour, INotificationReceiver
{
    public void OnNotify(Playable origin, INotification notification, object context)
    {
        if (notification is SignalEmitter signal)
        {
            HandleTimelineSignal(signal.asset as TimelineGameSignal);
        }
    }

    private void HandleTimelineSignal(TimelineGameSignal signal)
    {
        // Trigger gameplay events
        // Update UI
        // Save checkpoints
        // Unlock achievements
    }
}
```

#### 3.4 Control Track for GameObject Activation

```csharp
// Control track configuration
public void SetupControlTracks(TimelineAsset timeline)
{
    // Setup for enabling/disabling GameObjects
    var controlTrack = timeline.CreateTrack<ControlTrack>(null, "Object Control");

    // Common use cases:
    // - Show/hide UI elements
    // - Activate/deactivate effects
    // - Enable/disable gameplay objects
}
```

#### 3.5 Activation Track for Component Control

```csharp
// Activation track for component management
public void SetupActivationTracks(TimelineAsset timeline)
{
    var activationTrack = timeline.CreateTrack<ActivationTrack>(null, "Component Activation");

    // Use cases:
    // - Enable/disable colliders during cutscenes
    // - Toggle scripts during Timeline playback
    // - Control particle systems
}
```

### 4. Cinemachine Integration

#### 4.1 Virtual Camera Track Setup

**For 2D Games**:
[[LLM: Include this section only if game_type is "2D" or "2D/3D Hybrid". Skip if purely 3D game.]]

```csharp
// 2D Cinemachine Timeline integration
public class Timeline2DCameraSetup : MonoBehaviour
{
    [SerializeField] private CinemachineVirtualCamera vcam2D;
    [SerializeField] private float orthographicSize = 5f;

    public void Setup2DCameraTrack(TimelineAsset timeline)
    {
        if (timeline == null)
        {
            Debug.LogError("[Timeline2DCameraSetup] Timeline asset cannot be null");
            return;
        }

        if (vcam2D == null)
        {
            Debug.LogError("[Timeline2DCameraSetup] 2D Virtual Camera is required");
            return;
        }

        try
        {
            var cineTrack = timeline.CreateTrack<CinemachineTrack>(null, "2D Camera");

            // Configure for 2D:
            // - Orthographic projection
            // - Pixel-perfect settings
            // - 2D confiner for bounds

            Debug.Log("[Timeline2DCameraSetup] 2D camera track created successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Timeline2DCameraSetup] Failed to create 2D camera track: {ex.Message}");
        }
    }
}
```

**For 3D Games**:
[[LLM: Include this section only if game_type is "3D" or "2D/3D Hybrid". Skip if purely 2D game.]]

```csharp
// 3D Cinemachine Timeline integration
public class Timeline3DCameraSetup : MonoBehaviour
{
    [SerializeField] private CinemachineVirtualCamera[] virtualCameras;

    public void Setup3DCameraTrack(TimelineAsset timeline)
    {
        if (timeline == null)
        {
            Debug.LogError("[Timeline3DCameraSetup] Timeline asset cannot be null");
            return;
        }

        if (virtualCameras == null || virtualCameras.Length == 0)
        {
            Debug.LogError("[Timeline3DCameraSetup] At least one 3D Virtual Camera is required");
            return;
        }

        try
        {
            var cineTrack = timeline.CreateTrack<CinemachineTrack>(null, "3D Camera");

            // Configure for 3D:
            // - Field of view changes
            // - Dolly tracks
            // - Look-at targets

            Debug.Log("[Timeline3DCameraSetup] 3D camera track created successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Timeline3DCameraSetup] Failed to create 3D camera track: {ex.Message}");
        }
    }
}
```

#### 4.2 Camera Blend Configuration

```csharp
// Cinemachine blend settings for Timeline
[System.Serializable]
public class TimelineCameraBlends
{
    public AnimationCurve blendCurve = AnimationCurve.EaseInOut(0f, 0f, 1f, 1f);
    public float defaultBlendTime = 1f;

    [Header("2D Specific")]
    public bool maintain2DPixelPerfect = true;
    public float orthoSizeTransitionSpeed = 2f;

    [Header("3D Specific")]
    public CinemachineBlendDefinition.Style blendStyle = CinemachineBlendDefinition.Style.EaseInOut;
    public bool inheritPosition = true;
}
```

### 5. Custom Track Development

#### 5.1 Create Custom Gameplay Track

```csharp
// Custom track for game-specific events
[TrackColor(0.855f, 0.8623f, 0.123f)]
[TrackClipType(typeof(GameplayEventClip))]
[TrackBindingType(typeof(GameplayEventReceiver))]
public class GameplayEventTrack : TrackAsset
{
    protected override Playable CreatePlayable(PlayableGraph graph, GameObject go, int inputCount)
    {
        return ScriptPlayable<GameplayEventMixerBehaviour>.Create(graph, inputCount);
    }
}

[Serializable]
public class GameplayEventClip : PlayableAsset
{
    public GameplayEventBehaviour template = new GameplayEventBehaviour();

    public override Playable CreatePlayable(PlayableGraph graph, GameObject owner)
    {
        var playable = ScriptPlayable<GameplayEventBehaviour>.Create(graph, template);
        return playable;
    }
}

[Serializable]
public class GameplayEventBehaviour : PlayableBehaviour
{
    public enum EventType { SpawnEnemy, TriggerAbility, ChangePhase, UpdateObjective }
    public EventType eventType;
    public string eventData;

    public override void OnBehaviourPlay(Playable playable, FrameData info)
    {
        // Execute gameplay event
    }
}
```

### 6. Timeline Input System Integration

#### 6.1 Input-Triggered Timeline Playback

```csharp
using UnityEngine.InputSystem;

public class TimelineInputTrigger : MonoBehaviour
{
    [SerializeField] private InputActionReference skipCutsceneAction;
    [SerializeField] private InputActionReference pauseTimelineAction;
    [SerializeField] private PlayableDirector director;

    private void OnEnable()
    {
        skipCutsceneAction.action.performed += OnSkipCutscene;
        pauseTimelineAction.action.performed += OnPauseTimeline;
    }

    private void OnDisable()
    {
        skipCutsceneAction.action.performed -= OnSkipCutscene;
        pauseTimelineAction.action.performed -= OnPauseTimeline;
    }

    private void OnSkipCutscene(InputAction.CallbackContext context)
    {
        if (director.state == PlayState.Playing)
        {
            director.time = director.duration;
            director.Evaluate();
        }
    }

    private void OnPauseTimeline(InputAction.CallbackContext context)
    {
        if (director.state == PlayState.Playing)
            director.Pause();
        else if (director.state == PlayState.Paused)
            director.Resume();
    }
}
```

### 7. Timeline Performance Optimization

[[LLM: Apply mobile optimizations only if target_platform includes mobile devices. Adapt settings based on performance_profile (High/Medium/Low).]]

#### 7.1 Mobile Performance Settings

```csharp
public class TimelineMobileOptimization : MonoBehaviour
{
    [Header("Mobile Settings")]
    [SerializeField] private int targetFrameRate = 30;
    [SerializeField] private bool reducedQualityMode = true;
    [SerializeField] private float lodBias = 2.0f;
    [SerializeField] private float maxFrameTime = 16.67f; // Target: 60 FPS

    public void OptimizeForMobile(PlayableDirector director)
    {
        if (director == null)
        {
            Debug.LogError("[TimelineMobileOptimization] PlayableDirector cannot be null");
            return;
        }

        try
        {
            // Reduce update frequency
            if (reducedQualityMode)
            {
                QualitySettings.lodBias = lodBias;
                Application.targetFrameRate = targetFrameRate;
                Debug.Log($"[TimelineMobileOptimization] Applied mobile quality settings: FPS={targetFrameRate}, LOD Bias={lodBias}");
            }

            // Optimize Timeline playback
            director.timeUpdateMode = DirectorUpdateMode.Manual;
            StartCoroutine(ManualTimelineUpdate(director));
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[TimelineMobileOptimization] Failed to apply mobile optimization: {ex.Message}");
        }
    }

    private IEnumerator ManualTimelineUpdate(PlayableDirector director)
    {
        float frameStartTime;

        while (director != null && director.state == PlayState.Playing)
        {
            frameStartTime = Time.realtimeSinceStartup;

            try
            {
                director.time += Time.deltaTime;
                director.Evaluate();

                // Performance monitoring
                float frameTime = (Time.realtimeSinceStartup - frameStartTime) * 1000f;
                if (frameTime > maxFrameTime)
                {
                    Debug.LogWarning($"[TimelineMobileOptimization] Frame time exceeded target: {frameTime:F2}ms");
                }
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[TimelineMobileOptimization] Error during manual timeline update: {ex.Message}");
                break;
            }

            yield return null;
        }

        Debug.Log("[TimelineMobileOptimization] Manual timeline update completed");
    }
}
```

#### 7.2 Memory Management

```csharp
public class TimelineMemoryManager : MonoBehaviour
{
    [SerializeField] private bool unloadAssetsAfterPlay = true;
    [SerializeField] private float memoryThresholdMB = 100f;

    public void OnTimelineComplete(PlayableDirector director)
    {
        if (unloadAssetsAfterPlay)
        {
            // Unload Timeline assets
            director.playableAsset = null;

            // Force garbage collection on mobile
            if (SystemInfo.systemMemorySize < memoryThresholdMB)
            {
                Resources.UnloadUnusedAssets();
                System.GC.Collect();
            }
        }
    }
}
```

### 8. Timeline Markers and Signals

#### 8.1 Create Timeline Markers

```csharp
// Marker system for Timeline annotations
[CustomStyle("TimelineMarker")]
public class TimelineAnnotationMarker : Marker, INotification
{
    public string annotation = "Timeline Event";
    public Color markerColor = Color.yellow;

    public PropertyName id => new PropertyName(annotation);
}

// Marker receiver
public class TimelineMarkerReceiver : MonoBehaviour, INotificationReceiver
{
    public void OnNotify(Playable origin, INotification notification, object context)
    {
        if (notification is TimelineAnnotationMarker marker)
        {
            Debug.Log($"Timeline Marker: {marker.annotation} at {marker.time}");
            // Handle marker event
        }
    }
}
```

### 9. Timeline Save System Integration

#### 9.1 Timeline State Persistence

```csharp
[Serializable]
public class TimelineStateData
{
    public string timelineName;
    public double currentTime;
    public bool isPlaying;
    public Dictionary<string, bool> completedCutscenes;
}

public class TimelineSaveManager : MonoBehaviour
{
    public void SaveTimelineState(PlayableDirector director)
    {
        var stateData = new TimelineStateData
        {
            timelineName = director.playableAsset.name,
            currentTime = director.time,
            isPlaying = director.state == PlayState.Playing
        };

        // Save to persistent storage
        string json = JsonUtility.ToJson(stateData);
        PlayerPrefs.SetString("TimelineState", json);
    }

    public void LoadTimelineState(PlayableDirector director)
    {
        if (PlayerPrefs.HasKey("TimelineState"))
        {
            string json = PlayerPrefs.GetString("TimelineState");
            var stateData = JsonUtility.FromJson<TimelineStateData>(json);

            // Restore Timeline state
            director.time = stateData.currentTime;
            if (stateData.isPlaying)
                director.Resume();
        }
    }
}
```

### 10. Testing and Validation

#### 10.1 Create Timeline Integration Tests

```csharp
// Assets/Tests/Timeline/TimelineIntegrationTests.cs
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.Timeline;
using UnityEngine.Playables;

[TestFixture]
public class TimelineIntegrationTests
{
    [Test]
    public void Timeline_AssetStructure_ExistsCorrectly()
    {
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/Timelines"));
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/Timelines/Cutscenes"));
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/Timelines/Gameplay"));
    }

    [UnityTest]
    public IEnumerator Timeline_PlaybackControl_WorksCorrectly()
    {
        var go = new GameObject("TestDirector");
        var director = go.AddComponent<PlayableDirector>();
        var timeline = ScriptableObject.CreateInstance<TimelineAsset>();

        director.playableAsset = timeline;
        director.Play();

        yield return new WaitForSeconds(0.1f);
        Assert.AreEqual(PlayState.Playing, director.state);

        director.Pause();
        Assert.AreEqual(PlayState.Paused, director.state);

        Object.DestroyImmediate(go);
    }

    [Test]
    public void Timeline_TrackCreation_SupportsAllTypes()
    {
        var timeline = ScriptableObject.CreateInstance<TimelineAsset>();

        var animTrack = timeline.CreateTrack<AnimationTrack>(null, "Animation");
        Assert.IsNotNull(animTrack);

        var audioTrack = timeline.CreateTrack<AudioTrack>(null, "Audio");
        Assert.IsNotNull(audioTrack);

        var signalTrack = timeline.CreateTrack<SignalTrack>(null, "Signals");
        Assert.IsNotNull(signalTrack);

        Object.DestroyImmediate(timeline);
    }
}
```

#### 10.2 Performance Validation

[[LLM: Customize performance thresholds based on target_platform. Mobile: 1 Timeline, 33ms frame time. Desktop: 3 Timelines, 16.67ms frame time. Console: 2 Timelines, 16.67ms frame time.]]

```csharp
public class TimelinePerformanceValidator : MonoBehaviour
{
    [SerializeField] private float maxFrameTime = 16.67f; // 60 FPS target
    [SerializeField] private int maxActiveTimelines = 2;
    [SerializeField] private bool enableDetailedLogging = false;

    public bool ValidatePerformance()
    {
        try
        {
            var directors = FindObjectsOfType<PlayableDirector>();
            var activeCount = 0;

            if (directors == null)
            {
                Debug.LogWarning("[TimelinePerformanceValidator] No PlayableDirectors found in scene");
                return true;
            }

            foreach (var director in directors)
            {
                if (director != null && director.state == PlayState.Playing)
                {
                    activeCount++;
                    if (enableDetailedLogging)
                    {
                        Debug.Log($"[TimelinePerformanceValidator] Active Timeline: {director.gameObject.name}");
                    }
                }
            }

            if (activeCount > maxActiveTimelines)
            {
                Debug.LogWarning($"[TimelinePerformanceValidator] Too many active Timelines: {activeCount}/{maxActiveTimelines}");
                return false;
            }

            float currentFrameTime = Time.deltaTime * 1000f;
            if (currentFrameTime > maxFrameTime)
            {
                Debug.LogWarning($"[TimelinePerformanceValidator] Frame time exceeded: {currentFrameTime:F2}ms (max: {maxFrameTime}ms)");
                return false;
            }

            if (enableDetailedLogging)
            {
                Debug.Log($"[TimelinePerformanceValidator] Performance OK - Active: {activeCount}, Frame Time: {currentFrameTime:F2}ms");
            }

            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[TimelinePerformanceValidator] Performance validation failed: {ex.Message}");
            return false;
        }
    }
}
```

### 11. Documentation and Integration

#### 11.1 Generate Timeline API Reference

Create `docs/package-integration/timeline-system.md`:

````markdown
# Unity Timeline Integration Guide

## Quick Start

### Creating a Simple Cutscene (2D)

```csharp
var timeline = TimelineAsset.CreateInstance<TimelineAsset>();
var animTrack = timeline.CreateTrack<AnimationTrack>(null, "Sprite Animation");
var audioTrack = timeline.CreateTrack<AudioTrack>(null, "Music");
director.playableAsset = timeline;
director.Play();
```
````

### Creating a Cinematic Sequence (3D)

```csharp
var timeline = TimelineAsset.CreateInstance<TimelineAsset>();
var cineTrack = timeline.CreateTrack<CinemachineTrack>(null, "Cameras");
var animTrack = timeline.CreateTrack<AnimationTrack>(null, "Characters");
director.playableAsset = timeline;
director.Play();
```

## Common Patterns

### Skip Cutscene Implementation

[Source: TimelineInputTrigger.cs]

### Timeline Event System

[Source: TimelineSignalReceiver.cs]

### Mobile Optimization

[Source: TimelineMobileOptimization.cs]

## Best Practices

1. **Asset Organization**: Use clear naming conventions (TL_Type_Location_Description)
2. **Performance**: Limit concurrent Timelines on mobile to 1
3. **Memory**: Unload Timeline assets after playback on low-memory devices
4. **Input**: Always provide skip functionality for cutscenes
5. **Save System**: Persist Timeline state for resume functionality

````

#### 11.2 Update Story Templates
[[LLM: Integrate Timeline requirements with existing story templates. Add conditional requirements based on game_type and target_platform.]]

Enhance story creation to include Timeline context:
```markdown
## Timeline Requirements
- [ ] Cutscene Timeline assets created
- [ ] Camera sequences configured ({{game_type}} specific)
- [ ] Signal events integrated
- [ ] Input skip functionality implemented
- [ ] Performance validated on {{target_platform}}
- [ ] Mobile optimization applied (if {{target_platform}} includes mobile)
- [ ] Error handling implemented
- [ ] Integration tests passing
````

### 12. Validation Checklist

- [ ] Timeline package installed and configured
- [ ] Directory structure created
- [ ] TimelineManager singleton implemented
- [ ] All track types configured (Animation, Audio, Signal, Control, Activation)
- [ ] Cinemachine integration tested
- [ ] Custom tracks developed as needed
- [ ] Input System integration complete
- [ ] Mobile optimization applied
- [ ] Save system integrated
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Documentation complete

## Success Criteria

- Timeline system fully integrated with game architecture
- Both 2D and 3D workflows supported
- Cinemachine cameras controlled via Timeline
- Input System triggers Timeline playback
- Custom gameplay tracks functional
- Mobile performance optimized (<16.67ms frame time)
- Save/load Timeline state working
- All integration tests passing
- Complete API documentation for development team

## Notes

- This task extends unity-package-integration for Timeline-specific setup
- Integrates with Cinemachine for camera control (requires separate Cinemachine setup)
- Timeline version compatibility: Unity 2020.3 LTS, 2021.3 LTS, 2022.3 LTS
- Mobile optimization essential for Timeline-heavy games
- Custom tracks enable game-specific Timeline extensions
- Signal system provides loose coupling between Timeline and gameplay
- Save system integration allows resumable cutscenes
- Performance monitoring critical for mobile deployment
- Template placeholders: {{root}}, {{game_type}}, {{target_platform}}, {{project_root}}
- LLM directives guide adaptive processing based on project configuration
- Error handling ensures robust Timeline implementation across platforms
