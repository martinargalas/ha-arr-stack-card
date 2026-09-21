// Maintainerr, the Collections tab: the collections, one collection's media, exclusions and info. Split out of render/maintainerr.js.
import { fmtBytes } from '../shared/format.js';

class _MaintainerrCollectionsRenderMethods {

  // ── Collections tab ───────────────────────────────────────────────────────

  _mtCollectionsTabHtml() {
    const m = this._maintainerrModal;
    if (!m) return '';

    if (m.colDetail) {
      const sub = m.colSubTab || 'media';
      if (sub === 'exclusions') return this._mtCollectionExclusionsHtml();
      if (sub === 'info') return this._mtCollectionInfoHtml();
      return this._mtCollectionDetailHtml();
    }

    const cols   = this._maintainerr?.collections || [];
    const rules  = this._maintainerr?.rules || [];
    const search = (m.colSearch || '').toLowerCase();
    const filterLib = m.colFilterLib || 'all';

    // Build rule→collection mapping for library/mediaType lookup
    const ruleMap = new Map();
    rules.forEach(r => { if (r.collection) ruleMap.set(r.collection.id ?? r.id, r); });

    const view = m.colView || 'cards';
    const _segIcoC = this._mtSegIcons;
    const viewSeg = this._mtSegmented('data-mt-col-view-seg', [
      { v: 'cards', label: this._t('mtViewCards'), icon: _segIcoC.cards },
      { v: 'table', label: this._t('mtViewTable'), icon: _segIcoC.table },
    ], view, { icons: true, animatePrev: !!m._animColView });

    let filtered = cols;
    if (search) filtered = filtered.filter(c => ((c.title || c.name || '')).toLowerCase().includes(search));
    if (filterLib !== 'all') {
      filtered = filtered.filter(c => {
        const rule = this._mtFindRuleForCol(c, rules);
        return rule && String(rule.libraryId) === filterLib;
      });
    }

    // Library filter options
    const libs = new Map();
    cols.forEach(c => {
      const rule = this._mtFindRuleForCol(c, rules);
      if (rule?.libraryId != null) libs.set(String(rule.libraryId), this._mtLibName(rule.libraryId));
    });
    const libItems = [['all', this._t('mtAllLibs')], ...libs];

    const toolbar = `<div style="margin-bottom:${this._mtToolbarGap}px">${this._mtToolbar('mt-col-search', m.colSearch, [
      { id: 'mt-col-filter-lib', items: libItems, value: filterLib, neutral: 'all' },
    ])}</div>`;

    // Day mode lightens the poster scrim instead of darkening it, so every
    // colour on the card has to flip with it.
    const _day = this._isDay;
    const _labelSt = `font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:${_day ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)'};margin-bottom:2px`;
    const _txt = _day ? '#000' : '#fff';

    // Measured page size, same as the rules list
    const PAGE = m.colPerPage || 12;
    const total = filtered.length;
    const pages = Math.ceil(total / PAGE) || 1;
    m.colPages = pages;
    const page = Math.min(m.colPage || 0, pages - 1);
    const slice = filtered.slice(page * PAGE, (page + 1) * PAGE);

    const cards = view === 'table' ? '' : slice.map(c => {
      // /collections truncates media[] to two rows, so it under-reports badly —
      // a 34-item collection was showing ITEMS 2. mediaCount is the real figure.
      const cnt    = Number(c.mediaCount ?? (c.media || []).length) || 0;
      const delDays = c.deleteAfterDays != null ? `After ${Number(c.deleteAfterDays) || 0}d` : '—';
      const name   = c.title || c.name || '—';
      const rule   = this._mtFindRuleForCol(c, rules);
      const libName = rule ? this._mtLibName(rule.libraryId) : '—';
      const mediaType = rule ? (rule.dataType || 'movie') : '—';
      const mediaLabel = { movie: 'Movie', show: 'Show', season: 'Seasons', episode: 'Episode' }[mediaType] || mediaType;
      const isActive = rule ? rule.isActive : true;
      const statusLabel = isActive ? this._t('mtActive') : this._t('mtInactive');
      const statusColor = isActive
        ? (this._isDay ? 'rgba(5,150,105,0.95)' : 'rgba(52,211,153,0.85)')
        : (this._isDay ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)');

      // Poster mosaic background — up to 4 posters side by side, heavily dimmed
      // The mosaic puts these inside a CSS url(), where an apostrophe or a
      // bracket would end the string — so only plain web addresses are kept.
      const posterUrls = (c.media || [])
        .map(mi => mi.image_path || mi.plexData?.thumb || '')
        .filter(u => !/['"()\\]/.test(String(u)))
        .map(u => this._imgSrc(u))
        .filter(Boolean)
        .slice(0, 4);
      const mosaic = posterUrls.length
        ? `<div style="position:absolute;inset:0;display:flex;z-index:0;pointer-events:none">
             ${posterUrls.map(u => `<div style="flex:1;min-width:0;background:url('${u}') center/cover no-repeat"></div>`).join('')}
           </div>
           <div style="position:absolute;inset:0;z-index:1;pointer-events:none;background:${_day
             ? 'linear-gradient(180deg,rgba(255,255,255,0.84) 0%,rgba(255,255,255,0.92) 100%)'
             : 'linear-gradient(180deg,rgba(20,20,24,0.86) 0%,rgba(16,16,20,0.94) 100%)'}"></div>`
        : '';
      // Over a mosaic the text needs to lift off the artwork; on a plain card
      // there is nothing to lift off and a halo would just look smudged.
      const _sh = posterUrls.length
        ? (_day ? 'text-shadow:0 1px 3px rgba(255,255,255,0.95)' : 'text-shadow:0 1px 4px rgba(0,0,0,0.5)')
        : '';
      const bgStyle = 'background:var(--is-btn-bg)';

      // Size from media items
      // The list endpoint returns collections with an empty `media` array, so the
      // per-item sum was always 0 — the total is on the collection itself.
      const totalSize = c.totalSizeBytes
        || (c.media || []).reduce((s, mi) => s + (mi.plexData?.size || mi.sizeBytes || mi.size || 0), 0);
      const sizeStr = totalSize > 0 ? fmtBytes(totalSize) : 'N/A';

      return `<div class="mt-col-card" data-mt-col-detail="${this._escHtml(c.id)}" style="${bgStyle};border:1px solid var(--is-card-bdr);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;cursor:pointer;min-height:160px;position:relative;overflow:hidden;transition:transform .15s">
        ${mosaic}
        <div style="position:relative;z-index:2;font-size:13px;font-weight:700;color:${_txt};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${_sh}">${this._escHtml(name)}</div>
        <div style="position:relative;z-index:2;margin-top:auto;display:grid;grid-template-columns:1fr auto 1fr;gap:4px 12px;font-size:11px;${_sh}">
          <div><div style="${_labelSt}">LIBRARY</div><div style="color:${_txt};font-weight:600">${this._escHtml(libName)}</div></div>
          <div><div style="${_labelSt}">MEDIA TYPE</div><div style="color:${_txt};font-weight:600">${this._escHtml(mediaLabel)}</div></div>
          <div style="text-align:right"><div style="${_labelSt}">ITEMS</div><div style="color:${_txt};font-weight:600">${cnt}</div></div>
          <div><div style="${_labelSt}">SIZE</div><div style="color:${_txt};font-weight:600">${sizeStr}</div></div>
          <div><div style="${_labelSt}">DELETE</div><div style="color:${_txt};font-weight:600">${delDays}</div></div>
          <div style="text-align:right"><div style="${_labelSt}">STATUS</div><div style="color:${statusColor};font-weight:600">${statusLabel}</div></div>
        </div>
      </div>`;
    }).join('');

    const empty = filtered.length === 0 ? `<div class="u-empty-dim" style="padding:20px 0">${this._t('mtNoCollections')}</div>` : '';
    const body = view === 'table'
      ? this._mtCollectionsTableHtml(slice, rules)
      : (cards ? `<div id="mt-rules-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;align-content:start">${cards}</div>` : '');

    const paging = this._uiPager('mt-col-page', page, pages, true);
    // Paging stays centred on the full width; the switch is taken out of flow
    // in its corner so it cannot pull it off centre. On a phone the switch and
    // the chevrons shrink (see #mt-rules-foot in the stylesheet) so the two
    // still clear each other.
    const footer = `<div id="mt-rules-foot" style="position:relative;display:flex;align-items:center;justify-content:center;min-height:44px;flex-shrink:0">
      ${paging}
      <div style="position:absolute;left:0;top:50%;transform:translateY(-50%)">${viewSeg}</div>
    </div>`;

    return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden">
      <div style="flex-shrink:0">${toolbar}</div>
      <div id="mt-rules-wrap" style="flex:1;min-height:0;overflow-y:auto">${body || empty}</div>
      ${footer}
    </div>`;
  }

  // Table counterpart of the collection cards
  _mtCollectionsTableHtml(cols, rules) {
    const isMob = this._isMob;
    const rows = cols.map(c => {
      const rule = this._mtFindRuleForCol(c, rules);
      const name = c.title || c.name || '—';
      const libName = this._mtLibName(rule?.libraryId ?? c.libraryId);
      const type = rule?.dataType || c.type || 'movie';
      const mediaLabel = { movie: 'Movie', show: 'Show', season: 'Seasons', episode: 'Episode' }[type] || type;
      const cnt = Number(c.mediaCount ?? (c.media || []).length) || 0;
      const size = c.totalSizeBytes ? fmtBytes(c.totalSizeBytes) : 'N/A';
      const active = c.isActive !== false;
      const statusColor = active ? 'rgba(52,211,153,0.85)' : 'rgba(255,255,255,0.4)';
      const statusLabel = active ? this._t('mtActive') : this._t('mtInactive');

      if (isMob) {
        return `<div data-mt-col-detail="${this._escHtml(c.id)}" style="display:flex;align-items:center;gap:8px;padding:8px 4px;border-bottom:1px solid var(--is-divider,rgba(255,255,255,0.07));cursor:pointer">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(name)}</div>
            <div style="font-size:10px;color:var(--is-text-muted);margin-top:2px">${this._escHtml(libName)} · ${cnt} · <span style="color:${statusColor}">${statusLabel}</span></div>
          </div>
        </div>`;
      }

      return `<tr data-mt-col-detail="${this._escHtml(c.id)}" style="cursor:pointer">
        <td><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(name)}</div></td>
        <td>${this._escHtml(libName)}</td>
        <td>${this._escHtml(mediaLabel)}</td>
        <td style="text-align:center">${cnt}</td>
        <td style="text-align:right">${size}</td>
        <td style="color:${statusColor}">${statusLabel}</td>
      </tr>`;
    }).join('');

    if (isMob) return `<div>${rows}</div>`;

    const _th = 'user-select:none;white-space:nowrap';
    return `<table class="tl-users-table lib-table" style="width:100%;table-layout:fixed">
      <thead><tr>
        <th style="${_th};width:auto">${this._t('mtRuleName')}</th>
        <th style="${_th};width:130px">${this._t('mtLibrary')}</th>
        <th style="${_th};width:100px">${this._t('mtMediaType')}</th>
        <th style="${_th};width:70px;text-align:center">${this._t('mtTotalItems')}</th>
        <th style="${_th};width:90px;text-align:right">${this._t('mtSize')}</th>
        <th style="${_th};width:90px">${this._t('mtStatus')}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  _mtFindRuleForCol(col, rules) {
    return rules.find(r => r.collection?.id === col.id || r.id === col.ruleGroupId || r.id === col.ruleGroup?.id) || null;
  }

  _mtCollectionDetailHtml() {
    const m = this._maintainerrModal;
    const cd = m.colDetail;
    if (!cd) return '';

    const items = cd.items || [];
    const search = (cd.search || '').toLowerCase();
    const page = cd.page || 0;
    const sort = cd.sort || 'default';

    let filtered = items;
    if (search) filtered = filtered.filter(i => ((i.mediaData?.title || i.title || i.name || '')).toLowerCase().includes(search));

    const isMob = this._isMob;
    const { cols, perPage, gap, gridMaxW } = this._mtGridCalc(cd, 90);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const safePage = Math.min(page, totalPages - 1);
    const pageItems = filtered.slice(safePage * perPage, (safePage + 1) * perPage);


    const sortItems = [
      ['deleteSoonest-asc','Going first'],
      ['deleteSoonest-desc','Going last'],
      ['title-asc','Title A–Z'],
      ['title-desc','Title Z–A'],
      ['airDate-desc','Newest first'],
      ['airDate-asc','Oldest first'],
      ['rating-desc','Highest rated'],
      ['rating-asc','Lowest rated'],
      ['watchCount-desc','Most watched'],
      ['watchCount-asc','Least watched'],
    ];

    const delDays = cd.deleteAfterDays;
    const mediaType = cd.mediaType || 'movie';

    const header = '';

    const toolbar = `<div style="margin-bottom:${this._mtToolbarGap}px">${this._mtToolbar('mt-col-d-search', cd.search || '', [
      { id: 'mt-col-d-sort', items: sortItems, value: sort },
    ])}</div>`;

    const _rnd = (bdr, bg) => `width:34px;height:34px;padding:0;border-radius:50%;border:1px solid ${bdr};background:${bg};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:0;backdrop-filter:blur(8px)`;
    const EXCL_ICO = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:block"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;

    const CHECK_ICO = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg>`;
    const CROSS_ICO = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    const posters = pageItems.map(item => {
      const itemId = this._escHtml(item.mediaServerId || item.id || '');
      const excluded = cd.excludedIds?.has?.(String(itemId));
      const confirming = cd.confirmExclude === String(itemId);

      let overlay = '', actions = '';
      if (excluded) {
        overlay = `<div style="position:absolute;inset:0;z-index:5;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center">
          ${this._uiBadge(this._t('mtExcluded'), 'green', { extra: 'padding:4px 14px;font-size:11px' })}
        </div>`;
      } else if (confirming) {
        overlay = `<div style="position:absolute;inset:0;z-index:5;background:rgba(0,0,0,0.75);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
          <span style="font-size:11px;font-weight:600;color:#fff">${this._t('mtExcludeQ')}</span>
          <div style="display:flex;gap:10px">
            <button data-mt-exclude-confirm="${itemId}" title="${this._t('mtYes')}" style="${_rnd('rgba(52,211,153,0.55)', 'rgba(52,211,153,0.32)')}">${CHECK_ICO}</button>
            <button data-mt-exclude-cancel="${itemId}" title="${this._t('mtNo')}" style="${_rnd('rgba(248,113,113,0.55)', 'rgba(248,113,113,0.32)')}">${CROSS_ICO}</button>
          </div>
        </div>`;
      } else {
        actions = `<div style="position:absolute;bottom:8px;right:8px;z-index:5">
          <button data-mt-exclude="${itemId}" title="${this._t('mtExcludeMedia')}" style="${_rnd('rgba(52,211,153,0.50)', 'rgba(52,211,153,0.28)')}">${EXCL_ICO}</button>
        </div>`;
      }

      return this._mtOvPosterCard(item, {
        compact: cols >= 8,
        dueMs: this._mtDueMs(item.addDate, delDays),
        type: mediaType,
        fallbackPoster: item.image_path || item.plexData?.thumb || '',
        excluded, overlay, actions,
        popup: !confirming && !excluded,
      });
    }).join('');

    const grid = `<div id="mt-poster-grid" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap}px;overflow:hidden${gridMaxW ? `;max-width:${gridMaxW}px;margin:0 auto` : ''}">${posters}</div>`;
    const pagHtml = this._uiPager('mt-col-d-page', safePage, totalPages, true);
    const dragHandle = this._mtDragHandleHtml(cd, isMob);
    const pagWrap = (pagHtml || dragHandle)
      ? `<div id="mt-pag-wrap" style="flex-shrink:0;position:relative;${dragHandle && !pagHtml ? 'height:36px' : ''}">${pagHtml}${dragHandle}</div>`
      : '';

    return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden">` +
      `<div style="flex-shrink:0">${header}${toolbar}</div>` +
      `<div style="flex:1;min-height:0;overflow:hidden">${grid}</div>` +
      pagWrap +
      `</div>`;
  }

