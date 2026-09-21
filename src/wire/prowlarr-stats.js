import { dayClass, isMobile } from '../shared/ui.js';

// Prowlarr, the Stats tab and its charts. Split out of wire/prowlarr.js.

class _WireProwlarrStatsMethods {

  // ── Stats tab ────────────────────────────────────────────────────────────

  async _pwLoadStats(body, el) {
    const m = this._prowlarrModal;
    if (!m) return;
    // Make body a flex column so flex:1 children fill the available height
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    // Fetch stats for selected range (default 7 days)
    const days    = m.statsRange || 30;
    const endDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const startDt = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    try {
      const stats = await this._callApi('GET', `arr_stack/prowlarr/indexerstats?startDate=${startDt}&endDate=${endDate}`);
      if (!this._prowlarrModal) return;
      m.statsData = stats;
    } catch (_) {
      if (!this._prowlarrModal) return;
      m.statsData = null;
    }
    body.innerHTML = this._pwStatsTabHtml(m);
    this._pwWireStats(body, el);
  }

  _pwStatsTabHtml(m) {
    const isMob  = isMobile();
    const data   = m?.statsData;
    const days   = m?.statsRange || 30;
    const page   = m?.statsPage || 0;

    // Two views of the same stats — a header-menu group, as everywhere else.
    const pageBtns = `<span class="mt-nav mt-nav--inline"><span class="mt-nav-ind"></span>
      <button class="mt-nav-btn${page===0?' is-on':''}" data-pw-stats-page="0">${this._t('pwIdxPerf')}</button>
      <button class="mt-nav-btn${page===1?' is-on':''}" data-pw-stats-page="1">${this._t('pwAppBreakdown')}</button>
    </span>`;
    // In a capsule at the right edge, like the modal's own header menu.
    // A phone keeps these at the left edge — pushed right they sat under the
    // thumb's shadow with the screen's whole width empty beside them.
    const controls = `<div style="display:flex;align-items:center;justify-content:${isMob ? 'flex-start' : 'flex-end'};gap:8px;margin-bottom:10px;flex-shrink:0">
      <div class="mt-tb mt-tb--card" style="min-height:34px;padding:0 3px;gap:4px;flex-shrink:0">${pageBtns}</div>
    </div>`;

    if (!data) {
      return controls + `<div class="u-empty-lg">${this._t('tlNoData')}</div>`;
    }

    const indexers   = data.indexers   || [];
    const userAgents = data.userAgents || [];

    // Summary chips
    const activeIdx  = indexers.length || (this._prowlarr?.indexers || []).filter(i => i.enable).length;
    const totalQ     = indexers.reduce((s, i) => s + (i.numberOfQueries||0) + (i.numberOfFailedQueries||0) + (i.numberOfRssQueries||0) + (i.numberOfFailedRssQueries||0) + (i.numberOfAuthQueries||0) + (i.numberOfFailedAuthQueries||0), 0);
    const totalG     = indexers.reduce((s, i) => s + (i.numberOfGrabs   || 0), 0);
    const totalApps  = userAgents.length;
    const fmtNum     = n => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

    const chips = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:${isMob?'4px':'8px'};margin-bottom:${isMob?'6px':'10px'};flex-shrink:0">
      ${[[this._t('pwIndexers'), activeIdx], [this._t('pwQueries'), fmtNum(totalQ)], [this._t('pwGrabs'), fmtNum(totalG)], [this._t('pwApps'), totalApps]].map(([l, v]) =>
        `<div style="background:var(--is-btn-bg);border:1px solid var(--is-divider);border-radius:${isMob?'6px':'8px'};padding:${isMob?'4px 6px':'7px 10px'}">
          <div style="font-size:${isMob?'8px':'9px'};color:var(--is-text-muted);margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l}</div>
          <div style="font-size:${isMob?'12px':'15px'};font-weight:700;color:var(--is-text)">${v}</div>
        </div>`
      ).join('')}
    </div>`;

    // Page 0: Response time + Queries breakdown + Failure Rate
    // Page 1: User agent queries + grabs
    const pagContent = page === 0
      ? this._pwStatsPage0(indexers, isMob)
      : this._pwStatsPage1(indexers, userAgents, isMob);

    return `${controls}${chips}<div style="flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0">${pagContent}</div>`;
  }

  _pwStatsPage0(indexers, isMob) {
    if (!indexers.length) return `<div class="u-empty-lg">${this._t('pwNoIdxData')}</div>`;

    const CHART_H = isMob ? 110 : 130;
    const hLimit  = isMob ? 4 : 8;

    const mkLegend = (secs) => secs.filter(s=>s.label).map(s=>
      `<span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;color:var(--is-text-muted)"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color};flex-shrink:0"></span>${s.label}</span>`
    ).join('');
    const vBarChart = (items, maxVal, sections, nameFn) => {
      if (!items.length) return '<div style="color:var(--is-text-muted);font-size:11px;padding:8px 0">' + this._t('tlNoData') + '</div>';
      const fmtV = v => v >= 1000 ? (v/1000).toFixed(1).replace(/\.0$/, '')+'K' : Math.round(v).toString();
      // ── Mobile: horizontal bars ──────────────────────────────────────────
      if (isMob) {
        return items.map(item => {
          const vals   = sections.map(s => Math.max(0, s.fn(item) || 0));
          const tot    = vals.reduce((a,b) => a+b, 0);
          const lbl    = fmtV(tot);
          const barVals = JSON.stringify(sections.map((s,i)=>({label:s.label||'',val:vals[i],color:s.color})));
          // stacked segments as proportional widths inside one bar
          const segs = sections.map((s,i) => {
            const w = tot > 0 ? Math.round(vals[i]/maxVal*100) : 0;
            return w > 0 ? `<div style="width:${w}%;height:100%;background:${s.gradient||s.color};min-width:2px"></div>` : '';
          }).join('');
          return `<div class="pw-stats-bar" data-bar-name="${this._escHtml(nameFn(item))}" data-bar-vals="${this._escHtml(barVals)}" style="margin-bottom:5px;cursor:pointer">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">
              <span style="font-size:9px;font-weight:500;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:75%">${this._escHtml(nameFn(item))}</span>
              <span style="font-size:8px;color:var(--is-text-muted);flex-shrink:0">${lbl}</span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;display:flex">${segs}</div>
          </div>`;
        }).join('');
      }
      // ── Desktop: vertical bars ───────────────────────────────────────────
      const N_TICKS = 4;
      const tickStep = maxVal / N_TICKS;
      const yLabels = Array.from({length: N_TICKS + 1}, (_,i) => N_TICKS - i).map(i =>
        `<div style="flex:1;display:flex;align-items:center;justify-content:flex-end"><span style="font-size:8px;color:var(--is-text-muted);line-height:1">${fmtV(i * tickStep)}</span></div>`
      ).join('');
      const gridlines = Array.from({length: N_TICKS + 1}, (_,i) =>
        `<div style="position:absolute;bottom:${i/N_TICKS*100}%;left:0;right:0;border-top:1px solid rgba(255,255,255,${i===0?'0.15':'0.06'})"></div>`
      ).join('');
      const barCols = items.map(item => {
        const vals    = sections.map(s => Math.max(0, s.fn(item) || 0));
        const tot     = vals.reduce((a,b) => a+b, 0);
        const lbl     = fmtV(tot);
        const barVals = JSON.stringify(sections.map((s,i)=>({label:s.label||'',val:vals[i],color:s.color})));
        const totPct  = maxVal > 0 ? Math.round(vals.reduce((a,b)=>a+b,0) / maxVal * 100) : 0;
        const secPcts = vals.map(v => (tot>0) ? Math.round(v/tot*100) : 0);
        return `<div class="pw-stats-bar" data-bar-name="${this._escHtml(nameFn(item))}" data-bar-vals="${this._escHtml(barVals)}" style="flex:1;min-width:0;position:relative;cursor:pointer;overflow:visible">
          ${tot > 0 ? `<div style="position:absolute;top:-14px;left:0;right:0;text-align:center;font-size:8px;font-weight:600;color:var(--is-text-muted);pointer-events:none">${lbl}</div>` : ''}
          <div style="position:absolute;bottom:0;left:22%;right:22%;height:${totPct}%;min-height:${tot>0?2:0}px;border-radius:3px 3px 0 0;overflow:hidden;display:flex;flex-direction:column">
            ${sections.map((s,i) => secPcts[i]>0 ? `<div style="flex:${secPcts[i]};background:${s.gradient||s.color};min-height:2px"></div>` : '').reverse().join('')}
          </div>
        </div>`;
      }).join('');
      const xLabels = items.map(item =>
        `<div style="flex:1;min-width:0;font-size:8px;color:var(--is-text-muted);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-top:4px">${this._escHtml(nameFn(item))}</div>`
      ).join('');
      return `<div style="flex:1;min-height:0;display:flex;gap:6px">
        <div style="width:32px;flex-shrink:0;display:flex;flex-direction:column;padding-bottom:22px;padding-top:14px">${yLabels}</div>
        <div style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column">
          <div style="flex:1;min-height:0;position:relative;padding-top:14px">
            <div style="position:absolute;top:14px;bottom:0;left:0;right:0">${gridlines}</div>
            <div style="position:absolute;top:14px;bottom:0;left:0;right:0;display:flex;align-items:stretch;gap:3px;padding:0 2px">${barCols}</div>
          </div>
          <div style="display:flex;gap:3px;padding:0 2px;flex-shrink:0">${xLabels}</div>
        </div>
      </div>`;
    };
    // ── Average Response Time (full width, stacked: queries blue + grabs yellow) ──
    const sortedRT  = [...indexers].sort((a,b) => ((b.averageResponseTime||0)+(b.averageGrabResponseTime||0)) - ((a.averageResponseTime||0)+(a.averageGrabResponseTime||0)));
    const maxRTtot  = Math.max(1, ...sortedRT.map(i => (i.averageResponseTime||0)+(i.averageGrabResponseTime||0)));
    const rtSections = [
      { fn: i => i.averageResponseTime     || 0, color: 'rgba(0,122,255,0.9)',  gradient: 'linear-gradient(to bottom, rgba(0,122,255,0.92) 0%, rgba(0,122,255,0.42) 100%)',  label: this._t('pwAvgQueries') },
      { fn: i => i.averageGrabResponseTime || 0, color: 'rgba(255,149,0,0.9)', gradient: 'linear-gradient(to bottom, rgba(255,149,0,0.92) 0%, rgba(255,149,0,0.42) 100%)', label: this._t('pwAvgGrabs')   },
    ];

    // ── Total Indexer Queries (stacked: Search + RSS + Auth) ──
    const qTotal    = i => (i.numberOfQueries||0) + (i.numberOfFailedQueries||0) + (i.numberOfRssQueries||0) + (i.numberOfFailedRssQueries||0) + (i.numberOfAuthQueries||0) + (i.numberOfFailedAuthQueries||0);
    const sortedQ   = [...indexers].sort((a,b) => qTotal(b) - qTotal(a));
    const maxQ      = Math.max(1, ...sortedQ.map(i => qTotal(i)));
    const qSections = [
      { fn: i => i.numberOfQueries     || 0, color: 'rgba(0,122,255,0.9)',  gradient: 'linear-gradient(to bottom, rgba(0,122,255,0.92) 0%, rgba(0,122,255,0.42) 100%)',  label: this._t('musSearch') },
      { fn: i => i.numberOfRssQueries  || 0, color: 'rgba(52,199,89,0.9)', gradient: 'linear-gradient(to bottom, rgba(52,199,89,0.92) 0%, rgba(52,199,89,0.42) 100%)', label: 'RSS'    },
      { fn: i => i.numberOfAuthQueries || 0, color: 'rgba(255,45,85,0.9)', gradient: 'linear-gradient(to bottom, rgba(255,45,85,0.92) 0%, rgba(255,45,85,0.42) 100%)', label: this._t('pwAuth')   },
    ];

    // ── Total Indexer Successful Grabs ──
    const sortedG   = [...indexers].sort((a,b) => (b.numberOfGrabs||0) - (a.numberOfGrabs||0));
    const maxG      = Math.max(1, ...sortedG.map(i => i.numberOfGrabs||0));
    const gSections = [
      { fn: i => i.numberOfGrabs || 0, color: 'rgba(255,149,0,0.9)', gradient: 'linear-gradient(to bottom, rgba(255,149,0,0.92) 0%, rgba(255,149,0,0.42) 100%)', label: this._t('pwGrabs') },
    ];

    const lim    = isMob ? sortedRT.length : hLimit;
    const rtBars = vBarChart(sortedRT.slice(0, lim), maxRTtot, rtSections, i => (i.indexerName||i.name||'').substring(0, 10));
    const qBars  = vBarChart(sortedQ.slice(0, lim),  maxQ,     qSections,  i => (i.indexerName||i.name||'').substring(0, 10));
    const gBars  = vBarChart(sortedG.slice(0, lim),  maxG,     gSections,  i => (i.indexerName||i.name||'').substring(0, 10));
    const cardRT = this._pwChartCard(this._t('pwChartRT'), rtBars, mkLegend(rtSections), isMob);
    const cardQ  = this._pwChartCard(this._t('pwChartQ'),               qBars,  mkLegend(qSections),  isMob);
    const cardG  = this._pwChartCard(this._t('pwChartG'),      gBars,  mkLegend(gSections),  isMob);

    if (!isMob) {
      return `<div style="flex:1;min-height:0;display:flex;flex-direction:column;gap:8px">
        <div style="flex:1;min-height:0;display:flex;flex-direction:column">${cardRT}</div>
        <div style="flex:1;min-height:0;display:flex;gap:8px"><div style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column">${cardQ}</div><div style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column">${cardG}</div></div>
      </div>`;
    }
    return `<div style="flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:8px">${cardRT}${cardQ}${cardG}</div>`;
  }

  _pwStatsPage1(indexers, userAgents, isMob) {
    const sortedQ  = [...userAgents].sort((a,b) => (b.numberOfQueries||0) - (a.numberOfQueries||0));
    const sortedG  = [...userAgents].sort((a,b) => (b.numberOfGrabs||0)   - (a.numberOfGrabs||0));
    const hLimit   = isMob ? 3 : 5;

    const hBar = (items, maxV, valFn, nameFn, color, gradient) => {
      if (!items.length) return '<div style="color:var(--is-text-muted);font-size:11px">' + this._t('tlNoData') + '</div>';
      const bg = gradient || color;
      return items.map(item => {
        const v   = Number(valFn(item)) || 0;
        const w   = maxV > 0 ? Math.round(v / maxV * 100) : 0;
        const lbl = v >= 1000 ? (v/1000).toFixed(1)+'K' : String(v);
        return `<div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
            <span style="font-size:10px;font-weight:500;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70%">${this._escHtml(nameFn(item))}</span>
            <span style="font-size:9px;color:var(--is-text-muted);flex-shrink:0">${lbl}</span>
          </div>
          <div style="height:7px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden">
            <div style="width:${w}%;height:100%;background:${bg};border-radius:4px"></div>
          </div>
        </div>`;
      }).join('');
    };

    const maxQ  = Math.max(1, ...sortedQ.map(u => u.numberOfQueries||0));
    const maxG  = Math.max(1, ...sortedG.map(u => u.numberOfGrabs||0));
    const lim1  = isMob ? sortedQ.length : hLimit;
    const qBars = hBar(sortedQ.slice(0, lim1), maxQ, u => u.numberOfQueries||0, u => u.userAgent||'—', 'rgba(0,122,255,0.9)',  'linear-gradient(to right, rgba(0,122,255,0.42) 0%, rgba(0,122,255,0.92) 100%)');
    const gBars = hBar(sortedG.slice(0, lim1), maxG, u => u.numberOfGrabs||0,   u => u.userAgent||'—', 'rgba(255,149,0,0.9)', 'linear-gradient(to right, rgba(255,149,0,0.42) 0%, rgba(255,149,0,0.92) 100%)');
    const cardQ = this._pwChartCard(this._t('pwChartUAQ'), qBars, '', isMob);
    const cardG = this._pwChartCard(this._t('pwChartUAG'),   gBars, '', isMob);

    if (!isMob) {
      return `<div style="flex:1;min-height:0;display:flex;gap:8px"><div style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column">${cardQ}</div><div style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column">${cardG}</div></div>`;
    }
    return `<div style="flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:8px">${cardQ}${cardG}</div>`;
  }

  _pwChartCard(title, content, legendHtml = '', shrink = false) {
    const flexSty = shrink ? 'flex-shrink:0' : 'flex:1;min-height:0';
    return `<div style="background:var(--is-btn-bg);border:1px solid var(--is-divider);border-radius:10px;padding:10px 14px;${flexSty};display:flex;flex-direction:column">
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;flex-shrink:0">
        <div style="font-size:11px;font-weight:700;color:var(--is-text-muted);text-transform:uppercase;letter-spacing:0.05em;flex:1">${title}</div>
        ${legendHtml ? `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;flex-shrink:0">${legendHtml}</div>` : ''}
      </div>
      <div style="flex:1;min-height:0;display:flex;flex-direction:column">${content}</div>
    </div>`;
  }

  _pwWireStats(body, el) {
    // The view switch places its fill by measurement, once it is in the page.
    requestAnimationFrame(() => {
      const nav = body.querySelector('.mt-nav--inline');
      this._syncNavInd(nav, nav?.querySelector('.mt-nav-btn.is-on'));
    });

    body.querySelectorAll('[data-pw-stats-page]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._prowlarrModal) return;
        this._prowlarrModal.statsPage = parseInt(btn.dataset.pwStatsPage) || 0;
        body.innerHTML = this._pwStatsTabHtml(this._prowlarrModal);
        this._pwWireStats(body, el);
      });
    });

    // Bar click → floating tooltip (Tautulli style)
    body.addEventListener('click', e => {
      const bar = e.target.closest('.pw-stats-bar');
      // Close existing tooltip
      this.shadowRoot.querySelector('.pw-stats-tooltip')?.remove();
      if (!bar) return;
      e.stopPropagation();
      const name = bar.dataset.barName || '';
      let vals = [];
      try { vals = JSON.parse(bar.dataset.barVals || '[]'); } catch(_) {}
      const filtered = vals.filter(v => v.val > 0);
      if (!filtered.length) return;
      const total = filtered.reduce((s, v) => s + v.val, 0);
      const rows = filtered.map(v =>
        `<div style="display:flex;align-items:center;gap:8px;padding:2px 0">
          <span style="width:8px;height:8px;border-radius:2px;background:${v.color};flex-shrink:0;display:inline-block"></span>
          <span style="flex:1;font-size:11px;color:var(--is-text-muted)">${this._escHtml(v.label)}</span>
          <span style="font-size:12px;font-weight:700;color:var(--is-text)">${v.val >= 1000 ? (v.val/1000).toFixed(1)+'K' : v.val}</span>
        </div>`
      ).join('');
      const tip = document.createElement('div');
      tip.className = 'pw-stats-tooltip' + dayClass(this);
      tip.style.cssText = `position:fixed;background:var(--is-popup-bg,rgba(28,32,46,0.98));border:1px solid var(--is-divider);border-radius:8px;padding:10px 14px;z-index:2000;min-width:160px;box-shadow:0 8px 24px rgba(0,0,0,0.5);pointer-events:auto`;
      tip.innerHTML = `<div style="font-size:12px;font-weight:700;color:var(--is-text);margin-bottom:6px">${this._escHtml(name)}</div>
        ${rows}
        ${filtered.length > 1 ? `<div style="border-top:1px solid var(--is-divider);margin-top:6px;padding-top:6px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;color:var(--is-text-muted)">${this._t('pwTotal')}</span>
          <span style="font-size:13px;font-weight:700;color:var(--is-text)">${total >= 1000 ? (total/1000).toFixed(1)+'K' : total}</span>
        </div>` : ''}`;
      this.shadowRoot.appendChild(tip);
      // Position above bar
      const rect = bar.getBoundingClientRect();
      const tipH = tip.offsetHeight, tipW = tip.offsetWidth;
      let top = rect.top - tipH - 10;
      if (top < 8) top = rect.bottom + 10;
      let left = rect.left + rect.width/2 - tipW/2;
      left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
      tip.style.top = top + 'px'; tip.style.left = left + 'px';
      // Close on next click anywhere
      const close = (ev) => {
        if (!tip.contains(ev.target) && ev.target !== bar) {
          tip.remove(); el.removeEventListener('click', close, true);
        }
      };
      setTimeout(() => el.addEventListener('click', close, true), 0);
    });
  }

}

export const wireProwlarrStatsMixin = _WireProwlarrStatsMethods.prototype;
