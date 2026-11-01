#!/usr/bin/env bash
set -euo pipefail

revision="${1:?informe o SHA do commit}"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 2

cd "$(dirname "$0")"
exec 9>/var/lock/bleach-deploy.lock
flock -w 600 9
export BLEACH_IMAGE="bleach-idle:$revision"
docker image inspect "$BLEACH_IMAGE" >/dev/null
if ! docker network inspect bleach-interna >/dev/null 2>&1; then
  docker network create bleach-interna >/dev/null
fi
export TRUST_PROXY
auto_gateway="$(docker network inspect bleach-interna --format '{{(index .IPAM.Config 0).Gateway}}')"
[[ "$auto_gateway" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || exit 3
TRUST_PROXY="$auto_gateway/32"
export RELEASE_REVISION="$revision"
export RELEASE_DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
docker compose -f compose.vps.yml up -d --wait --wait-timeout 120
printf '%s\n' "$revision" > deployed-revision
