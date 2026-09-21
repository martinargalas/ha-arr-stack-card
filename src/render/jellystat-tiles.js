// Jellystat: the poster tiles in the right column and the click that opens the
// modal. Core, because the column draws them synchronously; the modal loads on
// demand (chunks/jellystat.js).

class _JellystatTilesMethods {

  _jsActivityCard(playsData) {
    const days  = (playsData || []).slice(-7);
    const max   = Math.max(...days.map(d => d.value || 0), 1);
    const total = days.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const today = new Date().getDate();
    const bars  = days.map(d => {
      const h   = Math.max(d.value ? 4 : 0, Math.round((d.value || 0) / max * 100));
      const gap = 100 - h;
      const bar = d.value
        ? '<div style="flex:' + h + ';background:linear-gradient(to bottom,rgba(255,255,255,0.75),rgba(255,255,255,0.3));border-radius:3px 3px 0 0"></div>'
        : '<div style="flex:' + h + ';display:none"></div>';
      return '<div style="flex:1;display:flex;flex-direction:column;padding:0 1.5px"><div style="flex:' + gap + '"></div>' + bar + '</div>';
    }).join('');
    const labels = days.map(d => {
      const day = this._escHtml((d.date || '').slice(-2));
      const isToday = parseInt(day, 10) === today;
      return '<div style="flex:1;font-size:7px;font-weight:' + (isToday ? '700' : '500') + ';color:' + (isToday ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)') + ';text-align:center;padding:2px 0 0">' + day + '</div>';
    }).join('');
    const playsTag = total > 0
      ? '<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(99,179,237,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">' + total + ' ' + this._t('tlPlays') + '</span>'
      : '';
    return '<div class="tl-card u-sec-body" data-js-open="graphs">'
      + '<div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg></div>'
      + '<div class="u-row-sb-w">'
      + '<div style="display:flex;flex-direction:column;gap:1px">'
      + `<span class="u-media-badge">${this._t('tlCharts')}</span>`
      + `<span style="font-size:8px;color:rgba(255,255,255,0.28);font-style:italic">${this._t('tlLast7Days')}</span>`
      + '</div>'
      + playsTag
      + '</div>'
      + '<div style="flex:1;display:flex;flex-direction:column;position:relative;z-index:2;min-height:0">'
      + '<div style="flex:1;display:flex;gap:0">' + (bars || '') + '</div>'
      + '<div style="height:1px;background:rgba(255,255,255,0.08);margin:1px 0"></div>'
      + '<div style="display:flex;gap:0;margin-top:1px">' + labels + '</div>'
      + '</div>'
      + '</div>';
  }

  _jsHistoryCard(data) {
    const hist    = data.recentHistory || [];
    const jsMax   = this._actCardMax('js-history');
    const streams = (data.activity?.Sessions || []).length;
    const items   = hist.length === 0
      ? `<div class="u-xxs-dim">${this._t('tlNoHistory')}</div>`
      : hist.map((h, i) => {
          const title  = this._escHtml(h.NowPlayingItemName || h.ItemName || '—');
          const series = h.SeriesName ? ' &middot; ' + this._escHtml(h.SeriesName) : '';
          const user   = this._escHtml(h.UserName || '');
          const ago    = h.ActivityDateInserted ? this._tlFmtDate(h.ActivityDateInserted) : '';
          const sep    = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
          const hidden = i >= jsMax ? 'display:none;' : '';
          return '<div style="' + hidden + sep + 'padding:4px 0"><div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + title + series + '</div><div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:1px">' + user + (ago ? ' &middot; ' + ago : '') + '</div></div>';
        }).join('');
    const streamTag = streams > 0
      ? '<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(52,211,153,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">' + streams + ' ' + this._t('tlNow') + '</span>'
      : '';
    return '<div class="tl-card u-sec-body" data-js-open="history">'
      + '<div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>'
      + '<div class="u-row-sb-w">'
      + `<span class="u-media-badge">${this._t('tlHistory')}</span>`
      + streamTag
      + '</div>'
      + '<div data-act-content class="u-flex-ovh-rel">' + items + '</div>'
      + '</div>';
  }

