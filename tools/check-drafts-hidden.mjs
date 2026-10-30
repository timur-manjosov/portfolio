// Drafts must never reach the production build (brief §3.3): for every
// content file with `draft: true`, neither its page nor its URL or title may
// appear anywhere in dist/ (pages, feeds, sitemap, search index, llms.txt).
// As a sanity check, the same entries must exist in dist-drafts/.
//
// One exception (R4-D1): a draft project that is a public repository
// (`links.repo` set) may be *named* in published text, e.g. About links to
// github.com/…/gauss-trainer. Its page and URL still must not appear.
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { read, reporter, walk } from "./lib.mjs";

const r = reporter("drafts hidden in production");
const BASE = { blog: "blog/", projects: "projects/", pages: "" };

const outputs = walk("dist").filter((f) => /\.(html|xml|json|txt)$/.test(f));
const haystack = outputs.map((f) => [f, read(f)]);

let drafts = 0;
for (const [collection, base] of Object.entries(BASE)) {
  for (const lang of ["de", "en"]) {
    const dir = join("src/content", collection, lang);
    if (!existsSync(dir)) continue;
    for (const file of walk(dir).filter((f) => f.endsWith(".md"))) {
      const fm = read(file).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
      if (!/^draft:\s*true\s*$/m.test(fm)) continue;
      drafts++;
      const url = `/${lang}/${base}${basename(file, ".md")}/`;
      const title = fm.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? "";
      const publicRepo = /^\s+repo:\s*https:\/\/github\.com\//m.test(fm);
      if (existsSync(join("dist", url))) r.fail(url, "draft page exists in dist/");
      if (!existsSync(join("dist-drafts", url, "index.html")))
        r.fail(url, "draft page missing in dist-drafts/");
      for (const [out, text] of haystack) {
        if (text.includes(url)) r.fail(out, `references draft URL ${url}`);
        else if (!publicRepo && title.length > 8 && text.includes(title))
          r.fail(out, `contains draft title "${title}"`);
      }
    }
  }
}

r.done(
  `${drafts} draft file(s), none of them in dist/ (${outputs.length} output files scanned), all in dist-drafts/`,
);
