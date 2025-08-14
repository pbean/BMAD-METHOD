# Unity Custom Inspector Creation Task

## Purpose

To establish comprehensive Unity Editor scripting patterns for creating custom inspectors, property drawers, and editor tools that enhance development workflow. This task focuses on extending Unity's Inspector with custom UI elements, validation systems, and workflow automation tools. Provides foundation for visual development workflows and improved team productivity through enhanced editor experiences.

## Prerequisites

- Unity project with editor scripting assemblies configured
- Unity Editor development environment setup with proper assembly definitions
- Understanding of Unity's serialization system and PropertyDrawer architecture
- Knowledge of Unity's immediate mode GUI (IMGUI) and UI Toolkit systems
- Editor folder structure established following Unity conventions
- [[LLM: Verify these prerequisites and halt if not met, providing specific remediation steps for Unity Editor scripting setup]]

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Custom Inspector Foundation Architecture

#### 1.1 Base Custom Inspector Framework

[[LLM: Analyze the project's MonoBehaviour components and data structures to design a comprehensive custom inspector framework. Create base classes that provide consistent styling, validation, and enhanced editing capabilities while maintaining Unity's serialization compatibility.]]

**Custom Inspector Foundation System**:

```csharp
// Assets/Editor/Inspectors/BaseCustomInspector.cs
using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEngine;
using UnityEditor;
using UnityEditorInternal;

namespace {{project_namespace}}.Editor
{
    /// <summary>
    /// Enhanced base class for custom inspectors with advanced features and validation
    /// </summary>
    public abstract class BaseCustomInspector : UnityEditor.Editor
    {
        [Header("Inspector Configuration")]
        protected bool enableAdvancedInspector = true;
        protected bool enableRealTimeValidation = true;
        protected bool enableVisualSeparators = true;
        protected bool enableHelpBoxes = true;
        protected bool enableUndo = true;

        protected Dictionary<string, ReorderableList> reorderableLists = new Dictionary<string, ReorderableList>();
        protected Dictionary<string, bool> foldoutStates = new Dictionary<string, bool>();
        protected Dictionary<string, ValidationResult> validationResults = new Dictionary<string, ValidationResult>();

        protected GUIStyle headerStyle;
        protected GUIStyle subHeaderStyle;
        protected GUIStyle helpBoxStyle;
        protected GUIStyle warningBoxStyle;
        protected GUIStyle errorBoxStyle;

        protected static readonly Color headerColor = new Color(0.8f, 0.8f, 1f, 0.3f);
        protected static readonly Color warningColor = new Color(1f, 0.8f, 0.4f, 0.3f);
        protected static readonly Color errorColor = new Color(1f, 0.4f, 0.4f, 0.3f);

        private bool stylesInitialized = false;
        private SerializedProperty[] allProperties;
        private readonly List<InspectorSection> sections = new List<InspectorSection>();

        #region Unity Editor Lifecycle

        protected virtual void OnEnable()
        {
            try
            {
                InitializeCustomInspector();
                CacheSerializedProperties();
                SetupReorderableLists();
                LoadFoldoutStates();

                OnEnableCustom();

                // Subscribe to undo/redo events
                if (enableUndo)
                {
                    Undo.undoRedoPerformed += OnUndoRedoPerformed;
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BaseCustomInspector] OnEnable failed for {target.GetType().Name}: {ex.Message}");
            }
        }

        protected virtual void OnDisable()
        {
            try
            {
                SaveFoldoutStates();

                if (enableUndo)
                {
                    Undo.undoRedoPerformed -= OnUndoRedoPerformed;
                }

                OnDisableCustom();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BaseCustomInspector] OnDisable failed: {ex.Message}");
            }
        }

        public override void OnInspectorGUI()
        {
            try
            {
                if (!stylesInitialized)
                {
                    InitializeStyles();
                    stylesInitialized = true;
                }

                serializedObject.Update();

                // Real-time validation
                if (enableRealTimeValidation)
                {
                    PerformValidation();
                }

                DrawCustomInspector();

                serializedObject.ApplyModifiedProperties();

                // Handle GUI events
                HandleCustomEvents();
            }
            catch (Exception ex)
            {
                EditorGUILayout.HelpBox($"Inspector Error: {ex.Message}", MessageType.Error);
                Debug.LogError($"[BaseCustomInspector] OnInspectorGUI error: {ex.Message}");

                // Fallback to default inspector
                DrawDefaultInspector();
            }
        }

        #endregion

        #region Custom Inspector Drawing

        protected virtual void DrawCustomInspector()
        {
            DrawInspectorHeader();

            if (sections.Count > 0)
            {
                DrawSectionedInspector();
            }
            else
            {
                DrawStandardInspector();
            }

            DrawInspectorFooter();
        }

        protected virtual void DrawInspectorHeader()
        {
            if (!enableAdvancedInspector) return;

            EditorGUILayout.Space();

            using (new EditorGUILayout.HorizontalScope())
            {
                GUILayout.FlexibleSpace();

                var headerContent = new GUIContent(
                    GetInspectorTitle(),
                    GetInspectorIcon(),
                    GetInspectorTooltip()
                );

                EditorGUILayout.LabelField(headerContent, headerStyle, GUILayout.Height(24));
                GUILayout.FlexibleSpace();
            }

            if (enableVisualSeparators)
            {
                DrawSeparator();
            }

            DrawValidationSummary();
        }

        protected virtual void DrawSectionedInspector()
        {
            foreach (var section in sections)
            {
                DrawInspectorSection(section);
            }
        }

        protected virtual void DrawInspectorSection(InspectorSection section)
        {
            if (!section.IsVisible()) return;

            using (new EditorGUILayout.VerticalScope())
            {
                // Section header
                var foldoutKey = section.Name;
                var isFoldedOut = GetFoldoutState(foldoutKey, section.DefaultExpanded);

                using (new EditorGUILayout.HorizontalScope())
                {
                    var foldoutContent = new GUIContent(section.DisplayName, section.Tooltip);
                    isFoldedOut = EditorGUILayout.Foldout(isFoldedOut, foldoutContent, true, subHeaderStyle);
                    SetFoldoutState(foldoutKey, isFoldedOut);

                    if (!string.IsNullOrEmpty(section.HelpUrl))
                    {
                        if (GUILayout.Button("?", GUILayout.Width(20), GUILayout.Height(16)))
                        {
                            Application.OpenURL(section.HelpUrl);
                        }
                    }
                }

                if (isFoldedOut)
                {
                    using (new EditorGUI.IndentLevelScope())
                    {
                        if (enableVisualSeparators && section.ShowSeparator)
                        {
                            DrawSeparator();
                        }

                        // Section help text
                        if (!string.IsNullOrEmpty(section.HelpText) && enableHelpBoxes)
                        {
                            EditorGUILayout.HelpBox(section.HelpText, MessageType.Info);
                        }

                        // Draw section properties
                        foreach (var propertyName in section.PropertyNames)
                        {
                            DrawProperty(propertyName);
                        }

                        // Custom section drawing
                        section.OnDrawSection?.Invoke();

                        if (enableVisualSeparators && section.ShowSeparator)
                        {
                            EditorGUILayout.Space();
                        }
                    }
                }
            }
        }

        protected virtual void DrawStandardInspector()
        {
            if (allProperties != null)
            {
                foreach (var property in allProperties)
                {
                    if (property.name == "m_Script") continue;
                    DrawProperty(property.name);
                }
            }
        }

        protected virtual void DrawProperty(string propertyName)
        {
            var property = serializedObject.FindProperty(propertyName);
            if (property == null) return;

            try
            {
                // Check if property has reorderable list
                if (reorderableLists.ContainsKey(propertyName))
                {
                    DrawReorderableList(propertyName);
                    return;
                }

                // Check for validation on this property
                var validationResult = GetValidationResult(propertyName);
                if (validationResult != null && validationResult.HasIssues)
                {
                    DrawPropertyWithValidation(property, validationResult);
                }
                else
                {
                    // Standard property drawing
                    EditorGUILayout.PropertyField(property, true);
                }

                // Custom property drawing override
                OnDrawPropertyCustom(property);
            }
            catch (Exception ex)
            {
                EditorGUILayout.HelpBox($"Error drawing property '{propertyName}': {ex.Message}", MessageType.Error);
            }
        }

        protected virtual void DrawPropertyWithValidation(SerializedProperty property, ValidationResult validation)
        {
            var originalColor = GUI.backgroundColor;

            if (validation.Severity == ValidationSeverity.Error)
            {
                GUI.backgroundColor = errorColor;
            }
            else if (validation.Severity == ValidationSeverity.Warning)
            {
                GUI.backgroundColor = warningColor;
            }

            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
            {
                GUI.backgroundColor = originalColor;

                EditorGUILayout.PropertyField(property, true);

                foreach (var message in validation.Messages)
                {
                    var messageType = message.Severity == ValidationSeverity.Error ? MessageType.Error : MessageType.Warning;
                    EditorGUILayout.HelpBox(message.Text, messageType);
                }
            }
        }

        protected virtual void DrawReorderableList(string propertyName)
        {
            if (!reorderableLists.ContainsKey(propertyName)) return;

            var list = reorderableLists[propertyName];
            list.DoLayoutList();
        }

        protected virtual void DrawInspectorFooter()
        {
            if (!enableAdvancedInspector) return;

            EditorGUILayout.Space();

            using (new EditorGUILayout.HorizontalScope())
            {
                DrawCustomButtons();

                GUILayout.FlexibleSpace();

                if (GUILayout.Button("Reset to Defaults", GUILayout.Width(120)))
                {
                    if (EditorUtility.DisplayDialog(
                        "Reset Component",
                        "Are you sure you want to reset this component to default values?",
                        "Reset", "Cancel"))
                    {
                        ResetToDefaults();
                    }
                }
            }

            DrawDebugInfo();
        }

        #endregion

        #region Validation System

        protected virtual void PerformValidation()
        {
            validationResults.Clear();

            try
            {
                var targetObject = target;
                var targetType = targetObject.GetType();

                // Validate using reflection and attributes
                var fields = targetType.GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);

                foreach (var field in fields)
                {
                    var validationAttributes = field.GetCustomAttributes<ValidationAttribute>(true);
                    foreach (var attr in validationAttributes)
                    {
                        var result = attr.Validate(field.GetValue(targetObject), field);
                        if (result.HasIssues)
                        {
                            validationResults[field.Name] = result;
                        }
                    }
                }

                // Custom validation
                OnPerformCustomValidation();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BaseCustomInspector] Validation error: {ex.Message}");
            }
        }

        protected virtual void OnPerformCustomValidation()
        {
            // Override in derived classes for custom validation logic
        }

        protected ValidationResult GetValidationResult(string propertyName)
        {
            return validationResults.ContainsKey(propertyName) ? validationResults[propertyName] : null;
        }

        protected void DrawValidationSummary()
        {
            if (!enableRealTimeValidation || validationResults.Count == 0) return;

            var errorCount = 0;
            var warningCount = 0;

            foreach (var result in validationResults.Values)
            {
                foreach (var message in result.Messages)
                {
                    if (message.Severity == ValidationSeverity.Error)
                        errorCount++;
                    else if (message.Severity == ValidationSeverity.Warning)
                        warningCount++;
                }
            }

            if (errorCount > 0 || warningCount > 0)
            {
                var summaryText = $"Validation: {errorCount} errors, {warningCount} warnings";
                var messageType = errorCount > 0 ? MessageType.Error : MessageType.Warning;
                EditorGUILayout.HelpBox(summaryText, messageType);
            }
        }

        #endregion

        #region Reorderable List Management

        protected virtual void SetupReorderableLists()
        {
            // Override in derived classes to setup reorderable lists for array properties
            OnSetupReorderableListsCustom();
        }

        protected ReorderableList CreateReorderableList(string propertyName, string displayName = null)
        {
            var property = serializedObject.FindProperty(propertyName);
            if (property == null)
            {
                Debug.LogError($"[BaseCustomInspector] Property '{propertyName}' not found for reorderable list");
                return null;
            }

            var list = new ReorderableList(serializedObject, property, true, true, true, true)
            {
                drawHeaderCallback = rect =>
                {
                    EditorGUI.LabelField(rect, displayName ?? property.displayName);
                },

                drawElementCallback = (rect, index, isActive, isFocused) =>
                {
                    var element = property.GetArrayElementAtIndex(index);
                    rect.y += 2;
                    rect.height = EditorGUIUtility.singleLineHeight;
                    EditorGUI.PropertyField(rect, element, GUIContent.none);
                },

                onAddCallback = list =>
                {
                    property.arraySize++;
                    var newElement = property.GetArrayElementAtIndex(property.arraySize - 1);
                    OnReorderableListElementAdded(propertyName, newElement);
                },

                onRemoveCallback = list =>
                {
                    if (EditorUtility.DisplayDialog("Remove Element",
                        "Are you sure you want to remove this element?", "Remove", "Cancel"))
                    {
                        ReorderableList.defaultBehaviours.DoRemoveButton(list);
                    }
                }
            };

            reorderableLists[propertyName] = list;
            return list;
        }

        protected virtual void OnReorderableListElementAdded(string propertyName, SerializedProperty newElement)
        {
            // Override in derived classes for custom initialization of new elements
        }

        #endregion

        #region Style and UI Management

        protected virtual void InitializeStyles()
        {
            headerStyle = new GUIStyle(EditorStyles.boldLabel)
            {
                fontSize = 14,
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = EditorGUIUtility.isProSkin ? Color.white : Color.black }
            };

            subHeaderStyle = new GUIStyle(EditorStyles.foldout)
            {
                fontStyle = FontStyle.Bold,
                fontSize = 11
            };

            helpBoxStyle = new GUIStyle(EditorStyles.helpBox)
            {
                fontSize = 10,
                wordWrap = true
            };

            warningBoxStyle = new GUIStyle(EditorStyles.helpBox);
            errorBoxStyle = new GUIStyle(EditorStyles.helpBox);
        }

        protected void DrawSeparator()
        {
            EditorGUILayout.Space();
            var rect = EditorGUILayout.GetControlRect(false, 1);
            EditorGUI.DrawRect(rect, EditorGUIUtility.isProSkin ? Color.gray : Color.black);
            EditorGUILayout.Space();
        }

        #endregion

        #region State Management

        protected bool GetFoldoutState(string key, bool defaultValue = true)
        {
            return foldoutStates.ContainsKey(key) ? foldoutStates[key] : defaultValue;
        }

        protected void SetFoldoutState(string key, bool value)
        {
            foldoutStates[key] = value;
        }

        protected virtual void LoadFoldoutStates()
        {
            var targetType = target.GetType().Name;
            foreach (var section in sections)
            {
                var key = $"{targetType}_{section.Name}_foldout";
                var value = EditorPrefs.GetBool(key, section.DefaultExpanded);
                foldoutStates[section.Name] = value;
            }
        }

        protected virtual void SaveFoldoutStates()
        {
            var targetType = target.GetType().Name;
            foreach (var kvp in foldoutStates)
            {
                var key = $"{targetType}_{kvp.Key}_foldout";
                EditorPrefs.SetBool(key, kvp.Value);
            }
        }

        #endregion

        #region Event Handling

        protected virtual void OnUndoRedoPerformed()
        {
            Repaint();
        }

        protected virtual void HandleCustomEvents()
        {
            var currentEvent = Event.current;

            if (currentEvent.type == EventType.KeyDown)
            {
                OnKeyDown(currentEvent);
            }
            else if (currentEvent.type == EventType.ContextClick)
            {
                OnContextClick(currentEvent);
            }
        }

        protected virtual void OnKeyDown(Event keyEvent)
        {
            // Override for custom keyboard shortcuts
        }

        protected virtual void OnContextClick(Event clickEvent)
        {
            var menu = new GenericMenu();
            AddContextMenuItems(menu);

            if (menu.GetItemCount() > 0)
            {
                menu.ShowAsContext();
                clickEvent.Use();
            }
        }

        protected virtual void AddContextMenuItems(GenericMenu menu)
        {
            menu.AddItem(new GUIContent("Reset to Defaults"), false, ResetToDefaults);
            menu.AddItem(new GUIContent("Copy Component Values"), false, CopyComponentValues);
            menu.AddItem(new GUIContent("Paste Component Values"), false, PasteComponentValues);
        }

        #endregion

        #region Utility Methods

        protected virtual void CacheSerializedProperties()
        {
            var propertyList = new List<SerializedProperty>();
            var property = serializedObject.GetIterator();

            if (property.NextVisible(true))
            {
                do
                {
                    propertyList.Add(property.Copy());
                }
                while (property.NextVisible(false));
            }

            allProperties = propertyList.ToArray();
        }

        protected virtual void InitializeCustomInspector()
        {
            sections.Clear();
            OnInitializeCustomInspector();
        }

        protected void AddInspectorSection(InspectorSection section)
        {
            sections.Add(section);
        }

        protected InspectorSection CreateSection(string name, string displayName, params string[] propertyNames)
        {
            return new InspectorSection
            {
                Name = name,
                DisplayName = displayName,
                PropertyNames = propertyNames
            };
        }

        protected virtual void DrawCustomButtons()
        {
            // Override in derived classes for custom inspector buttons
        }

        protected virtual void DrawDebugInfo()
        {
            if (!Application.isPlaying) return;

            using (new EditorGUILayout.VerticalScope(EditorStyles.helpBox))
            {
                EditorGUILayout.LabelField("Runtime Debug Info", EditorStyles.miniBoldLabel);
                OnDrawDebugInfo();
            }
        }

        protected virtual void ResetToDefaults()
        {
            Undo.RecordObject(target, "Reset Component");

            var targetType = target.GetType();
            var defaultComponent = Activator.CreateInstance(targetType);

            var fields = targetType.GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
            foreach (var field in fields)
            {
                if (field.IsPublic || field.GetCustomAttribute<SerializeField>() != null)
                {
                    field.SetValue(target, field.GetValue(defaultComponent));
                }
            }

            EditorUtility.SetDirty(target);
        }

        protected virtual void CopyComponentValues()
        {
            var json = JsonUtility.ToJson(target);
            EditorGUIUtility.systemCopyBuffer = json;
            Debug.Log("[BaseCustomInspector] Component values copied to clipboard");
        }

        protected virtual void PasteComponentValues()
        {
            try
            {
                var json = EditorGUIUtility.systemCopyBuffer;
                if (!string.IsNullOrEmpty(json))
                {
                    Undo.RecordObject(target, "Paste Component Values");
                    JsonUtility.FromJsonOverwrite(json, target);
                    EditorUtility.SetDirty(target);
                    Debug.Log("[BaseCustomInspector] Component values pasted from clipboard");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BaseCustomInspector] Failed to paste component values: {ex.Message}");
            }
        }

        #endregion

        #region Abstract/Virtual Methods for Override

        protected virtual string GetInspectorTitle()
        {
            return target.GetType().Name;
        }

        protected virtual Texture2D GetInspectorIcon()
        {
            return null;
        }

        protected virtual string GetInspectorTooltip()
        {
            return $"Enhanced inspector for {target.GetType().Name}";
        }

        protected virtual void OnInitializeCustomInspector()
        {
            // Override in derived classes to setup sections and configuration
        }

        protected virtual void OnEnableCustom()
        {
            // Override in derived classes for custom OnEnable logic
        }

        protected virtual void OnDisableCustom()
        {
            // Override in derived classes for custom OnDisable logic
        }

        protected virtual void OnDrawPropertyCustom(SerializedProperty property)
        {
            // Override in derived classes for custom property drawing
        }

        protected virtual void OnSetupReorderableListsCustom()
        {
            // Override in derived classes to setup reorderable lists
        }

        protected virtual void OnDrawDebugInfo()
        {
            // Override in derived classes to draw runtime debug information
        }

        #endregion
    }

    #region Supporting Classes

    [Serializable]
    public class InspectorSection
    {
        public string Name;
        public string DisplayName;
        public string[] PropertyNames;
        public string HelpText;
        public string HelpUrl;
        public string Tooltip;
        public bool DefaultExpanded = true;
        public bool ShowSeparator = true;
        public System.Func<bool> IsVisible = () => true;
        public System.Action OnDrawSection;
    }

    public abstract class ValidationAttribute : Attribute
    {
        public abstract ValidationResult Validate(object value, FieldInfo field);
    }

    public class ValidationResult
    {
        public List<ValidationMessage> Messages = new List<ValidationMessage>();
        public bool HasIssues => Messages.Count > 0;
    }

    public class ValidationMessage
    {
        public string Text;
        public ValidationSeverity Severity;
    }

    public enum ValidationSeverity
    {
        Info,
        Warning,
        Error
    }

    #endregion
}
```

