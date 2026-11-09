"use client"

import { useCallback, useSyncExternalStore } from "react"

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener)
  return () => window.removeEventListener("storage", listener)
}

/** Undefined until hydration, null for absent/unavailable storage. Snapshot stays a primitive. */
export function useLocalStorageValue(key: string | null) {
  const read = useCallback(() => {
    if (!key) return null
    try { return window.localStorage.getItem(key) }
    catch { return null }
  }, [key])
  return useSyncExternalStore(subscribe, read, () => undefined)
}
