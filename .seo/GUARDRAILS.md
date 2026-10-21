# /seo guardrails for gohappli.com

Set by the site owner. They override everything in `.claude/skills/seo/` (its SKILL.md opens with the same four rules) and every setting in `config.json`. If a step would break one, the run skips it, says so, and files what a person needs to do in `needs-you.md`.

1. **$0 paid keyword-data budget.** Free sources and Google Search Console only. No DataForSEO, no paid rank trackers, SERP, backlink or keyword APIs, nothing metered. `config.json` has `budget.per_run_usd: 0`.
2. **Proposes, never ships.** A run ends with a diff, or at most a commit on the current branch when it isn't `main` (`git.mode: commit`; the default is `none`). It never pushes, opens or updates a pull request, merges, publishes, deploys, changes DNS or routes, writes to a CMS, submits to IndexNow, Search Console, Bing or directories, or posts to social media. A person reviews the branch and does those.
3. **On demand only.** It runs when a person types `/seo` and at no other time. No cron jobs, scheduled tasks, loops or unattended runs; every run stops at the selection step for a person's choice. The skill's frontmatter sets `disable-model-invocation: true`, so it never starts on its own.
4. **One competitor is banned.** It's the brand matched, case-insensitively, by `my\s*sun\s*less`, and it's identified only by that pattern so `rg -i` for its name stays empty across the repo. It never appears in a comparison or alternatives page, keyword, brief, roadmap row, table cell, alt text, competitor entry or answer-engine prompt. `truth-checks.json` fails any content that matches, and it is kept out of `config.competitors`.

Every competitor claim on a published page carries a source link and the date it was checked.

Check before a branch goes to review:

```sh
python3 .claude/skills/seo/scripts/truth_check.py --root .
```
