# Migration: single-page site → 11ty hub

What structurally changed vs. the pre-`AUDIT.md` state (HEAD `26322aa`), so
it's clear what moved where and why. See `AUDIT.md` for the findings this
addresses and `CLAUDE.md` for the resulting day-to-day rules.

## File moves

| Before | After | Why |
|---|---|---|
| `index.html` (root, 299 lines: full document) | `src/index.njk` (content only) + `src/_includes/layouts/base.njk` (shell) + `src/_includes/partials/header.njk`/`footer.njk` | `AUDIT.md` §6: header/footer/tokens weren't extractable — every future page would've had to hand-copy the whole document. |
| `sitemap.xml` (root, hand-written, one `<url>`) | `src/sitemap.xml.njk` (generated from pages tagged `sitemap`) | Now reflects both real pages instead of needing manual edits per new page. |
| — | `src/lab.njk` | New: a second, deliberately minimal page proving the hub pattern (shared layout/header/footer/nav) actually works. |
| `styles/main.css` (tokens + components, one file) | `styles/tokens.css` (tokens only) + `styles/main.css` (components/layout only) | `AUDIT.md` §6 design decision: tokens need to be page-agnostic and includable on their own by a future microsite that doesn't want this site's component CSS. |
| `assets/images/og-image.svg` | removed | Verified dead (`AUDIT.md` §4): no reference in HTML/CSS/JS anywhere, `og-image.png` is what's actually used in `<meta property="og:image">`. |
| — | `eleventy.config.js`, `package.json`, `_site/` (gitignored) | New: the 11ty build itself. `_site/` is now the actual deploy artifact — see `CLAUDE.md` "Build & deploy". |

`robots.txt` and `styles/reset.css` are unchanged and still passthrough-
copied as-is; `scripts/main.js` and `scripts/system.js` stay in place
(passthrough-copied, not templated) with the fixes below.

## Bug fixes (all five from `AUDIT.md` §4, in `scripts/system.js`)

Each is marked in the code with a `// Fix for AUDIT.md §4/§6: ...` comment
at its exact location.

1. **`dejong` no longer starts at `weight`/`targetWeight: 1`.** It now
   starts at `0`, same as the other three systems, and is driven entirely
   by the real `IntersectionObserver` callback for `#hero`. A page missing
   `#hero` (like `/lab/`) now correctly never renders the attractor,
   instead of it being stuck permanently at full opacity.
2. **`prefers-reduced-motion` is observed live.** A
   `matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", ...)`
   listener (mirroring the existing `prefers-color-scheme` pattern) now
   switches between the animated crossfade and the static reduced-motion
   render live, via `enterReducedMotion()`/`enterAnimatedMotion()`,
   instead of only being read once at load.
3. **One resize listener, one path.** The previous unconditional
   top-level listener (which only ever set a flag `tick()` would consume
   — except `tick()` never runs under reduced motion) plus reduced
   motion's own second, independent listener are now a single
   `handleResize()` that branches once on the current mode.
4. **`shared.scrollProgress` removed.** It was recomputed every frame but
   never read by any system — deleted rather than kept as a dead field.
5. **`resolveColor()` no longer depends on canvas readback for known CSS
   shapes.** Plain hex/`rgb()` values and the one `color-mix()` shape this
   site actually uses (`--color-signal-ink` in the light theme) are now
   parsed directly from the computed custom-property string, with no
   canvas involved at all. The old canvas-roundtrip trick only remains as
   a last-resort path for CSS this parser doesn't recognize, and even
   then a canary probe checks the readback is trustworthy first, falling
   back to a hardcoded color otherwise — so canvas-fingerprinting guards
   (Tor Browser, `resistFingerprinting`, etc.) can no longer make the
   generative system render in subtly wrong colors.

Also fixed, per the same section's design decisions:

- **`backgroundEngine()`'s anchor ids are configurable** via
  `data-anchor-hero`/`-epiphyte`/`-saeculum`/`-footer` attributes on
  `#system-canvas`, defaulting to this page's current ids. Previously
  hardcoded `getElementById` calls meant the file could only ever work on
  this exact page.
- **A real `<nav>` landmark** now exists in `header.njk` — jump links to
  `#projects-heading`/`#contact-heading` plus a cross-page link to
  `/lab/`. There was no `<nav>` element anywhere before.

