// Images in posts (brief R5 §2.5, src/lib/remark-image-policy.ts):
//
//   node tools/check-images.mjs     (needs dist/ and dist-drafts/ from `npm run check`)
//
// 1. Unit tests of the policy: alt text required, no external, data: or
//    site-absolute images, no raw <img>/<picture>; inline SVG is fine.
// 2. A real build with a probe post (an image without alt text and an
//    external one) fails and names both problems.
// 3. The fixture image in dist-drafts is optimised: a hashed file under
//    /_astro/ that exists, width and height set, its alt text kept.
// 4. Every <img> in dist and dist-drafts has alt text and a local source.
import { spawnSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { imageProblems } from "../src/lib/remark-image-policy.ts";
import { htmlFiles, read, reporter } from "./lib.mjs";

const r = reporter("images in posts");
let cases = 0;
const expect = (cond, where, msg) => {
  cases++;
  if (!cond) r.fail(where, msg);
};

// 1. units
const img = (url, alt) => ({
  type: "root",
  children: [{ type: "paragraph", children: [{ type: "image", url, alt }] }],
});
const count = (tree) => imageProblems(tree).length;
expect(count(img("./post/a.png", "A chart of x")) === 0, "unit", "valid image rejected");
expect(count(img("post/a.png", "A chart")) === 0, "unit", "relative path without ./ rejected");
for (const alt of ["", "   ", null, undefined])
  expect(count(img("./a.png", alt)) === 1, "unit", `alt ${JSON.stringify(alt)} accepted`);
for (const url of [
  "https://cdn.example/a.png",
  "http://x/a.png",
  "//cdn.example/a.png",
  "data:image/png;base64,AA",
  "/images/a.png",
])
  expect(count(img(url, "alt")) === 1, "unit", `${url} accepted`);
expect(
  count({ type: "root", children: [{ type: "html", value: '<img src="a.png" alt="x">' }] }) === 1,
  "unit",
  "raw <img>",
);
expect(
  count({ type: "root", children: [{ type: "html", value: "<picture><source srcset=x></picture>" }] }) >= 1,
  "unit",
  "raw <picture>",
);
expect(
  count({ type: "root", children: [{ type: "html", value: '<svg role="img"><title>t</title></svg>' }] }) ===
    0,
  "unit",
  "inline SVG rejected",
);
const ref = {
  type: "root",
  children: [
    { type: "paragraph", children: [{ type: "imageReference", identifier: "fig", alt: "x" }] },
    { type: "definition", identifier: "fig", url: "https://cdn.example/fig.png" },
  ],
};
expect(count(ref) === 1, "unit", "external image via reference accepted");

// 2. a build with a bad image fails
const probe = "tests/fixtures/blog/en/zz-image-policy-probe.md";
const out = ".cache/image-policy";
try {
  writeFileSync(
    probe,
    '---\ntitle: "Image policy probe"\ndescription: "Temporary file of tools/check-images.mjs, deleted after the run."\ndate: 2026-01-01\ncategory: notes\ndraft: true\n---\n\n![](./nothing.png)\n\n![Remote](https://cdn.example/x.png)\n',
  );
  const b = spawnSync("node", ["tools/build.mjs", "--drafts", "--fixtures", "--out-dir", out], {
    encoding: "utf8",
  });
  const log = `${b.stdout}\n${b.stderr}`;
  expect(b.status !== 0, "failing build", "a post with an image without alt text was built");
  expect(
    /has no alt text/.test(log) && /external image https:\/\/cdn\.example/.test(log),
    "failing build",
    log.slice(-600),
  );
} finally {
  rmSync(probe, { force: true });
  rmSync(out, { recursive: true, force: true });
}

// 3. the fixture image, optimised
const page = "dist-drafts/de/blog/beispiel-selbst-hosten/index.html";
const tag = existsSync(page) ? read(page).match(/<img [^>]*>/)?.[0] : undefined;
expect(Boolean(tag), page, "no <img> on the fixture page");
if (tag) {
  const src = tag.match(/ src="([^"]+)"/)?.[1] ?? "";
  expect(/^\/_astro\/testbild\.[\w-]+\.(webp|avif|png|jpg)$/.test(src), page, `not optimised: ${src}`);
  expect(existsSync(join("dist-drafts", src)), page, `${src} missing in dist-drafts`);
  expect(/ width="\d+"/.test(tag) && / height="\d+"/.test(tag), page, "width/height missing (layout shift)");
  expect(/ alt="Testbild: [^"]+"/.test(tag), page, "alt text lost");
  expect(!/ style=/.test(tag), page, "style attribute (CSP)");
}

// 4. every image that is served
let images = 0;
for (const dist of ["dist", "dist-drafts"]) {
  for (const f of htmlFiles(dist)) {
    for (const t of read(f).match(/<img\b[^>]*>/g) ?? []) {
      images++;
      const alt = t.match(/ alt="([^"]*)"/)?.[1];
      const src = t.match(/ src="([^"]*)"/)?.[1] ?? "";
      expect(alt !== undefined, f, `<img> without alt: ${t.slice(0, 120)}`);
      expect(src.startsWith("/") && !src.startsWith("//"), f, `non-local image: ${src}`);
    }
  }
}

r.done(`${cases} cases (${images} served images checked): alt text required, local only, optimised at build`);