  // ── Collection sub-tabs: Exclusions + Info ─────────────────────────────────

  _mtCollectionExclusionsHtml() {
    const m = this._maintainerrModal;
    const cd = m?.colDetail;
    if (!cd) return '';

    const excl = cd.exclusionItems || [];
    const exclSort = cd.exclSort || 'excluded-desc';

    const sortItems = [
      ['excluded-desc','Recently excluded'],
      ['title-asc','Title A–Z'],
      ['title-desc','Title Z–A'],
      ['airDate-desc','Newest first'],
      ['airDate-asc','Oldest first'],
      ['rating-desc','Highest rated'],
      ['rating-asc','Lowest rated'],
      ['watchCount-desc','Most watched'],
      ['watchCount-asc','Least watched'],
    ];

    const exclSearch = cd.exclSearch || '';

    const toolbar = `<div style="margin-bottom:${this._mtToolbarGap}px">${this._mtToolbar('mt-col-excl-search', exclSearch, [
      { id: 'mt-col-excl-sort', items: sortItems, value: exclSort },
    ])}</div>`;

    const isMob = this._isMob;

    let filteredExcl = excl;
    if (exclSearch) filteredExcl = filteredExcl.filter(i => ((i.title || i.name || '')).toLowerCase().includes(exclSearch.toLowerCase()));

    if (!filteredExcl.length) return `${toolbar}<div class="u-empty-dim">${this._t('mtNoExclusions')}</div>`;

    const mediaType = cd.mediaType || 'movie';

    const { cols, perPage, gap, gridMaxW } = this._mtGridCalc(cd, 48);

    const exclPage = cd.exclPage || 0;
    const totalPages = Math.max(1, Math.ceil(filteredExcl.length / perPage));
    const safePage = Math.min(exclPage, totalPages - 1);
    const pageItems = filteredExcl.slice(safePage * perPage, (safePage + 1) * perPage);

    const _rnd = (bdr, bg) => `width:34px;height:34px;padding:0;border-radius:50%;border:1px solid ${bdr};background:${bg};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:0;backdrop-filter:blur(8px)`;
    const UNDO_ICO = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/></svg>`;

    const posters = pageItems.map(item => {
      const exclId = item.id;
      const actions = `<div style="position:absolute;bottom:8px;right:8px;z-index:5">
        <button data-mt-unexclude="${exclId}" title="${this._t('mtRemoveExclusion')}" style="${_rnd('rgba(248,113,113,0.50)', 'rgba(248,113,113,0.28)')}">${UNDO_ICO}</button>
      </div>`;
      return this._mtOvPosterCard(item, {
        compact: cols >= 8,
        dueMs: null,
        type: item.type || mediaType,
        fallbackPoster: item.image_path || '',
        excluded: true,
        actions,
      });
    }).join('');

    const grid = `<div id="mt-poster-grid" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap}px;overflow:hidden${gridMaxW ? `;max-width:${gridMaxW}px;margin:0 auto` : ''}">${posters}</div>`;
    const pagHtml = this._uiPager('mt-col-excl-page', safePage, totalPages, true);
    const dragHandle = this._mtDragHandleHtml(cd, isMob);
    const pagWrap = (pagHtml || dragHandle)
      ? `<div id="mt-pag-wrap" style="flex-shrink:0;position:relative;${dragHandle && !pagHtml ? 'height:36px' : ''}">${pagHtml}${dragHandle}</div>`
      : '';

