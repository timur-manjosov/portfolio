// Structured data validator (brief R6 §2.5 A), in place of online
// validators. For every built page:
//
//   - exactly one <script type="application/ld+json"> with one @graph;
//   - every node has a known @type, required fields of its type and the
//     right value types; @ids are absolute and unique within the graph;
//   - every reference ({"@id": …} without other keys) resolves to a node of
//     the same graph, and references point at the expected types;
//   - nothing that is not visible: no FAQPage, HowTo, Review, rating or Q&A
//     markup anywhere; BlogPosting headline/description/dates/section/tags/
//     citations, SoftwareSourceCode name/repository and ItemList entries
//     match what the page shows; breadcrumb and list URLs exist in the build;
//   - identity: Person.description equals the home page's meta description
//     (one source, src/data/site.ts), and the facts on About name the same
//     university.
//
//   node tools/check-jsonld.mjs [dist]
import { existsSync } from "node:fs";
import { join } from "node:path";
import { htmlFiles, read, rel, reporter } from "./lib.mjs";

const dist = process.argv[2] ?? "dist";
const SITE = "https://timurmanjosov.com";
const r = reporter("structured data (JSON-LD)");

const FORBIDDEN = new Set([
  "FAQPage",
  "HowTo",
  "Review",
  "AggregateRating",
  "Rating",
  "QAPage",
  "Question",
  "Answer",
]);
const isoDay = /^\d{4}-\d{2}-\d{2}$/;
const str = (v) => typeof v === "string" && v.trim().length > 0;
const absUrl = (v) => typeof v === "string" && /^https:\/\/[^\s]+$/.test(v);
const own = (v) => absUrl(v) && v.startsWith(`${SITE}/`);
const isRef = (v) =>
  v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 1 && "@id" in v;

/** Required fields per type: name → predicate. */
const REQUIRED = {
  Person: { name: str, url: own, description: str },
  WebSite: { url: own, name: str, inLanguage: Array.isArray, author: isRef, publisher: isRef },
  WebPage: { url: own, name: str, description: str, inLanguage: str, isPartOf: isRef },
  ProfilePage: { url: own, name: str, inLanguage: str, isPartOf: isRef, mainEntity: isRef },
  CollectionPage: { url: own, name: str, description: str, inLanguage: str, isPartOf: isRef },
  BreadcrumbList: { itemListElement: Array.isArray },
  ItemList: { itemListElement: Array.isArray, numberOfItems: Number.isInteger },
  Blog: { name: str, url: own, inLanguage: str, author: isRef },
  BlogPosting: {
    headline: str,
    description: str,
    url: own,
    inLanguage: str,
    datePublished: (v) => isoDay.test(v),
    dateModified: (v) => isoDay.test(v),
    author: isRef,
    publisher: isRef,
    isPartOf: isRef,
    articleSection: str,
    keywords: Array.isArray,
    wordCount: (v) => Number.isInteger(v) && v > 0,
    image: absUrl,
  },
  SoftwareSourceCode: {
    name: str,
    description: str,
    url: own,
    author: isRef,
    codeRepository: absUrl,
    programmingLanguage: (v) => Array.isArray(v) && v.length > 0,
  },
  CreativeWork: { name: str },
};
/** Which types a reference property may point at. */
const REF_TARGETS = {
  author: ["Person"],
  publisher: ["Person"],
  mainEntity: ["Person", "BlogPosting", "SoftwareSourceCode", "CreativeWork", "ItemList", "Blog"],
  mainEntityOfPage: ["WebPage", "ProfilePage", "CollectionPage"],
  breadcrumb: ["BreadcrumbList"],
  about: ["Person"],
};

const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<annotation[\s\S]*?<\/annotation>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const fileOf = (url) => {
  const path = url.slice(SITE.length).split("#")[0];
  return join(dist, path.endsWith("/") ? `${path}index.html` : path);
};

let pages = 0;
let nodes = 0;
const homeDescription = {};
const people = [];

