# Deploying timurmanjosov.com

How a new build gets from this repo onto the VPS, how to switch it live, how
to check it and how to roll back. The short version for the first go-live is
`docs/GO-LIVE.md`. This file has the details.

This repository is public, so it contains no server paths, account names or
host names. Where a command needs one, it is written as a placeholder:

| Placeholder | Meaning | Where to find it |
|---|---|---|
| `<ssh-target>` | SSH alias or `user@host` of the VPS | your `~/.ssh/config` |
| `<web root>` | directory that holds `current` and `releases/` | the `root * <web root>/current` line of the site block in the live Caddyfile; `apply-on-server.sh` prints it |
| `<id>` | release id, `YYYYMMDDTHHMMSSZ-<commit>` | `release/LATEST` |

> **Status (2026-10-28, revision 4):** nothing has been staged on the server.
> The real Caddyfile was read once in revision 2 (read-only), the generator
> ran against it; revisions 3 and 4 changed neither the Caddy generator
> nor the deploy scripts. The release pipeline was rehearsed again with the
> test file (`--test-only`, refused for staging) and `--dry-run`
> (`docs/VERIFICATION.md` R4 §4). The live site is still the old Eleventy
> build. Push the source first (`docs/GO-LIVE.md` step 3), then deploy.
> Revision 5 (2026-10-30) added `npm run publish` for later content updates
> (§7); the go-live chain itself is unchanged except `build-release.sh
> --github-meta`. Tested against a local web root only.

## 1. Overview

```
laptop                                   VPS (Caddy on the host)
──────                                   ───────────────────────
deploy/build-release.sh --private <f>
  npm ci, npm run check, release build,
  tar + sha256
deploy/stage.sh <ssh-target> ── ssh/scp ─▶ ~/deploy-staging/<id>/   (SSH user)
  reads the live Caddyfile (read-only)     site.tar.gz, SHA256SUMS,
  builds Caddyfile.proposed                Caddyfile.proposed, apply-on-server.sh …
  caddy adapt on the server
                                         bash …/apply-on-server.sh --dry-run   (no sudo)
                                         sudo bash …/apply-on-server.sh
                                           → <web root>/releases/<id>/
                                           → current -> releases/<id> (symlink)
                                           → Caddyfile (+ backup), reload
                                           → smoke tests, automatic rollback
```

- Nothing is built on the server any more (no Node, no Docker for the site).
- Caddy's `root` stays `<web root>/current`. Only the symlink target changes.
- `./ship.sh <ssh-target> [--private <file>]` chains build → stage → (asks)
  → dry run → apply.

## 2. Building a release

```sh
deploy/build-release.sh --private private/site.private.yaml
```

1. Refuses a dirty working tree (the id must name a real commit).
2. `npm ci` and the full `npm run check` (public mode, including the leak
   check of the private file against all tracked files).
3. `npm run build:release -- --private <file>`: needs `contact.email` and
   `legal.controller`, refuses `example.invalid` test values and any
   visible `TODO(` marker in the output, warns (does not fail) with the
   number of pages still marked `draft-review`.
4. Packs `dist/` into `release/<id>/site.tar.gz` together with the smoke
   test tables (`redirects.tsv`, `expected-headers.tsv`,
   `language-door.tsv`), `apply-on-server.sh` and `SHA256SUMS`.

`--test-only` rehearses the same pipeline with a test file (for example
`private/site.private.test.yaml`). Such a release is marked `TEST-ONLY`,
does not update `release/LATEST`, and is refused by `stage.sh` and by
`apply-on-server.sh` (also with `--dry-run`, which reports it as a problem).

## 3. Staging

```sh
deploy/stage.sh <ssh-target>
```

Reads the live Caddyfile over SSH (read-only), runs
`tools/caddy-site-block.mjs propose` on it and uploads the release to
`~/deploy-staging/<id>/` of the SSH user. It prints:

- `outside the block: byte-identical`: everything except the
  `timurmanjosov.com, www.timurmanjosov.com` block, including the whole
  `aura.timurmanjosov.com` block, is unchanged byte for byte. Otherwise it
  aborts.
