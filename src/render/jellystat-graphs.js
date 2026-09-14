// Jellystat — Graphs tab
// 3 graphs, series = library names, Count/Duration toggle + range

const _JS_DOW_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function _jsLibData(stats, libName, field) {
  return stats.map(entry => {
    const v = entry[libName];
    return v && typeof v === 'object' ? v[field] || 0 : 0;
  });
}

function _jsLibChart(raw, cats, dataFn) {
  if (!raw?.stats?.length) return null;
  const libs = raw.libraries || [];
  const mk = field => {
    const series = libs.map(lib => ({
      name: lib.Name,
      data: dataFn(raw.stats, lib.Name, field),
    })).filter(s => s.data.some(v => v > 0));
    if (!series.length) return null;
    return { response: { data: { categories: cats, series } } };
  };
  return { plays: mk('count'), duration: mk('duration') };
}

function _jsPrepByDate(raw) {
  if (!raw?.stats?.length) return null;
  const cats = raw.stats.map(r => r.Key.replace(/,?\s*\d{4}$/, '')); // "May 06"
  return _jsLibChart(raw, cats, _jsLibData);
}

// Key is full day name "Sunday"…"Saturday" OR numeric 0-6/1-7
const _JS_DOW_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function _jsPrepByDow(raw) {
  if (!raw?.stats?.length) return null;
  const libs = raw.libraries || [];
  const mk = field => {
    const series = libs.map(lib => ({
      name: lib.Name,
      data: _JS_DOW_NAMES.map((_, i) => {
        const entry = raw.stats.find(s =>
          s.Key === _JS_DOW_FULL[i] ||          // "Sunday" etc.
          Number(s.Key) === i ||                 // 0-indexed numeric
          Number(s.Key) === i + 1               // 1-indexed numeric
        );
        const v = entry?.[lib.Name];
        return v && typeof v === 'object' ? v[field] || 0 : 0;
      }),
    })).filter(s => s.data.some(v => v > 0));
    if (!series.length) return null;
    return { response: { data: { categories: _JS_DOW_NAMES, series } } };
  };
  return { plays: mk('count'), duration: mk('duration') };
}

function _jsPrepByHod(raw) {
  if (!raw?.stats?.length) return null;
  const cats = Array.from({ length: 24 }, (_, i) => String(i));
  const libs = raw.libraries || [];
  const mk = field => {
    const series = libs.map(lib => ({
      name: lib.Name,
      data: cats.map(h => {
        const entry = raw.stats.find(s => Number(s.Key) === Number(h));
        const v = entry?.[lib.Name];
        return v && typeof v === 'object' ? v[field] || 0 : 0;
      }),
    })).filter(s => s.data.some(v => v > 0));
    if (!series.length) return null;
    return { response: { data: { categories: cats, series } } };
  };
  return { plays: mk('count'), duration: mk('duration') };
}

class _JellystatGraphsMethods {

