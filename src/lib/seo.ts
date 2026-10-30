import { person, SITE_URL, sameAs } from "../data/site";
import type { Lang } from "../i18n/ui";
import { ui } from "../i18n/ui";

export type JsonLdNode = Record<string, unknown>;

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function absolute(path: string): string {
  return new URL(path, SITE_URL).href;
}

/** Global graph nodes, present on every page. `sameAs` comes from the same data as /links. */
export function globalGraph(lang: Lang): JsonLdNode[] {
  return [
    {
      "@type": "Person",
      "@id": PERSON_ID,
      name: person.name,
      givenName: person.givenName,
      familyName: person.familyName,
      url: absolute(`/${lang}/`),
      description: ui[lang]["site.description"],
      affiliation: {
        "@type": "CollegeOrUniversity",
        name: person.university.name,
        url: person.university.url,
      },
      knowsAbout: person.knowsAbout,
      knowsLanguage: [...person.languages],
      sameAs,
      // No `email` here on purpose: plain text in JSON-LD on every page would
      // defeat the entity-encoded address on /contact (docs/DECISIONS.md).
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: SITE_URL,
      name: person.name,
      inLanguage: ["de", "en"],
      author: { "@id": PERSON_ID },
      publisher: { "@id": PERSON_ID },
    },
  ];
}

/** Serialise for a <script type="application/ld+json"> data block (not executed, CSP-neutral). */
export function serializeJsonLd(nodes: JsonLdNode[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}
