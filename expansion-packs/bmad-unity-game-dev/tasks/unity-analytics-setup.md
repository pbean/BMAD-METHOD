# Unity Analytics Integration Task

## Purpose

To implement comprehensive Unity Analytics with advanced event tracking, player segmentation, funnel analysis, and privacy-compliant data collection. This task extends `unity-cloud-services-setup.md` to provide production-ready analytics implementation following BMAD template processing patterns.

## Prerequisites

- Unity project with `com.unity.services.analytics` package installed
- Unity Services Core initialized (see `unity-cloud-services-setup.md`)
- Authentication service configured
- Project linked to Unity Dashboard with Analytics enabled
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Analytics Architecture Design

#### 1.1 Event Taxonomy Definition

Create comprehensive event taxonomy in `Assets/Scripts/Analytics/EventTaxonomy.cs`:

```csharp
using System;
using System.Collections.Generic;
using UnityEngine;

namespace {{project_namespace}}.Analytics
{
    /// <summary>
    /// Centralized event taxonomy following industry standards
    /// Reference: https://docs.unity.com/analytics/AnalyticsEventBestPractices.html
    /// </summary>
    public static class EventTaxonomy
    {
        // Core Event Categories
        public static class Categories
        {
            public const string GAMEPLAY = "gameplay";
            public const string MONETIZATION = "monetization";
            public const string PROGRESSION = "progression";
            public const string SOCIAL = "social";
            public const string PERFORMANCE = "performance";
            public const string UI_INTERACTION = "ui_interaction";
            public const string TUTORIAL = "tutorial";
            public const string SESSION = "session";
        }

        // Standard Event Names
        public static class Events
        {
            // Session Events
            public const string SESSION_START = "session_start";
            public const string SESSION_END = "session_end";
            public const string FIRST_OPEN = "first_open";

            // Gameplay Events
            public const string LEVEL_START = "level_start";
            public const string LEVEL_COMPLETE = "level_complete";
            public const string LEVEL_FAIL = "level_fail";
            public const string LEVEL_RESTART = "level_restart";
            public const string LEVEL_SKIP = "level_skip";

            // Progression Events
            public const string TUTORIAL_START = "tutorial_start";
            public const string TUTORIAL_COMPLETE = "tutorial_complete";
            public const string TUTORIAL_SKIP = "tutorial_skip";
            public const string ACHIEVEMENT_UNLOCKED = "achievement_unlocked";
            public const string MILESTONE_REACHED = "milestone_reached";

            // Monetization Events
            public const string PURCHASE_INITIATED = "purchase_initiated";
            public const string PURCHASE_COMPLETED = "purchase_completed";
            public const string PURCHASE_FAILED = "purchase_failed";
            public const string AD_SHOWN = "ad_shown";
            public const string AD_CLICKED = "ad_clicked";
            public const string AD_COMPLETED = "ad_completed";
            public const string AD_SKIPPED = "ad_skipped";

            // Social Events
            public const string SHARE_INITIATED = "share_initiated";
            public const string SHARE_COMPLETED = "share_completed";
            public const string INVITE_SENT = "invite_sent";
            public const string INVITE_ACCEPTED = "invite_accepted";

            // Performance Events
            public const string LOAD_TIME = "load_time";
            public const string FRAME_RATE_DROP = "frame_rate_drop";
            public const string CRASH_DETECTED = "crash_detected";
            public const string ERROR_OCCURRED = "error_occurred";

            // [[LLM: Add game-specific events based on game design document]]
        }

        // Standard Parameter Names
        public static class Parameters
        {
            // Context Parameters
            public const string LEVEL_ID = "level_id";
            public const string LEVEL_NAME = "level_name";
            public const string LEVEL_INDEX = "level_index";
            public const string DIFFICULTY = "difficulty";
            public const string GAME_MODE = "game_mode";

            // Performance Parameters
            public const string DURATION = "duration_ms";
            public const string SCORE = "score";
            public const string HIGH_SCORE = "high_score";
            public const string ATTEMPTS = "attempts";
            public const string SUCCESS = "success";

            // Monetization Parameters
            public const string PRODUCT_ID = "product_id";
            public const string PRICE = "price";
            public const string CURRENCY = "currency";
            public const string TRANSACTION_ID = "transaction_id";
            public const string RECEIPT = "receipt";

            // Player Parameters
            public const string PLAYER_LEVEL = "player_level";
            public const string PLAYER_XP = "player_xp";
            public const string PLAYER_SEGMENT = "player_segment";
            public const string AB_TEST_GROUP = "ab_test_group";

            // Technical Parameters
            public const string PLATFORM = "platform";
            public const string DEVICE_MODEL = "device_model";
            public const string OS_VERSION = "os_version";
            public const string APP_VERSION = "app_version";
            public const string BUILD_NUMBER = "build_number";
            public const string CONNECTION_TYPE = "connection_type";

            // Error Parameters
            public const string ERROR_CODE = "error_code";
            public const string ERROR_MESSAGE = "error_message";
            public const string STACK_TRACE = "stack_trace";
            public const string SEVERITY = "severity";
        }

        // Event Priority Levels (for batching and throttling)
        public enum Priority
        {
            CRITICAL = 0,   // Send immediately
            HIGH = 1,       // Send in next batch
            MEDIUM = 2,     // Standard batching
            LOW = 3         // Can be dropped if needed
        }

        // Event validation rules
        public static class Validation
        {
            public const int MAX_EVENT_NAME_LENGTH = 32;
            public const int MAX_PARAM_NAME_LENGTH = 24;
            public const int MAX_PARAM_VALUE_LENGTH = 256;
            public const int MAX_PARAMS_PER_EVENT = 25;
            public const int MAX_EVENTS_PER_HOUR = 1000;
        }
    }
}
```

