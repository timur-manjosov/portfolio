/**
 * GFM footnotes get an English heading ("Footnotes") and English back-link
 * labels ("Back to reference 1") from the Markdown pipeline, whatever the
 * language of the post. This plugin replaces them with the strings from
 * src/i18n/ui.ts, using the language folder of the content file
 * (src/content/<collection>/<lang>/…).
 */
import { type Lang, ui } from "../i18n/ui";

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function walk(node: HastNode, visit: (n: HastNode) => void): void {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

export default function rehypeFootnoteLang() {
  return (tree: HastNode, file: { path?: string; history?: string[] }) => {
    const path = file.path ?? file.history?.[0] ?? "";
    const lang = path.match(/[\\/]content[\\/][^\\/]+[\\/](de|en)[\\/]/)?.[1] as Lang | undefined;
    if (!lang) return;
    const label = ui[lang]["blog.footnotes"];
    const back = ui[lang]["blog.footnoteBack"];
    walk(tree, (n) => {
      if (n.type !== "element" || !n.properties) return;
      if (n.properties.id === "footnote-label") n.children = [{ type: "text", value: label }];
      const aria = n.properties.ariaLabel;
      if (typeof aria === "string" && aria.startsWith("Back to reference")) {
        n.properties.ariaLabel = aria.replace("Back to reference", back);
      }
    });
  };
}
