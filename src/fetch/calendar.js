// Fetching for Calendar: the week and month windows and what fills them. Split out of fetch/arr.js.

class _FetchCalendarMethods {

async _fetchCalendar() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
    const [sonarrRaw, radarrRaw, sonarr2Raw, radarr2Raw, lidarrRaw] = await Promise.all([
      this._callApi('GET', `arr_stack/sonarr/calendar?start=${today}&end=${end}`).catch(() => []),
      this._callApi('GET', `arr_stack/radarr/calendar?start=${today}&end=${end}`).catch(() => []),
      this._sonarr2Configured !== false
        ? this._callApi('GET', `arr_stack/sonarr2/calendar?start=${today}&end=${end}`).catch(() => [])
        : Promise.resolve([]),
      this._radarr2Configured !== false
        ? this._callApi('GET', `arr_stack/radarr2/calendar?start=${today}&end=${end}`).catch(() => [])
        : Promise.resolve([]),
      this._lidarrConfigured !== false
        ? this._callApi('GET', `arr_stack/lidarr/calendar?start=${today}&end=${end}`).catch(() => [])
        : Promise.resolve([]),
    ]);

    // TV: group episodes by series+date, deduplicated cross-instance
    const tvDedup = new Set();
    const tvGrouped = new Map();
    for (const ep of [...(sonarrRaw || []), ...(sonarr2Raw || [])]) {
      const dedupKey = `${ep.series?.tvdbId || ep.seriesId}-s${ep.seasonNumber}-e${ep.episodeNumber}`;
      if (tvDedup.has(dedupKey)) continue;
      tvDedup.add(dedupKey);
      const groupKey = `${ep.series?.tvdbId || ep.seriesId}-${ep.airDate}`;
      if (!tvGrouped.has(groupKey)) tvGrouped.set(groupKey, []);
      tvGrouped.get(groupKey).push(ep);
    }
    const tvEps = [];
    for (const eps of tvGrouped.values()) {
      eps.sort((a, b) => (a.seasonNumber - b.seasonNumber) || (a.episodeNumber - b.episodeNumber));
      const first = eps[0];
      if (eps.length > 1) {
        const last = eps[eps.length - 1];
        first._epRangeEnd = { seasonNumber: last.seasonNumber, episodeNumber: last.episodeNumber };
      }
      tvEps.push(first);
    }

    // Movies: one per tmdbId, normalised shape. Instances hold their own
    // metadata, so the same film can carry a digital release date in one and
    // nothing in the other — take whichever copy actually has the date rather
    // than whichever came back first.
    const movieSeen = new Map();
    const cutoff = Date.now() - 86400000;
    for (const m of [...(radarrRaw || []), ...(radarr2Raw || [])]) {
      const key = m.tmdbId || m.id;
      if (!m.digitalRelease) continue;
      if (new Date(m.digitalRelease).getTime() < cutoff) continue;
      if (movieSeen.has(key)) continue;
      movieSeen.set(key, { ...m, _mediaType: 'movie', airDate: m.digitalRelease.split('T')[0], series: m });
    }

    this._calendar = [...tvEps, ...Array.from(movieSeen.values()), ...this._calMusicItems(lidarrRaw)]
      .sort((a, b) => new Date(a.airDate) - new Date(b.airDate))
      .slice(0, 32);
  } catch (e) {
    console.error('[arr-card] Calendar fetch error:', e);
  }
}

_calMusicItems(raw) {
  const seen = new Set();
  return (Array.isArray(raw) ? raw : [])
    .filter(a => {
      if (!a?.releaseDate || seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    })
    .map(a => ({
      ...a,
      _mediaType: 'music',
      airDate: String(a.releaseDate).split('T')[0],
      series: a.artist || {},
    }));
}

_calWeekRange(offset) {
  const now = new Date();
  const daysSinceMon = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
  const mon = new Date(now);
  mon.setDate(now.getDate() - daysSinceMon + offset * 7);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon, end: sun };
}

// Grid start/end for the month view — always whole weeks, Monday-first, so the
// fetched range matches exactly what the grid draws.
_calMonthRange(offset) {
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + (offset || 0));
  base.setHours(0, 0, 0, 0);
  const lead = (base.getDay() + 6) % 7;
  const start = new Date(base);
  start.setDate(1 - lead);
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  const end = new Date(start);
  end.setDate(start.getDate() + weeks * 7 - 1);
  end.setHours(23, 59, 59, 999);
  return { start, end, month: base.getMonth(), weeks, base };
}

