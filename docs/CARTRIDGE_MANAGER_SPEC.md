# Cartridge Manager Feature Specification

This document describes the expanded cartridge management features for A3D Manager, evolving the app from a label management tool into a comprehensive cartridge manager.

## Overview

The core shift is from managing **labels** (artwork) to managing **cartridges** holistically:
- Labels (artwork)
- Settings (per-game hardware/display configuration)
- Game Paks (controller pak save data)
- Ownership tracking (which cartridges the user owns)

## User Experience Goals

1. **Focus on owned games**: Most users have 900+ labels but only own 10-50 games. Make it easy to filter down to their collection.
2. **Easy data management**: Download/upload settings and game paks from/to SD card.
3. **Backup & sharing**: Export bundles of labels + settings + game paks for backup or community sharing.
4. **Non-destructive by default**: All changes stored locally until explicitly synced to SD card.

---

## Data Model

### Local Storage Structure

```
.local/
├── labels.db              # Binary labels database (existing)
├── user-carts.json        # Custom cart names (existing)
├── owned-carts.json       # NEW - ownership tracking
└── Library/N64/
    └── Games/
        └── [Game Title] [hex_id]/
            ├── controller_pak.img   # Game pak data
            └── settings.json        # Per-game settings
```

### owned-carts.json

Tracks which cartridges the user owns.

```json
{
  "version": 1,
  "cartridges": [
    {
      "cartId": "b393776d",
      "addedAt": "2025-12-24T12:00:00.000Z",
      "source": "sd-card"
    },
    {
      "cartId": "ac631da0",
      "addedAt": "2025-12-24T12:05:00.000Z",
      "source": "manual"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `cartId` | string | 8-character hex cartridge ID |
| `addedAt` | string | ISO 8601 timestamp |
| `source` | string | How ownership was added: `"sd-card"` or `"manual"` |

### Settings Structure

Per-game settings from the Analogue 3D. See [ANALOGUE_3D_SD_CARD_FORMAT.md](./ANALOGUE_3D_SD_CARD_FORMAT.md) for full specification.

```typescript
interface CartridgeSettings {
  title: string;
  display: {
    odm: 'bvm' | 'pvm' | 'crt' | 'scanlines' | 'clean';
    catalog: {
      bvm: DisplayModeSettings;
      pvm: DisplayModeSettings;
      crt: DisplayModeSettings;
      scanlines: DisplayModeSettings;
      clean: CleanModeSettings;
    };
  };
  hardware: {
    virtualExpansionPak: boolean;
    region: 'Auto' | 'NTSC' | 'PAL';
    disableDeblur: boolean;
    enable32BitColor: boolean;
    disableTextureFiltering: boolean;
    disableAntialiasing: boolean;
    forceOriginalHardware: boolean;
    overclock: 'Auto' | 'Enhanced' | 'Unleashed';
  };
}
```

---

## API Routes

### Ownership Management

```
GET    /api/cartridges/owned
       Returns list of owned cartridge IDs

POST   /api/cartridges/owned/:cartId
       Mark a cartridge as owned
       Body: { source?: 'manual' | 'sd-card' }

DELETE /api/cartridges/owned/:cartId
       Remove ownership marking

POST   /api/cartridges/owned/import-from-sd
       Scan SD card and import owned cartridges
       Query: ?sdCardPath=/Volumes/...
       Body: {
         cartIds: string[],           // Which carts to mark as owned
         downloadSettings: boolean,   // Also download settings.json
         downloadGamePaks: boolean    // Also download game paks
       }
       Returns: SSE stream with progress
```

### Settings Management

```
GET    /api/cartridges/:cartId/settings
       Get settings for a cartridge
       Query: ?source=local|sd&sdCardPath=/Volumes/...
       Returns: { source, settings, lastModified }

PUT    /api/cartridges/:cartId/settings
       Update local settings
       Body: CartridgeSettings

POST   /api/cartridges/:cartId/settings/download
       Download settings from SD card to local
       Query: ?sdCardPath=/Volumes/...

POST   /api/cartridges/:cartId/settings/import
       Import settings from uploaded file
       Body: multipart/form-data with settings.json

GET    /api/cartridges/:cartId/settings/export
       Download settings.json file
```

### Game Pak Management

```
GET    /api/cartridges/:cartId/game-pak
       Get game pak info
       Query: ?source=local|sd&sdCardPath=/Volumes/...
       Returns: { exists, size, lastModified }

