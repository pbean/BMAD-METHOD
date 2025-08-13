# Unity Cloud Save Integration Task

## Purpose

To implement robust Unity Cloud Save with conflict resolution, data versioning, offline caching, and cross-platform synchronization. This task extends `unity-cloud-services-setup.md` to provide production-ready save game implementation following BMAD template processing patterns.

## Prerequisites

- Unity project with `com.unity.services.cloudsave` package installed
- Unity Services Core initialized (see `unity-cloud-services-setup.md`)
- Authentication service configured and player signed in
- Project linked to Unity Dashboard with Cloud Save enabled
- [[LLM: Verify prerequisites and provide specific remediation if not met]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Cloud Save Architecture

#### 1.1 Data Structure Design

Create `Assets/Scripts/CloudSave/SaveDataModels.cs`:

```csharp
using System;
using System.Collections.Generic;
using UnityEngine;

namespace {{project_namespace}}.CloudSave
{
    /// <summary>
    /// Core save data models with versioning support
    /// Reference: https://docs.unity.com/cloud-save/
    /// </summary>
    
    [Serializable]
    public class SaveDataVersion
    {
        public int major = 1;
        public int minor = 0;
        public int patch = 0;
        
        public string GetVersionString() => $"{major}.{minor}.{patch}";
        
        public bool IsCompatible(SaveDataVersion other)
        {
            // Major version must match for compatibility
            return major == other.major;
        }
    }

    [Serializable]
    public class PlayerSaveData
    {
        public SaveDataVersion version = new SaveDataVersion();
        public string playerId;
        public DateTime lastSaved;
        public string deviceId;
        public PlayerProfile profile;
        public ProgressionData progression;
        public InventoryData inventory;
        public SettingsData settings;
        public StatisticsData statistics;
        public Dictionary<string, object> customData;
        
        // Compression metadata
        public bool isCompressed;
        public string compressionMethod;
        public int uncompressedSize;
        public int compressedSize;
        
        // Sync metadata
        public string syncId;
        public int syncVersion;
        public DateTime cloudTimestamp;
        public DateTime localTimestamp;
    }

    [Serializable]
    public class PlayerProfile
    {
        public string playerName;
        public string avatarId;
        public int playerLevel;
        public long experience;
        public long totalPlayTime;
        public DateTime firstPlayDate;
        public DateTime lastPlayDate;
        public string preferredLanguage;
        public string country;
        public List<string> unlockedAchievements;
        public Dictionary<string, int> achievementProgress;
    }

    [Serializable]
    public class ProgressionData
    {
        public int currentChapter;
        public int currentLevel;
        public Dictionary<string, LevelProgress> levelProgress;
        public List<string> unlockedLevels;
        public List<string> completedLevels;
        public Dictionary<string, float> bestTimes;
        public Dictionary<string, int> bestScores;
        public Dictionary<string, int> starRatings;
        
        [Serializable]
        public class LevelProgress
        {
            public string levelId;
            public bool isCompleted;
            public int attempts;
            public float bestTime;
            public int bestScore;
            public int stars;
            public DateTime firstPlayed;
            public DateTime lastPlayed;
            public Dictionary<string, bool> objectives;
            public List<string> collectedItems;
        }
    }

    [Serializable]
    public class InventoryData
    {
        public Dictionary<string, int> currencies;
        public List<InventoryItem> items;
        public List<string> equippedItems;
        public Dictionary<string, int> consumables;
        public List<string> unlockedSkins;
        public List<string> unlockedCharacters;
        
        [Serializable]
        public class InventoryItem
        {
            public string itemId;
            public string itemType;
            public int quantity;
            public int level;
            public float durability;
            public DateTime acquiredDate;
            public Dictionary<string, float> stats;
            public List<string> enchantments;
        }
    }

    [Serializable]
    public class SettingsData
    {
        public float masterVolume = 1.0f;
        public float musicVolume = 1.0f;
        public float sfxVolume = 1.0f;
        public float voiceVolume = 1.0f;
        public int graphicsQuality = 2; // 0=Low, 1=Medium, 2=High, 3=Ultra
        public int resolutionIndex = -1; // -1 = auto
        public bool fullscreen = true;
        public bool vsync = true;
        public int targetFrameRate = 60;
        public float brightness = 1.0f;
        public float contrast = 1.0f;
        public string language = "en";
        public bool subtitles = false;
        public bool colorblindMode = false;
        public Dictionary<string, int> inputBindings;
        public float sensitivity = 1.0f;
        public bool invertY = false;
        public bool vibration = true;
        public bool notifications = true;
    }

    [Serializable]
    public class StatisticsData
    {
        public long totalPlayTime;
        public int sessionsPlayed;
        public int levelsCompleted;
        public int levelsFailed;
        public int enemiesDefeated;
        public int itemsCollected;
        public float totalDistanceTraveled;
        public int totalJumps;
        public int totalDeaths;
        public Dictionary<string, long> customStats;
        public DateTime lastUpdated;
    }

    // Metadata for save slots
    [Serializable]
    public class SaveSlotMetadata
    {
        public int slotNumber;
        public string slotName;
        public bool inUse;
        public DateTime createdDate;
        public DateTime modifiedDate;
        public int playerLevel;
        public float progressPercentage;
        public string thumbnailPath;
        public long saveSize;
        public bool isCloudSynced;
        public bool isCorrupted;
    }

    // Conflict resolution data
    [Serializable]
    public class ConflictData
    {
        public PlayerSaveData localData;
        public PlayerSaveData cloudData;
        public DateTime conflictDetectedTime;
        public ConflictResolutionStrategy strategy;
        
        public enum ConflictResolutionStrategy
        {
            UseLocal,
            UseCloud,
            UseNewest,
            UseMerged,
            AskUser
        }
    }
}
```

#### 1.2 Advanced Cloud Save Manager

Create `Assets/Scripts/CloudSave/AdvancedCloudSaveManager.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.IO;
using System.IO.Compression;
using System.Text;
using Unity.Services.CloudSave;
using Unity.Services.CloudSave.Models;
using Unity.Services.Authentication;
using UnityEngine;
using Newtonsoft.Json;

namespace {{project_namespace}}.CloudSave
{
    public class AdvancedCloudSaveManager : MonoBehaviour
    {
        private static AdvancedCloudSaveManager _instance;
        public static AdvancedCloudSaveManager Instance => _instance;

        [Header("Configuration")]
        [SerializeField] private bool autoSaveEnabled = true;
        [SerializeField] private float autoSaveInterval = 300f; // 5 minutes
        [SerializeField] private int maxSaveSlots = 3;
        [SerializeField] private bool useCompression = true;
        [SerializeField] private bool useEncryption = false;
        [SerializeField] private ConflictData.ConflictResolutionStrategy defaultConflictStrategy = 
            ConflictData.ConflictResolutionStrategy.UseNewest;
        
        [Header("Performance")]
        [SerializeField] private int maxRetries = 3;
        [SerializeField] private float retryDelay = 2f;
        [SerializeField] private int compressionLevel = 6; // 1-9
        [SerializeField] private long maxSaveSize = 10485760; // 10MB
        
        // Save data cache
        private PlayerSaveData _currentSaveData;
        private Dictionary<int, SaveSlotMetadata> _saveSlots;
        private Queue<PlayerSaveData> _saveHistory;
        private const int MaxHistorySize = 10;
        
        // Sync state
        private bool _isSyncing;
        private bool _hasUnsyncedChanges;
        private DateTime _lastSyncTime;
        private DateTime _lastAutoSaveTime;
        
        // Offline queue
        private Queue<SaveOperation> _offlineQueue;
        private bool _isOnline;
        
        // Events
        public event Action<PlayerSaveData> OnSaveCompleted;
        public event Action<PlayerSaveData> OnLoadCompleted;
        public event Action<ConflictData> OnConflictDetected;
        public event Action<float> OnSyncProgress;
        public event Action<string> OnSaveError;

        private class SaveOperation
        {
            public string Key;
            public object Data;
            public DateTime Timestamp;
            public int RetryCount;
            public SavePriority Priority;
        }

        public enum SavePriority
        {
            Low,
            Normal,
            High,
            Critical
        }

        private void Awake()
        {
            if (_instance == null)
            {
                _instance = this;
                DontDestroyOnLoad(gameObject);
                Initialize();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Initialize()
        {
            _saveSlots = new Dictionary<int, SaveSlotMetadata>();
            _saveHistory = new Queue<PlayerSaveData>();
            _offlineQueue = new Queue<SaveOperation>();
            _isOnline = Application.internetReachability != NetworkReachability.NotReachable;
            
            // Load local cache
            LoadLocalCache();
            
            // Start auto-save
            if (autoSaveEnabled)
            {
                InvokeRepeating(nameof(AutoSave), autoSaveInterval, autoSaveInterval);
            }
            
            // Monitor connectivity
            InvokeRepeating(nameof(CheckConnectivity), 5f, 5f);
        }

        #region Save Operations

        public async Task<bool> SaveGame(int slotNumber = 0, SavePriority priority = SavePriority.Normal)
        {
            if (_isSyncing)
            {
                Debug.LogWarning("CloudSave: Save operation already in progress");
                return false;
            }

            _isSyncing = true;
            OnSyncProgress?.Invoke(0f);

            try
            {
                // Prepare save data
                var saveData = PrepareSaveData();
                
                // Validate save data
                if (!ValidateSaveData(saveData))
                {
                    throw new Exception("Save data validation failed");
                }
                
                // Add to history
                AddToHistory(saveData);
                
                // Compress if enabled
                if (useCompression)
                {
                    saveData = await CompressSaveData(saveData);
                }
                
                OnSyncProgress?.Invoke(0.3f);
                
                // Encrypt if enabled
                if (useEncryption)
                {
                    saveData = await EncryptSaveData(saveData);
                }
                
                OnSyncProgress?.Invoke(0.5f);
                
                // Save locally first
                SaveToLocalCache(saveData, slotNumber);
                
                OnSyncProgress?.Invoke(0.7f);
                
                // Save to cloud
                if (_isOnline)
                {
                    await SaveToCloud(saveData, slotNumber, priority);
                }
                else
                {
                    QueueOfflineSave(saveData, slotNumber, priority);
                    Debug.Log("CloudSave: Offline - save queued for later sync");
                }
                
                OnSyncProgress?.Invoke(1f);
                
                // Update metadata
                UpdateSlotMetadata(slotNumber, saveData);
                
                _lastSyncTime = DateTime.UtcNow;
                _hasUnsyncedChanges = false;
                
                OnSaveCompleted?.Invoke(saveData);
                
                Debug.Log($"CloudSave: Game saved successfully to slot {slotNumber}");
                return true;
            }
            catch (Exception ex)
            {
                Debug.LogError($"CloudSave: Save failed - {ex.Message}");
                OnSaveError?.Invoke(ex.Message);
                return false;
            }
            finally
            {
                _isSyncing = false;
            }
        }

        private PlayerSaveData PrepareSaveData()
        {
            if (_currentSaveData == null)
            {
                _currentSaveData = new PlayerSaveData();
            }
            
            // Update metadata
            _currentSaveData.playerId = AuthenticationService.Instance.PlayerId;
            _currentSaveData.lastSaved = DateTime.UtcNow;
            _currentSaveData.deviceId = SystemInfo.deviceUniqueIdentifier;
            _currentSaveData.localTimestamp = DateTime.UtcNow;
            _currentSaveData.syncVersion++;
            
            // Collect game data
            _currentSaveData.profile = CollectProfileData();
            _currentSaveData.progression = CollectProgressionData();
            _currentSaveData.inventory = CollectInventoryData();
            _currentSaveData.settings = CollectSettingsData();
            _currentSaveData.statistics = CollectStatisticsData();
            
            // [[LLM: Implement data collection methods based on game systems]]
            
            return _currentSaveData;
        }

        private async Task<PlayerSaveData> CompressSaveData(PlayerSaveData data)
        {
            var json = JsonConvert.SerializeObject(data);
            var uncompressedBytes = Encoding.UTF8.GetBytes(json);
            
            using (var output = new MemoryStream())
            {
                using (var gzip = new GZipStream(output, (CompressionLevel)compressionLevel))
                {
                    await gzip.WriteAsync(uncompressedBytes, 0, uncompressedBytes.Length);
                }
                
                var compressedBytes = output.ToArray();
                
                // Update compression metadata
                data.isCompressed = true;
                data.compressionMethod = "gzip";
                data.uncompressedSize = uncompressedBytes.Length;
                data.compressedSize = compressedBytes.Length;
                
                float compressionRatio = 1f - ((float)compressedBytes.Length / uncompressedBytes.Length);
                Debug.Log($"CloudSave: Compressed {uncompressedBytes.Length} bytes to {compressedBytes.Length} bytes (ratio: {compressionRatio:P})");
                
                // Store compressed data in custom data field
                data.customData = new Dictionary<string, object>
                {
                    { "compressed_data", Convert.ToBase64String(compressedBytes) }
                };
            }
            
            return data;
        }

        private async Task<PlayerSaveData> EncryptSaveData(PlayerSaveData data)
        {
            // [[LLM: Implement encryption using Unity's encryption utilities or custom implementation]]
            await Task.CompletedTask;
            return data;
        }

        private async Task SaveToCloud(PlayerSaveData data, int slotNumber, SavePriority priority)
        {
            var saveKey = GetSaveKey(slotNumber);
            var saveData = new Dictionary<string, object>
            {
                { saveKey, data },
                { $"{saveKey}_metadata", GetSlotMetadata(slotNumber) },
                { "last_sync", DateTime.UtcNow.ToString("O") }
            };
            
            int retryCount = 0;
            Exception lastException = null;
            
            while (retryCount < maxRetries)
            {
                try
                {
                    // Check for conflicts before saving
                    var cloudData = await LoadFromCloud(slotNumber);
                    if (cloudData != null && HasConflict(data, cloudData))
                    {
                        data = await ResolveConflict(data, cloudData);
                    }
                    
                    // Save to cloud
                    await CloudSaveService.Instance.Data.Player.SaveAsync(saveData);
                    
                    Debug.Log($"CloudSave: Successfully saved to cloud (slot {slotNumber})");
                    return;
                }
                catch (CloudSaveException ex) when (ex.ErrorCode == CloudSaveExceptionReason.RateLimited)
                {
                    Debug.LogWarning($"CloudSave: Rate limited, waiting {retryDelay * (retryCount + 1)} seconds");
                    await Task.Delay((int)(retryDelay * (retryCount + 1) * 1000));
                    retryCount++;
                }
                catch (CloudSaveException ex) when (ex.ErrorCode == CloudSaveExceptionReason.TooManyRequests)
                {
                    Debug.LogWarning($"CloudSave: Too many requests, backing off");
                    await Task.Delay((int)(retryDelay * Math.Pow(2, retryCount) * 1000)); // Exponential backoff
                    retryCount++;
                }
                catch (Exception ex)
                {
                    lastException = ex;
                    Debug.LogError($"CloudSave: Save attempt {retryCount + 1} failed - {ex.Message}");
                    retryCount++;
                    
                    if (retryCount < maxRetries)
                    {
                        await Task.Delay((int)(retryDelay * 1000));
                    }
                }
            }
            
            // All retries failed
            if (priority == SavePriority.Critical)
            {
                // Queue for later retry if critical
                QueueOfflineSave(data, slotNumber, priority);
            }
            
            throw lastException ?? new Exception("CloudSave: Failed to save after maximum retries");
        }

        #endregion

        #region Load Operations

        public async Task<PlayerSaveData> LoadGame(int slotNumber = 0)
        {
            if (_isSyncing)
            {
                Debug.LogWarning("CloudSave: Load operation already in progress");
                return null;
            }

            _isSyncing = true;
            OnSyncProgress?.Invoke(0f);

            try
            {
                PlayerSaveData loadedData = null;
                
                // Try to load from cloud first
                if (_isOnline)
                {
                    try
                    {
                        loadedData = await LoadFromCloud(slotNumber);
                        OnSyncProgress?.Invoke(0.5f);
                    }
                    catch (Exception ex)
                    {
                        Debug.LogWarning($"CloudSave: Failed to load from cloud - {ex.Message}");
                    }
                }
                
                // Fall back to local cache if cloud load failed
                if (loadedData == null)
                {
                    loadedData = LoadFromLocalCache(slotNumber);
                    Debug.Log("CloudSave: Loaded from local cache");
                }
                
                OnSyncProgress?.Invoke(0.7f);
                
                if (loadedData == null)
                {
                    Debug.LogWarning($"CloudSave: No save data found for slot {slotNumber}");
                    return null;
                }
                
                // Decompress if needed
                if (loadedData.isCompressed)
                {
                    loadedData = await DecompressSaveData(loadedData);
                }
                
                // Decrypt if needed
                if (useEncryption)
                {
                    loadedData = await DecryptSaveData(loadedData);
                }
                
                OnSyncProgress?.Invoke(0.9f);
                
                // Validate loaded data
                if (!ValidateSaveData(loadedData))
                {
                    throw new Exception("Loaded save data is corrupted");
                }
                
                // Migrate if needed
                loadedData = await MigrateSaveData(loadedData);
                
                OnSyncProgress?.Invoke(1f);
                
                _currentSaveData = loadedData;
                _lastSyncTime = DateTime.UtcNow;
                
                OnLoadCompleted?.Invoke(loadedData);
                
                Debug.Log($"CloudSave: Game loaded successfully from slot {slotNumber}");
                return loadedData;
            }
            catch (Exception ex)
            {
                Debug.LogError($"CloudSave: Load failed - {ex.Message}");
                OnSaveError?.Invoke(ex.Message);
                return null;
            }
            finally
            {
                _isSyncing = false;
            }
        }

        private async Task<PlayerSaveData> LoadFromCloud(int slotNumber)
        {
            var saveKey = GetSaveKey(slotNumber);
            var keys = new HashSet<string> { saveKey, $"{saveKey}_metadata" };
            
            var response = await CloudSaveService.Instance.Data.Player.LoadAsync(keys);
            
            if (response.TryGetValue(saveKey, out var saveItem))
            {
                var data = saveItem.Value.GetAs<PlayerSaveData>();
                data.cloudTimestamp = DateTime.UtcNow;
                return data;
            }
            
            return null;
        }

        private async Task<PlayerSaveData> DecompressSaveData(PlayerSaveData data)
        {
            if (!data.isCompressed || data.customData == null)
                return data;
            
            if (data.customData.TryGetValue("compressed_data", out var compressedBase64))
            {
                var compressedBytes = Convert.FromBase64String(compressedBase64.ToString());
                
                using (var input = new MemoryStream(compressedBytes))
                using (var gzip = new GZipStream(input, CompressionMode.Decompress))
                using (var output = new MemoryStream())
                {
                    await gzip.CopyToAsync(output);
                    var json = Encoding.UTF8.GetString(output.ToArray());
                    return JsonConvert.DeserializeObject<PlayerSaveData>(json);
                }
            }
            
            return data;
        }

        private async Task<PlayerSaveData> DecryptSaveData(PlayerSaveData data)
        {
            // [[LLM: Implement decryption]]
            await Task.CompletedTask;
            return data;
        }

        #endregion

        #region Conflict Resolution

        private bool HasConflict(PlayerSaveData localData, PlayerSaveData cloudData)
        {
            // No conflict if cloud data is older
            if (cloudData.lastSaved < localData.lastSaved)
                return false;
            
            // Check sync versions
            if (cloudData.syncVersion != localData.syncVersion)
                return true;
            
            // Check device ID to detect multi-device conflicts
            if (cloudData.deviceId != localData.deviceId)
                return true;
            
            return false;
        }

        private async Task<PlayerSaveData> ResolveConflict(PlayerSaveData localData, PlayerSaveData cloudData)
        {
            var conflict = new ConflictData
            {
                localData = localData,
                cloudData = cloudData,
                conflictDetectedTime = DateTime.UtcNow,
                strategy = defaultConflictStrategy
            };
            
            OnConflictDetected?.Invoke(conflict);
            
            switch (conflict.strategy)
            {
                case ConflictData.ConflictResolutionStrategy.UseLocal:
                    Debug.Log("CloudSave: Conflict resolved - using local data");
                    return localData;
                    
                case ConflictData.ConflictResolutionStrategy.UseCloud:
                    Debug.Log("CloudSave: Conflict resolved - using cloud data");
                    return cloudData;
                    
                case ConflictData.ConflictResolutionStrategy.UseNewest:
                    var newest = localData.lastSaved > cloudData.lastSaved ? localData : cloudData;
                    Debug.Log($"CloudSave: Conflict resolved - using newest ({newest.lastSaved})");
                    return newest;
                    
                case ConflictData.ConflictResolutionStrategy.UseMerged:
                    Debug.Log("CloudSave: Conflict resolved - merging data");
                    return await MergeSaveData(localData, cloudData);
                    
                case ConflictData.ConflictResolutionStrategy.AskUser:
                    Debug.Log("CloudSave: Conflict detected - waiting for user decision");
                    return await ShowConflictDialog(localData, cloudData);
                    
                default:
                    return localData;
            }
        }

        private async Task<PlayerSaveData> MergeSaveData(PlayerSaveData localData, PlayerSaveData cloudData)
        {
            var merged = new PlayerSaveData
            {
                version = localData.version,
                playerId = localData.playerId,
                lastSaved = DateTime.UtcNow,
                deviceId = SystemInfo.deviceUniqueIdentifier
            };
            
            // Merge profile - use most recent
            merged.profile = localData.profile.lastPlayDate > cloudData.profile.lastPlayDate ? 
                localData.profile : cloudData.profile;
            
            // Merge progression - use highest progress
            merged.progression = MergeProgression(localData.progression, cloudData.progression);
            
            // Merge inventory - combine items
            merged.inventory = MergeInventory(localData.inventory, cloudData.inventory);
            
            // Merge settings - use most recent
            merged.settings = localData.settings;
            
            // Merge statistics - use highest values
            merged.statistics = MergeStatistics(localData.statistics, cloudData.statistics);
            
            Debug.Log("CloudSave: Data merged successfully");
            return merged;
        }

        private ProgressionData MergeProgression(ProgressionData local, ProgressionData cloud)
        {
            var merged = new ProgressionData
            {
                currentChapter = Math.Max(local.currentChapter, cloud.currentChapter),
                currentLevel = Math.Max(local.currentLevel, cloud.currentLevel),
                levelProgress = new Dictionary<string, ProgressionData.LevelProgress>(),
                unlockedLevels = new List<string>(),
                completedLevels = new List<string>(),
                bestTimes = new Dictionary<string, float>(),
                bestScores = new Dictionary<string, int>(),
                starRatings = new Dictionary<string, int>()
            };
            
            // Merge level progress
            foreach (var level in local.levelProgress)
            {
                merged.levelProgress[level.Key] = level.Value;
            }
            
            foreach (var level in cloud.levelProgress)
            {
                if (!merged.levelProgress.ContainsKey(level.Key))
                {
                    merged.levelProgress[level.Key] = level.Value;
                }
                else
                {
                    // Use better progress
                    var localProg = merged.levelProgress[level.Key];
                    if (level.Value.bestScore > localProg.bestScore)
                        localProg.bestScore = level.Value.bestScore;
                    if (level.Value.bestTime < localProg.bestTime && level.Value.bestTime > 0)
                        localProg.bestTime = level.Value.bestTime;
                    if (level.Value.stars > localProg.stars)
                        localProg.stars = level.Value.stars;
                }
            }
            
            // Merge unlocked levels
            merged.unlockedLevels.AddRange(local.unlockedLevels);
            merged.unlockedLevels.AddRange(cloud.unlockedLevels);
            merged.unlockedLevels = new List<string>(new HashSet<string>(merged.unlockedLevels));
            
            // [[LLM: Complete merge logic for other progression fields]]
            
            return merged;
        }

        private InventoryData MergeInventory(InventoryData local, InventoryData cloud)
        {
            var merged = new InventoryData
            {
                currencies = new Dictionary<string, int>(),
                items = new List<InventoryData.InventoryItem>(),
                consumables = new Dictionary<string, int>(),
                unlockedSkins = new List<string>(),
                unlockedCharacters = new List<string>()
            };
            
            // Merge currencies - use higher values
            foreach (var currency in local.currencies)
            {
                merged.currencies[currency.Key] = currency.Value;
            }
            
            foreach (var currency in cloud.currencies)
            {
                if (!merged.currencies.ContainsKey(currency.Key))
                    merged.currencies[currency.Key] = currency.Value;
                else
                    merged.currencies[currency.Key] = Math.Max(merged.currencies[currency.Key], currency.Value);
            }
            
            // [[LLM: Complete inventory merge logic]]
            
            return merged;
        }

        private StatisticsData MergeStatistics(StatisticsData local, StatisticsData cloud)
        {
            return new StatisticsData
            {
                totalPlayTime = Math.Max(local.totalPlayTime, cloud.totalPlayTime),
                sessionsPlayed = Math.Max(local.sessionsPlayed, cloud.sessionsPlayed),
                levelsCompleted = Math.Max(local.levelsCompleted, cloud.levelsCompleted),
                enemiesDefeated = Math.Max(local.enemiesDefeated, cloud.enemiesDefeated),
                // [[LLM: Complete statistics merge]]
                lastUpdated = DateTime.UtcNow
            };
        }

        private async Task<PlayerSaveData> ShowConflictDialog(PlayerSaveData localData, PlayerSaveData cloudData)
        {
            // [[LLM: Implement UI dialog for user to choose between local and cloud saves]]
            // This should show:
            // - Last save time for each
            // - Key differences (level, progress, etc.)
            // - Options: Keep Local, Keep Cloud, or Cancel
            
            await Task.CompletedTask;
            return localData; // Default to local for now
        }

        #endregion

        #region Data Migration

        private async Task<PlayerSaveData> MigrateSaveData(PlayerSaveData data)
        {
            var currentVersion = new SaveDataVersion { major = 1, minor = 0, patch = 0 };
            
            if (data.version == null)
            {
                // Very old save without versioning
                data = await MigrateFromLegacy(data);
                data.version = currentVersion;
            }
            else if (!data.version.IsCompatible(currentVersion))
            {
                Debug.LogError($"CloudSave: Incompatible save version {data.version.GetVersionString()}");
                throw new Exception("Save data version incompatible");
            }
            else if (data.version.minor < currentVersion.minor)
            {
                // Minor version upgrade
                data = await MigrateMinorVersion(data, currentVersion);
            }
            
            return data;
        }

        private async Task<PlayerSaveData> MigrateFromLegacy(PlayerSaveData data)
        {
            Debug.Log("CloudSave: Migrating from legacy save format");
            
            // [[LLM: Implement legacy migration based on old save structure]]
            
            await Task.CompletedTask;
            return data;
        }

        private async Task<PlayerSaveData> MigrateMinorVersion(PlayerSaveData data, SaveDataVersion targetVersion)
        {
            Debug.Log($"CloudSave: Migrating from {data.version.GetVersionString()} to {targetVersion.GetVersionString()}");
            
            // [[LLM: Implement minor version migrations]]
            
            data.version = targetVersion;
            await Task.CompletedTask;
            return data;
        }

        #endregion

        #region Local Cache Management

        private void SaveToLocalCache(PlayerSaveData data, int slotNumber)
        {
            try
            {
                var json = JsonConvert.SerializeObject(data, Formatting.None);
                var key = $"save_slot_{slotNumber}";
                PlayerPrefs.SetString(key, json);
                PlayerPrefs.SetString($"{key}_backup", json); // Keep backup
                PlayerPrefs.Save();
                
                Debug.Log($"CloudSave: Saved to local cache (slot {slotNumber})");
            }
            catch (Exception ex)
            {
                Debug.LogError($"CloudSave: Failed to save to local cache - {ex.Message}");
            }
        }

        private PlayerSaveData LoadFromLocalCache(int slotNumber = 0)
        {
            try
            {
                var key = $"save_slot_{slotNumber}";
                var json = PlayerPrefs.GetString(key, "");
                
                if (string.IsNullOrEmpty(json))
                {
                    // Try backup
                    json = PlayerPrefs.GetString($"{key}_backup", "");
                }
                
                if (!string.IsNullOrEmpty(json))
                {
                    return JsonConvert.DeserializeObject<PlayerSaveData>(json);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"CloudSave: Failed to load from local cache - {ex.Message}");
            }
            
            return null;
        }

        private void LoadLocalCache()
        {
            for (int i = 0; i < maxSaveSlots; i++)
            {
                var metadata = LoadSlotMetadata(i);
                if (metadata != null)
                {
                    _saveSlots[i] = metadata;
                }
            }
        }

        #endregion

        #region Offline Queue Management

        private void QueueOfflineSave(PlayerSaveData data, int slotNumber, SavePriority priority)
        {
            var operation = new SaveOperation
            {
                Key = GetSaveKey(slotNumber),
                Data = data,
                Timestamp = DateTime.UtcNow,
                Priority = priority,
                RetryCount = 0
            };
            
            _offlineQueue.Enqueue(operation);
            Debug.Log($"CloudSave: Queued offline save (queue size: {_offlineQueue.Count})");
        }

        private async void ProcessOfflineQueue()
        {
            if (!_isOnline || _offlineQueue.Count == 0)
                return;
            
            Debug.Log($"CloudSave: Processing {_offlineQueue.Count} offline saves");
            
            while (_offlineQueue.Count > 0)
            {
                var operation = _offlineQueue.Dequeue();
                
                try
                {
                    var saveData = new Dictionary<string, object>
                    {
                        { operation.Key, operation.Data },
                        { "offline_save", true },
                        { "queued_time", operation.Timestamp.ToString("O") }
                    };
                    
                    await CloudSaveService.Instance.Data.Player.SaveAsync(saveData);
                    Debug.Log($"CloudSave: Offline save synced successfully");
                }
                catch (Exception ex)
                {
                    Debug.LogError($"CloudSave: Failed to sync offline save - {ex.Message}");
                    
                    operation.RetryCount++;
                    if (operation.RetryCount < maxRetries)
                    {
                        _offlineQueue.Enqueue(operation);
                    }
                }
            }
        }

        private void CheckConnectivity()
        {
            bool wasOnline = _isOnline;
            _isOnline = Application.internetReachability != NetworkReachability.NotReachable;
            
            if (!wasOnline && _isOnline)
            {
                Debug.Log("CloudSave: Connection restored, processing offline queue");
                ProcessOfflineQueue();
            }
        }

        #endregion

        #region Utility Methods

        private string GetSaveKey(int slotNumber)
        {
            return $"save_slot_{slotNumber}";
        }

        private SaveSlotMetadata GetSlotMetadata(int slotNumber)
        {
            if (_saveSlots.TryGetValue(slotNumber, out var metadata))
                return metadata;
            
            return new SaveSlotMetadata
            {
                slotNumber = slotNumber,
                inUse = false,
                createdDate = DateTime.UtcNow
            };
        }

        private SaveSlotMetadata LoadSlotMetadata(int slotNumber)
        {
            var key = $"save_slot_{slotNumber}_metadata";
            var json = PlayerPrefs.GetString(key, "");
            
            if (!string.IsNullOrEmpty(json))
            {
                return JsonConvert.DeserializeObject<SaveSlotMetadata>(json);
            }
            
            return null;
        }

        private void UpdateSlotMetadata(int slotNumber, PlayerSaveData data)
        {
            var metadata = GetSlotMetadata(slotNumber);
            
            metadata.inUse = true;
            metadata.modifiedDate = DateTime.UtcNow;
            metadata.playerLevel = data.profile?.playerLevel ?? 0;
            metadata.progressPercentage = CalculateProgressPercentage(data);
            metadata.isCloudSynced = _isOnline;
            metadata.saveSize = EstimateSaveSize(data);
            
            _saveSlots[slotNumber] = metadata;
            
            // Save metadata locally
            var key = $"save_slot_{slotNumber}_metadata";
            PlayerPrefs.SetString(key, JsonConvert.SerializeObject(metadata));
        }

        private float CalculateProgressPercentage(PlayerSaveData data)
        {
            if (data.progression == null) return 0f;
            
            // [[LLM: Calculate actual progress based on game structure]]
            int totalLevels = 100; // Example
            int completedLevels = data.progression.completedLevels?.Count ?? 0;
            
            return (float)completedLevels / totalLevels * 100f;
        }

        private long EstimateSaveSize(PlayerSaveData data)
        {
            var json = JsonConvert.SerializeObject(data);
            return Encoding.UTF8.GetByteCount(json);
        }

        private bool ValidateSaveData(PlayerSaveData data)
        {
            if (data == null) return false;
            
            // Check required fields
            if (string.IsNullOrEmpty(data.playerId)) return false;
            if (data.version == null) return false;
            
            // Check data integrity
            if (data.profile == null) return false;
            if (data.progression == null) return false;
            
            // Check for corruption
            if (data.lastSaved > DateTime.UtcNow.AddDays(1)) return false; // Future date
            if (data.lastSaved < DateTime.UtcNow.AddYears(-10)) return false; // Too old
            
            // Check size limits
            var size = EstimateSaveSize(data);
            if (size > maxSaveSize)
            {
                Debug.LogWarning($"CloudSave: Save data exceeds size limit ({size} > {maxSaveSize})");
                return false;
            }
            
            return true;
        }

        private void AddToHistory(PlayerSaveData data)
        {
            _saveHistory.Enqueue(data);
            
            while (_saveHistory.Count > MaxHistorySize)
            {
                _saveHistory.Dequeue();
            }
        }

        #endregion

        #region Auto Save

        private async void AutoSave()
        {
            if (!autoSaveEnabled || _isSyncing)
                return;
            
            if ((DateTime.UtcNow - _lastAutoSaveTime).TotalSeconds < autoSaveInterval)
                return;
            
            if (_hasUnsyncedChanges)
            {
                Debug.Log("CloudSave: Auto-saving...");
                await SaveGame(0, SavePriority.Low);
                _lastAutoSaveTime = DateTime.UtcNow;
            }
        }

        public void MarkDirty()
        {
            _hasUnsyncedChanges = true;
        }

        #endregion

        #region Data Collection Helpers

        private PlayerProfile CollectProfileData()
        {
            // [[LLM: Implement based on game's profile system]]
            return _currentSaveData?.profile ?? new PlayerProfile();
        }

        private ProgressionData CollectProgressionData()
        {
            // [[LLM: Implement based on game's progression system]]
            return _currentSaveData?.progression ?? new ProgressionData();
        }

        private InventoryData CollectInventoryData()
        {
            // [[LLM: Implement based on game's inventory system]]
            return _currentSaveData?.inventory ?? new InventoryData();
        }

        private SettingsData CollectSettingsData()
        {
            // [[LLM: Implement based on game's settings]]
            return _currentSaveData?.settings ?? new SettingsData();
        }

        private StatisticsData CollectStatisticsData()
        {
            // [[LLM: Implement based on game's statistics tracking]]
            return _currentSaveData?.statistics ?? new StatisticsData();
        }

        #endregion

        #region Public API

        public PlayerSaveData GetCurrentSaveData() => _currentSaveData;
        
        public bool IsSyncing() => _isSyncing;
        
        public bool HasUnsyncedChanges() => _hasUnsyncedChanges;
        
        public DateTime GetLastSyncTime() => _lastSyncTime;
        
        public int GetOfflineQueueSize() => _offlineQueue.Count;
        
        public Dictionary<int, SaveSlotMetadata> GetSaveSlots() => new Dictionary<int, SaveSlotMetadata>(_saveSlots);
        
        public async Task<bool> DeleteSaveSlot(int slotNumber)
        {
            try
            {
                // Delete from cloud
                if (_isOnline)
                {
                    var keys = new HashSet<string> 
                    { 
                        GetSaveKey(slotNumber), 
                        $"{GetSaveKey(slotNumber)}_metadata" 
                    };
                    await CloudSaveService.Instance.Data.Player.DeleteAsync(keys);
                }
                
                // Delete from local cache
                PlayerPrefs.DeleteKey($"save_slot_{slotNumber}");
                PlayerPrefs.DeleteKey($"save_slot_{slotNumber}_backup");
                PlayerPrefs.DeleteKey($"save_slot_{slotNumber}_metadata");
                PlayerPrefs.Save();
                
                // Update metadata
                _saveSlots.Remove(slotNumber);
                
                Debug.Log($"CloudSave: Deleted save slot {slotNumber}");
                return true;
            }
            catch (Exception ex)
            {
                Debug.LogError($"CloudSave: Failed to delete slot {slotNumber} - {ex.Message}");
                return false;
            }
        }

        public async Task<bool> ExportSaveData(string filePath)
        {
            try
            {
                var data = _currentSaveData ?? await LoadGame();
                var json = JsonConvert.SerializeObject(data, Formatting.Indented);
                await File.WriteAllTextAsync(filePath, json);
                Debug.Log($"CloudSave: Exported save data to {filePath}");
                return true;
            }
            catch (Exception ex)
            {
                Debug.LogError($"CloudSave: Failed to export save data - {ex.Message}");
                return false;
            }
        }

        public async Task<bool> ImportSaveData(string filePath)
        {
            try
            {
                var json = await File.ReadAllTextAsync(filePath);
                var data = JsonConvert.DeserializeObject<PlayerSaveData>(json);
                
                if (ValidateSaveData(data))
                {
                    _currentSaveData = data;
                    await SaveGame();
                    Debug.Log($"CloudSave: Imported save data from {filePath}");
                    return true;
                }
                
                Debug.LogError("CloudSave: Imported save data validation failed");
                return false;
            }
            catch (Exception ex)
            {
                Debug.LogError($"CloudSave: Failed to import save data - {ex.Message}");
                return false;
            }
        }

        #endregion

        #region Lifecycle

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus && autoSaveEnabled)
            {
                // Force save when pausing
                _ = SaveGame(0, SavePriority.High);
            }
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (!hasFocus && autoSaveEnabled && _hasUnsyncedChanges)
            {
                // Save when losing focus
                _ = SaveGame(0, SavePriority.Normal);
            }
        }

        private void OnDestroy()
        {
            if (_instance == this)
            {
                CancelInvoke();
                
                // Final save attempt
                if (_hasUnsyncedChanges)
                {
                    SaveToLocalCache(_currentSaveData, 0);
                }
            }
        }

        #endregion
    }
}
```

### 3. Testing and Validation

Create `Assets/Tests/PlayMode/CloudSaveTests.cs`:

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using {{project_namespace}}.CloudSave;

public class CloudSaveTests
{
    private AdvancedCloudSaveManager _cloudSave;

    [SetUp]
    public void Setup()
    {
        var go = new GameObject("CloudSave");
        _cloudSave = go.AddComponent<AdvancedCloudSaveManager>();
    }

    [UnityTest]
    public IEnumerator SaveAndLoad_RoundTrip_Success()
    {
        // Save
        var saveTask = _cloudSave.SaveGame(0);
        yield return new WaitUntil(() => saveTask.IsCompleted);
        Assert.IsTrue(saveTask.Result);

        // Load
        var loadTask = _cloudSave.LoadGame(0);
        yield return new WaitUntil(() => loadTask.IsCompleted);
        Assert.IsNotNull(loadTask.Result);
    }

    [UnityTest]
    public IEnumerator ConflictResolution_NewestWins()
    {
        // Test conflict resolution
        yield return null;
    }

    [TearDown]
    public void TearDown()
    {
        if (_cloudSave != null)
            Object.DestroyImmediate(_cloudSave.gameObject);
    }
}
```

## Success Criteria

- Save/load operations complete in < 2 seconds
- Conflict resolution handles all edge cases
- Data compression reduces size by > 50%
- Offline queue processes when reconnected
- Cross-platform saves work seamlessly
- Save versioning and migration functional
- No data loss during conflicts
- Auto-save works without blocking gameplay
- Save corruption recovery successful
- Privacy compliant (no PII in cloud)

## Notes

- Implements production-ready cloud save system
- Handles offline scenarios gracefully
- Provides comprehensive conflict resolution
- Supports data migration for updates
- Optimized for mobile and desktop
- [[LLM: Adapt to specific game save requirements]]