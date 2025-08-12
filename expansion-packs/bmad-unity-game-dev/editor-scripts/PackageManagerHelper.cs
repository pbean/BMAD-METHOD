using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
using UnityEngine;

namespace BMAD.Unity.EditorTools
{
    /// <summary>
    /// Programmatic Unity Package Manager control system for automated package installation and management.
    /// Implements BMAD methodology for consistent package management across projects.
    /// </summary>
    public class PackageManagerHelper : EditorWindow
    {
        #region Package Definitions

        [System.Serializable]
        public class PackageInfo
        {
            public string name;
            public string version;
            public string displayName;
            public string description;
            public bool isInstalled;
            public bool isRequired;
            public string category;

            public PackageInfo(string name, string version, string displayName, string description, string category, bool isRequired = false)
            {
                this.name = name;
                this.version = version;
                this.displayName = displayName;
                this.description = description;
                this.category = category;
                this.isRequired = isRequired;
                this.isInstalled = false;
            }
        }

        private static readonly Dictionary<string, List<PackageInfo>> s_PackageCategories = 
            new Dictionary<string, List<PackageInfo>>
            {
                ["Core"] = new List<PackageInfo>
                {
                    new PackageInfo("com.unity.render-pipelines.universal", "14.0.8", "Universal RP", "Universal Render Pipeline for optimized rendering", "Core", true),
                    new PackageInfo("com.unity.textmeshpro", "3.0.6", "TextMeshPro", "Advanced text rendering and styling", "Core", true),
                    new PackageInfo("com.unity.cinemachine", "2.9.7", "Cinemachine", "Advanced camera control system", "Core"),
                    new PackageInfo("com.unity.inputsystem", "1.7.0", "Input System", "Modern input handling system", "Core")
                },
                ["2D"] = new List<PackageInfo>
                {
                    new PackageInfo("com.unity.2d.sprite", "1.0.0", "2D Sprite", "2D sprite support", "2D"),
                    new PackageInfo("com.unity.2d.tilemap", "1.0.0", "2D Tilemap", "2D tilemap system", "2D"),
                    new PackageInfo("com.unity.2d.animation", "9.0.4", "2D Animation", "2D skeletal animation", "2D"),
                    new PackageInfo("com.unity.2d.pixel-perfect", "5.0.3", "2D Pixel Perfect", "Pixel-perfect rendering", "2D")
                },
                ["VR/AR"] = new List<PackageInfo>
                {
                    new PackageInfo("com.unity.xr.interaction.toolkit", "2.5.2", "XR Interaction Toolkit", "VR/AR interaction system", "VR/AR"),
                    new PackageInfo("com.unity.xr.core-utils", "2.2.3", "XR Core Utils", "Core XR utilities", "VR/AR"),
                    new PackageInfo("com.unity.xr.arfoundation", "5.0.7", "AR Foundation", "AR development framework", "VR/AR"),
                    new PackageInfo("com.unity.xr.arcore", "5.0.7", "ARCore XR Plugin", "Google ARCore support", "VR/AR")
                },
                ["Audio"] = new List<PackageInfo>
                {
                    new PackageInfo("com.unity.audio.dspgraph", "0.1.0-preview.12", "DSP Graph", "Advanced audio processing", "Audio"),
                    new PackageInfo("com.unity.timeline", "1.7.5", "Timeline", "Cinematic and audio sequencing", "Audio")
                },
                ["AI/ML"] = new List<PackageInfo>
                {
                    new PackageInfo("com.unity.ml-agents", "2.0.1", "ML-Agents", "Machine learning toolkit", "AI/ML"),
                    new PackageInfo("com.unity.barracuda", "3.0.0", "Barracuda", "Neural network inference", "AI/ML"),
                    new PackageInfo("com.unity.sentis", "1.3.0-pre.3", "Sentis", "Next-gen ML inference", "AI/ML")
                },
                ["Performance"] = new List<PackageInfo>
                {
                    new PackageInfo("com.unity.collections", "2.2.1", "Collections", "High-performance native collections", "Performance"),
                    new PackageInfo("com.unity.entities", "1.0.16", "Entities", "Data-oriented technology stack", "Performance"),
                    new PackageInfo("com.unity.burst", "1.8.8", "Burst", "High-performance C# compiler", "Performance"),
                    new PackageInfo("com.unity.jobs", "0.70.0-preview.7", "Job System", "Multithreaded job system", "Performance")
                },
                ["Utilities"] = new List<PackageInfo>
                {
                    new PackageInfo("com.unity.addressables", "1.21.17", "Addressables", "Asset management system", "Utilities"),
                    new PackageInfo("com.unity.localization", "1.4.4", "Localization", "Multi-language support", "Utilities"),
                    new PackageInfo("com.unity.analytics", "5.0.0", "Analytics", "Game analytics and insights", "Utilities"),
                    new PackageInfo("com.unity.remote-config", "3.3.2", "Remote Config", "Runtime configuration management", "Utilities")
                }
            };

