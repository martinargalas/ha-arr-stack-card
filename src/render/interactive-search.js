// Interactive Search — fetch, render, grab
// Přidáno na ArrStackCard.prototype v card.js

class _InteractiveSearch {
_renderIsPanel() {
    if (this._isState === 'confirm-add') {
      return `
        <div class="is-panel">
          <div class="is-confirm-wrap">
            <div class="is-confirm-msg">${this._t('isConfirmMsg')}</div>
            <div class="is-confirm-actions">
              <button class="is-confirm-btn is-confirm-yes" data-action="is-confirm-yes">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <button class="is-confirm-btn is-confirm-no" data-action="is-confirm-no">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>`;
    }

    if (this._isState === 'loading') {
      return `
        <div class="is-panel">
          <div class="is-loading">
            <span class="action-spinner" style="width:22px;height:22px;border-width:2px;border-top-color:var(--is-blue)"></span>
            <span>${this._t('isQueryingIndexers')}</span>
          </div>
        </div>`;
    }

    if (this._isState === 'error') {
      return `
        <div class="is-panel">
          <div class="is-loading" style="color:rgba(255,69,58,0.80)">
            ⚠ ${this._escHtml(this._isError || this._t('isLoadError'))}
          </div>
        </div>`;
    }

    if (this._isState !== 'results') return '';

    const all     = this._isResults;
    const filter  = this._isFilter;
    const visible = filter === 'torrent' ? all.filter(r => r.protocol === 'torrent')
                  : filter === 'usenet'  ? all.filter(r => r.protocol !== 'torrent')
                  : all;

    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    const rowsHtml = isMobile
      ? this._renderIsCards(visible)
      : this._renderIsTable(visible);

    const fBtn = (val, label) =>
      `<button class="is-f-btn${this._isFilter === val ? ' active' : ''}" data-isfilter="${val}">${label}</button>`;

    return `
      <div class="is-panel">
        <div class="is-panel-hdr">
          <span class="is-panel-title">${this._t('isResults')}</span>
          <span class="is-count">${all.length}</span>
          <div class="is-filter">
            ${fBtn('all', this._t('isFilterAll'))}
            ${fBtn('torrent', 'TOR')}
            ${fBtn('usenet', 'NZB')}
          </div>
        </div>
        <div class="is-results-wrap">${rowsHtml}</div>
      </div>`;
  }

  _isQualityBadge(r) {
    const name = r.quality?.quality?.name || '';
    if (/2160|4K|UHD/i.test(name))  return `<span class="is-q-pill is-q-4k">4K${/HDR/i.test(name) ? ' HDR' : ''}</span>`;
    if (/1080/i.test(name))          return `<span class="is-q-pill is-q-1080">1080p</span>`;
    if (/720/i.test(name))           return `<span class="is-q-pill is-q-720">720p</span>`;
    return `<span class="is-q-pill is-q-sd">${this._escHtml(name || '?')}</span>`;
  }

  _isScoreHtml(score) {
    if (score == null) return `<span class="is-score is-s-zero">—</span>`;
    const cls = score > 0 ? 'is-s-pos' : score < 0 ? 'is-s-neg' : 'is-s-zero';
    return `<span class="is-score ${cls}">${score > 0 ? '+' : ''}${score}</span>`;
  }

  _isSrcPill(r) {
    return r.protocol === 'torrent'
      ? `<span class="is-src-pill is-src-tor">TOR</span>`
      : `<span class="is-src-pill is-src-nzb">NZB</span>`;
  }

  _isLang(r) {
    const lang = (r.languages || [])[0]?.name || '';
    return lang ? `<span class="is-lang-chip">${this._escHtml(lang.slice(0,2).toUpperCase())}</span>` : '';
  }

  _isSize(bytes) {
    if (!bytes) return '—';
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
    return (bytes / 1e6).toFixed(0) + ' MB';
  }

  _isPeers(r) {
    if (r.protocol !== 'torrent') return `<span class="is-peers-na">—</span>`;
    const s = r.seeders  ?? '?';
    const l = r.leechers ?? '?';
    return `<div class="is-peers"><span class="is-s">↑${s}</span>/<span class="is-l">↓${l}</span></div>`;
  }

