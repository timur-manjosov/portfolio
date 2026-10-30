import { LANGS, type Lang, type UiKey, ui } from "./ui";

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as string[]).includes(value);
}

export function useTranslations(lang: Lang) {
  return (key: UiKey): string => ui[lang][key];
}

export function otherLang(lang: Lang): Lang {
  return lang === "de" ? "en" : "de";
}

/** Locale-aware path: localePath("de", "blog/") → "/de/blog/". */
export function localePath(lang: Lang, path = ""): string {
  const clean = path.replace(/^\/+/, "");
  return `/${lang}/${clean}`;
}

const dateFormats: Record<Lang, Intl.DateTimeFormat> = {
  de: new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "UTC" }),
  en: new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }),
};

export function formatDate(date: Date, lang: Lang): string {
  return dateFormats[lang].format(date);
}

/** YYYY-MM-DD for <time datetime> and machine output. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Open Graph locale codes. */
export const ogLocale: Record<Lang, string> = { de: "de_DE", en: "en_GB" };

/** URL-safe slug for tags and series (keeps umlauts readable as ae/oe/ue). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
