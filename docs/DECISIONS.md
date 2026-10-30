# Decisions

Decisions taken during the unattended redesign run (brief §0: "no questions,
take the most conservative sensible decision and write it down"). Each entry:
decision, alternatives, reason, what would trigger a revision. The stack
choice itself is in `docs/adr/0001-stack.md`.

Entries marked **(critique)** are places where the brief itself was, in my
view, technically or conceptually weaker than an alternative (brief §5, last
rule). The better variant was implemented where it does not contradict the
goal.

---

## D1. Stack: Astro 7, static output
See ADR 0001. Revision triggers are listed there.

## D2. URL scheme: every page under `/de/` or `/en/`, `/` is a language door
> **Superseded in part by R2-D2** (revision 2): `/` is no longer a door
> page; it redirects by `Accept-Language`. The prefixed URL scheme stays.

- **Decision:** both languages are prefixed (`/de/…`, `/en/…`). The root `/`
  is a small, real page ("Deutsch / English", each with a one-sentence intro)
  and the `x-default` target of every hreflang set. No redirect by IP or
  `Accept-Language`, not even a suggestion banner.
- **Alternatives:** unprefixed default language (`/about/` = English,
  `/de/about/` = German); redirect `/` by `Accept-Language`.
- **Reason:** symmetric URLs make "the same page in the other language" a
  pure prefix swap, which keeps the switcher, the sitemap and the translation
  report simple. A door page needs no JS and no server logic, and nobody is
  redirected against their will (brief §3.2). A suggestion banner would need
  JS reading `navigator.language`. That is possible, but it is a UI element
  whose only job is to compensate for a choice the door already offers.
- **Revision:** if analytics are ever introduced and show that most visitors
  bounce on `/`, consider a non-forced language hint.

## D3. Language-less convenience paths redirect to English (302)
- **Decision:** `/about`, `/now`, `/uses`, `/blog`, `/projects`, `/links`,
  `/contact`, `/search`, `/privacy`, `/imprint` (with and without trailing
  slash) redirect **302** to the English page. `/now` and `/uses` follow the
  nownownow.com / uses.tech conventions.
- **Alternatives:** redirect them to the door `/`; 301.
- **Reason:** someone typing `/now` wants the page, not a language choice.
  English is `x-default`. 302 instead of 301 so the target can still change
  (e.g. to the door) without browsers having cached a permanent redirect.
- **Revision:** Timur prefers German as the default.

## D4. Old URLs (redirect table)
The old site had exactly two HTML pages (`/`, `/lab/`) plus assets. Table in
`deploy/site-config.json`, rendered into the Caddy config and the local test
server, so both use the same data.

| Old | New | Status |
|---|---|---|
| `/` | `/de/` or `/en/` by `Accept-Language` (R2-D2) | 302 |
| `/index.html` | `/` | 301 |
| `/lab`, `/lab/`, `/lab/index.html` | `/en/projects/` | 301 |
| `/assets/images/og-image.png` | `/images/og-default.png` | 301 |
| `/assets/images/favicon.svg` | `/favicon.svg` | 301 |
| `/assets/images/favicon-32.png`, `-16.png` | `/images/favicon-32.png`, `-16.png` | 301 |
| `/assets/images/apple-touch-icon.png` | `/apple-touch-icon.png` | 301 |
| `/sitemap.xml`, `/robots.txt` | same paths, new content | 200 |
| `/feed.xml`, `/rss.xml` (common guesses) | `/en/feed.xml` | 301 |

Not redirected on purpose: `/styles/*.css`, `/scripts/*.js`,
`/assets/fonts/*`. These are subresources of the old page, not addresses
anyone links to. A cached old HTML page that requests them gets a 404 for the
asset. Redirecting them to new hashed files would serve the wrong content.
Old in-page anchors (`/#works`, `/#contact`) cannot be redirected by a server
(fragments never reach it). They land on the door page, which links on.

## D5. www → apex
- **Decision:** `www.timurmanjosov.com` answers with **308** to the apex.
  Before, it served the same content with status 200 (duplicate URLs, see
  AUDIT §5).
- **Revision:** none expected.

## D6. Math: Temml → MathML instead of KaTeX HTML
- **Decision:** `remark-math` + Temml (TeX → MathML Core at build time).
- **Reason:** KaTeX's HTML output needs inline `style` attributes, which the
  live CSP (`style-src 'self'`, no `'unsafe-inline'`) blocks. Loosening the
  CSP is ruled out by the brief. MathML renders natively in all current
  browsers and is readable by screen readers. A TeX typo fails the build
  (`throwOnError: true`). Temml's single remaining inline style
  (`display:block math`) is stripped and replaced by a stylesheet rule. The
  plugin throws if any other inline style ever appears.
- **Cost:** a self-hosted math font (STIX Two Math, 394 KB woff2), fetched
  only on pages with math. Subsetting is possible later.
- **Revision:** KaTeX or another engine starts emitting class-based output;
  or MathML rendering turns out to be poor for Timur's notation (check the
  example post `/de/blog/beispiel-rsa-mathe/` in `npm run dev`).

## D7. Syntax highlighting: Prism classes, not Shiki
Shiki writes inline `style` attributes (CSP). Prism emits classes; the token
colours are design tokens and part of the contrast check.

## D8. Search: own JSON index, not Pagefind
- **Decision:** a build-time `search-index.json` (both languages) plus about
  3 KB of vanilla JS on `/de/search/` and `/en/search/`. Without JS the page
  says so and points to archive, projects and sitemap.
- **Reason:** Pagefind is the better engine, but its WebAssembly needs
  `'wasm-unsafe-eval'` in `script-src`, which would loosen the CSP. At the
  size of a personal site a JSON index is enough.
- **Revision:** > ~300 pages or an index > ~500 KB gzipped. Then decide
  whether a path-scoped CSP exception for the search page is acceptable.
  That is Timur's call, because it loosens the CSP.

## D9. Theme init as an external blocking script; CSP gets stricter
`/theme-init.js` (13 lines) in `<head>` instead of an inline snippet. The
`sha256-` hash in the CSP is no longer needed. The proposed CSP drops it
(stricter), and the "hash goes stale" gotcha from the old CLAUDE.md
disappears. It costs one tiny extra request. That is acceptable: the script
is cache-revalidated, not hashed, because its URL must stay stable for the
CSP.

## D10. E-mail: entity-encoded on /contact, not in JSON-LD
- **Decision:** once `person.email` is set in `src/data/site.ts`, `/contact`
  renders it as an entity-encoded `mailto:` link (works without JS). It is
  **not** added to the JSON-LD `Person`, and security.txt is only generated
  when an address exists.
- **Reason:** plain text in JSON-LD on every page would undo the (modest)
  harvesting protection. The address stays machine-readable on `/contact`
  (`mailto:`). security.txt needs it in plain text by definition (RFC 9116),
  but only in one file.
- **Revision:** if machine-readability matters more than harvesting, add
  `email` back in `src/lib/seo.ts` (one line, commented there).

## D11. No invented contact data, PGP key or accounts
`email`, `pgp` and every account except GitHub are `null` / absent, with
`TODO(Timur)` entries in `CONTENT-TODO.md`. GitHub was verified via the
GitHub API (profile `timur-manjosov`, its public repositories).

## D12. Projects from GitHub as drafts
Public repositories that were not on the old site are prepared as
`draft: true` with `status: draft-review`, never published: gauss-trainer
(DE+EN), vector-calculator, contact-manager, number-guessing-game (EN). Octo
was published because the first brief named it (removed in revision 2,
R2-D9). The `timur-manjosov/timur-manjosov` profile README repo and
`portfolio` (this site) are not projects in this sense.

## D13. AI crawlers: allowed
- **Decision:** `robots.txt` allows everything for every user agent. No
  per-bot rules.
- **Reason:** Timur's goal is to be findable, by people and by AI systems
  (brief §3.6).
- **How to change:** add `User-agent: GPTBot` / `ClaudeBot` /
  `Google-Extended` / `CCBot` … blocks with `Disallow: /` in
  `src/pages/robots.txt.ts`. Note that this only affects future crawls by
  bots that honour robots.txt; it cannot remove anything already collected.

## D14. llms.txt: provided, effect unproven
`/llms.txt` follows the llmstxt.org proposal: short profile, stable facts,
page list. As of this run there is no public documentation from a major AI
provider saying that its crawlers or assistants read `llms.txt`. It is a
cheap extra generated from the same data as the site, not a promise.

## D15. GitHub activity overview: not built (optional item)
- **Decision:** skipped in v1.
- **Reason:** it needs network access to the GitHub API at build time. That
  makes builds non-reproducible and dependent on rate limits, and it adds a
  token question for CI. "Liveliness through content" is already covered by
  the latest posts, project `updated` dates and /now.
- **Revision:** if wanted, a small build step that writes a JSON file
  (fetched once, committed or cached) is the least fragile variant.

