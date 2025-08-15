# Kiro Upgrade and Migration System

## Overview

This document summarizes the implementation of task 7.2 "Add upgrade and migration support" from the complete Kiro agent integration specification. The system provides comprehensive upgrade and migration capabilities for existing Kiro installations.

## Implemented Components

### 1. UpgradeMigrationManager (`upgrade-migration-manager.js`)

The core component that handles all upgrade and migration functionality:

#### Key Features:
- **Incomplete Installation Detection**: Analyzes current installation state and identifies missing components
- **Incremental Agent Conversion**: Converts only missing agents without affecting existing ones
- **Steering Workaround Migration**: Automatically migrates steering-based workarounds to native agents
- **User Customization Preservation**: Detects and preserves user customizations during upgrades
- **Complete Upgrade Process**: Orchestrates all upgrade phases in the correct order

#### Main Methods:
- `detectIncompleteInstallation()` - Analyzes current installation and identifies upgrade needs
- `performIncrementalConversion()` - Converts specific missing agents
- `migrateSteeringWorkarounds()` - Migrates steering workarounds to native agents
- `preserveUserCustomizations()` - Preserves user customizations with backup options
- `performCompleteUpgrade()` - Executes complete upgrade with all phases

### 2. KiroInstaller Integration

Enhanced the existing `KiroInstaller` class with upgrade capabilities:

#### New Methods:
- `detectAndUpgradeInstallation()` - Detects and performs upgrades during installation
- `performIncrementalAgentConversion()` - Wrapper for incremental conversion
- `migrateSteeringWorkarounds()` - Wrapper for steering migration
- `displayUpgradeAnalysis()` - User-friendly display of upgrade analysis
- `displayUpgradeResults()` - User-friendly display of upgrade results

#### Enhanced Installation Flow:
- Phase 0: Check for existing installation and upgrade if needed
- Continues with normal installation only if upgrade is not sufficient
- Preserves existing functionality while adding upgrade capabilities

### 3. KiroAdapter Integration

Extended the main `KiroAdapter` class with upgrade methods:

#### New Methods:
- `detectAndUpgradeInstallation()` - Detect and upgrade installations
- `performIncrementalConversion()` - Incremental agent conversion
- `migrateSteeringWorkarounds()` - Steering workaround migration
- `preserveUserCustomizations()` - User customization preservation
- `performCompleteUpgrade()` - Complete upgrade process
- `getUpgradeStatistics()` - Upgrade and migration statistics

### 4. Command Line Interface (`upgrade-cli.js`)

Comprehensive CLI tool for upgrade and migration operations:

#### Available Commands:
- `detect` - Detect incomplete installations and analyze upgrade needs
- `upgrade` - Perform complete upgrade with all migration features
- `convert [agents...]` - Convert specific missing agents incrementally
- `migrate` - Migrate steering-based workarounds to native agents
- `preserve` - Preserve user customizations during upgrade
- `status` - Show current installation status and statistics

#### Command Options:
- `--path <path>` - Specify project path
- `--verbose` - Enable verbose output
- `--force` - Force upgrade even if installation appears complete
- `--skip-existing` - Skip agents that already exist
- `--preserve-existing` - Backup existing agents before overwriting
- `--remove-workarounds` - Remove steering workarounds after migration
- `--dry-run` - Show what would be done without making changes

### 5. Comprehensive Testing (`test-upgrade-migration.js`)

Full test suite that validates all upgrade and migration functionality:

#### Test Coverage:
- Incomplete installation detection
- Incremental agent conversion
- Steering workaround migration
- User customization preservation
- Complete upgrade process
- Error handling and recovery

## Key Features Implemented

### 1. Detect Existing Incomplete Installations

The system can analyze existing Kiro installations and identify:
- Missing agents that should be converted
- Steering-based workarounds that can be migrated
- User customizations that need preservation
- Workspace structure issues
- Installation metadata and version information

### 2. Implement Incremental Conversion for Missing Agents

- Scans available BMad agents (core and expansion packs)
- Compares with currently installed agents
- Converts only missing agents to avoid disrupting existing setup
- Supports selective conversion of specific agents
- Preserves existing agents with backup options
- Handles conversion errors with retry mechanisms

