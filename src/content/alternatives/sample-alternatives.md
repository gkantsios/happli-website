---
title: 'Sample: [COMPETITOR] alternatives for spray tan studios'
description: 'A sample alternatives page that shows the /alternatives/ layout and frontmatter. It is a draft and is never published.'
pubDate: 2026-10-21
author: 'Happli team'
competitor: '[COMPETITOR]'
tags: ['sample']
draft: true
todo: ['Source and date every claim about the competitor before publishing.']
---

This is a **sample draft** for an "alternatives" page at `/alternatives/<slug>/`, for people searching "[competitor] alternatives". Head-to-head "Happli vs X" pages stay at `/compare/`. It is excluded from the build and the sitemap because `draft: true` is set.

Every statement about a competitor needs a source link and the date it was checked, like the compare pages. The banned competitor in `.seo/GUARDRAILS.md` is never named, compared against or listed. Switch on `sections.alternatives` in `src/config/site.ts` before the first page goes live.
