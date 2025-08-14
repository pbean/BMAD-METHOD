# Unity ScriptableObject Setup and Data Architecture Task

## Purpose

To establish comprehensive ScriptableObject-based data architecture patterns that enable flexible, maintainable, and designer-friendly data management in Unity projects. This task extends `interface-design.md` and `component-architecture.md` to provide advanced ScriptableObject patterns including data containers, configuration systems, event architectures, and runtime data management that supports both development workflow optimization and runtime performance requirements.

## Prerequisites

- Unity project with interface design patterns established and validated
- Component architecture implemented with proper dependency management
- Unity project configured with appropriate asset organization and folder structure
- ScriptableObject concepts understood with Unity serialization knowledge
- C# inheritance and polymorphism concepts familiar for advanced patterns
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Core ScriptableObject Architecture Foundation

#### 1.1 Base ScriptableObject System and Patterns

[[LLM: Analyze the project's data management needs, configuration requirements, and asset organization to design a comprehensive ScriptableObject system. Consider Unity's serialization capabilities, asset workflow integration, and runtime performance characteristics. Design base classes and interfaces that enable flexible data modeling while maintaining type safety and editor usability.]]

**Core ScriptableObject Foundation**:

```csharp
// Assets/Scripts/Data/Core/BaseScriptableObject.cs
using System;
using UnityEngine;
using {{project_namespace}}.Interfaces.Core;

namespace {{project_namespace}}.Data.Core
{
    /// <summary>
    /// Enhanced base class for all ScriptableObjects in the project
    /// Provides validation, versioning, and runtime management capabilities
    /// </summary>
    public abstract class BaseScriptableObject : ScriptableObject, IValidatable, IIdentifiable
    {
        [Header("Base Configuration")]
        [SerializeField] protected string objectId = "";
        [SerializeField] protected string displayName = "";
        [SerializeField] protected string description = "";
        [SerializeField] protected int version = 1;
        
        [Header("Runtime Settings")]
        [SerializeField] protected bool enableRuntimeValidation = true;
        [SerializeField] protected bool enableDebugLogging = false;
        
        [Header("Editor Settings")]
        [SerializeField] protected bool autoGenerateId = true;
        [SerializeField] protected Color inspectorColor = Color.white;
        
        private bool isInitialized = false;
        private DateTime lastValidationTime = DateTime.MinValue;
        private ValidationResult lastValidationResult;
        
        /// <summary>
        /// Unique identifier for this ScriptableObject
        /// </summary>
        public string Id 
        { 
            get => string.IsNullOrEmpty(objectId) ? name : objectId;
            protected set => objectId = value;
        }
        
        /// <summary>
        /// Display name for this ScriptableObject
        /// </summary>
        public string DisplayName 
        { 
            get => string.IsNullOrEmpty(displayName) ? name : displayName;
            protected set => displayName = value;
        }
        
        /// <summary>
        /// Description of this ScriptableObject's purpose
        /// </summary>
        public string Description 
        { 
            get => description;
            protected set => description = value;
        }
        
        /// <summary>
        /// Version number for data migration support
        /// </summary>
        public int Version 
        { 
            get => version;
            protected set => version = value;
        }
        
        /// <summary>
        /// Whether this ScriptableObject has been initialized
        /// </summary>
        public bool IsInitialized => isInitialized;
        
        /// <summary>
        /// Last validation result
        /// </summary>
        public ValidationResult LastValidationResult => lastValidationResult;
        
        /// <summary>
        /// Event fired when this ScriptableObject is initialized
        /// </summary>
        public event Action<BaseScriptableObject> OnInitialized;
        
        /// <summary>
        /// Event fired when validation state changes
        /// </summary>
        public event Action<ValidationResult> OnValidationChanged;
        
        #region Unity Lifecycle
        
        protected virtual void OnEnable()
        {
            if (!isInitialized)
            {
                InitializeObject();
            }
            
            if (enableRuntimeValidation)
            {
                ValidateIfNeeded();
            }
        }
        
        protected virtual void OnValidate()
        {
            #if UNITY_EDITOR
            if (autoGenerateId && string.IsNullOrEmpty(objectId))
            {
                objectId = GenerateUniqueId();
            }
            
            // Ensure display name is set
            if (string.IsNullOrEmpty(displayName))
            {
                displayName = name;
            }
            
            // Perform editor-time validation
            ValidateInEditor();
            #endif
        }
        
        #endregion
        
        #region Initialization and Validation
        
        /// <summary>
        /// Initialize this ScriptableObject
        /// </summary>
        public virtual void Initialize()
        {
            if (isInitialized)
            {
                LogWarning("Attempting to initialize already initialized ScriptableObject");
                return;
            }
            
            try
            {
                OnInitialize();
                isInitialized = true;
                OnInitialized?.Invoke(this);
                LogDebug($"Initialized ScriptableObject: {DisplayName}");
            }
            catch (Exception ex)
            {
                LogError($"Failed to initialize ScriptableObject {DisplayName}: {ex.Message}");
                throw;
            }
        }
        
        /// <summary>
        /// Override this method to implement custom initialization logic
        /// </summary>
        protected virtual void OnInitialize()
        {
            // Base implementation - override in derived classes
        }
        
        /// <summary>
        /// Validate this ScriptableObject
        /// </summary>
        public virtual ValidationResult Validate()
        {
            var result = new ValidationResult();
            
            try
            {
                // Validate base properties
                ValidateBaseProperties(result);
                
                // Validate derived class properties
                ValidateCustomProperties(result);
                
                // Cache validation result
                lastValidationResult = result;
                lastValidationTime = DateTime.UtcNow;
                
                OnValidationChanged?.Invoke(result);
                
                if (result.IsValid)
                {
                    LogDebug($"Validation passed for {DisplayName}");
                }
                else
                {
                    LogWarning($"Validation failed for {DisplayName}: {result.GetErrorSummary()}");
                }
            }
            catch (Exception ex)
            {
                result.AddError($"Exception during validation: {ex.Message}");
                LogError($"Validation exception for {DisplayName}: {ex.Message}");
            }
            
            return result;
        }
        
        /// <summary>
        /// Override this method to implement custom validation logic
        /// </summary>
        protected virtual void ValidateCustomProperties(ValidationResult result)
        {
            // Base implementation - override in derived classes
        }
        
        private void ValidateBaseProperties(ValidationResult result)
        {
            if (string.IsNullOrEmpty(objectId))
            {
                result.AddError("Object ID cannot be empty");
            }
            
            if (string.IsNullOrEmpty(displayName))
            {
                result.AddWarning("Display name is empty, using asset name");
                displayName = name;
            }
            
            if (version <= 0)
            {
                result.AddError("Version must be greater than 0");
            }
        }
        
        private void ValidateIfNeeded()
        {
            if (!enableRuntimeValidation)
                return;
                
            // Validate if never validated or if validation is stale
            if (lastValidationResult == null || 
                (DateTime.UtcNow - lastValidationTime).TotalMinutes > 5)
            {
                Validate();
            }
        }
        
        #endregion
        
        #region Utility Methods
        
        /// <summary>
        /// Create a copy of this ScriptableObject
        /// </summary>
        public T CreateCopy<T>() where T : BaseScriptableObject
        {
            var copy = Instantiate(this) as T;
            if (copy != null)
            {
                copy.objectId = GenerateUniqueId();
                copy.displayName = $"{displayName} (Copy)";
                copy.isInitialized = false;
            }
            return copy;
        }
        
        /// <summary>
        /// Get data as JSON string
        /// </summary>
        public virtual string ToJson()
        {
            try
            {
                return JsonUtility.ToJson(this, true);
            }
            catch (Exception ex)
            {
                LogError($"Failed to serialize {DisplayName} to JSON: {ex.Message}");
                return string.Empty;
            }
        }
        
        /// <summary>
        /// Load data from JSON string
        /// </summary>
        public virtual void FromJson(string json)
        {
            try
            {
                JsonUtility.FromJsonOverwrite(json, this);
                LogDebug($"Loaded {DisplayName} from JSON");
            }
            catch (Exception ex)
            {
                LogError($"Failed to deserialize {DisplayName} from JSON: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Generate a unique identifier
        /// </summary>
        protected virtual string GenerateUniqueId()
        {
            return $"{GetType().Name}_{Guid.NewGuid().ToString("N")[..8]}";
        }
        
        /// <summary>
        /// Get hash code based on content
        /// </summary>
        public virtual int GetContentHashCode()
        {
            return HashCode.Combine(objectId, displayName, description, version);
        }
        
        #endregion
        
        #region Editor Support
        
        #if UNITY_EDITOR
        private void ValidateInEditor()
        {
            if (Application.isPlaying)
                return;
                
            var result = Validate();
            if (!result.IsValid)
            {
                Debug.LogWarning($"Validation issues in {name}: {result.GetErrorSummary()}", this);
            }
        }
        
        private void InitializeObject()
        {
            if (!isInitialized && !Application.isPlaying)
            {
                Initialize();
            }
        }
        #endif
        
        #endregion
        
        #region Logging
        
        protected void LogDebug(string message)
        {
            if (enableDebugLogging)
            {
                Debug.Log($"[{GetType().Name}] {message}", this);
            }
        }
        
        protected void LogWarning(string message)
        {
            Debug.LogWarning($"[{GetType().Name}] {message}", this);
        }
        
        protected void LogError(string message)
        {
            Debug.LogError($"[{GetType().Name}] {message}", this);
        }
        
        #endregion
        
        public override string ToString()
        {
            return $"{GetType().Name}: {DisplayName} (ID: {Id}, Version: {Version})";
        }
    }
    
    /// <summary>
    /// Generic base class for typed ScriptableObjects
    /// </summary>
    public abstract class BaseScriptableObject<T> : BaseScriptableObject where T : class
    {
        [Header("Typed Configuration")]
        [SerializeField] protected T data;
        
        /// <summary>
        /// Strongly typed data access
        /// </summary>
        public T Data 
        { 
            get => data;
            protected set => data = value;
        }
        
        /// <summary>
        /// Check if data is valid
        /// </summary>
        public bool HasValidData => data != null;
        
        protected override void ValidateCustomProperties(ValidationResult result)
        {
            base.ValidateCustomProperties(result);
            
            if (data == null)
            {
                result.AddError("Data cannot be null");
            }
            else
            {
                ValidateTypedData(result);
            }
        }
        
        /// <summary>
        /// Override this method to validate the typed data
        /// </summary>
        protected virtual void ValidateTypedData(ValidationResult result)
        {
            // Base implementation - override in derived classes
        }
        
        public override int GetContentHashCode()
        {
            return HashCode.Combine(base.GetContentHashCode(), data?.GetHashCode() ?? 0);
        }
    }
}
```

