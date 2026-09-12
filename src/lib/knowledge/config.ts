export const KNOWLEDGE_DEFAULT_MODEL = "text-embedding-3-small"
export const KNOWLEDGE_DEFAULT_DIMENSIONS = 384

export function knowledgeSearchEnabled(): boolean {
  return process.env.KNOWLEDGE_SEARCH_ENABLED === "true"
}

export function knowledgeEmbeddingModel(): string {
  return process.env.KNOWLEDGE_EMBEDDING_MODEL || KNOWLEDGE_DEFAULT_MODEL
}

export function knowledgeEmbeddingDimensions(): number {
  const value = Number(process.env.KNOWLEDGE_EMBEDDING_DIMENSIONS || KNOWLEDGE_DEFAULT_DIMENSIONS)
  return Number.isInteger(value) && value > 0 ? value : KNOWLEDGE_DEFAULT_DIMENSIONS
}