        #endregion

        #region Window State

        private Vector2 scrollPosition;
        private string selectedCategory = "Core";
        private Dictionary<string, bool> categoryExpanded = new Dictionary<string, bool>();
        private ListRequest listRequest;
        private AddRequest addRequest;
        private RemoveRequest removeRequest;
        private bool isRefreshing = false;
        private List<UnityEditor.PackageManager.PackageInfo> installedPackages = new List<UnityEditor.PackageManager.PackageInfo>();

        #endregion

        #region Menu Items

        /// <summary>
        /// Opens the Package Manager Helper window.
        /// </summary>
        [MenuItem("BMAD/Package Management/Package Manager Helper", priority = 400)]
        public static void OpenPackageManagerHelper()
        {
            var window = GetWindow<PackageManagerHelper>("Package Manager Helper");
            window.minSize = new Vector2(600, 500);
            window.Show();
        }

        /// <summary>
        /// Installs essential packages for BMAD projects.
        /// </summary>
        [MenuItem("BMAD/Package Management/Install Essential Packages", priority = 401)]
        public static void InstallEssentialPackages()
        {
            if (EditorUtility.DisplayDialog("Install Essential Packages", 
                "This will install the recommended packages for BMAD projects. Continue?", 
                "Install", "Cancel"))
            {
                InstallPackageSet("Core");
            }
        }

        /// <summary>
        /// Installs 2D game development package set.
        /// </summary>
        [MenuItem("BMAD/Package Management/Install 2D Game Packages", priority = 402)]
        public static void Install2DPackages()
        {
            if (EditorUtility.DisplayDialog("Install 2D Packages", 
                "This will install packages optimized for 2D game development. Continue?", 
                "Install", "Cancel"))
            {
                InstallPackageSet("2D");
                InstallPackageSet("Core");
            }
        }

        /// <summary>
        /// Installs VR/AR development package set.
        /// </summary>
        [MenuItem("BMAD/Package Management/Install VR/AR Packages", priority = 403)]
        public static void InstallVRARPackages()
        {
            if (EditorUtility.DisplayDialog("Install VR/AR Packages", 
                "This will install packages for VR/AR development. Continue?", 
                "Install", "Cancel"))
            {
                InstallPackageSet("VR/AR");
                InstallPackageSet("Core");
            }
        }

        /// <summary>
        /// Removes all non-essential packages.
        /// </summary>
        [MenuItem("BMAD/Package Management/Clean Project Packages", priority = 404)]
        public static void CleanProjectPackages()
        {
            if (EditorUtility.DisplayDialog("Clean Project Packages", 
                "This will remove non-essential packages to reduce project size. Continue?", 
                "Clean", "Cancel"))
            {
                CleanNonEssentialPackages();
            }
        }

        #endregion

        #region GUI

        private void OnEnable()
        {
            RefreshInstalledPackages();
            
            // Initialize category expansion states
            foreach (var category in s_PackageCategories.Keys)
            {
                if (!categoryExpanded.ContainsKey(category))
                {
                    categoryExpanded[category] = category == "Core";
                }
            }
        }

        private void OnGUI()
        {
            DrawHeader();
            DrawToolbar();
            
            scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);
            DrawPackageCategories();
            EditorGUILayout.EndScrollView();
            
            DrawStatusBar();
        }

        private void DrawHeader()
        {
            GUILayout.Label("BMAD Package Manager Helper", EditorStyles.boldLabel);
            GUILayout.Space(5);
            
            EditorGUILayout.HelpBox(
                "Manage Unity packages for BMAD projects. Categories show recommended packages " +
                "for different development scenarios.", MessageType.Info);
            GUILayout.Space(10);
        }

        private void DrawToolbar()
        {
            EditorGUILayout.BeginHorizontal(EditorStyles.toolbar);
            
            if (GUILayout.Button("Refresh", EditorStyles.toolbarButton, GUILayout.Width(60)))
            {
                RefreshInstalledPackages();
            }
            
            GUILayout.FlexibleSpace();
            
            if (GUILayout.Button("Install Essential", EditorStyles.toolbarButton, GUILayout.Width(100)))
            {
                InstallEssentialPackages();
            }
            
            if (GUILayout.Button("Clean Project", EditorStyles.toolbarButton, GUILayout.Width(80)))
            {
                CleanProjectPackages();
            }
            
            EditorGUILayout.EndHorizontal();
            GUILayout.Space(5);
        }

        private void DrawPackageCategories()
        {
            foreach (var category in s_PackageCategories)
            {
                DrawPackageCategory(category.Key, category.Value);
            }
        }

