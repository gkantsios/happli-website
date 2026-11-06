// Reads src/data/roadmap-copy.md, Grant's final roadmap copy, into the shape /roadmap/ renders. The file is
// the only source for the page's words: edit it, never the page. worker/test/roadmap-copy.test.ts checks the
// built page against it.
//
//   A line before any heading                   the intro line above the board
//   ## Planned                                  a column (Planned, In progress), in the copy's order
//   - **Title**: one short line                 a card
//   ## Completed
//   ### Booking                                 a Completed area
//   - What's done                               a Completed item (no dates)

export type Note = { title: string; line: string };
export type Column = { id: string; label: string; notes: Note[] };
export type CompletedNote = { text: string };
export type Area = { id: string; label: string; notes: CompletedNote[] };

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function parseRoadmap(md: string): { intro: string; columns: Column[]; completed: Area[] } {
  let intro = '';
  const columns: Column[] = [];
  const completed: Area[] = [];
  let inCompleted = false;
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^## (.+)$/))) {
      inCompleted = m[1] === 'Completed';
      if (!inCompleted) columns.push({ id: slug(m[1]), label: m[1], notes: [] });
    } else if ((m = line.match(/^### (.+)$/))) {
      if (!inCompleted) throw new Error(`roadmap: area "${m[1]}" outside Completed`);
      completed.push({ id: slug(m[1]), label: m[1], notes: [] });
    } else if (inCompleted && (m = line.match(/^- (.+)$/))) {
      const area = completed.at(-1);
      if (!area) throw new Error(`roadmap: Completed item before any area: ${line}`);
      area.notes.push({ text: m[1] });
    } else if (!inCompleted && (m = line.match(/^- \*\*(.+?)\*\*: (.+)$/))) {
      const column = columns.at(-1);
      if (!column) throw new Error(`roadmap: card before any column: ${line}`);
      column.notes.push({ title: m[1], line: m[2] });
    } else if (!columns.length && !inCompleted && !intro && !line.startsWith('-') && !line.startsWith('#')) {
      intro = line;
    } else {
      throw new Error(`roadmap: can't read this line: ${line}`);
    }
  }
  return { intro, columns, completed };
}
