// ──────────────────────────────────────────────────────────────────────────
// Tautulli — Graphs tab
// ──────────────────────────────────────────────────────────────────────────
import { MT_BTN } from './mt-kit.js';

const _TL_G_HEX = {
  'Movies':        '#FF9500',
  'TV':            '#007AFF',
  'Music':         '#34C759',
  'Live TV':       '#FF2D55',
  'Direct Play':   '#34C759',
  'Direct Stream': '#007AFF',
  'Transcode':     '#FF3B30',
};

// macOS system color palette — used for dynamic series (e.g. Jellystat library names)
const _TL_G_FALLBACK = ['#007AFF','#FF9500','#34C759','#FF2D55','#BF5AF2','#FF3B30','#5AC8FA','#FFCC00'];

const _TL_G_VBW  = 1000;
const _TL_G_SVH  = 200;
const _TL_G_DISP = 200;
const _P = { l: 12, r: 6, t: 18, b: 6 };

function _tlGHex(n) {
  return _TL_G_HEX[n] || _TL_G_FALLBACK[0];
}

function _tlGAssignColors(series) {
  const used = new Set();
  const map  = {};
  for (const s of series) {
    if (_TL_G_HEX[s.name]) { map[s.name] = _TL_G_HEX[s.name]; used.add(_TL_G_HEX[s.name]); }
  }
  let fi = 0;
  for (const s of series) {
    if (!map[s.name]) {
      while (fi < _TL_G_FALLBACK.length && used.has(_TL_G_FALLBACK[fi])) fi++;
      const c = _TL_G_FALLBACK[fi % _TL_G_FALLBACK.length];
      map[s.name] = c; used.add(c); fi++;
    }
  }
  return map;
}
function _tlGAttr(v) { return _tlGEsc(v); }

// Category and series names come from the API (and, reused by Tracearr and
// Jellystat, can be platform or user names), so every label is text.
function _tlGEsc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _tlGFmtDur(sec) {
  if (!sec || sec <= 0) return '0';
  const m = Math.floor(sec / 60);
  if (m < 1) return sec + 's';
  const h = Math.floor(m / 60);
  if (h < 1) return m + 'm';
  const d = Math.floor(h / 24);
  if (d < 1) return h + 'h ' + (m % 60 > 0 ? (m % 60) + 'm' : '');
  const mo = Math.floor(d / 30);
  if (mo < 1) return d + 'd ' + (h % 24 > 0 ? (h % 24) + 'h' : '');
  return mo + 'mo ' + (d % 30 > 0 ? (d % 30) + 'd' : '');
}

function _tlGFmtDurShort(sec) {
  if (!sec || sec <= 0) return '0';
  const m = Math.floor(sec / 60);
  if (m < 1) return sec + 's';
  const h = Math.floor(m / 60);
  if (h < 1) return m + 'm';
  const d = Math.floor(h / 24);
  if (d < 1) return h + 'h';
  return d + 'd';
}

// Shared data prep: filter Total, expand sparse date range
function _tlGPrep(rawData, opts) {
  opts = opts || {};
  const d = rawData?.response?.data;
  if (!d) return null;
  let cats   = d.categories || [];
  let series = (d.series || []).filter(s => s.name !== 'Total');
  if (!cats.length || !series.length) return null;

  if (opts.isDate && opts.range && cats.length < opts.range) {
    const today = new Date(), full = [];
    for (let i = opts.range - 1; i >= 0; i--) {
      const dd = new Date(today - i * 86400000);
      full.push(dd.toISOString().slice(0, 10));
    }
    const map = {};
    cats.forEach((c, ci) => {
      map[c] = {};
      series.forEach((s, si) => { map[c][si] = (s.data || [])[ci] || 0; });
    });
    cats   = full;
    series = series.map((s, si) => ({
      ...s,
      data: full.map(dt => map[dt]?.[si] || 0),
    }));
  }

  const maxV = Math.max(1, ...cats.map((_, i) =>
    series.reduce((s, ser) => s + ((ser.data || [])[i] || 0), 0)
  ));
  return { cats, series, maxV };
}