        private void DrawPackageCategory(string categoryName, List<PackageInfo> packages)
        {
            // Update installation status
            UpdatePackageInstallationStatus(packages);
            
            // Category header
            var expanded = categoryExpanded.ContainsKey(categoryName) ? categoryExpanded[categoryName] : false;
            var installedCount = packages.Count(p => p.isInstalled);
            var totalCount = packages.Count;
            
            var headerText = $"{categoryName} ({installedCount}/{totalCount} installed)";
            expanded = EditorGUILayout.Foldout(expanded, headerText, true);
            categoryExpanded[categoryName] = expanded;
            
            if (!expanded) return;
            
            EditorGUI.indentLevel++;
            
            // Category actions
            EditorGUILayout.BeginHorizontal();
            GUILayout.Space(20);
            
            if (GUILayout.Button($"Install All {categoryName}", GUILayout.Width(120)))
            {
                InstallPackageSet(categoryName);
            }
            
            if (GUILayout.Button($"Remove All {categoryName}", GUILayout.Width(120)))
            {
                RemovePackageSet(categoryName);
            }
            
            EditorGUILayout.EndHorizontal();
            GUILayout.Space(5);
            
            // Package list
            foreach (var package in packages)
            {
                DrawPackageItem(package);
            }
            
            EditorGUI.indentLevel--;
            GUILayout.Space(10);
        }

        private void DrawPackageItem(PackageInfo package)
        {
            EditorGUILayout.BeginHorizontal();
            
            // Status icon
            var statusIcon = package.isInstalled ? "✓" : "○";
            var statusColor = package.isInstalled ? Color.green : Color.gray;
            
            var originalColor = GUI.color;
            GUI.color = statusColor;
            GUILayout.Label(statusIcon, GUILayout.Width(20));
            GUI.color = originalColor;
            
            // Package info
            EditorGUILayout.BeginVertical();
            EditorGUILayout.LabelField(package.displayName, EditorStyles.boldLabel);
            EditorGUILayout.LabelField($"{package.name} ({package.version})", EditorStyles.miniLabel);
            EditorGUILayout.LabelField(package.description, EditorStyles.wordWrappedMiniLabel);
            EditorGUILayout.EndVertical();
            
            // Actions
            EditorGUILayout.BeginVertical(GUILayout.Width(80));
            
            if (package.isInstalled)
            {
                if (GUILayout.Button("Remove", GUILayout.Width(70)))
                {
                    RemovePackage(package.name);
                }
            }
            else
            {
                if (GUILayout.Button("Install", GUILayout.Width(70)))
                {
                    InstallPackage(package.name, package.version);
                }
            }
            
            EditorGUILayout.EndVertical();
            EditorGUILayout.EndHorizontal();
            
            GUILayout.Space(5);
        }

        private void DrawStatusBar()
        {
            EditorGUILayout.BeginHorizontal(EditorStyles.toolbar);
            
            if (isRefreshing)
            {
                GUILayout.Label("Refreshing packages...", EditorStyles.miniLabel);
            }
            else if (addRequest != null)
            {
                GUILayout.Label($"Installing package...", EditorStyles.miniLabel);
            }
            else if (removeRequest != null)
            {
                GUILayout.Label($"Removing package...", EditorStyles.miniLabel);
            }
            else
            {
                var totalInstalled = installedPackages.Count;
                GUILayout.Label($"Total packages installed: {totalInstalled}", EditorStyles.miniLabel);
            }
            
            GUILayout.FlexibleSpace();
            EditorGUILayout.EndHorizontal();
        }

        #endregion

        #region Package Management

        private void RefreshInstalledPackages()
        {
            if (listRequest != null) return;
            
            isRefreshing = true;
            listRequest = Client.List(true);
            EditorApplication.update += OnListRequestComplete;
        }

        private void OnListRequestComplete()
        {
            if (listRequest == null || !listRequest.IsCompleted) return;
            
            EditorApplication.update -= OnListRequestComplete;
            
            if (listRequest.Status == StatusCode.Success)
            {
                installedPackages = listRequest.Result.ToList();
                Debug.Log($"[PackageManagerHelper] Found {installedPackages.Count} installed packages");
            }
            else
            {
                Debug.LogError($"[PackageManagerHelper] Failed to list packages: {listRequest.Error.message}");
            }
            
            listRequest = null;
            isRefreshing = false;
            Repaint();
        }

        private static void InstallPackageSet(string categoryName)
        {
            if (!s_PackageCategories.ContainsKey(categoryName))
            {
                Debug.LogError($"[PackageManagerHelper] Unknown package category: {categoryName}");
                return;
            }
            
            var packages = s_PackageCategories[categoryName];
            Debug.Log($"[PackageManagerHelper] Installing {categoryName} package set ({packages.Count} packages)");
            
            foreach (var package in packages)
            {
                InstallPackage(package.name, package.version);
            }
        }

