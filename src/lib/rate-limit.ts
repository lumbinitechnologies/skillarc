type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
  remaining: number
}

type RateLimitOptions = {
  windowSeconds?: number
  maxRequests?: number
  prefix?: string
}

/**
 * Universal Rate Limiter for Authentication & Public APIs.
 * Supports Upstash Redis REST pipeline when configured in environment.
 * Gracefully permits local development when Redis environment variables are absent.
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const windowSeconds = options.windowSeconds ?? 60
  const maxRequests = options.maxRequests ?? 5
  const prefix = options.prefix ?? "skillarc:auth"

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  // In local development or environments without Upstash Redis, permit requests
  if (!url || !token) {
    return { allowed: true, retryAfterSeconds: 0, remaining: maxRequests }
  }

  const redisKey = `${prefix}:${key}`

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSeconds],
        ["TTL", redisKey],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    })

    if (!response.ok) {
      // Fail-open: Permit login attempt so Redis outages don't block legitimate users, but log structured alert
      console.warn(
        `[RateLimiter:Degraded] Upstash pipeline returned HTTP ${response.status}. Failing open to preserve user availability.`
      )
      return { allowed: true, retryAfterSeconds: 0, remaining: 1 }
    }

    const values = (await response.json()) as Array<{ result?: number }>
    const currentCount = Number(values[0]?.result ?? 1)
    const ttl = Math.max(1, Number(values[2]?.result ?? windowSeconds))

    const allowed = currentCount <= maxRequests
    const remaining = Math.max(0, maxRequests - currentCount)

    return {
      allowed,
      retryAfterSeconds: allowed ? 0 : ttl,
      remaining,
    }
  } catch (error) {
    // Fail-open on timeout (AbortSignal.timeout 1500ms) or network failure
    console.error(
      `[RateLimiter:Degraded] Upstash Redis unreachable or timed out (1500ms). Failing open. Details:`,
      error instanceof Error ? error.message : error
    )
    return { allowed: true, retryAfterSeconds: 0, remaining: 1 }
  }
}

/**
 * Validates login attempt against both client IP and normalized target email.
 */
export async function checkAuthRateLimit(
  clientIp: string | null | undefined,
  email: string
): Promise<{ allowed: boolean; message?: string }> {
  const normalizedEmail = email.trim().toLowerCase()
  const effectiveIp = clientIp || "unknown-ip"

  // 1. IP-level rate limit: max 20 login attempts per minute per IP
  const ipCheck = await checkRateLimit(`ip:${effectiveIp}`, {
    prefix: "skillarc:ratelimit:auth",
    maxRequests: 20,
    windowSeconds: 60,
  })

  if (!ipCheck.allowed) {
    return {
      allowed: false,
      message: `Too many requests from your IP. Please try again in ${ipCheck.retryAfterSeconds} seconds.`,
    }
  }

  // 2. Email-level rate limit: max 5 login attempts per minute per account
  const emailCheck = await checkRateLimit(`email:${normalizedEmail}`, {
    prefix: "skillarc:ratelimit:auth",
    maxRequests: 5,
    windowSeconds: 60,
  })

  if (!emailCheck.allowed) {
    return {
      allowed: false,
      message: `Too many failed attempts for this account. Please wait ${emailCheck.retryAfterSeconds} seconds before trying again.`,
    }
  }

  return { allowed: true }
}
