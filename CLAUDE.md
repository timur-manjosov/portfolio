# CLAUDE.md

Guidance for working in this repo — condensed from `README.md` and
`AUDIT.md`, plus the structural rules that came out of the hub
restructuring (see `MIGRATION.md` for what specifically changed).

## Philosophy (unchanged since the original vanilla site)

- **Radical minimalism.** This is Timur Manjosov's personal welcome page —
  a small, honest "this is me," not a portfolio showcase, not a product.
- **No runtime framework, no client-side dependencies.** Everything shipped
  to the browser is hand-written HTML/CSS/ES5-style JS. `scripts/*.js`
  stay `function`-declaration style, no classes, no arrow functions
  outside callbacks, no bundler, no transpiling.
- **Progressive enhancement is a hard rule, not a nice-to-have.** The page
  must be fully readable and usable with both `<script>` tags absent:
  content visible, GitHub links live, default English copy, theme
  following the OS setting. JS only ever adds toggle interactivity,
  motion, and the generative canvas visuals — never anything load-bearing.
- **Nord palette**, light/dark (manual toggle + system default), Space
  Grotesk/Inter/JetBrains Mono, bilingual DE/EN content via `data-en`/
  `data-de` attribute pairs (see "Adding a translation" below).
- **Deployment stays static files behind Caddy.** See "Build & deploy"
  below for what that now actually means with 11ty in the picture.

## 11ty's role: authoring-time only

11ty is a **build-time HTML composer, not a runtime dependency.** It never
runs in the browser. Its only job is to stamp out `header`/`footer`/`nav`/
design tokens once instead of hand-copying them into every new page —
exactly the gap `AUDIT.md` §6 identified as blocking the hub. Node is only
needed to run the build (locally and/or once at deploy time); the
*deployed* artifact is still plain static HTML/CSS/JS, unchanged in kind
from before the migration.

If you're touching `styles/*.css` or `scripts/*.js`: nothing about how you
write those files changes. They're passthrough-copied verbatim into
`_site/`, not processed by 11ty at all.

## Structure

```
eleventy.config.js     11ty config: passthrough copy + dir mapping
package.json           @11ty/eleventy is the only devDependency
src/                   11ty INPUT — templates only, not shipped as-is
  _includes/
    layouts/base.njk      <html>/<head>/<body> shell, one per site
    partials/
      header.njk           brand + <nav> + lang/theme toggles
      footer.njk           copyright + Fourier signature description
  index.njk              home page content (front matter: title, description,
                          active, lastmod, sitemapPriority, tags: sitemap)
  lab.njk                 the /lab/ placeholder page, same shape
  sitemap.xml.njk         generates sitemap.xml from the `sitemap` tag
styles/                 passthrough-copied as-is
  tokens.css              page-agnostic: fonts, colors, type scale,
                          spacing, radii, motion timings (custom
                          properties only — no layout/component rules)
  main.css                layout + every component's styling
  reset.css               unchanged
scripts/                passthrough-copied as-is
  system.js               the generative engine (see below)
  main.js                 theme/language toggle, scroll motion, dividers
assets/                 passthrough-copied as-is (fonts, favicons, OG image)
robots.txt              passthrough-copied as-is
_site/                  BUILD OUTPUT — gitignored, never edit by hand
```

## Build & deploy

```sh
npm install       # installs @11ty/eleventy (the only devDependency)
npm run build     # -> _site/, for local inspection
npm start         # eleventy --serve, local preview with live reload
```

Deploying is one command from the ThinkPad: **`./ship.sh`**. It commits +
pushes whatever's dirty in the local repo (skipped if already clean), then
SSHes into the VPS (existing `netcup-vps` alias) and runs `deploy.sh`
there. `deploy.sh` does `git pull`, builds inside a disposable
`node:22-alpine` container (no Node/npm installed on the VPS host — Docker
is already there for Epiphyte/Aura, this just reuses it), verifies the
build actually produced output, and only then atomically flips a `current`
symlink to the new build — a failed build leaves the previous one live,
never a half-built or empty directory. Caddy's `root` on the VPS points at
that `current` symlink, not at the repo root or `_site/` directly — see
each script's own comments for the exact mechanics, and `MIGRATION.md`
"Deploy path" for how this replaced the old plain-`git pull` workflow. No
CI/CD pipeline exists or is planned — this stays a manually triggered,
single command.

`npm audit` reports 0 vulnerabilities as of 2026-08-14. Two high-severity
advisories were previously present, both in transitive dependencies of
`@11ty/eleventy` and both resolved by `npm audit fix` bumping within the
existing semver ranges (no major-version jumps, no code changes):
`brace-expansion` (build-time-only DoS via pathological glob input, fixed
1.1.16 → 1.1.18) and `js-yaml` (quadratic CPU consumption in `!!omap`
resolution, CVE-2026-59870 — present twice in the graph, once via
`gray-matter`'s bundled 3.x line at 3.15.0 → 3.15.1 and once via 11ty's
own direct 4.x dependency at 4.3.0 → 4.3.1). `gray-matter` is 11ty's
front-matter parser, so the `js-yaml` finding was a content-parsing attack
surface rather than the glob-pattern one `brace-expansion` covers — worth
distinguishing if a future advisory shows up in either dependency again.
Re-run `npm audit` after any `npm install`/lockfile change to confirm
this note is still accurate.

