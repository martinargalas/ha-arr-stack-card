// The card's shared UI kit: the segmented peanut, the toolbar, selects and
// field selects, round buttons, grid and paging maths, the sliding nav fill, and
// Maintainerr's "leaving soon" badges on posters. It grew up inside the
// Maintainerr modal, but Library, Search, Similar titles, Activity, the calendar
// and the request overlays all draw with it, so it is core — only the Maintainerr
// modal itself loads on demand (chunks/maintainerr.js).

export const MT_BTN = `background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:999px;color:var(--is-text);font-size:12px;height:32px;padding:0 14px;box-sizing:border-box;cursor:pointer;outline:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-weight:600;white-space:nowrap`;
export const _ICO_CHECK = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
export const MT_ACCENTS = {
  blue:  ['rgba(0,122,255,0.2)',   'rgba(0,122,255,0.5)',   '#007aff'],
  red:   ['rgba(248,113,113,0.14)','rgba(248,113,113,0.35)','#e5484d'],
  green: ['rgba(52,211,153,0.14)', 'rgba(52,211,153,0.35)', '#0f9d60'],
};

class _MtKitMethods {

  // Same rules the detail popup uses for its instance chips: the 4K flag wins,
  // then the Seerr names but only when both are set and short, else generic.
  _arrInstLabels(kind) {
    const MAX = 10;
    const isRadarr = kind === 'radarr';
    const s1 = isRadarr ? this._seerrRadarr  : this._seerrSonarr;
    const s2 = isRadarr ? this._seerrRadarr2 : this._seerrSonarr2;
    if (s2?.is4k) return ['HD', '4K'];
    const n1 = s1?.name, n2 = s2?.name;
    if (n1 && n2 && n1.length <= MAX && n2.length <= MAX) return [n1, n2];
    return isRadarr ? ['Radarr 1', 'Radarr 2'] : ['Sonarr 1', 'Sonarr 2'];
  }

  _mtArrServerName(c) {
    const rule = (this._maintainerr?.rules || []).find(r => r.collectionId === c.id);
    const rId  = c.radarrSettingsId ?? rule?.radarrSettingsId ?? null;
    const sId  = c.sonarrSettingsId ?? rule?.sonarrSettingsId ?? null;
    const srv  = this._maintainerrArrServers || {};
    const list = rId != null ? (srv.radarr || []) : sId != null ? (srv.sonarr || []) : [];
    const want = rId != null ? rId : sId;
    if (want == null) return null;
    const hit = list.find(x => String(x.id) === String(want));
    if (!hit) return null;
    // Prefer the user's own Seerr naming so every instance reads the same across
    // the card. Maintainerr keys its servers on its own ids, so the only reliable
    // join between the two is the address they both point at.
    return this._seerrNameForHost(hit, rId != null ? 'radarr' : 'sonarr')
        || hit.name || hit.serverName || null;
  }

  _mtBtnA(kind) {
    const [bg, bdr, tint] = MT_ACCENTS[kind] || MT_ACCENTS.blue;
    const color = this._isDay ? tint : '#fff';
    return `${MT_BTN};background:${bg};border-color:${bdr};color:${color};font-weight:700`;
  }

  // Maintainerr names a collection after its rule, and the same rule duplicated
  // for a second Radarr/Sonarr instance produces two identically named ones.
  // Prefix with the arr server, but only where the ambiguity actually exists.
  _mtColLabel(c, all) {
    const base = c.title || c.name || `#${c.id}`;
    const same = (all || []).filter(x => (x.title || x.name || `#${x.id}`) === base);
    if (same.length < 2) return base;
    const srv = this._mtArrServerName(c);
    return srv ? `${srv} — ${base}` : base;
  }