### 2. Configuration and Settings ScriptableObjects

#### 2.1 Configuration Management System

[[LLM: Design a comprehensive configuration management system using ScriptableObjects that supports hierarchical settings, environment-specific configurations, and runtime modification. Include patterns for game settings, platform-specific configurations, and user preferences that maintain data integrity while providing designer-friendly interfaces.]]

**Configuration System Architecture**:

```csharp
// Assets/Scripts/Data/Configuration/GameConfiguration.cs
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using {{project_namespace}}.Data.Core;
using {{project_namespace}}.Interfaces.Services;

namespace {{project_namespace}}.Data.Configuration
{
    /// <summary>
    /// Hierarchical configuration system supporting multiple configuration layers
    /// </summary>
    [CreateAssetMenu(menuName = "{{project_namespace}}/Configuration/Game Configuration", fileName = "GameConfiguration")]
    public class GameConfiguration : BaseScriptableObject, IConfigurationManager
    {
        [Header("Configuration Hierarchy")]
        [SerializeField] private List<ConfigurationLayer> configurationLayers = new List<ConfigurationLayer>();
        [SerializeField] private ConfigurationScope defaultScope = ConfigurationScope.Development;
        [SerializeField] private bool enableHotReload = true;
        [SerializeField] private bool enableConfigurationValidation = true;
        
        [Header("Runtime Settings")]
        [SerializeField] private bool allowRuntimeModification = true;
        [SerializeField] private bool persistRuntimeChanges = false;
        [SerializeField] private float configurationCheckInterval = 5.0f;
        
        private Dictionary<string, ConfigurationValue> runtimeOverrides = new Dictionary<string, ConfigurationValue>();
        private Dictionary<string, ConfigurationValue> cachedValues = new Dictionary<string, ConfigurationValue>();
        private ConfigurationScope currentScope = ConfigurationScope.Development;
        private DateTime lastConfigurationCheck = DateTime.MinValue;
        
        /// <summary>
        /// Current configuration scope
        /// </summary>
        public ConfigurationScope CurrentScope 
        { 
            get => currentScope;
            private set
            {
                if (currentScope != value)
                {
                    var oldScope = currentScope;
                    currentScope = value;
                    OnScopeChanged?.Invoke(oldScope, currentScope);
                    RefreshCache();
                }
            }
        }
        
        /// <summary>
        /// Whether runtime modification is allowed
        /// </summary>
        public bool AllowsRuntimeModification => allowRuntimeModification;
        
        /// <summary>
        /// Event fired when configuration value changes
        /// </summary>
        public event Action<string, object, object> OnValueChanged;
        
        /// <summary>
        /// Event fired when configuration scope changes
        /// </summary>
        public event Action<ConfigurationScope, ConfigurationScope> OnScopeChanged;
        
        /// <summary>
        /// Event fired when configuration is reloaded
        /// </summary>
        public event Action OnConfigurationReloaded;
        
        #region IConfigurationManager Implementation
        
        public T GetValue<T>(string key, T defaultValue = default)
        {
            if (string.IsNullOrEmpty(key))
            {
                LogWarning("Configuration key cannot be null or empty");
                return defaultValue;
            }
            
            // Check runtime overrides first
            if (runtimeOverrides.TryGetValue(key, out var runtimeValue))
            {
                if (TryConvertValue(runtimeValue.Value, out T convertedValue))
                {
                    return convertedValue;
                }
            }
            
            // Check cached values
            if (cachedValues.TryGetValue(key, out var cachedValue))
            {
                if (TryConvertValue(cachedValue.Value, out T convertedCachedValue))
                {
                    return convertedCachedValue;
                }
            }
            
            // Search through configuration layers
            foreach (var layer in GetOrderedLayers())
            {
                if (layer.TryGetValue(key, currentScope, out var layerValue))
                {
                    if (TryConvertValue(layerValue, out T convertedLayerValue))
                    {
                        // Cache the value for performance
                        CacheValue(key, layerValue);
                        return convertedLayerValue;
                    }
                }
            }
            
            LogDebug($"Configuration key '{key}' not found, returning default value");
            return defaultValue;
        }
        
        public void SetValue<T>(string key, T value)
        {
            if (!allowRuntimeModification)
            {
                LogWarning("Runtime modification is disabled");
                return;
            }
            
            if (string.IsNullOrEmpty(key))
            {
                LogWarning("Configuration key cannot be null or empty");
                return;
            }
            
            var oldValue = GetValue<object>(key);
            var configValue = new ConfigurationValue
            {
                Key = key,
                Value = value,
                Type = typeof(T),
                Scope = currentScope,
                Timestamp = DateTime.UtcNow
            };
            
            runtimeOverrides[key] = configValue;
            
            // Update cache
            cachedValues[key] = configValue;
            
            OnValueChanged?.Invoke(key, oldValue, value);
            LogDebug($"Set configuration value: {key} = {value}");
            
            if (persistRuntimeChanges)
            {
                PersistRuntimeChange(key, configValue);
            }
        }
        
        public bool HasKey(string key)
        {
            if (string.IsNullOrEmpty(key))
                return false;
                
            if (runtimeOverrides.ContainsKey(key))
                return true;
                
            if (cachedValues.ContainsKey(key))
                return true;
                
            return GetOrderedLayers().Any(layer => layer.HasKey(key, currentScope));
        }
        
        public void RemoveKey(string key)
        {
            if (!allowRuntimeModification)
            {
                LogWarning("Runtime modification is disabled");
                return;
            }
            
            var oldValue = GetValue<object>(key);
            
            if (runtimeOverrides.Remove(key))
            {
                cachedValues.Remove(key);
                OnValueChanged?.Invoke(key, oldValue, null);
                LogDebug($"Removed configuration key: {key}");
            }
        }
        
        public void LoadConfiguration(string filePath)
        {
            try
            {
                if (System.IO.File.Exists(filePath))
                {
                    var json = System.IO.File.ReadAllText(filePath);
                    var configData = JsonUtility.FromJson<ConfigurationData>(json);
                    
                    foreach (var kvp in configData.Values)
                    {
                        SetValue(kvp.Key, kvp.Value.Value);
                    }
                    
                    LogDebug($"Loaded configuration from: {filePath}");
                }
                else
                {
                    LogWarning($"Configuration file not found: {filePath}");
                }
            }
            catch (Exception ex)
            {
                LogError($"Failed to load configuration from {filePath}: {ex.Message}");
            }
        }
        
        public void SaveConfiguration(string filePath)
        {
            try
            {
                var configData = new ConfigurationData();
                configData.Values = new Dictionary<string, ConfigurationValue>(runtimeOverrides);
                
                var json = JsonUtility.ToJson(configData, true);
                System.IO.File.WriteAllText(filePath, json);
                
                LogDebug($"Saved configuration to: {filePath}");
            }
            catch (Exception ex)
            {
                LogError($"Failed to save configuration to {filePath}: {ex.Message}");
            }
        }
        
        public void ResetToDefaults()
        {
            runtimeOverrides.Clear();
            cachedValues.Clear();
            RefreshCache();
            OnConfigurationReloaded?.Invoke();
            LogDebug("Reset configuration to defaults");
        }
        
        public IEnumerable<string> GetAllKeys()
        {
            var keys = new HashSet<string>();
            
            // Add runtime override keys
            foreach (var key in runtimeOverrides.Keys)
            {
                keys.Add(key);
            }
            
            // Add keys from all layers
            foreach (var layer in configurationLayers)
            {
                foreach (var key in layer.GetAllKeys(currentScope))
                {
                    keys.Add(key);
                }
            }
            
            return keys;
        }
        
        #endregion
        
        #region Public API
        
        /// <summary>
        /// Set the current configuration scope
        /// </summary>
        public void SetScope(ConfigurationScope scope)
        {
            CurrentScope = scope;
        }
        
        /// <summary>
        /// Add a configuration layer
        /// </summary>
        public void AddLayer(ConfigurationLayer layer)
        {
            if (layer != null && !configurationLayers.Contains(layer))
            {
                configurationLayers.Add(layer);
                configurationLayers.Sort((a, b) => a.Priority.CompareTo(b.Priority));
                RefreshCache();
                LogDebug($"Added configuration layer: {layer.LayerName}");
            }
        }
        
        /// <summary>
        /// Remove a configuration layer
        /// </summary>
        public void RemoveLayer(ConfigurationLayer layer)
        {
            if (configurationLayers.Remove(layer))
            {
                RefreshCache();
                LogDebug($"Removed configuration layer: {layer.LayerName}");
            }
        }
        
        /// <summary>
        /// Reload configuration from all layers
        /// </summary>
        public void ReloadConfiguration()
        {
            cachedValues.Clear();
            
            foreach (var layer in configurationLayers)
            {
                layer.Reload();
            }
            
            RefreshCache();
            OnConfigurationReloaded?.Invoke();
            LogDebug("Reloaded configuration");
        }
        
        /// <summary>
        /// Get configuration statistics
        /// </summary>
        public ConfigurationStatistics GetStatistics()
        {
            return new ConfigurationStatistics
            {
                LayerCount = configurationLayers.Count,
                CachedValueCount = cachedValues.Count,
                RuntimeOverrideCount = runtimeOverrides.Count,
                CurrentScope = currentScope,
                LastCheck = lastConfigurationCheck,
                TotalKeyCount = GetAllKeys().Count()
            };
        }
        
        #endregion
        
        #region Unity Lifecycle and Initialization
        
        protected override void OnInitialize()
        {
            base.OnInitialize();
            
            // Set initial scope
            CurrentScope = defaultScope;
            
            // Initialize configuration layers
            foreach (var layer in configurationLayers)
            {
                layer.Initialize();
            }
            
            // Build initial cache
            RefreshCache();
            
            if (enableHotReload)
            {
                InvokeRepeating(nameof(CheckForConfigurationChanges), 
                    configurationCheckInterval, configurationCheckInterval);
            }
        }
        
        private void OnDestroy()
        {
            CancelInvoke();
        }
        
        #endregion
        
        #region Private Methods
        
        private IEnumerable<ConfigurationLayer> GetOrderedLayers()
        {
            return configurationLayers.OrderBy(layer => layer.Priority);
        }
        
        private bool TryConvertValue<T>(object value, out T result)
        {
            result = default;
            
            if (value == null)
                return false;
                
            if (value is T directValue)
            {
                result = directValue;
                return true;
            }
            
            try
            {
                result = (T)Convert.ChangeType(value, typeof(T));
                return true;
            }
            catch
            {
                return false;
            }
        }
        
        private void CacheValue(string key, object value)
        {
            cachedValues[key] = new ConfigurationValue
            {
                Key = key,
                Value = value,
                Type = value?.GetType(),
                Scope = currentScope,
                Timestamp = DateTime.UtcNow
            };
        }
        
        private void RefreshCache()
        {
            cachedValues.Clear();
            lastConfigurationCheck = DateTime.UtcNow;
        }
        
        private void CheckForConfigurationChanges()
        {
            if (!enableHotReload)
                return;
                
            bool hasChanges = false;
            
            foreach (var layer in configurationLayers)
            {
                if (layer.HasChanges())
                {
                    hasChanges = true;
                    layer.Reload();
                }
            }
            
            if (hasChanges)
            {
                RefreshCache();
                OnConfigurationReloaded?.Invoke();
                LogDebug("Detected configuration changes, reloaded");
            }
        }
        
        private void PersistRuntimeChange(string key, ConfigurationValue value)
        {
            // Implementation would depend on persistence strategy
            // Could save to PlayerPrefs, file system, or remote storage
            LogDebug($"Persisting runtime change: {key} = {value.Value}");
        }
        
        #endregion
        
        #region Validation
        
        protected override void ValidateCustomProperties(ValidationResult result)
        {
            base.ValidateCustomProperties(result);
            
            if (configurationLayers == null || configurationLayers.Count == 0)
            {
                result.AddWarning("No configuration layers defined");
            }
            else
            {
                // Validate layers
                foreach (var layer in configurationLayers)
                {
                    if (layer == null)
                    {
                        result.AddError("Null configuration layer found");
                        continue;
                    }
                    
                    var layerResult = layer.Validate();
                    if (!layerResult.IsValid)
                    {
                        result.AddError($"Layer '{layer.LayerName}' validation failed: {layerResult.GetErrorSummary()}");
                    }
                }
                
                // Check for duplicate priorities
                var priorities = configurationLayers.GroupBy(l => l.Priority);
                foreach (var group in priorities.Where(g => g.Count() > 1))
                {
                    result.AddWarning($"Multiple layers have priority {group.Key}: {string.Join(", ", group.Select(l => l.LayerName))}");
                }
            }
            
            if (configurationCheckInterval <= 0)
            {
                result.AddError("Configuration check interval must be greater than 0");
            }
        }
        
        #endregion
    }
    
    /// <summary>
    /// Configuration layer for hierarchical settings
    /// </summary>
    [Serializable]
    public class ConfigurationLayer : BaseScriptableObject
    {
        [Header("Layer Configuration")]
        [SerializeField] private string layerName = "";
        [SerializeField] private int priority = 0;
        [SerializeField] private ConfigurationScope supportedScopes = ConfigurationScope.All;
        [SerializeField] private bool isReadOnly = false;
        
        [Header("Configuration Values")]
        [SerializeField] private List<ConfigurationEntry> entries = new List<ConfigurationEntry>();
        
        private Dictionary<string, Dictionary<ConfigurationScope, object>> valueCache;
        private DateTime lastModificationTime = DateTime.MinValue;
        
        /// <summary>
        /// Name of this configuration layer
        /// </summary>
        public string LayerName => string.IsNullOrEmpty(layerName) ? name : layerName;
        
        /// <summary>
        /// Priority of this layer (lower = higher priority)
        /// </summary>
        public int Priority => priority;
        
        /// <summary>
        /// Whether this layer is read-only
        /// </summary>
        public bool IsReadOnly => isReadOnly;
        
        protected override void OnInitialize()
        {
            base.OnInitialize();
            BuildValueCache();
        }
        
        /// <summary>
        /// Try to get a value for the specified key and scope
        /// </summary>
        public bool TryGetValue(string key, ConfigurationScope scope, out object value)
        {
            value = null;
            
            if (valueCache == null)
            {
                BuildValueCache();
            }
            
            if (!valueCache.TryGetValue(key, out var scopeValues))
                return false;
                
            // Try exact scope match first
            if (scopeValues.TryGetValue(scope, out value))
                return true;
                
            // Try fallback to more general scopes
            var fallbackScopes = GetFallbackScopes(scope);
            foreach (var fallbackScope in fallbackScopes)
            {
                if (scopeValues.TryGetValue(fallbackScope, out value))
                    return true;
            }
            
            return false;
        }
        
        /// <summary>
        /// Check if this layer has a specific key
        /// </summary>
        public bool HasKey(string key, ConfigurationScope scope)
        {
            return TryGetValue(key, scope, out _);
        }
        
        /// <summary>
        /// Get all keys for a specific scope
        /// </summary>
        public IEnumerable<string> GetAllKeys(ConfigurationScope scope)
        {
            if (valueCache == null)
            {
                BuildValueCache();
            }
            
            return valueCache.Keys.Where(key => HasKey(key, scope));
        }
        
        /// <summary>
        /// Check if this layer has changes that need reloading
        /// </summary>
        public bool HasChanges()
        {
            // In a real implementation, this would check file modification times,
            // database timestamps, or other change detection mechanisms
            return false;
        }
        
        /// <summary>
        /// Reload this configuration layer
        /// </summary>
        public void Reload()
        {
            BuildValueCache();
            lastModificationTime = DateTime.UtcNow;
        }
        
        private void BuildValueCache()
        {
            valueCache = new Dictionary<string, Dictionary<ConfigurationScope, object>>();
            
            foreach (var entry in entries)
            {
                if (!valueCache.TryGetValue(entry.Key, out var scopeValues))
                {
                    scopeValues = new Dictionary<ConfigurationScope, object>();
                    valueCache[entry.Key] = scopeValues;
                }
                
                scopeValues[entry.Scope] = entry.Value;
            }
        }
        
        private IEnumerable<ConfigurationScope> GetFallbackScopes(ConfigurationScope scope)
        {
            switch (scope)
            {
                case ConfigurationScope.Production:
                    yield return ConfigurationScope.Staging;
                    yield return ConfigurationScope.Development;
                    yield return ConfigurationScope.Default;
                    break;
                case ConfigurationScope.Staging:
                    yield return ConfigurationScope.Development;
                    yield return ConfigurationScope.Default;
                    break;
                case ConfigurationScope.Development:
                    yield return ConfigurationScope.Default;
                    break;
                default:
                    yield break;
            }
        }
    }
    
    /// <summary>
    /// Configuration scope enumeration
    /// </summary>
    [Flags]
    public enum ConfigurationScope
    {
        Default = 1,
        Development = 2,
        Staging = 4,
        Production = 8,
        All = Default | Development | Staging | Production
    }
    
    /// <summary>
    /// Individual configuration entry
    /// </summary>
    [Serializable]
    public class ConfigurationEntry
    {
        [SerializeField] private string key = "";
        [SerializeField] private ConfigurationScope scope = ConfigurationScope.Default;
        [SerializeField] private string valueType = "";
        [SerializeField] private string serializedValue = "";
        [SerializeField] private string description = "";
        
        /// <summary>
        /// Configuration key
        /// </summary>
        public string Key => key;
        
        /// <summary>
        /// Configuration scope
        /// </summary>
        public ConfigurationScope Scope => scope;
        
        /// <summary>
        /// Configuration value
        /// </summary>
        public object Value
        {
            get
            {
                if (string.IsNullOrEmpty(serializedValue) || string.IsNullOrEmpty(valueType))
                    return null;
                    
                var type = Type.GetType(valueType);
                if (type == null)
                    return serializedValue;
                    
                try
                {
                    return JsonUtility.FromJson(serializedValue, type);
                }
                catch
                {
                    return serializedValue;
                }
            }
        }
        
        /// <summary>
        /// Configuration description
        /// </summary>
        public string Description => description;
    }
    
    /// <summary>
    /// Configuration value wrapper
    /// </summary>
    [Serializable]
    public class ConfigurationValue
    {
        public string Key;
        public object Value;
        public Type Type;
        public ConfigurationScope Scope;
        public DateTime Timestamp;
    }
    
    /// <summary>
    /// Configuration data container for serialization
    /// </summary>
    [Serializable]
    public class ConfigurationData
    {
        public Dictionary<string, ConfigurationValue> Values = new Dictionary<string, ConfigurationValue>();
    }
    
    /// <summary>
    /// Configuration statistics
    /// </summary>
    public class ConfigurationStatistics
    {
        public int LayerCount;
        public int CachedValueCount;
        public int RuntimeOverrideCount;
        public ConfigurationScope CurrentScope;
        public DateTime LastCheck;
        public int TotalKeyCount;
    }
}
```

