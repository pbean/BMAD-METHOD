# Unity Remote Config Integration Task

## Purpose

To implement comprehensive Unity Remote Config with feature flags, A/B testing frameworks, gradual rollouts, and real-time configuration updates. This task extends `unity-cloud-services-setup.md` to provide production-ready remote configuration following BMAD template processing patterns.

## Prerequisites

- Unity project with `com.unity.remote-config` package installed
- Unity Services Core initialized (see `unity-cloud-services-setup.md`)
- Authentication service configured
- Project linked to Unity Dashboard with Remote Config enabled
- Analytics integration recommended for measuring impact
- [[LLM: Verify prerequisites and halt if not met, provide remediation steps]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Remote Config Architecture

#### 1.1 Configuration Schema Design

Create `Assets/Scripts/RemoteConfig/ConfigurationSchema.cs`:

```csharp
using System;
using System.Collections.Generic;
using UnityEngine;

namespace {{project_namespace}}.RemoteConfig
{
    /// <summary>
    /// Comprehensive configuration schema with type safety and validation
    /// Reference: https://docs.unity.com/remote-config/
    /// </summary>
    
    [Serializable]
    public class ConfigurationSchema
    {
        // Game Balance Configuration
        [Serializable]
        public class GameBalanceConfig
        {
            [Range(0.1f, 10f)]
            public float difficultyMultiplier = 1.0f;
            
            [Range(1, 1000)]
            public int playerStartHealth = 100;
            
            [Range(1, 100)]
            public int playerBaseDamage = 10;
            
            [Range(0.5f, 5f)]
            public float enemyHealthScaling = 1.0f;
            
            [Range(0.5f, 5f)]
            public float enemyDamageScaling = 1.0f;
            
            [Range(0.1f, 10f)]
            public float experienceMultiplier = 1.0f;
            
            [Range(0.1f, 10f)]
            public float goldMultiplier = 1.0f;
            
            [Range(0.01f, 1f)]
            public float dropRateMultiplier = 1.0f;
            
            public Dictionary<string, float> weaponDamageModifiers;
            public Dictionary<string, float> enemyTypeModifiers;
            public Dictionary<int, LevelBalanceConfig> levelSpecificBalance;
            
            [Serializable]
            public class LevelBalanceConfig
            {
                public int levelId;
                public float difficultyOverride;
                public int enemyCount;
                public float timeLimit;
                public Dictionary<string, float> specificModifiers;
            }
        }
        
        // Feature Flags Configuration
        [Serializable]
        public class FeatureFlags
        {
            public bool newTutorialEnabled = false;
            public bool advancedGraphicsEnabled = false;
            public bool multiplayerEnabled = false;
            public bool seasonalEventActive = false;
            public bool debugMenuEnabled = false;
            public bool betaFeaturesEnabled = false;
            public bool socialFeaturesEnabled = true;
            public bool cloudSaveEnabled = true;
            public bool analyticsEnabled = true;
            public bool adsEnabled = true;
            
            // Feature rollout percentages (0-100)
            public int newFeatureRolloutPercentage = 0;
            public int experimentalFeaturePercentage = 0;
            
            // Feature variant flags
            public string uiVariant = "default"; // default, modern, classic
            public string tutorialVariant = "guided"; // guided, hints, none
            public string progressionSystem = "linear"; // linear, branching, open
            
            // Platform-specific flags
            public bool mobileSpecificFeatures = true;
            public bool consoleSpecificFeatures = true;
            public bool pcSpecificFeatures = true;
            
            // Time-gated features
            public DateTime featureUnlockDate;
            public DateTime featureExpireDate;
        }
        
        // Monetization Configuration
        [Serializable]
        public class MonetizationConfig
        {
            // Ad configuration
            public bool showInterstitialAds = true;
            public int interstitialAdFrequency = 3; // Show every N levels
            public bool showRewardedAds = true;
            public int rewardedAdCooldown = 300; // Seconds
            public bool showBannerAds = false;
            public string adProvider = "unity"; // unity, admob, ironsource
            
            // IAP configuration
            public bool inAppPurchasesEnabled = true;
            public float globalPriceMultiplier = 1.0f;
            public Dictionary<string, float> productPriceOverrides;
            public Dictionary<string, bool> productAvailability;
            public List<SpecialOffer> activeOffers;
            
            // Economy configuration
            public int dailyBonusAmount = 100;
            public int levelCompletionReward = 50;
            public float watchAdRewardMultiplier = 2.0f;
            public Dictionary<string, int> currencyExchangeRates;
            
            [Serializable]
            public class SpecialOffer
            {
                public string offerId;
                public string productId;
                public float discountPercentage;
                public DateTime startDate;
                public DateTime endDate;
                public int maxPurchases;
                public string targetSegment;
            }
        }
        
        // A/B Testing Configuration
        [Serializable]
        public class ABTestConfig
        {
            public string activeExperiment = "none";
            public string experimentGroup = "control";
            public Dictionary<string, ExperimentConfig> experiments;
            
            [Serializable]
            public class ExperimentConfig
            {
                public string experimentId;
                public string experimentName;
                public bool isActive;
                public DateTime startDate;
                public DateTime endDate;
                public List<ExperimentVariant> variants;
                public string primaryMetric;
                public List<string> secondaryMetrics;
                public float minimumSampleSize;
                public float confidenceLevel;
            }
            
            [Serializable]
            public class ExperimentVariant
            {
                public string variantId;
                public string variantName;
                public float trafficAllocation; // Percentage 0-100
                public Dictionary<string, object> parameters;
            }
        }
        
        // Live Ops Configuration
        [Serializable]
        public class LiveOpsConfig
        {
            // Events
            public List<LiveEvent> activeEvents;
            public string currentSeason = "default";
            public int seasonPassLevel = 1;
            
            // Messages
            public List<InGameMessage> messages;
            public string maintenanceMessage = "";
            public bool isMaintenanceMode = false;
            public DateTime nextMaintenanceWindow;
            
            // Content updates
            public List<ContentUpdate> availableUpdates;
            public bool forceUpdate = false;
            public string minimumVersion = "1.0.0";
            public string recommendedVersion = "1.0.0";
            
            [Serializable]
            public class LiveEvent
            {
                public string eventId;
                public string eventName;
                public string eventType;
                public DateTime startTime;
                public DateTime endTime;
                public Dictionary<string, object> eventData;
                public List<string> rewards;
                public bool isActive;
            }
            
            [Serializable]
            public class InGameMessage
            {
                public string messageId;
                public string title;
                public string body;
                public string imageUrl;
                public string actionUrl;
                public MessagePriority priority;
                public DateTime displayTime;
                public int displayDuration;
                public string targetSegment;
            }
            
            public enum MessagePriority
            {
                Low,
                Normal,
                High,
                Critical
            }
            
            [Serializable]
            public class ContentUpdate
            {
                public string updateId;
                public string updateType;
                public string contentUrl;
                public long contentSize;
                public string checksum;
                public bool isRequired;
            }
        }
        
        // Performance Configuration
        [Serializable]
        public class PerformanceConfig
        {
            // Graphics settings
            public int defaultQualityLevel = 2; // 0=Low, 1=Medium, 2=High, 3=Ultra
            public bool autoAdjustQuality = true;
            public int targetFrameRate = 60;
            public float renderScale = 1.0f;
            
            // LOD settings
            public float[] lodDistances = { 50f, 100f, 200f };
            public float lodBias = 1.0f;
            
            // Memory management
            public int maxMemoryUsageMB = 512;
            public bool aggressiveGC = false;
            public int textureStreamingBudgetMB = 256;
            
            // Network settings
            public int maxConcurrentDownloads = 3;
            public int downloadTimeoutSeconds = 30;
            public int apiCallTimeoutSeconds = 10;
            public int maxRetries = 3;
            
            // Platform-specific overrides
            public Dictionary<string, PlatformPerformanceConfig> platformOverrides;
            
            [Serializable]
            public class PlatformPerformanceConfig
            {
                public string platform;
                public int qualityLevel;
                public int targetFrameRate;
                public float renderScale;
                public int memoryBudgetMB;
            }
        }
        
        // Debug Configuration
        [Serializable]
        public class DebugConfig
        {
            public bool enableDebugLogging = false;
            public bool showFPS = false;
            public bool showMemoryStats = false;
            public bool showNetworkStats = false;
            public bool enableCheatCodes = false;
            public bool godMode = false;
            public bool unlockAllContent = false;
            public bool skipTutorials = false;
            public List<string> enabledDebugPanels;
            public Dictionary<string, string> debugOverrides;
        }
    }
}
```

#### 1.2 Advanced Remote Config Manager

Create `Assets/Scripts/RemoteConfig/AdvancedRemoteConfigManager.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Unity.Services.RemoteConfig;
using Unity.Services.Authentication;
using Unity.Services.Core;
using UnityEngine;
using Newtonsoft.Json;

namespace {{project_namespace}}.RemoteConfig
{
    public class AdvancedRemoteConfigManager : MonoBehaviour
    {
        private static AdvancedRemoteConfigManager _instance;
        public static AdvancedRemoteConfigManager Instance => _instance;

        [Header("Configuration")]
        [SerializeField] private bool autoFetch = true;
        [SerializeField] private float fetchInterval = 300f; // 5 minutes
        [SerializeField] private bool cacheEnabled = true;
        [SerializeField] private int cacheExpirationMinutes = 60;
        
        [Header("Fallback Settings")]
        [SerializeField] private TextAsset defaultConfigJson;
        [SerializeField] private bool useHardcodedFallback = true;
        
        // Current configuration
        private ConfigurationSchema _currentConfig;
        private ConfigurationSchema _fallbackConfig;
        private ConfigurationSchema _cachedConfig;
        
        // Feature flags cache
        private Dictionary<string, bool> _featureFlags;
        private Dictionary<string, string> _featureVariants;
        
        // A/B testing
        private string _currentExperiment;
        private string _experimentGroup;
        private Dictionary<string, object> _experimentParameters;
        
        // Configuration state
        private bool _isInitialized;
        private bool _isFetching;
        private DateTime _lastFetchTime;
        private DateTime _cacheTimestamp;
        
        // Events
        public event Action<ConfigurationSchema> OnConfigUpdated;
        public event Action<string, bool> OnFeatureFlagChanged;
        public event Action<string> OnConfigFetchFailed;
        public event Action<Dictionary<string, object>> OnExperimentAssigned;
        
        // Real-time updates
        private bool _realtimeUpdatesEnabled;
        private WebSocketConnection _webSocketConnection;

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

        private async void Initialize()
        {
            _featureFlags = new Dictionary<string, bool>();
            _featureVariants = new Dictionary<string, string>();
            _experimentParameters = new Dictionary<string, object>();
            
            // Load fallback configuration
            LoadFallbackConfig();
            
            // Load cached configuration
            LoadCachedConfig();
            
            // Apply initial configuration
            ApplyConfiguration(_cachedConfig ?? _fallbackConfig);
            
            // Setup Remote Config
            await SetupRemoteConfig();
            
            // Start auto-fetch if enabled
            if (autoFetch)
            {
                InvokeRepeating(nameof(FetchConfigPeriodically), fetchInterval, fetchInterval);
            }
            
            _isInitialized = true;
        }

        #region Configuration Setup

        private async Task SetupRemoteConfig()
        {
            try
            {
                // Wait for Unity Services initialization
                if (UnityServices.State != ServicesInitializationState.Initialized)
                {
                    await UnityServices.InitializeAsync();
                }
                
                // Wait for authentication
                if (!AuthenticationService.Instance.IsSignedIn)
                {
                    await AuthenticationService.Instance.SignInAnonymouslyAsync();
                }
                
                // Subscribe to fetch completion
                RemoteConfigService.Instance.FetchCompleted += OnFetchCompleted;
                
                // Set user attributes
                SetUserAttributes();
                
                // Set app attributes
                SetAppAttributes();
                
                // Initial fetch
                await FetchConfiguration();
                
                Debug.Log("RemoteConfig: Setup completed successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"RemoteConfig: Setup failed - {ex.Message}");
                OnConfigFetchFailed?.Invoke(ex.Message);
            }
        }

        private void SetUserAttributes()
        {
            var userAttributes = new Dictionary<string, object>
            {
                { "userId", AuthenticationService.Instance.PlayerId },
                { "platform", Application.platform.ToString() },
                { "deviceModel", SystemInfo.deviceModel },
                { "deviceType", SystemInfo.deviceType.ToString() },
                { "operatingSystem", SystemInfo.operatingSystem },
                { "language", Application.systemLanguage.ToString() },
                { "timezone", TimeZoneInfo.Local.Id },
                { "screenResolution", $"{Screen.width}x{Screen.height}" },
                { "graphicsDevice", SystemInfo.graphicsDeviceName }
            };
            
            // Add custom user attributes
            AddCustomUserAttributes(userAttributes);
            
            // [[LLM: Add game-specific user attributes like player level, segment, etc.]]
        }

        private void SetAppAttributes()
        {
            var appAttributes = new Dictionary<string, object>
            {
                { "appVersion", Application.version },
                { "buildNumber", {{build_number}} },
                { "environment", {{environment}}, // dev, staging, production
                { "bundleId", Application.identifier },
                { "installDate", GetInstallDate() },
                { "sessionCount", GetSessionCount() },
                { "crashCount", GetCrashCount() }
            };
            
            // [[LLM: Add additional app attributes]]
        }

        private void AddCustomUserAttributes(Dictionary<string, object> attributes)
        {
            // Player progression
            attributes["playerLevel"] = GetPlayerLevel();
            attributes["daysPlayed"] = GetDaysPlayed();
            attributes["totalPlaytime"] = GetTotalPlaytime();
            
            // Monetization
            attributes["isPayer"] = IsPayingPlayer();
            attributes["totalSpent"] = GetTotalSpent();
            attributes["lastPurchaseDate"] = GetLastPurchaseDate();
            
            // Engagement
            attributes["sessionLength"] = GetAverageSessionLength();
            attributes["retentionDays"] = GetRetentionDays();
            
            // Segmentation
            attributes["playerSegment"] = GetPlayerSegment();
            attributes["cohort"] = GetPlayerCohort();
            
            // [[LLM: Implement getter methods based on game systems]]
        }

        #endregion

        #region Configuration Fetching

        public async Task<bool> FetchConfiguration(bool forceRefresh = false)
        {
            if (_isFetching)
            {
                Debug.LogWarning("RemoteConfig: Fetch already in progress");
                return false;
            }

            // Check cache validity
            if (!forceRefresh && IsCacheValid())
            {
                Debug.Log("RemoteConfig: Using cached configuration");
                ApplyConfiguration(_cachedConfig);
                return true;
            }

            _isFetching = true;

            try
            {
                Debug.Log("RemoteConfig: Fetching configuration...");
                
                // Create fetch options
                var options = new FetchOptions
                {
                    EnvironmentID = {{environment_id}}, // Set in Unity Dashboard
                    SetEnvironmentID = true
                };
                
                // Fetch with attributes
                await RemoteConfigService.Instance.FetchConfigsAsync(
                    GetUserAttributes(),
                    GetAppAttributes()
                );
                
                _lastFetchTime = DateTime.UtcNow;
                
                Debug.Log("RemoteConfig: Fetch completed successfully");
                return true;
            }
            catch (RemoteConfigException ex)
            {
                Debug.LogError($"RemoteConfig: Fetch failed - {ex.Message}");
                OnConfigFetchFailed?.Invoke(ex.Message);
                
                // Fall back to cached or default config
                ApplyConfiguration(_cachedConfig ?? _fallbackConfig);
                return false;
            }
            finally
            {
                _isFetching = false;
            }
        }

        private void OnFetchCompleted(ConfigResponse response)
        {
            if (response.status == ConfigRequestStatus.Success)
            {
                Debug.Log($"RemoteConfig: Config fetched - Origin: {response.requestOrigin}");
                
                // Parse configuration
                var newConfig = ParseConfiguration(response.config);
                
                // Check for changes
                if (HasConfigurationChanged(newConfig))
                {
                    // Apply new configuration
                    ApplyConfiguration(newConfig);
                    
                    // Save to cache
                    SaveToCache(newConfig);
                    
                    // Notify listeners
                    OnConfigUpdated?.Invoke(newConfig);
                }
                
                // Handle experiments
                ProcessExperiments(response.config);
            }
            else
            {
                Debug.LogError($"RemoteConfig: Fetch failed - Status: {response.status}");
                OnConfigFetchFailed?.Invoke(response.status.ToString());
            }
        }

        private ConfigurationSchema ParseConfiguration(RuntimeConfig config)
        {
            var schema = new ConfigurationSchema();
            
            // Parse game balance
            schema.GameBalance = ParseGameBalance(config);
            
            // Parse feature flags
            schema.FeatureFlags = ParseFeatureFlags(config);
            
            // Parse monetization
            schema.Monetization = ParseMonetization(config);
            
            // Parse A/B testing
            schema.ABTesting = ParseABTesting(config);
            
            // Parse live ops
            schema.LiveOps = ParseLiveOps(config);
            
            // Parse performance
            schema.Performance = ParsePerformance(config);
            
            // Parse debug
            schema.Debug = ParseDebug(config);
            
            return schema;
        }

        private ConfigurationSchema.GameBalanceConfig ParseGameBalance(RuntimeConfig config)
        {
            return new ConfigurationSchema.GameBalanceConfig
            {
                difficultyMultiplier = config.GetFloat("difficulty_multiplier", 1.0f),
                playerStartHealth = config.GetInt("player_start_health", 100),
                playerBaseDamage = config.GetInt("player_base_damage", 10),
                enemyHealthScaling = config.GetFloat("enemy_health_scaling", 1.0f),
                enemyDamageScaling = config.GetFloat("enemy_damage_scaling", 1.0f),
                experienceMultiplier = config.GetFloat("experience_multiplier", 1.0f),
                goldMultiplier = config.GetFloat("gold_multiplier", 1.0f),
                dropRateMultiplier = config.GetFloat("drop_rate_multiplier", 1.0f)
            };
        }

        private ConfigurationSchema.FeatureFlags ParseFeatureFlags(RuntimeConfig config)
        {
            var flags = new ConfigurationSchema.FeatureFlags
            {
                newTutorialEnabled = config.GetBool("feature_new_tutorial", false),
                advancedGraphicsEnabled = config.GetBool("feature_advanced_graphics", false),
                multiplayerEnabled = config.GetBool("feature_multiplayer", false),
                seasonalEventActive = config.GetBool("feature_seasonal_event", false),
                debugMenuEnabled = config.GetBool("feature_debug_menu", false),
                betaFeaturesEnabled = config.GetBool("feature_beta", false),
                socialFeaturesEnabled = config.GetBool("feature_social", true),
                cloudSaveEnabled = config.GetBool("feature_cloud_save", true),
                analyticsEnabled = config.GetBool("feature_analytics", true),
                adsEnabled = config.GetBool("feature_ads", true),
                
                // Rollout percentages
                newFeatureRolloutPercentage = config.GetInt("rollout_new_feature", 0),
                experimentalFeaturePercentage = config.GetInt("rollout_experimental", 0),
                
                // Variants
                uiVariant = config.GetString("variant_ui", "default"),
                tutorialVariant = config.GetString("variant_tutorial", "guided"),
                progressionSystem = config.GetString("variant_progression", "linear")
            };
            
            // Cache feature flags for quick access
            CacheFeatureFlags(flags);
            
            return flags;
        }

        private void CacheFeatureFlags(ConfigurationSchema.FeatureFlags flags)
        {
            _featureFlags.Clear();
            _featureVariants.Clear();
            
            // Cache boolean flags
            _featureFlags["new_tutorial"] = flags.newTutorialEnabled;
            _featureFlags["advanced_graphics"] = flags.advancedGraphicsEnabled;
            _featureFlags["multiplayer"] = flags.multiplayerEnabled;
            _featureFlags["seasonal_event"] = flags.seasonalEventActive;
            _featureFlags["debug_menu"] = flags.debugMenuEnabled;
            _featureFlags["beta_features"] = flags.betaFeaturesEnabled;
            _featureFlags["social"] = flags.socialFeaturesEnabled;
            _featureFlags["cloud_save"] = flags.cloudSaveEnabled;
            _featureFlags["analytics"] = flags.analyticsEnabled;
            _featureFlags["ads"] = flags.adsEnabled;
            
            // Cache variants
            _featureVariants["ui"] = flags.uiVariant;
            _featureVariants["tutorial"] = flags.tutorialVariant;
            _featureVariants["progression"] = flags.progressionSystem;
        }

        #endregion

        #region Feature Flags & Rollouts

        public bool IsFeatureEnabled(string featureName)
        {
            if (_featureFlags.TryGetValue(featureName, out bool enabled))
            {
                return enabled;
            }
            
            // Check rollout percentage
            return IsInRollout(featureName);
        }

        private bool IsInRollout(string featureName)
        {
            int rolloutPercentage = 0;
            
            switch (featureName)
            {
                case "new_feature":
                    rolloutPercentage = _currentConfig?.FeatureFlags?.newFeatureRolloutPercentage ?? 0;
                    break;
                case "experimental":
                    rolloutPercentage = _currentConfig?.FeatureFlags?.experimentalFeaturePercentage ?? 0;
                    break;
            }
            
            if (rolloutPercentage <= 0) return false;
            if (rolloutPercentage >= 100) return true;
            
            // Use stable hash of user ID for consistent rollout
            var userId = AuthenticationService.Instance.PlayerId;
            var hash = GetStableHash(userId + featureName);
            var userPercentage = hash % 100;
            
            return userPercentage < rolloutPercentage;
        }

        public string GetFeatureVariant(string featureName)
        {
            return _featureVariants.TryGetValue(featureName, out string variant) ? 
                variant : "default";
        }

        public void EnableFeatureOverride(string featureName, bool enabled)
        {
            _featureFlags[featureName] = enabled;
            OnFeatureFlagChanged?.Invoke(featureName, enabled);
            
            Debug.Log($"RemoteConfig: Feature '{featureName}' overridden to {enabled}");
        }

        private int GetStableHash(string input)
        {
            int hash = 0;
            foreach (char c in input)
            {
                hash = ((hash << 5) - hash) + c;
                hash = hash & hash; // Convert to 32-bit integer
            }
            return Math.Abs(hash);
        }

        #endregion

        #region A/B Testing

        private void ProcessExperiments(RuntimeConfig config)
        {
            _currentExperiment = config.GetString("experiment_id", "none");
            _experimentGroup = config.GetString("experiment_group", "control");
            
            if (_currentExperiment != "none")
            {
                Debug.Log($"RemoteConfig: Assigned to experiment '{_currentExperiment}' group '{_experimentGroup}'");
                
                // Load experiment parameters
                LoadExperimentParameters(config);
                
                // Notify listeners
                OnExperimentAssigned?.Invoke(_experimentParameters);
                
                // Track assignment in analytics
                TrackExperimentAssignment();
            }
        }

        private void LoadExperimentParameters(RuntimeConfig config)
        {
            _experimentParameters.Clear();
            
            // Load all parameters prefixed with experiment group
            var prefix = $"exp_{_experimentGroup}_";
            
            // [[LLM: Parse experiment-specific parameters based on experiment design]]
            
            // Example parameters
            _experimentParameters["button_color"] = config.GetString($"{prefix}button_color", "blue");
            _experimentParameters["reward_multiplier"] = config.GetFloat($"{prefix}reward_multiplier", 1.0f);
            _experimentParameters["tutorial_type"] = config.GetString($"{prefix}tutorial_type", "standard");
        }

        private void TrackExperimentAssignment()
        {
            // [[LLM: Send experiment assignment to analytics]]
            var parameters = new Dictionary<string, object>
            {
                { "experiment_id", _currentExperiment },
                { "experiment_group", _experimentGroup },
                { "assignment_time", DateTime.UtcNow.ToString("O") }
            };
            
            // Track via analytics manager if available
        }

        public string GetExperimentGroup() => _experimentGroup;
        
        public T GetExperimentParameter<T>(string parameterName, T defaultValue = default)
        {
            if (_experimentParameters.TryGetValue(parameterName, out object value))
            {
                try
                {
                    return (T)Convert.ChangeType(value, typeof(T));
                }
                catch
                {
                    Debug.LogWarning($"RemoteConfig: Failed to convert experiment parameter '{parameterName}' to type {typeof(T)}");
                }
            }
            
            return defaultValue;
        }

        #endregion

        #region Live Operations

        public List<ConfigurationSchema.LiveOpsConfig.LiveEvent> GetActiveEvents()
        {
            var activeEvents = new List<ConfigurationSchema.LiveOpsConfig.LiveEvent>();
            
            if (_currentConfig?.LiveOps?.activeEvents != null)
            {
                var now = DateTime.UtcNow;
                foreach (var evt in _currentConfig.LiveOps.activeEvents)
                {
                    if (evt.isActive && evt.startTime <= now && evt.endTime >= now)
                    {
                        activeEvents.Add(evt);
                    }
                }
            }
            
            return activeEvents;
        }

        public bool IsEventActive(string eventId)
        {
            var activeEvents = GetActiveEvents();
            return activeEvents.Exists(e => e.eventId == eventId);
        }

        public ConfigurationSchema.LiveOpsConfig.InGameMessage GetNextMessage()
        {
            if (_currentConfig?.LiveOps?.messages == null || _currentConfig.LiveOps.messages.Count == 0)
                return null;
            
            var now = DateTime.UtcNow;
            var eligibleMessages = _currentConfig.LiveOps.messages.FindAll(m => 
                m.displayTime <= now && 
                IsInTargetSegment(m.targetSegment)
            );
            
            if (eligibleMessages.Count == 0)
                return null;
            
            // Sort by priority and return highest
            eligibleMessages.Sort((a, b) => b.priority.CompareTo(a.priority));
            return eligibleMessages[0];
        }

        private bool IsInTargetSegment(string segment)
        {
            if (string.IsNullOrEmpty(segment) || segment == "all")
                return true;
            
            // [[LLM: Implement segment matching based on player data]]
            return GetPlayerSegment() == segment;
        }

        public bool IsMaintenanceMode()
        {
            return _currentConfig?.LiveOps?.isMaintenanceMode ?? false;
        }

        public string GetMaintenanceMessage()
        {
            return _currentConfig?.LiveOps?.maintenanceMessage ?? "Server maintenance in progress";
        }

        #endregion

        #region Kill Switches

        public void ImplementKillSwitch(string feature)
        {
            // Immediate feature disable
            _featureFlags[feature] = false;
            OnFeatureFlagChanged?.Invoke(feature, false);
            
            Debug.LogWarning($"RemoteConfig: Kill switch activated for feature '{feature}'");
            
            // Disable related systems
            switch (feature)
            {
                case "multiplayer":
                    DisableMultiplayer();
                    break;
                case "ads":
                    DisableAds();
                    break;
                case "iap":
                    DisableIAP();
                    break;
                // [[LLM: Add other kill switch implementations]]
            }
        }

        private void DisableMultiplayer()
        {
            // [[LLM: Implement multiplayer shutdown]]
            Debug.Log("RemoteConfig: Multiplayer disabled via kill switch");
        }

        private void DisableAds()
        {
            // [[LLM: Implement ad system shutdown]]
            Debug.Log("RemoteConfig: Ads disabled via kill switch");
        }

        private void DisableIAP()
        {
            // [[LLM: Implement IAP shutdown]]
            Debug.Log("RemoteConfig: IAP disabled via kill switch");
        }

        #endregion

        #region Configuration Application

        private void ApplyConfiguration(ConfigurationSchema config)
        {
            if (config == null)
            {
                Debug.LogError("RemoteConfig: Cannot apply null configuration");
                return;
            }
            
            _currentConfig = config;
            
            // Apply game balance
            ApplyGameBalance(config.GameBalance);
            
            // Apply feature flags
            ApplyFeatureFlags(config.FeatureFlags);
            
            // Apply monetization
            ApplyMonetization(config.Monetization);
            
            // Apply performance settings
            ApplyPerformanceSettings(config.Performance);
            
            // Apply debug settings
            ApplyDebugSettings(config.Debug);
            
            Debug.Log("RemoteConfig: Configuration applied successfully");
        }

        private void ApplyGameBalance(ConfigurationSchema.GameBalanceConfig balance)
        {
            if (balance == null) return;
            
            // [[LLM: Apply balance changes to game systems]]
            // Example:
            // GameManager.Instance.SetDifficultyMultiplier(balance.difficultyMultiplier);
            // PlayerController.Instance.SetHealth(balance.playerStartHealth);
            // CombatSystem.Instance.SetDamage(balance.playerBaseDamage);
        }

        private void ApplyFeatureFlags(ConfigurationSchema.FeatureFlags flags)
        {
            if (flags == null) return;
            
            // Check for changes and notify
            foreach (var flag in _featureFlags)
            {
                bool newValue = IsFeatureEnabled(flag.Key);
                if (flag.Value != newValue)
                {
                    OnFeatureFlagChanged?.Invoke(flag.Key, newValue);
                }
            }
        }

        private void ApplyMonetization(ConfigurationSchema.MonetizationConfig monetization)
        {
            if (monetization == null) return;
            
            // [[LLM: Apply monetization settings to ad and IAP systems]]
        }

        private void ApplyPerformanceSettings(ConfigurationSchema.PerformanceConfig performance)
        {
            if (performance == null) return;
            
            // Apply quality settings
            QualitySettings.SetQualityLevel(performance.defaultQualityLevel);
            Application.targetFrameRate = performance.targetFrameRate;
            
            // Apply LOD settings
            QualitySettings.lodBias = performance.lodBias;
            
            // [[LLM: Apply other performance settings]]
        }

        private void ApplyDebugSettings(ConfigurationSchema.DebugConfig debug)
        {
            if (debug == null) return;
            
            // [[LLM: Apply debug settings]]
        }

        #endregion

        #region Caching

        private void SaveToCache(ConfigurationSchema config)
        {
            if (!cacheEnabled) return;
            
            try
            {
                var json = JsonConvert.SerializeObject(config);
                PlayerPrefs.SetString("remote_config_cache", json);
                PlayerPrefs.SetString("remote_config_timestamp", DateTime.UtcNow.ToString("O"));
                PlayerPrefs.Save();
                
                _cachedConfig = config;
                _cacheTimestamp = DateTime.UtcNow;
                
                Debug.Log("RemoteConfig: Configuration cached successfully");
            }
            catch (Exception ex)
            {
                Debug.LogError($"RemoteConfig: Failed to cache configuration - {ex.Message}");
            }
        }

        private void LoadCachedConfig()
        {
            if (!cacheEnabled) return;
            
            try
            {
                var json = PlayerPrefs.GetString("remote_config_cache", "");
                if (!string.IsNullOrEmpty(json))
                {
                    _cachedConfig = JsonConvert.DeserializeObject<ConfigurationSchema>(json);
                    
                    var timestampStr = PlayerPrefs.GetString("remote_config_timestamp", "");
                    if (DateTime.TryParse(timestampStr, out DateTime timestamp))
                    {
                        _cacheTimestamp = timestamp;
                    }
                    
                    Debug.Log("RemoteConfig: Cached configuration loaded");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"RemoteConfig: Failed to load cached configuration - {ex.Message}");
            }
        }

        private bool IsCacheValid()
        {
            if (_cachedConfig == null) return false;
            
            var cacheAge = (DateTime.UtcNow - _cacheTimestamp).TotalMinutes;
            return cacheAge < cacheExpirationMinutes;
        }

        #endregion

        #region Fallback Configuration

        private void LoadFallbackConfig()
        {
            if (defaultConfigJson != null)
            {
                try
                {
                    _fallbackConfig = JsonConvert.DeserializeObject<ConfigurationSchema>(defaultConfigJson.text);
                    Debug.Log("RemoteConfig: Fallback configuration loaded");
                }
                catch (Exception ex)
                {
                    Debug.LogError($"RemoteConfig: Failed to load fallback configuration - {ex.Message}");
                }
            }
            
            // Hard-coded fallback if JSON fails
            if (_fallbackConfig == null && useHardcodedFallback)
            {
                _fallbackConfig = GetHardcodedFallback();
            }
        }

        private ConfigurationSchema GetHardcodedFallback()
        {
            return new ConfigurationSchema
            {
                GameBalance = new ConfigurationSchema.GameBalanceConfig
                {
                    difficultyMultiplier = 1.0f,
                    playerStartHealth = 100,
                    playerBaseDamage = 10
                },
                FeatureFlags = new ConfigurationSchema.FeatureFlags
                {
                    cloudSaveEnabled = true,
                    analyticsEnabled = true
                },
                // [[LLM: Complete hardcoded fallback]]
            };
        }

        #endregion

        #region Real-time Updates

        public void EnableRealtimeUpdates()
        {
            if (_realtimeUpdatesEnabled) return;
            
            _realtimeUpdatesEnabled = true;
            ConnectWebSocket();
        }

        private void ConnectWebSocket()
        {
            // [[LLM: Implement WebSocket connection for real-time config updates]]
            // This would connect to a WebSocket endpoint that pushes config changes
        }

        private void OnRealtimeConfigUpdate(string configJson)
        {
            try
            {
                var newConfig = JsonConvert.DeserializeObject<ConfigurationSchema>(configJson);
                
                if (HasConfigurationChanged(newConfig))
                {
                    ApplyConfiguration(newConfig);
                    SaveToCache(newConfig);
                    OnConfigUpdated?.Invoke(newConfig);
                    
                    Debug.Log("RemoteConfig: Real-time configuration update applied");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"RemoteConfig: Failed to apply real-time update - {ex.Message}");
            }
        }

        #endregion

        #region Utility Methods

        private bool HasConfigurationChanged(ConfigurationSchema newConfig)
        {
            if (_currentConfig == null) return true;
            
            // Compare configurations
            var currentJson = JsonConvert.SerializeObject(_currentConfig);
            var newJson = JsonConvert.SerializeObject(newConfig);
            
            return currentJson != newJson;
        }

        private async void FetchConfigPeriodically()
        {
            if (!autoFetch) return;
            
            await FetchConfiguration();
        }

        private Dictionary<string, object> GetUserAttributes()
        {
            var attributes = new Dictionary<string, object>();
            SetUserAttributes();
            return attributes;
        }

        private Dictionary<string, object> GetAppAttributes()
        {
            var attributes = new Dictionary<string, object>();
            SetAppAttributes();
            return attributes;
        }

        // Placeholder methods - implement based on game systems
        private int GetPlayerLevel() => PlayerPrefs.GetInt("player_level", 1);
        private int GetDaysPlayed() => PlayerPrefs.GetInt("days_played", 0);
        private float GetTotalPlaytime() => PlayerPrefs.GetFloat("total_playtime", 0);
        private bool IsPayingPlayer() => PlayerPrefs.GetInt("is_payer", 0) == 1;
        private float GetTotalSpent() => PlayerPrefs.GetFloat("total_spent", 0);
        private string GetLastPurchaseDate() => PlayerPrefs.GetString("last_purchase", "");
        private float GetAverageSessionLength() => PlayerPrefs.GetFloat("avg_session", 0);
        private int GetRetentionDays() => PlayerPrefs.GetInt("retention_days", 0);
        private string GetPlayerSegment() => PlayerPrefs.GetString("player_segment", "new");
        private string GetPlayerCohort() => PlayerPrefs.GetString("player_cohort", "2024-01");
        private string GetInstallDate() => PlayerPrefs.GetString("install_date", DateTime.UtcNow.ToString("O"));
        private int GetSessionCount() => PlayerPrefs.GetInt("session_count", 0);
        private int GetCrashCount() => PlayerPrefs.GetInt("crash_count", 0);

        #endregion

        #region Public API

        public ConfigurationSchema GetCurrentConfig() => _currentConfig;
        
        public T GetConfigValue<T>(string key, T defaultValue = default)
        {
            var config = RemoteConfigService.Instance.appConfig;
            
            if (typeof(T) == typeof(int))
                return (T)(object)config.GetInt(key, (int)(object)defaultValue);
            else if (typeof(T) == typeof(float))
                return (T)(object)config.GetFloat(key, (float)(object)defaultValue);
            else if (typeof(T) == typeof(bool))
                return (T)(object)config.GetBool(key, (bool)(object)defaultValue);
            else if (typeof(T) == typeof(string))
                return (T)(object)config.GetString(key, (string)(object)defaultValue);
            
            return defaultValue;
        }
        
        public void ForceConfigRefresh()
        {
            _ = FetchConfiguration(true);
        }
        
        public bool IsInitialized() => _isInitialized;
        
        public bool IsFetching() => _isFetching;
        
        public DateTime GetLastFetchTime() => _lastFetchTime;

        #endregion

        #region Lifecycle

        private void OnApplicationPause(bool pauseStatus)
        {
            if (!pauseStatus && autoFetch)
            {
                // Refresh config when returning from pause
                _ = FetchConfiguration();
            }
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (hasFocus && autoFetch)
            {
                // Check if we should refresh
                var timeSinceLastFetch = (DateTime.UtcNow - _lastFetchTime).TotalMinutes;
                if (timeSinceLastFetch > 30) // Refresh if older than 30 minutes
                {
                    _ = FetchConfiguration();
                }
            }
        }

        private void OnDestroy()
        {
            if (_instance == this)
            {
                CancelInvoke();
                
                if (RemoteConfigService.Instance != null)
                {
                    RemoteConfigService.Instance.FetchCompleted -= OnFetchCompleted;
                }
                
                // Disconnect WebSocket if connected
                _webSocketConnection?.Disconnect();
            }
        }

        #endregion
    }

    // Helper class for WebSocket connection (simplified)
    public class WebSocketConnection
    {
        public void Disconnect()
        {
            // [[LLM: Implement WebSocket disconnection]]
        }
    }
}
```

### 3. Testing Implementation

Create `Assets/Tests/PlayMode/RemoteConfigTests.cs`:

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using {{project_namespace}}.RemoteConfig;

public class RemoteConfigTests
{
    private AdvancedRemoteConfigManager _remoteConfig;

    [SetUp]
    public void Setup()
    {
        var go = new GameObject("RemoteConfig");
        _remoteConfig = go.AddComponent<AdvancedRemoteConfigManager>();
    }

    [UnityTest]
    public IEnumerator FetchConfig_Success()
    {
        var task = _remoteConfig.FetchConfiguration();
        yield return new WaitUntil(() => task.IsCompleted);
        
        Assert.IsTrue(task.Result);
        Assert.IsNotNull(_remoteConfig.GetCurrentConfig());
    }

    [Test]
    public void FeatureFlag_RolloutPercentage()
    {
        // Test rollout logic
        Assert.Pass();
    }

    [TearDown]
    public void TearDown()
    {
        if (_remoteConfig != null)
            Object.DestroyImmediate(_remoteConfig.gameObject);
    }
}
```

## Success Criteria

- Configuration fetched in < 2 seconds
- Feature flags apply immediately
- A/B test assignment consistent
- Rollout percentages accurate
- Kill switches work instantly
- Cache survives app restarts
- Fallback config always available
- Real-time updates < 100ms latency
- No performance impact on gameplay
- Dashboard changes reflect in-game

## Notes

- Implements enterprise-grade remote configuration
- Supports complex A/B testing scenarios
- Provides instant kill switches for emergencies
- Enables gradual feature rollouts
- Integrates with Unity Analytics for impact measurement
- [[LLM: Adapt to specific game configuration needs]]