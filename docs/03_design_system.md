# Tonfort — Design System (Apple-style)

Fuente de verdad de los tokens visuales. Todo componente debe usar estos tokens.
Implementación en `app/globals.css` + `app/layout.tsx`.

---

## 1. Identidad de marca (fija, no negociable)

### Tipografía

| Función | Fuente | Estilo | Pesos | Uso |
|---|---|---|---|---|
| Display / titulares de impacto | **Arvo** (serif) | Serif, alto contraste | 400, 700 | Hero headlines, nombres de producto grandes, momentos editoriales |
| Cuerpo / UI | **Montserrat** (sans-serif) | Sans, geométrica | 300, 400, 500, 600, 700 | Texto funcional, botones, labels, navegación, formularios |
| Datos / código | Sistema **monospace** | Tabular | — | Tablas de datos, números alineados, snippets de código |

- **Arvo** para los momentos de impacto visual: display y h1.
- **Montserrat** para todo lo funcional: h2, h3, body, caption, labels, botones.
- La regla es: *serif para el asombro, sans para la acción*.

### Paleta de colores (inmutable)

| Token | Hex | Rol |
|---|---|---|
| `--brand-navy` | `#0B1D3A` | Azul marino — color primario, profundidad |
| `--brand-beige` | `#E8DFD0` | Beige cálido — color secundario, calidez |
| `--brand-black` | `#0A0A0A` | Negro — texto sobre fondo claro |
| `--brand-white` | `#FFFFFF` | Blanco — texto sobre fondo oscuro |

**Principio de acento único por pantalla:** nunca mezclar navy y beige como protagonistas simultáneos. Uno domina, el otro acompaña.

- **Pantallas claras** (staff, landing secundaria): fondo blanco, texto negro, navy como acento principal (botones, links, estados activos). Beige como sabor sutil (cards, bordes, micro-acentos).
- **Pantallas oscuras** (hero 3D, visita de cliente): fondo navy, texto blanco, beige como acento principal (glow, highlights, interactivos 3D). Navy como profundidad.

---

## 2. Principios Apple-style (patrones estructurales)

### 2.1 Hero full-bleed
Una sola idea. Tipografía Arvo enorme (80–120 px en desktop), generoso espacio negativo alrededor. Fondo sólido oscuro (navy) o claro (beige/blanco), alternando por sección. El scroll produce *fade + slight scale*, nunca cortes abruptos.

### 2.2 Composición centrada, jerarquía clara
`Título grande (Arvo) → Subtítulo corto (Montserrat) → 1-2 botones`. Máximo 60–72 caracteres por línea en body. Centrar horizontalmente; dejar respirar verticalmente.

### 2.3 Botones tipo píldora
`border-radius: 999px`, tamaño generoso (`py-3 px-8`), texto Montserrat medium. Un botón sólido (navy o beige según fondo), uno outline/borde. Transición `opacity 150ms ease-out` al hover; escala `0.95` al press.

### 2.4 Tarjetas de features expandibles
Título + ícono `+`. Al hacer clic, se despliega el detalle (Accordion/Radix Disclosures). Usar para especificaciones de Propuestas/Productos. `border-radius: 20–24px`, sombra difusa sutil.

### 2.5 Transición entre secciones
`fade + slight scale` al hacer scroll. Usar `motion/react` `useScroll` + `useTransform` o el componente `Reveal` existente. Curva estándar: `cubic-bezier(0.4, 0, 0.2, 1)`, duración 300–500 ms.

### 2.6 Fondos con efecto de luz / glow
Radial gradient o `blur-[100–120px]` con el color de acento detrás de elementos 3D o imágenes de producto. En fondos oscuros usar beige; en fondos claros usar navy a baja opacidad.

### 2.7 Barra de navegación superior (glassmorphism)
Fondo translúcido `bg-background/80` + `backdrop-blur-xl` desde el primer scroll. Nunca sólido desde el inicio. Border inferior sutil `border-border`.

### 2.8 Negativo espacial generoso
Secciones hero mínimo 120 px de padding vertical. Grid de 8 px paratodo lo demás. Menos es más.

---

## 3. Paleta de colores (tokens temáticos)

### 3.1 Base de marca (invariante)

```css
:root {
  --brand-navy:  #0B1D3A;  /* primary dark */
  --brand-beige: #E8DFD0;  /* secondary warm */
  --brand-black: #0A0A0A;  /* neutral text (light) */
  --brand-white: #FFFFFF;  /* neutral text (dark) */
}
```

### 3.2 Tema claro (light)