### 2. Property Drawer Development Framework

#### 2.1 Advanced Property Drawer System

[[LLM: Create a comprehensive property drawer framework that supports complex data types, validation, and enhanced editing experiences. Design reusable property drawers for common game development scenarios like ranges, curves, references, and conditional properties.]]

**Property Drawer Framework**:

```csharp
// Assets/Editor/PropertyDrawers/BasePropertyDrawer.cs
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using System.Reflection;

namespace {{project_namespace}}.Editor.PropertyDrawers
{
    /// <summary>
    /// Enhanced base class for property drawers with validation and advanced features
    /// </summary>
    public abstract class BasePropertyDrawer : PropertyDrawer
    {
        protected const float lineHeight = 18f;
        protected const float spacing = 2f;
        protected static readonly GUIStyle errorStyle = new GUIStyle(EditorStyles.helpBox);
        protected static readonly GUIStyle warningStyle = new GUIStyle(EditorStyles.helpBox);

        private static Dictionary<string, float> cachedHeights = new Dictionary<string, float>();
        private static Dictionary<string, ValidationResult> validationCache = new Dictionary<string, ValidationResult>();

        protected bool enableValidation = true;
        protected bool enableAnimation = true;
        protected bool enableTooltips = true;

        #region PropertyDrawer Overrides

        public override void OnGUI(Rect position, SerializedProperty property, GUIContent label)
        {
            try
            {
                var propertyKey = GetPropertyKey(property);

                // Begin property
                EditorGUI.BeginProperty(position, label, property);

                // Validation
                ValidationResult validation = null;
                if (enableValidation)
                {
                    validation = GetOrUpdateValidation(property, propertyKey);
                }

                // Draw property with validation styling
                if (validation != null && validation.HasIssues)
                {
                    DrawPropertyWithValidation(position, property, label, validation);
                }
                else
                {
                    DrawPropertyContent(position, property, label);
                }

                EditorGUI.EndProperty();
            }
            catch (Exception ex)
            {
                EditorGUI.HelpBox(position, $"Property Drawer Error: {ex.Message}", MessageType.Error);
                Debug.LogError($"[BasePropertyDrawer] Error drawing property {property.name}: {ex.Message}");
            }
        }

        public override float GetPropertyHeight(SerializedProperty property, GUIContent label)
        {
            try
            {
                var propertyKey = GetPropertyKey(property);

                if (cachedHeights.ContainsKey(propertyKey))
                {
                    return cachedHeights[propertyKey];
                }

                var height = CalculatePropertyHeight(property, label);

                // Add height for validation messages
                if (enableValidation)
                {
                    var validation = GetOrUpdateValidation(property, propertyKey);
                    if (validation != null && validation.HasIssues)
                    {
                        height += CalculateValidationHeight(validation);
                    }
                }

                cachedHeights[propertyKey] = height;
                return height;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BasePropertyDrawer] Error calculating height for {property.name}: {ex.Message}");
                return EditorGUIUtility.singleLineHeight;
            }
        }

        #endregion

        #region Abstract Methods

        protected abstract void DrawPropertyContent(Rect position, SerializedProperty property, GUIContent label);

        protected virtual float CalculatePropertyHeight(SerializedProperty property, GUIContent label)
        {
            return EditorGUIUtility.singleLineHeight;
        }

        #endregion

        #region Validation System

        protected virtual ValidationResult ValidateProperty(SerializedProperty property)
        {
            var validation = new ValidationResult();

            // Get validation attributes from field
            if (fieldInfo != null)
            {
                var validationAttributes = fieldInfo.GetCustomAttributes<ValidationAttribute>(true);
                foreach (var attr in validationAttributes)
                {
                    var result = attr.Validate(GetPropertyValue(property), fieldInfo);
                    if (result.HasIssues)
                    {
                        validation.Messages.AddRange(result.Messages);
                    }
                }
            }

            // Custom validation
            OnValidatePropertyCustom(property, validation);

            return validation;
        }

        protected virtual void OnValidatePropertyCustom(SerializedProperty property, ValidationResult validation)
        {
            // Override in derived classes for custom validation
        }

        protected ValidationResult GetOrUpdateValidation(SerializedProperty property, string propertyKey)
        {
            // Update validation every few frames to avoid performance issues
            if (Time.frameCount % 10 == 0 || !validationCache.ContainsKey(propertyKey))
            {
                var validation = ValidateProperty(property);
                validationCache[propertyKey] = validation;
                return validation;
            }

            return validationCache.ContainsKey(propertyKey) ? validationCache[propertyKey] : null;
        }

        protected float CalculateValidationHeight(ValidationResult validation)
        {
            float height = 0f;
            foreach (var message in validation.Messages)
            {
                var content = new GUIContent(message.Text);
                var messageHeight = errorStyle.CalcHeight(content, Screen.width - 50);
                height += messageHeight + spacing;
            }
            return height;
        }

        protected void DrawPropertyWithValidation(Rect position, SerializedProperty property, GUIContent label, ValidationResult validation)
        {
            var originalColor = GUI.backgroundColor;
            var propertyHeight = CalculatePropertyHeight(property, label);
            var propertyRect = new Rect(position.x, position.y, position.width, propertyHeight);

            // Determine validation color
            var hasErrors = validation.Messages.Exists(m => m.Severity == ValidationSeverity.Error);
            if (hasErrors)
            {
                GUI.backgroundColor = new Color(1f, 0.4f, 0.4f, 0.3f);
            }
            else
            {
                GUI.backgroundColor = new Color(1f, 0.8f, 0.4f, 0.3f);
            }

            // Draw property background
            EditorGUI.DrawRect(propertyRect, GUI.backgroundColor);
            GUI.backgroundColor = originalColor;

            // Draw property content
            DrawPropertyContent(propertyRect, property, label);

            // Draw validation messages
            var messageY = propertyRect.yMax + spacing;
            foreach (var message in validation.Messages)
            {
                var messageType = message.Severity == ValidationSeverity.Error ? MessageType.Error : MessageType.Warning;
                var content = new GUIContent(message.Text);
                var messageHeight = errorStyle.CalcHeight(content, position.width);
                var messageRect = new Rect(position.x, messageY, position.width, messageHeight);

                EditorGUI.HelpBox(messageRect, message.Text, messageType);
                messageY += messageHeight + spacing;
            }
        }

        #endregion

        #region Utility Methods

        protected string GetPropertyKey(SerializedProperty property)
        {
            return $"{property.serializedObject.targetObject.GetInstanceID()}_{property.propertyPath}";
        }

        protected object GetPropertyValue(SerializedProperty property)
        {
            switch (property.propertyType)
            {
                case SerializedPropertyType.Integer:
                    return property.intValue;
                case SerializedPropertyType.Boolean:
                    return property.boolValue;
                case SerializedPropertyType.Float:
                    return property.floatValue;
                case SerializedPropertyType.String:
                    return property.stringValue;
                case SerializedPropertyType.Color:
                    return property.colorValue;
                case SerializedPropertyType.Vector2:
                    return property.vector2Value;
                case SerializedPropertyType.Vector3:
                    return property.vector3Value;
                case SerializedPropertyType.Vector4:
                    return property.vector4Value;
                case SerializedPropertyType.Rect:
                    return property.rectValue;
                case SerializedPropertyType.Bounds:
                    return property.boundsValue;
                case SerializedPropertyType.Curve:
                    return property.animationCurveValue;
                case SerializedPropertyType.Enum:
                    return property.enumValueIndex;
                case SerializedPropertyType.ObjectReference:
                    return property.objectReferenceValue;
                default:
                    return null;
            }
        }

        protected void DrawLabel(Rect position, GUIContent label, bool bold = false)
        {
            if (bold)
            {
                EditorGUI.LabelField(position, label, EditorStyles.boldLabel);
            }
            else
            {
                EditorGUI.LabelField(position, label);
            }
        }

        protected Rect GetFieldRect(Rect position, int lineIndex = 0)
        {
            return new Rect(
                position.x,
                position.y + lineIndex * (lineHeight + spacing),
                position.width,
                lineHeight
            );
        }

        protected Rect[] SplitRect(Rect rect, params float[] widths)
        {
            var rects = new Rect[widths.Length];
            var currentX = rect.x;
            var totalWidth = rect.width / widths.Sum();

            for (int i = 0; i < widths.Length; i++)
            {
                var width = widths[i] * totalWidth;
                rects[i] = new Rect(currentX, rect.y, width - 2, rect.height);
                currentX += width;
            }

            return rects;
        }

        #endregion
    }

    #region Specialized Property Drawers

    /// <summary>
    /// Property drawer for range values with min/max validation
    /// </summary>
    [CustomPropertyDrawer(typeof(RangeFloat))]
    public class RangeFloatPropertyDrawer : BasePropertyDrawer
    {
        protected override void DrawPropertyContent(Rect position, SerializedProperty property, GUIContent label)
        {
            var minProperty = property.FindPropertyRelative("min");
            var maxProperty = property.FindPropertyRelative("max");

            if (minProperty == null || maxProperty == null)
            {
                EditorGUI.HelpBox(position, "RangeFloat requires 'min' and 'max' fields", MessageType.Error);
                return;
            }

            var rects = SplitRect(position, 0.3f, 0.3f, 0.1f, 0.3f);

            EditorGUI.LabelField(rects[0], label);

            EditorGUI.BeginChangeCheck();
            var newMin = EditorGUI.FloatField(rects[1], minProperty.floatValue);
            if (EditorGUI.EndChangeCheck())
            {
                minProperty.floatValue = Mathf.Min(newMin, maxProperty.floatValue);
            }

            EditorGUI.LabelField(rects[2], "to", EditorStyles.centeredGreyMiniLabel);

            EditorGUI.BeginChangeCheck();
            var newMax = EditorGUI.FloatField(rects[3], maxProperty.floatValue);
            if (EditorGUI.EndChangeCheck())
            {
                maxProperty.floatValue = Mathf.Max(newMax, minProperty.floatValue);
            }
        }

        protected override void OnValidatePropertyCustom(SerializedProperty property, ValidationResult validation)
        {
            var minProperty = property.FindPropertyRelative("min");
            var maxProperty = property.FindPropertyRelative("max");

            if (minProperty != null && maxProperty != null)
            {
                if (minProperty.floatValue > maxProperty.floatValue)
                {
                    validation.Messages.Add(new ValidationMessage
                    {
                        Text = "Minimum value cannot be greater than maximum value",
                        Severity = ValidationSeverity.Error
                    });
                }
            }
        }
    }

    /// <summary>
    /// Property drawer for conditional properties that show/hide based on other property values
    /// </summary>
    public class ConditionalPropertyDrawer : BasePropertyDrawer
    {
        protected string conditionPropertyName;
        protected object conditionValue;
        protected bool hideWhenConditionMet;

        public ConditionalPropertyDrawer(string conditionProperty, object conditionVal, bool hideWhen = false)
        {
            conditionPropertyName = conditionProperty;
            conditionValue = conditionVal;
            hideWhenConditionMet = hideWhen;
        }

        protected override void DrawPropertyContent(Rect position, SerializedProperty property, GUIContent label)
        {
            if (!ShouldDrawProperty(property))
            {
                return;
            }

            EditorGUI.PropertyField(position, property, label, true);
        }

        protected override float CalculatePropertyHeight(SerializedProperty property, GUIContent label)
        {
            if (!ShouldDrawProperty(property))
            {
                return 0f;
            }

            return EditorGUI.GetPropertyHeight(property, label, true);
        }

        private bool ShouldDrawProperty(SerializedProperty property)
        {
            var conditionProperty = property.serializedObject.FindProperty(conditionPropertyName);
            if (conditionProperty == null) return true;

            var currentValue = GetPropertyValue(conditionProperty);
            var conditionMet = currentValue?.Equals(conditionValue) ?? false;

            return hideWhenConditionMet ? !conditionMet : conditionMet;
        }
    }

    /// <summary>
    /// Property drawer for asset references with validation and preview
    /// </summary>
    [CustomPropertyDrawer(typeof(ValidatedAssetReference))]
    public class ValidatedAssetReferencePropertyDrawer : BasePropertyDrawer
    {
        protected override void DrawPropertyContent(Rect position, SerializedProperty property, GUIContent label)
        {
            var assetProperty = property.FindPropertyRelative("asset");
            if (assetProperty == null)
            {
                EditorGUI.HelpBox(position, "ValidatedAssetReference requires 'asset' field", MessageType.Error);
                return;
            }

            var rects = SplitRect(position, 0.7f, 0.3f);

            EditorGUI.PropertyField(rects[0], assetProperty, label);

            if (assetProperty.objectReferenceValue != null)
            {
                if (GUI.Button(rects[1], "Preview"))
                {
                    Selection.activeObject = assetProperty.objectReferenceValue;
                    EditorGUIUtility.PingObject(assetProperty.objectReferenceValue);
                }
            }
        }

        protected override void OnValidatePropertyCustom(SerializedProperty property, ValidationResult validation)
        {
            var assetProperty = property.FindPropertyRelative("asset");
            var requiredTypeProperty = property.FindPropertyRelative("requiredType");

            if (assetProperty?.objectReferenceValue == null)
            {
                validation.Messages.Add(new ValidationMessage
                {
                    Text = "Asset reference is required",
                    Severity = ValidationSeverity.Error
                });
            }
            else if (requiredTypeProperty != null)
            {
                var requiredTypeName = requiredTypeProperty.stringValue;
                if (!string.IsNullOrEmpty(requiredTypeName))
                {
                    var assetType = assetProperty.objectReferenceValue.GetType();
                    var requiredType = Type.GetType(requiredTypeName);

                    if (requiredType != null && !requiredType.IsAssignableFrom(assetType))
                    {
                        validation.Messages.Add(new ValidationMessage
                        {
                            Text = $"Asset must be of type {requiredType.Name}",
                            Severity = ValidationSeverity.Error
                        });
                    }
                }
            }
        }
    }

    #endregion

    #region Data Structures

    [Serializable]
    public class RangeFloat
    {
        public float min;
        public float max;

        public RangeFloat(float minValue = 0f, float maxValue = 1f)
        {
            min = minValue;
            max = maxValue;
        }

        public bool Contains(float value)
        {
            return value >= min && value <= max;
        }

        public float Clamp(float value)
        {
            return Mathf.Clamp(value, min, max);
        }

        public float Random()
        {
            return UnityEngine.Random.Range(min, max);
        }
    }

    [Serializable]
    public class ValidatedAssetReference
    {
        public UnityEngine.Object asset;
        public string requiredType;

        public T GetAsset<T>() where T : UnityEngine.Object
        {
            return asset as T;
        }
    }

    #endregion
}
```

