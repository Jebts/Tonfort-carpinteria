-- ==========================================
-- PLAN: Video-Only Proposal Platform
-- Fase 1: Schema limpio
-- ==========================================
-- Reset destructivo previamente aplicado.
-- Conserva: usuarios, clientes, citas, modalidades_cita
-- Nuevas tablas: proyectos, productos, propuestas_3d, propuestas_3d_animaciones
-- Elimina: portafolio_proyectos, propuestas_diseno, hotspots, modelos, modelo_materiales,
--          materiales, cotizacionversiones, cotizaciones_generadas, propuesta_modelos,
--          producto_versiones, producto_version_modelos, producto_version_materiales,
--          cotizacion_items, cotizacion_costos_variables, cotizacion_timelines
-- ===========================================

-- ============================================================
-- 1. Tablas preservadas (re-creamos con timestamps correctos)
-- ============================================================

-- Tabla: usuarios (auth staff y roles) — ya existe, preservamos ownership
-- ALTER TABLE usuarios ALTER COLUMN ... no se requiere nada nuevo

-- Tabla: clientes (preservada — garantizamos timestamps)
ALTER TABLE clientes
  ALTER COLUMN creado_en SET DEFAULT now(),
  ALTER COLUMN actualizado_en SET DEFAULT now();

-- Tabla: citas (creación idempotente — preserva la lógica de Agenda)
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

COMMENT ON TABLE citas IS 'Citas de agenda preserve. Reemplaza la tabla legacy cites.';

-- Tabla: modalidades_cita
-- (preservada)

-- ============================================================
-- 2. Proyectos (video-only design)
-- ============================================================

CREATE TABLE IF NOT EXISTS proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  slug TEXT NOT NULL UNIQUE,
  asignado_a UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  orden INT NOT NULL DEFAULT 0,
  publicado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proyectos_cliente_id_idx ON proyectos(cliente_id);
CREATE INDEX IF NOT EXISTS proyectos_asignado_a_idx ON proyectos(asignado_a);
CREATE INDEX IF NOT EXISTS proyectos_slug_idx ON proyectos(slug);
CREATE INDEX IF NOT EXISTS proyectos_publicado_idx ON proyectos(publicado);

COMMENT ON TABLE proyectos IS 'Proyectos de diseño video-only. Reemplaza el proyectos legacy de cotización.';
COMMENT ON COLUMN proyectos.cliente_id IS 'FK obligigatorio a clientes(id).';
COMMENT ON COLUMN proyectos.asignado_a IS 'UUID del usuario staff diseñador asignado.';
COMMENT ON COLUMN proyectos.slug IS 'Slug único para rutas públicas de Portafolio.';
COMMENT ON COLUMN proyectos.publicado IS 'Si el proyecto está publicado en Portafolio público.';

-- ============================================================
-- 3. Productos (contenedor por Proyecto)
-- ============================================================

CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS productos_proyecto_id_idx ON productos(proyecto_id);
CREATE INDEX IF NOT EXISTS productos_orden_idx ON productos(proyecto_id, orden);

COMMENT ON TABLE productos IS 'Producto contenedor dentro de un proyecto.';
COMMENT ON COLUMN productos.proyecto_id IS 'FK a proyectos(id) ON DELETE CASCADE.';

-- ============================================================
-- 4. Propuestas 3D (video-only, sin precio ni entrega)
-- ============================================================

CREATE TYPE estado_propuesta_3d AS ENUM ('borrador', 'lista', 'enviada');

