"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

export type DashboardCacheScope = {
  userId: string | null
  role: string | null
  institutionId: string | null
  organizationId: string | null
  impersonationId?: string | null
}

type CacheEntry = {
  value: unknown
  stale: boolean
}

function logCacheEvent(event: "hit" | "miss" | "set" | "invalidate" | "clear", key: string) {
  if (process.env.NEXT_PUBLIC_PERF_DIAGNOSTICS !== "true") return
  console.info(JSON.stringify({ type: "skillarc.performance", name: `dashboard.cache.${event}`, key }))
}

export type DashboardCache = {
  read<T>(key: string): T | undefined
  seed<T>(key: string, data: T): void
  set<T>(key: string, data: T): void
  invalidate(key: string): void
  revalidate<T>(key: string, loader: () => Promise<T>): Promise<T>
  clear(): void
  keyFor(key: string): string
}

const DashboardCacheContext = createContext<DashboardCache | null>(null)

function serializeScope(scope: DashboardCacheScope) {
  return [
    scope.userId ?? "anonymous",
    scope.role ?? "unknown",
    scope.institutionId ?? "global",
    scope.organizationId ?? "global",
    scope.impersonationId ?? "self",
  ].join(":")
}

export function DashboardDataProvider({
  scope,
  children,
}: {
  scope: DashboardCacheScope
  children: React.ReactNode
}) {
  const entriesRef = useRef(new Map<string, CacheEntry>())
  const inFlightRef = useRef(new Map<string, Promise<unknown>>())
  const [activeScopeKey, setActiveScopeKey] = useState(() => serializeScope(scope))
  const [, setCacheVersion] = useState(0)
  const scopeKey = serializeScope(scope)

  const bump = useCallback(() => setCacheVersion((value) => value + 1), [])

  useEffect(() => {
    if (activeScopeKey === scopeKey) return
    entriesRef.current.clear()
    inFlightRef.current.clear()
    logCacheEvent("clear", "scope-change")
    // Scope changes are external identity changes; reset the provider once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveScopeKey(scopeKey)
  }, [activeScopeKey, scopeKey])

  useEffect(() => () => {
    entriesRef.current.clear()
    inFlightRef.current.clear()
  }, [])

  const cache = useMemo<DashboardCache>(() => {
    const keyFor = (key: string) => `${scopeKey}:${key}`

    return {
      keyFor,
      read<T>(key: string) {
        const entry = entriesRef.current.get(keyFor(key))
        const value = entry && !entry.stale ? (entry.value as T) : undefined
        logCacheEvent(value === undefined ? "miss" : "hit", key)
        return value
      },
      seed<T>(key: string, data: T) {
        const fullKey = keyFor(key)
        if (entriesRef.current.has(fullKey)) return
        entriesRef.current.set(fullKey, { value: data, stale: false })
        logCacheEvent("set", key)
        bump()
      },
      set<T>(key: string, data: T) {
        entriesRef.current.set(keyFor(key), { value: data, stale: false })
        logCacheEvent("set", key)
        bump()
      },
      invalidate(key: string) {
        const fullKey = keyFor(key)
        const entry = entriesRef.current.get(fullKey)
        if (entry) {
          entry.stale = true
          logCacheEvent("invalidate", key)
          bump()
        }
      },
      async revalidate<T>(key: string, loader: () => Promise<T>) {
        const fullKey = keyFor(key)
        const existing = inFlightRef.current.get(fullKey)
        if (existing) return existing as Promise<T>

        const promise = loader()
          .then((data) => {
            entriesRef.current.set(fullKey, { value: data, stale: false })
            bump()
            return data
          })
          .finally(() => {
            inFlightRef.current.delete(fullKey)
          })

        inFlightRef.current.set(fullKey, promise)
        return promise
      },
      clear() {
        entriesRef.current.clear()
        inFlightRef.current.clear()
        logCacheEvent("clear", "*")
        bump()
      },
    }
  }, [bump, scopeKey])

  return (
    <DashboardCacheContext.Provider value={cache}>
      {children}
    </DashboardCacheContext.Provider>
  )
}

export function useDashboardCache() {
  const cache = useContext(DashboardCacheContext)
  if (!cache) {
    throw new Error("useDashboardCache must be used inside DashboardDataProvider")
  }
  return cache
}