### 3. Event-Driven ScriptableObject Architecture

#### 3.1 ScriptableObject Event System

[[LLM: Create a comprehensive event system using ScriptableObjects that enables decoupled communication between game systems. Design event channels, event data containers, and listener management that supports both design-time configuration and runtime flexibility while maintaining performance and memory efficiency.]]

**Event System Architecture**:

```csharp
// Assets/Scripts/Data/Events/GameEventSystem.cs
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using {{project_namespace}}.Data.Core;
using {{project_namespace}}.Interfaces.Services;

namespace {{project_namespace}}.Data.Events
{
    /// <summary>
    /// ScriptableObject-based event channel for decoupled communication
    /// </summary>
    [CreateAssetMenu(menuName = "{{project_namespace}}/Events/Game Event Channel", fileName = "GameEventChannel")]
    public class GameEventChannel : BaseScriptableObject
    {
        [Header("Event Configuration")]
        [SerializeField] private EventChannelType channelType = EventChannelType.Normal;
        [SerializeField] private bool enableLogging = false;
        [SerializeField] private bool enablePersistence = false;
        [SerializeField] private int maxHistorySize = 100;
        
        [Header("Performance Settings")]
        [SerializeField] private bool enableAsyncDelivery = false;
        [SerializeField] private int maxListenersPerFrame = 50;
        [SerializeField] private float deliveryTimeoutSeconds = 5.0f;
        
        private readonly List<IGameEventListener> listeners = new List<IGameEventListener>();
        private readonly Queue<GameEventData> eventHistory = new Queue<GameEventData>();
        private readonly Dictionary<Type, List<IGameEventListener>> typedListeners = new Dictionary<Type, List<IGameEventListener>>();
        
        private bool isDelivering = false;
        private int eventsRaisedThisFrame = 0;
        private DateTime lastEventTime = DateTime.MinValue;
        
        /// <summary>
        /// Number of registered listeners
        /// </summary>
        public int ListenerCount => listeners.Count;
        
        /// <summary>
        /// Number of events in history
        /// </summary>
        public int HistoryCount => eventHistory.Count;
        
        /// <summary>
        /// Whether this channel is currently delivering events
        /// </summary>
        public bool IsDelivering => isDelivering;
        
        /// <summary>
        /// Last time an event was raised on this channel
        /// </summary>
        public DateTime LastEventTime => lastEventTime;
        
        /// <summary>
        /// Event fired when a listener is added
        /// </summary>
        public event Action<IGameEventListener> OnListenerAdded;
        
        /// <summary>
        /// Event fired when a listener is removed
        /// </summary>
        public event Action<IGameEventListener> OnListenerRemoved;
        
        /// <summary>
        /// Event fired when an event is raised
        /// </summary>
        public event Action<GameEventData> OnEventRaised;
        
        #region Event Management
        
        /// <summary>
        /// Add an event listener
        /// </summary>
        public void AddListener(IGameEventListener listener)
        {
            if (listener == null)
            {
                LogWarning("Cannot add null listener");
                return;
            }
            
            if (listeners.Contains(listener))
            {
                LogWarning($"Listener {listener} is already registered");
                return;
            }
            
            listeners.Add(listener);
            
            // Add to typed listener dictionary for faster lookup
            var listenerType = listener.GetType();
            if (!typedListeners.TryGetValue(listenerType, out var typeList))
            {
                typeList = new List<IGameEventListener>();
                typedListeners[listenerType] = typeList;
            }
            typeList.Add(listener);
            
            OnListenerAdded?.Invoke(listener);
            LogDebug($"Added listener: {listener}");
        }
        
        /// <summary>
        /// Remove an event listener
        /// </summary>
        public void RemoveListener(IGameEventListener listener)
        {
            if (listener == null)
                return;
                
            if (listeners.Remove(listener))
            {
                // Remove from typed listener dictionary
                var listenerType = listener.GetType();
                if (typedListeners.TryGetValue(listenerType, out var typeList))
                {
                    typeList.Remove(listener);
                    if (typeList.Count == 0)
                    {
                        typedListeners.Remove(listenerType);
                    }
                }
                
                OnListenerRemoved?.Invoke(listener);
                LogDebug($"Removed listener: {listener}");
            }
        }
        
        /// <summary>
        /// Remove all listeners
        /// </summary>
        public void ClearListeners()
        {
            var listenersCopy = new List<IGameEventListener>(listeners);
            listeners.Clear();
            typedListeners.Clear();
            
            foreach (var listener in listenersCopy)
            {
                OnListenerRemoved?.Invoke(listener);
            }
            
            LogDebug("Cleared all listeners");
        }
        
        /// <summary>
        /// Raise an event on this channel
        /// </summary>
        public void RaiseEvent(GameEventData eventData)
        {
            if (eventData == null)
            {
                LogWarning("Cannot raise null event");
                return;
            }
            
            lastEventTime = DateTime.UtcNow;
            eventData.Timestamp = lastEventTime;
            eventData.ChannelId = Id;
            
            // Add to history
            AddToHistory(eventData);
            
            // Deliver event
            if (enableAsyncDelivery)
            {
                DeliverEventAsync(eventData);
            }
            else
            {
                DeliverEvent(eventData);
            }
            
            OnEventRaised?.Invoke(eventData);
            LogDebug($"Raised event: {eventData.EventType}");
        }
        
        /// <summary>
        /// Raise a typed event
        /// </summary>
        public void RaiseEvent<T>(T eventData) where T : GameEventData
        {
            RaiseEvent(eventData as GameEventData);
        }
        
        /// <summary>
        /// Get event listeners of a specific type
        /// </summary>
        public IEnumerable<T> GetListeners<T>() where T : class, IGameEventListener
        {
            if (typedListeners.TryGetValue(typeof(T), out var typeList))
            {
                return typeList.OfType<T>();
            }
            return Enumerable.Empty<T>();
        }
        
        /// <summary>
        /// Check if a specific listener is registered
        /// </summary>
        public bool HasListener(IGameEventListener listener)
        {
            return listeners.Contains(listener);
        }
        
        /// <summary>
        /// Get recent event history
        /// </summary>
        public IEnumerable<GameEventData> GetEventHistory(int count = -1)
        {
            if (count < 0)
                return eventHistory.ToArray();
                
            return eventHistory.ToArray().TakeLast(count);
        }
        
        /// <summary>
        /// Clear event history
        /// </summary>
        public void ClearHistory()
        {
            eventHistory.Clear();
            LogDebug("Cleared event history");
        }
        
        #endregion
        
        #region Event Delivery
        
        private void DeliverEvent(GameEventData eventData)
        {
            if (isDelivering)
            {
                LogWarning("Recursive event delivery detected");
                return;
            }
            
            isDelivering = true;
            eventsRaisedThisFrame++;
            
            try
            {
                var listenersToNotify = new List<IGameEventListener>(listeners);
                
                foreach (var listener in listenersToNotify)
                {
                    try
                    {
                        if (listener != null && listener.CanReceiveEvent(eventData))
                        {
                            listener.OnEventReceived(eventData);
                        }
                    }
                    catch (Exception ex)
                    {
                        LogError($"Exception in event listener {listener}: {ex.Message}");
                    }
                }
            }
            finally
            {
                isDelivering = false;
            }
        }
        
        private void DeliverEventAsync(GameEventData eventData)
        {
            // In a real implementation, this would use Unity's coroutine system
            // or a custom async delivery mechanism
            DeliverEvent(eventData);
        }
        
        private void AddToHistory(GameEventData eventData)
        {
            if (!enablePersistence)
                return;
                
            eventHistory.Enqueue(eventData);
            
            while (eventHistory.Count > maxHistorySize)
            {
                eventHistory.Dequeue();
            }
        }
        
        #endregion
        
        #region Unity Lifecycle
        
        private void Update()
        {
            eventsRaisedThisFrame = 0;
        }
        
        #endregion
        
        #region Validation
        
        protected override void ValidateCustomProperties(ValidationResult result)
        {
            base.ValidateCustomProperties(result);
            
            if (maxHistorySize < 0)
            {
                result.AddError("Max history size cannot be negative");
            }
            
            if (maxListenersPerFrame <= 0)
            {
                result.AddWarning("Max listeners per frame should be greater than 0");
            }
            
            if (deliveryTimeoutSeconds <= 0)
            {
                result.AddError("Delivery timeout must be greater than 0");
            }
        }
        
        #endregion
        
        #region Debugging and Statistics
        
        /// <summary>
        /// Get channel statistics
        /// </summary>
        public EventChannelStatistics GetStatistics()
        {
            return new EventChannelStatistics
            {
                ChannelId = Id,
                ChannelName = DisplayName,
                ListenerCount = listeners.Count,
                HistoryCount = eventHistory.Count,
                EventsThisFrame = eventsRaisedThisFrame,
                LastEventTime = lastEventTime,
                IsDelivering = isDelivering,
                ChannelType = channelType
            };
        }
        
        #endregion
    }
    
    /// <summary>
    /// Event channel type enumeration
    /// </summary>
    public enum EventChannelType
    {
        Normal,
        Critical,
        Debug,
        UI,
        Audio,
        Gameplay
    }
    
    /// <summary>
    /// Base class for game event data
    /// </summary>
    [Serializable]
    public abstract class GameEventData
    {
        [SerializeField] protected string eventType = "";
        [SerializeField] protected string sourceId = "";
        [SerializeField] protected EventPriority priority = EventPriority.Normal;
        [SerializeField] protected bool canCancel = false;
        
        private DateTime timestamp = DateTime.UtcNow;
        private string channelId = "";
        private bool isCancelled = false;
        
        /// <summary>
        /// Type identifier for this event
        /// </summary>
        public string EventType 
        { 
            get => string.IsNullOrEmpty(eventType) ? GetType().Name : eventType;
            protected set => eventType = value;
        }
        
        /// <summary>
        /// ID of the source that raised this event
        /// </summary>
        public string SourceId 
        { 
            get => sourceId;
            set => sourceId = value;
        }
        
        /// <summary>
        /// Priority of this event
        /// </summary>
        public EventPriority Priority 
        { 
            get => priority;
            set => priority = value;
        }
        
        /// <summary>
        /// Whether this event can be cancelled
        /// </summary>
        public bool CanCancel => canCancel;
        
        /// <summary>
        /// Whether this event has been cancelled
        /// </summary>
        public bool IsCancelled 
        { 
            get => isCancelled;
            set => isCancelled = value && canCancel;
        }
        
        /// <summary>
        /// Timestamp when this event was created
        /// </summary>
        public DateTime Timestamp 
        { 
            get => timestamp;
            internal set => timestamp = value;
        }
        
        /// <summary>
        /// ID of the channel this event was raised on
        /// </summary>
        public string ChannelId 
        { 
            get => channelId;
            internal set => channelId = value;
        }
        
        /// <summary>
        /// Cancel this event if cancellation is allowed
        /// </summary>
        public void Cancel()
        {
            if (canCancel)
            {
                isCancelled = true;
            }
        }
        
        public override string ToString()
        {
            return $"{EventType} [Priority: {Priority}, Source: {SourceId}, Cancelled: {IsCancelled}]";
        }
    }
    
    /// <summary>
    /// Event priority enumeration
    /// </summary>
    public enum EventPriority
    {
        Low = 0,
        Normal = 1,
        High = 2,
        Critical = 3
    }
    
    /// <summary>
    /// Interface for event listeners
    /// </summary>
    public interface IGameEventListener
    {
        /// <summary>
        /// Priority of this listener (higher values processed first)
        /// </summary>
        int ListenerPriority { get; }
        
        /// <summary>
        /// Whether this listener is currently active
        /// </summary>
        bool IsActive { get; }
        
        /// <summary>
        /// Check if this listener can receive a specific event
        /// </summary>
        bool CanReceiveEvent(GameEventData eventData);
        
        /// <summary>
        /// Called when an event is received
        /// </summary>
        void OnEventReceived(GameEventData eventData);
    }
    
    /// <summary>
    /// Event channel statistics
    /// </summary>
    public class EventChannelStatistics
    {
        public string ChannelId;
        public string ChannelName;
        public int ListenerCount;
        public int HistoryCount;
        public int EventsThisFrame;
        public DateTime LastEventTime;
        public bool IsDelivering;
        public EventChannelType ChannelType;
    }
}
```

