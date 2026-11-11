import { saveDlSort } from '../shared/ui.js';

class _WireMethods {
// `inst` is the qBittorrent the torrent is in ('1' or '2'). Pause or resume all
// goes to the instance the header's switch shows, or to both.
async _qbitAction(hash, action, deleteFiles = false, inst = '1') {
  this._markActivated();
  const isGlobal = action === 'pauseAll' || action === 'resumeAll';
  if (isGlobal) {
    this._qbitBusy = true;
  } else {
    this._qbitItemBusy = `${inst}:${hash}`;
  }
  this._reRenderLeft();
  try {
    const shown = this._dlInstFilter('qbit');
    const insts = !isGlobal ? [inst]
      : shown !== 'all' ? [shown]
      : [this._qbitConfigured && '1', this._qbit2Configured && '2'].filter(Boolean);
    await Promise.all(insts.map(i =>
      this._callApi('POST', `arr_stack/${i === '2' ? 'qbit2' : 'qbit'}/action`, { action, hash, deleteFiles })));
  } catch (e) {
    console.error('[arr-card] qBit action error:', e);
  } finally {
    this._confirmRemove = null;
    await new Promise(r => setTimeout(r, 2000));
    await this._fetchQbit();
    this._qbitBusy = false;
    this._qbitItemBusy = null;
    this._reRenderLeft();
  }
}

// ─────────────────────────────────────────────
// Deluge action API
// ─────────────────────────────────────────────

async _delugeAction(hash, action, deleteFiles = false) {
  this._markActivated();
  const isGlobal = action === 'pauseAll' || action === 'resumeAll';
  if (isGlobal) {
    this._delugeBusy = true;
  } else {
    this._delugeItemBusy = hash;
  }
  this._reRenderLeft();
  try {
    await this._callApi('POST', 'arr_stack/deluge/action', { action, hash, deleteFiles });
  } catch (e) {
    console.error('[arr-card] Deluge action error:', e);
  } finally {
    this._delugeConfirm = null;
    await new Promise(r => setTimeout(r, 2000));
    await this._fetchDeluge();
    this._delugeBusy = false;
    this._delugeItemBusy = null;
    this._reRenderLeft();
  }
}

async _rtorrentAction(hash, action, deleteFiles = false) {
  this._markActivated();
  const isGlobal = action === 'pauseAll' || action === 'resumeAll';
  if (isGlobal) {
    this._rtorrentBusy = true;
  } else {
    this._rtorrentItemBusy = hash;
  }
  this._reRenderLeft();
  try {
    const mode = isGlobal ? (action === 'pauseAll' ? 'global_pause' : 'global_resume')
               : deleteFiles ? 'delete_files'
               : action === 'delete' ? 'delete'
               : action;
    await this._callApi('POST', 'arr_stack/rtorrent/action', { action: mode, id: hash });
  } catch (e) {
    console.error('[arr-card] rTorrent action error:', e);
  } finally {
    this._rtorrentConfirm = null;
    await new Promise(r => setTimeout(r, 2000));
    await this._fetchRtorrent();
    this._rtorrentBusy = false;
    this._rtorrentItemBusy = null;
    this._reRenderLeft();
  }
}

async _transmissionAction(hash, action, deleteFiles = false) {
  this._markActivated();
  const isGlobal = action === 'pauseAll' || action === 'resumeAll';
  if (isGlobal) {
    this._transmissionBusy = true;
  } else {
    this._transmissionItemBusy = hash;
  }
  this._reRenderLeft();
  try {
    const mode = isGlobal ? (action === 'pauseAll' ? 'global_pause' : 'global_resume')
               : deleteFiles ? 'delete_files'
               : action === 'delete' ? 'delete'
               : action;
    // Transmission knows a torrent by the id it gave it, not by its hash
    const row = (this._transmissionQueue || []).find(t => t.hash === hash);
    await this._callApi('POST', 'arr_stack/transmission/action', { action: mode, id: row?.id ?? hash });
  } catch (e) {
    console.error('[arr-card] Transmission action error:', e);
  } finally {
    this._transmissionConfirm = null;
    await new Promise(r => setTimeout(r, 2000));
    await this._fetchTransmission();
    this._transmissionBusy = false;
    this._transmissionItemBusy = null;
    this._reRenderLeft();
  }
}

// ─────────────────────────────────────────────
// SABnzbd action API
// ─────────────────────────────────────────────

// Pause or resume the queue of the SABnzbd the header's switch shows, or of both
async _sabAction(mode) {
  this._markActivated();
  this._sabBusy = true;
  this._reRenderLeft();
  try {
    const shown = this._dlInstFilter('sab');
    const insts = shown !== 'all' ? [shown]
      : [this._sabConfigured && '1', this._sab2Configured && '2'].filter(Boolean);
    await Promise.all(insts.map(i =>
      this._callApi('POST', `arr_stack/${i === '2' ? 'sabnzbd2' : 'sabnzbd'}/action`, { mode })));
  } catch (e) {
    console.error('[arr-card] SAB action error:', e);
  } finally {
    await this._fetchSab();    // spinner stále viditelný během fetche
    this._sabBusy = false;     // teprve po dokončení fetche schovat spinner
    this._reRenderLeft();
  }
}

// ─────────────────────────────────────────────
// Re-render only the left column (downloads)
// ─────────────────────────────────────────────

_reRenderLeft() {
  const left = this.shadowRoot.getElementById('col-left');
  if (!left) return;
  this._blurActive();
  this._lastLeftHtml = null;
  this._paintCol(left, this._mobMinWrap('left', this._renderLeft()));
  this._wireSort();
  this._wireActionButtons();
  // The whole card, not just this column: wiring starts by dropping every
  // paging listener the card has, so a call scoped to the left left the right
  // column's arrows, dots and swipe dead until the next poll rewired them.
  // The full call drops and rewires both, so nothing is wired twice.
  this._wirePageButtons();
  this._wireMinimize();
}

// ─────────────────────────────────────────────
// Wire up action buttons (global + per-torrent)
// ─────────────────────────────────────────────

_wireActionButtons() {
  // ── Queue row → media popup ──
  // Delegated on the left column, which survives every re-render of the rows.
  const dlCol = this.shadowRoot.getElementById('col-left');
  if (dlCol && !dlCol._dlOpenWired) {
    dlCol._dlOpenWired = true;
    dlCol.addEventListener('click', e => {
      // Anything with its own handler wins — action buttons sit inside the row
      if (e.target.closest('button, .tb, a, input, select')) return;
      const row = e.target.closest('[data-dl-open]');
      if (!row) return;
      this._markActivated();
      const hit = this._mediaForDownloadId(row.dataset.dlOpen);
      if (!hit) {
        this._dlInfoName = row.querySelector('.dl-name')?.textContent?.trim() || '';
        this._dlInfoOpen = true;
        this._renderDlInfoEl();
        return;
      }
      if (hit.type === 'music') { this._openMusicModal(hit.artistId); return; }
      this._openPopup(hit.type, hit.tmdbId, hit.tvdbId, hit.title, hit.radarrId, hit.radarr2Id);
    });
    // A second qBittorrent or SABnzbd: the header's switch and a row's label
    // both pick the instance shown. The label of the instance already shown
    // goes back to both.
    dlCol.addEventListener('click', e => {
      const btn = e.target.closest('[data-dl-inst]');
      if (!btn) return;
      e.stopPropagation();
      const [kind, v] = btn.dataset.dlInst.split(':');
      const fromRow = btn.classList.contains('dl-inst');
      this._dlInstSet(kind, fromRow && this._dlInstFilter(kind) === v ? 'all' : v);
      this._reRenderLeft();
    });
  }

  // ── qBit global pause / resume ──
  const qbitToggle = this.shadowRoot.querySelector('.qbit-global-toggle');
  if (qbitToggle) {
    qbitToggle.addEventListener('click', () => {
      const paused = qbitToggle.classList.contains('paused');
      this._qbitAction(null, paused ? 'resumeAll' : 'pauseAll');
    });
  }

  // ── SAB global pause / resume ──
  const sabToggle = this.shadowRoot.querySelector('.sab-global-toggle');
  if (sabToggle) {
    sabToggle.addEventListener('click', () => {
      const paused = sabToggle.classList.contains('paused');
      this._sabAction(paused ? 'resume' : 'pause');
    });
  }

  // ── SAB retry buttons ──
  this.shadowRoot.querySelectorAll('.tb-retry').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const nzoId = btn.dataset.nzoid;
      if (nzoId) this._sabRetry(nzoId);
    });
  });

  // ── SAB history delete buttons ──
  this.shadowRoot.querySelectorAll('.tb-hist-del').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const nzoId = btn.dataset.nzoid;
      if (nzoId) this._sabHistoryDelete(nzoId);
    });
  });

  // ── SAB queue action buttons (confirm / cancel / delete) ──
  this.shadowRoot.querySelectorAll('[data-sab-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.sabAction;
      const nzoId  = btn.dataset.nzoid;
      if (!nzoId) return;
      if (action === 'confirm') {
        this._sabQueueConfirm = nzoId;
        this._reRenderLeft();
      } else if (action === 'cancel') {
        this._sabQueueConfirm = null;
        this._reRenderLeft();
      } else if (action === 'delete') {
        this._sabQueueConfirm = null;
        this._sabQueueDelete(nzoId);
      }
    });
  });

  // ── NZBGet global pause / resume ──
  const nzbgetToggle = this.shadowRoot.querySelector('.nzbget-global-toggle');
  if (nzbgetToggle) {
    nzbgetToggle.addEventListener('click', () => {
      const paused = nzbgetToggle.classList.contains('paused');
      this._nzbgetAction(paused ? 'resume' : 'pause');
    });
  }

  // ── NZBGet item action buttons ──
  this.shadowRoot.querySelectorAll('[data-nzbget-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.nzbgetAction;
      const nzbId  = parseInt(btn.dataset.nzbid, 10);
      if (!nzbId) return;
      if (action === 'confirm') {
        this._nzbgetConfirm = nzbId;
        this._reRenderLeft();
      } else if (action === 'cancel') {
        this._nzbgetConfirm = null;
        this._reRenderLeft();
      } else if (action === 'item-delete') {
        this._nzbgetConfirm = null;
        this._nzbgetItemDelete(nzbId);
      } else if (action === 'retry') {
        this._nzbgetRetry(nzbId);
      }
    });
  });

  // ── Deluge global pause / resume ──
  const delugeToggle = this.shadowRoot.querySelector('.deluge-global-toggle');
  if (delugeToggle) {
    delugeToggle.addEventListener('click', () => {
      const paused = delugeToggle.classList.contains('paused');
      this._delugeAction(null, paused ? 'resumeAll' : 'pauseAll');
    });
  }

  // ── Deluge per-torrent action buttons ──
  this.shadowRoot.querySelectorAll('[data-dlg-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.dlgAction;
      const hash   = btn.dataset.dlgHash || '';

      if (action === 'pause') {
        this._delugeAction(hash, 'pause');
      } else if (action === 'resume') {
        this._delugeAction(hash, 'resume');
      } else if (action === 'remove-confirm') {
        this._delugeConfirm = hash;
        this._reRenderLeft();
      } else if (action === 'cancel-remove') {
        this._delugeConfirm = null;
        this._reRenderLeft();
      } else if (action === 'remove-keep') {
        this._delugeAction(hash, 'delete', false);
      } else if (action === 'remove-del') {
        this._delugeAction(hash, 'delete', true);
      }
    });
  });

  // ── rTorrent global pause / resume ──
  const rtorrentToggle = this.shadowRoot.querySelector('.rtorrent-global-toggle');
  if (rtorrentToggle) {
    rtorrentToggle.addEventListener('click', () => {
      const paused = rtorrentToggle.classList.contains('paused');
      this._rtorrentAction(null, paused ? 'resumeAll' : 'pauseAll');
    });
  }

  // ── rTorrent per-torrent action buttons ──
  this.shadowRoot.querySelectorAll('[data-rt-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.rtAction;
      const hash   = btn.dataset.rtHash || '';

      if (action === 'pause') {
        this._rtorrentAction(hash, 'pause');
      } else if (action === 'resume') {
        this._rtorrentAction(hash, 'resume');
      } else if (action === 'remove-confirm') {
        this._rtorrentConfirm = hash;
        this._reRenderLeft();
      } else if (action === 'cancel-remove') {
        this._rtorrentConfirm = null;
        this._reRenderLeft();
      } else if (action === 'remove-keep') {
        this._rtorrentAction(hash, 'delete', false);
      } else if (action === 'remove-del') {
        this._rtorrentAction(hash, 'delete', true);
      }
    });
  });

  // ── Transmission global pause / resume ──
  const transmissionToggle = this.shadowRoot.querySelector('.transmission-global-toggle');
  if (transmissionToggle) {
    transmissionToggle.addEventListener('click', () => {
      const paused = transmissionToggle.classList.contains('paused');
      this._transmissionAction(null, paused ? 'resumeAll' : 'pauseAll');
    });
  }

  // ── Transmission per-torrent action buttons ──
  this.shadowRoot.querySelectorAll('[data-tr-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.trAction;
      const hash   = btn.dataset.trHash || '';

      if (action === 'pause') {
        this._transmissionAction(hash, 'pause');
      } else if (action === 'resume') {
        this._transmissionAction(hash, 'resume');
      } else if (action === 'remove-confirm') {
        this._transmissionConfirm = hash;
        this._reRenderLeft();
      } else if (action === 'cancel-remove') {
        this._transmissionConfirm = null;
        this._reRenderLeft();
      } else if (action === 'remove-keep') {
        this._transmissionAction(hash, 'delete', false);
      } else if (action === 'remove-del') {
        this._transmissionAction(hash, 'delete', true);
      }
    });
  });

  // ── Per-torrent action buttons ──
  this.shadowRoot.querySelectorAll('[data-tb-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action = btn.dataset.tbAction;
      const hash   = btn.dataset.hash || '';
      const inst   = btn.dataset.inst === '2' ? '2' : '1';

      if (action === 'pause') {
        this._qbitAction(hash, 'pause', false, inst);
      } else if (action === 'resume') {
        this._qbitAction(hash, 'resume', false, inst);
      } else if (action === 'remove-confirm') {
        this._confirmRemove = `${inst}:${hash}`;
        this._reRenderLeft();
      } else if (action === 'cancel-remove') {
        this._confirmRemove = null;
        this._reRenderLeft();
      } else if (action === 'remove-keep') {
        this._qbitAction(hash, 'delete', false, inst);
      } else if (action === 'remove-del') {
        this._qbitAction(hash, 'delete', true, inst);
      }
    });
  });
}

// ─────────────────────────────────────────────
// Wire up sort buttons (only re-renders torrent list)
// ─────────────────────────────────────────────

_wireSort() {
  // The instance switch shares the look, not the job (_dlInstSwitchHtml)
  const btns = this.shadowRoot.querySelectorAll('.sort-btns .sb:not([data-dl-inst])');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.sort || 'progress_desc';
      if (btn.dataset.client === 'deluge') {
        this._sortDeluge = val;
        this._pages.deluge = 0;
      } else if (btn.dataset.client === 'rtorrent') {
        this._sortRtorrent = val;
        this._pages.rtorrent = 0;
      } else if (btn.dataset.client === 'transmission') {
        this._sortTransmission = val;
        this._pages.transmission = 0;
      } else {
        this._sort = val;
        this._pages.qbit = 0;
      }
      saveDlSort(['deluge', 'rtorrent', 'transmission'].includes(btn.dataset.client) ? btn.dataset.client : 'qbit', val);
      this._render();
    });
  });
}
}

export const wireMixin = _WireMethods.prototype;
