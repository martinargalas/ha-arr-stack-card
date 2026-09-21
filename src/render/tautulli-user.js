import { _TL_TRASH } from './tautulli-table.js';

// Tautulli, one user in detail: profile, history, IPs. Split out of render/tautulli-table.js.

class _TautulliUserRenderMethods {

  // ──────────────────────────────────────────────────────────────────────────
  // User detail — wrapper
  // ──────────────────────────────────────────────────────────────────────────

  _tlBodyUserDetail() {
    const m     = this._tautulliModal || {};
    const tab   = m.userDetailTab || 'profile';
    const name  = String(m.userDetailName || '—');
    const thumb = this._imgSrc(m.userDetailThumb);
    const isMob = this._isMob;

    const av = thumb
      ? `<img src="${thumb}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid var(--is-divider);flex-shrink:0" loading="lazy" onerror="this.style.display='none'">`
      : `<span style="width:40px;height:40px;border-radius:50%;background:var(--is-btn-bg);display:inline-flex;align-items:center;justify-content:center;color:var(--is-text-muted);font-size:15px;font-weight:700;flex-shrink:0">${this._escHtml((name[0] || '?').toUpperCase())}</span>`;

    const TAB_LABELS = { profile: this._t('actColProfile'), history: this._t('tlHistory'), ips: this._t('tlIpAddresses') };
    const tabBtns = `<span class="mt-nav mt-nav--inline"><span class="mt-nav-ind"></span>${
      ['profile','history','ips'].map(t =>
        `<button class="mt-nav-btn${tab === t ? ' is-on' : ''}" data-tl-ud-tab="${t}">${TAB_LABELS[t]}</button>`).join('')
    }</span>`;

    // Going back is the modal's close button while a detail is open, as in
    // Maintainerr — this stays only as the hook it clicks.
    const backBtn = `<button data-tl-ud-back style="display:none"></button>`;

    const hdr = isMob
      ? `<div style="margin-bottom:12px">
           ${backBtn}
           <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
             ${av}
             <div style="font-size:15px;font-weight:700;color:var(--is-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(name)}</div>
           </div>
           ${tabBtns}
         </div>`
      : `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
           ${backBtn}${av}
           <div style="font-size:15px;font-weight:700;color:var(--is-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0">${this._escHtml(name)}</div>
           ${tabBtns}
         </div>`;

    let content = '';
    if (tab === 'profile')       content = this._tlBodyUdProfile();
    else if (tab === 'history')  content = this._tlBodyUdHistory();
    else                         content = this._tlBodyUdIps();

    return hdr + content;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // User detail — Profile tab
  // ──────────────────────────────────────────────────────────────────────────

  _tlBodyUdProfile() {
    const m       = this._tautulliModal || {};
    const profile = m.userDetailProfile;
    if (!profile) return `<div class="u-empty-lg">${this._t('loading')}</div>`;

    const isMob = this._isMob;
    const wts = profile.watchTimeStats || [];
    const ps  = profile.playerStats   || [];
    const rh  = profile.recentHistory || [];

    // Watch time stats — API returns [{query_days:1,...},{query_days:7,...},{query_days:30,...},{query_days:0,...}]
    const periodLabel = d => d === 1 ? this._t('tlLast24h') : d === 7 ? this._t('tlLast7d') : d === 30 ? this._t('tlLast30d') : this._t('tlAllTime');
    const statMap = {};
    wts.forEach(s => { statMap[Number(s.query_days)] = s; });

    const statCards = [1,7,30,0].map(d => {
      const s     = statMap[d] || {};
      const plays = Number(s.total_plays) || 0;
      const dur   = s.total_time ? this._tlFmtDuration(s.total_time) : '0m';
      return `<div style="background:var(--is-row-hover);border-radius:8px;padding:${isMob ? '6px' : '8px 6px'};text-align:center;display:flex;flex-direction:column;gap:2px">
        <div style="font-size:${isMob ? '9px' : '10px'};font-weight:700;color:var(--is-text);text-transform:uppercase;letter-spacing:0.3px">${periodLabel(d)}</div>
        <div style="font-size:${isMob ? '16px' : '20px'};font-weight:800;color:rgba(250,180,50,0.95);line-height:1">${plays} <span style="font-size:8px;font-weight:600;color:var(--is-text-muted);text-transform:uppercase">plays</span></div>
        <div style="font-size:${isMob ? '10px' : '11px'};font-weight:600;color:var(--is-text)">${dur}</div>
      </div>`;
    }).join('');

    // Player stats — horizontal chips with platform icon
    const _platIcon = (plat) => {
      const p = (plat || '').toLowerCase();
      const s = `viewBox="0 0 24 24" width="20" height="20" fill="currentColor"`;
      if (p.includes('ios') || p.includes('ipad') || p.includes('iphone') || p.includes('tvos') || p.includes('apple'))
        return `<svg ${s}><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`;
      if (p.includes('android') || p.includes('samsung') || p.includes('pixel') || p.includes('galaxy'))
        return `<svg ${s}><path d="M17.523 15.341c-.398 0-.72-.322-.72-.72s.322-.72.72-.72.72.322.72.72-.322.72-.72.72m-11.046 0c-.398 0-.72-.322-.72-.72s.322-.72.72-.72.72.322.72.72-.322.72-.72.72M17.69 8.5l1.6-2.771a.333.333 0 10-.577-.333l-1.62 2.806A9.867 9.867 0 0012 7.167a9.867 9.867 0 00-5.093 1.035L5.287 5.396a.333.333 0 10-.577.333L6.31 8.5C3.7 9.991 1.97 12.768 2 16h20c.03-3.232-1.7-6.009-4.31-7.5z"/></svg>`;
      if (p.includes('chrome') || p.includes('chromium'))
        return `<svg ${s} fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="21.17" y1="8" x2="12" y2="8"/><line x1="3.95" y1="6.06" x2="8.54" y2="14"/><line x1="10.88" y1="21.94" x2="15.46" y2="14"/></svg>`;
      if (p.includes('roku'))
        return `<svg ${s} fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="14" rx="2"/><line x1="8" y1="22" x2="16" y2="22"/><line x1="12" y1="18" x2="12" y2="22"/></svg>`;
      if (p.includes('xbox'))
        return `<svg ${s}><path d="M4.102 7.512C3.438 8.28 3 9.251 3 10.343c0 1.574.757 2.968 1.917 3.86C4.918 8.948 7.14 5.852 10.14 3.4 8.34 3.543 6.024 4.698 4.103 7.512zm15.796 0C17.977 4.698 15.661 3.543 13.86 3.4c3 2.451 5.222 5.548 5.223 10.803A4.986 4.986 0 0021 10.343c0-1.092-.438-2.063-1.102-2.83zM12 4c-1.55 1.254-5 4.73-5 9 0 1.636.438 3.168 1.194 4.494.806 1.408 1.937 2.573 3.806 4.506 1.869-1.933 3-3.098 3.806-4.506C16.562 16.168 17 14.636 17 13c0-4.27-3.45-7.746-5-9z"/></svg>`;
      if (p.includes('playstation') || p.includes('ps4') || p.includes('ps5'))
        return `<svg ${s}><path d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-.996.636.199.76.866.76 1.554v5.302c2.773 1.103 4.926-.24 4.926-3.604C19.38 5.726 17.581 4 14.198 4 12.99 4 10.67 4.344 8.985 2.596zM4.62 18.686c-2.545.73-2.697-1.114-.76-1.688l3.15-.934v-2.314l-4.6 1.361C-1.327 16.44.63 21.04 4.62 20.109l3.389-1.004v-2.33z"/></svg>`;
      // generic screen/device
      return `<svg ${s} fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
    };

    const playerChips = ps.length
      ? `<div style="display:flex;flex-wrap:nowrap;gap:${isMob ? '8px' : '12px'};overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:2px">` +
        ps.map(p => {
          const platform = this._escHtml(p.platform || '');
          const player   = this._escHtml(p.player   || p.friendly_name || platform);
          const plays    = Number(p.total_plays) || 0;
          const icon     = _platIcon(p.platform || '');
          return `<div style="background:var(--is-row-hover);border-radius:12px;padding:${isMob ? '10px 12px' : '12px 16px'};display:flex;flex-direction:column;align-items:center;gap:6px;min-width:${isMob ? '76px' : '90px'};flex-shrink:0">
            <div style="color:var(--is-text-muted)">${icon}</div>
            <div style="font-size:${isMob ? '10px' : '11px'};font-weight:600;color:var(--is-text);text-align:center;width:${isMob ? '68px' : '82px'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${player}</div>
            <div style="font-size:${isMob ? '14px' : '16px'};font-weight:800;color:rgba(250,180,50,0.95);line-height:1">${plays}</div>
            <div style="font-size:9px;color:var(--is-text-muted);text-transform:uppercase">plays</div>
          </div>`;
        }).join('') + '</div>'
      : `<div style="color:var(--is-text-muted);font-size:12px;padding:8px 0">${this._t('tlNoPlayerData')}</div>`;

    // Recently played — paged poster strip with chevron navigation
    let recentSection = '';
    if (rh.length) {
      const W        = isMob ? 100 : 130;
      const H        = Math.round(W * 1.5);
      const perPage  = isMob ? 4 : 7;
      const pages    = [];
      for (let i = 0; i < rh.length; i += perPage) pages.push(rh.slice(i, i + perPage));
      const multiPage = pages.length > 1;

      const posterCard = (h) => {
        const title     = this._escHtml(h.full_title || h.title || '—');
        const ago       = h.date ? this._tlFmtDate(h.date) : '';
        const mt        = (h.media_type || '').toLowerCase();
        const isLive    = (mt === 'live' || mt === 'livetv' || h.live === 1);
        const thumbPath = (mt === 'episode' && h.grandparent_thumb) ? h.grandparent_thumb : (h.thumb || '');
        const icon      = this._tlMediaIcon(mt, 16);
        const typeLabel = isLive ? this._t('tlFilterLiveTV')
          : (mt === 'movie')   ? this._t('typeMovie')
          : (mt === 'episode') ? this._t('typeTv')
          : (mt === 'track')   ? this._t('tabMusic')
          : null;
        const typeTag   = typeLabel ? `<span class="media-type-tag">${typeLabel}</span>` : '';
        const rk        = this._escHtml(h.rating_key || '');
        const mdAttr    = rk ? ` data-tl-md-open="${rk}" data-tl-md-title="${title}" data-tl-md-thumb="${this._escHtml(thumbPath)}" data-tl-md-prev="user" style="cursor:pointer"` : '';
        const imgTag    = thumbPath
          ? `<img data-tl-plex-path="${this._escHtml(thumbPath)}" alt="" style="width:${W}px;height:${H}px;object-fit:cover;border-radius:6px;display:block" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            + `<div style="display:none;width:${W}px;height:${H}px;background:var(--is-row-hover);border-radius:6px;align-items:center;justify-content:center">${icon}</div>`
          : `<div style="width:${W}px;height:${H}px;background:var(--is-row-hover);border-radius:6px;display:flex;align-items:center;justify-content:center">${icon}</div>`;
        const grad = `<div class="mc-grad" style="border-radius:0 0 6px 6px">
          <div class="mc-title" style="font-size:10px" title="${title}">${title}</div>
          ${ago ? `<div class="mc-sub" style="font-size:9px">${ago}</div>` : ''}
        </div>`;
        return `<div${mdAttr} style="flex-shrink:0;width:${W}px">
          <div style="position:relative;line-height:0;border-radius:6px;overflow:hidden">${imgTag}${typeTag}${grad}</div>
        </div>`;
      };

      const pagesHtml = pages.map(pg =>
        `<div style="display:flex;gap:8px;flex-shrink:0;min-width:100%;scroll-snap-align:start;padding:2px 0">${pg.map(posterCard).join('')}</div>`
      ).join('');

      const chevStyle = `background:none;border:none;color:var(--is-text);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;opacity:0.85`;
      const chevL = `<button class="tl-ud-rec-prev" disabled style="${chevStyle}"><ha-icon icon="mdi:chevron-left"  style="--mdc-icon-size:28px"></ha-icon></button>`;
      const chevR = `<button class="tl-ud-rec-next"        style="${chevStyle}"><ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:28px"></ha-icon></button>`;

      recentSection = `<div style="margin-top:14px">
        <div class="u-section-hdr">${this._t('tlRecentlyPlayed')}</div>
        <div class="sv-nav-wrap">
          ${multiPage ? chevL : ''}
          <div class="sv-scroll" id="tl-ud-rec-scroll" style="scroll-snap-type:x mandatory">${pagesHtml}</div>
          ${multiPage ? chevR : ''}
        </div>
      </div>`;
    }

    return `<div style="margin-bottom:${isMob ? '10px' : '14px'}">
      <div class="u-section-hdr">${this._t('tlGlobalStats')}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:${isMob ? '6px' : '10px'}">${statCards}</div>
    </div>
    <div style="margin-bottom:0">
      <div class="u-section-hdr">${this._t('tlPlayerStats')}</div>
      ${playerChips}
    </div>
    ${recentSection}`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // User detail — History tab
  // ──────────────────────────────────────────────────────────────────────────

  _tlBodyUdHistory() {
    const m = this._tautulliModal;
    if (!m) return '';
    if (m.userDetailHistLoading) return `<div class="u-empty-lg">${this._t('loading')}</div>`;

    const isMob    = this._isMob;
    const page     = m.userDetailHistPage    || 0;
    const perPage  = this._tlCalcPerPage({ hasFilter: true });
    const tot      = m.userDetailHistTotal   || 0;
    const data     = m.userDetailHistData    || [];
    const media    = m.userDetailHistMedia   || null;
    const playback = m.userDetailHistPlayback|| null;
    // No delete mode here either — the trash lives in the row.
    const expRow   = m.userDetailHistExpandedRow || null;
    const hidden    = this._tlHidden('userDetailHistHiddenCols',    ['ip','paused','stopped']);
    const mobHidden = this._tlHidden('userDetailHistMobHiddenCols', ['ip','platform','product','player','paused','stopped']);
    const totalPages = Math.max(1, Math.ceil(tot / perPage));

    const HIST_COLS = [
      { key:'date',     label:this._t('tlColDate'),     right:false },
      { key:'ip',       label:this._t('tlColIP'),       right:false },
      { key:'platform', label:this._t('tlColPlatform'), right:false },
      { key:'product',  label:this._t('tlColProduct'),  right:false },
      { key:'player',   label:this._t('tlColPlayer'),   right:false },
      { key:'title',    label:this._t('tlColTitle'),    right:false },
      { key:'started',  label:this._t('tlColStarted'),  right:false },
      { key:'paused',   label:this._t('tlColPaused'),   right:true  },
      { key:'stopped',  label:this._t('tlColStopped'),  right:false },
      { key:'duration', label:this._t('tlColDuration'), right:true  },
    ];

    const MOB_PICKER = [
      { key:'platform', label:this._t('tlColPlatform') },
      { key:'player',   label:this._t('tlColPlayer') },
      { key:'started',  label:this._t('tlColStarted') },
      { key:'duration', label:this._t('tlColDuration') },
      { key:'ip',       label:this._t('tlColIP') },
      { key:'paused',   label:this._t('tlColPaused') },
      { key:'stopped',  label:this._t('tlColStopped') },
    ];
    const colsBtn = isMob
      ? this._tlColsMenu('tl-ud-hist-mob-cols-btn', 'tl-ud-hist-mob-cols-menu', this._tlColItems(MOB_PICKER, mobHidden, 'data-tl-ud-hist-mob-col'), m.userDetailHistMobColsOpen)
      : this._tlColsMenu('tl-ud-hist-cols-btn',     'tl-ud-hist-cols-menu',     this._tlColItems(HIST_COLS.filter(c => c.key !== 'title'), hidden, 'data-tl-ud-hist-col'), m.userDetailHistColsOpen);

    // One bar, as in the main History tab: the media and playback filters were
    // nine pills on a row of their own, and each set is one choice at a time.
    const toolbar = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">${
      this._uiBar('tl-ud-hist-search', m.userDetailHistSearch || '', [
        { id: 'tl-ud-hist-media', kind: 'source', value: media || '', neutral: '',
          items: [['', this._t('tlAllMedia')], ['movie', this._t('tlFilterMovies')], ['episode', this._t('tlFilterTvShows')], ['track', this._t('tlFilterMusic')], ['live', this._t('tlFilterLiveTV')]] },
        { id: 'tl-ud-hist-play', kind: 'protocol', value: playback || '', neutral: '',
          items: [['', this._t('tlAllPlayback')], ['direct play', this._t('tlFilterDirectPlay')], ['direct stream', this._t('tlFilterDirectStream')], ['transcode', this._t('tlFilterTranscode')]] },
      ], [{ html: colsBtn }])}</div>`;

    if (!data.length && !m.userDetailHistLoading) {
      return toolbar + `<div class="tl-ud-hist-results-wrap" style="display:contents"><div class="u-empty">${this._t('tlNoHistory')}</div></div>`;
    }

    // Watched ring
    const _wRing = '<circle cx="7" cy="7" r="5.5" fill="none" style="stroke:var(--is-text-muted)" stroke-width="1.5"/>';
    const _wSvg  = inner => `<svg width="14" height="14" viewBox="0 0 14 14">${inner}</svg>`;
    const _wArc  = d => `<path d="${d}" style="fill:var(--is-text-body)"/>`;
    const watchSvg = ws =>
      ws === 4 ? _wSvg('<circle cx="7" cy="7" r="5.5" style="fill:var(--is-text-body)"/>') :
      ws === 3 ? _wSvg(`${_wRing}${_wArc('M7,7 L7,1.5 A5.5,5.5 0,1,1 1.5,7 Z')}`) :
      ws === 2 ? _wSvg(`${_wRing}${_wArc('M7,7 L7,1.5 A5.5,5.5 0,0,1 7,12.5 Z')}`) :
      ws === 1 ? _wSvg(`${_wRing}${_wArc('M7,7 L7,1.5 A5.5,5.5 0,0,1 12.5,7 Z')}`) :
                 _wSvg(_wRing);

    const _streamBadge = (dec) => {
      if (!dec) return '';
      const lo = dec.toLowerCase();
      const tone = lo === 'direct play' ? 'green' : lo === 'direct stream' ? 'blue' : 'red';
      const lbl  = lo === 'direct play' ? this._t('tlFilterDirectPlay') : lo === 'direct stream' ? this._t('tlFilterDirectStream') : this._t('tlFilterTranscode');
      return this._uiBadge(lbl, tone);
    };

    const _expandedRow = (h, colCount) => {
      const esc    = s => this._escHtml(s || '');
      const decBdg = _streamBadge(h.transcode_decision);
      const vBdg   = h.video_decision ? _streamBadge(h.video_decision) : '';
      const aBdg   = h.audio_decision ? _streamBadge(h.audio_decision) : '';
      const vInfo  = [esc(h.video_full_resolution || ''), esc(h.video_codec || '')].filter(Boolean).join(' · ');
      const aInfo  = [esc(h.audio_codec || ''), esc(h.audio_channel_layout || '')].filter(Boolean).join(' · ');
      const qual   = esc(h.quality_profile || '');
      const ip     = esc(h.ip_address || '');
      const chunks = [
        decBdg ? `<span>${decBdg}</span>` : '',
        qual   ? `<span class="u-sm-label">${qual}</span>` : '',
        vInfo  ? `<span class="u-sm-label">${vInfo}</span>` : '',
        vBdg   ? `<span class="u-xs-muted">${this._t('traVideo')}: ${vBdg}</span>` : '',
        aInfo  ? `<span class="u-sm-label">${aInfo}</span>` : '',
        aBdg   ? `<span class="u-xs-muted">${this._t('pwAudio')}: ${aBdg}</span>` : '',
        ip     ? `<span style="font-family:monospace;font-size:10px;color:var(--is-text-muted)">${ip}</span>` : '',
      ].filter(Boolean);
      return `<tr class="tl-ud-hist-detail-row"><td colspan="${colCount}" style="padding:0 10px 10px">
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px;background:var(--is-row-hover);border-radius:6px">${chunks.join('')}</div>
      </td></tr>`;
    };

    // ── Mobile ────────────────────────────────────────────────────────────────
    if (isMob) {
      const cards = data.map(h => {
        const rid   = String(h.row_id || '');
        const icon  = this._tlMediaIcon(h.media_type || '', 15);
        const title = this._escHtml(h.full_title || h.title || '—');
        const ago   = h.date     ? this._tlFmtDate(h.date)           : '—';
        const dur   = h.duration ? this._tlFmtDuration(h.duration)   : '—';
        const pct   = h.percent_complete ?? 0;
        const ws    = pct >= 85 ? 4 : pct >= 63 ? 3 : pct >= 38 ? 2 : pct >= 10 ? 1 : 0;
        const isExp = expRow === rid;
        const mp = [];
        if (!mobHidden.has('platform') && h.platform)       mp.push(this._escHtml(h.platform));
        if (!mobHidden.has('player')   && h.player)         mp.push(this._escHtml(h.player));
        if (!mobHidden.has('started')  && h.started)        mp.push(this._tlFmtTime(h.started));
        if (!mobHidden.has('ip')       && h.ip_address)     mp.push(this._escHtml(h.ip_address));
        if (!mobHidden.has('paused')   && h.paused_counter) mp.push(this._t('tlColPaused') + ' ' + this._tlFmtDuration(h.paused_counter));
        const meta  = `<div class="tl-mob-meta"><span>${ago}</span>${mp.map(v => `<span style="color:var(--is-text-muted)"> &middot; </span><span>${v}</span>`).join('')}</div>`;
        const delEl = `<div style="margin-top:6px;display:flex;justify-content:flex-end">${
          this._mtRoundBtn(`data-tl-ud-hist-delete="${this._escHtml(rid)}"`, _TL_TRASH, this._t('tlDelete'), { size: 24, tone: 'red' })}</div>`;
        let expDetail = '';
        if (isExp) {
          const decBdg = _streamBadge(h.transcode_decision);
          const vInfo  = [this._escHtml(h.video_full_resolution || ''), this._escHtml(h.video_codec || '')].filter(Boolean).join(' · ');
          const aInfo  = [this._escHtml(h.audio_codec || ''), this._escHtml(h.audio_channel_layout || '')].filter(Boolean).join(' · ');
          const qual   = this._escHtml(h.quality_profile || '');
          const ip     = this._escHtml(h.ip_address || '');
          expDetail = `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--is-divider);display:flex;flex-wrap:wrap;gap:5px;align-items:center">
            ${decBdg}
            ${qual  ? `<span class="u-sm-label">${qual}</span>`  : ''}
            ${vInfo ? `<span class="u-sm-label">${vInfo}</span>` : ''}
            ${aInfo ? `<span class="u-sm-label">${aInfo}</span>` : ''}
            ${ip    ? `<span style="font-family:monospace;font-size:10px;color:var(--is-text-muted)">${ip}</span>` : ''}
          </div>`;
        }
        return `<div class="tl-mob-card tl-ud-hist-row" data-tl-ud-hist-row="${this._escHtml(rid)}" style="cursor:pointer${isExp ? ';background:var(--is-row-hover)' : ''}">
          <div class="u-row-10">
            <div style="flex:1;min-width:0">
              <div class="tl-mob-name u-row-4">${icon}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${title}</span></div>
              ${meta}
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:13px;font-weight:600;color:var(--is-text)">${dur}</div>
              <div style="margin-top:2px;display:flex;justify-content:flex-end">${watchSvg(ws)}</div>
            </div>
          </div>
          ${expDetail}${delEl}
        </div>`;
      }).join('');
      return toolbar + `<div class="tl-ud-hist-results-wrap" style="display:contents"><div>${cards}</div>${this._uiPager('tl-ud-hpage', page, totalPages, true)}</div>`;
    }

    // ── Desktop ───────────────────────────────────────────────────────────────
    const vis    = HIST_COLS.filter(c => !hidden.has(c.key));
    const thead  = vis.map(c => `<th style="${c.right ? 'text-align:right;' : ''}white-space:nowrap">${c.label}</th>`).join('') + '<th></th>';
    const delHdr = '<th style="width:1px"></th>';
    const rows   = data.map(h => {
      const icon  = this._tlMediaIcon(h.media_type || '', 15);
      const pct   = h.percent_complete ?? 0;
      const ws    = pct >= 85 ? 4 : pct >= 63 ? 3 : pct >= 38 ? 2 : pct >= 10 ? 1 : 0;
      const rid   = String(h.row_id || '');
      const isExp = expRow === rid;
      const esc   = s => this._escHtml(s || '');
      const cm = {
        date:     `<td style="white-space:nowrap;font-size:11px;color:var(--is-text-label)">${h.date ? this._tlFmtDate(h.date) : '—'}</td>`,
        ip:       `<td style="white-space:nowrap;font-size:11px;color:var(--is-text-label)">${esc(h.ip_address) || '—'}</td>`,
        platform: `<td style="white-space:nowrap;color:var(--is-text-label)">${esc(h.platform)}</td>`,
        product:  `<td style="white-space:nowrap;color:var(--is-text-label)">${esc(h.product)}</td>`,
        player:   `<td style="white-space:nowrap;color:var(--is-text-label)">${esc(h.player)}</td>`,
        title:    `<td style="max-width:240px"><div style="display:flex;align-items:center;gap:5px;min-width:0">${icon}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1" title="${esc(h.full_title||h.title)}">${esc(h.full_title||h.title)}</span></div></td>`,
        started:  `<td class="u-nowrap-sm">${h.started ? this._tlFmtTime(h.started) : '—'}</td>`,
        paused:   `<td style="text-align:right;white-space:nowrap;font-size:11px">${h.paused_counter ? this._tlFmtDuration(h.paused_counter) : '0m'}</td>`,
        stopped:  `<td class="u-nowrap-sm">${h.stopped ? this._tlFmtTime(h.stopped) : '—'}</td>`,
        duration: `<td style="text-align:right;white-space:nowrap;font-weight:600">${h.duration ? this._tlFmtDuration(h.duration) : '—'}</td>`,
      };
      const watchCell = `<td style="text-align:right;padding-right:8px">${watchSvg(ws)}</td>`;
      const delCell   = `<td style="padding:0 4px">${this._mtRoundBtn(`data-tl-ud-hist-delete="${this._escHtml(rid)}"`, _TL_TRASH, this._t('tlDelete'), { size: 24, tone: 'red' })}</td>`;
      const mainRow = `<tr class="tl-ud-hist-row" data-tl-ud-hist-row="${this._escHtml(rid)}" style="cursor:pointer${isExp ? ';background:var(--is-row-hover)' : ''}">${vis.map(c => cm[c.key] || '<td>—</td>').join('')}${watchCell}${delCell}</tr>`;
      return mainRow + (isExp ? _expandedRow(h, vis.length + 2) : '');
    }).join('');

    return toolbar + `<div class="tl-ud-hist-results-wrap" style="display:contents"><div style="overflow-x:auto;overflow-y:hidden"><table class="tl-users-table"><thead><tr>${thead}${delHdr}</tr></thead><tbody>${rows || `<tr><td colspan="${vis.length + 2}" class="u-empty">${this._t('tlNoHistory')}</td></tr>`}</tbody></table></div>${this._uiPager('tl-ud-hpage', page, totalPages, true)}</div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // User detail — IP Addresses tab
  // ──────────────────────────────────────────────────────────────────────────

  _tlBodyUdIps() {
    const m        = this._tautulliModal || {};
    const data     = m.userDetailIpsData    || [];
    const sortCol  = m.userDetailIpsSortCol  || 'last_seen';
    const sortDir  = m.userDetailIpsSortDir  || 'desc';
    const page     = m.userDetailIpsPage     || 0;
    const perPage  = this._tlCalcPerPage();
    const isMob    = this._isMob;

    if (!data.length) {
      return `<div class="u-empty">${this._t('tlNoIpData')}</div>`;
    }

    const sorted = [...data].sort((a, b) => {
      let av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
      if (typeof av === 'number' || typeof bv === 'number') { av = Number(av); bv = Number(bv); }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    const page2  = Math.min(page, totalPages - 1);
    const sliced = sorted.slice(page2 * perPage, (page2 + 1) * perPage);

    const IP_COLS = [
      { key:'ip_address',  label:this._t('tlColIPAddress'),                    sort:'ip_address',  right:false },
      { key:'last_seen',   label:this._t('tlColLastSeen'),                     sort:'last_seen',   right:false },
      { key:'first_seen',  label:this._t('tlColFirstSeen'),                    sort:'first_seen',  right:false },
      { key:'platform',    label:this._t('tlColPlatform'),        sort:'platform',    right:false },
      { key:'player',      label:this._t('tlColPlayer'),          sort:'player',      right:false },
      { key:'last_played', label:this._t('tlColLastPlayed'),      sort:'last_played', right:false },
      { key:'play_count',  label:this._t('tlColPlays'),           sort:'play_count',  right:true  },
    ];

    const thFn = c => {
      const arrow = c.sort === sortCol ? (sortDir === 'asc' ? '↑' : '↓') : '↕';
      const op    = c.sort === sortCol ? 1 : 0.3;
      return `<th data-tl-ud-ip-sort="${c.sort}" style="${c.right ? 'text-align:right;' : ''}cursor:pointer;user-select:none;white-space:nowrap"><span style="white-space:nowrap">${c.label} <span style="opacity:${op};font-size:9px">${arrow}</span></span></th>`;
    };

    if (isMob) {
      const cards = sliced.map(ip => {
        const addr   = this._escHtml(ip.ip_address || '—');
        const ls     = ip.last_seen  ? this._tlFmtDate(ip.last_seen)  : '—';
        const fs     = ip.first_seen ? this._tlFmtDate(ip.first_seen) : '—';
        const plat   = this._escHtml(ip.platform    || '');
        const player = this._escHtml(ip.player      || '');
        const lp     = this._escHtml(ip.last_played || '');
        const pc     = Number(ip.play_count) || 0;
        return `<div class="tl-mob-card">
          <div class="u-row-10">
            <div style="flex:1;min-width:0">
              <div class="tl-mob-name" style="font-family:monospace;font-size:12px">${addr}</div>
              <div class="tl-mob-meta">
                ${ls   ? `<span>${ls}</span>` : ''}
                ${plat ? `<span>${plat}</span>` : ''}
                ${player && player !== plat ? `<span>${player}</span>` : ''}
                ${lp   ? `<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lp}</span>` : ''}
              </div>
              ${fs ? `<div style="font-size:10px;color:var(--is-text-muted);margin-top:2px">${this._t('tlFirst')}: ${fs}</div>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:15px;font-weight:700;color:rgba(250,180,50,0.9)">${pc}</div>
              <div style="font-size:9px;color:var(--is-text-muted);text-transform:uppercase">plays</div>
            </div>
          </div>
        </div>`;
      }).join('') || `<div class="u-empty">${this._t('tlNoData')}</div>`;
      return `<div>${cards}</div>` + this._uiPager('tl-ud-ippage', page, totalPages);
    }

    const thead = IP_COLS.map(thFn).join('');
    const rows  = sliced.map(ip => {
      const esc    = s => this._escHtml(s || '');
      const addr   = esc(ip.ip_address  || '—');
      const ls     = ip.last_seen  ? this._tlFmtDate(ip.last_seen)  : '—';
      const fs     = ip.first_seen ? this._tlFmtDate(ip.first_seen) : '—';
      const plat   = esc(ip.platform    || '—');
      const player = esc(ip.player      || '—');
      const lp     = esc(ip.last_played || '—');
      const pc     = Number(ip.play_count) || 0;
      return `<tr>
        <td style="font-family:monospace;font-size:12px">${addr}</td>
        <td class="u-nowrap-sm">${ls}</td>
        <td class="u-nowrap-sm">${fs}</td>
        <td style="white-space:nowrap">${plat}</td>
        <td style="white-space:nowrap">${player}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lp}</td>
        <td style="text-align:right;font-weight:700;color:rgba(250,180,50,0.9)">${pc}</td>
      </tr>`;
    }).join('');

    return `<div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>${thead}</tr></thead><tbody>${rows || `<tr><td colspan="7" class="u-empty">${this._t('tlNoData')}</td></tr>`}</tbody></table></div>` + this._uiPager('tl-ud-ippage', page, totalPages);
  }

}

export const tautulliUserRenderMixin = _TautulliUserRenderMethods.prototype;
