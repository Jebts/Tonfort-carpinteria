-- ==========================================
-- PLAN: Video-Only Proposal Platform
-- Fase 1: Triggers y funciones auxiliares
-- ==========================================

-- ============================================================
-- 1. Generación automática de link_token
-- ============================================================
-- El link_token se genera al activar link_activo si aún no lo tiene.
-- Aquí usamos un trigger BEFORE UPDATE para generar el token.

CREATE OR REPLACE FUNCTION _propuesta_set_link_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Si link_activo se activa y no hay token, generar uno
  IF NEW.link_activo = true AND NEW.link_token IS NULL THEN
    NEW.link_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  -- Si link_activo se desactiva, limpiar token
  IF NEW.link_activo = false THEN
    NEW.link_token := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS propuesta_link_token_trigger ON propuestas_3d;
CREATE TRIGGER propuesta_link_token_trigger
  BEFORE INSERT OR UPDATE ON propuestas_3d
  FOR EACH ROW EXECUTE FUNCTION _propuesta_set_link_token();

-- ============================================================
-- 2. Función de utilidad: verificar estado de propuesta
-- ============================================================
-- Devuelve el estado siguiente permitido para un rol dado
CREATE OR REPLACE FUNCTION get_propuesta_next_estado(
  desde_estado estado_propuesta_3d,
  rol TEXT
) RETURNS estado_propuesta_3d AS $$
BEGIN
  -- Diseñador: borrador → lista
  -- Admin: lista → enviada
  IF rol = 'disenador' THEN
    IF desde_estado = 'borrador' THEN
      RETURN 'lista';
    END IF;
  ELSIF rol = 'admin' THEN
    IF desde_estado = 'lista' THEN
      RETURN 'enviada';
    END IF;
    -- Admin puede mantener el estado actual en otros casos
    RETURN desde_estado;
  END IF;
  RETURN desde_estado;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Storage: bucket visores-video creado vía supabase CLI/SDK
-- ============================================================
-- Las políticas de storage se configuran en el Dashboard de Supabase:
-- - Bucket: visores-video (público)
-- - Anon: SELECT (read) on folder publico
-- - Service role: full access

-- ============================================================
-- 4. Comentario sobre cleanup de storage
-- ============================================================
COMMENT ON DATABASE current_database IS 'Supabase project: plncsxkhqulvghqtqqzo';
-- Bucket legacy propuestas-3d debe ser eliminado manualmente si existe.
-- public/models/*.glb se archivan fuera del flujo activo.
