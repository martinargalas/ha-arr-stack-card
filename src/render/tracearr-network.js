import { _traSegHtml } from './tracearr-table.js';

// Tracearr, the Devices and Bandwidth tabs. Split out of render/tracearr-table.js.

class _TracearrNetworkMethods {
  // ──────────────────────────────────────────────────────────────────────────
  // Device Compatibility tab
  // ──────────────────────────────────────────────────────────────────────────

  _traBodyDevices() {
    const m    = this._tracearrModal;
    if (!m) return '';
    const isMob = this._isMob;
    const sum  = m.devicesData?.summary || {};
    const dh   = m.devicesHealth?.data  || [];
    const dhot = m.devicesHotspots?.data || [];
    const dmat = m.devicesMatrix || {};
    const dtu  = m.devicesUsers?.data   || [];
    // Eight rows rather than six: with six, a list of seven pushed its last row
    // onto a page of its own for no reason.
    const PAGE = 8;

    // ── Period buttons
    const period = m.devicesPeriod || 'month';
    const _pLbl  = isMob
      ? { week: 'W', month: 'M', year: 'Y', all: this._t('tabAll') }
      : { week: this._t('mtWeek'), month: this._t('mtMonth'), year: this._t('actColYear'), all: this._t('tabAll') };
    const periodBtns = _traSegHtml(Object.entries(_pLbl), period, 'data-tra-dev-period');
    // On a phone the period and the four sub-views share one bar — separately
    // they cost two rows out of a screen that has none to spare.
    const hdr = isMob ? '' : `<div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:10px">
      ${periodBtns}
    </div>`;

    // ── Stat tiles
    const _dIco = path =>
      `<svg viewBox="0 0 24 24" width="18" height="18" style="flex-shrink:0;color:var(--is-text-muted)" fill="currentColor"><path d="${path}"/></svg>`;
    const _dPlay   = 'M8,5.14V19.14L19,12.14L8,5.14Z';
    const _dScreen = 'M21,16H3V4H21M21,2H3C1.89,2 1,2.89 1,4V16A2,2 0 0,0 3,18H10V20H8V22H16V20H14V18H21A2,2 0 0,0 23,16V4C23,2.89 22.1,2 21,2Z';
    const _dCodec  = 'M14.6,16.6L19.2,12L14.6,7.4L16,6L22,12L16,18L14.6,16.6M9.4,16.6L4.8,12L9.4,7.4L8,6L2,12L8,18L9.4,16.6Z';
    const _dCheck  = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z';

    const tile = (iconSvg, lbl, val) => isMob
      ? `<div class="tl-g-card" style="display:flex;align-items:center;gap:5px;padding:5px 7px">
          ${iconSvg.replace('width="18" height="18"', 'width="13" height="13"')}
          <div>
            <div style="font-size:12px;font-weight:800;color:var(--is-text);line-height:1">${val}</div>
            <div style="font-size:8px;color:var(--is-text-muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lbl}</div>
          </div>
        </div>`
      : `<div class="tl-g-card" style="display:flex;align-items:center;gap:9px;padding:10px 12px">
          ${iconSvg}
          <div>
            <div style="font-size:14px;font-weight:800;color:var(--is-text);line-height:1">${val}</div>
            <div style="font-size:10px;color:var(--is-text-muted);margin-top:2px">${lbl}</div>
          </div>
        </div>`;
    const totalSess = sum.totalSessions ?? 0;
    const dpRaw     = sum.directPlayPct ?? sum.directPlayRate ?? null;
    const dpN_s     = dpRaw != null ? Math.round(Number(dpRaw)) : null;
    const dpFmt     = dpN_s != null ? `${dpN_s}%` : '—';
    const uDevices  = sum.uniqueDevices ?? dh.length;
    const uCodecs   = sum.uniqueCodecs  ?? 0;
    const statsRow = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:${isMob?'4px':'6px'};margin-bottom:8px">
      ${tile(_dIco(_dPlay),   isMob?this._t('traSessions'):this._t('traTotalSessions'),   totalSess)}
      ${tile(_dIco(_dCheck),  isMob?this._t('tlFilterDirectPlay'):this._t('traDpRate'), dpFmt)}
      ${tile(_dIco(_dScreen), isMob?this._t('traDevices'):this._t('traUniqueDevices'),   uDevices)}
      ${tile(_dIco(_dCodec),  isMob?this._t('traCodecs'):this._t('traUniqueCodecs'),    uCodecs)}
    </div>`;

    // ── Paging control helper
    // The pager keeps its place even when a view does not need one — otherwise
    // switching between a paged and an unpaged view shifted the whole group.
    const _pag = (view, page, total) => {
      const tot = Math.ceil(total / PAGE);
      if (tot <= 1) return `<div style="visibility:hidden;display:flex;align-items:center;gap:2px;flex-shrink:0">
        <button class="tl-page-btn" style="padding:2px 5px;font-size:13px">‹</button>
        <span style="font-size:10px;white-space:nowrap">1/1</span>
        <button class="tl-page-btn" style="padding:2px 5px;font-size:13px">›</button>
      </div>`;
      const pd = page <= 0 ? 'opacity:0.3;pointer-events:none' : '';
      const nd = page >= tot - 1 ? 'opacity:0.3;pointer-events:none' : '';
      return `<div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
        <button class="tl-page-btn" data-tra-dev-page="${view}-prev" style="padding:2px 5px;font-size:13px;${pd}">‹</button>
        <span style="font-size:10px;color:var(--is-text-muted);white-space:nowrap">${page+1}/${tot}</span>
        <button class="tl-page-btn" data-tra-dev-page="${view}-next" style="padding:2px 5px;font-size:13px;${nd}">›</button>
      </div>`;
    };

    // ── LEFT: Device Health
    const _lv = m.devicesLeftView || 'health';
    const _hP = m.devHealthPage || 0;
    const _mP = m.devMatrixPage || 0;
    const _dpC = p => p >= 80 ? '#34C759' : p >= 50 ? '#FF9500' : '#FF3B30';

    const dhPage     = dh.slice(_hP * PAGE, (_hP + 1) * PAGE);
    const healthRows = dhPage.map(d => {
      const name = d.device || d.name || d.deviceType || '?';
      const sess = d.sessions ?? d.totalSessions ?? d.count ?? 0;
      const pct  = Math.round(Number(d.directPlayPct ?? d.directPlayRate ?? d.directPlay ?? 0));
      const col  = _dpC(pct);
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
          <span style="font-size:11px;font-weight:600;color:var(--is-text)">${name}</span>
          <span class="u-xs-muted">${this._t('traNSessions').replace('{n}', sess)}&nbsp;<span style="font-weight:700;color:${col}">${pct}%</span></span>
        </div>
        <div style="height:5px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${col};border-radius:3px"></div>
        </div>
      </div>`;
    }).join('') || `<div style="color:var(--is-text-muted);font-size:11px;text-align:center;padding:14px">${this._t('tlNoData')}</div>`;

    // ── LEFT: Compatibility Matrix
    const matCodecs   = dmat.codecs  || [];
    const matData     = dmat.devices || [];
    const matDataPage = matData.slice(_mP * PAGE, (_mP + 1) * PAGE);
    const _mc = p => p >= 80 ? 'rgba(52,199,89,0.18)' : p >= 50 ? 'rgba(255,149,0,0.15)' : 'rgba(255,59,48,0.15)';
    const _mt = p => p >= 80 ? '#34C759' : p >= 50 ? '#FF9500' : '#FF3B30';
    let matInner = `<div style="color:var(--is-text-muted);font-size:11px;text-align:center;padding:12px">${this._t('tlNoData')}</div>`;
    if (matCodecs.length && matDataPage.length) {
      const cW = `${Math.max(12, Math.floor(75 / matCodecs.length))}%`;
      const thCells = matCodecs.map(c =>
        `<th style="text-align:center;font-size:10px;font-weight:600;color:var(--is-text-muted);padding:5px 8px;width:${cW}">${c}</th>`
      ).join('');
      const tRows = matDataPage.map(d => {
        const dName = d.device || d.name || '?';
        const dSess = d.sessions ?? d.totalSessions ?? '';
        const dC    = d.codecs || {};
        const cells = matCodecs.map(codec => {
          const cell = dC[codec];
          if (!cell) return `<td style="text-align:center;color:rgba(255,255,255,0.2);font-size:10px;padding:5px 8px">—</td>`;
          const p = Math.round(Number(cell.directPct ?? cell.directPlayRate ?? cell.rate ?? 0));
          const s = cell.sessions ?? cell.count ?? 0;
          return `<td style="text-align:center;background:${_mc(p)};padding:5px 8px">
            <div style="font-size:11px;font-weight:700;color:${_mt(p)}">${p}%</div>
            <div class="u-xxs-muted">${s}</div>
          </td>`;
        }).join('');
        return `<tr><td style="font-size:11px;font-weight:600;color:var(--is-text);padding:5px 8px">
          ${dName}${dSess ? `<div class="u-xxs-muted">${this._t('traNSessions').replace('{n}', dSess)}</div>` : ''}
        </td>${cells}</tr>`;
      }).join('');
      matInner = `<table class="tl-hist-table" style="width:100%">
        <thead><tr>
          <th style="text-align:left;font-size:10px;font-weight:600;color:var(--is-text-muted);padding:5px 8px;width:20%">${this._t('traDevice')}</th>
          ${thCells}
        </tr></thead>
        <tbody>${tRows}</tbody>
      </table>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center">
        ${this._uiBadge(`≥80% Direct`, this._hexToRgbTriple('#34C759'), { small: true })}
        ${this._uiBadge(`50-79%`, this._hexToRgbTriple('#FF9500'), { small: true })}
        ${this._uiBadge(`&lt;50%`, this._hexToRgbTriple('#FF3B30'), { small: true })}
      </div>`;
    }

    const leftCard = `<div class="tl-g-card" style="flex:1;min-height:0;min-width:0;overflow:hidden;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-shrink:0;gap:6px">
        <span class="tl-graph-title" style="font-size:11px">${_lv === 'health' ? this._t('traDevHealth') : this._t('traCompatMatrix')}</span>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          ${_traSegHtml([['health',this._t('traHealth')],['matrix',this._t('traMatrix')]], _lv, 'data-tra-dev-left-tab')}
          ${_lv === 'health' ? _pag('health', _hP, dh.length) : _pag('matrix', _mP, matData.length)}
        </div>
      </div>
      <div data-tra-dev-left-panel="health" style="flex:1;overflow-y:auto;${_lv==='health'?'':'display:none'}">${healthRows}</div>
      <div data-tra-dev-left-panel="matrix" style="flex:1;overflow-y:auto;${_lv==='matrix'?'':'display:none'}">${matInner}</div>
    </div>`;

    // ── RIGHT: Hotspots / Users
    const _rv  = m.devicesRightView || 'hotspots';
    const _hoP = m.devHotspotsPage || 0;
    const _uP  = m.devUsersPage || 0;

    const dhotPage = dhot.slice(_hoP * PAGE, (_hoP + 1) * PAGE);
    const _noData3 = `<tr><td colspan="3" style="text-align:center;color:var(--is-text-muted);font-size:11px;padding:12px">${this._t('tlNoData')}</td></tr>`;
    const hotRows  = dhotPage.map(h => {
      const dev = h.device || h.deviceType || '?';
      const vid = h.videoCodec || h.codec || '';
      const aud = h.audioCodec || '';
      const cod = [vid, aud].filter(Boolean).join(' + ') || h.codecCombination || '?';
      const tr  = h.transcodeCount ?? h.transcodes ?? h.count ?? 0;
      const pct = Math.round(Number(h.pctOfTotalTranscodes ?? h.percentage ?? h.percent ?? 0));
      const pc  = pct >= 50 ? '#FF3B30' : '#FF9500';
      const pb  = pct >= 50 ? 'rgba(255,59,48,0.12)' : 'rgba(255,149,0,0.1)';
      return `<tr>
        <td style="padding:5px 0;font-size:11px;color:var(--is-text)">
          <div style="font-weight:600">${dev}</div>
          <div class="u-xs-muted">${cod}</div>
        </td>
        <td style="padding:5px 6px;font-size:11px;font-weight:700;color:var(--is-text);text-align:right">${tr}</td>
        <td style="padding:5px 0 5px 6px;text-align:right">${this._uiBadge(`${pct}%`, this._hexToRgbTriple(pc), { extra: 'font-size:10px' })}</td>
      </tr>`;
    }).join('') || _noData3;
    const hotMobCards = dhotPage.map(h => {
      const dev = h.device || h.deviceType || '?';
      const vid = h.videoCodec || h.codec || '';
      const aud = h.audioCodec || '';
      const cod = [vid, aud].filter(Boolean).join(' + ') || h.codecCombination || '?';
      const tr  = h.transcodeCount ?? h.transcodes ?? h.count ?? 0;
      const pct = Math.round(Number(h.pctOfTotalTranscodes ?? h.percentage ?? h.percent ?? 0));
      const pc  = pct >= 50 ? '#FF3B30' : '#FF9500';
      const pb  = pct >= 50 ? 'rgba(255,59,48,0.12)' : 'rgba(255,149,0,0.1)';
      return `<div class="tl-mob-card" style="display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center">
        <span style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${dev}</span>
        ${this._uiBadge(`${pct}%`, this._hexToRgbTriple(pc), { extra: 'font-size:10px' })}
        <span class="u-xs-muted">${cod}</span>
        <span style="font-size:10px;color:var(--is-text-muted);text-align:right">${this._t('traNTranscodes').replace('{n}', tr)}</span>
      </div>`;
    }).join('') || `<div style="color:var(--is-text-muted);font-size:11px;text-align:center;padding:14px">${this._t('tlNoData')}</div>`;

    const dtuPage = dtu.slice(_uP * PAGE, (_uP + 1) * PAGE);
    const tuRows  = dtuPage.map(u => {
      const name = u.identityName || u.username || u.displayName || '?';
      const av   = u.avatar || u.avatarUrl || null;
      const sess = u.totalSessions ?? u.sessions ?? 0;
      const dpN  = Math.round(Number(u.directPlayPct ?? u.directPlayRate ?? 0));
      const tr   = u.transcodeCount ?? u.transcodes ?? 0;
      const pctN = Math.round(Number(u.pctOfTotalTranscodes ?? u.percentage ?? (sess ? tr / sess * 100 : 0)));
      const dc2  = dpN >= 80 ? '#34C759' : dpN >= 50 ? '#FF9500' : '#FF3B30';
      const db2  = dpN >= 80 ? 'rgba(52,199,89,0.12)' : dpN >= 50 ? 'rgba(255,149,0,0.1)' : 'rgba(255,59,48,0.12)';
      const avEl = av
        ? `<img src="${av}" width="20" height="20" style="border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<div style="width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--is-text-muted)">${(name[0]||'?').toUpperCase()}</div>`;
      return `<tr>
        <td style="padding:6px 0;font-size:11px;font-weight:600;color:var(--is-text)">
          <div class="u-row-6">${avEl}<span>${name}</span></div>
        </td>
        <td style="padding:6px 6px;font-size:11px;text-align:right;color:var(--is-text)">${sess}</td>
        <td style="padding:6px 6px;text-align:right">${this._uiBadge(`${dpN}%`, this._hexToRgbTriple(dc2), { extra: 'font-size:10px' })}</td>
        <td style="padding:6px 6px;font-size:11px;text-align:right;color:var(--is-text)">${tr}</td>
        <td style="padding:6px 0;text-align:right">${this._uiBadge(`${pctN}%`, this._hexToRgbTriple('#FF3B30'), { extra: 'font-size:10px' })}</td>
      </tr>`;
    }).join('');
    const usersMobCards = dtuPage.map(u => {
      const name = u.identityName || u.username || u.displayName || '?';
      const av   = u.avatar || u.avatarUrl || null;
      const sess = u.totalSessions ?? u.sessions ?? 0;
      const dpN  = Math.round(Number(u.directPlayPct ?? u.directPlayRate ?? 0));
      const tr   = u.transcodeCount ?? u.transcodes ?? 0;
      const pctN = Math.round(Number(u.pctOfTotalTranscodes ?? u.percentage ?? (sess ? tr / sess * 100 : 0)));
      const dc2  = dpN >= 80 ? '#34C759' : dpN >= 50 ? '#FF9500' : '#FF3B30';
      const db2  = dpN >= 80 ? 'rgba(52,199,89,0.12)' : dpN >= 50 ? 'rgba(255,149,0,0.1)' : 'rgba(255,59,48,0.12)';
      const avEl = av
        ? `<img src="${av}" width="18" height="18" style="border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<div style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:8px;color:var(--is-text-muted)">${(name[0]||'?').toUpperCase()}</div>`;
      return `<div class="tl-mob-card" style="display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center">
        <div style="display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden">
          ${avEl}
          <span style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span>
        </div>
        ${this._uiBadge(`${dpN}% direct`, this._hexToRgbTriple(dc2), { extra: 'font-size:10px' })}
        <span class="u-xs-muted">${this._t('traSessTrans').replace('{s}', sess).replace('{t}', tr)}</span>
        <span style="font-size:10px;color:var(--is-text-muted);text-align:right">${this._t('traPctTotal').replace('{n}', pctN)}</span>
      </div>`;
    }).join('') || `<div style="color:var(--is-text-muted);font-size:11px;text-align:center;padding:14px">${this._t('tlNoData')}</div>`;

    const usersHtml = tuRows
      ? `<table class="tl-hist-table" style="width:100%">
          <thead><tr>
            <th style="text-align:left;font-size:10px;color:var(--is-text-muted);padding-bottom:5px">${this._t('tlColUser')}</th>
            <th style="text-align:right;font-size:10px;color:var(--is-text-muted);padding-bottom:5px;padding-right:6px">${this._t('traSessions')}</th>
            <th style="text-align:right;font-size:10px;color:var(--is-text-muted);padding-bottom:5px;padding-right:6px">${this._t('tlFilterDirectPlay')}</th>
            <th style="text-align:right;font-size:10px;color:var(--is-text-muted);padding-bottom:5px;padding-right:6px">${this._t('traTranscodes')}</th>
            <th style="text-align:right;font-size:10px;color:var(--is-text-muted);padding-bottom:5px">% of Total</th>
          </tr></thead>
          <tbody>${tuRows}</tbody>
        </table>`
      : `<div style="color:var(--is-text-muted);font-size:11px;text-align:center;padding:12px">${this._t('tlNoData')}</div>`;

    const rightCard = `<div class="tl-g-card" style="flex:1;min-height:0;min-width:0;overflow:hidden;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-shrink:0;gap:6px">
        <span class="tl-graph-title" style="font-size:11px">${_rv === 'hotspots' ? this._t('traTransHotspots') : this._t('traTopTransUsers')}</span>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          ${_traSegHtml([['hotspots',this._t('traHotspots')],['users',this._t('tlUsers')]], _rv, 'data-tra-dev-right-tab')}
          ${_rv === 'hotspots' ? _pag('hotspots', _hoP, dhot.length) : _pag('users', _uP, dtu.length)}
        </div>
      </div>
      <div data-tra-dev-panel="hotspots" style="flex:1;overflow-y:auto;${_rv==='hotspots'?'':'display:none'}">
        <table class="tl-hist-table" style="width:100%">
          <thead><tr>
            <th style="text-align:left;font-size:10px;color:var(--is-text-muted);padding-bottom:5px">${this._t('traDevCodec')}</th>
            <th style="text-align:right;font-size:10px;color:var(--is-text-muted);padding-bottom:5px;padding-right:6px">${this._t('traTranscodes')}</th>
            <th style="text-align:right;font-size:10px;color:var(--is-text-muted);padding-bottom:5px">% of Total</th>
          </tr></thead>
          <tbody>${hotRows}</tbody>
        </table>
      </div>
      <div data-tra-dev-panel="users" style="flex:1;overflow-y:auto;${_rv==='users'?'':'display:none'}">${usersHtml}</div>
    </div>`;

    if (isMob) {
      const mobView = m.devMobView || m.devicesLeftView || 'health';
      const mobNav = `<div class="tra-dev-bar" style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">
        ${_traSegHtml([['health',this._t('traHealth')],['matrix',this._t('traMatrix')],['hotspots',this._t('traHotspots')],['users',this._t('tlUsers')]], mobView, 'data-tra-dev-mob-tab', 'flex:1;min-width:0')}
        <span class="mt-tb-sep"></span>
        ${_traSegHtml(Object.entries(_pLbl), period, 'data-tra-dev-period', 'flex-shrink:0')}
      </div>`;
      const _panelTitle = { health:this._t('traDevHealth'), matrix:this._t('traCompatMatrix'), hotspots:this._t('traTransHotspots'), users:this._t('traTopTransUsers') };
      const _panelContent = {
        health:    `<div style="display:flex;flex-direction:column;gap:6px">${healthRows}</div>`,
        matrix:    matInner,
        hotspots:  `<div style="display:flex;flex-direction:column;gap:6px">${hotMobCards}</div>`,
        users:     `<div style="display:flex;flex-direction:column;gap:6px">${usersMobCards}</div>`,
      };
      const _panelPag = {
        health:   _pag('health',   _hP,  dh.length),
        matrix:   _pag('matrix',   _mP,  matData.length),
        hotspots: _pag('hotspots', _hoP, dhot.length),
        users:    _pag('users',    _uP,  dtu.length),
      };
      const mobPanel = `<div class="tl-g-card u-col">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-shrink:0">
          <span class="tl-graph-title" style="font-size:11px">${_panelTitle[mobView]||''}</span>
          ${_panelPag[mobView]||''}
        </div>
        ${_panelContent[mobView]||''}
      </div>`;
      // Controls first, then the figures they scope — the bar changes what the
      // tiles say, so it reads better above them.
      return `<div class="u-col-fill">${mobNav}${statsRow}${mobPanel}</div>`;
    }

    const twoColRow = `<div style="display:flex;gap:8px;flex:1;min-height:0;align-items:stretch">
      <div style="flex:0 0 calc(50% - 4px);min-width:0;min-height:0;display:flex;flex-direction:column">
        ${leftCard}
      </div>
      <div style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column">
        ${rightCard}
      </div>
    </div>`;
    return `<div class="u-col-fill">${hdr}${statsRow}${twoColRow}</div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────

  _traBodyBandwidth() {
    const m = this._tracearrModal;
    if (!m) return '';
    const isMob = this._isMob;
    const sum   = m.bwSummary || {};
    const _bd   = m.bwDaily;
    const daily = Array.isArray(_bd) ? _bd : (_bd?.data || _bd?.daily || _bd?.items || []);
    const _bu   = m.bwUsers;
    const users = Array.isArray(_bu) ? _bu : (_bu?.data || _bu?.users || _bu?.items || []);

    // ── Formatters
    const _fmtGb  = gb => { if (gb == null) return '—'; const n = Number(gb); return n >= 1024 ? `${(n/1024).toFixed(2)} TB` : `${n.toFixed(1)} GB`; };
    const _fmtHrs = h  => { if (h  == null) return '—'; const n = Number(h);  return n >= 24 ? `${Math.floor(n/24)}d ${Math.round(n%24)}h` : `${n.toFixed(1)}h`; };
    const _fmtBr  = mbps => mbps != null ? `${Number(mbps).toFixed(1)} Mbps` : '—';

    // ── Period buttons (rendered inside chart card header)
    const period = m.bwPeriod || 'month';
    const _BW_P_LBLS = isMob ? { week: 'W', month: 'M', year: 'Y', all: this._t('tabAll') } : { week: this._t('mtWeek'), month: this._t('mtMonth'), year: this._t('actColYear'), all: this._t('tabAll') };
    const periodBtns = _traSegHtml(['week','month','year','all'].map(p => [p, _BW_P_LBLS[p]]), period, 'data-tra-bw-period');

    // ── Stat tiles
    const _ico = path =>
      `<svg viewBox="0 0 24 24" width="18" height="18" style="flex-shrink:0;color:var(--is-text-muted)" fill="currentColor"><path d="${path}"/></svg>`;
    const _mdiPlay   = 'M8,5.14V19.14L19,12.14L8,5.14Z';
    const _mdiDB     = 'M12,3C7.58,3 4,4.79 4,7C4,9.21 7.58,11 12,11C16.42,11 20,9.21 20,7C20,4.79 16.42,3 12,3M4,9V12C4,14.21 7.58,16 12,16C16.42,16 20,14.21 20,12V9C20,11.21 16.42,13 12,13C7.58,13 4,11.21 4,9M4,14V17C4,19.21 7.58,21 12,21C16.42,21 20,19.21 20,17V14C20,16.21 16.42,18 12,18C7.58,18 4,16.21 4,14Z';
    const _mdiWifi   = 'M1,9L3,11C7.97,6.03 16.03,6.03 21,11L23,9C16.93,2.93 7.08,2.93 1,9M9,17L12,20L15,17C13.35,15.36 10.66,15.36 9,17M5,13L7,15C9.76,12.24 14.24,12.24 17,15L19,13C15.14,9.14 8.87,9.14 5,13Z';
    const _mdiClock  = 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z';
    const _mdiPeople = 'M16,13C15.71,13 15.38,13.03 15.03,13.08C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z';

    const tile = (iconSvg, lbl, val) => isMob
      ? `<div class="tl-g-card" style="display:flex;align-items:center;gap:5px;padding:5px 7px">
          ${iconSvg.replace('width="18" height="18"', 'width="13" height="13"')}
          <div>
            <div style="font-size:12px;font-weight:800;color:var(--is-text);line-height:1">${val}</div>
            <div style="font-size:8px;color:var(--is-text-muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lbl}</div>
          </div>
        </div>`
      : `<div class="tl-g-card" style="display:flex;align-items:center;gap:9px;padding:10px 12px">
          ${iconSvg}
          <div>
            <div style="font-size:14px;font-weight:800;color:var(--is-text);line-height:1">${val}</div>
            <div style="font-size:10px;color:var(--is-text-muted);margin-top:2px">${lbl}</div>
          </div>
        </div>`;

    const avgBrLbl = sum.peakBitrateMbps != null ? this._t('traAvgPeak').replace('{n}', _fmtBr(sum.peakBitrateMbps)) : this._t('traAvgBitrate');
    const statsRow = isMob
      ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px">
          ${tile(_ico(_mdiPlay),   this._t('traSessions'),   sum.totalSessions ?? 0)}
          ${tile(_ico(_mdiDB),     this._t('traData'),       _fmtGb(sum.totalGb))}
          ${tile(_ico(_mdiWifi),   this._t('traAvgBitrate'),_fmtBr(sum.avgBitrateMbps))}
          ${tile(_ico(_mdiPeople), this._t('tlUsers'),      sum.uniqueUsers ?? 0)}
        </div>`
      : `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:8px">
          ${tile(_ico(_mdiPlay),   this._t('traTotalSessions'),   sum.totalSessions ?? 0)}
          ${tile(_ico(_mdiDB),     this._t('traDataTransferred'), _fmtGb(sum.totalGb))}
          ${tile(_ico(_mdiWifi),   avgBrLbl,           _fmtBr(sum.avgBitrateMbps))}
          ${tile(_ico(_mdiClock),  this._t('traWatchTime'), _fmtHrs(sum.totalHours))}
          ${tile(_ico(_mdiPeople), this._t('traUniqueUsers'),     sum.uniqueUsers ?? 0)}
        </div>`;

    // ── Dual-axis chart — bars=GB left axis, line=sessions right axis
    const chartHtml = (() => {
      const VBW=1000, SVH=200, PL=6, PR=6, PT=18, PB=6;
      const cW=VBW-PL-PR, cH=SVH-PT-PB, baseY=PT+cH;

      if (!daily.length) {
        return `<svg class="tl-g-svg" viewBox="0 0 ${VBW} ${SVH}" width="100%" height="160" preserveAspectRatio="none">
          <text x="${VBW/2}" y="${SVH/2}" text-anchor="middle" dominant-baseline="middle" style="fill:var(--is-text-muted);font-size:22">${this._t('tlNoData')}</text>
        </svg>`;
      }

      const maxGb   = Math.max(...daily.map(d => Number(d.totalGb || 0)), 0.01);
      const maxSess = Math.max(...daily.map(d => Number(d.sessions || 0)), 1);
      const n       = daily.length;
      const slotW   = cW / n;
      const bwFrac  = n<=7 ? 0.50 : n<=14 ? 0.55 : Math.min(0.65, Math.max(0.14, 42/slotW));
      const bw      = Math.max(4, slotW * bwFrac);
      const rr      = Math.min(bw * 0.38, 10);

      const BAR_HEX  = '#34C759';
      const LINE_HEX = '#007AFF';

      // Rounded-top bar path (same as _tlGRoundedTop)
      const roundTop = (x, y, w, h, r) => {
        r = Math.min(r, h/2, w/2);
        if (r < 0.5) return `M${x},${y+h} L${x},${y} L${x+w},${y} L${x+w},${y+h} Z`;
        const f = v => v.toFixed(2);
        return `M${f(x)},${f(y+h)} L${f(x)},${f(y+r)} Q${f(x)},${f(y)} ${f(x+r)},${f(y)} L${f(x+w-r)},${f(y)} Q${f(x+w)},${f(y)} ${f(x+w)},${f(y+r)} L${f(x+w)},${f(y+h)} Z`;
      };

      // Bars
      let bars = '', delay = 0;
      daily.forEach((d, i) => {
        const gb = Number(d.totalGb || 0);
        if (!gb) return;
        const h  = (gb / maxGb) * cH;
        const x  = PL + i * slotW + (slotW - bw) / 2;
        const y  = baseY - h;
        bars += `<path d="${roundTop(x, y, bw, h, rr)}" style="fill:url(#bwbg);animation-delay:${(delay*0.012).toFixed(2)}s" class="tl-g-anim-bar"/>`;
        delay++;
      });

      // Area + line (sessions, right axis)
      const sessCoords = daily.map((d, i) => ({
        x: PL + i * slotW + slotW / 2,
        y: PT + cH - (Number(d.sessions || 0) / maxSess) * cH,
      }));
      let areaD = `M${sessCoords[0].x.toFixed(1)},${baseY}`;
      sessCoords.forEach(p => { areaD += ` L${p.x.toFixed(1)},${p.y.toFixed(1)}`; });
      areaD += ` L${sessCoords[sessCoords.length-1].x.toFixed(1)},${baseY} Z`;
      const sessPts = sessCoords.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

      // Y ticks left (GB)
      const gbFmt = v => v >= 1024 ? `${(v/1024).toFixed(1)}T` : v < 10 ? `${v.toFixed(1)}` : `${Math.round(v)}`;
      const yTicksL = [0, 0.5, 1].map(f => ({
        y: (PT + cH - f * cH).toFixed(1),
        lbl: f > 0 ? gbFmt(maxGb * f) : '',
      }));
      // Y ticks right (sessions)
      const yTicksR = [0, 0.5, 1].map(f => ({
        y: (PT + cH - f * cH).toFixed(1),
        lbl: f > 0 ? String(Math.round(maxSess * f)) : '',
      }));

      // X labels
      const showEvery = Math.max(1, Math.ceil(n / 8));
      const xLabelPcts = [];
      daily.forEach((d, i) => {
        if (i % showEvery !== 0 && i !== n-1) return;
        const dt  = new Date(d.date || '');
        const lbl = isNaN(dt.getTime()) ? '' : `${dt.getMonth()+1}/${dt.getDate()}`;
        if (!lbl) return;
        xLabelPcts.push({ pct: ((PL + i * slotW + slotW / 2) / VBW * 100).toFixed(1), lbl, first: i===0, last: i===n-1 });
      });
      const xLabelsHtml = xLabelPcts.length
        ? `<div class="tl-g-x-labels">${xLabelPcts.map(l => {
            const a = l.first ? 'translateX(0)' : l.last ? 'translateX(-100%)' : 'translateX(-50%)';
            return `<span style="position:absolute;left:${l.pct}%;transform:${a};font-size:10px;color:var(--is-text-muted);white-space:nowrap;line-height:1">${l.lbl}</span>`;
          }).join('')}</div>` : '';

      // Hit columns for tooltips
      const _escBw = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      const hitColsBw = daily.map((d, i) => {
        const gb   = Number(d.totalGb  || 0);
        const sess = Number(d.sessions || 0);
        const dt   = new Date(d.date || '');
        const lbl  = isNaN(dt.getTime()) ? (d.date || '') : `${dt.getMonth()+1}/${dt.getDate()}`;
        const td   = _escBw(JSON.stringify({
          lbl,
          tot: null,
          vals: [
            { n: this._t('traData'), fv: _fmtGb(gb),   hex: BAR_HEX  },
            { n: this._t('traSessions'), fv: String(sess), hex: LINE_HEX },
            { n: this._t('traAvgBitrateLc'), fv: _fmtBr(d.avgBitrateMbps || 0), hex: 'var(--is-text-muted)' },
          ],
        }));
        const rx = (PL + i * slotW).toFixed(1);
        const rw = slotW.toFixed(1);
        return `<g class="tl-g-lcol" data-tl-g-col="${td}" style="cursor:pointer">` +
               `<rect class="tl-g-lhlt" x="${rx}" y="${PT}" width="${rw}" height="${cH}" style="fill:rgba(255,255,255,0.08);opacity:0"/>` +
               `<rect x="${rx}" y="${PT}" width="${rw}" height="${cH}" fill="transparent"/></g>`;
      }).join('');

      const svgInner = `
        <defs>
          <linearGradient id="bwbg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="${BAR_HEX}" stop-opacity="0.92"/>
            <stop offset="100%" stop-color="${BAR_HEX}" stop-opacity="0.42"/>
          </linearGradient>
          <linearGradient id="bwag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="${LINE_HEX}" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="${LINE_HEX}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${[0,0.5,1].map(f => `<line x1="${PL}" y1="${(PT+cH-f*cH).toFixed(1)}" x2="${VBW-PR}" y2="${(PT+cH-f*cH).toFixed(1)}" stroke="rgba(255,255,255,${f===0?'0.08':'0.05'})" stroke-width="1" ${f===0.5?'stroke-dasharray="4 3"':''}/>` ).join('')}
        ${bars}
        <path d="${areaD}" fill="url(#bwag)" style="animation:fade-in 0.8s ease-out both"/>
        <polyline points="${sessPts}" fill="none" stroke="${LINE_HEX}" stroke-width="2" vector-effect="non-scaling-stroke" class="tl-g-anim-line"/>
        ${hitColsBw}
      `;

      // Y-axis ticks as HTML (avoid SVG text stretch from preserveAspectRatio:none)
      const SVGH_DISP = 110;
      const mapY = svgY => (parseFloat(svgY) / SVH * SVGH_DISP).toFixed(1);
      const PW = 38; // side panel width

      const yHtmlL = yTicksL.filter(t => t.lbl).map(t =>
        `<span style="position:absolute;right:2px;top:${mapY(t.y)}px;transform:translateY(-50%);font-size:9px;line-height:1;color:#34C759;white-space:nowrap">${t.lbl}</span>`
      ).join('');
      const yHtmlR = yTicksR.filter(t => t.lbl).map(t =>
        `<span style="position:absolute;left:2px;top:${mapY(t.y)}px;transform:translateY(-50%);font-size:9px;line-height:1;color:rgba(107,170,255,0.85);white-space:nowrap">${t.lbl}</span>`
      ).join('');

      return `<div style="position:relative;padding-left:${PW}px;padding-right:${PW}px">
        <div style="position:absolute;left:0;top:0;width:${PW}px;height:${SVGH_DISP}px;overflow:visible">
          <span style="position:absolute;left:0;top:0;width:${PW}px;height:${SVGH_DISP}px;display:flex;align-items:center;justify-content:center">
            <span style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:9px;color:rgba(52,199,89,0.7);white-space:nowrap">GB</span>
          </span>
          ${yHtmlL}
        </div>
        <div style="position:absolute;right:0;top:0;width:${PW}px;height:${SVGH_DISP}px;overflow:visible">
          <span style="position:absolute;left:0;top:0;width:${PW}px;height:${SVGH_DISP}px;display:flex;align-items:center;justify-content:center">
            <span style="writing-mode:vertical-rl;font-size:9px;color:rgba(107,170,255,0.7);white-space:nowrap">${this._t('traSessions')}</span>
          </span>
          ${yHtmlR}
        </div>
        <svg class="tl-g-svg" viewBox="0 0 ${VBW} ${SVH}" width="100%" height="${SVGH_DISP}" preserveAspectRatio="none">${svgInner}</svg>
        ${xLabelsHtml}
      </div>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:6px">
        <div class="u-row-5"><div style="width:10px;height:10px;border-radius:2px;background:${BAR_HEX};opacity:0.7"></div><span class="u-xs-muted">${this._t('traDataGb')}</span></div>
        <div class="u-row-5"><div style="width:12px;height:3px;border-radius:2px;background:${LINE_HEX}"></div><span class="u-xs-muted">${this._t('traSessions')}</span></div>
      </div>`;
    })();

    const _tipEl = `<div class="tl-g-tip" style="display:none;position:absolute;top:0;left:0;background:var(--is-menu-bg,#18182a);border:1px solid var(--is-btn-bdr);border-radius:7px;padding:7px 10px;font-size:11px;pointer-events:none;z-index:50;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3)"></div>`;
    const chartCard = `<div class="tl-g-card" style="margin-bottom:8px;flex-shrink:0;position:relative">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span class="tl-graph-title" style="font-size:11px">${this._t('traDailyBw')}</span>
        ${periodBtns}
      </div>
      ${chartHtml}
      ${_tipEl}
    </div>`;

    // ── Top Bandwidth Users with paging
    const BW_PAGE = isMob
      ? Math.max(2, Math.floor((window.innerHeight * 0.88 - 500) / 60))
      : 5;
    m.bwPageSize = BW_PAGE;
    const bwPage  = m.bwUsersPage || 0;
    const bwTotal = users.length;
    const bwPages = Math.max(1, Math.ceil(bwTotal / BW_PAGE));
    const pageUsers = users.slice(bwPage * BW_PAGE, (bwPage + 1) * BW_PAGE);

    const userRows = pageUsers.map((u, i) => {
      const rank = bwPage * BW_PAGE + i + 1;
      const name = u.identityName || u.username || u.displayName || '?';
      const av   = u.thumbUrl || u.avatarUrl || u.avatar || null;
      const avEl = av
        ? `<img src="${av}" width="22" height="22" style="border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<div style="width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,0.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--is-text-muted)">${(name[0]||'?').toUpperCase()}</div>`;
      return `<tr>
        <td style="padding:6px 8px;font-size:11px;color:var(--is-text-muted);text-align:center;width:28px">${rank}</td>
        <td style="padding:6px 0;font-size:11px;font-weight:600;color:var(--is-text)">
          <div style="display:flex;align-items:center;gap:7px">${avEl}<span>${name}</span></div>
        </td>
        <td style="padding:6px 8px;font-size:11px;text-align:right;color:var(--is-text)">${u.sessions ?? 0}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:right;color:var(--is-text)">${_fmtGb(u.totalGb)}</td>
        <td style="padding:6px 8px;font-size:11px;text-align:right;color:var(--is-text)">${_fmtHrs(u.totalHours)}</td>
        <td style="padding:6px 0;text-align:right">${this._uiBadge(`${_fmtBr(u.avgBitrateMbps)}`, this._hexToRgbTriple('#FF9500'), { extra: 'font-size:10px' })}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--is-text-muted);font-size:11px;padding:14px">${this._t('tlNoData')}</td></tr>`;

    const userMobCards = pageUsers.map((u, i) => {
      const rank = bwPage * BW_PAGE + i + 1;
      const name = u.identityName || u.username || u.displayName || '?';
      const av   = u.thumbUrl || u.avatarUrl || u.avatar || null;
      const avEl = av
        ? `<img src="${av}" width="18" height="18" style="border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<div style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:8px;color:var(--is-text-muted)">${(name[0]||'?').toUpperCase()}</div>`;
      const metaParts = [
        `${u.sessions ?? 0} sess`,
        _fmtHrs(u.totalHours) !== '—' ? _fmtHrs(u.totalHours) : null,
      ].filter(Boolean).join('  ·  ');
      return `<div class="tl-mob-card" style="display:grid;grid-template-columns:16px 1fr auto;gap:2px 6px;align-items:center">
        <span style="font-size:9px;color:var(--is-text-muted);text-align:center;line-height:1">${rank}</span>
        <div style="display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden">${avEl}<span style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span></div>
        <span style="font-size:11px;font-weight:700;color:var(--is-text)">${_fmtGb(u.totalGb)}</span>
        <span></span>
        <span class="u-xs-muted">${metaParts}</span>
        ${this._uiBadge(`${_fmtBr(u.avgBitrateMbps)}`, this._hexToRgbTriple('#FF9500'), { extra: 'font-size:10px' })}
      </div>`;
    }).join('') || `<div style="color:var(--is-text-muted);font-size:11px;text-align:center;padding:14px">${this._t('tlNoData')}</div>`;

    const bwPaging = this._uiPager('tra-bw-users-page', bwPage, bwPages, true);

    if (isMob) {
      return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;margin:-10px -12px -16px">
        <div style="flex:1;min-height:0;overflow-y:auto;padding:10px 12px 0">
          ${statsRow}${chartCard}
          <div class="tl-g-card" style="display:flex;flex-direction:column;margin-bottom:0">
            <div style="margin-bottom:8px;flex-shrink:0"><span class="tl-graph-title" style="font-size:11px">${this._t('traTopBwUsers')}</span></div>
            <div style="display:flex;flex-direction:column;gap:6px">${userMobCards}</div>
          </div>
        </div>
        <div style="flex-shrink:0;padding:4px 12px 8px">${bwPaging}</div>
      </div>`;
    }

    const usersCard = `<div class="tl-g-card" style="flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column">
      <div style="margin-bottom:8px;flex-shrink:0">
        <span class="tl-graph-title" style="font-size:11px">${this._t('traTopBwUsers')}</span>
      </div>
      <div style="flex:1;overflow-y:auto;min-height:0">
        <table class="tl-hist-table" style="width:100%">
          <thead><tr>
            <th style="text-align:center;width:28px">#</th>
            <th style="text-align:left">${this._t('tlColUser')}</th>
            <th style="text-align:right;padding-right:8px">${this._t('traSessions')}</th>
            <th style="text-align:right;padding-right:8px">${this._t('traData')}</th>
            <th style="text-align:right;padding-right:8px">${this._t('traWatchTimeShort')}</th>
            <th style="text-align:right">${this._t('traAvgBitrate')}</th>
          </tr></thead>
          <tbody>${userRows}</tbody>
        </table>
      </div>
      ${bwPaging}
    </div>`;

    return `<div class="u-col-fill">${statsRow}${chartCard}${usersCard}</div>`;
  }

}

export const tracearrNetworkMixin = _TracearrNetworkMethods.prototype;
