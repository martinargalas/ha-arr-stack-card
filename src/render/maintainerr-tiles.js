// Maintainerr: the poster tiles in the right column and the click that opens the
// modal. Core, because the column draws them synchronously; the modal loads on
// demand (chunks/maintainerr.js).

import { fmtBytes } from '../shared/format.js';

class _MaintainerrTilesMethods {

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

  _wireMaintainerrPosters(right) {
    // Bound to the column itself, which outlives every repaint - once is enough,
    // and a second listener per paint made one click open the modal many times.
    if (!right || right._mtWired) return;
    right._mtWired = true;
    right.addEventListener('click', e => {
      const card = e.target.closest('[data-mt-open]');
      if (!card) return;
      this._openMaintainerrModal(card.dataset.mtOpen);
    });
  }


  async _mtLoadArrServers(modal) {
    if (this._maintainerrArrServers) return;
    this._maintainerrArrServers = { radarr: [], sonarr: [] };  // guard against a second call
    try {
      const [radarrSrv, sonarrSrv] = await Promise.all([
        this._hass.callApi('GET', 'arr_stack/maintainerr/settings/radarr').catch(() => null),
        this._hass.callApi('GET', 'arr_stack/maintainerr/settings/sonarr').catch(() => null),
      ]);
      this._maintainerrArrServers = {
        radarr: Array.isArray(radarrSrv) ? radarrSrv : radarrSrv ? [radarrSrv] : [],
        sonarr: Array.isArray(sonarrSrv) ? sonarrSrv : sonarrSrv ? [sonarrSrv] : [],
      };
      if (this._maintainerrModal?.overview?.dialog) this._mtLoadTab('overview', modal);
      // Deliberately no popup re-render here: the quick-actions menu preloads
      // these names when the popup opens, and rebuilding it mid-interaction
      // would close whatever drawer the user just opened.
    } catch (_) { /* labels just stay unprefixed */ }
  }
}

export const maintainerrTilesMixin = _MaintainerrTilesMethods.prototype;
