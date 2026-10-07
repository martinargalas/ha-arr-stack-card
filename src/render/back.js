// The phone's back button (and the browser's) closes the card's topmost modal
// instead of leaving the dashboard — the way Home Assistant's own dialogs work.
//
// While any modal is open, the card keeps exactly one entry of its own on top
// of the browser history, with the same URL. Going back pops it; the card then
// presses the topmost modal's own close button, so a modal that steps back
// inside itself (a collection's detail, a calendar day) does that rather than
// vanishing. If something is still open afterwards the entry is put back, so
// the next back closes the next level. Closing a modal by its X or the
// backdrop takes the entry away again, or the history would fill with steps
// that do nothing.
//
// Watched through the same observer as the scroll lock: two dozen places
// mount an overlay, and wiring each one would miss some.

// Leaving a modal for another (Library → detail) can pass through a moment
// with nothing open while a chunk loads; only a modal gone this long is closed.
const SETTLE_MS = 350;

class _BackMethods {
  _backInit() {
    if (this._backPop) return;
    this._backKey = this._backKey || `arr-${Math.random().toString(36).slice(2, 10)}`;
    this._backPop = () => this._backOnPop();
    window.addEventListener('popstate', this._backPop);
    this._backSync();
  }

  _backStop() {
    if (this._backPop) window.removeEventListener('popstate', this._backPop);
    this._backPop = null;
    clearTimeout(this._backTimer);
    // The entry stays: going back now would undo whatever navigation took the
    // card away. It is the same URL, so the next back merely passes over it.
    this._backArmed = false;
  }

  _backOpen() {
    return [...(this.shadowRoot?.querySelectorAll('.popup-overlay') || [])].filter(o => o.isConnected);
  }

  // What the user sees on top: the highest z-index, and of equals the later one
  // in the document — a modal opened over another is appended after it.
  _backTop() {
    let top = null, best = -Infinity;
    for (const o of this._backOpen()) {
      const z = parseInt(o.style.zIndex || getComputedStyle(o).zIndex, 10) || 0;
      if (z >= best) { best = z; top = o; }
    }
    return top;
  }

  _backOurs() {
    return window.history.state?.arrStackCard === this._backKey;
  }

  // Called on every change to the shadow DOM.
  _backSync() {
    if (!this._backPop) return;
    const open = this._backOpen().length > 0;
    if (open && !this._backArmed) {
      clearTimeout(this._backTimer);
      this._backTimer = null;
      this._backArm();
    } else if (!open && this._backArmed && !this._backTimer) {
      this._backTimer = setTimeout(() => {
        this._backTimer = null;
        if (this._backOpen().length || !this._backArmed) return;
        this._backArmed = false;
        // Closed by the modal's own X: take the entry back off the history
        if (this._backOurs()) { this._backSelf = true; window.history.back(); }
      }, SETTLE_MS);
    }
  }

  _backArm() {
    this._backArmed = true;
    if (this._backOurs()) return;
    // Only the card's own key: Home Assistant reads `dialog` and `opensDialog`
    // from history states, and a copy of its keys here would set it off when
    // the user comes forward onto this entry.
    window.history.pushState({ arrStackCard: this._backKey }, '');
  }

  _backOnPop() {
    if (this._backSelf) { this._backSelf = false; return; }
    if (!this._backArmed || this._backOurs()) return;
    this._backArmed = false;
    const top = this._backTop();
    if (!top) return;
    const closed = this._backClose(top);
    // Still something open (a step back inside the modal, or the one beneath):
    // put the entry back for the next press. Nothing to press — let the back
    // go through, or the user could never leave.
    if (closed) setTimeout(() => this._backSync(), 0);
  }

  _backClose(overlay) {
    const own = [...overlay.querySelectorAll('.popup-close')]
      .find(b => b.closest('.popup-overlay') === overlay && !b.disabled);
    if (own) { own.click(); return true; }
    // A modal without a close button closes on its backdrop
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return !overlay.isConnected;
  }
}

export const backMixin = _BackMethods.prototype;
