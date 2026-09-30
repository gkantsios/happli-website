// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gohappli.com',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
    // Small site CSS: inline it so nothing blocks the first render.
    inlineStylesheets: 'always',
  },
  integrations: [
    mdx(),
    sitemap({
      // Drafts are never built, so they never reach the sitemap. The 404 page is excluded too.
      filter: (page) => !page.includes('/404'),
    }),
  ],
});
