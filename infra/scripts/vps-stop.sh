#!/usr/bin/env bash
# vps-stop.sh — Detiene los contenedores en el VPS.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ENVFILE="$DIR/../../.env"
[ -f "$ENVFILE" ] || { echo "Falta $ENVFILE"; exit 1; }
set -a; source "$ENVFILE"; set +a

: "${VPS_HOST:?Falta VPS_HOST}"
: "${VPS_USER:=root}"
: "${VPS_SSH_PORT:=22}"
: "${VPS_REMOTE_DIR:=/opt/tonfort}"
SSH_KEY_OPT=""
if [ -n "${VPS_SSH_KEY:-}" ] && [ -f "$VPS_SSH_KEY" ]; then
  SSH_KEY_OPT="-i $VPS_SSH_KEY"
fi

REMOTE="$VPS_USER@$VPS_HOST"
echo "=== Deteniendo contenedores en $REMOTE:$VPS_REMOTE_DIR ==="
ssh -p "$VPS_SSH_PORT" $SSH_KEY_OPT "$REMOTE" "cd $VPS_REMOTE_DIR && docker compose --env-file .env down"
