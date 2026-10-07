// Interactive Search — fetch, render, grab
// Přidáno na ArrStackCard.prototype v card.js
import { fmtBytes } from '../shared/format.js';
import { BP, maxWidth } from '../shared/ui.js';

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
          <div class="is-loading" style="color:rgba(var(--arr-error-rgb, 255, 69, 58), 0.80)">
            ⚠ ${this._escHtml(this._isError || this._t('isLoadError'))}
          </div>
        </div>`;
    }

    if (this._isState !== 'results') return '';

    const all     = this._isResults;
    const visible = this._applyIsFilters(all);

    const IS_PER_PAGE  = this._isPerPage || 8;
    const totalPages   = Math.max(1, Math.ceil(visible.length / IS_PER_PAGE));
    const page         = Math.min(this._isPage || 0, totalPages - 1);
    const paged        = visible.slice(page * IS_PER_PAGE, (page + 1) * IS_PER_PAGE);

    const rowsHtml = this._isMob
      ? this._isCards(paged, r => this._isGrabBtn(r))
      : this._isTable(paged, { sortAttr: 'issort', sort: this._isSort, grab: r => this._isGrabBtn(r), compact: true });

    const { protocol, indexer, quality, lang } = this._isFilters;
    const countHtml = visible.length !== all.length
      ? `<span class="is-count">${visible.length}<span style="opacity:0.45">/${all.length}</span></span>`
      : `<span class="is-count">${all.length}</span>`;

    // Extract unique values for select options
    const uniqIndexers  = [...new Set(all.map(r => r.indexer).filter(Boolean))].sort();
    const uniqQualities = [...new Set(all.map(r => this._isQualityLabel(r)).filter(Boolean))];
    const uniqLangs     = [...new Set(all.map(r => ((r.languages||[])[0]?.name||'').slice(0,2).toUpperCase()).filter(Boolean))].sort();

    const mkSelect = (dim, label, current, options) => {
      const opts = options.map(v =>
        `<option value="${this._escHtml(v)}"${current === v ? ' selected' : ''}>${this._escHtml(v)}</option>`
      ).join('');
      return `<select class="is-f-select${current ? ' active' : ''}" data-isselect="${dim}">
        <option value="">${label}</option>
        ${opts}
      </select>`;
    };

    const paginationHtml = this._uiPager('is-page', page, totalPages);
    const filters = this._isFilterBar(`
            ${mkSelect('protocol', 'Protocol', protocol, ['torrent', 'usenet'])}
            ${uniqIndexers.length  > 1 ? mkSelect('indexer',  'Indexer',  indexer,  uniqIndexers)  : ''}
            ${uniqQualities.length > 1 ? mkSelect('quality',  'Quality',  quality,  uniqQualities) : ''}
            ${uniqLangs.length     > 1 ? mkSelect('lang',     'Lang',     lang,     uniqLangs)     : ''}`,
      [protocol, indexer, quality, lang].filter(Boolean).length);

    return `
      <div class="is-panel">
        <div class="is-panel-hdr">
          <span class="is-panel-title">${this._t('isResults')}</span>
          ${countHtml}
          ${filters.hdr}
        </div>
        ${filters.below}
        <div class="is-results-wrap">${rowsHtml}</div>
        ${paginationHtml ? `<div style="flex-shrink:0">${paginationHtml}</div>` : ''}
      </div>`;
  }

  _isQualityLabel(r) {
    const name = r.quality?.quality?.name || '';
    if (/2160|4K|UHD/i.test(name)) return /HDR/i.test(name) ? '4K HDR' : '4K';
    if (/1080/i.test(name)) return '1080p';
    if (/720/i.test(name))  return '720p';
    return name || 'SD';
  }

  _applyIsFilters(releases) {
    const { protocol, indexer, quality, lang } = this._isFilters;
    return releases.filter(r => {
      if (protocol) {
        const proto = r.protocol === 'torrent' ? 'torrent' : 'usenet';
        if (proto !== protocol) return false;
      }
      if (indexer && (r.indexer || '') !== indexer) return false;
      if (quality && this._isQualityLabel(r) !== quality) return false;
      if (lang) {
        const lc = ((r.languages || [])[0]?.name || '').slice(0, 2).toUpperCase();
        if (lc !== lang) return false;
      }
      return true;
    });
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
    return /torrent/i.test(String(r.protocol || ''))
      ? `<span class="is-src-pill is-src-tor">TOR</span>`
      : `<span class="is-src-pill is-src-nzb">NZB</span>`;
  }

  _isLang(r) {
    const lang = (r.languages || [])[0]?.name || '';
    return lang ? `<span class="is-lang-chip">${this._escHtml(lang.slice(0,2).toUpperCase())}</span>` : '';
  }

  _isPeers(r) {
    // Lidarr does not word the protocol the way Radarr and Sonarr do, so an
    // exact comparison read every music release as usenet and the column
    // showed a dash for all of them.
    const torrent = /torrent/i.test(String(r.protocol || ''))
      || r.seeders != null || r.leechers != null;
    if (!torrent) return `<span class="is-peers-na">—</span>`;
    const s = r.seeders  ?? '?';
    const l = r.leechers ?? '?';
    return `<div class="is-peers"><span class="is-s">↑${s}</span>/<span class="is-l">↓${l}</span></div>`;
  }

  _isGrabBtn(r) {
    const guid = r.guid;
    const isRej = !r.approved;
    const histState = this._isHistory?.[guid];
    const _dlSvg = `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>`;

    // Imported → green check
    if (histState === 'imported') {
      return `<button class="is-grab-btn is-grab-done" disabled title="${this._t('isImported')}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>`;
    }

    // Failed → red X (clickable to retry); check BEFORE grabbed to handle session-grabbed-then-failed
    if (histState === 'failed') {
      return `<button class="is-grab-btn is-grab-failed" data-grab="${this._escHtml(guid)}" data-indexerid="${r.indexerId}" title="${this._t('isFailed')}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    }
    // Grabbed → progress bar only if grabbed this session OR actively in queue
    {
      const inst    = this._isInstance || 'radarr';
      const mId     = inst === 'radarr2' ? this._popup?._radarr2Id : this._popup?._radarrId;
      const qPct    = inst === 'radarr2' ? (this._radarr2QueuePct || new Map()) : (this._radarrQueuePct || new Map());
      const inQueue = !!(mId && qPct.has(mId));
      const grabbed  = this._isGrabbed.has(guid);
      if (grabbed && !inQueue) {
        // Grabbed, but the queue has not picked it up yet — a 0% bar would
        // claim a download that is not running. Spin until it really is.
        return `<button class="is-grab-btn" disabled title="${this._t('isGrabbed')}">
          <span class="action-spinner" style="width:12px;height:12px;border-width:1.5px"></span>
        </button>`;
      }
      const showProg = grabbed && inQueue;
      if (showProg) {
        const p = qPct.get(mId);
        // Wider than tall — the round shape the icon states use would stretch
        // this into an ellipse, so it keeps a plain rounded rectangle.
        return `<button class="is-grab-btn" disabled style="min-width:56px;gap:3px;padding:0 6px;border-radius:9px" title="${this._t('isGrabbed')}">
          <div style="display:flex;align-items:center;gap:3px;width:100%">
            <div style="flex:1;height:3px;background:rgba(59,130,246,0.20);border-radius:2px;overflow:hidden">
              <div style="width:${Math.max(p,4)}%;height:100%;background:#3b82f6;border-radius:2px"></div>
            </div>
            <span style="font-size:9px;color:#3b82f6;font-weight:700;white-space:nowrap">${p}%</span>
          </div>
        </button>`;
      }
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

  _isSortValue(r, col) {
    switch (col) {
      case 'src':     return /torrent/i.test(String(r.protocol || '')) ? 0 : 1;
      case 'title':   return (r.title || '').toLowerCase();
      case 'indexer': return (r.indexer || '').toLowerCase();
      case 'size':    return r.size || 0;
      case 'peers':   return /torrent/i.test(String(r.protocol || '')) ? (r.seeders ?? -1) : -1;
      case 'lang':    return ((r.languages || [])[0]?.name || '').toLowerCase();
      case 'quality': return r.quality?.quality?.name || '';
      case 'score':   return r.customFormatScore ?? -Infinity;
      default:        return 0;
    }
  }

  // ── Release rows, shared by films, series and music ──

  // How old a release is, in the largest unit that still reads well — "8.8 y"
  // rather than "3217d ago", which nobody converts in their head.
  _isAge(r) {
    const h = r.ageHours ?? (r.age || 0) * 24;
    const d = h / 24;
    const [n, unit] = h < 48 ? [Math.round(h), 'hour']
      : d < 60  ? [Math.round(d), 'day']
      : d < 365 ? [Math.round(d / 30.44), 'month']
      : [Math.round(d / 36.5) / 10, 'year'];
    try {
      return new Intl.NumberFormat(this._lg(), { style: 'unit', unit, unitDisplay: 'narrow', maximumFractionDigits: 1 }).format(n);
    } catch { return `${n}${unit[0]}`; }
  }

  // What a tap on a release's title or warning opens: the whole name and why
  // the *arr would not pick it. Carried on the element itself, so the same
  // sheet serves a film, a series and an album wherever their list is drawn.
  _isInfoAttrs(r) {
    const rej = !r.approved && r.rejections?.length ? r.rejections.join('\n') : '';
    return ` data-is-info data-full="${this._escHtml(r.title || '')}"${rej ? ` data-rej="${this._escHtml(rej)}"` : ''}`;
  }

  _isRejIcon(r) {
    if (r.approved || !r.rejections?.length) return '';
    return `<button class="is-rej-ico"${this._isInfoAttrs(r)} title="${this._escHtml(r.rejections[0])}">⚠</button>`;
  }

  _isPeersInline(r) {
    return /torrent/i.test(String(r.protocol || '')) || r.seeders != null
      ? `<span class="sep">·</span><span class="is-s">↑${r.seeders ?? '?'}</span>/<span class="is-l">↓${r.leechers ?? '?'}</span>` : '';
  }

  // A phone's release: the badges and the grab button, then the name on one
  // line, then where it is from in small print. Why it was rejected is a ⚠
  // that opens the sheet — written out, it took a quarter of every card and
  // a page held three releases.
  _isCards(releases, grab, { score = true, lang = true } = {}) {
    return releases.map(r => `<div class="is-card">
        <div class="is-ic-r1">
          ${this._isSrcPill(r)}
          ${this._isQualityBadge(r)}
          ${score ? this._isScoreHtml(r.customFormatScore) : ''}
          <span class="is-size">${fmtBytes(r.size)}</span>
          ${lang ? this._isLang(r) : ''}
          ${this._isRejIcon(r)}
          <div class="is-ic-spacer"></div>
          ${grab(r)}
        </div>
        <button class="is-ic-title"${this._isInfoAttrs(r)}>${this._escHtml(r.title || '')}</button>
        <div class="is-ic-meta">
          <span class="is-ic-idx">${this._escHtml(r.indexer || '')}</span>
          ${this._isPeersInline(r)}
          <span class="sep">·</span>
          <span>${this._isAge(r)}</span>
        </div>
      </div>`).join('');
  }

  // The sources as a table. Where the table is narrow the indexer moves under
  // the name and the name gets two lines: in its own column it pushed the name
  // down to "Late Fame 2026 1080p Bl…", the one thing a release is chosen by.
  // The detail is never wider than 800px, so there it is always narrow — a
  // Nest Hub or a desktop gave it no more room than a tablet. Other windows
  // (the album's) go by the screen.
  _isTable(releases, { sortAttr, sort, grab, lang = true, score = true, peersW = 72, grabW = 76, compact = maxWidth(BP.STACKED) }) {
    const { col, dir } = sort || {};
    const sorted = col ? [...releases].sort((a, b) => {
      const av = this._isSortValue(a, col);
      const bv = this._isSortValue(b, col);
      if (av < bv) return -1 * dir;
      if (av > bv) return  1 * dir;
      return 0;
    }) : releases;

    const arrow = c => (col !== c
      ? `<span class="is-sort-arrow is-sort-inactive">⇅</span>`
      : `<span class="is-sort-arrow">${dir === -1 ? '↓' : '↑'}</span>`);
    const cols = [
      ['src', 'Src', 50],
      ['title', 'Title', null],
      !compact && ['indexer', 'Indexer', 75],
      ['size', 'Size', 52],
      ['peers', 'Peers', peersW],
      lang && ['lang', 'Lang', 38],
      ['quality', 'Quality', 68],
      score && ['score', 'Score', 58],
    ].filter(Boolean);

    const rows = sorted.map(r => {
      const rej = compact ? '' : (!r.approved && r.rejections?.length
        ? `<div class="is-rej-row">⚠ ${this._escHtml(r.rejections.slice(0, 2).join(' · '))}</div>` : '');
      const meta = compact
        ? `<span class="is-rel-age">${r.indexer ? `${this._escHtml(r.indexer)} · ` : ''}${this._isAge(r)}${this._isRejIcon(r)}</span>`
        : `<span class="is-rel-age">${this._isAge(r)}</span>`;
      const cells = {
        src:     this._isSrcPill(r),
        title:   `<span class="is-rel-title${compact ? ' is-rel-2l' : ''}"${this._isInfoAttrs(r)}>${this._escHtml(r.title || '')}</span>${meta}${rej}`,
        indexer: `<span class="is-indexer">${this._escHtml(r.indexer || '')}</span>`,
        size:    `<span class="is-size">${fmtBytes(r.size)}</span>`,
        peers:   this._isPeers(r),
        lang:    this._isLang(r),
        quality: this._isQualityBadge(r),
        score:   this._isScoreHtml(r.customFormatScore),
      };
      return `<tr>${cols.map(([k]) => `<td>${cells[k]}</td>`).join('')}<td>${grab(r)}</td></tr>`;
    }).join('');

    return `<table class="is-table">
      <colgroup>${cols.map(([, , w]) => (w ? `<col style="width:${w}px">` : '<col>')).join('')}<col style="width:${grabW}px"></colgroup>
      <thead><tr>
        ${cols.map(([k, label]) => `<th data-${sortAttr}="${k}" style="cursor:pointer;user-select:none">${label}${arrow(k)}</th>`).join('')}<th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // The filters: in the header on a wide screen; on a phone, four selects ran
  // off its edge, so they fold under one button that says how many are on.
  _isFilterBar(selects, active) {
    if (!this._isMob) return { hdr: `<div class="is-filter">${selects}</div>`, below: '' };
    const open = !!this._isFiltersOpen;
    return {
      // Drawn as one of the selects (their chevron included), which is what it opens
      hdr: `<button class="is-f-select is-f-toggle${active ? ' active' : ''}${open ? ' open' : ''}" data-is-filters>${this._t('isFilters')}${active ? ` · ${active}` : ''}</button>`,
      below: open ? `<div class="is-filter is-filter-wrap">${selects}</div>` : '',
    };
  }

  // One listener for the whole card, in the capture phase: the popups stop
  // clicks at their glass, and the album window draws its sources elsewhere.
  _isWireSheet() {
    if (this._isSheetWired || !this.shadowRoot) return;
    this._isSheetWired = true;
    this.shadowRoot.addEventListener('click', e => {
      const f = e.target.closest?.('[data-is-filters]');
      if (f) {
        e.stopPropagation();
        this._isFiltersOpen = !this._isFiltersOpen;
        this._isFitHist = null; this._snFitHist = null;
        this._renderPopupEl();
        return;
      }
      const t = e.target.closest?.('[data-is-info]');
      if (!t) return;
      e.stopPropagation();
      e.preventDefault();
      this._isOpenSheet(t.dataset.full || '', t.dataset.rej || '');
    }, true);
  }

  _isOpenSheet(title, rej) {
    this.shadowRoot.querySelector('[data-is-sheet]')?.remove();
    const wrap = document.createElement('div');
    const reasons = rej ? rej.split('\n').filter(Boolean) : [];
    wrap.innerHTML = `<div class="popup-overlay is-sheet-overlay${this._isDay ? ' popup-day' : ''}" data-is-sheet>
      <div class="is-sheet">
        <div class="is-sheet-hdr">
          <div class="is-sheet-title">${this._escHtml(title)}</div>
          <button class="popup-close" style="position:static;flex-shrink:0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        ${reasons.length ? `<div class="is-sheet-lbl">${this._t('isWhyRejected')}</div>
        <ul class="is-sheet-rej">${reasons.map(x => `<li>${this._escHtml(x)}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`;
    const el = wrap.firstElementChild;
    const close = () => el.remove();
    el.addEventListener('click', e => {
      if (e.target === el || e.target.closest('.popup-close')) close();
      e.stopPropagation();
    });
    this.shadowRoot.appendChild(el);
  }

  // ─────────────────────────────────────────────
  // Interactive Search — fetch + grab
  // ─────────────────────────────────────────────

  async _fetchInteractiveSearch(radarrId, instance = 'radarr') {
    this._markActivated();
    this._isInstance = instance;
    this._isState   = 'loading';
    this._isResults = [];
    this._isError   = null;
    this._renderPopupEl();
    const svc = instance === 'radarr2' ? 'radarr2' : 'radarr';
    try {
      // Film není v dané instanci — přidej ho unmonitored, pak teprve IS
      if (!radarrId) {
        const tmdbId = this._popup?.tmdbId || this._popup?.id;
        const title  = this._popup?.title || this._popup?.originalTitle || '';
        if (!tmdbId) throw new Error(this._t('isMissingTmdb'));
        await this._fetchOverseerrRadarrSettings();
        const seerr      = instance === 'radarr2' ? this._seerrRadarr2 : this._seerrRadarr;
        // Ensure profiles + root folders fetched (needed when no Overseerr)
        if (instance === 'radarr2') {
          if (!this._radarr2Profiles?.length)    await this._fetchRadarr2Profiles();
          if (!this._radarr2RootFolders?.length) await this._fetchRadarr2RootFolders();
        } else {
          if (!this._radarrProfiles?.length)    await this._fetchRadarrProfiles();
          if (!this._radarrRootFolders?.length) await this._fetchRadarrRootFolders();
        }
        const profiles    = instance === 'radarr2' ? this._radarr2Profiles    : this._radarrProfiles;
        const rootFolders = instance === 'radarr2' ? this._radarr2RootFolders : this._radarrRootFolders;
        const profileId  = seerr?.profileId ?? (profiles?.[0]?.id ?? 1);
        const rootFolder = seerr?.rootFolder ?? rootFolders?.[0]?.path ?? '/movies';
        let addedMovie;
        try {
          addedMovie = await this._hass.callApi('POST', `arr_stack/${svc}/movie`, {
            tmdbId: parseInt(tmdbId),
            title,
            qualityProfileId: parseInt(profileId),
            rootFolderPath: rootFolder,
            monitored: false,
            addOptions: { searchForMovie: false, monitor: 'none' },
          });
        } catch (addErr) {
          // Film už v instanci existuje — refreshni cache a najdi ho
          const movies = await this._hass.callApi('GET', `arr_stack/${svc}/movies`).catch(() => []);
          if (instance === 'radarr2') {
            if (Array.isArray(movies)) {
              const filtered = movies.filter(m => m.added && m.added !== '0001-01-01T00:00:00Z');
              this._radarr2 = filtered;
              const map = new Map(); filtered.forEach(m => { if (m.tmdbId) map.set(String(m.tmdbId), m); });
              this._radarr2ByTmdb = map;
            }
          } else {
            if (Array.isArray(movies)) this._radarr = movies;
          }
          const pool = instance === 'radarr2' ? this._radarr2 : this._radarr;
          addedMovie = (pool || []).find(m => String(m.tmdbId) === String(tmdbId));
        }
        radarrId = addedMovie?.id ?? null;
        if (!radarrId) throw new Error(this._t('isNoRadarrId'));
        if (instance === 'radarr2') this._popup._radarr2Id = radarrId;
        else this._popup._radarrId = radarrId;
        if (instance === 'radarr2') await this._fetchRadarr2(); else await this._fetchRadarr();
        if (tmdbId) { this._pendingRequestedMovies.add(String(tmdbId)); this._render(); }
      }

      const [data, histRaw] = await Promise.all([
        this._hass.callApi('GET', `arr_stack/${svc}/release?movieId=${radarrId}`),
        this._hass.callApi('GET', `arr_stack/${svc}/history?movieId=${radarrId}`).catch(() => null),
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
    this._markActivated();
    this._isGrabbing = guid;

    this._renderPopupEl();
    try {
      // Radarr POST /api/v3/release vyžaduje celý release objekt (ne jen guid+indexerId)
      const svc = this._isInstance === 'radarr2' ? 'radarr2' : 'radarr';
      const release = this._isResults.find(r => r.guid === guid) || { guid, indexerId };
      release.movieId = this._isInstance === 'radarr2' ? this._popup._radarr2Id : this._popup._radarrId;
      await this._hass.callApi('POST', `arr_stack/${svc}/release`, release);
      this._isGrabbed.add(guid);
      // The queue takes a moment to pick a grab up, so the instance chip spins
      // until its progress bar appears rather than looking like nothing happened.
      // Keyed by the title as well as the instance: without an id the next film
      // opened before the queue caught up inherited the spinner and looked stuck.
      this._ppGrabWait = { inst: svc, id: release.movieId, until: Date.now() + 180000 };
      this._ppGrabPollStart();
      this._dlTriggeredBy = 'is';
      // Set movie monitored after grab
      const radarrId = release.movieId;
      const cache = svc === 'radarr2' ? (this._radarr2 || []) : (this._radarr || []);
      const movie = cache.find(m => m.id === radarrId);
      if (movie && !movie.monitored) {
        this._hass.callApi('PUT', `arr_stack/${svc}/movie/${radarrId}`, { ...movie, monitored: true }).catch(() => {});
        if (svc === 'radarr2') this._radarr2 = cache.map(m => m.id === radarrId ? { ...m, monitored: true } : m);
        else this._radarr = cache.map(m => m.id === radarrId ? { ...m, monitored: true } : m);
      }
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
