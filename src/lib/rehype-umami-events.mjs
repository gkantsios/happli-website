// Sätteri HAST plugin: adds data-umami-event attributes to links in Markdown and MDX
// (blog, compare, guides). Wired as markdown.processor: satteri({ hastPlugins }).
// Markdown [text](url) links arrive as <a> elements. Raw HTML <a> in a .md file
// arrives as a hast `raw` node, so both are handled here.
import { umamiAttrString, umamiAttrsForHref } from './umami-events.mjs';

function hrefOf(node) {
  const href = node.properties?.href;
  if (typeof href === 'string') return href;
  if (Array.isArray(href)) return href.map(String).join('');
  return '';
}

function tagRawAnchors(html) {
  return html.replace(/<a\b([^>]*?)>/gi, (full, inside) => {
    if (/\sdata-umami-event=/.test(full)) return full;
    const href = (inside.match(/\shref="([^"]*)"/i) || inside.match(/\shref='([^']*)'/i) || [])[1];
    if (!href) return full;
    const extra = umamiAttrString(href, { location: 'article' });
    if (!extra) return full;
    return `<a${inside}${extra}>`;
  });
}

export const umamiEventsHastPlugin = {
  name: 'umami-events',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = hrefOf(node);
      if (!href || node.properties?.['data-umami-event']) return;
      const attrs = umamiAttrsForHref(href, { location: 'article' });
      if (!attrs['data-umami-event']) return;
      for (const [key, value] of Object.entries(attrs)) {
        ctx.setProperty(node, key, value);
      }
    },
  },
  raw(node, ctx) {
    const value = node.value;
    if (typeof value !== 'string') return;
    const next = tagRawAnchors(value);
    if (next !== value) ctx.replaceNode(node, { type: 'raw', value: next });
  },
};
