# Unity Sprite Atlasing and Optimization Task

## Purpose

To establish comprehensive sprite atlasing and 2D texture optimization workflows that maximize rendering performance, minimize memory usage, and ensure scalable asset management. This task extends `unity-2d-animation-setup.md` and `pixel-perfect-camera.md` to provide advanced sprite optimization patterns including automated atlas generation, texture streaming, and platform-specific optimization strategies.

## Prerequisites

- Unity project with 2D renderer pipeline configured and validated
- Pixel perfect camera setup completed and tested
- 2D animation system initialized with sprite assets imported
- Unity 2D Sprite package installed and configured
- SpriteAtlas package verified in Package Manager
- Build platform targets defined with texture compression settings
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Sprite Atlas Architecture and Strategy

#### 1.1 Atlas Generation System Foundation

[[LLM: IF project has existing sprite atlas system THEN analyze current optimization gaps and integration points, ELSE design comprehensive atlasing architecture from scratch. Detect project scale (indie/mobile/AAA) and adjust optimization strategies accordingly. Include error handling for missing dependencies and alternative approaches for different Unity versions. Validate prerequisites and provide specific remediation steps if not met.

CONDITIONAL PROCESSING:
IF existing atlases detected:

- Analyze current atlas packing efficiency and memory usage
- Identify optimization opportunities and performance bottlenecks
- Design integration strategy for enhanced atlas management
- Preserve existing workflows while adding advanced features
  ELSE:
- Design comprehensive atlas architecture from foundation
- Establish optimal atlas grouping and organization patterns
- Create performance-oriented atlas generation workflows

PROJECT SCALE DETECTION:
IF indie/small project (< 500 sprites):

- Optimize for simplicity and fast iteration
- Use single atlas approach with smart grouping
- Focus on editor workflow efficiency
  ELSE IF mobile project:
- Prioritize memory optimization and load times
- Implement platform-specific compression strategies
- Add runtime atlas streaming capabilities
  ELSE IF AAA/large project (> 2000 sprites):
- Design complex multi-atlas management system
- Implement advanced performance monitoring
- Add sophisticated caching and streaming

UNITY VERSION COMPATIBILITY:
IF Unity 2022.3+ LTS:

- Use latest SpriteAtlas APIs and features
- Leverage improved compression options
  ELSE IF Unity 2021.3 LTS:
- Use compatible atlas management approaches
- Implement fallback compression strategies
  ELSE:
- Provide upgrade recommendations
- Use legacy-compatible atlas patterns

ERROR HANDLING:
IF missing Unity 2D packages:

- Provide automatic package installation scripts
- Guide through manual installation process
  IF insufficient project setup:
- Create project structure setup automation
- Provide step-by-step configuration guide
  IF incompatible platform settings:
- Auto-configure platform-specific settings
- Provide manual configuration alternatives]]

**Core Atlas Management System**:

