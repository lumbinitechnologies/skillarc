import assert from "node:assert/strict"
import test from "node:test"
import { assertEmbeddingDimensions, extractKnowledgeText, normalizeExtractedText, splitKnowledgeText } from "@/lib/knowledge/worker"

test("normalizes text and rejects empty content", () => {
  assert.equal(normalizeExtractedText("  hello\r\nworld  "), "hello\nworld")
  assert.throws(() => normalizeExtractedText("\u0000  \n"), /no extractable text/)
})

test("extracts plain text and creates overlapping chunks", async () => {
  const text = await extractKnowledgeText(new TextEncoder().encode("hello\nworld"), "text/plain", "notes.txt")
  assert.equal(text, "hello\nworld")
  const chunks = await splitKnowledgeText("a".repeat(2200))
  assert.ok(chunks.length >= 2)
  assert.ok(chunks[1].length > 0)
})

test("rejects vectors with the wrong dimensions", () => {
  assert.doesNotThrow(() => assertEmbeddingDimensions([Array.from({ length: 384 }, () => 0)]))
  assert.throws(() => assertEmbeddingDimensions([[0, 1]], 384), /not 384-dimensional/)
})
