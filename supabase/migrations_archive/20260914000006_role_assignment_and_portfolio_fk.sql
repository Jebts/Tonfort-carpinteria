-- Migration: role-based assignment and portfolio linkage
-- Adds proyectos.asignado_a, portafolio_proyectos.proyecto_id FK, modalidades_cita table
-- Date: 2026-09-14

-- 1. Add asignado_a to proyectos (staff assignment, nullable)
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS asignado_a TEXT;

CREATE INDEX IF NOT EXISTS proyectos_asignado_a_idx ON proyectos(asignado_a);

COMMENT ON COLUMN proyectos.asignado_a IS 'Usuario staff asignado (STAFF_CREDENTIALS.usuario). Nullable; admin ve todos.';

-- 2. Add proyecto_id FK to portafolio_proyectos (nullable, links to proyectos.cotizacion)
ALTER TABLE portafolio_proyectos
  ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS portafolio_proyectos_proyecto_id_idx ON portafolio_proyectos(proyecto_id);

-- 3. Create modalidades_cita (lightweight catalog for agenda publica step 2)
CREATE TABLE IF NOT EXISTS modalidades_cita (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  costo NUMERIC DEFAULT 0,
  duracion_minutos INT NOT NULL DEFAULT 120,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS modalidades_cita_activo_idx ON modalidades_cita(activo);

-- Insert default modalidades
INSERT INTO modalidades_cita (nombre, costo, duracion_minutos, activo) VALUES
  ('Cotización', 0, 120, true),
  ('Revisión de diseño', 0, 120, true)
ON CONFLICT DO NOTHING;

-- 4. Enable RLS on modalidades_cita
ALTER TABLE modalidades_cita ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'modalidades_cita' AND policyname = 'service_role_full_access_modalidades_cita') THEN
    CREATE POLICY "service_role_full_access_modalidades_cita" ON modalidades_cita FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'modalidades_cita' AND policyname = 'anon_read_modalidades_cita') THEN
    CREATE POLICY "anon_read_modalidades_cita" ON modalidades_cita FOR SELECT USING (true);
  END IF;
END $$;
