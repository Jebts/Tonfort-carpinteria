-- Seed inicial para proyecto Supabase nuevo de tonfort
-- Crea tablas base, índices, RLS y políticas service_role.

-- Tabla: clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  fase TEXT NOT NULL DEFAULT 'descubrimiento',
  info_personal JSONB DEFAULT '{}'::jsonb,
  descripcion_proyecto TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clientes_fase_idx ON clientes(fase);
CREATE INDEX IF NOT EXISTS clientes_creado_en_idx ON clientes(creado_en);

-- Tabla: citas
CREATE TABLE IF NOT EXISTS citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  nombre_solicitante TEXT,
  email TEXT,
  telefono TEXT,
  descripcion TEXT,
  fecha_hora TIMESTAMPTZ NOT NULL,
  duracion_minutos INT NOT NULL DEFAULT 120,
  estado TEXT NOT NULL DEFAULT 'en_espera',
  origen TEXT NOT NULL DEFAULT 'web',
  movida BOOLEAN NOT NULL DEFAULT false,
  fecha_hora_anterior TIMESTAMPTZ,
  meet_link TEXT,
  notas TEXT,
  ip TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS citas_cliente_id_idx ON citas(cliente_id);
CREATE INDEX IF NOT EXISTS citas_estado_idx ON citas(estado);
CREATE INDEX IF NOT EXISTS citas_fecha_hora_idx ON citas(fecha_hora);

-- Tabla: portafolio_proyectos
CREATE TABLE IF NOT EXISTS portafolio_proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  resumen TEXT,
  historia TEXT,
  video_url TEXT,
  imagen_portada TEXT,
  galeria JSONB DEFAULT '[]'::jsonb,
  categoria TEXT,
  orden INT DEFAULT 0,
  publicado BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portafolio_proyectos_slug_idx ON portafolio_proyectos(slug);
CREATE INDEX IF NOT EXISTS portafolio_proyectos_publicado_idx ON portafolio_proyectos(publicado);

-- Tabla: materiales
CREATE TABLE IF NOT EXISTS materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_material TEXT NOT NULL,
  nombre_material TEXT NOT NULL,
  descripcion TEXT,
  unidad TEXT NOT NULL DEFAULT 'unidad',
  precio_referencia NUMERIC,
  etiquetas TEXT[] DEFAULT '{}',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo_material, nombre_material)
);

CREATE INDEX IF NOT EXISTS materiales_tipo_idx ON materiales(tipo_material);
CREATE INDEX IF NOT EXISTS materiales_nombre_idx ON materiales(nombre_material);

-- Tabla: proyectos (cotizaciones)
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

-- Tabla: modelos
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

-- Tabla: modelo_materiales
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

-- Tabla: propuestas_diseno
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

-- Tabla: propuesta_modelos
CREATE TABLE IF NOT EXISTS propuesta_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id UUID NOT NULL REFERENCES propuestas_diseno(id) ON DELETE CASCADE,
  modelo_id UUID NOT NULL REFERENCES modelos(id) ON DELETE CASCADE,
  orden INT DEFAULT 0,
  UNIQUE(propuesta_id, modelo_id)
);

CREATE INDEX IF NOT EXISTS propuesta_modelos_propuesta_id_idx ON propuesta_modelos(propuesta_id);
CREATE INDEX IF NOT EXISTS propuesta_modelos_modelo_id_idx ON propuesta_modelos(modelo_id);

-- Tabla: cotizacionversiones
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

-- Tabla: cotizaciones_generadas
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

-- RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE portafolio_proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuestas_diseno ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuesta_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizacionversiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones_generadas ENABLE ROW LEVEL SECURITY;

-- Políticas service_role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clientes' AND policyname = 'service_role_full_access_clientes') THEN
    CREATE POLICY "service_role_full_access_clientes" ON clientes FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'citas' AND policyname = 'service_role_full_access_citas') THEN
    CREATE POLICY "service_role_full_access_citas" ON citas FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'portafolio_proyectos' AND policyname = 'service_role_full_access_portafolio_proyectos') THEN
    CREATE POLICY "service_role_full_access_portafolio_proyectos" ON portafolio_proyectos FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'materiales' AND policyname = 'service_role_full_access_materiales') THEN
    CREATE POLICY "service_role_full_access_materiales" ON materiales FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proyectos' AND policyname = 'service_role_full_access_proyectos') THEN
    CREATE POLICY "service_role_full_access_proyectos" ON proyectos FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'modelos' AND policyname = 'service_role_full_access_modelos') THEN
    CREATE POLICY "service_role_full_access_modelos" ON modelos FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'modelo_materiales' AND policyname = 'service_role_full_access_modelo_materiales') THEN
    CREATE POLICY "service_role_full_access_modelo_materiales" ON modelo_materiales FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuestas_diseno' AND policyname = 'service_role_full_access_propuestas_diseno') THEN
    CREATE POLICY "service_role_full_access_propuestas_diseno" ON propuestas_diseno FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuesta_modelos' AND policyname = 'service_role_full_access_propuesta_modelos') THEN
    CREATE POLICY "service_role_full_access_propuesta_modelos" ON propuesta_modelos FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotizacionversiones' AND policyname = 'service_role_full_access_cotizacionversiones') THEN
    CREATE POLICY "service_role_full_access_cotizacionversiones" ON cotizacionversiones FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cotizaciones_generadas' AND policyname = 'service_role_full_access_cotizaciones_generadas') THEN
    CREATE POLICY "service_role_full_access_cotizaciones_generadas" ON cotizaciones_generadas FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
