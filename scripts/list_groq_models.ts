// @ts-nocheck
const apiKey = process.env.GROQ_API_KEY

async function listModels() {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
  const data = await res.json()
  console.log("Active Groq models:")
  if (data.data) {
    for (const m of data.data) {
      if (m.active !== false) {
        console.log(`- ${m.id}`)
      }
    }
  } else {
    console.log(data)
  }
}

listModels()
