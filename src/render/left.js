import { fmtBytes } from '../shared/format.js';
const _CC = {
  'germany':'de','netherlands':'nl','united kingdom':'gb','france':'fr','united states':'us',
  'canada':'ca','australia':'au','japan':'jp','singapore':'sg','sweden':'se','norway':'no',
  'denmark':'dk','finland':'fi','switzerland':'ch','austria':'at','belgium':'be','spain':'es',
  'italy':'it','portugal':'pt','poland':'pl','czech republic':'cz','hungary':'hu','romania':'ro',
  'bulgaria':'bg','ukraine':'ua','russia':'ru','turkey':'tr','india':'in','south korea':'kr',
  'hong kong':'hk','taiwan':'tw','brazil':'br','mexico':'mx','argentina':'ar','chile':'cl',
  'colombia':'co','south africa':'za','israel':'il','uae':'ae','united arab emirates':'ae',
  'new zealand':'nz','ireland':'ie','luxembourg':'lu','latvia':'lv','lithuania':'lt',
  'estonia':'ee','slovakia':'sk','slovenia':'si','croatia':'hr','serbia':'rs','greece':'gr',
  'cyprus':'cy','malta':'mt','iceland':'is','moldova':'md','georgia':'ge','armenia':'am',
  'azerbaijan':'az','kazakhstan':'kz','thailand':'th','vietnam':'vn','indonesia':'id',
  'malaysia':'my','philippines':'ph','pakistan':'pk','nigeria':'ng','kenya':'ke','ghana':'gh',
  'morocco':'ma','albania':'al','north macedonia':'mk','montenegro':'me','saudi arabia':'sa',
  'qatar':'qa','kuwait':'kw','bahrain':'bh','oman':'om','china':'cn','egypt':'eg',
  'myanmar':'mm','cambodia':'kh','mongolia':'mn','jordan':'jo','iran':'ir','iraq':'iq',
};
function _countryFlag(name) {
  const cc = _CC[name?.toLowerCase()];
  if (!cc) return '';
  return [...cc.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
}

class _RenderLeft {

// Marks a download-client row as clickable when the arr queue knows which media
// the download belongs to. Absent attribute = plain row, no cursor, no handler.
_dlOpenAttr(downloadId) {
  // Every row is clickable. A matched one opens the media popup, an unmatched
  // one explains why there is nothing to open — silence reads as a broken card.
  return ` data-dl-open="${this._escHtml(String(downloadId ?? ''))}" style="cursor:pointer"`;
}
_renderLeft() {
  if (!this._capsLoaded) return '';
  if (!this._qbitConfigured && !this._sabConfigured && !this._nzbgetConfigured && !this._delugeConfigured && !this._rtorrentConfigured) return '';

  const defaultOrder = [
    { id: 'qbit',     enabled: true },
    { id: 'sab',      enabled: true },
    { id: 'nzbget',   enabled: true },
    { id: 'deluge',   enabled: true },
    { id: 'rtorrent', enabled: true },
  ];
  const saved   = this._config?.downloadClients;
  const cfgList = Array.isArray(saved) ? saved : defaultOrder;
  const savedIds = new Set(cfgList.map(c => c.id));
  const allClients = [
    ...cfgList,
    ...defaultOrder.filter(c => !savedIds.has(c.id)),
  ];

  const renderers  = { qbit: '_renderQbit', sab: '_renderSab', nzbget: '_renderNzbget', deluge: '_renderDeluge', rtorrent: '_renderRtorrent' };
  const configured = { qbit: this._qbitConfigured, sab: this._sabConfigured, nzbget: this._nzbgetConfigured, deluge: this._delugeConfigured, rtorrent: this._rtorrentConfigured };

  const parts = allClients
    .filter(c => c.enabled !== false && configured[c.id])
    .map(c => this[renderers[c.id]]())
    .filter(Boolean);

  if (!parts.length) return '';

  const vpnBar = this._renderVpnBar();
  return `
    ${vpnBar}${vpnBar ? '<div class="spacer"></div>' : ''}
    ${this._renderDiskRow()}
    <div class="spacer"></div>
    ${parts.join('<div class="spacer"></div>')}
  `;
}

_renderLeftHeader() {
  return `
    <div class="col-hdr">
      <ha-icon icon="mdi:download-outline" style="--mdc-icon-size:22px"></ha-icon>
      <span class="col-hdr-title">${this._t('downloads')}</span>
      <div class="col-hdr-line"></div>
    </div>`;
}

_renderDiskRow() {
  const fmtGB = bytes => fmtBytes(bytes, { empty: '0 GB' });

  // ── Speed ──────────────────────────────────────────────────────
  const qbitSpeedBytes   = this._qbitConfigured   ? ((this._qbitTransfer.dl_info_speed) || 0)  : 0;
  const qbitUpBytes      = this._qbitConfigured   ? ((this._qbitTransfer.up_info_speed) || 0)  : 0;
  const sabKbps          = this._sabConfigured    ? (parseFloat(this._sab.kbpersec) || 0)      : 0;
  const sabSpeedBytes    = sabKbps * 1024;
  const nzbgetSpeedBytes = this._nzbgetConfigured ? (this._nzbget?.DownloadRate || 0)           : 0;
  const delugeSpeedBytes   = this._delugeConfigured   ? (this._delugeStatus?.download_rate   || 0) : 0;
  const delugeUpBytes      = this._delugeConfigured   ? (this._delugeStatus?.upload_rate     || 0) : 0;
  const rtorrentSpeedBytes = this._rtorrentConfigured ? (this._rtorrentStatus?.download_rate || 0) : 0;
  const rtorrentUpBytes    = this._rtorrentConfigured ? (this._rtorrentStatus?.upload_rate   || 0) : 0;
  const combinedSpeed    = qbitSpeedBytes + sabSpeedBytes + nzbgetSpeedBytes + delugeSpeedBytes + rtorrentSpeedBytes;
  const combinedUpBytes  = qbitUpBytes + delugeUpBytes + rtorrentUpBytes;
  const combinedStr      = this.fmtSpeed(combinedSpeed);
  const combinedUpStr    = this.fmtSpeed(combinedUpBytes);
  const hasUpload        = this._qbitConfigured || this._delugeConfigured || this._rtorrentConfigured;

  const torrentSpeed = qbitSpeedBytes + delugeSpeedBytes + rtorrentSpeedBytes;
  const usenetSpeed  = sabSpeedBytes + nzbgetSpeedBytes;
  const hasTorrent   = this._qbitConfigured || this._delugeConfigured || this._rtorrentConfigured;
  const hasUsenet    = this._sabConfigured  || this._nzbgetConfigured;
  let speedSub = '';
  if (hasTorrent && hasUsenet) {
    speedSub = `Torrent ${this.fmtSpeed(torrentSpeed)} · Usenet ${this.fmtSpeed(usenetSpeed)}`;
  } else if (hasTorrent) {
    const torrentClients = [
      this._qbitConfigured   && 'qBittorrent',
      this._delugeConfigured && 'Deluge',
      this._rtorrentConfigured && 'rTorrent',
    ].filter(Boolean);
    const onlyOne = torrentClients.length === 1 ? torrentClients[0] : 'Torrent';
    speedSub = onlyOne;
  } else if (hasUsenet) {
    const onlyOne = this._sabConfigured && !this._nzbgetConfigured ? 'SABnzbd'
                  : !this._sabConfigured && this._nzbgetConfigured ? 'NZBGet'
                  : 'Usenet';
    speedSub = onlyOne;
  }

  // ── Disk ───────────────────────────────────────────────────────
  // Prefer SAB data; fallback NZBGet → qBit → Deluge free_space
  const sabFreeGB     = this._sabConfigured    ? (parseFloat(this._sab.diskspace2) || 0)         : 0;
  const sabTotalGB    = this._sabConfigured    ? (parseFloat(this._sab.diskspacetotal2) || 0)     : 0;
  const hasSabDisk    = sabTotalGB > 0;
  const nzbgetFreeGB  = this._nzbgetConfigured ? ((this._nzbget?.FreeDiskSpaceMB  || 0) / 1024)  : 0;
  const nzbgetTotalGB = this._nzbgetConfigured ? ((this._nzbget?.TotalDiskSpaceMB || 0) / 1024)  : 0;
  const hasNzbgetDisk = nzbgetTotalGB > 0;

  const qbitFreeBytes   = this._qbitDiskFreeBytes;
  const hasQbitDisk     = typeof qbitFreeBytes === 'number' && qbitFreeBytes > 0;
  const delugeFreeBytes = this._delugeConfigured ? (this._delugeStatus?.free_space || 0) : 0;
  const hasDelugeDisk   = delugeFreeBytes > 0;

  // ── Root folder disks (Radarr + Sonarr, deduplicated by ~100 MB) ──
  const DISK_ROUND    = 100 * 1024 * 1024;
  const storageSource = this._cfgGet('styles', 'storageSource', 'auto');
  // diskspace has freeSpace + totalSpace; rootfolders used as fallback (no totalSpace)
  const sourceDiskspace = {
    radarr:  this._radarrDiskspace  || [],
    radarr2: this._radarr2Diskspace || [],
    sonarr:  this._sonarrDiskspace  || [],
    sonarr2: this._sonarr2Diskspace || [],
  };
  const sourceRoots = {
    radarr:  this._radarrRootFolders  || [],
    radarr2: this._radarr2RootFolders || [],
    sonarr:  this._sonarrRootFolders  || [],
    sonarr2: this._sonarr2RootFolders || [],
  };
  const allRoots = storageSource !== 'auto' && sourceDiskspace[storageSource]?.length
    ? sourceDiskspace[storageSource]
    : [...(this._radarrRootFolders || []), ...(this._sonarrRootFolders || [])];
  const diskMap    = new Map();
  for (const r of allRoots) {
    const key = Math.round(r.freeSpace / DISK_ROUND);
    if (!diskMap.has(key)) diskMap.set(key, { freeSpace: r.freeSpace, totalSpace: r.totalSpace || 0, paths: new Set() });
    diskMap.get(key).paths.add(r.label ?? r.path);
  }
  const uniqueDisks = [...diskMap.values()].map(d => ({ freeSpace: d.freeSpace, totalSpace: d.totalSpace, paths: [...d.paths] }));
  const diskTotal   = uniqueDisks.length;
  // null = auto: prefer the disk that matches SAB using 1 GB bucket (SAB precision ~50 MB)
  const SAB_ROUND_EARLY = 1024 * 1024 * 1024;
  let diskPage;
  if (this._diskPage.left === null) {
    const sabKey = hasSabDisk ? Math.round((sabFreeGB * 1073741824) / SAB_ROUND_EARLY) : -1;
    const sabIdx = uniqueDisks.findIndex(d => Math.round(d.freeSpace / SAB_ROUND_EARLY) === sabKey);
    diskPage = sabIdx >= 0 ? sabIdx : 0;
  } else {
    diskPage = Math.min(this._diskPage.left, Math.max(0, diskTotal - 1));
  }
  const activeDisk  = uniqueDisks[diskPage];

  // Grouped name: basenames joined with ·  (e.g. /movies + /tv → "movies · tv")
  const diskLabel = activeDisk
    ? activeDisk.paths.map(p => p.replace(/\/$/, '').split('/').filter(Boolean).pop() || p).join(' · ')
    : '';

  // Multi-disk: page through root folder disks (freeSpace from API, chevrons at edges)
  const multiDisk = diskTotal > 1;
  const _chev = (dir, disabled) => `
    <button class="dc-chev" data-diskkey="left" data-diskdir="${dir}" ${disabled ? 'disabled' : ''}>
      <ha-icon icon="mdi:chevron-${dir === 'prev' ? 'left' : 'right'}" style="--mdc-icon-size:16px"></ha-icon>
    </button>`;

  // SAB gives free space in GB with 1 decimal → precision ~50 MB → use 1 GB bucket for matching
  const SAB_ROUND     = 1024 * 1024 * 1024;
  const sabFreeBytes  = sabFreeGB  * 1073741824;
  const sabTotalBytes = sabTotalGB * 1073741824;
  const sabDiskKey    = hasSabDisk  ? Math.round(sabFreeBytes  / SAB_ROUND)  : -1;
  const activeSabKey  = activeDisk  ? Math.round(activeDisk.freeSpace / SAB_ROUND) : -2;
  const activeIsSab   = hasSabDisk  && sabDiskKey === activeSabKey;

  // qBit gives exact bytes → 100 MB bucket OK
  const activeDiskKey = activeDisk  ? Math.round(activeDisk.freeSpace / DISK_ROUND) : -2;
  const qbitDiskKey   = hasQbitDisk ? Math.round(qbitFreeBytes / DISK_ROUND) : -3;
  const activeIsQbit  = hasQbitDisk && !activeIsSab && qbitDiskKey === activeDiskKey;

  let diskChip = '';
  if (multiDisk && activeDisk) {
    let pageContent = '';
    if (activeIsSab) {
      // This disk = SAB download disk → full SAB style
      const usedGB = sabTotalGB - sabFreeGB;
      const pct    = (usedGB / sabTotalGB) * 100;
      pageContent = `
        <div class="dc-label">${this._t('storage')}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(usedGB * 1073741824)}</span><span style="font-size:10px;color:rgba(var(--arr-st-rgb,255,255,255),0.6);font-weight:600"> / ${fmtGB(sabTotalBytes)}</span></div>
        <div class="mbar"><div class="mbar-fill pf-orange" style="width:${pct.toFixed(0)}%"></div></div>
        <div class="dc-sub">${pct.toFixed(0)} % · ${fmtGB(sabFreeBytes)} ${this._t('free')}</div>`;
    } else if (activeIsQbit) {
      pageContent = `
        <div class="dc-label">${this._t('storage')}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(qbitFreeBytes)} ${this._t('free')}</span></div>
        ${diskLabel ? `<div class="dc-sub">${this._escHtml(diskLabel)}</div>` : ''}`;
    } else if (activeDisk.totalSpace > 0) {
      const usedBytes = activeDisk.totalSpace - activeDisk.freeSpace;
      const pct       = (usedBytes / activeDisk.totalSpace) * 100;
      pageContent = `
        <div class="dc-label">${this._t('storage')}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(usedBytes)}</span><span style="font-size:10px;color:rgba(var(--arr-st-rgb,255,255,255),0.6);font-weight:600"> / ${fmtGB(activeDisk.totalSpace)}</span></div>
        <div class="mbar"><div class="mbar-fill pf-orange" style="width:${pct.toFixed(0)}%"></div></div>
        <div class="dc-sub">${pct.toFixed(0)} % · ${fmtGB(activeDisk.freeSpace)} ${this._t('free')}${diskLabel ? ` · ${this._escHtml(diskLabel)}` : ''}</div>`;
    } else {
      pageContent = `
        <div class="dc-label">${this._t('storage')}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(activeDisk.freeSpace)} ${this._t('free')}</span></div>
        ${diskLabel ? `<div class="dc-sub">${this._escHtml(diskLabel)}</div>` : ''}`;
    }
    diskChip = `
      <div class="disk-chip dc-pageable">
        ${_chev('prev', diskPage === 0)}
        <div class="dc-page-content">${pageContent}</div>
        ${_chev('next', diskPage >= diskTotal - 1)}
      </div>`;
  } else if (storageSource !== 'auto' && activeDisk) {
    // Explicit source selected: show rootfolder disk data
    const lbl = activeDisk.paths.map(p => p.replace(/\/$/, '').split('/').filter(Boolean).pop() || p).join(' · ');
    if (activeDisk.totalSpace > 0) {
      const usedBytes = activeDisk.totalSpace - activeDisk.freeSpace;
      const pct       = (usedBytes / activeDisk.totalSpace) * 100;
      diskChip = `
        <div class="disk-chip">
          <div class="dc-label">${this._t('storage')}</div>
          <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(usedBytes)}</span><span style="font-size:10px;color:rgba(var(--arr-st-rgb,255,255,255),0.6);font-weight:600"> / ${fmtGB(activeDisk.totalSpace)}</span></div>
          <div class="mbar"><div class="mbar-fill pf-orange" style="width:${pct.toFixed(0)}%"></div></div>
          <div class="dc-sub">${pct.toFixed(0)} % · ${fmtGB(activeDisk.freeSpace)} ${this._t('free')}${lbl ? ` · ${this._escHtml(lbl)}` : ''}</div>
        </div>`;
    } else {
      diskChip = `
        <div class="disk-chip">
          <div class="dc-label">${this._t('storage')}</div>
          <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(activeDisk.freeSpace)} ${this._t('free')}</span></div>
          ${lbl ? `<div class="dc-sub">${this._escHtml(lbl)}</div>` : ''}
        </div>`;
    }
  } else if (hasSabDisk) {
    const usedGB = sabTotalGB - sabFreeGB;
    const pct    = (usedGB / sabTotalGB) * 100;
    diskChip = `
      <div class="disk-chip">
        <div class="dc-label">${this._t('storage')}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(usedGB * 1073741824)}</span><span style="font-size:10px;color:rgba(var(--arr-st-rgb,255,255,255),0.6);font-weight:600"> / ${fmtGB(sabTotalGB * 1073741824)}</span></div>
        <div class="mbar"><div class="mbar-fill pf-orange" style="width:${pct.toFixed(0)}%"></div></div>
        <div class="dc-sub">${pct.toFixed(0)} % · ${fmtGB(sabFreeGB * 1073741824)} ${this._t('free')}</div>
      </div>`;
  } else if (hasNzbgetDisk) {
    const usedGB = nzbgetTotalGB - nzbgetFreeGB;
    const pct    = (usedGB / nzbgetTotalGB) * 100;
    diskChip = `
      <div class="disk-chip">
        <div class="dc-label">${this._t('storage')}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(usedGB * 1073741824)}</span><span style="font-size:10px;color:rgba(var(--arr-st-rgb,255,255,255),0.6);font-weight:600"> / ${fmtGB(nzbgetTotalGB * 1073741824)}</span></div>
        <div class="mbar"><div class="mbar-fill pf-orange" style="width:${pct.toFixed(0)}%"></div></div>
        <div class="dc-sub">${pct.toFixed(0)} % · ${fmtGB(nzbgetFreeGB * 1073741824)} ${this._t('free')}</div>
      </div>`;
  } else if (hasQbitDisk) {
    diskChip = `
      <div class="disk-chip">
        <div class="dc-label">${this._t('storage')}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(qbitFreeBytes)} ${this._t('free')}</span></div>
      </div>`;
  } else if (hasDelugeDisk) {
    diskChip = `
      <div class="disk-chip">
        <div class="dc-label">${this._t('storage')}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${fmtGB(delugeFreeBytes)} ${this._t('free')}</span></div>
      </div>`;
  }

  const showStorage    = this._cfgGet('downloads', 'showStorage', true) !== false;
  const showTotalSpeed = this._cfgGet('downloads', 'showTotalSpeed', true) !== false;

  const speedStyle = (showStorage && diskChip) ? '' : 'flex:1';
  const speedChip = showTotalSpeed ? `
    <div class="disk-chip" style="${speedStyle}">
      <div class="dc-label">${this._t('totalSpeed')}</div>
      <div class="dc-val" style="display:flex;gap:6px;align-items:center">
        <span class="g" style="font-size:13px;font-weight:800;padding:2px 6px"><ha-icon icon="mdi:download" style="--mdc-icon-size:13px"></ha-icon> ${combinedStr}</span>
        ${hasUpload ? `<span class="pill-teal" style="font-size:13px;font-weight:800;padding:2px 6px"><ha-icon icon="mdi:upload" style="--mdc-icon-size:13px"></ha-icon> ${combinedUpStr}</span>` : ''}
      </div>
      <div class="dc-sub speed-chip-sub">${speedSub}</div>
    </div>` : '';

  const _diskChip = showStorage ? diskChip : '';
  if (!speedChip && !_diskChip) return '';
  return `<div class="disk-row">${speedChip}${_diskChip}</div>`;
}

_renderQbit() {
  if (!this._qbitConfigured) return '';
  const speedBytes = (this._qbitTransfer.dl_info_speed) || 0;
  const speedStr = this.fmtSpeed(speedBytes);
  const torrents = Array.isArray(this._qbit) ? [...this._qbit] : [];

  // Sort
  const [sortField, sortDir] = this._sort.split('_'); // e.g. 'progress','desc'
  torrents.sort((a, b) => {
    const av = sortField === 'speed' ? (a.dlspeed || 0) : (a.progress || 0);
    const bv = sortField === 'speed' ? (b.dlspeed || 0) : (b.progress || 0);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const progressActive = sortField === 'progress';
  const speedActive    = sortField === 'speed';
  const dir = sortDir === 'asc' ? '↑' : '↓';

  // Global paused = all non-completed torrents are paused
  // qBit v4: pausedDL/pausedUP  |  qBit v5: stoppedDL/stoppedUP
  const _isQbitPaused = st => st.startsWith('paused') || st.startsWith('stopped');
  const activeTorrents = torrents.filter(t => !_isQbitPaused(t.state || '') && t.progress < 1);
  const allPaused = torrents.length > 0 && activeTorrents.length === 0;

  const items = this._pagedList(torrents, 'qbit', t => this._renderTorrentItem(t), this._perPage('qbit'), 'dc-section-card');

  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}">
      ${torrents.length === 0 ? this._sectionOverlayHtml('qbit', 15, 85, 0.15, 55, 20) : (torrents.length >= this._perPage('qbit')) ? this._sectionOverlayHtml('qbit', 15, 85, 0.23) : this._sectionOverlayHtml('qbit', 15, 85, 0.23, 55, 20)}
      <div class="col-hdr" style="margin-bottom:8px">
        ${this._appIcon('qbit')}
        <span class="col-hdr-title">qBittorrent</span>
        <div class="col-hdr-line"></div>
        <div class="sort-btns">
          <button class="sb${progressActive ? ' on' : ''}" data-sort="${progressActive ? (sortDir === 'desc' ? 'progress_asc' : 'progress_desc') : 'progress_desc'}" title="${this._t('sortByProgress')}">
            <ha-icon icon="mdi:percent" class="icon-15"></ha-icon><span class="sb-dir" style="${progressActive ? '' : 'visibility:hidden'}">${dir}</span>
          </button>
          <button class="sb${speedActive ? ' on' : ''}" data-sort="${speedActive ? (sortDir === 'desc' ? 'speed_asc' : 'speed_desc') : 'speed_desc'}" title="${this._t('sortBySpeed')}">
            <ha-icon icon="mdi:speedometer" class="icon-15"></ha-icon><span class="sb-dir" style="${speedActive ? '' : 'visibility:hidden'}">${dir}</span>
          </button>
        </div>
        ${this._cfgGet('downloads','allowControls',true) !== false
          ? this._qbitBusy
            ? `<button class="action-btn" disabled><span class="action-spinner"></span></button>`
            : `<button class="action-btn qbit-global-toggle${allPaused ? ' paused' : ''}" title="${allPaused ? this._t('resumeAll') : this._t('pauseAll')}">
                 <ha-icon icon="${allPaused ? 'mdi:play' : 'mdi:pause'}" style="--mdc-icon-size:16px"></ha-icon>
               </button>`
          : ''
        }
      </div>
      ${items}
    </div>`;
}

// Which parts of a download row the user wants to see. The state pill is not in
// here on purpose — it doubles as the Stalled / Paused / Complete / error label,
// so hiding it would leave a stuck download looking identical to a healthy one.
_dlRow(key) {
  return this._cfgGet('downloads', key, true) !== false;
}

_renderTorrentItem(t) {
  const pct = Math.round((t.progress || 0) * 100);
  const dlSpeed = this.fmtSpeed(t.dlspeed || 0);
  const upSpeed = this.fmtSpeed(t.upspeed || 0);
  const eta = this.fmtEta(t.eta);
  const ratio = (t.ratio != null && isFinite(t.ratio)) ? t.ratio.toFixed(2) : '—';
  const completed = fmtBytes(t.completed, { empty: '0 MB' });
  const total = fmtBytes(t.size, { empty: '0 MB' });
  const seeds = t.num_seeds || 0;
  const leechs = t.num_leechs || 0;
  const name = this._escHtml(t.name || 'Unknown');

  // Determine state
  const state = t.state || '';
  const errorStates = { error: this._t('errorState'), missingFiles: this._t('missingFiles') };
  const isCompleted   = pct === 100;
  const isError       = !isCompleted && (state in errorStates);
  const isStalledDL   = !isCompleted && state === 'stalledDL';
  // Seeding sub-states (all have pct=100)
  const isActiveUpload = isCompleted && (state === 'uploading' || state === 'forcedUP');
  const isStalledSeed  = isCompleted && state === 'stalledUP';
  const isSeeding      = isActiveUpload || isStalledSeed;   // broadly "still seeding"

  // First column of dl-r2: speed pill
  let speedCol = '';
  if (isActiveUpload) {
    speedCol = this._pill('pill-teal', 'mdi:upload', upSpeed);
  } else if (isStalledSeed) {
    speedCol = this._pill('pill-teal', 'mdi:upload', upSpeed);
  } else if (isCompleted) {
    speedCol = this._pill('pill-green', 'mdi:check-circle', this._t('complete'));
  } else if (isError) {
    speedCol = this._pill('pill-red', 'mdi:alert-circle', errorStates[state]);
  } else if (isStalledDL) {
    speedCol = this._pill('pill-orange', 'mdi:alert', this._t('stalled'));
  } else {
    speedCol = this._pill('pill-green', 'mdi:download', dlSpeed);
  }

  const pbarClass = isError ? 'pf-red' : isStalledDL ? 'pf-orange' : isSeeding ? 'pf-teal' : isCompleted ? 'pf-green' : 'pf-blue';

  // Action buttons
  const hash = t.hash || '';
  // qBit v4: pausedDL/pausedUP  |  qBit v5: stoppedDL/stoppedUP
  const isPaused = state === 'pausedDL' || state === 'pausedUP' ||
                   state === 'stoppedDL' || state === 'stoppedUP';
  const _allowCtrl = this._cfgGet('downloads', 'allowControls', true) !== false;
  let actionBtns = '';
  if (_allowCtrl) {
    if (this._qbitItemBusy === hash) {
      actionBtns = `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;margin:0 4px"></span>`;
    } else if (this._confirmRemove === hash) {
      actionBtns = `
        <button class="tb tb-cancel" data-tb-action="cancel-remove" data-hash="${hash}" title="${this._t('cancelRemove')}"><ha-icon icon="mdi:close" class="icon-15"></ha-icon></button>
        <button class="tb tb-keep"   data-tb-action="remove-keep"   data-hash="${hash}" title="${this._t('keepFiles')}"><ha-icon icon="mdi:magnet" class="icon-15"></ha-icon></button>
        <button class="tb tb-del"    data-tb-action="remove-del"    data-hash="${hash}" title="${this._t('deleteFiles')}"><ha-icon icon="mdi:delete" class="icon-15"></ha-icon></button>`;
    } else {
      if (!isCompleted && isPaused)
        actionBtns += `<button class="tb tb-resume" data-tb-action="resume" data-hash="${hash}" title="${this._t('resume')}"><ha-icon icon="mdi:play" class="icon-15"></ha-icon></button>`;
      if (!isCompleted && !isPaused && !isError)
        actionBtns += `<button class="tb tb-pause" data-tb-action="pause" data-hash="${hash}" title="${this._t('pause')}"><ha-icon icon="mdi:pause" class="icon-15"></ha-icon></button>`;
      if (isSeeding)
        actionBtns += `<button class="tb tb-pause" data-tb-action="pause" data-hash="${hash}" title="${this._t('stopSeed')}"><ha-icon icon="mdi:stop" class="icon-15"></ha-icon></button>`;
      actionBtns += `<button class="tb tb-remove" data-tb-action="remove-confirm" data-hash="${hash}" title="${this._t('remove')}"><ha-icon icon="mdi:delete-outline" class="icon-15"></ha-icon></button>`;
    }
  }

  return `
    <div class="dl"${this._dlOpenAttr(hash)}>
      <div class="dl-r1">
        <span class="dl-name" title="${name}">${name}</span>
        ${this._dlRow('rowPercent') ? `<span class="dl-pct${isError ? ' dl-pct-err' : ''}">${pct}%</span>` : ''}
        <div class="tb-group">${actionBtns}</div>
      </div>
      <div class="dl-r2">
        ${speedCol}
        ${this._dlRow('rowUpload') && !isCompleted && !isError && !isStalledDL
          ? this._pill('pill-teal', 'mdi:upload', upSpeed)
          : ''}
        ${!this._dlRow('rowEta') ? '' : isSeeding
          ? `<span class="dm"><ha-icon icon="mdi:swap-vertical" class="icon-11-st"></ha-icon><b class="dm-val">R: ${ratio}</b></span>`
          : `<span class="dm dm-eta"><ha-icon icon="mdi:clock-outline" class="icon-11-st"></ha-icon><b class="dm-val">${eta}</b></span>`
        }
        ${this._dlRow('rowSize') ? `<span class="dm"><ha-icon icon="mdi:harddisk" class="icon-11-st"></ha-icon><b class="dm-val">${completed} / ${total}</b></span>` : ''}
        ${this._dlRow('rowPeers') ? `<span class="dm-peer"><span class="dm"><ha-icon icon="mdi:upload" class="icon-11-st"></ha-icon><b class="dm-val">${seeds}</b></span><span class="dm"><ha-icon icon="mdi:download" class="icon-11-st"></ha-icon><b class="dm-val">${leechs}</b></span></span>` : ''}
      </div>
      ${this._dlRow('rowProgress') ? `<div class="pbar"><div class="pbar-fill ${pbarClass}" style="width:${pct}%"></div></div>` : ''}
    </div>`;
}

_renderDeluge() {
  if (!this._delugeConfigured) return '';
  const status = this._delugeStatus || {};
  const dlSpeed = this.fmtSpeed(status.download_rate || 0);
  const torrents = Array.isArray(this._delugeQueue) ? [...this._delugeQueue] : [];

  const [sortField, sortDir] = this._sortDeluge.split('_');
  torrents.sort((a, b) => {
    const av = sortField === 'speed' ? (a.download_payload_rate || 0) : (a.progress || 0);
    const bv = sortField === 'speed' ? (b.download_payload_rate || 0) : (b.progress || 0);
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const progressActive = sortField === 'progress';
  const speedActive    = sortField === 'speed';
  const dir = sortDir === 'asc' ? '↑' : '↓';

  const activeTorrents = torrents.filter(t => {
    const st = (t.state || '').toLowerCase();
    return st !== 'paused' && t.progress < 100;
  });
  const allPaused = torrents.length > 0 && activeTorrents.length === 0;

  const items = this._pagedList(torrents, 'deluge', t => this._renderDelugeTorrentItem(t), this._perPage('deluge'), 'dc-section-card');

  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}">
      ${torrents.length === 0 ? this._sectionOverlayHtml('deluge', 15, 85, 0.15, 55, 20) : (torrents.length >= this._perPage('deluge')) ? this._sectionOverlayHtml('deluge', 15, 85, 0.23) : this._sectionOverlayHtml('deluge', 15, 85, 0.23, 55, 20)}
      <div class="col-hdr" style="margin-bottom:8px">
        ${this._appIcon('deluge')}
        <span class="col-hdr-title">Deluge</span>
        <div class="col-hdr-line"></div>
        <div class="sort-btns">
          <button class="sb${progressActive ? ' on' : ''}" data-sort="${progressActive ? (sortDir === 'desc' ? 'progress_asc' : 'progress_desc') : 'progress_desc'}" data-client="deluge" title="${this._t('sortByProgress')}">
            <ha-icon icon="mdi:percent" class="icon-15"></ha-icon><span class="sb-dir" style="${progressActive ? '' : 'visibility:hidden'}">${dir}</span>
          </button>
          <button class="sb${speedActive ? ' on' : ''}" data-sort="${speedActive ? (sortDir === 'desc' ? 'speed_asc' : 'speed_desc') : 'speed_desc'}" data-client="deluge" title="${this._t('sortBySpeed')}">
            <ha-icon icon="mdi:speedometer" class="icon-15"></ha-icon><span class="sb-dir" style="${speedActive ? '' : 'visibility:hidden'}">${dir}</span>
          </button>
        </div>
        ${this._cfgGet('downloads','allowControls',true) !== false
          ? this._delugeBusy
            ? `<button class="action-btn" disabled><span class="action-spinner"></span></button>`
            : `<button class="action-btn deluge-global-toggle${allPaused ? ' paused' : ''}" title="${allPaused ? this._t('resumeAll') : this._t('pauseAll')}">
                 <ha-icon icon="${allPaused ? 'mdi:play' : 'mdi:pause'}" style="--mdc-icon-size:16px"></ha-icon>
               </button>`
          : ''
        }
      </div>
      ${items}
    </div>`;
}

_renderDelugeTorrentItem(t) {
  const pct    = Math.round(t.progress || 0);   // Deluge: 0-100
  const dlSpd  = this.fmtSpeed(t.download_payload_rate || 0);
  const upSpd  = this.fmtSpeed(t.upload_payload_rate || 0);
  const etaRaw = t.eta;
  const eta    = (etaRaw && etaRaw > 0 && etaRaw < 86400 * 365) ? this.fmtEta(etaRaw) : '—';
  const total  = fmtBytes(t.total_size, { empty: '0 MB' });
  const done   = fmtBytes(t.total_done, { empty: '0 MB' });
  const seeds  = t.num_seeds || 0;
  const peers  = t.num_peers || 0;
  const name   = this._escHtml(t.name || 'Unknown');
  const hash   = t.hash || '';

  const state     = (t.state || '').toLowerCase();
  const isCompleted   = pct >= 100;
  const isPaused      = state === 'paused';
  const isSeeding     = state === 'seeding';
  const isError       = state === 'error';
  const isChecking    = state === 'checking';

  let speedCol = '';
  if (isSeeding) {
    speedCol = this._pill('pill-teal', 'mdi:upload', upSpd);
  } else if (isCompleted) {
    speedCol = this._pill('pill-green', 'mdi:check-circle', this._t('complete'));
  } else if (isError) {
    speedCol = this._pill('pill-red', 'mdi:alert-circle', this._t('errorState'));
  } else if (isPaused) {
    speedCol = this._pill('pill-orange', 'mdi:pause-circle', this._t('paused'));
  } else {
    speedCol = this._pill('pill-green', 'mdi:download', dlSpd);
  }

  const pbarClass = isError ? 'pf-red' : isPaused ? 'pf-orange' : isSeeding ? 'pf-teal' : isCompleted ? 'pf-green' : 'pf-blue';

  const _allowCtrlDlg = this._cfgGet('downloads', 'allowControls', true) !== false;
  let actionBtns = '';
  if (_allowCtrlDlg) {
    if (this._delugeItemBusy === hash) {
      actionBtns = `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;margin:0 4px"></span>`;
    } else if (this._delugeConfirm === hash) {
      actionBtns = `
        <button class="tb tb-cancel" data-dlg-action="cancel-remove" data-dlg-hash="${hash}" title="${this._t('cancelRemove')}"><ha-icon icon="mdi:close" class="icon-15"></ha-icon></button>
        <button class="tb tb-keep"   data-dlg-action="remove-keep"   data-dlg-hash="${hash}" title="${this._t('keepFiles')}"><ha-icon icon="mdi:magnet" class="icon-15"></ha-icon></button>
        <button class="tb tb-del"    data-dlg-action="remove-del"    data-dlg-hash="${hash}" title="${this._t('deleteFiles')}"><ha-icon icon="mdi:delete" class="icon-15"></ha-icon></button>`;
    } else {
      if (!isCompleted && isPaused)
        actionBtns += `<button class="tb tb-resume" data-dlg-action="resume" data-dlg-hash="${hash}" title="${this._t('resume')}"><ha-icon icon="mdi:play" class="icon-15"></ha-icon></button>`;
      if (!isCompleted && !isPaused && !isError)
        actionBtns += `<button class="tb tb-pause" data-dlg-action="pause" data-dlg-hash="${hash}" title="${this._t('pause')}"><ha-icon icon="mdi:pause" class="icon-15"></ha-icon></button>`;
      if (isSeeding)
        actionBtns += `<button class="tb tb-pause" data-dlg-action="pause" data-dlg-hash="${hash}" title="${this._t('stopSeed')}"><ha-icon icon="mdi:stop" class="icon-15"></ha-icon></button>`;
      actionBtns += `<button class="tb tb-remove" data-dlg-action="remove-confirm" data-dlg-hash="${hash}" title="${this._t('remove')}"><ha-icon icon="mdi:delete-outline" class="icon-15"></ha-icon></button>`;
    }
  }

  return `
    <div class="dl"${this._dlOpenAttr(hash)}>
      <div class="dl-r1">
        <span class="dl-name" title="${name}">${name}</span>
        ${this._dlRow('rowPercent') ? `<span class="dl-pct${isError ? ' dl-pct-err' : ''}">${pct}%</span>` : ''}
        <div class="tb-group">${actionBtns}</div>
      </div>
      <div class="dl-r2">
        ${speedCol}
        ${this._dlRow('rowUpload') && !isCompleted && !isError && !isPaused
          ? this._pill('pill-teal', 'mdi:upload', upSpd)
          : ''}
        ${(isSeeding || !this._dlRow('rowEta'))
          ? ''
          : `<span class="dm dm-eta"><ha-icon icon="mdi:clock-outline" class="icon-11-st"></ha-icon><b class="dm-val">${eta}</b></span>`
        }
        ${this._dlRow('rowSize') ? `<span class="dm"><ha-icon icon="mdi:harddisk" class="icon-11-st"></ha-icon><b class="dm-val">${done} / ${total}</b></span>` : ''}
        ${this._dlRow('rowPeers') ? `<span class="dm-peer"><span class="dm"><ha-icon icon="mdi:upload" class="icon-11-st"></ha-icon><b class="dm-val">${seeds}</b></span><span class="dm"><ha-icon icon="mdi:download" class="icon-11-st"></ha-icon><b class="dm-val">${peers}</b></span></span>` : ''}
      </div>
      ${this._dlRow('rowProgress') ? `<div class="pbar"><div class="pbar-fill ${pbarClass}" style="width:${pct}%"></div></div>` : ''}
    </div>`;
}

