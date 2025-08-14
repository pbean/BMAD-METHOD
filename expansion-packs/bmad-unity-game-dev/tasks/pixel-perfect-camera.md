# Unity Pixel Perfect Camera Task

## Purpose

To implement and configure Unity's Pixel Perfect Camera system for 2D games requiring crisp, pixel-perfect rendering. This task extends `setup-camera-system.md` to provide Unity-specific pixel perfect rendering patterns for retro-style games, pixel art projects, and 2D games where visual fidelity and pixel alignment are critical for aesthetic and gameplay purposes.

## Prerequisites

- Unity project configured with 2D Template or 2D Renderer Pipeline
- Unity 2D Pixel Perfect package installed (com.unity.2d.pixel-perfect)
- Game Design Document (GDD) specifying target resolution and pixel art requirements
- Understanding of pixel art fundamentals and pixel-per-unit ratios
- Basic 2D sprites and assets prepared for pixel perfect rendering
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps for Pixel Perfect Camera setup]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Pixel Perfect Camera Foundation Setup

#### 1.1 Pixel Perfect Camera Configuration

[[LLM: Analyze the Game Design Document to determine the optimal pixel perfect camera settings based on target resolution, pixel art style, and platform requirements. Consider reference resolution, pixels per unit ratio, crop frame settings, and upscaling methods that will provide the best visual quality for the specific art style and target platforms.]]

**Core Pixel Perfect Camera Setup**:

