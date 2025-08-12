# Unity 2D Lighting System Setup Task

## Purpose

To configure Unity's 2D lighting and shadow system for creating atmospheric visual effects, mood lighting, and dynamic shadows in 2D games. This task establishes comprehensive lighting workflows for sprites with normal maps, shadow casting, and performance-optimized rendering for various platforms including mobile devices.

## Dependencies

**Prerequisite Tasks**:
- `unity-package-setup.md` - Universal RP and 2D Renderer installation
- `unity-package-integration.md` - Package configuration

**Integration Points**:
- Sprite Renderer configuration (Normal maps support)
  - Validates: Sprite material shader compatibility
  - Dependencies: Unity built-in sprite system
- Post-processing integration (Bloom, color grading)
  - Requires: Post-processing package if using URP
  - Dependencies: `com.unity.render-pipelines.universal` >= 12.0.0
- Tilemap lighting (2D lights with tilemap systems)
  - Requires: `unity-tilemap-setup.md` task completion if using tilemaps
  - Dependencies: Unity 2D Tilemap system

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Prerequisites and Configuration Load
[[LLM: Validate Unity project for 2D lighting compatibility. Check if using URP or built-in render pipeline. Adapt configuration based on detected setup. If validation fails, provide specific remediation steps.]]

- Load `{{root}}/config.yaml` from expansion pack directory
- Verify Universal RP installation for 2D Renderer:
  - Check `Packages/manifest.json` for URP dependency
  - Validate 2D Renderer asset in project settings
  - If missing, HALT with error: "2D Renderer not configured. Configure URP with 2D Renderer first."
- Identify game genre from architecture: {{game_genre}}
- Load platform optimization profiles: {{target_platform}}

### 1. 2D Lighting Infrastructure Setup

