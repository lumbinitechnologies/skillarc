import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { measureServer } from "@/lib/perf"
import { isPrelaunchEnabled, isPrelaunchPublicRequest, prelaunchMessage } from "@/lib/prelaunch"

function cleanIdentityHeaders(request: NextRequest) {
  const forwardedHeaders = new Headers(request.headers)
  for (const name of ["x-user-id", "x-user-email", "x-user-role", "x-user-institution-id"]) {
    forwardedHeaders.delete(name)
  }
  return forwardedHeaders
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPrelaunchEnabled()) {
    if (isPrelaunchPublicRequest(request.method, pathname, request.nextUrl.searchParams.getAll("url"))) {
      return NextResponse.next({ request: { headers: cleanIdentityHeaders(request) } })
    }

    const headers = { "Cache-Control": "no-store" }
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "PRELAUNCH_CLOSED", message: prelaunchMessage } },
        { status: 503, headers },
      )
    }

    return new NextResponse(
      request.method === "HEAD" ? null : `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SkillArc prelaunch</title><main><h1>SkillArc prelaunch</h1><p>${prelaunchMessage}</p><a href="/">Visit the SkillArc homepage</a></main></html>`,
      { status: 503, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } },
    )
  }

  if (/^\/(?:_next\/static|_next\/image|favicon\.ico)|\.(?:svg|png|jpg|jpeg|gif|webp)$/.test(pathname)) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request: { headers: cleanIdentityHeaders(request) } })

  const isPublicApiRoute =
    pathname === "/api/assistant/public" ||
    pathname.startsWith("/api/admissions/public-") ||
    pathname.startsWith("/api/auth/")

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

  // Mobile handlers verify their own Bearer token; they do not use web cookies.
  if (pathname === "/api/mobile/v1" || pathname.startsWith("/api/mobile/v1/")) {
    return response
  }

  if (isPublicApiRoute || isPublicMarketingRoute) {
    return response
  }

  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(
    (cookie) =>
      cookie.name.startsWith("sb-") &&
      (cookie.name.includes("auth-token") || cookie.name.includes("access-token"))
  )

  const isAuthFormRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/auth/login" ||
    pathname === "/auth/signup" ||
    pathname === "/auth/forgot-password"

  if (isAuthFormRoute && !hasAuthCookie) {
    return response
  }

  if (!hasAuthCookie) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: cleanIdentityHeaders(request) } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await measureServer("proxy.auth.get-user", () => supabase.auth.getUser())

  if (pathname.startsWith("/api/")) {
    return user ? response : NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!user && !isAuthFormRoute) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  if (user && isAuthFormRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}
