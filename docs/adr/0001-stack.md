# ADR 0001: Site generator for the redesigned timurmanjosov.com

- Status: accepted
- Date: 2026-10-26
- Decider: implementation agent (unattended run, see brief §0), to be
  reviewed by Timur

## Context

The site turns from a one-page card into a long-lived, content-driven
personal hub: bilingual (DE/EN, own URLs), blog with validated frontmatter,
math rendering at build time, feeds, sitemap with alternates, JSON-LD,
search without external services, and very little client JS. It must run
on Timur's VPS behind a host-installed Caddy, under the existing
strict CSP (`default-src 'self'`, no `unsafe-inline`, no style attributes).
One person maintains it in spare time, so upgrade cost and moving parts
matter more than features.

Versions were checked against the npm registry and the official docs on
2026-10-26, not from memory.

| Candidate | Current version (2026-10-26) |
|---|---|
| Astro | 7.4.2 (7.0 released 2026-06; Vite 8, Rust compiler, Sätteri markdown) |
| Next.js | 16.4.3 |
| SvelteKit | 3.1.0 |
| Eleventy | 3.1.7 stable; v4 in alpha (alpha.10 canary), renamed "Build Awesome" |
| Hugo | 0.168 (per the `hugo-extended` npm wrapper) |

## Criteria and evaluation

| Criterion | Astro 7 | Next.js 16 | SvelteKit 3 | Eleventy 3 | Hugo |
|---|---|---|---|---|---|
| Built-in i18n | yes: `i18n` routing, `astro:i18n` helpers | App Router: do-it-yourself via `[lang]` segments | do-it-yourself | do-it-yourself (i18n plugin only adds helpers) | **excellent**, first-class multilingual |
| Typed content + schema validated at build | **yes**: content collections, Zod 4 schemas, `reference()`, build fails on invalid frontmatter | no native content layer (MDX or third-party) | no (mdsvex + your own validation) | no (your own validation in data cascade) | no schema; checks only possible as `errorf` in templates |
| Markdown/MDX + math | yes; unified pipeline (remark/rehype) stays available via `@astrojs/markdown-remark` | via MDX + plugins | via mdsvex + plugins | markdown-it + plugins | Goldmark + passthrough, `transform.ToMath` |
| RSS / sitemap / SEO | official `@astrojs/rss`, endpoints for anything else | by hand | by hand | official RSS plugin, rest by hand | built in |
| Zero JS by default | **yes** | no: React runtime + inline RSC payload scripts | no, unless `csr = false` per page | **yes** | **yes** |
| Works under the existing strict CSP as static files | yes, with `inlineStylesheets: 'never'` and no inline scripts (verified in the build, see VERIFICATION.md) | **no**: the docs say nonces need dynamic rendering ("you must use dynamic rendering to add nonces"); hash-based SRI is experimental | partly: hydration bootstrap is inline; `kit.csp` hashes would have to be maintained in the Caddy header | yes | yes |
| Build speed | fast (Vite 8/Rolldown; tens of pages build in seconds) | medium | medium | fast | fastest |
| Maturity / maintenance | very active, large ecosystem, yearly majors | very active, Vercel-driven | active | stable 3.x, v4 alpha + rename = open direction | very mature, frequent releases |
| Ops on the Caddy host | static `dist/`, nothing on the server | static export loses features; full features need a Node server process | static adapter possible | static | static |
| Upgrade path | yearly majors with upgrade guides; 7.0 needed a markdown processor switch | frequent breaking changes (pages→app router, caching semantics) | 2→3 major recently | v4 brings breaking changes + rename | breaking changes in minors happen, single binary |
| TypeScript strict | **native** (`astro check`) | native | native | partial (v3 supports TS config, templates untyped) | n/a (Go templates) |
| One-person maintainability | good: one framework, schema in one file | heavy for a static site | medium | good, but more glue code to own | good, but Go templates and no schema |

## Decision

**Astro 7, static output (`output: 'static'`).** No server runtime, no
Dockerfile. Caddy serves `dist/` directly, as before.

Key configuration decisions that follow:

- `build.inlineStylesheets: 'never'` so every stylesheet is an external,
  hashed file (CSP `style-src 'self'`).
- Client JS as processed `<script>` modules with
  `vite.build.assetsInlineLimit: 0`. A post-build check fails the build
  output if any inline `<script>` without `src`, any `style=""` attribute
  or any `<style>` element appears (`tools/check-csp.mjs`).
- The theme-init script against the flash of the wrong theme is a tiny,
  blocking, **external** file in `public/` (`/theme-init.js`). The CSP no
  longer needs a `sha256-` hash, so it gets stricter.
- Markdown: `@astrojs/markdown-remark` (`unified()` processor) instead of
  the new default Sätteri. remark-math and the footnote/heading options are
  proven there. Sätteri can come later, once a math plugin exists for it.
