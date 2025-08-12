using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace BMAD.Unity.EditorTools
{
    /// <summary>
    /// Advanced asset import processor for optimizing textures, models, and audio assets.
    /// Implements BMAD methodology for consistent asset pipeline management.
    /// </summary>
    public class AssetImportProcessor : AssetPostprocessor
    {
        #region Configuration

        [System.Serializable]
        public class TextureImportSettings
        {
            public TextureImporterType textureType = TextureImporterType.Default;
            public int maxTextureSize = 2048;
            public TextureImporterFormat format = TextureImporterFormat.Automatic;
            public TextureImporterCompression compression = TextureImporterCompression.Compressed;
            public bool generateMipMaps = true;
            public FilterMode filterMode = FilterMode.Bilinear;
            public TextureWrapMode wrapMode = TextureWrapMode.Repeat;
        }

        [System.Serializable]
        public class ModelImportSettings
        {
            public bool importMaterials = true;
            public bool importAnimation = true;
            public bool optimizeMesh = true;
            public bool generateColliders = false;
            public ModelImporterNormals normalImportMode = ModelImporterNormals.Import;
            public ModelImporterTangents tangentImportMode = ModelImporterTangents.CalculateMikk;
            public float scaleFactor = 1.0f;
        }

        [System.Serializable]
        public class AudioImportSettings
        {
            public AudioImporterFormat format = AudioImporterFormat.Compressed;
            public AudioCompressionFormat compressionFormat = AudioCompressionFormat.Vorbis;
            public float quality = 0.7f;
            public AudioImporterLoadType loadType = AudioImporterLoadType.CompressedInMemory;
            public bool preloadAudioData = false;
        }

        private static readonly Dictionary<string, TextureImportSettings> s_TextureSettings = 
            new Dictionary<string, TextureImportSettings>();
        private static readonly Dictionary<string, ModelImportSettings> s_ModelSettings = 
            new Dictionary<string, ModelImportSettings>();
        private static readonly Dictionary<string, AudioImportSettings> s_AudioSettings = 
            new Dictionary<string, AudioImportSettings>();

        #endregion

        #region Menu Items

        /// <summary>
        /// Opens the Asset Import Processor configuration window.
        /// </summary>
        [MenuItem("BMAD/Asset Pipeline/Import Processor Settings", priority = 200)]
        public static void OpenImportProcessorSettings()
        {
            var window = EditorWindow.GetWindow<AssetImportProcessorWindow>("Asset Import Settings");
            window.minSize = new Vector2(500, 600);
            window.Show();
        }

        /// <summary>
        /// Re-imports all assets with current processor settings.
        /// </summary>
        [MenuItem("BMAD/Asset Pipeline/Re-import All Assets", priority = 201)]
        public static void ReimportAllAssets()
        {
            if (EditorUtility.DisplayDialog("Re-import All Assets", 
                "This will re-import all assets in the project. This may take a long time. Continue?", 
                "Re-import", "Cancel"))
            {
                try
                {
                    AssetDatabase.ImportAsset("Assets", ImportAssetOptions.ImportRecursive);
                    Debug.Log("[AssetImportProcessor] All assets re-imported successfully");
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[AssetImportProcessor] Failed to re-import assets: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// Optimizes textures in the selected folder.
        /// </summary>
        [MenuItem("Assets/BMAD/Optimize Textures", priority = 300)]
        public static void OptimizeSelectedTextures()
        {
            var selection = Selection.assetGUIDs;
            if (selection.Length == 0)
            {
                EditorUtility.DisplayDialog("No Selection", "Please select textures or folders to optimize.", "OK");
                return;
            }

            OptimizeTextures(selection);
        }

        /// <summary>
        /// Validates the selected assets for import issues.
        /// </summary>
        [MenuItem("Assets/BMAD/Validate Asset Import", priority = 301)]
        public static void ValidateSelectedAssets()
        {
            var selection = Selection.assetGUIDs;
            if (selection.Length == 0)
            {
                EditorUtility.DisplayDialog("No Selection", "Please select assets to validate.", "OK");
                return;
            }

            ValidateAssetImport(selection);
        }

        #endregion

        #region Asset Import Callbacks

        /// <summary>
        /// Called before importing a texture. Applies custom import settings.
        /// </summary>
        void OnPreprocessTexture()
        {
            try
            {
                var importer = assetImporter as TextureImporter;
                if (importer == null) return;

                var settings = GetTextureSettingsForPath(assetPath);
                if (settings == null) return;

                ApplyTextureSettings(importer, settings);
                Debug.Log($"[AssetImportProcessor] Applied texture settings to: {assetPath}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AssetImportProcessor] Error preprocessing texture {assetPath}: {ex.Message}");
            }
        }

        /// <summary>
        /// Called before importing a model. Applies custom import settings.
        /// </summary>
        void OnPreprocessModel()
        {
            try
            {
                var importer = assetImporter as ModelImporter;
                if (importer == null) return;

                var settings = GetModelSettingsForPath(assetPath);
                if (settings == null) return;

                ApplyModelSettings(importer, settings);
                Debug.Log($"[AssetImportProcessor] Applied model settings to: {assetPath}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AssetImportProcessor] Error preprocessing model {assetPath}: {ex.Message}");
            }
        }

        /// <summary>
        /// Called before importing audio. Applies custom import settings.
        /// </summary>
        void OnPreprocessAudio()
        {
            try
            {
                var importer = assetImporter as AudioImporter;
                if (importer == null) return;

                var settings = GetAudioSettingsForPath(assetPath);
                if (settings == null) return;

                ApplyAudioSettings(importer, settings);
                Debug.Log($"[AssetImportProcessor] Applied audio settings to: {assetPath}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AssetImportProcessor] Error preprocessing audio {assetPath}: {ex.Message}");
            }
        }

        /// <summary>
        /// Called after importing all assets. Performs validation and optimization.
        /// </summary>
        static void OnPostprocessAllAssets(string[] importedAssets, string[] deletedAssets, 
            string[] movedAssets, string[] movedFromAssetPaths)
        {
            try
            {
                if (importedAssets.Length > 0)
                {
                    ValidateImportedAssets(importedAssets);
                    OptimizeImportedAssets(importedAssets);
                }

                if (deletedAssets.Length > 0)
                {
                    Debug.Log($"[AssetImportProcessor] {deletedAssets.Length} assets deleted");
                }

                if (movedAssets.Length > 0)
                {
                    Debug.Log($"[AssetImportProcessor] {movedAssets.Length} assets moved");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AssetImportProcessor] Error in post-process: {ex.Message}");
            }
        }

        #endregion

        #region Settings Application

        private static void ApplyTextureSettings(TextureImporter importer, TextureImportSettings settings)
        {
            importer.textureType = settings.textureType;
            importer.maxTextureSize = settings.maxTextureSize;
            importer.textureCompression = settings.compression;
            importer.mipmapEnabled = settings.generateMipMaps;
            importer.filterMode = settings.filterMode;
            importer.wrapMode = settings.wrapMode;

            // Platform-specific settings
            var platformSettings = new TextureImporterPlatformSettings
            {
                name = "Standalone",
                maxTextureSize = settings.maxTextureSize,
                format = settings.format,
                compressionQuality = (int)TextureCompressionQuality.Normal
            };
            importer.SetPlatformTextureSettings(platformSettings);
        }

        private static void ApplyModelSettings(ModelImporter importer, ModelImportSettings settings)
        {
            importer.importMaterials = settings.importMaterials;
            importer.importAnimation = settings.importAnimation;
            importer.optimizeMeshPolygons = settings.optimizeMesh;
            importer.optimizeMeshVertices = settings.optimizeMesh;
            importer.generateSecondaryUV = false;
            importer.normalImportMode = settings.normalImportMode;
            importer.tangentImportMode = settings.tangentImportMode;
            importer.globalScale = settings.scaleFactor;

            if (settings.generateColliders)
            {
                importer.addCollider = true;
            }
        }

        private static void ApplyAudioSettings(AudioImporter importer, AudioImportSettings settings)
        {
            var sampleSettings = new AudioImporterSampleSettings
            {
                loadType = settings.loadType,
                compressionFormat = settings.compressionFormat,
                quality = settings.quality,
                sampleRateSetting = AudioSampleRateSetting.PreserveSampleRate
            };

            importer.SetOverrideSampleSettings("Standalone", sampleSettings);
            importer.preloadAudioData = settings.preloadAudioData;
        }

        #endregion

        #region Path-based Settings Resolution

        private static TextureImportSettings GetTextureSettingsForPath(string path)
        {
            // Check for UI textures
            if (path.Contains("/UI/") || path.Contains("/GUI/"))
            {
                return GetOrCreateTextureSettings("UI", new TextureImportSettings
                {
                    textureType = TextureImporterType.Sprite,
                    maxTextureSize = 1024,
                    format = TextureImporterFormat.Automatic,
                    compression = TextureImporterCompression.Compressed,
                    generateMipMaps = false,
                    filterMode = FilterMode.Bilinear
                });
            }

            // Check for normal maps
            if (path.Contains("_Normal") || path.Contains("_normal") || path.Contains("_NRM"))
            {
                return GetOrCreateTextureSettings("Normal", new TextureImportSettings
                {
                    textureType = TextureImporterType.NormalMap,
                    maxTextureSize = 2048,
                    format = TextureImporterFormat.Automatic,
                    compression = TextureImporterCompression.Compressed,
                    generateMipMaps = true
                });
            }

            // Default texture settings
            return GetOrCreateTextureSettings("Default", new TextureImportSettings());
        }

        private static ModelImportSettings GetModelSettingsForPath(string path)
        {
            // Check for character models
            if (path.Contains("/Characters/") || path.Contains("/Chars/"))
            {
                return GetOrCreateModelSettings("Character", new ModelImportSettings
                {
                    importMaterials = true,
                    importAnimation = true,
                    optimizeMesh = true,
                    normalImportMode = ModelImporterNormals.Import,
                    scaleFactor = 1.0f
                });
            }

            // Check for environment models
            if (path.Contains("/Environment/") || path.Contains("/Props/"))
            {
                return GetOrCreateModelSettings("Environment", new ModelImportSettings
                {
                    importMaterials = true,
                    importAnimation = false,
                    optimizeMesh = true,
                    generateColliders = true,
                    scaleFactor = 1.0f
                });
            }

            return GetOrCreateModelSettings("Default", new ModelImportSettings());
        }

        private static AudioImportSettings GetAudioSettingsForPath(string path)
        {
            // Check for music files
            if (path.Contains("/Music/") || path.Contains("/BGM/"))
            {
                return GetOrCreateAudioSettings("Music", new AudioImportSettings
                {
                    format = AudioImporterFormat.Compressed,
                    compressionFormat = AudioCompressionFormat.Vorbis,
                    quality = 0.8f,
                    loadType = AudioImporterLoadType.Streaming
                });
            }

            // Check for sound effects
            if (path.Contains("/SFX/") || path.Contains("/Sounds/"))
            {
                return GetOrCreateAudioSettings("SFX", new AudioImportSettings
                {
                    format = AudioImporterFormat.Compressed,
                    compressionFormat = AudioCompressionFormat.Vorbis,
                    quality = 0.6f,
                    loadType = AudioImporterLoadType.CompressedInMemory
                });
            }

            return GetOrCreateAudioSettings("Default", new AudioImportSettings());
        }

        #endregion

        #region Settings Management

        private static TextureImportSettings GetOrCreateTextureSettings(string key, TextureImportSettings defaultSettings)
        {
            if (!s_TextureSettings.ContainsKey(key))
            {
                s_TextureSettings[key] = defaultSettings;
            }
            return s_TextureSettings[key];
        }

        private static ModelImportSettings GetOrCreateModelSettings(string key, ModelImportSettings defaultSettings)
        {
            if (!s_ModelSettings.ContainsKey(key))
            {
                s_ModelSettings[key] = defaultSettings;
            }
            return s_ModelSettings[key];
        }

        private static AudioImportSettings GetOrCreateAudioSettings(string key, AudioImportSettings defaultSettings)
        {
            if (!s_AudioSettings.ContainsKey(key))
            {
                s_AudioSettings[key] = defaultSettings;
            }
            return s_AudioSettings[key];
        }

        #endregion

        #region Optimization and Validation

        private static void OptimizeTextures(string[] assetGUIDs)
        {
            int optimized = 0;
            foreach (var guid in assetGUIDs)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var importer = AssetImporter.GetAtPath(path) as TextureImporter;
                
                if (importer != null)
                {
                    var settings = GetTextureSettingsForPath(path);
                    ApplyTextureSettings(importer, settings);
                    AssetDatabase.ImportAsset(path);
                    optimized++;
                }
            }

            Debug.Log($"[AssetImportProcessor] Optimized {optimized} textures");
            EditorUtility.DisplayDialog("Optimization Complete", 
                $"Optimized {optimized} textures", "OK");
        }

        private static void ValidateAssetImport(string[] assetGUIDs)
        {
            var issues = new List<string>();

            foreach (var guid in assetGUIDs)
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                var asset = AssetDatabase.LoadAssetAtPath<UnityEngine.Object>(path);

                if (asset is Texture2D texture)
                {
                    ValidateTexture(texture, path, issues);
                }
                else if (asset is Mesh mesh)
                {
                    ValidateMesh(mesh, path, issues);
                }
                else if (asset is AudioClip audio)
                {
                    ValidateAudio(audio, path, issues);
                }
            }

            if (issues.Count > 0)
            {
                Debug.LogWarning($"[AssetImportProcessor] Found {issues.Count} import issues:");
                foreach (var issue in issues)
                {
                    Debug.LogWarning($"[AssetImportProcessor] - {issue}");
                }
            }
            else
            {
                Debug.Log("[AssetImportProcessor] No import issues found");
            }
        }

        private static void ValidateTexture(Texture2D texture, string path, List<string> issues)
        {
            if (texture.width > 4096 || texture.height > 4096)
            {
                issues.Add($"Large texture size ({texture.width}x{texture.height}): {path}");
            }

            if (!Mathf.IsPowerOfTwo(texture.width) || !Mathf.IsPowerOfTwo(texture.height))
            {
                issues.Add($"Non-power-of-two texture: {path}");
            }
        }

        private static void ValidateMesh(Mesh mesh, string path, List<string> issues)
        {
            if (mesh.vertexCount > 50000)
            {
                issues.Add($"High vertex count mesh ({mesh.vertexCount}): {path}");
            }

            if (mesh.triangles.Length > 100000)
            {
                issues.Add($"High triangle count mesh ({mesh.triangles.Length / 3}): {path}");
            }
        }

        private static void ValidateAudio(AudioClip audio, string path, List<string> issues)
        {
            if (audio.frequency > 48000)
            {
                issues.Add($"High sample rate audio ({audio.frequency}Hz): {path}");
            }

            if (audio.length > 300f && !path.Contains("/Music/"))
            {
                issues.Add($"Long audio clip ({audio.length:F1}s) not in Music folder: {path}");
            }
        }

        private static void ValidateImportedAssets(string[] importedAssets)
        {
            var textureCount = 0;
            var modelCount = 0;
            var audioCount = 0;

            foreach (var path in importedAssets)
            {
                var extension = Path.GetExtension(path).ToLower();
                if (IsTextureExtension(extension)) textureCount++;
                else if (IsModelExtension(extension)) modelCount++;
                else if (IsAudioExtension(extension)) audioCount++;
            }

            if (textureCount + modelCount + audioCount > 0)
            {
                Debug.Log($"[AssetImportProcessor] Imported: {textureCount} textures, " +
                         $"{modelCount} models, {audioCount} audio files");
            }
        }

        private static void OptimizeImportedAssets(string[] importedAssets)
        {
            // Perform post-import optimization if needed
            // This could include additional processing, thumbnail generation, etc.
        }

        private static bool IsTextureExtension(string extension)
        {
            return extension == ".png" || extension == ".jpg" || extension == ".jpeg" || 
                   extension == ".tga" || extension == ".bmp" || extension == ".psd";
        }

        private static bool IsModelExtension(string extension)
        {
            return extension == ".fbx" || extension == ".obj" || extension == ".dae" || 
                   extension == ".3ds" || extension == ".blend" || extension == ".ma" || extension == ".mb";
        }

        private static bool IsAudioExtension(string extension)
        {
            return extension == ".wav" || extension == ".mp3" || extension == ".ogg" || 
                   extension == ".aiff" || extension == ".flac";
        }

        #endregion
    }

    /// <summary>
    /// Editor window for configuring asset import processor settings.
    /// </summary>
    public class AssetImportProcessorWindow : EditorWindow
    {
        private Vector2 scrollPosition;
        
        private void OnGUI()
        {
            scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);
            
            GUILayout.Label("BMAD Asset Import Processor", EditorStyles.boldLabel);
            GUILayout.Space(10);
            
            if (GUILayout.Button("Re-import All Assets"))
            {
                AssetImportProcessor.ReimportAllAssets();
            }
            
            GUILayout.Space(10);
            GUILayout.Label("Asset Processing is automatic based on folder structure:", EditorStyles.helpBox);
            GUILayout.Label("• /UI/ or /GUI/ → Sprite textures without mipmaps");
            GUILayout.Label("• *_Normal, *_normal, *_NRM → Normal map textures");
            GUILayout.Label("• /Characters/ or /Chars/ → Character models with animation");
            GUILayout.Label("• /Environment/ or /Props/ → Environment models with colliders");
            GUILayout.Label("• /Music/ or /BGM/ → Streaming music files");
            GUILayout.Label("• /SFX/ or /Sounds/ → Compressed sound effects");
            
            EditorGUILayout.EndScrollView();
        }
    }
}
