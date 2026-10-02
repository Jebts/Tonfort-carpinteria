-- Migración: Convertir proyectos.asignado_a de string (email) a UUID FK → usuarios.id
-- Paso 1: Agregar columna UUID temporal
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id);

-- Paso 2: Backfill con verificación estricta
-- Solo proceder si TODOS los asignado_a no-nulos tienen match en usuarios.email
DO $$
DECLARE
  sin_match INTEGER;
BEGIN
  -- Contar proyectos con asignado_a no-nulo que NO tienen usuario coincidente
  SELECT COUNT(*) INTO sin_match
  FROM proyectos p
  WHERE p.asignado_a IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM usuarios u WHERE u.email = p.asignado_a
    );

  IF sin_match > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: % proyecto(s) tienen asignado_a sin usuario coincidente en usuarios.email. No se puede continuar.', sin_match;
  END IF;

  -- Backfill: actualizar usuario_id donde hay match
  UPDATE proyectos p
  SET usuario_id = u.id
  FROM usuarios u
  WHERE p.asignado_a = u.email;

  RAISE NOTICE 'Backfill completado: % proyecto(s) actualizados con usuario_id', (
    SELECT COUNT(*) FROM proyectos WHERE usuario_id IS NOT NULL
  );
END $$;

-- Paso 3: Verificar que el backfill cubrió todos los casos no-nulos
DO $$
DECLARE
  pendientes INTEGER;
BEGIN
  SELECT COUNT(*) INTO pendientes
  FROM proyectos
  WHERE asignado_a IS NOT NULL AND usuario_id IS NULL;

  IF pendientes > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: % proyecto(s) con asignado_a no-nulo no recibieron usuario_id tras backfill.', pendientes;
  END IF;
END $$;

-- Paso 4: Eliminar columna antigua
ALTER TABLE proyectos DROP COLUMN IF EXISTS asignado_a;

-- Paso 5: Renombrar columna nueva
ALTER TABLE proyectos RENAME COLUMN usuario_id TO asignado_a;

-- Paso 6: Recrear índice
CREATE INDEX IF NOT EXISTS proyectos_asignado_a_idx ON proyectos(asignado_a);