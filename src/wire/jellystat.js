// ──────────────────────────────────────────────────────────────────────────
// Jellystat wire — poster clicks + modal event handling
// ──────────────────────────────────────────────────────────────────────────

class _WireJellystatMethods {

  _wireJellystatModal(el) {
    el.querySelector('#js-close')?.addEventListener('click', () => this._closeJellystatModal());
    el.addEventListener('click', e => {
      if (e.target === el) this._closeJellystatModal();
    });
    // Delegated on the header area: the nav is rewritten whenever the tab
    // changes, because on a phone only the active tab carries its label.
    el.querySelector('#js-nav-area')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-js-tab]');
      if (!btn || !this._jellystatModal) return;
      const t = btn.dataset.jsTab;
      if (!t || t === this._jellystatModal.tab) return;
      const from = this._navIndRect(el.querySelector('#js-nav'));
      this._jellystatModal.tab = t;
      el.querySelector('#js-nav-area').innerHTML = this._jsNavHtml(t);
      const nav = el.querySelector('#js-nav');
      this._syncNavInd(nav, nav?.querySelector('.mt-nav-btn[data-js-tab="' + t + '"]'), from);
      this._markActivated();
      this._jsLoadTab(t, el);
    });
    requestAnimationFrame(() => {
      const nav = el.querySelector('#js-nav');
      this._syncNavInd(nav, nav?.querySelector('.mt-nav-btn.is-on'));
    });
  }

  _wireJellystatModalBody(body) {
    // Runs again after every partial refresh, and the toolbar's nodes survive
    // those — binding them twice would stack listeners. Each node binds once.
    const _q  = sel => { const el = body.querySelector(sel); if (!el || el._jsWired) return null; el._jsWired = true; return el; };
    const _qa = sel => [...body.querySelectorAll(sel)].filter(el => { if (el._jsWired) return false; el._jsWired = true; return true; });

    if (!body._jsSelSync) {
      body._jsSelSync = true;
      body.addEventListener('change', e => this._tbSyncSelect(e.target));
    }
    // ── Libraries: search ─────────────────────────────────────────────────
    _q('#js-libs-search')?.addEventListener('input', e => {
      if (!this._jellystatModal) return;
      this._jellystatModal.libsSearch = e.target.value || '';
      this._jellystatModal.libsPage   = 0;
      // Patch only the results subtree — keeps #js-libs-search untouched so the iOS
      // keyboard stays open while typing (recreating the input node closes it).
      this._patchResultsWrap(body, 'js-libs-results-wrap', () => this._jsBodyLibraries());
      this._wireJellystatModalBody(body);
    });

    // ── Libraries: sort ───────────────────────────────────────────────────
    _qa('[data-js-lib-sort]').forEach(th => {
      th.addEventListener('click', () => {
        if (!this._jellystatModal) return;
        const col = th.dataset.jsLibSort;
        if (this._jellystatModal.libsSortCol === col) {
          this._jellystatModal.libsSortDir = this._jellystatModal.libsSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this._jellystatModal.libsSortCol = col;
          this._jellystatModal.libsSortDir = 'desc';
        }
        this._jellystatModal.libsPage = 0;
        body.innerHTML = this._jsBodyLibraries();
        this._wireJellystatModalBody(body);
      });
    });

    // ── Libraries: pagination ─────────────────────────────────────────────
    _qa('[data-js-lpage]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._jellystatModal) return;
        const m          = this._jellystatModal;
        const perPage    = this._tlCalcPerPage();
        const totalPages = Math.max(1, Math.ceil((m.libsData?.length || 0) / perPage));
        const val = btn.dataset.jsLpage;
        let p = m.libsPage || 0;
        if      (val === 'first') p = 0;
        else if (val === 'prev')  p = Math.max(0, p - 1);
        else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
        else if (val === 'last')  p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.libsPage) return;
        m.libsPage = p;
        body.innerHTML = this._jsBodyLibraries();
        this._wireJellystatModalBody(body);
      });
    });

    // ── Libraries: column picker ──────────────────────────────────────────
    _q('#js-libs-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.libsColsOpen = !this._jellystatModal.libsColsOpen;
      const menu = body.querySelector('#js-libs-cols-menu');
      if (menu) menu.style.display = this._jellystatModal.libsColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });
    _qa('[data-js-lib-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden('libsHiddenCols', ['type']);
        const col = item.dataset.jsLibCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.libsColsOpen = true;
        body.innerHTML = this._jsBodyLibraries();
        this._wireJellystatModalBody(body);
      });
    });
    _q('#js-libs-mob-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.libsMobColsOpen = !this._jellystatModal.libsMobColsOpen;
      const menu = body.querySelector('#js-libs-mob-cols-menu');
      if (menu) menu.style.display = this._jellystatModal.libsMobColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });
    _qa('[data-js-lib-mob-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden('libsMobHiddenCols', ['type']);
        const col = item.dataset.jsLibMobCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.libsMobColsOpen = true;
        body.innerHTML = this._jsBodyLibraries();
        this._wireJellystatModalBody(body);
      });
    });

    // ── Users: search ─────────────────────────────────────────────────────
    _q('#js-users-search')?.addEventListener('input', e => {
      if (!this._jellystatModal) return;
      this._jellystatModal.usersSearch = e.target.value || '';
      this._jellystatModal.usersPage   = 0;
      // Patch only the results subtree — keeps #js-users-search untouched so the iOS
      // keyboard stays open while typing (recreating the input node closes it).
      this._patchResultsWrap(body, 'js-users-results-wrap', () => this._jsBodyUsers());
      this._wireJellystatModalBody(body);
    });

    // ── Users: sort ───────────────────────────────────────────────────────
    _qa('[data-js-sort]').forEach(th => {
      th.addEventListener('click', () => {
        if (!this._jellystatModal) return;
        const col = th.dataset.jsSort;
        if (this._jellystatModal.usersSortCol === col) {
          this._jellystatModal.usersSortDir = this._jellystatModal.usersSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this._jellystatModal.usersSortCol = col;
          this._jellystatModal.usersSortDir = 'desc';
        }
        this._jellystatModal.usersPage = 0;
        body.innerHTML = this._jsBodyUsers();
        this._wireJellystatModalBody(body);
      });
    });

    // ── Users: pagination ─────────────────────────────────────────────────
    _qa('[data-js-upage]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._jellystatModal) return;
        const m          = this._jellystatModal;
        const perPage    = this._tlCalcPerPage();
        const totalPages = Math.max(1, Math.ceil((m.usersData?.length || 0) / perPage));
        const val = btn.dataset.jsUpage;
        let p = m.usersPage || 0;
        if      (val === 'first') p = 0;
        else if (val === 'prev')  p = Math.max(0, p - 1);
        else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
        else if (val === 'last')  p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.usersPage) return;
        m.usersPage = p;
        body.innerHTML = this._jsBodyUsers();
        this._wireJellystatModalBody(body);
      });
    });

    // ── Users: column picker ──────────────────────────────────────────────
    _q('#js-users-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.usersColsOpen = !this._jellystatModal.usersColsOpen;
      const menu = body.querySelector('#js-users-cols-menu');
      if (menu) menu.style.display = this._jellystatModal.usersColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });
    _qa('[data-js-usr-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden('usersHiddenCols', ['userId']);
        const col = item.dataset.jsUsrCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.usersColsOpen = true;
        body.innerHTML = this._jsBodyUsers();
        this._wireJellystatModalBody(body);
      });
    });
    _q('#js-users-mob-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.usersMobColsOpen = !this._jellystatModal.usersMobColsOpen;
      const menu = body.querySelector('#js-users-mob-cols-menu');
      if (menu) menu.style.display = this._jellystatModal.usersMobColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });
    _qa('[data-js-usr-mob-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden('usersMobHiddenCols', ['lastSeen','userId']);
        const col = item.dataset.jsUsrMobCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.usersMobColsOpen = true;
        body.innerHTML = this._jsBodyUsers();
        this._wireJellystatModalBody(body);
      });
    });

    // ── History: user filter ──────────────────────────────────────────────
    _q('#js-hist-user-sel')?.addEventListener('change', async e => {
      if (!this._jellystatModal) return;
      this._jellystatModal.histUser = e.target.value || null;
      this._jellystatModal.histPage = 0;
      await this._jsRefetchHistory(body);
    });

    // ── History: play method filter ───────────────────────────────────────
    // A picker now, not four toggles: an empty value means "no filter".
    _q('#js-hist-pm')?.addEventListener('change', async e => {
      if (!this._jellystatModal) return;
      this._jellystatModal.histPlayMethod = e.target.value || null;
      this._jellystatModal.histPage = 0;
      await this._jsRefetchHistory(body);
    });

    // ── History: search ───────────────────────────────────────────────────
    {
      let _jsHistTimer = null;
      _q('#js-hist-search')?.addEventListener('input', e => {
        if (!this._jellystatModal) return;
        this._jellystatModal.histSearch = e.target.value || '';
        this._jellystatModal.histPage   = 0;
        clearTimeout(_jsHistTimer);
        _jsHistTimer = setTimeout(async () => {
          const inp0 = body.querySelector('#js-hist-search');
          const sel0 = inp0?.selectionStart ?? null;
          await this._jsRefetchHistory(body);
          const inp = body.querySelector('#js-hist-search');
          if (inp && sel0 !== null) { inp.focus(); inp.setSelectionRange(sel0, sel0); }
        }, 400);
      });
    }

    // ── History: pagination ───────────────────────────────────────────────
    _qa('[data-js-hpage]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._jellystatModal) return;
        const m          = this._jellystatModal;
        const perPage    = this._tlCalcPerPage({ hasFilter: true });
        const totalPages = Math.max(1, Math.ceil(m.histTotal / perPage));
        const val = btn.dataset.jsHpage;
        let p = m.histPage || 0;
        if      (val === 'first') p = 0;
        else if (val === 'prev')  p = Math.max(0, p - 1);
        else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
        else if (val === 'last')  p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.histPage) return;
        m.histPage = p;
        await this._jsRefetchHistory(body);
      });
    });

    // ── History: column picker ────────────────────────────────────────────
    _q('#js-hist-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.histColsOpen = !this._jellystatModal.histColsOpen;
      const menu = body.querySelector('#js-hist-cols-menu');
      if (menu) menu.style.display = this._jellystatModal.histColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });
    _qa('[data-js-hist-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden('histHiddenCols', ['playMethod']);
        const col = item.dataset.jsHistCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.histColsOpen = true;
        body.innerHTML = this._jsBodyHistory();
        this._wireJellystatModalBody(body);
      });
    });
    _q('#js-hist-mob-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._jellystatModal) return;
      this._jellystatModal.histMobColsOpen = !this._jellystatModal.histMobColsOpen;
      const menu = body.querySelector('#js-hist-mob-cols-menu');
      if (menu) menu.style.display = this._jellystatModal.histMobColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });
    _qa('[data-js-hist-mob-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._jellystatModal) return;
        const hidden = this._jsHidden('histMobHiddenCols', ['client','device','playMethod']);
        const col = item.dataset.jsHistMobCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._jsSaveColPrefs();
        this._jellystatModal.histMobColsOpen = true;
        body.innerHTML = this._jsBodyHistory();
        this._wireJellystatModalBody(body);
      });
    });

    // ── Graphs controls ───────────────────────────────────────────────────
    this._wireJsGraphControls(body);
  }

  // ── Graph controls ────────────────────────────────────────────────────────

  _wireJsGraphControls(body) {
    // Same one-shot binding as _wireJellystatModalBody.
    const _q  = sel => { const el = body.querySelector(sel); if (!el || el._jsWired) return null; el._jsWired = true; return el; };
    const _qa = sel => [...body.querySelectorAll(sel)].filter(el => { if (el._jsWired) return false; el._jsWired = true; return true; });

    // The inline group places its fill the way the header menu does: measured
    // onto the active button, once the markup is in the document.
    requestAnimationFrame(() => {
      const nav = body.querySelector('#js-g-metric-nav');
      this._syncNavInd(nav, nav?.querySelector('.mt-nav-btn.is-on'));
    });
    if (!body) return;

    // Metric toggle
    _qa('[data-js-g-metric]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const m = this._jellystatModal;
        if (!m) return;
        const v = btn.dataset.jsGMetric;
        if (v === m.graphsMetric) return;
        m.graphsMetric = v;
        m.graphsData   = null;
        await this._jsRefetchGraphs(body);
      });
    });

    // Range input — debounced
    {
      let _jsRangeTimer = null;
      const doRangeRefetch = async (inputEl) => {
        const m = this._jellystatModal;
        if (!m) return;
        m.graphsRange = Math.max(1, parseInt(inputEl.value) || 1);
        m.graphsData  = null;
        await this._jsRefetchGraphs(body);
      };
      const rangeEl = body.querySelector('#js-g-range');
      if (rangeEl) {
        rangeEl.addEventListener('input', e => {
          clearTimeout(_jsRangeTimer);
          _jsRangeTimer = setTimeout(() => doRangeRefetch(e.target), 700);
        });
        rangeEl.addEventListener('change', e => {
          clearTimeout(_jsRangeTimer);
          doRangeRefetch(e.target);
        });
      }
    }

    // Fix oval dots / rounded bar corners (same fix as tautulli)
    const _VBW = 1000, _SVH = 200;
    const _fixTop = (x, y, w, h, rx, ry) => {
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (rx < 0.5 || ry < 0.5) return 'M' + x + ',' + (y+h) + ' L' + x + ',' + y + ' L' + (x+w) + ',' + y + ' L' + (x+w) + ',' + (y+h) + ' Z';
      const f = n => n.toFixed(2);
      return 'M' + f(x) + ',' + f(y+h) + ' L' + f(x) + ',' + f(y+ry) + ' Q' + f(x) + ',' + f(y) + ' ' + f(x+rx) + ',' + f(y) + ' L' + f(x+w-rx) + ',' + f(y) + ' Q' + f(x+w) + ',' + f(y) + ' ' + f(x+w) + ',' + f(y+ry) + ' L' + f(x+w) + ',' + f(y+h) + ' Z';
    };
    const fixSvg = (svg) => {
      const svgW = svg.getBoundingClientRect().width;
      if (!svgW) return;
      const scaleX = svgW / _VBW;
      svg.querySelectorAll('circle').forEach(c => {
        const r  = parseFloat(c.getAttribute('r')) || 0;
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        el.setAttribute('cx', c.getAttribute('cx') || '0');
        el.setAttribute('cy', c.getAttribute('cy') || '0');
        el.setAttribute('rx', String(r));
        el.setAttribute('ry', String(r * scaleX));
        el.setAttribute('data-js-dot-r', String(r));
        const fill = c.getAttribute('fill'); if (fill) el.setAttribute('fill', fill);
        const styl = c.getAttribute('style'); if (styl) el.setAttribute('style', styl);
        c.parentNode.replaceChild(el, c);
      });
      svg.querySelectorAll('ellipse[data-js-dot-r]').forEach(el => {
        const r = parseFloat(el.getAttribute('data-js-dot-r')) || 0;
        el.setAttribute('ry', String(r * scaleX));
      });
      svg.querySelectorAll('path[data-tl-rr]').forEach(p => {
        const rr = parseFloat(p.getAttribute('data-tl-rr')) || 0;
        const bx = parseFloat(p.getAttribute('data-tl-bx')) || 0;
        const by = parseFloat(p.getAttribute('data-tl-by')) || 0;
        const bw = parseFloat(p.getAttribute('data-tl-bw')) || 0;
        const bh = parseFloat(p.getAttribute('data-tl-bh')) || 0;
        p.setAttribute('d', _fixTop(bx, by, bw, bh, rr, rr * scaleX));
      });
    };
    requestAnimationFrame(() => {
      _qa('.tl-g-svg').forEach(svg => {
        fixSvg(svg);
        if (typeof ResizeObserver !== 'undefined') {
          const ro = new ResizeObserver(() => fixSvg(svg));
          ro.observe(svg);
        }
      });
    });

    // Bar/line chart tooltips (reuse same logic as tautulli)
    _qa('.tl-g-card').forEach(card => {
      let activeCol = null;
      const tipEl   = card.querySelector('.tl-g-tip');
      if (!tipEl) return;

      const showColTip = (colData, eClientX, eClientY) => {
        if (!colData.vals || !colData.vals.length) return;
        // The attribute decodes back to the raw names, so they are text again here.
        const esc  = s => this._escHtml(s ?? '');
        const lbl  = esc(colData.lbl || '');
        const rows = colData.vals.map(v => {
          const disp = esc(v.fv != null ? v.fv : v.v);
          return '<div style="display:flex;align-items:center;gap:6px;padding:1px 0"><span style="width:6px;height:6px;border-radius:1px;background:' + esc(v.hex || 'var(--is-text-muted)') + ';flex-shrink:0"></span><span style="color:var(--is-text-muted)">' + esc(v.n) + '</span><span style="font-weight:600;color:var(--is-text);margin-left:auto;padding-left:10px">' + disp + '</span></div>';
        }).join('');
        const totDisp = colData.ftot != null ? esc(colData.ftot) : colData.tot != null ? esc(colData.tot) : null;
        const totRow  = totDisp != null ? '<div style="display:flex;justify-content:space-between;border-top:1px solid var(--is-divider);margin-top:4px;padding-top:4px"><span style="color:var(--is-text-muted);font-weight:600">' + this._t('pwTotal') + '</span><span style="font-weight:700;color:var(--is-text)">' + totDisp + '</span></div>' : '';
        tipEl.innerHTML = '<div style="font-size:10px;color:var(--is-text-muted);margin-bottom:4px">' + lbl + '</div>' + rows + totRow;
        const cardRect = tipEl.parentElement.getBoundingClientRect();
        let tipLeft = eClientX - cardRect.left;
        let tipTop  = eClientY - cardRect.top - 8;
        tipEl.style.display = 'block'; tipEl.style.left = '0'; tipEl.style.top = '0';
        const tipW = tipEl.offsetWidth, tipH = tipEl.offsetHeight, contW = cardRect.width;
        tipLeft = Math.max(4, Math.min(tipLeft - tipW / 2, contW - tipW - 4));
        tipTop  = Math.max(4, tipTop - tipH);
        tipEl.style.left = tipLeft + 'px'; tipEl.style.top = tipTop + 'px';
      };

      const clearHighlights = () => card.querySelectorAll('.tl-g-lhlt').forEach(r => r.style.opacity = '0');
      const hideTip = () => { tipEl.style.display = 'none'; activeCol = null; clearHighlights(); };

      card.addEventListener('click', e => {
        const lcol = e.target.closest('.tl-g-lcol');
        if (lcol) {
          if (lcol === activeCol) { hideTip(); return; }
          clearHighlights();
          activeCol = lcol;
          const hlt = lcol.querySelector('.tl-g-lhlt');
          if (hlt) hlt.style.opacity = '1';
          let colData; try { colData = JSON.parse(lcol.dataset.tlGCol); } catch { return; }
          showColTip(colData, e.clientX, e.clientY);
          return;
        }
        const col = e.target.closest('.tl-g-col');
        if (!col || !col.dataset.tlGCol) { hideTip(); return; }
        if (col === activeCol) { hideTip(); return; }
        clearHighlights();
        activeCol = col;
        let colData; try { colData = JSON.parse(col.dataset.tlGCol); } catch { return; }
        showColTip(colData, e.clientX, e.clientY);
      });
    });
  }
}

export const wireJellystatMixin = _WireJellystatMethods.prototype;
