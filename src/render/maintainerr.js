// ──────────────────────────────────────────────────────────────────────────
// Maintainerr — poster row, modal shell, 4 tabs, rule editor
// ──────────────────────────────────────────────────────────────────────────
import { MT_BTN, MT_ACCENTS } from './mt-kit.js';
import { ICONS, dayClass, isMobile } from '../shared/ui.js';
import { fmtBytes } from '../shared/format.js';

// Buttons match the capsule language: soft fill, hairline edge, 32px tall.
// Accent buttons: white label on the dark theme, tinted on the light one where
// the translucent fill goes pale. _mtBtnA() below picks the colour.

class _MaintainerrRenderMethods {

  // ──────────────────────────────────────────────────────────────────────────
  // Poster row — 4 cards in right panel
  // ──────────────────────────────────────────────────────────────────────────

  // ── Poster: Overview ──────────────────────────────────────────────────────

  // ── Poster: Rules ─────────────────────────────────────────────────────────

  // ── Poster: Collections ───────────────────────────────────────────────────

  // ── Poster: Calendar ──────────────────────────────────────────────────────

  // ── Helpers ───────────────────────────────────────────────────────────────

  _mtCronDesc(c) {
    if (!c || c === '—') return '—';
    const parts = c.split(' ');
    if (parts.length < 5) return c;
    const [min, hr, dom] = parts;
    if (dom !== '*') return c;
    // Maintainerr's defaults are steps, e.g. "0 0-23/8 * * *" — every 8 hours.
    // Reading the hour field literally produced "Daily 0-23/8:00".
    const hrStep = /^(\*|0-23)\/(\d+)$/.exec(hr);
    if (hrStep && min !== '*') return this._t('mtEveryHours').replace('{n}', hrStep[2]);
    const minStep = /^(\*|0-59)\/(\d+)$/.exec(min);
    if (minStep && hr === '*') return this._t('mtEveryMinutes').replace('{n}', minStep[2]);
    if (hr === '*' && min !== '*') return this._t('mtHourly');
    if (hr !== '*' && min !== '*') return `${this._t('mtDaily')} ${hr}:${min.padStart(2, '0')}`;
    return c;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Modal shell
  // ──────────────────────────────────────────────────────────────────────────

  _mtModalHtml(tab) {
    const _mob = isMobile();
    const hdrPad = _mob ? '12px 12px 10px' : '14px 22px 10px';

    return `<div class="popup-overlay${dayClass(this)}" data-mt-modal>
      <div class="popup-glass tl-wide">
        <div class="is-panel-hdr" style="flex-direction:row;align-items:center;padding:${hdrPad};gap:8px">
          <div id="mt-nav-area" style="min-width:0;flex-shrink:1;overflow:hidden">${this._mtNavHtml(tab)}</div>
          <div id="mt-status" style="flex-shrink:0;display:flex;align-items:center">${this._mtStatusHtml()}</div>
          <div style="flex:1;min-width:8px"></div>
          <div id="mt-hdr-save" style="flex-shrink:0;display:flex">${this._mtHdrSaveHtml()}</div>
          <div id="mt-hdr-btn" style="flex-shrink:0;display:flex">${this._mtHdrBtnHtml()}</div>
        </div>
        <div class="popup-body" id="mt-body" style="padding:${_mob ? '12px 14px 16px' : '14px 22px 20px'};overflow-y:auto">
          <div class="is-loading"><span>${this._t('loading')}</span></div>
        </div>
      </div>
    </div>`;
  }

  // Tracearr-style nav pills. Main tabs (lighter blue) on the left; the
  // Collections pill grows a row of darker sub-tabs (Media/Exclusions/Info)
  // with an expand animation when a collection detail is open.
  // ──────────────────────────────────────────────────────────────────────────
  // Overview tab — every item currently queued for deletion, across collections
  // ──────────────────────────────────────────────────────────────────────────

  // ──────────────────────────────────────────────────────────────────────────
  // Overview tab — media-server library browser with collection/exclusion actions
  // ──────────────────────────────────────────────────────────────────────────

  // Library items carry no artwork. Radarr/Sonarr cover most of them for free;
  // anything else is resolved lazily through Maintainerr's metadata endpoint
  // (see _mtResolvePosters) and served from _mtPosterCache afterwards.
  _mtPosterFor(item) {
    const pick = arr => (arr || []).find(i => i.coverType === 'poster')?.remoteUrl || '';
    // Overview items nest the ids under providerIds; collection media and
    // exclusion rows carry them flat. Accept both.
    const tmdb = item.providerIds?.tmdb?.[0] ?? item.tmdbId ?? null;
    const tvdb = item.providerIds?.tvdb?.[0] ?? item.tvdbId ?? null;
    // Both instances: with a split library (CZ/EN, HD/4K) half the titles live
    // only in the second one and would never resolve a poster.
    if (tmdb) {
      for (const lib of [this._radarr, this._radarr2]) {
        const mv = (lib || []).find(m => String(m.tmdbId) === String(tmdb));
        if (mv) { const p = pick(mv.images); if (p) return p; }
      }
    }
    if (tvdb) {
      for (const lib of [this._sonarr, this._sonarr2]) {
        const sh = (lib || []).find(s => String(s.tvdbId) === String(tvdb));
        if (sh) { const p = pick(sh.images); if (p) return p; }
      }
    }
    const key = this._mtPosterKey(item);
    return (key && this._mtPosterCache?.get(key)) || '';
  }

  _mtExclBadge(compact) {
    const ico = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="flex-shrink:0"><circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/></svg>`;
    const txt = compact ? '' : `<span>${this._t('mtExcluded')}</span>`;
    return `<span class="media-type-tag" title="${this._t('mtExcluded')}" style="position:static;display:inline-flex;align-items:center;gap:3px;background:rgba(52,211,153,0.30);color:#fff">${ico}${txt}</span>`;
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────
  // One translucent capsule instead of three outlined boxes. The native select
  // stays, but only as an invisible hit target on top of our own trigger — the
  // OS-drawn chevron and font were what made the row look unstyled. Keeping its
  // id means the delegated change handlers need no rewiring.

  // Matches the reduced body padding poster views use, so the bar sits centred
  // between the header and the grid.
  get _mtToolbarGap() { return 8; }

  _mtPosterKey(item) {
    // Overview items nest the ids under providerIds; collection media and
    // exclusion rows carry them flat. Accept both.
    const tmdb = item.providerIds?.tmdb?.[0] ?? item.tmdbId ?? null;
    const tvdb = item.providerIds?.tvdb?.[0] ?? item.tvdbId ?? null;
    const type = item.type === 'movie' ? 'movie' : 'show';
    if (tmdb) return `${type}:tmdb:${tmdb}`;
    if (tvdb) return `${type}:tvdb:${tvdb}`;
    return '';
  }

  // Collections that can hold items from the library being browsed. Matching is
  // by media type, not libraryId — a movie can be moved into any movie
  // collection regardless of which Radarr/library instance it came from.
  _mtCollectionsForLib(libId) {
    const lib = (this._maintainerrLibraries || []).find(l => String(l.id) === String(libId));
    const want = lib?.type === 'show' ? ['show', 'season', 'episode'] : ['movie'];
    const rules = this._maintainerr?.rules || [];
    return (this._maintainerr?.collections || []).filter(c => {
      const type = c.type || rules.find(r => r.collectionId === c.id)?.dataType;
      return want.includes(type);
    });
  }

  _mtOvPosterCard(item, { compact, dueMs, actions = '', overlay = '', popup = true, type, fallbackPoster = '', excluded = false, prefix = '', topBadge = '' }) {
    const pc = this._posterCfg();
    // Library items expose providerIds; collection rows carry flat tmdbId/tvdbId
    const kind = type || item.type || 'movie';
    const isMovie = kind === 'movie';
    const tmdb = item.providerIds?.tmdb?.[0] ?? item.tmdbId ?? null;
    const tvdb = item.providerIds?.tvdb?.[0] ?? item.tvdbId ?? null;
    let arr = isMovie
      ? (this._radarr || []).find(x => tmdb && String(x.tmdbId) === String(tmdb))
      : (this._sonarr || []).find(x => tvdb && String(x.tvdbId) === String(tvdb));
    // A title that only the second instance holds had no status and so no
    // stripe. Looked up there too, and its queue read from that instance —
    // the ids of the two instances overlap, so the first one's queue would
    // answer for a different title.
    let inst2 = false;
    if (!arr) {
      arr = isMovie
        ? (tmdb ? this._radarr2ByTmdb?.get(String(tmdb)) : null) || null
        : (this._sonarr2All || this._sonarr2 || []).find(x => tvdb && String(x.tvdbId) === String(tvdb)) || null;
      inst2 = !!arr;
    }

    // A season row's own title is just "Season 4" — the show name is the useful
    // label, and the season goes into the deletion badge instead.
    const md = item.mediaData;
    const isSeason = kind === 'season' && md?.type === 'season' && md?.index != null;
    // _mtDelBadge escapes the prefix it is handed, so this stays raw.
    const seasonPrefix = isSeason ? `${this._t('mtSeason')} ${md.index}` : '';
    const title = this._escHtml(
      (isSeason ? (md.parentTitle || md.title) : (md?.title || item.title || item.name)) || '—'
    );
    const poster = (arr
      ? (isMovie ? this._getRadarrPoster(arr) : this._getSonarrPoster(arr))
      : '') || fallbackPoster || this._mtPosterFor(item);
    const img = this._mcImg(poster, isMovie ? '🎬' : '📺', item.id);
    const _langs = arr ? this._arrLangCodes(arr, isMovie) : { audioCodes: [], subCodes: [] };
    const ratingHtml = arr
      ? this._ratingLangBlock({ ...arr, _mediaType: isMovie ? 'movie' : 'tv' }, _langs)
      : '';

    // Availability badges only mean something when the title is in an *arr
    const _b = (cls, icon, text) => compact ? `<span class="badge ${cls}">${icon}</span>` : this._badge(cls, icon, text);
    let badgeCls = '', badgeHtml = '', pct = -1;
    if (arr && isMovie) {
      const dlFailed = (inst2 ? this._radarr2QueueFailed : this._radarrQueueFailed)?.has(arr.id);
      const dlActive = (inst2 ? this._radarr2QueueActive : this._radarrQueueActive)?.has(arr.id);
      if (arr.hasFile && arr.movieFile?.qualityCutoffNotMet) { badgeCls = 'b-cutoff'; badgeHtml = _b('b-cutoff', '⚡', 'Upgrade'); }
      else if (arr.hasFile) { badgeCls = 'b-st-avail'; badgeHtml = _b('b-st-avail', '✓', this._t('badgeAvailable')); }
      else if (dlFailed)    { badgeCls = 'b-missing'; badgeHtml = _b('b-missing', '✗', this._t('badgeFailed')); }
      else if (dlActive)    { badgeCls = 'b-dl'; badgeHtml = _b('b-dl', '↓', this._t('badgeDownloading')); pct = this._dlPct(arr.id, 'movie', inst2 ? 'radarr2' : 'radarr'); }
      else                  { badgeCls = 'b-missing'; badgeHtml = _b('b-missing', '✗', this._t('badgeMissing')); }
    } else if (arr) {
      const fc = arr.statistics?.episodeFileCount || 0;
      const tc = arr.statistics?.episodeCount || 0;
      if (fc === 0 && tc > 0) { badgeCls = 'b-missing'; badgeHtml = _b('b-missing', '✗', this._t('badgeMissing')); }
      else if (fc < tc)       { badgeCls = 'b-partial'; badgeHtml = compact ? `<span class="badge b-partial">${fc}</span>` : `<span class="badge b-partial">${fc}/<span class="b-txt">${tc}</span></span>`; pct = tc > 0 ? Math.round((fc / tc) * 100) : -1; }
      else if (fc > 0 && arr.status === 'continuing') { badgeCls = 'b-continuing'; badgeHtml = _b('b-continuing', '▶', this._t('badgeAvailable')); }
      else if (fc > 0)        { badgeCls = 'b-st-avail'; badgeHtml = _b('b-st-avail', '✓', this._t('badgeAvailable')); }
    }
    const showTag = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
    const statusTag = (badgeHtml && showTag) ? badgeHtml : '';
    const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
    const statusBar = (showStripe && badgeCls)
      ? this._statusStripe(this._statusStripeColor(badgeCls), badgeCls === 'b-dl', pct)
      : '';

    const _label = { movie: 'Movie', show: 'Show', season: 'Season', episode: 'Episode' }[kind] || kind;
    const _mediaTag = pc.mediaType ? `<span class="media-type-tag" style="position:static">${_label}</span>` : '';
    const _exclTag = (excluded || item.maintainerrExclusionId) ? this._mtExclBadge(compact) : '';
    const topLeft = (_mediaTag || topBadge)
      ? `<div style="position:absolute;top:5px;left:5px;z-index:4;display:flex;flex-direction:column;align-items:flex-start;gap:3px">${_mediaTag}${topBadge}</div>`
      : '';
    // One stack in the corner opposite the type tag — _statusBadge would place
    // itself at top-right too and the two would sit on top of each other.
    const topRight = (statusTag || _exclTag)
      ? `<div style="position:absolute;top:6px;right:6px;z-index:4;display:flex;flex-direction:column;align-items:flex-end;gap:3px">${statusTag}${_exclTag}</div>`
      : '';

    // Fixed offset, not a percentage: on a short poster 14% put the pill level
    // with the type tag and the two collided.
    const gone = this._mtDelBadge(dueMs, compact, prefix || seasonPrefix, true);
    const goneHtml = gone
      ? `<div style="position:absolute;top:26px;left:6px;right:6px;z-index:4;display:flex;pointer-events:none">${gone}</div>`
      : '';

    // 'movie'/'tv' rather than 'radarr'/'sonarr': a Plex item may have no *arr
    // entry at all, and those popup types tolerate a null internal id.
    const canPopup = popup && (tmdb || tvdb);
    const popupAttr = canPopup
      ? ` data-mt-popup="${isMovie ? 'movie' : 'tv'}"${tmdb ? ` data-tmdbid="${this._escHtml(tmdb)}"` : ''}${tvdb ? ` data-tvdbid="${this._escHtml(tvdb)}"` : ''} data-title="${title}"`
      : '';
    const titleHtml = pc.title
      ? `<div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:22px">${title}</div>`
      : '';

    return `<div class="mc"${popupAttr}>
      <div style="position:absolute;inset:0;overflow:hidden">${img}</div>
      ${this._mcGrad('rgba(0,0,0,0.7)', `${ratingHtml}${titleHtml}`)}
      ${topLeft}
      ${topRight}
      ${goneHtml}
      ${overlay}
      ${actions}
      ${statusBar}
    </div>`;
  }

  _mtNavHtml(activeTab) {
    const m = this._maintainerrModal;
    const _ico = (d, s = 13) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${d}</svg>`;
    // Icons mirror Maintainerr's own sidebar: eye / clipboard-check / archive / calendar
    const NAV = [
      { id: 'overview',    label: this._t('mtOverview'),    icon: _ico('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>') },
      { id: 'rules',       label: this._t('mtRules'),       icon: _ico('<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><polyline points="9 13 11 15 15 11"/>') },
      { id: 'collections', label: this._t('mtCollections'), icon: _ico('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/>') },
      { id: 'calendar',    label: this._t('mtCalendar'),    icon: _ico('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>') },
    ];
    // Four labelled pills overflow a phone header, so there the glyph carries
    // the meaning on its own and the label moves into the tooltip.
    const _mob = isMobile();

    const items = NAV.map(g => {
      const active = activeTab === g.id;
      const btn = `<button class="mt-nav-btn${active ? ' is-on' : ''}" data-mt-tab="${g.id}" title="${this._escHtml(g.label)}">${g.icon}${(!_mob || active) ? g.label : ''}</button>`;
      if (g.id !== 'collections') return btn;

      const expanded = active && !!m?.colDetail;
      const colSubTabs  = ['media', 'exclusions', 'info'];
      const colSubLabels = { media: this._t('mtMedia'), exclusions: this._t('mtExclusions'), info: this._t('mtInfo') };
      // Picture frame / no-entry / info circle — same stroke family as the nav
      const colSubIcons = {
        media: _ico('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>', 12),
        exclusions: _ico('<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>', 12),
        info: _ico('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>', 12),
      };
      const activeColTab = m?.colSubTab || 'media';
      const subHtml = expanded ? colSubTabs.map(t => {
        const on = t === activeColTab;
        return `<button class="mt-nav-sub${on ? ' is-on' : ''}" data-mt-col-tab="${t}" title="${this._escHtml(colSubLabels[t])}">${colSubIcons[t]}${_mob ? '' : colSubLabels[t]}</button>`;
      }).join('') : '';

      // The sub-tabs belong to Collections, so they ride in their own track
      // rather than inline with the top level — two rows of identical pills
      // gave no clue which one owned which.
      return btn +
        `<span data-mt-sub class="mt-nav-sub-wrap${expanded ? ' is-open' : ''}"><span class="mt-nav-ind"></span>${subHtml}</span>`;
    }).join('');

    // The active fill is one element rather than a background on each button,
    // so switching tabs slides it. Tab widths vary with their labels, so unlike
    // the segmented control it cannot step by a fixed amount — the wire layer
    // measures the active button and drives left/width.
    return `<div id="mt-nav" class="mt-nav"><span class="mt-nav-ind"></span>${items}</div>`;
  }

  _mtStatusHtml() {
    const m = this._maintainerrModal;
    if (!m?._statusMsg) return '';
    const rgb = m._statusErr ? '248,113,113' : '52,211,153';
    const spin = m._statusSpin ? '<span class="is-spin" style="margin-right:6px;vertical-align:-1px"></span>' : '';
    // Floating over the content on a phone, so the ground has to be opaque —
    // written inline rather than in the stylesheet because the fill is inline
    // too and would otherwise need !important to be overridden.
    const mob = this._isMob;
    const bg = mob ? (this._isDay ? '#fafafc' : '#14141a') : `rgba(${rgb},0.12)`;
    // Without lifting it out of the header the pill stays in the flow, gets
    // squeezed by the nav, and the text beside it reads straight through.
    const extra = mob
      ? ';box-shadow:0 4px 16px rgba(0,0,0,0.55);padding:5px 14px'
        + ';position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:1200'
      : '';

    // A determinate bar when the queue gives a fraction, a sweeping one when the
    // API only says "still working" — never a fake percentage.
    const p = m._statusProg;
    let bar = '';
    if (p) {
      const pct = (p && typeof p === 'object' && p.total > 0)
        ? Math.max(4, Math.round(p.done / p.total * 100))
        : null;
      const fill = pct != null
        ? `<span style="display:block;height:100%;width:${pct}%;background:rgba(${rgb},0.95);border-radius:2px;transition:width 0.4s ease"></span>`
        : `<span class="mt-prog-sweep" style="display:block;height:100%;width:40%;background:rgba(${rgb},0.95);border-radius:2px"></span>`;
      bar = `<span style="display:block;height:3px;margin-top:4px;border-radius:2px;overflow:hidden;background:rgba(${rgb},0.22)">${fill}</span>`;
    }
    const body = bar
      ? `<span style="display:block">${spin}${this._escHtml(m._statusMsg)}</span>${bar}`
      : `${spin}${this._escHtml(m._statusMsg)}`;
    const shape = bar ? 'display:inline-block;min-width:190px' : '';
    return `<span style="font-size:11px;font-weight:600;color:rgba(${rgb},0.9);background:${bg};border:1px solid rgba(${rgb},0.45);border-radius:999px;padding:2px 12px;white-space:nowrap;flex-shrink:0;${shape}${extra}">${body}</span>`;
  }

  // Primary action for the current view, parked in the modal header next to
  // back/close. In the rule editor it is Save, which stays muted until an edit
  // is made so "there is something to save" reads at a glance.
  _mtHdrSaveHtml() {
    const m = this._maintainerrModal;
    if (!m) return '';
    // Deliberately smaller than the 36px back/close: those act on the modal,
    // these act on the view, and equal sizing read as one control group.
    const S = 30;

    if (m.editor) {
      const CHECK = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg>`;
      // Nothing to save until something changes
      const dirty = !!m.editor._dirty;
      return this._mtRoundBtn('data-mt-save', CHECK, this._t('mtSave'), { size: S, tone: 'blue', active: dirty, disabled: !dirty });
    }

    // Double play for the bulk actions — a single triangle is what an individual
    // rule's Run button uses, and the two would otherwise look identical.
    const PLAY2 = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:block"><polygon points="3,4 12,12 3,20"/><polygon points="13,4 22,12 13,20"/></svg>`;
    if (m.tab === 'rules') {
      const PLUS = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="display:block"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
      return `<div style="display:flex;gap:6px">
        ${this._mtRoundBtn('data-mt-new', PLUS, this._t('mtNewRule'), { size: S, tone: 'blue' })}
        ${this._mtRoundBtn('data-mt-run-all', PLAY2, this._t('mtRunRules'), { size: S, tone: 'green' })}
      </div>`;
    }
    if (m.tab === 'collections' && !m.colDetail) {
      return this._mtRoundBtn('data-mt-handle-all', PLAY2, this._t('mtHandleAll'), { size: S, tone: 'green', busy: !!m.handlingAll });
    }
    return '';
  }

  // Top-right button — back arrow inside editor / collection detail, else close.
  // Both share the popup-close chrome.
  _mtHdrBtnHtml() {
    const m = this._maintainerrModal;
    const isBack = !!(m?.editor || m?.colDetail || m?.cal?.dayModal);
    if (isBack) {
      const backIco = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
      return `<button class="popup-close" id="mt-hdr-back" style="position:relative;top:0;right:0;flex-shrink:0;align-self:center">${backIco}</button>`;
    }
    return `<button class="popup-close" id="mt-close" style="position:relative;top:0;right:0;flex-shrink:0;align-self:center">${ICONS.close}</button>`;
  }

}

export const maintainerrRenderMixin = _MaintainerrRenderMethods.prototype;
