# Gap analysis: target (brief §3) vs. current state

Distance: **none**, **small**, **large**.

| Target (brief §) | Current state | Distance | Action |
|---|---|---|---|
| 3.1 Home: one sentence, current projects, latest posts, contact, /now excerpt | Hero + long About + 3 project tiles + GitHub link | large | New home page generated from content collections |
| 3.1 About, detailed and structured | One paragraph | large | `pages/about` with sections + facts block from `src/data/site.ts` |
| 3.1 Projects overview with status/tag filter + detail pages | 3 tiles on the home page, no detail pages | large | `projects` collection, overview with no-JS list + JS filter, `/[lang]/projects/[slug]/` |
| 3.1 Blog | none | large | `blog` collection, see 3.3 |
| 3.1 /now, /links, /contact, /uses | none (contact = one GitHub link) | large | Content pages + data-driven links list |
| 3.1 Privacy policy, imprint (structure) | none | large | Pages with honest content + `TODO(Timur)` markers |
| 3.1 Search, static, no external service | none | large | Build-time JSON index + small vanilla JS (Pagefind rejected, see ADR) |
| 3.1 Helpful 404 | live 404 has an empty body | large | `/404.html` (bilingual) + `/de/404/`, `/en/404/`, wired up in Caddy |
| 3.2 Per-language URLs, switcher, hreflang, x-default, lang attr | client-side text swap, one URL | large | Astro i18n, `/de/…` + `/en/…`, `/` as an x-default language door |
| 3.2 Honest "translation missing" state + build report | n/a | large | `translationKey` mapping, switcher state, `npm run report:i18n` |
| 3.2 UI strings in central files | in `data-*` attributes all over the templates | large | `src/i18n/ui.ts`, type-checked key parity |
| 3.3 Frontmatter schema validated at build | n/a | large | Zod schemas in `src/content.config.ts` |
| 3.3 Extensible categories, tags, archive, drafts, series, updated, reading time | n/a | large | `categories.yaml` collection (no code change for new ones), tag/category/series/archive pages |
| 3.3 Syntax highlighting, build-time math | n/a | large | Prism classes (CSP-safe), Temml → MathML at build time |
| 3.3 TOC, footnotes, heading permalinks | n/a | large | Built from `render()` headings, GFM footnotes, autolinked headings |
| 3.3 RSS per language and per category, autodiscovery | none | large | `@astrojs/rss` endpoints + `<link rel="alternate">` |
| 3.3 Open Graph | present, single language | small | Per page, per language, `og:locale` correct |
| 3.4 Home and /now pull from content | static markup | large | Collections drive both |
| 3.4 Build-time GitHub activity (optional) | none | large | Deferred (would need network access at build; see DECISIONS) |
| 3.4 New post/project in under a minute | n/a | large | `npm run new` (interactive Node script, no deps) |
| 3.5 E-mail + PGP + /.well-known | no e-mail, no key | large | Structure prepared, inactive until `site.ts` gets real values; `TODO(Timur)` |
| 3.5 Other accounts with rel="me" | GitHub only | small | `/links` from `site.ts`; only verified accounts |
| 3.5 Spam protection without JS | n/a | small | Entity-encoded address, no JS needed |
| 3.5 security.txt (optional) | none | small | Generated once a contact address exists; prepared |
| 3.6 Semantic HTML, one h1, landmarks | mostly good | small | Keep, checked by html-validate + axe |
| 3.6 JSON-LD Person/WebSite/BlogPosting/SoftwareSourceCode, sameAs = /links | none | large | `JsonLd` component, `sameAs` from the same data as `/links` |
| 3.6 sitemap with alternates, robots, canonical | sitemap without alternates | small | Own sitemap endpoint with `xhtml:link` alternates |
| 3.6 llms.txt + stable facts block | none | large | `/llms.txt` endpoint + facts `<dl>` on About |
| 3.6 Allow AI crawlers, documented | robots allows all | none | Keep allow-all, decision in DECISIONS.md |
| 3.7 Typography first, one accent, tokens, light/dark without flash | Nord tokens, 3 fonts, heavy effects | large | New calm token set, one accent, one font |
| 3.7 Reduced motion, mobile-first from 320 px, little JS | yes / mostly / 71 KB JS | small | ~3 KB JS total, Playwright overflow checks at 320 px |
| 3.8 No third-party requests, no cookies | yes | none | Keep, checked automatically |
| 3.8 No analytics | none | none | Keep; option listed in CONTENT-TODO |
| 3.8 Privacy page reflects what is actually processed | n/a | large | Written from the real Caddyfile (no access log) |
| 3.8 Security headers incl. Permissions-Policy, CSP without unsafe-inline | strict CSP without Permissions-Policy | small | Proposal: drop script hash, add Permissions-Policy, keep everything else |
| 3.9 Lighthouse ≥95, WCAG 2.2 AA, automated checks, CI, TS strict | no checks, no CI, no TS | large | `npm run check` + GitHub Actions workflow |
| 3.10 Static output, Caddyfile.example, DEPLOY.md, redirects for old URLs | static, deploy via server-side build | small | Static `dist/`, release archives, apply script, redirect table |

## Conclusion

The current site is a well-made single-page business card. On almost every
axis of the brief (multi-page information architecture, real i18n, blog,
structured content, machine readability, automated quality checks) the
distance is **large**. The parts worth keeping are content, a few assets
and principles (static output, strict CSP, no third parties, progressive
enhancement). Hardly any code carries over: the templates have to be
redesigned anyway, and the JS is almost entirely effects that are no longer
wanted.

That means **migration is cheaper than an in-place rebuild**. Staying on
Eleventy would not save the main work: schema validation, typed content,
i18n routing and TS strict would all have to be built on top. The stack
choice itself is made in `docs/adr/0001-stack.md`, on its own merits and
not because of the migration cost.
