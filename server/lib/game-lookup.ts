/**
 * Game name lookup utility
 *
 * Provides a way to look up game names from the cart database.
 */

import { readFile } from 'fs/promises';
import path from 'path';

interface CartNameEntry {
  id: string;
  name: string;
  region?: string;
  languages?: string[];
  videoMode?: 'NTSC' | 'PAL' | 'Unknown';
  gameCode?: string;
}

let cartNameMap: Map<string, CartNameEntry> = new Map();
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;

  try {
    const dbPath = path.join(process.cwd(), 'data', 'cart-database.json');
    const content = await readFile(dbPath, 'utf-8');
    const database = JSON.parse(content);
    cartNameMap = new Map();

    for (const cart of database.carts || []) {
      cartNameMap.set(cart.id.toLowerCase(), cart);
    }
    loaded = true;
  } catch (error) {
    console.error('Error loading cart database for game lookup:', error);
    loaded = true; // Don't try again
  }
}

/**
 * Look up a game name by cart ID
 * @param cartId The 8-character hex cart ID
 * @returns The game name if found, or undefined if not found
 */
export async function lookupGameName(cartId: string): Promise<string | undefined> {
  await ensureLoaded();
  const entry = cartNameMap.get(cartId.toLowerCase());
  return entry?.name;
}