// Fetches whatever window the modal is currently showing
_fetchCalendarWindow() {
  const { start, end } = this._calendarView === 'month'
    ? this._calMonthRange(this._calendarMonthOffset || 0)
    : this._calWeekRange(this._calendarWeekOffset || 0);
  return this._fetchCalendarRange(start, end);
}

async _fetchCalendarWeek(weekOffset) {
  const { start, end } = this._calWeekRange(weekOffset);
  return this._fetchCalendarRange(start, end);
}

async _fetchCalendarRange(start, end) {
  this._calendarModalLoading = true;
  this._renderCalendarModalEl();
  const startStr = start.toISOString().split('T')[0];
  const endStr   = end.toISOString().split('T')[0];
  try {
    const [sonarrRaw, radarrRaw, sonarr2Raw, radarr2Raw, lidarrRaw] = await Promise.all([
      this._callApi('GET', `arr_stack/sonarr/calendar?start=${startStr}&end=${endStr}`).catch(() => []),
      this._callApi('GET', `arr_stack/radarr/calendar?start=${startStr}&end=${endStr}`).catch(() => []),
      this._sonarr2Configured !== false
        ? this._callApi('GET', `arr_stack/sonarr2/calendar?start=${startStr}&end=${endStr}`).catch(() => [])
        : Promise.resolve([]),
      this._radarr2Configured !== false
        ? this._callApi('GET', `arr_stack/radarr2/calendar?start=${startStr}&end=${endStr}`).catch(() => [])
        : Promise.resolve([]),
      this._lidarrConfigured !== false
        ? this._callApi('GET', `arr_stack/lidarr/calendar?start=${startStr}&end=${endStr}`).catch(() => [])
        : Promise.resolve([]),
    ]);

    // Sonarr episodes — deduplicate across instances by tvdbId+season+episode
    const seen = new Set();
    const tvDeduped = [...(sonarrRaw || []), ...(sonarr2Raw || [])].filter(ep => {
      const tvdbId = ep.series?.tvdbId || ep.tvdbId || ep.seriesId;
      const key = `${tvdbId}-${ep.seasonNumber}-${ep.episodeNumber}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // A batch drop puts ten episodes of one show on one day; ten identical
    // posters say nothing that "S05E01-E10" on a single poster does not. Same
    // grouping the category's poster row already does in _fetchCalendarWindow.
    const tvGrouped = new Map();
    for (const ep of tvDeduped) {
      const tvdbId = ep.series?.tvdbId || ep.tvdbId || ep.seriesId;
      const day = (ep.airDate || '').split('T')[0];
      const key = `${tvdbId}-${day}`;
      if (!tvGrouped.has(key)) tvGrouped.set(key, []);
      tvGrouped.get(key).push(ep);
    }
    const tvItems = [];
    for (const eps of tvGrouped.values()) {
      eps.sort((a, b) => (a.seasonNumber - b.seasonNumber) || (a.episodeNumber - b.episodeNumber));
      const first = eps[0];
      if (eps.length > 1) {
        const last = eps[eps.length - 1];
        first._epRangeEnd = { seasonNumber: last.seasonNumber, episodeNumber: last.episodeNumber };
        first._epCount = eps.length;
      }
      tvItems.push(first);
    }

    // Radarr movies — deduplicate across instances by tmdbId
    const seenM = new Set();
    const movieItems = [...(radarrRaw || []), ...(radarr2Raw || [])].filter(m => {
      const key = m.tmdbId || m.id;
      if (seenM.has(key)) return false;
      seenM.add(key);
      return true;
    }).map(m => {
      const releaseDate = this._pickReleaseDate(m);
      return {
        ...m,
        _mediaType: 'movie',
        airDate: releaseDate ? releaseDate.split('T')[0] : null,
        series: m,
      };
    }).filter(m => m.airDate);

    this._calendarModalData = [...tvItems, ...movieItems, ...this._calMusicItems(lidarrRaw)];
  } catch (e) {
    console.error('[arr-card] Calendar week fetch error:', e);
    this._calendarModalData = [];
  }
  this._calendarModalLoading = false;
  this._renderCalendarModalEl();
}

}

export const fetchCalendarMixin = _FetchCalendarMethods.prototype;
