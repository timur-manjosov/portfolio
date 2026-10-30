// Loads and validates the private data file (private/site.private.yaml or
// whatever `--private <file>` names). Shared by tools/build.mjs (injects the
// data into the build), tools/check-private.mjs (leak check) and
// tools/release-config.mjs (deployment settings for deploy/*.sh).
//
// Errors are thrown as PrivateDataError with one line per problem, naming
// the field path, so a typo in the YAML points at itself.
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { parse } from "yaml";
import { privateFileSchema } from "../src/lib/private-schema.ts";

export const DEFAULT_PRIVATE_FILE = "private/site.private.yaml";

/** Conventional location of the extra About text, relative to the private file. */
export const ABOUT_EXTRA_FILE = (lang) => `content/${lang}/about-extra.md`;

export class PrivateDataError extends Error {}

/** Values that mark a test or example file; a release build refuses them. */
export const TEST_MARKERS = ["example.invalid", "TODO("];

export function loadPrivateFile(file) {
  const path = resolve(file);
  if (!existsSync(path)) throw new PrivateDataError(`private data file not found: ${file}`);
  let raw;
  try {
    raw = parse(readFileSync(path, "utf8")) ?? {};
  } catch (error) {
    throw new PrivateDataError(`${file}: not valid YAML: ${error.message.split("\n")[0]}`);
  }
  const result = privateFileSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new PrivateDataError(
      `${file} does not match the schema (src/lib/private-schema.ts):\n${lines.join("\n")}`,
    );
  }
  const parsed = result.data;
  const base = dirname(path);
  const readInside = (rel, field) => {
    const target = resolve(base, rel);
    if (relative(base, target).startsWith("..")) throw new PrivateDataError(`${field}: path leaves ${base}`);
    if (!existsSync(target))
      throw new PrivateDataError(`${field}: file not found: ${rel} (relative to ${file})`);
    return readFileSync(target, "utf8");
  };

  // Extra About text: the path from `about_extra.<lang>` if set, otherwise
  // the conventional file content/<lang>/about-extra.md next to the private
  // file, if it exists. So dropping that file into private/content/<lang>/
  // is enough; no YAML entry needed.
  const aboutExtraFor = (lang) => {
    const set = parsed.about_extra?.[lang];
    if (set) return readInside(set, `about_extra.${lang}`);
    const conventional = resolve(base, ABOUT_EXTRA_FILE(lang));
    return existsSync(conventional) ? readFileSync(conventional, "utf8") : null;
  };

  const pgp = parsed.contact.pgp;
  const keyArmored = pgp?.key_file ? readInside(pgp.key_file, "contact.pgp.key_file") : null;
  if (keyArmored && !keyArmored.includes("-----BEGIN PGP PUBLIC KEY BLOCK-----")) {
    throw new PrivateDataError("contact.pgp.key_file: not an armored public key (gpg --armor --export …)");
  }
  if (keyArmored?.includes("PRIVATE KEY")) {
    throw new PrivateDataError("contact.pgp.key_file: contains a PRIVATE key. Export the public key only.");
  }

  const imp = parsed.legal.imprint;
  const imprintComplete = Boolean(imp?.name && imp.address && imp.email);

  /** @type {import("../src/lib/private-schema.ts").PrivateData} */
  const data = {
    contact: {
      email: parsed.contact.email ?? null,
      pgp: pgp ? { fingerprint: pgp.fingerprint, keyArmored } : null,
    },
    accounts: parsed.accounts,
    legal: {
      controller: parsed.legal.controller ?? null,
      imprint: imprintComplete
        ? { name: imp.name, address: imp.address, email: imp.email, phone: imp.phone ?? null }
        : null,
    },
    aboutExtra: { de: aboutExtraFor("de"), en: aboutExtraFor("en") },
  };
  const warnings = [];
  if (imp && !imprintComplete) {
    warnings.push("legal.imprint is incomplete (needs name, address, email): no imprint page is generated");
  }
  return { file, parsed, data, warnings };
}

/**
 * The values of the file that must never appear in the repository (leak
 * check), each with the field it came from. Deliberately not included:
 * names and platform labels ("Timur Manjosov", "Mastodon"), which are public
 * anyway and would only produce false alarms.
 */
export function secretValues(loaded) {
  const { parsed, data } = loaded;
  const out = [];
  const add = (field, value) => {
    if (typeof value !== "string") return;
    const v = value.trim();
    if (isSearchable(v)) out.push({ field, value: v });
  };
  add("contact.email", parsed.contact.email);
  if (data.contact.pgp) {
    const fp = data.contact.pgp.fingerprint;
    add("contact.pgp.fingerprint", fp);
    // Fingerprints are usually written in groups of four.
    add("contact.pgp.fingerprint", fp.match(/.{4}/g).join(" "));
    // The base64 lines of the key itself.
    for (const line of data.contact.pgp.keyArmored?.split("\n") ?? []) {
      if (/^[A-Za-z0-9+/=]{40,}$/.test(line.trim())) add("contact.pgp.key_file", line);
    }
  }
  parsed.accounts.forEach((a, i) => {
    add(`accounts[${i}].url`, a.url);
    add(`accounts[${i}].handle`, a.handle);
  });
  add("legal.controller.email", parsed.legal.controller?.email);
  const imp = parsed.legal.imprint;
  imp?.address?.forEach((line, i) => {
    add(`legal.imprint.address[${i}]`, line);
  });
  add("legal.imprint.email", imp?.email);
  add("legal.imprint.phone", imp?.phone);
  // Phone numbers also leak with different spacing.
  if (imp?.phone) add("legal.imprint.phone", imp.phone.replace(/[\s()/-]/g, ""));
  for (const lang of ["de", "en"]) {
    // Long lines of a private text are distinctive; short ones ("## Hobbys") are not.
    for (const line of data.aboutExtra[lang]?.split("\n") ?? []) {
      if (line.trim().length >= 40) add(`about_extra.${lang}`, line);
    }
  }
  return out;
}

/**
 * Too generic to search for without false alarms: short values and single
 * words without digit, @, dot or slash (e.g. an address line "Deutschland").
 */
export function isSearchable(value) {
  if (value.length < 6) return false;
  return /[\d@./\s]/.test(value);
}
