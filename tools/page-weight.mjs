// Page weight without a browser: for each given page, the HTML plus every
// same-origin resource it makes the browser fetch up front (stylesheets,
// scripts, preloaded fonts, icons), raw and gzip-compressed. Fonts referenced
// only from CSS are listed separately (fetched only when used).
//
//   node tools/page-weight.mjs [dist] [/path/ …]
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const [dist = "dist", ...paths] = process.argv.slice(2);
const pages = paths.length ? paths : ["/", "/en/", "/de/blog/", "/en/projects/", "/en/about/", "/de/search/"];
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

function fileFor(url) {
  const p = join(dist, url.split("?")[0]);
  if (existsSync(p) && statSync(p).isFile()) return p;
  return join(p, "index.html");
}

console.log("| Page | Requests | Raw | gzip | JS (raw) |");
console.log("|---|---|---|---|---|");
for (const page of pages) {
  const htmlFile = fileFor(page);
  const html = readFileSync(htmlFile);
  const text = html.toString("utf8");
  const urls = new Set();
  for (const m of text.matchAll(/<link\b[^>]*rel="(?:stylesheet|preload|icon)"[^>]*>/g)) {
    const href = m[0].match(/href="([^"]+)"/)?.[1];
    if (href?.startsWith("/") && !m[0].includes('type="image/png"')) urls.add(href);
  }
  for (const m of text.matchAll(/<script\b[^>]*src="(\/[^"]+)"/g)) urls.add(m[1]);
  // Astro emits module scripts as <script type="module" src=…>; their static
  // imports are fetched too.
  let raw = html.length;
  let gz = gzipSync(html).length;
  let js = 0;
  const seen = new Set(urls);
  for (const url of [...urls]) {
    const body = readFileSync(fileFor(url));
    raw += body.length;
    gz += /\.woff2$|\.png$/.test(url) ? body.length : gzipSync(body).length;
    if (url.endsWith(".js")) {
      js += body.length;
      for (const imp of body.toString("utf8").matchAll(/from\s*"(\.\/[^"]+\.js)"/g)) {
        const dep = `/_astro/${imp[1].slice(2)}`;
        if (!seen.has(dep)) {
          seen.add(dep);
          urls.add(dep);
          const d = readFileSync(fileFor(dep));
          raw += d.length;
          gz += gzipSync(d).length;
          js += d.length;
        }
      }
    }
  }
  console.log(`| \`${page}\` | ${1 + seen.size} | ${kb(raw)} | ${kb(gz)} | ${kb(js)} |`);
}
