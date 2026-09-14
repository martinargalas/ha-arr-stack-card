import { _traSegHtml } from './tracearr-table.js';
import { fmtBytes } from '../shared/format.js';

// Tracearr, the library tabs: Quality, Storage and the stale titles in it. Split out of render/tracearr-table.js.

class _TracearrLibraryMethods {
  // ──────────────────────────────────────────────────────────────────────────
  // Quality tab (library analytics)
  // ──────────────────────────────────────────────────────────────────────────

  _traQualEvolCard() {
    const m = this._tracearrModal;
    const qd = m.qualityData || {};
    const _allData = qd.data || [];
    const isMob = this._isMob;
    const Q_COLORS = { '4K': '#34C759', '1080p': '#007AFF', '720p': '#FF9500', 'SD': '#FF3B30' };
    const _period = m.qualityPeriod || 'month';
    const _periodDays = { week: 7, month: 30, year: 365 };
    const _sliced = _period === 'all' ? _allData : _allData.slice(-(_periodDays[_period] || 30));
    const data = _period === 'year'
      ? _sliced.filter((_, i) => i % 7 === 0 || i === _sliced.length - 1)
      : _period === 'all'
        ? _sliced.filter((_, i) => i % 30 === 0 || i === _sliced.length - 1)
        : _sliced;
    const days = data.map(d => d.day);
    const n = days.length;
    // What decides whether the Quality tab fits its modal is the window's
    // height, not its width — a 1100px-wide tablet in landscape is short, and
    // measuring the width alone let it scroll. This chart is the tab's tallest
    // piece, so it gives back the most.
    const shortQ = !isMob && window.innerHeight < 900;
    const chartH = isMob ? 110 : shortQ ? 96 : 130;
    const layers = [
      { label: 'SD',    color: Q_COLORS['SD']    },
      { label: '720p',  color: Q_COLORS['720p']  },
      { label: '1080p', color: Q_COLORS['1080p'] },
      { label: '4K',    color: Q_COLORS['4K']    },
    ];
    const _curPeriod = _period;
    const _curMt = m.qualityMediaType || null;
    const _Q_P_LBLS = isMob ? { week: 'W', month: 'M', year: 'Y', all: this._t('tabAll') } : { week: this._t('mtWeek'), month: this._t('mtMonth'), year: this._t('actColYear'), all: this._t('tabAll') };
    const _periodBtns = _traSegHtml(['week','month','year','all'].map(p => [p, _Q_P_LBLS[p]]), _curPeriod, 'data-tra-q-period');
    const _mtBtns = _traSegHtml([['', this._t('tabAll')], ['movies', this._t('tabMovies')], ['shows', this._t('traSeries')]], _curMt || '', 'data-tra-q-mt');
    const legend = layers.slice().reverse().map(l =>
      `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;color:var(--is-text-muted)"><span style="width:7px;height:7px;border-radius:2px;background:${l.color};display:inline-block"></span>${l.label}</span>`
    ).join('');
    // The bar spans the card rather than hugging its buttons — squeezed against
    // the title it read as a lump, and the two groups had nothing to sit in.
    // Wide enough and the bar shares the title's line; a phone gives it a row of
    // its own, where it can stretch instead of crushing the heading.
    // Everything on one line, on a phone too: the title drops its second word
    // and the bar's buttons tighten, which together buy the room. A row of its
    // own cost more height than the chart could spare.
    // No capsule: inside one the groups have to shrink to fit its inset, which
    // left these buttons smaller than the same groups standing alone elsewhere.
    const qBar = `<div class="tra-qe-bar" style="display:flex;align-items:center;gap:6px;flex-shrink:0">
        ${_mtBtns}<span class="mt-tb-sep"></span>${_periodBtns}
      </div>`;
    const header = `<div style="display:flex;align-items:center;gap:${isMob ? 6 : 10}px;margin-bottom:8px">
             <span class="tl-graph-title" style="flex-shrink:0">${isMob ? this._t('actColQuality') : this._t('traQualityEvolution')}</span>
             <div style="flex:1;min-width:0"></div>${qBar}
           </div>`
      + `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">${legend}</div>`;
    if (!n) return `<div class="tl-g-card" style="position:relative">${header}<div style="height:${chartH}px;display:flex;align-items:center;justify-content:center;color:var(--is-text-muted);font-size:12px">${this._t('tlNoData')}</div></div>`;
    const VBW = 1000, SVH = 200;
    const PL = 12, PR = 6, PT = 18, PB = 6;
    const cW = VBW - PL - PR, cH = SVH - PT - PB;
    const slotW = cW / Math.max(n, 1);
    const xOf = i => PL + (i + 0.5) * slotW;
    const maxV = Math.max(1, ...data.map(d => d.totalItems || 0));
    const yAbs = v => PT + (1 - v / maxV) * cH;
    const baseY = PT + cH;
    const seriesAbs = [
      { label: '4K',    color: Q_COLORS['4K'],    vals: data.map(d => (d.countSd||0)+(d.count720p||0)+(d.count1080p||0)+(d.count4k||0)) },
      { label: '1080p', color: Q_COLORS['1080p'], vals: data.map(d => (d.countSd||0)+(d.count720p||0)+(d.count1080p||0)) },
      { label: '720p',  color: Q_COLORS['720p'],  vals: data.map(d => (d.countSd||0)+(d.count720p||0)) },
      { label: 'SD',    color: Q_COLORS['SD'],    vals: data.map(d => d.countSd||0) },
    ];
    const pts = seriesAbs.map(s => s.vals.map((v, i) => ({ x: xOf(i), y: yAbs(v), v, cat: data[i]?.day })));
    const wkndRects = (_period === 'year' || _period === 'all') ? '' : data.map((d, i) => {
      const dow = new Date(d.day + 'T12:00:00').getDay();
      if (dow !== 0 && dow !== 6) return '';
      const rx = xOf(i) - slotW / 2;
      return `<rect x="${rx.toFixed(1)}" y="${PT}" width="${slotW.toFixed(1)}" height="${cH}" style="fill:var(--tl-wknd)"/>`;
    }).join('');
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(v => Math.round(v * maxV));
    const gridlines = yTicks.map(v =>
      `<line x1="${PL}" y1="${yAbs(v).toFixed(1)}" x2="${VBW - PR}" y2="${yAbs(v).toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`
    ).join('');
    const defs = '<defs>' + seriesAbs.map((s, si) =>
      `<linearGradient id="traq-g${si}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${s.color}" stop-opacity="0.18"/>` +
      `<stop offset="100%" stop-color="${s.color}" stop-opacity="0"/>` +
      `</linearGradient>`
    ).join('') + '</defs>';
    const areaFills = seriesAbs.map((s, si) =>
      `<path d="${this._tlGSmoothArea(pts[si], baseY)}" fill="url(#traq-g${si})" style="animation:fade-in 0.8s ease-out both"/>`
    ).join('');
    const lines = seriesAbs.map((s, si) =>
      `<path d="${this._tlGSmoothLine(pts[si])}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" class="tl-g-anim-line"/>`
    ).join('');
    const colW = (VBW - PL - PR) / n;
    const hitCols = data.map((d, i) => {
      const vals = [
        { n: '4K',    v: d.count4k    || 0, hex: Q_COLORS['4K']    },
        { n: '1080p', v: d.count1080p || 0, hex: Q_COLORS['1080p'] },
        { n: '720p',  v: d.count720p  || 0, hex: Q_COLORS['720p']  },
        { n: 'SD',    v: d.countSd    || 0, hex: Q_COLORS['SD']    },
      ].filter(v => v.v > 0).sort((a, b) => b.v - a.v);
      const tot = vals.reduce((s, v) => s + v.v, 0);
      const td = JSON.stringify({ lbl: d.day, tot, vals }).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      const rx = (PL + i * colW).toFixed(1);
      return `<g class="tl-g-lcol" data-tl-g-col="${td}" style="cursor:pointer">` +
             `<rect class="tl-g-lhlt" x="${rx}" y="${PT}" width="${colW.toFixed(1)}" height="${SVH - PT - PB}" style="fill:var(--tl-col-hlt,rgba(255,255,255,0.04));opacity:0"/>` +
             `<rect x="${rx}" y="${PT}" width="${colW.toFixed(1)}" height="${SVH - PT - PB}" fill="transparent"/></g>`;
    }).join('');
    const yLblTxt = maxV >= 1000 ? (maxV / 1000).toFixed(1) + 'K' : String(maxV);
    const step = Math.max(1, Math.ceil(n / 7));
    const xLabelsHtml = '<div class="tl-g-x-labels">' + data.map((d, i) => {
      if (i % step !== 0 && i !== n - 1) return '';
      const pct = (xOf(i) / VBW * 100).toFixed(1);
      const pos = i === 0 ? `left:${pct}%;transform:translateX(0)` :
                  i === n - 1 ? `left:${pct}%;transform:translateX(-100%)` :
                  `left:${pct}%;transform:translateX(-50%)`;
      return `<span style="position:absolute;${pos};font-size:10px;color:var(--is-text-muted);white-space:nowrap;line-height:1">${d.day.slice(5)}</span>`;
    }).join('') + '</div>';
    const chartHtml = this._tlGWrap(this._tlGSvgEl(defs + wkndRects + gridlines + areaFills + lines + hitCols, chartH), xLabelsHtml, yLblTxt);
    return `<div class="tl-g-card" style="position:relative">${header}<div style="position:relative">${chartHtml}</div><div class="tl-g-tip" style="display:none;position:absolute;top:0;left:0;background:var(--is-menu-bg,#18182a);border:1px solid var(--is-btn-bdr);border-radius:7px;padding:7px 10px;font-size:11px;pointer-events:none;z-index:50;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3)"></div></div>`;
  }

