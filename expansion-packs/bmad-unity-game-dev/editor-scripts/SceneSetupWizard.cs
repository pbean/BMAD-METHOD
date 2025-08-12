using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace BMAD.Unity.EditorTools
{
    /// <summary>
    /// Scene template creation wizard with comprehensive lighting, camera, and post-processing setup.
    /// Implements BMAD methodology for consistent scene structure and quality standards.
    /// </summary>
    public class SceneSetupWizard : EditorWindow
    {
        #region Scene Template Types

        public enum SceneTemplateType
        {
            Empty,
            Basic2D,
            Basic3D,
            TopDown2D,
            Platformer2D,
            FirstPerson3D,
            ThirdPerson3D,
            Racing3D,
            Strategy3D,
            VR,
            AR
        }

        public enum LightingSetup
        {
            Unlit,
            Basic,
            Realistic,
            Stylized,
            Performance,
            Cinematic
        }

        public enum PostProcessingProfile
        {
            None,
            Realistic,
            Stylized,
            HighContrast,
            Vintage,
            SciFi,
            Fantasy
        }

        #endregion

        #region Window State

        private SceneTemplateType sceneType = SceneTemplateType.Basic3D;
        private LightingSetup lightingSetup = LightingSetup.Basic;
        private PostProcessingProfile postProcessing = PostProcessingProfile.None;
        private string sceneName = "NewScene";
        private string sceneFolder = "Assets/Scenes";
        private bool includeAudioListener = true;
        private bool includeEventSystem = true;
        private bool setupPhysics = true;
        private bool createPrefabVariant = false;
        private Vector2 scrollPosition;

        #endregion

        #region Menu Items

        /// <summary>
        /// Opens the Scene Setup Wizard window.
        /// </summary>
        [MenuItem("BMAD/Scene Management/Scene Setup Wizard", priority = 300)]
        public static void OpenSceneSetupWizard()
        {
            var window = GetWindow<SceneSetupWizard>("Scene Setup Wizard");
            window.minSize = new Vector2(450, 600);
            window.Show();
        }

        /// <summary>
        /// Creates a basic 3D scene with standard components.
        /// </summary>
        [MenuItem("BMAD/Scene Management/Quick Setup/Basic 3D Scene", priority = 301)]
        public static void CreateBasic3DScene()
        {
            CreateSceneFromTemplate(SceneTemplateType.Basic3D, LightingSetup.Basic, 
                PostProcessingProfile.None, "Basic3DScene");
        }

        /// <summary>
        /// Creates a basic 2D scene optimized for 2D games.
        /// </summary>
        [MenuItem("BMAD/Scene Management/Quick Setup/Basic 2D Scene", priority = 302)]
        public static void CreateBasic2DScene()
        {
            CreateSceneFromTemplate(SceneTemplateType.Basic2D, LightingSetup.Unlit, 
                PostProcessingProfile.None, "Basic2DScene");
        }

        /// <summary>
        /// Creates a VR-ready scene with proper setup.
        /// </summary>
        [MenuItem("BMAD/Scene Management/Quick Setup/VR Scene", priority = 303)]
        public static void CreateVRScene()
        {
            CreateSceneFromTemplate(SceneTemplateType.VR, LightingSetup.Realistic, 
                PostProcessingProfile.Realistic, "VRScene");
        }

        #endregion

        #region GUI

        private void OnGUI()
        {
            scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);

            DrawHeader();
            DrawSceneConfiguration();
            DrawLightingConfiguration();
            DrawPostProcessingConfiguration();
            DrawAdditionalOptions();
            DrawCreateButton();

            EditorGUILayout.EndScrollView();
        }

        private void DrawHeader()
        {
            GUILayout.Label("BMAD Scene Setup Wizard", EditorStyles.boldLabel);
            GUILayout.Space(10);

            EditorGUILayout.HelpBox(
                "This wizard creates optimized scene templates with proper lighting, camera setup, " +
                "and post-processing configuration following BMAD methodology.", 
                MessageType.Info);
            GUILayout.Space(10);
        }

        private void DrawSceneConfiguration()
        {
            GUILayout.Label("Scene Configuration", EditorStyles.boldLabel);

            sceneName = EditorGUILayout.TextField("Scene Name", sceneName);
            sceneFolder = EditorGUILayout.TextField("Scene Folder", sceneFolder);

            GUILayout.Space(5);
            sceneType = (SceneTemplateType)EditorGUILayout.EnumPopup("Scene Template", sceneType);

            // Show description for selected template
            EditorGUILayout.HelpBox(GetSceneTemplateDescription(sceneType), MessageType.None);
            GUILayout.Space(10);
        }

        private void DrawLightingConfiguration()
        {
            GUILayout.Label("Lighting Setup", EditorStyles.boldLabel);
            lightingSetup = (LightingSetup)EditorGUILayout.EnumPopup("Lighting Type", lightingSetup);
            EditorGUILayout.HelpBox(GetLightingDescription(lightingSetup), MessageType.None);
            GUILayout.Space(10);
        }

        private void DrawPostProcessingConfiguration()
        {
            GUILayout.Label("Post-Processing", EditorStyles.boldLabel);
            postProcessing = (PostProcessingProfile)EditorGUILayout.EnumPopup("Profile", postProcessing);
            EditorGUILayout.HelpBox(GetPostProcessingDescription(postProcessing), MessageType.None);
            GUILayout.Space(10);
        }

        private void DrawAdditionalOptions()
        {
            GUILayout.Label("Additional Options", EditorStyles.boldLabel);

            includeAudioListener = EditorGUILayout.Toggle("Include Audio Listener", includeAudioListener);
            includeEventSystem = EditorGUILayout.Toggle("Include Event System", includeEventSystem);
            setupPhysics = EditorGUILayout.Toggle("Setup Physics", setupPhysics);
            createPrefabVariant = EditorGUILayout.Toggle("Create Prefab Variant", createPrefabVariant);

            GUILayout.Space(10);
        }

        private void DrawCreateButton()
        {
            GUI.enabled = !string.IsNullOrEmpty(sceneName);

            if (GUILayout.Button("Create Scene", GUILayout.Height(30)))
            {
                CreateScene();
            }

            GUI.enabled = true;
        }

        #endregion

        #region Scene Creation

        private void CreateScene()
        {
            try
            {
                CreateSceneFromTemplate(sceneType, lightingSetup, postProcessing, sceneName);
                Close();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[SceneSetupWizard] Failed to create scene: {ex.Message}");
                EditorUtility.DisplayDialog("Scene Creation Failed", 
                    $"Failed to create scene: {ex.Message}", "OK");
            }
        }

        private static void CreateSceneFromTemplate(SceneTemplateType templateType, 
            LightingSetup lighting, PostProcessingProfile postProc, string name)
        {
            Debug.Log($"[SceneSetupWizard] Creating scene: {name} ({templateType})");

            // Create new scene
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            
            // Setup basic scene structure
            SetupSceneHierarchy(templateType);
            
            // Configure lighting
            SetupLighting(lighting);
            
            // Setup post-processing
            SetupPostProcessing(postProc);
            
            // Setup cameras based on template
            SetupCameras(templateType);
            
            // Save the scene
            SaveScene(name, "Assets/Scenes");
            
            Debug.Log($"[SceneSetupWizard] Scene created successfully: {name}");
        }

        private static void SetupSceneHierarchy(SceneTemplateType templateType)
        {
            switch (templateType)
            {
                case SceneTemplateType.Basic2D:
                    Setup2DScene();
                    break;
                case SceneTemplateType.Basic3D:
                    Setup3DScene();
                    break;
                case SceneTemplateType.TopDown2D:
                    SetupTopDown2DScene();
                    break;
                case SceneTemplateType.Platformer2D:
                    SetupPlatformer2DScene();
                    break;
                case SceneTemplateType.FirstPerson3D:
                    SetupFirstPerson3DScene();
                    break;
                case SceneTemplateType.ThirdPerson3D:
                    SetupThirdPerson3DScene();
                    break;
                case SceneTemplateType.VR:
                    SetupVRScene();
                    break;
                case SceneTemplateType.AR:
                    SetupARScene();
                    break;
                default:
                    SetupEmptyScene();
                    break;
            }
        }

        private static void Setup2DScene()
        {
            // Create main camera with 2D settings
            var cameraGO = new GameObject("Main Camera");
            var camera = cameraGO.AddComponent<Camera>();
            camera.orthographic = true;
            camera.orthographicSize = 5f;
            camera.backgroundColor = Color.black;
            camera.tag = "MainCamera";
            cameraGO.AddComponent<AudioListener>();

            // Create Canvas for UI
            CreateCanvas2D();

            // Set 2D physics settings
            Physics2D.gravity = new Vector2(0, -9.81f);
        }

        private static void Setup3DScene()
        {
            // Create main camera
            var cameraGO = new GameObject("Main Camera");
            var camera = cameraGO.AddComponent<Camera>();
            camera.transform.position = new Vector3(0, 1, -10);
            camera.backgroundColor = new Color(0.192f, 0.3f, 0.475f);
            camera.tag = "MainCamera";
            cameraGO.AddComponent<AudioListener>();

            // Create directional light
            var lightGO = new GameObject("Directional Light");
            var light = lightGO.AddComponent<Light>();
            light.type = LightType.Directional;
            light.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

            // Create a ground plane
            var planeGO = GameObject.CreatePrimitive(PrimitiveType.Plane);
            planeGO.name = "Ground";
            planeGO.transform.position = Vector3.zero;
            planeGO.transform.localScale = new Vector3(10, 1, 10);
        }

        private static void SetupTopDown2DScene()
        {
            Setup2DScene();
            
            var camera = Camera.main;
            if (camera != null)
            {
                camera.transform.position = new Vector3(0, 10, 0);
                camera.transform.rotation = Quaternion.Euler(90, 0, 0);
                camera.orthographicSize = 8f;
            }
        }

        private static void SetupPlatformer2DScene()
        {
            Setup2DScene();
            
            // Add sample platforms
            CreatePlatform("Ground", new Vector3(0, -4, 0), new Vector3(20, 1, 1));
            CreatePlatform("Platform1", new Vector3(-5, -1, 0), new Vector3(4, 1, 1));
            CreatePlatform("Platform2", new Vector3(5, 2, 0), new Vector3(4, 1, 1));
        }

        private static void SetupFirstPerson3DScene()
        {
            Setup3DScene();
            
            var camera = Camera.main;
            if (camera != null)
            {
                camera.transform.position = new Vector3(0, 1.8f, 0);
                camera.fieldOfView = 75f;
                
                // Add FPS controller placeholder
                var controller = camera.gameObject.AddComponent<CharacterController>();
                controller.height = 1.8f;
                controller.radius = 0.5f;
            }
        }

        private static void SetupThirdPerson3DScene()
        {
            Setup3DScene();
            
            // Create player placeholder
            var playerGO = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            playerGO.name = "Player";
            playerGO.transform.position = new Vector3(0, 1, 0);
            playerGO.AddComponent<CharacterController>();
            
            // Position camera for third person
            var camera = Camera.main;
            if (camera != null)
            {
                camera.transform.position = new Vector3(0, 3, -5);
                camera.transform.LookAt(playerGO.transform);
            }
        }

        private static void SetupVRScene()
        {
            // Create XR Origin
            var xrOrigin = new GameObject("XR Origin");
            var cameraOffset = new GameObject("Camera Offset");
            cameraOffset.transform.SetParent(xrOrigin.transform);
            
            var cameraGO = new GameObject("Main Camera");
            cameraGO.transform.SetParent(cameraOffset.transform);
            cameraGO.transform.localPosition = new Vector3(0, 1.36f, 0);
            
            var camera = cameraGO.AddComponent<Camera>();
            camera.tag = "MainCamera";
            cameraGO.AddComponent<AudioListener>();
            
            // Add VR-specific lighting
            SetupVRLighting();
        }

        private static void SetupARScene()
        {
            // Create AR Camera
            var cameraGO = new GameObject("AR Camera");
            var camera = cameraGO.AddComponent<Camera>();
            camera.backgroundColor = Color.black;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.tag = "MainCamera";
            cameraGO.AddComponent<AudioListener>();
            
            // Add AR-specific setup
            Debug.Log("[SceneSetupWizard] AR Scene created - Add AR Foundation packages for full functionality");
        }

        private static void SetupEmptyScene()
        {
            // Create basic camera only
            var cameraGO = new GameObject("Main Camera");
            var camera = cameraGO.AddComponent<Camera>();
            camera.tag = "MainCamera";
            cameraGO.AddComponent<AudioListener>();
        }

        #endregion

        #region Lighting Setup

        private static void SetupLighting(LightingSetup lightingType)
        {
            switch (lightingType)
            {
                case LightingSetup.Basic:
                    SetupBasicLighting();
                    break;
                case LightingSetup.Realistic:
                    SetupRealisticLighting();
                    break;
                case LightingSetup.Stylized:
                    SetupStylizedLighting();
                    break;
                case LightingSetup.Performance:
                    SetupPerformanceLighting();
                    break;
                case LightingSetup.Cinematic:
                    SetupCinematicLighting();
                    break;
                case LightingSetup.Unlit:
                default:
                    // No additional lighting setup
                    break;
            }
            
            // Configure render settings
            ConfigureRenderSettings(lightingType);
        }

        private static void SetupBasicLighting()
        {
            var sun = GameObject.Find("Directional Light");
            if (sun == null)
            {
                var lightGO = new GameObject("Directional Light");
                var light = lightGO.AddComponent<Light>();
                light.type = LightType.Directional;
                light.intensity = 1.0f;
                light.transform.rotation = Quaternion.Euler(45f, -30f, 0f);
            }
        }

        private static void SetupRealisticLighting()
        {
            SetupBasicLighting();
            
            // Add fill light
            var fillLightGO = new GameObject("Fill Light");
            var fillLight = fillLightGO.AddComponent<Light>();
            fillLight.type = LightType.Directional;
            fillLight.intensity = 0.3f;
            fillLight.color = new Color(0.8f, 0.9f, 1.0f);
            fillLight.transform.rotation = Quaternion.Euler(-45f, 150f, 0f);
            
            // Configure realistic settings
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.54f, 0.58f, 0.66f);
            RenderSettings.ambientEquatorColor = new Color(0.4f, 0.4f, 0.4f);
            RenderSettings.ambientGroundColor = new Color(0.2f, 0.2f, 0.2f);
        }

        private static void SetupStylizedLighting()
        {
            SetupBasicLighting();
            
            // Adjust for stylized look
            var sun = GameObject.Find("Directional Light")?.GetComponent<Light>();
            if (sun != null)
            {
                sun.intensity = 1.2f;
                sun.color = new Color(1.0f, 0.95f, 0.8f);
            }
            
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.4f, 0.5f, 0.7f);
        }

        private static void SetupPerformanceLighting()
        {
            // Minimal lighting for performance
            var lightGO = new GameObject("Directional Light");
            var light = lightGO.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.0f;
            light.shadows = LightShadows.None;
            
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.5f, 0.5f, 0.5f);
        }

        private static void SetupCinematicLighting()
        {
            // Three-point lighting setup
            SetupRealisticLighting();
            
            // Add rim light
            var rimLightGO = new GameObject("Rim Light");
            var rimLight = rimLightGO.AddComponent<Light>();
            rimLight.type = LightType.Directional;
            rimLight.intensity = 0.8f;
            rimLight.color = new Color(0.8f, 0.9f, 1.0f);
            rimLight.transform.rotation = Quaternion.Euler(0f, 180f, 0f);
        }

        private static void SetupVRLighting()
        {
            // VR-optimized lighting
            SetupPerformanceLighting();
            
            // Ensure proper lighting for VR comfort
            RenderSettings.ambientLight = new Color(0.3f, 0.3f, 0.3f);
        }

        private static void ConfigureRenderSettings(LightingSetup lightingType)
        {
            switch (lightingType)
            {
                case LightingSetup.Realistic:
                    RenderSettings.defaultReflectionMode = DefaultReflectionMode.Skybox;
                    break;
                case LightingSetup.Performance:
                    RenderSettings.defaultReflectionMode = DefaultReflectionMode.Custom;
                    break;
            }
        }

        #endregion

        #region Post-Processing Setup

        private static void SetupPostProcessing(PostProcessingProfile profile)
        {
            if (profile == PostProcessingProfile.None) return;
            
            // Create post-processing volume
            var volumeGO = new GameObject("Global Volume");
            var volume = volumeGO.AddComponent<Volume>();
            volume.isGlobal = true;
            
            // Create and assign profile
            var urpAsset = GraphicsSettings.renderPipelineAsset as UniversalRenderPipelineAsset;
            if (urpAsset != null)
            {
                CreatePostProcessingProfile(volume, profile);
            }
            else
            {
                Debug.LogWarning("[SceneSetupWizard] URP not detected - Post-processing requires Universal Render Pipeline");
            }
        }

        private static void CreatePostProcessingProfile(Volume volume, PostProcessingProfile profileType)
        {
            // This is a simplified version - in a real implementation, you would create
            // VolumeProfile assets with specific post-processing effects configured
            Debug.Log($"[SceneSetupWizard] Post-processing profile '{profileType}' setup would be implemented here");
        }

        #endregion

        #region Helper Methods

        private static void SetupCameras(SceneTemplateType templateType)
        {
            var camera = Camera.main;
            if (camera == null) return;
            
            switch (templateType)
            {
                case SceneTemplateType.Basic2D:
                case SceneTemplateType.TopDown2D:
                case SceneTemplateType.Platformer2D:
                    camera.orthographic = true;
                    break;
                default:
                    camera.orthographic = false;
                    break;
            }
        }

        private static void CreateCanvas2D()
        {
            var canvasGO = new GameObject("Canvas");
            var canvas = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGO.AddComponent<CanvasScaler>();
            canvasGO.AddComponent<GraphicRaycaster>();
            
            // Create EventSystem
            var eventSystemGO = new GameObject("EventSystem");
            eventSystemGO.AddComponent<UnityEngine.EventSystems.EventSystem>();
            eventSystemGO.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
        }

        private static void CreatePlatform(string name, Vector3 position, Vector3 scale)
        {
            var platform = GameObject.CreatePrimitive(PrimitiveType.Cube);
            platform.name = name;
            platform.transform.position = position;
            platform.transform.localScale = scale;
        }

        private static void SaveScene(string sceneName, string folder)
        {
            // Ensure folder exists
            if (!AssetDatabase.IsValidFolder(folder))
            {
                var parentFolder = Path.GetDirectoryName(folder);
                var folderName = Path.GetFileName(folder);
                AssetDatabase.CreateFolder(parentFolder, folderName);
            }
            
            var scenePath = Path.Combine(folder, $"{sceneName}.unity");
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(), scenePath);
            AssetDatabase.Refresh();
        }

        private static string GetSceneTemplateDescription(SceneTemplateType type)
        {
            return type switch
            {
                SceneTemplateType.Empty => "Empty scene with just a camera",
                SceneTemplateType.Basic2D => "2D scene with orthographic camera and physics",
                SceneTemplateType.Basic3D => "3D scene with perspective camera and ground plane",
                SceneTemplateType.TopDown2D => "Top-down 2D view with appropriate camera angle",
                SceneTemplateType.Platformer2D => "2D platformer with sample platforms",
                SceneTemplateType.FirstPerson3D => "First-person 3D setup with character controller",
                SceneTemplateType.ThirdPerson3D => "Third-person 3D with player object and camera",
                SceneTemplateType.Racing3D => "Racing game setup with track-focused camera",
                SceneTemplateType.Strategy3D => "Strategy game with isometric-style camera",
                SceneTemplateType.VR => "VR-ready scene with XR Origin setup",
                SceneTemplateType.AR => "AR scene with camera and AR components",
                _ => "Unknown template type"
            };
        }

        private static string GetLightingDescription(LightingSetup setup)
        {
            return setup switch
            {
                LightingSetup.Unlit => "No lighting setup - suitable for 2D or custom lighting",
                LightingSetup.Basic => "Simple directional light - good for prototyping",
                LightingSetup.Realistic => "Realistic lighting with sun and fill lights",
                LightingSetup.Stylized => "Stylized lighting for cartoon/artistic games",
                LightingSetup.Performance => "Optimized lighting for mobile/VR",
                LightingSetup.Cinematic => "Three-point lighting for dramatic scenes",
                _ => "Unknown lighting setup"
            };
        }

        private static string GetPostProcessingDescription(PostProcessingProfile profile)
        {
            return profile switch
            {
                PostProcessingProfile.None => "No post-processing effects",
                PostProcessingProfile.Realistic => "Realistic post-processing with color grading",
                PostProcessingProfile.Stylized => "Stylized effects for artistic games",
                PostProcessingProfile.HighContrast => "High contrast for competitive games",
                PostProcessingProfile.Vintage => "Vintage film look with grain and vignette",
                PostProcessingProfile.SciFi => "Sci-fi themed effects with bloom and distortion",
                PostProcessingProfile.Fantasy => "Fantasy-themed warm and magical effects",
                _ => "Unknown post-processing profile"
            };
        }

        #endregion
    }
}
