// The plan card's button (OnePlan) must go to the book-a-demo link, never to /signup/ or a Stripe URL.
// The site-wide checks at the end back the launch PR's Security gate: every "Book a demo" link goes to
// TidyCal, outside links carry rel="noopener", forms post only to this site, and scripts load only from
// this site or Cloudflare Turnstile.
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
const built: { file: string; html: string }[] = [];

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
    execFileSync(process.execPath, [join(root, 'scripts/external-links.mjs'), out], { cwd: root, stdio: 'pipe' });
    for (const page of ['pricing', 'signup']) pages[page] = readFileSync(join(out, page, 'index.html'), 'utf8');
    for (const f of htmlFiles(out)) built.push({ file: f.slice(out.length), html: readFileSync(f, 'utf8') });
    allHtml = built.map((b) => b.html).join('\n');
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

// Every <a> on every built page: its opening tag, href and visible text.
const links = () =>
  built.flatMap(({ file, html }) =>
    [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
      file,
      tag: m[1],
      href: m[1].match(/\bhref="([^"]*)"/)?.[1] ?? '',
      text: m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    })),
  );

test('the demo link is the Happli Demo booking page on TidyCal', () => {
  assert.equal(site.cta.href, 'https://tidycal.com/gkantsios/happli-demo');
});

test('every "Book a demo" and "Book a call" link on the built site goes to the demo link', () => {
  const ctas = links().filter((l) => /book a (demo|call)/i.test(l.text));
  assert.ok(ctas.length > 20, `only ${ctas.length} demo links found`);
  for (const l of ctas) assert.equal(l.href, site.cta.href, `${l.file}: "${l.text}" goes to ${l.href}`);
});

test('every link to another site has rel="noopener"', () => {
  const outside = links().filter((l) => /^https?:\/\//.test(l.href) && !/^https?:\/\/(www\.)?gohappli\.com(\/|$)/.test(l.href));
  assert.ok(outside.length > 0);
  for (const l of outside) assert.match(l.tag, /\brel="[^"]*\bnoopener\b[^"]*"/, `${l.file}: ${l.href}`);
});

test('forms post only to this site', () => {
  const forms = built.flatMap(({ file, html }) => [...html.matchAll(/<form\b[^>]*>/g)].map((m) => ({ file, tag: m[0] })));
  for (const f of forms) {
    const action = f.tag.match(/\baction="([^"]*)"/)?.[1] ?? '';
    assert.match(action, /^\/(?!\/)/, `${f.file}: ${f.tag}`);
  }
});

test('scripts load only from this site or Cloudflare Turnstile', () => {
  for (const { file, html } of built) {
    for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]*)"/g)) {
      assert.match(m[1], /^(\/(?!\/)|https:\/\/challenges\.cloudflare\.com\/)/, `${file}: ${m[1]}`);
    }
  }
});
