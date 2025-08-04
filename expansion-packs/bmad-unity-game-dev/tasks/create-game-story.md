# Create Game Story Task

## Purpose

To identify the next logical game story based on project progress and epic definitions, and then to prepare a comprehensive, self-contained, and actionable story file using the `Game Story Template`. This task ensures the story is enriched with all necessary technical context, Unity-specific requirements, and acceptance criteria, making it ready for efficient implementation by a Game Developer Agent with minimal need for additional research or finding its own context.

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Load Core Configuration and Check Workflow

- Load `{root}/core-config.yaml` from the project root
- If the file does not exist, HALT and inform the user: "core-config.yaml not found. This file is required for story creation. You can either: 1) Copy core-config.yaml from GITHUB bmad-core/ and configure it for your game project OR 2) Run the BMad installer against your project to upgrade and add the file automatically. Please add and configure before proceeding."
- Extract key configurations: `devStoryLocation`, `gdd.*`, `gamearchitecture.*`, `workflow.*`, `gameDimension`

### 1. Determine Project Dimension

- Load the Game Design Document (`{{gdd.gddFile}}` from `core-config.yaml`).
- If the key configuration `gameDimension` from core-config.yaml does not exist then search for the **Dimension:** field in the document
- Set a variable `projectDimension` to "2D" or "3D" based on the value found.
- If the dimension is not found, HALT and inform the user: "Project dimension (2D or 3D) not found in the GDD or core-config.yaml. Please update the core-config.yaml with the 'gameDimeons' field and GDD with the 'Dimension:' field for fallback."

### 2. Identify Next Story for Preparation

#### 2.1 Locate Epic Files and Review Existing Stories

- Based on `gddSharded` from config, locate epic files (sharded location/pattern or monolithic GDD sections)
- If `devStoryLocation` has story files, load the highest `{epicNum}.{storyNum}.story.md` file
- **If highest story exists:**
  - Verify status is 'Done'. If not, alert user: "ALERT: Found incomplete story! File: {lastEpicNum}.{lastStoryNum}.story.md Status: [current status] You should fix this story first, but would you like to accept risk & override to create the next story in draft?"
  - If proceeding, select next sequential story in the current epic
  - If epic is complete, prompt user: "Epic {epicNum} Complete: All stories in Epic {epicNum} have been completed. Would you like to: 1) Begin Epic {epicNum + 1} with story 1 2) Select a specific story to work on 3) Cancel story creation"
  - **CRITICAL**: NEVER automatically skip to another epic. User MUST explicitly instruct which story to create.
- **If no story files exist:** The next story is ALWAYS 1.1 (first story of first epic)
- Announce the identified story to the user: "Identified next story for preparation: {epicNum}.{storyNum} - {Story Title}"

### 3. Gather Story Requirements and Previous Story Context

- Extract story requirements from the identified epic file or GDD section
- If previous story exists, review Dev Agent Record sections for:
  - Completion Notes and Debug Log References
  - Implementation deviations and technical decisions
  - Unity-specific challenges (prefab issues, scene management, performance)
  - Asset pipeline decisions and optimizations
- Extract relevant insights that inform the current story's preparation

### 4. Gather Architecture Context

#### 4.1 Determine Architecture Reading Strategy

- **If `gamearchitectureVersion: >= v3` and `gamearchitectureSharded: true`**: Read `{gamearchitectureShardedLocation}/index.md` then follow structured reading order below
- **Else**: Use monolithic `gamearchitectureFile` for similar sections

#### 4.2 Read Architecture Documents Based on Story Type

**For ALL Game Stories:** tech-stack.md, unity-project-structure.md, coding-standards.md, testing-resilience-architecture.md

**If `projectDimension` is "2D":**
- **For Gameplay/Mechanics Stories, additionally:** gameplay-systems-architecture.md, component-architecture-details.md, physics-config.md, input-system.md, state-machines.md, game-data-models.md
- **For Graphics/Rendering Stories, additionally:** rendering-pipeline.md, sprite-management.md, particle-systems.md, shader-guidelines.md, lighting-strategy.md, vfx-pipelines.md

**If `projectDimension` is "3D":**
- **For Gameplay/Mechanics Stories, additionally:** gameplay-systems-architecture.md, component-architecture-details.md, physics-config-3d.md, input-system.md, state-machines.md, game-data-models.md
- **For Graphics/Rendering Stories, additionally:** rendering-pipeline-3d.md, sprite-management.md, particle-systems.md, shader-guidelines.md, lighting-strategy.md, vfx-pipelines.md

**For UI/UX Stories (both 2D/3D), additionally:** ui-architecture.md, ui-components.md, ui-state-management.md, scene-management.md

**For Audio Stories (both 2D/3D), additionally:** audio-architecture.md, audio-mixing.md, sound-banks.md

**For Backend/Services Stories, additionally:** game-data-models.md, data-persistence.md, save-system.md, analytics-integration.md, multiplayer-architecture.md

#### 4.3 Extract Story-Specific Technical Details

Extract ONLY information directly relevant to implementing the current story. Do NOT invent new patterns, systems, or standards not in the source documents.

Extract:
- Specific Unity components and MonoBehaviours the story will use
- Unity Package Manager dependencies and their APIs (e.g., Cinemachine, Input System, URP/HDRP)
- Package-specific configurations and setup requirements
- Prefab structures and scene organization requirements
- Input system bindings and configurations
- Physics settings and collision layers
- UI canvas and layout specifications
- Asset naming conventions and folder structures
- Performance budgets (target FPS, memory limits, draw calls)
- Platform-specific considerations (mobile vs desktop)
- Testing requirements specific to Unity features

