// Maintainerr, the Overview tab: the library as Maintainerr sees it, paged on the server. Split out of render/maintainerr.js.

class _MaintainerrOverviewRenderMethods {

  _mtOverviewTabHtml() {
    const m = this._maintainerrModal;
    if (!m) return '';
    const ov = m.overview;
    if (!ov) return `<div class="is-loading"><span>${this._t('loading')}</span></div>`;

    const isMob = this._isMob;
    const { cols, perPage, gap, gridMaxW } = this._mtGridCalc(ov, 90);

    const libs = this._maintainerrLibraries || [];
    const libItems = libs.map(l => [l.id, l.title]);

    const sortItems = [
      ['title-asc', 'Title A–Z'],
      ['title-desc', 'Title Z–A'],
      ['airDate-desc', 'Newest first'],
      ['airDate-asc', 'Oldest first'],
      ['rating-desc', 'Highest rated'],
      ['rating-asc', 'Lowest rated'],
      ['watchCount-desc', 'Most watched'],
      ['watchCount-asc', 'Least watched'],
      ['manual-desc', 'Manual first'],
      ['excluded-desc', 'Excluded first'],
    ];
    const sort = ov.sort || 'title-asc';

    const toolbar = `<div style="margin-bottom:${this._mtToolbarGap}px">${this._mtToolbar('mt-ov-search', ov.search || '', [
      { id: 'mt-ov-lib', items: libItems, value: ov.libId },
      { id: 'mt-ov-sort', items: sortItems, value: sort },
    ])}</div>`;

    if (ov.loading) {
      return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden">` +
        `<div style="flex-shrink:0">${toolbar}</div>` +
        `<div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center"><div class="is-loading"><span>${this._t('loading')}</span></div></div>` +
        `</div>`;
    }

    // Search results come back unpaged, so those are sliced here instead
    const searching = !!(ov.search || '').trim();
    const allItems = searching ? (ov.searchItems || []) : (ov.items || []);
    const total = searching ? allItems.length : (ov.totalSize || 0);
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(ov.page || 0, totalPages - 1);
    // Unsearched items are already one page, but sliced anyway: while the column
    // slider is held the grid is re-laid from the page fetched for the old size.
    const pageItems = searching ? allItems.slice(safePage * perPage, (safePage + 1) * perPage) : allItems.slice(0, perPage);

    // Archive box, same glyph as the Collections nav pill. Deliberately not a
    // plus — that means "request this title" everywhere else on the card.
    const ADD_ICO = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`;
    const EXCL_ICO = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="display:block"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;
    // Overview posters are far larger than the category cards, so the round
    // actions are scaled up from .btn-add's 28px to keep the same visual weight
    const _rnd = (bdr, bg) => `width:34px;height:34px;padding:0;border-radius:50%;border:1px solid ${bdr};background:${bg};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:0;backdrop-filter:blur(8px)`;

    // Countdown replaces a plain "in a collection" tag: membership is implied by
    // having a deletion date, and the date is the part that is actually useful.
    const del = this._mtDelMap || new Map();
    const compact = cols >= 8;

    const posters = pageItems.map(item => {
      const actions = `<div style="position:absolute;bottom:8px;right:8px;z-index:5;display:flex;flex-direction:column;gap:6px">
        <button data-mt-ov-add="${item.id}" title="${this._t('mtAddRemoveMedia')}" style="${_rnd('rgba(0,122,255,0.50)', 'rgba(0,122,255,0.30)')}">${ADD_ICO}</button>
        <button data-mt-ov-excl="${item.id}" title="${this._t('mtExcludeMedia')}" style="${_rnd('rgba(52,211,153,0.50)', 'rgba(52,211,153,0.28)')}">${EXCL_ICO}</button>
      </div>`;
      const dm = del.get(String(item.id));
      const prefix = this._mtSeasonLabel(dm?.seasons);
      return this._mtOvPosterCard(item, { compact, dueMs: dm?.due ?? null, actions, prefix });
    }).join('');

    const empty = pageItems.length === 0 ? `<div class="u-empty-dim" style="padding:20px 0">${this._t('mtNoCollections')}</div>` : '';
    const grid = posters
      ? `<div id="mt-poster-grid" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap}px;overflow:hidden${gridMaxW ? `;max-width:${gridMaxW}px;margin:0 auto` : ''}">${posters}</div>`
      : empty;
    const pagHtml = this._uiPager('mt-ov-page', safePage, totalPages, true);
    const dragHandle = this._mtDragHandleHtml(ov, isMob);
    const pagWrap = (pagHtml || dragHandle)
      ? `<div id="mt-pag-wrap" style="flex-shrink:0;position:relative;${dragHandle && !pagHtml ? 'height:36px' : ''}">${pagHtml}${dragHandle}</div>`
      : '';

