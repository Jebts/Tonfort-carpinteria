import type { MetadataRoute } from "next"

// Solo rutas estáticas y las dos ramas del portafolio. Las páginas de proyecto
// son dinámicas (`force-dynamic`) y quedan fuera del sitemap a propósito.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tonfort.co"
  const ahora = new Date()

  const estaticas: { path: string; prioridad: number; frecuencia: "daily" | "weekly" | "monthly" }[] = [
    { path: "/", prioridad: 1, frecuencia: "weekly" },
    { path: "/sede", prioridad: 0.8, frecuencia: "monthly" },
    { path: "/historia", prioridad: 0.6, frecuencia: "monthly" },
    { path: "/portafolio/santa-marta", prioridad: 0.8, frecuencia: "weekly" },
    { path: "/portafolio/bogota", prioridad: 0.6, frecuencia: "monthly" },
    { path: "/agenda/modalidad", prioridad: 0.9, frecuencia: "monthly" },
  ]

  return estaticas.map(({ path, prioridad, frecuencia }) => ({
    url: `${base}${path}`,
    lastModified: ahora,
    changeFrequency: frecuencia,
    priority: prioridad,
  }))
}
