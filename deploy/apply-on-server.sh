#!/usr/bin/env bash
# Runs ON THE VPS, as root:   sudo bash ~/deploy-staging/<id>/apply-on-server.sh
# Rehearsal, no root, changes nothing:
#                             bash ~/deploy-staging/<id>/apply-on-server.sh --dry-run
#
# Puts a staged release (deploy/build-release.sh + deploy/stage.sh) live:
#   1. verifies every staged file against SHA256SUMS
#   2. records a baseline of aura.timurmanjosov.com (status + headers)
#   3. unpacks the build into <web root>/releases/<id>/
#   4. backs up /etc/caddy/Caddyfile and validates the proposed one
#      (as the caddy user, so no root-owned files end up in Caddy's storage)
#   5. flips the `current` symlink atomically, installs the Caddyfile and
#      reloads Caddy (reload only, never restart/stop: no downtime, and a
#      bad config is rejected by the running Caddy instead of killing it)
#   6. smoke-tests the site, the language door on /, the redirects, the
#      headers, the 404 pages, and checks that Aura answers exactly as before
#   7. on ANY failure after step 3: restores the old symlink and Caddyfile,
#      reloads again and exits non-zero
#
# The web root is not written in this script (the repository is public): it
# is read from the `root * <web root>/current` line of the generated block in
# Caddyfile.proposed, which deploy/stage.sh took from the live Caddyfile.
#
# --dry-run is evaluated before anything else. It runs without sudo, uses
# only reading commands (sha256sum -c, tar -t, cmp, stat, systemctl
# is-active, caddy adapt to /dev/null), prints every step a real run would
# take, and exits 0 only if all preconditions hold.
#
# Read it before running it: it runs with root privileges.
# Rollback later, by hand: see docs/DEPLOY.md.
set -euo pipefail
umask 022

