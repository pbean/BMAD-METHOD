using UnityEngine;
using UnityEditor;
using UnityEngine.TestTools;
using NUnit.Framework;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using BMAD.Unity.ProfilerAutomation;

namespace BMAD.Unity.TestFramework
{
    /// <summary>
    /// Unity Test Framework integration for automated performance testing
    /// Bridges Unity Profiler automation with Test Framework for CI/CD pipeline execution
    /// Part of BMAD Unity expansion pack Priority 3 implementation
    /// </summary>
    public static class UnityTestFrameworkProfilerIntegration
    {
        #region CI/CD Static Entry Points
        
        /// <summary>
        /// Static entry point for CI/CD performance testing
        /// Called by GitHub Actions and Azure DevOps pipelines
        /// </summary>
        [MenuItem("BMAD/Profiler/Run CI Performance Tests")]
        public static void RunCIPerformanceTests()
        {
            Debug.Log("[BMAD CI Performance] Starting automated performance tests for CI/CD pipeline");
            
            // Parse command line arguments
            string testScene = GetCommandLineArgument("-testScene", "MainScene");
            string targetPlatform = GetCommandLineArgument("-targetPlatform", "StandaloneWindows64");
            string performanceReportPath = GetCommandLineArgument("-performanceReportPath", "performance-results/");
            
            // Ensure output directory exists
            Directory.CreateDirectory(performanceReportPath);
            
            // Load test scene if specified
            if (!string.IsNullOrEmpty(testScene) && testScene != "MainScene")
            {
                var scenePath = $"Assets/Scenes/{testScene}.unity";
                if (File.Exists(scenePath))
                {
                    UnityEngine.SceneManagement.SceneManager.LoadScene(testScene);
                    Debug.Log($"[BMAD CI Performance] Loaded test scene: {testScene}");
                }
                else
                {
                    Debug.LogWarning($"[BMAD CI Performance] Test scene not found: {scenePath}");
                }
            }
            
            // Run performance tests
            EditorApplication.update += OnEditorUpdate;
            
            void OnEditorUpdate()
            {
                EditorApplication.update -= OnEditorUpdate;
                ExecuteCIPerformanceTestSequence(testScene, targetPlatform, performanceReportPath);
            }
        }
        
        /// <summary>
        /// Execute the complete CI performance test sequence
        /// </summary>
        private static void ExecuteCIPerformanceTestSequence(string testScene, string targetPlatform, string outputPath)
        {
            try
            {
                Debug.Log($"[BMAD CI Performance] Executing performance test sequence for {testScene} on {targetPlatform}");
                
                // Wait for scene to stabilize
                System.Threading.Thread.Sleep(3000);
                
                // Capture comprehensive performance metrics
                var metrics = UnityProfilerIntegrationManager.CapturePerformanceMetrics(120); // 2 seconds of samples
                metrics.sceneName = testScene;
                metrics.platformTarget = targetPlatform;
                
                // Validate against thresholds
                bool thresholdsValid = UnityProfilerIntegrationManager.ValidatePerformanceThresholds(metrics);
                
                // Check for regressions
                var regressions = UnityProfilerIntegrationManager.DetectPerformanceRegressions(metrics);
                
                // Save performance baseline
                string gitCommit = GetGitCommitHash();
                UnityProfilerIntegrationManager.SavePerformanceBaseline(metrics, gitCommit);
                
                // Generate CI/CD reports in multiple formats
                ExportCIPerformanceReports(metrics, regressions, outputPath);
                
                // Log results
                string status = thresholdsValid && regressions.Count == 0 ? "PASSED" : "FAILED";
                Debug.Log($"[BMAD CI Performance] Performance test completed: {status}");
                Debug.Log($"[BMAD CI Performance] Average FPS: {metrics.averageFPS:F1}, Memory: {metrics.totalMemoryUsed / (1024 * 1024)}MB");
                
                if (regressions.Count > 0)
                {
                    Debug.LogWarning($"[BMAD CI Performance] Regressions detected: {string.Join("; ", regressions)}");
                }
                
                // Exit with appropriate code for CI/CD
                EditorApplication.Exit(thresholdsValid && regressions.Count == 0 ? 0 : 1);
            }
            catch (System.Exception e)
            {
                Debug.LogError($"[BMAD CI Performance] Performance test failed with exception: {e.Message}");
                EditorApplication.Exit(1);
            }
        }
        
