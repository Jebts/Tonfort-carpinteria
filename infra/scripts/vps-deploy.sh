#!/usr/bin/env bash
# vps-deploy.sh - Despliega tonfort (carpintería) en el VPS vía rsync + docker compose.
# Lee las vars VPS_* desde .env de la RAÍZ del repo.
#
# Uso:
#   bash infra/scripts/vps-deploy.sh                # deploy normal
#   bash infra/scripts/vps-deploy.sh --dry           # dry-run
#   bash infra/scripts/vps-deploy.sh --env-file /otro.env  # .env alternativo
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ENVFILE="$DIR/../../.env"
DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --env-file) ENVFILE="$2"; shift 2;;
    --dry) DRY=1; shift;;
    *) echo "Opción desconocida: $1"; exit 1;;
  esac
done

REPO_ROOT="$(cd "$DIR/../.." && pwd)"
COMPOSE_FILES="-f infra/docker-compose.yml"

[ -f "$ENVFILE" ] || { echo "Falta $ENVFILE"; exit 1; }
set -a; source "$ENVFILE"; set +a

: "${VPS_HOST:?Falta VPS_HOST en $ENVFILE}"
: "${VPS_USER:=root}"
: "${VPS_SSH_PORT:=22}"
: "${VPS_REMOTE_DIR:=/opt/tonfort}"
SSH_KEY_OPT=""
if [ -n "${VPS_SSH_KEY:-}" ]; then
  if [[ "$VPS_SSH_KEY" == *:* ]]; then
    echo "VPS_SSH_KEY parece una huella digital. Se omite -i, se usa ssh-agent/config."
  elif [ -f "$VPS_SSH_KEY" ]; then
    SSH_KEY_OPT="-i $VPS_SSH_KEY"
  else
    echo "VPS_SSH_KEY no es archivo accesible. Se omite -i."
  fi
fi

REMOTE="$VPS_USER@$VPS_HOST"
REPO_ROOT="$(cd "$DIR/../.." && pwd)"
SSH_CMD_BASE="ssh -p $VPS_SSH_PORT $SSH_KEY_OPT $REMOTE"
RSYNC_DEST="$VPS_REMOTE_DIR"
PROJECT_NAME="$(basename "$VPS_REMOTE_DIR")"

RSYNC_CMD="rsync -az --delete \
  --exclude='.DS_Store' \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='**/node_modules' \
  --exclude='.next' \
  --exclude='**/.next' \
  --exclude='out' \
  --exclude='**/out' \
  --exclude='test-results' \
  --exclude='**/test-results' \
  --exclude='.dev-server.log' \
  -e \"ssh $SSH_KEY_OPT -p $VPS_SSH_PORT\" \
  $REPO_ROOT/ $REMOTE:$RSYNC_DEST/"

run() { if [ "$DRY" = "1" ]; then echo "[dry] $*"; else eval "$@"; fi; }
ssh_remote() {
  local cmd="$1"
  if [ "$DRY" = "1" ]; then
    echo "[dry] ssh -p $VPS_SSH_PORT $SSH_KEY_OPT $REMOTE \"$cmd\""
  else
    ssh -p "$VPS_SSH_PORT" $SSH_KEY_OPT "$REMOTE" "$cmd"
  fi
}

echo "============================================"
echo " DEPLOY: $REMOTE:$VPS_REMOTE_DIR"
echo " Env    : $ENVFILE"
echo "============================================"
echo

# =========================================================================
# 1. Validación previa del .env local
# =========================================================================
echo "=== Paso 1/7: Validando variables críticas en .env ==="
missing=()
for var in \
  VPS_HOST DOMAIN \
  CARPINTERIA_SUPABASE_URL CARPINTERIA_SUPABASE_SERVICE_ROLE_KEY CARPINTERIA_SUPABASE_ANON_KEY \
  CARPINTERIA_WHATSAPP_NUMBER CARPINTERIA_INSTAGRAM_HANDLE CARPINTERIA_EMAIL \
  CARPINTERIA_HOST_IP CADDY_EMAIL; do
  val="${!var:-}"
  if [ -z "$val" ]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "ERROR: Faltan variables críticas en $ENVFILE:"
  printf ' - %s\n' "${missing[@]}"
  echo "Completa el .env antes de deployar."
  exit 1
