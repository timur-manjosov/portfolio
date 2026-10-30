// The /now page shows its `updated` date. A change to the page that keeps the
// old date is almost always forgotten: `npm run publish` warns about it
// (brief R5 §2.5). Pure function, tested in tools/check-publish.mjs.

const updatedOf = (text) => String(text.match(/^updated:\s*(.+)$/m)?.[1] ?? "").trim();

/** A warning if `after` differs from `before` but keeps its `updated` value, else null. */
export function nowUpdateWarning(file, before, after) {
  if (before === after) return null;
  const date = updatedOf(after);
  if (updatedOf(before) !== date) return null;
  return `${file} changed since the live release, but \`updated\` is still ${date || "missing"}`;
}
