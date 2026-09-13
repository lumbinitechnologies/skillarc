import assert from "node:assert/strict"
import test from "node:test"

import { knowledgeEmbeddingInternals } from "@/lib/knowledge/embeddings"

test("local embedding adapter validates 384-dimensional rows", () => {
  const row = Array.from({ length: 384 }, () => 0.25)
  assert.deepEqual(knowledgeEmbeddingInternals.assertRows([row], 1), [row])
  assert.throws(() => knowledgeEmbeddingInternals.assertRows([[0, 1]], 1), /not 384-dimensional/)
})

test("local embedding adapter converts tensor output into rows", () => {
  const rows = knowledgeEmbeddingInternals.tensorRows({
    tolist: () => [
      [1, 2],
      [3, 4],
    ],
  })
  assert.deepEqual(rows, [
    [1, 2],
    [3, 4],
  ])
  assert.throws(() => knowledgeEmbeddingInternals.tensorRows({ tolist: () => [[1, "bad"]] }), /invalid vector values/)
})
