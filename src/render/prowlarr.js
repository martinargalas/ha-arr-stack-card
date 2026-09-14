// ──────────────────────────────────────────────────────────────────────────
// Prowlarr — 4 poster cards in right panel
// ──────────────────────────────────────────────────────────────────────────

class _ProwlarrRenderMethods {

  _renderProwlarr() {
    return `
      <div class="sec-card has-gradient" style="${this._sectionStyle()}">
        ${this._sectionOverlayHtml('prowlarr', 25, 75, 0.23)}
        <div class="col-hdr" style="margin-bottom:5px">
          ${this._appIcon('prowlarr', 24)}
          <span class="col-hdr-title">Prowlarr</span>
          <div class="col-hdr-line"></div>
        </div>
        <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8249;</button>
          <div class="tl-row">
            ${this._pwIndexersCard()}
            ${this._pwAppsCard()}
            ${this._pwHistoryCard()}
            ${this._pwStatsCard()}
          </div>
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8250;</button>
        </div>
      </div>`;
  }

  _pwIndexersCard() {
    const indexers = this._prowlarr?.indexers || [];
    const active   = indexers.filter(i => i.enable && !i._status).length;
    const errors   = indexers.filter(i => i.enable && i._status).length;
    const disabled = indexers.filter(i => !i.enable).length;

    const sorted = [...indexers].sort((a, b) => {
      const rank = i => !i.enable ? 2 : i._status ? 0 : 1;
      return rank(a) - rank(b);
    });
    const rows = sorted.slice(0, 5).map((idx, i) => {
      const hasErr  = !!idx._status;
      const isOff   = !idx.enable;
      const dot     = isOff ? 'rgba(255,255,255,0.25)' : hasErr ? 'rgba(255,100,100,0.85)' : 'rgba(52,211,153,0.85)';
      const proto   = (idx.protocol || '').toLowerCase() === 'usenet' ? 'NZB' : 'TRK';
      const name    = idx.name || '—';
      const sep     = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      const errMsg  = '';
      return `<div style="${sep}padding:3px 0">
        <div class="u-row-5">
          <div style="width:6px;height:6px;border-radius:50%;background:${dot};flex-shrink:0"></div>
          <span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${this._escHtml(name)}</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.35);flex-shrink:0">${proto}</span>
        </div>
        ${errMsg}
      </div>`;
    }).join('') || `<div class="u-xxs-dim">${this._t('pwNoIndexers')}</div>`;

    const badge = errors > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(255,149,0,0.15);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${errors} error${errors>1?'s':''}</span>`
      : active > 0
        ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(52,211,153,0.30);border:1px solid rgba(52,211,153,0.62);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${active} ok</span>`
        : '';

    return `<div class="tl-card u-sec-body" data-pw-open="indexers">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
      <div class="u-row-sb-w">
        <span class="u-media-badge">${this._t('pwIndexers')}</span>
        ${badge}
      </div>
      <div class="u-flex-ovh-rel"><div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.25);margin-bottom:4px">${this._t('pwTop5')}</div>${rows}</div>
    </div>`;
  }

