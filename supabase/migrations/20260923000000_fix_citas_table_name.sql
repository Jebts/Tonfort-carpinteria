-- ============================================================
-- PLAN: Fix table name inconsistency
-- La tabla fue creada como "cites" (typo) en lugar de "citas".
-- Este migration renombra la tabla existente a "citas" si existe.
-- Para bases de datos nuevas, el migration 20260919000000_init_clean_schema.sql
-- ya crea la tabla con el nombre correcto.
-- ============================================================

-- Renombrar tabla cites → citas si existe pero citas no existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'cites'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'citas'
  ) THEN
    ALTER TABLE cites RENAME TO citas;
  END IF;
END $$;

-- Recrear índices si la tabla fue renombrada (los índices viajan con el rename,
-- pero nos aseguramos con IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS citas_cliente_id_idx ON citas(cliente_id);
CREATE INDEX IF NOT EXISTS citas_estado_idx ON citas(estado);
CREATE INDEX IF NOT EXISTS citas_fecha_hora_idx ON citas(fecha_hora);
