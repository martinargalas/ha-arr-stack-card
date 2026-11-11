class _DownloadsMethods {

// A second SABnzbd (sabnzbd2) is fetched beside the first, and the two queues
// are folded into this._sab with each slot marked by its instance (_inst '1' or
// '2'). Each keeps its own back-off, so one that is down leaves the other be.
async _fetchSab() {
  await Promise.all([
    this._fetchSabInst(false),
    this._sab2Configured ? this._fetchSabInst(true) : null,
  ]);
  this._sabMerge();
}

async _fetchSabInst(second) {
  const inst = second ? '2' : '1';
  const name = second ? 'SABnzbd 2' : 'SABnzbd';
  const flag = second ? '_sab2Configured' : '_sabConfigured';
  if (this[flag] === false) return;
  if (this._dlHeld(name)) return;
  try {
    const data = await this._callApi('GET', `arr_stack/${second ? 'sabnzbd2' : 'sabnzbd'}/queue`);
    // SABnzbd returns HTTP 200 with {status:false} on a wrong API key. That is
    // a fault, not a client that is not set up: it backs off like an outage and
    // comes back once the key is fixed, without a page reload.
    if (data?.status === false) {
      this._dlFetchFailed(name, flag, { status_code: 200, body: { error: data?.error } });
      return;
    }
    const queue = data.queue || {};
    // Track which items' mbleft decreased → actively downloading
    // (SABnzbd reports status:'Downloading' for ALL queue slots, not just the active one)
    this._sabMbleftPrevI = this._sabMbleftPrevI || {};
    const prev = this._sabMbleftPrevI[inst] || {};
    const curr = {};
    const active = new Set();
    const slots = queue.slots || [];
    const globalSpeed = parseFloat(queue.kbpersec) || 0;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      s._inst = inst;
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
    this._sabMbleftPrevI[inst] = curr;
    this._sabInst = this._sabInst || {};
    this._sabInst[inst] = { queue, active: queue.status === 'Paused' ? new Set() : active };
    this[flag] = true;
    this._dlFetchOk(name);
    if (!second) this._fetchVpnIp();
  } catch (e) {
    this._dlFetchFailed(name, flag, e);
  }
}

// One queue out of both: the slots of each in turn, the speeds added up, and
// paused only when every one is. Disk space is the first one's — it is the one
// the disk row matches against the libraries' folders.
_sabMerge() {
  const parts = ['1', '2']
    .filter(i => i === '1' || this._sab2Configured)
    .map(i => this._sabInst?.[i]).filter(Boolean);
  if (!parts.length) return;
  const first = parts[0].queue;
  const slots = parts.flatMap(p => p.queue.slots || []);
  this._sab = {
    ...first,
    slots,
    noofslots: slots.length,
    kbpersec: String(parts.reduce((n, p) => n + (parseFloat(p.queue.kbpersec) || 0), 0)),
    status: parts.every(p => p.queue.status === 'Paused') ? 'Paused' : (first.status === 'Paused' ? 'Downloading' : first.status),
  };
  this._sabActiveIds = new Set(parts.flatMap(p => [...p.active]));
}

async _fetchVpnIp() {
  if (this._sabConfigured === false) return;
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

// The history has no back-off of its own and runs on every five-second poll,
// so without this a SABnzbd that was never set up was asked twelve times a
// minute. The same goes for NZBGet below.
async _fetchSabHistory() {
  const insts = [
    this._sabConfigured !== false && '1',
    this._sab2Configured && '2',
  ].filter(Boolean);
  if (!insts.length) return;
  const DONE = new Set(['Completed', 'Extracting', 'Moving', 'Running Script', 'Verifying']);
  this._sabHistI = this._sabHistI || {};
  await Promise.all(insts.map(async inst => {
    try {
      const data = await this._callApi('GET', `arr_stack/${inst === '2' ? 'sabnzbd2' : 'sabnzbd'}/history`);
      const slots = data?.history?.slots || [];
      for (const s of slots) s._inst = inst;
      this._sabHistI[inst] = {
        failed: slots.filter(s => s.status === 'Failed'),
        completed: slots.filter(s => DONE.has(s.status)).slice(0, 10),
      };
    } catch (e) {
      console.error(`[arr-card] SABnzbd${inst === '2' ? ' 2' : ''} history fetch error:`, e);
    }
  }));
  const parts = insts.map(i => this._sabHistI[i]).filter(Boolean);
  this._sabFailed    = parts.flatMap(p => p.failed);
  // Newest first across both, still ten at most
  this._sabCompleted = parts.flatMap(p => p.completed)
    .sort((a, b) => (b.completed || 0) - (a.completed || 0)).slice(0, 10);
}

// Which SABnzbd a queue or history item came from, by its nzo_id
_sabSvcOf(nzoId) {
  const all = [...(this._sab?.slots || []), ...(this._sabFailed || []), ...(this._sabCompleted || [])];
  return all.find(s => s.nzo_id === nzoId)?._inst === '2' ? 'sabnzbd2' : 'sabnzbd';
}

async _sabQueueDelete(nzoId) {
  this._sabQueueBusy = nzoId;
  this._reRenderLeft();
  try {
    await this._callApi('POST', `arr_stack/${this._sabSvcOf(nzoId)}/action`, { mode: 'queue', name: 'delete', nzo_id: nzoId });
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
    await this._callApi('POST', `arr_stack/${this._sabSvcOf(nzoId)}/action`, { mode: 'history', name: 'delete', nzo_id: nzoId });
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
    await this._callApi('POST', `arr_stack/${this._sabSvcOf(nzoId)}/action`, { mode: 'retry', nzo_id: nzoId });
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
  if (this._nzbgetConfigured === false) return;
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
  if (this._nzbgetConfigured === false) return;
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
// Three different things arrive here. A body saying "not configured" means the
// client is not set up, and the card stops asking. 502 says it is set up but
// not answering — a stopped container, a web server in front of it — so the
// client stays and the next poll tries again. Anything else is a real fault and
// reads the same way. A bare 503 is one of those: the integration also answers
// 503 when it cannot connect, and taking that for "not set up" hid a client for
// good after a container restart.
//
// Either way the console gets one line per change of state, not one per poll:
// a client that is down for an hour used to write hundreds of them.
_dlFetchFailed(name, flag, e) {
  const status = e?.status_code ?? e?.status ?? e?.response?.status;
  const body   = typeof e?.body === 'string' ? e.body : JSON.stringify(e?.body ?? e?.message ?? e);
  const notConfigured = body.includes('not configured');
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

// Both qBittorrents, the second (qbit2) only when it is set up. Their torrents
// are folded into this._qbit, each marked with its instance (_inst '1' or '2');
// the speeds are added up. Each has its own back-off.
async _fetchQbit() {
  await Promise.all([
    this._fetchQbitInst(false),
    this._qbit2Configured ? this._fetchQbitInst(true) : null,
  ]);
  this._qbitMerge();
}

async _fetchQbitInst(second) {
  const inst = second ? '2' : '1';
  const svc  = second ? 'qbit2' : 'qbit';
  const name = second ? 'qBittorrent 2' : 'qBittorrent';
  const flag = second ? '_qbit2Configured' : '_qbitConfigured';
  if (this[flag] === false) return;
  if (this._dlHeld(name)) return;
  try {
    const [torrents, transfer, maindata] = await Promise.all([
      this._callApi('GET', `arr_stack/${svc}/torrents`),
      this._callApi('GET', `arr_stack/${svc}/transfer`),
      this._callApi('GET', `arr_stack/${svc}/maindata`).catch(() => null),
    ]);
    const list = Array.isArray(torrents) ? torrents : [];
    for (const t of list) t._inst = inst;
    this._qbitInst = this._qbitInst || {};
    this._qbitInst[inst] = {
      torrents: list,
      transfer: transfer || {},
      free: maindata?.server_state?.free_space_on_disk ?? null,
    };
    this[flag] = true;
    this._dlFetchOk(name);
  } catch (e) {
    this._dlFetchFailed(name, flag, e);
  }
}

_qbitMerge() {
  const parts = ['1', '2']
    .filter(i => i === '1' || this._qbit2Configured)
    .map(i => this._qbitInst?.[i]).filter(Boolean);
  if (!parts.length) return;
  const sum = k => parts.reduce((n, p) => n + (p.transfer?.[k] || 0), 0);
  this._qbit = parts.flatMap(p => p.torrents);
  this._qbitTransfer = { ...parts[0].transfer, dl_info_speed: sum('dl_info_speed'), up_info_speed: sum('up_info_speed') };
  this._qbitDiskFreeBytes = parts.find(p => typeof p.free === 'number')?.free ?? null;
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
