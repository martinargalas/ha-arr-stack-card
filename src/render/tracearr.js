// ──────────────────────────────────────────────────────────────────────────
// Tracearr — poster row, modal shell, tab routing, fetch
// (tables → tracearr-table.js | wiring → wire/tracearr.js)
// ──────────────────────────────────────────────────────────────────────────
import { ICONS, dayClass } from '../shared/ui.js';

class _TraceaRrMethods {

  // ── Server preference helpers ─────────────────────────────────────────────
  _traReadSavedSrv()      { try { return localStorage.getItem('arr-tra-srv') || null; } catch(_) { return null; } }
  _traSaveSrv(sid)        { try { localStorage.setItem('arr-tra-srv', sid); } catch(_) {} }

  // Pick best server from list using saved preference or type-priority (Jellyfin>Plex>Emby).
  // `getKey(srv)` extracts the string used for priority ranking (name or type field).
  _traAutoPickSrv(servers, getKey = s => s.name || '') {
    const saved  = this._traReadSavedSrv();
    const valid  = saved && servers.find(s => s.id === saved);
    if (valid) return saved;
    const rank = v => { const k = (v || '').toLowerCase(); return k.includes('jellyfin') ? 0 : k.includes('plex') ? 1 : k.includes('emby') ? 2 : 99; };
    return [...servers].sort((a, b) => rank(getKey(a)) - rank(getKey(b)))[0]?.id || null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Poster row — 4 cards in right panel
  // ──────────────────────────────────────────────────────────────────────────

  _renderTracearr() {
    const d = this._tracearr || {};
    return `
      <div class="sec-card has-gradient" style="${this._sectionStyle()}">
        ${this._sectionOverlayHtml('tracearr', 25, 75, 0.22)}
        <div class="col-hdr" style="margin-bottom:5px">
          ${this._appIcon('tracearr', 24)}
          <span class="col-hdr-title">${this._t('traTitle')}</span>
          <div class="col-hdr-line"></div>
        </div>
        <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8249;</button>
          <div class="tl-row">
            ${this._traUsersCard(d)}
            ${this._traViolationsCard(d)}
            ${this._traActivityCard(d)}
            ${this._traTranscodeCard(d)}
          </div>
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8250;</button>
        </div>
      </div>`;
  }

  _traUsersCard(d) {
    const seen = new Set();
    const users = (d.users || []).filter(u => { const k = u.id || u.username; return k && !seen.has(k) && seen.add(k); }).slice(0, 5);
    const flagged = users.filter(u => u.trustScore < 70 || u.totalViolations > 0).length;
    const rows = users.map((u, i) => {
      const name  = u.displayName || u.username || '—';
      const score = u.trustScore ?? 100;
      const color = score >= 80 ? 'rgba(110,231,183,0.9)' : score >= 50 ? 'rgba(252,211,77,0.9)' : 'rgba(252,165,165,0.9)';
      const av    = u.thumbUrl || u.avatarUrl
        ? `<img src="${u.thumbUrl || u.avatarUrl}" style="width:15px;height:15px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.15)" loading="lazy" onerror="this.style.display='none'">`
        : `<span style="width:15px;height:15px;border-radius:50%;background:rgba(255,255,255,0.12);display:inline-flex;align-items:center;justify-content:center;font-size:6px;font-weight:800;color:rgba(255,255,255,0.6);flex-shrink:0">${name.slice(0,2).toUpperCase()}</span>`;
      const sep = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      return `<div style="${sep}display:flex;align-items:center;gap:6px;padding:4px 0">
        ${av}
        <span style="font-size:10px;font-weight:600;color:#fff;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span>
        <span style="font-size:10px;font-weight:700;color:${color};flex-shrink:0">${score}</span>
      </div>`;
    }).join('') || `<div class="u-xxs-dim">${this._t('tlNoData')}</div>`;

    const flagTag = flagged > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(248,113,113,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${this._t('traFlagged').replace('{n}', flagged)}</span>`
      : `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(52,211,153,0.16);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${this._t('traAllClear')}</span>`;

    return `<div class="tl-card u-sec-body" data-tra-open="users">
      <div class="u-bg-icon">
        <svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <div class="u-row-sb">
        <span class="u-media-badge">${this._t('tlUsers')}</span>
        ${flagTag}
      </div>
      <div class="u-flex-rel">${rows}</div>
    </div>`;
  }

  _traViolationsCard(d) {
    const viols = (d.violations || []).slice(0, 3);
    const total = d.violationTotal || 0;
    const typeLabel = {
      impossible_travel:     this._t('traVtImpossible'),
      simultaneous_locations:'Souběžné lokace',
      concurrent_streams:    this._t('traVtConcurrent'),
      device_velocity:       this._t('traVtVelocity'),
    };
    const severityColor = { high: 'rgba(252,165,165,0.9)', medium: 'rgba(252,211,77,0.9)', low: 'rgba(110,231,183,0.9)' };
    const dotColor     = { high: '#f87171', medium: '#fbbf24', low: '#34d399' };

    const items = viols.map((v, i) => {
      const label = typeLabel[v.type] || v.type || '—';
      const user  = v.user?.displayName || v.username || '';
      const sep   = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      const dot   = dotColor[v.severity] || dotColor.high;
      return `<div style="${sep}padding:4px 0">
        <div class="u-row-5">
          <span style="width:7px;height:7px;border-radius:50%;background:${dot};box-shadow:0 0 6px ${dot};flex-shrink:0"></span>
          <span style="font-size:10px;font-weight:600;color:#fff;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</span>
        </div>
        ${user ? `<div style="font-size:9px;color:rgba(255,255,255,0.38);padding-left:12px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user}</div>` : ''}
      </div>`;
    }).join('') || `<div style="font-size:9px;color:rgba(110,231,183,0.7);padding:8px 0;display:flex;align-items:center;gap:5px">
        <span style="width:7px;height:7px;border-radius:50%;background:#34d399;flex-shrink:0"></span>${this._t('traNoViolations')}
      </div>`;

    const badge = total > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(248,113,113,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${total} ${this._t('traNew')}</span>`
      : '';

    return `<div class="tl-card u-sec-body" data-tra-open="violations">
      <div class="u-bg-icon">
        <svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <div class="u-row-sb">
        <span class="u-media-badge">${this._t('traViolations')}</span>
        ${badge}
      </div>
      <div class="u-flex-rel">${items}</div>
    </div>`;
  }

  _traActivityCard(d) {
    const plays   = (d.activity?.plays || []).slice(-7);
    const quality = d.activity?.quality || {};
    const maxP    = Math.max(...plays.map(p => p.count || 0), 1);
    const total   = plays.reduce((s, p) => s + (p.count || 0), 0);
    const todayD  = new Date().getDate();
    const bars    = plays.map(p => {
      const h   = Math.max(p.count ? 4 : 0, Math.round((p.count || 0) / maxP * 100));
      const gap = 100 - h;
      const day = new Date(p.date).getDate();
      return `<div style="flex:1;display:flex;flex-direction:column;padding:0 1.5px">
        <div style="flex:${gap}"></div>
        ${p.count ? `<div style="flex:${h};background:linear-gradient(to bottom,rgba(255,255,255,0.75),rgba(255,255,255,0.3));border-radius:3px 3px 0 0"></div>` : `<div style="flex:${h};display:none"></div>`}
      </div>`;
    }).join('');
    const labels = plays.map(p => {
      const day   = new Date(p.date).getDate();
      const today = day === todayD;
      return `<div style="flex:1;font-size:7px;font-weight:${today?'700':'500'};color:${today?'rgba(255,255,255,0.75)':'rgba(255,255,255,0.3)'};text-align:center;padding:2px 0 0">${day}</div>`;
    }).join('');
    const dp = quality.directPlayPercent ?? 0;

    const playsTag = total > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(130,80,255,0.2);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${total} ${this._t('tlPlays')}</span>`
      : '';

    return `<div class="tl-card u-sec-body" data-tra-open="activity">
      <div class="u-bg-icon">
        <svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4.93 19.07A9 9 0 1 1 19.07 19.07" stroke-linecap="round"/><line x1="12" y1="12" x2="17.5" y2="6.5" stroke-linecap="round"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>
      </div>
      <div style="display:flex;align-items:center;margin-bottom:6px;position:relative;z-index:2;gap:6px">
        <span class="u-media-badge-s">${this._t('traActivity')}</span>
        <div style="flex:1"></div>
        ${playsTag}
      </div>
      <div style="flex:1;display:flex;flex-direction:column;position:relative;z-index:2;min-height:0">
        <div style="flex:1;display:flex;gap:0">${bars}</div>
        <div style="height:1px;background:rgba(255,255,255,0.08);margin:1px 0"></div>
        <div style="display:flex;gap:0;margin-top:1px">${labels}</div>
        ${dp > 0 ? `<div style="font-size:9px;color:rgba(255,255,255,0.38);margin-top:5px;display:flex;justify-content:space-between"><span>${this._t('traDirectPlayLc')}</span><span style="color:rgba(110,231,183,0.85);font-weight:700">${dp}%</span></div>` : ''}
      </div>
    </div>`;
  }

  _traTranscodeCard(d) {
    const users = (d.topTranscode || []).slice(0, 4);
    const totalTr = users.reduce((s, u) => s + (u.transcodeCount ?? u.transcodes ?? 0), 0);

    const rows = users.map((u, i) => {
      const name  = u.identityName || u.username || u.displayName || '?';
      const tr    = u.transcodeCount ?? u.transcodes ?? 0;
      const dpN   = Math.round(Number(u.directPlayPct ?? u.directPlayRate ?? 0));
      const trPct = Math.round(Number(u.pctOfTotalTranscodes ?? (totalTr ? tr / totalTr * 100 : 0)));
      const av    = u.avatar || u.avatarUrl || null;
      const sep   = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      const avEl  = av
        ? `<img src="${av}" width="15" height="15" style="border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.12)" loading="lazy" onerror="this.style.display='none'">`
        : `<span style="width:15px;height:15px;border-radius:50%;background:rgba(255,255,255,0.12);display:inline-flex;align-items:center;justify-content:center;font-size:6px;font-weight:800;color:rgba(255,255,255,0.6);flex-shrink:0">${name.slice(0,2).toUpperCase()}</span>`;
      const dpColor = dpN >= 80 ? 'rgba(52,211,153,0.9)' : dpN >= 50 ? 'rgba(251,191,36,0.9)' : 'rgba(248,113,113,0.9)';
      const dpBg    = dpN >= 80 ? 'rgba(52,211,153,0.12)' : dpN >= 50 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.12)';
      return `<div style="${sep}display:flex;align-items:center;gap:5px;padding:4px 0">
        ${avEl}
        <span style="font-size:10px;font-weight:600;color:#fff;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span>
        <span style="font-size:9px;color:rgba(255,255,255,0.4);flex-shrink:0">${tr}×</span>
        <span style="font-size:9px;font-weight:700;color:#fff;background:rgba(248,113,113,0.18);border-radius:10px;padding:1px 5px;flex-shrink:0">${trPct}%</span>
      </div>`;
    }).join('');

    const empty = `<div style="display:flex;align-items:center;gap:5px;padding:6px 0;font-size:9px;color:rgba(110,231,183,0.8)">
      <span style="width:7px;height:7px;border-radius:50%;background:#34d399;flex-shrink:0"></span>${this._t('traAllDirectPlay')}
    </div>`;

    const badge = totalTr > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(248,113,113,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${totalTr}×</span>`
      : '';

    return `<div class="tl-card u-sec-body" data-tra-open="devices">
      <div class="u-bg-icon">
        <svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <div style="display:flex;align-items:center;margin-bottom:6px;position:relative;z-index:2;gap:6px">
        <span class="u-media-badge-s">${this._t('traTopTranscode')}</span>
        <div style="flex:1"></div>
        ${badge}
      </div>
      <div class="u-flex-rel">${rows || empty}</div>
    </div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Map tab
  // ──────────────────────────────────────────────────────────────────────────

  _traMapHtml() {
    const m       = this._tracearrModal;
    const isMob   = this._isMob;
    const period  = m.mapPeriod || 'month';
    const view    = m.mapView   || 'circles';
    const summary = m.mapData?.summary || {};
    const filters = m.mapData?.availableFilters || {};
    const streams  = summary.totalStreams    ?? 0;
    const locs     = summary.uniqueLocations ?? 0;

    // One capsule for the lot: period, user, view — and the counts on the right,
    // where they read as a caption to the map rather than another control.
    const users = filters.users || [];
    const periodItems = [
      ['all',   this._t('traAllTime')],
      ['week',  this._t('traLastWeek')],
      ['month', this._t('traLastMonth')],
      ['year',  this._t('traLastYear')],
    ];
    const userItems = [['', this._t('traAllUsers')],
      ...users.map(u => [u.id, u.name || u.username || u.id])];

    const _mi = d => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${d}</svg>`;
    const VIEWS = [
      { v: 'heatmap', label: this._t('traHeatmap'), icon: _mi('<path d="M12 2C8.5 2 5 5 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-4-3.5-7-7-7z"/>') },
      { v: 'circles', label: this._t('traCircles'), icon: _mi('<circle cx="12" cy="12" r="9"/>') },
    ];
    // Header-menu style, so the two views can keep labels of differing width.
    // Both keep their word even on a phone — two short ones cost less room than
    // the confusion of a bare pin against a bare circle.
    const viewToggle = `<span id="tra-map-view-nav" class="mt-nav mt-nav--inline"><span class="mt-nav-ind"></span>${
      VIEWS.map(o => `<button class="mt-nav-btn${o.v === view ? ' is-on' : ''}" data-tra-map-view="${o.v}" title="${o.label}">${o.icon}${o.label}</button>`).join('')}</span>`;

    const statsInner = `<span><span style="font-weight:700;color:var(--is-text)">${streams}</span> streams</span>
      <span><span style="font-weight:700;color:var(--is-text)">${locs}</span> locations</span>`;
    // On a phone the two counts have no room left in the bar, so they sit on the
    // map itself — which is what they describe anyway.
    const statsBar = isMob ? '' : `<span style="display:inline-flex;align-items:center;gap:14px;font-size:11px;color:var(--is-text-muted);flex-shrink:0;padding:0 6px">${statsInner}</span>`;
    const statsOverlay = isMob
      ? `<div style="position:absolute;top:8px;right:8px;z-index:500;display:flex;gap:10px;align-items:center;font-size:11px;color:var(--is-text-muted);background:rgba(12,12,20,0.72);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.10);border-radius:999px;padding:5px 12px;pointer-events:none">${statsInner}</div>`
      : '';

    // The counts leave the bar on a phone, so the gap that used to separate them
    // from the view switch moves in front of it — otherwise the switch would be
    // left hanging in the middle with empty space to its right.
    const gap = '<div style="flex:1;min-width:4px"></div>';
    const controls = `<div class="mt-tb" style="min-height:34px;padding:0 ${isMob ? 4 : 3}px;gap:6px;margin-bottom:8px;flex-shrink:0">
      ${this._mtSelect('tra-map-period', periodItems, period, 'all')}
      ${this._mtSelect('tra-map-user-sel', userItems, m.mapUserId || '', '')}
      ${isMob ? gap : ''}
      <span class="mt-tb-sep"></span>
      ${viewToggle}
      ${isMob ? '' : gap + statsBar}
    </div>`;

    return `<div class="u-col-fill">
      ${controls}
      <div id="tra-map-container" style="flex:1;border-radius:16px;overflow:hidden;position:relative;min-height:180px;background:rgba(0,0,0,0.4)">
        ${statsOverlay}
        <div id="tra-map-loading" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;color:rgba(255,255,255,0.35);z-index:1000">${this._t('traLoadingMap')}</div>
      </div>
    </div>`;
  }

  async _initTraMap(body) {
    const m = this._tracearrModal;
    if (!m) return;

    // Destroy previous map
    if (m._leafletMap) {
      try { m._leafletMap.remove(); } catch(_) {}
      m._leafletMap = null;
    }

    // Load Leaflet CSS into shadow root once
    if (!this.shadowRoot.querySelector('#tra-leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'tra-leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      this.shadowRoot.appendChild(link);
    }

    // Load Leaflet JS into document once
    if (!window.L) {
      await new Promise((res, rej) => {
        const s   = document.createElement('script');
        s.src     = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload  = res;
        s.onerror = rej;
        document.head.appendChild(s);
      }).catch(() => null);
    }
    if (!window.L) return;

    // Load leaflet-heat for heatmap
    if (!window.L.heatLayer) {
      await new Promise((res) => {
        const s  = document.createElement('script');
        s.src    = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
        s.onload = res;
        s.onerror = res;
        document.head.appendChild(s);
      });
    }

    if (!this._tracearrModal) return;

    const container = body.querySelector('#tra-map-container');
    if (!container) return;
    const loading = container.querySelector('#tra-map-loading');
    if (loading) loading.remove();

    const map = window.L.map(container, {
      center: [30, 10],
      zoom: 2,
      minZoom: 1,
      maxZoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    // Tiles follow the card's day/night mode — a dark basemap on a light modal
    // reads as a hole in the page.
    const _tiles = this._isDay ? 'light_all' : 'dark_all';
    window.L.tileLayer(`https://{s}.basemaps.cartocdn.com/${_tiles}/{z}/{x}/{y}{r}.png`, {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    m._leafletMap = map;
    this._traMapPlotData(m);
  }

  _traMapPlotData(m) {
    if (!m?._leafletMap || !window.L) return;
    const map  = m._leafletMap;
    const data = m.mapData?.data || [];
    const view = m.mapView || 'circles';

    // Clear existing layers (keep tile layer = index 0)
    map.eachLayer(layer => { if (layer._url === undefined) map.removeLayer(layer); });

    if (!data.length) return;

    if (view === 'heatmap' && window.L.heatLayer) {
      const points = data.map(loc => [loc.lat, loc.lon, Math.min(1, (loc.count || 1) / 10)]);
      window.L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 10 }).addTo(map);
    } else {
      data.forEach(loc => {
        if (loc.lat == null || loc.lon == null) return;
        const r = Math.max(5, Math.min(22, 5 + Math.log2((loc.count || 1) + 1) * 3));
        window.L.circleMarker([loc.lat, loc.lon], {
          radius: r, color: '#007AFF', fillColor: '#007AFF',
          fillOpacity: 0.55, weight: 1.5,
        }).bindPopup(`<b>${loc.city || loc.country || this._t('tlUnknown')}</b><br>${this._t((loc.count||1)>1 ? 'traNStreams' : 'traNStream').replace('{n}', loc.count || 1)}`).addTo(map);
      });
      if (data.length === 1) map.setView([data[0].lat, data[0].lon], 6);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Modal — open / close / shell
  // ──────────────────────────────────────────────────────────────────────────

  _openTracearrModal(tab) {
    this._markActivated();
    const _T2G = { map:'map', history:'history', activity:'stats', statsUsers:'stats', quality:'library', storage:'library', watch:'library', devices:'performance', bandwidth:'performance', users:'users', violations:'violations' };
    if (tab === 'servers' || tab === 'overview') tab = 'dash';
    tab = tab || 'dash';
    const navGroup = _T2G[tab] || 'map';
    this._tracearrModal = {
      tab, navGroup,
      // users
      usersData: [], usersTotal: 0,
      usersSortCol: 'trustScore', usersSortDir: 'asc',
      usersSearch: '', usersPage: 0, usersPerPage: 20,
      usersServerId: (() => { try { return localStorage.getItem('arr-tra-srv') || null; } catch(_) { return null; } })(),
      // violations
      violsData: [], violsTotal: 0,
      violsPage: 0, violsPerPage: 20,
      violsSeverity: null, violsStatus: null, violsServerId: null, violsServers: [],
      // map
      mapData: null, mapPeriod: 'month', mapServerId: null, mapUserId: null, mapView: 'circles', _leafletMap: null,
      // activity
      activityData: null, activityPeriod: 'month', activityServerId: null,
      // history
      histData: [], histTotal: 0,
      histPage: 0, histPerPage: 20,
      histServer: null, histUser: null, histMedia: null,
      histSearch: '', histPeriod: null,
      histRawData: null, histNeedsRefetch: true,
      // servers
      serversData: [],
      // stale content (inside storage tab)
      staleCategory: 'never_watched',
      stalePage: 0, stalePageSize: 10,
      staleItems: null, staleTotal: 0, staleSearch: '',
      staleSummary: null,
      staleSort: 'fileSize', staleOrder: 'desc', staleMediaType: null, staleMonths: 3,
      staleDeduped: null, staleServers: null, selectedServerId: null,
      qualityServerId: null,
      qualityPeriod:    (() => { try { return localStorage.getItem('arr-tra-q-period') || 'month'; } catch(_) { return 'month'; } })(),
      qualityMediaType: (() => { try { return localStorage.getItem('arr-tra-q-mt') || null; } catch(_) { return null; } })(),
      qualityCodecTab:  (() => { try { return localStorage.getItem('arr-tra-q-codec') || 'movies'; } catch(_) { return 'movies'; } })(),
      storagePeriod:       (() => { try { return localStorage.getItem('arr-tra-stor-period') || 'month'; } catch(_) { return 'month'; } })(),
      storagePredictions:  (() => { try { const v = localStorage.getItem('arr-tra-stor-pred'); return v === null ? true : v === '1'; } catch(_) { return true; } })(),
      devicesServerId: null, devicesPeriod: 'month',
      devicesData: null, devicesHealth: null, devicesHotspots: null, devicesMatrix: null, devicesUsers: null,
      devicesLeftView: 'health', devicesRightView: 'hotspots',
      devHealthPage: 0, devMatrixPage: 0, devHotspotsPage: 0, devUsersPage: 0,
      bwServerId: (() => { try { return localStorage.getItem('arr-tra-srv') || null; } catch(_) { return null; } })(),
      bwPeriod: 'month', bwSummary: null, bwDaily: null, bwUsers: null, bwUsersPage: 0,
      statsUsersPeriod: 'month', statsUsersData: null, statsUsersServerId: null,
      watchTopTab: 'movies', watchPeriod: '30d',
      watchServerId: (() => { try { return localStorage.getItem('arr-tra-srv') || null; } catch(_) { return null; } })(),
      watchTopMovies: null, watchTopShows: null,
      watchPatterns: null, watchCompletion: null, watchStatus: null,
      watchSrvPeriodKey: null, watchSrvKey: null,
    };
    this.shadowRoot.querySelector('[data-tra-modal]')?.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = this._traModalHtml(tab, navGroup);
    const el = wrap.firstElementChild;
    this.shadowRoot.appendChild(el);
    this._wireTracearrModal(el);
    this._traLoadTab(tab, el);
  }

  // One-time discovery: enrich m.staleServers with `type` field from availableFilters
  async _traEnrichServerTypes(m) {
    if (!m.staleServers?.length || m._serverTypesEnriched) return;
    m._serverTypesEnriched = true;
    try {
      const _tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
      const _r = await this._traStatsFetch(`top-users?period=month&timezone=${_tz}`);
      if (!this._tracearrModal) return;
      const _avail = _r?.availableFilters?.servers;
      if (!_avail?.length) return;
      const _tm = new Map(_avail.map(s => [s.id, (s.type || '').toLowerCase()]));
      for (const s of m.staleServers) if (_tm.has(s.id)) s.type = _tm.get(s.id);
    } catch(_) {}
  }

  // Populate #tra-hdr-server: always show JF/Plex/Emby, gray out unconfigured
  _traPopSrvEl(srvEl, servers, activeId, attr, keyFn) {
    if (!srvEl) return;
    if (!(servers || []).length) { srvEl.style.display = 'none'; return; }
    const CDN = 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg';
    const TYPES = ['jellyfin', 'plex', 'emby'];
    const typeMap = new Map();
    for (const s of servers) {
      const k = keyFn ? keyFn(s) : (() => { const t=(s.type||s.name||'').toLowerCase(); return t.includes('jellyfin')?'jellyfin':t.includes('plex')?'plex':t.includes('emby')?'emby':null; })();
      if (k && !typeMap.has(k)) typeMap.set(k, s);
    }
    srvEl.innerHTML = TYPES.map(t => {
      const s = typeMap.get(t);
      const active = s?.id === activeId;
      const dis = !s;
      const st = `padding:4px 6px;display:flex;align-items:center;justify-content:center${dis ? ';opacity:0.3;filter:grayscale(1);pointer-events:none' : ''}`;
      const icon = `<img src="${CDN}/${t}.svg" width="20" height="20" style="display:block;object-fit:contain">`;
      return `<button class="tl-page-btn${active ? ' active' : ''}" ${s ? `${attr}="${s.id}"` : ''} title="${t}" style="${st}">${icon}</button>`;
    }).join('');
    srvEl.style.display = 'flex';
  }

  _closeTracearrModal() {
    if (this._tracearrModal?._leafletMap) {
      try { this._tracearrModal._leafletMap.remove(); } catch(_) {}
    }
    this.shadowRoot.querySelector('[data-tra-modal]')?.remove();
    this._tracearrModal = null;
  }

  _traNavHtml(currentTab, navGroup) {
    const _ico = (d, s=13) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${d}</svg>`;
    const NAV = [
      { id: 'map',         label: this._t('traMap'),         tab: 'map',
        icon: _ico('<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>'),
        sub: [] },
      { id: 'history',     label: this._t('tlHistory'),     tab: 'history',
        icon: _ico('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/><polyline points="12 7 12 12 15 15"/>'),
        sub: [] },
      { id: 'stats',       label: this._t('traStats'),
        icon: _ico('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
        sub: [['activity', this._t('actActivity'), _ico('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>', 11)],
              ['statsUsers', this._t('tlUsers'), _ico('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', 11)]] },
      { id: 'library',     label: this._t('tlColLibrary'),
        icon: _ico('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
        sub: [['quality',  this._t('actColQuality'),  _ico('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>', 11)],
               ['storage',  this._t('storage'),  _ico('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>', 11)],
               ['watch',    this._t('traWatchTab'),    _ico('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', 11)]] },
      { id: 'performance', label: this._t('traPerf'),
        icon: _ico('<path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'),
        sub: [['devices',   this._t('traDevices'),   _ico('<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>', 11)],
              ['bandwidth', this._t('traBandwidth'), _ico('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>', 11)]] },
      { id: 'users',       label: this._t('tlUsers'),       tab: 'users',
        icon: _ico('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
        sub: [] },
      { id: 'rules',       label: this._t('mtRules'),       tab: 'rules',
        icon: _ico('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
        sub: [] },
      { id: 'violations',  label: this._t('traViolations'),  tab: 'violations',
        icon: _ico('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
        sub: [] },
    ];
    // Same header menu as every other category: one sliding fill the wire layer
    // measures onto the active group, and the group's sub-tabs ride in a track
    // that opens only while their parent is the one selected.
    const items = NAV.map(g => {
      const active = navGroup === g.id;
      const btn = `<button class="mt-nav-btn${active ? ' is-on' : ''}" data-tra-nav="${g.id}" title="${this._escHtml(g.label)}">${g.icon}${g.label}</button>`;
      if (!g.sub?.length) return btn;
      const subHtml = active ? g.sub.map(([tid, tlbl, tico]) => {
        const on = currentTab === tid;
        return `<button class="mt-nav-sub${on ? ' is-on' : ''}" data-tra-tab="${tid}" title="${this._escHtml(tlbl)}">${tico || ''}${tlbl}</button>`;
      }).join('') : '';
      return btn + `<span data-tra-sub="${g.id}" class="mt-nav-sub-wrap${active ? ' is-open' : ''}"><span class="mt-nav-ind"></span>${subHtml}</span>`;
    }).join('');
    return `<div id="tra-nav" class="mt-nav"><span class="mt-nav-ind"></span>${items}</div>`;
  }

  _traMobileNavHtml(currentTab, navGroup) {
    const _ico = (d, s=20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const NAV = [
      { id: 'map',         label: this._t('traMap'),         tab: 'map',
        icon: _ico('<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>'),
        sub: [] },
      { id: 'history',     label: this._t('tlHistory'),     tab: 'history',
        icon: _ico('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/><polyline points="12 7 12 12 15 15"/>'),
        sub: [] },
      { id: 'stats',       label: this._t('traStats'),
        icon: _ico('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
        sub: [['activity', _ico('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>', 16), this._t('actActivity')],['statsUsers', _ico('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', 16), this._t('tlUsers')]] },
      { id: 'library',     label: this._t('tlColLibrary'),
        icon: _ico('<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'),
        sub: [
          ['quality',  _ico('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>', 16), this._t('actColQuality')],
          ['storage',  _ico('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>', 16), this._t('storage')],
          ['watch',    _ico('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', 16), this._t('traWatchTab')],
        ] },
      { id: 'performance', label: this._t('traPerf'),
        icon: _ico('<path d="M12 14l4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'),
        sub: [
          ['devices',   _ico('<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>', 16), this._t('traDevices')],
          ['bandwidth', _ico('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>', 16), this._t('traBandwidth')],
        ] },
      { id: 'users',       label: this._t('tlUsers'),       tab: 'users',
        icon: _ico('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
        sub: [] },
      { id: 'rules',       label: this._t('mtRules'),       tab: 'rules',
        icon: _ico('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
        sub: [] },
      { id: 'violations',  label: this._t('traViolations'),  tab: 'violations',
        icon: _ico('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
        sub: [] },
    ];
    const activeGrp = NAV.find(g => g.id === navGroup);
    // Eight groups plus their sub-tabs never fit a header capsule, even as
    // glyphs, so the phone keeps a bottom bar. It wears the same language
    // though: capsule marks, one blue accent, hairline dividers.
    const subRow = (activeGrp?.sub?.length) ? `<div class="tra-mnav-row tra-mnav-sub"><span class="mt-nav-ind"></span>` +
      activeGrp.sub.map(([tid, ico, lbl]) => {
        const sa = currentTab === tid;
        return `<button class="tra-mnav-btn${sa ? ' is-on' : ''}" data-tra-tab="${tid}">${ico}<span>${lbl||''}</span></button>`;
      }).join('') + `</div>` : '';
    const mainBar = `<div class="tra-mnav-row"><span class="mt-nav-ind"></span>` +
      NAV.map(g => {
        const active = navGroup === g.id;
        return `<button class="tra-mnav-btn tra-mnav-main${active ? ' is-on' : ''}" data-tra-nav="${g.id}" title="${this._escHtml(g.label)}">${g.icon}<span>${g.label}</span></button>`;
      }).join('') + `</div>`;
    return `<div id="tra-mobile-nav" class="tra-mnav">
      ${subRow}${mainBar}
    </div>`;
  }

  _traModalHtml(tab, navGroup) {
    const isMobile = this._isMob;
    const pad = isMobile ? '12px 10px 10px' : '14px 22px 10px';
    if (isMobile) {
      return `<div class="popup-overlay${dayClass(this)}" data-tra-modal>
        <div class="popup-glass tl-wide">
          <div class="is-panel-hdr" style="flex-direction:row;align-items:center;padding:${pad};gap:6px">
            <div id="tra-hdr-actions" style="display:flex;gap:6px;align-items:center;flex-shrink:0"></div>
            <div id="tra-hdr-server" style="display:none;gap:5px;align-items:center;flex-shrink:0"></div>
            <div style="flex:1"></div>
            <button class="popup-close" id="tra-close" style="position:relative;top:0;right:0;flex-shrink:0;align-self:center">${ICONS.close}</button>
          </div>
          <div class="popup-body" id="tra-body" style="padding:10px 12px 16px;flex:1;min-height:0;overflow-y:auto">
            <div class="is-loading"><span>${this._t('loading')}</span></div>
          </div>
          ${this._traMobileNavHtml(tab, navGroup)}
        </div>
      </div>`;
    }
    return `<div class="popup-overlay${dayClass(this)}" data-tra-modal>
      <div class="popup-glass tl-wide">
        <div class="is-panel-hdr" style="flex-direction:row;align-items:center;padding:${pad};gap:8px">
          <div id="tra-nav-area" style="min-width:0;flex-shrink:1;overflow:hidden">${this._traNavHtml(tab, navGroup)}</div>
          <div style="flex:1"></div>
          <div id="tra-hdr-actions" style="display:flex;gap:6px;align-items:center;flex-shrink:0"></div>
          <div id="tra-hdr-server" style="display:none;gap:5px;align-items:center;flex-shrink:0"></div>
          <div style="width:16px;flex-shrink:0"></div>
          <button class="popup-close" id="tra-close" style="position:relative;top:0;right:0;flex-shrink:0;align-self:center">${ICONS.close}</button>
        </div>
        <div class="popup-body" id="tra-body" style="padding:14px 22px 20px">
          <div class="is-loading"><span>${this._t('loading')}</span></div>
        </div>
      </div>
    </div>`;
  }

  _traTabLabel(t) {
    return {
      overview:   this._t('traOverview'),
      users:      this._t('tlUsers'),
      violations: this._t('traViolations'),
      history:    this._t('tlHistory'),
      activity:   this._t('traActivity'),
      quality:    this._t('traQuality'),
      storage:    this._t('traStorage'),
      watch:      this._t('traWatchTab'),
      devices:    this._t('traDevices'),
      bandwidth:  this._t('traBandwidth'),
    }[t] || t;
  }

  _traTabTitle(t) {
    return {
      overview:   this._t('traTitle'),
      users:      this._t('tlAllUsers'),
      violations: this._t('traViolations'),
      history:    this._t('tlRecentHistory'),
      activity:   this._t('traActivity'),
      quality:    this._t('traQuality'),
      storage:    this._t('traStorage'),
      watch:      this._t('traWatch'),
      devices:    this._t('traDeviceCompat'),
      bandwidth:  this._t('traBandwidth'),
      map:        this._t('traMap'),
    }[t] || '';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Tab loader
  // ──────────────────────────────────────────────────────────────────────────

  async _traLoadTab(tab, modal) {
    const body = modal.querySelector('#tra-body');
    if (!body) return;
    body.innerHTML = `<div class="u-empty-dim">${this._t('loading')}</div>`;
    const m = this._tracearrModal;
    if (!m) return;

    if (tab === 'rules') {
      const r = await this._traAdminFetch('GET', 'v1/rules');
      if (!this._tracearrModal) return;
      m.rulesData = r?.data || [];
      body.innerHTML = this._traBodyRules();
      this._wireTracearrModalBody(body);
      return;
    }

    if (tab === 'map') {
      const _p  = m.mapPeriod || 'month';
      const _sQ = m.mapServerId ? `&serverId=${m.mapServerId}` : '';
      const _uQ = m.mapUserId  ? `&userId=${m.mapUserId}`    : '';
      const r   = await this._traStatsFetch(`locations?period=${_p}${_sQ}${_uQ}`);
      if (!this._tracearrModal) return;
      m.mapData = r;
      body.innerHTML = this._traMapHtml();
      // Populate server buttons BEFORE wiring so querySelectorAll finds them
      this._traPopSrvEl(modal.querySelector('#tra-hdr-server'), r?.availableFilters?.servers || [], m.mapServerId, 'data-tra-map-srv');
      this._wireTracearrModalBody(body);
      this._initTraMap(body);
      return;
    }

    if (tab === 'overview') {
      return this._traLoadOverview(body, m);
    } else if (tab === 'users') {
      return this._traLoadUsers(modal, body, m);
    } else if (tab === 'violations') {
      return this._traLoadViolations(modal, body, m);
    } else if (tab === 'history') {
      return this._traLoadHistory(modal, body, m);
    } else if (tab === 'activity') {
      return this._traLoadActivity(modal, body, m);
    } else if (tab === 'statsUsers') {
      return this._traLoadStatsUsers(modal, body, m);
    } else if (tab === 'quality') {
      return this._traLoadQuality(body, m);
    } else if (tab === 'storage') {
      return this._traLoadStorage(body, m);
    } else if (tab === 'watch') {
      return this._traLoadWatch(body, m);
    } else if (tab === 'devices') {
      return this._traLoadDevices(modal, body, m);
    } else if (tab === 'bandwidth') {
      return this._traLoadBandwidth(modal, body, m);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // API helper
  // ──────────────────────────────────────────────────────────────────────────

  async _traApiFetch(path) {
    try {
      return await this._hass.callApi('GET', `arr_stack/tracearr/v1/public/${path}`);
    } catch (e) {
      console.warn('[arr-card] Tracearr fetch error:', path, e);
      return null;
    }
  }

  async _traLibFetch(path) {
    try {
      return await this._hass.callApi('GET', `arr_stack/tracearr/v1/library/${path}`);
    } catch (e) {
      console.warn('[arr-card] Tracearr library fetch error:', path, e);
      return null;
    }
  }

  // Admin-JWT session endpoints (v1/sessions/*) — needed for history, which is the only
  // endpoint tier that actually honors the `search` query param (the public API silently
  // ignores it). Requires tracearr_refresh_token configured in the integration.
  async _traSessionsFetch(path) {
    try {
      return await this._hass.callApi('GET', `arr_stack/tracearr/v1/sessions/${path}`);
    } catch (e) {
      console.warn('[arr-card] Tracearr sessions fetch error:', path, e);
      return null;
    }
  }

  async _traStatsFetch(path) {
    try {
      return await this._hass.callApi('GET', `arr_stack/tracearr/v1/stats/${path}`);
    } catch (e) {
      console.warn('[arr-card] Tracearr stats fetch error:', path, e);
      return null;
    }
  }

  async _traAdminFetch(method, path, body) {
    try {
      return await this._hass.callApi(method, `arr_stack/tracearr/${path}`, body);
    } catch (e) {
      if (e?.error === 'Unable to parse JSON response') return null;
      throw e;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Shared helpers
  // ──────────────────────────────────────────────────────────────────────────

  _traTrustColor(score) {
    if (score >= 80) return '#34C759';
    if (score >= 50) return '#FF9500';
    return '#FF3B30';
  }

  _traTrustBg(score) {
    if (score >= 80) return 'rgba(52,199,89,0.16)';
    if (score >= 50) return 'rgba(255,149,0,0.16)';
    return 'rgba(255,59,48,0.18)';
  }

  _traSevColor(sev) {
    return { high: '#FF3B30', medium: '#FF9500', low: '#34C759' }[sev] || '#FF3B30';
  }

  _traSevBg(sev) {
    return { high: 'rgba(248,113,113,0.18)', medium: 'rgba(250,180,50,0.16)', low: 'rgba(52,211,153,0.14)' }[sev] || 'rgba(248,113,113,0.18)';
  }

  _traViolTypeLabel(type) {
    return {
      impossible_travel:      this._t('traVtImpossible'),
      simultaneous_locations: this._t('traVtSimLoc'),
      concurrent_streams:     this._t('traVtConcurrent'),
      device_velocity:        this._t('traVtVelocity'),
    }[type] || type || '—';
  }

  _traFmtDuration(ms) {
    if (!ms) return '—';
    const m = this._tlFmtDuration ? this._tlFmtDuration(Math.round(ms / 60000)) : Math.round(ms / 60000) + ' min';
    return m;
  }

  _traFilterHistory(raw, period, search) {
    let data = raw || [];
    if (period) {
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
      const cutoff = new Date(Date.now() - days * 86400000);
      data = data.filter(h => h.startedAt && new Date(h.startedAt) >= cutoff);
    }
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(h =>
        (h.mediaTitle || '').toLowerCase().includes(q) ||
        (h.showTitle || '').toLowerCase().includes(q) ||
        (h.user?.username || '').toLowerCase().includes(q) ||
        (h.user?.displayName || '').toLowerCase().includes(q)
      );
    }
    return data;
  }

  _traFmtDate(iso) {
    if (!iso) return '';
    return this._tlFmtDate ? this._tlFmtDate(Math.floor(new Date(iso).getTime() / 1000)) : new Date(iso).toLocaleString();
  }

  _traUserAvatar(u, size = 20) {
    if (!u) return `<span style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(255,255,255,0.1);display:inline-flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.4)}px;font-weight:700;color:rgba(255,255,255,0.5);flex-shrink:0">?</span>`;
    const name = u.displayName || u.username || '?';
    const src  = u.thumbUrl || u.avatarUrl || '';
    if (src) return `<img src="${src}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.15)" loading="lazy" onerror="this.outerHTML='<span style=\\'width:${size}px;height:${size}px;border-radius:50%;background:rgba(255,255,255,0.12);display:inline-flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.4)}px;font-weight:700;color:rgba(255,255,255,0.6);flex-shrink:0\\'>${name.slice(0,2).toUpperCase()}</span>'">`;
    return `<span style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(130,80,255,0.25);display:inline-flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.4)}px;font-weight:700;color:rgba(200,160,255,0.9);flex-shrink:0">${name.slice(0,2).toUpperCase()}</span>`;
  }
}

export const tracearrMixin = _TraceaRrMethods.prototype;