```csharp
// Assets/Scripts/Camera/PixelPerfectCameraManager.cs
using UnityEngine;
using UnityEngine.U2D;
using System.Collections.Generic;

namespace {{project_namespace}}.Camera
{
    /// <summary>
    /// Comprehensive manager for Unity Pixel Perfect Camera configuration and optimization
    /// Handles pixel perfect rendering setup, resolution management, and visual quality optimization
    /// </summary>
    [RequireComponent(typeof(PixelPerfectCamera))]
    public class PixelPerfectCameraManager : MonoBehaviour
    {
        [Header("Pixel Perfect Configuration")]
        [SerializeField] private int referenceResolutionX = 320;
        [SerializeField] private int referenceResolutionY = 180;
        [SerializeField] private int pixelsPerUnit = 16;
        [SerializeField] private bool upscaleRenderTexture = false;
        [SerializeField] private bool pixelSnapping = true;
        [SerializeField] private bool cropFrameX = false;
        [SerializeField] private bool cropFrameY = false;
        [SerializeField] private bool stretchFill = false;

        [Header("Advanced Settings")]
        [SerializeField] private FilterMode spriteFilterMode = FilterMode.Point;
        [SerializeField] private bool enableGridMovement = true;
        [SerializeField] private float gridSize = 1f;
        [SerializeField] private bool enablePixelSnapColliders = true;
        [SerializeField] private bool optimizeForMobile = false;

        [Header("Quality Settings")]
        [SerializeField] private bool enableAntiAliasing = false;
        [SerializeField] private bool enableMSAA = false;
        [SerializeField] private bool enableVSync = true;
        [SerializeField] private int targetFrameRate = 60;

        [Header("Debug Settings")]
        [SerializeField] private bool showDebugInfo = false;
        [SerializeField] private bool showPixelGrid = false;
        [SerializeField] private bool enablePerfomanceMetrics = false;

        // Component references
        private PixelPerfectCamera pixelPerfectCamera;
        private Camera mainCamera;
        private Transform cameraTransform;

        // Runtime state
        private Vector2 currentReferenceResolution;
        private int currentPixelsPerUnit;
        private bool isInitialized = false;

        // Performance tracking
        private float lastRenderTime = 0f;
        private int frameCount = 0;
        private float averageFPS = 0f;

        // Events for pixel perfect camera state changes
        public System.Action<Vector2> OnReferenceResolutionChanged;
        public System.Action<int> OnPixelsPerUnitChanged;
        public System.Action<bool> OnPixelSnappingChanged;
        public System.Action<PerformanceMetrics> OnPerformanceUpdate;

        [System.Serializable]
        public struct PerformanceMetrics
        {
            public float currentFPS;
            public float averageFPS;
            public float renderTime;
            public int currentZoom;
            public Vector2 actualResolution;
            public bool isPerformanceOptimal;
        }

        // Static instance for global access
        public static PixelPerfectCameraManager Instance { get; private set; }

        public PixelPerfectCamera PixelPerfectCamera => pixelPerfectCamera;
        public Camera MainCamera => mainCamera;
        public Vector2 ReferenceResolution => new Vector2(referenceResolutionX, referenceResolutionY);
        public int PixelsPerUnit => pixelsPerUnit;
        public bool IsInitialized => isInitialized;

        private void Awake()
        {
            // Singleton pattern for global camera management
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                InitializePixelPerfectCamera();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            ConfigureQualitySettings();

            if (enablePerfomanceMetrics)
            {
                InvokeRepeating(nameof(UpdatePerformanceMetrics), 1f, 1f);
            }
        }

        private void Update()
        {
            if (showDebugInfo)
            {
                UpdateDebugInfo();
            }

            // Handle runtime resolution changes
            HandleResolutionChanges();
        }

        /// <summary>
        /// Initialize the Pixel Perfect Camera with configured settings
        /// </summary>
        private void InitializePixelPerfectCamera()
        {
            pixelPerfectCamera = GetComponent<PixelPerfectCamera>();
            mainCamera = GetComponent<Camera>();
            cameraTransform = transform;

            if (pixelPerfectCamera == null)
            {
                Debug.LogError("PixelPerfectCamera component not found! Adding component automatically.");
                pixelPerfectCamera = gameObject.AddComponent<PixelPerfectCamera>();
            }

            ApplyPixelPerfectSettings();
            ConfigureSpriteSettings();

            currentReferenceResolution = ReferenceResolution;
            currentPixelsPerUnit = pixelsPerUnit;
            isInitialized = true;

            LogPixelPerfectConfiguration();
        }

        /// <summary>
        /// Apply pixel perfect camera settings
        /// </summary>
        private void ApplyPixelPerfectSettings()
        {
            pixelPerfectCamera.refResolutionX = referenceResolutionX;
            pixelPerfectCamera.refResolutionY = referenceResolutionY;
            pixelPerfectCamera.assetsPPU = pixelsPerUnit;
            pixelPerfectCamera.upscaleRT = upscaleRenderTexture;
            pixelPerfectCamera.pixelSnapping = pixelSnapping;
            pixelPerfectCamera.cropFrameX = cropFrameX;
            pixelPerfectCamera.cropFrameY = cropFrameY;
            pixelPerfectCamera.stretchFill = stretchFill;

            // Configure camera for pixel perfect rendering
            if (mainCamera != null)
            {
                mainCamera.orthographic = true;
                mainCamera.nearClipPlane = 0.3f;
                mainCamera.farClipPlane = 1000f;
            }

            OnReferenceResolutionChanged?.Invoke(ReferenceResolution);
            OnPixelsPerUnitChanged?.Invoke(pixelsPerUnit);
            OnPixelSnappingChanged?.Invoke(pixelSnapping);
        }

        /// <summary>
        /// Configure sprite settings for optimal pixel perfect rendering
        /// </summary>
        private void ConfigureSpriteSettings()
        {
            // Set global sprite filter mode for pixel perfect rendering
            QualitySettings.anisotropicFiltering = AnisotropicFiltering.Disable;

            // Find and configure all sprite renderers in the scene
            SpriteRenderer[] spriteRenderers = FindObjectsOfType<SpriteRenderer>();

            foreach (var spriteRenderer in spriteRenderers)
            {
                ConfigureSpriteRenderer(spriteRenderer);
            }

            Debug.Log($"Configured {spriteRenderers.Length} sprite renderers for pixel perfect rendering");
        }

        /// <summary>
        /// Configure individual sprite renderer for pixel perfect rendering
        /// </summary>
        public void ConfigureSpriteRenderer(SpriteRenderer spriteRenderer)
        {
            if (spriteRenderer == null || spriteRenderer.sprite == null) return;

            // Ensure sprite uses point filtering
            if (spriteRenderer.sprite.texture.filterMode != spriteFilterMode)
            {
                var texture = spriteRenderer.sprite.texture;
                texture.filterMode = spriteFilterMode;
            }

            // Configure sprite import settings if possible
            #if UNITY_EDITOR
            string assetPath = UnityEditor.AssetDatabase.GetAssetPath(spriteRenderer.sprite);
            if (!string.IsNullOrEmpty(assetPath))
            {
                var importer = UnityEditor.AssetImporter.GetAtPath(assetPath) as UnityEditor.TextureImporter;
                if (importer != null)
                {
                    bool reimportNeeded = false;

                    if (importer.textureType != UnityEditor.TextureImporterType.Sprite)
                    {
                        importer.textureType = UnityEditor.TextureImporterType.Sprite;
                        reimportNeeded = true;
                    }

                    if (importer.filterMode != spriteFilterMode)
                    {
                        importer.filterMode = spriteFilterMode;
                        reimportNeeded = true;
                    }

                    if (importer.spritePixelsPerUnit != pixelsPerUnit)
                    {
                        importer.spritePixelsPerUnit = pixelsPerUnit;
                        reimportNeeded = true;
                    }

                    if (reimportNeeded)
                    {
                        UnityEditor.EditorUtility.SetDirty(importer);
                        importer.SaveAndReimport();
                    }
                }
            }
            #endif

            // Enable pixel snapping for sprite position
            if (enableGridMovement)
            {
                SnapSpriteToGrid(spriteRenderer.transform);
            }
        }

        /// <summary>
        /// Configure quality settings for optimal pixel perfect rendering
        /// </summary>
        private void ConfigureQualitySettings()
        {
            // Disable anti-aliasing for pixel perfect rendering
            QualitySettings.antiAliasing = enableAntiAliasing ? 2 : 0;

            // Configure VSync
            QualitySettings.vSyncCount = enableVSync ? 1 : 0;

            // Set target frame rate
            Application.targetFrameRate = targetFrameRate;

            // Disable MSAA for pixel art
            if (!enableMSAA)
            {
                QualitySettings.antiAliasing = 0;
            }

            // Configure anisotropic filtering
            QualitySettings.anisotropicFiltering = AnisotropicFiltering.Disable;

            // Optimize for mobile if specified
            if (optimizeForMobile)
            {
                QualitySettings.shadows = ShadowQuality.Disable;
                QualitySettings.softParticles = false;
                QualitySettings.realtimeReflectionProbes = false;
            }
        }

        /// <summary>
        /// Snap transform position to pixel grid
        /// </summary>
        public void SnapSpriteToGrid(Transform spriteTransform)
        {
            if (!pixelSnapping || spriteTransform == null) return;

            Vector3 position = spriteTransform.position;

            // Calculate pixel size in world units
            float pixelSize = 1f / pixelsPerUnit;

            // Snap position to pixel grid
            position.x = Mathf.Round(position.x / pixelSize) * pixelSize;
            position.y = Mathf.Round(position.y / pixelSize) * pixelSize;

            spriteTransform.position = position;
        }

        /// <summary>
        /// Snap camera position to pixel grid
        /// </summary>
        public void SnapCameraToGrid()
        {
            if (!pixelSnapping || cameraTransform == null) return;

            Vector3 position = cameraTransform.position;

            // Calculate pixel size in world units
            float pixelSize = 1f / pixelsPerUnit;

            // Snap camera position to pixel grid
            position.x = Mathf.Round(position.x / pixelSize) * pixelSize;
            position.y = Mathf.Round(position.y / pixelSize) * pixelSize;

            cameraTransform.position = position;
        }

        /// <summary>
        /// Handle runtime resolution changes
        /// </summary>
        private void HandleResolutionChanges()
        {
            Vector2 newReferenceResolution = new Vector2(referenceResolutionX, referenceResolutionY);

            if (currentReferenceResolution != newReferenceResolution)
            {
                pixelPerfectCamera.refResolutionX = referenceResolutionX;
                pixelPerfectCamera.refResolutionY = referenceResolutionY;
                currentReferenceResolution = newReferenceResolution;
                OnReferenceResolutionChanged?.Invoke(newReferenceResolution);
            }

            if (currentPixelsPerUnit != pixelsPerUnit)
            {
                pixelPerfectCamera.assetsPPU = pixelsPerUnit;
                currentPixelsPerUnit = pixelsPerUnit;
                OnPixelsPerUnitChanged?.Invoke(pixelsPerUnit);

                // Reconfigure all sprite renderers
                ConfigureSpriteSettings();
            }
        }

        /// <summary>
        /// Update performance metrics
        /// </summary>
        private void UpdatePerformanceMetrics()
        {
            frameCount++;
            float currentTime = Time.realtimeSinceStartup;

            if (currentTime - lastRenderTime >= 1f)
            {
                float currentFPS = frameCount / (currentTime - lastRenderTime);
                averageFPS = (averageFPS + currentFPS) / 2f;

                PerformanceMetrics metrics = new PerformanceMetrics
                {
                    currentFPS = currentFPS,
                    averageFPS = averageFPS,
                    renderTime = Time.deltaTime,
                    currentZoom = pixelPerfectCamera.pixelRatio,
                    actualResolution = new Vector2(Screen.width, Screen.height),
                    isPerformanceOptimal = currentFPS >= targetFrameRate * 0.9f
                };

                OnPerformanceUpdate?.Invoke(metrics);

                frameCount = 0;
                lastRenderTime = currentTime;

                if (!metrics.isPerformanceOptimal)
                {
                    Debug.LogWarning($"Pixel Perfect Camera performance below target: {currentFPS:F1} FPS (target: {targetFrameRate})");
                }
            }
        }

        /// <summary>
        /// Update debug information
        /// </summary>
        private void UpdateDebugInfo()
        {
            if (pixelPerfectCamera != null)
            {
                Debug.Log($"Pixel Perfect Debug - Zoom: {pixelPerfectCamera.pixelRatio}, " +
                         $"Resolution: {Screen.width}x{Screen.height}, " +
                         $"Reference: {referenceResolutionX}x{referenceResolutionY}");
            }
        }

        /// <summary>
        /// Log pixel perfect camera configuration
        /// </summary>
        private void LogPixelPerfectConfiguration()
        {
            Debug.Log($"Pixel Perfect Camera Configuration:\n" +
                     $"Reference Resolution: {referenceResolutionX}x{referenceResolutionY}\n" +
                     $"Pixels Per Unit: {pixelsPerUnit}\n" +
                     $"Upscale Render Texture: {upscaleRenderTexture}\n" +
                     $"Pixel Snapping: {pixelSnapping}\n" +
                     $"Crop Frame X: {cropFrameX}, Y: {cropFrameY}\n" +
                     $"Stretch Fill: {stretchFill}\n" +
                     $"Filter Mode: {spriteFilterMode}");
        }

        // Public API methods

        /// <summary>
        /// Set reference resolution at runtime
        /// </summary>
        public void SetReferenceResolution(int width, int height)
        {
            referenceResolutionX = width;
            referenceResolutionY = height;

            if (pixelPerfectCamera != null)
            {
                pixelPerfectCamera.refResolutionX = width;
                pixelPerfectCamera.refResolutionY = height;
            }

            OnReferenceResolutionChanged?.Invoke(new Vector2(width, height));
        }

        /// <summary>
        /// Set pixels per unit at runtime
        /// </summary>
        public void SetPixelsPerUnit(int ppu)
        {
            pixelsPerUnit = ppu;

            if (pixelPerfectCamera != null)
            {
                pixelPerfectCamera.assetsPPU = ppu;
            }

            OnPixelsPerUnitChanged?.Invoke(ppu);
            ConfigureSpriteSettings();
        }

        /// <summary>
        /// Toggle pixel snapping
        /// </summary>
        public void SetPixelSnapping(bool enabled)
        {
            pixelSnapping = enabled;

            if (pixelPerfectCamera != null)
            {
                pixelPerfectCamera.pixelSnapping = enabled;
            }

            OnPixelSnappingChanged?.Invoke(enabled);
        }

        /// <summary>
        /// Get current zoom level
        /// </summary>
        public int GetCurrentZoom()
        {
            return pixelPerfectCamera != null ? pixelPerfectCamera.pixelRatio : 1;
        }

        /// <summary>
        /// Convert screen position to world position with pixel snapping
        /// </summary>
        public Vector3 ScreenToWorldPixelPerfect(Vector3 screenPosition)
        {
            if (mainCamera == null) return Vector3.zero;

            Vector3 worldPosition = mainCamera.ScreenToWorldPoint(screenPosition);

            if (pixelSnapping)
            {
                float pixelSize = 1f / pixelsPerUnit;
                worldPosition.x = Mathf.Round(worldPosition.x / pixelSize) * pixelSize;
                worldPosition.y = Mathf.Round(worldPosition.y / pixelSize) * pixelSize;
            }

            return worldPosition;
        }

        /// <summary>
        /// Convert world position to screen position
        /// </summary>
        public Vector3 WorldToScreenPixelPerfect(Vector3 worldPosition)
        {
            if (mainCamera == null) return Vector3.zero;

            if (pixelSnapping)
            {
                float pixelSize = 1f / pixelsPerUnit;
                worldPosition.x = Mathf.Round(worldPosition.x / pixelSize) * pixelSize;
                worldPosition.y = Mathf.Round(worldPosition.y / pixelSize) * pixelSize;
            }

            return mainCamera.WorldToScreenPoint(worldPosition);
        }

        /// <summary>
        /// Get optimal reference resolution for current screen
        /// </summary>
        public Vector2 GetOptimalReferenceResolution()
        {
            float screenAspect = (float)Screen.width / Screen.height;

            // Common 16:9 resolutions for pixel art
            if (screenAspect >= 1.7f) // 16:9 or wider
            {
                return new Vector2(320, 180); // 16:9
            }
            else if (screenAspect >= 1.5f) // 3:2
            {
                return new Vector2(240, 160); // 3:2
            }
            else if (screenAspect >= 1.3f) // 4:3
            {
                return new Vector2(256, 192); // 4:3
            }
            else // Portrait or square
            {
                return new Vector2(180, 320); // 9:16 portrait
            }
        }

        /// <summary>
        /// Apply pixel perfect settings to all sprites in scene
        /// </summary>
        public void ApplyPixelPerfectToAllSprites()
        {
            SpriteRenderer[] allSprites = FindObjectsOfType<SpriteRenderer>();

            foreach (var sprite in allSprites)
            {
                ConfigureSpriteRenderer(sprite);
            }

            Debug.Log($"Applied pixel perfect settings to {allSprites.Length} sprites");
        }

        private void OnDrawGizmosSelected()
        {
            if (showPixelGrid && pixelPerfectCamera != null)
            {
                DrawPixelGrid();
            }
        }

        /// <summary>
        /// Draw pixel grid in scene view for debugging
        /// </summary>
        private void DrawPixelGrid()
        {
            if (mainCamera == null) return;

            Gizmos.color = Color.cyan;

            float pixelSize = 1f / pixelsPerUnit;
            Vector3 cameraPos = mainCamera.transform.position;
            float orthographicSize = mainCamera.orthographicSize;

            // Calculate grid bounds
            int gridWidth = Mathf.CeilToInt(orthographicSize * 2f * mainCamera.aspect / pixelSize);
            int gridHeight = Mathf.CeilToInt(orthographicSize * 2f / pixelSize);

            Vector3 gridOrigin = new Vector3(
                cameraPos.x - gridWidth * pixelSize * 0.5f,
                cameraPos.y - gridHeight * pixelSize * 0.5f,
                cameraPos.z
            );

            // Draw vertical lines
            for (int x = 0; x <= gridWidth; x++)
            {
                Vector3 start = gridOrigin + new Vector3(x * pixelSize, 0, 0);
                Vector3 end = start + new Vector3(0, gridHeight * pixelSize, 0);
                Gizmos.DrawLine(start, end);
            }

            // Draw horizontal lines
            for (int y = 0; y <= gridHeight; y++)
            {
                Vector3 start = gridOrigin + new Vector3(0, y * pixelSize, 0);
                Vector3 end = start + new Vector3(gridWidth * pixelSize, 0, 0);
                Gizmos.DrawLine(start, end);
            }
        }
    }
}
```

