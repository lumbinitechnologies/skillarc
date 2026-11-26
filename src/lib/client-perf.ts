export function startClientTiming(name: string) {
  if (process.env.NEXT_PUBLIC_PERF_DIAGNOSTICS !== "true" || typeof performance === "undefined") {
    return () => {}
  }

  const id = `${name}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const startMark = `${id}:start`
  const endMark = `${id}:end`
  performance.mark(startMark)

  return () => {
    performance.mark(endMark)
    performance.measure(name, startMark, endMark)
  }
}
