# Unity Animator Setup Task

## Purpose

To establish comprehensive Unity Animator Controller configuration and state machine management for character animation, UI transitions, and gameplay mechanics. This task focuses on creating robust animation systems using Unity's Animator component, state machines, blend trees, and animation events. Provides foundation for visual development workflows and sophisticated animation control systems.

## Prerequisites

- Unity project with animation system packages installed (Animation Rigging, 2D Animation if needed)
- Character models or 2D sprites with proper rigging and animation clips prepared
- Understanding of Unity's Animator Controller architecture and state machine concepts
- Animation clips imported and configured with proper import settings
- Development team familiar with animation principles and Unity's animation workflow
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps for Unity Animator setup]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Animator Controller Architecture Foundation

#### 1.1 Animator Controller Creation and Structure

[[LLM: Analyze the project's character and animation requirements to design a comprehensive Animator Controller architecture. Create modular state machines with proper parameter management, layer organization, and transition logic that supports complex animation behaviors while maintaining performance and maintainability.]]

**Animator Controller Foundation System**:

```csharp
// Assets/Scripts/Animation/AnimatorControllerManager.cs
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace {{project_namespace}}.Animation
{
    /// <summary>
    /// Comprehensive manager for Animator Controller setup and runtime management
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public class AnimatorControllerManager : MonoBehaviour
    {
        [Header("Animator Configuration")]
        [SerializeField] private RuntimeAnimatorController animatorController;
        [SerializeField] private bool enableDebugMode = false;
        [SerializeField] private bool enableParameterValidation = true;
        [SerializeField] private bool enableStateChangeLogging = false;
        [SerializeField] private float crossFadeDuration = 0.15f;

        [Header("Parameter Management")]
        [SerializeField] private List<AnimatorParameterInfo> managedParameters = new List<AnimatorParameterInfo>();
        [SerializeField] private bool autoDiscoverParameters = true;
        [SerializeField] private bool validateParametersOnStart = true;

        [Header("State Machine Configuration")]
        [SerializeField] private List<StateMachineLayer> stateMachineLayers = new List<StateMachineLayer>();
        [SerializeField] private bool enableLayerBlending = true;
        [SerializeField] private bool optimizeInactiveStates = true;

        private Animator animator;
        private Dictionary<string, int> parameterHashes = new Dictionary<string, int>();
        private Dictionary<string, AnimatorParameterInfo> parameterInfoCache = new Dictionary<string, AnimatorParameterInfo>();
        private Dictionary<int, StateInfo> currentStates = new Dictionary<int, StateInfo>();
        
        private AnimatorParameterValidator parameterValidator;
        private AnimatorStateMonitor stateMonitor;
        private AnimatorEventHandler eventHandler;

        public event Action<string, AnimatorStateInfo> OnStateEntered;
        public event Action<string, AnimatorStateInfo> OnStateExited;
        public event Action<string, object> OnParameterChanged;
        public event Action<string> OnAnimationEvent;

        #region Properties

        public Animator Animator => animator;
        public bool IsInitialized { get; private set; }
        public int LayerCount => animator?.layerCount ?? 0;
        public RuntimeAnimatorController Controller => animatorController;

        #endregion

        #region Unity Lifecycle

        private void Awake()
        {
            try
            {
                InitializeAnimator();
                InitializeComponents();
                
                if (autoDiscoverParameters)
                {
                    DiscoverAnimatorParameters();
                }
                
                SetupParameterHashes();
                ValidateConfiguration();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Awake failed: {ex.Message}");
            }
        }

        private void Start()
        {
            try
            {
                if (validateParametersOnStart)
                {
                    ValidateAllParameters();
                }
                
                InitializeStateMachines();
                SetupEventListeners();
                
                IsInitialized = true;
                
                if (enableDebugMode)
                {
                    LogAnimatorInfo();
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Start failed: {ex.Message}");
            }
        }

        private void Update()
        {
            if (!IsInitialized) return;
            
            try
            {
                MonitorStateChanges();
                
                if (enableDebugMode)
                {
                    UpdateDebugInfo();
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Update error: {ex.Message}");
            }
        }

        private void OnDestroy()
        {
            CleanupEventListeners();
        }

        #endregion

        #region Initialization

        private void InitializeAnimator()
        {
            animator = GetComponent<Animator>();
            if (animator == null)
            {
                throw new InvalidOperationException("Animator component not found");
            }

            if (animatorController != null)
            {
                animator.runtimeAnimatorController = animatorController;
            }
            else if (animator.runtimeAnimatorController != null)
            {
                animatorController = animator.runtimeAnimatorController;
            }
            else
            {
                throw new InvalidOperationException("No Animator Controller assigned");
            }

            // Configure animator settings
            animator.fireEvents = true;
            animator.keepAnimatorControllerStateOnDisable = true;
        }

        private void InitializeComponents()
        {
            parameterValidator = new AnimatorParameterValidator(this);
            stateMonitor = new AnimatorStateMonitor(this);
            eventHandler = new AnimatorEventHandler(this);
        }

        private void DiscoverAnimatorParameters()
        {
            if (animatorController == null) return;

            managedParameters.Clear();
            
            for (int i = 0; i < animatorController.parameters.Length; i++)
            {
                var parameter = animatorController.parameters[i];
                var parameterInfo = new AnimatorParameterInfo
                {
                    ParameterName = parameter.name,
                    ParameterType = parameter.type,
                    DefaultValue = GetParameterDefaultValue(parameter),
                    IsManaged = true,
                    ValidateRange = parameter.type == AnimatorControllerParameterType.Float || parameter.type == AnimatorControllerParameterType.Int
                };

                managedParameters.Add(parameterInfo);
            }

            Debug.Log($"[AnimatorControllerManager] Discovered {managedParameters.Count} animator parameters");
        }

        private void SetupParameterHashes()
        {
            parameterHashes.Clear();
            parameterInfoCache.Clear();

            foreach (var paramInfo in managedParameters)
            {
                var hash = Animator.StringToHash(paramInfo.ParameterName);
                parameterHashes[paramInfo.ParameterName] = hash;
                parameterInfoCache[paramInfo.ParameterName] = paramInfo;
            }
        }

        private void ValidateConfiguration()
        {
            if (animator == null)
            {
                throw new InvalidOperationException("Animator component is null");
            }

            if (animatorController == null)
            {
                throw new InvalidOperationException("Animator Controller is null");
            }

            // Validate parameter existence
            foreach (var paramInfo in managedParameters)
            {
                if (!HasParameter(paramInfo.ParameterName))
                {
                    Debug.LogWarning($"[AnimatorControllerManager] Parameter '{paramInfo.ParameterName}' not found in Animator Controller");
                }
            }
        }

        #endregion

        #region Parameter Management

        public bool HasParameter(string parameterName)
        {
            return parameterHashes.ContainsKey(parameterName);
        }

        public AnimatorControllerParameterType GetParameterType(string parameterName)
        {
            if (parameterInfoCache.TryGetValue(parameterName, out var info))
            {
                return info.ParameterType;
            }
            throw new ArgumentException($"Parameter '{parameterName}' not found");
        }

        public void SetBool(string parameterName, bool value)
        {
            try
            {
                if (ValidateParameter(parameterName, AnimatorControllerParameterType.Bool))
                {
                    var hash = parameterHashes[parameterName];
                    animator.SetBool(hash, value);
                    
                    OnParameterChanged?.Invoke(parameterName, value);
                    
                    if (enableStateChangeLogging)
                    {
                        Debug.Log($"[AnimatorControllerManager] Set bool parameter '{parameterName}' to {value}");
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Error setting bool parameter '{parameterName}': {ex.Message}");
            }
        }

        public void SetInt(string parameterName, int value)
        {
            try
            {
                if (ValidateParameter(parameterName, AnimatorControllerParameterType.Int))
                {
                    var hash = parameterHashes[parameterName];
                    var paramInfo = parameterInfoCache[parameterName];
                    
                    if (paramInfo.ValidateRange)
                    {
                        value = Mathf.Clamp(value, (int)paramInfo.MinValue, (int)paramInfo.MaxValue);
                    }
                    
                    animator.SetInteger(hash, value);
                    OnParameterChanged?.Invoke(parameterName, value);
                    
                    if (enableStateChangeLogging)
                    {
                        Debug.Log($"[AnimatorControllerManager] Set int parameter '{parameterName}' to {value}");
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Error setting int parameter '{parameterName}': {ex.Message}");
            }
        }

        public void SetFloat(string parameterName, float value)
        {
            try
            {
                if (ValidateParameter(parameterName, AnimatorControllerParameterType.Float))
                {
                    var hash = parameterHashes[parameterName];
                    var paramInfo = parameterInfoCache[parameterName];
                    
                    if (paramInfo.ValidateRange)
                    {
                        value = Mathf.Clamp(value, paramInfo.MinValue, paramInfo.MaxValue);
                    }
                    
                    animator.SetFloat(hash, value);
                    OnParameterChanged?.Invoke(parameterName, value);
                    
                    if (enableStateChangeLogging)
                    {
                        Debug.Log($"[AnimatorControllerManager] Set float parameter '{parameterName}' to {value:F2}");
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Error setting float parameter '{parameterName}': {ex.Message}");
            }
        }

        public void SetTrigger(string parameterName)
        {
            try
            {
                if (ValidateParameter(parameterName, AnimatorControllerParameterType.Trigger))
                {
                    var hash = parameterHashes[parameterName];
                    animator.SetTrigger(hash);
                    
                    OnParameterChanged?.Invoke(parameterName, true);
                    
                    if (enableStateChangeLogging)
                    {
                        Debug.Log($"[AnimatorControllerManager] Triggered parameter '{parameterName}'");
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Error setting trigger parameter '{parameterName}': {ex.Message}");
            }
        }

        public void ResetTrigger(string parameterName)
        {
            try
            {
                if (ValidateParameter(parameterName, AnimatorControllerParameterType.Trigger))
                {
                    var hash = parameterHashes[parameterName];
                    animator.ResetTrigger(hash);
                    
                    if (enableStateChangeLogging)
                    {
                        Debug.Log($"[AnimatorControllerManager] Reset trigger parameter '{parameterName}'");
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Error resetting trigger parameter '{parameterName}': {ex.Message}");
            }
        }

        public bool GetBool(string parameterName)
        {
            if (ValidateParameter(parameterName, AnimatorControllerParameterType.Bool))
            {
                var hash = parameterHashes[parameterName];
                return animator.GetBool(hash);
            }
            return false;
        }

        public int GetInt(string parameterName)
        {
            if (ValidateParameter(parameterName, AnimatorControllerParameterType.Int))
            {
                var hash = parameterHashes[parameterName];
                return animator.GetInteger(hash);
            }
            return 0;
        }

        public float GetFloat(string parameterName)
        {
            if (ValidateParameter(parameterName, AnimatorControllerParameterType.Float))
            {
                var hash = parameterHashes[parameterName];
                return animator.GetFloat(hash);
            }
            return 0f;
        }

        private bool ValidateParameter(string parameterName, AnimatorControllerParameterType expectedType)
        {
            if (!enableParameterValidation) return true;
            
            return parameterValidator.ValidateParameter(parameterName, expectedType);
        }

        private void ValidateAllParameters()
        {
            foreach (var paramInfo in managedParameters)
            {
                parameterValidator.ValidateParameterInfo(paramInfo);
            }
        }

        private object GetParameterDefaultValue(AnimatorControllerParameter parameter)
        {
            switch (parameter.type)
            {
                case AnimatorControllerParameterType.Bool:
                    return parameter.defaultBool;
                case AnimatorControllerParameterType.Int:
                    return parameter.defaultInt;
                case AnimatorControllerParameterType.Float:
                    return parameter.defaultFloat;
                case AnimatorControllerParameterType.Trigger:
                    return false;
                default:
                    return null;
            }
        }

        #endregion

        #region State Machine Management

        private void InitializeStateMachines()
        {
            currentStates.Clear();
            
            for (int layerIndex = 0; layerIndex < animator.layerCount; layerIndex++)
            {
                var stateInfo = animator.GetCurrentAnimatorStateInfo(layerIndex);
                currentStates[layerIndex] = new StateInfo
                {
                    StateHash = stateInfo.shortNameHash,
                    StateName = GetStateName(stateInfo.shortNameHash, layerIndex),
                    LayerIndex = layerIndex,
                    NormalizedTime = stateInfo.normalizedTime
                };
            }
        }

        private void MonitorStateChanges()
        {
            for (int layerIndex = 0; layerIndex < animator.layerCount; layerIndex++)
            {
                var currentStateInfo = animator.GetCurrentAnimatorStateInfo(layerIndex);
                var previousState = currentStates.ContainsKey(layerIndex) ? currentStates[layerIndex] : null;
                
                if (previousState == null || previousState.StateHash != currentStateInfo.shortNameHash)
                {
                    // State changed
                    var newStateName = GetStateName(currentStateInfo.shortNameHash, layerIndex);
                    
                    if (previousState != null)
                    {
                        OnStateExited?.Invoke(previousState.StateName, currentStateInfo);
                        
                        if (enableStateChangeLogging)
                        {
                            Debug.Log($"[AnimatorControllerManager] Exited state '{previousState.StateName}' on layer {layerIndex}");
                        }
                    }
                    
                    OnStateEntered?.Invoke(newStateName, currentStateInfo);
                    
                    if (enableStateChangeLogging)
                    {
                        Debug.Log($"[AnimatorControllerManager] Entered state '{newStateName}' on layer {layerIndex}");
                    }
                    
                    currentStates[layerIndex] = new StateInfo
                    {
                        StateHash = currentStateInfo.shortNameHash,
                        StateName = newStateName,
                        LayerIndex = layerIndex,
                        NormalizedTime = currentStateInfo.normalizedTime
                    };
                }
                else if (previousState != null)
                {
                    // Update normalized time
                    previousState.NormalizedTime = currentStateInfo.normalizedTime;
                }
            }
        }

        public void PlayState(string stateName, int layerIndex = 0, float normalizedTime = 0f)
        {
            try
            {
                if (layerIndex >= 0 && layerIndex < animator.layerCount)
                {
                    animator.Play(stateName, layerIndex, normalizedTime);
                    
                    if (enableStateChangeLogging)
                    {
                        Debug.Log($"[AnimatorControllerManager] Playing state '{stateName}' on layer {layerIndex}");
                    }
                }
                else
                {
                    Debug.LogWarning($"[AnimatorControllerManager] Invalid layer index: {layerIndex}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Error playing state '{stateName}': {ex.Message}");
            }
        }

        public void CrossFadeToState(string stateName, int layerIndex = 0, float fadeDuration = -1f, float normalizedTime = 0f)
        {
            try
            {
                if (layerIndex >= 0 && layerIndex < animator.layerCount)
                {
                    if (fadeDuration < 0f)
                        fadeDuration = crossFadeDuration;
                    
                    animator.CrossFade(stateName, fadeDuration, layerIndex, normalizedTime);
                    
                    if (enableStateChangeLogging)
                    {
                        Debug.Log($"[AnimatorControllerManager] Cross-fading to state '{stateName}' on layer {layerIndex} with duration {fadeDuration:F2}s");
                    }
                }
                else
                {
                    Debug.LogWarning($"[AnimatorControllerManager] Invalid layer index: {layerIndex}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Error cross-fading to state '{stateName}': {ex.Message}");
            }
        }

        public bool IsInState(string stateName, int layerIndex = 0)
        {
            if (layerIndex >= 0 && layerIndex < animator.layerCount)
            {
                var stateInfo = animator.GetCurrentAnimatorStateInfo(layerIndex);
                var stateHash = Animator.StringToHash(stateName);
                return stateInfo.shortNameHash == stateHash;
            }
            return false;
        }

        public string GetCurrentStateName(int layerIndex = 0)
        {
            if (currentStates.ContainsKey(layerIndex))
            {
                return currentStates[layerIndex].StateName;
            }
            return "Unknown";
        }

        public float GetCurrentStateNormalizedTime(int layerIndex = 0)
        {
            if (layerIndex >= 0 && layerIndex < animator.layerCount)
            {
                var stateInfo = animator.GetCurrentAnimatorStateInfo(layerIndex);
                return stateInfo.normalizedTime;
            }
            return 0f;
        }

        public bool IsStateComplete(int layerIndex = 0)
        {
            return GetCurrentStateNormalizedTime(layerIndex) >= 1f;
        }

        private string GetStateName(int stateHash, int layerIndex)
        {
            // This would typically use a lookup table or reflection to get the actual state name
            // For now, return the hash as string
            return $"State_{stateHash}";
        }

        #endregion

        #region Animation Events

        public void OnAnimationEventReceived(string eventName)
        {
            try
            {
                eventHandler.HandleAnimationEvent(eventName);
                OnAnimationEvent?.Invoke(eventName);
                
                if (enableStateChangeLogging)
                {
                    Debug.Log($"[AnimatorControllerManager] Animation event received: {eventName}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Error handling animation event '{eventName}': {ex.Message}");
            }
        }

        #endregion

        #region Layer Management

        public void SetLayerWeight(int layerIndex, float weight)
        {
            try
            {
                if (layerIndex > 0 && layerIndex < animator.layerCount)
                {
                    weight = Mathf.Clamp01(weight);
                    animator.SetLayerWeight(layerIndex, weight);
                    
                    if (enableStateChangeLogging)
                    {
                        Debug.Log($"[AnimatorControllerManager] Set layer {layerIndex} weight to {weight:F2}");
                    }
                }
                else if (layerIndex == 0)
                {
                    Debug.LogWarning("[AnimatorControllerManager] Cannot set weight for base layer (layer 0)");
                }
                else
                {
                    Debug.LogWarning($"[AnimatorControllerManager] Invalid layer index: {layerIndex}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[AnimatorControllerManager] Error setting layer weight: {ex.Message}");
            }
        }

        public float GetLayerWeight(int layerIndex)
        {
            if (layerIndex >= 0 && layerIndex < animator.layerCount)
            {
                return animator.GetLayerWeight(layerIndex);
            }
            return 0f;
        }

        public string GetLayerName(int layerIndex)
        {
            if (layerIndex >= 0 && layerIndex < animator.layerCount)
            {
                return animator.GetLayerName(layerIndex);
            }
            return "Invalid Layer";
        }

        #endregion

        #region Debug and Monitoring

        private void LogAnimatorInfo()
        {
            Debug.Log($"[AnimatorControllerManager] Animator Controller: {animatorController.name}");
            Debug.Log($"[AnimatorControllerManager] Layer Count: {animator.layerCount}");
            Debug.Log($"[AnimatorControllerManager] Parameter Count: {managedParameters.Count}");
            Debug.Log($"[AnimatorControllerManager] Managed Parameters: {string.Join(", ", managedParameters.Select(p => p.ParameterName))}");
        }

        private void UpdateDebugInfo()
        {
            // Update debug information periodically
            if (Time.frameCount % 60 == 0) // Every 60 frames
            {
                foreach (var layer in currentStates)
                {
                    var layerIndex = layer.Key;
                    var stateInfo = layer.Value;
                    Debug.Log($"[AnimatorControllerManager] Layer {layerIndex}: {stateInfo.StateName} ({stateInfo.NormalizedTime:F2})");
                }
            }
        }

        private void SetupEventListeners()
        {
            // Setup any additional event listeners
        }

        private void CleanupEventListeners()
        {
            // Cleanup event listeners
        }

        #endregion

        #region Public API

        public void ResetAllTriggers()
        {
            foreach (var paramInfo in managedParameters)
            {
                if (paramInfo.ParameterType == AnimatorControllerParameterType.Trigger)
                {
                    ResetTrigger(paramInfo.ParameterName);
                }
            }
        }

        public void SetParametersByName(Dictionary<string, object> parameterValues)
        {
            foreach (var kvp in parameterValues)
            {
                var paramName = kvp.Key;
                var value = kvp.Value;
                
                if (!HasParameter(paramName)) continue;
                
                var paramType = GetParameterType(paramName);
                
                switch (paramType)
                {
                    case AnimatorControllerParameterType.Bool:
                        if (value is bool boolValue)
                            SetBool(paramName, boolValue);
                        break;
                    case AnimatorControllerParameterType.Int:
                        if (value is int intValue)
                            SetInt(paramName, intValue);
                        break;
                    case AnimatorControllerParameterType.Float:
                        if (value is float floatValue)
                            SetFloat(paramName, floatValue);
                        break;
                    case AnimatorControllerParameterType.Trigger:
                        if (value is bool triggerValue && triggerValue)
                            SetTrigger(paramName);
                        break;
                }
            }
        }

        public Dictionary<string, object> GetAllParameterValues()
        {
            var values = new Dictionary<string, object>();
            
            foreach (var paramInfo in managedParameters)
            {
                var paramName = paramInfo.ParameterName;
                
                switch (paramInfo.ParameterType)
                {
                    case AnimatorControllerParameterType.Bool:
                        values[paramName] = GetBool(paramName);
                        break;
                    case AnimatorControllerParameterType.Int:
                        values[paramName] = GetInt(paramName);
                        break;
                    case AnimatorControllerParameterType.Float:
                        values[paramName] = GetFloat(paramName);
                        break;
                    case AnimatorControllerParameterType.Trigger:
                        values[paramName] = false; // Triggers are momentary
                        break;
                }
            }
            
            return values;
        }

        #endregion
    }

    #region Supporting Classes

    [Serializable]
    public class AnimatorParameterInfo
    {
        public string ParameterName;
        public AnimatorControllerParameterType ParameterType;
        public object DefaultValue;
        public bool IsManaged = true;
        public bool ValidateRange = false;
        public float MinValue = 0f;
        public float MaxValue = 1f;
        public string Description;
    }

    [Serializable]
    public class StateMachineLayer
    {
        public string LayerName;
        public int LayerIndex;
        public bool IsAdditive = false;
        public float DefaultWeight = 1f;
        public List<string> StateNames = new List<string>();
    }

    public class StateInfo
    {
        public int StateHash;
        public string StateName;
        public int LayerIndex;
        public float NormalizedTime;
    }

    public class AnimatorParameterValidator
    {
        private AnimatorControllerManager manager;
        
        public AnimatorParameterValidator(AnimatorControllerManager manager)
        {
            this.manager = manager;
        }
        
        public bool ValidateParameter(string parameterName, AnimatorControllerParameterType expectedType)
        {
            if (!manager.HasParameter(parameterName))
            {
                Debug.LogWarning($"[AnimatorParameterValidator] Parameter '{parameterName}' not found");
                return false;
            }
            
            var actualType = manager.GetParameterType(parameterName);
            if (actualType != expectedType)
            {
                Debug.LogWarning($"[AnimatorParameterValidator] Parameter '{parameterName}' type mismatch. Expected: {expectedType}, Actual: {actualType}");
                return false;
            }
            
            return true;
        }
        
        public void ValidateParameterInfo(AnimatorParameterInfo paramInfo)
        {
            // Additional validation logic for parameter info
            if (paramInfo.ValidateRange && paramInfo.MinValue > paramInfo.MaxValue)
            {
                Debug.LogWarning($"[AnimatorParameterValidator] Parameter '{paramInfo.ParameterName}' has invalid range: min ({paramInfo.MinValue}) > max ({paramInfo.MaxValue})");
            }
        }
    }

    public class AnimatorStateMonitor
    {
        private AnimatorControllerManager manager;
        
        public AnimatorStateMonitor(AnimatorControllerManager manager)
        {
            this.manager = manager;
        }
        
        // Additional state monitoring functionality
    }

    public class AnimatorEventHandler
    {
        private AnimatorControllerManager manager;
        private Dictionary<string, Action> eventCallbacks = new Dictionary<string, Action>();
        
        public AnimatorEventHandler(AnimatorControllerManager manager)
        {
            this.manager = manager;
        }
        
        public void RegisterEventCallback(string eventName, Action callback)
        {
            if (!eventCallbacks.ContainsKey(eventName))
            {
                eventCallbacks[eventName] = callback;
            }
            else
            {
                eventCallbacks[eventName] += callback;
            }
        }
        
        public void UnregisterEventCallback(string eventName, Action callback)
        {
            if (eventCallbacks.ContainsKey(eventName))
            {
                eventCallbacks[eventName] -= callback;
            }
        }
        
        public void HandleAnimationEvent(string eventName)
        {
            if (eventCallbacks.ContainsKey(eventName))
            {
                eventCallbacks[eventName]?.Invoke();
            }
        }
    }

    #endregion
}
```

### 2. State Machine Behavior Scripts

#### 2.1 Custom State Machine Behaviors

[[LLM: Create a comprehensive system for custom StateMachineBehaviour scripts that provide enhanced state logic, transition management, and integration with game systems. Design reusable behaviors for common animation patterns like locomotion, combat, and UI transitions.]]

**State Machine Behavior Framework**:

```csharp
// Assets/Scripts/Animation/Behaviors/BaseStateMachineBehaviour.cs
using System;
using UnityEngine;

namespace {{project_namespace}}.Animation.Behaviors
{
    /// <summary>
    /// Enhanced base class for StateMachineBehaviour with additional features and utilities
    /// </summary>
    public abstract class BaseStateMachineBehaviour : StateMachineBehaviour
    {
        [Header("Base Configuration")]
        [SerializeField] protected bool enableDebugLogging = false;
        [SerializeField] protected bool enableTransitionCallbacks = true;
        [SerializeField] protected bool enableUpdateCallbacks = true;
        [SerializeField] protected string behaviorDescription = "";

        protected AnimatorControllerManager controllerManager;
        protected GameObject gameObject;
        protected Transform transform;
        
        private bool isInitialized = false;
        private float stateEnterTime;
        private float stateExitTime;
        
        public event Action<Animator, AnimatorStateInfo, int> OnStateEnteredEvent;
        public event Action<Animator, AnimatorStateInfo, int> OnStateExitedEvent;
        public event Action<Animator, AnimatorStateInfo, int> OnStateUpdateEvent;

        #region StateMachineBehaviour Overrides

        public override void OnStateEnter(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            try
            {
                if (!isInitialized)
                {
                    InitializeBehavior(animator);
                }
                
                stateEnterTime = Time.time;
                
                if (enableDebugLogging)
                {
                    Debug.Log($"[{GetType().Name}] Entered state on layer {layerIndex}");
                }
                
                OnStateEnterCustom(animator, stateInfo, layerIndex);
                
                if (enableTransitionCallbacks)
                {
                    OnStateEnteredEvent?.Invoke(animator, stateInfo, layerIndex);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[{GetType().Name}] Error in OnStateEnter: {ex.Message}");
            }
        }

        public override void OnStateUpdate(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            try
            {
                OnStateUpdateCustom(animator, stateInfo, layerIndex);
                
                if (enableUpdateCallbacks)
                {
                    OnStateUpdateEvent?.Invoke(animator, stateInfo, layerIndex);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[{GetType().Name}] Error in OnStateUpdate: {ex.Message}");
            }
        }

        public override void OnStateExit(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            try
            {
                stateExitTime = Time.time;
                
                if (enableDebugLogging)
                {
                    var stateDuration = stateExitTime - stateEnterTime;
                    Debug.Log($"[{GetType().Name}] Exited state after {stateDuration:F2}s on layer {layerIndex}");
                }
                
                OnStateExitCustom(animator, stateInfo, layerIndex);
                
                if (enableTransitionCallbacks)
                {
                    OnStateExitedEvent?.Invoke(animator, stateInfo, layerIndex);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[{GetType().Name}] Error in OnStateExit: {ex.Message}");
            }
        }

        public override void OnStateMove(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            try
            {
                OnStateMoveCustom(animator, stateInfo, layerIndex);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[{GetType().Name}] Error in OnStateMove: {ex.Message}");
            }
        }

        public override void OnStateIK(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            try
            {
                OnStateIKCustom(animator, stateInfo, layerIndex);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[{GetType().Name}] Error in OnStateIK: {ex.Message}");
            }
        }

        #endregion

        #region Initialization

        private void InitializeBehavior(Animator animator)
        {
            try
            {
                gameObject = animator.gameObject;
                transform = animator.transform;
                controllerManager = animator.GetComponent<AnimatorControllerManager>();
                
                OnInitializeCustom(animator);
                
                isInitialized = true;
                
                if (enableDebugLogging)
                {
                    Debug.Log($"[{GetType().Name}] Behavior initialized");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[{GetType().Name}] Error initializing behavior: {ex.Message}");
            }
        }

        #endregion

        #region Utility Methods

        protected bool HasControllerManager()
        {
            return controllerManager != null;
        }

        protected void SetParameter(string parameterName, object value)
        {
            if (!HasControllerManager()) return;
            
            try
            {
                var paramType = controllerManager.GetParameterType(parameterName);
                
                switch (paramType)
                {
                    case AnimatorControllerParameterType.Bool:
                        if (value is bool boolValue)
                            controllerManager.SetBool(parameterName, boolValue);
                        break;
                    case AnimatorControllerParameterType.Int:
                        if (value is int intValue)
                            controllerManager.SetInt(parameterName, intValue);
                        break;
                    case AnimatorControllerParameterType.Float:
                        if (value is float floatValue)
                            controllerManager.SetFloat(parameterName, floatValue);
                        break;
                    case AnimatorControllerParameterType.Trigger:
                        if (value is bool triggerValue && triggerValue)
                            controllerManager.SetTrigger(parameterName);
                        break;
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[{GetType().Name}] Error setting parameter '{parameterName}': {ex.Message}");
            }
        }

        protected T GetParameter<T>(string parameterName)
        {
            if (!HasControllerManager()) return default(T);
            
            try
            {
                var paramType = controllerManager.GetParameterType(parameterName);
                
                switch (paramType)
                {
                    case AnimatorControllerParameterType.Bool:
                        return (T)(object)controllerManager.GetBool(parameterName);
                    case AnimatorControllerParameterType.Int:
                        return (T)(object)controllerManager.GetInt(parameterName);
                    case AnimatorControllerParameterType.Float:
                        return (T)(object)controllerManager.GetFloat(parameterName);
                    default:
                        return default(T);
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[{GetType().Name}] Error getting parameter '{parameterName}': {ex.Message}");
                return default(T);
            }
        }

        protected float GetStateProgress(AnimatorStateInfo stateInfo)
        {
            return stateInfo.normalizedTime % 1f;
        }

        protected bool IsStateComplete(AnimatorStateInfo stateInfo)
        {
            return stateInfo.normalizedTime >= 1f;
        }

        protected float GetStateDuration()
        {
            return Time.time - stateEnterTime;
        }

        #endregion

        #region Abstract/Virtual Methods for Override

        protected virtual void OnInitializeCustom(Animator animator)
        {
            // Override in derived classes for custom initialization
        }

        protected virtual void OnStateEnterCustom(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            // Override in derived classes for custom state enter logic
        }

        protected virtual void OnStateUpdateCustom(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            // Override in derived classes for custom state update logic
        }

        protected virtual void OnStateExitCustom(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            // Override in derived classes for custom state exit logic
        }

        protected virtual void OnStateMoveCustom(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            // Override in derived classes for custom movement logic
        }

        protected virtual void OnStateIKCustom(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            // Override in derived classes for custom IK logic
        }

        #endregion
    }

    /// <summary>
    /// Specialized behavior for locomotion states with movement parameter management
    /// </summary>
    [CreateAssetMenu(fileName = "LocomotionBehavior", menuName = "Animation/Behaviors/Locomotion Behavior")]
    public class LocomotionStateBehavior : BaseStateMachineBehaviour
    {
        [Header("Locomotion Configuration")]
        [SerializeField] private string speedParameterName = "Speed";
        [SerializeField] private string directionXParameterName = "DirectionX";
        [SerializeField] private string directionYParameterName = "DirectionY";
        [SerializeField] private bool normalizeMovementInput = true;
        [SerializeField] private float speedSmoothingFactor = 5f;

        private CharacterController characterController;
        private Rigidbody characterRigidbody;
        private Vector3 lastVelocity;

        protected override void OnInitializeCustom(Animator animator)
        {
            characterController = animator.GetComponent<CharacterController>();
            characterRigidbody = animator.GetComponent<Rigidbody>();
        }

        protected override void OnStateUpdateCustom(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            UpdateMovementParameters(animator);
        }

        private void UpdateMovementParameters(Animator animator)
        {
            Vector3 velocity = Vector3.zero;
            
            if (characterController != null)
            {
                velocity = characterController.velocity;
            }
            else if (characterRigidbody != null)
            {
                velocity = characterRigidbody.velocity;
            }
            
            // Calculate movement values
            var speed = new Vector3(velocity.x, 0, velocity.z).magnitude;
            var direction = velocity.normalized;
            
            // Smooth the values
            if (speedSmoothingFactor > 0)
            {
                speed = Mathf.Lerp(GetParameter<float>(speedParameterName), speed, Time.deltaTime * speedSmoothingFactor);
            }
            
            // Normalize if required
            if (normalizeMovementInput && speed > 1f)
            {
                direction = direction / speed;
                speed = 1f;
            }
            
            // Set parameters
            SetParameter(speedParameterName, speed);
            SetParameter(directionXParameterName, direction.x);
            SetParameter(directionYParameterName, direction.z);
            
            lastVelocity = velocity;
        }
    }

    /// <summary>
    /// Behavior for attack/combat states with timing and combo management
    /// </summary>
    [CreateAssetMenu(fileName = "CombatBehavior", menuName = "Animation/Behaviors/Combat Behavior")]
    public class CombatStateBehavior : BaseStateMachineBehaviour
    {
        [Header("Combat Configuration")]
        [SerializeField] private string comboCountParameterName = "ComboCount";
        [SerializeField] private string canComboParameterName = "CanCombo";
        [SerializeField] private float comboWindowStart = 0.6f;
        [SerializeField] private float comboWindowEnd = 0.9f;
        [SerializeField] private int maxComboCount = 3;
        [SerializeField] private bool resetComboOnExit = true;

        private bool comboWindowActive = false;
        private bool comboTriggered = false;

        protected override void OnStateEnterCustom(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            comboWindowActive = false;
            comboTriggered = false;
            SetParameter(canComboParameterName, false);
        }

        protected override void OnStateUpdateCustom(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            var progress = GetStateProgress(stateInfo);
            
            // Check combo window
            if (progress >= comboWindowStart && progress <= comboWindowEnd)
            {
                if (!comboWindowActive)
                {
                    comboWindowActive = true;
                    SetParameter(canComboParameterName, true);
                    
                    if (enableDebugLogging)
                    {
                        Debug.Log("[CombatStateBehavior] Combo window opened");
                    }
                }
            }
            else if (comboWindowActive)
            {
                comboWindowActive = false;
                SetParameter(canComboParameterName, false);
                
                if (enableDebugLogging)
                {
                    Debug.Log("[CombatStateBehavior] Combo window closed");
                }
            }
        }

        protected override void OnStateExitCustom(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            if (resetComboOnExit && !comboTriggered)
            {
                SetParameter(comboCountParameterName, 0);
            }
        }

        public void TriggerCombo()
        {
            if (comboWindowActive && !comboTriggered)
            {
                var currentCombo = GetParameter<int>(comboCountParameterName);
                var nextCombo = Mathf.Min(currentCombo + 1, maxComboCount);
                
                SetParameter(comboCountParameterName, nextCombo);
                comboTriggered = true;
                
                if (enableDebugLogging)
                {
                    Debug.Log($"[CombatStateBehavior] Combo triggered: {nextCombo}");
                }
            }
        }
    }

    /// <summary>
    /// Behavior for managing animation events and sound effects
    /// </summary>
    [CreateAssetMenu(fileName = "EventBehavior", menuName = "Animation/Behaviors/Event Behavior")]
    public class AnimationEventBehavior : BaseStateMachineBehaviour
    {
        [Header("Event Configuration")]
        [SerializeField] private List<TimedAnimationEvent> timedEvents = new List<TimedAnimationEvent>();
        [SerializeField] private bool triggerEventsOnce = true;

        private HashSet<int> triggeredEvents = new HashSet<int>();

        protected override void OnStateEnterCustom(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            if (triggerEventsOnce)
            {
                triggeredEvents.Clear();
            }
        }

        protected override void OnStateUpdateCustom(Animator animator, AnimatorStateInfo stateInfo, int layerIndex)
        {
            var progress = GetStateProgress(stateInfo);
            
            for (int i = 0; i < timedEvents.Count; i++)
            {
                var timedEvent = timedEvents[i];
                
                if (progress >= timedEvent.TriggerTime)
                {
                    if (!triggerEventsOnce || !triggeredEvents.Contains(i))
                    {
                        TriggerEvent(timedEvent);
                        
                        if (triggerEventsOnce)
                        {
                            triggeredEvents.Add(i);
                        }
                    }
                }
            }
        }

        private void TriggerEvent(TimedAnimationEvent animEvent)
        {
            switch (animEvent.EventType)
            {
                case AnimationEventType.SoundEffect:
                    PlaySoundEffect(animEvent.StringParameter);
                    break;
                case AnimationEventType.ParticleEffect:
                    PlayParticleEffect(animEvent.StringParameter);
                    break;
                case AnimationEventType.SetParameter:
                    SetParameter(animEvent.StringParameter, animEvent.FloatParameter);
                    break;
                case AnimationEventType.Custom:
                    OnCustomEvent(animEvent);
                    break;
            }
            
            if (enableDebugLogging)
            {
                Debug.Log($"[AnimationEventBehavior] Triggered event: {animEvent.EventType} - {animEvent.StringParameter}");
            }
        }

        private void PlaySoundEffect(string soundName)
        {
            // Integrate with audio system
            // AudioManager.Instance?.PlaySound(soundName);
        }

        private void PlayParticleEffect(string effectName)
        {
            // Integrate with particle system
            // EffectManager.Instance?.PlayEffect(effectName, transform.position);
        }

        protected virtual void OnCustomEvent(TimedAnimationEvent animEvent)
        {
            // Override in derived classes for custom event handling
        }
    }

    #region Supporting Classes

    [Serializable]
    public class TimedAnimationEvent
    {
        public AnimationEventType EventType;
        public float TriggerTime; // Normalized time (0-1)
        public string StringParameter;
        public float FloatParameter;
        public int IntParameter;
        public bool BoolParameter;
    }

    public enum AnimationEventType
    {
        SoundEffect,
        ParticleEffect,
        SetParameter,
        Custom
    }

    #endregion
}
```

## Success Criteria

This Unity Animator Setup Task provides:

- **Comprehensive Animator Management**: Complete system for Animator Controller setup and runtime control
- **Advanced Parameter System**: Type-safe parameter management with validation and range checking
- **State Machine Monitoring**: Real-time state tracking with transition detection and event handling
- **Custom Behavior Framework**: Reusable StateMachineBehaviour classes for common animation patterns
- **Event Integration**: Animation event handling with callback system and custom event support
- **Layer Management**: Multi-layer animation support with weight control and blending
- **Production Ready**: Error handling, performance optimization, and debugging capabilities
- **Visual Development**: Perfect integration with Unity's visual animation workflow

## Integration Points

This task integrates with:
- `unity-editor-workflow.yaml` - Visual development phase (line 37)
- `component-architecture.md` - Provides animation component patterns
- `custom-inspector-creation.md` - Enhanced inspector for animator components
- `unity-visual-scripting-setup.md` - Integration with visual scripting systems

## Notes

This Animator setup framework provides comprehensive management of Unity's animation systems with focus on maintainability, performance, and ease of use. The system supports both simple character animations and complex multi-layered animation states while providing robust debugging and monitoring capabilities.

The framework is designed to work seamlessly with Unity's visual development tools while providing the flexibility needed for complex game animation requirements.