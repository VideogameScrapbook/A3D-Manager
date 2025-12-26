import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// =============================================================================
// Types
// =============================================================================

export interface OwnedCartridge {
  cartId: string;
  addedAt: string;
  source: 'sd-card' | 'manual';
}

export interface OwnedCartsData {
  version: 1;
  cartridges: OwnedCartridge[];
}

// =============================================================================
// Constants
// =============================================================================

const LOCAL_DIR = path.join(process.cwd(), '.local');
const OWNED_CARTS_PATH = path.join(LOCAL_DIR, 'owned-carts.json');

// =============================================================================
// File Operations
// =============================================================================

/**
 * Ensure the .local directory exists
 */
async function ensureLocalDir(): Promise<void> {
  if (!existsSync(LOCAL_DIR)) {
    await mkdir(LOCAL_DIR, { recursive: true });
  }
}

/**
 * Get the path to the owned carts file
 */
export function getOwnedCartsPath(): string {
  return OWNED_CARTS_PATH;
}

/**
 * Check if the owned carts file exists
 */
export function hasOwnedCartsFile(): boolean {
  return existsSync(OWNED_CARTS_PATH);
}

/**
 * Load owned carts data from disk
 */
export async function loadOwnedCarts(): Promise<OwnedCartsData> {
  if (!hasOwnedCartsFile()) {
    return { version: 1, cartridges: [] };
  }

  try {
    const content = await readFile(OWNED_CARTS_PATH, 'utf-8');
    const data = JSON.parse(content) as OwnedCartsData;

    // Validate structure
    if (!data.version || !Array.isArray(data.cartridges)) {
      console.warn('Invalid owned-carts.json structure, returning empty');
      return { version: 1, cartridges: [] };
    }

    return data;
  } catch (error) {
    console.error('Error loading owned carts:', error);
    return { version: 1, cartridges: [] };
  }
}

/**
 * Save owned carts data to disk
 */
export async function saveOwnedCarts(data: OwnedCartsData): Promise<void> {
  await ensureLocalDir();
  await writeFile(OWNED_CARTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Get all owned cartridge IDs
 */
export async function getOwnedCartIds(): Promise<string[]> {
  const data = await loadOwnedCarts();
  return data.cartridges.map(c => c.cartId);
}

/**
 * Get all owned cartridges with full details
 */
export async function getOwnedCartridges(): Promise<OwnedCartridge[]> {
  const data = await loadOwnedCarts();
  return data.cartridges;
}

/**
 * Check if a cartridge is owned
 */
export async function isCartridgeOwned(cartId: string): Promise<boolean> {
  const normalizedId = cartId.toLowerCase();
  const data = await loadOwnedCarts();
  return data.cartridges.some(c => c.cartId.toLowerCase() === normalizedId);
}

/**
 * Get ownership details for a cartridge
 */
export async function getOwnedCartridge(cartId: string): Promise<OwnedCartridge | null> {
  const normalizedId = cartId.toLowerCase();
  const data = await loadOwnedCarts();
  return data.cartridges.find(c => c.cartId.toLowerCase() === normalizedId) || null;
}

/**
 * Mark a cartridge as owned
 */
export async function addOwnedCartridge(
  cartId: string,
  source: 'sd-card' | 'manual' = 'manual'
): Promise<OwnedCartridge> {
  const normalizedId = cartId.toLowerCase();
  const data = await loadOwnedCarts();

  // Check if already owned
  const existing = data.cartridges.find(c => c.cartId.toLowerCase() === normalizedId);
  if (existing) {
    return existing;
  }

  const newEntry: OwnedCartridge = {
    cartId: normalizedId,
    addedAt: new Date().toISOString(),
    source,
  };

  data.cartridges.push(newEntry);
  await saveOwnedCarts(data);

  return newEntry;
}

/**
 * Mark multiple cartridges as owned (batch operation)
 */
export async function addOwnedCartridges(
  cartIds: string[],
  source: 'sd-card' | 'manual' = 'manual'
): Promise<{ added: string[]; skipped: string[] }> {
  const data = await loadOwnedCarts();
  const existingIds = new Set(data.cartridges.map(c => c.cartId.toLowerCase()));

  const added: string[] = [];
  const skipped: string[] = [];
  const now = new Date().toISOString();

  for (const cartId of cartIds) {
    const normalizedId = cartId.toLowerCase();

    if (existingIds.has(normalizedId)) {
      skipped.push(normalizedId);
    } else {
      data.cartridges.push({
        cartId: normalizedId,
        addedAt: now,
        source,
      });
      existingIds.add(normalizedId);
      added.push(normalizedId);
    }
  }

  if (added.length > 0) {
    await saveOwnedCarts(data);
  }

  return { added, skipped };
}

/**
 * Remove ownership marking from a cartridge
 */
export async function removeOwnedCartridge(cartId: string): Promise<boolean> {
  const normalizedId = cartId.toLowerCase();
  const data = await loadOwnedCarts();

  const initialLength = data.cartridges.length;
  data.cartridges = data.cartridges.filter(c => c.cartId.toLowerCase() !== normalizedId);

  if (data.cartridges.length < initialLength) {
    await saveOwnedCarts(data);
    return true;
  }

  return false;
}

/**
 * Remove ownership from multiple cartridges
 */
export async function removeOwnedCartridges(cartIds: string[]): Promise<number> {
  const normalizedIds = new Set(cartIds.map(id => id.toLowerCase()));
  const data = await loadOwnedCarts();

  const initialLength = data.cartridges.length;
  data.cartridges = data.cartridges.filter(c => !normalizedIds.has(c.cartId.toLowerCase()));

  const removedCount = initialLength - data.cartridges.length;

  if (removedCount > 0) {
    await saveOwnedCarts(data);
  }

  return removedCount;
}

/**
 * Clear all ownership data
 */
export async function clearOwnedCartridges(): Promise<number> {
  const data = await loadOwnedCarts();
  const count = data.cartridges.length;

  data.cartridges = [];
  await saveOwnedCarts(data);

  return count;
}

/**
 * Replace all owned cartridges (useful for sync operations)
 */
export async function replaceOwnedCartridges(
  cartIds: string[],
  source: 'sd-card' | 'manual' = 'sd-card'
): Promise<{ added: number; removed: number }> {
  const data = await loadOwnedCarts();
  const previousCount = data.cartridges.length;

  const now = new Date().toISOString();
  data.cartridges = cartIds.map(cartId => ({
    cartId: cartId.toLowerCase(),
    addedAt: now,
    source,
  }));

  await saveOwnedCarts(data);

  return {
    added: data.cartridges.length,
    removed: previousCount,
  };
}
