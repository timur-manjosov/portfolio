// The page set of the before/after measurements (brief R6 §2.1), shared by
// tools/measure.mjs (transfer size, CLS) and tools/lighthouse.mjs.
export const DEFAULT_PAGES = {
  "Start DE": "/de/",
  "Start EN": "/en/",
  "Blog index": "/de/blog/",
  "Long post (maths, code)": "/de/blog/doppelausgabe-whitepaper-nachgerechnet/",
  Projects: "/en/projects/",
  "Project page": "/de/projects/aura/",
  About: "/de/about/",
  Now: "/de/now/",
  "Not found": "/de/does-not-exist/",
};

/** Parses `--pages name=/path/,name=/path/` into an object, or returns the default set. */
export function pagesFromArg(value) {
  if (!value) return DEFAULT_PAGES;
  return Object.fromEntries(value.split(",").map((p) => p.split("=")));
}
