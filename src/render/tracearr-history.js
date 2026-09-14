import { _traSegHtml } from './tracearr-table.js';
import { BP, maxWidth } from '../shared/ui.js';

// Tracearr, the History tab, one session in detail, and Activity. Split out of render/tracearr-table.js.

class _TracearrHistoryMethods {

  // History tab
  // ──────────────────────────────────────────────────────────────────────────

  _traBodyHistory() {
    const m     = this._tracearrModal;
    const hist  = m.histData  || [];
    const total = m.histTotal || 0;
    const isMob = this._isMob;
    const _NAV_SUBS = { stats: 1, library: 3, performance: 2 };
    const _navH     = isMob ? ((_NAV_SUBS[m.navGroup] ? 44 : 0) + 56) : 0;
    // cards area = 88vh − hdr(90) − nav − body_pad(26) − filters(72) − pag(46)
    const pp        = isMob
      ? Math.max(2, Math.floor((window.innerHeight * 0.88 - 90 - _navH - 26 - 72 - 46) / 92) - 1)
      : this._tlCalcPerPage({ hasFilter: true, filterH: 40, rowH: 44, bar: 0 });
    const pages = Math.max(1, Math.ceil(total / pp));

    // column definitions — content always visible (not in toggle list)
    const TRA_HIST_COLS = [
      { key: 'date',     label: this._t('tlColDate') },
      { key: 'user',     label: this._t('traUser') },
      { key: 'content',  label: this._t('traMedia'), always: true },
      { key: 'platform', label: this._t('tlColPlatform') },
      { key: 'quality',  label: this._t('actColQuality') },
      { key: 'duration', label: this._t('tlColDuration') },
      { key: 'progress', label: this._t('traProgress') },
    ];
    if (!m.traHistHiddenCols) m.traHistHiddenCols = new Set();
    const hidden    = m.traHistHiddenCols;
    const vis       = TRA_HIST_COLS.filter(col => !hidden.has(col.key));
    const toggleable = TRA_HIST_COLS.filter(col => !col.always);
    const colsBtn      = this._tlColsMenu('tra-hist-cols-btn', 'tra-hist-cols-menu',
      this._tlColItems(toggleable, hidden, 'data-tra-hist-col'), m.traHistColsOpen);
    const colsBtnIcon  = this._tlColsMenu('tra-hist-cols-btn', 'tra-hist-cols-menu',
      this._tlColItems(toggleable, hidden, 'data-tra-hist-col'), m.traHistColsOpen, true);

    // media type icon — reuse Tautulli style
    const mediaIcon = (type) => this._tlMediaIcon(type || '', 15);

    // Tautulli-style 5-level progress pie (shared method)
    const watchPie = pct => this._traWatchPie(pct);

    // watch status badge
    const watchBadge = (h) => {
      const p   = parseInt(h.progressMs || 0, 10);
      const t   = parseInt(h.totalDurationMs || 0, 10);
      const pct = t ? Math.round(p / t * 100) : 0;
      let label, color, bg;
      if (h.watched || pct >= 90)     { label = this._t('traWatchedOf');   color = '#34C759'; bg = 'rgba(52,199,89,0.15)'; }
      else if (pct >= 50)             { label = this._t('traEngaged');   color = '#007AFF'; bg = 'rgba(0,122,255,0.15)'; }
      else if (pct >= 10)             { label = this._t('traAbandoned'); color = '#FF9500'; bg = 'rgba(255,149,0,0.15)'; }
      else                            { label = this._t('traSampled');   color = 'rgba(255,255,255,0.35)'; bg = 'rgba(255,255,255,0.07)'; }
      return { label, color, bg, pct };
    };

    // date formatter: "Jun 14 / 21:11"
    const fmtDt = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      const date = d.toLocaleDateString(this._locale, { month: 'short', day: 'numeric' });
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      return { date, time };
    };

    const _SRV_CLR_F = { plex: '#e5a00d', jellyfin: '#7c4dff', emby: '#52b54b' };
    const srvMapF  = Object.fromEntries((m.histServers || []).map(s => [s.id, s]));
    const _srvSfx  = (id) => { const s = srvMapF[id]; if (!s?.type) return ''; return ' - ' + (s.type.charAt(0).toUpperCase() + s.type.slice(1)); };
    const srvOpts = (m.histServers || []).map(s => `<option value="${s.id}"${m.histServer===s.id?' selected':''}>${s.name}</option>`).join('');
    const filteredUsers = m.histServer
      ? (m.histUsers || []).filter(u => u.serverId === m.histServer)
      : (m.histUsers || []);
    const uOpts   = filteredUsers.map(u => `<option value="${u.id}"${m.histUser===u.id?' selected':''}>${u.displayName||u.username}${_srvSfx(u.serverId)}</option>`).join('');
    // One bar: search, the three pickers, then Columns. The period used to be
    // four pills — only one can be in force, which is what a picker says, and
    // on a phone four pills plus two selects never fit beside the search field.
    const periodItems = [
      ['all',   this._t('traAllTime')],
      ['week',  this._t('traLastWeek')],
      ['month', this._t('traLastMonth')],
      ['year',  this._t('traLastYear')],
    ];
    const mediaItems = [
      ['',        this._t('traAllMedia')],
      ['movie',   this._t('typeMovie')],
      ['episode', this._t('snEpisode')],
      ['track',   this._t('tabMusic')],
    ];
    const userItems = [['', this._t('traAllUsers')],
      ...filteredUsers.map(u => [u.id, (u.displayName || u.username) + _srvSfx(u.serverId)])];