_renderSab() {
  if (!this._sabConfigured) return '';
  const sabKbps = parseFloat(this._sab.kbpersec) || 0;
  const speedStr = this.fmtSpeed(sabKbps * 1024);
  const sabPaused = this._sab.status === 'Paused';

  const allSlots = this._getPageData('sab');
  const items = this._pagedList(allSlots, 'sab', s => this._renderSabItem(s), this._perPage('sab'), 'dc-section-card');

  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}">
      ${allSlots.length === 0 && (!this._sabFailed || this._sabFailed.length === 0) ? this._sectionOverlayHtml('sab', 15, 85, 0.15, 55, 20) : (allSlots.length >= this._perPage('sab')) ? this._sectionOverlayHtml('sab', 15, 85, 0.23) : this._sectionOverlayHtml('sab', 15, 85, 0.23, 55, 20)}
      <div class="col-hdr" style="margin-bottom:8px">
        ${this._appIcon('sab')}
        <span class="col-hdr-title">SABnzbd</span>
        <div class="col-hdr-line"></div>
        ${this._cfgGet('downloads','allowControls',true) !== false
          ? this._sabBusy
            ? `<button class="action-btn" disabled><span class="action-spinner"></span></button>`
            : `<button class="action-btn sab-global-toggle${sabPaused ? ' paused' : ''}" title="${sabPaused ? this._t('resumeSab') : this._t('pauseSab')}">
                 <ha-icon icon="${sabPaused ? 'mdi:play' : 'mdi:pause'}" style="--mdc-icon-size:16px"></ha-icon>
               </button>`
          : ''
        }
      </div>
      ${items}
      ${this._renderSabFailed()}
    </div>`;
}

_renderSabFailed() {
  if (!this._sabFailed || this._sabFailed.length === 0) return '';
  const rows = this._sabFailed.map(s => {
    const name = this._escHtml(s.name || s.filename || 'Unknown');
    const isRetrying = this._sabRetryBusy === s.nzo_id;
    const isDeleting = this._sabDeleteBusy === s.nzo_id;
    const isBusy = isRetrying || isDeleting;

    const _allowCtrlSab = this._cfgGet('downloads', 'allowControls', true) !== false;
    const btns = isBusy
      ? `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;flex-shrink:0"></span>`
      : _allowCtrlSab
        ? `<button class="tb tb-retry"  data-nzoid="${s.nzo_id}" title="${this._t('retry')}"><ha-icon icon="mdi:refresh" style="--mdc-icon-size:14px"></ha-icon></button>
           <button class="tb tb-hist-del" data-nzoid="${s.nzo_id}" title="${this._t('removeFromHist')}"><ha-icon icon="mdi:delete-outline" style="--mdc-icon-size:14px"></ha-icon></button>`
        : '';

    return `
      <div class="dl dl-failed">
        <div class="dl-r1">
          <ha-icon icon="mdi:alert-circle-outline" style="--mdc-icon-size:13px;color:rgba(255,69,58,0.85);flex-shrink:0;margin-right:3px"></ha-icon>
          <span class="dl-name" title="${name}" style="color:rgba(255,120,110,0.90)">${name}</span>
          <div style="display:flex;gap:3px;flex-shrink:0">${btns}</div>
        </div>
      </div>`;
  }).join('');
  return `
    <div class="sab-failed-sep"></div>
    ${rows}`;
}

