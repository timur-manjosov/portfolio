# Verification

# Revision 5 (2026-10-30)

Launch posts, scheduled posts, `publish`, editing without code, GitHub
metadata, languages per post (brief `prompts/portfolio-umbau-5.md`).
Measured on 2026-10-30, branch `redesign`, Node v26.12.1, system Chromium
(`/usr/bin/chromium`).

## R5 Summary

| Check | Tool | Result |
|---|---|---|
| Full gate | `npm run check` | ✓ green, 29 ✓ lines; new: fixtures, scheduled, blog-i18n, publish, new-content, images, github-meta, post-surfaces, prepush-exit |
| Pre-push exit codes | `check:prepush-exit` | ✓ GO → 0, NO-GO (private address, server path, unreadable private file) → 1, usage → 2; on `redesign`: NO-GO, exit 1 |
| Fixtures never in production/release | `check:fixtures` | ✓ 7 fixtures, 255 files in dist, public and release build without a trace; all present in dist-drafts |
| Scheduled posts | `check:scheduled` | ✓ 16 unit tests, 5 builds (yesterday/today/tomorrow/midnight ±1 s); the 2 launch posts dated after today absent from dist |
| One or both languages | `check:blog-i18n` | ✓ fixture pair both ways, English-only fixture; real posts: 4 pair directions, 2 singles |
| Publish against a local web root | `check:publish` | ✓ 49 cases (dry run, switch, overview, switch back on failed HTTP check, rollback ×2, keep, deletion guards, checksums, usage) |
| new:post / new:project / edit | `check:new-content` | ✓ 61 cases incl. zero-diff round trip over every content file |
| Images in posts | `check:images` | ✓ 25 cases; a build with a missing alt text fails |
| GitHub metadata | `check:github-meta` | ✓ 31 cases (mocked API) + 2 real builds (mock API, dead API) |
| Posts on every surface | `check:post-surfaces` | ✓ 4 public posts, 56 checks; empty-blog panel gone |
| Article computations | `npm run check:articles:system` | ✓ 3 Python scripts (asserts), 35 CSP browser experiments PASS |
| Leak check | `npm run check:private` | ✓ 14 values, 0 hits |
| Browser suite, production | `npm run check:browser:system` | ✓ 66 pages, 132 axe runs, 264 overflow checks, 49 motion checks, 0 CSP violations |
| Browser suite, drafts + fixtures | `node tools/check-browser.mjs dist-drafts --chromium /usr/bin/chromium` | ✓ 108 pages, 216 axe runs, 0 CSP violations |
| Budgets | `npm run report:weight` | ✓ `/en/` 60.1 KB gz (≤ 120), JS ≤ 4.5 KB (≤ 15) |
| Lighthouse mobile | Lighthouse 13.6.0 via `npx` | 100 in every category, CLS 0: `/de/`, `/en/`, `/en/projects/`, `/de/blog/doppelausgabe-whitepaper-nachgerechnet/` |
| Dark palette, contrast | `check:dark-tokens`, `check:contrast` | ✓ unchanged; 116 pairs AA |
| Shell scripts | ShellCheck 0.11.0 via `npx` | ✓ 0 findings (`ship.sh deploy/*.sh .githooks/pre-commit`, incl. `publish-on-server.sh`) |

## R5 §1. Quality pass of the launch posts

1. **Read as a reader, computations rerun.** All four read end to end in
   session 2. Changes: Subset Sum got an explicit median note, a clearer
   sentence on the unreachable sums, the Hayes title stated as a title
   (not as a claim of why it was chosen) and a precise pointer into
   Mertens' eq. (12), which is checked against the PDF. Every number was
   rerun (`npm run check:articles:system`); the asserts in the scripts
   fail if a quoted number changes. Sources: W3C CSP3 sections (3.3,
   6.4.2, 8.3), the CCS 2016 abstract figures, arXiv records, Crossref for
   every DOI; links behind bot protection replaced (DECISIONS R5-D2).
2. **Rendered pages, light and dark, 390 and 1280 px**
   (`node tools/screenshots.mjs dist-drafts --pass r5/artikel… --widths
   390,1280 --full --tiles`, 0 overflow, 0 console errors or CSP
   violations), plus a measurement of every block formula, table, code
   block and figure wider than its column. Found and fixed: three display
   formulas wider than 390 px (split into separate blocks; Temml's
   `gathered` was rejected by the CSP guard of `rehype-temml`), three wide
   tables (transposed; the multiples of P now in pairs k / 19−k), two code
   lines wider than the column at 1280 px (CSP post), English decimal
   points in the German figure. After: no formula wider than the column at
   390 px; code blocks scroll horizontally on phones (expected), two small
   tables by 9 and 34 px.
3. **Surfaces:** lists, archive, category, tags, feeds, sitemap, search
   index, llms.txt, JSON-LD and the empty state are now a permanent check
   (`check:post-surfaces`), not a one-off look.

## R5 §2. Not checked here
- Anything on the server: SSH, sudo, the comparison of the live Caddyfile
  in `publish`, the HTTP check on the server, ownership of the web root
  (`docs/PUBLISHING.md` lists the read-only commands).
- The CI workflow itself (first run after the push), lychee against the
  two scheduled posts (they enter `dist` on their dates).
- Keystatic in a browser (rejected from its documentation, DECISIONS R5-D5).
- Firefox and Safari rendering.

# Revision 4 (2026-10-28)

Light mode after Material 3, one box construction, hover motion, About,
polish, pre-push check (brief `prompts/portfolio-umbau-4.md`). Measured on
2026-10-28, branch `redesign`, Node v26.12.1, system Chromium
156.0.8078.73 (`/usr/bin/chromium`).

## R4 Summary

| Check | Tool | Result |
|---|---|---|
| Full gate | `npm run check` | ✓ green (now incl. the dark snapshot) |
| Dark palette unchanged | `npm run check:dark-tokens` | ✓ 32 declarations match the snapshot in both dark blocks; no new colour reaches dark mode |
| WCAG AA contrast, threshold by use, state layers | `tools/check-contrast.mjs` | ✓ 116 pairs, light + dark; hero name 3.63:1 (min 3); worst box text with state layer 4.55:1 |
| Browser suite, production build | `npm run check:browser:system` | ✓ 42 pages, 84 axe runs, 49 motion checks, 0 CSP violations |
| Browser suite, drafts build | `node tools/check-browser.mjs dist-drafts --chromium /usr/bin/chromium` | ✓ 63 pages, 126 axe runs, 49 motion checks |
| Budgets | `npm run report:weight` | ✓ `/en/` 59.9 KB gz (≤ 120), 7 requests, JS 2.1 KB (≤ 15; search page 4.5 KB) |
| CLS | browser suite (d), Lighthouse | ✓ 0 |
| Lighthouse mobile | Lighthouse 13.6.0 via `npx` | 100/100/100/100 on `/de/`, `/en/`, `/en/projects/`, `/en/projects/aura/` |
| Screenshots, 6 passes | `tools/screenshots.mjs`, 320/390/768/1280/1920 px | 0 overflow at 320 px, 0 console errors (DECISIONS R4-D8) |
| Pre-push check | `npm run check:prepush` | NO-GO on `redesign` (expected); GO after the squash in a clone §3 |
| Release pipeline, test file | `bash deploy/build-release.sh --private private/site.private.test.yaml --test-only` | ✓ archive, refused for staging §4 |
| `apply-on-server.sh --dry-run` locally | bash | ✓ 8 expected problems (no server here), nothing changed §4 |
| Shell scripts | ShellCheck via `npx` | ✓ 0 findings (scripts unchanged in R4) |
| About with and without `about-extra` | `npm run check:build-modes` | ✓ appended when the file exists, absent otherwise, per language |
| Leak check | `npm run check:private` | ✓ 14 values of the test file, 0 hits |
| CI workflow | read + YAML parse; action releases via the GitHub API | pinned, read-only; **not run** (runs after the push) |
| Firefox / Safari rendering | – | **not run**; fallbacks from MDN BCD (DECISIONS R4-D4, R3-D7) |
| Visual and artistic effect | – | Timur's own judgement (CLAUDE.md), not a test |