| Token | Valor | CSS var |
|---|---|---|
| background | `#FFFFFF` | `--background` |
| foreground | `#0A0A0A` | `--foreground` |
| card | `#FFFFFF` | `--card` |
| card-foreground | `#0A0A0A` | `--card-foreground` |
| popover | `#FFFFFF` | `--popover` |
| popover-foreground | `#0A0A0A` | `--popover-foreground` |
| **primary** (navy accent) | `#0B1D3A` | `--primary` |
| primary-foreground | `#FFFFFF` | `--primary-foreground` |
| **secondary** (beige) | `#E8DFD0` | `--secondary` |
| secondary-foreground | `#0B1D3A` | `--secondary-foreground` |
| muted | `#F7F4EE` | `--muted` |
| muted-foreground | `#7A7A7A` | `--muted-foreground` |
| accent | `#0B1D3A` | `--accent` |
| accent-foreground | `#FFFFFF` | `--accent-foreground` |
| border | `#E8DFD0` | `--border` |
| input | `#F7F4EE` | `--input` |
| ring | `#0B1D3A` | `--ring` |

### 3.3 Tema oscuro (dark)

| Token | Valor | CSS var |
|---|---|---|
| background | `#0B1D3A` | `--background` |
| foreground | `#F8F8F8` | `--foreground` |
| card | `#0A1A33` | `--card` |
| card-foreground | `#F8F8F8` | `--card-foreground` |
| popover | `#0A1A33` | `--popover` |
| popover-foreground | `#F8F8F8` | `--popover-foreground` |
| **primary** (beige accent) | `#E8DFD0` | `--primary` |
| primary-foreground | `#0B1D3A` | `--primary-foreground` |
| secondary | `#14283D` | `--secondary` |
| secondary-foreground | `#F8F8F8` | `--secondary-foreground` |
| muted | `#152B42` | `--muted` |
| muted-foreground | `#8A9BB8` | `--muted-foreground` |
| accent | `#E8DFD0` | `--accent` |
| accent-foreground | `#0B1D3A` | `--accent-foreground` |
| border | `#2A3F5A` | `--border` |
| input | `#152B42` | `--input` |
| ring | `#E8DFD0` | `--ring` |

> En dark mode, `primary` cambia de navy a beige: el acento dominante en pantallas oscuras es el beige (glow, highlights, 3D interactivos), no el navy. El navy actúa como fondo/profundidad.

### 3.4 Gráfica (charts)

**Light:** navy → beige → gris claro (`#0B1D3A`, `#E8DFD0`, `#7A7A7A`, `#B8B8B8`, `#DEDE3`)
**Dark:** beige → navy claro → gris (`#E8DFD0`, `#8A9BB8`, `#3A3F5A`, `#2A3F5A`, `#152B42`)

### 3.5 Sidebar (staff)

Sigue el token del tema activo (`--sidebar` = `--background`, `--sidebar-primary` = `--primary`, etc.).

---

## 4. Escala tipográfica

Los valores de esta tabla son los de `app/globals.css` (líneas 195-214), que es la fuente de
verdad. Esta tabla documenta esa implementación: no la redefine.

| Token | Fuente | Tamaño (px) | Rem | Line-height | Weight | Letter-spacing | Uso |
|---|---|---|---|---|---|---|---|
| **display-xl** | Arvo | 44–120 | `clamp(2.75rem, 8vw, 7.5rem)` | 0.98 | 700 | -0.03em | Hero headlines |
| **display-lg** | Arvo | 32–72 | `clamp(2rem, 5.5vw, 4.5rem)` | 1.02 | 700 | -0.025em | Section headlines (display moments) |
| **display-md** | Arvo | 24–44 | `clamp(1.5rem, 3.5vw, 2.75rem)` | 1.08 | 700 | -0.02em | Sub-headlines, agenda h1 |
| **h1** | Arvo | 36 | 2.25rem | 1.05 | 700 | -0.02em | Page headings (staff pages, landing) |
| **h2** | Montserrat | 24 | 1.5rem | 1.1 | 600 | -0.01em | Section headings |
| **h3** | Montserrat | 20 | 1.25rem | 1.2 | 500 | normal | Sub-section headings |
| **body** | Montserrat | 16 | 1rem | 1.6 | 400 | normal | Main text |
| **large** | Montserrat | 18 | 1.125rem | 1.55 | 400 | normal | Lead paragraphs |
| **small** | Montserrat | 14 | 0.875rem | 1.5 | 500 | normal | Labels, UI text |
| **caption** | Montserrat | 12 | 0.75rem | 1.4 | 400 | normal | Fine print, hints |