#### 1.2 Pixel Perfect Movement System

[[LLM: Implement a movement system that ensures all object movement is pixel-perfect and aligned to the pixel grid. Consider different movement types (player input, physics-based, scripted movement) and ensure they all maintain pixel alignment while providing smooth gameplay experience.]]

**Pixel Perfect Movement Implementation**:

```csharp
// Assets/Scripts/Movement/PixelPerfectMovement.cs
using UnityEngine;

namespace {{project_namespace}}.Movement
{
    /// <summary>
    /// Pixel perfect movement system ensuring all object movement maintains pixel alignment
    /// Provides smooth movement while preserving pixel-perfect visual fidelity
    /// </summary>
    public class PixelPerfectMovement : MonoBehaviour
    {
        [Header("Movement Configuration")]
        [SerializeField] private float moveSpeed = 5f;
        [SerializeField] private bool enablePixelSnapping = true;
        [SerializeField] private bool smoothMovement = true;
        [SerializeField] private float smoothingFactor = 10f;

        [Header("Grid Settings")]
        [SerializeField] private bool constrainToGrid = false;
        [SerializeField] private float gridSize = 1f;
        [SerializeField] private bool enableEightDirectional = true;
        [SerializeField] private bool enableDiagonalMovement = true;

        [Header("Physics Integration")]
        [SerializeField] private bool usePhysics = false;
        [SerializeField] private bool snapPhysicsPosition = true;
        [SerializeField] private float physicsSnapThreshold = 0.1f;

        [Header("Animation Integration")]
        [SerializeField] private Animator characterAnimator;
        [SerializeField] private string horizontalSpeedParam = "HorizontalSpeed";
        [SerializeField] private string verticalSpeedParam = "VerticalSpeed";
        [SerializeField] private string isMovingParam = "IsMoving";

        // Component references
        private Transform cachedTransform;
        private Rigidbody2D rb2d;
        private PixelPerfectCameraManager cameraManager;

        // Movement state
        private Vector2 currentVelocity;
        private Vector2 targetPosition;
        private Vector2 lastPosition;
        private bool isMoving = false;
        private float pixelSize;

        // Input handling
        private Vector2 inputVector;
        private bool inputReceived = false;

        // Events
        public System.Action<Vector2> OnPositionChanged;
        public System.Action<Vector2> OnVelocityChanged;
        public System.Action<bool> OnMovementStateChanged;

        public Vector2 CurrentVelocity => currentVelocity;
        public bool IsMoving => isMoving;
        public Vector2 TargetPosition => targetPosition;

        private void Awake()
        {
            cachedTransform = transform;
            rb2d = GetComponent<Rigidbody2D>();
            cameraManager = PixelPerfectCameraManager.Instance;

            InitializeMovement();
        }

        private void Start()
        {
            if (cameraManager != null)
            {
                pixelSize = 1f / cameraManager.PixelsPerUnit;
                cameraManager.OnPixelsPerUnitChanged += OnPixelsPerUnitChanged;
            }
            else
            {
                pixelSize = 1f / 16f; // Default pixels per unit
            }

            targetPosition = cachedTransform.position;
            lastPosition = targetPosition;
        }

        private void Update()
        {
            HandleInput();
            UpdateMovement();
            UpdateAnimations();
        }

        private void FixedUpdate()
        {
            if (usePhysics && rb2d != null)
            {
                UpdatePhysicsMovement();
            }
        }

        /// <summary>
        /// Initialize movement system
        /// </summary>
        private void InitializeMovement()
        {
            // Configure Rigidbody2D if using physics
            if (usePhysics && rb2d != null)
            {
                rb2d.freezeRotation = true;
                rb2d.gravityScale = 0f; // Assume top-down or platformer with custom gravity
                rb2d.interpolation = RigidbodyInterpolation2D.Interpolate;
            }
        }

        /// <summary>
        /// Handle movement input
        /// </summary>
        private void HandleInput()
        {
            // Get input from various sources
            Vector2 newInputVector = Vector2.zero;

            // Keyboard input
            newInputVector.x = Input.GetAxisRaw("Horizontal");
            newInputVector.y = Input.GetAxisRaw("Vertical");

            // Normalize diagonal movement if not allowed
            if (!enableDiagonalMovement && newInputVector.x != 0 && newInputVector.y != 0)
            {
                // Prioritize horizontal movement
                newInputVector.y = 0;
            }

            // Eight-directional movement constraint
            if (enableEightDirectional)
            {
                newInputVector = ConstrainToEightDirections(newInputVector);
            }

            inputVector = newInputVector;
            inputReceived = inputVector.magnitude > 0.1f;
        }

        /// <summary>
        /// Update object movement
        /// </summary>
        private void UpdateMovement()
        {
            Vector2 previousPosition = targetPosition;

            if (inputReceived)
            {
                // Calculate target position based on input
                Vector2 movement = inputVector * moveSpeed * Time.deltaTime;
                targetPosition += movement;

                // Constrain to grid if enabled
                if (constrainToGrid)
                {
                    targetPosition = ConstrainToGrid(targetPosition);
                }
            }

            // Apply movement
            if (smoothMovement && !constrainToGrid)
            {
                ApplySmoothMovement();
            }
            else
            {
                ApplyDirectMovement();
            }

            // Apply pixel snapping
            if (enablePixelSnapping)
            {
                SnapToPixelGrid();
            }

            // Update movement state
            UpdateMovementState(previousPosition);
        }

        /// <summary>
        /// Apply smooth movement interpolation
        /// </summary>
        private void ApplySmoothMovement()
        {
            Vector3 currentPos = cachedTransform.position;
            Vector3 newPos = Vector3.Lerp(currentPos, targetPosition, smoothingFactor * Time.deltaTime);
            cachedTransform.position = newPos;
        }

        /// <summary>
        /// Apply direct movement without interpolation
        /// </summary>
        private void ApplyDirectMovement()
        {
            cachedTransform.position = targetPosition;
        }

        /// <summary>
        /// Update physics-based movement
        /// </summary>
        private void UpdatePhysicsMovement()
        {
            if (rb2d == null) return;

            Vector2 targetVelocity = inputVector * moveSpeed;
            rb2d.velocity = targetVelocity;

            // Snap physics position if needed
            if (snapPhysicsPosition)
            {
                Vector2 physicsPosition = rb2d.position;
                Vector2 snappedPosition = SnapPositionToPixelGrid(physicsPosition);

                if (Vector2.Distance(physicsPosition, snappedPosition) > physicsSnapThreshold)
                {
                    rb2d.position = snappedPosition;
                }
            }
        }

        /// <summary>
        /// Snap current position to pixel grid
        /// </summary>
        private void SnapToPixelGrid()
        {
            Vector3 position = cachedTransform.position;
            position = SnapPositionToPixelGrid(position);
            cachedTransform.position = position;
        }

        /// <summary>
        /// Snap a position to pixel grid
        /// </summary>
        private Vector2 SnapPositionToPixelGrid(Vector2 position)
        {
            position.x = Mathf.Round(position.x / pixelSize) * pixelSize;
            position.y = Mathf.Round(position.y / pixelSize) * pixelSize;
            return position;
        }

        /// <summary>
        /// Constrain position to grid
        /// </summary>
        private Vector2 ConstrainToGrid(Vector2 position)
        {
            position.x = Mathf.Round(position.x / gridSize) * gridSize;
            position.y = Mathf.Round(position.y / gridSize) * gridSize;
            return position;
        }

        /// <summary>
        /// Constrain input to eight directions
        /// </summary>
        private Vector2 ConstrainToEightDirections(Vector2 input)
        {
            if (input.magnitude < 0.1f) return Vector2.zero;

            float angle = Mathf.Atan2(input.y, input.x) * Mathf.Rad2Deg;

            // Snap to 45-degree increments
            angle = Mathf.Round(angle / 45f) * 45f;

            return new Vector2(
                Mathf.Cos(angle * Mathf.Deg2Rad),
                Mathf.Sin(angle * Mathf.Deg2Rad)
            ).normalized;
        }

        /// <summary>
        /// Update movement state and trigger events
        /// </summary>
        private void UpdateMovementState(Vector2 previousPosition)
        {
            // Calculate current velocity
            Vector2 positionDelta = (Vector2)cachedTransform.position - lastPosition;
            currentVelocity = positionDelta / Time.deltaTime;

            // Update movement state
            bool wasMoving = isMoving;
            isMoving = currentVelocity.magnitude > 0.1f;

            // Trigger events
            if (Vector2.Distance(previousPosition, targetPosition) > 0.001f)
            {
                OnPositionChanged?.Invoke(cachedTransform.position);
            }

            if (currentVelocity != Vector2.zero)
            {
                OnVelocityChanged?.Invoke(currentVelocity);
            }

            if (wasMoving != isMoving)
            {
                OnMovementStateChanged?.Invoke(isMoving);
            }

            lastPosition = cachedTransform.position;
        }

        /// <summary>
        /// Update character animations based on movement
        /// </summary>
        private void UpdateAnimations()
        {
            if (characterAnimator == null) return;

            // Set animation parameters
            characterAnimator.SetFloat(horizontalSpeedParam, Mathf.Abs(currentVelocity.x));
            characterAnimator.SetFloat(verticalSpeedParam, Mathf.Abs(currentVelocity.y));
            characterAnimator.SetBool(isMovingParam, isMoving);

            // Handle sprite flipping for horizontal movement
            if (currentVelocity.x != 0)
            {
                SpriteRenderer spriteRenderer = GetComponent<SpriteRenderer>();
                if (spriteRenderer != null)
                {
                    spriteRenderer.flipX = currentVelocity.x < 0;
                }
            }
        }

        /// <summary>
        /// Handle pixels per unit changes from camera manager
        /// </summary>
        private void OnPixelsPerUnitChanged(int newPixelsPerUnit)
        {
            pixelSize = 1f / newPixelsPerUnit;
        }

        // Public API methods

        /// <summary>
        /// Set movement speed
        /// </summary>
        public void SetMoveSpeed(float speed)
        {
            moveSpeed = speed;
        }

        /// <summary>
        /// Enable or disable pixel snapping
        /// </summary>
        public void SetPixelSnapping(bool enabled)
        {
            enablePixelSnapping = enabled;
        }

        /// <summary>
        /// Move to specific position with pixel perfect snapping
        /// </summary>
        public void MoveToPosition(Vector2 position, bool snap = true)
        {
            targetPosition = snap ? SnapPositionToPixelGrid(position) : position;

            if (!smoothMovement)
            {
                cachedTransform.position = targetPosition;
            }
        }

        /// <summary>
        /// Teleport to position immediately
        /// </summary>
        public void TeleportToPosition(Vector2 position, bool snap = true)
        {
            Vector2 finalPosition = snap ? SnapPositionToPixelGrid(position) : position;
            targetPosition = finalPosition;
            cachedTransform.position = finalPosition;
            lastPosition = finalPosition;
        }

        /// <summary>
        /// Enable or disable grid constraint
        /// </summary>
        public void SetGridConstraint(bool enabled, float size = 1f)
        {
            constrainToGrid = enabled;
            gridSize = size;
        }

        /// <summary>
        /// Get pixel perfect position
        /// </summary>
        public Vector2 GetPixelPerfectPosition()
        {
            return SnapPositionToPixelGrid(cachedTransform.position);
        }

        private void OnDestroy()
        {
            if (cameraManager != null)
            {
                cameraManager.OnPixelsPerUnitChanged -= OnPixelsPerUnitChanged;
            }
        }

        private void OnDrawGizmosSelected()
        {
            if (constrainToGrid)
            {
                DrawGridGizmos();
            }

            if (enablePixelSnapping && Application.isPlaying)
            {
                DrawPixelGizmos();
            }
        }

        /// <summary>
        /// Draw grid gizmos for debugging
        /// </summary>
        private void DrawGridGizmos()
        {
            Gizmos.color = Color.yellow;

            Vector3 position = transform.position;
            Vector3 gridPosition = new Vector3(
                Mathf.Round(position.x / gridSize) * gridSize,
                Mathf.Round(position.y / gridSize) * gridSize,
                position.z
            );

            Gizmos.DrawWireCube(gridPosition, Vector3.one * gridSize);
        }

        /// <summary>
        /// Draw pixel alignment gizmos for debugging
        /// </summary>
        private void DrawPixelGizmos()
        {
            Gizmos.color = Color.cyan;

            Vector3 position = transform.position;
            Vector3 pixelPosition = SnapPositionToPixelGrid(position);

            Gizmos.DrawWireCube(pixelPosition, Vector3.one * pixelSize);
        }
    }
}
```