- **Math:** `remark-math` + **Temml** (TeX → MathML Core, by a KaTeX
  maintainer), wrapped in a ~40-line rehype plugin. KaTeX's HTML output
  needs inline `style` attributes for layout, which the CSP blocks. The
  brief allows "KaTeX or equivalent"; MathML is rendered natively by all
  current browsers, needs no JS and is accessible to screen readers. A math
  font (STIX Two Math, OFL, 394 KB woff2) is self-hosted; the browser only
  downloads it on pages that actually contain math (unused `@font-face`
  rules are never fetched). Subsetting it is a possible later optimisation.
  (Corrected 2026-10-27: an earlier draft of this ADR named Latin Modern.)
- **Syntax highlighting:** Prism classes (`syntaxHighlight: 'prism'`). Shiki
  emits inline `style` attributes, which the CSP blocks. A small
  token-colour CSS lives in the site's own stylesheet.
- **Search:** own build-time JSON index + ~2 KB vanilla JS. Pagefind was
  evaluated and is the stronger engine, but its WebAssembly needs
  `'wasm-unsafe-eval'` in `script-src` (Pagefind hosting docs). That would
  loosen the CSP, which the brief forbids. At the expected size of a
  personal site (tens to a few hundred pages) a JSON index is enough.
- Sitemap and llms.txt as own endpoints (exact hreflang control via
  `translationKey`), RSS via `@astrojs/rss`.
- TypeScript 6 strict: `@astrojs/check` 0.9.12 declares the peer range
  `typescript ^5 || ^6`, so the new TypeScript 7 is not used yet.
- Lint/format: Biome (one tool instead of ESLint + Prettier); `astro check`
  type-checks `.astro` files.

## Why not the others

- **Eleventy 3** is the incumbent and would work. But schema validation,
  typed content, i18n mapping and feed/sitemap alternates would all be
  hand-written glue, and the v4 alpha with a rename makes its medium-term
  direction less predictable than Astro's. Staying put is not a reason by
  itself (brief §4, Phase 3).
- **Hugo** is the closest runner-up: single binary, fastest builds, best
  multilingual support, no npm tree. It loses on the hard requirement
  "frontmatter schema validated at build" (only template-level `errorf`
  checks) and on TypeScript, and Go templates are a second language to
  maintain. **Revisit** if the npm dependency churn of Astro becomes a
  real burden.
- **Next.js** needs dynamic rendering for a nonce-based strict CSP, which
  means a permanent Node process on the VPS: more attack surface, process
  management and updates, for a site that is static by nature.
- **SvelteKit** is a good app framework, but this is a content site.
  Zero-JS needs per-page opt-outs, and content collections, feeds and
  sitemap are all do-it-yourself.

## Consequences

- Node is needed at build time only (locally and in CI), never on the server.
- The npm tree is larger than Eleventy's. `npm audit` is part of
  `npm run check`; findings are reviewed against the fact that build input
  comes only from the author.
- Astro has yearly majors. The upgrade guide is the first thing to read; the
  CSP check catches regressions in output shape (e.g. new inlining).

## What would trigger a revision

- Astro dropping or degrading `@astrojs/markdown-remark` before a
  math-capable Sätteri path exists.
- More than ~300 indexed pages or a search index larger than ~500 KB
  gzipped → re-evaluate Pagefind with a path-scoped CSP exception for the
  search page only (a decision for Timur, since it loosens the CSP).
- A need for server-side features (forms, comments) → keep the static site
  and add a separate small service, not a framework switch.

## Sources

- Astro upgrade guide v7: https://docs.astro.build/en/guides/upgrade-to/v7/
- Astro Markdown (processors, Sätteri vs. unified): https://docs.astro.build/en/guides/markdown-content/
- Astro i18n routing: https://docs.astro.build/en/guides/internationalization/
- Astro content collections: https://docs.astro.build/en/guides/content-collections/
- Astro client scripts (inlining of small scripts): https://docs.astro.build/en/guides/client-side-scripts/
- Astro syntax highlighting (Shiki inline styles, Prism classes): https://docs.astro.build/en/guides/syntax-highlighting/
- Next.js CSP guide (nonces need dynamic rendering): https://nextjs.org/docs/app/guides/content-security-policy
- Hugo mathematics: https://gohugo.io/content-management/mathematics/
- Pagefind hosting/CSP (`'wasm-unsafe-eval'`): https://pagefind.app/docs/hosting
- Pagefind multilingual: https://pagefind.app/docs/multilingual/
- Eleventy v4 / Build Awesome: https://www.11ty.dev/blog/build-awesome/
- Astro 7 upgrade field report: https://rezhajul.io/posts/upgrading-to-astro-7/
- npm registry versions, queried 2026-10-26 (`npm view <pkg> version`).
