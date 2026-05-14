// CSS pro arr-stack-card
export const STYLES = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* ── macOS color tokens + user-overridable design tokens ── */
      :host {
        --mac-red:    #ff453a;
        --mac-yellow: #ffd60a;
        --mac-blue:   #0a84ff;
        --mac-green:  #30d158;
        --mac-gray:   #8E8E93;
        --mac-orange: #FF9500;

        /* Design tokens — overridable via styles: in YAML config */
        --card-bg:        rgba(255,255,255,0.05);
        --text-primary:   rgba(255,255,255,1);
        --text-secondary: rgba(255,255,255,0.55);
        --text-muted:     rgba(255,255,255,0.28);
        --accent:         #0a84ff;
        --accent-rgb:     10,132,255;

        color: #ffffff;
        font-family: -apple-system, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
        display: block;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* ════════════════════════════════════
         OUTER CARD
      ════════════════════════════════════ */
      .card { width: 100%; background: transparent; margin: 0; }

      /* ── Column header ── */
      .col-hdr {
        display: flex; align-items: center; gap: 14px;
        margin-bottom: 10px;
        padding: 0 4px;
      }

      .col-hdr-title {
        font-size: 14px; font-weight: 700;
        color: rgba(var(--arr-ht-rgb, 255, 255, 255), 1);
        white-space: nowrap;
      }

      .col-hdr-line {
        flex: 1; height: 6px;
        border-radius: 999px;
        background: rgba(var(--arr-hd-rgb, 255, 255, 255), 0.55);
        margin-left: 10px;
      }

      .col-hdr > ha-icon {
        color: rgba(var(--arr-ht-rgb, 255, 255, 255), 1);
        flex-shrink: 0;
      }

      .dot-online {
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--mac-green); box-shadow: 0 0 6px rgba(48,209,88,0.8);
        flex-shrink: 0;
      }

      /* ════════════════════════════════════
         BODY GRID
      ════════════════════════════════════ */
      .card-body {
        display: grid;
        grid-template-columns: 2fr 3fr;
        gap: 12px;
        padding: 0 12px 12px;
      }

      /* ── Glass outer panel ── */
      .col {
        position: relative;
        padding: 10px 15px;
        min-width: 0; overflow: clip;
        border-radius: 34px;
        display: flex; flex-direction: column;
        background: var(--card-bg);
        backdrop-filter: blur(35px) saturate(100%);
        -webkit-backdrop-filter: blur(35px) saturate(100%);
        border: 1px solid rgba(255,255,255,0.25);
        box-shadow:
          0 15px 25px rgba(0,0,0,0.08),
          inset 0 2px 3px rgba(0,0,0,0.03);
      }

      .col::before {
        content: "";
        position: absolute; inset: 0; border-radius: 34px;
        background: linear-gradient(
          120deg,
          rgba(255,255,255,0.55),
          rgba(255,255,255,0.15) 25%,
          rgba(255,255,255,0.05) 50%,
          transparent 70%
        );
        opacity: 0.35; pointer-events: none; z-index: 0;
      }

      .col > * { position: relative; z-index: 1; }

      /* ════════════════════════════════════
         SECTION LABEL
      ════════════════════════════════════ */
      .divider    { height: 1px; background: rgba(255,255,255,0.18); margin: 9px 0; }
      .spacer     { height: 16px; }
      .spacer-sm  { height: 8px; }

      .sec { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }

      .sec-icon {
        width: 23px; height: 23px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; transform: translateY(0px);
      }

      .sec-title {
        font-size: 12px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.09em;
        color: rgba(var(--arr-ht-rgb, 255, 255, 255), 1);
        text-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }

      .sec-badge {
        font-size: 9px; font-weight: 700;
        padding: 1px 6px; border-radius: 7px;
        margin-left: auto;
        color: rgba(var(--arr-tp-rgb, 255, 255, 255), 1);
        text-shadow: 0 1px 3px rgba(0,0,0,0.4);
      }
      .sec-page-ind {
        font-size: 10px; font-weight: 500;
        color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.38);
        white-space: nowrap; letter-spacing: 0.3px;
        margin-left: auto;
      }
      .sec-page-ind + .sec-badge { margin-left: 8px; }
      .sec-page-sep { margin: 0 2px; opacity: 0.55; }

      /* ════════════════════════════════════
         DISK CHIPS
      ════════════════════════════════════ */
      .disk-row { display: flex; gap: 6px; }

      .disk-chip {
        flex: 1; border-radius: 12px; padding: 7px 10px;
        position: relative; overflow: hidden;
        background: rgba(255,255,255,0.08);
      }

      .disk-chip::before {
        content: ""; position: absolute; inset: 0; border-radius: 12px;
        background: linear-gradient(
          120deg,
          rgba(255,255,255,0.45),
          rgba(255,255,255,0.10) 30%,
          rgba(255,255,255,0.02) 60%
        );
        opacity: 0.35; pointer-events: none;
      }

      .disk-chip::after {
        content: ""; position: absolute; inset: 0; border-radius: 12px;
        box-shadow:
          inset 0 0 0 0.5px rgba(255,255,255,0.18),
          inset 0 0 20px rgba(255,255,255,0.08);
        pointer-events: none;
      }

      .disk-chip > * { position: relative; z-index: 1; }

      .dc-label {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.06em; color: rgba(var(--arr-pt-rgb, 255, 255, 255), 1); margin-bottom: 2px;
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
      }

      .dc-val {
        font-size: 16px; font-weight: 800; line-height: 1; margin-bottom: 3px;
        text-shadow: 0 1px 6px rgba(0,0,0,0.5);
      }
      .dc-val span { text-shadow: 0 1px 4px rgba(0,0,0,0.5); }

      .dc-sub {
        font-size: 11px; color: rgba(var(--arr-pt-rgb, 255, 255, 255), 1);
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
        line-height: 1.5;
      }

      .mbar { height: 2px; background: rgba(255,255,255,0.18); border-radius: 1px; overflow: hidden; margin-top: 3px; }
      .mbar-fill { height: 100%; border-radius: 1px; }

      /* ════════════════════════════════════
         CLIENT HEADER
      ════════════════════════════════════ */
      .client-hd {
        display: flex; align-items: center; gap: 14px;
        margin-bottom: 8px;
      }

      .client-hd ha-icon {
        color: rgba(var(--arr-ht-rgb, 255, 255, 255), 1); flex-shrink: 0;
      }

      .client-hd .col-hdr-line {
        background: rgba(33,33,33,0.10);
      }

      .cl-name {
        font-size: 15px; font-weight: 700;
        color: rgba(var(--arr-ht-rgb, 255, 255, 255), 1);
        white-space: nowrap;
      }

      .cl-speed { font-size: 12px; font-weight: 800; }

      .sort-btns { margin-left: auto; display: flex; gap: 3px; }

      .sb {
        font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
        border: 1px solid rgba(255,255,255,0.30); background: rgba(255,255,255,0.12);
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.85); cursor: pointer;
        backdrop-filter: blur(8px);
      }

      .sb.on {
        background: rgba(var(--accent-rgb),0.30); border-color: rgba(var(--accent-rgb),0.55);
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1);
      }

      .sb:active { transform: scale(0.88); }

      /* Direction arrow shown inside active sort button */
      .sb-dir { font-size: 9px; margin-left: 1px; }

      /* ── Global pause/resume button (header) ── */
      .action-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 26px; height: 26px; flex-shrink: 0;
        border-radius: 7px; border: 1px solid rgba(255,255,255,0.22);
        background: rgba(255,255,255,0.10);
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.80); cursor: pointer;
        backdrop-filter: blur(8px);
        transition: background 0.15s, color 0.15s;
      }
      .action-btn:hover {
        background: rgba(255,255,255,0.20); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1);
      }
      .action-btn.paused {
        background: rgba(48,209,88,0.28); border-color: rgba(48,209,88,0.55);
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1);
      }
      .action-btn:active { transform: scale(0.88); }

      /* CSS spinner — nezávisí na ha-icon */
      @keyframes btn-spin {
        to { transform: rotate(360deg); }
      }
      .action-spinner {
        display: block;
        width: 13px; height: 13px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.25);
        border-top-color: #fff;
        animation: btn-spin 0.65s linear infinite;
      }

      /* ── Per-torrent tiny action buttons ── */
      .tb-group {
        display: flex; gap: 3px; flex-shrink: 0; margin-left: 6px;
      }

      .tb {
        display: inline-flex; align-items: center; justify-content: center;
        width: 22px; height: 22px; flex-shrink: 0;
        border-radius: 5px; border: 1px solid rgba(255,255,255,0.28);
        background: rgba(255,255,255,0.10);
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.90); cursor: pointer;
        padding: 0;
        transition: background 0.12s, color 0.12s;
      }
      .tb:hover  { background: rgba(255,255,255,0.22); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }
      .tb:active { transform: scale(0.88); }

      /* Resume — green tint */
      .tb-resume { border-color: rgba(48,209,88,0.40); background: rgba(48,209,88,0.18); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }
      .tb-resume:hover { background: rgba(48,209,88,0.32); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }

      /* Pause — stejná neutrální barva jako globální action-btn */
      .tb-pause  { border-color: rgba(255,255,255,0.28); background: rgba(255,255,255,0.10); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }
      .tb-pause:hover  { background: rgba(255,255,255,0.22); }

      /* Remove (initial) — neutral */
      .tb-remove { }
      .tb-remove:hover { background: rgba(255,69,58,0.20); border-color: rgba(255,69,58,0.55); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }

      .tb-retry { border-color: rgba(255,159,10,0.40); background: rgba(255,159,10,0.14); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); flex-shrink: 0; }
      .tb-retry:hover { background: rgba(255,159,10,0.30); border-color: rgba(255,159,10,0.65); }

      .tb-hist-del { flex-shrink: 0; }
      .tb-hist-del:hover { background: rgba(255,69,58,0.20); border-color: rgba(255,69,58,0.55); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }

      .sab-failed-sep {
        margin: 6px 0 4px; height: 1px;
        background: rgba(255,69,58,0.25);
      }
      .dl-failed { opacity: 0.90; }

      /* Confirm row: cancel / keep / delete */
      .tb-cancel { border-color: rgba(255,255,255,0.30); }
      .tb-keep   { border-color: rgba(255,149,0,0.40);  background: rgba(255,149,0,0.18);  color: rgba(255,149,0,0.90); }
      .tb-keep:hover { background: rgba(255,149,0,0.32); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }
      .tb-del    { border-color: rgba(255,69,58,0.55);  background: rgba(255,69,58,0.28);  color: rgba(255,90,80,0.90); }
      .tb-del:hover  { background: rgba(255,69,58,0.45); color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 1); }

      /* ════════════════════════════════════
         SECTION GLASS CARD
      ════════════════════════════════════ */
      .sec-card { margin-bottom: 4px; }

      /* ════════════════════════════════════
         DOWNLOAD ITEMS
      ════════════════════════════════════ */
      .dl {
        padding: 5px 2px; margin-bottom: 0;
        background: none;
      }

      .dl-r1 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }

      .dl-name {
        font-size: 12px; font-weight: 600;
        color: rgba(var(--arr-pt-rgb, 255, 255, 255), 1);
        text-shadow: 0 1px 5px rgba(0,0,0,0.55);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 360px;
      }

      .dl-pct { font-size: 13px; font-weight: 800; color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.5); flex-shrink: 0; margin-left: 8px;
        text-shadow: 0 1px 4px rgba(0,0,0,0.4); }

      .dl-r2 { display: flex; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }

      .dm { font-size: 11px; color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.55); display: flex; align-items: center; gap: 2px; }
      .dm b { font-weight: 700; }
      .dm-val { color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.5); font-weight: 700; }

      /* ══════════════════════════════════════
         PILL CHIP SYSTEM  (speed + status)
         Solid macOS colours, no gradient — clean and vivid
      ══════════════════════════════════════ */
      .g, .pill-green, .pill-orange, .pill-red, .pill-blue, .pill-yellow, .pill-teal {
        display: inline-flex; align-items: center; gap: 3px;
        border-radius: 999px; border: 1px solid transparent;
        font-weight: 700; color: rgba(var(--arr-tp-rgb, 255, 255, 255), 1); white-space: nowrap;
      }
      /* macOS green — #30D158 */
      .g, .pill-green  { background: rgba(48,209,88,0.38);  border-color: rgba(48,209,88,0.70); }
      /* macOS teal — #5AC8FA (seeding active) */
      .pill-teal        { background: rgba(90,200,250,0.28);  border-color: rgba(90,200,250,0.65); }
      /* macOS orange — #FF9500 */
      .pill-orange      { background: rgba(255,149,0,0.38);  border-color: rgba(255,149,0,0.70); }
      /* macOS red — #FF453A */
      .pill-red         { background: rgba(255,69,58,0.38);  border-color: rgba(255,69,58,0.70); }
      /* macOS blue — #0A84FF */
      .pill-blue        { background: rgba(10,132,255,0.38); border-color: rgba(10,132,255,0.70); }
      /* macOS yellow — #FFD60A */
      .pill-yellow      { background: rgba(255,214,10,0.32); border-color: rgba(255,214,10,0.65); }
      /* Speed value pill (inline in torrent rows) */
      .g { padding: 0 7px; }
      /* Value pill in disk chips */
      .pill-orange.dc-pill { padding: 1px 9px; font-size: 15px; font-weight: 800; }
      /* Status pill in torrent rows */
      .status-pill { padding: 1px 8px; font-size: 10px; }

      .pbar { height: 2px; background: rgba(255,255,255,0.18); border-radius: 1px; overflow: hidden; }
      .pbar-fill { height: 100%; border-radius: 1px; }
      .pf-blue   { background: linear-gradient(90deg, rgba(var(--accent-rgb),0.7), rgba(var(--accent-rgb),1)); }
      .pf-orange { background: linear-gradient(90deg, rgba(255,149,0,0.7), #ffbb50); }
      .pf-red    { background: linear-gradient(90deg, rgba(255,69,58,0.7), #ff6b61); }
      .pf-green  { background: linear-gradient(90deg, rgba(48,209,88,0.7), #a8ffcb); }

      .dl-pct-err { color: var(--mac-red) !important; }
      .dm-err { display: flex; align-items: center; gap: 3px; }

      /* ════════════════════════════════════
         MEDIA GRID  4 columns + pagination
      ════════════════════════════════════ */
      .mgrid { display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; flex: 1; min-width: 0; }

      /* Pagination wrapper */
      .pg-wrap {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      /* Chevron buttons */
      .pg-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 0.55);
        font-size: 22px;
        line-height: 1;
        padding: 2px 5px;
        border-radius: 8px;
        transition: color 0.15s, background 0.15s;
        flex-shrink: 0;
        user-select: none;
      }
      .pg-btn:hover:not(:disabled) {
        color: rgba(255,255,255,0.9);
        background: rgba(255,255,255,0.08);
      }
      .pg-btn:disabled {
        opacity: 0.18;
        cursor: default;
      }
      .pg-btn-ph { visibility: hidden; pointer-events: none; }

      /* Slide animations */
      @keyframes pg-slide-next {
        from { opacity: 0; transform: translateX(16px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes pg-slide-prev {
        from { opacity: 0; transform: translateX(-16px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      .mgrid.anim-next  { animation: pg-slide-next 0.22s cubic-bezier(.25,.46,.45,.94) both; }
      .mgrid.anim-prev  { animation: pg-slide-prev 0.22s cubic-bezier(.25,.46,.45,.94) both; }
      .dl-list { flex: 1; min-width: 0; }
      .dl-list.anim-next { animation: pg-slide-next 0.22s cubic-bezier(.25,.46,.45,.94) both; }
      .dl-list.anim-prev { animation: pg-slide-prev 0.22s cubic-bezier(.25,.46,.45,.94) both; }

      /* ════════════════════════════════════
         MEDIA CARD
      ════════════════════════════════════ */
      .mc {
        background: rgba(255,255,255,0.10);
        border-radius: 11px; overflow: hidden; min-width: 0;
        container-type: inline-size;
        container-name: mc;
      }

      .mc-cover {
        width: 100%; height: 80px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }

      .mc-cover-lg {
        width: 100%; height: 92px;
        display: flex; align-items: center; justify-content: center;
        font-size: 26px; flex-shrink: 0;
      }
      .media-type-tag {
        position: absolute; top: 4px; left: 4px; z-index: 2;
        background: rgba(0,0,0,0.62);
        backdrop-filter: blur(4px);
        color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.92);
        font-size: 9px; font-weight: 700;
        padding: 2px 5px; border-radius: 4px;
        letter-spacing: 0.05em;
        pointer-events: none;
      }

      .mc-info { padding: 4px 7px 4px; }

      /* ── See More card ──────────────────────────────────────── */
      .smp-card { cursor: pointer; position: relative; overflow: hidden; }
      .smp-card:hover .smp-btn { transform: scale(1.1); }

      /* Absolutní kontejner pokrývající celou kartu */
      .smp-full { position: absolute; inset: 0; }
      .smp-posters {
        display: grid; grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr; height: 100%; gap: 1px;
      }
      .smp-posters > * { width: 100%; height: 100%; }
      .smp-overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.38);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 4px;
      }
      .smp-btn {
        width: 32px; height: 32px; border-radius: 50%;
        background: rgba(255,255,255,0.92);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 14px rgba(0,0,0,0.55);
        transition: transform 0.18s;
      }
      .smp-cta {
        color: #fff; font-size: 9px; font-weight: 800;
        text-transform: uppercase; letter-spacing: 0.04em;
        text-shadow: 0 1px 4px rgba(0,0,0,0.7);
      }
      .smp-count {
        color: rgba(255,255,255,0.85); font-size: 9px; font-weight: 600;
        text-shadow: 0 1px 4px rgba(0,0,0,0.7);
      }

      /* ── Full Trending Overlay (nahrazuje obsah col-right) ───── */
      .trending-overlay { display: flex; flex-direction: column; flex: 1; }

      .to-close {
        width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.65); font-size: 12px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .to-close:hover { background: rgba(255,255,255,0.16); color: #fff; }

      .to-grid {
        flex: 1; min-width: 0; position: relative;
        display: grid; grid-template-columns: repeat(4, 1fr);
        column-gap: 7px; row-gap: 38px; align-content: start;
      }

      /* Abs TV req overlay — pokryje řádek karet */
      .to-tv-abs-overlay {
        position: absolute; left: 0; right: 0; z-index: 5;
        background: rgba(14,17,30,0.92);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 10px; overflow: hidden;
      }
      /* tv-req-inner uvnitř abs overlaye — vyplní celou výšku */
      .to-tv-abs-overlay .tv-req-inner {
        height: 100%; box-sizing: border-box;
      }

      /* Nav — kopíruje .rp-btn styl */
      .to-nav {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 0 2px; gap: 8px; margin-top: 8px; flex-shrink: 0;
      }
      .to-nav-btn {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 20px; color: rgba(255,255,255,0.65);
        font-size: 12px; font-weight: 600; padding: 5px 14px; cursor: pointer;
        display: flex; align-items: center; gap: 4px;
        backdrop-filter: blur(8px); transition: background 0.15s, color 0.15s;
      }
      .to-nav-btn:hover { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9); }
      .to-nav-btn:disabled { opacity: 0.35; pointer-events: none; }
      .to-nav-btn-hidden { visibility: hidden; pointer-events: none; }
      .to-nav-dots { display: flex; gap: 5px; align-items: center; flex-shrink: 0; }
      .to-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: rgba(255,255,255,0.22); border: none; cursor: pointer; padding: 0;
        transition: background 0.25s, width 0.25s;
      }
      .to-dot:hover { background: rgba(255,255,255,0.45); }
      .to-dot.to-dot-act {
        width: 18px; border-radius: 3px;
        background: rgba(255,255,255,0.80); cursor: default; pointer-events: none;
      }

      .mc-title {
        font-size: 12px; font-weight: 700;
        color: rgba(var(--arr-pt-rgb, 255, 255, 255), 1);
        text-shadow: 0 1px 5px rgba(0,0,0,0.55);
        line-height: 1.3;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 2px;
      }

      .mc-sub {
        font-size: 11px; color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.55);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-bottom: 3px;
      }

      .mc-badges { display: flex; gap: 3px; flex-wrap: wrap; }

      /* ── Badges (original shape, macOS vivid colours) ── */
      .badge {
        font-size: 10px; font-weight: 800; line-height: 1;
        padding: 2px 6px; border-radius: 4px; white-space: nowrap;
        display: inline-flex; align-items: center; gap: 2px;
        color: rgba(var(--arr-tp-rgb, 255, 255, 255), 1);
      }
      .b-ok      { background:rgba(48,209,88,0.30);  border:1px solid rgba(48,209,88,0.62); }
      .b-sok     { background:rgba(48,209,88,0.26);  border:1px solid rgba(48,209,88,0.55); }
      .b-sub-ok  { background:rgba(48,209,88,0.28);  border:1px solid rgba(48,209,88,0.58); }
      .b-dl      { background:rgba(10,132,255,0.30); border:1px solid rgba(10,132,255,0.62); }
      .b-ep      { background:rgba(10,132,255,0.28); border:1px solid rgba(10,132,255,0.58); }
      .b-audio   { background:rgba(10,132,255,0.26); border:1px solid rgba(10,132,255,0.55); }
      .b-partial { background:rgba(255,149,0,0.30);  border:1px solid rgba(255,149,0,0.62); }
      .b-sno     { background:rgba(255,149,0,0.26);  border:1px solid rgba(255,149,0,0.55); }
      .b-sub-miss{ background:rgba(255,149,0,0.28);  border:1px solid rgba(255,149,0,0.58); }
      .b-missing { background:rgba(255,69,58,0.30);  border:1px solid rgba(255,69,58,0.62); }
      .b-cutoff  { background:rgba(255,214,10,0.28); border:1px solid rgba(255,214,10,0.62); }

      /* ── Upcoming action row ── */
      .mc-act {
        display: flex; align-items: center; gap: 4px; margin-top: 3px;
        flex-wrap: nowrap; overflow: hidden;
      }

      .imdb {
        display: flex; align-items: center; gap: 2px;
        border: 1px solid rgba(255,214,10,0.45); border-radius: 4px;
        padding: 2px 6px; font-size: 10px; font-weight: 800; line-height: 1;
        color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.55); flex-shrink: 0;
        background: rgba(255,214,10,0.10);
      }

      /* Datum se smrskne pokud není místo, ale nezalamuje se */
      .date-lbl {
        font-size: 10px; color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.52);
        flex: 0 1 auto; white-space: nowrap; min-width: 0;
      }

      .btn-add {
        background: rgba(var(--accent-rgb),0.28); color: rgba(var(--arr-tp-rgb, 255, 255, 255), 1);
        font-size: 10px; font-weight: 800; line-height: 1; padding: 2px 6px;
        border-radius: 4px; border: 1px solid rgba(var(--accent-rgb),0.50);
        cursor: pointer; flex-shrink: 0; margin-left: auto;
        backdrop-filter: blur(8px);
      }

      .btn-add:hover { background: rgba(var(--accent-rgb),0.45); }

      /* ── Status badges v mc-act (stejný styl jako .badge v knihovně) ── */
      .b-st-avail { background: rgba(48,209,88,0.30);  border: 1px solid rgba(48,209,88,0.62); }
      .b-st-pend  { background: rgba(255,149,0,0.30);  border: 1px solid rgba(255,149,0,0.62); }
      .b-st-proc  { background: rgba(10,132,255,0.30); border: 1px solid rgba(10,132,255,0.62); }
      .mc-act .badge { margin-left: auto; flex-shrink: 0; }
      /* Tlačítko stažení vlastní žádosti (neadmin) */
      .req-withdraw {
        display: inline-flex; align-items: center; justify-content: center;
        width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0;
        background: rgba(255,69,58,0.22); border: 1px solid rgba(255,69,58,0.40);
        color: #ff453a; font-size: 9px; font-weight: 900; cursor: pointer;
        margin-left: 2px;
      }
      .req-withdraw:hover { background: rgba(255,69,58,0.42); }
      .mc-act-right { margin-left: auto; display: inline-flex; align-items: center; gap: 2px; }

      /* ── Adaptivní layout chipů — container queries ──
         Priorita: 1. zmenšit padding  2. schovat datum
      */
      /* .badge-compact se přidá JavaScriptem pokud badge řádek přetéká */
      .badge-compact .b-txt { display: none; }
      @container mc (max-width: 94px) {
        .imdb { padding: 2px 3px; font-size: 9px; }
        .btn-add { padding: 2px 4px; font-size: 9px; }
      }
      @container mc (max-width: 78px) {
        .date-lbl { display: none; }
      }

      /* ── Request quality overlay ── */
      .req-overlay {
        position: absolute; inset: 0; z-index: 10;
        background: rgba(15,15,20,0.88);
        backdrop-filter: blur(8px);
        border-radius: 11px;
        display: flex; align-items: center; justify-content: center;
        animation: fade-in 0.15s ease;
      }
      .req-inner {
        display: flex; flex-direction: column; gap: 7px;
        padding: 10px 10px 8px; width: 100%;
      }
      .req-label {
        font-size: 10px; font-weight: 700; color: var(--text-secondary);
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      .req-select {
        width: 100%; background: rgba(255,255,255,0.10);
        border: 1px solid rgba(255,255,255,0.22); border-radius: 6px;
        color: #fff; font-size: 11px; font-weight: 600;
        padding: 4px 6px; cursor: pointer; outline: none;
        appearance: none; -webkit-appearance: none;
      }
      .req-select option { background: #1c1c2e; color: #fff; }
      .req-actions {
        display: flex; gap: 5px; margin-top: 1px;
      }
      .req-cancel {
        flex: 1; background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.20); border-radius: 5px;
        color: rgba(255,255,255,0.70); font-size: 10px; font-weight: 700;
        padding: 4px 0; cursor: pointer;
      }
      .req-cancel:hover { background: rgba(255,255,255,0.14); }
      .req-confirm {
        flex: 2; background: rgba(var(--accent-rgb),0.35);
        border: 1px solid rgba(var(--accent-rgb),0.55); border-radius: 5px;
        color: #fff; font-size: 10px; font-weight: 800;
        padding: 4px 0; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: 3px;
      }
      .req-confirm:hover { background: rgba(var(--accent-rgb),0.52); }
      .req-confirm:disabled, .req-cancel:disabled { opacity: 0.5; cursor: default; }
      @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

      /* ── Čekající žádosti (admin) ── */
      .pr-badge {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 18px; height: 18px; border-radius: 9px; padding: 0 5px;
        background: rgba(255,69,58,0.80); color: #fff;
        font-size: 10px; font-weight: 900; margin-left: 4px; flex-shrink: 0;
      }
      /* Meta řádek: typ + kdo žádal */
      .pr-meta-row {
        display: flex; align-items: center; gap: 4px; margin-bottom: 3px;
        flex-wrap: nowrap; overflow: hidden;
      }
      .pr-type-lbl {
        font-size: 9px; font-weight: 700; color: var(--text-secondary);
        white-space: nowrap; flex-shrink: 0;
      }
      .pr-requester {
        font-size: 9px; color: rgba(255,255,255,0.50);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
      }
      /* Řádek tlačítek — vždy celá šířka, každé tlačítko bere 50% */
      .pr-btn-row {
        display: flex; gap: 4px; margin-top: 1px;
      }
      .pr-approve, .pr-decline {
        flex: 1; display: inline-flex; align-items: center; justify-content: center;
        gap: 3px;
        border-radius: 4px; font-size: 10px; font-weight: 800; line-height: 1;
        padding: 3px 4px; cursor: pointer; white-space: nowrap; color: #fff;
      }
      .pr-approve {
        background: rgba(48,209,88,0.28); border: 1px solid rgba(48,209,88,0.50);
      }
      .pr-approve:hover { background: rgba(48,209,88,0.50); }
      .pr-decline {
        background: rgba(255,69,58,0.25); border: 1px solid rgba(255,69,58,0.45);
      }
      .pr-decline:hover { background: rgba(255,69,58,0.45); }
      .pr-approve:disabled, .pr-decline:disabled { opacity: 0.5; cursor: default; }
      /* Při úzkém kontejneru schovat texty — zůstanou jen ikony */
      @container mc (max-width: 110px) {
        .st-txt { display: none; }
        .pr-approve, .pr-decline { padding: 3px 6px; }
      }

      /* ── TV Request Overlay ── */
      .tv-req-overlay { align-items: stretch; padding: 0; }
      .tv-req-inner {
        display: flex; flex-direction: column; gap: 8px;
        padding: 10px 10px 8px; width: 100%;
      }
      .tv-req-top {
        display: flex; gap: 8px; align-items: flex-start;
      }
      .tv-req-poster {
        width: 36px; height: 54px; object-fit: cover;
        border-radius: 4px; flex-shrink: 0;
      }
      .tv-req-poster-ph {
        width: 36px; height: 54px; border-radius: 4px; flex-shrink: 0;
        background: rgba(255,255,255,0.08); display: flex;
        align-items: center; justify-content: center; font-size: 20px;
      }
      .tv-req-info { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
      .tv-req-title {
        font-size: 11px; font-weight: 700; color: #fff;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      /* Season switches nav */
      .sv-nav-wrap {
        display: flex; align-items: center; gap: 4px;
      }
      .sv-scroll {
        flex: 1; display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
        scrollbar-width: none; gap: 0;
      }
      .sv-scroll::-webkit-scrollbar { display: none; }
      .sv-page {
        min-width: 100%; scroll-snap-align: start;
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 6px; padding: 2px 0;
      }

      /* Single switch */
      .sv-wrap {
        display: flex; flex-direction: column; align-items: center;
        gap: 3px; cursor: pointer; user-select: none;
      }
      .sv-input { display: none; }
      .sv-track {
        width: 28px; height: 16px; border-radius: 8px;
        background: rgba(255,255,255,0.18);
        position: relative; transition: background 0.18s; flex-shrink: 0;
      }
      .sv-thumb {
        position: absolute; top: 2px; left: 2px;
        width: 12px; height: 12px; border-radius: 50%;
        background: #fff; transition: transform 0.18s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.35);
      }
      .sv-input:checked + .sv-track { background: rgba(48,209,88,0.75); }
      .sv-input:checked + .sv-track .sv-thumb { transform: translateX(12px); }
      .sv-lbl { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.65); }

      /* Chevron buttons */
      .sv-chev {
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18);
        border-radius: 5px; color: #fff; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        width: 22px; height: 22px; flex-shrink: 0; padding: 0;
      }
      .sv-chev:disabled { opacity: 0.28; cursor: default; }
      .sv-chev:not(:disabled):hover { background: rgba(255,255,255,0.16); }

      /* Page dots */
      .sv-dots {
        display: flex; justify-content: center; gap: 5px; padding: 1px 0;
      }
      .sv-dot {
        width: 5px; height: 5px; border-radius: 50%;
        background: rgba(255,255,255,0.25); transition: background 0.15s;
      }
      .sv-dot-active { background: rgba(255,255,255,0.80); }

      /* ── Placeholder ── */
      .placeholder {
        font-size: 12px; color: var(--text-muted);
        padding: 8px 4px; text-align: center;
      }

      /* ── Cover gradient placeholders ── */
      .ca{background:linear-gradient(150deg,#2a1660,#6b35b8);}
      .cb{background:linear-gradient(150deg,#0d2a5e,#1a5faa);}
      .cc{background:linear-gradient(150deg,#0d3318,#1e7a38);}
      .cd{background:linear-gradient(150deg,#3a0e0e,#8a2020);}
      .ce{background:linear-gradient(150deg,#0d2e2e,#1a7a60);}
      .cf{background:linear-gradient(150deg,#2e1a06,#7a4a18);}
      .cg{background:linear-gradient(150deg,#1e0e2e,#5a1880);}
      .ch{background:linear-gradient(150deg,#0e1e1e,#0e5858);}
      .ci{background:linear-gradient(150deg,#2e0e14,#782040);}
      .cj{background:linear-gradient(150deg,#0e0e28,#201880);}
      .ck{background:linear-gradient(150deg,#1a0e28,#580868);}
      .cl{background:linear-gradient(150deg,#0e2618,#0e5a28);}
      .cm{background:linear-gradient(150deg,#221a22,#503060);}
      .cn{background:linear-gradient(150deg,#261818,#583a28);}
      .co{background:linear-gradient(150deg,#182228,#284e42);}
      .cp{background:linear-gradient(150deg,#221e0a,#584e20);}
      .cq{background:linear-gradient(150deg,#0a0c28,#181e60);}
      .cr{background:linear-gradient(150deg,#280c08,#681808);}

      /* ════════════════════════════════════
         POPUP OVERLAY
      ════════════════════════════════════ */
      .popup-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: var(--is-overlay-bg, rgba(0,0,0,0.60));
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* ── Popup day/night CSS custom properties ── */
      .popup-overlay {
        --is-blue:       #0a84ff;
        --is-green:      #30d158;
        --is-red:        #ff453a;
        --is-orange:     #ff9500;
        --is-purple:     #bf5af2;
        --is-overlay-bg: var(--overlay-bg, rgba(0,0,0,0.55));
        --is-glass-bg:   var(--popup-bg, rgba(255,255,255,0.05));
        --is-glass-bdr:  rgba(255,255,255,0.25);
        --is-glass-blur: blur(35px) saturate(100%);
        --is-shine:      linear-gradient(120deg,rgba(255,255,255,0.55),rgba(255,255,255,0.15) 25%,rgba(255,255,255,0.05) 50%,transparent 70%);
        --is-shine-op:   0.35;
        --is-text:       rgba(255,255,255,1);
        --is-text-sec:   rgba(255,255,255,0.55);
        --is-text-body:  rgba(255,255,255,0.75);
        --is-text-muted: rgba(255,255,255,0.28);
        --is-text-label: rgba(255,255,255,0.22);
        --is-divider:    rgba(255,255,255,0.10);
        --is-row-hover:  rgba(255,255,255,0.04);
        --is-hdr-bg:     rgba(10,12,22,0.80);
        --is-hdr-blur:   blur(20px);
        --is-btn-bg:     rgba(255,255,255,0.08);
        --is-btn-bdr:    rgba(255,255,255,0.18);
        --is-btn-clr:    rgba(255,255,255,0.70);
        --is-btn-hbg:    rgba(255,255,255,0.15);
        --is-btn-hclr:   #fff;
        --is-btn-abg:    rgba(10,132,255,0.18);
        --is-btn-abdr:   rgba(10,132,255,0.40);
        --is-btn-aclr:   rgba(100,180,255,0.95);
        --is-fade-btm:   rgba(20,20,30,0.98);
        --is-close-bg:   rgba(0,0,0,0.50);
        --is-backdrop-f: brightness(0.55);
        --is-rej-clr:    rgba(255,149,0,0.80);
        --is-peers-s:    rgba(48,209,88,0.90);
        --is-peers-l:    rgba(255,69,58,0.80);
        --is-score-pos:  rgba(48,209,88,0.95);
        --is-score-neg:  rgba(255,69,58,0.90);
        --is-score-zer:  rgba(255,255,255,0.28);
        --is-src-tor-bg: rgba(48,209,88,0.18);  --is-src-tor-bdr: rgba(48,209,88,0.40);  --is-src-tor-clr: rgba(100,230,140,0.95);
        --is-src-nzb-bg: rgba(10,132,255,0.18); --is-src-nzb-bdr: rgba(10,132,255,0.40); --is-src-nzb-clr: rgba(80,160,255,0.95);
        --is-q4k-bg:     rgba(191,90,242,0.22); --is-q4k-bdr: rgba(191,90,242,0.55); --is-q4k-clr: rgba(210,140,255,0.95);
        --is-q1080-bg:   rgba(10,132,255,0.22); --is-q1080-bdr: rgba(10,132,255,0.55); --is-q1080-clr: rgba(90,170,255,0.95);
        --is-q720-bg:    rgba(90,200,250,0.20); --is-q720-bdr: rgba(90,200,250,0.50); --is-q720-clr: rgba(120,210,255,0.90);
        --is-lang-bg:    rgba(255,255,255,0.07); --is-lang-bdr: rgba(255,255,255,0.13); --is-lang-clr: rgba(255,255,255,0.42);
        --is-grab-bg:    rgba(10,132,255,0.12); --is-grab-bdr: rgba(10,132,255,0.32); --is-grab-clr: rgba(80,160,255,0.9);
        --is-grab-hbg:   rgba(10,132,255,0.28); --is-grab-hbdr: rgba(10,132,255,0.55); --is-grab-hclr: #fff;
        --is-grab-f-bg:  rgba(255,149,0,0.10);  --is-grab-f-bdr: rgba(255,149,0,0.32); --is-grab-f-clr: rgba(255,149,0,0.80);
        --is-grab-done-bg:  rgba(48,209,88,0.18); --is-grab-done-bdr: rgba(48,209,88,0.40); --is-grab-done-clr: rgba(48,209,88,0.9);
        --is-confirm-yes-bg:  rgba(10,132,255,0.18); --is-confirm-yes-clr: rgba(100,180,255,0.95);
        --is-confirm-no-bg:   rgba(255,69,58,0.12);  --is-confirm-no-clr:  rgba(255,100,90,0.90);
      }

      /* Denní režim (sun.sun = above_horizon) */
      .popup-overlay.popup-day {
        --is-overlay-bg: rgba(255,255,255,0.65);
        --is-glass-bg:   rgba(255,255,255,0.78);
        --is-glass-bdr:  rgba(255,255,255,0.90);
        --is-glass-blur: blur(40px) saturate(200%);
        --is-shine:      linear-gradient(120deg,rgba(255,255,255,0.95),rgba(255,255,255,0.50) 25%,rgba(255,255,255,0.15) 50%,transparent 70%);
        --is-shine-op:   0.65;
        --is-text:       rgba(0,0,0,0.88);
        --is-text-sec:   rgba(0,0,0,0.48);
        --is-text-body:  rgba(0,0,0,0.65);
        --is-text-muted: rgba(0,0,0,0.32);
        --is-text-label: rgba(0,0,0,0.28);
        --is-divider:    rgba(0,0,0,0.08);
        --is-row-hover:  rgba(0,0,0,0.03);
        --is-hdr-bg:     rgba(240,242,255,0.82);
        --is-hdr-blur:   blur(20px);
        --is-btn-bg:     rgba(0,0,0,0.05);
        --is-btn-bdr:    rgba(0,0,0,0.12);
        --is-btn-clr:    rgba(0,0,0,0.55);
        --is-btn-hbg:    rgba(0,0,0,0.09);
        --is-btn-hclr:   rgba(0,0,0,0.88);
        --is-btn-abg:    rgba(10,132,255,0.12);
        --is-btn-abdr:   rgba(10,132,255,0.35);
        --is-btn-aclr:   rgba(0,100,220,0.90);
        --is-fade-btm:   rgba(255,255,255,0.95);
        --is-close-bg:   rgba(0,0,0,0.12);
        --is-backdrop-f: brightness(0.72) saturate(0.85);
        --is-rej-clr:    rgba(180,90,0,0.85);
        --is-peers-s:    rgba(0,160,60,0.85);
        --is-peers-l:    rgba(200,40,30,0.80);
        --is-score-pos:  rgba(0,160,60,0.90);
        --is-score-neg:  rgba(200,40,30,0.90);
        --is-score-zer:  rgba(0,0,0,0.28);
        --is-src-tor-bg: rgba(48,209,88,0.14);  --is-src-tor-bdr: rgba(48,209,88,0.45);  --is-src-tor-clr: rgba(0,130,50,0.90);
        --is-src-nzb-bg: rgba(10,132,255,0.12); --is-src-nzb-bdr: rgba(10,132,255,0.45); --is-src-nzb-clr: rgba(0,80,200,0.90);
        --is-q4k-bg:     rgba(191,90,242,0.13); --is-q4k-bdr: rgba(191,90,242,0.50); --is-q4k-clr: rgba(110,10,190,0.90);
        --is-q1080-bg:   rgba(10,132,255,0.12); --is-q1080-bdr: rgba(10,132,255,0.50); --is-q1080-clr: rgba(0,80,200,0.90);
        --is-q720-bg:    rgba(90,200,250,0.14); --is-q720-bdr: rgba(90,200,250,0.50); --is-q720-clr: rgba(0,100,170,0.85);
        --is-lang-bg:    rgba(0,0,0,0.06);      --is-lang-bdr: rgba(0,0,0,0.12);     --is-lang-clr: rgba(0,0,0,0.48);
        --is-grab-bg:    rgba(10,132,255,0.10); --is-grab-bdr: rgba(10,132,255,0.35); --is-grab-clr: rgba(0,80,200,0.90);
        --is-grab-hbg:   rgba(10,132,255,0.22); --is-grab-hbdr: rgba(10,132,255,0.60); --is-grab-hclr: #fff;
        --is-grab-f-bg:  rgba(255,149,0,0.10);  --is-grab-f-bdr: rgba(255,149,0,0.40); --is-grab-f-clr: rgba(160,80,0,0.90);
        --is-grab-done-bg:  rgba(48,209,88,0.14); --is-grab-done-bdr: rgba(48,209,88,0.45); --is-grab-done-clr: rgba(0,130,50,0.90);
        --is-confirm-yes-bg:  rgba(10,132,255,0.15); --is-confirm-yes-clr: rgba(0,80,200,0.90);
        --is-confirm-no-bg:   rgba(255,69,58,0.10);  --is-confirm-no-clr:  rgba(180,40,30,0.90);
      }

      .popup-glass {
        position: relative;
        width: min(800px, 90vw);
        max-height: 85vh;
        border-radius: 28px;
        background: var(--is-glass-bg);
        backdrop-filter: var(--is-glass-blur);
        -webkit-backdrop-filter: var(--is-glass-blur);
        border: 1px solid var(--is-glass-bdr);
        box-shadow: 0 15px 40px rgba(0,0,0,0.20), inset 0 2px 3px rgba(0,0,0,0.04);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: width 0.3s cubic-bezier(.25,.46,.45,.94);
      }
      /* Gradient shine — přesně jako .col::before */
      .popup-glass::before {
        content: ""; position: absolute; inset: 0; border-radius: 28px;
        background: var(--is-shine); opacity: var(--is-shine-op);
        pointer-events: none; z-index: 0;
      }
      .popup-glass > * { position: relative; z-index: 1; }
      /* Wider modal při IS výsledcích */
      .popup-glass.is-wide { width: min(900px, 94vw); }

      /* Scrollable body below the backdrop */
      .popup-body {
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .popup-close {
        position: absolute;
        top: 12px;
        right: 14px;
        z-index: 10;
        background: var(--accent);
        border: none;
        color: #fff;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(10,132,255,0.45);
        transition: background 0.15s, transform 0.1s;
      }

      .popup-close:hover { background: #0071e3; transform: scale(1.08); }
      .popup-close:active { transform: scale(0.94); }

      .popup-backdrop {
        position: relative;
        width: 100%;
        height: 200px;
        background-size: cover;
        background-position: center top;
        flex-shrink: 0;
      }

      .popup-backdrop-fade {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 90px;
        background: linear-gradient(to bottom, transparent, var(--is-fade-btm));
        pointer-events: none;
      }

      .popup-content {
        display: flex;
        gap: 16px;
        padding: 12px 16px 16px;
        overflow-y: auto;
      }

      .popup-poster {
        width: 90px;
        height: 135px;
        border-radius: 10px;
        object-fit: cover;
        flex-shrink: 0;
        box-shadow: 0 4px 20px rgba(0,0,0,0.6);
        margin-top: -28px; /* overlap the backdrop fade */
      }

      .popup-meta { flex: 1; min-width: 0; }

      /* Trailer — YouTube thumbnail link */
      .popup-yt-thumb {
        display: block;
        position: relative;
        width: 100%;
        height: clamp(140px, 28vh, 210px);
        text-decoration: none;
        flex-shrink: 0;
        overflow: hidden;
      }

      .popup-yt-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 30%;
        display: block;
      }

      .popup-yt-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.40);
        transition: background 0.15s;
      }

      .popup-yt-thumb:hover .popup-yt-overlay {
        background: rgba(0,0,0,0.18);
      }

      .popup-yt-btn {
        background: rgba(200,0,0,0.88);
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        padding: 9px 22px;
        border-radius: 8px;
        letter-spacing: 0.02em;
      }

      /* ════════════════════════════════════
         POPUP — IS BUTTON + ADMIN BADGE
      ════════════════════════════════════ */
      .popup-title   { font-size: 18px; font-weight: 800; color: var(--is-text); margin: 0 0 5px; line-height: 1.2; }
      .popup-sub     { font-size: 11px; color: var(--is-text-sec); margin-bottom: 10px; }
      .popup-overview { font-size: 11px; color: var(--is-text-body); line-height: 1.65; margin: 0 0 12px; }

      .is-open-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 5px 12px 5px 9px; border-radius: 20px;
        border: 1px solid var(--is-btn-bdr); background: var(--is-btn-bg);
        color: var(--is-btn-clr); font-size: 11px; font-weight: 600;
        cursor: pointer; backdrop-filter: blur(8px);
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        margin-top: 4px;
      }
      .is-open-btn:hover  { background: var(--is-btn-hbg); color: var(--is-btn-hclr); }
      .is-open-btn.active { background: var(--is-btn-abg); border-color: var(--is-btn-abdr); color: var(--is-btn-aclr); }

      .is-admin-badge {
        font-size: 8px; font-weight: 800; text-transform: uppercase;
        letter-spacing: 0.05em; padding: 1px 5px; border-radius: 4px;
        background: rgba(255,149,0,0.20); border: 1px solid rgba(255,149,0,0.40);
        color: rgba(255,149,0,0.90); margin-left: 1px;
      }
      .popup-day .is-admin-badge {
        background: rgba(255,149,0,0.14); border-color: rgba(255,149,0,0.40);
        color: rgba(160,80,0,0.90);
      }

      .remove-lib-btn  { border-color: rgba(255,120,30,0.40); color: rgba(255,150,80,0.9);  height: 26px; box-sizing: border-box; }
      .remove-lib-btn:hover  { background: rgba(255,120,30,0.18); border-color: rgba(255,120,30,0.65); color: #ff9640; }
      .remove-disc-btn { border-color: rgba(255,60,60,0.35);  color: rgba(255,100,100,0.9); }
      .remove-disc-btn:hover { background: rgba(255,60,60,0.18);  border-color: rgba(255,60,60,0.6);  color: #ff6060; }
      .remove-confirm-row {
        display: inline-flex; align-items: center; gap: 6px; margin-top: 4px;
      }
      .remove-confirm-row .is-open-btn {
        margin-top: 0; height: 26px; box-sizing: border-box;
      }
      .remove-ic-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 26px; height: 26px; box-sizing: border-box;
        border-radius: 50%; border: 1px solid currentColor;
        background: transparent; cursor: pointer; padding: 0; flex-shrink: 0;
        transition: background 0.15s;
      }
      .remove-ic-no    { color: rgba(255,100,100,0.75); }
      .remove-ic-no:hover { background: rgba(255,100,100,0.2); }
      .remove-ic-btn svg { display: block; }

      /* IS confirm-add panel */
      .is-confirm-wrap {
        display: flex; flex-direction: column; align-items: center;
        gap: 14px; padding: 24px 20px; text-align: center;
      }
      .is-confirm-msg {
        font-size: 13px; color: var(--is-text-body); line-height: 1.55;
        max-width: 260px;
      }
      .is-confirm-actions {
        display: flex; gap: 12px;
      }
      .is-confirm-btn {
        width: 38px; height: 38px; border-radius: 50%;
        border: 1px solid; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background .15s, transform .1s;
      }
      .is-confirm-btn:hover { transform: scale(1.08); }
      .is-confirm-yes {
        background: var(--is-grab-done-bg);
        border-color: var(--is-grab-done-bdr);
        color: var(--is-grab-done-clr);
      }
      .is-confirm-yes:hover { background: rgba(48,209,88,0.30); }
      .is-confirm-no {
        background: var(--is-confirm-no-bg);
        border-color: var(--is-confirm-no-clr);
        color: var(--is-confirm-no-clr);
      }
      .is-confirm-no:hover { background: rgba(255,69,58,0.20); }

      /* ════════════════════════════════════
         INTERACTIVE SEARCH PANEL
      ════════════════════════════════════ */
      .is-panel {
        display: flex; flex-direction: column;
        border-top: 1px solid var(--is-divider);
        max-height: 380px; overflow: hidden;
        flex-shrink: 0;
      }
      .is-panel-hdr {
        display: flex; align-items: center; gap: 8px;
        padding: 7px 16px 6px;
        border-bottom: 1px solid var(--is-divider);
        flex-shrink: 0;
      }
      .is-panel-title {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.09em; color: var(--is-text-label);
      }
      .is-count { font-size: 10px; color: var(--is-text-muted); margin-right: auto; }

      .is-filter { display: flex; gap: 4px; }
      .is-f-btn {
        padding: 3px 10px; border-radius: 20px;
        border: 1px solid var(--is-btn-bdr); background: transparent;
        color: var(--is-text-muted); font-size: 10px; font-weight: 600;
        cursor: pointer; backdrop-filter: blur(8px);
        transition: background 0.13s, color 0.13s; letter-spacing: 0.02em;
      }
      .is-f-btn:hover  { background: var(--is-btn-hbg); color: var(--is-btn-hclr); }
      .is-f-btn.active { background: var(--is-btn-bg); border-color: var(--is-btn-bdr); color: var(--is-text); }

      .is-loading {
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 10px;
        padding: 36px 20px; color: var(--is-text-muted); font-size: 11px;
      }

      /* Results scroll container */
      .is-results-wrap { overflow-y: auto; flex: 1; min-height: 0; }

      /* ── TABLE ── */
      .is-table { width: 100%; border-collapse: collapse; }
      .is-table thead th {
        padding: 5px 8px; text-align: left; font-size: 9px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.09em; color: var(--is-text-label);
        border-bottom: 1px solid var(--is-divider); white-space: nowrap;
        position: sticky; top: 0;
        background: var(--is-hdr-bg); backdrop-filter: var(--is-hdr-blur);
        -webkit-backdrop-filter: var(--is-hdr-blur);
      }
      .is-table thead th:first-child { padding-left: 16px; }
      .is-table thead th:last-child  { padding-right: 16px; }
      .is-table tbody tr { border-bottom: 1px solid var(--is-divider); transition: background 0.10s; }
      .is-table tbody tr:hover { background: var(--is-row-hover); }
      .is-table td { padding: 7px 8px; vertical-align: middle; }
      .is-table td:first-child { padding-left: 16px; }
      .is-table td:last-child  { padding-right: 16px; }

      /* ── CARDS (mobile) ── */
      .is-card {
        padding: 9px 14px; border-bottom: 1px solid var(--is-divider);
        display: flex; flex-direction: column; gap: 4px; transition: background 0.10s;
      }
      .is-card:hover { background: var(--is-row-hover); }
      .is-ic-r1 { display: flex; align-items: center; gap: 5px; }
      .is-ic-spacer { flex: 1; min-width: 4px; }
      .is-ic-title {
        font-size: 10px; font-weight: 500; color: var(--is-text-body);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .is-ic-meta {
        display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
        font-size: 9px; color: var(--is-text-muted);
      }
      .is-ic-meta .sep { opacity: 0.5; }
      .is-ic-rej { font-size: 9px; color: var(--is-rej-clr); }

      /* ── Shared atoms ── */
      .is-src-pill {
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 8px; font-weight: 800; padding: 2px 5px; border-radius: 5px;
        letter-spacing: 0.04em; white-space: nowrap; border: 1px solid transparent;
      }
      .is-src-tor { background: var(--is-src-tor-bg); border-color: var(--is-src-tor-bdr); color: var(--is-src-tor-clr); }
      .is-src-nzb { background: var(--is-src-nzb-bg); border-color: var(--is-src-nzb-bdr); color: var(--is-src-nzb-clr); }

      .is-q-pill {
        display: inline-flex; align-items: center; border-radius: 999px;
        border: 1px solid transparent; font-weight: 700; font-size: 9px;
        white-space: nowrap; padding: 2px 7px; letter-spacing: 0.03em;
      }
      .is-q-4k   { background: var(--is-q4k-bg);   border-color: var(--is-q4k-bdr);   color: var(--is-q4k-clr);   }
      .is-q-1080 { background: var(--is-q1080-bg); border-color: var(--is-q1080-bdr); color: var(--is-q1080-clr); }
      .is-q-720  { background: var(--is-q720-bg);  border-color: var(--is-q720-bdr);  color: var(--is-q720-clr);  }
      .is-q-sd   { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); color: var(--is-text-muted); }

      .is-score { font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .is-s-pos  { color: var(--is-score-pos); }
      .is-s-neg  { color: var(--is-score-neg); }
      .is-s-zero { color: var(--is-score-zer); }

      .is-rel-title {
        display: block; font-size: 11px; font-weight: 500; color: var(--is-text-body);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;
      }
      .is-rel-age  { font-size: 9px; color: var(--is-text-muted); margin-top: 1px; display: block; }
      .is-rej-row  { font-size: 9px; color: var(--is-rej-clr); margin-top: 2px; display: block; }
      .is-indexer  { font-size: 10px; color: var(--is-text-sec); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; display: block; }
      .is-size     { font-size: 10px; color: var(--is-text-sec); font-variant-numeric: tabular-nums; white-space: nowrap; }
      .is-peers    { display: flex; align-items: center; gap: 2px; font-size: 10px; white-space: nowrap; }
      .is-peers .is-s { color: var(--is-peers-s); font-weight: 700; }
      .is-peers .is-l { color: var(--is-peers-l); font-weight: 700; }
      .is-peers-na { font-size: 10px; color: var(--is-text-muted); }
      .is-lang-chip {
        font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 5px;
        background: var(--is-lang-bg); border: 1px solid var(--is-lang-bdr);
        color: var(--is-lang-clr); text-transform: uppercase; letter-spacing: 0.03em;
      }

      /* Grab button */
      .is-grab-btn {
        width: 28px; height: 28px; border-radius: 9px;
        border: 1px solid var(--is-grab-bdr); background: var(--is-grab-bg);
        color: var(--is-grab-clr); display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: all 0.14s; flex-shrink: 0; margin: 0 auto;
        backdrop-filter: blur(8px);
      }
      .is-grab-btn:hover:not(:disabled) { background: var(--is-grab-hbg); border-color: var(--is-grab-hbdr); color: var(--is-grab-hclr); }
      .is-grab-btn.force { background: var(--is-grab-f-bg); border-color: var(--is-grab-f-bdr); color: var(--is-grab-f-clr); }
      .is-grab-btn.force:hover:not(:disabled) { background: rgba(255,149,0,0.25); color: #fff; }
      .is-grab-btn.is-grab-done { background: var(--is-grab-done-bg); border-color: var(--is-grab-done-bdr); color: var(--is-grab-done-clr); cursor: default; }
      .is-grab-btn.is-grab-failed { background: rgba(255,69,58,0.12); border-color: rgba(255,69,58,0.35); color: rgba(255,69,58,0.90); }
      .is-grab-btn.is-grab-failed:hover { background: rgba(255,69,58,0.22); border-color: rgba(255,69,58,0.55); color: #fff; }
      .is-grab-btn:disabled { opacity: 0.6; cursor: default; }

      /* Confirm wrap (inline 2-button potvrzení) */
      .is-confirm-wrap { display: flex; gap: 4px; align-items: center; justify-content: center; }
      .is-confirm-yes {
        padding: 3px 8px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer;
        background: var(--is-confirm-yes-bg); border: 1px solid var(--is-btn-abdr);
        color: var(--is-confirm-yes-clr); transition: all 0.13s;
      }
      .is-confirm-yes.force { background: var(--is-grab-f-bg); border-color: var(--is-grab-f-bdr); color: var(--is-grab-f-clr); }
      .is-confirm-yes:hover { filter: brightness(1.2); }
      .is-confirm-no {
        padding: 3px 7px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer;
        background: var(--is-confirm-no-bg); border: 1px solid rgba(255,69,58,0.25);
        color: var(--is-confirm-no-clr); transition: all 0.13s;
      }
      .is-confirm-no:hover { filter: brightness(1.2); }

      /* ── Mobile IS grab button (larger) ── */
      .is-ic-r1 .is-grab-btn { width: 30px; height: 30px; margin: 0; }

      /* ════════════════════════════════════
         RIGHT COLUMN PAGE NAV
      ════════════════════════════════════ */
      .rp-sections { flex: 1; }
      .rp-nav {
        position: relative;
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 0 2px; gap: 8px;
        margin-top: auto;
      }
      .rp-dots {
        display: flex; align-items: center; gap: 5px; flex-shrink: 0;
      }
      .rp-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: rgba(var(--arr-pd-rgb, 255, 255, 255), 0.22); border: none;
        cursor: pointer; padding: 0; flex-shrink: 0;
        transition: background 0.25s ease;
      }
      .rp-dot:hover { background: rgba(var(--arr-pd-rgb, 255, 255, 255), 0.45); }
      .rp-dot-active {
        width: 18px; border-radius: 3px;
        background: rgba(var(--arr-pda-rgb, 255, 255, 255), 0.80);
        cursor: default; pointer-events: none;
        animation: dot-expand 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
      }
      @keyframes dot-expand {
        from { width: 6px; opacity: 0.3; }
        to   { width: 18px; opacity: 1; }
      }
      .rp-btn {
        background: rgba(var(--arr-pbb-rgb, 255, 255, 255), 0.08);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 20px;
        color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 0.65);
        font-size: 12px; font-weight: 600;
        padding: 5px 14px;
        cursor: pointer;
        display: flex; align-items: center; gap: 4px;
        backdrop-filter: blur(8px);
        transition: background 0.15s, color 0.15s;
      }
      .rp-btn:hover {
        background: rgba(255,255,255,0.15);
        color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 0.9);
      }
      .rp-btn-hidden { visibility: hidden; pointer-events: none; }

      @keyframes rp-ping {
        0%   { box-shadow: 0 0 0 0 rgba(10,132,255,0.85); }
        70%  { box-shadow: 0 0 0 12px rgba(10,132,255,0); }
        100% { box-shadow: 0 0 0 0 rgba(10,132,255,0); }
      }
      .rp-btn-ping { animation: rp-ping 0.8s ease-out 1; }

      /* ── Responsive ── */

      /* Tablet portrait: stack columns */
      @media (max-width: 900px) {
        .card-body { grid-template-columns: 1fr; }

        /* Floating sticky nav — glass pill, fade-in po nascrollování */
        .rp-nav {
          position: sticky;
          bottom: 12px;
          z-index: 10;
          align-self: stretch;
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(35px) saturate(180%);
          -webkit-backdrop-filter: blur(35px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 20px;
          padding: 8px 12px;
          margin: 10px 0 0;
          box-shadow: 0 8px 32px rgba(0,0,0,0.38);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.4s ease;
        }
        .rp-nav.rp-nav-visible {
          opacity: 1;
          pointer-events: auto;
        }
        /* Gradient shine */
        .rp-nav::before {
          content: "";
          position: absolute; inset: 0; border-radius: 20px;
          background: linear-gradient(
            120deg,
            rgba(255,255,255,0.55),
            rgba(255,255,255,0.15) 25%,
            rgba(255,255,255,0.05) 50%,
            transparent 70%
          );
          opacity: 0.35; pointer-events: none; z-index: 0;
        }
        .rp-nav > * { position: relative; z-index: 1; }
        .rp-nav .rp-btn {
          color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 0.88);
          background: rgba(var(--arr-pbb-rgb, 255, 255, 255), 0.10);
          border-color: rgba(255,255,255,0.22);
          backdrop-filter: none;
        }
        .rp-nav .rp-btn:hover {
          background: rgba(255,255,255,0.18);
          color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 1);
        }
        .rp-nav .rp-dot { background: rgba(var(--arr-pd-rgb, 255, 255, 255), 0.30); }
        .rp-nav .rp-dot-active { background: rgba(var(--arr-pda-rgb, 255, 255, 255), 0.90); }
      }

      /* Large phone: mgrid 3 col */
      @media (max-width: 700px) {
        .mgrid   { grid-template-columns: repeat(3, 1fr); }
        .dl-name { max-width: calc(100vw - 120px); }
        /* badges stay on one row — clip overflow */
        .mc-badges { flex-wrap: nowrap; overflow: hidden; }
        .badge     { font-size: 9px; padding: 0 3px; flex-shrink: 0; }
      }

      /* Small phone: mgrid 2 col */
      @media (max-width: 480px) {
        .mgrid   { grid-template-columns: repeat(2, 1fr); }
        .to-grid { grid-template-columns: repeat(2, 1fr); }
        .disk-row    { flex-wrap: wrap; }
        .disk-chip   { min-width: calc(50% - 3px); }
        .col         { border-radius: 24px; padding: 12px; }
        .col::before { border-radius: 24px; }
        .card-body   { gap: 8px; padding: 0 8px 8px; }
        /* even smaller badges in 2-col grid */
        .badge { font-size: 8px; padding: 0 2px; }
        .badge ha-icon { --mdc-icon-size: 8px !important; }
      }

      /* ── Sonarr Interactive Search ── */

      .sn-is-section {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .sn-seasons-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: .06em;
        text-transform: uppercase;
        color: var(--is-text-label);
        margin-bottom: 4px;
      }

      /* Season row */
      .sn-season-row {
        border-radius: 8px;
        overflow: hidden;
        background: var(--is-row-hover);
      }

      .sn-season-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        min-height: 36px;
      }

      .sn-expand {
        background: none;
        border: none;
        cursor: pointer;
        padding: 3px;
        display: flex;
        align-items: center;
        color: var(--is-btn-clr);
        flex-shrink: 0;
      }
      .sn-expand:hover { color: var(--is-btn-hclr); }

      .sn-season-chevron {
        transition: transform .2s;
      }
      .sn-season-chevron.open {
        transform: rotate(180deg);
      }

      .sn-season-title {
        font-size: 12px;
        font-weight: 600;
        color: var(--is-text);
        flex-shrink: 0;
      }

      .sn-season-stat {
        font-size: 10px;
        color: var(--is-text-muted);
        flex-shrink: 0;
      }

      .sn-season-bar {
        flex: 1;
        height: 3px;
        background: var(--is-divider);
        border-radius: 2px;
        overflow: hidden;
        min-width: 30px;
      }
      .sn-season-bar-fill {
        height: 100%;
        background: var(--is-blue, #3b82f6);
        border-radius: 2px;
      }

      /* Person icon button */
      .btn-person {
        background: var(--is-btn-bg);
        border: 1px solid var(--is-btn-bdr);
        border-radius: 5px;
        cursor: pointer;
        padding: 4px 6px;
        color: var(--is-btn-clr);
        display: flex;
        align-items: center;
        flex-shrink: 0;
        transition: background .15s, color .15s, border-color .15s;
      }
      .btn-person:hover {
        background: var(--is-btn-hbg);
        color: var(--is-btn-hclr);
        border-color: var(--is-btn-bdr);
      }
      .btn-person.active {
        background: var(--is-btn-abg);
        border-color: var(--is-btn-abdr);
        color: var(--is-btn-aclr);
      }
      .btn-person-sm {
        padding: 3px 5px;
      }

      /* Episodes panel */
      .sn-episodes {
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: 0 8px 6px;
      }

      .sn-episodes-loading {
        align-items: center;
        justify-content: center;
        min-height: 32px;
        flex-direction: row;
        gap: 8px;
      }

      .sn-ep-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 4px;
        border-radius: 5px;
        flex-wrap: wrap;
      }
      .sn-ep-row:hover { background: var(--is-row-hover); }
      .sn-ep-row.has-file .sn-ep-num { color: var(--is-green); }

      .sn-ep-num {
        font-size: 10px;
        font-family: monospace;
        color: var(--is-text-sec);
        flex-shrink: 0;
        min-width: 56px;
      }

      .sn-ep-title {
        font-size: 11px;
        color: var(--is-text-body);
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .sn-ep-date {
        font-size: 10px;
        color: var(--is-text-muted);
        flex-shrink: 0;
      }

      /* IS panel (season pack or episode) */
      .sn-is-panel {
        margin: 4px 8px 8px;
        background: var(--is-hdr-bg);
        border-radius: 8px;
        border: 1px solid var(--is-divider);
        max-height: 320px;
        overflow-x: auto;
        overflow-y: auto;
      }

      /* Mobile drill-down */
      .sn-drilldown {
        margin-top: 0;
      }

      .sn-back-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        background: var(--is-btn-bg);
        border: 1px solid var(--is-btn-bdr);
        border-radius: 6px;
        color: var(--is-btn-clr);
        font-size: 12px;
        cursor: pointer;
        padding: 5px 10px;
        margin-bottom: 8px;
        align-self: flex-start;
        transition: background .15s;
      }
      .sn-back-btn:hover {
        background: var(--is-btn-hbg);
        color: var(--is-btn-hclr);
      }

      .sn-drilldown-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--is-text-sec);
        margin-bottom: 6px;
      }

      /* ════════════════════════════════════
         LAYOUT MODES
      ════════════════════════════════════ */

      /* layout: left — hide right column, expand left to full width */
      .card-body.layout-left {
        grid-template-columns: 1fr;
      }
      .card-body.layout-left .col-right { display: none; }

      /* layout: right — hide left column, expand right to full width */
      .card-body.layout-right {
        grid-template-columns: 1fr;
      }
      .card-body.layout-right .col-left { display: none; }

      /* ════════════════════════════════════
         PERFORMANCE MODE
      ════════════════════════════════════ */

      /* Disables all backdrop-filter blur — major GPU relief on mobile */
      .card-body.perf-mode .col,
      .card-body.perf-mode *,
      .perf-mode ~ #popup-root .popup-glass,
      .perf-mode ~ #popup-root * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      /* Compensate lost blur with higher opacity so content stays readable */
      .card-body.perf-mode .col {
        background: var(--card-bg-perf, rgba(18,18,22,0.88));
      }
    `;