    return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden">` +
      `<div style="flex-shrink:0">${toolbar}</div>` +
      `<div style="flex:1;min-height:0;overflow:hidden">${grid}</div>` +
      pagWrap +
      `</div>`;
  }

  _mtCollectionInfoHtml() {
    const m = this._maintainerrModal;
    const cd = m?.colDetail;
    if (!cd) return '';

    const col = (this._maintainerr?.collections || []).find(c => c.id === cd.id);
    const lg = cd.logs || {};

    const _stat = (label, val) => `<div>
      <div style="font-size:12px;font-weight:700;color:var(--is-text);margin-bottom:3px">${label}</div>
      <div style="font-size:12px;color:var(--is-text-muted)">${val}</div>
    </div>`;

    const added = col?.addDate ? new Date(col.addDate).toLocaleDateString() : '—';
    const dur = col?.lastDurationInSeconds != null ? `${Number(col.lastDurationInSeconds) || 0} ${this._t('mtSeconds')}` : '—';
    const stats = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      ${_stat(this._t('mtDateAdded'), added)}
      ${_stat(this._t('mtHandledItems'), Number(col?.handledMediaAmount) || 0)}
      ${_stat(this._t('mtLastDuration'), dur)}
    </div>`;

    const sortItems = [['DESC', this._t('mtDescending')], ['ASC', this._t('mtAscending')]];
    // ECollectionLogType: 0 COLLECTION, 1 MEDIA, 2 RULES
    const filterItems = [['', this._t('mtAllTypes')], ['0', 'Collection'], ['1', 'Media'], ['2', 'Rules']];

    const toolbar = `<div style="margin-bottom:10px">${this._mtToolbar('mt-log-search', lg.search || '', [
      { id: 'mt-log-sort', items: sortItems, value: lg.sort || 'DESC' },
      { id: 'mt-log-filter', items: filterItems, value: String(lg.filter ?? ''), neutral: '' },
    ])}</div>`;

    let body;
    if (lg.loading) {
      body = `<div class="is-loading"><span>${this._t('loading')}</span></div>`;
    } else if (!(lg.items || []).length) {
      body = `<div class="u-empty-dim" style="padding:20px 0">${this._t('mtNoLogs')}</div>`;
    } else {
      const TYPE_TONE = { 0: 'blue', 1: 'amber', 2: 'green' };
      const TYPE_LBL = { 0: 'COLLECTION', 1: 'MEDIA', 2: 'RULES' };
      const _badge = t => this._uiBadge(TYPE_LBL[t] || '—', TYPE_TONE[t] || 'blue', { extra: 'letter-spacing:0.03em' });
      const _when = it => {
        const ts = new Date(it.timestamp);
        return `${ts.toLocaleDateString()}, ${ts.toLocaleTimeString()}`;
      };

      if (this._isMob) {
        // Three columns cannot hold a timestamp, a label and a sentence on a
        // phone — the message column ended up clipped to nothing. Stacked
        // instead, with the message free to wrap onto a second line.
        body = `<div class="mt-log-list">${lg.items.map(it => `
          <div class="mt-log-row">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              ${_badge(it.type)}
              <span style="font-size:10px;color:var(--is-text-muted);white-space:nowrap">${this._escHtml(_when(it))}</span>
            </div>
            <div style="font-size:11px;color:var(--is-text);line-height:1.35">${this._escHtml(it.message || '')}</div>
          </div>`).join('')}</div>`;
      } else {
        const rows = lg.items.map(it => `<tr>
          <td style="white-space:nowrap">${this._escHtml(_when(it))}</td>
          <td>${_badge(it.type)}</td>
          <td><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(it.message || '')}</div></td>
        </tr>`).join('');
        const _th = 'user-select:none;white-space:nowrap';
        body = `<table class="tl-users-table lib-table" style="width:100%;table-layout:fixed">
          <thead><tr>
            <th style="${_th};width:180px">${this._t('mtDate')}</th>
            <th style="${_th};width:110px">${this._t('mtLabel')}</th>
            <th style="${_th};width:auto">${this._t('mtEvent')}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
      }
    }

    const PAGE = lg.perPage || 25;
    const totalPages = Math.max(1, Math.ceil((lg.total || 0) / PAGE));
    const pag = this._uiPager('mt-log-page', lg.page || 0, totalPages, true);

    // Same shape as the poster tabs: fixed chrome, table takes the slack, paging
    // pinned at the bottom. Rows per page are measured, so nothing scrolls.
    return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden">
      <div style="flex-shrink:0">
        ${stats}
        <div style="font-size:13px;font-weight:700;color:var(--is-text);margin-bottom:8px">${this._t('mtLogs')}</div>
        ${toolbar}
      </div>
      <div id="mt-log-wrap" style="flex:1;min-height:0;overflow:hidden">${body}</div>
      ${pag ? `<div id="mt-log-pag" style="flex-shrink:0">${pag}</div>` : ''}
    </div>`;
  }

}

export const maintainerrCollectionsRenderMixin = _MaintainerrCollectionsRenderMethods.prototype;
