-- ============================================================
-- Refactor del espacio público de Tonfort
-- Landing, sede, portafolio por sede/categoría y agenda por modalidad
-- ============================================================
-- Añade:
--   - modalidades_cita como catálogo cerrado (virtual / presencial)
--   - citas.modalidad_id, citas.precio_copiado, citas.direccion
--   - clientes.email nullable + índice único parcial por teléfono
--   - proyectos.sede, proyectos.categoria, proyectos.portada_url
--   - proyectos_fotos (galería del portafolio)
--   - visores_landing + visores_landing_animaciones (espejo de propuestas_3d)
--   - bucket `portafolio-imagenes` + políticas de storage
-- Idempotente: se puede aplicar más de una vez.
-- ============================================================

-- ============================================================
-- 1. Catálogo de modalidades de cita
-- ============================================================

ALTER TABLE modalidades_cita
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS orden INT NOT NULL DEFAULT 0;

-- Backfill de slug sobre las filas que ya existieran en la tabla.
UPDATE modalidades_cita SET slug = 'virtual'
  WHERE slug IS NULL AND (lower(nombre) LIKE '%virtual%' OR lower(nombre) LIKE '%online%');

UPDATE modalidades_cita SET slug = 'presencial'
  WHERE slug IS NULL AND (lower(nombre) LIKE '%presencial%' OR lower(nombre) LIKE '%taller%' OR lower(nombre) LIKE '%medidas%');

-- Un slug no puede quedar repetido: solo la primera fila lo conserva.
CREATE UNIQUE INDEX IF NOT EXISTS modalidades_cita_slug_unq
  ON modalidades_cita(slug) WHERE slug IS NOT NULL;

INSERT INTO modalidades_cita (nombre, slug, descripcion, costo, duracion_minutos, activo, orden)
VALUES
  ('Virtual',    'virtual',    'Videollamada con tu diseñador. Sin costo.',     0,  90, true, 0),
  ('Presencial', 'presencial', 'Visita a tu domicilio y toma de medidas.',   70000, 120, true, 1)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE modalidades_cita IS 'Catálogo de modalidades de cita. Fuente de verdad de las 2 opciones públicas (virtual, presencial).';

