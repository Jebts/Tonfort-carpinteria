-- Migration: Create hotspots table + cotizacion link fields on proyectos
-- Fase 2: hotspot management + public 3D viewer link
-- Date: 2026-09-15

-- 1. Hotspots: interactive points placed by the Diseñador over a propuesta's 3D model.
--    FK a propuestas_diseno(id) (ON DELETE CASCADE); posición descompuesta en x/y/z
--    para facilitar filtrados y validaciones, con camara_preset como JSONB.
CREATE TABLE IF NOT EXISTS hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id UUID NOT NULL REFERENCES propuestas_diseno(id) ON DELETE CASCADE,
  posicion_x NUMERIC NOT NULL DEFAULT 0,
  posicion_y NUMERIC NOT NULL DEFAULT 0,
  posicion_z NUMERIC NOT NULL DEFAULT 0,
  camara_preset JSONB NOT NULL DEFAULT '{}'::jsonb,
  animacion_clip TEXT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  precio_pieza NUMERIC,
  mostrar_precio BOOLEAN NOT NULL DEFAULT false,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hotspots_propuesta_id_idx ON hotspots(propuesta_id);
CREATE INDEX IF NOT EXISTS hotspots_orden_idx ON hotspots(propuesta_id, orden);

-- 2. Link de cotización para compartir con el cliente (no listado público).
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS link_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS link_activo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS proyectos_link_token_idx ON proyectos(link_token) WHERE link_token IS NOT NULL;

-- 3. RLS para hotspots: service_role full (escritura staff via handlers);
--    anon read-only (safety para lectura directa; el visor público usa service_role).
ALTER TABLE hotspots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_hotspots" ON hotspots;
DROP POLICY IF EXISTS "anon_read_hotspots" ON hotspots;

CREATE POLICY "service_role_full_access_hotspots" ON hotspots
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "anon_read_hotspots" ON hotspots
  FOR SELECT USING (auth.role() = 'anon');

-- 4. Mantener updated_at al actualizar (consistente con el resto del schema).
CREATE OR REPLACE FUNCTION _tonfort_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hotspots_updated_at ON hotspots;
CREATE TRIGGER hotspots_updated_at
  BEFORE UPDATE ON hotspots
  FOR EACH ROW EXECUTE FUNCTION _tonfort_touch_updated_at();
