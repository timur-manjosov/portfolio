/**
 * Public GitHub facts for projects with `repo: owner/name` (brief R5 §2.6),
 * fetched at BUILD time only, never by a visitor's browser (the CSP keeps
 * `connect-src 'self'`).
 *
 * Off by default: only GITHUB_META=1 turns it on (`npm run publish` sets it
 * for the release build via `deploy/build-release.sh --github-meta`), so
 * tests, CI and normal builds stay deterministic and offline.
 *
 * Unauthenticated REST API (no token): GET /repos/{repo} and
 * /repos/{repo}/languages. Results go to `.cache/github-meta.json`
 * (git-ignored), valid for 24 hours (GITHUB_META_TTL_HOURS). On an error, a
 * rate limit or no network the last cached value is used, else the field is
 * left out. A private or unknown repository is ignored silently. Nothing
 * here can fail a build.
 *
 * What is shown, only where the project layout already has a field, and
 * only when the frontmatter leaves it empty (hand-written values win):
 * - `stack` (chips): the repository's languages by size, at most four;
 * - `links.repo` ("Source code"): https://github.com/<repo> (no request
 *   needed).
 * Last push and stars are cached too but not shown: the layout has no field
 * for them, and `updated` stays the hand-maintained date of the page.
 *
 * Plain TypeScript without Astro imports, so tools/check-github-meta.mjs can
 * test it with a mocked fetch.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface RepoMeta {
  pushedAt: string;
  stars: number;
  languages: string[];
}

type CacheEntry = ({ status: "ok" } & RepoMeta) | { status: "missing" };
interface CacheFile {
  version: 1;
  repos: Record<string, CacheEntry & { fetchedAt: number }>;
}

export interface GithubMetaOptions {
  enabled: boolean;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  now: () => number;
  cacheFile: string;
  ttlMs: number;
  apiBase: string;
  log: (message: string) => void;
}

const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;

function readCache(file: string): CacheFile {
  try {
    const data = JSON.parse(readFileSync(file, "utf8")) as CacheFile;
    if (data?.version === 1 && data.repos && typeof data.repos === "object") return data;
  } catch {
    // missing or unreadable: start empty
  }
  return { version: 1, repos: {} };
}

/** A lookup function `(repo) => facts | null` with the given dependencies. */
export function createGithubMeta(opts: GithubMetaOptions) {
  const inFlight = new Map<string, Promise<RepoMeta | null>>();

  const store = (repo: string, entry: CacheEntry) => {
    try {
      const cache = readCache(opts.cacheFile);
      cache.repos[repo] = { ...entry, fetchedAt: opts.now() };
      mkdirSync(dirname(opts.cacheFile), { recursive: true });
      writeFileSync(opts.cacheFile, `${JSON.stringify(cache, null, 2)}\n`);
    } catch (e) {
      opts.log(`github-meta: cache not written (${(e as Error).message})`);
    }
  };

  const get = async (url: string) =>
    opts.fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "timurmanjosov.com-build",
      },
      signal: AbortSignal.timeout(8000),
    });

  async function lookup(repo: string): Promise<RepoMeta | null> {
    const cached = readCache(opts.cacheFile).repos[repo];
    const stale = cached?.status === "ok" ? cached : null;
    const fallback = (why: string) => {
      opts.log(`github-meta: ${repo}: ${why}; ${stale ? "using the cached value" : "field left out"}`);
      return stale ? { pushedAt: stale.pushedAt, stars: stale.stars, languages: stale.languages } : null;
    };
    if (cached && opts.now() - cached.fetchedAt < opts.ttlMs) {
      return cached.status === "ok"
        ? { pushedAt: cached.pushedAt, stars: cached.stars, languages: cached.languages }
        : null;
    }
    try {
      const res = await get(`${opts.apiBase}/repos/${repo}`);
      if (res.status === 404) {
        // Unknown or private (the API answers 404 to anonymous requests).
        store(repo, { status: "missing" });
        return null;
      }
      if (!res.ok) {
        const limited =
          res.status === 429 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0");
        return fallback(limited ? "rate limit reached" : `HTTP ${res.status}`);
      }
      const info = (await res.json()) as {
        private?: boolean;
        pushed_at?: string;
        stargazers_count?: number;
        language?: string | null;
      };
      if (info.private) {
        store(repo, { status: "missing" });
        return null;
      }
      let languages = info.language ? [info.language] : [];
      const langRes = await get(`${opts.apiBase}/repos/${repo}/languages`);
      if (langRes.ok) {
        const bytes = (await langRes.json()) as Record<string, number>;
        languages = Object.entries(bytes)
          .sort((a, b) => b[1] - a[1])
          .map(([name]) => name);
      }
      const meta: RepoMeta = {
        pushedAt: String(info.pushed_at ?? ""),
        stars: Number(info.stargazers_count ?? 0),
        languages: languages.slice(0, 4),
      };
      store(repo, { status: "ok", ...meta });
      return meta;
    } catch (e) {
      return fallback(`request failed (${(e as Error).message})`);
    }
  }

  return function githubMeta(repo: string | undefined): Promise<RepoMeta | null> {
    if (!opts.enabled || !repo || !REPO.test(repo)) return Promise.resolve(null);
    let p = inFlight.get(repo);
    if (!p) {
      p = lookup(repo);
      inFlight.set(repo, p);
    }
    return p;
  };
}

/**
 * Tests may point the API at a local mock server and the cache at another
 * file below .cache/; nothing else is accepted, and a release build refuses
 * both variables (tools/build.mjs).
 */
function apiBase(value: string | undefined): string {
  return value && /^http:\/\/127\.0\.0\.1:\d+$/.test(value) ? value : "https://api.github.com";
}
function cacheFile(value: string | undefined): string {
  return value && /^\.cache\/[A-Za-z0-9._/-]+\.json$/.test(value) && !value.includes("..")
    ? value
    : ".cache/github-meta.json";
}

export const githubMeta = createGithubMeta({
  enabled: process.env.GITHUB_META === "1",
  fetch: (url, init) => fetch(url, init),
  now: () => Date.now(),
  cacheFile: cacheFile(process.env.GITHUB_META_CACHE),
  ttlMs: (Number(process.env.GITHUB_META_TTL_HOURS) || 24) * 3_600_000,
  apiBase: apiBase(process.env.GITHUB_API_BASE),
  log: (message) => console.warn(message),
});

/** Hand-written values first, GitHub second (see above). */
export function withGithubFacts<
  D extends { repo?: string | undefined; stack: string[]; links: { repo?: string | undefined } },
>(data: D, meta: RepoMeta | null): D {
  if (!data.repo) return data;
  return {
    ...data,
    stack: data.stack.length ? data.stack : (meta?.languages ?? []),
    links: { ...data.links, repo: data.links.repo ?? `https://github.com/${data.repo}` },
  };
}
