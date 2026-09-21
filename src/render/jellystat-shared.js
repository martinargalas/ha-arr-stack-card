// ──────────────────────────────────────────────────────────────────────────
// Jellystat — shared helpers (modal state, col prefs)
// Formatters/pagination/icons reused from tautulli-shared.js (same this)
// ──────────────────────────────────────────────────────────────────────────

class _JellystatSharedMethods {

  _jsHidden(key, defaults) {
    const m = this._jellystatModal;
    if (!m) return new Set(defaults);
    if (!m[key]) m[key] = new Set(defaults);
    return m[key];
  }

  async _jsLoadColPrefs() {
    try {
      const r = await this._hass.callWS({ type: 'frontend/get_user_data', key: 'arr-js-cols' });
      return r?.value || {};
    } catch { return {}; }
  }

  _jsSaveColPrefs() {
    const m = this._jellystatModal;
    if (!m) return;
    const KEYS = ['libsHiddenCols','libsMobHiddenCols','usersHiddenCols','usersMobHiddenCols','histHiddenCols','histMobHiddenCols'];
    const value = {};
    for (const k of KEYS) if (m[k]) value[k] = [...m[k]];
    this._hass.callWS({ type: 'frontend/store_user_data', key: 'arr-js-cols', value }).catch(() => {});
  }

  _jsUserSelect(id, users, selUser) {
    const _TL_SEL_STY = 'margin:0 4px;background:var(--is-row-hover,rgba(255,255,255,0.06));border:1px solid var(--is-divider,rgba(255,255,255,0.1));border-radius:6px;color:var(--is-text,#fff);padding:4px 8px;font-size:12px';
    const opts = ['<option value="">' + this._t('traAllUsers') + '</option>',
      ...(users || []).map(u => {
        const name = u.UserName || u.Name || u.UserId || '';
        const txt  = this._escHtml(name);
        return '<option value="' + txt + '"' + (String(selUser || '') === String(name) ? ' selected' : '') + '>' + txt + '</option>';
      })
    ].join('');
    return '<select id="' + id + '" style="' + _TL_SEL_STY + ';max-width:130px">' + opts + '</select>';
  }

  _jsMediaTypeBadge(t) {
    t = (t || '').toLowerCase();
    if (t === 'movie') return this._t('typeMovie');
    if (t === 'episode') return this._t('snEpisode');
    if (t === 'audio' || t === 'musicvideo') return this._t('tabMusic');
    return t || '';
  }
}

export const jellystatSharedMixin = _JellystatSharedMethods.prototype;
