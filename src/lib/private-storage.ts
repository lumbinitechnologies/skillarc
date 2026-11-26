export type PrivateStorageBucket = "assignments" | "resumes"

function isSafeStoragePath(path: string): boolean {
  if (!path || path.length > 1024 || path.startsWith("/")) return false

  return path.split("/").every((segment) =>
    segment.length > 0 && segment !== "." && segment !== ".." &&
    !segment.includes("\\") && !segment.includes("\0") && !segment.includes("/")
  )
}

export function normalizePrivateStoragePath(value: string): string | null {
  const path = value.trim()
  return isSafeStoragePath(path) ? path : null
}

export function makePrivateStorageReference(bucket: PrivateStorageBucket, path: string): string {
  const safePath = normalizePrivateStoragePath(path)
  if (!safePath) throw new Error("Invalid private storage path")
  return `storage://${bucket}/${safePath}`
}

export function parsePrivateStoragePath(
  value: string | null | undefined,
  bucket: PrivateStorageBucket,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (!value) return null
  const raw = value.trim()
  const referencePrefix = `storage://${bucket}/`
  if (raw.startsWith(referencePrefix)) return normalizePrivateStoragePath(raw.slice(referencePrefix.length))

  if (!supabaseUrl) return null
  try {
    const prefixes = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
    ]
    const rawPathname = raw.replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/, 1)[0]
    const prefix = prefixes.find((candidate) => rawPathname.startsWith(candidate))
    if (!prefix) return null

    const base = new URL(supabaseUrl)
    const url = new URL(raw)
    if (url.origin !== base.origin) return null

    const encodedPath = rawPathname.slice(prefix.length)
    const decodedSegments = encodedPath.split("/").map((segment) => decodeURIComponent(segment))
    if (decodedSegments.some((segment) => segment.includes("/") || segment.includes("\\"))) return null
    const decodedPath = decodedSegments.join("/")
    return normalizePrivateStoragePath(decodedPath)
  } catch {
    return null
  }
}

export function getPrivateStorageHref(
  value: string | null | undefined,
  bucket: PrivateStorageBucket,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  const path = parsePrivateStoragePath(value, bucket, supabaseUrl)
  if (!path) return null
  return `/api/storage/${bucket}?path=${encodeURIComponent(path)}`
}
