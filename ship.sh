#!/usr/bin/env bash
# Runs LOCALLY. The one command for a full deploy of the Astro site:
#
#   1. deploy/build-release.sh   clean install, `npm run check`, archive
#   2. deploy/stage.sh           upload to ~/deploy-staging/<id>/ on the VPS,
#                                Caddyfile proposal, syntax check
#   3. apply-on-server.sh        via `ssh -t … sudo`, asks for the sudo
#                                password; switches, smoke-tests, rolls back
#                                on any failure
#
# Unlike the previous version, this script no longer commits or pushes:
# a release is built from a clean, committed tree, and publishing the source
# is a separate decision. Nothing is built on the server any more.
#
# Usage: ./ship.sh <ssh-target> [--private <file>]
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
target="${1:?usage: ./ship.sh <ssh-target> [--private <file>]}"
shift

deploy/build-release.sh "$@"
id="$(cat release/LATEST)"
deploy/stage.sh "${target}" "${id}"

echo
read -r -p "Go live with ${id} on ${target} now? [y/N] " answer
[[ "${answer}" == "y" || "${answer}" == "Y" ]] || { echo "Staged only. Apply later: docs/DEPLOY.md"; exit 0; }
ssh "${target}" bash "deploy-staging/${id}/apply-on-server.sh" --dry-run
ssh -t "${target}" sudo bash "deploy-staging/${id}/apply-on-server.sh"
