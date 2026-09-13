export const KNOWLEDGE_DEFAULT_DIMENSIONS = 384
export const KNOWLEDGE_DEFAULT_PROVIDER = "huggingface-local"
export const KNOWLEDGE_DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2"
export const KNOWLEDGE_DEFAULT_REVISION = "751bff3"
export const KNOWLEDGE_CHUNKING_VERSION = "v2"

export function knowledgeSearchEnabled(): boolean {
  return process.env.KNOWLEDGE_SEARCH_ENABLED === "true"
}

export function knowledgeEmbeddingModel(): string {
  return process.env.KNOWLEDGE_EMBEDDING_MODEL || KNOWLEDGE_DEFAULT_MODEL
}

export function knowledgeEmbeddingDimensions(): number {
  const value = Number(process.env.KNOWLEDGE_EMBEDDING_DIMENSIONS || KNOWLEDGE_DEFAULT_DIMENSIONS)
  if (value !== KNOWLEDGE_DEFAULT_DIMENSIONS) {
    throw new Error(`Knowledge embeddings require exactly ${KNOWLEDGE_DEFAULT_DIMENSIONS} dimensions`)
  }
  return value
}

export function knowledgeEmbeddingProvider(): string {
  return process.env.KNOWLEDGE_EMBEDDING_PROVIDER || KNOWLEDGE_DEFAULT_PROVIDER
}

export function knowledgeEmbeddingRevision(): string {
  return process.env.KNOWLEDGE_EMBEDDING_REVISION || KNOWLEDGE_DEFAULT_REVISION
}

export function validateKnowledgeEmbeddingConfig(): void {
  if (knowledgeEmbeddingProvider() !== KNOWLEDGE_DEFAULT_PROVIDER) {
    throw new Error(`Unsupported knowledge embedding provider: ${knowledgeEmbeddingProvider()}`)
  }
  if (knowledgeEmbeddingModel() !== KNOWLEDGE_DEFAULT_MODEL) {
    throw new Error(`Unsupported knowledge embedding model: ${knowledgeEmbeddingModel()}`)
  }
  knowledgeEmbeddingDimensions()
  if (!knowledgeEmbeddingRevision().trim()) throw new Error("Knowledge embedding revision is required")
}

export function knowledgeEmbeddingProfile(): string {
  validateKnowledgeEmbeddingConfig()
  return [knowledgeEmbeddingProvider(), knowledgeEmbeddingModel(), knowledgeEmbeddingRevision(), knowledgeEmbeddingDimensions(), KNOWLEDGE_CHUNKING_VERSION].join(":")
}
