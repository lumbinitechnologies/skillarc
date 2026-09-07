type RateLimitResult = { allowed: boolean; retryAfterSeconds: number }

const WINDOW_SECONDS = 60
const MAX_REQUESTS = 30

/**
 * Uses Upstash Redis when configured. Without Redis, local development is
 * allowed to proceed without a limiter; production should configure both
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 */
export async function rateLimit(key: string): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return { allowed: true, retryAfterSeconds: 0 }

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", `skillarc:assistant:${key}`],
        ["EXPIRE", `skillarc:assistant:${key}`, WINDOW_SECONDS],
        ["TTL", `skillarc:assistant:${key}`],
      ]),
      cache: "no-store",
    })
    if (!response.ok) return { allowed: false, retryAfterSeconds: 30 }
    const values = (await response.json()) as Array<{ result?: number }>
    const count = Number(values[0]?.result ?? MAX_REQUESTS + 1)
    const ttl = Math.max(1, Number(values[2]?.result ?? WINDOW_SECONDS))
    return { allowed: count <= MAX_REQUESTS, retryAfterSeconds: ttl }
  } catch {
    return { allowed: false, retryAfterSeconds: 30 }
  }
}
