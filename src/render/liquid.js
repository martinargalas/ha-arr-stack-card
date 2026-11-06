// Liquid glass on the card's panels: the backdrop refracted through a lens
// along each panel's edge, as glass-cards draws it (render/liquid-gl.js).
//
// Used by the Liquid Glass and Apple Home presets only, and fetched with them
// (chunks/liquid.js). The canvases are not put inside the columns: a column's
// contents are painted by _paintCol, which compares child nodes and would
// throw a stranger out. They sit in a layer of their own under the columns,
// placed over each one, and a column that has its glass drawn drops its CSS
// glass (.lg-on). Where WebGL cannot draw — no WebGL, no wallpaper behind the
// view yet — the preset's CSS glass is what shows; in Chromium without WebGL
// an SVG lens does the bending.

import { GLASS_DEFAULTS, getRenderer, registerJob, webglAvailable } from './liquid-gl.js';

// Which panels each look turns to liquid glass, and how. The Apple Home
// sidebar is dark glass tinted by the wallpaper, whichever side it is on.
const LOOKS = {
  // At night the bright rim is quieter, as glass-cards' dark appearance has it
  liquid: dark => [{ sel: '.col-left, .col-right', p: dark ? { dark: 1, rimLight: 0.22, specular: 0.15 } : { dark: 0 } }],
  // The sidebar only: the posters' panel and the header are the bars'
  // material, which glass-cards draws without a lens. Blue-grey by day,
  // graphite at night.
  'apple-home': dark => [{ sel: '.col-left', p: dark
    ? { dark: 1, tintR: 24, tintG: 26, tintB: 32, tintA: 0.6, rimLight: 0.22, specular: 0.15 }
    : { dark: 1, tintR: 22, tintG: 30, tintB: 46, tintA: 0.45 } }],
};
// The search header's bar and its close button take the look of the panel
// that holds the posters
const BAR_SEL = '.ash-col:not(.ash-bare), .ash-close:not(.ash-bare)';
// A detail's buttons lie over its picture, not the wallpaper the WebGL glass
// samples: they bend what is behind them through the SVG lens (Chromium)
const HERO_SEL = '.popup-overlay .pp-hero-pill :is(.is-open-btn, .remove-lib-btn, .is-collapse-btn)';

const lensSupported = (() => {
  try { return CSS.supports('backdrop-filter', 'url(#a)') && /Chrome\/\d+/.test(navigator.userAgent); } catch (_) { return false; }
})();

