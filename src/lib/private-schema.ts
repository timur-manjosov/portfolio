/**
 * Schema of the private data file (`private/site.private.yaml`, never
 * committed; see site.private.example.yaml for every field with comments).
 *
 * Used in two places:
 *   - tools/private-data.mjs validates the YAML before a build and turns it
 *     into a `PrivateData` object (Node imports this file directly, so it may
 *     only use erasable TypeScript syntax and must import nothing but zod),
 *   - src/data/private.ts types the value the build injects.
 *
 * Every field is optional for a `public` build: whatever is missing is left
 * out of the site. A `release` build additionally requires
 * `contact.email` and `legal.controller` (tools/build.mjs).
 */
import { z } from "astro/zod";

const text = z.string().trim().min(1, "must not be empty");
const email = z.email("must be an e-mail address");
const httpsUrl = z.url("must be a URL").refine((u) => u.startsWith("https://"), "must start with https://");
/** Paths are relative to the directory of the YAML file and must stay inside it. */
const relPath = z
  .string()
  .min(1)
  .refine(
    (p) => !p.startsWith("/") && !p.split(/[\\/]/).includes(".."),
    "must be a relative path inside private/",
  );

const fingerprint = z
  .string()
  .transform((v) => v.replace(/\s+/g, "").toUpperCase())
  .refine((v) => /^[0-9A-F]{40}$/.test(v), "must be a 40-digit hex OpenPGP v4 fingerprint (spaces allowed)");

export const privateFileSchema = z
  .object({
    contact: z
      .object({
        /** Public contact address shown on /contact and used in security.txt. */
        email: email.optional(),
        pgp: z
          .object({
            fingerprint,
            /** Armored public key; published as /pgp-key.asc. */
            key_file: relPath.optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .default({}),
    /** Extra public profiles (GitHub is public data and lives in src/data/site.ts). */
    accounts: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9-]+$/, "lowercase letters, digits and dashes only"),
            label: text,
            handle: text,
            url: httpsUrl,
            /** rel="me" + JSON-LD sameAs. Set false for links that are not your own profile. */
            me: z.boolean().default(true),
          })
          .strict(),
      )
      .default([]),
    legal: z
      .object({
        /** Controller in the sense of the GDPR, named in the privacy policy. */
        controller: z.object({ name: text, email }).strict().optional(),
        /**
         * Imprint data. The imprint page and its footer link exist only when
         * name, address and email are all set.
         */
        imprint: z
          .object({
            name: text.optional(),
            /** One entry per line, e.g. street, postcode + town, country. */
            address: z.array(text).min(2, "needs at least two lines").optional(),
            email: email.optional(),
            phone: text.optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .default({}),
    /** Optional Markdown files appended to the About page, per language. */
    about_extra: z.object({ de: relPath.optional(), en: relPath.optional() }).strict().optional(),
    // No server settings here: the web root is read from the live Caddy
    // block at staging time (deploy/apply-on-server.sh), see docs/DEPLOY.md.
  })
  .strict();

export type PrivateFile = z.infer<typeof privateFileSchema>;

/** What the site code receives (file contents already read, imprint completeness decided). */
export interface PrivateData {
  contact: {
    email: string | null;
    pgp: { fingerprint: string; keyArmored: string | null } | null;
  };
  accounts: { id: string; label: string; handle: string; url: string; me: boolean }[];
  legal: {
    controller: { name: string; email: string } | null;
    imprint: { name: string; address: string[]; email: string; phone: string | null } | null;
  };
  aboutExtra: { de: string | null; en: string | null };
}
