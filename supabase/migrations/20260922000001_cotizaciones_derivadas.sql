-- ==========================================
-- PLAN: Cotizaciones Independientes - Opción A
-- ==========================================
-- 1. Hacer proyectos independientes de clientes
-- 2. Crear tablas derivadas para manipulación libre
-- ===========================================

-- 1. Hacer cliente_id nullable en proyectos
ALTER TABLE proyectos ALTER COLUMN cliente_id DROP NOT NULL;

-- 2. Crear tabla cotizacion_productos (productos derivados)
CREATE TABLE IF NOT EXISTS cotizacion_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id UUID NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cotizacion_productos_cotizacion_id_idx ON cotizacion_productos(cotizacion_id);
CREATE INDEX IF NOT EXISTS cotizacion_productos_producto_id_idx ON cotizacion_productos(producto_id);

COMMENT ON TABLE cotizacion_productos IS 'Productos derivados de una cotización. Copias manipulables que no afectan al proyecto original.';
COMMENT ON COLUMN cotizacion_productos.producto_id IS 'Referencia opcional al producto original del proyecto.';

-- 3. Crear tabla cotizacion_propuestas (propuestas derivadas)
CREATE TABLE IF NOT EXISTS cotizacion_propuestas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_producto_id UUID NOT NULL REFERENCES cotizacion_productos(id) ON DELETE CASCADE,
  propuesta_id UUID REFERENCES propuestas_3d(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  video_global_url TEXT,
  frame_centro_ms INTEGER,
  precio_cotizacion NUMERIC(10,2),
  seleccionada_por_cliente BOOLEAN DEFAULT false,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cotizacion_propuestas_cotizacion_producto_id_idx ON cotizacion_propuestas(cotizacion_producto_id);
CREATE INDEX IF NOT EXISTS cotizacion_propuestas_propuesta_id_idx ON cotizacion_propuestas(propuesta_id);
CREATE INDEX IF NOT EXISTS cotizacion_propuestas_seleccionada_idx ON cotizacion_propuestas(seleccionada_por_cliente);

COMMENT ON TABLE cotizacion_propuestas IS 'Propuestas derivadas de una cotización. Copias manipulables que no afectan al proyecto original.';
COMMENT ON COLUMN cotizacion_propuestas.propuesta_id IS 'Referencia opcional a la propuesta original del proyecto.';

-- 4. Trigger para updated_at en cotizacion_productos
CREATE OR REPLACE FUNCTION cotizacion_productos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cotizacion_productos_updated_at
  BEFORE UPDATE ON cotizacion_productos
  FOR EACH ROW
  EXECUTE FUNCTION cotizacion_productos_updated_at();

-- 5. Trigger para updated_at en cotizacion_propuestas
CREATE OR REPLACE FUNCTION cotizacion_propuestas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cotizacion_propuestas_updated_at
  BEFORE UPDATE ON cotizacion_propuestas
  FOR EACH ROW
  EXECUTE FUNCTION cotizacion_propuestas_updated_at();
