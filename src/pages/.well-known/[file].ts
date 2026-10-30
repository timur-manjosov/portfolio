/**
 * /.well-known/security.txt (RFC 9116). Generated only when the private file
 * sets `contact.email`: a security.txt without a real contact would be worse
 * than none. `Encryption` is added when a PGP key file is configured.
 */
import type { APIRoute, GetStaticPaths } from "astro";
import { person, SITE_URL } from "../../data/site";

export const getStaticPaths: GetStaticPaths = () =>
  person.email ? [{ params: { file: "security.txt" } }] : [];

export const GET: APIRoute = () => {
  // RFC 9116 requires Expires; a year ahead, refreshed by every build.
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  expires.setUTCHours(0, 0, 0, 0);
  const lines = [
    `Contact: mailto:${person.email}`,
    `Expires: ${expires.toISOString()}`,
    ...(person.pgp?.keyUrl ? [`Encryption: ${new URL(person.pgp.keyUrl, SITE_URL).href}`] : []),
    "Preferred-Languages: de, en",
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
  ];
  return new Response(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
