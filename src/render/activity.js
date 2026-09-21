// ──────────────────────────────────────────────────────────────────────────
// Activity — Queue / History / Blocklist cards + modal
// ──────────────────────────────────────────────────────────────────────────
import { ICONS, dayClass, isMobile } from '../shared/ui.js';

class _ActivityRenderMethods {

  _actBar(searchId, searchVal, sels, colsBtnId) {
    const colsSvg = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>`;
    const bar = this._uiBar(searchId, searchVal, sels,
      colsBtnId ? [{ id: colsBtnId, label: this._t('actColumns'), icon: colsSvg }] : []);
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-shrink:0">${bar}</div>`;
  }

  // ── Right-panel card row ─────────────────────────────────────────────────

  // ── Modal shell ──────────────────────────────────────────────────────────

  _actModalNavHtml(tab) {
    const isMobile = this._isMob;
    const _ico = d => `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${d}</svg>`;
    // Download tray / clock / no-entry / warning triangle
    const NAV = [
      { id: 'queue',     label: this._t('actTabQueue'),     icon: _ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>') },
      { id: 'history',   label: this._t('actTabHistory'),   icon: _ico('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>') },
      { id: 'blocklist', label: this._t('actTabBlocklist'), icon: _ico('<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>') },
      { id: 'missing',   label: this._t('actTabMissing'),   icon: _ico('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>') },
    ];
    // Four labelled pills overflow a phone header, so there the glyph carries
    // the meaning and only the active tab keeps its word.
    return `<div id="act-nav" class="mt-nav"><span class="mt-nav-ind"></span>${
      NAV.map(g => {
        const on = g.id === tab;
        return `<button class="mt-nav-btn${on ? ' is-on' : ''}" data-act-tab="${g.id}" title="${this._escHtml(g.label)}">${g.icon}${(!isMobile || on) ? g.label : ''}</button>`;
      }).join('')}</div>`;
  }

  _actModalHtml(tab) {
    const isMobile = this._isMob;
    // Title dropped — the active tab already names the view
    // Opened from a title's detail popup? Then this goes back to it.
    const _backIco = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    const hdrInner = `<div id="act-nav-area" style="min-width:0;flex-shrink:1;overflow:hidden">${this._actModalNavHtml(tab)}</div>
         ${isMobile ? '' : `<div id="act-status-slot" style="flex-shrink:0;display:flex;align-items:center"></div>`}
         <div style="flex:1;min-width:8px"></div>
         <button class="popup-close" id="act-close" style="position:relative;top:0;right:0;flex-shrink:0;align-self:center;margin-left:4px">${this._actPopupReturn ? _backIco : ICONS.close}</button>`;
    const hdrStyle = isMobile
      ? 'padding:12px 12px 10px;gap:8px;align-items:center'
      : 'padding:14px 22px 10px;gap:12px;align-items:center';
    return `<div class="popup-overlay${dayClass(this)}" data-act-modal>
      <div class="popup-glass tl-wide">
        <div class="is-panel-hdr" style="${hdrStyle}">${hdrInner}</div>
        <div class="popup-body" id="act-body" style="padding:${isMobile ? '12px 14px 16px' : '14px 22px 20px'};overflow:hidden">
          <div class="is-loading"><span>${this._t('loading')}</span></div>
        </div>
      </div>
    </div>`;
  }

  // ── Instance label helper ─────────────────────────────────────────────────
  // Returns seerr server name if configured, else "Radarr" / "Radarr 2" / …

  // Which app a row came from, as a glyph: a film strip, a set, or a note.
  _actSrcIcon(svc) {
    const F = 'width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"';
    if (svc === 'lidarr') {
      return `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/></svg>`;
    }
    if (svc === 'radarr' || svc === 'radarr2') {
      return `<svg ${F}><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/></svg>`;
    }
    return `<svg ${F}><rect x="2" y="3" width="20" height="15" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`;
  }

  // Lidarr's own green, beside Radarr's blue and Sonarr's amber.
  _actSrcColor(svc) {
    if (svc === 'lidarr') return 'rgba(21,158,90,0.9)';
    return (svc === 'radarr' || svc === 'radarr2') ? 'rgba(99,140,255,0.85)' : 'rgba(250,160,40,0.85)';
  }

}

export const activityRenderMixin = _ActivityRenderMethods.prototype;
