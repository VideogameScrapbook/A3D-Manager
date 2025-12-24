/**
 * Bundle Archive Library
 *
 * Handles creation and parsing of .a3d bundle archives.
 * These are ZIP files containing:
 * - manifest.json (metadata about contents)
 * - labels.db (the label database)
 * - settings/<cartId>/settings.json (per-game settings)
 * - game-paks/<cartId>/controller_pak.img (per-game save data)
 * - owned-carts.json (ownership list)
 */

import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { existsSync } from 'fs';
import { readFile, readdir, mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { Writable } from 'stream';

// Paths
const LOCAL_DIR = path.join(process.cwd(), '.local');
const LABELS_DB_PATH = path.join(LOCAL_DIR, 'labels.db');
const OWNED_CARTS_PATH = path.join(LOCAL_DIR, 'owned-carts.json');
const SETTINGS_DIR = path.join(LOCAL_DIR, 'settings');
const GAME_PAKS_DIR = path.join(LOCAL_DIR, 'game-paks');

export interface BundleManifest {
  version: 1;
  createdAt: string;
  appVersion: string;
  contents: {
    hasLabelsDb: boolean;
    hasOwnedCarts: boolean;
    settingsCount: number;
    gamePaksCount: number;
    cartIds: string[];
  };
}

export interface BundleContents {
  manifest: BundleManifest;
  labelsDb?: Buffer;
  ownedCarts?: {
    version: number;
    cartridges: Array<{ cartId: string; addedAt: string; source: string }>;
  };
  settings: Map<string, object>;
  gamePaks: Map<string, Buffer>;
}

export type MergeStrategy = 'skip' | 'overwrite' | 'keep-both';

export interface ImportOptions {
  importLabels: boolean;
  importOwnership: boolean;
  importSettings: boolean;
  importGamePaks: boolean;
  mergeStrategy: MergeStrategy;
}

export interface ImportResult {
  success: boolean;
  labelsImported: boolean;
  ownershipMerged: { added: number; skipped: number };
  settingsImported: { added: number; skipped: number; overwritten: number };
  gamePaksImported: { added: number; skipped: number; overwritten: number };
  errors: string[];
}

/**
 * Create a bundle archive containing selected data
 */
export async function createBundle(options: {
  includeLabels?: boolean;
  includeOwnership?: boolean;
  includeSettings?: boolean;
  includeGamePaks?: boolean;
  cartIds?: string[]; // If provided, only include these carts' settings/paks
}): Promise<Buffer> {
  const {
    includeLabels = true,
    includeOwnership = true,
    includeSettings = true,
    includeGamePaks = true,
    cartIds,
  } = options;

  // Collect data
  const settingsMap = new Map<string, Buffer>();
  const gamePaksMap = new Map<string, Buffer>();
  const allCartIds = new Set<string>();

  // Collect settings
  if (includeSettings && existsSync(SETTINGS_DIR)) {
    const settingsDirs = await readdir(SETTINGS_DIR);
    for (const cartId of settingsDirs) {
      if (cartIds && !cartIds.includes(cartId.toLowerCase())) continue;
      const settingsPath = path.join(SETTINGS_DIR, cartId, 'settings.json');
      if (existsSync(settingsPath)) {
        settingsMap.set(cartId, await readFile(settingsPath));
        allCartIds.add(cartId.toLowerCase());
      }
    }
  }

  // Collect game paks
  if (includeGamePaks && existsSync(GAME_PAKS_DIR)) {
    const pakDirs = await readdir(GAME_PAKS_DIR);
    for (const cartId of pakDirs) {
      if (cartIds && !cartIds.includes(cartId.toLowerCase())) continue;
      const pakPath = path.join(GAME_PAKS_DIR, cartId, 'controller_pak.img');
      if (existsSync(pakPath)) {
        gamePaksMap.set(cartId, await readFile(pakPath));
        allCartIds.add(cartId.toLowerCase());
      }
    }
  }

  // Check for labels.db
  const hasLabelsDb = includeLabels && existsSync(LABELS_DB_PATH);
  const hasOwnedCarts = includeOwnership && existsSync(OWNED_CARTS_PATH);

  // Create manifest
  const manifest: BundleManifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    appVersion: '1.0.0',
    contents: {
      hasLabelsDb,
      hasOwnedCarts,
      settingsCount: settingsMap.size,
      gamePaksCount: gamePaksMap.size,
      cartIds: Array.from(allCartIds).sort(),
    },
  };

  // Create ZIP archive
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', reject);
    archive.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    archive.pipe(writable);

    // Add manifest
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // Add labels.db
    if (hasLabelsDb) {
      archive.file(LABELS_DB_PATH, { name: 'labels.db' });
    }

    // Add owned-carts.json
    if (hasOwnedCarts) {
      archive.file(OWNED_CARTS_PATH, { name: 'owned-carts.json' });
    }

    // Add settings
    for (const [cartId, buffer] of settingsMap) {
      archive.append(buffer, { name: `settings/${cartId}/settings.json` });
    }

    // Add game paks
    for (const [cartId, buffer] of gamePaksMap) {
      archive.append(buffer, { name: `game-paks/${cartId}/controller_pak.img` });
    }

    archive.finalize();
  });
}

