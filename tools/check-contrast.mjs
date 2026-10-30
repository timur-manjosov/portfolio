// WCAG 2.2 contrast of every colour pair the stylesheet actually uses, in
// both themes, computed from src/styles/tokens.css (the only place colours
// are defined; global.css references tokens only, which this script also
// verifies). Also guards against drift between the two copies of the dark
// palette (OS-preference media query vs. explicit [data-theme="dark"]).
//
// Revision 2 additions:
//   - gradient text (hero): sampled at 101 points between every pair of
//     neighbouring stops, in sRGB like browsers interpolate legacy hex
//     colours, against every background it can sit on, including the mesh
//     tints and every mix of tint and page background. The worst sample
//     counts.
//   - the translucent sticky header: its text against the header colour
//     composited over the darkest/lightest content that can scroll below it.
//
// Revision 3: the threshold depends on the use, not on the colour.
//   TEXT  4.5:1  normal text (1.4.3): body, links, labels, chips, meta.
//   LARGE 3:1    large text (1.4.3): at least 24 px (18.66 px bold would also
//                count, but no heading is bold any more: max weight 600).
//                Only for uses whose font size is *guaranteed* ≥ 24 px by a
//                size token; the token is named next to the pair and its
//                lower bound is read from tokens.css and verified here
//                (clamp(min, …) → min ≥ 1.5rem). Today: the hero name only.
//   UI    3:1    UI component boundaries and focus indicators (1.4.11).
import { readdirSync } from "node:fs";
import { read, reporter } from "./lib.mjs";

const r = reporter("WCAG contrast");
const css = read("src/styles/tokens.css");
const global = read("src/styles/global.css");

// The gradient stops are checked at 3:1 because the gradient only sits on
// the hero name. If `gradient-text` ever lands on other (smaller) text,
// that assumption breaks: fail instead of passing silently.
for (const file of readdirSync("src", { recursive: true })) {
  if (!String(file).endsWith(".astro")) continue;
  for (const m of read(`src/${file}`).matchAll(/class="([^"]*\bgradient-text\b[^"]*)"/g))
    if (!/\bhero__title\b/.test(m[1]))
      r.fail(
        `src/${file}`,
        `gradient-text outside .hero__title ("${m[1]}"): its stops are only checked as large text`,
      );
}

