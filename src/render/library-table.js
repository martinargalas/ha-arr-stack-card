import { fmtBytes } from '../shared/format.js';

// Library, the table view: films and series, music, status cells. Split out of render/library.js.

class _LibraryTableMethods {

  // Library's status classes predate the shared badge palette — map them over.
  _libBadgeTone(cls) {
    return {
      'b-st-avail':   'green',
      'b-ok':         'green',
      'b-cutoff':     'amber',
      'b-partial':    'amber',
      'b-missing':    'red',
      'b-dl':         'blue',
      'b-continuing': 'blue',
    }[cls] || 'neutral';
  }

  // ─── Table: status badge for a single item ────────────────────────────────
  _libTableStatus(item) {
    const isMovie = item._libType === 'movie';
    if (isMovie) {
      const dlFailed = this._radarrQueueFailed?.has(item.id);
      const dlActive = this._radarrQueueActive?.has(item.id);
      const qName = item.movieFile?.quality?.quality?.name || '';
      if (item.hasFile && item.movieFile?.qualityCutoffNotMet) return { cls: 'b-cutoff', label: qName || this._t('libUpgrade') };
      if (item.hasFile)  return { cls: 'b-st-avail', label: qName || this._t('badgeAvailable') };
      if (dlFailed)      return { cls: 'b-missing', label: this._t('badgeFailed') };
      if (dlActive)      return { cls: 'b-dl', label: this._t('badgeDownloading') };
      return { cls: 'b-missing', label: this._t('badgeMissing') };
    }
    if (item._libType === 'music') {
      const have  = item.statistics?.trackFileCount ?? 0;
      const total = item.statistics?.trackCount ?? 0;
      if (total === 0)     return { cls: '', label: '' };
      if (have === 0)      return { cls: 'b-missing', label: this._t('badgeMissing') };
      if (have < total)    return { cls: 'b-partial', label: `${have} / ${total}` };
      return { cls: 'b-st-avail', label: `${have} / ${total}` };
    }
    const fc = item.statistics?.episodeFileCount || 0;
    const tc = item.statistics?.episodeCount || 0;
    if (fc === 0 && tc > 0) return { cls: 'b-missing', label: this._t('badgeMissing') };
    if (fc < tc)            return { cls: 'b-partial', label: `${fc} / ${tc}` };
    if (fc > 0 && item.status === 'continuing') return { cls: 'b-continuing', label: `${fc} / ${tc}` };
    if (fc > 0)             return { cls: 'b-st-avail', label: `${fc} / ${tc}` };
    return { cls: '', label: '' };
  }

  // ─── Modal table ──────────────────────────────────────────────────────────

