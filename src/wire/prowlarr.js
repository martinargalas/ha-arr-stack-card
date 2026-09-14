// ──────────────────────────────────────────────────────────────────────────
// Prowlarr wire — card clicks, modal event handling
// ──────────────────────────────────────────────────────────────────────────
import { ICONS, dayClass, isMobile } from '../shared/ui.js';

// Used by the indexer rows, which build their buttons outside the toolbar. A
// tick would claim the test already passed; testing is a re-run, so it spins.
export const _PW_TEST_ICO = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;

class _WireProwlarrMethods {

  _wireProwlarrPosters(right) {
    // Bound to the column itself, which outlives every repaint - once is enough,
    // and a second listener per paint made one click open the modal many times.
    if (!right || right._pwWired) return;
    right._pwWired = true;
    right.addEventListener('click', e => {
      const card = e.target.closest('[data-pw-open]');
      if (!card) return;
      this._openProwlarrModal(card.dataset.pwOpen);
    });
  }

  async _openProwlarrModal(tab) {
    this._markActivated();
    tab = tab || 'indexers';
    this._prowlarrModal = { tab };

    this.shadowRoot.querySelector('[data-pw-modal]')?.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = this._pwModalHtml(tab);
    const el = wrap.firstElementChild;
    this.shadowRoot.appendChild(el);
    this._wireProwlarrModal(el);
    await this._pwLoadTab(tab, el);
  }

  _closeProwlarrModal() {
    this.shadowRoot.querySelector('[data-pw-modal]')?.remove();
    this._prowlarrModal = null;
  }

  _pwModalHtml(tab) {
    const _mob = isMobile();
    // Title dropped — the active tab already names the view
    // The nav fits on a phone once the header's own gaps are tight, so let it
    // keep its intrinsic width instead of shrinking into a scroller.
    const hdrInner = `<div id="pw-nav-area" style="min-width:0;flex-shrink:${_mob ? 0 : 1};overflow:hidden">${this._pwNavHtml(tab)}</div>
         <div id="pw-status" style="flex-shrink:0;display:flex;align-items:center">${this._pwStatusHtml()}</div>
         <div style="flex:1;min-width:8px"></div>
         <div id="pw-hdr-act" style="display:flex;gap:${_mob ? 4 : 6}px;flex-shrink:0;align-items:center">${this._pwHdrActHtml(tab)}</div>
         <button class="popup-close" id="pw-close" style="position:relative;top:0;right:0;flex-shrink:0;align-self:center;margin-left:${_mob ? 2 : 4}px">${ICONS.close}</button>`;
    const hdrStyle = _mob
      ? 'padding:12px 10px 10px;gap:5px;align-items:center'
      : 'padding:14px 22px 10px;gap:12px;align-items:center';
    return `<div class="popup-overlay${dayClass(this)}" data-pw-modal>
      <div class="popup-glass tl-wide">
        <div class="is-panel-hdr" style="${hdrStyle}">${hdrInner}</div>
        <div class="popup-body" id="pw-body" style="padding:${_mob ? '12px 14px 16px' : '14px 22px 20px'};overflow:hidden">
          <div class="is-loading"><span>${this._t('loading')}</span></div>
        </div>
      </div>
    </div>`;
  }

  // What the bulk buttons are doing right now, told in the header rather than
  // inside a 30px circle that has no room for words.
  _pwStatusHtml() {
    const m = this._prowlarrModal;
    if (!m?._statusMsg) return '';
    const rgb  = m._statusErr ? '248,113,113' : '52,211,153';
    const spin = m._statusSpin ? '<span class="is-spin" style="margin-right:6px;vertical-align:-1px"></span>' : '';
    // A phone header has no room left next to the nav, so there the pill floats
    // at the bottom of the viewport — which also needs an opaque ground.
    const mob = this._isMob;
    const bg  = mob ? (this._isDay ? '#fafafc' : '#14141a') : `rgba(${rgb},0.12)`;
    const pos = mob
      ? 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:1200;padding:6px 16px;box-shadow:0 6px 20px rgba(0,0,0,0.55)'
      : 'margin-left:8px;padding:2px 12px';
    return `<span style="font-size:11px;font-weight:600;color:rgba(${rgb},0.9);background:${bg};border:1px solid rgba(${rgb},0.45);border-radius:999px;white-space:nowrap;flex-shrink:0;${pos}">${spin}${this._escHtml(m._statusMsg)}</span>`;
  }

