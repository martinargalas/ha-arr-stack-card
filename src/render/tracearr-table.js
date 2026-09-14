// ──────────────────────────────────────────────────────────────────────────
// Tracearr — tab body renderers
// overview / users / violations / history / activity
// ──────────────────────────────────────────────────────────────────────────

import { MT_BTN, _ICO_CHECK } from './maintainerr.js';
import { BP, maxWidth } from '../shared/ui.js';

// Severity reads the same wherever it appears.
export const _sevTone = sev => ({ critical: 'red', high: 'red', warning: 'amber', medium: 'amber', low: 'green' }[String(sev||'').toLowerCase()] || 'amber');

// Every in-card switch in Tracearr — period, media type, codec, sub-view — is
// one choice out of a handful, so they all wear the header-menu group: a single
// fill the wire layer measures onto the active button. Buttons keep their own
// widths, which a fixed-step peanut could not allow.
export function _traSegHtml(items, cur, attr, extra = '') {
  return `<span class="mt-nav mt-nav--inline"${extra ? ` style="${extra}"` : ''}><span class="mt-nav-ind"></span>${
    items.map(([v, l]) => `<button class="mt-nav-btn${String(v) === String(cur) ? ' is-on' : ''}" ${attr}="${v}">${l}</button>`).join('')
  }</span>`;
}

export const _traSortTh = (col, label, sortCol, sortDir) =>
  `<th style="cursor:pointer;user-select:none" data-tra-users-sort="${col}">` +
  `<span style="white-space:nowrap">${label} <span style="opacity:${col===sortCol?1:0.3};font-size:9px">${col===sortCol?(sortDir==='asc'?'↑':'↓'):'↕'}</span></span></th>`;

class _TraceaRrTableMethods {

  // ──────────────────────────────────────────────────────────────────────────
  // Overview tab
  // ──────────────────────────────────────────────────────────────────────────

