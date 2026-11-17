/**
 * Article structure that Markdown cannot express (R6-D4):
 *
 * 1. Tables. A paragraph directly before a table that starts with
 *    "Tabelle:" or "Table:" becomes the table's <caption> (the pandoc
 *    convention, readable in the raw Markdown too). Every table is wrapped in
 *    a focusable scroll box (`div.table-scroll`), so a wide table scrolls
 *    by itself instead of widening the page. A table whose estimated natural width exceeds a phone screen gets
 *    a written hint below it (shown on small screens only, global.css).
 * 2. Sources. The last h2 section whose heading names sources ("Quellen",
 *    "Literatur", "Further reading", "Sources", "References") is wrapped in
 *    `section.sources` so it can be set apart (smaller, hanging indents).
 *    Its list items become the post's JSON-LD `citation` (text + first link).
 *
 * The language of a file comes from its path (src/content/<c>/<lang>/…).
 */
import { type Lang, ui } from "../i18n/ui";

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const CAPTION = /^\s*(Tabelle|Table):\s*/;
const SOURCES = /quellen|literatur|further reading|sources|references|bibliography/i;
/** Below this estimated width (rem) a table fits a 360 px screen. */
const NARROW_REM = 20;

function text(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(text).join("");
}

function isElement(node: HastNode | undefined, tag?: string): boolean {
  return Boolean(node && node.type === "element" && (!tag || node.tagName === tag));
}

function langOf(path: string | undefined): Lang {
  const m = (path ?? "").match(/[\\/](de|en)[\\/][^\\/]+$/);
  return m?.[1] === "de" ? "de" : "en";
}

/** Natural width of a table in rem: per column the longest cell (≈ 0.5 rem
 *  per character at 14 px Inter) plus padding. A rough, safe estimate. */
function estimateRem(table: HastNode): number {
  const widths: number[] = [];
  const visit = (n: HastNode) => {
    if (isElement(n, "tr")) {
      (n.children ?? [])
        .filter((c) => isElement(c))
        .forEach((cell, i) => {
          // Cells wrap at spaces: the longest word bounds the minimum, the
          // whole text the comfortable width; take the mean of both.
          const t = text(cell).trim();
          const longestWord = Math.max(0, ...t.split(/\s+/).map((w) => w.length));
          const chars = Math.min(t.length, Math.max(longestWord, (t.length + longestWord) / 2));
          widths[i] = Math.max(widths[i] ?? 0, chars * 0.5 + 1.5);
        });
      return;
    }
    for (const c of n.children ?? []) visit(c);
  };
  visit(table);
  return widths.reduce((a, b) => a + b, 0);
}

/** Cells of at most this many characters get `cell-short` (no wrapping). */
const SHORT_CELL = 12;

function markShortCells(n: HastNode): void {
  if (isElement(n, "td") || isElement(n, "th")) {
    if (text(n).trim().length <= SHORT_CELL) {
      if (!n.properties) n.properties = {};
      const props = n.properties;
      const cls = Array.isArray(props.className) ? (props.className as string[]) : [];
      props.className = [...cls, "cell-short"];
    }
    return;
  }
  for (const c of n.children ?? []) markShortCells(c);
}

let tableCounter = 0;

function tables(parent: HastNode, lang: Lang): void {
  const children = parent.children ?? [];
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (!node || !isElement(node)) continue;
    if (node.tagName !== "table") {
      tables(node, lang);
      continue;
    }
    // Find the previous element sibling (skip whitespace text).
    let j = i - 1;
    while (j >= 0 && children[j]?.type === "text" && !(children[j]?.value ?? "").trim()) j--;
    const prev = j >= 0 ? children[j] : undefined;
    const id = `table-${++tableCounter}`;
    if (prev && isElement(prev, "p") && CAPTION.test(text(prev))) {
      const first = prev.children?.[0];
      if (first?.type === "text") first.value = (first.value ?? "").replace(CAPTION, "");
      node.children = [
        { type: "element", tagName: "caption", properties: { id }, children: prev.children ?? [] },
        ...(node.children ?? []),
      ];
      children.splice(j, i - j); // drop the caption paragraph (and blank text)
      i = j;
    }
    const wrapper: HastNode = {
      type: "element",
      tagName: "div",
      // Focusable so keyboard users can scroll it; no landmark role (a
      // region per table would crowd the landmark list).
      properties: { className: ["table-scroll"], tabIndex: 0 },
      children: [node],
    };
    markShortCells(node);
    const wide = estimateRem(node) > NARROW_REM;
    const hint: HastNode[] = wide
      ? [
          {
            type: "element",
            tagName: "p",
            properties: { className: ["table-hint"], ariaHidden: "true" },
            children: [{ type: "text", value: ui[lang]["blog.tableHint"] }],
          },
        ]
      : [];
    children.splice(i, 1, wrapper, ...hint);
    i += hint.length;
  }
}

