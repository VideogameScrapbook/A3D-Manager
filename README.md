# A3D Manager

**The unofficial companion app for managing your Analogue 3D N64 cartridge label artwork.**

A3D Manager is a utility that lets you browse, edit, and sync custom label artwork to your Analogue 3D. Build your perfect cartridge library with beautiful label images that display on the Analogue 3D home screen.

![Labels Database](src/assets/screenshots/Label%20Database.png)

---

## Features

### Browse & Search Your Label Library

Manage your entire N64 label collection with powerful search and filtering:

- **Real-time search** by game name or cart ID - even for cartridges not in our database
- **Search by cart ID** to find and add artwork for any cartridge, including homebrew and flash carts
- **Filter by region** (USA, Europe, Japan, and more)
- **Filter by language and video mode** (NTSC/PAL)
- **Smart badges** identify known games, custom names, and unknown/homebrew carts
- **Paginated grid view** for easy browsing

> **Tip:** Don't know your cart ID? Insert your cartridge into your Analogue 3D, then check your SD card. The Analogue 3D creates a folder for each cartridge in `Library/N64/` using the cart's hex ID. Use that ID to search and add custom artwork!

### Edit Label Artwork

Click any cartridge to update its label artwork:

- **Drag-and-drop** image upload (PNG, JPG, WebP)
- **Automatic resizing** to the required 74x86 pixel format
- **Preview** your current and new labels side-by-side
- **Delete** cartridge entries you no longer need

![Edit Cartridge](src/assets/screenshots/Edit%20Cartridge.png)

### Add Custom Cartridges

Full support for homebrew, reproduction carts, and flash carts:

- Enter the 8-character hex cart ID (found in your SD card's `Library/N64/` folder structure)
- **Automatic game lookup** - if we recognize the cart ID, we'll fill in the game name, region, and other metadata automatically
- Set **custom names** for unknown cartridges like flash carts or homebrew
- Upload artwork for any cartridge, known or unknown

This is especially useful for **flash cart users** - just insert your flash cart, grab the ID from your SD card, and add custom artwork for it right away.

![Add New Cartridge](src/assets/screenshots/Add%20New%20Cartridge.png)

### Import & Export

Flexible options for managing your labels database:

- **Import** existing `labels.db` files with three merge modes:
  - **Replace** - Start fresh with the imported database
  - **Merge (overwrite)** - Add new labels and update existing ones
  - **Merge (skip)** - Add new labels but preserve your existing artwork
- **Export** your `labels.db` for manual backup or sharing

### Sync to SD Card

Seamlessly sync your labels to your Analogue 3D:

- **Auto-detect** connected Analogue 3D SD cards
- **Preview changes** before syncing
- **Real-time progress** with transfer speed and ETA
- **Manual export** option if you prefer to copy files yourself

![Sync to SD Card](src/assets/screenshots/Sync%20to%20SD%20Card.png)

![Sync Progress](src/assets/screenshots/Sync%20Progress.png)

### Safe by Default

Your SD card is never modified without your explicit approval:

- All edits are stored locally first
- Preview exactly what will change before syncing
- Confirmation dialogs for destructive operations
- Export and backup your database anytime

### Pre-Built Cart Database

We've done the heavy lifting so you don't have to:

- **340+ Analogue 3D cart IDs** already mapped and annotated
- Each entry includes game name, region, language, video mode, and more
- Just enter a cart ID and we'll automatically fill in all the details
- Community-driven - help us expand the database by contributing!

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- An Analogue 3D with an SD card

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/analogue-3d-cart-art.git
cd analogue-3d-cart-art

# Install dependencies
npm install

# Start the application
npm run dev
```

The app will open at `http://localhost:5173` with the backend API running on port 3001.

### Quick Start

1. **Import your existing labels** - If you have a `labels.db` from your Analogue 3D, import it to get started
2. **Browse and edit** - Search for games, click to edit labels, upload your artwork
3. **Add new cartridges** - Add entries for homebrew or carts not in the database
4. **Sync to SD card** - Connect your Analogue 3D SD card and sync your changes

---

## How It Works

The Analogue 3D identifies N64 cartridges using a CRC32 checksum of the first 8 KiB of ROM data. This creates a unique 8-character hex ID for each cartridge. A3D Manager lets you associate custom label artwork with these IDs, stored in the `labels.db` file on your SD card.

The app stores your changes locally in `.local/` until you explicitly sync. This means your SD card is never modified accidentally.

### Technical Documentation

- [Labels DB Specification](docs/LABELS_DB_SPECIFICATION.md) - Binary format details
- [Cart ID Algorithm](docs/CART_ID_ALGORITHM.md) - How cartridge identification works
- [SD Card Format](docs/ANALOGUE_3D_SD_CARD_FORMAT.md) - Analogue 3D SD card structure

---

## Roadmap

We have exciting features planned for future releases:

### Hardware & Display Settings Manager
Manage per-game hardware and display settings for your Analogue 3D. Export and import controls for sharing configurations with the community or backing up your personal settings.

### Game Pak Manager
Back up, restore, and share game paks for different games. Full support for importing and exporting game pak configurations.

### Comprehensive Export/Import System
Granular and bulk export/import of settings, labels, game paks, and more. Perfect for personal backups or sharing your entire setup with others.

### Flash Cart & Homebrew Title Support
If Analogue enables the ability to provide custom titles for flash carts and homebrew cartridges, we'd love to add support for this feature. Currently this is a system limitation on the Analogue 3D side.

---

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Image Processing**: Sharp

---

## Disclaimer

A3D Manager is an unofficial, community-created tool and is not affiliated with, endorsed by, or connected to Analogue, Inc. Use at your own risk. Always back up your SD card before making changes.

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

MIT License - see [LICENSE](LICENSE) for details.
