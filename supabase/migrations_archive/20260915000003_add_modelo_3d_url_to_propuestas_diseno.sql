-- Migration: Add modelo_3d_url column to propuestas_diseno
-- Required for the .glb upload feature in /staff/diseno/propuestas/[id]
-- Date: 2026-09-15

ALTER TABLE propuestas_diseno
  ADD COLUMN IF NOT EXISTS modelo_3d_url TEXT;

COMMENT ON COLUMN propuestas_diseno.modelo_3d_url IS 'URL del modelo 3D (.glb) subido a bucket propuestas-3d. Nullable.';
