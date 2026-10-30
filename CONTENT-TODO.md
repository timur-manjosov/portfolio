# Content TODO: decisions and texts for Timur

Everything the redesign could not decide or write without you, ordered by
priority (state: revision 5, 2026-10-30). `npm run report:i18n` lists every
file that still has `status: draft-review`. Set it to `ready` once you have
read and approved a text. A release build warns about the remaining count
but does not stop.

## 1. Before going live

- [ ] **TODO(Timur): fill in `private/site.private.yaml`.**
      `cp site.private.example.yaml private/site.private.yaml`, then
      replace every value (the file explains each field). Required for a
      release: `contact.email` and `legal.controller` (name + e-mail for the
      privacy policy). Optional: `contact.pgp`, further `accounts`,
      `legal.imprint` (the imprint page exists only if name, address and
      e-mail are complete). Extra About text goes into
      `private/content/<lang>/about-extra.md` (no YAML entry). Never commit it; `npm run
      check:private` will complain if a value shows up in a tracked file.
- [ ] **Imprint: needed or not?** Without `legal.imprint` there is no
      imprint page and no footer link. Whether a personal site without
      commercial intent needs one is a legal question I cannot answer for
      you (§5 DDG; not legal advice).
- [ ] **Read the privacy policy** (`src/content/pages/{de,en}/privacy.md`).
      It contains no placeholders. Everything in it comes from the live
      Caddy configuration as read on 2026-10-27 and unchanged on
      2026-10-28 (no access log for this
      site, Caddy errors to the systemd journal) and from the brief (hoster
      Netcup). **Re-check it after every Caddyfile change**, e.g. if you
      add a `log` directive to the site block.
- [ ] **Read the drafted texts** (`status: draft-review`): About, Now,
      Uses, Contact (DE+EN) and the project pages Aura, Epiphyte, Saeculum
      (DE+EN). They are written from your public repositories as of
      2026-10-27, the old site and the brief. Each file ends with a
      Markdown comment naming its sources (stripped from the HTML).
      Open points:
  - Aura: the README still describes "Phase 0", the commits are much
    further. The page says exactly that. Update the README or tell me what
    the real state is.
  - Aura's web interface (aura subdomain) sends `x-robots-tag: noindex`.
    The project page links it anyway, because it is publicly reachable.
    Remove the link if it is not meant for visitors yet.
  - Saeculum is shown as **paused** (no commit since 10 August 2026).
    Change `stage` if that is wrong.
  - **About (rewritten 2026-10-28, revision 4).** There was no
    `private/about-notes.md`, so the text comes only from your briefs, the
    old site, your repositories and your GitHub profile README. Please
    check:
    - Weighting of languages: your first brief says "strong Java base",
      the profile README says Python is your main language and Rust and C
      are "learning". The page now lists Python first (most public
      projects), Java as the most solid foundation, Rust and C as
      learning, Kotlin and Go as "know them, rarely use". C is new on the
      site (from the profile). Same order in the facts block and the hero.
    - "Heading towards quantitative work (risk, models, data)" and "Arch
      Linux on a ThinkPad" come from the profile README. Remove them if
      that is no longer true or not meant for this site.
    - Your GitHub profile README also contains topics from the blocklist
      (religion and finances). They are **not** used anywhere on the site.
    - Want more personal detail (city, photo, CV, hobbies)? Write notes to
      `private/about-notes.md` (git-ignored) for the next pass, or put the
      finished text into `private/content/<lang>/about-extra.md`: the
      private layer appends it to About when that file exists.
  - Now: the date is shown on the page. Keep it current.

## 2. Hero line (R2-D1)

Chosen: variant 1. Alternatives, change `site.tagline` in
`src/i18n/ui.ts` if you prefer one:

| # | Deutsch | English |
|---|---|---|
| 2 | Mathestudent mit Schwerpunkt Kryptografie. Ich baue Discord-Bots, Simulationen und kleine Werkzeuge, meistens um etwas zu verstehen. | Maths student, cryptography focus. I build Discord bots, simulations and small tools, mostly to find out how something works. |
| 3 | Kryptografie im Studium, Rust nebenher. Was dabei entsteht, steht hier. | Cryptography at university, Rust on the side. Whatever comes out of it ends up here. |

## 3. Contact and accounts

