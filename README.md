# timurmanjosov.com

My personal welcome page — a small, honest "this is me" introduction, not a
portfolio showcase. Vanilla HTML/CSS/JS, no build step, no framework,
deployed as static files behind Caddy.

Design direction: Nord palette (light/dark, manual toggle + system default),
Space Grotesk/Inter/JetBrains Mono, bilingual DE/EN content. The signature
visual element isn't a static image: `scripts/system.js` runs a generative
engine on one full-page canvas that morphs, by scroll position, through
four mathematical systems — see "The generative system" below.

## Preview locally

No build step — any static file server works:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser; the only things that won't
work from a plain `file://` URL are the two toggles reading `localStorage`
in some browsers' stricter local-file security modes, and possibly
`IntersectionObserver` root behavior in older engines — serve it over HTTP
if you want to test those.

## Structure

```
index.html          Semantic HTML, all page content, both languages inline
styles/
  reset.css         Minimal modern CSS reset — no colors/type/layout here
  main.css          Design tokens, theming, layout, every section's styling
scripts/
  system.js         The generative engine (see below) — background canvas
                     + the two project-card live previews
  main.js           Theme + language toggle, scroll/load motion, the
                     generative section dividers
assets/
  fonts/            Self-hosted variable fonts (woff2, Latin subset)
  images/           Favicon (svg + png fallbacks) and the OG share image
sitemap.xml
robots.txt
```

Everything is progressive enhancement: the page is fully readable and
usable with both scripts absent — they only add toggle interactivity,
motion, and the generative visuals, never anything load-bearing. Without
JS, `#system-canvas` simply never gets drawn to (transparent, no visual
gap) and the four `<path class="divider-line">` elements are present but
empty (`d=""`), so the section dividers just don't render — everything
else on the page reads normally either way.

## The generative system (`scripts/system.js`)

One `<canvas id="system-canvas">`, fixed behind all content, on which a
small state manager blends between four independent mathematical systems
as the page scrolls:

| System | Anchor | What it is |
|---|---|---|
| De Jong attractor | `#hero` | A strange attractor (`x' = sin(ay) - cos(bx)`, `y' = sin(cx) - cos(dy)`), pointer/click-reactive |
| L-system | Epiphyte project card | A Prusinkiewicz fractal-plant ruleset that grows through depth cycles and fades |
| Cellular automaton | Saeculum project card | Elementary CA, Rule 90, sweeping out fresh "terrain" and reseeding |
| Fourier epicycles | `<footer>` | A hand-drawn "TM" monogram, DFT-decomposed into ~40 rotating circles that trace it in a slow, repeating loop |

**Crossfade:** each system's own anchor element is watched by an
`IntersectionObserver` (many thresholds, expanded `rootMargin`); the
reported intersection ratio becomes that system's target "weight", eased
continuously every frame. Every frame: one shared fade-to-background-color
rect is applied once, then every system's cheap `update()` runs
unconditionally, and only systems with non-negligible weight actually
`render()` (the expensive part) — scaled by their own weight. Two systems
both partially weighted, mid-scroll, is what makes the crossfade a genuine
blend rather than a swap.

**Interaction:** pointer position and "disturbance" pulses (on click) are
computed once per frame as shared input, then interpreted by whichever
system currently has weight — so interaction travels with the dominant
system rather than staying tied to one of them. The Fourier signature is a
deliberate exception: it never reads the disturbance boost and has no
click reaction at all, staying calm on purpose (it's the signature, not
another experiment) — pointer position only nudges its rotation speed
within a bounded range that always keeps drawing forward.

**Performance priority** (highest first): hero attractor > footer
signature > L-system/cellular automaton. Under sustained sub-50fps, a
tiered adaptive-quality step degrades the *lowest*-priority tier first,
moving to the next tier only once the current one is fully floored — see
the `degradeTiers` array in `system.js`. This is one-directional (never
recovers upward) to avoid visible flicker, same as the original scheme.