### Mapeo de utilidades

| Clase | Fuente | Uso |
|---|---|---|
| `.font-display` | Arvo | `font-family: var(--font-display)` |
| `.font-sans` | Montserrat | `font-family: var(--font-sans)` (default del body) |
| `.font-mono` | Sistema | `font-family: var(--font-mono)` (datos/tablas) |
| `.display-xl` | Arvo | Hero headline — fluid clamp |
| `.display-lg` | Arvo | Section headline — fluid clamp |
| `.display-md` | Arvo | Sub-headline — fluid clamp |
| `.eyebrow` | Montserrat | Uppercase tracked labels — Montserrat 600, 0.72rem, tracking 0.28em |
| `.section-y` | — | Ritmo vertical de sección: `py-24 md:py-32` |
| `.text-balance` | — | `text-wrap: balance` |
| `.text-pretty` | — | `text-wrap: pretty` |
| `.noise-overlay` | — | Subtle noise overlay (opacity 0.04) |

> **Uso obligatorio.** Las clases `display-*`, `eyebrow` y `section-y` no son opcionales: un
> titular de sección se escribe `className="display-lg font-display"`, no con un
> `text-[clamp(...)]` propio. Escribir un clamp a mano por sección es lo que produjo tres
> medidas distintas para el mismo rol (`3.25rem`, `4rem`, `6rem`) y un hero un 13% más grande
> de lo que el sistema permite.
>
> Igual con los colores: los tokens existen (`--royal-bright`, `--royal`, `--warm-light`,
> `--brand-navy`, `--brand-beige`, `--copy`, `--elevated`) y se usan como utilidades
> (`text-royal-bright`, `bg-elevated`, `text-copy`). No se escribe un hex suelto en el JSX.

> **Nota de migración:** los usages antiguos de `font-mono` para labels UI (navegación, eyebrow, botones) deben cambiar a `font-sans`. `font-mono` se reserva únicamente para datos tabulares y snippets de código.

---

## 5. Sistema de espaciado

Basado en múltiplos de **8 px**.

| Escala | Rem | px | Uso típico |
|---|---|---|---|
| 4 | 0.25 rem | 4 | Micro-gaps |
| 8 | 0.5 rem | 8 | Icon spacing |
| 12 | 0.75 rem | 12 | Small gaps |
| 16 | 1 rem | 16 | Element gaps |
| 20 | 1.25 rem | 20 | — |
| 24 | 1.5 rem | 24 | Card padding |
| 32 | 2 rem | 32 | Section gaps |
| 40 | 2.5 rem | 40 | — |
| 48 | 3 rem | 48 | Section padding |
| 56 | 3.5 rem | 56 | — |
| 64 | 4 rem | 64 | Large section gap |
| 80 | 5 rem | 80 | Hero padding top |
| 96 | 6 rem | 96 | — |
| 120 | 7.5 rem | 120 | **Mínimo vertical en hero** |
| 160 | 10 rem | 160 | Hero máximo |

**Secciones hero:** mínimo `120 px` de padding vertical (`py-24` a `py-40` según viewport).

---

## 6. Radios de borde

| Token | Valor | Uso |
|---|---|---|
| `--radius-pill` | `999px` | Botones, chips, tags, píldoras |
| `--radius-card` | `20–24px` (Tailwind `rounded-2xl` / `rounded-3xl`) | Cards, modales, diálogos |
| `--radius-input` | `12px` (Tailwind `rounded-xl`) | Inputs, textareas, botones pequeños |
| `--radius-sm` | `8px` (Tailwind `rounded-lg`) | Badges, micro-elementos |

---

## 7. Sombras

Difusas y sutiles. Nunca duras. Usar opacidad máxima ~8 %.