#### 1.2 Advanced Analytics Manager

Create `Assets/Scripts/Analytics/AdvancedAnalyticsManager.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Threading.Tasks;
using Unity.Services.Analytics;
using Unity.Services.Core;
using UnityEngine;
using System.Linq;

namespace {{project_namespace}}.Analytics
{
    public class AdvancedAnalyticsManager : MonoBehaviour
    {
        private static AdvancedAnalyticsManager _instance;
        public static AdvancedAnalyticsManager Instance => _instance;

        [Header("Configuration")]
        [SerializeField] private bool enableDebugLogging = false;
        [SerializeField] private int batchSize = 100;
        [SerializeField] private float batchInterval = 30f;
        [SerializeField] private int maxRetries = 3;

        [Header("Privacy Settings")]
        [SerializeField] private bool requireConsent = true;
        [SerializeField] private bool anonymizeIpAddress = true;

        // Event queue for batching
        private ConcurrentQueue<QueuedEvent> _eventQueue;
        private float _lastBatchTime;

        // Session tracking
        private string _sessionId;
        private DateTime _sessionStartTime;
        private Dictionary<string, object> _sessionContext;

        // Player segmentation
        private string _playerSegment;
        private string _abTestGroup;

        // Privacy and consent
        private bool _hasUserConsent;
        private HashSet<string> _piiFields;

        // Performance tracking
        private PerformanceTracker _performanceTracker;

        // Event deduplication
        private LRUCache<string, DateTime> _recentEvents;

        private class QueuedEvent
        {
            public string EventName;
            public Dictionary<string, object> Parameters;
            public EventTaxonomy.Priority Priority;
            public DateTime Timestamp;
            public int RetryCount;
        }

        private void Awake()
        {
            if (_instance == null)
            {
                _instance = this;
                DontDestroyOnLoad(gameObject);
                InitializeAnalytics();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void InitializeAnalytics()
        {
            _eventQueue = new ConcurrentQueue<QueuedEvent>();
            _sessionContext = new Dictionary<string, object>();
            _piiFields = new HashSet<string> { "email", "name", "phone", "address" };
            _recentEvents = new LRUCache<string, DateTime>(1000);
            _performanceTracker = new PerformanceTracker();

            // Generate session ID
            _sessionId = Guid.NewGuid().ToString();
            _sessionStartTime = DateTime.UtcNow;

            // Load consent status
            _hasUserConsent = PlayerPrefs.GetInt("analytics_consent", 0) == 1;

            // Start batch processing
            InvokeRepeating(nameof(ProcessEventBatch), batchInterval, batchInterval);

            // Track session start
            TrackSessionStart();
        }

        #region Core Event Tracking

        public void TrackEvent(string eventName, Dictionary<string, object> parameters = null,
            EventTaxonomy.Priority priority = EventTaxonomy.Priority.MEDIUM)
        {
            if (!ValidateEvent(eventName, parameters))
                return;

            // Check consent
            if (requireConsent && !_hasUserConsent)
            {
                if (enableDebugLogging)
                    Debug.LogWarning($"Analytics: Event '{eventName}' dropped - no user consent");
                return;
            }

            // Deduplicate events
            string eventHash = GenerateEventHash(eventName, parameters);
            if (_recentEvents.ContainsKey(eventHash))
            {
                var lastTime = _recentEvents.Get(eventHash);
                if ((DateTime.UtcNow - lastTime).TotalSeconds < 1) // Prevent duplicate within 1 second
                {
                    if (enableDebugLogging)
                        Debug.LogWarning($"Analytics: Duplicate event '{eventName}' dropped");
                    return;
                }
            }
            _recentEvents.Set(eventHash, DateTime.UtcNow);

            // Enrich parameters
            var enrichedParams = EnrichParameters(parameters);

            // Sanitize PII
            enrichedParams = SanitizePII(enrichedParams);

            // Queue event
            var queuedEvent = new QueuedEvent
            {
                EventName = eventName,
                Parameters = enrichedParams,
                Priority = priority,
                Timestamp = DateTime.UtcNow,
                RetryCount = 0
            };

            _eventQueue.Enqueue(queuedEvent);

            // Send critical events immediately
            if (priority == EventTaxonomy.Priority.CRITICAL)
            {
                ProcessEventBatch();
            }

            if (enableDebugLogging)
                Debug.Log($"Analytics: Event '{eventName}' queued with {enrichedParams?.Count ?? 0} parameters");
        }

        private bool ValidateEvent(string eventName, Dictionary<string, object> parameters)
        {
            // Validate event name
            if (string.IsNullOrEmpty(eventName))
            {
                Debug.LogError("Analytics: Event name cannot be null or empty");
                return false;
            }

            if (eventName.Length > EventTaxonomy.Validation.MAX_EVENT_NAME_LENGTH)
            {
                Debug.LogError($"Analytics: Event name '{eventName}' exceeds maximum length");
                return false;
            }

            // Validate parameters
            if (parameters != null)
            {
                if (parameters.Count > EventTaxonomy.Validation.MAX_PARAMS_PER_EVENT)
                {
                    Debug.LogError($"Analytics: Event '{eventName}' has too many parameters");
                    return false;
                }

                foreach (var param in parameters)
                {
                    if (param.Key.Length > EventTaxonomy.Validation.MAX_PARAM_NAME_LENGTH)
                    {
                        Debug.LogError($"Analytics: Parameter name '{param.Key}' exceeds maximum length");
                        return false;
                    }

                    if (param.Value?.ToString().Length > EventTaxonomy.Validation.MAX_PARAM_VALUE_LENGTH)
                    {
                        Debug.LogError($"Analytics: Parameter value for '{param.Key}' exceeds maximum length");
                        return false;
                    }
                }
            }

            return true;
        }

        private Dictionary<string, object> EnrichParameters(Dictionary<string, object> parameters)
        {
            var enriched = parameters != null ?
                new Dictionary<string, object>(parameters) :
                new Dictionary<string, object>();

            // Add session context
            enriched["session_id"] = _sessionId;
            enriched["session_duration"] = (DateTime.UtcNow - _sessionStartTime).TotalSeconds;

            // Add player context
            if (!string.IsNullOrEmpty(_playerSegment))
                enriched[EventTaxonomy.Parameters.PLAYER_SEGMENT] = _playerSegment;
            if (!string.IsNullOrEmpty(_abTestGroup))
                enriched[EventTaxonomy.Parameters.AB_TEST_GROUP] = _abTestGroup;

            // Add technical context
            enriched[EventTaxonomy.Parameters.PLATFORM] = Application.platform.ToString();
            enriched[EventTaxonomy.Parameters.APP_VERSION] = Application.version;
            enriched[EventTaxonomy.Parameters.DEVICE_MODEL] = SystemInfo.deviceModel;
            enriched[EventTaxonomy.Parameters.OS_VERSION] = SystemInfo.operatingSystem;
            enriched[EventTaxonomy.Parameters.CONNECTION_TYPE] = Application.internetReachability.ToString();

            // Add performance context
            enriched["fps"] = _performanceTracker.GetAverageFPS();
            enriched["memory_usage_mb"] = _performanceTracker.GetMemoryUsageMB();

            // Add custom session context
            foreach (var context in _sessionContext)
            {
                if (!enriched.ContainsKey(context.Key))
                    enriched[context.Key] = context.Value;
            }

            // [[LLM: Add game-specific context enrichment based on current game state]]

            return enriched;
        }

        private Dictionary<string, object> SanitizePII(Dictionary<string, object> parameters)
        {
            if (parameters == null) return null;

            var sanitized = new Dictionary<string, object>();
            foreach (var param in parameters)
            {
                if (_piiFields.Contains(param.Key.ToLower()))
                {
                    // Hash PII data
                    sanitized[param.Key] = HashPII(param.Value?.ToString());
                }
                else
                {
                    sanitized[param.Key] = param.Value;
                }
            }

            return sanitized;
        }

        private string HashPII(string value)
        {
            if (string.IsNullOrEmpty(value)) return "";

            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                byte[] bytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(value));
                return Convert.ToBase64String(bytes);
            }
        }

        private string GenerateEventHash(string eventName, Dictionary<string, object> parameters)
        {
            var hash = eventName;
            if (parameters != null)
            {
                var sortedParams = parameters.OrderBy(p => p.Key);
                foreach (var param in sortedParams)
                {
                    hash += $"_{param.Key}:{param.Value}";
                }
            }
            return hash;
        }

        #endregion

        #region Batch Processing

        private async void ProcessEventBatch()
        {
            if (_eventQueue.IsEmpty) return;

            var batch = new List<QueuedEvent>();
            var processedCount = 0;

            // Dequeue events for batch
            while (!_eventQueue.IsEmpty && processedCount < batchSize)
            {
                if (_eventQueue.TryDequeue(out var evt))
                {
                    batch.Add(evt);
                    processedCount++;
                }
            }

            if (batch.Count == 0) return;

            // Sort by priority
            batch = batch.OrderBy(e => e.Priority).ToList();

            // Send batch to Unity Analytics
            foreach (var evt in batch)
            {
                try
                {
                    await SendEventToAnalytics(evt);
                }
                catch (Exception ex)
                {
                    Debug.LogError($"Analytics: Failed to send event '{evt.EventName}': {ex.Message}");

                    // Retry logic
                    if (evt.RetryCount < maxRetries)
                    {
                        evt.RetryCount++;
                        _eventQueue.Enqueue(evt);
                    }
                }
            }

            _lastBatchTime = Time.time;
        }

        private async Task SendEventToAnalytics(QueuedEvent evt)
        {
            // Custom event recording
            AnalyticsService.Instance.CustomData(evt.EventName, evt.Parameters);

            // For critical events, also send to custom backend
            if (evt.Priority == EventTaxonomy.Priority.CRITICAL)
            {
                await SendToCustomBackend(evt);
            }

            if (enableDebugLogging)
                Debug.Log($"Analytics: Sent event '{evt.EventName}'");
        }

        private async Task SendToCustomBackend(QueuedEvent evt)
        {
            // [[LLM: Implement custom backend integration if required]]
            // This could be your own analytics server, data warehouse, etc.
            await Task.CompletedTask;
        }

        #endregion

        #region Specialized Event Methods

        public void TrackLevelStart(int levelId, string levelName, string difficulty,
            Dictionary<string, object> additionalParams = null)
        {
            var parameters = new Dictionary<string, object>
            {
                { EventTaxonomy.Parameters.LEVEL_ID, levelId },
                { EventTaxonomy.Parameters.LEVEL_NAME, levelName },
                { EventTaxonomy.Parameters.DIFFICULTY, difficulty },
                { "timestamp", DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss") }
            };

            if (additionalParams != null)
            {
                foreach (var param in additionalParams)
                    parameters[param.Key] = param.Value;
            }

            TrackEvent(EventTaxonomy.Events.LEVEL_START, parameters);
        }

        public void TrackLevelComplete(int levelId, float duration, int score, bool isHighScore,
            Dictionary<string, object> additionalParams = null)
        {
            var parameters = new Dictionary<string, object>
            {
                { EventTaxonomy.Parameters.LEVEL_ID, levelId },
                { EventTaxonomy.Parameters.DURATION, duration },
                { EventTaxonomy.Parameters.SCORE, score },
                { EventTaxonomy.Parameters.HIGH_SCORE, isHighScore },
                { EventTaxonomy.Parameters.SUCCESS, true }
            };

            if (additionalParams != null)
            {
                foreach (var param in additionalParams)
                    parameters[param.Key] = param.Value;
            }

            TrackEvent(EventTaxonomy.Events.LEVEL_COMPLETE, parameters, EventTaxonomy.Priority.HIGH);
        }

        public void TrackPurchase(string productId, decimal price, string currency,
            string transactionId, Dictionary<string, object> additionalParams = null)
        {
            var parameters = new Dictionary<string, object>
            {
                { EventTaxonomy.Parameters.PRODUCT_ID, productId },
                { EventTaxonomy.Parameters.PRICE, price },
                { EventTaxonomy.Parameters.CURRENCY, currency },
                { EventTaxonomy.Parameters.TRANSACTION_ID, transactionId }
            };

            if (additionalParams != null)
            {
                foreach (var param in additionalParams)
                    parameters[param.Key] = param.Value;
            }

            // Revenue events are critical
            TrackEvent(EventTaxonomy.Events.PURCHASE_COMPLETED, parameters, EventTaxonomy.Priority.CRITICAL);

            // Also track to Unity's revenue tracking
            AnalyticsService.Instance.Transaction(new TransactionParameters
            {
                ProductID = productId,
                TransactionID = transactionId,
                Price = price,
                Currency = currency
            });
        }

        public void TrackError(string errorCode, string errorMessage, string stackTrace,
            string severity = "ERROR")
        {
            var parameters = new Dictionary<string, object>
            {
                { EventTaxonomy.Parameters.ERROR_CODE, errorCode },
                { EventTaxonomy.Parameters.ERROR_MESSAGE, errorMessage },
                { EventTaxonomy.Parameters.STACK_TRACE, stackTrace },
                { EventTaxonomy.Parameters.SEVERITY, severity }
            };

            TrackEvent(EventTaxonomy.Events.ERROR_OCCURRED, parameters, EventTaxonomy.Priority.HIGH);
        }

        public void TrackPerformanceMetric(string metricName, float value, string unit = "ms")
        {
            var parameters = new Dictionary<string, object>
            {
                { "metric_name", metricName },
                { "value", value },
                { "unit", unit }
            };

            TrackEvent("performance_metric", parameters, EventTaxonomy.Priority.LOW);
        }

        #endregion

        #region Session Management

        private void TrackSessionStart()
        {
            var parameters = new Dictionary<string, object>
            {
                { "session_id", _sessionId },
                { "previous_session_end", PlayerPrefs.GetString("last_session_end", "") },
                { "days_since_install", GetDaysSinceInstall() },
                { "session_count", PlayerPrefs.GetInt("session_count", 0) + 1 }
            };

            TrackEvent(EventTaxonomy.Events.SESSION_START, parameters, EventTaxonomy.Priority.HIGH);

            PlayerPrefs.SetInt("session_count", PlayerPrefs.GetInt("session_count", 0) + 1);
        }

        private void TrackSessionEnd()
        {
            var parameters = new Dictionary<string, object>
            {
                { "session_id", _sessionId },
                { "session_duration", (DateTime.UtcNow - _sessionStartTime).TotalSeconds },
                { "events_tracked", GetSessionEventCount() }
            };

            TrackEvent(EventTaxonomy.Events.SESSION_END, parameters, EventTaxonomy.Priority.HIGH);

            PlayerPrefs.SetString("last_session_end", DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss"));
        }

        private int GetDaysSinceInstall()
        {
            string installDate = PlayerPrefs.GetString("install_date", "");
            if (string.IsNullOrEmpty(installDate))
            {
                PlayerPrefs.SetString("install_date", DateTime.UtcNow.ToString("yyyy-MM-dd"));
                return 0;
            }

            if (DateTime.TryParse(installDate, out DateTime install))
            {
                return (DateTime.UtcNow - install).Days;
            }

            return 0;
        }

        private int GetSessionEventCount()
        {
            // [[LLM: Implement session event counting logic]]
            return 0;
        }

        public void SetSessionContext(string key, object value)
        {
            _sessionContext[key] = value;
        }

        #endregion

        #region Player Segmentation

        public void SetPlayerSegment(string segment)
        {
            _playerSegment = segment;
            PlayerPrefs.SetString("player_segment", segment);
        }

        public void SetABTestGroup(string group)
        {
            _abTestGroup = group;
            PlayerPrefs.SetString("ab_test_group", group);
        }

        public string GetPlayerSegment()
        {
            if (string.IsNullOrEmpty(_playerSegment))
                _playerSegment = PlayerPrefs.GetString("player_segment", "unknown");
            return _playerSegment;
        }

        #endregion

        #region Privacy and Consent

        public void SetUserConsent(bool hasConsent)
        {
            _hasUserConsent = hasConsent;
            PlayerPrefs.SetInt("analytics_consent", hasConsent ? 1 : 0);

            if (hasConsent)
            {
                TrackEvent("consent_granted", null, EventTaxonomy.Priority.CRITICAL);
            }
            else
            {
                TrackEvent("consent_revoked", null, EventTaxonomy.Priority.CRITICAL);
                RequestDataDeletion();
            }
        }

        public async void RequestDataDeletion()
        {
            try
            {
                await AnalyticsService.Instance.RequestDataDeletionAsync();
                Debug.Log("Analytics: Data deletion requested");
            }
            catch (Exception ex)
            {
                Debug.LogError($"Analytics: Failed to request data deletion: {ex.Message}");
            }
        }

        public void AddPIIField(string fieldName)
        {
            _piiFields.Add(fieldName.ToLower());
        }

        #endregion

        #region Lifecycle

        private void OnApplicationPause(bool pauseStatus)
        {
            if (pauseStatus)
            {
                ProcessEventBatch(); // Flush events before pause
            }
        }

        private void OnApplicationFocus(bool hasFocus)
        {
            if (!hasFocus)
            {
                ProcessEventBatch(); // Flush events when losing focus
            }
        }

        private void OnDestroy()
        {
            if (_instance == this)
            {
                TrackSessionEnd();
                ProcessEventBatch(); // Final flush
                CancelInvoke();
            }
        }

        #endregion
    }

    #region Helper Classes

    public class PerformanceTracker
    {
        private Queue<float> _fpsHistory = new Queue<float>(60);
        private float _lastFrameTime;

        public float GetAverageFPS()
        {
            return _fpsHistory.Count > 0 ? _fpsHistory.Average() : 60f;
        }

        public float GetMemoryUsageMB()
        {
            return GC.GetTotalMemory(false) / (1024f * 1024f);
        }

        public void Update()
        {
            float currentFPS = 1f / Time.deltaTime;
            _fpsHistory.Enqueue(currentFPS);

            if (_fpsHistory.Count > 60)
                _fpsHistory.Dequeue();
        }
    }

    public class LRUCache<TKey, TValue>
    {
        private readonly int _capacity;
        private readonly Dictionary<TKey, LinkedListNode<CacheItem>> _cache;
        private readonly LinkedList<CacheItem> _lru;

        private class CacheItem
        {
            public TKey Key { get; set; }
            public TValue Value { get; set; }
        }

        public LRUCache(int capacity)
        {
            _capacity = capacity;
            _cache = new Dictionary<TKey, LinkedListNode<CacheItem>>(capacity);
            _lru = new LinkedList<CacheItem>();
        }

        public bool ContainsKey(TKey key)
        {
            return _cache.ContainsKey(key);
        }

        public TValue Get(TKey key)
        {
            if (_cache.TryGetValue(key, out var node))
            {
                _lru.Remove(node);
                _lru.AddFirst(node);
                return node.Value.Value;
            }
            return default(TValue);
        }

        public void Set(TKey key, TValue value)
        {
            if (_cache.TryGetValue(key, out var node))
            {
                node.Value.Value = value;
                _lru.Remove(node);
                _lru.AddFirst(node);
            }
            else
            {
                if (_cache.Count >= _capacity)
                {
                    var lastNode = _lru.Last;
                    _cache.Remove(lastNode.Value.Key);
                    _lru.RemoveLast();
                }

                var cacheItem = new CacheItem { Key = key, Value = value };
                var newNode = _lru.AddFirst(cacheItem);
                _cache[key] = newNode;
            }
        }
    }

    #endregion
}
```

