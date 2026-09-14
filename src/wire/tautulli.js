// ──────────────────────────────────────────────────────────────────────────
// Tautulli wire — poster clicks + modal event handling
// ──────────────────────────────────────────────────────────────────────────
import { ICONS } from '../shared/ui.js';

class _WireTautulliMethods {

  _wireTautulliPosters(right) {
    // Bound to the column itself, which outlives every repaint - once is enough,
    // and a second listener per paint made one click open the modal many times.
    if (!right || right._tlWired) return;
    right._tlWired = true;
    right.addEventListener('click', e => {
      const card = e.target.closest('[data-tl-open]');
      if (!card) return;
      this._openTautulliModal(card.dataset.tlOpen);
    });
  }

  _wireTautulliModal(el) {
    // While a detail view is open the close button walks back one step instead
    // of closing the modal, as it does in Maintainerr and Tracearr.
    el.querySelector('#tl-close')?.addEventListener('click', () => {
      const back = el.querySelector('[data-tl-md-back-lib],[data-tl-md-back-user],[data-tl-ud-back],[data-tl-ld-back]');
      if (back) { back.click(); return; }
      this._closeTautulliModal();
    });
    el.addEventListener('click', e => {
      if (e.target === el) this._closeTautulliModal();
    });
    // Delegated on the header area: the nav is rewritten whenever the tab
    // changes, because on a phone only the active tab carries its label.
    el.querySelector('#tl-nav-area')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-tl-tab]');
      if (!btn || !this._tautulliModal) return;
      const t = btn.dataset.tlTab;
      if (!t || t === this._tautulliModal.tab) return;
      const from = this._navIndRect(el.querySelector('#tl-nav'));
      // A header tab always lands on that tab's list, so any open detail is
      // dropped — otherwise the tab loaded behind the detail still on screen.
      const m = this._tautulliModal;
      m.userDetailId = null;
      m.libDetailId = null;
      m.mediaDetailKey = null;
      m.tab = t;
      el.querySelector('#tl-nav-area').innerHTML = this._tlNavHtml(t);
      const nav = el.querySelector('#tl-nav');
      this._syncNavInd(nav, nav?.querySelector(`.mt-nav-btn[data-tl-tab="${t}"]`), from);
      this._markActivated();
      const subEl = el.querySelector('#tl-hdr-sub');
      if (subEl) subEl.textContent = this._isMob ? '' : this._tlTabSubtitle(t);
      this._tlLoadTab(t, el);
    });
    requestAnimationFrame(() => {
      const nav = el.querySelector('#tl-nav');
      this._syncNavInd(nav, nav?.querySelector('.mt-nav-btn.is-on'));
    });
  }

  _wireTautulliModalBody(body) {
    // This runs again after every partial refresh. _patchResultsWrap replaces
    // only the results subtree, so the toolbar's own nodes survive — binding
    // them a second time stacked a second listener, and then one change fired
    // two refetches at once (and on the old toggle buttons, set the filter and
    // immediately cleared it again). Each node is bound once and marked; nodes
    // inside the replaced subtree are new objects, so they rebind as before.
    const _q  = sel => { const el = body.querySelector(sel); if (!el || el._tlWired) return null; el._tlWired = true; return el; };
    const _qa = sel => [...body.querySelectorAll(sel)].filter(el => { if (el._tlWired) return false; el._tlWired = true; return true; });

    // The close button carries a chevron while a detail is open.
    {
      const modalEl = body.closest('[data-tl-modal]');
      const closeBtn = modalEl?.querySelector('#tl-close');
      if (closeBtn) {
        const isBack = !!body.querySelector('[data-tl-md-back-lib],[data-tl-md-back-user],[data-tl-ud-back],[data-tl-ld-back]');
        closeBtn.innerHTML = isBack
          ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`
          : ICONS.close;
      }
    }

    // The detail views' tab groups place their fill by measurement, so it is
    // positioned once the markup is in the document.
    requestAnimationFrame(() => {
      body.querySelectorAll('.mt-nav--inline').forEach(nav =>
        this._syncNavInd(nav, nav.querySelector('.mt-nav-btn.is-on')));
    });

    // The toolbar survives a partial refresh, so the pickers' own triggers have
    // to be told what was chosen.
    if (!body._tlSelSync) {
      body._tlSelSync = true;
      body.addEventListener('change', e => this._tbSyncSelect(e.target));
    }

    // ── IP report collapse toggle ──────────────────────────────────────────
    _q('#tl-ip-report-toggle')?.addEventListener('click', async () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.ipReportOpen = !this._tautulliModal.ipReportOpen;
      const m = this._tautulliModal;
      const r2 = await this._tlApiFetch('get_users_table', `length=50&start=${(m.usersPage||0)*50}&order_column=${m.usersSortCol||'plays'}&order_dir=${m.usersSortDir||'desc'}`).catch(() => null);
      body.innerHTML = this._tlBodyUsers(r2?.response?.data?.data);
      this._wireTautulliModalBody(body);
    });

    // ── Acknowledge sharing ────────────────────────────────────────────────
    _q('#tl-ack-btn')?.addEventListener('click', async () => {
      await this._ackTautulliSharing();
      const r = await this._hass.callApi('GET', 'arr_stack/tautulli/get_users_table?length=50&start=0&order_column=plays&order_dir=desc').catch(() => null);
      body.innerHTML = this._tlBodyUsers(r?.response?.data?.data);
      this._wireTautulliModalBody(body);
    });


    this._tlWireHistory(body, _q, _qa);
    this._tlWireUserDetail(body, _q, _qa);
    this._tlWireLibDetail(body, _q, _qa);
    this._tlWireMediaDetail(body, _q, _qa);
    // ── Graphs controls ────────────────────────────────────────────────────
    this._wireGraphControls(body);

    this._tlWireLibraries(body, _q, _qa);
    this._tlWireUsers(body, _q, _qa);
  }
}

export const wireTautulliMixin = _WireTautulliMethods.prototype;