## D16. Drafts: separate build, never in production
`draft: true` content appears in `npm run dev` and in `npm run build:drafts`
(→ `dist-drafts/`, every draft page `noindex`). `tools/check-drafts-hidden.mjs`
fails if a draft URL or title appears anywhere in `dist/`.

## D17. Untranslated content in listings
A post or project that exists in only one language still appears in the
other language's listings and tag pages, with a language badge and `lang`
attribute. Feeds stay single-language (a German feed reader should not get
English posts unannounced). The language switcher on such a page links to the other
language's overview and says that the translation is missing
(`data-translation-missing`, checked by `tools/i18n-report.mjs` against the
build). Hiding untranslated content would make half the site invisible to
readers of the other language.

## D18. Deployment: build locally, upload a checksummed archive
- **Decision:** replace "server-side `git pull` + Docker build" with: build
  and check locally (`deploy/build-release.sh`), stage the archive on the
  server (`deploy/stage.sh`), go live with `deploy/apply-on-server.sh`
  (sudo). Releases live in `<web root>/releases/<id>/`, and `current` is a
  symlink to one of them. The web root is read from the live Caddy block at
  staging time and never written into this repository. `ship.sh` chains the three and asks
  before going live.
- **Reason:** no build tooling (Node, Docker image pulls) on the server, every
  release is checked before it leaves the laptop, rollback = flip a symlink.
  The old `ship.sh` also committed and pushed automatically. The new one does
  not: publishing source and deploying are separate decisions.
- **Note:** the old server-side build script and its two build slots stay
  where they are until Timur removes them (docs/DEPLOY.md §7). Nothing
  calls them any more.

## D19. Full Caddyfile proposal is not committed
`deploy/Caddyfile.proposed` and `deploy/Caddyfile.current` are gitignored.
The full file contains the configuration of other sites on the VPS (Aura),
and this repository is public. Committed instead: the generated site block
(`deploy/Caddyfile.example`) and the generator that splices it into the live
file and proves that everything else stays byte-identical.

## D20. CI workflow despite "no CI planned" in the old CLAUDE.md
The brief (§3.9) asks for a GitHub Actions workflow. The old CLAUDE.md said
no CI/CD was planned. The newer brief wins, with one limit: the workflow only
**checks** and never deploys. Deployment stays manual (D18). It runs only
once the branch is pushed. This run does not push (brief §0).

## D21. Lint/format: Biome instead of ESLint + Prettier
One dev dependency instead of two tool chains with plugins. `astro check`
covers type checking of `.astro` files.

## D22. jsdom as a dev dependency
- **Decision:** `jsdom` runs axe-core without a browser
  (`tools/check-a11y-static.mjs`).
- **Reason:** in this environment no Chromium could be installed (see
  BLOCKERS). jsdom covers every structural axe rule. Contrast is computed
  from the design tokens (`tools/check-contrast.mjs`). CI also runs the full
  Playwright suite in a real browser.
- **Revision:** drop jsdom if the browser suite is always available locally.

## D23. Generative canvas and effects removed
The De Jong / L-system / Rule-90 / Fourier canvas engine, card previews and
hover tiles are gone (the brief explicitly rejects "visual punch"). The code
remains in git history and under the tag `pre-redesign`.

## D24. One font
Inter (variable, 48 KB, preloaded) for everything; system monospace stack for
code; the math font only on math pages. Space Grotesk and JetBrains Mono were
dropped.

## D25. Personal details
Only facts from the brief, the old site and public GitHub data. No city, no
birth date, no employer, no hardware/hosting details. "Docker for my own
services" and "Caddy on my own server" stay generic on purpose. Hoster,
server IPs and OS versions are not mentioned (brief §2).
**Revision 2:** the hoster (Netcup) is now named in the privacy policy,
because the second brief asks for it explicitly and a privacy policy has to
name the processor. It appears nowhere else.

---

# Revision 2 (brief `prompts/portfolio-umbau-2.md`, 2026-10-27/28)

