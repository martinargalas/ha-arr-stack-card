// A second qBittorrent or SABnzbd (#8 in the integration's repo). Its downloads
// share the client's section with the first one's. Nothing here shows unless a
// second instance is set up: then the header gets a switch between them (one
// button stepping through them on a phone), and while both are shown each row carries a small label saying
// whose it is: 1 or 2. Names were left out on purpose — a long one would not
// fit the header or the row.

import { saveDlInst } from '../shared/ui.js';

const KINDS = { qbit: '_qbit2Configured', sab: '_sab2Configured' };

class _DlInstMethods {
  // True when this client has a second instance
  _dlInstOn(kind) {
    return !!this[KINDS[kind]];
  }

  // 'all', '1' or '2' — always 'all' without a second instance, whatever was saved
  _dlInstFilter(kind) {
    if (!this._dlInstOn(kind)) return 'all';
    const v = this._dlInst?.[kind];
    return v === '1' || v === '2' ? v : 'all';
  }

  // Items of the instance being shown
  _dlInstPick(kind, items) {
    const f = this._dlInstFilter(kind);
    if (f === 'all') return items;
    return items.filter(i => (i?._inst || '1') === f);
  }

  // Tooltip: "Instance 2"
  _dlInstTitle(kind, inst) {
    return this._t(inst === '2' ? 'libInst2' : 'libInst1');
  }

  _dlInstSet(kind, v) {
    if (!this._dlInst) this._dlInst = {};
    this._dlInst[kind] = v;
    saveDlInst(kind, v);
    if (this._pages) this._pages[kind] = 0;
  }

  // The header's switch. On a tablet and a desktop it is three buttons, as in
  // the Library (1|2 · 1 · 2). On a phone those left no room for the sort
  // buttons and the pause button, so there it is one button that steps through
  // both → 1 → 2 → both; the CSS shows the one that fits. The row labels still
  // jump straight to one instance.
  _dlInstSwitchHtml(kind) {
    if (!this._dlInstOn(kind)) return '';
    const cur = this._dlInstFilter(kind);
    const titleOf = v => v === 'all' ? this._t('libBothInst') : this._dlInstTitle(kind, v);
    const btn = (v, label) =>
      `<button class="sb${cur === v ? ' on' : ''}" data-dl-inst="${kind}:${v}" title="${this._escHtml(titleOf(v))}">${label}</button>`;
    const next = { all: '1', 1: '2', 2: 'all' }[cur];
    return `<div class="sort-btns dl-inst-btns dl-inst-full">
      ${btn('all', '1&nbsp;|&nbsp;2')}${btn('1', '1')}${btn('2', '2')}
    </div><div class="sort-btns dl-inst-btns dl-inst-one">
      <button class="sb${cur === 'all' ? '' : ' on'}" data-dl-inst="${kind}:${next}" title="${this._escHtml(titleOf(cur))}">${cur === 'all' ? '1&nbsp;|&nbsp;2' : cur}</button>
    </div>`;
  }

  // The row's label, only while both instances are shown. A click on it shows
  // only that instance.
  _dlInstChipHtml(kind, item) {
    if (this._dlInstFilter(kind) !== 'all' || !this._dlInstOn(kind)) return '';
    // Downloads → Download row → Instance label (shown in the editor only with two instances)
    if (!this._dlRow('rowInstance')) return '';
    const inst = item?._inst === '2' ? '2' : '1';
    return `<button class="dl-inst${inst === '2' ? ' dl-inst-2' : ''}" data-dl-inst="${kind}:${inst}" title="${this._escHtml(this._dlInstTitle(kind, inst))}">${inst}</button>`;
  }
}

export const dlInstMixin = _DlInstMethods.prototype;
