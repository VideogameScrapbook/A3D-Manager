/**
 * Partial sync utilities for labels.db files
 *
 * Enables updating only changed entries without rewriting the entire file
 */

import { open, copyFile, stat } from 'fs/promises';
import {
  ID_TABLE_START,
  DATA_START,
  IMAGE_SLOT_SIZE,
} from './labels-db-core.js';
import { compareDetailed } from './labels-db-compare.js';

export interface SyncProgress {
  phase: 'comparing' | 'syncing';
  current: number;
  total: number;
  currentCartId?: string;
}

export interface SyncResult {
  success: boolean;
  entriesUpdated: number;
  bytesWritten: number;
  durationMs: number;
  breakdown: {
    compareMs: number;
    writeMs: number;
  };
}

/**
 * Sync only changed entries from source to destination
 * Much faster than copying the entire file when only a few entries differ
 */
export async function syncChangedEntries(
  sourcePath: string,
  destPath: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResult> {
  const startTime = performance.now();
  let compareMs = 0;
  let writeMs = 0;

  // Step 1: Find differences
  onProgress?.({ phase: 'comparing', current: 0, total: 1 });
  const compareStart = performance.now();
  const diff = await compareDetailed(sourcePath, destPath, { fullImageHash: true });
  compareMs = performance.now() - compareStart;

  // Only sync modified entries (entries that exist in both with different images)
  // Added/removed entries require rebuilding the file structure
  const toSync = diff.modified;

  if (toSync.length === 0) {
    return {
      success: true,
      entriesUpdated: 0,
      bytesWritten: 0,
      durationMs: performance.now() - startTime,
      breakdown: { compareMs, writeMs: 0 },
    };
  }

  // Step 2: Read source file to get ID-to-index mapping
  const sourceHandle = await open(sourcePath, 'r');
  const destHandle = await open(destPath, 'r+'); // Open for reading and writing

  try {
    // Get source ID table
    const sourceStats = await stat(sourcePath);
    const sourceSize = sourceStats.size;
    const sourceEntryCount = Math.floor((sourceSize - DATA_START) / IMAGE_SLOT_SIZE);

    const sourceIdBuffer = Buffer.alloc(sourceEntryCount * 4);
    await sourceHandle.read(sourceIdBuffer, 0, sourceEntryCount * 4, ID_TABLE_START);

    const sourceIdToIndex = new Map<number, number>();
    for (let i = 0; i < sourceEntryCount; i++) {
      const cartId = sourceIdBuffer.readUInt32LE(i * 4);
      if (cartId === 0xffffffff) break;
      sourceIdToIndex.set(cartId, i);
    }

    // Get dest ID table
    const destStats = await stat(destPath);
    const destSize = destStats.size;
    const destEntryCount = Math.floor((destSize - DATA_START) / IMAGE_SLOT_SIZE);

    const destIdBuffer = Buffer.alloc(destEntryCount * 4);
    await destHandle.read(destIdBuffer, 0, destEntryCount * 4, ID_TABLE_START);

    const destIdToIndex = new Map<number, number>();
    for (let i = 0; i < destEntryCount; i++) {
      const cartId = destIdBuffer.readUInt32LE(i * 4);
      if (cartId === 0xffffffff) break;
      destIdToIndex.set(cartId, i);
    }

    // Step 3: Copy changed image data
    const writeStart = performance.now();
    let bytesWritten = 0;

    for (let i = 0; i < toSync.length; i++) {
      const cartIdHex = toSync[i];
      const cartId = parseInt(cartIdHex, 16);

      onProgress?.({
        phase: 'syncing',
        current: i + 1,
        total: toSync.length,
        currentCartId: cartIdHex,
      });

      const sourceIndex = sourceIdToIndex.get(cartId);
      const destIndex = destIdToIndex.get(cartId);

      if (sourceIndex === undefined || destIndex === undefined) {
        continue; // Skip if not found in both
      }

      // Read image data from source
      const sourceOffset = DATA_START + sourceIndex * IMAGE_SLOT_SIZE;
      const imageBuffer = Buffer.alloc(IMAGE_SLOT_SIZE);
      await sourceHandle.read(imageBuffer, 0, IMAGE_SLOT_SIZE, sourceOffset);

      // Write to destination at the correct offset
      const destOffset = DATA_START + destIndex * IMAGE_SLOT_SIZE;
      await destHandle.write(imageBuffer, 0, IMAGE_SLOT_SIZE, destOffset);

      bytesWritten += IMAGE_SLOT_SIZE;
    }

    writeMs = performance.now() - writeStart;

    return {
      success: true,
      entriesUpdated: toSync.length,
      bytesWritten,
      durationMs: performance.now() - startTime,
      breakdown: { compareMs, writeMs },
    };
  } finally {
    await sourceHandle.close();
    await destHandle.close();
  }
}

/**
 * Modify specific entries in a labels.db file to create test differences
 */
export async function createModifiedLabelsDb(
  sourcePath: string,
  destPath: string,
  modifyCount: number
): Promise<{ modifiedCartIds: string[] }> {
  // First copy the file
  await copyFile(sourcePath, destPath);

  // Then modify some entries
  const fileHandle = await open(destPath, 'r+');

  try {
    const stats = await stat(destPath);
    const fileSize = stats.size;
    const entryCount = Math.floor((fileSize - DATA_START) / IMAGE_SLOT_SIZE);

    // Read ID table
    const idBuffer = Buffer.alloc(entryCount * 4);
    await fileHandle.read(idBuffer, 0, entryCount * 4, ID_TABLE_START);

    const modifiedCartIds: string[] = [];

    // Modify entries spread across the file
    for (let i = 0; i < Math.min(modifyCount, entryCount); i++) {
      const index = Math.floor(i * entryCount / modifyCount);
      const cartId = idBuffer.readUInt32LE(index * 4);
      modifiedCartIds.push(cartId.toString(16).padStart(8, '0'));

      // Modify the image data (flip some bytes)
      const offset = DATA_START + index * IMAGE_SLOT_SIZE;
      const modifyBuffer = Buffer.alloc(100);
      await fileHandle.read(modifyBuffer, 0, 100, offset);

      for (let j = 0; j < 100; j++) {
        modifyBuffer[j] = (modifyBuffer[j] + 50) % 256;
      }

      await fileHandle.write(modifyBuffer, 0, 100, offset);
    }

    return { modifiedCartIds };
  } finally {
    await fileHandle.close();
  }
}
