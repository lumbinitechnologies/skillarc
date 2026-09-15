// @ts-nocheck
import { groq } from "@ai-sdk/groq"
import { streamText } from "ai"

const models = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "groq/compound-mini",
]

async function main() {
  for (const model of models) {
    try {
      console.log(`\nTesting model ${model}...`)
      const result = streamText({
        model: groq(model),
        messages: [{ role: "user", content: "Hello! Reply with 3 words." }],
      })
      let output = ""
      for await (const chunk of result.textStream) {
        output += chunk
      }
      console.log(`✅ [${model}] SUCCESS:`, output.trim())
    } catch (e: any) {
      console.log(`❌ [${model}] FAILED:`, e.message)
    }
  }
}

main()
