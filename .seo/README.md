# .seo/

The SEO workspace: working notes for search and AI-answer visibility, plus the state of the `/seo` skill (`.claude/skills/seo/`). Nothing here is served by the site. Read `GUARDRAILS.md` first.

| File | What it is |
|---|---|
| `GUARDRAILS.md` | The rules every `/seo` run follows: $0 paid data, proposes changes on a branch only, runs on demand only, the banned competitor |
| `config.json` | The skill's settings for gohappli.com (stack, competitors, priority pages, guardrails) |
| `truth-checks.json` | Claims checked by `scripts/truth_check.py`, including the banned-competitor rule |
| `truth.md`, `attributes.md`, `content-ledger.md`, `link-inventory.md`, `radar.md`, `needs-you.md` | Skill state, filled in by the first `/seo` run's foundation step |
| `runs/` | One record per run |
| `keyword-map.csv` | Target keywords, intent, target URL, priority and status. Volume and difficulty are `TODO` until filled from free sources and Search Console |
| `briefs/` | Article briefs: best spray tan booking software, Mangomint vs GlossGenius vs Happli, spray tan cancellation policy template |
| `templates/` | Starting points for compare pages, feature pages, how-to articles and free tool pages |
| `tracking/README.md` | Search Console, Bing Webmaster Tools and IndexNow setup (done by a person), plus the weekly ranking and AI-answer check |
| `aeo.md` | Tactics for being cited by AI answers |
| `robots.md` | Which crawlers are allowed or blocked in `public/robots.txt`, and why |

Content itself lives in `src/content/` (blog, compare, guides, for, alternatives). See the root `README.md` for how to add a post.
