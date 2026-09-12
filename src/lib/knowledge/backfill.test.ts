import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import test from "node:test"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { legacyContent, parseLegacyManifest, readLegacySource, resolveMigrationFile } from "@/lib/knowledge/backfill"

test("backfill accepts exported documents and reconstructs ordered Chroma chunks", () => {
  const records = parseLegacyManifest({
    documents: [
      {
        legacy_id: "legacy-1",
        scope: {
          organization_id: "org",
          institution_id: "inst",
          owner_id: "owner",
        },
        chunks: [
          { chunk_index: 2, text: "third" },
          { chunk_index: 0, content: "first" },
          { chunk_index: 1, text: "second" },
        ],
      },
    ],
  })
  assert.equal(records.length, 1)
  assert.equal(legacyContent(records[0]), "first\n\nsecond\n\nthird")
})

test("migration files cannot escape the explicit source root", () => {
  assert.throws(() => resolveMigrationFile("/exports", "../secret.txt"), /inside --source-root/)
})

test("binary legacy sources are preserved as bytes for the canonical worker", async () => {
  const sourceRoot = await mkdtemp(join(tmpdir(), "skillarc-knowledge-"))
  const bytes = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x00, 0xff])
  await writeFile(join(sourceRoot, "source.pdf"), bytes)
  const source = await readLegacySource(
    {
      legacy_id: "legacy-pdf",
      file_path: "source.pdf",
      scope: {
        organization_id: "org",
        institution_id: "inst",
        owner_id: "owner",
      },
    },
    sourceRoot,
  )
  assert.equal(source.mimeType, "application/pdf")
  assert.deepEqual(Array.from(await readFile(join(sourceRoot, "source.pdf"))), Array.from(bytes))
  assert.deepEqual(source.bytes, bytes)
})
