#!/usr/bin/env bash
# Content updates after the first go-live (`npm run publish`, tools/publish.mjs).
#
# Runs ON THE VPS (uploaded by tools/publish.mjs into
# ~/deploy-staging/publish/<id>/, then `sudo bash …/publish-on-server.sh --apply`)
# or LOCALLY against a test directory (`--local --web-root <dir>`), which is
# how tools/check-publish.mjs tests it without a server.
#
# It changes content only. The Caddyfile is never read for writing and Caddy
# is never reloaded: Caddy serves `<web root>/current`, a symlink to
# `releases/<id>/` (laid out by the first go-live, deploy/apply-on-server.sh),
# and resolves it on every request. Switching the symlink is atomic.
#
# Modes (exactly one):
#   --manifest        read-only: state of the web root (current release,
#                     history) and one hash per served file. Also works piped
#                     over SSH without writing anything: `ssh host bash -s --
#                     --manifest < deploy/publish-on-server.sh`.
#   --manifest-of <dir>  read-only: the same hashes for any directory
#                     (tools/publish.mjs uses it on the new build, so both
#                     sides are hashed by identical code).
#   --dry-run         read-only: checks every precondition of --apply, prints
#                     the plan, changes nothing.
#   --apply           unpack the staged release into releases/<id>/, switch
#                     `current`, check over HTTP, and switch back if a check
#                     fails. Keeps the newest --keep releases (default 5).
#   --rollback        switch `current` back to the previous published release,
#                     check over HTTP, switch forward again if that fails.
#
# Options:
#   --keep <n>        releases to keep (2–50, default 5)
#   --local           test mode: requires --web-root and --base-url, refuses
#                     to run as root, accepts TEST-ONLY releases
#   --web-root <dir>  (only with --local) the directory holding releases/ and
#                     current; on the server it comes from /etc/caddy/Caddyfile
#   --base-url <url>  (only with --local) where the test server answers
#   --stage-dir <dir> (only with --local) staged files; default: this script's directory
#
# Writes only below <web root>: releases/<id>/, releases/HISTORY,
# releases/.publish.lock and the `current` symlink. Deletes only directories
# releases/<id> whose name has the release-id format, never the live one and
# never anything outside releases/ (safe_remove_release).
#
# Exit codes: 0 done, 1 failed (state restored), 2 usage error.
set -euo pipefail
umask 022

SITE_HOST=timurmanjosov.com
CADDYFILE=/etc/caddy/Caddyfile
MARK_BEGIN="# BEGIN timurmanjosov.com"
ID_RE='^[0-9]{8}T[0-9]{6}Z-[0-9a-f]+$'
# What `current` may point at: a release, or the old site kept by the first
# go-live (releases/legacy-<stamp>).
TARGET_RE='^releases/([0-9]{8}T[0-9]{6}Z-[0-9a-f]+|legacy-[0-9]{8}T[0-9]{6}Z)$'

log() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
usage() { printf 'usage error: %s\n' "$*" >&2; exit 2; }