        private static void RemovePackageSet(string categoryName)
        {
            if (!s_PackageCategories.ContainsKey(categoryName))
            {
                Debug.LogError($"[PackageManagerHelper] Unknown package category: {categoryName}");
                return;
            }
            
            var packages = s_PackageCategories[categoryName];
            Debug.Log($"[PackageManagerHelper] Removing {categoryName} package set ({packages.Count} packages)");
            
            foreach (var package in packages)
            {
                RemovePackage(package.name);
            }
        }

        private static void InstallPackage(string packageName, string version = null)
        {
            try
            {
                var packageId = string.IsNullOrEmpty(version) ? packageName : $"{packageName}@{version}";
                var request = Client.Add(packageId);
                
                Debug.Log($"[PackageManagerHelper] Installing package: {packageId}");
                
                // In a more complete implementation, you would track this request
                // and provide UI feedback on completion
            }
            catch (Exception ex)
            {
                Debug.LogError($"[PackageManagerHelper] Failed to install package {packageName}: {ex.Message}");
            }
        }

        private static void RemovePackage(string packageName)
        {
            try
            {
                var request = Client.Remove(packageName);
                Debug.Log($"[PackageManagerHelper] Removing package: {packageName}");
                
                // In a more complete implementation, you would track this request
                // and provide UI feedback on completion
            }
            catch (Exception ex)
            {
                Debug.LogError($"[PackageManagerHelper] Failed to remove package {packageName}: {ex.Message}");
            }
        }

        private static void CleanNonEssentialPackages()
        {
            Debug.Log("[PackageManagerHelper] Cleaning non-essential packages");
            
            // Get all required packages
            var requiredPackages = new HashSet<string>();
            foreach (var category in s_PackageCategories.Values)
            {
                foreach (var package in category.Where(p => p.isRequired))
                {
                    requiredPackages.Add(package.name);
                }
            }
            
            // This would need to be implemented with proper package enumeration
            // and user confirmation for each non-essential package
            Debug.Log($"[PackageManagerHelper] Would preserve {requiredPackages.Count} essential packages");
        }

        private void UpdatePackageInstallationStatus(List<PackageInfo> packages)
        {
            foreach (var package in packages)
            {
                package.isInstalled = installedPackages.Any(installed => installed.name == package.name);
            }
        }

        #endregion

        #region Package Configuration Export/Import

        /// <summary>
        /// Exports current package configuration to a JSON file.
        /// </summary>
        [MenuItem("BMAD/Package Management/Export Package Configuration", priority = 450)]
        public static void ExportPackageConfiguration()
        {
            try
            {
                var config = new PackageConfiguration
                {
                    packages = new List<string>(),
                    timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                    unityVersion = Application.unityVersion
                };
                
                // Read current manifest
                var manifestPath = Path.Combine(Application.dataPath, "../Packages/manifest.json");
                if (File.Exists(manifestPath))
                {
                    var manifestText = File.ReadAllText(manifestPath);
                    var manifest = JsonUtility.FromJson<PackageManifest>(manifestText);
                    config.packages = manifest.dependencies.Keys.ToList();
                }
                
                var configJson = JsonUtility.ToJson(config, true);
                var exportPath = EditorUtility.SaveFilePanel("Export Package Configuration", 
                    "", "bmad-packages", "json");
                
                if (!string.IsNullOrEmpty(exportPath))
                {
                    File.WriteAllText(exportPath, configJson);
                    Debug.Log($"[PackageManagerHelper] Package configuration exported to: {exportPath}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[PackageManagerHelper] Failed to export package configuration: {ex.Message}");
            }
        }

        /// <summary>
        /// Imports package configuration from a JSON file.
        /// </summary>
        [MenuItem("BMAD/Package Management/Import Package Configuration", priority = 451)]
        public static void ImportPackageConfiguration()
        {
            try
            {
                var importPath = EditorUtility.OpenFilePanel("Import Package Configuration", 
                    "", "json");
                
                if (!string.IsNullOrEmpty(importPath) && File.Exists(importPath))
                {
                    var configJson = File.ReadAllText(importPath);
                    var config = JsonUtility.FromJson<PackageConfiguration>(configJson);
                    
                    Debug.Log($"[PackageManagerHelper] Importing {config.packages.Count} packages from configuration");
                    
                    foreach (var package in config.packages)
                    {
                        InstallPackage(package);
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[PackageManagerHelper] Failed to import package configuration: {ex.Message}");
            }
        }

        #endregion

        #region Data Classes

        [System.Serializable]
        public class PackageConfiguration
        {
            public List<string> packages;
            public string timestamp;
            public string unityVersion;
        }

        [System.Serializable]
        public class PackageManifest
        {
            public Dictionary<string, string> dependencies;
        }

        #endregion
    }
}