### 2. Funnel Analysis Implementation

#### 2.1 Create Funnel Tracker

Generate `Assets/Scripts/Analytics/FunnelTracker.cs`:

```csharp
using System;
using System.Collections.Generic;
using UnityEngine;

namespace {{project_namespace}}.Analytics
{
    public class FunnelTracker : MonoBehaviour
    {
        [System.Serializable]
        public class FunnelStep
        {
            public string stepName;
            public string eventName;
            public bool isCompleted;
            public DateTime? completionTime;
            public Dictionary<string, object> metadata;
        }

        [System.Serializable]
        public class Funnel
        {
            public string funnelName;
            public List<FunnelStep> steps;
            public DateTime startTime;
            public DateTime? completionTime;
            public float conversionRate;
        }

        private Dictionary<string, Funnel> _activeFunnels;
        private AdvancedAnalyticsManager _analytics;

        private void Awake()
        {
            _activeFunnels = new Dictionary<string, Funnel>();
            _analytics = AdvancedAnalyticsManager.Instance;
        }

        public void StartFunnel(string funnelName, List<string> stepNames)
        {
            var funnel = new Funnel
            {
                funnelName = funnelName,
                steps = new List<FunnelStep>(),
                startTime = DateTime.UtcNow
            };

            foreach (var stepName in stepNames)
            {
                funnel.steps.Add(new FunnelStep
                {
                    stepName = stepName,
                    eventName = $"{funnelName}_{stepName}",
                    isCompleted = false
                });
            }

            _activeFunnels[funnelName] = funnel;

            // Track funnel start
            _analytics.TrackEvent($"funnel_started", new Dictionary<string, object>
            {
                { "funnel_name", funnelName },
                { "total_steps", stepNames.Count }
            });
        }

        public void CompleteStep(string funnelName, string stepName, Dictionary<string, object> metadata = null)
        {
            if (!_activeFunnels.TryGetValue(funnelName, out var funnel))
            {
                Debug.LogWarning($"Funnel '{funnelName}' not found");
                return;
            }

            var step = funnel.steps.Find(s => s.stepName == stepName);
            if (step == null)
            {
                Debug.LogWarning($"Step '{stepName}' not found in funnel '{funnelName}'");
                return;
            }

            if (step.isCompleted)
            {
                Debug.LogWarning($"Step '{stepName}' already completed");
                return;
            }

            step.isCompleted = true;
            step.completionTime = DateTime.UtcNow;
            step.metadata = metadata;

            // Calculate step duration
            var stepIndex = funnel.steps.IndexOf(step);
            var previousTime = stepIndex > 0 && funnel.steps[stepIndex - 1].completionTime.HasValue
                ? funnel.steps[stepIndex - 1].completionTime.Value
                : funnel.startTime;
            var stepDuration = (step.completionTime.Value - previousTime).TotalSeconds;

            // Track step completion
            var parameters = new Dictionary<string, object>
            {
                { "funnel_name", funnelName },
                { "step_name", stepName },
                { "step_index", stepIndex },
                { "step_duration", stepDuration },
                { "total_duration", (DateTime.UtcNow - funnel.startTime).TotalSeconds }
            };

            if (metadata != null)
            {
                foreach (var meta in metadata)
                    parameters[meta.Key] = meta.Value;
            }

            _analytics.TrackEvent("funnel_step_completed", parameters);

            // Check if funnel is complete
            if (funnel.steps.TrueForAll(s => s.isCompleted))
            {
                CompleteFunnel(funnelName);
            }
        }

        private void CompleteFunnel(string funnelName)
        {
            if (!_activeFunnels.TryGetValue(funnelName, out var funnel))
                return;

            funnel.completionTime = DateTime.UtcNow;
            funnel.conversionRate = 1.0f; // 100% conversion for completed funnel

            var totalDuration = (funnel.completionTime.Value - funnel.startTime).TotalSeconds;

            _analytics.TrackEvent("funnel_completed", new Dictionary<string, object>
            {
                { "funnel_name", funnelName },
                { "total_duration", totalDuration },
                { "steps_completed", funnel.steps.Count },
                { "conversion_rate", funnel.conversionRate }
            }, EventTaxonomy.Priority.HIGH);

            _activeFunnels.Remove(funnelName);
        }

        public void AbandonFunnel(string funnelName, string reason = "unknown")
        {
            if (!_activeFunnels.TryGetValue(funnelName, out var funnel))
                return;

            var completedSteps = funnel.steps.FindAll(s => s.isCompleted).Count;
            var conversionRate = (float)completedSteps / funnel.steps.Count;

            _analytics.TrackEvent("funnel_abandoned", new Dictionary<string, object>
            {
                { "funnel_name", funnelName },
                { "completed_steps", completedSteps },
                { "total_steps", funnel.steps.Count },
                { "conversion_rate", conversionRate },
                { "abandon_reason", reason },
                { "duration", (DateTime.UtcNow - funnel.startTime).TotalSeconds }
            });

            _activeFunnels.Remove(funnelName);
        }

        public float GetFunnelConversionRate(string funnelName)
        {
            if (!_activeFunnels.TryGetValue(funnelName, out var funnel))
                return 0f;

            var completedSteps = funnel.steps.FindAll(s => s.isCompleted).Count;
            return (float)completedSteps / funnel.steps.Count;
        }
    }
}
```

