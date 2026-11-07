#!/usr/bin/env bash
# Roda na VPS, em /opt/bleach-soul-survivor. Uso: bash deploy.sh <sha de 40 caracteres>
# Serve também de rollback entre revisões deste jogo: a imagem anterior continua na VPS.
set -euo pipefail

revision="${1:?informe o SHA do commit}"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 2

cd "$(dirname "$0")"
# mesmo lock do bleach-idle: os dois jogos disputam a porta 2567 e não podem subir juntos
exec 9>/var/lock/bleach-deploy.lock
flock -w 600 9
export BLEACH_IMAGE="bleach-soul-survivor:$revision"
docker image inspect "$BLEACH_IMAGE" >/dev/null
if ! docker network inspect bleach-interna >/dev/null 2>&1; then
  docker network create bleach-interna >/dev/null
fi
export RELEASE_REVISION="$revision"
export RELEASE_DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker compose -f compose.vps.yml up -d --wait --wait-timeout 60
printf '%s\n' "$revision" > deployed-revision
