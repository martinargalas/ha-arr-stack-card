// ──────────────────────────────────────────────────────────────────────────
// Maintainerr — poster row, modal shell, 4 tabs, rule editor
// ──────────────────────────────────────────────────────────────────────────
import { ICONS, dayClass, isMobile } from '../shared/ui.js';
import { fmtBytes } from '../shared/format.js';

// Buttons match the capsule language: soft fill, hairline edge, 32px tall.
export const MT_BTN = `background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:999px;color:var(--is-text);font-size:12px;height:32px;padding:0 14px;box-sizing:border-box;cursor:pointer;outline:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-weight:600;white-space:nowrap`;
export const _ICO_CHECK = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
// Accent buttons: white label on the dark theme, tinted on the light one where
// the translucent fill goes pale. _mtBtnA() below picks the colour.
const MT_ACCENTS = {
  blue:  ['rgba(0,122,255,0.2)',   'rgba(0,122,255,0.5)',   '#007aff'],
  red:   ['rgba(248,113,113,0.14)','rgba(248,113,113,0.35)','#e5484d'],
  green: ['rgba(52,211,153,0.14)', 'rgba(52,211,153,0.35)', '#0f9d60'],
};

class _MaintainerrRenderMethods {

  // ──────────────────────────────────────────────────────────────────────────
  // Poster row — 4 cards in right panel
  // ──────────────────────────────────────────────────────────────────────────

  _renderMaintainerr() {
    const d = this._maintainerr || {};
    return `
      <div class="sec-card has-gradient" style="${this._sectionStyle()}">
        ${this._sectionOverlayHtml('maintainerr', 25, 75, 0.22)}
        <div class="col-hdr" style="margin-bottom:5px">
          ${this._appIcon('maintainerr', 24)}
          <span class="col-hdr-title">Maintainerr</span>
          <div class="col-hdr-line"></div>
        </div>
        <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8249;</button>
          <div class="tl-row">
            ${this._mtOverviewCard(d)}
            ${this._mtRulesCard(d)}
            ${this._mtCollectionsCard(d)}
            ${this._mtCalendarCard(d)}
          </div>
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8250;</button>
        </div>
      </div>`;
  }

  // ── Poster: Overview ──────────────────────────────────────────────────────

