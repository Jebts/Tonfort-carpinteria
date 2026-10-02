-- Migration: domain fixes — move precio_final/tiempo_entrega to producto_versiones, add es_fijo flag
-- Date: 2026-09-05

-- 1. Add business fields to producto_versiones
ALTER TABLE producto_versiones
  ADD COLUMN IF NOT EXISTS precio_final NUMERIC,
  ADD COLUMN IF NOT EXISTS tiempo_entrega TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'borrador';

-- 2. Backfill from propuestas_diseno (one-time data migration)
UPDATE producto_versiones pv
SET
  precio_final = pd.precio_final,
  tiempo_entrega = pd.tiempo_entrega
FROM propuestas_diseno pd
WHERE pv.producto_id = pd.id
  AND pd.precio_final IS NOT NULL;

-- 3. Drop business fields from propuestas_diseno
ALTER TABLE propuestas_diseno
  DROP COLUMN IF EXISTS precio_final,
  DROP COLUMN IF EXISTS tiempo_entrega;

-- 4. Add es_fijo flag to cotizacion_costos_variables
ALTER TABLE cotizacion_costos_variables
  ADD COLUMN IF NOT EXISTS es_fijo BOOLEAN NOT NULL DEFAULT false;

-- 5. Backfill existing seed rows as fixed costs (mano de obra, transporte are predefined)
UPDATE cotizacion_costos_variables
SET es_fijo = true
WHERE concepto IN ('Mano de obra', 'Transporte', 'Servicios', 'Maquinaria', 'Herramientas', 'Instalación', 'Permisos', 'Seguros');