```csharp
// Assets/Scripts/Atlasing/SpriteAtlasManager.cs
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.U2D;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

namespace {{project_namespace}}.Atlasing
{
    /// <summary>
    /// Centralized sprite atlas management system with runtime loading and optimization
    /// </summary>
    public class SpriteAtlasManager : MonoBehaviour
    {
        [Header("Atlas Configuration")]
        [SerializeField] private bool enableRuntimeLoading = true;
        [SerializeField] private bool enableMemoryOptimization = true;
        [SerializeField] private bool enableDebugLogging = false;
        [SerializeField] private int maxConcurrentLoads = 3;
        [SerializeField] private float atlasUnloadDelay = 30.0f;

        [Header("Atlas Groups")]
        [SerializeField] private List<AtlasGroupConfiguration> atlasGroups = new List<AtlasGroupConfiguration>();

        [Header("Performance Monitoring")]
        [SerializeField] private bool enablePerformanceTracking = false;
        [SerializeField] private float performanceUpdateInterval = 5.0f;

        private static SpriteAtlasManager instance;
        public static SpriteAtlasManager Instance
        {
            get
            {
                if (instance == null)
                {
                    instance = FindObjectOfType<SpriteAtlasManager>();
                    if (instance == null)
                    {
                        var go = new GameObject("SpriteAtlasManager");
                        instance = go.AddComponent<SpriteAtlasManager>();
                        DontDestroyOnLoad(go);
                    }
                }
                return instance;
            }
        }

        private Dictionary<string, SpriteAtlas> loadedAtlases = new Dictionary<string, SpriteAtlas>();
        private Dictionary<string, AsyncOperationHandle<SpriteAtlas>> loadingOperations = new Dictionary<string, AsyncOperationHandle<SpriteAtlas>>();
        private Dictionary<string, DateTime> atlasAccessTimes = new Dictionary<string, DateTime>();
        private Dictionary<string, int> atlasUsageCount = new Dictionary<string, int>();

        private Queue<AtlasLoadRequest> loadQueue = new Queue<AtlasLoadRequest>();
        private AtlasPerformanceTracker performanceTracker;
        private bool isProcessingQueue = false;

        public event Action<string, SpriteAtlas> OnAtlasLoaded;
        public event Action<string> OnAtlasUnloaded;
        public event Action<string, string> OnAtlasLoadFailed;

        #region Unity Lifecycle

        private void Awake()
        {
            if (instance == null)
            {
                instance = this;
                DontDestroyOnLoad(gameObject);
                InitializeManager();
            }
            else if (instance != this)
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            SpriteAtlasManager.atlasRequested += OnAtlasRequested;

            if (enablePerformanceTracking)
            {
                performanceTracker = new AtlasPerformanceTracker();
                InvokeRepeating(nameof(UpdatePerformanceMetrics), performanceUpdateInterval, performanceUpdateInterval);
            }
        }

        private void Update()
        {
            ProcessLoadQueue();

            if (enableMemoryOptimization)
            {
                CheckForUnusedAtlases();
            }
        }

        private void OnDestroy()
        {
            SpriteAtlasManager.atlasRequested -= OnAtlasRequested;
            UnloadAllAtlases();

            if (performanceTracker != null)
            {
                performanceTracker.GenerateReport();
            }
        }

        #endregion

        #region Public API

        public void LoadAtlas(string atlasName, Action<SpriteAtlas> onLoaded = null, Action<string> onFailed = null)
        {
            if (string.IsNullOrEmpty(atlasName))
            {
                LogError("Cannot load atlas: name is null or empty");
                onFailed?.Invoke("Invalid atlas name");
                return;
            }

            // Check if already loaded
            if (loadedAtlases.ContainsKey(atlasName))
            {
                UpdateAtlasAccessTime(atlasName);
                onLoaded?.Invoke(loadedAtlases[atlasName]);
                return;
            }

            // Check if currently loading
            if (loadingOperations.ContainsKey(atlasName))
            {
                LogDebug($"Atlas {atlasName} is already being loaded");
                return;
            }

            // Queue for loading
            var request = new AtlasLoadRequest
            {
                AtlasName = atlasName,
                OnLoaded = onLoaded,
                OnFailed = onFailed,
                Priority = GetAtlasPriority(atlasName),
                RequestTime = DateTime.UtcNow
            };

            loadQueue.Enqueue(request);
            LogDebug($"Queued atlas {atlasName} for loading");
        }

        public void UnloadAtlas(string atlasName, bool force = false)
        {
            if (!loadedAtlases.ContainsKey(atlasName))
            {
                LogWarning($"Cannot unload atlas {atlasName}: not loaded");
                return;
            }

            if (!force && IsAtlasInUse(atlasName))
            {
                LogDebug($"Atlas {atlasName} is in use, cannot unload");
                return;
            }

            try
            {
                var atlas = loadedAtlases[atlasName];
                loadedAtlases.Remove(atlasName);
                atlasAccessTimes.Remove(atlasName);
                atlasUsageCount.Remove(atlasName);

                // Release addressable reference if using addressables
                if (loadingOperations.ContainsKey(atlasName))
                {
                    Addressables.Release(loadingOperations[atlasName]);
                    loadingOperations.Remove(atlasName);
                }

                OnAtlasUnloaded?.Invoke(atlasName);
                LogDebug($"Unloaded atlas: {atlasName}");
            }
            catch (Exception ex)
            {
                LogError($"Failed to unload atlas {atlasName}: {ex.Message}");
            }
        }

        public SpriteAtlas GetAtlas(string atlasName)
        {
            if (loadedAtlases.ContainsKey(atlasName))
            {
                UpdateAtlasAccessTime(atlasName);
                return loadedAtlases[atlasName];
            }
            return null;
        }

        public Sprite GetSprite(string atlasName, string spriteName)
        {
            var atlas = GetAtlas(atlasName);
            if (atlas != null)
            {
                var sprite = atlas.GetSprite(spriteName);
                if (sprite != null)
                {
                    UpdateAtlasUsage(atlasName);
                    return sprite;
                }
                LogWarning($"Sprite {spriteName} not found in atlas {atlasName}");
            }
            return null;
        }

        public bool IsAtlasLoaded(string atlasName)
        {
            return loadedAtlases.ContainsKey(atlasName);
        }

        public bool IsAtlasLoading(string atlasName)
        {
            return loadingOperations.ContainsKey(atlasName);
        }

        public void PreloadEssentialAtlases()
        {
            var essentialAtlases = atlasGroups
                .Where(g => g.LoadOnStart)
                .Select(g => g.AtlasName)
                .ToList();

            foreach (var atlasName in essentialAtlases)
            {
                LoadAtlas(atlasName);
            }

            LogDebug($"Preloading {essentialAtlases.Count} essential atlases");
        }

        public AtlasManagerStatus GetStatus()
        {
            return new AtlasManagerStatus
            {
                LoadedAtlasCount = loadedAtlases.Count,
                LoadingOperationsCount = loadingOperations.Count,
                QueuedRequestsCount = loadQueue.Count,
                TotalMemoryUsage = CalculateTotalMemoryUsage(),
                PerformanceMetrics = performanceTracker?.GetCurrentMetrics()
            };
        }

        #endregion

        #region Atlas Loading Implementation

        private void ProcessLoadQueue()
        {
            if (isProcessingQueue || loadQueue.Count == 0)
                return;

            if (loadingOperations.Count >= maxConcurrentLoads)
                return;

            isProcessingQueue = true;

            try
            {
                var request = loadQueue.Dequeue();
                StartAtlasLoad(request);
            }
            catch (Exception ex)
            {
                LogError($"Error processing load queue: {ex.Message}");
            }
            finally
            {
                isProcessingQueue = false;
            }
        }

        private void StartAtlasLoad(AtlasLoadRequest request)
        {
            try
            {
                var atlasReference = GetAtlasAddressableKey(request.AtlasName);
                if (string.IsNullOrEmpty(atlasReference))
                {
                    LogError($"No addressable reference found for atlas: {request.AtlasName}");
                    request.OnFailed?.Invoke($"Atlas reference not found: {request.AtlasName}");
                    return;
                }

                var operation = Addressables.LoadAssetAsync<SpriteAtlas>(atlasReference);
                loadingOperations[request.AtlasName] = operation;

                operation.Completed += (op) => OnAtlasLoadCompleted(request, op);

                LogDebug($"Started loading atlas: {request.AtlasName}");
            }
            catch (Exception ex)
            {
                LogError($"Failed to start atlas load for {request.AtlasName}: {ex.Message}");
                request.OnFailed?.Invoke(ex.Message);
            }
        }

        private void OnAtlasLoadCompleted(AtlasLoadRequest request, AsyncOperationHandle<SpriteAtlas> operation)
        {
            try
            {
                if (operation.Status == UnityEngine.ResourceManagement.AsyncOperations.AsyncOperationStatus.Succeeded)
                {
                    var atlas = operation.Result;
                    loadedAtlases[request.AtlasName] = atlas;
                    UpdateAtlasAccessTime(request.AtlasName);

                    OnAtlasLoaded?.Invoke(request.AtlasName, atlas);
                    request.OnLoaded?.Invoke(atlas);

                    LogDebug($"Successfully loaded atlas: {request.AtlasName}");

                    if (enablePerformanceTracking)
                    {
                        performanceTracker?.RecordAtlasLoad(request.AtlasName,
                            (DateTime.UtcNow - request.RequestTime).TotalMilliseconds);
                    }
                }
                else
                {
                    var errorMessage = $"Failed to load atlas {request.AtlasName}: {operation.OperationException?.Message}";
                    LogError(errorMessage);

                    OnAtlasLoadFailed?.Invoke(request.AtlasName, errorMessage);
                    request.OnFailed?.Invoke(errorMessage);
                }
            }
            catch (Exception ex)
            {
                var errorMessage = $"Exception during atlas load completion for {request.AtlasName}: {ex.Message}";
                LogError(errorMessage);
                request.OnFailed?.Invoke(errorMessage);
            }
            finally
            {
                if (loadingOperations.ContainsKey(request.AtlasName))
                {
                    loadingOperations.Remove(request.AtlasName);
                }
            }
        }

        #endregion

        #region Atlas Management

        private void OnAtlasRequested(string tag, Action<SpriteAtlas> callback)
        {
            // Unity's built-in atlas request handler
            LoadAtlas(tag, callback, (error) => {
                LogError($"Atlas request failed for {tag}: {error}");
                callback?.Invoke(null);
            });
        }

        private void CheckForUnusedAtlases()
        {
            var currentTime = DateTime.UtcNow;
            var atlasesToUnload = new List<string>();

            foreach (var kvp in atlasAccessTimes)
            {
                var atlasName = kvp.Key;
                var lastAccessTime = kvp.Value;

                if ((currentTime - lastAccessTime).TotalSeconds > atlasUnloadDelay)
                {
                    if (!IsAtlasEssential(atlasName) && !IsAtlasInUse(atlasName))
                    {
                        atlasesToUnload.Add(atlasName);
                    }
                }
            }

            foreach (var atlasName in atlasesToUnload)
            {
                UnloadAtlas(atlasName);
            }
        }

        private bool IsAtlasEssential(string atlasName)
        {
            var group = atlasGroups.FirstOrDefault(g => g.AtlasName == atlasName);
            return group != null && group.KeepInMemory;
        }

        private bool IsAtlasInUse(string atlasName)
        {
            // Check if any sprites from this atlas are currently being used
            // This is a simplified check - in production, you might want more sophisticated tracking
            return atlasUsageCount.ContainsKey(atlasName) && atlasUsageCount[atlasName] > 0;
        }

        private void UpdateAtlasAccessTime(string atlasName)
        {
            atlasAccessTimes[atlasName] = DateTime.UtcNow;
        }

        private void UpdateAtlasUsage(string atlasName)
        {
            if (!atlasUsageCount.ContainsKey(atlasName))
            {
                atlasUsageCount[atlasName] = 0;
            }
            atlasUsageCount[atlasName]++;
        }

        private int GetAtlasPriority(string atlasName)
        {
            var group = atlasGroups.FirstOrDefault(g => g.AtlasName == atlasName);
            return group?.Priority ?? 0;
        }

        private string GetAtlasAddressableKey(string atlasName)
        {
            var group = atlasGroups.FirstOrDefault(g => g.AtlasName == atlasName);
            return group?.AddressableKey ?? atlasName;
        }

        private void UnloadAllAtlases()
        {
            var atlasNames = new List<string>(loadedAtlases.Keys);
            foreach (var atlasName in atlasNames)
            {
                UnloadAtlas(atlasName, true);
            }
        }

        private float CalculateTotalMemoryUsage()
        {
            float totalMemory = 0f;
            foreach (var atlas in loadedAtlases.Values)
            {
                if (atlas != null && atlas.texture != null)
                {
                    totalMemory += GetTextureMemorySize(atlas.texture);
                }
            }
            return totalMemory;
        }

        private float GetTextureMemorySize(Texture2D texture)
        {
            if (texture == null) return 0f;

            // Calculate approximate memory usage
            int width = texture.width;
            int height = texture.height;
            int bytesPerPixel = GetBytesPerPixel(texture.format);

            return (width * height * bytesPerPixel) / (1024f * 1024f); // Return in MB
        }

        private int GetBytesPerPixel(TextureFormat format)
        {
            switch (format)
            {
                case TextureFormat.RGBA32:
                case TextureFormat.ARGB32:
                    return 4;
                case TextureFormat.RGB24:
                    return 3;
                case TextureFormat.RGBA4444:
                case TextureFormat.RGB565:
                    return 2;
                case TextureFormat.Alpha8:
                    return 1;
                case TextureFormat.DXT1:
                    return 1; // Compressed
                case TextureFormat.DXT5:
                    return 1; // Compressed
                default:
                    return 4; // Default assumption
            }
        }

        #endregion

        #region Initialization and Configuration

        private void InitializeManager()
        {
            ValidateConfiguration();
            InitializeAtlasGroups();
        }

        private void ValidateConfiguration()
        {
            if (maxConcurrentLoads <= 0)
            {
                LogWarning("Max concurrent loads must be greater than 0, setting to 3");
                maxConcurrentLoads = 3;
            }

            if (atlasUnloadDelay < 0)
            {
                LogWarning("Atlas unload delay cannot be negative, setting to 30 seconds");
                atlasUnloadDelay = 30.0f;
            }
        }

        private void InitializeAtlasGroups()
        {
            foreach (var group in atlasGroups)
            {
                if (string.IsNullOrEmpty(group.AtlasName))
                {
                    LogError("Atlas group has empty name, skipping");
                    continue;
                }

                if (string.IsNullOrEmpty(group.AddressableKey))
                {
                    group.AddressableKey = group.AtlasName;
                }
            }
        }

        private void UpdatePerformanceMetrics()
        {
            if (performanceTracker != null)
            {
                performanceTracker.UpdateMetrics(GetStatus());
            }
        }

        #endregion

        #region Logging

        private void LogDebug(string message)
        {
            if (enableDebugLogging)
            {
                Debug.Log($"[SpriteAtlasManager] {message}");
            }
        }

        private void LogWarning(string message)
        {
            Debug.LogWarning($"[SpriteAtlasManager] {message}");
        }

        private void LogError(string message)
        {
            Debug.LogError($"[SpriteAtlasManager] {message}");
        }

        #endregion
    }

    #region Supporting Classes

    [Serializable]
    public class AtlasGroupConfiguration
    {
        [Header("Basic Settings")]
        public string AtlasName;
        public string AddressableKey;
        public string Description;

        [Header("Loading Behavior")]
        public bool LoadOnStart = false;
        public bool KeepInMemory = false;
        public int Priority = 0;

        [Header("Optimization")]
        public AtlasCompressionSettings CompressionSettings;
        public List<string> PlatformOverrides = new List<string>();
    }

    [Serializable]
    public class AtlasCompressionSettings
    {
        public TextureFormat DesktopFormat = TextureFormat.DXT5;
        public TextureFormat MobileFormat = TextureFormat.ASTC_6x6;
        public int MaxTextureSize = 2048;
        public bool EnableMipmaps = false;
        public FilterMode FilterMode = FilterMode.Bilinear;
    }

    public class AtlasLoadRequest
    {
        public string AtlasName;
        public Action<SpriteAtlas> OnLoaded;
        public Action<string> OnFailed;
        public int Priority;
        public DateTime RequestTime;
    }

    public class AtlasManagerStatus
    {
        public int LoadedAtlasCount;
        public int LoadingOperationsCount;
        public int QueuedRequestsCount;
        public float TotalMemoryUsage;
        public AtlasPerformanceMetrics PerformanceMetrics;
    }

    public class AtlasPerformanceMetrics
    {
        public float AverageLoadTime;
        public int TotalLoadsCompleted;
        public int LoadFailureCount;
        public float MemoryUsageVariance;
        public DateTime LastUpdateTime;
    }

    public class AtlasPerformanceTracker
    {
        private List<float> loadTimes = new List<float>();
        private int loadFailures = 0;
        private List<float> memorySnapshots = new List<float>();

        public void RecordAtlasLoad(string atlasName, double loadTimeMs)
        {
            loadTimes.Add((float)loadTimeMs);
            if (loadTimes.Count > 100) // Keep only recent measurements
            {
                loadTimes.RemoveAt(0);
            }
        }

        public void RecordLoadFailure()
        {
            loadFailures++;
        }

        public void UpdateMetrics(AtlasManagerStatus status)
        {
            memorySnapshots.Add(status.TotalMemoryUsage);
            if (memorySnapshots.Count > 50)
            {
                memorySnapshots.RemoveAt(0);
            }
        }

        public AtlasPerformanceMetrics GetCurrentMetrics()
        {
            return new AtlasPerformanceMetrics
            {
                AverageLoadTime = loadTimes.Count > 0 ? loadTimes.Average() : 0f,
                TotalLoadsCompleted = loadTimes.Count,
                LoadFailureCount = loadFailures,
                MemoryUsageVariance = CalculateMemoryVariance(),
                LastUpdateTime = DateTime.UtcNow
            };
        }

        private float CalculateMemoryVariance()
        {
            if (memorySnapshots.Count < 2) return 0f;

            float mean = memorySnapshots.Average();
            float variance = memorySnapshots.Sum(x => Mathf.Pow(x - mean, 2)) / memorySnapshots.Count;
            return Mathf.Sqrt(variance);
        }

        public void GenerateReport()
        {
            var metrics = GetCurrentMetrics();
            Debug.Log($"[AtlasPerformanceReport] Average Load Time: {metrics.AverageLoadTime:F2}ms, " +
                     $"Total Loads: {metrics.TotalLoadsCompleted}, Failures: {metrics.LoadFailureCount}, " +
                     $"Memory Variance: {metrics.MemoryUsageVariance:F2}MB");
        }
    }

    #endregion
}
```

