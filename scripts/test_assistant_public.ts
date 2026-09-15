// @ts-nocheck
const appUrl = "http://localhost:3001"

async function testPublicAssistant() {
  console.log("Testing POST /api/assistant/public...")
  const res = await fetch(`${appUrl}/api/assistant/public`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientTurnId: crypto.randomUUID(),
      messages: [
        {
          id: crypto.randomUUID(),
          role: "user",
          parts: [{ type: "text", text: "What is SkillArc LMS?" }],
        },
      ],
    }),
  })

  console.log(`Status: ${res.status} ${res.statusText}`)
  const text = await res.text()
  console.log("Response text:\n", text.slice(0, 500))
}

testPublicAssistant()
