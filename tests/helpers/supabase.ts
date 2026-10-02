import type { SupabaseClient } from "@supabase/supabase-js"
import { vi } from "vitest"

type Result = { data: unknown; error: unknown }
type TableQueue = { items: Result[]; cursor: number }

// Chainable, thenable mock: cada `await` consome el siguiente resultado de la
// cola compartida por tabla. Soporta cualquier nombre de tabla. Una sola cadena
// por tabla → el cursor se comparte entre select e insert/delete/update.
export function makeSupabase(initial?: Record<string, Result[]>): SupabaseClient {
  const state: Record<string, TableQueue> = {}
  const getState = (t: string): TableQueue => {
    if (!state[t]) state[t] = { items: initial?.[t] ?? [], cursor: 0 }
    return state[t]
  }
  const mk = (st: TableQueue) => {
    const handler = {
      get(_t: unknown, prop: string) {
        if (prop === "then") {
          return (onFulfilled?: (v: unknown) => unknown) => {
            const r = st.items[st.cursor++] ?? { data: null, error: null }
            return Promise.resolve(r).then(onFulfilled)
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return () => proxy
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proxy: any = new Proxy(function () {}, handler)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return proxy
  }
  const cache: Record<string, ReturnType<typeof mk>> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = {
    from: (table: string) => {
      if (!cache[table]) cache[table] = mk(getState(table))
      return cache[table]
    },
    storage: {
      createBucket: vi.fn().mockResolvedValue({ error: null }),
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
      }),
    },
  }
  return supabase as SupabaseClient
}

// Reinicia los cursores de un supabase mock entre tests.
export function resetSupabase(supabase: SupabaseClient): void {
  // Acceso interno para tests: no aplica en prod.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = supabase as any
  if (s && s.from) {
    // No-op: el mock ya arranca limpio por instancia.
  }
}