## R2-D1. Tone and hero line
- **Decision:** all texts rewritten in first person, short sentences,
  numbers and states instead of adjectives (e.g. "last commit: 10 October
  2026", "README describes the first skeleton, the commits are further").
  Page descriptions that appear as the lead under each title were also
  moved from third to first person (pass 5): a third-person lead above a
  first-person text read like two authors. The site description
  (`site.description`, used for search snippets and JSON-LD) stays in third
  person with the name, because it is read out of context.
- **Hero variants** (the line under the name):

  | # | Deutsch | English |
  |---|---|---|
  | **1 (chosen)** | Ich studiere Mathematik und verstehe Dinge am besten, wenn ich sie selbst baue. | I study mathematics, and I understand things best once I've built them myself. |
  | 2 | Mathestudent mit Schwerpunkt Kryptografie. Ich baue Discord-Bots, Simulationen und kleine Werkzeuge, meistens um etwas zu verstehen. | Maths student, cryptography focus. I build Discord bots, simulations and small tools, mostly to find out how something works. |
  | 3 | Kryptografie im Studium, Rust nebenher. Was dabei entsteht, steht hier. | Cryptography at university, Rust on the side. Whatever comes out of it ends up here. |

- **Reason for 1:** it is the only one that says *why* the projects exist,
  and it is true for every project on the page (Saeculum and Epiphyte come
  from interests in emergent systems, gauss-trainer from the course). 2 is
  a list, 3 dates quickly (Rust "on the side" will not stay true). Variants
  2 and 3 are in `CONTENT-TODO.md` for Timur's choice.
- The German and English versions are written separately (e.g. "Schreib
  mir" / "Write to me", "Mathematikstudium …" / "Maths student …"), not
  translated word by word.

## R2-D2. Language logic: 302 on `/` by the first `Accept-Language` entry
- **Decision:** Caddy answers `/` with **302** to `/de/` if the *first*
  entry of `Accept-Language` is German (`de`, `de-DE`, `de-AT`, `de-CH`,
  any case), otherwise to `/en/`, with `Vary: Accept-Language` and
  `Cache-Control: no-store`. Matcher: `path /` plus `header_regexp` on
  `Accept-Language`, then `redir … 302`; a second named matcher with
  `not header_regexp` for the rest (which also catches a missing header).
  Checked against `caddyserver.com/docs/caddyfile/matchers` on 2026-10-28:
  `path` is an exact match, matchers in one set are AND'ed,
  `header_regexp` uses RE2, so the `(?i)` flag for case-insensitivity is
  valid. The `header` directive is ordered before `redir`, so the 302
  carries `Vary` and `Cache-Control`. No other URL redirects by language.
  The Caddy syntax of the full proposal was **not** validated in this run
  (no local Caddy, nothing may be uploaded); `deploy/stage.sh` and
  `apply-on-server.sh --dry-run` run `caddy adapt` on the server.
- **Simplification:** only the first entry is evaluated, q-values are
  ignored. Browsers send the list sorted by preference with the first
  entry unweighted (q=1), so this matches what real browsers send. A
  hand-written header like `en;q=0.1, de;q=0.9` would be misread; that is
  accepted.
- **Default English** for a missing, unknown or `*` header: the audience
  outside Germany is larger, crawlers usually send no `Accept-Language`, and
  English was already `x-default`. **The one place to change it:**
  `deploy/site-config.json` → `languageDoor` (`acceptLanguage`, `match`,
  `default`; the `$comment` there gives the German-default values), then
  `npm run caddy:example`. Caddy block, local test server, browser fallback
  and smoke tests all read that object.
- **Static fallback** (dev server, preview, missing server rule): `/` has no
  visible content. The blocking external script `/lang-redirect.js`
  (generated from the same config, CSP-compatible) applies the same rule to
  `navigator.languages` and calls `location.replace`. Only `<noscript>`
  shows "Deutsch · English". `hreflang="x-default"` stays `/`.
- **Stable choice without cookies:** the logo and every "home" link point to
  `/de/` or `/en/`, never `/`. The switcher swaps the prefix (missing
  translations are shown honestly, as before).
- **Trade-offs:** crawlers without `Accept-Language` see English on `/`;
  a link to `/` shared by a German reader opens in English for an English
  reader (that is the intent, but it means `/` is not a stable
  "this page" link); only `/` is affected, all prefixed URLs are stable.
  `Vary` + `no-store` keep shared caches from serving one language to
  everyone.
- **Revision:** if a German default is wanted (see above), or if search
  console data shows problems with the redirecting `x-default`.

## R2-D3. Private data layer
- **Decision:** `private/site.private.yaml` (git-ignored), validated by a
  hand-written schema (`src/lib/private-schema.ts`, clear messages per
  field), read in exactly one place (`tools/private-data.mjs` →
  `src/data/private.ts`), from there into templates, JSON-LD `sameAs`,
  `llms.txt`, /links, /contact, privacy and imprint. Two modes in
  `tools/build.mjs`: **public** (default, CI; private sections are left
  out without placeholders) and **release** (`--release --private <file>`;
  needs `contact.email` and `legal.controller`, refuses `example.invalid`
  and visible `TODO(`, warns with a count for `draft-review`).
- **Alternatives:** environment variables (rejected: the brief forbids
  them for paths, and they leak into shell history and CI logs); git-crypt
  or SOPS (rejected: a key to manage for a handful of values that end up
  public on the site anyway).
- **Leak check** `npm run check:private`: the values that must stay out of
  the repository (`secretValues` in `tools/private-data.mjs`: e-mail
  addresses, PGP fingerprint in both spellings and the key's base64 lines,
  account URLs and handles, imprint data) are searched in all tracked
  files, the index and untracked-but-not-ignored files, for every YAML file
  in `private/`. A hit names the field and the file, never the value.
  `.githooks/pre-commit` runs it on the index; it is **not** activated
  (`git config core.hooksPath .githooks`, see README).
- **What it does not do:** protect anything that is rendered. Whatever is
  on the site is public. `private/` only keeps the values out of the
  repository and its history.

## R2-D4. Design research (2026-10-27)
Looked at, in the browser (screenshots in the git-ignored
`.screenshots/research/`), nothing copied (no code, assets or text):

| Source | What I took from it |
|---|---|
| Astro themes (`astro.build/themes/`) and showcase (`astro.build/showcase/`) | Dark grid backgrounds with coloured radial glows at the edges are the current house style. Took the *static* edge glow, not the grid (noise behind text). |
| m3.material.io (Material 3) | Tonal surfaces (a light tint of the accent as a card background with a dark "on" colour), pill buttons, clear state layers. → `--color-tonal`/`--color-on-tonal`, the /now card, status pills. |
| brittanychiang.com | Dark navy with one cool glow, teal tech chips, uppercase mono labels. → mono eyebrows, chips in the secondary accent. |
| antfu.me | Restraint: a calm text column, inline project chips, many links, no hero. → kept long texts in a 68ch column; the hub character lives in the links. |
| leerob.com | Bio first, lists of writing with right-aligned dates, almost no decoration. → post lists with dates in the meta row. |
| rauno.me | Very large, tight display type as the single strong gesture. → the name as the one large element, tight tracking (−0.045em). |
| joshwcomeau.com | Coloured category labels, a friendly but clear hierarchy; also an example of what *not* to do here (illustrations, motion). |

**Derived patterns:** one large typographic gesture per page; colour as
*surfaces and labels*, not as decoration; a single soft glow instead of
moving backgrounds; cards with 1px borders and soft shadows; mono for
metadata; dark mode designed, not inverted.

## R2-D5. Direction: palette, gradients, type, components
- **Two accents:** violet (`#5530d9` light / `#ad98ff` dark) for links,
  primary button, focus; teal (`#09636d` / `#52d3c6`) for labels, status
  "active" and the second gradient end. Violet + teal gives a clear
  contrast in hue while both reach AA on white and on near-black. A warm
  second accent (orange, pink) was not tried: dark-enough orange for AA
  on white turns brown.
- **Neutrals:** a cool, very slightly violet grey scale, so surfaces and
  the accent belong together. Dark mode is its own palette (lighter
  accents, tinted surfaces), not an inversion.
- **Gradients (tokens):** `--gradient-text` (violet → blue → teal, the
  name in the hero), `--gradient-accent` (monogram, featured card border),
  `--gradient-mesh` (two radial tints in the hero), `--gradient-page`
  (the same two tints fading out at the top of every page, pass 5). All
  stops are plain hex tokens so the contrast check can sample them.
- **Type:** Inter variable (OFL 1.1, self-hosted, 48 KB, one file),
  weights 400–800; display size `clamp(2.9rem … 5.4rem)`, tracking −0.045em,
  line-height 0.98 for the name; system mono stack for labels and code
  (no second font file). STIX Two Math stays limited to pages with math.
- **Components:** pill buttons (primary filled, secondary outlined),
  tonal status pills with a dot (text label, colour is never the only
  signal), mono chips, cards with 28px radius, 1px border and soft shadow,
  bento grid (6 columns on wide screens: 4+2, 2+2+2), a small spec sheet in
  the hero set like terminal output, translucent sticky header.
- **Spacing:** a 9-step scale from 0.25rem to 6.5rem; sections are
  separated by `--space-8`/`--space-9`, which is where the "calm" comes
  from.

## R2-D6. CSS features and fallbacks
Support checked against MDN browser-compat-data (raw JSON from
`github.com/mdn/browser-compat-data`, 2026-10-28). Details and fallbacks:
`docs/VERIFICATION.md` R2 §5.

| Feature | Chrome | Firefox | Safari | Fallback |
|---|---|---|---|---|
| `background-clip: text` | 120 (`-webkit-` before) | 49 | 14 (`-webkit-` before) | `@supports`: solid accent colour |
| `backdrop-filter` | 76 | 103 | 18 (`-webkit-` since 9) | `@supports`: solid header background |
| `@view-transition` (cross-document) | 126 | **not supported** | 18.2 | none needed: normal navigation |
| `:has()` | 105 | 121 | 15.4 | card simply does not lift on hover |
| `text-wrap: balance/pretty` | 114/117 | 121 / – | 17.5 / – | normal line breaking |

No `color-mix()`, no container queries, no `light-dark()`: every colour is
a plain token, so the contrast check can compute it and old engines see the
same colours.

## R2-D7. Screenshot passes (system Chromium, `tools/screenshots.mjs`)
10 pages × 360/768/1280 × light/dark, plus overflow at 320. Images in the
git-ignored `.screenshots/pass<n>/`.

Passes 1–3 ran at the end of the previous session (2026-10-27), which
ended before writing notes. What follows for them is reconstructed from
comparing the saved screenshots, not from notes taken at the time.

1. **Pass 1** (first implementation): at 768 px the 4/2 bento split
   squeezed the featured project into a narrow column (Aura's text wrapped
   to one or two words per line) next to a half-empty wide card, and the
   featured project was not first. → tablets get two equal columns, the
   4/2 and 2/2/2 splits only from 64rem; listing order puts the featured
   project first.
2. **Pass 2:** the fix above is visible; cards in a row now share a height
   with the footer aligned at the bottom.
3. **Pass 3:** taken a minute after pass 2; no visible difference at the
   sizes I compared. It is the baseline of this session.
4. **Pass 4** (this session, 2026-10-28): spec sheet sat at the bottom edge of the hero
   with empty space above it; spec labels were hard-coded in the template;
   leads under page titles in third person. → `align-items: center`,
   labels to `src/i18n/ui.ts`, descriptions in first person.
5. **Pass 5:** subpages looked flat against the coloured home page.
   → `--gradient-page`, the two hero tints fading out behind the page
   header (new contrast pairs: accent and teal on both tints, all ≥ 5.4:1).
   Spec sheet column widened (1.4fr / 1fr) so the language list wraps less.
6. **Pass 6** (after the browser and Lighthouse fixes): target sizes of
   TOC and feed links fixed (no visual change beyond a little more air);
   project detail box said "Schlagwort" (singular) above three tags →
   plural label. 0 overflow problems at 320 px, 0 console errors.

## R2-D8. Critical review (first-time-visitor view, after pass 6)
Looking at the site as someone who lands on it for the first time:

- **Works:** the home page says in three seconds who this is and what he
  does (name, one sentence, spec sheet). Colour is used for meaning
  (status, labels, links), not decoration. Dark mode looks designed, not
  inverted. The 404 page is friendly and useful. Long texts (project
  pages, the example post) read calmly in one column.
- **Weak, not fixed in this revision:**
  - In light mode the gradient name runs violet → blue and the teal end is
    barely visible on the short word "Timur"; the gradient reads as "one
    blue". It still meets AA at every stop. A stronger hue shift would need
    a lighter teal, which fails contrast on white.
  - /links is a long plain list next to a colourful home page. It is the
    page that most needs its own layout (tiles per profile) once there
    are more accounts than GitHub.
  - On phones the header takes three rows (brand, tools, nav, ~100 px)
    before content starts. Acceptable, but a later revision could fold
    search and theme into one row with the brand.
  - Without real posts, the home page's "Latest posts" section is empty
    in production (it shows the "nothing published yet" card). The page
    looks better once there is one real post.
  - The OG image is still from the old design (CONTENT-TODO §6).

## R2-D9. Octo removed, statuses from sources
- Octo: project pages DE/EN deleted, mentions removed from About, Now,
  `llms.txt`, JSON-LD, search index, tests, docs and `CONTENT-TODO.md`.
  `/de/projects/octo/` and `/en/projects/octo/` (with and without slash)
  answer **301** to the project overview of the same language
  (`deploy/site-config.json`). Git history untouched.
- Status of every project from its repository on 2026-10-27: Aura
  "in development" (README still says "Phase 0", commits are much further;
  the text says exactly that), Epiphyte "active" (last commit 21 Oct
  2026), Saeculum "paused" (no commit since 10 Aug 2026), gauss-trainer
  "active", but `draft: true` until Timur approves it. Older learning
  projects: drafts, `archived`.

## R2-D10. Lighthouse without a permanent dependency
Lighthouse runs via `npx lighthouse` against the local production-header
server with the system Chromium (`--chrome-path`), not as a
devDependency: it is large, pulls in many transitive packages, and would
change `npm audit` for a tool that is only run by hand. Results:
`docs/VERIFICATION.md` R2 §4.

## Critique of the second brief
- **(critique) "Browsers send languages sorted, the first entry is
  enough"** is right for browsers, but the HTTP spec orders by q-value,
  not by position. Implemented as asked (documented above), because
  evaluating q-values in a Caddy matcher would need a regex nobody can
  review.
- **(critique) `@view-transition`** is asked for as progressive
  enhancement. It is in, but Firefox (Timur's browser) does not support
  cross-document view transitions yet (BCD 2026-10-28), so he will not see
  it. No fallback is needed; navigation is simply instant.
- **(critique) Lighthouse ≥ 95 in "all categories"** includes "SEO" and
  "Best Practices", which partly reward things this site deliberately does
  not do. Deviations are explained in `docs/VERIFICATION.md`, not worked
  around.
- **(critique) Netcup in the privacy policy** contradicts D25 of the first
  run (no hoster details). Done as asked: a privacy policy has to name the
  processor, and the hoster of a domain is discoverable anyway.

---

# Revision 3 (brief `prompts/portfolio-umbau-3.md`, 2026-10-28)

A pure design pass: lighter and finer, light mode retuned, subtle motion.
No text, route, language-logic, Caddy or private-layer change.

Two sessions. Session 1 implemented tokens, components, motion and the
browser tests (`d3b3ec4`, `8fb8840`, `9829f45`) but wrote no notes; the
entries for those commits (R3-D1 to R3-D6) are **reconstructed from the
diff against `c704f13` and from comparing `.screenshots/r3/vorher/` with
the later shots**, not from notes taken at the time. Session 2 re-ran both
gates, did the documented screenshot passes P1–P6 (R3-D8) and fixed what
they found (`8980070`, `38f2de5`, `c4e818f`, `2cd2789`).

## R3-D1. Home page, section by section
Compared in `.screenshots/r3/vorher/home-de-*` and `.screenshots/r3/nachher/`.

| Section | Too loud before | Change |
|---|---|---|
| Header | Brand at weight 700, monogram 2rem at 800; the current page as a filled tonal pill; current language at 700 | Brand 600, monogram 1.75rem at 600; current page: text colour plus a 2px gradient hairline (`.nav-indicator`), hover fades a hairline in at 45%; language at 500 |
| Hero | A framed box with border and a mesh-gradient fill around everything; name at weight 800, up to 86px, line-height 0.98, two lines at 1280px; uppercase, letter-spaced eyebrow; claim 28px at 560; spec sheet with the stronger shadow | No box: the hero sits on the page, the two tints behind it (`--gradient-home`); name at 600, up to 72px, line-height 1.06, one line at 1280px; eyebrow in sentence case, mono 500, with a short hairline; claim 24px at 450; spec sheet with the hairline shadow, capped at 36rem (P5) |
| /now + contact | /now as a saturated violet tonal block with a 2xl heading; contact links underlined at weight 600 | /now is an unfilled card like the others, heading xl; contact links without a resting underline, body size and weight (P1) |
| Projects | Card titles xl, 28px radius, filled chips, status pills at 650 with letter spacing | Titles lg at 560, 20px radius, chips as 1px outlines at 11.5px, status at 500, badges with the quiet border; hover lift and gradient contour (R3-D5); at two columns an odd last card fills its row (P4) |
| Posts | Uppercase, letter-spaced mono category labels on the cards | Sentence-case eyebrows; same card changes as projects; same odd-tile rule (P4) |
| Footer | A filled surface band with 3rem padding on top | No fill, a hairline on top, 2rem padding, links without resting underline |
| Between sections | 4.5rem (`--space-8`) | `--space-section`: clamp(4.5rem … 7.5rem); 112px at 1280px |

## R3-D2. Before/after: weights, sizes, surfaces

| Element | Before (R2) | After (R3) |
|---|---|---|
| Headings h1–h4 | 680, h1 760 | 600 (`--weight-heading`); h3, h4, card titles 560 (`--weight-strong`) |
| Hero name | 800, `clamp(2.9rem, 1.6rem + 5.6vw, 5.4rem)`, line-height 0.98, tracking −0.045em | 600, `clamp(2.6rem, 1.5rem + 4.6vw, 4.5rem)`, 1.06, −0.034em |
| h1 / h2 / h3 (max) | 3.4rem / 2rem / 1.5rem | 3rem / 1.8rem / 1.4rem |
| `--leading-tight` | 1.12 | 1.18 |
| Hero claim | max 1.75rem, 560 | max 1.5rem, 450 |
| Body text | 400 (implicit) | 400 (`--weight-body`); card body 1rem instead of 1.0625rem |
| Buttons | 600, 1.0625rem | 500, 0.9375rem |
| Eyebrows, labels | 600, uppercase, 0.08em tracking | 500, sentence case, 0.01em, hairline before |
| Status pill / chip / badge | 650 + tracking / filled surface / border-strong | 500 / transparent with 1px border / quiet border |
| Radii `--radius` / `--radius-lg` | 1rem / 1.75rem | 0.75rem / 1.25rem |
| Shadows | two layers each | `--shadow-1` one hairline, `--shadow-2` one hairline + soft drop with negative spread |
| Hero | framed box with mesh fill | no box, page tints behind |
| /now card | tonal fill | card surface + 1px contour |
| Footer | surface fill | none |
| Notice, blockquote, TOC | surface fill, 3px accent edge | card surface (white in light mode), 2px accent edge |
| Project filter | card-style box | no box, a row of controls (P2) |
| Card padding | 1.5rem | clamp(1.25rem … 1.5rem) |

New tokens: `--weight-body/label/strong/heading`, `--leading-display`,
`--space-section`, `--color-underline`, `--gradient-home`, `--mask-solid`,
and the motion tokens in R3-D5. Removed: `--gradient-mesh`, `.card--tonal`.

## R3-D3. Light mode retuned
Depth through surface steps, not colour: a faintly violet base, white cards
above it, a deeper tone for quiet surfaces; shadows only as hairlines.

| Token (light) | Before | After | Note |
|---|---|---|---|
| `--color-bg` | `#fbfbfe` | `#f5f4f9` | tinted base instead of near-white |
| `--color-surface` | `#f1f0f7` | `#ecebf3` | one step below the base |
| `--color-raised` | `#ffffff` | `#ffffff` | cards now stand out from the base |
| `--color-accent` | `#5530d9` | `#5d3ce6` | own lightness, a little brighter; 5.90:1 on bg |
| `--color-accent-hover` | `#3f1fb0` | `#4526c4` | |
| `--color-accent-2` | `#09636d` | `#087078` | petrol, lighter; 5.33:1 on bg |
| `--color-underline` | – | `#b9acf2` | resting link underline |
| `--color-glow-1` / `-2` | `#e6defe` / `#d3efed` | `#ebe5fd` / `#dcf1ee` | tints less saturated |
| `--color-grad-1/2/3` | `#5530d9` / `#2f50c8` / `#09636d` | `#7350f5` / `#3f63e6` / `#0b8a82` | name gradient, large text (R3-D4) |
| `--color-code-bg` | `#f3f2f9` | `#fdfcff` | code on a near-white plate |

Worst point of the name gradient: before 5.24:1 against a 4.5:1 target
(it read as one blue), now 3.45:1 against the 3:1 large-text target; the
violet → blue → teal run is visible in light mode as well.

**Dark mode:** every colour value is unchanged. Added: `--color-underline`
(`#5f509f`, for the quieter underline). Changed: the two shadow tokens are
softer, to match the lighter look (shadows, not palette colours; to revert,
restore the two `--shadow-*` lines from `c704f13`).

Alternatives: keep 4.5:1 for the name and accept the blue (rejected:
Timur's feedback); `oklch()`/`color-mix()` (rejected: the contrast check
needs plain hex values); a white base with grey cards (rejected: the brief
asks for a tinted base with lighter cards).

## R3-D4. Contrast check: threshold by use
`tools/check-contrast.mjs` assigns each pair a threshold by what it is used
for: `TEXT` 4.5:1 (body, links, labels, chips, meta), `LARGE` 3:1 (text
guaranteed ≥ 24px), `UI` 3:1 (component borders, focus, gradient
contours). LARGE is granted only through `largeTextToken(token, selector)`,
which verifies that the token's lower bound is ≥ 1.5rem (`--text-display`:
2.6rem = 41.6px) and (since session 2) that the rule for `selector`
(`.hero__title`) really uses that token. Also since session 2: the check
fails if `gradient-text` appears on any element other than `.hero__title`,
because only that use was checked at 3:1. The "18.66px bold" alternative of
WCAG is not used: no heading is bold any more (max weight 600).

## R3-D5. Motion: tokens and states
| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 150ms | colour, underline, border |
| `--duration` | 200ms | lift, shadow, contour, nav hairline |
| `--duration-slow` | 300ms | reveal, view transitions |
| `--duration-reduced` | 80ms | every transition under reduced motion |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | all of the above |
| `--lift-button` / `--lift-card` | −2px / −3px | hover lift |
| `--reveal-shift` / `--reveal-stagger` | 8px / 60ms | reveal on scroll |

- **Links:** the underline goes from `--color-underline` to the full
  colour, the colour darkens; 150ms.
- **Buttons:** lift 2px and get the soft shadow; pressed: back down and
  `scale(0.98)` in 60ms. Icon buttons: `scale(0.94)` when pressed.
- **Cards:** lift 3px, a 1px gradient contour fades in (masked
  pseudo-element), the shadow softens; the title takes the accent colour.
  Keyboard focus shows the contour and a 2px outline, without the lift.
- **Chips, language switch, icon buttons:** colour, border and background
  transitions only.
- **Navigation:** a hairline under the hovered item fades in and grows
  from 40% to full width; the current item's line is a real element
  (`view-transition-name: nav-indicator`), so a cross-document view
  transition moves it from the old item to the new one.
- **Theme toggle:** a crossfade between the palettes via
  `document.startViewTransition` where it exists and motion is welcome,
  instant otherwise. No flash on load: `/theme-init.js` sets the theme
  (and the `.js` class) before first paint.
- **Page change:** `@view-transition { navigation: auto }` with the default
  crossfade at 300ms, only inside `prefers-reduced-motion: no-preference`.
- Anything that moves is inside `prefers-reduced-motion: no-preference`;
  under `reduce` all transitions are forced to 80ms and no delay.

## R3-D6. Reveal on scroll: a 0.6 KB script, not scroll-driven animations
`src/scripts/reveal.ts` (595 bytes built, 364 gzip): cards, section heads
and list entries that **start below the fold** get `data-reveal="hidden"`
and fade in once (opacity + 8px) when they enter the viewport, staggered by
60ms within a batch (max 4 steps). The hidden state exists only in CSS
inside `prefers-reduced-motion: no-preference`; the script does nothing
without `IntersectionObserver` or with reduced motion; without JS nothing
is marked. Elements in view at load are never touched (no flash, CLS 0).
Print forces everything visible.

Why not CSS scroll-driven animations (`animation-timeline: view()`, which
the brief prefers): support is fine by now (BCD: Chrome 115, Firefox 159,
Safari 26), but a view timeline ties opacity to the scroll position. Half
in view means half transparent, and scrolling back up runs it in reverse.
That is a scroll-linked effect (excluded by CLAUDE.md) and not "once"
(asked for by the brief). An IntersectionObserver triggers a normal
time-based transition, once.

## R3-D7. Browser support of the new techniques
MDN browser-compat-data (raw JSON, 2026-10-28) and caniuse:

| Technique | Chrome | Firefox | Safari | Without support |
|---|---|---|---|---|
| `IntersectionObserver` (reveal) | 51 | 55 | 12.1 | nothing is marked, everything visible (tested, browser suite b2) |
| `@view-transition` (page change) | 126 | not supported (BCD); "partial" from 144 (caniuse) | 18.2 | normal, instant navigation |
| `document.startViewTransition` / `view-transition-name` (theme crossfade, nav line) | 111 | 144 | 18 | instant theme switch; static nav line |
| `mask-composite: exclude` (card contour) | 120 | 53 | 15.4 | `@supports` fails: the border colour change remains |
| `:has()` (card hover from its link) | 105 | 121 | 15.4 | no lift/contour on hover; the link and its focus outline work |
| `text-decoration-color` transition | 57 | 36 | 12.1 (`-webkit-` 8) | underline switches without fade |
| `prefers-reduced-motion` | 74 | 63 | 10.1 | treated as "no preference" |

Firefox, Timur's browser, therefore shows everything except the page-change
crossfade.

## R3-D8. Screenshot passes
`node tools/screenshots.mjs dist-drafts --pass r3/<n> --widths 390,1280
--full --tiles --pages home-de,projects,project,about,blog,post,404`
(7 pages × 2 widths × light/dark; `--tiles` added in session 2 so 390px
pages can be read at full size). Before: `.screenshots/r3/vorher/`, after:
`.screenshots/r3/nachher/` (both git-ignored).

Session 1 left `d1`–`d4`, `d5-extra` and `states1` without notes; the only
visible result is `9829f45` (card labels and meta had shrunk with the card
body text; spacing under list titles).

Session 2:

1. **P1** (all 7 pages, 390 + 1280): (a) the contact list was the loudest
   element in the middle of the home page: four violet links at 500,
   larger than body text; (b) the filter box on /projects outweighed the
   cards, on a phone it filled half the first screen; (c) inline link rows
   (blog categories; links and tags on project pages) ran together like
   one underlined sentence. Light and dark side by side: same mood, dark
   palette intact.
2. **P2** (after fixing a–c, `8980070`): contact list in body size and
   weight; filter as a plain row, two selects side by side on a phone;
   link rows with 1rem gaps. The dangling "Entwurf" badges on post cards
   exist only in the drafts build.
3. **P3** (interaction states, both themes, own capture script): card
   hover (lift, contour, shadow, title colour), button hover and focus
   ring, nav hairline, language switch hover, keyboard focus on a card.
   All consistent and quiet; nothing to fix.
4. **P4** (768px, five pages incl. links and contact): the third project
   and the third post sat alone in their row next to a hole.
5. **P5** (390/768/1000/1280, home DE + EN, after the P4 fix, `38f2de5`):
   holes gone at 768 and 1000; new finding: below the two-column hero the
   spec sheet spanned the full width with short lines → capped at 36rem.
6. **P6** (final set into `nachher/`): post with code and maths on a phone
   (code scrolls sideways as intended), 404, hero on a phone. No further
   defects. 0 overflow at 320px, 0 console errors in every pass.

## R3-D9. Deviations from the brief and critique
- **(deviation) Button press in 60ms**, below the 150–300ms range. A press
  must answer immediately; 150ms feels like lag. Hover and release keep
  the token durations.
- **(deviation) No CSS scroll-driven animations** for the reveal (R3-D6):
  they would be scroll-linked and not once.
- **(deviation) Dark shadow tokens softened** although the dark palette is
  to stay unchanged: all colour values are identical, only the two shadow
  tokens are lighter (R3-D3).
- **(critique) "Hero name with a sampled gradient at 3:1"** is right, but
  only safe while the gradient stays on large text; the check now enforces
  that (R3-D4) instead of relying on the convention.
- **Still weak:** Firefox shows no page-change crossfade; /links stays a
  plain list; the phone header takes three rows (all as in R2-D8).

---

## Critique of the brief

- **(critique) Per-category feeds per language** produce 8 category feeds
  plus 2 main feeds, most of them empty for a long time. They are cheap and
  cause no harm, so they were built as asked. With few posts, the two main
  feeds are what people will actually subscribe to.
- **(critique) "PGP key under `/.well-known/`"**: a key file somewhere under
  `/.well-known/` is not a standard. The real standard is **WKD** (Web Key
  Directory): `/.well-known/openpgpkey/hu/<z-base-32 hash of the local
  part>` plus a `policy` file, so that mail clients find the key
  automatically. The Caddy block already sends the CORS header WKD needs.
  `docs/DEPLOY.md` explains how to generate the files with
  `gpg --list-keys --with-wkd-hash`. A human-readable key file
  (`/pgp-key.asc`) with the fingerprint on `/contact` is the second,
  complementary part.
- **(critique) Lighthouse ≥ 95** is a good proxy, but a lab score of one run.
  The parts that matter (page weight, request count, no render-blocking third
  parties, contrast, axe) are checked deterministically on every build
  instead. Lighthouse itself needs Chromium, which was not available here.
- **(critique) Privacy policy and imprint pages with visible `TODO(Timur)`
  markers** would go live as they are. Pages with open TODOs on a public site
  look unfinished. I kept them, because inventing legal text is worse and the
  brief asks for exactly this. **Fill them in before going live**
  (CONTENT-TODO.md, first section).

---

# Revision 4 (brief `prompts/portfolio-umbau-4.md`, 2026-10-28)

Last pass before push and go-live: light mode after Material 3 (blue
primary), one box construction, more (still quiet) hover motion, a new
About text, polish, a pre-push check. The dark palette is unchanged and
guarded by a snapshot. No server access, no push, no history rewrite.

## R4-D1. About: structure, sources, about-extra by convention
- There is **no `private/about-notes.md`**, so the text comes only from
  public sources: the briefs, the old site, the repositories (READMEs,
  commits) and the GitHub profile README. Sources are listed in an HTML
  comment at the end of each `about.md` (stripped from the output).
- Structure: a three-sentence opening, then "What I do" (each project with
  one concrete sentence and a link), "Studies and focus", "What I work
  with" (languages weighted honestly, one list in `src/data/site.ts` for
  facts block, hero and About), "Stance" (self-hosting, data rights in
  Aura, minimal rights in Epiphyte, this site's own rules), "Other
  interests", "Contact". Short paragraphs, no keyword lists. A fact bar of
  small filled tiles sits under the lead.
- The lead (= meta description) no longer repeats the first sentence of
  the text and stays under 160 characters (`6b2ff6b`).
- Blocklist topics in the profile README (religion, finances) are not
  used anywhere; CONTENT-TODO only notes that they exist.
- **about-extra by convention:** `private/content/<lang>/about-extra.md`
  is appended when the file exists, without a YAML entry (simpler, nothing
  to forget). `check-build-modes` builds with and without the file per
  language and checks the output.
- About names `gauss-trainer`, a draft project that is a public GitHub
  repository. The drafts check now allows the *name* of a draft with
  `links.repo`; its page and URL still must not appear (`757f76a`).
- Status stays `draft-review`.

## R4-D2. Light mode after Material 3; one brand in two modes
Colour roles generated with Google's `material-color-utilities` (HCT),
seed `#1a73e8`, scheme "vibrant", role → tone as in the Material Web
tokens (`md.sys.color`, v34). One-off generator in the git-ignored `.tmp/`,
not a dependency. Every value is a plain hex, checked by the contrast tool.

| Token | R3 (before) | R4 (after) | M3 role |
|---|---|---|---|
| `--color-bg` | `#f5f4f9` | `#f9f9ff` | background / surface (N98) |
| `--color-surface` | `#ecebf3` | `#ebedfa` | surface-container (N94) |
| `--color-raised` | `#ffffff` | `#ffffff` | surface-container-lowest |
| `--color-text` | `#15141f` | `#181c25` | on-surface (dark grey-blue) |
| `--color-muted` | `#4b495e` | `#424753` | on-surface-variant |
| `--color-border` | `#e0deea` | `#c2c6d6` | outline-variant |
| `--color-border-strong` | `#77748c` | `#727785` | outline |
| `--color-accent` | `#5d3ce6` | `#005bc0` | primary (P40) |
| `--color-accent-hover` | `#4526c4` | `#004493` | P30 |
| `--color-tonal` | `#ede8ff` | `#d8e2ff` | primary-container |
| `--color-on-tonal` | `#3a1d9e` | `#004493` | on-primary-container |
| `--color-underline` | `#b9acf2` | `#96b9ff` | P75 |
| `--color-accent-2` | `#087078` | `#006781` | petrol blue, hue 225 T40 |
| `--color-tonal-2` / `--color-on-tonal-2` | `#dcf2f1` / `#08525a` | `#d0f0fe` / `#004d62` | T93 / T30 |
| `--color-success-container` / on | – | `#caf5dc` / `#005237` | green, harmonised |
| `--color-warning-container` / on | – | `#ffe7cf` / `#663e00` | amber, harmonised |
| `--color-glow-1` / `-2` | `#ebe5fd` / `#dcf1ee` | `#e0e8ff` / `#eae5ff` | blue / blue-violet T92 |
| `--color-grad-1…3` | `#7350f5` `#3f63e6` `#0b8a82` | `#7267dc` `#0073ef` `#0082a1` | hue 290 T50, P50, hue 225 T50 |
| `--color-mark` | `#fff0a8` | `#ffddb8` | amber T90 |
| `--color-code-bg` | `#fdfcff` | `#f1f3ff` | surface-container-low |
| `--code-*` | violet/teal family | `#595e6c` `#005bc0` `#006c4a` `#865300` `#006781` | T40 of their hues |

- Green and amber appear only in the project status (sparingly, as
  asked); red is not used (no error states on a static site).
- Hero name: blue-violet → blue → petrol, the blue neighbourhood only, no
  four-colour rainbow. Large text, worst sample 3.63:1 (min 3).
- **One brand in two modes, dark untouched.** Both modes share every
  shape, the type, the grid, the box types and the motion. The colour
  bridge is the hue range: the light gradient starts at blue-violet (hue
  290), right next to the dark violet; both modes have a second accent in
  the blue-green family (petrol light, teal dark) in the same places
  (eyebrows, list markers, gradient end); the gradient runs in the same
  direction. Screenshot pass P5 compared the pairs.
- **Snapshot:** `tools/check-dark-tokens.mjs` (in `npm run check`)
  compares both dark blocks with `tools/fixtures/dark-tokens.snapshot.json`
  and fails on a changed value or on any colour new to dark mode. New
  dark tokens reuse snapshotted values (status containers, `--shadow-3`)
  or reference tokens (`--elevated-border`). Not updated in this run.
- **Font:** Inter stays. Google Sans is proprietary. Roboto Flex (OFL)
  would be allowed but gives no clear gain over Inter, a similar neutral
  grotesque; switching would cost a re-tune of every size and weight.

## R4-D3. Boxes: one construction after Material 3
| Type | Look | Used for |
|---|---|---|
| outlined (`.card`, `.box--outlined`) | card surface, 1px outline-variant, elevation 0 at rest | project and post cards, /now card, link rows (/links), detail lists (project, contact, imprint), TOC, code blocks |
| filled (`.box--filled`, `.fact`, `.filters`, `.notice`) | surface-container tone, no contour | contact box (home), fact tiles (About), filter bar, notices, empty blog state |
| elevated (`.box--elevated`) | card surface, elevation 1; no outline in light (M3), the contour stays in dark (`--elevated-border`) | the hero's spec sheet only |
| small elements | radius 8, tonal or outlined | chips (outlined), status (tonal containers), badges, tonal and text buttons |

- **Radius scale** (M3 shape): 4 inline code, 8 chips/status, 12 small
  boxes, 16 cards, 24 large panels (empty state), full for buttons.
- **Elevation:** level 0 at rest, 2 on hover (cards), 1 for the spec sheet
  and hovered filled buttons; M3 shadows in light (30 % key, 15 % ambient).
- **Padding** on the 4/8 grid: 20 px boxes (24 px from 48rem), 16 px small
  boxes, 12 px between title, body and meta; grid gap 16/24 px.
- **Inside a card:** top row (status left, badges right), title, body,
  foot (chips, then meta left and the action arrow right).
- **Action indicator:** every clickable box and every "more" link ends in
  an arrow (`src/components/Arrow.astro`), diagonal for links that leave
  the site.
- **Dark mode: shape only.** No colour value changes (snapshot). The box
  types map to existing dark surfaces: filled → `--color-surface`,
  outlined/elevated → `--color-raised`. I read "nicht die Farben" as "no
  new or changed colours", not "every element keeps its token"; a notice
  or the fact bar now sits on the dark surface tone instead of the raised
  one.
- **(deviation) No large filled-tonal boxes.** A tonal /now card would put
  a violet surface into dark mode, which reads as a colour change. Tonal
  stays on small elements (status, current language, tonal button).

## R4-D4. Motion: more on hover, still quiet
| Token | R3 | R4 | Use |
|---|---|---|---|
| `--duration-fast` | 150ms | 200ms | colour, border, state layer (M3 short4) |
| `--duration` | 200ms | 250ms | lift, elevation, contour, arrow (M3 medium1) |
| `--duration-slow` | 300ms | 350ms | reveal, theme icon, view transitions (M3 medium3) |
| `--duration-press` | 60ms (literal) | 100ms | press feedback |
| `--ease` | `cubic-bezier(0.2, 0, 0, 1)` | same | M3 "standard", everything that reacts |
| `--ease-out` → `--ease-enter` | `cubic-bezier(0.22, 1, 0.36, 1)` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | M3 "emphasized decelerate", reveal |
| `--lift-card` | −3px | −4px | card hover (brief: ≤ 6 px) |
| `--nudge` | – | 3px | arrows (2–4 px) |
| `--reveal-shift` / `--reveal-stagger` | 8px / 60ms | 12px / 80ms | reveal on scroll (maxima of the brief) |
| `--chip-stagger` | – | 30ms | chips of a hovered card, one after another |
| `--state-hover` / `-focus` / `-pressed` | – | 0.08 / 0.10 / 0.10 | M3 state layers |

- **Cards:** state layer (the text colour at 8 % on the card link's
  pseudo-element), elevation 0 → 2, lift 4 px, gradient contour, title in
  the accent colour, arrow 3 px forward (diagonal for external links),
  chips darken one after another. Focus: 10 % layer, contour and an
  outline that fades in; press: 10 %.
- **Elsewhere:** nav items get a surface state layer and the hairline
  grows in; the current item's line glides with a cross-document view
  transition; the focus ring fades in and settles (keyframes on
  `:focus-visible`); the theme icon crossfades with a quarter turn; filled
  buttons lift 2 px and rise to elevation 1, text buttons move their
  arrow; reveal on scroll 12 px / 80 ms with emphasized decelerate.
- **Technique:** every hover rule is inside `@media (hover: hover)`;
  touch screens get the `:active` state only (tested: a tap leaves no
  lifted or tinted card). Only `opacity` and `transform` move; colours,
  borders and shadows cross-fade. CLS 0. Under reduced motion nothing
  moves, the theme icon only crossfades, colours change in 80 ms; without
  JS or `IntersectionObserver` everything is visible.
- **Not built:** scaling preview images (there are none); "lists react
  staggered" is done for the chips of a hovered card, not for whole lists
  (a list reacting to one hovered item would be busy).
- **Fallbacks** (R3-D7 table still applies): without `:has()` (Firefox
  < 121, Safari < 15.4) the card does not lift and gets no contour, but
  link colour, state layer, arrow and focus work, because they hang on the
  link itself; without mask compositing the contour becomes a
  border-colour change; Firefox has no cross-document view transitions, so
  the nav line jumps instead of gliding. Focus-ring keyframes and the icon
  crossfade work in all three engines.
- **(deviation) State layer 10 % for focus and press**, not "about 12 %":
  the current Material 3 tokens (`md.sys.state.focus.state-layer-opacity`,
  `pressed`) are 0.10. The contrast check composites the layers onto every
  box surface (worst: accent on surface + 10 %, 4.55:1).

## R4-D5. Pre-push check instead of a history rewrite
`npm run check:prepush` (`tools/check-prepush.mjs`, read-only) scans every
commit between `origin/main` (else `pre-redesign`) and `HEAD`: added lines
and commit messages for private-layer values, server details and token
patterns; author and committer e-mails; files that belong in
`.gitignore`. GO or NO-GO, findings with commit, file, line, masked value.
- **Where server details come from** without writing them into a tracked
  file: generic patterns (IPv4/IPv6 outside loopback and documentation
  ranges, `/var/www/…`, `/srv/…` except the documented placeholders,
  `/home/<user>/`, `/root/`), the git-ignored
  `private/prepush-denylist.txt` (one literal per line; created locally
  with the alias and the web root) and `~/.ssh/config` (aliases, host
  names, users of every block that is not a code host).
- A value that is part of the public facts (`src/data/site.ts`) is
  skipped: the server user is named like its owner, and that name is on
  every page.
- Today: NO-GO (70 author/committer e-mails at `a24de7d`, the SSH alias, 15 server
  paths, 17 denylist hits, one tracked `.directory` in `ea40ee1`, which is
  in the range because `pre-redesign` was never pushed). After the squash
  in `docs/GO-LIVE.md` step 3: GO, rehearsed in a clone.
- Not in CI: CI checks out one commit and has no private data; the check
  belongs on the machine that pushes.

## R4-D6. Empty blog
At launch every post is a draft. Instead of a dashed placeholder: a large
filled panel with a feed icon, "No posts yet", one honest sentence on what
will come (the topics from the blog description), a tonal button for the
RSS feed and text buttons to the projects and to About. Used on the home
page, the blog, the archive and the tag index; empty category pages use
it while the whole blog is empty and fall back to the short line once
there are posts elsewhere (`src/components/EmptyPosts.astro`).

## R4-D7. Open Graph image and favicons
The old default image was the Nord design and said "coaches others in
sport", which no current source backs up. `tools/brand-assets.mjs` renders
a new one (1200×630, 120 KB) and the favicons from the light tokens and
`ui.ts` with the self-hosted Inter in the system Chromium: eyebrow, name
in the gradient, tagline, monogram and domain. No third party, no new
dependency (Playwright is already a dev dependency). One image for both
languages (English), as before.

## R4-D8. Screenshot passes
`node tools/screenshots.mjs <dist> --pass r4/<n> …` (git-ignored
`.screenshots/r4/`); before: `vorher/` (drafts build), `vorher-prod/`
(empty blog); after: `nachher/` (all 16 page types, 390 + 1280, light +
dark, full page) and `nachher-prod/`.
1. **P1** (home, projects, about, links, post, contact; home and blog of
   the production build): the spec sheet looked heavy (outline plus
   shadow) → elevated boxes lose the outline in light mode; the /now
   eyebrow was grey inside cards but teal elsewhere (`.card p` beat
   `.eyebrow`) → fixed; "Stand   27. Oktober" had a flex gap inside the
   phrase → wrapped.
2. **P2** (all page types, 390 + 1280): project page, post with series
   notice, TOC and code, contact, 404 with text buttons: consistent. The
   same gap in "Zuletzt aktualisiert:" on content pages → fixed.
3. **P3** (768 + 1920): bento and post grid without holes at 768; at 1920
   the filter bar stretched over 1536 px for three controls.
4. **P4** (320 + 1280 after the fix, `bc24188`): filter bar as wide as its
   controls; About at 320 px: fact tiles stack, no overflow.
5. **P5** (light vs dark, About and blog): same shapes, grid, type, box
   types and spacing; only the palette differs. The pair reads as one site.
6. **P6** (final set `nachher/`, `nachher-prod/`): no further defects.
   0 overflow at 320 px and 0 console errors in every pass.

## R4-D9. Dependencies and CI
- `npm outdated`: only `@types/node` (24 → 26) and `typescript` (6 → 7)
  are behind, both on purpose: the types follow the oldest supported Node
  (24 in CI), and TypeScript 7 (the native compiler) is not supported by
  `@astrojs/check` yet. `npm audit`: the 3 known low findings (katex,
  build time only).
- CI: actions pinned to the commit of their current release (checkout
  v7.0.1, setup-node v7.1.0, upload-artifact v7.0.2, lychee-action v2.9.0,
  checked against the release pages), `persist-credentials: false`,
  `permissions: contents: read`, no secrets, no deployment, public build
  mode, Chromium installed by Playwright. `check:prepush`, the release
  rehearsal, Lighthouse and screenshots stay local (README).

## R4-D10. Deviations and critique
- **(deviation)** State layer 10 % instead of ~12 % (R4-D4); no large
  tonal boxes (R4-D3); no scaling preview images (none exist).
- **(critique) "Google colours" without the brand:** a blue primary with
  pastel containers is generic enough to be safe; the site uses no Google
  name, logo, font or icon. The four-colour rainbow would have been the
  recognisable part, and it is out.
- **(critique) Pre-push base `origin/main`:** right, but the local tag
  `pre-redesign` (`ea40ee1`) was never pushed, so its commit is in the
  range and its tracked `.directory` shows up. The squash covers it;
  pushing tags would not (GO-LIVE says so).
- **(critique) One commit loses the history on GitHub.** The full history
  stays local on `redesign`. Rewriting each commit (`git filter-repo`)
  would keep the steps, but that is a history rewrite, which this brief
  excludes.

---

# Revision 5

## R5-D1. Example posts become test fixtures
The six example posts of revision 1 move to `tests/fixtures/blog/<lang>/`.
`src/content.config.ts` loads that folder only when `CONTENT_FIXTURES=1`,
which `tools/build.mjs --fixtures` sets (`build:drafts` uses it). The release
build refuses `--fixtures`, `--build-date` and both environment variables.
`check:fixtures` scans dist, the public build and the release build of
`check:build-modes` (HTML, feeds, sitemap, llms.txt, search index, JSON-LD)
for every title, slug and a text sample of each fixture, and requires them
in `dist-drafts` (so the scan cannot pass by scanning nothing).
- Alternative: a separate Astro project for tests. Rejected: it would test
  a copy of the configuration, not the configuration.

## R5-D2. Launch posts: topics and how they were checked
| # | Post | Category | Languages | Date |
|---|---|---|---|---|
| 1 | Elliptic-curve group law, worked through on a 19-point curve | math-crypto | DE + EN | 2026-10-30 |
| 2 | The double-spend calculation of the Bitcoin white paper, recomputed | blockchain | DE + EN | 2026-10-30 |
| 3 | Content-Security-Policy for static sites | tech | DE | 2026-11-06 |
| 4 | Subset Sum: NP-complete and still often easy | theory | DE | 2026-11-13 |

- Chosen from the brief's list by how far every claim can be checked by
  running code: each post has a script under `tests/articles/` whose
  asserts fail if a number quoted in the text changes
  (`npm run check:articles:system`; the CSP post's 35 browser experiments
  run in Chromium). Merkle trees/SPV and selfish mining were the
  alternatives; the double-spend post covers the probabilistic side of
  proof of work more deeply, and names selfish mining as a limit of its
  model.
- Sources checked against primary sources (W3C CSP3, arXiv abstracts and
  the Mertens PDF, Crossref for every DOI). Links behind bot protection
  (dblp, a university repository, American Scientist) were replaced by DOIs
  or by a plain citation, so the CI link check (lychee) stays stable.
- New categories `blockchain` and `theory` (entries in categories.yaml).
- Tables whose header cell was only a formula (`$q$`) failed axe's
  empty-table-header in jsdom (MathML has no text there); those cells are
  italic text now (*q*).
- **(deviation) Dates:** session 1 wrote posts 1 and 2 on 2026-10-29 and
  dated them so; the run finished on 2026-10-30. The brief forbids dates in
  the past, so all four moved forward by one day. A later date never claims
  more than is true; an earlier one would.

## R5-D3. Scheduled posts by build day
`src/lib/schedule.ts` decides with calendar days in Europe/Berlin: a post
appears in the first build on or after its date, whatever the machine's
time zone. Production and release builds leave it out completely; dev and
test builds show it with a badge, `noindex` and outside the sitemap.
`BUILD_DATE` overrides the day outside release mode only (typos throw).
Tests: yesterday, today, tomorrow, one second before and exactly at
midnight Berlin time (`check:scheduled`).

## R5-D4. Publishing: switch a symlink, never touch Caddy
**Facts used** (no server access in this run): the first go-live
(`deploy/apply-on-server.sh`) unpacks every release as root into
`<web root>/releases/<id>/`, read-only for others, and points
`<web root>/current` at it; the generated Caddy block serves
`root * <web root>/current`. Caddy resolves the symlink per request.

**Chosen:** `npm run publish` (`tools/publish.mjs`) builds with
`deploy/build-release.sh` (no duplicated build logic), compares, uploads the
content only to `~/deploy-staging/publish/<id>/` and runs
`deploy/publish-on-server.sh --apply` with one `sudo`: unpack into
`releases/<id>/`, switch `current` atomically (`ln -sfn` + `mv -T`), check
over HTTP on the server (`--resolve` to 127.0.0.1, like the go-live smoke
tests), switch back on any failure or interruption. No Caddy reload, no
Caddyfile write.
- **Variant B** (one sudo per publish) is the default because the chain
  itself makes releases root-owned, so the SSH user cannot alter what is
  served. **Variant A** (no sudo) exists as `--no-sudo` for a web root owned
  by the SSH user; the server script checks write access either way.
  `docs/PUBLISHING.md` lists the read-only commands that tell which applies.
- **Rejected: syncing into the web root with a backup** (the brief's
  default "without a Caddy change"). It is not atomic (a visitor can get a
  half-updated site), needs its own backup and restore code, and is not
  needed: after the first go-live the symlink layout exists, so atomic
  switching costs no Caddy change at all. A Caddy change for atomic
  switching is therefore not proposed.
- **Guard against a Caddy change slipping through:** before uploading,
  publish reads the live Caddyfile (read-only, like stage.sh) and runs the
  generator against it; if the block would change (headers, redirects,
  caching), it stops and points to `./ship.sh`, the only path that changes
  Caddy.
- **Change overview without stored state:** the server script hashes the
  live release (read-only, piped over SSH with `bash -s`, nothing is
  written), and the same script hashes the new build. HTML is hashed with
  the hashed asset names blanked, so a stylesheet change does not mark
  every page as changed. The release id ends in the commit hash, which lets
  publish warn when /now changed without a new `updated`.
- **History and rollback:** `releases/HISTORY` lists published ids; a
  release put live by ship.sh in between counts as the newest. Rollback
  pops the newest and switches to the one before, checked over HTTP
  (switched forward again if that check fails). The newest `keep` (default
  5, `publish.keep` in `deploy/site-config.json` or `--keep`) stay.
- **Deleting** goes through one function: a name in release-id format,
  below a web root that passed the check (absolute, no `.`/`..`, at least
  two components, at least 8 characters, a real `releases/` and a `current`
  symlink to a release), never the live release. `legacy-*` (the old site)
  is never deleted automatically.
- **Target** never in the repository (it is public): `--target` or
  `PUBLISH_SSH_TARGET`, validated as a plain SSH alias; `publish.branches`
  (`main`) in site-config.json.
- Tested without a server (`check:publish`, 49 cases against a local web
  root served by `tools/serve.mjs`). Not testable here: SSH, sudo, the
  comparison with the live Caddyfile.

## R5-D5. Local editor: Keystatic measured, fallback built
Keystatic itself is in good shape: `@keystatic/astro` 6.0.0 and
`@keystatic/core` 0.6.9 (both published August 2026), MIT, peer range
`astro 5 || 6 || 7`. Measured in a scratch install (`.tmp/`, 2026-10-30):
359 packages and 273 MB on their own; **112 packages (70 MB) that this
repository does not have yet**, among them React 19, react-aria,
react-stately and the Keystar UI. It would also need `@astrojs/react` and
server routes, enabled only by `npm run admin`.

It does not fit this content, by its own documentation: the MDX field says
"HTML tags in MDX are not supported by Keystatic" (two launch posts contain
an inline SVG figure), and neither the Markdoc nor the MDX field documents
maths (`$…$` via remark-math, in every launch post) or footnotes (the
double-spend post). A save would fail or rewrite those parts, the opposite
of "no reformatting". A round trip through Keystatic was therefore not run;
the documented format already rules it out.

**Fallback, as the brief prescribes:** `npm run new:post`, `new:project`
(create a draft, open nothing) and `npm run edit:now` /
`npm run edit -- <page | post <slug> | project <slug>>` (open
`$VISUAL`/`$EDITOR` on the right file). After saving, a changed page or
project gets today's `updated` (the "editor sets `updated`" rule for /now),
and the frontmatter is validated. No web editor, no `npm run admin`.
- **Schema parity from one source:** the zod schemas moved to
  `src/lib/content-schemas.ts`; Astro uses them in content.config.ts, and
  `tools/content-validate.mjs` validates what the tools write with the very
  same objects (`check:new-content`, which also opens and closes every real
  content file, the four launch posts included, and requires zero diff).
- (deviation) `new:post` "opens nothing" (2.4) and the fallback "opens
  `$EDITOR`" (2.5) are separate commands, so both statements hold.
- **Images in posts** (independent of the editor): next to the post
  (`src/content/blog/<lang>/<slug>/figure.png`, written
  `![alt](./<slug>/figure.png)`), optimised by Astro at build time (hashed
  WebP under `/_astro/`, width and height, lazy, no style attribute).
  `src/lib/remark-image-policy.ts` fails the build for a missing alt text,
  an external, `data:` or site-absolute image, and raw `<img>`/`<picture>`.
  `check:images` runs the rule as unit tests, makes a real build fail with a
  probe post, and checks the optimised fixture image and every served
  `<img>`. No new dependency (sharp comes with Astro).

## R5-D6. Posts in one or both languages
The behaviour exists since revision 1 (D17); revision 5 tests it in both
directions (`check:blog-i18n`). A pair is two files with the same slug or a
shared `translationKey`.
- **Single-language post: the language switch stays visible** and leads to
  the other language's blog index, marked "translation missing" (hidden
  would make the header jump between posts and hide where the other
  language lives). No hreflang alternates, no sitemap alternates, no JSON-LD
  `workTranslation`; each language's feed lists only its own posts.
- Listings in the other language show a single-language post once, with an
  "only in German/English" badge (D17); llms.txt and the search index list
  it under its own language. The server's language door is unchanged.
- Today: two pairs (ECC, double spend) and two German-only posts (CSP,
  Subset Sum).

## R5-D7. GitHub metadata at build time
Optional `repo: owner/name` on a project (`src/lib/github-meta.ts`). With
`GITHUB_META=1`, which only `deploy/build-release.sh --github-meta` sets
(and `npm run publish` passes it), the release build asks the public REST
API without a token (`/repos/{repo}`, `/repos/{repo}/languages`). Cache:
`.cache/github-meta.json`, 24 h (`GITHUB_META_TTL_HOURS`). Error, rate
limit or no network: the last cached value, else the field is left out.
404 or private: ignored and remembered. Nothing in it can fail a build;
visitors never cause a request (`connect-src 'self'` unchanged).
- **Where it shows, by the layout's existing fields:** `stack` chips get the
  repository's languages (by size, at most four) when the frontmatter
  `stack` is empty; "Source code" links to `https://github.com/<repo>` when
  `links.repo` is empty. **Hand-written values always win.** Resolved once
  in `allProjects()`, so cards, project pages, /links and JSON-LD agree.
- **Not shown: last push and stars.** The layout has no field for them, and
  `updated` ("Last updated") stays the hand-maintained date: it drives the
  sort order and the sitemap, and a push is not the same as an update of
  the project page. Both are cached, so a later design pass can show them.
- Off by default, so `npm run check`, CI and every other build stay
  deterministic and offline. Release builds refuse the two test switches
  (`GITHUB_API_BASE` to a local mock, `GITHUB_META_CACHE`).
- No project has `repo:` yet (the existing ones keep their hand-written
  stack and links); `new:project` writes the field as a comment.
  `check:github-meta`: 31 cases with mocked answers and two real builds.