  _jsLibCard(data) {
    const libs = data.libraries || [];
    const rows = libs.slice(0, 5).map((lib, i) => {
      const ct    = (lib.CollectionType || lib.Type || '').toLowerCase();
      const type  = ct.includes('movie') ? 'movie' : ct.includes('tv') || ct.includes('show') ? 'show' : ct.includes('music') || ct.includes('audio') ? 'artist' : ct;
      const count = Number(lib.item_count ?? lib.ItemCount ?? lib.count) || 0;
      const dim   = count === 0 ? ';opacity:0.28' : '';
      const sep   = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      return '<div style="' + sep + 'display:flex;align-items:center;gap:5px;padding:4px 0">'
        + this._tlLibSvgIcon(type, lib.Name || '', 'sm')
        + '<span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;margin-left:1px">' + this._escHtml(lib.Name || '—') + '</span>'
        + '<span style="font-size:10px;font-weight:700;color:#fff;flex-shrink:0' + dim + '">' + count + '</span>'
        + '</div>';
    }).join('') || `<div class="u-xxs-dim">${this._t('tlNoData')}</div>`;
    const sectTag = libs.length > 0
      ? '<span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.12);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">' + libs.length + '</span>'
      : '';
    return '<div class="tl-card u-sec-body" data-js-open="libraries">'
      + '<div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>'
      + '<div class="u-row-sb-w">'
      + `<span class="u-media-badge">${this._t('tlLibraries')}</span>`
      + sectTag
      + '</div>'
      + '<div class="u-flex-rel">' + rows + '</div>'
      + '</div>';
  }

  _jsUsersCard(data) {
    const users  = (data.users || []).slice(0, 5);
    const active = (data.activity?.Sessions || []).length;
    const items  = users.map((u, i) => {
      const rawName = String(u.Name || u.UserName || '—');
      const name  = this._escHtml(rawName);
      const plays = Number(u.Plays ?? u.TotalPlays ?? u.PlayCount) || 0;
      const sep   = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      const av    = '<span style="width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,0.14);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:7px;font-weight:700;color:#fff">' + this._escHtml((rawName[0] || '?').toUpperCase()) + '</span>';
      return '<div style="' + sep + 'display:flex;align-items:center;gap:6px;padding:4px 0">' + av + '<span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">' + name + '</span><span style="font-size:10px;font-weight:700;color:#fff;flex-shrink:0">' + plays + '</span></div>';
    }).join('') || `<div style="font-size:9px;color:rgba(255,255,255,0.3)">${this._t('tlNoData')}</div>`;
    const activeTag = active > 0
      ? '<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(52,211,153,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">' + active + ' ' + this._t('tlActive') + '</span>'
      : '';
    return '<div class="tl-card u-sec-body" data-js-open="users">'
      + '<div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>'
      + '<div class="u-row-sb-w">'
      + `<span class="u-media-badge">${this._t('tlUsers')}</span>`
      + activeTag
      + '</div>'
      + '<div class="u-flex-rel">' + items + '</div>'
      + '</div>';
  }

  _renderJellystat() {
    const data = this._jellystat || {};
    return `
      <div class="sec-card has-gradient" style="${this._sectionStyle()}">
        ${this._sectionOverlayHtml('jellystat', 25, 75, 0.23)}
        <div class="col-hdr" style="margin-bottom:5px">
          ${this._appIcon('jellystat', 24)}
          <span class="col-hdr-title">${this._t('tlStatisticsJellyfin')}</span>
          <div class="col-hdr-line"></div>
        </div>
        <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8249;</button>
          <div class="tl-row">
            ${this._jsLibCard(data)}
            ${this._jsUsersCard(data)}
            ${this._jsHistoryCard(data)}
            ${this._jsActivityCard(data.playsData)}
          </div>
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8250;</button>
        </div>
      </div>`;
  }

  _wireJellystatPosters(right) {
    // Bound to the column itself, which outlives every repaint - once is enough,
    // and a second listener per paint made one click open the modal many times.
    if (!right || right._jsWired) return;
    right._jsWired = true;
    right.addEventListener('click', e => {
      const card = e.target.closest('[data-js-open]');
      if (!card) return;
      this._openJellystatModal(card.dataset.jsOpen);
    });
  }

}

export const jellystatTilesMixin = _JellystatTilesMethods.prototype;
