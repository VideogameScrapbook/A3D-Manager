# Testing

This document describes the testing infrastructure for A3D Manager.

## Running Tests

From the project root:

```bash
# Run all tests
npx tsx tests/run.ts

# Run with verbose output (writes test artifacts)
npx tsx tests/run.ts --verbose
```

## Test Structure

```
tests/
├── run.ts                  # Unified test runner
├── utils.ts                # Shared test utilities
├── labels-db/
│   ├── tests.ts            # Labels database tests
│   ├── fixtures/           # Test images and data
│   └── output/             # Generated output (gitignored)
└── file-transfer/
    ├── tests.ts            # File transfer tests
    └── output/             # Generated output (gitignored)

server/lib/
├── labels-db-core.ts       # Labels database operations
└── file-transfer.ts        # Progress-enabled file operations
```

## Adding New Tests

1. Create a new directory under `tests/` (e.g., `tests/my-feature/`)
2. Create `tests.ts` that exports a `TestSuite`:

```typescript
import { test, assert, assertEqual, TestSuite } from '../utils.js';

export const myFeatureSuite: TestSuite = {
  name: 'My Feature',
  tests: [
    test('does something', () => {
      assertEqual(1 + 1, 2);
    }),
  ],
};
```

3. Import and add the suite to `tests/run.ts`

## Test Utilities

The shared `utils.ts` provides:

- `test(name, fn)` - Create a test function
- `assert(condition, message)` - Assert a condition is true
- `assertEqual(actual, expected, message)` - Assert equality
- `assertBuffersEqual(actual, expected, message)` - Compare buffers
- `runSuite(suite)` - Run a test suite and collect results
- `printSummary(results)` - Print final summary

---

## Labels Database Tests (34 tests)

Tests for the labels.db file format. See [LABELS_DB_SPECIFICATION.md](./LABELS_DB_SPECIFICATION.md).

| Category | Tests | Description |
|----------|-------|-------------|
| Constants | 4 | Verifies 74x86 dimensions, 25,456 byte image size, 144 byte padding |
| Header | 5 | Header creation, validation, and rejection of invalid headers |
| Color Conversion | 3 | BGRA/RGBA conversion and round-trip preservation |
| Empty Database | 2 | Edge case of empty labels.db with zero entries |
| Round-Trip | 4 | Pixel-perfect verification of write/read cycle |
| CRUD | 10 | Create, Read, Update, Delete with sorted insertion |
| Image Slots | 3 | 144-byte 0xFF padding at end of each slot |
| Binary Format | 2 | Little-endian ID storage and file size formula |

---

## File Transfer Tests (20 tests)

Tests for the progress-enabled file transfer library used by SD card sync.

| Category | Tests | Description |
|----------|-------|-------------|
| Format Helpers | 11 | formatBytes, formatTime, formatSpeed, createProgressBar |
| Single File Copy | 4 | File copying, progress callbacks, speed/ETA, directory creation |
| Directory Copy | 3 | Structure copying, batch progress, byte tracking |
| Edge Cases | 2 | Empty files and empty directories |

---

## Interactive Benchmarks (Settings Page)

The Settings page (`/settings`) includes interactive benchmarks for testing SD card performance with a connected SD card.

### Debug Benchmark

Tests the full sync pipeline:
1. Uploads `labels.db` to SD Card `/Debug` folder
2. Creates a local copy with 50 modified entries
3. Runs quick comparison (file size + ID table hash)
4. Runs detailed comparison (image data hashing)
5. Syncs only the 50 changed entries (partial update)

Shows timing breakdown for each step, demonstrating the speed advantage of partial sync over full uploads.

### Chunk Size Benchmark

Tests different write configurations to find optimal settings for your SD card:

| Configuration | Description |
|--------------|-------------|
| 64KB - 2MB + fsync | Write chunks with disk sync after each (accurate progress) |
| 256KB - 4MB (no fsync) | Write chunks and sync once at end (fastest) |

Each configuration runs 2 iterations. Results are sorted by speed, showing the fastest configuration for your specific SD card.

**Typical results**: 4MB chunks without fsync is ~2.3x faster than 64KB with fsync.

See [LABELS_DB_SPECIFICATION.md](./LABELS_DB_SPECIFICATION.md#sd-card-transfer-performance) for configuration details.
