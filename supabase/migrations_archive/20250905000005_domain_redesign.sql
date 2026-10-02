-- Migration: domain redesign — producto_versiones hangs from proyectos, drop propuestas_diseno
-- Date: 2026-09-07

-- 1. Add nullable columns to producto_versiones
ALTER TABLE producto_versiones
  ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS modelo_id UUID REFERENCES modelos(id);

-- 2. Backfill proyecto_id from propuestas_diseno via producto_id
UPDATE producto_versiones pv
SET proyecto_id = pd.proyecto_id
FROM propuestas_diseno pd
WHERE pv.producto_id = pd.id
  AND pv.proyecto_id IS NULL;

-- 3. Backfill modelo_id from producto_version_modelos (first/orden=0 entry per version)
UPDATE producto_versiones pv
SET modelo_id = pvm.modelo_id
FROM producto_version_modelos pvm
WHERE pvm.producto_version_id = pv.id
  AND pvm.orden = 0
  AND pv.modelo_id IS NULL;

-- 4. Make proyecto_id and modelo_id NOT NULL
ALTER TABLE producto_versiones
  ALTER COLUMN proyecto_id SET NOT NULL,
  ALTER COLUMN modelo_id SET NOT NULL;

-- 5. Drop producto_id from producto_versiones
ALTER TABLE producto_versiones
  DROP COLUMN IF EXISTS producto_id;

-- 6. Drop old index on producto_id
DROP INDEX IF EXISTS producto_versiones_producto_id_idx;

-- 7. Create index on proyecto_id
CREATE INDEX IF NOT EXISTS producto_versiones_proyecto_id_idx ON producto_versiones(proyecto_id);

-- 8. Drop producto_id from cotizacion_items and recreate unique constraint
ALTER TABLE cotizacion_items
  DROP COLUMN IF EXISTS producto_id;

DROP INDEX IF EXISTS cotizacion_items_producto_id_idx;

-- Drop the existing unique constraint and recreate without producto_id
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'cotizacion_items'::regclass
    AND contype = 'u';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE cotizacion_items DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

ALTER TABLE cotizacion_items
  ADD CONSTRAINT cotizacion_items_cotizacionversion_id_producto_version_id_key UNIQUE (cotizacionversion_id, producto_version_id);

-- 9. Drop propuesta_modelos first (child of propuestas_diseno)
DROP TABLE IF EXISTS propuesta_modelos CASCADE;

-- 10. Drop propuestas_diseno
DROP TABLE IF EXISTS propuestas_diseno CASCADE;

-- 11. Drop obsolete RLS policies for deleted tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuestas_diseno' AND policyname = 'service_role_full_access_propuestas_diseno') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_full_access_propuestas_diseno" ON propuestas_diseno';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuestas_diseno' AND policyname = 'anon_full_access_propuestas_diseno') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_full_access_propuestas_diseno" ON propuestas_diseno';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuesta_modelos' AND policyname = 'service_role_full_access_propuesta_modelos') THEN
    EXECUTE 'DROP POLICY IF EXISTS "service_role_full_access_propuesta_modelos" ON propuesta_modelos';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'propuesta_modelos' AND policyname = 'anon_full_access_propuesta_modelos') THEN
    EXECUTE 'DROP POLICY IF EXISTS "anon_full_access_propuesta_modelos" ON propuesta_modelos';
  END IF;
END $$;
