// ZIP or city + state → the Snapshot's region keys (city, metro, state), from the table bundled in
// worker/snapshot-zips.ts. No outside lookup: the raw ZIP never leaves the Worker and is never stored.
import { CITIES, METROS, ZIPS } from './snapshot-zips';
import { states } from '../src/config/snapshot';

export type Region = {
  /** e.g. "ok:tulsa". Normalized, so "Tulsa" and "tulsa" share a bucket. */
  cityKey: string;
  city: string;
  /** CBSA code of the metropolitan area, or null when the city isn't in one. */
  metroKey: string | null;
  metro: string | null;
  state: string;
  stateName: string;
};

const stateNames = new Map(states);

export function isState(code: string): boolean {
  return stateNames.has(code);
}

/** Lowercase, no accents or punctuation, and the usual abbreviations spelled out ("St. Louis" → "saint-louis"). */
export function normalizeCity(name: string): string {
  const words = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const long: Record<string, string> = { st: 'saint', ste: 'sainte', ft: 'fort', mt: 'mount' };
  return words.map((w) => long[w] ?? w).join('-');
}

let cityRows: string[][] | null = null;
let cityIndex: Map<string, number> | null = null;
let metroNames: Map<string, string> | null = null;

function load() {
  if (cityRows) return;
  cityRows = CITIES.split(';').map((row) => row.split('|'));
  cityIndex = new Map(cityRows.map(([st, name], i) => [`${st.toLowerCase()}:${normalizeCity(name)}`, i]));
  metroNames = new Map(METROS.split(';').map((row) => row.split('|') as [string, string]));
}

function region(i: number): Region {
  const [state, city, metro] = cityRows![i];
  return {
    cityKey: `${state.toLowerCase()}:${normalizeCity(city)}`,
    city,
    metroKey: metro || null,
    metro: metro ? metroNames!.get(metro) ?? null : null,
    state,
    stateName: stateNames.get(state)!,
  };
}

/** A 5-digit ZIP (ZIP+4 is fine) → its region, or null if it isn't in the table. */
export function regionForZip(zip: string): Region | null {
  const z = zip.trim().match(/^(\d{5})(?:-\d{4})?$/)?.[1];
  if (!z) return null;
  load();
  let lo = 0;
  let hi = ZIPS.length / 8 - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const at = ZIPS.slice(mid * 8, mid * 8 + 5);
    if (at === z) return region(parseInt(ZIPS.slice(mid * 8 + 5, mid * 8 + 8), 36));
    if (at < z) lo = mid + 1;
    else hi = mid - 1;
  }
  return null;
}

/** A city name and a state code → its region, or null if that city isn't in the table for that state. */
export function regionForCity(city: string, state: string): Region | null {
  const st = state.trim().toUpperCase();
  if (!isState(st) || !city.trim() || city.length > 80) return null;
  load();
  const i = cityIndex!.get(`${st.toLowerCase()}:${normalizeCity(city)}`);
  return i === undefined ? null : region(i);
}