### 2. Advanced Atlas Optimization Strategies

#### 2.1 Automated Atlas Generation and Validation

[[LLM: Create an automated system for sprite atlas generation that analyzes sprite usage patterns, optimizes atlas packing efficiency, and validates atlas configurations. Include tools for detecting atlas fragmentation, identifying unused sprites, and recommending atlas reorganization strategies.]]

**Atlas Generation and Optimization System**:

```csharp
// Assets/Scripts/Atlasing/AtlasOptimizer.cs
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.U2D;
using UnityEditor;

namespace {{project_namespace}}.Atlasing
{
    /// <summary>
    /// Advanced atlas optimization system with automated generation and validation
    /// </summary>
    public class AtlasOptimizer
    {
        public class OptimizationSettings
        {
            [Header("Atlas Generation")]
            public int MaxAtlasSize = 2048;
            public int Padding = 2;
            public bool EnableTightPacking = true;
            public bool AllowRotation = false;

            [Header("Quality Settings")]
            public float CompressionQuality = 1.0f;
            public bool EnableDithering = false;
            public bool GenerateMipMaps = false;

            [Header("Platform Optimization")]
            public Dictionary<BuildTarget, AtlasCompressionSettings> PlatformSettings =
                new Dictionary<BuildTarget, AtlasCompressionSettings>();

            [Header("Validation")]
            public float MinPackingEfficiency = 0.75f;
            public int MaxUnusedSpritePercentage = 10;
            public bool EnableFragmentationDetection = true;
        }

        public class OptimizationResult
        {
            public bool Success;
            public string Message;
            public List<string> Warnings = new List<string>();
            public AtlasStatistics Statistics;
            public List<OptimizationRecommendation> Recommendations = new List<OptimizationRecommendation>();
        }

        public class AtlasStatistics
        {
            public int TotalSprites;
            public int UsedSprites;
            public int UnusedSprites;
            public float PackingEfficiency;
            public Vector2Int AtlasSize;
            public long MemoryUsage;
            public int DrawCallReduction;
        }

        public class OptimizationRecommendation
        {
            public RecommendationType Type;
            public string Description;
            public string Action;
            public float ImpactScore;
        }

        public enum RecommendationType
        {
            SizeOptimization,
            PackingImprovement,
            CompressionUpdate,
            UnusedSpriteRemoval,
            AtlasReorganization,
            PlatformSpecific
        }

        private OptimizationSettings settings;
        private List<Sprite> analysisSprites = new List<Sprite>();
        private SpriteUsageAnalyzer usageAnalyzer;

        public AtlasOptimizer(OptimizationSettings optimizationSettings = null)
        {
            settings = optimizationSettings ?? new OptimizationSettings();
            usageAnalyzer = new SpriteUsageAnalyzer();
        }

        #region Public API

        public OptimizationResult OptimizeAtlas(SpriteAtlas atlas, List<Sprite> targetSprites = null)
        {
            var result = new OptimizationResult();

            try
            {
                // Analyze current atlas
                var currentStats = AnalyzeAtlas(atlas);
                result.Statistics = currentStats;

                // Gather sprites for optimization
                var spritesToOptimize = targetSprites ?? GatherAtlasSprites(atlas);

                // Analyze sprite usage
                var usageData = usageAnalyzer.AnalyzeUsage(spritesToOptimize);

                // Generate optimization recommendations
                var recommendations = GenerateRecommendations(currentStats, usageData);
                result.Recommendations = recommendations;

                // Apply optimizations if requested
                if (settings.EnableTightPacking)
                {
                    ApplyPackingOptimizations(atlas, spritesToOptimize);
                }

                // Validate optimization results
                var validationResult = ValidateOptimization(atlas, currentStats);
                result.Success = validationResult.IsValid;
                result.Message = validationResult.Message;
                result.Warnings = validationResult.Warnings;

                return result;
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.Message = $"Optimization failed: {ex.Message}";
                return result;
            }
        }

        public List<SpriteAtlas> GenerateOptimalAtlases(List<Sprite> sprites, int maxAtlasCount = 5)
        {
            var atlases = new List<SpriteAtlas>();

            try
            {
                // Group sprites by usage patterns and characteristics
                var spriteGroups = GroupSpritesByOptimalCriteria(sprites);

                foreach (var group in spriteGroups.Take(maxAtlasCount))
                {
                    var atlas = CreateOptimizedAtlas(group.Key, group.Value);
                    if (atlas != null)
                    {
                        atlases.Add(atlas);
                    }
                }

                return atlases;
            }
            catch (Exception ex)
            {
                Debug.LogError($"Failed to generate optimal atlases: {ex.Message}");
                return atlases;
            }
        }

        public ValidationResult ValidateAtlasConfiguration(SpriteAtlas atlas)
        {
            var result = new ValidationResult();

            try
            {
                var stats = AnalyzeAtlas(atlas);

                // Check packing efficiency
                if (stats.PackingEfficiency < settings.MinPackingEfficiency)
                {
                    result.AddWarning($"Packing efficiency {stats.PackingEfficiency:P} is below threshold {settings.MinPackingEfficiency:P}");
                }

                // Check unused sprites
                float unusedPercentage = (float)stats.UnusedSprites / stats.TotalSprites * 100;
                if (unusedPercentage > settings.MaxUnusedSpritePercentage)
                {
                    result.AddWarning($"Unused sprites percentage {unusedPercentage:F1}% exceeds threshold {settings.MaxUnusedSpritePercentage}%");
                }

                // Check atlas size
                if (stats.AtlasSize.x > settings.MaxAtlasSize || stats.AtlasSize.y > settings.MaxAtlasSize)
                {
                    result.AddError($"Atlas size {stats.AtlasSize} exceeds maximum {settings.MaxAtlasSize}");
                }

                // Platform-specific validation
                ValidatePlatformConfigurations(atlas, result);

                result.IsValid = result.Errors.Count == 0;
                return result;
            }
            catch (Exception ex)
            {
                result.AddError($"Validation failed: {ex.Message}");
                return result;
            }
        }

        #endregion

        #region Analysis Methods

        private AtlasStatistics AnalyzeAtlas(SpriteAtlas atlas)
        {
            var stats = new AtlasStatistics();

            // Get all sprites in atlas
            var sprites = new Sprite[atlas.spriteCount];
            atlas.GetSprites(sprites);

            stats.TotalSprites = sprites.Length;

            // Analyze usage
            var usageData = usageAnalyzer.AnalyzeUsage(sprites.ToList());
            stats.UsedSprites = usageData.Count(u => u.IsUsed);
            stats.UnusedSprites = stats.TotalSprites - stats.UsedSprites;

            // Calculate packing efficiency
            stats.PackingEfficiency = CalculatePackingEfficiency(atlas, sprites);

            // Get atlas dimensions
            if (atlas.texture != null)
            {
                stats.AtlasSize = new Vector2Int(atlas.texture.width, atlas.texture.height);
                stats.MemoryUsage = CalculateMemoryUsage(atlas.texture);
            }

            // Estimate draw call reduction
            stats.DrawCallReduction = EstimateDrawCallReduction(sprites.Length);

            return stats;
        }

        private float CalculatePackingEfficiency(SpriteAtlas atlas, Sprite[] sprites)
        {
            if (atlas.texture == null || sprites.Length == 0)
                return 0f;

            float totalSpriteArea = 0f;
            float atlasArea = atlas.texture.width * atlas.texture.height;

            foreach (var sprite in sprites)
            {
                if (sprite != null && sprite.rect.width > 0 && sprite.rect.height > 0)
                {
                    totalSpriteArea += sprite.rect.width * sprite.rect.height;
                }
            }

            return totalSpriteArea / atlasArea;
        }

        private long CalculateMemoryUsage(Texture2D texture)
        {
            if (texture == null) return 0;

            int bytesPerPixel = GetBytesPerPixel(texture.format);
            return texture.width * texture.height * bytesPerPixel;
        }

        private int GetBytesPerPixel(TextureFormat format)
        {
            switch (format)
            {
                case TextureFormat.RGBA32:
                case TextureFormat.ARGB32:
                    return 4;
                case TextureFormat.RGB24:
                    return 3;
                case TextureFormat.RGBA4444:
                case TextureFormat.RGB565:
                    return 2;
                case TextureFormat.Alpha8:
                    return 1;
                case TextureFormat.DXT1:
                    return 1;
                case TextureFormat.DXT5:
                    return 1;
                default:
                    return 4;
            }
        }

        private int EstimateDrawCallReduction(int spriteCount)
        {
            // Estimate based on typical sprite usage patterns
            return Mathf.Max(1, spriteCount / 10);
        }

        #endregion

        #region Optimization Implementation

        private List<OptimizationRecommendation> GenerateRecommendations(AtlasStatistics stats, List<SpriteUsageData> usageData)
        {
            var recommendations = new List<OptimizationRecommendation>();

            // Packing efficiency recommendations
            if (stats.PackingEfficiency < settings.MinPackingEfficiency)
            {
                recommendations.Add(new OptimizationRecommendation
                {
                    Type = RecommendationType.PackingImprovement,
                    Description = "Packing efficiency can be improved",
                    Action = "Enable tight packing and consider sprite resizing",
                    ImpactScore = (settings.MinPackingEfficiency - stats.PackingEfficiency) * 10
                });
            }

            // Unused sprite recommendations
            if (stats.UnusedSprites > 0)
            {
                float unusedPercentage = (float)stats.UnusedSprites / stats.TotalSprites * 100;
                recommendations.Add(new OptimizationRecommendation
                {
                    Type = RecommendationType.UnusedSpriteRemoval,
                    Description = $"{stats.UnusedSprites} unused sprites detected",
                    Action = "Remove unused sprites to reduce atlas size",
                    ImpactScore = unusedPercentage / 10
                });
            }

            // Size optimization recommendations
            if (stats.AtlasSize.x > 1024 || stats.AtlasSize.y > 1024)
            {
                recommendations.Add(new OptimizationRecommendation
                {
                    Type = RecommendationType.SizeOptimization,
                    Description = "Large atlas size detected",
                    Action = "Consider splitting into smaller atlases",
                    ImpactScore = Mathf.Max(stats.AtlasSize.x, stats.AtlasSize.y) / 1024f
                });
            }

            return recommendations.OrderByDescending(r => r.ImpactScore).ToList();
        }

        private void ApplyPackingOptimizations(SpriteAtlas atlas, List<Sprite> sprites)
        {
            // Implementation would involve Unity Editor APIs for atlas configuration
            // This is a simplified representation of the optimization process

            #if UNITY_EDITOR
            var serializedObject = new SerializedObject(atlas);
            var packingSettings = serializedObject.FindProperty("m_PackingSettings");

            // Apply tight packing
            if (settings.EnableTightPacking)
            {
                packingSettings.FindPropertyRelative("enableTightPacking").boolValue = true;
                packingSettings.FindPropertyRelative("padding").intValue = settings.Padding;
                packingSettings.FindPropertyRelative("allowAlphaSplitting").boolValue = true;
            }

            // Apply rotation if enabled
            packingSettings.FindPropertyRelative("enableRotation").boolValue = settings.AllowRotation;

            serializedObject.ApplyModifiedProperties();
            #endif
        }

        private Dictionary<string, List<Sprite>> GroupSpritesByOptimalCriteria(List<Sprite> sprites)
        {
            var groups = new Dictionary<string, List<Sprite>>();

            foreach (var sprite in sprites)
            {
                var groupKey = DetermineOptimalGroup(sprite);

                if (!groups.ContainsKey(groupKey))
                {
                    groups[groupKey] = new List<Sprite>();
                }

                groups[groupKey].Add(sprite);
            }

            return groups;
        }

        private string DetermineOptimalGroup(Sprite sprite)
        {
            // Group by size category
            var area = sprite.rect.width * sprite.rect.height;

            if (area < 1024) return "Small";
            if (area < 16384) return "Medium";
            if (area < 65536) return "Large";
            return "XLarge";
        }

        private SpriteAtlas CreateOptimizedAtlas(string groupName, List<Sprite> sprites)
        {
            #if UNITY_EDITOR
            var atlas = ScriptableObject.CreateInstance<SpriteAtlas>();
            atlas.name = $"OptimizedAtlas_{groupName}";

            // Configure atlas settings
            var packingSettings = atlas.GetPackingSettings();
            packingSettings.enableTightPacking = settings.EnableTightPacking;
            packingSettings.enableRotation = settings.AllowRotation;
            packingSettings.padding = settings.Padding;
            atlas.SetPackingSettings(packingSettings);

            var textureSettings = atlas.GetTextureSettings();
            textureSettings.generateMipMaps = settings.GenerateMipMaps;
            textureSettings.filterMode = FilterMode.Bilinear;
            atlas.SetTextureSettings(textureSettings);

            // Add sprites to atlas
            var objects = sprites.Cast<UnityEngine.Object>().ToArray();
            atlas.Add(objects);

            return atlas;
            #else
            return null;
            #endif
        }

        private ValidationResult ValidateOptimization(SpriteAtlas atlas, AtlasStatistics originalStats)
        {
            var result = new ValidationResult();
            var newStats = AnalyzeAtlas(atlas);

            // Compare improvements
            if (newStats.PackingEfficiency > originalStats.PackingEfficiency)
            {
                result.AddSuccess($"Packing efficiency improved from {originalStats.PackingEfficiency:P} to {newStats.PackingEfficiency:P}");
            }

            if (newStats.UnusedSprites < originalStats.UnusedSprites)
            {
                result.AddSuccess($"Reduced unused sprites from {originalStats.UnusedSprites} to {newStats.UnusedSprites}");
            }

            result.IsValid = true;
            return result;
        }

        private void ValidatePlatformConfigurations(SpriteAtlas atlas, ValidationResult result)
        {
            foreach (var platformSetting in settings.PlatformSettings)
            {
                var platform = platformSetting.Key;
                var compressionSettings = platformSetting.Value;

                // Validate platform-specific settings
                if (compressionSettings.MaxTextureSize > 4096)
                {
                    result.AddWarning($"Platform {platform}: Texture size {compressionSettings.MaxTextureSize} may cause memory issues");
                }

                // Validate compression format compatibility
                if (!IsCompressionFormatSupported(platform, compressionSettings.DesktopFormat))
                {
                    result.AddError($"Platform {platform}: Compression format {compressionSettings.DesktopFormat} not supported");
                }
            }
        }

        private bool IsCompressionFormatSupported(BuildTarget platform, TextureFormat format)
        {
            // Simplified platform compatibility check
            switch (platform)
            {
                case BuildTarget.iOS:
                case BuildTarget.Android:
                    return format == TextureFormat.ASTC_6x6 || format == TextureFormat.ETC2_RGBA8;
                case BuildTarget.StandaloneWindows:
                case BuildTarget.StandaloneWindows64:
                    return format == TextureFormat.DXT1 || format == TextureFormat.DXT5;
                default:
                    return true;
            }
        }

        private List<Sprite> GatherAtlasSprites(SpriteAtlas atlas)
        {
            var sprites = new Sprite[atlas.spriteCount];
            atlas.GetSprites(sprites);
            return sprites.ToList();
        }

        #endregion
    }

    #region Supporting Classes

    public class SpriteUsageAnalyzer
    {
        public List<SpriteUsageData> AnalyzeUsage(List<Sprite> sprites)
        {
            var usageData = new List<SpriteUsageData>();

            foreach (var sprite in sprites)
            {
                var usage = new SpriteUsageData
                {
                    Sprite = sprite,
                    IsUsed = IsSpriteCUsedInProject(sprite),
                    UsageCount = CountSpriteReferences(sprite),
                    LastAccessTime = GetLastAccessTime(sprite)
                };

                usageData.Add(usage);
            }

            return usageData;
        }

        private bool IsSpriteCUsedInProject(Sprite sprite)
        {
            // Implementation would use Unity Editor APIs to search for sprite references
            // This is a simplified placeholder
            return true;
        }

        private int CountSpriteReferences(Sprite sprite)
        {
            // Count references in prefabs, scenes, and scripts
            return 1; // Placeholder
        }

        private DateTime GetLastAccessTime(Sprite sprite)
        {
            // Track when sprite was last accessed
            return DateTime.UtcNow; // Placeholder
        }
    }

    public class SpriteUsageData
    {
        public Sprite Sprite;
        public bool IsUsed;
        public int UsageCount;
        public DateTime LastAccessTime;
    }

    public class ValidationResult
    {
        public bool IsValid;
        public string Message;
        public List<string> Errors = new List<string>();
        public List<string> Warnings = new List<string>();
        public List<string> Successes = new List<string>();

        public void AddError(string error)
        {
            Errors.Add(error);
            IsValid = false;
        }

        public void AddWarning(string warning)
        {
            Warnings.Add(warning);
        }

        public void AddSuccess(string success)
        {
            Successes.Add(success);
        }
    }

    #endregion
}
```