### 3. Dashboard Configuration

#### 3.1 Dashboard Metrics Configuration

Create `Assets/Scripts/Analytics/DashboardConfig.cs`:

```csharp
using System.Collections.Generic;
using UnityEngine;

namespace {{project_namespace}}.Analytics
{
    [CreateAssetMenu(fileName = "DashboardConfig", menuName = "Analytics/Dashboard Configuration")]
    public class DashboardConfig : ScriptableObject
    {
        [Header("Key Performance Indicators")]
        public List<KPIDefinition> kpis = new List<KPIDefinition>();

        [Header("Funnel Definitions")]
        public List<FunnelDefinition> funnels = new List<FunnelDefinition>();

        [Header("Segments")]
        public List<SegmentDefinition> segments = new List<SegmentDefinition>();

        [Header("Reports")]
        public List<ReportDefinition> reports = new List<ReportDefinition>();

        [System.Serializable]
        public class KPIDefinition
        {
            public string name;
            public string description;
            public string formula;
            public string unit;
            public float targetValue;
            public float warningThreshold;
            public float criticalThreshold;
        }

        [System.Serializable]
        public class FunnelDefinition
        {
            public string name;
            public List<string> steps;
            public float expectedConversionRate;
        }

        [System.Serializable]
        public class SegmentDefinition
        {
            public string name;
            public string criteria;
            public Dictionary<string, object> filters;
        }

        [System.Serializable]
        public class ReportDefinition
        {
            public string name;
            public string schedule; // daily, weekly, monthly
            public List<string> metrics;
            public List<string> dimensions;
        }
    }
}
```