## R4 §1. Motion and interaction tests (`tools/check-browser.mjs`, block 9)

New or changed in R4, light and dark:
- **Card hover:** lift 0.5–6 px, shadow changes, gradient contour 0 → 1,
  state layer opacity 0 → 0.08, title colour changes, the arrow moves
  2–4 px forward.
- **Card focus (keyboard):** outline on the card, contour 1, state layer
  0.10.
- **Touch screen** (`isMobile`, `hasTouch`: `(hover: hover)` is false): a
  tap-hover leaves the card without transform and with state layer 0.
- **Reduced motion:** no element of `main`/`header` transformed after
  hovering (the theme icon's quarter turn is now inside the no-preference
  query, found by this test); transitions of card, button, nav link,
  footer link and card arrow < 100 ms.
- Reveal, no-IntersectionObserver, no-JS and CLS tests as in R3, with
  the new timings (350 ms + 4 × 80 ms).

```
✓ browser checks: 42 pages; axe 84 runs (light+dark), overflow 168 checks, 7 no-JS pages, 6 feeds, 33 redirects, 27 language-door checks, 49 motion checks, 0 CSP violations, no third-party requests or cookies
✓ browser checks: 63 pages; axe 126 runs (light+dark), overflow 252 checks, 7 no-JS pages, 6 feeds, 33 redirects, 27 language-door checks, 49 motion checks, 0 CSP violations, no third-party requests or cookies
```

## R4 §2. Contrast (excerpt)

```
light  3.63:1 (min 3) gradient color-grad-1→color-grad-2→color-grad-3, worst sample #0082a3 on color-glow-2→bg 0% – hero name
light  5.51:1 (min 3) gradient color-accent→color-accent-2, worst sample #006784 on color-surface – gradient contour (…, notice bar)
light  4.73:1 (min 4.5) worst: color-accent on color-surface + state-hover 8% – box state layer
light  4.55:1 (min 4.5) worst: color-accent on color-surface + state-focus 10% – box state layer
dark   5.38:1 (min 4.5) worst: color-accent on color-raised + state-focus 10% – box state layer
✓ WCAG contrast: 116 colour pairs (incl. sampled gradients and the translucent header) in light + dark meet WCAG 2.2 AA
✓ dark palette unchanged: 32 dark declarations match tools/fixtures/dark-tokens.snapshot.json in both dark blocks; no new colour reaches dark mode
```

## R4 §3. Pre-push check and the squash rehearsal

In the real repository (`origin/main` = `77b9333` .. `HEAD`):

```
NO-GO: … finding(s)
Summary (at a24de7d):
    70 × e-mail is not a GitHub noreply address
     1 × file belongs in .gitignore
    17 × server detail (prepush-denylist.txt)
    15 × server path
     2 × SSH host alias (~/.ssh/config)
```

