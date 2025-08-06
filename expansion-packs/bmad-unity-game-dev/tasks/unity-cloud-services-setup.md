# Unity Cloud Services Setup Task

## Purpose

To configure and integrate Unity Gaming Services (UGS) including Analytics, Cloud Save, Remote Config, Authentication, and other cloud-based services. This task ensures proper cloud service integration following BMAD template processing patterns for Unity game projects.

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Load Configuration and Prerequisites

- Load `{root}/config.yaml` from the expansion pack directory
- Extract key configurations: `gamearchitecture.*`, `devLoadAlwaysFiles`
- Verify Unity project has required packages:
  - `com.unity.services.core` - Unity Services Core
  - `com.unity.services.analytics` - Analytics (if using)
  - `com.unity.services.cloudsave` - Cloud Save (if using)
  - `com.unity.remote-config` - Remote Config (if using)
  - `com.unity.services.authentication` - Authentication
- If packages missing, HALT and inform user: "Please run unity-package-setup task first to install Unity Services packages."

### 1. Unity Services Core Setup

#### 1.1 Initialize Project ID

Check Unity project settings:
- Verify Project ID exists in `ProjectSettings/ProjectSettings.asset`
- If no Project ID:
  - Guide user to Unity Dashboard: https://dashboard.unity3d.com
  - Create or link project
  - Obtain Project ID and Organization ID
- Document IDs for reference

#### 1.2 Create Services Initialization Script

Generate `Assets/Scripts/Services/UnityServicesInitializer.cs`:

```csharp
using Unity.Services.Core;
using Unity.Services.Core.Environments;
using UnityEngine;
using System.Threading.Tasks;

public class UnityServicesInitializer : MonoBehaviour
{
    [SerializeField] private string environment = "production";
    
    async void Start()
    {
        await InitializeUnityServices();
    }
    
    async Task InitializeUnityServices()
    {
        try
        {
            var options = new InitializationOptions()
                .SetEnvironmentName(environment);
            
            await UnityServices.InitializeAsync(options);
            Debug.Log("Unity Services initialized successfully");
            
            // Initialize individual services
            await InitializeAuthentication();
            await InitializeAnalytics();
            await InitializeCloudSave();
            await InitializeRemoteConfig();
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Failed to initialize Unity Services: {e.Message}");
        }
    }
}
```

### 2. Authentication Service Setup

#### 2.1 Configure Authentication

Generate `Assets/Scripts/Services/AuthenticationManager.cs`:

```csharp
using Unity.Services.Authentication;
using Unity.Services.Core;
using UnityEngine;
using System.Threading.Tasks;

public class AuthenticationManager : MonoBehaviour
{
    public static AuthenticationManager Instance { get; private set; }
    
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    public async Task<bool> SignInAnonymously()
    {
        try
        {
            await AuthenticationService.Instance.SignInAnonymouslyAsync();
            Debug.Log($"Signed in as: {AuthenticationService.Instance.PlayerId}");
            return true;
        }
        catch (AuthenticationException ex)
        {
            Debug.LogError($"Sign in failed: {ex}");
            return false;
        }
    }
    
    public async Task<bool> SignInWithUnity(string username, string password)
    {
        // Unity authentication implementation
        [[LLM: Complete based on project requirements]]
    }
}
```

#### 2.2 Session Management

Configure session handling and persistence:
- Token refresh logic
- Session timeout handling
- Offline mode fallback
- Account linking options

### 3. Analytics Service Configuration

#### 3.1 Setup Analytics Events

Generate `Assets/Scripts/Services/AnalyticsManager.cs`:

```csharp
using Unity.Services.Analytics;
using System.Collections.Generic;
using UnityEngine;

public class AnalyticsManager : MonoBehaviour
{
    public static AnalyticsManager Instance { get; private set; }
    
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
    }
    
    public void TrackGameStart()
    {
        var parameters = new Dictionary<string, object>
        {
            { "level", {{current_level}} },
            { "difficulty", {{difficulty_setting}} },
            { "platform", Application.platform.ToString() }
        };
        
        AnalyticsService.Instance.CustomData("gameStart", parameters);
    }
    
    public void TrackLevelComplete(int level, float time, int score)
    {
        var parameters = new Dictionary<string, object>
        {
            { "level", level },
            { "completion_time", time },
            { "score", score },
            { "perfect", score == {{max_score}} }
        };
        
        AnalyticsService.Instance.CustomData("levelComplete", parameters);
    }
    
    // [[LLM: Add project-specific events based on game design]]
}
```

