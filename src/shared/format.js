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
