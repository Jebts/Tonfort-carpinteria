#!/usr/bin/env bash
# verify_db.sh - Verifica el esquema v9 en Supabase (F2/F3).
# Lee infra/.env (gitignored, un nivel arriba de scripts/). No commitea secretos.
# Uso: bash infra/scripts/verify_db.sh
#
# El REF del proyecto y el host del pooler SE DERIVAN de .env (no hardcodeados),
# para no depender de un REF placeholder. La password se pasa via PGPASSWORD
# (DSN keyword/value), evitando problemas de parsing por caracteres especiales.
set -u
export PATH="/opt/homebrew/opt/libpq/bin:/usr/local/opt/libpq/bin:$PATH"
command -v psql >/dev/null 2>&1 || { echo "psql no encontrado. Instala con: brew install libpq"; exit 1; }
DIR="$(cd "$(dirname "$0")" && pwd)"
ENVFILE="$DIR/../.env"
[ -f "$ENVFILE" ] || { echo "Falta $ENVFILE"; exit 1; }
set -a; source "$ENVFILE"; set +a

PORT="${SUPABASE_DB_PORT:-5432}"
DBNAME="${SUPABASE_DB_NAME:-postgres}"

# ---- Derivar REF y POOLER desde .env (NO hardcodeado) ----
REF=""; POOLER=""
if [ -n "${SUPABASE_DB_URL:-}" ]; then
  UHOST=$(echo "$SUPABASE_DB_URL" | sed -E 's#^postgresql://[^@]+@([^:/]+).*#\1#')
  REF=$(echo "$UHOST" | sed -E 's#^db\.([^.]+)\.supabase\.co$#\1#'); [ "$REF" = "$UHOST" ] && REF=""
  if [[ "$UHOST" == *"pooler.supabase.com"* ]]; then POOLER="$UHOST"; fi
fi
[ -z "$REF" ] && [ -n "${SUPABASE_DB_HOST:-}" ] && REF=$(echo "${SUPABASE_DB_HOST}" | sed -E 's#^db\.([^.]+)\.supabase\.co$#\1#'); [ -z "$REF" ] && REF="${SUPABASE_DB_REF:-}"
[ -z "$POOLER" ] && { REGION="${SUPABASE_DB_REGION:-us-west-2}"; POOLER="aws-0-${REGION}.pooler.supabase.com"; }
[ -z "$REF" ] && { echo "No se pudo derivar el REF. Define SUPABASE_DB_HOST (db.<REF>.supabase.co), SUPABASE_DB_URL o SUPABASE_DB_REF en .env"; exit 1; }

echo "REF detectado : $REF"
echo "POOLER host   : $POOLER"

# Conexion via PGPASSWORD (sin incrustar la password en la URL)
run() {
  local user="$1" pass="$2"; shift 2
  PGPASSWORD="$pass" psql "host=$POOLER port=$PORT dbname=$DBNAME user=$user sslmode=require" "$@"
}

echo "=== CONECTIVIDAD (postgres) ==="
run "postgres.$REF" "$SUPABASE_DB_PASSWORD" -tAc "SELECT 'OK: db='||current_database()||' user='||current_user;" 2>&1 | head -2

echo "=== ESQUEMA ==="
run "postgres.$REF" "$SUPABASE_DB_PASSWORD" -tAc "SELECT 'tablas='||count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>&1
run "postgres.$REF" "$SUPABASE_DB_PASSWORD" -tAc "SELECT 'policies='||count(*) FROM pg_policies WHERE schemaname='public';" 2>&1
run "postgres.$REF" "$SUPABASE_DB_PASSWORD" -tAc "SELECT 'extensiones='||string_agg(extname,',') FROM pg_extension WHERE extname IN ('vector','pgcrypto','btree_gist');" 2>&1
run "postgres.$REF" "$SUPABASE_DB_PASSWORD" -tAc "SELECT 'roles='||string_agg(rolname,',') FROM pg_roles WHERE rolname IN ('app_router','app_tenant');" 2>&1
run "postgres.$REF" "$SUPABASE_DB_PASSWORD" -tAc "SELECT 'vistas='||count(*) FROM pg_views WHERE schemaname='public';" 2>&1

echo "=== ROL app_router (BYPASSRLS) ==="
run "app_router.$REF" "$SUPABASE_DB_PASSWORD_APP_ROUTER" -tAc "SELECT 'current_user='||current_user; SELECT 'empresas(app_router)='||count(*) FROM empresas;" 2>&1

echo "=== ROL app_tenant sin SET (RLS -> 0, sin error) ==="
run "app_tenant.$REF" "$SUPABASE_DB_PASSWORD_APP_TENANT" -tAc "SELECT 'current_user='||current_user; SELECT 'empresas_sin_tenant='||count(*) FROM empresas;" 2>&1

echo "=== ROL app_tenant con tenant ficticio ==="
run "app_tenant.$REF" "$SUPABASE_DB_PASSWORD_APP_TENANT" -tAc "SET app.tenant_id='00000000-0000-0000-0000-000000000000'; SELECT 'empresas_fake='||count(*) FROM empresas;" 2>&1
echo "=== FIN ==="