POST   /api/cartridges/:cartId/game-pak/download
       Download game pak from SD card to local
       Query: ?sdCardPath=/Volumes/...

POST   /api/cartridges/:cartId/game-pak/import
       Import game pak from uploaded file
       Body: multipart/form-data with .img file

GET    /api/cartridges/:cartId/game-pak/export
       Download controller_pak.img file

DELETE /api/cartridges/:cartId/game-pak
       Delete local game pak
```

### Export/Import Bundles

```
POST   /api/export/bundle
       Create a .a3d archive
       Body: {
         cartIds: string[],
         includeLabels: boolean,
         includeSettings: boolean,
         includeGamePaks: boolean
       }
       Returns: Binary ZIP file

POST   /api/import/bundle/preview
       Preview contents of .a3d archive
       Body: multipart/form-data with .a3d file
       Returns: {
         manifest: { ... },
         conflicts: { labels: [...], settings: [...], gamePaks: [...] }
       }

POST   /api/import/bundle/apply
       Apply import with merge options
       Body: multipart/form-data with .a3d file + options JSON
       Options: {
         labels: 'merge' | 'replace' | 'skip',
         settings: 'merge' | 'replace' | 'skip',
         gamePaks: 'merge' | 'replace' | 'skip'
       }
       Returns: SSE stream with progress
```

---

## UI Components

### Route Change

| Old | New |
|-----|-----|
| `/labels` | `/cartridges` |

Redirect from `/labels` to `/cartridges` for backward compatibility.

### Cartridge Browser Enhancements

**Filter Bar Addition**

```
[ All | Owned ] [Search...] [Region ▾] [Language ▾] [Video ▾] [Clear]
```

Toggle between viewing all cartridges or only owned ones.

**Action Bar - Normal Mode**

```
[Import labels.db] [Add Cartridge] [Import from SD ▾] ... [Select] [Export]
```

**Action Bar - Selection Mode**

```
[Exit Selection] [Select All] [Select Owned] | 5 selected | [Export Selected]
```

### Slide-Over Detail Panel

Replaces the modal. 400px panel slides in from the right when a cartridge is selected.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Cartridge Grid                    │ Detail Panel                    │
│                                   │ ┌─────────────────────────────┐ │
│                                   │ │ [×]  Super Mario 64         │ │
│                                   │ │      b393776d   [★ Owned]   │ │
│  [tile] [tile] [tile] [tile]      │ ├─────────────────────────────┤ │
│  [tile] [SELECTED] [tile] [tile]  │ │ [Label] [Settings] [Pak]    │ │
│  [tile] [tile] [tile] [tile]      │ ├─────────────────────────────┤ │
│                                   │ │                             │ │
│                                   │ │   Tab content...            │ │
│                                   │ │                             │ │
│                                   │ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Tabs:**
1. **Label** - Artwork management (migrated from LabelEditor)
2. **Settings** - View/edit hardware & display settings
3. **Game Pak** - Controller pak data management

### Import from SD Card Modal

```
┌─────────────────────────────────────────┐
│ Import from SD Card                     │
│                                         │
│ Found 23 cartridges on "A3D SD Card"    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ [✓] Super Mario 64 (b393776d)       │ │
│ │ [✓] GoldenEye 007 (ac631da0)        │ │
│ │ [✓] Mario Kart 64 (e5240d18)        │ │
│ │     ... (scrollable list)           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Select All] [Select None]              │
│                                         │
│ Also download to local storage:         │
│ [ ] Settings (23 available)             │
│ [ ] Game Paks (18 available)            │
│                                         │
│               [Cancel] [Import]         │
└─────────────────────────────────────────┘
```

### Export Modal

```
┌─────────────────────────────────────────┐
│ Export 5 Cartridges                     │
│                                         │
│ Include in export:                      │
│                                         │
│ [✓] Labels                              │
│     5 cartridges                        │
│                                         │
│ [✓] Settings                            │
│     3 cartridges have local settings    │
│                                         │
│ [ ] Game Paks                           │
│     2 cartridges have local game paks   │
│     ⚠️ Contains save data               │
│                                         │
│               [Cancel] [Export .a3d]    │
└─────────────────────────────────────────┘
```

### Import Bundle Modal

```
┌─────────────────────────────────────────┐
│ Import A3D Archive                      │
│                                         │
│ Archive: my-backup.a3d                  │
│                                         │
│ Contains:                               │
│ • 12 cartridge labels                   │
│ • 8 settings configurations             │
│ • 5 game pak saves                      │
│                                         │
│ Labels:                                 │
│ (•) Merge - add new, keep existing      │
│ ( ) Replace - overwrite existing        │
│ ( ) Skip - don't import                 │
│                                         │
│ Settings:                               │
│ (•) Merge - add new, keep existing      │
│ ( ) Replace - overwrite existing        │
│ ( ) Skip - don't import                 │
│                                         │
│ Game Paks:                              │
│ (•) Merge - add new, keep existing      │
│ ( ) Replace - overwrite existing        │
│ ( ) Skip - don't import                 │
│                                         │
│ ⚠️ "Replace" for game paks will         │
│    overwrite existing save data!        │
│                                         │
│               [Cancel] [Import]         │
└─────────────────────────────────────────┘
```

---

## Archive Format (.a3d)

The `.a3d` format is a ZIP archive with the following structure:

```
archive.a3d (ZIP)
├── manifest.json
├── labels/
│   ├── b393776d.bin      # Raw BGRA image data (25,456 bytes)
│   ├── ac631da0.bin
│   └── ...
├── settings/
│   ├── b393776d.json     # settings.json content
│   └── ...
└── game-paks/
    ├── b393776d.img      # controller_pak.img (32,768 bytes)
    └── ...
