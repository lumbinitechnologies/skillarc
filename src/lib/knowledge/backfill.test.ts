import assert from "node:assert/strict"
import test from "node:test"

import { legacyContent, parseLegacyManifest, resolveMigrationFile } from "@/lib/knowledge/backfill"

test("backfill accepts exported documents and reconstructs ordered Chroma chunks", () => {
  const records = parseLegacyManifest({ documents: [{
    legacy_id: "legacy-1",
    scope: { organization_id: "org", institution_id: "inst", owner_id: "owner" },
    chunks: [{ chunk_index: 2, text: "third" }, { chunk_index: 0, content: "first" }, { chunk_index: 1, text: "second" }],
  }] })
  assert.equal(records.length, 1)
  assert.equal(legacyContent(records[0]), "first\n\nsecond\n\nthird")
})

test("migration files cannot escape the explicit source root", () => {
  assert.throws(() => resolveMigrationFile("/exports", "../secret.txt"), /inside --source-root/)
})
