#!/usr/bin/env bash
# Runs LOCALLY (the ThinkPad). The one command for a full deploy:
#   Phase A — commit + push whatever's dirty in this repo (skipped if
#             already clean).
#   Phase B — SSH to the VPS via the existing alias and run its
#             deploy.sh (git pull -> containerized eleventy build ->
#             atomic swap; see that file for details).
# If Phase A fails, Phase B never runs — nothing gets deployed that
# didn't actually make it to the VPS's git remote.
set -euo pipefail

# SSH alias from ~/.ssh/config (Host netcup-vps).
SSH_ALIAS="netcup-vps"
# Repo path on the VPS — verified against the live host on 2026-07-29.
# Adjust here if the VPS-side checkout ever moves.
REMOTE_REPO_DIR="/var/www/timurmanjosov.com"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

echo "==> Phase A: local commit + push"
if [ -n "$(git status --porcelain)" ]; then
  mapfile -t CHANGED_FILES < <(git status --porcelain | awk '{print $2}')
  git add -A

  if [ "${#CHANGED_FILES[@]}" -le 4 ]; then
    COMMIT_MSG="Update ${CHANGED_FILES[*]}"
  else
    DIRS="$(printf '%s\n' "${CHANGED_FILES[@]}" | awk -F/ 'NF>1{print $1} NF==1{print "root"}' | sort -u | paste -sd, -)"
    COMMIT_MSG="Update ${#CHANGED_FILES[@]} files ($DIRS)"
  fi

  git commit -m "$COMMIT_MSG"

  if ! git push; then
    echo "ERROR: git push failed — aborting. The VPS was NOT touched, nothing to roll back." >&2
    exit 1
  fi
else
  echo "==> working tree already clean and pushed, nothing to commit"
fi

echo "==> Phase B: remote build + swap on $SSH_ALIAS"
if ! ssh "$SSH_ALIAS" "cd '$REMOTE_REPO_DIR' && ./deploy.sh"; then
  echo "ERROR: remote deploy failed on $SSH_ALIAS (see output above)." >&2
  echo "       The previous build is still live — deploy.sh only swaps after a verified build." >&2
  exit 1
fi

echo "==> ship complete."
