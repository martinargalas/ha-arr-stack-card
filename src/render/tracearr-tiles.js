// Tracearr: the poster tiles in the right column and the click that opens the
// modal. Core, because the column draws them synchronously; the modal loads on
// demand (chunks/tracearr.js).

class _TracearrTilesMethods {

  _renderTracearr() {
    const d = this._tracearr || {};
    return `
      <div class="sec-card has-gradient" style="${this._sectionStyle()}">
        ${this._sectionOverlayHtml('tracearr', 25, 75, 0.22)}
        <div class="col-hdr" style="margin-bottom:5px">
          ${this._appIcon('tracearr', 24)}
          <span class="col-hdr-title">${this._t('traTitle')}</span>
          <div class="col-hdr-line"></div>
        </div>
        <div class="pg-wrap" style="flex:1;align-items:stretch;position:relative">
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8249;</button>
          <div class="tl-row">
            ${this._traUsersCard(d)}
            ${this._traViolationsCard(d)}
            ${this._traActivityCard(d)}
            ${this._traTranscodeCard(d)}
          </div>
          <button class="pg-btn pg-btn-ph" aria-hidden="true" tabindex="-1">&#8250;</button>
        </div>
      </div>`;
  }

  _traActivityCard(d) {
    const plays   = (d.activity?.plays || []).slice(-7);
    const quality = d.activity?.quality || {};
    const maxP    = Math.max(...plays.map(p => p.count || 0), 1);
    const total   = plays.reduce((s, p) => s + (Number(p.count) || 0), 0);
    const todayD  = new Date().getDate();
    const bars    = plays.map(p => {
      const h   = Math.max(p.count ? 4 : 0, Math.round((p.count || 0) / maxP * 100));
      const gap = 100 - h;
      const day = new Date(p.date).getDate();
      return `<div style="flex:1;display:flex;flex-direction:column;padding:0 1.5px">
        <div style="flex:${gap}"></div>
        ${p.count ? `<div style="flex:${h};background:linear-gradient(to bottom,rgba(255,255,255,0.75),rgba(255,255,255,0.3));border-radius:3px 3px 0 0"></div>` : `<div style="flex:${h};display:none"></div>`}
      </div>`;
    }).join('');
    const labels = plays.map(p => {
      const day   = new Date(p.date).getDate();
      const today = day === todayD;
      return `<div style="flex:1;font-size:7px;font-weight:${today?'700':'500'};color:${today?'rgba(255,255,255,0.75)':'rgba(255,255,255,0.3)'};text-align:center;padding:2px 0 0">${day}</div>`;
    }).join('');
    const dp = quality.directPlayPercent ?? 0;

    const playsTag = total > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(130,80,255,0.2);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${total} ${this._t('tlPlays')}</span>`
      : '';

    return `<div class="tl-card u-sec-body" data-tra-open="activity">
      <div class="u-bg-icon">
        <svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4.93 19.07A9 9 0 1 1 19.07 19.07" stroke-linecap="round"/><line x1="12" y1="12" x2="17.5" y2="6.5" stroke-linecap="round"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg>
      </div>
      <div style="display:flex;align-items:center;margin-bottom:6px;position:relative;z-index:2;gap:6px">
        <span class="u-media-badge-s">${this._t('traActivity')}</span>
        <div style="flex:1"></div>
        ${playsTag}
      </div>
      <div style="flex:1;display:flex;flex-direction:column;position:relative;z-index:2;min-height:0">
        <div style="flex:1;display:flex;gap:0">${bars}</div>
        <div style="height:1px;background:rgba(255,255,255,0.08);margin:1px 0"></div>
        <div style="display:flex;gap:0;margin-top:1px">${labels}</div>
        ${dp > 0 ? `<div style="font-size:9px;color:rgba(255,255,255,0.38);margin-top:5px;display:flex;justify-content:space-between"><span>${this._t('traDirectPlayLc')}</span><span style="color:rgba(110,231,183,0.85);font-weight:700">${dp}%</span></div>` : ''}
      </div>
    </div>`;
  }

  _traTranscodeCard(d) {
    const users = (d.topTranscode || []).slice(0, 4);
    const totalTr = users.reduce((s, u) => s + (Number(u.transcodeCount ?? u.transcodes) || 0), 0);

    const rows = users.map((u, i) => {
      const rawName = String(u.identityName || u.username || u.displayName || '?');
      const name  = this._escHtml(rawName);
      const tr    = Number(u.transcodeCount ?? u.transcodes) || 0;
      const dpN   = Math.round(Number(u.directPlayPct ?? u.directPlayRate ?? 0));
      const trPct = Math.round(Number(u.pctOfTotalTranscodes ?? (totalTr ? tr / totalTr * 100 : 0)));
      const av    = this._imgSrc(u.avatar || u.avatarUrl) || null;
      const sep   = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      const avEl  = av
        ? `<img src="${av}" width="15" height="15" style="border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.12)" loading="lazy" onerror="this.style.display='none'">`
        : `<span style="width:15px;height:15px;border-radius:50%;background:rgba(255,255,255,0.12);display:inline-flex;align-items:center;justify-content:center;font-size:6px;font-weight:800;color:rgba(255,255,255,0.6);flex-shrink:0">${this._escHtml(rawName.slice(0, 2).toUpperCase())}</span>`;
      const dpColor = dpN >= 80 ? 'rgba(52,211,153,0.9)' : dpN >= 50 ? 'rgba(251,191,36,0.9)' : 'rgba(248,113,113,0.9)';
      const dpBg    = dpN >= 80 ? 'rgba(52,211,153,0.12)' : dpN >= 50 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.12)';
      return `<div style="${sep}display:flex;align-items:center;gap:5px;padding:4px 0">
        ${avEl}
        <span style="font-size:10px;font-weight:600;color:#fff;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span>
        <span style="font-size:9px;color:rgba(255,255,255,0.4);flex-shrink:0">${tr}×</span>
        <span style="font-size:9px;font-weight:700;color:#fff;background:rgba(248,113,113,0.18);border-radius:10px;padding:1px 5px;flex-shrink:0">${trPct}%</span>
      </div>`;
    }).join('');

    const empty = `<div style="display:flex;align-items:center;gap:5px;padding:6px 0;font-size:9px;color:rgba(110,231,183,0.8)">
      <span style="width:7px;height:7px;border-radius:50%;background:#34d399;flex-shrink:0"></span>${this._t('traAllDirectPlay')}
    </div>`;

    const badge = totalTr > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(248,113,113,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${totalTr}×</span>`
      : '';

    return `<div class="tl-card u-sec-body" data-tra-open="devices">
      <div class="u-bg-icon">
        <svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <div style="display:flex;align-items:center;margin-bottom:6px;position:relative;z-index:2;gap:6px">
        <span class="u-media-badge-s">${this._t('traTopTranscode')}</span>
        <div style="flex:1"></div>
        ${badge}
      </div>
      <div class="u-flex-rel">${rows || empty}</div>
    </div>`;
  }

