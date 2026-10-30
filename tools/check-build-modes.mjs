// Proves the two build modes of tools/build.mjs (README, "Private data"):
//
//   public  without a private file: no private section, no placeholder, no
//           imprint, no security.txt, no key file
//   public  with the example file: every private section rendered, imprint
//           page + footer link, security.txt, /pgp-key.asc
//   public  with an incomplete imprint: no imprint page, no link
//   public  with content/<lang>/about-extra.md next to the private file: the
//           extra text appears on that About page only (convention, R4)
//   release refuses: missing file, missing contact.email/legal.controller,
//           schema errors (with field path), test values (example.invalid)
//   release --allow-test-values: builds, but reports the test values found in
//           the output (the path deploy/build-release.sh --test-only takes)
//   test switches (R5): release refuses --fixtures, --build-date and the
//           environment variables CONTENT_FIXTURES / BUILD_DATE; a public
//           build ignores CONTENT_FIXTURES without --fixtures; an invalid
//           --build-date fails
//
// Builds go to .cache/build-modes/ (git-ignored). Takes ~20 s.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { reporter } from "./lib.mjs";

const r = reporter("build modes (public/release)");
const OUT = ".cache/build-modes";
rmSync(OUT, { recursive: true, force: true });
const EXAMPLE = "site.private.example.yaml";
const INCOMPLETE = "tools/fixtures/private-example/incomplete.yaml";
const BAD = "tools/fixtures/private-example/bad-field.yaml";