function block(selectorRegex) {
  const m = css.match(selectorRegex);
  if (!m) throw new Error(`block not found: ${selectorRegex}`);
  return Object.fromEntries(
    [...m[1].matchAll(/--(color-[\w-]+|code-[\w-]+):\s*(#[0-9a-f]{6}(?:[0-9a-f]{2})?)\b/gi)].map((x) => [
      x[1],
      x[2].toLowerCase(),
    ]),
  );
}

const light = block(/^:root \{([\s\S]*?)\n\}/m);
const darkMedia = block(/:root:not\(\[data-theme="light"\]\) \{([\s\S]*?)\n {2}\}/);
const dark = block(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/);

if (JSON.stringify(darkMedia) !== JSON.stringify(dark)) {
  r.fail("tokens.css", "dark palette in the prefers-color-scheme block differs from [data-theme=dark]");
}
if (JSON.stringify(Object.keys(light).sort()) !== JSON.stringify(Object.keys(dark).sort())) {
  r.fail("tokens.css", "light and dark palettes define different colour tokens");
}
if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\(/i.test(global.replace(/\/\*[\s\S]*?\*\//g, ""))) {
  r.fail("global.css", "contains literal colours; use tokens so this check covers them");
}

const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const alpha = (hex) => (hex.length === 9 ? Number.parseInt(hex.slice(7, 9), 16) / 255 : 1);
const toHex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
/** Linear interpolation in gamma-encoded sRGB (CSS default for legacy colours). */
const mix = (a, b, t) => toHex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
/** `top` (possibly translucent) composited over opaque `under`. */
const over = (top, under) => mix(under.slice(0, 7), top.slice(0, 7), alpha(top));

function luminance(hex) {
  const [rr, gg, bb] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}
function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5;
const LARGE = 3;
const UI = 3;

// Size tokens that may carry LARGE text: their smallest value must be ≥ 24 px.
const rootBlock = css.match(/^:root \{([\s\S]*?)\n\}/m)[1];
function minRem(token) {
  const value = rootBlock.match(new RegExp(`--${token}:\\s*([^;]+);`))?.[1]?.trim();
  if (!value) return Number.NaN;
  const first = value.startsWith("clamp(") ? value.slice(6).split(",")[0] : value;
  const m = first.trim().match(/^([\d.]+)rem$/);
  return m ? Number(m[1]) : Number.NaN;
}
const largeSizes = new Map();
/** LARGE threshold for text set in `selector` with size token `token`; both
 *  the token's lower bound and its use in that rule of global.css are verified. */
function largeTextToken(token, selector) {
  if (!largeSizes.has(token)) {
    const rem = minRem(token);
    largeSizes.set(token, rem);
    if (!(rem >= 1.5))
      r.fail("tokens.css", `--${token} may drop below 24 px (min ${rem}rem); its text needs 4.5:1, not 3:1`);
  }
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = global.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
  if (!rule.includes(`font-size: var(--${token})`))
    r.fail("global.css", `${selector} is checked as large text but does not use font-size: var(--${token})`);
  return LARGE;
}
const pairs = [
  ["color-text", "color-bg", TEXT, "body text"],
  ["color-text", "color-surface", TEXT, "text on surfaces (footer, filters)"],
  ["color-text", "color-raised", TEXT, "text on cards"],
  ["color-muted", "color-bg", TEXT, "secondary text (dates, meta)"],
  ["color-muted", "color-surface", TEXT, "secondary text on surfaces"],
  ["color-muted", "color-raised", TEXT, "secondary text on cards"],
  ["color-muted", "color-code-bg", TEXT, "code punctuation"],
  ["color-accent", "color-bg", TEXT, "links"],
  ["color-accent", "color-surface", TEXT, "links on surfaces"],
  ["color-accent", "color-raised", TEXT, "links on cards"],
  ["color-accent", "color-tonal", TEXT, "links on a tonal block (unused since R3, kept as a guard)"],
  ["color-accent-hover", "color-bg", TEXT, "hovered links"],
  ["color-accent-hover", "color-raised", TEXT, "hovered links on cards"],
  ["color-on-accent", "color-accent", TEXT, "primary button label"],
  ["color-on-accent", "color-accent-hover", TEXT, "primary button label, hovered"],
  ["color-text", "color-tonal", TEXT, "text on a tonal block (unused since R3, kept as a guard)"],
  ["color-muted", "color-tonal", TEXT, "secondary text on a tonal block (unused since R3, kept as a guard)"],
  ["color-on-tonal-2", "color-tonal-2", TEXT, "tonal tile in the second accent"],
  ["color-on-success-container", "color-success-container", TEXT, "status active / maintained"],
  ["color-on-warning-container", "color-warning-container", TEXT, "status paused"],
  ["color-on-tonal", "color-tonal", TEXT, "status in development, current language, tonal tiles"],
  ["color-text", "color-code-bg", TEXT, "code text"],
  ["color-accent-2", "color-tonal", TEXT, "label colour on a tonal block (guard)"],
  ["color-accent-2", "color-surface", TEXT, "labels on surfaces (filled tiles, fact bar)"],
  ["color-accent-2", "color-bg", TEXT, "eyebrow labels"],
  ["color-accent-2", "color-raised", TEXT, "labels on cards"],
  ["color-text", "color-mark", TEXT, "highlighted search hits"],
  ["color-text", "color-glow-1", TEXT, "hero text on tint 1"],
  ["color-text", "color-glow-2", TEXT, "hero text on tint 2"],
  ["color-muted", "color-glow-1", TEXT, "hero lead on tint 1"],
  ["color-muted", "color-glow-2", TEXT, "hero lead on tint 2"],
  ["color-accent-2", "color-glow-1", TEXT, "hero eyebrow on tint 1"],
  ["color-accent-2", "color-glow-2", TEXT, "page eyebrow on tint 2 (page-top glow)"],
  ["color-accent", "color-glow-1", TEXT, "breadcrumb links on tint 1 (page-top glow)"],
  ["color-accent", "color-glow-2", TEXT, "breadcrumb links on tint 2 (page-top glow)"],
  ["color-border-strong", "color-bg", UI, "form control and button borders"],
  ["color-border-strong", "color-surface", UI, "form control borders on surfaces"],
  ["color-border-strong", "color-raised", UI, "secondary button border on cards"],
  ["color-accent", "color-bg", UI, "focus outline"],
  ["color-accent", "color-surface", UI, "focus outline on surfaces"],
  ["color-accent", "color-raised", UI, "focus outline on cards"],
  ["color-accent", "color-glow-1", UI, "focus outline in the hero"],
  ["color-accent", "color-glow-2", UI, "focus outline in the hero"],
  ["color-accent-hover", "color-surface", TEXT, "hovered links on surfaces"],
  ["color-accent-hover", "color-glow-1", TEXT, "hovered links on tint 1"],
  ["code-comment", "color-code-bg", TEXT, "code comments"],
  ["code-keyword", "color-code-bg", TEXT, "code keywords"],
  ["code-string", "color-code-bg", TEXT, "code strings"],
  ["code-number", "color-code-bg", TEXT, "code numbers"],
  ["code-function", "color-code-bg", TEXT, "code functions"],
];

// Gradient text: [stops], [backgrounds], minimum, use. Backgrounds are token
// names; "mesh" adds every mix of each glow with the page background.
const gradients = [
  [
    ["color-grad-1", "color-grad-2", "color-grad-3"],
    ["color-bg", "mesh"],
    largeTextToken("text-display", ".hero__title"),
    "hero name (gradient text, large: --text-display ≥ 24 px)",
  ],
  [
    ["color-accent", "color-accent-2"],
    ["color-bg", "color-raised", "color-surface"],
    UI,
    "gradient contour (featured card, card hover, nav indicator, notice bar)",
  ],
  [["color-accent", "color-accent-2"], ["color-on-accent"], TEXT, "monogram label on the accent gradient"],
];

// State layers (R4): hovered, focused and pressed boxes get an overlay of
// the text colour at these opacities (Material 3 md.sys.state: hover 8 %,
// focus and pressed 10 %; --state-hover/--state-focus in tokens.css, read
// from there). Every text colour that sits in a box is checked on every box
// surface with the layer composited on top.
const stateOpacity = (name) => Number(rootBlock.match(new RegExp(`--${name}:\\s*([\\d.]+);`))?.[1]);
const stateLayers = ["state-hover", "state-focus"].map((n) => [n, stateOpacity(n)]);
for (const [n, o] of stateLayers)
  if (!(o > 0 && o <= 0.12)) r.fail("tokens.css", `--${n} missing or outside 0–12 % (${o})`);
// Box surface → the text colours used on it. Tonal tiles set all their text,
// links included, in the on-tonal colour (Material: on-primary-container).
const boxText = ["color-text", "color-muted", "color-accent", "color-accent-2"];
const boxes = [
  ["color-raised", boxText],
  ["color-bg", boxText],
  ["color-surface", boxText],
  ["color-tonal", ["color-on-tonal", "color-text"]],
];

// Translucent header: text tokens over the header colour composited over
// the content that can scroll beneath it (worst case: text and accents).
const headerText = ["color-text", "color-muted", "color-accent"];
const underHeader = [
  "color-bg",
  "color-text",
  "color-accent",
  "color-raised",
  "color-glow-1",
  "color-glow-2",
];

const rows = [];
for (const [theme, p] of [
  ["light", light],
  ["dark", dark],
]) {
  for (const [fg, bg, min, use] of pairs) {
    if (!p[fg] || !p[bg]) {
      r.fail(theme, `token --${fg} or --${bg} missing`);
      continue;
    }
    const value = ratio(p[fg], p[bg]);
    rows.push(`${theme.padEnd(5)} ${value.toFixed(2).padStart(5)}:1 (min ${min}) ${fg} on ${bg} – ${use}`);
    if (value < min) r.fail(theme, `${fg} on ${bg}: ${value.toFixed(2)}:1 < ${min}:1 (${use})`);
  }

  for (const [stops, bgs, min, use] of gradients) {
    const backgrounds = bgs.flatMap((b) =>
      b === "mesh"
        ? ["color-glow-1", "color-glow-2"].flatMap((g) =>
            Array.from({ length: 11 }, (_, i) => [`${g}→bg ${i * 10}%`, mix(p[g], p["color-bg"], i / 10)]),
          )
        : [[b, p[b]]],
    );
    let worst = { value: Infinity };
    for (let s = 0; s < stops.length - 1; s++) {
      for (let i = 0; i <= 100; i++) {
        const fg = mix(p[stops[s]], p[stops[s + 1]], i / 100);
        for (const [name, bg] of backgrounds) {
          const value = ratio(fg, bg);
          if (value < worst.value) worst = { value, fg, name };
        }
      }
    }
    rows.push(
      `${theme.padEnd(5)} ${worst.value.toFixed(2).padStart(5)}:1 (min ${min}) gradient ${stops.join("→")}, worst sample ${worst.fg} on ${worst.name} – ${use}`,
    );
    if (worst.value < min) r.fail(theme, `gradient ${use}: worst ${worst.value.toFixed(2)}:1 < ${min}:1`);
  }

  for (const [layer, o] of stateLayers) {
    let worst = { value: Infinity };
    for (const [surface, texts] of boxes)
      for (const fg of texts) {
        const bg = mix(p[surface], p["color-text"], o);
        const value = ratio(p[fg], bg);
        if (value < worst.value) worst = { value, fg, surface };
      }
    rows.push(
      `${theme.padEnd(5)} ${worst.value.toFixed(2).padStart(5)}:1 (min ${TEXT}) worst: ${worst.fg} on ${worst.surface} + ${layer} ${o * 100}% – box state layer`,
    );
    if (worst.value < TEXT)
      r.fail(theme, `${worst.fg} on ${worst.surface} with the ${layer} layer: ${worst.value.toFixed(2)}:1`);
  }

  for (const fg of headerText) {
    let worst = { value: Infinity };
    for (const u of underHeader) {
      const bg = over(p["color-header"], p[u]);
      const value = ratio(p[fg], bg);
      if (value < worst.value) worst = { value, u, bg };
    }
    rows.push(
      `${theme.padEnd(5)} ${worst.value.toFixed(2).padStart(5)}:1 (min ${TEXT}) ${fg} on header over ${worst.u} (${worst.bg}) – translucent header`,
    );
    if (worst.value < TEXT)
      r.fail(theme, `${fg} on the translucent header over ${worst.u}: ${worst.value.toFixed(2)}:1`);
  }
}

if (process.argv.includes("--table")) {
  console.log(rows.join("\n"));
  for (const [token, rem] of largeSizes)
    console.log(`large text: --${token} min ${rem}rem = ${rem * 16}px (≥ 24px, threshold ${LARGE}:1)`);
}
r.done(
  `${rows.length} colour pairs (incl. sampled gradients and the translucent header) in light + dark meet WCAG 2.2 AA`,
);