| Token | Valor | Uso |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)` | Elementos planos |
| `--shadow` | `0 4px 6px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)` | Cards lev Levlevadas |
| `--shadow-md` | `0 8px 16px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)` | Cards hover |
| `--shadow-lg` | `0 16px 32px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.07)` | Modales, dropdowns |
| `--shadow-xl` | `0 24px 48px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.08)` | Paneles flotantes |

En dark mode, las sombras usan `rgba(0,0,0,0.15–0.30)` para mantener visibilidad sobre fondos oscuros. El token `--shadow` se adapta vía CSS:

```css
@theme inline {
  --shadow: 0 4px 6px hsl(0 0% 0% / 0.04), 0 1px 3px hsl(0 0% 0% / 0.06);
}
.dark {
  --shadow: 0 4px 6px hsl(0 0% 0% / 0.20), 0 1px 3px hsl(0 0% 0% / 0.15);
}
```

---

## 8. Animación & Easing

| Token | Valor | Uso |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Todas las transiciones |
| `--duration-micro` | `150ms` | Hover, press |
| `--duration-sm` | `250ms` | Toggle, micro-interacción |
| `--duration-md` | `300–500ms` | Scroll reveal, transición secciones |
| `--duration-lg` | `600–800ms` | Hero entrance, animaciones largas |
| `--delay-step` | `0.05–0.1s` | Stagger entre elementos |

**Scroll transitions:** fade + slight scale. Usar `motion/react` con `useScroll` + `useTransform` (ver `components/tonfort/hero.tsx`, `components/tonfort/lighting.tsx`, `components/tonfort/reveal.tsx`).

---

## 9. Breakpoints responsive

| Token | Min-width | Dispositivo |
|---|---|---|
| `sm` | 640 px | Mobile landscape / tablet pequeña |
| `md` | 768 px | Tablet |
| `lg` | 1024 px | Desktop |
| `xl` | 1280 px | Desktop ancho |
| `2xl` | 1536 px | Max width container |

Container principal: `max-w-7xl` (1280 px). Padding horizontal: `px-6` (mobile) → `lg:px-10` (desktop).

---

## 10. Aplicación: Panel de staff (Kilo Code)

El panel de staff prioriza funcionalidad sobre estética. La tipografía Montserrat domina.

- **Fondo:** claro (blanco `#FFFFFF` / beige `#F7F4EE` en cards). Navy solo en acentos y estados activos.
- **Tipografía:**
  - h1 (título de página): Arvo, `font-display text-3xl`
  - h2 (sub-sección, título de versión): Montserrat, `font-sans text-2xl font-medium`
  - h3 (labels de formulario): Montserrat, `text-xs font-sans uppercase tracking-widest`
  - Body: Montserrat, `text-sm`
  - Datos tabulares: monospace (`font-mono tabular-nums`)
- **Sidebar:** `bg-background/95 backdrop-blur-xl`, borde `border-border`. Items activos usan `bg-primary text-primary-foreground`.
- **Botones:** píldora (`rounded-full`), Montserrat medium. Primario en navy. Outline para secundarias.
- **Cards/tables:** `rounded-2xl`, sombra `--shadow-sm`. Hover sutil (`hover:shadow-md`).
- **Estados de cita:** colores semánticos (amber, emerald, rose) del `lib/estados.ts` — no son de marca, son de dominio.

---

## 11. Aplicación: Página de cotización del cliente (visor 3D)

Aquí vive el estilo Apple hero completo.

- **Fondo:** navy oscuro `#0B1D3A` (full-bleed). El modelo 3D flota centrado.
- **Glow detrás del 3D:** radial `blur-[100–120px] bg-secondary` (beige) con opacity animada via scroll. Ver `components/tonfort/lighting.tsx`.
- **Tipografía:** Arvo en el h1 hero (80–120 px), Montserrat en subtítulo y botones.
- **Botones:** píldora, uno sólido (beige sobre navy) y uno outline (borde beige).
- **Tarjetas de features:** expandibles (Accordion). Título + `+` que despliega especificaciones. `rounded-2xl`, fondo `bg-card/80 backdrop-blur`.
- **Transiciones:** fade + scale al hacer scroll entre secciones. Reveal con `motion/react`.
- **Navbar:** glassmorphism `bg-background/80 backdrop-blur-xl`, nunca sólido al inicio.

---

## 12. Ejemplos de componentes (Tailwind CSS)

### 12.1 Botón píldora primario

```tsx
<a
  href="/agenda"
  className={cn(
    "inline-flex items-center justify-center rounded-full px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-widest transition-all duration-200 ease-out",
    "bg-primary text-primary-foreground",
    "hover:opacity-90 active:scale-95",
  )}
>
  Agendar una conversación
</a>
```

### 12.2 Hero section full-bleed (dark, 3D)

