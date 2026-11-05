# robots.txt policy

The live file is `public/robots.txt`. This page explains each choice. Last reviewed Oct 15, 2026.

**The rule:** let search engines and AI *answer* crawlers read the site, so Happli can be found and cited. Block crawlers that exist to collect training data. The file also carries `Content-Signal: search=yes, ai-input=yes, ai-train=no` for any crawler that reads content signals.

## Allowed (search and answer crawlers)

| User agent | Operator | Why it is allowed |
|---|---|---|
| Googlebot | Google | Google Search, including AI Overviews and AI Mode. Never block it. |
| Bingbot | Microsoft | Bing Search, which also feeds other assistants. |
| OAI-SearchBot | OpenAI | Finds pages for ChatGPT search results. Needed to be cited there. |
| ChatGPT-User | OpenAI | Fetches a page when a ChatGPT user asks for it. Not training. |
| PerplexityBot | Perplexity | Perplexity search index. Perplexity says it is not used for model training. |
| Perplexity-User | Perplexity | Fetches a page when a user asks. Not training. |
| Claude-SearchBot | Anthropic | Search index for Claude's web answers. |
| Claude-User | Anthropic | Fetches a page when a Claude user asks. |
| Applebot | Apple | Siri, Spotlight and Safari suggestions. Apple's training opt-out is the separate Applebot-Extended token. |

Note: user-triggered fetchers (ChatGPT-User, Perplexity-User, Claude-User) may not follow robots.txt at all. They are listed so the intent is on record.

## Blocked (training-only)

| User agent | Operator | Why it is blocked |
|---|---|---|
| GPTBot | OpenAI | Collects content that may train OpenAI models. Separate from OAI-SearchBot, so blocking it does not hurt ChatGPT search citations. |
| Google-Extended | Google | A token, not a crawler. Controls use for Gemini training and grounding. Does not affect Google Search or AI Overviews. |
| CCBot | Common Crawl | Builds the open dataset widely used to train models. |
| ClaudeBot | Anthropic | Anthropic's training crawler. Separate from Claude-SearchBot and Claude-User. |
| anthropic-ai | Anthropic | Older Anthropic training token. Kept for completeness. |
| Applebot-Extended | Apple | Opt-out token for Apple's model training. Does not affect Siri or Spotlight (Applebot). |
| Bytespider | ByteDance | Training crawler. Known for ignoring robots.txt, so also consider a Cloudflare WAF rule. |
| meta-externalagent | Meta | Meta's crawler for training its AI models. |
| cohere-training-data-crawler | Cohere | Training-data crawler. |

## Judgment call: Amazonbot (left allowed)

Amazonbot is not on the blocked list. Amazon describes it as a general crawler that helps improve its services (including answers on Alexa), not a training-only bot, so blocking it could cost answer visibility. If Amazon's documentation changes, revisit this. **TODO for Grant:** re-read Amazon's Amazonbot page before launch and decide.

## Everything else

`User-agent: *` allows all, with `Content-Signal: search=yes, ai-input=yes, ai-train=no`. The sitemap line points to `https://gohappli.com/sitemap-index.xml`, which `@astrojs/sitemap` writes on each build.

## Things to check after launch

- **Cloudflare managed robots.txt.** The old site served Cloudflare's managed content-signals block. If "Manage your robots.txt" (AI Crawl Control) is still on for the zone, Cloudflare may prepend or overwrite this file. Open `https://gohappli.com/robots.txt` after the cutover and confirm it matches `public/robots.txt`. Grant does this in the Cloudflare dashboard.
- **WAF and bot rules.** Make sure no rule blocks OAI-SearchBot, PerplexityBot, Claude-SearchBot or Bingbot.
- **Disallow is a request, not a lock.** Well-behaved crawlers follow it. For the rest, use a Cloudflare rule.
- Vendor crawler lists change. Re-check them every quarter (Google, OpenAI, Anthropic, Perplexity, Apple, Amazon, Meta documentation).