_sabTimeleftToSecs(t) {
  if (!t || t === '0:00:00') return 0;
  const parts = t.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

_renderSabItem(s) {
  const pct = parseFloat(s.percentage) || 0;
  // SABnzbd returns mb and mbleft as strings
  const mbTotal = parseFloat(s.mb) || 0;
  const mbLeft = parseFloat(s.mbleft) || 0;
  const mbDone = mbTotal - mbLeft;
  const doneSizeStr = fmtBytes(mbDone * 1024 * 1024, { empty: '0 MB' });
  const totalSizeStr = fmtBytes(mbTotal * 1024 * 1024, { empty: '0 MB' });
  const eta = s.timeleft || '';
  const name = this._escHtml(s.filename || 'Unknown');
  const status = s.status || '';
  // Use mbleft delta tracking — SABnzbd reports 'Downloading' for all queue slots
  const isDownloading = this._sabActiveIds?.has(s.nzo_id) ?? false;

  // Per-item speed: derive from mbleft + timeleft (avoids showing total queue speed on every item)
  const SAB_STATUS_PILLS = {
    Queued:     { cls: 'pill-gray',   icon: 'mdi:clock-outline',    label: 'Queued'      },
    Paused:     { cls: 'pill-orange', icon: 'mdi:pause',            label: 'Paused' },
    Checking:   { cls: 'pill-teal',   icon: 'mdi:magnify',          label: 'Checking'    },
    Extracting: { cls: 'pill-teal',   icon: 'mdi:archive-outline',  label: 'Extracting'  },
    Verifying:  { cls: 'pill-teal',   icon: 'mdi:shield-check',     label: 'Verifying'   },
    Repairing:  { cls: 'pill-teal',   icon: 'mdi:wrench-outline',   label: 'Repairing'   },
    Failed:     { cls: 'pill-red',    icon: 'mdi:alert-circle',     label: 'Failed'      },
    Completed:  { cls: 'pill-green',  icon: 'mdi:check-circle',     label: 'Completed'   },
  };
  let speedCol = '';
  if (isDownloading) {
    const secs = this._sabTimeleftToSecs(eta);
    let bps = 0;
    if (secs > 0 && mbLeft > 0) {
      bps = (mbLeft * 1024 * 1024) / secs;
    } else {
      // fallback: total queue speed (only accurate when 1 item downloads)
      bps = (parseFloat(this._sab.kbpersec) || 0) * 1024;
    }
    speedCol = `<span class="dm"><b class="g"><ha-icon icon="mdi:download" style="--mdc-icon-size:11px"></ha-icon> ${this.fmtSpeed(bps)}</b></span>`;
  } else {
    // Items with status 'Downloading' that aren't actively downloading are queued (serial mode)
    // If global queue is paused, all waiting items show Paused
    const globalPaused = this._sab?.status === 'Paused';
    const pillStatus = (status === 'Downloading' || status === 'Queued')
      ? (globalPaused ? 'Paused' : 'Queued')
      : status;
    const pill = SAB_STATUS_PILLS[pillStatus] || { cls: 'pill-gray', icon: 'mdi:dots-horizontal', label: pillStatus || '—' };
    speedCol = `<span class="status-pill ${pill.cls}"><ha-icon icon="${pill.icon}" style="--mdc-icon-size:11px"></ha-icon> ${pill.label}</span>`;
  }

  const nzoId = s.nzo_id || '';
  const _allowCtrlSabItem = this._cfgGet('downloads', 'allowControls', true) !== false;
  let actionBtns = '';
  if (_allowCtrlSabItem) {
    if (s._history) {
      const isDeleting = this._sabDeleteBusy === nzoId;
      actionBtns = isDeleting
        ? `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;margin:0 4px"></span>`
        : `<button class="tb tb-hist-del" data-nzoid="${nzoId}" title="${this._t('removeFromHist')}"><ha-icon icon="mdi:delete-outline" class="icon-15"></ha-icon></button>`;
    } else {
      const isBusy = this._sabQueueBusy === nzoId;
      if (isBusy) {
        actionBtns = `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;margin:0 4px"></span>`;
      } else if (this._sabQueueConfirm === nzoId) {
        actionBtns = `
          <button class="tb tb-cancel" data-sab-action="cancel" data-nzoid="${nzoId}" title="${this._t('cancelRemove')}"><ha-icon icon="mdi:close" class="icon-15"></ha-icon></button>
          <button class="tb tb-del"   data-sab-action="delete"  data-nzoid="${nzoId}" title="${this._t('deleteFiles')}"><ha-icon icon="mdi:delete" class="icon-15"></ha-icon></button>`;
      } else {
        actionBtns = `<button class="tb tb-remove" data-sab-action="confirm" data-nzoid="${nzoId}" title="${this._t('remove')}"><ha-icon icon="mdi:delete-outline" class="icon-15"></ha-icon></button>`;
      }
    }
  }

  return `
    <div class="dl"${this._dlOpenAttr(nzoId)}>
      <div class="dl-r1">
        <span class="dl-name" title="${name}">${name}</span>
        ${this._dlRow('rowPercent') ? `<span class="dl-pct">${pct}%</span>` : ''}
        <div class="tb-group">${actionBtns}</div>
      </div>
      <div class="dl-r2">
        ${speedCol}
        ${isDownloading && this._dlRow('rowEta') ? `<span class="dm"><ha-icon icon="mdi:clock-outline" class="icon-11-st"></ha-icon><b class="dm-val">${eta}</b></span>` : ''}
        ${this._dlRow('rowSize') ? `<span class="dm"><ha-icon icon="mdi:harddisk" class="icon-11-st"></ha-icon><b class="dm-val">${doneSizeStr} / ${totalSizeStr}</b></span>` : ''}
      </div>
      ${this._dlRow('rowProgress') ? `<div class="pbar"><div class="pbar-fill ${
        status === 'Failed'                                          ? 'pf-red'    :
        status === 'Completed'                                       ? 'pf-green'  :
        ['Checking','Verifying','Extracting','Repairing'].includes(status) ? 'pf-teal' :
        isDownloading                                                ? 'pf-blue'   :
        'pf-orange'
      }" style="width:${pct}%"></div></div>` : ''}
    </div>`;
}

// ─────────────────────────────────────────────
// NZBGet
// ─────────────────────────────────────────────

_renderNzbget() {
  if (!this._nzbgetConfigured) return '';
  const speedBps   = this._nzbget?.DownloadRate || 0;
  const speedStr   = this.fmtSpeed(speedBps);
  const paused     = !!(this._nzbget?.DownloadPaused);

  const allSlots = this._getPageData('nzbget');
  const items    = this._pagedList(allSlots, 'nzbget', s => this._renderNzbgetItem(s), this._perPage('nzbget'), 'dc-section-card');

  return `
    <div class="sec-card has-gradient" style="${this._sectionStyle()}">
      ${allSlots.length === 0 ? this._sectionOverlayHtml('nzbget', 15, 85, 0.15, 55, 20) : (allSlots.length >= this._perPage('nzbget')) ? this._sectionOverlayHtml('nzbget', 15, 85, 0.23) : this._sectionOverlayHtml('nzbget', 15, 85, 0.23, 55, 20)}
      <div class="col-hdr" style="margin-bottom:8px">
        ${this._appIcon('nzbget')}
        <span class="col-hdr-title">NZBGet</span>
        <div class="col-hdr-line"></div>
        ${this._cfgGet('downloads','allowControls',true) !== false
          ? this._nzbgetBusy
            ? `<button class="action-btn" disabled><span class="action-spinner"></span></button>`
            : `<button class="action-btn nzbget-global-toggle${paused ? ' paused' : ''}" title="${paused ? this._t('resumeNzbget') : this._t('pauseNzbget')}">
                 <ha-icon icon="${paused ? 'mdi:play' : 'mdi:pause'}" style="--mdc-icon-size:16px"></ha-icon>
               </button>`
          : ''
        }
      </div>
      ${items}
      ${this._renderNzbgetFailed()}
    </div>`;
}

_renderNzbgetFailed() {
  if (!this._nzbgetFailed || this._nzbgetFailed.length === 0) return '';
  const rows = this._nzbgetFailed.map(s => {
    const name       = this._escHtml(s.NZBName || 'Unknown');
    const isRetrying = this._nzbgetRetryBusy === s.NZBID;
    const isDeleting = this._nzbgetItemBusy  === s.NZBID;
    const isBusy     = isRetrying || isDeleting;
    const btns = isBusy
      ? `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;flex-shrink:0"></span>`
      : `<button class="tb tb-retry"    data-nzbget-action="retry"       data-nzbid="${s.NZBID}" title="${this._t('retry')}"><ha-icon icon="mdi:refresh" style="--mdc-icon-size:14px"></ha-icon></button>
         <button class="tb tb-hist-del" data-nzbget-action="item-delete" data-nzbid="${s.NZBID}" title="${this._t('removeFromHist')}"><ha-icon icon="mdi:delete-outline" style="--mdc-icon-size:14px"></ha-icon></button>`;
    return `
      <div class="dl dl-failed">
        <div class="dl-r1">
          <ha-icon icon="mdi:alert-circle-outline" style="--mdc-icon-size:13px;color:rgba(255,69,58,0.85);flex-shrink:0;margin-right:3px"></ha-icon>
          <span class="dl-name" title="${name}" style="color:rgba(255,120,110,0.90)">${name}</span>
          <div style="display:flex;gap:3px;flex-shrink:0">${btns}</div>
        </div>
      </div>`;
  }).join('');
  return `<div class="sab-failed-sep"></div>${rows}`;
}