### 4. Privacy Compliance Manager

#### 4.1 GDPR/CCPA Compliance

Create `Assets/Scripts/Analytics/PrivacyComplianceManager.cs`:

```csharp
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace {{project_namespace}}.Analytics
{
    public class PrivacyComplianceManager : MonoBehaviour
    {
        private static PrivacyComplianceManager _instance;
        public static PrivacyComplianceManager Instance => _instance;

        [Header("Configuration")]
        [SerializeField] private bool enforceGDPR = true;
        [SerializeField] private bool enforceCCPA = true;
        [SerializeField] private bool enforceC0PPA = false;

        [Header("UI References")]
        [SerializeField] private GameObject consentDialog;
        [SerializeField] private Toggle analyticsToggle;
        [SerializeField] private Toggle advertisingToggle;
        [SerializeField] private Toggle personalizationToggle;

        private ConsentStatus _consentStatus;
        private DateTime _consentTimestamp;
        private string _consentVersion = "1.0";

        [System.Serializable]
        public class ConsentStatus
        {
            public bool analytics;
            public bool advertising;
            public bool personalization;
            public string ipAddress;
            public string country;
            public DateTime timestamp;
            public string version;
        }

        private void Awake()
        {
            if (_instance == null)
            {
                _instance = this;
                DontDestroyOnLoad(gameObject);
                LoadConsentStatus();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            CheckConsentRequirement();
        }

        private void CheckConsentRequirement()
        {
            // Check user location
            string country = GetUserCountry();

            bool requiresConsent = false;

            // GDPR (EU countries)
            if (enforceGDPR && IsEUCountry(country))
            {
                requiresConsent = true;
            }

            // CCPA (California)
            if (enforceCCPA && country == "US" && GetUserState() == "CA")
            {
                requiresConsent = true;
            }

            // COPPA (Under 13)
            if (enforceC0PPA && IsUserUnder13())
            {
                requiresConsent = true;
            }

            if (requiresConsent && !HasValidConsent())
            {
                ShowConsentDialog();
            }
            else
            {
                ApplyConsentSettings();
            }
        }

        private void ShowConsentDialog()
        {
            if (consentDialog != null)
            {
                consentDialog.SetActive(true);
                Time.timeScale = 0; // Pause game during consent
            }
        }

        public void OnConsentGiven()
        {
            _consentStatus = new ConsentStatus
            {
                analytics = analyticsToggle.isOn,
                advertising = advertisingToggle.isOn,
                personalization = personalizationToggle.isOn,
                timestamp = DateTime.UtcNow,
                version = _consentVersion,
                country = GetUserCountry(),
                ipAddress = GetAnonymizedIP()
            };

            SaveConsentStatus();
            ApplyConsentSettings();

            if (consentDialog != null)
            {
                consentDialog.SetActive(false);
                Time.timeScale = 1; // Resume game
            }

            // Track consent event
            AdvancedAnalyticsManager.Instance.TrackEvent("privacy_consent_given",
                new Dictionary<string, object>
                {
                    { "analytics", _consentStatus.analytics },
                    { "advertising", _consentStatus.advertising },
                    { "personalization", _consentStatus.personalization },
                    { "consent_version", _consentVersion }
                }, EventTaxonomy.Priority.CRITICAL);
        }

        public void OnConsentDenied()
        {
            _consentStatus = new ConsentStatus
            {
                analytics = false,
                advertising = false,
                personalization = false,
                timestamp = DateTime.UtcNow,
                version = _consentVersion
            };

            SaveConsentStatus();
            ApplyConsentSettings();

            if (consentDialog != null)
            {
                consentDialog.SetActive(false);
                Time.timeScale = 1;
            }
        }

        private void ApplyConsentSettings()
        {
            // Apply analytics consent
            if (AdvancedAnalyticsManager.Instance != null)
            {
                AdvancedAnalyticsManager.Instance.SetUserConsent(_consentStatus.analytics);
            }

            // [[LLM: Apply advertising consent to ad SDKs]]
            // [[LLM: Apply personalization consent to recommendation systems]]
        }

        public void RequestDataExport()
        {
            // Generate data export
            var exportData = new Dictionary<string, object>
            {
                { "user_id", GetUserId() },
                { "consent_status", _consentStatus },
                { "request_time", DateTime.UtcNow },
                { "data_categories", new[] { "analytics", "gameplay", "purchases" } }
            };

            AdvancedAnalyticsManager.Instance.TrackEvent("privacy_data_export_requested",
                exportData, EventTaxonomy.Priority.HIGH);

            // [[LLM: Implement actual data export to user]]
        }

        public void RequestDataDeletion()
        {
            AdvancedAnalyticsManager.Instance.RequestDataDeletion();

            // Clear local data
            PlayerPrefs.DeleteAll();

            // Track deletion request
            AdvancedAnalyticsManager.Instance.TrackEvent("privacy_data_deletion_requested",
                null, EventTaxonomy.Priority.CRITICAL);
        }

        private bool HasValidConsent()
        {
            if (_consentStatus == null) return false;

            // Check if consent version is current
            if (_consentStatus.version != _consentVersion) return false;

            // Check if consent is not older than 1 year (GDPR requirement)
            if ((DateTime.UtcNow - _consentStatus.timestamp).Days > 365) return false;

            return true;
        }

        private void LoadConsentStatus()
        {
            string json = PlayerPrefs.GetString("consent_status", "");
            if (!string.IsNullOrEmpty(json))
            {
                _consentStatus = JsonUtility.FromJson<ConsentStatus>(json);
            }
        }

        private void SaveConsentStatus()
        {
            string json = JsonUtility.ToJson(_consentStatus);
            PlayerPrefs.SetString("consent_status", json);
            PlayerPrefs.Save();
        }

        private string GetUserCountry()
        {
            // [[LLM: Implement IP-based geolocation or use Unity's location service]]
            return PlayerPrefs.GetString("user_country", "US");
        }

        private string GetUserState()
        {
            // [[LLM: Implement state detection for US users]]
            return PlayerPrefs.GetString("user_state", "CA");
        }

        private bool IsEUCountry(string country)
        {
            string[] euCountries = { "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI",
                                    "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU",
                                    "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE" };
            return Array.IndexOf(euCountries, country) >= 0;
        }

        private bool IsUserUnder13()
        {
            // [[LLM: Implement age verification logic]]
            return false;
        }

        private string GetAnonymizedIP()
        {
            // [[LLM: Implement IP anonymization (remove last octet for IPv4, etc.)]]
            return "0.0.0.0";
        }

        private string GetUserId()
        {
            return Unity.Services.Authentication.AuthenticationService.Instance.PlayerId;
        }
    }
}
```

