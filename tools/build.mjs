// Builds the site in one of two modes and injects the private data layer.
//
//   node tools/build.mjs [--private <file>] [--drafts] [--out-dir <dir>]
//       public mode (default, also CI). Without --private nothing private is
//       rendered: sections that need private values are left out, without
//       placeholders. With --private the file is validated and used.
//
//   node tools/build.mjs --release [--private <file>] [--out-dir <dir>]
//       release mode (deploy/build-release.sh). --private defaults to
//       private/site.private.yaml. Fails unless the file is valid and has
//       contact.email and legal.controller, contains no test values
//       (example.invalid), and the output has no visible TODO( marker or test
//       value. Texts still marked `status: draft-review` do not block, they
//       are counted in a warning.
//       --allow-test-values turns the test-value errors into warnings. Only
//       deploy/build-release.sh --test-only uses it, and it marks such a
//       release so that stage.sh and apply-on-server.sh refuse it.
//
//   node tools/build.mjs --dev [--private <file>]
//       dev server (drafts visible) with private data, for previewing.
//
// Test switches (refused with --release, so a release can never contain them):
//   --fixtures            also load the example posts in tests/fixtures/blog/
//                         (sets CONTENT_FIXTURES=1, see src/content.config.ts)
//   --build-date <date>   pretend the build runs on <date> (YYYY-MM-DD, a day in
//                         Europe/Berlin, or an ISO instant such as
//                         2030-06-14T23:30:00Z). Decides which posts are
//                         scheduled (src/lib/schedule.ts). Sets BUILD_DATE.
// Without these flags the environment variables are removed, so a stray
// CONTENT_FIXTURES in the shell cannot leak fixtures into a normal build;
// BUILD_DATE set in the environment is honoured outside release mode only.
//
// The data reaches the site through one Vite `define` constant,
// __SITE_PRIVATE__, read only in src/data/private.ts. No environment
// variables, no generated files in the source tree.
import { readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build, dev } from "astro";
import { resolveBuildDay } from "../src/lib/schedule.ts";
import { DEFAULT_PRIVATE_FILE, loadPrivateFile, PrivateDataError, TEST_MARKERS } from "./private-data.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

function parseArgs(argv) {
  const opts = {
    release: false,
    drafts: false,
    dev: false,
    allowTest: false,
    privateFile: null,
    outDir: "dist",
    fixtures: false,
    buildDate: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--release") opts.release = true;
    else if (a === "--drafts") opts.drafts = true;
    else if (a === "--dev") opts.dev = true;
    else if (a === "--allow-test-values") opts.allowTest = true;
    else if (a === "--fixtures") opts.fixtures = true;
    else if (a === "--build-date") opts.buildDate = argv[++i];
    else if (a === "--private") opts.privateFile = argv[++i];
    else if (a === "--out-dir") opts.outDir = argv[++i];
    else throw new Error(`unknown argument: ${a}`);
    if ((a === "--private" || a === "--out-dir" || a === "--build-date") && !argv[i])
      throw new Error(`${a} needs a value`);
  }
  if (opts.release && opts.fixtures)
    throw new Error("--fixtures is for test builds; a release never contains fixtures");
  if (opts.release && (opts.buildDate || process.env.BUILD_DATE))
    throw new Error("a release is always built with the real date (no --build-date, no BUILD_DATE)");
  if (opts.release && process.env.CONTENT_FIXTURES)
    throw new Error("CONTENT_FIXTURES is set in the environment; a release never contains fixtures");
  if (opts.release && (process.env.GITHUB_API_BASE || process.env.GITHUB_META_CACHE))
    throw new Error("GITHUB_API_BASE / GITHUB_META_CACHE are test switches; a release talks to the real API");
  if (opts.release && opts.drafts) throw new Error("--release and --drafts exclude each other");
  if (opts.allowTest && !opts.release) throw new Error("--allow-test-values only makes sense with --release");
  if (opts.release && !opts.privateFile) opts.privateFile = DEFAULT_PRIVATE_FILE;
  return opts;
}