### 2. Advanced Pixel Perfect Rendering

#### 2.1 Pixel Perfect UI System

[[LLM: Design a comprehensive UI system that maintains pixel perfect rendering for all interface elements. Consider scaling, positioning, text rendering, and responsive design while preserving the pixel art aesthetic. Ensure UI elements align properly with the pixel grid and scale appropriately across different resolutions.]]

**Pixel Perfect UI Implementation**:

```csharp
// Assets/Scripts/UI/PixelPerfectUIManager.cs
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;

namespace {{project_namespace}}.UI
{
    /// <summary>
    /// Comprehensive UI system for maintaining pixel perfect rendering across all interface elements
    /// Handles UI scaling, positioning, and text rendering while preserving pixel art aesthetic
    /// </summary>
    public class PixelPerfectUIManager : MonoBehaviour
    {
        [Header("UI Configuration")]
        [SerializeField] private CanvasScaler canvasScaler;
        [SerializeField] private float referencePixelsPerUnit = 16f;
        [SerializeField] private bool enablePixelPerfectUI = true;
        [SerializeField] private bool snapUIToPixelGrid = true;

        [Header("Text Configuration")]
        [SerializeField] private TextRenderingMode textRenderingMode = TextRenderingMode.Bitmap;
        [SerializeField] private FilterMode textFilterMode = FilterMode.Point;
        [SerializeField] private int bitmapFontSize = 8;
        [SerializeField] private bool enableTextSnapping = true;

        [Header("Image Configuration")]
        [SerializeField] private FilterMode imageFilterMode = FilterMode.Point;
        [SerializeField] private bool enableImageSnapping = true;
        [SerializeField] private bool preserveAspectRatio = true;

        [Header("Animation Configuration")]
        [SerializeField] private bool enablePixelPerfectAnimations = true;
        [SerializeField] private float animationPixelThreshold = 0.5f;

        public enum TextRenderingMode
        {
            Bitmap,
            Vector,
            Hybrid
        }

        // Component references
        private Canvas mainCanvas;
        private PixelPerfectCameraManager cameraManager;

        // UI element tracking
        private List<Image> managedImages = new List<Image>();
        private List<TextMeshProUGUI> managedTexts = new List<TextMeshProUGUI>();
        private List<RectTransform> managedRectTransforms = new List<RectTransform>();

        // Configuration state
        private float currentPixelSize;
        private Vector2 referenceResolution;

        // Events
        public System.Action<float> OnPixelSizeChanged;
        public System.Action<Vector2> OnReferenceResolutionChanged;

        public static PixelPerfectUIManager Instance { get; private set; }

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                InitializeUISystem();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            cameraManager = PixelPerfectCameraManager.Instance;

            if (cameraManager != null)
            {
                cameraManager.OnPixelsPerUnitChanged += OnPixelsPerUnitChanged;
                cameraManager.OnReferenceResolutionChanged += OnCameraReferenceResolutionChanged;
                referencePixelsPerUnit = cameraManager.PixelsPerUnit;
            }

            ConfigureCanvasScaler();
            RegisterAllUIElements();
        }

        /// <summary>
        /// Initialize the pixel perfect UI system
        /// </summary>
        private void InitializeUISystem()
        {
            mainCanvas = GetComponent<Canvas>();
            if (mainCanvas == null)
            {
                mainCanvas = FindObjectOfType<Canvas>();
            }

            if (canvasScaler == null)
            {
                canvasScaler = GetComponent<CanvasScaler>();
                if (canvasScaler == null && mainCanvas != null)
                {
                    canvasScaler = mainCanvas.GetComponent<CanvasScaler>();
                }
            }

            currentPixelSize = 1f / referencePixelsPerUnit;
        }

        /// <summary>
        /// Configure canvas scaler for pixel perfect UI
        /// </summary>
        private void ConfigureCanvasScaler()
        {
            if (canvasScaler == null) return;

            canvasScaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasScaler.referenceResolution = cameraManager?.ReferenceResolution ?? new Vector2(320, 180);
            canvasScaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            canvasScaler.matchWidthOrHeight = 0.5f; // Balance between width and height
            canvasScaler.referencePixelsPerUnit = referencePixelsPerUnit;

            referenceResolution = canvasScaler.referenceResolution;
            OnReferenceResolutionChanged?.Invoke(referenceResolution);

            Debug.Log($"Canvas Scaler configured: {canvasScaler.referenceResolution} @ {referencePixelsPerUnit} PPU");
        }

        /// <summary>
        /// Register all UI elements in the scene for pixel perfect management
        /// </summary>
        private void RegisterAllUIElements()
        {
            // Find and register all images
            Image[] allImages = FindObjectsOfType<Image>();
            foreach (var image in allImages)
            {
                RegisterImage(image);
            }

            // Find and register all texts
            TextMeshProUGUI[] allTexts = FindObjectsOfType<TextMeshProUGUI>();
            foreach (var text in allTexts)
            {
                RegisterText(text);
            }

            Debug.Log($"Registered {managedImages.Count} images and {managedTexts.Count} texts for pixel perfect rendering");
        }

        /// <summary>
        /// Register an image for pixel perfect management
        /// </summary>
        public void RegisterImage(Image image)
        {
            if (image == null || managedImages.Contains(image)) return;

            ConfigureImageForPixelPerfect(image);
            managedImages.Add(image);

            RectTransform rectTransform = image.rectTransform;
            if (!managedRectTransforms.Contains(rectTransform))
            {
                managedRectTransforms.Add(rectTransform);
            }
        }

        /// <summary>
        /// Register a text element for pixel perfect management
        /// </summary>
        public void RegisterText(TextMeshProUGUI text)
        {
            if (text == null || managedTexts.Contains(text)) return;

            ConfigureTextForPixelPerfect(text);
            managedTexts.Add(text);

            RectTransform rectTransform = text.rectTransform;
            if (!managedRectTransforms.Contains(rectTransform))
            {
                managedRectTransforms.Add(rectTransform);
            }
        }

        /// <summary>
        /// Configure an image for pixel perfect rendering
        /// </summary>
        private void ConfigureImageForPixelPerfect(Image image)
        {
            if (image.sprite != null && image.sprite.texture != null)
            {
                // Set filter mode for pixel perfect rendering
                if (image.sprite.texture.filterMode != imageFilterMode)
                {
                    image.sprite.texture.filterMode = imageFilterMode;
                }

                // Configure import settings for pixel perfect sprites
                #if UNITY_EDITOR
                ConfigureSpriteImportSettings(image.sprite);
                #endif
            }

            // Set image type and pixel per unit multiplier
            if (image.type == Image.Type.Simple)
            {
                image.useSpriteMesh = false;
                image.preserveAspect = preserveAspectRatio;
            }

            // Snap to pixel grid if enabled
            if (enableImageSnapping)
            {
                SnapRectTransformToPixelGrid(image.rectTransform);
            }
        }

        /// <summary>
        /// Configure text for pixel perfect rendering
        /// </summary>
        private void ConfigureTextForPixelPerfect(TextMeshProUGUI text)
        {
            switch (textRenderingMode)
            {
                case TextRenderingMode.Bitmap:
                    ConfigureBitmapText(text);
                    break;
                case TextRenderingMode.Vector:
                    ConfigureVectorText(text);
                    break;
                case TextRenderingMode.Hybrid:
                    ConfigureHybridText(text);
                    break;
            }

            // Snap text position to pixel grid
            if (enableTextSnapping)
            {
                SnapRectTransformToPixelGrid(text.rectTransform);
            }
        }

        /// <summary>
        /// Configure text for bitmap rendering
        /// </summary>
        private void ConfigureBitmapText(TextMeshProUGUI text)
        {
            text.fontSize = bitmapFontSize;
            text.fontMaterial.mainTexture.filterMode = textFilterMode;
            text.isOverlay = false;
            text.raycastTarget = true;
        }

        /// <summary>
        /// Configure text for vector rendering
        /// </summary>
        private void ConfigureVectorText(TextMeshProUGUI text)
        {
            text.fontSize = Mathf.Round(text.fontSize);
            text.fontMaterial.mainTexture.filterMode = FilterMode.Bilinear;
        }

        /// <summary>
        /// Configure text for hybrid rendering
        /// </summary>
        private void ConfigureHybridText(TextMeshProUGUI text)
        {
            // Use bitmap for small text, vector for large text
            if (text.fontSize <= bitmapFontSize)
            {
                ConfigureBitmapText(text);
            }
            else
            {
                ConfigureVectorText(text);
            }
        }

        /// <summary>
        /// Snap RectTransform to pixel grid
        /// </summary>
        public void SnapRectTransformToPixelGrid(RectTransform rectTransform)
        {
            if (!snapUIToPixelGrid || rectTransform == null) return;

            Vector3 position = rectTransform.anchoredPosition3D;

            // Snap position to pixel grid
            position.x = Mathf.Round(position.x / currentPixelSize) * currentPixelSize;
            position.y = Mathf.Round(position.y / currentPixelSize) * currentPixelSize;

            rectTransform.anchoredPosition3D = position;

            // Snap size to pixel grid
            Vector2 sizeDelta = rectTransform.sizeDelta;
            sizeDelta.x = Mathf.Round(sizeDelta.x / currentPixelSize) * currentPixelSize;
            sizeDelta.y = Mathf.Round(sizeDelta.y / currentPixelSize) * currentPixelSize;
            rectTransform.sizeDelta = sizeDelta;
        }

        /// <summary>
        /// Update all managed UI elements for pixel perfect rendering
        /// </summary>
        private void UpdateAllUIElements()
        {
            foreach (var image in managedImages)
            {
                if (image != null)
                {
                    ConfigureImageForPixelPerfect(image);
                }
            }

            foreach (var text in managedTexts)
            {
                if (text != null)
                {
                    ConfigureTextForPixelPerfect(text);
                }
            }

            foreach (var rectTransform in managedRectTransforms)
            {
                if (rectTransform != null)
                {
                    SnapRectTransformToPixelGrid(rectTransform);
                }
            }
        }

        #if UNITY_EDITOR
        /// <summary>
        /// Configure sprite import settings for pixel perfect rendering
        /// </summary>
        private void ConfigureSpriteImportSettings(Sprite sprite)
        {
            string assetPath = UnityEditor.AssetDatabase.GetAssetPath(sprite);
            if (string.IsNullOrEmpty(assetPath)) return;

            var importer = UnityEditor.AssetImporter.GetAtPath(assetPath) as UnityEditor.TextureImporter;
            if (importer == null) return;

            bool reimportNeeded = false;

            if (importer.textureType != UnityEditor.TextureImporterType.Sprite)
            {
                importer.textureType = UnityEditor.TextureImporterType.Sprite;
                reimportNeeded = true;
            }

            if (importer.filterMode != imageFilterMode)
            {
                importer.filterMode = imageFilterMode;
                reimportNeeded = true;
            }

            if (importer.spritePixelsPerUnit != referencePixelsPerUnit)
            {
                importer.spritePixelsPerUnit = referencePixelsPerUnit;
                reimportNeeded = true;
            }

            if (reimportNeeded)
            {
                UnityEditor.EditorUtility.SetDirty(importer);
                importer.SaveAndReimport();
            }
        }
        #endif

        /// <summary>
        /// Handle pixels per unit changes from camera manager
        /// </summary>
        private void OnPixelsPerUnitChanged(int newPixelsPerUnit)
        {
            referencePixelsPerUnit = newPixelsPerUnit;
            currentPixelSize = 1f / referencePixelsPerUnit;

            canvasScaler.referencePixelsPerUnit = referencePixelsPerUnit;

            UpdateAllUIElements();
            OnPixelSizeChanged?.Invoke(currentPixelSize);
        }

        /// <summary>
        /// Handle reference resolution changes from camera manager
        /// </summary>
        private void OnCameraReferenceResolutionChanged(Vector2 newResolution)
        {
            canvasScaler.referenceResolution = newResolution;
            referenceResolution = newResolution;
            OnReferenceResolutionChanged?.Invoke(referenceResolution);
        }

        // Public API methods

        /// <summary>
        /// Set text rendering mode
        /// </summary>
        public void SetTextRenderingMode(TextRenderingMode mode)
        {
            textRenderingMode = mode;

            foreach (var text in managedTexts)
            {
                if (text != null)
                {
                    ConfigureTextForPixelPerfect(text);
                }
            }
        }

        /// <summary>
        /// Enable or disable pixel perfect UI
        /// </summary>
        public void SetPixelPerfectUI(bool enabled)
        {
            enablePixelPerfectUI = enabled;

            if (enabled)
            {
                UpdateAllUIElements();
            }
        }

        /// <summary>
        /// Snap all UI elements to pixel grid
        /// </summary>
        public void SnapAllUIToPixelGrid()
        {
            foreach (var rectTransform in managedRectTransforms)
            {
                if (rectTransform != null)
                {
                    SnapRectTransformToPixelGrid(rectTransform);
                }
            }
        }

        /// <summary>
        /// Create pixel perfect button
        /// </summary>
        public Button CreatePixelPerfectButton(Transform parent, Vector2 size, string text = "Button")
        {
            GameObject buttonGO = new GameObject("PixelPerfectButton");
            buttonGO.transform.SetParent(parent);

            RectTransform rectTransform = buttonGO.AddComponent<RectTransform>();
            rectTransform.sizeDelta = size;

            Image buttonImage = buttonGO.AddComponent<Image>();
            Button button = buttonGO.AddComponent<Button>();

            // Create button text
            GameObject textGO = new GameObject("Text");
            textGO.transform.SetParent(buttonGO.transform);

            RectTransform textRect = textGO.AddComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.sizeDelta = Vector2.zero;
            textRect.anchoredPosition = Vector2.zero;

            TextMeshProUGUI buttonText = textGO.AddComponent<TextMeshProUGUI>();
            buttonText.text = text;
            buttonText.alignment = TextAlignmentOptions.Center;

            // Register for pixel perfect management
            RegisterImage(buttonImage);
            RegisterText(buttonText);

            return button;
        }

        /// <summary>
        /// Get pixel perfect position for UI element
        /// </summary>
        public Vector2 GetPixelPerfectPosition(Vector2 position)
        {
            position.x = Mathf.Round(position.x / currentPixelSize) * currentPixelSize;
            position.y = Mathf.Round(position.y / currentPixelSize) * currentPixelSize;
            return position;
        }

        /// <summary>
        /// Get pixel perfect size for UI element
        /// </summary>
        public Vector2 GetPixelPerfectSize(Vector2 size)
        {
            size.x = Mathf.Round(size.x / currentPixelSize) * currentPixelSize;
            size.y = Mathf.Round(size.y / currentPixelSize) * currentPixelSize;
            return size;
        }

        private void OnDestroy()
        {
            if (cameraManager != null)
            {
                cameraManager.OnPixelsPerUnitChanged -= OnPixelsPerUnitChanged;
                cameraManager.OnReferenceResolutionChanged -= OnCameraReferenceResolutionChanged;
            }
        }
    }
}
```

