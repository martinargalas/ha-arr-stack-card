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
        margin-bottom: 8px;
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
        padding: 0 12px 8px;
      }
      .card-body.no-downloads { grid-template-columns: 1fr; }
      .card-body.no-downloads .col-left { display: none; }
      .card-body.swap-sides { grid-template-columns: 3fr 2fr; }
      .card-body.swap-sides .col-left  { order: 2; }
      .card-body.swap-sides .col-right { order: 1; }
      @media (max-width: 900px) {
        .card-body.swap-sides { grid-template-columns: 1fr; }
      }

      /* ── Glass outer panel ── */
      .col {
        position: relative;
        padding: 7px 15px;
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
      /* Every category stands as tall as the tallest one on the page, so the
         headings line up at the same height whichever page is shown and the
         card does not resize as you page through it. The measurement lives in
         --sec-min-h on the column; see _syncSecHeights. */
      .sec-card:not(.sec-search) { min-height: var(--sec-min-h, 0px); }
      /* And the block of categories keeps a full page's height, so the last
         page — which usually holds fewer of them — ends where the others do.
         Both live on the column, which no render replaces; written on the
         sections themselves they were lost with the next repaint. */
      .rp-sections { min-height: var(--sec-wrap-h, auto); }

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
      .vpn-bar {
        display: flex; align-items: center; gap: 8px;
        border-radius: 999px; padding: 8px 10px;
        font-size: 12px; font-weight: 500;
        background: rgba(var(--arr-pbb-rgb, 255,255,255), 0.08);
        border: 1px solid rgba(255,255,255,0.18);
      }
      .vpn-bar-online  { color: #4ade80; }
      .vpn-bar-offline { color: #f87171; }
      .vpn-bar-label   { flex: 1; }

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

      .vpn-shield { flex-shrink: 0; margin-left: -2px; }
      .vpn-shield-ok   { color: rgba(48,209,88,0.90); }
      .vpn-shield-fail { color: rgba(255,69,58,0.90); }
      .vpn-shield-unk  { color: rgba(255,255,255,0.30); }

      .mbar { height: 2px; background: rgba(255,255,255,0.18); border-radius: 1px; overflow: hidden; margin-top: 3px; }
      .mbar-fill { height: 100%; border-radius: 1px; }

      .rf-disk-chip { margin-bottom: 8px; }
      .rf-disk-inner { display: flex; justify-content: space-between; align-items: flex-start; }
      .rf-disk-left { flex: 1; min-width: 0; }
      .rf-disk-right { text-align: right; margin-left: 10px; flex-shrink: 0; max-width: 55%; }
      .dc-root-path { font-size: 10px; color: rgba(var(--arr-pt-rgb, 255, 255, 255), 0.6); font-weight: 600; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .disk-chip.dc-pageable { padding: 0; }
      .stream-badge { font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 3px; letter-spacing: 0.04em; vertical-align: middle; }
      .stream-badge-plex { background: rgba(229,160,13,0.75); color: #fff; border: 1px solid rgba(229,160,13,0.35); }
      .stream-badge-jf   { background: rgba(0,164,220,0.75);  color: #fff; border: 1px solid rgba(0,164,220,0.35); }
      .stream-badge-emby { background: rgba(82,182,92,0.75);  color: #fff; border: 1px solid rgba(82,182,92,0.35); }
      .stream-badge-kodi { background: rgba(23,154,215,0.75); color: #fff; border: 1px solid rgba(23,154,215,0.35); }
      .stream-prog-track { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.15); z-index: 2; }
      .stream-prog-fill  { height: 100%; background: rgba(229,160,13,0.9); border-radius: 0 1px 0 0; transition: width 0.5s linear; }
      .stream-paused img { filter: brightness(0.55) saturate(0.4); }
      .stream-paused-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 2; color: rgba(255,255,255,0.9); }
      .stream-device-tag { position: absolute; top: 6px; left: 6px; z-index: 2; background: rgba(0,0,0,0.62); backdrop-filter: blur(4px); color: rgba(var(--arr-st-rgb,255,255,255),0.85); font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; display: inline-flex; align-items: center; gap: 2px; pointer-events: none; }
      .stream-user-tag { position: absolute; top: 28px; left: 6px; z-index: 2; background: rgba(0,0,0,0.62); backdrop-filter: blur(4px); color: rgba(var(--arr-st-rgb,255,255,255),0.92); font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; pointer-events: none; max-width: calc(100% - 12px); overflow: hidden; }
      .popup-ctrl-btn { background: rgba(255,255,255,0.08); border: none; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(255,255,255,0.85); transition: background 0.15s; }
      .popup-ctrl-btn:hover { background: rgba(255,255,255,0.16); }
      .popup-ctrl-btn-main { width: 56px; height: 56px; background: rgba(229,160,13,0.2); }
      .popup-ctrl-btn-main:hover { background: rgba(229,160,13,0.35); }
      .stream-seek-wrap:hover .stream-prog-fill { background: rgba(229,160,13,1); }

      .dc-pageable { display: flex; align-items: stretch; justify-content: space-between; }
      .dc-page-content { flex: 1; min-width: 0; padding: 7px 4px; }
      .dc-chev { background: none; border: none; color: rgba(var(--arr-pt-rgb, 255, 255, 255), 0.55); cursor: pointer; padding: 7px 3px; display: flex; align-items: center; flex-shrink: 0; }
      .dc-chev:disabled { opacity: 0.18; cursor: default; }

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
        display: inline-flex; align-items: center; justify-content: center; gap: 1px;
        font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.30); background: rgba(255,255,255,0.12);
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.85); cursor: pointer;
        backdrop-filter: blur(8px);
      }
      .sb ha-icon { display: flex; align-items: center; justify-content: center; }

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
        border-radius: 50%; border: 1px solid rgba(255,255,255,0.22);
        background: rgba(255,255,255,0.10);
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.80); cursor: pointer;
        backdrop-filter: blur(8px);
        transition: background 0.15s, color 0.15s;
      }
      .action-btn ha-icon { display: flex; align-items: center; justify-content: center; }
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
      /* Keep the header's view actions clear of back/close. Scoped to :not(:empty)
         so tabs without an action do not shift the close button. */
      #mt-hdr-save:not(:empty) { margin-right: 14px; }

      /* Week/Month switch. Tried two ovals welded by a neck first — separate
         boxes cannot share a continuous outline, so it read as two buttons on a
         stick. One track with a sliding fill; the overshoot easing keeps the
         "pour" feel. */
      .mt-seg {
        position: relative;
        display: inline-flex;
        align-items: center;
        height: 28px;
        padding: 2px;
        flex-shrink: 0;
        box-sizing: border-box;
        border-radius: 999px;
        /* Outline only, like the library header's filter pills — a filled track
           competes with the sliding indicator. */
        background: transparent;
        border: 1px solid var(--is-btn-bdr);
        user-select: none;
        cursor: pointer;
        --seg-w: 66px;
      }
      .mt-seg--icon { --seg-w: 44px; }
      /* Sharing a row with the chevron paging on a phone — a narrower track is
         what buys the paging enough width to stay centred. */
      @media (max-width: 600px) {
        #mt-rules-foot .mt-seg--icon { --seg-w: 34px; }
        #mt-rules-foot .tl-page-btn { padding: 5px 7px; }
      }
      /* _uiPager carries its own top margin, which pushed the paging below the
         switch centred on the footer box. */
      #mt-rules-foot > div { margin-top: 0 !important; }

      /* Header tabs scroll sideways on a phone; without this they would run
         straight into the close button instead of fading out short of it. */
      .lib-hdr-scroll {
        /* margin-right, not padding: padding sits inside the box, so pills that
           overflow simply paint over it. Shortening the box is what leaves a
           real gap before the close button — overflow then clips anything past
           it, and the mask dissolves the last stretch instead of cutting it. */
        -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 34px), transparent 100%);
        mask-image: linear-gradient(to right, #000 calc(100% - 34px), transparent 100%);
      }
      .lib-hdr-scroll::-webkit-scrollbar { display: none; }

      /* Indeterminate progress: used where the API reports that work is running
         but not how far along it is. */
      @keyframes mt-prog-sweep {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(250%); }
      }
      .mt-prog-sweep { animation: mt-prog-sweep 1.3s ease-in-out infinite; }

      /* Stacked log entries, the phone counterpart of the three-column table */
      .mt-log-row {
        padding: 7px 2px;
        border-bottom: 1px solid var(--is-divider, rgba(255,255,255,0.07));
      }
      .mt-log-row:last-child { border-bottom: none; }

      /* Status messages would otherwise squeeze the header's own controls on a
         phone; floated over the modal they cost no layout at all. */
      @media (max-width: 600px) {
        [data-mt-modal] #mt-status {
          position: fixed;
          /* Clear of the footer's paging row rather than sitting on top of it */
          left: 12px; right: 12px; bottom: 70px;
          justify-content: center;
          z-index: 999;
          pointer-events: none;
        }
      }
      .mt-seg-half {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--seg-w);
        height: 100%;
        border-radius: 999px;
        /* Matches .is-f-btn so a peanut sits level with the plain pills */
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.02em;
        /* Full strength in both states, like the library's filter pills — the
           sliding fill is what marks the selection, not a dimmed label. */
        color: var(--is-text);
        transition: color 0.25s;
        white-space: nowrap;
      }
      .mt-seg-ind {
        position: absolute;
        z-index: 1;
        top: 2px;
        bottom: 2px;
        left: 2px;
        width: var(--seg-w);
        border-radius: 999px;
        box-sizing: border-box;
        border: 1px solid var(--seg-accent-bdr, transparent);
        background: var(--seg-accent, rgba(0,122,255,0.85));
        transition: transform 0.34s cubic-bezier(.65,-0.25,.3,1.28);
      }
      /* In a filter header the peanut grows to 34px — border + padding + a 28px
         fill — so its active segment is exactly as tall as the pills beside it
         rather than inset and visibly shorter. */
      .is-filter .mt-seg { height: 34px; }

      /* Halves carry their own width here, so letting flex shrink them would
         leave the measured indicator wider than the segment under it. */
      .mt-seg--var .mt-seg-half { flex-shrink: 0; }
      .mt-seg--var .mt-seg-ind { transition: transform 0.34s cubic-bezier(.65,-0.25,.3,1.28), width 0.34s cubic-bezier(.65,-0.25,.3,1.28); }
      .mt-seg--var.mt-seg--presync .mt-seg-ind { transition: none; }
      /* Doubled class on purpose: the fixed-grid rules below match with the same
         specificity and stand later in the sheet, so a single class loses and the
         indicator falls back to --seg-w with a translateX(100%) step. */
      .mt-seg--var.mt-seg[data-seg="0"] .mt-seg-ind { width: var(--w0); transform: translateX(var(--x0)); }
      .mt-seg--var.mt-seg[data-seg="1"] .mt-seg-ind { width: var(--w1); transform: translateX(var(--x1)); }
      .mt-seg--var.mt-seg[data-seg="2"] .mt-seg-ind { width: var(--w2); transform: translateX(var(--x2)); }
      .mt-seg--var.mt-seg[data-seg="3"] .mt-seg-ind { width: var(--w3); transform: translateX(var(--x3)); }
      .mt-seg[data-seg="1"] .mt-seg-ind { transform: translateX(100%); }
      .mt-seg[data-seg="2"] .mt-seg-ind { transform: translateX(200%); }
      .mt-seg[data-seg="3"] .mt-seg-ind { transform: translateX(300%); }
      .mt-seg[data-seg="0"] .mt-seg-half:nth-child(2),
      .mt-seg[data-seg="1"] .mt-seg-half:nth-child(3),
      .mt-seg[data-seg="2"] .mt-seg-half:nth-child(4),
      .mt-seg[data-seg="3"] .mt-seg-half:nth-child(5) { color: #fff; }
      .mt-seg-half.is-disabled { opacity: 0.3; pointer-events: none; }

      /* Cards in Maintainerr share the toolbar's hairline rather than the
         heavier --is-divider, so nothing in the tab reads as boxed. */
      [data-mt-modal] { --is-card-bdr: rgba(255,255,255,0.09); }
      [data-mt-modal].popup-day { --is-card-bdr: rgba(0,0,0,0.09); }

      /* _uiPager carries a 12px top margin of its own, which sat the paging
         closer to the modal's edge than to the grid above it. */
      [data-mt-modal] #mt-pag-wrap > div { margin-top: 8px !important; }

      /* Form fields inside the Maintainerr modal. The old SEL_STY box — 6px
         corners, a full-strength border — is what read as a stock form; these
         match the toolbar capsule instead. */
      .mt-field {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.10);
        /* Capsule, like every other control in this language — a boxy field is
           what read as a stock form next to the toolbar. */
        border-radius: 999px;
        color: var(--is-text, #fff);
        font-size: 12px; line-height: 1;
        height: 32px; padding: 0 14px;
        box-sizing: border-box;
        outline: none; cursor: pointer;
        color-scheme: light dark;
        transition: border-color 0.15s, background 0.15s;
      }
      input.mt-field { cursor: text; }
      /* Field-shaped select: our own trigger, the native one invisible on top */
      .mt-fsel {
        position: relative;
        display: inline-flex; align-items: center; gap: 6px;
        /* Same pill as the toolbar's filters, but not the blue value: the
           accent marks a chosen filter, and a form field is always filled. */
        border-radius: 999px;
        color: var(--is-text, #fff);
        font-weight: 600;
      }
      .popup-day .mt-fsel { color: #11181f; }
      .mt-fsel-lbl {
        flex: 1; min-width: 0;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .mt-fsel select {
        position: absolute; inset: 0;
        width: 100%; height: 100%;
        opacity: 0; cursor: pointer;
        font-size: 16px;
      }
      /* No capsule: a boolean isn't a surface, only the box and its label. The
         row keeps the field height so it lines up with the inputs beside it. */
      .mt-chk {
        display: inline-flex; align-items: center; gap: 8px;
        height: 32px;
        font-size: 11px; font-weight: 600;
        color: var(--is-text);
        cursor: pointer; user-select: none;
      }
      .mt-chk input { position: absolute; opacity: 0; width: 0; height: 0; }
      .mt-chk-box {
        flex: 0 0 auto;
        width: 16px; height: 16px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.22);
        display: inline-flex; align-items: center; justify-content: center;
        color: transparent;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
      }
      .mt-chk-lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .mt-chk:has(input:checked) .mt-chk-box {
        background: #007aff; border-color: #007aff; color: #fff;
      }
      .popup-day .mt-chk-box { border-color: rgba(0,0,0,0.25); }
      .popup-day .mt-chk:has(input:checked) .mt-chk-box {
        background: #0060df; border-color: #0060df;
      }

      .mt-field:focus { border-color: rgba(0,122,255,0.65); }
      .mt-field:disabled { opacity: 0.45; }
      .mt-btn {
        font-weight: 600; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
      }
      .mt-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
      .popup-day .mt-field {
        background: rgba(0,0,0,0.05);
        border-color: rgba(0,0,0,0.12);
      }
      .popup-day .mt-btn:hover:not(:disabled) { background: rgba(0,0,0,0.09); }

      /* ── Maintainerr nav ──────────────────────────────────────────────────
         One track holding the tabs, with only the active one filled — seven
         outlined pills read as seven separate controls rather than one choice.
         Same capsule language as the toolbar below. */
      .mt-nav {
        position: relative;
        display: inline-flex; align-items: center; gap: 2px;
        max-width: 100%;
        height: 34px; padding: 0 3px;
        border-radius: 999px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.09);
        box-sizing: border-box;
        overflow-x: auto; scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .mt-nav::-webkit-scrollbar { display: none; }
      .mt-nav-ind {
        position: absolute; top: 3px; bottom: 3px; left: 0;
        width: 0; border-radius: 999px;
        background: var(--nav-accent, rgba(0,122,255,0.9));
        pointer-events: none; z-index: 0;
        transition: transform 0.34s cubic-bezier(.65,-0.25,.3,1.28),
                    width 0.34s cubic-bezier(.65,-0.25,.3,1.28);
      }
      .mt-nav-btn {
        position: relative; z-index: 1;
        display: inline-flex; align-items: center; justify-content: center;
        gap: 5px; flex-shrink: 0;
        height: 26px; padding: 0 10px;
        border: none; background: none;
        border-radius: 999px;
        color: var(--is-text, #fff);
        font-size: 11px; font-weight: 600;
        white-space: nowrap; cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .mt-nav-btn:hover:not(.is-on) { background: rgba(255,255,255,0.08); }
      .mt-nav-btn.is-on { color: #fff; }

      /* Nested one level down: smaller, quieter, and only ever visible while
         its parent tab has a collection open. */
      .mt-nav-sub-wrap {
        position: relative;
        display: inline-flex; align-items: center; gap: 2px;
        max-width: 0; overflow: hidden;
        transition: max-width 0.25s ease;
      }
      /* The sub-tabs get the sliding fill too, quieter than the top level's so
         the parent tab stays the louder of the two. */
      .mt-nav-sub-wrap > .mt-nav-ind {
        top: 50%; bottom: auto; height: 22px; transform-origin: left;
        margin-top: -11px;
        --nav-accent: rgba(255,255,255,0.14);
      }
      .popup-day .mt-nav-sub-wrap > .mt-nav-ind { --nav-accent: rgba(0,0,0,0.12); }
      .mt-nav-sub-wrap.is-open { max-width: 420px; }
      .mt-nav-sub {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 4px; flex-shrink: 0;
        height: 22px; padding: 0 8px; margin-left: 2px;
        border: none; background: none;
        border-radius: 999px;
        color: var(--is-text, #fff); opacity: 0.65;
        font-size: 10px; font-weight: 600;
        white-space: nowrap; cursor: pointer;
        transition: background 0.15s, opacity 0.15s;
      }
      .mt-nav-sub:hover { opacity: 1; }
      .mt-nav-sub.is-on {
        opacity: 1;
        background: rgba(255,255,255,0.14);
      }
      @media (max-width: 600px) {
        .mt-nav-btn { padding: 0 9px; }
        .mt-nav-sub { padding: 0 7px; }
      }
      /* Nested in a toolbar the group brings no surface of its own — the bar is
         already one — and shrinks to the bar's inner height. */
      /* Not only inside a toolbar: wherever it sits, the inline group brings no
         surface of its own — it borrows whatever it is placed on. Standing
         alone it used to keep the header nav's track and height, which made it
         taller than the same group nested in a bar. */
      .mt-nav--inline {
        height: 28px; padding: 0;
        background: transparent; border: 0;
        overflow: visible; flex-shrink: 0;
      }
      .mt-nav--inline .mt-nav-ind { top: 0; bottom: 0; }
      .mt-nav--inline .mt-nav-btn { height: 28px; font-size: 12px; }
      @media (max-width: 600px) {
        /* Everything in this bar competes for one row, so the buttons give back
           what they can rather than letting the group be scrolled out of view. */
        .mt-tb .mt-nav--inline .mt-nav-btn { padding: 0 8px; gap: 4px; }
      }
      .popup-day .mt-nav { background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.09); }
      .popup-day .mt-nav-btn:hover:not(.is-on) { background: rgba(0,0,0,0.07); }
      .popup-day .mt-nav-sub.is-on { background: rgba(0,0,0,0.12); }

      /* Single-letter periods (W, M, Y) should read as circles, not upright
         ovals — so a button is never narrower than it is tall. Longer labels
         outgrow the minimum on their own and stay capsules. */
      @media (max-width: 1100px) {
        .mt-nav--inline .mt-nav-btn { min-width: 28px; box-sizing: border-box; }
      }
      @media (max-width: 600px) {
        .mt-nav--inline .mt-nav-btn { min-width: 32px; }
        .mt-tb--card .mt-nav--inline .mt-nav-btn { min-width: 28px; }
      }

      /* Two groups in one bar on a phone: tighter than usual, because eight
         buttons have to share a single row. */
      .tra-dev-bar .mt-nav-btn { padding: 0 6px; font-size: 11px; }
      .tra-dev-bar .mt-nav--inline { gap: 0; }

      /* ── Badges ───────────────────────────────────────────────────────────
         One shape for every badge in a table or modal: a full capsule, a
         translucent fill and a rim of the same hue. The hue arrives as an RGB
         triple in --bdg, so a badge needs no styles of its own. */
      .ui-badge {
        display: inline-flex; align-items: center; gap: 4px;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 9px; font-weight: 700;
        line-height: 1.6; white-space: nowrap;
        background: rgba(var(--bdg), 0.14);
        border: 1px solid rgba(var(--bdg), 0.38);
        color: rgb(var(--bdg));
      }
      /* Light surfaces wash a mid-tone out, so day mode leans on the fill. */
      .popup-day .ui-badge { background: rgba(var(--bdg), 0.16); border-color: rgba(var(--bdg), 0.5); }
      .ui-badge--sm { padding: 1px 6px; font-size: 8px; }
      /* Category-card badges keep white text — the card's poster backdrop is
         too busy for a tinted label to stay legible. */
      .ui-badge--w, .popup-day .ui-badge--w { color: #fff; }

      /* ── Tracearr's phone nav ─────────────────────────────────────────────
         A bottom bar, not a header capsule: eight groups with sub-tabs have no
         other honest home on a phone. The marks are ours though — a capsule
         behind the chosen item, one blue accent, hairline rules. */
      .tra-mnav {
        flex-shrink: 0;
        background: rgba(12,12,20,0.85);
        backdrop-filter: blur(12px);
      }
      .popup-day .tra-mnav { background: rgba(250,250,252,0.9); }
      .tra-mnav-row {
        position: relative;
        display: flex; gap: 2px;
        padding: 4px 6px;
        border-top: 1px solid rgba(255,255,255,0.08);
        overflow-x: auto; scrollbar-width: none;
      }
      .popup-day .tra-mnav-row { border-top-color: rgba(0,0,0,0.08); }
      .tra-mnav-row::-webkit-scrollbar { display: none; }
      /* The fill is one element the wire layer slides between buttons, exactly
         as the desktop header menu does. */
      .tra-mnav-row > .mt-nav-ind { top: 4px; bottom: 4px; border-radius: 14px; }
      .tra-mnav-sub > .mt-nav-ind { --nav-accent: rgba(0,122,255,0.28); }
      .tra-mnav-btn {
        position: relative; z-index: 1;
        flex: 1; min-width: 40px;
        height: 48px;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 3px;
        border: none; border-radius: 14px;
        background: transparent; cursor: pointer;
        color: var(--is-text-muted);
        transition: background 0.15s, color 0.15s;
      }
      .tra-mnav-btn span {
        font-size: 9px; font-weight: 600; line-height: 1;
        white-space: nowrap;
      }
      /* The label only earns its space on the chosen item; the rest are glyphs
         so eight of them still fit across a phone. */
      .tra-mnav-main span { opacity: 0; transition: opacity 0.15s; }
      .tra-mnav-main.is-on span { opacity: 1; }
      .tra-mnav-btn.is-on { color: #fff; }
      .tra-mnav-sub .tra-mnav-btn { height: 40px; }
      .tra-mnav-sub .tra-mnav-btn.is-on { color: var(--is-text); }

      /* ── Maintainerr toolbar ──────────────────────────────────────────────
         One translucent capsule rather than three outlined boxes: surfaces
         separate the controls, not borders, and only a narrowed filter carries
         colour. The native select is still there for the picker itself, but
         reduced to an invisible hit target so the OS never draws chrome. */
      .mt-tb {
        display: flex; align-items: center;
        height: 32px; padding: 0 6px 0 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.07);
        /* Hairline edge — enough to give the glass a rim without the control
           reading as a boxed input again. box-sizing keeps the 32px height. */
        border: 1px solid rgba(255,255,255,0.10);
        box-sizing: border-box;
        gap: 8px;
      }
      /* Inside a bar the separators already group the controls, so the peanut's
         own ring is a second, redundant frame. Heights follow the header nav:
         a 34px bar with a 28px fill, which the 30px box plus its transparent
         1px border produces. */
      /* No border at all, not a transparent one: 30px of box plus the bar's own
         3px of padding overflowed a 34px bar, and a bar that scrolls clips the
         overflow — which is what made the row look short. 28px fits exactly and
         matches the fill height of the toggles beside it. */
      .mt-tb .mt-seg { border: 0; height: 28px; padding: 0; }
      .mt-tb .mt-seg .mt-seg-ind { top: 0; bottom: 0; left: 0; }
      /* Independent on/off toggle — a peanut cannot show "neither chosen".
         .mt-tb-btn is the same shape without the on state: an action that
         belongs to the bar, so it brings no capsule of its own. */
      .mt-tb .mt-tgl,
      .mt-tb .mt-tb-btn {
        flex-shrink: 0;
        /* 28px — same as the peanut's fill beside it and the header nav's. */
        height: 28px; padding: 0 12px;
        border: none; border-radius: 999px;
        background: transparent;
        color: var(--is-text);
        font-size: 12px; font-weight: 600;
        display: inline-flex; align-items: center; gap: 5px;
        cursor: pointer; white-space: nowrap;
        transition: background 0.15s, color 0.15s;
      }
      .mt-tb .mt-tgl:hover:not(.is-on),
      .mt-tb .mt-tb-btn:hover:not(:disabled) { background: rgba(255,255,255,0.09); }
      .mt-tb .mt-tgl.is-on {
        background: var(--tgl-on, rgba(0,122,255,0.5));
        color: #fff;
      }
      .popup-day .mt-tb .mt-tgl:hover:not(.is-on),
      .popup-day .mt-tb .mt-tb-btn:hover:not(:disabled) { background: rgba(0,0,0,0.07); }
      .mt-tb-ico { flex-shrink: 0; color: var(--is-text); opacity: 0.4; transition: opacity 0.15s; }
      .mt-tb:focus-within .mt-tb-ico { opacity: 0.9; }
      .mt-tb-input {
        background: none; border: none; outline: none;
        color: var(--is-text, #fff);
        font-size: 12px; line-height: 1.4;
        flex: 1; min-width: 0; padding: 0; margin: 0;
      }
      .mt-tb-input::-webkit-search-cancel-button { display: none; }
      .mt-tb-sep {
        width: 1px; height: 16px; flex-shrink: 0;
        background: rgba(255,255,255,0.14);
      }
      .mt-tb-sel {
        position: relative;
        display: inline-flex; align-items: center; gap: 3px;
        height: 26px; padding: 0 8px;
        border-radius: 999px;
        cursor: pointer; flex-shrink: 0;
        /* The value carries the accent the way a link does — it is the part
           you can change, and it reads as chosen rather than as static text. */
        color: #4da3ff;
        font-size: 12px; font-weight: 600;
        transition: background 0.15s;
      }
      /* Open counts as engaged: the custom sort menu has no native focus ring to
         hold the fill the way the invisible select does. */
      .mt-tb-sel:hover,
      .mt-tb-sel.is-open { background: rgba(255,255,255,0.09); }
      .mt-tb-lbl {
        max-width: 130px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .mt-tb-chev { flex-shrink: 0; opacity: 0.55; }
      /* Icon-only picker for phones: muted while it filters nothing, accented
         once it does — a row of glyphs otherwise hides which filters are set. */
      .mt-tb-sel.is-off { color: var(--is-text); opacity: 0.55; }
      .mt-tb-sel--ico { padding: 0 4px; gap: 1px; color: var(--is-text); opacity: 0.5; }
      .mt-tb-sel--ico.is-active { opacity: 1; color: #4da3ff; }
      /* The pickers and Columns share a scrolling cluster; the search field
         keeps whatever the cluster does not take. */
      .act-tb-cluster {
        display: flex; align-items: center; gap: 2px;
        max-width: 60%; flex-shrink: 0;
        overflow-x: auto; scrollbar-width: none;
      }
      .act-tb-cluster::-webkit-scrollbar { display: none; }
      /* On a phone the pickers share the row with the search field, so they take
         only what their own label needs. */
      @media (max-width: 600px) {
        /* Everything shares one bar, so each control gives back what it can. The
           wider left inset belongs to the magnifier, so only bars that actually
           hold a search field get it — elsewhere it broke the even inset. */
        .mt-tb { gap: 4px; }
        .mt-tb:has(.mt-tb-input) { padding-left: 10px; }
        .mt-tb-sel { height: 32px; }
        /* The cap exists to leave room for typing, so it belongs to bars that
           hold a search field — not to pickers standing on their own. */
        .mt-tb:has(.mt-tb-input) .mt-tb-lbl { max-width: 72px; }
        .mt-tb-sel { padding: 0 5px; gap: 2px; }

        /* Touch targets. The bar and the header nav grow to 40px and their
           glyphs with them; the height comes back out of the header's and the
           body's padding, so nothing below moves. Heights are written inline by
           the builders, hence !important. */
        /* Only the header's own menu grows — a group nested in a bar must stay
           inside it, or its fill spans the bar's full height. */
        /* Bars inside a card keep their smaller size — the roomier touch target
           is for the toolbars that head a whole tab, not for a switch sitting in
           a chart's corner beside a bare group of the same kind. */
        .mt-nav:not(.mt-nav--inline), .mt-tb:not(.mt-tb--card) { height: 40px !important; }
        .mt-nav--inline { height: 32px !important; }
        .mt-nav--inline .mt-nav-btn { height: 32px; }
        /* A card's bar stays 34px, so the group inside it stays 28 — at 32 the
           fill filled the bar edge to edge and spilled past its rounding. */
        .mt-tb--card .mt-nav--inline { height: 28px !important; }
        .mt-tb--card .mt-nav--inline .mt-nav-btn { height: 28px; }
        .mt-nav-btn { height: 32px; padding: 0 11px; }
        .mt-nav-ind { top: 4px; bottom: 4px; }
        .mt-nav-btn svg { width: 17px; height: 17px; }
        .mt-tb .mt-tb-btn, .mt-tb .mt-tgl { height: 32px; }
        .mt-tb .mt-seg { height: 36px !important; }
        .mt-tb-ico { width: 15px; height: 15px; }
        .mt-tb-input { font-size: 13px; }
        .mt-tb-sel--ico > svg:first-child { width: 16px; height: 16px; }
        /* Actions in the bar are icon-only here, so their glyph is the target —
           but a chevron is a marker, not a target, and keeps its own size. */
        .mt-tb .mt-tb-btn > svg:not(.tl-dd-chev) { width: 16px; height: 16px; }
        .mt-tb-chev { width: 11px; height: 11px; }
        [data-act-modal] .is-panel-hdr,
        [data-pw-modal] .is-panel-hdr,
        [data-lib-modal] .is-panel-hdr,
        [data-mt-modal] .is-panel-hdr,
        [data-tl-modal] .is-panel-hdr,
        [data-js-modal] .is-panel-hdr,
        [data-tra-modal] .is-panel-hdr { padding-top: 8px !important; padding-bottom: 6px !important; }
        [data-act-modal] .popup-body,
        [data-pw-modal] .popup-body,
        [data-lib-modal] .popup-body,
        [data-mt-modal] .popup-body,
        [data-tl-modal] .popup-body,
        [data-js-modal] .popup-body,
        [data-tra-modal] .popup-body { padding-top: 8px !important; }
        /* .popup-body is a flex column, so its children shrink to fit instead of
           overflowing — the content never grows past the frame and there is
           nothing to scroll. Pinning the children at their own height is what
           gives the body something to scroll through. */
        [data-tra-modal] #tra-body > * { flex-shrink: 0; }

        /* Title and both groups share one line here, so worded buttons give back
           some padding — the single letters keep their circle. */
        .tra-qe-bar .mt-nav-btn { padding: 0 8px; font-size: 11px; }
        /* Icon actions and, in edit mode, five bulk buttons share that bar. The
           negative margin closes the bar's own gap between them — they read as
           one cluster, and the room goes to the search field. */
        .mt-tb .mt-tb-btn { padding: 0 6px; font-size: 11px; }
        .mt-tb .mt-tb-btn + .mt-tb-btn { margin-left: -4px; }
        /* Buttons that keep their label need the room back — the tightening
           above is for glyph-only clusters. */
        .mt-tb .mt-tb-btn--txt { padding: 0 9px; }
        .mt-tb .mt-tb-btn--txt + .mt-tb-btn--txt { margin-left: 0; }
      }
      .mt-tb-sel select {
        position: absolute; inset: 0;
        width: 100%; height: 100%;
        opacity: 0; cursor: pointer;
        /* 16px keeps iOS from zooming the page when the picker opens */
        font-size: 16px;
      }
      @media (max-width: 600px) {
        /* Both the gap and the label cap exist to leave room for typing, so
           they belong to bars that hold a search field. A duplicate of this
           block used to cap every label, wherever it sat. */
        .mt-tb:has(.mt-tb-input) { gap: 6px; padding-left: 10px; }
      }
      /* Day mode still runs on light surfaces, so the alphas invert. The night
         look is the one being designed; this only keeps day legible. */
      .popup-day .mt-tb { background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.10); }
      .popup-day .mt-tb-sep { background: rgba(0,0,0,0.14); }
      .popup-day .mt-tb-sel:hover { background: rgba(0,0,0,0.07); }
      .popup-day .mt-tb-sel { color: #0060df; }

      /* Maintainerr search bars — border stays quiet until the field is focused */
      .mt-search { transition: border-color 0.15s; }
      .mt-search:focus-within { border-color: var(--accent); }

      /* Search-bar magnifier. Every search field in the card is a wrapper div
         holding the icon and the input as direct children, so one rule covers
         them all: dim at rest, full-strength text colour while typing. */
      div:has(> input[type="search"]) > svg {
        color: var(--is-text-muted);
        transition: color 0.15s;
      }
      div:has(> input[type="search"]:focus) > svg {
        color: var(--is-text);
      }

      /* Inline variant — inherits the surrounding text colour, so it stays
         readable inside coloured status badges as well as on buttons. */
      .is-spin {
        display: inline-block;
        width: 12px; height: 12px;
        border-radius: 50%;
        border: 2px solid currentColor;
        border-top-color: transparent;
        opacity: 0.9;
        animation: btn-spin 0.65s linear infinite;
      }

      /* ── Per-torrent tiny action buttons ── */
      .tb-group {
        display: flex; gap: 3px; flex-shrink: 0; margin-left: 24px; min-width: 53px; justify-content: flex-end;
      }

      .tb {
        display: inline-flex; align-items: center; justify-content: center;
        width: 25px; height: 25px; flex-shrink: 0;
        border-radius: 50%; border: 1px solid rgba(255,255,255,0.28);
        background: rgba(255,255,255,0.10);
        color: rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.90); cursor: pointer;
        padding: 0; line-height: 0;
        transition: background 0.12s, color 0.12s;
      }
      .tb ha-icon { display: block; width: var(--mdc-icon-size, 15px); height: var(--mdc-icon-size, 15px); }
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
      .sec-card { margin-bottom: 4px; overflow: hidden; }
      .dc-section-card {
        background: rgba(255,255,255,0.07);
        border-radius: 14px;
        padding: 10px 12px;
        position: relative;
        overflow: hidden;
      }
      .dc-section-card.dc-no-chev { margin: 0 22px; }
      @media (max-width: 600px) { .dc-section-card.dc-no-chev { margin: 0; } }
      .dc-section-card .dl-list { position: relative; z-index: 1; }
      .has-gradient .dc-section-card { position: relative; z-index: 1; }
      .has-gradient .col-hdr,
      .has-gradient .pg-wrap,
      .has-gradient .tl-row,
      .trending-overlay .col-hdr,
      .trending-overlay .pg-wrap { position: relative; z-index: 1; }

      /* ════════════════════════════════════
         SEARCH BAR
      ════════════════════════════════════ */
      .sec-search { padding-bottom: 0; }
      .sec-search .mgrid { padding: 0; }
      .search-bar-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(var(--arr-pbb-rgb, 255,255,255), 0.08);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 999px;
        padding: 8px 14px;
        margin-bottom: 8px;
        transition: border-color .2s;
      }
      .search-bar-wrap:focus-within {
        border-color: rgba(255,255,255,0.35);
      }
      .search-bar-icon { color: var(--secondary-text-color, #888); flex-shrink: 0; }
      .search-bar-input {
        background: none;
        border: none;
        outline: none;
        font-family: inherit;
        font-size: 15px;
        font-weight: 800;
        color: var(--secondary-text-color, #aaa);
        width: 100%;
      }
      .search-bar-input::placeholder { color: rgba(255,255,255,0.25); }
      /* The library's type peanut, a size down so it rides inside the bar. */
      /* ── Header type filter ──────────────────────────────────────────────
         On a wide header the peanut sits in the row as it always did. On a
         phone the three icons cost more width than the header has left once
         paging, See More and the calendar button are in it, so a funnel stands
         in for them and the peanut grows out of it — in its place, not beside
         it, or the paging would be pushed out again. */
      .hdr-filter { display: inline-flex; align-items: center; flex-shrink: 0; min-width: 0; }
      /* The header's peanut is sized off the buttons beside it rather than off
         the search bar's smaller one: the track stands as tall as the calendar
         button's circle, and its icons match that button's mark. Holds at every
         width — phone, tablet and desktop. */
      /* Three classes deep on purpose: .search-type-seg sets 24px and 13px
         icons further down this sheet, and at equal specificity the later rule
         wins — which is why the header peanut kept coming out shorter than the
         buttons it sits next to. */
      .hdr-filter .search-type-seg .mt-seg { height: 28px; }
      .hdr-filter .search-type-seg .mt-seg-half svg { width: 16px; height: 16px; }
      .hdr-filter .search-type-seg .mt-seg-half { font-size: 11px; }
      /* The header's rule would run under the open pop-out and show through the
         glass. Hidden, not removed — the paging and the buttons past it keep
         their places. */
      .col-hdr:has(.hdr-filter.is-open) .col-hdr-line { visibility: hidden; }
      .hdr-filter-btn {
        display: none;
        position: relative;
        align-items: center; justify-content: center;
        /* Same box as the peanut it stands in for — 24px tall with a 2px inset,
           so the two swap without the header changing height. */
        /* Same box as the calendar and See More buttons it shares the row
           with — 28px around a 16px mark. */
        width: 28px; height: 28px; padding: 2px;
        box-sizing: border-box;
        border-radius: 999px;
        border: 1px solid var(--is-btn-bdr);
        background: transparent;
        color: var(--is-text);
        cursor: pointer; flex-shrink: 0;
        line-height: 0;
        transition: color 0.2s;
      }
      .hdr-filter-btn ha-icon { position: relative; z-index: 1; display: block; --mdc-icon-size: 16px; }
      /* A filter that is doing something wears exactly what a selected half in
         the peanut wears — and that is two edges, not one: the track's own
         hairline, and inside it the accent pill with its own border. Painting
         the fill on the button itself gave a single blue ring, which is what
         made the two read as different controls. */
      .hdr-filter.is-set .hdr-filter-btn::after {
        content: '';
        position: absolute; inset: 1px;
        border-radius: 999px;
        box-sizing: border-box;
        border: 1px solid var(--seg-accent-bdr, rgba(0,122,255,0.8));
        background: var(--seg-accent, rgba(0,122,255,0.5));
      }
      .hdr-filter.is-set .hdr-filter-btn { color: #fff; }
      @media (max-width: 600px) {
        .hdr-filter { position: relative; }
        /* Sized off the buttons it shares the header with — See More and the
           calendar are 28px with a 16px mark, and a filter half that size read
           as a different class of control. */
        .hdr-filter-btn { display: inline-flex; margin: -2px 0; }
        /* Out of the flow on purpose: growing in the row would push the paging,
           See More and the calendar button along with it. It opens over them
           instead, from the funnel's own position, and carries a fill so what
           it covers does not read through. The funnel keeps its space while
           hidden, so nothing moves either way. */
        .hdr-filter > .search-type-seg {
          position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          margin: 0 !important;
          max-width: 0; opacity: 0; overflow: hidden;
          z-index: 20; pointer-events: none;
          transition: max-width 0.3s cubic-bezier(.4,0,.2,1), opacity 0.2s ease;
        }
        /* The fill belongs to the wrapper: put on .mt-seg it painted a square
           behind the capsule, since the wrapper it sits in has no radius of its
           own. Glass rather than a black slab — the same treatment every other
           floating surface in the card gets. */
        .hdr-filter > .search-type-seg {
          border-radius: 999px;
          background: rgba(28,30,40,0.72);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          box-shadow: 0 6px 20px rgba(0,0,0,0.45);
        }
        /* Without blur the glass would be a pale wash over the icons beneath,
           so performance mode gets an opaque fill instead. */
        .card-body.perf-mode .hdr-filter > .search-type-seg {
          background: var(--card-bg-perf, rgba(18,18,22,0.94));
        }
        .hdr-filter.is-open > .search-type-seg { max-width: 240px; opacity: 1; pointer-events: auto; }
        .hdr-filter.is-open > .hdr-filter-btn { visibility: hidden; }
      }

      .search-type-seg { flex-shrink: 0; margin-right: 8px; }
      .search-type-seg { -webkit-tap-highlight-color: transparent; }
      .search-type-seg, .search-type-seg * { user-select: none; -webkit-user-select: none; }
      .search-type-seg ::selection { background: transparent; }
      .search-type-seg .mt-seg { height: 24px; }
      .search-type-seg .mt-seg-half { font-size: 10px; }
      .search-type-seg .mt-seg-half svg { width: 13px; height: 13px; }
      @media (max-width: 600px) { .search-type-seg .mt-seg { --seg-w: 30px; } }

      .search-bar-clear {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: rgba(var(--arr-pbb-rgb, 255,255,255), 0.14);
        color: rgba(255,255,255,0.55);
        cursor: pointer;
        flex-shrink: 0;
        transition: background .15s, color .15s;
      }
      .search-bar-clear svg { width: 11px; height: 11px; display: block; }
      .search-bar-clear:hover {
        background: rgba(var(--arr-pbb-rgb, 255,255,255), 0.24);
        color: rgba(255,255,255,0.9);
      }
      .sec-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
      .sec-grid .mc {
        position: relative;
        overflow: hidden;
        border-radius: 10px;
        aspect-ratio: 2/3;
        display: block;
      }
      .mc-grad {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
        padding: 18px 6px 6px;
        pointer-events: none;
      }
      .mc-year {
        font-size: 9px;
        color: rgba(255,255,255,0.55);
      }
      .mc-type-tag {
        position: absolute;
        top: 5px; right: 5px;
        font-size: 9px;
        font-weight: 700;
        color: #fff;
        border-radius: 4px;
        padding: 2px 5px;
        pointer-events: none;
      }
      .placeholder-poster {
        width: 100%; height: 100%;
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
      }

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
        flex: 1; min-width: 0;
      }

      .dl-pct { font-size: 13px; font-weight: 800; color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.5); flex-shrink: 0; margin-left: 8px;
        min-width: 3.2ch; text-align: right; text-shadow: 0 1px 4px rgba(0,0,0,0.4); }

      .dl-r2 { display: flex; gap: 10px; margin-bottom: 4px; flex-wrap: nowrap; overflow: hidden; }
      .dl-r2 .status-pill { flex-shrink: 0; }
      .dl-r2 .dm { flex-shrink: 0; }
      .dm-peer { display: flex; gap: 4px; flex-shrink: 0; }

      .dm { font-size: 11px; color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.55); display: flex; align-items: center; gap: 2px; }
      .dm ha-icon { display: flex; }
      .dm b { font-weight: 700; }
      .dm-val { color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.5); font-weight: 700; }

      /* ══════════════════════════════════════
         PILL CHIP SYSTEM  (speed + status)
         Solid macOS colours, no gradient — clean and vivid
      ══════════════════════════════════════ */
      .g, .pill-green, .pill-orange, .pill-red, .pill-blue, .pill-yellow, .pill-teal, .pill-gray {
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
      /* gray — queued/unknown */
      .pill-gray        { background: rgba(180,180,180,0.20); border-color: rgba(180,180,180,0.45); }
      /* Speed value pill (inline in torrent rows) */
      .g { padding: 0 7px; }
      /* Value pill in disk chips */
      .pill-orange.dc-pill { padding: 1px 6px; font-size: 13px; font-weight: 800; }
      /* Status pill in torrent rows */
      .status-pill { padding: 1px 8px; font-size: 10px; line-height: 1; }
      .status-pill ha-icon { display: flex; }

      .pbar { height: 2px; background: rgba(255,255,255,0.18); border-radius: 1px; overflow: hidden; }
      .pbar-fill { height: 100%; border-radius: 1px; }
      .pf-blue   { background: linear-gradient(90deg, rgba(var(--accent-rgb),0.7), rgba(var(--accent-rgb),1)); }
      .pf-orange { background: linear-gradient(90deg, rgba(255,149,0,0.7), #ffbb50); }
      .pf-red    { background: linear-gradient(90deg, rgba(255,69,58,0.7), #ff6b61); }
      .pf-green  { background: linear-gradient(90deg, rgba(48,209,88,0.7), #a8ffcb); }
      .pf-teal   { background: linear-gradient(90deg, rgba(90,200,250,0.7), rgba(90,200,250,1)); }

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
        position: relative; aspect-ratio: 2/3; height: auto; cursor: pointer;
        container-type: inline-size;
        container-name: mc;
      }
      /* The phone's 2x2 library grid sizes its rows, so the cards take the row
         height instead of their 2:3 ratio — the poster crops, the page keeps
         its four items. */
      .lib-grid-fit .mc { aspect-ratio: auto; height: 100%; min-height: 0; }

      /* ════════════════════════════════════
         MUSIC — square art in a 2:3 card
      ════════════════════════════════════ */
      /* The cover keeps its own shape, the card keeps the grid's. The artist's
         fanart fills the rest of the frame so the row lines up with every other
         row instead of standing a third shorter — and the title sits in the
         same gradient every other poster uses. */
      .mc-music {
        display: flex; align-items: center; justify-content: center;
        border: 1px solid rgba(255,255,255,0.13);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.07);
      }
      /* Half-lit rather than dimmed to a third: the backdrop is meant to read as
         frosted glass with the cover's own colours in it, not as a dark panel. */
      .mus-back {
        position: absolute; inset: -12%; width: 124%; height: 124%;
        object-fit: cover; filter: blur(18px) saturate(1.05) brightness(0.95);
        opacity: 0.5;
      }
      /* A veil of light, not of ink — the title keeps its own gradient below. */
      .mus-scrim {
        position: absolute; inset: 0;
        background: linear-gradient(rgba(255,255,255,0.10), rgba(255,255,255,0.03));
      }
      .mc-music.mus-flat { background: rgba(255,255,255,0.055); }
      @keyframes lib-flash {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.25; }
      }
      .lib-flash { animation: lib-flash 1.12s ease-in-out 2; }

      .mus-cover {
        position: relative; width: 86%; aspect-ratio: 1; object-fit: cover;
        border-radius: 4px; box-shadow: 0 8px 22px rgba(0,0,0,0.55);
        margin-bottom: 8%;
      }
      .mus-cover-ph {
        display: flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,0.10); font-size: 30px; font-weight: 700;
        color: rgba(255,255,255,0.55);
      }

      /* ── Artist modal ─────────────────────────────────────────────── */
      /* .popup-body pins overflow hidden for the film popup's dragged sheet, so
         this one has to say otherwise or the discography is simply cut off. */
      /* The body must not clip: the portrait hangs up over the backdrop, and a
         scroll container would slice its top off. So the scrolling moves to the
         discography, which is the part that actually needs it. */
      .popup-body.mus-modal-body {
        display: flex; flex-direction: column; gap: 12px;
        padding: 0 18px 18px; overflow: visible !important; min-height: 0;
      }
      /* The header is the film popup's: poster left, title, a quiet facts line
         with the score beside it, description under. Same classes, so it picks
         up the same type and spacing rather than approximating them. */
      .popup-content.mus-content {
        padding-top: 0; overflow: visible !important; flex: 0 0 auto;
      }
      .popup-poster.mus-poster {
        align-self: flex-start; width: 135px; height: 135px;
        margin-top: -62px;   /* rides up over the wide backdrop */
      }
      .popup-poster.mus-poster.mus-cover-ph {
        display: flex; align-items: center; justify-content: center;
        border-radius: 10px; font-size: 34px;
      }
      /* Two lines is what leaves both rows of covers on screen; the grabber
         below the header opens it up when someone wants to read it. */
      .mus-overview {
        max-height: 34px; overflow: hidden; margin-bottom: 0;
      }
      .mus-desc-grab { margin: 2px 0 0; }
      .mus-mon { flex-shrink: 0; cursor: default; }
      /* A definite height, at every width. Without one the flex column has
         nothing to divide, so the sources panel sized itself to its content and
         ran past the bottom of the glass — the rule that pins 85vh above 1400px
         keys off the film popup's own body classes, which this modal does not
         carry. */
      .popup-glass:has(.mus-modal-body) { height: 85vh; }
      /* Desktop: the same footprint as the film and series popup — its 800px
         width, and the height its backdrop, details and trailer add up to.
         Three classes, so neither .is-wide nor the 85vh rule above wins. */
      @media (min-width: 1401px) {
        .popup-glass.is-wide:has(.mus-modal-body) { width: min(800px, 90vw); height: min(660px, 85vh); }
      }
      /* Rises from the bottom edge, the same entrance the film popup's sources
         sheet makes, and is dragged by the same grabber. */
      .popup-body > .sn-is-section.mus-search {
        position: absolute; left: 0; right: 0; bottom: 0; top: auto; z-index: 5;
        display: flex; flex-direction: column; min-height: 0; max-height: none;
        padding: 0 18px 0;
        background: var(--is-glass-bg); backdrop-filter: var(--is-glass-blur);
        -webkit-backdrop-filter: var(--is-glass-blur);
        border-top: 1px solid var(--is-divider);
        overflow: hidden;
      }
      .mus-search.mus-rise { animation: pp-panel-rise 0.22s cubic-bezier(.25,.46,.45,.94); }
      /* The way back out: the sheet drops the way it rose, and the discography
         it was covering comes back once it has gone. */
      .mus-search.mus-fall { animation: pp-panel-fall 0.2s cubic-bezier(.55,.06,.68,.19) forwards; pointer-events: none; }
      @keyframes pp-panel-fall {
        from { transform: translateY(0); opacity: 1; }
        to   { transform: translateY(60px); opacity: 0; }
      }
      .mus-search .sn-seasons-rows { flex: 1; min-height: 0; overflow-y: auto; }
      .mus-albums { flex: 1; min-height: 0; overflow: hidden; }
      /* Dragged or measured to a height of its own: as a flex item with flex:1
         the height was ignored, which is why the grabber did nothing on a phone
         and the covers spilled past the modal. */
      .mus-albums.is-sized { flex: 0 0 auto; overflow: hidden; }
      /* One album's tracks fill what the header leaves, and scroll on their own. */
      .alb-tracks { flex: 1; min-height: 0; overflow-y: auto; padding-bottom: 4px; }
      .alb-tracks .sn-episodes { margin: 0; }
      /* The discography is a sheet at the bottom of the modal at every width.
         In the flow — which is what a phone had — it grew downwards instead,
         so dragging the grabber pushed the covers off the bottom edge while the
         grabber itself stayed where it was. */
      .popup-body > .mus-albums {
        position: absolute; left: 0; right: 0; bottom: 0; top: auto; z-index: 4;
        flex: 0 0 auto; display: flex; flex-direction: column; min-height: 0;
        padding: 0 18px 18px; height: 46%;
        background: var(--is-glass-bg); backdrop-filter: var(--is-glass-blur);
        -webkit-backdrop-filter: var(--is-glass-blur);
        border-top: 1px solid var(--is-divider);
      }
      /* Above the covers and never squeezed out of the sheet: with a row over
         it there was nothing left to grab. */
      .mus-alb-grab { margin: 2px 0 6px; flex: 0 0 auto; position: relative; z-index: 2; }
      .popup-body > .mus-albums .mus-alb-wrap { overflow: hidden; }
      .popup-body > .mus-albums .mus-alb-wrap { flex: 1; min-height: 0; }
      /* Dragging the sheet must not scroll the modal underneath. */
      .pp-grab, .mus-alb-grab { touch-action: none; }
      /* The chevron slots reach into the body's own padding, so the first cover
         sits at the same x as the portrait above it. */
      .mus-alb-wrap {
        display: flex; align-items: center; gap: 0;
        min-width: 0;
      }
      .mus-pg { flex: 0 0 16px; width: 16px; padding: 0; font-size: 20px; }
      /* A thumb needs more than sixteen pixels; the covers give the width back
         by dropping to two per row on a phone anyway. */
      @media (max-width: 600px) {
        .mus-pg { flex: 0 0 26px; width: 26px; font-size: 26px; }
        .popup-body > .mus-albums { padding: 0 12px 12px; }
        .mus-alb-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      }
      .mus-alb-grid {
        flex: 1; min-width: 0;
        display: grid; gap: 12px;
        grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
      }
      /* Tablet: the film popup's width, and four covers a row whatever that
         works out to — at 90vw of a portrait tablet auto-fill only found room
         for three. Two classes, so the base rule above cannot win back. */
      @media (min-width: 601px) and (max-width: 1400px) {
        .popup-glass.is-wide:has(.mus-modal-body) { width: min(800px, 90vw); }
        .popup-body .mus-alb-grid { grid-template-columns: repeat(var(--mus-alb-cols, 4), 1fr); }
      }
      .mus-alb { min-width: 0; cursor: pointer; }
      .mus-alb-art {
        position: relative; width: 100%; aspect-ratio: 1; border-radius: 7px;
        overflow: hidden; background: rgba(255,255,255,0.07);
      }
      .mus-alb-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
      /* Sits under the cover, so the image itself hides it the moment it paints
         — the class is only there for the tiles whose image never arrives. */
      .mus-alb-spin {
        position: absolute; top: 50%; left: 50%; margin: -9px 0 0 -9px;
        width: 18px; height: 18px; border-width: 2px;
      }
      .mus-alb-art.art-done .mus-alb-spin { display: none; }
      .mus-alb-badge { position: absolute; top: 4px; right: 4px; }
      /* The caption sits on the cover, as a poster's does, rather than below it —
         the year above the title so the eye lands on the name last. */
      .mus-alb-cap {
        position: absolute; left: 0; right: 0; bottom: 0; z-index: 1;
        padding: 28px 6px 6px; pointer-events: none;
        background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 80%);
      }
      .mus-alb-rating { display: inline-flex; margin-bottom: 4px; }
      .mus-alb-year {
        font-size: 9px; font-weight: 600; letter-spacing: 0.04em;
        color: rgba(255,255,255,0.62);
      }
      .mus-alb-title {
        font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.96);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      @container mc (max-width: 105px) {
        .media-type-tag .b-txt { display: none; }
        .badge .b-txt { display: none; }
      }

      .mc-cover {
        width: 100%; height: 80px;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }

      .mc-cover-lg { display: none; }
      .media-type-tag {
        position: absolute; top: 6px; left: 6px; z-index: 2;
        background: rgba(0,0,0,0.62);
        backdrop-filter: blur(4px);
        color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.92);
        font-size: 10px; font-weight: 800; line-height: 1;
        padding: 2px 6px; border-radius: 4px;
        letter-spacing: 0.05em;
        display: inline-flex; align-items: center;
        border: 1px solid transparent;
        pointer-events: none;
      }


      .mc-info { display: none; }

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
      .trending-overlay { display: flex; flex-direction: column; flex: 1; position: relative; margin-left: -15px; margin-right: -15px; padding-left: 15px; padding-right: 15px; margin-top: -10px; padding-top: 10px; }

      .to-close {
        width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.65); font-size: 12px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .to-close:hover { background: rgba(255,255,255,0.16); color: #fff; }

      .smp-hdr-btn {
        width: 24px; height: 24px; border-radius: 50%; cursor: pointer;
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.65);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0; transition: background 0.15s, color 0.15s;
      }
      .smp-hdr-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }

      .to-grid {
        flex: 1; min-width: 0; position: relative;
        display: grid; grid-template-columns: repeat(4, 1fr);
        column-gap: 7px; row-gap: 7px; align-content: start;
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
      .b-ep      { background:rgba(10,132,255,0.45); border:1px solid rgba(10,132,255,0.70); }
      .b-audio   { background:rgba(10,132,255,0.26); border:1px solid rgba(10,132,255,0.55); }
      /* Neutral: quality is a fact about the file, not a state to react to, so
         it stays out of the green/blue/red vocabulary the status badges use. */
      .b-quality { background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.30); }
      .popup-day .b-quality { background:rgba(0,0,0,0.10); border-color:rgba(0,0,0,0.22); }
      .b-partial { background:rgba(255,69,58,0.30);   border:1px solid rgba(255,69,58,0.62); }
      .b-sno     { background:rgba(255,149,0,0.26);  border:1px solid rgba(255,149,0,0.55); }
      .b-sub-miss{ background:rgba(255,149,0,0.28);  border:1px solid rgba(255,149,0,0.58); }
      .b-missing { background:rgba(255,69,58,0.30);  border:1px solid rgba(255,69,58,0.62); }
      .b-cutoff  { background:rgba(255,214,10,0.28); border:1px solid rgba(255,214,10,0.62); }
      .b-tag     { background:rgba(175,82,222,0.26); border:1px solid rgba(175,82,222,0.55); }

      /* ── Upcoming action row ── */
      .mc-act {
        display: flex; align-items: center; gap: 4px; margin-top: 3px;
        flex-wrap: nowrap; overflow: hidden;
      }

      /* Combined rating + language strip. Sizes are variables so container
         queries can rescale the flags in step with the rating badge. */
      .fl-strip {
        --fl-h: 16px;
        /* A flag is a solid rectangle while the badge is a pill with 2px of
           padding around 10px of text — matched box for box, the flag reads as
           the taller of the two. It follows the badge's text instead. */
        --fl-fh: calc(var(--fl-h) - 1px);
        /* --fl-ratio and --fl-aspect are measured from the live emoji font at
           runtime; the fallbacks are Apple Color Emoji's numbers. */
        --fl-fs: calc(var(--fl-fh) / var(--fl-ratio, 0.72));
        --fl-w: calc(var(--fl-fh) * var(--fl-aspect, 1.5));
        --fl-ov: calc(var(--fl-w) * 0.22);
        display: inline-flex; align-items: center;
        height: var(--fl-h); margin-bottom: 3px;
      }
      .fl-flag {
        position: relative;
        width: var(--fl-w); height: var(--fl-fh);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        font-size: var(--fl-fs); line-height: 1;
      }
      .fl-tuck { margin-left: calc(-1 * var(--fl-ov)); }
      /* Each flag casts onto the one behind it, which is what makes the stack
         read as layered rather than as a single striped block. */
      .fl-l { filter: drop-shadow(-3px 0 3px rgba(0,0,0,0.95)); }
      .fl-r { filter: drop-shadow(3px 0 3px rgba(0,0,0,0.95)); }
      /* Frontmost in the stack, so it casts onto the flag group on either side.
         box-shadow rather than drop-shadow or side strips: it follows the
         badge's rounded corners, and a spread equal to the blur cancels the
         vertical reach so nothing smudges the poster above or below. */
      .fl-badge { display: flex; position: relative; z-index: 100; }
      /* Reach sideways is offset + spread + blur/2; vertical bleed is
         spread + blur/2. Holding spread at -(blur/2) zeroes the vertical while
         leaving the offset as the full horizontal reach. */
      .fl-badge.fl-sh-l .imdb { box-shadow: -5px 0 8px -4px rgba(0,0,0,0.75); }
      .fl-badge.fl-sh-r .imdb { box-shadow: 5px 0 8px -4px rgba(0,0,0,0.75); }
      .fl-badge.fl-sh-l.fl-sh-r .imdb {
        box-shadow: -5px 0 8px -4px rgba(0,0,0,0.75),
                     5px 0 8px -4px rgba(0,0,0,0.75);
      }
      /* Group labels, laid over the outermost flag on each side. The heavy
         shadow is what keeps a white glyph readable on any flag underneath. */
      .fl-ico-ov {
        position: absolute; top: 0; bottom: 0;
        width: calc(var(--fl-w) - var(--fl-ov));
        display: flex; align-items: center; justify-content: center;
        pointer-events: none;
      }
      .fl-ico-l { left: 0; }
      .fl-ico-r { right: 0; }
      .fl-ico {
        width: 10px; height: 10px;
        flex-shrink: 0; color: #fff; opacity: 0.7;
        filter: drop-shadow(0 0 2px rgba(0,0,0,0.95)) drop-shadow(0 1px 1px rgba(0,0,0,0.85));
      }
      /* Sits past the last audio flag rather than over it */
      .fl-ico-end {
        display: flex; align-items: center;
        flex-shrink: 0; margin-left: 3px;
      }
      .fl-ico-end .fl-ico { width: 9px; height: 9px; opacity: 0.5; transform: scaleX(-1); }
      /* Drawn flags fill their box exactly, so the strip no longer depends on
         the emoji font's metrics — only the fallback glyph still does. */
      .fl-svg {
        width: 100%; height: 100%;
        display: block;
        /* overflow:hidden is what makes the radius clip an inline <svg> —
           border-radius alone only rounds the border box. */
        border-radius: 3px; overflow: hidden;
        box-shadow: inset 0 0 0 0.5px rgba(0,0,0,0.35);
      }
      /* Drawn flags are squashed narrower than their native 4:3 so more of
         them fit; the measured aspect only applies to the fallback glyph. */
      .fl-strip:has(.fl-svg) { --fl-aspect: 0.85; }
      @container mc (max-width: 94px) {
        .fl-ico { width: 9px; height: 9px; }
      }

      .imdb {
        display: inline-flex; align-items: center; gap: 2px;
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
        width: 28px; height: 28px; padding: 0;
        border-radius: 50%; border: 1px solid rgba(var(--accent-rgb),0.50);
        cursor: pointer; flex-shrink: 0; margin-left: auto;
        display: flex; align-items: center; justify-content: center;
        line-height: 0;
        backdrop-filter: blur(8px);
      }

      .btn-add:hover { background: rgba(var(--accent-rgb),0.45); }

      /* ── Status badges v mc-act (stejný styl jako .badge v knihovně) ── */
      .b-st-avail   { background: rgba(48,209,88,0.30);  border: 1px solid rgba(48,209,88,0.62); }
      .b-continuing { background: rgba(10,132,255,0.30); border: 1px solid rgba(10,132,255,0.62); }
      .b-st-pend    { background: rgba(255,149,0,0.30);  border: 1px solid rgba(255,149,0,0.62); }
      .b-st-proc    { background: rgba(10,132,255,0.30); border: 1px solid rgba(10,132,255,0.62); }
      .mc-act .badge { margin-left: auto; flex-shrink: 0; }
      .req-withdraw {
        -webkit-appearance: none; appearance: none;
        background: rgba(255,69,58,0.28); color: rgba(var(--arr-tp-rgb, 255, 255, 255), 1);
        width: 28px; height: 28px; padding: 0; margin: 0;
        border-radius: 50%; border: 1px solid rgba(255,69,58,0.50);
        cursor: pointer; flex-shrink: 0; margin-left: auto;
        display: grid; place-items: center;
        line-height: 0; box-sizing: border-box; text-indent: 0;
        backdrop-filter: blur(8px);
      }
      .req-withdraw svg { width: 14px; height: 14px; }
      .req-withdraw:hover { background: rgba(255,69,58,0.45); }
      .mc-act-right { margin-left: auto; display: inline-flex; align-items: center; gap: 2px; }

      /* ── Adaptivní layout chipů — container queries ──
         Priorita: 1. zmenšit padding  2. schovat datum
      */
      /* .badge-compact se přidá JavaScriptem pokud badge řádek přetéká */
      .badge-compact .b-txt { display: none; }
      @container mc (max-width: 94px) {
        .imdb { padding: 2px 3px; font-size: 9px; }
        .btn-add { width: 22px; height: 22px; }
        /* .imdb loses 1px of height here, so the flags have to follow or they
           end up taller than the badge they sit next to. */
        .fl-strip { --fl-h: 15px; }
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
        display: flex; align-items: stretch; justify-content: center;
        animation: fade-in 0.15s ease;
      }
      .req-inner {
        display: flex; flex-direction: column; justify-content: space-between;
        padding: 8px 8px 7px; width: 100%; min-width: 0;
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
      .req-panel .mt-fsel { width: 100%; height: 30px; }
      .req-actions {
        display: flex; gap: 5px;
      }
      .req-cancel {
        flex: 1; background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.10); border-radius: 999px;
        color: var(--is-text, #fff); font-size: 11px; font-weight: 600;
        height: 30px; padding: 0 14px; cursor: pointer; outline: none;
      }
      .req-cancel:hover { background: rgba(255,255,255,0.12); }
      .req-confirm {
        flex: 2; background: rgba(var(--accent-rgb),0.22);
        border: 1px solid rgba(var(--accent-rgb),0.45); border-radius: 999px;
        color: #fff; font-size: 11px; font-weight: 600;
        height: 30px; padding: 0 14px; cursor: pointer; outline: none;
        display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      }
      .req-confirm:hover { background: rgba(var(--accent-rgb),0.52); }
      .req-confirm:disabled, .req-cancel:disabled { opacity: 0.5; cursor: default; }
      /* ── Tab bar ── */
      /* Same capsule-with-a-filled-pill shape as the modal navs */
      .req-tabs {
        position: relative;
        /* One knob for the capsule's inset — the sliding fill reads it too, so the
           gap above and below the active pill always matches the one on its left. */
        --req-tab-pad: 3px;
        display: flex; gap: 0; margin-bottom: 1px; padding: var(--req-tab-pad);
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10);
        border-radius: 999px;
      }
      .req-tab {
        position: relative; z-index: 1;
        flex: 1; font-size: 11px; font-weight: 600;
        letter-spacing: 0.01em; height: 26px; padding: 0 10px;
        background: transparent; border: none;
        border-radius: 999px; color: var(--is-text-sec, rgba(255,255,255,0.55)); cursor: pointer;
        transition: background 0.16s, color 0.16s;
      }
      /* The sliding fill is the background — the button itself stays transparent */
      .req-tab.req-tab--active { background: transparent; color: #fff; }
      .req-tabs > .mt-nav-ind {
        --nav-accent: rgba(var(--accent-rgb),0.45);
        top: var(--req-tab-pad); bottom: var(--req-tab-pad);
      }
      .req-tab:not(.req-tab--active):hover { color: var(--is-text, #fff); background: rgba(255,255,255,0.07); }
      /* ── Tab panels ── */
      .req-panels-wrap { flex: 1; display: flex; flex-direction: column; padding: 5px 0; min-width: 0; }
      .req-panel { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
      .req-panel--hidden { display: none; }
      @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

      /* ── Trakt side overlays (Seen / Not interested) ── */
      .trakt-seen-ol, .trakt-ni-ol {
        position: absolute; top: 50%; transform: translateY(-50%);
        z-index: 2; display: flex; align-items: center; justify-content: center;
        cursor: pointer; padding: 8px 7px;
        background: rgba(0,0,0,0.15);
        border: 1px solid rgba(255,255,255,0.08);
        transition: background 0.15s;
      }
      .trakt-seen-ol {
        left: 0; border-radius: 0 6px 6px 0; border-left: none;
        transition: top 0.26s cubic-bezier(0.34,1.3,0.64,1),
                    bottom 0.26s cubic-bezier(0.34,1.3,0.64,1),
                    transform 0.26s cubic-bezier(0.34,1.3,0.64,1),
                    background 0.2s, width 0.2s, padding 0.2s;
      }
      .trakt-ni-ol   { right: 0; border-radius: 6px 0 0 6px; border-right: none; }
      .trakt-seen-ol:not(.trakt-rating-open):hover, .trakt-ni-ol:hover { background: rgba(0,0,0,0.45); }
      .trakt-seen-ol span, .trakt-ni-ol span {
        font-size: 9px; font-weight: 800; text-transform: uppercase;
        color: rgba(255,255,255,0.8); transition: color 0.15s;
        user-select: none; text-align: center; line-height: 1.4;
      }
      .trakt-seen-ol:hover span, .trakt-ni-ol:hover span { color: rgba(255,255,255,1); }

      /* Expanded rating state */
      .trakt-seen-ol.trakt-rating-open {
        top: 19% !important; transform: none !important;
        height: auto !important;
        flex-direction: column; justify-content: center; gap: 5px;
        padding: 8px 7px 10px; background: rgba(0,0,0,0.6);
        border-radius: 0 8px 8px 0; cursor: default;
      }
      .trakt-star-wrap {
        display: flex; flex-direction: column; align-items: center; gap: 5px; width: 100%;
      }
      .trakt-star {
        font-size: 20px; line-height: 1; cursor: pointer;
        color: rgba(255,255,255,0.55); transition: color 0.12s, transform 0.12s;
        user-select: none; text-align: center;
        animation: trakt-star-in 0.18s ease both;
      }
      .trakt-star:hover { color: #FFD700; transform: scale(1.3); }
      .trakt-heart {
        font-size: 19px; line-height: 1; cursor: pointer; margin-top: 2px;
        color: rgba(255,255,255,0.45); transition: color 0.12s, transform 0.12s;
        user-select: none; text-align: center;
        animation: trakt-star-in 0.18s ease both;
      }
      .trakt-heart:hover { color: #ff4466; transform: scale(1.3); }
      @keyframes trakt-star-in {
        from { opacity: 0; transform: scale(0.3); }
        to   { opacity: 1; transform: scale(1); }
      }

      @media (max-width: 480px) {
        .trakt-seen-ol.trakt-rating-open { padding: 8px 8px; }
        .trakt-star  { font-size: 13px !important; }
        .trakt-heart { font-size: 12px !important; }
        .trakt-star-wrap { gap: 2px; }
      }

      /* Confetti / fireworks particles */
      .trakt-confetti-p {
        position: absolute; pointer-events: none; z-index: 20;
        border-radius: 1px; opacity: 1; will-change: transform, opacity;
      }

      @keyframes stripe-pulse {
        0%, 100% { opacity: 0.5; }
        50%      { opacity: 1; }
      }

      @keyframes trakt-pulse {
        0%, 100% { opacity: 0.5; }
        50%      { opacity: 1; }
      }

      @keyframes trakt-card-in {
        from { opacity: 0; transform: translateY(8px) scale(0.94); }
        to   { opacity: 1; transform: translateY(0)   scale(1); }
      }
      .trakt-animate .mc {
        animation: trakt-card-in 0.28s ease both;
      }
      .trakt-animate .mc:nth-child(1)  { animation-delay: 0ms; }
      .trakt-animate .mc:nth-child(2)  { animation-delay: 35ms; }
      .trakt-animate .mc:nth-child(3)  { animation-delay: 70ms; }
      .trakt-animate .mc:nth-child(4)  { animation-delay: 105ms; }
      .trakt-animate .mc:nth-child(5)  { animation-delay: 140ms; }
      .trakt-animate .mc:nth-child(6)  { animation-delay: 175ms; }
      .trakt-animate .mc:nth-child(7)  { animation-delay: 210ms; }
      .trakt-animate .mc:nth-child(8)  { animation-delay: 245ms; }

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
        display: flex; gap: 10px; margin-top: 1px; justify-content: center;
      }
      .pr-approve, .pr-decline {
        -webkit-appearance: none; appearance: none;
        width: 28px; height: 28px; padding: 0; margin: 0;
        border-radius: 50%; cursor: pointer; color: #fff;
        display: grid; place-items: center;
        line-height: 0; box-sizing: border-box;
        backdrop-filter: blur(8px); flex-shrink: 0;
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
      .pr-user-tag { background: rgba(147,51,234,0.30); border: 1px solid rgba(147,51,234,0.62); }
      .pr-tags-col {
        position: absolute; top: 6px; left: 6px; z-index: 2;
        display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
        pointer-events: none; max-height: calc(100% - 80px); overflow: hidden;
      }
      .pr-tags-col .pr-user-tag:nth-child(n+7) { display: none; }
      @container mc (min-width: 160px) {
        .pr-tags-col .pr-user-tag:nth-child(n+7) { display: inline-flex; }
        .pr-tags-col .pr-user-tag:nth-child(n+17) { display: none; }
      }
      .pr-approve svg, .pr-decline svg { width: 14px; height: 14px; }

      /* The overlay belongs to the poster row, not the whole section — anchor it
         to a wrapper around the grid so it never covers the section header. */
      .tv-req-anchor { position: relative; }
      .search-results-wrap .tv-req-anchor > .req-overlay {
        bottom: auto; right: auto; height: calc(50% - 5px); max-width: 100%;
      }

      /* In See More the overlay is a grid item on its card's row, so it takes
         the row's own box instead of being placed over it. */
      .mus-add-row { position: relative; z-index: 10; min-width: 0; }
      .mus-add-row > .req-overlay { position: absolute; inset: 0; }

      /* Which feed put this tile in the row. Bottom-left is the one corner the
         status badge, the rating and the add button all leave alone. */
      /* The transport under the artist line: same controls as the stream popup,
         one size down so the header keeps its proportions. */
      /* Sits in the subtitle line before the rating, so the two read as one
         strip rather than a chip parked on its own row. */
      .mus-origin-chip { align-self: center; }

      .mus-stream-bar { margin: 6px 0 2px; max-width: 320px; }
      .mus-stream-bar .popup-ctrl-btn { width: 32px; height: 32px; }
      .mus-stream-bar .popup-ctrl-btn-main { width: 38px; height: 38px; }

      .rec-src-badge {
        position: absolute; top: 6px; right: 6px; z-index: 4;
        display: flex; align-items: center; justify-content: center;
        pointer-events: none;
        /* A shadow rather than a plate: the mark stays readable on a light
           poster without adding another chip to the corner. */
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.65));
      }
      .rec-src-badge img, .rec-src-badge svg { width: 16px; height: 16px; display: block; }

      .mus-add-done {
        align-self: center; margin-right: 8px;
        font-size: 11px; font-weight: 700; color: #4ade80; white-space: nowrap;
      }
      .req-confirm.mus-add-confirm.is-done {
        background: rgba(74,222,128,0.22); color: #4ade80;
      }
      .mus-add-panel {
        display: flex; flex-direction: column; gap: 8px;
        min-height: 0; min-width: 0; overflow: hidden;
      }
      .mus-add-field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
      .mus-add-field .mt-fsel { max-width: 100%; }
      .req-overlay.mus-add-overlay { overflow: hidden; }
      .mus-add-overlay .tv-req-inner {
        grid-template-columns: minmax(0, 1fr) minmax(0, 2.4fr);
        grid-template-rows: 1fr;
      }
      .mus-add-overlay .tv-req-col-poster { grid-column: 1; grid-row: 1; }
      .mus-add-overlay .tv-req-controls { grid-column: 2; grid-row: 1; min-width: 0; }
      .tv-req-overlay { align-items: stretch; padding: 0; }
      .tv-req-inner {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: 1fr auto;
        gap: 6px; padding: 6px; width: 100%;
      }
      /* The overlay only owns the poster row (a single card for movies), so the
         capsule controls run a few px shorter here than in the modals. */
      .req-overlay .req-tabs { --req-tab-pad: 2px; }
      .req-overlay .req-tab { height: 22px; font-size: 10px; }
      .req-overlay .req-panel .mt-fsel { height: 26px; }
      /* Icon-only round buttons, same family as the modals' save/cancel */
      .req-overlay .req-cancel,
      .req-overlay .req-confirm {
        flex: 0 0 auto; width: 28px; height: 28px; padding: 0;
        border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
      }
      .req-actions { justify-content: flex-end; gap: 6px; }
      /* Col 1, rows 1-2: poster */
      .tv-req-col-poster {
        grid-column: 1; grid-row: 1 / 3; min-height: 0;
      }
      .tv-req-poster {
        width: 100%; height: 100%; object-fit: cover;
        border-radius: 6px; display: block; min-height: 80px;
      }
      .tv-req-poster-ph {
        width: 100%; height: 100%; min-height: 80px; border-radius: 6px;
        background: rgba(255,255,255,0.08); display: flex;
        align-items: center; justify-content: center; font-size: 28px;
      }
      /* Col 2-4: tabs + dropdown + seasons stacked, buttons inside at bottom-right */
      .tv-req-controls {
        grid-column: 2 / 5; grid-row: 1 / 3;
        display: flex; flex-direction: column; gap: 4px; min-width: 0;
      }
      .tv-req-title {
        font-size: 11px; font-weight: 700; color: #fff;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .tv-req-seasons {
        display: flex; flex-direction: column; gap: 4px; min-width: 0;
      }
      /* Actions: inside tv-req-controls, pushed to bottom-right, width = 1 poster column */
      .tv-req-actions-col {
        margin-top: auto; align-self: flex-end;
        display: flex; flex-direction: row;
      }
      .tv-req-actions-col .req-actions {
        display: flex; flex-direction: row; gap: 6px;
      }

      /* Desktop: mob title hidden, desk title visible */
      .tv-req-mob-title  { display: none; }
      .tv-req-desk-title { display: block; }
      /* Desktop: row2 wrapper transparent — děti se účastní gridu přímo */
      .tv-req-row2 { display: contents; }

      /* Mobile: TV overlay — flex column, vše full width */
      @media (max-width: 600px) {
        .tv-req-mob-title  { display: none; }
        .tv-req-desk-title { display: block; }
        .tv-req-row2       { display: contents; }
        .tv-req-inner {
          display: flex; flex-direction: column;
          gap: 6px; padding: 8px; height: 100%;
        }
        .tv-req-col-poster  { display: none; }
        .tv-req-controls    { width: 100%; flex: 1; min-height: 0; }
        .tv-req-seasons     { width: 100%; }
        .tv-req-actions-col {
          width: 100%; margin-top: auto;
          display: flex; flex-direction: row; align-items: center;
        }
        .tv-req-actions-col .req-actions { flex: 1; }
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
      .sv-input:checked + .sv-track { background: rgba(0,122,255,0.85); }
      .sv-input:checked + .sv-track .sv-thumb { transform: translateX(12px); }
      .sv-lbl { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.65); }

      /* Chevron buttons */
      .sv-chev {
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10);
        border-radius: 50%; color: #fff; cursor: pointer;
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
        color: var(--is-text);
        --is-blue:       #0a84ff;
        --is-green:      #30d158;
        --is-red:        #ff453a;
        --is-orange:     #ff9500;
        --is-purple:     #bf5af2;
        --is-overlay-bg: var(--overlay-bg, rgba(0,0,0,0.72));
        --is-glass-bg:   var(--popup-bg, rgba(10,10,22,0.88));
        --is-glass-bdr:  rgba(255,255,255,0.25);
        --is-glass-blur: blur(35px) saturate(100%);
        --is-shine:      linear-gradient(120deg,rgba(255,255,255,0.55),rgba(255,255,255,0.15) 25%,rgba(255,255,255,0.05) 50%,transparent 70%);
        --is-shine-op:   0.35;
        --is-text:       rgba(255,255,255,1);
        --is-text-sec:   rgba(255,255,255,0.64);
        --is-text-body:  rgba(255,255,255,0.78);
        --is-text-muted: rgba(255,255,255,0.46);
        --is-text-label: rgba(255,255,255,0.42);
        --is-divider:    rgba(255,255,255,0.10);
        --is-row-hover:  rgba(255,255,255,0.04);
        --is-hdr-bg:     rgba(10,12,22,0.80);
        --is-menu-bg:    #18182a;
        --is-hdr-blur:   blur(20px);
        --is-btn-bg:     rgba(255,255,255,0.08);
        --is-btn-bdr:    rgba(255,255,255,0.18);
        --is-btn-clr:    rgba(255,255,255,0.70);
        --is-btn-hbg:    rgba(255,255,255,0.15);
        --is-btn-hclr:   #fff;
        --is-btn-abg:    rgba(10,132,255,0.18);
        --is-btn-abdr:   rgba(10,132,255,0.40);
        --is-btn-aclr:   rgba(100,180,255,0.95);
        --is-fade-btm:   rgba(10,10,18,0.94);
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
        --is-glass-bg:   rgba(235,238,245,0.55);
        --is-glass-bdr:  rgba(255,255,255,0.90);
        --is-glass-blur: blur(40px) saturate(200%);
        --is-shine:      linear-gradient(120deg,rgba(255,255,255,0.95),rgba(255,255,255,0.50) 25%,rgba(255,255,255,0.15) 50%,transparent 70%);
        --is-shine-op:   0.65;
        --is-text:       rgba(0,0,0,0.88);
        --is-text-sec:   rgba(0,0,0,0.58);
        --is-text-body:  rgba(0,0,0,0.70);
        --is-text-muted: rgba(0,0,0,0.50);
        --is-text-label: rgba(0,0,0,0.46);
        --is-divider:    rgba(0,0,0,0.08);
        --is-row-hover:  rgba(0,0,0,0.03);
        --is-hdr-bg:     rgba(240,242,255,0.82);
        --is-menu-bg:    rgba(245,246,255,0.99);
        --is-hdr-blur:   blur(20px);
        --is-btn-bg:     rgba(0,0,0,0.05);
        --is-btn-bdr:    rgba(0,0,0,0.12);
        --is-btn-clr:    rgba(0,0,0,0.55);
        --is-btn-hbg:    rgba(0,0,0,0.09);
        --is-btn-hclr:   rgba(0,0,0,0.88);
        --is-btn-abg:    rgba(10,132,255,0.12);
        --is-btn-abdr:   rgba(10,132,255,0.35);
        --is-btn-aclr:   rgba(0,100,220,0.90);
        --is-fade-btm:   rgba(255,255,255,0.68);
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
      /* Extra-wide modal pro Tautulli statistics — pevná výška eliminuje skok při přepínání tabů */
      .popup-glass.tl-wide { width: min(1100px, 96vw); height: 88vh; }
      /* Phones and tablets: a fixed height, so opening a sources panel cannot
         resize the sheet under your finger. The trailer then takes whatever the
         content leaves over — otherwise a grey strip shows under it. */
      @media (max-width: 1400px) {
        .popup-glass { height: 85vh; }
      }
      /* Above that the modal sizes to its content, which is right until a sheet
         opens: the sources panel is positioned absolutely and so contributes no
         height, leaving the whole modal collapsed to a strip. With one open it
         gets the same fixed height the narrower screens use. */
      @media (min-width: 1401px) {
        .popup-glass:has(.popup-body--search),
        .popup-glass:has(.popup-body--sn-is),
        .popup-glass:has(.popup-body--panel) { height: 85vh; }
      }
      /* Tablet: the sheet is a fixed height, so its three bands — backdrop,
         details, trailer — split it evenly instead of the trailer soaking up
         whatever the other two leave behind. */
      @media (min-width: 601px) and (max-width: 1400px) {
        .popup-glass > .popup-backdrop { flex: 0 0 30%; height: 30%; }
        /* The details band grows; the trailer keeps a fixed slice at the very
           bottom, so no grey gap can open up under it. */
        /* !important because the global rule pins this to flex: 0 0 auto for the
           phone's absolutely-positioned sources sheet — here it has to grow, or
           the trailer stops short of the bottom edge. */
        .popup-body > .popup-content {
          flex: 1 1 auto !important; min-height: 0; overflow-y: auto;
        }
        .popup-body > .popup-yt-thumb {
          flex: 0 0 30vh; height: 30vh; min-height: 0; margin-top: auto;
        }
      }
      /* Calendar week modal */
      .cal-modal-glass {
        width: min(1200px, 98vw);
        max-width: 98vw;
        height: 88vh;
        max-height: 88vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .cal-modal-hdr {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 10px 14px;
        min-height: 52px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        flex-shrink: 0;
      }
      .cal-modal-glass .popup-close {
        position: static;
        flex-shrink: 0;
        margin-left: 4px;
        box-shadow: none;
      }
      .cal-week-label {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.03em;
        pointer-events: none;
        white-space: nowrap;
      }
      .cal-nav-btn { padding: 4px 10px; border-radius: 8px; }
      .cal-close-btn { margin-left: 4px; }
      .cal-hdr-btn { padding: 3px 7px; border-radius: 8px; display: flex; align-items: center; background: rgba(255,255,255,0.04); border: 1px solid var(--is-btn-bdr); color: var(--is-btn-clr); backdrop-filter: blur(2px); }
      .cal-hdr-btn:hover { background: rgba(255,255,255,0.1); }
      .cal-modal-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 6px;
        padding: 8px;
        flex: 1;
        overflow: hidden;
        min-height: 0;
      }
      .cal-day-col {
        display: flex;
        flex-direction: column;
        min-width: 0;
        border-radius: 10px;
        background: rgba(255,255,255,0.04);
        overflow: hidden;
      }
      .cal-day-col.cal-day-today { background: rgba(255,255,255,0.04); }
      /* Today uses the same strong blue as an active header tab */
      .cal-day-col.cal-day-today .cal-day-hdr {
        background: rgba(0,122,255,0.5);
        border-bottom-color: rgba(0,122,255,0.8);
      }
      .cal-day-hdr {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 4px 5px;
        flex-shrink: 0;
        /* Tinted strip so the date reads as a header, not floating text */
        background: rgba(255,255,255,0.07);
        border-bottom: 1px solid rgba(255,255,255,0.12);
      }
      .cal-day-name {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.06em;
        opacity: 0.55;
        text-transform: uppercase;
      }
      .cal-day-num {
        font-size: 17px;
        font-weight: 700;
        line-height: 1.2;
        opacity: 0.9;
      }
      .cal-day-num-today { color: #fff; opacity: 1; }
      .cal-day-col.cal-day-today .cal-day-name { opacity: 0.85; color: #fff; }

      /* ── Calendar day mode overrides ── */
      .popup-day .cal-modal-hdr { border-bottom-color: rgba(0,0,0,0.1); }
      .popup-day .cal-week-label { color: rgba(0,0,0,0.85); }
      .popup-day .cal-day-col { background: rgba(0,0,0,0.04); }
      .popup-day .cal-day-col.cal-day-today { background: rgba(0,0,0,0.04); }
      .popup-day .cal-day-col.cal-day-today .cal-day-hdr { background: rgba(0,122,255,0.5); border-bottom-color: rgba(0,122,255,0.8); }
      .popup-day .cal-day-hdr { background: rgba(0,0,0,0.05); border-bottom-color: rgba(0,0,0,0.12); }
      .popup-day .cal-day-name { color: rgba(0,0,0,0.55); }
      .popup-day .cal-day-num { color: rgba(0,0,0,0.85); }
      /* Both need the .popup-day prefix to outrank the two rules above */
      .popup-day .cal-day-num-today { color: #fff; }
      .popup-day .cal-day-col.cal-day-today .cal-day-name { color: #fff; }
      .cal-day-body {
        flex: 1;
        overflow-y: auto;
        padding: 5px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-height: 0;
      }
      .cal-modal-footer {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px 14px;
        flex-shrink: 0;
        gap: 8px;
      }

      /* ── Calendar modal — mobile row layout ── */
      @media (max-width: 700px) {
        #cal-overlay { align-items: flex-end; }
        .cal-modal-glass {
          width: 100%;
          max-width: 100%;
          height: 85vh;
          max-height: 85vh;
          border-radius: 20px 20px 0 0;
          border-bottom: none;
        }
        .cal-modal-glass::before { border-radius: 20px 20px 0 0; }
        .cal-modal-hdr { padding: 10px 12px; }
        .cal-week-label {
          position: static;
          transform: none;
          width: auto;
          text-align: left;
          margin-right: auto;
          font-size: 12px;
          /* In the flow here, so a long label would push the close button off
             the edge — it gives way instead. */
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cal-modal-grid {
          grid-template-columns: 1fr;
          overflow-y: auto;
          overflow-x: hidden;
          gap: 4px;
        }
        .cal-day-col.cal-day-empty { opacity: 0.4; }
        .cal-day-col { flex-direction: row; }
        .cal-day-hdr {
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 38px;
          min-width: 38px;
          flex-shrink: 0;
          border-bottom: none;
          border-right: 1px solid rgba(255,255,255,0.07);
          padding: 8px 4px;
          gap: 4px;
        }
        .popup-day .cal-day-hdr { border-right-color: rgba(0,0,0,0.08); }
        .cal-day-col.cal-day-today .cal-day-hdr { border-right-color: rgba(0,122,255,0.3); }
        .cal-day-name {
          writing-mode: vertical-lr;
          text-orientation: upright;
          font-size: 8px;
          letter-spacing: 1px;
        }
        .cal-day-num { font-size: 13px; }
        .cal-day-body {
          flex-direction: row;
          overflow-x: auto;
          overflow-y: visible;
          scroll-snap-type: x mandatory;
          padding: 6px;
          gap: 6px;
        }
        .cal-day-body .mc {
          width: 80px;
          min-width: 80px;
          height: auto;
          aspect-ratio: 2/3;
          flex-shrink: 0;
          scroll-snap-align: start;
        }
        .cal-day-body .mc .media-type-tag,
        .cal-day-body .mc .badge {
          font-size: 9px;
          padding: 2px 5px;
          border-radius: 3px;
        }
      }
      .cal-nav-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 12px;
        font-size: 12px;
        font-weight: 600;
        border-radius: 8px;
      }

      /* Scrollable body below the backdrop */
      .popup-body {
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      /* Search active — IS panel fills remaining height */
      .popup-body--search { overflow: hidden; }
      .popup-body--search .popup-content { flex-shrink: 0; }
      .popup-body--search .is-panel { flex: 1; max-height: none; min-height: 160px; padding-bottom: 12px; overflow: hidden; }
      .popup-body--search .is-panel .is-results-wrap { overflow: hidden; }
      .popup-body--search .sn-is-panel { min-height: 160px; }
      /* Sonarr IS only — body scrolls so nested episode IS panel is reachable */
      .popup-body--sn-is { overflow-y: auto !important; }

      .popup-close {
        position: absolute;
        top: 12px;
        right: 14px;
        z-index: 10;
        background: var(--accent);
        border: none;
        color: #fff;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(10,132,255,0.45);
        transition: background 0.15s, transform 0.1s;
      }

      .popup-close:hover { background: #0071e3; transform: scale(1.08); }
      /* Stop playback stacks under Plex cast rather than joining the capsule:
         both are playback controls and belong to the same corner. */
      .popup-cast-corner {
        position: absolute; top: 12px; right: 58px; z-index: 10;
        display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
      }
      /* With the capsule and the paging chevron on this edge, Plex cast drops
         below both. */
      .popup-glass:has(.popup-backdrop--cast) .popup-cast-corner,
      .popup-glass:has(.popup-backdrop--bar) .popup-cast-corner { top: 56px; right: 12px; }
      .popup-glass:has(.popup-backdrop--cast) .popup-cast-corner { top: 92px; }
      .popup-close:active { transform: scale(0.94); }

      .popup-backdrop {
        position: relative;
        width: 100%;
        height: 200px;
        background-size: cover;
        background-position: center top;
        flex-shrink: 0;
      }

      /* --sn-is turns the body into a scroller on desktop; on a phone that
         unpins the panel from the bottom, so the drag moved the wrong edge. */
      .popup-body,
      .popup-body--sn-is { overflow: hidden !important; }
      /* The poster row stays a two-column flex; the description is its own
         full-width block below it (rendered outside .popup-meta on mobile). */
      /* The sheet is absolutely positioned now, so the content column no longer
         has to fill the body — growing it only pushed the description to the
         bottom edge. */
      .popup-body .popup-content { flex: 0 0 auto !important; min-height: 0; }
      /* The sheet floats over the content instead of sharing the column with it:
         dragging it must not shove the description and poster around. */
      .popup-body { position: relative; }
      .popup-body > .is-panel,
      .popup-body > .sn-is-panel,
      .popup-body > .sn-is-section {
        position: absolute; left: 0; right: 0; bottom: 0; z-index: 5;
        margin: 0; padding-left: 16px; padding-right: 16px;
        background: var(--is-glass-bg);
        backdrop-filter: var(--is-glass-blur);
        -webkit-backdrop-filter: var(--is-glass-blur);
        border-top: 1px solid var(--is-divider);
      }

      /* With a dragged height the panel has to clip and scroll its own rows —
         otherwise the seasons list forces the height back open and the rows
         below spill past the sheet. */
      .popup-body .is-panel,
      .popup-body .sn-is-panel,
      .popup-body .sn-is-section {
        overflow: hidden; display: flex; flex-direction: column; min-height: 0;
        /* Hard ceiling as well as the JS clamp, so a stale stored height can
           never push the pager past the sheet. */
        max-height: 100%;
      }
      .popup-body .sn-seasons-rows {
        flex: 1; min-height: 0 !important; overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      /* Rows keep their height and scroll out of view — without this the flex
         column squeezes them instead, so dragging only made them thinner. */
      .popup-body .sn-seasons-rows > *,
      .popup-body .sn-season-row,
      .popup-body .sn-episodes > *,
      .popup-body .sn-ep-item,
      .popup-body .is-results-wrap > * { flex-shrink: 0; }
      /* Grabber on the sources panel — drag to trade height with the text */
      .pp-grab {
        flex-shrink: 0; height: 18px; margin: -2px 0 2px;
        display: flex; align-items: center; justify-content: center;
        cursor: grab; touch-action: none;
      }
      .pp-grab > span {
        display: block; width: 38px; height: 4px; border-radius: 2px;
        background: rgba(255,255,255,0.28);
        transition: background 0.15s;
      }
      .pp-grab.is-dragging { cursor: grabbing; }
      /* Held on to: the bar takes the accent. This lived in the phone's own
         block, so on a tablet or a desktop the grabber gave no sign it had been
         picked up. */
      .pp-grab.is-dragging > span { background: rgba(var(--accent-rgb), 0.9); }
      .popup-body .is-results-wrap,
      .popup-body .sn-episodes {
        flex: 1; min-height: 0; overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      /* Entrance: the sheet rises from the bottom edge */
      @keyframes pp-panel-rise {
        from { transform: translateY(60px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      .pp-panel-in { animation: pp-panel-rise 0.28s cubic-bezier(.25,.46,.45,.94); }

      /* Put-away animation when you tap outside the panel */
      .pp-panel-out {
        transition: transform 0.22s ease-in, opacity 0.22s ease-in;
        transform: translateY(40px); opacity: 0;
      }

      /* ── Action bar over the backdrop (phone + tablet) ── */
      .pp-hero-bar {
        /* Top of the backdrop, on the close button's line — the right offset
           clears the close button itself. */
        position: absolute; left: 12px; right: 58px; top: 12px; z-index: 6;
        display: flex; align-items: center; gap: 6px;
      }
      .pp-hero-pill {
        /* Never taller than the close button, and on its line: 36px box with a
           3px inset around the 30px buttons. */
        height: 36px; box-sizing: border-box;
        display: flex; align-items: center; gap: 6px;
        padding: 3px; border-radius: 999px;
        background: rgba(0,0,0,0.55);
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.14);
        min-width: 0; max-width: 100%;
      }
      .pp-hero-pill .is-btn-row,
      .pp-hero-pill .instance-status-row { margin: 0; }
      .pp-hero-pill .instance-status-row { flex-wrap: nowrap; }
      /* Inside the capsule the buttons drop their own frames and read as one
         segmented control — the same shape as the modals' nav. */
      /* Same gap collapsed and expanded, so opening a branch never nudges the
         parent button's box. */
      .pp-hero-pill .is-btn-row { gap: 6px; height: auto; }
      /* Switching branches changes both buttons' width and fill — animate it so
         the capsule reshapes rather than snapping. */
      .pp-hero-pill .is-open-btn,
      .pp-hero-pill .remove-lib-btn,
      .pp-hero-pill .is-collapse-btn {
        transition: background 0.18s ease, color 0.18s ease,
                    width 0.28s cubic-bezier(.25,.46,.45,.94),
                    min-width 0.28s cubic-bezier(.25,.46,.45,.94),
                    padding 0.28s cubic-bezier(.25,.46,.45,.94);
        /* Flex would otherwise squeeze the parent button once its sub-chips
           appear, so the label narrows the moment you open the branch. */
        flex-shrink: 0; white-space: nowrap;
        background: transparent; border-color: transparent;
        /* Tighter inner padding than the body's buttons: inside the capsule the
           glyph should sit as close to the edge as the 4px above and below. */
        height: 30px; padding: 0 10px 0 6px; border-radius: 999px; font-weight: 600;
        /* Matches .mt-nav-btn: full-strength label, 11px, 13px glyph — the muted
           grey made this menu look like a different control. */
        color: var(--is-text, #fff); font-size: 11px; gap: 5px;
      }
      .pp-hero-pill .is-btn-row > .is-open-btn svg,
      .pp-hero-pill > .is-open-btn svg { width: 13px; height: 13px; }
      /* The label and its chevron are one unit — the literal space between them
         in the markup rendered as an uneven gap. */
      .pp-hero-pill .pp-lbl {
        display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;
      }
      .pp-hero-pill .pp-lbl svg { width: 10px; height: 10px; opacity: 0.7; }
      .pp-hero-pill .is-open-btn:hover,
      .pp-hero-pill .remove-lib-btn:hover {
        background: rgba(255,255,255,0.07); border-color: transparent; color: var(--is-text, #fff);
      }
      /* Same fill as the modals' nav indicator — it was running at 0.60 alpha
         and read as a washed-out blue next to them. */
      .pp-hero-pill .is-open-btn.active {
        background: rgba(var(--accent-rgb),0.9); border-color: transparent; color: #fff;
      }
      .pp-hero-pill .is-open-btn.in-lib { background: transparent; border-color: transparent; }
      .pp-hero-pill .remove-confirm-row { gap: 2px; margin: 0; }
      /* Both states of a parent button are pinned to one width, so opening its
         branch can never resize the button you just pressed. */
      /* One geometry for every top-level button in the capsule — .remove-lib-btn
         carries its own 28px height, which left the two buttons uneven. */
      .pp-hero-pill .is-btn-row > button,
      .pp-hero-pill > button {
        height: 30px; box-sizing: border-box; line-height: 1;
        border-width: 1px; border-style: solid;
      }
      /* Pinned width means the label has to be centred, or it hugs the left edge
         once the button is wider than its content. */
      /* Both parents share one width, so the pair reads as a matched set */
      .pp-hero-pill .is-search-btn,
      .pp-hero-pill .is-btn-row > .remove-lib-btn,
      .pp-hero-pill > .remove-lib-btn { min-width: 104px; justify-content: center; }
      .pp-hero-pill .mt-nav-sub-wrap .remove-lib-btn { min-width: 0; }

      /* Sub-chips are quieter than the parent, so the expanded parent still
         reads as the active item. */
      .pp-hero-pill .mt-nav-sub-wrap {
        gap: 2px; margin-left: 2px;
        transition: max-width 0.3s cubic-bezier(.25,.46,.45,.94);
      }
      .pp-hero-pill .mt-nav-sub-wrap.is-open { max-width: 640px; }
      /* Shorter than the parent buttons on purpose — they are subordinate. */
      .pp-hero-pill .mt-nav-sub-wrap .is-open-btn {
        height: 24px; padding: 0 8px 0 6px; font-size: 10px; gap: 4px;
        background: rgba(255,255,255,0.08); border-color: transparent;
        color: var(--is-text, #fff);
        /* Fades in behind the widening track, so the chips do not slide in
           fully drawn before there is room for them. */
        opacity: 0; transition: opacity 0.22s ease 0.1s, background 0.15s;
      }
      .pp-hero-pill .mt-nav-sub-wrap.is-open .is-open-btn { opacity: 0.85; }
      .pp-hero-pill .mt-nav-sub-wrap.is-open .is-open-btn.active { opacity: 1; }
      /* The capsule itself follows the track's width */
      .pp-hero-pill { transition: max-width 0.3s cubic-bezier(.25,.46,.45,.94); }
      .pp-hero-pill .mt-nav-sub-wrap .is-open-btn:hover { opacity: 1; background: rgba(255,255,255,0.16); }
      .pp-hero-pill .mt-nav-sub-wrap .is-open-btn.active {
        opacity: 1; background: rgba(var(--accent-rgb),0.9); color: #fff;
      }
      /* .is-open-btn carries its own top margin for the body layout — inside the
         capsule that pushed the standalone Remove button off the row's baseline. */
      .pp-hero-pill > *,
      .pp-hero-pill .is-open-btn,
      .pp-hero-pill .remove-lib-btn { margin-top: 0; margin-bottom: 0; }
      /* The bar sits on a photograph, so it needs a scrim of its own up top */
      .popup-backdrop--bar::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 96px;
        background: linear-gradient(to bottom, rgba(0,0,0,0.45), transparent);
        pointer-events: none; z-index: 1;
      }
      /* ── Day mode ── the capsule is a light surface with dark labels; the
         active pill keeps the accent fill and its white text. */
      .popup-day .pp-hero-pill {
        background: rgba(255,255,255,0.78);
        border-color: rgba(0,0,0,0.10);
      }
      .popup-day .pp-hero-pill .is-open-btn,
      .popup-day .pp-hero-pill .remove-lib-btn,
      .popup-day .pp-hero-pill .is-collapse-btn { color: var(--is-text); }
      .popup-day .pp-hero-pill .is-open-btn:hover,
      .popup-day .pp-hero-pill .remove-lib-btn:hover { background: rgba(0,0,0,0.07); }
      .popup-day .pp-hero-pill .is-open-btn.active { color: #fff; }
      .popup-day .pp-hero-pill .mt-nav-sub-wrap .is-open-btn { background: rgba(0,0,0,0.06); }
      .popup-day .pp-hero-pill .mt-nav-sub-wrap .is-open-btn:hover { background: rgba(0,0,0,0.12); }
      .popup-day .pp-hero-pill .mt-nav-sub-wrap .is-open-btn.active { color: #fff; }
      .popup-day .pp-hero-pill .mt-nav-sub-wrap .pp-armed-yes { color: rgba(190,30,25,0.95); }
      /* A dark scrim under a light capsule reads as dirt — invert it */
      .popup-day .popup-backdrop--bar::before {
        background: linear-gradient(to bottom, rgba(255,255,255,0.55), transparent);
      }
      .popup-day .popup-cast-arrow { color: var(--is-text); }

      /* No backdrop while a search panel is open — the glass is the anchor then,
         and the coordinates are the same, so the bar does not appear to move. */
      .popup-glass > .pp-hero-bar { z-index: 12; }
      /* No backdrop under the bar — the content clears it on its own: 12px above
         the bar, its 38px, and 12px of air below. */
      .popup-body--bar .popup-content,
      .popup-body--search .popup-content,
      .popup-body--sn-is .popup-content { padding-top: 64px; }
      /* Cast would sit exactly where the bar starts, so it moves under close */
      .popup-backdrop--bar ~ .popup-cast-corner,
      .popup-glass:has(.popup-backdrop--bar) .popup-cast-corner { top: 56px; right: 12px; }
      /* Cast keeps the bar now; its own content starts below it */
      @media (max-width: 600px) {
        /* Two pills don't fit side by side on a phone */
        .pp-hero-bar { flex-direction: column; align-items: flex-start; gap: 5px; right: 52px; }
        .pp-hero-pill { max-width: 100%; overflow-x: auto; scrollbar-width: none; }
        .pp-hero-pill::-webkit-scrollbar { display: none; }
        /* Every millimetre counts here — the third chip was landing under the
           close button's reserved strip with the desktop paddings. */
        .pp-hero-pill .is-btn-row { gap: 4px; }
        /* Collapsed, the glyph carries it — the word appears once the branch is
           open, which is also when there is room for it. */
        /* Nothing collapses any more. All three controls open a dropdown that
           hangs off the glass instead of growing inside the capsule, so there is
           no width to win back — every button keeps its icon and its label. */
        /* Fixed, not minimum: "Remove ›" is wider than "Search", so a floor alone
           still left the pair uneven. */
        /* border-box and a flex basis, or the 13px of padding lands outside the
           84px and Search ends up wider than Remove. */
        .pp-hero-pill .is-search-btn,
        .pp-hero-pill .is-btn-row > .remove-lib-btn,
        .pp-hero-pill > .remove-lib-btn {
          box-sizing: border-box !important;
          flex: 0 0 84px !important;
          width: 84px !important; min-width: 84px !important; max-width: 84px !important;
        }
        /* Instance chips only carry two letters — no reason for them to eat the
           room the Remove glyph needs. */
        /* One width for every sub-chip, whichever branch it belongs to — the
           remove chips carry their own classes and were slipping past this. */
        /* !important because several older per-class rules (.remove-lib-btn,
           .is-open-btn) still set width, padding and height further down. */
        .pp-hero-pill .mt-nav-sub-wrap > button {
          padding: 0 6px !important; gap: 0 !important; justify-content: center !important;
          width: 82px !important; min-width: 82px !important; max-width: 82px !important;
          box-sizing: border-box !important;
          font-size: 9px !important; height: 22px !important;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        /* The parent's glyph already says which branch this is — the sub-chips
           can drop theirs and give the room back to the label. */
        .pp-hero-pill .mt-nav-sub-wrap .is-open-btn svg { display: none; }
        /* Except the delete confirmation, which is a tick and a cross with no
           wording at all — the glyphs are the message there. */
        .pp-hero-pill .mt-nav-sub-wrap [data-action^="remove-armed"] { font-size: 0; }
        .pp-hero-pill .mt-nav-sub-wrap [data-action^="remove-armed"] svg {
          display: block; width: 13px; height: 13px;
        }
        .pp-hero-pill .mt-nav-sub-wrap { gap: 3px; }
        .pp-hero-pill .is-open-btn { padding: 0 8px 0 5px; }

        .popup-body .popup-desc {
          /* Gives way to the sources sheet rather than pushing it off screen */
          flex: 0 1 auto; min-height: 0; overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 0 16px 8px;
        }
        .popup-body .popup-desc .popup-overview { margin: 0; }
        /* Ratings run on from the subtitle instead of starting their own row;
           the instance chips keep the line below to themselves. */
        .popup-body .popup-subrow { gap: 6px 10px; margin-bottom: 6px; }
        .popup-body .popup-subrow .popup-sub { display: inline; }
        .popup-body .popup-ratings { gap: 10px; }
        .popup-body .instance-status-row { margin-top: 2px; }
        .pp-grab.is-dragging > span { background: rgba(var(--accent-rgb),0.9); }
        .popup-day .pp-grab > span { background: rgba(0,0,0,0.22); }


      }

      .popup-backdrop-fade {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 60px;
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
      .popup-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; }
      /* Phone: a long title used to push the actions below the fold. Clamp the
         title to two lines and keep the action row pinned to the bottom of the
         scrolling body, so it is reachable whatever the title's length. */
      @media (max-width: 600px) {
        .popup-title {
          display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
          overflow: hidden; font-size: 16px;
        }
        /* Fixed height, so the sheet never grows or shrinks as its content
           changes — the middle section takes up the slack and scrolls, while
           the trailer stays parked at the bottom edge. */
        .popup-glass { height: 85vh; }
        .popup-content { flex: 1; min-height: 0; overflow: hidden; }
        /* With a panel open the middle section stops growing — what it gives up
           is the description, which rolls away rather than being cut off. */
        .popup-body--search .popup-content,
        .popup-body--sn-is .popup-content,
        .popup-body--panel .popup-content { flex: 0 1 auto; }
        .popup-yt-thumb { margin-top: auto; }
        /* Meta is the column: everything keeps its size, the description gives
           way, and the actions sit on the bottom edge of the middle section. */
        .popup-meta { display: flex; flex-direction: column; min-height: 0; }
        .popup-overview {
          flex: 0 1 auto; min-height: 0; overflow-y: auto;
          -webkit-overflow-scrolling: touch; margin-bottom: 8px;
        }
        .popup-actions {
          margin-top: auto; padding-top: 4px;
          /* Room for a second row, so revealing one never shifts the layout */
          min-height: 72px; align-content: flex-start;
        }
        /* Interactive/Automatic search: the middle section gives up its height
           to the sources list, and the swap is animated. */
        /* The action row keeps its reserved height in every state — IS/AS and the
           delete buttons have to stay reachable even with a panel open. */
      }
      .popup-actions .is-btn-row { margin-top: 0; }
      .popup-actions .is-open-btn { margin-top: 0; }
      .popup-actions .remove-confirm-row { margin-top: 0; }

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

      .popup-yt-thumb::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 50px;
        background: linear-gradient(to bottom, var(--is-fade-btm), transparent);
        pointer-events: none;
        z-index: 1;
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
      .popup-title   { font-size: 18px; font-weight: 800; color: var(--is-text); margin: 0 0 5px; line-height: 1.2; display: flex; align-items: center; gap: 7px; }
      .popup-mon-btn {
        display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
        padding: 0;
        border: none; background: transparent;
        color: var(--is-text); cursor: pointer; opacity: 0.85;
        transition: opacity 0.12s;
      }
      .popup-mon-btn:hover  { opacity: 1; }
      .popup-mon-btn.active { opacity: 1; }
      .popup-mon-row { display: flex; gap: 6px; margin: 0 0 8px; }
      .popup-subrow  { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 8px; }
      .popup-subrow .popup-sub { margin-bottom: 0; }
      .popup-ratings { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
      /* Its own line under the ratings — file facts, not title facts. The
         bottom margin is what keeps the instance chips, and the overview under
         them, clear of this row. */
      .popup-fileinfo { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; margin: 7px 0 9px; }
      /* Same shape as .inst-chip directly below it: two rows of capsules that
         differ in size would read as two unrelated things. */
      .pp-fi-chip {
        display: inline-flex; align-items: center; gap: 4px;
        height: 18px; padding: 0 7px; border-radius: 10px;
        font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
        color: rgba(255,255,255,0.72);
        border: 1px solid rgba(255,255,255,0.15);
        background: rgba(255,255,255,0.05);
      }
      .popup-day .pp-fi-chip { color: rgba(0,0,0,0.65); border-color: rgba(0,0,0,0.14); background: rgba(0,0,0,0.04); }
      .pp-fi-chip ha-icon { opacity: 0.75; flex-shrink: 0; }
      .pp-fi-txt { text-transform: uppercase; line-height: 1; }
      .pp-fi-flags { display: inline-flex; align-items: center; gap: 3px; }
      /* Side by side rather than overlapped: the poster strip tucks flags to
         save width, but here there is room and legibility wins. */
      .pp-fi-flag { display: inline-flex; width: 14px; height: 10px; border-radius: 2px; overflow: hidden; }
      .pp-fi-flag svg, .pp-fi-flag img { width: 100%; height: 100%; display: block; }
      .pp-fi-more { opacity: 0.55; font-size: 9px; }
      .popup-fileinfo .badge { position: static; }

      .popup-backdrop--cast {
        display: flex; align-items: center; justify-content: center;
        background: rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.04);
      }
      .popup-cast-fab-anchor {
        position: absolute;
        bottom: 0;
        left: 16px;
        width: 90px;
        z-index: 6;
      }
      .popup-cast-fab {
        display: flex; align-items: center; justify-content: center; gap: 5px;
        width: 100%; box-sizing: border-box;
        padding: 5px 0; border-radius: 10px 10px 0 0;
        border: none;
        background: rgba(0,0,0,0.45);
        color: #fff; font-size: 11px; font-weight: 700; cursor: pointer;
        backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        transition: background 0.12s;
      }
      .popup-cast-fab:hover  { background: rgba(0,0,0,0.65); }
      .popup-cast-fab.active { background: rgba(10,132,255,0.55); }
      .popup-cast-panel {
        position: relative;
        display: flex; flex-direction: column; gap: 2px;
        width: 100%; height: 100%;
        /* Sits right under the capsule rather than hugging the bottom edge */
        justify-content: flex-start;
        /* Top padding clears the action capsule; the sides clear the chevrons */
        padding: 58px 34px 6px;
        box-sizing: border-box;
      }
      @media (max-width: 600px) {
        .popup-cast-panel { justify-content: flex-start; padding: 56px 30px 18px; }
      }
      .popup-cast-grid {
        display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;
      }
      @media (max-width: 600px) {
        .popup-cast-grid { grid-template-columns: repeat(3, 1fr); }
      }
      .popup-cast-item { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px; min-width: 0; }
      .popup-cast-item img, .popup-cast-ph {
        width: 78px; height: 78px;
        border-radius: 50%; object-fit: cover;
        border: 1px solid rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.18);
      }
      @media (max-width: 600px) {
        .popup-cast-item img, .popup-cast-ph { width: 50px; height: 50px; }
      }
      .popup-cast-ph {
        display: flex; align-items: center; justify-content: center;
        background: rgba(var(--arr-dbt-rgb, 255, 255, 255), 0.08);
        font-size: 20px; font-weight: 800; color: var(--is-text-sec);
      }
      .popup-cast-name { font-size: 11px; font-weight: 700; color: var(--is-text); line-height: 1.2; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .popup-cast-role { font-size: 10px; color: var(--is-text-muted); line-height: 1.2; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      /* Page arrows hug the panel's left and right edges */
      .popup-cast-arrow {
        position: absolute; top: 50%; transform: translateY(-50%);
        display: inline-flex; align-items: center; justify-content: center;
        width: 26px; height: 34px; padding: 0; z-index: 6;
        border: none; background: none;
        color: var(--is-text, #fff); cursor: pointer;
        opacity: 0.75; transition: opacity 0.15s;
      }
      .popup-cast-arrow:hover:not(:disabled) { opacity: 1; }
      .popup-cast-arrow:disabled { opacity: 0.2; cursor: default; }
      .popup-cast-arrow--l { left: 2px; }
      .popup-cast-arrow--r { right: 2px; }
      .popup-cast-pg {
        position: absolute; left: 50%; bottom: 4px; transform: translateX(-50%);
        font-size: 10px; font-weight: 700; color: var(--is-text-sec); z-index: 6;
      }
      .popup-sub     { font-size: 11px; color: var(--is-text-sec); margin-bottom: 8px; }
      /* Age rating — a quiet capsule so the number reads on its own */
      .popup-cert {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 22px; padding: 1px 5px; border-radius: 5px;
        font-size: 10px; font-weight: 700; line-height: 1.5; letter-spacing: 0.2px;
        color: var(--is-text); background: rgba(255,255,255,0.11);
        vertical-align: baseline;
      }
      .popup-day .popup-cert { background: rgba(0,0,0,0.09); }
      .popup-overview { font-size: 11px; color: var(--is-text-body); line-height: 1.65; margin: 0 0 12px; }

      .instance-status-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
      .inst-chip {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 10px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase;
        padding: 0 7px 0 6px; height: 18px; border-radius: 10px; border: 1px solid;
      }
      .ic-icon { font-size: 11px; font-weight: 900; line-height: 1; display: inline-flex; align-items: center; }
      .ic--available   { color: #4ade80; border-color: rgba(74,222,128,0.35); background: rgba(74,222,128,0.08); }
      .is-grab-btn.is-grab-dl {
        background: rgba(96,165,250,0.18); border-color: rgba(96,165,250,0.45); color: #60a5fa;
      }
      .inst-chip .ic-bar {
        display: inline-block; width: 34px; height: 4px; border-radius: 2px;
        background: rgba(96,165,250,0.25); overflow: hidden; vertical-align: middle;
      }
      .is-grab-btn .ic-bar {
        display: inline-block; height: 4px; border-radius: 2px;
        background: rgba(96,165,250,0.28); overflow: hidden;
      }
      .is-grab-btn .ic-bar > span {
        display: block; height: 100%; background: #60a5fa; border-radius: 2px;
        transition: width 0.4s ease;
      }
      .inst-chip .ic-bar > span {
        display: block; height: 100%; background: #60a5fa; border-radius: 2px;
        transition: width 0.4s ease;
      }
      .ic--downloading { color: #60a5fa; border-color: rgba(96,165,250,0.35); background: rgba(96,165,250,0.08); }
      .ic--failed      { color: #f87171; border-color: rgba(248,113,113,0.35); background: rgba(248,113,113,0.08); }
      .ic--missing     { color: #f87171; border-color: rgba(248,113,113,0.35); background: rgba(248,113,113,0.08); }
      .ic--added       { color: rgba(255,255,255,0.55); border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); }
      .ic--partial     { color: #ff9f0a; border-color: rgba(255,159,10,0.35); background: rgba(255,159,10,0.08); }
      .ic--none        { color: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.08); background: transparent; }
      /* The music chips, reading the way Lidarr's own bars do: blue for an
         artist complete within what it monitors, red once part of it is here,
         neutral while none of it is. */
      .ic--monitored   { color: #60a5fa; border-color: rgba(96,165,250,0.35); background: rgba(96,165,250,0.08); }
      .ic--behind      { color: #f87171; border-color: rgba(248,113,113,0.35); background: rgba(248,113,113,0.08); }
      .ic--idle        { color: rgba(255,255,255,0.55); border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); }

      .is-open-btn {
        position: relative;
        display: inline-flex; align-items: center; gap: 5px;
        padding: 0 12px 0 9px; height: 28px; box-sizing: border-box; border-radius: 20px;
        border: 1px solid var(--is-btn-bdr); background: var(--is-btn-bg);
        color: var(--is-btn-clr); font-size: 11px; font-weight: 600;
        cursor: pointer; backdrop-filter: blur(8px);
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        margin-top: 4px;
      }
      .is-open-btn:hover  { background: var(--is-btn-hbg); color: var(--is-btn-hclr); }
      .is-open-btn.active { background: var(--is-btn-abg); border-color: var(--is-btn-abdr); color: var(--is-btn-aclr); }
      .is-open-btn.in-lib { background: rgba(74,222,128,0.10); border-color: rgba(74,222,128,0.38); color: #4ade80; }
      .is-open-btn.in-lib:hover { background: rgba(74,222,128,0.20); border-color: rgba(74,222,128,0.55); color: #4ade80; }
      .as-done-icon { color: #4ade80; font-size:13px; font-weight:700; flex-shrink:0; display:inline-flex; align-items:center; justify-content:center; width:26px; }
      .as-btn-badge { position:absolute; top:-5px; right:-5px; width:13px; height:13px; border-radius:50%; font-size:8px; font-weight:900; display:flex; align-items:center; justify-content:center; z-index:2; line-height:1; pointer-events:none; }
      .as-btn-badge--ok  { background:#4ade80; color:#000; }
      .as-btn-badge--err { background:#f87171; color:#fff; }
      .as-btn-badge--dl  { background:rgba(59,130,246,0.9); color:#fff; }
      .as-done-icon--dl  { color: rgba(59,130,246,0.9); }
      .as-dl-bar { flex:1; height:3px; border-radius:2px; background:rgba(255,255,255,0.12); overflow:hidden; min-width:30px; max-width:60px; }
      .as-dl-bar-fill { height:100%; background:rgba(59,130,246,0.8); border-radius:2px; transition:width 0.5s linear; }
      .popup-day .as-dl-bar { background:rgba(0,0,0,0.10); }
      .popup-day .as-dl-bar-fill { background:rgba(37,99,235,0.75); }
      .is-btn-row { display: flex; flex-wrap: nowrap; align-items: center; gap: 6px; margin-top: 4px; height: 28px; overflow: visible; }
      .is-btn-row .is-open-btn { margin-top: 0; height: 28px; box-sizing: border-box; }
      .is-btn-row .is-open-btn[data-action="search-pick-as"],
      .is-btn-row .is-open-btn[data-action="search-pick-is"],
      .is-btn-row .is-open-btn[data-action="search-pick-inst"],
      .is-btn-row .is-open-btn[data-action="search-expand"] { width: 100px; justify-content: center; }
      .is-collapse-btn { padding: 0; width: 28px; height: 28px; border-radius: 50%; justify-content: center; flex-shrink: 0; }

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
      .popup-day .ic--none  { color: rgba(0,0,0,0.35); border-color: rgba(0,0,0,0.15); background: rgba(0,0,0,0.04); }
      .popup-day .ic--added { color: rgba(0,0,0,0.50); border-color: rgba(0,0,0,0.18); background: rgba(0,0,0,0.04); }
      .popup-day .ic--idle  { color: rgba(0,0,0,0.50); border-color: rgba(0,0,0,0.18); background: rgba(0,0,0,0.05); }
      .popup-day .action-spinner { border-color: rgba(0,0,0,0.15); border-top-color: rgba(0,0,0,0.65); }
      .popup-day .popup-ctrl-btn { color: rgba(0,0,0,0.75); background: rgba(0,0,0,0.07); }
      .popup-day .popup-ctrl-btn:hover { background: rgba(0,0,0,0.13); }
      .popup-day .popup-ctrl-btn-main { background: rgba(229,160,13,0.25); color: rgba(0,0,0,0.80); }
      .popup-day .popup-ctrl-btn-main:hover { background: rgba(229,160,13,0.42); }
      .popup-day .stream-prog-track { background: rgba(0,0,0,0.12); }
      .popup-day .stream-paused-overlay { color: rgba(0,0,0,0.7); }
      .stream-popup-track { background: rgba(255,255,255,0.15); }
      .stream-popup-fill  { background: rgba(255,255,255,0.7); }
      .popup-day .stream-popup-track { background: rgba(0,0,0,0.12); }
      .popup-day .stream-popup-fill  { background: rgba(229,160,13,0.9); }
      .popup-day .stream-popup-time { color: rgba(0,0,0,0.45) !important; }
      /* Filter selects in the capsule language: no native chrome, our own
         chevron, and the muted state when nothing is picked. */
      .is-f-select {
        appearance: none; -webkit-appearance: none;
        height: 28px; padding: 0 26px 0 12px; border-radius: 999px;
        font-size: 11px; font-weight: 600; cursor: pointer; outline: none;
        background-color: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.10);
        color: var(--is-text-sec);
        background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
        background-repeat: no-repeat; background-position: right 8px center; background-size: 12px;
      }
      .is-f-select.active {
        background-color: rgba(var(--accent-rgb),0.22);
        border-color: rgba(var(--accent-rgb),0.45);
        color: var(--is-text);
      }
      .is-f-select option { background: var(--is-menu-bg); color: var(--is-text); }

      .popup-day .is-f-select {
        background-color: rgba(0,0,0,0.06);
        border-color: rgba(0,0,0,0.14);
        color: rgba(0,0,0,0.60);
      }
      .popup-day .is-f-select.active {
        background-color: rgba(0,0,0,0.12);
        border-color: rgba(0,0,0,0.30);
        color: rgba(0,0,0,0.85);
      }

      .remove-lib-btn  { border-color: rgba(255,120,30,0.45); color: rgba(255,150,80,0.9); height: 28px; box-sizing: border-box; }
      .remove-lib-btn:hover  { background: rgba(255,120,30,0.18); border-color: rgba(255,120,30,0.70); color: #ff9640; }
      .remove-disc-btn, .remove-excl-btn { border-color: rgba(255,69,58,0.55); color: rgba(255,90,80,0.95); }
      .remove-disc-btn:hover, .remove-excl-btn:hover { background: rgba(255,69,58,0.20); border-color: rgba(255,69,58,0.80); color: #ff453a; }
      .remove-confirm-row {
        display: inline-flex; align-items: center; flex-wrap: nowrap; gap: 6px; margin-top: 4px;
      }
      .remove-confirm-row .is-open-btn {
        margin-top: 0; height: 28px; box-sizing: border-box; flex-shrink: 1; min-width: 0;
      }
      @media (max-width: 480px) {
        .remove-confirm-row { flex-wrap: wrap; }
      }
      .remove-ic-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 28px; height: 28px; box-sizing: border-box;
        border-radius: 50%; border: 1px solid currentColor;
        background: transparent; cursor: pointer; padding: 0; flex-shrink: 0;
        transition: background 0.15s;
      }
      .remove-ic-no    { color: rgba(255,100,100,0.75); }
      .remove-ic-no:hover { background: rgba(255,100,100,0.2); }
      /* Armed confirmation reads red; the cancel chip stays neutral */
      .pp-hero-pill .mt-nav-sub-wrap .pp-armed-yes {
        background: rgba(255,69,58,0.20); color: rgba(255,140,130,0.98);
      }
      .pp-hero-pill .mt-nav-sub-wrap .pp-armed-yes:hover { background: rgba(255,69,58,0.32); }
      .remove-ic-btn svg { display: block; }

      /* IS confirm-add panel */
      .is-confirm-wrap {
        display: flex; flex-direction: column; align-items: center;
        gap: 16px; padding: 24px 20px; text-align: center;
      }
      .is-confirm-msg {
        font-size: 13px; color: var(--is-text-body); line-height: 1.55;
        max-width: 280px;
      }
      .is-confirm-actions {
        display: flex; gap: 10px;
      }
      /* Same round-button family as the modals' confirm/cancel */
      .is-confirm-btn {
        width: 36px; height: 36px; padding: 0; border-radius: 50%;
        border: 1px solid transparent; cursor: pointer; outline: none;
        display: inline-flex; align-items: center; justify-content: center;
        transition: background .15s, border-color .15s;
      }
      .is-confirm-btn svg { width: 15px; height: 15px; display: block; }
      .is-confirm-yes {
        background: rgba(0,122,255,0.16);
        border-color: rgba(0,122,255,0.42);
        color: rgba(120,190,255,0.98);
      }
      .is-confirm-yes:hover { background: rgba(0,122,255,0.28); border-color: rgba(0,122,255,0.6); }
      .is-confirm-no {
        background: rgba(255,255,255,0.06);
        border-color: rgba(255,255,255,0.12);
        color: var(--is-text-sec);
      }
      .is-confirm-no:hover { background: rgba(255,255,255,0.12); color: var(--is-text); }
      .popup-day .is-confirm-yes { color: rgba(0,90,210,0.95); }
      .popup-day .is-confirm-no { background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.12); }

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

      /* Items differ in height (28px pills next to a 34px peanut), so centre
         them rather than letting the default stretch pin them to the top. */
      .is-filter { display: flex; gap: 4px; align-items: center; }
      .is-f-btn {
        padding: 3px 10px; border-radius: 20px;
        border: 1px solid var(--is-btn-bdr); background: transparent;
        color: var(--is-text-muted); font-size: 10px; font-weight: 600;
        cursor: pointer; backdrop-filter: blur(8px);
        transition: background 0.13s, color 0.13s; letter-spacing: 0.02em;
      }
      .is-f-btn:hover  { background: var(--is-btn-hbg); color: var(--is-btn-hclr); }
      .is-f-btn.active { background: var(--is-btn-bg); border-color: var(--is-btn-bdr); color: var(--is-text); }
      .is-tab-lg .is-f-btn {
        height: 28px !important; box-sizing: border-box !important; padding: 0 12px !important; font-size: 11px !important;
      }

      .is-loading {
        display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 10px;
        padding: 36px 20px; color: var(--is-text-muted); font-size: 11px;
      }

      /* Results scroll container */
      .is-results-wrap { overflow-y: auto; overflow-x: hidden; flex: 1; min-height: 0; }

      /* ── TABLE ── */
      .is-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
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
      .is-sort-arrow { margin-left: 3px; font-size: 9px; opacity: 1; }
      .is-sort-arrow.is-sort-inactive { opacity: 0.3; }
      .is-f-select {
        appearance: none; -webkit-appearance: none;
        background-color: rgba(var(--arr-ht-rgb,255,255,255),0.07);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23888' stroke-width='1.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat; background-position: right 7px center;
        border: 1px solid rgba(var(--arr-ht-rgb,255,255,255),0.14);
        border-radius: 20px; color: rgba(var(--arr-st-rgb,180,180,180),0.70);
        font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em;
        padding: 3px 22px 3px 9px; cursor: pointer; outline: none;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
      }
      .is-f-select.active {
        background-color: rgba(var(--arr-ht-rgb,255,255,255),0.16);
        border-color: rgba(var(--arr-ht-rgb,255,255,255),0.40);
        color: rgba(var(--arr-ht-rgb,255,255,255),1);
      }
      .is-f-select option { background: #1e1e2e; color: #ffffff; }
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
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .is-rel-age  { font-size: 9px; color: var(--is-text-muted); margin-top: 1px; display: block; }
      .is-rej-row  { font-size: 9px; line-height: 1.4; color: var(--is-rej-clr); margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: calc(9px * 1.4 * 2); }
      .is-indexer  { font-size: 10px; color: var(--is-text-sec); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; display: block; }
      .is-size     { font-size: 10px; color: var(--is-text-sec); font-variant-numeric: tabular-nums; white-space: nowrap; }
      .is-peers    { display: flex; align-items: center; gap: 2px; font-size: 10px; white-space: nowrap; }
      .is-peers .is-s { color: var(--is-peers-s); font-weight: 700; }
      .is-peers .is-l { color: var(--is-peers-l); font-weight: 700; }
      .is-peers-na { font-size: 10px; color: var(--is-text-muted); }
      .is-lang-chip {
        font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 999px;
        background: var(--is-lang-bg); border: 1px solid var(--is-lang-bdr);
        color: var(--is-lang-clr); text-transform: uppercase; letter-spacing: 0.03em;
      }

      /* Grab button */
      .is-grab-btn {
        width: 28px; height: 28px; border-radius: 50%;
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

      /* Confirm wrap (inline 2-button potvrzení uvnitř výsledku).
         Scoped away from .is-confirm-btn — the add-confirm panel reuses the same
         class names but is a round-button dialog, not an inline row. */
      .is-confirm-wrap:not(:has(.is-confirm-msg)) { display: flex; gap: 4px; align-items: center; justify-content: center; }
      .is-confirm-yes:not(.is-confirm-btn) {
        padding: 3px 8px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer;
        background: var(--is-confirm-yes-bg); border: 1px solid var(--is-btn-abdr);
        color: var(--is-confirm-yes-clr); transition: all 0.13s;
      }
      .is-confirm-yes.force:not(.is-confirm-btn) { background: var(--is-grab-f-bg); border-color: var(--is-grab-f-bdr); color: var(--is-grab-f-clr); }
      .is-confirm-yes:not(.is-confirm-btn):hover { filter: brightness(1.2); }
      .is-confirm-no:not(.is-confirm-btn) {
        padding: 3px 7px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer;
        background: var(--is-confirm-no-bg); border: 1px solid rgba(255,69,58,0.25);
        color: var(--is-confirm-no-clr); transition: all 0.13s;
      }
      .is-confirm-no:not(.is-confirm-btn):hover { filter: brightness(1.2); }

      /* ── Mobile IS grab button (larger) ── */
      .is-ic-r1 .is-grab-btn { width: 30px; height: 30px; margin: 0; }

      /* ════════════════════════════════════
         RIGHT COLUMN PAGE NAV
      ════════════════════════════════════ */
      .rp-sections { flex: 1; }

      /* TMDB key deadline notice — lives inside the search bar, pushed right.
         flex-shrink:0 everywhere so it never squeezes the input below usable. */
      .tmdb-notice {
        display: flex; align-items: center; gap: 7px;
        margin-left: auto; flex-shrink: 0;
        color: #f59e0b;
      }
      .tmdb-notice-ico { width: 15px; height: 15px; flex-shrink: 0; }
      .tmdb-notice-txt {
        font-size: 11px; font-weight: 700; white-space: nowrap;
      }
      .tmdb-notice-btn {
        border: none; cursor: pointer;
        background: rgba(245, 158, 11, 0.22);
        color: #f59e0b;
        font-size: 11px; font-weight: 700; white-space: nowrap;
        padding: 4px 11px; border-radius: 999px; flex-shrink: 0;
      }
      .tmdb-notice-btn:hover { background: rgba(245, 158, 11, 0.34); }
      .tmdb-notice-x {
        background: none; border: none; cursor: pointer;
        color: rgba(245, 158, 11, 0.55);
        padding: 0; width: 13px; height: 13px; flex-shrink: 0;
      }
      .tmdb-notice-x svg { width: 13px; height: 13px; display: block; }
      .tmdb-notice-x:hover { color: #f59e0b; }
      /* Narrow viewports: the sentence goes, the icon carries the warning */
      @media (max-width: 900px) {
        .tmdb-notice-txt { display: none; }
      }

      /* TMDB info modal */
      .info-modal {
        max-width: 520px; width: 100%;
        height: auto; max-height: 80vh;
        display: flex; flex-direction: column;
      }
      .info-modal-hdr {
        display: flex; align-items: center; gap: 10px;
        padding: 16px 18px 12px;
        border-bottom: 1px solid var(--is-divider);
      }
      .info-modal-title {
        font-size: 15px; font-weight: 800; color: var(--is-text);
        flex: 1; min-width: 0;
      }
      .info-modal-body {
        padding: 14px 18px 18px;
        overflow-y: auto; min-height: 0;
      }
      /* Quick actions — same capsule language as .mt-field, cascading instead
         of a select: the parent list stays put and the child opens beside it. */
      .qa-btn {
        /* Matches the Plex cast button: same 36px circle, same optical weight */
        display: flex; align-items: center; justify-content: center;
        width: 36px; height: 36px; flex-shrink: 0; padding: 0;
        border: 1px solid rgba(255,255,255,0.10);
        border-radius: 999px;
        background: rgba(255,255,255,0.06);
        color: var(--is-text, #fff);
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
      }
      .qa-btn:hover, .qa-btn-on {
        background: rgba(var(--arr-acc-rgb, 10,132,255), 0.18);
        border-color: rgba(var(--arr-acc-rgb, 10,132,255), 0.45);
      }
      .popup-day .qa-btn { color: #11181f; border-color: rgba(0,0,0,0.12); background: rgba(0,0,0,0.05); }

      /* Anchored on .popup-glass, not on the title row: the drawer may grow past
         the details section and should be free to overlay the trailer below. */
      .qa-menu {
        /* left is set in script so the panel lines up with its own trigger */
        position: absolute; top: 62px; left: 12px; z-index: 60;
        max-width: min(340px, calc(100% - 24px));
      }
      .qa-list {
        /* Sizes to its widest row; the floor is only there so a one-word menu
           does not collapse into a sliver. Options grows past it on its own. */
        width: max-content; min-width: 150px; max-width: 100%;
        max-height: calc(100% - 24px);
        padding: 6px;
        border-radius: 16px;
        background: var(--is-menu-bg, #18182a);
        border: 1px solid var(--is-glass-bdr, rgba(255,255,255,0.20));
        box-shadow: 0 12px 34px rgba(0,0,0,0.45);
        overflow-y: auto;
        animation: qa-drop 0.18s ease;
      }
      /* The statistics drawer carries rows wider than any label above it, so the
         Actions panel claims that width up front rather than stretching under
         the pointer once the numbers arrive. */
      .qa-list-actions { min-width: min(300px, calc(100vw - 48px)); }
      @keyframes qa-drop {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: none; }
      }
      .qa-item {
        display: flex; align-items: center; justify-content: flex-start; gap: 7px;
        width: 100%; padding: 7px 10px;
        border: none; border-radius: 11px;
        background: none; color: var(--is-text, #fff);
        font-size: 12px; font-weight: 600; text-align: left;
        cursor: pointer;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      /* Only the label grows. Every other span in a row — the icon box, the
         spinner box — is a fixed slot, and an unscoped rule handed them flex:1
         so they split the row with the text instead of sitting beside it. */
      .qa-item > span:not(.qa-ico):not(.qa-spin):not(.qa-air-date):not(.qa-cb):not(.qa-dot) {
        flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; text-align: left;
      }
      /* Deliberately not .qa-ico: that box force-sizes its children with
         !important, which beats an inline width and collapsed the spinner. */
      .qa-spin {
        display: flex; align-items: center; justify-content: center;
        flex: 0 0 16px; width: 16px; height: 16px;
      }
      .qa-spin .action-spinner { width: 14px; height: 14px; border-width: 2px; }
      .qa-ico {
        display: flex; align-items: center; justify-content: center;
        flex: 0 0 16px; width: 16px; height: 16px; overflow: hidden;
      }
      /* Some logos carry generous padding inside their own viewBox, so at a
         shared 16px they read a size smaller than the marks that fill theirs.
         Listed one by one — Sonarr, Plex and Maintainerr need no help. */
      .qa-ico img[src*="radarr"],
      .qa-ico img[src*="tracearr"] { transform: scale(1.18); }
      .qa-ico * {
        max-width: 16px !important; max-height: 16px !important;
        width: auto !important; height: auto !important;
        margin: 0 !important; padding: 0 !important;
        display: block !important;
        --mdc-icon-size: 14px;
      }
      .qa-item:hover { background: var(--is-row-hover, rgba(255,255,255,0.06)); }
      .qa-item-on {
        background: rgba(var(--arr-acc-rgb, 10,132,255), 0.16);
        color: rgba(var(--arr-acc-rgb, 10,132,255), 1);
      }
      /* Roll-down: max-height animates, the drawer clips until it settles */
      .qa-chev { flex-shrink: 0; transition: transform 0.22s ease; }
      .qa-item-on .qa-chev { transform: rotate(180deg); }
      .qa-drawer {
        max-height: 0; opacity: 0; overflow: hidden;
        transition: max-height 0.24s ease, opacity 0.18s ease;
      }
      .qa-drawer.is-open { max-height: 320px; opacity: 1; }
      .qa-sub-item { padding-left: 33px; font-weight: 500; }
      /* Air dates are information, not a target */
      .qa-static { cursor: default; }
      .qa-static:hover { background: none; }
      .qa-air-date { flex-shrink: 0; color: var(--is-text-muted); font-weight: 600; }
      /* Tick boxes sit where the app icons do on the rows above, so the column
         of glyphs stays straight; the label indent is dropped for the same
         reason. Same round mark the Library's edit mode uses. */
      .qa-cb-row { padding-left: 12px; }
      .qa-cb {
        flex-shrink: 0; width: 16px; height: 16px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.45);
        display: inline-flex; align-items: center; justify-content: center;
        box-sizing: border-box; color: #fff; transition: background 0.15s, border-color 0.15s;
      }
      .popup-day .qa-cb { border-color: rgba(0,0,0,0.35); }
      .qa-cb.is-on { background: rgba(0,122,255,0.95); border-color: rgba(0,122,255,0.95); }
      /* Status takes over the Actions button. The ghost keeps the original
         label's width so the pill never resizes; the overlay sits on top and
         clips rather than pushing the box wider. */
      .qa-st-btn {
        position: relative;
        color: rgba(var(--qa-st), 0.95) !important;
        border-color: rgba(var(--qa-st), 0.5) !important;
        background: rgba(var(--qa-st), 0.14) !important;
        cursor: default;
        transition: color 0.2s, border-color 0.2s, background 0.2s;
      }
      .qa-st-ghost { visibility: hidden; display: inline-flex; align-items: center; gap: 5px; }
      .qa-st-ov {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center; gap: 5px;
        padding: 0 10px; overflow: hidden; white-space: nowrap;
      }
      .qa-st-ov > span { overflow: hidden; text-overflow: ellipsis; }
      /* Marks a collection the title is already in — small enough to read as an
         annotation on the row rather than a control. */
      .qa-dot {
        flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%;
        background: #4da3ff; margin-left: 6px;
      }
      .qa-apply { justify-content: center; font-weight: 700; color: #4da3ff; }
      .qa-apply.is-off { opacity: 0.35; pointer-events: none; }


      .info-modal-name {
        margin: 0 0 12px;
        font-size: 12px; font-weight: 700; line-height: 1.4;
        color: var(--is-text);
        word-break: break-all;
      }
      .info-modal-p {
        margin: 0 0 10px;
        font-size: 12.5px; line-height: 1.55;
        color: var(--is-text-sec);
      }
      .info-modal-link {
        display: inline-block; margin-top: 4px;
        background: rgba(245, 158, 11, 0.22);
        color: #f59e0b; text-decoration: none;
        font-size: 12px; font-weight: 700;
        padding: 7px 15px; border-radius: 999px;
      }
      .info-modal-link:hover { background: rgba(245, 158, 11, 0.34); }
      /* Day mode: the light glass washes out #f59e0b, so drop to a darker amber */
      .popup-overlay.popup-day .info-modal-link {
        background: rgba(180, 83, 9, 0.14);
        color: #b45309;
      }
      .popup-overlay.popup-day .info-modal-link:hover { background: rgba(180, 83, 9, 0.22); }
      .rp-nav {
        position: relative;
        display: flex; align-items: center; justify-content: center;
        padding: 6px 0 2px; gap: 4px;
        margin-top: auto;
      }
      .rp-dots {
        display: flex; align-items: center; gap: 5px; justify-content: center; overflow: hidden; min-width: 0;
      }
      .rp-page-counter {
        font-size: 12px; font-weight: 600; opacity: 0.7;
        color: rgba(var(--arr-pbt-rgb, 255, 255, 255), 0.8);
        white-space: nowrap;
      }
      .rp-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: rgba(var(--arr-pd-rgb, 255, 255, 255), 0.22); border: none;
        cursor: pointer; padding: 0; flex-shrink: 0;
        transition: width 0.25s cubic-bezier(0.34,1.56,0.64,1), border-radius 0.25s ease, background 0.25s ease;
      }
      .rp-dot:hover { background: rgba(var(--arr-pd-rgb, 255, 255, 255), 0.45); }
      .rp-dot-active {
        width: 18px; border-radius: 3px;
        background: rgba(var(--arr-pda-rgb, 255, 255, 255), 0.80);
        cursor: default; pointer-events: none;
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
      .rp-btn-hidden { display: none; }
      .rp-btn:disabled { opacity: 0.25; pointer-events: none; }
      .rp-btn-icon { width: 36px; height: 36px; padding: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

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

      /* Mobile: floating nav — space-between s flex dots (palce na krajích) */
      @media (max-width: 600px) {
        .rp-nav { justify-content: space-between; }
        .rp-nav .rp-dots { flex: 1; }
      }

      /* Large phone: mgrid 3 col */
      @media (max-width: 700px) {
        .mgrid   { grid-template-columns: repeat(3, 1fr) !important; }
        .tl-row  { grid-template-columns: repeat(3, 1fr) !important; }
        .dl-name { max-width: calc(100vw - 120px); }
        /* badges stay on one row — clip overflow */
        .mc-badges { flex-wrap: nowrap; overflow: hidden; }
        .badge     { font-size: 9px; padding: 0 3px; flex-shrink: 0; }
        /* Stacked under .media-type-tag, so it has to match its box, not the
           compact metrics the badge row needs. */
        .badge.b-ep { font-size: 10px; padding: 2px 6px; }
        .dl-r2 { gap: 5px; }
        .status-pill { padding: 1px 6px; }
        .dm { gap: 1px; }
        .dm-eta { display: none; }
      }

      /* Small phone: mgrid 2 col */
      @media (max-width: 480px) {
        .mgrid   { grid-template-columns: repeat(2, 1fr) !important; }
        .to-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .tl-row  { grid-template-columns: repeat(2, 1fr) !important; }
.disk-row    { flex-wrap: wrap; }
        .disk-chip   { min-width: calc(50% - 3px); }
        .col         { border-radius: 24px; padding: 12px; }
        .col::before { border-radius: 24px; }
        .card-body   { gap: 8px; padding: 0 8px 8px; }
        /* even smaller badges in 2-col grid */
        .badge { font-size: 8px; padding: 0 2px; }
        .badge ha-icon { --mdc-icon-size: 8px !important; }
        .badge.b-ep { font-size: 10px; padding: 2px 6px; }
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
        padding-left: 16px;
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
      /* ── Season / episode row buttons in the new round style ──
         Sized to the row they sit in: 26px in the season header (min-height 36)
         and 20px in an episode row (content 20 + 10 of padding), so the rows
         keep their height. */
      .sn-season-header .btn-person,
      .sn-season-header .btn-ep-trash {
        width: 26px; height: 26px; padding: 0; border-radius: 50%;
        justify-content: center; flex-shrink: 0;
      }
      .sn-season-header .btn-person svg,
      .sn-season-header .btn-ep-trash svg { width: 14px; height: 14px; }
      .sn-ep-row .btn-person,
      .sn-ep-row .btn-ep-trash {
        width: 26px; height: 26px; padding: 0; border-radius: 50%;
        justify-content: center; flex-shrink: 0;
      }
      .sn-ep-row .btn-person svg,
      .sn-ep-row .btn-ep-trash svg { width: 13px; height: 13px; }
      /* The row gives back its own padding so the taller buttons fit */
      .sn-ep-row { padding: 2px 4px; }
      .sn-season-header .btn-person,
      .sn-season-header .btn-ep-trash { width: 30px; height: 30px; }
      .sn-season-header .btn-person svg,
      .sn-season-header .btn-ep-trash svg { width: 15px; height: 15px; }
      @media (max-width: 600px) {
        .sn-ep-row { padding: 1px 2px; gap: 5px; }
        .sn-season-header { padding: 4px 6px; }
        /* An album row carries a title, a count, a progress bar and three
           buttons; on a phone that is one line too many, so the title takes its
           own and the rest sits under it. */
        .mus-alb-header { flex-wrap: wrap; row-gap: 4px; }
        .mus-alb-header .sn-season-title {
          flex: 1 1 100%; min-width: 0; order: 1;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mus-alb-header .sn-expand { order: 0; }
        .mus-alb-header .sn-season-stat,
        .mus-alb-header .sn-season-bar,
        .mus-alb-header .btn-person,
        .mus-alb-header .btn-ep-trash,
        .mus-alb-header .action-spinner,
        .mus-alb-header .ep-del-confirm,
        .mus-alb-header .ep-del-msg { order: 2; }
        .mus-alb-header .sn-season-bar { flex: 1 1 auto; min-width: 40px; }
      }
      /* Tinted fills instead of outlines, like every other round button */
      .sn-season-header .btn-person,
      .sn-ep-row .btn-person {
        background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.10);
      }
      .popup-day .sn-season-header .btn-person,
      .popup-day .sn-ep-row .btn-person {
        background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.10);
      }
      .sn-season-header .btn-ep-trash,
      .sn-ep-row .btn-ep-trash {
        background: rgba(255,69,58,0.14); border-color: rgba(255,69,58,0.38);
        color: rgba(255,120,110,0.95);
      }
      .btn-ep-trash {
        background: none;
        border: 1px solid rgba(255,69,58,0.5);
        border-radius: 5px;
        cursor: pointer;
        padding: 4px 6px;
        color: rgba(255,69,58,0.7);
        display: flex;
        align-items: center;
        flex-shrink: 0;
        transition: background .15s, color .15s, border-color .15s;
      }
      .btn-ep-trash:hover {
        background: rgba(255,69,58,0.15);
        color: #ff453a;
        border-color: rgba(255,69,58,0.5);
      }
      .ep-del-confirm {
        display: inline-flex;
        gap: 4px;
        flex-shrink: 0;
      }
      .ep-del-msg {
        font-size: 10px;
        color: rgba(255,69,58,0.85);
        font-weight: 600;
        white-space: nowrap;
        flex: 1;
        text-align: right;
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

      .sn-ep-item { display: block; }
      .sn-ep-item:hover .sn-ep-row { background: var(--is-row-hover); }
      .sn-ep-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 4px;
        border-radius: 5px;
      }
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
        overflow-x: hidden;
        overflow-y: auto;
      }
      .sn-is-panel .is-indexer   { max-width: 70px; }

      /* Mobile drill-down */
      .sn-drilldown {
        margin-top: 0;
      }

      .sn-back-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255,255,255,0.08);
        border: none;
        color: #fff;
        cursor: pointer;
        flex-shrink: 0;
        transition: background .15s;
      }
      .sn-back-btn:hover {
        background: rgba(255,255,255,0.15);
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

      /* ════════════════════════════════════
         TAUTULLI POSTER ROW
      ════════════════════════════════════ */
      .tl-row { flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .tl-card {
        background: rgba(255,255,255,0.07);
        border-radius: 14px; padding: 11px 10px; cursor: pointer;
        position: relative; overflow: hidden; aspect-ratio: 2/3;
        display: flex; flex-direction: column;
        transition: transform .15s, box-shadow .15s;
        backdrop-filter: saturate(0%);
        -webkit-backdrop-filter: saturate(0%);
      }
      .tl-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
      .tl-card-warn { background: rgba(180,30,30,0.22); }
      .tl-accent { position: absolute; top: 0; left: 0; right: 0; height: 2px; }
      .tl-accent-blue   { background: rgba(99,140,255,0.7); }
      .tl-accent-green  { background: rgba(60,200,120,0.7); }
      .tl-accent-orange { background: rgba(250,160,40,0.7); }
      .tl-accent-purple { background: rgba(180,80,255,0.7); }
      .tl-accent-red    { background: rgba(255,60,60,0.8); }
      .tl-icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; flex-shrink: 0; }
      .tl-icon-blue   { background: rgba(99,140,255,0.15); }
      .tl-icon-green  { background: rgba(60,200,120,0.15); }
      .tl-icon-orange { background: rgba(250,160,40,0.15); }
      .tl-icon-purple { background: rgba(180,80,255,0.15); }
      .tl-icon-red    { background: rgba(255,60,60,0.15); }
      .tl-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.3); margin-bottom: 6px; flex-shrink: 0; }
      .tl-label-warn { color: rgba(255,100,100,0.6); }
      .tl-stat-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
      .tl-stat-name { font-size: 10px; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 72px; }
      .tl-stat-val  { font-size: 10px; font-weight: 700; color: rgba(250,180,50,0.9); flex-shrink: 0; margin-left: 4px; }
      .tl-big-num   { font-size: 34px; font-weight: 800; color: rgba(250,160,40,0.9); line-height: 1; margin-bottom: 4px; }
      .tl-big-sub   { font-size: 10px; color: rgba(255,255,255,0.35); margin-bottom: 8px; }
      .tl-sub-row   { font-size: 9px; color: rgba(255,255,255,0.4); margin-bottom: 2px; }
      .tl-sub-val   { font-weight: 600; color: rgba(255,255,255,0.6); }
      .tl-user-row  { display: flex; align-items: center; gap: 5px; margin-bottom: 5px; }
      .tl-user-row:last-of-type { margin-bottom: 0; }
      .tl-avatar { width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.1); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 700; color: rgba(255,255,255,0.6); overflow: hidden; }
      .tl-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .tl-avatar-warn { background: rgba(255,60,60,0.2); color: rgba(255,120,120,0.9); }
      .tl-user-name  { font-size: 10px; color: rgba(255,255,255,0.75); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .tl-user-name-warn { color: rgba(255,120,120,0.95); }
      .tl-user-plays { font-size: 9px; font-weight: 700; color: rgba(250,180,50,0.85); flex-shrink: 0; }
      .tl-user-plays-warn { color: rgba(255,80,80,0.8); }
      .tl-warn-sub   { font-size: 8px; color: rgba(255,80,80,0.6); }
      .tl-warn-badge { position: absolute; top: 8px; right: 8px; background: rgba(255,60,60,0.2); border: 1px solid rgba(255,60,60,0.4); border-radius: 4px; padding: 1px 4px; font-size: 8px; color: rgba(255,100,100,0.9); font-weight: 700; }
      .tl-mini-bars { display: flex; align-items: flex-end; gap: 2px; flex: 1; min-height: 0; }
      .tl-bar-col   { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px; }
      .tl-bar { width: 100%; border-radius: 2px 2px 0 0; background: rgba(180,80,255,0.5); min-height: 2px; transition: background .15s; }
      .tl-card:hover .tl-bar { background: rgba(180,80,255,0.8); }
      .tl-bar-day   { font-size: 6px; color: rgba(255,255,255,0.2); }
      .tl-chart-sum { font-size: 9px; color: rgba(255,255,255,0.4); margin-top: 4px; flex-shrink: 0; }
      .tl-chart-sum strong { color: rgba(180,80,255,0.9); font-weight: 700; }

      /* Tautulli modal */
      /* tl-modal-* removed — now uses popup-overlay / popup-glass / popup-close / is-panel-hdr */
      /* ── Tautulli Graphs ── */
      .tl-graph-title { font-size: 10px; font-weight: 700; color: var(--is-text-label); text-transform: uppercase; letter-spacing: .06em; }
      .tl-g-card { background: var(--is-row-hover); border: 1px solid var(--is-card-bdr, rgba(255,255,255,0.09)); border-radius: 16px; padding: 12px 12px 10px 12px; --tl-wknd: rgba(255,255,255,0.035); --tl-col-hlt: rgba(255,255,255,0.06); }
      .popup-day .tl-g-card { --tl-wknd: rgba(0,0,0,0.03); --tl-col-hlt: rgba(0,0,0,0.05); }
      .tl-g-svg { width: 100%; display: block; overflow: visible; }

      /* Bar animation: scale up from bottom of each bar's own bbox */
      @keyframes tl-g-bar-up {
        from { transform: scaleY(0); opacity: 0.4; }
        to   { transform: scaleY(1); opacity: 1; }
      }
      .tl-g-anim-bar {
        transform-box: fill-box;
        transform-origin: center bottom;
        animation: tl-g-bar-up 0.38s cubic-bezier(.22,.61,.36,1) both;
      }
      /* Hover highlight for column groups */
      .tl-g-col:hover .tl-g-anim-bar { opacity: 1 !important; filter: brightness(1.15); }
      @keyframes tl-g-bar-horiz {
        from { transform: scaleX(0); opacity: 0.4; }
        to   { transform: scaleX(1); opacity: 1; }
      }
      .tl-g-anim-bar-h {
        transform-origin: left center;
        animation: tl-g-bar-horiz 0.45s cubic-bezier(.22,.61,.36,1) both;
      }

      /* Line animation: draw left→right via stroke-dashoffset (large dasharray, no pathLength) */
      @keyframes tl-g-line-draw {
        from { stroke-dashoffset: 4000; }
        to   { stroke-dashoffset: 0; }
      }
      .tl-g-anim-line {
        stroke-dasharray: 4000;
        animation: tl-g-line-draw 2.5s ease-out both;
      }

      /* HTML x-axis label row below SVG — avoids font stretching from preserveAspectRatio:none */
      .tl-g-x-labels { position: relative; height: 16px; margin-top: 2px; overflow: visible; }
      .tl-g-x-labels span { white-space: nowrap; font-size: 10px; color: var(--is-text-muted); line-height: 1; }

      /* HTML y-axis label — consistent size regardless of chart width */
      .tl-g-ylabel { position: absolute; top: 2px; left: 2px; font-size: 10px; color: var(--is-text-muted); line-height: 1; pointer-events: none; z-index: 1; white-space: nowrap; }
      .tl-hist-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .tl-hist-table th { text-align: left; padding: 6px 8px; color: var(--is-text-label); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid var(--is-divider); }
      .tl-hist-table td { padding: 0 8px; height: 44px; border-bottom: 1px solid var(--is-divider); color: var(--is-text-body); vertical-align: middle; overflow: hidden; max-width: 220px; white-space: nowrap; text-overflow: ellipsis; }
      .tl-hist-table tr:last-child td { border-bottom: none; }
      .tl-hist-table tr:hover td { background: var(--is-row-hover); }
      .tl-users-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .tl-users-table th { text-align: left; padding: 6px 8px; color: var(--is-text-label); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid var(--is-divider); }
      .tl-users-table td { padding: 9px 8px; border-bottom: 1px solid var(--is-divider); color: var(--is-text-body); vertical-align: middle; }
      .tl-users-table tr:last-child td { border-bottom: none; }
      .tl-users-table tr.tl-row-warn td { background: rgba(255,60,60,0.04); }
      .tl-users-table tr:hover td { background: var(--is-row-hover); }
      .tl-warn-banner { display: flex; align-items: flex-start; gap: 10px; background: rgba(255,60,60,0.08); border: 1px solid rgba(255,60,60,0.22); border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 11px; color: rgba(255,120,120,0.9); line-height: 1.5; }
      .tl-ack-btn { margin-left: auto; flex-shrink: 0; align-self: center; background: rgba(255,60,60,0.18); border: 1px solid rgba(255,60,60,0.35); border-radius: 6px; padding: 4px 10px; font-size: 10px; font-weight: 600; color: rgba(255,120,120,0.9); cursor: pointer; transition: all .15s; white-space: nowrap; }
      .tl-ack-btn:hover { background: rgba(255,60,60,0.3); color: #fff; }
      .tl-pagination { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 14px; }
      .tl-page-btn { padding: 0 12px; height: 28px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--is-btn-bdr); background: var(--is-btn-bg); color: var(--is-btn-clr); cursor: pointer; font-size: 12px; line-height: 1; transition: all .15s; display: inline-flex; align-items: center; justify-content: center; }
      .tl-page-btn:disabled { opacity: 0.3; pointer-events: none; }
      .tl-page-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
      .tl-page-btn.active { background: rgba(10,132,255,0.28); border-color: rgba(10,132,255,0.55); color: #fff; }
      .tl-col-item { display: flex; align-items: center; gap: 8px; padding: 6px 14px; cursor: pointer; font-size: 12px; color: var(--is-text-body,rgba(255,255,255,0.8)); white-space: nowrap; transition: background .1s; }
      .tl-col-item:hover { background: var(--is-row-hover,rgba(255,255,255,0.05)); }
      .tl-col-chk { width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--is-btn-bdr); background: transparent; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; transition: all .15s; }
      .tl-col-chk.on { background: rgba(10,132,255,0.85); border-color: rgba(10,132,255,0.9); }
      .tl-col-chk.on::after { content: "✓"; font-size: 9px; color: #fff; font-weight: 900; line-height: 1; }
      .tl-toolbar { display:flex; align-items:center; gap:8px; margin-bottom:12px; flex-wrap:wrap; width:100%; box-sizing:border-box; }
      .tl-toolbar-actions { margin-left:auto; display:flex; align-items:center; gap:6px; }
      .tl-edit-btn { display: inline-flex; align-items: center; gap: 3px; padding: 3px 7px; border-radius: 4px; border: 1px solid; cursor: pointer; font-size: 10px; font-weight: 600; transition: all .15s; white-space: nowrap; }
      .tl-del-btn   { background: rgba(255,69,58,0.18);  border-color: rgba(255,69,58,0.4);  color: rgba(255,100,90,0.9); }
      .tl-del-btn:hover   { background: rgba(255,69,58,0.35); }
      .tl-purge-btn { background: rgba(255,149,0,0.18); border-color: rgba(255,149,0,0.4); color: rgba(255,180,50,0.9); }
      .tl-purge-btn:hover { background: rgba(255,149,0,0.35); }
      .tl-tog-btn   { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.4); width: 26px; height: 26px; padding: 0; justify-content: center; border-radius: 50%; }
      .tl-tog-btn.on { background: rgba(48,209,88,0.18); border-color: rgba(48,209,88,0.4); color: rgba(80,220,110,0.9); }
      .tl-tog-btn:hover { opacity: 0.8; }
      .tl-page-counter { font-size: 12px; color: rgba(255,255,255,0.4); }
      .tl-badge-movie  { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: rgba(99,120,255,0.18); color: rgba(140,155,255,0.9); border: 1px solid rgba(99,120,255,0.28); }
      .tl-badge-tv     { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: rgba(80,200,120,0.13); color: rgba(100,220,140,0.9); border: 1px solid rgba(80,200,120,0.22); }
      .tl-badge-music  { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: rgba(250,180,50,0.13); color: rgba(250,200,80,0.9); border: 1px solid rgba(250,180,50,0.22); }
      .tl-mob-card { padding: 10px 12px; border-bottom: 1px solid var(--is-divider); transition: background 0.1s; }
      .tl-mob-card:last-child { border-bottom: none; }
      .tl-mob-card:hover { background: var(--is-row-hover); }
      .tl-mob-r1 { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; min-width: 0; }
      .tl-mob-name { flex: 1; min-width: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--is-text); }
      .tl-mob-meta { display: flex; gap: 10px; font-size: 11px; color: var(--is-text-label); flex-wrap: wrap; }
      .tl-mob-edit { display: flex; gap: 4px; margin-top: 7px; flex-wrap: wrap; }
      .tl-icon-btn { width: 36px; height: 36px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; }
      .tl-pill-btn { height: 36px; border-radius: 20px; padding: 0 16px; font-size: 12px; }
      /* "This week"/"This month" is inert while you are already there. Dimming
         it read as broken, so it takes the filled active look instead — the
         same signal a selected tab gives — and overrides :disabled's opacity. */
      .tl-page-btn.is-here:disabled {
        opacity: 1;
        background: rgba(0,122,255,0.5);
        border-color: rgba(0,122,255,0.8);
        color: #fff;
        font-weight: 700;
      }
      .popup-day .tl-page-btn.is-here:disabled {
        background: rgba(0,122,255,0.85);
        border-color: rgba(0,122,255,0.95);
      }
      .tl-mob-pag { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
      .tl-mob-pag-info { flex: 1; text-align: center; font-size: 12px; color: var(--is-text-label); }

      /* ════════════════════════════════════

      /* ── Utility classes (extracted from repeated inline styles) ── */

      /* Layout — flex column */
      .u-col      { display: flex; flex-direction: column; }
      .u-col-fill { display: flex; flex-direction: column; flex: 1; min-height: 0; }
      .u-sec-body { display: flex; flex-direction: column; gap: 0; padding: 10px 10px 8px; }

      /* Layout — flex row */
      .u-row-4    { display: flex; align-items: center; gap: 4px; }
      .u-row-5    { display: flex; align-items: center; gap: 5px; }
      .u-row-6    { display: flex; align-items: center; gap: 6px; }
      .u-row-8    { display: flex; align-items: center; gap: 8px; }
      .u-row-10   { display: flex; align-items: center; gap: 10px; }
      .u-panel-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
      .u-row-sb   { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; position: relative; z-index: 2; gap: 4px; }
      .u-row-sb-w { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; position: relative; z-index: 2; gap: 4px; flex-wrap: nowrap; }
      .u-inline-row { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; }

      /* Layout — flex child */
      .u-flex-ovh     { flex: 1; overflow: hidden; }
      .u-flex-rel     { flex: 1; position: relative; z-index: 2; }
      .u-flex-ovh-rel { flex: 1; overflow: hidden; position: relative; z-index: 2; }
      .u-rel-shrink0  { position: relative; top: 0; right: 0; flex-shrink: 0; }

      /* Text */
      .u-truncate    { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .u-nowrap-sm   { white-space: nowrap; font-size: 11px; }
      .u-xs-muted    { font-size: 10px; color: var(--is-text-muted); }
      .u-xxs-muted   { font-size: 9px; color: var(--is-text-muted); }
      .u-xxs-dim     { font-size: 9px; color: rgba(255,255,255,0.3); padding: 8px 0; }
      .u-sm-label    { font-size: 11px; color: var(--is-text-label); }
      .u-sm-text     { font-size: 12px; font-weight: 600; color: var(--is-text); }
      .u-section-hdr { font-size: 11px; font-weight: 600; color: var(--is-text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
      .u-cell-pad    { padding: 7px 8px; white-space: nowrap; font-size: 10px; color: var(--is-text-sec); }

      /* Empty states */
      .u-empty     { text-align: center; color: var(--is-text-muted); padding: 30px; }
      .u-empty-lg  { text-align: center; color: var(--is-text-muted); padding: 40px; }
      .u-empty-dim { text-align: center; color: rgba(255,255,255,0.3); padding: 40px; }

      /* Structural */
      .u-panel     { background: rgba(255,255,255,0.04); border-radius: 10px; padding: 10px 14px; }
      .u-bg-icon   { position: absolute; bottom: -15px; right: -15px; opacity: 0.025; pointer-events: none; z-index: 0; color: #fff; line-height: 0; }
      .u-divider-b { border-bottom: 1px solid var(--is-divider); }
      .u-fade-in   { animation: fade-in 0.8s ease-out both; }
      .u-media-badge   { font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.92); background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); padding: 2px 6px; border-radius: 4px; line-height: 1; }
      /* On narrow cards the title must yield to the count badge, not push it out */
      .u-row-sb .u-media-badge, .u-row-sb-w .u-media-badge { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .u-row-sb .ui-badge, .u-row-sb-w .ui-badge { max-width: 60%; overflow: hidden; text-overflow: ellipsis; }
      .u-media-badge-s { font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.92); background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); padding: 2px 6px; border-radius: 4px; line-height: 1; flex-shrink: 0; }

      /* Icon sizes */
      .icon-15   { --mdc-icon-size: 15px; }
      .icon-11-st { --mdc-icon-size: 11px; color: rgba(var(--arr-st-rgb, 255, 255, 255), 0.85); }

      /* ── Library category ── */
      .lib-tile-card { position: relative; cursor: pointer; border-radius: 10px; overflow: hidden; }
      .lib-tile-grid {
        position: relative; aspect-ratio: 2/3;
        display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
        overflow: hidden; border-radius: 10px;
      }
      .lib-sub-poster { overflow: hidden; }
      .lib-sub-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .lib-sub-empty { background: rgba(255,255,255,0.05); }
      .lib-tile-dim {
        position: absolute; inset: 0; background: rgba(0,0,0,0.15);
        z-index: 1; pointer-events: none;
      }
      .lib-tile-arrow {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        z-index: 2; pointer-events: none;
        opacity: 0; transition: opacity .18s;
      }
      .lib-tile-card:hover .lib-tile-arrow { opacity: 1; }
      .lib-tile-card:hover .smp-btn { transform: scale(1.1); }
      .lib-tile-card .media-type-tag { z-index: 3; }

      /* ── Library modal controls ── */
      .lib-search-input {
        flex: 1; min-width: 0; height: 30px; border-radius: 7px; padding: 0 10px;
        border: 1px solid var(--is-btn-bdr); background: var(--is-btn-bg);
        color: var(--is-text-body); font-size: 12px; font-family: inherit; outline: none;
      }
      .lib-search-input::placeholder { opacity: 0.45; }
      .lib-sort-sel {
        height: 30px; border-radius: 7px; padding: 0 8px;
        border: 1px solid var(--is-btn-bdr); background: var(--is-btn-bg);
        color: var(--is-text-body); font-size: 12px; font-family: inherit; outline: none; cursor: pointer;
      }
      .lib-sort-dir-btn {
        height: 30px; width: 30px; border-radius: 7px; flex-shrink: 0;
        border: 1px solid var(--is-btn-bdr); background: var(--is-btn-bg);
        color: var(--is-text-body); font-size: 14px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      }
      .lib-view-btn {
        height: 28px; width: 28px; border-radius: 6px; flex-shrink: 0;
        border: 1px solid var(--is-btn-bdr); background: var(--is-btn-bg);
        color: var(--is-text-body); cursor: pointer;
        display: flex; align-items: center; justify-content: center; transition: all .15s;
      }
      .lib-view-active { background: rgba(10,132,255,0.25); border-color: rgba(10,132,255,0.5); }
      .lib-fb {
        height: 26px; padding: 0 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
        border: 1px solid var(--is-btn-bdr); background: var(--is-btn-bg);
        color: var(--is-text-body); cursor: pointer; transition: all .15s;
      }
      .lib-fb-active { background: rgba(10,132,255,0.25); border-color: rgba(10,132,255,0.5); }
      .lib-table-row { cursor: pointer; }
      .lib-table-row:hover td { background: var(--is-row-hover, rgba(255,255,255,0.05)); }

      /* Maintainerr */
      .mt-col-card:hover { transform: scale(1.02); }
      .mt-col-poster:hover .mt-col-excl-overlay { opacity: 1 !important; }
    
      /* Touch targets: the container query shrinks these for narrow cards, which
         on a phone means a 22px tap area — override it back up. */
      @media (max-width: 600px) {
        /* 36px = the paging buttons' size, the card's mobile touch-target floor */
        .btn-add, .req-withdraw { width: 36px; height: 36px; }
        .btn-add ha-icon, .btn-add svg { --mdc-icon-size: 19px; width: 19px; height: 19px; }
        .req-overlay .req-cancel,
        .req-overlay .req-confirm { width: 36px; height: 36px; }
        .req-overlay .req-cancel svg,
        .req-overlay .req-confirm svg { width: 16px; height: 16px; }
        .is-confirm-btn { width: 44px; height: 44px; }
        .is-confirm-btn svg { width: 18px; height: 18px; }
        .is-confirm-actions { gap: 12px; }
        /* The add overlay has room on a phone — give its controls a real tap size */
        .req-overlay .req-tabs { --req-tab-pad: 3px; }
        .req-overlay .req-tab { height: 28px; font-size: 11px; }
        .req-overlay .req-panel .mt-fsel { height: 30px; font-size: 11px; }
        .req-overlay .req-label { font-size: 10px; }
      }
    
      /* The OS "reduce motion" setting. The card runs endless animations
         (spinners, the download stripe, skeletons) that keep a frame
         scheduled for as long as it is on screen. Shortened rather than
         removed, so code waiting for animationend still hears it. */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;
