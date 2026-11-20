# Design references (revision 6)

Fifteen references, visited on **2026-11-14**. Each was looked at as a
rendered page (viewport screenshots at 1280 and 390 px, kept in the
git-ignored `.tmp/refs/`, never committed) and as a construction: the
computed size, line height and width of the running text, the headings and
the code blocks, measured with a one-page Playwright script against the
system Chromium (`.tmp/refshot/ref-shot.mjs`, one page per call, no
crawling). "cpl" is characters per line of the first long paragraph.

Only principles, proportions and patterns are taken. No code, text, image,
icon, logo or palette was copied; no layout is rebuilt.

| # | Reference | Kind |
|---|---|---|
| 1 | overreacted.io (post "A Chain Reaction") | personal blog, long reads |
| 2 | jvns.ca (a 2024 post) | personal technical blog |
| 3 | edwardtufte.github.io/tufte-css | typography for long reads |
| 4 | practicaltypography.com (line length; key rules) | typography source |
| 5 | joshwcomeau.com (a CSS tutorial) | technical blog, teaching |
| 6 | ciechanow.ski (post "GPS") | explanatory essays |
| 7 | lea.verou.me (home) | personal developer site |
| 8 | gwern.net (About) | long-form research site |
| 9 | maggieappleton.com (home) | personal site, "garden" |
| 10 | rauno.me (home) | personal designer site |
| 11 | web.dev/learn/css/typography | teaching / documentation |
| 12 | developer.mozilla.org (a CSS reference page) | documentation |
| 13 | every-layout.dev (Stack) | layout method |
| 14 | utopia.fyi (fluid type scales) | type and space method |
| 15 | Material 3 / material-web typography docs | the site's design base |

## 1. overreacted.io

- **Seen:** serif body (Merriweather) 16 px with 28 px line height (1.75),
  632 px text column, 79 cpl; sans-serif display headings (40/44 px, 900);
  date directly under the title, nothing else; code block slightly wider
  than the text column (664 px), dark, rounded.
- **Take:** a serif for long running text with a sans for headings and UI;
  code allowed to be a little wider than the prose.
- **Not:** 79 cpl is above the 60–75 we aim for; 900-weight headings
  contradict the "≤ 600" rule (R3).

## 2. jvns.ca

- **Seen:** PT Serif body 16 px, 570 px column but 86 cpl, very tight
  20 px line height; headings in a different sans; small code (13 px).
- **Take:** nothing new for typography; the post's own **"why"-first
  opening** and plain structure confirm that a calm page needs no chrome.
- **Not:** the tight leading and long lines (both hard on long reads).

## 3. Tufte CSS

- **Seen:** 21 px serif, 30 px leading (1.43), 616 px column, **65 cpl**;
  headings in the body face, regular weight, size alone carries rank
  (48 / 33 / 25.5 px); paragraph spacing equals one line; a wide right
  margin for side notes; off-white page.
- **Take:** the **measure of ~65 characters** as the target; paragraph
  space of about one line; headings that step down by a fixed ratio.
- **Not:** side notes (our footnotes stay at the end: simpler, no JS, work
  on phones); the italic subtitle style.

## 4. practicaltypography.com

- **Seen:** 21.8 px body, 31.7 px leading (1.45), 652 px column, **64 cpl**.
  Key rules (summary page): web body 15–25 px, line spacing 120–145 %,
  line length 45–90 characters, either a first-line indent or 4–10 pt of
  paragraph space (never both), letterspace all caps 5–12 %, kerning on.
- **Take:** body **19–21 px** for a serif with a small x-height, leading
  **≈ 1.55** (screen, slightly above the print range because our lines are
  long and the serif is light), paragraph space only (no indent), small
  caps/caps labels get extra tracking.
- **Not:** the dense right-hand margin navigation.

## 5. joshwcomeau.com

- **Seen:** 18 px body, 27 px leading (1.5), 686 px column, 75 cpl; a
  **sticky table of contents** in a right-hand column on wide screens, the
  current section highlighted; title, subtitle and a one-line meta sentence
  ("Filed under … on …, last updated on …") with dates in a stronger tone;
  h3 24 px with 36 px above and 12 px below.
- **Take:** the **sticky TOC beside the text** on wide screens; the meta
  line that names published and updated dates in a sentence with the dates
  emphasised; space above a heading ≈ 3× the space below.
- **Not:** the illustrated hero, the playful hand-drawn details and the
  scroll-tracking TOC highlight (needs JS).

## 6. ciechanow.ski

- **Seen:** IBM Plex Sans 19.2 px, 30.7 px leading (1.6), 800 px column
  but only **59 cpl** because the size is large; date above the title in a
  muted tone; one strong colour band for the header.
- **Take:** a large body size makes a wider column comfortable; the date
  as a quiet line above or below the title, not a badge.
- **Not:** the full-bleed colour header (too loud next to our calm
  surfaces), the interactive figures (JS).

## 7. lea.verou.me

