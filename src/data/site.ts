/**
 * Stable facts about the site and its owner. Single source for the About
 * facts block, /links, /contact, JSON-LD (`sameAs` is derived from
 * `accounts`, so it cannot drift from /links), llms.txt and the footer.
 *
 * Public facts live here. Private values (e-mail, PGP key, further accounts,
 * legal contact) come from the private data layer (./private.ts), never
 * from this file: the repository is public.
 *
 * Rule (brief §2): only facts that are verifiable from the repo, GitHub or
 * Timur's own brief. Never add address, phone, birth date, employer, etc.
 */
import { privateData } from "./private";

export const SITE_URL = "https://timurmanjosov.com";

export const person = {
  name: "Timur Manjosov",
  givenName: "Timur",
  familyName: "Manjosov",
  url: SITE_URL,
  /** Source: brief §1. */
  university: {
    name: "FernUniversität in Hagen",
    url: "https://www.fernuni-hagen.de/",
  },
  /**
   * Public contact address from the private file (`contact.email`). When
   * set, /contact renders it (entity-encoded, no JS needed) and
   * security.txt is generated.
   */
  email: privateData?.contact.email ?? null,
  /**
   * OpenPGP key from the private file. With a key file, /pgp-key.asc is
   * generated and /contact links it next to the fingerprint.
   */
  pgp: privateData?.contact.pgp
    ? {
        fingerprint: privateData.contact.pgp.fingerprint,
        keyUrl: privateData.contact.pgp.keyArmored ? "/pgp-key.asc" : null,
      }
    : null,
  /** Languages Timur writes this site in. */
  languages: ["de", "en"] as const,
  /**
   * Programming languages, ordered by how much he uses them (About, "What I
   * work with"). Sources: brief §1 (Java, Python, Kotlin, Go, Rust), the
   * GitHub profile README (Python main language, Rust and C learning) and
   * the repositories (Python, Rust). Used by the facts block and the hero
   * spec sheet; llms.txt spells out the same weighting in words.
   */
  programmingLanguages: ["Python", "Java", "Rust", "C", "Kotlin", "Go"],
  /** Source: brief §1 (subjects) and GitHub repositories (languages). */
  knowsAbout: [
    "Mathematics",
    "Cryptography",
    "Computer science",
    "Python",
    "Java",
    "Rust",
    "C",
    "Kotlin",
    "Go",
    "Linux",
  ],
};

export interface Account {
  id: string;
  label: string;
  handle: string;
  url: string;
  /** Rendered with rel="me" and included in JSON-LD sameAs. */
  me: boolean;
}

/**
 * GitHub is verified public data (GitHub API: login timur-manjosov, the
 * profile's website field points to timurmanjosov.com), so it lives here
 * and is always shown.
 */
export const github: Account = {
  id: "github",
  label: "GitHub",
  handle: "timur-manjosov",
  url: "https://github.com/timur-manjosov",
  me: true,
};

/**
 * All profiles: GitHub plus the accounts from the private file (an entry
 * with id `github` there is ignored, GitHub is defined above).
 */
export const accounts: Account[] = [
  github,
  ...(privateData?.accounts ?? []).filter((a) => a.id !== github.id),
];

/** Separate web interface of the Aura project (brief §1). */
export const auraUrl = "https://aura.timurmanjosov.com/";

export const sameAs = accounts.filter((a) => a.me).map((a) => a.url);

/** Legal data from the private file; each part is `null` when absent. */
export const legal = {
  controller: privateData?.legal.controller ?? null,
  imprint: privateData?.legal.imprint ?? null,
};

/** Extra Markdown appended to the About page, per language (private file). */
export const aboutExtra = privateData?.aboutExtra ?? { de: null, en: null };

/** Armored public key for /pgp-key.asc, if the private file names one. */
export const pgpKeyArmored = privateData?.contact.pgp?.keyArmored ?? null;
