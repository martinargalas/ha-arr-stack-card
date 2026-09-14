// Tautulli, the graphs: their controls and chart cards. Split out of wire/tautulli.js.

class _WireTautulliGraphsMethods {

  // ── Graph controls wiring ─────────────────────────────────────────────────
  // Called after body render when graphs tab is active.
  // Also called from _wireTautulliModalBody for all tabs (no-ops if no els).

  _wireGraphControls(body) {
    // Same one-shot binding as _wireTautulliModalBody — this is called again
    // after every partial refresh.
    const _q  = sel => { const el = body.querySelector(sel); if (!el || el._tlWired) return null; el._tlWired = true; return el; };
    const _qa = sel => [...body.querySelectorAll(sel)].filter(el => { if (el._tlWired) return false; el._tlWired = true; return true; });
    if (!body) return;

    // The two inline groups place their fill the same way the header menu does:
    // measured onto the active button, once the markup is in the document.
    requestAnimationFrame(() => {
      for (const id of ['#tl-g-sub-nav', '#tl-g-metric-nav']) {
        const nav = body.querySelector(id);
        this._syncNavInd(nav, nav?.querySelector('.mt-nav-btn.is-on'));
      }
    });

    // Sub-tabs
    _qa('[data-tl-graph-sub]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const m = this._tautulliModal;
        if (!m) return;
        const newSub = btn.dataset.tlGraphSub;
        if (newSub === m.graphsSub) return;
        m.graphsSub   = newSub;
        m.graphsData  = null;
        // Range: switch between days / months
        if (newSub === 'totals') { if (m.graphsRange > 60) m.graphsRange = 12; }
        else                     { if (m.graphsRange <= 60 && m.graphsSub === 'totals') m.graphsRange = 30; }
        await this._tlRefetchGraphs(body);
      });
    });

    // Metric toggle
    _qa('[data-tl-g-metric]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const m = this._tautulliModal;
        if (!m) return;
        const v = btn.dataset.tlGMetric;
        if (v === m.graphsMetric) return;
        m.graphsMetric = v;
        m.graphsData   = null;
        await this._tlRefetchGraphs(body);
      });
    });

    // Range input — debounced on input, immediate on Enter/blur
    {
      let _gRangeTimer = null;
      const doRangeRefetch = async (inputEl) => {
        const m = this._tautulliModal;
        if (!m) return;
        const v = Math.max(1, parseInt(inputEl.value) || 1);
        m.graphsRange = v;
        m.graphsData  = null;
        await this._tlRefetchGraphs(body);
      };
      const rangeEl = body.querySelector('#tl-g-range');
      if (rangeEl) {
        rangeEl.addEventListener('input', e => {
          clearTimeout(_gRangeTimer);
          _gRangeTimer = setTimeout(() => doRangeRefetch(e.target), 700);
        });
        rangeEl.addEventListener('change', e => {
          clearTimeout(_gRangeTimer);
          doRangeRefetch(e.target);
        });
      }
    }

    // User dropdown toggle
    _q('#tl-g-dd-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      const m = this._tautulliModal;
      if (!m) return;
      m.graphsDdOpen = !m.graphsDdOpen;
      const panel = body.querySelector('#tl-g-dd-panel');
      if (panel) panel.style.display = m.graphsDdOpen ? 'block' : 'none';
    });

    // Close dropdown on outside click — bound once, like everything else here.
    if (!body._tlGDdClose) { body._tlGDdClose = true; body.addEventListener('click', e => {
      const m = this._tautulliModal;
      if (!m || !m.graphsDdOpen) return;
      if (!e.target.closest('#tl-g-dd-wrap')) {
        m.graphsDdOpen = false;
        const panel = body.querySelector('#tl-g-dd-panel');
        if (panel) panel.style.display = 'none';
      }
    }); }

    // Select All
    _q('#tl-g-dd-all')?.addEventListener('click', async e => {
      e.stopPropagation();
      const m = this._tautulliModal;
      if (!m) return;
      m.graphsSelectedUsers = null; // null = all
      m.graphsData = null;
      await this._tlRefetchGraphs(body);
    });

    // Deselect All
    _q('#tl-g-dd-none')?.addEventListener('click', async e => {
      e.stopPropagation();
      const m = this._tautulliModal;
      if (!m) return;
      m.graphsSelectedUsers = new Set();
      m.graphsData = null;
      await this._tlRefetchGraphs(body);
    });

    // Individual user toggle
    _qa('[data-tl-g-uid]').forEach(item => {
      item.addEventListener('click', async e => {
        e.stopPropagation();
        const m = this._tautulliModal;
        if (!m) return;
        const uid = item.dataset.tlGUid;
        const sel = m.graphsSelectedUsers;
        // Radio-style: click selected single user → back to all; else → exclusive
        if (sel && sel.size === 1 && sel.has(uid)) {
          m.graphsSelectedUsers = null; // back to all
        } else {
          m.graphsSelectedUsers = new Set([uid]); // exclusive
        }
        m.graphsData = null;
        m.graphsDdOpen = true; // keep open
        await this._tlRefetchGraphs(body);
        // Re-open dropdown
        const panel = body.querySelector('#tl-g-dd-panel');
        if (panel) panel.style.display = 'block';
      });
    });

    this._wireChartCards(body);
  }

  // ── Shared chart tooltip + SVG-fix wiring — used by Tautulli AND Tracearr ─

  _wireChartCards(body) {
    // Same one-shot binding as _wireTautulliModalBody — this is called again
    // after every partial refresh.
    const _q  = sel => { const el = body.querySelector(sel); if (!el || el._tlWired) return null; el._tlWired = true; return el; };
    const _qa = sel => [...body.querySelectorAll(sel)].filter(el => { if (el._tlWired) return false; el._tlWired = true; return true; });
    if (!body) return;

    const _tlGVBW = 1000;
    const _tlGRoundedTopJS = (x, y, w, h, rx, ry) => {
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (rx < 0.5 || ry < 0.5) return `M${x},${y+h} L${x},${y} L${x+w},${y} L${x+w},${y+h} Z`;
      const f = n => n.toFixed(2);
      return `M${f(x)},${f(y+h)} L${f(x)},${f(y+ry)} Q${f(x)},${f(y)} ${f(x+rx)},${f(y)} L${f(x+w-rx)},${f(y)} Q${f(x+w)},${f(y)} ${f(x+w)},${f(y+ry)} L${f(x+w)},${f(y+h)} Z`;
    };
    const fixSvgDots = (svg) => {
      const rect = svg.getBoundingClientRect();
      const svgW = rect.width, svgH = rect.height;
      if (!svgW || !svgH) return;
      // ry factor: corrects for non-uniform scaling from preserveAspectRatio=none
      // viewBox is 1000×200 (5:1). screen_rx = r*(W/1000), screen_ry = ry_vb*(H/200).
      // For round dot: ry_vb = r * (W/1000) / (H/200) = r * W / (5*H)
      const ryFactor = svgW / (5 * svgH);
      svg.querySelectorAll('circle').forEach(c => {
        const r  = parseFloat(c.getAttribute('r')) || 0;
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        el.setAttribute('cx', c.getAttribute('cx') || '0');
        el.setAttribute('cy', c.getAttribute('cy') || '0');
        el.setAttribute('rx', String(r));
        el.setAttribute('ry', String(r * ryFactor));
        el.setAttribute('data-tl-dot-r', String(r));
        const fill = c.getAttribute('fill'); if (fill) el.setAttribute('fill', fill);
        const styl = c.getAttribute('style'); if (styl) el.setAttribute('style', styl);
        c.parentNode.replaceChild(el, c);
      });
      svg.querySelectorAll('ellipse[data-tl-dot-r]').forEach(el => {
        const r = parseFloat(el.getAttribute('data-tl-dot-r')) || 0;
        el.setAttribute('ry', String(r * ryFactor));
      });
      svg.querySelectorAll('path[data-tl-rr]').forEach(p => {
        const rr = parseFloat(p.getAttribute('data-tl-rr')) || 0;
        const bx = parseFloat(p.getAttribute('data-tl-bx')) || 0;
        const by = parseFloat(p.getAttribute('data-tl-by')) || 0;
        const bw = parseFloat(p.getAttribute('data-tl-bw')) || 0;
        const bh = parseFloat(p.getAttribute('data-tl-bh')) || 0;
        p.setAttribute('d', _tlGRoundedTopJS(bx, by, bw, bh, rr, rr * ryFactor));
      });
    };
    requestAnimationFrame(() => {
      _qa('.tl-g-svg').forEach(svg => {
        fixSvgDots(svg);
        if (typeof ResizeObserver !== 'undefined') {
          const ro = new ResizeObserver(() => fixSvgDots(svg));
          ro.observe(svg);
        }
      });
    });

    _qa('.tl-g-card').forEach(card => {
      let activeCol = null;
      const tipEl   = card.querySelector('.tl-g-tip');
      if (!tipEl) return;

      const showColTip = (colData, eClientX, eClientY) => {
        if (!colData.vals || !colData.vals.length) return;
        const lbl  = colData.lbl || '';
        const rows = colData.vals.map(v => {
          const disp = v.fv != null ? v.fv : v.v;
          return `<div style="display:flex;align-items:center;gap:6px;padding:1px 0">
            <span style="width:6px;height:6px;border-radius:1px;background:${v.hex||'var(--is-text-muted)'};flex-shrink:0"></span>
            <span style="color:var(--is-text-muted)">${v.n}</span>
            <span style="font-weight:600;color:var(--is-text);margin-left:auto;padding-left:10px">${disp}</span>
          </div>`;
        }).join('');
        const totDisp = colData.ftot != null ? colData.ftot : colData.tot;
        const totRow  = totDisp != null
          ? `<div style="display:flex;justify-content:space-between;border-top:1px solid var(--is-divider);margin-top:4px;padding-top:4px">
               <span style="color:var(--is-text-muted);font-weight:600">${this._t('pwTotal')}</span>
               <span style="font-weight:700;color:var(--is-text)">${totDisp}</span>
             </div>` : '';
        tipEl.innerHTML = `<div style="font-size:10px;color:var(--is-text-muted);margin-bottom:4px">${lbl}</div>${rows}${totRow}`;
        const cardRect = tipEl.parentElement.getBoundingClientRect();
        const clickX   = eClientX - cardRect.left;
        let tipTop     = eClientY - cardRect.top - 8;
        tipEl.style.display = 'block'; tipEl.style.left = '0'; tipEl.style.top = '0';
        const tipW = tipEl.offsetWidth, tipH = tipEl.offsetHeight, contW = cardRect.width;
        // Position right of click; flip left if overflows
        let tipLeft = clickX + 12;
        if (tipLeft + tipW > contW - 4) tipLeft = clickX - tipW - 12;
        tipLeft = Math.max(4, tipLeft);
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

export const wireTautulliGraphsMixin = _WireTautulliGraphsMethods.prototype;