  _traBodyOverview() {
    const m    = this._tracearrModal;
    const st   = m.overviewStats  || {};
    const hlth = m.overviewHealth || {};
    const viols = m.overviewViols || [];
    const act   = m.overviewAct   || {};
    const plays7 = (act.plays || []).slice(-7);
    const total7 = plays7.reduce((s, p) => s + (p.count || 0), 0);
    const isMob  = this._isMob;

    const tile = (lbl, val, sub, color) =>
      `<div style="background:var(--is-row-hover);border-radius:10px;padding:${isMob?'10px 11px':'12px 13px'}">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--is-text-label);margin-bottom:6px">${lbl}</div>
        <div style="font-size:${isMob?'20px':'24px'};font-weight:800;line-height:1;color:${color}">${val}</div>
        ${sub ? `<div style="font-size:10px;color:var(--is-text-muted);margin-top:4px">${sub}</div>` : ''}
      </div>`;

    const tiles = `<div style="display:grid;grid-template-columns:repeat(${isMob?2:4},1fr);gap:${isMob?'8px':'10px'};margin-bottom:${isMob?'14px':'16px'}">
      ${tile(this._t('traStreamsNow'), st.activeStreams ?? 0, null, '#34C759')}
      ${tile(this._t('traUsers'), st.totalUsers ?? 0, st.totalSessions ? st.totalSessions + ' ' + this._t('tlPlays') : null, '#BF5AF2')}
      ${tile(this._t('traViolations'), st.recentViolations ?? 0, this._t('traThisMonth'), st.recentViolations > 0 ? '#FF3B30' : '#34C759')}
      ${tile(this._t('traActivity7d'), total7, null, '#007AFF')}
    </div>`;

    const srvs = (hlth.servers || []).map(s => {
      const ic = { plex:{bg:'#e5a00d',c:'#000',l:'P'}, jellyfin:{bg:'#7c4dff',c:'#fff',l:'J'}, emby:{bg:'#52b54b',c:'#fff',l:'E'} }[s.type] || {bg:'rgba(255,255,255,0.15)',c:'#fff',l:'?'};
      const dot = s.online ? '#34d399' : '#f87171';
      const streams = s.activeStreams > 0 ? this._uiBadge(`${s.activeStreams} live`, 'green') : '';
      return `<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-top:1px solid var(--is-divider)">
        <span style="width:22px;height:22px;border-radius:6px;background:${ic.bg};color:${ic.c};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0">${ic.l}</span>
        <span style="font-size:13px;font-weight:600;color:var(--is-text);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</span>
        ${streams}
        <span style="width:8px;height:8px;border-radius:50%;background:${dot};box-shadow:0 0 7px ${dot};flex-shrink:0"></span>
      </div>`;
    }).join('');

    const vioRows = viols.slice(0, 5).map(v => {
      const color = this._traSevColor(v.severity);
      const bg    = this._traSevBg(v.severity);
      const type  = this._traViolTypeLabel(v.type);
      const user  = v.user?.displayName || v.username || '';
      const when  = this._traFmtDate(v.createdAt || v.detectedAt);
      return `<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--is-divider)">
        ${this._uiBadge((v.severity||'').toUpperCase(), _sevTone(v.severity), { extra: 'flex-shrink:0;margin-top:1px' })}
        <div style="flex:1;min-width:0">
          <div class="u-sm-text">${type}</div>
          <div style="font-size:10px;color:var(--is-text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${[user,when].filter(Boolean).join(' · ')}</div>
        </div>
      </div>`;
    }).join('') || `<div style="font-size:12px;color:#34C759;padding:12px 0;display:flex;align-items:center;gap:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:#34d399;flex-shrink:0"></span>${this._t('traNoViolations')}
      </div>`;

    const sectionLabel = lbl => `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--is-text-label);margin-bottom:2px">${lbl}</div>`;
    const srvBlock  = `<div style="background:var(--is-row-hover);border-radius:10px;padding:${isMob?'12px 14px':'14px 16px'}">${sectionLabel(this._t('traServers'))}${srvs || `<div style="font-size:12px;color:var(--is-text-muted);padding:8px 0">${this._t('tlNoData')}</div>`}</div>`;
    const vioBlock  = `<div style="background:var(--is-row-hover);border-radius:10px;padding:${isMob?'12px 14px':'14px 16px'}">${sectionLabel(this._t('traRecentViolations'))}${vioRows}</div>`;

    const cols = isMob
      ? `<div style="display:flex;flex-direction:column;gap:10px">${srvBlock}${vioBlock}</div>`
      : `<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:14px">${srvBlock}${vioBlock}</div>`;

    return tiles + cols;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Users tab
  // ──────────────────────────────────────────────────────────────────────────

  _traBodyUsers() {
    const m      = this._tracearrModal;
    const seen   = new Set();
    const deduped = (m.usersData || []).filter(u => { const k = u.id || u.username; return k && !seen.has(k) && seen.add(k); });
    // Search is client-side (matches Tracearr's own web UI — it doesn't hit the network
    // either) since the full user list is fetched once and searched/paginated locally.
    const search = (m.usersSearch || '').toLowerCase().trim();
    const filtered = search
      ? deduped.filter(u => (u.displayName || '').toLowerCase().includes(search) || (u.username || '').toLowerCase().includes(search))
      : deduped;
    const isMob  = this._isMob;
    const pp     = this._tlCalcPerPage();
    const total  = filtered.length;
    const pages  = Math.max(1, Math.ceil(total / pp));
    const page   = Math.min(m.usersPage || 0, pages - 1);
    const users  = filtered.slice(page * pp, (page + 1) * pp);

    const toolbar = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">${
      this._uiBar('tra-users-search', m.usersSearch || '', [], [])}</div>`;

    if (isMob) {
      const cards = users.map(u => {
        const score = u.trustScore ?? 100;
        const c     = this._traTrustColor(score);
        const bg    = this._traTrustBg(score);
        const badge = u.totalViolations > 0
          ? this._uiBadge(`${u.totalViolations} viol.`, 'red')
          : this._uiBadge('OK', 'green');
        const meta = [u.serverName, `${u.sessionCount ?? 0} ${this._t('tlPlays')}`].filter(Boolean).join(' · ');
        return `<div class="tl-mob-card u-row-10">
          ${this._traUserAvatar(u, 32)}
          <div style="flex:1;min-width:0">
            <div class="tl-mob-name">${u.displayName || u.username}</div>
            <div class="tl-mob-meta"><span>${meta}</span></div>
          </div>
          ${badge}
          <span style="font-size:14px;font-weight:800;color:${c};background:${bg};border-radius:8px;padding:3px 8px;flex-shrink:0">${score}</span>
        </div>`;
      }).join('') || `<div class="tl-mob-card" style="text-align:center;color:var(--is-text-muted)">${this._t('tlNoData')}</div>`;
      return toolbar + `<div class="tra-users-results-wrap" style="display:contents"><div>${cards}</div>${this._uiPager('tra-users-page', page, pages)}</div>`;
    }

    const rows = users.map(u => {
      const score  = u.trustScore ?? 100;
      const c      = this._traTrustColor(score);
      const pct    = score + '%';
      // Zero was plain text while any other count was a badge — same column,
      // same meaning, so both are badges now.
      const vBadge = u.totalViolations > 0
        ? this._uiBadge(String(u.totalViolations), 'red')
        : this._uiBadge('0', 'neutral');
      const srvBg = { plex:'#e5a00d', jellyfin:'#7c4dff', emby:'#52b54b' }[u.serverType] || 'rgba(255,255,255,0.15)';
      const srvC  = u.serverType === 'plex' ? '#000' : '#fff';
      const srvL  = { plex:'P', jellyfin:'J', emby:'E' }[u.serverType] || '?';
      return `<tr${u.totalViolations > 0 ? ' class="tl-row-warn"' : ''}>
        <td><div class="u-row-8">${this._traUserAvatar(u,22)}<strong class="u-sm-text">${u.displayName || u.username}</strong></div></td>
        <td><span style="width:18px;height:18px;border-radius:5px;background:${srvBg};color:${srvC};display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;vertical-align:middle;margin-right:5px">${srvL}</span><span style="font-size:11px;color:var(--is-text)">${u.serverName||'—'}</span></td>
        <td>
          <div class="u-row-6">
            <div style="width:52px;height:5px;border-radius:4px;background:rgba(255,255,255,0.1);overflow:hidden;flex-shrink:0"><div style="height:100%;border-radius:4px;background:${c.replace('0.9','0.7')};width:${pct}"></div></div>
            <span style="font-size:11px;font-weight:700;color:${c}">${score}</span>
          </div>
        </td>
        <td style="font-size:11px;color:var(--is-text)">${u.sessionCount ?? 0}</td>
        <td>${vBadge}</td>
        <td style="font-size:11px;color:var(--is-text-muted);white-space:nowrap">${u.lastActivityAt ? this._traFmtDate(u.lastActivityAt) : '—'}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--is-text-muted);padding:20px">${this._t('tlNoData')}</td></tr>`;