- the security header comparison (`note: … (stricter)`; it aborts on
  anything weaker or on a missing directive of the old block),
- `caddy adapt: OK` (syntax check on the server, no sudo).

Review the Caddyfile change before applying it:

```sh
less release/<id>/Caddyfile.diff
```

The generated block also contains the language rule for `/` (§9).

## 4. Dry run, then going live

Read `deploy/apply-on-server.sh` first. It runs as root. Then, on the
server:

```sh
bash ~/deploy-staging/<id>/apply-on-server.sh --dry-run
```

`--dry-run` is evaluated before anything else, needs no sudo and only uses
reading commands (`sha256sum -c`, `tar -t`, `cmp`, `stat`,
`systemctl is-active`, `caddy adapt` to `/dev/null`). It prints every step a
real run would take and exits 0 only if all preconditions hold. Then:

```sh
sudo bash ~/deploy-staging/<id>/apply-on-server.sh
```

The real run:
1. verifies all checksums and refuses if the live Caddyfile changed since
   staging (then run `deploy/stage.sh` again),
2. records Aura's status and security headers,
3. unpacks to `<web root>/releases/<id>/` (root-owned, read-only),
4. backs up the Caddyfile next to it (`backups/Caddyfile.<timestamp>` in
   Caddy's config directory) and validates the new one with
   `caddy validate` as the `caddy` user,
5. flips `current` atomically, installs the Caddyfile, `systemctl reload
   caddy` (never restart or stop),
6. runs the smoke tests (§5),
7. rolls everything back automatically on any failure and exits non-zero.

On the very first run, `current` points to the old Eleventy build slot,
which becomes the rollback target. If `current` were a real directory, the
script moves it to `releases/legacy-<timestamp>` first and logs that.

## 5. Checks after going live

The script already checks these. Repeat them by hand if in doubt:

```sh
curl -sI -H 'Accept-Language: de-DE,de;q=0.9' https://timurmanjosov.com/   # 302 → /de/, Vary, no-store
curl -sI -H 'Accept-Language: en-US,en;q=0.9' https://timurmanjosov.com/   # 302 → /en/
curl -sI https://timurmanjosov.com/                    # 302 → /en/ (no header)
curl -sI https://timurmanjosov.com/de/                 # 200, never a redirect
curl -s  https://timurmanjosov.com/de/ | grep -o '<html lang="de"'
curl -sI https://timurmanjosov.com/en/blog/            # 200
curl -s  https://timurmanjosov.com/en/feed.xml | head -c 200
curl -sI https://timurmanjosov.com/de/gibt-es-nicht/   # 404, German page
curl -sI https://timurmanjosov.com/lab/                # 301 → /en/projects/
curl -sI https://www.timurmanjosov.com/en/about/       # 308 → apex
curl -sI https://aura.timurmanjosov.com/               # same status + headers as before
```

What the script tests automatically: the whole `Accept-Language` table
(§9), `/de/` and `/en/` without redirect, both blog indexes,
`/en/projects/`, both feeds, sitemap, robots.txt, llms.txt, three kinds of
404 (status and language), www → apex, every redirect of the table
(status, target, target answers 200), the exact security headers on a page
and on a 404, caching of `/_astro/*` and HTML, and Aura's status and
security headers unchanged.

In a browser: dark/light toggle, language switch, search, a project page.

## 6. Rollback

**Automatic:** any failure in `apply-on-server.sh` after the switch restores
symlink and Caddyfile and reloads.

**Manual**, e.g. a problem noticed hours later (paths: see the
placeholder table; the apply script printed both the web root and the
backup file name):

```sh
cd <web root>
ls -1 releases/                     # pick the previous id (or the old build slot)
readlink current                    # what is live now

# 1. content back (atomic)
sudo ln -sfn releases/<previous-id> current.next
sudo mv -T current.next current

# 2. Caddyfile back (only needed if the Caddy config changed)
sudo cp -p <backup file printed by apply-on-server.sh> /etc/caddy/Caddyfile
sudo systemctl reload caddy

# 3. check
curl -sI https://timurmanjosov.com/en/ | head -n 5
curl -sI https://aura.timurmanjosov.com/ | head -n 1
```

The old Eleventy build expects the **old** Caddyfile (its inline script
hash). When rolling back to it, restore the Caddyfile backup too.
Otherwise the theme script is CSP-blocked (only a flash of the wrong theme,
no outage).

## 7. Later releases and housekeeping

**Content updates** (posts, /now, projects, About): `npm run publish`
(`docs/PUBLISHING.md`). It builds with `build-release.sh`, uploads only the
archive to `~/deploy-staging/publish/<id>/`, and `deploy/publish-on-server.sh`
(one `sudo`) unpacks it into `releases/<id>/`, switches `current`, checks
over HTTP and switches back on failure. It never writes the Caddyfile and
never reloads Caddy, and refuses if the Caddy block would change. It keeps
the newest 5 published releases (`releases/HISTORY`) and never deletes
`releases/legacy-*`. `npm run publish -- --rollback` goes back one.

**Changes to headers, redirects or caching** still go through:

```sh
./ship.sh <ssh-target>    # build-release + stage + "Go live now? [y/N]" + dry run + apply
```

If the Caddy block did not change, `apply-on-server.sh` notices it
(byte-equal) and only flips the symlink and reloads. A release put live
this way counts as the newest one for `publish --rollback`.

Clean up old releases from time to time (keep the last few):
```sh
ls -1dt <web root>/releases/* | tail -n +6   # review first
```
and `~/deploy-staging/` (plain user files).

Once you no longer want to roll back to the Eleventy site, its two build
slots, the bootstrap snapshot, the old server-side `deploy.sh` and the git
checkout in the web root are unused and can be removed. Keep `releases/`
and `current`.

## 8. Changing headers, redirects, caching

Never edit the site block in the live Caddyfile by hand: the next
`stage.sh` would replace it.

1. Edit `deploy/site-config.json` (headers, redirect table, language rule)
   or `tools/caddy-site-block.mjs` (structure, caching, 404 handling).
2. `npm run caddy:example` → review `deploy/Caddyfile.example`, commit.
3. `npm run check`. `tools/serve.mjs` and `tools/check-http.mjs` use the
   same JSON, so redirects, headers and the language rule are tested
   locally.
4. Ship as in §7.

The generator refuses a proposal where a header got weaker, a CSP directive
disappeared or a directive of the old block is missing. If you **want**
that (e.g. to add access logging), change the generator, not the live file,
and update the privacy policy in the same commit.

## 9. Language rule on `/`

`/` answers **302** to `/de/` when the **first** entry of `Accept-Language`
is German (`de`, `de-DE`, `de-AT`, `de-CH`, any case), otherwise to `/en/`,
with `Vary: Accept-Language` and `Cache-Control: no-store`. Nothing else
redirects by language. The rule and its test table live in
`deploy/site-config.json` (`languageDoor`); the default for a missing or
unknown header is the `default` value there (`/en/`, `docs/DECISIONS.md`
R2-D2). Its `$comment` shows the three values to change for a German
default. `/index.html` and `/lang-redirect.js` are the static fallback for
servers without the rule (local preview).

## 10. PGP key via WKD (optional)

Once you have a key and an address at this domain:
```sh
gpg --list-keys --with-wkd-hash <address>   # shows the z-base-32 hash
mkdir -p public/.well-known/openpgpkey/hu
gpg --export <address> > public/.well-known/openpgpkey/hu/<hash>
touch public/.well-known/openpgpkey/policy
```
The Caddy block already sends `Access-Control-Allow-Origin: *` for
`/.well-known/openpgpkey/*`. Test with `gpg --locate-keys --auto-key-locate
clear,wkd <address>`. For an address at another domain, the key file and
fingerprint from the private file (`contact.pgp`) are enough.

## 11. Security notes

- `apply-on-server.sh` runs as root. Read every new version before running
  it, especially when it was not written by you. Run `--dry-run` first.
- Releases are root-owned and read-only, so the SSH user cannot modify
  what is served. The staging copy is verified by checksum right before use.
- `release/`, `private/`, `deploy/Caddyfile.proposed` and
  `deploy/Caddyfile.current` are git-ignored: they contain private data or
  other sites' configuration.
