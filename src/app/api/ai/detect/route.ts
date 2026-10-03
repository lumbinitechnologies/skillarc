"use server"

import { NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// AI Content Detection via Gemini
// ---------------------------------------------------------------------------
// Uses a carefully engineered prompt that instructs Gemini to act as an AI
// content detector and return a structured JSON analysis. This is far more
// accurate than heuristics because Gemini can understand semantic patterns,
// unnaturally structured argumentation, and the telltale overuse of transition
// phrases that AI models favour.
// ---------------------------------------------------------------------------

const MODELS_TO_TRY = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-pro-latest",
]

const DETECTION_PROMPT = (text: string) => `
You are an expert AI content detector with deep knowledge of how LLMs (ChatGPT, Gemini, Claude, etc.) write.
Your job is to analyse the following student submission and determine how much of it was written by an AI.

STUDENT SUBMISSION:
"""
${text.slice(0, 6000)}
"""

Analyse the text carefully for these AI writing signals:
1. Unnaturally perfect sentence structure with very uniform length
2. Overuse of transition words (however, furthermore, moreover, in conclusion, etc.)
3. Generic, surface-level explanations without concrete examples or personal voice
4. Overly formal academic tone even for simple topics
5. Repetitive sentence openers and structural patterns
6. Absence of grammatical quirks, colloquialisms, or personal experience
7. Perfect logical flow that feels templated
8. Vocabulary that's rich but lacks domain-specific depth or personal perspective
9. Suspiciously comprehensive coverage of all sub-points in balanced, equal-length sections
10. Text that reads like a textbook answer rather than a student's genuine response

Respond ONLY with a valid JSON object in this exact format (no extra text, no markdown code fences):
{
  "aiProbability": <integer 0-100>,
  "verdict": "<one of: HUMAN_WRITTEN | LIKELY_HUMAN | UNCERTAIN | LIKELY_AI | AI_GENERATED>",
  "confidence": "<one of: LOW | MEDIUM | HIGH | VERY_HIGH>",
  "shortSummary": "<1-2 sentence plain English summary of your finding>",
  "signals": {
    "uniformSentenceLength": <true|false>,
    "overusesTransitionWords": <true|false>,
    "lacksPersonalVoice": <true|false>,
    "overlyFormal": <true|false>,
    "templateStructure": <true|false>,
    "genericExplanations": <true|false>
  },
  "wordCount": <integer>
}

Be honest and calibrated. A short 30-word answer can't be reliably detected — return low confidence for short texts.
`

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { text } = body as { text?: string }

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "No text provided for analysis" },
        { status: 400 }
      )
    }

    const cleanText = text.trim()
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length

    // For very short texts, return low-confidence uncertain result immediately
    if (wordCount < 20) {
      return NextResponse.json({
        aiProbability: 0,
        verdict: "UNCERTAIN",
        confidence: "LOW",
        shortSummary: `Text is too short (${wordCount} words) for reliable AI detection. Minimum recommended is 50+ words.`,
        signals: {
          uniformSentenceLength: false,
          overusesTransitionWords: false,
          lacksPersonalVoice: false,
          overlyFormal: false,
          templateStructure: false,
          genericExplanations: false,
        },
        wordCount,
        isLiveAi: false,
        fallback: true,
      })
    }

    const key =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY

    if (!key || key.includes("placeholder") || key.includes("your_") || key.trim().length < 10) {
      return NextResponse.json(
        { error: "AI detection API key not configured" },
        { status: 503 }
      )
    }

    const prompt = DETECTION_PROMPT(cleanText)

    for (const model of MODELS_TO_TRY) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.trim()}`
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1, // Low temperature for consistent, analytical output
              maxOutputTokens: 512,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(20000),
        })

        if (!res.ok) {
          console.warn(`[AI Detect] Model ${model} returned ${res.status}`)
          continue
        }

        const json = await res.json()
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text

        if (!rawText) continue

        // Parse JSON — strip markdown fences if present
        const cleaned = rawText
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim()

        const parsed = JSON.parse(cleaned)

        // Validate required fields
        if (typeof parsed.aiProbability !== "number") {
          console.warn("[AI Detect] Invalid response structure from Gemini")
          continue
        }

        return NextResponse.json({
          ...parsed,
          aiProbability: Math.max(0, Math.min(100, Math.round(parsed.aiProbability))),
          wordCount,
          isLiveAi: true,
          modelUsed: model,
        })
      } catch (modelErr) {
        console.warn(`[AI Detect] Model ${model} failed:`, modelErr)
        continue
      }
    }

    // All Gemini models failed — fall back to null so caller knows it failed
    return NextResponse.json(
      { error: "AI detection unavailable — all models failed or timed out" },
      { status: 503 }
    )
  } catch (err: any) {
    console.error("[AI Detect] Unhandled error:", err)
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 })
  }
}