for (const file of htmlFiles(dist)) {
  const html = read(file);
  const url = rel(dist, file).replace(/index\.html$/, "");
  const where = url;
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (blocks.length !== 1) {
    r.fail(where, `${blocks.length} JSON-LD blocks (expected 1)`);
    continue;
  }
  let doc;
  try {
    doc = JSON.parse(blocks[0][1]);
  } catch (e) {
    r.fail(where, `JSON-LD does not parse: ${e.message}`);
    continue;
  }
  pages++;
  if (doc["@context"] !== "https://schema.org" || !Array.isArray(doc["@graph"])) {
    r.fail(where, "JSON-LD is not one schema.org @graph");
    continue;
  }
  const graph = doc["@graph"];
  const byId = new Map();
  for (const n of graph) {
    nodes++;
    if (!absUrl(n["@id"])) r.fail(where, `node ${n["@type"]} without an absolute @id`);
    else if (byId.has(n["@id"])) r.fail(where, `duplicate @id ${n["@id"]}`);
    else byId.set(n["@id"], n);
  }
  // The language door "/" always redirects and is no page of its own.
  if (url === "/") continue;
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const lang = html.match(/<html\b[^>]*\slang="([^"]+)"/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  const visible = text(html.match(/<body[\s\S]*<\/body>/)?.[0] ?? "");
  const h1 = text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
  const hrefs = new Set([...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1]));

  // Walk every object: forbidden types, inline nodes, references.
  const visit = (v, prop, owner) => {
    if (Array.isArray(v)) {
      for (const x of v) visit(x, prop, owner);
      return;
    }
    if (!v || typeof v !== "object") return;
    const type = v["@type"];
    for (const t of [type].flat()) if (FORBIDDEN.has(t)) r.fail(where, `forbidden type ${t}`);
    if (isRef(v)) {
      const target = byId.get(v["@id"]);
      if (!target) r.fail(where, `${owner}.${prop} → ${v["@id"]} does not resolve in this graph`);
      else if (REF_TARGETS[prop] && !REF_TARGETS[prop].includes(target["@type"]))
        r.fail(where, `${owner}.${prop} points at a ${target["@type"]}`);
      return;
    }
    for (const [k, x] of Object.entries(v)) if (!k.startsWith("@")) visit(x, k, type ?? owner);
  };
  for (const n of graph) visit(n, "", n["@type"]);

  for (const n of graph) {
    const type = n["@type"];
    const req = REQUIRED[type];
    if (!req) {
      r.fail(where, `unexpected top-level type ${type}`);
      continue;
    }
    for (const [field, ok] of Object.entries(req)) {
      if (!ok(n[field])) r.fail(where, `${type}.${field} missing or malformed: ${JSON.stringify(n[field])}`);
    }
    if (
      "inLanguage" in n &&
      typeof n.inLanguage === "string" &&
      n.inLanguage !== lang &&
      type !== "BlogPosting"
    )
      r.fail(where, `${type}.inLanguage ${n.inLanguage} ≠ <html lang="${lang}">`);
  }

  const person = graph.find((n) => n["@type"] === "Person");
  if (person) people.push({ where, lang, person });
  const page = graph.find((n) => ["WebPage", "ProfilePage", "CollectionPage"].includes(n["@type"]));
  if (noindex) {
    if (page) r.fail(where, "noindex page carries a page node");
  } else {
    if (!page) r.fail(where, "indexable page without a WebPage/ProfilePage/CollectionPage node");
    else {
      if (page.url !== canonical) r.fail(where, `page node url ${page.url} ≠ canonical ${canonical}`);
      if (page.description !== description.replace(/&quot;/g, '"').replace(/&amp;/g, "&"))
        r.fail(where, "page node description ≠ meta description");
      if (/^\/(de|en)\/$/.test(url)) homeDescription[lang] = page.description;
    }
  }

  const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList");
  if (crumbs) {
    const items = crumbs.itemListElement;
    items.forEach((it, i) => {
      if (it.position !== i + 1) r.fail(where, `breadcrumb position ${it.position} at index ${i}`);
      if (!str(it.name) || !own(it.item)) r.fail(where, `breadcrumb item ${i + 1} incomplete`);
      else if (!existsSync(fileOf(it.item))) r.fail(where, `breadcrumb item ${it.item} does not exist`);
    });
    if (items.at(-1)?.item !== canonical) r.fail(where, "last breadcrumb is not the page itself");
  }

  for (const list of graph.filter((n) => n["@type"] === "ItemList")) {
    if (list.numberOfItems !== list.itemListElement.length) r.fail(where, "ItemList.numberOfItems ≠ entries");
    list.itemListElement.forEach((it, i) => {
      if (it.position !== i + 1 || !own(it.url) || !str(it.name))
        r.fail(where, `ItemList entry ${i + 1} malformed`);
      else {
        if (!existsSync(fileOf(it.url))) r.fail(where, `ItemList entry ${it.url} does not exist`);
        if (!hrefs.has(it.url.slice(SITE.length)))
          r.fail(where, `ItemList entry ${it.url} is not linked on the page`);
      }
    });
  }

  const post = graph.find((n) => n["@type"] === "BlogPosting");
  if (post) {
    if (post.headline !== h1) r.fail(where, `headline "${post.headline}" ≠ <h1> "${h1}"`);
    if (post.url !== `${SITE}${url}`) r.fail(where, "BlogPosting.url is not the page");
    if (!noindex && post.mainEntityOfPage?.["@id"] !== page?.["@id"])
      r.fail(where, "BlogPosting.mainEntityOfPage is not the page node");
    if (post.inLanguage !== lang) r.fail(where, "BlogPosting.inLanguage ≠ page language");
    const byline = html.match(/<p class="byline">([\s\S]*?)<\/p>/)?.[1] ?? "";
    const times = [...byline.matchAll(/<time datetime="([^"]+)"/g)].map((m) => m[1]);
    if (times[0] !== post.datePublished)
      r.fail(where, `datePublished ${post.datePublished} ≠ visible ${times[0]}`);
    if (post.dateModified !== (times[1] ?? times[0])) r.fail(where, "dateModified ≠ visible change date");
    if (post.dateModified < post.datePublished) r.fail(where, "dateModified before datePublished");
    if (!visible.includes(post.articleSection)) r.fail(where, `section "${post.articleSection}" not visible`);
    for (const k of post.keywords)
      if (!visible.includes(`#${k}`)) r.fail(where, `keyword ${k} not visible as a tag`);
    const image = post.image.startsWith(SITE) ? fileOf(post.image) : null;
    if (!image || !existsSync(image)) r.fail(where, `BlogPosting.image ${post.image} not in the build`);
    // Compared without whitespace: tags in the HTML break the text at other places.
    // Formulas: "y²" in the citation is <msup>y 2</msup> on the page.
    const digits = (s) =>
      s
        .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080))
        .replace(/[⁰¹²³⁴-⁹]/g, (d) => String("⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(d)));
    const squash = (s) => digits(s).replace(/\s+/g, "");
    const sources = squash(text(html.match(/<section class="sources"[\s\S]*?<\/section>/)?.[0] ?? ""));
    for (const c of post.citation ?? []) {
      if (c["@type"] !== "CreativeWork" || !str(c.name)) r.fail(where, "citation entry malformed");
      else if (!sources.includes(squash(c.name)))
        r.fail(where, `citation "${c.name.slice(0, 60)}…" not in the sources section`);
      if (c.url && !hrefs.has(c.url)) r.fail(where, `citation URL ${c.url} not linked on the page`);
    }
    if (sources && !(post.citation ?? []).length) r.fail(where, "sources section without citation");
  }

  const code = graph.find((n) => n["@type"] === "SoftwareSourceCode" || n["@type"] === "CreativeWork");
  if (code && /\/projects\/[^/]+\/$/.test(url)) {
    if (code.name !== h1) r.fail(where, `project name "${code.name}" ≠ <h1> "${h1}"`);
    if (code.codeRepository && !hrefs.has(code.codeRepository))
      r.fail(where, `codeRepository ${code.codeRepository} not linked on the page`);
  }
}

// One identity: Person.description per language = the home page's description.
for (const { where, lang, person } of people) {
  if (homeDescription[lang] && person.description !== homeDescription[lang])
    r.fail(where, "Person.description differs from the home page's description");
}
for (const lang of ["de", "en"]) {
  const about = join(dist, lang, "about", "index.html");
  if (!existsSync(about)) continue;
  const graph = JSON.parse(read(about).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])[
    "@graph"
  ];
  const person = graph.find((n) => n["@type"] === "Person");
  if (!text(read(about)).includes(person.affiliation.name))
    r.fail(`/${lang}/about/`, "the facts on About do not name the university of the JSON-LD Person");
  if (graph.find((n) => n["@type"] === "ProfilePage")?.mainEntity?.["@id"] !== person["@id"])
    r.fail(`/${lang}/about/`, "ProfilePage.mainEntity is not the Person");
}

r.done(`${pages} pages, ${nodes} nodes: types, required fields, references, visible text, identity`);