## Task Completion Validation

### Validation Checklist

[[LLM: Use this checklist to verify that all components of the Pixel Perfect Camera system have been properly implemented and configured. Each item must be verified before considering the task complete.]]

**Core Pixel Perfect Camera Setup**:

- [ ] PixelPerfectCameraManager properly configured with reference resolution
- [ ] Pixels per unit settings applied consistently across project
- [ ] Sprite filter modes set to Point for pixel perfect rendering
- [ ] Quality settings optimized for pixel art (no AA, proper VSync)
- [ ] Performance monitoring active and providing metrics

**Pixel Perfect Movement System**:

- [ ] Movement snapping to pixel grid functioning correctly
- [ ] Smooth movement maintaining pixel alignment
- [ ] Grid constraint system working for tile-based movement
- [ ] Physics integration maintaining pixel perfect positioning
- [ ] Animation integration preserving pixel alignment

**Pixel Perfect UI System**:

- [ ] Canvas scaler configured for consistent UI scaling
- [ ] Text rendering optimized for pixel perfect display
- [ ] Image components using point filtering
- [ ] UI elements snapping to pixel grid
- [ ] Responsive design maintaining pixel perfect scaling

**Integration and Performance**:

- [ ] All systems working together without conflicts
- [ ] Consistent visual quality across different resolutions
- [ ] Performance targets met (60 FPS with pixel perfect rendering)
- [ ] Memory usage stable during pixel perfect operations
- [ ] Debug tools functional for pixel grid visualization