## Adding a new page to the hub

1. Create `src/<name>.njk`.
2. Front matter:
   ```yaml
   ---
   layout: layouts/base.njk
   title: "Page Title — Timur Manjosov"
   description: "One sentence, used for <meta description>, OG, and Twitter."
   active: <name>          # matches the nav entry to highlight, if any
   lastmod: "YYYY-MM-DD"   # quoted — see note below
   sitemapPriority: "0.x"  # quoted — see note below
   tags: sitemap           # include the page in sitemap.xml
   ---
   ```
   `lastmod`/`sitemapPriority` must be quoted strings, not bare YAML
   scalars — an unquoted date parses as a JS `Date` and renders as a long
   locale string instead of `YYYY-MM-DD`; an unquoted `1.0` loses its
   trailing zero.
3. Write plain HTML body content below the front matter — no wrapper
   `<html>`/`<head>`/`<body>`, `layouts/base.njk` supplies those along with
   header/footer/nav.
4. If the page should be reachable from the header nav, add a `<li>` to
   `src/_includes/partials/header.njk`'s `.site-nav` list, same shape as
   the existing entries.
5. `npm run build` and check `_site/<name>/index.html`.

This is exactly how `/lab/` was built — a two-line proof, not a template
to copy verbatim for real content.

## Adding a genuinely separate microsite

A "microsite" per `AUDIT.md` §6 (Discord bot dashboards, other tools) is a
**separate, independently deployed project** — its own repo/subdomain, not
a page under `src/` here. To keep it visually consistent with this hub:

- Copy `styles/tokens.css` (and `styles/reset.css` if useful) into that
  project as-is. It's deliberately page-agnostic: no component/layout
  rules, just the Nord custom properties.
- `scripts/system.js`'s `backgroundEngine()` reads its four anchor
  elements from `data-anchor-hero`/`-epiphyte`/`-saeculum`/`-footer`
  attributes on `#system-canvas`, falling back to this page's own ids
  (`hero`, `epiphyte-card`, `saeculum-card`, `site-footer`) if absent. A
  microsite can reuse the file completely unmodified by giving its own
  canvas element `data-anchor-hero="whatever-its-hero-is"` etc. — or by
  giving its own anchor elements those exact fallback ids. Any anchor
  that has no matching element on the page simply never activates (its
  system stays at weight 0 forever) rather than getting stuck visible.
- Link back to this hub, and add a link here (`header.njk`'s `.site-nav`)
  once the microsite is real and live — same "don't add it until it's
  shippable" discipline as `README.md`'s original project-card rule.

## Adding a project (unchanged from the original site)

Projects live as `<section class="project-section">` blocks nested inside
the `#works` section in `src/index.njk`, each containing one `<article
class="project-card">`. Copy an existing one (Epiphyte/Saeculum/Aura) as
the template — description text should stay traceable to that project's
own README/repo (a trailing HTML comment naming the source section is the
existing convention, see `MIGRATION.md`'s "Content restructuring" entry).
The grid sizing and each card's own container query in `main.css` already
handle any number of cards. Only add a project once it's real and
shippable.

The `.project-preview` canvas on the Epiphyte/Saeculum cards is a bespoke,
hand-wired live preview per project (`scripts/system.js`'s "CARD PREVIEWS"
section) — not something new projects get automatically.

## Adding/editing a translation

Every visible string carries `data-en`/`data-de` attributes on the same
element; `scripts/main.js` swaps `textContent` between them on toggle and
on load. Adding a new translatable string is just adding both attributes
— no JS changes needed. Exception: the theme toggle's label is
state-dependent and lives in `THEME_LABELS` directly in `main.js`.

## The generative system (`scripts/system.js`)

One `<canvas id="system-canvas">`, fixed behind all content, blending
between four systems as the page scrolls — De Jong attractor (hero),
L-system (Epiphyte card), Rule-90 cellular automaton (Saeculum card),
Fourier-epicycle "TM" signature (footer). Trigger mechanics are a single
`IntersectionObserver` (many thresholds, expanded `rootMargin`) whose
reported ratio becomes each system's eased "weight." Full technical
detail (crossfade, interaction model, degradation tiers, reduced-motion
behavior) is unchanged from the original `README.md` write-up except
where `MIGRATION.md` notes a specific fix. Two things worth knowing if
you're touching this file:

- **Anchors are configurable, not hardcoded** — see "Adding a genuinely
  separate microsite" above.
- **`prefers-reduced-motion` is observed live**, not just read once at
  load (`matchMedia(...).addEventListener("change", ...)`, mirroring the
  existing `prefers-color-scheme` pattern) — `enterReducedMotion()` /
  `enterAnimatedMotion()` switch modes on an actual runtime OS-level
  toggle, not just at page load.
