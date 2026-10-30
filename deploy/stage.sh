#!/usr/bin/env bash
# Runs LOCALLY. Puts a release built by deploy/build-release.sh into
# ~/deploy-staging/<id>/ on the VPS, together with a Caddyfile proposal.
# It changes nothing that is live: it only reads /etc/caddy/Caddyfile and
# writes below ~/deploy-staging/ of the SSH user. Going live is a separate,
# deliberate step (deploy/apply-on-server.sh, run with sudo).
#
# Usage: deploy/stage.sh <ssh-target> [release-id]
#   <ssh-target>  SSH alias or user@host of the VPS
#   release-id    defaults to the content of release/LATEST
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

target="${1:?usage: deploy/stage.sh <ssh-target> [release-id]}"
id="${2:-$(cat release/LATEST)}"
# The id ends up in remote shell commands: only allow the format that
# build-release.sh produces.
[[ "${id}" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9a-f]+$ ]] || { echo "error: invalid release id: ${id}" >&2; exit 1; }
dir="release/${id}"
[[ -f "${dir}/site.tar.gz" ]] || { echo "error: ${dir}/site.tar.gz not found; run deploy/build-release.sh" >&2; exit 1; }
# A release built with --test-only contains test values; it never leaves this machine.
[[ ! -e "${dir}/TEST-ONLY" ]] || { echo "error: ${dir} is a TEST-ONLY release; refusing to stage it" >&2; exit 1; }

# BatchMode: never hang on a password prompt; fail instead.
ssh_opts=(-o BatchMode=yes)

echo "==> reading the live Caddyfile (read-only)"
ssh "${ssh_opts[@]}" "${target}" cat /etc/caddy/Caddyfile >deploy/Caddyfile.current

echo "==> generating the proposal (only the timurmanjosov.com block changes)"
# Fails if anything outside the block would change or a header gets weaker.
# The web root is taken from the live block, so it is never stored in this repo.
node tools/caddy-site-block.mjs propose deploy/Caddyfile.current deploy/Caddyfile.proposed
cp deploy/Caddyfile.proposed "${dir}/Caddyfile.proposed"
cp deploy/Caddyfile.current "${dir}/Caddyfile.at-staging"
diff -u deploy/Caddyfile.current deploy/Caddyfile.proposed >"${dir}/Caddyfile.diff" || true

(cd "${dir}" && sha256sum site.tar.gz redirects.tsv expected-headers.tsv language-door.tsv apply-on-server.sh \
  Caddyfile.proposed Caddyfile.at-staging >SHA256SUMS)

remote="deploy-staging/${id}"
echo "==> uploading to ${target}:~/${remote}/"
# ${remote} is meant to expand locally (a validated id, see above), `~`
# expands remotely.
# shellcheck disable=SC2029
ssh "${ssh_opts[@]}" "${target}" "mkdir -p ~/${remote}"
scp -q "${ssh_opts[@]}" "${dir}"/* "${target}:${remote}/"

echo "==> verifying on the server (checksums, Caddyfile syntax via caddy adapt, no sudo)"
# `caddy adapt` only parses and converts the config; unlike `caddy validate`
# it needs no access to Caddy's storage, so it runs as the SSH user.
# shellcheck disable=SC2029
ssh "${ssh_opts[@]}" "${target}" "cd ~/${remote} && sha256sum --quiet -c SHA256SUMS \
  && caddy adapt --adapter caddyfile --config Caddyfile.proposed >/dev/null && echo 'caddy adapt: OK'"

echo
echo "Staged. Rehearse first (no sudo, changes nothing):"
echo "  ssh ${target} bash ${remote}/apply-on-server.sh --dry-run"
echo "To go live, read the script first, then on the server run:"
echo "  sudo bash ~/${remote}/apply-on-server.sh"
echo "or from here:"
echo "  ssh -t ${target} sudo bash ${remote}/apply-on-server.sh"
