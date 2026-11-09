"use client"

import { useSyncExternalStore } from "react"

const listeners = new Set<() => void>()
let snapshot = 0
let timer: ReturnType<typeof setInterval> | undefined

function subscribe(listener: () => void) {
  listeners.add(listener)
  snapshot = Date.now()
  if (!timer) {
    timer = setInterval(() => {
      snapshot = Date.now()
      for (const notify of listeners) notify()
    }, 10_000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

/** Shared client clock. Zero during server rendering/hydration; never invent a server timestamp. */
export function useCurrentTime() {
  return useSyncExternalStore(subscribe, () => snapshot, () => 0)
}
