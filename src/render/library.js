import { MT_BTN, _ICO_CHECK } from './mt-kit.js';
import { ICONS, dayClass, BP, maxWidth } from '../shared/ui.js';

class _LibraryMethods {

  // ─── Section tile view ───────────────────────────────────────────────────

  // ─── Modal open / close ───────────────────────────────────────────────────

  _openLibModal(key) {
    this._markActivated();
    this.shadowRoot.querySelector('[data-lib-modal]')?.remove();
    let _saved = {};
    try { _saved = JSON.parse(localStorage.getItem('arr-lib-tabs') || '{}'); } catch (_) {}
    const typeKey    = key === 'movies' || key === 'topquality' ? 'movies'
                     : key === 'tv' ? 'tv'
                     : key === 'music' ? 'music'
                     : (key === 'all' && ['movies','tv','music'].includes(_saved.typeKey)
                        && !(_saved.typeKey === 'music' && this._lidarrConfigured === false)) ? _saved.typeKey
                     : 'all';
    const qualityKey = (key === 'toprated' || key === 'topquality') ? key : null;
    const sortDef    = qualityKey === 'toprated' ? (typeKey === 'music' ? 'rating' : 'imdb')
                     : qualityKey === 'topquality' ? 'quality' : 'added';
    const _byType = (_saved.byType || {})[typeKey] || {};
    const isTabNow = !this._isMob && maxWidth(BP.TABLET);
    this._libModal = {
      typeKey,
      qualityKey,
      instFilter: _saved.instFilter || 'all',
      search: '',
      sort: qualityKey ? sortDef : (_byType.sort || _saved.sort || sortDef),
      sortDir: _byType.sortDir || _saved.sortDir || 'desc',
      view: _byType.view || _saved.view || 'posters',
      page: 0,
      filter: qualityKey ? 'all' : (_byType.filter || 'all'),
      _libCols: !this._isMob ? (_saved.tabCols || 0) : 0,
      _editMode: false,
      _selected: new Set(),
      _bulkDialog: null,
      _bulkEdit: { monitored: '', qualityProfileId: '', minimumAvailability: '', rootFolderPath: '', monitorNewItems: '', seriesType: '', seasonFolder: '' },
      _bulkTags: { tags: '', applyTags: 'add' },
      _bulkDelete: { addImportExclusion: true, deleteFiles: false },
    };
    const wrap = document.createElement('div');
    wrap.innerHTML = this._libModalHtml();
    const el = wrap.firstElementChild;
    this.shadowRoot.appendChild(el);
    // Calibrate with actual body height — same approach as Activity Queue
    const bodyEl = el.querySelector('#lib-body');
    if (bodyEl?.clientHeight > 0) {
      this._libModal._bodyH = bodyEl.clientHeight;
      bodyEl.innerHTML = this._libBodyHtml();
      const gw = bodyEl.querySelector('#lib-poster-grid')?.clientWidth || 0;
      if (gw > 0 && gw !== this._libModal._gridW) {
        this._libModal._gridW = gw;
        if (this._libModal._colsAuto) this._libModal._libCols = 0;
        bodyEl.innerHTML = this._libBodyHtml();
      }
    }
    this._wireLibModal(el);
  }

  // What this type was last left showing. Written on every switch as well as
  // on close, so a switch that is never followed by a clean close still sticks.
  _libSaveTypePrefs() {
    const m = this._libModal;
    if (!m) return;
    try {
      const prev = JSON.parse(localStorage.getItem('arr-lib-tabs') || '{}');
      prev.byType = prev.byType || {};
      prev.byType[m.typeKey] = { sort: m.sort, sortDir: m.sortDir, filter: m.filter, view: m.view };
      prev.typeKey = m.typeKey;
      localStorage.setItem('arr-lib-tabs', JSON.stringify(prev));
    } catch (_) {}
  }

  _libTypePrefs(typeKey) {
    try {
      return (JSON.parse(localStorage.getItem('arr-lib-tabs') || '{}').byType || {})[typeKey] || null;
    } catch (_) { return null; }
  }

  _closeLibModal() {
    if (this._libModal) {
      this._libSaveTypePrefs();
      try {
        const { typeKey, instFilter, qualityKey, sort, sortDir, view, filter } = this._libModal;
        // tabCols deliberately left alone: the drag handle writes it, and only
        // when the user moves it. Saving _libCols here would persist the count
        // this session happened to auto-fit — a different window size, or a
        // phone (where it is 0), would silently overwrite the chosen size.
        const prev = JSON.parse(localStorage.getItem('arr-lib-tabs') || '{}');
        localStorage.setItem('arr-lib-tabs', JSON.stringify(
          { ...prev, typeKey, instFilter, qualityKey, sort, sortDir, view, filter }));
      } catch (_) {}
    }
    this.shadowRoot.querySelector('[data-lib-modal]')?.remove();
    this._libModal = null;
  }

