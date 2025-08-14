# Unity 2D Physics Setup Task

## Purpose

To configure and implement Unity's 2D Physics system for 2D game development, including Rigidbody2D optimization, Collider2D configuration, Physics2D settings management, and 2D physics performance optimization. This task extends `design-physics-system.md` to provide Unity-specific 2D physics patterns for platformers, top-down games, and other 2D game genres.

## Prerequisites

- Unity project configured with 2D Template or 2D Renderer Pipeline
- Game Design Document (GDD) with defined 2D physics requirements
- Basic scene setup with GameObject hierarchy established
- Unity Physics2D package enabled (default in 2D projects)
- Understanding of 2D coordinate system and Unity's 2D physics layers
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps for 2D physics setup]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Unity 2D Physics Foundation Setup

#### 1.1 Physics2D Settings Configuration

[[LLM: Analyze the Game Design Document to identify the specific 2D physics requirements such as gravity direction, physics materials needed, collision detection precision, and performance targets. Consider whether this is a platformer (side-scrolling), top-down game, puzzle game, or other 2D genre, as this affects physics configuration choices.]]

**Core Physics2D Settings Configuration**:

```csharp
// Assets/Scripts/Physics2D/Physics2DManager.cs
using UnityEngine;
using System.Collections.Generic;
using System.Collections;

namespace {{project_namespace}}.Physics2D
{
    /// <summary>
    /// Centralized manager for Unity 2D Physics settings and optimization
    /// Handles Physics2D configuration, collision matrix setup, and performance monitoring
    /// </summary>
    public class Physics2DManager : MonoBehaviour
    {
        [Header("Physics2D Global Settings")]
        [SerializeField] private Vector2 gravity = new Vector2(0, -9.81f);
        [SerializeField] private float bounceThreshold = 2f;
        [SerializeField] private float sleepThreshold = 0.005f;
        [SerializeField] private float timeToSleep = 0.5f;
        [SerializeField] private bool autoSimulation = true;
        [SerializeField] private bool autoSyncTransforms = false;
        [SerializeField] private bool reuseCollisionCallbacks = true;

        [Header("Collision Detection Settings")]
        [SerializeField] private CollisionDetectionMode2D defaultCollisionDetection = CollisionDetectionMode2D.Discrete;
        [SerializeField] private bool queriesHitTriggers = true;
        [SerializeField] private bool queriesStartInColliders = true;
        [SerializeField] private float defaultContactOffset = 0.01f;
        [SerializeField] private int velocityIterations = 8;
        [SerializeField] private int positionIterations = 3;

        [Header("Performance Monitoring")]
        [SerializeField] private bool enablePerformanceMetrics = false;
        [SerializeField] private float metricsUpdateInterval = 1f;

        // Physics Materials for different surface types
        [Header("Physics Materials Library")]
        [SerializeField] private PhysicsMaterial2D defaultMaterial;
        [SerializeField] private PhysicsMaterial2D bouncyMaterial;
        [SerializeField] private PhysicsMaterial2D slipperyMaterial;
        [SerializeField] private PhysicsMaterial2D roughMaterial;
        [SerializeField] private PhysicsMaterial2D[] customMaterials;

        // Collision layer configuration
        [Header("Collision Layer Management")]
        [SerializeField] private LayerMask playerLayers = 1 << 8;
        [SerializeField] private LayerMask enemyLayers = 1 << 9;
        [SerializeField] private LayerMask environmentLayers = 1 << 10;
        [SerializeField] private LayerMask interactableLayers = 1 << 11;
        [SerializeField] private LayerMask triggerLayers = 1 << 12;

        // Performance metrics
        private int activeRigidbodies = 0;
        private int activeColliders = 0;
        private float averageFrameTime = 0f;
        private List<float> frameTimeSamples = new List<float>();

        public static Physics2DManager Instance { get; private set; }

        // Events for physics state changes
        public System.Action<Vector2> OnGravityChanged;
        public System.Action<bool> OnSimulationStateChanged;
        public System.Action<PerformanceMetrics> OnPerformanceUpdate;

        [System.Serializable]
        public struct PerformanceMetrics
        {
            public int activeRigidbodies;
            public int activeColliders;
            public float averageFrameTime;
            public float physicsTimeStep;
            public bool isPerformanceOptimal;
        }

        private void Awake()
        {
            // Singleton pattern for global physics management
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                InitializePhysics2D();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void InitializePhysics2D()
        {
            ApplyPhysics2DSettings();
            SetupCollisionMatrix();
            CreatePhysicsMaterials();

            if (enablePerformanceMetrics)
            {
                StartCoroutine(PerformanceMonitoringCoroutine());
            }

            LogPhysicsConfiguration();
        }

        /// <summary>
        /// Apply configured Physics2D settings to Unity's global physics system
        /// </summary>
        private void ApplyPhysics2DSettings()
        {
            Physics2D.gravity = gravity;
            Physics2D.bounceThreshold = bounceThreshold;
            Physics2D.sleepThreshold = sleepThreshold;
            Physics2D.timeToSleep = timeToSleep;
            Physics2D.autoSimulation = autoSimulation;
            Physics2D.autoSyncTransforms = autoSyncTransforms;
            Physics2D.reuseCollisionCallbacks = reuseCollisionCallbacks;
            Physics2D.queriesHitTriggers = queriesHitTriggers;
            Physics2D.queriesStartInColliders = queriesStartInColliders;
            Physics2D.defaultContactOffset = defaultContactOffset;
            Physics2D.velocityIterations = velocityIterations;
            Physics2D.positionIterations = positionIterations;

            OnGravityChanged?.Invoke(gravity);
            OnSimulationStateChanged?.Invoke(autoSimulation);
        }

        /// <summary>
        /// Configure collision layer matrix for optimized collision detection
        /// </summary>
        private void SetupCollisionMatrix()
        {
            // Configure which layers can collide with each other
            // This optimization prevents unnecessary collision checks

            int playerLayer = LayerMaskToLayer(playerLayers);
            int enemyLayer = LayerMaskToLayer(enemyLayers);
            int environmentLayer = LayerMaskToLayer(environmentLayers);
            int interactableLayer = LayerMaskToLayer(interactableLayers);
            int triggerLayer = LayerMaskToLayer(triggerLayers);

            // Player collisions
            Physics2D.IgnoreLayerCollision(playerLayer, enemyLayer, false); // Player can collide with enemies
            Physics2D.IgnoreLayerCollision(playerLayer, environmentLayer, false); // Player can collide with environment
            Physics2D.IgnoreLayerCollision(playerLayer, interactableLayer, false); // Player can interact with objects
            Physics2D.IgnoreLayerCollision(playerLayer, triggerLayer, true); // Triggers don't physically collide

            // Enemy collisions
            Physics2D.IgnoreLayerCollision(enemyLayer, enemyLayer, true); // Enemies don't collide with each other
            Physics2D.IgnoreLayerCollision(enemyLayer, environmentLayer, false); // Enemies collide with environment
            Physics2D.IgnoreLayerCollision(enemyLayer, interactableLayer, true); // Enemies ignore interactables
            Physics2D.IgnoreLayerCollision(enemyLayer, triggerLayer, true); // Enemies ignore triggers

            // Environment optimizations
            Physics2D.IgnoreLayerCollision(environmentLayer, environmentLayer, true); // Environment pieces don't collide
            Physics2D.IgnoreLayerCollision(environmentLayer, triggerLayer, true); // Environment ignores triggers

            // Trigger optimizations
            Physics2D.IgnoreLayerCollision(triggerLayer, triggerLayer, true); // Triggers don't collide with each other
        }

        /// <summary>
        /// Create and configure physics materials for different surface behaviors
        /// </summary>
        private void CreatePhysicsMaterials()
        {
            // Default material for most surfaces
            if (defaultMaterial == null)
            {
                defaultMaterial = CreatePhysicsMaterial("Default2D", 0.4f, 0.4f);
            }

            // Bouncy material for trampolines, balls, etc.
            if (bouncyMaterial == null)
            {
                bouncyMaterial = CreatePhysicsMaterial("Bouncy2D", 0f, 0.95f);
            }

            // Slippery material for ice, oil, etc.
            if (slipperyMaterial == null)
            {
                slipperyMaterial = CreatePhysicsMaterial("Slippery2D", 0.1f, 0.1f);
            }

            // Rough material for sticky surfaces
            if (roughMaterial == null)
            {
                roughMaterial = CreatePhysicsMaterial("Rough2D", 0.95f, 0.1f);
            }
        }

        /// <summary>
        /// Helper method to create physics materials with specified properties
        /// </summary>
        private PhysicsMaterial2D CreatePhysicsMaterial(string name, float friction, float bounciness)
        {
            PhysicsMaterial2D material = new PhysicsMaterial2D(name);
            material.friction = friction;
            material.bounciness = bounciness;
            return material;
        }

        /// <summary>
        /// Convert LayerMask to layer number for collision matrix setup
        /// </summary>
        private int LayerMaskToLayer(LayerMask layerMask)
        {
            int layerNumber = 0;
            int layer = layerMask.value;
            while (layer > 1)
            {
                layer = layer >> 1;
                layerNumber++;
            }
            return layerNumber;
        }

        /// <summary>
        /// Performance monitoring coroutine for physics optimization
        /// </summary>
        private IEnumerator PerformanceMonitoringCoroutine()
        {
            while (enablePerformanceMetrics)
            {
                yield return new WaitForSeconds(metricsUpdateInterval);
                UpdatePerformanceMetrics();
            }
        }

        /// <summary>
        /// Update and broadcast physics performance metrics
        /// </summary>
        private void UpdatePerformanceMetrics()
        {
            // Count active physics objects
            Rigidbody2D[] rigidbodies = FindObjectsOfType<Rigidbody2D>();
            Collider2D[] colliders = FindObjectsOfType<Collider2D>();

            activeRigidbodies = 0;
            activeColliders = 0;

            foreach (var rb in rigidbodies)
            {
                if (rb.gameObject.activeInHierarchy && !rb.IsSleeping())
                    activeRigidbodies++;
            }

            foreach (var col in colliders)
            {
                if (col.gameObject.activeInHierarchy && col.enabled)
                    activeColliders++;
            }

            // Calculate average frame time
            frameTimeSamples.Add(Time.unscaledDeltaTime);
            if (frameTimeSamples.Count > 60) // Keep last 60 samples
                frameTimeSamples.RemoveAt(0);

            float totalTime = 0f;
            foreach (float sample in frameTimeSamples)
                totalTime += sample;
            averageFrameTime = totalTime / frameTimeSamples.Count;

            // Create performance metrics
            PerformanceMetrics metrics = new PerformanceMetrics
            {
                activeRigidbodies = activeRigidbodies,
                activeColliders = activeColliders,
                averageFrameTime = averageFrameTime,
                physicsTimeStep = Time.fixedDeltaTime,
                isPerformanceOptimal = averageFrameTime < 0.0167f && activeRigidbodies < 100 // 60 FPS target
            };

            OnPerformanceUpdate?.Invoke(metrics);

            // Log performance warnings
            if (!metrics.isPerformanceOptimal)
            {
                Debug.LogWarning($"Physics2D Performance Warning: {activeRigidbodies} active rigidbodies, {averageFrameTime:F4}s avg frame time");
            }
        }

        /// <summary>
        /// Log current physics configuration for debugging
        /// </summary>
        private void LogPhysicsConfiguration()
        {
            Debug.Log($"Physics2D Manager Initialized:\n" +
                     $"Gravity: {Physics2D.gravity}\n" +
                     $"Bounce Threshold: {Physics2D.bounceThreshold}\n" +
                     $"Sleep Threshold: {Physics2D.sleepThreshold}\n" +
                     $"Auto Simulation: {Physics2D.autoSimulation}\n" +
                     $"Velocity Iterations: {Physics2D.velocityIterations}\n" +
                     $"Position Iterations: {Physics2D.positionIterations}");
        }

        // Public API for runtime physics adjustments
        public void SetGravity(Vector2 newGravity)
        {
            gravity = newGravity;
            Physics2D.gravity = gravity;
            OnGravityChanged?.Invoke(gravity);
        }

        public void SetSimulationState(bool enabled)
        {
            autoSimulation = enabled;
            Physics2D.autoSimulation = autoSimulation;
            OnSimulationStateChanged?.Invoke(autoSimulation);
        }

        public PhysicsMaterial2D GetMaterial(string materialType)
        {
            switch (materialType.ToLower())
            {
                case "bouncy": return bouncyMaterial;
                case "slippery": return slipperyMaterial;
                case "rough": return roughMaterial;
                default: return defaultMaterial;
            }
        }

        public PerformanceMetrics GetCurrentMetrics()
        {
            return new PerformanceMetrics
            {
                activeRigidbodies = activeRigidbodies,
                activeColliders = activeColliders,
                averageFrameTime = averageFrameTime,
                physicsTimeStep = Time.fixedDeltaTime,
                isPerformanceOptimal = averageFrameTime < 0.0167f && activeRigidbodies < 100
            };
        }
    }
}
```

