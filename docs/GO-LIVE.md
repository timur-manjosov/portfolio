# Go-live: the new site in ten steps, then `publish`

For Timur. Run these in order from the repository root on branch
`redesign`. Details, placeholders (`<ssh-target>`, `<web root>`, `<id>`) and
background: `docs/DEPLOY.md`. Nothing here has been run against the server
yet; revision 2 only read the live Caddyfile.

The **first** publication goes through the existing chain below
(build-release → stage → dry run → apply): it changes the Caddyfile and
lays out `<web root>/releases/` + the `current` symlink. **Every later
content update** (posts, /now, projects, About) is one command,
`npm run publish` (step 11, `docs/PUBLISHING.md`); it never changes Caddy.

## 1. Fill in the private file

```sh
cp site.private.example.yaml private/site.private.yaml
$EDITOR private/site.private.yaml
```

| Field | Required | What it does |
|---|---|---|
| `contact.email` | **yes** | address on /contact (entity-encoded) and in `security.txt` |
| `legal.controller.name`, `.email` | **yes** | controller named in the privacy policy |
| `contact.pgp.fingerprint`, `.key_file` | no | fingerprint on /contact, key published as `/pgp-key.asc` (file under `private/`) |
| `accounts[]` (`id`, `label`, `handle`, `url`, `me`) | no | further profiles on /links, /contact, About; `me: true` → `rel="me"` and JSON-LD `sameAs` |
| `legal.imprint` (`name`, `address[]`, `email`, `phone`) | no | imprint page + footer link, only if name, address and e-mail are all set |
| (no field) | no | `private/content/de/about-extra.md`, `private/content/en/about-extra.md`: appended to About when the file exists (R4-D1) |

Paths in the file are relative to `private/`. Do not use `example.invalid`
values: the release build refuses them. Preview locally with
`npm run dev:private`.

## 2. Run the full check

```sh
npm run check
npm run check:browser:system      # real browser, system Chromium
```

Both must be green. `check` includes the leak check: if any value of your
private file appears in a tracked file, it fails and names the field.

## 3. Before the push: one clean commit, then GitHub

The commits on `redesign` since `origin/main` (over 30) must not go to GitHub as
they are: older ones contain the SSH alias and the web root of the server
(`docs/BLOCKERS.md` R2-B1), and every commit carries your private author
e-mail. The fix is a new branch with the same files in **one** commit,
authored with your GitHub noreply address. Nothing is rewritten: `redesign`
stays as it is locally.

**Your noreply address** is `291018608+timur-manjosov@users.noreply.github.com`
(GitHub → Settings → Emails, "Keep my email addresses private" shows it;
the number is your account ID). While you are there, switch on **"Block
command line pushes that expose my email"**: from then on GitHub refuses
any push whose commits carry your private address.

**Base:** what GitHub already has, `origin/main` (after `git fetch
origin`). Only if there is no `origin/main`, the local tag `pre-redesign`.
Every local commit between that base and `redesign` (the early "wip"
commit included) goes into the one squashed commit and is never uploaded
on its own. Author **and** committer are the noreply address.

```sh
npm run check:prepush                 # on redesign: NO-GO (that is the point)
git fetch origin
git status                            # must be clean: commit or stash first
git switch -c redesign-clean redesign
git reset --soft origin/main          # same files, the commits since main undone
git -c user.name="Timur Manjosov" \
    -c user.email="291018608+timur-manjosov@users.noreply.github.com" \
    commit -m "feat: relaunch as an Astro site (redesign, revisions 1-5)"
npm run check:prepush                 # must say GO (exit code 0; NO-GO exits 1)
git diff redesign redesign-clean      # must print nothing (same files)
```

`-c user.email=…` sets author and committer alike. Revision 5 did exactly
this in the real repository: `redesign-clean` exists with one commit
(`docs/FINAL-REPORT.md`, Revision 5). If you change anything on `redesign`
afterwards, delete and recreate it (`git branch -D redesign-clean`, then the
block above).

Only on **GO**:

```sh
git push -u origin redesign-clean:redesign
```

`prompts/push-clean.sh` (run by the start script when `PUSH_AFTER_RUN=1`)
does the same push with its own checks: clean tree, identical trees of
`redesign` and `redesign-clean`, at most five commits to upload, only
noreply addresses, `check:prepush` GO; no force, no tags. Afterwards it
renames locally: `redesign` → `redesign-alt`, `redesign-clean` → `redesign`.

Then open a pull request `redesign` → `main` on GitHub. The CI workflow
(`.github/workflows/check.yml`) runs the full gate and the browser suite on
it, without the private file and without deploying anything; merge when it
is green. Do **not** push tags (`git push --tags` would upload
`pre-redesign`, whose commit contains a tracked `.directory` file), and do
not push the old `redesign` branch.