  // ─── Modal HTML ───────────────────────────────────────────────────────────

  _libModalHtml() {
    const m = this._libModal;
    const isMob = this._isMob;
    const isTab = !isMob && maxWidth(BP.TABLET);
    const _ICO_MOVIE = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/></svg>`;
    const _ICO_TV    = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
    const _ICO_MUSIC = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="pointer-events:none"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/></svg>`;
    const G1_LABELS = { all: this._t('tabAll'), movies: _ICO_MOVIE, tv: _ICO_TV, music: _ICO_MUSIC };
    const G1_LABELS_DSK = { all: this._t('tabAll'), movies: this._t('tabMovies'), tv: this._t('tlFilterTvShows'), music: this._t('tabMusic') };
    // Type filter is a three-way peanut — the options are mutually exclusive and
    // always one of three, which is exactly what the sliding fill expresses.
    const _types = this._lidarrConfigured === false ? ['all','movies','tv'] : ['all','movies','tv','music'];
    const g1Seg = this._mtSegmented('data-lib-seg-type', _types.map(k => ({
      v: k,
      label: G1_LABELS_DSK[k],
      // "All" has no obvious glyph, so it keeps its word; the other two are icons
      icon: k === 'all' ? null : G1_LABELS[k],
      attr: `data-lib-tab-type="${k}"`,
      disabled: m.qualityKey === 'topquality' && k !== 'movies',
      // set below for music
    })), m.typeKey, {
      width: isMob ? 40 : 52,
      accent: '0,122,255',
      // Matches the Maintainerr header nav's fill exactly — same bar, so the
      // selection must not read as a paler blue here.
      accentAlpha: 0.9,
      animatePrev: !!m._animSegType,
      prev: m._prevTypeKey,
    });
    const sep = `<span class="mt-tb-sep"></span>`;
    // A phone header has no room for two worded pills beside the peanuts —
    // a star for rating, a gem for quality, with the wording in the tooltip.
    const _ICO_RATED = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="pointer-events:none"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
    const _ICO_QUAL  = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="pointer-events:none"><path d="M6 2h12l4 6-10 14L2 8zm1.2 2L4.6 7.6h4.2zm3.1 0-1.5 3.6h6.4L13.7 4zm6.5 0 1.5 3.6h4.2zM5.4 9.6 12 18.9l6.6-9.3z"/></svg>`;
    // Not a peanut: either can be off, which a sliding fill cannot show. Two
    // independent toggles, blue when on, plain capsule when off.
    const G2 = [['toprated', this._t('libTopRated'), _ICO_RATED], ['topquality', this._t('libTopQuality'), _ICO_QUAL]];
    const g2Btns = G2.map(([k, lbl, ico]) => {
      const on = k === m.qualityKey;
      // Amber, as before — the two sort presets are their own kind of choice,
      // not another blue filter. Same alpha split as the peanut's fill.
      const acc = '--tgl-on:rgba(255,160,0,0.9)';
      // Artists carry a rating of their own, so Top Rated means something for
      // them; Top Quality reads a file's resolution, which they have none of.
      const off = m.typeKey === 'music' && k === 'topquality';
      return `<button class="mt-tgl${on ? ' is-on' : ''}" data-lib-tab-quality="${k}" title="${this._escHtml(lbl)}"${off ? ' disabled style="opacity:0.35;pointer-events:none;' + acc + '"' : ` style="${acc}"`}>${isMob ? ico : lbl}</button>`;
    }).join('');
    // One Lidarr, so the instance switch has nothing to switch between.
    const hasMultiInst = !!(this._radarr2Configured || this._sonarr2Configured) && m.typeKey !== 'music';
    const g3Btns = hasMultiInst
      ? this._mtSegmented('data-lib-seg-inst', [
          // Short labels on the pills, full wording in the tooltip
          { v: 'all', label: this._t('libBothInst'), icon: '1&nbsp;|&nbsp;2', attr: 'data-lib-tab-inst="all"' },
          { v: '1', label: this._t('libInst1'), icon: '1', attr: 'data-lib-tab-inst="1"' },
          { v: '2', label: this._t('libInst2'), icon: '2', attr: 'data-lib-tab-inst="2"' },
        ], m.instFilter || 'all', {
          width: isMob ? 34 : 44,
          accent: '88,86,214',
          accentAlpha: 0.9,
          animatePrev: !!m._animSegInst,
          prev: m._prevInstFilter,
        })
      : '';
    const tabBtnsMain = g1Seg + sep + g2Btns;
    const tabBtns = tabBtnsMain + ((!isMob && g3Btns) ? sep + g3Btns : '');

    // Title dropped — the tabs say what this is. The count sits by the close
    // button, with enough of a gap that the two do not read as one control.
    const itemCount = this._libFilteredItems().length;
    const countBadge = `<span style="font-size:12px;font-weight:600;opacity:0.55;color:var(--is-text);flex-shrink:0;white-space:nowrap;margin-left:4px">${itemCount}</span>`;
    // Same header block as Maintainerr — its bar is 34px tall and the padding
    // is asymmetric, which is why the Library's read as the shorter of the two.
    const hdrPad = isMob ? '12px 12px 10px' : '14px 22px 10px';
    // 3px all round: the same inset the fill has top and bottom, so a selected
    // half sits equally far from every edge of the bar.
    const hdrBar = 'height:34px;padding:0 3px;gap:6px';
    // Arrived here from a title's detail popup? Then this control goes back to
    // it rather than closing outright — the same pattern the popup already uses
    // when it was opened from Library, Calendar or Maintainerr.
    const backIco = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    const closeIco = this._libPopupReturn ? backIco : ICONS.close;

    const hdrInner = isMob
      ? `<div style="display:flex;align-items:center;gap:6px">
           <div class="mt-tb lib-hdr-scroll" style="flex:1;min-width:0;${hdrBar};overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;margin-right:50px">
             ${tabBtnsMain}${g3Btns ? sep + g3Btns : ''}
           </div>
           <button class="popup-close" id="lib-close" style="flex-shrink:0;margin-left:4px">${closeIco}</button>
         </div>`
      : `<div class="mt-tb" style="min-width:0;flex-shrink:1;overflow:hidden;${hdrBar}">${tabBtns}</div>
         ${countBadge}
         <span id="lib-cmd-status" style="font-size:11px;font-weight:400;opacity:0.55;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0"></span>
         <div style="flex:1;min-width:8px"></div>
         <button class="popup-close" id="lib-close" style="position:relative;top:0;right:0;flex-shrink:0;align-self:center;margin-left:4px">${closeIco}</button>`;

    return `<div class="popup-overlay${dayClass(this)}" data-lib-modal>
      <div class="popup-glass tl-wide">
        <div class="is-panel-hdr" style="flex-direction:${isMob?'column':'row'};align-items:${isMob?'stretch':'center'};padding:${hdrPad};gap:${isMob?'4px':'8px'}">
          ${hdrInner}
        </div>
        <div class="popup-body" id="lib-body" style="padding:${isMob ? '6px 10px 12px' : '8px 20px 16px'};display:flex;flex-direction:column;overflow:hidden">
          ${this._libBodyHtml()}
        </div>
      </div>
    </div>`;
  }

  // ─── Modal body (re-rendered on filter/sort/search/page change) ───────────

  _libBodyHtml() {
    const m = this._libModal;
    const isMob = this._isMob;
    const isTab = !isMob && maxWidth(BP.TABLET);
    const allItems = this._libFilteredItems();

    // Dynamic perPage — fit exactly within modal without vertical scroll
    const vH     = window.innerHeight;
    const vW     = window.innerWidth;
    const bPad   = isMob ? 18 : 24;
    const tlbH   = isMob ? 80 : 48;  // toolbar 38px + 10px margin-bottom
    const pagH   = 48;               // tl-icon-btn 36px + margin-top 14px (measured)
    // Use actual measured body height (clientHeight of #lib-body) when available — same as Activity Queue
    const availH = m._bodyH
      ? m._bodyH - bPad - tlbH - pagH
      : vH * 0.88 - 60 - bPad - tlbH - pagH;

    let perPage;
    if (m.view === 'posters') {
      const gap    = 8;
      const glassW = Math.min(1100, vW * 0.96);
      const bodyPX = isMob ? 20 : 40;
      const gridW  = m._gridW || (glassW - bodyPX);
      let bestCols = m._libCols || 0;
      if (!bestCols) {
        const minW = isMob ? 70 : 90;
        const maxC = Math.floor((gridW + gap) / (minW + gap));
        const minC = isMob ? 2 : 3;
        let bestPP = 0;
        for (let c = minC; c <= maxC; c++) {
          const pW = (gridW - gap * (c - 1)) / c;
          const pH = pW * 1.5;
          const r  = Math.max(1, Math.round((availH + gap) / (pH + gap)));
          const pp = c * r;
          if (pp > bestPP) { bestPP = pp; bestCols = c; }
        }
        m._libCols = bestCols;
        m._colsAuto = true;   // nobody has touched the slider, so this may be redone
      }
      // A phone gets a fixed 2x2: at two columns the poster width, and with it
      // the 2:3 height, is dictated by the viewport, and two such rows are
      // taller than the body. The grid crops them to fit rather than dropping
      // to a single row — four posters is the point of the page.
      if (isMob) { perPage = 4; }
      const cols    = isMob ? 2 : bestCols;
      const posterW = (gridW - gap * (cols - 1)) / cols;
      const posterH = posterW * 1.5;
      const rows    = Math.max(1, Math.round((availH + gap) / (posterH + gap)));
      let cardH = (availH - gap * (rows - 1)) / rows;
      let cardW = cardH / 1.5;
      // Rounding down asked for fewer rows than fit: leave the posters at the
      // size the slider chose rather than blowing them up to fill the gap.
      if (cardW > posterW) { cardW = posterW; cardH = posterH; }
      m._libCard = { w: Math.floor(cardW), h: Math.floor(cardH) };
      if (!isMob) perPage = cols * rows;
    } else if (m.view === 'overview') {
      const rowH = 79 + 6; // card (63px poster + 16px padding) + gap
      perPage = Math.max(5, Math.floor((availH + 6) / rowH));
    } else {
      // thead 30px, each row 38px (measured: 9px padding×2 + 18px text + 1px border)
      perPage = Math.max(5, Math.floor((availH - 30) / 38));
    }

    // Published so callers (Show in library) can work out which page a title
    // lands on — perPage is measured from the rendered body, not a constant.
    m._perPage = perPage;
    const totalPages = Math.max(1, Math.ceil(allItems.length / perPage));
    const page = Math.min(m.page, totalPages - 1);
    m._totalPages = totalPages;
    const pageItems = allItems.slice(page * perPage, (page + 1) * perPage);

    const _CHEV = `<svg class="mt-tb-chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><polyline points="6 9 12 15 18 9"/></svg>`;

    // View

    // Sort — custom dropdown (native select unreliable for same-option toggle)
    const sortDefs   = this._libSortOptions();
    const sortLabel  = sortDefs.find(s => s.v === m.sort)?.label || this._t('libSort');
    const dirArrow   = m.sortDir === 'desc' ? ' ↓' : ' ↑';
    const sortOpen   = !!m._sortOpen;
    // Menu radius and fill follow the capsule language; the rows stay rows.
    const sortDropList = sortOpen ? `<div id="lib-sort-list" style="position:absolute;top:34px;left:0;z-index:200;background:var(--is-menu-bg,#1c1c1e);border:1px solid var(--is-divider,rgba(255,255,255,0.15));border-radius:14px;min-width:190px;overflow:hidden;padding:4px;box-shadow:0 6px 24px rgba(0,0,0,0.4)">
      ${sortDefs.map(s => {
        const act = s.v === m.sort;
        return `<div data-lib-sort-opt="${s.v}" style="padding:7px 12px;border-radius:999px;font-size:12px;cursor:pointer;color:${act ? '#4da3ff' : 'var(--is-text)'};display:flex;align-items:center;justify-content:space-between;gap:8px;${act?'font-weight:700':''}">
          <span style="pointer-events:none">${s.label}</span>
          ${act ? `<span style="opacity:0.7;font-size:11px;pointer-events:none">${dirArrow.trim()}</span>` : ''}
        </div>`;
      }).join('')}
    </div>` : '';
    // Wears the toolbar's own trigger, but stays a custom menu: a native select
    // cannot report the same option being chosen twice, which toggles direction.
    // A phone shows the glyph instead of the label, like the Activity filters.
    const sortTrigger = isMob
      ? `<span id="lib-sort-btn" class="mt-tb-sel mt-tb-sel--ico is-active${sortOpen ? ' is-open' : ''}" title="${this._escHtml(sortLabel + dirArrow)}">
          ${this._libSortIcon(m.sortDir)}${_CHEV}
        </span>`
      : `<span id="lib-sort-btn" class="mt-tb-sel${sortOpen ? ' is-open' : ''}">
          <span class="mt-tb-lbl">${sortLabel}${dirArrow}</span>${_CHEV}
        </span>`;
    const sortSel = `<span id="lib-sort-wrap" style="position:relative;flex-shrink:0;min-width:0">
      ${sortTrigger}
      ${sortDropList}
    </span>`;

    // Filter
    const FILTER_OPTS = [['all',this._t('tabAll')],['monitored',this._t('libMonitoredOnly')],['unmonitored',this._t('actNotMonitored')],['missing',this._t('badgeMissing')],['wanted',this._t('libWanted')],['cutoff',this._t('libCutoffUnmet')]];
    const filterSel = isMob
      ? this._actIconSelect({ id: 'lib-filter-sel', kind: 'filter', value: m.filter, items: FILTER_OPTS })
      : this._mtSelect('lib-filter-sel', FILTER_OPTS, m.filter, 'all');

    const _ICO_REFRESH = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
    const _ICO_RSS = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1" fill="currentColor"/></svg>`;
    const _ICO_EDIT = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;

    // Buttons that live inside the bar carry no chrome of their own — a capsule
    // nested in a capsule is what the redesign set out to remove.
    const _tbBtn = (action, label, extra = '') =>
      `<button class="mt-tb-btn" data-lib-action="${action}"${extra}>${label}</button>`;
    const actionBtnsText = `${_tbBtn('update-all', `${_ICO_REFRESH}Update All`)}${_tbBtn('rss-sync', `${_ICO_RSS}RSS Sync`)}`;
    const actionBtnsIcon = `${_tbBtn('update-all', _ICO_REFRESH)}${_tbBtn('rss-sync', _ICO_RSS)}`;

    const allSelected = m._editMode && m._selected?.size > 0 && allItems.length > 0 && m._selected.size >= allItems.length;
    const hasSel = m._editMode && (m._selected?.size || 0) > 0;
    // Nothing selected yet: the three bulk actions stay visible but inert, so
    // the bar does not reflow the moment the first poster is picked.
    const _dimBtn = (action, label) => {
      const red = action === 'bulk-delete' && hasSel;
      const sty = `${hasSel ? '' : 'opacity:0.35;cursor:default;'}${red ? 'color:#ff6b6b;background:rgba(229,57,53,0.20);' : ''}`;
      return _tbBtn(action, label, `${hasSel ? '' : ' disabled'} style="${sty}"`);
    };
    // Edit mode takes the whole bar: search and the pickers have nothing to act
    // on while the selection is what matters.
    const editBtns = `${_dimBtn('bulk-edit', this._t('libEdit'))}${_dimBtn('bulk-tags', this._t('libSetTags'))}${_dimBtn('bulk-delete', this._t('tlDelete'))}
        <span class="mt-tb-sep"></span>
        ${_tbBtn('stop-edit', this._t('libStopSelecting'))}${_tbBtn('select-toggle', allSelected ? this._t('tlGDeselectAll') : this._t('tlGSelectAll'))}`;

    // The switch replaces what used to be a plain dropdown on a phone, so it is
    // built before the control row that may host it. Desktop keeps it pinned to
    // the paging row's left corner.
    const _VF = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" style="display:block;pointer-events:none"';
    const _ICO_POSTERS  = `<svg ${_VF}><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="9.5" y="4" width="5" height="16" rx="1"/><rect x="16" y="4" width="5" height="16" rx="1"/></svg>`;
    const _ICO_OVERVIEW = `<svg ${_VF}><rect x="3" y="5" width="6" height="14" rx="1"/><line x1="12" y1="8" x2="21" y2="8"/><line x1="12" y1="12" x2="21" y2="12"/><line x1="12" y1="16" x2="18" y2="16"/></svg>`;
    const _ICO_TABLE    = `<svg ${_VF}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;

    const viewSeg = this._mtSegmented('data-lib-seg-view', [
      { v: 'posters', label: this._t('libPosters'), icon: _ICO_POSTERS, attr: 'data-lib-view="posters"' },
      { v: 'overview', label: this._t('traOverview'), icon: _ICO_OVERVIEW, attr: 'data-lib-view="overview"' },
      { v: 'table', label: this._t('mtViewTable'), icon: _ICO_TABLE, attr: 'data-lib-view="table"' },
    ], m.view, {
      icons: true,
      width: isMob ? 32 : null,
      accent: '0,122,255',
      animatePrev: !!m._animSegView,
      prev: m._prevView,
    });

    // One bar for everything: search, the pickers, then the actions, split by
    // hairlines. A phone fits them too once the actions drop to icons and the
    // pickers take only their own label's width.
    const TB_STY = 'flex:1;min-width:0;height:34px;padding:0 3px 0 12px';
    const editEntry = m.typeKey === 'music'
      ? ''
      : _tbBtn('start-edit', isMob ? _ICO_EDIT : `${_ICO_EDIT}Edit`);
    const barActions = `<span class="mt-tb-sep"></span>${isMob || isTab ? actionBtnsIcon : actionBtnsText}${editEntry}`;
    // Edit mode empties the bar — search and the pickers have nothing to act on
    // while a selection is being made — and the actions sit at its right end.
    const searchTb = m._editMode
      ? `<div class="mt-tb" style="${TB_STY};padding:0 3px;gap:2px"><div style="flex:1"></div>${editBtns}</div>`
      : this._mtToolbar('lib-search', m.search, [
          { html: sortSel }, { html: filterSel }, { html: barActions },
        ], this._t('mtSearch'), TB_STY);

    // Second row on a phone carries the view switch alone.
    const ctrlRow = isMob ? `<div style="display:flex;align-items:center;gap:6px">${viewSeg}</div>` : '';

    const toolbar = isMob
      ? `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:6px">${searchTb}</div>
          ${ctrlRow}
        </div>`
      : `<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">${searchTb}</div>`;

    let contentHtml;
    if (m.view === 'posters') {
      // The slider is desktop-only, so its remembered value must not leak into
      // the phone layout — four columns there left posters barely legible.
      const cols = isMob ? 2 : (m._libCols || 7);
      const card = m._libCard || null;
      // Fixed cell size rather than 1fr: the cards are the ones that give way
      // when the body is not an exact number of rows tall.
      const cellCols = card ? `repeat(${cols},${card.w}px)` : `repeat(${cols},1fr)`;
      const cellRows = card ? `grid-auto-rows:${card.h}px;justify-content:space-between;` : '';
      contentHtml = isMob
        ? `<div id="lib-poster-grid" class="lib-grid-fit" style="display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,minmax(0,1fr));gap:10px;height:100%;min-height:0;overflow:hidden">${pageItems.map(i => this._libPosterCard(i)).join('')}</div>`
        : `<div id="lib-poster-grid" class="lib-grid-fit" style="display:grid;grid-template-columns:${cellCols};${cellRows}gap:8px;overflow:hidden">${pageItems.map(i => this._libPosterCard(i)).join('')}</div>`;
    } else if (m.view === 'overview') {
      contentHtml = `<div style="display:flex;flex-direction:column;gap:6px;overflow:hidden">${pageItems.map(i => this._libOverviewCard(i)).join('')}</div>`;
    } else {
      contentHtml = `<div style="overflow:hidden;flex:1;min-height:0">${this._libTableHtml(pageItems)}</div>`;
    }

    const pagHtml = this._uiPager('lib-page', page, totalPages, true);
    const LIB_COLS_MIN = 3, LIB_COLS_MAX = 12, LIB_TRACK_W = 120, LIB_INSET = 7;
    const dragHandle = (!isMob && m.view === 'posters') ? (() => {
      const cur = m._libCols || 7;
      const thumbPx = Math.round((cur - LIB_COLS_MIN) / (LIB_COLS_MAX - LIB_COLS_MIN) * (LIB_TRACK_W - LIB_INSET * 2)) + LIB_INSET;
      // Same day-mode treatment as the Maintainerr slider: the all-white build
      // vanished against a light modal.
      const _d = this._isDay;
      const _track = _d ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.18)';
      const _fill  = _d ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.45)';
      const _knob  = _d ? '#ffffff' : 'rgba(255,255,255,0.85)';
      const _knobBdr = _d ? 'border:1px solid rgba(0,0,0,0.30);' : '';
      const _shadow = _d ? '0 1px 3px rgba(0,0,0,0.30)' : '0 1px 4px rgba(0,0,0,0.4)';
        return `<div id="lib-drag-handle" style="position:absolute;right:0;top:calc(50% + 6px);transform:translateY(-50%);display:flex;align-items:center;gap:6px;padding:6px 0 6px 8px;touch-action:none;user-select:none;cursor:ew-resize">
        <div id="lib-drag-track" style="position:relative;width:${LIB_TRACK_W}px;height:3px;background:${_track};border-radius:2px;cursor:ew-resize">
          <div style="position:absolute;top:0;left:0;width:${thumbPx}px;height:100%;background:${_fill};border-radius:2px;pointer-events:none"></div>
          <div id="lib-drag-thumb" style="position:absolute;top:50%;left:${thumbPx}px;transform:translateY(-50%);width:15px;height:15px;border-radius:50%;background:${_knob};${_knobBdr}box-shadow:${_shadow};pointer-events:none;margin-left:-7px;box-sizing:border-box"></div>
        </div>
      </div>`;
    })() : '';
    const viewWrap = isMob
      ? ''
      : `<div style="position:absolute;left:0;top:calc(50% + 6px);transform:translateY(-50%)">${viewSeg}</div>`;

    const pagWrap = (pagHtml || dragHandle || viewWrap)
      ? `<div style="flex-shrink:0;position:relative;${(dragHandle || viewWrap) && !pagHtml ? 'height:36px' : ''}">${pagHtml}${viewWrap}${dragHandle}</div>`
      : '';

    const dialogHtml = m._bulkDialog ? `<div style="position:absolute;inset:0;z-index:20;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;border-radius:8px">${this._libBulkDialogHtml()}</div>` : '';
    // .lib-results-wrap (display:contents — invisible to flex layout) lets the search debounce
    // handler patch just this subtree, leaving the toolbar's #lib-search input node untouched.
    return `<div style="flex-shrink:0">${toolbar}</div>` +
      `<div class="lib-results-wrap" style="display:contents">` +
      `<div style="flex:1;min-height:0;overflow:hidden;position:relative">${contentHtml}${dialogHtml}</div>` +
      pagWrap +
      `</div>`;
  }

  // The two arrows carry the direction: the one that matches lights up, the
  // other stays dim. A single accented glyph could only say "sorted".
  _libSortIcon(dir) {
    const on  = '#4da3ff';
    const off = 'currentColor';
    const desc = dir !== 'asc';
    const F = 'fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    return `<svg viewBox="0 0 24 24" width="13" height="13" ${F} stroke="currentColor" style="flex-shrink:0">
      <g stroke="${desc ? on : off}" opacity="${desc ? 1 : 0.4}"><line x1="7" y1="4" x2="7" y2="20"/><polyline points="4 17 7 20 10 17"/></g>
      <g stroke="${desc ? off : on}" opacity="${desc ? 0.4 : 1}"><line x1="17" y1="20" x2="17" y2="4"/><polyline points="14 7 17 4 20 7"/></g>
    </svg>`;
  }

  _libBulkDialogHtml() {
    const m = this._libModal;
    const sel = [...(m._selected || [])];
    const allItems = this._libAllItems();
    const selItems = allItems.filter(i => sel.includes(`${i._libType}-${i._libInst||'1'}-${i.id}`));
    const hasMovies  = selItems.some(i => i._libType === 'movie');
    const hasShows   = selItems.some(i => i._libType === 'tv');
    // Same shell as the Maintainerr dialogs: 20px corners, hairline rim, and
    // controls that bring their own capsule rather than a boxed form.
    const _dStyle = `background:var(--is-menu-bg,#1c1c2e);border:1px solid var(--is-card-bdr,rgba(255,255,255,0.09));border-radius:20px;padding:20px 22px;min-width:380px;max-width:min(540px,90vw);box-sizing:border-box`;
    const _hStyle = `font-size:14px;font-weight:700;color:var(--is-text,#fff);margin:0 0 16px`;
    const _rowStyle = `display:flex;align-items:center;gap:12px;margin-bottom:10px`;
    const _labelStyle = `font-size:12px;color:var(--is-text,#fff);opacity:0.8;min-width:110px;text-align:right`;
    const _fld = 'flex:1;min-width:0';
    const _footStyle = `display:flex;justify-content:flex-end;gap:8px;margin-top:18px;padding-top:16px;border-top:1px solid var(--is-card-bdr,rgba(255,255,255,0.09))`;
    const _cancelBtn = `<button data-lib-action="bulk-cancel" style="${MT_BTN}">${this._t('cancel')}</button>`;
    const _chk = (id, checked, label, hint) => `<label class="mt-chk" style="min-width:0">
      <input type="checkbox" id="${id}"${checked ? ' checked' : ''}>
      <span class="mt-chk-box">${_ICO_CHECK}</span>
      <span class="mt-chk-lbl" style="font-weight:400;opacity:0.75">${hint}</span>
    </label>`;

    if (m._bulkDialog === 'delete') {
      const n = selItems.length;
      const confKey = hasMovies && hasShows ? 'libDelConfItems' : hasMovies ? (n > 1 ? 'libDelConfMovies' : 'libDelConfMovie') : 'libDelConfSeries';
      const titles = selItems.slice(0,8).map(i => `<li>${this._escHtml(i.title||'')}</li>`).join('');
      const more = selItems.length > 8 ? `<li style="opacity:0.5">${this._t('libAndMore').replace('{n}', selItems.length-8)}</li>` : '';
      return `<div style="${_dStyle}">
        <p style="${_hStyle}">${this._t(hasMovies&&hasShows?'libDeleteSelItems':hasMovies?'libDeleteSelMovie':'libDeleteSelSeries')}</p>
        <div style="${_rowStyle}"><label style="${_labelStyle}">${this._t('libAddListExcl')}</label>
          ${_chk('bd-excl', m._bulkDelete.addImportExclusion, this._t('libAddListExcl'), this._t('libExclHint'))}</div>
        <div style="${_rowStyle}"><label style="${_labelStyle}">${this._t('libDeleteFiles')}</label>
          ${_chk('bd-files', m._bulkDelete.deleteFiles, this._t('libDeleteFiles'), this._t('libDeleteFilesHint'))}</div>
        <p style="font-size:12px;color:var(--is-text,#fff);opacity:0.8;margin:12px 0 4px">${this._t(confKey).replace('{n}', n)}</p>
        <ul style="font-size:12px;opacity:0.7;margin:0;padding-left:18px;line-height:1.8">${titles}${more}</ul>
        <div style="${_footStyle}">${_cancelBtn}<button data-lib-action="bulk-delete-confirm" style="${this._mtBtnA('red')}">${this._t('tlDelete')}</button></div>
      </div>`;
    }

    if (m._bulkDialog === 'tags') {
      return `<div style="${_dStyle}">
        <p style="${_hStyle}">${this._t('libTags')}</p>
        <div style="${_rowStyle}"><label style="${_labelStyle}">${this._t('libTags')}</label>
          <input id="bt-tags" type="text" value="${this._escHtml(m._bulkTags.tags)}" placeholder="tag1, tag2…" class="mt-field" style="${_fld}"></div>
        <div style="${_rowStyle}"><label style="${_labelStyle}">${this._t('libApplyTags')}</label>
          ${this._mtFieldSelect('bt-mode', [['add',this._t('libTagAdd')],['remove',this._t('remove')],['replace',this._t('libTagReplace')]], m._bulkTags.applyTags, _fld)}</div>
        <div style="${_footStyle}">${_cancelBtn}<button data-lib-action="bulk-tags-confirm" style="${this._mtBtnA('blue')}">${this._t('qaApply')}</button></div>
      </div>`;
    }

    // edit dialog
    const hasMov1 = selItems.some(i=>i._libType==='movie'&&(i._libInst||'1')==='1');
    const hasMov2 = selItems.some(i=>i._libType==='movie'&&i._libInst==='2');
    const hasShw1 = selItems.some(i=>i._libType==='tv'&&(i._libInst||'1')==='1');
    const hasShw2 = selItems.some(i=>i._libType==='tv'&&i._libInst==='2');
    const profiles = []
      .concat(hasMov1 ? (this._radarrProfiles||[])  : [])
      .concat(hasMov2 ? (this._radarr2Profiles||[]) : [])
      .concat(hasShw1 ? (this._sonarrProfiles||[])  : [])
      .concat(hasShw2 ? (this._sonarr2Profiles||[]) : []);
    const uniqueProfiles = [...new Map(profiles.map(p=>[p.name,p])).values()];
    const NC = this._t('libNoChange');
    const profileItems = [['', NC], ...uniqueProfiles.map(p => [p.name, p.name])];
    const monItems     = [['', NC], ['true',this._t('musicMonitored')], ['false',this._t('actNotMonitored')]];
    const availItems   = [['', NC], ['announced',this._t('libAnnounced')], ['inCinemas',this._t('libInCinemas')], ['released',this._t('libReleased')], ['tba','TBA']];
    const monNewItems  = [['', NC], ['all',this._t('tabAll')], ['none',this._t('musMonNone')], ['latest',this._t('libLatest')]];
    const serTypeItems = [['', NC], ['standard',this._t('libStandard')], ['daily',this._t('mtDaily')], ['anime',this._t('libAnime')]];
    const sfItems      = [['', NC], ['true',this._t('mtYes')], ['false',this._t('mtNo')]];
    const mixed = hasMovies && hasShows;
    const titleKey = mixed ? 'Items' : hasMovies ? 'Movies' : 'Series';
    const _appCol = txt => mixed ? `<span style="font-size:10px;opacity:0.45;white-space:nowrap;min-width:90px">${txt}</span>` : '';
    const _row = (label, ctrl, app) => `<div style="${_rowStyle}"><label style="${_labelStyle}">${label}</label>${ctrl}${_appCol(app)}</div>`;
    const hdrRow = mixed ? `<div style="${_rowStyle};margin-bottom:4px"><span style="${_labelStyle}"></span><span style="flex:1"></span><span style="font-size:10px;font-weight:600;opacity:0.5;min-width:90px">${this._t('libAppliesTo')}</span></div>` : '';
    return `<div style="${_dStyle}">
      <p style="${_hStyle}">${this._t('libEditSel' + titleKey)}</p>
      ${hdrRow}
      ${_row(this._t('musicMonitored'),       this._mtFieldSelect('be-mon',  monItems,     m._bulkEdit.monitored,          _fld), this._t('libMoviesSeries'))}
      ${_row(this._t('libQualityProfile'), this._mtFieldSelect('be-qual', profileItems, m._bulkEdit.qualityProfileId,   _fld), this._t('libMoviesSeries'))}
      ${hasMovies ? _row(this._t('libMinAvail'),  this._mtFieldSelect('be-avail',   availItems,   m._bulkEdit.minimumAvailability, _fld), this._t('libMoviesOnly')) : ''}
      ${hasShows  ? _row(this._t('libMonitorNew'), this._mtFieldSelect('be-monnew',  monNewItems,  m._bulkEdit.monitorNewItems,     _fld), this._t('libSeriesOnly')) : ''}
      ${hasShows  ? _row(this._t('libSeriesType'),       this._mtFieldSelect('be-sertype', serTypeItems, m._bulkEdit.seriesType,          _fld), this._t('libSeriesOnly')) : ''}
      ${hasShows  ? _row(this._t('libSeasonFolder'),     this._mtFieldSelect('be-sf',      sfItems,      m._bulkEdit.seasonFolder,        _fld), this._t('libSeriesOnly')) : ''}
      <p style="font-size:11px;opacity:0.5;margin:0 0 4px;text-align:right">${this._t('libSelCount' + titleKey).replace('{n}', selItems.length)}</p>
      <div style="${_footStyle}">${_cancelBtn}<button data-lib-action="bulk-edit-confirm" style="${this._mtBtnA('blue')}">${this._t('libApplyChanges')}</button></div>
    </div>`;
  }
}

export const libraryMixin = _LibraryMethods.prototype;
