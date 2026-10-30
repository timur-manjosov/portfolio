# Progress

Resume point for interrupted runs, updated after every finished step.
Current state first; the revisions below are the history.

## Stand und nächste Schritte (2026-10-30)

**Done:** first run plus revisions 2–5. Everything is committed on
`redesign`; `redesign-clean` holds the same tree as one commit on
`origin/main` with the noreply address (`check:prepush` GO). Nothing is
pushed or deployed, `redesign` is not rewritten. `npm run check`, both
browser suites and Lighthouse are green (`docs/VERIFICATION.md`,
Revision 5). Summary: `docs/FINAL-REPORT.md`, Revision 5.

**Next steps (Timur), in the order of `docs/GO-LIVE.md`:**
1. Fill in `private/site.private.yaml`; read the `draft-review` texts
   (`CONTENT-TODO.md`: About and the four launch posts first).
2. `npm run check` and `npm run check:browser:system`.
3. Push `redesign-clean` as `redesign` (`prompts/push-clean.sh` with
   `PUSH_AFTER_RUN=1`, or GO-LIVE step 3), pull request, CI, merge. No tags.
4.–10. Release, stage, read the diff, dry run, go live, check, rollback
   if needed.
11. Later updates: `npm run publish` (`docs/PUBLISHING.md`); first run the
    read-only commands of §9 there.

**For the next agent run:** nothing open. Anything on the server needs an
SSH target and Timur's go-ahead. The dark palette may only change with a
deliberate `node tools/check-dark-tokens.mjs --update`.

---

# History

## Revision 5 (brief `prompts/portfolio-umbau-5.md`, 2026-10-29/30)

Publishing without code: four launch posts, scheduled posts, `publish`,
local editing, GitHub metadata, languages per post, clean branch. Order
(brief §0): 2.1, 2.2, 2.3, 2.4, 2.7, 2.5, 2.6, 2.8, 2.9 last.

- [x] R5.0 Briefs + docs read; build takes ~2 s, so test builds are cheap
- [x] R5.1 Example posts moved to `tests/fixtures/blog/` (loaded only with `--fixtures`, `build:drafts` uses it); `check:fixtures` scans dist, the public and the release build of `check:build-modes`; release refuses `--fixtures`, `--build-date` and both env variables
- [x] R5.2 Four launch posts: EC group law (math-crypto, DE+EN), double-spend race (blockchain, DE+EN), CSP for static sites (tech, DE), Subset Sum (theory, DE); every number from `tests/articles/*` (`npm run check:articles:system`), sources checked (Crossref/arXiv/W3C), quality pass in VERIFICATION R5
- [x] R5.3 Scheduled posts: `src/lib/schedule.ts`, filter in `src/lib/content.ts`, badge, `check:scheduled` (16 unit tests, 5 builds); launch dates 2026-10-30, 2026-10-30, 2026-11-06, 2026-11-13 (run day, +7, +14; session 2 started 2026-10-30, so the dates of session 1 moved forward by one day rather than lying in the past)
- [x] R5.4 `new:post`, `new:project` (Berlin date, collision check in both languages), `publish` (+ `--dry-run`, `--rollback`, `--keep`, `--no-sudo`), `deploy/publish-on-server.sh` (symlink switch, HTTP check, automatic switch back, deletion guard), `check:publish` (49 cases, local web root), ShellCheck clean (DECISIONS R5-D4)
- [x] R5.7 Languages per post: behaviour existed (R1), tested by `check:blog-i18n` (pair both ways, single DE and EN; R5-D6)
- [x] R5.5 Local editor: Keystatic measured and rejected (R5-D5), fallback `edit`/`edit:now`, shared schemas `src/lib/content-schemas.ts`, `check:new-content` (61 cases incl. round trip); images next to the post, alt required, `check:images` (25 cases)
- [x] R5.6 GitHub metadata at build time: `src/lib/github-meta.ts`, off by default, `--github-meta` in build-release (publish), cache + fallback, manual wins, `check:github-meta` (31 cases, R5-D7)
- [x] R5.8 `docs/PUBLISHING.md` (German), README, CLAUDE.md, GO-LIVE (step 3 base + step 11), DEPLOY §7, CONTENT-TODO, VERIFICATION R5, FINAL-REPORT R5
- [x] R5.9 `check:prepush` fail-closed + exit codes tested (`check:prepush-exit`); `redesign-clean` = one noreply commit on `origin/main`, same tree, GO; optional release skipped (no `private/site.private.yaml`)

## Revision 4 (brief `prompts/portfolio-umbau-4.md`, 2026-10-28)

Light mode after Material 3, one box construction, more hover motion,
About text, polish, pre-push check. Order (brief §0): 2.4 About, 2.1 light
mode, 2.2 boxes, 2.3 motion, 2.6 pre-push, 2.5 polish, 2.7 verification.

