using UnityEngine;
using UnityEditor;
using Unity.Profiling;
using Unity.Profiling.Editor;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine.TestTools;
using NUnit.Framework;
using System;

namespace BMAD.Unity.ProfilerAutomation
{
    /// <summary>
    /// Unity Profiler API automation framework for automated performance testing and validation
    /// Provides enterprise-grade performance monitoring, threshold enforcement, and CI/CD integration
    /// Part of BMAD Unity expansion pack Priority 3 implementation
    /// </summary>
    public static class UnityProfilerIntegrationManager
    {
        #region Performance Thresholds Configuration
        
        /// <summary>
        /// Platform-specific performance thresholds for automated validation
        /// </summary>
        [System.Serializable]
        public struct PerformanceThresholds
        {
            public string platformName;
            public float maxFrameTimeMs;        // Maximum frame time in milliseconds
            public float minTargetFPS;          // Minimum target FPS
            public long maxMemoryUsageMB;       // Maximum memory usage in MB
            public long maxGCAllocPerFrame;     // Maximum GC allocation per frame in bytes
            public float maxCPUTimeMs;          // Maximum CPU time per frame in milliseconds
            public float maxGPUTimeMs;          // Maximum GPU time per frame in milliseconds
            public int maxDrawCalls;            // Maximum draw calls per frame
            public int maxSetPassCalls;         // Maximum SetPass calls per frame
            public long maxTextureMemoryMB;     // Maximum texture memory usage in MB
            public long maxMeshMemoryMB;        // Maximum mesh memory usage in MB
        }
        
        private static readonly Dictionary<string, PerformanceThresholds> PlatformThresholds = 
            new Dictionary<string, PerformanceThresholds>
        {
            ["Mobile_Android"] = new PerformanceThresholds
            {
                platformName = "Mobile_Android",
                maxFrameTimeMs = 33.33f, // ~30 FPS
                minTargetFPS = 30f,
                maxMemoryUsageMB = 1024, // 1GB
                maxGCAllocPerFrame = 1024, // 1KB per frame
                maxCPUTimeMs = 25f,
                maxGPUTimeMs = 25f,
                maxDrawCalls = 100,
                maxSetPassCalls = 20,
                maxTextureMemoryMB = 512,
                maxMeshMemoryMB = 128
            },
            ["Mobile_iOS"] = new PerformanceThresholds
            {
                platformName = "Mobile_iOS",
                maxFrameTimeMs = 16.67f, // ~60 FPS
                minTargetFPS = 60f,
                maxMemoryUsageMB = 2048, // 2GB
                maxGCAllocPerFrame = 512, // 512 bytes per frame
                maxCPUTimeMs = 12f,
                maxGPUTimeMs = 12f,
                maxDrawCalls = 150,
                maxSetPassCalls = 25,
                maxTextureMemoryMB = 1024,
                maxMeshMemoryMB = 256
            },
            ["Desktop_Windows"] = new PerformanceThresholds
            {
                platformName = "Desktop_Windows",
                maxFrameTimeMs = 16.67f, // ~60 FPS
                minTargetFPS = 60f,
                maxMemoryUsageMB = 4096, // 4GB
                maxGCAllocPerFrame = 2048, // 2KB per frame
                maxCPUTimeMs = 10f,
                maxGPUTimeMs = 10f,
                maxDrawCalls = 300,
                maxSetPassCalls = 50,
                maxTextureMemoryMB = 2048,
                maxMeshMemoryMB = 512
            },
            ["Console_PlayStation"] = new PerformanceThresholds
            {
                platformName = "Console_PlayStation",
                maxFrameTimeMs = 16.67f, // ~60 FPS
                minTargetFPS = 60f,
                maxMemoryUsageMB = 6144, // 6GB
                maxGCAllocPerFrame = 1024, // 1KB per frame
                maxCPUTimeMs = 8f,
                maxGPUTimeMs = 8f,
                maxDrawCalls = 500,
                maxSetPassCalls = 75,
                maxTextureMemoryMB = 3072,
                maxMeshMemoryMB = 1024
            },
            ["VR_OculusQuest"] = new PerformanceThresholds
            {
                platformName = "VR_OculusQuest",
                maxFrameTimeMs = 11.11f, // ~90 FPS
                minTargetFPS = 90f,
                maxMemoryUsageMB = 1536, // 1.5GB
                maxGCAllocPerFrame = 256, // 256 bytes per frame
                maxCPUTimeMs = 6f,
                maxGPUTimeMs = 6f,
                maxDrawCalls = 75,
                maxSetPassCalls = 15,
                maxTextureMemoryMB = 512,
                maxMeshMemoryMB = 128
            }
        };
        
