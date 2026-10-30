/**
 * /lang-redirect.js: the browser-side fallback of the language door on "/".
 *
 * In production Caddy answers "/" with a 302 before any HTML is sent
 * (deploy/site-config.json → languageDoor). This script only runs where that
 * rule is missing (astro dev/preview, a misconfigured server): it applies the
 * same rule to navigator.languages and replaces the address, so there is no
 * language selection page and no extra history entry. External file, not
 * inline, because of the CSP. Generated from the same config as the Caddy
 * rule, so the two cannot drift apart.
 */
import config from "../../deploy/site-config.json";

const door = config.languageDoor;

export function GET() {
  const js = `// Generated from deploy/site-config.json (languageDoor). See src/pages/lang-redirect.js.ts.
(function () {
  var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
  var target = new RegExp(${JSON.stringify(door.acceptLanguage)}, "i").test(String(langs[0] || "")) ? ${JSON.stringify(door.match)} : ${JSON.stringify(door.default)};
  location.replace(target + location.search + location.hash);
})();
`;
  return new Response(js, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
}
