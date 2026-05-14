class _RenderLeft {
_renderLeft() {
  return `
    ${this._renderDiskRow()}
    <div class="spacer"></div>
    ${this._renderQbit()}
    <div class="spacer"></div>
    ${this._renderSab()}
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
  // Combined speed
  const qbitSpeedBytes = (this._qbitTransfer.dl_info_speed) || 0;
  const sabKbps = parseFloat(this._sab.kbpersec) || 0;
  const sabSpeedBytes = sabKbps * 1024;
  const combinedSpeed = qbitSpeedBytes + sabSpeedBytes;

  const qbitSpeedStr = this.fmtSpeed(qbitSpeedBytes);
  const sabSpeedStr = this.fmtSpeed(sabSpeedBytes);
  const combinedStr = this.fmtSpeed(combinedSpeed);

  // Disk space (SABnzbd)
  const diskFreeGB = parseFloat(this._sab.diskspace1) || 0;
  const diskTotalGB = parseFloat(this._sab.diskspacetotal1) || 0;
  const diskUsedGB = diskTotalGB - diskFreeGB;
  const diskPct = diskTotalGB > 0 ? (diskUsedGB / diskTotalGB) * 100 : 0;
  const diskUsedStr = diskUsedGB >= 1024
    ? (diskUsedGB / 1024).toFixed(1) + ' TB'
    : diskUsedGB.toFixed(1) + ' GB';
  const diskTotalStr = diskTotalGB >= 1024
    ? (diskTotalGB / 1024).toFixed(1) + ' TB'
    : diskTotalGB.toFixed(1) + ' GB';
  const diskFreeStr = diskFreeGB >= 1024
    ? (diskFreeGB / 1024).toFixed(1) + ' TB'
    : diskFreeGB.toFixed(1) + ' GB';

  // Active torrents
  const activeTorrents = Array.isArray(this._qbit) ? this._qbit.length : 0;

  // SABnzbd queue
  const sabSlots = Array.isArray(this._sab.slots) ? this._sab.slots.length : 0;
  const sabTotal = this._sab.noofslots_total || sabSlots;

  return `
    <div class="disk-row">
      <div class="disk-chip">
        <div class="dc-label">${this._t('totalSpeed')}</div>
        <div class="dc-val"><span class="g" style="font-size:15px;font-weight:800;padding:2px 10px"><ha-icon icon="mdi:download" style="--mdc-icon-size:14px"></ha-icon> ${combinedStr}</span></div>
        <div class="dc-sub">qBit ${qbitSpeedStr} · SAB ${sabSpeedStr}</div>
      </div>
      <div class="disk-chip">
        <div class="dc-label">${this._t('storage')}</div>
        <div class="dc-val"><span class="pill-orange dc-pill">${diskUsedStr}</span><span style="font-size:10px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.6);font-weight:600"> / ${diskTotalStr}</span></div>
        <div class="mbar"><div class="mbar-fill pf-orange" style="width:${diskPct.toFixed(0)}%"></div></div>
        <div class="dc-sub">${diskPct.toFixed(0)} % · ${diskFreeStr} ${this._t('free')}</div>
      </div>
    </div>`;
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

  const items = this._pagedList(torrents, 'qbit', t => this._renderTorrentItem(t), this._perPage('qbit'));

  return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:8px">
        ${this._appIcon('qbit')}
        <span class="col-hdr-title">qBittorrent</span>
        <div class="col-hdr-line"></div>
        <div class="sort-btns">
          <button class="sb${progressActive ? ' on' : ''}" data-sort="${progressActive ? (sortDir === 'desc' ? 'progress_asc' : 'progress_desc') : 'progress_desc'}" title="${this._t('sortByProgress')}">
            <ha-icon icon="mdi:percent" style="--mdc-icon-size:15px"></ha-icon>${progressActive ? `<span class="sb-dir">${dir}</span>` : ''}
          </button>
          <button class="sb${speedActive ? ' on' : ''}" data-sort="${speedActive ? (sortDir === 'desc' ? 'speed_asc' : 'speed_desc') : 'speed_desc'}" title="${this._t('sortBySpeed')}">
            <ha-icon icon="mdi:speedometer" style="--mdc-icon-size:15px"></ha-icon>${speedActive ? `<span class="sb-dir">${dir}</span>` : ''}
          </button>
        </div>
        ${this._qbitBusy
          ? `<button class="action-btn" disabled><span class="action-spinner"></span></button>`
          : `<button class="action-btn qbit-global-toggle${allPaused ? ' paused' : ''}" title="${allPaused ? this._t('resumeAll') : this._t('pauseAll')}">
               <ha-icon icon="${allPaused ? 'mdi:play' : 'mdi:pause'}" style="--mdc-icon-size:16px"></ha-icon>
             </button>`
        }
      </div>
      ${items}
    </div>`;
}

_renderTorrentItem(t) {
  const pct = Math.round((t.progress || 0) * 100);
  const dlSpeed = this.fmtSpeed(t.dlspeed || 0);
  const upSpeed = this.fmtSpeed(t.upspeed || 0);
  const eta = this.fmtEta(t.eta);
  const ratio = (t.ratio != null && isFinite(t.ratio)) ? t.ratio.toFixed(2) : '—';
  const completed = this.fmtSize(t.completed || 0);
  const total = this.fmtSize(t.size || 0);
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
    speedCol = `<span class="status-pill pill-teal"><ha-icon icon="mdi:upload" style="--mdc-icon-size:11px"></ha-icon> ${upSpeed}</span>`;
  } else if (isStalledSeed) {
    speedCol = `<span class="status-pill pill-teal" style="opacity:0.65"><ha-icon icon="mdi:upload-off" style="--mdc-icon-size:11px"></ha-icon> ${this._t('seeding')}</span>`;
  } else if (isCompleted) {
    speedCol = `<span class="status-pill pill-green"><ha-icon icon="mdi:check-circle" style="--mdc-icon-size:11px"></ha-icon> ${this._t('complete')}</span>`;
  } else if (isError) {
    speedCol = `<span class="status-pill pill-red"><ha-icon icon="mdi:alert-circle" style="--mdc-icon-size:11px"></ha-icon> ${errorStates[state]}</span>`;
  } else if (isStalledDL) {
    speedCol = `<span class="status-pill pill-orange"><ha-icon icon="mdi:alert" style="--mdc-icon-size:11px"></ha-icon> ${this._t('stalled')}</span>`;
  } else {
    speedCol = `<span class="dm"><b class="g" style="font-size:13px"><span style="display:inline-block;transform:translateY(-4px)"><ha-icon icon="mdi:download" style="--mdc-icon-size:12px"></ha-icon></span> ${dlSpeed}</b></span>`;
  }

  const pbarClass = isError ? 'pf-red' : isStalledDL ? 'pf-orange' : isCompleted ? 'pf-green' : 'pf-blue';

  // Action buttons
  const hash = t.hash || '';
  // qBit v4: pausedDL/pausedUP  |  qBit v5: stoppedDL/stoppedUP
  const isPaused = state === 'pausedDL' || state === 'pausedUP' ||
                   state === 'stoppedDL' || state === 'stoppedUP';
  let actionBtns = '';
  if (this._qbitItemBusy === hash) {
    // tato položka zpracovává akci — zobraz spinner
    actionBtns = `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;margin:0 4px"></span>`;
  } else if (this._confirmRemove === hash) {
    actionBtns = `
      <button class="tb tb-cancel" data-tb-action="cancel-remove" data-hash="${hash}" title="${this._t('cancelRemove')}"><ha-icon icon="mdi:close" style="--mdc-icon-size:15px"></ha-icon></button>
      <button class="tb tb-keep"   data-tb-action="remove-keep"   data-hash="${hash}" title="${this._t('keepFiles')}"><ha-icon icon="mdi:magnet" style="--mdc-icon-size:15px"></ha-icon></button>
      <button class="tb tb-del"    data-tb-action="remove-del"    data-hash="${hash}" title="${this._t('deleteFiles')}"><ha-icon icon="mdi:delete" style="--mdc-icon-size:15px"></ha-icon></button>`;
  } else {
    if (!isCompleted && isPaused)
      actionBtns += `<button class="tb tb-resume" data-tb-action="resume" data-hash="${hash}" title="${this._t('resume')}"><ha-icon icon="mdi:play" style="--mdc-icon-size:15px"></ha-icon></button>`;
    if (!isCompleted && !isPaused && !isError)
      actionBtns += `<button class="tb tb-pause" data-tb-action="pause" data-hash="${hash}" title="${this._t('pause')}"><ha-icon icon="mdi:pause" style="--mdc-icon-size:15px"></ha-icon></button>`;
    if (isSeeding)
      actionBtns += `<button class="tb tb-pause" data-tb-action="pause" data-hash="${hash}" title="${this._t('stopSeed')}"><ha-icon icon="mdi:stop" style="--mdc-icon-size:15px"></ha-icon></button>`;
    actionBtns += `<button class="tb tb-remove" data-tb-action="remove-confirm" data-hash="${hash}" title="${this._t('remove')}"><ha-icon icon="mdi:delete-outline" style="--mdc-icon-size:15px"></ha-icon></button>`;
  }

  return `
    <div class="dl">
      <div class="dl-r1">
        <span class="dl-name" title="${name}">${name}</span>
        <span class="dl-pct${isError ? ' dl-pct-err' : ''}">${pct}%</span>
        <div class="tb-group">${actionBtns}</div>
      </div>
      <div class="dl-r2">
        ${speedCol}
        ${isSeeding
          ? `<span class="dm"><ha-icon icon="mdi:swap-vertical" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">R: ${ratio}</b></span>`
          : `<span class="dm"><ha-icon icon="mdi:clock-outline" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${eta}</b></span>`
        }
        <span class="dm"><ha-icon icon="mdi:harddisk" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${completed} / ${total}</b></span>
        <span class="dm"><ha-icon icon="mdi:upload" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${seeds}</b></span>
        <span class="dm"><ha-icon icon="mdi:download" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${leechs}</b></span>
      </div>
      <div class="pbar"><div class="pbar-fill ${pbarClass}" style="width:${pct}%"></div></div>
    </div>`;
}

_renderSab() {
  if (!this._sabConfigured) return '';
  const sabKbps = parseFloat(this._sab.kbpersec) || 0;
  const speedStr = this.fmtSpeed(sabKbps * 1024);
  const slots = Array.isArray(this._sab.slots) ? this._sab.slots : [];
  const sabPaused = this._sab.status === 'Paused';

  const items = this._pagedList(slots, 'sab', s => this._renderSabItem(s), this._perPage('sab'));

  return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:8px">
        ${this._appIcon('sab')}
        <span class="col-hdr-title">SABnzbd</span>
        <div class="col-hdr-line"></div>
        ${this._sabBusy
          ? `<button class="action-btn" disabled><span class="action-spinner"></span></button>`
          : `<button class="action-btn sab-global-toggle${sabPaused ? ' paused' : ''}" title="${sabPaused ? this._t('resumeSab') : this._t('pauseSab')}">
               <ha-icon icon="${sabPaused ? 'mdi:play' : 'mdi:pause'}" style="--mdc-icon-size:16px"></ha-icon>
             </button>`
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

    const btns = isBusy
      ? `<span class="action-spinner" style="width:11px;height:11px;border-width:1.5px;flex-shrink:0"></span>`
      : `<button class="tb tb-retry"  data-nzoid="${s.nzo_id}" title="${this._t('retry')}"><ha-icon icon="mdi:refresh" style="--mdc-icon-size:14px"></ha-icon></button>
         <button class="tb tb-hist-del" data-nzoid="${s.nzo_id}" title="${this._t('removeFromHist')}"><ha-icon icon="mdi:delete-outline" style="--mdc-icon-size:14px"></ha-icon></button>`;

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

_renderSabItem(s) {
  const pct = parseFloat(s.percentage) || 0;
  // SABnzbd returns mb and mbleft as strings
  const mbTotal = parseFloat(s.mb) || 0;
  const mbLeft = parseFloat(s.mbleft) || 0;
  const mbDone = mbTotal - mbLeft;
  const sizeStr = s.size || `${mbTotal.toFixed(0)} MB`;
  const doneSizeStr = this.fmtSize(mbDone * 1024 * 1024);
  const totalSizeStr = this.fmtSize(mbTotal * 1024 * 1024);
  // SABnzbd queue speed
  const sabKbps = parseFloat(this._sab.kbpersec) || 0;
  const speedStr = this.fmtSpeed(sabKbps * 1024);
  const eta = s.timeleft || '';
  const name = this._escHtml(s.filename || 'Unknown');
  return `
    <div class="dl">
      <div class="dl-r1">
        <span class="dl-name" title="${name}">${name}</span>
        <span class="dl-pct">${pct}%</span>
      </div>
      <div class="dl-r2">
        <span class="dm"><b class="g"><ha-icon icon="mdi:download" style="--mdc-icon-size:11px"></ha-icon> ${speedStr}</b></span>
        <span class="dm"><ha-icon icon="mdi:clock-outline" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${eta}</b></span>
        <span class="dm"><ha-icon icon="mdi:harddisk" style="--mdc-icon-size:11px;color:rgba(var(--arr-st-rgb, 255, 255, 255), 0.85)"></ha-icon><b class="dm-val">${doneSizeStr} / ${totalSizeStr}</b></span>
      </div>
      <div class="pbar"><div class="pbar-fill pf-orange" style="width:${pct}%"></div></div>
    </div>`;
}

// ─────────────────────────────────────────────
// Right column
// ─────────────────────────────────────────────

_renderPendingRequests() {
  const reqs = this._pendingRequests;
  if (!reqs || reqs.length === 0) return '';

  const grid = this._pagedGrid(reqs, 'pending', req => this._renderPendingCard(req));
  return `
    <div class="sec-card">
      <div class="col-hdr" style="margin-bottom:5px">
        <ha-icon icon="mdi:bell-ring" style="--mdc-icon-size:24px"></ha-icon>
        <span class="col-hdr-title">${this._t('pendingRequests')}</span>
        <span class="pr-badge">${reqs.length}</span>
        <div class="col-hdr-line"></div>
      </div>
      ${grid}
    </div>`;
}

_renderPendingCard(req) {
  const media   = req.media ?? {};
  const isMovie = req.type === 'movie';
  const title   = this._escHtml(media.title || media.originalTitle || media.name || '—');
  const poster  = media.posterPath ? `https://image.tmdb.org/t/p/w342${media.posterPath}` : null;
  const reqBy   = this._escHtml(req.requestedBy?.displayName ?? req.requestedBy?.username ?? '?');
  const reqDate = req.createdAt ? this.fmtDate(req.createdAt.slice(0, 10)) : '';
  const typeLabel = isMovie ? this._t('movieLabel') : this._t('showLabel');
  const icon      = isMovie ? '🎬' : '📺';
  const tmdbId    = media.tmdbId ?? 0;

  const coverHtml = poster
    ? `<div class="mc-cover-lg" style="background:none;padding:0"><img src="${poster}" style="width:100%;height:92px;object-fit:cover" loading="lazy" onerror="this.parentElement.innerHTML='${icon}'" /></div>`
    : `<div class="mc-cover-lg ${this._grad(req.id)}">${icon}</div>`;

  return `
    <div class="mc" data-popup="${isMovie ? 'movie' : 'tv'}" data-tmdbid="${tmdbId}" data-title="${title}" style="position:relative">
      ${coverHtml}
      <div class="mc-info">
        <div class="mc-title" title="${title}">${title}</div>
        <div class="pr-meta-row">
          <span class="pr-type-lbl">${typeLabel}</span>
          <span class="pr-requester">👤 ${reqBy}${reqDate ? ` · ${reqDate}` : ''}</span>
        </div>
        <div class="pr-btn-row">
          <button class="pr-approve" data-reqid="${req.id}">✓<span class="st-txt">${this._t('approve')}</span></button>
          <button class="pr-decline" data-reqid="${req.id}">✕<span class="st-txt">${this._t('decline')}</span></button>
        </div>
      </div>
    </div>`;
}

}

export const renderLeftMixin = _RenderLeft.prototype;
