/**
 * Client-side full-text search over /search-index.json (built at build time,
 * same origin, both languages). No third-party service, no WebAssembly, so
 * the strict CSP stays unchanged (see docs/adr/0001-stack.md).
 *
 * Ranking: every query term must match (prefix match on words, accents and
 * case ignored). Title hits weigh most, then description, then body. Results
 * in the page's language come first.
 */
export {};

interface Doc {
  u: string;
  l: string;
  k: string;
  v: string[];
  t: string;
  d: string;
  x: string;
}

interface Prepared extends Doc {
  nt: string;
  nd: string;
  nx: string;
}

const root = document.querySelector<HTMLElement>("[data-search]");
const input = document.querySelector<HTMLInputElement>("[data-search-input]");
const status = document.querySelector<HTMLElement>("[data-search-status]");
const results = document.querySelector<HTMLOListElement>("[data-search-results]");
const noJs = document.querySelector<HTMLElement>("[data-search-nojs]");

const normalize = (s: string): string =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

if (root && input && status && results) {
  const lang = root.dataset.lang ?? "en";
  const msg = (key: string): string => root.dataset[key] ?? "";
  let docs: Prepared[] | null = null;
  let loading: Promise<Prepared[]> | null = null;

  const load = (): Promise<Prepared[]> => {
    loading ??= fetch("/search-index.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Doc[]>;
      })
      .then((list) => {
        docs = list.map((d) => ({ ...d, nt: normalize(d.t), nd: normalize(d.d), nx: normalize(d.x) }));
        return docs;
      });
    return loading;
  };

  const wordMatch = (text: string, term: string): boolean =>
    text.startsWith(term) || text.includes(` ${term}`) || text.includes(`-${term}`);

  const excerpt = (doc: Prepared, terms: string[]): string => {
    // Normalisation keeps string length for Latin text, so indices map back.
    const first = terms.map((t) => doc.nx.indexOf(t)).filter((i) => i >= 0);
    const at = first.length ? Math.min(...first) : 0;
    const start = Math.max(0, at - 60);
    const raw = doc.x.slice(start, start + 200);
    let html = escapeHtml(raw);
    for (const term of terms) {
      const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      html = html.replace(re, "<mark>$1</mark>");
    }
    return (start > 0 ? "… " : "") + html + (start + 200 < doc.x.length ? " …" : "");
  };

  const run = async (query: string): Promise<void> => {
    const terms = normalize(query)
      .split(/\s+/)
      .filter((t) => t.length > 0);
    results.replaceChildren();
    if (query.trim().length < 2) {
      status.textContent = query ? msg("msgHint") : "";
      return;
    }
    if (!docs) status.textContent = msg("msgLoading");
    let list: Prepared[];
    try {
      list = await load();
    } catch {
      status.textContent = msg("msgError");
      return;
    }
    const scored = list
      .filter((doc) => doc.l === lang || !doc.v.includes(lang))
      .map((doc) => {
        let score = 0;
        for (const term of terms) {
          const s =
            (wordMatch(doc.nt, term) ? 10 : 0) +
            (wordMatch(doc.nd, term) ? 4 : 0) +
            (doc.nx.includes(term) ? 1 : 0);
          if (s === 0) return { doc, score: 0 };
          score += s;
        }
        return { doc, score: score + (doc.l === lang ? 0.5 : 0) };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    status.textContent = scored.length ? `${scored.length} ${msg("msgResults")}` : msg("msgNone");
    for (const { doc } of scored) {
      const li = document.createElement("li");
      li.className = "entry";
      if (doc.l !== lang) li.lang = doc.l;
      const h = document.createElement("h2");
      const a = document.createElement("a");
      a.href = doc.u;
      a.textContent = doc.t;
      h.append(a);
      const p = document.createElement("p");
      p.innerHTML = excerpt(doc, terms) || escapeHtml(doc.d);
      li.append(h, p);
      if (doc.l !== lang) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.lang = lang;
        badge.textContent = msg("msgOther");
        li.append(badge);
      }
      results.append(li);
    }
  };

  let timer: number | undefined;
  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    const q = input.value;
    timer = window.setTimeout(() => {
      void run(q);
      const url = new URL(window.location.href);
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      history.replaceState(null, "", url);
    }, 150);
  });
  input.addEventListener("focus", () => void load().catch(() => undefined), { once: true });

  root.hidden = false;
  if (noJs) noJs.hidden = true;
  const initial = new URLSearchParams(window.location.search).get("q");
  if (initial) {
    input.value = initial;
    void run(initial);
  }
}