#### 3.2 Privacy Compliance

Implement GDPR/CCPA compliance:
```csharp
public class PrivacyManager : MonoBehaviour
{
    public async Task RequestDataOptOut()
    {
        await AnalyticsService.Instance.RequestDataDeletionAsync();
    }
    
    public void SetConsentStatus(bool hasConsent)
    {
        // Configure based on privacy requirements
        {{privacy_implementation}}
    }
}
```

### 4. Cloud Save Integration

#### 4.1 Setup Cloud Save Manager

Generate `Assets/Scripts/Services/CloudSaveManager.cs`:

```csharp
using Unity.Services.CloudSave;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;

public class CloudSaveManager : MonoBehaviour
{
    public static CloudSaveManager Instance { get; private set; }
    
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
    }
    
    public async Task SaveGameData(string key, object data)
    {
        var dataToSave = new Dictionary<string, object> { { key, data } };
        
        try
        {
            await CloudSaveService.Instance.Data.ForceSaveAsync(dataToSave);
            Debug.Log($"Saved {key} to cloud");
        }
        catch (CloudSaveException e)
        {
            Debug.LogError($"Failed to save {key}: {e}");
        }
    }
    
    public async Task<T> LoadGameData<T>(string key)
    {
        try
        {
            var data = await CloudSaveService.Instance.Data.LoadAsync(new HashSet<string> { key });
            
            if (data.TryGetValue(key, out var item))
            {
                return item.Value.GetAs<T>();
            }
        }
        catch (CloudSaveException e)
        {
            Debug.LogError($"Failed to load {key}: {e}");
        }
        
        return default(T);
    }
}
```

#### 4.2 Define Save Data Structures

Create data models for cloud save:
```csharp
[System.Serializable]
public class PlayerSaveData
{
    public int level;
    public int experience;
    public float playTime;
    public Dictionary<string, bool> achievements;
    // [[LLM: Add game-specific save data based on GDD]]
}

[System.Serializable]
public class SettingsSaveData
{
    public float masterVolume;
    public float sfxVolume;
    public float musicVolume;
    public int graphicsQuality;
    // {{additional_settings}}
}
```

### 5. Remote Config Setup

#### 5.1 Configure Remote Settings

Generate `Assets/Scripts/Services/RemoteConfigManager.cs`:

```csharp
using Unity.Services.RemoteConfig;
using Unity.Services.Authentication;
using Unity.Services.Core;
using System.Threading.Tasks;
using UnityEngine;

public class RemoteConfigManager : MonoBehaviour
{
    public struct UserAttributes
    {
        public string userId;
        public string platform;
        public int playerLevel;
    }
    
    public struct AppAttributes
    {
        public string appVersion;
        public string buildNumber;
    }
    
    public static RemoteConfigManager Instance { get; private set; }
    
    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
    }
    
    public async Task FetchConfigs()
    {
        var userAttributes = new UserAttributes
        {
            userId = AuthenticationService.Instance.PlayerId,
            platform = Application.platform.ToString(),
            playerLevel = {{player_level}}
        };
        
        var appAttributes = new AppAttributes
        {
            appVersion = Application.version,
            buildNumber = {{build_number}}
        };
        
        await RemoteConfigService.Instance.FetchConfigsAsync(userAttributes, appAttributes);
        
        ApplyRemoteSettings();
    }
    
    private void ApplyRemoteSettings()
    {
        // Apply fetched configurations
        var difficulty = RemoteConfigService.Instance.appConfig.GetFloat("gameDifficulty", 1.0f);
        var eventActive = RemoteConfigService.Instance.appConfig.GetBool("specialEventActive", false);
        
        // [[LLM: Apply configurations based on game requirements]]
    }
}
```

#### 5.2 Define Configuration Parameters

Document remote parameters:
```yaml
# Remote Config Parameters
gameBalance:
  - enemyHealth: float (default: 100)
  - playerDamage: float (default: 10)
  - experienceMultiplier: float (default: 1.0)

features:
  - specialEventActive: bool (default: false)
  - newFeatureEnabled: bool (default: false)
  
monetization:
  - adFrequency: int (default: 3)
  - iapDiscount: float (default: 0)
```

### 6. Additional Services Integration

#### 6.1 Economy Service (if applicable)

```csharp
// Assets/Scripts/Services/EconomyManager.cs
using Unity.Services.Economy;

public class EconomyManager : MonoBehaviour
{
    // Virtual currency management
    // Inventory system
    // [[LLM: Implement based on monetization strategy]]
}
```

