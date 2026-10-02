-- Migration: create nested cotizaciones navigation tables (productos, versiones, items, costos, timelines)
-- Date: 2026-09-05

-- 1. producto_versiones
CREATE TABLE IF NOT EXISTS producto_versiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES propuestas_diseno(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  seleccion JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS producto_versiones_producto_id_idx ON producto_versiones(producto_id);

-- 2. producto_version_modelos
CREATE TABLE IF NOT EXISTS producto_version_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_version_id UUID NOT NULL REFERENCES producto_versiones(id) ON DELETE CASCADE,
  modelo_id UUID NOT NULL REFERENCES modelos(id) ON DELETE CASCADE,
  orden INT DEFAULT 0,
  UNIQUE(producto_version_id, modelo_id)
);

CREATE INDEX IF NOT EXISTS producto_version_modelos_version_id_idx ON producto_version_modelos(producto_version_id);
CREATE INDEX IF NOT EXISTS producto_version_modelos_modelo_id_idx ON producto_version_modelos(modelo_id);

-- 3. producto_version_materiales
CREATE TABLE IF NOT EXISTS producto_version_materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_version_id UUID NOT NULL REFERENCES producto_versiones(id) ON DELETE CASCADE,
  tipo_material TEXT NOT NULL,
  nombre_material TEXT NOT NULL,
  cantidad NUMERIC NOT NULL DEFAULT 0,
  unidad TEXT NOT NULL DEFAULT 'unidad',
  precio_unitario NUMERIC DEFAULT 0,
  descripcion TEXT,
  etiquetas TEXT[] DEFAULT '{}',
  longitud_mm NUMERIC,
  area_m2 NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS producto_version_materiales_version_id_idx ON producto_version_materiales(producto_version_id);
CREATE INDEX IF NOT EXISTS producto_version_materiales_tipo_idx ON producto_version_materiales(tipo_material);

-- 4. cotizacion_items
CREATE TABLE IF NOT EXISTS cotizacion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacionversion_id UUID NOT NULL REFERENCES cotizacionversiones(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES propuestas_diseno(id) ON DELETE CASCADE,
  producto_version_id UUID NOT NULL REFERENCES producto_versiones(id) ON DELETE CASCADE,
  orden INT DEFAULT 0,
  UNIQUE(cotizacionversion_id, producto_version_id)
);

CREATE INDEX IF NOT EXISTS cotizacion_items_version_id_idx ON cotizacion_items(cotizacionversion_id);
CREATE INDEX IF NOT EXISTS cotizacion_items_producto_id_idx ON cotizacion_items(producto_id);
CREATE INDEX IF NOT EXISTS cotizacion_items_version_producto_idx ON cotizacion_items(producto_version_id);

-- 5. cotizacion_costos_variables
CREATE TABLE IF NOT EXISTS cotizacion_costos_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacionversion_id UUID NOT NULL REFERENCES cotizacionversiones(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  monto NUMERIC NOT NULL DEFAULT 0,
  unidad TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cotizacion_costos_variables_version_id_idx ON cotizacion_costos_variables(cotizacionversion_id);

-- 6. cotizacion_timelines
CREATE TABLE IF NOT EXISTS cotizacion_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacionversion_id UUID NOT NULL REFERENCES cotizacionversiones(id) ON DELETE CASCADE,
  fase TEXT NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cotizacionversion_id, fase)
);

CREATE INDEX IF NOT EXISTS cotizacion_timelines_version_id_idx ON cotizacion_timelines(cotizacionversion_id);
CREATE INDEX IF NOT EXISTS cotizacion_timelines_fase_idx ON cotizacion_timelines(fase);

-- RLS
ALTER TABLE producto_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_version_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_version_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_costos_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacion_timelines ENABLE ROW LEVEL SECURITY;

-- Políticas service_role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'producto_versiones' AND policyname = 'service_role_full_access_producto_versiones') THEN
    CREATE POLICY "service_role_full_access_producto_versiones" ON producto_versiones FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'producto_version_modelos' AND policyname = 'service_role_full_access_producto_version_modelos') THEN
    CREATE POLICY "service_role_full_access_producto_version_modelos" ON producto_version_modelos FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'producto_version_materiales' AND policyname = 'service_role_full_access_producto_version_materiales') THEN
    CREATE POLICY "service_role_full_access_producto_version_materiales" ON producto_version_materiales FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotizacion_items' AND policyname = 'service_role_full_access_cotizacion_items') THEN
    CREATE POLICY "service_role_full_access_cotizacion_items" ON cotizacion_items FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotizacion_costos_variables' AND policyname = 'service_role_full_access_cotizacion_costos_variables') THEN
    CREATE POLICY "service_role_full_access_cotizacion_costos_variables" ON cotizacion_costos_variables FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotizacion_timelines' AND policyname = 'service_role_full_access_cotizacion_timelines') THEN
    CREATE POLICY "service_role_full_access_cotizacion_timelines" ON cotizacion_timelines FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Políticas anon
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'producto_versiones' AND policyname = 'anon_full_access_producto_versiones') THEN
    EXECUTE 'DROP POLICY "anon_full_access_producto_versiones" ON producto_versiones';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'producto_version_modelos' AND policyname = 'anon_full_access_producto_version_modelos') THEN
    EXECUTE 'DROP POLICY "anon_full_access_producto_version_modelos" ON producto_version_modelos';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'producto_version_materiales' AND policyname = 'anon_full_access_producto_version_materiales') THEN
    EXECUTE 'DROP POLICY "anon_full_access_producto_version_materiales" ON producto_version_materiales';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotizacion_items' AND policyname = 'anon_full_access_cotizacion_items') THEN
    EXECUTE 'DROP POLICY "anon_full_access_cotizacion_items" ON cotizacion_items';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotizacion_costos_variables' AND policyname = 'anon_full_access_cotizacion_costos_variables') THEN
    EXECUTE 'DROP POLICY "anon_full_access_cotizacion_costos_variables" ON cotizacion_costos_variables';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotizacion_timelines' AND policyname = 'anon_full_access_cotizacion_timelines') THEN
    EXECUTE 'DROP POLICY "anon_full_access_cotizacion_timelines" ON cotizacion_timelines';
  END IF;
END $$;

CREATE POLICY "anon_full_access_producto_versiones" ON producto_versiones FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_producto_version_modelos" ON producto_version_modelos FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_producto_version_materiales" ON producto_version_materiales FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_cotizacion_items" ON cotizacion_items FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_cotizacion_costos_variables" ON cotizacion_costos_variables FOR ALL USING (auth.role() = 'anon');
CREATE POLICY "anon_full_access_cotizacion_timelines" ON cotizacion_timelines FOR ALL USING (auth.role() = 'anon');
