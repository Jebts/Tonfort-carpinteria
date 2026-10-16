"use client"

import { useState, useEffect, useCallback, useRef } from "react"

// Debounce con control explícito del temporizador: `cancel()` descarta la
// llamada pendiente y `flush()` la ejecuta ya (para no perder la última edición
// al desmontar o al deshacer).
export type DebouncedFunction<T extends (...args: never[]) => void> = ((
  ...args: Parameters<T>
) => void) & {
  cancel(): void
  flush(): void
}

export function useDebounce<T extends (...args: never[]) => void>(
  callback: T,
  delay: number
): DebouncedFunction<T> {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)
  const argsRef = useRef<unknown[] | null>(null)

  callbackRef.current = callback

  // Ejecuta la llamada pendiente, si la hay, y limpia el temporizador.
  const disparar = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    const args = argsRef.current
    if (!args) return
    argsRef.current = null
    callbackRef.current(...(args as Parameters<T>))
  }, [])

  const debounced = useCallback(
    (...args: unknown[]) => {
      argsRef.current = args
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(disparar, delay)
    },
    [delay, disparar]
  ) as unknown as DebouncedFunction<T>

  debounced.cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    argsRef.current = null
  }, [])

  debounced.flush = disparar

  // Al desmontar no quedan temporizadores colgando (la llamada pendiente se
  // ejecuta antes en el cleanup del componente que use el hook).
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    []
  )

  return debounced
}

export function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}