# Tracking: Search Console, Bing and weekly checks

Do these once after the site is live on gohappli.com. Steps marked **Grant** need access to Cloudflare or the Google and Microsoft accounts.

## 1. Google Search Console (Grant)

1. Open [search.google.com/search-console](https://search.google.com/search-console) and click **Add property**.
2. Choose **Domain** (not URL prefix) and enter `gohappli.com`. A domain property covers http, https and subdomains such as `app.` and `support.`.
3. Google shows a TXT record like `google-site-verification=...`. Copy it.
4. In Cloudflare, open the `gohappli.com` zone, then **DNS → Records → Add record**: Type `TXT`, Name `@`, Content = the value, TTL Auto. Save. (Don't touch the other records.)
5. Back in Search Console, click **Verify**. DNS can take a few minutes.
6. Open **Sitemaps** and submit `sitemap-index.xml`. Status should read "Success."
7. Use **URL inspection** on `https://gohappli.com/`, then **Request indexing**. Repeat for `/pricing/`, `/spray-tan-studio-software/` and the four `/compare/` pages.
8. Check **Pages** after a few days for "Crawled, not indexed" or "Duplicate" problems.

## 2. Bing Webmaster Tools (Grant)

1. Open [bing.com/webmasters](https://www.bing.com/webmasters) and sign in.
2. Choose **Import from Google Search Console**. Authorize it, and select `gohappli.com`. Sitemaps carry over.
3. Check **Sitemaps** lists `sitemap-index.xml`.
4. Bing powers some AI assistants' web search, so this matters for AI answers too.

## 3. IndexNow (optional)

IndexNow tells Bing and some other engines the moment a page changes.

1. Generate a key (a random string of 8 to 128 characters) and save it as a text file at `public/<key>.txt` containing only the key.
2. After each deploy, send changed URLs: `curl "https://api.indexnow.org/indexnow?url=https://gohappli.com/pricing/&key=<key>"`.
3. Skip if it feels like overhead. Google doesn't use IndexNow.

## 4. Baseline (week 0)

In Search Console, export Performance for the last 28 days (queries, pages, countries, devices). Save as `seo/tracking/baseline-YYYY-MM-DD.csv`. The site is new, so expect near zero. This is the starting line.

## 5. Weekly check (15 minutes)

Pick a fixed day. Use a private window, US location, signed out.

**Rankings for 20 core terms.** Take the 20 highest-priority terms from `seo/keyword-map.csv`. Suggested list:

1. spray tan booking software
2. best spray tan booking software
3. spray tan scheduling software
4. spray tan studio software
5. software for spray tan business
6. mobile spray tan booking software
7. mangomint alternative
8. glossgenius alternative
9. vagaro alternative
10. mangomint vs glossgenius
11. spray tan cancellation policy template
12. how to reduce spray tan no-shows
13. spray tan appointment reminder text
14. booking software with deposits and no-show fees
15. beauty studio booking software
16. online booking for beauty studio
17. spray tan software pricing
18. booking software for estheticians
19. square appointments alternative
20. spray tan prep instructions

For each, record in `seo/tracking/rankings.csv` (`date,keyword,google_position,bing_position,url`): the position of gohappli.com (or "none"), and which URL ranks. Use Search Console's Performance tab for average position (it lags 2 to 3 days) rather than relying only on manual checks.

**AI answer checks.** For the same 20 terms, ask ChatGPT (search on), Perplexity, Google (AI Overview or AI Mode) and Claude (web search on). Record in `seo/tracking/ai-answers.csv` (`date,engine,query,mentioned,cited_url,competitors_named,notes`):

- Is Happli mentioned? Is gohappli.com cited as a source?
- Which competitors are named, and which sources are cited?
- Is anything about Happli wrong? If so, note the fix (usually a page that needs a clearer fact).

**Also look at:** Search Console → Pages (new indexing errors), Performance (queries gaining impressions), and Links.

## 6. Monthly

- Review the top 10 queries by impressions; give any query with impressions but low clicks a better title or a section.
- Re-check competitor pricing (compare pages carry "Last checked" dates); update `updatedDate`.
- Re-read `robots.md` vendor lists.
- Check Core Web Vitals in Search Console.