# --- arguments ----------------------------------------------------------------
MODE=""
KEEP=5
LOCAL=0
WEB_ROOT=""
BASE_URL=""
STAGE=""
MANIFEST_DIR=""
set_mode() { [[ -z "${MODE}" ]] || usage "only one mode allowed"; MODE="$1"; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --manifest) set_mode manifest ;;
    --manifest-of)
      set_mode manifest-of
      [[ $# -ge 2 ]] || usage "--manifest-of needs a directory"
      MANIFEST_DIR="$2"
      shift
      ;;
    --dry-run) set_mode dry-run ;;
    --apply) set_mode apply ;;
    --rollback) set_mode rollback ;;
    --keep)
      [[ $# -ge 2 && "$2" =~ ^[0-9]+$ ]] || usage "--keep needs a number"
      KEEP="$2"
      shift
      ;;
    --local) LOCAL=1 ;;
    --web-root)
      [[ $# -ge 2 ]] || usage "--web-root needs a directory"
      WEB_ROOT="$2"
      shift
      ;;
    --base-url)
      [[ $# -ge 2 ]] || usage "--base-url needs a URL"
      BASE_URL="$2"
      shift
      ;;
    --stage-dir)
      [[ $# -ge 2 ]] || usage "--stage-dir needs a directory"
      STAGE="$2"
      shift
      ;;
    *) usage "unknown argument: $1" ;;
  esac
  shift
done
[[ -n "${MODE}" ]] || usage "pass one of --manifest, --manifest-of <dir>, --dry-run, --apply, --rollback"
((KEEP >= 2 && KEEP <= 50)) || usage "--keep must be between 2 and 50"

# --- hashing (shared by --manifest and --manifest-of) ---------------------------
# One line per file: "<sha256>  <path>". HTML is hashed with the hashed asset
# names (/_astro/<name>.<hash>.css) blanked out, so a page whose text did not
# change does not count as changed just because a stylesheet did.
hash_tree() {
  local dir="$1" f
  (
    cd "${dir}"
    find . -type f -printf '%P\n' | LC_ALL=C sort | while IFS= read -r f; do
      if [[ "${f}" == *.html ]]; then
        printf '%s  %s\n' "$(LC_ALL=C sed -E 's#/_astro/[^"'"'"' )]*#/_astro/#g' "${f}" | sha256sum | cut -d' ' -f1)" "${f}"
      else
        printf '%s  %s\n' "$(sha256sum <"${f}" | cut -d' ' -f1)" "${f}"
      fi
    done
  )
}

if [[ "${MODE}" == manifest-of ]]; then
  [[ -d "${MANIFEST_DIR}" ]] || die "${MANIFEST_DIR} is not a directory"
  hash_tree "${MANIFEST_DIR}"
  exit 0
fi

# --- mode checks ------------------------------------------------------------------
if [[ ${LOCAL} -eq 1 ]]; then
  [[ -n "${WEB_ROOT}" ]] || usage "--local needs --web-root"
  [[ -n "${BASE_URL}" || "${MODE}" == manifest ]] || usage "--local needs --base-url"
  [[ "${BASE_URL}" =~ ^(https?://[A-Za-z0-9.:-]+)?$ ]] || usage "--base-url must be scheme://host[:port]"
  # The test mode never runs with root rights: it skips the ownership steps
  # and accepts TEST-ONLY releases.
  [[ ${EUID} -ne 0 ]] || usage "--local must not run as root"
else
  [[ -z "${WEB_ROOT}${BASE_URL}${STAGE}" ]] || usage "--web-root, --base-url and --stage-dir are only allowed with --local"
fi

# --- the web root ---------------------------------------------------------------
# Every write and every delete is bound to this path, so it is checked hard:
# absolute, plain characters, no `.`/`..` components, no trailing slash, at
# least two components (never `/` or a top-level directory) and at least 8
# characters.
valid_web_root() {
  local d="$1"
  [[ -n "${d}" ]] || return 1
  [[ "${d}" =~ ^/[A-Za-z0-9._/-]+$ ]] || return 1
  [[ "${d}" != */ && "${d}" != *//* ]] || return 1
  [[ "/${d}/" != */../* && "/${d}/" != */./* ]] || return 1
  [[ "${d}" =~ ^/[^/]+/[^/]+ ]] || return 1
  [[ ${#d} -ge 8 ]] || return 1
  return 0
}

if [[ ${LOCAL} -eq 0 ]]; then
  [[ -r "${CADDYFILE}" ]] || die "${CADDYFILE} is not readable"
  # Same rule as deploy/apply-on-server.sh: the root line of the generated block.
  site_root="$(awk -v mark="${MARK_BEGIN}" 'index($0, mark) == 1 { inblock = 1 }
    inblock && $1 == "root" && $2 == "*" { print $3; exit }' "${CADDYFILE}")"
  [[ "${site_root}" == */current ]] ||
    die "no 'root * <dir>/current' in the generated block of ${CADDYFILE}. The first go-live goes through ./ship.sh (docs/GO-LIVE.md)."
  WEB_ROOT="${site_root%/current}"
fi
valid_web_root "${WEB_ROOT}" || die "refusing web root '${WEB_ROOT}' (empty, relative, too short, root or unusual characters)"
[[ -d "${WEB_ROOT}" && ! -L "${WEB_ROOT}" ]] || die "web root ${WEB_ROOT} is not a directory"
RELEASES="${WEB_ROOT}/releases"
CURRENT_LINK="${WEB_ROOT}/current"
HISTORY="${RELEASES}/HISTORY"

[[ -d "${RELEASES}" && ! -L "${RELEASES}" ]] ||
  die "${RELEASES} missing: the first go-live goes through ./ship.sh (docs/GO-LIVE.md)"
[[ -L "${CURRENT_LINK}" ]] ||
  die "${CURRENT_LINK} is not a symlink: the first go-live goes through ./ship.sh (docs/GO-LIVE.md)"
CURRENT_TARGET="$(readlink "${CURRENT_LINK}")"
[[ "${CURRENT_TARGET}" =~ ${TARGET_RE} ]] || die "current points at '${CURRENT_TARGET}', not at a release"
CURRENT_ID="${CURRENT_TARGET#releases/}"
[[ -d "${RELEASES}/${CURRENT_ID}" ]] || die "current points at a missing directory"

# History of published releases, oldest first, one id per line. A release put
# live by ./ship.sh in between is not in it yet: it is taken as the top.
history_ids() {
  local id
  if [[ -f "${HISTORY}" ]]; then
    while IFS= read -r id; do
      [[ "${id}" =~ ${ID_RE} || "${id}" =~ ^legacy-[0-9]{8}T[0-9]{6}Z$ ]] && printf '%s\n' "${id}"
    done <"${HISTORY}"
  fi
  return 0
}
effective_history() {
  local ids last
  ids="$(history_ids)"
  last="$(tail -n 1 <<<"${ids}")"
  [[ -n "${ids}" ]] && printf '%s\n' "${ids}"
  [[ "${last}" == "${CURRENT_ID}" ]] || printf '%s\n' "${CURRENT_ID}"
}

if [[ "${MODE}" == manifest ]]; then
  printf 'WEBROOT ok\n'
  printf 'CURRENT %s\n' "${CURRENT_ID}"
  effective_history | sed 's/^/HISTORY /'
  hash_tree "${RELEASES}/${CURRENT_ID}" | sed 's/^/FILE /'
  exit 0
fi

# --- deleting, bound to releases/<id> -------------------------------------------
safe_remove_release() {
  local name="$1" path
  [[ "${name}" =~ ${ID_RE} ]] || die "refusing to delete '${name}': not a release id"
  valid_web_root "${WEB_ROOT}" || die "refusing to delete: web root failed the check"
  [[ "${name}" != "${CURRENT_ID}" && "releases/${name}" != "$(readlink "${CURRENT_LINK}")" ]] ||
    die "refusing to delete the live release ${name}"
  path="${RELEASES}/${name}"
  [[ "${path}" == "${WEB_ROOT}/releases/${name}" ]] || die "refusing to delete '${path}'"
  [[ -d "${path}" && ! -L "${path}" ]] || die "refusing to delete '${path}': not a directory"
  rm -rf -- "${path}"
}

switch_to() { # <release dir name>
  ln -sfn "releases/$1" "${CURRENT_LINK}.next"
  mv -T "${CURRENT_LINK}.next" "${CURRENT_LINK}"
}

# --- HTTP checks ------------------------------------------------------------------
if [[ ${LOCAL} -eq 1 ]]; then
  BASE="${BASE_URL%/}"
  CURL=(curl -sS --max-time 15)
else
  # All requests go to this machine, independent of DNS.
  BASE="https://${SITE_HOST}"
  CURL=(curl -sS --max-time 15 --resolve "${SITE_HOST}:443:127.0.0.1")
fi
FAILURES=0
fail() { echo "  FAIL: $*" >&2; FAILURES=$((FAILURES + 1)); }

expect_200() { # <path>
  local code
  code="$("${CURL[@]}" -o /dev/null -w '%{http_code}' "${BASE}$1" 2>/dev/null || true)"
  code="${code:-000}"
  [[ "${code}" == 200 ]] || fail "$1: HTTP ${code}, expected 200"
}

check_site() { # <expected-headers.tsv> [<check-urls.txt>]
  local headers_file="$1" urls_file="${2:-}" path name value headers want n=0
  FAILURES=0
  for path in /de/ /en/ /de/blog/ /en/blog/ /en/projects/ /de/feed.xml /en/feed.xml /sitemap.xml /llms.txt; do
    expect_200 "${path}"
  done
  if [[ -n "${urls_file}" && -f "${urls_file}" ]]; then
    while IFS= read -r path; do
      [[ -n "${path}" ]] || continue
      # Only plain site paths reach curl.
      [[ "${path}" =~ ^/[A-Za-z0-9._~%/-]*$ && "${path}" != *..* ]] || { fail "unusual path in check list: ${path}"; continue; }
      expect_200 "${path}"
      n=$((n + 1))
    done <"${urls_file}"
  fi
  log "  ${n} new or changed URL(s) checked"
  # Security headers incl. the CSP: exactly as configured, on a page and a 404.
  for path in /en/ "/de/gibt-es-nicht-${STAMP}/"; do
    headers="$("${CURL[@]}" -o /dev/null -D - "${BASE}${path}" | tr -d '\r' |
      awk -F': ' 'NF > 1 { printf "%s: %s\n", tolower($1), substr($0, index($0, ": ") + 2) }' || true)"
    while IFS=$'\t' read -r name value; do
      [[ -n "${name}" ]] || continue
      # Plain http in the local test mode: browsers ignore HSTS there, and the
      # test server does not send it.
      [[ ${LOCAL} -eq 1 && "${name,,}" == strict-transport-security ]] && continue
      want="$(printf '%s: %s' "${name,,}" "${value}")"
      grep -qxF "${want}" <<<"${headers}" || fail "${path}: header ${name} missing or different"
    done <"${headers_file}"
  done
  [[ ${FAILURES} -eq 0 ]]
}

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

# --- staged release (dry-run, apply) ------------------------------------------------
if [[ "${MODE}" == dry-run || "${MODE}" == apply ]]; then
  if [[ -z "${STAGE}" ]]; then
    STAGE="$(dirname "${BASH_SOURCE[0]}")"
  elif [[ ${LOCAL} -eq 0 ]]; then
    usage "--stage-dir is only allowed with --local"
  fi
  STAGE="$(cd "${STAGE}" && pwd)"
  ID="$(basename "${STAGE}")"
  PROBLEMS=0
  problem() { printf '  PROBLEM: %s\n' "$*" >&2; PROBLEMS=$((PROBLEMS + 1)); }

  log "release ${ID} from ${STAGE}"
  [[ "${ID}" =~ ${ID_RE} ]] || problem "the staging directory is not named like a release id: ${ID}"
  if [[ -e "${STAGE}/TEST-ONLY" && ${LOCAL} -eq 0 ]]; then
    problem "TEST-ONLY release (test values inside): never published to the server"
  fi
  for tool in curl tar sha256sum awk sed find flock; do
    command -v "${tool}" >/dev/null || problem "missing tool: ${tool}"
  done
  if [[ -f "${STAGE}/PUBLISH.SHA256SUMS" ]]; then
    for f in site.tar.gz expected-headers.tsv check-urls.txt publish-on-server.sh; do
      grep -q " ${f}\$" "${STAGE}/PUBLISH.SHA256SUMS" || problem "${f} is not covered by PUBLISH.SHA256SUMS"
    done
    (cd "${STAGE}" && sha256sum --quiet -c PUBLISH.SHA256SUMS) || problem "checksum mismatch"
  else
    problem "PUBLISH.SHA256SUMS missing"
  fi
  if [[ -f "${STAGE}/site.tar.gz" ]]; then
    listing="$(tar -tzf "${STAGE}/site.tar.gz" 2>/dev/null || true)"
    for f in index.html 404.html de/index.html en/index.html sitemap.xml; do
      grep -qxF "./${f}" <<<"${listing}" || problem "build is incomplete: ${f} missing"
    done
    if grep -qvE '^\./([A-Za-z0-9._~@+-]+/?)*$' <<<"${listing}" || grep -qE '(^|/)\.\.(/|$)' <<<"${listing}"; then
      problem "archive contains unexpected paths"
    fi
  else
    problem "site.tar.gz missing"
  fi
  [[ "${ID}" != "${CURRENT_ID}" ]] || problem "${ID} is already live"
  if [[ -e "${RELEASES}/${ID}" && ( -L "${RELEASES}/${ID}" || ! -d "${RELEASES}/${ID}" ) ]]; then
    problem "${RELEASES}/${ID} exists and is not a directory"
  fi
  if [[ ! -w "${RELEASES}" || ! -w "${WEB_ROOT}" ]]; then
    if [[ "${MODE}" == dry-run && ${EUID} -ne 0 && ${LOCAL} -eq 0 ]]; then
      log "no write access as $(id -un); a real run uses sudo"
    else
      problem "no write access to ${WEB_ROOT} and its releases/ (run with sudo, docs/PUBLISHING.md)"
    fi
  fi

  if [[ "${MODE}" == dry-run ]]; then
    echo
    log "dry run: a real run would now"
    echo "  [plan] unpack site.tar.gz into ${RELEASES}/${ID}"
    echo "  [plan] switch current: releases/${CURRENT_ID} -> releases/${ID} (atomic rename, no Caddy reload)"
    echo "  [plan] check $(grep -c . "${STAGE}/check-urls.txt" 2>/dev/null || echo 0) new/changed URLs + 9 fixed ones for HTTP 200, security headers on /en/ and a 404"
    echo "  [plan] on a failed check: switch back to releases/${CURRENT_ID}, delete releases/${ID}, exit 1"
    echo "  [plan] keep the newest ${KEEP} published releases"
    if [[ ${PROBLEMS} -gt 0 ]]; then
      echo "dry run: ${PROBLEMS} problem(s); a real run would stop before changing anything." >&2
      exit 1
    fi
    echo "dry run: all preconditions hold. Nothing was changed."
    exit 0
  fi
  [[ ${PROBLEMS} -eq 0 ]] || die "${PROBLEMS} precondition(s) failed, nothing changed"
fi

if [[ "${MODE}" == rollback ]]; then
  # The expected headers do not depend on the release (they are what the
  # Caddy block sends); tools/publish.mjs uploads them next to this script.
  if [[ -z "${STAGE}" ]]; then
    STAGE="$(dirname "${BASH_SOURCE[0]}")"
  elif [[ ${LOCAL} -eq 0 ]]; then
    usage "--stage-dir is only allowed with --local"
  fi
  [[ -f "${STAGE}/expected-headers.tsv" ]] || die "${STAGE}/expected-headers.tsv missing"
  mapfile -t HIST < <(effective_history)
  [[ ${#HIST[@]} -ge 2 ]] || die "no earlier published release to go back to (history: ${HIST[*]:-empty}); see docs/DEPLOY.md, 'Rollback'"
  PREV_ID="${HIST[${#HIST[@]} - 2]}"
  [[ -d "${RELEASES}/${PREV_ID}" ]] || die "previous release ${PREV_ID} is gone from ${RELEASES}"
fi

# --- changing things (apply, rollback) -----------------------------------------------
[[ -w "${RELEASES}" && -w "${WEB_ROOT}" ]] || die "no write access to ${WEB_ROOT} (run with sudo)"
exec 9>"${RELEASES}/.publish.lock"
flock -n 9 || die "another publish is running (${RELEASES}/.publish.lock)"

write_history() { # ids… (oldest first); written next to the file, then renamed
  printf '%s\n' "$@" >"${HISTORY}.next"
  mv -f "${HISTORY}.next" "${HISTORY}"
}

if [[ "${MODE}" == rollback ]]; then
  log "rolling back: releases/${CURRENT_ID} -> releases/${PREV_ID}"
  switch_to "${PREV_ID}"
  if check_site "${STAGE}/expected-headers.tsv"; then
    write_history "${HIST[@]:0:${#HIST[@]}-1}"
    log "live: ${CURRENT_LINK} -> releases/${PREV_ID} (rolled back from ${CURRENT_ID})"
    exit 0
  fi
  echo "check after the rollback failed; switching forward to ${CURRENT_ID} again" >&2
  switch_to "${CURRENT_ID}"
  exit 1
fi

# --- apply ---------------------------------------------------------------------------
INCOMING="${RELEASES}/.incoming-${ID}"
[[ ! -e "${INCOMING}" ]] || die "${INCOMING} exists (an interrupted run?); remove it after checking"
if [[ -d "${RELEASES}/${ID}" ]]; then
  # Left over from a rollback (it is not live, checked above): replace it.
  log "replacing the earlier, not live copy of releases/${ID}"
  safe_remove_release "${ID}"
fi
log "unpacking into ${RELEASES}/${ID}"
mkdir "${INCOMING}"
tar -xzf "${STAGE}/site.tar.gz" --no-same-owner --no-same-permissions -C "${INCOMING}"
if [[ ${EUID} -eq 0 ]]; then
  # Same as deploy/apply-on-server.sh: releases belong to root and are
  # read-only for everyone else; Caddy only reads them.
  chown -R root:root "${INCOMING}"
fi
find "${INCOMING}" -type d -exec chmod 755 {} +
find "${INCOMING}" -type f -exec chmod 644 {} +
mv -T "${INCOMING}" "${RELEASES}/${ID}"

mapfile -t HIST < <(effective_history)
PREV_ID="${CURRENT_ID}"

# From the switch until the check has passed, any exit (a failed command,
# Ctrl-C) switches back to the previous release.
on_abort() {
  trap - EXIT
  echo "interrupted; switching back to releases/${PREV_ID}" >&2
  switch_to "${PREV_ID}"
  exit 1
}
trap on_abort EXIT
trap 'exit 130' INT TERM
log "switching current: releases/${PREV_ID} -> releases/${ID}"
switch_to "${ID}"

log "checking over HTTP (${BASE})"
if ! check_site "${STAGE}/expected-headers.tsv" "${STAGE}/check-urls.txt"; then
  trap - EXIT
  echo "${FAILURES} check(s) failed; switching back to releases/${PREV_ID}" >&2
  switch_to "${PREV_ID}"
  CURRENT_ID="${PREV_ID}"
  safe_remove_release "${ID}"
  echo "rolled back: current -> releases/${PREV_ID}; releases/${ID} removed" >&2
  exit 1
fi
trap - EXIT
CURRENT_ID="${ID}"
HIST+=("${ID}")
write_history "${HIST[@]}"

# Keep the newest KEEP published releases (plus the live one); delete other
# release directories. legacy-* (the old site) is never deleted automatically.
start=$((${#HIST[@]} > KEEP ? ${#HIST[@]} - KEEP : 0))
keep_ids=("${HIST[@]:start}")
write_history "${keep_ids[@]}"
for dir in "${RELEASES}"/*/; do
  name="$(basename "${dir}")"
  [[ "${name}" =~ ${ID_RE} ]] || continue
  [[ " ${keep_ids[*]} " == *" ${name} "* ]] && continue
  log "removing old release ${name}"
  safe_remove_release "${name}"
done
log "live: ${CURRENT_LINK} -> releases/${ID} (previous: ${PREV_ID})"