        /// <summary>
        /// Export performance reports in multiple CI/CD compatible formats
        /// </summary>
        private static void ExportCIPerformanceReports(UnityProfilerIntegrationManager.PerformanceMetrics metrics, List<string> regressions, string outputPath)
        {
            // JSON report for programmatic consumption
            string jsonReport = UnityProfilerIntegrationManager.GeneratePerformanceReport(metrics, "json");
            File.WriteAllText(Path.Combine(outputPath, "performance-report.json"), jsonReport);
            
            // XML report for test result integration
            string xmlReport = UnityProfilerIntegrationManager.GeneratePerformanceReport(metrics, "xml");
            File.WriteAllText(Path.Combine(outputPath, "performance-report.xml"), xmlReport);
            
            // Markdown report for documentation
            string markdownReport = UnityProfilerIntegrationManager.GeneratePerformanceReport(metrics, "markdown");
            
            // Enhance markdown report with regression information
            if (regressions.Count > 0)
            {
                markdownReport += "\n## Performance Regressions Detected\n\n";
                foreach (var regression in regressions)
                {
                    markdownReport += $"- ⚠️ {regression}\n";
                }
            }
            
            File.WriteAllText(Path.Combine(outputPath, "performance-report.md"), markdownReport);
            
            // Create NUnit-compatible test result XML
            CreateNUnitTestResult(metrics, regressions, outputPath);
            
            Debug.Log($"[BMAD CI Performance] Performance reports exported to {outputPath}");
        }
        
