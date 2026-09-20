#!/usr/bin/env bash
#
# Build the kiosk and put it on the demo server.
#
#   npm run deploy                                    # the usual
#   ./scripts/deploy-static.sh user@host /docroot     # somewhere else
#
# main is the live version. The screen a patient looks at should be a commit
# anybody can check out, so this refuses to publish a working tree nobody else
# could reproduce — uncommitted edits, or a commit that has not reached main.
# Either guard can be waived for a one-off, and the waiver is recorded on the
# server so the next person can see what happened:
#
#   ALLOW_DIRTY=1   publish uncommitted changes
#   ALLOW_AHEAD=1   publish a commit that is not on origin/main
#   SSH_OPTS="-i ~/.ssh/some.pem"   use a key other than the default
#
set -euo pipefail

TARGET="${1:-sara@3.126.147.31}"
REMOTE_DIR="${2:-demo.careinn.com}"
SSH_OPTS="${SSH_OPTS:-}"

cd "$(dirname "$0")/.."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
COMMIT="$(git rev-parse --short HEAD)"
SUBJECT="$(git log -1 --format=%s)"

# ── Could anybody else rebuild exactly this? ─────────────────────────────
if [[ -n "$(git status --porcelain)" ]]; then
  if [[ "${ALLOW_DIRTY:-}" != "1" ]]; then
    echo "✗ Uncommitted changes — what went live would exist only on this Mac." >&2
    echo "  Commit them, or re-run with ALLOW_DIRTY=1." >&2
    exit 1
  fi
  DIRTY=" +uncommitted"
else
  DIRTY=""
fi

git fetch -q origin main 2>/dev/null || true
if ! git merge-base --is-ancestor HEAD origin/main 2>/dev/null; then
  if [[ "${ALLOW_AHEAD:-}" != "1" ]]; then
    echo "✗ $COMMIT is not on origin/main, so main would not be the live version." >&2
    echo "  Push it to main first, or re-run with ALLOW_AHEAD=1." >&2
    exit 1
  fi
  AHEAD=" (not on main)"
else
  AHEAD=""
fi

echo "→ building $BRANCH @ $COMMIT$DIRTY$AHEAD — $SUBJECT"
npm run build

# What is actually live, readable at /deployed.json. Without it, "did the fix
# reach the server?" gets answered by squinting at a kiosk.
python3 - "$COMMIT" "$BRANCH" "$SUBJECT" "$DIRTY" > dist/deployed.json <<'PY'
import json, sys, datetime
commit, branch, subject, dirty = sys.argv[1:5]
print(json.dumps({
    "commit": commit,
    "branch": branch,
    "subject": subject,
    "deployedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "clean": dirty == "",
}, indent=2))
PY

echo "→ uploading $(du -sh dist | cut -f1) to $TARGET:$REMOTE_DIR"
# --delete keeps the server honest: an asset this build no longer produces
# cannot linger for a stale service worker to find.
# Plesk keeps its own files in the document root — .php-ini, .php-version, and
# the .well-known folder Let's Encrypt writes into. Not ours to delete.
# --info=progress2 is GNU rsync only; macOS ships openrsync, which rejects it.
rsync -az --delete \
  --exclude='.php-ini' --exclude='.php-version' --exclude='.well-known' \
  ${SSH_OPTS:+-e "ssh $SSH_OPTS"} \
  dist/ "$TARGET:$REMOTE_DIR/"

echo "→ live: $COMMIT — $SUBJECT"
echo
echo "On a kiosk that has been here before, hard-reload once. The app is a PWA:"
echo "otherwise the service worker keeps serving the build it already cached,"
echo "which is what makes a deployed change look like it never happened."