    return toolbar + `<div class="tra-users-results-wrap" style="display:contents"><div style="overflow-x:auto">
      <table class="tl-users-table">
        <thead><tr>
          ${_traSortTh('displayName', this._t('traUser'),       m.usersSortCol, m.usersSortDir)}
          <th>${this._t('traServer')}</th>
          ${_traSortTh('trustScore',  this._t('traTrust'),                  m.usersSortCol, m.usersSortDir)}
          ${_traSortTh('sessionCount', this._t('tlPlays'),      m.usersSortCol, m.usersSortDir)}
          ${_traSortTh('totalViolations', this._t('traViolations'),         m.usersSortCol, m.usersSortDir)}
          <th>${this._t('traNaposledy')}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>${this._uiPager('tra-users-page', page, pages)}</div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Stats → Users tab
  // ──────────────────────────────────────────────────────────────────────────

  _traBodyStatsUsers() {
    const m     = this._tracearrModal;
    if (!m) return '';
    const isMob    = this._isMob;
    const isTablet = !isMob && maxWidth(BP.TABLET);
    const users = m.statsUsersData || [];
    const period = m.statsUsersPeriod || 'month';

    const _pLbl = isMob
      ? { week:'W', month:'M', year:'Y', all:this._t('tabAll') }
      : { week:this._t('mtWeek'), month:this._t('mtMonth'), year:this._t('actColYear'), all:this._t('tabAll') };
    const periodBtns = _traSegHtml(Object.entries(_pLbl), period, 'data-tra-su-period');
    const hdr = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${isMob?10:12}px">
      <div class="u-row-6">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--is-text-muted)"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>
        <span style="font-size:${isMob?11:13}px;font-weight:700;color:var(--is-text)">${this._t('traTop3')}</span>
      </div>
      ${periodBtns}
    </div>`;

