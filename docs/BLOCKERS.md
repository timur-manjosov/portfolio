# Blockers

Things that could not be done in the unattended runs, why, and what to do
instead. Nothing here was worked around (no attempts to bypass a block).

# Revision 2 (2026-10-27/28)

## R2-B1. Server details in commits that already exist (needs your decision)

The hygiene scan (brief R2 §2.4: all tracked files plus `git log -p
pre-redesign..HEAD`, patterns for e-mail addresses, phone numbers, IPv4/6,
host names, server paths, server user names, tokens and keys) found the
following. Values are deliberately not repeated here.

**Removed from the current tracked files in this revision** (placeholders
instead):
- the **web root path** of the site on the VPS (in `CONTENT-TODO.md`,
  `docs/DEPLOY.md`, `docs/AUDIT.md`, `docs/DECISIONS.md`,
  `docs/history/MIGRATION-11ty.md`),
- the **SSH host alias** of the VPS (`docs/history/MIGRATION-11ty.md`),
- the **user name** that owns the web root on the server
  (`docs/AUDIT.md`, `docs/DEPLOY.md`),
- the **Caddy version** and the **OS name** of the server (`docs/AUDIT.md`,
  `docs/DEPLOY.md`, `docs/adr/0001-stack.md`),
- a plausible-looking address at the site's own domain used as a
  placeholder in a `gpg` example (`docs/DEPLOY.md`).

**Still in the history** (not rewritten, as the brief demands):
- web root path: added or changed in `47b0c25`, `3b4651a`, `70e8f0f`,
  `08cd19e`, `04b025d`, `0b52f10` (and in the history doc, which already
  existed before `pre-redesign`, i.e. in commits already on GitHub),
- SSH host alias: introduced before `pre-redesign` (`957949d`, already on
  GitHub), still present in `ship.sh` until `0b52f10` removed it,
- server user name and Caddy version: `47b0c25` (`docs/AUDIT.md`).
- **Commit metadata:** all 32 commits of the repository, including the 11
  on this branch, carry the same author e-mail address of your git
  configuration. It is a
  different address from the one in your Claude account. If it should not
  be public, set `git config user.email` to a GitHub `noreply` address
  before pushing; rewriting existing commits would be your decision.

**Assessment:** none of these is a secret in the sense of an access
credential. The path, alias and user name make reconnaissance slightly
easier but grant nothing on their own (SSH is key-based, the alias only
resolves in your `~/.ssh/config`). Options: (a) accept; (b) before the
first push of `redesign`, squash the branch into one commit on top of
`pre-redesign` (`git reset --soft pre-redesign && git commit`; only the
branch, `main` is untouched); (c) for the parts already on GitHub before
`pre-redesign`, only a history rewrite of `main` would help, which breaks
existing clones and PR references. My recommendation: (b) if you care, else
(a).

**Not found:** phone numbers, IP addresses (only `127.0.0.1` and false
positives in an SVG path), tokens, private keys, the real private values
(the leak check `npm run check:private` covers those on every run).
Intentional and public: "Netcup" as hoster in the privacy policy (brief R2
§2.6), `/etc/caddy/Caddyfile` (Caddy's documented default path, needed by
the scripts), test addresses under `example.invalid`.

## R2-B2. Caddy syntax of the proposal not validated locally

No `caddy` binary is installed locally, and this revision may not upload
anything to the server. The generator's structural checks ran against the
real Caddyfile (`docs/VERIFICATION.md` R2 §6). The syntax check
(`caddy adapt`) happens in `deploy/stage.sh` and again in
`apply-on-server.sh --dry-run`, both on the server (`docs/GO-LIVE.md`
steps 4 and 6).

## Status of the blockers from the first run
- **B1** (no SSH target): resolved for reading. Revision 2 got the alias
  as a run parameter; the live Caddyfile was read read-only and the
  generator ran against it. Staging stays your step.
- **B2** (no Chromium): resolved, a system Chromium is installed. Browser
  suite, screenshots and Lighthouse ran with it (`docs/VERIFICATION.md` R2).
- **B3** (shell scripts): resolved. `deploy/build-release.sh` ran for real
  in test-only mode and `apply-on-server.sh --dry-run` locally.
- **B4** (lychee), **B5** (CI): unchanged.

---

# First run (2026-10-27)

