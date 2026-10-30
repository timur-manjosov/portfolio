/**
 * Removes HTML comments from rendered Markdown. Content files carry
 * editorial notes as comments (sources, review hints); those are for the
 * repo, not for the published HTML.
 *
 * A comment written as its own Markdown block does not arrive as a hast
 * `comment` node but as a `raw` node holding the HTML text, so both kinds
 * are handled. tools/check-csp.mjs fails the build if a comment survives.
 */
interface HastNode {
  type: string;
  value?: string;
  children?: HastNode[];
}

const COMMENT = /<!--[\s\S]*?-->/g;

function strip(node: HastNode): void {
  if (!node.children) return;
  node.children = node.children
    .map((child) =>
      child.type === "raw" && child.value ? { ...child, value: child.value.replace(COMMENT, "") } : child,
    )
    .filter((child) => child.type !== "comment" && !(child.type === "raw" && !child.value?.trim()));
  for (const child of node.children) strip(child);
}

export default function rehypeStripComments() {
  return (tree: HastNode) => {
    strip(tree);
  };
}
