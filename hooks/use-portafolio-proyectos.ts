"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import type {
  CategoriaMueble,
  ProyectoConMedia,
  ProyectoFoto,
  ProyectoVisorConPropuesta,
  SedeTaller,
} from "@/lib/supabase/types"

const BASE = "/api/staff/administracion/portafolio"

// Payload de arrastre de media entre proyectos. `origenProyectoId` vive aquí:
// el drop ocurre en la tarjeta destino, que no conoce las fotos del origen.
export interface MediaDragItem {
  tipo: "foto" | "visor" | "portada"
  id: string
  preview?: string
  titulo?: string
}

export interface MediaDragPayload {
  items: MediaDragItem[]
  origenProyectoId: string
}

async function leerError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return data?.error ?? `Error ${res.status}`
  } catch {
    return `Error ${res.status}`
  }
}

export function usePortafolioProyectos(iniciales?: ProyectoConMedia[]) {
  const [proyectos, setProyectos] = useState<ProyectoConMedia[]>(iniciales ?? [])
  const [cargando, setCargando] = useState(!iniciales)

  const refrescar = useCallback(async () => {
    setCargando(true)
    try {
      const res = await fetch(`${BASE}/proyectos?conMedia=true`, { credentials: "include" })
      if (!res.ok) throw new Error(await leerError(res))
      const data = await res.json()
      setProyectos(data.proyectos ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar el portafolio")
    } finally {
      setCargando(false)
    }
  }, [])

  // Con datos iniciales del servidor no hace falta el fetch de entrada; sin
  // ellos (navegación cliente) se cargan aquí.
  useEffect(() => {
    if (iniciales) return
    void refrescar()
  }, [iniciales, refrescar])

  // Helper: reemplaza un proyecto puntual en el estado.
  const reemplazar = useCallback((proyecto: Partial<ProyectoConMedia> & { id: string }) => {
    setProyectos((prev) => prev.map((p) => (p.id === proyecto.id ? { ...p, ...proyecto } : p)))
  }, [])

  // Helper: aplica un parche a un proyecto puntual. Acepta función para poder
  // encadenar varias mutaciones seguidas sin leer un estado obsoleto.
  const parchearLocal = useCallback(
    (id: string, parche: Partial<ProyectoConMedia> | ((prev: ProyectoConMedia) => Partial<ProyectoConMedia>)) => {
      setProyectos((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...(typeof parche === "function" ? parche(p) : parche) } : p
        )
      )
    },
    []
  )

  // Valores de los campos que se van a tocar, para poder revertir SOLO eso si
  // la operación falla (nunca el proyecto entero: eso descartaría media nueva).
  const capturarCampos = useCallback(
    (id: string, campos: Partial<ProyectoConMedia>): Partial<ProyectoConMedia> => {
      const p = proyectos.find((x) => x.id === id)
      if (!p) return {}
      const previos: Partial<ProyectoConMedia> = {}
      for (const clave of Object.keys(campos) as (keyof ProyectoConMedia)[]) {
        previos[clave] = p[clave] as never
      }
      return previos
    },
    [proyectos]
  )

  // ---- Proyectos -----------------------------------------------------------

  const crearProyecto = useCallback(
    async (datos: {
      titulo: string
      descripcion?: string | null
      sede: SedeTaller
      categoria?: CategoriaMueble | null
      orden?: number
    }): Promise<boolean> => {
      try {
        const res = await fetch(`${BASE}/proyectos`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(datos),
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))
        toast.success("Proyecto creado")
        await refrescar()
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al crear proyecto")
        return false
      }
    },
    [refrescar],
  )

  const guardarProyecto = useCallback(
    async (id: string, campos: Partial<ProyectoConMedia>): Promise<boolean> => {
      // Optimista: la UI responde al instante.
      const previoCampos = capturarCampos(id, campos)
      parchearLocal(id, campos)
      try {
        const res = await fetch(`${BASE}/proyectos/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(campos),
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))
        const data = await res.json()
        // El PATCH devuelve el proyecto sin media: se fusionan SOLO los campos
        // devueltos sobre el estado actual, para no descartar fotos/visores que
        // un refresh trajo mientras tanto.
        reemplazar({ id, ...data.proyecto })
        return true
      } catch (err) {
        parchearLocal(id, previoCampos)
        toast.error(err instanceof Error ? err.message : "No se pudo guardar")
        return false
      }
    },
    [capturarCampos, parchearLocal, reemplazar],
  )

  const eliminarProyecto = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE}/proyectos/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error(await leerError(res))
      setProyectos((prev) => prev.filter((p) => p.id !== id))
      toast.success("Proyecto eliminado")
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar")
      return false
    }
  }, [])

  // Reordenamiento dentro de una sede: `orden` secuencial 0..n-1.
  const reordenarProyectos = useCallback(
    async (idsEnOrden: string[]): Promise<boolean> => {
      const cambios = idsEnOrden.map((id, index) => ({ id, orden: index }))
      setProyectos((prev) => {
        const mapa = new Map(cambios.map((c) => [c.id, c.orden]))
        return prev.map((p) => (mapa.has(p.id) ? { ...p, orden: mapa.get(p.id)! } : p))
      })
      try {
        const res = await fetch(`${BASE}/proyectos/reorder`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cambios }),
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al reordenar")
        await refrescar()
        return false
      }
    },
    [refrescar],
  )

  // ---- Fotos ---------------------------------------------------------------

  const subirArchivos = useCallback(
    async (proyectoId: string, files: File[], tipo: "galeria" | "portada"): Promise<boolean> => {
      try {
        const formData = new FormData()
        files.forEach((f) => formData.append("files", f))
        formData.append("tipo", tipo)
        const res = await fetch(`${BASE}/proyectos/${proyectoId}/media`, {
          method: "POST",
          body: formData,
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))
        const data = await res.json()
        const fallos = (data.resultados ?? []).filter((r: { success: boolean }) => !r.success)
        if (fallos.length > 0) {
          toast.error(`${fallos.length} archivo(s) no se pudieron subir`)
        } else {
          toast.success(`${files.length} archivo(s) subido(s)`)
        }
        await refrescar()
        return fallos.length < files.length
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al subir archivos")
        return false
      }
    },
    [refrescar],
  )

  const eliminarFoto = useCallback(
    async (proyectoId: string, fotoId: string): Promise<boolean> => {
      const previos = capturarCampos(proyectoId, { fotos: [] })
      parchearLocal(proyectoId, (p) => ({ fotos: p.fotos.filter((f) => f.id !== fotoId) }))
      try {
        const res = await fetch(`${BASE}/proyectos/${proyectoId}/fotos/${fotoId}`, {
          method: "DELETE",
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))
        // Si la foto borrada era la portada, el backend la limpia: reflejarlo.
        if (previos.portada_url) {
          const borrada = previos.fotos?.find((f) => f.id === fotoId)
          if (borrada && previos.portada_url === borrada.url) {
            parchearLocal(proyectoId, { portada_url: null })
          }
        }
        return true
      } catch (err) {
        parchearLocal(proyectoId, previos)
        toast.error(err instanceof Error ? err.message : "No se pudo eliminar la foto")
        return false
      }
    },
    [capturarCampos, parchearLocal],
  )

  const reordenarFotos = useCallback(
    async (proyectoId: string, idsEnOrden: string[]): Promise<boolean> => {
      const proyecto = proyectos.find((p) => p.id === proyectoId)
      if (!proyecto) return false
      const mapa = new Map(proyecto.fotos.map((f) => [f.id, f]))
      const nuevasFotos: ProyectoFoto[] = idsEnOrden
        .map((id, index) => {
          const foto = mapa.get(id)
          return foto ? { ...foto, orden: index } : null
        })
        .filter((f): f is ProyectoFoto => f !== null)
      const previoCampos = capturarCampos(proyectoId, { fotos: [] })
      parchearLocal(proyectoId, { fotos: nuevasFotos })
      try {
        const res = await fetch(`${BASE}/proyectos/${proyectoId}/fotos/reorder`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: idsEnOrden }),
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))
        return true
      } catch (err) {
        parchearLocal(proyectoId, previoCampos)
        toast.error(err instanceof Error ? err.message : "Error al reordenar la galería")
        return false
      }
    },
    [proyectos, capturarCampos, parchearLocal],
  )

  const cambiarPortada = useCallback(
    async (proyectoId: string, url: string | null): Promise<boolean> => {
      const previoCampos = capturarCampos(proyectoId, { portada_url: null })
      parchearLocal(proyectoId, { portada_url: url })
      try {
        const res = await fetch(`${BASE}/proyectos/${proyectoId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ portada_url: url }),
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))
        return true
      } catch (err) {
        parchearLocal(proyectoId, previoCampos)
        toast.error(err instanceof Error ? err.message : "No se pudo cambiar la portada")
        return false
      }
    },
    [capturarCampos, parchearLocal],
  )

  // ---- Visores (desde propuestas del diseñador) ----------------------------

  const agregarVisor = useCallback(
    async (proyectoId: string, propuestaId: string): Promise<boolean> => {
      try {
        const res = await fetch(`${BASE}/proyectos/${proyectoId}/visores`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ propuesta_id: propuestaId }),
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))
        const data = await res.json()
        const visor = data.visor as ProyectoVisorConPropuesta
        parchearLocal(proyectoId, (p) => ({ visores: [...p.visores, visor] }))
        toast.success("Visor agregado")
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo agregar el visor")
        return false
      }
    },
    [parchearLocal],
  )

  const eliminarVisor = useCallback(
    async (proyectoId: string, visorId: string): Promise<boolean> => {
      const previoCampos = capturarCampos(proyectoId, { visores: [] })
      parchearLocal(proyectoId, (p) => ({ visores: p.visores.filter((v) => v.id !== visorId) }))
      try {
        const res = await fetch(`${BASE}/proyectos/${proyectoId}/visores/${visorId}`, {
          method: "DELETE",
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))
        return true
      } catch (err) {
        parchearLocal(proyectoId, previoCampos)
        toast.error(err instanceof Error ? err.message : "No se pudo quitar el visor")
        return false
      }
    },
    [capturarCampos, parchearLocal],
  )

  const toggleVisorActivo = useCallback(
    async (proyectoId: string, visorId: string): Promise<boolean> => {
      const visor = proyectos.find((p) => p.id === proyectoId)?.visores.find((v) => v.id === visorId)
      if (!visor) return false
      const nuevoActivo = !visor.activo
      parchearLocal(proyectoId, (p) => ({
        visores: p.visores.map((v) => (v.id === visorId ? { ...v, activo: nuevoActivo } : v)),
      }))
      try {
        const res = await fetch(`${BASE}/proyectos/${proyectoId}/visores/${visorId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ activo: nuevoActivo }),
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))
        return true
      } catch (err) {
        parchearLocal(proyectoId, (p) => ({
          visores: p.visores.map((v) => (v.id === visorId ? { ...v, activo: visor.activo } : v)),
        }))
        toast.error(err instanceof Error ? err.message : "No se pudo cambiar el estado")
        return false
      }
    },
    [proyectos, parchearLocal],
  )

  const reordenarVisores = useCallback(
    async (proyectoId: string, idsEnOrden: string[]): Promise<boolean> => {
      const proyecto = proyectos.find((p) => p.id === proyectoId)
      if (!proyecto) return false
      const mapa = new Map(proyecto.visores.map((v) => [v.id, v]))
      const nuevosVisores: ProyectoVisorConPropuesta[] = idsEnOrden
        .map((id, index) => {
          const visor = mapa.get(id)
          return visor ? { ...visor, orden: index } : null
        })
        .filter((v): v is ProyectoVisorConPropuesta => v !== null)
      const previoCampos = capturarCampos(proyectoId, { visores: [] })
      parchearLocal(proyectoId, { visores: nuevosVisores })
      try {
        const res = await fetch(`${BASE}/proyectos/${proyectoId}/visores/reorder`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cambios: nuevosVisores.map((v) => ({ id: v.id, orden: v.orden })) }),
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))
        return true
      } catch (err) {
        parchearLocal(proyectoId, previoCampos)
        toast.error(err instanceof Error ? err.message : "Error al reordenar los visores")
        return false
      }
    },
    [proyectos, capturarCampos, parchearLocal],
  )

  // ---- Mover / copiar media entre proyectos --------------------------------

  const moverCopiarMedia = useCallback(
    async (payload: MediaDragPayload, destinoProyectoId: string, accion: "mover" | "copiar"): Promise<boolean> => {
      try {
        const res = await fetch(`${BASE}/media/move-copy`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            origenProyectoId: payload.origenProyectoId,
            destinoProyectoId,
            items: payload.items,
            accion,
          }),
          credentials: "include",
        })
        if (!res.ok) throw new Error(await leerError(res))

        const data = await res.json()
        const resultados: Array<{
          tipo: string
          success: boolean
          error?: string
          omitido?: string
          advertencia?: string
        }> = data.resultados ?? []

        // El endpoint puede aplicar unos ítems y fallar en otros: cada caso se
        // reporta, no se asume éxito global.
        const fallidos = resultados.filter((r) => !r.success)
        const advertencias = resultados.filter((r) => r.advertencia).map((r) => r.advertencia)

        if (fallidos.length === resultados.length && resultados.length > 0) {
          const detalle = fallidos[0]?.omitido ?? fallidos[0]?.error
          toast.error(
            accion === "mover"
              ? `No se pudo mover el contenido${detalle ? `: ${detalle}` : ""}`
              : `No se pudo copiar el contenido${detalle ? `: ${detalle}` : ""}`,
          )
          return false
        }

        if (fallidos.length > 0) {
          const detalle = fallidos[0]?.omitido ?? fallidos[0]?.error ?? "revisa el contenido"
          toast.error(`${fallidos.length} elemento(s) no se pudieron ${accion}: ${detalle}`)
        } else {
          toast.success(accion === "mover" ? "Contenido movido" : "Contenido copiado")
        }

        for (const advertencia of advertencias) {
          if (advertencia) toast.warning(advertencia)
        }

        await refrescar()
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo mover/copiar")
        return false
      }
    },
    [refrescar],
  )

  return {
    proyectos,
    cargando,
    refrescar,
    crearProyecto,
    guardarProyecto,
    eliminarProyecto,
    reordenarProyectos,
    subirArchivos,
    eliminarFoto,
    reordenarFotos,
    cambiarPortada,
    agregarVisor,
    eliminarVisor,
    toggleVisorActivo,
    reordenarVisores,
    moverCopiarMedia,
  }
}

export type PortafolioProyectosApi = ReturnType<typeof usePortafolioProyectos>