/**
 * Images in Markdown content (brief R5 §2.5). An image lives next to its
 * post (`src/content/blog/<lang>/<slug>/figure.png`, written as
 * `![What the figure shows](./<slug>/figure.png)`); Astro optimises it at
 * build time (hashed file under /_astro/, width and height set, lazy).
 *
 * The build fails (with file and line) for
 * - an image without alt text (screen readers, and the text when it fails to load),
 * - an external, `data:` or site-absolute image (no third-party requests, the
 *   CSP is `img-src 'self'`, and only relative files are optimised),
 * - an `<img>`/`<picture>` written as raw HTML (it would bypass both rules).
 * Decorative images do not belong in posts; inline SVG figures (with
 * <title>/<desc>) are not affected.
 */

interface MdNode {
  type: string;
  url?: string;
  alt?: string | null;
  value?: string;
  identifier?: string;
  children?: MdNode[];
  position?: { start?: { line?: number } };
}

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const RAW_IMAGE = /<(?:img|picture|source)\b/i;

/** Every policy violation in a Markdown tree, as "line N: message". */
export function imageProblems(tree: MdNode): string[] {
  const definitions = new Map<string, string>();
  const collect = (node: MdNode) => {
    if (node.type === "definition" && node.identifier && node.url !== undefined)
      definitions.set(node.identifier.toLowerCase(), node.url);
    for (const child of node.children ?? []) collect(child);
  };
  collect(tree);

  const problems: string[] = [];
  const visit = (node: MdNode) => {
    const at = `line ${node.position?.start?.line ?? "?"}`;
    if (node.type === "image" || node.type === "imageReference") {
      const url =
        node.type === "image"
          ? (node.url ?? "")
          : (definitions.get((node.identifier ?? "").toLowerCase()) ?? "");
      if (!node.alt?.trim()) problems.push(`${at}: image ${url || "(no url)"} has no alt text`);
      if (EXTERNAL.test(url)) problems.push(`${at}: external image ${url}; put the file next to the post`);
      else if (url.startsWith("/"))
        problems.push(`${at}: site-absolute image ${url}; use a path relative to the post`);
      else if (!url) problems.push(`${at}: image without a file`);
    }
    if (node.type === "html" && RAW_IMAGE.test(node.value ?? ""))
      problems.push(`${at}: raw HTML image; use ![alt text](./file.png)`);
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return problems;
}

export default function remarkImagePolicy() {
  // mdast and vfile types stay out: the walker reads only the fields above.
  return (tree: unknown, file: unknown) => {
    const problems = imageProblems(tree as MdNode);
    if (problems.length) {
      const vfile = file as { path?: string | undefined; history?: string[] | undefined };
      const where = vfile.path ?? vfile.history?.[0] ?? "Markdown file";
      throw new Error(
        `Image policy (src/lib/remark-image-policy.ts) in ${where}:\n  ${problems.join("\n  ")}`,
      );
    }
  };
}
