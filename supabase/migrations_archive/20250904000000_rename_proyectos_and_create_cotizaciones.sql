-- Migration: rename proyectos → portafolio_proyectos and create cotizaciones module tables
-- Date: 2026-09-04

-- 1. Rename existing proyectos table to portafolio_proyectos
ALTER TABLE IF EXISTS proyectos RENAME TO portafolio_proyectos;

-- Rename primary key constraint (Supabase default name)
ALTER TABLE IF EXISTS portafolio_proyectos RENAME CONSTRAINT proyectos_pkey TO portafolio_proyectos_pkey;

-- Rename any index on id if it exists
DROP INDEX IF EXISTS proyectos_id_idx;
CREATE INDEX IF NOT EXISTS portafolio_proyectos_id_idx ON portafolio_proyectos(id);

-- 2. Create new proyectos table (cotizaciones module)
CREATE TABLE IF NOT EXISTS proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nombre TEXT NOT NULL DEFAULT '',
  cliente_email TEXT,
  cliente_telefono TEXT,
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'borrador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proyectos_id_idx ON proyectos(id);
CREATE INDEX IF NOT EXISTS proyectos_estado_idx ON proyectos(estado);

-- 3. Create modelos table
CREATE TABLE IF NOT EXISTS modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  porcentaje_ganancia NUMERIC DEFAULT 0,
  csv_original TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS modelos_proyecto_id_idx ON modelos(proyecto_id);

-- 4. Create modelo_materiales table (editable copy per model)
CREATE TABLE IF NOT EXISTS modelo_materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id UUID NOT NULL REFERENCES modelos(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS modelo_materiales_modelo_id_idx ON modelo_materiales(modelo_id);
CREATE INDEX IF NOT EXISTS modelo_materiales_tipo_idx ON modelo_materiales(tipo_material);

-- 5. Create propuestas_diseno table
CREATE TABLE IF NOT EXISTS propuestas_diseno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion_comercial TEXT,
  imagen_url TEXT,
  precio_final NUMERIC,
  tiempo_entrega TEXT,
  orden INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS propuestas_diseno_proyecto_id_idx ON propuestas_diseno(proyecto_id);

-- 6. Create propuesta_modelos junction table
CREATE TABLE IF NOT EXISTS propuesta_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id UUID NOT NULL REFERENCES propuestas_diseno(id) ON DELETE CASCADE,
  modelo_id UUID NOT NULL REFERENCES modelos(id) ON DELETE CASCADE,
  orden INT DEFAULT 0,
  UNIQUE(propuesta_id, modelo_id)
);

CREATE INDEX IF NOT EXISTS propuesta_modelos_propuesta_id_idx ON propuesta_modelos(propuesta_id);
CREATE INDEX IF NOT EXISTS propuesta_modelos_modelo_id_idx ON propuesta_modelos(modelo_id);

-- 7. Create cotizacionversiones table
CREATE TABLE IF NOT EXISTS cotizacionversiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  seleccion JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cotizacionversiones_proyecto_id_idx ON cotizacionversiones(proyecto_id);

-- 8. Create cotizaciones_generadas table
CREATE TABLE IF NOT EXISTS cotizaciones_generadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  cotizacionversion_id UUID REFERENCES cotizacionversiones(id) ON DELETE SET NULL,
  formato TEXT NOT NULL,
  archivo_url TEXT NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cotizaciones_generadas_proyecto_id_idx ON cotizaciones_generadas(proyecto_id);
CREATE INDEX IF NOT EXISTS cotizaciones_generadas_version_id_idx ON cotizaciones_generadas(cotizacionversion_id);

-- 9. Create global materiales catalog table
CREATE TABLE IF NOT EXISTS materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_material TEXT NOT NULL,
  nombre_material TEXT NOT NULL,
  descripcion TEXT,
  unidad TEXT NOT NULL DEFAULT 'unidad',
  precio_referencia NUMERIC,
  etiquetas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo_material, nombre_material)
);

CREATE INDEX IF NOT EXISTS materiales_tipo_idx ON materiales(tipo_material);
CREATE INDEX IF NOT EXISTS materiales_nombre_idx ON materiales(nombre_material);

-- Enable RLS (policies should be added separately in Supabase Dashboard or another migration)
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuestas_diseno ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuesta_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacionversiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones_generadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