## Success Criteria

This Unity ScriptableObject Setup and Data Architecture Task provides:

- **Comprehensive ScriptableObject Foundation**: Enhanced base classes with validation, versioning, and lifecycle management
- **Configuration Management System**: Hierarchical configuration with multiple layers, scopes, and runtime modification support
- **Event-Driven Architecture**: ScriptableObject-based event channels for decoupled communication between systems
- **Type Safety and Validation**: Strong typing with comprehensive validation frameworks and error handling
- **Designer-Friendly Workflows**: Inspector-optimized interfaces with clear organization and helpful debugging tools
- **Performance Optimization**: Efficient caching, lazy loading, and memory management strategies
- **Runtime Flexibility**: Support for runtime modification, hot-reloading, and dynamic configuration changes
- **Unity Integration**: Deep integration with Unity's serialization, asset pipeline, and editor workflows
- **Extensibility Patterns**: Modular architecture supporting easy extension and customization
- **Production-Ready Features**: Comprehensive logging, statistics, error handling, and debugging capabilities

## Integration Points

This task integrates with:
- `interface-design.md` - Implements interface contracts with ScriptableObject-based data systems
- `component-architecture.md` - Provides data architecture foundation for component systems
- `monobehaviour-creation.md` - Supplies configuration and event data for MonoBehaviour components
- `unity-editor-integration.md` - Enables custom editors and inspector tools for ScriptableObjects
- `validate-unity-features.md` - Provides validation frameworks for data integrity checking

## Notes

This ScriptableObject system establishes a robust data architecture foundation that supports complex Unity projects with clean separation of concerns, flexible configuration management, and scalable event communication patterns. The system is designed to grow with project needs while maintaining performance and usability throughout development and runtime.

The architecture supports both small indie projects and large-scale commercial development by providing configurable complexity levels and optional advanced features that can be adopted as needed.