  _pwStatsCard() {
    const indexers   = this._prowlarr?.indexers || [];
    const statsData  = this._prowlarr?.stats;
    const statIdxs   = statsData?.indexers || [];
    const active     = indexers.filter(i => i.enable).length;
    const totalQ     = statIdxs.reduce((s, i) => s + (i.numberOfQueries||0) + (i.numberOfFailedQueries||0) + (i.numberOfRssQueries||0) + (i.numberOfFailedRssQueries||0) + (i.numberOfAuthQueries||0) + (i.numberOfFailedAuthQueries||0), 0);
    const totalG     = statIdxs.reduce((s, i) => s + (i.numberOfGrabs   || 0), 0);

    const fmtNum = n => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

    // Mini bar: top 4 indexers by grabs (from stats)
    const top4 = [...statIdxs].filter(i => i.numberOfGrabs > 0)
      .sort((a, b) => (b.numberOfGrabs || 0) - (a.numberOfGrabs || 0)).slice(0, 4);
    const maxG = Math.max(1, ...top4.map(i => i.numberOfGrabs || 0));
    const barsHtml = top4.map(i => {
      const w    = Math.round((i.numberOfGrabs || 0) / maxG * 100);
      const name = i.indexerName || i.name || '—';
      return `<div style="margin-bottom:2px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px">
          <div style="font-size:8px;color:rgba(255,255,255,0.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${this._escHtml(name)}</div>
          <div style="font-size:7px;color:rgba(255,255,255,0.3);flex-shrink:0;margin-left:3px">${i.numberOfGrabs||0}</div>
        </div>
        <div style="height:4px;background:rgba(255,255,255,0.07);border-radius:2px"><div style="width:${w}%;height:100%;background:linear-gradient(to right,rgba(255,255,255,0.2),rgba(255,255,255,0.5));border-radius:2px"></div></div>
      </div>`;
    }).join('');
    const bars = top4.length
      ? `<div style="margin-bottom:2px"><div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.25);margin-bottom:4px">${this._t('pwMostGrabs')}</div>${barsHtml}</div>`
      : '';

    const chips = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:6px">
      ${[[this._t('pwIndexers'), active], [this._t('pwQueries'), fmtNum(totalQ)], [this._t('pwGrabs'), fmtNum(totalG)]].map(([l, v]) =>
        `<div style="background:rgba(255,255,255,0.06);border-radius:5px;padding:3px 6px">
          <div style="font-size:8px;color:rgba(255,255,255,0.4)">${l}</div>
          <div style="font-size:11px;font-weight:700;color:#fff">${v}</div>
        </div>`
      ).join('')}
    </div>`;

    return `<div class="tl-card u-sec-body" data-pw-open="stats">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg></div>
      <div class="u-row-sb-w">
        <span class="u-media-badge">${this._t('pwStatistics')}</span>
      </div>
      <div class="u-flex-rel">
        ${chips}
        ${bars}
      </div>
    </div>`;
  }

  _pwHistoryCard() {
    const recent = (this._prowlarr?.recentHistory || []).filter(h => h.eventType === 'releaseGrabbed');

    const timeAgo = (dateStr) => {
      const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60)   return `${diff}s`;
      if (diff < 3600) return `${Math.floor(diff/60)}m`;
      if (diff < 86400) return `${Math.floor(diff/3600)}h`;
      return `${Math.floor(diff/86400)}d`;
    };

    const rowsHtml = recent.slice(0, 5).map((h, i) => {
      const sep     = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      const indexer = (this._prowlarr?.indexers||[]).find(ix=>ix.id===h.indexerId)?.name || h.indexer || '—';
      const ago     = h.date ? timeAgo(h.date) : '';
      return `<div style="${sep}padding:3px 0;display:flex;align-items:center;justify-content:space-between;gap:4px">
        <span style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${this._escHtml(indexer)}</span>
        <span style="font-size:8px;color:rgba(255,255,255,0.35);flex-shrink:0">${ago}</span>
      </div>`;
    }).join('');
    const rows = recent.length
      ? `<div><div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.25);margin-bottom:4px">${this._t('pwLastGrabs')}</div>${rowsHtml}</div>`
      : `<div class="u-xxs-dim">${this._t('pwNoRecentGrabs')}</div>`;

    return `<div class="tl-card u-sec-body" data-pw-open="history">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div class="u-row-sb-w">
        <span class="u-media-badge">${this._t('tlHistory')}</span>
      </div>
      <div class="u-flex-ovh-rel">${rows}</div>
    </div>`;
  }

  _pwAppsCard() {
    const apps = this._prowlarr?.apps || [];

    const IMPL_COLORS = {
      radarr: '#34d399', sonarr: '#638cff', lidarr: '#fbbf24',
      readarr: '#a855f7', whisparr: '#f87171', mylar3: '#60a5fa',
      lazylibrarian: '#fb923c',
    };

    const testResults = this._prowlarr?.appTestResults || {};
    const rows = apps.slice(0, 5).map((app, i) => {
      const sep   = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      const impl  = (app.implementationName || app.implementation || '').toLowerCase();
      const color = IMPL_COLORS[impl] || '#9ca3af';
      const lv    = app.syncLevel || '';
      const lvl   = lv.toLowerCase();
      const sync  = lvl === 'fullsync' ? this._t('pwSyncFull') : lvl === 'addonly' ? this._t('libTagAdd') : lvl === 'disabled' ? this._t('pwOff') : (lv || '—');
      const tr    = testResults[app.id];
      const dotClr = !app.enable ? 'rgba(255,255,255,0.2)' : !tr ? 'rgba(200,200,200,0.3)' : tr.ok ? 'rgba(52,211,153,0.85)' : 'rgba(255,100,100,0.85)';
      return `<div style="${sep}padding:3px 0">
        <div class="u-row-5">
          <div style="width:6px;height:6px;border-radius:50%;background:${dotClr};flex-shrink:0"></div>
          <span style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${this._escHtml(app.name||'—')}</span>
          <span style="font-size:8px;color:rgba(255,255,255,0.35);flex-shrink:0">${sync}</span>
        </div>
      </div>`;
    }).join('') || `<div class="u-xxs-dim">${this._t('pwNoApps')}</div>`;

    const badge = apps.length > 0
      ? `<span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.12);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${apps.length}</span>`
      : '';

    return `<div class="tl-card u-sec-body" data-pw-open="apps">
      <div class="u-bg-icon"><svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
      <div class="u-row-sb-w">
        <span class="u-media-badge">${this._t('pwApplications')}</span>
        ${badge}
      </div>
      <div class="u-flex-ovh-rel"><div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.25);margin-bottom:4px">${this._t('pwTop5')}</div>${rows}</div>
    </div>`;
  }

}

export const prowlarrRenderMixin = _ProwlarrRenderMethods.prototype;
