class _DownloadsMethods {

async _fetchSab() {
  if (this._dlHeld('SABnzbd')) return;
  try {
    const data = await this._callApi('GET', 'arr_stack/sabnzbd/queue');
    // SABnzbd returns HTTP 200 with {status:false} on wrong API key — treat as unconfigured
    if (data?.status === false) {
      console.error('[arr-card] SABnzbd API error:', data?.error);
      this._sabConfigured = false;
      return;
    }
    const queue = data.queue || {};
    // Track which items' mbleft decreased → actively downloading
    // (SABnzbd reports status:'Downloading' for ALL queue slots, not just the active one)
    const prev = this._sabMbleftPrev || {};
    const curr = {};
    const active = new Set();
    const slots = queue.slots || [];
    const globalSpeed = parseFloat(queue.kbpersec) || 0;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const mbleft = parseFloat(s.mbleft) || 0;
      curr[s.nzo_id] = mbleft;
      if (s.nzo_id in prev && prev[s.nzo_id] > mbleft) {
        active.add(s.nzo_id);
      }
      // fallback: first slot is always the active download when speed > 0
      if (i === 0 && globalSpeed > 0 && mbleft > 0) {
        active.add(s.nzo_id);
      }
    }
    this._sabMbleftPrev = curr;
    this._sabActiveIds  = queue.status === 'Paused' ? new Set() : active;
    this._sab           = queue;
    this._sabConfigured = true;
    this._dlFetchOk('SABnzbd');
    this._fetchVpnIp();
  } catch (e) {
    this._dlFetchFailed('SABnzbd', '_sabConfigured', e);
  }
}

async _fetchVpnIp() {
  if (this._vpnIpFetching) return;
  this._vpnIpFetching = true;
  try {
    const res = await this._callApi('GET', 'arr_stack/sabnzbd/status');
    const newLocal  = res?.status?.localipv4  || null;
    const newPublic = res?.status?.publicipv4 || null;
    const changed   = !this._sabVpnFetched || newLocal !== this._sabLocalIp || newPublic !== this._sabPublicIp;
    this._sabLocalIp    = newLocal;
    this._sabPublicIp   = newPublic;
    this._sabVpnFetched = true;
    if (changed) this._render();
  } catch (e) { /* silent */ } finally {
    this._vpnIpFetching = false;
  }
}

async _fetchSabHistory() {
  try {
    const data = await this._callApi('GET', 'arr_stack/sabnzbd/history');
    const slots = data?.history?.slots || [];
    this._sabFailed    = slots.filter(s => s.status === 'Failed');
    const DONE = new Set(['Completed', 'Extracting', 'Moving', 'Running Script', 'Verifying']);
    this._sabCompleted = slots.filter(s => DONE.has(s.status)).slice(0, 10);
  } catch (e) {
    console.error('[arr-card] SABnzbd history fetch error:', e);
  }
}

async _sabQueueDelete(nzoId) {
  this._sabQueueBusy = nzoId;
  this._reRenderLeft();
  try {
    await this._callApi('POST', 'arr_stack/sabnzbd/action', { mode: 'queue', name: 'delete', nzo_id: nzoId });
  } catch (e) {
    console.error('[arr-card] SAB queue delete error:', e);
  } finally {
    this._sabQueueBusy = null;
    await this._fetchSab();
    this._reRenderLeft();
  }
}

async _sabHistoryDelete(nzoId) {
  this._sabDeleteBusy = nzoId;
  this._reRenderLeft();
  try {
    await this._callApi('POST', 'arr_stack/sabnzbd/action', { mode: 'history', name: 'delete', nzo_id: nzoId });
  } catch (e) {
    console.error('[arr-card] SABnzbd history delete error:', e);
  } finally {
    await this._fetchSabHistory();
    this._sabDeleteBusy = null;
    this._reRenderLeft();
  }
}

