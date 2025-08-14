# Unity 2D Performance Profiling Task

## Purpose

To establish comprehensive 2D-specific performance profiling methodologies using Unity's Profiler API and custom profiling tools. This task focuses on identifying and resolving 2D game performance bottlenecks including sprite rendering, 2D physics, texture memory usage, and draw call optimization. Extends general performance monitoring to provide detailed 2D rendering pipeline analysis and optimization recommendations.

## Prerequisites

- Unity project with 2D rendering pipeline configured
- Unity 2D packages installed (2D Tilemap Extras, 2D Animation, 2D Lighting)
- 2D core systems implemented (sprites, physics, camera setup)
- Unity Profiler window accessible and development build capabilities
- Understanding of Unity's 2D rendering pipeline and draw call batching
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps for 2D profiling setup]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Unity Profiler Integration for 2D Systems

#### 1.1 2D-Specific Profiler Setup and Configuration

[[LLM: Analyze the project's 2D systems and configure Unity Profiler with custom sampling for 2D rendering, sprite management, and 2D physics. Set up automated profiling sessions that capture 2D-specific performance metrics during typical gameplay scenarios.]]

**2D Profiler Integration Framework**:

```csharp
// Assets/Scripts/Profiling/Unity2DProfiler.cs
using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Profiling;
using UnityEngine.Rendering;
using Unity.Profiling;

namespace {{project_namespace}}.Profiling
{
    /// <summary>
    /// Comprehensive 2D performance profiling system with Unity Profiler integration
    /// </summary>
    public class Unity2DProfiler : MonoBehaviour
    {
        [Header("Profiling Configuration")]
        [SerializeField] private bool enableAutoProfiler = true;
        [SerializeField] private bool enableDeepProfiling = false;
        [SerializeField] private float profilingSampleRate = 0.1f;
        [SerializeField] private int maxSampleCount = 1000;
        [SerializeField] private string profilingOutputPath = "Assets/ProfilingData/2D/";

        [Header("2D-Specific Monitoring")]
        [SerializeField] private bool monitorSpriteRendering = true;
        [SerializeField] private bool monitor2DPhysics = true;
        [SerializeField] private bool monitorTextureMemory = true;
        [SerializeField] private bool monitorDrawCalls = true;
        [SerializeField] private bool monitorBatching = true;

        [Header("Performance Thresholds")]
        [SerializeField] private int maxDrawCallsPerFrame = 50;
        [SerializeField] private float maxFrameTime = 16.67f; // 60 FPS
        [SerializeField] private int maxTextureMemoryMB = 256;
        [SerializeField] private int max2DPhysicsContacts = 100;

        private ProfilerRecorder frameTimeRecorder;
        private ProfilerRecorder drawCallsRecorder;
        private ProfilerRecorder batchesRecorder;
        private ProfilerRecorder textureMemoryRecorder;
        private ProfilerRecorder verticesRecorder;
        private ProfilerRecorder trianglesRecorder;

        private List<Performance2DSample> performanceSamples = new List<Performance2DSample>();
        private Performance2DAnalyzer analyzer;
        private Performance2DReporter reporter;

        private float lastSampleTime;
        private bool isProfilingActive = false;
        private int currentSampleIndex = 0;

        // Custom profiler markers for 2D systems
        private static readonly ProfilerMarker spriteRenderingMarker = new ProfilerMarker("2D.SpriteRendering");
        private static readonly ProfilerMarker physics2DMarker = new ProfilerMarker("2D.Physics");
        private static readonly ProfilerMarker atlasMarker = new ProfilerMarker("2D.Atlas");
        private static readonly ProfilerMarker batchingMarker = new ProfilerMarker("2D.Batching");

        public event Action<Performance2DReport> OnProfilingReportGenerated;
        public event Action<Performance2DWarning> OnPerformanceWarning;

        #region Unity Lifecycle

        private void Awake()
        {
            InitializeProfilers();
            analyzer = new Performance2DAnalyzer();
            reporter = new Performance2DReporter();

            ValidateOutputDirectory();
        }

        private void Start()
        {
            if (enableAutoProfiler)
            {
                StartProfiling();
            }
        }

        private void Update()
        {
            if (isProfilingActive && Time.time - lastSampleTime >= profilingSampleRate)
            {
                CaptureSample();
                lastSampleTime = Time.time;
            }

            MonitorRealTimeThresholds();
        }

        private void OnDestroy()
        {
            StopProfiling();
            DisposeProfilers();
        }

        #endregion

        #region Profiler Management

        private void InitializeProfilers()
        {
            try
            {
                frameTimeRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Internal, "Main Thread", 15);
                drawCallsRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Draw Calls Count");
                batchesRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Batches Count");
                textureMemoryRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "Texture Memory");
                verticesRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Vertices Count");
                trianglesRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Triangles Count");

                Debug.Log("[Unity2DProfiler] Profiler recorders initialized successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity2DProfiler] Failed to initialize profiler recorders: {ex.Message}");
                throw;
            }
        }

        private void DisposeProfilers()
        {
            frameTimeRecorder.Dispose();
            drawCallsRecorder.Dispose();
            batchesRecorder.Dispose();
            textureMemoryRecorder.Dispose();
            verticesRecorder.Dispose();
            trianglesRecorder.Dispose();
        }

        public void StartProfiling()
        {
            if (isProfilingActive)
            {
                Debug.LogWarning("[Unity2DProfiler] Profiling already active");
                return;
            }

            try
            {
                isProfilingActive = true;
                lastSampleTime = Time.time;
                currentSampleIndex = 0;
                performanceSamples.Clear();

                if (enableDeepProfiling)
                {
                    Profiler.enabled = true;
                    Profiler.enableBinaryLog = true;
                }

                Debug.Log("[Unity2DProfiler] 2D Performance profiling started");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity2DProfiler] Failed to start profiling: {ex.Message}");
                isProfilingActive = false;
                throw;
            }
        }

        public void StopProfiling()
        {
            if (!isProfilingActive)
            {
                Debug.LogWarning("[Unity2DProfiler] Profiling not active");
                return;
            }

            try
            {
                isProfilingActive = false;

                if (enableDeepProfiling)
                {
                    Profiler.enableBinaryLog = false;
                    Profiler.enabled = false;
                }

                GenerateProfilingReport();
                Debug.Log($"[Unity2DProfiler] Profiling stopped. Captured {performanceSamples.Count} samples");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity2DProfiler] Error stopping profiling: {ex.Message}");
            }
        }

        #endregion

        #region Sample Capture

        private void CaptureSample()
        {
            if (currentSampleIndex >= maxSampleCount)
            {
                StopProfiling();
                return;
            }

            try
            {
                var sample = new Performance2DSample
                {
                    Timestamp = Time.time,
                    FrameIndex = Time.frameCount,
                    FrameTime = GetFrameTime(),
                    DrawCalls = GetDrawCalls(),
                    Batches = GetBatches(),
                    TextureMemoryMB = GetTextureMemoryMB(),
                    Vertices = GetVertices(),
                    Triangles = GetTriangles(),
                    SpriteRenderingData = CaptureSpriteRenderingData(),
                    Physics2DData = Capture2DPhysicsData(),
                    BatchingData = CaptureBatchingData()
                };

                performanceSamples.Add(sample);
                currentSampleIndex++;

                // Analyze sample for immediate warnings
                CheckSampleThresholds(sample);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity2DProfiler] Error capturing sample: {ex.Message}");
            }
        }

        private float GetFrameTime()
        {
            return frameTimeRecorder.LastValue / 1000000.0f; // Convert nanoseconds to milliseconds
        }

        private int GetDrawCalls()
        {
            return (int)drawCallsRecorder.LastValue;
        }

        private int GetBatches()
        {
            return (int)batchesRecorder.LastValue;
        }

        private float GetTextureMemoryMB()
        {
            return textureMemoryRecorder.LastValue / (1024.0f * 1024.0f);
        }

        private int GetVertices()
        {
            return (int)verticesRecorder.LastValue;
        }

        private int GetTriangles()
        {
            return (int)trianglesRecorder.LastValue;
        }

        #endregion

        #region 2D-Specific Data Capture

        private SpriteRenderingData CaptureSpriteRenderingData()
        {
            if (!monitorSpriteRendering) return null;

            spriteRenderingMarker.Begin();

            try
            {
                var spriteRenderers = FindObjectsOfType<SpriteRenderer>();
                var data = new SpriteRenderingData
                {
                    TotalSpriteRenderers = spriteRenderers.Length,
                    VisibleSprites = 0,
                    UniqueTextures = new HashSet<Texture2D>(),
                    SpritesByLayer = new Dictionary<int, int>(),
                    OverdrawAreas = 0
                };

                foreach (var renderer in spriteRenderers)
                {
                    if (renderer.isVisible)
                    {
                        data.VisibleSprites++;

                        if (renderer.sprite != null && renderer.sprite.texture != null)
                        {
                            data.UniqueTextures.Add(renderer.sprite.texture);
                        }

                        var layer = renderer.sortingLayerID;
                        data.SpritesByLayer[layer] = data.SpritesByLayer.GetValueOrDefault(layer, 0) + 1;
                    }
                }

                data.UniqueTextureCount = data.UniqueTextures.Count;
                data.EstimatedOverdraw = CalculateOverdrawEstimate(spriteRenderers);

                return data;
            }
            finally
            {
                spriteRenderingMarker.End();
            }
        }

        private Physics2DData Capture2DPhysicsData()
        {
            if (!monitor2DPhysics) return null;

            physics2DMarker.Begin();

            try
            {
                var rigidbodies = FindObjectsOfType<Rigidbody2D>();
                var colliders = FindObjectsOfType<Collider2D>();

                var data = new Physics2DData
                {
                    ActiveRigidbodies = 0,
                    StaticColliders = 0,
                    DynamicColliders = 0,
                    TriggerColliders = 0,
                    ContactPoints = Physics2D.defaultContactOffset,
                    PhysicsStepTime = Time.fixedDeltaTime
                };

                foreach (var rb in rigidbodies)
                {
                    if (rb.gameObject.activeInHierarchy)
                    {
                        data.ActiveRigidbodies++;
                    }
                }

                foreach (var col in colliders)
                {
                    if (!col.gameObject.activeInHierarchy) continue;

                    if (col.isTrigger)
                    {
                        data.TriggerColliders++;
                    }
                    else if (col.attachedRigidbody == null || col.attachedRigidbody.bodyType == RigidbodyType2D.Static)
                    {
                        data.StaticColliders++;
                    }
                    else
                    {
                        data.DynamicColliders++;
                    }
                }

                return data;
            }
            finally
            {
                physics2DMarker.End();
            }
        }

        private BatchingData CaptureBatchingData()
        {
            if (!monitorBatching) return null;

            batchingMarker.Begin();

            try
            {
                var data = new BatchingData
                {
                    BatchBreaks = 0,
                    MaterialChanges = 0,
                    TextureChanges = 0,
                    ZOrderChanges = 0,
                    BatchableSprites = 0
                };

                // Analyze sprite renderers for batching potential
                var spriteRenderers = FindObjectsOfType<SpriteRenderer>();
                var lastMaterial = (Material)null;
                var lastTexture = (Texture2D)null;
                var lastSortingLayer = int.MinValue;
                var lastSortingOrder = int.MinValue;

                // Sort by rendering order to simulate Unity's batching analysis
                Array.Sort(spriteRenderers, (a, b) =>
                {
                    if (a.sortingLayerID != b.sortingLayerID)
                        return a.sortingLayerID.CompareTo(b.sortingLayerID);
                    return a.sortingOrder.CompareTo(b.sortingOrder);
                });

                foreach (var renderer in spriteRenderers)
                {
                    if (!renderer.isVisible) continue;

                    var currentMaterial = renderer.sharedMaterial;
                    var currentTexture = renderer.sprite?.texture;
                    var currentSortingLayer = renderer.sortingLayerID;
                    var currentSortingOrder = renderer.sortingOrder;

                    // Check for batch breaks
                    if (lastMaterial != null)
                    {
                        if (currentMaterial != lastMaterial)
                        {
                            data.MaterialChanges++;
                            data.BatchBreaks++;
                        }
                        else if (currentTexture != lastTexture)
                        {
                            data.TextureChanges++;
                            data.BatchBreaks++;
                        }
                        else if (currentSortingLayer != lastSortingLayer ||
                                Math.Abs(currentSortingOrder - lastSortingOrder) > 1)
                        {
                            data.ZOrderChanges++;
                            data.BatchBreaks++;
                        }
                        else
                        {
                            data.BatchableSprites++;
                        }
                    }

                    lastMaterial = currentMaterial;
                    lastTexture = currentTexture;
                    lastSortingLayer = currentSortingLayer;
                    lastSortingOrder = currentSortingOrder;
                }

                data.BatchingEfficiency = spriteRenderers.Length > 0 ?
                    (float)data.BatchableSprites / spriteRenderers.Length : 1.0f;

                return data;
            }
            finally
            {
                batchingMarker.End();
            }
        }

        private float CalculateOverdrawEstimate(SpriteRenderer[] renderers)
        {
            // Simplified overdraw calculation based on sprite bounds overlap
            float totalOverdraw = 0f;
            var camera = Camera.main;
            if (camera == null) return 0f;

            var screenBounds = new Bounds(camera.transform.position, new Vector3(
                camera.orthographicSize * 2 * camera.aspect,
                camera.orthographicSize * 2,
                0));

            for (int i = 0; i < renderers.Length; i++)
            {
                if (!renderers[i].isVisible) continue;

                var bounds1 = renderers[i].bounds;
                if (!screenBounds.Intersects(bounds1)) continue;

                for (int j = i + 1; j < renderers.Length; j++)
                {
                    if (!renderers[j].isVisible) continue;

                    var bounds2 = renderers[j].bounds;
                    if (bounds1.Intersects(bounds2))
                    {
                        var intersection = GetBoundsIntersection(bounds1, bounds2);
                        totalOverdraw += intersection.size.x * intersection.size.y;
                    }
                }
            }

            return totalOverdraw;
        }

        private Bounds GetBoundsIntersection(Bounds a, Bounds b)
        {
            var min = Vector3.Max(a.min, b.min);
            var max = Vector3.Min(a.max, b.max);

            if (min.x <= max.x && min.y <= max.y && min.z <= max.z)
            {
                var center = (min + max) * 0.5f;
                var size = max - min;
                return new Bounds(center, size);
            }

            return new Bounds();
        }

        #endregion

        #region Threshold Monitoring

        private void MonitorRealTimeThresholds()
        {
            if (!isProfilingActive) return;

            try
            {
                var currentFrameTime = GetFrameTime();
                var currentDrawCalls = GetDrawCalls();
                var currentTextureMemory = GetTextureMemoryMB();

                if (currentFrameTime > maxFrameTime)
                {
                    OnPerformanceWarning?.Invoke(new Performance2DWarning
                    {
                        Type = PerformanceWarningType.FrameTime,
                        Message = $"Frame time exceeded threshold: {currentFrameTime:F2}ms > {maxFrameTime:F2}ms",
                        CurrentValue = currentFrameTime,
                        ThresholdValue = maxFrameTime,
                        Severity = PerformanceWarningSeverity.High
                    });
                }

                if (currentDrawCalls > maxDrawCallsPerFrame)
                {
                    OnPerformanceWarning?.Invoke(new Performance2DWarning
                    {
                        Type = PerformanceWarningType.DrawCalls,
                        Message = $"Draw calls exceeded threshold: {currentDrawCalls} > {maxDrawCallsPerFrame}",
                        CurrentValue = currentDrawCalls,
                        ThresholdValue = maxDrawCallsPerFrame,
                        Severity = PerformanceWarningSeverity.Medium
                    });
                }

                if (currentTextureMemory > maxTextureMemoryMB)
                {
                    OnPerformanceWarning?.Invoke(new Performance2DWarning
                    {
                        Type = PerformanceWarningType.TextureMemory,
                        Message = $"Texture memory exceeded threshold: {currentTextureMemory:F1}MB > {maxTextureMemoryMB}MB",
                        CurrentValue = currentTextureMemory,
                        ThresholdValue = maxTextureMemoryMB,
                        Severity = PerformanceWarningSeverity.High
                    });
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity2DProfiler] Error monitoring thresholds: {ex.Message}");
            }
        }

        private void CheckSampleThresholds(Performance2DSample sample)
        {
            // Additional per-sample threshold checking logic
            if (sample.Physics2DData != null &&
                sample.Physics2DData.ActiveRigidbodies + sample.Physics2DData.DynamicColliders > max2DPhysicsContacts)
            {
                OnPerformanceWarning?.Invoke(new Performance2DWarning
                {
                    Type = PerformanceWarningType.Physics2D,
                    Message = $"2D Physics object count high: {sample.Physics2DData.ActiveRigidbodies + sample.Physics2DData.DynamicColliders}",
                    CurrentValue = sample.Physics2DData.ActiveRigidbodies + sample.Physics2DData.DynamicColliders,
                    ThresholdValue = max2DPhysicsContacts,
                    Severity = PerformanceWarningSeverity.Medium
                });
            }
        }

        #endregion

        #region Report Generation

        private void GenerateProfilingReport()
        {
            try
            {
                var report = analyzer.AnalyzePerformanceData(performanceSamples.ToArray());
                var reportPath = reporter.GenerateReport(report, profilingOutputPath);

                OnProfilingReportGenerated?.Invoke(report);

                Debug.Log($"[Unity2DProfiler] Performance report generated: {reportPath}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity2DProfiler] Failed to generate report: {ex.Message}");
            }
        }

        #endregion

        #region Utility Methods

        private void ValidateOutputDirectory()
        {
            try
            {
                if (!Directory.Exists(profilingOutputPath))
                {
                    Directory.CreateDirectory(profilingOutputPath);
                    Debug.Log($"[Unity2DProfiler] Created profiling output directory: {profilingOutputPath}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Unity2DProfiler] Failed to create output directory: {ex.Message}");
                profilingOutputPath = "Assets/"; // Fallback to Assets folder
            }
        }

        #endregion

        #region Public API

        public Performance2DSample[] GetPerformanceSamples()
        {
            return performanceSamples.ToArray();
        }

        public Performance2DReport GenerateCurrentReport()
        {
            return analyzer.AnalyzePerformanceData(performanceSamples.ToArray());
        }

        public void ClearSamples()
        {
            performanceSamples.Clear();
            currentSampleIndex = 0;
        }

        public void SetThresholds(int drawCalls, float frameTime, int textureMemoryMB, int physics2DContacts)
        {
            maxDrawCallsPerFrame = drawCalls;
            maxFrameTime = frameTime;
            maxTextureMemoryMB = textureMemoryMB;
            max2DPhysicsContacts = physics2DContacts;
        }

        #endregion
    }

    #region Data Structures

    [Serializable]
    public class Performance2DSample
    {
        public float Timestamp;
        public int FrameIndex;
        public float FrameTime;
        public int DrawCalls;
        public int Batches;
        public float TextureMemoryMB;
        public int Vertices;
        public int Triangles;
        public SpriteRenderingData SpriteRenderingData;
        public Physics2DData Physics2DData;
        public BatchingData BatchingData;
    }

    [Serializable]
    public class SpriteRenderingData
    {
        public int TotalSpriteRenderers;
        public int VisibleSprites;
        public int UniqueTextureCount;
        public HashSet<Texture2D> UniqueTextures;
        public Dictionary<int, int> SpritesByLayer;
        public float EstimatedOverdraw;
        public int OverdrawAreas;
    }

    [Serializable]
    public class Physics2DData
    {
        public int ActiveRigidbodies;
        public int StaticColliders;
        public int DynamicColliders;
        public int TriggerColliders;
        public float ContactPoints;
        public float PhysicsStepTime;
    }

    [Serializable]
    public class BatchingData
    {
        public int BatchBreaks;
        public int MaterialChanges;
        public int TextureChanges;
        public int ZOrderChanges;
        public int BatchableSprites;
        public float BatchingEfficiency;
    }

    [Serializable]
    public class Performance2DWarning
    {
        public PerformanceWarningType Type;
        public string Message;
        public float CurrentValue;
        public float ThresholdValue;
        public PerformanceWarningSeverity Severity;
        public DateTime Timestamp = DateTime.Now;
    }

    public enum PerformanceWarningType
    {
        FrameTime,
        DrawCalls,
        TextureMemory,
        Physics2D,
        Batching,
        Overdraw
    }

    public enum PerformanceWarningSeverity
    {
        Low,
        Medium,
        High,
        Critical
    }

    #endregion
}
```

### 2. Performance Analysis and Optimization Recommendations

#### 2.1 Automated Performance Analysis System

[[LLM: Create an intelligent analysis system that processes the captured performance data to identify bottlenecks, trends, and optimization opportunities specific to 2D rendering. Generate actionable recommendations based on the analysis results.]]

**2D Performance Analyzer**:

```csharp
// Assets/Scripts/Profiling/Performance2DAnalyzer.cs
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace {{project_namespace}}.Profiling
{
    /// <summary>
    /// Advanced analyzer for 2D performance data with intelligent optimization recommendations
    /// </summary>
    public class Performance2DAnalyzer
    {
        [Header("Analysis Configuration")]
        public float frameTimeTarget = 16.67f; // 60 FPS
        public int drawCallTarget = 50;
        public float batchingEfficiencyTarget = 0.8f;
        public float overdrawLimit = 0.1f;

        private readonly List<IPerformanceAnalysisRule> analysisRules;

        public Performance2DAnalyzer()
        {
            analysisRules = new List<IPerformanceAnalysisRule>
            {
                new FrameTimeAnalysisRule(),
                new DrawCallAnalysisRule(),
                new BatchingAnalysisRule(),
                new TextureMemoryAnalysisRule(),
                new Physics2DAnalysisRule(),
                new OverdrawAnalysisRule()
            };
        }

        public Performance2DReport AnalyzePerformanceData(Performance2DSample[] samples)
        {
            if (samples == null || samples.Length == 0)
            {
                throw new ArgumentException("No performance samples provided for analysis");
            }

            try
            {
                var report = new Performance2DReport
                {
                    GeneratedAt = DateTime.Now,
                    SampleCount = samples.Length,
                    AnalysisDuration = samples.Last().Timestamp - samples.First().Timestamp,
                    Summary = GeneratePerformanceSummary(samples),
                    DetailedAnalysis = new List<PerformanceAnalysisResult>(),
                    Recommendations = new List<OptimizationRecommendation>(),
                    TrendAnalysis = AnalyzeTrends(samples)
                };

                // Run all analysis rules
                foreach (var rule in analysisRules)
                {
                    try
                    {
                        var result = rule.Analyze(samples, this);
                        report.DetailedAnalysis.Add(result);

                        if (result.Recommendations != null)
                        {
                            report.Recommendations.AddRange(result.Recommendations);
                        }
                    }
                    catch (Exception ex)
                    {
                        Debug.LogError($"[Performance2DAnalyzer] Error in rule {rule.GetType().Name}: {ex.Message}");
                    }
                }

                // Sort recommendations by priority
                report.Recommendations.Sort((a, b) => b.Priority.CompareTo(a.Priority));

                // Generate overall score
                report.OverallPerformanceScore = CalculateOverallScore(report);

                return report;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Performance2DAnalyzer] Analysis failed: {ex.Message}");
                throw;
            }
        }

        private PerformanceSummary GeneratePerformanceSummary(Performance2DSample[] samples)
        {
            var frameTimes = samples.Select(s => s.FrameTime).ToArray();
            var drawCalls = samples.Select(s => s.DrawCalls).ToArray();
            var textureMemory = samples.Select(s => s.TextureMemoryMB).ToArray();

            return new PerformanceSummary
            {
                AverageFrameTime = frameTimes.Average(),
                MinFrameTime = frameTimes.Min(),
                MaxFrameTime = frameTimes.Max(),
                FrameTimeVariance = CalculateVariance(frameTimes),

                AverageDrawCalls = drawCalls.Average(),
                MinDrawCalls = drawCalls.Min(),
                MaxDrawCalls = drawCalls.Max(),

                AverageTextureMemory = textureMemory.Average(),
                MaxTextureMemory = textureMemory.Max(),

                FramesAboveTarget = frameTimes.Count(ft => ft > frameTimeTarget),
                PercentFramesAboveTarget = (float)frameTimes.Count(ft => ft > frameTimeTarget) / frameTimes.Length * 100f
            };
        }

        private TrendAnalysis AnalyzeTrends(Performance2DSample[] samples)
        {
            const int windowSize = 10;

            var frameTimeTrend = CalculateTrend(samples.Select(s => s.FrameTime).ToArray(), windowSize);
            var drawCallTrend = CalculateTrend(samples.Select(s => (float)s.DrawCalls).ToArray(), windowSize);
            var memoryTrend = CalculateTrend(samples.Select(s => s.TextureMemoryMB).ToArray(), windowSize);

            return new TrendAnalysis
            {
                FrameTimeTrend = frameTimeTrend,
                DrawCallTrend = drawCallTrend,
                MemoryTrend = memoryTrend,
                TrendAnalysisConfidence = CalculateTrendConfidence(samples.Length, windowSize)
            };
        }

        private TrendDirection CalculateTrend(float[] values, int windowSize)
        {
            if (values.Length < windowSize * 2) return TrendDirection.Stable;

            var firstWindowAvg = values.Take(windowSize).Average();
            var lastWindowAvg = values.Skip(values.Length - windowSize).Average();

            var change = (lastWindowAvg - firstWindowAvg) / firstWindowAvg;

            if (change > 0.1f) return TrendDirection.Increasing;
            if (change < -0.1f) return TrendDirection.Decreasing;
            return TrendDirection.Stable;
        }

        private float CalculateVariance(float[] values)
        {
            var mean = values.Average();
            return values.Sum(v => Mathf.Pow(v - mean, 2)) / values.Length;
        }

        private float CalculateTrendConfidence(int sampleCount, int windowSize)
        {
            return Mathf.Clamp01((float)(sampleCount - windowSize) / (windowSize * 2));
        }

        private float CalculateOverallScore(Performance2DReport report)
        {
            float score = 100f;

            // Deduct points for performance issues
            if (report.Summary.PercentFramesAboveTarget > 0)
            {
                score -= report.Summary.PercentFramesAboveTarget * 0.5f;
            }

            // Deduct for high priority recommendations
            foreach (var rec in report.Recommendations)
            {
                switch (rec.Priority)
                {
                    case OptimizationPriority.Critical:
                        score -= 15f;
                        break;
                    case OptimizationPriority.High:
                        score -= 10f;
                        break;
                    case OptimizationPriority.Medium:
                        score -= 5f;
                        break;
                    case OptimizationPriority.Low:
                        score -= 2f;
                        break;
                }
            }

            return Mathf.Max(0f, score);
        }
    }

    #region Analysis Rules

    public interface IPerformanceAnalysisRule
    {
        PerformanceAnalysisResult Analyze(Performance2DSample[] samples, Performance2DAnalyzer analyzer);
    }

    public class FrameTimeAnalysisRule : IPerformanceAnalysisRule
    {
        public PerformanceAnalysisResult Analyze(Performance2DSample[] samples, Performance2DAnalyzer analyzer)
        {
            var frameTimes = samples.Select(s => s.FrameTime).ToArray();
            var avgFrameTime = frameTimes.Average();
            var maxFrameTime = frameTimes.Max();
            var framesAboveTarget = frameTimes.Count(ft => ft > analyzer.frameTimeTarget);

            var result = new PerformanceAnalysisResult
            {
                Category = "Frame Time Analysis",
                Status = avgFrameTime <= analyzer.frameTimeTarget ? AnalysisStatus.Good : AnalysisStatus.Warning,
                Details = $"Average: {avgFrameTime:F2}ms, Max: {maxFrameTime:F2}ms, Target: {analyzer.frameTimeTarget:F2}ms",
                Recommendations = new List<OptimizationRecommendation>()
            };

            if (framesAboveTarget > samples.Length * 0.1f) // More than 10% of frames above target
            {
                result.Status = AnalysisStatus.Critical;
                result.Recommendations.Add(new OptimizationRecommendation
                {
                    Title = "Frame Time Optimization Required",
                    Description = $"{framesAboveTarget} frames ({(float)framesAboveTarget/samples.Length*100:F1}%) exceeded target frame time",
                    Priority = OptimizationPriority.High,
                    Category = OptimizationCategory.Performance,
                    Actions = new[]
                    {
                        "Reduce draw calls through sprite atlasing",
                        "Optimize 2D physics collision detection",
                        "Implement object pooling for frequently spawned objects",
                        "Profile shader performance and complexity"
                    }
                });
            }

            return result;
        }
    }

    public class DrawCallAnalysisRule : IPerformanceAnalysisRule
    {
        public PerformanceAnalysisResult Analyze(Performance2DSample[] samples, Performance2DAnalyzer analyzer)
        {
            var drawCalls = samples.Select(s => s.DrawCalls).ToArray();
            var avgDrawCalls = drawCalls.Average();
            var maxDrawCalls = drawCalls.Max();

            var result = new PerformanceAnalysisResult
            {
                Category = "Draw Call Analysis",
                Status = avgDrawCalls <= analyzer.drawCallTarget ? AnalysisStatus.Good : AnalysisStatus.Warning,
                Details = $"Average: {avgDrawCalls:F1}, Max: {maxDrawCalls}, Target: {analyzer.drawCallTarget}",
                Recommendations = new List<OptimizationRecommendation>()
            };

            if (avgDrawCalls > analyzer.drawCallTarget * 1.5f)
            {
                result.Status = AnalysisStatus.Critical;
                result.Recommendations.Add(new OptimizationRecommendation
                {
                    Title = "Reduce Draw Calls",
                    Description = $"Draw calls ({avgDrawCalls:F1}) significantly exceed target ({analyzer.drawCallTarget})",
                    Priority = OptimizationPriority.High,
                    Category = OptimizationCategory.Rendering,
                    Actions = new[]
                    {
                        "Implement sprite atlasing to combine textures",
                        "Use consistent materials across sprites",
                        "Optimize sorting layers to reduce state changes",
                        "Consider using sprite batching techniques"
                    }
                });
            }

            return result;
        }
    }

    public class BatchingAnalysisRule : IPerformanceAnalysisRule
    {
        public PerformanceAnalysisResult Analyze(Performance2DSample[] samples, Performance2DAnalyzer analyzer)
        {
            var batchingData = samples.Where(s => s.BatchingData != null).Select(s => s.BatchingData).ToArray();
            if (batchingData.Length == 0)
            {
                return new PerformanceAnalysisResult
                {
                    Category = "Batching Analysis",
                    Status = AnalysisStatus.NoData,
                    Details = "No batching data available"
                };
            }

            var avgEfficiency = batchingData.Average(b => b.BatchingEfficiency);
            var avgBatchBreaks = batchingData.Average(b => b.BatchBreaks);

            var result = new PerformanceAnalysisResult
            {
                Category = "Batching Analysis",
                Status = avgEfficiency >= analyzer.batchingEfficiencyTarget ? AnalysisStatus.Good : AnalysisStatus.Warning,
                Details = $"Efficiency: {avgEfficiency:P1}, Avg Batch Breaks: {avgBatchBreaks:F1}",
                Recommendations = new List<OptimizationRecommendation>()
            };

            if (avgEfficiency < analyzer.batchingEfficiencyTarget * 0.7f)
            {
                result.Status = AnalysisStatus.Critical;
                result.Recommendations.Add(new OptimizationRecommendation
                {
                    Title = "Improve Sprite Batching",
                    Description = $"Batching efficiency ({avgEfficiency:P1}) is below optimal threshold",
                    Priority = OptimizationPriority.Medium,
                    Category = OptimizationCategory.Rendering,
                    Actions = new[]
                    {
                        "Group sprites by material and texture",
                        "Minimize sorting order changes",
                        "Use consistent shader and material properties",
                        "Consider dynamic batching optimization"
                    }
                });
            }

            return result;
        }
    }

    public class TextureMemoryAnalysisRule : IPerformanceAnalysisRule
    {
        public PerformanceAnalysisResult Analyze(Performance2DSample[] samples, Performance2DAnalyzer analyzer)
        {
            var textureMemory = samples.Select(s => s.TextureMemoryMB).ToArray();
            var avgMemory = textureMemory.Average();
            var maxMemory = textureMemory.Max();
            var memoryGrowth = textureMemory.Last() - textureMemory.First();

            var result = new PerformanceAnalysisResult
            {
                Category = "Texture Memory Analysis",
                Status = maxMemory <= 256f ? AnalysisStatus.Good : AnalysisStatus.Warning,
                Details = $"Average: {avgMemory:F1}MB, Max: {maxMemory:F1}MB, Growth: {memoryGrowth:F1}MB",
                Recommendations = new List<OptimizationRecommendation>()
            };

            if (maxMemory > 512f || memoryGrowth > 50f)
            {
                result.Status = AnalysisStatus.Critical;
                result.Recommendations.Add(new OptimizationRecommendation
                {
                    Title = "Optimize Texture Memory Usage",
                    Description = $"High texture memory usage detected: {maxMemory:F1}MB peak",
                    Priority = OptimizationPriority.High,
                    Category = OptimizationCategory.Memory,
                    Actions = new[]
                    {
                        "Compress textures appropriately for platform",
                        "Use texture atlasing to reduce memory fragmentation",
                        "Implement texture streaming for large textures",
                        "Remove unused textures from build"
                    }
                });
            }

            return result;
        }
    }

    public class Physics2DAnalysisRule : IPerformanceAnalysisRule
    {
        public PerformanceAnalysisResult Analyze(Performance2DSample[] samples, Performance2DAnalyzer analyzer)
        {
            var physics2DData = samples.Where(s => s.Physics2DData != null).Select(s => s.Physics2DData).ToArray();
            if (physics2DData.Length == 0)
            {
                return new PerformanceAnalysisResult
                {
                    Category = "2D Physics Analysis",
                    Status = AnalysisStatus.NoData,
                    Details = "No 2D physics data available"
                };
            }

            var avgRigidbodies = physics2DData.Average(p => p.ActiveRigidbodies);
            var avgColliders = physics2DData.Average(p => p.DynamicColliders + p.StaticColliders);
            var maxPhysicsObjects = physics2DData.Max(p => p.ActiveRigidbodies + p.DynamicColliders);

            var result = new PerformanceAnalysisResult
            {
                Category = "2D Physics Analysis",
                Status = maxPhysicsObjects <= 100 ? AnalysisStatus.Good : AnalysisStatus.Warning,
                Details = $"Avg Rigidbodies: {avgRigidbodies:F1}, Avg Colliders: {avgColliders:F1}, Max Objects: {maxPhysicsObjects}",
                Recommendations = new List<OptimizationRecommendation>()
            };

            if (maxPhysicsObjects > 200)
            {
                result.Status = AnalysisStatus.Critical;
                result.Recommendations.Add(new OptimizationRecommendation
                {
                    Title = "Optimize 2D Physics Complexity",
                    Description = $"High number of physics objects detected: {maxPhysicsObjects}",
                    Priority = OptimizationPriority.Medium,
                    Category = OptimizationCategory.Physics,
                    Actions = new[]
                    {
                        "Use composite colliders for complex static geometry",
                        "Implement physics object pooling",
                        "Optimize collision layers and matrix",
                        "Consider using triggers instead of colliders where appropriate"
                    }
                });
            }

            return result;
        }
    }

    public class OverdrawAnalysisRule : IPerformanceAnalysisRule
    {
        public PerformanceAnalysisRule Analyze(Performance2DSample[] samples, Performance2DAnalyzer analyzer)
        {
            var spriteData = samples.Where(s => s.SpriteRenderingData != null).Select(s => s.SpriteRenderingData).ToArray();
            if (spriteData.Length == 0)
            {
                return new PerformanceAnalysisResult
                {
                    Category = "Overdraw Analysis",
                    Status = AnalysisStatus.NoData,
                    Details = "No sprite rendering data available"
                };
            }

            var avgOverdraw = spriteData.Average(s => s.EstimatedOverdraw);
            var maxOverdraw = spriteData.Max(s => s.EstimatedOverdraw);

            var result = new PerformanceAnalysisResult
            {
                Category = "Overdraw Analysis",
                Status = avgOverdraw <= analyzer.overdrawLimit ? AnalysisStatus.Good : AnalysisStatus.Warning,
                Details = $"Average Overdraw: {avgOverdraw:F3}, Max: {maxOverdraw:F3}, Limit: {analyzer.overdrawLimit:F3}",
                Recommendations = new List<OptimizationRecommendation>()
            };

            if (avgOverdraw > analyzer.overdrawLimit * 2)
            {
                result.Status = AnalysisStatus.Critical;
                result.Recommendations.Add(new OptimizationRecommendation
                {
                    Title = "Reduce Sprite Overdraw",
                    Description = $"High overdraw detected: {avgOverdraw:F3} average",
                    Priority = OptimizationPriority.Medium,
                    Category = OptimizationCategory.Rendering,
                    Actions = new[]
                    {
                        "Optimize sprite sorting to minimize overlap",
                        "Use occlusion culling for layered sprites",
                        "Trim transparent areas from sprite textures",
                        "Consider using mesh-based rendering for complex shapes"
                    }
                });
            }

            return result;
        }
    }

    #endregion

    #region Data Structures

    [Serializable]
    public class Performance2DReport
    {
        public DateTime GeneratedAt;
        public int SampleCount;
        public float AnalysisDuration;
        public float OverallPerformanceScore;
        public PerformanceSummary Summary;
        public List<PerformanceAnalysisResult> DetailedAnalysis;
        public List<OptimizationRecommendation> Recommendations;
        public TrendAnalysis TrendAnalysis;
    }

    [Serializable]
    public class PerformanceSummary
    {
        public float AverageFrameTime;
        public float MinFrameTime;
        public float MaxFrameTime;
        public float FrameTimeVariance;
        public float AverageDrawCalls;
        public float MinDrawCalls;
        public float MaxDrawCalls;
        public float AverageTextureMemory;
        public float MaxTextureMemory;
        public int FramesAboveTarget;
        public float PercentFramesAboveTarget;
    }

    [Serializable]
    public class PerformanceAnalysisResult
    {
        public string Category;
        public AnalysisStatus Status;
        public string Details;
        public List<OptimizationRecommendation> Recommendations;
    }

    [Serializable]
    public class OptimizationRecommendation
    {
        public string Title;
        public string Description;
        public OptimizationPriority Priority;
        public OptimizationCategory Category;
        public string[] Actions;
        public float EstimatedImpact; // 0-1 scale
    }

    [Serializable]
    public class TrendAnalysis
    {
        public TrendDirection FrameTimeTrend;
        public TrendDirection DrawCallTrend;
        public TrendDirection MemoryTrend;
        public float TrendAnalysisConfidence;
    }

    public enum AnalysisStatus
    {
        Good,
        Warning,
        Critical,
        NoData
    }

    public enum OptimizationPriority
    {
        Low,
        Medium,
        High,
        Critical
    }

    public enum OptimizationCategory
    {
        Performance,
        Rendering,
        Memory,
        Physics,
        Batching
    }

    public enum TrendDirection
    {
        Decreasing,
        Stable,
        Increasing
    }

    #endregion
}
```

### 3. Report Generation and Visualization

#### 3.1 Comprehensive Performance Report System

[[LLM: Design a comprehensive reporting system that generates detailed performance reports with visualizations, optimization suggestions, and actionable improvement plans. Include both HTML and Unity-native report formats for different stakeholders.]]

**Performance Report Generator**:

```csharp
// Assets/Scripts/Profiling/Performance2DReporter.cs
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEngine;

namespace {{project_namespace}}.Profiling
{
    /// <summary>
    /// Generates comprehensive 2D performance reports with visualizations and recommendations
    /// </summary>
    public class Performance2DReporter
    {
        private const string HTML_TEMPLATE = @"
<!DOCTYPE html>
<html>
<head>
    <title>Unity 2D Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #4CAF50; padding-bottom: 10px; margin-bottom: 20px; }
        .score { font-size: 48px; font-weight: bold; text-align: center; margin: 20px 0; }
        .score.good { color: #4CAF50; }
        .score.warning { color: #FF9800; }
        .score.critical { color: #F44336; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #4CAF50; background-color: #f9f9f9; }
        .warning { border-left-color: #FF9800; }
        .critical { border-left-color: #F44336; }
        .recommendations { background-color: #E3F2FD; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .chart-container { width: 100%; height: 300px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #4CAF50; color: white; }
        .priority-high { color: #F44336; font-weight: bold; }
        .priority-medium { color: #FF9800; font-weight: bold; }
        .priority-low { color: #4CAF50; }
    </style>
    <script src='https://cdn.plot.ly/plotly-latest.min.js'></script>
</head>
<body>
    <div class='container'>
        {REPORT_CONTENT}
    </div>
    <script>
        {CHART_SCRIPTS}
    </script>
</body>
</html>";

        public string GenerateReport(Performance2DReport report, string outputPath)
        {
            try
            {
                var htmlContent = GenerateHTMLReport(report);
                var fileName = $"2D_Performance_Report_{DateTime.Now:yyyyMMdd_HHmmss}.html";
                var fullPath = Path.Combine(outputPath, fileName);

                File.WriteAllText(fullPath, htmlContent);

                // Also generate JSON report for programmatic access
                var jsonReport = JsonUtility.ToJson(report, true);
                var jsonPath = Path.Combine(outputPath, fileName.Replace(".html", ".json"));
                File.WriteAllText(jsonPath, jsonReport);

                Debug.Log($"[Performance2DReporter] Reports generated: {fullPath}, {jsonPath}");
                return fullPath;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Performance2DReporter] Failed to generate report: {ex.Message}");
                throw;
            }
        }

        private string GenerateHTMLReport(Performance2DReport report)
        {
            var content = new StringBuilder();
            var charts = new StringBuilder();

            // Header
            content.AppendLine("<div class='header'>");
            content.AppendLine($"<h1>Unity 2D Performance Report</h1>");
            content.AppendLine($"<p>Generated: {report.GeneratedAt:yyyy-MM-dd HH:mm:ss}</p>");
            content.AppendLine($"<p>Samples: {report.SampleCount} | Duration: {report.AnalysisDuration:F1}s</p>");
            content.AppendLine("</div>");

            // Overall Score
            var scoreClass = GetScoreClass(report.OverallPerformanceScore);
            content.AppendLine($"<div class='score {scoreClass}'>");
            content.AppendLine($"Performance Score: {report.OverallPerformanceScore:F1}/100");
            content.AppendLine("</div>");

            // Performance Summary
            GeneratePerformanceSummary(content, report.Summary);

            // Charts
            GeneratePerformanceCharts(charts, report);

            // Detailed Analysis
            GenerateDetailedAnalysis(content, report.DetailedAnalysis);

            // Recommendations
            GenerateRecommendations(content, report.Recommendations);

            // Trend Analysis
            GenerateTrendAnalysis(content, report.TrendAnalysis);

            return HTML_TEMPLATE
                .Replace("{REPORT_CONTENT}", content.ToString())
                .Replace("{CHART_SCRIPTS}", charts.ToString());
        }

        private void GeneratePerformanceSummary(StringBuilder content, PerformanceSummary summary)
        {
            content.AppendLine("<div class='section'>");
            content.AppendLine("<h2>Performance Summary</h2>");
            content.AppendLine("<table>");
            content.AppendLine("<tr><th>Metric</th><th>Average</th><th>Min</th><th>Max</th><th>Status</th></tr>");

            var frameTimeStatus = summary.AverageFrameTime <= 16.67f ? "Good" : "Warning";
            content.AppendLine($"<tr><td>Frame Time (ms)</td><td>{summary.AverageFrameTime:F2}</td><td>{summary.MinFrameTime:F2}</td><td>{summary.MaxFrameTime:F2}</td><td class='{frameTimeStatus.ToLower()}'>{frameTimeStatus}</td></tr>");

            var drawCallStatus = summary.AverageDrawCalls <= 50 ? "Good" : "Warning";
            content.AppendLine($"<tr><td>Draw Calls</td><td>{summary.AverageDrawCalls:F1}</td><td>{summary.MinDrawCalls:F1}</td><td>{summary.MaxDrawCalls:F1}</td><td class='{drawCallStatus.ToLower()}'>{drawCallStatus}</td></tr>");

            var memoryStatus = summary.MaxTextureMemory <= 256 ? "Good" : "Warning";
            content.AppendLine($"<tr><td>Texture Memory (MB)</td><td>{summary.AverageTextureMemory:F1}</td><td>-</td><td>{summary.MaxTextureMemory:F1}</td><td class='{memoryStatus.ToLower()}'>{memoryStatus}</td></tr>");

            content.AppendLine("</table>");

            if (summary.PercentFramesAboveTarget > 0)
            {
                var warningClass = summary.PercentFramesAboveTarget > 10 ? "critical" : "warning";
                content.AppendLine($"<div class='section {warningClass}'>");
                content.AppendLine($"<strong>Performance Warning:</strong> {summary.FramesAboveTarget} frames ({summary.PercentFramesAboveTarget:F1}%) exceeded target frame time");
                content.AppendLine("</div>");
            }

            content.AppendLine("</div>");
        }

        private void GeneratePerformanceCharts(StringBuilder charts, Performance2DReport report)
        {
            // Frame Time Chart
            charts.AppendLine(@"
var frameTimeData = [{
    x: [/* frame indices */],
    y: [/* frame times */],
    type: 'scatter',
    mode: 'lines',
    name: 'Frame Time',
    line: { color: '#4CAF50' }
}];

var frameTimeLayout = {
    title: 'Frame Time Over Time',
    xaxis: { title: 'Frame' },
    yaxis: { title: 'Time (ms)' }
};

Plotly.newPlot('frameTimeChart', frameTimeData, frameTimeLayout);");

            // Draw Calls Chart
            charts.AppendLine(@"
var drawCallData = [{
    x: [/* frame indices */],
    y: [/* draw calls */],
    type: 'scatter',
    mode: 'lines',
    name: 'Draw Calls',
    line: { color: '#FF9800' }
}];

var drawCallLayout = {
    title: 'Draw Calls Over Time',
    xaxis: { title: 'Frame' },
    yaxis: { title: 'Draw Calls' }
};

Plotly.newPlot('drawCallChart', drawCallData, drawCallLayout);");
        }

        private void GenerateDetailedAnalysis(StringBuilder content, List<PerformanceAnalysisResult> analysis)
        {
            content.AppendLine("<div class='section'>");
            content.AppendLine("<h2>Detailed Analysis</h2>");

            foreach (var result in analysis)
            {
                var sectionClass = result.Status.ToString().ToLower();
                content.AppendLine($"<div class='section {sectionClass}'>");
                content.AppendLine($"<h3>{result.Category}</h3>");
                content.AppendLine($"<p><strong>Status:</strong> {result.Status}</p>");
                content.AppendLine($"<p>{result.Details}</p>");
                content.AppendLine("</div>");
            }

            content.AppendLine("</div>");
        }

        private void GenerateRecommendations(StringBuilder content, List<OptimizationRecommendation> recommendations)
        {
            content.AppendLine("<div class='section'>");
            content.AppendLine("<h2>Optimization Recommendations</h2>");

            if (recommendations.Count == 0)
            {
                content.AppendLine("<p>No specific optimizations needed. Performance is within acceptable parameters.</p>");
            }
            else
            {
                foreach (var rec in recommendations)
                {
                    var priorityClass = rec.Priority.ToString().ToLower();
                    content.AppendLine("<div class='recommendations'>");
                    content.AppendLine($"<h3 class='priority-{priorityClass}'>{rec.Title} ({rec.Priority} Priority)</h3>");
                    content.AppendLine($"<p><strong>Category:</strong> {rec.Category}</p>");
                    content.AppendLine($"<p>{rec.Description}</p>");

                    if (rec.Actions != null && rec.Actions.Length > 0)
                    {
                        content.AppendLine("<h4>Recommended Actions:</h4>");
                        content.AppendLine("<ul>");
                        foreach (var action in rec.Actions)
                        {
                            content.AppendLine($"<li>{action}</li>");
                        }
                        content.AppendLine("</ul>");
                    }

                    content.AppendLine("</div>");
                }
            }

            content.AppendLine("</div>");
        }

        private void GenerateTrendAnalysis(StringBuilder content, TrendAnalysis trends)
        {
            content.AppendLine("<div class='section'>");
            content.AppendLine("<h2>Trend Analysis</h2>");
            content.AppendLine($"<p><strong>Analysis Confidence:</strong> {trends.TrendAnalysisConfidence:P0}</p>");
            content.AppendLine("<table>");
            content.AppendLine("<tr><th>Metric</th><th>Trend</th><th>Interpretation</th></tr>");

            content.AppendLine($"<tr><td>Frame Time</td><td>{trends.FrameTimeTrend}</td><td>{GetTrendInterpretation(trends.FrameTimeTrend, "frame time")}</td></tr>");
            content.AppendLine($"<tr><td>Draw Calls</td><td>{trends.DrawCallTrend}</td><td>{GetTrendInterpretation(trends.DrawCallTrend, "draw calls")}</td></tr>");
            content.AppendLine($"<tr><td>Memory Usage</td><td>{trends.MemoryTrend}</td><td>{GetTrendInterpretation(trends.MemoryTrend, "memory usage")}</td></tr>");

            content.AppendLine("</table>");
            content.AppendLine("</div>");
        }

        private string GetScoreClass(float score)
        {
            if (score >= 80) return "good";
            if (score >= 60) return "warning";
            return "critical";
        }

        private string GetTrendInterpretation(TrendDirection trend, string metric)
        {
            switch (trend)
            {
                case TrendDirection.Increasing:
                    return $"Increasing {metric} may indicate growing performance concerns";
                case TrendDirection.Decreasing:
                    return $"Decreasing {metric} indicates improving performance";
                case TrendDirection.Stable:
                    return $"Stable {metric} indicates consistent performance";
                default:
                    return "Unknown trend";
            }
        }
    }
}
```

## Success Criteria

This Unity 2D Performance Profiling Task provides:

- **Comprehensive Profiling**: Unity Profiler API integration with 2D-specific metrics capture
- **Automated Analysis**: Intelligent performance analysis with bottleneck identification
- **Actionable Recommendations**: Specific optimization suggestions based on analysis results
- **Trend Monitoring**: Long-term performance trend analysis and prediction
- **Professional Reporting**: HTML and JSON reports with visualizations and detailed insights
- **Real-time Monitoring**: Live performance threshold monitoring with warnings
- **Production Ready**: Error handling, performance optimization, and Unity best practices
- **Integration Support**: Seamless integration with Unity 2D workflow and development pipeline

## Integration Points

This task integrates with:

- `unity-2d-workflow.yaml` - 2D optimization phase (line 61)
- `sprite-atlasing.md` - Complements sprite optimization efforts
- `2d-physics-setup.md` - Provides physics performance validation
- `pixel-perfect-camera.md` - Validates camera performance impact

## Notes

This 2D performance profiling system provides comprehensive monitoring and analysis specifically designed for Unity 2D games. It captures detailed metrics about sprite rendering, 2D physics, texture memory usage, and batching efficiency while providing actionable optimization recommendations based on the analysis results.

The system is designed to be used throughout the development cycle to maintain optimal performance and identify issues before they impact the final product.