// The SVG lens's displacement map: R/G = x/y offset (128 = none), along the
// edge normal, steepening towards the edge like a lens's slope.
const maps = new Map();
function lensMap(w, h, r, bezel) {
  const key = `${w}x${h}r${r}b${bezel}`;
  if (maps.has(key)) return maps.get(key);
  const S = 0.25, cw = Math.max(2, Math.round(w * S)), ch = Math.max(2, Math.round(h * S));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(cw, ch);
  const hw = w / 2, hh = h / 2, rr = Math.min(r, hw, hh);
  for (let py = 0; py < ch; py++) {
    for (let px = 0; px < cw; px++) {
      const x = (px + 0.5) / S - hw, y = (py + 0.5) / S - hh;
      const qx = Math.abs(x) - (hw - rr), qy = Math.abs(y) - (hh - rr);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const inside = -(Math.min(Math.max(qx, qy), 0) + Math.hypot(ox, oy) - rr);
      let nx = 0, ny = 0;
      if (ox > 0 && oy > 0) { const l = Math.hypot(ox, oy) || 1; nx = (ox / l) * Math.sign(x); ny = (oy / l) * Math.sign(y); }
      else if (qx > qy) nx = Math.sign(x);
      else ny = Math.sign(y);
      const t = Math.min(1, Math.max(0, 1 - inside / bezel));
      const m = 1 - Math.sqrt(1 - t * t);
      const i = (py * cw + px) * 4;
      img.data[i] = 128 + Math.round(127 * m * nx);
      img.data[i + 1] = 128 + Math.round(127 * m * ny);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = c.toDataURL('image/png');
  maps.set(key, url);
  return url;
}

let uid = 0;

// The glass of one shadow root: its targets, a layer of canvases under them
// (WebGL), or an SVG of lens filters (Chromium without WebGL).
class LiquidLayer {
  constructor(root, parent, { lensOnly = false } = {}) {
    this.root = root;
    this.lensOnly = lensOnly;
    this.parent = parent;      // positioned; the layer fills it
    this.canvases = new Map(); // target → canvas
    this.lenses = new Map();   // target → { id, w, h, markup }
    this.params = new Map();   // target → shader parameters
  }

  update(groups) {
    const want = new Map();
    for (const g of groups) this.root.querySelectorAll(g.sel).forEach(el => { if (el.offsetParent !== null || el.offsetWidth) want.set(el, g.p); });
    this.params = want;
    if (!this.lensOnly && getRenderer()) this._gl(want);
    else if (lensSupported) this._lens(want);
  }

  _gl(want) {
    if (!this.layer?.isConnected) {
      this.layer = document.createElement('div');
      this.layer.className = 'lq-layer';
      this.layer.setAttribute('aria-hidden', 'true');
      this.parent.prepend(this.layer);
    }
    for (const [el, cv] of this.canvases) {
      if (!want.has(el) || !el.isConnected) { cv.remove(); el.classList.remove('lg-on'); this.canvases.delete(el); this.ro?.unobserve(el); }
    }
    this.ro ??= new ResizeObserver(() => this.draw());
    this.ro.observe(this.parent);
    for (const el of want.keys()) {
      if (this.canvases.has(el)) continue;
      const cv = document.createElement('canvas');
      cv.className = 'lq';
      this.layer.appendChild(cv);
      this.canvases.set(el, cv);
      this.ro.observe(el);
    }
    this.unregister ??= registerJob(() => this.draw());
    this.draw();
    // Layout settles after fonts and posters arrive: once more then
    clearTimeout(this.settle);
    this.settle = setTimeout(() => this.draw(), 600);
  }

  // Each canvas over its panel, then the panel's glass into it
  draw() {
    const r = getRenderer();
    if (!r || !this.layer) return;
    const base = this.parent.getBoundingClientRect();
    const k = this.parent.offsetWidth ? base.width / this.parent.offsetWidth : 1;
    for (const [el, cv] of this.canvases) {
      if (!el.isConnected) continue;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) { cv.style.display = 'none'; continue; }
      cv.style.display = '';
      Object.assign(cv.style, {
        left: `${(b.left - base.left) / k}px`, top: `${(b.top - base.top) / k}px`,
        width: `${b.width / k}px`, height: `${b.height / k}px`,
      });
      const p = { radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24, ...GLASS_DEFAULTS, ...(this.params.get(el) || {}) };
      el.classList.toggle('lg-on', !!r.render(el, cv, p));
    }
  }

  _lens(want) {
    for (const el of [...this.lenses.keys()]) {
      if (!want.has(el)) { this.ro?.unobserve(el); el.style.removeProperty('backdrop-filter'); el.style.removeProperty('-webkit-backdrop-filter'); this.lenses.delete(el); }
    }
    this.ro ??= new ResizeObserver(entries => {
      let dirty = false;
      for (const e of entries) dirty = this._measure(e.target) || dirty;
      if (dirty) this._flush();
    });
    for (const el of want.keys()) {
      if (this.lenses.has(el)) continue;
      this.lenses.set(el, { id: `arr-liquid-${++uid}`, w: 0, h: 0, markup: '' });
      this.ro.observe(el);
    }
  }

  _measure(el) {
    const lens = this.lenses.get(el);
    if (!lens) return false;
    const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
    if (!w || !h || (w === lens.w && h === lens.h)) return false;
    lens.w = w; lens.h = h;
    const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24, w / 2, h / 2);
    const bezel = Math.max(6, Math.min(30, Math.min(w, h) / 3));
    const scale = Math.round(Math.min(56, bezel * 1.9));
    const map = `<feImage href="${lensMap(w, h, r, bezel)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>`;
    const shift = (k, res) => `<feDisplacementMap in="SourceGraphic" in2="map" scale="${(scale * k).toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="${res}"/>`;
    const only = (inp, row, res) => {
      const m = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0];
      m[row * 5 + row] = 1;
      return `<feColorMatrix in="${inp}" type="matrix" values="${m.join(' ')}" result="${res}"/>`;
    };
    // Red, green and blue bent by slightly different amounts, as through glass
    lens.markup = `<filter id="${lens.id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">`
      + `${map}${shift(1, 'dr')}${shift(0.92, 'dg')}${shift(0.84, 'db')}${only('dr', 0, 'r')}${only('dg', 1, 'g')}${only('db', 2, 'b')}`
      + '<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/></filter>';
    const f = `url(#${lens.id}) blur(6px) saturate(115%)`;
    el.style.setProperty('backdrop-filter', f);
    el.style.setProperty('-webkit-backdrop-filter', f);
    return true;
  }

  _flush() {
    if (!this.svg?.isConnected) {
      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.svg.setAttribute('aria-hidden', 'true');
      this.svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      this.root.appendChild(this.svg);
    }
    this.svg.innerHTML = [...this.lenses.values()].map(l => l.markup).join('');
  }

  teardown() {
    this.unregister?.();
    this.unregister = undefined;
    clearTimeout(this.settle);
    for (const [el, cv] of this.canvases) { cv.remove(); el.classList.remove('lg-on'); }
    this.canvases.clear();
    this.layer?.remove();
    this.layer = undefined;
    this.ro?.disconnect();
    this.ro = undefined;
    this.svg?.remove();
    this.svg = undefined;
    for (const el of this.lenses.keys()) { el.style.removeProperty('backdrop-filter'); el.style.removeProperty('-webkit-backdrop-filter'); }
    this.lenses.clear();
  }
}