- **Seen:** a large first-person intro (27 px Inter) with two buttons, then
  the blog as a **numbered list with dates in a second, muted face**; a
  serif for the list and the intro of the blog section.
- **Take:** posts as a **scannable list** (title, then date in tabular
  figures) rather than cards; one primary and one secondary action, not
  three.
- **Not:** the very large intro paragraph, the warm decorative background.

## 8. gwern.net

- **Seen:** Source Serif body 19 px, 30 px leading (1.58), but 895 px column
  (95 cpl); a **boxed, numbered TOC** at the top left of long pages;
  metadata (dates, status, tags) centred under the title; a strong rule
  under section headings.
- **Take:** dates of publication **and** last change visible at the top
  ("stable long-term essays which improve over time"), a numbered TOC for
  long texts, section numbers in a muted tone.
- **Not:** small caps titles, justified text, the density of meta icons,
  the 95-character line.

## 9. maggieappleton.com

- **Seen:** one statement sentence as the hero (82 px serif, the name in
  bold), a muted second line ("Designer, anthropologist, …"), then the
  sections of the site as headed groups with "→" links; generous air.
- **Take:** the **home page hero says who and what in one sentence**, the
  sections below are named destinations with arrow links. Confirms our
  plan to make the site's sections the visual element.
- **Not:** the oversized display face, the botanical brand mark.

## 10. rauno.me

- **Seen:** an experimental, interaction-led home page (a large animated
  shape, a horizontal strip of panels), almost no running text.
- **Take:** one idea only, by contrast: a single **graphic element with a
  clear idea** is enough; everything else stays quiet.
- **Not:** everything else (motion, horizontal scrolling, a hidden
  navigation): the opposite of our "calm, content-driven" rule.

## 11. web.dev Learn (CSS: typography)

- **Seen:** 16 px body with 28 px leading (1.75) but 1107 px wide (85 cpl);
  h2 24/28 px, h3 20/32 px, 32 px space above both; code 14/20 px.
- **Take:** the teaching recommendation itself: `ch`-based max-widths,
  `text-wrap: balance` for headings and `pretty` for paragraphs, logical
  properties.
- **Not:** the long line of the page as rendered.

## 12. MDN Web Docs (a CSS property page)

- **Seen:** Inter 16/24 px, 655 px column, **69 cpl**; a right-hand "In
  this article" TOC with a vertical rule and the current item marked; a
  Baseline badge (support status) at the top; code 16/28 px JetBrains
  Mono.
- **Take:** the **TOC as a quiet vertical list with a rule on its left**
  (no box); Baseline status as the rule for any new CSS feature we use.
- **Not:** the three-column chrome and the ad slot.

## 13. every-layout.dev (Stack)

- **Seen:** a modular scale (body 20.3 px, ratio ~1.5), paragraph space
  54 px under headings; the "stack" principle: vertical space is set on the
  parent through `* + *` (owl selector) and can be overridden per element.
- **Take:** keep our owl-based prose rhythm (`.prose > * + *`), but give
  headings their own, larger space above and a small space below, and let
  lists, tables and code take one step more.
- **Not:** the condensed display face.

## 14. utopia.fyi

- **Seen:** a fluid type scale is two modular scales, one for a small and
  one for a large viewport (example: base 18 px with ratio 1.2 at 360 px,
  base 20 px with ratio 1.25 at 1240 px), interpolated with `clamp()`; a
  space scale derived from the same base (multipliers 0.25 … 6).
- **Take:** the **fluid scale from two endpoints**: our prose base goes
  from 18 to 20 px between 360 and 1240 px, headings scale with a steeper
  ratio at the large end; section spacing is fluid too.
- **Not:** the full generated token set (we only need a few steps).

## 15. Material 3 (material-web typography docs)

- **Seen:** type is organised by **role** (display, headline, title,
  body, label), each role with its own size, line height, weight and
  tracking token (e.g. body-large 16/24 px, 400, 0.5 px tracking).
- **Take:** our tokens keep the role idea (display for the name, headline
  for h1/h2, title for card titles, body, label for meta and chips) on top
  of the Revision 4 colour roles, so light mode stays recognisably
  "Material".
- **Not:** Google Sans/Roboto (we keep Inter) and the default 16 px body for
  long reads.

## What had the most effect

1. **Tufte CSS + practicaltypography.com**: the measure (≈ 65 characters)
   and the leading. Our running text was 84–90 characters wide (finding
   B1).
2. **overreacted.io + gwern.net**: serif for long text, sans for UI. We
   pair STIX Two Text with the STIX Two Math formulas already on the site
   (finding B2), Inter stays for everything else.
3. **joshwcomeau.com + MDN**: the sticky TOC in its own column on wide
   screens, a quiet vertical list without a box (finding B10).
4. **maggieappleton.com + lea.verou.me**: one sentence that says who and
   what, one primary action, the site's sections as named destinations, and
   posts as a scannable list (findings B5, B6, B9).