    if (!users.length) return hdr + `<div style="text-align:center;color:var(--is-text-muted);font-size:13px;padding:40px">${this._t('tlNoData')}</div>`;

    const _fmtHr = h => {
      if (h == null) return null;
      const n = Number(h);
      if (isNaN(n)) return null;
      // h might be in minutes or hours — if very large treat as minutes
      const hrs = n > 1000 ? n / 60 : n;
      return hrs >= 1 ? `${hrs.toFixed(1)}h` : `${Math.round(hrs * 60)}m`;
    };
    // podium display order: silver(1) left, gold(0) center bigger, bronze(2) right
    const podiumOrder = [users[1], users[0], users[2]].filter(Boolean);
    const medals      = ['🥈','🥇','🥉'];
    const borders     = ['#C0C0C0','#FFD700','#CD7F32'];
    const playsColors = ['rgba(200,200,200,0.9)','#34C759','#CD7F32'];
    // index 1 in display order = gold
    const isGold = [false, true, false];

    const _mkCard = (u, di) => {
      const gold   = isGold[di];
      const name   = u.identityName || u.displayName || u.username || '?';
      const av     = u.thumbUrl || u.avatarUrl || u.avatar || null;
      const plays  = u.playCount ?? u.plays ?? u.totalPlays ?? u.sessions ?? 0;
      const hrs    = _fmtHr(u.watchTimeHours ?? u.totalDuration ?? u.watchTime ?? u.totalHours ?? null);
      const trust  = u.trustScore ?? u.trust ?? null;
      const loves  = u.topContent || u.favoriteTitle || u.favoriteSeries || u.favoriteMedia || null;
      const border = borders[di];
      const avSz   = gold ? (isMob ? 72 : isTablet ? 84 : 96) : (isMob ? 52 : isTablet ? 60 : 68);
      const pad    = gold ? (isMob ? '20px 8px 14px' : isTablet ? '20px 10px 14px' : '24px 14px 16px') : (isMob ? '12px 6px' : isTablet ? '12px 8px' : '16px 10px');
      const nameSz = gold ? (isMob ? 12 : 14) : (isMob ? 11 : 12);
      const avFb   = `<div style="width:${avSz}px;height:${avSz}px;border-radius:50%;background:rgba(255,255,255,0.1);border:2px solid ${border};display:flex;align-items:center;justify-content:center;font-size:${Math.round(avSz*0.3)}px;font-weight:800;color:rgba(255,255,255,0.6)">${name.slice(0,2).toUpperCase()}</div>`;
      const avEl   = av
        ? `<img src="${av}" width="${avSz}" height="${avSz}" style="border-radius:50%;object-fit:cover;border:2px solid ${border};flex-shrink:0" loading="lazy" onerror="this.style.display='none'">`
        : avFb;
      const trustBadge = trust != null
        ? `<div style="display:inline-flex;align-items:center;gap:4px;background:rgba(52,199,89,0.18);border-radius:20px;padding:3px 8px;margin-top:4px">
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#34C759" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span style="font-size:${isMob?9:10}px;font-weight:700;color:#34C759">${this._t('traTrustPct').replace('{n}', Math.round(trust))}</span>
          </div>`
        : '';
      const lovesEl = loves
        ? `<div style="font-size:${isMob?8:9}px;color:var(--is-text-muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${this._t('traLoves').replace('{n}', loves)}</div>`
        : '';
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:${pad};background:var(--is-row-hover);border-radius:12px;flex:1;box-sizing:border-box;text-align:center;min-width:0">
        <div style="font-size:${gold?(isMob?22:26):(isMob?16:20)}px;line-height:1">${medals[di]}</div>
        ${avEl}
        <div style="font-size:${nameSz}px;font-weight:700;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%">${name}</div>
        <div style="font-size:${isMob?10:11}px;color:var(--is-text-muted);display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
          <span style="font-weight:700;color:${playsColors[di]}">${this._t('traNPlays').replace('{n}', plays)}</span>
          ${hrs ? `<span>${hrs}</span>` : ''}
        </div>
        ${trustBadge}
        ${lovesEl}
      </div>`;
    };

    const podiumHtml = podiumOrder.map((u, di) => _mkCard(u, di)).join('');
    const podiumRow  = `<div style="display:flex;align-items:center;gap:${isMob?'6px':'10px'};justify-content:center">${podiumHtml}</div>`;

    const runnersUp = users.slice(3);
    const ruPage    = m.statsUsersRunnerPage || 0;
    const ruRowH    = isMob ? 52 : 56;
    const ruPP      = this._tlCalcPerPage({ hasFilter: false, filterH: 0, rowH: ruRowH, bar: 0 });
    const ruPages   = runnersUp.length ? Math.max(1, Math.ceil(runnersUp.length / ruPP)) : 1;
    const ruSlice   = runnersUp.slice(ruPage * ruPP, (ruPage + 1) * ruPP);
    const runnersHtml = runnersUp.length ? (() => {
      const rows = ruSlice.map((u, i) => {
        const pos    = ruPage * ruPP + i + 4;
        const name   = u.identityName || u.displayName || u.username || '?';
        const av     = u.thumbUrl || u.avatarUrl || u.avatar || null;
        const plays  = u.playCount ?? u.plays ?? u.totalPlays ?? u.sessions ?? 0;
        const hrs    = _fmtHr(u.watchTimeHours ?? u.totalDuration ?? u.watchTime ?? u.totalHours ?? null);
        const trust  = u.trustScore ?? u.trust ?? null;
        const loves  = u.topContent || u.favoriteTitle || u.favoriteSeries || u.favoriteMedia || null;
        const avSz   = isMob ? 32 : 38;
        const avEl   = `<div style="position:relative;width:${avSz}px;height:${avSz}px;flex-shrink:0">
          <div style="width:${avSz}px;height:${avSz}px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:${Math.round(avSz*0.32)}px;font-weight:800;color:rgba(255,255,255,0.6)">${name.slice(0,2).toUpperCase()}</div>
          ${av ? `<img src="${av}" width="${avSz}" height="${avSz}" style="border-radius:50%;object-fit:cover;position:absolute;inset:0" loading="lazy" onerror="this.style.display='none'">` : ''}
        </div>`;
        const trustEl = trust != null
          ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:${isMob?9:10}px;color:#34C759"><svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="#34C759" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>${Math.round(trust)}%</span>`
          : '';
        const statsEl = [
          `<span style="font-size:${isMob?10:11}px;font-weight:700;color:var(--is-text)">${this._t('traNPlays').replace('{n}', plays)}</span>`,
          hrs ? `<span style="font-size:${isMob?10:11}px;color:var(--is-text-muted)">${hrs}</span>` : '',
          trustEl,
        ].filter(Boolean).join(`<span style="color:var(--is-divider);margin:0 3px">·</span>`);
        const lovesEl = loves
          ? `<div style="font-size:${isMob?9:10}px;color:var(--is-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._t('traLoves').replace('{n}', loves)}</div>`
          : '';
        return `<div style="display:flex;align-items:center;gap:${isMob?'8px':'12px'};padding:${isMob?'6px 0':'8px 0'};border-bottom:1px solid var(--is-divider)">
          <span style="font-size:${isMob?11:13}px;font-weight:700;color:var(--is-text-muted);min-width:${isMob?20:24}px;text-align:center">#${pos}</span>
          ${avEl}
          <div style="flex:1;min-width:0">
            <div style="font-size:${isMob?11:13}px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
            ${lovesEl}
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">${statsEl}</div>
        </div>`;
      }).join('');
      const runnerTitle = `<div style="display:flex;align-items:center;gap:6px;margin:${isMob?'14px 0 8px':'18px 0 10px'}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--is-text-muted)"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span style="font-size:${isMob?11:13}px;font-weight:700;color:var(--is-text)">${this._t('traRunnersUp')}</span>
      </div>`;
      const ruPag = ruPages > 1 ? this._uiPager('tra-su-ru-page', ruPage, ruPages, true) : '';
      return runnerTitle + `<div>${rows}</div>` + ruPag;
    })() : '';

    const content = podiumRow + runnersHtml;
    return hdr + (isMob
      ? content
      : `<div style="overflow-y:auto;flex:1;min-height:0">${content}</div>`);
  }
}

export const tracearrTableMixin = _TraceaRrTableMethods.prototype;