class _LiquidMethods {
  // Puts the look's glass on the card's panels and on its search header, or
  // takes it off. Called after the card draws, after its theme changes and
  // when Home Assistant turns light or dark.
  _liquidSync() {
    const look = LOOKS[this._config?.styles?.preset];
    const dark = this._lookNight;
    const groups = look && (webglAvailable || lensSupported) && !this._config?.styles?.performanceMode ? look(dark) : null;
    this._lqLayers ??= new Map();
    const body = this.shadowRoot?.querySelector('.card-body');
    this._liquidOn(this.shadowRoot, body, groups);
    const bar = this._searchExt;
    const barRoot = bar?.shadowRoot;
    // The header is glass like the poster column: liquid in Liquid Glass, the
    // bars' material in Apple Home (its CSS, from the card's tokens)
    const right = groups?.find(g => g.sel.includes('col-right'));
    const barGroups = right ? [{ sel: BAR_SEL, p: right.p }] : null;
    if (barRoot) {
      // The card's own header is held at the top (sticky), a box for them too
      if (!bar.hasAttribute('own')) bar.style.position = 'relative';
      this._liquidOn(barRoot, barRoot.querySelector('.ash-layer') || this._liquidHost(barRoot), barGroups);
    }
    for (const [root, layer] of this._lqLayers) {
      if (root !== this.shadowRoot && root !== barRoot) { layer.teardown(); this._lqLayers.delete(root); }
    }
  }

  // A positioned box filling the header's shadow root, for its canvases
  _liquidHost(root) {
    const host = document.createElement('div');
    host.className = 'ash-layer';
    host.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    root.prepend(host);
    return host;
  }

  _liquidOn(root, parent, groups) {
    if (!root || !parent) return;
    let layer = this._lqLayers.get(root);
    if (!groups) { layer?.teardown(); this._lqLayers.delete(root); return; }
    if (!layer || layer.parent !== parent) {
      layer?.teardown();
      layer = new LiquidLayer(root, parent);
      this._lqLayers.set(root, layer);
    }
    layer.update(groups);
  }

  // The lens on a detail's buttons, in Apple Home. Called when the windows
  // change, since they are drawn and redrawn apart from the card.
  _liquidHeroSync() {
    const on = this._config?.styles?.preset === 'apple-home' && lensSupported && !this._config?.styles?.performanceMode;
    if (!on) { this._lqHero?.teardown(); return; }
    this._lqHero ??= new LiquidLayer(this.shadowRoot, null, { lensOnly: true });
    this._lqHero.update([{ sel: HERO_SEL, p: {} }]);
  }

  _liquidOff() {
    for (const layer of this._lqLayers?.values() || []) layer.teardown();
    this._lqLayers?.clear();
    this._lqHero?.teardown();
  }
}

export const liquidMixin = _LiquidMethods.prototype;