In a throw-away clone (`git clone . .tmp/prepush-test`, private files
copied in, `refs/remotes/origin/main` set to GitHub's `77b9333`), the
commands of `docs/GO-LIVE.md` step 3 (`git switch -c redesign-clean
redesign`, `git reset --soft origin/main`, `git -c user.name=… -c
user.email=291018608+timur-manjosov@users.noreply.github.com commit …`),
then the check with the clone as working directory:

```
pre-push check: 1 commit(s) in origin/main..HEAD
  searched for 18 private/server literal(s), IP addresses, server paths, 10 token patterns, commit e-mails and ignored files
  note: server user name (~/.ssh/config) skipped: part of the public facts in src/data/site.ts

GO: nothing in these commits that must not reach GitHub.
```

Tree of `redesign-clean` = tree of `redesign` (same tree hash). The real
repository was not touched (no reset, no commit with another address).
Repeated on the final docs commit `a24de7d` in a fresh clone
(`.tmp/prepush-final`): NO-GO before, GO after, both trees `f18b975`.

## R4 §4. Release rehearsal

```
$ bash deploy/build-release.sh --private private/site.private.test.yaml --test-only
⚠ private/site.private.test.yaml contains test values (example.invalid): allowed for a test-only release
⚠ 46 test value(s) in the output (test-only release)
⚠ 16 published text(s) still marked status: draft-review (npm run report:i18n)
✓ build (release) → dist
  628K  release/20261028T145622Z-bc24188b202f/site.tar.gz
  TEST-ONLY: release/LATEST not updated; stage.sh and apply-on-server.sh refuse this release.

$ bash deploy/apply-on-server.sh --dry-run --stage-dir release/20261028T145622Z-bc24188b202f
  PROBLEM: … (8: SHA256SUMS coverage, test values, no proposal, no /etc/caddy/Caddyfile, no caddy service)
dry run: 8 problem(s) above; a real run would stop before changing anything.
```

Afterwards `dist/` was rebuilt in public mode (the test release writes its
build there).

## R4 §5. Lighthouse (mobile, default config)

| Page | Perf. | A11y | Best Pr. | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/de/` | 100 | 100 | 100 | 100 | 1.1 s | 1.1 s | 0 ms | 0 |
| `/en/` | 100 | 100 | 100 | 100 | 1.1 s | 1.1 s | 0 ms | 0 |
| `/en/projects/` | 100 | 100 | 100 | 100 | 1.1 s | 1.1 s | 0 ms | 0 |
| `/en/projects/aura/` | 100 | 100 | 100 | 100 | 1.1 s | 1.1 s | 0 ms | 0 |

Remaining hints are the non-scored ones of R3 §3.

## R4 §6. Not checked here
- The CI workflow itself (first run after the push).
- `caddy adapt`, staging and the real apply (no server access by brief).
- Firefox and Safari rendering (no browsers here; fallbacks documented).

---

# Revision 3 (2026-10-28)

Design pass (brief `prompts/portfolio-umbau-3.md`). Measured on
2026-10-28, branch `redesign` at `2cd2789`, Node v26.12.1, system Chromium
156.0.8078.73 (`/usr/bin/chromium`).

## R3 Summary

| Check | Tool | Result |
|---|---|---|
| Full gate | `npm run check` | ✓ green |
| Browser suite, production build | `npm run check:browser:system` | ✓ 42 pages, 84 axe runs, 40 motion checks, 0 CSP violations |
| Browser suite, drafts build | `node tools/check-browser.mjs dist-drafts --chromium /usr/bin/chromium` | ✓ 63 pages, 126 axe runs, 40 motion checks |
| WCAG AA contrast, threshold by use | `tools/check-contrast.mjs` | ✓ 106 pairs, light + dark; name gradient 3.45:1 (min 3, large text) |
| Budgets | `tools/page-weight.mjs` | ✓ home 59.1 KB gz (≤ 120), 7 requests, JS ≤ 4.5 KB (≤ 15) |
| CLS | browser suite (d), Lighthouse | ✓ 0 on 5 pages while loading, scrolling and hovering |
| Lighthouse mobile | Lighthouse 13.6.0 via `npx` | 100/100/100/100 on `/de/`, `/en/`, `/en/projects/` |
| Screenshots, 6 passes | `tools/screenshots.mjs`, 390 + 768 + 1000 + 1280 px | 0 overflow at 320 px, 0 console errors (DECISIONS R3-D8) |
| Firefox / Safari rendering | – | **not run**; fallbacks from MDN BCD + caniuse (DECISIONS R3-D7) |
| Visual and artistic effect | – | Timur's own judgement (CLAUDE.md), not a test |

## R3 §1. Motion tests (`tools/check-browser.mjs`, block 9)

```
$ npm run check:browser:system
Chromium 156.0.8078.73 (/usr/bin/chromium)
✓ browser checks: 42 pages; axe 84 runs (light+dark), overflow 168 checks, 7 no-JS pages, 6 feeds, 33 redirects, 27 language-door checks, 40 motion checks, 0 CSP violations, no third-party requests or cookies
```

- **(a) Hover and focus, light and dark:** card lifts 0.5–4 px and its
  shadow changes, gradient contour opacity 0 → 1; the primary button lifts
  0.5–2 px and its colour changes; a text link's underline takes the full
  colour; the nav hairline goes from opacity 0 to visible; Tab reaches a card link, which shows a solid
  outline and the contour; the brand link shows a 2px solid outline.
- **(b) Reveal:** at 390 px on `/de/`, `/en/projects/`, `/de/blog/`, nothing
  in the first viewport is hidden, something below the fold is (home), and
  after scrolling through no element is still marked or below opacity 1.
- **(b2) No IntersectionObserver** (removed by an init script, new in
  session 2): nothing marked, nothing below opacity 1 on `/de/` and
  `/en/projects/`.
- **(c) `prefers-reduced-motion: reduce`:** nothing marked or faded, no
  element of `main`/`header` has a transform after hovering a card and a
  button, transitions of card, button, nav link and /now link < 100 ms.
- **No JS** (block 2, 7 pages): no element of `main` faded or transformed,
  besides the existing content checks.
- **(d) CLS 0** on `/de/`, `/en/`, `/en/projects/`, `/de/about/`, `/en/blog/`
  at 390 px while loading, scrolling through and hovering.

Session 1 found and fixed a real shift with these tests: the theme toggle
and the project filter were revealed by deferred module scripts after first
paint (CLS up to 0.21 on `/en/projects/` at 390 px). `theme-init.js` now
sets `.js` on `<html>` before paint and CSS reserves their place.

## R3 §2. Contrast with a size-dependent threshold

```
light  3.45:1 (min 3) gradient color-grad-1→color-grad-2→color-grad-3, worst sample #0c8a83 on color-glow-1→bg 0% – hero name (gradient text, large: --text-display ≥ 24 px)
dark   6.31:1 (min 3) gradient color-grad-1→color-grad-2→color-grad-3, worst sample #86aaff on color-glow-2→bg 0% – hero name (gradient text, large: --text-display ≥ 24 px)
large text: --text-display min 2.6rem = 41.6px (≥ 24px, threshold 3:1)
✓ WCAG contrast: 106 colour pairs (incl. sampled gradients and the translucent header) in light + dark meet WCAG 2.2 AA
```

Every other text pair keeps 4.5:1 (lowest: `color-accent` on the
translucent header, 4.60:1; `color-accent-2` on `color-glow-1`, 4.77:1).
The 3:1 threshold applies only if `--text-display` stays ≥ 1.5rem, the
`.hero__title` rule uses it, and `gradient-text` sits on nothing else; the
check fails otherwise (DECISIONS R3-D4).

## R3 §3. Lighthouse (mobile, default config)

Lighthouse 13.6.0 (`npx --yes lighthouse@13 <url> --chrome-path=/usr/bin/chromium`),
against `node tools/serve.mjs dist 4321` (production headers and caching):

| Page | Perf. | A11y | Best Pr. | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/de/` | 100 | 100 | 100 | 100 | 1.1 s | 1.1 s | 0 ms | 0 |
| `/en/` | 100 | 100 | 100 | 100 | 1.1 s | 1.1 s | 0 ms | 0 |
| `/en/projects/` | 100 | 100 | 100 | 100 | 1.1 s | 1.1 s | 0 ms | 0 |

FCP/LCP 0.2 s above R2 (0.9 s); remaining hints are the same non-scored
ones as in R2 §4 (`render-blocking-insight`, `unused-css-rules`,
`document-latency-insight` of the uncompressed local server) plus
`network-dependency-tree-insight` (CSS → font chain).

## R3 §4. Budgets

```
$ node tools/page-weight.mjs dist
| Page | Requests | Raw | gzip | JS (raw) |
| `/` | 6 | 83.6 KB | 56.5 KB | 1.3 KB |
| `/en/` | 7 | 91.2 KB | 59.1 KB | 2.1 KB |
| `/de/blog/` | 7 | 87.3 KB | 58.0 KB | 2.1 KB |
| `/en/projects/` | 8 | 90.7 KB | 59.1 KB | 3.2 KB |
| `/en/about/` | 7 | 90.7 KB | 59.1 KB | 2.1 KB |
| `/de/search/` | 8 | 89.8 KB | 59.3 KB | 4.5 KB |
```

One request more than in R2 on most pages: the reveal script (595 bytes,
364 gzip). No animation loop: all motion is CSS transitions triggered by
hover, focus, a click or entering the viewport once; nothing runs in the
background.

---

# Revision 2 (2026-10-28)

Measured on 2026-10-28, branch `redesign`, Node v26.12.1, system Chromium
156.0.8078.47 (`/usr/bin/chromium`, no browser download). Outputs are
excerpts of real runs. What could not be checked is listed in §11.

## R2 Summary

| Check | Tool | Result |
|---|---|---|
| Full gate | `npm run check` | ✓ green (lint, types, both builds, CSP, links, HTML, SEO, HTTP, contrast, axe, drafts, leak check, build modes, Caddy generator, i18n, audit) |
| Language door, 8 required + 4 extra `Accept-Language` values | `check-http`, `check-browser` | ✓ §1 |
| Browser suite, production build | `npm run check:browser:system` | ✓ 42 pages, 84 axe runs, 0 CSP violations §2 |
| Browser suite, drafts build (post with code + maths) | same, `dist-drafts` | ✓ 63 pages after two target-size fixes §2 |
| Overflow at 320 px | `check-browser`, `tools/screenshots.mjs` | ✓ 0 pages §3 |
| Lighthouse mobile | Lighthouse 13.6.0 via `npx` | 100/100/100/100 on home DE + EN and projects; post 100/100/100, SEO 63 (draft `noindex`) §4 |
| WCAG AA contrast incl. gradients | `tools/check-contrast.mjs` | ✓ 102 pairs, light + dark §5 |
| Budgets (≤ 120 KB gz, ≤ 12 requests, JS ≤ 15 KB) | `tools/page-weight.mjs` | ✓ home 57.6 KB gz, 6 requests, 1.0 KB JS; CLS 0 §6 |
| Generator against the **real** Caddyfile | `caddy-site-block.mjs propose` | ✓ outside the block byte-identical, Aura block SHA-256 identical §7 |
| Release pipeline, test-only | `bash deploy/build-release.sh --test-only` | ✓ archive, checksums, refused for staging §8 |
| `apply-on-server.sh --dry-run` locally | bash | ✓ 8 expected problems, exit 1, nothing changed §8 |
| Shell scripts | ShellCheck 0.11.0 (`npx shellcheck`) | ✓ 0 findings |
| Repo hygiene | own scan (patterns in §10) | findings removed or in BLOCKERS R2-B1 |
| `forced-colors`, `prefers-contrast: more` | Playwright emulation + axe | ✓ 0 violations, gradients and glows replaced §5 |
| `caddy adapt` of the proposal | caddy | **not run** (no local binary, no upload allowed) |
| Firefox / Safari rendering | – | **not run**; covered by documentation only §5 |

## R2 §1. Language door

Local server with the production headers (`tools/serve.mjs`, same rule as
the Caddy block from `deploy/site-config.json`), `fetch` without
following redirects:

| Accept-Language | Status | Location | Vary | Cache-Control |
|---|---|---|---|---|
| `de` | 302 | /de/ | Accept-Language | no-store |
| `de-DE,de;q=0.9,en;q=0.8` | 302 | /de/ | Accept-Language | no-store |
| `en-US,en;q=0.9,de;q=0.8` | 302 | /en/ | Accept-Language | no-store |
| `fr-FR` | 302 | /en/ | Accept-Language | no-store |
| (none) | 302 | /en/ | Accept-Language | no-store |
| `*` | 302 | /en/ | Accept-Language | no-store |
| `de-AT` | 302 | /de/ | Accept-Language | no-store |
| `DE` | 302 | /de/ | Accept-Language | no-store |

`/de/` and `/en/` with `de-DE`, `en-US`, `fr-FR` and no header: always
**200**, no `Location`. The permanent check (`npm run check:http`) runs the
12 cases of `languageDoor.tests` (the 8 above plus `de-CH,fr;q=0.5`, `en`,
`dsb-DE,de;q=0.8` → /en/, `fr-FR,de;q=0.9` → /en/):

```
✓ HTTP (local server): 255 checks: pages 200, language switch targets, language door (12 Accept-Language cases), /de/ + /en/ never redirect, 33 redirects, 404s, headers
```

In the browser (`check-browser` §8): 11 header values through the server
rule (a browser always sends a header, so "none" is covered above), the
static fallback with the server rule switched off for the locales
`de-DE`, `de-AT` → /de/ and `en-US`, `fr-FR` → /en/ (via
`navigator.languages` and `location.replace`; the history has 2 entries,
`about:blank` + target, i.e. the redirect did not push an entry), and
`/de/`, `/en/`, `/de/about/`, `/en/blog/` → 200 for three languages:
27 checks, all passed.

The same Caddy rule (excerpt of the generated block,
`deploy/Caddyfile.example`):

```caddyfile
@door path /
header @door {
	Cache-Control "no-store"
	Vary "Accept-Language"
}
@door_match {
	path /
	header_regexp Accept-Language "(?i)^de(-[a-z0-9]+)*([;, ]|$)"
}
@door_default {
	path /
	not header_regexp Accept-Language "(?i)^de(-[a-z0-9]+)*([;, ]|$)"
}
redir @door_match /de/ 302
redir @door_default /en/ 302
```

## R2 §2. Browser suite (system Chromium)

```
$ npm run check:browser:system
Chromium 156.0.8078.47 (/usr/bin/chromium)
✓ browser checks: 42 pages; axe 84 runs (light+dark), overflow 168 checks, 7 no-JS pages, 6 feeds, 33 redirects, 27 language-door checks, 0 CSP violations, no third-party requests or cookies

$ node tools/check-browser.mjs dist-drafts --chromium /usr/bin/chromium
Chromium 156.0.8078.47 (/usr/bin/chromium)
✓ browser checks: 63 pages; axe 126 runs (light+dark), overflow 252 checks, 7 no-JS pages, 6 feeds, 33 redirects, 27 language-door checks, 0 CSP violations, no third-party requests or cookies
```

What the suite covers: axe-core WCAG 2.2 A/AA + best practice on every
page in light and dark; overflow at 320/375/768/1280 px; CSP violations
(a `securitypolicyviolation` listener on every page plus console
messages); no request to another origin; no cookies; no console errors;
no-JS rendering (content, navigation, dark OS scheme without script,
theme toggle hidden, all projects listed, search note visible); theme
toggle (`aria-pressed` in sync, choice persisted and applied before first
paint, so no flash); language switcher on every page (target exists and has
the other `lang`); project filter (count, URL state, status line) and
search; feeds parse as RSS; all 33 redirects.

**Found and fixed in this run** (first run of the drafts build):

```
✗ browser checks: 12 problem(s)
  - /de/blog/category/notes/ [dark]: axe target-size (serious): All touch targets must be 24px large, or leave sufficient space → .section-footer > a
  …
```

The feed link on category pages was 17 px high and touched the first post
title (measured: link bottom 405.3 px, title top 404.3 px). Fix: links
alone in `.section-footer` get `padding-block: 0.25rem` (31 px), and the
post list after it gets `margin-top: var(--space-6)`. Also a test bug: the
project filter counted the tech chips (`li` inside the cards) as projects;
the selector is now `[data-project-list] > li`.

## R2 §3. Screenshots and overflow

`node tools/screenshots.mjs dist-drafts --pass <n>`: 10 pages (home DE + EN,
About, projects, a project, blog, a post with code and maths, links,
contact, 404) × 360/768/1280 px × light/dark = 60 images per pass, plus a
scroll-width check of every page at 320 px. Six passes, notes in
`docs/DECISIONS.md` R2-D7. Last pass:

```
screenshots in .screenshots/pass6/ (0 problem(s))
```

(0 problems = no page wider than 320 px, no console error.)

## R2 §4. Lighthouse (mobile, default config)

Lighthouse 13.6.0 (`npx --yes lighthouse@13`, `npm view lighthouse version`
= 13.6.0, not added to `package.json`, DECISIONS R2-D10), Chromium 156,
against `tools/serve.mjs` with the production headers and caching:

| Page | Perf. | A11y | Best Pr. | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/en/` | 100 | 100 | 100 | 100 | 0.9 s | 0.9 s | 0 ms | 0 |
| `/de/` | 100 | 100 | 100 | 100 | 0.9 s | 0.9 s | 0 ms | 0 |
| `/en/projects/` | 100 | 100 | 100 | 100 | 0.9 s | 0.9 s | 0 ms | 0 |
| `/de/blog/beispiel-rsa-mathe/` (drafts build) | 100 | 100 | 100 | **63** | 1.1 s | 1.1 s | 0 ms | 0 |

- **SEO 63 on the post** is only `is-crawlable`: every page of the drafts
  build carries `<meta name="robots" content="noindex">` on purpose (D16).
  All other SEO audits pass. There is no published post yet to measure in
  the production build.
- First run: the post scored **96** in accessibility (`target-size`: table
  of contents entries 17 px high on mobile). Fixed with
  `.toc a { display: inline-block; padding-block: 0.25rem }` → 100.
- First run also showed `cache-insight` (76–470 KiB): the local test
  server did not send the `Cache-Control` headers of the Caddy block. It
  does now (`immutable` for `/_astro/`, revalidation elsewhere), so the
  local measurement matches production; the audit is gone.
- Remaining non-scored hints: `render-blocking-insight` (~290 ms
  estimate: the one CSS file and the blocking `theme-init.js`, which must
  block to avoid a theme flash), `unused-css-rules` (13–15 KiB: one
  stylesheet for all pages, cached after the first visit),
  `document-latency-insight` (local server without compression; Caddy
  sends gzip/zstd).

## R2 §5. Contrast and browser support of CSS features

```
✓ WCAG contrast: 102 colour pairs (incl. sampled gradients and the translucent header) in light + dark meet WCAG 2.2 AA
```

Worst points of the gradient text (the name in the hero), sampled at every
stop and in between, on every mix of the hero tints with the page
background:

```
light  5.24:1 (min 4.5) gradient color-grad-1→color-grad-2→color-grad-3, worst sample #2f50c8 on color-glow-1→bg 0% – hero name (gradient text)
dark   6.31:1 (min 4.5) gradient color-grad-1→color-grad-2→color-grad-3, worst sample #86aaff on color-glow-2→bg 0% – hero name (gradient text)
```

New in this run: text on the page-top glow (`--gradient-page`), e.g.
`light 5.78:1 color-accent on color-glow-1 – breadcrumb links on the violet
tint`.

**Firefox and Safari:** the tests run in Chromium only. Every newer CSS
feature was checked in MDN browser-compat-data (raw JSON from
`github.com/mdn/browser-compat-data`, 2026-10-28):

| Feature | Chrome | Firefox | Safari | Without support |
|---|---|---|---|---|
| `background-clip: text` | 120 (`-webkit-` 3–119) | 49 (partial: not with `background-attachment: fixed`, not used) | 14 (`-webkit-` 4–13) | `@supports` fails → name in solid `--color-accent` |
| `backdrop-filter` | 76 | 103 | 18 (`-webkit-` since 9; both written) | `@supports` fails → opaque header background |
| `@view-transition` (cross-document) | 126 | **not supported** | 18.2 | rule ignored, normal navigation; only inside `prefers-reduced-motion: no-preference` |
| `:has()` | 105 | 121 | 15.4 | card does not lift on hover; link still works |
| `text-wrap: balance` / `pretty` | 114 / 117 | 121 / – | 17.5 / – | normal line breaking |

`prefers-contrast: more`: gradient text becomes solid `--color-text`, the
glows and tints are removed, borders get `--color-border-strong`, the
header loses its blur. `forced-colors: active`: gradient text uses
`CanvasText`, cards, pills, chips and buttons get 1px `CanvasText` borders,
focus uses `Highlight`. Rendered with Playwright's emulation
(`forcedColors: "active"`, `contrast: "more"`) on home and a project page
at 768 px, with axe (WCAG 2.2 AA) on each:

```
forced home {"forced":true,"nameFill":"rgb(0, 0, 0)","mainBg":"none, none"} axe violations: 0
forced project {"forced":true,"nameFill":"rgb(21, 20, 31)","mainBg":"none, none"} axe violations: 0
more-contrast-light home {"more":true,"nameFill":"rgb(21, 20, 31)","mainBg":"none"} axe violations: 0
more-contrast-dark home {"more":true,"nameFill":"rgb(238, 237, 246)","mainBg":"none"} axe violations: 0
```

(The name is a solid colour, the page glow is gone. In the forced-colors
screenshot, cards, buttons, pills and the spec sheet keep visible borders.)

## R2 §6. Budgets

```
$ node tools/page-weight.mjs dist
| Page | Requests | Raw | gzip | JS (raw) |
| `/` | 6 | 78.8 KB | 55.4 KB | 0.9 KB |
| `/en/` | 6 | 85.5 KB | 57.6 KB | 1.0 KB |
| `/de/blog/` | 6 | 81.6 KB | 56.5 KB | 1.0 KB |
| `/en/projects/` | 7 | 85.0 KB | 57.5 KB | 2.1 KB |
| `/en/about/` | 6 | 85.0 KB | 57.6 KB | 1.0 KB |
| `/de/search/` | 7 | 84.1 KB | 57.8 KB | 3.3 KB |
```

Home: 57.6 KB gzip (budget 120), 6 requests (12), 1.0 KB JS (15). CLS 0 in
Lighthouse. No animation loop: the only motion is CSS transitions on hover
and focus (140 ms), disabled under `prefers-reduced-motion`.

## R2 §7. Generator against the real Caddyfile

Read with `ssh -o BatchMode=yes <alias> cat /etc/caddy/Caddyfile` into the
git-ignored `release/Caddyfile.live` (104 lines; byte-identical to the copy
read on 2026-10-27). Then:

```
$ node tools/caddy-site-block.mjs propose release/Caddyfile.live release/Caddyfile.proposed
proposal: release/Caddyfile.proposed
replaced bytes 0..1518 of 4538 (site block only)
outside the block: byte-identical
  note: CSP script-src: drops 'sha256-…' (stricter)
  note: new header: permissions-policy
  note: new header: cross-origin-opener-policy
✓ proposal: no security header got weaker, rest of file untouched
```

Independent check of the Aura block (own script, not the generator):
extracted from `aura.timurmanjosov.com` to its closing brace in both files.

```
aura block lines: 51 live sha256 c3483ef32966f13a proposed sha256 c3483ef32966f13a BYTE-IDENTICAL
tail after site block identical: true
```

`release/Caddyfile.diff` (147 lines, git-ignored) touches only the site
block. The site block of the live file has no `log` directive (only the
Aura block logs); the privacy policy is based on that.

## R2 §8. Release pipeline and dry run

```
$ bash deploy/build-release.sh --private private/site.private.test.yaml --test-only --allow-dirty
… npm ci, npm run check (green) …
⚠ private/site.private.test.yaml contains test values (example.invalid): allowed for a test-only release
⚠ 46 test value(s) in the output (test-only release)
⚠ 16 published text(s) still marked status: draft-review (npm run report:i18n)
✓ build (release) → dist
release 20261028T053239Z-0dca2197b59e
  588K  release/20261028T053239Z-0dca2197b59e/site.tar.gz
  TEST-ONLY: release/LATEST not updated; stage.sh and apply-on-server.sh refuse this release.
```

(`--allow-dirty` only because a KDE file-manager file `.directory`, tracked
in the old repo, was modified outside this session; not touched.)

Verification of the result:

```
site.tar.gz: OK · redirects.tsv: OK · expected-headers.tsv: OK · language-door.tsv: OK · apply-on-server.sh: OK · TEST-ONLY: OK
archive entries: 121
  ✓ index.html ✓ lang-redirect.js ✓ 404.html ✓ de/imprint/index.html ✓ en/imprint/index.html ✓ pgp-key.asc ✓ .well-known/security.txt ✓ de/privacy/index.html
occurrences of example.invalid in the archive: 58
visible TODO( markers: 0
```

The refusals of a **non**-test release (missing `contact.email`, missing
`legal.controller`, test values, visible `TODO(`, invalid field) are
proven on every `npm run check` by `check:build-modes`:

```
✓ build modes (public/release): 9 builds: public without/with private data, incomplete imprint, 5 release refusals, test-only release
```

Dry run against the test release on this laptop (no Caddy, no server):

```
$ bash deploy/apply-on-server.sh --dry-run --stage-dir release/20261028T053239Z-0dca2197b59e
  PROBLEM: this is a TEST-ONLY release (test values inside); it can never be applied
  PROBLEM: missing tool: caddy
  PROBLEM: Caddyfile.proposed is not covered by SHA256SUMS
  PROBLEM: Caddyfile.at-staging is not covered by SHA256SUMS
  PROBLEM: the build contains test values (example.invalid)
  PROBLEM: Caddyfile.proposed missing
  PROBLEM: /etc/caddy/Caddyfile not readable
  PROBLEM: caddy service is not active
==> dry run: a real run (sudo) would now
  [plan] record status + security headers of https://aura.timurmanjosov.com/
  [plan] unpack site.tar.gz into <web root>/releases/… (root:root, dirs 755, files 644)
  …
  [plan] smoke tests: pages, language door (12 Accept-Language cases), 33 redirects, headers, 404s, caching, Aura unchanged
dry run: 8 problem(s) above; a real run would stop before changing anything.
```

All 8 problems are the expected ones on a laptop with a test release; exit
code 1; no file outside `release/` was touched. (The plan line originally
showed `/releases/…` when no web root was known; now `<web root>`. A real
run stops at any problem before that, so this was cosmetic.) Not run: the
negative argument tests (`--stage-dir` without `--dry-run`, unknown
argument), because the session only allowed `--dry-run` invocations; the
argument parsing was reviewed by reading.

```
$ npx --yes shellcheck ship.sh deploy/build-release.sh deploy/stage.sh deploy/apply-on-server.sh .githooks/pre-commit
shellcheck 0.11.0: no findings
```

## R2 §9. Dependencies

```
$ npm run audit
3 low severity vulnerabilities   (katex via remark-math, build time only, §9 below)
$ npm outdated
Package      Current   Wanted  Latest
@types/node  24.19.2  24.19.2  26.6.5
typescript     6.0.3    6.0.3   7.0.2
```

Both are major versions and held back on purpose: `@types/node` follows
the oldest supported runtime (Node ≥ 22, `engines`), not the newest;
TypeScript 7 is the native rewrite, and `astro check` is only validated
against TypeScript 6 here. Every other dependency is current.

## R2 §10. Repo hygiene scan

Patterns over all tracked files (`git ls-files`, without binaries and the
lockfile), all added lines of `git log -p pre-redesign..HEAD`, and the
commit metadata: e-mail addresses, phone numbers, IPv4/IPv6, host names
(VPS/provider patterns), absolute server paths (`/etc`, `/var`, `/home`,
`/srv`, `/opt`, `/root`), `user@host`, token formats (GitHub, Slack,
AWS, OpenAI-style keys, Discord bot tokens, private key blocks). Findings
and what happened to them: `docs/BLOCKERS.md` R2-B1 (values not
repeated). After the clean-up, the remaining hits in tracked files are
`127.0.0.1`, `example.invalid` test values, Caddy's default config path,
"Netcup" in the privacy policy (asked for) and false positives (SVG path
numbers, CSS colour hex values, timestamps).

The leak check for the private values:

```
✓ private data leak check: 14 private value(s) from 1 file(s) not found in 146 tracked/staged/unignored file(s)
```

(Only the test file exists in `private/`; the real file was never created
by me.)

## R2 §11. Not verified

- **Firefox and Safari rendering:** no Playwright Firefox/WebKit builds
  (downloads are not allowed). Covered by the compatibility table in §5.
- **`caddy adapt` of the real proposal:** no local Caddy binary, no
  upload. Runs in `deploy/stage.sh` and in the dry run on the server.
- **A real release** with the real private file: the file does not exist
  (I must not invent values). The test-only run proves the pipeline.
- **forced-colors / prefers-contrast** in a real Windows high-contrast
  theme: only Chromium's emulation was used (§5).
- **External links** (lychee) and **CI**: unchanged, see B4/B5.

---

# Verification (Phase 5, first run)

Run on 2026-10-27, branch `redesign`, Node v26.12.1, Arch Linux. Everything
below was measured. Where something could **not** be run, this says so
(details: `docs/BLOCKERS.md`). Re-run all of it with `npm run check`. The
browser suite is `npm run check:browser`.

## Summary

| Check | Tool | Result |
|---|---|---|
| Lint + format | Biome 2.6 | ✓ 74 files, 0 findings |
| Types (strictest) | `astro check`, TS 6 | ✓ 0 errors, 0 warnings, 0 hints |
| Production build | `astro build --force` | ✓ 46 pages, ~0.7 s |
| Drafts build | `SHOW_DRAFTS=1 … --outDir dist-drafts` | ✓ 71 pages |
| Schema validation breaks the build | deliberately broken post | ✓ exit 1 (§2) |
| CSP compatibility (no inline JS/CSS, no third parties) | `tools/check-csp.mjs` | ✓ 46 + 71 pages |
| Internal links + anchors + sitemap URLs | `tools/check-links.mjs` | ✓ 1682 + 2597 links |
| HTML validity + a11y markup rules | html-validate 11 (recommended + a11y) | ✓ 0 errors, both builds |
| One h1, lang, canonical, hreflang, JSON-LD, sitemap coverage | `tools/check-seo.mjs` | ✓ 46 + 71 pages |
| HTTP: pages, language switch, redirects, 404s, headers | `tools/check-http.mjs` | ✓ 132 + 174 checks |
| WCAG 2.2 AA contrast, light + dark | `tools/check-contrast.mjs` | ✓ 34 pairs |
| axe-core WCAG 2.2 A/AA + best practice | axe 4 in jsdom | ✓ 0 violations, 46 + 71 pages |
| Drafts absent from production | `tools/check-drafts-hidden.mjs` | ✓ 9 draft files, 0 leaks |
| Translation state machine-readable | `tools/i18n-report.mjs` | ✓ report written (§6) |
| Caddy proposal generator | fixture + negative tests | ✓ (§8) |
| Feeds + sitemaps well-formed | xmllint | ✓ (§5) |
| Dependencies | `npm audit --audit-level=moderate` | ✓ passes; 3 **low** (§9) |
| Shell scripts | ShellCheck 0.11 | ✓ 0 findings |
| Browser suite (real Chromium) | `tools/check-browser.mjs` | **not run**: no Chromium (B2) |
| Lighthouse | n/a | **not run**: no Chromium (B2) |
| External links | lychee | **not run** locally, CI only (B4) |
| `caddy adapt` | caddy | **not run** locally (no binary, no server access), CI and `deploy/stage.sh` |

## 1. Build

```
$ npm run build
06:42:01 [WARN] [content] data store cleared (force)
…
06:42:01 [build] 46 page(s) built in 711ms
06:42:01 [build] Complete!
```

`--force` clears Astro's content cache on every build. Without it, a stale
cache shipped HTML rendered by an older version of the math plugin (with an
inline `style` attribute). The CSP check caught it in `dist-drafts/`:

```
✗ CSP compatibility: 4 problem(s)
  - /de/blog/beispiel-rsa-mathe/index.html: style attribute: <math display="block" class="tml-display" style=
```

The cache was confirmed as the cause (`grep -c "display:block math"
node_modules/.astro/data-store.json` → 1). After switching to `--force`:
`✓ CSP compatibility: 71 HTML files, 215 script tags, no inline code/styles,
no third-party resources`.

## 2. Frontmatter schema breaks the build

A temporary post `src/content/blog/en/zz-schema-probe.md` (deleted after
the test):

Without `date`:
```
[InvalidContentEntryDataError] blog → en/zz-schema-probe data does not match collection schema.
  date**: **date: Expected type `"date"`, received `"object"`
exit 1
```

With `date` but `category: gossip` (not in `categories.yaml`):
```
[ERROR] [content] Invalid content reference: entry "en/zz-schema-probe" in collection "blog" (field: category) references "gossip" in collection "categories", but that entry does not exist.
[ERROR] [build] Caught error rendering /en/blog/zz-schema-probe/: Error: Unknown category "gossip" in blog/en/zz-schema-probe
exit 1
```

## 3. CSP: the build runs under the existing strict policy

The policy the build is checked against (and that the Caddy proposal sends):
`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self';
font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none';
form-action 'none'; frame-ancestors 'none'`. This is **stricter** than the live
one, because the `sha256-` hash for the old inline theme script is gone.

```
✓ CSP compatibility: 46 HTML files, 140 script tags, no inline code/styles, no third-party resources
✓ CSP compatibility: 71 HTML files, 215 script tags, no inline code/styles, no third-party resources
```

"140 script tags" = per page: the external blocking `/theme-init.js`, one
JSON-LD data block (`type="application/ld+json"`, not executed, so not
subject to `script-src`) and the external module script(s). There is not a
single inline script, `<style>`, `style=""` or `on…=` handler, and no
resource from another origin. `astro.config.ts` enforces this:
`inlineStylesheets: "never"`, `assetsInlineLimit: 0`, Prism instead of
Shiki, MathML instead of KaTeX HTML.

## 4. Structure, SEO, machine readability

```
✓ SEO / structured data: 46 pages: one h1, lang, canonical, reciprocal hreflang, JSON-LD, sitemap coverage
✓ SEO / structured data: 71 pages: one h1, lang, canonical, reciprocal hreflang, JSON-LD, sitemap coverage
```

What it asserts per page: exactly one `<h1>`; `<main>` landmark;
`<html lang>` = URL prefix; title + description ≥ 20 chars; canonical =
own URL (none on `noindex` pages); hreflang sets identical on all members,
reciprocal, containing the page itself, with `x-default`; JSON-LD parses and
contains `Person` + `WebSite`, `BlogPosting` on posts,
`SoftwareSourceCode`/`CreativeWork` on projects; **`sameAs` equals the
`rel="me"` links on /links** (both languages); every indexable page is in
the sitemap and no `noindex` page is; robots.txt names the sitemap;
llms.txt exists.

Bugs it found and that were fixed: canonical `/404/` on the 404 page; a
`rel="me"` self-link on /links that broke `sameAs` parity; too-short
descriptions on the archive and tag pages.

JSON-LD excerpt, project without public repository (`/en/projects/octo/`):
```json
{ "@type": "CreativeWork", "@id": "https://timurmanjosov.com/en/projects/octo/#project",
  "name": "Octo", "description": "A CHIP-8 emulator written in Rust.", "inLanguage": "en",
  "author": { "@id": "https://timurmanjosov.com/#person" }, "dateModified": "2026-10-26",
  "keywords": "emulator, systems" }
```
Post (drafts build, `/en/blog/example-rsa-maths/`):
```json
{ "@type": "BlogPosting", "headline": "[Example] RSA in a few lines: maths, code, footnotes",
  "inLanguage": "en", "datePublished": "2026-10-26", "dateModified": "2026-10-26",
  "author": { "@id": "https://timurmanjosov.com/#person" },
  "articleSection": "Maths & Cryptography", "wordCount": 231, "workTranslation": { … } }
```

Sitemap with language alternates (excerpt):
```xml
<url><loc>https://timurmanjosov.com/de/</loc><lastmod>2026-10-26</lastmod>
  <xhtml:link rel="alternate" hreflang="de" href="https://timurmanjosov.com/de/"/>
  <xhtml:link rel="alternate" hreflang="en" href="https://timurmanjosov.com/en/"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://timurmanjosov.com/"/></url>
```

## 5. Feeds

`xmllint --noout` on `dist/sitemap.xml`, `dist/{de,en}/feed.xml`, two
category feeds, `dist-drafts/{de,en}/feed.xml`, a drafts category feed and
`dist-drafts/sitemap.xml`: no output, exit 0 (all well-formed). Autodiscovery
`<link rel="alternate" type="application/rss+xml">` is on every page, and
`check-seo` verifies the target file exists. Excerpt (drafts build, so with
the example posts):

```xml
<rss version="2.0" …><channel><title>Timur Manjosov – Blog</title>
<link>https://timurmanjosov.com/en/blog/</link><language>en</language>
<atom:link href="https://timurmanjosov.com/en/feed.xml" rel="self" type="application/rss+xml"/>
<item><title>[Example] RSA in a few lines: maths, code, footnotes</title>
<link>https://timurmanjosov.com/en/blog/example-rsa-maths/</link>
<pubDate>Mon, 26 Oct 2026 00:00:00 GMT</pubDate><dc:creator>Timur Manjosov</dc:creator>
<category>Maths &amp; Cryptography</category>…
```

Fixed along the way: the channel `<link>` pointed at the site root instead
of the blog in the feed's language. A W3C Feed Validator run (external
service) was not done.

## 6. Languages

- Language switcher on **every** page of both builds (all page types: home,
  listings, categories, tags, series, archive, posts, projects, content
  pages, search, 404): the link target answers 200 and has the other
  `lang` (`check-http`: part of the 132/174 checks).
- Translation report (production build: everything translated; drafts build):

```
blog: 3 item(s), 2 without full translation
  - beispiel-selbst-hosten: only de (missing en)
  - example-note-terminal: only en (missing de)
projects: 8 item(s), 3 without full translation
  - contact-manager: only en (missing de)
  - number-guessing-game: only en (missing de)
  - vector-calculator: only en (missing de)
pages: 6 item(s), 0 without full translation
✓ i18n report: 5 item(s) not translated into every language; details in reports/i18n-drafts.json
```

The report also cross-checks that exactly these pages carry
`data-translation-missing` in their switcher (honest "translation missing"
state), and lists the 16 texts still marked `status: draft-review`.

## 7. HTTP behaviour (local server with production headers)

`tools/serve.mjs` serves `dist/` with the headers and redirect table from
`deploy/site-config.json` (the same data the Caddy block is generated from)
and the language-specific 404 logic of the Caddy block.

```
✓ HTTP (local server): 132 checks: pages 200, language switch targets, 31 redirects, 404s, headers
✓ HTTP (local server): 174 checks: pages 200, language switch targets, 31 redirects, 404s, headers
```

Covered: all 31 redirects (status, `Location`, target 200) including the old
URLs `/index.html`, `/lab`, `/lab/`, `/lab/index.html`,
`/assets/images/og-image.png` and the old favicon paths; `/de/…` unknown →
404 with the German page, `/en/…` → English, elsewhere → bilingual
`/404.html`; every security header on a page and on a 404 response. The real
Caddy behaviour is checked again on the server by
`deploy/apply-on-server.sh` after go-live (§10).

## 8. Caddy proposal generator

Positive test on `tools/fixtures/Caddyfile.sample` (global options + old site
block with script hash + a neighbour site with comments containing braces):

```
replaced bytes 239..900 of 1122 (site block only)
outside the block: byte-identical
  note: CSP script-src: drops 'sha256-AAAA…=' (stricter)
  note: new header: permissions-policy
  note: new header: cross-origin-opener-policy
✓ proposal: no security header got weaker, rest of file untouched
```

Idempotent: running `propose` on its own output gives a byte-identical file
(`cmp`: no difference).

Negative tests (the generator must refuse):
```
# old CSP had upgrade-insecure-requests, old HSTS max-age was 2 years
✗ proposal rejected:
  - HSTS max-age got shorter
  - CSP directive upgrade-insecure-requests was removed
# old block had a `log` directive
✗ proposal rejected:
  - directive `log` of the old block is missing in the new one
```

**Not done:** running it against the real `/etc/caddy/Caddyfile` and the
`diff` evidence for the Aura block (no SSH, B1). `deploy/stage.sh` does
exactly that and prints the same report.

## 9. Dependencies

```
$ npm audit
katex  0.11.0 - 0.18.1
KaTeX: Existing prototype pollution can bypass trust restrictions - GHSA-238p-pmpm-9mq7
  micromark-extension-math → remark-math
3 low severity vulnerabilities
```

Assessment: **non-blocking.** `katex` is only pulled in by
`micromark-extension-math` (the `$…$` syntax parser of `remark-math`); this
site renders math with Temml, not KaTeX. The advisory needs pre-existing
prototype pollution in the same process. Everything runs at build time on
the author's machine, with the author's own Markdown as the only input. The
only "fix" (`npm audit fix --force`) downgrades remark-math to 3.0.1, a
breaking change. `npm run audit` uses `--audit-level=moderate`, so a
moderate or worse finding fails the check.

## 10. Accessibility

- **axe-core in jsdom**, tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa,
  best-practice`, all pages of both builds: **0 violations** (1304 + 2020
  passed rule checks). Layout-dependent rules (contrast, target size,
  scrollable regions) cannot run without a rendering engine and are covered
  below or by the browser suite.
- **Contrast**, computed from `tokens.css`; `global.css` is verified to
  contain no literal colours, so the table is complete. Lowest values per
  theme:

```
light  3.24:1 (min 3)   color-border-strong on color-surface – form control borders on surfaces
light  5.17:1 (min 4.5) code-comment on color-code-bg
light  6.65:1 (min 4.5) color-accent on color-bg – links
dark   4.07:1 (min 3)   color-border-strong on color-surface
dark   5.73:1 (min 4.5) code-comment on color-code-bg
dark   7.73:1 (min 4.5) color-muted on color-bg
✓ WCAG contrast: 34 colour pairs in light + dark meet WCAG 2.2 AA
```
  (Full table: `npm run check:contrast`.)
- **Without JavaScript** (static guarantees, verified in the HTML): all
  content is in the HTML; the theme toggle is `hidden` until JS reveals it,
  and the colour scheme follows `prefers-color-scheme` through CSS alone; the
  project filter controls are `hidden` and every project is listed; the
  search page shows a no-JS note with alternatives; the language switch is
  plain links. The browser suite checks these in a real browser (not run
  here).
- **Skip link, landmarks, focus:** skip link to `#main` on every page,
  `header`/`nav`/`main`/`footer`, visible `:focus-visible` outline in the
  accent colour (≥ 6:1 against both backgrounds). Reduced motion: the only
  transitions (120 ms colour/opacity) are switched off under
  `prefers-reduced-motion: reduce`.
- **Mobile from 320 px:** not measured in a browser (B2). Static review of
  `global.css`: every row (header, nav, tools, lists) uses `flex-wrap`;
  `pre`, tables and display math scroll horizontally inside their box;
  `overflow-wrap: break-word` on the body; grid columns changed to
  `minmax(0, 1fr)` in this run, so long values (URLs, a PGP fingerprint)
  cannot widen the page. No fixed widths above 2.25rem except `width: 100%`.
  The browser suite measures `scrollWidth` at 320/375/768/1280 px.

## 11. Performance (replacement for Lighthouse)

`node tools/page-weight.mjs dist`: HTML plus every resource fetched up front
(stylesheet, scripts and their imports, preloaded font, SVG icon):

| Page | Requests | Raw | gzip | JS (raw) |
|---|---|---|---|---|
| `/` | 5 | 66.7 KB | 53.0 KB | 0.5 KB |
| `/en/` | 6 | 71.9 KB | 54.7 KB | 1.0 KB |
| `/de/blog/` | 6 | 69.6 KB | 54.2 KB | 1.0 KB |
| `/en/projects/` | 7 | 73.0 KB | 55.2 KB | 2.1 KB |
| `/en/about/` | 6 | 73.3 KB | 55.5 KB | 1.0 KB |
| `/de/search/` | 7 | 72.2 KB | 55.5 KB | 3.3 KB |

About 48 KB of each total is the Inter woff2 (already compressed; counted
uncompressed in both columns). Before the redesign, `/` was ≈ 222 KB in about
10 requests, with 71 KB of JS and three animation loops (AUDIT §7). Math pages
additionally load the math font (394 KB woff2) once. Search loads
`search-index.json` on demand. No render-blocking third-party resource
exists. The only blocking script is the 13-line `/theme-init.js`.

## 12. Production build contains no drafts

```
✓ drafts hidden in production: 9 draft file(s), none of them in dist/ (60 output files scanned), all in dist-drafts/
```

Scanned: every `.html`, `.xml`, `.json` and `.txt` in `dist/` (pages, feeds,
sitemap, search index, llms.txt) for draft URLs and titles.

## 13. Not verified (open)

- Real-browser run: axe with rendered contrast, overflow measurements, no-JS
  rendering, theme toggle persistence and flash-free load, filter, search,
  cookies, third-party requests (`npm run check:browser`, B2).
- Lighthouse scores (B2).
- External links (lychee, CI).
- `caddy adapt` / `caddy validate` of the real proposal, and every
  server-side smoke test, including Aura before/after (B1; runs in
  `deploy/stage.sh` and `deploy/apply-on-server.sh`).
- The release scripts themselves were not executed (B3), only checked with
  ShellCheck and, for their Node parts, run.
