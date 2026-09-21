import { _TL_TRASH } from './tautulli-table.js';
import { fmtBytes } from '../shared/format.js';

// Tautulli, one library or title in detail: profile, history, media. Split out of render/tautulli-table.js.

class _TautulliLibraryRenderMethods {

  // ══════════════════════════════════════════════════════════════════════════
  // Library detail
  // ══════════════════════════════════════════════════════════════════════════

  _tlBodyLibDetail() {
    const m      = this._tautulliModal || {};
    const name   = m.libDetailName || '—';
    const tab    = m.libDetailTab  || 'profile';
    const isMob  = this._isMob;
    const backBtn = `<button data-tl-ld-back style="display:none"></button>`;
    const tabs   = [['profile',this._t('actColProfile')],['history',this._t('tlHistory')],['media',this._t('tlMediaInfo')]];
    const tabBtns = `<span class="mt-nav mt-nav--inline"><span class="mt-nav-ind"></span>${
      tabs.map(([k,l]) => `<button class="mt-nav-btn${tab===k?' is-on':''}" data-tl-ld-tab="${k}">${l}</button>`).join('')
    }</span>`;
    const hdr = isMob
      ? `<div style="margin-bottom:12px">
           ${backBtn}
           <div style="font-size:15px;font-weight:700;color:var(--is-text);margin-bottom:10px">${this._escHtml(name)}</div>
           ${tabBtns}
         </div>`
      : `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
           ${backBtn}
           <div style="font-size:15px;font-weight:700;color:var(--is-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0">${this._escHtml(name)}</div>
           ${tabBtns}
         </div>`;
    let content = '';
    if (tab === 'profile')      content = this._tlBodyLdProfile();
    else if (tab === 'history') content = this._tlBodyLdHistory();
    else                        content = this._tlBodyLdMedia();
    return hdr + content;
  }

