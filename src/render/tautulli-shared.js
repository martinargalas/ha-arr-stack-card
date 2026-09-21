// ──────────────────────────────────────────────────────────────────────────
// Tautulli — shared helpers (icons, formatters, toolbar, cols)
// ──────────────────────────────────────────────────────────────────────────

const _TL_COLS_SVG  = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>`;
const _TL_EDIT_SVG  = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const _TL_TRASH_SVG = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
const _TL_SEL_STY = `margin:0 4px;background:var(--is-row-hover,rgba(255,255,255,0.06));border:1px solid var(--is-divider,rgba(255,255,255,0.1));border-radius:6px;color:var(--is-text,#fff);padding:4px 8px;font-size:12px`;
const _TL_MENU_STY = `position:absolute;right:0;top:calc(100% + 4px);background:var(--is-menu-bg,#18182a);border:1px solid var(--is-divider,rgba(255,255,255,0.12));border-radius:8px;padding:6px 0;min-width:190px;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,0.18)`;

class _TautulliSharedMethods {

  // ── State helper ──────────────────────────────────────────────────────────

  _tlHidden(key, defaults) {
    const m = this._tautulliModal;
    if (!m) return new Set(defaults);
    if (!m[key]) m[key] = new Set(defaults);
    return m[key];
  }

  // ── Column prefs — HA user data (cross-device) ────────────────────────────

  async _tlLoadColPrefs() {
    try {
      const r = await this._hass.callWS({ type: 'frontend/get_user_data', key: 'arr-tl-cols' });
      return r?.value || {};
    } catch { return {}; }
  }

  _tlSaveColPrefs() {
    const m = this._tautulliModal;
    if (!m) return;
    const KEYS = ['libsHiddenCols','libsMobHiddenCols','usersHiddenCols','usersMobHiddenCols','histHiddenCols','histMobHiddenCols','udHistHiddenCols','udHistMobHiddenCols','ldHistHiddenCols','ldHistMobHiddenCols'];
    const value = {};
    for (const k of KEYS) if (m[k]) value[k] = [...m[k]];
    this._hass.callWS({ type: 'frontend/store_user_data', key: 'arr-tl-cols', value }).catch(() => {});
  }

  // ── Icons ─────────────────────────────────────────────────────────────────

  _tlMediaIcon(type, size) {
    const sz  = size || 15;
    const s   = `stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    const sty = `flex-shrink:0;vertical-align:middle;color:var(--is-text-sec)`;
    if (type === 'movie')   return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" ${s} style="${sty}"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 7h5M17 17h5"/></svg>`;
    if (type === 'episode') return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="currentColor" style="${sty}"><path d="M21,3H3A2,2 0 0,0 1,5V17A2,2 0 0,0 3,19H8V21H16V19H21A2,2 0 0,1 23,17V5A2,2 0 0,1 21,3M21,17H3V5H21V17Z"/></svg>`;
    if (type === 'track')   return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" ${s} style="${sty}"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
    if (type === 'live' || type === 'liveTV' || type === 'livetv') return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" ${s} style="${sty}"><rect x="2" y="8" width="20" height="13" rx="2"/><path d="M8 8L12 3l4 5"/></svg>`;
    // Some sources only tell us "something was played", not what kind
    if (type === 'generic') return `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" ${s} style="${sty}"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`;
    return '';
  }

  // ── Toolbar building blocks ───────────────────────────────────────────────

  _tlPerPageSelect(id, perPage, opts) {
    opts = opts || [10, 25, 50, 100];
    const options = opts.map(n => `<option value="${n}"${n === perPage ? ' selected' : ''}>${n}</option>`).join('');
    return `<select id="${id}" style="${_TL_SEL_STY}">${options}</select>`;
  }

  _tlEditBtn(id, active, label) {
    label = label || 'Edit';
    const icon = label === 'Delete' ? _TL_TRASH_SVG : _TL_EDIT_SVG;
    // The label doubles as the icon's switch, so only what is shown is translated.
    const shown = { Edit: this._t('tlEdit'), Delete: this._t('tlDelete') }[label] || label;
    // Toggles a mode rather than firing an action, so it uses the on/off pill.
    return `<button id="${id}" class="mt-tgl${active ? ' is-on' : ''}" title="${shown}" style="--tgl-on:rgba(229,57,53,0.75)">${icon}${shown}</button>`;
  }

  _tlColsMenu(btnId, menuId, items, isOpen, iconOnly = false) {
    // On a phone every bar action is icon-only, so the flag is implied there.
    const label = (iconOnly || this._isMob) ? '' : this._t('actColumns');
    // The menu is absolutely placed against this wrapper, so the button cannot
    // be handed to the bar on its own — the whole wrapper goes in.
    return `<span style="position:relative;flex-shrink:0"><button id="${btnId}" class="mt-tb-btn" title="${this._t('actColumns')}">${_TL_COLS_SVG}${label}</button><div id="${menuId}" style="display:${isOpen ? 'block' : 'none'};${_TL_MENU_STY}">${items}</div></span>`;
  }

  _tlColItems(cols, hiddenSet, dataAttr) {
    return cols.map(c => {
      const on = !hiddenSet.has(c.key);
      return `<div class="tl-col-item" ${dataAttr}="${c.key}"><span class="tl-col-chk${on ? ' on' : ''}"></span>${c.label}</div>`;
    }).join('');
  }

  _tlToolbar(opts) {
    const { isMobile, select, editBtn, colsBtn, banner } = opts;
    const b         = banner || '';
    const showLabel = select
      ? `<span style="font-size:12px;color:var(--is-text-label)">${isMobile ? this._t('tlShowN').replace('{s}', () => select) : this._t('tlShowNPerPage').replace('{s}', () => select)}</span>`
      : '';
    return `${b}<div class="tl-toolbar">${showLabel}<div class="tl-toolbar-actions">${editBtn}${colsBtn}</div></div>`;
  }

  // ── Formatters ────────────────────────────────────────────────────────────

  // Dynamický počet řádků/karet = (88vh − overhead) / výška řádku
  // hasFilter: true pro history (filter bar +44px)
  _tlCalcPerPage(opts) {
    const isMob  = this._isMob;
    const modalH = window.innerHeight * 0.88;
    const hdr    = isMob ? 90  : 68;
    const pad    = 34;
    const bar    = (opts && opts.bar !== undefined) ? opts.bar : 44;
    const filter = (opts && opts.hasFilter) ? (opts.filterH || 44) : 0;
    const thead  = isMob ? 0   : 36;
    const pag    = isMob ? 56  : 52;
    const rowH   = (opts && opts.rowH) || (isMob ? 62 : 38);
    return Math.max(3, Math.floor((modalH - hdr - pad - bar - filter - thead - pag) / rowH));
  }

  _tlFmtDuration(secs) {
    if (!secs) return '0m';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  _tlFmtTime(ts) {
    if (!ts) return '—';
    const d = new Date(typeof ts === 'number' ? ts * 1000 : ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  _tlUserSelect(id, users, selUser) {
    const opts = [`<option value="">${this._t('traAllUsers')}</option>`,
      ...(users || []).map(u => `<option value="${this._escHtml(u.user_id ?? '')}"${String(selUser ?? '') === String(u.user_id ?? '') ? ' selected' : ''}>${this._escHtml(u.friendly_name || u.user || '?')}</option>`)
    ].join('');
    return `<select id="${id}" style="${_TL_SEL_STY};max-width:130px">${opts}</select>`;
  }

  _tlSearchInput(id, value) {
    const SEARCH_SVG = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    return `<div style="display:inline-flex;align-items:center;gap:5px;background:var(--is-row-hover,rgba(255,255,255,0.06));border:1px solid var(--is-divider,rgba(255,255,255,0.1));border-radius:6px;padding:0 7px;height:28px;box-sizing:border-box">
      ${SEARCH_SVG}
      <input id="${id}" type="search" value="${this._escHtml(value || '')}" placeholder="${this._t('traSearch')}" autocomplete="off" style="background:none;border:none;outline:none;color:var(--is-text,#fff);font-size:12px;line-height:1.4;width:110px;min-width:60px;padding:0;margin:0;box-sizing:border-box">
    </div>`;
  }

  async _tlApiFetch(cmd, params) {
    try {
      return await this._hass.callApi('GET', `arr_stack/tautulli/${cmd}${params ? '?' + params : ''}`);
    } catch (e) {
      console.warn('[arr-card] Tautulli fetch error:', cmd, e);
      return null;
    }
  }
}

export const tautulliSharedMixin = _TautulliSharedMethods.prototype;