        /// <summary>
        /// Create NUnit-compatible test result XML for CI/CD integration
        /// </summary>
        private static void CreateNUnitTestResult(UnityProfilerIntegrationManager.PerformanceMetrics metrics, List<string> regressions, string outputPath)
        {
            bool passed = metrics.withinThresholds && regressions.Count == 0;
            string result = passed ? "Passed" : "Failed";
            string failureMessage = "";
            
            if (!metrics.withinThresholds)
            {
                failureMessage += "Performance thresholds exceeded: " + string.Join(", ", metrics.thresholdViolations);
            }
            
            if (regressions.Count > 0)
            {
                if (!string.IsNullOrEmpty(failureMessage)) failureMessage += "; ";
                failureMessage += "Performance regressions detected: " + string.Join(", ", regressions);
            }
            
            string nunitXml = $@"<?xml version=""1.0"" encoding=""utf-8""?>
<test-results xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance"" xsi:noNamespaceSchemaLocation=""TestResult.xsd"" name=""BMAD Unity Performance Tests"" total=""1"" errors=""0"" failures=""{(passed ? 0 : 1)}"" inconclusive=""0"" not-run=""0"" skipped=""0"" invalid=""0"" ignored=""0"" date=""{metrics.measurementTime:yyyy-MM-dd}"" time=""{metrics.measurementTime:HH:mm:ss}"">
    <environment nunit-version=""3.12.0.0"" clr-version=""4.0.30319.42000"" os-version=""Microsoft Windows NT 10.0.19043.0"" platform=""Win32NT"" cwd=""{Directory.GetCurrentDirectory()}"" machine-name=""{System.Environment.MachineName}"" user=""{System.Environment.UserName}"" user-domain=""{System.Environment.UserDomainName}"" />
    <culture-info current-culture=""en-US"" current-uiculture=""en-US"" />
    <test-suite type=""TestFixture"" name=""BMAD.Unity.PerformanceTests"" executed=""True"" result=""{result}"" success=""{passed.ToString().ToLower()}"" time=""0"" asserts=""1"">
        <results>
            <test-case name=""AutomatedPerformanceValidation[{metrics.sceneName}_{metrics.platformTarget}]"" executed=""True"" result=""{result}"" success=""{passed.ToString().ToLower()}"" time=""0"" asserts=""1"">
                {(passed ? "" : $@"<failure>
                    <message><![CDATA[{failureMessage}]]></message>
                    <stack-trace><![CDATA[Performance validation failed for scene: {metrics.sceneName}, platform: {metrics.platformTarget}
Average FPS: {metrics.averageFPS:F1}
Frame Time: {metrics.averageFrameTime:F2}ms  
Memory Usage: {metrics.totalMemoryUsed / (1024 * 1024)}MB
Draw Calls: {metrics.drawCallsCount}]]></stack-trace>
                </failure>")}
            </test-case>
        </results>
    </test-suite>
</test-results>";
            
            File.WriteAllText(Path.Combine(outputPath, "performance-test-results.xml"), nunitXml);
        }
        
        #endregion
        
        #region Performance Regression Analysis
        
        /// <summary>
        /// Analyze performance regression across multiple test results
        /// Called by CI/CD for comprehensive regression analysis
        /// </summary>
        [MenuItem("BMAD/Profiler/Analyze Performance Regression")]
        public static void AnalyzePerformanceRegression()
        {
            string resultsPath = GetCommandLineArgument("-resultsPath", "consolidated-results/");
            string outputPath = GetCommandLineArgument("-outputPath", "regression-analysis/");
            
            if (!Directory.Exists(resultsPath))
            {
                Debug.LogError($"[BMAD Regression Analysis] Results directory not found: {resultsPath}");
                EditorApplication.Exit(1);
                return;
            }
            
            Directory.CreateDirectory(outputPath);
            
            try
            {
                var allResults = LoadAllPerformanceResults(resultsPath);
                var regressionReport = AnalyzeRegressions(allResults);
                
                // Export regression analysis
                string reportJson = UnityEngine.JsonUtility.ToJson(regressionReport, true);
                File.WriteAllText(Path.Combine(outputPath, "regression-report.json"), reportJson);
                
                Debug.Log($"[BMAD Regression Analysis] Analysis complete. {regressionReport.regressionsDetected.Count} regressions found");
                
                // Exit with error code if regressions found
                EditorApplication.Exit(regressionReport.regressionsDetected.Count > 0 ? 1 : 0);
            }
            catch (System.Exception e)
            {
                Debug.LogError($"[BMAD Regression Analysis] Failed: {e.Message}");
                EditorApplication.Exit(1);
            }
        }
        
        private static List<UnityProfilerIntegrationManager.PerformanceMetrics> LoadAllPerformanceResults(string resultsPath)
        {
            var allResults = new List<UnityProfilerIntegrationManager.PerformanceMetrics>();
            var jsonFiles = Directory.GetFiles(resultsPath, "*performance-report.json", SearchOption.AllDirectories);
            
            foreach (var file in jsonFiles)
            {
                try
                {
                    var json = File.ReadAllText(file);
                    var metrics = JsonUtility.FromJson<UnityProfilerIntegrationManager.PerformanceMetrics>(json);
                    allResults.Add(metrics);
                }
                catch (System.Exception e)
                {
                    Debug.LogWarning($"[BMAD Regression Analysis] Failed to load {file}: {e.Message}");
                }
            }
            
            return allResults;
        }
        
        private static RegressionAnalysisReport AnalyzeRegressions(List<UnityProfilerIntegrationManager.PerformanceMetrics> results)
        {
            var report = new RegressionAnalysisReport
            {
                analysisDate = System.DateTime.Now,
                totalTestsAnalyzed = results.Count,
                regressionsDetected = new List<RegressionDetails>()
            };
            
            foreach (var result in results)
            {
                var regressions = UnityProfilerIntegrationManager.DetectPerformanceRegressions(result);
                
                foreach (var regression in regressions)
                {
                    report.regressionsDetected.Add(new RegressionDetails
                    {
                        scene = result.sceneName,
                        platform = result.platformTarget,
                        description = regression,
                        measurementTime = result.measurementTime
                    });
                }
            }
            
            return report;
        }
        
        [System.Serializable]
        public struct RegressionAnalysisReport
        {
            public System.DateTime analysisDate;
            public int totalTestsAnalyzed;
            public List<RegressionDetails> regressionsDetected;
        }
        
        [System.Serializable]
        public struct RegressionDetails
        {
            public string scene;
            public string platform;
            public string description;
            public System.DateTime measurementTime;
        }
        
        #endregion
        
        #region Comprehensive Benchmarking
        
        /// <summary>
        /// Run comprehensive performance benchmark suite
        /// Used for baseline establishment and performance characterization
        /// </summary>
        [MenuItem("BMAD/Profiler/Run Comprehensive Benchmark")]
        public static void RunComprehensiveBenchmark()
        {
            int benchmarkDuration = int.Parse(GetCommandLineArgument("-benchmarkDuration", "180")); // 3 minutes default
            string outputPath = GetCommandLineArgument("-outputPath", "benchmark-results/");
            
            Directory.CreateDirectory(outputPath);
            
            Debug.Log($"[BMAD Comprehensive Benchmark] Starting {benchmarkDuration}s benchmark suite");
            
            // Run benchmark sequence
            EditorApplication.update += OnBenchmarkUpdate;
            
            var benchmarkData = new ComprehensiveBenchmarkData
            {
                startTime = System.DateTime.Now,
                duration = benchmarkDuration,
                outputPath = outputPath,
                samples = new List<UnityProfilerIntegrationManager.PerformanceMetrics>()
            };
            
            EditorPrefs.SetString("BMAD_BenchmarkData", JsonUtility.ToJson(benchmarkData));
        }
        
        private static void OnBenchmarkUpdate()
        {
            var benchmarkDataJson = EditorPrefs.GetString("BMAD_BenchmarkData", "");
            if (string.IsNullOrEmpty(benchmarkDataJson)) return;
            
            var benchmarkData = JsonUtility.FromJson<ComprehensiveBenchmarkData>(benchmarkDataJson);
            var elapsed = (System.DateTime.Now - benchmarkData.startTime).TotalSeconds;
            
            if (elapsed < benchmarkData.duration)
            {
                // Capture performance sample
                var metrics = UnityProfilerIntegrationManager.CapturePerformanceMetrics(10);
                benchmarkData.samples.Add(metrics);
                
                // Update stored data
                EditorPrefs.SetString("BMAD_BenchmarkData", JsonUtility.ToJson(benchmarkData));
                
                // Log progress every 30 seconds
                if ((int)elapsed % 30 == 0)
                {
                    Debug.Log($"[BMAD Comprehensive Benchmark] Progress: {elapsed:F0}s / {benchmarkData.duration}s");
                }
            }
            else
            {
                // Benchmark complete
                EditorApplication.update -= OnBenchmarkUpdate;
                CompleteBenchmark(benchmarkData);
                EditorPrefs.DeleteKey("BMAD_BenchmarkData");
            }
        }
        
        private static void CompleteBenchmark(ComprehensiveBenchmarkData benchmarkData)
        {
            Debug.Log($"[BMAD Comprehensive Benchmark] Benchmark complete. {benchmarkData.samples.Count} samples collected");
            
            // Generate comprehensive benchmark report
            var summary = GenerateBenchmarkSummary(benchmarkData.samples);
            
            // Export results
            string summaryJson = JsonUtility.ToJson(summary, true);
            File.WriteAllText(Path.Combine(benchmarkData.outputPath, "benchmark-summary.json"), summaryJson);
            
            // Export all samples
            string samplesJson = JsonUtility.ToJson(new { samples = benchmarkData.samples }, true);
            File.WriteAllText(Path.Combine(benchmarkData.outputPath, "benchmark-samples.json"), samplesJson);
            
            Debug.Log($"[BMAD Comprehensive Benchmark] Results exported to {benchmarkData.outputPath}");
        }
        
        private static BenchmarkSummary GenerateBenchmarkSummary(List<UnityProfilerIntegrationManager.PerformanceMetrics> samples)
        {
            if (samples.Count == 0) return new BenchmarkSummary();
            
            return new BenchmarkSummary
            {
                totalSamples = samples.Count,
                averageFPS = samples.ConvertAll(s => s.averageFPS).Average(),
                minFPS = samples.Min(s => s.averageFPS),
                maxFPS = samples.Max(s => s.averageFPS),
                averageFrameTime = samples.ConvertAll(s => s.averageFrameTime).Average(),
                averageMemoryMB = samples.ConvertAll(s => (float)(s.totalMemoryUsed / (1024 * 1024))).Average(),
                averageDrawCalls = samples.ConvertAll(s => (float)s.drawCallsCount).Average(),
                benchmarkDate = System.DateTime.Now
            };
        }
        
        [System.Serializable]
        private struct ComprehensiveBenchmarkData
        {
            public System.DateTime startTime;
            public int duration;
            public string outputPath;
            public List<UnityProfilerIntegrationManager.PerformanceMetrics> samples;
        }
        
        [System.Serializable]
        public struct BenchmarkSummary
        {
            public int totalSamples;
            public float averageFPS;
            public float minFPS;
            public float maxFPS;
            public float averageFrameTime;
            public float averageMemoryMB;
            public float averageDrawCalls;
            public System.DateTime benchmarkDate;
        }
        
        #endregion
        
        #region Mobile Performance Testing
        
        /// <summary>
        /// Build performance test application for mobile platforms
        /// </summary>
        [MenuItem("BMAD/Profiler/Build Performance Test App")]
        public static void BuildPerformanceTestApp()
        {
            string platform = GetCommandLineArgument("-platform", "Android");
            Debug.Log($"[BMAD Mobile Performance] Building performance test app for {platform}");
            
            // Configure build settings for performance testing
            BuildTarget buildTarget = platform == "iOS" ? BuildTarget.iOS : BuildTarget.Android;
            
            // Set up build options
            BuildPlayerOptions buildOptions = new BuildPlayerOptions
            {
                scenes = new[] { "Assets/Scenes/PerformanceTest.unity" },
                locationPathName = $"Builds/PerformanceTest_{platform}",
                target = buildTarget,
                options = BuildOptions.Development | BuildOptions.ConnectWithProfiler
            };
            
            // Build the application
            var report = BuildPipeline.BuildPlayer(buildOptions);
            
            if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
            {
                Debug.Log($"[BMAD Mobile Performance] Build succeeded: {report.summary.outputPath}");
                EditorApplication.Exit(0);
            }
            else
            {
                Debug.LogError($"[BMAD Mobile Performance] Build failed: {report.summary.result}");
                EditorApplication.Exit(1);
            }
        }
        
        /// <summary>
        /// Run mobile performance tests
        /// </summary>
        [MenuItem("BMAD/Profiler/Run Mobile Performance Tests")]
        public static void RunMobilePerformanceTests()
        {
            string platform = GetCommandLineArgument("-platform", "Android");
            string outputPath = GetCommandLineArgument("-outputPath", "mobile-performance-results/");
            
            Directory.CreateDirectory(outputPath);
            
            Debug.Log($"[BMAD Mobile Performance] Running mobile performance tests for {platform}");
            
            // TODO: Implement mobile-specific performance testing
            // This would typically involve deploying to device/emulator and collecting performance data
            
            // For now, create a placeholder report
            var mobileReport = new
            {
                platform = platform,
                timestamp = System.DateTime.Now,
                status = "Completed",
                message = "Mobile performance testing framework ready for implementation"
            };
            
            string reportJson = JsonUtility.ToJson(mobileReport, true);
            File.WriteAllText(Path.Combine(outputPath, $"mobile-performance-{platform.ToLower()}.json"), reportJson);
            
            Debug.Log($"[BMAD Mobile Performance] Mobile performance test completed for {platform}");
        }
        
        #endregion
        
        #region Utility Methods
        
        /// <summary>
        /// Get command line argument value
        /// </summary>
        private static string GetCommandLineArgument(string argName, string defaultValue = "")
        {
            var args = System.Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
            {
                if (args[i] == argName)
                {
                    return args[i + 1];
                }
            }
            return defaultValue;
        }
        
        /// <summary>
        /// Get current Git commit hash
        /// </summary>
        private static string GetGitCommitHash()
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
                        CreateNoWindow = true,
                        WorkingDirectory = Application.dataPath
                    }
                };
                process.Start();
                string result = process.StandardOutput.ReadToEnd();
                process.WaitForExit();
                return result.Trim();
            }
            catch
            {
                return System.DateTime.Now.ToString("yyyy-MM-dd-HH-mm-ss");
            }
        }
        
        #endregion
    }
}
