import { dayClass, isMobile } from '../shared/ui.js';
import { _PW_TEST_ICO } from './prowlarr.js';

// Prowlarr, the Indexers tab: the list, its filters and row actions. Split out of wire/prowlarr.js.

class _WireProwlarrIndexersMethods {

  // ── Indexers tab ─────────────────────────────────────────────────────────

  async _pwLoadIndexers(body, el) {
    const m = this._prowlarrModal;
    if (!m) return;
    const indexers = this._prowlarr?.indexers || [];
    body.innerHTML = this._pwIndexersTabHtml(indexers, m);
    this._pwWireIndexers(body, el);
  }

  _pwIndexersTabHtml(indexers, m) {
    const isMob    = isMobile();
    const search   = (m?.idxSearch || '').toLowerCase();
    const filterPr = m?.idxFilterProtocol || 'all';
    const filterSt = m?.idxFilterStatus   || 'all';
    const sortCol  = m?.idxSort    || 'name';
    const sortDir  = m?.idxSortDir || 'asc';

    let rows = [...indexers];
    if (search)          rows = rows.filter(i => (i.name || '').toLowerCase().includes(search));
    if (filterPr !== 'all') rows = rows.filter(i => (i.protocol || '').toLowerCase() === filterPr);
    if (filterSt === 'ok')       rows = rows.filter(i => i.enable && !i._status);
    if (filterSt === 'error')    rows = rows.filter(i => i.enable && !!i._status);
    if (filterSt === 'disabled') rows = rows.filter(i => !i.enable);

    rows.sort((a, b) => {
      let va, vb;
      if (sortCol === 'name')         { va = (a.name || '').toLowerCase(); vb = (b.name || '').toLowerCase(); }
      else if (sortCol === 'priority') { va = a.priority || 0; vb = b.priority || 0; }
      else if (sortCol === 'added')    { va = a.added || ''; vb = b.added || ''; }
      else if (sortCol === 'queries') { va = a.numberOfQueries || 0; vb = b.numberOfQueries || 0; }
      else if (sortCol === 'status')  { va = a.enable ? (a._status ? 1 : 0) : 2; vb = b.enable ? (b._status ? 1 : 0) : 2; }
      else if (sortCol === 'privacy') { va = (a.privacy||'').toLowerCase(); vb = (b.privacy||'').toLowerCase(); }
      else                            { va = 0; vb = 0; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const _PW_ICO = {
      add:  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      test: `<svg width="17" height="12" viewBox="0 0 34 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><g transform="translate(-1.5 0) scale(0.72) translate(0 4.6)"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></g><g transform="translate(15.5 0) scale(0.72) translate(0 4.6)"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></g></svg>`,
      sync: `<svg width="17" height="12" viewBox="0 0 34 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><g transform="translate(-1.5 0) scale(0.72) translate(0 4.6)"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></g><g transform="translate(15.5 0) scale(0.72) translate(0 4.6)"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></g></svg>`,
      cols: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>`,
    };

    // Default hidden columns (shown only when user enables them)
    const DEFAULT_HIDDEN = new Set(['queries','vipExpiration','minSeeders','seedRatio','seedTime','packSeedTime','preferMagnet','tags']);
    const hiddenCols  = m?.idxHiddenCols ?? DEFAULT_HIDDEN;
    const showCat     = !hiddenCols.has('categories');
    const showProt    = !hiddenCols.has('protocol');
    const showQ       = !hiddenCols.has('queries');
    const showPriv2   = !hiddenCols.has('privacy');
    const showPrio    = !hiddenCols.has('priority');
    const showAdded   = !hiddenCols.has('added');
    const showVip     = !hiddenCols.has('vipExpiration');
    const showMinS    = !hiddenCols.has('minSeeders');
    const showSeedR   = !hiddenCols.has('seedRatio');
    const showSeedT   = !hiddenCols.has('seedTime');
    const showPackT   = !hiddenCols.has('packSeedTime');
    const showMagnet  = !hiddenCols.has('preferMagnet');
    const showTags    = !hiddenCols.has('tags');

    // One bar, as everywhere else: search, the two pickers, then the actions.
    const toolbar = `<div style="flex-shrink:0;margin-bottom:6px;display:flex;align-items:center;gap:6px">${
      this._uiBar('pw-idx-search', m?.idxSearch || '', [
        { id: 'pw-idx-proto',  kind: 'protocol', value: filterPr, items: [['all', this._t('pwAllProtocols')], ['torrent', 'Torrent'], ['usenet', 'Usenet']] },
        { id: 'pw-idx-status', kind: 'status',   value: filterSt, items: [['all', this._t('pwAllStatus')], ['ok', 'OK'], ['error', this._t('errorState')], ['disabled', this._t('mtSortDisabled')]] },
      ], [
        { id: 'pw-cols-btn', label: this._t('actColumns'), icon: _PW_ICO.cols },
      ])}</div>`;

    if (!rows.length) {
      return `${toolbar}<div class="pw-idx-results-wrap" style="display:contents"><div class="u-empty-lg">${this._t('pwNoIndexersMatch')}</div></div>`;
    }

    if (isMob) {
      const mobRows = rows.map((idx, i) => {
        const hasErr = idx.enable && !!idx._status;
        const isOff  = !idx.enable;
        const dot    = isOff ? 'rgba(255,255,255,0.25)' : hasErr ? 'rgba(255,100,100,0.9)' : 'rgba(52,211,153,0.9)';
        const statusLbl = isOff ? this._t('mtSortDisabled') : hasErr ? this._t('errorState') : 'OK';
        const statusClr = isOff ? 'var(--is-text-muted)' : hasErr ? 'rgba(255,100,100,0.9)' : 'rgba(52,211,153,0.9)';
        const errMsg = '';
        return `<div data-pw-idx-id="${idx.id}" style="padding:10px 0;border-bottom:1px solid var(--is-divider);cursor:pointer">
          <div class="u-row-8">
            <div style="width:8px;height:8px;border-radius:50%;background:${dot};flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--is-text)">${this._escHtml(idx.name||'—')}</div>
              <div style="font-size:10px;color:var(--is-text-muted);margin-top:1px">${(idx.protocol||'').toLowerCase()} · ${this._t('pwGrabsQueries').replace('{g}', idx.numberOfGrabs||0).replace('{q}', idx.numberOfQueries||0)}</div>
              ${errMsg}
            </div>
            <div style="flex-shrink:0;display:flex;align-items:center;gap:6px">
                ${this._mtRoundBtn(`class="pw-test-btn" data-idx-id="${idx.id}"`, _PW_TEST_ICO, this._t('pwTest'), { size: 24, tone: 'green' })}
                ${this._uiSwitch(`class="pw-toggle-btn" data-idx-id="${idx.id}" data-enabled="${idx.enable}"`, idx.enable, idx.enable ? this._t('pwDisable') : this._t('pwEnable'))}
            </div>
          </div>
        </div>`;
      }).join('');
      return `${toolbar}<div class="pw-idx-results-wrap" style="display:contents"><div style="flex:1;overflow-y:auto">${mobRows}</div></div>`;
    }

    const showPriv = !hiddenCols.has('privacy');

    const CAT_PNAMES = {1000:this._t('pwConsole'),2000:this._t('tabMovies'),3000:this._t('pwAudio'),4000:'PC',5000:'TV',6000:'XXX',7000:this._t('pwBooks'),8000:this._t('pwOther')};
    const mkCatChips = idx => {
      // Prowlarr may put categories at idx.categories, idx.capabilities.categories, or as flat int array
      let cats = idx.categories;
      if (!Array.isArray(cats) || !cats.length) cats = idx.capabilities?.categories;
      if (!Array.isArray(cats) || !cats.length) return '';
      // Flatten subCategories, then dedupe by 1000-group
      const flat = [];
      for (const c of cats) {
        flat.push(c);
        if (Array.isArray(c.subCategories)) for (const s of c.subCategories) flat.push(s);
      }
      const seen = new Set();
      const deduped = flat.filter(c => {
        const id = typeof c === 'object' ? (c?.id ?? 0) : Number(c);
        const g  = Math.floor(id / 1000) * 1000;
        return seen.has(g) ? false : (seen.add(g), true);
      }).map(c => {
        const id   = typeof c === 'object' ? (c?.id ?? 0) : Number(c);
        const name = typeof c === 'object' ? (c?.name || CAT_PNAMES[Math.floor(id/1000)*1000] || String(id)) : (CAT_PNAMES[Math.floor(id/1000)*1000] || String(id));
        return { id, name };
      });
      // How many chips fit depends on their rendered width (category names vary a
      // lot in length), so emit them all plus a hidden "+N" and let _pwFitCatChips
      // hide the ones that overflow once the row has been laid out.
      const chipSpan = (n, extra = '') => this._uiBadge(this._escHtml(n), 'neutral', { extra });
      return deduped.map(r => chipSpan(r.name)).join('')
        + chipSpan('+0', 'display:none') .replace('class="ui-badge"', 'class="ui-badge pw-cat-more"');
    };

    const privBadge = priv => {
      const p = (priv||'').toLowerCase();
      const tone = p === 'public' ? 'green'
        : (p === 'semi-private' || p === 'semiprivate') ? 'amber'
        : 'red';
      return this._uiBadge(this._escHtml(priv || '—'), tone);
    };

    const fmtDate  = d => { try { return new Date(d).toLocaleDateString(this._locale,{month:'short',day:'numeric',year:'2-digit'}); } catch{return '—';} };
    const fv       = (idx, name) => { const f = (idx.fields||[]).find(f => f.name === name || f.name === name.split('.').pop()); return f?.value ?? null; };
    const th = (label, key, w, align) => {
      const active = sortCol === key;
      const al = align || 'left';
      return `<th data-pw-sort="${key}" style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:${active?'var(--is-text-body)':'var(--is-text-muted)'};text-align:${al};cursor:pointer;user-select:none;white-space:nowrap${w?';width:'+w:''}">${label}${active?`<span style="margin-left:2px">${sortDir==='asc'?'↑':'↓'}</span>`:''}</th>`;
    };
    const td = (content, w, align) => `<td style="padding:8px;font-size:10px;color:var(--is-text-sec);overflow:hidden;text-overflow:ellipsis;white-space:nowrap${w?';width:'+w:''}${align?';text-align:'+align:''}">${content}</td>`;

    const desktopRows = rows.map(idx => {
      const hasErr    = idx.enable && !!idx._status;
      const isOff     = !idx.enable;
      const statusLbl = isOff ? this._t('mtSortDisabled') : hasErr ? this._t('errorState') : 'OK';
      const statusClr = isOff ? 'var(--is-text-muted)' : hasErr ? 'rgba(255,100,100,0.9)' : 'rgba(52,211,153,0.9)';
      const errMsg    = '';
      const catChipsHtml = mkCatChips(idx);
      const minS    = fv(idx, 'minimumSeeders');
      const seedR   = fv(idx, 'seedRatio') ?? fv(idx, 'seedCriteria.seedRatio');
      const seedT   = fv(idx, 'seedTime')  ?? fv(idx, 'seedCriteria.seedTime');
      const packT   = fv(idx, 'packSeedTime') ?? fv(idx, 'seedCriteria.packSeedTime');
      const magnet  = fv(idx, 'preferMagnetUrl') ?? fv(idx, 'preferMagnet');
      const idxTags = Array.isArray(idx.tags) && idx.tags.length ? idx.tags.join(', ') : '—';
      return `<tr style="border-bottom:1px solid var(--is-divider);cursor:pointer" data-pw-idx-id="${idx.id}">
        <td style="padding:8px;white-space:nowrap;overflow:hidden;width:65px"><span style="font-size:10px;font-weight:600;color:${statusClr}">${statusLbl}</span></td>
        <td style="padding:8px;overflow:hidden">
          <div style="font-size:12px;font-weight:600;color:var(--is-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(idx.name||'—')}</div>
          ${errMsg}
        </td>
        ${showProt    ? td((idx.protocol||'—').toLowerCase(), '65px') : ''}
        ${showQ       ? td(idx.numberOfQueries||0, '65px', 'right') : ''}
        ${showPriv2   ? `<td style="padding:8px;overflow:hidden;width:95px">${privBadge(idx.privacy)}</td>` : ''}
        ${showPrio    ? td(idx.priority||'—', '55px', 'right') : ''}
        ${showAdded   ? td(idx.added ? fmtDate(idx.added) : '—', '80px') : ''}
        ${showVip     ? td(idx.vipExpiration ? fmtDate(idx.vipExpiration) : '—', '80px') : ''}
        ${showMinS    ? td(minS != null ? minS : '—', '60px', 'right') : ''}
        ${showSeedR   ? td(seedR != null ? seedR : '—', '60px', 'right') : ''}
        ${showSeedT   ? td(seedT != null ? (seedT+'m') : '—', '60px', 'right') : ''}
        ${showPackT   ? td(packT != null ? (packT+'m') : '—', '70px', 'right') : ''}
        ${showMagnet  ? td(magnet != null ? (magnet ? this._t('mtYes') : this._t('mtNo')) : '—', '60px') : ''}
        ${showTags    ? td(this._escHtml(idxTags), '80px') : ''}
        ${showCat     ? `<td style="padding:8px;overflow:hidden"><div class="pw-cats" style="display:flex;align-items:center;gap:4px;height:20px;overflow:hidden">${catChipsHtml||'<span class="u-xs-muted">—</span>'}</div></td>` : ''}
        <td style="padding:8px;width:52px;vertical-align:middle">
          <div style="display:flex;justify-content:center;align-items:center;height:100%">
            ${this._uiSwitch(`class="pw-toggle-btn" data-idx-id="${idx.id}" data-enabled="${idx.enable}"`, idx.enable, idx.enable ? this._t('pwDisable') : this._t('pwEnable'))}
          </div>
        </td>
        <td style="padding:8px;width:52px;vertical-align:middle">
          <div style="display:flex;justify-content:center;align-items:center;height:100%">
            ${this._mtRoundBtn(`class="pw-test-btn" data-idx-id="${idx.id}"`, _PW_TEST_ICO, this._t('pwTest'), { size: 24, tone: 'green' })}
          </div>
        </td>
      </tr>`;
    }).join('');

    return `${toolbar}
    <div class="pw-idx-results-wrap" style="display:contents">
    <div class="u-flex-ovh">
      <table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <thead><tr class="u-divider-b">
          ${th(this._t('actColStatus'),'status','65px')}
          <th data-pw-sort="name" style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:${sortCol==='name'?'var(--is-text-body)':'var(--is-text-muted)'};text-align:left;cursor:pointer;user-select:none;white-space:nowrap">Name${sortCol==='name'?`<span style="margin-left:2px">${sortDir==='asc'?'↑':'↓'}</span>`:''}</th>
          ${showProt   ? `<th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left;width:65px;white-space:nowrap">${this._t('actColProtocol')}</th>` : ''}
          ${showQ      ? th(this._t('pwQueries'),'queries','65px','right') : ''}
          ${showPriv2  ? `<th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left;width:95px;white-space:nowrap">${this._t('pwPrivacy')}</th>` : ''}
          ${showPrio   ? th(this._t('pwPriority'),'priority','55px','right') : ''}
          ${showAdded  ? th(this._t('badgeAdded'),'added','80px') : ''}
          ${showVip    ? `<th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left;width:80px;white-space:nowrap">${this._t('pwVipExpShort')}</th>` : ''}
          ${showMinS   ? `<th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:right;width:60px;white-space:nowrap">${this._t('pwMinSeedsShort')}</th>` : ''}
          ${showSeedR  ? `<th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:right;width:60px;white-space:nowrap">${this._t('pwSeedRShort')}</th>` : ''}
          ${showSeedT  ? `<th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:right;width:60px;white-space:nowrap">${this._t('pwSeedTShort')}</th>` : ''}
          ${showPackT  ? `<th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:right;width:70px;white-space:nowrap">${this._t('pwPackSeedShort')}</th>` : ''}
          ${showMagnet ? `<th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left;width:60px;white-space:nowrap">${this._t('pwMagnet')}</th>` : ''}
          ${showTags   ? `<th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left;width:80px;white-space:nowrap">${this._t('libTags')}</th>` : ''}
          ${showCat    ? `<th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left;white-space:nowrap">${this._t('pwCategories')}</th>` : ''}
          <th style="padding:4px 8px 8px;width:52px"></th>
          <th style="padding:4px 8px 8px;width:52px"></th>
        </tr></thead>
        <tbody>${desktopRows}</tbody>
      </table>
    </div>
    </div>`;
  }

  _pwIndexerActionBtns(idx, compact) {
    const trashSvg  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
    const editSvg   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    const testSvg   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    const spinSvg   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:btn-spin 0.65s linear infinite"><path d="M12 2a10 10 0 0 1 10 10"/></svg>`;
    const toggleSvg = idx.enable
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3" fill="currentColor"/></svg>`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="8" cy="12" r="3" fill="currentColor"/></svg>`;
    // The row itself opens the editor, so Edit needs no button of its own —
    // same as the rule rows in Tracearr and Maintainerr.
    return `<div style="display:inline-flex;gap:4px;align-items:center">${
      this._mtRoundBtn(`class="pw-delete-btn" data-idx-id="${idx.id}" data-name="${this._escHtml(idx.name||'')}"`, trashSvg, this._t('tlDelete'), { size: 24, tone: 'red' })
    }</div>`;
  }

  // Category chips are emitted in full; here we hide the ones that don't fit and
  // surface the count on a trailing "+N" chip, so the row never wraps or clips.
  _pwFitCatChips(body) {
    for (const wrap of body.querySelectorAll('.pw-cats')) {
      const more  = wrap.querySelector('.pw-cat-more');
      const chips = [...wrap.children].filter(c => c !== more);
      if (!more || !chips.length) continue;
      for (const c of chips) c.style.display = '';
      more.style.display = 'none';
      if (wrap.scrollWidth <= wrap.clientWidth) continue;
      let hidden = 0;
      more.style.display = '';
      for (let i = chips.length - 1; i >= 0; i--) {
        chips[i].style.display = 'none';
        hidden++;
        more.textContent = `+${hidden}`;
        if (wrap.scrollWidth <= wrap.clientWidth) break;
      }
      if (hidden === 0) more.style.display = 'none';
    }
  }

  _pwWireIndexers(body, el) {
    if (!this._prowlarrModal) return;
    requestAnimationFrame(() => this._pwFitCatChips(body));

    // Search
    body.querySelector('#pw-idx-search')?.addEventListener('input', e => {
      if (!this._prowlarrModal) return;
      this._prowlarrModal.idxSearch = e.target.value;
      // Patch only the results subtree — keeps #pw-idx-search untouched so the iOS
      // keyboard stays open while typing (recreating the input node closes it).
      this._patchResultsWrap(body, 'pw-idx-results-wrap', () => this._pwIndexersTabHtml(this._prowlarr?.indexers || [], this._prowlarrModal));
      this._pwWireIndexers(body, el);
    });

    // Filters
    body.querySelector('#pw-idx-proto')?.addEventListener('change', e => {
      if (!this._prowlarrModal) return;
      this._prowlarrModal.idxFilterProtocol = e.target.value;
      body.innerHTML = this._pwIndexersTabHtml(this._prowlarr?.indexers || [], this._prowlarrModal);
      this._pwWireIndexers(body, el);
    });
    body.querySelector('#pw-idx-status')?.addEventListener('change', e => {
      if (!this._prowlarrModal) return;
      this._prowlarrModal.idxFilterStatus = e.target.value;
      body.innerHTML = this._pwIndexersTabHtml(this._prowlarr?.indexers || [], this._prowlarrModal);
      this._pwWireIndexers(body, el);
    });

    // Sort (desktop th clicks)
    body.querySelectorAll('[data-pw-sort]').forEach(th => {
      th.addEventListener('click', () => {
        if (!this._prowlarrModal) return;
        const col = th.dataset.pwSort;
        if (this._prowlarrModal.idxSort === col) {
          this._prowlarrModal.idxSortDir = this._prowlarrModal.idxSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this._prowlarrModal.idxSort = col;
          this._prowlarrModal.idxSortDir = col === 'name' ? 'asc' : 'desc';
        }
        body.innerHTML = this._pwIndexersTabHtml(this._prowlarr?.indexers || [], this._prowlarrModal);
        this._pwWireIndexers(body, el);
      });
    });

    // Columns toggle button — dropdown appended to overlay el (outside backdrop-filter popup-glass)
    body.querySelector('#pw-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      const existing = el.querySelector('#pw-cols-dropdown');
      if (existing) { existing.remove(); return; }
      if (!this._prowlarrModal) return;
      const _DEFAULT_HIDDEN = new Set(['queries','vipExpiration','minSeeders','seedRatio','seedTime','packSeedTime','preferMagnet','tags']);
      const hidden = this._prowlarrModal.idxHiddenCols ?? _DEFAULT_HIDDEN;
      const cols = [
        { key: 'protocol',      label: this._t('actColProtocol') },
        { key: 'queries',       label: this._t('pwQueries') },
        { key: 'privacy',       label: this._t('pwPrivacy') },
        { key: 'priority',      label: this._t('pwPriority') },
        { key: 'added',         label: this._t('badgeAdded') },
        { key: 'vipExpiration', label: this._t('pwVipExp') },
        { key: 'minSeeders',    label: this._t('pwMinSeeders') },
        { key: 'seedRatio',     label: this._t('pwSeedRatio') },
        { key: 'seedTime',      label: this._t('pwSeedTime') },
        { key: 'packSeedTime',  label: this._t('pwPackSeedTime') },
        { key: 'preferMagnet',  label: this._t('pwPreferMagnet') },
        { key: 'tags',          label: this._t('libTags') },
        { key: 'categories',    label: this._t('pwCategories') },
      ];
      const btn = body.querySelector('#pw-cols-btn');
      const rect = btn?.getBoundingClientRect();
      const items = cols.map(col => {
        const checked = !hidden.has(col.key);
        return `<label style="display:flex;align-items:center;gap:8px;padding:6px 14px;cursor:pointer;font-size:12px;color:var(--is-text);white-space:nowrap">
          <input type="checkbox" data-col="${col.key}" ${checked?'checked':''} style="cursor:pointer;accent-color:var(--is-accent,#0a84ff)"> ${col.label}
        </label>`;
      }).join('');
      const dd = document.createElement('div');
      dd.id = 'pw-cols-dropdown';
      // Use position:absolute relative to el (overlay covers full viewport at 0,0)
      dd.setAttribute('class', dayClass(this).trim());
      dd.style.cssText = `position:absolute;background:var(--is-menu-bg);border:1px solid var(--is-btn-bdr);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:1200;padding:6px 0;min-width:150px;color:var(--is-text)`;
      if (rect) { dd.style.top = (rect.bottom + 4) + 'px'; dd.style.left = rect.left + 'px'; }
      dd.innerHTML = items;
      dd.querySelectorAll('input[data-col]').forEach(inp => {
        inp.addEventListener('change', () => {
          if (!this._prowlarrModal) return;
          if (!this._prowlarrModal.idxHiddenCols) this._prowlarrModal.idxHiddenCols = new Set(_DEFAULT_HIDDEN);
          if (inp.checked) this._prowlarrModal.idxHiddenCols.delete(inp.dataset.col);
          else this._prowlarrModal.idxHiddenCols.add(inp.dataset.col);
          body.innerHTML = this._pwIndexersTabHtml(this._prowlarr?.indexers || [], this._prowlarrModal);
          this._pwWireIndexers(body, el);
        });
      });
      const closeDD = ev => {
        if (!dd.contains(ev.target) && ev.target !== btn) { dd.remove(); el.removeEventListener('click', closeDD, true); }
      };
      setTimeout(() => el.addEventListener('click', closeDD, true), 0);
      el.appendChild(dd);
    });

    // Add
    this._pwHdrBtn(el, 'pw-add-btn', () => this._pwOpenAddIndexer(el));

    // Test All
    this._pwHdrBtn(el, 'pw-testall-btn', async (btn) => {
      this._pwHdrBtnBusy(btn);
      const _n = (this._prowlarr?.indexers || []).filter(i => i.enable).length;
      this._pwShowStatus(`Testing ${_n} indexer${_n === 1 ? '' : 's'}…`, el, 0, { spin: true });
      let hasErrors = false;
      try {
        await this._callApi('POST', 'arr_stack/prowlarr/idxtestall');
        const [indexers, status] = await Promise.all([
          this._callApi('GET', 'arr_stack/prowlarr/indexers'),
          this._callApi('GET', 'arr_stack/prowlarr/indexerstatus'),
        ]);
        const statusMap = {};
        for (const s of (status || [])) statusMap[s.indexerId] = s;
        if (this._prowlarr) this._prowlarr.indexers = (indexers || []).map(i => ({ ...i, _status: statusMap[i.id] || null }));
        hasErrors = (this._prowlarr?.indexers || []).some(i => i.enable && i._status);
      } catch (_) { hasErrors = true; }
      if (!this._prowlarrModal) return;
      const _bad = (this._prowlarr?.indexers || []).filter(i => i.enable && i._status).length;
      this._pwShowStatus(hasErrors ? this._t(_bad === 1 ? 'pwIdxFailed1' : 'pwIdxFailedN').replace('{n}', _bad || 1) : this._t('pwAllIdxOk'), el, 4000, { err: hasErrors });
      await this._pwHdrBtnResult(btn, hasErrors);
      if (!this._prowlarrModal) return;
      body.innerHTML = this._pwIndexersTabHtml(this._prowlarr?.indexers || [], this._prowlarrModal);
      this._pwWireIndexers(body, el);
    });

    // Row click → edit; action button clicks
    body.addEventListener('click', async e => {
      if (!this._prowlarrModal) return;

      // Test single
      const testBtn = e.target.closest('.pw-test-btn');
      if (testBtn) {
        e.stopPropagation();
        const id  = testBtn.dataset.idxId;
        const idx = (this._prowlarr?.indexers || []).find(i => String(i.id) === String(id));
        if (!idx) return;
        testBtn.disabled = true;
        testBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:btn-spin 0.65s linear infinite"><path d="M12 2a10 10 0 0 1 10 10"/></svg>`;
        try {
          await this._callApi('POST', `arr_stack/prowlarr/idxtest?id=${idx.id||0}`, {});
          testBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,0.9)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
        } catch (_) {
          testBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,100,100,0.9)" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        }
        testBtn.disabled = false;
        return;
      }

      // Toggle enable/disable
      const toggleBtn = e.target.closest('.pw-toggle-btn');
      if (toggleBtn) {
        e.stopPropagation();
        const id  = toggleBtn.dataset.idxId;
        const idx = (this._prowlarr?.indexers || []).find(i => String(i.id) === String(id));
        if (!idx) return;
        // Loading state: clear span, show centered spinner
        toggleBtn.disabled = true;
        toggleBtn.style.background = 'rgba(150,150,165,0.4)';
        toggleBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="animation:btn-spin 0.65s linear infinite;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"><path d="M12 2a10 10 0 0 1 10 10"/></svg>`;
        const updated = { ...idx, enable: !idx.enable };
        try {
          await this._callApi('PUT', `arr_stack/prowlarr/indexer/${id}`, updated);
          idx.enable = !idx.enable;
          // Wait 1s for Prowlarr to process, then refresh status
          await new Promise(r => setTimeout(r, 1000));
          const status = await this._callApi('GET', 'arr_stack/prowlarr/indexerstatus').catch(() => []);
          const sm = {};
          for (const s of (status || [])) sm[s.indexerId] = s;
          (this._prowlarr?.indexers || []).forEach(i => { i._status = sm[i.id] || null; });
        } catch (_) {}
        if (!this._prowlarrModal) return;
        body.innerHTML = this._pwIndexersTabHtml(this._prowlarr?.indexers || [], this._prowlarrModal);
        this._pwWireIndexers(body, el);
        return;
      }

      // Edit
      const editBtn = e.target.closest('.pw-edit-btn');
      if (editBtn) {
        e.stopPropagation();
        const id = editBtn.dataset.idxId;
        await this._pwOpenEditIndexer(id, el);
        return;
      }

      // Delete
      const delBtn = e.target.closest('.pw-delete-btn');
      if (delBtn) {
        e.stopPropagation();
        const id   = delBtn.dataset.idxId;
        const name = delBtn.dataset.name;
        this._confirmInline(delBtn, () => this._pwDeleteIndexer(id, name, body, el), 'Delete indexer?');
        return;
      }

      // Row click → edit
      const row = e.target.closest('[data-pw-idx-id]');
      if (row && !e.target.closest('button')) {
        const id = row.dataset.pwIdxId;
        await this._pwOpenEditIndexer(id, el);
      }
    });
  }

  // Confirmation happens in the row before this is called.
  async _pwDeleteIndexer(id, name, body, el) {
    try {
      await this._callApi('DELETE', `arr_stack/prowlarr/indexer/${id}`);
      if (this._prowlarr) this._prowlarr.indexers = (this._prowlarr.indexers || []).filter(i => String(i.id) !== String(id));
    } catch (err) {
      alert('Delete failed: ' + (err?.body?.message || String(err)));
      return;
    }
    if (!this._prowlarrModal) return;
    body.innerHTML = this._pwIndexersTabHtml(this._prowlarr?.indexers || [], this._prowlarrModal);
    this._pwWireIndexers(body, el);
  }

}

export const wireProwlarrIndexersMixin = _WireProwlarrIndexersMethods.prototype;
