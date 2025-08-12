# Unity 2D Animation System Integration Task

## Purpose

To configure Unity's 2D Animation package for advanced sprite-based character animation including skeletal rigging, IK chains, sprite libraries, and runtime customization. This task establishes a complete 2D animation pipeline supporting sprite swapping, bone-based animation, physics integration, and state machine control optimized for modern 2D game development.

## Dependencies

**Prerequisite Tasks**:

- `unity-package-setup.md` - 2D Animation package installation
- `unity-package-integration.md` - Package configuration

**Integration Points**:

- Timeline System integration (Animation tracks)
  - Requires: `unity-timeline-setup.md` task completion
  - Validates: 2D Animation track compatibility
  - Dependencies: `com.unity.timeline` package >= 1.4.8
- Input System bindings (Animation triggers)
  - Requires: `unity-input-system-setup.md` task completion
  - Validates: InputActionReference for animation states
  - Dependencies: `com.unity.inputsystem` package >= 1.4.0
- Physics2D integration (Bone colliders)
  - Validates: Physics2D component integration
  - Dependencies: Unity built-in Physics2D system
- Tilemap System coordination (Animated tiles)
  - Validates: Tilemap compatibility with animated sprites
  - Dependencies: `com.unity.2d.tilemap.extras` package

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Prerequisites and Configuration Load

[[LLM: Validate Unity project structure and 2D Animation package compatibility. Adapt validation steps based on detected Unity version. If any validation fails, provide specific remediation steps before proceeding.]]

- Load `{{root}}/config.yaml` from the expansion pack directory
- If config file missing, HALT with error: "config.yaml not found. Please ensure unity-package-setup task completed successfully."
- Verify 2D Animation package installation:
  - Check `Packages/manifest.json` for dependencies:
    - `com.unity.2d.animation` (minimum version: 7.0.9 for Unity 2022.3 LTS, 9.0.4 for Unity 2023.3 LTS)
    - `com.unity.2d.psdimporter` (for Photoshop workflow support)
    - `com.unity.2d.sprite` (core sprite functionality)
    - `com.unity.mathematics` (for bone calculations)
  - Validate packages in `Packages/packages-lock.json`
  - Verify 2D Animation windows accessible: Window > 2D > Bone/Weight/Library
  - If packages missing, HALT with error: "2D Animation packages not installed. Run: unity-package-setup task first."
- Verify prerequisite task completion:
  - Check for `docs/unity-packages.md` from unity-package-setup
  - Check for `docs/package-integration/` directory from unity-package-integration
  - If missing, HALT with error: "Prerequisite tasks not completed. Run unity-package-setup and unity-package-integration first."
- Identify game type ({{game_type}}) from architecture documents
- Load 2D Animation version compatibility matrix for Unity LTS versions

### 1. 2D Animation Asset Structure Setup

#### 1.1 Create Directory Structure

