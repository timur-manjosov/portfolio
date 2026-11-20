/**
 * Open Graph images per page (brief R6 §2.5 A, DECISIONS R6-D10). Pages
 * whose path matches get their own 1200×630 image at `/og/<path>.png`; it
 * is rendered after `astro build` by tools/og-images.mjs from the page's own
 * meta tags (title, language, type, date). Every other page keeps the site
 * image.
 */
export const DEFAULT_OG_IMAGE = "/images/og-default.png";

const OWN_IMAGE = [
  /^\/(de|en)\/$/, // home
  /^\/(de|en)\/(blog|projects)\/$/, // the two main listings
  /^\/(de|en)\/(about|now|uses|contact|links)\/$/, // main pages
  /^\/(de|en)\/blog\/(?!archive\/|tags\/|category\/|series\/)[^/]+\/$/, // posts
  /^\/(de|en)\/projects\/[^/]+\/$/, // projects
];

/** Path of the page's Open Graph image (its own one, or the site image). */
export function ogImageFor(pathname: string, noindex = false): string {
  if (noindex || !OWN_IMAGE.some((re) => re.test(pathname))) return DEFAULT_OG_IMAGE;
  return `/og${pathname.replace(/\/$/, "")}.png`;
}
