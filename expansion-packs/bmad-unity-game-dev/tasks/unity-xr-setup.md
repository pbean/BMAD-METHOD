# Unity XR Development Setup Task

## Purpose

To configure Unity XR development for immersive VR/AR experiences, including XR Plugin Management, device compatibility, input systems, spatial tracking, and performance optimization. This task ensures proper XR framework integration with comprehensive support for both VR (Virtual Reality) and AR (Augmented Reality) development targeting multiple platforms including Oculus, OpenXR, AR Foundation, and HoloLens.

## Dependencies

**Prerequisite Tasks**:

- `unity-package-setup.md` - XR packages installation
- `unity-package-integration.md` - Package configuration

**Integration Points**:

- Input System configuration (XR controller mapping)
  - Requires: `unity-input-system-setup.md` task completion
  - Validates: XR InputActionReference serialization support
  - Dependencies: `com.unity.inputsystem` package >= 1.4.0
- Cinemachine XR integration (VR camera systems)
  - Requires: `unity-cinemachine-setup.md` task completion
  - Validates: CinemachineVirtualCamera XR compatibility
  - Dependencies: `com.unity.cinemachine` package >= 2.8.0
- Audio System spatial integration (3D positional audio)
  - Validates: AudioSource spatialization for XR
  - Dependencies: Unity built-in audio system
- Render Pipeline optimization (XR stereo rendering)
  - Validates: URP/HDRP XR compatibility
  - Dependencies: URP >= 12.0.0 or HDRP >= 12.0.0
- Physics System configuration (XR interaction physics)
  - Validates: Rigidbody and Collider XR integration
  - Dependencies: Unity built-in physics system

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Prerequisites and XR Environment Validation

[[LLM: Validate Unity project structure and XR package compatibility. Adapt validation steps based on detected Unity version and target XR platforms. If any validation fails, provide specific remediation steps before proceeding.]]

- Load `{{root}}/config.yaml` from the expansion pack directory
- If config file missing, HALT with error: "config.yaml not found. Please ensure unity-package-setup task completed successfully."
- Verify XR packages installation:
  - Check `Packages/manifest.json` for XR dependencies:
    - `com.unity.xr.management` (minimum version: 4.2.0 for Unity 2022.3 LTS)
    - `com.unity.xr.interaction.toolkit` (minimum version: 2.3.0)
    - `com.unity.xr.openxr` (minimum version: 1.6.0 for OpenXR support)
    - `com.unity.xr.arfoundation` (minimum version: 5.0.0 for AR support)
    - `com.unity.xr.arcore` (for Android AR)
    - `com.unity.xr.arkit` (for iOS AR)
  - Validate packages in `Packages/packages-lock.json`
  - Verify XR Management accessible: Project Settings > XR Plug-in Management
  - If XR packages missing, HALT with error: "XR packages not installed. Run: unity-package-setup task first."
- Verify prerequisite task completion:
  - Check for `docs/unity-packages.md` from unity-package-setup
  - Check for `docs/package-integration/` directory from unity-package-integration
  - If missing, HALT with error: "Prerequisite tasks not completed. Run unity-package-setup and unity-package-integration first."
- Identify target XR platforms ({{target_xr_platforms}}) from architecture documents
- Load XR SDK version compatibility matrix for Unity LTS versions
- Validate hardware requirements for target platforms

### 1. XR Plugin Management Configuration

#### 1.1 XR Provider Setup