## Content restructuring: `#about` + `#works` replace the chapter structure

`src/index.njk`'s old alternating `#chapter-1` → `#project-epiphyte` →
`#chapter-2` → `#project-saeculum` → `#project-aura` → `#chapter-3` structure
(six top-level `main > section` elements, the bio dissolved into three
fragments between the project cards) is replaced by exactly two new
top-level sections between `#hero` and `#contact`:

- **`#about`** — the bio, now one self-contained block instead of three
  scattered fragments. Same content, no longer split.
- **`#works`** — all three projects (Epiphyte, Saeculum, Aura), each still
  its own nested `<section class="project-section">` / `<article
  class="project-card">` pair (unchanged shape, see `CLAUDE.md`'s "Adding a
  project"), but now siblings inside one `#works` section instead of being
  interleaved with chapter text. Each project's description is
  substantially expanded from the old one-line summary — sourced from that
  project's own `README.md` (Epiphyte/Saeculum) or intro text (Aura, still
  Phase 0), with an HTML comment after each `<p>` naming which section(s)
  of the source it draws from, so the copy can be checked against the
  source before anything goes live.

Anchor ids the generative background engine depends on (`#hero`,
`#epiphyte-card`, `#saeculum-card`, `#site-footer`) are untouched — they
moved deeper in the DOM (nested inside `#works` now) but kept their exact
ids, so `scripts/system.js`'s `IntersectionObserver` triggers exactly as
before; the DOM nesting depth doesn't matter, only the elements' own
visibility.

New pieces that support the restructuring:

- `styles/tokens.css`: a new `--space-10` spacing token — the gap between
  the four main areas (hero/about/works/contact) needed to read as more
  generous than the old chapter-to-project rhythm (`--space-8`), and
  `--space-9` was already spoken for (hero's own top padding), so reusing
  it here would have made the hero gap and the inter-section gap look
  identical. The gap *between* the three works entries reuses the existing
  `--space-9` rather than adding another token.
- `scripts/main.js`: a new `initWorksReveal()` — the three project entries
  in `#works` fade in together, staggered (via per-entry `transition-delay`
  in `main.css`), the moment `#works` scrolls into view. One
  `IntersectionObserver` on `#works` itself, reusing the existing
  `.reveal-init`/`.is-visible` CSS mechanism (same one `initScrollReveal`
  already used) — no new animation system. Returns early under
  `prefers-reduced-motion`, same as every other reveal on this page, so
  entries just stay fully visible with no stagger at all.
- `src/_includes/partials/header.njk`: the nav's jump links updated from
  `#projects-heading`/`#contact-heading` to `#about-heading`/`#works-heading`/
  `#contact-heading` (heading ids changed along with the section rename,
  and About is now a real, linkable top-level section).

## Deploy path

The 11ty build step means the old VPS-side workflow (`git pull`, since the
served tree was plain static files) can't just keep working unchanged —
something has to actually run `eleventy` between the pull and what Caddy
serves.

| Before | After |
|---|---|
| Manual: SSH in, `git pull` in `/var/www/timurmanjosov.com`, done — Caddy's `root` pointed straight at the repo. | One local command, two automated phases: `./ship.sh` on the ThinkPad commits/pushes local changes, then SSHes to the VPS (`netcup-vps` alias) and runs `deploy.sh` there. |
| No build step; nothing to fail. | `deploy.sh`: `git pull` → build in a disposable `node:22-alpine` container → verify output → atomic `current` symlink swap. A failed build leaves the previously-deployed version live. |
| Caddy `root` = repo root. | Caddy `root` = `/var/www/timurmanjosov.com/current` (a symlink Caddy never needs reloading for — only the symlink target changes per deploy, not the Caddyfile). |
| Node/npm: not applicable (no build). | Still not installed on the VPS host — the build runs inside a throwaway container, reusing the Docker already running there for Epiphyte/Aura. |

No CI/CD was added — this is still a manually triggered, single-command
deploy, just one that now handles the build step instead of assuming
there isn't one.

### One-time cutover (Caddyfile)

The VPS's `/etc/caddy/Caddyfile` still has `root * /var/www/timurmanjosov.com`
(pointing at the repo root, the pre-migration layout). A `current` symlink
has already been bootstrapped on the VPS pointing at `_site.bootstrap/`, a
snapshot of the exact files live right now — so flipping the Caddyfile
over is a no-op for visitors, not a cutover with a visible gap. This last
step needs a password for `sudo` that isn't available non-interactively,
so it's a manual, one-time action on the VPS:

```sh
sudo sed -i 's#root \* /var/www/timurmanjosov.com#root * /var/www/timurmanjosov.com/current#' /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

After that, every future `./ship.sh` only flips what `current` points to —
the Caddyfile itself never needs touching or reloading again.

## What did NOT change

- The rendered `<main>` content for the home page is structurally
  byte-identical to before (verified via diff) — same sections, same
  ids/classes — so `main.css` and `system.js` needed zero selector changes
  to keep working.
- The four generative systems' math, timing, and degradation logic are
  untouched.
- `PORTFOLIO_ANALYSE.md`'s fate is still the user's call (unchanged from
  `AUDIT.md`'s own stance) — not touched by this migration.
- No CI/CD pipeline was added — only the local build command is
  documented (`CLAUDE.md`).

## Werke-Grid mit Hover-Expand

`#works`'s three project entries moved from full-width stacked blocks to a
compact three-tile grid, wrapped in a new `.works-grid` div around the
existing `.project-section` elements in `src/index.njk`. No project
description text changed — only how it's presented at rest vs. expanded.

- **Grid, not a breakpoint.** `.works-grid` uses
  `grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr))` — no new
  viewport media query (`main.css` had none for layout before this), it
  folds from 3 columns down to 1 purely from available width.
- **Compact by default.** Each tile shows title, preview canvas (Epiphyte/
  Saeculum) or status badge (Aura, still no preview), and tech tags. The
  full description — same `<p>` and source comment as before — now lives
  in a `.project-detail`/`.project-detail-inner` wrapper, collapsed via a
  `grid-template-rows: 0fr → 1fr` transition (animates height without any
  JS `scrollHeight` measurement) plus an opacity fade on the inner
  wrapper. It's never `display: none` or `aria-hidden` — it stays in the
  DOM and the accessibility tree at all times, just visually zero-height
  at rest, so screen reader users can reach it independent of the visual
  state.
- **Three equivalent triggers.** `.project-card:hover`,
  `.project-card:focus-within`, and `.project-card.is-expanded` all map to
  the identical expanded CSS in `main.css` — real mouse hover, keyboard
  focus landing anywhere inside the tile (including via Tab reaching the
  title), and a JS-driven persisted click/tap toggle all produce the same
  visible result. The first two need zero JS at all: a `<button
  class="project-toggle">` wrapping each `<h3>`'s text means tabbing to
  the title alone already triggers `:focus-within` and reveals the
  detail — this keeps working with `<script>` absent, per `CLAUDE.md`'s
  progressive-enhancement rule.
- **JS only adds what CSS can't:** `scripts/main.js`'s `initProjectTiles()`
  turns the click/tap into a real toggle (persists open past a stray
  blur, sets `aria-expanded` truthfully) and enforces that at most one
  tile is expanded at a time — clicking, hovering, or focusing into a tile
  collapses any other tile currently pinned open by a prior click.
- **No layout collision:** an expanded tile only grows taller within its
  own grid column (`align-items: start` on `.works-grid`, `.project-card`
  never spans extra columns) — it never overlaps a neighboring tile,
  regardless of how many tiles are simultaneously mid-transition.
- **`prefers-reduced-motion` needs no special-casing here** — `reset.css`
  already collapses every `transition-duration` to near-zero globally, so
  the same expand/collapse CSS just stops animating; the interaction
  itself (hover/focus/click all still reveal the detail) is unaffected.
- **Anchor ids unchanged.** `#epiphyte-card`/`#saeculum-card` stayed on
  the exact same `<article class="project-card">` elements — only their
  internal children changed shape — so `scripts/system.js`'s
  `IntersectionObserver` anchors and its `epiphyte-card` `pointerenter`
  growth-boost listener, plus the `[data-preview="lsystem"]`/`[data-
  preview="ca"]` canvas lookups, needed zero changes.