let n = 0;
function build(name, args, env = {}) {
  const out = join(OUT, name);
  const res = spawnSync("node", ["tools/build.mjs", ...args, "--out-dir", out], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  n++;
  return { out, code: res.status, log: `${res.stdout}\n${res.stderr}` };
}
const file = (b, p) => join(b.out, p);
const text = (b, p) => (existsSync(file(b, p)) ? readFileSync(file(b, p), "utf8") : "");
const expect = (cond, where, msg) => {
  if (!cond) r.fail(where, msg);
};

// 1. public, no private file
const pub = build("public", []);
expect(pub.code === 0, "public", `build failed:\n${pub.log}`);
expect(!existsSync(file(pub, "de/imprint/index.html")), "public", "imprint page exists without private data");
expect(!existsSync(file(pub, ".well-known/security.txt")), "public", "security.txt exists without an e-mail");
expect(!existsSync(file(pub, "pgp-key.asc")), "public", "key file exists without private data");
for (const p of ["de/contact/index.html", "en/privacy/index.html", "de/index.html"]) {
  const html = text(pub, p);
  expect(!/imprint\//.test(html), `public ${p}`, "links to an imprint");
  expect(
    !/example\.invalid|TODO\(|undefined|null<|>null/.test(html),
    `public ${p}`,
    "placeholder or test value",
  );
  expect(!/class="privacy-controller"/.test(html), `public ${p}`, "controller section without data");
}

// 2. public, example file: everything rendered
const ex = build("example", ["--private", EXAMPLE]);
expect(ex.code === 0, "example", `build failed:\n${ex.log}`);
expect(existsSync(file(ex, "de/imprint/index.html")), "example", "imprint page missing");
expect(/imprint\//.test(text(ex, "en/index.html")), "example", "footer imprint link missing");
expect(
  text(ex, ".well-known/security.txt").includes("Contact: mailto:hello@example.invalid"),
  "example",
  "security.txt",
);
expect(text(ex, "pgp-key.asc").includes("BEGIN PGP PUBLIC KEY BLOCK"), "example", "pgp-key.asc");
expect(
  /class="[^"]*privacy-controller/.test(text(ex, "de/privacy/index.html")),
  "example",
  "controller section",
);
expect(text(ex, "en/about/index.html").includes("Extra (example)"), "example", "about_extra (en) missing");
expect(
  text(ex, "de/links/index.html").includes("https://social.example.invalid/@someone"),
  "example",
  "account on /links",
);
expect(
  /"sameAs":\[[^\]]*social\.example\.invalid/.test(text(ex, "en/index.html")),
  "example",
  "account in sameAs",
);

// 3. incomplete imprint: no page, no link
const inc = build("incomplete", ["--private", INCOMPLETE]);
expect(inc.code === 0, "incomplete", `public build with incomplete file failed:\n${inc.log}`);
expect(!existsSync(file(inc, "de/imprint/index.html")), "incomplete", "imprint page despite missing address");
expect(
  inc.log.includes("legal.imprint is incomplete"),
  "incomplete",
  "no warning about the incomplete imprint",
);

expect(!text(inc, "de/about/index.html").includes("about-extra"), "incomplete", "About extra without a file");
expect(
  !text(pub, "de/about/index.html").includes("about-extra"),
  "public",
  "About extra without private data",
);

// 3b. about-extra by convention (brief R4 §2.4): a file at
// content/<lang>/about-extra.md next to the private file is appended to that
// language's About page without any YAML entry; the other language stays
// without it.
const CONV = join(OUT, "convention-src");
mkdirSync(join(CONV, "content/de"), { recursive: true });
writeFileSync(join(CONV, "site.private.yaml"), readFileSync(INCOMPLETE, "utf8"));
writeFileSync(
  join(CONV, "content/de/about-extra.md"),
  "## Konventionstest\n\nDieser Absatz kommt aus content/de/about-extra.md.\n",
);
const conv = build("convention", ["--private", join(CONV, "site.private.yaml")]);
expect(conv.code === 0, "convention", `build failed:\n${conv.log}`);
expect(
  /class="prose about-extra"[\s\S]*Konventionstest/.test(text(conv, "de/about/index.html")),
  "convention",
  "content/de/about-extra.md not shown on /de/about/",
);
expect(
  !text(conv, "en/about/index.html").includes("about-extra"),
  "convention",
  "English About got an extra",
);

// 4. release refusals
const cases = [
  [
    "release-missing",
    ["--release", "--private", ".cache/does-not-exist.yaml"],
    "private data file not found",
  ],
  ["release-incomplete", ["--release", "--private", INCOMPLETE], "- contact.email"],
  ["release-bad", ["--release", "--private", BAD], "contact: Unrecognized key"],
  ["release-bad-email", ["--release", "--private", BAD], "legal.controller.email"],
  ["release-test-values", ["--release", "--private", EXAMPLE], "contains test values"],
  [
    "release-fixtures",
    ["--release", "--fixtures", "--private", EXAMPLE],
    "a release never contains fixtures",
  ],
  ["release-build-date", ["--release", "--build-date", "2030-01-01", "--private", EXAMPLE], "real date"],
  ["release-env-date", ["--release", "--private", EXAMPLE], "real date", { BUILD_DATE: "2030-01-01" }],
  [
    "release-env-fixtures",
    ["--release", "--private", EXAMPLE],
    "never contains fixtures",
    { CONTENT_FIXTURES: "1" },
  ],
  ["public-bad-date", ["--build-date", "2030-02-30"], "not a valid day"],
];
for (const [name, args, needle, env] of cases) {
  const b = build(name, args, env);
  expect(b.code !== 0, name, "release build succeeded but must fail");
  expect(b.log.includes(needle), name, `message lacks "${needle}":\n${b.log.slice(-400)}`);
  expect(!existsSync(b.out), name, "output directory written despite the refusal");
}

// 5. release with --allow-test-values (deploy/build-release.sh --test-only)
const t = build("release-test-only", ["--release", "--allow-test-values", "--private", EXAMPLE]);
expect(t.code === 0, "release-test-only", `failed:\n${t.log.slice(-600)}`);
expect(
  /test value\(s\) in the output/.test(t.log),
  "release-test-only",
  "no warning about test values in the output",
);
expect(!/contains "TODO\("/.test(t.log), "release-test-only", "output contains a visible TODO( marker");

// 6. CONTENT_FIXTURES in the environment alone loads nothing (only --fixtures does).
const leak = build("public-env-fixtures", [], { CONTENT_FIXTURES: "1" });
expect(leak.code === 0, "public-env-fixtures", `build failed:\n${leak.log.slice(-600)}`);
expect(
  !existsSync(file(leak, "de/blog/beispiel-rsa-mathe")),
  "public-env-fixtures",
  "fixture page built without --fixtures",
);

r.done(
  `${n} builds: public without/with private data, incomplete imprint, about-extra by convention, ${cases.length} refusals (release + test switches), test-only release, fixture env without flag`,
);