#### 1.1 Create Directory Structure
[[LLM: Adapt directory structure to match existing project conventions. Create only if directories don't exist.]]

```text
{{project_root}}/Assets/
├── _Project/
│   ├── Lighting/
│   │   ├── 2DLights/
│   │   │   ├── Presets/
│   │   │   ├── Profiles/
│   │   │   └── Materials/
│   │   ├── LightCookies/
│   │   ├── NormalMaps/
│   │   └── EmissiveMaps/
│   └── Settings/
│       └── 2DRenderer/
```

#### 1.2 2D Renderer Configuration

```csharp
// Assets/Scripts/Lighting/Light2DRendererConfig.cs
using UnityEngine;
using UnityEngine.Rendering.Universal;

[CreateAssetMenu(fileName = "Light2DConfig", menuName = "Lighting/2D Config")]
public class Light2DRendererConfig : ScriptableObject
{
    [Header("Quality Settings")]
    public bool useNormalMaps = true;
    public int maxLightCount = 32;
    
    [Header("Shadow Settings")]
    public bool enableShadows = true;
    public float shadowIntensity = 0.7f;
    public int shadowResolution = 2048;
    
    [Header("Mobile Optimization")]
    public bool mobileOptimized = false;
    public int mobileLightLimit = 8;
    public int mobileShadowResolution = 512;
    
    public void ApplySettings(Renderer2DData rendererData)
    {
        if (rendererData == null)
        {
            Debug.LogError("[Light2DConfig] Renderer2DData is null");
            return;
        }
        
        try
        {
            // Apply quality settings based on platform
            bool isMobile = Application.platform == RuntimePlatform.Android || 
                          Application.platform == RuntimePlatform.IPhonePlayer;
            
            if (isMobile && mobileOptimized)
            {
                QualitySettings.pixelLightCount = mobileLightLimit;
                Debug.Log($"[Light2DConfig] Applied mobile settings: {mobileLightLimit} lights");
            }
            else
            {
                QualitySettings.pixelLightCount = maxLightCount;
                Debug.Log($"[Light2DConfig] Applied desktop settings: {maxLightCount} lights");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Light2DConfig] Failed to apply settings: {ex.Message}");
        }
    }
}
```

### 2. Light2D Component Configuration

#### 2.1 Light Manager System

```csharp
// Assets/Scripts/Lighting/Light2DManager.cs
using UnityEngine;
using UnityEngine.Rendering.Universal;
using System.Collections.Generic;

public class Light2DManager : MonoBehaviour
{
    [System.Serializable]
    public class LightPreset
    {
        public string name;
        public Light2D.LightType lightType;
        public Color color = Color.white;
        public float intensity = 1f;
        public float innerRadius = 0f;
        public float outerRadius = 1f;
        public float innerAngle = 0f;
        public float outerAngle = 30f;
        public Light2D.NormalMapQuality normalMapQuality = Light2D.NormalMapQuality.Fast;
    }
    
    [SerializeField] private List<LightPreset> lightPresets = new List<LightPreset>();
    [SerializeField] private int maxActiveLights = 16;
    [SerializeField] private float cullingDistance = 20f;
    
    private List<Light2D> activeLights = new List<Light2D>();
    private Camera mainCamera;
    
    public static Light2DManager Instance { get; private set; }
    
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
        
        mainCamera = Camera.main;
    }
    
    public Light2D CreateLight(string presetName, Vector3 position)
    {
        var preset = lightPresets.Find(p => p.name == presetName);
        if (preset == null)
        {
            Debug.LogError($"[Light2DManager] Preset '{presetName}' not found");
            return null;
        }
        
        try
        {
            GameObject lightObj = new GameObject($"Light2D_{preset.name}");
            lightObj.transform.position = position;
            
            Light2D light2D = lightObj.AddComponent<Light2D>();
            light2D.lightType = preset.lightType;
            light2D.color = preset.color;
            light2D.intensity = preset.intensity;
            
            if (preset.lightType == Light2D.LightType.Point)
            {
                light2D.pointLightInnerRadius = preset.innerRadius;
                light2D.pointLightOuterRadius = preset.outerRadius;
            }
            else if (preset.lightType == Light2D.LightType.Spot)
            {
                light2D.pointLightInnerRadius = preset.innerRadius;
                light2D.pointLightOuterRadius = preset.outerRadius;
                light2D.pointLightInnerAngle = preset.innerAngle;
                light2D.pointLightOuterAngle = preset.outerAngle;
            }
            
            light2D.normalMapQuality = preset.normalMapQuality;
            
            activeLights.Add(light2D);
            OptimizeLights();
            
            Debug.Log($"[Light2DManager] Created light '{presetName}' at {position}");
            return light2D;
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Light2DManager] Failed to create light: {ex.Message}");
            return null;
        }
    }
    
    private void OptimizeLights()
    {
        if (activeLights.Count <= maxActiveLights) return;
        
        // Sort lights by distance from camera
        Vector3 cameraPos = mainCamera != null ? mainCamera.transform.position : Vector3.zero;
        
        activeLights.Sort((a, b) =>
        {
            float distA = Vector3.Distance(a.transform.position, cameraPos);
            float distB = Vector3.Distance(b.transform.position, cameraPos);
            return distA.CompareTo(distB);
        });
        
        // Disable distant lights
        for (int i = 0; i < activeLights.Count; i++)
        {
            if (activeLights[i] != null)
            {
                activeLights[i].enabled = i < maxActiveLights;
            }
        }
    }
}
```

#### 2.2 Global Light Configuration

```csharp
// Global lighting for ambient illumination
public class GlobalLight2DSetup : MonoBehaviour
{
    [SerializeField] private Color dayColor = new Color(1f, 0.95f, 0.8f);
    [SerializeField] private Color nightColor = new Color(0.3f, 0.3f, 0.5f);
    [SerializeField] private float transitionSpeed = 1f;
    
    private Light2D globalLight;
    
    void Start()
    {
        SetupGlobalLight();
    }
    
    private void SetupGlobalLight()
    {
        try
        {
            GameObject globalLightObj = new GameObject("GlobalLight2D");
            globalLight = globalLightObj.AddComponent<Light2D>();
            globalLight.lightType = Light2D.LightType.Global;
            globalLight.color = dayColor;
            globalLight.intensity = 1f;
            
            Debug.Log("[GlobalLight2D] Global light created successfully");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[GlobalLight2D] Failed to create global light: {ex.Message}");
        }
    }
    
    public void TransitionToNight()
    {
        if (globalLight != null)
            StartCoroutine(TransitionLight(nightColor, 0.3f));
    }
    
    private System.Collections.IEnumerator TransitionLight(Color targetColor, float targetIntensity)
    {
        Color startColor = globalLight.color;
        float startIntensity = globalLight.intensity;
        float t = 0;
        
        while (t < 1f)
        {
            t += Time.deltaTime * transitionSpeed;
            globalLight.color = Color.Lerp(startColor, targetColor, t);
            globalLight.intensity = Mathf.Lerp(startIntensity, targetIntensity, t);
            yield return null;
        }
    }
}
```

### 3. Normal Maps and Material Setup

#### 3.1 Sprite Normal Map Configuration

```csharp
// Assets/Scripts/Lighting/SpriteNormalMapper.cs
using UnityEngine;

public class SpriteNormalMapper : MonoBehaviour
{
    [SerializeField] private Texture2D normalMap;
    [SerializeField] private Material lit2DMaterial;
    [SerializeField] private float normalMapIntensity = 1f;
    
    private SpriteRenderer spriteRenderer;
    private MaterialPropertyBlock propertyBlock;
    
    void Start()
    {
        SetupNormalMap();
    }
    
    private void SetupNormalMap()
    {
        spriteRenderer = GetComponent<SpriteRenderer>();
        if (spriteRenderer == null)
        {
            Debug.LogError("[SpriteNormalMapper] SpriteRenderer not found");
            return;
        }
        
        try
        {
            // Create or get material with normal map support
            if (lit2DMaterial == null)
            {
                lit2DMaterial = new Material(Shader.Find("Universal Render Pipeline/2D/Sprite-Lit-Default"));
            }
            
            spriteRenderer.material = lit2DMaterial;
            
            // Set normal map using MaterialPropertyBlock
            propertyBlock = new MaterialPropertyBlock();
            spriteRenderer.GetPropertyBlock(propertyBlock);
            
            if (normalMap != null)
            {
                propertyBlock.SetTexture("_NormalMap", normalMap);
                propertyBlock.SetFloat("_NormalMapIntensity", normalMapIntensity);
                spriteRenderer.SetPropertyBlock(propertyBlock);
                
                Debug.Log($"[SpriteNormalMapper] Normal map applied to {gameObject.name}");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[SpriteNormalMapper] Failed to setup normal map: {ex.Message}");
        }
    }
}
```

### 4. Shadow System Configuration

#### 4.1 Shadow Caster 2D Setup

```csharp
// Assets/Scripts/Lighting/ShadowCasterSetup.cs
using UnityEngine;
using UnityEngine.Rendering.Universal;

public class ShadowCasterSetup : MonoBehaviour
{
    [SerializeField] private bool selfShadows = false;
    [SerializeField] private bool castsShadows = true;
    [SerializeField] private float shadowIntensity = 1f;
    
    void Start()
    {
        SetupShadowCaster();
    }
    
    private void SetupShadowCaster()
    {
        try
        {
            // Add ShadowCaster2D component
            ShadowCaster2D shadowCaster = GetComponent<ShadowCaster2D>();
            if (shadowCaster == null)
            {
                shadowCaster = gameObject.AddComponent<ShadowCaster2D>();
            }
            
            shadowCaster.selfShadows = selfShadows;
            shadowCaster.castsShadows = castsShadows;
            
            // Generate shadow mesh from sprite
            if (TryGetComponent<SpriteRenderer>(out var spriteRenderer))
            {
                // Shadow caster will automatically use sprite shape
                Debug.Log($"[ShadowCaster] Shadow caster configured for sprite {gameObject.name}");
            }
            else if (TryGetComponent<CompositeCollider2D>(out var compositeCollider))
            {
                shadowCaster.useRendererSilhouette = false;
                // Use composite collider shape for shadows
                Debug.Log($"[ShadowCaster] Shadow caster using composite collider for {gameObject.name}");
            }
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[ShadowCaster] Failed to setup shadow caster: {ex.Message}");
        }
    }
}
```

### 5. Light Cookies and Masking

#### 5.1 Light Cookie System

```csharp
// Light cookies for shaped light projections
public class LightCookieManager : MonoBehaviour
{
    [System.Serializable]
    public class CookiePreset
    {
        public string name;
        public Sprite cookieSprite;
        public float rotationSpeed = 0f;
    }
    
    [SerializeField] private List<CookiePreset> cookiePresets = new List<CookiePreset>();
    
    public void ApplyCookie(Light2D light2D, string cookieName)
    {
        if (light2D == null)
        {
            Debug.LogError("[LightCookie] Light2D is null");
            return;
        }
        
        var preset = cookiePresets.Find(p => p.name == cookieName);
        if (preset == null)
        {
            Debug.LogError($"[LightCookie] Cookie preset '{cookieName}' not found");
            return;
        }
        
        try
        {
            light2D.lightCookieSprite = preset.cookieSprite;
            light2D.lightCookieSize = Vector2.one * 2f;
            
            if (preset.rotationSpeed != 0)
            {
                var rotator = light2D.gameObject.AddComponent<LightRotator>();
                rotator.rotationSpeed = preset.rotationSpeed;
            }
            
            Debug.Log($"[LightCookie] Applied cookie '{cookieName}' to light");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[LightCookie] Failed to apply cookie: {ex.Message}");
        }
    }
}

public class LightRotator : MonoBehaviour
{
    public float rotationSpeed = 10f;
    
    void Update()
    {
        transform.Rotate(Vector3.forward, rotationSpeed * Time.deltaTime);
    }
}
```

### 6. Emissive Materials

#### 6.1 Emissive Sprite Setup

```csharp
// Emissive materials for self-illuminated sprites
public class EmissiveSpriteSetup : MonoBehaviour
{
    [SerializeField] private Color emissiveColor = Color.white;
    [SerializeField, Range(0f, 10f)] private float emissiveIntensity = 1f;
    [SerializeField] private AnimationCurve pulseCurve = AnimationCurve.Linear(0, 1, 1, 1);
    [SerializeField] private float pulseSpeed = 1f;
    
    private SpriteRenderer spriteRenderer;
    private MaterialPropertyBlock propertyBlock;
    
    void Start()
    {
        SetupEmissive();
    }
    
    private void SetupEmissive()
    {
        spriteRenderer = GetComponent<SpriteRenderer>();
        if (spriteRenderer == null)
        {
            Debug.LogError("[EmissiveSprite] SpriteRenderer not found");
            return;
        }
        
        try
        {
            propertyBlock = new MaterialPropertyBlock();
            spriteRenderer.GetPropertyBlock(propertyBlock);
            
            // HDR color for emission
            Color hdrColor = emissiveColor * emissiveIntensity;
            propertyBlock.SetColor("_EmissionColor", hdrColor);
            
            spriteRenderer.SetPropertyBlock(propertyBlock);
            
            if (pulseSpeed > 0)
            {
                StartCoroutine(PulseEmission());
            }
            
            Debug.Log($"[EmissiveSprite] Emissive setup complete for {gameObject.name}");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[EmissiveSprite] Failed to setup emissive: {ex.Message}");
        }
    }
    
    private System.Collections.IEnumerator PulseEmission()
    {
        float time = 0;
        
        while (true)
        {
            time += Time.deltaTime * pulseSpeed;
            float intensity = pulseCurve.Evaluate(time % 1f) * emissiveIntensity;
            
            Color hdrColor = emissiveColor * intensity;
            propertyBlock.SetColor("_EmissionColor", hdrColor);
            spriteRenderer.SetPropertyBlock(propertyBlock);
            
            yield return null;
        }
    }
}
```

### 7. Performance Optimization

#### 7.1 Mobile 2D Lighting Optimizer

```csharp
// Mobile-specific lighting optimizations
public class Mobile2DLightOptimizer : MonoBehaviour
{
    [Header("Mobile Settings")]
    [SerializeField] private int maxMobileLights = 4;
    [SerializeField] private float lightUpdateInterval = 0.1f;
    [SerializeField] private bool disableNormalMaps = false;
    [SerializeField] private bool reduceShadowQuality = true;
    
    private Light2D[] allLights;
    private Camera mainCamera;
    private float nextUpdateTime;
    
    void Start()
    {
        if (!IsMobilePlatform()) return;
        
        mainCamera = Camera.main;
        OptimizeForMobile();
    }
    
    private bool IsMobilePlatform()
    {
        return Application.platform == RuntimePlatform.Android || 
               Application.platform == RuntimePlatform.IPhonePlayer;
    }
    
    private void OptimizeForMobile()
    {
        try
        {
            // Find all 2D lights
            allLights = FindObjectsOfType<Light2D>();
            
            // Disable normal maps if requested
            if (disableNormalMaps)
            {
                foreach (var light in allLights)
                {
                    light.normalMapQuality = Light2D.NormalMapQuality.Disabled;
                }
                Debug.Log("[Mobile2DOptimizer] Normal maps disabled");
            }
            
            // Reduce shadow quality
            if (reduceShadowQuality)
            {
                var shadowCasters = FindObjectsOfType<ShadowCaster2D>();
                foreach (var caster in shadowCasters)
                {
                    caster.selfShadows = false;
                }
                Debug.Log("[Mobile2DOptimizer] Shadow quality reduced");
            }
            
            Debug.Log($"[Mobile2DOptimizer] Optimized for mobile with {maxMobileLights} light limit");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[Mobile2DOptimizer] Optimization failed: {ex.Message}");
        }
    }
    
    void Update()
    {
        if (!IsMobilePlatform()) return;
        if (Time.time < nextUpdateTime) return;
        
        nextUpdateTime = Time.time + lightUpdateInterval;
        CullDistantLights();
    }
    
    private void CullDistantLights()
    {
        if (allLights == null || mainCamera == null) return;
        
        Vector3 cameraPos = mainCamera.transform.position;
        
        // Sort lights by distance
        System.Array.Sort(allLights, (a, b) =>
        {
            if (a == null) return 1;
            if (b == null) return -1;
            
            float distA = Vector3.Distance(a.transform.position, cameraPos);
            float distB = Vector3.Distance(b.transform.position, cameraPos);
            return distA.CompareTo(distB);
        });
        
        // Enable only closest lights
        for (int i = 0; i < allLights.Length; i++)
        {
            if (allLights[i] != null)
            {
                allLights[i].enabled = i < maxMobileLights;
            }
        }
    }
}
```

### 8. Light Blend Modes

#### 8.1 Blend Mode Configuration

```csharp
// Configure light blending for different visual effects
public class LightBlendModeSetup : MonoBehaviour
{
    public enum BlendPreset
    {
        Standard,      // Normal additive
        Multiply,      // Darkening effect
        Overlay,       // High contrast
        Screen         // Brightening effect
    }
    
    [SerializeField] private BlendPreset blendMode = BlendPreset.Standard;
    
    void Start()
    {
        ApplyBlendMode();
    }
    
    private void ApplyBlendMode()
    {
        var light2D = GetComponent<Light2D>();
        if (light2D == null)
        {
            Debug.LogError("[LightBlendMode] Light2D component not found");
            return;
        }
        
        try
        {
            switch (blendMode)
            {
                case BlendPreset.Standard:
                    light2D.blendStyleIndex = 0;
                    break;
                case BlendPreset.Multiply:
                    light2D.blendStyleIndex = 1;
                    break;
                case BlendPreset.Overlay:
                    light2D.blendStyleIndex = 2;
                    break;
                case BlendPreset.Screen:
                    light2D.blendStyleIndex = 3;
                    break;
            }
            
            Debug.Log($"[LightBlendMode] Applied {blendMode} blend mode");
        }
        catch (System.Exception ex)
        {
            Debug.LogError($"[LightBlendMode] Failed to apply blend mode: {ex.Message}");
        }
    }
}
```

### 9. Testing and Validation

#### 9.1 Create Integration Tests

```csharp
// Assets/Tests/Lighting/Light2DIntegrationTests.cs
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.Rendering.Universal;

[TestFixture]
public class Light2DIntegrationTests
{
    [Test]
    public void Light2D_Manager_CreatesSingleton()
    {
        var go = new GameObject();
        var manager = go.AddComponent<Light2DManager>();
        
        Assert.IsNotNull(Light2DManager.Instance);
        
        Object.DestroyImmediate(go);
    }
    
    [UnityTest]
    public IEnumerator Light2D_Performance_StaysWithinLimits()
    {
        // Create multiple lights
        for (int i = 0; i < 10; i++)
        {
            var lightObj = new GameObject($"TestLight_{i}");
            lightObj.AddComponent<Light2D>();
        }
        
        yield return new WaitForSeconds(0.1f);
        
        // Check performance
        var lights = Object.FindObjectsOfType<Light2D>();
        var activeLights = System.Array.FindAll(lights, l => l.enabled);
        
        Assert.LessOrEqual(activeLights.Length, 32, "Too many active lights");
        
        // Cleanup
        foreach (var light in lights)
        {
            Object.DestroyImmediate(light.gameObject);
        }
    }
}
```

### 10. Documentation Generation

Create `docs/package-integration/2d-lighting-system.md`:

```markdown
# Unity 2D Lighting System Guide

## Quick Start

### Basic Point Light
```csharp
Light2DManager.Instance.CreateLight("PointLight", position);
```

### Global Ambient Light
```csharp
var globalLight = gameObject.AddComponent<Light2D>();
globalLight.lightType = Light2D.LightType.Global;
```

## Common Patterns

### Day/Night Cycle
[Source: GlobalLight2DSetup.cs]

### Shadow Casting Sprites
[Source: ShadowCasterSetup.cs]

### Emissive Objects
[Source: EmissiveSpriteSetup.cs]

## Mobile Optimization

1. **Light Limits**: Maximum 4-8 active lights
2. **Normal Maps**: Disable on low-end devices
3. **Shadows**: Reduce quality or disable
4. **Update Frequency**: Throttle light culling

## Best Practices

1. Use light cookies for shaped projections
2. Implement distance-based culling
3. Pool light objects for reuse
4. Use blend modes for artistic effects
5. Optimize shadow caster meshes
```

### 11. Validation Checklist

- [ ] 2D Renderer configured in URP
- [ ] Directory structure created
- [ ] Light2DManager singleton implemented
- [ ] Normal map support configured
- [ ] Shadow system operational
- [ ] Emissive materials working
- [ ] Light cookies functional
- [ ] Mobile optimization applied
- [ ] Blend modes configured
- [ ] Performance within limits
- [ ] Integration tests passing
- [ ] Documentation complete

## Success Criteria

- 2D lighting system fully integrated
- Normal maps enhancing sprite depth
- Shadows casting correctly
- Mobile performance optimized (<16.67ms frame time)
- Light culling working
- Emissive effects functional
- All integration tests passing
- Complete documentation for artists

## Notes

- This task requires Universal RP with 2D Renderer
- Mobile optimization essential for performance
- Normal maps significantly impact visual quality
- Shadow quality affects performance
- Light cookies enable creative effects
- Template placeholders: {{root}}, {{game_genre}}, {{target_platform}}
- LLM directives guide adaptive processing
- Error handling ensures robust implementation