async _sabRetry(nzoId) {
  this._sabRetryBusy = nzoId;
  this._reRenderLeft();
  try {
    await this._callApi('POST', 'arr_stack/sabnzbd/action', { mode: 'retry', nzo_id: nzoId });
  } catch (e) {
    console.error('[arr-card] SABnzbd retry error:', e);
  } finally {
    await new Promise(r => setTimeout(r, 1000));
    await Promise.all([this._fetchSab(), this._fetchSabHistory()]);
    this._sabRetryBusy = null;
    this._reRenderLeft();
  }
}

async _fetchNzbget() {
  if (this._dlHeld('NZBGet')) return;
  try {
    const [statusResp, queueResp] = await Promise.all([
      this._callApi('GET', 'arr_stack/nzbget/status'),
      this._callApi('GET', 'arr_stack/nzbget/queue'),
    ]);
    this._nzbget      = statusResp?.result || null;
    this._nzbgetQueue = queueResp?.result || [];
    this._nzbgetConfigured = true;
    this._dlFetchOk('NZBGet');
  } catch (e) {
    this._dlFetchFailed('NZBGet', '_nzbgetConfigured', e);
  }
}

async _fetchNzbgetHistory() {
  try {
    const data = await this._callApi('GET', 'arr_stack/nzbget/history');
    const items = data?.result || [];
    this._nzbgetFailed    = items.filter(i => i.Status === 'FAILURE');
    this._nzbgetCompleted = items.filter(i => i.Status === 'SUCCESS').slice(0, 10);
  } catch (e) {
    console.error('[arr-card] NZBGet history fetch error:', e);
  }
}

async _nzbgetAction(mode, id = null) {
  this._markActivated();
  this._nzbgetBusy = true;
  this._reRenderLeft();
  try {
    await this._callApi('POST', 'arr_stack/nzbget/action', { mode, id });
  } catch (e) {
    console.error('[arr-card] NZBGet action error:', e);
  } finally {
    await this._fetchNzbget();
    this._nzbgetBusy = false;
    this._reRenderLeft();
  }
}

async _nzbgetRetry(nzbId) {
  this._nzbgetRetryBusy = nzbId;
  this._reRenderLeft();
  try {
    await this._callApi('POST', 'arr_stack/nzbget/action', { mode: 'group_redownload', id: nzbId });
  } catch (e) {
    console.error('[arr-card] NZBGet retry error:', e);
  } finally {
    await new Promise(r => setTimeout(r, 1000));
    await Promise.all([this._fetchNzbget(), this._fetchNzbgetHistory()]);
    this._nzbgetRetryBusy = null;
    this._reRenderLeft();
  }
}

async _nzbgetItemDelete(nzbId) {
  this._markActivated();
  this._nzbgetItemBusy = nzbId;
  this._reRenderLeft();
  try {
    await this._callApi('POST', 'arr_stack/nzbget/action', { mode: 'group_delete', id: nzbId });
  } catch (e) {
    console.error('[arr-card] NZBGet delete error:', e);
  } finally {
    this._nzbgetItemBusy = null;
    this._nzbgetConfirm  = null;
    await this._fetchNzbget();
    this._reRenderLeft();
  }
}

// What a failed fetch of a download client means, in one place.
//
// Three different things arrive here. 503 says the client is not set up, and
// the card stops asking. 502 says it is set up but not answering — a stopped
// container, a web server in front of it — so the client stays and the next
// poll tries again. Anything else is a real fault and reads the same way.
//
// Either way the console gets one line per change of state, not one per poll:
// a client that is down for an hour used to write hundreds of them.
_dlFetchFailed(name, flag, e) {
  const status = e?.status_code ?? e?.status ?? e?.response?.status;
  const body   = typeof e?.body === 'string' ? e.body : JSON.stringify(e?.body ?? e?.message ?? e);
  const notConfigured = status === 503 || body.includes('not configured');
  this[flag] = !notConfigured;
  this._dlLastError = this._dlLastError || {};
  const signature = `${status}:${notConfigured}`;
  if (this._dlLastError[name] !== signature) {
    this._dlLastError[name] = signature;
    console.error(`[arr-card] ${name} fetch error${notConfigured ? ' (not configured)' : ''}:`, e);
  }
  // Backing off. The card's own line is written once, but the browser logs
  // every failed request itself, and a client that is down for an hour would
  // otherwise be asked twelve hundred times. Five seconds, then doubling to a
  // minute; the client stays on the card and comes back on its own.
  this._dlFails = this._dlFails || {};
  this._dlHoldUntil = this._dlHoldUntil || {};
  const fails = (this._dlFails[name] = (this._dlFails[name] || 0) + 1);
  this._dlHoldUntil[name] = Date.now() + Math.min(60000, 5000 * 2 ** (fails - 1));
}

