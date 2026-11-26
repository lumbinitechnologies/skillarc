import assert from "node:assert/strict"
import test from "node:test"

import { embedKnowledgeMany } from "@/lib/knowledge/embeddings"

test("pinned local model returns normalized 384-dimensional vectors", { skip: process.env.RUN_KNOWLEDGE_MODEL_TESTS !== "1" }, async () => {
  const vectors = await embedKnowledgeMany(["Algorithms syllabus", "Department policy"])
  assert.equal(vectors.length, 2)
  for (const vector of vectors) {
    assert.equal(vector.length, 384)
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
    assert.ok(Math.abs(norm - 1) < 0.001)
  }
})