/**
 * Parse a bundle archive and return its contents
 */
export async function parseBundle(buffer: Buffer): Promise<BundleContents> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  let manifest: BundleManifest | null = null;
  let labelsDb: Buffer | undefined;
  let ownedCarts: BundleContents['ownedCarts'] | undefined;
  const settings = new Map<string, object>();
  const gamePaks = new Map<string, Buffer>();

  for (const entry of entries) {
    const name = entry.entryName;

    if (name === 'manifest.json') {
      const content = entry.getData().toString('utf8');
      manifest = JSON.parse(content) as BundleManifest;
    } else if (name === 'labels.db') {
      labelsDb = entry.getData();
    } else if (name === 'owned-carts.json') {
      const content = entry.getData().toString('utf8');
      ownedCarts = JSON.parse(content);
    } else if (name.startsWith('settings/') && name.endsWith('/settings.json')) {
      const cartId = name.split('/')[1];
      const content = entry.getData().toString('utf8');
      settings.set(cartId, JSON.parse(content));
    } else if (name.startsWith('game-paks/') && name.endsWith('/controller_pak.img')) {
      const cartId = name.split('/')[1];
      gamePaks.set(cartId, entry.getData());
    }
  }

  if (!manifest) {
    throw new Error('Invalid bundle: missing manifest.json');
  }

  return {
    manifest,
    labelsDb,
    ownedCarts,
    settings,
    gamePaks,
  };
}

/**
 * Get information about a bundle without fully extracting it
 */
export async function getBundleInfo(buffer: Buffer): Promise<BundleManifest> {
  const zip = new AdmZip(buffer);
  const manifestEntry = zip.getEntry('manifest.json');

  if (!manifestEntry) {
    throw new Error('Invalid bundle: missing manifest.json');
  }

  const content = manifestEntry.getData().toString('utf8');
  return JSON.parse(content) as BundleManifest;
}

/**
 * Import a bundle with specified options
 */
