-- ============================================================
-- proyectos_visores: visores 3D a nivel de proyecto (Santa Marta)
-- ============================================================
-- El visor NO almacena video propio: referencia una propuesta del diseñador
-- (`propuestas_3d`). Así el portafolio público reusa exactamente el mismo
-- video y animaciones que el panel de diseño, con el formato de la landing.
-- Un proyecto puede tener varios visores (orden por `orden`).
--
-- Este archivo es autosuficiente y re-ejecutable: sirve tanto para crear la
-- tabla desde cero como para reparar la versión experimental anterior
-- (que guardaba `video_global_url` propio y no tenía `propuesta_id`), así que
-- NO hace falta un segundo archivo con DROP TABLE (que `aplicar-migracion.js`
-- salta por defecto). Las filas del modelo anterior no pueden convertirse
-- (no hay propuesta asociada) y se eliminan: la feature no tenía datos reales.
--
-- Idempotente: se puede aplicar más de una vez.
-- ============================================================

-- 1. Esquema final si no existe.
CREATE TABLE IF NOT EXISTS proyectos_visores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  propuesta_id UUID NOT NULL REFERENCES propuestas_3d(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Reparar el esquema experimental anterior (no-op en una BD nueva).
ALTER TABLE proyectos_visores ADD COLUMN IF NOT EXISTS propuesta_id UUID REFERENCES propuestas_3d(id) ON DELETE CASCADE;
ALTER TABLE proyectos_visores ADD COLUMN IF NOT EXISTS orden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE proyectos_visores ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE proyectos_visores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE proyectos_visores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Filas heredadas sin propuesta: no hay a qué apuntarlas.
DELETE FROM proyectos_visores WHERE propuesta_id IS NULL;
ALTER TABLE proyectos_visores ALTER COLUMN propuesta_id SET NOT NULL;

-- Columnas que sobran del modelo de subida manual.
ALTER TABLE proyectos_visores DROP COLUMN IF EXISTS video_global_url;
ALTER TABLE proyectos_visores DROP COLUMN IF EXISTS frame_centro_ms;
ALTER TABLE proyectos_visores DROP COLUMN IF EXISTS titulo;
ALTER TABLE proyectos_visores DROP COLUMN IF EXISTS descripcion;
DROP INDEX IF EXISTS proyectos_visores_activo_idx;

-- 3. Índices. Una propuesta solo puede mostrarse una vez por proyecto.
CREATE UNIQUE INDEX IF NOT EXISTS proyectos_visores_unq
  ON proyectos_visores(proyecto_id, propuesta_id);
CREATE INDEX IF NOT EXISTS proyectos_visores_proyecto_idx
  ON proyectos_visores(proyecto_id, orden);

-- 4. Trigger updated_at (re-ejecutable).
DROP TRIGGER IF EXISTS set_updated_at_proyectos_visores ON proyectos_visores;
CREATE TRIGGER set_updated_at_proyectos_visores
BEFORE UPDATE ON proyectos_visores
FOR EACH ROW EXECUTE FUNCTION _tonfort_touch_updated_at();

-- 5. RLS: service_role total; anon solo lee visores de proyectos publicados.
ALTER TABLE proyectos_visores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_read_proyectos_visores ON proyectos_visores;
CREATE POLICY anon_read_proyectos_visores ON proyectos_visores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM proyectos
      WHERE proyectos.id = proyectos_visores.proyecto_id
        AND proyectos.publicado = true
        AND proyectos.sede = 'santa_marta'
    )
  );

DROP POLICY IF EXISTS service_role_full_access_proyectos_visores ON proyectos_visores;
CREATE POLICY service_role_full_access_proyectos_visores ON proyectos_visores
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Reordenamiento atómico
-- ============================================================
-- Reordenar con un UPDATE por fila desde el cliente no es transaccional: un
-- fallo a mitad deja un `orden` parcialmente escrito. Esta función aplica la
-- lista completa en una sola llamada (una transacción).
--
-- `tabla` llega validada contra una lista blanca en el route handler.
-- ============================================================
CREATE OR REPLACE FUNCTION tonfort_reordenar_por_ids(tabla text, ids uuid[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  i INTEGER;
  total INTEGER;
BEGIN
  total := array_length(ids, 1);
  IF total IS NULL THEN
    RETURN;
  END IF;

  FOR i IN 1..total LOOP
    EXECUTE format('UPDATE %I SET orden = $1 WHERE id = $2', tabla)
      USING (i - 1), ids[i];
  END LOOP;
END;
$$;

COMMENT ON FUNCTION tonfort_reordenar_por_ids(text, uuid[]) IS
  'Reordenamiento atómico: la posición en `ids` es el nuevo `orden`.';