  _traUsersCard(d) {
    const seen = new Set();
    const users = (d.users || []).filter(u => { const k = u.id || u.username; return k && !seen.has(k) && seen.add(k); }).slice(0, 5);
    const flagged = users.filter(u => u.trustScore < 70 || u.totalViolations > 0).length;
    const rows = users.map((u, i) => {
      const rawName = String(u.displayName || u.username || '—');
      const name  = this._escHtml(rawName);
      const score = u.trustScore == null ? 100 : (Number(u.trustScore) || 0);
      const color = score >= 80 ? 'rgba(110,231,183,0.9)' : score >= 50 ? 'rgba(252,211,77,0.9)' : 'rgba(252,165,165,0.9)';
      const avSrc = this._imgSrc(u.thumbUrl || u.avatarUrl);
      const av    = avSrc
        ? `<img src="${avSrc}" style="width:15px;height:15px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.15)" loading="lazy" onerror="this.style.display='none'">`
        : `<span style="width:15px;height:15px;border-radius:50%;background:rgba(255,255,255,0.12);display:inline-flex;align-items:center;justify-content:center;font-size:6px;font-weight:800;color:rgba(255,255,255,0.6);flex-shrink:0">${this._escHtml(rawName.slice(0, 2).toUpperCase())}</span>`;
      const sep = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      return `<div style="${sep}display:flex;align-items:center;gap:6px;padding:4px 0">
        ${av}
        <span style="font-size:10px;font-weight:600;color:#fff;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</span>
        <span style="font-size:10px;font-weight:700;color:${color};flex-shrink:0">${score}</span>
      </div>`;
    }).join('') || `<div class="u-xxs-dim">${this._t('tlNoData')}</div>`;

    const flagTag = flagged > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(248,113,113,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${this._t('traFlagged').replace('{n}', flagged)}</span>`
      : `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(52,211,153,0.16);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${this._t('traAllClear')}</span>`;

    return `<div class="tl-card u-sec-body" data-tra-open="users">
      <div class="u-bg-icon">
        <svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <div class="u-row-sb">
        <span class="u-media-badge">${this._t('tlUsers')}</span>
        ${flagTag}
      </div>
      <div class="u-flex-rel">${rows}</div>
    </div>`;
  }

  _traViolationsCard(d) {
    const viols = (d.violations || []).slice(0, 3);
    const total = Number(d.violationTotal) || 0;
    const typeLabel = {
      impossible_travel:     this._t('traVtImpossible'),
      simultaneous_locations:'Souběžné lokace',
      concurrent_streams:    this._t('traVtConcurrent'),
      device_velocity:       this._t('traVtVelocity'),
    };
    const severityColor = { high: 'rgba(252,165,165,0.9)', medium: 'rgba(252,211,77,0.9)', low: 'rgba(110,231,183,0.9)' };
    const dotColor     = { high: '#f87171', medium: '#fbbf24', low: '#34d399' };

    const items = viols.map((v, i) => {
      const label = this._escHtml(typeLabel[v.type] || v.type || '—');
      const user  = this._escHtml(v.user?.displayName || v.username || '');
      const sep   = i > 0 ? 'border-top:1px solid rgba(255,255,255,0.06);' : '';
      const dot   = dotColor[v.severity] || dotColor.high;
      return `<div style="${sep}padding:4px 0">
        <div class="u-row-5">
          <span style="width:7px;height:7px;border-radius:50%;background:${dot};box-shadow:0 0 6px ${dot};flex-shrink:0"></span>
          <span style="font-size:10px;font-weight:600;color:#fff;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</span>
        </div>
        ${user ? `<div style="font-size:9px;color:rgba(255,255,255,0.38);padding-left:12px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user}</div>` : ''}
      </div>`;
    }).join('') || `<div style="font-size:9px;color:rgba(110,231,183,0.7);padding:8px 0;display:flex;align-items:center;gap:5px">
        <span style="width:7px;height:7px;border-radius:50%;background:#34d399;flex-shrink:0"></span>${this._t('traNoViolations')}
      </div>`;

    const badge = total > 0
      ? `<span style="font-size:10px;font-weight:700;color:#fff;background:rgba(248,113,113,0.18);border-radius:20px;padding:1px 7px;white-space:nowrap;flex-shrink:0">${total} ${this._t('traNew')}</span>`
      : '';

    return `<div class="tl-card u-sec-body" data-tra-open="violations">
      <div class="u-bg-icon">
        <svg viewBox="0 0 24 24" width="130" height="130" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <div class="u-row-sb">
        <span class="u-media-badge">${this._t('traViolations')}</span>
        ${badge}
      </div>
      <div class="u-flex-rel">${items}</div>
    </div>`;
  }

  _wireTracearrPosters(right) {
    // Bound to the column itself, which outlives every repaint - once is enough,
    // and a second listener per paint made one click open the modal many times.
    if (!right || right._traWired) return;
    right._traWired = true;
    right.addEventListener('click', e => {
      const card = e.target.closest('[data-tra-open]');
      if (!card) return;
      this._openTracearrModal(card.dataset.traOpen);
    });
  }

}

export const tracearrTilesMixin = _TracearrTilesMethods.prototype;