CREATE TABLE IF NOT EXISTS propuestas_3d (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  video_global_url TEXT,
  frame_centro_ms INT,
  estado estado_propuesta_3d NOT NULL DEFAULT 'borrador',
  link_token TEXT UNIQUE,
  link_activo BOOLEAN NOT NULL DEFAULT false,
  publicada_portafolio BOOLEAN NOT NULL DEFAULT false,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS propuestas_3d_producto_id_idx ON propuestas_3d(producto_id);
CREATE INDEX IF NOT EXISTS propuestas_3d_link_token_idx ON propuestas_3d(link_token) WHERE link_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS propuestas_3d_estado_idx ON propuestas_3d(estado);
CREATE INDEX IF NOT EXISTS propuestas_3d_orden_idx ON propuestas_3d(producto_id, orden);

COMMENT ON TABLE propuestas_3d IS 'Propuesta de diseño basada en video. Sin precio, entrega ni imagen.';
COMMENT ON COLUMN propuestas_3d.video_global_url IS 'URL del video global (barrido). MP4/WebM/MOV. Máx. 100MB.';
COMMENT ON COLUMN propuestas_3d.frame_centro_ms IS 'Frame central de referencia en milisegundos. Obligatorio para pasar a lista.';
COMMENT ON COLUMN propuestas_3d.estado IS 'Estado: borrador → lista → enviada (secuencia estricta).';
COMMENT ON COLUMN propuestas_3d.link_token IS 'Token único no predecible para link privado.';
COMMENT ON COLUMN propuestas_3d.publicada_portafolio IS 'Flag directo de publicación en Portafolio público.';

-- Constraint: video_global_url y frame_centro_ms son obligatorios para pasar a lista
ALTER TABLE propuestas_3d
  ADD CONSTRAINT chk_propuesta_lista_requires_video
  CHECK (
    estado = 'borrador' OR (
      estado IN ('lista', 'enviada')
      AND video_global_url IS NOT NULL
      AND frame_centro_ms IS NOT NULL
    )
  );

-- Constraint: link_activo requiere video_global_url y frame_centro_ms
ALTER TABLE propuestas_3d
  ADD CONSTRAINT chk_link_activo_requires_video
  CHECK (
    NOT link_activo OR (video_global_url IS NOT NULL AND frame_centro_ms IS NOT NULL)
  );

-- Constraint: publicada_portafolio requiere estado enviada
ALTER TABLE propuestas_3d
  ADD CONSTRAINT chk_portafolio_requires_enviada
  CHECK (NOT publicada_portafolio OR estado = 'enviada');

-- ============================================================
-- 5. Animaciones (fila independiente por botón inferior)
-- ============================================================

CREATE TABLE IF NOT EXISTS propuestas_3d_animaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  propuesta_id UUID NOT NULL REFERENCES propuestas_3d(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  video_movimiento_url TEXT NOT NULL,
  video_accion_url TEXT,
  velocidad_normal NUMERIC NOT NULL DEFAULT 1 CHECK (velocidad_normal > 0),
  velocidad_inversa NUMERIC NOT NULL DEFAULT 2 CHECK (velocidad_inversa > 0),
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS propuestas_3d_animaciones_propuesta_id_idx ON propuestas_3d_animaciones(propuesta_id);
CREATE INDEX IF NOT EXISTS propuestas_3d_animaciones_orden_idx ON propuestas_3d_animaciones(propuesta_id, orden);

COMMENT ON TABLE propuestas_3d_animaciones IS 'Animación independiente por botón inferior (Movimiento → Acción opcional).';
COMMENT ON COLUMN propuestas_3d_animaciones.video_movimiento_url IS 'Video de Movimiento obligatorio. Máx. 50MB.';
COMMENT ON COLUMN propuestas_3d_animaciones.video_accion_url IS 'Video de Acción opcional. Máx. 50MB.';
COMMENT ON COLUMN propuestas_3d_animaciones.velocidad_normal IS 'Velocidad de reproducción normal (multiplicador).';
COMMENT ON COLUMN propuestas_3d_animaciones.velocidad_inversa IS 'Velocidad de reproducción inversa (multiplicador).';

-- ============================================================
-- 6. Trigger updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION _tonfort_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _tonfort_touch_updated_at_clientes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para proyectos
DROP TRIGGER IF EXISTS proyectos_updated_at ON proyectos;
CREATE TRIGGER proyectos_updated_at
  BEFORE UPDATE ON proyectos
  FOR EACH ROW EXECUTE FUNCTION _tonfort_touch_updated_at();

-- Triggers para productos
DROP TRIGGER IF EXISTS productos_updated_at ON productos;
CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION _tonfort_touch_updated_at();

-- Triggers para propuestas_3d
DROP TRIGGER IF EXISTS propuestas_3d_updated_at ON propuestas_3d;
CREATE TRIGGER propuestas_3d_updated_at
  BEFORE UPDATE ON propuestas_3d
  FOR EACH ROW EXECUTE FUNCTION _tonfort_touch_updated_at();

-- Triggers para animaciones
DROP TRIGGER IF EXISTS propuestas_3d_animaciones_updated_at ON propuestas_3d_animaciones;
CREATE TRIGGER propuestas_3d_animaciones_updated_at
  BEFORE UPDATE ON propuestas_3d_animaciones
  FOR EACH ROW EXECUTE FUNCTION _tonfort_touch_updated_at();

-- Triggers para clientes (timestamps legacy)
DROP TRIGGER IF EXISTS clientes_updated_at ON clientes;
CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION _tonfort_touch_updated_at_clientes();

-- ============================================================
-- 7. RLS y políticas
-- ============================================================

-- Habilitar RLS en nuevas tablas
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuestas_3d ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuestas_3d_animaciones ENABLE ROW LEVEL SECURITY;

-- Garantizar RLS en tablas preservadas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE modalidades_cita ENABLE ROW LEVEL SECURITY;

-- Políticas service_role (escritura staff vía Route Handlers)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proyectos' AND policyname = 'service_role_full_access_proyectos') THEN
    CREATE POLICY "service_role_full_access_proyectos" ON proyectos FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'productos' AND policyname = 'service_role_full_access_productos') THEN
    CREATE POLICY "service_role_full_access_productos" ON productos FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuestas_3d' AND policyname = 'service_role_full_access_propuestas_3d') THEN
    CREATE POLICY "service_role_full_access_propuestas_3d" ON propuestas_3d FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuestas_3d_animaciones' AND policyname = 'service_role_full_access_propuestas_3d_animaciones') THEN
    CREATE POLICY "service_role_full_access_propuestas_3d_animaciones" ON propuestas_3d_animaciones FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'citas' AND policyname = 'service_role_full_access_citas') THEN
    CREATE POLICY "service_role_full_access_citas" ON citas FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Políticas anon para lectura pública (filtradas por flags/token en servicios server-side)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proyectos' AND policyname = 'anon_read_proyectos') THEN
    CREATE POLICY "anon_read_proyectos" ON proyectos FOR SELECT USING (publicado = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'productos' AND policyname = 'anon_read_productos') THEN
    CREATE POLICY "anon_read_productos" ON productos FOR SELECT USING (
      EXISTS (SELECT 1 FROM proyectos p WHERE p.id = productos.proyecto_id AND p.publicado = true)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuestas_3d' AND policyname = 'anon_read_propuestas_3d') THEN
    CREATE POLICY "anon_read_propuestas_3d" ON propuestas_3d FOR SELECT USING (
      publicada_portafolio = true
      AND estado = 'enviada'
      AND EXISTS (SELECT 1 FROM productos pr WHERE pr.id = propuestas_3d.producto_id AND EXISTS (SELECT 1 FROM proyectos p WHERE p.id = pr.proyecto_id AND p.publicado = true))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuestas_3d_animaciones' AND policyname = 'anon_read_propuestas_3d_animaciones') THEN
    CREATE POLICY "anon_read_propuestas_3d_animaciones" ON propuestas_3d_animaciones FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM propuestas_3d pr
        JOIN productos p ON p.id = pr.producto_id
        JOIN proyectos pj ON pj.id = p.proyecto_id
        WHERE pr.propuesta_id = propuestas_3d_animaciones.propuesta_id
          AND pj.publicado = true
          AND pr.publicada_portafolio = true
          AND pr.estado = 'enviada'
      )
    );
  END IF;
