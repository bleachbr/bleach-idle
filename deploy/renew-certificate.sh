#!/usr/bin/env bash
set -euo pipefail

if [[ "${RENEWED_LINEAGE:-}" == /etc/letsencrypt/live/bleach.acoplum.com ]]; then
  nginx -t
  systemctl reload nginx
fi
