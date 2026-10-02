-- Migration: Add video viewer fields (Fase 1)
-- Adds video_global_url + frame_referencia_global_ms a propuestas_diseno y
-- portafolio_proyectos; video_acercamiento_url + video_interaccion_url a
-- hotspots; cambia ownership de hotspots a exclusivo (XOR); hace nullable
-- los campos espaciales legacy durante la transición.
-- No se eliminan columnas ni buckets legacy (Fase 8).

-- ============================================================
-- 1. propuestas_diseno: campos video global
-- ============================================================
ALTER TABLE propuestas_diseno
  ADD COLUMN IF NOT EXISTS video_global_url TEXT,
  ADD COLUMN IF NOT EXISTS frame_referencia_global_ms INTEGER NULL;

COMMENT ON COLUMN propuestas_diseno.video_global_url IS 'URL del video global (barrido 180°) para el visor. MP4/H.264.';
COMMENT ON COLUMN propuestas_diseno.frame_referencia_global_ms IS 'Frame de referencia del Global en milisegundos. Obligatorio si video_global_url no es null.';

ALTER TABLE propuestas_diseno
  ADD CONSTRAINT chk_frame_referencia_global
  CHECK (frame_referencia_global_ms IS NULL OR frame_referencia_global_ms >= 0);

-- ============================================================
-- 2. portafolio_proyectos: campos video global
-- ============================================================
ALTER TABLE portafolio_proyectos
  ADD COLUMN IF NOT EXISTS video_global_url TEXT,
  ADD COLUMN IF NOT EXISTS frame_referencia_global_ms INTEGER NULL;

COMMENT ON COLUMN portafolio_proyectos.video_global_url IS 'URL del video global interactivo para el visor de Portafolio. MP4/H.264.';
COMMENT ON COLUMN portafolio_proyectos.frame_referencia_global_ms IS 'Frame de referencia del Global en milisegundos. Obligatorio si video_global_url no es null.';

ALTER TABLE portafolio_proyectos
  ADD CONSTRAINT chk_portafolio_frame_referencia
  CHECK (frame_referencia_global_ms IS NULL OR frame_referencia_global_ms >= 0);

-- ============================================================
-- 3. hotspots: videos de hotspot + cambio de ownership
-- ============================================================

-- 3a. Campos de video por hotspot
ALTER TABLE hotspots
  ADD COLUMN IF NOT EXISTS video_acercamiento_url TEXT,
  ADD COLUMN IF NOT EXISTS video_interaccion_url TEXT;

COMMENT ON COLUMN hotspots.video_acercamiento_url IS 'URL del video de acercamiento obligatorio del hotspot. MP4/H.264.';
COMMENT ON COLUMN hotspots.video_interaccion_url IS 'URL del video de interacción opcional del hotspot. MP4/H.264.';

-- 3b. Ownership exclusivo: propuesta_id pasa a nullable, se añade portafolio_id
ALTER TABLE hotspots
  ALTER COLUMN propuesta_id DROP NOT NULL;

ALTER TABLE hotspots
  ADD COLUMN IF NOT EXISTS portafolio_id UUID NULL REFERENCES portafolio_proyectos(id) ON DELETE CASCADE;

-- 3c. Restricción XOR: exactamente uno de propuesta_id / portafolio_id
ALTER TABLE hotspots
  ADD CONSTRAINT chk_hotspot_ownership_xor
  CHECK (num_nonnulls(propuesta_id, portafolio_id) = 1);

-- 3d. Índices separados por ownership
CREATE INDEX IF NOT EXISTS hotspots_portafolio_id_orden_idx
  ON hotspots(portafolio_id, orden);

-- 3e. Hacer nullable los campos espaciales legacy (transición)
ALTER TABLE hotspots
  ALTER COLUMN posicion_x DROP NOT NULL,
  ALTER COLUMN posicion_y DROP NOT NULL,
  ALTER COLUMN posicion_z DROP NOT NULL,
  ALTER COLUMN camara_preset DROP NOT NULL;

-- 3f. Actualizar triggers y políticas RLS (mantener las existentes)
-- Los triggers existentes siguen funcionando; no se requiere cambio.

-- ============================================================
-- 4. Nota: los objetos de storage (buckets) se crean en Fase 2
-- ============================================================