// Build positioned x-label HTML — spans are absolutely placed by percentage
// matching the SVG viewBox coordinate → avoids font stretching from preserveAspectRatio:none
function _tlGXLabels(visibleLabels) {
  if (!visibleLabels.length) return '';
  return '<div class="tl-g-x-labels">' + visibleLabels.map(l => {
    let style;
    if (l.first) {
      style = `left:${l.pct.toFixed(1)}%;transform:translateX(0)`;
    } else if (l.last) {
      style = `left:${l.pct.toFixed(1)}%;transform:translateX(-100%)`;
    } else {
      style = `left:${l.pct.toFixed(1)}%;transform:translateX(-50%)`;
    }
    return `<span style="position:absolute;${style};font-size:10px;color:var(--is-text-muted);white-space:nowrap;line-height:1">${_tlGEsc(l.lbl)}</span>`;
  }).join('') + '</div>';
}

class _TautulliGraphsMethods {

  _tlBodyGraphs() {
    const m = this._tautulliModal;
    if (!m) return '';
    if (m.graphsLoading) return `<div class="u-empty-lg">${this._t('loading')}</div>`;

    const sub    = m.graphsSub    || 'media';
    const metric = m.graphsMetric || 'plays';
    const range  = m.graphsRange  || 30;
    const isMob  = this._isMob;
    const isTot  = sub === 'totals';

    // Everything the tab is steered by rides in one capsule: the three views,
    // the metric, the range and the user picker. Each group is one choice at a
    // time, so on a roomy screen both are peanuts — two separately lit blue
    // buttons would read as a multi-select, which is not what these are.
    const _gi = d => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${d}</svg>`;
    const SUBS = [
      { v: 'media',  label: this._t('tlGSubMedia'),  icon: _gi('<rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>') },
      { v: 'stream', label: this._t('tlGSubStream'), icon: _gi('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>') },
      { v: 'totals', label: this._t('tlGSubTotals'), icon: _gi('<line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="9"/>') },
    ];
    const METRICS = [
      { v: 'plays',    label: this._t('tlGMetricPlayCount'),    icon: _gi('<polygon points="6 3 20 12 6 21 6 3"/>') },
      { v: 'duration', label: this._t('tlGMetricPlayDuration'), icon: _gi('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>') },
    ];

    // Built like the header menu rather than as peanuts: the fill is one
    // element the wire layer measures onto the active button, so the buttons
    // keep their natural widths — which is what lets a phone show the glyph
    // alone and give the word only to the chosen one.
    const _nav = (id, items, cur, attr, accent) => `<span id="${id}" class="mt-nav mt-nav--inline"${accent ? ` style="--nav-accent:${accent}"` : ''}>
      <span class="mt-nav-ind"></span>${items.map(o =>
        `<button class="mt-nav-btn${o.v === cur ? ' is-on' : ''}" ${attr}="${o.v}" title="${this._escHtml(o.label)}">${o.icon}${(!isMob || o.v === cur) ? o.label : ''}</button>`).join('')}
    </span>`;

    const subSeg    = _nav('tl-g-sub-nav',    SUBS,    sub,    'data-tl-graph-sub', null);
    // Second accent, as in the Library header: two blue groups side by side
    // give no clue that they steer different things.
    const metricSeg = _nav('tl-g-metric-nav', METRICS, metric, 'data-tl-g-metric', 'rgba(88,86,214,0.9)');

    const rangeUnit = isMob ? (isTot ? 'M' : 'D') : (isTot ? this._t('tlGMonths') : this._t('tlGDays'));
    const rangeCtrl = `
      <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--is-text-muted);flex-shrink:0;padding:0 4px">
        ${isMob ? '' : `<span>${this._t('tlGLast')}</span>`}
        <input id="tl-g-range" type="number" value="${range}" min="1" max="${isTot?60:365}"
          style="width:42px;height:26px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:999px;color:var(--is-text);padding:0;font-size:12px;text-align:center;font-family:inherit;outline:none;box-sizing:border-box;-webkit-appearance:none;appearance:none">
        <span>${rangeUnit}</span>
      </span>`;

    // One capsule, no overflow on it: the user picker's panel hangs off the
    // bar, and a scrolling ancestor clips it (and clips the bar's own height
    // along the way). Only the toggles scroll, in a strip of their own that is
    // exactly their height, and the range stays pinned to the right.
    const controls = `<div class="mt-tb" style="min-height:34px;padding:0 3px;gap:6px;margin-bottom:${isMob ? 10 : 14}px;flex-shrink:0">
      <span style="display:flex;align-items:center;gap:${isMob ? 3 : 6}px;height:28px;flex:1;min-width:0">
        ${subSeg}<span class="mt-tb-sep"></span>${metricSeg}
      </span>
      <span class="mt-tb-sep"></span>
      ${this._tlGUserDropdown()}${isMob ? '' : rangeCtrl}
    </div>`;

    // A phone has no room for the range in the bar, so it rides in the corner
    // of the first card instead — still one per view, still above the data it
    // scopes.
    const mobRange = isMob ? rangeCtrl : '';

    const gd   = m.graphsData || {};
    const isDur = metric === 'duration';
    const BASE = { range, isDate: true, isDuration: isDur, isMob };
    let body   = '';

    if (sub === 'media') {
      const lineSvg = this._tlGLineSvg(gd.byDate,  { ...BASE, chartId:'md', xLabel: d => d.slice(-5) });
      const barOpts = { isDuration: isDur, isMob };
      const dowSvg  = this._tlGBarSvg( gd.byDow,   { ...barOpts, chartId:'dw', xLabel: d => d.slice(0,3) });
      const hodSvg  = this._tlGBarSvg( gd.byHod,   { ...barOpts, chartId:'hd', xLabel: (_, i) => i % 4 === 0 ? `${i}h` : '' });

      const halfRow = isMob
        ? `<div style="margin-bottom:10px">${this._tlGCard(this._t('tlGByDow'), gd.byDow, dowSvg)}</div>
           <div style="margin-bottom:10px">${this._tlGCard(this._t('tlGByHod'), gd.byHod, hodSvg)}</div>`
        : `<div style="display:flex;gap:10px;margin-bottom:10px">
             <div style="flex:1;min-width:0">${this._tlGCard(this._t('tlGByDow'), gd.byDow, dowSvg)}</div>
             <div style="flex:1;min-width:0">${this._tlGCard(this._t('tlGByHod'), gd.byHod, hodSvg)}</div>
           </div>`;

      body = `<div style="margin-bottom:10px">${this._tlGCard(this._t('tlGDailyByMedia'), gd.byDate, lineSvg, mobRange)}</div>${halfRow}`;

    } else if (sub === 'stream') {
      const lineSvg  = this._tlGLineSvg(gd.streamByDate,     { ...BASE, chartId:'st', xLabel: d => d.slice(-5) });
      const concSvg  = this._tlGLineSvg(gd.concurrentByDate, { ...BASE, chartId:'cc', isDuration: false, xLabel: d => d.slice(-5) });
      body = `<div style="margin-bottom:10px">${this._tlGCard(this._t('tlGDailyByStream'), gd.streamByDate, lineSvg, mobRange)}</div>
              <div>${this._tlGCard(this._t('tlGConcurrent'), gd.concurrentByDate, concSvg)}</div>`;

    } else {
      const barSvg = this._tlGBarSvg(gd.monthly, { isDuration: isDur, isMob, chartId:'mo', xLabel: d => d.slice(0,3) });
      body = `<div style="margin-bottom:10px">${this._tlGCard(this._t('tlGTotalByMonth'), gd.monthly, barSvg, mobRange)}</div>`;
    }

    return controls + body;
  }

  // ── Card wrapper ──────────────────────────────────────────────────────────

  _tlGCard(title, rawData, chartHtml, extra = '') {
    const series = (rawData?.response?.data?.series || []).filter(s => s.name !== 'Total');
    const colMap = _tlGAssignColors(series);
    const legend = series.map(s =>
      `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;color:var(--is-text-muted)">`
      + `<span style="width:7px;height:7px;border-radius:2px;background:${colMap[s.name]};flex-shrink:0;display:inline-block;opacity:0.9"></span>${this._escHtml(this._tlGName(s.name) ?? '')}</span>`
    ).join('');

    return `<div class="tl-g-card" style="position:relative">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;flex-wrap:wrap">
        <span class="tl-graph-title">${title}</span>
        ${extra || (legend ? `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">${legend}</div>` : '')}
        ${extra && legend ? `<div style="display:flex;gap:8px;flex-wrap:wrap;width:100%">${legend}</div>` : ''}
      </div>
      <div style="position:relative">
        ${chartHtml}
        <div class="tl-g-tip" style="display:none;position:absolute;top:0;left:0;background:var(--is-menu-bg,#18182a);border:1px solid var(--is-btn-bdr);border-radius:7px;padding:7px 10px;font-size:11px;pointer-events:none;z-index:50;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3)"></div>
      </div>
    </div>`;
  }

  // Series names arrive in English — from Tautulli, or as the colour keys
  // the charts share — and are translated only where they are drawn, so the
  // colours keep finding them.
  _tlGName(n) {
    const key = { Movies: 'tabMovies', TV: 'tlSeriesTv', Music: 'tabMusic', 'Live TV': 'tlFilterLiveTV',
      'Direct Play': 'tlFilterDirectPlay', 'Direct Stream': 'tlFilterDirectStream', Transcode: 'tlFilterTranscode',
      Plays: 'qaStatsPlays', Other: 'pwOther' }[n];
    return key ? this._t(key) : n;
  }

  _tlGSvgEl(inner, h) {
    return `<svg class="tl-g-svg" viewBox="0 0 ${_TL_G_VBW} ${_TL_G_SVH}" width="100%" height="${h || _TL_G_DISP}" preserveAspectRatio="none">${inner}</svg>`;
  }

  // HTML y-label + SVG wrapper — avoids font distortion from preserveAspectRatio:none
  _tlGWrap(svgHtml, labelsHtml, yLblTxt) {
    return `<div style="position:relative">
      <span class="tl-g-ylabel">${yLblTxt}</span>
      ${svgHtml}
    </div>${labelsHtml}`;
  }

  // ── Stacked bar chart ─────────────────────────────────────────────────────
  // Returns svgHtml + x-labels HTML div

  _tlGBarSvg(rawData, opts) {
    opts = opts || {};
    const prep   = _tlGPrep(rawData, opts);
    const VBW    = _TL_G_VBW, SVH = _TL_G_SVH;
    const noData = this._tlGWrap(
      this._tlGSvgEl(`<text x="${VBW/2}" y="${SVH/2}" text-anchor="middle" dominant-baseline="middle" style="fill:var(--is-text-muted);font-size:22">${this._t('tlNoData')}</text>`),
      '', '');
    if (!prep) return noData;

    const { cats, series, maxV } = prep;
    const n     = cats.length;
    const cW    = VBW - _P.l - _P.r;
    const cH    = SVH - _P.t - _P.b;
    const baseY = _P.t + cH;
    const cid   = opts.chartId || 'g';
    const isDur = !!opts.isDuration;

    const colMapB = _tlGAssignColors(series);
    const defs = '<defs>' + series.map((s, si) => {
      const h = colMapB[s.name];
      return `<linearGradient id="tl-gb-${cid}-${si}" x1="0" y1="0" x2="0" y2="1">`
           + `<stop offset="0%"   stop-color="${h}" stop-opacity="0.92"/>`
           + `<stop offset="100%" stop-color="${h}" stop-opacity="0.42"/>`
           + `</linearGradient>`;
    }).join('') + '</defs>';

    const serGrad = {};
    series.forEach((s, si) => { serGrad[s.name] = `url(#tl-gb-${cid}-${si})`; });

    const slotW     = cW / n;
    const bwFrac    = n<=7 ? 0.50 : n<=14 ? 0.55 : Math.min(0.65, Math.max(0.14, 42/slotW));
    const bw        = Math.max(4, slotW * bwFrac);
    const rr        = Math.min(bw * 0.38, 10);
    const labelW    = opts.isMob ? 110 : 62;
    const showEvery = Math.max(1, Math.ceil(labelW / slotW));

    let bars = '', delay = 0;
    const visibleLabels = [];

    cats.forEach((cat, i) => {
      const x     = _P.l + i * slotW + (slotW - bw) / 2;
      const total = series.reduce((s, ser) => s + ((ser.data || [])[i] || 0), 0);
      const sorted = series.slice().sort((a, b) => ((a.data||[])[i]||0) - ((b.data||[])[i]||0));

      const tipVals = sorted.filter(s => ((s.data||[])[i]||0) > 0).reverse()
        .map(s => { const v = (s.data||[])[i]||0; return { n: this._tlGName(s.name), v, fv: isDur ? _tlGFmtDur(v) : v, hex: colMapB[s.name] }; });
      const tipData = _tlGAttr(JSON.stringify({
        lbl: cat, tot: total, ftot: isDur ? _tlGFmtDur(total) : null, vals: tipVals,
      }));

      let colPaths = '', curY = baseY;
      if (total > 0) {
        sorted.forEach((ser, si2) => {
          const v = (ser.data||[])[i]||0;
          if (!v) return;
          const h    = (v / maxV) * cH;
          const fill = serGrad[ser.name] || colMapB[ser.name];
          const isTop = si2===sorted.length-1 || sorted.slice(si2+1).every(s2=>!((s2.data||[])[i]||0));
          curY -= h;
          const pathD = isTop ? this._tlGRoundedTop(x, curY, bw, h, rr)
                               : `M${x},${curY+h} L${x},${curY} L${x+bw},${curY} L${x+bw},${curY+h} Z`;
          const rrAttr = isTop && rr >= 0.5
            ? ` data-tl-rr="${rr.toFixed(2)}" data-tl-bx="${x.toFixed(2)}" data-tl-by="${curY.toFixed(2)}" data-tl-bw="${bw.toFixed(2)}" data-tl-bh="${h.toFixed(2)}"`
            : '';
          colPaths += `<path d="${pathD}"${rrAttr} style="fill:${fill}" class="tl-g-anim-bar" data-d="${(delay*0.012).toFixed(2)}"/>`;
        });
        delay++;
      }

      bars += `<g class="tl-g-col" data-tl-g-col="${tipData}" style="cursor:${total>0?'pointer':'default'}">`
            + `<rect x="${(_P.l+i*slotW).toFixed(1)}" y="${_P.t}" width="${slotW.toFixed(1)}" height="${cH}" fill="transparent"/>`
            + colPaths + `</g>`;

      const lbl = typeof opts.xLabel==='function' ? opts.xLabel(cat, i, n) : (cat || '');
      if (lbl) {
        const lr = Math.floor((n-2) / showEvery) * showEvery;
        if (i % showEvery === 0 || (i === n-1 && (n-1-lr) * slotW >= labelW * 0.8)) {
          visibleLabels.push({ pct: (_P.l + i*slotW + slotW/2) / VBW * 100, lbl, first: i===0, last: i===n-1 });
        }
      }
    });

    const yLblTxt = isDur ? _tlGFmtDurShort(maxV) : String(maxV);
    return this._tlGWrap(this._tlGSvgEl(defs + bars, opts.height), _tlGXLabels(visibleLabels), yLblTxt);
  }

  _tlGRoundedTop(x, y, w, h, r) {
    r = Math.min(r, h/2, w/2);
    if (r < 0.5) return `M${x},${y+h} L${x},${y} L${x+w},${y} L${x+w},${y+h} Z`;
    const f = n => n.toFixed(2);
    return `M${f(x)},${f(y+h)} L${f(x)},${f(y+r)} Q${f(x)},${f(y)} ${f(x+r)},${f(y)} L${f(x+w-r)},${f(y)} Q${f(x+w)},${f(y)} ${f(x+w)},${f(y+r)} L${f(x+w)},${f(y+h)} Z`;
  }

  // ── Line chart ────────────────────────────────────────────────────────────
  // Dots: filled with card bg color (var(--is-row-hover)) so line underneath is hidden,
  //       stroke ring drawn on top → line visually ends at dot edge, never passes through

  _tlGLineSvg(rawData, opts) {
    opts = opts || {};
    const prep   = _tlGPrep(rawData, opts);
    const VBW    = _TL_G_VBW, SVH = _TL_G_SVH;
    const noDt   = this._tlGWrap(
      this._tlGSvgEl(`<text x="${VBW/2}" y="${SVH/2}" text-anchor="middle" dominant-baseline="middle" style="fill:var(--is-text-muted);font-size:22">${this._t('tlNoData')}</text>`, opts.height),
      '', '');
    if (!prep) return noDt;

    const { cats, series, maxV } = prep;
    const n     = cats.length;
    const cW    = VBW - _P.l - _P.r;
    const cH    = SVH - _P.t - _P.b;
    const baseY = _P.t + cH;
    const cid   = opts.chartId || 'l';
    const isDur = !!opts.isDuration;

    const noDots = !!opts.noDots;
    // Dot radius — smaller for dense data (can be overridden via opts.dotR)
    const dotR = opts.dotR != null ? opts.dotR : (n <= 12 ? 4 : n <= 30 ? 3 : 2);

    // Band positioning: dot i at center of slot i → first/last dots never at SVG edge
    const slotW2 = cW / Math.max(n, 1);
    const ptX    = i => _P.l + (i + 0.5) * slotW2;
    const colL   = i => _P.l + i * slotW2;
    const colR   = i => _P.l + (i + 1) * slotW2;

    // Pre-compute point coords per series (band-centered)
    const seriesPts = series.map(ser => {
      const vals = ser.data || [];
      return vals.map((v, i) => ({
        x: ptX(i),
        y: _P.t + cH - (v / maxV) * cH,
        v,
        cat: cats[i],
      }));
    });

    const colMapL = _tlGAssignColors(series);
    // Defs: gradients + per-series masks (punch out dotR circle at each point → line stops at dot edge)
    let di = series.map((s, si) => {
      const h = colMapL[s.name];
      return `<linearGradient id="tl-gl-${cid}-${si}" x1="0" y1="0" x2="0" y2="1">`
           + `<stop offset="0%"   stop-color="${h}" stop-opacity="0.18"/>`
           + `<stop offset="100%" stop-color="${h}" stop-opacity="0"/>`
           + `</linearGradient>`;
    }).join('');

    if (!noDots) series.forEach((ser, si) => {
      const circles = seriesPts[si]
        .filter(p => p.v > 0)
        .map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${dotR}" fill="black"/>`)
        .join('');
      di += `<mask id="tl-lmask-${cid}-${si}" maskUnits="userSpaceOnUse">`
          + `<rect x="0" y="0" width="${VBW}" height="${SVH}" fill="white"/>`
          + circles
          + `</mask>`;
    });

    const defs = `<defs>${di}</defs>`;

    // Pass 0: weekend background rects (isDate only)
    let out = defs;
    if (opts.isDate) {
      cats.forEach((cat, i) => {
        const dow = new Date(cat + 'T12:00:00').getDay();
        if (dow !== 0 && dow !== 6) return;
        const rx = colL(i), rw = colR(i) - rx;
        out += `<rect x="${rx.toFixed(1)}" y="${_P.t}" width="${rw.toFixed(1)}" height="${cH}" style="fill:var(--tl-wknd)"/>`;
      });
    }

    // Pass 1: area fills + masked lines (line hidden inside dotR radius of each dot)
    series.forEach((ser, si) => {
      const pts = seriesPts[si];
      if (!pts.some(p => p.v > 0)) return;
      const hex = colMapL[ser.name];
      out += `<path d="${this._tlGSmoothArea(pts, baseY)}" style="fill:url(#tl-gl-${cid}-${si});animation:fade-in 0.8s ease-out both"/>`;

      out += `<path d="${this._tlGSmoothLine(pts)}" fill="none" stroke="${hex}" stroke-width="2"`
           + ` stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"`
           + ` class="tl-g-anim-line"${noDots ? '' : ` mask="url(#tl-lmask-${cid}-${si})"`}/>`;
    });

    // Pass 2: hollow dots — stroke ring drawn on top fills the masked gap
    if (!noDots) series.forEach((ser, si) => {
      const pts = seriesPts[si];
      const hex = colMapL[ser.name];
      pts.forEach(p => {
        if (!p.v) return;
        const tipJson = _tlGAttr(JSON.stringify({ lbl: p.cat, name: this._tlGName(ser.name), val: p.v, hex }));
        out += `<circle class="tl-g-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${dotR}"`
             + ` style="fill:transparent;stroke:${hex};stroke-width:2.5;cursor:pointer"`
             + ` vector-effect="non-scaling-stroke" data-tl-g-dot="${tipJson}"/>`;
      });
    });

    // Pass 3: column hit areas + highlight rects (top layer, over dots)
    cats.forEach((cat, i) => {
      const rx = colL(i), rw = colR(i) - rx;
      const tipVals = series
        .map(ser => { const v = ((ser.data || [])[i]) || 0; return { n: this._tlGName(ser.name), v, fv: isDur ? _tlGFmtDur(v) : v, hex: colMapL[ser.name] }; })
        .filter(v => v.v > 0).sort((a, b) => b.v - a.v);
      const tot = tipVals.reduce((s, v) => s + v.v, 0);
      const td  = _tlGAttr(JSON.stringify({ lbl: cat, tot, ftot: isDur ? _tlGFmtDur(tot) : null, vals: tipVals }));
      out += `<g class="tl-g-lcol" data-tl-g-col="${td}" style="cursor:pointer">`
           + `<rect class="tl-g-lhlt" x="${rx.toFixed(1)}" y="${_P.t}" width="${rw.toFixed(1)}" height="${cH}" style="fill:var(--tl-col-hlt);opacity:0"/>`
           + `<rect x="${rx.toFixed(1)}" y="${_P.t}" width="${rw.toFixed(1)}" height="${cH}" fill="transparent"/>`
           + `</g>`;
    });

    // HTML x-labels (no font distortion)
    const labelW    = opts.isMob ? 110 : 62;
    const showEvery = Math.max(1, Math.ceil(labelW / slotW2));
    const visibleLabels = [];

    cats.forEach((cat, i) => {
      const lbl = typeof opts.xLabel === 'function' ? opts.xLabel(cat, i, n) : (cat || '').slice(-5);
      if (!lbl) return;
      const lr = Math.floor((n - 2) / showEvery) * showEvery;
      if (i % showEvery === 0 || (i === n - 1 && (n - 1 - lr) * slotW2 >= labelW * 0.8)) {
        visibleLabels.push({ pct: ptX(i) / VBW * 100, lbl, first: i === 0, last: i === n - 1 });
      }
    });

    const yLblTxt = isDur ? _tlGFmtDurShort(maxV) : String(maxV);
    return this._tlGWrap(this._tlGSvgEl(out, opts.height), _tlGXLabels(visibleLabels), yLblTxt);
  }

  _tlGSmoothLine(pts) {
    if (pts.length < 2) return pts.length===1 ? `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}` : '';
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i-1], p1 = pts[i];
      const cx1 = p0.x + (p1.x - p0.x) / 4;
      const cx2 = p1.x - (p1.x - p0.x) / 4;
      d += ` C${cx1.toFixed(1)},${p0.y.toFixed(1)} ${cx2.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return d;
  }

  _tlGSmoothArea(pts, baseY) {
    const lp = pts[pts.length-1], fp = pts[0];
    return this._tlGSmoothLine(pts) + ` L${lp.x.toFixed(1)},${baseY.toFixed(1)} L${fp.x.toFixed(1)},${baseY.toFixed(1)} Z`;
  }

  // ── User dropdown ─────────────────────────────────────────────────────────

  _tlGUserDropdown() {
    const m = this._tautulliModal; if (!m) return '';
    const users = m.graphsUserList || [], sel = m.graphsSelectedUsers;

    let btnLabel = this._t('tlGAllUsers');
    if (sel && sel.size === 1) {
      const u = users.find(u => sel.has(String(u.user_id)));
      btnLabel = u ? (u.friendly_name || u.username || '1 User') : '1 User';
    }
    btnLabel = this._escHtml(btnLabel);
    // A phone has no room for a name here — the glyph stands in and the name is
    // in the tooltip. It only lights up when the picker actually narrows
    // anything: none selected and all selected both mean "every user".
    const narrowed = !!(sel && sel.size > 0 && sel.size < users.length);
    const title = btnLabel;
    if (this._isMob) {
      btnLabel = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    }

    const chevron = `<svg class="tl-dd-chev" viewBox="0 0 10 6" width="9" height="6" style="position:absolute;right:6px;top:50%;transform:translateY(-50%)" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><polyline points="1,1 5,5 9,1"/></svg>`;
    const chkSvg  = `<svg viewBox="0 0 14 14" width="12" height="12"><polyline points="2,7 5.5,10.5 12,3" fill="none" stroke="var(--is-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const items = users.map(u => {
      const uid = String(u.user_id), checked = !sel || sel.has(uid);
      const name = this._escHtml(u.friendly_name || u.username || uid);
      return `<div class="tl-g-dd-item" data-tl-g-uid="${this._escHtml(uid)}"
        style="display:flex;align-items:center;justify-content:space-between;padding:5px 12px;cursor:pointer;font-size:11px;color:var(--is-text-body)">
        <span>${name}</span>
        <span style="width:14px;height:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center">${checked ? chkSvg : ''}</span>
      </div>`;
    }).join('');

    return `<div style="position:relative;flex-shrink:0" id="tl-g-dd-wrap">
      <button id="tl-g-dd-btn" class="mt-tb-btn" title="${title}" style="white-space:nowrap;padding:0 20px 0 ${this._isMob ? 8 : 10}px;position:relative;${narrowed ? 'color:#4da3ff' : 'opacity:0.55'}">
        ${btnLabel}${chevron}
      </button>
      <div id="tl-g-dd-panel" style="display:none;position:absolute;right:0;top:calc(100% + 4px);background:var(--is-menu-bg,#18182a);border:1px solid var(--is-btn-bdr);border-radius:14px;min-width:160px;z-index:200;box-shadow:0 4px 16px rgba(0,0,0,0.35);overflow:hidden">
        <div style="display:flex;gap:6px;padding:6px 8px 8px;border-bottom:1px solid var(--is-divider)">
          <button id="tl-g-dd-all"  class="tl-page-btn" style="flex:1;height:26px;font-size:10px;padding:0">${this._t('tlGSelectAll')}</button>
          <button id="tl-g-dd-none" class="tl-page-btn" style="flex:1;height:26px;font-size:10px;padding:0">${this._t('tlGDeselectAll')}</button>
        </div>
        <div style="max-height:160px;overflow-y:auto">${items || `<div style="padding:8px 12px;font-size:11px;color:var(--is-text-muted)">${this._t('tlGNoUsers')}</div>`}</div>
      </div>
    </div>`;
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async _tlFetchGraphs() {
    const m         = this._tautulliModal;
    const metric    = m?.graphsMetric || 'plays';
    const range     = m?.graphsRange  || 30;
    const sub       = m?.graphsSub    || 'media';
    const yAxis     = metric === 'duration' ? 'duration' : 'plays';
    const sel       = m?.graphsSelectedUsers;
    const userParam = (sel && sel.size === 1) ? `&user_id=${[...sel][0]}` : '';
    const base      = `time_range=${range}&y_axis=${yAxis}${userParam}`;

    if (sub === 'media') {
      const [byDate, byDow, byHod] = await Promise.all([
        this._tlApiFetch('get_plays_by_date',      base),
        this._tlApiFetch('get_plays_by_dayofweek', base),
        this._tlApiFetch('get_plays_by_hourofday', base),
      ]);
      return { byDate, byDow, byHod };
    } else if (sub === 'stream') {
      const [streamByDate, concurrentByDate] = await Promise.all([
        this._tlApiFetch('get_plays_by_stream_type',              base),
        this._tlApiFetch('get_concurrent_streams_by_stream_type', `time_range=${range}${userParam}`),
      ]);
      return { streamByDate, concurrentByDate };
    } else {
      const monthly = await this._tlApiFetch('get_plays_per_month', base);
      return { monthly };
    }
  }

  async _tlRefetchGraphs(body) {
    const m = this._tautulliModal; if (!m || !body) return;
    m.graphsLoading = true;
    body.innerHTML  = this._tlBodyGraphs();
    const gd = await this._tlFetchGraphs();
    if (!this._tautulliModal) return;
    m.graphsData = gd; m.graphsLoading = false;
    body.innerHTML = this._tlBodyGraphs();
    this._wireGraphControls(body);
    this._tlGTriggerAnim(body);
  }

  _tlGTriggerAnim(body) {
    body.querySelectorAll('.tl-g-anim-bar').forEach(el => {
      el.style.animationDelay = (el.getAttribute('data-d') || '0') + 's';
    });
  }
}

export const tautulliGraphsMixin = _TautulliGraphsMethods.prototype;