#### 6.2 Lobby Service (for multiplayer)

```csharp
// Assets/Scripts/Services/LobbyManager.cs
using Unity.Services.Lobbies;

public class LobbyManager : MonoBehaviour
{
    // Lobby creation and joining
    // Matchmaking logic
    // [[LLM: Implement based on multiplayer requirements]]
}
```

### 7. Service Configuration Documentation

#### 7.1 Generate Configuration Guide

Create `docs/unity-cloud-services.md`:

```markdown
# Unity Cloud Services Configuration

## Service Status
| Service | Status | Project ID | Environment |
|---------|--------|------------|-------------|
| Authentication | ✅ Configured | {{project_id}} | {{environment}} |
| Analytics | ✅ Configured | {{project_id}} | {{environment}} |
| Cloud Save | ✅ Configured | {{project_id}} | {{environment}} |
| Remote Config | ✅ Configured | {{project_id}} | {{environment}} |

## Authentication Flow
1. Anonymous sign-in on first launch
2. Optional account linking
3. Session persistence across launches
[Source: AuthenticationManager.cs]

## Analytics Events
### Core Events
- gameStart: Tracks game session start
- levelComplete: Tracks level completion
- {{custom_events}}: {{descriptions}}
[Source: AnalyticsManager.cs]

## Cloud Save Schema
### Player Data
- Save Key: "playerData"
- Structure: PlayerSaveData class
- Sync Frequency: On significant progress
[Source: CloudSaveManager.cs]

## Remote Config Parameters
{{parameter_documentation}}
[Source: RemoteConfigManager.cs]

## Privacy Compliance
- GDPR: Data deletion available
- CCPA: Opt-out supported
- Consent: Required before data collection
[Source: PrivacyManager.cs]
```

### 8. Testing and Validation

#### 8.1 Create Service Tests

Generate `Assets/Tests/PlayMode/CloudServicesTests.cs`:

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

public class CloudServicesTests
{
    [UnityTest]
    public IEnumerator Authentication_SignIn_Succeeds()
    {
        // Test authentication flow
        yield return null;
    }
    
    [UnityTest]
    public IEnumerator CloudSave_SaveAndLoad_WorksCorrectly()
    {
        // Test save/load functionality
        yield return null;
    }
    
    [UnityTest]
    public IEnumerator RemoteConfig_Fetch_AppliesSettings()
    {
        // Test remote config
        yield return null;
    }
}
```

#### 8.2 Validation Checklist

- [ ] Unity Services Core initialized
- [ ] Project linked to Unity Dashboard
- [ ] Authentication flow working
- [ ] Analytics events firing correctly
- [ ] Cloud Save syncing data
- [ ] Remote Config fetching values
- [ ] Privacy compliance implemented
- [ ] Error handling in place
- [ ] Offline mode fallbacks configured

### 9. Integration with BMAD Workflow

#### 9.1 Update Templates

Reference cloud services in architecture templates:
- Add to `game-architecture-systems-tmpl.yaml`
- Include in story templates where relevant
- Document in technical requirements

#### 9.2 Configuration Updates

Add to `config.yaml`:
```yaml
unityCloudServices:
  projectId: {{project_id}}
  organizationId: {{org_id}}
  environment: production
  services:
    - authentication
    - analytics
    - cloudSave
    - remoteConfig
```

### 10. Completion and Handoff

- Execute validation checklist
- Generate summary report:
  - Services configured
  - Scripts generated
  - Documentation created
  - Tests implemented
- Commit all service integration files
- Provide dashboard configuration steps:
  1. Visit Unity Dashboard
  2. Configure service settings
  3. Set up environments
  4. Create Remote Config parameters
  5. Review analytics dashboard

## Success Criteria

- Unity Services Core properly initialized
- Authentication system functional
- Analytics tracking game events
- Cloud Save persisting player data
- Remote Config updating game parameters
- Privacy compliance implemented
- Service managers follow singleton pattern
- Error handling and offline fallbacks in place
- Documentation comprehensive for AI agents
- Integration with BMAD workflows complete

## Notes

- Follows BMAD template processing patterns
- Uses `{{placeholders}}` and `[[LLM: instructions]]` format
- References `devLoadAlwaysFiles` for context
- Prepares foundation for game-architecture-systems template enhancement
- All services follow Unity best practices and BMAD standards
