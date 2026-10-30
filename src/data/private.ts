/**
 * The ONE entry point for private data (e-mail, extra accounts, PGP key,
 * legal contact, imprint, extra About text). Everything that renders such a
 * value imports it from here or from src/data/site.ts, which builds on it.
 *
 * The value is injected at build time by tools/build.mjs from
 * `--private <file>` (schema: src/lib/private-schema.ts). It is `null` in a
 * plain `astro dev` / `astro build` and in the public build without a
 * private file: then every section that needs it is simply left out.
 *
 * Never import this from client-side scripts (src/scripts/): the data would
 * end up in a JS bundle.
 */
import type { PrivateData } from "../lib/private-schema";

declare const __SITE_PRIVATE__: PrivateData | null | undefined;

export const privateData: PrivateData | null =
  typeof __SITE_PRIVATE__ === "undefined" ? null : __SITE_PRIVATE__;