  // The libraries the Overview tab browses. Item counts would cost one content
  // request per library on every poll, so the card stays at names and types.
  _mtOverviewCard(d) {
    const libs = this._maintainerrLibraries || [];
    const _ico = t => t === 'show'
      ? `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.55"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
      : `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.55"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>`;

    const totals = this._mtLibTotals || {};
    const rows = libs.slice(0, 5).map((l, i) => {
      const sep = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      const n = totals[l.id];
      return `<div style="${sep}display:flex;align-items:center;gap:6px;padding:3px 0">
        ${_ico(l.type)}
        <span style="font-size:10px;font-weight:600;color:#fff;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(l.title || l.name || '—')}</span>
        ${n != null ? `<span style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.55);flex-shrink:0">${n}</span>` : ''}
      </div>`;
    }).join('') || `<div class="u-xxs-dim">${this._t('mtNoLibraries')}</div>`;

    // Total titles across every library, once the counts have arrived
    const sum = Object.values(totals).reduce((s, n) => s + n, 0);
    const badge = sum > 0
      ? this._uiBadge(String(sum), 'blue', { extra: 'flex-shrink:0', white: true })
      : '';

    return `<div class="tl-card u-sec-body" data-mt-open="overview">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div>
      <div class="u-row-sb">
        <span class="u-media-badge">${this._t('mtOverview')}</span>
        ${badge}
      </div>
      <div class="u-flex-rel">${rows}</div>
    </div>`;
  }

  // ── Poster: Rules ─────────────────────────────────────────────────────────

  _mtRulesCard(d) {
    const rules  = d.rules || [];
    const active = rules.filter(r => r.isActive).length;
    const total  = rules.length;

    // Rule names repeat across instances ("Deletes movie after watched" exists
    // once per Radarr), and at poster width they truncate to the same string —
    // the library is what actually tells the rows apart.
    // Two lines per rule: the name truncates to the same string across
    // instances, so the meta line carries what differs — which library it
    // watches and how many titles its collection is currently holding.
    const colById = new Map((d.collections || []).map(c => [c.id, c]));
    const rows = rules.slice(0, 4).map((r, i) => {
      const dot = r.isActive ? 'rgba(52,211,153,0.85)' : 'rgba(255,255,255,0.25)';
      const sep = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      const lib = r.libraryId != null ? this._mtLibName(r.libraryId) : '';
      const col = colById.get(r.collectionId);
      const queued = col ? (col.mediaCount ?? 0) : null;
      const meta = [lib, queued != null ? `${queued} ${this._t('mtQueuedLc')}` : '']
        .filter(Boolean).join(' · ');
      return `<div style="${sep}display:flex;align-items:flex-start;gap:6px;padding:3px 0">
        <div style="width:6px;height:6px;border-radius:50%;background:${dot};flex-shrink:0;margin-top:4px"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(r.name || '—')}</div>
          ${meta ? `<div style="font-size:9px;color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(meta)}</div>` : ''}
        </div>
      </div>`;
    }).join('') || `<div class="u-xxs-dim">${this._t('mtNoRules')}</div>`;

    const badge = this._uiBadge(`${active}/${total}`, active > 0 ? 'green' : 'neutral', { extra: 'flex-shrink:0', white: true });

    return `<div class="tl-card u-sec-body" data-mt-open="rules">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><polyline points="9 13 11 15 15 11"/></svg></div>
      <div class="u-row-sb">
        <span class="u-media-badge">${this._t('mtRules')}</span>
        ${badge}
      </div>
      <div class="u-flex-rel">${rows}</div>
    </div>`;
  }

  // ── Poster: Collections ───────────────────────────────────────────────────

  _mtCollectionsCard(d) {
    const cols  = d.collections || [];
    // mediaCount is authoritative; media[] is truncated to two rows per
    // collection by /collections, so counting it under-reports badly
    const items = cols.reduce((s, c) => s + (c.mediaCount ?? 0), 0);
    const bytes = cols.reduce((s, c) => s + (c.totalSizeBytes || 0), 0);

    // The number worth surfacing is how much space each collection will free —
    // a bare item count says nothing about whether it is worth running.
    const rows = cols.slice(0, 4).map((c, i) => {
      const sep = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      const cnt = c.mediaCount ?? 0;
      const lib = c.libraryId != null ? this._mtLibName(c.libraryId) : '';
      // Size rides on the title line, not the meta line: the titles repeat and
      // truncate anyway, so the width comes out of something already lost —
      // whereas on the meta line it pushed "N queued" off the end.
      const size = c.totalSizeBytes ? fmtBytes(c.totalSizeBytes, { dec: 0 }) : '';
      const meta = [lib, `${cnt} ${this._t('mtQueuedLc')}`].filter(Boolean).join(' · ');
      return `<div style="${sep}padding:3px 0">
        <div style="display:flex;align-items:baseline;gap:6px">
          <span style="font-size:10px;font-weight:600;color:#fff;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(c.title || c.name || '—')}</span>
          ${size ? `<span style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.6);flex-shrink:0">${size}</span>` : ''}
        </div>
        <div style="font-size:9px;color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(meta)}</div>
      </div>`;
    }).join('') || `<div class="u-xxs-dim">${this._t('mtNoCollections')}</div>`;

    const badge = bytes > 0
      ? this._uiBadge(fmtBytes(bytes, { dec: 0 }), 'amber', { extra: 'flex-shrink:0', white: true, title: `${items} ${this._t('mtQueuedLc')}` })
      : (items > 0
        ? this._uiBadge(String(items), 'amber', { extra: 'flex-shrink:0', white: true })
        : '');

    return `<div class="tl-card u-sec-body" data-mt-open="collections">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg></div>
      <div class="u-row-sb">
        <span class="u-media-badge">${this._t('mtCollections')}</span>
        ${badge}
      </div>
      <div class="u-flex-rel">${rows}</div>
    </div>`;
  }

  // ── Poster: Calendar ──────────────────────────────────────────────────────

  // The cron schedules this used to show are a Maintainerr setting, not news.
  // What the tab is actually about is which titles disappear next, so the card
  // previews the same deletion queue grouped by day.
  _mtCalendarCard(d) {
    const items = this._mtDelItems;
    const DAY = 86400000;
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const today = midnight.getTime();

    let rows;
    if (!items) {
      rows = `<div class="u-xxs-dim">${this._t('loading')}</div>`;
    } else {
      // Anything already past due is still queued until Maintainerr next runs,
      // so it belongs on today's row rather than in a bucket nobody will see.
      const byDay = new Map();
      for (const it of items) {
        const key = Math.max(today, new Date(it.due).setHours(0, 0, 0, 0));
        byDay.set(key, (byDay.get(key) || 0) + 1);
      }
      const days = [...byDay.entries()].sort((a, b) => a[0] - b[0]).slice(0, 4);
      rows = days.map(([ms, n], i) => {
        const sep = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
        const inDays = Math.round((ms - today) / DAY);
        const label = inDays === 0 ? this._t('mtToday')
          : inDays === 1 ? this._t('mtTomorrow')
          : new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        // Imminent deletions get the same red the poster "Gone" pill uses
        const clr = inDays <= 1 ? 'rgba(255,69,58,0.95)' : '#fff';
        return `<div style="${sep}display:flex;align-items:center;gap:6px;padding:3px 0">
          <span style="font-size:10px;font-weight:600;color:${clr};flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(label)}</span>
          <span style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.55);flex-shrink:0">${n}</span>
        </div>`;
      }).join('') || `<div class="u-xxs-dim">${this._t('mtNoActions')}</div>`;
    }

    // Bare count, like Overview — "49 scheduled" overflows the poster next to
    // the Calendar label, and the word adds nothing the tab title doesn't say.
    const badge = items?.length
      ? this._uiBadge(String(items.length), 'blue', { extra: 'flex-shrink:0', white: true, title: `${items.length} ${this._t('mtScheduled')}` })
      : '';

    return `<div class="tl-card u-sec-body" data-mt-open="calendar">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
      <div class="u-row-sb">
        <span class="u-media-badge">${this._t('mtCalendar')}</span>
        ${badge}
      </div>
      <div class="u-flex-rel">${rows}</div>
    </div>`;
  }

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

  _mtLibName(libraryId) {
    const libs = this._maintainerrLibraries || [];
    const lib = libs.find(l => String(l.id) === String(libraryId));
    return lib?.title || lib?.name || `Lib ${libraryId}`;
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

  // Maintainerr stores when an item entered a collection, not when it leaves —
  // the deletion date is addDate + the collection's deleteAfterDays.
  _mtDueMs(addDate, deleteAfterDays) {
    if (!addDate || !deleteAfterDays) return null;
    const added = new Date(addDate).getTime();
    if (!Number.isFinite(added)) return null;
    return added + deleteAfterDays * 86400000;
  }

  // Near-term deletions read better as words ("gone tomorrow") than as a count;
  // anything further out is clearer as the actual date.
  _mtGoneText(days, dueMs, compact) {
    const lang = this._lg();
    const cs = lang === 'cs', fr = lang === 'fr';
    if (compact) return days === 0 ? (cs ? 'DNES' : fr ? 'AUJOURD’HUI' : 'TODAY') : `${days}${fr ? 'J' : 'D'}`;
    if (days === 0) return cs ? 'MIZÍ DNES' : fr ? 'SUPPRIMÉ AUJOURD’HUI' : 'GONE TODAY';
    if (days === 1) return cs ? 'MIZÍ ZÍTRA' : fr ? 'SUPPRIMÉ DEMAIN' : 'GONE TOMORROW';
    if (days <= 5) return cs ? `MIZÍ ZA ${days} ${days < 5 ? 'DNY' : 'DNÍ'}` : fr ? `SUPPRIMÉ DANS ${days} JOURS` : `GONE IN ${days} DAYS`;

    const d = new Date(dueMs);
    if (cs) return `MIZÍ ${d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}`.toUpperCase();
    if (fr) return `SUPPRIMÉ LE ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`.toUpperCase();
    const dd = d.getDate();
    const tens = dd % 100;
    const suf = (tens >= 11 && tens <= 13) ? 'th'
      : dd % 10 === 1 ? 'st' : dd % 10 === 2 ? 'nd' : dd % 10 === 3 ? 'rd' : 'th';
    return `GONE ${d.toLocaleDateString('en-US', { month: 'long' })} ${dd}${suf}`.toUpperCase();
  }

  // Red while deletion is imminent, amber once it is more than a work-week out
  // `prefix` names the exact thing being deleted (a season, say) and goes on
  // its own line, so "Season 4 / GONE AUGUST 25TH" reads as one statement.
  _mtDelBadge(dueMs, compact, prefix = '', stretch = false) {
    if (dueMs == null) return '';
    // "Never" means nowhere, Maintainerr's own tabs included
    if (this._posterCfg().goneTag === 'off') return '';
    const days = Math.max(0, Math.ceil((dueMs - Date.now()) / 86400000));
    // One colour for every horizon — a deletion is a deletion, and the amber
    // variant read as a milder warning than it was.
    const bg = 'radial-gradient(circle at 50% 50%, #ff3b30 0%, #ff2d20 38%, #8e1410 100%)';
    const full = prefix ? `${prefix} — ${this._mtGoneText(days, dueMs, false)}` : this._mtGoneText(days, dueMs, false);
    // "GONE AUGUST 26TH" is wider than a poster at 11px/nowrap, and clipping it
    // looked like a rendering fault. Wrapping keeps it inside; spanning the
    // poster's full width between the type tag's margins buys back a size.
    const base = `font-size:10px;font-weight:800;letter-spacing:0.02em;color:#fff;background:${bg};border:1px solid #ff3b30;border-radius:5px;max-width:100%;box-sizing:border-box;white-space:normal;text-align:center;line-height:1.2;box-shadow:0 2px 8px rgba(0,0,0,0.45)${stretch ? ';flex:1' : ''}`;