function fail(lines) {
  console.error(`✗ build: ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(`  ${l}`);
  process.exit(1);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** Non-draft content files still marked `status: draft-review`. */
function draftReviewCount() {
  let n = 0;
  for (const file of walk(join(root, "src/content"))) {
    if (!file.endsWith(".md")) continue;
    const fm = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    if (/^status:\s*draft-review\s*$/m.test(fm) && !/^draft:\s*true\s*$/m.test(fm)) n++;
  }
  return n;
}

/** Visible TODO( markers and test values in the built text output. */
function scanOutput(outDir) {
  const hits = [];
  for (const file of walk(outDir)) {
    if (!/\.(html|xml|txt|json|asc)$/.test(file)) continue;
    let text = readFileSync(file, "utf8");
    // HTML comments are not visible (and the Markdown pipeline strips them anyway).
    if (file.endsWith(".html")) text = text.replace(/<!--[\s\S]*?-->/g, "");
    for (const marker of TEST_MARKERS) {
      if (text.includes(marker)) hits.push(`${file.slice(outDir.length)}: contains "${marker}"`);
    }
  }
  return hits;
}

let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (error) {
  fail([error.message]);
}

let privateData = null;
const warnings = [];
if (opts.privateFile) {
  try {
    const loaded = loadPrivateFile(opts.privateFile);
    privateData = loaded.data;
    warnings.push(...loaded.warnings);
    if (opts.release) {
      const missing = [];
      if (!loaded.data.contact.email) missing.push("contact.email");
      if (!loaded.data.legal.controller) missing.push("legal.controller (name, email)");
      if (missing.length) {
        fail([
          `release needs a complete private file, missing in ${opts.privateFile}:`,
          ...missing.map((m) => `- ${m}`),
          "Fill it in (field reference: site.private.example.yaml, steps: docs/GO-LIVE.md).",
        ]);
      }
      const raw = readFileSync(resolve(opts.privateFile), "utf8");
      const testHits = TEST_MARKERS.filter((m) => raw.includes(m));
      if (testHits.length) {
        const msg = `${opts.privateFile} contains test values (${testHits.join(", ")})`;
        if (!opts.allowTest) fail([`${msg}; a release never ships them.`]);
        warnings.push(`${msg}: allowed for a test-only release`);
      }
    }
  } catch (error) {
    if (error instanceof PrivateDataError) fail(error.message.split("\n"));
    throw error;
  }
}

if (opts.drafts || opts.dev) process.env.SHOW_DRAFTS = "1";
if (opts.fixtures) process.env.CONTENT_FIXTURES = "1";
else delete process.env.CONTENT_FIXTURES;
if (opts.buildDate) process.env.BUILD_DATE = opts.buildDate;
let buildDay;
try {
  // Validates BUILD_DATE early (a typo must not silently mean "today").
  buildDay = resolveBuildDay();
} catch (error) {
  fail([error.message]);
}
const mode = opts.release ? "release" : "public";
const inline = {
  root,
  vite: { define: { __SITE_PRIVATE__: JSON.stringify(privateData) } },
};
console.log(
  `build mode: ${opts.dev ? "dev" : mode}${opts.drafts ? " + drafts" : ""}${opts.fixtures ? " + fixtures" : ""}, ` +
    `private data: ${opts.privateFile ?? "none"}, build day: ${buildDay}${process.env.BUILD_DATE ? " (BUILD_DATE)" : ""}`,
);

if (opts.dev) {
  await dev(inline);
} else {
  const outDir = resolve(root, opts.outDir);
  await build({ ...inline, outDir, force: true });
  if (opts.release) {
    const hits = scanOutput(outDir);
    // A visible TODO( never passes, not even in a test-only release; test
    // values (example.invalid) pass only there.
    const blocking = opts.allowTest ? hits.filter((h) => h.includes('"TODO("')) : hits;
    if (blocking.length) {
      rmSync(outDir, { recursive: true, force: true });
      fail([`output contains markers that must not go live (output removed):`, ...blocking]);
    }
    if (hits.length) warnings.push(`${hits.length} test value(s) in the output (test-only release)`);
    const review = draftReviewCount();
    if (review)
      warnings.push(`${review} published text(s) still marked status: draft-review (npm run report:i18n)`);
  }
  for (const w of warnings) console.warn(`⚠ ${w}`);
  console.log(`✓ build (${mode}) → ${opts.outDir}`);
}