  _traQualCodecsCard() {
    const m = this._tracearrModal;
    const isMob = this._isMob;
    const codecs = m.qualityCodecs || {};
    const CODEC_COLORS = ['#34C759','#007AFF','#FF9500','#FF3B30','#BF5AF2','#FF2D55','#5AC8FA','#FFCC00'];
    const codecBars = items => {
      if (!items?.length) return '';
      // Codec lists are long, so their rows tighten on a short window too.
      const rowGap = (!isMob && window.innerHeight < 900) ? 5 : 7;
      const maxC = items[0].count || 1;
      return items.map((it, i) => {
        const pct = Math.round((it.count / maxC) * 100);
        const color = CODEC_COLORS[i % CODEC_COLORS.length];
        const delay = (i * 0.05).toFixed(2);
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:${rowGap}px">
          <span style="font-size:10px;font-weight:600;color:var(--is-text);width:44px;text-align:right;flex-shrink:0;white-space:nowrap">${it.codec}</span>
          <div style="flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden">
            <div class="tl-g-anim-bar-h" style="height:100%;border-radius:3px;background:linear-gradient(to right,${color},${color}70);width:${pct}%;animation-delay:${delay}s"></div>
          </div>
          <span style="font-size:10px;color:var(--is-text-muted);width:32px;flex-shrink:0">${it.count}</span>
        </div>`;
      }).join('');
    };
    const codecSection = (title, items, extra = '') =>
      `<div class="u-panel-hdr"><span class="tl-graph-title">${title}</span>${extra}</div>${codecBars(items)}`;
    const _codecTab = m.qualityCodecTab || 'movies';
    const _ctBtnsEl = _traSegHtml([['movies', this._t('traMoviesTv')], ['music', this._t('tabMusic')]], _codecTab, 'data-tra-q-codec-tab', 'margin-left:auto');
    if (_codecTab === 'music') {
      const musicBars = codecBars(codecs.music?.codecs);
      return `<div class="tl-g-card">${codecSection(this._t('traAudioCodecs'), codecs.music?.codecs, _ctBtnsEl)}${musicBars ? '' : '<span style="font-size:11px;color:var(--is-text-muted)">' + this._t('tlNoData') + '</span>'}</div>`;
    }
    const videoSec = codecSection(this._t('traVideoCodecs'),   codecs.video?.codecs);
    const audioSec = codecSection(this._t('traAudioCodecs'),   codecs.audio?.codecs);
    const chanSec  = codecSection(this._t('traAudioChannels'), codecs.channels?.codecs, _ctBtnsEl);
    const isTabletQ = window.matchMedia('(max-width:860px) and (min-width:601px)').matches;
    const _innerCols = isMob
      ? `<div>${chanSec}</div><div>${videoSec}</div><div>${audioSec}</div>`
      : `<div>${videoSec}</div><div>${audioSec}</div><div>${chanSec}</div>`;
    const _qCols = isMob ? '1fr' : isTabletQ ? '1fr 1fr' : '1fr 1fr 1fr';
    const _qGap  = isMob ? '12px' : isTabletQ ? '10px' : '16px';
    return `<div class="tl-g-card"><div style="display:grid;grid-template-columns:${_qCols};gap:${_qGap}">${_innerCols}</div></div>`;
  }

  _traBodyQuality() {
    const m      = this._tracearrModal;
    const qd     = m.qualityData || {};
    // Handle Tracearr "generating snapshots" state
    if (qd.status === 'generating' || (qd.message && !qd.data)) {
      return `<div style="text-align:center;padding:48px 24px">
        <div style="font-size:28px;margin-bottom:12px">⏳</div>
        <div style="font-size:14px;font-weight:700;color:var(--is-text);margin-bottom:6px">${this._t('traGenHistory')}</div>
        <div style="font-size:12px;color:var(--is-text-muted)">${qd.message || this._t('traSnapshots')}</div>
      </div>`;
    }
    const isMob  = this._isMob;
    const Q_COLORS = { '4K': '#34C759', '1080p': '#007AFF', '720p': '#FF9500', 'SD': '#FF3B30' };
    const qualCard = this._traQualEvolCard();
    const codecsRow = this._traQualCodecsCard();

    // ── Resolution distribution donuts (Movies + TV Shows) ───────────────────
    const res = m.qualityResolution || {};
    const _resSegs = (obj) => {
      if (!obj) return [];
      // Handle both {count4k, count1080p, ...} and {"4K": N, "1080p": N, ...}
      const c4k   = obj.count4k   ?? obj['4K']    ?? obj['4k']    ?? 0;
      const c1080 = obj.count1080p ?? obj['1080p'] ?? 0;
      const c720  = obj.count720p  ?? obj['720p']  ?? 0;
      const cSd   = obj.countSd   ?? obj['SD']    ?? obj['sd']    ?? 0;
      return [
        { label: '4K',    value: c4k,   color: Q_COLORS['4K']    },
        { label: '1080p', value: c1080, color: Q_COLORS['1080p'] },
        { label: '720p',  value: c720,  color: Q_COLORS['720p']  },
        { label: 'SD',    value: cSd,   color: Q_COLORS['SD']    },
      ].filter(s => s.value > 0);
    };
    const movSegs  = _resSegs(res.movies);
    const showSegs = _resSegs(res.shows ?? res.tv ?? res.series);
    const movTotal  = movSegs.reduce((s, sg) => s + sg.value, 0) || 1;
    const showTotal = showSegs.reduce((s, sg) => s + sg.value, 0) || 1;

    const svgDonut = (segs, size) => {
      const total = segs.reduce((s, sg) => s + sg.value, 0);
      if (!total) return `<div class="donut-wrap" style="position:relative;display:inline-block;flex-shrink:0"><svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"></svg><div class="donut-tt" style="display:none"></div></div>`;
      const cx = size / 2, cy = size / 2, r = size * 0.34, sw = size * 0.15;
      const C  = 2 * Math.PI * r;
      let cum  = 0;
      const gap = segs.length > 1 ? 3 : 0;
      const uid = Math.random().toString(36).slice(2, 7);
      const ro  = (r + sw / 2).toFixed(1);
      const ri  = (r - sw / 2).toFixed(1);
      const ip  = (Number(ri) / Number(ro) * 100).toFixed(0);
      const defs = '<defs>' + segs.map((sg, i) =>
        `<radialGradient id="dg-${uid}-${i}" cx="${cx}" cy="${cy}" r="${ro}" fx="${cx}" fy="${cy}" gradientUnits="userSpaceOnUse">` +
        `<stop offset="${ip}%" stop-color="${sg.color}" stop-opacity="0.5"/>` +
        `<stop offset="100%" stop-color="${sg.color}" stop-opacity="1"/>` +
        `</radialGradient>`
      ).join('') + '</defs>';
      const rings = segs.map(sg => {
        const full = sg.value / total * C;
        const dash = Math.max(0, full - gap);
        const off  = -cum; cum += full;
        return `<circle class="donut-ring" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sg.color}" stroke-width="${sw * 1.9}" stroke-linecap="butt" stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" stroke-opacity="0" style="transition:stroke-opacity 0.15s"/>`;
      }).join('');
      cum = 0;
      const arcs = segs.map((sg, i) => {
        const full = sg.value / total * C;
        const dash = Math.max(0, full - gap);
        const off  = -cum; cum += full;
        const pct  = Math.round(sg.value / total * 100);
        return `<circle class="donut-arc" data-idx="${i}" data-label="${sg.label}" data-value="${sg.value}" data-pct="${pct}" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#dg-${uid}-${i})" stroke-width="${sw}" stroke-linecap="butt" stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" style="cursor:pointer"><animate attributeName="r" from="0" to="${r.toFixed(2)}" dur="0.8s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.25 0.46 0.45 0.94" keyTimes="0;1"/><animate attributeName="stroke-dasharray" from="0 ${C.toFixed(2)}" to="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" dur="0.8s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.25 0.46 0.45 0.94" keyTimes="0;1"/></circle>`;
      }).join('');
      const fs = Math.min(size * 0.13, 11);
      const svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;overflow:visible">
        ${defs}
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="${sw}"/>
        <g><animateTransform attributeName="transform" type="rotate" from="-360 ${cx} ${cy}" to="0 ${cx} ${cy}" dur="0.8s" begin="0s" fill="freeze" calcMode="spline" keySplines="0.25 0.46 0.45 0.94" keyTimes="0;1"/>${rings}${arcs}</g>
        <text x="${cx}" y="${cy + fs * 0.4}" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="${fs}" font-weight="700">${total}</text>
      </svg>`;
      return `<div class="donut-wrap" style="position:relative;display:inline-block;flex-shrink:0">${svg}<div class="donut-tt" style="display:none;position:absolute;pointer-events:none;background:rgba(15,15,20,0.92);border:1px solid rgba(255,255,255,0.13);border-radius:6px;padding:5px 9px;white-space:nowrap;z-index:10;color:rgba(255,255,255,0.9)"></div></div>`;
    };

    // Same reasoning as the evolution chart: a short window gets smaller rings.
    const shortQ2 = !isMob && window.innerHeight < 900;
    const ds = isMob ? 90 : shortQ2 ? 82 : 110;
    const _donutLegend = (segs, total) => segs.map(s => {
      const pct = Math.round(s.value / total * 100);
      return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:5px">
        <span style="width:8px;height:8px;border-radius:2px;background:${s.color};flex-shrink:0"></span>
        <span style="font-size:11px;color:var(--is-text);flex:1">${s.label}</span>
        <span style="font-size:11px;font-weight:700;color:var(--is-text-muted)">${s.value} <span style="opacity:0.6">(${pct}%)</span></span>
      </div>`;
    }).join('');

    const movCard  = `<div class="tl-g-card">
      <div style="margin-bottom:10px"><span class="tl-graph-title">${this._t('tabMovies')}</span><span style="float:right;font-size:10px;color:var(--is-text-muted)">${movTotal} ${this._t('traTotalItems')}</span></div>
      <div style="display:flex;align-items:center;gap:14px">
        ${svgDonut(movSegs, ds)}
        <div style="flex:1;min-width:0">${_donutLegend(movSegs, movTotal)}</div>
      </div>
    </div>`;
    const showCard = `<div class="tl-g-card">
      <div style="margin-bottom:10px"><span class="tl-graph-title">${this._t('tlFilterTvShows')}</span><span style="float:right;font-size:10px;color:var(--is-text-muted)">${showTotal} ${this._t('traTotalItems')}</span></div>
      <div style="display:flex;align-items:center;gap:14px">
        ${svgDonut(showSegs, ds)}
        <div style="flex:1;min-width:0">${_donutLegend(showSegs, showTotal)}</div>
      </div>
    </div>`;

    if (isMob) {
      return `<div style="display:flex;flex-direction:column;gap:8px"><div data-tra-q-evol>${qualCard}</div>${movCard}${showCard}<div data-tra-q-codecs>${codecsRow}</div></div>`;
    }
    return `<div data-tra-q-evol style="margin-bottom:8px">${qualCard}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">${movCard}${showCard}</div>
      <div data-tra-q-codecs>${codecsRow}</div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Storage tab (library analytics)
  // ──────────────────────────────────────────────────────────────────────────

  _traBodyStorage() {
    const m    = this._tracearrModal;
    const hist = (m.storageData?.history || []);
    const cur  = m.storageData?.current  || {};
    const st   = m.storageStats          || {};
    const isMob = this._isMob;

    const tile = (lbl, val, color, sub) =>
      `<div style="background:var(--is-row-hover);border-radius:7px;padding:5px 8px">
        <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--is-text-label);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lbl}</div>
        <div style="font-size:${isMob ? '13px' : '14px'};font-weight:800;line-height:1;color:${color};white-space:nowrap">${val}</div>
        ${sub ? `<div style="font-size:8px;color:var(--is-text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</div>` : ''}
      </div>`;

    const period = m.storagePeriod || 'month';
    const gr     = m.storageData?.growthRate;
    const growthVal = (() => {
      if (!gr) {
        // fallback: history delta for selected period
        const days = { week: 7, month: 30, year: 365 }[period];
        const slice = days ? hist.slice(-days) : hist;
        const f = slice[0], l = slice[slice.length - 1];
        return (f && l) ? Number(l.totalSizeBytes) - Number(f.totalSizeBytes) : 0;
      }
      if (period === 'week')  return Number(gr.bytesPerWeek  || 0);
      if (period === 'year')  return Number(gr.bytesPerMonth || 0) * 12;
      if (period === 'all') {
        const f = hist[0], l = hist[hist.length - 1];
        return (f && l) ? Number(l.totalSizeBytes) - Number(f.totalSizeBytes) : 0;
      }
      return Number(gr.bytesPerMonth || 0);
    })();
    const growthLabel = { week: this._t('traGrowthWk'), month: this._t('traGrowthMo'), year: this._t('traGrowthYr'), all: this._t('traGrowthTotal') }[period] || this._t('traGrowth');
    const growthSign  = growthVal >= 0 ? '+' : '';

    const dupG   = m.dupsSummary?.totalGroups || 0;
    const dupSav = Number(m.dupsSummary?.totalPotentialSavingsBytes || 0);

    const stSum  = m.staleSummary?.total || m.staleSummary?.neverWatched || {};
    const stCnt  = stSum.count || 0;
    const stSz   = Number(stSum.sizeBytes || 0);

    const tiles = `<div style="display:grid;grid-template-columns:repeat(${isMob ? 2 : 4},1fr);gap:${isMob ? '6px' : '8px'};margin-bottom:${isMob ? '6px' : '6px'}">
      ${tile(this._t('traTotalSize'),    fmtBytes(cur.totalSizeBytes || st.totalSizeBytes || 0), '#007AFF')}
      ${tile(growthLabel,                 growthSign + fmtBytes(Math.abs(growthVal), { empty: '0 B' }), growthVal >= 0 ? '#34C759' : '#FF3B30')}
      ${tile(this._t('traDuplicates'),               dupG ? this._t('traNGroups').replace('{n}', dupG.toLocaleString()) : '—', '#FF3B30', dupG ? this._t('traRecoverable').replace('{n}', fmtBytes(dupSav)) : '')}
      ${tile(this._t('traStaleContent'), stCnt ? this._t('traNItems').replace('{n}', stCnt.toLocaleString()) : '—', '#FF9500', stCnt ? this._t('traUnused').replace('{n}', fmtBytes(stSz)) : '')}
    </div>`;

    const periodDays = { week: 7, month: 30, year: 365 };
    const today      = new Date().toISOString().slice(0, 10);

    // ── Prediction ──────────────────────────────────────────────────────────
    const showPred   = m.storagePredictions !== false && period !== 'all';
    const predDays   = { week: 7, month: 30, year: 365, all: 30 }[period] || 30;

    const _rawSlice  = period === 'all' ? hist : hist.slice(-(periodDays[period] || 30));
    const _pastFull  = _rawSlice.filter(d => d.day <= today);
    // Downsample for 'all' to ~250 points max to avoid SVG overload.
    const _past      = (period === 'all' && _pastFull.length > 250) ? (() => {
      const stride = Math.ceil(_pastFull.length / 250);
      const sampled = _pastFull.filter((_, i) => i % stride === 0);
      // Always include last point
      if (sampled[sampled.length - 1] !== _pastFull[_pastFull.length - 1]) sampled.push(_pastFull[_pastFull.length - 1]);
      return sampled;
    })() : _pastFull;
    // With predictions: pad left with zeros only if we have fewer points than predDays.
    // Without predictions: just show real data, no padding.
    const histSlice  = showPred ? (() => {
      const _needed = predDays - _past.length;
      if (_needed <= 0) return _past;
      const firstDay = _past[0]?.day || today;
      const _padded  = Array.from({ length: _needed }, (_, i) => {
        const d = new Date(firstDay + 'T12:00:00');
        d.setDate(d.getDate() - (_needed - i));
        return { day: d.toISOString().slice(0, 10), totalSizeBytes: 0 };
      });
      return [..._padded, ..._past];
    })() : _past.filter(d => Number(d.totalSizeBytes) > 0);

    const lastHist    = histSlice[histSlice.length - 1];
    const lastBytes   = Number(lastHist?.totalSizeBytes || 0);
    // Use recent 30-day slope for bytesPerDay — API's growthRate averages since 2016 and is too low.
    const _recentPts  = _past.filter(d => Number(d.totalSizeBytes) > 0).slice(-30);
    const bytesPerDay = _recentPts.length >= 2
      ? (Number(_recentPts[_recentPts.length - 1].totalSizeBytes) - Number(_recentPts[0].totalSizeBytes)) / (_recentPts.length - 1)
      : Number(gr?.bytesPerDay || 0);

    // Spread = 10% of predicted value at each point (matches Tracearr's visual output)
    const predPoints = (showPred && lastHist && lastBytes > 0) ? Array.from({ length: predDays }, (_, i) => {
      const d = new Date(lastHist.day + 'T12:00:00');
      d.setDate(d.getDate() + i + 1);
      const mid    = lastBytes + bytesPerDay * (i + 1);
      const spread = mid * 0.10;
      return { day: d.toISOString().slice(0, 10), totalSizeBytes: mid, spreadHi: mid + spread, spreadLo: Math.max(0, mid - spread) };
    }) : [];

    const _nonZeroLen = histSlice.filter(d => Number(d.totalSizeBytes) > 0).length;
    const confidence  = _nonZeroLen >= 30 ? this._t('traSevHigh') : _nonZeroLen >= 7 ? this._t('traSevMedium') : this._t('traSevLow');
    const confColor   = { High: '#34C759', Medium: '#FF9500', Low: '#FF3B30' }[confidence];

    // ── SVG coordinate system ────────────────────────────────────────────────
    const VBW = 1000, SVH = 200, PL = 8, PR = 8, PT = 14, PB = 4;
    const cW = VBW - PL - PR, cH = SVH - PT - PB;
    const baseY  = PT + cH;
    const allPts = [...histSlice, ...predPoints];
    const toGiB  = b => Number(b) / 1024 ** 3;
    const allGiB = allPts.flatMap(d => [toGiB(d.totalSizeBytes), d.spreadHi ? toGiB(d.spreadHi) : 0]);
    const maxGiB = Math.max(...allGiB, 1) * 1.08;
    const N      = allPts.length;
    const slotW  = cW / Math.max(N, 1);
    const ptX    = i => PL + (i + 0.5) * slotW;
    const ptY    = v => Math.max(PT, Math.min(baseY, PT + cH * (1 - v / maxGiB)));

    // Cardinal spline, tension=0.3 — smooth but crisp (no fixed-dx wobble)
    // Monotone cubic Hermite (Fritsch-Carlson) — no overshoot, no horizontal stretch.
    const linePath = (pts) => {
      const n = pts.length;
      if (!n) return '';
      if (n < 2) return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
      // compute slopes
      const dx = [], dy = [], m = [];
      for (let i = 0; i < n - 1; i++) { dx[i] = pts[i+1].x - pts[i].x; dy[i] = pts[i+1].y - pts[i].y; m[i] = dy[i] / dx[i]; }
      // tangents
      const t = new Array(n);
      t[0] = m[0]; t[n-1] = m[n-2];
      for (let i = 1; i < n - 1; i++) t[i] = (m[i-1] + m[i]) / 2;
      // monotonicity (Fritsch-Carlson)
      for (let i = 0; i < n - 1; i++) {
        if (Math.abs(m[i]) < 1e-10) { t[i] = t[i+1] = 0; continue; }
        const a = t[i] / m[i], b = t[i+1] / m[i];
        if (a < 0 || b < 0) { t[i] = t[i+1] = 0; continue; }
        const h = Math.sqrt(a*a + b*b);
        if (h > 3) { t[i] = 3*m[i]/h*a; t[i+1] = 3*m[i]/h*b; }
      }
      let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < n - 1; i++) {
        const x1 = pts[i].x + dx[i]/3, y1 = pts[i].y + t[i]*dx[i]/3;
        const x2 = pts[i+1].x - dx[i]/3, y2 = pts[i+1].y - t[i+1]*dx[i]/3;
        d += ` C${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${pts[i+1].x.toFixed(1)},${pts[i+1].y.toFixed(1)}`;
      }
      return d;
    };
    const areaPath = (pts, bY) => {
      if (!pts.length) return '';
      return `${linePath(pts)} L${pts[pts.length-1].x.toFixed(1)},${bY} L${pts[0].x.toFixed(1)},${bY} Z`;
    };

    const histCoords = histSlice.map((d, i) => ({ x: ptX(i), y: ptY(toGiB(d.totalSizeBytes)), day: d.day, bytes: d.totalSizeBytes }));
    const hLast      = histCoords[histCoords.length - 1];
    const predCoords = predPoints.map((d, i) => ({ x: ptX(histSlice.length + i), y: ptY(toGiB(d.totalSizeBytes)), day: d.day, bytes: d.totalSizeBytes, spreadHi: d.spreadHi, spreadLo: d.spreadLo }));
    const predWithJoint = hLast ? [hLast, ...predCoords] : predCoords;

    // Spread band + border lines
    const _spreadJoint = (showPred && predCoords.length && predCoords[0]?.spreadHi && hLast)
      ? { x: hLast.x, y: hLast.y } : null;
    const spreadHiPts = _spreadJoint ? [_spreadJoint, ...predCoords.map(p => ({ x: p.x, y: ptY(toGiB(p.spreadHi)) }))] : [];
    const spreadLoPts = _spreadJoint ? [_spreadJoint, ...predCoords.map(p => ({ x: p.x, y: ptY(toGiB(p.spreadLo)) }))] : [];
    // Straight-edged wedge: joint → hi_end → lo_end → close
    const spreadBandPath = (spreadHiPts.length >= 2 && spreadLoPts.length >= 2) ? (() => {
      const j  = spreadHiPts[0];
      const hi = spreadHiPts[spreadHiPts.length - 1];
      const lo = spreadLoPts[spreadLoPts.length - 1];
      return `M${j.x.toFixed(1)},${j.y.toFixed(1)} L${hi.x.toFixed(1)},${hi.y.toFixed(1)} L${lo.x.toFixed(1)},${lo.y.toFixed(1)} Z`;
    })() : '';

    const lastPred   = predPoints[predPoints.length - 1];
    const rangeLoTB  = lastPred ? (toGiB(lastPred.spreadLo) / 1024).toFixed(2) : null;
    const rangeHiTB  = lastPred ? (toGiB(lastPred.spreadHi) / 1024).toFixed(2) : null;

    const HEX      = '#007AFF';
    const PRED_HEX = '#e0f2fe'; // very light (near-white) — distinct from teal gradient
    const SPRD_HEX = '#5AC8FA';
    const chartH   = isMob ? (showPred ? 88 : 108) : (showPred ? 90 : 110);

    // ── Y-axis ticks ─────────────────────────────────────────────────────────
    const maxTB    = maxGiB / 1024;
    const tickStep = maxTB <= 0.5 ? 0.1 : maxTB <= 1 ? 0.25 : maxTB <= 2 ? 0.5 : maxTB <= 5 ? 1 : maxTB <= 10 ? 2 : 5;
    const yTicks   = [];
    for (let v = 0; v <= maxTB * 1.01; v = Math.round((v + tickStep) * 1000) / 1000) yTicks.push(v);
    const yAxisHtml = yTicks.map(v => {
      const pct = (ptY(v * 1024) / SVH * 100).toFixed(1);
      return `<span style="position:absolute;right:4px;top:${pct}%;transform:translateY(-50%);font-size:9px;color:rgba(255,255,255,0.32);white-space:nowrap;line-height:1">${v} TB</span>`;
    }).join('');

    // ── X-labels ─────────────────────────────────────────────────────────────
    const showEvery = Math.max(1, Math.ceil((isMob ? 110 : 62) / slotW));
    const xLabelsHtml = (() => {
      let lastLbl = '';
      return `<div class="tl-g-x-labels">` + allPts.map((d, i) => {
        const isLast = i === N - 1, isFirst = i === 0;
        if (!isFirst && !isLast && i % showEvery !== 0) return '';
        const lbl = (period === 'week' || period === 'month') ? d.day.slice(5) : d.day.slice(2, 7);
        if (lbl === lastLbl) return '';
        lastLbl = lbl;
        const pct = ptX(i) / VBW * 100;
        const tx = isFirst ? '-25%' : isLast ? '-75%' : '-50%';
        return `<span style="position:absolute;left:${pct.toFixed(1)}%;transform:translateX(${tx});font-size:10px;color:var(--is-text-muted);white-space:nowrap;line-height:1">${lbl}</span>`;
      }).join('') + '</div>';
    })();

    // ── Dots: circles for prediction, none for history ───────────────────────
    const DOT_R   = 3;
    const MASK_R  = DOT_R + 2;
    const predDotStep = Math.max(1, Math.floor(predCoords.length / 12));
    const visPredDots = showPred ? predCoords.filter((_, i) => i % predDotStep === 0) : [];
    const maskCircles = visPredDots
      .map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${MASK_R}"/>`).join('');
    const dotEl = p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${DOT_R}" style="fill:transparent;stroke:${HEX};stroke-width:1.5" vector-effect="non-scaling-stroke"/>`;
    const histDots = '';
    const predDots = visPredDots.map(dotEl).join('');

