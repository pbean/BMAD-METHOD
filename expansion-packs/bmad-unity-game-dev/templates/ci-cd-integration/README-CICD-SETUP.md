# Unity CI/CD Integration Templates

## Overview

This directory contains **optional** CI/CD pipeline templates for Unity projects using the BMAD Unity expansion pack. These templates are provided for users who want to set up automated testing and performance monitoring in their CI/CD pipelines.

## ⚠️ Important Notes

- **CI/CD integration is completely optional** - the Unity expansion pack works perfectly without any CI/CD setup
- **These are templates, not working implementations** - you need to customize them for your specific project
- **Enterprise features must be enabled** in your `config.yaml` to use advanced automation features

## Quick Start (Optional)

1. **Enable CI/CD templates** in your project's `config.yaml`:
   ```yaml
   enterpriseFeatures:
     enabled: true
     cicdIntegration: true
   
   cicdTemplates:
     enabled: true
     platforms: ["github"]  # or ["azure", "gitlab"]
   ```

2. **Copy the appropriate template** for your CI/CD platform
3. **Customize variables** marked with `{{VARIABLE_NAME}}`
4. **Follow platform-specific setup instructions**

## Available Templates

### GitHub Actions Templates
- **`github-actions-basic.yml.template`** - Basic Unity build and test
- **`github-actions-performance.yml.template`** - Advanced performance testing (requires enterprise features)

### Azure DevOps Templates  
- **`azure-devops-basic.yml.template`** - Basic Unity build pipeline
- **`azure-devops-performance.yml.template`** - Advanced performance testing

### GitLab CI Templates
- **`gitlab-ci-basic.yml.template`** - Basic Unity build and test
- **`gitlab-ci-performance.yml.template`** - Advanced performance testing

## Template Variables

All templates use placeholder variables that you need to replace:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{UNITY_VERSION}}` | Unity version for your project | `2022.3.10f1` |
| `{{PROJECT_NAME}}` | Your Unity project name | `MyAwesomeGame` |
| `{{TARGET_PLATFORMS}}` | Build platforms for your game | `[StandaloneWindows64, Android, iOS]` |
| `{{PERFORMANCE_ENABLED}}` | Enable performance testing | `true` or `false` |
| `{{SECRET_UNITY_LICENSE}}` | CI/CD secret name for Unity license | `UNITY_LICENSE` |

## Setup Instructions by Platform

### GitHub Actions Setup
1. Copy `github-actions-basic.yml.template` to `.github/workflows/unity-build.yml` in your project
2. Replace all `{{VARIABLE_NAME}}` placeholders with your values
3. Add Unity license to GitHub repository secrets
4. Enable GitHub Actions in your repository settings

[Detailed GitHub Actions setup instructions →](github-actions/setup-instructions.md)

### Azure DevOps Setup  
1. Copy `azure-devops-basic.yml.template` to `azure-pipelines.yml` in your project root
2. Replace all `{{VARIABLE_NAME}}` placeholders with your values
3. Configure Unity license in Azure DevOps variable groups
4. Create new pipeline using the YAML file

[Detailed Azure DevOps setup instructions →](azure-devops/setup-instructions.md)

### GitLab CI Setup
1. Copy `gitlab-ci-basic.yml.template` to `.gitlab-ci.yml` in your project root
2. Replace all `{{VARIABLE_NAME}}` placeholders with your values  
3. Add Unity license to GitLab CI/CD variables
4. Enable GitLab CI/CD in your project settings

[Detailed GitLab CI setup instructions →](gitlab-ci/setup-instructions.md)

## Enterprise Features Integration

### Performance Testing Templates

The advanced performance testing templates require:

1. **Enterprise features enabled** in `config.yaml`:
   ```yaml
   enterpriseFeatures:
     enabled: true
     profilerIntegration: true
     performanceMonitoring: true
   
   testingFramework:
     mode: "enterprise"
     performanceTesting: true
   ```

2. **Unity Profiler automation** scripts installed (automatically included with enterprise features)

3. **Performance thresholds configured** for your project requirements

### Unity Test Framework Integration

For automated testing with Unity Test Framework:

1. **Enable testing framework** in `config.yaml`:
   ```yaml
   testingFramework:
     mode: "automated"
     unityTestFramework: true
     automatedValidation: true
   ```

2. **Install Unity Test Framework package** in your Unity project
3. **Set up test assemblies** following Unity Test Framework documentation

## Template Customization Guide

### Basic Customization
1. **Replace all template variables** with your project-specific values
2. **Configure build targets** for your target platforms
3. **Set up secrets/variables** in your CI/CD platform
4. **Test with a simple commit** to verify pipeline works

### Advanced Customization
1. **Add custom build steps** specific to your project
2. **Configure performance thresholds** for your game requirements
3. **Set up artifact management** for builds and test results
4. **Integrate with external services** (Discord notifications, deployment systems)

## Troubleshooting

### Common Issues

**"Unity license not found"**
- Ensure Unity license is properly configured in CI/CD platform secrets/variables
- Check that secret name matches template variable

**"Build fails with package errors"**
- Verify Unity version in template matches your project
- Check that required packages are specified in project manifest

**"Performance tests fail"**
- Ensure enterprise features are enabled in config.yaml
- Verify Unity Profiler automation scripts are included in project
- Check performance thresholds are realistic for your hardware

**"Template variables not replaced"**
- Ensure all `{{VARIABLE_NAME}}` placeholders are replaced with actual values
- Check for typos in variable names

### Getting Help

1. **Check platform-specific setup instructions** in respective subdirectories
2. **Review BMAD Unity expansion pack documentation** for enterprise features
3. **Consult Unity CI/CD documentation** for platform-specific Unity integration
4. **Ask in BMAD community forums** for expansion pack specific questions

## Examples

### Simple Game Project Setup (GitHub Actions)
```yaml
# Copy github-actions-basic.yml.template and customize:
name: {{MyGameProject}} Build
env:
  UNITY_LICENSE: ${{ secrets.{{UNITY_LICENSE}} }}
  UNITY_VERSION: {{2022.3.10f1}}
# ... rest of template with variables replaced
```

### Enterprise Game Project (Azure DevOps)
```yaml
# Copy azure-devops-performance.yml.template and customize:
variables:
  unityVersion: '{{2022.3.10f1}}'
  performanceEnabled: {{true}}
  platforms: '[StandaloneWindows64, Android, iOS]'
# ... rest of template with variables replaced
```

---

**Remember**: CI/CD integration is completely optional. The Unity expansion pack provides full Unity development capabilities without any CI/CD setup required.