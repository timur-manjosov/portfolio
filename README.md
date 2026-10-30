# timurmanjosov.com

Personal hub of Timur Manjosov: who I am, what I build, what I write and
where else to find me. Bilingual (German/English), static, no cookies, no
trackers, no third-party requests.

Built with [Astro 7](https://astro.build/) as a fully static site and served
by Caddy on my own server. Why Astro: [`docs/adr/0001-stack.md`](docs/adr/0001-stack.md).

## Setup

```sh
npm ci          # Node ≥ 22
npm run dev     # http://localhost:4321, drafts visible, live reload
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (drafts included) |
| `npm run build` | Production build → `dist/` (drafts excluded) |
| `npm run build:drafts` | Preview build with drafts → `dist-drafts/` (all `noindex`) |
| `npm run serve` | Serve `dist/` with the production headers and redirects (port 4321) |
| `npm run new:post`, `new:project` | Scaffold a post or project as a draft (see below) |
| `npm run edit -- <page \| post <slug> \| project <slug>>`, `edit:now` | Open the file in `$EDITOR`; sets `updated` on pages/projects, validates the frontmatter |
| `npm run publish -- --target <ssh-target>` | Content update after the first go-live: build, change overview, confirm, switch, HTTP check (`--dry-run`, `--rollback`; `docs/PUBLISHING.md`) |
| `npm run check` | **The gate**: lint, types, both builds, CSP, links, HTML, SEO/JSON-LD, HTTP, contrast, dark-palette snapshot, axe, drafts filter, leak check, build modes, fixtures, scheduled posts, languages per post, publish (local target), scaffolder/editor round trip, images, GitHub metadata, posts on every surface, pre-push exit codes, Caddy generator, i18n report, `npm audit` |
| `npm run check:articles:system` | Reruns every computation of the blog posts (`tests/articles/`; Python 3 + system Chromium) |
| `npm run check:browser` | Playwright + axe in Chromium: light/dark, 320–1280 px, no-JS, cookies, third parties, CSP violations, toggles, search, feeds, redirects, language door (`npx playwright install chromium` once) |
| `npm run check:browser:system` | the same with the installed `/usr/bin/chromium` (no browser download) |
| `npm run report:i18n` | Missing translations + texts still in `draft-review` → `reports/` |
| `npm run report:weight` | Page weight and request count per page |
| `npm run format` | Biome: format + safe fixes |
| `npm run caddy:example` | Regenerate `deploy/Caddyfile.example` from `deploy/site-config.json` |
| `npm run check:prepush` | GO / NO-GO for every commit a push would upload: private values, server details, tokens, non-noreply e-mails, files that belong in `.gitignore` (`docs/GO-LIVE.md` step 3) |
| `npm run check:dark-tokens` | Dark palette against its snapshot (part of `check`); `-- --update` only after a deliberate decision |
| `node tools/screenshots.mjs` | Design review screenshots, light + dark, overflow at 320 px → `.screenshots/` |
| `node tools/brand-assets.mjs` | Re-render the Open Graph image and the favicons from the tokens |

## Checks: CI and local

CI (`.github/workflows/check.yml`, on pushes to `main`/`redesign` and on
pull requests) runs `npm run check`, the browser suite with a Chromium it
installs itself, ShellCheck, the Caddyfile example check, `caddy adapt`
and an external link check (lychee). Read-only token, no secrets, no
private file (public build mode), and it never deploys.

Only local: `npm run check:prepush` (needs your history and private
files), the release rehearsal (`deploy/build-release.sh --test-only`),
Lighthouse (`npx lighthouse@13 … --chrome-path=/usr/bin/chromium` against
`npm run serve`), the screenshot review, and everything on the server.

## Content workflow

All content is Markdown in `src/content/`, validated against the schemas in
`src/lib/content-schemas.ts` (used by `src/content.config.ts` and by the
editing tools) on every build (a missing date or an unknown category fails
the build). Writing and publishing without touching code, in German:
[`docs/PUBLISHING.md`](docs/PUBLISHING.md).

```
src/content/
  blog/<de|en>/<slug>.md       posts
  projects/<de|en>/<slug>.md   projects
  pages/<de|en>/<slug>.md      about, now, uses, contact, privacy, imprint
  categories.yaml              blog categories (add one here, no code change)
src/data/site.ts               public facts (name, GitHub, university); private ones come from private/ (below)
src/i18n/ui.ts                 all interface strings, DE + EN (type-checked parity)
```

**New post or project** (pre-filled frontmatter, starts as `draft: true`):

```sh
npm run new:post -- --title "Primzahltests" --lang de --category math-crypto
npm run new:project -- --title "Mein Projekt" --lang both
npm run new                                   # interactive
```

- **Dates and scheduling:** `date` is today (Europe/Berlin) by default. A
  post dated in the future is left out of production builds completely
  and appears with the first build on or after its date
  (`src/lib/schedule.ts`); dev and test builds show it as "scheduled".
- **Images:** next to the post (`blog/<lang>/<slug>/figure.png`, written
  `![alt text](./<slug>/figure.png)`), optimised at build time; missing alt
  text, external or raw-HTML images fail the build.
- **Test fixtures:** the example posts live in `tests/fixtures/blog/` and
  are loaded only by test builds (`build:drafts`, `--fixtures`); production
  and release builds never contain them (`check:fixtures`).

- **Translations:** a file with the same slug in `de/` and `en/` is a
  translation (or set the same `translationKey` in both). A missing
  translation is fine: the switcher says so honestly and links to the other
  language's overview. `npm run report:i18n` lists them.
- **Drafts:** `draft: true` → visible in `npm run dev` and `build:drafts`,
  never in production (`check:drafts-hidden` enforces it).
- **Maths:** `$…$` inline, `$$…$$` as a block. Rendered to MathML at build
  time; a TeX error fails the build.
- **Code:** fenced blocks with a language, highlighted at build time.
- **Footnotes** (`[^1]`), **table of contents** (automatic from three h2/h3
  headings, or `toc: true|false`), **series** (`series` + `seriesPart`),
  **opinion pieces** (category `opinion` gets a visible label and date).
- **Projects:** `stage` (active, in-development, maintained, paused,
  archived), `tags`, `stack`, `links.repo|website|release`, `updated`,
  `featured`, `order`, optional `repo: owner/name` (public GitHub facts at
  release time fill an empty `stack` and `links.repo`; hand-written values
  win; off unless `GITHUB_META=1`, which `publish` sets).
- **Now page:** `src/content/pages/<lang>/now.md` (`npm run edit:now` sets
  `updated`). The home page shows its `summary`.

Open content questions: [`CONTENT-TODO.md`](CONTENT-TODO.md).

## Private data

Some values belong on the website but not in this repository: the contact
e-mail address, the PGP key, further accounts, the controller named in the
privacy policy, imprint data and optional extra text for the About page.
They live in `private/site.private.yaml`. `private/` is git-ignored; only
the field reference [`site.private.example.yaml`](site.private.example.yaml)
is committed. Schema with error messages per field:
`src/lib/private-schema.ts`. Every private value reaches the site through
one place (`src/data/private.ts` → `src/data/site.ts`).

```sh
cp site.private.example.yaml private/site.private.yaml   # then fill in real values
npm run build                       # public mode: no private file needed, private sections left out
npm run build -- --private private/site.private.yaml     # public mode with private data (preview)
npm run dev:private                 # dev server with private data
npm run build:release               # release mode (deploy/build-release.sh uses it)
```

- **Public mode** (default, CI): without a private file every section that
  needs a private value is left out, without placeholders. No imprint page,
  no security.txt, no key file.
- **Release mode** (`--release`, path via `--private <file>`): needs at
  least `contact.email` and `legal.controller`, and fails on test values
  (`example.invalid`) and on any visible `TODO(` in the output. Texts still
  marked `status: draft-review` only produce a counted warning.
- **Imprint:** the page and its footer link exist only when `legal.imprint`
  has name, address and e-mail.
- **Leak check:** `npm run check:private` (part of `npm run check`) searches
  every tracked, staged and not-ignored file for the values of every
  `private/*.yaml` and fails on a hit, without printing the value. The same
  check as a pre-commit hook: `git config core.hooksPath .githooks`
  (not enabled by default; `git config --unset core.hooksPath` turns it off).

**What `private/` does not do:** it does not make anything secret. Whatever
the site renders (your e-mail address, the imprint) is public the moment the
site is live. `private/` only keeps these values out of the git repository
and its history, so that publishing the source does not publish them a
second time, in a form that cannot be taken back.

## Deployment

Build locally, upload a checksummed archive, switch a symlink on the server:

```sh
./ship.sh <ssh-target> [--private <file>]   # build-release → stage → confirm → dry run → apply (sudo)
```

First go-live in ten steps (step 3: the clean push): [`docs/GO-LIVE.md`](docs/GO-LIVE.md). Details,
the Caddy configuration, checks after go-live and rollback:
[`docs/DEPLOY.md`](docs/DEPLOY.md).

Every later content update, without touching Caddy:

```sh
npm run publish -- --target <ssh-target> [--dry-run | --rollback]
```

It reuses `deploy/build-release.sh`, uploads only the content, switches the
`current` symlink with one `sudo`, checks over HTTP and switches back on
failure ([`docs/PUBLISHING.md`](docs/PUBLISHING.md), DECISIONS R5-D4).

`/` redirects (302) to `/de/` or `/en/` by the first `Accept-Language`
entry (default English); every other URL is stable. The rule lives in
`deploy/site-config.json` → `languageDoor`.

## Principles

- Static HTML; JavaScript only where it helps (theme toggle, project filter,
  search, reveal on scroll; 2–5 KB per page). Everything works without JS.
- Runs under a strict CSP (`default-src 'self'`, no `'unsafe-inline'`): no
  inline scripts or styles, enforced by `tools/check-csp.mjs`.
- No runtime requests to third parties, no cookies, no analytics.
- WCAG 2.2 AA, one `h1` per page, semantic landmarks, JSON-LD.
- Design: light mode after Material 3 (blue primary, petrol second
  accent), dark mode violet and teal (frozen by a snapshot); one box
  construction (outlined, filled, elevated), quiet motion on interaction
  only, no animation loops or canvas; OS preference plus a manual switch;
  tokens in `src/styles/tokens.css`, every text/background pair (gradients
  and state layers included) checked for WCAG AA by
  `tools/check-contrast.mjs`.

## Documentation

- [`docs/AUDIT.md`](docs/AUDIT.md): state before the redesign
- [`docs/GAP.md`](docs/GAP.md): target vs. state
- [`docs/adr/0001-stack.md`](docs/adr/0001-stack.md): stack decision
- [`docs/DECISIONS.md`](docs/DECISIONS.md): all other decisions, redirect table
- [`docs/VERIFICATION.md`](docs/VERIFICATION.md): measured results
- [`docs/GO-LIVE.md`](docs/GO-LIVE.md): first go-live, step by step
- [`docs/PUBLISHING.md`](docs/PUBLISHING.md): writing and publishing without code (German)
- [`docs/DEPLOY.md`](docs/DEPLOY.md): deployment and rollback
- [`docs/BLOCKERS.md`](docs/BLOCKERS.md), [`docs/FINAL-REPORT.md`](docs/FINAL-REPORT.md)
- `docs/history/`: audits and migration notes of the earlier versions

The previous site (Eleventy, generative canvas) is preserved under the git
tag `pre-redesign`.