ALWAYS cite source documents: `[Source: gamearchitecture/{filename}.md#{section}]`

### 5. Unity-Specific Technical Analysis

#### 5.1 Package Dependencies Analysis

- Identify Unity Package Manager packages required for the story
- Document package versions from manifest.json
- Note any package-specific APIs or components being used
- List package configuration requirements (e.g., Input System settings, URP/HDRP asset config)
- Identify any third-party Asset Store packages and their integration points

#### 5.2 Scene and Prefab Planning

- Identify which scenes will be modified or created
- List prefabs that need to be created or updated
- Document prefab variant requirements
- Specify scene loading/unloading requirements

#### 5.3 Component Architecture

- Define MonoBehaviour scripts needed
- Specify ScriptableObject assets required
- Document component dependencies and execution order
- Identify required Unity Events and UnityActions
- Note any package-specific components (e.g., Cinemachine VirtualCamera, InputActionAsset)

#### 5.4 Asset Requirements

- **If `projectDimension` is "2D":**
  - List sprite/texture requirements with resolution specs.
  - Define animation clips and animator controllers needed.
- **If `projectDimension` is "3D":**
  - List 3D model requirements (poly count, format).
  - List texture requirements (resolution, PBR maps).
  - Define rigging and animation requirements.
  - **If asset is a sprite**
    - List sprite/texture requirements with resolution specs.
    - Define animation clips and animator controllers needed.
- Specify audio clips and their import settings.
- Document any shader or material requirements.
- Note any package-specific assets (e.g., URP/HDRP materials, Input Action maps)

### 6. Populate Story Template with Full Context

- Create new story file: `{devStoryLocation}/{epicNum}.{storyNum}.story.md` using Game Story Template
- Fill in basic story information: Title, Status (Draft), Story statement, Acceptance Criteria from Epic/GDD
- **`Dev Notes` section (CRITICAL):**
  - CRITICAL: This section MUST contain ONLY information extracted from gamearchitecture documents and GDD. NEVER invent or assume technical details.
  - Include ALL relevant technical details from Steps 3-5, organized by category:
    - **Previous Story Insights**: Key learnings from previous story implementation
    - **Package Dependencies**: Unity packages required, versions, configurations [with source references]
    - **Unity Components**: Specific MonoBehaviours, ScriptableObjects, systems [with source references]
    - **Scene & Prefab Specs**: Scene modifications, prefab structures, variants [with source references]
    - **Input Configuration**: Input actions, bindings, control schemes [with source references]
    - **UI Implementation**: Canvas setup, layout groups, UI events [with source references]
    - **Asset Pipeline**: Asset requirements, import settings, optimization notes
    - **Performance Targets**: FPS targets, memory budgets, profiler metrics
    - **Platform Considerations**: Mobile vs desktop differences, input variations
    - **Testing Requirements**: PlayMode tests, Unity Test Framework specifics
  - Every technical detail MUST include its source reference: `[Source: gamearchitecture/{filename}.md#{section}]`
  - If information for a category is not found in the gamearchitecture docs, explicitly state: "No specific guidance found in gamearchitecture docs"
- **`Tasks / Subtasks` section:**
  - Generate detailed, sequential list of technical tasks based ONLY on: Epic/GDD Requirements, Story AC, Reviewed GameArchitecture Information
  - Include Unity-specific tasks:
    - Scene setup and configuration
    - Prefab creation and testing
    - Component implementation with proper lifecycle methods
    - Input system integration
    - Physics configuration
    - UI implementation with proper anchoring
    - Performance profiling checkpoints
  - Each task must reference relevant gamearchitecture documentation
  - Include PlayMode testing as explicit subtasks
  - Link tasks to ACs where applicable (e.g., `Task 1 (AC: 1, 3)`)
- Add notes on Unity project structure alignment or discrepancies found in Step 5

### 7. Story Draft Completion and Review

- Review all sections for completeness and accuracy
- Verify all source references are included for technical details
- Ensure Unity-specific requirements are comprehensive:
  - All scenes and prefabs documented
  - Component dependencies clear
  - Asset requirements specified
  - Performance targets defined
- Update status to "Draft" and save the story file
- If `projectDimension` is "2D", execute `{root}/tasks/execute-checklist` `{root}/checklists/game-story-dod-checklist-2d.md`.
- If `projectDimension` is "3D", execute `{root}/tasks/execute-checklist` `{root}/checklists/game-story-dod-checklist-3d.md`.
- Provide summary to user including:
  - Story created: `{devStoryLocation}/{epicNum}.{storyNum}.story.md`
  - Status: Draft
  - Key Unity components and systems included
  - Scene/prefab modifications required
  - Asset requirements identified
  - Any deviations or conflicts noted between GDD and gamearchitecture
  - Checklist Results
  - Next steps: For complex Unity features, suggest the user review the story draft and optionally test critical assumptions in Unity Editor

### 8. Unity-Specific Validation

Before finalizing, ensure:
- [ ] All required Unity packages are documented with versions
- [ ] Package-specific APIs and configurations are included
- [ ] All MonoBehaviour lifecycle methods are considered
- [ ] Prefab workflows are clearly defined
- [ ] Scene management approach is specified
- [ ] Input system integration is complete (legacy or new Input System)
- [ ] UI canvas setup follows Unity best practices
- [ ] Performance profiling points are identified
- [ ] Asset import settings are documented
- [ ] Platform-specific code paths are noted
- [ ] Package compatibility is verified (e.g., URP/HDRP vs Built-in pipeline)

This task ensures game development stories are immediately actionable and enable efficient AI-driven development of Unity 2D and 3D game features.
