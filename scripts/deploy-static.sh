#!/usr/bin/env bash
#
# Build the kiosk and copy it onto a plain web host — Plesk, or Apache/nginx
# on a Lightsail instance. No CI, no platform account: it is a static build,
# so anything that serves files can serve it.
#
#   ./scripts/deploy-static.sh user@1.2.3.4 /var/www/vhosts/demo.careinn.com/httpdocs
#
# Add -i ~/.ssh/LightsailDefaultKey.pem via SSH_OPTS for a Lightsail key:
#   SSH_OPTS="-i ~/.ssh/LightsailDefaultKey.pem" ./scripts/deploy-static.sh ...
#
set -euo pipefail

TARGET="${1:-}"
REMOTE_DIR="${2:-}"
SSH_OPTS="${SSH_OPTS:-}"

if [[ -z "$TARGET" || -z "$REMOTE_DIR" ]]; then
  echo "usage: $0 user@host /path/to/httpdocs" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

echo "→ building"
npm run build

echo "→ uploading $(du -sh dist | cut -f1) to $TARGET:$REMOTE_DIR"
# --delete removes files the build no longer produces, so an old asset cannot
# linger and be picked up by a stale service worker. .htaccess is part of the
# build (it lives in public/), so it travels with it.
rsync -az --delete --info=progress2 \
  ${SSH_OPTS:+-e "ssh $SSH_OPTS"} \
  dist/ "$TARGET:$REMOTE_DIR/"

echo "→ done"
echo
echo "On the kiosk, load the site once over HTTPS and hard-reload. The app is"
echo "a PWA: without that, the service worker keeps serving the build it"
echo "already cached, which is what makes a deployed change look like it"
echo "never happened."
