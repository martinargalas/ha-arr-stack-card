// ──────────────────────────────────────────────────────────────────────────
// Shared formatters — pure functions, no card state
// ──────────────────────────────────────────────────────────────────────────

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * A size in bytes, counted in powers of 1024 — the way Radarr, Sonarr,
 * qBittorrent, SABnzbd and Plex count it, so the card shows the number those
 * apps show. The card used to mix that with powers of 1000, and one file read
 * 4.0 GB in one place and 3.7 GB in another.
 * @param {number} bytes
 * @param {{dec?: number, empty?: string}} [opts] - decimals from GB up; what
 *   to show for nothing (zero, missing, not a number)
 */
export function fmtBytes(bytes, { dec = 1, empty = '—' } = {}) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return empty;
  let i = 0, v = n;
  while (v >= 1024 && i < UNITS.length - 1) { v /= 1024; i++; }
  return `${i >= 3 ? v.toFixed(dec) : Math.round(v)} ${UNITS[i]}`;
}

/**
 * A name as it compares. Players, Lidarr and MusicBrainz do not agree on
 * punctuation: a player writes JAY‑Z with a non-breaking hyphen where the
 * library has JAY-Z, and an artist window opened on one name would not follow
 * a track written the other. Case, accents, every kind of dash, quote and
 * space are flattened, and what is left is compared.
 * @param {string} name
 */
export function normName(name) {
  return String(name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019\u02bc\u0060\u00b4]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
