// ──────────────────────────────────────────────────────────────────────────
// Jellystat — table renderers: Libraries + Users + History (read-only)
// ──────────────────────────────────────────────────────────────────────────

const _jsSortTh = (c, sortCol, sortDir, dataAttr) =>
  '<th data-' + dataAttr + '="' + c.sort + '" style="' + (c.right ? 'text-align:right;' : '') + 'cursor:pointer;user-select:none">'
  + '<span style="white-space:nowrap">' + c.label + ' <span style="opacity:' + (c.sort === sortCol ? 1 : 0.3) + ';font-size:9px">' + (c.sort === sortCol ? (sortDir === 'asc' ? '&#8593;' : '&#8595;') : '&#8597;') + '</span></span></th>';

class _JellystatTableMethods {

  // ──────────────────────────────────────────────────────────────────────────
  // Libraries
  // ──────────────────────────────────────────────────────────────────────────

  _jsBodyLibraries() {
    const isMob   = this._isMob;
    const m       = this._jellystatModal || {};
    const page    = m.libsPage  || 0;
    const perPage = this._tlCalcPerPage();
    const sortCol = m.libsSortCol || 'plays';
    const sortDir = m.libsSortDir || 'desc';
    const search  = (m.libsSearch || '').toLowerCase().trim();
    const data    = m.libsData || [];

    // Detect optional columns
    const hasSeasons   = data.some(l => l.Season_Count > 0);
    const hasEpisodes  = data.some(l => l.Episode_Count > 0);
    const hasStreamed   = data.some(l => l.LastActivity);
    const hasLastPlayed= data.some(l => l.ItemName);

    const defaultHidden = new Set();
    if (!hasSeasons)    defaultHidden.add('seasons');
    if (!hasEpisodes)   defaultHidden.add('episodes');
    if (!hasStreamed)   defaultHidden.add('streamed');
    if (!hasLastPlayed) defaultHidden.add('lastPlayed');

    const hidden = this._jsHidden('libsHiddenCols', [...defaultHidden]);
    const mobH   = this._jsHidden('libsMobHiddenCols', ['seasons', 'episodes', 'streamed', 'lastPlayed', 'duration']);

    // Format PostgreSQL interval ("3 days 02:15:30") → "3d ago"
    const fmtInterval = iv => {
      if (!iv) return null;
      const s = String(iv);
      const dayM = s.match(/^(\d+)\s+days?/);
      const days = dayM ? parseInt(dayM[1]) : 0;
      const timeM = s.match(/(\d+):(\d+):/);
      const hours = timeM ? parseInt(timeM[1]) : 0;
      const mins  = timeM ? parseInt(timeM[2]) : 0;
      const totalH = days * 24 + hours;
      if (totalH >= 48) return Math.floor(totalH / 24) + 'd ago';
      if (totalH >= 1)  return totalH + 'h ago';
      if (mins  >= 1)   return mins + 'm ago';
      return 'just now';
    };

    const filtered = search ? data.filter(l => (l.Name || '').toLowerCase().includes(search)) : data;
    const sorted   = filtered.slice().sort((a, b) => {
      let av, bv;
      if      (sortCol === 'plays')     { av = Number(a.Plays) || 0;          bv = Number(b.Plays) || 0; }
      else if (sortCol === 'duration')  { av = a.total_playback_duration || 0; bv = b.total_playback_duration || 0; }
      else if (sortCol === 'count')     { av = a.Library_Count || 0;           bv = b.Library_Count || 0; }
      else if (sortCol === 'seasons')   { av = a.Season_Count  || 0;           bv = b.Season_Count  || 0; }
      else if (sortCol === 'episodes')  { av = a.Episode_Count || 0;           bv = b.Episode_Count || 0; }
      else if (sortCol === 'lastPlayed'){ av = (a.ItemName || '').toLowerCase(); bv = (b.ItemName || '').toLowerCase(); }
      else                              { av = (a.Name || '').toLowerCase();   bv = (b.Name || '').toLowerCase(); }
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    const tot        = sorted.length;
    const totalPages = Math.max(1, Math.ceil(tot / perPage));
    const page2      = Math.min(page, totalPages - 1);
    const sliced     = sorted.slice(page2 * perPage, (page2 + 1) * perPage);

    const COLS = [
      { key:'name',      label:this._t('tlColLibrary'),          sort:'name',      right:false },
      { key:'count',     label:this._t('tlColItems'),             sort:'count',     right:true  },
      { key:'seasons',   label:this._t('jsSeasonsAlbums'),  sort:'seasons',   right:true  },
      { key:'episodes',  label:this._t('jsEpisodesTracks'), sort:'episodes',  right:true  },
      { key:'streamed',  label:this._t('tlColStreamed'),           sort:'streamed',  right:false },
      { key:'lastPlayed',label:this._t('tlColLastPlayed'),        sort:'lastPlayed',right:false },
      { key:'plays',     label:this._t('qaStatsPlays'),              sort:'plays',     right:true  },
      { key:'duration',  label:this._t('tlColDuration'),           sort:'duration',  right:true  },
    ];
    const vis = COLS.filter(c => !hidden.has(c.key));

    const deskColItems = this._tlColItems(COLS.filter(c => c.key !== 'name'), hidden, 'data-js-lib-col');
    const deskColsBtn  = this._tlColsMenu('js-libs-cols-btn', 'js-libs-cols-menu', deskColItems, m.libsColsOpen);
    const MOB_LIB_COLS = [
      { key:'seasons',    label:this._t('tlColSeasonsAlbums')   },
      { key:'episodes',   label:this._t('tlColEpisodesTracks')  },
      { key:'streamed',   label:this._t('tlColStreamed')         },
      { key:'lastPlayed', label:this._t('tlColLastPlayed')      },
      { key:'duration',   label:this._t('tlColDuration')         },
    ];
    const mobColItems = this._tlColItems(MOB_LIB_COLS, mobH, 'data-js-lib-mob-col');
    const mobColsBtn  = this._tlColsMenu('js-libs-mob-cols-btn', 'js-libs-mob-cols-menu', mobColItems, m.libsMobColsOpen);
    const colsBtn     = isMob ? mobColsBtn : deskColsBtn;
    const toolbar = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">'
      + this._uiBar('js-libs-search', m.libsSearch || '', [], [{ html: colsBtn }]) + '</div>';

    // The library's collection type also tells us what its last-played item was
    const _mediaIcoType = lib => {
      const t = _libIcon(lib);
      return t === 'movie' ? 'movie' : t === 'show' ? 'episode' : t === 'artist' ? 'track' : 'generic';
    };

    const _libIcon = lib => {
      const ct = (lib.CollectionType || lib.Type || '').toLowerCase();
      const t  = ct.includes('movie') ? 'movie' : ct.includes('tv') || ct.includes('show') ? 'show' : ct.includes('music') || ct.includes('audio') ? 'artist' : ct;
      return t;
    };

    if (isMob) {
      const cards = sliced.map(lib => {
        const icon  = this._tlLibSvgIcon(_libIcon(lib), lib.Name || '', 'sm');
        const plays = Number(lib.Plays) || 0;
        const dur   = lib.total_playback_duration ? this._tlFmtDuration(lib.total_playback_duration) : null;
        const mp    = [];
        if (!mobH.has('streamed')   && lib.LastActivity) mp.push('<span>' + (fmtInterval(lib.LastActivity) || '&#x2014;') + '</span>');
        if (!mobH.has('seasons')    && lib.Season_Count  > 0) mp.push('<span style="color:var(--is-text-label)">' + lib.Season_Count + ' seasons</span>');
        if (!mobH.has('episodes')   && lib.Episode_Count > 0) mp.push('<span style="color:var(--is-text-label)">' + lib.Episode_Count + ' episodes</span>');
        if (!mobH.has('lastPlayed') && lib.ItemName)     mp.push('<span style="display:inline-flex;align-items:center;gap:4px;color:var(--is-text-muted)">' + this._tlMediaIcon(_mediaIcoType(lib), 13) + lib.ItemName + '</span>');
        if (!mobH.has('duration')   && dur)              mp.push('<span style="color:var(--is-text-label)">' + dur + '</span>');
        return '<div class="tl-mob-card"><div class="u-row-10">'
          + '<div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:var(--is-row-hover)">' + icon.replace(/width="\d+" height="\d+"/, 'width="16" height="16"') + '</div>'
          + '<div style="flex:1;min-width:0"><div class="tl-mob-name">' + (lib.Name || '&#x2014;') + '</div>' + (mp.length ? '<div class="tl-mob-meta">' + mp.join('<span style="color:var(--is-text-muted)"> &middot; </span>') + '</div>' : '') + '</div>'
          + '<div style="text-align:right;flex-shrink:0"><div style="font-size:15px;font-weight:700;color:rgba(250,180,50,0.9)">' + (lib.Library_Count ?? '&#x2014;') + '</div><div class="u-sm-label">&#9654; ' + plays + '</div></div>'
          + '</div></div>';
      }).join('') || '<div class="u-empty">' + this._t('tlNoLibraryData') + '</div>';
      return toolbar + '<div class="js-libs-results-wrap" style="display:contents"><div>' + cards + '</div>' + this._uiPager('js-lpage', page2, totalPages, true) + '</div>';
    }

    const thead = vis.map(c => _jsSortTh(c, sortCol, sortDir, 'js-lib-sort')).join('');
    const rows  = sliced.map(lib => {
      const icon = this._tlLibSvgIcon(_libIcon(lib), lib.Name || '', 'md');
      const dur  = lib.total_playback_duration ? this._tlFmtDuration(lib.total_playback_duration) : '&#x2014;';
      const streamedStr = fmtInterval(lib.LastActivity);
      const cm = {
        name:      '<td style="max-width:180px"><span style="display:flex;align-items:center;min-width:0">' + icon + '<strong class="u-truncate">' + (lib.Name || '&#x2014;') + '</strong></span></td>',
        count:     '<td style="text-align:right;color:rgba(250,180,50,0.9);font-weight:700">' + (lib.Library_Count ?? '&#x2014;') + '</td>',
        seasons:   '<td style="text-align:right;color:var(--is-text-label)">' + (lib.Season_Count  > 0 ? lib.Season_Count  : '&#x2014;') + '</td>',
        episodes:  '<td style="text-align:right;color:var(--is-text-label)">' + (lib.Episode_Count > 0 ? lib.Episode_Count : '&#x2014;') + '</td>',
        streamed:  '<td class="u-nowrap-sm">' + (streamedStr || '<span style="color:var(--is-text-muted)">never</span>') + '</td>',
        lastPlayed:'<td style="max-width:200px"><div style="display:flex;align-items:center;gap:7px;min-width:0;color:var(--is-text-label)">' + (lib.ItemName ? this._tlMediaIcon(_mediaIcoType(lib), 15) + '<span class="u-truncate">' + lib.ItemName + '</span>' : '<span style="color:var(--is-text-muted)">n/a</span>') + '</div></td>',
        plays:     '<td style="text-align:right;color:rgba(250,180,50,0.9);font-weight:700">' + (Number(lib.Plays) || 0) + '</td>',
        duration:  '<td style="text-align:right">' + dur + '</td>',
      };
      return '<tr>' + vis.map(c => cm[c.key] || '<td>&#x2014;</td>').join('') + '</tr>';
    }).join('');
    return toolbar
      + '<div class="js-libs-results-wrap" style="display:contents">'
      + '<div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>' + thead + '</tr></thead><tbody>'
      + (rows || '<tr><td colspan="' + vis.length + '" class="u-empty">' + this._t('tlNoLibraryData') + '</td></tr>')
      + '</tbody></table></div>'
      + this._uiPager('js-lpage', page2, totalPages, true)
      + '</div>';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Users
  // ──────────────────────────────────────────────────────────────────────────

  _jsBodyUsers() {
    const isMob   = this._isMob;
    const m       = this._jellystatModal || {};
    const page    = m.usersPage || 0;
    const perPage = this._tlCalcPerPage();
    const sortCol = m.usersSortCol || 'plays';
    const sortDir = m.usersSortDir || 'desc';
    const search  = (m.usersSearch || '').toLowerCase().trim();
    const data    = m.usersData || [];

    // Detect which optional columns have any data at all
    const hasStreamed   = data.some(u => u.LastActivityDate);
    const hasClient     = data.some(u => u.LastClient);
    const hasLastPlayed = data.some(u => u.LastWatched);

    const defaultHidden = new Set(['player']);
    if (!hasClient) { defaultHidden.add('platform'); defaultHidden.add('player'); }
    if (!hasStreamed)   defaultHidden.add('lastStreamed');
    if (!hasLastPlayed) defaultHidden.add('lastPlayed');

    const hidden = this._jsHidden('usersHiddenCols', [...defaultHidden]);
    const mobH   = this._jsHidden('usersMobHiddenCols', ['lastStreamed', 'platform', 'player', 'lastPlayed']);

    const splitClient = raw => {
      if (!raw) return ['', ''];
      const idx = raw.indexOf(' - ');
      return idx >= 0 ? [raw.slice(0, idx), raw.slice(idx + 3)] : [raw, ''];
    };

    const filtered = search
      ? data.filter(u => (u.UserName || u.Name || '').toLowerCase().includes(search)
          || (u.LastWatched || '').toLowerCase().includes(search))
      : data;
    const sorted = filtered.slice().sort((a, b) => {
      let av, bv;
      if      (sortCol === 'plays')        { av = a.TotalPlays ?? 0; bv = b.TotalPlays ?? 0; }
      else if (sortCol === 'duration')     { av = a.TotalWatchTime ?? 0; bv = b.TotalWatchTime ?? 0; }
      else if (sortCol === 'lastStreamed') { av = a.LastActivityDate || ''; bv = b.LastActivityDate || ''; }
      else if (sortCol === 'lastPlayed')   { av = (a.LastWatched || '').toLowerCase(); bv = (b.LastWatched || '').toLowerCase(); }
      else if (sortCol === 'platform')    { av = splitClient(a.LastClient)[0].toLowerCase(); bv = splitClient(b.LastClient)[0].toLowerCase(); }
      else                                { av = (a.UserName || a.Name || '').toLowerCase(); bv = (b.UserName || b.Name || '').toLowerCase(); }
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    const tot        = sorted.length;
    const totalPages = Math.max(1, Math.ceil(tot / perPage));
    const page2      = Math.min(page, totalPages - 1);
    const sliced     = sorted.slice(page2 * perPage, (page2 + 1) * perPage);

    const COLS = [
      { key:'user',        label:this._t('tlColUser'),           sort:'user',        right:false },
      { key:'lastStreamed',label:this._t('tlColLastStreamed'),   sort:'lastStreamed', right:false },
      { key:'platform',    label:this._t('tlColPlatform'),        sort:'platform',    right:false },
      { key:'player',      label:this._t('tlColPlayer'),          sort:'player',      right:false },
      { key:'lastPlayed',  label:this._t('tlColLastPlayed'),     sort:'lastPlayed',  right:false },
      { key:'plays',       label:this._t('tlColTotalPlays'),     sort:'plays',       right:true  },
      { key:'duration',    label:this._t('tlColTotalDuration'),  sort:'duration',    right:true  },
    ];
    const vis = COLS.filter(c => !hidden.has(c.key));

    const deskColItems = this._tlColItems(COLS.filter(c => c.key !== 'user'), hidden, 'data-js-usr-col');
    const deskColsBtn  = this._tlColsMenu('js-users-cols-btn', 'js-users-cols-menu', deskColItems, m.usersColsOpen);
    const MOB_USR_COLS = [
      { key:'lastStreamed', label:this._t('tlColLastStreamed') },
      { key:'platform',    label:this._t('tlColPlatform')      },
      { key:'player',      label:this._t('tlColPlayer')        },
      { key:'lastPlayed',  label:this._t('tlColLastPlayed')   },
    ];
    const mobColItems = this._tlColItems(MOB_USR_COLS, mobH, 'data-js-usr-mob-col');
    const mobColsBtn  = this._tlColsMenu('js-users-mob-cols-btn', 'js-users-mob-cols-menu', mobColItems, m.usersMobColsOpen);
    const colsBtn     = isMob ? mobColsBtn : deskColsBtn;
    const toolbar = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">'
      + this._uiBar('js-users-search', m.usersSearch || '', [], [{ html: colsBtn }]) + '</div>';

    if (isMob) {
      const cards = sliced.map(u => {
        const name = u.UserName || u.Name || '&#x2014;';
        const plays = u.TotalPlays ?? 0;
        const dur   = u.TotalWatchTime ? this._tlFmtDuration(u.TotalWatchTime) : '&#x2014;';
        const [platform, player] = splitClient(u.LastClient);
        const mp = [];
        if (!mobH.has('lastStreamed') && u.LastActivityDate) mp.push('<span>' + this._tlFmtDate(u.LastActivityDate) + '</span>');
        if (!mobH.has('platform') && platform) mp.push('<span style="color:var(--is-text-label)">' + platform + '</span>');
        if (!mobH.has('player')   && player)   mp.push('<span style="color:var(--is-text-label)">' + player + '</span>');
        if (!mobH.has('lastPlayed') && u.LastWatched) mp.push('<span style="display:inline-flex;align-items:center;gap:4px;color:var(--is-text-muted)">' + this._tlMediaIcon('generic', 13) + u.LastWatched + '</span>');
        const av = '<span style="width:36px;height:36px;border-radius:50%;background:var(--is-btn-bg);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--is-text-muted);font-size:13px;font-weight:700">' + ((name[0] || '?').toUpperCase()) + '</span>';
        return '<div class="tl-mob-card"><div class="u-row-10">' + av
          + '<div style="flex:1;min-width:0"><div class="tl-mob-name">' + name + '</div>' + (mp.length ? '<div class="tl-mob-meta">' + mp.join('<span style="color:var(--is-text-muted)"> &middot; </span>') + '</div>' : '') + '</div>'
          + '<div style="text-align:right;flex-shrink:0"><div style="color:rgba(250,180,50,0.9);font-weight:700">&#9654; ' + plays + '</div><div class="u-sm-label">' + dur + '</div></div>'
          + '</div></div>';
      }).join('') || '<div class="u-empty">' + this._t('tlNoUserData') + '</div>';
      return toolbar + '<div class="js-users-results-wrap" style="display:contents"><div>' + cards + '</div>' + this._uiPager('js-upage', page2, totalPages, true) + '</div>';
    }

    const thead = vis.map(c => _jsSortTh(c, sortCol, sortDir, 'js-sort')).join('');
    const rows  = sliced.map(u => {
      const name = u.UserName || u.Name || '&#x2014;';
      const av   = '<span style="width:30px;height:30px;border-radius:50%;background:var(--is-btn-bg);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--is-text-muted);font-size:12px;font-weight:700">' + ((name[0] || '?').toUpperCase()) + '</span>';
      const dur  = u.TotalWatchTime ? this._tlFmtDuration(u.TotalWatchTime) : '&#x2014;';
      const [platform, player] = splitClient(u.LastClient);
      const cm = {
        user:        '<td><div class="u-row-8">' + av + '<span style="font-weight:600">' + name + '</span></div></td>',
        lastStreamed:'<td class="u-nowrap-sm">' + (u.LastActivityDate ? this._tlFmtDate(u.LastActivityDate) : '<span style="color:var(--is-text-muted)">never</span>') + '</td>',
        platform:    '<td style="color:var(--is-text-label)">' + (platform || '&#x2014;') + '</td>',
        player:      '<td style="color:var(--is-text-label)">' + (player   || '&#x2014;') + '</td>',
        lastPlayed:  '<td style="max-width:200px"><div style="display:flex;align-items:center;gap:7px;min-width:0">' + (u.LastWatched ? this._tlMediaIcon('generic', 15) + '<span class="u-truncate">' + u.LastWatched + '</span>' : '&#x2014;') + '</div></td>',
        plays:       '<td style="text-align:right;color:rgba(250,180,50,0.9);font-weight:700">' + (u.TotalPlays ?? 0) + '</td>',
        duration:    '<td style="text-align:right">' + dur + '</td>',
      };
      return '<tr>' + vis.map(c => cm[c.key] || '<td>&#x2014;</td>').join('') + '</tr>';
    }).join('');
    return toolbar
      + '<div class="js-users-results-wrap" style="display:contents">'
      + '<div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>' + thead + '</tr></thead><tbody>'
      + (rows || '<tr><td colspan="' + vis.length + '" class="u-empty">' + this._t('tlNoUserData') + '</td></tr>')
      + '</tbody></table></div>'
      + this._uiPager('js-upage', page2, totalPages, true)
      + '</div>';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // History
  // ──────────────────────────────────────────────────────────────────────────

  _jsBodyHistory() {
    const m = this._jellystatModal;
    if (!m) return '';
    if (m.histLoading) return '<div class="u-empty-lg">' + this._t('loading') + '</div>';
    const isMob      = this._isMob;
    const page       = m.histPage || 0;
    const perPage    = this._tlCalcPerPage({ hasFilter: true });
    const tot        = m.histTotal || 0;
    const data       = m.histData  || [];
    const users      = m.histUsers || [];
    const selUser    = m.histUser  || '';
    const selMethod  = m.histPlayMethod || '';
    const hidden     = this._jsHidden('histHiddenCols',    ['product', 'player', 'ip']);
    const mobH       = this._jsHidden('histMobHiddenCols', ['product', 'player', 'started', 'ip']);
    const totalPages = Math.max(1, Math.ceil(tot / perPage));

    const HIST_COLS = [
      { key:'date',    label:this._t('tlColDate')     },
      { key:'user',    label:this._t('tlColUser')     },
      { key:'product', label:this._t('tlColProduct')  },
      { key:'player',  label:this._t('tlColPlayer')   },
      { key:'title',   label:this._t('tlColTitle')    },
      { key:'started', label:this._t('tlColStarted'), right:true },
      { key:'duration',label:this._t('tlColDuration'),right:true },
      { key:'ip',      label:'IP',      right:false },
    ];
    const vis = HIST_COLS.filter(c => !hidden.has(c.key));

    // Four toggle buttons became a picker: only one playback method can be in
    // force at a time, which is what a dropdown says.
    const userItems = [['', this._t('tlAllUsers')], ...(users || []).map(u => {
      const name = u.UserName || u.Name || u.UserId || '';
      return [name, name];
    })];
    const pmItems = [['', this._t('tlAllPlayback')], ['DirectPlay', this._t('tlFilterDirectPlay')], ['DirectStream', this._t('tlFilterDirectStream')], ['Transcode', this._t('tlFilterTranscode')]];

    const colsBtn = isMob
      ? this._tlColsMenu('js-hist-mob-cols-btn', 'js-hist-mob-cols-menu',
          this._tlColItems([{key:'product',label:this._t('tlColProduct')},{key:'player',label:this._t('tlColPlayer')},{key:'started',label:this._t('tlColStarted')},{key:'ip',label:'IP'}], mobH, 'data-js-hist-mob-col'),
          m.histMobColsOpen)
      : this._tlColsMenu('js-hist-cols-btn', 'js-hist-cols-menu',
          this._tlColItems(HIST_COLS.filter(c => c.key !== 'title'), hidden, 'data-js-hist-col'),
          m.histColsOpen);

    const toolbar = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">'
      + this._uiBar('js-hist-search', m.histSearch || '', [
          { id: 'js-hist-user-sel', kind: 'relgroup', value: selUser || '', neutral: '', items: userItems },
          { id: 'js-hist-pm',       kind: 'protocol', value: selMethod || '', neutral: '', items: pmItems },
        ], [{ html: colsBtn }]) + '</div>';

    if (!data.length) {
      return toolbar + '<div class="js-hist-results-wrap" style="display:contents"><div class="u-empty">' + this._t('tlNoHistory') + '</div></div>';
    }

    const _fmtStarted = ts => {
      if (!ts) return '—';
      try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return '—'; }
    };
    const _ico = h => this._tlMediaIcon(h.SeriesName ? 'episode' : 'movie', 15);
    const _titleHtml = h => {
      const item = h.NowPlayingItemName || '—';
      if (!h.SeriesName) return item;
      const ep = (h.SeasonNumber != null && h.EpisodeNumber != null)
        ? ' S' + String(h.SeasonNumber).padStart(2,'0') + 'E' + String(h.EpisodeNumber).padStart(2,'0') + ' '
        : ' – ';
      return '<span style="color:var(--is-text-muted)">' + h.SeriesName + ep + '</span>' + item;
    };

    if (isMob) {
      const cards = data.map(h => {
        const dur  = h.PlaybackDuration ? this._tlFmtDuration(h.PlaybackDuration) : '—';
        const ago  = h.ActivityDateInserted ? this._tlFmtDate(h.ActivityDateInserted) : '—';
        const mp   = ['<span>' + (h.UserName || '—') + '</span>', '<span>' + ago + '</span>'];
        if (!mobH.has('product') && h.Client)     mp.push('<span style="color:var(--is-text-label)">' + h.Client + '</span>');
        if (!mobH.has('player')  && h.DeviceName) mp.push('<span style="color:var(--is-text-label)">' + h.DeviceName + '</span>');
        if (!mobH.has('started')) mp.push('<span style="color:var(--is-text-muted)">' + _fmtStarted(h.ActivityDateInserted) + '</span>');
        return '<div class="tl-mob-card"><div class="u-row-10">'
          + '<div style="flex:1;min-width:0"><div class="tl-mob-name" style="display:flex;align-items:center;gap:6px;min-width:0">' + this._tlMediaIcon(h.SeriesName ? 'episode' : 'movie', 13) + '<span class="u-truncate">' + _titleHtml(h) + '</span></div>'
          + '<div class="tl-mob-meta">' + mp.join('<span style="color:var(--is-text-muted)"> &middot; </span>') + '</div></div>'
          + '<div style="text-align:right;flex-shrink:0;font-weight:600">' + dur + '</div></div></div>';
      }).join('');
      return toolbar + '<div class="js-hist-results-wrap" style="display:contents"><div>' + cards + '</div>' + this._uiPager('js-hpage', page, totalPages, true) + '</div>';
    }

    const thead = vis.map(c => '<th style="' + (c.right ? 'text-align:right;' : '') + 'white-space:nowrap">' + c.label + '</th>').join('');
    const rows  = data.map(h => {
      const cm = {
        date:    '<td style="white-space:nowrap;font-size:11px;color:var(--is-text-label)">' + (h.ActivityDateInserted ? this._tlFmtDate(h.ActivityDateInserted) : '—') + '</td>',
        user:    '<td style="max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600">' + (h.UserName || '—') + '</td>',
        product: '<td style="color:var(--is-text-label);white-space:nowrap">' + (h.Client || '—') + '</td>',
        player:  '<td style="color:var(--is-text-label);white-space:nowrap">' + (h.DeviceName || '—') + '</td>',
        title:   '<td style="max-width:260px"><div style="display:flex;align-items:center;gap:7px;min-width:0">' + _ico(h) + '<span class="u-truncate">' + _titleHtml(h) + '</span></div></td>',
        started: '<td style="text-align:right;white-space:nowrap;color:var(--is-text-label);font-size:12px">' + _fmtStarted(h.ActivityDateInserted) + '</td>',
        duration:'<td style="text-align:right;white-space:nowrap;font-weight:600">' + (h.PlaybackDuration ? this._tlFmtDuration(h.PlaybackDuration) : '—') + '</td>',
        ip:      '<td style="font-family:monospace;font-size:11px;color:var(--is-text-muted)">' + (h.RemoteEndPoint || '—') + '</td>',
      };
      return '<tr>' + vis.map(c => cm[c.key] || '<td>—</td>').join('') + '</tr>';
    }).join('');
    return toolbar
      + '<div class="js-hist-results-wrap" style="display:contents">'
      + '<div style="overflow-x:auto"><table class="tl-users-table"><thead><tr>' + thead + '</tr></thead><tbody>'
      + (rows || '<tr><td colspan="' + vis.length + '" class="u-empty">' + this._t('tlNoHistory') + '</td></tr>')
      + '</tbody></table></div>'
      + this._uiPager('js-hpage', page, totalPages, true)
      + '</div>';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Refetch helpers
  // ──────────────────────────────────────────────────────────────────────────

  async _jsRefetchHistory(body) {
    const m = this._jellystatModal;
    if (!m) return;
    // Patch only the results subtree when it already exists — keeps #js-hist-search
    // untouched so the iOS keyboard stays open while typing.
    const resultsWrap = body.querySelector('.js-hist-results-wrap');
    if (resultsWrap) resultsWrap.innerHTML = '<div class="u-empty-lg">' + this._t('loading') + '</div>';
    else body.innerHTML = '<div class="u-empty-lg">' + this._t('loading') + '</div>';
    const perPage = this._tlCalcPerPage({ hasFilter: true });
    const filters = [];
    if (m.histUser)       filters.push({ field: 'UserName',   value: m.histUser.toLowerCase() });
    if (m.histPlayMethod) filters.push({ field: 'PlayMethod', value: m.histPlayMethod.toLowerCase() });
    let endpoint = 'getHistory?page=' + ((m.histPage || 0) + 1) + '&size=' + perPage;
    if (m.histSearch) endpoint += '&search=' + encodeURIComponent(m.histSearch);
    if (filters.length)   endpoint += '&filters=' + encodeURIComponent(JSON.stringify(filters));
    const raw = await this._jsApiFetch(endpoint);
    if (!this._jellystatModal) return;
    m.histData  = raw?.results || (Array.isArray(raw) ? raw : []);
    m.histTotal = raw?.pages != null ? raw.pages * perPage : (raw?.totalCount ?? m.histData.length);
    this._patchResultsWrap(body, 'js-hist-results-wrap', () => this._jsBodyHistory());
    this._wireJellystatModalBody(body);
  }
}

export const jellystatTableMixin = _JellystatTableMethods.prototype;
