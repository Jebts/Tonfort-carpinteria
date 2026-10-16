-- ============================================================
-- rate_limit_log: registro de peticiones para rate limiting distribuido
-- ============================================================
-- Tabla preparada para migrar el rate limiter de `lib/rate-limit.ts` de un
-- `Map` en memoria (por proceso) a una tabla compartida en Postgres que
-- funcione en multi-instancia/serverless. Mientras tanto el runtime sigue
-- usando la implementación en memoria; esta tabla queda lista para el cambio.
-- Idempotente: se puede aplicar más de una vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_log_key_idx ON rate_limit_log(key);
CREATE INDEX IF NOT EXISTS rate_limit_log_created_at_idx ON rate_limit_log(created_at);
