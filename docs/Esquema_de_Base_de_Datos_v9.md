# Esquema de Base de Datos v9 (Inicialización Completa)

## 0. Contexto del proyecto

Este documento define la base de datos de un **SaaS multi-tenant** de atención al cliente por WhatsApp y agendamiento en Google Calendar, operado por un agente de IA. Funciona como el script unificado de inicialización (DCL + DDL + RLS) para ejecutarse en el editor SQL de **Supabase** (hosting confirmado en `Herramientas_del_Proyecto.md`).

## 1. Changelog de esta versión (v8 → v9) — Wompi, moneda COP e integridad operativa

Esta versión migra la pasarela de pago de Stripe a **Wompi** (Colombia), adopta **COP** como moneda única del MVP, y cierra huecos de integridad identificados en la revisión de congruencia del proyecto.

1. **Pasarela de pago: Stripe → Wompi.** Se elimina `empresas.stripe_customer_id`. En `pagos`: `tipo IN ('manual','wompi')`, columnas `wompi_transaction_id` y `wompi_reference` reemplazan las de Stripe. Índice único por `wompi_transaction_id`. Nueva columna `referencia_comprobante` para auditoría de pagos manuales (B13).
2. **Moneda COP.** `parametros_precios.moneda` pasa a `DEFAULT 'COP'`. `pagos.moneda` pasa a `DEFAULT 'COP'`. Los montos se almacenan en pesos con 2 decimales; la API de Wompi recibe `amount_in_cents = monto × 100` (entero).
3. **`integraciones.tipo`:** se elimina `'stripe'` del CHECK — Wompi es credencial global de plataforma (variables de entorno), no integración por tenant.
4. **Grants corregidos (S4):** `ALTER DEFAULT PRIVILEGES` ahora cubre también a `app_tenant` en tablas y secuencias futuras, no solo a `app_router`.
5. Sin cambios en autenticación (Supabase Auth), triggers de operador inactivo, particionado de `mensajes`, RLS base ni modelo de tokens respecto a v8.

**Nota de migración:** si ya existe una base de datos en v8 con datos reales, adaptar con `ALTER TABLE` / `DROP COLUMN` según corresponda. Pagos históricos con `tipo = 'stripe'` requieren migración de datos o archivo antes de cambiar el CHECK. Este script asume una inicialización limpia.

## 2. Script de Inicialización Unificado (Copia y pega en el editor SQL de Supabase)