### 3. Add Migration Tools for Existing Steering-Based Workarounds

- Detects steering files that contain agent-like instructions
- Analyzes complexity and migration feasibility
- Automatically converts simple workarounds to native agents
- Preserves complex workarounds that require manual review
- Creates backups of original steering files
- Provides migration reports and recommendations

### 4. Preserve User Customizations During Upgrades

- Scans for user-modified files and customizations
- Detects custom markers and modifications
- Creates backups of customized files
- Applies appropriate preservation strategies (merge, backup, preserve)
- Maintains user preferences and custom configurations
- Provides detailed preservation reports

## Usage Examples

### CLI Usage

```bash
# Detect upgrade needs
node upgrade-cli.js detect --path /path/to/project

# Perform complete upgrade
node upgrade-cli.js upgrade --path /path/to/project --verbose

# Convert specific agents
node upgrade-cli.js convert dev qa --path /path/to/project

# Migrate steering workarounds
node upgrade-cli.js migrate --path /path/to/project --remove-workarounds

# Check installation status
node upgrade-cli.js status --path /path/to/project
```

### Programmatic Usage

```javascript
const UpgradeMigrationManager = require('./upgrade-migration-manager');

const manager = new UpgradeMigrationManager({
  rootPath: '/path/to/project',
  verbose: true,
  preserveCustomizations: true,
  backupCustomizations: true
});

// Detect upgrade needs
const detection = await manager.detectIncompleteInstallation();

// Perform complete upgrade
const upgradeResult = await manager.performCompleteUpgrade({
  forceUpgrade: false,
  skipExisting: true,
  preserveExisting: true
});
```

## Error Handling and Recovery

The system includes comprehensive error handling:

- **Conversion Error Handler**: Handles agent conversion failures with recovery strategies
- **Incremental Retry**: Failed conversions can be retried individually
- **Fallback Mechanisms**: Multiple fallback strategies for different error types
- **Diagnostic Mode**: Detailed logging and diagnostics for troubleshooting
- **Backup and Recovery**: Automatic backups with rollback capabilities

## Integration with Existing System

The upgrade and migration system integrates seamlessly with existing components:

- **Agent Discovery**: Uses existing agent discovery for finding source agents
- **Agent Transformer**: Leverages existing transformation capabilities
- **Error Handling**: Integrates with existing error handling infrastructure
- **Validation**: Uses existing validation systems for verification
- **Logging**: Consistent logging with existing system patterns

## Requirements Satisfied

This implementation satisfies all requirements from task 7.2:

✅ **Detect existing incomplete installations and upgrade them**
- Comprehensive detection of incomplete installations
- Analysis of missing components and upgrade needs
- Automatic upgrade orchestration

✅ **Implement incremental conversion for missing agents**
- Selective conversion of missing agents only
- Preservation of existing agents
- Support for specific agent selection

✅ **Add migration tools for existing steering-based workarounds**
- Automatic detection of steering workarounds
- Migration to native agents where feasible
- Preservation of complex workarounds

✅ **Preserve user customizations during upgrades**
- Detection of user customizations
- Multiple preservation strategies
- Backup and recovery mechanisms

✅ **Requirements: 5.1, 5.2, 6.1**
- 5.1: Maintainable and extensible system design
- 5.2: Clear error reporting and actionable messages
- 6.1: Reliable agent activation system integration

## Testing Results

All tests pass successfully:
- ✅ Incomplete installation detection
- ✅ Incremental agent conversion
- ✅ Steering workaround migration
- ✅ User customization preservation
- ✅ Complete upgrade process

## Future Enhancements

Potential areas for future improvement:
- GUI interface for upgrade management
- Advanced merge strategies for complex customizations
- Integration with version control systems
- Automated upgrade scheduling
- Enhanced rollback capabilities
- Cloud-based backup and sync

## Conclusion

The upgrade and migration system provides a comprehensive solution for maintaining and upgrading Kiro installations. It handles the complexity of preserving user customizations while ensuring all BMad agents are properly converted and available in Kiro's native format. The system is designed to be reliable, extensible, and user-friendly, with both CLI and programmatic interfaces available.