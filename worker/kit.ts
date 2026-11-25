// Shared Kit subscribe for the marketing waitlist and the demo-booking cron.
// A key starting with "kit_" is a v4 API key (X-Kit-Api-Key on api.kit.com).
// Anything else is treated as a v3 API key (api_key in the JSON body on api.convertkit.com).

export class KitRequestError extends Error {
  constructor(
    readonly method: string,
    readonly path: string,
    readonly status: number,
  ) {
    super(`${method} ${path} ${status}`);
    this.name = 'KitRequestError';
  }
}

const V3 = 'https://api.convertkit.com/v3';
const V4 = 'https://api.kit.com/v4';

export function isKitV4Key(key: string): boolean {
  return key.startsWith('kit_');
}

/** Adds the tag, creating the subscriber if needed. A known email or an existing tag is success. */
export async function subscribeToTag(
  apiKey: string,
  tagId: string,
  email: string,
  firstName: string,
  timeoutMs: number,
): Promise<void> {
  if (isKitV4Key(apiKey)) return subscribeV4(apiKey, tagId, email, firstName, timeoutMs);
  return subscribeV3(apiKey, tagId, email, firstName, timeoutMs);
}

async function postJson(url: string, path: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers,
    body: JSON.stringify(body),
  });
  // Only the path and status go into the error: Kit's error bodies can echo the email back.
  if (!res.ok) throw new KitRequestError('POST', path, res.status);
}

async function subscribeV3(apiKey: string, tagId: string, email: string, firstName: string, timeoutMs: number): Promise<void> {
  const path = `/tags/${encodeURIComponent(tagId)}/subscribe`;
  await postJson(
    `${V3}${path}`,
    path,
    { 'Content-Type': 'application/json', Accept: 'application/json' },
    { api_key: apiKey, email, ...(firstName ? { first_name: firstName } : {}) },
    timeoutMs,
  );
}

async function subscribeV4(apiKey: string, tagId: string, email: string, firstName: string, timeoutMs: number): Promise<void> {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Kit-Api-Key': apiKey,
  };
  await postJson(
    `${V4}/subscribers`,
    '/subscribers',
    headers,
    { email_address: email, ...(firstName ? { first_name: firstName } : {}) },
    timeoutMs,
  );
  const path = `/tags/${encodeURIComponent(tagId)}/subscribers`;
  await postJson(`${V4}${path}`, path, headers, { email_address: email }, timeoutMs);
}