# --- arguments (first, before any other step) --------------------------------
DRY_RUN=0
STAGE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --stage-dir)
      # Only for rehearsing a local release directory (docs/GO-LIVE.md).
      [[ $# -ge 2 ]] || { echo "ERROR: --stage-dir needs a directory" >&2; exit 2; }
      STAGE="$2"
      shift
      ;;
    *) echo "ERROR: unknown argument: $1 (usage: [--dry-run [--stage-dir <dir>]])" >&2; exit 2 ;;
  esac
  shift
done
if [[ -n "${STAGE}" && ${DRY_RUN} -eq 0 ]]; then
  echo "ERROR: --stage-dir is only allowed with --dry-run; a real run uses the staged copy of this script" >&2
  exit 2
fi
[[ -n "${STAGE}" ]] || STAGE="$(dirname "${BASH_SOURCE[0]}")"
STAGE="$(cd "${STAGE}" && pwd)"

CADDYFILE=/etc/caddy/Caddyfile
BACKUP_DIR=/etc/caddy/backups
SITE_HOST=timurmanjosov.com
AURA_HOST=aura.timurmanjosov.com
MARK_BEGIN="# BEGIN timurmanjosov.com"
ID="$(basename "${STAGE}")"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

log() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
plan() { printf '  [plan] %s\n' "$*"; }

# --- preconditions (shared by --dry-run and the real run; read-only) --------
PROBLEMS=0
problem() {
  printf '  PROBLEM: %s\n' "$*" >&2
  PROBLEMS=$((PROBLEMS + 1))
}

log "release ${ID} in ${STAGE}"
[[ "${ID}" =~ ^[0-9]{8}T[0-9]{6}Z-[0-9a-f]+$ ]] || problem "unexpected staging directory name: ${ID}"

# A release built from test data (deploy/build-release.sh --test-only) must
# never go live, not even by accident.
[[ ! -e "${STAGE}/TEST-ONLY" ]] || problem "this is a TEST-ONLY release (test values inside); it can never be applied"

for tool in caddy curl tar sha256sum systemctl runuser getent cmp awk; do
  command -v "${tool}" >/dev/null || problem "missing tool: ${tool}"
done

log "verifying checksums"
if [[ -f "${STAGE}/SHA256SUMS" ]]; then
  (cd "${STAGE}" && sha256sum --quiet -c SHA256SUMS) || problem "checksum mismatch"
  for f in site.tar.gz Caddyfile.proposed Caddyfile.at-staging redirects.tsv expected-headers.tsv \
    language-door.tsv apply-on-server.sh; do
    grep -q " ${f}\$" "${STAGE}/SHA256SUMS" || problem "${f} is not covered by SHA256SUMS"
  done
else
  problem "${STAGE}/SHA256SUMS missing (not a staged release)"
fi

log "checking the build archive"
if [[ -f "${STAGE}/site.tar.gz" ]]; then
  listing="$(tar -tzf "${STAGE}/site.tar.gz" 2>/dev/null || true)"
  for f in index.html lang-redirect.js 404.html de/index.html en/index.html de/404/index.html en/404/index.html sitemap.xml; do
    grep -qxF "./${f}" <<<"${listing}" || problem "build is incomplete: ${f} missing"
  done
  if grep -q 'example\.invalid' <(tar -xzOf "${STAGE}/site.tar.gz" 2>/dev/null || true); then
    problem "the build contains test values (example.invalid)"
  fi
else
  problem "site.tar.gz missing"
fi

# The web root comes from the generated block of the proposal.
SITE_DIR=""
if [[ -f "${STAGE}/Caddyfile.proposed" ]]; then
  site_root="$(awk -v mark="${MARK_BEGIN}" 'index($0, mark) == 1 { inblock = 1 }
    inblock && $1 == "root" && $2 == "*" { print $3; exit }' "${STAGE}/Caddyfile.proposed")"
  if [[ "${site_root}" =~ ^/[A-Za-z0-9._/-]+/current$ && "${site_root}" != *..* ]]; then
    SITE_DIR="${site_root%/current}"
    log "web root (from Caddyfile.proposed): ${SITE_DIR}"
  else
    problem "no usable 'root * <dir>/current' in the generated block of Caddyfile.proposed"
  fi
else
  problem "Caddyfile.proposed missing"
fi
RELEASES="${SITE_DIR}/releases"
TARGET="${RELEASES}/${ID}"

log "checking the server state"
if [[ -r "${CADDYFILE}" ]]; then
  # The proposal was generated from the Caddyfile as it was at staging time.
  # If someone changed the live file since, the proposal would silently
  # undo that change: refuse, and ask for a fresh deploy/stage.sh run.
  cmp -s "${STAGE}/Caddyfile.at-staging" "${CADDYFILE}" ||
    problem "${CADDYFILE} changed since staging; run deploy/stage.sh again"
else
  problem "${CADDYFILE} not readable"
fi
if [[ -n "${SITE_DIR}" ]]; then
  [[ -d "${SITE_DIR}" ]] || problem "web root ${SITE_DIR} does not exist"
  [[ ! -e "${TARGET}" ]] || problem "${TARGET} already exists (release applied before?)"
  if [[ -L "${SITE_DIR}/current" ]]; then
    log "current -> $(readlink "${SITE_DIR}/current") (symlink)"
  elif [[ -d "${SITE_DIR}/current" ]]; then
    log "current is a directory (legacy layout; will be kept as releases/legacy-${STAMP})"
  else
    log "current does not exist yet (first release)"
  fi
fi
systemctl is-active --quiet caddy || problem "caddy service is not active"
if command -v caddy >/dev/null && [[ -f "${STAGE}/Caddyfile.proposed" ]]; then
  # adapt only parses; unlike validate it touches no storage and needs no root.
  caddy adapt --adapter caddyfile --config "${STAGE}/Caddyfile.proposed" >/dev/null 2>&1 ||
    problem "caddy adapt rejects Caddyfile.proposed"
fi

if [[ ${DRY_RUN} -eq 1 ]]; then
  echo
  log "dry run: a real run (sudo) would now"
  plan "record status + security headers of https://${AURA_HOST}/"
  plan "unpack site.tar.gz into ${SITE_DIR:-<web root>}/releases/${ID} (root:root, dirs 755, files 644)"
  plan "back up ${CADDYFILE} to ${BACKUP_DIR}/Caddyfile.<UTC timestamp>"
  if cmp -s "${STAGE}/Caddyfile.proposed" "${STAGE}/Caddyfile.at-staging"; then
    plan "leave ${CADDYFILE} unchanged (proposal identical)"
  else
    plan "validate Caddyfile.proposed as user caddy, install it as ${CADDYFILE} (root:root 644)"
  fi
  plan "switch ${SITE_DIR:-<web root>}/current -> releases/${ID} (atomic rename)"
  plan "systemctl reload caddy (never restart)"
  plan "smoke tests: pages, language door ($(grep -c . "${STAGE}/language-door.tsv" 2>/dev/null || echo 0) Accept-Language cases), $(grep -c . "${STAGE}/redirects.tsv" 2>/dev/null || echo 0) redirects, headers, 404s, caching, Aura unchanged"
  plan "on any failure: restore symlink + Caddyfile, reload, exit 1"
  echo
  if [[ ${PROBLEMS} -gt 0 ]]; then
    echo "dry run: ${PROBLEMS} problem(s) above; a real run would stop before changing anything." >&2
    exit 1
  fi
  echo "dry run: all preconditions hold. Nothing was changed."
  exit 0
fi

# --- real run -----------------------------------------------------------------
[[ ${EUID} -eq 0 ]] || die "run with sudo (or use --dry-run)"
[[ ${PROBLEMS} -eq 0 ]] || die "${PROBLEMS} precondition(s) failed, nothing changed"
WORK="$(mktemp -d)"

# All requests go to this machine, independent of DNS.
CURL=(curl -sS --max-time 15 --resolve "${SITE_HOST}:443:127.0.0.1" --resolve "www.${SITE_HOST}:443:127.0.0.1"
  --resolve "${AURA_HOST}:443:127.0.0.1")

# Security-relevant response headers (name: value), lower-cased names, sorted.
security_headers() {
  "${CURL[@]}" -o /dev/null -D - "$1" | tr -d '\r' |
    grep -iE '^(content-security-policy|strict-transport-security|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|x-robots-tag|cross-origin-[a-z-]+|access-control-allow-origin):' |
    awk -F': ' '{ printf "%s: %s\n", tolower($1), substr($0, index($0, ": ") + 2) }' | sort
}
status_of() { "${CURL[@]}" -o /dev/null -w '%{http_code}' "$1"; }

# --- 2. baseline of the neighbour site --------------------------------------
log "recording baseline of https://${AURA_HOST}/"
AURA_STATUS_BEFORE="$(status_of "https://${AURA_HOST}/" || echo 000)"
security_headers "https://${AURA_HOST}/" >"${WORK}/aura.before" || true

# --- 3. unpack the release ----------------------------------------------------
log "unpacking into ${TARGET}"
mkdir -p "${RELEASES}"
tar -xzf "${STAGE}/site.tar.gz" --no-same-owner --no-same-permissions -C "${WORK}" --one-top-level=site
# Releases are owned by root and read-only for everyone else: Caddy only
# needs to read them, and the SSH user cannot modify what is served.
chown -R root:root "${WORK}/site"
find "${WORK}/site" -type d -exec chmod 755 {} +
find "${WORK}/site" -type f -exec chmod 644 {} +
mv "${WORK}/site" "${TARGET}"

# --- 4. back up + validate the Caddyfile --------------------------------------
mkdir -p "${BACKUP_DIR}"
BACKUP="${BACKUP_DIR}/Caddyfile.${STAMP}"
cp -p "${CADDYFILE}" "${BACKUP}"
log "Caddyfile backed up to ${BACKUP}"

CADDY_CHANGED=0
if ! cmp -s "${STAGE}/Caddyfile.proposed" "${CADDYFILE}"; then
  CADDY_CHANGED=1
  # Same directory as the live file, so the later mv is atomic and relative
  # imports in the Caddyfile resolve the same way.
  install -o root -g root -m 644 "${STAGE}/Caddyfile.proposed" "${CADDYFILE}.new"
  CADDY_HOME="$(getent passwd caddy | cut -d: -f6)"
  [[ -n "${CADDY_HOME}" ]] || die "system user caddy not found"
  log "validating the proposed Caddyfile as user caddy"
  # As the service user with its own HOME: validate provisions modules and may
  # touch Caddy's storage; run as root it could create root-owned files there.
  if ! (cd /tmp && runuser -u caddy -- env HOME="${CADDY_HOME}" \
    caddy validate --adapter caddyfile --config "${CADDYFILE}.new"); then
    rm -f "${CADDYFILE}.new"
    rm -rf "${TARGET}"
    die "caddy validate failed; nothing changed (release directory removed)"
  fi
fi

# --- 5. switch -------------------------------------------------------------
# Remember what `current` was, for the rollback.
OLD_CURRENT=""
if [[ -L "${SITE_DIR}/current" ]]; then
  OLD_CURRENT="$(readlink "${SITE_DIR}/current")"
elif [[ -d "${SITE_DIR}/current" ]]; then
  # Legacy layout: `current` is a real directory. Keep it as a release so
  # the rollback can point back at it.
  OLD_CURRENT="releases/legacy-${STAMP}"
  log "migrating directory ${SITE_DIR}/current to ${SITE_DIR}/${OLD_CURRENT}"
  ln -sfn "${OLD_CURRENT}" "${SITE_DIR}/current.next"
  mv "${SITE_DIR}/current" "${SITE_DIR}/${OLD_CURRENT}"
  mv -T "${SITE_DIR}/current.next" "${SITE_DIR}/current"
fi

# From here on, any exit that does not reach the end of the script (set -e,
# a failed check, Ctrl-C) rolls back. An EXIT trap rather than ERR: it fires
# exactly once, in the main shell, also for failures inside functions, and
# is not inherited by $(...) subshells.
DONE=0
on_exit() {
  local code=$?
  [[ ${DONE} -eq 1 ]] && return
  trap - EXIT
  printf '\nERROR during go-live (exit %s). Rolling back.\n' "${code}" >&2
  if [[ -n "${OLD_CURRENT}" ]]; then
    ln -sfn "${OLD_CURRENT}" "${SITE_DIR}/current.next"
    mv -T "${SITE_DIR}/current.next" "${SITE_DIR}/current"
    echo "  current -> ${OLD_CURRENT}" >&2
  fi
  if [[ ${CADDY_CHANGED} -eq 1 ]]; then
    cp -p "${BACKUP}" "${CADDYFILE}"
    rm -f "${CADDYFILE}.new"
    echo "  ${CADDYFILE} restored from ${BACKUP}" >&2
  fi
  systemctl reload caddy || echo "  WARNING: caddy reload failed, check: systemctl status caddy" >&2
  echo "  aura after rollback: HTTP $(status_of "https://${AURA_HOST}/" || echo 000)" >&2
  echo "  release left in ${TARGET} for inspection (delete when done)." >&2
  exit 1
}
trap on_exit EXIT
trap 'exit 130' INT TERM

fail() { echo "  FAIL: $*" >&2; FAILURES=$((FAILURES + 1)); }

log "switching current -> releases/${ID}"
ln -sfn "releases/${ID}" "${SITE_DIR}/current.next"
mv -T "${SITE_DIR}/current.next" "${SITE_DIR}/current"

if [[ ${CADDY_CHANGED} -eq 1 ]]; then
  log "installing the new Caddyfile"
  mv -f "${CADDYFILE}.new" "${CADDYFILE}"
fi
log "reloading Caddy"
systemctl reload caddy
systemctl is-active --quiet caddy
sleep 1

# --- 6. smoke tests ----------------------------------------------------------
log "smoke tests"
FAILURES=0
S="https://${SITE_HOST}"

expect_status() { # url status [body-substring]
  local body code
  body="$("${CURL[@]}" -o - -w '\n%{http_code}' "$1")" || { fail "$1: request failed"; return; }
  code="${body##*$'\n'}"
  [[ "${code}" == "$2" ]] || fail "$1: HTTP ${code}, expected $2"
  if [[ -n "${3:-}" && "${body}" != *"$3"* ]]; then fail "$1: body lacks '$3'"; fi
}

expect_status "${S}/de/" 200 '<html lang="de"'
expect_status "${S}/en/" 200 '<html lang="en"'
expect_status "${S}/de/blog/" 200 '<html lang="de"'
expect_status "${S}/en/blog/" 200 '<html lang="en"'
expect_status "${S}/en/projects/" 200
expect_status "${S}/de/feed.xml" 200 '<rss'
expect_status "${S}/en/feed.xml" 200 '<rss'
expect_status "${S}/sitemap.xml" 200 '<urlset'
expect_status "${S}/robots.txt" 200 'Sitemap:'
expect_status "${S}/llms.txt" 200 'Timur Manjosov'
expect_status "${S}/lang-redirect.js" 200 'location.replace'
expect_status "${S}/de/gibt-es-nicht-${STAMP}/" 404 '<html lang="de"'
expect_status "${S}/en/does-not-exist-${STAMP}/" 404 '<html lang="en"'
expect_status "${S}/does-not-exist-${STAMP}" 404 'Seite nicht gefunden'

# Language door: "/" answers by the first Accept-Language entry, with Vary
# and no caching (language-door.tsv: value or "-" for none, expected target).
while IFS=$'\t' read -r al to; do
  [[ -n "${al}" ]] || continue
  hdr=()
  [[ "${al}" == "-" ]] || hdr=(-H "Accept-Language: ${al}")
  head="$("${CURL[@]}" "${hdr[@]}" -o /dev/null -D - "${S}/" | tr -d '\r')"
  grep -q '^HTTP/[0-9.]* 302' <<<"${head}" || fail "door [${al}]: not 302"
  grep -qixF "location: ${to}" <<<"${head}" || fail "door [${al}]: Location is not ${to}"
  grep -qix 'vary: .*accept-language.*' <<<"${head}" || fail "door [${al}]: no Vary: Accept-Language"
  grep -qixF 'cache-control: no-store' <<<"${head}" || fail "door [${al}]: Cache-Control is not no-store"
done <"${STAGE}/language-door.tsv"
# …and nothing below /de/ or /en/ ever redirects by language.
for path in /de/ /en/ /de/about/ /en/about/; do
  for al in "de-DE,de;q=0.9" "en-US,en;q=0.9"; do
    [[ "$("${CURL[@]}" -H "Accept-Language: ${al}" -o /dev/null -w '%{http_code}' "${S}${path}")" == 200 ]] ||
      fail "${path} with Accept-Language ${al} is not 200"
  done
done

# www → apex
loc="$("${CURL[@]}" -o /dev/null -w '%{http_code} %{redirect_url}' "https://www.${SITE_HOST}/en/about/")"
[[ "${loc}" == "308 ${S}/en/about/" ]] || fail "www redirect: got '${loc}'"

# Every entry of the redirect table: status, location, and the target works
# ("/" is the language door, so its target answers 302).
while IFS=$'\t' read -r from to code; do
  [[ -n "${from}" ]] || continue
  got="$("${CURL[@]}" -o /dev/null -w '%{http_code} %{redirect_url}' "${S}${from}")"
  [[ "${got}" == "${code} ${S}${to}" ]] || fail "redirect ${from}: got '${got}', expected '${code} ${S}${to}'"
  want=200
  [[ "${to}" == "/" ]] && want=302
  [[ "$(status_of "${S}${to}")" == "${want}" ]] || fail "redirect target ${to} is not ${want}"
done <"${STAGE}/redirects.tsv"

# Security headers, exact values, on a normal page, a 404 page and the door.
for url in "${S}/en/" "${S}/de/does-not-exist-${STAMP}/" "${S}/"; do
  headers="$(security_headers "${url}" || true)"
  while IFS=$'\t' read -r name value; do
    [[ -n "${name}" ]] || continue
    want="$(printf '%s: %s' "${name,,}" "${value}")"
    grep -qxF "${want}" <<<"${headers}" || fail "${url}: header ${name} missing or different"
  done <"${STAGE}/expected-headers.tsv"
done

# Caching: hashed assets immutable, HTML revalidated.
asset="$("${CURL[@]}" "${S}/en/" | grep -o '/_astro/[^"]*\.css' | head -n 1 || true)"
if [[ -z "${asset}" ]]; then
  fail "no /_astro/*.css referenced on /en/"