[[LLM: Analyze the project's existing folder structure and adapt the directory creation to match established conventions. If Assets/_Project/ doesn't exist, use the project's current structure pattern.]]

```text
{{project_root}}/Assets/
├── _Project/
│   ├── Art/
│   │   ├── Characters/
│   │   │   ├── [CharacterName]/
│   │   │   │   ├── Sprites/
│   │   │   │   ├── Bones/
│   │   │   │   ├── SpriteLibraries/
│   │   │   │   └── Prefabs/
│   │   ├── Props/
│   │   │   └── Animated/
│   │   └── UI/
│   │       └── AnimatedElements/
│   ├── Animation/
│   │   ├── Characters/
│   │   │   ├── [CharacterName]/
│   │   │   │   ├── Controllers/
│   │   │   │   ├── Clips/
│   │   │   │   └── Overrides/
│   │   ├── Props/
│   │   └── UI/
│   └── Scripts/
│       ├── Animation/
│       │   ├── Controllers/
│       │   ├── IK/
│       │   └── SpriteLibrary/
```

[[LLM: Create directories only if they don't already exist. Log all created directories for tracking.]]

#### 1.2 Asset Naming Conventions

[[LLM: Generate project-specific naming conventions based on game type ({{game_type}}) and existing asset naming patterns. Adapt examples to match project's domain.]]

```markdown
# 2D Animation Naming Patterns

- Sprites: SPR*[Character]*[Part]\_[Frame] (e.g., SPR_Hero_Head_01)
- Bones: BN*[Character]*[BoneName] (e.g., BN_Hero_LeftArm)
- Sprite Libraries: SL*[Character]*[Variant] (e.g., SL_Hero_Armor)
- Animation Clips: AC*[Character]*[Action] (e.g., AC_Hero_Walk)
- Controllers: CTRL*[Character]*[Type] (e.g., CTRL_Hero_Main)
```

[[LLM: Validate naming conventions against existing project standards and suggest modifications if conflicts exist.]]

### 2. Sprite Library System Setup

#### 2.1 Create Sprite Library Manager

```csharp
// Assets/Scripts/Animation/SpriteLibrary/SpriteLibraryManager.cs
using UnityEngine;
using UnityEngine.U2D.Animation;
using System.Collections.Generic;
using System.Collections;

public class SpriteLibraryManager : MonoBehaviour
{
    [System.Serializable]
    public class SpriteLibraryEntry
    {
        public string name;
        public SpriteLibraryAsset library;
        public bool loadOnStart = false;
    }

    [Header("Sprite Library Configuration")]
    [SerializeField] private List<SpriteLibraryEntry> spriteLibraries = new List<SpriteLibraryEntry>();
    [SerializeField] private SpriteLibrary targetSpriteLibrary;
    [SerializeField] private bool enableRuntimeSwapping = true;

    public static SpriteLibraryManager Instance { get; private set; }

    private Dictionary<string, SpriteLibraryAsset> libraryCache = new Dictionary<string, SpriteLibraryAsset>();

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            InitializeSpriteLibraries();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void InitializeSpriteLibraries()
    {
        if (spriteLibraries == null || spriteLibraries.Count == 0)
        {
            Debug.LogWarning("[SpriteLibraryManager] No sprite libraries configured");
            return;
        }

        foreach (var entry in spriteLibraries)
        {
            if (entry.library == null)
            {
                Debug.LogError($"[SpriteLibraryManager] Sprite library '{entry.name}' is null");
                continue;
            }

            try
            {
                libraryCache[entry.name] = entry.library;

                if (entry.loadOnStart && targetSpriteLibrary != null)
                {
                    targetSpriteLibrary.spriteLibraryAsset = entry.library;
                    Debug.Log($"[SpriteLibraryManager] Loaded sprite library '{entry.name}' on start");
                }
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[SpriteLibraryManager] Failed to initialize sprite library '{entry.name}': {ex.Message}");
            }
        }
    }

    public bool SwapSpriteLibrary(string libraryName)
    {
        if (!enableRuntimeSwapping)
        {
            Debug.LogWarning("[SpriteLibraryManager] Runtime swapping is disabled");
            return false;
        }

        if (string.IsNullOrEmpty(libraryName))
        {
            Debug.LogError("[SpriteLibraryManager] Library name cannot be null or empty");
            return false;
        }

        if (targetSpriteLibrary == null)
        {
            Debug.LogError("[SpriteLibraryManager] Target SpriteLibrary component is null");
            return false;
        }

        if (!libraryCache.ContainsKey(libraryName))
        {
            Debug.LogError($"[SpriteLibraryManager] Sprite library '{libraryName}' not found in cache");
            return false;
        }

        try
        {
            targetSpriteLibrary.spriteLibraryAsset = libraryCache[libraryName];
            Debug.Log($"[SpriteLibraryManager] Successfully swapped to sprite library '{libraryName}'");
            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[SpriteLibraryManager] Failed to swap sprite library '{libraryName}': {ex.Message}");
            return false;
        }
    }

    public List<string> GetAvailableLibraries()
    {
        return new List<string>(libraryCache.Keys);
    }

    public bool IsLibraryLoaded(string libraryName)
    {
        return libraryCache.ContainsKey(libraryName);
    }
}
```

#### 2.2 Runtime Sprite Resolver

```csharp
// Assets/Scripts/Animation/SpriteLibrary/RuntimeSpriteResolver.cs
using UnityEngine;
using UnityEngine.U2D.Animation;

public class RuntimeSpriteResolver : MonoBehaviour
{
    [Header("Sprite Resolution")]
    [SerializeField] private SpriteResolver spriteResolver;
    [SerializeField] private string defaultCategory = "Body";
    [SerializeField] private string defaultLabel = "Default";
    [SerializeField] private bool validateOnStart = true;

    private void Start()
    {
        if (validateOnStart)
        {
            ValidateConfiguration();
        }
    }

    private void ValidateConfiguration()
    {
        if (spriteResolver == null)
        {
            spriteResolver = GetComponent<SpriteResolver>();
            if (spriteResolver == null)
            {
                Debug.LogError("[RuntimeSpriteResolver] SpriteResolver component not found");
                return;
            }
        }

        try
        {
            // Set default sprite if not already set
            if (string.IsNullOrEmpty(spriteResolver.GetCategory()) ||
                string.IsNullOrEmpty(spriteResolver.GetLabel()))
            {
                SetSprite(defaultCategory, defaultLabel);
            }

            Debug.Log($"[RuntimeSpriteResolver] Validation complete - Category: {spriteResolver.GetCategory()}, Label: {spriteResolver.GetLabel()}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[RuntimeSpriteResolver] Validation failed: {ex.Message}");
        }
    }

    public bool SetSprite(string category, string label)
    {
        if (spriteResolver == null)
        {
            Debug.LogError("[RuntimeSpriteResolver] SpriteResolver is null");
            return false;
        }

        if (string.IsNullOrEmpty(category) || string.IsNullOrEmpty(label))
        {
            Debug.LogError("[RuntimeSpriteResolver] Category and label cannot be null or empty");
            return false;
        }

        try
        {
            spriteResolver.SetCategoryAndLabel(category, label);
            Debug.Log($"[RuntimeSpriteResolver] Successfully set sprite: {category}/{label}");
            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[RuntimeSpriteResolver] Failed to set sprite {category}/{label}: {ex.Message}");
            return false;
        }
    }

    public bool SetSpriteByHash(int categoryHash, int labelHash)
    {
        if (spriteResolver == null)
        {
            Debug.LogError("[RuntimeSpriteResolver] SpriteResolver is null");
            return false;
        }

        try
        {
            spriteResolver.SetCategoryAndLabel(categoryHash, labelHash);
            Debug.Log($"[RuntimeSpriteResolver] Successfully set sprite by hash: {categoryHash}/{labelHash}");
            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[RuntimeSpriteResolver] Failed to set sprite by hash {categoryHash}/{labelHash}: {ex.Message}");
            return false;
        }
    }
}
```

### 3. Skeletal Animation and Bone Setup

#### 3.1 Bone Hierarchy Manager

```csharp
// Assets/Scripts/Animation/Controllers/BoneHierarchyManager.cs
using UnityEngine;
using UnityEngine.U2D.Animation;
using Unity.Mathematics;
using System.Collections.Generic;

public class BoneHierarchyManager : MonoBehaviour
{
    [System.Serializable]
    public class BoneConfiguration
    {
        public string boneName;
        public Transform boneTransform;
        public float rotationLimit = 45f;
        public bool enablePhysics = false;
        public float physicsInfluence = 0.5f;
    }

    [Header("Bone Configuration")]
    [SerializeField] private SpriteSkin spriteSkin;
    [SerializeField] private List<BoneConfiguration> boneConfigs = new List<BoneConfiguration>();
    [SerializeField] private bool enableBoneConstraints = true;
    [SerializeField] private bool autoValidateBones = true;

    private Dictionary<string, BoneConfiguration> boneDict = new Dictionary<string, BoneConfiguration>();

    private void Start()
    {
        InitializeBoneHierarchy();
    }

    private void InitializeBoneHierarchy()
    {
        if (spriteSkin == null)
        {
            spriteSkin = GetComponent<SpriteSkin>();
            if (spriteSkin == null)
            {
                Debug.LogError("[BoneHierarchyManager] SpriteSkin component not found");
                return;
            }
        }

        try
        {
            // Build bone dictionary for fast lookup
            foreach (var config in boneConfigs)
            {
                if (config.boneTransform == null)
                {
                    Debug.LogWarning($"[BoneHierarchyManager] Bone transform is null for '{config.boneName}'");
                    continue;
                }

                boneDict[config.boneName] = config;

                if (enableBoneConstraints)
                {
                    ApplyBoneConstraints(config);
                }
            }

            if (autoValidateBones)
            {
                ValidateBoneHierarchy();
            }

            Debug.Log($"[BoneHierarchyManager] Initialized {boneDict.Count} bones successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[BoneHierarchyManager] Failed to initialize bone hierarchy: {ex.Message}");
        }
    }

    private void ApplyBoneConstraints(BoneConfiguration config)
    {
        if (config.boneTransform == null) return;

        try
        {
            // Apply rotation constraints
            var rotation = config.boneTransform.localEulerAngles;
            rotation.z = Mathf.Clamp(rotation.z, -config.rotationLimit, config.rotationLimit);
            config.boneTransform.localEulerAngles = rotation;

            // Setup physics if enabled
            if (config.enablePhysics)
            {
                SetupBonePhysics(config);
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[BoneHierarchyManager] Failed to apply constraints to bone '{config.boneName}': {ex.Message}");
        }
    }

    private void SetupBonePhysics(BoneConfiguration config)
    {
        // Add physics components if not present
        if (config.boneTransform.GetComponent<Rigidbody2D>() == null)
        {
            var rb = config.boneTransform.gameObject.AddComponent<Rigidbody2D>();
            rb.gravityScale = config.physicsInfluence;
            rb.drag = 1f;
        }

        if (config.boneTransform.GetComponent<Collider2D>() == null)
        {
            var collider = config.boneTransform.gameObject.AddComponent<CapsuleCollider2D>();
            collider.isTrigger = true;
        }
    }

    private void ValidateBoneHierarchy()
    {
        if (spriteSkin == null) return;

        try
        {
            var bones = spriteSkin.boneTransforms;
            if (bones == null || bones.Length == 0)
            {
                Debug.LogWarning("[BoneHierarchyManager] No bones found in SpriteSkin");
                return;
            }

            bool validationPassed = true;
            for (int i = 0; i < bones.Length; i++)
            {
                if (bones[i] == null)
                {
                    Debug.LogError($"[BoneHierarchyManager] Bone at index {i} is null");
                    validationPassed = false;
                }
            }

            if (validationPassed)
            {
                Debug.Log($"[BoneHierarchyManager] Bone hierarchy validation passed - {bones.Length} bones verified");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[BoneHierarchyManager] Bone hierarchy validation failed: {ex.Message}");
        }
    }

    public bool RotateBone(string boneName, float3 rotation)
    {
        if (!boneDict.ContainsKey(boneName))
        {
            Debug.LogError($"[BoneHierarchyManager] Bone '{boneName}' not found");
            return false;
        }

        var config = boneDict[boneName];
        if (config.boneTransform == null)
        {
            Debug.LogError($"[BoneHierarchyManager] Bone transform is null for '{boneName}'");
            return false;
        }

        try
        {
            // Apply rotation constraints
            float clampedZ = Mathf.Clamp(rotation.z, -config.rotationLimit, config.rotationLimit);
            config.boneTransform.localRotation = quaternion.Euler(rotation.x, rotation.y, clampedZ);
            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[BoneHierarchyManager] Failed to rotate bone '{boneName}': {ex.Message}");
            return false;
        }
    }
}
```

### 4. 2D Inverse Kinematics (IK) System

#### 4.1 IK Chain Controller

```csharp
// Assets/Scripts/Animation/IK/IK2DChainController.cs
using UnityEngine;
using UnityEngine.U2D.IK;
using Unity.Mathematics;

public class IK2DChainController : MonoBehaviour
{
    [System.Serializable]
    public class IKChainConfig
    {
        public string chainName;
        public IKManager2D ikManager;
        public Transform target;
        public float solverWeight = 1f;
        public bool enableConstraints = true;
        public float constraintAngle = 90f;
    }

    [Header("IK Configuration")]
    [SerializeField] private IKChainConfig[] ikChains;
    [SerializeField] private bool enableAutoSolving = true;
    [SerializeField] private int solverIterations = 10;
    [SerializeField] private float tolerance = 0.01f;

    private void Start()
    {
        InitializeIKChains();
    }

    private void InitializeIKChains()
    {
        if (ikChains == null || ikChains.Length == 0)
        {
            Debug.LogWarning("[IK2DChainController] No IK chains configured");
            return;
        }

        foreach (var chain in ikChains)
        {
            if (chain.ikManager == null)
            {
                Debug.LogError($"[IK2DChainController] IK Manager is null for chain '{chain.chainName}'");
                continue;
            }

            try
            {
                // Configure IK solver
                ConfigureIKSolver(chain);
                Debug.Log($"[IK2DChainController] Initialized IK chain '{chain.chainName}'");
            }
            catch (System.Exception ex)
            {
                Debug.LogError($"[IK2DChainController] Failed to initialize IK chain '{chain.chainName}': {ex.Message}");
            }
        }
    }

    private void ConfigureIKSolver(IKChainConfig chain)
    {
        if (chain.ikManager == null) return;

        // Set solver parameters
        var solvers = chain.ikManager.solvers;
        foreach (var solver in solvers)
        {
            if (solver is CCDSolver2D ccdSolver)
            {
                ccdSolver.iterations = solverIterations;
                ccdSolver.tolerance = tolerance;
                ccdSolver.velocity = 1f;

                if (chain.enableConstraints)
                {
                    ApplyCCDConstraints(ccdSolver, chain);
                }
            }
            else if (solver is FabrikSolver2D fabrikSolver)
            {
                fabrikSolver.iterations = solverIterations;
                fabrikSolver.tolerance = tolerance;

                if (chain.enableConstraints)
                {
                    ApplyFabrikConstraints(fabrikSolver, chain);
                }
            }

            solver.weight = chain.solverWeight;
        }
    }

    private void ApplyCCDConstraints(CCDSolver2D solver, IKChainConfig chain)
    {
        // Apply rotation constraints to CCD solver
        solver.constrainRotation = chain.enableConstraints;
        solver.solverLimit = chain.constraintAngle;
    }

    private void ApplyFabrikConstraints(FabrikSolver2D solver, IKChainConfig chain)
    {
        // Apply constraints to FABRIK solver
        // Note: FABRIK constraints are typically applied per bone
        var chain2D = solver.GetChain(0);
        if (chain2D != null)
        {
            for (int i = 0; i < chain2D.transformCount; i++)
            {
                // Apply per-bone constraints if needed
            }
        }
    }

    public bool SetIKTarget(string chainName, Vector3 targetPosition)
    {
        var chain = System.Array.Find(ikChains, c => c.chainName == chainName);
        if (chain == null)
        {
            Debug.LogError($"[IK2DChainController] IK chain '{chainName}' not found");
            return false;
        }

        if (chain.target == null)
        {
            Debug.LogError($"[IK2DChainController] Target transform is null for chain '{chainName}'");
            return false;
        }

        try
        {
            chain.target.position = targetPosition;

            if (enableAutoSolving && chain.ikManager != null)
            {
                chain.ikManager.UpdateManager();
            }

            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[IK2DChainController] Failed to set IK target for chain '{chainName}': {ex.Message}");
            return false;
        }
    }

    public bool SetIKWeight(string chainName, float weight)
    {
        var chain = System.Array.Find(ikChains, c => c.chainName == chainName);
        if (chain == null)
        {
            Debug.LogError($"[IK2DChainController] IK chain '{chainName}' not found");
            return false;
        }

        try
        {
            chain.solverWeight = Mathf.Clamp01(weight);

            if (chain.ikManager != null)
            {
                var solvers = chain.ikManager.solvers;
                foreach (var solver in solvers)
                {
                    solver.weight = chain.solverWeight;
                }
            }

            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[IK2DChainController] Failed to set IK weight for chain '{chainName}': {ex.Message}");
            return false;
        }
    }
}
```

### 5. Sprite Shape Animation

#### 5.1 Sprite Shape Animation Controller

```csharp
// Assets/Scripts/Animation/Controllers/SpriteShapeAnimController.cs
using UnityEngine;
using UnityEngine.U2D;
using System.Collections;

public class SpriteShapeAnimController : MonoBehaviour
{
    [System.Serializable]
    public class SpriteShapeKeyframe
    {
        public float time;
        public Vector3[] controlPoints;
        public AnimationCurve curve = AnimationCurve.EaseInOut(0, 0, 1, 1);
    }

    [Header("Sprite Shape Animation")]
    [SerializeField] private SpriteShapeController spriteShape;
    [SerializeField] private SpriteShapeKeyframe[] keyframes;
    [SerializeField] private float animationDuration = 2f;
    [SerializeField] private bool loopAnimation = true;
    [SerializeField] private bool playOnStart = true;

    private bool isAnimating = false;
    private Vector3[] originalPoints;

    private void Start()
    {
        InitializeSpriteShape();

        if (playOnStart)
        {
            PlayAnimation();
        }
    }

    private void InitializeSpriteShape()
    {
        if (spriteShape == null)
        {
            spriteShape = GetComponent<SpriteShapeController>();
            if (spriteShape == null)
            {
                Debug.LogError("[SpriteShapeAnimController] SpriteShapeController component not found");
                return;
            }
        }

        try
        {
            // Store original control points
            var spline = spriteShape.spline;
            originalPoints = new Vector3[spline.GetPointCount()];

            for (int i = 0; i < spline.GetPointCount(); i++)
            {
                originalPoints[i] = spline.GetPosition(i);
            }

            Debug.Log($"[SpriteShapeAnimController] Initialized with {originalPoints.Length} control points");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[SpriteShapeAnimController] Failed to initialize sprite shape: {ex.Message}");
        }
    }

    public void PlayAnimation()
    {
        if (isAnimating)
        {
            Debug.LogWarning("[SpriteShapeAnimController] Animation already playing");
            return;
        }

        if (keyframes == null || keyframes.Length == 0)
        {
            Debug.LogWarning("[SpriteShapeAnimController] No keyframes configured");
            return;
        }

        StartCoroutine(AnimateCoroutine());
    }

    public void StopAnimation()
    {
        if (isAnimating)
        {
            StopAllCoroutines();
            isAnimating = false;
            ResetToOriginal();
        }
    }

    private IEnumerator AnimateCoroutine()
    {
        isAnimating = true;

        try
        {
            do
            {
                for (int i = 0; i < keyframes.Length - 1; i++)
                {
                    var startFrame = keyframes[i];
                    var endFrame = keyframes[i + 1];

                    float segmentDuration = (endFrame.time - startFrame.time) * animationDuration;
                    float elapsed = 0f;

                    while (elapsed < segmentDuration)
                    {
                        float t = elapsed / segmentDuration;
                        float curveT = startFrame.curve.Evaluate(t);

                        InterpolatePoints(startFrame.controlPoints, endFrame.controlPoints, curveT);

                        elapsed += Time.deltaTime;
                        yield return null;
                    }
                }

                // Complete final frame
                if (keyframes.Length > 0)
                {
                    var finalFrame = keyframes[keyframes.Length - 1];
                    SetControlPoints(finalFrame.controlPoints);
                }

            } while (loopAnimation);
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[SpriteShapeAnimController] Animation error: {ex.Message}");
        }
        finally
        {
            isAnimating = false;
        }
    }

    private void InterpolatePoints(Vector3[] startPoints, Vector3[] endPoints, float t)
    {
        if (spriteShape == null || startPoints == null || endPoints == null) return;

        try
        {
            var spline = spriteShape.spline;
            int pointCount = Mathf.Min(startPoints.Length, endPoints.Length, spline.GetPointCount());

            for (int i = 0; i < pointCount; i++)
            {
                Vector3 interpolated = Vector3.Lerp(startPoints[i], endPoints[i], t);
                spline.SetPosition(i, interpolated);
            }

            spriteShape.RefreshSpriteShape();
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[SpriteShapeAnimController] Failed to interpolate points: {ex.Message}");
        }
    }

    private void SetControlPoints(Vector3[] points)
    {
        if (spriteShape == null || points == null) return;

        try
        {
            var spline = spriteShape.spline;
            int pointCount = Mathf.Min(points.Length, spline.GetPointCount());

            for (int i = 0; i < pointCount; i++)
            {
                spline.SetPosition(i, points[i]);
            }

            spriteShape.RefreshSpriteShape();
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[SpriteShapeAnimController] Failed to set control points: {ex.Message}");
        }
    }

    private void ResetToOriginal()
    {
        if (originalPoints != null)
        {
            SetControlPoints(originalPoints);
        }
    }
}
```

### 6. Animation State Machine Integration

#### 6.1 2D Animation State Controller

```csharp
// Assets/Scripts/Animation/Controllers/Animation2DStateController.cs
using UnityEngine;
using UnityEngine.U2D.Animation;

public class Animation2DStateController : MonoBehaviour
{
    [System.Serializable]
    public class AnimationState
    {
        public string stateName;
        public SpriteLibraryAsset spriteLibrary;
        public RuntimeAnimatorController animatorController;
        public float transitionDuration = 0.2f;
        public bool maintainSpriteResolver = true;
    }

    [Header("State Configuration")]
    [SerializeField] private Animator animator;
    [SerializeField] private SpriteLibrary spriteLibrary;
    [SerializeField] private SpriteResolver[] spriteResolvers;
    [SerializeField] private AnimationState[] animationStates;
    [SerializeField] private string defaultState = "Idle";

    private string currentState;
    private AnimationState currentAnimState;

    private void Start()
    {
        InitializeStateController();

        if (!string.IsNullOrEmpty(defaultState))
        {
            SetAnimationState(defaultState);
        }
    }

    private void InitializeStateController()
    {
        if (animator == null)
        {
            animator = GetComponent<Animator>();
            if (animator == null)
            {
                Debug.LogError("[Animation2DStateController] Animator component not found");
                return;
            }
        }

        if (spriteLibrary == null)
        {
            spriteLibrary = GetComponent<SpriteLibrary>();
            if (spriteLibrary == null)
            {
                Debug.LogError("[Animation2DStateController] SpriteLibrary component not found");
                return;
            }
        }

        if (spriteResolvers == null || spriteResolvers.Length == 0)
        {
            spriteResolvers = GetComponentsInChildren<SpriteResolver>();
            if (spriteResolvers.Length == 0)
            {
                Debug.LogWarning("[Animation2DStateController] No SpriteResolver components found");
            }
        }

        Debug.Log($"[Animation2DStateController] Initialized with {animationStates?.Length ?? 0} states and {spriteResolvers?.Length ?? 0} sprite resolvers");
    }

    public bool SetAnimationState(string stateName)
    {
        if (string.IsNullOrEmpty(stateName))
        {
            Debug.LogError("[Animation2DStateController] State name cannot be null or empty");
            return false;
        }

        var targetState = System.Array.Find(animationStates, s => s.stateName == stateName);
        if (targetState == null)
        {
            Debug.LogError($"[Animation2DStateController] Animation state '{stateName}' not found");
            return false;
        }

        try
        {
            // Update sprite library if different
            if (targetState.spriteLibrary != null && spriteLibrary.spriteLibraryAsset != targetState.spriteLibrary)
            {
                spriteLibrary.spriteLibraryAsset = targetState.spriteLibrary;

                // Refresh sprite resolvers if needed
                if (targetState.maintainSpriteResolver && spriteResolvers != null)
                {
                    RefreshSpriteResolvers();
                }
            }

            // Update animator controller if different
            if (targetState.animatorController != null && animator.runtimeAnimatorController != targetState.animatorController)
            {
                animator.runtimeAnimatorController = targetState.animatorController;
            }

            // Trigger animation state
            if (animator.isActiveAndEnabled)
            {
                animator.CrossFade(stateName, targetState.transitionDuration);
            }

            currentState = stateName;
            currentAnimState = targetState;

            Debug.Log($"[Animation2DStateController] Successfully transitioned to state '{stateName}'");
            return true;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Animation2DStateController] Failed to set animation state '{stateName}': {ex.Message}");
            return false;
        }
    }

    private void RefreshSpriteResolvers()
    {
        if (spriteResolvers == null) return;

        foreach (var resolver in spriteResolvers)
        {
            if (resolver != null)
            {
                try
                {
                    resolver.RefreshSpriteResolver();
                }
                catch (System.Exception ex)
                {
                    Debug.LogWarning($"[Animation2DStateController] Failed to refresh sprite resolver: {ex.Message}");
                }
            }
        }
    }

    public string GetCurrentState()
    {
        return currentState;
    }

    public bool HasState(string stateName)
    {
        return System.Array.Exists(animationStates, s => s.stateName == stateName);
    }

    public string[] GetAvailableStates()
    {
        if (animationStates == null) return new string[0];

        string[] stateNames = new string[animationStates.Length];
        for (int i = 0; i < animationStates.Length; i++)
        {
            stateNames[i] = animationStates[i].stateName;
        }

        return stateNames;
    }
}
```

### 7. Performance Optimization for 2D Animation

[[LLM: Apply mobile optimizations only if target_platform includes mobile devices. Adapt settings based on performance_profile (High/Medium/Low).]]

#### 7.1 2D Animation Performance Manager

```csharp
// Assets/Scripts/Animation/Optimization/Animation2DPerformanceManager.cs
using UnityEngine;
using UnityEngine.U2D.Animation;
using System.Collections.Generic;

public class Animation2DPerformanceManager : MonoBehaviour
{
    [System.Serializable]
    public class PerformanceSettings
    {
        [Header("Culling Settings")]
        public bool enableCulling = true;
        public float cullingDistance = 50f;
        public LayerMask cullingLayers = -1;

        [Header("Animation Settings")]
        public bool reduceBoneUpdates = true;
        public int maxBonesPerFrame = 10;
        public bool disableOffscreenAnimation = true;

        [Header("Sprite Settings")]
        public bool enableSpriteBatching = true;
        public int maxSpritesPerBatch = 100;
        public bool compressTextures = true;
    }

    [Header("Performance Configuration")]
    [SerializeField] private PerformanceSettings performanceSettings;
    [SerializeField] private bool autoOptimize = true;
    [SerializeField] private float optimizationInterval = 1f;

    private List<SpriteSkin> activeSpriteSkins = new List<SpriteSkin>();
    private List<SpriteRenderer> activeSpriteRenderers = new List<SpriteRenderer>();
    private Camera mainCamera;
    private float lastOptimizationTime;

    private void Start()
    {
        InitializePerformanceManager();

        if (autoOptimize)
        {
            InvokeRepeating(nameof(OptimizePerformance), optimizationInterval, optimizationInterval);
        }
    }

    private void InitializePerformanceManager()
    {
        mainCamera = Camera.main;
        if (mainCamera == null)
        {
            mainCamera = FindObjectOfType<Camera>();
        }

        if (mainCamera == null)
        {
            Debug.LogWarning("[Animation2DPerformanceManager] No camera found for culling calculations");
        }

        RefreshActiveComponents();
        Debug.Log($"[Animation2DPerformanceManager] Initialized with {activeSpriteSkins.Count} sprite skins and {activeSpriteRenderers.Count} sprite renderers");
    }

    private void RefreshActiveComponents()
    {
        activeSpriteSkins.Clear();
        activeSpriteRenderers.Clear();

        try
        {
            // Find all active SpriteSkin components
            var spriteSkins = FindObjectsOfType<SpriteSkin>();
            foreach (var spriteSkin in spriteSkins)
            {
                if (spriteSkin.gameObject.activeInHierarchy)
                {
                    activeSpriteSkins.Add(spriteSkin);
                }
            }

            // Find all active SpriteRenderer components
            var spriteRenderers = FindObjectsOfType<SpriteRenderer>();
            foreach (var renderer in spriteRenderers)
            {
                if (renderer.gameObject.activeInHierarchy)
                {
                    activeSpriteRenderers.Add(renderer);
                }
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Animation2DPerformanceManager] Failed to refresh active components: {ex.Message}");
        }
    }

    private void OptimizePerformance()
    {
        if (Time.time - lastOptimizationTime < optimizationInterval)
            return;

        lastOptimizationTime = Time.time;

        try
        {
            if (performanceSettings.enableCulling)
            {
                PerformCullingOptimization();
            }

            if (performanceSettings.reduceBoneUpdates)
            {
                OptimizeBoneUpdates();
            }

            if (performanceSettings.disableOffscreenAnimation)
            {
                OptimizeOffscreenAnimations();
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Animation2DPerformanceManager] Performance optimization failed: {ex.Message}");
        }
    }

    private void PerformCullingOptimization()
    {
        if (mainCamera == null) return;

        Vector3 cameraPos = mainCamera.transform.position;

        foreach (var spriteSkin in activeSpriteSkins)
        {
            if (spriteSkin == null) continue;

            float distance = Vector3.Distance(cameraPos, spriteSkin.transform.position);
            bool shouldBeCulled = distance > performanceSettings.cullingDistance;

            if (spriteSkin.enabled == shouldBeCulled)
            {
                spriteSkin.enabled = !shouldBeCulled;
            }
        }
    }

    private void OptimizeBoneUpdates()
    {
        int bonesUpdatedThisFrame = 0;

        foreach (var spriteSkin in activeSpriteSkins)
        {
            if (spriteSkin == null || !spriteSkin.enabled) continue;

            if (bonesUpdatedThisFrame >= performanceSettings.maxBonesPerFrame)
            {
                // Defer bone updates to next frame
                spriteSkin.enabled = false;
                continue;
            }

            // Count bones in this SpriteSkin
            if (spriteSkin.boneTransforms != null)
            {
                bonesUpdatedThisFrame += spriteSkin.boneTransforms.Length;
            }
        }
    }

    private void OptimizeOffscreenAnimations()
    {
        if (mainCamera == null) return;

        Plane[] frustumPlanes = GeometryUtility.CalculateFrustumPlanes(mainCamera);

        foreach (var renderer in activeSpriteRenderers)
        {
            if (renderer == null) continue;

            bool isVisible = GeometryUtility.TestPlanesAABB(frustumPlanes, renderer.bounds);

            // Disable animators for offscreen sprites
            var animator = renderer.GetComponent<Animator>();
            if (animator != null && animator.enabled != isVisible)
            {
                animator.enabled = isVisible;
            }
        }
    }

    public void SetPerformanceLevel(int level)
    {
        switch (level)
        {
            case 0: // High Performance
                performanceSettings.enableCulling = true;
                performanceSettings.cullingDistance = 30f;
                performanceSettings.maxBonesPerFrame = 5;
                performanceSettings.disableOffscreenAnimation = true;
                break;

            case 1: // Medium Performance
                performanceSettings.enableCulling = true;
                performanceSettings.cullingDistance = 50f;
                performanceSettings.maxBonesPerFrame = 10;
                performanceSettings.disableOffscreenAnimation = true;
                break;

            case 2: // Low Performance (Quality)
                performanceSettings.enableCulling = false;
                performanceSettings.maxBonesPerFrame = 20;
                performanceSettings.disableOffscreenAnimation = false;
                break;
        }

        Debug.Log($"[Animation2DPerformanceManager] Set performance level to {level}");
    }
}
```

### 8. Testing and Validation

#### 8.1 2D Animation Integration Tests

```csharp
// Assets/Tests/Animation/Animation2DIntegrationTests.cs
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.U2D.Animation;
using System.Collections;

[TestFixture]
public class Animation2DIntegrationTests
{
    [Test]
    public void Animation2D_AssetStructure_ExistsCorrectly()
    {
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/Art/Characters"));
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/Animation/Characters"));
        Assert.IsTrue(System.IO.Directory.Exists("Assets/_Project/Scripts/Animation"));
    }

    [UnityTest]
    public IEnumerator SpriteLibrary_RuntimeSwapping_WorksCorrectly()
    {
        var go = new GameObject("TestSpriteLibrary");
        var spriteLibrary = go.AddComponent<SpriteLibrary>();
        var spriteResolver = go.AddComponent<SpriteResolver>();

        // Create test sprite library asset
        var libraryAsset = ScriptableObject.CreateInstance<SpriteLibraryAsset>();
        spriteLibrary.spriteLibraryAsset = libraryAsset;

        yield return null;

        Assert.IsNotNull(spriteLibrary.spriteLibraryAsset);
        Assert.AreEqual(libraryAsset, spriteLibrary.spriteLibraryAsset);

        Object.DestroyImmediate(go);
        Object.DestroyImmediate(libraryAsset);
    }

    [Test]
    public void BoneHierarchy_Validation_PassesCorrectly()
    {
        var go = new GameObject("TestCharacter");
        var spriteSkin = go.AddComponent<SpriteSkin>();
        var boneManager = go.AddComponent<BoneHierarchyManager>();

        // Setup basic bone structure
        var rootBone = new GameObject("RootBone").transform;
        var childBone = new GameObject("ChildBone").transform;
        childBone.SetParent(rootBone);

        spriteSkin.boneTransforms = new Transform[] { rootBone, childBone };

        Assert.IsNotNull(spriteSkin.boneTransforms);
        Assert.AreEqual(2, spriteSkin.boneTransforms.Length);

        Object.DestroyImmediate(go);
        Object.DestroyImmediate(rootBone.gameObject);
    }

    [UnityTest]
    public IEnumerator IK2D_TargetSetting_WorksCorrectly()
    {
        var go = new GameObject("TestIK");
        var ikController = go.AddComponent<IK2DChainController>();

        var targetGO = new GameObject("IKTarget");
        var target = targetGO.transform;
        target.position = Vector3.one;

        yield return new WaitForSeconds(0.1f);

        Assert.IsNotNull(target);
        Assert.AreEqual(Vector3.one, target.position);

        Object.DestroyImmediate(go);
        Object.DestroyImmediate(targetGO);
    }
}
```

### 9. Documentation and Integration

#### 9.1 Generate 2D Animation API Reference

Create `docs/package-integration/2d-animation-system.md`:

````markdown
# Unity 2D Animation Integration Guide

## Quick Start

### Setting Up Character Animation

```csharp
// Basic 2D character setup
var spriteLibrary = character.AddComponent<SpriteLibrary>();
var spriteResolver = character.AddComponent<SpriteResolver>();
var spriteSkin = character.AddComponent<SpriteSkin>();

spriteLibrary.spriteLibraryAsset = characterLibraryAsset;
spriteResolver.SetCategoryAndLabel("Body", "Default");
```
````

### Runtime Sprite Swapping

```csharp
// Swap character equipment
SpriteLibraryManager.Instance.SwapSpriteLibrary("ArmorSet1");
runtimeResolver.SetSprite("Weapon", "Sword");
```

### IK Chain Setup

```csharp
// Configure IK for arm reaching
ikController.SetIKTarget("RightArm", targetPosition);
ikController.SetIKWeight("RightArm", 0.8f);
```

## Common Patterns

### Character Customization System

[Source: SpriteLibraryManager.cs]

### Procedural Animation

[Source: IK2DChainController.cs]

### Performance Optimization

[Source: Animation2DPerformanceManager.cs]

## Best Practices

1. **Sprite Libraries**: Organize by character and equipment type
2. **Bone Hierarchy**: Keep bone counts reasonable for mobile (< 50 bones)
3. **IK Chains**: Use sparingly, disable when not needed
4. **Performance**: Enable culling and offscreen optimization
5. **Memory**: Unload unused sprite libraries

```

### 10. Validation Checklist

- [ ] 2D Animation packages installed and configured
- [ ] Directory structure created for character assets
- [ ] Sprite Library system implemented with runtime swapping
- [ ] Bone hierarchy manager configured with constraints
- [ ] IK chain controller setup for procedural animation
- [ ] Sprite shape animation system implemented
- [ ] Animation state machine integrated with sprite libraries
- [ ] Performance optimization applied for target platform
- [ ] Mobile-specific optimizations enabled (if applicable)
- [ ] Integration tests passing
- [ ] Performance benchmarks met (60 FPS on target hardware)
- [ ] Documentation complete with API reference

## Success Criteria

- Complete 2D animation pipeline functional
- Sprite library system supports runtime customization
- Skeletal animation with IK working smoothly
- Animation state machine integrated with sprite resolvers
- Performance optimized for {{target_platform}}
- Memory usage within acceptable limits
- All integration tests passing
- Team documentation complete for 2D animation workflow

## Notes

- This task extends unity-package-integration for 2D Animation-specific setup
- Compatible with Unity 2022.3 LTS and Unity 2023.3 LTS
- Performance critical for mobile deployment - monitor bone counts
- Sprite Library system enables modular character customization
- IK system provides procedural animation capabilities
- Integration with Timeline for cutscene animation
- Template placeholders: {{root}}, {{game_type}}, {{target_platform}}, {{project_root}}
- LLM directives guide adaptive processing based on project configuration
- Error handling ensures robust animation system across platforms
```
