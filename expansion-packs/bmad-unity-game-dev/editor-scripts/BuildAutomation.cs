using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace BMAD.Unity.EditorTools
{
    /// <summary>
    /// Multi-platform build automation system with comprehensive pre/post processing.
    /// Provides centralized build management for Unity projects with BMAD methodology integration.
    /// </summary>
    public class BuildAutomation : IPreprocessBuildWithReport, IPostprocessBuildWithReport
    {
        #region Build Configuration

        [System.Serializable]
        public class BuildConfiguration
        {
            public BuildTarget target;
            public string outputPath;
            public BuildOptions options;
            public string[] scenes;
            public bool enablePostProcessing;
            public Dictionary<string, string> customDefines;

            public BuildConfiguration()
            {
                customDefines = new Dictionary<string, string>();
                options = BuildOptions.None;
                enablePostProcessing = true;
            }
        }

        private static readonly Dictionary<BuildTarget, BuildConfiguration> s_BuildConfigs = 
            new Dictionary<BuildTarget, BuildConfiguration>();

        #endregion

        #region Menu Items

        /// <summary>
        /// Opens the Build Automation window for configuration and execution.
        /// </summary>
        [MenuItem("BMAD/Build Automation/Open Build Manager", priority = 100)]
        public static void OpenBuildManager()
        {
            var window = EditorWindow.GetWindow<BuildAutomationWindow>("Build Manager");
            window.minSize = new Vector2(600, 400);
            window.Show();
        }

        /// <summary>
        /// Performs a quick development build for the current platform.
        /// </summary>
        [MenuItem("BMAD/Build Automation/Quick Development Build", priority = 101)]
        public static void QuickDevelopmentBuild()
        {
            try
            {
                var config = GetOrCreateConfiguration(EditorUserBuildSettings.activeBuildTarget);
                config.options = BuildOptions.Development | BuildOptions.AllowDebugging;
                config.outputPath = GetDefaultOutputPath(EditorUserBuildSettings.activeBuildTarget);
                
                ExecuteBuild(config);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BuildAutomation] Quick build failed: {ex.Message}");
                EditorUtility.DisplayDialog("Build Failed", 
                    $"Quick development build failed:\n{ex.Message}", "OK");
            }
        }

        /// <summary>
        /// Builds for all configured platforms sequentially.
        /// </summary>
        [MenuItem("BMAD/Build Automation/Build All Platforms", priority = 102)]
        public static void BuildAllPlatforms()
        {
            if (!EditorUtility.DisplayDialog("Build All Platforms", 
                "This will build for all configured platforms. This may take a long time. Continue?", 
                "Build", "Cancel"))
            {
                return;
            }

            var platforms = new[] { BuildTarget.StandaloneWindows64, BuildTarget.StandaloneOSX, 
                                  BuildTarget.StandaloneLinux64, BuildTarget.Android, BuildTarget.iOS };
            
            int successful = 0;
            int failed = 0;

            foreach (var platform in platforms)
            {
                try
                {
                    if (s_BuildConfigs.ContainsKey(platform))
                    {
                        ExecuteBuild(s_BuildConfigs[platform]);
                        successful++;
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[BuildAutomation] Build failed for {platform}: {ex.Message}");
                    failed++;
                }
            }

            EditorUtility.DisplayDialog("Build Complete", 
                $"Multi-platform build complete!\nSuccessful: {successful}\nFailed: {failed}", "OK");
        }

        #endregion

        #region Build Execution

        /// <summary>
        /// Executes a build with the specified configuration.
        /// </summary>
        /// <param name="config">Build configuration to execute</param>
        /// <returns>Build report with results</returns>
        public static BuildReport ExecuteBuild(BuildConfiguration config)
        {
            if (config == null)
            {
                throw new ArgumentNullException(nameof(config), "Build configuration cannot be null");
            }

            Debug.Log($"[BuildAutomation] Starting build for {config.target}");
            var startTime = DateTime.Now;

            try
            {
                // Ensure output directory exists
                var outputDir = Path.GetDirectoryName(config.outputPath);
                if (!Directory.Exists(outputDir))
                {
                    Directory.CreateDirectory(outputDir);
                }

                // Apply custom defines
                ApplyCustomDefines(config);

                // Setup build player options
                var buildOptions = new BuildPlayerOptions
                {
                    scenes = config.scenes ?? GetEnabledScenes(),
                    locationPathName = config.outputPath,
                    target = config.target,
                    options = config.options
                };

                // Execute the build
                var report = BuildPipeline.BuildPlayer(buildOptions);
                var duration = DateTime.Now - startTime;

                // Log results
                if (report.summary.result == BuildResult.Succeeded)
                {
                    Debug.Log($"[BuildAutomation] Build completed successfully in {duration.TotalSeconds:F1}s");
                    Debug.Log($"[BuildAutomation] Output: {config.outputPath}");
                    Debug.Log($"[BuildAutomation] Size: {GetBuildSizeString(report.summary.totalSize)}");
                }
                else
                {
                    Debug.LogError($"[BuildAutomation] Build failed after {duration.TotalSeconds:F1}s");
                    LogBuildErrors(report);
                }

                return report;
            }
            catch (Exception ex)
            {
                var duration = DateTime.Now - startTime;
                Debug.LogError($"[BuildAutomation] Build exception after {duration.TotalSeconds:F1}s: {ex.Message}");
                throw;
            }
        }

        #endregion

        #region IPreprocessBuildWithReport Implementation

        public int callbackOrder => 0;

        /// <summary>
        /// Called before the build starts. Performs validation and setup.
        /// </summary>
        public void OnPreprocessBuild(BuildReport report)
        {
            Debug.Log("[BuildAutomation] Pre-processing build...");

            // Validate project settings
            ValidateProjectSettings(report.summary.platform);

            // Clean previous build artifacts if needed
            CleanBuildArtifacts(report.summary.outputPath);

            // Log build start
            Debug.Log($"[BuildAutomation] Starting build for {report.summary.platform}");
            Debug.Log($"[BuildAutomation] Output path: {report.summary.outputPath}");
        }

        #endregion

        #region IPostprocessBuildWithReport Implementation

        /// <summary>
        /// Called after the build completes. Performs cleanup and notifications.
        /// </summary>
        public void OnPostprocessBuild(BuildReport report)
        {
            Debug.Log("[BuildAutomation] Post-processing build...");

            if (report.summary.result == BuildResult.Succeeded)
            {
                // Create build info file
                CreateBuildInfoFile(report);

                // Archive build if configured
                ArchiveBuildIfConfigured(report);

                Debug.Log("[BuildAutomation] Post-processing completed successfully");
            }
            else
            {
                Debug.LogError("[BuildAutomation] Skipping post-processing due to build failure");
            }
        }

        #endregion

        #region Helper Methods

        private static BuildConfiguration GetOrCreateConfiguration(BuildTarget target)
        {
            if (!s_BuildConfigs.ContainsKey(target))
            {
                s_BuildConfigs[target] = new BuildConfiguration
                {
                    target = target,
                    outputPath = GetDefaultOutputPath(target),
                    scenes = GetEnabledScenes()
                };
            }
            return s_BuildConfigs[target];
        }

        private static string GetDefaultOutputPath(BuildTarget target)
        {
            var basePath = Path.Combine("Builds", target.ToString());
            var extension = GetBuildExtension(target);
            var fileName = $"{PlayerSettings.productName}{extension}";
            return Path.Combine(basePath, fileName);
        }

        private static string GetBuildExtension(BuildTarget target)
        {
            return target switch
            {
                BuildTarget.StandaloneWindows64 => ".exe",
                BuildTarget.StandaloneOSX => ".app",
                BuildTarget.Android => ".apk",
                BuildTarget.iOS => "",
                _ => ""
            };
        }

        private static string[] GetEnabledScenes()
        {
            var scenes = new List<string>();
            foreach (var scene in EditorBuildSettings.scenes)
            {
                if (scene.enabled && !string.IsNullOrEmpty(scene.path))
                {
                    scenes.Add(scene.path);
                }
            }
            return scenes.ToArray();
        }

        private static void ApplyCustomDefines(BuildConfiguration config)
        {
            if (config.customDefines?.Count > 0)
            {
                var currentDefines = PlayerSettings.GetScriptingDefineSymbolsForGroup(
                    BuildPipeline.GetBuildTargetGroup(config.target));
                
                foreach (var define in config.customDefines)
                {
                    if (!currentDefines.Contains(define.Key))
                    {
                        currentDefines += $";{define.Key}";
                    }
                }

                PlayerSettings.SetScriptingDefineSymbolsForGroup(
                    BuildPipeline.GetBuildTargetGroup(config.target), currentDefines);
            }
        }

        private static void ValidateProjectSettings(BuildTarget platform)
        {
            // Validate basic settings
            if (string.IsNullOrEmpty(PlayerSettings.productName))
            {
                Debug.LogWarning("[BuildAutomation] Product name is not set");
            }

            if (string.IsNullOrEmpty(PlayerSettings.companyName))
            {
                Debug.LogWarning("[BuildAutomation] Company name is not set");
            }

            // Platform-specific validation
            switch (platform)
            {
                case BuildTarget.Android:
                    if (string.IsNullOrEmpty(PlayerSettings.Android.bundleVersionCode.ToString()))
                    {
                        Debug.LogWarning("[BuildAutomation] Android bundle version code not set");
                    }
                    break;
                case BuildTarget.iOS:
                    if (string.IsNullOrEmpty(PlayerSettings.iOS.buildNumber))
                    {
                        Debug.LogWarning("[BuildAutomation] iOS build number not set");
                    }
                    break;
            }
        }

        private static void CleanBuildArtifacts(string outputPath)
        {
            var outputDir = Path.GetDirectoryName(outputPath);
            if (Directory.Exists(outputDir))
            {
                try
                {
                    Directory.Delete(outputDir, true);
                    Debug.Log($"[BuildAutomation] Cleaned build directory: {outputDir}");
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[BuildAutomation] Failed to clean build directory: {ex.Message}");
                }
            }
        }

        private static void CreateBuildInfoFile(BuildReport report)
        {
            try
            {
                var infoPath = Path.Combine(Path.GetDirectoryName(report.summary.outputPath), "BuildInfo.txt");
                var info = $"Build Information\n" +
                          $"================\n" +
                          $"Product: {PlayerSettings.productName}\n" +
                          $"Version: {PlayerSettings.bundleVersion}\n" +
                          $"Platform: {report.summary.platform}\n" +
                          $"Build Time: {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n" +
                          $"Unity Version: {Application.unityVersion}\n" +
                          $"Build Size: {GetBuildSizeString(report.summary.totalSize)}\n" +
                          $"Duration: {report.summary.buildEndedAt - report.summary.buildStartedAt}\n";

                File.WriteAllText(infoPath, info);
                Debug.Log($"[BuildAutomation] Created build info file: {infoPath}");
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[BuildAutomation] Failed to create build info file: {ex.Message}");
            }
        }

        private static void ArchiveBuildIfConfigured(BuildReport report)
        {
            // Implementation for build archiving would go here
            // This could include zipping builds, uploading to cloud storage, etc.
            Debug.Log("[BuildAutomation] Build archiving not implemented yet");
        }

        private static void LogBuildErrors(BuildReport report)
        {
            foreach (var step in report.steps)
            {
                foreach (var message in step.messages)
                {
                    if (message.type == LogType.Error || message.type == LogType.Exception)
                    {
                        Debug.LogError($"[BuildAutomation] {message.content}");
                    }
                }
            }
        }

        private static string GetBuildSizeString(ulong bytes)
        {
            if (bytes < 1024) return $"{bytes} B";
            if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} KB";
            if (bytes < 1024 * 1024 * 1024) return $"{bytes / (1024.0 * 1024):F1} MB";
            return $"{bytes / (1024.0 * 1024 * 1024):F1} GB";
        }

        #endregion
    }

    /// <summary>
    /// Editor window for build automation management.
    /// </summary>
    public class BuildAutomationWindow : EditorWindow
    {
        private Vector2 scrollPosition;
        
        private void OnGUI()
        {
            scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);
            
            GUILayout.Label("BMAD Build Automation", EditorStyles.boldLabel);
            GUILayout.Space(10);
            
            if (GUILayout.Button("Quick Development Build"))
            {
                BuildAutomation.QuickDevelopmentBuild();
            }
            
            if (GUILayout.Button("Build All Platforms"))
            {
                BuildAutomation.BuildAllPlatforms();
            }
            
            EditorGUILayout.EndScrollView();
        }
    }
}