// A client that answers again says so once, so the next outage is logged, and
// is asked at the usual rate from then on.
_dlFetchOk(name) {
  if (this._dlLastError?.[name]) delete this._dlLastError[name];
  if (this._dlFails?.[name]) delete this._dlFails[name];
  if (this._dlHoldUntil?.[name]) delete this._dlHoldUntil[name];
}

// True while a client that just failed is being left alone.
_dlHeld(name) {
  const until = this._dlHoldUntil?.[name] || 0;
  return until > Date.now();
}

async _fetchQbit() {
  if (this._dlHeld('qBittorrent')) return;
  try {
    const [torrents, transfer, maindata] = await Promise.all([
      this._callApi('GET', 'arr_stack/qbit/torrents'),
      this._callApi('GET', 'arr_stack/qbit/transfer'),
      this._callApi('GET', 'arr_stack/qbit/maindata').catch(() => null),
    ]);
    this._qbit = torrents;
    this._qbitTransfer = transfer;
    this._qbitDiskFreeBytes = maindata?.server_state?.free_space_on_disk ?? null;
    this._qbitConfigured = true;
    this._dlFetchOk('qBittorrent');
  } catch (e) {
    this._dlFetchFailed('qBittorrent', '_qbitConfigured', e);
  }
}

async _fetchDeluge() {
  if (this._delugeConfigured === false) return;
  if (this._dlHeld('Deluge')) return;
  try {
    const [torrents, status] = await Promise.all([
      this._callApi('GET', 'arr_stack/deluge/queue'),
      this._callApi('GET', 'arr_stack/deluge/status').catch(() => ({})),
    ]);
    this._delugeQueue = Array.isArray(torrents) ? torrents : [];
    this._delugeStatus = status || {};
    this._delugeConfigured = true;
    this._dlFetchOk('Deluge');
  } catch (e) {
    this._dlFetchFailed('Deluge', '_delugeConfigured', e);
  }
}

async _fetchTransmission() {
  if (this._transmissionConfigured === false) return;
  if (this._dlHeld('Transmission')) return;
  try {
    const [torrents, status] = await Promise.all([
      this._callApi('GET', 'arr_stack/transmission/queue'),
      this._callApi('GET', 'arr_stack/transmission/status').catch(() => ({})),
    ]);
    this._transmissionQueue  = Array.isArray(torrents) ? torrents : [];
    this._transmissionStatus = status || {};
    this._transmissionConfigured = true;
    this._dlFetchOk('Transmission');
  } catch (e) {
    this._dlFetchFailed('Transmission', '_transmissionConfigured', e);
  }
}

async _fetchRtorrent() {
  if (this._rtorrentConfigured === false) return;
  if (this._dlHeld('rTorrent')) return;
  try {
    const [torrents, status] = await Promise.all([
      this._callApi('GET', 'arr_stack/rtorrent/queue'),
      this._callApi('GET', 'arr_stack/rtorrent/status').catch(() => ({})),
    ]);
    this._rtorrentQueue  = Array.isArray(torrents) ? torrents : [];
    this._rtorrentStatus = status || {};
    this._rtorrentConfigured = true;
    this._dlFetchOk('rTorrent');
  } catch (e) {
    this._dlFetchFailed('rTorrent', '_rtorrentConfigured', e);
  }
}

}

export const downloadsMixin = _DownloadsMethods.prototype;
