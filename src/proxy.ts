import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { decodeJwt } from "jose"
import { measureServer } from "@/lib/perf"

function extractToken(raw: string): string | null {
  if (!raw) return null
  let val = raw
  if (val.startsWith("base64-")) {
    try {
      val = atob(val.slice(7))
    } catch {
      try {
        val = Buffer.from(val.slice(7), "base64").toString("utf8")
      } catch {
        return null
      }
    }
  }
  try {
    const parsed = JSON.parse(val)
    if (parsed.access_token && typeof parsed.access_token === "string") return parsed.access_token
    if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0]
  } catch {
    if (val.split(".").length === 3) return val
  }
  return null
}

function extractJwtFromRequestCookies(cookies: { name: string; value: string }[]): string | null {
  const direct = cookies.find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))
  if (direct?.value) {
    const token = extractToken(direct.value)
    if (token) return token
  }

  const chunks = cookies
    .filter((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token."))
    .sort((a, b) => {
      const idxA = parseInt(a.name.split(".").pop() || "0", 10)
      const idxB = parseInt(b.name.split(".").pop() || "0", 10)
      return idxA - idxB
    })

  if (chunks.length > 0) {
    const combined = chunks.map((c) => c.value).join("")
    return extractToken(combined)
  }

  return null
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const { pathname } = request.nextUrl

  const isPublicApiRoute =
    pathname === "/api/assistant/public" ||
    pathname.startsWith("/api/admissions/public-")

  // Fast-path public marketing and admission landing routes that require no auth checks
  const isPublicMarketingRoute =
    pathname === "/" ||
    pathname === "/platform" ||
    pathname === "/solutions" ||
    pathname === "/features" ||
    pathname === "/about" ||
    pathname === "/resources" ||
    pathname === "/apply" ||
    pathname.startsWith("/apply/") ||
    pathname === "/auth/callback" ||
    pathname === "/auth/callback-finish" ||
    pathname === "/auth/set-password" ||
    pathname === "/auth/reset-password"

  if (isPublicApiRoute || isPublicMarketingRoute) {
    return response
  }

  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(
    (c) =>
      c.name.startsWith("sb-") &&
      (c.name.includes("auth-token") || c.name.includes("access-token"))
  )

  const isAuthFormRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/auth/login" ||
    pathname === "/auth/signup" ||
    pathname === "/auth/forgot-password"

  // If visiting an auth form without any auth session cookie, skip network check and serve the form directly
  if (isAuthFormRoute && !hasAuthCookie) {
    return response
  }

  // If hitting protected API or page route without any auth session cookie, reject / redirect immediately
  if (!hasAuthCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // 1. FAST-PATH: Local JWT decoding and expiry validation (0ms, zero network calls)
  const token = extractJwtFromRequestCookies(allCookies)
  if (token) {
    try {
      const claims = decodeJwt(token)
      const nowSeconds = Math.floor(Date.now() / 1000)
      // Check if token is present, valid sub, and not expired (with 30s clock skew tolerance)
      if (claims.sub && claims.exp && claims.exp > nowSeconds + 30) {
        if (isAuthFormRoute) {
          return NextResponse.redirect(new URL("/dashboard", request.url))
        }

        const requestHeaders = new Headers(request.headers)
        requestHeaders.set("x-user-id", claims.sub)
        if (claims.email) requestHeaders.set("x-user-email", String(claims.email))
        const meta = claims.user_metadata as any
        if (meta?.role) requestHeaders.set("x-user-role", String(meta.role))
        if (meta?.institution_id) requestHeaders.set("x-user-institution-id", String(meta.institution_id))

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      }
    } catch {
      // Fall through to live Supabase verification if decode fails
    }
  }

  // 2. FALLBACK: Live Supabase GoTrue verification for expiring / refreshing sessions
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await measureServer("proxy.auth.get-user", () => supabase.auth.getUser())

  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return response
  }

  if (!user && !isAuthFormRoute) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (user && isAuthFormRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Forward verified user ID in request headers so Server Components skip duplicate getUser() network calls
  const requestHeaders = new Headers(request.headers)
  if (user) {
    requestHeaders.set("x-user-id", user.id)
    requestHeaders.set("x-user-email", user.email || "")
  }

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Copy cookies set during auth verification to the response
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value, cookie)
  })

  return finalResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
