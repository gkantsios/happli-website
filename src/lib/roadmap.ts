// Reads src/data/roadmap-copy.md, Grant's final roadmap copy, into the shape /roadmap/ renders. The file is
// the only source for the page's words: edit it, never the page. worker/test/roadmap-copy.test.ts checks the
// built page against it.
//
//   A line before any heading                   the intro line above the board
//   ## In progress                              a column (In progress, Planned)
//   - **Title**: one short line                 a card
//   ## Shipped
//   ### Booking                                 a Shipped area
//   - What shipped — Sep 2026                   a shipped item and when it shipped

export type Note = { title: string; line: string };
export type Column = { id: string; label: string; notes: Note[] };
export type ShippedNote = { text: string; when: string };
export type Area = { id: string; label: string; notes: ShippedNote[] };

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function parseRoadmap(md: string): { intro: string; columns: Column[]; shipped: Area[] } {
  let intro = '';
  const columns: Column[] = [];
  const shipped: Area[] = [];
  let inShipped = false;
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^## (.+)$/))) {
      inShipped = m[1] === 'Shipped';
      if (!inShipped) columns.push({ id: slug(m[1]), label: m[1], notes: [] });
    } else if ((m = line.match(/^### (.+)$/))) {
      if (!inShipped) throw new Error(`roadmap: area "${m[1]}" outside Shipped`);
      shipped.push({ id: slug(m[1]), label: m[1], notes: [] });
    } else if (inShipped && (m = line.match(/^- (.+) — (.+)$/))) {
      const area = shipped.at(-1);
      if (!area) throw new Error(`roadmap: shipped note before any area: ${line}`);
      area.notes.push({ text: m[1], when: m[2] });
    } else if (!inShipped && (m = line.match(/^- \*\*(.+?)\*\*: (.+)$/))) {
      const column = columns.at(-1);
      if (!column) throw new Error(`roadmap: card before any column: ${line}`);
      column.notes.push({ title: m[1], line: m[2] });
    } else if (!columns.length && !inShipped && !intro && !line.startsWith('-') && !line.startsWith('#')) {
      intro = line;
    } else {
      throw new Error(`roadmap: can't read this line: ${line}`);
    }
  }
  return { intro, columns, shipped };
}

const months: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

/** A machine-readable date for a single month ("Sep 2026" is 2026-09). A range like "Aug–Oct 2026" has none. */
export function isoMonth(when: string): string | undefined {
  const m = when.match(/^([A-Z][a-z]{2}) (\d{4})$/);
  return m && months[m[1]] ? `${m[2]}-${months[m[1]]}` : undefined;
}