```SQL
-- ==========================================
-- FASE 1: EXTENSIONES Y ROLES DE SEGURIDAD
-- ==========================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Crear los roles limitados para n8n (CUIDADO: Cambia las contraseñas antes de ejecutar en producción)
CREATE ROLE app_router LOGIN PASSWORD 'tu_password_seguro_router' BYPASSRLS;
CREATE ROLE app_tenant LOGIN PASSWORD 'tu_password_seguro_tenant';

GRANT USAGE ON SCHEMA public TO app_router, app_tenant;

-- ==========================================
-- FASE 2: ENTIDADES PRINCIPALES (DDL)
-- ==========================================

-- 1. ENTIDAD: empresas
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    instrucciones_md TEXT NOT NULL DEFAULT '',        -- system prompt completo, obligatorio
    identidad JSONB NOT NULL DEFAULT '{}'::jsonb,      -- perfil institucional, políticas, canales de contacto
    horario_atencion JSONB NOT NULL,
    zona_horaria TEXT NOT NULL DEFAULT 'UTC',
    duracion_cita_default INT NOT NULL DEFAULT 30,
    estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'suspendida', 'inactiva')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- 2. ENTIDAD: usuarios_internos (staff de la plataforma, NO de un tenant)
CREATE TABLE usuarios_internos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- 3. ENTIDAD: usuarios_empresa (administrador único + operadores)
CREATE TABLE usuarios_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefono TEXT,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'operador')),
    ultimo_acceso TIMESTAMPTZ,
    horario_atencion JSONB NULL,
    identidad JSONB NOT NULL DEFAULT '{}'::jsonb,
    activo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    UNIQUE (empresa_id, telefono)
);
CREATE INDEX idx_usuarios_empresa_telefono ON usuarios_empresa (empresa_id, telefono) WHERE deleted_at IS NULL;
CREATE INDEX idx_usuarios_empresa_activo ON usuarios_empresa (empresa_id) WHERE activo = TRUE AND deleted_at IS NULL;
CREATE UNIQUE INDEX uq_un_admin_por_empresa ON usuarios_empresa (empresa_id) WHERE rol = 'admin' AND deleted_at IS NULL;

-- 4. ENTIDAD: parametros_tokens (global, no pertenece a un tenant)
CREATE TABLE parametros_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tokens_admin_mensual INT NOT NULL,
    tokens_operador_mensual INT NOT NULL,
    vigente_desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO parametros_tokens (tokens_admin_mensual, tokens_operador_mensual)
VALUES (100000, 50000);

-- 5. ENTIDAD: parametros_precios (global, versionable, precio por operador en COP)
CREATE TABLE parametros_precios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    precio_operador_mensual NUMERIC(10,2) NOT NULL,
    moneda TEXT NOT NULL DEFAULT 'COP',
    vigente_desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO parametros_precios (precio_operador_mensual, moneda)
VALUES (0.00, 'COP');

-- 6. ENTIDAD: suscripciones
CREATE TABLE suscripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    operadores_contratados INT NOT NULL DEFAULT 0 CHECK (operadores_contratados >= 0),
    operadores_contratados_proximo_periodo INT NULL,
    requiere_seleccion_operadores BOOLEAN NOT NULL DEFAULT FALSE,
    seleccion_operadores_vence_at TIMESTAMPTZ NULL,
    estado TEXT NOT NULL CHECK (estado IN ('activa', 'vencida', 'cancelada')),
    periodo_inicio TIMESTAMPTZ NOT NULL,
    periodo_fin TIMESTAMPTZ NOT NULL,
    aviso_90pct_enviado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX uq_suscripcion_activa ON suscripciones (empresa_id) WHERE estado = 'activa';

-- 7. ENTIDAD: pagos (auditoría de toda activación/renovación, manual o Wompi)
CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    suscripcion_id UUID REFERENCES suscripciones(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('manual', 'wompi')),
    monto NUMERIC(10,2) NOT NULL,
    moneda TEXT NOT NULL DEFAULT 'COP',
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'fallido')),
    wompi_transaction_id TEXT,
    wompi_reference TEXT,
    referencia_comprobante TEXT,
    activado_por_usuario_interno_id UUID REFERENCES usuarios_internos(id),
    confirmado_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CHECK (
        (tipo = 'manual' AND activado_por_usuario_interno_id IS NOT NULL) OR
        (tipo = 'wompi')
    )
);
CREATE UNIQUE INDEX idx_pagos_wompi_transaction ON pagos (wompi_transaction_id) WHERE wompi_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX idx_pagos_wompi_reference ON pagos (wompi_reference) WHERE wompi_reference IS NOT NULL;

-- 8. ENTIDAD: integraciones (por tenant; Wompi NO va aquí — es credencial global de plataforma)
CREATE TABLE integraciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios_empresa(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('whatsapp', 'google_calendar', 'instagram', 'telegram')),
    identificador_externo TEXT,
    credenciales_encriptadas JSONB NOT NULL,
    configuracion JSONB,
    webhook_secret TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'error', 'desconectado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX idx_integraciones_identificador_externo ON integraciones (identificador_externo) WHERE deleted_at IS NULL AND identificador_externo IS NOT NULL;
CREATE INDEX idx_integraciones_usuario ON integraciones (usuario_id, tipo) WHERE deleted_at IS NULL AND estado = 'activo';

-- 9. ENTIDAD: servicios
CREATE TABLE servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios_empresa(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    duracion_minutos INT NOT NULL,
    precio NUMERIC(10,2) DEFAULT 0.00,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- 10. ENTIDAD: productos (catálogo informativo, sin inventario ni transacción real)
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    atributos JSONB,
    precio_referencial NUMERIC(10,2),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- 11. ENTIDAD: contenido_rag
CREATE TABLE contenido_rag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('servicio_detalle', 'producto')),
    servicio_id UUID REFERENCES servicios(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    contenido TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CHECK (
        (tipo = 'servicio_detalle' AND servicio_id IS NOT NULL AND producto_id IS NULL) OR
        (tipo = 'producto' AND producto_id IS NOT NULL AND servicio_id IS NULL)
    )
);
CREATE INDEX ON contenido_rag USING hnsw (embedding vector_cosine_ops);

-- 12. ENTIDAD: clientes
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    telefono TEXT NOT NULL,
    nombre TEXT,
    email TEXT,
    opt_in_mensajes BOOLEAN NOT NULL DEFAULT FALSE,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    UNIQUE (empresa_id, telefono)
);

-- 13. ENTIDAD: citas
CREATE TABLE citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios_empresa(id) ON DELETE RESTRICT,
    servicio_id UUID NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
    fecha_hora TIMESTAMPTZ NOT NULL,
    fecha_hora_fin TIMESTAMPTZ NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'reprogramada')),
    notas TEXT,
    integracion_evento_id TEXT,
    recordatorio_enviado_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    CHECK (fecha_hora_fin > fecha_hora)
);
ALTER TABLE citas ADD CONSTRAINT no_solapamiento_usuario
    EXCLUDE USING gist (
        usuario_id WITH =,
        tstzrange(fecha_hora, fecha_hora_fin) WITH &&
    ) WHERE (deleted_at IS NULL AND estado NOT IN ('cancelada'));
CREATE INDEX idx_citas_disponibilidad ON citas (empresa_id, usuario_id, fecha_hora) WHERE deleted_at IS NULL;
CREATE INDEX idx_citas_cliente ON citas (cliente_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_citas_recordatorio ON citas (fecha_hora) WHERE estado = 'confirmada' AND recordatorio_enviado_at IS NULL AND deleted_at IS NULL;

-- 14. ENTIDAD: mensajes (Historial Particionado)
CREATE TABLE mensajes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios_empresa(id) ON DELETE SET NULL,
    sesion_id UUID NOT NULL,
    mensaje_externo_id TEXT,
    rol TEXT NOT NULL CHECK (rol IN ('user', 'assistant', 'system')),
    contenido TEXT NOT NULL,
    tokens_usados INT DEFAULT 0,
    estado_entrega TEXT CHECK (estado_entrega IN ('enviado', 'entregado', 'leido', 'fallido')),
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE mensajes_2026_07 PARTITION OF mensajes FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE mensajes_2026_08 PARTITION OF mensajes FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE mensajes_2026_09 PARTITION OF mensajes FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE mensajes_2026_10 PARTITION OF mensajes FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE INDEX idx_mensajes_sesion ON mensajes (sesion_id, created_at);
CREATE INDEX idx_mensajes_empresa_fecha ON mensajes (empresa_id, created_at);
CREATE UNIQUE INDEX idx_mensajes_externo_id ON mensajes (empresa_id, mensaje_externo_id, created_at) WHERE mensaje_externo_id IS NOT NULL;


-- ==========================================
-- FASE 3: TRIGGERS, FUNCIONES Y VISTAS
-- ==========================================

CREATE OR REPLACE FUNCTION fn_verificar_cupo_operadores_activos()
RETURNS TRIGGER AS $$
DECLARE
    cupo INT;
    activos_actuales INT;
BEGIN
    IF NEW.rol = 'operador' AND NEW.activo = TRUE AND (TG_OP = 'INSERT' OR OLD.activo = FALSE) THEN
        SELECT operadores_contratados INTO cupo FROM suscripciones WHERE empresa_id = NEW.empresa_id AND estado = 'activa' LIMIT 1;
        SELECT COUNT(*) INTO activos_actuales FROM usuarios_empresa WHERE empresa_id = NEW.empresa_id AND rol = 'operador' AND activo = TRUE AND deleted_at IS NULL AND id != NEW.id;

        IF cupo IS NOT NULL AND activos_actuales >= cupo THEN
            RAISE EXCEPTION 'cupo_operadores_excedido: el plan permite % operador(es) activo(s), ya hay % activo(s)', cupo, activos_actuales;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verificar_cupo_operadores_activos
    BEFORE INSERT OR UPDATE OF activo, rol ON usuarios_empresa
    FOR EACH ROW EXECUTE FUNCTION fn_verificar_cupo_operadores_activos();

CREATE OR REPLACE FUNCTION fn_desconectar_integracion_usuario_inactivo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.activo = FALSE AND TG_OP = 'UPDATE' AND OLD.activo = TRUE THEN
        UPDATE integraciones
        SET estado = 'desconectado'
        WHERE usuario_id = NEW.id AND tipo = 'whatsapp' AND estado = 'activo' AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_desconectar_integracion_usuario_inactivo
    AFTER UPDATE OF activo ON usuarios_empresa
    FOR EACH ROW EXECUTE FUNCTION fn_desconectar_integracion_usuario_inactivo();

CREATE VIEW v_consumo_tokens_empresa AS
SELECT
    s.empresa_id,
    s.id AS suscripcion_id,
    (
        (SELECT tokens_admin_mensual FROM parametros_tokens ORDER BY vigente_desde DESC LIMIT 1)
        + s.operadores_contratados * (SELECT tokens_operador_mensual FROM parametros_tokens ORDER BY vigente_desde DESC LIMIT 1)
    ) AS limite_tokens_periodo,
    COALESCE(SUM(m.tokens_usados) FILTER (WHERE m.created_at >= s.periodo_inicio), 0) AS tokens_usados_periodo,
    s.periodo_fin,
    s.aviso_90pct_enviado
FROM suscripciones s
LEFT JOIN mensajes m ON m.empresa_id = s.empresa_id
WHERE s.estado = 'activa'
GROUP BY s.empresa_id, s.id, s.operadores_contratados, s.periodo_fin, s.aviso_90pct_enviado;

CREATE VIEW v_precio_operador_vigente AS
SELECT precio_operador_mensual, moneda
FROM parametros_precios
ORDER BY vigente_desde DESC
LIMIT 1;


-- ==========================================
-- FASE 4: PERMISOS (GRANTS) A ROLES DE N8N
-- ==========================================

GRANT SELECT, INSERT, UPDATE, DELETE ON
    empresas, usuarios_empresa, integraciones, servicios, productos, contenido_rag,
    clientes, citas, mensajes, suscripciones, pagos
TO app_tenant;
GRANT SELECT ON parametros_tokens, parametros_precios TO app_tenant;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_tenant;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_router;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_router;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_router, app_tenant;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_tenant, app_router;


-- ==========================================
-- FASE 5: ROW-LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE integraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contenido_rag ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_empresas ON empresas USING (id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_usuarios ON usuarios_empresa USING (empresa_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_integraciones ON integraciones USING (empresa_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_servicios ON servicios USING (empresa_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_productos ON productos USING (empresa_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_contenido_rag ON contenido_rag USING (empresa_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_clientes ON clientes USING (empresa_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_citas ON citas USING (empresa_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_mensajes ON mensajes USING (empresa_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_suscripciones ON suscripciones USING (empresa_id = current_setting('app.tenant_id', true)::uuid);
CREATE POLICY tenant_isolation_pagos ON pagos USING (empresa_id = current_setting('app.tenant_id', true)::uuid);
```

### Siguientes pasos en tu base de datos:

1. Modifica `'tu_password_seguro_router'` y `'tu_password_seguro_tenant'` con contraseñas fuertes propias.
2. Ajusta `(100000, 50000)` en `parametros_tokens` y `(0.00, 'COP')` en `parametros_precios` a los valores reales antes de producción.
3. Copia todo el bloque desde `-- FASE 1:` hasta el final.
4. Ve al editor SQL de tu proyecto en Supabase, pega y ejecuta.
5. Configura en n8n las credenciales `Postgres - app_router` y `Postgres - app_tenant` apuntando a este proyecto de Supabase.
6. Habilita Supabase Auth en el proyecto (Email/Password + MFA) antes de construir el flujo de login (ver Estructura Lógica v5, sección B0).
