// Umami click-event attributes. Umami records a click when the element has
// data-umami-event="Name", plus optional data-umami-event-* properties.
// This taxonomy is the default for Team Happy Astro sites; keep it in the README
// so new CTAs and new sites use the same names.
export const UMAMI_EVENT = {
  bookNow: 'Book now',
  call: 'Call',
  email: 'Email',
  text: 'Text',
  signup: 'Signup',
  formSubmit: 'Form submit',
  directions: 'Directions',
  social: 'Social',
  chatOpen: 'Chat open',
};

/** Book-a-demo links (TidyCal). */
export const BOOKING_HREF_RE = /tidycal\.com/i;
export const SIGNUP_HREF_RE = /(?:^|https?:\/\/[^/]+)?\/signup\/?$/i;
export const MAP_HREF_RE = /google\.(com|co\.[a-z]+)\/maps|maps\.google\.|maps\.apple\.|goo\.gl\/maps|maps\.app\.goo\.gl/i;

/** Strip markup and quotes so untrusted text is safe in a data attribute. */
export function safeUmamiProp(value, max = 80) {
  const text = String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001F&<>"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, max);
}

/**
 * @param {{ event: string, location?: string, service?: string, platform?: string }} opts
 * @returns {Record<string, string>}
 */
export function umamiEventAttrs(opts) {
  const attrs = { 'data-umami-event': safeUmamiProp(opts.event, 40) };
  const location = safeUmamiProp(opts.location, 60);
  const service = safeUmamiProp(opts.service);
  const platform = safeUmamiProp(opts.platform, 40);
  if (location) attrs['data-umami-event-location'] = location;
  if (service) attrs['data-umami-event-service'] = service;
  if (platform) attrs['data-umami-event-platform'] = platform;
  return attrs;
}

/** @param {string} href */
export function decodeHref(href) {
  return String(href ?? '').replace(/&amp;/g, '&');
}

/** @param {string} href */
export function isBookingHref(href) {
  return BOOKING_HREF_RE.test(decodeHref(href));
}

/** @param {string} href */
export function socialPlatform(href) {
  let host = '';
  try {
    host = new URL(decodeHref(href)).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return undefined;
  }
  if (host.includes('instagram')) return 'instagram';
  if (host.includes('facebook') || host === 'fb.com' || host === 'fb.me') return 'facebook';
  if (host.includes('tiktok')) return 'tiktok';
  if (host.includes('youtube') || host === 'youtu.be') return 'youtube';
  if (host.includes('pinterest')) return 'pinterest';
  if (host === 'x.com' || host.includes('twitter')) return 'x';
  if (host.includes('linkedin')) return 'linkedin';
  if (host.includes('threads')) return 'threads';
  return undefined;
}

/**
 * Infer the Umami event attributes for a href. Used by Button/CTA components and by renderText.
 * @param {string} href
 * @param {{ location?: string, service?: string }} [extras]
 */
export function umamiAttrsForHref(href, extras = {}) {
  const raw = decodeHref(href);
  const { location, service } = extras;
  if (raw.startsWith('tel:')) return umamiEventAttrs({ event: UMAMI_EVENT.call, location });
  if (raw.startsWith('mailto:')) return umamiEventAttrs({ event: UMAMI_EVENT.email, location });
  if (raw.startsWith('sms:')) return umamiEventAttrs({ event: UMAMI_EVENT.text, location });
  if (isBookingHref(raw)) return umamiEventAttrs({ event: UMAMI_EVENT.bookNow, location, service });
  if (SIGNUP_HREF_RE.test(raw)) return umamiEventAttrs({ event: UMAMI_EVENT.signup, location });
  if (MAP_HREF_RE.test(raw)) return umamiEventAttrs({ event: UMAMI_EVENT.directions, location });
  const platform = socialPlatform(raw);
  if (platform) return umamiEventAttrs({ event: UMAMI_EVENT.social, location, platform });
  return {};
}

/** HTML attribute string for renderText (href is already escaped). */
export function umamiAttrString(href, extras = {}) {
  const attrs = umamiAttrsForHref(href, extras);
  return Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"`)
    .join('');
}

/**
 * Find booking <a> tags in an HTML document that lack data-umami-event="Book now".
 * @param {string} html
 * @returns {string[]}
 */
export function untaggedBookingHrefs(html) {
  const missing = [];
  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = m[0];
    const href = (tag.match(/\shref="([^"]*)"/i) || tag.match(/\shref='([^']*)'/i) || [])[1];
    if (!href) continue;
    const decoded = decodeHref(href);
    if (!isBookingHref(decoded)) continue;
    const event = (tag.match(/\sdata-umami-event="([^"]*)"/i) || [])[1];
    if (event !== UMAMI_EVENT.bookNow) missing.push(decoded);
  }
  return missing;
}
