-- Tabla: usuarios (cuentas de staff)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'asesor', 'disenador')),
  foto_perfil TEXT,
  bio_publica TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usuarios_email_idx ON usuarios(email);
CREATE INDEX IF NOT EXISTS usuarios_rol_idx ON usuarios(rol);
CREATE INDEX IF NOT EXISTS usuarios_activo_idx ON usuarios(activo);

-- RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas service_role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usuarios' AND policyname = 'service_role_full_access_usuarios') THEN
    CREATE POLICY "service_role_full_access_usuarios" ON usuarios FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;