  _libTableHtml(items) {
    const isMob = this._isMob;
    const isTab = this._isTablet;
    const m = this._libModal;

    // Artists share none of the columns the other two do: no quality profile,
    // no seasons, and a rating that comes from MusicBrainz rather than TMDB or
    // TVDB — which is why a TMDB badge on a band read as a bug.
    if (m.typeKey === 'music') return this._libMusicTableHtml(items);
    const _icoMov = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;opacity:0.7"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/></svg>`;
    const _icoTv  = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;opacity:0.7"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;

    const _statusBadge = (st) => {
      if (!st.cls) return '';
      return this._uiBadge(st.label, this._libBadgeTone(st.cls));
    };

    const _popupAttrs = (item) => {
      const isMovie = item._libType === 'movie';
      const title = this._escHtml(item.title || '');
      const popupType = isMovie ? 'radarr' : 'sonarr';
      const tmdbAttr = item.tmdbId ? ` data-tmdbid="${item.tmdbId}"` : '';
      const tvdbAttr = (!isMovie && item.tvdbId) ? ` data-tvdbid="${item.tvdbId}"` : '';
      const radarrAttr = isMovie && item.id ? ` data-radarrid="${item.id}"` : '';
      return m._editMode ? '' : ` data-lib-popup="${popupType}"${tmdbAttr}${tvdbAttr}${radarrAttr} data-title="${title}"`;
    };
    const _checkEl = (item, tag = 'div') => {
      if (!m._editMode) return '';
      const selKey = `${item._libType}-${item._libInst||'1'}-${item.id}`;
      const checked = m._selected?.has(selKey);
      const inner = checked ? `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><polyline points="20 6 9 17 4 12"/></svg>` : '';
      const el = `<div data-lib-sel="${selKey}" style="width:16px;height:16px;border-radius:50%;border:2px solid rgba(255,255,255,0.7);background:${checked ? 'rgba(0,122,255,0.9)' : 'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;box-sizing:border-box">${inner}</div>`;
      return tag === 'td' ? `<td style="width:28px;padding:0 6px">${el}</td>` : el;
    };
    const _monIcon = (item) => item.monitored
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:0.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.3"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

    // ── Mobile: compact row layout ──────────────────────────────────────────
    if (isMob) {
      const rows = items.map(item => {
        const isMovie = item._libType === 'movie';
        const title = this._escHtml(item.title || '');
        const st = this._libTableStatus(item);
        const sizeBytes = isMovie ? (item.movieFile?.size || 0) : (item.statistics?.sizeOnDisk || 0);
        const sizeStr = sizeBytes ? fmtBytes(sizeBytes) : '';
        const profile = item.qualityProfileName || '';
        const _mtMob = (txt) => txt ? `<span class="media-type-tag" style="position:static;font-size:9px;padding:1px 5px">${txt}</span>` : '';
        const metaTags = [_mtMob(profile), _mtMob(sizeStr)].filter(Boolean).join('');
        return `<div class="lib-table-row"${_popupAttrs(item)} style="display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid var(--is-divider,rgba(255,255,255,0.07))">
          ${_checkEl(item)}
          ${_monIcon(item)}
          <span style="display:inline-flex;flex-shrink:0">${isMovie ? _icoMov : _icoTv}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--is-text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
            ${metaTags ? `<div style="display:flex;gap:4px;margin-top:2px">${metaTags}</div>` : ''}
          </div>
          ${_statusBadge(st)}
        </div>`;
      }).join('');
      return `<div style="overflow-y:auto">${rows}</div>`;
    }

    // ── Tablet: Title, Profile, Size, Status ────────────────────────────────
    // ── Desktop: Title, Profile, Size, Rating, Seasons (TV), Episodes (TV), Status ──

    const _thStyle = 'cursor:pointer;user-select:none;white-space:nowrap';
    const _sortArrow = (key) => {
      const active = m.sort === key;
      const char = active ? (m.sortDir === 'asc' ? '↑' : '↓') : '↕';
      return `<span style="margin-left:3px;font-size:9px;opacity:${active ? '0.85' : '0.2'}">${char}</span>`;
    };

    const hasTv = items.some(i => i._libType !== 'movie');

    const rows = items.map(item => {
      const isMovie = item._libType === 'movie';
      const title = this._escHtml(item.title || '');
      const _mtTag = (txt) => txt ? this._uiBadge(txt, 'neutral') : '—';
      const profileRaw = this._escHtml(item.qualityProfileName || '');
      const profile = _mtTag(profileRaw);
      const sizeBytes = isMovie ? (item.movieFile?.size || 0) : (item.statistics?.sizeOnDisk || 0);
      const sizeStr = _mtTag(sizeBytes ? fmtBytes(sizeBytes) : '');
      const st = this._libTableStatus(item);
      const typeTag = `<span style="display:inline-flex;align-items:center;flex-shrink:0;margin-right:6px">${isMovie ? _icoMov : _icoTv}</span>`;

      let extraCells = '';
      if (!isTab) {
        const ratingTxt = this._ratingBadge({ ...item, _mediaType: isMovie ? 'movie' : 'tv' }, true) || '—';
        extraCells += `<td>${ratingTxt}</td>`;
        if (hasTv) {
          const seasons = isMovie ? '' : String(item.statistics?.seasonCount || item.seasonCount || '—');
          const fc = isMovie ? '' : String(item.statistics?.episodeFileCount || 0);
          const tc = isMovie ? '' : String(item.statistics?.episodeCount || 0);
          const epStr = isMovie ? '' : `${fc} / ${tc}`;
          extraCells += `<td style="text-align:center">${seasons}</td>`;
          extraCells += `<td style="text-align:center">${epStr}</td>`;
        }
      }

      return `<tr class="lib-table-row"${_popupAttrs(item)}>
        ${_checkEl(item, 'td')}
        <td><div style="display:flex;align-items:center;gap:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_monIcon(item)}<span style="margin:0 6px 0 4px">${typeTag}</span>${title}</div></td>
        <td>${profile}</td>
        <td>${sizeStr}</td>
        ${extraCells}
        <td style="text-align:right">${_statusBadge(st)}</td>
      </tr>`;
    }).join('');

    let extraHeaders = '';
    if (!isTab) {
      extraHeaders += `<th data-lib-th-sort="imdb" style="${_thStyle};width:110px">Rating${_sortArrow('imdb')}</th>`;
      if (hasTv) {
        extraHeaders += `<th style="${_thStyle};width:70px;text-align:center">${this._t('actColSeasons')}</th>`;
        extraHeaders += `<th style="${_thStyle};width:80px;text-align:center">${this._t('actColMissingEps')}</th>`;
      }
    }

    return `<table class="tl-users-table lib-table" style="width:100%;table-layout:fixed">
      <thead><tr>
        <th data-lib-th-sort="title"    style="${_thStyle};width:auto">Title${_sortArrow('title')}</th>
        <th data-lib-th-sort="qualprof" style="${_thStyle};width:130px">Quality Profile${_sortArrow('qualprof')}</th>
        <th data-lib-th-sort="size"     style="${_thStyle};width:90px">Size${_sortArrow('size')}</th>
        ${extraHeaders}
        <th data-lib-th-sort="status"   style="${_thStyle};width:110px;text-align:right">Status${_sortArrow('status')}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  _libMusicTableHtml(items) {
    const isMob = this._isMob;
    const isTab = this._isTablet;
    const m = this._libModal;
    const _ico = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="pointer-events:none;opacity:0.7"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/></svg>`;
    const _mon = (a) => a.monitored
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;opacity:0.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.3"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    const _tag = (txt) => txt ? this._uiBadge(txt, 'neutral') : '—';
    const _row = (a) => {
      const st = this._libTableStatus(a);
      return {
        name:    this._escHtml(a.artistName || a.title || ''),
        albums:  a.statistics?.albumCount ?? 0,
        have:    a.statistics?.trackFileCount ?? 0,
        total:   a.statistics?.trackCount ?? 0,
        size:    a.statistics?.sizeOnDisk ? fmtBytes(a.statistics.sizeOnDisk) : '',
        rating:  this._musRatingBadge(a, true),
        badge:   st.cls ? this._uiBadge(st.label, this._libBadgeTone(st.cls)) : '',
      };
    };
    const _attrs = (a) => m._editMode ? '' : ` data-artist-id="${a.id}"`;

    if (isMob) {
      const rows = items.map(a => {
        const r = _row(a);
        const tags = [r.albums ? `${r.albums} albums` : '', r.size]
          .filter(Boolean)
          .map(t => `<span class="media-type-tag" style="position:static;font-size:9px;padding:1px 5px">${t}</span>`)
          .join('');
        return `<div class="lib-table-row${this._libFlashArtist && this._libFlashArtist === a.id ? ' lib-flash' : ''}"${_attrs(a)} style="display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid var(--is-divider,rgba(255,255,255,0.07))">
          ${_mon(a)}
          <span style="display:inline-flex;flex-shrink:0">${_ico}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--is-text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div>
            ${tags ? `<div style="display:flex;gap:4px;margin-top:2px">${tags}</div>` : ''}
          </div>
          ${r.badge}
        </div>`;
      }).join('');
      return `<div style="overflow-y:auto">${rows}</div>`;
    }

    const _thStyle = 'cursor:pointer;user-select:none;white-space:nowrap';
    const _sortArrow = (key) => {
      const active = m.sort === key;
      const char = active ? (m.sortDir === 'asc' ? '↑' : '↓') : '↕';
      return `<span style="margin-left:3px;font-size:9px;opacity:${active ? '0.85' : '0.2'}">${char}</span>`;
    };

    const rows = items.map(a => {
      const r = _row(a);
      return `<tr class="lib-table-row${this._libFlashArtist && this._libFlashArtist === a.id ? ' lib-flash' : ''}"${_attrs(a)}>
        <td><div style="display:flex;align-items:center;gap:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_mon(a)}<span style="margin:0 6px 0 4px;display:inline-flex">${_ico}</span>${r.name}</div></td>
        <td style="text-align:center">${r.albums || '—'}</td>
        <td style="text-align:center">${r.total ? `${r.have} / ${r.total}` : '—'}</td>
        <td>${_tag(r.size)}</td>
        ${isTab ? '' : `<td>${r.rating || '—'}</td>`}
        <td style="text-align:right">${r.badge}</td>
      </tr>`;
    }).join('');

    return `<table class="tl-users-table lib-table" style="width:100%;table-layout:fixed">
      <thead><tr>
        <th data-lib-th-sort="title"  style="${_thStyle};width:auto">Artist${_sortArrow('title')}</th>
        <th data-lib-th-sort="albums" style="${_thStyle};width:80px;text-align:center">Albums${_sortArrow('albums')}</th>
        <th data-lib-th-sort="tracks" style="${_thStyle};width:100px;text-align:center">Tracks${_sortArrow('tracks')}</th>
        <th data-lib-th-sort="size"   style="${_thStyle};width:90px">Size${_sortArrow('size')}</th>
        ${isTab ? '' : `<th data-lib-th-sort="rating" style="${_thStyle};width:90px">Rating${_sortArrow('rating')}</th>`}
        <th data-lib-th-sort="status" style="${_thStyle};width:110px;text-align:right">Status${_sortArrow('status')}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  _libStatusColor(item) {
    const isMovie = item._libType === 'movie';
    if (isMovie) {
      if (!item.hasFile) return item.monitored ? '#2980b9' : '#555';
      if (item.movieFile?.qualityCutoffNotMet) return '#e67e22';
      return item.monitored ? '#27ae60' : '#5a9e71';
    } else {
      const count = item.statistics?.episodeFileCount || 0;
      if (count === 0) return item.monitored ? '#2980b9' : '#555';
      const total = item.statistics?.episodeCount || 0;
      if (total > 0 && count < total) return item.monitored ? '#27ae60' : '#5a9e71';
      return item.monitored ? '#27ae60' : '#5a9e71';
    }
  }

}

export const libraryTableMixin = _LibraryTableMethods.prototype;