    const filters = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">${
      this._uiBar('tra-hist-search', m.histSearch || '', [
        { id: 'tra-hist-period', kind: 'event',    value: m.histPeriod || 'all', neutral: 'all', items: periodItems },
        { id: 'tra-hist-user',   kind: 'relgroup', value: m.histUser || '',      neutral: '',    items: userItems },
        { id: 'tra-hist-media',  kind: 'source',   value: m.histMedia || '',     neutral: '',    items: mediaItems },
      ], [{ html: colsBtn }])}</div>`;

    if (!hist.length) return filters + `<div class="tra-hist-results-wrap" style="display:contents"><div style="color:var(--is-text-muted);text-align:center;padding:24px">${this._t('tlNoHistory')}</div></div>`;

    if (isMob) {
      const _DP_ICO = `<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" style="flex-shrink:0"><polygon points="5,3 19,12 5,21"/></svg>`;
      const _TC_ICO = `<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" style="flex-shrink:0"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
      const _CLK    = `<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;opacity:0.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
      const cards = hist.map((h, idx) => {
        const title  = h.showTitle || h.mediaTitle || '—';
        const yearLbl = h.showTitle
          ? `S${String(h.seasonNumber||0).padStart(2,'0')}E${String(h.episodeNumber||0).padStart(2,'0')}`
          : (h.year ? String(h.year) : '');
        const user   = h.user?.displayName || h.user?.username || '';
        const durRaw = h.durationMs ? (() => { const s=Math.round(h.durationMs/1000); const hh=Math.floor(s/3600); const mm=Math.floor((s%3600)/60); const ss=s%60; return hh>0?`${hh}h ${String(mm).padStart(2,'0')}m`:`${mm}m ${String(ss).padStart(2,'0')}s`; })() : '';
        const { label, color, bg, pct } = watchBadge(h);
        const dt     = fmtDt(h.startedAt);
        const decTag = h.isTranscode
          ? `${this._uiBadge(`${_TC_ICO}Transcode`, this._hexToRgbTriple('#FF9500'), { small: true })}`
          : `${this._uiBadge(`${_DP_ICO}Direct Play`, this._hexToRgbTriple('#34C759'), { small: true })}`;
        const metaParts = [
          yearLbl ? `<span>${yearLbl}</span>` : '',
          user    ? `<span>${user}</span>`    : '',
          durRaw  ? `<span style="display:inline-flex;align-items:center;gap:3px">${_CLK}${durRaw}</span>` : '',
        ].filter(Boolean).join('<span style="opacity:0.3;margin:0 1px">·</span>');
        return `<div class="tl-mob-card" data-tra-hist-row="${h.id||idx}" style="display:grid;grid-template-columns:1fr auto;row-gap:5px;column-gap:8px;align-items:center;cursor:pointer">
          <div style="display:flex;align-items:center;gap:5px;min-width:0;overflow:hidden">
            <span style="flex-shrink:0">${mediaIcon(h.mediaType)}</span>
            <span style="font-size:12px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</span>
          </div>
          <div style="display:flex;align-items:center;gap:4px;white-space:nowrap;justify-content:flex-end">
            ${watchPie(pct)}<span class="u-xs-muted">${pct}%</span>
          </div>
          <div>${decTag}</div>
          <div style="display:flex;justify-content:flex-end">
            ${this._uiBadge(`${label}`, this._hexToRgbTriple(color), { small: true })}
          </div>
          <div style="font-size:10px;color:var(--is-text-muted);display:flex;align-items:center;gap:4px;overflow:hidden;white-space:nowrap;min-width:0">${metaParts}</div>
          <div style="text-align:right;font-size:10px;color:var(--is-text-muted);white-space:nowrap;line-height:1.4">
            <div>${dt.date}</div><div>${dt.time}</div>
          </div>
        </div>`;
      }).join('');
      const pag = this._uiPager('tra-hist-page', m.histPage, pages);
      // Wrapper fills entire body (flex:1 + negative margins negate body padding).
      // Cards scroll internally; pagination always visible at bottom.
      return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;margin:-10px -12px -16px">
        <div style="flex-shrink:0;padding:10px 12px 0">${filters}</div>
        <div class="tra-hist-results-wrap" style="display:contents">
          <div style="flex:1;min-height:0;overflow:hidden">${cards}</div>
          ${pag ? `<div style="flex-shrink:0;padding:4px 12px 8px">${pag}</div>` : ''}
        </div>
      </div>`;
    }

    const rows = hist.map((h, idx) => {
      const title  = h.mediaTitle || '—';
      const sub    = h.showTitle
        ? `<div style="font-size:10px;color:var(--is-text-muted);margin-top:1px">${h.showTitle} · S${String(h.seasonNumber||0).padStart(2,'0')}E${String(h.episodeNumber||0).padStart(2,'0')}</div>`
        : (h.year ? `<div style="font-size:10px;color:var(--is-text-muted);margin-top:1px">${h.year}</div>` : '');
      const user   = h.user?.displayName || h.user?.username || '—';
      const srv    = srvMapF[h.serverId] || null;
      const srvType = srv?.type || null;
      const srvLabel = srvType ? (srvType.charAt(0).toUpperCase() + srvType.slice(1)) : null;
      const srvColor = srvType ? (_SRV_CLR_F[srvType] || 'rgba(255,255,255,0.4)') : null;
      const _DP_ICO = `<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" style="flex-shrink:0"><polygon points="5,3 19,12 5,21"/></svg>`;
      const _TC_ICO = `<svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor" style="flex-shrink:0"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
      const dec    = h.isTranscode
        ? `${this._uiBadge(`${_TC_ICO}Transcode`, this._hexToRgbTriple('#FF9500'), { small: true })}`
        : `${this._uiBadge(`${_DP_ICO}Direct Play`, this._hexToRgbTriple('#34C759'), { small: true })}`;
      const _CLK   = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;opacity:0.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
      const durRaw = h.durationMs ? (() => { const s=Math.round(h.durationMs/1000); const h2=Math.floor(s/3600); const m2=Math.floor((s%3600)/60); const s2=s%60; return h2>0 ? `${h2}h ${String(m2).padStart(2,'0')}m` : `${m2}m ${String(s2).padStart(2,'0')}s`; })() : '—';
      const dur    = h.durationMs ? `<div style="display:inline-flex;align-items:center;gap:4px">${_CLK}<span>${durRaw}</span></div>` : '—';
      const { label, color, bg, pct } = watchBadge(h);
      const dt     = fmtDt(h.startedAt);
      const cm = {
        date:     `<td style="white-space:nowrap"><div style="font-size:11px;font-weight:600;color:var(--is-text)">${dt.date}</div><div class="u-xs-muted">${dt.time}</div></td>`,
        user:     `<td><div class="u-row-6">${this._traUserAvatar(h.user,18)}<div><div style="font-size:11px;color:var(--is-text)">${user}</div>${srvLabel ? `<div style="font-size:9px;font-weight:700;color:${srvColor}">${srvLabel}</div>` : ''}</div></div></td>`,
        content:  `<td style="min-width:180px"><div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">${mediaIcon(h.mediaType)}<strong class="u-sm-text">${title}</strong>${this._uiBadge(`${label}`, this._hexToRgbTriple(color), { small: true })}</div>${sub}</td>`,
        platform: `<td><div style="font-size:11px;color:var(--is-text)">${h.platform||'—'}</div><div class="u-xs-muted">${h.product||''}</div></td>`,
        quality:  `<td>${dec}</td>`,
        duration: `<td style="font-size:11px;color:var(--is-text-muted);white-space:nowrap">${dur}</td>`,
        progress: `<td><div class="u-row-5">${watchPie(pct)}<span style="font-size:11px;color:var(--is-text-muted)">${pct}%</span></div></td>`,
      };
      return `<tr data-tra-hist-row="${h.id||idx}" style="cursor:pointer">${vis.map(col => cm[col.key] || '<td>—</td>').join('')}</tr>`;
    }).join('');

    const thead = vis.map(col => `<th>${col.label}</th>`).join('');
    const pag   = this._uiPager('tra-hist-page', m.histPage, Math.max(1, Math.ceil(total / pp)), true);
    return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;height:100%">
      <div style="flex-shrink:0">${filters}</div>
      <div class="tra-hist-results-wrap" style="display:contents">
        <div style="flex:1;min-height:0;overflow-x:auto;overflow-y:auto">
          <table class="tl-hist-table">
            <thead><tr>${thead}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="flex-shrink:0">${pag}</div>
      </div>
    </div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // History — session detail view
  // ──────────────────────────────────────────────────────────────────────────

  _traBodyHistDetail() {
    const m   = this._tracearrModal;
    const h   = m.histDetailItem;
    if (!h) return '<div style="color:var(--is-text-muted);padding:40px;text-align:center">' + this._t('tlNoData') + '</div>';

    const isMob = this._isMob;

    // Poster fetched via JS with auth header (blob URL set after render)
    const poster = !!h.posterUrl;

    const fmtDur = ms => {
      if (!ms || ms <= 0) return null;
      const s = Math.round(Number(ms) / 1000);
      const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
      return hh > 0 ? `${hh}h ${String(mm).padStart(2,'0')}m ${String(ss).padStart(2,'0')}s` : `${mm}m ${String(ss).padStart(2,'0')}s`;
    };
    const fmtDt = iso => {
      if (!iso) return null;
      const d = new Date(iso);
      return d.toLocaleDateString(this._locale, { month: 'short', day: 'numeric' }) + ', ' +
             d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };
    const row = (label, value) => (value != null && value !== '' && value !== '—')
      ? `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);gap:8px">
           <span style="font-size:11px;color:var(--is-text-muted);flex-shrink:0">${label}</span>
           <span style="font-size:11px;color:var(--is-text);text-align:right;word-break:break-all">${value}</span>
         </div>` : '';
    const secHdr = (label, bdg='') =>
      `<div style="display:flex;align-items:center;gap:6px;margin:14px 0 6px">
         <span style="font-size:10px;font-weight:700;color:var(--is-text-muted);text-transform:uppercase;letter-spacing:.06em">${label}</span>
         ${bdg}
       </div>`;
    const badge = (txt, color, bg) =>
      `${this._uiBadge(`${txt}`, this._hexToRgbTriple(color), { small: true })}`;
    const decisionBadge = dec => dec === 'transcode' ? badge(this._t('tlFilterTranscode'),'#FF9500','rgba(255,149,0,0.14)')
      : dec === 'copy' ? badge(this._t('traCopy'),'#007AFF','rgba(0,122,255,0.14)')
      : badge(this._t('tlFilterDirectPlay'),'#34C759','rgba(52,199,89,0.14)');

    // ── Media header ────────────────────────────────────────────────────────
    const title    = h.showTitle || h.mediaTitle || '—';
    const subtitle = h.showTitle
      ? `${h.mediaTitle ? h.mediaTitle + ' · ' : ''}S${String(h.seasonNumber||0).padStart(2,'0')}E${String(h.episodeNumber||0).padStart(2,'0')}`
      : (h.year ? String(h.year) : '');
    const p = parseInt(h.progressMs || 0), t = parseInt(h.totalDurationMs || 0);
    const pct = t ? Math.round(p / t * 100) : 0;
    const stateBadge = h.state === 'playing'
      ? badge(this._t('traPlaying'),'#34C759','rgba(52,199,89,0.14)')
      : badge(this._t('tlColStopped'),'rgba(255,255,255,0.5)','rgba(255,255,255,0.08)');
    const decBadge = decisionBadge(h.videoDecision || (h.isTranscode ? 'transcode' : 'directplay'));

    // ── Calculated watch time from timestamps ────────────────────────────────
    const watchMs = (h.startedAt && h.stoppedAt)
      ? new Date(h.stoppedAt) - new Date(h.startedAt) : (Number(h.durationMs) || 0);

    // ── Server badge ─────────────────────────────────────────────────────────
    const _SRV_CLR = { plex: '#e5a00d', jellyfin: '#7c4dff', emby: '#52b54b' };
    const srvMapF  = Object.fromEntries((m.histServers || []).map(s => [s.id, s]));
    const srv      = srvMapF[h.serverId];
    const srvType  = (srv?.type || h.serverName || '').toLowerCase();
    const srvName  = h.serverName || srv?.name || '';
    const srvClr   = _SRV_CLR[srvType] || '#fff';
    const srvBadge = srvName ? badge(srvName, srvClr, 'rgba(255,255,255,0.07)') : '';

    // ── Source/Stream comparison table ───────────────────────────────────────
    const streamTbl = (fields) => {
      const any = fields.some(([, sv, dv]) => sv != null || dv != null);
      if (!any) return '';
      return `<table style="width:100%;border-collapse:collapse;font-size:10px">
        <thead><tr>
          <th style="text-align:left;color:var(--is-text-muted);font-weight:600;padding:3px 0;width:35%"></th>
          <th style="text-align:left;color:var(--is-text-muted);font-weight:600;padding:3px 4px;width:28%">${this._t('actColSource')}</th>
          <th style="padding:3px 0;width:6%"></th>
          <th style="text-align:left;color:var(--is-text-muted);font-weight:600;padding:3px 4px;width:31%">${this._t('traStreamCol')}</th>
        </tr></thead>
        <tbody>${fields.map(([lbl, sv, dv]) => {
          if (sv == null && dv == null) return '';
          const svStr = sv != null ? String(sv) : '—';
          const dvStr = dv != null ? String(dv) : svStr;
          const same  = svStr === dvStr;
          return `<tr>
            <td style="color:var(--is-text-muted);padding:3px 0;vertical-align:top">${lbl}</td>
            <td style="color:var(--is-text);font-weight:600;padding:3px 4px;vertical-align:top">${svStr}</td>
            <td style="color:rgba(255,255,255,0.2);text-align:center;padding:3px 0;vertical-align:top">→</td>
            <td style="color:${same?'rgba(255,255,255,0.38)':'#0a84ff'};font-weight:600;padding:3px 4px;vertical-align:top">${dvStr}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
    };

    // ── Video fields (source from sourceVideoDetails, stream from streamVideoDetails) ──
    const svd = h.sourceVideoDetails || {};
    const stv = h.streamVideoDetails || svd; // directplay → same as source
    const sad = h.sourceAudioDetails || {};
    const sta = h.streamAudioDetails || sad;
    const srcRes = (h.sourceVideoWidth && h.sourceVideoHeight)
      ? `${h.sourceVideoWidth}×${h.sourceVideoHeight}${h.resolution ? ` (${h.resolution})` : ''}` : (h.resolution || null);
    const stmRes = srcRes; // directplay same; transcode would differ

    // ── LEFT panel ──────────────────────────────────────────────────────────
    const leftPanel = `<div style="flex:1;min-width:0">
      <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px 14px;display:flex;gap:12px;align-items:flex-start">
        ${poster ? `<img id="tra-hist-poster" style="width:60px;min-width:60px;border-radius:6px;object-fit:cover;aspect-ratio:2/3;background:rgba(255,255,255,0.05)">` : ''}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
            ${this._tlMediaIcon(h.mediaType || '', 15)}
            <span style="font-size:13px;font-weight:700;color:var(--is-text)">${title}</span>
            ${stateBadge}
          </div>
          ${subtitle ? `<div style="font-size:11px;color:var(--is-text-muted);margin-bottom:6px">${subtitle}</div>` : ''}
          <div style="height:4px;border-radius:2px;background:rgba(255,255,255,0.1);margin:8px 0 2px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:#0a84ff;border-radius:2px"></div>
          </div>
          <div style="font-size:10px;color:var(--is-text-muted);text-align:right">${pct}%</div>
        </div>
      </div>

      ${secHdr(this._t('traPlayback'))}
      <div class="u-panel">
        ${row(this._t('tlColStarted'), fmtDt(h.startedAt))}
        ${row(this._t('tlColStopped'), fmtDt(h.stoppedAt))}
        ${row(this._t('traWatchTimeLc'), fmtDur(watchMs))}
        ${row(this._t('traLength'), fmtDur(parseInt(h.totalDurationMs || 0)))}
      </div>

      ${secHdr(this._t('tlColUser'))}
      <div class="u-panel">
        <div class="u-row-8">
          ${this._traUserAvatar(h.user, 28)}
          <span class="u-sm-text">${h.user?.displayName || h.user?.username || '—'}</span>
        </div>
      </div>

      ${srvName ? `${secHdr(this._t('traServer'))}
      <div class="u-panel">
        ${row(this._t('traServer'), `<span style="color:${srvClr};font-weight:700">${srvName}</span> · ${srvName}`)}
      </div>` : ''}

      ${secHdr(this._t('traDevice'))}
      <div class="u-panel">
        ${row(this._t('tlColPlatform'), h.platform)}
        ${row(this._t('tlColProduct'), h.product)}
        ${row(this._t('traDevice'), h.device)}
        ${row(this._t('tlColPlayer'), h.player)}
      </div>
    </div>`;

    // ── RIGHT panel ──────────────────────────────────────────────────────────
    const rightPanel = `<div style="flex:1;min-width:0${isMob ? ';margin-top:0' : ''}">
      ${secHdr(this._t('traStreamDetails'), decBadge)}
      <div class="u-panel">
        ${row(this._t('traContainer'), h.transcodeInfo?.sourceContainer ? `${h.transcodeInfo.sourceContainer} → ${h.transcodeInfo.sourceContainer}` : null)}
        ${row(this._t('traBitrate'), h.bitrate ? `${(h.bitrate/1000).toFixed(1)} Mbps` : null)}
      </div>

      ${secHdr(this._t('traVideo'), decisionBadge(h.videoDecision))}
      <div class="u-panel">
        ${streamTbl([
          [this._t('traCodec'),      h.sourceVideoCodecDisplay || h.sourceVideoCodec, h.streamVideoCodecDisplay || h.streamVideoCodec || h.sourceVideoCodecDisplay],
          [this._t('traResolution'), srcRes, stmRes],
          [this._t('traBitrate'),    svd.bitrate ? `${(svd.bitrate/1000).toFixed(1)} Mbps` : null, stv.bitrate ? `${(stv.bitrate/1000).toFixed(1)} Mbps` : null],
          [this._t('traFramerate'),  svd.framerate, stv.framerate],
          ['HDR',        svd.dynamicRange, stv.dynamicRange],
          [this._t('actColProfile'),    svd.profile, null],
          [this._t('traColor'),      svd.colorSpace ? `${svd.colorSpace} ${svd.colorDepth ? svd.colorDepth+'bit' : ''}`.trim() : null, null],
        ])}
      </div>

      ${secHdr(this._t('pwAudio'), decisionBadge(h.audioDecision))}
      <div class="u-panel">
        ${streamTbl([
          [this._t('traCodec'),       h.sourceAudioCodecDisplay || h.sourceAudioCodec, h.streamAudioCodecDisplay || h.streamAudioCodec || h.sourceAudioCodecDisplay],
          [this._t('traChannels'),    h.audioChannelsDisplay || (h.sourceAudioChannels != null ? String(h.sourceAudioChannels) : null), h.audioChannelsDisplay],
          [this._t('traBitrate'),     sad.bitrate ? `${sad.bitrate} kbps` : null, sta.bitrate ? `${sta.bitrate} kbps` : null],
          [this._t('pwLanguage'),    sad.language, sta.language],
          [this._t('traSampleRate'), sad.sampleRate ? `${(sad.sampleRate/1000).toFixed(0)} kHz` : null, null],
        ])}
      </div>

      ${h.subtitleInfo ? `${secHdr(this._t('subtitles'))}
      <div class="u-panel">
        ${row(this._t('traFormat'), [h.subtitleInfo.format || h.subtitleInfo.codec, h.subtitleInfo.language].filter(Boolean).join(' · '))}
        ${row(this._t('traDecision'), h.subtitleInfo.decision)}
      </div>` : ''}
    </div>`;

    return `<div id="tra-hist-detail" style="display:flex;flex-direction:${isMob?'column':'row'};gap:20px;height:100%;min-height:0;overflow-y:auto">
      <button id="tra-hist-detail-back" style="display:none"></button>
      ${leftPanel}
      ${rightPanel}
    </div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Activity tab
  // ──────────────────────────────────────────────────────────────────────────

  _traBodyActivity() {
    const m    = this._tracearrModal;
    const act  = m.activityData || {};
    const period = m.activityPeriod || 'month';
    const days = period === 'week' ? 7 : period === 'year' ? 365 : 30;
    const isMob    = this._isMob;
    const isTablet = !isMob && maxWidth(BP.TABLET);

    // ── Convert Tracearr data → Tautulli chart format ────────────────────────

    const tauFmt = (categories, series) => ({ response: { data: { categories, series } } });

    // Client-side day filter — API ignores ?days= param, always returns same dataset
    const playsAll = act.plays || [];
    const concAll  = act.concurrent || [];
    const ptsP = playsAll.slice(-days);
    const ptsC = concAll.slice(-days);

    // Plays Over Time
    const playsRaw = tauFmt(
      ptsP.map(p => (p.date || '').slice(0, 10)),
      [{ name: 'Plays', data: ptsP.map(p => p.count || 0) }]
    );

    // Concurrent Streams by Type
    const concRaw = tauFmt(
      ptsC.map(p => (p.date || p.day || '').slice(0, 10)),
      [
        { name: 'Direct Play',   data: ptsC.map(p => Number(p.direct)       || 0) },
        { name: 'Direct Stream', data: ptsC.map(p => Number(p.directStream) || 0) },
        { name: 'Transcode',     data: ptsC.map(p => Number(p.transcode)    || 0) },
      ]
    );

    // Day of Week
    const dowRaw = (() => {
      const raw  = act.byDayOfWeek || [];
      const DOW  = [this._t('dowSun'),this._t('dowMon'),this._t('dowTue'),this._t('dowWed'),this._t('dowThu'),this._t('dowFri'),this._t('dowSat')];
      const cats = raw.map((it, i) => it.name ? it.name.slice(0,3) : DOW[it.day ?? it.dayOfWeek ?? i] || String(i));
      const vals = raw.map(it => it.count || 0);
      return tauFmt(cats, [{ name: 'Plays', data: vals }]);
    })();

    // Hour of Day
    const hodRaw = (() => {
      const raw  = act.byHourOfDay || [];
      const cats = raw.map((it, i) => String(typeof it === 'number' ? i : (it.hour ?? i)));
      const vals = raw.map(it => typeof it === 'number' ? it : (it.count || it.plays || 0));
      return tauFmt(cats, [{ name: 'Plays', data: vals }]);
    })();

    // Stream Quality — one colored series per type so each bar gets correct color
    const qual = act.quality || {};
    const qualRaw = (() => {
      const entries = [
        { name: 'Direct Play',   val: qual.directPlay   || 0 },
        { name: 'Direct Stream', val: qual.directStream || 0 },
        { name: 'Transcode',     val: qual.transcode    || 0 },
      ].filter(e => e.val > 0);
      return tauFmt(
        entries.map(e => e.name),
        entries.map((e, i) => ({ name: e.name, data: entries.map((_, j) => j === i ? e.val : 0) }))
      );
    })();

    // Platforms — one series per platform so each bar gets distinct color
    const platRaw = (() => {
      const plats = (act.platforms || []).slice(0, 8);
      return tauFmt(
        plats.map(p => p.platform),
        plats.map((p, i) => ({ name: p.platform, data: plats.map((_, j) => j === i ? (p.count || 0) : 0) }))
      );
    })();

    // ── Day selector ─────────────────────────────────────────────────────────

    const _ACT_P_LBLS = isMob ? { week: 'W', month: 'M', year: 'Y' } : { week: this._t('mtWeek'), month: this._t('mtMonth'), year: this._t('actColYear') };
    const dayBtns = _traSegHtml(['week','month','year'].map(p => [p, _ACT_P_LBLS[p]]), period, 'data-tra-act-period');

    const hdr = `<div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:${isMob ? 10 : 12}px">
      ${dayBtns}
    </div>`;

    // ── Build charts ──────────────────────────────────────────────────────────

    // Bar/line chart height — 3 rows × 2 cols must fit modal without scrolling
    const chartH = isMob ? 100 : isTablet ? 108 : 118;
    const BASE = { range: ptsP.length || days, isDate: true, isMob, height: chartH };
    const BOPT = { isMob, height: chartH };

    // Show ~6-8 x-axis labels regardless of point count (avoid overlap)
    const lineXLabel = (n => (d, i) => i % Math.max(1, Math.ceil(n / 7)) === 0 ? d.slice(-5) : '')(ptsP.length);

    const playsSvg = this._tlGLineSvg(playsRaw, { ...BASE, chartId: 'tra-p', xLabel: lineXLabel, noDots: true });
    const concSvg  = this._tlGLineSvg(concRaw,  { ...BASE, chartId: 'tra-c', isDuration: false, xLabel: lineXLabel, noDots: true });
    const dowSvg   = this._tlGBarSvg(dowRaw,    { ...BOPT, chartId: 'tra-dw', xLabel: d => d.slice(0, 3) });
    const hodSvg   = this._tlGBarSvg(hodRaw,    { ...BOPT, chartId: 'tra-hd', xLabel: (_, i) => i % 4 === 0 ? `${i}h` : '' });

    const playsCard = this._tlGCard(this._t('traPlaybackTrend'), playsRaw, playsSvg);
    const concCard  = this._tlGCard(this._t('traVtConcurrent'),        concRaw,  concSvg);
    const dowCard   = this._tlGCard(this._t('traActDow'),  dowRaw,   dowSvg);
    const hodCard   = this._tlGCard(this._t('traActHod'),  hodRaw,   hodSvg);

    // ── Donut helpers for Quality + Platforms ─────────────────────────────────

    const DONUT_HEX = ['#34C759','#007AFF','#FF3B30','#FF9500','#BF5AF2','#FF2D55','#5AC8FA','#FFCC00'];
    const QUAL_HEX  = { 'Direct Play': '#34C759', 'Direct Stream': '#007AFF', 'Transcode': '#FF3B30' };

    const svgDonut = (segs, size) => {
      const total = segs.reduce((s, sg) => s + (sg.value || 0), 0);
      if (!total) return `<div class="donut-wrap" style="position:relative;display:inline-block;flex-shrink:0"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"></svg><div class="donut-tt" style="display:none"></div></div>`;
      const cx = size / 2, cy = size / 2, r = size * 0.34, sw = size * 0.15;
      const C  = 2 * Math.PI * r;
      let cum  = 0;
      const gap = segs.length > 1 ? 3 : 0;
      const uid = Math.random().toString(36).slice(2, 7);
      const ro  = (r + sw / 2).toFixed(1);
      const ri  = (r - sw / 2).toFixed(1);
      const ip  = (Number(ri) / Number(ro) * 100).toFixed(0);
      const defs = '<defs>' + segs.map((sg, i) =>
        `<radialGradient id="dg-${uid}-${i}" cx="${cx}" cy="${cy}" r="${ro}" fx="${cx}" fy="${cy}" gradientUnits="userSpaceOnUse">` +
        `<stop offset="${ip}%" stop-color="${sg.color}" stop-opacity="0.5"/>` +
        `<stop offset="100%" stop-color="${sg.color}" stop-opacity="1"/>` +
        `</radialGradient>`
      ).join('') + '</defs>';
      const rings = segs.map(sg => {
        const full = sg.value / total * C;
        const dash = Math.max(0, full - gap);
        const off  = -cum; cum += full;
        return `<circle class="donut-ring" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sg.color}" stroke-width="${sw * 1.9}" stroke-linecap="butt" stroke-dasharray="${dash.toFixed(2)} ${(C-dash).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" stroke-opacity="0" style="transition:stroke-opacity 0.15s"/>`;
      }).join('');
      cum = 0;
      const arcs = segs.map((sg, i) => {
        const full = sg.value / total * C;
        const dash = Math.max(0, full - gap);
        const off  = -cum; cum += full;
        const pct  = Math.round(sg.value / total * 100);
        return `<circle class="donut-arc" data-idx="${i}" data-label="${sg.label}" data-value="${sg.value}" data-pct="${pct}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#dg-${uid}-${i})" stroke-width="${sw}" stroke-linecap="butt" stroke-dasharray="${dash.toFixed(2)} ${(C-dash).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" style="cursor:pointer"><animate attributeName="r" from="0" to="${r.toFixed(2)}" dur="0.8s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.25 0.46 0.45 0.94" keyTimes="0;1"/><animate attributeName="stroke-dasharray" from="0 ${C.toFixed(2)}" to="${dash.toFixed(2)} ${(C-dash).toFixed(2)}" dur="0.8s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.25 0.46 0.45 0.94" keyTimes="0;1"/></circle>`;
      }).join('');
      const fs = Math.min(size * 0.14, 12);
      const svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;overflow:visible">
        ${defs}
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${sw}"/>
        <g><animateTransform attributeName="transform" type="rotate" from="-360 ${cx} ${cy}" to="0 ${cx} ${cy}" dur="0.8s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.25 0.46 0.45 0.94" keyTimes="0;1"/>${rings}${arcs}</g>
        <text x="${cx}" y="${cy + fs * 0.4}" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-size="${fs}" font-weight="700">${total}</text>
      </svg>`;
      return `<div class="donut-wrap" style="position:relative;display:inline-block;flex-shrink:0">${svg}<div class="donut-tt" style="display:none;position:absolute;pointer-events:none;background:rgba(15,15,20,0.92);border:1px solid rgba(255,255,255,0.13);border-radius:6px;padding:5px 9px;white-space:nowrap;z-index:10;color:rgba(255,255,255,0.9)"></div></div>`;
    };

    const donutCard = (title, segs) => {
      const total = segs.reduce((s, sg) => s + sg.value, 0);
      const ds = isMob ? 78 : 92;
      const legendItems = segs.map(s => {
        const pct = total ? Math.round(s.value / total * 100) : 0;
        return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">
          <span style="width:7px;height:7px;border-radius:2px;background:${s.color};flex-shrink:0"></span>
          <span style="font-size:10px;color:var(--is-text);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.label}</span>
          <span style="font-size:10px;font-weight:700;color:var(--is-text-muted)">${pct}%</span>
        </div>`;
      }).join('');
      return `<div class="tl-g-card">
        <div style="margin-bottom:8px"><span class="tl-graph-title">${title}</span></div>
        <div style="display:flex;align-items:center;gap:12px">
          ${svgDonut(segs, ds)}
          <div style="flex:1;min-width:0">${legendItems}</div>
        </div>
      </div>`;
    };

    const qualSegs = [
      { label: this._t('tlFilterDirectPlay'),   value: qual.directPlay   || 0, color: QUAL_HEX['Direct Play']   },
      { label: this._t('tlFilterDirectStream'), value: qual.directStream || 0, color: QUAL_HEX['Direct Stream'] },
      { label: this._t('tlFilterTranscode'),     value: qual.transcode    || 0, color: QUAL_HEX['Transcode']     },
    ].filter(s => s.value > 0);

    const platSegs = (act.platforms || []).slice(0, 8).map((p, i) => ({
      label: p.platform, value: p.count || 0, color: DONUT_HEX[i % DONUT_HEX.length]
    }));

    const qualCard = donutCard(this._t('traStreamQuality'), qualSegs);
    const platCard = donutCard(this._t('traPlatforms'),      platSegs);

    // ── Layout: tablet = 2-column grid, mobile = single column ───────────────

    if (isMob) {
      return hdr + `<div style="display:flex;flex-direction:column;gap:8px">${playsCard}${concCard}${dowCard}${hodCard}${qualCard}${platCard}</div>`;
    }

    return hdr +
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${isTablet?'6px':'8px'}">` +
        playsCard + concCard +
        dowCard   + hodCard  +
        qualCard  + platCard +
      `</div>`;
  }

}

export const tracearrHistoryMixin = _TracearrHistoryMethods.prototype;
