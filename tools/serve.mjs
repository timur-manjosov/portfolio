// Minimal static server that mimics the production Caddy setup closely
// enough for tests: same security headers (incl. the CSP), same redirects,
// the language door on `/` (302 by Accept-Language), directory index,
// trailing-slash redirect for directories, and the language-specific 404
// pages. Node built-ins only.
//
//   node tools/serve.mjs [dist] [port] [--no-door]
//   --no-door: serve dist/index.html on `/` (the static fallback that the
//   browser-side script handles), as if the server rule were missing.
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const config = JSON.parse(readFileSync(new URL("../deploy/site-config.json", import.meta.url), "utf8"));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".asc": "text/plain; charset=utf-8",
};

export function startServer(dist = "dist", port = 0, { languageDoor = true } = {}) {
  const redirects = new Map(config.redirects.map((r) => [r.from, r]));
  const door = languageDoor ? config.languageDoor : null;
  const server = createServer((req, res) => {
    for (const [name, value] of Object.entries(config.headers)) {
      // HSTS is meaningless (and ignored) over plain http on localhost.
      if (name !== "Strict-Transport-Security") res.setHeader(name, value);
    }
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = decodeURIComponent(url.pathname);

    // Language door, same rule as the Caddy block (deploy/site-config.json).
    // `--no-door` serves the static fallback page instead (tests of /index.html).
    if (door && pathname === door.path) {
      const al = req.headers["accept-language"];
      const to = al && new RegExp(door.acceptLanguage, "i").test(al.trim()) ? door.match : door.default;
      res.writeHead(door.status, { Location: to, Vary: "Accept-Language", "Cache-Control": "no-store" });
      return res.end();
    }

    const redirect = redirects.get(pathname);
    if (redirect) {
      res.writeHead(redirect.status, { Location: redirect.to });
      return res.end();
    }

    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    let file = join(dist, safe);
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(308, { Location: `${pathname}/${url.search}` });
        return res.end();
      }
      file = join(file, "index.html");
    }
    let status = 200;
    if (!existsSync(file) || !statSync(file).isFile()) {
      status = 404;
      const lang = pathname.match(/^\/(de|en)\//)?.[1];
      file = lang ? join(dist, lang, "404", "index.html") : join(dist, "404.html");
    }
    // Same caching as the Caddy block (tools/caddy-site-block.mjs): hashed
    // Astro assets forever, everything else revalidated.
    const cache = pathname.startsWith("/_astro/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate";
    res.writeHead(status, {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "Cache-Control": cache,
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const languageDoor = !args.includes("--no-door");
  const [dist = "dist", port = "4321"] = args.filter((a) => a !== "--no-door");
  const server = await startServer(dist, Number(port), { languageDoor });
  console.log(`Serving ${dist} on http://127.0.0.1:${server.address().port}/`);
}
