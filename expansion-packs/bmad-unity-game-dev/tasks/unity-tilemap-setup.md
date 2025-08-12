# Unity Tilemap Setup Task

## Purpose

To implement a comprehensive Unity 2D Tilemap system for efficient level design workflows. This task establishes the complete Tilemap infrastructure including tile palettes, rule tiles, colliders, procedural generation, and performance optimization for mobile platforms. The system supports both traditional grid-based and isometric level design patterns.

## Dependencies

- `unity-package-setup` - Unity Package Manager must be configured with 2D packages
- Unity 2D Packages:
  - `com.unity.2d.tilemap` (Tilemap system)
  - `com.unity.2d.tilemap.extras` (Rule tiles and animated tiles)
  - `com.unity.2d.sprite` (Sprite Editor)
  - `com.unity.2d.pixel-perfect` (Pixel Perfect Camera)

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 0. Load Core Configuration and Validate Unity 2D Project

- Load `{root}/config.yaml` from the expansion pack directory
- If the file does not exist, HALT and inform the user: "config.yaml not found in expansion pack. This file is required for Unity Tilemap setup."
- Verify `gameDimension: 2D` is set. If set to 3D, warn user: "This task is optimized for 2D projects. Consider using unity-3d-environment-setup for 3D projects."
- Verify Unity project structure exists:
  - Check for `Assets/` directory
  - Check for `ProjectSettings/` directory
  - Verify 2D Tilemap packages are installed via Package Manager
- If missing packages, refer user to `unity-package-setup` task first

### 1. Analyze Current Tilemap State

#### 1.1 Survey Existing Tilemap Assets

- Scan `Assets/` for existing Tilemap-related assets:
  - **Tilemaps**: Search for `.prefab` files containing Tilemap components
  - **Tile Assets**: Find `.asset` files in tile collections
  - **Tile Palettes**: Locate palette files in `Assets/Palettes/`
  - **Sprite Atlases**: Check for tileset texture atlases
  - **Rule Tiles**: Search for Rule Tile assets (`.asset` files)
- Document current tilemap architecture if any exists
- Note any existing tile naming conventions

#### 1.2 Examine Game Architecture Requirements

