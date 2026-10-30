# CLAUDE.md

Guidance for working in this repo. Since the 2026-10 redesign the site is an
Astro 7 static site (personal hub: about, projects, blog, now, links,
contact; DE + EN). User-facing docs: `README.md`. Decisions and their
reasons: `docs/DECISIONS.md`, `docs/adr/0001-stack.md`. The previous
Eleventy site lives under the tag `pre-redesign` and in `docs/history/`.

## Philosophy

- **Calm, content-driven.** A personal hub that grows through content
  (posts, /now, project status), not through effects. No canvas engines,
  parallax, scroll-linked effects or hover tricks. Since revision 2: two
  accents (violet, teal), static CSS gradients and tonal surfaces, all as
  tokens; no animation loops. Since revision 3: light weights (headings
  ≤ 600), unfilled cards with 1px contours, and subtle motion only on
  interaction and when content first appears (opacity/transform, 150–300 ms,
  motion tokens in `tokens.css`; nothing moves under reduced motion).
  Since revision 4: light mode after Material 3 (blue primary), dark mode
  frozen by `tools/fixtures/dark-tokens.snapshot.json` (`check:dark-tokens`;
  update only on Timur's explicit decision). One box construction
  (outlined `.card`/`.box--outlined`, `.box--filled`, `.box--elevated`,
  radius and padding tokens), an arrow (`Arrow.astro`) in every clickable
  box. Motion 200–350 ms, M3 easing, state layers 8/10 %, lift ≤ 6 px;
  every hover rule inside `@media (hover: hover)`, movement also inside
  `prefers-reduced-motion: no-preference`.
- **Static output, no server runtime.** `astro build` → `dist/`, served by
  the host-installed Caddy. Node is needed at build time only.
- **Progressive enhancement is a hard rule.** Every page must be fully
  usable without JS. JS (theme toggle, project filter, search) only adds to
  it, and its controls stay `hidden` until the script reveals them. (Since
  revision 3, `/theme-init.js` sets `.js` on `<html>` before first paint and
  CSS reserves their place, so revealing them causes no layout shift.)
  Reveal-on-scroll (`src/scripts/reveal.ts`) never hides anything without JS
  or under `prefers-reduced-motion`.
- **Strict CSP compatibility.** The live CSP is `default-src 'self'`,
  `script-src 'self'`, `style-src 'self'`, without `'unsafe-inline'` and
  without hashes. So: no inline `<script>` (except JSON-LD data blocks), no
  `<style>`, no `style=""`, no `on…=` handlers, nothing from another origin.
  Do not use Shiki (inline styles), KaTeX HTML output (inline styles) or
  Pagefind (`wasm-unsafe-eval`). `tools/check-csp.mjs` enforces this on
  every build.
- **No third parties at runtime, no cookies, no analytics.**
- **Facts only.** Content about Timur comes only from verifiable sources
  (his brief, the old site, public GitHub). Never publish address, phone,
  birth date, family, employer, health, finances, political or religious
  views, server IPs or infrastructure details. Unknowns go to
  `CONTENT-TODO.md` as `TODO(Timur)`.

## Structure

```
astro.config.ts        static output, i18n (de/en, both prefixed), markdown pipeline
src/content.config.ts  collections; the Zod schemas live in src/lib/content-schemas.ts (shared with the
                       editing tools; build fails on invalid frontmatter)
src/content/           Markdown content, <collection>/<lang>/<slug>.md; post images in blog/<lang>/<slug>/
src/data/site.ts       public facts (name, GitHub, university) merged with the private layer
src/data/private.ts    the one entry point for private values (private/site.private.yaml, git-ignored;
                       schema src/lib/private-schema.ts, field reference site.private.example.yaml)
src/i18n/ui.ts         ALL interface strings, DE + EN (en typed against de → missing keys are type errors)
src/lib/               content helpers, routes registry (sitemap/llms/search), SEO/JSON-LD, feeds,
                       rehype/remark plugins (Temml math → MathML, comment stripping, image policy),
                       schedule.ts (posts dated after the build day), github-meta.ts (repo: facts, GITHUB_META=1 only)
src/pages/             routes: [lang]/…, sitemap.xml, robots.txt, llms.txt, search-index.json,
                       .well-known/security.txt (only with contact.email in the private file)
src/components/, src/layouts/, src/scripts/ (client TS), src/styles/ (tokens.css, global.css)
public/                copied verbatim (favicons, OG image, theme-init.js)
tools/                 check scripts (Node built-ins + jsdom/axe/playwright), scaffolder (new:post/new:project),
                       edit-content (edit, edit:now), publish.mjs, local server, Caddy block generator
tests/fixtures/blog/   example posts, loaded only by test builds (--fixtures); never in production or release
tests/articles/        the computations behind every launch post (npm run check:articles:system)
deploy/                site-config.json (headers, redirects, publish.branches/keep), Caddyfile.example (generated),
                       build-release.sh, stage.sh, apply-on-server.sh (first go-live, Caddy changes),
                       publish-on-server.sh (content updates: symlink switch, never touches Caddy)
```

## Rules of thumb

- **UI text** goes into `src/i18n/ui.ts`, never hard-coded in templates or
  client scripts. Client scripts read strings from `data-msg-*` attributes.
- **Colours** only as tokens in `src/styles/tokens.css`. `global.css` must
  not contain literal colours (`tools/check-contrast.mjs` fails otherwise).
  Keep the two dark palettes (media query and `[data-theme="dark"]`)
  identical. A new colour pair needs an entry in the contrast check.
- **New page type:** add it to `src/lib/routes.ts` so the sitemap, llms.txt
  and the search index pick it up. Give it `alternates` for hreflang.
- **New category:** an entry in `src/content/categories.yaml`, no code.
- **Posts:** `npm run new:post`; dates are Berlin calendar days, a future
  date means "scheduled" (absent from production until a build on or after
  it); never backdate. Every number in a post comes from a script in
  `tests/articles/` with asserts. Images next to the post with alt text;
  no external images. Example posts are fixtures in `tests/fixtures/blog/`,
  never in `src/content/`.
- **Frontmatter fields:** change `src/lib/content-schemas.ts` only; Astro and
  the editing tools share it (`check:new-content` round-trips every file).
- **Headers, redirects, caching:** edit `deploy/site-config.json` or
  `tools/caddy-site-block.mjs`, then `npm run caddy:example`. Never edit
  the generated block in the live Caddyfile by hand. Security headers may
  only get stricter (the generator refuses weaker ones).
- **Personal data** (e-mail, PGP, further accounts, controller, imprint):
  only in `private/site.private.yaml`, never in a tracked file
  (`npm run check:private` fails on a leak). GitHub stays public in
  `src/data/site.ts`. `/links` and JSON-LD `sameAs` follow automatically.
- **Language door:** only `/` redirects (302 by the first `Accept-Language`
  entry, default English); the rule is `languageDoor` in
  `deploy/site-config.json`. Logo and home links always point to `/de/` or
  `/en/`.

## Build, check, deploy

```sh
npm ci
npm run dev           # drafts visible
npm run check         # the full gate, must be green before any commit/PR
npm run check:browser:system  # Playwright suite with /usr/bin/chromium (CI: check:browser)
npm run check:prepush # GO / NO-GO before any push (docs/GO-LIVE.md step 3)
./ship.sh <ssh-target> # build-release → stage → confirm → dry run → apply (sudo)
npm run publish -- --target <ssh-target> [--dry-run|--rollback]  # content updates after the first go-live
```

`ship.sh` is the only path that changes the Caddyfile (first go-live,
headers, redirects, caching). `publish` reuses `build-release.sh`, switches
`<web root>/current` between releases and refuses when the Caddy block
would change (`docs/PUBLISHING.md`, DECISIONS R5-D4). Neither ever pushes.

Commits that go to GitHub carry the noreply address
(`291018608+timur-manjosov@users.noreply.github.com`); the older local
history on `redesign` does not and must not be pushed as it is.

First go-live: `docs/GO-LIVE.md`. Deployment details and rollback: `docs/DEPLOY.md`.
The repository is public: no server paths, host names or account names in
tracked files (placeholders `<web root>`, `<ssh-target>`). `apply-on-server.sh`
runs as root on the VPS. Aura (`aura.timurmanjosov.com`) has its own Caddy
block and containers on the same host: never touch them. The generator
proves the rest of the Caddyfile stays byte-identical.

`npm audit`: 3 **low** findings (katex via remark-math's syntax parser,
build-time only, KaTeX not used for rendering), documented as non-blocking
in `docs/VERIFICATION.md` §9. `npm run audit` fails on moderate or worse.

## GitHub-Workflow

- Arbeite bei GitHub-Aufgaben eigenständig über gh-CLI/GitHub-MCP-Tools, wie ein Senior Developer, nicht wie ein Assistent, der nach jedem Schritt nachfragt.
- Bugfixes laufen über Branch → PR — bewusste Ausnahme von der sonstigen Direkt-auf-main-Praxis dieses Repos, nur für Fixes. ship.sh/direkter Deploy bleibt für alles andere unverändert. Branch-Naming: fix/<issue-nummer>-<kurzer-slug>. PR-Text enthält "Fixes #<nummer>" für automatisches Schließen beim Merge.
- Der CI-Workflow (`.github/workflows/check.yml`) prüft nur, er deployt nie. Deployment bleibt ein manueller Schritt innerhalb einer Session (siehe "Build, check, deploy").
- Sicherheitsrelevante Funde mit echtem Exploit-Potenzial NICHT als öffentliches Issue — die Seite ist live und öffentlich erreichbar. Stattdessen gesondert im Bericht melden.

## Testing

`npm run check` ist die Testsuite (Lint, Typen, beide Builds, CSP, Links, HTML-Validierung, SEO/JSON-LD/Sitemap, HTTP-Verhalten inkl. Redirects und 404, WCAG-Kontrast, axe, Entwurfsfilter, Caddy-Generator, i18n-Report, `npm audit`). `npm run check:browser` ergänzt Playwright im echten Browser. Playwright ist Test-Zeit-Dependency, kein Widerspruch zu "no client-side dependencies".

Maschinell zu verifizieren vor jedem PR:
- HTTP-Response-Header (Security-Header, Caching)
- DOM-/ARIA-Zustände (z. B. aria-pressed/aria-expanded synchron zum echten Zustand)
- WCAG-Kontrastverhältnis betroffener Farbpaare
- Layout-Overflow bei verschiedenen Viewport-Breiten
- Kein Speicher- oder CPU-Verbrauch im Hintergrund (die Seite hat keine Animationsschleifen mehr; neue dürfen nur mit Begründung dazukommen)
- `npm audit` sauber, oder explizit als nicht-blockierend dokumentiert

NICHT maschinell geprüft, sondern manuell von Timur: die generelle visuelle/künstlerische Wirkung der Seite — eigene, bewusst subjektive Bewertung, keine Bugfix-Abnahme.

# GitHub-Workflow

- Arbeite bei GitHub-Aufgaben eigenständig über gh-CLI/GitHub-MCP-Tools, wie ein Senior Developer.
- Branch → Fix → Hacker-Phase auf die neue Änderung → PR mit "Fixes #<nummer>" → Merge nur wenn Hacker-Phase bestanden. Branch-Naming: fix/<issue-nummer>-<kurzer-slug>.
- Läuft live auf dem VPS mit echten Nutzern (analog zu Epiphyte) — sicherheitsrelevante Funde mit echtem Exploit-Potenzial NICHT als öffentliches Issue, stattdessen gesondert im Bericht melden.
- Automatisierte Tests sind die einzige Abnahme, keine manuelle Testung.