### 3. Platform-Specific Optimization and Testing

#### 3.1 Cross-Platform Atlas Configuration

[[LLM: Design platform-specific atlas optimization strategies that account for hardware limitations, compression format support, and memory constraints across different devices. Include automated testing frameworks for validating atlas performance on target platforms.]]

**Platform-Specific Atlas Management**:

```csharp
// Assets/Scripts/Atlasing/PlatformAtlasConfiguration.cs
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace {{project_namespace}}.Atlasing
{
    /// <summary>
    /// Platform-specific atlas configuration and optimization system
    /// </summary>
    public class PlatformAtlasConfiguration : MonoBehaviour
    {
        [Header("Platform Detection")]
        [SerializeField] private bool enableAutomaticPlatformDetection = true;
        [SerializeField] private bool enableRuntimeOptimization = true;
        [SerializeField] private TargetPlatform forcePlatform = TargetPlatform.Auto;

        [Header("Configuration Profiles")]
        [SerializeField] private List<PlatformProfile> platformProfiles = new List<PlatformProfile>();

        [Header("Performance Monitoring")]
        [SerializeField] private bool enablePerformanceTracking = true;
        [SerializeField] private float performanceUpdateInterval = 10.0f;

        private TargetPlatform currentPlatform;
        private PlatformProfile activePlatformProfile;
        private PlatformPerformanceMonitor performanceMonitor;
        private AtlasConfigurationCache configurationCache;

        public static PlatformAtlasConfiguration Instance { get; private set; }

        public event Action<TargetPlatform> OnPlatformChanged;
        public event Action<PlatformProfile> OnProfileChanged;

        #region Unity Lifecycle

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                InitializePlatformConfiguration();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            if (enablePerformanceTracking)
            {
                performanceMonitor = new PlatformPerformanceMonitor();
                InvokeRepeating(nameof(UpdatePerformanceMetrics), performanceUpdateInterval, performanceUpdateInterval);
            }
        }

        #endregion

        #region Public API

        public PlatformProfile GetCurrentPlatformProfile()
        {
            return activePlatformProfile;
        }

        public AtlasCompressionSettings GetOptimalCompressionSettings(Vector2Int atlasSize)
        {
            if (activePlatformProfile == null)
            {
                return GetDefaultCompressionSettings();
            }

            var settings = activePlatformProfile.CompressionSettings.Clone();

            // Apply size-based optimizations
            OptimizeForAtlasSize(settings, atlasSize);

            // Apply memory constraints
            ApplyMemoryConstraints(settings);

            return settings;
        }

        public int GetOptimalAtlasSize(int desiredSize)
        {
            if (activePlatformProfile == null)
            {
                return Mathf.ClosestPowerOfTwo(desiredSize);
            }

            var constraints = activePlatformProfile.MemoryConstraints;
            int maxSize = constraints.MaxAtlasSize;

            // Apply platform-specific size limits
            int optimalSize = Mathf.Min(desiredSize, maxSize);
            return Mathf.ClosestPowerOfTwo(optimalSize);
        }

        public bool ShouldUseStreaming()
        {
            return activePlatformProfile?.StreamingSettings.EnableStreaming ?? false;
        }

        public TextureFormat GetOptimalTextureFormat(bool hasAlpha)
        {
            if (activePlatformProfile == null)
            {
                return hasAlpha ? TextureFormat.RGBA32 : TextureFormat.RGB24;
            }

            var compressionSettings = activePlatformProfile.CompressionSettings;

            switch (currentPlatform)
            {
                case TargetPlatform.Mobile:
                    return hasAlpha ? compressionSettings.MobileFormat : TextureFormat.ETC2_RGB4;
                case TargetPlatform.Desktop:
                    return hasAlpha ? compressionSettings.DesktopFormat : TextureFormat.DXT1;
                case TargetPlatform.Console:
                    return hasAlpha ? TextureFormat.DXT5 : TextureFormat.DXT1;
                case TargetPlatform.WebGL:
                    return hasAlpha ? TextureFormat.RGBA32 : TextureFormat.RGB24;
                default:
                    return hasAlpha ? TextureFormat.RGBA32 : TextureFormat.RGB24;
            }
        }

        public void ApplyPlatformOptimizations(SpriteAtlasManager atlasManager)
        {
            if (activePlatformProfile == null || !enableRuntimeOptimization)
            {
                return;
            }

            try
            {
                // Apply memory management settings
                ApplyMemoryManagement(atlasManager);

                // Apply loading optimizations
                ApplyLoadingOptimizations(atlasManager);

                // Apply quality settings
                ApplyQualitySettings();

                LogDebug($"Applied platform optimizations for {currentPlatform}");
            }
            catch (Exception ex)
            {
                LogError($"Failed to apply platform optimizations: {ex.Message}");
            }
        }

        public PlatformPerformanceReport GeneratePerformanceReport()
        {
            if (performanceMonitor == null)
            {
                return new PlatformPerformanceReport { IsValid = false };
            }

            return performanceMonitor.GenerateReport(currentPlatform, activePlatformProfile);
        }

        #endregion

        #region Platform Detection and Configuration

        private void InitializePlatformConfiguration()
        {
            DetectCurrentPlatform();
            LoadPlatformProfile();
            InitializeConfigurationCache();

            LogDebug($"Initialized platform configuration for {currentPlatform}");
        }

        private void DetectCurrentPlatform()
        {
            if (forcePlatform != TargetPlatform.Auto)
            {
                currentPlatform = forcePlatform;
                return;
            }

            if (!enableAutomaticPlatformDetection)
            {
                currentPlatform = TargetPlatform.Desktop;
                return;
            }

            currentPlatform = GetPlatformFromRuntimePlatform(Application.platform);

            // Additional hardware-based detection
            RefineplatformDetection();
        }

        private TargetPlatform GetPlatformFromRuntimePlatform(RuntimePlatform platform)
        {
            switch (platform)
            {
                case RuntimePlatform.Android:
                case RuntimePlatform.IPhonePlayer:
                    return TargetPlatform.Mobile;

                case RuntimePlatform.WindowsPlayer:
                case RuntimePlatform.OSXPlayer:
                case RuntimePlatform.LinuxPlayer:
                    return TargetPlatform.Desktop;

                case RuntimePlatform.PS4:
                case RuntimePlatform.PS5:
                case RuntimePlatform.XboxOne:
                case RuntimePlatform.GameCoreXboxOne:
                case RuntimePlatform.GameCoreXboxSeries:
                case RuntimePlatform.Switch:
                    return TargetPlatform.Console;

                case RuntimePlatform.WebGLPlayer:
                    return TargetPlatform.WebGL;

                default:
                    return TargetPlatform.Desktop;
            }
        }

        private void RefineplatformDetection()
        {
            // Check system memory for mobile detection refinement
            if (currentPlatform == TargetPlatform.Mobile)
            {
                var systemMemorySize = SystemInfo.systemMemorySize;
                if (systemMemorySize >= 6000) // 6GB+ RAM
                {
                    // High-end mobile device
                    LogDebug("Detected high-end mobile device");
                }
                else if (systemMemorySize <= 3000) // 3GB or less
                {
                    // Low-end mobile device
                    LogDebug("Detected low-end mobile device");
                }
            }

            // Check graphics memory
            var graphicsMemorySize = SystemInfo.graphicsMemorySize;
            LogDebug($"Graphics memory: {graphicsMemorySize}MB");
        }

        private void LoadPlatformProfile()
        {
            activePlatformProfile = platformProfiles.Find(p => p.TargetPlatform == currentPlatform);

            if (activePlatformProfile == null)
            {
                LogWarning($"No platform profile found for {currentPlatform}, using default");
                activePlatformProfile = CreateDefaultProfile();
            }

            OnProfileChanged?.Invoke(activePlatformProfile);
        }

        private PlatformProfile CreateDefaultProfile()
        {
            return new PlatformProfile
            {
                ProfileName = $"Default_{currentPlatform}",
                TargetPlatform = currentPlatform,
                CompressionSettings = GetDefaultCompressionSettings(),
                MemoryConstraints = GetDefaultMemoryConstraints(),
                StreamingSettings = GetDefaultStreamingSettings(),
                QualitySettings = GetDefaultQualitySettings()
            };
        }

        private void InitializeConfigurationCache()
        {
            configurationCache = new AtlasConfigurationCache();
            configurationCache.Initialize(activePlatformProfile);
        }

        #endregion

        #region Optimization Implementation

        private void OptimizeForAtlasSize(AtlasCompressionSettings settings, Vector2Int atlasSize)
        {
            int maxDimension = Mathf.Max(atlasSize.x, atlasSize.y);

            // Adjust compression quality based on atlas size
            if (maxDimension >= 2048)
            {
                settings.CompressionQuality = Mathf.Max(0.7f, settings.CompressionQuality - 0.1f);
            }
            else if (maxDimension <= 512)
            {
                settings.CompressionQuality = Mathf.Min(1.0f, settings.CompressionQuality + 0.1f);
            }

            // Adjust max texture size to fit within constraints
            int platformMaxSize = activePlatformProfile.MemoryConstraints.MaxAtlasSize;
            settings.MaxTextureSize = Mathf.Min(maxDimension, platformMaxSize);
        }

        private void ApplyMemoryConstraints(AtlasCompressionSettings settings)
        {
            var constraints = activePlatformProfile.MemoryConstraints;

            // Apply total memory budget
            if (constraints.MaxTotalMemoryMB > 0)
            {
                // Calculate current estimated memory usage
                float estimatedMemory = EstimateMemoryUsage(settings);

                if (estimatedMemory > constraints.MaxTotalMemoryMB)
                {
                    // Reduce quality to fit memory budget
                    settings.CompressionQuality *= (constraints.MaxTotalMemoryMB / estimatedMemory);
                    LogDebug($"Reduced compression quality to {settings.CompressionQuality:F2} to fit memory budget");
                }
            }
        }

        private float EstimateMemoryUsage(AtlasCompressionSettings settings)
        {
            // Simplified memory estimation
            int size = settings.MaxTextureSize;
            int bytesPerPixel = GetBytesPerPixel(settings.DesktopFormat);
            return (size * size * bytesPerPixel) / (1024f * 1024f);
        }

        private int GetBytesPerPixel(TextureFormat format)
        {
            switch (format)
            {
                case TextureFormat.RGBA32: return 4;
                case TextureFormat.RGB24: return 3;
                case TextureFormat.RGBA4444: return 2;
                case TextureFormat.DXT1: return 1;
                case TextureFormat.DXT5: return 1;
                case TextureFormat.ASTC_6x6: return 1;
                default: return 4;
            }
        }

        private void ApplyMemoryManagement(SpriteAtlasManager atlasManager)
        {
            var memorySettings = activePlatformProfile.MemoryConstraints;

            // Configure atlas manager for platform-specific memory management
            // This would involve setting appropriate cache sizes, unload delays, etc.
        }

        private void ApplyLoadingOptimizations(SpriteAtlasManager atlasManager)
        {
            var streamingSettings = activePlatformProfile.StreamingSettings;

            if (streamingSettings.EnableStreaming)
            {
                // Configure streaming parameters
                LogDebug("Enabled atlas streaming optimizations");
            }
        }

        private void ApplyQualitySettings()
        {
            var qualitySettings = activePlatformProfile.QualitySettings;

            // Apply quality-based settings
            QualitySettings.anisotropicFiltering = qualitySettings.AnisotropicFiltering;
        }

        #endregion

        #region Default Configurations

        private AtlasCompressionSettings GetDefaultCompressionSettings()
        {
            return new AtlasCompressionSettings
            {
                DesktopFormat = TextureFormat.DXT5,
                MobileFormat = TextureFormat.ASTC_6x6,
                MaxTextureSize = 2048,
                EnableMipmaps = false,
                FilterMode = FilterMode.Bilinear,
                CompressionQuality = 1.0f
            };
        }

        private MemoryConstraints GetDefaultMemoryConstraints()
        {
            return new MemoryConstraints
            {
                MaxAtlasSize = 2048,
                MaxTotalMemoryMB = 100,
                MaxConcurrentAtlases = 5,
                EnableMemoryProfiling = enablePerformanceTracking
            };
        }

        private StreamingSettings GetDefaultStreamingSettings()
        {
            return new StreamingSettings
            {
                EnableStreaming = currentPlatform == TargetPlatform.Mobile,
                StreamingBufferSizeMB = 20,
                PreloadDistanceUnits = 100
            };
        }

        private QualitySettings GetDefaultQualitySettings()
        {
            return new QualitySettings
            {
                AnisotropicFiltering = AnisotropicFiltering.Enable,
                TextureQualityLevel = 0,
                EnableHDR = currentPlatform != TargetPlatform.Mobile
            };
        }

        #endregion

        #region Performance Monitoring

        private void UpdatePerformanceMetrics()
        {
            if (performanceMonitor != null)
            {
                performanceMonitor.UpdateMetrics();
            }
        }

        #endregion

        #region Logging

        private void LogDebug(string message)
        {
            Debug.Log($"[PlatformAtlasConfiguration] {message}");
        }

        private void LogWarning(string message)
        {
            Debug.LogWarning($"[PlatformAtlasConfiguration] {message}");
        }

        private void LogError(string message)
        {
            Debug.LogError($"[PlatformAtlasConfiguration] {message}");
        }

        #endregion
    }

    #region Supporting Classes and Enums

    public enum TargetPlatform
    {
        Auto,
        Desktop,
        Mobile,
        Console,
        WebGL
    }

    [Serializable]
    public class PlatformProfile
    {
        [Header("Profile Identity")]
        public string ProfileName;
        public TargetPlatform TargetPlatform;
        public string Description;

        [Header("Configuration")]
        public AtlasCompressionSettings CompressionSettings;
        public MemoryConstraints MemoryConstraints;
        public StreamingSettings StreamingSettings;
        public QualitySettings QualitySettings;

        [Header("Advanced")]
        public bool EnableRuntimeOptimization = true;
        public float OptimizationAggressiveness = 1.0f;
    }

    [Serializable]
    public class MemoryConstraints
    {
        public int MaxAtlasSize = 2048;
        public float MaxTotalMemoryMB = 100;
        public int MaxConcurrentAtlases = 5;
        public bool EnableMemoryProfiling = true;
        public float MemoryWarningThreshold = 0.8f;
    }

    [Serializable]
    public class StreamingSettings
    {
        public bool EnableStreaming = false;
        public float StreamingBufferSizeMB = 20;
        public float PreloadDistanceUnits = 100;
        public int MaxStreamingRequests = 3;
    }

    [Serializable]
    public class QualitySettings
    {
        public AnisotropicFiltering AnisotropicFiltering = AnisotropicFiltering.Enable;
        public int TextureQualityLevel = 0;
        public bool EnableHDR = true;
        public bool EnableMSAA = false;
    }

    public class AtlasConfigurationCache
    {
        private Dictionary<string, AtlasCompressionSettings> cachedSettings = new Dictionary<string, AtlasCompressionSettings>();

        public void Initialize(PlatformProfile profile)
        {
            // Initialize cache with platform profile
        }

        public AtlasCompressionSettings GetCachedSettings(string key)
        {
            return cachedSettings.TryGetValue(key, out var settings) ? settings : null;
        }

        public void CacheSettings(string key, AtlasCompressionSettings settings)
        {
            cachedSettings[key] = settings;
        }
    }

    public class PlatformPerformanceMonitor
    {
        private List<PerformanceMetric> metrics = new List<PerformanceMetric>();

        public void UpdateMetrics()
        {
            var metric = new PerformanceMetric
            {
                Timestamp = DateTime.UtcNow,
                MemoryUsage = GetCurrentMemoryUsage(),
                FrameRate = GetCurrentFrameRate(),
                DrawCalls = GetCurrentDrawCalls()
            };

            metrics.Add(metric);

            // Keep only recent metrics
            if (metrics.Count > 100)
            {
                metrics.RemoveAt(0);
            }
        }

        public PlatformPerformanceReport GenerateReport(TargetPlatform platform, PlatformProfile profile)
        {
            return new PlatformPerformanceReport
            {
                Platform = platform,
                ProfileName = profile.ProfileName,
                AverageMemoryUsage = metrics.Average(m => m.MemoryUsage),
                AverageFrameRate = metrics.Average(m => m.FrameRate),
                AverageDrawCalls = metrics.Average(m => m.DrawCalls),
                MetricCount = metrics.Count,
                IsValid = true
            };
        }

        private float GetCurrentMemoryUsage()
        {
            return UnityEngine.Profiling.Profiler.GetTotalAllocatedMemory(UnityEngine.Profiling.Profiler.Area.Render) / (1024f * 1024f);
        }

        private float GetCurrentFrameRate()
        {
            return 1.0f / Time.unscaledDeltaTime;
        }

        private int GetCurrentDrawCalls()
        {
            return UnityEngine.Rendering.FrameDebugger.enabled ?
                UnityEngine.Rendering.FrameDebugger.GetFrameEventCount() : 0;
        }
    }

    public class PerformanceMetric
    {
        public DateTime Timestamp;
        public float MemoryUsage;
        public float FrameRate;
        public int DrawCalls;
    }

    public class PlatformPerformanceReport
    {
        public TargetPlatform Platform;
        public string ProfileName;
        public float AverageMemoryUsage;
        public float AverageFrameRate;
        public float AverageDrawCalls;
        public int MetricCount;
        public bool IsValid;
    }

    #endregion
}
```

