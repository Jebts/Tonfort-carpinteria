-- ============================================================
-- FIX Linter F2 (Supabase Database Linter 0010 / 0013)
-- Ejecutar en el editor SQL de Supabase DESPUES de esquema_v9.
-- Corrige:
--   * RLS en particiones de mensajes (se hereda la politica del padre)
--   * Vistas como SECURITY INVOKER (respetan RLS del tenant consultor)
--   * RLS en tablas globales de plataforma (sin tenant) con politica permisiva
--   * SELECT de app_tenant sobre las vistas (faltaba en los grants originales)
-- ============================================================

-- 1) RLS en las particiones de mensajes
ALTER TABLE mensajes_2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_2026_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_2026_10 ENABLE ROW LEVEL SECURITY;

-- 2) Vistas como SECURITY INVOKER (no bypass de RLS)
DROP VIEW IF EXISTS v_consumo_tokens_empresa;
CREATE VIEW v_consumo_tokens_empresa
WITH (security_invoker = true) AS
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

DROP VIEW IF EXISTS v_precio_operador_vigente;
CREATE VIEW v_precio_operador_vigente
WITH (security_invoker = true) AS
SELECT precio_operador_mensual, moneda
FROM parametros_precios
ORDER BY vigente_desde DESC
LIMIT 1;

-- 3) Tablas globales de plataforma sin tenant: RLS + politica permisiva
ALTER TABLE usuarios_internos ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametros_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametros_precios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_platform_usuarios_internos ON usuarios_internos;
CREATE POLICY allow_platform_usuarios_internos ON usuarios_internos USING (true);
DROP POLICY IF EXISTS allow_platform_parametros_tokens ON parametros_tokens;
CREATE POLICY allow_platform_parametros_tokens ON parametros_tokens USING (true);
DROP POLICY IF EXISTS allow_platform_parametros_precios ON parametros_precios;
CREATE POLICY allow_platform_parametros_precios ON parametros_precios USING (true);

-- 4) app_tenant necesita SELECT sobre las vistas (no estaban en los grants originales)
GRANT SELECT ON v_consumo_tokens_empresa, v_precio_operador_vigente TO app_tenant;
