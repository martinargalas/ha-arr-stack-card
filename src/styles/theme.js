class _ThemeMethods {

  _hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }

  // Parse hex or rgb/rgba string → "R, G, B" (strips alpha)
  _parseColorRgb(str) {
    if (!str) return null;
    const s = str.trim();
    if (s.startsWith('#')) {
      let hex = s.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      hex = hex.slice(0, 6);
      if (hex.length !== 6) return null;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
      return `${r}, ${g}, ${b}`;
    }
    const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return `${m[1]}, ${m[2]}, ${m[3]}`;
    return null;
  }

  // Inject theme CSS custom properties derived from config into shadow DOM
  _applyTheme() {
    if (!this.shadowRoot) return;
    const cfg = (this._config || {}).styles || {};
    const c = k => this._parseColorRgb(cfg[k]);
    const rules = [];

    // Custom properties (used by rgba(var(--xxx), alpha) in base CSS)
    const props = [];
    const propMap = [
      ['headingTextColor',           '--arr-ht-rgb'],
      ['headingColor',               '--arr-hd-rgb'],
      ['primaryTextColor',           '--arr-pt-rgb'],
      ['secondaryTextColor',         '--arr-st-rgb'],
      ['pagingButtonTextColor',      '--arr-pbt-rgb'],
      ['downloadButtonTextColor',    '--arr-dbt-rgb'],
      ['tagPillTextColor',           '--arr-tp-rgb'],
      ['pagingButtonBackgroundColor','--arr-pbb-rgb'],
      ['pagingDotColor',             '--arr-pd-rgb'],
      ['pagingDotActiveColor',       '--arr-pda-rgb'],
    ];
    for (const [key, prop] of propMap) {
      const rgb = c(key);
      if (rgb) props.push(`${prop}: ${rgb};`);
    }
    if (props.length) rules.push(`:host { ${props.join(' ')} }`);

    // Modal overrides — high specificity, override day/night
    const mo = c('modalHeadingTextColor');
    if (mo) {
      rules.push(`.popup-overlay .popup-title { color: rgba(${mo}, 1) !important; }`);
      rules.push(`.popup-overlay .is-f-btn.active { color: rgba(${mo}, 1) !important; }`);
      rules.push(`.popup-overlay .sn-season-title { color: rgba(${mo}, 1) !important; }`);
      rules.push(`.popup-overlay .btn-person:not(.active) { color: rgba(${mo}, 0.80) !important; border-color: rgba(${mo}, 0.25) !important; }`);
    }

    const mp = c('modalPrimaryTextColor');
    if (mp) {
      rules.push(`.popup-overlay .popup-sub { color: rgba(${mp}, 0.55) !important; }`);
      rules.push(`.popup-overlay .popup-overview { color: rgba(${mp}, 0.75) !important; }`);
      rules.push(`.popup-overlay .is-rel-title { color: rgba(${mp}, 0.90) !important; }`);
      rules.push(`.popup-overlay .is-indexer { color: rgba(${mp}, 0.90) !important; }`);
      rules.push(`.popup-overlay .is-size { color: rgba(${mp}, 0.90) !important; }`);
      rules.push(`.popup-overlay .is-lang-chip { color: rgba(${mp}, 0.90) !important; }`);
      rules.push(`.popup-overlay .sn-ep-num { color: rgba(${mp}, 0.90) !important; }`);
      rules.push(`.popup-overlay .sn-ep-title { color: rgba(${mp}, 0.90) !important; }`);
    }

    const msc = c('modalSecondaryTextColor');
    if (msc) {
      rules.push(`.popup-overlay .is-panel-title { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-count { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-f-btn:not(.active) { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-table thead th { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-s-zero { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-loading { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-q-sd { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-rel-age { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .is-peers-na { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .sn-seasons-label { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .sn-season-stat { color: rgba(${msc}, 0.70) !important; }`);
      rules.push(`.popup-overlay .sn-ep-date { color: rgba(${msc}, 0.70) !important; }`);
    }

    const mci = c('modalCloseButtonIconColor');
    if (mci) rules.push(`.popup-close { color: rgba(${mci}, 1) !important; }`);

    const mcb = c('modalCloseButtonBackgroundColor');
    if (mcb) rules.push(`.popup-close { background: rgba(${mcb}, 1) !important; box-shadow: none !important; }`);

    const mb = c('modalBackgroundColor');
    if (mb) {
      const [mr, mg, mb2] = mb.split(',').map(Number);
      const lr = Math.round(mr + (255 - mr) * 0.6);
      const lg = Math.round(mg + (255 - mg) * 0.6);
      const lb = Math.round(mb2 + (255 - mb2) * 0.6);
      const mbLight = `${lr}, ${lg}, ${lb}`;
      rules.push(`.popup-overlay .popup-glass { background: rgba(${mb}, 0.30) !important; }`);
      rules.push(`.popup-overlay { --is-fade-btm: rgba(${mb}, 0.30) !important; --is-hdr-bg: rgba(${mb}, 0.12) !important; --is-shine: linear-gradient(120deg,rgba(${mbLight},0.55),rgba(${mbLight},0.15) 25%,rgba(${mbLight},0.05) 50%,transparent 70%) !important; }`);
    }

    const mov = c('modalOverlayColor');
    if (mov) rules.push(`.popup-overlay { background: rgba(${mov}, 0.65) !important; }`);

    const mbt = c('modalButtonTextColor');
    if (mbt) rules.push(`.popup-overlay .is-open-btn { color: rgba(${mbt}, 1) !important; }`);

    const mbb = c('modalButtonBackgroundColor');
    if (mbb) rules.push(`.popup-overlay .is-open-btn:not(.remove-lib-btn):not(.remove-disc-btn) { background: rgba(${mbb}, 0.20) !important; border-color: rgba(${mbb}, 0.40) !important; }`);

    const mrb = c('modalRemoveButtonBackgroundColor');
    if (mrb) rules.push(`.popup-overlay .is-open-btn[data-action="remove-confirm"] { background: rgba(${mrb}, 0.20) !important; border-color: rgba(${mrb}, 0.40) !important; }`);

    const uiScale = parseFloat(cfg['uiScale']);
    if (uiScale && uiScale !== 1 && !isNaN(uiScale)) {
      rules.push(`@media (min-width: 601px) { .card-body { zoom: ${uiScale}; } }`);
    }

    const leftPct = parseFloat(cfg['leftPanelWidth']);
    if (!isNaN(leftPct) && leftPct > 0 && leftPct !== 40) {
      const l = Math.round(leftPct);
      const r = 100 - l;
      rules.push(`@media (min-width: 601px) { .card-body { grid-template-columns: ${l}fr ${r}fr !important; } }`);
      rules.push(`@media (min-width: 601px) { .card-body.swap-sides { grid-template-columns: ${r}fr ${l}fr !important; } }`);
    }

    let el = this.shadowRoot.getElementById('arr-theme');
    if (!el) {
      el = document.createElement('style');
      el.id = 'arr-theme';
      this.shadowRoot.appendChild(el);
    }
    el.textContent = rules.join('\n');
  }
}

export const themeMixin = _ThemeMethods.prototype;