  _isGrabBtn(r) {
    const guid = r.guid;
    const isRej = !r.approved;
    const histState = this._isHistory?.[guid];
    if (this._isGrabbed.has(guid) || histState === 'grabbed' || histState === 'imported') {
      const title = histState === 'imported' ? this._t('isImported') : this._t('isGrabbed');
      return `<button class="is-grab-btn is-grab-done" disabled title="${title}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>`;
    }
    if (histState === 'failed') {
      return `<button class="is-grab-btn is-grab-failed" data-grab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${this._t('isFailed')}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    }
    if (this._isGrabbing === guid) {
      return `<button class="is-grab-btn" disabled>
        <span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>
      </button>`;
    }
    return `<button class="is-grab-btn${isRej ? ' force' : ''}" data-grab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${isRej ? 'Force grab' : 'Grab'}">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </button>`;
  }

  _renderIsTable(releases) {
    const rows = releases.map(r => {
      const rejHtml = !r.approved && r.rejections?.length
        ? `<div class="is-rej-row">⚠ ${this._escHtml(r.rejections.slice(0,2).join(' · '))}</div>` : '';
      return `<tr>
        <td>${this._isSrcPill(r)}</td>
        <td>
          <span class="is-rel-title">${this._escHtml(r.title || '')}</span>
          <span class="is-rel-age">${r.ageHours < 48 ? Math.round(r.ageHours) + 'h ago' : Math.round(r.age || 0) + 'd ago'}</span>
          ${rejHtml}
        </td>
        <td><span class="is-indexer">${this._escHtml(r.indexer || '')}</span></td>
        <td><span class="is-size">${this._isSize(r.size)}</span></td>
        <td>${this._isPeers(r)}</td>
        <td>${this._isLang(r)}</td>
        <td>${this._isQualityBadge(r)}</td>
        <td>${this._isScoreHtml(r.customFormatScore)}</td>
        <td>${this._isGrabBtn(r)}</td>
      </tr>`;
    }).join('');

    return `<table class="is-table">
      <thead><tr>
        <th>Src</th><th>Title</th><th>Indexer</th>
        <th>Size</th><th>Peers</th><th>Lang</th><th>Quality</th><th>Score</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  _renderIsCards(releases) {
    return releases.map(r => {
      const rejHtml = !r.approved && r.rejections?.length
        ? `<div class="is-ic-rej">⚠ ${this._escHtml(r.rejections.slice(0,1).join(''))}</div>` : '';
      return `<div class="is-card">
        <div class="is-ic-r1">
          ${this._isSrcPill(r)}
          ${this._isQualityBadge(r)}
          ${this._isScoreHtml(r.customFormatScore)}
          <span class="is-size">${this._isSize(r.size)}</span>
          ${this._isLang(r)}
          <div class="is-ic-spacer"></div>
          ${this._isGrabBtn(r)}
        </div>
        <div class="is-ic-title">${this._escHtml(r.title || '')}</div>
        <div class="is-ic-meta">
          <span>${this._escHtml(r.indexer || '')}</span>
          ${r.protocol === 'torrent' ? `<span class="sep">·</span><span class="is-s">↑${r.seeders ?? '?'}</span>/<span class="is-l">↓${r.leechers ?? '?'}</span>` : ''}
          <span class="sep">·</span>
          <span>${r.ageHours < 48 ? Math.round(r.ageHours) + 'h ago' : Math.round(r.age || 0) + 'd ago'}</span>
        </div>
        ${rejHtml}
      </div>`;
    }).join('');
  }

  // ─────────────────────────────────────────────
  // Interactive Search — fetch + grab
  // ─────────────────────────────────────────────

  async _fetchInteractiveSearch(radarrId) {
    this._isState   = 'loading';
    this._isResults = [];
    this._isError   = null;
    this._renderPopupEl();
    try {
      // Film není v Radarru — přidej ho unmonitored, pak teprve IS
      if (!radarrId) {
        const tmdbId = this._popup?.tmdbId || this._popup?.id;
        const title  = this._popup?.title || this._popup?.originalTitle || '';
        if (!tmdbId) throw new Error(this._t('isMissingTmdb'));
        await this._fetchOverseerrRadarrSettings();
        const profileId    = this._seerrRadarr?.profileId ?? (this._radarrProfiles[0]?.id ?? 1);
        const rootFolder   = this._seerrRadarr?.rootFolder ?? '/movies';
        let addedMovie;
        try {
          addedMovie = await this._hass.callApi('POST', 'arr_stack/radarr/movie', {
            tmdbId: parseInt(tmdbId),
            title,
            qualityProfileId: parseInt(profileId),
            rootFolderPath: rootFolder,
            monitored: false,
            addOptions: { searchForMovie: false, monitor: 'none' },
          });
        } catch (addErr) {
          // Film už v Radarru existuje — refreshni cache a najdi ho
          const movies = await this._hass.callApi('GET', 'arr_stack/radarr/movies').catch(() => []);
          if (Array.isArray(movies)) this._radarr = movies;
          addedMovie = (this._radarr || []).find(m => String(m.tmdbId) === String(tmdbId));
        }
        radarrId = addedMovie?.id ?? null;
        if (!radarrId) throw new Error(this._t('isNoRadarrId'));
        this._popup._radarrId = radarrId;
      }

      const [data, histRaw] = await Promise.all([
        this._hass.callApi('GET', `arr_stack/radarr/release?movieId=${radarrId}`),
        this._hass.callApi('GET', `arr_stack/radarr/history?movieId=${radarrId}`).catch(() => null),
      ]);
      // Sestav mapu guid → stav (history je seřazená od nejnovější)
      const records = histRaw?.records ?? (Array.isArray(histRaw) ? histRaw : []);
      // Krok 1: downloadId → výsledek (history je od nejnovějšího, bereme první výskyt)
      const dlIdOutcome = {};
      records.forEach(h => {
        if (!h.downloadId || h.downloadId in dlIdOutcome) return;
        if (h.eventType === 'downloadFailed') dlIdOutcome[h.downloadId] = 'failed';
        else if (h.eventType === 'downloadFolderImported' || h.eventType === 'movieFileImported') dlIdOutcome[h.downloadId] = 'imported';
      });
      // Krok 2: guid → výsledek přes grabbed event (grabbed má guid i downloadId)
      const histMap = {};
      records.forEach(h => {
        if (h.eventType !== 'grabbed') return;
        const guid = h.data?.guid;
        if (!guid || guid in histMap) return;
        histMap[guid] = dlIdOutcome[h.downloadId] ?? 'grabbed';
      });
      this._isHistory = histMap;
      const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
        if (a.approved !== b.approved) return a.approved ? -1 : 1;
        return (b.customFormatScore ?? 0) - (a.customFormatScore ?? 0);
      });
      this._isResults = sorted;
      this._isState   = 'results';
    } catch (e) {
      this._isState = 'error';
      this._isError = e.message || this._t('isLoadError');
    }
    this._renderPopupEl();
  }

  async _grabRelease(guid, indexerId) {
    this._isGrabbing = guid;

    this._renderPopupEl();
    try {
      // Radarr POST /api/v3/release vyžaduje celý release objekt (ne jen guid+indexerId)
      const release = this._isResults.find(r => r.guid === guid) || { guid, indexerId };
      release.movieId = this._popup._radarrId;
      const result = await this._hass.callApi('POST', 'arr_stack/radarr/release', release);
      console.log('[arr-card] grab result:', result);
      this._isGrabbed.add(guid);
    } catch (e) {
      console.error('[arr-card] grab error:', e);
      // Zobraz chybu v popupu — krátce flash, pak reset
      const prev = this._isError;
      this._isError = this._t('isGrabError') + ': ' + (e.message || '');
      this._renderPopupEl();
      setTimeout(() => { this._isError = prev; this._renderPopupEl(); }, 3000);
    } finally {
      this._isGrabbing = null;
      this._renderPopupEl();
    }
  }

  // ─────────────────────────────────────────────
  // HA card size hint
  // ─────────────────────────────────────────────
}
export const interactiveSearchMixin = _InteractiveSearch.prototype;
