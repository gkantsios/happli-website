// The plan card's button (OnePlan) must go to the book-a-demo link, never to /signup/ or a Stripe URL.
// Run with `npm test`. The test builds the site into a temporary folder and reads the HTML a visitor gets.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { site } from '../../src/config/site.ts';

const root = new URL('../../', import.meta.url).pathname;
const pages: Record<string, string> = {};
let allHtml = '';

const htmlFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });

before(() => {
  const out = mkdtempSync(join(tmpdir(), 'happli-plan-button-'));
  try {
    execFileSync(join(root, 'node_modules/.bin/astro'), ['build', '--outDir', out], { cwd: root, stdio: 'pipe' });
    for (const page of ['pricing', 'signup']) pages[page] = readFileSync(join(out, page, 'index.html'), 'utf8');
    allHtml = htmlFiles(out)
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

// The button inside the plan card (<article class="plan">).
const planButton = (html: string) => {
  const start = html.indexOf('<article class="plan"');
  assert.ok(start >= 0, 'the plan card is missing');
  const card = html.slice(start, html.indexOf('</article>', start));
  const button = card.match(/<a\b[^>]*class="btn btn-coral"[^>]*>/);
  assert.ok(button, 'the plan card has no button');
  return button[0];
};

for (const page of ['pricing', 'signup']) {
  test(`/${page}/ plan button goes to the book-a-demo link in a new tab`, () => {
    const a = planButton(pages[page]);
    const href = a.match(/href="([^"]*)"/)?.[1];
    assert.equal(href, site.cta.href);
    assert.notEqual(href, '/signup/');
    assert.doesNotMatch(href ?? '', /stripe\.com|buy\.stripe/);
    assert.match(a, /target="_blank"/);
    assert.match(a, /rel="noopener"/);
  });
}

test('the plan button reads "Book a demo" on /pricing/ and "Book a call to get started" on /signup/', () => {
  const text = (html: string) => {
    const start = html.indexOf(planButton(html), html.indexOf('<article class="plan"'));
    return html.slice(start, html.indexOf('</a>', start)).replace(/<[^>]*>/g, '').trim();
  };
  assert.equal(text(pages.pricing), 'Book a demo');
  assert.equal(text(pages.signup), 'Book a call to get started');
});

test('no Stripe checkout or Payment Link URLs anywhere on the built site', () => {
  assert.doesNotMatch(allHtml, /buy\.stripe|checkout\.stripe/);
});
