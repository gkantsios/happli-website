# Template: how-to article

Use for `src/content/blog/<slug>.md` (informational posts like "How to reduce spray tan no-shows").

```yaml
---
title: 'How to <do the thing> (<year>)'   # up to 70 characters
description: '<Answer in one sentence, then what the post covers>'   # up to 170
pubDate: YYYY-MM-DD
updatedDate: YYYY-MM-DD
author: 'Grant Kantsios'
tags: ['no-shows', 'deposits']
heroImage: './images/<file>.jpg'
heroImageAlt: '<describe the image>'
draft: true      # false when approved
---
```

## Structure

1. **Answer first.** The first paragraph answers the title question in 40 to 80 words.
2. **Steps as H2s.** Each starts with the instruction as a sentence, then why it works, then an example.
3. **Copy-paste blocks** where useful (policy text, message text) in blockquotes or code blocks.
4. **Common mistakes** (3 to 5 bullets).
5. **How Happli helps** (short, factual, one paragraph, tied to a real feature). Not the main point.
6. **FAQs** (3 to 5).
7. **Sources.** Link anything factual.

## Checks

- Keyword in title, first paragraph and one H2. No stuffing.
- One internal link up (a feature or the niche page) and two across (related posts).
- Visible dates. Real author byline.
- Companion video or short script if you make one (see `aeo.md`).
- Set `sections.blog` to `true` in `src/config/site.ts` for the first published post, and add Blog to the nav if wanted.
