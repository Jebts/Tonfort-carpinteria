-- ============================================================
-- Visores de la landing: de 2 slots fijos a N visores
-- ============================================================
-- El carrusel de la landing necesita un número arbitrario de visores, no dos
-- posiciones fijas. Se relaja `visores_landing` para que `slot` sea un campo
-- opcional y se indexa `orden`, que es lo que lee
-- `getVisoresLandingActivos` en `lib/portfolio-service.ts`.
--
-- `visores_landing_animaciones` NO se toca: ya referencia `visor_id`, no `slot`.
--
-- Idempotente: se puede aplicar más de una vez.
-- ============================================================

-- La restricción se creó en 20260924000000_espacio_publico.sql; si la tabla
-- venía de antes, el nombre puede diferir, así que se localiza por definición.
DO $$
DECLARE
  nombre_check TEXT;
BEGIN
  SELECT conname INTO nombre_check
  FROM pg_constraint
  WHERE conrelid = 'visores_landing'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%slot%';

  IF nombre_check IS NOT NULL THEN
    EXECUTE format('ALTER TABLE visores_landing DROP CONSTRAINT %I', nombre_check);
  END IF;
END $$;

DROP INDEX IF EXISTS visores_landing_slot_unq;

ALTER TABLE visores_landing ALTER COLUMN slot DROP NOT NULL;

CREATE INDEX IF NOT EXISTS visores_landing_orden_idx ON visores_landing(orden);

COMMENT ON COLUMN visores_landing.slot IS
  'Legacy: "primero"/"segundo". Nulo en los visores creados para el carrusel; el orden lo define `orden`.';