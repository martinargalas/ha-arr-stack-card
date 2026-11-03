// arr-stack-search: the main search's field, somewhere other than the card —
// typically the header of a pop-up (Bubble Card with show_header: false, or a
// header card that takes other cards), so the card itself is a field shorter.
//
// It draws nothing of its own: the field is the main card's (_searchBarHtml),
// typing and the type switch go to the main card's own handlers, and the
// results appear in the card's column as before. It pairs with a card that has
// search_in_header and the same `link` (see shared/link.js).
//
// Its look is the card's: the same sheet, and the card's theme variables
// copied across, so a preset or a colour set on the card dresses this too.
// Its own styles: are laid over that; background: none drops the bar's surface
// for a header that draws its own.
//
//   type: custom:arr-stack-search
//   header: true          # optional: a whole pop-up header — icon, field, close
//   icon: mdi:movie-play-outline
//   close: true           # with header, default on: closes the pop-up (drops its #hash)
//   background: none      # optional: no surface of its own
//   link: movies          # optional: pairs with the card that has the same search_link
//   styles: { … }         # optional: the card's style keys, over the card's own

import { STYLES } from './styles/index.js';
import { arrSharedSheet } from './styles/sheet.js';
import { styleDeclarations } from './styles/tokens.js';
import { ARR_I18N } from './i18n.js';
import { ARR_LINK, cardForBar } from './shared/link.js';
import { BP, maxWidth } from './shared/ui.js';

// Measured off glass-cards' pop-up header, which Bubble Card's own header
// matches: a 56 px bar, a 56 px round close beside it 12 px away, the icon in a
// 44 px square, the controls 36 px tall and 10 px in from the bar's rounded end.
const BAR_CSS = `
  :host { display: block; }
  .card.ash {
    /* over the liquid glass layer, when a look draws one */
    position: relative;
    display: flex; align-items: center; gap: 12px; box-sizing: border-box;
    /* in line with the card's columns, whatever its own side inset is */
    padding: 0 var(--ash-inset-r, 12px) 0 var(--ash-inset-l, 12px);
    margin-bottom: 4px;
  }
  .ash-col {
    flex: 1; min-width: 0; box-sizing: border-box;
    flex-direction: row; align-items: center; gap: 12px;
    height: 56px; padding: 0 10px 0 6px; border-radius: 999px; overflow: visible;
  }
  .ash-col.ash-bare {
    height: auto; padding: 0; background: none; border: none; box-shadow: none;
    backdrop-filter: none; -webkit-backdrop-filter: none;
  }
  .ash-col.ash-bare::before { display: none; }
  .ash-ico { flex: none; width: 44px; height: 44px; display: grid; place-items: center; }
  /* The bar's own text, as glass-cards' header has it: the secondary text
     colour, a touch lighter at night */
  .ash-ico ha-icon { --mdc-icon-size: 24px; display: flex; color: rgba(var(--_fg2, 255, 255, 255), var(--ash-fg-a, 0.85)); }
  :host([dark]) { --ash-fg-a: 0.76; }
  .ash-col:not(.ash-has-ico) { padding-left: 10px; }
  .ash-field { flex: 1; min-width: 0; }
  .ash-field .search-bar-wrap { margin-bottom: 0; height: 36px; box-sizing: border-box; padding-top: 0; padding-bottom: 0; }
  .ash-close {
    flex: none; width: 56px; height: 56px; padding: 0; border-radius: 50%;
    display: grid; place-items: center; cursor: pointer; font: inherit;
    color: rgba(var(--_fg2, 255, 255, 255), var(--ash-fg-a, 0.85));
    -webkit-tap-highlight-color: transparent;
  }
  .ash-close svg { width: 18px; height: 18px; display: block; position: relative; z-index: 1; }
  .ash-hint { flex: 1; font-size: 12px; color: rgba(var(--_fg3, 255, 255, 255), 0.65); padding: 0 4px; }
  /* Stacked columns: the field is the bar's own width, and while there is a
     search the icon gives it its room too */
  @media (max-width: 900px) {
    .ash-col.ash-searching .ash-ico { display: none; }
    .ash-col.ash-searching { padding-left: 10px; }
  }
  /* A phone: the field has the whole bar, searching or not */
  @media (max-width: 600px) {
    .ash-ico { display: none; }
    .ash-col { padding-left: 10px; }
  }
`;

const CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';

