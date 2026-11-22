const informationalPages = new Set([
  "/",
  "/about",
  "/features",
  "/platform",
  "/resources",
  "/solutions",
])

export const prelaunchMessage = "SkillArc is preparing for launch. Sign-in and onboarding are currently closed."

export function isPrelaunchEnabled() {
  return process.env.SKILLARC_PRELAUNCH === "true"
}

function isPublicImage(pathname: string) {
  return (
    pathname === "/favicon.ico" ||
    pathname === "/skillarc_logo.svg" ||
    /^\/images\/landing\/[a-z_]+\.jpg$/.test(pathname) ||
    /^\/sequence\/(?:mobile\/)?ezgif-frame-\d{3}\.jpg$/.test(pathname)
  )
}

export function isPrelaunchPublicRequest(method: string, pathname: string, imageSources: string[]) {
  if (method !== "GET" && method !== "HEAD") return false

  if (pathname === "/_next/image") {
    return imageSources.length === 1 && isPublicImage(imageSources[0])
  }

  return (
    informationalPages.has(pathname) ||
    pathname.startsWith("/_next/static/") ||
    isPublicImage(pathname)
  )
}
