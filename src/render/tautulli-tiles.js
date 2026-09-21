// Tautulli: the poster tiles in the right column and the click that opens the
// modal. Core, because the column draws them synchronously; the modal loads on
// demand (chunks/tautulli.js).

class _TautulliTilesMethods {

  _renderTautulli() {
    const data     = this._tautulli || {};
    const act      = data.activity  || {};
    const stats    = data.stats     || [];
    const showWarn = data.sharingDetected && !data.sharingAcked;
    return `
      <div class="sec-card has-gradient" style="${this._sectionStyle()}">
        ${this._sectionOverlayHtml('tautulli', 25, 75, 0.23)}
        <div class="col-hdr" style="margin-bottom:5px">
          ${this._appIcon('tautulli', 24)}
          <span class="col-hdr-title">${this._t('tlStatisticsPlex')}</span>
          <div class="col-hdr-line"></div>
        </div>
        <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8249;</button>
          <div class="tl-row">
            ${this._tlLibCard(data)}
            ${showWarn ? this._tlSharingCard(data) : this._tlUsersCard(stats, act, data)}
            ${this._tlHistoryCard(data)}
            ${this._tlActivityCard(data.playsData)}
          </div>
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8250;</button>
        </div>
      </div>`;
  }

  _tlActivityCard(playsData) {
    const days  = (playsData || []).slice(-7);
    const max   = Math.max(...days.map(d => d.value || 0), 1);
    const total = days.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const today = new Date().getDate();
    const bars  = days.map(d => {
      const h   = Math.max(d.value ? 4 : 0, Math.round((d.value || 0) / max * 100));
      const gap = 100 - h;
      const isToday = d.date && parseInt((d.date || '').slice(-2), 10) === today;
      const bar = d.value
        ? `<div style="flex:${h};background:linear-gradient(to bottom,rgba(255,255,255,0.75),rgba(255,255,255,0.3));border-radius:3px 3px 0 0"></div>`
        : `<div style="flex:${h};display:none"></div>`;
      return `<div style="flex:1;display:flex;flex-direction:column;padding:0 1.5px"><div style="flex:${gap}"></div>${bar}</div>`;
    }).join('');
    const labels = days.map(d => {
      const day = this._escHtml((d.date || '').slice(-2));
      const isToday = parseInt(day, 10) === today;
      return `<div style="flex:1;font-size:7px;font-weight:${isToday ? '700' : '500'};color:${isToday ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)'};text-align:center;padding:2px 0 0">${day}</div>`;
    }).join('');
    const playsTag = total > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(99,179,237,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${total} ${this._t('tlPlays')}</span>`
      : '';
    return `<div class="tl-card u-sec-body" data-tl-open="graphs">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg></div>
      <div class="u-row-sb-w">
        <div style="display:flex;flex-direction:column;gap:1px">
          <span class="u-media-badge">${this._t('tlCharts')}</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.28);font-style:italic">${this._t('tlLast7Days')}</span>
        </div>
        ${playsTag}
      </div>
      <div style="flex:1;display:flex;flex-direction:column;position:relative;z-index:2;min-height:0">
        <div style="flex:1;display:flex;gap:0">${bars || ''}</div>
        <div style="height:1px;background:rgba(255,255,255,0.08);margin:1px 0"></div>
        <div style="display:flex;gap:0;margin-top:1px">${labels}</div>
      </div>
    </div>`;
  }

  _tlHistoryCard(data) {
    const hist    = data.recentHistory || [];
    const tlMax   = this._actCardMax('tl-history');
    const streams = Number((data.activity || {}).stream_count) || 0;
    const items   = hist.length === 0
      ? `<div class="u-xxs-dim">${this._t('tlNoHistory')}</div>`
      : hist.map((h, i) => {
          const title  = this._escHtml(h.full_title || h.title || '—');
          const user   = this._escHtml(h.friendly_name || h.user || '');
          const ago    = h.date ? this._tlFmtDate(h.date) : '';
          const sep    = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
          const hidden = i >= tlMax ? 'display:none;' : '';
          return `<div style="${hidden}${sep}padding:4px 0"><div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div><div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:1px">${user}${ago ? ' · ' + ago : ''}</div></div>`;
        }).join('');
    const streamTag = streams > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(52,211,153,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${streams} ${this._t('tlNow')}</span>`
      : '';
    return `<div class="tl-card u-sec-body" data-tl-open="history">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div class="u-row-sb-w">
        <span class="u-media-badge">${this._t('tlHistory')}</span>
        ${streamTag}
      </div>
      <div data-act-content class="u-flex-ovh-rel">${items}</div>
    </div>`;
  }

  _tlLibCard(data) {
    const libs = (data.libraries || []).filter(lib => (lib.section_type || '').toLowerCase() !== 'live');
    const rows = libs.map((lib, i) => {
      const type  = (lib.section_type || '').toLowerCase();
      const count = Number(lib.count ?? lib.plays) || 0;
      const dim   = count === 0 ? ';opacity:0.28' : '';
      const sep   = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      return `<div style="${sep}display:flex;align-items:center;gap:5px;padding:4px 0">`
        + this._tlLibSvgIcon(type, lib.section_name, 'sm')
        + `<span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;margin-left:1px">${this._escHtml(lib.section_name || '—')}</span>`
        + `<span style="font-size:10px;font-weight:700;color:#fff;flex-shrink:0${dim}">${count}</span>`
        + `</div>`;
    }).join('') || `<div class="u-xxs-dim">${this._t('tlNoData')}</div>`;
    const sectTag = libs.length > 0
      ? `<span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.12);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${libs.length}</span>`
      : '';
    return `<div class="tl-card u-sec-body" data-tl-open="libraries">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
      <div class="u-row-sb-w">
        <span class="u-media-badge">${this._t('tlLibraries')}</span>
        ${sectTag}
      </div>
      <div class="u-flex-rel">${rows}</div>
    </div>`;
  }

  _tlSharingCard(data) {
    const name = this._escHtml((data.sharingUsers || [])[0] || this._t('tlUnknown'));
    return `<div class="tl-card tl-card-warn" data-tl-open="users">
      <span class="media-type-tag" style="color:#fff">${this._t('tlSharing')}</span>
      <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(70,0,0,0.95) 0%,rgba(40,0,0,0.65) 55%,transparent 100%);padding:48px 8px 8px;z-index:1">
        <div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px">${name}</div>
        <div style="font-size:9px;color:rgba(255,150,150,0.7)">${this._t('tlSharingHint')}</div>
      </div>
    </div>`;
  }

  _tlUsersCard(stats, act, data) {
    const userRows = (stats || []).find(s => s.stat_id === 'top_users')?.rows || [];
    const sessions    = act?.sessions || [];
    const activeUsers = new Set(sessions.map(s => s.user_id || s.user)).size;
    const items    = userRows.slice(0, 5).map(r => {
      const name  = this._escHtml(r.friendly_name || r.user || '—');
      const plays = Number(r.total_plays) || 0;
      const thumb = this._imgSrc(r.user_thumb);
      const av    = thumb
        ? `<img src="${thumb}" style="width:14px;height:14px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.18)" loading="lazy" onerror="this.style.display='none'">`
        : `<span style="width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,0.14);display:inline-block;flex-shrink:0"></span>`;
      const sep = userRows.indexOf(r) > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      return `<div style="${sep}display:flex;align-items:center;gap:6px;padding:4px 0">${av}<span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${name}</span><span style="font-size:10px;font-weight:700;color:#fff;flex-shrink:0">${plays}</span></div>`;
    }).join('') || `<div style="font-size:9px;color:rgba(255,255,255,0.3)">${this._t('tlNoData')}</div>`;
    const activeTag = activeUsers > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(52,211,153,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${activeUsers} ${this._t('tlActive')}</span>`
      : '';
    return `<div class="tl-card u-sec-body" data-tl-open="users">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;position:relative;z-index:2;gap:4px;flex-wrap:nowrap">
        <div style="display:flex;flex-direction:column;gap:2px">
          <span class="u-media-badge">${this._t('tlUsers')}</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.28);font-style:italic;padding-left:2px">${this._t('tlLast7Days')}</span>
        </div>
        ${activeTag}
      </div>
      <div class="u-flex-rel">${items}</div>
    </div>`;
  }

  _tlFmtDate(ts) {
    if (!ts) return '—';
    const d   = new Date(typeof ts === 'number' ? ts * 1000 : ts);
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60)     return 'just now';
    if (sec < 3600)   return Math.floor(sec / 60) + 'm ago';
    if (sec < 86400)  return Math.floor(sec / 3600) + 'h ago';
    if (sec < 604800) return Math.floor(sec / 86400) + 'd ago';
    return d.toLocaleDateString(this._locale);
  }

  _tlLibSvgIcon(type, name, size) {
    const sm  = size !== 'md';
    const sz  = sm ? 10 : 15;
    const clr = 'var(--is-text-sec)';
    const sty = sm ? `flex-shrink:0;color:${clr}` : `vertical-align:middle;margin-right:7px;flex-shrink:0;color:${clr}`;
    const isPodcast = type === 'podcast' || (name || '').toLowerCase().includes('podcast');
    const s   = `stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    const w   = p => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${sz}" height="${sz}" ${s} style="${sty}">${p}</svg>`;
    if (type === 'movie')  return w('<rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/>');
    if (type === 'show')   return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="currentColor" style="${sty}"><path d="M21,3H3A2,2 0 0,0 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,1 23,17V5A2,2 0 0,1 21,3M21,17H3V5H21V17Z"/></svg>`;
    if (isPodcast)         return w('<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>');
    if (type === 'artist') return w('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>');
    return w('<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>');
  }

  _wireTautulliPosters(right) {
    // Bound to the column itself, which outlives every repaint - once is enough,
    // and a second listener per paint made one click open the modal many times.
    if (!right || right._tlWired) return;
    right._tlWired = true;
    right.addEventListener('click', e => {
      const card = e.target.closest('[data-tl-open]');
      if (!card) return;
      this._openTautulliModal(card.dataset.tlOpen);
    });
  }

}

export const tautulliTilesMixin = _TautulliTilesMethods.prototype;
