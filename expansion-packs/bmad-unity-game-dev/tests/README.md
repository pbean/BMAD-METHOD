# Unity Test Framework Implementation

This directory contains Unity Test Framework implementations for the BMAD Unity Game Development Expansion Pack.

## Directory Structure

- `EditMode/` - Tests that run in Unity Editor without entering Play mode
- `PlayMode/` - Tests that run during Unity Play mode (runtime tests)
- `AssemblyDefinitions/` - Unity assembly definition files for test organization

## Test Coverage Goals

- Minimum 70% code coverage across all Unity components
- EditMode tests for editor scripts and validation logic
- PlayMode tests for runtime behavior and integration testing

## Running Tests

1. Open Unity Test Runner window: Window > General > Test Runner
2. Select EditMode or PlayMode tab
3. Click "Run All" to execute test suites
4. View results and coverage reports

## Implementation Status

**Current**: 0% test coverage (infrastructure only)
**Target**: 70% minimum test coverage for production deployment