    // ── Hit columns for tooltips (data-tl-g-col) ─────────────────────────────
    const _esc  = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const fmtTB = b => (toGiB(b) / 1024).toFixed(2) + ' TB';
    const hitCols = allPts.map((d, i) => {
      const isPred = i >= histSlice.length;
      const byt    = Number(d.totalSizeBytes);
      if (byt <= 0 && !isPred) return ''; // skip zero-padded hist
      const hex    = HEX;
      const name   = isPred ? this._t('traPrediction') : this._t('storage');
      const fv     = fmtTB(isPred ? byt : byt);
      const td     = _esc(JSON.stringify({ lbl: d.day, tot: null, ftot: fv, vals: [{ n: name, v: byt, fv, hex }] }));
      const rx     = (PL + i * slotW).toFixed(1);
      const rw     = slotW.toFixed(1);
      return `<g class="tl-g-lcol" data-tl-g-col="${td}" style="cursor:pointer">` +
             `<rect class="tl-g-lhlt" x="${rx}" y="${PT}" width="${rw}" height="${cH}" style="fill:rgba(255,255,255,0.12);opacity:0"/>` +
             `<rect x="${rx}" y="${PT}" width="${rw}" height="${cH}" fill="transparent"/></g>`;
    }).join('');

    // "Now" line
    const nowX = hLast ? hLast.x.toFixed(1) : null;