else
  "${CURL[@]}" -o /dev/null -D - "${S}${asset}" | tr -d '\r' | grep -qi '^cache-control: public, max-age=31536000, immutable$' ||
    fail "${asset}: not cached as immutable"
fi
"${CURL[@]}" -o /dev/null -D - "${S}/en/" | tr -d '\r' | grep -qi '^cache-control: public, max-age=0, must-revalidate$' ||
  fail "/en/: HTML Cache-Control unexpected"

# Neighbour site unchanged.
AURA_STATUS_AFTER="$(status_of "https://${AURA_HOST}/" || echo 000)"
security_headers "https://${AURA_HOST}/" >"${WORK}/aura.after" || true
[[ "${AURA_STATUS_AFTER}" == "${AURA_STATUS_BEFORE}" ]] ||
  fail "aura: HTTP ${AURA_STATUS_BEFORE} before, ${AURA_STATUS_AFTER} after"
diff -u "${WORK}/aura.before" "${WORK}/aura.after" >&2 || fail "aura: security headers differ from the baseline"

if [[ ${FAILURES} -gt 0 ]]; then
  echo "${FAILURES} smoke test(s) failed." >&2
  exit 1 # → on_exit → rollback
fi

DONE=1
trap - EXIT
rm -rf "${WORK}"
log "live: ${SITE_DIR}/current -> releases/${ID}"
log "previous: ${OLD_CURRENT:-none}; Caddyfile backup: ${BACKUP}"
echo "Manual rollback: docs/DEPLOY.md, section 'Rollback'."
