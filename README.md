# timurmanjosov.com

My personal welcome page — a small, honest "this is me" introduction, not a
portfolio showcase. Vanilla HTML/CSS/JS, no build step, no framework,
deployed as static files behind Caddy.

Design direction: Nord palette (light/dark, manual toggle + system default),
Space Grotesk/Inter/JetBrains Mono, bilingual DE/EN content, a Lissajous
curve as the one signature visual element.

## Preview locally

No build step — any static file server works:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser; the only thing that won't
work from a plain `file://` URL is the two toggles reading `localStorage`
in some browsers' stricter local-file security modes — serve it over HTTP
if you want to test those.

## Structure

```
index.html          Semantic HTML, all page content, both languages inline
styles/
  reset.css         Minimal modern CSS reset — no colors/type/layout here
  main.css          Design tokens, theming, layout, every section's styling
scripts/
  main.js           Theme + language toggle logic, scroll/load motion
assets/
  fonts/            Self-hosted variable fonts (woff2, Latin subset)
  images/           Favicon (svg + png fallbacks) and the OG share image
sitemap.xml
robots.txt
```

Everything is progressive enhancement: the page is fully readable and
usable with `scripts/main.js` absent — that file only adds the toggle
interactivity and the load/scroll motion, never anything load-bearing.

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

## Design tokens

All color/type/spacing decisions are custom properties in `styles/main.css`
(`:root`, plus theme overrides under `[data-theme]` and
`prefers-color-scheme`). Component CSS should always go through these
tokens rather than hardcoding a Nord hex value or a raw `px`/`rem` size.
