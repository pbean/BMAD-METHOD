# GitHub Actions Setup Instructions for BMAD Unity

## Overview

This guide helps you set up GitHub Actions CI/CD for your Unity project using BMAD Unity expansion pack templates. Choose between basic build automation or advanced performance testing based on your needs.

## Prerequisites

### Required for All Setups

- Unity project using BMAD Unity expansion pack
- GitHub repository with Actions enabled
- Unity license (Personal, Plus, or Pro)

### Additional for Performance Testing

- Enterprise features enabled in your `config.yaml`
- Unity Profiler automation scripts installed
- Performance thresholds configured

## Quick Setup (Basic Build)

### Step 1: Enable GitHub Actions

1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Actions** in left sidebar
4. Select **Allow all actions and reusable workflows**

### Step 2: Add Unity License Secret

1. In your GitHub repository, go to **Settings > Secrets and variables > Actions**
2. Click **New repository secret**
3. Name: `UNITY_LICENSE`
4. Value: Your Unity license content (see [Unity License Guide](#unity-license-setup))
5. Click **Add secret**

### Step 3: Copy and Customize Template

1. Copy `unity-basic-build.yml.template` to `.github/workflows/unity-build.yml` in your project
2. Replace template variables:

```yaml
# Replace these template variables with your values:
name: MyAwesomeGame Unity Build # {{PROJECT_NAME}}

on:
  push:
    branches: [main, develop] # {{MAIN_BRANCH}}, {{DEVELOP_BRANCH}}
  pull_request:
    branches: [main] # {{MAIN_BRANCH}}

env:
  UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }} # {{SECRET_UNITY_LICENSE}}
  UNITY_VERSION: 2022.3.10f1 # {{UNITY_VERSION}}

jobs:
  build:
    strategy:
      matrix:
        targetPlatform:
          - StandaloneWindows64 # {{TARGET_PLATFORMS}}
          - Android
          - WebGL
```

### Step 4: Configure Additional Variables

Replace these variables in the template:

| Variable                      | Your Value             | Example                                      |
| ----------------------------- | ---------------------- | -------------------------------------------- |
| `{{PROJECT_NAME}}`            | Your game name         | `MyAwesomeGame`                              |
| `{{MAIN_BRANCH}}`             | Main branch name       | `main` or `master`                           |
| `{{DEVELOP_BRANCH}}`          | Development branch     | `develop`                                    |
| `{{UNITY_VERSION}}`           | Unity version          | `2022.3.10f1`                                |
| `{{TARGET_PLATFORMS}}`        | Build platforms        | `[StandaloneWindows64, Android, iOS, WebGL]` |
| `{{ENABLE_TESTING}}`          | Enable Unity tests     | `true` or `false`                            |
| `{{ENABLE_VALIDATION}}`       | Enable BMAD validation | `true` or `false`                            |
| `{{ARTIFACT_RETENTION_DAYS}}` | Keep builds for N days | `7`                                          |

### Step 5: Test Your Setup

1. Commit and push the workflow file
2. Go to **Actions** tab in GitHub
3. Watch your first build run
4. Check for any errors and adjust configuration

## Advanced Setup (Performance Testing)

### Step 1: Enable Enterprise Features

Update your project's `config.yaml`:

```yaml
enterpriseFeatures:
  enabled: true
  profilerIntegration: true
  performanceMonitoring: true
  cicdIntegration: true

testingFramework:
  mode: "enterprise"
  performanceTesting: true

cicdTemplates:
  enabled: true
  platforms: ["github"]
  performanceTesting: true
```

### Step 2: Configure Performance Thresholds

Create `performance-thresholds.json` in your project root:

```json
{
  "platforms": {
    "StandaloneWindows64": {
      "minFPS": 60,
      "maxFrameTime": 16.7,
      "maxMemoryMB": 512,
      "maxDrawCalls": 200
    },
    "Android": {
      "minFPS": 30,
      "maxFrameTime": 33.3,
      "maxMemoryMB": 256,
      "maxDrawCalls": 150
    },
    "iOS": {
      "minFPS": 60,
      "maxFrameTime": 16.7,
      "maxMemoryMB": 256,
      "maxDrawCalls": 150
    },
    "WebGL": {
      "minFPS": 30,
      "maxFrameTime": 33.3,
      "maxMemoryMB": 128,
      "maxDrawCalls": 100
    }
  }
}
```

### Step 3: Copy Performance Testing Template

1. Copy `unity-performance-testing.yml.template` to `.github/workflows/unity-performance.yml`
2. Replace all template variables with your values
3. Configure performance-specific variables:

| Variable                             | Description                | Example                         |
| ------------------------------------ | -------------------------- | ------------------------------- |
| `{{NIGHTLY_CRON}}`                   | Cron for nightly tests     | `'0 2 * * *'` (2 AM daily)      |
| `{{TEST_SCENES}}`                    | Scenes to performance test | `[MainMenu, Level1, BossLevel]` |
| `{{MIN_FPS}}`                        | Minimum acceptable FPS     | `30` or `60`                    |
| `{{MAX_FRAME_TIME}}`                 | Max frame time (ms)        | `33.3` (for 30fps)              |
| `{{MAX_MEMORY}}`                     | Max memory usage (MB)      | `256`                           |
| `{{MAX_DRAW_CALLS}}`                 | Max draw calls per frame   | `150`                           |
| `{{FAIL_ON_PERFORMANCE_REGRESSION}}` | Block PRs on regression    | `true` or `false`               |

### Step 4: Set Up Performance Methods

Ensure these Unity methods exist in your project:

```csharp
// Performance testing entry point
public static class BMADPerformanceTesting
{
    public static void RunCIPerformanceTests()
    {
        // Your performance testing implementation
        // This should integrate with BMAD Unity Profiler automation
    }

    public static void AnalyzePerformanceRegression()
    {
        // Your regression analysis implementation
    }
}
```

## Unity License Setup

### Getting Your Unity License

#### For Unity Personal (Free)

1. Open Unity Hub
2. Go to **Preferences > License Management**
3. Click **Activate New License**
4. Choose **Unity Personal**
5. Copy the license content from `~/.config/unity3d/Unity/Unity_lic.ulf` (Linux/Mac) or `%PROGRAMDATA%\Unity\Unity_lic.ulf` (Windows)

#### For Unity Plus/Pro

1. Log into Unity Dashboard
2. Go to **Organizations > [Your Organization] > Licenses**
3. Download the license file
4. Copy the license file content

### Adding License to GitHub

1. Copy the entire license file content
2. Go to GitHub repository **Settings > Secrets and variables > Actions**
3. Click **New repository secret**
4. Name: `UNITY_LICENSE`
5. Paste the license content as the value
6. Click **Add secret**

## Workflow Configuration Examples

### Basic 2D Game

```yaml
env:
  UNITY_VERSION: 2022.3.10f1

jobs:
  build:
    strategy:
      matrix:
        targetPlatform:
          - StandaloneWindows64
          - Android
          - WebGL
```

### Mobile-First 3D Game

```yaml
env:
  UNITY_VERSION: 2022.3.10f1

jobs:
  build:
    strategy:
      matrix:
        targetPlatform:
          - Android
          - iOS
        include:
          - targetPlatform: Android
            buildScript: BuildAndroid
          - targetPlatform: iOS
            buildScript: BuildiOS
```

### Cross-Platform AAA Game

```yaml
env:
  UNITY_VERSION: 2022.3.10f1

jobs:
  build:
    strategy:
      matrix:
        targetPlatform:
          - StandaloneWindows64
          - StandaloneOSX
          - StandaloneLinux64
          - Android
          - iOS
          - PS4
          - XboxOne
          - Nintendo Switch
```

## Performance Testing Configuration

### Desktop Game Thresholds

```json
{
  "StandaloneWindows64": {
    "minFPS": 60,
    "maxFrameTime": 16.7,
    "maxMemoryMB": 1024,
    "maxDrawCalls": 300
  }
}
```

### Mobile Game Thresholds

```json
{
  "Android": {
    "minFPS": 30,
    "maxFrameTime": 33.3,
    "maxMemoryMB": 256,
    "maxDrawCalls": 150
  },
  "iOS": {
    "minFPS": 60,
    "maxFrameTime": 16.7,
    "maxMemoryMB": 256,
    "maxDrawCalls": 150
  }
}
```

## Troubleshooting

### Common Issues

**"Unity license error"**

- Check license is correctly copied to GitHub secrets
- Ensure license secret name matches template variable
- Verify license is not expired

**"Build fails with package errors"**

- Check Unity version matches your project
- Verify required packages are in project manifest
- Check package registry accessibility

**"Performance tests not running"**

- Ensure enterprise features are enabled in config.yaml
- Verify Unity Profiler automation scripts are included
- Check performance test method names match template

**"Artifacts not uploading"**

- Check build output paths are correct
- Verify artifact names don't contain invalid characters
- Ensure retention days are within GitHub limits

### Debug Steps

1. **Check workflow syntax**:

   ```bash
   # Use GitHub Actions extension in VS Code or
   # Validate YAML online
   ```

2. **Review build logs**:

   - Go to Actions tab in GitHub
   - Click on failed workflow
   - Expand each step to see detailed logs

3. **Test locally**:

   ```bash
   # Use act to test GitHub Actions locally
   npm install -g @nektos/act
   act push
   ```

4. **Verify Unity setup**:
   - Ensure Unity project opens without errors
   - Test builds manually first
   - Verify all required packages are installed

## Best Practices

### Workflow Organization

- Use descriptive workflow and job names
- Add comments explaining complex configurations
- Use matrix builds for multiple platforms
- Cache Unity Library folder for faster builds

### Performance Testing

- Start with conservative thresholds and adjust based on data
- Use nightly performance tests for trend analysis
- Set up notifications for performance regressions
- Monitor performance across all target platforms

### Security

- Never commit Unity license to repository
- Use GitHub secrets for all sensitive data
- Limit workflow permissions to minimum required
- Regularly rotate access tokens and licenses

### Optimization

- Use build caching to reduce build times
- Run performance tests only on main branches for PRs
- Parallelize builds across different platforms
- Use conditional workflows to avoid unnecessary runs

---

**Need Help?**

- Check [BMAD Unity documentation](../../README.md)
- Review [GitHub Actions documentation](https://docs.github.com/en/actions)
- Ask in BMAD community forums for expansion pack questions
