// ──────────────────────────────────────────────────────────────────────────
// Tautulli — table renderers: Libraries + Users
// ──────────────────────────────────────────────────────────────────────────

const _tlSortTh = (c, sortCol, sortDir, dataAttr) =>
  `<th data-${dataAttr}="${c.sort}" style="${c.right ? 'text-align:right;' : ''}cursor:pointer;user-select:none">` +
  `<span style="white-space:nowrap">${c.label} <span style="opacity:${c.sort === sortCol ? 1 : 0.3};font-size:9px">${c.sort === sortCol ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span></span></th>`;

// Round tonal buttons, as everywhere else in the card; the label lives in the
// tooltip because these sit in a row of icons.
export const _TL_TRASH = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
const _TL_PURGE = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;

class _TautulliTableMethods {

  // ──────────────────────────────────────────────────────────────────────────
  // Libraries
  // ──────────────────────────────────────────────────────────────────────────

  _tlBodyLibraries(data, total) {
    const isMobile  = this._isMob;
    const m         = this._tautulliModal || {};
    if (m.mediaDetailKey) return this._tlBodyMediaDetail();
    if (m.libDetailId)    return this._tlBodyLibDetail();
    const page      = m.libsPage || 0;
    const perPage   = this._tlCalcPerPage();
    const sortCol   = m.libsSortCol  || 'plays';
    const sortDir   = m.libsSortDir  || 'desc';
    const editMode  = m.libsEditMode || false;
    const search    = (m.libsSearch || '').toLowerCase().trim();
    const hidden    = this._tlHidden('libsHiddenCols',    ['type']);
    const mobHidden = this._tlHidden('libsMobHiddenCols', ['type','parents','children','lastStream']);
    const filtered  = search ? (data || []).filter(l => (l.section_name || '').toLowerCase().includes(search)) : (data || []);
    const tot        = filtered.length;
    const totalPages = Math.max(1, Math.ceil(tot / perPage));

    const COLS = [
      { key:'name',       label:this._t('tlColLibrary'),    sort:'section_name',  right:false },
      { key:'type',       label:this._t('tlColType'),       sort:'section_type',  right:false },
      { key:'count',      label:this._t('tlColItems'),      sort:'count',         right:true  },
      { key:'parents',    label:this._t('tlColSeasonsAlbums'), sort:'parent_count',  right:true  },
      { key:'children',   label:this._t('tlColEpisodesTracks'), sort:'child_count',   right:true  },
      { key:'lastStream', label:this._t('tlColStreamed'),    sort:'last_accessed', right:false },
      { key:'lastPlayed', label:this._t('tlColLastPlayed'),  sort:'last_played',   right:false },
      { key:'plays',      label:this._t('tlColPlays'),      sort:'plays',         right:true  },
      { key:'duration',   label:this._t('tlColDuration'),   sort:'duration',      right:true  },
    ];
    const vis = COLS.filter(c => !hidden.has(c.key));

    // Desktop col-picker: all except 'name'
    const deskColItems = this._tlColItems(COLS.filter(c => c.key !== 'name'), hidden, 'data-tl-lib-col');
    const deskColsBtn  = this._tlColsMenu('tl-libs-cols-btn', 'tl-libs-cols-menu', deskColItems, m.libsColsOpen);
    // Mobile col-picker
    const MOB_LIB_COLS = [
      { key:'plays',      label:this._t('tlColPlays') },
      { key:'lastPlayed', label:this._t('tlColLastPlayed') },
      { key:'type',       label:this._t('tlColType') },
      { key:'parents',    label:this._t('tlColSeasonsAlbums') },
      { key:'children',   label:this._t('tlColEpsTracks') },
      { key:'lastStream', label:this._t('tlColLastStreamedMob') },
    ];
    const mobColItems = this._tlColItems(MOB_LIB_COLS, mobHidden, 'data-tl-lib-mob-col');
    const mobColsBtn  = this._tlColsMenu('tl-libs-mob-cols-btn', 'tl-libs-mob-cols-menu', mobColItems, m.libsMobColsOpen);

    const editBtn   = this._tlEditBtn('tl-libs-edit-btn', editMode);
    const colsBtn   = isMobile ? mobColsBtn : deskColsBtn;
    const toolbar   = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">${
      this._uiBar('tl-libs-search', m.libsSearch || '', [], [{ html: editBtn }, { html: colsBtn }])}</div>`;

    // ── Mobile cards ──────────────────────────────────────────────────────────
    const page2 = Math.min(page, totalPages - 1);
    const sliced = filtered.slice(page2 * perPage, (page2 + 1) * perPage);
    if (isMobile) {
      const cards = sliced.map(lib => {
        const type = (lib.section_type || '').toLowerCase();
        const icon = this._tlLibSvgIcon(type, lib.section_name || '', 'sm');
        const sid  = lib.section_id || '';
        const editBtns = editMode ? `<div class="tl-mob-edit">
          ${this._mtRoundBtn(`data-tl-lib-delete="${sid}" data-tl-lib-name="${lib.section_name || sid}"`, _TL_TRASH, this._t('tlDelete'), { size: 24, tone: 'red' })}
          ${this._mtRoundBtn(`data-tl-lib-purge="${sid}" data-tl-lib-name="${lib.section_name || sid}"`, _TL_PURGE, this._t('tlPurgeHistory'), { size: 24, tone: 'red' })}
        </div>` : '';
        const mp = [];
        if (!mobHidden.has('plays'))      mp.push(`<span style="font-weight:600;flex-shrink:0">&#9654; ${lib.plays ?? 0}</span>`);
        if (!mobHidden.has('lastPlayed') && lib.last_played) mp.push(`<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lib.last_played}</span>`);
        if (!mobHidden.has('type')       && lib.section_type) mp.push(`<span style="text-transform:capitalize;color:var(--is-text-label)">${lib.section_type}</span>`);
        if (!mobHidden.has('parents')    && lib.parent_count != null) mp.push(`<span>${this._t('tlSeaAlb').replace('{n}', lib.parent_count)}</span>`);
        if (!mobHidden.has('children')   && lib.child_count  != null) mp.push(`<span>${this._t('tlEpTrk').replace('{n}', lib.child_count)}</span>`);
        if (!mobHidden.has('lastStream') && lib.last_accessed) mp.push(`<span>${this._tlFmtDate(lib.last_accessed)}</span>`);
        const ldAttr = !editMode ? ` data-tl-ld-open="${sid}" data-tl-ld-name="${this._escHtml(lib.section_name||'')}" style="cursor:pointer"` : '';
        return `<div class="tl-mob-card"${ldAttr}><div class="u-row-10">
          <div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:var(--is-row-hover)">${icon.replace(/width="\d+" height="\d+"/, 'width="16" height="16"')}</div>
          <div style="flex:1;min-width:0"><div class="tl-mob-name">${lib.section_name || '—'}</div>${mp.length ? `<div class="tl-mob-meta">${mp.join('')}</div>` : ''}</div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:15px;font-weight:700;color:rgba(250,180,50,0.9)">${lib.count ?? '—'}</div>
            ${lib.duration ? `<div class="u-sm-label">${this._tlFmtDuration(lib.duration)}</div>` : ''}
          </div>
        </div>${editBtns}</div>`;
      }).join('') || `<div class="u-empty">${this._t('tlNoLibraryData')}</div>`;
      return toolbar + `<div class="tl-libs-results-wrap" style="display:contents"><div>${cards}</div>${this._uiPager('tl-lpage', page, totalPages)}</div>`;
    }

    // ── Desktop table ─────────────────────────────────────────────────────────
    const editThHdr = editMode ? `<th style="white-space:nowrap;width:1px;padding-right:12px">${this._t('tlEdit')}</th>` : '';
    const thead = vis.map(c => _tlSortTh(c, sortCol, sortDir, 'tl-lib-sort')).join('');
    const rows  = sliced.map(lib => {
      const type = (lib.section_type || '').toLowerCase();
      const icon = this._tlLibSvgIcon(type, lib.section_name || '', 'md');
      const lAcc = lib.last_accessed ? this._tlFmtDate(lib.last_accessed) : `<span style="color:var(--is-text-muted)">${this._t('tlNever')}</span>`;
      const lPly = lib.last_played ? `<span style="font-size:11px;color:var(--is-text-sec)">${lib.last_played}</span>` : `<span style="color:var(--is-text-muted)">${this._t('tlNA')}</span>`;
      const cm = {
        name:       `<td style="max-width:150px"><span style="display:flex;align-items:center;min-width:0">${icon}<strong class="u-truncate">${lib.section_name || '—'}</strong></span></td>`,
        type:       `<td style="text-transform:capitalize;color:var(--is-text-label);white-space:nowrap">${lib.section_type || '—'}</td>`,
        count:      `<td style="text-align:right;color:rgba(250,180,50,0.9);font-weight:700">${lib.count ?? '—'}</td>`,
        parents:    `<td style="text-align:right">${lib.parent_count != null ? lib.parent_count : '—'}</td>`,
        children:   `<td style="text-align:right">${lib.child_count  != null ? lib.child_count  : '—'}</td>`,
        lastStream: `<td style="white-space:nowrap">${lAcc}</td>`,
        lastPlayed: `<td style="max-width:160px"><div class="u-truncate">${lPly}</div></td>`,
        plays:      `<td style="text-align:right;font-weight:700">${lib.plays ?? 0}</td>`,
        duration:   `<td style="text-align:right;white-space:nowrap">${lib.duration ? this._tlFmtDuration(lib.duration) : '—'}</td>`,
      };
      const sid      = lib.section_id || '';
      const editCell = editMode ? `<td style="white-space:nowrap;padding-right:12px"><div style="display:inline-flex;align-items:center;gap:4px">
        ${this._mtRoundBtn(`data-tl-lib-delete="${sid}" data-tl-lib-name="${lib.section_name || sid}"`, _TL_TRASH, this._t('tlDelete'), { size: 24, tone: 'red' })}
        ${this._mtRoundBtn(`data-tl-lib-purge="${sid}" data-tl-lib-name="${lib.section_name || sid}"`, _TL_PURGE, this._t('tlPurgeHistory'), { size: 24, tone: 'red' })}
      </div></td>` : '';
      const ldAttr = !editMode ? ` data-tl-ld-open="${sid}" data-tl-ld-name="${this._escHtml(lib.section_name||'')}" style="cursor:pointer"` : '';
      return `<tr${ldAttr}>${editCell}${vis.map(c => cm[c.key] || '<td>—</td>').join('')}</tr>`;
    }).join('');
    return toolbar + `<div class="tl-libs-results-wrap" style="display:contents"><div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>${editThHdr}${thead}</tr></thead><tbody>${rows || `<tr><td colspan="${vis.length}" class="u-empty">${this._t('tlNoLibraryData')}</td></tr>`}</tbody></table></div>${this._uiPager('tl-lpage', page, totalPages)}</div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Users
  // ──────────────────────────────────────────────────────────────────────────

  _tlIpReport() {
    const tl   = this._tautulli || {};
    const m    = this._tautulliModal || {};
    if (!tl.sharingDetected || tl.sharingAcked) return '';
    const open = m.ipReportOpen !== false;
    const threshold = this._config?.security?.ip_sharing_threshold ?? 2;
    const users = tl.sharingUsers || [];
    const report = tl.ipReport || {};

    const rows = users.map(name => {
      const ips = report[name] || [];
      const ipRows = ips.map(e => {
        const d = e.lastSeen ? new Date(e.lastSeen * 1000) : null;
        const dateStr = d ? d.toLocaleDateString(this._locale, { month:'short', day:'numeric', year:'numeric' }) : '—';
        return `<tr>
          <td style="padding:4px 8px;font-size:11px;font-family:monospace;color:var(--is-text)">${e.ip}</td>
          <td style="padding:4px 8px;font-size:11px;color:var(--is-text-muted)">${dateStr}</td>
          <td style="padding:4px 8px;font-size:11px;color:var(--is-text-muted);text-align:right">${e.count}</td>
        </tr>`;
      }).join('');
      return `<div style="margin-bottom:12px">
        <div style="font-size:12px;font-weight:700;color:rgba(255,150,150,0.9);margin-bottom:6px;display:flex;align-items:center;gap:6px">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          ${name}
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.08)">
              <th style="padding:3px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left">${this._t('tlColIPAddress')}</th>
              <th style="padding:3px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left">${this._t('tlColLastSeen')}</th>
              <th style="padding:3px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:right">${this._t('tlColPlays')}</th>
            </tr>
          </thead>
          <tbody>${ipRows}</tbody>
        </table>
      </div>`;
    }).join('');

    const chevron = open
      ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>`
      : `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;

    return `<div style="background:rgba(180,30,30,0.12);border:1px solid rgba(255,100,100,0.2);border-radius:8px;margin-bottom:10px;overflow:hidden">
      <div id="tl-ip-report-toggle" style="display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;user-select:none">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="rgba(255,150,150,0.9)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style="font-size:12px;font-weight:700;color:rgba(255,150,150,0.95);flex:1">${this._t('tlSharingDetected')} · ${users.length} user${users.length !== 1 ? 's' : ''} · ${threshold}+ unique IPs</span>
        <button class="tl-ack-btn" id="tl-ack-btn" style="font-size:10px;padding:3px 10px;margin-right:4px" onclick="event.stopPropagation()">${this._t('tlAcknowledge')}</button>
        ${chevron}
      </div>
      ${open ? `<div style="padding:0 12px 12px">${rows}</div>` : ''}
    </div>`;
  }

  _tlBodyUsers(data, total) {
    const isMobile  = this._isMob;
    const m         = this._tautulliModal || {};
    if (m.mediaDetailKey) return this._tlBodyMediaDetail();
    if (m.userDetailId)   return this._tlBodyUserDetail();
    const page      = m.usersPage || 0;
    const perPage   = this._tlCalcPerPage();
    const sortCol   = m.usersSortCol  || 'plays';
    const sortDir   = m.usersSortDir  || 'desc';
    const editMode  = m.usersEditMode || false;
    const search    = (m.usersSearch || '').toLowerCase().trim();
    const hidden    = this._tlHidden('usersHiddenCols',    ['username','fullname','email']);
    const mobHidden = this._tlHidden('usersMobHiddenCols', ['lastPlayed','platform','player','ip','username','email']);
    const filtered  = search
      ? (data || []).filter(u => [(u.friendly_name||''),(u.username||''),(u.email||'')].some(v => v.toLowerCase().includes(search)))
      : (data || []);
    const tot        = filtered.length;
    const totalPages = Math.max(1, Math.ceil(tot / perPage));

    const COLS = [
      { key:'user',       label:this._t('tlColUser'),        sort:'friendly_name', right:false },
      { key:'username',   label:this._t('tlColUsername'),    sort:'username',      right:false },
      { key:'fullname',   label:this._t('tlColFullName'),    sort:'full_name',     right:false },
      { key:'email',      label:this._t('tlColEmail'),       sort:'email',         right:false },
      { key:'lastSeen',   label:this._t('tlColLastStreamed'), sort:'last_seen',    right:false },
      { key:'ip',         label:this._t('tlColLastKnownIP'), sort:'ip_address',   right:false },
      { key:'platform',   label:this._t('tlColLastPlatform'), sort:'platform',    right:false },
      { key:'player',     label:this._t('tlColLastPlayer'),  sort:'player',       right:false },
      { key:'lastPlayed', label:this._t('tlColLastPlayed'),  sort:'last_played',  right:false },
      { key:'plays',      label:this._t('tlColTotalPlays'),  sort:'plays',        right:true  },
      { key:'duration',   label:this._t('tlColTotalDuration'), sort:'duration',   right:true  },
    ];
    const vis = COLS.filter(c => !hidden.has(c.key));

    // Sharing banner
    const tl2        = this._tautulli || {};
    const showBanner = tl2.sharingDetected && !tl2.sharingAcked;
    const wU         = tl2.sharingUsers || [];
    const banner     = ''; // replaced by _tlIpReport()

    // Desktop col-picker: all except 'user'
    const deskColItems = this._tlColItems(COLS.filter(c => c.key !== 'user'), hidden, 'data-tl-col');
    const deskColsBtn  = this._tlColsMenu('tl-users-cols-btn', 'tl-users-cols-menu', deskColItems, m.usersColsOpen);
    // Mobile col-picker
    const MOB_USR_COLS = [
      { key:'lastSeen',   label:this._t('tlColLastSeen') },
      { key:'lastPlayed', label:this._t('tlColLastPlayed') },
      { key:'platform',   label:this._t('tlColPlatform') },
      { key:'player',     label:this._t('tlColPlayer') },
      { key:'ip',         label:this._t('tlColLastIP') },
      { key:'username',   label:this._t('tlColUsername') },
      { key:'email',      label:this._t('tlColEmail') },
    ];
    const mobColItems = this._tlColItems(MOB_USR_COLS, mobHidden, 'data-tl-usr-mob-col');
    const mobColsBtn  = this._tlColsMenu('tl-users-mob-cols-btn', 'tl-users-mob-cols-menu', mobColItems, m.usersMobColsOpen);

    const editBtn   = this._tlEditBtn('tl-users-edit-btn', editMode);
    const colsBtn   = isMobile ? mobColsBtn : deskColsBtn;
    const ipReport  = this._tlIpReport();
    const toolbar   = `${ipReport}<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">${
      this._uiBar('tl-users-search', m.usersSearch || '', [], [{ html: editBtn }, { html: colsBtn }])}</div>`;

    // ── Mobile cards ──────────────────────────────────────────────────────────
    const page2   = Math.min(page, totalPages - 1);
    const sliced  = filtered.slice(page2 * perPage, (page2 + 1) * perPage);
    if (isMobile) {
      const warnUsers = wU;
      const cards = sliced.map(u => {
        const name  = u.friendly_name || u.username || '—';
        const thumb = u.user_thumb || '';
        const av    = thumb
          ? `<img src="${thumb}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid var(--is-divider)" loading="lazy" onerror="this.style.display='none'">`
          : `<span style="width:36px;height:36px;border-radius:50%;background:var(--is-btn-bg);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--is-text-muted);font-size:13px;font-weight:700">${(name[0] || '?').toUpperCase()}</span>`;
        const uid  = u.user_id || '';
        const kh   = u.keep_history != null ? Number(u.keep_history) : 1;
        const ag   = u.allow_guest  != null ? Number(u.allow_guest)  : 0;
        const editBtns = editMode ? `<div class="tl-mob-edit">
          ${this._mtRoundBtn(`data-tl-delete="${uid}" data-tl-name="${this._escHtml(name)}"`, _TL_TRASH, this._t('tlDelete'), { size: 24, tone: 'red' })}
          ${this._mtRoundBtn(`data-tl-purge="${uid}" data-tl-name="${this._escHtml(name)}"`, _TL_PURGE, this._t('tlPurgeHistory'), { size: 24, tone: 'red' })}
          <button class="tl-edit-btn tl-tog-btn${kh ? ' on' : ''}" data-tl-toggle-hist="${uid}" data-tl-kh="${kh}"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
          <button class="tl-edit-btn tl-tog-btn${ag ? ' on' : ''}" data-tl-toggle-guest="${uid}" data-tl-ag="${ag}"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></button>
        </div>` : '';
        const um = [];
        if (!mobHidden.has('lastSeen'))                         um.push(`<span>${u.last_seen ? this._tlFmtDate(u.last_seen) : this._t('tlNeverSeen')}</span>`);
        if (!mobHidden.has('lastPlayed') && u.last_played)     um.push(`<span style="display:inline-flex;align-items:center;gap:3px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._tlMediaIcon(u.media_type,13)}<span style="overflow:hidden;text-overflow:ellipsis">${this._escHtml(u.last_played)}</span></span>`);
        if (!mobHidden.has('platform') && u.platform)          um.push(`<span>${this._escHtml(u.platform)}</span>`);
        if (!mobHidden.has('player')   && u.player)            um.push(`<span>${this._escHtml(u.player)}</span>`);
        if (!mobHidden.has('ip')       && u.ip_address)        um.push(`<span style="font-family:monospace;font-size:10px">${this._escHtml(u.ip_address)}</span>`);
        if (!mobHidden.has('username') && u.username)          um.push(`<span style="color:var(--is-text-label)">${this._escHtml(u.username)}</span>`);
        if (!mobHidden.has('email')    && u.email)             um.push(`<span style="color:var(--is-text-label);font-size:10px">${this._escHtml(u.email)}</span>`);
        return `<div class="tl-mob-card" data-tl-ud-open="${uid}" data-tl-ud-name="${this._escHtml(name)}" data-tl-ud-thumb="${thumb}" style="cursor:pointer"><div class="u-row-10">
          ${av}
          <div style="flex:1;min-width:0"><div class="tl-mob-name">${this._escHtml(name)}</div>${um.length ? `<div class="tl-mob-meta">${um.join('')}</div>` : ''}</div>
          <div style="text-align:right;flex-shrink:0">
            <div style="color:rgba(250,180,50,0.9);font-weight:700">&#9654; ${u.plays ?? 0}</div>
            <div class="u-sm-label">${u.duration ? this._tlFmtDuration(u.duration) : '—'}</div>
          </div>
        </div>${editBtns}</div>`;
      }).join('') || `<div class="u-empty">${this._t('tlNoUserData')}</div>`;
      return toolbar + `<div class="tl-users-results-wrap" style="display:contents"><div>${cards}</div>${this._uiPager('tl-upage', page, totalPages)}</div>`;
    }

    // ── Desktop table ─────────────────────────────────────────────────────────
    const warnUsers = wU;
    const editThHdr = editMode ? `<th style="white-space:nowrap;width:1px;padding-right:12px">${this._t('tlEdit')}</th>` : '';
    const thead = vis.map(c => _tlSortTh(c, sortCol, sortDir, 'tl-sort')).join('');
    const rows  = sliced.map(u => {
      const name  = u.friendly_name || u.username || '—';
      const isW   = warnUsers.includes(name) || warnUsers.includes(u.username);
      const thumb = u.user_thumb || '';
      const av    = thumb
        ? `<img src="${thumb}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid var(--is-divider)" loading="lazy" onerror="this.style.display='none'">`
        : `<span style="width:30px;height:30px;border-radius:50%;background:var(--is-btn-bg);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--is-text-muted);font-size:12px;font-weight:700">${(name[0] || '?').toUpperCase()}</span>`;
      const mIco = u.last_played ? this._tlMediaIcon(u.media_type) : '';
      const cm = {
        user:       `<td><div class="u-row-8">${av}<span style="font-weight:600">${this._escHtml(name)}</span></div></td>`,
        username:   `<td style="color:var(--is-text-label)">${this._escHtml(u.username || '—')}</td>`,
        fullname:   `<td style="color:var(--is-text-label)">${this._escHtml(u.full_name || '—')}</td>`,
        email:      `<td style="color:var(--is-text-label);font-size:11px">${this._escHtml(u.email || '—')}</td>`,
        lastSeen:   `<td>${u.last_seen ? this._tlFmtDate(u.last_seen) : `<span style="color:var(--is-text-muted)">${this._t('tlNever')}</span>`}</td>`,
        ip:         `<td style="font-family:monospace;font-size:11px">${this._escHtml(u.ip_address || this._t('tlNA'))}</td>`,
        platform:   `<td>${this._escHtml(u.platform || this._t('tlNA'))}</td>`,
        player:     `<td>${u.player ? `<span style="display:inline-flex;align-items:center;gap:5px"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="color:var(--is-text-muted)" stroke="none"><circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="1.5"/><polygon points="10 8 17 12 10 16"/></svg>${this._escHtml(u.player)}</span>` : `<span style="color:var(--is-text-muted)">${this._t('tlNA')}</span>`}</td>`,
        lastPlayed: `<td style="max-width:160px"><div style="display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.last_played ? mIco + '<span style="overflow:hidden;text-overflow:ellipsis">' + this._escHtml(u.last_played) + '</span>' : '<span style="color:var(--is-text-muted)">n/a</span>'}</div></td>`,
        plays:      `<td style="text-align:right;color:rgba(250,180,50,0.9);font-weight:700">${u.plays ?? 0}</td>`,
        duration:   `<td style="text-align:right">${u.duration ? this._tlFmtDuration(u.duration) : '—'}</td>`,
      };
      const uid = u.user_id || '';
      const kh  = u.keep_history != null ? Number(u.keep_history) : 1;
      const ag  = u.allow_guest  != null ? Number(u.allow_guest)  : 0;
      const editCell = editMode ? `<td style="white-space:nowrap;padding-right:12px"><div style="display:inline-flex;align-items:center;gap:4px">
        ${this._mtRoundBtn(`data-tl-delete="${uid}" data-tl-name="${this._escHtml(name)}"`, _TL_TRASH, this._t('tlDelete'), { size: 24, tone: 'red' })}
        ${this._mtRoundBtn(`data-tl-purge="${uid}" data-tl-name="${this._escHtml(name)}"`, _TL_PURGE, this._t('tlPurgeHistory'), { size: 24, tone: 'red' })}
        <button class="tl-edit-btn tl-tog-btn${kh ? ' on' : ''}" data-tl-toggle-hist="${uid}" data-tl-kh="${kh}" title="${kh ? this._t('pwDisable') : this._t('pwEnable')} history"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
        <button class="tl-edit-btn tl-tog-btn${ag ? ' on' : ''}" data-tl-toggle-guest="${uid}" data-tl-ag="${ag}" title="${ag ? this._t('pwDisable') : this._t('pwEnable')} guest"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></button>
      </div></td>` : '';
      return `<tr${isW ? ' class="tl-row-warn"' : ''} data-tl-ud-open="${uid}" data-tl-ud-name="${this._escHtml(name)}" data-tl-ud-thumb="${thumb}" style="cursor:pointer">${editCell}${vis.map(c => cm[c.key] || '<td>—</td>').join('')}</tr>`;
    }).join('');
    return toolbar + `<div class="tl-users-results-wrap" style="display:contents"><div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>${editThHdr}${thead}</tr></thead><tbody>${rows || `<tr><td colspan="${vis.length}" class="u-empty">${this._t('tlNoUserData')}</td></tr>`}</tbody></table></div>${this._uiPager('tl-upage', page, totalPages)}</div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Refetch
  // ──────────────────────────────────────────────────────────────────────────

  async _tlRefetchLibraries(body) {
    const m = this._tautulliModal;
    if (!m) return;
    body.innerHTML = `<div class="u-empty-lg">${this._t('loading')}</div>`;
    const pp    = this._tlCalcPerPage();
    const start = (m.libsPage || 0) * pp;
    const r = await this._tlApiFetch('get_libraries_table', `length=${pp}&start=${start}&order_column=${m.libsSortCol||'plays'}&order_dir=${m.libsSortDir||'desc'}`);
    if (!this._tautulliModal) return;
    m.libsData  = r?.response?.data?.data || [];
    m.libsTotal = r?.response?.data?.recordsFiltered || r?.response?.data?.recordsTotal || m.libsData.length;
    body.innerHTML = this._tlBodyLibraries(m.libsData, m.libsTotal);
    this._wireTautulliModalBody(body);
  }

  async _tlRefetchUsers(body) {
    const m = this._tautulliModal;
    if (!m) return;
    body.innerHTML = '<div class="u-empty-lg">' + this._t('loading') + '</div>';
    const pp    = this._tlCalcPerPage();
    const start = (m.usersPage || 0) * pp;
    const r = await this._tlApiFetch('get_users_table', `length=${pp}&start=${start}&order_column=${m.usersSortCol||'plays'}&order_dir=${m.usersSortDir||'desc'}`);
    if (!this._tautulliModal) return;
    m.usersData  = r?.response?.data?.data || [];
    m.usersTotal = r?.response?.data?.recordsFiltered || r?.response?.data?.recordsTotal || m.usersData.length;
    body.innerHTML = this._tlBodyUsers(m.usersData, m.usersTotal);
    this._wireTautulliModalBody(body);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // History
  // ──────────────────────────────────────────────────────────────────────────

  _tlBodyHistory() {
    const m = this._tautulliModal;
    if (!m) return '';
    if (m.histLoading) return `<div class="u-empty-lg">${this._t('loading')}</div>`;
    const isMob    = this._isMob;
    const page     = m.histPage || 0;
    const perPage  = this._tlCalcPerPage({ hasFilter: true });
    const tot      = m.histTotal    || 0;
    const data     = m.histData     || [];
    const media    = m.histMedia    || null;
    const playback = m.histPlayback || null;
    // One action per row, so no mode gates it: the trash sits in the row and
    // asks for confirmation there. m.histDelId marks the armed row.
    const _TRASH_S = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
    const _CHECK_S = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg>`;
    const _CROSS_S = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const _rowDel = rid => (m.histDelId === String(rid))
      ? `<span style="display:inline-flex;gap:4px">
           ${this._mtRoundBtn(`data-tl-hist-delete-yes="${rid}"`, _CHECK_S, this._t('tlDelete'), { size: 24, tone: 'red' })}
           ${this._mtRoundBtn('data-tl-hist-delete-no', _CROSS_S, this._t('cancel'), { size: 24, tone: 'blue' })}
         </span>`
      : this._mtRoundBtn(`data-tl-hist-delete="${rid}"`, _TRASH_S, this._t('tlDelete'), { size: 24, tone: 'red' });
    const users    = m.histUsers    || [];
    const selUser  = m.histUser     || '';
    const hidden    = this._tlHidden('histHiddenCols',    ['ip','paused','stopped']);
    const mobHidden = this._tlHidden('histMobHiddenCols', ['ip','platform','product','player','paused','stopped']);
    const totalPages = Math.max(1, Math.ceil(tot / perPage));

    const HIST_COLS = [
      { key:'date',     label:this._t('tlColDate'),     right:false },
      { key:'user',     label:this._t('tlColUser'),     right:false },
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

    // Filter bar — one capsule: search, three pickers, then the actions. The
    // media and playback filters used to be seven toggle buttons on their own
    // row; each set is one choice at a time, which is what a picker is for.
    const MOB_HIST_PICKER = [
      { key:'platform', label:this._t('tlColPlatform') },
      { key:'player',   label:this._t('tlColPlayer') },
      { key:'started',  label:this._t('tlColStarted') },
      { key:'duration', label:this._t('tlColDuration') },
      { key:'ip',       label:this._t('tlColIP') },
      { key:'paused',   label:this._t('tlColPaused') },
      { key:'stopped',  label:this._t('tlColStopped') },
    ];
    const colsBtn = isMob
      ? this._tlColsMenu('tl-hist-mob-cols-btn', 'tl-hist-mob-cols-menu', this._tlColItems(MOB_HIST_PICKER, mobHidden, 'data-tl-hist-mob-col'), m.histMobColsOpen)
      : this._tlColsMenu('tl-hist-cols-btn',     'tl-hist-cols-menu',     this._tlColItems(HIST_COLS.filter(c => c.key !== 'title'), hidden, 'data-tl-hist-col'), m.histColsOpen);

    const toolbar = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">${
      this._uiBar('tl-hist-search', m.histSearch || '', [
        { id: 'tl-hist-user-sel', kind: 'relgroup', value: selUser || '', neutral: '',
          items: [['', this._t('tlAllUsers')], ...(users || []).map(u => [u.user_id ?? '', u.friendly_name || u.user || '?'])] },
        { id: 'tl-hist-media', kind: 'source', value: media || '', neutral: '',
          items: [['', this._t('tlAllMedia')], ['movie', this._t('tlFilterMovies')], ['episode', this._t('tlFilterTvShows')], ['track', this._t('tlFilterMusic')], ['live', this._t('tlFilterLiveTV')]] },
        { id: 'tl-hist-play', kind: 'protocol', value: playback || '', neutral: '',
          items: [['', this._t('tlAllPlayback')], ['direct play', this._t('tlFilterDirectPlay')], ['direct stream', this._t('tlFilterDirectStream')], ['transcode', this._t('tlFilterTranscode')]] },
      ], [
        { html: colsBtn },
      ])}</div>`;

    // Watched circle helper — 5 levels (0=empty,1=¼,2=½,3=¾,4=full)
    const _wRing = '<circle cx="7" cy="7" r="5.5" fill="none" style="stroke:var(--is-text-muted)" stroke-width="1.5"/>';
    const _wSvg  = inner => `<svg width="14" height="14" viewBox="0 0 14 14">${inner}</svg>`;
    const _wArc  = d => `<path d="${d}" style="fill:var(--is-text-body)"/>`;
    const watchSvg = ws =>
      ws === 4 ? _wSvg('<circle cx="7" cy="7" r="5.5" style="fill:var(--is-text-body)"/>') :
      ws === 3 ? _wSvg(`${_wRing}${_wArc('M7,7 L7,1.5 A5.5,5.5 0,1,1 1.5,7 Z')}`) :
      ws === 2 ? _wSvg(`${_wRing}${_wArc('M7,7 L7,1.5 A5.5,5.5 0,0,1 7,12.5 Z')}`) :
      ws === 1 ? _wSvg(`${_wRing}${_wArc('M7,7 L7,1.5 A5.5,5.5 0,0,1 12.5,7 Z')}`) :
                 _wSvg(_wRing);

    if (!data.length) {
      return toolbar + `<div class="tl-hist-results-wrap" style="display:contents"><div class="u-empty">${this._t('tlNoHistory')}</div></div>`;
    }

    // ── Mobile cards ────────────────────────────────────────────────────────
    if (isMob) {
      const cards = data.map(h => {
        const icon  = this._tlMediaIcon(h.media_type || '', 15);
        const title = this._escHtml(h.full_title || h.title || '—');
        const user  = this._escHtml(h.friendly_name || h.user || '—');
        const ago   = h.date ? this._tlFmtDate(h.date) : '—';
        const dur   = h.duration ? this._tlFmtDuration(h.duration) : '—';
        const pct   = h.percent_complete ?? 0;
        const ws    = pct >= 85 ? 4 : pct >= 63 ? 3 : pct >= 38 ? 2 : pct >= 10 ? 1 : 0;
        const mp    = [];
        if (!mobHidden.has('platform') && h.platform)      mp.push(this._escHtml(h.platform));
        if (!mobHidden.has('player')   && h.player)        mp.push(this._escHtml(h.player));
        if (!mobHidden.has('started')  && h.started)       mp.push(this._tlFmtTime(h.started));
        if (!mobHidden.has('ip')       && h.ip_address)    mp.push(h.ip_address);
        if (!mobHidden.has('paused')   && h.paused_counter) mp.push(this._t('tlColPaused') + ' ' + this._tlFmtDuration(h.paused_counter));
        const meta   = `<div class="tl-mob-meta"><span>${user}</span><span style="color:var(--is-text-muted)"> &middot; </span><span>${ago}</span>${mp.map(v => `<span style="color:var(--is-text-muted)"> &middot; </span><span>${v}</span>`).join('')}</div>`;
        const delEl  = `<div style="margin-top:6px;display:flex;justify-content:flex-end">${_rowDel(h.row_id)}</div>`;
        return `<div class="tl-mob-card"><div class="u-row-10"><div style="flex:1;min-width:0"><div class="tl-mob-name u-row-4">${icon}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${title}</span></div>${meta}</div><div style="text-align:right;flex-shrink:0"><div style="font-size:13px;font-weight:600;color:var(--is-text)">${dur}</div><div style="margin-top:2px;display:flex;justify-content:flex-end">${watchSvg(ws)}</div></div></div>${delEl}</div>`;
      }).join('');
      return toolbar + `<div class="tl-hist-results-wrap" style="display:contents"><div>${cards}</div>${this._uiPager('tl-hpage', page, totalPages)}</div>`;
    }

    // ── Desktop table ────────────────────────────────────────────────────────
    const vis   = HIST_COLS.filter(c => !hidden.has(c.key));
    const thead = vis.map(c => `<th style="${c.right ? 'text-align:right;' : ''}white-space:nowrap">${c.label}</th>`).join('') + '<th></th>';
    const delHdr = '<th style="width:1px"></th>';
    const rows  = data.map(h => {
      const icon = this._tlMediaIcon(h.media_type || '', 15);
      const pct  = h.percent_complete ?? 0;
      const ws   = pct >= 85 ? 4 : pct >= 63 ? 3 : pct >= 38 ? 2 : pct >= 10 ? 1 : 0;
      const rid  = h.row_id || '';
      const esc  = s => this._escHtml(s || '');
      const cm = {
        date:     `<td style="white-space:nowrap;font-size:11px;color:var(--is-text-label)">${h.date ? this._tlFmtDate(h.date) : '—'}</td>`,
        user:     `<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(h.friendly_name || h.user)}</td>`,
        ip:       `<td style="white-space:nowrap;font-size:11px;color:var(--is-text-label)">${h.ip_address || '—'}</td>`,
        platform: `<td style="white-space:nowrap;color:var(--is-text-label)">${esc(h.platform)}</td>`,
        product:  `<td style="white-space:nowrap;color:var(--is-text-label)">${esc(h.product)}</td>`,
        player:   `<td style="white-space:nowrap;color:var(--is-text-label)">${esc(h.player)}</td>`,
        title:    `<td style="max-width:240px"><div style="display:flex;align-items:center;gap:5px;min-width:0">${icon}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1" title="${esc(h.full_title || h.title)}">${esc(h.full_title || h.title)}</span></div></td>`,
        started:  `<td class="u-nowrap-sm">${h.started ? this._tlFmtTime(h.started) : '—'}</td>`,
        paused:   `<td style="text-align:right;white-space:nowrap;font-size:11px">${h.paused_counter ? this._tlFmtDuration(h.paused_counter) : '0m'}</td>`,
        stopped:  `<td class="u-nowrap-sm">${h.stopped ? this._tlFmtTime(h.stopped) : '—'}</td>`,
        duration: `<td style="text-align:right;white-space:nowrap;font-weight:600">${h.duration ? this._tlFmtDuration(h.duration) : '—'}</td>`,
      };
      const watchCell = `<td style="text-align:right;padding-right:8px;white-space:nowrap">${watchSvg(ws)}</td>`;
      const delCell   = `<td style="padding:0 4px;white-space:nowrap">${_rowDel(rid)}</td>`;
      return `<tr>${vis.map(c => cm[c.key] || '<td>—</td>').join('')}${watchCell}${delCell}</tr>`;
    }).join('');
    return toolbar + `<div class="tl-hist-results-wrap" style="display:contents"><div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>${thead}${delHdr}</tr></thead><tbody>${rows || `<tr><td colspan="${vis.length + 2}" class="u-empty">${this._t('tlNoHistory')}</td></tr>`}</tbody></table></div>${this._uiPager('tl-hpage', page, totalPages)}</div>`;
  }

  async _tlRefetchHistory(body) {
    const m = this._tautulliModal;
    if (!m) return;
    // Patch only the results subtree — leaves #tl-hist-search untouched so the iOS keyboard
    // stays open while typing (recreating the input node closes it).
    const resultsWrap = body.querySelector('.tl-hist-results-wrap');
    if (resultsWrap) resultsWrap.innerHTML = `<div class="u-empty-lg">${this._t('loading')}</div>`;
    else body.innerHTML = `<div class="u-empty-lg">${this._t('loading')}</div>`;
    const data = await this._tlFetchHistory(m.histPage, m.histUser, m.histMedia, m.histPlayback, this._tlCalcPerPage({ hasFilter: true }), m.histSearch);
    if (!this._tautulliModal) return;
    m.histData  = data.data || [];
    m.histTotal = data.recordsFiltered || 0;
    this._patchResultsWrap(body, 'tl-hist-results-wrap', () => this._tlBodyHistory());
    this._wireTautulliModalBody(body);
  }

}

export const tautulliTableMixin = _TautulliTableMethods.prototype;
