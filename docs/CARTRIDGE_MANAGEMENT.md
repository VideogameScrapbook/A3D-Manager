# Cartridge Management

This document describes the cartridge management features in A3D Manager.

## Overview

A3D Manager provides comprehensive cartridge management beyond label artwork:

- **Labels** - Cartridge artwork images
- **Ownership** - Track which cartridges you own
- **Settings** - Per-game display and hardware configuration
- **Game Paks** - Controller pak save data

All data is stored locally and can be synced to/from an SD card or exported as backup archives.

---

## Local Storage

All local data is stored in the `.local/` directory:

```
.local/
├── labels.db              # Binary labels database
├── owned-carts.json       # Ownership tracking
├── user-carts.json        # Custom cartridge names
└── Library/N64/
    ├── Games/
    │   └── [Game Title] [cartId]/
    │       ├── settings.json        # Display/hardware settings
    │       └── controller_pak.img   # Save data (32KB)
    └── GamePakBackups/
        └── [cartId]/
            ├── metadata.json        # Backup index
            └── [backupId].img       # Individual backup files
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

| Field | Description |
|-------|-------------|
| `cartId` | 8-character hex cartridge ID |
| `addedAt` | ISO 8601 timestamp |
| `source` | How ownership was added: `sd-card` (imported) or `manual` |

### user-carts.json

Custom names assigned to cartridges.

```json
[
  {
    "id": "e5240d18",
    "name": "The Legend of Zelda: Ocarina of Time",
    "addedAt": "2025-12-26T13:51:24.721Z"
  }
]
```

### Game Folder Structure

Each cartridge with settings or save data gets a folder named `[Game Title] [cartId]`:

```
.local/Library/N64/Games/
├── GoldenEye 007 ac631da0/
│   ├── settings.json
│   └── controller_pak.img
└── Super Mario 64 b393776d/
    └── settings.json
```

### GamePakBackups

Backups are stored separately from active game paks to preserve save history without affecting the working save.

```
.local/Library/N64/GamePakBackups/
└── ac631da0/
    ├── metadata.json
    ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890.img
    └── b2c3d4e5-f6a7-8901-bcde-f12345678901.img
