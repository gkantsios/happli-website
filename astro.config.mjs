// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { site } from './src/config/site.ts';
import { satteri } from '@astrojs/markdown-satteri';
import { umamiEventsHastPlugin } from './src/lib/rehype-umami-events.mjs';

// Sections that are switched off in src/config/site.ts stay out of the sitemap.
const hiddenPaths = Object.entries(site.sections)
  .filter(([, on]) => !on)
  .map(([name]) => `/${name}/`);

export default defineConfig({
  site: 'https://gohappli.com',
  output: 'static',
  trailingSlash: 'ignore',
  markdown: {
    processor: satteri({
      hastPlugins: [umamiEventsHastPlugin],
    }),
  },
  build: {
    format: 'directory',
    // Small site CSS: inline it so nothing blocks the first render.
    inlineStylesheets: 'always',
  },
  integrations: [
    mdx(),
    sitemap({
      // Drafts are never built, so they never reach the sitemap. The 404 page, the hidden /thanks/
      // video page, the unlaunched /snapshot/ benchmark and switched-off sections are excluded too.
      filter: (page) => !page.includes('/404') && !page.includes('/thanks') && !page.includes('/compare-v2') && !page.includes('/snapshot') && !hiddenPaths.some((path) => new URL(page).pathname.startsWith(path)),
    }),
  ],
});