```

### manifest.json

```json
{
  "version": 1,
  "format": "a3d-manager-archive",
  "exportedAt": "2025-12-24T12:00:00.000Z",
  "exportedBy": "A3D Manager v1.0.0",
  "contents": {
    "labels": ["b393776d", "ac631da0"],
    "settings": ["b393776d"],
    "gamePaks": ["b393776d"]
  },
  "cartridges": {
    "b393776d": {
      "name": "Super Mario 64",
      "region": "USA",
      "videoMode": "NTSC"
    },
    "ac631da0": {
      "name": "GoldenEye 007",
      "region": "USA",
      "videoMode": "NTSC"
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Data Foundation
- [ ] Create `owned-carts.ts` library
- [ ] Create `cartridge-settings.ts` library
- [ ] Create `game-pak.ts` library
- [ ] Add ownership API routes
- [ ] Add tests for ownership tracking

### Phase 2: Ownership UI
- [ ] Add "Owned" filter toggle to browser
- [ ] Add "Import from SD Card" modal
- [ ] Add ownership toggle in detail view
- [ ] Progress bar for SD card import

### Phase 3: Route & Panel
- [ ] Rename `/labels` to `/cartridges`
- [ ] Create `CartridgeDetailPanel` component
- [ ] Migrate Label tab from `LabelEditor`
- [ ] Add slide-over animation

### Phase 4: Settings Management
- [ ] Settings API routes
- [ ] Settings tab UI (read-only)
- [ ] Settings editor form
- [ ] Import/export settings

### Phase 5: Game Pak Management
- [ ] Game pak API routes
- [ ] Game pak tab UI
- [ ] Import/export game paks
- [ ] Destructive action warnings

### Phase 6: Selection Mode
- [ ] Selection state management
- [ ] Selection mode toggle
- [ ] Bulk selection actions
- [ ] Visual selection indicators

### Phase 7: Export System
- [ ] Archive creation library
- [ ] Export modal UI
- [ ] ZIP file generation

### Phase 8: Import System
- [ ] Archive parsing library
- [ ] Import preview modal
- [ ] Import apply with merge strategies
- [ ] Progress tracking

---

## Testing

### Test Suites

| Suite | Location | Tests |
|-------|----------|-------|
| Owned Carts | `tests/owned-carts/tests.ts` | ~10 |
| Settings | `tests/game-data/tests.ts` | ~12 |
| Game Pak | `tests/game-data/tests.ts` | ~8 |
| Archive | `tests/export-import/tests.ts` | ~15 |

### Test Categories

**Owned Carts**
- Add/remove ownership
- Import from SD card scan
- Persistence to JSON file
- Duplicate handling

**Settings**
- Parse valid settings.json
- Handle missing fields
- Validate hardware settings
- Validate display settings

**Game Pak**
- Validate file size (32,768 bytes)
- Read/write operations
- Handle missing files

**Archive**
- Create ZIP with manifest
- Extract and validate contents
- Merge strategies
- Conflict detection