fi
echo "  OK: variables críticas presentes."
echo

# =========================================================================
# 2. Sincronizar código al VPS
# =========================================================================
echo "=== Paso 2/7: Rsync del repo a $REMOTE:$RSYNC_DEST ==="
run "$RSYNC_CMD"
echo

# =========================================================================
# 3. Backup del .env remoto + copia del nuevo .env
# =========================================================================
echo "=== Paso 3/7: Backup y copia de .env al VPS ==="
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
REMOTE_ENV="$VPS_REMOTE_DIR/.env"
REMOTE_ENV_BACKUP="$VPS_REMOTE_DIR/.env.bak.$TIMESTAMP"

if ssh_remote "test -f $REMOTE_ENV"; then
  echo "  Existe .env remoto. Respaldando en $REMOTE_ENV_BACKUP"
  ssh_remote "cp $REMOTE_ENV $REMOTE_ENV_BACKUP"
else
  echo "  No existe .env remoto previo. Se creará uno nuevo."
fi

echo "  Copiando .env local -> VPS"
SCP_CMD="scp ${SSH_KEY_OPT:+-i $VPS_SSH_KEY} -P $VPS_SSH_PORT $ENVFILE $REMOTE:$REMOTE_ENV"
run "$SCP_CMD"
echo

# =========================================================================
# 4. Pull y up de contenedores
# =========================================================================
echo "=== Paso 4/7: Pull y up de contenedores ==="
run "$SSH_CMD_BASE \"cd $VPS_REMOTE_DIR && docker compose --env-file .env pull\""
run "$SSH_CMD_BASE \"cd $VPS_REMOTE_DIR && docker compose --env-file .env up -d\""
echo

# =========================================================================
# 5. Verificación post-deploy (checksums y salud)
# =========================================================================
echo "=== Paso 5/7: Verificación post-deploy ==="

LOCAL_MD5="$(md5 -q "$ENVFILE" 2>/dev/null || sha256sum "$ENVFILE" | cut -d' ' -f1)"
REMOTE_MD5="$(ssh_remote "md5sum $REMOTE_ENV" 2>/dev/null | cut -d' ' -f1 || ssh_remote "sha256sum $REMOTE_ENV" | cut -d' ' -f1)"
if [ "$LOCAL_MD5" = "$REMOTE_MD5" ]; then
  echo "  [OK] Checksum .env coincide (local <-> VPS)"
else
  echo "  [WARN] Checksum .env NO coincide. Local=$LOCAL_MD5 Remoto=$REMOTE_MD5"
fi

echo "  Contenedores activos:"
ssh_remote "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" | sed 's/^/    /'

CARPINTERIA_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "https://carpinteria.${DOMAIN}" 2>/dev/null || echo "000")"
if [ "$CARPINTERIA_STATUS" = "200" ]; then
  echo "  [OK] https://carpinteria.${DOMAIN} -> $CARPINTERIA_STATUS"
else
  echo "  [WARN] https://carpinteria.${DOMAIN} -> $CARPINTERIA_STATUS (se esperaba 200)"
fi

echo
echo "=== DEPLOY FINALIZADO ==="
echo "Backups de .env remoto: $REMOTE_ENV_BACKUP.*"
echo "Logs caddy       : ssh $REMOTE 'docker logs -f ${PROJECT_NAME}-caddy-1'"
echo "Logs carpinteria : ssh $REMOTE 'docker logs -f ${PROJECT_NAME}-carpinteria-web-1'"