### 3. Editor Window Development Framework

#### 3.1 Custom Editor Window System

[[LLM: Design a comprehensive editor window framework for creating custom tools and workflows within Unity Editor. Include features for data management, user preferences, multi-window support, and integration with Unity's layout system.]]

**Editor Window Framework**:

```csharp
// Assets/Editor/Windows/BaseEditorWindow.cs
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using System.IO;

namespace {{project_namespace}}.Editor.Windows
{
    /// <summary>
    /// Enhanced base class for custom editor windows with advanced features
    /// </summary>
    public abstract class BaseEditorWindow : EditorWindow
    {
        [Header("Window Configuration")]
        protected bool enableAutoSave = true;
        protected bool enableUndo = true;
        protected bool enableMenuBar = true;
        protected bool enableToolbar = true;
        protected bool enableStatusBar = true;
        protected float autoSaveInterval = 30f;

        protected Vector2 scrollPosition;
        protected Dictionary<string, object> windowData = new Dictionary<string, object>();
        protected string windowDataPath;

        private bool isInitialized = false;
        private float lastAutoSaveTime;
        private GUIStyle headerStyle;
        private GUIStyle toolbarStyle;
        private GUIStyle statusBarStyle;

        #region Window Lifecycle

        protected virtual void OnEnable()
        {
            try
            {
                InitializeWindow();
                LoadWindowData();
                OnEnableCustom();

                if (enableUndo)
                {
                    Undo.undoRedoPerformed += OnUndoRedoPerformed;
                }

                isInitialized = true;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BaseEditorWindow] OnEnable failed: {ex.Message}");
            }
        }

        protected virtual void OnDisable()
        {
            try
            {
                if (enableAutoSave)
                {
                    SaveWindowData();
                }

                if (enableUndo)
                {
                    Undo.undoRedoPerformed -= OnUndoRedoPerformed;
                }

                OnDisableCustom();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BaseEditorWindow] OnDisable failed: {ex.Message}");
            }
        }

        protected virtual void OnGUI()
        {
            if (!isInitialized)
            {
                EditorGUILayout.HelpBox("Window is initializing...", MessageType.Info);
                return;
            }

            try
            {
                InitializeStyles();

                using (new EditorGUILayout.VerticalScope())
                {
                    if (enableMenuBar)
                    {
                        DrawMenuBar();
                    }

                    if (enableToolbar)
                    {
                        DrawToolbar();
                    }

                    using (var scrollView = new EditorGUILayout.ScrollViewScope(scrollPosition))
                    {
                        scrollPosition = scrollView.scrollPosition;
                        DrawWindowContent();
                    }

                    if (enableStatusBar)
                    {
                        DrawStatusBar();
                    }
                }

                HandleWindowEvents();

                if (enableAutoSave && Time.realtimeSinceStartup - lastAutoSaveTime > autoSaveInterval)
                {
                    SaveWindowData();
                    lastAutoSaveTime = Time.realtimeSinceStartup;
                }
            }
            catch (Exception ex)
            {
                EditorGUILayout.HelpBox($"Window Error: {ex.Message}", MessageType.Error);
                Debug.LogError($"[BaseEditorWindow] OnGUI error: {ex.Message}");
            }
        }

        protected virtual void Update()
        {
            OnUpdateCustom();
        }

        #endregion

        #region Window Drawing

        protected virtual void DrawMenuBar()
        {
            using (new EditorGUILayout.HorizontalScope(EditorStyles.toolbar))
            {
                DrawMenuBarContent();

                GUILayout.FlexibleSpace();

                if (GUILayout.Button("Help", EditorStyles.toolbarButton, GUILayout.Width(50)))
                {
                    ShowHelp();
                }

                if (GUILayout.Button("⚙", EditorStyles.toolbarButton, GUILayout.Width(25)))
                {
                    ShowSettings();
                }
            }
        }

        protected virtual void DrawToolbar()
        {
            using (new EditorGUILayout.HorizontalScope(EditorStyles.toolbar))
            {
                DrawToolbarContent();

                GUILayout.FlexibleSpace();

                if (enableAutoSave)
                {
                    var autoSaveLabel = $"Auto-save: {(int)(autoSaveInterval - (Time.realtimeSinceStartup - lastAutoSaveTime))}s";
                    EditorGUILayout.LabelField(autoSaveLabel, EditorStyles.miniLabel, GUILayout.Width(80));
                }
            }
        }

        protected virtual void DrawStatusBar()
        {
            using (new EditorGUILayout.HorizontalScope(statusBarStyle))
            {
                DrawStatusBarContent();

                GUILayout.FlexibleSpace();

                EditorGUILayout.LabelField($"Window: {GetWindowTitle()}", EditorStyles.miniLabel);
            }
        }

        protected abstract void DrawWindowContent();

        #endregion

        #region Data Management

        protected virtual void InitializeWindow()
        {
            windowDataPath = GetWindowDataPath();
            OnInitializeWindow();
        }

        protected virtual string GetWindowDataPath()
        {
            var windowType = GetType().Name;
            return Path.Combine(Application.persistentDataPath, "Editor", $"{windowType}_Data.json");
        }

        protected virtual void LoadWindowData()
        {
            try
            {
                if (File.Exists(windowDataPath))
                {
                    var json = File.ReadAllText(windowDataPath);
                    var data = JsonUtility.FromJson<WindowDataContainer>(json);

                    if (data?.Data != null)
                    {
                        windowData = data.Data;
                    }
                }

                OnLoadWindowData();
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[BaseEditorWindow] Failed to load window data: {ex.Message}");
            }
        }

        protected virtual void SaveWindowData()
        {
            try
            {
                OnSaveWindowData();

                var dataContainer = new WindowDataContainer { Data = windowData };
                var json = JsonUtility.ToJson(dataContainer, true);

                var directory = Path.GetDirectoryName(windowDataPath);
                if (!Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                File.WriteAllText(windowDataPath, json);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[BaseEditorWindow] Failed to save window data: {ex.Message}");
            }
        }

        protected T GetWindowData<T>(string key, T defaultValue = default(T))
        {
            if (windowData.ContainsKey(key))
            {
                try
                {
                    return (T)windowData[key];
                }
                catch
                {
                    return defaultValue;
                }
            }
            return defaultValue;
        }

        protected void SetWindowData<T>(string key, T value)
        {
            windowData[key] = value;
        }

        #endregion

        #region Event Handling

        protected virtual void HandleWindowEvents()
        {
            var currentEvent = Event.current;

            switch (currentEvent.type)
            {
                case EventType.KeyDown:
                    OnKeyDown(currentEvent);
                    break;
                case EventType.ContextClick:
                    OnContextClick(currentEvent);
                    break;
                case EventType.DragUpdated:
                case EventType.DragPerform:
                    OnDragAndDrop(currentEvent);
                    break;
            }
        }

        protected virtual void OnKeyDown(Event keyEvent)
        {
            // Handle keyboard shortcuts
            if (keyEvent.control || keyEvent.command)
            {
                switch (keyEvent.keyCode)
                {
                    case KeyCode.S:
                        SaveWindowData();
                        keyEvent.Use();
                        break;
                    case KeyCode.R:
                        RefreshWindow();
                        keyEvent.Use();
                        break;
                }
            }
        }

        protected virtual void OnContextClick(Event clickEvent)
        {
            var menu = new GenericMenu();
            AddContextMenuItems(menu);

            if (menu.GetItemCount() > 0)
            {
                menu.ShowAsContext();
                clickEvent.Use();
            }
        }

        protected virtual void OnDragAndDrop(Event dropEvent)
        {
            // Override in derived classes for drag and drop support
        }

        protected virtual void OnUndoRedoPerformed()
        {
            Repaint();
        }

        #endregion

        #region Utility Methods

        protected virtual void InitializeStyles()
        {
            if (headerStyle == null)
            {
                headerStyle = new GUIStyle(EditorStyles.boldLabel)
                {
                    fontSize = 14,
                    alignment = TextAnchor.MiddleCenter
                };
            }

            if (toolbarStyle == null)
            {
                toolbarStyle = new GUIStyle(EditorStyles.toolbar);
            }

            if (statusBarStyle == null)
            {
                statusBarStyle = new GUIStyle(EditorStyles.toolbar)
                {
                    fixedHeight = 18
                };
            }
        }

        protected virtual void AddContextMenuItems(GenericMenu menu)
        {
            menu.AddItem(new GUIContent("Refresh Window"), false, RefreshWindow);
            menu.AddItem(new GUIContent("Save Data"), false, SaveWindowData);
            menu.AddItem(new GUIContent("Reset Window"), false, ResetWindow);
        }

        protected virtual void RefreshWindow()
        {
            LoadWindowData();
            Repaint();
        }

        protected virtual void ResetWindow()
        {
            if (EditorUtility.DisplayDialog("Reset Window",
                "Are you sure you want to reset this window to default settings?",
                "Reset", "Cancel"))
            {
                windowData.Clear();
                if (File.Exists(windowDataPath))
                {
                    File.Delete(windowDataPath);
                }
                RefreshWindow();
            }
        }

        protected virtual void ShowHelp()
        {
            var helpUrl = GetHelpUrl();
            if (!string.IsNullOrEmpty(helpUrl))
            {
                Application.OpenURL(helpUrl);
            }
            else
            {
                EditorUtility.DisplayDialog("Help", GetHelpText(), "OK");
            }
        }

        protected virtual void ShowSettings()
        {
            // Override in derived classes for custom settings
            EditorUtility.DisplayDialog("Settings", "No settings available for this window.", "OK");
        }

        #endregion

        #region Abstract/Virtual Methods for Override

        protected abstract string GetWindowTitle();

        protected virtual string GetHelpUrl()
        {
            return null;
        }

        protected virtual string GetHelpText()
        {
            return $"Help for {GetWindowTitle()} window.";
        }

        protected virtual void OnInitializeWindow()
        {
            // Override in derived classes for custom initialization
        }

        protected virtual void OnEnableCustom()
        {
            // Override in derived classes for custom OnEnable logic
        }

        protected virtual void OnDisableCustom()
        {
            // Override in derived classes for custom OnDisable logic
        }

        protected virtual void OnUpdateCustom()
        {
            // Override in derived classes for custom Update logic
        }

        protected virtual void OnLoadWindowData()
        {
            // Override in derived classes for custom data loading
        }

        protected virtual void OnSaveWindowData()
        {
            // Override in derived classes for custom data saving
        }

        protected virtual void DrawMenuBarContent()
        {
            // Override in derived classes for custom menu bar
        }

        protected virtual void DrawToolbarContent()
        {
            // Override in derived classes for custom toolbar
        }

        protected virtual void DrawStatusBarContent()
        {
            // Override in derived classes for custom status bar
        }

        #endregion

        #region Static Utility Methods

        public static T OpenWindow<T>() where T : BaseEditorWindow
        {
            var window = GetWindow<T>();
            window.Show();
            return window;
        }

        public static T OpenWindow<T>(string title) where T : BaseEditorWindow
        {
            var window = GetWindow<T>();
            window.titleContent = new GUIContent(title);
            window.Show();
            return window;
        }

        #endregion
    }

    [Serializable]
    public class WindowDataContainer
    {
        public Dictionary<string, object> Data;
    }
}
```

## Success Criteria

This Unity Custom Inspector Creation Task provides:

- **Comprehensive Inspector Framework**: Base classes with validation, styling, and enhanced editing
- **Advanced Property Drawers**: Reusable drawers for ranges, conditionals, and asset references
- **Custom Editor Windows**: Full-featured window framework with data persistence and event handling
- **Validation System**: Real-time property validation with visual feedback and error reporting
- **Production Ready**: Error handling, performance optimization, and Unity Editor best practices
- **Visual Enhancement**: Consistent styling, animations, and improved user experience
- **Workflow Integration**: Seamless integration with Unity's editor systems and undo/redo
- **Extensible Architecture**: Clear inheritance patterns for custom implementations

## Integration Points

This task integrates with:

- `unity-editor-workflow.yaml` - Editor setup phase (line 24)
- `component-architecture.md` - Provides inspector enhancement for custom components
- `monobehaviour-creation.md` - Enhances MonoBehaviour editing experience
- `unity-editor-integration.md` - Foundation for comprehensive editor tool development

## Notes

This custom inspector creation framework provides a comprehensive foundation for enhancing Unity's Editor experience through custom inspectors, property drawers, and editor windows. The system emphasizes maintainability, reusability, and professional polish while maintaining full compatibility with Unity's serialization and editor systems.

The framework supports both simple property enhancement and complex workflow automation, making it suitable for projects ranging from indie games to enterprise applications.
