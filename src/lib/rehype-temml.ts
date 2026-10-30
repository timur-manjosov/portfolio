/**
 * Renders math nodes produced by remark-math to MathML at build time, using
 * Temml (TeX → MathML Core).
 *
 * Why not rehype-katex: KaTeX's HTML output positions glyphs with inline
 * `style` attributes, which the site's CSP (`style-src 'self'`, no
 * 'unsafe-inline') blocks. MathML needs no CSS hacks and no client JS, and
 * browsers expose it to assistive technology natively.
 *
 * remark-rehype turns `$…$` into `<code class="language-math math-inline">`
 * and `$$…$$` into `<pre><code class="language-math math-display">`. Each of
 * those is replaced by a raw node holding Temml's markup; Astro serialises
 * raw nodes verbatim.
 */
import temml from "temml";

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function classList(node: HastNode): string[] {
  const value = node.properties?.className;
  return Array.isArray(value) ? value.map(String) : [];
}

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

function render(tex: string, displayMode: boolean): string {
  // throwOnError: a TeX typo should break the build, not ship a red error box.
  const html = temml
    .renderToString(tex, { displayMode, throwOnError: true, annotate: true })
    // Temml adds this for Firefox/Safari; the stylesheet sets the same rule
    // on math.tml-display, so the attribute is redundant (and CSP-blocked).
    .replace(' style="display:block math;"', "");
  if (html.includes("style=")) {
    throw new Error(
      `Temml produced an inline style attribute (blocked by the CSP) for: ${tex}\n` +
        "Rewrite the formula without commands that need inline styles (e.g. \\color, \\rule).",
    );
  }
  return html;
}

function transform(parent: HastNode): void {
  const children = parent.children;
  if (!children) return;
  for (const [i, node] of children.entries()) {
    if (node.type !== "element") continue;

    // Display math: <pre><code class="math-display">…</code></pre>
    const code = node.tagName === "pre" && node.children?.length === 1 ? node.children[0] : undefined;
    if (code) {
      if (code.tagName === "code" && classList(code).includes("math-display")) {
        children[i] = {
          type: "raw",
          value: `<div class="math-display">${render(textOf(code), true)}</div>`,
        };
        continue;
      }
    }

    // Inline math: <code class="math-inline">…</code>
    if (node.tagName === "code" && classList(node).includes("math-inline")) {
      children[i] = { type: "raw", value: render(textOf(node), false) };
      continue;
    }

    transform(node);
  }
}

export default function rehypeTemml() {
  return (tree: HastNode) => {
    transform(tree);
  };
}
