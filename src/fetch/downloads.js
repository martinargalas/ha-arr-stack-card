class _DownloadsMethods {

async _fetchSab() {
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
    this._fetchVpnIp();
  } catch (e) {
    const status = e?.status_code ?? e?.status ?? e?.response?.status;
    const body   = typeof e?.body === 'string' ? e.body : JSON.stringify(e?.body ?? e?.message ?? e);
    const isNotConfigured = status === 503 || body.includes('not configured');
    this._sabConfigured = !isNotConfigured;
    console.error('[arr-card] SABnzbd fetch error:', e);
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
  try {
    const [statusResp, queueResp] = await Promise.all([
      this._callApi('GET', 'arr_stack/nzbget/status'),
      this._callApi('GET', 'arr_stack/nzbget/queue'),
    ]);
    this._nzbget      = statusResp?.result || null;
    this._nzbgetQueue = queueResp?.result || [];
    this._nzbgetConfigured = true;
  } catch (e) {
    const status = e?.status_code ?? e?.status ?? e?.response?.status;
    const body   = typeof e?.body === 'string' ? e.body : JSON.stringify(e?.body ?? e?.message ?? e);
    this._nzbgetConfigured = !(status === 503 || (body && body.includes('not configured')));
    if (this._nzbgetConfigured) console.error('[arr-card] NZBGet fetch error:', e);
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

async _fetchQbit() {
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
  } catch (e) {
    const status = e?.status_code ?? e?.status ?? e?.response?.status;
    const body   = typeof e?.body === 'string' ? e.body : JSON.stringify(e?.body ?? e?.message ?? e);
    const isNotConfigured = status === 503 || body.includes('not configured');
    this._qbitConfigured = !isNotConfigured;
    console.error('[arr-card] qBittorrent fetch error:', e);
  }
}

async _fetchDeluge() {
  if (this._delugeConfigured === false) return;
  try {
    const [torrents, status] = await Promise.all([
      this._callApi('GET', 'arr_stack/deluge/queue'),
      this._callApi('GET', 'arr_stack/deluge/status').catch(() => ({})),
    ]);
    this._delugeQueue = Array.isArray(torrents) ? torrents : [];
    this._delugeStatus = status || {};
    this._delugeConfigured = true;
  } catch (e) {
    const statusCode = e?.status_code ?? e?.status ?? e?.response?.status;
    const body = typeof e?.body === 'string' ? e.body : JSON.stringify(e?.body ?? e?.message ?? e);
    const isNotConfigured = statusCode === 503 || body.includes('not configured');
    this._delugeConfigured = !isNotConfigured;
    console.error('[arr-card] Deluge fetch error:', e);
  }
}

async _fetchRtorrent() {
  if (this._rtorrentConfigured === false) return;
  try {
    const [torrents, status] = await Promise.all([
      this._callApi('GET', 'arr_stack/rtorrent/queue'),
      this._callApi('GET', 'arr_stack/rtorrent/status').catch(() => ({})),
    ]);
    this._rtorrentQueue  = Array.isArray(torrents) ? torrents : [];
    this._rtorrentStatus = status || {};
    this._rtorrentConfigured = true;
  } catch (e) {
    const statusCode = e?.status_code ?? e?.status ?? e?.response?.status;
    const body = typeof e?.body === 'string' ? e.body : JSON.stringify(e?.body ?? e?.message ?? e);
    const isNotConfigured = statusCode === 503 || body.includes('not configured');
    this._rtorrentConfigured = !isNotConfigured;
    console.error('[arr-card] rTorrent fetch error:', e);
  }
}

}

export const downloadsMixin = _DownloadsMethods.prototype;