END $$;

-- ============================================================
-- 8. Storage: bucket visores-video
-- ============================================================
-- (bucket creado vía API en infra/scripts o manualmente en Supabase Dashboard)
-- Políticas de storage se aplican fuera de migrations (Supabase Dashboard)

-- ============================================================
-- 9. Limpieza: eliminar tablas legacy
-- ============================================================

-- Drop tablas legacy que ya no existen en el nuevo schema
DROP TABLE IF EXISTS cotizaciones_generadas CASCADE;
DROP TABLE IF EXISTS cotizacionversiones CASCADE;
DROP TABLE IF EXISTS cotizacion_items CASCADE;
DROP TABLE IF EXISTS cotizacion_costos_variables CASCADE;
DROP TABLE IF EXISTS cotizacion_timelines CASCADE;
DROP TABLE IF EXISTS producto_versiones CASCADE;
DROP TABLE IF EXISTS producto_version_modelos CASCADE;
DROP TABLE IF EXISTS producto_version_materiales CASCADE;
DROP TABLE IF EXISTS propuestas_diseno CASCADE;
DROP TABLE IF EXISTS propuesta_modelos CASCADE;
DROP TABLE IF EXISTS hotspots CASCADE;
DROP TABLE IF EXISTS modelos CASCADE;
DROP TABLE IF EXISTS modelo_materiales CASCADE;
DROP TABLE IF EXISTS materiales CASCADE;
DROP TABLE IF EXISTS portafolio_proyectos CASCADE;
