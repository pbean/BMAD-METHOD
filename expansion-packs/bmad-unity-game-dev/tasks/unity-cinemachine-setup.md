# Unity Cinemachine Camera System Integration Task

## Purpose

To configure Unity Cinemachine for advanced camera control in both 2D and 3D games, providing intelligent camera behaviors, smooth transitions, and Timeline integration. This task establishes a robust camera system that automatically follows targets, handles constraints, provides smooth blending between camera states, and integrates seamlessly with Unity Timeline for cinematic sequences. Cinemachine serves as the camera intelligence layer, eliminating manual camera programming while providing professional cinematography tools.

## Dependencies

**Prerequisite Tasks**:

- `unity-package-setup.md` - Cinemachine package installation
- `unity-package-integration.md` - Package configuration

**Integration Points**:

- Timeline system integration (Cinematic sequences)
  - Requires: `unity-timeline-setup.md` task completion
  - Validates: CinemachineTrack functionality and Virtual Camera Timeline control
  - Dependencies: `com.unity.timeline` package >= 1.4.8
- Input System integration (Camera controls)
  - Requires: `unity-input-system-setup.md` task completion
  - Validates: Input Action serialization for camera controls
  - Dependencies: `com.unity.inputsystem` package >= 1.4.0
- Physics integration (3D collision detection)
  - Validates: Physics Raycast system for camera collisions
  - Dependencies: Unity built-in physics system
- UI System coordination (Camera-dependent UI)
  - Validates: Canvas world space camera assignment
  - Dependencies: Unity built-in UI system
- Audio System (Listener management)
  - Validates: Audio Listener positioning with camera
  - Dependencies: Unity built-in audio system

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Prerequisites and Configuration Load

[[LLM: Validate Unity project structure and Cinemachine package compatibility. Adapt validation steps based on detected Unity version and game type (2D/3D). If any validation fails, provide specific remediation steps before proceeding.]]

- Load `{{root}}/config.yaml` from the expansion pack directory
- If config file missing, HALT with error: "config.yaml not found. Please ensure unity-package-setup task completed successfully."
- Verify Cinemachine package installation (`com.unity.cinemachine`):
  - Check `Packages/manifest.json` for Cinemachine dependency (minimum version: 2.8.0 for Unity 2020.3 LTS, 2.9.7 for Unity 2021.3 LTS, 3.0.1 for Unity 2022.3 LTS)
  - Validate Cinemachine package in `Packages/packages-lock.json`
  - Verify Cinemachine menu accessible: GameObject > Cinemachine
  - If Cinemachine missing, HALT with error: "Cinemachine package not installed. Run: unity-package-setup task first."
- Verify prerequisite task completion:
  - Check for `docs/unity-packages.md` from unity-package-setup
  - Check for `docs/package-integration/` directory from unity-package-integration
  - If missing, HALT with error: "Prerequisite tasks not completed. Run unity-package-setup and unity-package-integration first."
- Identify game type ({{game_type}}) from architecture documents
- Load Cinemachine version compatibility matrix for Unity LTS versions
- Validate physics system availability for 3D camera collision detection

### 1. Cinemachine Core Structure Setup

#### 1.1 Create Camera System Architecture