[[LLM: Analyze the game architecture documents to determine specific tilemap requirements. Look for level design patterns, art style specifications, and performance requirements. Adapt the following setup to match the game's genre and technical constraints.]]

- If `gamearchitectureSharded: true`:
  - Read `{gamearchitectureShardedLocation}/index.md` to find relevant files
  - Look for files like `*level-design*.md`, `*art-style*.md`, `*technical*.md`
  - Extract tilemap requirements from these documents
- Else: Extract tilemap specs from monolithic architecture file
- Document required:
  - **Art Style**: Pixel art, hand-drawn, minimalist, etc.
  - **Level Types**: Platformer, top-down, side-scrolling, etc.
  - **Performance Targets**: Mobile, desktop, specific FPS requirements
  - **World Scale**: Level size, number of levels, tilemap complexity

### 2. Design Tilemap Architecture

#### 2.1 Define Tilemap Layer System

Create a standardized layer hierarchy for consistent level design:

**Background Layers** (Sorting Order: -100 to -1):

- **Background Far** (-100): Distant background elements, parallax layers
- **Background Mid** (-50): Mid-ground decorative elements
- **Background Near** (-10): Close background details

**Gameplay Layers** (Sorting Order: 0 to 100):

- **Ground Base** (0): Primary ground tiles, platforms
- **Ground Details** (10): Ground decorations, surface details
- **Interactive Objects** (20): Collectibles, switches, moving platforms
- **Collision Layer** (25): Invisible collision tiles for complex shapes

**Foreground Layers** (Sorting Order: 101 to 200):

- **Foreground Details** (150): Vegetation, posts, decorative elements
- **Foreground Cover** (200): Elements that can hide the player

#### 2.2 Establish Tile Categories and Naming Convention

**Tile Category Structure**:

```
Tiles/
├── Environment/
│   ├── Ground/         # Basic ground tiles
│   ├── Platforms/      # Jumping platforms
│   ├── Walls/          # Vertical surfaces
│   └── Decorative/     # Non-collision decorations
├── Interactive/
│   ├── Collectibles/   # Coins, gems, power-ups
│   ├── Mechanisms/     # Switches, doors, elevators
│   └── Hazards/        # Spikes, fire, moving dangers
├── Backgrounds/
│   ├── Sky/            # Sky, clouds, distant elements
│   ├── Buildings/      # Background structures
│   └── Nature/         # Trees, mountains, landscapes
└── Special/
    ├── Animated/       # Water, fire, moving elements
    ├── RuleTiles/      # Auto-tiling smart tiles
    └── Procedural/     # Tiles for procedural generation
```

**Naming Convention**:

- Tiles: `{Category}_{Type}_{Variant}` (e.g., `Ground_Grass_01`, `Platform_Stone_Corner`)
- Palettes: `{Theme}_{Purpose}` (e.g., `Forest_Environment`, `Castle_Interactive`)
- Rule Tiles: `{Type}_RuleTile` (e.g., `Ground_RuleTile`, `Water_RuleTile`)

### 3. Create Core Tilemap Infrastructure

#### 3.1 Set Up Tilemap Grid System

Create the foundational grid and tilemap structure:

**1. Create Master Grid GameObject**:

```csharp
// Grid configuration for pixel-perfect rendering
GameObject gridObject = new GameObject("Level_Grid");
Grid grid = gridObject.AddComponent<Grid>();
grid.cellSize = new Vector3(1f, 1f, 0f); // Adjust based on art style
grid.cellGap = Vector3.zero;
grid.cellLayout = GridLayout.CellLayout.Rectangle;
grid.cellSwizzle = GridLayout.CellSwizzle.XYZ;
```

**2. Create Tilemap Layer Hierarchy**:
For each layer defined in section 2.1, create:

```csharp
// Example for Ground Base layer
GameObject tilemapObject = new GameObject("Ground_Base");
tilemapObject.transform.SetParent(gridObject.transform);

Tilemap tilemap = tilemapObject.AddComponent<Tilemap>();
TilemapRenderer renderer = tilemapObject.AddComponent<TilemapRenderer>();

// Configure renderer
renderer.sortingLayerName = "Default";
renderer.sortingOrder = 0; // Set according to layer hierarchy
renderer.material = GetMaterialForLayer("Ground"); // Assign appropriate material
```

#### 3.2 Configure Tilemap Physics and Colliders

**1. Set Up Tilemap Colliders**:

```csharp
// For collision layers (Ground, Platforms, Walls)
TilemapCollider2D tilemapCollider = tilemapObject.AddComponent<TilemapCollider2D>();
tilemapCollider.usedByComposite = true;

// Add Composite Collider for optimization
CompositeCollider2D compositeCollider = tilemapObject.AddComponent<CompositeCollider2D>();
compositeCollider.geometryType = CompositeCollider2D.GeometryType.Polygons;
compositeCollider.generationType = CompositeCollider2D.GenerationType.Synchronous;

Rigidbody2D rb = tilemapObject.AddComponent<Rigidbody2D>();
rb.bodyType = RigidbodyType2D.Static;
```

**2. Configure Physics Materials**:
Create physics materials for different surface types:

- `GroundMaterial`: Standard ground friction
- `IceMaterial`: Low friction for sliding
- `BouncyMaterial`: High bounciness for trampolines
- `OneWayMaterial`: For one-way platforms

#### 3.3 Create Tile Palette System

**1. Generate Tile Palettes**:
For each tilemap theme, create organized palettes:

```
Assets/
├── Palettes/
│   ├── Environment/
│   │   ├── Forest_Environment.prefab
│   │   ├── Desert_Environment.prefab
│   │   └── Castle_Environment.prefab
│   ├── Interactive/
│   │   ├── Collectibles_Standard.prefab
│   │   └── Mechanisms_Basic.prefab
│   └── Backgrounds/
│       ├── Sky_Day.prefab
│       ├── Sky_Night.prefab
│       └── Buildings_Medieval.prefab
```

**2. Organize Palette Layout**:
Arrange tiles in logical groups within each palette:

- **Top Row**: Most commonly used tiles
- **Grouped Sections**: Related tiles together (corners, edges, centers)
- **Variants**: Different versions of the same tile type
- **Special Tiles**: Animated and rule tiles at the bottom

### 4. Implement Advanced Tilemap Features

#### 4.1 Set Up Rule Tiles System

**1. Create Base Rule Tile Template**:

```csharp
// Example Rule Tile configuration for auto-tiling ground
// This creates seamless connections between ground tiles
[CreateAssetMenu(fileName = "New Rule Tile", menuName = "2D/Tiles/Rule Tile")]
public class GroundRuleTile : RuleTile<GroundRuleTile.Neighbor>
{
    public class Neighbor : RuleTile.TilingRule.Neighbor
    {
        public const int Ground = 1;
        public const int NotGround = 2;
    }

    public override bool RuleMatch(int neighbor, TileBase tile)
    {
        switch (neighbor)
        {
            case Neighbor.Ground: return tile == this;
            case Neighbor.NotGround: return tile != this;
        }
        return base.RuleMatch(neighbor, tile);
    }
}
```

**2. Configure Common Rule Tile Patterns**:

- **Ground Auto-Tiles**: Seamless ground connections
- **Platform Auto-Tiles**: Platform edges and corners
- **Water Auto-Tiles**: Animated water with shore transitions
- **Wall Auto-Tiles**: Vertical wall connections

#### 4.2 Implement Animated Tiles

**1. Create Animated Tile Assets**:

```csharp
// Example animated water tile
[CreateAssetMenu(fileName = "Animated Water", menuName = "2D/Tiles/Animated Tile")]
public class AnimatedWaterTile : AnimatedTile
{
    public void ConfigureWaterAnimation()
    {
        m_MinSpeed = 0.5f;
        m_MaxSpeed = 1.5f;
        m_AnimationStartFrame = 0;
        // Configure sprite array for water animation frames
    }
}
```

**2. Set Up Animation Categories**:

- **Water Tiles**: Flowing water, waterfalls
- **Fire Tiles**: Torch flames, lava
- **Nature Tiles**: Swaying grass, moving leaves
- **Mechanical Tiles**: Rotating gears, blinking lights

#### 4.3 Configure Tile Metadata System

**1. Create Tile Properties Script**:

```csharp
[System.Serializable]
public class TileProperties
{
    [Header("Gameplay Properties")]
    public bool isCollectible = false;
    public bool isDamaging = false;
    public bool isOneWayPlatform = false;
    public float movementSpeed = 1f;

    [Header("Audio Properties")]
    public AudioClip stepSound;
    public AudioClip impactSound;

    [Header("Visual Properties")]
    public bool castsShadows = true;
    public ParticleSystem stepParticles;

    [Header("Interaction Properties")]
    public UnityEvent onPlayerEnter;
    public UnityEvent onPlayerExit;
}
```

**2. Implement Tile Detection System**:

```csharp
public class TilePropertyDetector : MonoBehaviour
{
    private Tilemap tilemap;

    public TileProperties GetTileProperties(Vector3 worldPosition)
    {
        Vector3Int cellPosition = tilemap.WorldToCell(worldPosition);
        TileBase tile = tilemap.GetTile(cellPosition);

        if (tile is IPropertyTile propertyTile)
        {
            return propertyTile.GetProperties();
        }

        return null;
    }
}
```

### 5. Implement Procedural Tilemap Generation

#### 5.1 Create Procedural Generation Framework

**1. Define Generation Rules**:

```csharp
[System.Serializable]
public class GenerationRule
{
    public string ruleName;
    public TileBase[] possibleTiles;
    public float[] tileProbabilities;
    public Vector2Int areaSize;
    public GenerationPattern pattern;
}

public enum GenerationPattern
{
    Random,
    Perlin,
    Cellular,
    Maze,
    Platformer
}
```

**2. Implement Generation Algorithms**:

- **Perlin Noise**: For organic terrain generation
- **Cellular Automata**: For cave and dungeon generation
- **Wave Function Collapse**: For complex pattern generation
- **Rule-Based**: For structured level generation

#### 5.2 Create Chunk-Based Loading System

**1. Define Chunk Architecture**:

```csharp
[System.Serializable]
public class TilemapChunk
{
    public Vector2Int chunkCoordinate;
    public Vector2Int chunkSize = new Vector2Int(32, 32);
    public TileBase[,] tileData;
    public bool isLoaded = false;
    public bool isDirty = false;

    public void LoadChunk(Tilemap tilemap)
    {
        // Load tile data into tilemap
        BoundsInt area = new BoundsInt(
            chunkCoordinate.x * chunkSize.x,
            chunkCoordinate.y * chunkSize.y,
            0,
            chunkSize.x,
            chunkSize.y,
            1
        );

        tilemap.SetTilesBlock(area, GetTileArray());
        isLoaded = true;
    }

    public void UnloadChunk(Tilemap tilemap)
    {
        // Clear tiles from tilemap but keep data
        BoundsInt area = new BoundsInt(
            chunkCoordinate.x * chunkSize.x,
            chunkCoordinate.y * chunkSize.y,
            0,
            chunkSize.x,
            chunkSize.y,
            1
        );

        TileBase[] emptyTiles = new TileBase[chunkSize.x * chunkSize.y];
        tilemap.SetTilesBlock(area, emptyTiles);
        isLoaded = false;
    }
}
```

**2. Implement Streaming Manager**:

```csharp
public class TilemapStreamingManager : MonoBehaviour
{
    [Header("Streaming Configuration")]
    public int loadRadius = 2; // Chunks to keep loaded around player
    public int unloadRadius = 4; // Distance to unload chunks

    private Dictionary<Vector2Int, TilemapChunk> chunks = new Dictionary<Vector2Int, TilemapChunk>();
    private Vector2Int lastPlayerChunk = Vector2Int.zero;

    public void UpdateStreaming(Vector3 playerPosition)
    {
        Vector2Int currentChunk = WorldToChunkCoordinate(playerPosition);

        if (currentChunk != lastPlayerChunk)
        {
            LoadChunksAroundPosition(currentChunk);
            UnloadDistantChunks(currentChunk);
            lastPlayerChunk = currentChunk;
        }
    }
}
```

### 6. Optimize for Mobile Performance

#### 6.1 Implement Tilemap Optimization

**1. Configure Sprite Atlas Settings**:

```csharp
// Optimal sprite atlas configuration for mobile
[System.Serializable]
public class TilemapAtlasSettings
{
    public int maxAtlasSize = 2048; // Mobile-friendly size
    public TextureFormat textureFormat = TextureFormat.RGBA32;
    public bool crunchedCompression = true;
    public int compressionQuality = 50;
    public bool generateMipMaps = false; // Usually not needed for 2D
    public FilterMode filterMode = FilterMode.Point; // For pixel art
}
```

**2. Set Up Tilemap Culling**:

```csharp
public class TilemapCulling : MonoBehaviour
{
    private Camera mainCamera;
    private Tilemap[] tilemaps;

    void Update()
    {
        Bounds cameraBounds = GetCameraBounds();

        foreach (Tilemap tilemap in tilemaps)
        {
            // Cull tiles outside camera view
            BoundsInt visibleArea = GetVisibleTileArea(cameraBounds, tilemap);
            CullTilesOutsideArea(tilemap, visibleArea);
        }
    }

    private void CullTilesOutsideArea(Tilemap tilemap, BoundsInt visibleArea)
    {
        // Implementation for efficient tile culling
        tilemap.CompressBounds(); // Optimize tilemap bounds
    }
}
```

#### 6.2 Configure Memory Management

**1. Implement Tile Pooling**:

```csharp
public class TilePool : MonoBehaviour
{
    private Dictionary<TileBase, Queue<GameObject>> pooledTiles = new Dictionary<TileBase, Queue<GameObject>>();

    public GameObject GetPooledTile(TileBase tileType)
    {
        if (pooledTiles.ContainsKey(tileType) && pooledTiles[tileType].Count > 0)
        {
            return pooledTiles[tileType].Dequeue();
        }

        // Create new tile if pool is empty
        return CreateNewTile(tileType);
    }

    public void ReturnTileToPool(TileBase tileType, GameObject tileObject)
    {
        if (!pooledTiles.ContainsKey(tileType))
        {
            pooledTiles[tileType] = new Queue<GameObject>();
        }

        tileObject.SetActive(false);
        pooledTiles[tileType].Enqueue(tileObject);
    }
}
```

**2. Set Up Memory Monitoring**:

```csharp
public class TilemapMemoryMonitor : MonoBehaviour
{
    [Header("Memory Thresholds")]
    public int maxTileMemoryMB = 100;
    public int maxTextureMemoryMB = 200;

    void Update()
    {
        if (Application.isEditor) return;

        CheckMemoryUsage();
    }

    private void CheckMemoryUsage()
    {
        long totalMemory = System.GC.GetTotalMemory(false);

        if (totalMemory > maxTileMemoryMB * 1024 * 1024)
        {
            // Trigger memory cleanup
            UnloadUnusedTiles();
            System.GC.Collect();
        }
    }
}
```

### 7. Create Isometric Tilemap Support

#### 7.1 Configure Isometric Grid

**1. Set Up Isometric Grid Settings**:

```csharp
// Configure Grid for isometric rendering
public void SetupIsometricGrid(Grid grid)
{
    grid.cellLayout = GridLayout.CellLayout.Isometric;
    grid.cellSize = new Vector3(1f, 0.5f, 1f); // Standard isometric ratio
    grid.cellSwizzle = GridLayout.CellSwizzle.XZY;
}
```

**2. Create Isometric Sorting System**:

```csharp
public class IsometricSorting : MonoBehaviour
{
    private TilemapRenderer tilemapRenderer;

    void Start()
    {
        tilemapRenderer = GetComponent<TilemapRenderer>();
        tilemapRenderer.mode = TilemapRenderer.Mode.Individual;

        // Configure for depth sorting
        tilemapRenderer.detectChunkCullingBounds = TilemapRenderer.DetectChunkCullingBounds.Auto;
    }

    void LateUpdate()
    {
        // Update sorting order based on position
        UpdateIsometricSorting();
    }
}
```

#### 7.2 Implement Isometric Tile Rules

**1. Create Isometric Rule Tiles**:

```csharp
[CreateAssetMenu(fileName = "Isometric Rule Tile", menuName = "2D/Tiles/Isometric Rule Tile")]
public class IsometricRuleTile : RuleTile
{
    public override void GetTileData(Vector3Int position, ITilemap tilemap, ref TileData tileData)
    {
        base.GetTileData(position, tilemap, ref tileData);

        // Adjust for isometric perspective
        tileData.transform = Matrix4x4.identity;
        tileData.colliderType = Tile.ColliderType.Sprite;
    }
}
```

### 8. Implement Runtime Tilemap Modification

#### 8.1 Create Dynamic Tilemap System

**1. Implement Runtime Tile Placement**:

```csharp
public class RuntimeTilemapEditor : MonoBehaviour
{
    [Header("Tile Modification")]
    public Tilemap targetTilemap;
    public TileBase[] placementTiles;

    public void PlaceTile(Vector3 worldPosition, TileBase tile)
    {
        Vector3Int cellPosition = targetTilemap.WorldToCell(worldPosition);

        // Validate placement
        if (CanPlaceTileAt(cellPosition))
        {
            targetTilemap.SetTile(cellPosition, tile);
            OnTilePlaced(cellPosition, tile);
        }
    }

    public void RemoveTile(Vector3 worldPosition)
    {
        Vector3Int cellPosition = targetTilemap.WorldToCell(worldPosition);
        TileBase removedTile = targetTilemap.GetTile(cellPosition);

        targetTilemap.SetTile(cellPosition, null);
        OnTileRemoved(cellPosition, removedTile);
    }

    private bool CanPlaceTileAt(Vector3Int position)
    {
        // Check placement rules, collision, etc.
        return true; // Implement actual validation logic
    }
}
```

**2. Implement Undo/Redo System**:

```csharp
[System.Serializable]
public class TileOperation
{
    public Vector3Int position;
    public TileBase previousTile;
    public TileBase newTile;
    public float timestamp;
}

public class TilemapUndoSystem : MonoBehaviour
{
    private Stack<TileOperation> undoStack = new Stack<TileOperation>();
    private Stack<TileOperation> redoStack = new Stack<TileOperation>();

    public void RecordTileChange(Vector3Int position, TileBase oldTile, TileBase newTile)
    {
        TileOperation operation = new TileOperation
        {
            position = position,
            previousTile = oldTile,
            newTile = newTile,
            timestamp = Time.time
        };

        undoStack.Push(operation);
        redoStack.Clear(); // Clear redo stack when new operation is performed
    }

    public void Undo()
    {
        if (undoStack.Count > 0)
        {
            TileOperation operation = undoStack.Pop();
            targetTilemap.SetTile(operation.position, operation.previousTile);
            redoStack.Push(operation);
        }
    }

    public void Redo()
    {
        if (redoStack.Count > 0)
        {
            TileOperation operation = redoStack.Pop();
            targetTilemap.SetTile(operation.position, operation.newTile);
            undoStack.Push(operation);
        }
    }
}
```

### 9. Create Tilemap Serialization System

#### 9.1 Implement Save/Load System

**1. Create Tilemap Data Structure**:

```csharp
[System.Serializable]
public class TilemapSaveData
{
    public string tilemapName;
    public Vector2Int bounds;
    public TileData[] tileDataArray;
    public Vector3 gridCellSize;
    public GridLayout.CellLayout cellLayout;

    [System.Serializable]
    public class TileData
    {
        public Vector3Int position;
        public string tileAssetPath;
        public Matrix4x4 transform;
        public Color color;
        public Tile.ColliderType colliderType;
    }
}
```

**2. Implement Serialization Methods**:

```csharp
public class TilemapSerializer : MonoBehaviour
{
    public void SaveTilemap(Tilemap tilemap, string filePath)
    {
        TilemapSaveData saveData = new TilemapSaveData();
        saveData.tilemapName = tilemap.name;

        BoundsInt bounds = tilemap.cellBounds;
        saveData.bounds = new Vector2Int(bounds.size.x, bounds.size.y);

        List<TilemapSaveData.TileData> tileDataList = new List<TilemapSaveData.TileData>();

        foreach (Vector3Int position in bounds.allPositionsWithin)
        {
            TileBase tile = tilemap.GetTile(position);
            if (tile != null)
            {
                TilemapSaveData.TileData tileData = new TilemapSaveData.TileData();
                tileData.position = position;
                tileData.tileAssetPath = AssetDatabase.GetAssetPath(tile);

                // Get additional tile data
                tilemap.GetTileData(position, out tileData.transform, out tileData.color,
                                   out tileData.colliderType);

                tileDataList.Add(tileData);
            }
        }

        saveData.tileDataArray = tileDataList.ToArray();

        string json = JsonUtility.ToJson(saveData, true);
        File.WriteAllText(filePath, json);
    }

    public void LoadTilemap(Tilemap tilemap, string filePath)
    {
        if (!File.Exists(filePath)) return;

        string json = File.ReadAllText(filePath);
        TilemapSaveData saveData = JsonUtility.FromJson<TilemapSaveData>(json);

        // Clear existing tilemap
        tilemap.SetTilesBlock(tilemap.cellBounds, new TileBase[tilemap.cellBounds.size.x * tilemap.cellBounds.size.y]);

        // Load tiles
        foreach (TilemapSaveData.TileData tileData in saveData.tileDataArray)
        {
            TileBase tile = AssetDatabase.LoadAssetAtPath<TileBase>(tileData.tileAssetPath);
            if (tile != null)
            {
                tilemap.SetTile(tileData.position, tile);

                // Apply additional properties
                tilemap.SetTransformMatrix(tileData.position, tileData.transform);
                tilemap.SetColor(tileData.position, tileData.color);
            }
        }
    }
}
```

### 10. Error Handling and Remediation

#### 10.1 Common Issues and Solutions

**Issue: Tilemap Rendering Issues**

- **Symptom**: Tiles appear pixelated or blurred
- **Diagnosis**: Check Sprite Import Settings and Camera configuration
- **Remediation**:
  ```csharp
  // Set correct import settings for pixel art
  TextureImporter textureImporter = AssetImporter.GetAtPath(spritePath) as TextureImporter;
  textureImporter.textureType = TextureImporterType.Sprite;
  textureImporter.filterMode = FilterMode.Point;
  textureImporter.spritePixelsPerUnit = 16; // Adjust based on art style
  ```

**Issue: Performance Problems on Mobile**

- **Symptom**: Low framerate, high memory usage
- **Diagnosis**: Too many active tiles, inefficient atlasing
- **Remediation**:
  - Implement chunk-based loading (Section 5.2)
  - Use Sprite Atlas for texture optimization
  - Enable tilemap compression: `tilemap.CompressBounds()`

**Issue: Rule Tile Not Working**

- **Symptom**: Auto-tiling not connecting properly
- **Diagnosis**: Incorrect Rule Tile configuration
- **Remediation**:
  - Verify Rule Tile asset setup
  - Check neighboring tile detection rules
  - Ensure tiles are placed on same layer

**Issue: Collision Detection Problems**

- **Symptom**: Player falls through platforms, incorrect physics
- **Diagnosis**: Missing or misconfigured Tilemap Collider
- **Remediation**:
  ```csharp
  // Refresh collider after tile changes
  TilemapCollider2D collider = tilemap.GetComponent<TilemapCollider2D>();
  if (collider != null)
  {
      collider.enabled = false;
      collider.enabled = true;
  }
  ```

#### 10.2 Validation and Testing

**Automated Validation Checklist**:

- [ ] All tilemap layers have correct sorting orders
- [ ] Collision layers have TilemapCollider2D components
- [ ] Rule Tiles have proper neighbor configurations
- [ ] Sprite atlases are optimized for target platform
- [ ] Memory usage is within acceptable limits
- [ ] Frame rate maintains target FPS

**Testing Protocol**:

1. **Visual Testing**: Verify tile appearance and alignment
2. **Performance Testing**: Monitor memory and FPS
3. **Collision Testing**: Test player-tile interactions
4. **Platform Testing**: Verify on target mobile devices
5. **Stress Testing**: Load maximum expected tile count

### 11. Integration with BMAD Workflow

#### 11.1 Update Architecture Documentation

If new tilemap systems added to the project:

- Update technical architecture documents to include:
  - Tilemap layer hierarchy
  - Performance optimization strategies
  - Asset organization structure
  - Collision system configuration

#### 11.2 Generate Level Design Guidelines

Create comprehensive documentation for level designers:

```markdown
# Tilemap Level Design Guidelines

## Tile Placement Best Practices

### Performance Guidelines

- Maximum tiles per chunk: {{max_tiles_per_chunk}}
- Recommended tilemap bounds: {{recommended_bounds}}
- Optimal sprite atlas size: {{atlas_size}}

### Visual Guidelines

- Tile size consistency: {{tile_size}}px
- Color palette: {{color_specification}}
- Animation frame count: {{max_animation_frames}}

### Gameplay Guidelines

- Platform minimum width: {{min_platform_width}} tiles
- Jump height clearance: {{jump_clearance}} tiles
- Safe zone requirements: {{safe_zone_specs}}
```

### 12. Completion and Validation

#### 12.1 Final System Validation

Execute comprehensive validation checklist:

- [ ] Grid system properly configured for project type
- [ ] All tilemap layers created with correct hierarchy
- [ ] Tile palettes organized and accessible
- [ ] Rule tiles configured for auto-tiling
- [ ] Collision system working correctly
- [ ] Animated tiles functioning smoothly
- [ ] Procedural generation system operational (if implemented)
- [ ] Chunk-based loading working for large worlds (if implemented)
- [ ] Mobile performance optimizations applied
- [ ] Isometric support configured (if required)
- [ ] Runtime modification system functional (if implemented)
- [ ] Serialization system working correctly
- [ ] Error handling and remediation procedures documented

#### 12.2 Generate Summary Report

Create final documentation including:

- **Tilemap Configuration Summary**: Layer hierarchy, collision setup, performance settings
- **Asset Organization**: Palette structure, naming conventions, optimization status
- **Feature Implementation Status**: Which advanced features were implemented
- **Performance Metrics**: Current memory usage, FPS measurements, optimization results
- **Integration Notes**: How tilemap system integrates with existing game architecture
- **Next Steps**: Recommendations for level design and content creation

[[LLM: Based on the specific game genre and requirements identified in the architecture analysis, customize this summary to highlight the most relevant features and provide genre-specific recommendations for level design workflows.]]

## Success Criteria

- Complete tilemap infrastructure established for efficient 2D level design
- Tile palette system organized for rapid content creation
- Rule tiles and animated tiles functioning correctly for enhanced visual quality
- Collision system properly configured for gameplay requirements
- Performance optimized for target mobile platforms (if applicable)
- Procedural generation capabilities implemented (if required by architecture)
- Chunk-based loading system working for large worlds (if required)
- Runtime modification system functional for dynamic content (if required)
- Isometric support configured (if required by art style)
- Comprehensive documentation and guidelines created for level designers
- Integration with existing BMAD Unity workflow established
- All validation tests passed successfully

## Notes

- This task creates the foundation for efficient 2D level design workflows in Unity
- The system is designed to scale from simple prototypes to complex commercial games
- Mobile performance optimizations are included but can be adjusted for desktop-only projects
- Procedural generation and chunk loading features are optional based on project requirements
- The system integrates with existing Unity packages and follows Unity best practices
- All code examples should be adapted to specific project needs and art styles
- Regular testing on target platforms is recommended throughout implementation
