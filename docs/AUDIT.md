# Audit: timurmanjosov.com, current state before the redesign

Snapshot taken 2026-10-26 on branch `redesign` at commit `ea40ee1` (tag
`pre-redesign`). Measured and read, not assumed. Earlier audits
(`AUDIT.md` from 2026-07-29 and `PORTFOLIO_ANALYSE.md` from 2026-07-23 in the
repo root) describe older states and are kept as history.

## 1. Repository and build

| Aspect | Finding |
|---|---|
| Generator | **Eleventy 3.1.6** (confirmed in `package.json`/`node_modules`), Nunjucks templates under `src/`. Latest 3.x is 3.1.7. Eleventy v4 is in alpha and will be renamed "Build Awesome". |
| Dev dependencies | `@11ty/eleventy ^3.1.6`, `playwright ^1.62.1` (latest 1.64.1). No runtime dependencies. |
| `npm audit` | **3 high**, all transitive via Eleventy and all build-time only: `brace-expansion <=1.1.20` (3 ReDoS/recursion advisories), `js-yaml` (GHSA-2883-xcg3-v3hh, merge-key CPU use), `markdown-it <=14.3.2` (4 quadratic-time advisories). None can reach a visitor, because the content author is the only input source. The `CLAUDE.md` claim "0 vulnerabilities as of 2026-08-14" is outdated. |
| Source size | `scripts/system.js` 1400 lines (58 KB), `scripts/main.js` 342 lines (13 KB), `styles/main.css` 605 lines (17 KB), `tokens.css` 170, `reset.css` 109. |
| Templates | `layouts/base.njk`, `partials/header.njk`, `partials/footer.njk`, pages `index.njk`, `lab.njk`, `sitemap.xml.njk`. |
| Tests/CI | None in the repo. `playwright` is declared but no test files exist. |
| Lint/format | None configured. |
| Other root files | `AUDIT.md`, `MIGRATION.md`, `PORTFOLIO_ANALYSE.md`, `CLAUDE.md`, `README.md`, `ship.sh`, `deploy.sh`, `prompts/` (gitignored). |

## 2. Pages and every piece of content

Only two HTML pages exist, plus `sitemap.xml` and `robots.txt`.

### `/` (src/index.njk)
- Hero: eyebrow "Welcome/Willkommen", h1 "Timur Manjosov", tagline (EN/DE):
  "Mathematics, code — and the conviction that you only truly understand
  something once you've built it yourself."
- About: one long bilingual paragraph (distance-learning maths at FernUni
  Hagen, programming as where maths becomes tangible, thorough/independent
  approach, game theory, Arch Linux/Neovim/containerised own projects, the
  four self-built mathematical systems).
- Works: three project cards with bilingual descriptions sourced from each
  repo's README (HTML comments name the source sections):
  - **Epiphyte**: Discord bot, one living plant per server, six signals,
    default intents only. Python, discord.py. GitHub link.
  - **Saeculum**: terminal world simulator, causal event history, seeded.
    Python. GitHub link.
  - **Aura**: Discord bot that "knows the server", Phase 0, "Work in
    progress" badge, no link.
- Contact: GitHub only (`github.com/timur-manjosov`).
- Footer: "© 2026 Timur Manjosov" + visually hidden description of the
  Fourier "TM" signature animation.

### `/lab/` (src/lab.njk)
Placeholder that only proves the shared layout works. No real content.

### Machine-readable files
- `sitemap.xml`: `/` and `/lab/`, no language alternates.
- `robots.txt`: allow all, sitemap link.
- No JSON-LD, no feeds, no `llms.txt`, no `security.txt`, no 404 page
  (live: `GET /does-not-exist` → `404` with an **empty body**).

## 3. Assets

