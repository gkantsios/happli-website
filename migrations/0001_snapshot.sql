-- Beauty Business Snapshot (/snapshot/, worker/snapshot.ts). Two tables that cannot be joined:
-- nothing on one row points at, or can be matched with, a row in the other.
--
-- * No shared id, foreign key, email hash or timestamp between them. Each id is its own random UUID.
-- * WITHOUT ROWID: rows are kept in random-id order, so there's no insertion order (rowid) that
--   could line an answer up with the contact saved in the same request.
-- * No IP, user agent, ZIP, street, business name or free text on either table.

-- Answers: ranges and region keys only, no personal data. No timestamp at all.
CREATE TABLE snapshot_answers (
  id TEXT PRIMARY KEY,          -- random UUID, unrelated to anything else
  city_key TEXT NOT NULL,       -- normalized "st:city", e.g. "ok:tulsa" (from the ZIP or the city list)
  metro_key TEXT,               -- Census CBSA code of the metro area, NULL when there isn't one
  state TEXT NOT NULL,          -- two-letter state code
  services TEXT NOT NULL,       -- tags between commas, e.g. ",lashes,spray_tan,"
  team TEXT NOT NULL,
  revenue TEXT NOT NULL,
  revenue_trend TEXT NOT NULL,
  bookings_trend TEXT NOT NULL,
  rebook TEXT NOT NULL,
  ticket TEXT NOT NULL,
  prices TEXT NOT NULL,
  lead_time TEXT NOT NULL
) WITHOUT ROWID;

-- Contacts: who to send the results or annual report to. One row per email.
CREATE TABLE snapshot_contacts (
  id TEXT PRIMARY KEY,          -- its own random UUID, never stored anywhere else
  email TEXT NOT NULL,
  first_name TEXT,
  email_hash TEXT NOT NULL UNIQUE, -- HMAC-SHA256 of the email (SNAPSHOT_HASH_SECRET): one submission per email
  period TEXT NOT NULL          -- coarse month, "YYYY-MM", never an exact time
) WITHOUT ROWID;
