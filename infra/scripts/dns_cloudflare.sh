#!/usr/bin/env bash
# dns_cloudflare.sh - Crea/actualiza los A records del dominio en Cloudflare (grey-cloud).
# Los registros se dejan en "DNS only" (proxied=false).
# Idempotente: si el record ya existe con la misma IP, no lo toca.
#
# Uso:
#   bash infra/scripts/dns_cloudflare.sh
#   bash infra/scripts/dns_cloudflare.sh --dry
#
# Requiere: curl + vars DOMAIN, CARPINTERIA_HOST_IP,
# CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID en .env.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ENVFILE="$DIR/../../.env"
DRY=0
[ "${1:-}" = "--dry" ] && DRY=1
[ -f "$ENVFILE" ] || { echo "Falta $ENVFILE"; exit 1; }
set -a; source "$ENVFILE"; set +a

: "${DOMAIN:?Falta DOMAIN}"
: "${CARPINTERIA_HOST_IP:?Falta CARPINTERIA_HOST_IP (IP pública del subdominio carpinteria)}"
: "${CLOUDFLARE_API_TOKEN:?Falta CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ZONE_ID:?Falta CLOUDFLARE_ZONE_ID}"

API="https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records"
AUTH="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
DRYRUN=""
[ "$DRY" = "1" ] && DRYRUN="echo [dry]"

NAME="carpinteria"
IP="${CARPINTERIA_HOST_IP}"
FQDN="$NAME.$DOMAIN"
echo "=== $FQDN -> $IP (grey-cloud) ==="
EXISTS=$(curl -s -X GET "$API?name=$FQDN&type=A" -H "$AUTH" | python3 -c "import sys,json; d=json.load(sys.stdin); rs=d.get('result') or []; print(rs[0]['id'] if rs else '')" 2>/dev/null || true)
if [ -n "$EXISTS" ]; then
  $DRYRUN curl -s -X PUT "$API/$EXISTS" -H "$AUTH" -H "Content-Type: application/json" \
    --data "{\"type\":\"A\",\"name\":\"$NAME\",\"content\":\"$IP\",\"ttl\":1,\"proxied\":false}"
else
  $DRYRUN curl -s -X POST "$API" -H "$AUTH" -H "Content-Type: application/json" \
    --data "{\"type\":\"A\",\"name\":\"$NAME\",\"content\":\"$IP\",\"ttl\":1,\"proxied\":false}"
fi
echo "=== DNS Cloudflare alineado (grey-cloud). Verifica propagación con: dig +short carpinteria.$DOMAIN ==="