### 5. Testing and Validation

#### 5.1 Analytics Test Suite

Create `Assets/Tests/PlayMode/AnalyticsTests.cs`:

```csharp
using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using {{project_namespace}}.Analytics;

public class AnalyticsTests
{
    private AdvancedAnalyticsManager _analytics;
    private FunnelTracker _funnelTracker;

    [SetUp]
    public void Setup()
    {
        var go = new GameObject("Analytics");
        _analytics = go.AddComponent<AdvancedAnalyticsManager>();
        _funnelTracker = go.AddComponent<FunnelTracker>();
    }

    [UnityTest]
    public IEnumerator TrackEvent_ValidEvent_Succeeds()
    {
        // Arrange
        string eventName = "test_event";
        var parameters = new Dictionary<string, object>
        {
            { "test_param", "value" },
            { "test_number", 42 }
        };

        // Act
        _analytics.TrackEvent(eventName, parameters);
        yield return new WaitForSeconds(0.1f);

        // Assert
        Assert.Pass("Event tracked without errors");
    }

    [UnityTest]
    public IEnumerator TrackEvent_ExceedsParameterLimit_Fails()
    {
        // Arrange
        string eventName = "test_event";
        var parameters = new Dictionary<string, object>();
        for (int i = 0; i < 30; i++) // Exceeds limit of 25
        {
            parameters[$"param_{i}"] = i;
        }

        // Act & Assert
        LogAssert.Expect(LogType.Error, new System.Text.RegularExpressions.Regex("too many parameters"));
        _analytics.TrackEvent(eventName, parameters);
        yield return null;
    }

    [UnityTest]
    public IEnumerator Funnel_CompleteAllSteps_TracksCompletion()
    {
        // Arrange
        string funnelName = "onboarding";
        var steps = new List<string> { "welcome", "tutorial", "first_game" };

        // Act
        _funnelTracker.StartFunnel(funnelName, steps);
        yield return new WaitForSeconds(0.1f);

        foreach (var step in steps)
        {
            _funnelTracker.CompleteStep(funnelName, step);
            yield return new WaitForSeconds(0.1f);
        }

        // Assert
        float conversionRate = _funnelTracker.GetFunnelConversionRate(funnelName);
        Assert.AreEqual(1.0f, conversionRate, 0.01f);
    }

    [UnityTest]
    public IEnumerator Privacy_ConsentDenied_NoEventsTracked()
    {
        // Arrange
        _analytics.SetUserConsent(false);

        // Act
        _analytics.TrackEvent("test_event", null);
        yield return new WaitForSeconds(0.1f);

        // Assert
        LogAssert.Expect(LogType.Warning, new System.Text.RegularExpressions.Regex("no user consent"));
    }

    [Test]
    public void EventValidation_LongEventName_Fails()
    {
        // Arrange
        string longEventName = new string('a', 50); // Exceeds 32 character limit

        // Act & Assert
        LogAssert.Expect(LogType.Error, new System.Text.RegularExpressions.Regex("exceeds maximum length"));
        _analytics.TrackEvent(longEventName, null);
    }

    [TearDown]
    public void TearDown()
    {
        if (_analytics != null)
            Object.DestroyImmediate(_analytics.gameObject);
    }
}
```