    if (prefix && compact) {
      return `<span title="${this._escHtml(full)}" style="${base};padding:3px 6px">${this._escHtml(prefix)} ${this._escHtml(this._mtGoneText(days, dueMs, true))}</span>`;
    }
    if (prefix) {
      return `<span title="${this._escHtml(full)}" style="${base};display:inline-flex;flex-direction:column;align-items:center;gap:2px;padding:3px 6px">
        <span>${this._escHtml(prefix)}</span>
        <span>${this._escHtml(this._mtGoneText(days, dueMs, false))}</span>
      </span>`;
    }
    return `<span title="${this._escHtml(full)}" style="${base};padding:3px 6px">${this._escHtml(this._mtGoneText(days, dueMs, compact))}</span>`;
  }

  _mtExclBadge(compact) {
    const ico = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="flex-shrink:0"><circle cx="12" cy="12" r="9"/><line x1="5.6" y1="5.6" x2="18.4" y2="18.4"/></svg>`;
    const txt = compact ? '' : `<span>${this._t('mtExcluded')}</span>`;
    return `<span class="media-type-tag" title="${this._t('mtExcluded')}" style="position:static;display:inline-flex;align-items:center;gap:3px;background:rgba(52,211,153,0.30);color:#fff">${ico}${txt}</span>`;
  }

  // Two-option pill switch. `animatePrev` renders it still showing the old
  // choice so the wire layer can flip it next frame and let the fill slide —
  // a freshly inserted element would jump straight to its end state.
  _mtSegmented(attr, opts, current, { icons = false, animatePrev = false, width = null, accent = null, prev = null, accentAlpha = null } = {}) {
    const varW = opts.some(o => o.w);
    if (varW) {
      const ws = opts.map(o => o.w || width || 44);
      const xs = ws.map((_, i) => ws.slice(0, i).reduce((a, b) => a + b, 0));
      const to = Math.max(0, opts.findIndex(o => o.v === current));
      const fromIdx = prev != null ? opts.findIndex(o => o.v === prev) : -1;
      const from = animatePrev ? (fromIdx >= 0 ? fromIdx : (to === 0 ? 1 : 0)) : to;
      // A half with no explicit width sizes itself around its content; the
      // indicator is measured off the real halves afterwards (_syncSegVars),
      // so nothing here has to guess how wide an icon pair comes out.
      const halves = opts.map((o, i) =>
        `<span class="mt-seg-half${o.disabled ? ' is-disabled' : ''}" ${o.attr || ''} style="${o.w ? `width:${o.w}px` : 'width:auto;padding:0 9px'}" title="${this._escHtml(o.label)}">${o.icon || this._escHtml(o.label)}</span>`
      ).join('');
      const vars = [
        ...ws.map((w, i) => `--w${i}:${w}px`),
        ...xs.map((x, i) => `--x${i}:${x}px`),
        accent ? `--seg-accent:rgba(${accent},${accentAlpha ?? (this._isDay ? 0.85 : 0.5)});--seg-accent-bdr:rgba(${accent},${this._isDay ? 0.95 : 0.8})` : '',
      ].filter(Boolean).join(';');
      // Fresh markup carries only the caller's guess at the widths; the real
      // ones arrive a frame later from _syncSegVars. With the indicator's
      // transition live, that correction plays as a slide — on every peanut on
      // the page, every time any section re-renders. It is muted until synced.
      return `<div class="mt-seg mt-seg--var mt-seg--presync${icons ? ' mt-seg--icon' : ''}" ${attr} data-seg="${from}" data-seg-to="${to}" style="${vars}">
        <span class="mt-seg-ind"></span>
        ${halves}
      </div>`;
    }
    const to = Math.max(0, opts.findIndex(o => o.v === current));
    const fromIdx = prev != null ? opts.findIndex(o => o.v === prev) : -1;
    const from = animatePrev ? (fromIdx >= 0 ? fromIdx : (to === 0 ? 1 : 0)) : to;
    const halves = opts.map(o =>
      `<span class="mt-seg-half${o.disabled ? ' is-disabled' : ''}" ${o.attr || ''} title="${this._escHtml(o.label)}">${o.icon || this._escHtml(o.label)}</span>`
    ).join('');
    const vars = [
      width ? `--seg-w:${width}px` : '',
      // Same reasoning as _tabFill: the selected half's label is white, so day
      // mode needs a fill solid enough to carry it.
      // accentAlpha lets a caller match the header nav's near-solid fill; the
      // default stays translucent, which is what a peanut on a card wants.
      accent ? `--seg-accent:rgba(${accent},${accentAlpha ?? (this._isDay ? 0.85 : 0.5)});--seg-accent-bdr:rgba(${accent},${this._isDay ? 0.95 : 0.8})` : '',
    ].filter(Boolean).join(';');
    return `<div class="mt-seg${icons ? ' mt-seg--icon' : ''}" ${attr} data-seg="${from}" data-seg-to="${to}"${vars ? ` style="${vars}"` : ''}>
      <span class="mt-seg-ind"></span>
      ${halves}
    </div>`;
  }

  // The indicator of a variable-width peanut is a single absolutely positioned
  // pill, so it can only follow the halves if it is told their real geometry.
  // Measuring beats the widths the caller guessed: an icon pair renders wider
  // or narrower than any number written by hand, and then the fill sits off.
  _syncSegVars(scope) {
    (scope || this.shadowRoot)?.querySelectorAll('.mt-seg--var').forEach(seg => {
      const halves = [...seg.querySelectorAll('.mt-seg-half')];
      if (!halves.length) return;
      const base = halves[0].offsetLeft;
      halves.forEach((h, i) => {
        seg.style.setProperty(`--w${i}`, `${h.offsetWidth}px`);
        seg.style.setProperty(`--x${i}`, `${h.offsetLeft - base}px`);
      });
      if (seg.classList.contains('mt-seg--presync')) {
        // Reflow first, so the corrected geometry is what the transition is
        // switched back on over — not something it animates from.
        void seg.offsetWidth;
        seg.classList.remove('mt-seg--presync');
      }
    });
  }

  // Icons used by the view switches
  get _mtSegIcons() {
    const F = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" style="display:block"';
    return {
      cards: `<svg ${F}><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>`,
      table: `<svg ${F}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
      // Both keep the calendar frame and differ only in what fills it: one band
      // for a week, a grid of days for a month.
      week: `<svg ${F}><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><rect x="5.5" y="12" width="13" height="3.5" rx="1" fill="currentColor" stroke="none"/></svg>`,
      month: `<svg ${F}><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><g fill="currentColor" stroke="none"><circle cx="7.5" cy="12.5" r="1.15"/><circle cx="12" cy="12.5" r="1.15"/><circle cx="16.5" cy="12.5" r="1.15"/><circle cx="7.5" cy="16.5" r="1.15"/><circle cx="12" cy="16.5" r="1.15"/><circle cx="16.5" cy="16.5" r="1.15"/></g></svg>`,
      // Same glyphs the Library type filter uses, so a film strip means movies
      // and a set means TV wherever the switch appears
      movie: `<svg ${F}><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/></svg>`,
      tv: `<svg ${F}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
      music: `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="display:block"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/></svg>`,
    };
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────
  // One translucent capsule instead of three outlined boxes. The native select
  // stays, but only as an invisible hit target on top of our own trigger — the
  // OS-drawn chevron and font were what made the row look unstyled. Keeping its
  // id means the delegated change handlers need no rewiring.

  // `neutral` is the value that means "not filtering" — on it the trigger goes
  // muted, so the accent is left to say which filters are actually set.
  _mtSelect(id, items, current, neutral = null) {
    const cur = String(current ?? '');
    const found = items.find(([v]) => String(v) === cur);
    const label = found ? found[1] : (items[0]?.[1] || '');
    const off = neutral != null && cur === String(neutral);
    const opts = items.map(([v, l]) =>
      `<option value="${this._escHtml(String(v))}"${String(v) === cur ? ' selected' : ''}>${this._escHtml(l)}</option>`).join('');
    const chev = `<svg class="mt-tb-chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    return `<span class="mt-tb-sel${off ? ' is-off' : ''}">
      <span class="mt-tb-lbl">${this._escHtml(label)}</span>${chev}
      <select id="${id}">${opts}</select>
    </span>`;
  }

  // Matches the reduced body padding poster views use, so the bar sits centred
  // between the header and the grid.
  get _mtToolbarGap() { return 8; }

  // The toolbar's select reduced to a bare label; forms need the same control
  // wearing field chrome — full width, soft fill, chevron pinned right.
  _mtFieldSelect(id, items, current, extra = '') {
    const cur = String(current ?? '');
    const found = items.find(([v]) => String(v) === cur);
    const label = found ? found[1] : (items[0]?.[1] || '');
    const opts = items.map(([v, l]) =>
      `<option value="${this._escHtml(String(v))}"${String(v) === cur ? ' selected' : ''}>${this._escHtml(l)}</option>`).join('');
    return this._mtFieldSelectRaw(`id="${id}"`, opts, label, extra);
  }

  // The rule editor's selects carry data-attributes rather than ids and build
  // their options with optgroups, so they hand over ready-made option HTML and
  // the label they want shown. Same capsule either way.
  _mtFieldSelectRaw(attrs, optsHtml, label, extra = '') {
    const chev = `<svg class="mt-tb-chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    return `<span class="mt-field mt-fsel" style="${extra}">
      <span class="mt-fsel-lbl">${this._escHtml(label ?? '')}</span>${chev}
      <select ${attrs}>${optsHtml}</select>
    </span>`;
  }

  // A select entry may hand over ready-made HTML instead of items — the Library's
  // sort is a custom dropdown, because a native select cannot report the same
  // option being picked twice, which is how the direction is toggled.
  _mtToolbar(searchId, searchValue, selects, placeholder, style = '') {
    const ico = `<svg class="mt-tb-ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    // `neutral` marks the value that means "not filtering", so the accent is
    // left to say which filters are actually narrowing anything.
    const ctrls = selects.filter(Boolean).map(s => s.html ?? this._mtSelect(s.id, s.items, s.value, s.neutral ?? null)).join('');
    const search = searchId
      ? `${ico}<input id="${searchId}" class="mt-tb-input" type="search" value="${this._escHtml(searchValue || '')}" placeholder="${placeholder ?? this._t('mtSearch')}" autocomplete="off">`
      : '';
    return `<div class="mt-tb"${style ? ` style="${style}"` : ''}>
      ${search}
      ${ctrls ? `${search ? '<span class="mt-tb-sep"></span>' : ''}${ctrls}` : ''}
    </div>`;
  }

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

  // Maintainerr names a collection after its rule, and the same rule duplicated
  // for a second Radarr/Sonarr instance produces two identically named ones.
  // Prefix with the arr server, but only where the ambiguity actually exists.
  _mtColLabel(c, all) {
    const base = c.title || c.name || `#${c.id}`;
    const same = (all || []).filter(x => (x.title || x.name || `#${x.id}`) === base);
    if (same.length < 2) return base;
    const srv = this._mtArrServerName(c);
    return srv ? `${srv} — ${base}` : base;
  }

  _mtArrServerName(c) {
    const rule = (this._maintainerr?.rules || []).find(r => r.collectionId === c.id);
    const rId  = c.radarrSettingsId ?? rule?.radarrSettingsId ?? null;
    const sId  = c.sonarrSettingsId ?? rule?.sonarrSettingsId ?? null;
    const srv  = this._maintainerrArrServers || {};
    const list = rId != null ? (srv.radarr || []) : sId != null ? (srv.sonarr || []) : [];
    const want = rId != null ? rId : sId;
    if (want == null) return null;
    const hit = list.find(x => String(x.id) === String(want));
    if (!hit) return null;
    // Prefer the user's own Seerr naming so every instance reads the same across
    // the card. Maintainerr keys its servers on its own ids, so the only reliable
    // join between the two is the address they both point at.
    return this._seerrNameForHost(hit, rId != null ? 'radarr' : 'sonarr')
        || hit.name || hit.serverName || null;
  }

  _seerrNameForHost(srvEntry, kind) {
    const hosts = this._arrHosts || {};
    if (!Object.keys(hosts).length) return null;
    const raw = srvEntry?.url || srvEntry?.hostname || srvEntry?.host || '';
    let want = '';
    try {
      const u = new URL(/^https?:\/\//.test(raw) ? raw : `http://${raw}`);
      const port = u.port || (srvEntry?.port ? String(srvEntry.port) : (u.protocol === 'https:' ? '443' : '80'));
      want = `${u.hostname.toLowerCase()}:${port}`;
    } catch (_) { return null; }
    const first  = kind === 'radarr' ? 'radarr'  : 'sonarr';
    const second = kind === 'radarr' ? 'radarr2' : 'sonarr2';
    const [l1, l2] = this._arrInstLabels(kind);
    if (hosts[first]  === want) return l1;
    if (hosts[second] === want) return l2;
    return null;
  }

  // Same rules the detail popup uses for its instance chips: the 4K flag wins,
  // then the Seerr names but only when both are set and short, else generic.
  _arrInstLabels(kind) {
    const MAX = 10;
    const isRadarr = kind === 'radarr';
    const s1 = isRadarr ? this._seerrRadarr  : this._seerrSonarr;
    const s2 = isRadarr ? this._seerrRadarr2 : this._seerrSonarr2;
    if (s2?.is4k) return ['HD', '4K'];
    const n1 = s1?.name, n2 = s2?.name;
    if (n1 && n2 && n1.length <= MAX && n2.length <= MAX) return [n1, n2];
    return isRadarr ? ['Radarr 1', 'Radarr 2'] : ['Sonarr 1', 'Sonarr 2'];
  }

  // Overview posters reuse the library grid's chrome (.mc shell, gradient
  // footer, rating + status badges) so both views read the same. Size and
  // quality-profile tags are dropped — neither is relevant to a deletion queue.
  // One season reads better spelled out; several are compressed to S01-S03,
  // falling back to a list when the numbers are not consecutive.
  _mtSeasonLabel(seasons) {
    const list = [...new Set((seasons || []).filter(n => n != null))].sort((a, b) => a - b);
    if (!list.length) return '';
    if (list.length === 1) return `${this._t('mtSeason')} ${list[0]}`;
    const pad = n => `S${String(n).padStart(2, '0')}`;
    const contiguous = list.every((n, i) => i === 0 || n === list[i - 1] + 1);
    return contiguous ? `${pad(list[0])}-${pad(list[list.length - 1])}` : list.map(pad).join(', ');
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
      ? ` data-mt-popup="${isMovie ? 'movie' : 'tv'}"${tmdb ? ` data-tmdbid="${tmdb}"` : ''}${tvdb ? ` data-tvdbid="${tvdb}"` : ''} data-title="${title}"`
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

  // Round action button in the same family as the header's back/close controls.
  // Text moves to `title`, so keep these to actions whose icon is unambiguous
  // within their own view.
  _mtRoundBtn(attr, icon, title, { size = 28, tone = 'blue', busy = false, active = true, disabled = false } = {}) {
    const off = busy || disabled;
    // A white glyph over a 30%-alpha tint disappears on a light background, so
    // day mode keeps the tint as the fill and paints the glyph in the solid
    // brand colour instead.
    const day = this._isDay;
    const TONES = {
      blue:  ['0,122,255',  '0.50', '0.30', '#0060df'],
      green: ['52,211,153', '0.50', '0.28', '#0b7c4c'],
      red:   ['248,113,113', '0.50', '0.28', '#d1373c'],
    };
    const [rgb, bdrA, bgA, solid] = TONES[tone] || TONES.blue;
    const sty = active
      ? (day
        ? `border:1px solid rgba(${rgb},0.65);background:rgba(${rgb},0.18);color:${solid}`
        : `border:1px solid rgba(${rgb},${bdrA});background:rgba(${rgb},${bgA});color:#fff`)
      : 'border:1px solid var(--is-divider);background:var(--is-btn-bg);color:var(--is-text-muted)';
    return `<button ${attr} title="${this._escHtml(title)}"${off ? ' disabled' : ''} style="width:${size}px;height:${size}px;padding:0;border-radius:50%;cursor:${off ? 'default' : 'pointer'};display:flex;align-items:center;justify-content:center;line-height:0;flex-shrink:0;transition:background 0.15s,color 0.15s;backdrop-filter:blur(8px);${disabled && !busy ? 'opacity:0.55;' : ''}${sty}">${busy ? '<span class="is-spin"></span>' : icon}</button>`;
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

  _mtBtnA(kind) {
    const [bg, bdr, tint] = MT_ACCENTS[kind] || MT_ACCENTS.blue;
    const color = this._isDay ? tint : '#fff';
    return `${MT_BTN};background:${bg};border-color:${bdr};color:${color};font-weight:700`;
  }

  _mtGridCalc(cd, toolbarH = 90) {
    const isMob = this._isMob;
    const m = this._maintainerrModal;
    const vH = window.innerHeight;
    const vW = window.innerWidth;
    const bodyPX = isMob ? 20 : 40;
    const gap = 14;
    // Phones have no column slider, and the "Gone <date>" pill needs the poster
    // width — so the count is pinned to two rather than following the desktop
    // preference.
    const MT_COLS_MIN = isMob ? 2 : 3, MT_COLS_MAX = isMob ? 2 : 12;

    // Once the grid is on screen its wrapper reports the real box. The estimate
    // below only covers the very first paint — it is deliberately pessimistic,
    // which used to cost a whole row of posters.
    const contentW = m?._gridW || (Math.min(1100, vW * 0.96) - bodyPX);
    const availH = m?._gridAvailH || (vH * 0.88 - 60 - 24 - toolbarH - 48);

    let cols;
    if (cd._mtCols) {
      cols = cd._mtCols;
    } else {
      const saved = parseInt(localStorage.getItem('arr-mt-cols'));
      if (saved >= 3 && saved <= 12) {
        cols = saved;
      } else {
        const minW = isMob ? 70 : 110;
        const maxC = Math.floor((contentW + gap) / (minW + gap));
        cols = Math.max(isMob ? 3 : 4, Math.min(maxC, 8));
      }
      cd._mtCols = cols;
    }
    cols = Math.max(MT_COLS_MIN, Math.min(MT_COLS_MAX, cols));
    const posterW = (contentW - gap * (cols - 1)) / cols;
    const posterH = posterW * 1.5;
    // Sub-pixel poster heights can leave a row a fraction short of fitting
    let rowsFit = Math.max(1, Math.floor((availH + gap + 1) / (posterH + gap)));

    // On a phone two columns fill the width with posters too tall for a second
    // row, leaving half the modal empty. Size them from the available height
    // instead and centre the narrower grid — a 2x2 page beats a 2x1 one.
    let gridMaxW = null;
    if (isMob && rowsFit < 2) {
      const fitH = (availH - gap) / 2;
      const fitW = fitH / 1.5;
      const wanted = cols * fitW + gap * (cols - 1);
      if (fitW > 40 && wanted <= contentW) {
        gridMaxW = Math.floor(wanted);
        rowsFit = 2;
      }
    }

    const perPage = cols * rowsFit;
    return { cols, perPage, gap, gridMaxW };
  }

  _mtDragHandleHtml(cd, isMob) {
    if (isMob) return '';
    const MT_COLS_MIN = 3, MT_COLS_MAX = 12, TRACK_W = 120, INSET = 7;
    const cur = cd._mtCols || 7;
    const thumbPx = Math.round((cur - MT_COLS_MIN) / (MT_COLS_MAX - MT_COLS_MIN) * (TRACK_W - INSET * 2)) + INSET;
    // White-on-white washed the whole control out in day mode; the track, the
    // filled portion and the knob each need an opaque counterpart.
    const day = this._isDay;
    const track = day ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.18)';
    const fill  = day ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.45)';
    const knob  = day ? '#ffffff' : 'rgba(255,255,255,0.85)';
    const knobBdr = day ? 'border:1px solid rgba(0,0,0,0.30);' : '';
    const shadow = day ? '0 1px 3px rgba(0,0,0,0.30)' : '0 1px 4px rgba(0,0,0,0.4)';
    return `<div id="mt-drag-handle" style="position:absolute;right:0;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:6px;padding:6px 0 6px 8px;touch-action:none;user-select:none;cursor:ew-resize">
      <div id="mt-drag-track" style="position:relative;width:${TRACK_W}px;height:3px;background:${track};border-radius:2px;cursor:ew-resize">
        <div style="position:absolute;top:0;left:0;width:${thumbPx}px;height:100%;background:${fill};border-radius:2px;pointer-events:none"></div>
        <div id="mt-drag-thumb" style="position:absolute;top:50%;left:${thumbPx}px;transform:translateY(-50%);width:15px;height:15px;border-radius:50%;background:${knob};${knobBdr}box-shadow:${shadow};pointer-events:none;margin-left:-7px;box-sizing:border-box"></div>
      </div>
    </div>`;
  }

}

export const maintainerrRenderMixin = _MaintainerrRenderMethods.prototype;