class ArrStackSearch extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._card = null;
  }

  setConfig(config) {
    this._config = config || {};
    if (this.isConnected) this._bind(true);
  }

  set hass(hass) {
    this._hass = hass;
    // The card may have had no hass of its own when the field was first drawn
    if (!this._drawn) this._render();
  }

  connectedCallback() {
    ARR_LINK.bars.add(this);
    this._bind(true);
    // The card's side inset changes with the screen's width
    this._onResize = this._onResize || (() => this._applyLook());
    window.addEventListener('resize', this._onResize, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this._onResize);
    ARR_LINK.bars.delete(this);
    const old = this._card;
    this._card = null;
    old?._extSearchChanged();
  }

  // Finds its card. The card's column drops or takes back the field to match.
  _bind(force = false) {
    const next = this.isConnected ? cardForBar(this) : null;
    if (next === this._card && !force) return;
    const old = this._card;
    this._card = next;
    this._render();
    if (old && old !== next) old._extSearchChanged();
    if (next && next !== old) next._extSearchChanged();
  }

  _lang() {
    const l = String(this._card?._lg?.() || this._hass?.locale?.language || this._hass?.language || 'en').slice(0, 2);
    return ARR_I18N[l] ? l : 'en';
  }

  _render() {
    const sr = this.shadowRoot;
    if (!sr.querySelector('.card')) {
      const sheet = arrSharedSheet();
      if (sheet) {
        const bar = new CSSStyleSheet();
        bar.replaceSync(BAR_CSS);
        sr.adoptedStyleSheets = [sheet, bar];
      } else {
        const st = document.createElement('style');
        st.textContent = STYLES + BAR_CSS;
        sr.appendChild(st);
      }
      const look = document.createElement('style');
      look.id = 'ash-look';
      sr.appendChild(look);
      const wrap = document.createElement('div');
      wrap.className = 'card';
      sr.appendChild(wrap);
    }
    const c = this._config;
    const card = this._card;
    const header = !!c.header;
    const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    const ico = header && c.icon ? `<div class="ash-ico"><ha-icon icon="${esc(c.icon)}"></ha-icon></div>` : '';
    const field = card
      ? `<div class="ash-field">${card._searchBarHtml()}</div>`
      : `<div class="ash-hint">${esc(ARR_I18N[this._lang()]?.extSearchHint || ARR_I18N.en.extSearchHint)}</div>`;
    const bare = c.background === 'none';
    // The close is a glass of its own beside the bar, as in glass-cards
    const close = header && c.close !== false
      ? `<button class="col col-right ash-close${bare ? ' ash-bare' : ''}" data-ash-close title="Close">${CLOSE_SVG}</button>` : '';
    const wrap = sr.querySelector('.card');
    wrap.classList.add('ash');
    wrap.innerHTML = `<div class="col col-right ash-col${bare ? ' ash-bare' : ''}${ico ? ' ash-has-ico' : ''}">${ico}${field}</div>${close}`;
    this._drawn = !!card?._hass;
    this._applyLook();
    this._wire();
  }

  // The field's listeners are the card's own; the type switch, the clear
  // button and the close button are pressed here and handed over.
  _wire() {
    const sr = this.shadowRoot;
    this._abort?.abort();
    this._abort = new AbortController();
    const sig = this._abort.signal;
    const card = this._card;
    const input = sr.querySelector('.search-bar-input');
    if (card && input) {
      card._wireSearchField(input, sig);
      card._syncSegVars?.(sr);
    }
    sr.addEventListener('mousedown', e => {
      if (e.target.closest('.search-type-seg')) e.preventDefault();
    }, { signal: sig });
    sr.addEventListener('focusin', () => this._markSearching(), { signal: sig });
    sr.addEventListener('focusout', () => setTimeout(() => this._markSearching(), 0), { signal: sig });
    this._markSearching();
    sr.addEventListener('click', e => {
      if (e.target.closest('[data-ash-close]')) { this._closePopup(); return; }
      if (!this._card) return;
      const seg = e.target.closest('[data-search-type]');
      if (seg) { this._card._searchPickType(seg); this._syncFromCard(); return; }
      if (e.target.closest('.search-bar-clear')) {
        const input = sr.querySelector('.search-bar-input');
        if (input) input.value = '';
        this._card._searchClearAll();
        input?.focus();
      }
    }, { signal: sig });
  }

  // Searching: the field has the caret or holds a search
  _markSearching() {
    const sr = this.shadowRoot;
    const col = sr.querySelector('.ash-col');
    if (!col) return;
    const input = sr.querySelector('.search-bar-input');
    const on = (!!input && sr.activeElement === input)
      || !!this._card?._searchActive || !!(this._card?._searchQuery || '').trim();
    col.classList.toggle('ash-searching', on);
  }

  // What changed in the card: the type switch shows up with the first letter,
  // the clear button with a search. The input itself is left alone while it
  // is being typed in — rebuilding it would close an iPhone's keyboard.
  _syncFromCard(what = 'bar') {
    if (what === 'theme') { this._applyLook(); return; }
    if (what === 'align') { this._alignField(); return; }
    const card = this._card;
    const sr = this.shadowRoot;
    const wrap = sr.querySelector('.search-bar-wrap');
    if (!card || !wrap) { this._render(); return; }
    const tmp = document.createElement('div');
    tmp.innerHTML = card._searchBarHtml();
    const fresh = tmp.firstElementChild;
    const oldSeg = wrap.querySelector('.search-type-seg');
    const newSeg = fresh.querySelector('.search-type-seg');
    const clear = wrap.querySelector('.search-bar-clear');
    if (oldSeg && newSeg) oldSeg.replaceWith(newSeg);
    else if (oldSeg) oldSeg.remove();
    else if (newSeg && clear) clear.before(newSeg);
    if (clear) clear.style.display = card._searchActive ? '' : 'none';
    const input = wrap.querySelector('.search-bar-input');
    if (input && sr.activeElement !== input) input.value = card._searchQuery || '';
    this._markSearching();
    card._syncSegVars?.(sr);
    sr.querySelectorAll('.search-type-seg .mt-seg[data-seg-to]').forEach(seg => {
      if (seg.dataset.seg !== seg.dataset.segTo) requestAnimationFrame(() => { seg.dataset.seg = seg.dataset.segTo; });
    });
  }

  // The card's theme variables, then this header's own styles: over them
  _applyLook() {
    const look = this.shadowRoot.getElementById('ash-look');
    if (!look) return;
    // The card's side inset, so the bar's ends line up with its columns
    const body = this._card?.shadowRoot?.querySelector('.card-body');
    if (body) {
      const cs = getComputedStyle(body);
      this.style.setProperty('--ash-inset-l', cs.paddingLeft);
      this.style.setProperty('--ash-inset-r', cs.paddingRight);
    }
    const from = this._card?.shadowRoot
      ? [...this._card.shadowRoot.children]
        .filter(e => e.tagName === 'STYLE' && (e.id === 'arr-theme' || e.textContent.trim().startsWith(':host')))
        .map(e => e.textContent)
      : [];
    const own = this._config.styles && Object.keys(this._config.styles).length
      ? styleDeclarations(this._config.styles).decls : [];
    look.textContent = [...from, own.length ? `:host { ${own.join(' ')} }` : ''].join('\n');
    // Night for the bar's text, as the card has it
    this.toggleAttribute('dark', !!this._card && !this._card._isDay);
    this._alignField();
  }

  // Beside the downloads, the field starts at the left edge of the card's
  // poster column — measured, not assumed: that column sits on the right, or
  // on the left when the sides are swapped.
  _alignField() {
    requestAnimationFrame(() => {
      const field = this.shadowRoot.querySelector('.ash-field');
      const right = this._card?.shadowRoot?.getElementById('col-right');
      if (!field || !right || !right.offsetWidth) return;
      // Columns stacked (a phone): the field simply takes the bar's width
      if (maxWidth(BP.STACKED)) { field.style.marginLeft = '0px'; return; }
      const target = right.getBoundingClientRect().left;
      field.style.marginLeft = '0px';
      const gap = target - field.getBoundingClientRect().left;
      // Only ever further in: the icon is not pushed out of the bar
      field.style.marginLeft = gap > 0 ? `${Math.round(gap)}px` : '0px';
    });
  }

  // As Bubble Card closes a pop-up: the #hash goes, and the frontend is told
  _closePopup() {
    if (!location.hash) return;
    history.replaceState(history.state, '', location.href.split('#')[0]);
    window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: true } }));
  }

  getCardSize() { return 1; }

  getGridOptions() { return { rows: 1, columns: 12, min_rows: 1 }; }

  static async getConfigElement() {
    await import('./editor.js');
    return document.createElement('arr-stack-search-editor');
  }

  static getStubConfig() {
    return { header: true, icon: 'mdi:movie-play-outline' };
  }
}

if (!customElements.get('arr-stack-search')) customElements.define('arr-stack-search', ArrStackSearch);

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'arr-stack-search')) {
  window.customCards.push({
    type: 'arr-stack-search',
    name: 'Arr Stack Search',
    description: 'The Arr Stack Card\'s search field for a pop-up header — Bubble Card and others',
  });
}