```

#### metadata.json

```json
{
  "version": 1,
  "cartId": "ac631da0",
  "backups": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Before final boss",
      "description": "Save state before attempting the final boss fight",
      "createdAt": "2025-12-26T10:30:00.000Z",
      "md5Hash": "d41d8cd98f00b204e9800998ecf8427e",
      "size": 32768
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `id` | UUID v4 identifier |
| `name` | User-provided name (defaults to "Backup YYYY-MM-DD") |
| `description` | Optional notes |
| `createdAt` | ISO 8601 timestamp |
| `md5Hash` | MD5 hash of the backup file for deduplication |
| `size` | File size in bytes (always 32768) |

---

## Settings

Per-cartridge settings control display and hardware behavior on the Analogue 3D. Settings include display mode configuration (BVM, PVM, CRT, Scanlines, Clean) and hardware options (expansion pak, region, overclock, etc.).

For the complete settings structure and all available options, see **[ANALOGUE_3D_SD_CARD_FORMAT.md](./ANALOGUE_3D_SD_CARD_FORMAT.md#settingsjson-per-game-configuration)**.

### Auto-Save

Settings changes are automatically saved with a 2-second debounce. Multiple cartridges can be queued simultaneously, and pending saves are flushed when leaving the page.

---

## Game Paks (Controller Pak Save Data)

Controller pak images are 32KB (32,768 bytes) files containing save data for games that use the Controller Pak accessory.

The pak is divided into 128 pages of 256 bytes each. The first 5 pages (1,280 bytes) are reserved for the header and directory structure, leaving 123 user-accessible pages for save data.

### Sync Status

Game paks can exist in three locations:
- **Local** - `.local/Library/N64/Games/[Title] [cartId]/controller_pak.img`
- **SD Card** - `[SD]/System/Library/N64/Games/[Title] [cartId]/controller_pak.img`
- **Backups** - `.local/Library/N64/GamePakBackups/[cartId]/`

The sync status compares local and SD card versions using MD5 hashing:

| Local | SD | Status |
|-------|-----|--------|
| Exists | Same hash | In Sync |
| Exists | Different hash | Conflict |
| Exists | Missing | Local only |
| Missing | Exists | SD only |
| Missing | Missing | No data |

### Conflict Resolution

When local and SD card game paks have different content, users can resolve by:
- **Use Local** - Upload the local version to SD card
- **Use SD** - Download the SD card version to local

### Backups

Backups preserve game pak states without affecting the active save. Features include:

- **Create** - Snapshot current local game pak with optional name and description
- **Restore** - Copy a backup to local (and optionally sync to SD card)
- **Export** - Download backup as `.img` file
- **Delete** - Remove backup from storage

Backups are deduplicated by MD5 hash during import to avoid storing identical saves multiple times.

---

## API Routes

### Ownership

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cartridges/owned` | Get all owned cartridges with metadata |
| `GET` | `/api/cartridges/owned/ids` | Get owned cart IDs only |
| `POST` | `/api/cartridges/owned/:cartId` | Mark cartridge as owned |
| `DELETE` | `/api/cartridges/owned/:cartId` | Remove ownership |
| `GET` | `/api/cartridges/owned/check/:cartId` | Check if cart is owned |
| `POST` | `/api/cartridges/owned/import-from-sd/scan` | Scan SD card for importable carts |
| `POST` | `/api/cartridges/owned/import-from-sd/apply` | Import ownership from SD (SSE progress) |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cartridges/:cartId/settings` | Get settings info (local and/or SD) |
| `PUT` | `/api/cartridges/:cartId/settings` | Save settings locally |
| `POST` | `/api/cartridges/:cartId/settings/download` | Download settings from SD to local |
| `POST` | `/api/cartridges/:cartId/settings/upload` | Upload settings from local to SD |
| `POST` | `/api/cartridges/:cartId/settings/import` | Import settings from file |
| `GET` | `/api/cartridges/:cartId/settings/export` | Export settings as JSON |
| `DELETE` | `/api/cartridges/:cartId/settings` | Delete local settings |

### Game Paks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cartridges/:cartId/game-pak` | Get game pak info (local and/or SD) |
| `POST` | `/api/cartridges/:cartId/game-pak/download` | Download game pak from SD to local |
| `POST` | `/api/cartridges/:cartId/game-pak/upload` | Upload game pak from local to SD |
| `POST` | `/api/cartridges/:cartId/game-pak/import` | Import game pak from file |
| `GET` | `/api/cartridges/:cartId/game-pak/export` | Export game pak as .img |
| `DELETE` | `/api/cartridges/:cartId/game-pak` | Delete local game pak |

#### Query Parameters

The `GET /api/cartridges/:cartId/game-pak` endpoint accepts:

| Parameter | Type | Description |
|-----------|------|-------------|
| `includeHash` | boolean | Include MD5 hashes and sync status |
| `sdCardPath` | string | SD card mount path for comparison |

#### Response with `includeHash=true`

```json
{
  "local": {
    "exists": true,
    "path": ".local/Library/N64/Games/Mario Kart 64 b393776d/controller_pak.img",
    "size": 32768
  },
  "sd": {
    "exists": true,
    "path": "/Volumes/A3D/System/Library/N64/Games/Mario Kart 64 b393776d/controller_pak.img",
    "size": 32768
  },
  "syncStatus": {
    "localHash": "d41d8cd98f00b204e9800998ecf8427e",
    "sdHash": "e9800998ecf8427ed41d8cd98f00b204",
    "inSync": false,
    "hasConflict": true
  }
}
```

### Game Pak Backups

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cartridges/:cartId/game-pak/backups` | List all backups |
| `POST` | `/api/cartridges/:cartId/game-pak/backups` | Create new backup |
| `GET` | `/api/cartridges/:cartId/game-pak/backups/:backupId` | Download backup as .img |
| `PUT` | `/api/cartridges/:cartId/game-pak/backups/:backupId` | Update backup name/description |
| `DELETE` | `/api/cartridges/:cartId/game-pak/backups/:backupId` | Delete backup |
| `POST` | `/api/cartridges/:cartId/game-pak/backups/:backupId/restore` | Restore backup |

#### Create Backup Request

```json
{
  "name": "Before final boss",
  "description": "Optional notes about this backup"
}
```

Both fields are optional. If `name` is omitted, it defaults to "Backup YYYY-MM-DD".

#### Restore Backup Request

```json
{
  "syncToSD": true,
  "sdCardPath": "/Volumes/A3D"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `syncToSD` | boolean | Also copy restored backup to SD card |
| `sdCardPath` | string | Required if `syncToSD` is true |

### Bundles

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/cartridges/bundle/export` | Create .a3d archive |
| `POST` | `/api/cartridges/bundle/export-selection` | Create bundle for specific carts |
| `POST` | `/api/cartridges/bundle/info` | Preview bundle contents |
| `POST` | `/api/cartridges/bundle/import` | Import .a3d bundle |

### Labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/labels/status` | Get database status |
| `POST` | `/api/labels/import` | Import labels.db file |
| `GET` | `/api/labels/filter-options` | Get available filter values |
| `GET` | `/api/labels/lookup/:cartId` | Lookup cart info by ID |
| `POST` | `/api/labels/user-cart/:cartId` | Add custom cart name |
| `DELETE` | `/api/labels/user-cart/:cartId` | Remove custom cart name |
| `GET` | `/api/labels/user-carts` | Get all custom named carts |
| `GET` | `/api/labels/page/:page` | Get paginated labels |
| `GET` | `/api/labels/search/:query` | Search labels |
| `POST` | `/api/labels/add/:cartId` | Add custom label image |
| `PUT` | `/api/labels/:cartId` | Update label image |
| `GET` | `/api/labels/:cartId` | Get label image |
| `DELETE` | `/api/labels/:cartId` | Delete custom label |
| `GET` | `/api/labels/compare/quick` | Quick checksum comparison with SD |
| `GET` | `/api/labels/compare/detailed` | Detailed comparison with SD |

### Local Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/local-data/status` | Get status of all local data |
| `DELETE` | `/api/local-data/labels` | Delete local labels.db |
| `DELETE` | `/api/local-data/owned-carts` | Clear owned cartridges |
| `DELETE` | `/api/local-data/user-carts` | Delete custom names |
| `DELETE` | `/api/local-data/game-data` | Delete all settings/game paks |
| `DELETE` | `/api/local-data/all` | Full reset |

### SD Card & Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sync/sd-cards` | Detect connected SD cards |
| `GET` | `/api/sync/labels/exists` | Check if labels.db exists on SD |
| `GET` | `/api/sync/games/exists` | Check if games folder exists on SD |
| `GET` | `/api/sync/labels/status` | Get labels.db status on SD |
| `GET` | `/api/sync/labels/upload-stream` | Stream upload labels to SD (SSE) |
| `GET` | `/api/sync/labels/download-stream` | Stream download labels from SD (SSE) |
| `DELETE` | `/api/sd-card/labels` | Delete labels.db from SD |

---

## Bundle Archive Format (.a3d)

The `.a3d` format is a ZIP archive for backup and sharing:

```
archive.a3d (ZIP)
├── manifest.json
├── labels.db                    # Optional
├── owned-carts.json             # Optional
├── settings/
│   ├── b393776d.json
│   └── ...
├── game-paks/
│   ├── b393776d.img
│   └── ...
└── game-pak-backups/
    └── ac631da0/
        ├── metadata.json
        ├── uuid1.img
        └── uuid2.img
```

### manifest.json

```json
{
  "version": 1,
  "createdAt": "2025-12-24T12:00:00.000Z",
  "appVersion": "1.0.0",
  "contents": {
    "hasLabelsDb": true,
    "hasOwnedCarts": true,
    "settingsCount": 3,
    "gamePaksCount": 2,
    "gamePakBackupsCount": 5,
    "cartIds": ["b393776d", "ac631da0"]
  }
}
```

The `gamePakBackupsCount` is the total number of individual backup files across all cartridges.

### Import Merge Strategies

When importing a bundle, each component supports merge strategies:

| Strategy | Behavior |
|----------|----------|
| `skip` | Don't overwrite existing data |
| `overwrite` | Replace with bundle version |

#### Game Pak Backup Deduplication

Backups are deduplicated during import using MD5 hashes. If an imported backup has the same hash as an existing backup for that cartridge, it is skipped to avoid storing duplicate files.

---

## UI Features

### Cartridge Browser

- Paginated grid view of all cartridges
- Filter by: owned status, region, language, video mode
- Search by name
- Multi-select for bulk operations

### Detail Panel

Slide-over panel with tabs:

1. **Label** - View and manage artwork
2. **Settings** - Edit display and hardware configuration
3. **Game Pak** - Manage controller pak save data

#### Game Pak Tab

The Game Pak tab provides:

- **Sync Status** - Visual indicator showing whether local and SD card versions match
- **Conflict Resolution** - When versions differ, choose to use local or SD card version
- **Import/Export** - Upload `.img` files or download the current game pak
- **Backups List** - View all saved backups sorted by date (newest first)
- **Create Backup** - Save current game pak with optional name and description
- **Restore Backup** - Restore a backup to local with optional SD card sync
- **Edit/Delete Backups** - Manage backup metadata or remove backups

### Import from SD

Scans the SD card's Games folder to:
- Import ownership for discovered cartridges
- Optionally download settings and game paks

### Export/Import Bundles

- Create .a3d archives with selected cartridges or full library
- Choose which components to include:
  - Labels database
  - Ownership data
  - Per-game settings
  - Game paks (active controller pak saves)
  - Game pak backups
- Import bundles with merge strategy selection
- Backups are deduplicated on import by MD5 hash

### Labels Sync

- Compare local labels.db with SD card version
- Upload or download labels database
- Quick checksum comparison or detailed diff

---

## Cartridge ID Format

Cartridge IDs are 8-character lowercase hex strings (e.g., `b393776d`). These IDs are validated throughout the application and must match this format for all operations.