### Success Criteria

**Visual Quality Requirements**:

- Sharp, crisp pixel art rendering without blurriness
- Consistent pixel alignment across all game objects
- No visual artifacts from scaling or movement
- Proper aspect ratio preservation across resolutions

**Performance Requirements**:

- Stable 60 FPS with pixel perfect rendering enabled
- Memory usage under 50MB additional overhead
- Consistent frame times without stuttering
- Smooth movement while maintaining pixel alignment

**Technical Requirements**:

- Support for multiple reference resolutions
- Pixel per unit consistency across all assets
- Proper import settings for all sprite assets
- Scalable system for different screen sizes

## Dependencies

This task extends and integrates with:

- `setup-camera-system.md` - Core camera system configuration
- `unity-2d-animation-setup.md` - 2D animation system integration
- `unity-2d-lighting-setup.md` - 2D lighting system compatibility
- `validate-2d-systems.md` - 2D system validation procedures

## Additional Resources

**Unity Documentation References**:

- Unity Pixel Perfect Camera: https://docs.unity3d.com/Packages/com.unity.2d.pixel-perfect@latest
- 2D Pixel Perfect Documentation: https://docs.unity3d.com/Manual/class-PixelPerfectCamera.html
- Sprite Import Settings: https://docs.unity3d.com/Manual/class-TextureImporter.html
- UI Canvas Scaler: https://docs.unity3d.com/Packages/com.unity.ugui@latest/manual/script-CanvasScaler.html

**Pixel Art Best Practices**:

- Unity Pixel Art Guidelines: https://unity.com/learn/tutorials/topics/2d-game-creation/pixel-art-best-practices
- 2D Asset Workflow: https://unity.com/learn/tutorials/topics/2d-game-creation/2d-asset-workflow
- Pixel Perfect Movement: https://blog.unity.com/technology/pixel-perfect-movement-in-unity

**Code Examples and Tutorials**:

- Pixel Perfect Setup Guide: https://unity.com/learn/tutorials/topics/2d-game-creation/pixel-perfect-camera
- Advanced Pixel Art Techniques: https://blog.unity.com/technology/advanced-pixel-art-techniques
- 2D Performance Optimization: https://unity.com/learn/tutorials/topics/performance-optimization/2d-pixel-art-optimization

---

**Task Implementation Notes**:
This comprehensive Pixel Perfect Camera task provides production-ready code for Unity 2D pixel art games, covering camera configuration, movement systems, UI management, and performance optimization while maintaining Unity best practices and BMAD compliance patterns. The implementation includes advanced features like automatic sprite configuration, performance monitoring, and comprehensive debugging tools.