## Success Criteria

This Unity Sprite Atlasing and Optimization Task provides:

- **Advanced Atlas Management**: Centralized system with runtime loading, memory optimization, and performance monitoring
- **Automated Optimization**: Intelligent atlas generation with packing efficiency analysis and unused sprite detection
- **Platform-Specific Configuration**: Comprehensive platform detection and optimization for mobile, desktop, console, and WebGL
- **Performance Monitoring**: Real-time tracking of memory usage, load times, and atlas efficiency
- **Memory Management**: Intelligent unloading, streaming support, and memory constraint handling
- **Production-Ready Code**: Comprehensive error handling, logging, and validation systems
- **Unity 2022.3 LTS Compliance**: Uses modern Unity APIs and best practices
- **BMAD Integration**: Follows BMAD patterns with extensive LLM directive blocks
- **Scalability**: Supports projects from small mobile games to large desktop applications
- **Documentation**: Extensive inline documentation and usage examples

## Integration Points

This task integrates with:

- `unity-2d-animation-setup.md` - Extends 2D animation workflows with optimized sprite atlasing
- `pixel-perfect-camera.md` - Ensures atlas optimization maintains pixel-perfect rendering
- `unity-addressables-advanced.md` - Integrates with addressable asset system for streaming
- `unity-package-setup.md` - Requires Unity 2D packages and proper project configuration
- `validate-2d-systems.md` - Provides validation tools for atlas configuration

## Notes

This sprite atlasing system provides a comprehensive solution for 2D sprite optimization in Unity, addressing both editor-time generation and runtime management challenges. The system scales from simple mobile games to complex multi-platform projects while maintaining optimal performance and memory usage.

The platform-specific optimization ensures that games perform well across different hardware configurations and platform constraints, while the automated optimization tools help developers maintain efficient atlas configurations throughout development.