  // Red while deletion is imminent, amber once it is more than a work-week out
  // `prefix` names the exact thing being deleted (a season, say) and goes on
  // its own line, so "Season 4 / GONE AUGUST 25TH" reads as one statement.
  _mtDelBadge(dueMs, compact, prefix = '', stretch = false) {
    if (dueMs == null) return '';
    // "Never" means nowhere, Maintainerr's own tabs included
    if (this._posterCfg().goneTag === 'off') return '';
    const days = Math.max(0, Math.ceil((dueMs - Date.now()) / 86400000));
    // One colour for every horizon — a deletion is a deletion, and the amber
    // variant read as a milder warning than it was.
    const bg = 'radial-gradient(circle at 50% 50%, #ff3b30 0%, #ff2d20 38%, #8e1410 100%)';
    const full = prefix ? `${prefix} — ${this._mtGoneText(days, dueMs, false)}` : this._mtGoneText(days, dueMs, false);
    // "GONE AUGUST 26TH" is wider than a poster at 11px/nowrap, and clipping it
    // looked like a rendering fault. Wrapping keeps it inside; spanning the
    // poster's full width between the type tag's margins buys back a size.
    const base = `font-size:10px;font-weight:800;letter-spacing:0.02em;color:#fff;background:${bg};border:1px solid #ff3b30;border-radius:5px;max-width:100%;box-sizing:border-box;white-space:normal;text-align:center;line-height:1.2;box-shadow:0 2px 8px rgba(0,0,0,0.45)${stretch ? ';flex:1' : ''}`;

    if (prefix && compact) {
      return `<span title="${this._escHtml(full)}" style="${base};padding:3px 6px">${this._escHtml(prefix)} ${this._escHtml(this._mtGoneText(days, dueMs, true))}</span>`;
    }
    if (prefix) {
      return `<span title="${this._escHtml(full)}" style="${base};display:inline-flex;flex-direction:column;align-items:center;gap:2px;padding:3px 6px">
        <span>${this._escHtml(prefix)}</span>
        <span>${this._escHtml(this._mtGoneText(days, dueMs, false))}</span>
      </span>`;
    }
    return `<span title="${this._escHtml(full)}" style="${base};padding:3px 6px">${this._escHtml(this._mtGoneText(days, dueMs, compact))}</span>`;
  }