  _pwShowStatus(msg, el, duration = 3000, opts = {}) {
    const m = this._prowlarrModal;
    if (!m) return;
    m._statusMsg  = msg;
    m._statusErr  = !!opts.err;
    m._statusSpin = !!opts.spin;
    const host = (el || this.shadowRoot.querySelector('[data-pw-modal]'))?.querySelector('#pw-status');
    if (host) host.innerHTML = this._pwStatusHtml();
    clearTimeout(m._statusTimer);
    if (!duration) return;
    m._statusTimer = setTimeout(() => {
      if (this._prowlarrModal !== m) return;
      m._statusMsg = null; m._statusErr = false; m._statusSpin = false;
      const h2 = (el || this.shadowRoot.querySelector('[data-pw-modal]'))?.querySelector('#pw-status');
      if (h2) h2.innerHTML = this._pwStatusHtml();
    }, duration);
  }

  // Bulk actions for the current tab, parked in the modal header next to close —
  // the same place Maintainerr keeps New rule / Run all.
  _pwHdrActHtml(tab) {
    // Deliberately smaller than the 36px close: that acts on the modal, these
    // act on the view.
    const S = this._isMob ? 28 : 30;
    // Bulk glyphs are the row action's own glyph, doubled and overlapped, so
    // "all of them" reads without a label.
    // Same reload glyph the row Test buttons use — the header position already
    // says "all of them", so the icon doesn't have to.
    const RELOAD  = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
    const PLAY2   = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="display:block"><polygon points="3,4 12,12 3,20"/><polygon points="13,4 22,12 13,20"/></svg>`;
    const PLUS    = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="display:block"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

    if (tab === 'indexers') {
      return this._mtRoundBtn('id="pw-add-btn"', PLUS, this._t('pwAddIndexer'), { size: S, tone: 'blue' })
        + this._mtRoundBtn('id="pw-testall-btn"', RELOAD, this._t('pwTestAll'), { size: S, tone: 'green' });
    }
    if (tab === 'apps') {
      return this._mtRoundBtn('id="pw-app-add-btn"', PLUS, this._t('pwAddApp'), { size: S, tone: 'blue' })
        + this._mtRoundBtn('id="pw-app-testall-btn"', RELOAD, this._t('pwTestAll'), { size: S, tone: 'green' })
        + this._mtRoundBtn('id="pw-app-syncall-btn"', PLAY2, this._t('pwSyncAll'), { size: S, tone: 'green' });
    }
    return '';
  }

  // Header bulk buttons live outside the body, so they survive its re-renders —
  // bind once, and report the result as a glyph swap rather than a text label
  // (they are 30px circles now).
  _pwHdrBtn(el, id, handler) {
    const btn = el.querySelector(`#${id}`);
    if (!btn || btn._pwBound) return;
    btn._pwBound = true;
    btn.addEventListener('click', () => handler(btn));
  }

  _pwHdrBtnBusy(btn) {
    btn._pwIco = btn.innerHTML;
    // _mtRoundBtn writes its tone inline, so the original style attribute is the
    // only way back — clearing individual properties leaves a bare white circle.
    btn._pwSty = btn.getAttribute('style');
    btn.disabled = true;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:block;animation:btn-spin 0.65s linear infinite"><path d="M12 2a10 10 0 0 1 10 10"/></svg>`;
  }

