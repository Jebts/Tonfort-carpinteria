# Convenciones de código (carpintería)

Fuente de verdad para escribir código en **este repo** (carpintería, app en la raíz).
Se aplica a TypeScript, React, Next.js App Router, Tailwind v4 y tests. Jerarquía de
autoridad: `Constitucion_del_Proyecto.md` > `Arquitectura_del_Proyecto.md` > esta guía >
código existente (si hay conflicto, se actualiza el código, no esta guía).

## 1. TypeScript

- **Modo estricto activado** (`tsconfig.json` `strict: true`). No se usa `any`.
- **Tipos re-exportados desde su módulo canónico**. Un tipo se define una sola vez
  y se re-exporta si otros dominios lo necesitan.
  - Tipos de dominio puro → `lib/*.ts`.
  - Tipos de componente → junto al componente.
- **Imports de tipo con `type`** cuando no se necesita el valor en runtime:
  `import { type Canal } from '@/lib/canales';`.
- **Interfaces para objetos** (component props, input shapes), **type alias** para
  uniones, tuplas o mapped types.

## 2. Next.js: Server Components vs Client Components

- Por defecto, **todo componente es Server Component** (sin `'use client'`).
- `'use client'` solo cuando se necesita estado, eventos de browser, hooks de efecto,
  navegación del cliente o context de tema.
- **Server Actions** (`'use server'`) solo en `lib/actions/`.
- **Route Handlers** (`route.ts`) solo en `app/api/`.

## 3. Imports y path aliases

- **Path alias canónico:** `@/` → raíz del repo (definido en `tsconfig.json`).
  - Componentes: `@/components/...`
  - Lógica: `@/lib/...`
  - UI: `@/components/ui/...`
- **Imports ordenados** (grupos separados por línea vacía):
  1. React / Next / externos.
  2. Internos `@/lib/...`.
  3. Internos `@/components/...`.
  4. Relativos (solo si no hay alternativa con alias).
- No se usan imports relativos entre `app/` y `lib/` ni entre `components/` y `lib/`.

## 4. Naming de archivos y carpetas

| Tipo | Convención | Ejemplo |
|---|---|---|
| Componente React | **PascalCase** `.tsx` | `CanalesAtencionInput.tsx` |
| Página / layout | **kebab-case** `page.tsx` / `layout.tsx` | `nueva/page.tsx` |
| Server Action | **kebab-case** `.ts` | `empresa.ts`, `cancelar-cita.ts` |
| Utilidad pura | **kebab-case** `.ts` | `canales.ts`, `horario.ts` |
| Test unitario | **kebab-case** `.test.ts` | `llm.test.ts` |
| Carpeta de dominio | **kebab-case** | `staff/`, `agenda/`, `proyectos/` |

## 5. Componentes

- **Named exports** preferidos para componentes.
- **Tipos de props** definidos inline o en interfaces exportadas junto al componente.
- **Primitivas UI** (`components/ui/`) son wrappers de elementos nativos con
  `React.ComponentProps<"input">`, etc.
- **`cn()`** de `lib/utils.ts` es la única forma permitida de mergear clases.
  No se concatenan strings de className con `+` ni con template literals fuera de `cn()`.

## 6. Tailwind v4 + tokens

- **No existe `tailwind.config.js`**. La configuración vive en `app/globals.css`
  (CSS custom properties / design tokens) y `app/globals-tailwind.css` (importa
  `tailwindcss` y mapea los tokens con `@theme inline`).
- Todos los estilos de componente se escriben con **utilities de Tailwind**.
- Si un valor no tiene token definido, **se define el token primero**, luego se usa.

## 7. Server Actions y datos

- **Ubicación:** `lib/actions/*.ts`.
- **Firma:** `export async function nombreAccion(_prev: State, formData: FormData): Promise<State>`.
- **Validación:** extraer de `formData`, validar en server, operar, `revalidatePath(...)`.
- **Supabase:**
  - `lib/supabase/client.ts` → browser (JWT + RLS).
  - `lib/supabase/server.ts` → Server Components / Route Handlers (cookies + RLS).
  - `lib/supabase/admin.ts` → server-only, service_role (BYPASSRLS).
- **Auth gates:** `requireStaff()` en el server antes de operaciones sensibles.

## 8. Estado y efectos en componentes cliente

- **`useState`** para estado local; **`useCallback`** para callbacks estables;
  **`useRef`** para referencias; **`useEffect`** solo para side-effects genuinos.
- **Sets / Maps** para colecciones que necesitan membership test o updates inmutables.

## 9. Formularios

- **Server Actions con `useFormState`** para submit.
- **`onSubmit` client-side** para validación de formato y serialización de JSON en
  hidden inputs antes de enviar.
- **Labels** siempre con `htmlFor` apuntando al `id` del input.
- **Validación dual:** cliente (feedback inmediato) + server (re-validación de verdad).

## 10. Testing

- **Unit tests** (`tests/*.test.ts`) → **vitest** (lógica pura, server actions, utils).
- **Convención de nombres:** `*.test.ts` para unit.

## 11. Linting y typecheck

- **Linter:** `next lint` (ESLint con config de Next.js) — pre-existente, no bloquea.
- **Typecheck:** `tsc --noEmit` (modo estricto).
- No se comitea código con errores de tipo.

## 12. Commits

- Mensajes en español, imperativo, primera línea < 72 caracteres.
- Formato: `<tipo>(<scope>): <descripción>`.
  - Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
  - Scope: `web`, `infra`, `docs`.
