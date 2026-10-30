// Verifies that the build runs under the live CSP without loosening it:
// default-src 'self'; script-src 'self'; style-src 'self'; no 'unsafe-inline'.
//
// Fails on: inline <script> without src (except JSON-LD data blocks), inline
// event handlers (onclick=…), <style> elements, style="" attributes, and any
// src/href/srcset that loads a resource from another origin.
import { htmlFiles, read, rel, reporter } from "./lib.mjs";

const dist = process.argv[2] ?? "dist";
const r = reporter("CSP compatibility");
const files = htmlFiles(dist);
let scripts = 0;

for (const file of files) {
  const html = read(file);
  const where = rel(dist, file);

  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    const body = m[2].trim();
    scripts++;
    if (/\bsrc\s*=/.test(attrs)) {
      if (body) r.fail(where, "script with src must not have inline content");
      const src = attrs.match(/\bsrc\s*=\s*"([^"]*)"/)?.[1] ?? "";
      if (!src.startsWith("/") || src.startsWith("//")) r.fail(where, `script from foreign origin: ${src}`);
      continue;
    }
    if (/type\s*=\s*"application\/ld\+json"/.test(attrs)) {
      try {
        JSON.parse(body);
      } catch {
        r.fail(where, "JSON-LD block is not valid JSON");
      }
      continue;
    }
    r.fail(where, `inline script: ${body.slice(0, 60)}…`);
  }

  if (/<style\b/i.test(html)) r.fail(where, "<style> element (needs 'unsafe-inline')");
  // Editorial notes in content files (sources, review hints) are comments;
  // src/lib/rehype-strip-comments.ts removes them. None may be published.
  for (const m of html.matchAll(/<!--[\s\S]{0,60}/g)) r.fail(where, `HTML comment in output: ${m[0]}…`);
  // Attribute context only: a space before `style=` inside a tag.
  for (const m of html.matchAll(/<[a-z][^>]*\sstyle\s*=/gi)) {
    r.fail(where, `style attribute: ${m[0].slice(0, 80)}`);
  }
  for (const m of html.matchAll(/<[a-z][^>]*\son[a-z]+\s*=/gi)) {
    r.fail(where, `inline event handler: ${m[0].slice(0, 80)}`);
  }
  // Resources the browser would fetch automatically (not plain <a href> links).
  for (const m of html.matchAll(/<(img|script|link|iframe|source|video|audio|embed|object)\b[^>]*>/gi)) {
    const tag = m[0];
    if (/^<link\b/i.test(tag) && /rel\s*=\s*"(canonical|alternate|me)"/i.test(tag)) continue;
    for (const a of tag.matchAll(/\s(?:src|href|srcset|data)\s*=\s*"([^"]+)"/gi)) {
      const url = a[1];
      if (/^(https?:)?\/\//i.test(url)) r.fail(where, `third-party resource: ${url}`);
    }
  }
}

r.done(`${files.length} HTML files, ${scripts} script tags, no inline code/styles, no third-party resources`);