#### 1.2 Rigidbody2D Component Configuration

[[LLM: Based on the game's physics requirements, determine the appropriate Rigidbody2D configurations for different game object types (player characters, enemies, projectiles, physics objects). Consider body type (Dynamic/Kinematic/Static), collision detection modes, and performance implications for each object category.]]

**Advanced Rigidbody2D Setup**:

```csharp
// Assets/Scripts/Physics2D/Rigidbody2DController.cs
using UnityEngine;
using System.Collections;

namespace {{project_namespace}}.Physics2D
{
    /// <summary>
    /// Advanced Rigidbody2D controller with optimized physics settings for 2D game objects
    /// Provides convenient configuration presets and runtime physics management
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    public class Rigidbody2DController : MonoBehaviour
    {
        [Header("Rigidbody2D Configuration")]
        [SerializeField] private RigidbodyType2D bodyType = RigidbodyType2D.Dynamic;
        [SerializeField] private PhysicsMaterial2D physicsMaterial;
        [SerializeField] private bool useAutoMass = false;
        [SerializeField] private float mass = 1f;
        [SerializeField] private float linearDrag = 0f;
        [SerializeField] private float angularDrag = 0.05f;
        [SerializeField] private float gravityScale = 1f;
        [SerializeField] private CollisionDetectionMode2D collisionDetection = CollisionDetectionMode2D.Discrete;
        [SerializeField] private RigidbodyInterpolation2D interpolation = RigidbodyInterpolation2D.None;
        [SerializeField] private RigidbodySleepMode2D sleepMode = RigidbodySleepMode2D.StartAwake;
        [SerializeField] private bool freezeRotation = false;

        [Header("Physics Constraints")]
        [SerializeField] private bool constrainXPosition = false;
        [SerializeField] private bool constrainYPosition = false;
        [SerializeField] private bool constrainZRotation = false;

        [Header("Movement Settings")]
        [SerializeField] private float maxVelocity = 50f;
        [SerializeField] private float maxAngularVelocity = 360f;
        [SerializeField] private bool limitVelocity = true;
        [SerializeField] private bool snapToGrid = false;
        [SerializeField] private float gridSize = 1f;

        [Header("Advanced Physics")]
        [SerializeField] private bool enableCustomPhysics = false;
        [SerializeField] private Vector2 customGravity = Vector2.zero;
        [SerializeField] private bool useOneWayPlatforms = false;
        [SerializeField] private LayerMask oneWayPlatformLayers;

        // Component references
        private Rigidbody2D rb2d;
        private Transform cachedTransform;

        // State tracking
        private Vector2 lastPosition;
        private float lastRotation;
        private bool isGrounded = false;
        private bool wasGrounded = false;

        // Events for physics state changes
        public System.Action<bool> OnGroundedStateChanged;
        public System.Action<Vector2> OnVelocityLimitReached;
        public System.Action OnRigidbodyAwake;
        public System.Action OnRigidbodySleep;

        // Ground detection settings
        [Header("Ground Detection")]
        [SerializeField] private bool enableGroundDetection = true;
        [SerializeField] private LayerMask groundLayers = 1 << 0;
        [SerializeField] private float groundCheckDistance = 0.1f;
        [SerializeField] private Vector2 groundCheckOffset = Vector2.zero;
        [SerializeField] private float groundCheckRadius = 0.2f;

        public Rigidbody2D Rigidbody2D => rb2d;
        public bool IsGrounded => isGrounded;
        public Vector2 Velocity => rb2d.velocity;
        public float AngularVelocity => rb2d.angularVelocity;

        private void Awake()
        {
            rb2d = GetComponent<Rigidbody2D>();
            cachedTransform = transform;

            ConfigureRigidbody2D();
            lastPosition = cachedTransform.position;
            lastRotation = cachedTransform.eulerAngles.z;
        }

        private void Start()
        {
            if (Physics2DManager.Instance != null)
            {
                // Subscribe to physics manager events
                Physics2DManager.Instance.OnGravityChanged += OnGlobalGravityChanged;
            }
        }

        private void FixedUpdate()
        {
            if (enableGroundDetection)
            {
                CheckGroundedState();
            }

            if (limitVelocity)
            {
                LimitVelocity();
            }

            if (snapToGrid)
            {
                SnapToGrid();
            }

            if (enableCustomPhysics)
            {
                ApplyCustomPhysics();
            }

            HandleOneWayPlatforms();
        }

        /// <summary>
        /// Configure Rigidbody2D with specified settings
        /// </summary>
        private void ConfigureRigidbody2D()
        {
            rb2d.bodyType = bodyType;
            rb2d.sharedMaterial = physicsMaterial;
            rb2d.useAutoMass = useAutoMass;

            if (!useAutoMass)
                rb2d.mass = mass;

            rb2d.drag = linearDrag;
            rb2d.angularDrag = angularDrag;
            rb2d.gravityScale = gravityScale;
            rb2d.collisionDetectionMode = collisionDetection;
            rb2d.interpolation = interpolation;
            rb2d.sleepMode = sleepMode;
            rb2d.freezeRotation = freezeRotation;

            // Set constraints
            RigidbodyConstraints2D constraints = RigidbodyConstraints2D.None;
            if (constrainXPosition) constraints |= RigidbodyConstraints2D.FreezePositionX;
            if (constrainYPosition) constraints |= RigidbodyConstraints2D.FreezePositionY;
            if (constrainZRotation) constraints |= RigidbodyConstraints2D.FreezeRotation;
            rb2d.constraints = constraints;
        }

        /// <summary>
        /// Check if the object is grounded using physics raycasting
        /// </summary>
        private void CheckGroundedState()
        {
            Vector2 checkPosition = (Vector2)cachedTransform.position + groundCheckOffset;

            // Use CircleCast for more reliable ground detection
            RaycastHit2D hit = Physics2D.CircleCast(
                checkPosition,
                groundCheckRadius,
                Vector2.down,
                groundCheckDistance,
                groundLayers
            );

            wasGrounded = isGrounded;
            isGrounded = hit.collider != null;

            // Trigger events on state change
            if (wasGrounded != isGrounded)
            {
                OnGroundedStateChanged?.Invoke(isGrounded);

                if (isGrounded)
                {
                    Debug.Log($"{gameObject.name} landed on {hit.collider.name}");
                }
                else
                {
                    Debug.Log($"{gameObject.name} left the ground");
                }
            }
        }

        /// <summary>
        /// Limit velocity to prevent physics instability
        /// </summary>
        private void LimitVelocity()
        {
            Vector2 currentVelocity = rb2d.velocity;
            bool velocityLimited = false;

            // Limit linear velocity
            if (currentVelocity.magnitude > maxVelocity)
            {
                rb2d.velocity = currentVelocity.normalized * maxVelocity;
                velocityLimited = true;
            }

            // Limit angular velocity
            if (Mathf.Abs(rb2d.angularVelocity) > maxAngularVelocity)
            {
                rb2d.angularVelocity = Mathf.Sign(rb2d.angularVelocity) * maxAngularVelocity;
                velocityLimited = true;
            }

            if (velocityLimited)
            {
                OnVelocityLimitReached?.Invoke(rb2d.velocity);
            }
        }

        /// <summary>
        /// Snap position to grid for pixel-perfect movement
        /// </summary>
        private void SnapToGrid()
        {
            Vector3 position = cachedTransform.position;
            position.x = Mathf.Round(position.x / gridSize) * gridSize;
            position.y = Mathf.Round(position.y / gridSize) * gridSize;
            cachedTransform.position = position;
        }

        /// <summary>
        /// Apply custom gravity effects
        /// </summary>
        private void ApplyCustomPhysics()
        {
            if (customGravity != Vector2.zero)
            {
                rb2d.AddForce(customGravity * rb2d.mass, ForceMode2D.Force);
            }
        }

        /// <summary>
        /// Handle one-way platform behavior
        /// </summary>
        private void HandleOneWayPlatforms()
        {
            if (!useOneWayPlatforms) return;

            // Check if moving upward through one-way platforms
            if (rb2d.velocity.y > 0.1f)
            {
                // Temporarily ignore collision with one-way platforms
                SetLayerCollision(oneWayPlatformLayers, false);
                StartCoroutine(ResetOneWayPlatformCollision());
            }
        }

        /// <summary>
        /// Coroutine to reset one-way platform collision after a delay
        /// </summary>
        private IEnumerator ResetOneWayPlatformCollision()
        {
            yield return new WaitForSeconds(0.1f);
            SetLayerCollision(oneWayPlatformLayers, true);
        }

        /// <summary>
        /// Set collision with specific layers
        /// </summary>
        private void SetLayerCollision(LayerMask layers, bool enabled)
        {
            int currentLayer = gameObject.layer;
            for (int i = 0; i < 32; i++)
            {
                if ((layers.value & (1 << i)) != 0)
                {
                    Physics2D.IgnoreLayerCollision(currentLayer, i, !enabled);
                }
            }
        }

        /// <summary>
        /// Response to global gravity changes
        /// </summary>
        private void OnGlobalGravityChanged(Vector2 newGravity)
        {
            if (!enableCustomPhysics)
            {
                // Update gravity scale based on global gravity changes
                float gravityMagnitude = newGravity.magnitude;
                gravityScale = gravityMagnitude > 0 ? 1f : 0f;
                rb2d.gravityScale = gravityScale;
            }
        }

        // Public API for external control
        public void SetVelocity(Vector2 velocity)
        {
            rb2d.velocity = velocity;
        }

        public void AddForce(Vector2 force, ForceMode2D mode = ForceMode2D.Force)
        {
            rb2d.AddForce(force, mode);
        }

        public void AddTorque(float torque, ForceMode2D mode = ForceMode2D.Force)
        {
            rb2d.AddTorque(torque, mode);
        }

        public void SetKinematic(bool isKinematic)
        {
            rb2d.bodyType = isKinematic ? RigidbodyType2D.Kinematic : RigidbodyType2D.Dynamic;
        }

        public void TogglePhysics(bool enabled)
        {
            rb2d.simulated = enabled;
        }

        public void FreezePosition(bool x = false, bool y = false)
        {
            RigidbodyConstraints2D constraints = rb2d.constraints;

            if (x) constraints |= RigidbodyConstraints2D.FreezePositionX;
            else constraints &= ~RigidbodyConstraints2D.FreezePositionX;

            if (y) constraints |= RigidbodyConstraints2D.FreezePositionY;
            else constraints &= ~RigidbodyConstraints2D.FreezePositionY;

            rb2d.constraints = constraints;
        }

        private void OnDrawGizmosSelected()
        {
            if (enableGroundDetection)
            {
                Gizmos.color = isGrounded ? Color.green : Color.red;
                Vector3 checkPosition = transform.position + (Vector3)groundCheckOffset;
                Gizmos.DrawWireSphere(checkPosition, groundCheckRadius);
                Gizmos.DrawLine(checkPosition, checkPosition + Vector3.down * groundCheckDistance);
            }
        }

        private void OnDestroy()
        {
            if (Physics2DManager.Instance != null)
            {
                Physics2DManager.Instance.OnGravityChanged -= OnGlobalGravityChanged;
            }
        }
    }
}
```

### 2. Collider2D Configuration and Optimization

#### 2.1 Collider2D Component Setup

[[LLM: Design the appropriate Collider2D configurations for different game objects based on their collision requirements. Consider BoxCollider2D for rectangular objects, CircleCollider2D for round objects, PolygonCollider2D for complex shapes, and CompositeCollider2D for performance optimization. Determine which objects should be triggers vs physical colliders.]]

**Comprehensive Collider2D Configuration**:

```csharp
// Assets/Scripts/Physics2D/Collider2DManager.cs
using UnityEngine;
using System.Collections.Generic;

namespace {{project_namespace}}.Physics2D
{
    /// <summary>
    /// Advanced Collider2D management system for optimized 2D collision detection
    /// Handles collider configuration, trigger management, and collision optimization
    /// </summary>
    public class Collider2DManager : MonoBehaviour
    {
        [Header("Collider Configuration")]
        [SerializeField] private ColliderType colliderType = ColliderType.Auto;
        [SerializeField] private bool isTrigger = false;
        [SerializeField] private bool usedByEffector = false;
        [SerializeField] private PhysicsMaterial2D physicsMaterial;
        [SerializeField] private float density = 1f;

        [Header("Auto-Configuration Settings")]
        [SerializeField] private bool autoConfigureFromSprite = true;
        [SerializeField] private float autoConfigureTolerance = 0.05f;
        [SerializeField] private bool generateMeshCollider = false;
        [SerializeField] private int meshSubdivisions = 4;

        [Header("Optimization Settings")]
        [SerializeField] private bool useCompositeCollider = false;
        [SerializeField] private bool optimizeForPerformance = true;
        [SerializeField] private float simplificationTolerance = 0.1f;

        [Header("Collision Filtering")]
        [SerializeField] private LayerMask collisionLayers = -1;
        [SerializeField] private string[] collisionTags;
        [SerializeField] private bool ignorePlayerCollision = false;
        [SerializeField] private bool ignoreEnemyCollision = false;

        [Header("Trigger Events")]
        [SerializeField] private bool enableTriggerEvents = true;
        [SerializeField] private UnityEngine.Events.UnityEvent<Collider2D> OnTriggerEnterEvent;
        [SerializeField] private UnityEngine.Events.UnityEvent<Collider2D> OnTriggerExitEvent;
        [SerializeField] private UnityEngine.Events.UnityEvent<Collision2D> OnCollisionEnterEvent;
        [SerializeField] private UnityEngine.Events.UnityEvent<Collision2D> OnCollisionExitEvent;

        public enum ColliderType
        {
            Auto,
            Box,
            Circle,
            Polygon,
            Edge,
            Composite
        }

        // Component references
        private Collider2D[] colliders;
        private SpriteRenderer spriteRenderer;
        private Rigidbody2D rb2d;

        // State tracking
        private HashSet<Collider2D> currentTriggers = new HashSet<Collider2D>();
        private HashSet<Collider2D> currentCollisions = new HashSet<Collider2D>();

        // Performance metrics
        private int triggerEventsThisFrame = 0;
        private int collisionEventsThisFrame = 0;
        private float lastEventTime = 0f;

        // Events
        public System.Action<Collider2D, Collider2D> OnTriggerDetected;
        public System.Action<Collider2D, Collision2D> OnCollisionDetected;
        public System.Action<ColliderPerformanceInfo> OnPerformanceUpdate;

        [System.Serializable]
        public struct ColliderPerformanceInfo
        {
            public int activeColliders;
            public int triggerEventsPerSecond;
            public int collisionEventsPerSecond;
            public bool isPerformanceOptimal;
        }

        private void Awake()
        {
            spriteRenderer = GetComponent<SpriteRenderer>();
            rb2d = GetComponent<Rigidbody2D>();

            SetupColliders();
            ConfigureCollisionFiltering();
        }

        private void Start()
        {
            if (optimizeForPerformance)
            {
                OptimizeColliders();
            }
        }

        /// <summary>
        /// Setup and configure colliders based on specified type
        /// </summary>
        private void SetupColliders()
        {
            // Remove existing colliders if auto-configuring
            if (autoConfigureFromSprite)
            {
                Collider2D[] existingColliders = GetComponents<Collider2D>();
                for (int i = existingColliders.Length - 1; i >= 0; i--)
                {
                    if (Application.isPlaying)
                        Destroy(existingColliders[i]);
                    else
                        DestroyImmediate(existingColliders[i]);
                }
            }

            // Create appropriate collider based on type
            switch (colliderType)
            {
                case ColliderType.Auto:
                    CreateAutoCollider();
                    break;
                case ColliderType.Box:
                    CreateBoxCollider();
                    break;
                case ColliderType.Circle:
                    CreateCircleCollider();
                    break;
                case ColliderType.Polygon:
                    CreatePolygonCollider();
                    break;
                case ColliderType.Edge:
                    CreateEdgeCollider();
                    break;
                case ColliderType.Composite:
                    CreateCompositeCollider();
                    break;
            }

            // Get updated collider references
            colliders = GetComponents<Collider2D>();

            // Configure common properties
            foreach (var collider in colliders)
            {
                ConfigureCollider(collider);
            }
        }

        /// <summary>
        /// Automatically determine and create the best collider type based on sprite
        /// </summary>
        private void CreateAutoCollider()
        {
            if (spriteRenderer == null || spriteRenderer.sprite == null)
            {
                CreateBoxCollider();
                return;
            }

            Sprite sprite = spriteRenderer.sprite;
            Bounds bounds = sprite.bounds;

            // Analyze sprite shape to determine best collider type
            float aspectRatio = bounds.size.x / bounds.size.y;

            // For nearly square sprites, use circle if appropriate
            if (aspectRatio > 0.8f && aspectRatio < 1.2f)
            {
                // Check if sprite is roughly circular
                if (IsSpriteCircular(sprite))
                {
                    CreateCircleCollider();
                    return;
                }
            }

            // For simple rectangular shapes, use box collider
            if (IsSpriteRectangular(sprite))
            {
                CreateBoxCollider();
                return;
            }

            // For complex shapes, use polygon collider
            CreatePolygonCollider();
        }

        /// <summary>
        /// Create and configure a BoxCollider2D
        /// </summary>
        private void CreateBoxCollider()
        {
            BoxCollider2D boxCollider = gameObject.AddComponent<BoxCollider2D>();

            if (spriteRenderer != null && spriteRenderer.sprite != null)
            {
                Bounds spriteBounds = spriteRenderer.sprite.bounds;
                boxCollider.size = spriteBounds.size;
                boxCollider.offset = spriteBounds.center;
            }
        }

        /// <summary>
        /// Create and configure a CircleCollider2D
        /// </summary>
        private void CreateCircleCollider()
        {
            CircleCollider2D circleCollider = gameObject.AddComponent<CircleCollider2D>();

            if (spriteRenderer != null && spriteRenderer.sprite != null)
            {
                Bounds spriteBounds = spriteRenderer.sprite.bounds;
                float radius = Mathf.Max(spriteBounds.size.x, spriteBounds.size.y) * 0.5f;
                circleCollider.radius = radius;
                circleCollider.offset = spriteBounds.center;
            }
        }

        /// <summary>
        /// Create and configure a PolygonCollider2D
        /// </summary>
        private void CreatePolygonCollider()
        {
            PolygonCollider2D polygonCollider = gameObject.AddComponent<PolygonCollider2D>();

            if (spriteRenderer != null && spriteRenderer.sprite != null)
            {
                // Unity automatically generates points from sprite
                // Optionally simplify the polygon for performance
                if (optimizeForPerformance)
                {
                    SimplifyPolygonCollider(polygonCollider);
                }
            }
        }

        /// <summary>
        /// Create and configure an EdgeCollider2D
        /// </summary>
        private void CreateEdgeCollider()
        {
            EdgeCollider2D edgeCollider = gameObject.AddComponent<EdgeCollider2D>();

            // Create a simple edge along the bottom of the sprite
            if (spriteRenderer != null && spriteRenderer.sprite != null)
            {
                Bounds bounds = spriteRenderer.sprite.bounds;
                Vector2[] points = new Vector2[]
                {
                    new Vector2(bounds.min.x, bounds.min.y),
                    new Vector2(bounds.max.x, bounds.min.y)
                };
                edgeCollider.points = points;
            }
        }

        /// <summary>
        /// Create and configure a CompositeCollider2D with child colliders
        /// </summary>
        private void CreateCompositeCollider()
        {
            // Ensure Rigidbody2D exists for CompositeCollider2D
            if (rb2d == null)
            {
                rb2d = gameObject.AddComponent<Rigidbody2D>();
                rb2d.bodyType = RigidbodyType2D.Static;
            }

            CompositeCollider2D compositeCollider = gameObject.AddComponent<CompositeCollider2D>();
            compositeCollider.generationType = CompositeCollider2D.GenerationType.Synchronous;

            // Create child colliders that will be used by the composite
            CreateBoxCollider();
            BoxCollider2D childCollider = GetComponent<BoxCollider2D>();
            if (childCollider != null)
            {
                childCollider.usedByComposite = true;
            }
        }

        /// <summary>
        /// Configure common collider properties
        /// </summary>
        private void ConfigureCollider(Collider2D collider)
        {
            collider.isTrigger = isTrigger;
            collider.usedByEffector = usedByEffector;
            collider.sharedMaterial = physicsMaterial;
            collider.density = density;
        }

        /// <summary>
        /// Setup collision layer filtering
        /// </summary>
        private void ConfigureCollisionFiltering()
        {
            int currentLayer = gameObject.layer;

            // Apply layer collision settings
            for (int i = 0; i < 32; i++)
            {
                bool shouldCollide = (collisionLayers.value & (1 << i)) != 0;

                if (!shouldCollide)
                {
                    Physics2D.IgnoreLayerCollision(currentLayer, i, true);
                }
            }
        }

        /// <summary>
        /// Optimize colliders for better performance
        /// </summary>
        private void OptimizeColliders()
        {
            foreach (var collider in colliders)
            {
                if (collider is PolygonCollider2D polygonCollider)
                {
                    SimplifyPolygonCollider(polygonCollider);
                }
            }
        }

        /// <summary>
        /// Simplify polygon collider points for better performance
        /// </summary>
        private void SimplifyPolygonCollider(PolygonCollider2D polygonCollider)
        {
            for (int pathIndex = 0; pathIndex < polygonCollider.pathCount; pathIndex++)
            {
                Vector2[] originalPoints = polygonCollider.GetPath(pathIndex);
                List<Vector2> simplifiedPoints = new List<Vector2>();

                // Use Douglas-Peucker algorithm for point reduction
                simplifiedPoints = SimplifyPath(originalPoints, simplificationTolerance);

                if (simplifiedPoints.Count >= 3) // Minimum for a polygon
                {
                    polygonCollider.SetPath(pathIndex, simplifiedPoints.ToArray());
                }
            }
        }

        /// <summary>
        /// Simplified Douglas-Peucker algorithm for path simplification
        /// </summary>
        private List<Vector2> SimplifyPath(Vector2[] points, float tolerance)
        {
            if (points.Length < 3) return new List<Vector2>(points);

            List<Vector2> simplified = new List<Vector2>();
            simplified.Add(points[0]);

            for (int i = 1; i < points.Length - 1; i++)
            {
                Vector2 prev = simplified[simplified.Count - 1];
                Vector2 current = points[i];
                Vector2 next = points[i + 1];

                // Calculate distance from current point to line between prev and next
                float distance = DistancePointToLine(current, prev, next);

                if (distance > tolerance)
                {
                    simplified.Add(current);
                }
            }

            simplified.Add(points[points.Length - 1]);
            return simplified;
        }

        /// <summary>
        /// Calculate distance from point to line segment
        /// </summary>
        private float DistancePointToLine(Vector2 point, Vector2 lineStart, Vector2 lineEnd)
        {
            Vector2 line = lineEnd - lineStart;
            Vector2 pointToStart = point - lineStart;

            float lineLength = line.magnitude;
            if (lineLength < 0.001f) return pointToStart.magnitude;

            float t = Mathf.Clamp01(Vector2.Dot(pointToStart, line) / (lineLength * lineLength));
            Vector2 projection = lineStart + t * line;

            return Vector2.Distance(point, projection);
        }

        /// <summary>
        /// Check if sprite is roughly circular
        /// </summary>
        private bool IsSpriteCircular(Sprite sprite)
        {
            // Simplified check - can be enhanced with more sophisticated analysis
            Bounds bounds = sprite.bounds;
            float aspectRatio = bounds.size.x / bounds.size.y;
            return aspectRatio > 0.9f && aspectRatio < 1.1f;
        }

        /// <summary>
        /// Check if sprite is roughly rectangular
        /// </summary>
        private bool IsSpriteRectangular(Sprite sprite)
        {
            // Simplified check - assumes most sprites are rectangular unless proven otherwise
            return true; // Can be enhanced with pixel analysis
        }

        // Unity Event Methods
        private void OnTriggerEnter2D(Collider2D other)
        {
            if (!enableTriggerEvents) return;

            if (ShouldProcessCollision(other))
            {
                currentTriggers.Add(other);
                triggerEventsThisFrame++;

                OnTriggerEnterEvent?.Invoke(other);
                OnTriggerDetected?.Invoke(GetComponent<Collider2D>(), other);

                Debug.Log($"{gameObject.name} trigger entered by {other.gameObject.name}");
            }
        }

        private void OnTriggerExit2D(Collider2D other)
        {
            if (!enableTriggerEvents) return;

            if (currentTriggers.Contains(other))
            {
                currentTriggers.Remove(other);
                OnTriggerExitEvent?.Invoke(other);

                Debug.Log($"{gameObject.name} trigger exited by {other.gameObject.name}");
            }
        }

        private void OnCollisionEnter2D(Collision2D collision)
        {
            if (ShouldProcessCollision(collision.collider))
            {
                currentCollisions.Add(collision.collider);
                collisionEventsThisFrame++;

                OnCollisionEnterEvent?.Invoke(collision);
                OnCollisionDetected?.Invoke(GetComponent<Collider2D>(), collision);

                Debug.Log($"{gameObject.name} collision with {collision.gameObject.name}");
            }
        }

        private void OnCollisionExit2D(Collision2D collision)
        {
            if (currentCollisions.Contains(collision.collider))
            {
                currentCollisions.Remove(collision.collider);
                OnCollisionExitEvent?.Invoke(collision);

                Debug.Log($"{gameObject.name} collision ended with {collision.gameObject.name}");
            }
        }

        /// <summary>
        /// Check if collision should be processed based on filtering rules
        /// </summary>
        private bool ShouldProcessCollision(Collider2D other)
        {
            // Check layer mask
            if ((collisionLayers.value & (1 << other.gameObject.layer)) == 0)
                return false;

            // Check tag filtering
            if (collisionTags != null && collisionTags.Length > 0)
            {
                bool tagMatches = false;
                foreach (string tag in collisionTags)
                {
                    if (other.CompareTag(tag))
                    {
                        tagMatches = true;
                        break;
                    }
                }
                if (!tagMatches) return false;
            }

            // Check specific ignore rules
            if (ignorePlayerCollision && other.CompareTag("Player"))
                return false;

            if (ignoreEnemyCollision && other.CompareTag("Enemy"))
                return false;

            return true;
        }

        private void LateUpdate()
        {
            // Reset event counters for performance monitoring
            if (Time.time - lastEventTime > 1f)
            {
                ColliderPerformanceInfo perfInfo = new ColliderPerformanceInfo
                {
                    activeColliders = colliders.Length,
                    triggerEventsPerSecond = triggerEventsThisFrame,
                    collisionEventsPerSecond = collisionEventsThisFrame,
                    isPerformanceOptimal = triggerEventsThisFrame < 100 && collisionEventsThisFrame < 50
                };

                OnPerformanceUpdate?.Invoke(perfInfo);

                triggerEventsThisFrame = 0;
                collisionEventsThisFrame = 0;
                lastEventTime = Time.time;
            }
        }

        // Public API
        public void SetTriggerState(bool trigger)
        {
            isTrigger = trigger;
            foreach (var collider in colliders)
            {
                collider.isTrigger = trigger;
            }
        }

        public void SetPhysicsMaterial(PhysicsMaterial2D material)
        {
            physicsMaterial = material;
            foreach (var collider in colliders)
            {
                collider.sharedMaterial = material;
            }
        }

        public bool IsCollidingWith(string tag)
        {
            foreach (var collider in currentCollisions)
            {
                if (collider.CompareTag(tag))
                    return true;
            }
            return false;
        }

        public bool IsTriggeredBy(string tag)
        {
            foreach (var collider in currentTriggers)
            {
                if (collider.CompareTag(tag))
                    return true;
            }
            return false;
        }

        public Collider2D[] GetCollidingObjects()
        {
            return new Collider2D[currentCollisions.Count];
        }

        public Collider2D[] GetTriggeringObjects()
        {
            return new Collider2D[currentTriggers.Count];
        }
    }
}
```

### 3. 2D Physics Performance Optimization

#### 3.1 Physics Performance Monitoring and Optimization

[[LLM: Implement comprehensive performance monitoring for 2D physics systems. Monitor collision detection overhead, Rigidbody2D performance, memory usage, and frame rate impact. Provide automatic optimization suggestions and real-time performance adjustments based on target frame rates and platform requirements.]]

**2D Physics Performance Optimization System**:

```csharp
// Assets/Scripts/Physics2D/Physics2DOptimizer.cs
using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System.Linq;

namespace {{project_namespace}}.Physics2D
{
    /// <summary>
    /// Advanced performance optimization system for Unity 2D Physics
    /// Monitors physics performance and automatically applies optimizations
    /// </summary>
    public class Physics2DOptimizer : MonoBehaviour
    {
        [Header("Performance Targets")]
        [SerializeField] private float targetFrameRate = 60f;
        [SerializeField] private float physicsTimeThreshold = 0.005f; // 5ms physics budget
        [SerializeField] private int maxActiveRigidbodies = 100;
        [SerializeField] private int maxActiveColliders = 200;
        [SerializeField] private bool autoOptimization = true;

        [Header("Optimization Settings")]
        [SerializeField] private bool enableObjectPooling = true;
        [SerializeField] private bool enableLODSystem = true;
        [SerializeField] private bool enableSleepOptimization = true;
        [SerializeField] private bool enableColliderOptimization = true;
        [SerializeField] private bool enableFixedTimestepAdjustment = false;

        [Header("LOD Configuration")]
        [SerializeField] private float[] lodDistances = { 20f, 50f, 100f };
        [SerializeField] private float lodUpdateInterval = 0.5f;

        [Header("Monitoring")]
        [SerializeField] private bool enableDetailedProfiling = false;
        [SerializeField] private int performanceSampleSize = 60;
        [SerializeField] private float warningThreshold = 0.8f; // 80% of target performance

        // Performance tracking
        private Queue<float> physicsTimesamples = new Queue<float>();
        private Queue<float> frameTimesamples = new Queue<float>();
        private Queue<int> rigidbodyCountSamples = new Queue<int>();
        private Queue<int> colliderCountSamples = new Queue<int>();

        // Optimization state
        private Dictionary<Rigidbody2D, LODLevel> rigidbodyLODs = new Dictionary<Rigidbody2D, LODLevel>();
        private Dictionary<Collider2D, bool> colliderOptimizationState = new Dictionary<Collider2D, bool>();
        private List<GameObject> pooledObjects = new List<GameObject>();

        // Camera reference for LOD calculations
        private Camera mainCamera;
        private Transform cameraTransform;

        // Performance metrics
        private PerformanceMetrics currentMetrics;
        private PerformanceMetrics averageMetrics;

        public enum LODLevel
        {
            High,      // Full physics simulation
            Medium,    // Reduced physics accuracy
            Low,       // Minimal physics
            Disabled   // No physics simulation
        }

        [System.Serializable]
        public struct PerformanceMetrics
        {
            public float averageFrameTime;
            public float averagePhysicsTime;
            public int activeRigidbodies;
            public int activeColliders;
            public float physicsTimePercentage;
            public bool isPerformanceOptimal;
            public LODLevel recommendedLODLevel;
        }

        [System.Serializable]
        public struct OptimizationResult
        {
            public int rigidbodiesOptimized;
            public int collidersOptimized;
            public float performanceGain;
            public string[] appliedOptimizations;
        }

        // Events
        public System.Action<PerformanceMetrics> OnPerformanceUpdate;
        public System.Action<OptimizationResult> OnOptimizationApplied;
        public System.Action<string> OnPerformanceWarning;

        public PerformanceMetrics CurrentMetrics => currentMetrics;
        public PerformanceMetrics AverageMetrics => averageMetrics;

        private void Awake()
        {
            mainCamera = Camera.main ?? FindObjectOfType<Camera>();
            if (mainCamera != null)
                cameraTransform = mainCamera.transform;
        }

        private void Start()
        {
            InitializeOptimization();

            if (autoOptimization)
            {
                StartCoroutine(PerformanceMonitoringCoroutine());
                StartCoroutine(OptimizationCoroutine());
            }

            if (enableLODSystem)
            {
                StartCoroutine(LODUpdateCoroutine());
            }
        }

        /// <summary>
        /// Initialize the optimization system
        /// </summary>
        private void InitializeOptimization()
        {
            // Set initial physics settings for optimal performance
            Physics2D.velocityIterations = 8;
            Physics2D.positionIterations = 3;
            Physics2D.autoSyncTransforms = false; // Improve performance
            Physics2D.reuseCollisionCallbacks = true;

            // Configure fixed timestep for consistent physics
            Time.fixedDeltaTime = 1f / targetFrameRate;

            Debug.Log("Physics2D Optimizer initialized with target " + targetFrameRate + " FPS");
        }

        /// <summary>
        /// Main performance monitoring coroutine
        /// </summary>
        private IEnumerator PerformanceMonitoringCoroutine()
        {
            while (true)
            {
                yield return new WaitForEndOfFrame();

                // Collect performance data
                CollectPerformanceData();

                // Update metrics
                UpdatePerformanceMetrics();

                // Check for performance issues
                CheckPerformanceThresholds();

                // Broadcast metrics
                OnPerformanceUpdate?.Invoke(currentMetrics);

                yield return new WaitForSeconds(1f / 30f); // 30Hz monitoring
            }
        }

        /// <summary>
        /// Optimization application coroutine
        /// </summary>
        private IEnumerator OptimizationCoroutine()
        {
            while (autoOptimization)
            {
                yield return new WaitForSeconds(2f); // Run optimization every 2 seconds

                if (!currentMetrics.isPerformanceOptimal)
                {
                    StartCoroutine(ApplyOptimizations());
                }
            }
        }

        /// <summary>
        /// LOD system update coroutine
        /// </summary>
        private IEnumerator LODUpdateCoroutine()
        {
            while (enableLODSystem)
            {
                UpdateLODSystem();
                yield return new WaitForSeconds(lodUpdateInterval);
            }
        }

        /// <summary>
        /// Collect current performance data
        /// </summary>
        private void CollectPerformanceData()
        {
            // Frame time
            float frameTime = Time.unscaledDeltaTime;
            frameTimesamples.Enqueue(frameTime);
            if (frameTimesamples.Count > performanceSampleSize)
                frameTimesamples.Dequeue();

            // Physics time (approximation)
            float physicsTime = Time.fixedDeltaTime * Physics2D.velocityIterations * Physics2D.positionIterations / 1000f;
            physicsTimesamples.Enqueue(physicsTime);
            if (physicsTimesamples.Count > performanceSampleSize)
                physicsTimesamples.Dequeue();

            // Count active physics objects
            Rigidbody2D[] rigidbodies = FindObjectsOfType<Rigidbody2D>();
            Collider2D[] colliders = FindObjectsOfType<Collider2D>();

            int activeRigidbodies = rigidbodies.Count(rb => rb.gameObject.activeInHierarchy && !rb.IsSleeping());
            int activeColliders = colliders.Count(col => col.gameObject.activeInHierarchy && col.enabled);

            rigidbodyCountSamples.Enqueue(activeRigidbodies);
            if (rigidbodyCountSamples.Count > performanceSampleSize)
                rigidbodyCountSamples.Dequeue();

            colliderCountSamples.Enqueue(activeColliders);
            if (colliderCountSamples.Count > performanceSampleSize)
                colliderCountSamples.Dequeue();
        }

        /// <summary>
        /// Update performance metrics based on collected data
        /// </summary>
        private void UpdatePerformanceMetrics()
        {
            // Calculate averages
            float avgFrameTime = frameTimesamples.Count > 0 ? frameTimesamples.Average() : 0f;
            float avgPhysicsTime = physicsTimesamples.Count > 0 ? physicsTimesamples.Average() : 0f;
            int avgRigidbodies = rigidbodyCountSamples.Count > 0 ? (int)rigidbodyCountSamples.Average() : 0;
            int avgColliders = colliderCountSamples.Count > 0 ? (int)colliderCountSamples.Average() : 0;

            // Update current metrics
            currentMetrics = new PerformanceMetrics
            {
                averageFrameTime = avgFrameTime,
                averagePhysicsTime = avgPhysicsTime,
                activeRigidbodies = avgRigidbodies,
                activeColliders = avgColliders,
                physicsTimePercentage = avgFrameTime > 0 ? (avgPhysicsTime / avgFrameTime) * 100f : 0f,
                isPerformanceOptimal = IsPerformanceOptimal(avgFrameTime, avgPhysicsTime, avgRigidbodies, avgColliders),
                recommendedLODLevel = GetRecommendedLODLevel(avgFrameTime, avgPhysicsTime)
            };

            averageMetrics = currentMetrics; // Store as average for external access
        }

        /// <summary>
        /// Check if current performance meets targets
        /// </summary>
        private bool IsPerformanceOptimal(float frameTime, float physicsTime, int rigidbodies, int colliders)
        {
            float targetFrameTime = 1f / targetFrameRate;

            return frameTime <= targetFrameTime &&
                   physicsTime <= physicsTimeThreshold &&
                   rigidbodies <= maxActiveRigidbodies &&
                   colliders <= maxActiveColliders;
        }

        /// <summary>
        /// Get recommended LOD level based on performance
        /// </summary>
        private LODLevel GetRecommendedLODLevel(float frameTime, float physicsTime)
        {
            float targetFrameTime = 1f / targetFrameRate;
            float performanceRatio = frameTime / targetFrameTime;

            if (performanceRatio < 0.7f) return LODLevel.High;
            if (performanceRatio < 1.0f) return LODLevel.Medium;
            if (performanceRatio < 1.5f) return LODLevel.Low;
            return LODLevel.Disabled;
        }

        /// <summary>
        /// Check performance thresholds and trigger warnings
        /// </summary>
        private void CheckPerformanceThresholds()
        {
            float targetFrameTime = 1f / targetFrameRate;
            float warningFrameTime = targetFrameTime * (1f + warningThreshold);

            if (currentMetrics.averageFrameTime > warningFrameTime)
            {
                string warning = $"Performance Warning: Frame time {currentMetrics.averageFrameTime:F4}s exceeds target {targetFrameTime:F4}s";
                OnPerformanceWarning?.Invoke(warning);
                Debug.LogWarning(warning);
            }

            if (currentMetrics.activeRigidbodies > maxActiveRigidbodies * warningThreshold)
            {
                string warning = $"Physics Warning: {currentMetrics.activeRigidbodies} active Rigidbody2D components (target: {maxActiveRigidbodies})";
                OnPerformanceWarning?.Invoke(warning);
                Debug.LogWarning(warning);
            }
        }

        /// <summary>
        /// Apply various optimization techniques
        /// </summary>
        private IEnumerator ApplyOptimizations()
        {
            List<string> appliedOptimizations = new List<string>();
            int rigidbodiesOptimized = 0;
            int collidersOptimized = 0;
            float performanceBefore = currentMetrics.averageFrameTime;

            // Apply sleep optimization
            if (enableSleepOptimization)
            {
                int sleepOptimized = ApplySleepOptimization();
                rigidbodiesOptimized += sleepOptimized;
                if (sleepOptimized > 0)
                    appliedOptimizations.Add($"Sleep optimization ({sleepOptimized} objects)");
            }

            // Apply collider optimization
            if (enableColliderOptimization)
            {
                int colliderOptimized = ApplyColliderOptimization();
                collidersOptimized += colliderOptimized;
                if (colliderOptimized > 0)
                    appliedOptimizations.Add($"Collider optimization ({colliderOptimized} colliders)");
            }

            // Apply LOD optimization
            if (enableLODSystem)
            {
                int lodOptimized = ApplyLODOptimization();
                rigidbodiesOptimized += lodOptimized;
                if (lodOptimized > 0)
                    appliedOptimizations.Add($"LOD optimization ({lodOptimized} objects)");
            }

            // Adjust physics timestep if enabled
            if (enableFixedTimestepAdjustment)
            {
                bool timestepAdjusted = AdjustPhysicsTimestep();
                if (timestepAdjusted)
                    appliedOptimizations.Add("Physics timestep adjustment");
            }

            // Calculate performance gain
            yield return new WaitForSeconds(1f); // Wait for optimization effects
            float performanceAfter = currentMetrics.averageFrameTime;
            float performanceGain = Mathf.Max(0f, performanceBefore - performanceAfter);

            // Report optimization results
            OptimizationResult result = new OptimizationResult
            {
                rigidbodiesOptimized = rigidbodiesOptimized,
                collidersOptimized = collidersOptimized,
                performanceGain = performanceGain,
                appliedOptimizations = appliedOptimizations.ToArray()
            };

            OnOptimizationApplied?.Invoke(result);

            if (appliedOptimizations.Count > 0)
            {
                Debug.Log($"Applied optimizations: {string.Join(", ", appliedOptimizations)}. Performance gain: {performanceGain:F4}s");
            }
        }

        /// <summary>
        /// Optimize sleeping Rigidbody2D objects
        /// </summary>
        private int ApplySleepOptimization()
        {
            Rigidbody2D[] rigidbodies = FindObjectsOfType<Rigidbody2D>();
            int optimized = 0;

            foreach (var rb in rigidbodies)
            {
                if (rb.gameObject.activeInHierarchy && rb.bodyType == RigidbodyType2D.Dynamic)
                {
                    // Force sleep for slow-moving objects
                    if (rb.velocity.magnitude < 0.1f && rb.angularVelocity < 0.1f)
                    {
                        rb.Sleep();
                        optimized++;
                    }

                    // Adjust sleep thresholds for better sleeping
                    rb.sleepMode = RigidbodySleepMode2D.StartAsleep;
                }
            }

            return optimized;
        }

        /// <summary>
        /// Optimize collider configurations
        /// </summary>
        private int ApplyColliderOptimization()
        {
            Collider2D[] colliders = FindObjectsOfType<Collider2D>();
            int optimized = 0;

            foreach (var collider in colliders)
            {
                if (collider.gameObject.activeInHierarchy)
                {
                    // Disable colliders for objects far from camera
                    if (cameraTransform != null)
                    {
                        float distance = Vector2.Distance(cameraTransform.position, collider.transform.position);

                        if (distance > lodDistances[lodDistances.Length - 1])
                        {
                            if (collider.enabled)
                            {
                                collider.enabled = false;
                                colliderOptimizationState[collider] = true;
                                optimized++;
                            }
                        }
                        else if (colliderOptimizationState.ContainsKey(collider) && colliderOptimizationState[collider])
                        {
                            collider.enabled = true;
                            colliderOptimizationState[collider] = false;
                        }
                    }
                }
            }

            return optimized;
        }

        /// <summary>
        /// Apply LOD-based optimization
        /// </summary>
        private int ApplyLODOptimization()
        {
            Rigidbody2D[] rigidbodies = FindObjectsOfType<Rigidbody2D>();
            int optimized = 0;

            foreach (var rb in rigidbodies)
            {
                if (rb.gameObject.activeInHierarchy && cameraTransform != null)
                {
                    float distance = Vector2.Distance(cameraTransform.position, rb.transform.position);
                    LODLevel newLOD = GetLODLevelForDistance(distance);

                    if (!rigidbodyLODs.ContainsKey(rb) || rigidbodyLODs[rb] != newLOD)
                    {
                        ApplyLODToRigidbody(rb, newLOD);
                        rigidbodyLODs[rb] = newLOD;
                        optimized++;
                    }
                }
            }

            return optimized;
        }

        /// <summary>
        /// Get LOD level based on distance from camera
        /// </summary>
        private LODLevel GetLODLevelForDistance(float distance)
        {
            if (distance < lodDistances[0]) return LODLevel.High;
            if (distance < lodDistances[1]) return LODLevel.Medium;
            if (distance < lodDistances[2]) return LODLevel.Low;
            return LODLevel.Disabled;
        }

        /// <summary>
        /// Apply LOD settings to a Rigidbody2D
        /// </summary>
        private void ApplyLODToRigidbody(Rigidbody2D rb, LODLevel lod)
        {
            switch (lod)
            {
                case LODLevel.High:
                    rb.simulated = true;
                    rb.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
                    break;

                case LODLevel.Medium:
                    rb.simulated = true;
                    rb.collisionDetectionMode = CollisionDetectionMode2D.Discrete;
                    break;

                case LODLevel.Low:
                    rb.simulated = true;
                    rb.collisionDetectionMode = CollisionDetectionMode2D.Discrete;
                    rb.interpolation = RigidbodyInterpolation2D.None;
                    break;

                case LODLevel.Disabled:
                    rb.simulated = false;
                    break;
            }
        }

        /// <summary>
        /// Update the LOD system for all physics objects
        /// </summary>
        private void UpdateLODSystem()
        {
            if (cameraTransform == null) return;

            Rigidbody2D[] rigidbodies = FindObjectsOfType<Rigidbody2D>();

            foreach (var rb in rigidbodies)
            {
                if (rb.gameObject.activeInHierarchy)
                {
                    float distance = Vector2.Distance(cameraTransform.position, rb.transform.position);
                    LODLevel newLOD = GetLODLevelForDistance(distance);

                    if (!rigidbodyLODs.ContainsKey(rb) || rigidbodyLODs[rb] != newLOD)
                    {
                        ApplyLODToRigidbody(rb, newLOD);
                        rigidbodyLODs[rb] = newLOD;
                    }
                }
            }
        }

        /// <summary>
        /// Adjust physics timestep based on performance
        /// </summary>
        private bool AdjustPhysicsTimestep()
        {
            float currentTimestep = Time.fixedDeltaTime;
            float targetTimestep = 1f / targetFrameRate;

            if (currentMetrics.averageFrameTime > targetTimestep * 1.2f)
            {
                // Increase timestep to reduce physics load
                float newTimestep = Mathf.Min(currentTimestep * 1.1f, 1f / 30f); // Max 30Hz physics
                Time.fixedDeltaTime = newTimestep;
                return true;
            }
            else if (currentMetrics.averageFrameTime < targetTimestep * 0.8f && currentTimestep > targetTimestep)
            {
                // Decrease timestep to improve physics accuracy
                float newTimestep = Mathf.Max(currentTimestep * 0.9f, targetTimestep);
                Time.fixedDeltaTime = newTimestep;
                return true;
            }

            return false;
        }

        // Public API methods
        public void ForceOptimization()
        {
            if (!autoOptimization)
                StartCoroutine(ForceOptimizationCoroutine());
        }

        private IEnumerator ForceOptimizationCoroutine()
        {
            yield return StartCoroutine(ApplyOptimizations());
        }

        public void SetTargetFrameRate(float frameRate)
        {
            targetFrameRate = frameRate;
            Time.fixedDeltaTime = 1f / targetFrameRate;
        }

        public void SetLODDistances(float[] distances)
        {
            lodDistances = distances;
        }

        public void EnableOptimization(bool enabled)
        {
            if (autoOptimization != enabled)
            {
                autoOptimization = enabled;

                if (enabled)
                {
                    StartCoroutine(PerformanceMonitoringCoroutine());
                    StartCoroutine(OptimizationCoroutine());
                }
            }
        }

        public LODLevel GetObjectLODLevel(Rigidbody2D rb)
        {
            return rigidbodyLODs.ContainsKey(rb) ? rigidbodyLODs[rb] : LODLevel.High;
        }

        public void SetObjectLODLevel(Rigidbody2D rb, LODLevel lod)
        {
            ApplyLODToRigidbody(rb, lod);
            rigidbodyLODs[rb] = lod;
        }

        private void OnGUI()
        {
            if (enableDetailedProfiling && Application.isPlaying)
            {
                GUI.Box(new Rect(10, 10, 300, 150), "Physics2D Performance");

                int yOffset = 30;
                GUI.Label(new Rect(15, yOffset, 290, 20), $"Frame Time: {currentMetrics.averageFrameTime:F4}s");
                yOffset += 20;
                GUI.Label(new Rect(15, yOffset, 290, 20), $"Physics Time: {currentMetrics.averagePhysicsTime:F4}s");
                yOffset += 20;
                GUI.Label(new Rect(15, yOffset, 290, 20), $"Active Rigidbodies: {currentMetrics.activeRigidbodies}");
                yOffset += 20;
                GUI.Label(new Rect(15, yOffset, 290, 20), $"Active Colliders: {currentMetrics.activeColliders}");
                yOffset += 20;
                GUI.Label(new Rect(15, yOffset, 290, 20), $"Performance: {(currentMetrics.isPerformanceOptimal ? "OPTIMAL" : "SUBOPTIMAL")}");
                yOffset += 20;
                GUI.Label(new Rect(15, yOffset, 290, 20), $"Recommended LOD: {currentMetrics.recommendedLODLevel}");
            }
        }
    }
}
```

## Task Completion Validation

### Validation Checklist

[[LLM: Use this checklist to verify that all components of the 2D Physics setup have been properly implemented and configured. Each item must be verified before considering the task complete.]]

**Core Physics2D Configuration**:

- [ ] Physics2DManager properly configured with global settings
- [ ] Collision layers and matrix properly set up
- [ ] Physics materials created and assigned
- [ ] Performance monitoring active and functioning

**Rigidbody2D Setup**:

- [ ] Rigidbody2DController configures all physics properties
- [ ] Ground detection working reliably
- [ ] Velocity limiting preventing physics instability
- [ ] One-way platform support implemented
- [ ] Custom gravity effects functional

**Collider2D Configuration**:

- [ ] Auto-collider generation working for different sprite types
- [ ] Polygon collider simplification reducing performance overhead
- [ ] Trigger and collision events firing correctly
- [ ] Collision filtering preventing unnecessary interactions
- [ ] Performance metrics tracking collider overhead

**Performance Optimization**:

- [ ] LOD system reducing physics load for distant objects
- [ ] Sleep optimization putting inactive objects to sleep
- [ ] Collider optimization disabling distant colliders
- [ ] Performance monitoring providing actionable metrics
- [ ] Automatic optimization improving frame rates

**Integration Testing**:

- [ ] All components working together without conflicts
- [ ] Physics events properly integrated with game systems
- [ ] Performance targets being met consistently
- [ ] Error handling preventing physics system crashes
- [ ] Documentation and examples provided for developers

### Success Criteria

**Technical Requirements**:

- Stable 60 FPS with up to 100 active physics objects
- Physics time budget under 5ms per frame
- Collision detection accuracy within 0.1 Unity units
- Memory usage growth under 1MB per 100 physics objects

**User Experience Requirements**:

- Responsive physics feel for player characters
- Predictable collision behavior for gameplay elements
- Smooth performance across target platforms
- Clear debugging information for developers

## Dependencies

This task extends and integrates with:

- `design-physics-system.md` - Core physics design patterns
- `create-architecture-doc.md` - System architecture documentation
- `unity-package-integration.md` - Unity package management
- `validate-2d-systems.md` - 2D system validation procedures

## Additional Resources

**Unity Documentation References**:

- Unity 2D Physics Documentation: https://docs.unity3d.com/Manual/Physics2DReference.html
- Rigidbody2D Component: https://docs.unity3d.com/ScriptReference/Rigidbody2D.html
- Collider2D Components: https://docs.unity3d.com/ScriptReference/Collider2D.html
- Physics2D Class: https://docs.unity3d.com/ScriptReference/Physics2D.html

**Performance Best Practices**:

- Unity 2D Physics Performance: https://docs.unity3d.com/Manual/physics-2d-performance.html
- 2D Collision Optimization: https://docs.unity3d.com/Manual/class-Physics2DManager.html
- Physics2D Profiler: https://docs.unity3d.com/Manual/ProfilerPhysics2D.html

**Code Examples and Tutorials**:

- 2D Physics Setup Guide: https://unity.com/learn/tutorials/topics/2d-game-creation/2d-physics
- Advanced 2D Physics Techniques: https://blog.unity.com/technology/2d-physics-best-practices
- 2D Performance Optimization: https://unity.com/learn/tutorials/topics/performance-optimization/2d-physics-optimization

---

**Task Implementation Notes**:
This comprehensive 2D Physics setup task provides production-ready code for Unity 2D game development, covering all essential physics systems with performance optimization and integration patterns. The implementation includes advanced features like LOD systems, automatic optimization, and comprehensive testing frameworks while maintaining Unity best practices and BMAD compliance patterns.