/** Code blocks scroll sideways on narrow screens; like the table boxes they
 *  take keyboard focus so the scroll is reachable without a mouse (WCAG
 *  2.1.1, axe scrollable-region-focusable). Every block, because whether it
 *  scrolls depends on the screen width. */
function codeBlocks(n: HastNode): void {
  if (isElement(n, "pre")) {
    n.properties = { ...(n.properties ?? {}), tabIndex: 0 };
    return;
  }
  for (const c of n.children ?? []) codeBlocks(c);
}

/** Heading of a top-level child: h2 itself or inside the anchor group div. */
function h2Of(node: HastNode): HastNode | undefined {
  if (isElement(node, "h2")) return node;
  if (isElement(node, "div") && (node.properties?.className as string[] | undefined)?.includes("heading")) {
    return node.children?.find((c) => isElement(c, "h2"));
  }
  return undefined;
}

export interface Citation {
  name: string;
  url?: string;
}

/** The entries of the sources section: every list item, its text and first web link. */
function citationsOf(section: HastNode): Citation[] {
  const out: Citation[] = [];
  const visit = (n: HastNode) => {
    if (isElement(n, "li")) {
      const name = headingText(n).replace(/\s+/g, " ").trim();
      let url: string | undefined;
      const find = (m: HastNode) => {
        if (url) return;
        const href = m.properties?.href;
        if (isElement(m, "a") && typeof href === "string" && /^https?:\/\//.test(href)) url = href;
        else for (const c of m.children ?? []) find(c);
      };
      find(n);
      if (name) out.push(url ? { name, url } : { name });
      return;
    }
    for (const c of n.children ?? []) visit(c);
  };
  visit(section);
  return out;
}

function sources(root: HastNode): Citation[] {
  const children = root.children ?? [];
  let start = -1;
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (!child) continue;
    const h2 = h2Of(child);
    if (h2) {
      if (SOURCES.test(text(h2))) start = i;
      break;
    }
  }
  if (start < 0) return [];
  // The section ends before the footnotes block, if there is one.
  let end = children.length;
  for (let i = start + 1; i < children.length; i++) {
    const c = children[i];
    if (c && isElement(c, "section") && c.properties?.dataFootnotes !== undefined) {
      end = i;
      break;
    }
  }
  const h2 = h2Of(children[start] as HastNode);
  const section: HastNode = {
    type: "element",
    tagName: "section",
    properties: {
      className: ["sources"],
      ...(h2?.properties?.id ? { ariaLabelledby: String(h2.properties.id) } : {}),
    },
    children: children.slice(start, end),
  };
  children.splice(start, end - start, section);
  return citationsOf(section);
}

const digitMap = (to: string): Record<string, string> =>
  Object.fromEntries([...to].map((c, i) => [String(i), c]));
const SUB = digitMap("₀₁₂₃₄₅₆₇₈₉");
const SUP = digitMap("⁰¹²³⁴⁵⁶⁷⁸⁹");

/** Plain text of rendered MathML (Temml raw HTML): digits in sub- and
 *  superscripts become Unicode sub/superscripts, the TeX annotation goes. */
export function mathText(html: string): string {
  return html
    .replace(/<annotation[\s\S]*?<\/annotation>/g, "")
    .replace(/<mn[^>]*>(\d+)<\/mn><\/msub>/g, (_, d: string) => [...d].map((c) => SUB[c] ?? c).join(""))
    .replace(/<mn[^>]*>(\d+)<\/mn><\/msup>/g, (_, d: string) => [...d].map((c) => SUP[c] ?? c).join(""))
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Heading text including formulas (Astro's own heading list skips the raw
 *  MathML, so "Ein Beispiel über 𝔽₁₇" would lose its formula). */
function headingText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  if (node.type === "raw") return mathText(node.value ?? "");
  if (isElement(node) && (node.properties?.className as string[] | undefined)?.includes("heading-anchor"))
    return "";
  return (node.children ?? []).map(headingText).join("");
}

function headingLabels(tree: HastNode): Record<string, string> {
  const labels: Record<string, string> = {};
  const visit = (n: HastNode) => {
    if ((isElement(n, "h2") || isElement(n, "h3")) && n.properties?.id) {
      labels[String(n.properties.id)] = headingText(n).replace(/\s+/g, " ").trim();
      return;
    }
    for (const c of n.children ?? []) visit(c);
  };
  visit(tree);
  return labels;
}

interface VFile {
  path?: string;
  history?: string[];
  data: { astro?: { frontmatter?: Record<string, unknown> } };
}

export default function rehypeArticle() {
  return (tree: HastNode, file: VFile) => {
    const lang = langOf(file.path ?? file.history?.at(-1));
    tableCounter = 0;
    tables(tree, lang);
    codeBlocks(tree);
    const citations = sources(tree);
    // Exposed to the page as remarkPluginFrontmatter.tocLabels (Toc.astro)
    // and .citations (JSON-LD citation of the post).
    const fm = file.data.astro?.frontmatter;
    if (fm) {
      fm.tocLabels = headingLabels(tree);
      fm.citations = citations;
    }
  };
}