### 6. Documentation and Integration

#### 6.1 Generate Analytics Documentation

Create comprehensive documentation in task:

````markdown
## Analytics Integration Guide

### Quick Start

1. **Initialize Analytics**: Automatically initialized with Unity Services
2. **Track Events**: Use `AdvancedAnalyticsManager.Instance.TrackEvent()`
3. **Configure Privacy**: Set up consent dialogs and compliance
4. **View Dashboard**: Access Unity Dashboard for real-time metrics

### Event Tracking Best Practices

#### Event Naming Convention

- Use snake_case for event names
- Prefix with category (e.g., `gameplay_level_start`)
- Maximum 32 characters
- No PII in event names

#### Parameter Guidelines

- Maximum 25 parameters per event
- Use consistent parameter names across events
- Include context parameters (level, difficulty, etc.)
- Avoid high-cardinality values

### Funnel Analysis

Track user journeys through critical paths:

```csharp
// Start a funnel
FunnelTracker.Instance.StartFunnel("onboarding",
    new List<string> { "welcome", "tutorial", "first_game" });

// Complete steps
FunnelTracker.Instance.CompleteStep("onboarding", "welcome");
```
````

### Privacy Compliance

#### GDPR Compliance

- Consent required before tracking
- Data export available on request
- Data deletion within 30 days
- Annual consent renewal