        #endregion
        
        #region Profiler Data Collection
        
        /// <summary>
        /// Performance metrics captured during automated testing
        /// </summary>
        [System.Serializable]
        public struct PerformanceMetrics
        {
            public float averageFrameTime;
            public float maxFrameTime;
            public float minFrameTime;
            public float averageFPS;
            public long totalMemoryUsed;
            public long gcAllocatedInFrame;
            public float cpuFrameTime;
            public float gpuFrameTime;
            public int drawCallsCount;
            public int setPassCallsCount;
            public long textureMemory;
            public long meshMemory;
            public DateTime measurementTime;
            public string sceneName;
            public string platformTarget;
            public bool withinThresholds;
            public List<string> thresholdViolations;
        }
        
        private static ProfilerRecorder frameTimeRecorder;
        private static ProfilerRecorder memoryRecorder;
        private static ProfilerRecorder gcAllocRecorder;
        private static ProfilerRecorder drawCallsRecorder;
        private static ProfilerRecorder setPassRecorder;
        private static ProfilerRecorder textureMemRecorder;
        private static ProfilerRecorder meshMemRecorder;
        
        /// <summary>
        /// Initialize Unity Profiler API for automated performance monitoring
        /// </summary>
        [InitializeOnLoadMethod]
        public static void InitializeProfilerAutomation()
        {
            // Initialize profiler recorders for continuous monitoring
            frameTimeRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Internal, "Main Thread", 15);
            memoryRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "Total Used Memory", 15);
            gcAllocRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "GC Allocated In Frame", 15);
            drawCallsRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Render, "Draw Calls Count", 15);
            setPassRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Render, "SetPass Calls Count", 15);
            textureMemRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "Texture Memory", 15);
            meshMemRecorder = ProfilerRecorder.StartNew(ProfilerCategory.Memory, "Mesh Memory", 15);
            
            EditorApplication.update += UpdateProfilerMonitoring;
            
            Debug.Log("[BMAD Unity Profiler] Profiler automation initialized for continuous performance monitoring");
        }
        
        /// <summary>
        /// Continuous profiler monitoring update loop
        /// </summary>
        private static void UpdateProfilerMonitoring()
        {
            // This runs continuously in editor - could be used for real-time monitoring
            // For now, just ensure recorders are active
            if (!frameTimeRecorder.Valid || !memoryRecorder.Valid)
            {
                InitializeProfilerAutomation();
            }
        }
        
        /// <summary>
        /// Capture comprehensive performance metrics for current frame
        /// </summary>
        /// <param name="sampleFrames">Number of frames to sample for averaging</param>
        /// <returns>Detailed performance metrics</returns>
        public static PerformanceMetrics CapturePerformanceMetrics(int sampleFrames = 60)
        {
            var metrics = new PerformanceMetrics
            {
                measurementTime = DateTime.Now,
                sceneName = UnityEngine.SceneManagement.SceneManager.GetActiveScene().name,
                platformTarget = GetCurrentPlatformTarget(),
                thresholdViolations = new List<string>()
            };
            
            // Frame timing metrics
            if (frameTimeRecorder.Valid && frameTimeRecorder.Count > 0)
            {
                var frameTimes = new List<float>();
                for (int i = 0; i < Mathf.Min(sampleFrames, frameTimeRecorder.Count); i++)
                {
                    frameTimes.Add((float)frameTimeRecorder.GetSample(i).Value / 1000000f); // Convert to ms
                }
                
                metrics.averageFrameTime = frameTimes.Average();
                metrics.maxFrameTime = frameTimes.Max();
                metrics.minFrameTime = frameTimes.Min();
                metrics.averageFPS = 1000f / metrics.averageFrameTime;
            }
            
            // Memory metrics
            if (memoryRecorder.Valid && memoryRecorder.Count > 0)
            {
                metrics.totalMemoryUsed = memoryRecorder.LastValue;
            }
            
            if (gcAllocRecorder.Valid && gcAllocRecorder.Count > 0)
            {
                metrics.gcAllocatedInFrame = gcAllocRecorder.LastValue;
            }
            
            // Rendering metrics
            if (drawCallsRecorder.Valid && drawCallsRecorder.Count > 0)
            {
                metrics.drawCallsCount = (int)drawCallsRecorder.LastValue;
            }
            
            if (setPassRecorder.Valid && setPassRecorder.Count > 0)
            {
                metrics.setPassCallsCount = (int)setPassRecorder.LastValue;
            }
            
            // Memory breakdown
            if (textureMemRecorder.Valid && textureMemRecorder.Count > 0)
            {
                metrics.textureMemory = textureMemRecorder.LastValue;
            }
            
            if (meshMemRecorder.Valid && meshMemRecorder.Count > 0)
            {
                metrics.meshMemory = meshMemRecorder.LastValue;
            }
            
            // Validate against thresholds
            metrics.withinThresholds = ValidatePerformanceThresholds(metrics);
            
            return metrics;
        }
        
        #endregion
        
        #region Performance Validation
        
        /// <summary>
        /// Validate performance metrics against platform-specific thresholds
        /// </summary>
        /// <param name="metrics">Performance metrics to validate</param>
        /// <returns>True if all thresholds are met</returns>
        public static bool ValidatePerformanceThresholds(PerformanceMetrics metrics)
        {
            if (!PlatformThresholds.TryGetValue(metrics.platformTarget, out PerformanceThresholds thresholds))
            {
                // Use desktop defaults if platform not found
                thresholds = PlatformThresholds["Desktop_Windows"];
                Debug.LogWarning($"[BMAD Unity Profiler] Platform {metrics.platformTarget} not found, using Desktop defaults");
            }
            
            bool allPassed = true;
            
            // Frame time validation
            if (metrics.averageFrameTime > thresholds.maxFrameTimeMs)
            {
                metrics.thresholdViolations.Add($"Average frame time {metrics.averageFrameTime:F2}ms exceeds threshold {thresholds.maxFrameTimeMs}ms");
                allPassed = false;
            }
            
            // FPS validation
            if (metrics.averageFPS < thresholds.minTargetFPS)
            {
                metrics.thresholdViolations.Add($"Average FPS {metrics.averageFPS:F1} below threshold {thresholds.minTargetFPS}");
                allPassed = false;
            }
            
            // Memory validation
            long memoryMB = metrics.totalMemoryUsed / (1024 * 1024);
            if (memoryMB > thresholds.maxMemoryUsageMB)
            {
                metrics.thresholdViolations.Add($"Memory usage {memoryMB}MB exceeds threshold {thresholds.maxMemoryUsageMB}MB");
                allPassed = false;
            }
            
            // GC allocation validation
            if (metrics.gcAllocatedInFrame > thresholds.maxGCAllocPerFrame)
            {
                metrics.thresholdViolations.Add($"GC allocation {metrics.gcAllocatedInFrame} bytes exceeds threshold {thresholds.maxGCAllocPerFrame} bytes");
                allPassed = false;
            }
            
            // Draw calls validation
            if (metrics.drawCallsCount > thresholds.maxDrawCalls)
            {
                metrics.thresholdViolations.Add($"Draw calls {metrics.drawCallsCount} exceed threshold {thresholds.maxDrawCalls}");
                allPassed = false;
            }
            
            // SetPass calls validation
            if (metrics.setPassCallsCount > thresholds.maxSetPassCalls)
            {
                metrics.thresholdViolations.Add($"SetPass calls {metrics.setPassCallsCount} exceed threshold {thresholds.maxSetPassCalls}");
                allPassed = false;
            }
            
            return allPassed;
        }
        
        /// <summary>
        /// Get current platform target for threshold selection
        /// </summary>
        /// <returns>Platform identifier string</returns>
        private static string GetCurrentPlatformTarget()
        {
            switch (EditorUserBuildSettings.activeBuildTarget)
            {
                case BuildTarget.Android:
                    return "Mobile_Android";
                case BuildTarget.iOS:
                    return "Mobile_iOS";
                case BuildTarget.StandaloneWindows:
                case BuildTarget.StandaloneWindows64:
                    return "Desktop_Windows";
                case BuildTarget.StandaloneOSX:
                    return "Desktop_macOS";
                case BuildTarget.StandaloneLinux64:
                    return "Desktop_Linux";
                case BuildTarget.PS4:
                case BuildTarget.PS5:
                    return "Console_PlayStation";
                case BuildTarget.XboxOne:
                case BuildTarget.GameCoreXboxOne:
                    return "Console_Xbox";
                default:
                    return "Desktop_Windows"; // Default fallback
            }
        }
        
        #endregion
        
        #region Performance Regression Detection
        
        /// <summary>
        /// Historical performance data for regression detection
        /// </summary>
        [System.Serializable]
        public struct PerformanceBaseline
        {
            public string sceneName;
            public string platformTarget;
            public PerformanceMetrics baselineMetrics;
            public DateTime baselineDate;
            public string gitCommitHash;
            public List<PerformanceMetrics> historicalData;
        }
        
        private static readonly string BaselineDataPath = "ProjectSettings/BMadPerformanceBaselines.json";
        
        /// <summary>
        /// Save performance baseline for regression detection
        /// </summary>
        /// <param name="metrics">Performance metrics to save as baseline</param>
        /// <param name="commitHash">Git commit hash for versioning</param>
        public static void SavePerformanceBaseline(PerformanceMetrics metrics, string commitHash = "")
        {
            var baselines = LoadPerformanceBaselines();
            var key = $"{metrics.sceneName}_{metrics.platformTarget}";
            
            if (baselines.ContainsKey(key))
            {
                baselines[key].historicalData.Add(metrics);
                // Keep only last 50 measurements
                if (baselines[key].historicalData.Count > 50)
                {
                    baselines[key].historicalData.RemoveAt(0);
                }
            }
            else
            {
                baselines[key] = new PerformanceBaseline
                {
                    sceneName = metrics.sceneName,
                    platformTarget = metrics.platformTarget,
                    baselineMetrics = metrics,
                    baselineDate = DateTime.Now,
                    gitCommitHash = commitHash,
                    historicalData = new List<PerformanceMetrics> { metrics }
                };
            }
            
            SavePerformanceBaselines(baselines);
            Debug.Log($"[BMAD Unity Profiler] Performance baseline saved for {key}");
        }
        
        /// <summary>
        /// Detect performance regressions by comparing against baseline
        /// </summary>
        /// <param name="currentMetrics">Current performance metrics</param>
        /// <param name="regressionThreshold">Percentage threshold for regression detection (default 10%)</param>
        /// <returns>List of detected regressions</returns>
        public static List<string> DetectPerformanceRegressions(PerformanceMetrics currentMetrics, float regressionThreshold = 0.10f)
        {
            var regressions = new List<string>();
            var baselines = LoadPerformanceBaselines();
            var key = $"{currentMetrics.sceneName}_{currentMetrics.platformTarget}";
            
            if (!baselines.ContainsKey(key))
            {
                Debug.LogWarning($"[BMAD Unity Profiler] No baseline found for {key}, creating new baseline");
                SavePerformanceBaseline(currentMetrics);
                return regressions;
            }
            
            var baseline = baselines[key].baselineMetrics;
            
            // Frame time regression
            if (currentMetrics.averageFrameTime > baseline.averageFrameTime * (1 + regressionThreshold))
            {
                regressions.Add($"Frame time regression: {currentMetrics.averageFrameTime:F2}ms vs baseline {baseline.averageFrameTime:F2}ms ({((currentMetrics.averageFrameTime / baseline.averageFrameTime - 1) * 100):F1}% increase)");
            }
            
            // Memory regression
            if (currentMetrics.totalMemoryUsed > baseline.totalMemoryUsed * (1 + regressionThreshold))
            {
                regressions.Add($"Memory regression: {currentMetrics.totalMemoryUsed / (1024 * 1024)}MB vs baseline {baseline.totalMemoryUsed / (1024 * 1024)}MB");
            }
            
            // Draw calls regression
            if (currentMetrics.drawCallsCount > baseline.drawCallsCount * (1 + regressionThreshold))
            {
                regressions.Add($"Draw calls regression: {currentMetrics.drawCallsCount} vs baseline {baseline.drawCallsCount}");
            }
            
            // GC allocation regression
            if (currentMetrics.gcAllocatedInFrame > baseline.gcAllocatedInFrame * (1 + regressionThreshold))
            {
                regressions.Add($"GC allocation regression: {currentMetrics.gcAllocatedInFrame} bytes vs baseline {baseline.gcAllocatedInFrame} bytes");
            }
            
            return regressions;
        }
        
        /// <summary>
        /// Load performance baselines from persistent storage
        /// </summary>
        /// <returns>Dictionary of performance baselines</returns>
        private static Dictionary<string, PerformanceBaseline> LoadPerformanceBaselines()
        {
            if (!File.Exists(BaselineDataPath))
            {
                return new Dictionary<string, PerformanceBaseline>();
            }
            
            try
            {
                var json = File.ReadAllText(BaselineDataPath);
                var baselines = JsonUtility.FromJson<Dictionary<string, PerformanceBaseline>>(json);
                return baselines ?? new Dictionary<string, PerformanceBaseline>();
            }
            catch (System.Exception e)
            {
                Debug.LogError($"[BMAD Unity Profiler] Failed to load performance baselines: {e.Message}");
                return new Dictionary<string, PerformanceBaseline>();
            }
        }
        
        /// <summary>
        /// Save performance baselines to persistent storage
        /// </summary>
        /// <param name="baselines">Baselines to save</param>
        private static void SavePerformanceBaselines(Dictionary<string, PerformanceBaseline> baselines)
        {
            try
            {
                var json = JsonUtility.ToJson(baselines, true);
                File.WriteAllText(BaselineDataPath, json);
            }
            catch (System.Exception e)
            {
                Debug.LogError($"[BMAD Unity Profiler] Failed to save performance baselines: {e.Message}");
            }
        }
        
        #endregion
        
        #region CI/CD Integration
        
        /// <summary>
        /// Generate performance report in CI/CD compatible format
        /// </summary>
        /// <param name="metrics">Performance metrics to report</param>
        /// <param name="outputFormat">Output format (json, xml, markdown)</param>
        /// <returns>Formatted performance report</returns>
        public static string GeneratePerformanceReport(PerformanceMetrics metrics, string outputFormat = "json")
        {
            switch (outputFormat.ToLower())
            {
                case "json":
                    return JsonUtility.ToJson(metrics, true);
                
                case "xml":
                    return GenerateXmlReport(metrics);
                
                case "markdown":
                    return GenerateMarkdownReport(metrics);
                
                default:
                    return JsonUtility.ToJson(metrics, true);
            }
        }
        
        /// <summary>
        /// Generate XML performance report for CI/CD systems
        /// </summary>
        /// <param name="metrics">Performance metrics</param>
        /// <returns>XML formatted report</returns>
        private static string GenerateXmlReport(PerformanceMetrics metrics)
        {
            return $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<PerformanceReport>
    <Timestamp>{metrics.measurementTime:yyyy-MM-ddTHH:mm:ss}</Timestamp>
    <Scene>{metrics.sceneName}</Scene>
    <Platform>{metrics.platformTarget}</Platform>
    <Performance>
        <FrameTime average=""{metrics.averageFrameTime:F2}"" max=""{metrics.maxFrameTime:F2}"" min=""{metrics.minFrameTime:F2}"" />
        <FPS average=""{metrics.averageFPS:F1}"" />
        <Memory total=""{metrics.totalMemoryUsed / (1024 * 1024)}"" gcAlloc=""{metrics.gcAllocatedInFrame}"" />
        <Rendering drawCalls=""{metrics.drawCallsCount}"" setPassCalls=""{metrics.setPassCallsCount}"" />
    </Performance>
    <ValidationResult passed=""{metrics.withinThresholds}"">
        {string.Join("\n        ", metrics.thresholdViolations.Select(v => $"<Violation>{v}</Violation>"))}
    </ValidationResult>
</PerformanceReport>";
        }
        
        /// <summary>
        /// Generate Markdown performance report for documentation
        /// </summary>
        /// <param name="metrics">Performance metrics</param>
        /// <returns>Markdown formatted report</returns>
        private static string GenerateMarkdownReport(PerformanceMetrics metrics)
        {
            var status = metrics.withinThresholds ? "✅ PASSED" : "❌ FAILED";
            var violations = metrics.thresholdViolations.Any() 
                ? string.Join("\n", metrics.thresholdViolations.Select(v => $"- ⚠️ {v}"))
                : "- ✅ All thresholds met";
            
            return $@"# Performance Report

**Status**: {status}
**Scene**: {metrics.sceneName}
**Platform**: {metrics.platformTarget}
**Timestamp**: {metrics.measurementTime:yyyy-MM-dd HH:mm:ss}

## Performance Metrics

| Metric | Value | Unit |
|--------|-------|------|
| Average Frame Time | {metrics.averageFrameTime:F2} | ms |
| Max Frame Time | {metrics.maxFrameTime:F2} | ms |
| Average FPS | {metrics.averageFPS:F1} | fps |
| Total Memory | {metrics.totalMemoryUsed / (1024 * 1024)} | MB |
| GC Allocation | {metrics.gcAllocatedInFrame} | bytes |
| Draw Calls | {metrics.drawCallsCount} | count |
| SetPass Calls | {metrics.setPassCallsCount} | count |
| Texture Memory | {metrics.textureMemory / (1024 * 1024)} | MB |
| Mesh Memory | {metrics.meshMemory / (1024 * 1024)} | MB |

## Validation Results

{violations}
";
        }
        
        /// <summary>
        /// Export performance data for CI/CD pipeline consumption
        /// </summary>
        /// <param name="metrics">Performance metrics to export</param>
        /// <param name="outputPath">File path for export</param>
        /// <param name="format">Export format</param>
        public static void ExportPerformanceData(PerformanceMetrics metrics, string outputPath, string format = "json")
        {
            var report = GeneratePerformanceReport(metrics, format);
            File.WriteAllText(outputPath, report);
            Debug.Log($"[BMAD Unity Profiler] Performance data exported to {outputPath}");
        }
        
        #endregion
        
        #region Unity Test Framework Integration
        
        /// <summary>
        /// Automated performance test for Unity Test Framework integration
        /// </summary>
        [UnityTest]
        public static System.Collections.IEnumerator AutomatedPerformanceTest()
        {
            Debug.Log("[BMAD Unity Profiler] Starting automated performance test");
            
            // Wait for scene to stabilize
            yield return new WaitForSeconds(2f);
            
            // Capture baseline metrics
            var metrics = CapturePerformanceMetrics(120); // 2 seconds of samples
            
            // Validate against thresholds
            Assert.IsTrue(metrics.withinThresholds, 
                $"Performance thresholds failed:\n{string.Join("\n", metrics.thresholdViolations)}");
            
            // Check for regressions
            var regressions = DetectPerformanceRegressions(metrics);
            Assert.IsTrue(regressions.Count == 0, 
                $"Performance regressions detected:\n{string.Join("\n", regressions)}");
            
            // Save current metrics as baseline
            SavePerformanceBaseline(metrics, GetCurrentGitCommit());
            
            Debug.Log($"[BMAD Unity Profiler] Performance test completed successfully");
            Debug.Log($"Average FPS: {metrics.averageFPS:F1}, Memory: {metrics.totalMemoryUsed / (1024 * 1024)}MB");
            
            yield return null;
        }
        
        /// <summary>
        /// Get current Git commit hash for versioning
        /// </summary>
        /// <returns>Git commit hash or empty string</returns>
        private static string GetCurrentGitCommit()
        {
            try
            {
                var process = new System.Diagnostics.Process
                {
                    StartInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "git",
                        Arguments = "rev-parse HEAD",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        CreateNoWindow = true
                    }
                };
                process.Start();
                string result = process.StandardOutput.ReadToEnd();
                process.WaitForExit();
                return result.Trim();
            }
            catch
            {
                return "";
            }
        }
        
        #endregion
        
        #region Memory Leak Detection
        
        /// <summary>
        /// Automated memory leak detection system
        /// </summary>
        public static class MemoryLeakDetector
        {
            private static Dictionary<string, long> memorySnapshots = new Dictionary<string, long>();
            
            /// <summary>
            /// Take memory snapshot for leak detection
            /// </summary>
            /// <param name="snapshotName">Unique identifier for snapshot</param>
            public static void TakeMemorySnapshot(string snapshotName)
            {
                if (memoryRecorder.Valid)
                {
                    memorySnapshots[snapshotName] = memoryRecorder.LastValue;
                    Debug.Log($"[BMAD Memory Leak Detector] Snapshot '{snapshotName}': {memorySnapshots[snapshotName] / (1024 * 1024)}MB");
                }
            }
            
            /// <summary>
            /// Detect memory leaks between snapshots
            /// </summary>
            /// <param name="beforeSnapshot">Snapshot taken before operation</param>
            /// <param name="afterSnapshot">Snapshot taken after operation</param>
            /// <param name="allowedLeakMB">Allowed memory increase in MB</param>
            /// <returns>True if no significant memory leak detected</returns>
            public static bool DetectMemoryLeak(string beforeSnapshot, string afterSnapshot, float allowedLeakMB = 10f)
            {
                if (!memorySnapshots.ContainsKey(beforeSnapshot) || !memorySnapshots.ContainsKey(afterSnapshot))
                {
                    Debug.LogWarning("[BMAD Memory Leak Detector] Snapshots not found for leak detection");
                    return false;
                }
                
                long beforeMemory = memorySnapshots[beforeSnapshot];
                long afterMemory = memorySnapshots[afterSnapshot];
                long memoryDifference = afterMemory - beforeMemory;
                float memoryDifferenceMB = memoryDifference / (1024f * 1024f);
                
                bool isLeakDetected = memoryDifferenceMB > allowedLeakMB;
                
                if (isLeakDetected)
                {
                    Debug.LogError($"[BMAD Memory Leak Detector] Memory leak detected: {memoryDifferenceMB:F2}MB increase (threshold: {allowedLeakMB}MB)");
                }
                else
                {
                    Debug.Log($"[BMAD Memory Leak Detector] Memory usage within acceptable range: {memoryDifferenceMB:F2}MB increase");
                }
                
                return !isLeakDetected;
            }
        }
        
        #endregion
        
        #region Cleanup
        
        /// <summary>
        /// Cleanup profiler resources
        /// </summary>
        [MenuItem("BMAD/Profiler/Cleanup Profiler Resources")]
        public static void CleanupProfilerResources()
        {
            frameTimeRecorder?.Dispose();
            memoryRecorder?.Dispose();
            gcAllocRecorder?.Dispose();
            drawCallsRecorder?.Dispose();
            setPassRecorder?.Dispose();
            textureMemRecorder?.Dispose();
            meshMemRecorder?.Dispose();
            
            EditorApplication.update -= UpdateProfilerMonitoring;
            
            Debug.Log("[BMAD Unity Profiler] Profiler resources cleaned up");
        }
        
        #endregion
    }
}