_renderNzbgetItem(s) {
  const isHistory = !!s._history;
  const name      = this._escHtml(s.NZBName || 'Unknown');
  const totalMB   = s.FileSizeMB || 0;
  const remMB     = isHistory ? 0 : (s.RemainingSizeMB || 0);
  const doneMB    = totalMB - remMB;
  const pct       = totalMB > 0 ? Math.max(0, Math.min(100, Math.round((doneMB / totalMB) * 100))) : (isHistory ? 100 : 0);
  const totalStr  = fmtBytes(totalMB * 1024 * 1024, { empty: '0 MB' });
  const doneStr   = fmtBytes(doneMB  * 1024 * 1024, { empty: '0 MB' });
  const status    = s.Status || '';
  const nzbId     = s.NZBID;

  const NZBGET_STATUS_PILLS = {
    QUEUED:             { cls: 'pill-gray',   icon: 'mdi:clock-outline',   label: 'Queued'       },
    PAUSED:             { cls: 'pill-orange', icon: 'mdi:pause',           label: 'Paused'       },
    PP_QUEUED:          { cls: 'pill-gray',   icon: 'mdi:clock-outline',   label: 'PP Queued'    },
    LOADING_PARS:       { cls: 'pill-teal',   icon: 'mdi:magnify',         label: 'Loading Pars' },
    VERIFYING_SOURCE:   { cls: 'pill-teal',   icon: 'mdi:shield-check',    label: 'Verifying'    },
    VERIFYING_REPAIRED: { cls: 'pill-teal',   icon: 'mdi:shield-check',    label: 'Verified'     },
    REPAIRING:          { cls: 'pill-teal',   icon: 'mdi:wrench-outline',  label: 'Repairing'    },
    UNPACKING:          { cls: 'pill-teal',   icon: 'mdi:archive-outline', label: 'Unpacking'    },
    MOVING:             { cls: 'pill-teal',   icon: 'mdi:folder-move',     label: 'Moving'       },
    EXECUTING_SCRIPT:   { cls: 'pill-teal',   icon: 'mdi:script-outline',  label: 'Script'       },
    FAILURE:            { cls: 'pill-red',    icon: 'mdi:alert-circle',    label: 'Failed'       },
    SUCCESS:            { cls: 'pill-green',  icon: 'mdi:check-circle',    label: 'Completed'    },
    DELETED:            { cls: 'pill-gray',   icon: 'mdi:delete-outline',  label: 'Deleted'      },
  };

  const isDownloading = status === 'DOWNLOADING' && !this._nzbget?.DownloadPaused;
  const globalPaused  = !!(this._nzbget?.DownloadPaused);

  let speedCol = '';
  if (isDownloading) {
    const bps = this._nzbget?.DownloadRate || 0;
    speedCol  = `<span class="dm"><b class="g"><ha-icon icon="mdi:download" style="--mdc-icon-size:11px"></ha-icon> ${this.fmtSpeed(bps)}</b></span>`;
  } else {
    const pillStatus = isHistory
      ? (status === 'SUCCESS' ? 'SUCCESS' : 'FAILURE')
      : (status === 'DOWNLOADING' && globalPaused ? 'PAUSED' : status);
    const pill = NZBGET_STATUS_PILLS[pillStatus] || { cls: 'pill-gray', icon: 'mdi:dots-horizontal', label: pillStatus || '—' };
    speedCol = `<span class="status-pill ${pill.cls}"><ha-icon icon="${pill.icon}" style="--mdc-icon-size:11px"></ha-icon> ${pill.label}</span>`;
  }

  const _allowCtrlNzb = this._cfgGet('downloads', 'allowControls', true) !== false;
  let actionBtns = '';
  if (_allowCtrlNzb) {
    if (isHistory) {
      const isDeleting = this._nzbgetItemBusy === nzbId;
      actionBtns = isDeleting
        ? `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;margin:0 4px"></span>`
        : `<button class="tb tb-hist-del" data-nzbget-action="item-delete" data-nzbid="${nzbId}" title="${this._t('removeFromHist')}"><ha-icon icon="mdi:delete-outline" class="icon-15"></ha-icon></button>`;
    } else {
      const isBusy = this._nzbgetItemBusy === nzbId;
      if (isBusy) {
        actionBtns = `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;margin:0 4px"></span>`;
      } else if (this._nzbgetConfirm === nzbId) {
        actionBtns = `
          <button class="tb tb-cancel" data-nzbget-action="cancel" data-nzbid="${nzbId}" title="${this._t('cancelRemove')}"><ha-icon icon="mdi:close" class="icon-15"></ha-icon></button>
          <button class="tb tb-del"   data-nzbget-action="item-delete" data-nzbid="${nzbId}" title="${this._t('deleteFiles')}"><ha-icon icon="mdi:delete" class="icon-15"></ha-icon></button>`;
      } else {
        actionBtns = `<button class="tb tb-remove" data-nzbget-action="confirm" data-nzbid="${nzbId}" title="${this._t('remove')}"><ha-icon icon="mdi:delete-outline" class="icon-15"></ha-icon></button>`;
      }
    }
  }

  const barCls = status === 'FAILURE'     ? 'pf-red'    :
                 isHistory                ? 'pf-green'  :
                 ['LOADING_PARS','VERIFYING_SOURCE','VERIFYING_REPAIRED','REPAIRING','UNPACKING','MOVING','EXECUTING_SCRIPT'].includes(status) ? 'pf-teal' :
                 isDownloading            ? 'pf-blue'   :
                 'pf-orange';

  return `
    <div class="dl"${this._dlOpenAttr(nzbId)}>
      <div class="dl-r1">
        <span class="dl-name" title="${name}">${name}</span>
        ${this._dlRow('rowPercent') ? `<span class="dl-pct">${pct}%</span>` : ''}
        <div class="tb-group">${actionBtns}</div>
      </div>
      <div class="dl-r2">
        ${speedCol}
        ${this._dlRow('rowSize') ? `<span class="dm"><ha-icon icon="mdi:harddisk" class="icon-11-st"></ha-icon><b class="dm-val">${doneStr} / ${totalStr}</b></span>` : ''}
      </div>
      ${this._dlRow('rowProgress') ? `<div class="pbar"><div class="pbar-fill ${barCls}" style="width:${pct}%"></div></div>` : ''}
    </div>`;
}