[[LLM: Analyze the project's existing folder structure and adapt the directory creation to match established conventions. If Assets/_Project/ doesn't exist, use the project's current structure pattern.]]

```text
{{project_root}}/Assets/
├── _Project/
│   ├── Cameras/
│   │   ├── VirtualCameras/
│   │   │   ├── 2D/
│   │   │   │   ├── FollowCameras/
│   │   │   │   ├── StaticCameras/
│   │   │   │   └── CutsceneCameras/
│   │   │   └── 3D/
│   │   │       ├── FreeLookCameras/
│   │   │       ├── FollowCameras/
│   │   │       ├── DollyCameras/
│   │   │       └── CutsceneCameras/
│   │   ├── CameraBrains/
│   │   ├── Constraints/
│   │   │   ├── Confiner2D/
│   │   │   ├── Confiner3D/
│   │   │   └── CollisionDetection/
│   │   ├── CameraStates/
│   │   └── Profiles/
│   │       ├── NoiseProfiles/
│   │       ├── BlendProfiles/
│   │       └── ImpulseProfiles/
```

[[LLM: Create directories only if they don't already exist. Log all created directories for tracking.]]

#### 1.2 Camera Naming Conventions

[[LLM: Generate project-specific naming conventions based on game type ({{game_type}}) and existing asset naming patterns. Adapt examples to match project's domain.]]

```markdown
# Naming Pattern: CM*[Type]*[Purpose]\_[Context]

- CM_VCam2D_Follow_Player
- CM_VCam3D_FreeLook_Main
- CM_Brain_Game_Main
- CM_Confiner2D_Level01_Bounds
- CM_Profile_Shake_Explosion
```

[[LLM: Validate naming conventions against existing project standards and suggest modifications if conflicts exist.]]

### 2. Camera Brain Configuration

#### 2.1 Create Cinemachine Brain Manager

```csharp
// Assets/Scripts/Cameras/CinemachineBrainManager.cs
using UnityEngine;
using Cinemachine;
using System.Collections.Generic;

public class CinemachineBrainManager : MonoBehaviour
{
    [System.Serializable]
    public class CameraBrainConfig
    {
        public string name;
        public CinemachineBrain brain;
        public CinemachineBlendDefinition defaultBlend;
        public bool showDebugText = false;
        public CinemachineBrain.UpdateMethod updateMethod = CinemachineBrain.UpdateMethod.SmartUpdate;
    }

    [SerializeField] private List<CameraBrainConfig> brainConfigs = new List<CameraBrainConfig>();
    [SerializeField] private CameraBrainConfig activeBrainConfig;

    public static CinemachineBrainManager Instance { get; private set; }

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            InitializeBrains();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void InitializeBrains()
    {
        if (brainConfigs == null || brainConfigs.Count == 0)
        {
            Debug.LogError("[CinemachineBrainManager] No brain configurations found");
            return;
        }

        foreach (var config in brainConfigs)
        {
            if (config.brain == null)
            {
                Debug.LogError($"[CinemachineBrainManager] Brain is null for config '{config.name}'");
                continue;
            }

            try
            {
                config.brain.m_DefaultBlend = config.defaultBlend;
                config.brain.m_ShowDebugText = config.showDebugText;
                config.brain.m_UpdateMethod = config.updateMethod;
                Debug.Log($"[CinemachineBrainManager] Initialized brain '{config.name}' successfully");
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[CinemachineBrainManager] Failed to initialize brain '{config.name}': {ex.Message}");
            }
        }

        // Set default active brain
        if (brainConfigs.Count > 0)
        {
            activeBrainConfig = brainConfigs[0];
        }
    }

    public void SwitchToBrain(string brainName)
    {
        if (string.IsNullOrEmpty(brainName))
        {
            Debug.LogError("[CinemachineBrainManager] Brain name cannot be null or empty");
            return;
        }

        var config = brainConfigs.Find(c => c.name == brainName);
        if (config == null)
        {
            Debug.LogError($"[CinemachineBrainManager] Brain config '{brainName}' not found");
            return;
        }

        if (config.brain == null)
        {
            Debug.LogError($"[CinemachineBrainManager] Brain is null for config '{brainName}'");
            return;
        }

        try
        {
            // Disable current brain
            if (activeBrainConfig != null && activeBrainConfig.brain != null)
            {
                activeBrainConfig.brain.enabled = false;
            }

            // Enable new brain
            config.brain.enabled = true;
            activeBrainConfig = config;

            Debug.Log($"[CinemachineBrainManager] Switched to brain '{brainName}' successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineBrainManager] Failed to switch to brain '{brainName}': {ex.Message}");
        }
    }

    public CinemachineBrain GetActiveBrain()
    {
        return activeBrainConfig?.brain;
    }
}
```

#### 2.2 Configure Brain Settings by Game Type

[[LLM: Adapt brain configuration settings based on detected game type ({{game_type}}) and target platform ({{target_platform}}). For mobile games, prefer performance-optimized settings.]]

```csharp
// Brain configuration presets
[System.Serializable]
public class CameraBrainPresets
{
    [Header("2D Game Settings")]
    public CinemachineBlendDefinition blend2D = new CinemachineBlendDefinition(
        CinemachineBlendDefinition.Style.EaseInOut, 1.0f);
    public CinemachineBrain.UpdateMethod update2D = CinemachineBrain.UpdateMethod.FixedUpdate;

    [Header("3D Game Settings")]
    public CinemachineBlendDefinition blend3D = new CinemachineBlendDefinition(
        CinemachineBlendDefinition.Style.EaseInOut, 2.0f);
    public CinemachineBrain.UpdateMethod update3D = CinemachineBrain.UpdateMethod.LateUpdate;

    [Header("Mobile Optimization")]
    public bool enableMobileOptimization = true;
    public CinemachineBrain.UpdateMethod mobileUpdateMethod = CinemachineBrain.UpdateMethod.FixedUpdate;
    public float mobileBlendSpeed = 0.5f;
}
```

[[LLM: Validate that chosen settings align with performance requirements for {{target_platform}}. Recommend adjustments if needed.]]

### 3. Virtual Camera Configuration

#### 3.1 2D Virtual Camera Setup

[[LLM: Include this section only if game_type is "2D" or "2D/3D Hybrid". Skip if purely 3D game.]]

```csharp
// 2D Virtual Camera configuration
public class Cinemachine2DCameraSetup : MonoBehaviour
{
    [Header("2D Camera Configuration")]
    [SerializeField] private CinemachineVirtualCamera virtualCamera2D;
    [SerializeField] private PixelPerfectCamera pixelPerfectCamera;
    [SerializeField] private Transform followTarget;
    [SerializeField] private Transform lookAtTarget;

    [Header("2D Camera Settings")]
    [SerializeField] private float orthographicSize = 5f;
    [SerializeField] private bool usePixelPerfect = true;
    [SerializeField] private int pixelsPerUnit = 16;
    [SerializeField] private Vector3 offset = new Vector3(0, 2, -10);

    [Header("Follow Settings")]
    [SerializeField] private float dampingTime = 1f;
    [SerializeField] private float screenX = 0.5f;
    [SerializeField] private float screenY = 0.5f;
    [SerializeField] private float deadZoneWidth = 0.1f;
    [SerializeField] private float deadZoneHeight = 0.1f;

    private CinemachineTransposer transposer;
    private CinemachineComposer composer;

    private void Start()
    {
        SetupVirtualCamera2D();
    }

    public void SetupVirtualCamera2D()
    {
        if (virtualCamera2D == null)
        {
            Debug.LogError("[Cinemachine2DCameraSetup] Virtual camera reference is required");
            return;
        }

        try
        {
            // Configure camera properties
            var camera = virtualCamera2D.GetComponent<Camera>();
            if (camera != null)
            {
                camera.orthographic = true;
                camera.orthographicSize = orthographicSize;
                Debug.Log("[Cinemachine2DCameraSetup] Set camera to orthographic mode");
            }

            // Setup pixel perfect camera if enabled
            if (usePixelPerfect && pixelPerfectCamera != null)
            {
                pixelPerfectCamera.assetsPPU = pixelsPerUnit;
                pixelPerfectCamera.refResolutionX = 320;
                pixelPerfectCamera.refResolutionY = 180;
                Debug.Log("[Cinemachine2DCameraSetup] Configured pixel perfect camera");
            }

            // Configure follow behavior
            if (followTarget != null)
            {
                virtualCamera2D.Follow = followTarget;

                // Add and configure Transposer
                transposer = virtualCamera2D.GetCinemachineComponent<CinemachineTransposer>();
                if (transposer == null)
                {
                    transposer = virtualCamera2D.AddCinemachineComponent<CinemachineTransposer>();
                }

                transposer.m_FollowOffset = offset;
                transposer.m_XDamping = dampingTime;
                transposer.m_YDamping = dampingTime;
                transposer.m_ZDamping = 0f; // No Z movement in 2D

                Debug.Log("[Cinemachine2DCameraSetup] Configured follow behavior");
            }

            // Configure look-at behavior
            if (lookAtTarget != null)
            {
                virtualCamera2D.LookAt = lookAtTarget;

                // Add and configure Composer for framing
                composer = virtualCamera2D.GetCinemachineComponent<CinemachineComposer>();
                if (composer == null)
                {
                    composer = virtualCamera2D.AddCinemachineComponent<CinemachineComposer>();
                }

                composer.m_TrackedObjectOffset = Vector3.zero;
                composer.m_LookaheadTime = 0f; // No lookahead in basic 2D
                composer.m_LookaheadSmoothing = 0f;
                composer.m_HorizontalDamping = dampingTime;
                composer.m_VerticalDamping = dampingTime;
                composer.m_ScreenX = screenX;
                composer.m_ScreenY = screenY;
                composer.m_DeadZoneWidth = deadZoneWidth;
                composer.m_DeadZoneHeight = deadZoneHeight;

                Debug.Log("[Cinemachine2DCameraSetup] Configured look-at behavior");
            }

            Debug.Log("[Cinemachine2DCameraSetup] 2D virtual camera setup completed successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Cinemachine2DCameraSetup] Failed to setup 2D virtual camera: {ex.Message}");
        }
    }

    public void UpdateFollowTarget(Transform newTarget)
    {
        if (newTarget == null)
        {
            Debug.LogWarning("[Cinemachine2DCameraSetup] New target is null");
            return;
        }

        followTarget = newTarget;
        if (virtualCamera2D != null)
        {
            virtualCamera2D.Follow = followTarget;
            Debug.Log($"[Cinemachine2DCameraSetup] Updated follow target to {newTarget.name}");
        }
    }
}
```

#### 3.2 3D Virtual Camera Setup

[[LLM: Include this section only if game_type is "3D" or "2D/3D Hybrid". Skip if purely 2D game.]]

```csharp
// 3D Virtual Camera configuration
public class Cinemachine3DCameraSetup : MonoBehaviour
{
    [Header("3D Camera Configuration")]
    [SerializeField] private CinemachineVirtualCamera[] virtualCameras3D;
    [SerializeField] private CinemachineFreeLook freeLookCamera;
    [SerializeField] private Transform followTarget;
    [SerializeField] private Transform lookAtTarget;

    [Header("3D Camera Settings")]
    [SerializeField] private float fieldOfView = 60f;
    [SerializeField] private float nearClipPlane = 0.1f;
    [SerializeField] private float farClipPlane = 1000f;

    [Header("Follow Settings")]
    [SerializeField] private Vector3 followOffset = new Vector3(0, 5, -10);
    [SerializeField] private float dampingTime = 1f;
    [SerializeField] private bool useCollisionDetection = true;

    [Header("Free Look Settings")]
    [SerializeField] private float topRigHeight = 4.5f;
    [SerializeField] private float topRigRadius = 1.75f;
    [SerializeField] private float middleRigHeight = 2.5f;
    [SerializeField] private float middleRigRadius = 4f;
    [SerializeField] private float bottomRigHeight = 0.4f;
    [SerializeField] private float bottomRigRadius = 1.3f;

    private void Start()
    {
        SetupVirtualCamera3D();
        if (freeLookCamera != null)
        {
            SetupFreeLookCamera();
        }
    }

    public void SetupVirtualCamera3D()
    {
        if (virtualCameras3D == null || virtualCameras3D.Length == 0)
        {
            Debug.LogError("[Cinemachine3DCameraSetup] No 3D virtual cameras configured");
            return;
        }

        foreach (var virtualCamera in virtualCameras3D)
        {
            if (virtualCamera == null)
            {
                Debug.LogWarning("[Cinemachine3DCameraSetup] Null virtual camera found, skipping");
                continue;
            }

            try
            {
                // Configure camera properties
                var camera = virtualCamera.GetComponent<Camera>();
                if (camera != null)
                {
                    camera.orthographic = false;
                    camera.fieldOfView = fieldOfView;
                    camera.nearClipPlane = nearClipPlane;
                    camera.farClipPlane = farClipPlane;
                    Debug.Log($"[Cinemachine3DCameraSetup] Configured camera properties for {virtualCamera.name}");
                }

                // Configure follow behavior
                if (followTarget != null)
                {
                    virtualCamera.Follow = followTarget;

                    // Add and configure Transposer for 3D movement
                    var transposer = virtualCamera.GetCinemachineComponent<CinemachineTransposer>();
                    if (transposer == null)
                    {
                        transposer = virtualCamera.AddCinemachineComponent<CinemachineTransposer>();
                    }

                    transposer.m_FollowOffset = followOffset;
                    transposer.m_XDamping = dampingTime;
                    transposer.m_YDamping = dampingTime;
                    transposer.m_ZDamping = dampingTime;
                    transposer.m_BindingMode = CinemachineTransposer.BindingMode.LockToTargetWithWorldUp;

                    Debug.Log($"[Cinemachine3DCameraSetup] Configured follow behavior for {virtualCamera.name}");
                }

                // Configure look-at behavior
                if (lookAtTarget != null)
                {
                    virtualCamera.LookAt = lookAtTarget;

                    // Add and configure Composer for 3D framing
                    var composer = virtualCamera.GetCinemachineComponent<CinemachineComposer>();
                    if (composer == null)
                    {
                        composer = virtualCamera.AddCinemachineComponent<CinemachineComposer>();
                    }

                    composer.m_TrackedObjectOffset = Vector3.zero;
                    composer.m_LookaheadTime = 0f;
                    composer.m_LookaheadSmoothing = 10f;
                    composer.m_HorizontalDamping = dampingTime;
                    composer.m_VerticalDamping = dampingTime;

                    Debug.Log($"[Cinemachine3DCameraSetup] Configured look-at behavior for {virtualCamera.name}");
                }

                // Add collision detection for 3D cameras
                if (useCollisionDetection)
                {
                    var collider = virtualCamera.GetCinemachineComponent<CinemachineCollider>();
                    if (collider == null)
                    {
                        collider = virtualCamera.AddCinemachineComponent<CinemachineCollider>();
                    }

                    collider.m_CollideAgainst = LayerMask.GetMask("Default", "Environment");
                    collider.m_IgnoreTag = "Player";
                    collider.m_MinimumDistanceFromTarget = 0.1f;
                    collider.m_AvoidObstacles = true;
                    collider.m_DistanceLimit = 0f;
                    collider.m_MinimumOcclusionTime = 1f;
                    collider.m_CameraRadius = 0.2f;
                    collider.m_Strategy = CinemachineCollider.ResolutionStrategy.PullCameraForward;
                    collider.m_SmoothingTime = 1f;

                    Debug.Log($"[Cinemachine3DCameraSetup] Configured collision detection for {virtualCamera.name}");
                }

                Debug.Log($"[Cinemachine3DCameraSetup] 3D virtual camera {virtualCamera.name} setup completed successfully");
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[Cinemachine3DCameraSetup] Failed to setup 3D virtual camera {virtualCamera.name}: {ex.Message}");
            }
        }
    }

    public void SetupFreeLookCamera()
    {
        if (freeLookCamera == null)
        {
            Debug.LogWarning("[Cinemachine3DCameraSetup] FreeLook camera not assigned");
            return;
        }

        try
        {
            // Configure follow and look-at targets
            if (followTarget != null)
            {
                freeLookCamera.Follow = followTarget;
            }
            if (lookAtTarget != null)
            {
                freeLookCamera.LookAt = lookAtTarget;
            }

            // Configure rig settings
            freeLookCamera.m_Orbits[0].m_Height = topRigHeight;
            freeLookCamera.m_Orbits[0].m_Radius = topRigRadius;
            freeLookCamera.m_Orbits[1].m_Height = middleRigHeight;
            freeLookCamera.m_Orbits[1].m_Radius = middleRigRadius;
            freeLookCamera.m_Orbits[2].m_Height = bottomRigHeight;
            freeLookCamera.m_Orbits[2].m_Radius = bottomRigRadius;

            // Configure input axes - will be connected to Input System
            freeLookCamera.m_XAxis.m_MaxSpeed = 300f;
            freeLookCamera.m_XAxis.m_AccelTime = 0.1f;
            freeLookCamera.m_XAxis.m_DecelTime = 0.1f;
            freeLookCamera.m_XAxis.m_InputAxisName = ""; // Will be set by Input System

            freeLookCamera.m_YAxis.m_MaxSpeed = 2f;
            freeLookCamera.m_YAxis.m_AccelTime = 0.2f;
            freeLookCamera.m_YAxis.m_DecelTime = 0.1f;
            freeLookCamera.m_YAxis.m_InputAxisName = ""; // Will be set by Input System

            Debug.Log("[Cinemachine3DCameraSetup] FreeLook camera setup completed successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Cinemachine3DCameraSetup] Failed to setup FreeLook camera: {ex.Message}");
        }
    }

    public void SwitchToCamera(string cameraName)
    {
        if (string.IsNullOrEmpty(cameraName))
        {
            Debug.LogError("[Cinemachine3DCameraSetup] Camera name cannot be null or empty");
            return;
        }

        var camera = System.Array.Find(virtualCameras3D, cam => cam != null && cam.name == cameraName);
        if (camera == null)
        {
            Debug.LogError($"[Cinemachine3DCameraSetup] Camera '{cameraName}' not found");
            return;
        }

        try
        {
            // Set priority higher than other cameras
            foreach (var cam in virtualCameras3D)
            {
                if (cam != null)
                {
                    cam.Priority = (cam == camera) ? 10 : 0;
                }
            }

            Debug.Log($"[Cinemachine3DCameraSetup] Switched to camera '{cameraName}' successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Cinemachine3DCameraSetup] Failed to switch to camera '{cameraName}': {ex.Message}");
        }
    }
}
```

### 4. Camera Constraints and Confiner Setup

#### 4.1 2D Confiner Configuration

[[LLM: Include this section only if game_type is "2D" or "2D/3D Hybrid". Skip if purely 3D game.]]

```csharp
// 2D Confiner setup for boundary constraints
public class Cinemachine2DConfinerSetup : MonoBehaviour
{
    [Header("2D Confiner Configuration")]
    [SerializeField] private CinemachineVirtualCamera virtualCamera2D;
    [SerializeField] private PolygonCollider2D boundingShape;
    [SerializeField] private CompositeCollider2D compositeBounds;
    [SerializeField] private bool useComposite = false;

    [Header("Confiner Settings")]
    [SerializeField] private float dampingTime = 1f;
    [SerializeField] private bool invalidatePathCache = true;

    private CinemachineConfiner2D confiner2D;

    private void Start()
    {
        SetupConfiner2D();
    }

    public void SetupConfiner2D()
    {
        if (virtualCamera2D == null)
        {
            Debug.LogError("[Cinemachine2DConfinerSetup] Virtual camera reference is required");
            return;
        }

        try
        {
            // Add Confiner2D component
            confiner2D = virtualCamera2D.GetCinemachineComponent<CinemachineConfiner2D>();
            if (confiner2D == null)
            {
                confiner2D = virtualCamera2D.AddCinemachineComponent<CinemachineConfiner2D>();
            }

            // Configure bounding shape
            if (useComposite && compositeBounds != null)
            {
                confiner2D.m_BoundingShape2D = compositeBounds;
                Debug.Log("[Cinemachine2DConfinerSetup] Using composite collider for bounds");
            }
            else if (boundingShape != null)
            {
                confiner2D.m_BoundingShape2D = boundingShape;
                Debug.Log("[Cinemachine2DConfinerSetup] Using polygon collider for bounds");
            }
            else
            {
                Debug.LogWarning("[Cinemachine2DConfinerSetup] No bounding shape assigned");
                return;
            }

            // Configure confiner settings
            confiner2D.m_Damping = dampingTime;
            confiner2D.m_MaxWindowSize = 1f;

            if (invalidatePathCache)
            {
                confiner2D.InvalidatePathCache();
            }

            Debug.Log("[Cinemachine2DConfinerSetup] 2D confiner setup completed successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Cinemachine2DConfinerSetup] Failed to setup 2D confiner: {ex.Message}");
        }
    }

    public void UpdateBounds(Collider2D newBounds)
    {
        if (confiner2D == null)
        {
            Debug.LogError("[Cinemachine2DConfinerSetup] Confiner2D component not initialized");
            return;
        }

        if (newBounds == null)
        {
            Debug.LogWarning("[Cinemachine2DConfinerSetup] New bounds collider is null");
            return;
        }

        try
        {
            confiner2D.m_BoundingShape2D = newBounds;
            confiner2D.InvalidatePathCache();
            Debug.Log($"[Cinemachine2DConfinerSetup] Updated bounds to {newBounds.name}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Cinemachine2DConfinerSetup] Failed to update bounds: {ex.Message}");
        }
    }
}
```

#### 4.2 3D Confiner Configuration

[[LLM: Include this section only if game_type is "3D" or "2D/3D Hybrid". Skip if purely 2D game.]]

```csharp
// 3D Confiner setup for volume constraints
public class Cinemachine3DConfinerSetup : MonoBehaviour
{
    [Header("3D Confiner Configuration")]
    [SerializeField] private CinemachineVirtualCamera[] virtualCameras3D;
    [SerializeField] private Collider boundingVolume;
    [SerializeField] private bool confineScreenEdges = true;

    [Header("Confiner Settings")]
    [SerializeField] private float dampingTime = 1f;
    [SerializeField] private float minDistanceFromTarget = 1f;

    private void Start()
    {
        SetupConfiner3D();
    }

    public void SetupConfiner3D()
    {
        if (virtualCameras3D == null || virtualCameras3D.Length == 0)
        {
            Debug.LogError("[Cinemachine3DConfinerSetup] No 3D virtual cameras configured");
            return;
        }

        if (boundingVolume == null)
        {
            Debug.LogError("[Cinemachine3DConfinerSetup] Bounding volume collider is required");
            return;
        }

        foreach (var virtualCamera in virtualCameras3D)
        {
            if (virtualCamera == null)
            {
                Debug.LogWarning("[Cinemachine3DConfinerSetup] Null virtual camera found, skipping");
                continue;
            }

            try
            {
                // Add Confiner component
                var confiner = virtualCamera.GetCinemachineComponent<CinemachineConfiner>();
                if (confiner == null)
                {
                    confiner = virtualCamera.AddCinemachineComponent<CinemachineConfiner>();
                }

                // Configure confiner settings
                confiner.m_BoundingVolume = boundingVolume;
                confiner.m_ConfineMode = confineScreenEdges ?
                    CinemachineConfiner.Mode.ConfineScreenEdges :
                    CinemachineConfiner.Mode.ConfineCamera;
                confiner.m_Damping = dampingTime;
                confiner.m_MinDistanceFromTarget = minDistanceFromTarget;

                Debug.Log($"[Cinemachine3DConfinerSetup] 3D confiner setup completed for {virtualCamera.name}");
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[Cinemachine3DConfinerSetup] Failed to setup 3D confiner for {virtualCamera.name}: {ex.Message}");
            }
        }
    }

    public void UpdateBoundingVolume(Collider newVolume)
    {
        if (newVolume == null)
        {
            Debug.LogWarning("[Cinemachine3DConfinerSetup] New bounding volume is null");
            return;
        }

        boundingVolume = newVolume;

        foreach (var virtualCamera in virtualCameras3D)
        {
            if (virtualCamera == null) continue;

            var confiner = virtualCamera.GetCinemachineComponent<CinemachineConfiner>();
            if (confiner != null)
            {
                confiner.m_BoundingVolume = boundingVolume;
                Debug.Log($"[Cinemachine3DConfinerSetup] Updated bounding volume for {virtualCamera.name}");
            }
        }
    }
}
```

### 5. Camera State Management and Blending

#### 5.1 Camera State Controller

```csharp
// Camera state management system
[System.Serializable]
public class CameraState
{
    public string stateName;
    public CinemachineVirtualCameraBase virtualCamera;
    public int priority = 10;
    public float blendTime = 1f;
    public CinemachineBlendDefinition.Style blendStyle = CinemachineBlendDefinition.Style.EaseInOut;
    public bool saveState = true;
}

public class CinemachineStateManager : MonoBehaviour
{
    [Header("Camera States")]
    [SerializeField] private List<CameraState> cameraStates = new List<CameraState>();
    [SerializeField] private CameraState currentState;
    [SerializeField] private CameraState defaultState;

    [Header("Blend Settings")]
    [SerializeField] private CinemachineBlendListCamera blendListCamera;
    [SerializeField] private bool useCustomBlends = true;

    public static CinemachineStateManager Instance { get; private set; }
    public System.Action<CameraState> OnStateChanged;

    private Dictionary<string, CameraState> stateMap = new Dictionary<string, CameraState>();

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            InitializeStates();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void InitializeStates()
    {
        if (cameraStates == null || cameraStates.Count == 0)
        {
            Debug.LogError("[CinemachineStateManager] No camera states configured");
            return;
        }

        stateMap.Clear();

        foreach (var state in cameraStates)
        {
            if (state == null || string.IsNullOrEmpty(state.stateName))
            {
                Debug.LogWarning("[CinemachineStateManager] Invalid camera state found, skipping");
                continue;
            }

            if (state.virtualCamera == null)
            {
                Debug.LogError($"[CinemachineStateManager] Virtual camera is null for state '{state.stateName}'");
                continue;
            }

            try
            {
                stateMap[state.stateName] = state;
                // Initially disable all cameras except default
                state.virtualCamera.Priority = 0;
                Debug.Log($"[CinemachineStateManager] Registered camera state '{state.stateName}'");
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[CinemachineStateManager] Failed to register state '{state.stateName}': {ex.Message}");
            }
        }

        // Set default state
        if (defaultState != null)
        {
            SetCameraState(defaultState.stateName);
        }
        else if (cameraStates.Count > 0)
        {
            SetCameraState(cameraStates[0].stateName);
        }
    }

    public void SetCameraState(string stateName)
    {
        if (string.IsNullOrEmpty(stateName))
        {
            Debug.LogError("[CinemachineStateManager] State name cannot be null or empty");
            return;
        }

        if (!stateMap.ContainsKey(stateName))
        {
            Debug.LogError($"[CinemachineStateManager] Camera state '{stateName}' not found");
            return;
        }

        var newState = stateMap[stateName];
        if (newState.virtualCamera == null)
        {
            Debug.LogError($"[CinemachineStateManager] Virtual camera is null for state '{stateName}'");
            return;
        }

        try
        {
            // Disable current state
            if (currentState != null && currentState.virtualCamera != null)
            {
                currentState.virtualCamera.Priority = 0;
            }

            // Enable new state
            newState.virtualCamera.Priority = newState.priority;
            currentState = newState;

            // Configure blend if using blend list camera
            if (useCustomBlends && blendListCamera != null)
            {
                ConfigureCustomBlend(newState);
            }

            // Invoke state change event
            OnStateChanged?.Invoke(newState);

            Debug.Log($"[CinemachineStateManager] Switched to camera state '{stateName}' successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineStateManager] Failed to switch to state '{stateName}': {ex.Message}");
        }
    }

    private void ConfigureCustomBlend(CameraState state)
    {
        try
        {
            if (blendListCamera == null)
            {
                Debug.LogWarning("[CinemachineStateManager] Blend list camera not assigned");
                return;
            }

            // Configure blend instructions for this state transition
            var blendDefinition = new CinemachineBlendDefinition(state.blendStyle, state.blendTime);

            // Note: This would require access to the blend list camera's instruction list
            // Implementation depends on specific blend requirements

            Debug.Log($"[CinemachineStateManager] Configured custom blend for state '{state.stateName}'");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineStateManager] Failed to configure custom blend: {ex.Message}");
        }
    }

    public CameraState GetCurrentState()
    {
        return currentState;
    }

    public bool IsInState(string stateName)
    {
        return currentState != null && currentState.stateName == stateName;
    }

    public void SaveCurrentState()
    {
        if (currentState != null && currentState.saveState)
        {
            PlayerPrefs.SetString("LastCameraState", currentState.stateName);
            Debug.Log($"[CinemachineStateManager] Saved camera state '{currentState.stateName}'");
        }
    }

    public void LoadSavedState()
    {
        if (PlayerPrefs.HasKey("LastCameraState"))
        {
            string savedState = PlayerPrefs.GetString("LastCameraState");
            SetCameraState(savedState);
            Debug.Log($"[CinemachineStateManager] Loaded saved camera state '{savedState}'");
        }
    }
}
```

### 6. Timeline Integration

#### 6.1 Cinemachine Timeline Track Setup

```csharp
// Timeline integration for Cinemachine cameras
using UnityEngine;
using UnityEngine.Timeline;
using UnityEngine.Playables;
using Cinemachine;

public class CinemachineTimelineIntegration : MonoBehaviour
{
    [Header("Timeline Configuration")]
    [SerializeField] private PlayableDirector timelineDirector;
    [SerializeField] private TimelineAsset timelineAsset;

    [Header("Camera Integration")]
    [SerializeField] private CinemachineBrain cinemachineBrain;
    [SerializeField] private List<CinemachineVirtualCameraBase> timelineCameras;

    private CinemachineTrack cameraTrack;

    private void Start()
    {
        SetupTimelineIntegration();
    }

    public void SetupTimelineIntegration()
    {
        if (timelineDirector == null)
        {
            Debug.LogError("[CinemachineTimelineIntegration] Timeline director is required");
            return;
        }

        if (timelineAsset == null)
        {
            Debug.LogError("[CinemachineTimelineIntegration] Timeline asset is required");
            return;
        }

        if (cinemachineBrain == null)
        {
            Debug.LogError("[CinemachineTimelineIntegration] Cinemachine brain is required");
            return;
        }

        try
        {
            // Create Cinemachine track if it doesn't exist
            cameraTrack = FindCinemachineTrack();
            if (cameraTrack == null)
            {
                cameraTrack = timelineAsset.CreateTrack<CinemachineTrack>(null, "Cinemachine Cameras");
                Debug.Log("[CinemachineTimelineIntegration] Created new Cinemachine track");
            }

            // Bind the brain to the track
            timelineDirector.SetGenericBinding(cameraTrack, cinemachineBrain);

            // Configure timeline cameras for Track usage
            ConfigureTimelineCameras();

            Debug.Log("[CinemachineTimelineIntegration] Timeline integration setup completed successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineTimelineIntegration] Failed to setup Timeline integration: {ex.Message}");
        }
    }

    private CinemachineTrack FindCinemachineTrack()
    {
        if (timelineAsset == null) return null;

        foreach (var track in timelineAsset.GetOutputTracks())
        {
            if (track is CinemachineTrack cineTrack)
            {
                return cineTrack;
            }
        }
        return null;
    }

    private void ConfigureTimelineCameras()
    {
        if (timelineCameras == null || timelineCameras.Count == 0)
        {
            Debug.LogWarning("[CinemachineTimelineIntegration] No timeline cameras configured");
            return;
        }

        foreach (var camera in timelineCameras)
        {
            if (camera == null)
            {
                Debug.LogWarning("[CinemachineTimelineIntegration] Null camera found in timeline cameras list");
                continue;
            }

            try
            {
                // Set low priority for timeline cameras (Timeline will override)
                camera.Priority = 0;

                // Ensure cameras are properly configured for Timeline usage
                if (camera is CinemachineVirtualCamera vcam)
                {
                    // Additional configuration for virtual cameras
                    vcam.m_StandbyUpdate = CinemachineVirtualCameraBase.StandbyUpdateMode.RoundRobin;
                }

                Debug.Log($"[CinemachineTimelineIntegration] Configured timeline camera '{camera.name}'");
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[CinemachineTimelineIntegration] Failed to configure camera '{camera.name}': {ex.Message}");
            }
        }
    }

    public void AddCameraToTimeline(CinemachineVirtualCameraBase camera, float startTime, float duration)
    {
        if (camera == null)
        {
            Debug.LogError("[CinemachineTimelineIntegration] Camera cannot be null");
            return;
        }

        if (cameraTrack == null)
        {
            Debug.LogError("[CinemachineTimelineIntegration] Camera track not initialized");
            return;
        }

        try
        {
            // Create a shot clip for the camera
            var shotClip = cameraTrack.CreateClip<CinemachineShotClip>();
            shotClip.start = startTime;
            shotClip.duration = duration;
            shotClip.displayName = $"Shot - {camera.name}";

            // Bind the camera to the clip
            timelineDirector.SetReferenceValue(shotClip.exposedParameters.FirstOrDefault().exposedName, camera);

            Debug.Log($"[CinemachineTimelineIntegration] Added camera '{camera.name}' to Timeline at {startTime}s for {duration}s");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineTimelineIntegration] Failed to add camera to Timeline: {ex.Message}");
        }
    }
}
```

### 7. Input System Integration

#### 7.1 Camera Input Controller

```csharp
using UnityEngine;
using UnityEngine.InputSystem;
using Cinemachine;

public class CinemachineInputController : MonoBehaviour
{
    [Header("Input Configuration")]
    [SerializeField] private InputActionReference lookAction;
    [SerializeField] private InputActionReference zoomAction;
    [SerializeField] private InputActionReference switchCameraAction;

    [Header("Camera References")]
    [SerializeField] private CinemachineFreeLook freeLookCamera;
    [SerializeField] private CinemachineVirtualCamera[] switchableCameras;

    [Header("Input Settings")]
    [SerializeField] private float lookSensitivity = 1f;
    [SerializeField] private float zoomSensitivity = 1f;
    [SerializeField] private bool invertY = false;
    [SerializeField] private bool enableMouseInput = true;
    [SerializeField] private bool enableGamepadInput = true;

    private int currentCameraIndex = 0;
    private CinemachineInputProvider inputProvider;

    private void Awake()
    {
        // Get or add input provider
        inputProvider = GetComponent<CinemachineInputProvider>();
        if (inputProvider == null)
        {
            inputProvider = gameObject.AddComponent<CinemachineInputProvider>();
        }
    }

    private void OnEnable()
    {
        if (lookAction != null)
        {
            lookAction.action.performed += OnLook;
            lookAction.action.Enable();
        }

        if (zoomAction != null)
        {
            zoomAction.action.performed += OnZoom;
            zoomAction.action.Enable();
        }

        if (switchCameraAction != null)
        {
            switchCameraAction.action.performed += OnSwitchCamera;
            switchCameraAction.action.Enable();
        }

        SetupInputProvider();
    }

    private void OnDisable()
    {
        if (lookAction != null)
        {
            lookAction.action.performed -= OnLook;
            lookAction.action.Disable();
        }

        if (zoomAction != null)
        {
            zoomAction.action.performed -= OnZoom;
            zoomAction.action.Disable();
        }

        if (switchCameraAction != null)
        {
            switchCameraAction.action.performed -= OnSwitchCamera;
            switchCameraAction.action.Disable();
        }
    }

    private void SetupInputProvider()
    {
        if (inputProvider == null)
        {
            Debug.LogError("[CinemachineInputController] Input provider not found");
            return;
        }

        try
        {
            // Configure input axes for FreeLook camera
            if (freeLookCamera != null && lookAction != null)
            {
                inputProvider.XYAxis = lookAction;
                freeLookCamera.m_XAxis.m_InputAxisName = "";
                freeLookCamera.m_YAxis.m_InputAxisName = "";

                // Apply sensitivity settings
                freeLookCamera.m_XAxis.m_MaxSpeed = 300f * lookSensitivity;
                freeLookCamera.m_YAxis.m_MaxSpeed = 2f * lookSensitivity;

                if (invertY)
                {
                    freeLookCamera.m_YAxis.m_InvertInput = true;
                }

                Debug.Log("[CinemachineInputController] Configured FreeLook camera input");
            }

            Debug.Log("[CinemachineInputController] Input provider setup completed successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineInputController] Failed to setup input provider: {ex.Message}");
        }
    }

    private void OnLook(InputAction.CallbackContext context)
    {
        if (!enableMouseInput && context.control.device is Mouse) return;
        if (!enableGamepadInput && context.control.device is Gamepad) return;

        Vector2 lookInput = context.ReadValue<Vector2>();

        // FreeLook camera handles input automatically through InputProvider
        // Additional custom look behavior can be implemented here
    }

    private void OnZoom(InputAction.CallbackContext context)
    {
        float zoomInput = context.ReadValue<float>() * zoomSensitivity;

        try
        {
            // Handle zoom for different camera types
            if (freeLookCamera != null && freeLookCamera.Priority > 0)
            {
                // Adjust middle rig radius for zoom effect
                freeLookCamera.m_Orbits[1].m_Radius = Mathf.Clamp(
                    freeLookCamera.m_Orbits[1].m_Radius - zoomInput,
                    1f, 20f);
            }

            // Handle 2D camera zoom (orthographic size)
            var activeCam = CinemachineCore.Instance.GetActiveBrain(0)?.ActiveVirtualCamera as CinemachineVirtualCamera;
            if (activeCam != null)
            {
                var camera = activeCam.VirtualCameraGameObject.GetComponent<Camera>();
                if (camera != null && camera.orthographic)
                {
                    camera.orthographicSize = Mathf.Clamp(camera.orthographicSize - zoomInput * 0.5f, 1f, 20f);
                }
                else if (camera != null && !camera.orthographic)
                {
                    camera.fieldOfView = Mathf.Clamp(camera.fieldOfView - zoomInput * 2f, 20f, 100f);
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineInputController] Failed to handle zoom input: {ex.Message}");
        }
    }

    private void OnSwitchCamera(InputAction.CallbackContext context)
    {
        if (switchableCameras == null || switchableCameras.Length == 0)
        {
            Debug.LogWarning("[CinemachineInputController] No switchable cameras configured");
            return;
        }

        try
        {
            // Cycle through cameras
            currentCameraIndex = (currentCameraIndex + 1) % switchableCameras.Length;

            // Set priorities
            for (int i = 0; i < switchableCameras.Length; i++)
            {
                if (switchableCameras[i] != null)
                {
                    switchableCameras[i].Priority = (i == currentCameraIndex) ? 10 : 0;
                }
            }

            Debug.Log($"[CinemachineInputController] Switched to camera {currentCameraIndex}: {switchableCameras[currentCameraIndex].name}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineInputController] Failed to switch camera: {ex.Message}");
        }
    }

    public void SetLookSensitivity(float sensitivity)
    {
        lookSensitivity = Mathf.Clamp(sensitivity, 0.1f, 5f);

        if (freeLookCamera != null)
        {
            freeLookCamera.m_XAxis.m_MaxSpeed = 300f * lookSensitivity;
            freeLookCamera.m_YAxis.m_MaxSpeed = 2f * lookSensitivity;
        }
    }

    public void SetZoomSensitivity(float sensitivity)
    {
        zoomSensitivity = Mathf.Clamp(sensitivity, 0.1f, 5f);
    }

    public void ToggleInvertY()
    {
        invertY = !invertY;
        if (freeLookCamera != null)
        {
            freeLookCamera.m_YAxis.m_InvertInput = invertY;
        }
    }
}
```

### 8. Camera Effects and Impulse System

#### 8.1 Camera Shake and Impulse Configuration

```csharp
// Camera shake and impulse system
using UnityEngine;
using Cinemachine;

public class CinemachineEffectsManager : MonoBehaviour
{
    [Header("Impulse Configuration")]
    [SerializeField] private CinemachineImpulseSource impulseSource;
    [SerializeField] private CinemachineImpulseListener impulseListener;

    [Header("Noise Profiles")]
    [SerializeField] private NoiseSettings explosionNoise;
    [SerializeField] private NoiseSettings walkingNoise;
    [SerializeField] private NoiseSettings hurtNoise;
    [SerializeField] private NoiseSettings idleNoise;

    [Header("Effect Settings")]
    [SerializeField] private float defaultShakeAmplitude = 1f;
    [SerializeField] private float defaultShakeFrequency = 1f;
    [SerializeField] private float defaultShakeDuration = 0.5f;
    [SerializeField] private bool use2DEffects = false;

    public static CinemachineEffectsManager Instance { get; private set; }

    private CinemachineVirtualCameraBase activeCamera;
    private CinemachineBasicMultiChannelPerlin noiseComponent;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            InitializeEffects();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void InitializeEffects()
    {
        try
        {
            // Setup impulse source if not assigned
            if (impulseSource == null)
            {
                impulseSource = GetComponent<CinemachineImpulseSource>();
                if (impulseSource == null)
                {
                    impulseSource = gameObject.AddComponent<CinemachineImpulseSource>();
                }
            }

            // Configure impulse source
            impulseSource.m_ImpulseDefinition.m_AmplitudeGain = defaultShakeAmplitude;
            impulseSource.m_ImpulseDefinition.m_FrequencyGain = defaultShakeFrequency;
            impulseSource.m_ImpulseDefinition.m_TimeEnvelope.m_SustainTime = defaultShakeDuration;

            // Setup impulse listener if not assigned
            if (impulseListener == null)
            {
                impulseListener = GetComponent<CinemachineImpulseListener>();
                if (impulseListener == null)
                {
                    impulseListener = gameObject.AddComponent<CinemachineImpulseListener>();
                }
            }

            // Configure impulse listener
            impulseListener.m_Gain = 1f;
            impulseListener.m_Use2DDistance = use2DEffects;

            Debug.Log("[CinemachineEffectsManager] Effects system initialized successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineEffectsManager] Failed to initialize effects system: {ex.Message}");
        }
    }

    public void TriggerShake(ShakeType shakeType, Vector3 position, float intensity = 1f)
    {
        if (impulseSource == null)
        {
            Debug.LogError("[CinemachineEffectsManager] Impulse source not initialized");
            return;
        }

        try
        {
            // Configure impulse based on shake type
            ConfigureImpulseForShakeType(shakeType, intensity);

            // Set position for positional shake
            transform.position = position;

            // Generate impulse
            impulseSource.GenerateImpulse();

            Debug.Log($"[CinemachineEffectsManager] Triggered {shakeType} shake at {position} with intensity {intensity}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineEffectsManager] Failed to trigger shake: {ex.Message}");
        }
    }

    public void ApplyNoiseProfile(NoiseSettings profile, float amplitudeGain = 1f, float frequencyGain = 1f)
    {
        if (profile == null)
        {
            Debug.LogError("[CinemachineEffectsManager] Noise profile cannot be null");
            return;
        }

        try
        {
            UpdateActiveCamera();

            if (noiseComponent == null)
            {
                Debug.LogWarning("[CinemachineEffectsManager] No noise component found on active camera");
                return;
            }

            noiseComponent.m_NoiseProfile = profile;
            noiseComponent.m_AmplitudeGain = amplitudeGain;
            noiseComponent.m_FrequencyGain = frequencyGain;

            Debug.Log($"[CinemachineEffectsManager] Applied noise profile '{profile.name}' with gains A:{amplitudeGain} F:{frequencyGain}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineEffectsManager] Failed to apply noise profile: {ex.Message}");
        }
    }

    private void ConfigureImpulseForShakeType(ShakeType shakeType, float intensity)
    {
        switch (shakeType)
        {
            case ShakeType.Explosion:
                impulseSource.m_ImpulseDefinition.m_AmplitudeGain = 2f * intensity;
                impulseSource.m_ImpulseDefinition.m_FrequencyGain = 1.5f;
                impulseSource.m_ImpulseDefinition.m_TimeEnvelope.m_SustainTime = 0.3f;
                break;

            case ShakeType.Impact:
                impulseSource.m_ImpulseDefinition.m_AmplitudeGain = 1.5f * intensity;
                impulseSource.m_ImpulseDefinition.m_FrequencyGain = 2f;
                impulseSource.m_ImpulseDefinition.m_TimeEnvelope.m_SustainTime = 0.2f;
                break;

            case ShakeType.Rumble:
                impulseSource.m_ImpulseDefinition.m_AmplitudeGain = 0.5f * intensity;
                impulseSource.m_ImpulseDefinition.m_FrequencyGain = 0.8f;
                impulseSource.m_ImpulseDefinition.m_TimeEnvelope.m_SustainTime = 1f;
                break;

            case ShakeType.Subtle:
                impulseSource.m_ImpulseDefinition.m_AmplitudeGain = 0.3f * intensity;
                impulseSource.m_ImpulseDefinition.m_FrequencyGain = 0.5f;
                impulseSource.m_ImpulseDefinition.m_TimeEnvelope.m_SustainTime = 0.5f;
                break;

            default:
                impulseSource.m_ImpulseDefinition.m_AmplitudeGain = defaultShakeAmplitude * intensity;
                impulseSource.m_ImpulseDefinition.m_FrequencyGain = defaultShakeFrequency;
                impulseSource.m_ImpulseDefinition.m_TimeEnvelope.m_SustainTime = defaultShakeDuration;
                break;
        }
    }

    private void UpdateActiveCamera()
    {
        var brain = CinemachineCore.Instance.GetActiveBrain(0);
        if (brain != null)
        {
            activeCamera = brain.ActiveVirtualCamera;

            if (activeCamera is CinemachineVirtualCamera vcam)
            {
                noiseComponent = vcam.GetCinemachineComponent<CinemachineBasicMultiChannelPerlin>();
                if (noiseComponent == null)
                {
                    noiseComponent = vcam.AddCinemachineComponent<CinemachineBasicMultiChannelPerlin>();
                }
            }
        }
    }

    public void StopShake()
    {
        try
        {
            if (noiseComponent != null)
            {
                noiseComponent.m_AmplitudeGain = 0f;
                noiseComponent.m_FrequencyGain = 0f;
                Debug.Log("[CinemachineEffectsManager] Stopped camera shake");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineEffectsManager] Failed to stop shake: {ex.Message}");
        }
    }
}

public enum ShakeType
{
    Explosion,
    Impact,
    Rumble,
    Subtle
}
```

### 9. Mobile Optimization

#### 9.1 Mobile Performance Settings

[[LLM: Apply mobile optimizations only if target_platform includes mobile devices. Adapt settings based on performance_profile (High/Medium/Low).]]

```csharp
public class CinemachineMobileOptimization : MonoBehaviour
{
    [Header("Mobile Performance Settings")]
    [SerializeField] private bool enableMobileOptimizations = true;
    [SerializeField] private int targetFrameRate = 30;
    [SerializeField] private CinemachineCore.UpdateFilter updateFilter = CinemachineCore.UpdateFilter.Fixed;
    [SerializeField] private float lodBias = 2.0f;
    [SerializeField] private bool reducedQualityMode = true;

    [Header("Camera Optimization")]
    [SerializeField] private int maxActiveCameras = 2;
    [SerializeField] private bool disableUnusedCameras = true;
    [SerializeField] private float cullingDistance = 50f;
    [SerializeField] private bool optimizeBlends = true;

    private List<CinemachineVirtualCameraBase> allCameras = new List<CinemachineVirtualCameraBase>();

    private void Start()
    {
        if (enableMobileOptimizations)
        {
            ApplyMobileOptimizations();
        }
    }

    public void ApplyMobileOptimizations()
    {
        try
        {
            // Set mobile quality settings
            if (reducedQualityMode)
            {
                Application.targetFrameRate = targetFrameRate;
                QualitySettings.lodBias = lodBias;
                Debug.Log($"[CinemachineMobileOptimization] Applied mobile quality settings: FPS={targetFrameRate}, LOD Bias={lodBias}");
            }

            // Configure Cinemachine update settings
            CinemachineCore.UniformDeltaTimeOverride = 1f / targetFrameRate;
            CinemachineCore.CurrentUpdateFilter = updateFilter;

            // Optimize camera settings
            OptimizeCameraSettings();

            // Setup camera culling
            if (disableUnusedCameras)
            {
                StartCoroutine(CameraCullingCoroutine());
            }

            Debug.Log("[CinemachineMobileOptimization] Mobile optimizations applied successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachineMobileOptimization] Failed to apply mobile optimizations: {ex.Message}");
        }
    }

    private void OptimizeCameraSettings()
    {
        allCameras.Clear();
        allCameras.AddRange(FindObjectsOfType<CinemachineVirtualCameraBase>());

        if (allCameras.Count == 0)
        {
            Debug.LogWarning("[CinemachineMobileOptimization] No virtual cameras found");
            return;
        }

        foreach (var camera in allCameras)
        {
            if (camera == null) continue;

            try
            {
                // Optimize standby update mode
                camera.m_StandbyUpdate = CinemachineVirtualCameraBase.StandbyUpdateMode.Never;

                // Reduce lens settings precision for mobile
                if (camera is CinemachineVirtualCamera vcam)
                {
                    var lens = vcam.m_Lens;
                    lens.NearClipPlane = Mathf.Max(lens.NearClipPlane, 0.3f); // Increase near clip
                    lens.FarClipPlane = Mathf.Min(lens.FarClipPlane, cullingDistance); // Reduce far clip
                    vcam.m_Lens = lens;

                    // Optimize noise settings
                    var noise = vcam.GetCinemachineComponent<CinemachineBasicMultiChannelPerlin>();
                    if (noise != null)
                    {
                        noise.m_FrequencyGain = Mathf.Min(noise.m_FrequencyGain, 1f);
                    }
                }

                // Optimize FreeLook cameras
                if (camera is CinemachineFreeLook freeLook)
                {
                    freeLook.m_XAxis.m_AccelTime = Mathf.Max(freeLook.m_XAxis.m_AccelTime, 0.2f);
                    freeLook.m_YAxis.m_AccelTime = Mathf.Max(freeLook.m_YAxis.m_AccelTime, 0.2f);
                    freeLook.m_RecenterToTargetHeading.m_enabled = false; // Reduce processing
                }

                Debug.Log($"[CinemachineMobileOptimization] Optimized camera settings for {camera.name}");
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[CinemachineMobileOptimization] Failed to optimize camera {camera.name}: {ex.Message}");
            }
        }
    }

    private System.Collections.IEnumerator CameraCullingCoroutine()
    {
        while (true)
        {
            try
            {
                var activeBrain = CinemachineCore.Instance.GetActiveBrain(0);
                if (activeBrain == null)
                {
                    yield return new WaitForSeconds(1f);
                    continue;
                }

                var activeCamera = activeBrain.ActiveVirtualCamera;
                int activeCameraCount = 0;

                foreach (var camera in allCameras)
                {
                    if (camera == null) continue;

                    bool shouldBeActive = (camera == activeCamera || camera.Priority > 0);

                    if (shouldBeActive)
                    {
                        activeCameraCount++;
                        if (activeCameraCount > maxActiveCameras)
                        {
                            camera.gameObject.SetActive(false);
                            Debug.Log($"[CinemachineMobileOptimization] Deactivated camera {camera.name} (exceeds max active limit)");
                        }
                        else
                        {
                            camera.gameObject.SetActive(true);
                        }
                    }
                    else
                    {
                        camera.gameObject.SetActive(false);
                    }
                }
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[CinemachineMobileOptimization] Error in camera culling: {ex.Message}");
            }

            yield return new WaitForSeconds(2f); // Check every 2 seconds
        }
    }

    public void SetMobileOptimizationLevel(MobileOptimizationLevel level)
    {
        switch (level)
        {
            case MobileOptimizationLevel.Low:
                targetFrameRate = 60;
                maxActiveCameras = 4;
                updateFilter = CinemachineCore.UpdateFilter.Late;
                break;

            case MobileOptimizationLevel.Medium:
                targetFrameRate = 45;
                maxActiveCameras = 3;
                updateFilter = CinemachineCore.UpdateFilter.Fixed;
                break;

            case MobileOptimizationLevel.High:
                targetFrameRate = 30;
                maxActiveCameras = 2;
                updateFilter = CinemachineCore.UpdateFilter.Fixed;
                break;
        }

        ApplyMobileOptimizations();
    }
}

public enum MobileOptimizationLevel
{
    Low,    // Better quality, lower performance
    Medium, // Balanced
    High    // Better performance, lower quality
}
```

### 10. Testing and Validation

#### 10.1 Cinemachine Integration Tests

```csharp
// Assets/Tests/Cinemachine/CinemachineIntegrationTests.cs
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Cinemachine;

[TestFixture]
public class CinemachineIntegrationTests
{
    private GameObject testCameraObject;
    private CinemachineVirtualCamera testCamera;
    private CinemachineBrain testBrain;

    [SetUp]
    public void Setup()
    {
        // Create test camera setup
        testCameraObject = new GameObject("TestCamera");
        testCamera = testCameraObject.AddComponent<CinemachineVirtualCamera>();

        var brainObject = new GameObject("TestBrain");
        testBrain = brainObject.AddComponent<CinemachineBrain>();
        brainObject.AddComponent<Camera>();
    }

    [TearDown]
    public void TearDown()
    {
        if (testCameraObject != null)
            Object.DestroyImmediate(testCameraObject);
        if (testBrain != null)
            Object.DestroyImmediate(testBrain.gameObject);
    }

    [Test]
    public void Cinemachine_CameraStructure_ExistsCorrectly()
    {
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/Cameras"));
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/Cameras/VirtualCameras"));
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/Cameras/Constraints"));
    }

    [Test]
    public void Cinemachine_VirtualCamera_ConfiguresCorrectly()
    {
        Assert.IsNotNull(testCamera);

        testCamera.Priority = 10;
        Assert.AreEqual(10, testCamera.Priority);

        // Test follow target assignment
        var target = new GameObject("Target");
        testCamera.Follow = target.transform;
        Assert.AreEqual(target.transform, testCamera.Follow);

        Object.DestroyImmediate(target);
    }

    [Test]
    public void Cinemachine_Brain_ConfiguresCorrectly()
    {
        Assert.IsNotNull(testBrain);

        var blend = new CinemachineBlendDefinition(CinemachineBlendDefinition.Style.EaseInOut, 1f);
        testBrain.m_DefaultBlend = blend;

        Assert.AreEqual(blend.m_Style, testBrain.m_DefaultBlend.m_Style);
        Assert.AreEqual(blend.m_Time, testBrain.m_DefaultBlend.m_Time);
    }

    [UnityTest]
    public System.Collections.IEnumerator Cinemachine_CameraTransition_WorksCorrectly()
    {
        // Create second camera
        var secondCameraObject = new GameObject("TestCamera2");
        var secondCamera = secondCameraObject.AddComponent<CinemachineVirtualCamera>();

        testCamera.Priority = 10;
        secondCamera.Priority = 0;

        yield return new WaitForSeconds(0.1f);

        // Test priority switching
        testCamera.Priority = 0;
        secondCamera.Priority = 10;

        yield return new WaitForSeconds(0.1f);

        Assert.AreEqual(10, secondCamera.Priority);
        Assert.AreEqual(0, testCamera.Priority);

        Object.DestroyImmediate(secondCameraObject);
    }

    [Test]
    public void Cinemachine_Components_AddCorrectly()
    {
        // Test adding Transposer
        var transposer = testCamera.AddCinemachineComponent<CinemachineTransposer>();
        Assert.IsNotNull(transposer);

        // Test adding Composer
        var composer = testCamera.AddCinemachineComponent<CinemachineComposer>();
        Assert.IsNotNull(composer);

        // Test adding Noise
        var noise = testCamera.AddCinemachineComponent<CinemachineBasicMultiChannelPerlin>();
        Assert.IsNotNull(noise);
    }

    [Test]
    public void Cinemachine_2DConfiner_ConfiguresCorrectly()
    {
        var confinerObject = new GameObject("Confiner");
        var collider2D = confinerObject.AddComponent<PolygonCollider2D>();

        var confiner = testCamera.AddCinemachineComponent<CinemachineConfiner2D>();
        confiner.m_BoundingShape2D = collider2D;

        Assert.IsNotNull(confiner);
        Assert.AreEqual(collider2D, confiner.m_BoundingShape2D);

        Object.DestroyImmediate(confinerObject);
    }

    [Test]
    public void Cinemachine_3DConfiner_ConfiguresCorrectly()
    {
        var confinerObject = new GameObject("Confiner3D");
        var collider3D = confinerObject.AddComponent<BoxCollider>();

        var confiner = testCamera.AddCinemachineComponent<CinemachineConfiner>();
        confiner.m_BoundingVolume = collider3D;

        Assert.IsNotNull(confiner);
        Assert.AreEqual(collider3D, confiner.m_BoundingVolume);

        Object.DestroyImmediate(confinerObject);
    }
}
```

#### 10.2 Performance Validation

[[LLM: Customize performance thresholds based on target_platform. Mobile: Max 2 active cameras, 33ms frame time. Desktop: Max 4 cameras, 16.67ms frame time. Console: Max 3 cameras, 16.67ms frame time.]]

```csharp
public class CinemachinePerformanceValidator : MonoBehaviour
{
    [Header("Performance Thresholds")]
    [SerializeField] private float maxFrameTime = 16.67f; // 60 FPS target
    [SerializeField] private int maxActiveCameras = 3;
    [SerializeField] private float maxMemoryUsageMB = 50f;
    [SerializeField] private bool enableDetailedLogging = false;

    [Header("Validation Settings")]
    [SerializeField] private float validationInterval = 2f;
    [SerializeField] private bool continousValidation = true;

    private float lastValidationTime;
    private List<CinemachineVirtualCameraBase> allCameras = new List<CinemachineVirtualCameraBase>();

    private void Start()
    {
        RefreshCameraList();

        if (continousValidation)
        {
            InvokeRepeating(nameof(ValidatePerformance), validationInterval, validationInterval);
        }
    }

    public bool ValidatePerformance()
    {
        try
        {
            bool isValid = true;

            // Validate frame time
            float currentFrameTime = Time.deltaTime * 1000f;
            if (currentFrameTime > maxFrameTime)
            {
                Debug.LogWarning($"[CinemachinePerformanceValidator] Frame time exceeded: {currentFrameTime:F2}ms (max: {maxFrameTime}ms)");
                isValid = false;
            }

            // Validate active camera count
            int activeCameraCount = GetActiveCameraCount();
            if (activeCameraCount > maxActiveCameras)
            {
                Debug.LogWarning($"[CinemachinePerformanceValidator] Too many active cameras: {activeCameraCount}/{maxActiveCameras}");
                isValid = false;
            }

            // Validate memory usage
            float memoryUsage = GetCinemachineMemoryUsage();
            if (memoryUsage > maxMemoryUsageMB)
            {
                Debug.LogWarning($"[CinemachinePerformanceValidator] Memory usage exceeded: {memoryUsage:F2}MB (max: {maxMemoryUsageMB}MB)");
                isValid = false;
            }

            // Validate Cinemachine brain state
            if (!ValidateBrainState())
            {
                Debug.LogWarning("[CinemachinePerformanceValidator] Brain state validation failed");
                isValid = false;
            }

            if (enableDetailedLogging)
            {
                Debug.Log($"[CinemachinePerformanceValidator] Performance check - " +
                         $"Frame: {currentFrameTime:F2}ms, Cameras: {activeCameraCount}, Memory: {memoryUsage:F2}MB");
            }

            lastValidationTime = Time.time;
            return isValid;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[CinemachinePerformanceValidator] Performance validation failed: {ex.Message}");
            return false;
        }
    }

    private int GetActiveCameraCount()
    {
        RefreshCameraList();

        int activeCount = 0;
        foreach (var camera in allCameras)
        {
            if (camera != null && camera.gameObject.activeInHierarchy && camera.Priority > 0)
            {
                activeCount++;
            }
        }

        return activeCount;
    }

    private float GetCinemachineMemoryUsage()
    {
        // Estimate memory usage based on active cameras and components
        float estimatedUsage = 0f;

        foreach (var camera in allCameras)
        {
            if (camera != null && camera.gameObject.activeInHierarchy)
            {
                estimatedUsage += 2f; // Base camera memory

                // Add component overhead
                var components = camera.GetComponents<CinemachineComponentBase>();
                estimatedUsage += components.Length * 0.5f;
            }
        }

        return estimatedUsage;
    }

    private bool ValidateBrainState()
    {
        var brain = CinemachineCore.Instance.GetActiveBrain(0);
        if (brain == null)
        {
            Debug.LogError("[CinemachinePerformanceValidator] No active Cinemachine brain found");
            return false;
        }

        if (brain.ActiveVirtualCamera == null)
        {
            Debug.LogWarning("[CinemachinePerformanceValidator] No active virtual camera found");
            return false;
        }

        return true;
    }

    private void RefreshCameraList()
    {
        allCameras.Clear();
        allCameras.AddRange(FindObjectsOfType<CinemachineVirtualCameraBase>());
    }

    public void SetPerformanceProfile(PerformanceProfile profile)
    {
        switch (profile)
        {
            case PerformanceProfile.Mobile:
                maxFrameTime = 33.33f; // 30 FPS
                maxActiveCameras = 2;
                maxMemoryUsageMB = 30f;
                break;

            case PerformanceProfile.Console:
                maxFrameTime = 16.67f; // 60 FPS
                maxActiveCameras = 3;
                maxMemoryUsageMB = 50f;
                break;

            case PerformanceProfile.Desktop:
                maxFrameTime = 16.67f; // 60 FPS
                maxActiveCameras = 4;
                maxMemoryUsageMB = 100f;
                break;
        }

        Debug.Log($"[CinemachinePerformanceValidator] Set performance profile to {profile}");
    }

    public ValidationReport GenerateReport()
    {
        var report = new ValidationReport
        {
            timestamp = System.DateTime.Now,
            frameTime = Time.deltaTime * 1000f,
            activeCameraCount = GetActiveCameraCount(),
            memoryUsage = GetCinemachineMemoryUsage(),
            isValid = ValidatePerformance()
        };

        return report;
    }
}

public enum PerformanceProfile
{
    Mobile,
    Console,
    Desktop
}

[System.Serializable]
public class ValidationReport
{
    public System.DateTime timestamp;
    public float frameTime;
    public int activeCameraCount;
    public float memoryUsage;
    public bool isValid;
}
```

### 11. Documentation and Integration

#### 11.1 Generate Cinemachine API Reference

Create `docs/package-integration/cinemachine-system.md`:

````markdown
# Unity Cinemachine Integration Guide

## Quick Start

### Setting up a 2D Follow Camera

```csharp
var vcam = GameObject.FindObjectOfType<CinemachineVirtualCamera>();
vcam.Follow = playerTransform;
vcam.GetCinemachineComponent<CinemachineTransposer>().m_FollowOffset = new Vector3(0, 2, -10);
```
````

### Setting up a 3D FreeLook Camera

```csharp
var freeLook = GameObject.FindObjectOfType<CinemachineFreeLook>();
freeLook.Follow = playerTransform;
freeLook.LookAt = playerTransform;
freeLook.m_Orbits[1].m_Radius = 5f; // Middle rig radius
```

### Triggering Camera Shake

```csharp
CinemachineEffectsManager.Instance.TriggerShake(
    ShakeType.Explosion,
    explosionPosition,
    intensity: 1.5f
);
```

## Common Patterns

### Camera State Switching

[Source: CinemachineStateManager.cs]

### Input System Integration

[Source: CinemachineInputController.cs]

### Timeline Integration

[Source: CinemachineTimelineIntegration.cs]

### Mobile Optimization

[Source: CinemachineMobileOptimization.cs]

## Best Practices

1. **2D Games**: Use orthographic cameras with PixelPerfectCamera for crisp pixel art
2. **3D Games**: Implement collision detection to prevent camera clipping
3. **Performance**: Limit active cameras on mobile (max 2 recommended)
4. **Input**: Use Input System for all camera controls
5. **Effects**: Use impulse system for positional camera shake
6. **Timeline**: Bind CinemachineBrain to Timeline for cinematic control
7. **Save System**: Persist camera states for seamless gameplay restoration

## Camera Types and Use Cases

### 2D Cameras

- **Follow Camera**: Basic 2D character following
- **Pixel Perfect**: Crisp pixel art rendering
- **Confiner 2D**: Boundary constraints with polygon colliders

### 3D Cameras

- **Follow Camera**: Basic 3D character following with collision detection
- **FreeLook Camera**: Mouse/gamepad controlled orbital camera
- **Dolly Camera**: Scripted camera movement along paths
- **Target Group**: Multi-target camera framing

## Troubleshooting

### Common Issues

1. **Camera Jitter**: Check damping settings and update methods
2. **Poor Performance**: Reduce active camera count and optimize blends
3. **Input Not Working**: Ensure Input System integration is complete
4. **Timeline Conflicts**: Check camera priorities during Timeline playback

````

#### 11.2 Update Story Templates
[[LLM: Integrate Cinemachine requirements with existing story templates. Add conditional requirements based on game_type and target_platform.]]

Enhance story creation to include Cinemachine context:
```markdown
## Cinemachine Requirements
- [ ] Virtual cameras configured for {{game_type}}
- [ ] Camera Brain setup and optimized
- [ ] Follow/LookAt targets assigned
- [ ] Confiner boundaries configured ({{game_type}} specific)
- [ ] Camera states and blending setup
- [ ] Timeline integration tested
- [ ] Input System controls implemented
- [ ] Mobile optimization applied (if {{target_platform}} includes mobile)
- [ ] Camera shake/effects configured
- [ ] Performance validation passed
- [ ] Integration tests passing
````

### 12. Validation Checklist

- [ ] Cinemachine package installed and configured
- [ ] Camera directory structure created
- [ ] Brain manager singleton implemented
- [ ] 2D virtual cameras configured (if applicable)
- [ ] 3D virtual cameras configured (if applicable)
- [ ] FreeLook cameras setup for 3D games
- [ ] Confiner 2D/3D constraints implemented
- [ ] Camera state management system functional
- [ ] Timeline integration complete
- [ ] Input System controls working
- [ ] Camera effects and impulse system configured
- [ ] Mobile optimization applied
- [ ] Performance validation passing
- [ ] Integration tests successful
- [ ] Documentation complete

## Success Criteria

- Cinemachine camera system fully integrated with game architecture
- Both 2D and 3D camera workflows supported based on game type
- Camera constraints and boundaries properly configured
- Smooth camera transitions and blending functional
- Timeline integration enables cinematic sequences
- Input System provides responsive camera controls
- Mobile performance optimized (<33ms frame time for mobile, <16.67ms for others)
- Camera effects system operational
- Save/load camera states working
- All integration tests passing
- Complete API documentation for development team

## Notes

- This task extends unity-package-integration for Cinemachine-specific setup
- Integrates with Timeline for cinematic camera control
- Cinemachine version compatibility: Unity 2020.3 LTS, 2021.3 LTS, 2022.3 LTS
- Mobile optimization critical for performance on target platforms
- Input System integration required for modern Unity projects
- Camera state persistence enables seamless gameplay experience
- Performance monitoring essential for maintaining frame rate targets
- Template placeholders: {{root}}, {{game_type}}, {{target_platform}}, {{project_root}}
- LLM directives guide adaptive processing based on project configuration
- Error handling ensures robust camera implementation across platforms
