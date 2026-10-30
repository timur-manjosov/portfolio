#!/usr/bin/env bash
# Runs LOCALLY. Builds a checked, checksummed release of the site:
#
#   release/<id>/site.tar.gz            the release build (dist/, with private data)
#   release/<id>/redirects.tsv          redirect table for the smoke tests
#   release/<id>/expected-headers.tsv   security headers for the smoke tests
#   release/<id>/language-door.tsv      Accept-Language cases for the smoke tests
#   release/<id>/apply-on-server.sh     the script that installs it (root)
#   release/<id>/SHA256SUMS             checksums of all of the above
#   release/LATEST                      the newest <id>
#
# <id> = UTC timestamp + short commit hash, so every release on the server
# can be traced back to exactly one commit. release/ is git-ignored: the
# archive contains the private data rendered into the site.
#
# Usage: deploy/build-release.sh [--private <file>] [--allow-dirty] [--test-only]
#   --private <file>  private data file (default: private/site.private.yaml).
#                     The release build refuses a file without contact.email
#                     or legal.controller, with test values (example.invalid),
#                     and any output with a visible TODO( marker.
#   --allow-dirty     build from a working tree with uncommitted changes
#   --test-only       rehearse the whole pipeline with a test file: test values
#                     are allowed, the release is marked TEST-ONLY, release/LATEST
#                     is not updated, and stage.sh / apply-on-server.sh refuse it.
#   --github-meta     fetch public GitHub facts for projects with `repo:` during
#                     the release build only (GITHUB_META=1, src/lib/github-meta.ts;
#                     npm run publish sets it). Never fails the build.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

private_file="private/site.private.yaml"
allow_dirty=0
test_only=0
github_meta=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --private)
      [[ $# -ge 2 ]] || { echo "error: --private needs a file" >&2; exit 2; }
      private_file="$2"
      shift
      ;;
    --allow-dirty) allow_dirty=1 ;;
    --test-only) test_only=1 ;;
    --github-meta) github_meta=1 ;;
    *) echo "error: unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

# A release must correspond to a commit; otherwise the id would lie.
if [[ ${allow_dirty} -eq 0 && -n "$(git status --porcelain)" ]]; then
  echo "error: working tree is not clean. Commit first (or pass --allow-dirty for a test build)." >&2
  exit 1
fi
[[ -f "${private_file}" ]] || {
  echo "error: ${private_file} not found. Fill it in first: docs/GO-LIVE.md, step 1." >&2
  exit 1
}

# Clean install from the lockfile, then the full quality gate (public mode,
# which also runs the leak check against private/). A release is only built
# from a state that passes every check.
npm ci
npm run check

# The release build: validates the private file and refuses incomplete data,
# test values and visible TODO( markers (tools/build.mjs --release).
release_args=(--private "${private_file}")
[[ ${test_only} -eq 1 ]] && release_args+=(--allow-test-values)
if [[ ${github_meta} -eq 1 ]]; then
  GITHUB_META=1 npm run build:release -- "${release_args[@]}"
else
  npm run build:release -- "${release_args[@]}"
fi

id="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short=12 HEAD)"
out="release/${id}"
mkdir -p "${out}"

# Reproducible archive: sorted entries, no local user/group names, mtime of
# the commit. Extracted on the server with --no-same-owner anyway.
tar --sort=name --owner=0 --group=0 --numeric-owner \
  --mtime="@$(git log -1 --format=%ct)" \
  -C dist -czf "${out}/site.tar.gz" .

node tools/caddy-site-block.mjs smoke-data "${out}"
cp deploy/apply-on-server.sh "${out}/"

files=(site.tar.gz redirects.tsv expected-headers.tsv language-door.tsv apply-on-server.sh)
if [[ ${test_only} -eq 1 ]]; then
  echo "built from ${private_file} with --test-only; never stage or apply this release" >"${out}/TEST-ONLY"
  files+=(TEST-ONLY)
fi
(cd "${out}" && sha256sum "${files[@]}" >SHA256SUMS)

echo "release ${id}"
echo "  $(du -h "${out}/site.tar.gz" | cut -f1)  ${out}/site.tar.gz"
if [[ ${test_only} -eq 1 ]]; then
  echo "  TEST-ONLY: release/LATEST not updated; stage.sh and apply-on-server.sh refuse this release."
  exit 0
fi
echo "${id}" >release/LATEST
echo "next: deploy/stage.sh <ssh-target>"