// ─────────────────────────────────────────────
// Right column
// ─────────────────────────────────────────────

_renderPendingRequests() {
  const reqs = this._pendingRequests;
  if (!reqs || reqs.length === 0) return '';

  const groupMap = new Map();
  for (const r of reqs) {
    const key = `${r.type}_${(r.media ?? {}).tmdbId ?? r.id}`;
    if (!groupMap.has(key)) groupMap.set(key, { ...r, _requests: [r] });
    else groupMap.get(key)._requests.push(r);
  }
  const grouped = [...groupMap.values()];

  const grid = this._pagedGrid(grouped, 'pending', g => this._renderPendingCard(g));
  return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        ${this._appIcon(this._discoverIconKey(), 24)}
        <span class="col-hdr-title">${this._t('pendingRequests')}</span>
        <span class="pr-badge">${reqs.length}</span>
        <div class="col-hdr-line"></div>
      </div>
      ${grid}
    </div>`;
}

_renderPendingCard(req) {
  const allReqs   = req._requests || [req];
  const media     = req.media ?? {};
  const isMovie   = req.type === 'movie';
  const title     = this._escHtml(media.title || media.originalTitle || media.name || '—');
  const poster    = media.posterPath;
  const typeLabel = isMovie ? this._t('typeMovie') : this._t('typeTv');
  const icon      = isMovie ? '🎬' : '📺';
  const tmdbId    = media.tmdbId ?? 0;
  const reqIds    = allReqs.map(r => r.id).join(',');

  const userTags = allReqs.map(r => {
    const name = this._escHtml(r.requestedBy?.displayName ?? r.requestedBy?.username ?? '?');
    const seasons = r.seasons?.length;
    const sNums = (!isMovie && r.seasons?.length) ? r.seasons.map(s => s.seasonNumber).sort((a,b) => a-b) : [];
    const seasonInfo = sNums.length ? ` S${String(sNums[0]).padStart(2,'0')}${sNums.length > 1 ? '-S' + String(sNums[sNums.length-1]).padStart(2,'0') : ''}` : '';
    return `<span class="media-type-tag pr-user-tag" style="position:static">${name}${seasonInfo}</span>`;
  });

  const imgHtml = poster
    ? `<img src="${poster.startsWith('http') ? poster : `https://image.tmdb.org/t/p/w342${poster}`}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="${this._grad(req.id)}" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px">${icon}</div>`;

  const pc = this._config;
  const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
  const stripe = showStripe ? this._statusStripe(this._statusStripeColor('b-st-pend'), false, -1) : '';

  return `
    <div class="mc" data-popup="${isMovie ? 'movie' : 'tv'}" data-tmdbid="${tmdbId}" data-title="${title}">
      ${imgHtml}
      ${stripe}
      <div class="pr-tags-col">
        <span class="media-type-tag" style="position:static">${typeLabel}</span>
        ${userTags.join('\n        ')}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,0.93) 0%,transparent 80%);padding:36px 6px 5px;z-index:1">
        <div class="pr-btn-row" style="margin-bottom:4px">
          <button class="pr-approve" data-reqid="${reqIds}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></button>
          <button class="pr-decline" data-reqid="${reqIds}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div style="font-size:10px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${title}">${title}</div>
      </div>
    </div>`;
}

_renderRtorrent() {
  if (!this._rtorrentConfigured) return '';
  const status   = this._rtorrentStatus || {};
  const torrents = Array.isArray(this._rtorrentQueue) ? [...this._rtorrentQueue] : [];

  const [sortField, sortDir] = this._sortRtorrent.split('_');
  torrents.sort((a, b) => {
    const av = sortField === 'speed' ? (a.download_payload_rate || 0) : (a.progress || 0);
    const bv = sortField === 'speed' ? (b.download_payload_rate || 0) : (b.progress || 0);
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const progressActive = sortField === 'progress';
  const speedActive    = sortField === 'speed';
  const dir = sortDir === 'desc' ? '↓' : '↑';
  const allPaused = torrents.length > 0 && torrents.every(t => (t.state || '').toLowerCase() === 'paused');

  const items = this._pagedList(torrents, 'rtorrent', t => this._renderRtorrentItem(t), this._perPage('rtorrent'), 'dc-section-card');

  return `
  <div class="sec-card has-gradient" style="${this._sectionStyle()}">
    ${torrents.length === 0 ? this._sectionOverlayHtml('rtorrent', 15, 85, 0.15, 55, 20) : (torrents.length >= this._perPage('rtorrent')) ? this._sectionOverlayHtml('rtorrent', 15, 85, 0.23) : this._sectionOverlayHtml('rtorrent', 15, 85, 0.23, 55, 20)}
    <div class="col-hdr" style="margin-bottom:8px">
      ${this._appIcon('rtorrent')}
      <span class="col-hdr-title">rTorrent</span>
      <div class="col-hdr-line"></div>
      <div class="sort-btns">
        <button class="sb${progressActive ? ' on' : ''}" data-sort="${progressActive ? (sortDir === 'desc' ? 'progress_asc' : 'progress_desc') : 'progress_desc'}" data-client="rtorrent" title="${this._t('sortByProgress')}">
          <ha-icon icon="mdi:percent" class="icon-15"></ha-icon><span class="sb-dir" style="${progressActive ? '' : 'visibility:hidden'}">${dir}</span>
        </button>
        <button class="sb${speedActive ? ' on' : ''}" data-sort="${speedActive ? (sortDir === 'desc' ? 'speed_asc' : 'speed_desc') : 'speed_desc'}" data-client="rtorrent" title="${this._t('sortBySpeed')}">
          <ha-icon icon="mdi:speedometer" class="icon-15"></ha-icon><span class="sb-dir" style="${speedActive ? '' : 'visibility:hidden'}">${dir}</span>
        </button>
      </div>
      ${this._cfgGet('downloads','allowControls',true) !== false
        ? this._rtorrentBusy
          ? `<button class="action-btn" disabled><span class="action-spinner"></span></button>`
          : `<button class="action-btn rtorrent-global-toggle${allPaused ? ' paused' : ''}" title="${allPaused ? this._t('resumeAll') : this._t('pauseAll')}">
               <ha-icon icon="${allPaused ? 'mdi:play' : 'mdi:pause'}" style="--mdc-icon-size:16px"></ha-icon>
             </button>`
        : ''
      }
    </div>
    ${items}
  </div>`;
}

_renderRtorrentItem(t) {
  const pct      = Math.round(t.progress || 0);
  const dlSpeed  = this.fmtSpeed(t.download_payload_rate || 0);
  const upSpeed  = this.fmtSpeed(t.upload_payload_rate || 0);
  const eta      = this.fmtEta(t.eta);
  const completed = fmtBytes(t.total_done, { empty: '0 MB' });
  const total    = fmtBytes(t.total_size, { empty: '0 MB' });
  const seeds    = t.num_seeds || 0;
  const peers    = t.num_peers || 0;
  const name     = this._escHtml(t.name || 'Unknown');
  const hash     = t.hash || '';

  const state       = (t.state || '').toLowerCase();
  const isCompleted = pct >= 100;
  const isPaused    = state === 'paused';
  const isSeeding   = state === 'seeding';
  const isError     = state === 'error';
  const isChecking  = state === 'checking';

  let speedCol = '';
  if (isSeeding) {
    speedCol = this._pill('pill-teal', 'mdi:upload', upSpeed);
  } else if (isCompleted) {
    speedCol = this._pill('pill-green', 'mdi:check-circle', this._t('complete'));
  } else if (isError) {
    speedCol = this._pill('pill-red', 'mdi:alert-circle', t.message || this._t('errorState'));
  } else if (isPaused) {
    speedCol = this._pill('pill-orange', 'mdi:pause-circle', this._t('paused'));
  } else if (isChecking) {
    speedCol = this._pill('pill-orange', 'mdi:sync', 'Checking');
  } else {
    speedCol = this._pill('pill-green', 'mdi:download', dlSpeed);
  }

  const pbarClass = isError ? 'pf-red' : isPaused ? 'pf-orange' : isSeeding ? 'pf-teal' : isCompleted ? 'pf-green' : 'pf-blue';

  const _allowCtrlRt = this._cfgGet('downloads', 'allowControls', true) !== false;
  let actionBtns = '';
  if (_allowCtrlRt) {
    if (this._rtorrentItemBusy === hash) {
      actionBtns = `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;margin:0 4px"></span>`;
    } else if (this._rtorrentConfirm === hash) {
      actionBtns = `
        <button class="tb tb-cancel" data-rt-action="cancel-remove" data-rt-hash="${hash}" title="${this._t('cancelRemove')}"><ha-icon icon="mdi:close" class="icon-15"></ha-icon></button>
        <button class="tb tb-keep"   data-rt-action="remove-keep"   data-rt-hash="${hash}" title="${this._t('keepFiles')}"><ha-icon icon="mdi:magnet" class="icon-15"></ha-icon></button>
        <button class="tb tb-del"    data-rt-action="remove-del"    data-rt-hash="${hash}" title="${this._t('deleteFiles')}"><ha-icon icon="mdi:delete" class="icon-15"></ha-icon></button>`;
    } else {
      if (!isCompleted && isPaused)
        actionBtns += `<button class="tb tb-resume" data-rt-action="resume" data-rt-hash="${hash}" title="${this._t('resume')}"><ha-icon icon="mdi:play" class="icon-15"></ha-icon></button>`;
      if (!isCompleted && !isPaused && !isError)
        actionBtns += `<button class="tb tb-pause" data-rt-action="pause" data-rt-hash="${hash}" title="${this._t('pause')}"><ha-icon icon="mdi:pause" class="icon-15"></ha-icon></button>`;
      if (isSeeding)
        actionBtns += `<button class="tb tb-pause" data-rt-action="pause" data-rt-hash="${hash}" title="${this._t('stopSeed')}"><ha-icon icon="mdi:stop" class="icon-15"></ha-icon></button>`;
      actionBtns += `<button class="tb tb-remove" data-rt-action="remove-confirm" data-rt-hash="${hash}" title="${this._t('remove')}"><ha-icon icon="mdi:delete-outline" class="icon-15"></ha-icon></button>`;
    }
  }

  return `
    <div class="dl"${this._dlOpenAttr(hash)}>
      <div class="dl-r1">
        <span class="dl-name" title="${name}">${name}</span>
        ${this._dlRow('rowPercent') ? `<span class="dl-pct${isError ? ' dl-pct-err' : ''}">${pct}%</span>` : ''}
        <div class="tb-group">${actionBtns}</div>
      </div>
      <div class="dl-r2">
        ${speedCol}
        ${this._dlRow('rowUpload') && !isCompleted && !isError && !isPaused && !isChecking
          ? this._pill('pill-teal', 'mdi:upload', upSpeed)
          : ''}
        ${!this._dlRow('rowEta') ? '' : isSeeding
          ? `<span class="dm"><ha-icon icon="mdi:swap-vertical" class="icon-11-st"></ha-icon><b class="dm-val">${seeds}S ${peers}P</b></span>`
          : `<span class="dm dm-eta"><ha-icon icon="mdi:clock-outline" class="icon-11-st"></ha-icon><b class="dm-val">${eta}</b></span>`}
        ${this._dlRow('rowSize') ? `<span class="dm"><ha-icon icon="mdi:harddisk" class="icon-11-st"></ha-icon><b class="dm-val">${completed} / ${total}</b></span>` : ''}
        ${this._dlRow('rowPeers') ? `<span class="dm-peer"><span class="dm"><ha-icon icon="mdi:upload" class="icon-11-st"></ha-icon><b class="dm-val">${seeds}</b></span><span class="dm"><ha-icon icon="mdi:download" class="icon-11-st"></ha-icon><b class="dm-val">${peers}</b></span></span>` : ''}
      </div>
      ${this._dlRow('rowProgress') ? `<div class="pbar"><div class="pbar-fill ${pbarClass}" style="width:${pct}%"></div></div>` : ''}
    </div>`;
}

