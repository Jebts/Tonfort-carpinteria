#!/usr/bin/env bash
# verify_db.sh - Verifica el esquema v9 en Supabase (F2).
# Lee infra/.env (gitignored). No commitea secretos.
# Uso: bash infra/verify_db.sh
set -u
export PATH="/opt/homebrew/opt/libpq/bin:/usr/local/opt/libpq/bin:$PATH"
command -v psql >/dev/null 2>&1 || { echo "psql no encontrado. Instala con: brew install libpq"; exit 1; }
DIR="$(cd "$(dirname "$0")" && pwd)"
ENVFILE="$DIR/.env"
[ -f "$ENVFILE" ] || { echo "Falta $ENVFILE"; exit 1; }
set -a; source "$ENVFILE"; set +a

REF=plncsxkhqulvghqtqqzo
REGION="us-west-2"
POOLER="aws-0-${REGION}.pooler.supabase.com"
USER="${SUPABASE_DB_USER:-postgres}"
HOST="${SUPABASE_HOST:-db.${REF}.supabase.co}"
PORT="${SUPABASE_PORT:-5432}"
DBNAME="${SUPABASE_DB_NAME:-postgres}"

# Normalizar SUPABASE_DB_URL: si trae solo host:port (sin esquema), tratarlo
# como host y forzar recomposicion con la password.
if [ -n "${SUPABASE_DB_URL:-}" ] && [[ "$SUPABASE_DB_URL" != postgresql://* ]]; then
  HOST="${SUPABASE_DB_URL%:*}"
  SUPABASE_DB_URL=""
fi
if [ -z "${SUPABASE_DB_URL:-}" ]; then
  [ -z "${SUPABASE_DB_PASSWORD:-}" ] && { echo "Define SUPABASE_DB_URL (postgresql://...) o SUPABASE_DB_PASSWORD (+ SUPABASE_HOST/PORT) en .env"; exit 1; }
  SUPABASE_DB_URL="postgresql://${USER}:${SUPABASE_DB_PASSWORD}@${HOST}:${PORT}/${DBNAME}?sslmode=require"
fi
case "$SUPABASE_DB_URL" in *'sslmode'*) ;; *) SUPABASE_DB_URL="${SUPABASE_DB_URL}?sslmode=require";; esac

HOST=$(echo "$SUPABASE_DB_URL" | sed -E 's#^postgresql://[^@]+@([^:/]+).*#\1#')
PURL="$SUPABASE_DB_URL"
RURL="postgresql://app_router.${REF}:${SUPABASE_DB_PASSWORD_APP_ROUTER}@${POOLER}:${PORT}/postgres?sslmode=require"
TURL="postgresql://app_tenant.${REF}:${SUPABASE_DB_PASSWORD_APP_TENANT}@${POOLER}:${PORT}/postgres?sslmode=require"

# Si el host directo no responde, usar el pooler para la verificacion.
if ! psql "$PURL" -tAc "SELECT 1" >/dev/null 2>&1; then
  echo "(host directo no accesible desde este entorno; usando pooler)"
  PURL="postgresql://postgres.${REF}:${SUPABASE_DB_PASSWORD}@${POOLER}:${PORT}/postgres?sslmode=require"
fi

echo "=== CONECTIVIDAD ==="
psql "$PURL" -tAc "SELECT 'OK: db='||current_database()||' user='||current_user;" 2>&1 | head -2

echo "=== ESQUEMA (postgres) ==="
psql "$PURL" -tAc "SELECT 'tablas='||count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>&1
psql "$PURL" -tAc "SELECT 'policies='||count(*) FROM pg_policies WHERE schemaname='public';" 2>&1
psql "$PURL" -tAc "SELECT 'extensiones='||string_agg(extname,',') FROM pg_extension WHERE extname IN ('vector','pgcrypto','btree_gist');" 2>&1
psql "$PURL" -tAc "SELECT 'roles='||string_agg(rolname,',') FROM pg_roles WHERE rolname IN ('app_router','app_tenant');" 2>&1
psql "$PURL" -tAc "SELECT 'vistas='||count(*) FROM pg_views WHERE schemaname='public';" 2>&1

echo "=== ROL app_router (BYPASSRLS) ==="
psql "$RURL" -tAc "SELECT 'current_user='||current_user; SELECT 'empresas(app_router)='||count(*) FROM empresas;" 2>&1

echo "=== ROL app_tenant sin SET (RLS -> 0, sin error) ==="
psql "$TURL" -tAc "SELECT 'current_user='||current_user; SELECT 'empresas_sin_tenant='||count(*) FROM empresas;" 2>&1

echo "=== ROL app_tenant con tenant ficticio ==="
psql "$TURL" -tAc "SET app.tenant_id='00000000-0000-0000-0000-000000000000'; SELECT 'empresas_fake='||count(*) FROM empresas;" 2>&1
echo "=== FIN ==="