| File | Size | Use |
|---|---|---|
| `assets/fonts/inter-variable-latin.woff2` | 48 KB | body text |
| `assets/fonts/space-grotesk-variable-latin.woff2` | 22 KB | headings |
| `assets/fonts/jetbrains-mono-variable-latin.woff2` | 31 KB | mono |
| `assets/images/og-image.png` | 83 KB | OG/Twitter image, 1200×630 |
| `assets/images/favicon.svg`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` | 2/0.6/1.7/10 KB | favicons |

All three fonts are preloaded on every page (~101 KB before any content).

## 4. i18n

- Purely client-side: each element carries `data-en`/`data-de`, and
  `main.js` swaps `textContent`. The HTML ships English only.
- Consequences: one URL for both languages, no `hreflang`, German content is
  invisible to crawlers and to visitors without JS, `<html lang="en">` stays
  English even when German text is shown (screen readers then pronounce
  German with English rules).

## 5. SEO and metadata

- Present: title, description, canonical, Open Graph, Twitter card,
  favicons, `color-scheme`.
- Missing: JSON-LD (`Person`/`WebSite`), `hreflang`, feeds, `rel="me"`,
  per-language URLs.
- `og:locale` claims `en_US` with alternate `de_DE`, but no German URL exists.
- `www.timurmanjosov.com` returns `200` with the same content instead of
  redirecting to the apex. This creates duplicate content (canonical
  mitigates it partially).

## 6. Accessibility

Good basics: skip link, landmarks (`header`/`nav`/`main`/`footer`), heading
order h1→h2→h3, `aria-pressed` on toggles, `:focus-visible`, documented
contrast fixes. Weak points:
- `lang` attribute does not follow the displayed language (see §4).
- Project details are revealed by hover/focus. The toggle's `aria-expanded`
  logic needed several fixes (GH #4, #18), which shows how fragile that is.
- Full-page animated canvas behind all text. Reduced motion is respected,
  but the visual noise is exactly what the new brief rejects.

## 7. Performance (measured on the built `_site/` and the live site)

| Measure | Value |
|---|---|
| `/` HTML | 24.1 KB (live `content-length: 24094`) |
| CSS (3 files) | 25.8 KB |
| JS (2 files) | 70.6 KB (`system.js` 57.9 KB) |
| Fonts preloaded | 101.9 KB |
| Requests on `/` | HTML + 3 CSS + 2 JS + 3 fonts + favicon ≈ 10 |
| Total on `/` | ≈ 222 KB uncompressed |

Three `requestAnimationFrame` loops can run at once (background + two
card previews). That makes CPU/battery use the main runtime cost, not
transfer size. No Lighthouse run was possible at this point (no system
Chromium; see `docs/VERIFICATION.md` for what was measured later).

## 8. Deployment (read from repo and server, 2026-10-26)

- **Repo side:** `ship.sh` (local) commits + pushes everything dirty and
  then runs `deploy.sh` on the VPS over SSH. `deploy.sh` runs `git pull`
  in the web root, builds in a disposable container into one of two
  slots, and flips the relative symlink `current`.
- **Server side (read-only check):**
  - Caddy as a systemd service, config at Caddy's default path.
  - The web root is a git checkout owned by an unprivileged user;
    `current` is a relative symlink to the active slot, and an old
    bootstrap snapshot is still there. There is no `releases/` directory.
  - (Revision 2: exact paths, versions and account names were removed from
    this file; the repository is public. `docs/BLOCKERS.md` R2-B1.)
  - Site block `timurmanjosov.com, www.timurmanjosov.com`: `root` on
    `current`, HSTS (with `includeSubDomains`), `nosniff`,
    `Referrer-Policy strict-origin-when-cross-origin`, `X-Frame-Options
    DENY`, strict CSP (`default-src 'self'`, script hash for the inline
    theme snippet, `object-src 'none'`, `base-uri 'none'`, `form-action
    'none'`, `frame-ancestors 'none'`), `Cache-Control: public,
    max-age=3600` on `/styles/ /scripts/ /assets/`, `encode gzip zstd`.
    **No `log` directive → no access log for this site**, no
    `Permissions-Policy`, no custom 404 handling.
  - A separate `aura.timurmanjosov.com` block (reverse proxy to a local
    frontend, own headers and access log) must not be touched.
- **Live reference (2026-10-26 16:38 UTC):** `https://timurmanjosov.com/` →
  `200` with the headers above. `http://` → `308` to https.
  `https://aura.timurmanjosov.com/` → `200`, `x-robots-tag: noindex`, own CSP
  (Next.js frontend).

## 9. What to keep and what to drop

**Keep (content and assets):**
- All bilingual texts: tagline, About paragraph, the three project
  descriptions (Epiphyte, Saeculum, Aura) with their source notes.
- GitHub as a contact channel.
- Inter variable font, favicons, OG image (until a new one exists).
- Principles that carry over: no runtime third-party requests, progressive
  enhancement, strict CSP compatibility, Nord-derived palette, light/dark +
  manual toggle without flash, self-hosted fonts.
- Deployment idea: build elsewhere, atomic symlink flip, previous build
  stays live on failure.

**Drop or replace:**
- The generative canvas engine (`system.js`), card previews, hover-expand
  tiles, generated SVG dividers, scroll reveals. The brief explicitly asks
  for calm instead of effects. The code stays reachable through the tag
  `pre-redesign` (see `docs/DECISIONS.md`).
- Client-side i18n via `data-*` attributes → real per-language URLs.
- The inline theme script with its hand-maintained CSP hash → an external
  blocking file (the CSP can then drop the hash and get stricter).
- Space Grotesk and JetBrains Mono → a single text font plus the system
  monospace stack.
- `/lab/` placeholder (no content; redirected, see redirect table).
- Server-side `git pull` + Docker build → upload a locally built,
  checksummed archive (no build tooling needed on the server).
