import { styleDeclarations } from './tokens.js';

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

    // The keys from before the design tokens (#42), each set as the token that
    // took over its job. Paging buttons live on the right and the download
    // buttons on the left, so their two text colours became the button text of
    // one column each.
    const props = [];
    const propMap = [
      ['headingTextColor',           '--arr-heading-rgb'],
      ['headingColor',               '--arr-heading-line-rgb'],
      ['primaryTextColor',           '--arr-text-rgb'],
      // Before the tokens it coloured mostly the titles on posters
      ['primaryTextColor',           '--arr-poster-text-rgb'],
      ['secondaryTextColor',         '--arr-text-secondary-rgb'],
      ['pagingButtonTextColor',      '--arr-right-button-text-rgb'],
      ['downloadButtonTextColor',    '--arr-left-button-text-rgb'],
      ['tagPillTextColor',           '--arr-pill-text-rgb'],
      ['pagingButtonBackgroundColor','--arr-button-rgb'],
      ['pagingDotColor',             '--arr-dot-rgb'],
      ['pagingDotActiveColor',       '--arr-dot-active-rgb'],
    ];
    for (const [key, prop] of propMap) {
      const rgb = c(key);
      if (rgb) props.push(`${prop}: ${rgb};`);
    }
    // The modal keys from before the tokens. They applied by day and by night
    // alike, so each sets both palettes.
    const modalMap = [
      ['modalHeadingTextColor',   'text-rgb'],
      ['modalPrimaryTextColor',   'text-secondary-rgb'],
      ['modalSecondaryTextColor', 'text-muted-rgb'],
    ];
    const legacyModal = [];
    for (const [key, token] of modalMap) {
      const rgb = c(key);
      if (rgb) legacyModal.push(`--arr-modal-${token}: ${rgb};`, `--arr-modal-day-${token}: ${rgb};`);
    }
    const mb = c('modalBackgroundColor');
    if (mb) legacyModal.push(`--arr-modal-background: rgba(${mb}, 0.30);`, `--arr-modal-day-background: rgba(${mb}, 0.30);`);
    const mov = c('modalOverlayColor');
    if (mov) legacyModal.push(`--arr-modal-overlay: rgba(${mov}, 0.65);`, `--arr-modal-day-overlay: rgba(${mov}, 0.65);`);
    props.push(...legacyModal);

    // The design tokens by name, and the preset they start from. Written after
    // the old keys, so where both set one token the new key wins.
    this._lookNightWas = this._lookNight;
    const { decls, bad } = styleDeclarations(cfg, { dark: this._lookNightWas });
    props.push(...decls);
    const badKey = bad.join(', ');
    if (badKey && badKey !== this._styleWarned) {
      this._styleWarned = badKey;
      console.warn(`[arr-card] styles: could not read ${badKey} — colours take a hex value, rgb() or "r, g, b"`);
    }
    if (props.length) rules.push(`:host { ${props.join(' ')} }`);

    const mci = c('modalCloseButtonIconColor');
    if (mci) rules.push(`.popup-close { color: rgba(${mci}, 1) !important; }`);

    const mcb = c('modalCloseButtonBackgroundColor');
    if (mcb) rules.push(`.popup-close { background: rgba(${mcb}, 1) !important; box-shadow: none !important; }`);

    const mbt = c('modalButtonTextColor');
    if (mbt) rules.push(`.popup-overlay .is-open-btn { color: rgba(${mbt}, 1) !important; }`);

    const mbb = c('modalButtonBackgroundColor');
    if (mbb) rules.push(`.popup-overlay .is-open-btn:not(.remove-lib-btn):not(.remove-disc-btn) { background: rgba(${mbb}, 0.20) !important; border-color: rgba(${mbb}, 0.40) !important; }`);

    const mrb = c('modalRemoveButtonBackgroundColor');
    if (mrb) rules.push(`.popup-overlay .is-open-btn[data-action="remove-confirm"] { background: rgba(${mrb}, 0.20) !important; border-color: rgba(${mrb}, 0.40) !important; }`);

    // Apple Home, measured off glass-cards' Energy pop-up
    if (cfg.preset === 'apple-home') {
      const dark = this._lookNight;
      // Section headings and their line, as its dividers draw them: a 2 px
      // line, white in the sidebar, the text's colour on the posters' panel
      rules.push('.col-right .col-hdr-title { text-shadow: 0 1px 2px rgba(var(--_shadow, 0, 0, 0), 0.16), 0 0 12px rgba(var(--_shadow, 0, 0, 0), 0.08); }');
      rules.push('.col .col-hdr-line { height: 2px; box-shadow: 0 1px 3px rgba(var(--_shadow, 0, 0, 0), 0.06); }');
      rules.push('.col-left .col-hdr-line { background: rgba(var(--_fg, 255, 255, 255), 0.28); }');
      // The tiles' rim and sheen are drawn on their own, past the box opacity
      rules.push('.col-left .disk-chip::after { box-shadow: none; }');
      rules.push('.col-left :is(.disk-chip, .vpn-bar, .dc-section-card)::before { display: none; }');
      // The VPN line, the total speed and the storage: the sidebar's chips in
      // glass-cards — a faint white fill and hairline, no shine — day and night
      rules.push('.col-left :is(.vpn-bar, .disk-chip) { background: rgba(255, 255, 255, 0.12); border: 0.5px solid rgba(255, 255, 255, 0.1); }');
      rules.push('.col-right .col-hdr-line { background: rgba(var(--_fg, 255, 255, 255), 0.55); }');
      // The page arrows, the headers' buttons and the dropdowns: its controls —
      // dark glass by day, a lighter graphite at night, faint when there is
      // nowhere to go. A section's side chevrons stay bare. The gradient starts
      // at the outer edge: from the padding box it repeated in the transparent
      // border and drew a thin ring inside the button.
      const bg = `linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0) 60%), ${dark ? 'rgba(74, 79, 92, 0.7)' : 'rgba(22, 30, 46, 0.62)'}`;
      const sh = dark
        ? 'inset 0 0.5px 0 rgba(255, 255, 255, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.06), 0 2px 10px rgba(var(--_shadow, 0, 0, 0), 0.3)'
        : 'inset 0 0.5px 0 rgba(255, 255, 255, 0.45), inset 0 -0.5px 0 rgba(255, 255, 255, 0.12), 0 2px 8px rgba(var(--_shadow, 0, 0, 0), 0.12)';
      const fg = dark ? '255, 255, 255, 0.86' : '255, 255, 255, 1';
      const ctl = '.col-right :is(.rp-btn, .cal-hdr-btn, .smp-hdr-btn, .hdr-filter-btn, .mt-tb-sel, .sv-chev, .dc-chev)';
      rules.push(`${ctl} { background: ${bg} !important; background-origin: border-box !important; box-shadow: ${sh} !important; border-color: transparent !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; color: rgba(${fg}) !important; }`);
      rules.push(`${ctl} :is(svg, ha-icon, .mt-tb-lbl, .mt-tb-chev) { color: rgba(${fg}) !important; }`);
      rules.push('.col-right .rp-btn:disabled { opacity: 0.3 !important; }');
      // The windows' buttons and chosen items wear the same glass through
      // their tokens; from the border box, or it rings inside their edge
      rules.push('.popup-overlay :is(button, .mt-seg-ind, .is-f-btn, select) { background-origin: border-box; }');
      // A button drawn in the accent by its own markup (Maintainerr's New
      // Rule…) is a control like the rest: the glass, a white glyph
      rules.push(`.popup-overlay button[style*="--arr-accent-rgb"] { background: ${bg} !important; background-origin: border-box; box-shadow: ${sh}; border-color: transparent !important; color: rgba(${fg}) !important; }`);
      // By day the windows' figures take the status colours' deeper daylight
      // shades, as the tiles do; the statistics' amber is written out in them
      if (!dark) {
        rules.push('.popup-overlay.popup-day { --arr-success-rgb: 36, 138, 61; --arr-warning-rgb: 201, 107, 0; --arr-error-rgb: 215, 0, 21; }');
        rules.push('.popup-overlay.popup-day [style*="250,180,50"] { color: rgb(201, 107, 0) !important; }');
      }
      // The windows' small round buttons look like Activity → Missing's search
      // ones: a disc of the control glass with a white glyph — searching a
      // season or an episode, grabbing a release or an album, the windows'
      // round actions in any tone (run, delete, import…), and the AS and IS
      // entries of a detail's Search menu. One that is on turns white. A
      // release's grabbed or failed state keeps its colour.
      {
        const mini = '.popup-overlay :is([data-mt-round], .btn-person, .is-grab-btn:not(.is-grab-done):not(.is-grab-failed):not(.force), .pp-grab)';
        rules.push(`${mini} { background: ${bg} !important; background-origin: border-box; box-shadow: ${sh}; border-color: transparent !important; color: rgba(${fg}) !important; backdrop-filter: none; -webkit-backdrop-filter: none; }`);
        rules.push('.popup-overlay .btn-person { border-radius: 999px; }');
        rules.push('.popup-overlay .btn-person.active { background: rgba(255, 255, 255, 0.92) !important; color: rgb(28, 28, 30) !important; }');
        rules.push(`.popup-overlay :is([data-action="search-pick-as"], [data-action="search-pick-is"]) .qa-ico { flex: 0 0 22px; width: 22px; height: 22px; border-radius: 50%; background: ${bg}; background-origin: border-box; box-shadow: ${sh}; color: rgba(${fg}); }`);
        rules.push('.popup-overlay :is([data-action="search-pick-as"], [data-action="search-pick-is"]) .qa-ico svg { width: 12px; height: 12px; }');
      }
      // The chosen item's slider: the glass alone, without the accent's rim
      rules.push('.popup-overlay :is(.mt-seg-ind, .mt-nav-ind) { border-color: transparent !important; }');
      // Over a detail's picture, as glass-cards' pop-up header: no capsule
      // around the buttons. Each is a pill of liquid glass — the lens bends the
      // picture behind it where the browser can (render/liquid.js), a frosted
      // pane elsewhere — with a white label; the one whose panel is open takes
      // the control glass. The close button is an action: always the glass.
      const btns = '.popup-overlay .pp-hero-pill :is(.is-open-btn, .remove-lib-btn, .is-collapse-btn)';
      const quiet = `background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.08)) !important; color: rgba(${fg}) !important;`;
      rules.push('.popup-overlay .pp-hero-pill { background: none !important; border-color: transparent !important; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; padding: 0; }');
      rules.push(`${btns} { ${quiet} box-shadow: inset 0 0.5px 0 rgba(255, 255, 255, 0.45), inset 0 -0.5px 0 rgba(255, 255, 255, 0.12), 0 2px 8px rgba(var(--_shadow, 0, 0, 0), 0.12); border-color: transparent !important; backdrop-filter: blur(6px) saturate(115%) brightness(1.06); -webkit-backdrop-filter: blur(6px) saturate(115%) brightness(1.06); }`);
      rules.push(`${btns} :is(svg, ha-icon, span) { color: inherit !important; }`);
      rules.push(`:is(${btns}.active, .popup-overlay .popup-close) { background: ${bg} !important; background-origin: border-box; box-shadow: ${sh}; border-color: transparent !important; color: rgba(${fg}) !important; }`);
      // The open one is plain control glass: under it the lens bent the
      // picture round its edge and, with the glass's own sheen, read as 3D
      rules.push(`${btns}.active { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }`);
      rules.push(`.popup-overlay .popup-close :is(svg, ha-icon) { color: rgba(${fg}) !important; }`);
      rules.push('.popup-overlay :is(.popup-close, .pp-hero-pill button):hover { filter: brightness(1.15); }');
      // The headers' type switch (All, films, shows, music) as glass-cards'
      // heat pump draws its choices, without the track on the light panel:
      // the current one in the control glass and white, the others quiet
      {
        const seg = '.col-right .search-type-seg .mt-seg';
        rules.push(`${seg} { background: none; border-color: transparent; }`);
        rules.push(`${seg} .mt-seg-ind { background: ${bg}; background-origin: border-box; box-shadow: ${sh}; border-color: transparent; }`);
        rules.push(`${seg} .mt-seg-half { color: ${dark ? 'rgba(235, 235, 245, 0.86)' : 'rgba(60, 60, 67, 0.85)'}; }`);
        rules.push([0, 1, 2, 3].map(i => `${seg}[data-seg="${i}"] .mt-seg-half:nth-child(${i + 2})`).join(', ') + ` { color: rgba(${fg}); }`);
      }
      // The download clients' controls, as glass-cards' heat pump draws its
      // own: the sort choices in a recessed track with the current one lifted
      // out of it in the control glass, and a lone button — pause all, pause or
      // remove a download — in that glass outright, white like its glyphs
      rules.push(`.col-left .sort-btns { gap: 2px; padding: 3px; border-radius: 999px; background: ${dark ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.08)'}; }`);
      rules.push('.col-left .sb { background: none; border-color: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; color: rgba(235, 235, 245, 0.6); }');
      rules.push(`.col-left .sb.on { background: ${bg}; background-origin: border-box; box-shadow: ${sh}; border-color: transparent; color: rgb(255, 255, 255); }`);
      rules.push('.col-left .sort-btns .sb:not(.on) :is(svg, ha-icon) { color: rgba(235, 235, 245, 0.6); }');
      rules.push('.col-left .sort-btns .sb.on :is(svg, ha-icon) { color: rgb(255, 255, 255); }');
      rules.push(`.col-left .action-btn { background: ${bg}; background-origin: border-box; box-shadow: ${sh}; border-color: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; }`);
      // A download's own buttons (pause, remove) are bare glyphs on the glass
      rules.push('.col-left .tb { background: none; border-color: transparent; box-shadow: none; backdrop-filter: none; -webkit-backdrop-filter: none; }');
      rules.push(`.col-left :is(.action-btn, .tb), .col-left :is(.action-btn, .tb) :is(svg, ha-icon) { color: rgba(${fg}) !important; }`);
      // The apps' tiles (Prowlarr, Tautulli, Activity…) by day: Apple Home's
      // light tiles with dark text. Their lines are written for light text on
      // dark glass — muted ones at a third of the colour, figures in pastels —
      // so inside a tile the muted text is raised and the status colours take
      // their deeper daylight shades.
      if (!dark) {
        const tile = '.col-right .tl-card';
        rules.push(`${tile} { --_fg: 28, 28, 30; --_fg2: 60, 60, 67; --_fg3: 60, 60, 67; --_hd: 28, 28, 30; --_fill: 60, 60, 67; --_line: 60, 60, 67; --_btn-fg: 28, 28, 30; --_pill-fg: 28, 28, 30;`
          + ' --arr-success-rgb: 36, 138, 61; --arr-warning-rgb: 201, 107, 0; --arr-error-rgb: 215, 0, 21;'
          + ' --is-text: #1C1C1E; --is-text-sec: rgba(60, 60, 67, 0.85); --is-text-muted: rgba(60, 60, 67, 0.7);'
          + ' background: rgba(246, 246, 248, 0.8); box-shadow: 0 1px 2px rgba(var(--_shadow, 0, 0, 0), 0.06), 0 4px 14px rgba(var(--_shadow, 0, 0, 0), 0.06); }');
        rules.push(`${tile}.tl-card-warn { background: linear-gradient(rgba(215, 0, 21, 0.10), rgba(215, 0, 21, 0.10)), rgba(246, 246, 248, 0.8); }`);
        rules.push(`${tile} :is([style*="color:rgba(var(--_fg3"], .u-xxs-dim, .tl-label, .tl-big-sub, .tl-sub-row, .tl-bar-day, .tl-chart-sum) { color: rgba(60, 60, 67, 0.72) !important; }`);
        rules.push(`${tile} :is([style*="color:rgba(var(--_fg2"], .tl-stat-name, .tl-sub-val, .tl-user-name) { color: rgba(60, 60, 67, 0.92) !important; }`);
        rules.push(`${tile} :is(.tl-stat-val, .tl-user-plays) { color: rgb(201, 107, 0); }`);
        rules.push(`${tile} :is(.u-media-badge, .u-media-badge-s) { background: rgba(28, 28, 30, 0.72); color: rgba(255, 255, 255, 0.95); }`);
        rules.push(`${tile} [style*="255,150,150"] { color: rgb(215, 0, 21) !important; }`);
      }
    }

    // No app icons: the section titles stand alone, on both sides
    if (cfg.applicationIcons === 'none') rules.push('.col-hdr :is(.app-ico, .app-icon-row) { display: none; }');

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
    // A search header wears this card's look
    this._extSearchSync?.('theme');
    this._liquidMaybe?.();
  }
}

export const themeMixin = _ThemeMethods.prototype;
