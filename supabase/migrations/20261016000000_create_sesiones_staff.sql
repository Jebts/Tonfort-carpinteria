-- ============================================================
-- sesiones_staff: sesiones activas de staff (para revocación)
-- ============================================================
-- Almacena una fila por sesión de cookie emitida tras un login exitoso.
-- El middleware / los Route Handlers pueden invalidar una sesión al instante
-- marcando `revocado = true`, sin esperar a que expire la cookie (7 días).
-- `token_hash` guarda el hash de la cookie firmada (nunca el token en claro).
-- Solo service_role accede (vía Route Handlers); no hay política para `anon`.
-- Idempotente: se puede aplicar más de una vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS sesiones_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revocado BOOLEAN NOT NULL DEFAULT false,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS sesiones_staff_usuario_id_idx ON sesiones_staff(usuario_id);
CREATE INDEX IF NOT EXISTS sesiones_staff_expires_at_idx ON sesiones_staff(expires_at);

ALTER TABLE sesiones_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_full_access_sesiones_staff ON sesiones_staff;
CREATE POLICY service_role_full_access_sesiones_staff ON sesiones_staff
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- No se crea política para `anon`: el acceso a esta tabla es exclusivamente
-- vía Route Handlers con service_role.