    // ── SVG ──────────────────────────────────────────────────────────────────
    const svgInner = `
      <defs>
        <linearGradient id="tras-gh" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${HEX}" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="${HEX}" stop-opacity="0"/>
        </linearGradient>
        <mask id="tras-dot-mask">
          <rect x="0" y="0" width="${VBW}" height="${SVH}" fill="white"/>
          ${maskCircles}
        </mask>
      </defs>
      ${yTicks.map(v => `<line x1="${PL}" y1="${ptY(v * 1024).toFixed(1)}" x2="${VBW - PR}" y2="${ptY(v * 1024).toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`).join('')}
      ${spreadBandPath ? `<path d="${spreadBandPath}" fill="${SPRD_HEX}" fill-opacity="0.12" style="animation:fade-in 0.8s ease-out both"/>` : ''}
      ${spreadHiPts.length >= 2 ? `<line x1="${spreadHiPts[0].x.toFixed(1)}" y1="${spreadHiPts[0].y.toFixed(1)}" x2="${spreadHiPts[spreadHiPts.length-1].x.toFixed(1)}" y2="${spreadHiPts[spreadHiPts.length-1].y.toFixed(1)}" stroke="${SPRD_HEX}" stroke-width="1" stroke-opacity="0.5" vector-effect="non-scaling-stroke" style="animation:fade-in 0.8s ease-out both"/>` : ''}
      ${spreadLoPts.length >= 2 ? `<line x1="${spreadLoPts[0].x.toFixed(1)}" y1="${spreadLoPts[0].y.toFixed(1)}" x2="${spreadLoPts[spreadLoPts.length-1].x.toFixed(1)}" y2="${spreadLoPts[spreadLoPts.length-1].y.toFixed(1)}" stroke="${SPRD_HEX}" stroke-width="1" stroke-opacity="0.5" vector-effect="non-scaling-stroke" style="animation:fade-in 0.8s ease-out both"/>` : ''}
      <path d="${areaPath(histCoords, baseY)}" fill="url(#tras-gh)" style="animation:fade-in 0.8s ease-out both"/>
      ${nowX ? `<line x1="${nowX}" y1="${PT}" x2="${nowX}" y2="${baseY}" stroke="rgba(255,255,255,0.22)" stroke-width="1" stroke-dasharray="4 3"/>` : ''}
      <path d="${linePath(histCoords, period === 'week' ? 0 : period === 'month' ? 0.1 : 0.3)}" fill="none" stroke="${HEX}" stroke-width="2" vector-effect="non-scaling-stroke" class="tl-g-anim-line"/>
      ${showPred && predWithJoint.length > 1
        ? `<path d="${linePath(predWithJoint, period === 'week' ? 0 : period === 'month' ? 0.1 : 0.3)}" fill="none" stroke="${HEX}" stroke-width="1.5" stroke-dasharray="8 5" vector-effect="non-scaling-stroke" mask="url(#tras-dot-mask)" style="animation:fade-in 0.8s ease-out both"/>`
        : ''}
      ${histDots}${predDots ? `<g class="u-fade-in">${predDots}</g>` : ''}
      ${hitCols}
    `;

    const storSvg = `<div class="tl-g-wrap" style="position:relative;padding-left:36px">
      <div style="position:absolute;left:0;top:0;height:${chartH}px;width:34px"><div style="position:relative;height:100%">${yAxisHtml}</div></div>
      <svg class="tl-g-svg" viewBox="0 0 ${VBW} ${SVH}" width="100%" height="${chartH}" preserveAspectRatio="none">${svgInner}</svg>
      ${xLabelsHtml}
    </div>`;

    // ── Legend ───────────────────────────────────────────────────────────────
    const legend = showPred ? `<div style="display:flex;gap:10px;align-items:center;font-size:10px;color:var(--is-text-muted)">
      <span class="u-row-4"><span style="display:inline-block;width:18px;height:2px;background:${HEX}"></span>${this._t('traHistorical')}</span>
      <span class="u-row-4"><svg width="20" height="4" style="flex-shrink:0"><line x1="0" y1="2" x2="20" y2="2" stroke="${HEX}" stroke-width="2" stroke-dasharray="6 4"/></svg>${this._t('traPrediction')}</span>
      <span class="u-row-4"><span style="display:inline-block;width:18px;height:6px;border-radius:2px;background:${SPRD_HEX};opacity:0.35"></span>${this._t('traRange')}</span>
    </div>` : '';

    const _STOR_P_LBLS = isMob ? { week: 'W', month: 'M', year: 'Y', all: this._t('tabAll') } : { week: this._t('mtWeek'), month: this._t('mtMonth'), year: this._t('actColYear'), all: this._t('tabAll') };
    const periodBtns = _traSegHtml(['week','month','year','all'].map(p => [p, _STOR_P_LBLS[p]]), period, 'data-tra-stor-period');

    const predToggle = `<button data-tra-stor-pred style="display:flex;align-items:center;gap:5px;background:none;border:none;cursor:pointer;padding:0;font-size:10px;color:var(--is-text-muted)">
      <span style="position:relative;display:inline-block;width:28px;height:15px;border-radius:8px;background:${showPred ? HEX : 'rgba(255,255,255,0.15)'};transition:background 0.2s;flex-shrink:0">
        <span style="position:absolute;top:2px;left:${showPred ? '15px' : '2px'};width:11px;height:11px;border-radius:50%;background:#fff;transition:left 0.2s"></span>
      </span>
      ${this._t('traPredictions')}
    </button>`;

    const rangeStr  = (rangeLoTB && rangeHiTB) ? ` · ${rangeLoTB}–${rangeHiTB} TB` : '';
    const confBadge = showPred ? `${this._uiBadge(`${confidence} Confidence${rangeStr}`, this._hexToRgbTriple(confColor), { small: true })}` : '';

    // Only a phone sends the confidence badge under the chart — there the
    // header has no room for it beside the controls, and they wrapped. A wide
    // screen keeps it next to the title, where it reads as part of the heading.
    const storCard = `<div class="tl-g-card" style="position:relative">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
        <span class="tl-graph-title" style="display:inline-flex;align-items:center;gap:7px">${this._t('traStorageTrend')}${isMob ? '' : confBadge}</span>
        ${isMob
          // A phone drops the capsule: inside one the group has to shrink to
          // its inset, which left these buttons smaller than the same group
          // standing alone in the next card.
          ? `<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">${predToggle}<span class="mt-tb-sep"></span>${periodBtns}</div>`
          : `<div class="mt-tb mt-tb--card" style="min-height:34px;padding:0 10px 0 12px;gap:8px;flex-shrink:0">
               ${predToggle}<span class="mt-tb-sep"></span>${periodBtns}
             </div>`}
      </div>
      ${legend ? `<div style="margin-bottom:4px">${legend}</div>` : ''}
      <div style="position:relative">
        ${storSvg}
        <div class="tl-g-tip" style="display:none;position:absolute;top:0;left:0;background:var(--is-menu-bg,#18182a);border:1px solid var(--is-btn-bdr);border-radius:7px;padding:7px 10px;font-size:11px;pointer-events:none;z-index:50;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3)"></div>
      </div>
      ${(isMob && confBadge) ? `<div style="display:flex;justify-content:flex-end;margin-top:6px">${confBadge}</div>` : ''}
    </div>`;

    if (isMob) {
      return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;margin:-10px -12px -16px">
        <div style="flex:1;min-height:0;overflow-y:auto;padding:10px 12px 0">
          ${tiles}${storCard}<div data-tra-stale-wrap style="margin-top:6px">${this._traBodyStaleSection()}</div>
        </div>
        <div data-tra-stale-pag style="flex-shrink:0;padding:4px 12px 8px">${this._traStalePagHtml()}</div>
      </div>`;
    }
    return tiles + storCard + `<div data-tra-stale-wrap style="margin-top:6px">${this._traBodyStaleSection()}</div>`;
  }

  _traBodyStaleSection() {
    const m      = this._tracearrModal;
    const isMob  = this._isMob;
    const items  = m.staleItems || [];
    const total  = m.staleTotal || 0;
    const sum    = m.staleSummary || {};
    const cat    = m.staleCategory || 'never_watched';
    const page   = m.stalePage || 0;
    const pp     = m.stalePageSize || 10;
    const totalP = Math.max(1, Math.ceil(total / pp));
    const nwCnt  = sum.neverWatched?.count ?? 0;
    const stCnt  = sum.stale?.count        ?? 0;

    const fmtDate = iso => {
      if (!iso) return '—';
      const d = new Date(iso);
      const diff = Math.floor((Date.now() - d) / 86400000);
      if (diff === 0) return this._t('traToday');
      if (diff === 1) return this._t('traYesterday');
      return this._t('traDaysAgo').replace('%d', diff);
    };

    const RES_COLOR = { '4k': '#BF5AF2', '1080p': '#007AFF', '720p': '#34C759', '480p': '#FF9500', 'sd': '#FF9500' };

    const mt = m.staleMediaType || '';

    // The two categories are one choice, so they are a picker rather than a pair
    // of pills — and their counts ride in the label, where they still read.
    const catItems = [
      ['never_watched', `${this._t('traNeverWatched')} (${nwCnt.toLocaleString()})`],
      ['stale',         `${this._t('traStaleContent')} (${stCnt.toLocaleString()})`],
    ];
    const staleSels = [
      { id: 'tra-stale-cat',  kind: 'event',   value: cat, neutral: null, items: catItems },
      { id: 'tra-stale-type', kind: 'source',  value: mt,  neutral: '',
        items: [['', this._t('traAllTypes')], ['movie', this._t('tabMovies')], ['show', this._t('tlFilterTvShows')]] },
    ];
    if (cat === 'stale') {
      staleSels.push({ id: 'tra-stale-months', kind: 'protocol', value: String(m.staleMonths || 3), neutral: '3',
        items: [['3', this._t('traUnw3')], ['6', this._t('traUnw6')], ['12', this._t('traUnw12')], ['24', this._t('traUnw24')]] });
    }
    // The capsule earns its keep now that it holds a search for the table
    // below — it filters the whole fetched set, not just the page on screen.
    const subTabs = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">${
      this._uiBar('tra-stale-search', m.staleSearch || '', staleSels, [])}</div>`;

    let tableHtml = '';
    if (!items.length) {
      tableHtml = `<div style="text-align:center;color:var(--is-text-muted);padding:20px 0;font-size:12px">${this._t('tlNoData')}</div>`;
    } else if (isMob) {
      const rows = items.map(it => {
        const res    = (it.resolution || '').toLowerCase();
        const rColor = RES_COLOR[res] || 'rgba(255,255,255,0.4)';
        return `<div class="tl-mob-card">
          <div class="u-row-8">
            ${this._tlMediaIcon(it.mediaType === 'movie' ? 'movie' : 'episode', 15)}
            <div style="flex:1;min-width:0">
              <div class="tl-mob-name u-truncate">${it.title}${it.year ? ` <span style="opacity:0.5;font-size:10px">(${it.year})</span>` : ''}</div>
              <div class="tl-mob-meta"><span>${it.serverName || ''}</span><span style="color:var(--is-text);font-weight:600">${it.resolution || '—'}</span><span>${fmtDate(it.addedAt)}</span></div>
            </div>
            <span style="font-size:11px;font-weight:700;color:#007AFF;flex-shrink:0;white-space:nowrap">${fmtBytes(it.fileSize)}</span>
          </div>
        </div>`;
      }).join('');
      tableHtml = `<div>${rows}</div>`;
    } else {
      const sortCol = m.staleSort || 'fileSize';
      const sortDir = m.staleOrder || 'desc';
      const sth = (col, lbl, align) => {
        const active = sortCol === col;
        const arrow  = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
        return `<th data-tra-stale-sort="${col}" style="cursor:pointer;user-select:none;white-space:nowrap${align ? ';text-align:' + align : ''};color:${active ? 'var(--is-text)' : ''}">${lbl}${arrow}</th>`;
      };
      const hasStreaming = false;
      const rows = items.map(it => {
        const res    = (it.resolution || '').toLowerCase();
        const rColor = RES_COLOR[res] || 'rgba(255,255,255,0.4)';
        const plays  = it.playCount ?? it.watchCount ?? null;
        const lastP  = it.lastPlayedAt ? fmtDate(it.lastPlayedAt) : null;
        const streamCell = hasStreaming
          ? `<td style="font-size:11px;color:var(--is-text-muted);white-space:nowrap">${plays != null ? plays + '×' : ''}${lastP ? `<span style="margin-left:4px;opacity:0.7">${lastP}</span>` : ''}${plays == null && !lastP ? '—' : ''}</td>`
          : '';
        return `<tr>
          <td style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            <span style="display:flex;align-items:center;gap:4px;min-width:0">
              ${this._tlMediaIcon(it.mediaType === 'movie' ? 'movie' : 'episode', 15)}
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.title}${it.year ? ` <span style="opacity:0.5;font-size:10px">(${it.year})</span>` : ''}</span>
            </span></td>
          <td style="font-size:11px;color:var(--is-text-muted);white-space:nowrap">${it.serverName || '—'}</td>
          <td style="font-size:11px;font-weight:600;color:var(--is-text);white-space:nowrap;text-align:right">${fmtBytes(it.fileSize)}</td>
          <td style="font-size:11px;color:var(--is-text-muted);white-space:nowrap">${fmtDate(it.addedAt)}</td>
          <td style="font-size:11px;font-weight:600;color:var(--is-text);white-space:nowrap">${it.resolution || '—'}</td>
          ${streamCell}
        </tr>`;
      }).join('');
      tableHtml = `<div>
        <table class="tl-hist-table" style="table-layout:fixed;width:100%">
          <colgroup>
            <col style="width:40%">
            <col style="width:90px">
            <col style="width:64px">
            <col style="width:72px">
            <col style="width:72px">
            ${hasStreaming ? '<col style="width:90px">' : ''}
          </colgroup>
          <thead><tr>
            <th>${this._t('traTitle')}</th>
            <th>${this._t('traServer')}</th>
            ${sth('fileSize', this._t('traSize'), 'right')}
            ${sth('addedAt', this._t('traAdded'))}
            ${sth('resolution', this._t('traResolution'))}
            ${hasStreaming ? sth('playCount', this._t('qaStatsPlays')) : ''}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }

    const pagination = this._uiPager('tra-stale-page', page, totalP, true);

    // The results sit in their own wrapper so a refresh can replace them alone —
    // recreating the search input would take the caret with it.
    if (isMob) return `${subTabs}<div class="tra-stale-results-wrap" style="display:contents">${tableHtml}</div>`;
    return `${subTabs}<div class="tra-stale-results-wrap" style="display:contents">${tableHtml}${pagination}</div>`;
  }

  _traStalePagHtml() {
    const m = this._tracearrModal;
    const page   = m.stalePage || 0;
    const pp     = m.stalePageSize || 10;
    const totalP = Math.max(1, Math.ceil((m.staleTotal || 0) / pp));
    return this._uiPager('tra-stale-page', page, totalP, true) || '';
  }

}

export const tracearrLibraryMixin = _TracearrLibraryMethods.prototype;
