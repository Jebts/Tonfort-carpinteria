-- ==========================================
-- PLAN: Sistema de Cotizaciones
-- ==========================================
-- Nueva tabla cotizaciones para agrupar propuestas por cliente
-- Campos nuevos en propuestas_3d para precio y selección del cliente
-- ===========================================

-- Crear ENUM para estado de cotización
CREATE TYPE estado_cotizacion AS ENUM ('creada', 'enviada', 'aceptada', 'rechazada');

-- Crear tabla cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  estado estado_cotizacion NOT NULL DEFAULT 'creada',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cotizaciones_proyecto_id_idx ON cotizaciones(proyecto_id);
CREATE INDEX IF NOT EXISTS cotizaciones_cliente_id_idx ON cotizaciones(cliente_id);
CREATE INDEX IF NOT EXISTS cotizaciones_token_idx ON cotizaciones(token);
CREATE INDEX IF NOT EXISTS cotizaciones_estado_idx ON cotizaciones(estado);

COMMENT ON TABLE cotizaciones IS 'Agrupa propuestas de un proyecto para un cliente específico para cotización.';
COMMENT ON COLUMN cotizaciones.token IS 'Token único para el link de la cotización completa (/cotizaciones/[token]).';
COMMENT ON COLUMN cotizaciones.estado IS 'Estado del ciclo de vida de la cotización.';

-- Agregar campos a propuestas_3d
ALTER TABLE propuestas_3d 
  ADD COLUMN IF NOT EXISTS precio_cotizacion NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS seleccionada_por_cliente BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS propuestas_3d_cotizacion_id_idx ON propuestas_3d(cotizacion_id);
CREATE INDEX IF NOT EXISTS propuestas_3d_seleccionada_idx ON propuestas_3d(seleccionada_por_cliente);

COMMENT ON COLUMN propuestas_3d.precio_cotizacion IS 'Precio de la propuesta dentro de una cotización.';
COMMENT ON COLUMN propuestas_3d.seleccionada_por_cliente IS 'Indica si el cliente seleccionó esta propuesta.';
COMMENT ON COLUMN propuestas_3d.cotizacion_id IS 'FK opcional a cotizaciones(id). NULL si no está en una cotización.';

-- Trigger para actualizar updated_at en cotizaciones
CREATE OR REPLACE FUNCTION cotizaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cotizaciones_updated_at
  BEFORE UPDATE ON cotizaciones
  FOR EACH ROW
  EXECUTE FUNCTION cotizaciones_updated_at();
