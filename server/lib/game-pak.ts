import { readFile, writeFile, stat, copyFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { findGameFolder, ensureLocalGameFolder, getLocalGamesDir } from './cartridge-settings.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * N64 Controller Pak size: 256Kbit = 32KB = 32,768 bytes
 * This is the standard size for all controller pak images.
 */
export const CONTROLLER_PAK_SIZE = 32768;

/**
 * Controller Pak structure:
 * - 123 pages of 256 bytes each
 * - First pages contain index/allocation tables
 * - Remaining pages store actual save data
 */
export const CONTROLLER_PAK_PAGE_SIZE = 256;
export const CONTROLLER_PAK_PAGE_COUNT = 123;

export const GAME_PAK_FILENAME = 'controller_pak.img';

// =============================================================================
// Types
// =============================================================================

export interface GamePakSaveDetails {
  pagesUsed: number;
  pagesFree: number;
  percentUsed: number;
}

export interface GamePakInfo {
  exists: boolean;
  source: 'local' | 'sd';
  path: string;
  size?: number;
  lastModified?: string;
  isValidSize?: boolean;
  saveInfo?: GamePakSaveDetails;
}

// =============================================================================
// Path Helpers
// =============================================================================

/**
 * Get the game pak path for a cart ID in local storage
 */
export async function getLocalGamePakPath(cartId: string): Promise<string | null> {
  const localGamesDir = getLocalGamesDir();
  const gameFolder = await findGameFolder(localGamesDir, cartId);
  if (!gameFolder) {
    return null;
  }
  return path.join(gameFolder, GAME_PAK_FILENAME);
}

/**
 * Get the game pak path for a cart ID on SD card
 */
export async function getSDGamePakPath(sdCardPath: string, cartId: string): Promise<string | null> {
  const gamesDir = path.join(sdCardPath, 'Library', 'N64', 'Games');
  const gameFolder = await findGameFolder(gamesDir, cartId);
  if (!gameFolder) {
    return null;
  }
  return path.join(gameFolder, GAME_PAK_FILENAME);
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate a game pak buffer
 */
export function validateGamePak(buffer: Buffer): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (buffer.length !== CONTROLLER_PAK_SIZE) {
    errors.push(
      `Invalid size: ${buffer.length} bytes (expected ${CONTROLLER_PAK_SIZE} bytes)`
    );
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a game pak file
 */
export async function validateGamePakFile(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
  if (!existsSync(filePath)) {
    return { valid: false, errors: ['File does not exist'] };
  }

  try {
    const stats = await stat(filePath);
    if (stats.size !== CONTROLLER_PAK_SIZE) {
      return {
        valid: false,
        errors: [`Invalid size: ${stats.size} bytes (expected ${CONTROLLER_PAK_SIZE} bytes)`],
      };
    }
    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Get game pak info for a cartridge (checks both local and SD)
 */
export async function getGamePakInfo(
  cartId: string,
  sdCardPath?: string
): Promise<{ local: GamePakInfo; sd: GamePakInfo | null }> {
  // Check local
  const localPath = await getLocalGamePakPath(cartId);
  const localInfo: GamePakInfo = {
    exists: false,
    source: 'local',
    path: localPath || '',
  };

  if (localPath && existsSync(localPath)) {
    try {
      const stats = await stat(localPath);
      localInfo.exists = true;
      localInfo.size = stats.size;
      localInfo.lastModified = stats.mtime.toISOString();
      localInfo.isValidSize = stats.size === CONTROLLER_PAK_SIZE;

      // Include save info if valid size
      if (stats.size === CONTROLLER_PAK_SIZE) {
        const buffer = await readFile(localPath);
        localInfo.saveInfo = getGamePakSaveInfo(buffer);
      }
    } catch (error) {
      console.error('Error reading local game pak:', error);
    }
  }

  // Check SD card if path provided
  let sdInfo: GamePakInfo | null = null;
  if (sdCardPath) {
    const sdPath = await getSDGamePakPath(sdCardPath, cartId);
    sdInfo = {
      exists: false,
      source: 'sd',
      path: sdPath || '',
    };

    if (sdPath && existsSync(sdPath)) {
      try {
        const stats = await stat(sdPath);
        sdInfo.exists = true;
        sdInfo.size = stats.size;
        sdInfo.lastModified = stats.mtime.toISOString();
        sdInfo.isValidSize = stats.size === CONTROLLER_PAK_SIZE;

        // Include save info if valid size
        if (stats.size === CONTROLLER_PAK_SIZE) {
          const buffer = await readFile(sdPath);
          sdInfo.saveInfo = getGamePakSaveInfo(buffer);
        }
      } catch (error) {
        console.error('Error reading SD game pak:', error);
      }
    }
  }

  return { local: localInfo, sd: sdInfo };
}

/**
 * Read a game pak file
 */
export async function readGamePak(filePath: string): Promise<Buffer> {
  return readFile(filePath);
}

/**
 * Read local game pak for a cartridge
 */
export async function readLocalGamePak(cartId: string): Promise<Buffer | null> {
  const localPath = await getLocalGamePakPath(cartId);

  if (!localPath || !existsSync(localPath)) {
    return null;
  }

  return readFile(localPath);
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Save a game pak to local storage
 */
export async function saveLocalGamePak(
  cartId: string,
  buffer: Buffer,
  title: string = 'Unknown Cartridge'
): Promise<string> {
  // Validate the buffer
  const validation = validateGamePak(buffer);
  if (!validation.valid) {
    throw new Error(`Invalid game pak: ${validation.errors.join(', ')}`);
  }

  const folderPath = await ensureLocalGameFolder(cartId, title);
  const gamePakPath = path.join(folderPath, GAME_PAK_FILENAME);

  await writeFile(gamePakPath, buffer);

  return gamePakPath;
}

/**
 * Copy game pak from SD card to local storage
 */
export async function downloadGamePakFromSD(
  cartId: string,
  sdCardPath: string,
  title: string = 'Unknown Cartridge'
): Promise<{ success: boolean; path?: string; error?: string }> {
  const sdGamePakPath = await getSDGamePakPath(sdCardPath, cartId);

  if (!sdGamePakPath || !existsSync(sdGamePakPath)) {
    return { success: false, error: 'Game pak not found on SD card' };
  }

  // Validate the SD card file
  const validation = await validateGamePakFile(sdGamePakPath);
  if (!validation.valid) {
    return { success: false, error: `Invalid game pak: ${validation.errors.join(', ')}` };
  }

  try {
    const folderPath = await ensureLocalGameFolder(cartId, title);
    const localPath = path.join(folderPath, GAME_PAK_FILENAME);

    await copyFile(sdGamePakPath, localPath);

    return { success: true, path: localPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete local game pak for a cartridge
 */
export async function deleteLocalGamePak(cartId: string): Promise<boolean> {
  const localPath = await getLocalGamePakPath(cartId);

  if (!localPath || !existsSync(localPath)) {
    return false;
  }

  await unlink(localPath);
  return true;
}

/**
 * Upload local game pak to SD card
 */
export async function uploadGamePakToSD(
  cartId: string,
  sdCardPath: string,
  title: string = 'Unknown Cartridge'
): Promise<{ success: boolean; path?: string; error?: string }> {
  // Get local game pak
  const localPath = await getLocalGamePakPath(cartId);

  if (!localPath || !existsSync(localPath)) {
    return { success: false, error: 'No local game pak found' };
  }

  // Validate the local file
  const validation = await validateGamePakFile(localPath);
  if (!validation.valid) {
    return { success: false, error: `Invalid game pak: ${validation.errors.join(', ')}` };
  }

  // Find or determine SD game folder
  const gamesDir = path.join(sdCardPath, 'Library', 'N64', 'Games');
  let sdGameFolder = await findGameFolder(gamesDir, cartId);

  if (!sdGameFolder) {
    // Need to create the folder
    const normalizedId = cartId.toLowerCase();
    const folderName = `${title} ${normalizedId}`;
    sdGameFolder = path.join(gamesDir, folderName);
    await mkdir(sdGameFolder, { recursive: true });
  }

  try {
    const sdGamePakPath = path.join(sdGameFolder, GAME_PAK_FILENAME);
    await copyFile(localPath, sdGamePakPath);
    return { success: true, path: sdGamePakPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create an empty (formatted) controller pak
 * This creates a properly formatted empty controller pak with valid header structure
 */
export function createEmptyGamePak(): Buffer {
  const buffer = Buffer.alloc(CONTROLLER_PAK_SIZE, 0x00);

  // The controller pak has a specific header structure
  // First 32 bytes are the label area (usually 0x81 for empty)
  for (let i = 0; i < 32; i++) {
    buffer[i] = 0x81;
  }

  // ID area at offset 0x20-0x3F (repeated at 0x60, 0x80, 0xC0)
  // These contain checksum and format info
  const idAreas = [0x20, 0x60, 0x80, 0xC0];
  for (const offset of idAreas) {
    buffer[offset] = 0xFF;
    buffer[offset + 1] = 0xFF;
    buffer[offset + 2] = 0xFF;
    buffer[offset + 3] = 0xFF;
  }

  // Index table starts at 0x100 (256)
  // Each index entry is 2 bytes
  // First 5 pages (0-4) are reserved for system
  // Mark them as system pages (0x0001)
  for (let i = 0; i < 5; i++) {
    const offset = 0x100 + i * 2;
    buffer[offset] = 0x00;
    buffer[offset + 1] = 0x01;
  }

  // Mark remaining pages as free (0x0003)
  for (let i = 5; i < 128; i++) {
    const offset = 0x100 + i * 2;
    buffer[offset] = 0x00;
    buffer[offset + 1] = 0x03;
  }

  return buffer;
}

/**
 * Check if a game pak is empty (no save data)
 */
export function isGamePakEmpty(buffer: Buffer): boolean {
  if (buffer.length !== CONTROLLER_PAK_SIZE) {
    return false;
  }

  // Check the index table to see if any pages are in use (not 0x0003 = free)
  // Pages 0-4 are system pages, so we check from page 5 onwards
  for (let i = 5; i < 128; i++) {
    const offset = 0x100 + i * 2;
    const status = buffer.readUInt16BE(offset);

    // 0x0003 means free, anything else means in use
    if (status !== 0x0003) {
      return false;
    }
  }

  return true;
}

/**
 * Get information about save data in a game pak
 */
export function getGamePakSaveInfo(buffer: Buffer): {
  pagesUsed: number;
  pagesFree: number;
  percentUsed: number;
} {
  if (buffer.length !== CONTROLLER_PAK_SIZE) {
    return { pagesUsed: 0, pagesFree: 0, percentUsed: 0 };
  }

  let pagesUsed = 0;
  let pagesFree = 0;

  // Check pages 5-127 (0-4 are system pages)
  for (let i = 5; i < 128; i++) {
    const offset = 0x100 + i * 2;
    const status = buffer.readUInt16BE(offset);

    if (status === 0x0003) {
      pagesFree++;
    } else {
      pagesUsed++;
    }
  }

  const totalUserPages = 123; // 128 - 5 system pages
  const percentUsed = Math.round((pagesUsed / totalUserPages) * 100);

  return { pagesUsed, pagesFree, percentUsed };
}
