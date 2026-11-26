export type PerfTiming = {
  name: string
  durationMs: number
  ok: boolean
}

export function isPerfDiagnosticsEnabled() {
  return process.env.PERF_DIAGNOSTICS === "true"
}

export function logPerfTiming(timing: PerfTiming) {
  if (!isPerfDiagnosticsEnabled()) return

  console.info(JSON.stringify({
    type: "skillarc.performance",
    ...timing,
  }))
}

export async function measureServer<T>(name: string, operation: () => Promise<T>) {
  if (!isPerfDiagnosticsEnabled()) return operation()

  const startedAt = performance.now()
  try {
    const result = await operation()
    logPerfTiming({ name, durationMs: Math.round(performance.now() - startedAt), ok: true })
    return result
  } catch (error) {
    logPerfTiming({ name, durationMs: Math.round(performance.now() - startedAt), ok: false })
    throw error
  }
}
