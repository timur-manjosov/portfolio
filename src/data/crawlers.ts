/**
 * robots.txt, in one place (brief R6 §2.5 B). Two groups of named crawlers,
 * each with ONE switch:
 *
 *   allow: true    the group may fetch everything (default: Timur wants to be found)
 *   allow: false   the group gets "Disallow: /"
 *
 * To keep the site out of AI training, set `training.allow` to `false` and
 * rebuild. robots.txt is a request, not an enforcement: well-behaved crawlers
 * follow it, nothing stops one that does not. Fetchers acting on a user's
 * request (ChatGPT-User, Claude-User, Perplexity-User) may not apply it at
 * all, per their providers. Everyone not named falls under `User-agent: *`
 * (everything allowed).
 *
 * Every token and purpose is taken from the provider's own documentation,
 * read on 2026-11-17 (sources in docs/SEO.md). Re-check them there before
 * adding a name; never from memory.
 */
export interface CrawlerGroup {
  /** Shown as a comment in robots.txt. */
  label: string;
  allow: boolean;
  agents: { token: string; operator: string; purpose: string }[];
}

export const crawlers: { search: CrawlerGroup; training: CrawlerGroup } = {
  search: {
    label: "Search and answers: search engines and AI search/assistants that show and link pages",
    allow: true,
    agents: [
      { token: "Googlebot", operator: "Google", purpose: "Google Search" },
      { token: "Bingbot", operator: "Microsoft", purpose: "Bing search" },
      { token: "OAI-SearchBot", operator: "OpenAI", purpose: "ChatGPT search results" },
      { token: "ChatGPT-User", operator: "OpenAI", purpose: "fetches a page when a ChatGPT user asks" },
      { token: "Claude-SearchBot", operator: "Anthropic", purpose: "Claude search results" },
      { token: "Claude-User", operator: "Anthropic", purpose: "fetches a page when a Claude user asks" },
      { token: "PerplexityBot", operator: "Perplexity", purpose: "Perplexity search results" },
      {
        token: "Perplexity-User",
        operator: "Perplexity",
        purpose: "fetches a page when a Perplexity user asks",
      },
      { token: "Applebot", operator: "Apple", purpose: "Siri and Spotlight search" },
    ],
  },
  training: {
    label: "Training: crawlers or control tokens for training AI models",
    allow: true,
    agents: [
      { token: "GPTBot", operator: "OpenAI", purpose: "training OpenAI's foundation models" },
      { token: "ClaudeBot", operator: "Anthropic", purpose: "training Anthropic's models" },
      {
        token: "Google-Extended",
        operator: "Google",
        purpose: "control token: Gemini training and grounding; no effect on Google Search",
      },
      {
        token: "Applebot-Extended",
        operator: "Apple",
        purpose: "control token: training Apple's generative models; does not crawl itself",
      },
      { token: "CCBot", operator: "Common Crawl", purpose: "open web archive, widely used as training data" },
    ],
  },
};
