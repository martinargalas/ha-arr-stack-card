// Activity, the column pickers of each tab. Split out of wire/activity.js.

class _WireActivityColumnsMethods {

  // One picker for every Activity tab: a checkbox per column, ticked as the
  // tab shows it. A change is remembered and repaints the tab; the gear, or a
  // click anywhere else, closes it. `config` runs only when the picker opens.
  _actColPicker(gearBtn, attr, config) {
    const existing = this.shadowRoot.querySelector(`[${attr}]`);
    if (existing) { existing.remove(); gearBtn.classList.remove('active'); return; }
    const c = config();
    if (!c) return;
    const { cols, all, storeKey, repaint } = c;
    const isDay   = this._isDay;
    const pkBg    = isDay ? 'rgba(245,246,255,0.99)' : 'rgba(18,18,28,0.97)';
    const pkBdr   = isDay ? 'rgba(0,0,0,0.10)'       : 'rgba(255,255,255,0.14)';
    const pkHdr   = isDay ? 'rgba(0,0,0,0.32)'        : 'rgba(255,255,255,0.35)';
    const pkLbl   = isDay ? 'rgba(0,0,0,0.65)'        : 'rgba(255,255,255,0.82)';
    const rect  = gearBtn.getBoundingClientRect();
    const top   = Math.round(rect.bottom + 6);
    const right = Math.round(window.innerWidth - rect.right);
    const wrap  = document.createElement('div');
    wrap.innerHTML = `<div ${attr} style="position:fixed;top:${top}px;right:${right}px;z-index:1200;min-width:175px;background:${pkBg};border:1px solid ${pkBdr};border-radius:9px;padding:10px 14px 12px;box-shadow:0 8px 28px rgba(0,0,0,0.25)">
      <div style="font-size:9px;font-weight:700;color:${pkHdr};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">${this._t('actColPickerHdr')}</div>
      ${all.map(([id, key]) => `<label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;user-select:none"><input type="checkbox" class="act-col-cb" data-col-id="${id}" ${cols.has(id) ? 'checked' : ''} style="cursor:pointer;accent-color:rgba(99,140,255,1);width:14px;height:14px;flex-shrink:0"><span style="font-size:12px;color:${pkLbl}">${this._t(key)}</span></label>`).join('')}
    </div>`;
    const picker = wrap.firstElementChild;
    this.shadowRoot.appendChild(picker);
    gearBtn.classList.add('active');
    picker.querySelectorAll('.act-col-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) cols.add(cb.dataset.colId); else cols.delete(cb.dataset.colId);
        try { localStorage.setItem(storeKey, JSON.stringify([...cols])); } catch {}
        const actModal = this.shadowRoot.querySelector('[data-act-modal]');
        const body = actModal?.querySelector('#act-body');
        if (body) repaint(body, actModal);
      });
    });
    const closeHandler = e => {
      if (!picker.contains(e.target) && !gearBtn.contains(e.target)) {
        picker.remove();
        gearBtn.classList.remove('active');
        this.shadowRoot.removeEventListener('click', closeHandler, true);
      }
    };
    setTimeout(() => this.shadowRoot.addEventListener('click', closeHandler, true), 0);
  }

  _openHistoryColPicker(gearBtn) {
    this._actColPicker(gearBtn, 'data-hist-col-picker', () => {
      const m = this._activityModal;
      return m && { cols: m.histCols, storeKey: 'arr-stack-hist-cols',
        all: [['event', 'actColEvent'], ['quality', 'actColQuality'], ['langs', 'actColLangs'], ['formats', 'actColFormats'],
              ['date', 'actColDate'], ['client', 'actColDlClient'], ['indexer', 'actColIndexer'], ['relgroup', 'actColRelgroup'],
              ['srctitle', 'actColSrcTitle'], ['cfscore', 'actColCfScore']],
        repaint: (body, actModal) => {
          if (!m.histData) return;
          this._actSetBodyHtml(body, this._actHistoryTabHtml(m.histData.radarr, m.histData.sonarr, m.histFilter, m.histPage, m.histPerPage));
          this._wireActBody(body, actModal, 'history');
        } };
    });
  }

  _openBlColPicker(gearBtn) {
    this._actColPicker(gearBtn, 'data-bl-col-picker', () => {
      const m = this._activityModal;
      return m && { cols: m.blCols, storeKey: 'arr-stack-bl-cols',
        all: [['source', 'actColSource'], ['srctitle', 'actColSrcTitle'], ['langs', 'actColLangs'], ['quality', 'actColQuality'],
              ['formats', 'actColFormats'], ['date', 'actColDate'], ['indexer', 'actColIndexer'], ['protocol', 'actColProtocol']],
        repaint: (body, actModal) => {
          if (!m.blData) return;
          this._actSetBodyHtml(body, this._actBlocklistTabHtml(m.blData.radarr, m.blData.sonarr, m.blPage, m.blPerPage));
          this._wireActBody(body, actModal, 'blocklist');
        } };
    });
  }

  _openQueueColPicker(gearBtn) {
    this._actColPicker(gearBtn, 'data-col-picker', () => {
      const m = this._activityModal;
      return m && { cols: m.queueCols, storeKey: 'arr-stack-queue-cols',
        all: [['source', 'actColSource'], ['quality', 'actColQuality'], ['size', 'actColSize'], ['timeleft', 'actColTimeLeft'],
              ['formats', 'actColFormats'], ['protocol', 'actColProtocol'], ['indexer', 'actColIndexer'], ['client', 'actColDlClient'],
              ['status', 'actColStatus']],
        repaint: (body, actModal) => {
          if (!m.queueData) return;
          this._actSetBodyHtml(body, this._actQueueTabHtml(m.queueData.radarr, m.queueData.sonarr, m.queuePage, m.queuePerPage, m.queueCols));
          this._wireActBody(body, actModal, 'queue');
        } };
    });
  }

  _openMissingColPicker(gearBtn) {
    this._actColPicker(gearBtn, 'data-missing-col-picker', () => {
      const m = this._activityModal;
      return m && { cols: m.missingCols, storeKey: 'arr-stack-missing-cols',
        all: [['monitored', 'actColMonitored'], ['source', 'actColSource'], ['year', 'actColYear'], ['profile', 'actColProfile'],
              ['added', 'actColAdded'], ['missing', 'actColMissingEps']],
        repaint: (body, actModal) => {
          if (this._actMissingCache) this._actRenderMissing(body, actModal);
        } };
    });
  }

}

export const wireActivityColumnsMixin = _WireActivityColumnsMethods.prototype;
