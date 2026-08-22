import { createHmac, randomUUID } from "node:crypto"

import type { UserContext } from "@/lib/user-context"

const BACKEND_SECRET = process.env.ARCA_BACKEND_SECRET

if (!BACKEND_SECRET) {
  // Keep this module server-only and fail at request construction rather than
  // ever sending an unsigned request to the private backend.
  console.warn("ARCA_BACKEND_SECRET is not configured")
}

function encodePrincipal(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64url")
}

export function createArcaBackendHeaders(
  context: UserContext,
  requestId = randomUUID(),
): Record<string, string> {
  if (!BACKEND_SECRET) {
    throw new Error("ARCA_BACKEND_SECRET is not configured")
  }
  if (!context.institution_id || !context.organization_id) {
    throw new Error("The current principal has no tenant scope")
  }

  const now = Math.floor(Date.now() / 1000)
  const encodedPrincipal = encodePrincipal({
    user_id: context.id,
    actor_user_id: context.originalProfile.id,
    organization_id: context.organization_id,
    institution_id: context.institution_id,
    department_id: context.department_id,
    role: context.role,
    name: context.name,
    email: context.email,
    is_impersonating: context.isImpersonating,
    issued_at: now,
    expires_at: now + 60,
  })
  const signature = createHmac("sha256", BACKEND_SECRET)
    .update(encodedPrincipal)
    .digest("hex")

  return {
    "Content-Type": "application/json",
    "X-Arca-Gateway-Secret": BACKEND_SECRET,
    "X-Arca-Principal": encodedPrincipal,
    "X-Arca-Principal-Signature": signature,
    "X-Arca-Request-Id": requestId,
  }
}

/** Headers for the guest product-help route; intentionally contains no user identity. */
export function createArcaPublicBackendHeaders(
  requestId = randomUUID(),
): Record<string, string> {
  if (!BACKEND_SECRET) {
    throw new Error("ARCA_BACKEND_SECRET is not configured")
  }

  return {
    "Content-Type": "application/json",
    "X-Arca-Gateway-Secret": BACKEND_SECRET,
    "X-Arca-Request-Id": requestId,
  }
}