  _mtDragHandleHtml(cd, isMob) {
    if (isMob) return '';
    const MT_COLS_MIN = 3, MT_COLS_MAX = 12, TRACK_W = 120, INSET = 7;
    const cur = cd._mtCols || 7;
    const thumbPx = Math.round((cur - MT_COLS_MIN) / (MT_COLS_MAX - MT_COLS_MIN) * (TRACK_W - INSET * 2)) + INSET;
    // White-on-white washed the whole control out in day mode; the track, the
    // filled portion and the knob each need an opaque counterpart.
    const day = this._isDay;
    const track = day ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.18)';
    const fill  = day ? 'rgba(0,0,0,0.42)' : 'rgba(255,255,255,0.45)';
    const knob  = day ? '#ffffff' : 'rgba(255,255,255,0.85)';
    const knobBdr = day ? 'border:1px solid rgba(0,0,0,0.30);' : '';
    const shadow = day ? '0 1px 3px rgba(0,0,0,0.30)' : '0 1px 4px rgba(0,0,0,0.4)';
    return `<div id="mt-drag-handle" style="position:absolute;right:0;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:6px;padding:6px 0 6px 8px;touch-action:none;user-select:none;cursor:ew-resize">
      <div id="mt-drag-track" style="position:relative;width:${TRACK_W}px;height:3px;background:${track};border-radius:2px;cursor:ew-resize">
        <div style="position:absolute;top:0;left:0;width:${thumbPx}px;height:100%;background:${fill};border-radius:2px;pointer-events:none"></div>
        <div id="mt-drag-thumb" style="position:absolute;top:50%;left:${thumbPx}px;transform:translateY(-50%);width:15px;height:15px;border-radius:50%;background:${knob};${knobBdr}box-shadow:${shadow};pointer-events:none;margin-left:-7px;box-sizing:border-box"></div>
      </div>
    </div>`;
  }

  // Maintainerr stores when an item entered a collection, not when it leaves —
  // the deletion date is addDate + the collection's deleteAfterDays.
  _mtDueMs(addDate, deleteAfterDays) {
    if (!addDate || !deleteAfterDays) return null;
    const added = new Date(addDate).getTime();
    if (!Number.isFinite(added)) return null;
    return added + deleteAfterDays * 86400000;
  }

  // The toolbar's select reduced to a bare label; forms need the same control
  // wearing field chrome — full width, soft fill, chevron pinned right.
  _mtFieldSelect(id, items, current, extra = '') {
    const cur = String(current ?? '');
    const found = items.find(([v]) => String(v) === cur);
    const label = found ? found[1] : (items[0]?.[1] || '');
    const opts = items.map(([v, l]) =>
      `<option value="${this._escHtml(String(v))}"${String(v) === cur ? ' selected' : ''}>${this._escHtml(l)}</option>`).join('');
    return this._mtFieldSelectRaw(`id="${id}"`, opts, label, extra);
  }

  // The rule editor's selects carry data-attributes rather than ids and build
  // their options with optgroups, so they hand over ready-made option HTML and
  // the label they want shown. Same capsule either way.
  _mtFieldSelectRaw(attrs, optsHtml, label, extra = '') {
    const chev = `<svg class="mt-tb-chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    return `<span class="mt-field mt-fsel" style="${extra}">
      <span class="mt-fsel-lbl">${this._escHtml(label ?? '')}</span>${chev}
      <select ${attrs}>${optsHtml}</select>
    </span>`;
  }

  // Near-term deletions read better as words ("gone tomorrow") than as a count;
  // anything further out is clearer as the actual date.
  _mtGoneText(days, dueMs, compact) {
    const lang = this._lg();
    const cs = lang === 'cs', fr = lang === 'fr';
    if (compact) return days === 0 ? (cs ? 'DNES' : fr ? 'AUJOURD’HUI' : 'TODAY') : `${days}${fr ? 'J' : 'D'}`;
    if (days === 0) return cs ? 'MIZÍ DNES' : fr ? 'SUPPRIMÉ AUJOURD’HUI' : 'GONE TODAY';
    if (days === 1) return cs ? 'MIZÍ ZÍTRA' : fr ? 'SUPPRIMÉ DEMAIN' : 'GONE TOMORROW';
    if (days <= 5) return cs ? `MIZÍ ZA ${days} ${days < 5 ? 'DNY' : 'DNÍ'}` : fr ? `SUPPRIMÉ DANS ${days} JOURS` : `GONE IN ${days} DAYS`;

    const d = new Date(dueMs);
    if (cs) return `MIZÍ ${d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}`.toUpperCase();
    if (fr) return `SUPPRIMÉ LE ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`.toUpperCase();
    const dd = d.getDate();
    const tens = dd % 100;
    const suf = (tens >= 11 && tens <= 13) ? 'th'
      : dd % 10 === 1 ? 'st' : dd % 10 === 2 ? 'nd' : dd % 10 === 3 ? 'rd' : 'th';
    return `GONE ${d.toLocaleDateString('en-US', { month: 'long' })} ${dd}${suf}`.toUpperCase();
  }

  // `holder` carries the measured box of the grid; Similar titles lays its own
  // grid out the same way and passes its state.
  _mtGridCalc(cd, toolbarH = 90, holder = this._maintainerrModal) {
    const isMob = this._isMob;
    const m = holder;
    const vH = window.innerHeight;
    const vW = window.innerWidth;
    const bodyPX = isMob ? 20 : 40;
    const gap = 14;
    // Phones have no column slider, and the "Gone <date>" pill needs the poster
    // width — so the count is pinned to two rather than following the desktop
    // preference.
    const MT_COLS_MIN = isMob ? 2 : 3, MT_COLS_MAX = isMob ? 2 : 12;

    // Once the grid is on screen its wrapper reports the real box. The estimate
    // below only covers the very first paint — it is deliberately pessimistic,
    // which used to cost a whole row of posters.
    const contentW = m?._gridW || (Math.min(1100, vW * 0.96) - bodyPX);
    const availH = m?._gridAvailH || (vH * 0.88 - 60 - 24 - toolbarH - 48);

    let cols;
    if (cd._mtCols) {
      cols = cd._mtCols;
    } else {
      const saved = parseInt(localStorage.getItem('arr-mt-cols'));
      if (saved >= 3 && saved <= 12) {
        cols = saved;
      } else {
        const minW = isMob ? 70 : 110;
        const maxC = Math.floor((contentW + gap) / (minW + gap));
        cols = Math.max(isMob ? 3 : 4, Math.min(maxC, 8));
      }
      cd._mtCols = cols;
    }
    cols = Math.max(MT_COLS_MIN, Math.min(MT_COLS_MAX, cols));
    const posterW = (contentW - gap * (cols - 1)) / cols;
    const posterH = posterW * 1.5;
    // Sub-pixel poster heights can leave a row a fraction short of fitting
    let rowsFit = Math.max(1, Math.floor((availH + gap + 1) / (posterH + gap)));

    // On a phone two columns fill the width with posters too tall for a second
    // row, leaving half the modal empty. Size them from the available height
    // instead and centre the narrower grid — a 2x2 page beats a 2x1 one.
    let gridMaxW = null;
    if (isMob && rowsFit < 2) {
      const fitH = (availH - gap) / 2;
      const fitW = fitH / 1.5;
      const wanted = cols * fitW + gap * (cols - 1);
      if (fitW > 40 && wanted <= contentW) {
        gridMaxW = Math.floor(wanted);
        rowsFit = 2;
      }
    }

    const perPage = cols * rowsFit;
    return { cols, perPage, gap, gridMaxW };
  }

  _mtLibName(libraryId) {
    const libs = this._maintainerrLibraries || [];
    const lib = libs.find(l => String(l.id) === String(libraryId));
    return lib?.title || lib?.name || `Lib ${libraryId}`;
  }

  // Round action button in the same family as the header's back/close controls.
  // Text moves to `title`, so keep these to actions whose icon is unambiguous
  // within their own view.
  _mtRoundBtn(attr, icon, title, { size = 28, tone = 'blue', busy = false, active = true, disabled = false } = {}) {
    const off = busy || disabled;
    // A white glyph over a 30%-alpha tint disappears on a light background, so
    // day mode keeps the tint as the fill and paints the glyph in the solid
    // brand colour instead.
    const day = this._isDay;
    const TONES = {
      blue:  ['0,122,255',  '0.50', '0.30', '#0060df'],
      green: ['52,211,153', '0.50', '0.28', '#0b7c4c'],
      red:   ['248,113,113', '0.50', '0.28', '#d1373c'],
    };
    const [rgb, bdrA, bgA, solid] = TONES[tone] || TONES.blue;
    const sty = active
      ? (day
        ? `border:1px solid rgba(${rgb},0.65);background:rgba(${rgb},0.18);color:${solid}`
        : `border:1px solid rgba(${rgb},${bdrA});background:rgba(${rgb},${bgA});color:#fff`)
      : 'border:1px solid var(--is-divider);background:var(--is-btn-bg);color:var(--is-text-muted)';
    return `<button ${attr} title="${this._escHtml(title)}"${off ? ' disabled' : ''} style="width:${size}px;height:${size}px;padding:0;border-radius:50%;cursor:${off ? 'default' : 'pointer'};display:flex;align-items:center;justify-content:center;line-height:0;flex-shrink:0;transition:background 0.15s,color 0.15s;backdrop-filter:blur(8px);${disabled && !busy ? 'opacity:0.55;' : ''}${sty}">${busy ? '<span class="is-spin"></span>' : icon}</button>`;
  }

  // Overview posters reuse the library grid's chrome (.mc shell, gradient
  // footer, rating + status badges) so both views read the same. Size and
  // quality-profile tags are dropped — neither is relevant to a deletion queue.
  // One season reads better spelled out; several are compressed to S01-S03,
  // falling back to a list when the numbers are not consecutive.
  _mtSeasonLabel(seasons) {
    const list = [...new Set((seasons || []).filter(n => n != null))].sort((a, b) => a - b);
    if (!list.length) return '';
    if (list.length === 1) return `${this._t('mtSeason')} ${list[0]}`;
    const pad = n => `S${String(n).padStart(2, '0')}`;
    const contiguous = list.every((n, i) => i === 0 || n === list[i - 1] + 1);
    return contiguous ? `${pad(list[0])}-${pad(list[list.length - 1])}` : list.map(pad).join(', ');
  }

  // Icons used by the view switches
  get _mtSegIcons() {
    const F = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15" style="display:block"';
    return {
      cards: `<svg ${F}><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/></svg>`,
      table: `<svg ${F}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
      // Both keep the calendar frame and differ only in what fills it: one band
      // for a week, a grid of days for a month.
      week: `<svg ${F}><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><rect x="5.5" y="12" width="13" height="3.5" rx="1" fill="currentColor" stroke="none"/></svg>`,
      month: `<svg ${F}><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><g fill="currentColor" stroke="none"><circle cx="7.5" cy="12.5" r="1.15"/><circle cx="12" cy="12.5" r="1.15"/><circle cx="16.5" cy="12.5" r="1.15"/><circle cx="7.5" cy="16.5" r="1.15"/><circle cx="12" cy="16.5" r="1.15"/><circle cx="16.5" cy="16.5" r="1.15"/></g></svg>`,
      // Same glyphs the Library type filter uses, so a film strip means movies
      // and a set means TV wherever the switch appears
      movie: `<svg ${F}><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/></svg>`,
      tv: `<svg ${F}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
      music: `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="display:block"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/></svg>`,
    };
  }

  // Two-option pill switch. `animatePrev` renders it still showing the old
  // choice so the wire layer can flip it next frame and let the fill slide —
  // a freshly inserted element would jump straight to its end state.
  _mtSegmented(attr, opts, current, { icons = false, animatePrev = false, width = null, accent = null, prev = null, accentAlpha = null } = {}) {
    const varW = opts.some(o => o.w);
    if (varW) {
      const ws = opts.map(o => o.w || width || 44);
      const xs = ws.map((_, i) => ws.slice(0, i).reduce((a, b) => a + b, 0));
      const to = Math.max(0, opts.findIndex(o => o.v === current));
      const fromIdx = prev != null ? opts.findIndex(o => o.v === prev) : -1;
      const from = animatePrev ? (fromIdx >= 0 ? fromIdx : (to === 0 ? 1 : 0)) : to;
      // A half with no explicit width sizes itself around its content; the
      // indicator is measured off the real halves afterwards (_syncSegVars),
      // so nothing here has to guess how wide an icon pair comes out.
      const halves = opts.map((o, i) =>
        `<span class="mt-seg-half${o.disabled ? ' is-disabled' : ''}" ${o.attr || ''} style="${o.w ? `width:${o.w}px` : 'width:auto;padding:0 9px'}" title="${this._escHtml(o.label)}">${o.icon || this._escHtml(o.label)}</span>`
      ).join('');
      const vars = [
        ...ws.map((w, i) => `--w${i}:${w}px`),
        ...xs.map((x, i) => `--x${i}:${x}px`),
        accent ? `--seg-accent:rgba(${accent},${accentAlpha ?? (this._isDay ? 0.85 : 0.5)});--seg-accent-bdr:rgba(${accent},${this._isDay ? 0.95 : 0.8})` : '',
      ].filter(Boolean).join(';');
      // Fresh markup carries only the caller's guess at the widths; the real
      // ones arrive a frame later from _syncSegVars. With the indicator's
      // transition live, that correction plays as a slide — on every peanut on
      // the page, every time any section re-renders. It is muted until synced.
      return `<div class="mt-seg mt-seg--var mt-seg--presync${icons ? ' mt-seg--icon' : ''}" ${attr} data-seg="${from}" data-seg-to="${to}" style="${vars}">
        <span class="mt-seg-ind"></span>
        ${halves}
      </div>`;
    }
    const to = Math.max(0, opts.findIndex(o => o.v === current));
    const fromIdx = prev != null ? opts.findIndex(o => o.v === prev) : -1;
    const from = animatePrev ? (fromIdx >= 0 ? fromIdx : (to === 0 ? 1 : 0)) : to;
    const halves = opts.map(o =>
      `<span class="mt-seg-half${o.disabled ? ' is-disabled' : ''}" ${o.attr || ''} title="${this._escHtml(o.label)}">${o.icon || this._escHtml(o.label)}</span>`
    ).join('');
    const vars = [
      width ? `--seg-w:${width}px` : '',
      // Same reasoning as _tabFill: the selected half's label is white, so day
      // mode needs a fill solid enough to carry it.
      // accentAlpha lets a caller match the header nav's near-solid fill; the
      // default stays translucent, which is what a peanut on a card wants.
      accent ? `--seg-accent:rgba(${accent},${accentAlpha ?? (this._isDay ? 0.85 : 0.5)});--seg-accent-bdr:rgba(${accent},${this._isDay ? 0.95 : 0.8})` : '',
    ].filter(Boolean).join(';');
    return `<div class="mt-seg${icons ? ' mt-seg--icon' : ''}" ${attr} data-seg="${from}" data-seg-to="${to}"${vars ? ` style="${vars}"` : ''}>
      <span class="mt-seg-ind"></span>
      ${halves}
    </div>`;
  }

  // `neutral` is the value that means "not filtering" — on it the trigger goes
  // muted, so the accent is left to say which filters are actually set.
  _mtSelect(id, items, current, neutral = null) {
    const cur = String(current ?? '');
    const found = items.find(([v]) => String(v) === cur);
    const label = found ? found[1] : (items[0]?.[1] || '');
    const off = neutral != null && cur === String(neutral);
    const opts = items.map(([v, l]) =>
      `<option value="${this._escHtml(String(v))}"${String(v) === cur ? ' selected' : ''}>${this._escHtml(l)}</option>`).join('');
    const chev = `<svg class="mt-tb-chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    return `<span class="mt-tb-sel${off ? ' is-off' : ''}">
      <span class="mt-tb-lbl">${this._escHtml(label)}</span>${chev}
      <select id="${id}">${opts}</select>
    </span>`;
  }

  // A select entry may hand over ready-made HTML instead of items — the Library's
  // sort is a custom dropdown, because a native select cannot report the same
  // option being picked twice, which is how the direction is toggled.
  _mtToolbar(searchId, searchValue, selects, placeholder, style = '') {
    const ico = `<svg class="mt-tb-ico" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    // `neutral` marks the value that means "not filtering", so the accent is
    // left to say which filters are actually narrowing anything.
    const ctrls = selects.filter(Boolean).map(s => s.html ?? this._mtSelect(s.id, s.items, s.value, s.neutral ?? null)).join('');
    const search = searchId
      ? `${ico}<input id="${searchId}" class="mt-tb-input" type="search" value="${this._escHtml(searchValue || '')}" placeholder="${placeholder ?? this._t('mtSearch')}" autocomplete="off">`
      : '';
    return `<div class="mt-tb"${style ? ` style="${style}"` : ''}>
      ${search}
      ${ctrls ? `${search ? '<span class="mt-tb-sep"></span>' : ''}${ctrls}` : ''}
    </div>`;
  }

  _seerrNameForHost(srvEntry, kind) {
    const hosts = this._arrHosts || {};
    if (!Object.keys(hosts).length) return null;
    const raw = srvEntry?.url || srvEntry?.hostname || srvEntry?.host || '';
    let want = '';
    try {
      const u = new URL(/^https?:\/\//.test(raw) ? raw : `http://${raw}`);
      const port = u.port || (srvEntry?.port ? String(srvEntry.port) : (u.protocol === 'https:' ? '443' : '80'));
      want = `${u.hostname.toLowerCase()}:${port}`;
    } catch (_) { return null; }
    const first  = kind === 'radarr' ? 'radarr'  : 'sonarr';
    const second = kind === 'radarr' ? 'radarr2' : 'sonarr2';
    const [l1, l2] = this._arrInstLabels(kind);
    if (hosts[first]  === want) return l1;
    if (hosts[second] === want) return l2;
    return null;
  }

  // The indicator of a variable-width peanut is a single absolutely positioned
  // pill, so it can only follow the halves if it is told their real geometry.
  // Measuring beats the widths the caller guessed: an icon pair renders wider
  // or narrower than any number written by hand, and then the fill sits off.
  _syncSegVars(scope) {
    (scope || this.shadowRoot)?.querySelectorAll('.mt-seg--var').forEach(seg => {
      const halves = [...seg.querySelectorAll('.mt-seg-half')];
      if (!halves.length) return;
      const base = halves[0].offsetLeft;
      halves.forEach((h, i) => {
        seg.style.setProperty(`--w${i}`, `${h.offsetWidth}px`);
        seg.style.setProperty(`--x${i}`, `${h.offsetLeft - base}px`);
      });
      if (seg.classList.contains('mt-seg--presync')) {
        // Reflow first, so the corrected geometry is what the transition is
        // switched back on over — not something it animates from.
        void seg.offsetWidth;
        seg.classList.remove('mt-seg--presync');
      }
    });
  }

  // Deletion dates live on the collection membership rows, not on library items,
  // so build one mediaServerId -> daysLeft map from every collection's contents.
  // Refreshed with every poll, not cached on first open: the Maintainerr
  // category card previews the next deletions, so this has to stay current
  // whether or not the modal was ever opened.
  async _mtLoadDelMap(modal) {
    if (this._mtDelLoading) return;
    const cols = this._maintainerr?.collections || [];
    if (!cols.length) { this._mtDelMap = new Map(); this._mtDelItems = []; return; }
    const map = new Map();
    // The media-server ids in `map` only help inside Maintainerr's own views.
    // Every other category knows its titles by tmdb/tvdb, so the queue gets a
    // second index those can actually look themselves up in.
    const ext = new Map();
    // Which collections a title actually sits in. `ext` only keeps the soonest
    // deletion per title, so it cannot answer that on its own.
    const memb = new Map();
    const items = [];
    this._mtDelLoading = true;
    try {
      const results = await Promise.all(cols.map(c =>
        this._hass.callApi('GET', `arr_stack/maintainerr/collections/media/${c.id}/content/1?size=1000`).catch(() => null)
      ));
      results.forEach((data, i) => {
        const c = cols[i];
        const arr = Array.isArray(data) ? data : data?.items || data?.data || [];
        arr.forEach(row => {
          const due = this._mtDueMs(row.addDate, c.deleteAfterDays);
          if (due == null || !row.mediaServerId) return;
          // An item can sit in several collections — surface the soonest deletion
          const put = (key, entry) => {
            if (!key) return;
            const prev = map.get(String(key));
            if (!prev || entry.due < prev.due) map.set(String(key), entry);
          };
          put(row.mediaServerId, { due, colTitle: c.title });

          // Movie and TV tmdb ids are separate namespaces, so the kind is part
          // of the key. Seasons falling on the same day collect into a range;
          // an earlier day always wins outright.
          const _md = row.mediaData;
          const _isMovie = (_md?.type || c.type) === 'movie';
          const _season = _md?.type === 'season' ? _md.index : null;
          const extKeys = _isMovie
            ? (row.tmdbId ? [`mv:${row.tmdbId}`] : [])
            : [
              ...(row.tvdbId ? [`tv:tvdb:${row.tvdbId}`] : []),
              ...(row.tmdbId ? [`tv:tmdb:${row.tmdbId}`] : []),
            ];
          const _day = ms => Math.floor(ms / 86400000);
          for (const k of extKeys) {
            let set = memb.get(k);
            if (!set) { set = new Set(); memb.set(k, set); }
            set.add(String(c.id));
          }
          for (const k of extKeys) {
            const prev = ext.get(k);
            if (!prev || _day(due) < _day(prev.due)) {
              ext.set(k, { due, seasons: _season != null ? [_season] : [], colId: c.id, colTitle: c.title });
            } else if (_day(due) === _day(prev.due)) {
              prev.due = Math.min(prev.due, due);
              if (_season != null && !prev.seasons.includes(_season)) prev.seasons.push(_season);
            }
          }

          // A queued season also belongs on its show's poster in Overview, which
          // browses shows and never sees the season's own id. Seasons falling on
          // the same day are collected so the badge can show them as a range;
          // an earlier day always wins outright, since claiming "S01-S03" for a
          // date only S01 is due on would be wrong.
          const md = row.mediaData;

          // Flat list backing the calendar: one entry per scheduled deletion
          const isSeason = md?.type === 'season';
          const base = isSeason ? (md.parentTitle || md.title) : (md?.title || `#${row.mediaServerId}`);
          items.push({
            due,
            addDate: row.addDate,
            title: isSeason && md.index != null ? `${base} — ${this._t('mtSeason')} ${md.index}` : base,
            typeLabel: { movie: 'Movie', show: 'Show', season: 'Season', episode: 'Episode' }[md?.type] || (c.type || '—'),
            colId: c.id,
            colTitle: c.title || `#${c.id}`,
            // Enough to open the media detail popup straight from the calendar
            tmdbId: row.tmdbId ?? null,
            tvdbId: row.tvdbId ?? null,
            popupType: (md?.type || c.type) === 'movie' ? 'movie' : 'tv',
            // Kept so the calendar can render the same poster card as elsewhere
            raw: row,
            mediaType: md?.type || c.type || 'movie',
            seasonIndex: isSeason ? md.index : null,
          });

          if (isSeason && md.parentId != null) {
            const key = String(md.parentId);
            const prev = map.get(key);
            const day = ms => Math.floor(ms / 86400000);
            if (!prev || !prev.seasons || day(due) < day(prev.due)) {
              map.set(key, { due, colTitle: c.title, seasons: [md.index] });
            } else if (day(due) === day(prev.due)) {
              prev.due = Math.min(prev.due, due);
              prev.seasons.push(md.index);
            }
          }
        });
      });
    } catch (e) {
      console.warn('[arr-card] Maintainerr deletion map:', e);
    } finally {
      this._mtDelLoading = false;
    }
    this._mtDelMap = map;
    this._mtDelExt = ext;
    this._mtColMemb = memb;
    this._mtDelItems = items;
    const tab = this._maintainerrModal?.tab;
    if (modal && (tab === 'overview' || tab === 'calendar')) this._mtLoadTab(tab, modal);
  }

  _mtParsePageN(val, curPage, totalPages) {
    const last = Math.max(0, totalPages - 1);
    if (val === 'first') return 0;
    if (val === 'last')  return last;
    if (val === 'prev')  return Math.max(0, curPage - 1);
    if (val === 'next')  return Math.min(last, curPage + 1);
    const n = parseInt(val);
    return Number.isFinite(n) ? Math.max(0, Math.min(last, n)) : curPage;
  }

  // Geometry of the fill as it stands, so a re-render can start the animation
  // from where the old one actually was rather than from where the previous tab
  // is assumed to be — on the first open that assumption was wrong and the fill
  // jumped instead of sliding.
  // Generic: any .mt-nav with an .mt-nav-ind. Maintainerr and Activity share it.
  _navIndRect(nav) {
    const ind = nav?.querySelector('.mt-nav-ind');
    if (!ind) return null;
    const w = parseFloat(ind.style.width);
    const mt = /translateX\(([-\d.]+)px\)/.exec(ind.style.transform || '');
    if (!Number.isFinite(w) || !mt) return null;
    return { w, x: parseFloat(mt[1]) };
  }

  _syncNavInd(nav, btn, from) {
    const ind = nav?.querySelector('.mt-nav-ind');
    if (!nav || !ind || !btn) return;
    const to = { w: btn.offsetWidth, x: btn.offsetLeft };
    const apply = (r, animate) => {
      ind.style.transition = animate ? '' : 'none';
      ind.style.width = `${r.w}px`;
      ind.style.transform = `translateX(${r.x}px)`;
    };
    if (!from || (from.w === to.w && from.x === to.x)) { apply(to, false); return; }
    apply(from, false);
    // Two frames: the first commits the un-animated start, the second lets the
    // transition see a changed value.
    requestAnimationFrame(() => requestAnimationFrame(() => apply(to, true)));
  }


  // The open sub-tab track carries a fill of its own, placed the same way.
  _syncSubNavInd(nav, from) {
    const wrap = nav?.querySelector('.mt-nav-sub-wrap.is-open');
    if (!wrap) return;
    this._syncNavInd(wrap, wrap.querySelector('.mt-nav-sub.is-on'), from);
  }
}

export const mtKitMixin = _MtKitMethods.prototype;