What `check:prepush` looks at, for every commit between `origin/main` and
`HEAD`, in every added line and every commit message: values from
`private/*.yaml`, IP addresses, web-root and home paths, the literals in
`private/prepush-denylist.txt` (git-ignored, one per line: SSH alias, server
user, host name, web root) and the hosts, host names and users of
`~/.ssh/config` (code hosts like github.com excluded, values that are part
of the public facts skipped), token and key patterns, author and committer
e-mails (only `…@users.noreply.github.com` passes) and files that belong in
`.gitignore`. Findings show commit, file and line with the value masked. It
changes nothing.

This procedure was rehearsed in a throw-away clone (`.tmp/prepush-test`,
with `origin/main` set to GitHub's `77b9333`): NO-GO before, GO after, and
the tree of `redesign-clean` identical to `redesign`
(`docs/VERIFICATION.md` §R4).

To keep working afterwards, continue on `redesign-clean` (or on `main` after
the merge); new commits need the noreply address as well:
`git config user.email 291018608+timur-manjosov@users.noreply.github.com`.

## 4. Build the release

Commit first (a release needs a clean tree), then:

```sh
deploy/build-release.sh --private private/site.private.yaml
```

Ends with `release/<id>/` and `release/LATEST`. It warns how many published
texts are still `draft-review` (not blocking; `CONTENT-TODO.md` §1).

## 5. Stage it on the server

```sh
deploy/stage.sh <ssh-target>
```

Reads the live Caddyfile (read-only), generates the proposal, uploads to
`~/deploy-staging/<id>/` and runs `caddy adapt` there. It must print
`outside the block: byte-identical` and `caddy adapt: OK`.

## 6. Read the Caddyfile change and the apply script

```sh
less release/<id>/Caddyfile.diff
less deploy/apply-on-server.sh
```

The diff touches only the `timurmanjosov.com, www.timurmanjosov.com` block:
new security headers (stricter), caching for `/_astro/`, the language rule
for `/`, the redirect table, the 404 handling. The Aura block must not
appear in the diff.

## 7. Dry run on the server (no sudo)

```sh
ssh <ssh-target> bash deploy-staging/<id>/apply-on-server.sh --dry-run
```

Checks checksums, archive contents, the web root from the proposal, tools,
Caddy status and `caddy adapt`, prints every step of the real run and
changes nothing. It must end with `dry run: all preconditions hold.
Nothing was changed.`

## 8. Go live (the one sudo command)

```sh
ssh -t <ssh-target> sudo bash deploy-staging/<id>/apply-on-server.sh
```

Switches the symlink, installs the Caddyfile, reloads Caddy, runs the smoke
tests and rolls back by itself on any failure. Note the web root and the
backup file name it prints (needed for a manual rollback).

## 9. Check afterwards

```sh
curl -sI -H 'Accept-Language: de-DE,de;q=0.9' https://timurmanjosov.com/   # 302 → /de/
curl -sI https://timurmanjosov.com/                    # 302 → /en/, Vary + no-store
curl -sI https://timurmanjosov.com/de/                 # 200, strict CSP, no redirect
curl -sI https://timurmanjosov.com/lab/                # 301 → /en/projects/
curl -sI https://aura.timurmanjosov.com/               # unchanged
```

In Firefox: open `https://timurmanjosov.com/` (lands in your browser
language), switch language and theme, use search and the project filter,
open /contact (your address), /privacy (your name as controller). The
browser console must show no CSP errors. Full list: `docs/DEPLOY.md` §5.

## 10. Rollback

Automatic on any failure in step 8. By hand later (`docs/DEPLOY.md` §6):

```sh
ssh -t <ssh-target>
cd <web root>
sudo ln -sfn releases/<previous-id-or-old-slot> current.next && sudo mv -T current.next current
sudo cp -p <backup file from step 8> /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

When going back to the old Eleventy build, restore the Caddyfile backup as
well (its inline-script hash lives in the old CSP).

## 11. Every later update: `npm run publish`

After the first go-live, content changes need no stage/apply round:

```sh
npm run publish -- --target <ssh-target> --dry-run   # build, show changes, change nothing
npm run publish -- --target <ssh-target>             # same, confirm, upload, switch (one sudo)
npm run publish -- --target <ssh-target> --rollback  # back to the previous version
```

It switches the `current` symlink to the new release, checks over HTTP and
switches back on any failure; Caddy is neither changed nor reloaded. If
your change touches headers, redirects or caching
(`deploy/site-config.json`), publish refuses and you go through steps 4–8
again. Everything else: `docs/PUBLISHING.md`.