  _tlBodyLdProfile() {
    const m      = this._tautulliModal || {};
    const prof   = m.libDetailProfile;
    const isMob  = this._isMob;
    if (!prof) return `<div class="is-loading"><span>${this._t('loading')}</span></div>`;

    const wts = prof.watchTimeStats || [];
    const us  = prof.userStats      || [];
    const rh  = prof.recentHistory  || [];

    const periodLabel = d => d===1?this._t('tlLast24h'):d===7?this._t('tlLast7d'):d===30?this._t('tlLast30d'):this._t('tlAllTime');
    const statMap = {};
    wts.forEach(s => { statMap[Number(s.query_days)] = s; });
    const statCards = [1,7,30,0].map(d => {
      const s = statMap[d] || {};
      const plays = Number(s.total_plays) || 0;
      const dur   = s.total_time ? this._tlFmtDuration(s.total_time) : '0m';
      return `<div style="background:var(--is-row-hover);border-radius:8px;padding:${isMob?'6px':'8px 6px'};text-align:center;display:flex;flex-direction:column;gap:2px">
        <div style="font-size:${isMob?'9px':'10px'};font-weight:700;color:var(--is-text);text-transform:uppercase;letter-spacing:0.3px">${periodLabel(d)}</div>
        <div style="font-size:${isMob?'16px':'20px'};font-weight:800;color:rgba(250,180,50,0.95);line-height:1">${plays} <span style="font-size:8px;font-weight:600;color:var(--is-text-muted);text-transform:uppercase">plays</span></div>
        <div style="font-size:${isMob?'10px':'11px'};font-weight:600;color:var(--is-text)">${dur}</div>
      </div>`;
    }).join('');

    // User stats
    const userChips = us.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:${isMob?'8px':'10px'}">` +
        us.map(u => {
          const uname  = this._escHtml(u.friendly_name || u.user || '—');
          const plays  = Number(u.total_plays) || 0;
          const dur    = u.total_time ? this._tlFmtDuration(u.total_time) : '0m';
          const thumb  = this._imgSrc(u.user_thumb);
          const av     = thumb
            ? `<img src="${thumb}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'">`
            : `<div style="width:28px;height:28px;border-radius:50%;background:var(--is-row-hover);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--is-text)">${(uname[0]||'?').toUpperCase()}</div>`;
          return `<div style="display:flex;align-items:center;gap:8px;background:var(--is-row-hover);border-radius:10px;padding:6px 10px">
            ${av}
            <div>
              <div style="font-size:11px;font-weight:600;color:var(--is-text)">${uname}</div>
              <div class="u-xs-muted">${this._t('traNPlays').replace('{n}', plays)} · ${dur}</div>
            </div>
          </div>`;
        }).join('') + '</div>'
      : `<div style="color:var(--is-text-muted);font-size:12px;padding:4px 0">${this._t('tlNoUserDataDot')}</div>`;

    // Recently played strip (same as user detail)
    let recentSection = '';
    if (rh.length) {
      const W       = isMob ? 100 : 130;
      const H       = Math.round(W * 1.5);
      const perPage = isMob ? 4 : 7;
      const pages   = [];
      for (let i = 0; i < rh.length; i += perPage) pages.push(rh.slice(i, i + perPage));
      const multi   = pages.length > 1;
      const posterCard = (h) => {
        const title     = this._escHtml(h.full_title || h.title || '—');
        const ago       = h.date ? this._tlFmtDate(h.date) : '';
        const mt        = (h.media_type || '').toLowerCase();
        const isLive    = (mt==='live'||mt==='livetv'||h.live===1);
        const thumbPath = (mt==='episode'&&h.grandparent_thumb)?h.grandparent_thumb:(h.thumb||'');
        const icon      = this._tlMediaIcon(mt, 16);
        const typeLabel = isLive?this._t('tlFilterLiveTV'):mt==='movie'?this._t('typeMovie'):mt==='episode'?this._t('typeTv'):mt==='track'?this._t('tabMusic'):null;
        const typeTag   = typeLabel ? `<span class="media-type-tag">${typeLabel}</span>` : '';
        const rk        = this._escHtml(h.rating_key || '');
        const mdAttr    = rk ? ` data-tl-md-open="${rk}" data-tl-md-title="${title}" data-tl-md-thumb="${this._escHtml(thumbPath)}" data-tl-md-prev="lib" style="cursor:pointer"` : '';
        const imgTag    = thumbPath
          ? `<img data-tl-plex-path="${this._escHtml(thumbPath)}" alt="" style="width:${W}px;height:${H}px;object-fit:cover;border-radius:6px;display:block" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            + `<div style="display:none;width:${W}px;height:${H}px;background:var(--is-row-hover);border-radius:6px;align-items:center;justify-content:center">${icon}</div>`
          : `<div style="width:${W}px;height:${H}px;background:var(--is-row-hover);border-radius:6px;display:flex;align-items:center;justify-content:center">${icon}</div>`;
        const grad = `<div class="mc-grad" style="border-radius:0 0 6px 6px">
          <div class="mc-title" style="font-size:10px" title="${title}">${title}</div>
          ${ago?`<div class="mc-sub" style="font-size:9px">${ago}</div>`:''}
        </div>`;
        return `<div${mdAttr} style="flex-shrink:0;width:${W}px">
          <div style="position:relative;line-height:0;border-radius:6px;overflow:hidden">${imgTag}${typeTag}${grad}</div>
        </div>`;
      };
      const pagesHtml = pages.map(pg => `<div style="display:flex;gap:8px;flex-shrink:0;min-width:100%;scroll-snap-align:start;padding:2px 0">${pg.map(posterCard).join('')}</div>`).join('');
      const chevSt = `background:none;border:none;color:var(--is-text);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;opacity:0.85`;
      const chevL  = `<button class="tl-ld-rec-prev" disabled style="${chevSt}"><ha-icon icon="mdi:chevron-left"  style="--mdc-icon-size:28px"></ha-icon></button>`;
      const chevR  = `<button class="tl-ld-rec-next" style="${chevSt}"><ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:28px"></ha-icon></button>`;
      recentSection = `<div style="margin-top:14px">
        <div class="u-section-hdr">${this._t('tlRecentlyPlayed')}</div>
        <div class="sv-nav-wrap">
          ${multi?chevL:''}
          <div class="sv-scroll" id="tl-ld-rec-scroll" style="scroll-snap-type:x mandatory">${pagesHtml}</div>
          ${multi?chevR:''}
        </div>
      </div>`;
    }

    return `<div style="margin-bottom:${isMob?'10px':'14px'}">
      <div class="u-section-hdr">${this._t('tlGlobalStats')}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:${isMob?'6px':'10px'}">${statCards}</div>
    </div>
    <div style="margin-bottom:${isMob?'10px':'14px'}">
      <div class="u-section-hdr">${this._t('tlUserStats')}</div>
      ${userChips}
    </div>
    ${recentSection}`;
  }

  _tlBodyLdHistory() {
    const m       = this._tautulliModal || {};
    const isMob   = this._isMob;
    const data    = m.libDetailHistData  || [];
    const tot     = m.libDetailHistTotal || 0;
    const page    = m.libDetailHistPage  || 0;
    const media   = m.libDetailHistMedia;
    const playback= m.libDetailHistPlayback;
    const search  = m.libDetailHistSearch || '';
    const hidden    = this._tlHidden('libDetailHistHiddenCols',    ['ip','paused','stopped']);
    const mobHidden = this._tlHidden('libDetailHistMobHiddenCols', ['ip','platform','product','player','paused','stopped']);
    const perPage   = this._tlCalcPerPage({ hasFilter: true });
    const totalPages = Math.max(1, Math.ceil(tot / perPage));
    if (m.libDetailHistLoading) return `<div class="is-loading"><span>${this._t('loading')}</span></div>`;

    const HIST_COLS = [
      { key:'date',     label:this._t('tlColDate'),      sort:'date',     right:false },
      { key:'user',     label:this._t('tlColUser'),      sort:'user',     right:false },
      { key:'ip',       label:'IP',        sort:'ip_address', right:false },
      { key:'platform', label:this._t('tlColPlatform'),  sort:'platform', right:false },
      { key:'product',  label:this._t('tlColProduct'),   sort:'product',  right:false },
      { key:'player',   label:this._t('tlColPlayer'),    sort:'player',   right:false },
      { key:'title',    label:this._t('tlColTitle'),     sort:'title',    right:false },
      { key:'duration', label:this._t('tlColDuration'),  sort:'duration', right:true  },
      { key:'paused',   label:this._t('paused'),    sort:'paused_counter', right:true },
      { key:'stopped',  label:this._t('tlColStopped'),   sort:'stopped',  right:true  },
    ];
    const MOB_PICKER = [
      { key:'ip', label:'IP' }, { key:'platform', label:this._t('tlColPlatform') },
      { key:'product', label:this._t('tlColProduct') }, { key:'player', label:this._t('tlColPlayer') },
      { key:'paused', label:this._t('paused') }, { key:'stopped', label:this._t('tlColStopped') },
    ];
    const vis = HIST_COLS.filter(c => !hidden.has(c.key));
    const colsMenu    = isMob
      ? this._tlColsMenu('tl-ld-hist-mob-cols-btn','tl-ld-hist-mob-cols-menu',this._tlColItems(MOB_PICKER,mobHidden,'data-tl-ld-hist-mob-col'),m.libDetailHistMobColsOpen)
      : this._tlColsMenu('tl-ld-hist-cols-btn',    'tl-ld-hist-cols-menu',    this._tlColItems(HIST_COLS.filter(c=>c.key!=='title'),hidden,'data-tl-ld-hist-col'),m.libDetailHistColsOpen);
    // Same single bar as the other history views.
    const toolbar = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">${
      this._uiBar('tl-ld-hist-search', search || '', [
        { id: 'tl-ld-hist-media', kind: 'source', value: media || '', neutral: '',
          items: [['', this._t('tlAllMedia')], ['movie', this._t('tlFilterMovies')], ['episode', this._t('tlFilterTvShows')], ['track', this._t('tlFilterMusic')], ['live', this._t('tlFilterLiveTV')]] },
        { id: 'tl-ld-hist-play', kind: 'protocol', value: playback || '', neutral: '',
          items: [['', this._t('tlAllPlayback')], ['direct play', this._t('tlFilterDirectPlay')], ['copy', this._t('tlFilterDirectStream')], ['transcode', this._t('tlFilterTranscode')]] },
      ], [{ html: colsMenu }])}</div>`;

    // share render logic with user detail history (reuse _expandedRow concept inline)
    const _expandedRow = (h, colCount) => {
      const esc = s => this._escHtml(String(s??''));
      const td  = s => this._tlFmtDuration(s);
      const ws  = h.watched_status ?? -1;
      return `<tr class="tl-ld-hist-detail-row"><td colspan="${colCount}" style="padding:0 10px 10px">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;font-size:11px;color:var(--is-text-muted);padding:10px;background:var(--is-row-hover);border-radius:6px">
          ${h.transcode_decision?`<div><span style="color:var(--is-text)">Transcode:</span> ${esc(h.transcode_decision)}</div>`:''}
          ${h.quality_profile?`<div><span style="color:var(--is-text)">Quality:</span> ${esc(h.quality_profile)}</div>`:''}
          ${h.video_full_resolution?`<div><span style="color:var(--is-text)">Resolution:</span> ${esc(h.video_full_resolution)}</div>`:''}
          ${h.video_codec?`<div><span style="color:var(--is-text)">Video:</span> ${esc(h.video_codec)}</div>`:''}
          ${h.audio_codec?`<div><span style="color:var(--is-text)">Audio:</span> ${esc(h.audio_codec)}</div>`:''}
          ${h.ip_address?`<div><span style="color:var(--is-text)">IP:</span> ${esc(h.ip_address)}</div>`:''}
        </div>
      </td></tr>`;
    };

    const esc = s => this._escHtml(String(s??''));
    if (isMob) {
      const cards = data.map(h => {
        const rid   = this._escHtml(h.reference_id || h.session_key || Math.random());
        const isExp = m.libDetailHistExpandedRow === rid;
        const icon  = this._tlMediaIcon(h.media_type||'',15);
        const title = esc(h.full_title||h.title||'—');
        const dur   = this._tlFmtDuration(h.duration||0);
        const ws    = h.watched_status??-1;
        const watchSvg = (s) => s===1?`<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="rgba(48,209,88,0.9)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`:s===0?`<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="rgba(250,180,50,0.9)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`:'';
        const meta  = [];
        if (!mobHidden.has('platform') && h.platform) meta.push(`<span>${esc(h.platform)}</span>`);
        if (!mobHidden.has('player')   && h.player)   meta.push(`<span>${esc(h.player)}</span>`);
        if (!mobHidden.has('ip')       && h.ip_address) meta.push(`<span style="font-family:monospace;font-size:10px">${esc(h.ip_address)}</span>`);
        const delEl = `<div style="margin-top:6px;display:flex;justify-content:flex-end">${
          this._mtRoundBtn(`data-tl-ld-hist-delete="${rid}"`, _TL_TRASH, this._t('tlDelete'), { size: 24, tone: 'red' })}</div>`;
        const detail = isExp ? `<div style="margin-top:8px;font-size:11px;color:var(--is-text-muted);display:grid;grid-template-columns:1fr 1fr;gap:4px">
          ${h.transcode_decision?`<div><span style="color:var(--is-text)">Transcode:</span> ${esc(h.transcode_decision)}</div>`:''}
          ${h.quality_profile?`<div><span style="color:var(--is-text)">Quality:</span> ${esc(h.quality_profile)}</div>`:''}
          ${h.ip_address?`<div><span style="color:var(--is-text)">IP:</span> ${esc(h.ip_address)}</div>`:''}
        </div>` : '';
        return `<div class="tl-mob-card tl-ld-hist-row" data-tl-ld-hist-row="${rid}" style="cursor:pointer${isExp?';background:var(--is-row-hover)':''}">
          <div class="u-row-10">
            <div style="flex:1;min-width:0">
              <div class="tl-mob-name u-row-4">${icon}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${title}</span></div>
              ${meta.length?`<div class="tl-mob-meta">${meta.join('')}</div>`:''}
            </div>
            <div style="text-align:right;flex-shrink:0"><div style="font-size:13px;font-weight:600;color:var(--is-text)">${dur}</div><div style="margin-top:2px;display:flex;justify-content:flex-end">${watchSvg(ws)}</div></div>
          </div>${detail}${delEl}</div>`;
      }).join('') || `<div class="u-empty">${this._t('tlNoHistory')}</div>`;
      return toolbar + `<div class="tl-ld-hist-results-wrap" style="display:contents"><div>${cards}</div>${this._uiPager('tl-ld-hpage', page, totalPages, true)}</div>`;
    }

    const watchCell = `<td style="padding:0 6px;text-align:center"></td>`;
    const delHdr    = `<th style="width:32px"></th>`;
    const thead     = vis.map(c => `<th style="text-align:${c.right?'right':'left'}">${c.label}</th>`).join('') + watchCell;
    const colCount  = vis.length + 2;
    const rows = data.map(h => {
      const rid    = this._escHtml(h.reference_id || h.session_key || Math.random());
      const isExp  = m.libDetailHistExpandedRow === rid;
      const icon   = this._tlMediaIcon(h.media_type||'',15);
      const esc2   = s => this._escHtml(String(s??''));
      const ws     = h.watched_status??-1;
      const watchSvg = (s) => s===1?`<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="rgba(48,209,88,0.9)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`:s===0?`<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="rgba(250,180,50,0.9)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`:'';
      const cm = {
        date:     `<td class="u-nowrap-sm">${esc2(h.date||'—')}</td>`,
        user:     `<td style="white-space:nowrap">${esc2(h.friendly_name||h.user||'—')}</td>`,
        ip:       `<td style="font-family:monospace;font-size:11px">${esc2(h.ip_address||'—')}</td>`,
        platform: `<td style="white-space:nowrap">${esc2(h.platform||'—')}</td>`,
        product:  `<td class="u-nowrap-sm">${esc2(h.product||'—')}</td>`,
        player:   `<td class="u-nowrap-sm">${esc2(h.player||'—')}</td>`,
        title:    `<td style="max-width:240px"><div style="display:flex;align-items:center;gap:5px;min-width:0">${icon}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1" title="${esc2(h.full_title||h.title)}">${esc2(h.full_title||h.title)}</span></div></td>`,
        duration: `<td style="text-align:right;white-space:nowrap">${this._tlFmtDuration(h.duration||0)}</td>`,
        paused:   `<td style="text-align:right">${this._tlFmtDuration(h.paused_counter||0)}</td>`,
        stopped:  `<td style="text-align:right;white-space:nowrap">${esc2(h.stopped||'—')}</td>`,
      };
      const watchTd  = `<td style="padding:0 6px;text-align:center">${watchSvg(ws)}</td>`;
      const delCell  = `<td style="padding:0 4px">${this._mtRoundBtn(`data-tl-ld-hist-delete="${rid}"`, _TL_TRASH, this._t('tlDelete'), { size: 24, tone: 'red' })}</td>`;
      const mainRow  = `<tr class="tl-ld-hist-row" data-tl-ld-hist-row="${rid}" style="cursor:pointer${isExp?';background:var(--is-row-hover)':''}">${vis.map(c=>cm[c.key]||'<td>—</td>').join('')}${watchTd}${delCell}</tr>`;
      return mainRow + (isExp ? _expandedRow(h, colCount) : '');
    }).join('');
    return toolbar + `<div class="tl-ld-hist-results-wrap" style="display:contents"><div style="overflow-x:auto;overflow-y:hidden"><table class="tl-users-table"><thead><tr>${thead}${delHdr}</tr></thead><tbody>${rows||`<tr><td colspan="${colCount}" class="u-empty">${this._t('tlNoHistory')}</td></tr>`}</tbody></table></div>${this._uiPager('tl-ld-hpage', page, totalPages, true)}</div>`;
  }

  _tlBodyLdMedia() {
    const m      = this._tautulliModal || {};
    const isMob  = this._isMob;
    const data   = m.libDetailMediaData  || [];
    const tot    = m.libDetailMediaTotal || 0;
    const page   = m.libDetailMediaPage  || 0;
    const search = m.libDetailMediaSearch || '';
    const sort   = m.libDetailMediaSort  || 'added_at';
    const dir    = m.libDetailMediaDir   || 'desc';
    const perPage = 25;
    const totalPages = Math.max(1, Math.ceil(tot / perPage));

    const _sortTh = (key, label, right=false) => {
      const active = sort===key;
      const nextDir = active&&dir==='asc'?'desc':'asc';
      const arrow = active?(dir==='asc'?'↑':'↓'):'';
      return `<th data-tl-ld-media-sort="${key}" data-tl-ld-media-dir="${nextDir}" style="text-align:${right?'right':'left'};cursor:pointer;white-space:nowrap;user-select:none">${label}${arrow?` <span style="color:rgba(250,180,50,0.9)">${arrow}</span>`:''}</th>`;
    };

    const searchEl = this._tlSearchInput('tl-ld-media-search', search);
    const toolbar  = `<div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap">${searchEl}</div>`;

    if (isMob) {
      const cards = data.map(item => {
        const rk    = this._escHtml(item.rating_key || '');
        const title = this._escHtml(item.title || '—');
        const year  = item.year ? `<span style="color:var(--is-text-muted)">${this._escHtml(item.year)}</span>` : '';
        const meta  = [item.video_resolution,item.video_codec,item.audio_codec].filter(Boolean).map(v=>this._escHtml(v)).join(' · ');
        const mdAttr = rk ? ` data-tl-md-open="${rk}" data-tl-md-title="${title}" data-tl-md-prev="lib" style="cursor:pointer"` : '';
        return `<div class="tl-mob-card"${mdAttr}>
          <div class="tl-mob-name">${title} ${year}</div>
          ${meta?`<div class="tl-mob-meta"><span>${meta}</span></div>`:''}
        </div>`;
      }).join('') || `<div class="u-empty">${this._t('tlNoMediaData')}</div>`;
      return toolbar + `<div class="tl-ld-media-results-wrap" style="display:contents"><div>${cards}</div>${this._uiPager('tl-ld-mpage', page, totalPages, true)}</div>`;
    }

    const thead = [
      _sortTh('added_at',this._t('badgeAdded')),_sortTh('title',this._t('tlColTitle')),_sortTh('container',this._t('traFormat')),
      _sortTh('bitrate',this._t('traBitrate'),true),_sortTh('video_codec',this._t('traVideo')),_sortTh('video_resolution',this._t('tlRes')),
      _sortTh('video_framerate','FPS'),_sortTh('audio_codec',this._t('pwAudio')),_sortTh('audio_channels',this._t('tlCh'),true),
      _sortTh('file_size',this._t('actColSize'),true),_sortTh('last_played',this._t('tlColLastPlayed')),_sortTh('play_count',this._t('qaStatsPlays'),true),
    ].join('');
    const rows = data.map(item => {
      const esc   = s => this._escHtml(String(s??''));
      const rk    = esc(item.rating_key || '');
      const mdAttr = rk ? ` data-tl-md-open="${rk}" data-tl-md-title="${esc(item.title||'')}" data-tl-md-prev="lib" style="cursor:pointer"` : '';
      return `<tr${mdAttr}>
        <td class="u-nowrap-sm">${esc(item.added_at||'—')}</td>
        <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(item.title||'—')}${item.year?` <span style="color:var(--is-text-muted);font-size:10px">${esc(item.year)}</span>`:''}</td>
        <td>${esc(item.container||'—')}</td>
        <td style="text-align:right;white-space:nowrap">${item.bitrate?esc(item.bitrate)+' kbps':'—'}</td>
        <td>${esc(item.video_codec||'—')}</td>
        <td>${esc(item.video_resolution||'—')}</td>
        <td>${esc(item.video_framerate||'—')}</td>
        <td>${esc(item.audio_codec||'—')}</td>
        <td style="text-align:right">${item.audio_channels?esc(item.audio_channels)+' ch':'—'}</td>
        <td style="text-align:right;white-space:nowrap">${fmtBytes(item.file_size)}</td>
        <td class="u-nowrap-sm">${esc(item.last_played||'—')}</td>
        <td style="text-align:right;font-weight:700;color:rgba(250,180,50,0.9)">${Number(item.play_count) || 0}</td>
      </tr>`;
    }).join('');
    return toolbar + `<div class="tl-ld-media-results-wrap" style="display:contents"><div style="overflow-x:auto;overflow-y:hidden"><table class="tl-users-table"><thead><tr>${thead}</tr></thead><tbody>${rows||`<tr><td colspan="12" class="u-empty">${this._t('tlNoMediaData')}</td></tr>`}</tbody></table></div>${this._uiPager('tl-ld-mpage', page, totalPages, true)}</div>`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Media item detail
  // ══════════════════════════════════════════════════════════════════════════

  _tlBodyMediaDetail() {
    const m     = this._tautulliModal || {};
    const tab   = m.mediaDetailTab   || 'info';
    const isMob = this._isMob;
    const backAttr = m.mediaDetailPrev === 'lib' ? 'data-tl-md-back-lib' : 'data-tl-md-back-user';
    const backBtn  = `<button ${backAttr} style="display:none"></button>`;
    const tabs    = [['info',this._t('mtInfo')],['history',this._t('tlHistory')]];
    const tabBtns = `<span class="mt-nav mt-nav--inline"><span class="mt-nav-ind"></span>${
      tabs.map(([k,l]) => `<button class="mt-nav-btn${tab===k?' is-on':''}" data-tl-md-tab="${k}">${l}</button>`).join('')
    }</span>`;
    const title   = this._escHtml(m.mediaDetailTitle || '—');
    const hdr = isMob
      ? `<div style="margin-bottom:12px">
           ${backBtn}
           <div style="font-size:15px;font-weight:700;color:var(--is-text);margin-bottom:10px">${title}</div>
           ${tabBtns}
         </div>`
      : `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
           ${backBtn}
           <div style="font-size:15px;font-weight:700;color:var(--is-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0">${title}</div>
           ${tabBtns}
         </div>`;
    let content = '';
    if (tab === 'info')         content = this._tlBodyMdInfo();
    else                        content = this._tlBodyMdHistory();
    return hdr + content;
  }

  _tlBodyMdInfo() {
    const m     = this._tautulliModal || {};
    const data  = m.mediaDetailData;
    const isMob = this._isMob;
    if (!data) return `<div class="is-loading"><span>${this._t('loading')}</span></div>`;

    const meta = data.metadata || {};
    const wts  = data.watchTimeStats || [];
    const us   = data.userStats || [];
    const esc  = s => this._escHtml(String(s??''));

    // Poster + metadata header
    const thumbPath = meta.thumb || meta.grandparent_thumb || '';
    const W = isMob ? 80 : 110;
    const H = Math.round(W * 1.5);
    const posterEl = thumbPath
      ? `<img data-tl-plex-path="${esc(thumbPath)}" alt="" style="width:${W}px;height:${H}px;object-fit:cover;border-radius:8px;flex-shrink:0;display:block" onerror="this.style.display='none'">`
      : `<div style="width:${W}px;height:${H}px;background:var(--is-row-hover);border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center">${this._tlMediaIcon(meta.media_type||'',24)}</div>`;

    const metaRows = [];
    if (meta.studio)           metaRows.push(`<span style="color:var(--is-text-muted)">Studio:</span> ${esc(meta.studio)}`);
    if (meta.year)             metaRows.push(`<span style="color:var(--is-text-muted)">Year:</span> ${esc(meta.year)}`);
    if (meta.rating)           metaRows.push(`<span style="color:var(--is-text-muted)">Rating:</span> ${esc(meta.rating)}`);
    if (meta.content_rating)   metaRows.push(`<span style="color:var(--is-text-muted)">Rated:</span> ${esc(meta.content_rating)}`);
    if (meta.duration)         metaRows.push(`<span style="color:var(--is-text-muted)">Runtime:</span> ${this._tlFmtDuration(meta.duration)}`);
    if (meta.originally_available_at) metaRows.push(`<span style="color:var(--is-text-muted)">Aired:</span> ${esc(meta.originally_available_at)}`);
    if (meta.directors?.length) metaRows.push(`<span style="color:var(--is-text-muted)">Director:</span> ${meta.directors.map(d=>esc(d.tag||d)).join(', ')}`);
    if (meta.genres?.length)   metaRows.push(`<span style="color:var(--is-text-muted)">Genres:</span> ${meta.genres.map(g=>esc(g.tag||g)).join(', ')}`);

    const fullTitle = esc(meta.full_title || meta.title || m.mediaDetailTitle || '—');
    const subtitle  = meta.parent_title ? `${esc(meta.parent_title)}${meta.media_index?' · E'+esc(meta.media_index):''}` : '';
    const summary   = meta.summary ? `<div style="font-size:11px;color:var(--is-text-muted);margin-top:8px;line-height:1.5;max-height:60px;overflow:hidden">${esc(meta.summary)}</div>` : '';

    const metaHdr = `<div style="display:flex;gap:12px;margin-bottom:${isMob?'12px':'16px'}">
      ${posterEl}
      <div style="flex:1;min-width:0">
        <div style="font-size:${isMob?'13px':'15px'};font-weight:700;color:var(--is-text)">${fullTitle}</div>
        ${subtitle?`<div style="font-size:11px;color:var(--is-text-muted);margin-top:2px">${subtitle}</div>`:''}
        ${summary}
        <div style="font-size:11px;color:var(--is-text);margin-top:8px;display:flex;flex-direction:column;gap:3px">${metaRows.map(r=>`<div>${r}</div>`).join('')}</div>
      </div>
    </div>`;

    // Global watch stats
    const periodLabel = d => d===1?this._t('tlLast24h'):d===7?this._t('tlLast7d'):d===30?this._t('tlLast30d'):this._t('tlAllTime');
    const statMap = {};
    wts.forEach(s => { statMap[Number(s.query_days)] = s; });
    const statCards = [1,7,30,0].map(d => {
      const s = statMap[d] || {};
      const plays = Number(s.total_plays) || 0;
      const dur   = s.total_time ? this._tlFmtDuration(s.total_time) : '0m';
      return `<div style="background:var(--is-row-hover);border-radius:8px;padding:${isMob?'6px':'8px 6px'};text-align:center;display:flex;flex-direction:column;gap:2px">
        <div style="font-size:${isMob?'9px':'10px'};font-weight:700;color:var(--is-text);text-transform:uppercase;letter-spacing:0.3px">${periodLabel(d)}</div>
        <div style="font-size:${isMob?'16px':'20px'};font-weight:800;color:rgba(250,180,50,0.95);line-height:1">${plays} <span style="font-size:8px;font-weight:600;color:var(--is-text-muted);text-transform:uppercase">plays</span></div>
        <div style="font-size:${isMob?'10px':'11px'};font-weight:600;color:var(--is-text)">${dur}</div>
      </div>`;
    }).join('');

    // User stats
    const userChips = us.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:${isMob?'8px':'10px'}">` +
        us.map(u => {
          const uname = esc(u.friendly_name||u.user||'—');
          const plays = Number(u.total_plays) || 0;
          const dur   = u.total_time ? this._tlFmtDuration(u.total_time) : '0m';
          const avSrc = this._imgSrc(u.user_thumb);
          const av    = avSrc
            ? `<img src="${avSrc}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'">`
            : `<div style="width:28px;height:28px;border-radius:50%;background:var(--is-row-hover);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--is-text)">${(uname[0]||'?').toUpperCase()}</div>`;
          return `<div style="display:flex;align-items:center;gap:8px;background:var(--is-row-hover);border-radius:10px;padding:6px 10px">
            ${av}
            <div>
              <div style="font-size:11px;font-weight:600;color:var(--is-text)">${uname}</div>
              <div class="u-xs-muted">${this._t('traNPlays').replace('{n}', plays)} · ${dur}</div>
            </div>
          </div>`;
        }).join('') + '</div>'
      : `<div style="color:var(--is-text-muted);font-size:12px;padding:4px 0">${this._t('tlNoUserDataDot')}</div>`;

    return metaHdr
      + `<div style="margin-bottom:${isMob?'10px':'14px'}">
           <div class="u-section-hdr">${this._t('tlGlobalStats')}</div>
           <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:${isMob?'6px':'10px'}">${statCards}</div>
         </div>
         <div>
           <div class="u-section-hdr">${this._t('tlUserStats')}</div>
           ${userChips}
         </div>`;
  }

  _tlBodyMdHistory() {
    const m     = this._tautulliModal || {};
    const isMob = this._isMob;
    const data  = m.mediaDetailHistData  || [];
    const tot   = m.mediaDetailHistTotal || 0;
    const page  = m.mediaDetailHistPage  || 0;
    const perPage = this._tlCalcPerPage({ hasFilter: false });
    const totalPages = Math.max(1, Math.ceil(tot / perPage));

    const esc = s => this._escHtml(String(s??''));
    if (isMob) {
      const cards = data.map(h => {
        const title = esc(h.full_title||h.title||'—');
        const user  = esc(h.friendly_name||h.user||'—');
        const dur   = this._tlFmtDuration(h.duration||0);
        return `<div class="tl-mob-card">
          <div class="u-row-10">
            <div style="flex:1;min-width:0">
              <div class="tl-mob-name">${user}</div>
              <div class="tl-mob-meta"><span>${esc(h.date||'')}</span>${h.platform?`<span>${esc(h.platform)}</span>`:''}</div>
            </div>
            <div style="font-size:13px;font-weight:600;color:var(--is-text)">${dur}</div>
          </div>
        </div>`;
      }).join('') || `<div class="u-empty">${this._t('tlNoHistory')}</div>`;
      return `<div>${cards}</div>` + this._uiPager('tl-md-hpage', page, totalPages, true);
    }

    const thead = `<th>${this._t('tlColDate')}</th><th>${this._t('tlColUser')}</th><th>${this._t('tlColPlatform')}</th><th>${this._t('tlColPlayer')}</th><th style="text-align:right">${this._t('tlColDuration')}</th><th style="text-align:right">${this._t('paused')}</th>`;
    const rows  = data.map(h => `<tr>
      <td class="u-nowrap-sm">${esc(h.date||'—')}</td>
      <td>${esc(h.friendly_name||h.user||'—')}</td>
      <td style="white-space:nowrap">${esc(h.platform||'—')}</td>
      <td class="u-nowrap-sm">${esc(h.player||'—')}</td>
      <td style="text-align:right;white-space:nowrap">${this._tlFmtDuration(h.duration||0)}</td>
      <td style="text-align:right">${this._tlFmtDuration(h.paused_counter||0)}</td>
    </tr>`).join('');
    return `<div style="overflow-x:auto;overflow-y:hidden"><table class="tl-users-table"><thead><tr>${thead}</tr></thead><tbody>${rows||`<tr><td colspan="6" class="u-empty">${this._t('tlNoHistory')}</td></tr>`}</tbody></table></div>` + this._uiPager('tl-md-hpage', page, totalPages, true);
  }

}

export const tautulliLibraryRenderMixin = _TautulliLibraryRenderMethods.prototype;
