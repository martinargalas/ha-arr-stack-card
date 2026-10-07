// Every select in the card opens the card's own list instead of the system's.
// A native list is drawn by the OS — a wheel on an iPhone, a sheet on Android,
// a grey menu on a desktop — so the same dropdown looked different on each,
// and none of them like the card's own pickers (Similar titles' Country).
// A select picks one, so its options run down a list the way the Library's
// sort does; capsules side by side are for pickers that take several. The
// current one sits in a capsule of the accent, as a segmented control's does.
//
// The selects stay in the markup, so every place that reads one's value or
// listens for its change keeps working: one listener for the whole card stops
// the system's list from opening, shows the card's, and on a pick sets the
// select's value and fires the change a native pick would have.

const LONG = 12;   // past this many options the list gets a filter field

class _DropdownMethods {
  _ddInit() {
    if (this._ddWired || !this.shadowRoot) return;
    this._ddWired = true;
    const sr = this.shadowRoot;
    const selectOf = e => {
      const s = e.target?.closest?.('select');
      return s && !s.multiple && !(s.size > 1) && !s.disabled ? s : null;
    };
    // A mouse: the system's list opens on mousedown
    sr.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const s = selectOf(e);
      if (!s) return;
      e.preventDefault();
      this._ddOpen(s);
    }, true);
    // A finger: on the lift, and only for a tap — a scroll that starts on a
    // select must still scroll. Cancelling the touchend keeps the browser from
    // focusing the select, which is what opens the system's picker.
    let start = null;
    sr.addEventListener('touchstart', e => {
      const s = selectOf(e);
      start = s ? { s, x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { capture: true, passive: true });
    sr.addEventListener('touchend', e => {
      const st = start;
      start = null;
      if (!st || selectOf(e) !== st.s) return;
      const t = e.changedTouches[0];
      if (Math.hypot(t.clientX - st.x, t.clientY - st.y) > 10) return;
      e.preventDefault();
      this._ddOpen(st.s);
    }, { capture: true, passive: false });
    // The keyboard's way of opening a select
    sr.addEventListener('keydown', e => {
      const s = selectOf(e);
      if (!s || !(e.key === 'Enter' || e.key === ' ' || (e.altKey && e.key === 'ArrowDown'))) return;
      e.preventDefault();
      this._ddOpen(s);
    }, true);
  }

  _ddClose() {
    this.shadowRoot?.querySelector('[data-arr-dd]')?.remove();
  }

  _ddOpen(sel) {
    this._ddClose();
    const items = [];
    const add = o => {
      if (o.tagName !== 'OPTION' || o.hidden) return;
      // The prompt a select shows before anything is picked is not a choice
      if (o.disabled && o.value === '') return;
      items.push({ value: o.value, label: o.textContent.trim(), disabled: o.disabled });
    };
    for (const ch of sel.children) {
      if (ch.tagName === 'OPTGROUP') {
        items.push({ group: ch.label });
        for (const o of ch.children) add(o);
      } else add(ch);
    }
    if (!items.some(x => !x.group)) return;

    const cur = sel.value;
    const esc = s => this._escHtml(String(s ?? ''));
    const long = items.filter(x => !x.group).length > LONG;
    const chip = x => x.group
      ? `<div class="arr-dd-group">${esc(x.group)}</div>`
      : `<button class="arr-dd-opt${x.value === cur ? ' is-sel' : ''}" data-dd-v="${esc(x.value)}"${x.disabled ? ' disabled' : ''} title="${esc(x.label)}"><span class="arr-dd-lbl">${esc(x.label)}</span></button>`;

    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="popup-overlay arr-dd-overlay${this._isDay ? ' popup-day' : ''}" data-arr-dd>
      <div class="arr-dd" role="listbox">
        ${long ? `<input class="arr-dd-find" type="search" autocomplete="off" placeholder="${esc(this._t('ddFilter'))}">` : ''}
        <div class="arr-dd-list">${items.map(chip).join('')}</div>
      </div>
    </div>`;
    const ov = wrap.firstElementChild;
    const panel = ov.querySelector('.arr-dd');

    ov.addEventListener('click', e => {
      e.stopPropagation();
      const opt = e.target.closest('.arr-dd-opt');
      if (opt && !opt.disabled) {
        const v = opt.dataset.ddV;
        ov.remove();
        if (sel.isConnected && sel.value !== v) {
          sel.value = v;
          sel.dispatchEvent(new Event('input', { bubbles: true }));
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      if (e.target === ov) ov.remove();
    });
    ov.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); ov.remove(); sel.focus?.(); }
    });
    const find = ov.querySelector('.arr-dd-find');
    find?.addEventListener('input', () => {
      const q = find.value.trim().toLowerCase();
      ov.querySelectorAll('.arr-dd-opt').forEach(b => { b.hidden = !!q && !b.textContent.toLowerCase().includes(q); });
      ov.querySelectorAll('.arr-dd-group').forEach(g => { g.hidden = !!q; });
    });

    this.shadowRoot.appendChild(ov);
    this._ddPlace(panel, sel.closest('.mt-tb-sel, .mt-fsel') || sel, this._ddBounds(sel));
    ov.querySelector('.arr-dd-opt.is-sel')?.scrollIntoView?.({ block: 'nearest' });
    // A filter field takes the focus from a mouse; on a touch screen that
    // would throw the keyboard up over the list
    if (find && !matchMedia('(pointer: coarse)').matches) find.focus();
  }

  // The window a select sits in — the glass of its modal — or the screen for
  // one on the card itself. The list never reaches past it.
  _ddBounds(sel) {
    const ov = sel.closest('.popup-overlay');
    const box = ov && [...ov.children].find(c => c.contains(sel));
    if (box) {
      const b = box.getBoundingClientRect();
      return { left: Math.max(0, b.left), top: Math.max(0, b.top), right: Math.min(window.innerWidth, b.right), bottom: Math.min(window.innerHeight, b.bottom) };
    }
    return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  }

  // Under the select it belongs to, as wide as it or a little wider, and above
  // it when it fits there and not below. Inside the window the select is in,
  // as tall as its options need: it scrolls only when they do not fit.
  _ddPlace(panel, anchor, bounds) {
    const r = anchor.getBoundingClientRect();
    const GAP = 6, EDGE = 8;
    const room = bounds.right - bounds.left - 2 * EDGE;
    const w = Math.min(Math.max(r.width, 190), 340, room);
    panel.style.width = `${w}px`;
    panel.style.left = `${Math.max(bounds.left + EDGE, Math.min(r.left, bounds.right - w - EDGE))}px`;
    const need = panel.scrollHeight;
    const below = bounds.bottom - r.bottom - GAP - EDGE;
    const above = r.top - bounds.top - GAP - EDGE;
    const up = need > below && above > below;
    const fit = Math.max(0, up ? above : below);
    if (need > fit) {
      panel.style.maxHeight = `${Math.max(96, fit)}px`;
      panel.style.overflowY = 'auto';
    } else panel.style.overflowY = 'hidden';
    if (up) panel.style.bottom = `${window.innerHeight - r.top + GAP}px`;
    else panel.style.top = `${r.bottom + GAP}px`;
  }
}

export const dropdownMixin = _DropdownMethods.prototype;