- [x] R4.0 Briefs + docs read; screenshot tool covers every page type; before shots `.screenshots/r4/vorher/`, `vorher-prod/` (`3c65628`)
- [x] R4.1 About DE + EN rewritten from public sources (no `private/about-notes.md`), `about-extra` by convention, tests (`114e0a4`)
- [x] R4.2 Light mode: Material-3 palette, dark-token snapshot + check, contrast tool extended (`d30a7af`)
- [x] R4.3 Boxes: outlined / filled / elevated, radius and elevation scales, action arrow, fact bar, link rows, empty blog state (`757f76a`)
- [x] R4.4 Motion: state layers, lift 4 px, arrow nudge, hover only under `(hover: hover)`, reveal 12 px / 80 ms, theme icon, focus ring; touch test (`757f76a`)
- [x] R4.5 `npm run check:prepush` + GO-LIVE step 3, rehearsed in a clone: NO-GO → GO, trees identical (`dcfaa0c`, `56c70c7`)
- [x] R4.6 Polish: OG image + favicons, meta texts, 404, dead styles, deps, CI pinned (`6b2ff6b`, `67c10d8`, `bc24188`)
- [x] R4.7 Verification: 6 screenshot passes, both browser suites, gate, Lighthouse 100 ×4, release rehearsal, docs (DECISIONS R4, VERIFICATION R4, FINAL-REPORT R4)

Session 1 did R4.0–R4.2 and started the box/motion CSS without templates
or a commit; session 2 finished R4.3–R4.7 from that working tree.

## Revision 3 (brief `prompts/portfolio-umbau-3.md`, 2026-10-28)

Pure design pass: lighter and finer, light mode retuned, subtle motion.

- [x] R3.0 Briefs + docs; screenshot tool `--widths`/`--pages`, scroll-through (`c704f13`)
- [x] R3.1 Tokens: light palette retuned, weights/sizes/radii/shadows, motion tokens; dark palette unchanged (`d3b3ec4`)
- [x] R3.2 Contrast tool: threshold by use (`d3b3ec4`)
- [x] R3.3 Home section by section + shared components (`d3b3ec4`, `9829f45`)
- [x] R3.4 Motion: states, nav indicator, theme crossfade, reveal, reduced motion (`d3b3ec4`)
- [x] R3.5 Browser tests: hover/focus, reduced motion, no JS, CLS 0 (`8fb8840`)
- [x] R3.6 Screenshot passes P1–P6 (`8980070`, `38f2de5`)
- [x] R3.7 Gates, budgets, Lighthouse 100 ×3; no-IO and large-text guards (`c4e818f`, `2cd2789`)
- [x] R3.8 Docs: DECISIONS R3, VERIFICATION, FINAL-REPORT (`4dbd1ae`)

## Revision 2 (brief `prompts/portfolio-umbau-2.md`, 2026-10-27/28)

Content and tone, private data, language logic, design, verification,
go-live prep.

- [x] R2.1 Content: Octo removed (+301), facts verified, `npm outdated`
- [x] R2.2 Tone: texts rewritten, hero variants (DECISIONS R2-D1)
- [x] R2.3 Private layer, build modes, leak check, pre-commit hook (`3c4ebd5`)
- [x] R2.4 Repo hygiene; history findings in BLOCKERS R2-B1 (`0dca219`)
- [x] R2.5 Language logic: 302 on `/` by Accept-Language, fallback script, tests (`0b52f10`)
- [x] R2.6 Design relaunch, contrast incl. gradients, 6 screenshot passes (`76a9a00`)
- [x] R2.7 Browser verification, CSP, Lighthouse, forced colours
- [x] R2.8 Go-live prep: Caddy generator against the real file (read-only), privacy policy, `--dry-run`, test release, GO-LIVE.md
- [x] R2.9 Docs

## First run (2026-10-26/27)

- [x] Phase 0: tag `pre-redesign` on `ea40ee1`, branch `redesign`
- [x] Phase 1: `docs/AUDIT.md`
- [x] Phase 2: `docs/GAP.md`
- [x] Phase 3: `docs/adr/0001-stack.md` → Astro 7 static
- [x] Phase 4: site, content, blog, i18n, feeds, search, JSON-LD, llms.txt, security.txt
- [x] Phase 5: `npm run check` green; `docs/VERIFICATION.md`
- [x] Phase 6 (local part): Caddy generator, build/stage/apply scripts, `docs/DEPLOY.md`; server staging skipped (BLOCKERS B1)
- [x] Phase 7: README, CLAUDE.md, CONTENT-TODO.md, DECISIONS.md, BLOCKERS.md, FINAL-REPORT.md