- [ ] **Further accounts:** only GitHub (`timur-manjosov`) is publicly
      verifiable. Add others (Mastodon, LinkedIn, Codeberg, a Discord
      server for the bots, …) under `accounts` in the private file. Each
      appears on /links, /contact and About, and with `me: true` as
      `rel="me"` and in JSON-LD `sameAs`.
- [ ] **PGP key** (optional): `contact.pgp` in the private file; WKD
      setup in `docs/DEPLOY.md` §10.
- [ ] GitHub: the `portfolio` repository description still says "Vanilla
      HTML/CSS/JS, no build step". Update it after the merge (outward-facing,
      not changed by me).
- [ ] **Before the push:** your private author e-mail is in every local
      commit and older commits contain server details (`docs/BLOCKERS.md`
      R2-B1). Push only the squashed branch of `docs/GO-LIVE.md` step 3
      (noreply address, `npm run check:prepush` must say GO).

## 4. Projects found on GitHub (drafts, not published)

Each is `draft: true`: visible in `npm run dev` / `npm run build:drafts`,
never in production. Publish by setting `draft: false` (and reading the
text), or delete the file.

- [ ] `gauss-trainer` (DE+EN, Rust + Ratatui, terminal trainer for Gaussian
      elimination with exact fractions). Probably worth publishing.
- [ ] `vector-calculator`, `contact-manager`, `number-guessing-game` (EN
      only, Python, June 2026, marked `archived`). My suggestion: leave them
      out.

## 5. Blog

### Von Timur zu lesen und freizugeben (launch posts, revision 5)

Written under your name, `status: draft-review`. Every number comes from a
script under `tests/articles/` (`npm run check:articles:system` reruns all
of them; the asserts fail if a quoted number changes). Set `status: ready`
after reading. A date after the build day keeps a post out of production
until a build on or after that day (`docs/PUBLISHING.md`).

- [ ] **Das Gruppengesetz auf elliptischen Kurven, nachgerechnet** /
      *The group law on elliptic curves, worked through* (`math-crypto`,
      DE + EN, 2026-10-30). Check the step-by-step arithmetic on the
      19-point curve and the associativity argument.
- [ ] **Die Doppelausgabe-Rechnung im Bitcoin-Whitepaper, nachgerechnet** /
      *The double-spend calculation in the Bitcoin white paper, recomputed*
      (`blockchain`, DE + EN, 2026-10-30). Check the claim that the white
      paper understates the risk and the footnote on Grunspan/Pérez-Marco.
- [ ] **Content-Security-Policy für statische Seiten** (`tech`, DE only,
      2026-11-06, scheduled). Check that its general advice matches how you
      want to present your own site; it contains no details of your server.
- [ ] **Subset Sum: NP-vollständig und trotzdem oft leicht** (`theory`, DE
      only, 2026-11-13, scheduled). Check the phase-transition section
      (Mertens' formula, the 200-instance table).

### Other

- [ ] Categories (`src/content/categories.yaml`): rename or add freely.
- [ ] Next post: `npm run new:post -- --title "…" --lang de --category tech`
      (`docs/PUBLISHING.md`).

## 6. Decisions with a conservative default

- [ ] **Default language** for `/` without a German first
      `Accept-Language` entry, and for language-less paths (`/now`,
      `/about`, …): English (R2-D2, D3). One place to change:
      `deploy/site-config.json` (`languageDoor`, redirect targets).
- [ ] **Analytics:** none. Server-side log analysis would need an access
      log and a privacy-policy update.
- [ ] **AI crawlers:** allowed (D13). Change `src/pages/robots.txt.ts`
      to opt out.
- [ ] **More personal details** (city, photo, CV, spoken languages): only
      if you name them (notes in `private/about-notes.md`, finished text in
      `private/content/<lang>/about-extra.md`).
- [ ] **OG image:** new since revision 4 (light palette, name, English
      tagline, domain; `tools/brand-assets.mjs`). Check that you like it;
      it uses the hero line, so re-run the tool if you change `site.tagline`.

## 7. After going live

- [ ] Remove the old Eleventy build slots, bootstrap snapshot, old
      `deploy.sh` and git checkout from the web root once you no longer
      need to roll back to it (`docs/DEPLOY.md` §7).
- [ ] Close the open GitHub issues that concern the old canvas/hover code.