## B1. Phase 6 (server staging) skipped: SSH target not readable

- **What:** reading `VPS_SSH_TARGET` (`echo $VPS_SSH_TARGET`, `printenv
  VPS_SSH_TARGET`) was denied by the session's permission system. Commands
  that need approval are denied automatically in this unattended session.
  Without the target there is no SSH connection. Guessing a host alias
  instead would contradict the brief ("the target is in `VPS_SSH_TARGET`").
- **Consequence:** nothing was read from or written to the server in this
  run. The live site and Aura are untouched. `~/deploy-staging/` was not
  created. There is no `deploy/Caddyfile.proposed` based on the real live
  file yet, and so no `diff` evidence against it.
- **What exists instead:** the complete tooling, tested against a fixture
  shaped like the live config (`tools/fixtures/Caddyfile.sample`, modelled
  on the read-only server check of 2026-10-26 in `docs/AUDIT.md` §8):
  - `tools/caddy-site-block.mjs propose` replaces only the
    `timurmanjosov.com, www.timurmanjosov.com` block, proves byte identity
    of everything else, and refuses weaker headers or dropped directives
    (positive and negative tests: `docs/VERIFICATION.md` §8).
  - `deploy/stage.sh <target>` fetches the live Caddyfile read-only,
    generates and checks the proposal, uploads everything to
    `~/deploy-staging/<id>/` and runs `caddy adapt` there without sudo.
  - `deploy/apply-on-server.sh` (run by Timur with sudo).
- **To finish Phase 6:** `deploy/build-release.sh && deploy/stage.sh
  "$VPS_SSH_TARGET"`, see `docs/DEPLOY.md` §2. The stage script prints the
  `diff` result ("outside the block: byte-identical") and keeps
  `release/<id>/Caddyfile.diff` for review.

## B2. No Chromium: Playwright suite and Lighthouse not run locally

- **What:** Playwright's Chromium is not installed (Playwright: "Executable
  doesn't exist at ~/.cache/ms-playwright/chromium_headless_shell-1248/…"). Installing it was denied (needs approval). Installing it to the
  default location would also write outside the repo (brief §5). No system
  Chromium/Chrome exists. Firefox is installed, but Playwright needs its own
  patched build.
- **Consequence:** `tools/check-browser.mjs` (axe in a real browser in light
  and dark mode, overflow at 320–1280 px, no-JS rendering, third-party
  requests, cookies, theme toggle, language switcher, filter, search, feeds,
  redirects) is written but **not executed**. No Lighthouse score exists.
- **Replacement measurements that did run:** axe-core in jsdom on all 46 + 71
  pages (structural rules), WCAG contrast of all 34 colour pairs computed
  from the tokens, html-validate, page weight and request count
  (`tools/page-weight.mjs`), CSP/third-party scan of the HTML. See
  `docs/VERIFICATION.md`.
- **To finish:** `npx playwright install chromium && npm run check:browser`
  locally, or push the branch and let CI run it (the workflow installs
  Chromium itself). For Lighthouse: `npx lighthouse http://127.0.0.1:4321/en/
  --preset=desktop` / mobile against `npm run serve`.

## B3. Shell scripts and `tar` could not be executed locally

- **What:** running `bash deploy/build-release.sh` and the `tar` commands it
  contains was denied (needs approval).
- **Consequence:** the release scripts were checked statically only
  (ShellCheck 0.11: no findings for `ship.sh` and `deploy/*.sh`). Their Node
  parts did run (`caddy-site-block.mjs propose|example|smoke-data`). The
  first real run of `deploy/build-release.sh` is Timur's, and so is the first
  run of `apply-on-server.sh`, which only ever runs on the server anyway.

## B4. External link check (lychee) not run locally

- **What:** lychee is not installed. Installing tools system-wide is outside
  the repo.
- **Consequence:** internal links are checked offline (all resolve). The 10
  distinct external links in the production build (GitHub repos/profile,
  FernUni, Astro, Caddy, nownownow.com, aura subdomain) are checked by the CI
  step `lycheeverse/lychee-action`.

## B5. CI not run

The branch is not pushed (brief §0), so GitHub Actions has not run the
workflow. Everything in `npm run check` was run locally and passed (see
VERIFICATION). The browser, ShellCheck, `caddy adapt` (Docker) and lychee
steps run only in CI.
