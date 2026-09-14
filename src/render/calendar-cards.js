import { POPUP_TYPE } from '../constants.js';

// The calendar's cards: in the right column and in the week and month modal. Split out of render/media-cards.js.

class _CalendarCardsMethods {

// Resolves a calendar entry to its *arr record, so poster lookups and the card
// renderer agree on which series/movie an episode belongs to.
_calItemSeries(ep) {
  // An album's artist comes attached to the record, and the library copy is the
  // one with the statistics on it.
  if (ep._mediaType === 'music') {
    const a = ep.artist || ep.series || {};
    return this._lidarrArtists?.get(a.id) || a;
  }
  const seriesRaw = ep.series || {};
  const isMovie = ep._mediaType === 'movie';
  const _sid = seriesRaw.id || ep.seriesId;
  return isMovie
    ? ((this._radarr || []).find(m => seriesRaw.tmdbId ? m.tmdbId === seriesRaw.tmdbId : m.id === _sid) || (this._radarr2 || []).find(m => seriesRaw.tmdbId ? m.tmdbId === seriesRaw.tmdbId : m.id === _sid) || seriesRaw)
    : ((this._sonarrAll || this._sonarr || []).find(s => seriesRaw.tvdbId ? s.tvdbId === seriesRaw.tvdbId : s.id === _sid) || (this._sonarr2All || this._sonarr2 || []).find(s => seriesRaw.tvdbId ? s.tvdbId === seriesRaw.tvdbId : s.id === _sid) || seriesRaw);
}

_calItemPoster(ep) {
  if (ep._mediaType === 'music') return this._lidarrCover(ep) || this._lidarrArtistImage(ep.artist, 'poster');
  const series = this._calItemSeries(ep);
  return ep._mediaType === 'movie' ? this._getRadarrPoster(series) : this._getSonarrPoster(series);
}

_renderCalendarModalCard(ep) {
  if (ep._mediaType === 'music') return this._renderCalendarMusicCard(ep, { modal: true });
  const pc = this._posterCfg();
  const seriesRaw = ep.series || {};
  const isMovie = ep._mediaType === 'movie';
  const _sid = seriesRaw.id || ep.seriesId;
  const series = isMovie
    ? ((this._radarr || []).find(m => seriesRaw.tmdbId ? m.tmdbId === seriesRaw.tmdbId : m.id === _sid) || (this._radarr2 || []).find(m => seriesRaw.tmdbId ? m.tmdbId === seriesRaw.tmdbId : m.id === _sid) || seriesRaw)
    : ((this._sonarrAll || this._sonarr || []).find(s => seriesRaw.tvdbId ? s.tvdbId === seriesRaw.tvdbId : s.id === _sid) || (this._sonarr2All || this._sonarr2 || []).find(s => seriesRaw.tvdbId ? s.tvdbId === seriesRaw.tvdbId : s.id === _sid) || seriesRaw);
  const title   = this._escHtml(series.title || ep.seriesTitle || ep.title || 'Unknown');
  const typeTag = isMovie ? this._t('typeMovie') : this._t('typeTv');
  const poster  = isMovie ? this._getRadarrPoster(series) : this._getSonarrPoster(series);
  const popup   = isMovie ? POPUP_TYPE.RADARR : POPUP_TYPE.SONARR;
  const grad    = 'rgba(0,0,0,0.88)';
  const tc      = 'rgba(var(--arr-pt-rgb, 255, 255, 255), 1)';
  const img     = this._mcImg(poster, isMovie ? '🎬' : '📺', series.id || ep.seriesId || ep.id);
  // Several episodes of one series on one day collapse to a single card, so the
  // badge has to carry the range rather than just the first episode.
  let epLabel = '';
  if (!isMovie) {
    const s1 = String(ep.seasonNumber || 0).padStart(2, '0');
    const e1 = String(ep.episodeNumber || 0).padStart(2, '0');
    if (ep._epRangeEnd) {
      const s2 = String(ep._epRangeEnd.seasonNumber || 0).padStart(2, '0');
      const e2 = String(ep._epRangeEnd.episodeNumber || 0).padStart(2, '0');
      epLabel = s1 === s2 ? `S${s1}E${e1}-E${e2}` : `S${s1}E${e1}-S${s2}E${e2}`;
    } else {
      epLabel = `S${s1}E${e1}`;
    }
  }
  const epBadge = epLabel ? `<span class="badge b-ep">${epLabel}</span>` : '';
  let badgeCls = '';
  let badgeHtml = '';
  if (isMovie) {
    const dlActive = this._radarrQueueActive?.has(series.id) || this._radarr2QueueActive?.has(series.id);
    const dlFailed = this._radarrQueueFailed?.has(series.id) || this._radarr2QueueFailed?.has(series.id);
    if (series.hasFile) { badgeCls = 'b-st-avail'; badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable')); }
    else if (dlFailed)  { badgeCls = 'b-missing'; badgeHtml = this._badge('b-missing', '✗', this._t('badgeFailed')); }
    else if (dlActive)  { badgeCls = 'b-dl'; badgeHtml = this._badge('b-dl', '↓', this._t('badgeDownloading')); }
    else                { badgeCls = 'b-missing'; badgeHtml = this._badge('b-missing', '✗', this._t('badgeMissing')); }
  } else {
    const fc = series.statistics?.episodeFileCount || 0;
    const tc2 = series.statistics?.episodeCount || 0;
    if (fc === 0 && tc2 > 0)  { badgeCls = 'b-missing'; badgeHtml = this._badge('b-missing', '✗', this._t('badgeMissing')); }
    else if (fc < tc2)        { badgeCls = 'b-partial'; badgeHtml = `<span class="badge b-partial">${fc}/<span class="b-txt">${tc2}</span></span>`; }
    else if (fc > 0 && series.status === 'continuing') { badgeCls = 'b-continuing'; badgeHtml = this._badge('b-continuing', '▶', this._t('badgeAvailable')); }
    else if (fc > 0)          { badgeCls = 'b-st-avail'; badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable')); }
  }
  const showTag = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
  const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
  const statusBadge = (badgeHtml && showTag) ? this._statusBadge(badgeHtml) : '';
  const _fcS = series.statistics?.episodeFileCount || 0;
  const _tcS = series.statistics?.episodeCount || 0;
  const _ppS = !isMovie && badgeCls === 'b-partial' && _tcS > 0 ? Math.round((_fcS / _tcS) * 100) : -1;
  const _spS = badgeCls === 'b-dl' ? this._dlPct(series.id, isMovie ? 'movie' : 'tv') : _ppS;
  const stripe = (badgeCls && showStripe) ? this._statusStripe(this._statusStripeColor(badgeCls), badgeCls === 'b-dl', _spS) : '';
  return `
    <div class="mc" data-popup="${popup}" data-tvdbid="${series.tvdbId || ''}" data-tmdbid="${series.tmdbId || ''}" data-title="${title}">
      ${this._goneBadge(series.tmdbId || null, series.tvdbId || null, isMovie)}
      ${img}
      <div style="position:absolute;top:6px;left:6px;z-index:2;display:flex;flex-direction:column;gap:3px;align-items:flex-start">
        ${pc.mediaType ? `<span class="media-type-tag" style="position:static">${typeTag}</span>` : ''}
        ${epBadge}
      </div>
      ${statusBadge}
      ${this._mcGrad(grad, `${this._ratingLangBlock({ ...series, _mediaType: isMovie ? 'movie' : 'tv' }, this._arrLangCodes(series, isMovie))}${pc.title ? `<div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>` : ''}`)}
      ${stripe}
    </div>`;
}

_renderCalendarMusicCard(ep, { modal = false } = {}) {
  const pc      = this._posterCfg();
  const artist  = this._calItemSeries(ep);
  const name    = this._escHtml(artist.artistName || ep.artist?.artistName || 'Unknown');
  const album   = this._escHtml(ep.title || '');
  const dateStr = this.fmtDate(ep.airDate);
  const cover   = this._lidarrCover(ep);
  const back    = this._lidarrArtistImage(artist, 'fanart', { w: 360 }) || cover;

  const st    = ep.statistics || {};
  const have  = st.trackFileCount ?? 0;
  const total = st.trackCount ?? 0;
  const dl    = this._lidarrQueue?.has(ep.id);
  let cls = 'b-missing', badgeHtml = this._badge('b-missing', '✗', this._t('badgeMissing'));
  if (dl)                              { cls = 'b-dl';       badgeHtml = this._badge('b-dl', '↓', this._t('badgeDownloading')); }
  else if (total > 0 && have >= total) { cls = 'b-st-avail'; badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable')); }
  else if (have > 0)                   { cls = 'b-partial';  badgeHtml = `<span class="badge b-partial">${have}/<span class="b-txt">${total}</span></span>`; }

  const showTag    = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
  const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
  const pct = (total > 0 && have < total && have > 0) ? Math.round((have / total) * 100) : -1;
  const stripe = showStripe ? this._statusStripe(this._statusStripeColor(cls), cls === 'b-dl', pct) : '';

  const perf = this._cfgGet('styles', 'performanceMode', false);
  const backLayer = (!perf && back)
    ? `<img src="${back}" class="mus-back" loading="lazy" aria-hidden="true" onerror="this.style.display='none'">`
    : '';
  const frontEl = cover
    ? `<img src="${cover}" class="mus-cover" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="mus-cover mus-cover-ph">${this._escHtml(this._musInitials(artist.artistName))}</div>`;
  const grad = 'rgba(0,0,0,0.88)';
  const tc   = 'rgba(var(--arr-pt-rgb, 255, 255, 255), 1)';

  return `
    <div class="mc mc-music${backLayer ? '' : ' mus-flat'}" data-album-cal="${ep.id}" data-title="${name}">
      ${backLayer}
      <div class="mus-scrim"></div>
      ${frontEl}
      <div style="position:absolute;top:6px;left:6px;z-index:2;display:flex;flex-direction:column;gap:3px;align-items:flex-start">
        ${pc.mediaType ? `<span class="media-type-tag" style="position:static">${this._t('typeAlbum')}</span>` : ''}
      </div>
      <div style="position:absolute;top:6px;right:6px;z-index:2;display:flex;flex-direction:column;gap:3px;align-items:flex-end">
        ${dateStr ? `<span class="media-type-tag" style="position:static">${dateStr}</span>` : ''}
        ${showTag ? this._statusBadge(badgeHtml) : ''}
      </div>
      ${this._mcGrad(grad, `${this._flagStrip(
        [], this._musOrigin(artist),
        pc.rating ? this._musRatingBadge(artist, true, true) : '',
        { endIcon: false }
      )}${pc.title ? `<div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>` : ''}
        ${album ? `<div style="font-size:9px;color:rgba(var(--arr-pt-rgb,255,255,255),0.66);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${album}</div>` : ''}`)}
      ${stripe}
    </div>`;
}

_renderCalendarCard(ep) {
  if (ep._mediaType === 'music') return this._renderCalendarMusicCard(ep);
  const isMovie = ep._mediaType === 'movie';
  const seriesRaw = ep.series || {};
  const _sid = seriesRaw.id || ep.seriesId;
  const series = isMovie
    ? ((this._radarr || []).find(m => seriesRaw.tmdbId ? m.tmdbId === seriesRaw.tmdbId : m.id === _sid) || (this._radarr2 || []).find(m => seriesRaw.tmdbId ? m.tmdbId === seriesRaw.tmdbId : m.id === _sid) || seriesRaw)
    : ((this._sonarrAll || this._sonarr || []).find(s => seriesRaw.tvdbId ? s.tvdbId === seriesRaw.tvdbId : s.id === _sid) || (this._sonarr2All || this._sonarr2 || []).find(s => seriesRaw.tvdbId ? s.tvdbId === seriesRaw.tvdbId : s.id === _sid) || seriesRaw);
  const title   = this._escHtml(series.title || ep.seriesTitle || ep.title || 'Unknown');
  const dateStr = this.fmtDate(ep.airDate);
  const typeTag = isMovie ? this._t('typeMovie') : this._t('typeTv');
  const popup   = isMovie ? POPUP_TYPE.RADARR : POPUP_TYPE.SONARR;
  const poster  = isMovie ? this._getRadarrPoster(series) : this._getSonarrPoster(series);
  const img     = this._mcImg(poster, isMovie ? '🎬' : '📺', ep.series?.id || ep.seriesId || ep.id);
  const pc = this._posterCfg();
  let epLabel = '';
  if (!isMovie) {
    const s1 = String(ep.seasonNumber||0).padStart(2,'0');
    const e1 = String(ep.episodeNumber||0).padStart(2,'0');
    if (ep._epRangeEnd) {
      const s2 = String(ep._epRangeEnd.seasonNumber||0).padStart(2,'0');
      const e2 = String(ep._epRangeEnd.episodeNumber||0).padStart(2,'0');
      epLabel = s1 === s2 ? `S${s1}E${e1}-E${e2}` : `S${s1}E${e1}-S${s2}E${e2}`;
    } else {
      epLabel = `S${s1}E${e1}`;
    }
  }
  const epBadge = epLabel ? `<span class="badge b-ep">${epLabel}</span>` : '';
  let badgeCls = '';
  let badgeHtml = '';
  if (isMovie) {
    const dlActive = this._radarrQueueActive?.has(series.id) || this._radarr2QueueActive?.has(series.id);
    const dlFailed = this._radarrQueueFailed?.has(series.id) || this._radarr2QueueFailed?.has(series.id);
    if (series.hasFile) { badgeCls = 'b-st-avail'; badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable')); }
    else if (dlFailed)  { badgeCls = 'b-missing'; badgeHtml = this._badge('b-missing', '✗', this._t('badgeFailed')); }
    else if (dlActive)  { badgeCls = 'b-dl'; badgeHtml = this._badge('b-dl', '↓', this._t('badgeDownloading')); }
    else                { badgeCls = 'b-missing'; badgeHtml = this._badge('b-missing', '✗', this._t('badgeMissing')); }
  } else {
    const fc = series.statistics?.episodeFileCount || 0;
    const tc2 = series.statistics?.episodeCount || 0;
    if (fc === 0 && tc2 > 0)  { badgeCls = 'b-missing'; badgeHtml = this._badge('b-missing', '✗', this._t('badgeMissing')); }
    else if (fc < tc2)        { badgeCls = 'b-partial'; badgeHtml = `<span class="badge b-partial">${fc}/<span class="b-txt">${tc2}</span></span>`; }
    else if (fc > 0 && series.status === 'continuing') { badgeCls = 'b-continuing'; badgeHtml = this._badge('b-continuing', '▶', this._t('badgeAvailable')); }
    else if (fc > 0)          { badgeCls = 'b-st-avail'; badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable')); }
  }
  const showTag = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
  const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
  const statusBadge = (badgeHtml && showTag) ? this._statusBadge(badgeHtml) : '';
  const _fcS = series.statistics?.episodeFileCount || 0;
  const _tcS = series.statistics?.episodeCount || 0;
  const _ppS = !isMovie && badgeCls === 'b-partial' && _tcS > 0 ? Math.round((_fcS / _tcS) * 100) : -1;
  const _spS = badgeCls === 'b-dl' ? this._dlPct(series.id, isMovie ? 'movie' : 'tv') : _ppS;
  const stripe = (badgeCls && showStripe) ? this._statusStripe(this._statusStripeColor(badgeCls), badgeCls === 'b-dl', _spS) : '';
  const grad = 'rgba(0,0,0,0.88)';
  const tc   = 'rgba(var(--arr-pt-rgb, 255, 255, 255), 1)';
  return `
    <div class="mc" data-popup="${popup}" data-tvdbid="${series.tvdbId || ep.series?.tvdbId || ''}" data-tmdbid="${series.tmdbId || ep.series?.tmdbId || ep.tmdbId || ''}" data-title="${title}">
      ${this._goneBadge(series.tmdbId || ep.series?.tmdbId || null, series.tvdbId || ep.series?.tvdbId || null, isMovie)}
      ${img}
      <div style="position:absolute;top:6px;left:6px;z-index:2;display:flex;flex-direction:column;gap:3px;align-items:flex-start">
        ${pc.mediaType ? `<span class="media-type-tag" style="position:static">${typeTag}</span>` : ''}
        ${epBadge}
      </div>
      <div style="position:absolute;top:6px;right:6px;z-index:2;display:flex;flex-direction:column;gap:3px;align-items:flex-end">
        ${dateStr ? `<span class="media-type-tag" style="position:static">${dateStr}</span>` : ''}
        ${statusBadge}
      </div>
      ${this._mcGrad(grad, `${this._ratingLangBlock({ ...series, _mediaType: isMovie ? 'movie' : 'tv' }, this._arrLangCodes(series, isMovie))}${pc.title ? `<div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>` : ''}`)}
      ${stripe}
    </div>`;
}

}

export const calendarCardsMixin = _CalendarCardsMethods.prototype;
