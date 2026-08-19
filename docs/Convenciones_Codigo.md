# Convenciones de código (saas/)

Fuente de verdad para escribir código en `apps/saas/`. Se aplica a TypeScript, React,
Next.js App Router, Tailwind v4 y tests. Jerarquía de autoridad:
`Constitucion_del_Proyecto.md` > `Arquitectura_del_Proyecto.md` > esta guía >
código existente (si hay conflicto, se actualiza el código, no esta guía).

## 1. TypeScript

- **Modo estricto activado** (`tsconfig.json` `strict: true`). No se usa `any`.
- **Tipos re-exportados desde su módulo canónico**. Un tipo se define una sola vez
  y se re-exporta si otros dominios lo necesitan.
  - Tipos de dominio puro (`Canal`, `HorarioMulti`, `Franja`) → `lib/*.ts`.
  - Tipos de componente (`CanalConOwner`) → junto al componente.
- **Imports de tipo con `type`** cuando no se necesita el valor en runtime:
  `import { type Canal } from '@/lib/canales';`.
- **Interfaces para objetos** (component props, input shapes), **type alias** para
  uniones, tuplas o mapped types.

## 2. Next.js: Server Components vs Client Components

- Por defecto, **todo componente es Server Component** (sin `'use client'`).
- `'use client'` solo cuando se necesita:
  - Estado (`useState`, `useReducer`).
  - Eventos de browser (`onClick`, `onChange`, `onSubmit`).
  - Hooks de efecto (`useEffect`, `useLayoutEffect`).
  - Navegación del cliente (`useRouter`, `Link` con `router.push`).
  - Context de tema (`next-themes`).
- **Server Actions** (`'use server'`) solo en `lib/actions/`.
- **Route Handlers** (`route.ts`) solo en `app/api/`.

## 3. Imports y path aliases

- **Path alias canónico:** `@/` → `apps/saas/` (definido en `tsconfig.json`).
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
| Test unitario | **kebab-case** `.test.ts` | `empresa-flujo.test.ts` |
| Test E2E | **kebab-case** `.spec.ts` | `editar.spec.ts` |
| Carpeta de dominio | **kebab-case** | `staff/`, `panel/`, `operador/` |

- Dentro de `app/`, las rutas usan **segmentos kebab-case**:
  `/staff/empresas/nueva`, `/panel/operadores`.
- Excepción: dentro de carpetas de feature, los archivos de componente auxiliar
  usan **PascalCase** (ej. `MfaEnrolarForm.tsx`, `MfaEnrolarEmailForm.tsx`).

## 5. Componentes

- **Named exports** preferidos para componentes:
  `export function CanalesAtencionInput(...) { ... }`
- **Tipos de props** definidos inline o en interfaces exportadas junto al componente.
- **Primitivas UI** (`components/ui/`) son wrappers de elementos nativos con
  `React.ComponentProps<"input">`, `React.ComponentProps<"div">`, etc.
- **Componentes de dominio** (`staff/`, `panel/`, etc.) comparten primitivas de
  `ui/` y nunca definen estilos inline cuando un primitiva ya lo cubre.
- **`cn()`** de `lib/utils.ts` es la única forma permitida de mergear clases:
  `className={cn("base-class", className)}`.
  No se concatenan strings de className con `+` ni con template literals fuera de `cn()`.

## 6. Tailwind v4 + tokens

- **No existe `tailwind.config.js`**. La configuración vive en dos archivos:
  - `apps/saas/app/globals.css`: define las **CSS custom properties** (design tokens).
  - `apps/saas/app/globals-tailwind.css`: importa `tailwindcss` y mapea los tokens con
    `@theme inline`.
- Todos los estilos de componente se escriben con **utilities de Tailwind**.
  - Paleta: `bg-primary`, `text-muted-foreground`, `border-border`, etc.
  - Espaciado: `space-y-4`, `p-4`, `gap-2`.
  - Layout: `flex`, `grid`, `sm:grid-cols-2`.
- Si un valor no tiene token definido, **se define el token primero** en
  `globals.css` + `globals-tailwind.css`, luego se usa en el componente.
- No se agregan estilos inline (`style={{...}}`) salvo valores dinámicos
  imposibles de expresar en Tailwind.

## 7. Server Actions y datos

- **Ubicación:** `lib/actions/*.ts`.
- **Firma:** `export async function nombreAccion(_prev: State, formData: FormData): Promise<State>`.
- **Validación:**
  1. Extraer valores de `formData` con `String(formData.get('campo') ?? '')`.
  2. Validar en server (return temprano con `{ error: '...' }`).
  3. Operar con Supabase.
  4. `revalidatePath(...)` tras éxito.
- **JSON en forms:** los objetos complejos (`identidad`, `horario_atencion`,
  `canales`, `usuarios`) se serializan en **hidden inputs** desde el cliente y
  se parsean en el server. Nunca se envía JSON crudo al usuario.
- **Supabase:**
  - `lib/supabase/client.ts` → browser (JWT + RLS).
  - `lib/supabase/server.ts` → Server Components / Route Handlers (cookies + RLS).
  - `lib/supabase/admin.ts` → server-only, service_role (BYPASSRLS).
- **Auth gates:** `requireStaff()` / `requireEmpresa()` en el server antes de
  cualquier operación sensible.

## 8. Estado y efectos en componentes cliente

- **`useState`** para estado local de formularios y UI.
- **`useCallback`** para callbacks estables pasados a children (especialmente en
  listas renderizadas).
- **`useRef`** para referencias a inputs hidden y medir elementos.
- **`useEffect`** solo para side-effects genuinos (fetch, listeners, sync con DOM).
  No para derivar estado (eso va en render).
- **Sets / Maps** para colecciones de estado que necesitan membership test o
  actualizaciones inmutables frecuentes (ej. `canalesInvalidos: Set<string>`).

## 9. Formularios

- **Server Actions con `useFormState`** para submit del form.
- **`onSubmit` client-side** para:
  - Validación E.164 / formato antes de enviar.
  - Serializar JSON en hidden inputs.
  - Bloquear submit con `disabled={...}` en el botón primario.
- **Campos controlados:** `value={...}` + `onChange={(e) => setX(...)}`.
- **Labels** siempre con `htmlFor` apuntando al `id` del input.
- **Validación dual:** cliente (feedback inmediato, botón disabled) + server
  (re-validación de verdad, no se confía solo en el cliente).

## 10. Testing

- **Unit tests** (`tests/*.test.ts`) → **vitest**.
  - Cubren lógica pura: `canales.ts`, `horario.ts`, server actions, utilidades.
- **E2E tests** (`tests-e2e/*.spec.ts`) → **Playwright**.
  - Cubren flujos completos: login, alta de empresa, edición, validaciones.
  - Usan selectores semánticos (`getByText`, `getByRole`) no selectores frágiles.
- **Convención de nombres:** `*.test.ts` para unit, `*.spec.ts` para e2e.

## 11. Linting y typecheck

- **Linter:** `next lint` (ESLint con config de Next.js).
- **Typecheck:** `tsc --noEmit` (modo estricto).
- No se comitea código con warnings de lint o errores de tipo.

## 12. Commits

- Mensajes en español, imperativo, primera línea < 72 caracteres.
- Formato: `<tipo>(<scope>): <descripción>`.
  - Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
  - Scope: `web`, `n8n`, `sql`, `docs`, `infra`.
- Si el commit arregla un issue, referenciarlo en el body.