#### CCPA Compliance

- Opt-out mechanism provided
- Do Not Sell option available
- Data disclosure on request

### Performance Considerations

- Events batched every 30 seconds
- Maximum 1000 events per hour
- Critical events sent immediately
- Automatic retry with exponential backoff

### Dashboard Configuration

Access Unity Dashboard at: https://dashboard.unity3d.com

Configure:

- Custom events and parameters
- Funnels and conversion tracking
- User segments and cohorts
- A/B test groups
- Revenue tracking
- [[LLM: Add project-specific dashboard setup steps]]

### Troubleshooting

#### Events Not Appearing

1. Check Unity Services initialization
2. Verify project ID configuration
3. Check consent status
4. Review event validation errors in console

#### High Memory Usage

1. Reduce batch size
2. Increase batch interval
3. Limit event queue size
4. Disable debug logging in production

### API Reference

See inline code documentation for detailed API reference.

```

### 7. Completion Checklist

- [ ] Analytics manager implemented with batching and retry logic
- [ ] Event taxonomy defined with standard events and parameters
- [ ] Funnel tracking system operational
- [ ] Privacy compliance (GDPR/CCPA) implemented
- [ ] Consent management UI configured
- [ ] Dashboard configuration documented
- [ ] Performance tracking integrated
- [ ] Error tracking and reporting active
- [ ] Player segmentation system ready
- [ ] A/B testing framework prepared
- [ ] Data export functionality available
- [ ] Data deletion process implemented
- [ ] Analytics tests passing
- [ ] Documentation complete
- [ ] Integration with Unity Services validated

## Success Criteria

- Events tracked with < 100ms overhead
- 99.9% event delivery rate
- Privacy compliant in all regions
- Dashboard shows real-time metrics
- Funnel conversion tracking accurate
- Player segments updating correctly
- No PII leakage in events
- Consent flow user-friendly
- Data export/deletion functional
- Performance metrics within targets

## Notes

- Follows Unity Analytics best practices
- Implements industry-standard event taxonomy
- Provides enterprise-grade privacy compliance
- Supports both real-time and batch analytics
- Integrates with Unity's native analytics service
- Extensible for custom analytics providers
- [[LLM: Adapt implementation based on specific game requirements and monetization strategy]]
```
