import { useEffect, useState } from "react"

/**
 * Custom hook to debounce rapidly changing values (e.g. search inputs).
 * Prevents firing excessive database queries / API requests on every keystroke.
 *
 * @param value The raw input value to debounce
 * @param delayMs Debounce delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delayMs])

  return debouncedValue
}