    return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;position:relative">` +
      `<div style="flex-shrink:0">${toolbar}</div>` +
      `<div style="flex:1;min-height:0;overflow:hidden">${grid}</div>` +
      pagWrap +
      this._mtOverviewDialogHtml() +
      `</div>`;
  }

  // Add/Remove-media and Exclude-media sheets, mirroring Maintainerr's dialogs
  _mtOverviewDialogHtml() {
    const ov = this._maintainerrModal?.overview;
    const dlg = ov?.dialog;
    if (!dlg) return '';

    const isExcl = dlg.kind === 'exclusion';
    const title = isExcl ? this._t('mtExcludeMedia') : this._t('mtAddRemoveMedia');
    const actions = isExcl
      ? [['0', this._t('mtAddExclusion')], ['1', this._t('mtRemoveExclusion')]]
      : [['0', this._t('mtAddToCollection')], ['1', this._t('mtRemoveFromCollection')]];
    const cols = this._mtCollectionsForLib(ov.libId);
    const colItems = [
      ...(isExcl ? [['', this._t('mtAllCollections')]] : []),
      ...cols.map(c => [c.id, this._mtColLabel(c, cols)]),
    ];

    const busy = !!dlg.busy;

    // Worded buttons pushed Submit onto its own line at this width; the round
    // pair is the same vocabulary the media tab's exclude confirmation uses.
    const _ICO_OK = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg>`;
    const _ICO_X = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    const _ICO_SWEEP = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

    // Opaque panel — the card's --is-btn-bg is translucent and would let the
    // poster grid bleed through the dialog.
    const _day = this._isDay;
    const panelBg = _day ? '#f4f4f6' : '#26262b';
    const panelTxt = _day ? '#000' : '#fff';
    // Buttons line up with the selects, so both share the label column width
    const LBL_W = 80, ROW_GAP = 10;
    const lbl = `font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:${_day ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)'};flex-shrink:0;width:${LBL_W}px`;

    return `<div data-mt-ov-dlg-backdrop style="position:absolute;inset:0;z-index:20;background:rgba(0,0,0,0.65);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px">
      <div style="background:${panelBg};color:${panelTxt};border:1px solid var(--is-card-bdr);border-radius:20px;padding:18px 20px;width:min(460px,100%);box-shadow:0 12px 40px rgba(0,0,0,0.6)">
        <div style="font-size:14px;font-weight:700;color:${panelTxt};margin-bottom:16px">${title}</div>
        <div style="display:flex;align-items:center;gap:${ROW_GAP}px;margin-bottom:10px">
          <span style="${lbl}">${this._t('mtAction')}</span>
          ${this._mtFieldSelect('mt-ov-dlg-action', actions, String(dlg.action ?? '0'), 'flex:1;min-width:0')}
        </div>
        <div style="display:flex;align-items:center;gap:${ROW_GAP}px;margin-bottom:16px">
          <span style="${lbl}">${this._t('mtCollection')}</span>
          ${this._mtFieldSelect('mt-ov-dlg-col', colItems, dlg.collectionId ?? '', 'flex:1;min-width:0')}
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          ${!isExcl ? `<button data-mt-ov-dlg-removeall style="${this._mtBtnA('red')}" ${busy ? 'disabled' : ''}>${_ICO_SWEEP}${this._t('mtRemoveFromAll')}</button>` : ''}
          <div style="flex:1;min-width:8px"></div>
          ${this._mtRoundBtn('data-mt-ov-dlg-cancel', _ICO_X, this._t('mtCancel'), { size: 34, active: false, disabled: busy })}
          ${this._mtRoundBtn('data-mt-ov-dlg-submit', _ICO_OK, this._t('mtSubmit'), { size: 34, tone: 'blue', busy })}
        </div>
      </div>
    </div>`;
  }

}

export const maintainerrOverviewRenderMixin = _MaintainerrOverviewRenderMethods.prototype;