-- ============================================================
-- 2. citas: modalidad, precio copiado y dirección
-- ============================================================

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS modalidad_id UUID REFERENCES modalidades_cita(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS precio_copiado INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS direccion TEXT;

UPDATE citas SET precio_copiado = 0 WHERE precio_copiado IS NULL;

CREATE INDEX IF NOT EXISTS citas_modalidad_fecha_idx ON citas(modalidad_id, fecha_hora);

-- Histórico: las citas existentes no belonged a ninguna modalidad y se
-- reservaron sin costo. Se asignan a la virtual, que es la de costo 0.
-- No se borra ninguna cita.
UPDATE citas c
SET modalidad_id = m.id, precio_copiado = 0
FROM modalidades_cita m
WHERE c.modalidad_id IS NULL
  AND m.slug = 'virtual'
  AND EXISTS (SELECT 1 FROM modalidades_cita WHERE slug = 'virtual');

COMMENT ON COLUMN citas.modalidad_id IS 'Modalidad reservada. El slot se ocupa por modalidad: una cita virtual no bloquea un bloque presencial.';
COMMENT ON COLUMN citas.precio_copiado IS 'Costo de la modalidad en el momento de la reserva. El precio nunca lo envía el cliente.';
COMMENT ON COLUMN citas.direccion IS 'Dirección de la visita presencial. Nullable: se acuerda por WhatsApp.';

-- ============================================================
-- 3. clientes: email nullable + teléfono único
-- ============================================================
-- `clientes` se preservó de un schema anterior: no se sabe si `email` es NOT NULL.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'clientes'
      AND column_name = 'email'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE clientes ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_telefono_unq
  ON clientes(telefono) WHERE telefono IS NOT NULL AND telefono <> '';

-- ============================================================
-- 4. proyectos: sede, categoría y portada
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sede_taller') THEN
    CREATE TYPE sede_taller AS ENUM ('santa_marta', 'bogota');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_mueble') THEN
    CREATE TYPE categoria_mueble AS ENUM (
      'cocina', 'closet', 'mueble_tv', 'puerta',
      'iluminacion', 'espacio_integral', 'otro'
    );
  END IF;
END $$;

ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS sede sede_taller NOT NULL DEFAULT 'santa_marta',
  ADD COLUMN IF NOT EXISTS categoria categoria_mueble,
  ADD COLUMN IF NOT EXISTS portada_url TEXT;

CREATE INDEX IF NOT EXISTS proyectos_sede_publicado_idx ON proyectos(sede, publicado);
CREATE INDEX IF NOT EXISTS proyectos_categoria_idx ON proyectos(categoria);
CREATE INDEX IF NOT EXISTS proyectos_recientes_idx ON proyectos(publicado, created_at DESC);

COMMENT ON COLUMN proyectos.sede IS 'Rama del portafolio en la que se publica. `bogota` es histórico: la sede ya no existe.';
COMMENT ON COLUMN proyectos.categoria IS 'Categoría de mueble. Catálogo cerrado de un solo valor por proyecto.';
COMMENT ON COLUMN proyectos.portada_url IS 'Imagen de portada a sangre de la página pública del proyecto.';

-- ============================================================
-- 5. Galería de fotos del proyecto
-- ============================================================

CREATE TABLE IF NOT EXISTS proyectos_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proyectos_fotos_proyecto_idx ON proyectos_fotos(proyecto_id, orden);

COMMENT ON TABLE proyectos_fotos IS 'Galería de fotos del proyecto en la página pública plana del portafolio.';

-- ============================================================
-- 6. Visores 3D de la landing
-- ============================================================
-- Espejo exacto de `propuestas_3d` para que `VideoViewer` los consuma sin adaptaciones.

CREATE TABLE IF NOT EXISTS visores_landing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot TEXT NOT NULL CHECK (slot IN ('primero', 'segundo')),
  eyebrow TEXT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  video_global_url TEXT NOT NULL,
  frame_centro_ms INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS visores_landing_slot_unq ON visores_landing(slot);

CREATE TABLE IF NOT EXISTS visores_landing_animaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visor_id UUID NOT NULL REFERENCES visores_landing(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  video_movimiento_url TEXT NOT NULL,
  video_accion_url TEXT,
  orden INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visores_landing_animaciones_idx
  ON visores_landing_animaciones(visor_id, orden);

COMMENT ON TABLE visores_landing IS 'Visores 3D públicos de la landing. Solo hay 2 slots: primero y segundo.';

-- ============================================================
-- 7. Storage: bucket `portafolio-imagenes`
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('portafolio-imagenes', 'portafolio-imagenes', true)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets SET public = true WHERE id = 'portafolio-imagenes';

DROP POLICY IF EXISTS "anon_read_portafolio_imagenes" ON storage.objects;
CREATE POLICY "anon_read_portafolio_imagenes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portafolio-imagenes');

DROP POLICY IF EXISTS "service_role_full_access_portafolio_imagenes" ON storage.objects;
CREATE POLICY "service_role_full_access_portafolio_imagenes"
  ON storage.objects FOR ALL
  USING (bucket_id = 'portafolio-imagenes')
  WITH CHECK (bucket_id = 'portafolio-imagenes');

-- ============================================================
-- 8. RLS de las tablas nuevas
-- ============================================================

ALTER TABLE proyectos_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE visores_landing ENABLE ROW LEVEL SECURITY;
ALTER TABLE visores_landing_animaciones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proyectos_fotos' AND policyname = 'anon_read_proyectos_fotos') THEN
    CREATE POLICY "anon_read_proyectos_fotos" ON proyectos_fotos FOR SELECT USING (
      EXISTS (SELECT 1 FROM proyectos p WHERE p.id = proyectos_fotos.proyecto_id AND p.publicado = true)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proyectos_fotos' AND policyname = 'service_role_full_access_proyectos_fotos') THEN
    CREATE POLICY "service_role_full_access_proyectos_fotos" ON proyectos_fotos FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visores_landing' AND policyname = 'service_role_full_access_visores_landing') THEN
    CREATE POLICY "service_role_full_access_visores_landing" ON visores_landing FOR ALL USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'visores_landing_animaciones' AND policyname = 'service_role_full_access_visores_landing_animaciones') THEN
    CREATE POLICY "service_role_full_access_visores_landing_animaciones" ON visores_landing_animaciones FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- 9. Triggers de `updated_at`
-- ============================================================

DROP TRIGGER IF EXISTS visores_landing_updated_at ON visores_landing;
CREATE TRIGGER visores_landing_updated_at
  BEFORE UPDATE ON visores_landing
  FOR EACH ROW EXECUTE FUNCTION _tonfort_touch_updated_at();

DROP TRIGGER IF EXISTS visores_landing_animaciones_updated_at ON visores_landing_animaciones;
CREATE TRIGGER visores_landing_animaciones_updated_at
  BEFORE UPDATE ON visores_landing_animaciones
  FOR EACH ROW EXECUTE FUNCTION _tonfort_touch_updated_at();