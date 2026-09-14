import { isMobile } from '../shared/ui.js';

// Prowlarr, the History tab. Split out of wire/prowlarr.js.

class _WireProwlarrHistoryMethods {

  // ── History tab ──────────────────────────────────────────────────────────

  async _pwLoadHistory(body, el) {
    const m = this._prowlarrModal;
    if (!m) return;
    try {
      const data = await this._callApi('GET', `arr_stack/prowlarr/history?pageSize=200`);
      if (!this._prowlarrModal) return;
      m.histData   = data?.records || [];
      m.histTotal  = data?.totalRecords || m.histData.length;
    } catch (_) {
      if (!this._prowlarrModal) return;
      m.histData  = [];
      m.histTotal = 0;
    }
    m.histPage    = 0;
    m.histPerPage = 20;
    m.histSortDir = 'desc';
    body.innerHTML = this._pwHistoryTabHtml(m);
    this._pwWireHistory(body, el);
  }

  _pwHistoryTabHtml(m) {
    const isMob   = isMobile();
    const all     = m?.histData || [];
    const search  = (m?.histSearch || '').toLowerCase();
    const fIdx    = m?.histFilterIndexer || 'all';
    const fEvt    = m?.histFilterEvent   || 'all';
    const page    = m?.histPage    || 0;
    const perPage = m?.histPerPage || 20;
    const sortDir = m?.histSortDir || 'desc';

    let rows = [...all];
    if (search) rows = rows.filter(r => {
      const q = (r.data?.query || r.query || r.title || '').toLowerCase();
      return q.includes(search) || (r.indexer||'').toLowerCase().includes(search);
    });
    if (fIdx !== 'all') rows = rows.filter(r => String(r.indexerId) === fIdx);
    if (fEvt !== 'all') rows = rows.filter(r => r.eventType === fEvt);
    rows.sort((a, b) => {
      const da = new Date(a.date).getTime(), db = new Date(b.date).getTime();
      return sortDir === 'asc' ? da - db : db - da;
    });

    const totPages = Math.max(1, Math.ceil(rows.length / perPage));
    const pg       = Math.min(page, totPages - 1);
    const paged    = rows.slice(pg * perPage, (pg + 1) * perPage);


    const indexers = this._prowlarr?.indexers || [];
    const idxOpts  = indexers.map(i => `<option value="${i.id}"${String(i.id)===fIdx?' selected':''}>${this._escHtml(i.name||'—')}</option>`).join('');
    const toolbar = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-shrink:0">${
      this._uiBar('pw-hist-search', m?.histSearch || '', [
        { id: 'pw-hist-idx', kind: 'indexer', value: fIdx, items: [['all', this._t('pwAllIdx')], ...(this._prowlarr?.indexers || []).map(i => [i.id, i.name || '—'])] },
        { id: 'pw-hist-evt', kind: 'event',   value: fEvt, items: [['all', this._t('pwAllEvents')], ['indexerQuery', this._t('musSearch')], ['releaseGrabbed', this._t('pwGrab')], ['indexerRss', 'RSS']] },
      ], [])}</div>`;

    const catColor = id => {
      if (id >= 5000 && id < 6000) return 'rgba(99,140,255,0.85)';
      if (id >= 2000 && id < 3000) return 'rgba(52,211,153,0.85)';
      if (id >= 3000 && id < 4000) return 'rgba(251,191,36,0.85)';
      if (id >= 1000 && id < 2000) return 'rgba(168,85,247,0.85)';
      if (id >= 4000 && id < 5000) return 'rgba(99,200,255,0.85)';
      if (id >= 6000 && id < 7000) return 'rgba(251,113,133,0.85)';
      if (id >= 7000 && id < 8000) return 'rgba(180,140,100,0.85)';
      return 'rgba(140,140,140,0.85)';
    };
    const CAT_NAMES = {1000:this._t('pwConsole'),2000:this._t('tabMovies'),3000:this._t('pwAudio'),4000:'PC',5000:'TV',6000:'XXX',7000:this._t('pwBooks'),8000:this._t('pwOther')};
    const normCats = r => {
      // Handle all known formats: array of objects, array of ints, comma/pipe-separated string
      let raw = [];
      if (Array.isArray(r.categories) && r.categories.length) raw = r.categories;
      else if (Array.isArray(r.data?.categories) && r.data.categories.length) raw = r.data.categories;
      else {
        const catStr = r.data?.categories ?? r.data?.Categories ?? r.data?.category ?? '';
        if (typeof catStr === 'string' && catStr)
          raw = catStr.split(/[,|;]/).map(s => s.trim()).filter(Boolean).map(Number).filter(n => !isNaN(n) && n > 0);
        else if (typeof catStr === 'number' && catStr > 0) raw = [catStr];
      }
      return raw.map(c => typeof c === 'object' && c !== null ? c : { id: Number(c), name: CAT_NAMES[Math.floor(Number(c)/1000)*1000] || String(c) });
    };
    const catChips = r => {
      const cats = normCats(r);
      if (!cats.length) return '';
      const seen = new Set();
      return cats.filter(c => { const k = Math.floor(c.id/1000)*1000; if (seen.has(k)) return false; seen.add(k); return true; })
        .map(c => this._uiBadge(this._escHtml(c.name || String(c.id)), 'neutral', { extra: 'margin-right:2px' }))
        .join('');
    };
    const fmtDate = d => {
      try {
        const dt  = new Date(d), now = new Date();
        if (dt.toDateString() === now.toDateString())
          return dt.toLocaleTimeString(this._locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        return dt.toLocaleDateString(this._locale, { month: 'short', day: 'numeric' }) + ' ' +
               dt.toLocaleTimeString(this._locale, { hour: '2-digit', minute: '2-digit' });
      } catch { return d; }
    };
    const fmtElapsed = r => {
      const ms = r.data?.elapsed ?? r.data?.elapsedTime ?? r.data?.responseTime;
      return ms != null ? `${Math.round(Number(ms))}ms` : '—';
    };
    const fmtQuery  = r => r.data?.query || r.query || r.title || '';
    const fmtParams = r => {
      if (!r.data) return '';
      const skip = new Set(['query','queryType','elapsed','elapsedTime','responseTime','source','host','downloadUrl','tvdbId','imdbId','tmdbId','indexerFlags','limit','offset']);
      return Object.entries(r.data).filter(([k,v]) => !skip.has(k) && v !== '' && v != null).map(([k,v]) => `${k}=${v}`).join(', ');
    };
    // A bare arrow: the button already draws the circle, and a ringed glyph
    // inside a round button read as two circles.

    // ── Desktop table ───────────────────────────────────────────────────────
    if (!isMob) {
      const thBase  = 'padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left;white-space:nowrap';
      const dateArrow = `<span style="margin-left:2px">${sortDir==='asc'?'↑':'↓'}</span>`;
      const trs = paged.map((r, i) => {
        const alt = i % 2 === 1 ? 'background:rgba(255,255,255,0.025)' : '';
        return `<tr style="${alt}">
          <td style="padding:7px 8px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--is-text)">${this._escHtml(indexers.find(i=>i.id===r.indexerId)?.name||r.indexer||'—')}</td>
          <td style="padding:7px 8px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--is-text-muted)">${this._escHtml(fmtQuery(r))}</td>
          <td style="padding:7px 8px;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--is-text-muted)">${this._escHtml(fmtParams(r))}</td>
          <td style="padding:7px 8px;overflow:hidden;white-space:nowrap">${catChips(r)}</td>
          <td style="padding:7px 8px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--is-text-muted)">${fmtDate(r.date)}</td>
          <td style="padding:7px 8px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--is-text-muted);text-align:right">${fmtElapsed(r)}</td>
        </tr>`;
      }).join('') || `<tr><td colspan="6" class="u-empty-lg">${this._t('tlNoHistory')}</td></tr>`;
      const pagHtml = totPages > 1 ? this._uiPager('pw-hist-page', pg, totPages) : '';
      return `${toolbar}<div class="pw-hist-results-wrap" style="display:contents"><div class="u-flex-ovh">
        <table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <thead>
            <tr>
              <th style="${thBase};width:130px">${this._t('actColIndexer')}</th>
              <th style="${thBase};width:120px">${this._t('pwQuery')}</th>
              <th style="${thBase}">${this._t('pwParams')}</th>
              <th style="${thBase};width:90px">${this._t('pwCategories')}</th>
              <th data-pw-hist-sort="date" style="${thBase};width:125px;cursor:pointer;user-select:none">${this._t('actColDate')} ${dateArrow}</th>
              <th style="${thBase};width:90px;text-align:right">${this._t('pwElapsed')}</th>
            </tr>
          </thead>
          <tbody>${trs}</tbody>
        </table>
      </div><div style="flex-shrink:0">${pagHtml}</div></div>`;
    }

    // ── Mobile list ─────────────────────────────────────────────────────────
    const listRows = paged.map((r, i) => {
      const sep = i > 0 ? 'border-top:1px solid var(--is-divider);' : '';
      return `<div style="${sep}padding:8px 0;display:flex;align-items:flex-start;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(indexers.find(i=>i.id===r.indexerId)?.name||r.indexer||'—')}</div>
          <div style="font-size:11px;color:var(--is-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px">${this._escHtml(fmtQuery(r)||'—')}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap">
            ${catChips(r)}
            <span class="u-xs-muted">${fmtDate(r.date)}</span>
            <span class="u-xs-muted">${fmtElapsed(r)}</span>
          </div>
        </div>
      </div>`;
    }).join('') || `<div class="u-empty-lg">${this._t('tlNoHistory')}</div>`;
    const pagHtml = totPages > 1 ? this._uiPager('pw-hist-page', pg, totPages) : '';
    return `${toolbar}<div class="pw-hist-results-wrap" style="display:contents"><div class="u-flex-ovh">${listRows}</div><div style="flex-shrink:0">${pagHtml}</div></div>`;
  }

  _pwWireHistory(body, el) {
    const rerender = () => {
      if (!this._prowlarrModal) return;
      body.innerHTML = this._pwHistoryTabHtml(this._prowlarrModal);
      this._pwWireHistory(body, el);
    };

    // A fixed 20 rows per page left the last one sliced in half — measure what
    // actually fits and page by that instead.
    requestAnimationFrame(() => {
      const m = this._prowlarrModal;
      if (!m) return;
      const wrap = body.querySelector('.u-flex-ovh');
      const row  = wrap?.querySelector('tbody tr') || wrap?.firstElementChild;
      if (!wrap || !row) return;
      const rowH  = row.getBoundingClientRect().height;
      const headH = wrap.querySelector('thead')?.getBoundingClientRect().height || 0;
      if (rowH < 4) return;
      const fit = Math.max(4, Math.floor((wrap.clientHeight - headH) / rowH));
      if (fit === m.histPerPage) return;
      m.histPerPage = fit;
      m.histPage = Math.min(m.histPage || 0, Math.max(0, Math.ceil((m.histData?.length || 0) / fit) - 1));
      rerender();
    });

    body.querySelector('#pw-hist-search')?.addEventListener('input', e => {
      if (!this._prowlarrModal) return;
      this._prowlarrModal.histSearch = e.target.value;
      this._prowlarrModal.histPage   = 0;
      // Patch only the results subtree — keeps #pw-hist-search untouched so the iOS
      // keyboard stays open while typing (recreating the input node closes it).
      this._patchResultsWrap(body, 'pw-hist-results-wrap', () => this._pwHistoryTabHtml(this._prowlarrModal));
      this._pwWireHistory(body, el);
    });
    body.querySelector('#pw-hist-idx')?.addEventListener('change', e => {
      if (!this._prowlarrModal) return;
      this._prowlarrModal.histFilterIndexer = e.target.value;
      this._prowlarrModal.histPage = 0;
      rerender();
    });
    body.querySelector('#pw-hist-evt')?.addEventListener('change', e => {
      if (!this._prowlarrModal) return;
      this._prowlarrModal.histFilterEvent = e.target.value;
      this._prowlarrModal.histPage = 0;
      rerender();
    });

    // Date sort
    body.querySelector('[data-pw-hist-sort="date"]')?.addEventListener('click', () => {
      if (!this._prowlarrModal) return;
      this._prowlarrModal.histSortDir = (this._prowlarrModal.histSortDir || 'desc') === 'desc' ? 'asc' : 'desc';
      this._prowlarrModal.histPage = 0;
      rerender();
    });

    // Pagination + info button — use .onclick (not addEventListener) to avoid stacking on rerender
    body.onclick = e => {
      if (!this._prowlarrModal) return;
      const pBtn = e.target.closest('[data-pw-hist-page]');
      if (pBtn) {
        const m   = this._prowlarrModal;
        const all = m.histData || [];
        const search = (m.histSearch||'').toLowerCase();
        const fIdx = m.histFilterIndexer||'all', fEvt = m.histFilterEvent||'all';
        let filtered = [...all];
        if (search) filtered = filtered.filter(r => { const q=(r.data?.query||r.query||r.title||'').toLowerCase(); return q.includes(search)||(r.indexer||'').toLowerCase().includes(search); });
        if (fIdx!=='all') filtered = filtered.filter(r => String(r.indexerId)===fIdx);
        if (fEvt!=='all') filtered = filtered.filter(r => r.eventType===fEvt);
        const tot = Math.max(1, Math.ceil(filtered.length / (m.histPerPage || 20)));
        const p   = pBtn.dataset.pwHistPage, cur = m.histPage || 0;
        const np  = p==='first'?0:p==='prev'?Math.max(0,cur-1):p==='next'?Math.min(tot-1,cur+1):p==='last'?tot-1:(parseInt(p)||0);
        if (np !== cur) { m.histPage = np; rerender(); }
        return;
      }
    };
  }

}

export const wireProwlarrHistoryMixin = _WireProwlarrHistoryMethods.prototype;