  _jsBodyGraphs() {
    const m = this._jellystatModal;
    if (!m) return '';
    if (m.graphsLoading) return '<div class="u-empty-lg">Loading&hellip;</div>';

    const metric = m.graphsMetric || 'plays';
    const range  = m.graphsRange  || 30;
    const isMob  = this._isMob;
    const isDur  = metric === 'duration';

    const _gi = d => '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">' + d + '</svg>';
    const METRICS = [
      { v: 'plays',    label: this._t('tlGMetricPlayCount'),    icon: _gi('<polygon points="6 3 20 12 6 21 6 3"/>') },
      { v: 'duration', label: this._t('tlGMetricPlayDuration'), icon: _gi('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>') },
    ];
    // Built like the header menu: one fill the wire layer measures onto the
    // active button, so a phone can show the glyph alone and give the word only
    // to the chosen one.
    const metricSeg = '<span id="js-g-metric-nav" class="mt-nav mt-nav--inline"><span class="mt-nav-ind"></span>'
      + METRICS.map(o => '<button class="mt-nav-btn' + (o.v === metric ? ' is-on' : '') + '" data-js-g-metric="' + o.v + '" title="' + this._escHtml(o.label) + '">'
        + o.icon + ((!isMob || o.v === metric) ? o.label : '') + '</button>').join('')
      + '</span>';

    const rangeCtrl = '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--is-text-muted);flex-shrink:0;padding:0 4px">'
      + (isMob ? '' : '<span>' + this._t('tlGLast') + '</span>')
      + '<input id="js-g-range" type="number" value="' + range + '" min="1" max="365" style="width:42px;height:26px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:999px;color:var(--is-text);padding:0;font-size:12px;text-align:center;font-family:inherit;outline:none;box-sizing:border-box;-webkit-appearance:none;appearance:none">'
      + '<span>' + (isMob ? 'D' : this._t('jsDays')) + '</span></span>';

    // A phone has no room for the range in the bar, so it rides in the corner
    // of the first card instead.
    const mobRange = isMob ? rangeCtrl : '';
    const controls = '<div class="mt-tb" style="min-height:34px;padding:0 3px;gap:6px;margin-bottom:' + (isMob ? 10 : 14) + 'px;flex-shrink:0">'
      + '<span style="display:flex;align-items:center;gap:6px;height:28px;flex:1;min-width:0">' + metricSeg + '</span>'
      + (isMob ? '' : rangeCtrl) + '</div>';

    const gd   = m.graphsData || {};
    const BASE = { range, isDate: false, isDuration: isDur, isMob };
    const barO = { isDuration: isDur, isMob };
    const pick = obj => isDur ? obj?.duration : obj?.plays;

    // Date x-labels: shorter on mobile/dense ranges — show day number only
    const dateLabel = (d, _i, n) => (isMob || n > 20) ? (d.split(' ')[1] || d) : d;

    const lineSvg = this._tlGLineSvg(pick(gd.byDate), { ...BASE, chartId:'jd', xLabel: dateLabel });
    const dowSvg  = this._tlGBarSvg(pick(gd.byDow),   { ...barO, chartId:'jw', xLabel: d => { const k = { Sun: 'dowSun', Mon: 'dowMon', Tue: 'dowTue', Wed: 'dowWed', Thu: 'dowThu', Fri: 'dowFri', Sat: 'dowSat' }[d]; return k ? this._t(k) : d; } });
    const hodSvg  = this._tlGBarSvg(pick(gd.byHod),   { ...barO, chartId:'jh', xLabel: (_, i) => i % 4 === 0 ? i + 'h' : '' });

    const lineTitle = isDur
      ? this._t('jsGDailyDur').replace('{n}', range)
      : this._t('jsGDailyCount').replace('{n}', range);
    const dowTitle = this._t(isDur ? 'jsGDowDur' : 'jsGDowCount').replace('{n}', range);
    const hodTitle = this._t(isDur ? 'jsGHodDur' : 'jsGHodCount').replace('{n}', range);

    // Pass pick(gd.X) to _tlGCard so legend reads .response.data.series
    const halfRow = isMob
      ? '<div style="margin-bottom:10px">' + this._tlGCard(dowTitle, pick(gd.byDow), dowSvg) + '</div>'
        + '<div style="margin-bottom:10px">' + this._tlGCard(hodTitle, pick(gd.byHod), hodSvg) + '</div>'
      : '<div style="display:flex;gap:10px;margin-bottom:10px">'
        + '<div style="flex:1;min-width:0">' + this._tlGCard(dowTitle, pick(gd.byDow), dowSvg) + '</div>'
        + '<div style="flex:1;min-width:0">' + this._tlGCard(hodTitle, pick(gd.byHod), hodSvg) + '</div>'
        + '</div>';

    return controls
      + '<div style="margin-bottom:10px">' + this._tlGCard(lineTitle, pick(gd.byDate), lineSvg, mobRange) + '</div>'
      + halfRow;
  }

  async _jsFetchGraphs() {
    const days = this._jellystatModal?.graphsRange || 30;
    const [byDateRaw, byDowRaw, byHodRaw] = await Promise.all([
      this._jsApiFetch('stats/getViewsOverTime?days=' + days),
      this._jsApiFetch('stats/getViewsByDays?days=' + days),
      this._jsApiFetch('stats/getViewsByHour?days=' + days),
    ]);
    return {
      byDate: _jsPrepByDate(byDateRaw),
      byDow:  _jsPrepByDow(byDowRaw),
      byHod:  _jsPrepByHod(byHodRaw),
    };
  }

  async _jsRefetchGraphs(body) {
    const m = this._jellystatModal;
    if (!m || !body) return;
    m.graphsLoading = true;
    body.innerHTML  = this._jsBodyGraphs();
    const gd = await this._jsFetchGraphs();
    if (!this._jellystatModal) return;
    m.graphsData    = gd;
    m.graphsLoading = false;
    body.innerHTML  = this._jsBodyGraphs();
    this._wireJsGraphControls(body);
    this._tlGTriggerAnim(body);
  }
}

export const jellystatGraphsMixin = _JellystatGraphsMethods.prototype;