_renderVpnBar() {
  if (this._gluetunConfigured === false) return '';
  if (this._cfgGet('downloads', 'showVpnCard', true) === false) return '';
  if (this._gluetunConfigured === null) return '';  // not yet loaded

  const online  = this._gluetunStatus === 'running';
  const cls     = online ? 'vpn-bar-online' : 'vpn-bar-offline';
  const details = [this._gluetunCountry, this._gluetunIp].filter(Boolean).join(' • ');
  const useMdi = this._cfgGet('styles', 'applicationIcons', 'real') === 'mdi';
  const shieldFallback = online ? `<ha-icon icon="mdi:shield-check" style="--mdc-icon-size:18px;flex-shrink:0"></ha-icon>` : '';
  const providerLogo = (online && this._gluetunProviderSvg && !useMdi)
    ? `<img src="${this._gluetunProviderSvg}" width="18" height="18" style="flex-shrink:0;opacity:0.9" alt="">`
    : shieldFallback;
  const tag = online
    ? `<span class="g" style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;color:#fff">VPN Active</span>`
    : `<span class="pill-red" style="font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;color:#fff">VPN Offline</span>`;
  return `
    <div class="vpn-bar ${cls}">
      ${tag}${details ? `<span style="margin-left:auto;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#fff">${_countryFlag(this._gluetunCountry) ? _countryFlag(this._gluetunCountry) + ' ' : ''}${details}</span>` : ''}
      ${online && providerLogo ? `<span style="display:inline-flex;align-items:center;gap:5px;color:#fff;font-size:11px;font-weight:700;margin-left:-4px">•${providerLogo}</span>` : ''}
    </div>`;
}

}

export const renderLeftMixin = _RenderLeft.prototype;