**Reduced motion:** no animated crossfade and no continuous render loop at
all — an `IntersectionObserver` still fires on real (user-driven) scroll
visibility changes, and each transition just jumps straight to that
system's `renderStatic()`, a single complete frame.

**Card previews:** Epiphyte's and Saeculum's project cards each contain
their own small, independent `<canvas data-preview="…">`, running a
smaller-scale version of that project's system (own timing, own state,
nothing shared with the background engine). Both pause via their own
`IntersectionObserver` when scrolled out of view, and are deliberately
throttled to ~15fps — an intentionally lower, structural budget, since
they're the first thing allowed to give under load, same spirit as the
degradation priority above. Both carry a visually-hidden text description
for screen readers (the canvases themselves are `aria-hidden`).

## Adding a project

Projects live in `#projects-list` in `index.html`, one `<li><article
class="project-card">` per project. Copy an existing one:

```html
<li>
  <article class="project-card" aria-labelledby="project-<slug>-heading">
    <h3 id="project-<slug>-heading">Name</h3>
    <p data-en="English description." data-de="German description.">
      English description.
    </p>
    <ul class="tech-tags" role="list" aria-label="Technologies used">
      <li>Some Tag</li>
    </ul>
    <a class="project-link" href="https://github.com/timur-manjosov/<repo>">
      <span data-en="View on GitHub" data-de="Auf GitHub ansehen">View on GitHub</span>
      <span class="link-arrow" aria-hidden="true">&rarr;</span>
    </a>
  </article>
</li>
```

The grid (`.project-grid`) and each card's own container query in
`main.css` already handle any number of cards — no CSS changes needed.
Only add a project here once it's real and shippable; this file is meant
to stay honest, not aspirational.

The little `.project-preview` canvas on the Epiphyte/Saeculum cards is
*not* part of this template — it's a bespoke, hand-wired live preview per
project (see `scripts/system.js`'s "CARD PREVIEWS" section), not something
new projects get automatically. A new project is just the markup above;
give it a live preview later, deliberately, only if it earns one.

## Adding/editing a translation

Every visible string carries its own translation as a `data-en`/`data-de`
attribute pair on the same element, e.g.:

```html
<p data-en="Hello." data-de="Hallo.">Hello.</p>
```

The element's actual text content is the English version (the fallback
language for visitors whose browser isn't German). `scripts/main.js`
swaps `textContent` between the two attributes on language toggle and on
load (based on saved preference, else `navigator.language`) — so adding a
new translatable string is just adding both attributes; no JS changes
needed. The one exception is the theme toggle's button label, which is
state-dependent (dark vs. light) and lives in a small `THEME_LABELS`
object directly in `main.js`.

## Section dividers

The four dividers (About/Projects/Sport/Contact) are generated, not
hand-drawn: `main.js`'s `initGenerativeDividers()` hashes each `<section>`
own `id` into a damped sine curve (frequency/phase/decay/amplitude all
derived from that hash) and writes it as an SVG `<path>`'s `d` attribute
at load. Same principle, a related-but-different curve per section,
deterministic across reloads rather than random. The existing
`.reveal-init`/`.is-visible` scroll-reveal draw-on animation in `main.css`
needs no changes to work with whatever curve gets generated — it only
relies on `pathLength="1"` normalizing stroke-dasharray/dashoffset,
regardless of the actual path geometry.

## Design tokens

All color/type/spacing decisions are custom properties in `styles/main.css`
(`:root`, plus theme overrides under `[data-theme]` and
`prefers-color-scheme`). Component CSS should always go through these
tokens rather than hardcoding a Nord hex value or a raw `px`/`rem` size.
The generative system in `system.js` follows the same rule at one remove:
it never hardcodes a color either, it resolves `--color-canvas` and
`--color-signal-ink` live (via a scratch-canvas trick, so `color-mix()`
resolves the same way it does everywhere else) and re-resolves them on
every theme change.