export async function importBundle(
  buffer: Buffer,
  options: ImportOptions
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    labelsImported: false,
    ownershipMerged: { added: 0, skipped: 0 },
    settingsImported: { added: 0, skipped: 0, overwritten: 0 },
    gamePaksImported: { added: 0, skipped: 0, overwritten: 0 },
    errors: [],
  };

  try {
    const bundle = await parseBundle(buffer);

    // Ensure local directory exists
    await mkdir(LOCAL_DIR, { recursive: true });

    // Import labels.db
    if (options.importLabels && bundle.labelsDb) {
      const existingLabels = existsSync(LABELS_DB_PATH);

      if (!existingLabels || options.mergeStrategy === 'overwrite') {
        await writeFile(LABELS_DB_PATH, bundle.labelsDb);
        result.labelsImported = true;
      } else if (options.mergeStrategy === 'skip') {
        // Skip - labels already exist
      } else {
        // keep-both - for labels.db, we'll just overwrite since merging is complex
        // Could implement label-by-label merge in the future
        await writeFile(LABELS_DB_PATH, bundle.labelsDb);
        result.labelsImported = true;
      }
    }

    // Import ownership
    if (options.importOwnership && bundle.ownedCarts) {
      let existingOwned: { version: number; cartridges: Array<{ cartId: string; addedAt: string; source: string }> } = {
        version: 1,
        cartridges: [],
      };

      if (existsSync(OWNED_CARTS_PATH)) {
        const content = await readFile(OWNED_CARTS_PATH, 'utf8');
        existingOwned = JSON.parse(content);
      }

      const existingIds = new Set(existingOwned.cartridges.map(c => c.cartId.toLowerCase()));

      for (const cart of bundle.ownedCarts.cartridges) {
        const normalizedId = cart.cartId.toLowerCase();
        if (existingIds.has(normalizedId)) {
          result.ownershipMerged.skipped++;
        } else {
          existingOwned.cartridges.push({
            ...cart,
            cartId: normalizedId,
          });
          existingIds.add(normalizedId);
          result.ownershipMerged.added++;
        }
      }

      await writeFile(OWNED_CARTS_PATH, JSON.stringify(existingOwned, null, 2));
    }

    // Import settings
    if (options.importSettings && bundle.settings.size > 0) {
      await mkdir(SETTINGS_DIR, { recursive: true });

      for (const [cartId, settingsObj] of bundle.settings) {
        const cartDir = path.join(SETTINGS_DIR, cartId);
        const settingsPath = path.join(cartDir, 'settings.json');
        const exists = existsSync(settingsPath);

        if (!exists) {
          await mkdir(cartDir, { recursive: true });
          await writeFile(settingsPath, JSON.stringify(settingsObj, null, 2));
          result.settingsImported.added++;
        } else if (options.mergeStrategy === 'overwrite') {
          await writeFile(settingsPath, JSON.stringify(settingsObj, null, 2));
          result.settingsImported.overwritten++;
        } else if (options.mergeStrategy === 'skip') {
          result.settingsImported.skipped++;
        } else {
          // keep-both - not really applicable for settings, treat as skip
          result.settingsImported.skipped++;
        }
      }
    }

    // Import game paks
    if (options.importGamePaks && bundle.gamePaks.size > 0) {
      await mkdir(GAME_PAKS_DIR, { recursive: true });

      for (const [cartId, pakBuffer] of bundle.gamePaks) {
        const cartDir = path.join(GAME_PAKS_DIR, cartId);
        const pakPath = path.join(cartDir, 'controller_pak.img');
        const exists = existsSync(pakPath);

        if (!exists) {
          await mkdir(cartDir, { recursive: true });
          await writeFile(pakPath, pakBuffer);
          result.gamePaksImported.added++;
        } else if (options.mergeStrategy === 'overwrite') {
          await writeFile(pakPath, pakBuffer);
          result.gamePaksImported.overwritten++;
        } else if (options.mergeStrategy === 'skip') {
          result.gamePaksImported.skipped++;
        } else {
          // keep-both - not really applicable for game paks, treat as skip
          result.gamePaksImported.skipped++;
        }
      }
    }

    result.success = true;
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Unknown error');
  }

  return result;
}

/**
 * Create a bundle for specific cartridges (for selection export)
 */
export async function createSelectionBundle(cartIds: string[]): Promise<Buffer> {
  return createBundle({
    includeLabels: false, // Don't include full labels.db for selection
    includeOwnership: false,
    includeSettings: true,
    includeGamePaks: true,
    cartIds: cartIds.map(id => id.toLowerCase()),
  });
}
