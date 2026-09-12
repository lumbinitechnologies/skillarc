import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers"

import { knowledgeEmbeddingDimensions, knowledgeEmbeddingModel, knowledgeEmbeddingProfile, knowledgeEmbeddingRevision, validateKnowledgeEmbeddingConfig } from "@/lib/knowledge/config"

const MAX_BATCH_SIZE = 32

let modelPromise: Promise<FeatureExtractionPipeline> | null = null

function assertEmbeddingConfiguration(): void {
  validateKnowledgeEmbeddingConfig()
}

async function localModel(): Promise<FeatureExtractionPipeline> {
  assertEmbeddingConfiguration()
  if (!modelPromise) {
    modelPromise = pipeline("feature-extraction", knowledgeEmbeddingModel(), {
      revision: knowledgeEmbeddingRevision(),
      dtype: "q8",
    }).catch((error) => {
      modelPromise = null
      throw error
    })
  }
  return modelPromise
}

function tensorRows(value: { tolist: () => unknown }): number[][] {
  const output = value.tolist()
  if (!Array.isArray(output)) throw new Error("Embedding model returned an invalid tensor")
  const rows = Array.isArray(output[0]) ? output : [output]
  if (rows.some((row) => !Array.isArray(row) || row.some((item) => typeof item !== "number"))) {
    throw new Error("Embedding model returned invalid vector values")
  }
  return rows as number[][]
}

function assertRows(rows: number[][], expectedCount: number): number[][] {
  const dimensions = knowledgeEmbeddingDimensions()
  if (rows.length !== expectedCount || rows.some((row) => row.length !== dimensions)) {
    throw new Error(`Embedding provider returned vectors that are not ${dimensions}-dimensional`)
  }
  return rows
}

export async function embedKnowledgeMany(values: string[]): Promise<number[][]> {
  if (!values.length) return []
  const model = await localModel()
  const embeddings: number[][] = []
  for (let offset = 0; offset < values.length; offset += MAX_BATCH_SIZE) {
    const batch = values.slice(offset, offset + MAX_BATCH_SIZE)
    const output = await model(batch, { pooling: "mean", normalize: true })
    embeddings.push(...assertRows(tensorRows(output), batch.length))
  }
  return embeddings
}

export async function embedKnowledgeQuery(value: string): Promise<number[]> {
  const embeddings = await embedKnowledgeMany([value])
  return embeddings[0] ?? []
}

export const knowledgeEmbeddingInternals = {
  assertRows,
  tensorRows,
  profile: knowledgeEmbeddingProfile,
}