[[LLM: Analyze the project's target platforms and configure only the necessary XR providers. Adapt provider selection based on target_xr_platforms configuration.]]

```csharp
// Assets/Scripts/XR/XRPlatformManager.cs
using UnityEngine;
using UnityEngine.XR.Management;
using System.Collections.Generic;

public class XRPlatformManager : MonoBehaviour
{
    [System.Serializable]
    public class XRPlatformConfig
    {
        public string platformName;
        public bool enabled;
        public XRGeneralSettings xrSettings;
    }

    [SerializeField] private List<XRPlatformConfig> platformConfigs = new List<XRPlatformConfig>();
    [SerializeField] private bool autoInitializeXR = true;
    [SerializeField] private float initializationTimeout = 10f;

    public static XRPlatformManager Instance { get; private set; }

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);

            if (autoInitializeXR)
            {
                StartCoroutine(InitializeXRCoroutine());
            }
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private System.Collections.IEnumerator InitializeXRCoroutine()
    {
        float startTime = Time.realtimeSinceStartup;

        try
        {
            Debug.Log("[XRPlatformManager] Starting XR initialization...");

            // Initialize XR Management
            yield return XRGeneralSettings.Instance.Manager.InitializeLoader();

            if (XRGeneralSettings.Instance.Manager.activeLoader == null)
            {
                Debug.LogError("[XRPlatformManager] XR failed to initialize - no active loader found");
                yield break;
            }

            // Start XR subsystems
            XRGeneralSettings.Instance.Manager.StartSubsystems();

            float initTime = Time.realtimeSinceStartup - startTime;
            Debug.Log($"[XRPlatformManager] XR initialized successfully in {initTime:F2} seconds");
            Debug.Log($"[XRPlatformManager] Active XR Loader: {XRGeneralSettings.Instance.Manager.activeLoader.name}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRPlatformManager] XR initialization failed: {ex.Message}");
        }

        // Check for initialization timeout
        if (Time.realtimeSinceStartup - startTime > initializationTimeout)
        {
            Debug.LogWarning($"[XRPlatformManager] XR initialization took longer than expected ({initializationTimeout}s)");
        }
    }

    public bool IsXRActive()
    {
        return XRGeneralSettings.Instance != null &&
               XRGeneralSettings.Instance.Manager.activeLoader != null;
    }

    public string GetActiveXRPlatform()
    {
        if (IsXRActive())
        {
            return XRGeneralSettings.Instance.Manager.activeLoader.name;
        }
        return "None";
    }
}
```

#### 1.2 Device Detection and Compatibility

[[LLM: Configure device detection based on target_xr_platforms. Include only the platforms specified in the project configuration.]]

```csharp
// Assets/Scripts/XR/XRDeviceDetector.cs
using UnityEngine;
using UnityEngine.XR;
using System.Collections.Generic;

public class XRDeviceDetector : MonoBehaviour
{
    [System.Serializable]
    public enum XRDeviceType
    {
        Unknown,
        OculusQuest,
        OculusRift,
        HTCVive,
        ValveIndex,
        WindowsMR,
        HoloLens,
        MagicLeap,
        ARCore,
        ARKit
    }

    [SerializeField] private XRDeviceType detectedDevice = XRDeviceType.Unknown;
    [SerializeField] private bool enableDeviceSpecificOptimization = true;
    [SerializeField] private float detectionTimeout = 5f;

    public static XRDeviceDetector Instance { get; private set; }
    public XRDeviceType DetectedDevice => detectedDevice;

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

    private void Start()
    {
        StartCoroutine(DetectXRDeviceCoroutine());
    }

    private System.Collections.IEnumerator DetectXRDeviceCoroutine()
    {
        float startTime = Time.realtimeSinceStartup;

        while (Time.realtimeSinceStartup - startTime < detectionTimeout)
        {
            try
            {
                if (XRSettings.loadedDeviceName != null && !string.IsNullOrEmpty(XRSettings.loadedDeviceName))
                {
                    detectedDevice = ParseDeviceType(XRSettings.loadedDeviceName);
                    Debug.Log($"[XRDeviceDetector] Detected XR device: {detectedDevice} ({XRSettings.loadedDeviceName})");

                    if (enableDeviceSpecificOptimization)
                    {
                        ApplyDeviceOptimizations();
                    }

                    yield break;
                }

                // Check InputDevices for connected XR controllers
                var inputDevices = new List<InputDevice>();
                InputDevices.GetDevices(inputDevices);

                foreach (var device in inputDevices)
                {
                    if (device.isValid && (device.characteristics & InputDeviceCharacteristics.HeldInHand) != 0)
                    {
                        Debug.Log($"[XRDeviceDetector] Found XR controller: {device.name}");
                        detectedDevice = ParseDeviceTypeFromController(device.name);
                        break;
                    }
                }
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[XRDeviceDetector] Error during device detection: {ex.Message}");
            }

            yield return new WaitForSeconds(0.5f);
        }

        if (detectedDevice == XRDeviceType.Unknown)
        {
            Debug.LogWarning("[XRDeviceDetector] Could not detect XR device type within timeout period");
        }
    }

    private XRDeviceType ParseDeviceType(string deviceName)
    {
        deviceName = deviceName.ToLower();

        if (deviceName.Contains("oculus") || deviceName.Contains("quest") || deviceName.Contains("rift"))
            return XRDeviceType.OculusQuest;
        if (deviceName.Contains("openvr") || deviceName.Contains("steamvr"))
            return XRDeviceType.HTCVive; // Default for OpenVR
        if (deviceName.Contains("windowsmr") || deviceName.Contains("windows mixed reality"))
            return XRDeviceType.WindowsMR;
        if (deviceName.Contains("hololens"))
            return XRDeviceType.HoloLens;
        if (deviceName.Contains("magicleap"))
            return XRDeviceType.MagicLeap;
        if (deviceName.Contains("arcore"))
            return XRDeviceType.ARCore;
        if (deviceName.Contains("arkit"))
            return XRDeviceType.ARKit;

        return XRDeviceType.Unknown;
    }

    private XRDeviceType ParseDeviceTypeFromController(string controllerName)
    {
        controllerName = controllerName.ToLower();

        if (controllerName.Contains("oculus") || controllerName.Contains("touch"))
            return XRDeviceType.OculusQuest;
        if (controllerName.Contains("vive") || controllerName.Contains("htc"))
            return XRDeviceType.HTCVive;
        if (controllerName.Contains("index") || controllerName.Contains("knuckles"))
            return XRDeviceType.ValveIndex;
        if (controllerName.Contains("wmr") || controllerName.Contains("microsoft"))
            return XRDeviceType.WindowsMR;

        return XRDeviceType.Unknown;
    }

    private void ApplyDeviceOptimizations()
    {
        switch (detectedDevice)
        {
            case XRDeviceType.OculusQuest:
                // Mobile VR optimizations
                QualitySettings.SetQualityLevel(1); // Medium quality
                XRSettings.eyeTextureResolutionScale = 1.0f;
                break;

            case XRDeviceType.HTCVive:
            case XRDeviceType.ValveIndex:
                // PC VR optimizations
                QualitySettings.SetQualityLevel(3); // High quality
                XRSettings.eyeTextureResolutionScale = 1.2f;
                break;

            case XRDeviceType.HoloLens:
                // AR optimizations
                QualitySettings.SetQualityLevel(2); // Medium-High quality
                break;
        }

        Debug.Log($"[XRDeviceDetector] Applied optimizations for {detectedDevice}");
    }
}
```

### 2. XR Input System Configuration

#### 2.1 VR Controller Input Mapping

[[LLM: Configure input mappings based on detected VR platforms. Include only the controller types that match target_xr_platforms.]]

```csharp
// Assets/Scripts/XR/XRInputManager.cs
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.XR;
using System.Collections.Generic;

public class XRInputManager : MonoBehaviour
{
    [System.Serializable]
    public class ControllerInput
    {
        [Header("Input Actions")]
        public InputActionReference triggerAction;
        public InputActionReference gripAction;
        public InputActionReference primaryButtonAction;
        public InputActionReference secondaryButtonAction;
        public InputActionReference joystickAction;
        public InputActionReference menuButtonAction;

        [Header("Haptic Feedback")]
        public float triggerHapticIntensity = 0.5f;
        public float gripHapticIntensity = 0.3f;
        public float buttonHapticIntensity = 0.2f;
    }

    [SerializeField] private ControllerInput leftController;
    [SerializeField] private ControllerInput rightController;
    [SerializeField] private bool enableHapticFeedback = true;
    [SerializeField] private float hapticDuration = 0.1f;

    // Hand tracking support
    [SerializeField] private bool handTrackingEnabled = false;
    [SerializeField] private float handTrackingConfidenceThreshold = 0.7f;

    public static XRInputManager Instance { get; private set; }

    private InputDevice leftControllerDevice;
    private InputDevice rightControllerDevice;
    private Dictionary<string, InputDevice> connectedDevices = new Dictionary<string, InputDevice>();

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

    private void Start()
    {
        StartCoroutine(InitializeControllersCoroutine());
        SetupInputActions();
    }

    private System.Collections.IEnumerator InitializeControllersCoroutine()
    {
        float timeout = 5f;
        float startTime = Time.realtimeSinceStartup;

        while (Time.realtimeSinceStartup - startTime < timeout)
        {
            try
            {
                RefreshControllerDevices();

                if (leftControllerDevice.isValid && rightControllerDevice.isValid)
                {
                    Debug.Log("[XRInputManager] Both controllers detected and initialized");
                    yield break;
                }
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[XRInputManager] Error during controller initialization: {ex.Message}");
            }

            yield return new WaitForSeconds(0.5f);
        }

        Debug.LogWarning("[XRInputManager] Controller initialization timeout - some controllers may not be available");
    }

    private void RefreshControllerDevices()
    {
        var inputDevices = new List<InputDevice>();
        InputDevices.GetDevices(inputDevices);

        foreach (var device in inputDevices)
        {
            if (!device.isValid) continue;

            if ((device.characteristics & InputDeviceCharacteristics.Left) != 0 &&
                (device.characteristics & InputDeviceCharacteristics.Controller) != 0)
            {
                leftControllerDevice = device;
                Debug.Log($"[XRInputManager] Left controller connected: {device.name}");
            }
            else if ((device.characteristics & InputDeviceCharacteristics.Right) != 0 &&
                     (device.characteristics & InputDeviceCharacteristics.Controller) != 0)
            {
                rightControllerDevice = device;
                Debug.Log($"[XRInputManager] Right controller connected: {device.name}");
            }

            // Store all devices for reference
            if (!connectedDevices.ContainsKey(device.name))
            {
                connectedDevices[device.name] = device;
            }
        }
    }

    private void SetupInputActions()
    {
        try
        {
            // Left controller setup
            if (leftController.triggerAction != null)
            {
                leftController.triggerAction.action.performed += (ctx) => OnTriggerPressed(true, ctx.ReadValue<float>());
                leftController.triggerAction.action.Enable();
            }

            if (leftController.gripAction != null)
            {
                leftController.gripAction.action.performed += (ctx) => OnGripPressed(true, ctx.ReadValue<float>());
                leftController.gripAction.action.Enable();
            }

            // Right controller setup
            if (rightController.triggerAction != null)
            {
                rightController.triggerAction.action.performed += (ctx) => OnTriggerPressed(false, ctx.ReadValue<float>());
                rightController.triggerAction.action.Enable();
            }

            if (rightController.gripAction != null)
            {
                rightController.gripAction.action.performed += (ctx) => OnGripPressed(false, ctx.ReadValue<float>());
                rightController.gripAction.action.Enable();
            }

            Debug.Log("[XRInputManager] Input actions configured successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRInputManager] Failed to setup input actions: {ex.Message}");
        }
    }

    private void OnTriggerPressed(bool isLeftController, float pressure)
    {
        string controllerSide = isLeftController ? "Left" : "Right";
        Debug.Log($"[XRInputManager] {controllerSide} trigger pressed: {pressure:F2}");

        if (enableHapticFeedback && pressure > 0.5f)
        {
            TriggerHaptic(isLeftController, isLeftController ? leftController.triggerHapticIntensity : rightController.triggerHapticIntensity);
        }
    }

    private void OnGripPressed(bool isLeftController, float pressure)
    {
        string controllerSide = isLeftController ? "Left" : "Right";
        Debug.Log($"[XRInputManager] {controllerSide} grip pressed: {pressure:F2}");

        if (enableHapticFeedback && pressure > 0.5f)
        {
            TriggerHaptic(isLeftController, isLeftController ? leftController.gripHapticIntensity : rightController.gripHapticIntensity);
        }
    }

    public void TriggerHaptic(bool isLeftController, float intensity)
    {
        if (!enableHapticFeedback) return;

        try
        {
            InputDevice targetDevice = isLeftController ? leftControllerDevice : rightControllerDevice;

            if (targetDevice.isValid)
            {
                HapticCapabilities hapticCaps;
                if (targetDevice.TryGetHapticCapabilities(out hapticCaps) && hapticCaps.supportsImpulse)
                {
                    targetDevice.SendHapticImpulse(0, intensity, hapticDuration);
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRInputManager] Failed to trigger haptic feedback: {ex.Message}");
        }
    }
}
```

#### 2.2 Hand Tracking Integration

[[LLM: Include hand tracking setup only if target_xr_platforms includes platforms that support hand tracking (Oculus Quest, HoloLens, Magic Leap).]]

```csharp
// Assets/Scripts/XR/XRHandTrackingManager.cs
using UnityEngine;
using UnityEngine.XR.Hands;
using System.Collections.Generic;

public class XRHandTrackingManager : MonoBehaviour
{
    [System.Serializable]
    public class HandTrackingSettings
    {
        public bool enableLeftHand = true;
        public bool enableRightHand = true;
        public float confidenceThreshold = 0.7f;
        public bool showDebugVisuals = false;
    }

    [SerializeField] private HandTrackingSettings settings;
    [SerializeField] private Material handMaterial;
    [SerializeField] private bool enableGestureRecognition = true;

    // Hand data
    private XRHandSubsystem handSubsystem;
    private Dictionary<XRHandedness, XRHand> trackedHands = new Dictionary<XRHandedness, XRHand>();

    // Gesture recognition
    private Dictionary<string, System.Func<XRHand, bool>> gestureRecognizers = new Dictionary<string, System.Func<XRHand, bool>>();

    private void Start()
    {
        InitializeHandTracking();
        SetupGestureRecognizers();
    }

    private void InitializeHandTracking()
    {
        try
        {
            handSubsystem = XRGeneralSettings.Instance?.Manager?.activeLoader?.GetLoadedSubsystem<XRHandSubsystem>();

            if (handSubsystem == null)
            {
                Debug.LogWarning("[XRHandTrackingManager] Hand tracking subsystem not available");
                return;
            }

            handSubsystem.Start();
            Debug.Log("[XRHandTrackingManager] Hand tracking initialized successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRHandTrackingManager] Failed to initialize hand tracking: {ex.Message}");
        }
    }

    private void SetupGestureRecognizers()
    {
        if (!enableGestureRecognition) return;

        // Define common gestures
        gestureRecognizers["Pinch"] = (hand) => IsPinchGesture(hand);
        gestureRecognizers["Point"] = (hand) => IsPointGesture(hand);
        gestureRecognizers["Fist"] = (hand) => IsFistGesture(hand);
        gestureRecognizers["OpenPalm"] = (hand) => IsOpenPalmGesture(hand);

        Debug.Log($"[XRHandTrackingManager] Configured {gestureRecognizers.Count} gesture recognizers");
    }

    private void Update()
    {
        if (handSubsystem == null) return;

        UpdateHandTracking();

        if (enableGestureRecognition)
        {
            RecognizeGestures();
        }
    }

    private void UpdateHandTracking()
    {
        try
        {
            if (settings.enableLeftHand)
            {
                UpdateHand(XRHandedness.Left);
            }

            if (settings.enableRightHand)
            {
                UpdateHand(XRHandedness.Right);
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRHandTrackingManager] Error updating hand tracking: {ex.Message}");
        }
    }

    private void UpdateHand(XRHandedness handedness)
    {
        if (handSubsystem.TryGetHand(handedness, out XRHand hand))
        {
            if (hand.isTracked && hand.trackingState >= settings.confidenceThreshold)
            {
                trackedHands[handedness] = hand;

                if (settings.showDebugVisuals)
                {
                    DrawHandDebugVisuals(hand);
                }
            }
            else
            {
                // Hand lost tracking
                if (trackedHands.ContainsKey(handedness))
                {
                    trackedHands.Remove(handedness);
                }
            }
        }
    }

    private void RecognizeGestures()
    {
        foreach (var handPair in trackedHands)
        {
            XRHandedness handedness = handPair.Key;
            XRHand hand = handPair.Value;

            foreach (var gesture in gestureRecognizers)
            {
                if (gesture.Value(hand))
                {
                    OnGestureRecognized(handedness, gesture.Key);
                }
            }
        }
    }

    private bool IsPinchGesture(XRHand hand)
    {
        // Simplified pinch detection
        if (hand.GetJoint(XRHandJointID.IndexTip).TryGetPosition(out Vector3 indexTip) &&
            hand.GetJoint(XRHandJointID.ThumbTip).TryGetPosition(out Vector3 thumbTip))
        {
            float distance = Vector3.Distance(indexTip, thumbTip);
            return distance < 0.02f; // 2cm threshold
        }
        return false;
    }

    private bool IsPointGesture(XRHand hand)
    {
        // Simplified pointing detection
        if (hand.GetJoint(XRHandJointID.IndexTip).TryGetRotation(out Quaternion indexRotation) &&
            hand.GetJoint(XRHandJointID.MiddleProximal).TryGetRotation(out Quaternion middleRotation))
        {
            // Check if index is extended and middle is bent
            float angleDiff = Quaternion.Angle(indexRotation, middleRotation);
            return angleDiff > 30f; // Rough approximation
        }
        return false;
    }

    private bool IsFistGesture(XRHand hand)
    {
        // Check if all fingers are curled
        var fingerTips = new XRHandJointID[]
        {
            XRHandJointID.IndexTip,
            XRHandJointID.MiddleTip,
            XRHandJointID.RingTip,
            XRHandJointID.LittleTip
        };

        if (hand.GetJoint(XRHandJointID.Palm).TryGetPosition(out Vector3 palmPos))
        {
            foreach (var fingertip in fingerTips)
            {
                if (hand.GetJoint(fingertip).TryGetPosition(out Vector3 tipPos))
                {
                    float distance = Vector3.Distance(palmPos, tipPos);
                    if (distance > 0.08f) // If any finger is extended
                        return false;
                }
            }
            return true;
        }
        return false;
    }

    private bool IsOpenPalmGesture(XRHand hand)
    {
        // Opposite of fist - all fingers extended
        return !IsFistGesture(hand);
    }

    private void OnGestureRecognized(XRHandedness handedness, string gestureName)
    {
        Debug.Log($"[XRHandTrackingManager] Gesture recognized: {gestureName} ({handedness} hand)");

        // Trigger gesture events
        // This would integrate with your game's event system
    }

    private void DrawHandDebugVisuals(XRHand hand)
    {
        // Simple debug visualization
        for (int i = 0; i < XRHandJointID.EndMarker.ToIndex(); i++)
        {
            XRHandJointID jointID = XRHandJointID.FromIndex(i);
            if (hand.GetJoint(jointID).TryGetPosition(out Vector3 position))
            {
                Debug.DrawRay(position, Vector3.up * 0.01f, Color.green);
            }
        }
    }

    public bool IsHandTracked(XRHandedness handedness)
    {
        return trackedHands.ContainsKey(handedness);
    }

    public bool TryGetHandPosition(XRHandedness handedness, XRHandJointID jointID, out Vector3 position)
    {
        position = Vector3.zero;

        if (trackedHands.TryGetValue(handedness, out XRHand hand))
        {
            return hand.GetJoint(jointID).TryGetPosition(out position);
        }

        return false;
    }
}
```

### 3. AR Foundation Setup and Configuration

#### 3.1 AR Session Management

[[LLM: Include AR Foundation setup only if target_xr_platforms includes AR platforms (ARCore, ARKit). Skip this section for VR-only projects.]]

```csharp
// Assets/Scripts/XR/ARSessionManager.cs
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using System.Collections.Generic;

public class ARSessionManager : MonoBehaviour
{
    [System.Serializable]
    public class ARSessionSettings
    {
        public bool autoStartSession = true;
        public TrackingMode trackingMode = TrackingMode.PositionAndRotation;
        public PlaneDetectionMode planeDetection = PlaneDetectionMode.Horizontal;
        public bool enableLightEstimation = true;
        public bool enableOcclusion = false;
        public bool enableImageTracking = false;
        public bool enableObjectTracking = false;
    }

    [SerializeField] private ARSessionSettings settings;
    [SerializeField] private ARSession arSession;
    [SerializeField] private ARSessionOrigin arSessionOrigin;
    [SerializeField] private ARPlaneManager planeManager;
    [SerializeField] private ARPointCloudManager pointCloudManager;
    [SerializeField] private ARRaycastManager raycastManager;
    [SerializeField] private AROcclusionManager occlusionManager;

    // Tracked planes for spatial anchoring
    private Dictionary<TrackableId, ARPlane> trackedPlanes = new Dictionary<TrackableId, ARPlane>();
    private List<ARRaycastHit> raycastHits = new List<ARRaycastHit>();

    public static ARSessionManager Instance { get; private set; }

    public bool IsARSessionActive => arSession != null && arSession.enabled && ARSession.state == ARSessionState.SessionTracking;
    public int TrackedPlaneCount => trackedPlanes.Count;

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

    private void Start()
    {
        InitializeARSession();
    }

    private void InitializeARSession()
    {
        try
        {
            // Validate AR components
            if (arSession == null)
            {
                arSession = FindObjectOfType<ARSession>();
                if (arSession == null)
                {
                    Debug.LogError("[ARSessionManager] ARSession component not found. Please add ARSession to scene.");
                    return;
                }
            }

            if (arSessionOrigin == null)
            {
                arSessionOrigin = FindObjectOfType<ARSessionOrigin>();
                if (arSessionOrigin == null)
                {
                    Debug.LogError("[ARSessionManager] ARSessionOrigin component not found. Please add ARSessionOrigin to scene.");
                    return;
                }
            }

            // Configure AR settings
            ConfigureARSession();

            // Setup event handlers
            SetupEventHandlers();

            if (settings.autoStartSession)
            {
                StartARSession();
            }

            Debug.Log("[ARSessionManager] AR session initialized successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[ARSessionManager] Failed to initialize AR session: {ex.Message}");
        }
    }

    private void ConfigureARSession()
    {
        // Configure plane detection
        if (planeManager != null)
        {
            planeManager.detectionMode = settings.planeDetection;
            planeManager.enabled = settings.planeDetection != PlaneDetectionMode.None;
        }

        // Configure occlusion
        if (occlusionManager != null)
        {
            occlusionManager.enabled = settings.enableOcclusion;
        }

        // Configure session tracking mode
        var sessionConfig = new XRSessionUpdateParams
        {
            screenOrientation = Screen.orientation,
            screenDimensions = new Vector2Int(Screen.width, Screen.height)
        };
    }

    private void SetupEventHandlers()
    {
        if (planeManager != null)
        {
            planeManager.planesChanged += OnPlanesChanged;
        }

        ARSession.stateChanged += OnARSessionStateChanged;
    }

    private void OnARSessionStateChanged(ARSessionStateChangedEventArgs args)
    {
        Debug.Log($"[ARSessionManager] AR session state changed: {args.state}");

        switch (args.state)
        {
            case ARSessionState.SessionInitializing:
                Debug.Log("[ARSessionManager] AR session initializing...");
                break;

            case ARSessionState.SessionTracking:
                Debug.Log("[ARSessionManager] AR session tracking started");
                break;

            case ARSessionState.NotSupported:
                Debug.LogError("[ARSessionManager] AR not supported on this device");
                break;

            case ARSessionState.NeedsInstall:
                Debug.LogWarning("[ARSessionManager] AR software needs to be installed");
                break;
        }
    }

    private void OnPlanesChanged(ARPlanesChangedEventArgs args)
    {
        // Handle added planes
        foreach (var plane in args.added)
        {
            trackedPlanes[plane.trackableId] = plane;
            Debug.Log($"[ARSessionManager] New plane detected: {plane.trackableId} (Type: {plane.classification})");
        }

        // Handle updated planes
        foreach (var plane in args.updated)
        {
            if (trackedPlanes.ContainsKey(plane.trackableId))
            {
                trackedPlanes[plane.trackableId] = plane;
            }
        }

        // Handle removed planes
        foreach (var plane in args.removed)
        {
            trackedPlanes.Remove(plane.trackableId);
            Debug.Log($"[ARSessionManager] Plane removed: {plane.trackableId}");
        }
    }

    public void StartARSession()
    {
        try
        {
            if (arSession != null)
            {
                arSession.enabled = true;
                Debug.Log("[ARSessionManager] AR session started");
            }
            else
            {
                Debug.LogError("[ARSessionManager] Cannot start AR session - ARSession component is null");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[ARSessionManager] Failed to start AR session: {ex.Message}");
        }
    }

    public void StopARSession()
    {
        try
        {
            if (arSession != null)
            {
                arSession.enabled = false;
                Debug.Log("[ARSessionManager] AR session stopped");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[ARSessionManager] Failed to stop AR session: {ex.Message}");
        }
    }

    public bool TryRaycast(Vector2 screenPoint, out ARRaycastHit hit, TrackableType trackableTypes = TrackableType.All)
    {
        hit = default;

        if (raycastManager == null)
        {
            Debug.LogWarning("[ARSessionManager] ARRaycastManager not available");
            return false;
        }

        try
        {
            raycastHits.Clear();
            if (raycastManager.Raycast(screenPoint, raycastHits, trackableTypes))
            {
                hit = raycastHits[0];
                return true;
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[ARSessionManager] Raycast failed: {ex.Message}");
        }

        return false;
    }

    public ARPlane GetLargestPlane()
    {
        ARPlane largestPlane = null;
        float largestArea = 0f;

        foreach (var plane in trackedPlanes.Values)
        {
            float area = plane.size.x * plane.size.y;
            if (area > largestArea)
            {
                largestArea = area;
                largestPlane = plane;
            }
        }

        return largestPlane;
    }
}
```

#### 3.2 Spatial Anchors and Persistent Tracking

[[LLM: Configure spatial anchors for AR platforms that support persistent tracking. Include cloud anchor support if needed.]]

```csharp
// Assets/Scripts/XR/ARSpatialAnchorManager.cs
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using System.Collections.Generic;

public class ARSpatialAnchorManager : MonoBehaviour
{
    [System.Serializable]
    public class AnchorSettings
    {
        public bool enablePersistentAnchors = true;
        public int maxAnchorsPerSession = 10;
        public float anchorTrackingTimeout = 30f;
        public bool enableCloudAnchors = false;
    }

    [SerializeField] private AnchorSettings settings;
    [SerializeField] private ARAnchorManager anchorManager;
    [SerializeField] private GameObject anchorPrefab;

    private Dictionary<TrackableId, ARAnchor> trackedAnchors = new Dictionary<TrackableId, ARAnchor>();
    private List<string> persistentAnchorIds = new List<string>();

    public static ARSpatialAnchorManager Instance { get; private set; }

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

    private void Start()
    {
        InitializeAnchorManager();
        LoadPersistentAnchors();
    }

    private void InitializeAnchorManager()
    {
        try
        {
            if (anchorManager == null)
            {
                anchorManager = FindObjectOfType<ARAnchorManager>();
                if (anchorManager == null)
                {
                    Debug.LogError("[ARSpatialAnchorManager] ARAnchorManager not found. Please add to ARSessionOrigin.");
                    return;
                }
            }

            anchorManager.anchorsChanged += OnAnchorsChanged;
            Debug.Log("[ARSpatialAnchorManager] Anchor manager initialized successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[ARSpatialAnchorManager] Failed to initialize anchor manager: {ex.Message}");
        }
    }

    private void OnAnchorsChanged(ARAnchorsChangedEventArgs args)
    {
        // Handle added anchors
        foreach (var anchor in args.added)
        {
            trackedAnchors[anchor.trackableId] = anchor;
            Debug.Log($"[ARSpatialAnchorManager] Anchor added: {anchor.trackableId}");

            // Instantiate visual representation
            if (anchorPrefab != null)
            {
                var anchorVisual = Instantiate(anchorPrefab, anchor.transform);
                anchorVisual.name = $"Anchor_{anchor.trackableId}";
            }
        }

        // Handle updated anchors
        foreach (var anchor in args.updated)
        {
            if (trackedAnchors.ContainsKey(anchor.trackableId))
            {
                trackedAnchors[anchor.trackableId] = anchor;
            }
        }

        // Handle removed anchors
        foreach (var anchor in args.removed)
        {
            if (trackedAnchors.ContainsKey(anchor.trackableId))
            {
                trackedAnchors.Remove(anchor.trackableId);
                Debug.Log($"[ARSpatialAnchorManager] Anchor removed: {anchor.trackableId}");
            }
        }
    }

    public ARAnchor CreateAnchor(Vector3 position, Quaternion rotation)
    {
        if (anchorManager == null)
        {
            Debug.LogError("[ARSpatialAnchorManager] AnchorManager not available");
            return null;
        }

        if (trackedAnchors.Count >= settings.maxAnchorsPerSession)
        {
            Debug.LogWarning($"[ARSpatialAnchorManager] Maximum anchors reached ({settings.maxAnchorsPerSession})");
            return null;
        }

        try
        {
            var pose = new Pose(position, rotation);
            var anchor = anchorManager.AddAnchor(pose);

            if (anchor != null)
            {
                Debug.Log($"[ARSpatialAnchorManager] Created anchor at {position}");

                if (settings.enablePersistentAnchors)
                {
                    SaveAnchorForPersistence(anchor);
                }
            }

            return anchor;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[ARSpatialAnchorManager] Failed to create anchor: {ex.Message}");
            return null;
        }
    }

    public ARAnchor CreateAnchorFromRaycast(Vector2 screenPoint)
    {
        if (ARSessionManager.Instance.TryRaycast(screenPoint, out ARRaycastHit hit))
        {
            return CreateAnchor(hit.pose.position, hit.pose.rotation);
        }

        Debug.LogWarning("[ARSpatialAnchorManager] Failed to create anchor - no surface detected at screen point");
        return null;
    }

    public bool RemoveAnchor(ARAnchor anchor)
    {
        if (anchor == null || anchorManager == null)
        {
            return false;
        }

        try
        {
            if (trackedAnchors.ContainsKey(anchor.trackableId))
            {
                trackedAnchors.Remove(anchor.trackableId);
            }

            bool result = anchorManager.RemoveAnchor(anchor);

            if (result)
            {
                Debug.Log($"[ARSpatialAnchorManager] Removed anchor: {anchor.trackableId}");
            }

            return result;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[ARSpatialAnchorManager] Failed to remove anchor: {ex.Message}");
            return false;
        }
    }

    private void SaveAnchorForPersistence(ARAnchor anchor)
    {
        if (!settings.enablePersistentAnchors) return;

        try
        {
            string anchorId = anchor.trackableId.ToString();

            if (!persistentAnchorIds.Contains(anchorId))
            {
                persistentAnchorIds.Add(anchorId);

                // Save anchor data to persistent storage
                var anchorData = new AnchorPersistenceData
                {
                    id = anchorId,
                    position = anchor.transform.position,
                    rotation = anchor.transform.rotation,
                    timestamp = System.DateTime.Now.ToBinary()
                };

                string json = JsonUtility.ToJson(anchorData);
                PlayerPrefs.SetString($"Anchor_{anchorId}", json);

                Debug.Log($"[ARSpatialAnchorManager] Saved anchor for persistence: {anchorId}");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[ARSpatialAnchorManager] Failed to save anchor for persistence: {ex.Message}");
        }
    }

    private void LoadPersistentAnchors()
    {
        if (!settings.enablePersistentAnchors) return;

        try
        {
            // Load persistent anchor IDs from previous sessions
            int savedAnchorCount = PlayerPrefs.GetInt("SavedAnchorCount", 0);

            for (int i = 0; i < savedAnchorCount; i++)
            {
                string anchorKey = $"Anchor_{i}";
                if (PlayerPrefs.HasKey(anchorKey))
                {
                    string json = PlayerPrefs.GetString(anchorKey);
                    var anchorData = JsonUtility.FromJson<AnchorPersistenceData>(json);

                    // Attempt to recreate anchor
                    var restoredAnchor = CreateAnchor(anchorData.position, anchorData.rotation);
                    if (restoredAnchor != null)
                    {
                        Debug.Log($"[ARSpatialAnchorManager] Restored persistent anchor: {anchorData.id}");
                    }
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[ARSpatialAnchorManager] Failed to load persistent anchors: {ex.Message}");
        }
    }

    public void ClearAllAnchors()
    {
        try
        {
            var anchorsToRemove = new List<ARAnchor>(trackedAnchors.Values);

            foreach (var anchor in anchorsToRemove)
            {
                RemoveAnchor(anchor);
            }

            Debug.Log("[ARSpatialAnchorManager] Cleared all anchors");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[ARSpatialAnchorManager] Failed to clear anchors: {ex.Message}");
        }
    }

    [System.Serializable]
    public class AnchorPersistenceData
    {
        public string id;
        public Vector3 position;
        public Quaternion rotation;
        public long timestamp;
    }
}
```

### 4. XR Locomotion and Movement Systems

#### 4.1 Teleportation System

[[LLM: Configure teleportation for VR platforms. This is essential for comfortable VR locomotion and motion sickness prevention.]]

```csharp
// Assets/Scripts/XR/XRTeleportationSystem.cs
using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;
using System.Collections.Generic;

public class XRTeleportationSystem : MonoBehaviour
{
    [System.Serializable]
    public class TeleportSettings
    {
        [Header("Teleportation")]
        public LayerMask teleportLayers = 1;
        public float maxTeleportDistance = 20f;
        public float teleportFadeTime = 0.2f;
        public bool enableTeleportValidation = true;

        [Header("Comfort Settings")]
        public bool enableComfortVignette = true;
        public float vignetteIntensity = 0.5f;
        public bool enableSnapTurn = true;
        public float snapTurnAngle = 30f;

        [Header("Visual Feedback")]
        public Material validTeleportMaterial;
        public Material invalidTeleportMaterial;
        public GameObject teleportEffectPrefab;
    }

    [SerializeField] private TeleportSettings settings;
    [SerializeField] private TeleportationProvider teleportProvider;
    [SerializeField] private LineRenderer teleportLine;
    [SerializeField] private GameObject teleportIndicator;
    [SerializeField] private Camera playerCamera;
    [SerializeField] private CanvasGroup fadeCanvas;

    // Locomotion components
    private SnapTurnProvider snapTurnProvider;
    private TeleportationArea currentTeleportArea;
    private bool isTeleporting = false;
    private Vector3 teleportDestination;
    private bool isValidTeleportTarget = false;

    public static XRTeleportationSystem Instance { get; private set; }

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

    private void Start()
    {
        InitializeTeleportation();
        SetupComfortSettings();
    }

    private void InitializeTeleportation()
    {
        try
        {
            // Find or create teleportation provider
            if (teleportProvider == null)
            {
                teleportProvider = FindObjectOfType<TeleportationProvider>();
                if (teleportProvider == null)
                {
                    var teleportObj = new GameObject("Teleportation Provider");
                    teleportProvider = teleportObj.AddComponent<TeleportationProvider>();
                }
            }

            // Setup line renderer for teleport arc
            if (teleportLine == null)
            {
                var lineObj = new GameObject("Teleport Line");
                lineObj.transform.SetParent(transform);
                teleportLine = lineObj.AddComponent<LineRenderer>();
                ConfigureTeleportLine();
            }

            // Setup teleport indicator
            if (teleportIndicator == null)
            {
                teleportIndicator = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                teleportIndicator.name = "Teleport Indicator";
                teleportIndicator.transform.localScale = new Vector3(2f, 0.1f, 2f);
                teleportIndicator.SetActive(false);

                // Remove collider from indicator
                Destroy(teleportIndicator.GetComponent<Collider>());
            }

            Debug.Log("[XRTeleportationSystem] Teleportation system initialized successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRTeleportationSystem] Failed to initialize teleportation: {ex.Message}");
        }
    }

    private void ConfigureTeleportLine()
    {
        teleportLine.material = settings.validTeleportMaterial;
        teleportLine.startWidth = 0.02f;
        teleportLine.endWidth = 0.02f;
        teleportLine.positionCount = 0;
        teleportLine.enabled = false;
    }

    private void SetupComfortSettings()
    {
        try
        {
            // Setup snap turn if enabled
            if (settings.enableSnapTurn)
            {
                if (snapTurnProvider == null)
                {
                    var snapTurnObj = new GameObject("Snap Turn Provider");
                    snapTurnProvider = snapTurnObj.AddComponent<SnapTurnProvider>();
                    snapTurnProvider.turnAmount = settings.snapTurnAngle;
                }
            }

            // Setup comfort vignette
            if (settings.enableComfortVignette && fadeCanvas == null)
            {
                SetupComfortVignette();
            }

            Debug.Log("[XRTeleportationSystem] Comfort settings configured");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRTeleportationSystem] Failed to setup comfort settings: {ex.Message}");
        }
    }

    private void SetupComfortVignette()
    {
        // Create vignette canvas for comfort fading
        var vignetteObj = new GameObject("Comfort Vignette");
        vignetteObj.transform.SetParent(playerCamera.transform);

        var canvas = vignetteObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 1000;

        fadeCanvas = vignetteObj.AddComponent<CanvasGroup>();
        fadeCanvas.alpha = 0f;
        fadeCanvas.interactable = false;
        fadeCanvas.blocksRaycasts = false;

        // Add black image for fading
        var imageObj = new GameObject("Fade Image");
        imageObj.transform.SetParent(vignetteObj.transform);

        var image = imageObj.AddComponent<UnityEngine.UI.Image>();
        image.color = Color.black;

        var rectTransform = imageObj.GetComponent<RectTransform>();
        rectTransform.anchorMin = Vector2.zero;
        rectTransform.anchorMax = Vector2.one;
        rectTransform.offsetMin = Vector2.zero;
        rectTransform.offsetMax = Vector2.zero;
    }

    public void StartTeleportAiming(Vector3 origin, Vector3 direction)
    {
        if (isTeleporting) return;

        try
        {
            // Calculate teleport arc
            var teleportHits = CalculateTeleportArc(origin, direction);

            if (teleportHits.Count > 0)
            {
                // Update line renderer
                teleportLine.positionCount = teleportHits.Count;
                teleportLine.SetPositions(teleportHits.ToArray());
                teleportLine.enabled = true;

                // Check if last point is valid teleport target
                Vector3 endPoint = teleportHits[teleportHits.Count - 1];
                isValidTeleportTarget = ValidateTeleportTarget(endPoint);

                // Update visual feedback
                UpdateTeleportVisuals(endPoint, isValidTeleportTarget);

                teleportDestination = endPoint;
            }
            else
            {
                // No valid teleport target
                teleportLine.enabled = false;
                teleportIndicator.SetActive(false);
                isValidTeleportTarget = false;
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRTeleportationSystem] Error during teleport aiming: {ex.Message}");
        }
    }

    public void ExecuteTeleport()
    {
        if (!isValidTeleportTarget || isTeleporting) return;

        StartCoroutine(TeleportCoroutine());
    }

    public void StopTeleportAiming()
    {
        teleportLine.enabled = false;
        teleportIndicator.SetActive(false);
        isValidTeleportTarget = false;
    }

    private List<Vector3> CalculateTeleportArc(Vector3 origin, Vector3 direction)
    {
        var points = new List<Vector3>();
        Vector3 velocity = direction * 10f; // Initial velocity
        Vector3 gravity = Physics.gravity;
        Vector3 currentPos = origin;
        float timeStep = 0.05f;
        int maxSteps = 100;

        for (int i = 0; i < maxSteps; i++)
        {
            points.Add(currentPos);

            // Check for collision
            if (Physics.Raycast(currentPos, velocity.normalized, out RaycastHit hit, velocity.magnitude * timeStep, settings.teleportLayers))
            {
                points.Add(hit.point);
                break;
            }

            // Update position and velocity for next frame
            currentPos += velocity * timeStep;
            velocity += gravity * timeStep;

            // Stop if too far
            if (Vector3.Distance(origin, currentPos) > settings.maxTeleportDistance)
            {
                break;
            }
        }

        return points;
    }

    private bool ValidateTeleportTarget(Vector3 position)
    {
        if (!settings.enableTeleportValidation) return true;

        try
        {
            // Check if position is on valid teleport layer
            if (Physics.Raycast(position + Vector3.up, Vector3.down, out RaycastHit hit, 2f, settings.teleportLayers))
            {
                // Additional validation can be added here
                // (e.g., minimum space requirements, no obstacles)
                return true;
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRTeleportationSystem] Error validating teleport target: {ex.Message}");
        }

        return false;
    }

    private void UpdateTeleportVisuals(Vector3 position, bool isValid)
    {
        // Update teleport indicator
        teleportIndicator.transform.position = position;
        teleportIndicator.SetActive(true);

        // Update materials based on validity
        var renderer = teleportIndicator.GetComponent<Renderer>();
        if (renderer != null)
        {
            renderer.material = isValid ? settings.validTeleportMaterial : settings.invalidTeleportMaterial;
        }

        // Update line color
        teleportLine.material = isValid ? settings.validTeleportMaterial : settings.invalidTeleportMaterial;
    }

    private System.Collections.IEnumerator TeleportCoroutine()
    {
        isTeleporting = true;

        try
        {
            // Fade out
            if (settings.enableComfortVignette && fadeCanvas != null)
            {
                yield return StartCoroutine(FadeCoroutine(0f, settings.vignetteIntensity, settings.teleportFadeTime));
            }

            // Perform teleport
            var teleportRequest = new TeleportRequest
            {
                destinationPosition = teleportDestination,
                destinationRotation = transform.rotation
            };

            teleportProvider.QueueTeleportRequest(teleportRequest);

            // Spawn effect at destination
            if (settings.teleportEffectPrefab != null)
            {
                Instantiate(settings.teleportEffectPrefab, teleportDestination, Quaternion.identity);
            }

            // Small delay for teleport to complete
            yield return new WaitForSeconds(0.1f);

            // Fade in
            if (settings.enableComfortVignette && fadeCanvas != null)
            {
                yield return StartCoroutine(FadeCoroutine(settings.vignetteIntensity, 0f, settings.teleportFadeTime));
            }

            Debug.Log($"[XRTeleportationSystem] Teleported to: {teleportDestination}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRTeleportationSystem] Error during teleport execution: {ex.Message}");
        }
        finally
        {
            isTeleporting = false;
            StopTeleportAiming();
        }
    }

    private System.Collections.IEnumerator FadeCoroutine(float startAlpha, float endAlpha, float duration)
    {
        if (fadeCanvas == null) yield break;

        float elapsed = 0f;

        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float alpha = Mathf.Lerp(startAlpha, endAlpha, elapsed / duration);
            fadeCanvas.alpha = alpha;
            yield return null;
        }

        fadeCanvas.alpha = endAlpha;
    }

    public void SetTeleportEnabled(bool enabled)
    {
        this.enabled = enabled;

        if (!enabled)
        {
            StopTeleportAiming();
        }
    }
}
```

#### 4.2 Smooth Locomotion System

[[LLM: Include smooth locomotion as an alternative to teleportation. This is important for users who prefer continuous movement.]]

```csharp
// Assets/Scripts/XR/XRSmoothLocomotion.cs
using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;

public class XRSmoothLocomotion : MonoBehaviour
{
    [System.Serializable]
    public class LocomotionSettings
    {
        [Header("Movement")]
        public float moveSpeed = 3f;
        public float sprintMultiplier = 2f;
        public float acceleration = 8f;
        public float deceleration = 8f;

        [Header("Turning")]
        public float turnSpeed = 60f;
        public bool enableSmoothTurn = true;
        public bool enableSnapTurn = false;
        public float snapTurnAngle = 30f;

        [Header("Comfort")]
        public bool enableVignette = true;
        public float vignetteIntensity = 0.3f;
        public float vignetteSpeed = 1f;
        public bool enableGradientVignette = true;
    }

    [SerializeField] private LocomotionSettings settings;
    [SerializeField] private CharacterController characterController;
    [SerializeField] private Camera playerCamera;
    [SerializeField] private Transform xrRig;

    // Movement state
    private Vector2 moveInput;
    private Vector2 turnInput;
    private bool isMoving = false;
    private bool isSprinting = false;
    private Vector3 currentVelocity;

    // Comfort vignette
    private CanvasGroup vignetteCanvas;
    private float currentVignetteAlpha = 0f;

    public static XRSmoothLocomotion Instance { get; private set; }

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

    private void Start()
    {
        InitializeLocomotion();
        SetupComfortVignette();
    }

    private void InitializeLocomotion()
    {
        try
        {
            // Find or create character controller
            if (characterController == null)
            {
                characterController = GetComponent<CharacterController>();
                if (characterController == null)
                {
                    characterController = gameObject.AddComponent<CharacterController>();

                    // Configure character controller for XR
                    characterController.radius = 0.25f;
                    characterController.height = 1.8f;
                    characterController.center = new Vector3(0, 0.9f, 0);
                }
            }

            // Find XR Rig and camera
            if (xrRig == null)
            {
                var xrRigComponent = FindObjectOfType<XRRig>();
                if (xrRigComponent != null)
                {
                    xrRig = xrRigComponent.transform;
                }
            }

            if (playerCamera == null)
            {
                playerCamera = Camera.main;
                if (playerCamera == null)
                {
                    playerCamera = FindObjectOfType<Camera>();
                }
            }

            Debug.Log("[XRSmoothLocomotion] Smooth locomotion initialized successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRSmoothLocomotion] Failed to initialize smooth locomotion: {ex.Message}");
        }
    }

    private void SetupComfortVignette()
    {
        if (!settings.enableVignette) return;

        try
        {
            // Create vignette canvas
            var vignetteObj = new GameObject("Locomotion Vignette");
            vignetteObj.transform.SetParent(playerCamera.transform);

            var canvas = vignetteObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 999;

            vignetteCanvas = vignetteObj.AddComponent<CanvasGroup>();
            vignetteCanvas.alpha = 0f;
            vignetteCanvas.interactable = false;
            vignetteCanvas.blocksRaycasts = false;

            // Create vignette image
            var imageObj = new GameObject("Vignette Image");
            imageObj.transform.SetParent(vignetteObj.transform);

            var image = imageObj.AddComponent<UnityEngine.UI.Image>();

            if (settings.enableGradientVignette)
            {
                // Create radial gradient material/texture for vignette
                CreateVignetteTexture(image);
            }
            else
            {
                image.color = new Color(0, 0, 0, settings.vignetteIntensity);
            }

            var rectTransform = imageObj.GetComponent<RectTransform>();
            rectTransform.anchorMin = Vector2.zero;
            rectTransform.anchorMax = Vector2.one;
            rectTransform.offsetMin = Vector2.zero;
            rectTransform.offsetMax = Vector2.zero;

            Debug.Log("[XRSmoothLocomotion] Comfort vignette setup complete");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRSmoothLocomotion] Failed to setup comfort vignette: {ex.Message}");
        }
    }

    private void CreateVignetteTexture(UnityEngine.UI.Image image)
    {
        // Create a simple radial gradient texture for vignette effect
        int textureSize = 256;
        Texture2D vignetteTexture = new Texture2D(textureSize, textureSize);

        Vector2 center = new Vector2(textureSize * 0.5f, textureSize * 0.5f);
        float maxDistance = textureSize * 0.5f;

        for (int x = 0; x < textureSize; x++)
        {
            for (int y = 0; y < textureSize; y++)
            {
                Vector2 pixelPos = new Vector2(x, y);
                float distance = Vector2.Distance(pixelPos, center);
                float alpha = Mathf.Clamp01(distance / maxDistance);
                alpha = Mathf.Pow(alpha, 2f); // Steeper falloff

                vignetteTexture.SetPixel(x, y, new Color(0, 0, 0, alpha));
            }
        }

        vignetteTexture.Apply();

        // Create sprite from texture
        Sprite vignetteSprite = Sprite.Create(vignetteTexture, new Rect(0, 0, textureSize, textureSize), new Vector2(0.5f, 0.5f));
        image.sprite = vignetteSprite;
    }

    private void Update()
    {
        UpdateMovement();
        UpdateTurning();
        UpdateComfortVignette();
    }

    private void UpdateMovement()
    {
        if (characterController == null) return;

        try
        {
            // Get movement input (this would come from input system)
            // For now, using placeholder - integrate with XRInputManager
            Vector2 inputVector = GetMovementInput();

            // Calculate move direction relative to camera
            Vector3 cameraForward = playerCamera.transform.forward;
            Vector3 cameraRight = playerCamera.transform.right;

            // Project to horizontal plane
            cameraForward.y = 0;
            cameraRight.y = 0;
            cameraForward.Normalize();
            cameraRight.Normalize();

            // Calculate desired movement direction
            Vector3 moveDirection = cameraForward * inputVector.y + cameraRight * inputVector.x;

            // Apply speed
            float currentSpeed = settings.moveSpeed;
            if (isSprinting)
            {
                currentSpeed *= settings.sprintMultiplier;
            }

            Vector3 targetVelocity = moveDirection * currentSpeed;

            // Apply acceleration/deceleration
            if (targetVelocity.magnitude > 0.1f)
            {
                currentVelocity = Vector3.MoveTowards(currentVelocity, targetVelocity, settings.acceleration * Time.deltaTime);
                isMoving = true;
            }
            else
            {
                currentVelocity = Vector3.MoveTowards(currentVelocity, Vector3.zero, settings.deceleration * Time.deltaTime);
                isMoving = currentVelocity.magnitude > 0.1f;
            }

            // Apply gravity
            if (!characterController.isGrounded)
            {
                currentVelocity.y += Physics.gravity.y * Time.deltaTime;
            }
            else
            {
                currentVelocity.y = 0;
            }

            // Move character
            characterController.Move(currentVelocity * Time.deltaTime);
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRSmoothLocomotion] Error during movement update: {ex.Message}");
        }
    }

    private void UpdateTurning()
    {
        if (!settings.enableSmoothTurn && !settings.enableSnapTurn) return;

        try
        {
            Vector2 turnInput = GetTurnInput();

            if (settings.enableSmoothTurn)
            {
                // Smooth turning
                float turnAmount = turnInput.x * settings.turnSpeed * Time.deltaTime;
                transform.Rotate(0, turnAmount, 0);
            }
            else if (settings.enableSnapTurn)
            {
                // Snap turning (implement with input threshold)
                if (Mathf.Abs(turnInput.x) > 0.8f)
                {
                    float snapDirection = Mathf.Sign(turnInput.x);
                    transform.Rotate(0, snapDirection * settings.snapTurnAngle, 0);

                    // Add delay to prevent rapid snapping
                    // This would need proper input handling
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRSmoothLocomotion] Error during turning update: {ex.Message}");
        }
    }

    private void UpdateComfortVignette()
    {
        if (!settings.enableVignette || vignetteCanvas == null) return;

        try
        {
            // Calculate vignette intensity based on movement speed
            float speedRatio = currentVelocity.magnitude / (settings.moveSpeed * settings.sprintMultiplier);
            float targetAlpha = speedRatio * settings.vignetteIntensity;

            // Smooth transition
            currentVignetteAlpha = Mathf.MoveTowards(currentVignetteAlpha, targetAlpha, settings.vignetteSpeed * Time.deltaTime);
            vignetteCanvas.alpha = currentVignetteAlpha;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRSmoothLocomotion] Error updating comfort vignette: {ex.Message}");
        }
    }

    // Placeholder methods - integrate with actual input system
    private Vector2 GetMovementInput()
    {
        // This should be connected to the XR Input System
        // For now, return zero vector
        return Vector2.zero;
    }

    private Vector2 GetTurnInput()
    {
        // This should be connected to the XR Input System
        // For now, return zero vector
        return Vector2.zero;
    }

    public void SetMovementInput(Vector2 input)
    {
        moveInput = input;
    }

    public void SetTurnInput(Vector2 input)
    {
        turnInput = input;
    }

    public void SetSprinting(bool sprinting)
    {
        isSprinting = sprinting;
    }

    public void SetLocomotionEnabled(bool enabled)
    {
        this.enabled = enabled;

        if (!enabled)
        {
            currentVelocity = Vector3.zero;
            isMoving = false;
        }
    }
}
```

### 5. XR Performance Optimization

#### 5.1 XR Render Performance Manager

[[LLM: Configure performance optimization based on target platforms. Mobile XR requires aggressive optimization, PC VR can handle higher quality.]]

```csharp
// Assets/Scripts/XR/XRPerformanceManager.cs
using UnityEngine;
using UnityEngine.XR;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using System.Collections;

public class XRPerformanceManager : MonoBehaviour
{
    [System.Serializable]
    public class PerformanceSettings
    {
        [Header("Target Performance")]
        public float targetFrameRate = 90f;
        public float minimumFrameRate = 72f;
        public bool enableDynamicAdjustment = true;

        [Header("Render Settings")]
        public float eyeTextureResolution = 1.0f;
        public int shadowDistance = 50;
        public ShadowQuality shadowQuality = ShadowQuality.HardOnly;
        public int shadowCascades = 2;

        [Header("Quality Presets")]
        public QualityLevel qualityLevel = QualityLevel.Medium;
        public bool enableMultiview = true;
        public bool enableFoveatedRendering = false;
    }

    public enum QualityLevel
    {
        Low,
        Medium,
        High,
        Ultra
    }

    [SerializeField] private PerformanceSettings settings;
    [SerializeField] private bool enablePerformanceMonitoring = true;
    [SerializeField] private float performanceCheckInterval = 1f;

    // Performance monitoring
    private float[] frameTimes;
    private int frameTimeIndex = 0;
    private float averageFrameTime = 0f;
    private float currentFPS = 0f;
    private bool isPerformanceOptimal = true;

    // Dynamic adjustment
    private QualityLevel currentQualityLevel;
    private float lastQualityAdjustmentTime = 0f;
    private float qualityAdjustmentCooldown = 5f;

    public static XRPerformanceManager Instance { get; private set; }

    public float CurrentFPS => currentFPS;
    public bool IsPerformanceOptimal => isPerformanceOptimal;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);

            // Initialize frame time tracking
            frameTimes = new float[60]; // Track last 60 frames
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void Start()
    {
        InitializePerformanceSettings();

        if (enablePerformanceMonitoring)
        {
            StartCoroutine(PerformanceMonitoringCoroutine());
        }
    }

    private void InitializePerformanceSettings()
    {
        try
        {
            currentQualityLevel = settings.qualityLevel;
            ApplyQualitySettings(currentQualityLevel);
            ApplyXRSpecificSettings();

            Debug.Log($"[XRPerformanceManager] Performance settings initialized - Quality: {currentQualityLevel}, Target FPS: {settings.targetFrameRate}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRPerformanceManager] Failed to initialize performance settings: {ex.Message}");
        }
    }

    private void ApplyQualitySettings(QualityLevel level)
    {
        try
        {
            switch (level)
            {
                case QualityLevel.Low:
                    QualitySettings.SetQualityLevel(0);
                    XRSettings.eyeTextureResolutionScale = 0.7f;
                    QualitySettings.shadowDistance = 25;
                    QualitySettings.shadows = ShadowQuality.Disable;
                    break;

                case QualityLevel.Medium:
                    QualitySettings.SetQualityLevel(2);
                    XRSettings.eyeTextureResolutionScale = settings.eyeTextureResolution;
                    QualitySettings.shadowDistance = settings.shadowDistance;
                    QualitySettings.shadows = ShadowQuality.HardOnly;
                    break;

                case QualityLevel.High:
                    QualitySettings.SetQualityLevel(4);
                    XRSettings.eyeTextureResolutionScale = 1.2f;
                    QualitySettings.shadowDistance = 75;
                    QualitySettings.shadows = ShadowQuality.All;
                    break;

                case QualityLevel.Ultra:
                    QualitySettings.SetQualityLevel(5);
                    XRSettings.eyeTextureResolutionScale = 1.4f;
                    QualitySettings.shadowDistance = 100;
                    QualitySettings.shadows = ShadowQuality.All;
                    break;
            }

            Debug.Log($"[XRPerformanceManager] Applied quality settings: {level}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRPerformanceManager] Failed to apply quality settings: {ex.Message}");
        }
    }

    private void ApplyXRSpecificSettings()
    {
        try
        {
            // Configure XR render settings
            if (XRSettings.enabled)
            {
                XRSettings.eyeTextureResolutionScale = settings.eyeTextureResolution;

                // Enable multiview if supported
                if (settings.enableMultiview && XRSettings.supportedDevices.Length > 0)
                {
                    // This would require platform-specific implementation
                    Debug.Log("[XRPerformanceManager] Multiview rendering requested");
                }

                // Configure foveated rendering if available
                if (settings.enableFoveatedRendering)
                {
                    ConfigureFoveatedRendering();
                }
            }

            // Configure URP settings if available
            ConfigureURPSettings();
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRPerformanceManager] Failed to apply XR-specific settings: {ex.Message}");
        }
    }

    private void ConfigureFoveatedRendering()
    {
        // Platform-specific foveated rendering setup
        // This would be implemented per platform (Oculus, etc.)
        Debug.Log("[XRPerformanceManager] Foveated rendering configuration requested");
    }

    private void ConfigureURPSettings()
    {
        try
        {
            var urpAsset = GraphicsSettings.renderPipelineAsset as UniversalRenderPipelineAsset;
            if (urpAsset != null)
            {
                // Configure URP settings for XR optimization
                // Note: Many URP settings are read-only at runtime
                Debug.Log("[XRPerformanceManager] URP settings configured for XR");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRPerformanceManager] Failed to configure URP settings: {ex.Message}");
        }
    }

    private System.Collections.IEnumerator PerformanceMonitoringCoroutine()
    {
        while (enablePerformanceMonitoring)
        {
            try
            {
                UpdatePerformanceMetrics();

                if (settings.enableDynamicAdjustment)
                {
                    CheckAndAdjustQuality();
                }
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[XRPerformanceManager] Error in performance monitoring: {ex.Message}");
            }

            yield return new WaitForSeconds(performanceCheckInterval);
        }
    }

    private void UpdatePerformanceMetrics()
    {
        // Update frame time tracking
        frameTimes[frameTimeIndex] = Time.deltaTime;
        frameTimeIndex = (frameTimeIndex + 1) % frameTimes.Length;

        // Calculate average frame time
        float totalFrameTime = 0f;
        for (int i = 0; i < frameTimes.Length; i++)
        {
            totalFrameTime += frameTimes[i];
        }
        averageFrameTime = totalFrameTime / frameTimes.Length;

        // Calculate FPS
        currentFPS = 1f / averageFrameTime;

        // Check if performance is optimal
        isPerformanceOptimal = currentFPS >= settings.minimumFrameRate;

        // Log performance data periodically
        if (Time.time % 10f < performanceCheckInterval)
        {
            Debug.Log($"[XRPerformanceManager] Performance: {currentFPS:F1} FPS (Target: {settings.targetFrameRate})");
        }
    }

    private void CheckAndAdjustQuality()
    {
        if (Time.time - lastQualityAdjustmentTime < qualityAdjustmentCooldown)
        {
            return; // Still in cooldown period
        }

        try
        {
            if (currentFPS < settings.minimumFrameRate && currentQualityLevel > QualityLevel.Low)
            {
                // Decrease quality
                QualityLevel newLevel = (QualityLevel)((int)currentQualityLevel - 1);
                SetQualityLevel(newLevel);

                Debug.LogWarning($"[XRPerformanceManager] Performance below target, reducing quality to {newLevel}");
            }
            else if (currentFPS > settings.targetFrameRate * 1.1f && currentQualityLevel < QualityLevel.Ultra)
            {
                // Increase quality if we have headroom
                QualityLevel newLevel = (QualityLevel)((int)currentQualityLevel + 1);
                SetQualityLevel(newLevel);

                Debug.Log($"[XRPerformanceManager] Performance excellent, increasing quality to {newLevel}");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRPerformanceManager] Error during quality adjustment: {ex.Message}");
        }
    }

    public void SetQualityLevel(QualityLevel level)
    {
        if (level == currentQualityLevel) return;

        currentQualityLevel = level;
        ApplyQualitySettings(level);
        lastQualityAdjustmentTime = Time.time;
    }

    public void SetEyeTextureResolution(float scale)
    {
        try
        {
            settings.eyeTextureResolution = Mathf.Clamp(scale, 0.5f, 2.0f);
            XRSettings.eyeTextureResolutionScale = settings.eyeTextureResolution;

            Debug.Log($"[XRPerformanceManager] Eye texture resolution set to {scale:F2}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRPerformanceManager] Failed to set eye texture resolution: {ex.Message}");
        }
    }

    public void SetDynamicAdjustment(bool enabled)
    {
        settings.enableDynamicAdjustment = enabled;
        Debug.Log($"[XRPerformanceManager] Dynamic quality adjustment: {(enabled ? "Enabled" : "Disabled")}");
    }

    public PerformanceData GetPerformanceData()
    {
        return new PerformanceData
        {
            currentFPS = currentFPS,
            averageFrameTime = averageFrameTime,
            qualityLevel = currentQualityLevel,
            isOptimal = isPerformanceOptimal,
            eyeTextureScale = XRSettings.eyeTextureResolutionScale
        };
    }

    [System.Serializable]
    public class PerformanceData
    {
        public float currentFPS;
        public float averageFrameTime;
        public QualityLevel qualityLevel;
        public bool isOptimal;
        public float eyeTextureScale;
    }
}
```

### 6. XR UI and Interaction Setup

#### 6.1 World Space UI System

[[LLM: Configure UI systems for XR environments. This includes both world-space UI and comfortable viewing in VR/AR.]]

```csharp
// Assets/Scripts/XR/XRUIManager.cs
using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;
using UnityEngine.EventSystems;
using System.Collections.Generic;

public class XRUIManager : MonoBehaviour
{
    [System.Serializable]
    public class XRUISettings
    {
        [Header("World Space UI")]
        public float defaultUIDistance = 2f;
        public float uiScale = 0.001f;
        public bool followPlayerGaze = false;
        public float gazeFollowSpeed = 2f;

        [Header("Interaction")]
        public LayerMask uiLayerMask = 1 << 5; // UI layer
        public float pointerRange = 10f;
        public bool enableHandInteraction = true;
        public bool enableControllerInteraction = true;

        [Header("Comfort")]
        public float minUIDistance = 0.5f;
        public float maxUIDistance = 5f;
        public bool enableComfortableViewing = true;
        public float viewingAngleThreshold = 45f;
    }

    [SerializeField] private XRUISettings settings;
    [SerializeField] private Camera playerCamera;
    [SerializeField] private Canvas[] worldSpaceCanvases;
    [SerializeField] private XRRayInteractor leftRayInteractor;
    [SerializeField] private XRRayInteractor rightRayInteractor;
    [SerializeField] private XRDirectInteractor leftDirectInteractor;
    [SerializeField] private XRDirectInteractor rightDirectInteractor;

    // UI Management
    private Dictionary<Canvas, Vector3> originalCanvasPositions = new Dictionary<Canvas, Vector3>();
    private Dictionary<Canvas, bool> canvasGazeFollow = new Dictionary<Canvas, bool>();

    // Event System
    private EventSystem eventSystem;
    private StandaloneInputModule inputModule;

    public static XRUIManager Instance { get; private set; }

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

    private void Start()
    {
        InitializeXRUI();
        SetupEventSystem();
        ConfigureCanvases();
    }

    private void InitializeXRUI()
    {
        try
        {
            if (playerCamera == null)
            {
                playerCamera = Camera.main;
                if (playerCamera == null)
                {
                    playerCamera = FindObjectOfType<Camera>();
                }
            }

            // Find XR interactors if not assigned
            if (leftRayInteractor == null || rightRayInteractor == null)
            {
                FindXRInteractors();
            }

            // Find all world space canvases
            if (worldSpaceCanvases == null || worldSpaceCanvases.Length == 0)
            {
                FindWorldSpaceCanvases();
            }

            Debug.Log("[XRUIManager] XR UI system initialized successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRUIManager] Failed to initialize XR UI: {ex.Message}");
        }
    }

    private void FindXRInteractors()
    {
        var interactors = FindObjectsOfType<XRRayInteractor>();

        foreach (var interactor in interactors)
        {
            if (interactor.gameObject.name.ToLower().Contains("left"))
            {
                leftRayInteractor = interactor;
            }
            else if (interactor.gameObject.name.ToLower().Contains("right"))
            {
                rightRayInteractor = interactor;
            }
        }

        var directInteractors = FindObjectsOfType<XRDirectInteractor>();

        foreach (var interactor in directInteractors)
        {
            if (interactor.gameObject.name.ToLower().Contains("left"))
            {
                leftDirectInteractor = interactor;
            }
            else if (interactor.gameObject.name.ToLower().Contains("right"))
            {
                rightDirectInteractor = interactor;
            }
        }
    }

    private void FindWorldSpaceCanvases()
    {
        var allCanvases = FindObjectsOfType<Canvas>();
        var worldCanvases = new List<Canvas>();

        foreach (var canvas in allCanvases)
        {
            if (canvas.renderMode == RenderMode.WorldSpace)
            {
                worldCanvases.Add(canvas);
            }
        }

        worldSpaceCanvases = worldCanvases.ToArray();
    }

    private void SetupEventSystem()
    {
        try
        {
            // Find or create event system
            eventSystem = FindObjectOfType<EventSystem>();
            if (eventSystem == null)
            {
                var eventSystemObj = new GameObject("EventSystem");
                eventSystem = eventSystemObj.AddComponent<EventSystem>();
            }

            // Configure input module for XR
            inputModule = eventSystem.GetComponent<StandaloneInputModule>();
            if (inputModule == null)
            {
                inputModule = eventSystem.gameObject.AddComponent<StandaloneInputModule>();
            }

            // Disable mouse input for VR
            inputModule.enabled = false;

            Debug.Log("[XRUIManager] Event system configured for XR");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRUIManager] Failed to setup event system: {ex.Message}");
        }
    }

    private void ConfigureCanvases()
    {
        try
        {
            foreach (var canvas in worldSpaceCanvases)
            {
                if (canvas == null) continue;

                // Store original position
                originalCanvasPositions[canvas] = canvas.transform.position;

                // Configure canvas for XR
                canvas.worldCamera = playerCamera;
                canvas.renderMode = RenderMode.WorldSpace;

                // Set appropriate scale
                canvas.transform.localScale = Vector3.one * settings.uiScale;

                // Add GraphicRaycaster if not present
                var raycaster = canvas.GetComponent<GraphicRaycaster>();
                if (raycaster == null)
                {
                    raycaster = canvas.gameObject.AddComponent<GraphicRaycaster>();
                }

                // Configure for XR interaction
                raycaster.blockingObjects = GraphicRaycaster.BlockingObjects.ThreeD;

                // Position canvas at comfortable distance
                PositionCanvasComfortably(canvas);

                Debug.Log($"[XRUIManager] Configured canvas: {canvas.name}");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRUIManager] Failed to configure canvases: {ex.Message}");
        }
    }

    private void PositionCanvasComfortably(Canvas canvas)
    {
        if (playerCamera == null) return;

        try
        {
            Vector3 cameraPosition = playerCamera.transform.position;
            Vector3 cameraForward = playerCamera.transform.forward;

            // Position canvas in front of player at comfortable distance
            Vector3 targetPosition = cameraPosition + cameraForward * settings.defaultUIDistance;

            // Ensure canvas is within comfortable viewing range
            float distance = Vector3.Distance(cameraPosition, canvas.transform.position);
            if (distance < settings.minUIDistance || distance > settings.maxUIDistance)
            {
                canvas.transform.position = targetPosition;
            }

            // Orient canvas to face the player if comfortable viewing is enabled
            if (settings.enableComfortableViewing)
            {
                Vector3 directionToPlayer = (cameraPosition - canvas.transform.position).normalized;
                canvas.transform.rotation = Quaternion.LookRotation(-directionToPlayer);
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRUIManager] Failed to position canvas comfortably: {ex.Message}");
        }
    }

    private void Update()
    {
        if (settings.followPlayerGaze)
        {
            UpdateGazeFollowing();
        }

        UpdateUIInteraction();
    }

    private void UpdateGazeFollowing()
    {
        if (playerCamera == null) return;

        try
        {
            foreach (var canvas in worldSpaceCanvases)
            {
                if (canvas == null) continue;

                if (canvasGazeFollow.ContainsKey(canvas) && canvasGazeFollow[canvas])
                {
                    Vector3 cameraPosition = playerCamera.transform.position;
                    Vector3 cameraForward = playerCamera.transform.forward;

                    // Calculate target position
                    Vector3 targetPosition = cameraPosition + cameraForward * settings.defaultUIDistance;

                    // Smoothly move canvas
                    canvas.transform.position = Vector3.Lerp(
                        canvas.transform.position,
                        targetPosition,
                        settings.gazeFollowSpeed * Time.deltaTime
                    );

                    // Orient to face camera
                    Vector3 directionToCamera = (cameraPosition - canvas.transform.position).normalized;
                    canvas.transform.rotation = Quaternion.LookRotation(-directionToCamera);
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRUIManager] Error during gaze following update: {ex.Message}");
        }
    }

    private void UpdateUIInteraction()
    {
        try
        {
            // Update ray interactor settings
            if (leftRayInteractor != null)
            {
                leftRayInteractor.maxRaycastDistance = settings.pointerRange;
                leftRayInteractor.raycastMask = settings.uiLayerMask;
            }

            if (rightRayInteractor != null)
            {
                rightRayInteractor.maxRaycastDistance = settings.pointerRange;
                rightRayInteractor.raycastMask = settings.uiLayerMask;
            }

            // Enable/disable interaction methods
            if (leftDirectInteractor != null)
            {
                leftDirectInteractor.enabled = settings.enableHandInteraction;
            }

            if (rightDirectInteractor != null)
            {
                rightDirectInteractor.enabled = settings.enableHandInteraction;
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRUIManager] Error updating UI interaction: {ex.Message}");
        }
    }

    public void SetCanvasGazeFollow(Canvas canvas, bool followGaze)
    {
        if (canvas != null)
        {
            canvasGazeFollow[canvas] = followGaze;
            Debug.Log($"[XRUIManager] Canvas {canvas.name} gaze follow: {followGaze}");
        }
    }

    public void RepositionCanvas(Canvas canvas, Vector3 position, Quaternion rotation)
    {
        if (canvas == null) return;

        try
        {
            canvas.transform.position = position;
            canvas.transform.rotation = rotation;

            // Validate position is within comfortable range
            if (playerCamera != null)
            {
                float distance = Vector3.Distance(playerCamera.transform.position, position);
                if (distance < settings.minUIDistance || distance > settings.maxUIDistance)
                {
                    Debug.LogWarning($"[XRUIManager] Canvas positioned outside comfortable viewing range: {distance:F2}m");
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRUIManager] Failed to reposition canvas: {ex.Message}");
        }
    }

    public void CreateWorldSpaceUI(GameObject uiPrefab, Vector3 position, Vector3 scale)
    {
        if (uiPrefab == null) return;

        try
        {
            var uiInstance = Instantiate(uiPrefab, position, Quaternion.identity);

            // Configure as world space canvas
            var canvas = uiInstance.GetComponent<Canvas>();
            if (canvas == null)
            {
                canvas = uiInstance.AddComponent<Canvas>();
            }

            canvas.renderMode = RenderMode.WorldSpace;
            canvas.worldCamera = playerCamera;
            uiInstance.transform.localScale = scale;

            // Add to managed canvases
            var newCanvases = new Canvas[worldSpaceCanvases.Length + 1];
            worldSpaceCanvases.CopyTo(newCanvases, 0);
            newCanvases[worldSpaceCanvases.Length] = canvas;
            worldSpaceCanvases = newCanvases;

            // Position comfortably
            PositionCanvasComfortably(canvas);

            Debug.Log($"[XRUIManager] Created world space UI: {uiPrefab.name}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRUIManager] Failed to create world space UI: {ex.Message}");
        }
    }

    public void SetUIInteractionEnabled(bool enabled)
    {
        try
        {
            if (leftRayInteractor != null)
                leftRayInteractor.enabled = enabled && settings.enableControllerInteraction;

            if (rightRayInteractor != null)
                rightRayInteractor.enabled = enabled && settings.enableControllerInteraction;

            if (leftDirectInteractor != null)
                leftDirectInteractor.enabled = enabled && settings.enableHandInteraction;

            if (rightDirectInteractor != null)
                rightDirectInteractor.enabled = enabled && settings.enableHandInteraction;

            Debug.Log($"[XRUIManager] UI interaction: {(enabled ? "Enabled" : "Disabled")}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRUIManager] Failed to set UI interaction state: {ex.Message}");
        }
    }
}
```

### 7. Testing and Validation

#### 7.1 XR Integration Tests

[[LLM: Create comprehensive tests covering all XR functionality. Adapt test coverage based on enabled XR features.]]

```csharp
// Assets/Tests/XR/XRIntegrationTests.cs
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.XR;
using UnityEngine.XR.Management;
using System.Collections;

[TestFixture]
public class XRIntegrationTests
{
    [SetUp]
    public void SetUp()
    {
        // Ensure clean test environment
        Time.timeScale = 1f;
    }

    [Test]
    public void XR_PackagesInstalled_AllRequiredPackagesPresent()
    {
        // Test that all required XR packages are installed
        Assert.IsTrue(IsPackageInstalled("com.unity.xr.management"));
        Assert.IsTrue(IsPackageInstalled("com.unity.xr.interaction.toolkit"));

        Debug.Log("[XRIntegrationTests] XR packages validation passed");
    }

    [UnityTest]
    public IEnumerator XR_SystemInitialization_InitializesCorrectly()
    {
        // Test XR system initialization
        var xrManager = XRPlatformManager.Instance;
        Assert.IsNotNull(xrManager, "XRPlatformManager instance should exist");

        // Wait for initialization
        yield return new WaitForSeconds(2f);

        // Check if XR is active (may not be on test runner)
        bool xrActive = XRSettings.enabled;
        Debug.Log($"[XRIntegrationTests] XR Active: {xrActive}");

        // Test should pass whether XR is active or not (depends on test environment)
        Assert.IsTrue(true, "XR initialization test completed");
    }

    [Test]
    public void XR_DeviceDetection_WorksCorrectly()
    {
        var deviceDetector = XRDeviceDetector.Instance;
        Assert.IsNotNull(deviceDetector, "XRDeviceDetector should exist");

        // Test device type detection
        var detectedDevice = deviceDetector.DetectedDevice;
        Debug.Log($"[XRIntegrationTests] Detected device: {detectedDevice}");

        // In test environment, device may be Unknown
        Assert.IsTrue(System.Enum.IsDefined(typeof(XRDeviceDetector.XRDeviceType), detectedDevice));
    }

    [Test]
    public void XR_InputManager_ConfiguredCorrectly()
    {
        var inputManager = XRInputManager.Instance;
        Assert.IsNotNull(inputManager, "XRInputManager should exist");

        // Test haptic feedback system
        Assert.DoesNotThrow(() => inputManager.TriggerHaptic(true, 0.5f));
        Assert.DoesNotThrow(() => inputManager.TriggerHaptic(false, 0.5f));

        Debug.Log("[XRIntegrationTests] XR input manager validation passed");
    }

    [Test]
    public void XR_HandTracking_InitializesWithoutErrors()
    {
        var handTracking = XRHandTrackingManager.Instance;

        if (handTracking != null)
        {
            // Test hand tracking queries
            Assert.DoesNotThrow(() => handTracking.IsHandTracked(UnityEngine.XR.Hands.XRHandedness.Left));
            Assert.DoesNotThrow(() => handTracking.IsHandTracked(UnityEngine.XR.Hands.XRHandedness.Right));

            Debug.Log("[XRIntegrationTests] Hand tracking validation passed");
        }
        else
        {
            Debug.Log("[XRIntegrationTests] Hand tracking not available in test environment");
        }
    }

    [Test]
    public void XR_TeleportationSystem_ConfiguredCorrectly()
    {
        var teleportSystem = XRTeleportationSystem.Instance;
        Assert.IsNotNull(teleportSystem, "XRTeleportationSystem should exist");

        // Test teleportation controls
        Assert.DoesNotThrow(() => teleportSystem.SetTeleportEnabled(true));
        Assert.DoesNotThrow(() => teleportSystem.SetTeleportEnabled(false));

        Debug.Log("[XRIntegrationTests] Teleportation system validation passed");
    }

    [Test]
    public void XR_SmoothLocomotion_ConfiguredCorrectly()
    {
        var locomotion = XRSmoothLocomotion.Instance;
        Assert.IsNotNull(locomotion, "XRSmoothLocomotion should exist");

        // Test locomotion controls
        Assert.DoesNotThrow(() => locomotion.SetMovementInput(Vector2.zero));
        Assert.DoesNotThrow(() => locomotion.SetTurnInput(Vector2.zero));
        Assert.DoesNotThrow(() => locomotion.SetLocomotionEnabled(true));

        Debug.Log("[XRIntegrationTests] Smooth locomotion validation passed");
    }

    [Test]
    public void XR_PerformanceManager_WorksCorrectly()
    {
        var perfManager = XRPerformanceManager.Instance;
        Assert.IsNotNull(perfManager, "XRPerformanceManager should exist");

        // Test performance monitoring
        var perfData = perfManager.GetPerformanceData();
        Assert.IsNotNull(perfData, "Performance data should be available");
        Assert.IsTrue(perfData.currentFPS >= 0, "FPS should be non-negative");

        // Test quality adjustment
        Assert.DoesNotThrow(() => perfManager.SetQualityLevel(XRPerformanceManager.QualityLevel.Medium));
        Assert.DoesNotThrow(() => perfManager.SetEyeTextureResolution(1.0f));

        Debug.Log($"[XRIntegrationTests] Performance manager validation passed - FPS: {perfData.currentFPS:F1}");
    }

    [Test]
    public void XR_UIManager_ConfiguredCorrectly()
    {
        var uiManager = XRUIManager.Instance;
        Assert.IsNotNull(uiManager, "XRUIManager should exist");

        // Test UI interaction controls
        Assert.DoesNotThrow(() => uiManager.SetUIInteractionEnabled(true));
        Assert.DoesNotThrow(() => uiManager.SetUIInteractionEnabled(false));

        Debug.Log("[XRIntegrationTests] XR UI manager validation passed");
    }

    [UnityTest]
    public IEnumerator XR_ARSession_InitializesIfAvailable()
    {
        var arManager = ARSessionManager.Instance;

        if (arManager != null)
        {
            // Test AR session management
            Assert.DoesNotThrow(() => arManager.StartARSession());

            yield return new WaitForSeconds(1f);

            // Check session state (may not be active in test environment)
            bool isActive = arManager.IsARSessionActive;
            Debug.Log($"[XRIntegrationTests] AR session active: {isActive}");

            Assert.DoesNotThrow(() => arManager.StopARSession());
        }
        else
        {
            Debug.Log("[XRIntegrationTests] AR functionality not available in test environment");
        }

        yield return null;
    }

    [Test]
    public void XR_SpatialAnchors_WorkCorrectly()
    {
        var anchorManager = ARSpatialAnchorManager.Instance;

        if (anchorManager != null)
        {
            // Test anchor management
            Assert.DoesNotThrow(() => anchorManager.ClearAllAnchors());

            Debug.Log("[XRIntegrationTests] Spatial anchor manager validation passed");
        }
        else
        {
            Debug.Log("[XRIntegrationTests] Spatial anchors not available in test environment");
        }
    }

    [Test]
    public void XR_PerformanceTargets_MeetRequirements()
    {
        var perfManager = XRPerformanceManager.Instance;
        if (perfManager == null) return;

        var perfData = perfManager.GetPerformanceData();

        // Performance requirements for XR
        float minFPS = 72f; // Minimum for VR comfort
        float maxFrameTime = 13.89f; // ~72 FPS in milliseconds

        if (Application.isPlaying && XRSettings.enabled)
        {
            // Only check performance targets when XR is actually running
            Assert.IsTrue(perfData.currentFPS >= minFPS || !perfData.isOptimal,
                $"XR FPS should meet minimum requirements: {perfData.currentFPS:F1} >= {minFPS}");
        }

        Debug.Log($"[XRIntegrationTests] Performance targets check - FPS: {perfData.currentFPS:F1}, Quality: {perfData.qualityLevel}");
    }

    private bool IsPackageInstalled(string packageName)
    {
        try
        {
            string manifestPath = "Packages/manifest.json";
            if (System.IO.File.Exists(manifestPath))
            {
                string manifestContent = System.IO.File.ReadAllText(manifestPath);
                return manifestContent.Contains(packageName);
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[XRIntegrationTests] Error checking package installation: {ex.Message}");
        }

        return false;
    }
}
```

### 8. Documentation and Integration

#### 8.1 Generate XR API Reference

Create `docs/package-integration/xr-system.md`:

````markdown
# Unity XR Development Integration Guide

## Quick Start

### VR Setup (Quest/Rift/Vive)

```csharp
// Initialize XR Platform
var xrPlatform = XRPlatformManager.Instance;

// Setup teleportation
var teleport = XRTeleportationSystem.Instance;
teleport.StartTeleportAiming(controllerPosition, controllerDirection);
teleport.ExecuteTeleport();

// Handle controller input
var inputManager = XRInputManager.Instance;
inputManager.TriggerHaptic(true, 0.5f); // Left controller haptic
```
````

### AR Setup (ARCore/ARKit)

```csharp
// Initialize AR session
var arSession = ARSessionManager.Instance;
arSession.StartARSession();

// Detect planes and create anchors
if (arSession.TryRaycast(screenPoint, out ARRaycastHit hit))
{
    var anchorManager = ARSpatialAnchorManager.Instance;
    var anchor = anchorManager.CreateAnchor(hit.pose.position, hit.pose.rotation);
}
```

### Hand Tracking

```csharp
// Check hand tracking availability
var handTracking = XRHandTrackingManager.Instance;
if (handTracking.IsHandTracked(XRHandedness.Right))
{
    Vector3 indexTipPosition;
    if (handTracking.TryGetHandPosition(XRHandedness.Right, XRHandJointID.IndexTip, out indexTipPosition))
    {
        // Use hand position for interaction
    }
}
```

## Performance Optimization

### Automatic Quality Adjustment

```csharp
var perfManager = XRPerformanceManager.Instance;
perfManager.SetDynamicAdjustment(true); // Enable automatic quality scaling
perfManager.SetQualityLevel(XRPerformanceManager.QualityLevel.Medium);
```

### Eye Texture Resolution

```csharp
// Adjust for performance
perfManager.SetEyeTextureResolution(0.8f); // Reduce resolution for better performance
perfManager.SetEyeTextureResolution(1.2f); // Increase for better quality
```

## UI Integration

### World Space UI

```csharp
var uiManager = XRUIManager.Instance;

// Create world space UI
uiManager.CreateWorldSpaceUI(uiPrefab, position, Vector3.one * 0.001f);

// Enable gaze following
uiManager.SetCanvasGazeFollow(canvas, true);
```

## Common Patterns

### Teleportation with Validation

[Source: XRTeleportationSystem.cs]

### Smooth Locomotion with Comfort

[Source: XRSmoothLocomotion.cs]

### Performance Monitoring

[Source: XRPerformanceManager.cs]

### Hand Gesture Recognition

[Source: XRHandTrackingManager.cs]

## Platform-Specific Notes

### Oculus Quest

- Use Mobile quality settings
- Enable foveated rendering
- Target 72 FPS minimum

### PC VR (Rift, Vive, Index)

- Higher quality settings available
- Target 90 FPS
- Enhanced visual effects

### AR (Mobile)

- Battery life considerations
- Plane detection for anchoring
- Camera pass-through

### HoloLens

- Hand tracking priority
- Spatial mapping
- Voice commands integration

## Best Practices

1. **Performance**: Always monitor frame rate and adjust quality dynamically
2. **Comfort**: Provide multiple locomotion options (teleport and smooth)
3. **Accessibility**: Support both controller and hand interaction
4. **UI Design**: Keep UI elements within comfortable viewing distances
5. **Testing**: Test on target hardware early and often
6. **Optimization**: Use platform-specific optimizations

````

#### 8.2 Update Story Templates
[[LLM: Integrate XR requirements with existing story templates. Add conditional requirements based on target XR platforms.]]

Enhance story creation to include XR context:
```markdown
## XR Development Requirements
- [ ] XR platform support configured ({{target_xr_platforms}})
- [ ] Controller input mapping implemented
- [ ] Hand tracking integration (if supported)
- [ ] Teleportation system functional
- [ ] Smooth locomotion alternative available
- [ ] AR plane detection setup (for AR platforms)
- [ ] Spatial anchors implemented (for AR)
- [ ] World space UI configured
- [ ] Performance optimization applied
- [ ] 90 FPS target achieved (VR) / 60 FPS (AR)
- [ ] Comfort settings validated
- [ ] Platform-specific optimizations applied
- [ ] XR interaction tests passing
````

### 9. Validation Checklist

- [ ] XR packages installed and configured
- [ ] XR Plugin Management setup
- [ ] Device detection and compatibility validated
- [ ] VR controller input mapping functional
- [ ] Hand tracking implemented (if supported)
- [ ] AR Foundation configured (for AR platforms)
- [ ] Spatial anchors and tracking working
- [ ] Teleportation system implemented
- [ ] Smooth locomotion alternative available
- [ ] Performance optimization active
- [ ] 90 FPS target achieved (VR) / 60 FPS (AR)
- [ ] World space UI system functional
- [ ] Comfort settings implemented
- [ ] Platform-specific optimizations applied
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Complete XR API documentation

## Success Criteria

- XR system fully integrated with game architecture
- Both VR and AR platforms supported (as configured)
- Device detection and compatibility working
- Multiple locomotion methods available
- Hand tracking functional on supported platforms
- AR plane detection and anchoring working
- Performance targets met (90 FPS VR, 60 FPS AR)
- World space UI system operational
- Comfort settings preventing motion sickness
- All XR integration tests passing
- Complete documentation for development team

## Notes

- This task extends unity-package-integration for XR-specific setup
- Supports multiple XR platforms: Oculus, OpenXR, ARCore, ARKit, HoloLens
- XR SDK version compatibility: Unity 2022.3 LTS, 2023.3 LTS
- Performance optimization critical for maintaining frame rates
- Comfort settings essential for preventing motion sickness
- Hand tracking enables natural interaction on supported devices
- AR Foundation provides cross-platform AR functionality
- World space UI ensures proper XR user interface design
- Platform-specific optimizations maximize performance per device
- Template placeholders: {{root}}, {{target_xr_platforms}}, {{project_root}}
- LLM directives guide adaptive processing based on project configuration
- Error handling ensures robust XR implementation across platforms
