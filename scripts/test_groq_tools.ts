// @ts-nocheck
import { groq } from "@ai-sdk/groq"
import { streamText, tool } from "ai"
import { z } from "zod"

async function testTools() {
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b"
  console.log("Testing tools with model:", model)

  const tools = {
    get_weather: tool({
      description: "Get the current weather",
      inputSchema: z.object({ city: z.string() }),
      execute: async ({ city }) => `The weather in ${city} is sunny, 24°C.`,
    }),
  }

  const result = streamText({
    model: groq(model),
    messages: [{ role: "user", content: "What is the weather in Bangalore?" }],
    tools,
  })

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk)
  }
  console.log("\n>>> Tool test passed! <<<")
}

testTools()