```tsx
<section className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden">
  {/* Imagen / canvas 3D */}
  <img
    src="/images/hero-fullbleed.png"
    alt="Mobiliario Tonfort con iluminación integrada"
    className="absolute inset-0 h-full w-full object-cover"
  />
  {/* Overlay oscuro */}
  <div className="absolute inset-0 bg-primary/85" />
  {/* Glow beige detrás del producto */}
  <div className="absolute left-1/2 top-1/2 h-[40vw] w-[40vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary blur-[120px] opacity-30" />

  <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
    <h1 className="display-xl text-balance font-display font-bold text-brand-white">
      No hacemos muebles. Diseñamos el espacio que habitas.
    </h1>
    <p className="mx-auto mt-8 max-w-xl text-pretty text-lg leading-relaxed text-brand-white/80">
      Cocinas, closets, muebles de TV y puertas en madera, pensados desde la arquitectura,
      la planeación y la luz.
    </p>
    <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
      <a
        href="/proyectos"
        className="rounded-full bg-brand-white px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-widest text-primary transition-opacity hover:opacity-90"
      >
        Ver proyectos
      </a>
      <a
        href="#contacto"
        className="rounded-full border border-brand-white/30 px-8 py-3.5 font-sans text-xs font-medium uppercase tracking-widest text-brand-white transition-colors hover:bg-brand-white/10"
      >
        Diseñemos tu espacio
      </a>
    </div>
  </div>
</section>
```

### 12.3 Tarjeta de feature expandible

```tsx
<div className="w-full rounded-2xl border border-border bg-card shadow-sm">
  <Accordion type="single" collapsible>
    <AccordionItem value="especificaciones" className="border-0">
      <AccordionTrigger className="flex w-full items-center gap-4 px-6 py-4 text-left hover:no-underline">
        <span className="font-sans text-lg font-medium text-foreground">Especificaciones</span>
        <Plus className="ml-auto h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300" />
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>Dimensiones: 240 × 60 × 72 cm</li>
          <li>Acabado: Melamina blanca mate</li>
          <li>Iluminación: LED 3000K integrado</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</div>
```

### 12.4 Navbar glassmorphism

```tsx
<header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 text-foreground backdrop-blur-xl transition-colors duration-500">
  <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 lg:px-10">
    <Logo />
    <ul className="hidden items-center gap-8 md:flex">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            className="font-sans text-xs font-medium uppercase tracking-widest text-muted-foreground transition-opacity hover:text-foreground"
          >
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
</header>
```

---

## 13. Implementación

### 13.1 Fuentes (`app/layout.tsx`)

```tsx
import { Arvo, Montserrat } from 'next/font/google'

const arvo = Arvo({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: '--font-arvo',
})

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: '--font-montserrat',
})

// body className: `${arvo.variable} ${montserrat.variable} font-sans antialiased`
```

### 13.2 CSS variables (`app/globals.css`)

```css
:root {
  /* Brand */
  --brand-navy:  #0B1D3A;
  --brand-beige: #E8DFD0;
  --brand-black: #0A0A0A;
  --brand-white: #FFFFFF;

  /* Theme (light) */
  --background: #FFFFFF;
  --foreground: #0A0A0A;
  /* ... resto de tokens ... */
}

.dark {
  --background: #0B1D3A;
  --foreground: #F8F8F8;
  /* ... dark tokens ... */
}
```

### 13.3 Dark mode

Support vía `next-themes` (configurado en `app/layout.tsx`). El toggle vive en `components/tonfort/theme-toggle.tsx`. Se aplica la clase `.dark` en `<html>`.

### 13.4 Iconografía

- `lucide-react` es la librería de iconos canónica.
- shadcn/ui component library en `components/ui/`.
- Icons: tamaño estándar 16–24 px (`h-4 w-4` a `h-6 w-6`).

### 13.5 Componentes de dominio

| Directorio | Uso |
|---|---|
| `components/tonfort/` | Componentes de dominio (hero, footer, navigation, etc.) |
| `components/ui/` | Primitivas shadcn/ui |

---

## 14. Reglas de uso

1. **Un acento por pantalla.** Navy domina en dark; beige domina en light como acento sutil.
2. **Arvo solo para display/h1.** No usar Arvo en body, labels, ni navegación.
3. **Montserrat para todo lo funcional.** Botones, forms, datos tabulares (excepto números alineados → monospace).
4. **8 px grid** para todo spacing. Secciones hero mínimo 120 px vertical padding.
5. **`cubic-bezier(0.4, 0, 0.2, 1)`** como easing estándar. Duraciones 150 ms (micro) a 800 ms (reveal).
6. **Sombras siempre difusas.** Nunca bordes duras ni sombras nítidas.
7. **glassmorphism** en navbar y tarjetas overlay. Nunca sólido desde el inicio.
8. **`font-display`** = Arvo. **`font-sans`** = Montserrat. **`font-mono`** = solo datos.