  async _pwHdrBtnResult(btn, hasErrors) {
    btn.disabled = false;
    btn.innerHTML = hasErrors
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg>`;
    btn.style.background = hasErrors ? 'rgba(255,100,100,0.18)' : 'rgba(52,211,153,0.18)';
    btn.style.color      = hasErrors ? 'rgba(255,100,100,0.9)'  : 'rgba(52,211,153,0.9)';
    await new Promise(r => setTimeout(r, 2000));
    btn.innerHTML = btn._pwIco || btn.innerHTML;
    if (btn._pwSty != null) btn.setAttribute('style', btn._pwSty);
  }

  _pwNavHtml(tab) {
    const _mob = isMobile();
    const _ico = d => `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">${d}</svg>`;
    // Database / grid of apps / clock / bar chart
    const NAV = [
      { id: 'indexers', label: this._t('pwIndexers'),     icon: _ico('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>') },
      { id: 'apps',     label: _mob ? this._t('pwApps') : this._t('pwApplications'), icon: _ico('<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>') },
      { id: 'history',  label: this._t('tlHistory'),      icon: _ico('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>') },
      { id: 'stats',    label: this._t('pwStatistics'),   icon: _ico('<line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="9"/>') },
    ];
    // Four labelled pills overflow a phone header, so there the glyph carries
    // the meaning and only the active tab keeps its word.
    return `<div id="pw-nav" class="mt-nav"><span class="mt-nav-ind"></span>${
      NAV.map(g => {
        const on = g.id === tab;
        return `<button class="mt-nav-btn${on ? ' is-on' : ''}" data-pw-tab="${g.id}" title="${this._escHtml(g.label)}">${g.icon}${(!_mob || on) ? g.label : ''}</button>`;
      }).join('')}</div>`;
  }

  _wireProwlarrModal(el) {
    el.querySelector('#pw-close')?.addEventListener('click', () => this._closeProwlarrModal());
    el.addEventListener('click', e => { if (e.target === el) this._closeProwlarrModal(); });
    // Delegated on the header area: the nav is rewritten whenever the tab
    // changes, because on a phone only the active tab carries its label.
    el.querySelector('#pw-nav-area')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-pw-tab]');
      if (!btn || !this._prowlarrModal) return;
      const t = btn.dataset.pwTab;
      if (!t || t === this._prowlarrModal.tab) return;
      const from = this._navIndRect(el.querySelector('#pw-nav'));
      this._prowlarrModal.tab = t;
      el.querySelector('#pw-nav-area').innerHTML = this._pwNavHtml(t);
      const hdrAct = el.querySelector('#pw-hdr-act');
      if (hdrAct) hdrAct.innerHTML = this._pwHdrActHtml(t);
      const nav = el.querySelector('#pw-nav');
      this._syncNavInd(nav, nav?.querySelector(`.mt-nav-btn[data-pw-tab="${t}"]`), from);
      await this._pwLoadTab(t, el);
    });
    requestAnimationFrame(() => {
      const nav = el.querySelector('#pw-nav');
      this._syncNavInd(nav, nav?.querySelector('.mt-nav-btn.is-on'));
    });
  }

  async _pwLoadTab(tab, el) {
    const body = el.querySelector('#pw-body');
    if (!body || !this._prowlarrModal) return;
    // Reset flex styles set by stats tab
    body.style.display = '';
    body.style.flexDirection = '';
    body.innerHTML = '<div class="is-loading"><span>' + this._t('loading') + '</span></div>';

    if (tab === 'indexers') {
      await this._pwLoadIndexers(body, el);
    } else if (tab === 'stats') {
      await this._pwLoadStats(body, el);
    } else if (tab === 'history') {
      await this._pwLoadHistory(body, el);
    } else if (tab === 'apps') {
      await this._pwLoadApps(body, el);
    }
  }

  _pwShowInfoModal(text) {

    const wrap     = document.createElement('div');
    // Convert numbered list if text contains newline+number patterns
    const html     = this._escHtml(text).replace(/\n(\d+)\./g, '<br><strong>$1.</strong>').replace(/\n/g, '<br>');
    wrap.innerHTML = `<div class="popup-overlay${dayClass(this)}" data-pw-info-modal style="z-index:1300">
      <div class="popup-glass" style="width:min(500px,94vw);max-height:80vh">
        <div class="is-panel-hdr" style="padding:14px 22px 12px;gap:12px">
          <div style="flex:1;font-size:14px;font-weight:700;color:var(--is-text)">${this._t('pwInstructions')}</div>
          <button class="popup-close u-rel-shrink0" id="pw-info-close">${ICONS.close}</button>
        </div>
        <div class="popup-body" style="padding:14px 22px 20px;overflow-y:auto">
          <div style="font-size:12px;color:var(--is-text-muted);line-height:1.7">${html}</div>
        </div>
      </div>
    </div>`;
    const el = wrap.firstElementChild;
    el.querySelector('#pw-info-close')?.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    this.shadowRoot.appendChild(el);
  }

}

export const wireProwlarrMixin = _WireProwlarrMethods.prototype;
