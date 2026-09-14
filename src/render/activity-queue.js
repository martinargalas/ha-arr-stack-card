import { ICONS, dayClass, isMobile } from '../shared/ui.js';
import { fmtBytes } from '../shared/format.js';

// Activity, the Queue tab and the manual import dialog. Split out of render/activity.js.

class _ActivityQueueRenderMethods {

  // ── Queue tab ────────────────────────────────────────────────────────────

  _actQueueTabHtml(radarrRecords, sonarrRecords, page, perPage, cols) {
    const isMobile = this._isMob;
    const _epNum = ep => ep ? ` S${String(ep.seasonNumber).padStart(2,'0')}E${String(ep.episodeNumber).padStart(2,'0')}` : '';
    const all = [
      ...(radarrRecords || []).map(r => ({
        ...r,
        _svc: r._svc || 'radarr',
        _title: r._enrichedTitle || r.movie?.title || r.title || '—',
        _episodeTitle: '',
      })),
      ...(sonarrRecords || []).map(r => {
        const seriesTitle = r._enrichedTitle || r.series?.title || r.title || '—';
        return {
          ...r,
          _svc: r._svc || 'sonarr',
          _title: seriesTitle + _epNum(r.episode),
          _episodeTitle: r.episode?.title || '',
        };
      }),
    ];
    const m = this._activityModal || {};
    // Client-side filters
    const fSvc    = m.queueFilterSvc      || 'all';
    const fSts    = m.queueFilterSts      || 'all';
    const fQual   = m.queueFilterQuality  || 'all';
    const fProto  = m.queueFilterProtocol || 'all';
    const fIdx    = m.queueFilterIndexer  || 'all';
    const fCli    = m.queueFilterClient   || 'all';
    const qSearch = (m.queueSearch || '').toLowerCase().trim();
    const filtered = all.filter(item => {
      if (qSearch && !item._title.toLowerCase().includes(qSearch)) return false;
      if (fSvc   !== 'all' && item._svc !== fSvc) return false;
      if (fSts === 'failed')      { const isBadF = item.trackedDownloadStatus === 'warning' || item.trackedDownloadStatus === 'error' || item.trackedDownloadState === 'importFailed' || item.status === 'failed'; if (!isBadF) return false; }
      if (fSts === 'downloading') { const isBadF = item.trackedDownloadStatus === 'warning' || item.trackedDownloadStatus === 'error' || item.trackedDownloadState === 'importFailed' || item.status === 'failed'; if (isBadF)  return false; }
      if (fQual  !== 'all' && (item.quality?.quality?.name || '') !== fQual) return false;
      if (fProto !== 'all' && (item.protocol || '').toLowerCase() !== fProto) return false;
      if (fIdx   !== 'all' && (item.indexer  || '') !== fIdx) return false;
      if (fCli   !== 'all' && (item.downloadClient || '') !== fCli) return false;
      return true;
    });

    if (!all.length) {
      return `<div style="text-align:center;color:var(--is-text-muted);padding:40px 20px">${this._t('actQueueEmpty')}</div>`;
    }
    const pp       = perPage || 15;
    const pg       = Math.min(page || 0, Math.max(0, Math.ceil(filtered.length / pp) - 1));
    const paged    = filtered.slice(pg * pp, (pg + 1) * pp);
    const totPages = Math.max(1, Math.ceil(filtered.length / pp));
    const pagHtml  = totPages > 1 ? this._uiPager('act-queue-page', pg, totPages) : '';
    const PAG      = `<div style="flex-shrink:0;padding-top:8px">${pagHtml}</div>`;

    // A file dropping into a tray. The old glyph was the user icon, which said
    // nothing about importing.
    const importSvg  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v10"/><polyline points="8 9 12 13 16 9"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>`;
    const trashSvg   = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
    const dlDoneSvg  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
    const srcFilmSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/></svg>`;
    const srcTvSvg   = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="15" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`;
    // Column definitions for desktop
    const ALL_QUEUE_COLS = [
      { id: 'source',   label: this._t('actColSource') },
      { id: 'quality',  label: this._t('actColQuality') },
      { id: 'size',     label: this._t('actColSize') },
      { id: 'timeleft', label: this._t('actColTimeLeft') },
      { id: 'formats',  label: this._t('actColFormats') },
      { id: 'protocol', label: this._t('actColProtocol') },
      { id: 'indexer',  label: this._t('actColIndexer') },
      { id: 'client',   label: this._t('actColClient') },
      { id: 'status',   label: this._t('actColStatus') },
    ];
    const C = cols instanceof Set ? cols : new Set(['source', 'quality', 'size', 'formats', 'status']);
    const visCols = ALL_QUEUE_COLS.filter(c => C.has(c.id));

    const uniq     = (arr, fn) => [...new Set(arr.map(fn).filter(Boolean))].sort();
    // Every picker is now [value, label] pairs — the bar builds its own trigger
    // and drops the ones with a single option.
    const mkItems  = (ph, opts) => [['all', ph], ...opts.map(o => [o, o])];
    const qSels = [
      C.has('source')   && { id: 'act-queue-svc',     kind: 'source',     value: fSvc,   items: [['all', this._t('actAllSources')], ['radarr', this._instLabel('radarr')], ['sonarr', this._instLabel('sonarr')], ...(this._lidarrConfigured !== false ? [['lidarr', 'Lidarr']] : [])] },
      C.has('status')   && { id: 'act-queue-sts',     kind: 'status',     value: fSts,   items: [['all', this._t('actAllStatus')], ['downloading', this._t('actDownloading')], ['failed', this._t('actEvtFailed')]] },
      C.has('quality')  && { id: 'act-queue-quality',kind: 'quality', value: fQual,  items: mkItems(this._t('actAllQualities'), uniq(all, r=>r.quality?.quality?.name)) },
      C.has('protocol') && { id: 'act-queue-proto',   kind: 'protocol',   value: fProto, items: mkItems(this._t('actAllProtocols'), ['torrent','usenet']) },
      C.has('indexer')  && { id: 'act-queue-indexer',kind: 'indexer', value: fIdx,   items: mkItems(this._t('actAllIndexers'), uniq(all, r=>r.indexer)) },
      C.has('client')   && { id: 'act-queue-client',  kind: 'client',  value: fCli,   items: mkItems(this._t('actAllClients'), uniq(all, r=>r.downloadClient)) },
    ].filter(Boolean);
    const qToolbar = this._actBar('act-queue-search', m.queueSearch || '', qSels, 'act-queue-cols-btn');

    const rows = paged.map(item => {
      const isBad    = item.trackedDownloadStatus === 'warning' || item.trackedDownloadStatus === 'error' || item.trackedDownloadState === 'importFailed' || item.status === 'failed';
      const pct      = item.size > 0 ? Math.round(((item.size - (item.sizeleft || 0)) / item.size) * 100) : 0;
      const stCol    = isBad ? 'rgba(250,160,40,0.9)' : 'var(--is-text-muted)';
      const _sm      = item.statusMessages;
      const _smLines = isBad && item._miRejection ? [item._miRejection]
                     : (_sm?.length ? _sm.flatMap(s => s.messages?.length ? s.messages : (s.title ? [s.title] : [])).filter(Boolean) : []);
      const stLbl    = isBad ? (_smLines[0] || item.trackedDownloadState || item.trackedDownloadStatus || 'Error') : `${pct}%`;
      const svcCol   = this._actSrcColor(item._svc);
      const svcLbl   = this._instLabel(item._svc);
      const sizLbl   = item.size ? fmtBytes(item.size) : '—';
      const qualLbl  = item.quality?.quality?.name || '—';
      const timeLbl  = item.timeleft || '—';
      const protLbl  = item.protocol || '—';
      const idxLbl   = item.indexer || '—';
      const cliLbl   = item.downloadClient || '—';
      const pb = `<div style="width:100%;height:3px;background:var(--is-divider);border-radius:2px;overflow:hidden;margin-top:3px"><div style="width:${isBad ? 100 : pct}%;height:100%;background:rgba(99,140,255,0.65);border-radius:2px"></div></div>`;
      const removeBtn = this._mtRoundBtn(
        `class="act-remove-btn" data-id="${item.id}" data-svc="${item._svc}" data-title="${this._escHtml(item._title)}"`,
        trashSvg, 'Remove from queue', { size: 24, tone: 'red' });
      const canImport = isBad && item.downloadId;
      // The *arr import command is asynchronous and the row keeps sitting there
      // until it lands, so the row says it is working rather than looking
      // untouched for the ten seconds that takes.
      const importing = item.downloadId && this._actImporting?.has(item.downloadId);
      // No style attribute in the attrs string: _mtRoundBtn adds its own, and a
      // second one would be ignored — which is what flattened this button.
      const importBtn = importing
        ? `<span title="${this._escHtml(this._t('actImporting'))}" style="margin-right:4px;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><span class="is-spin"></span></span>`
        : canImport
        ? `<span style="margin-right:4px;display:inline-flex">${this._mtRoundBtn(
            `class="act-mi-btn" data-id="${item.id}" data-svc="${item._svc}" data-download-id="${item.downloadId}" data-movie-id="${item.movieId || ''}" data-series-id="${item.seriesId || ''}" data-episode-id="${item.episodeId || item.episode?.id || ''}" data-output-path="${this._escHtml(item.outputPath || '')}" data-title="${this._escHtml(item._title)}"`,
            importSvg, 'Manual Import', { size: 24, tone: 'blue' })}</span>`
        : '';

      // ── Mobile row (fixed layout, no col settings) ──
      const isFullyDl = item.size > 0 && (item.sizeleft === 0 || item.sizeleft === null);
      const dlIcon    = isFullyDl ? `<span style="color:rgba(250,160,40,0.85);display:flex;align-items:center;flex-shrink:0">${dlDoneSvg}</span>` : '';
      const addedLbl = item.added ? (() => { try { const dt = new Date(item.added); return dt.toLocaleDateString(this._locale, { month: 'short', day: 'numeric' }); } catch { return ''; } })() : '';
      const qExtraTags = isMobile ? visCols.filter(c => !['source','quality','size','status','formats'].includes(c.id)).map(col => {
        let v = '';
        if (col.id === 'timeleft') v = item.timeleft || '';
        if (col.id === 'protocol') v = item.protocol || '';
        if (col.id === 'indexer')  v = item.indexer  || '';
        if (col.id === 'client')   v = item.downloadClient || '';
        return v && v !== '—' ? `<span class="u-xxs-muted">${v}</span>` : '';
      }).filter(Boolean).join('') : '';
      if (isMobile) {
        const subLine    = isBad ? (_smLines[0] || item.trackedDownloadState || 'Error') : (item._episodeTitle ? this._escHtml(item._episodeTitle) : null);
        const subLineClr = isBad ? 'rgba(250,160,40,0.85)' : 'var(--is-text-muted)';
        return `<div style="padding:9px 0;border-bottom:1px solid var(--is-divider)">
          <div style="display:flex;align-items:flex-start;gap:6px">
            <div style="flex-shrink:0;width:16px;display:flex;justify-content:center;padding-top:2px">${dlIcon}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item._title}</div>
              <div style="font-size:10px;color:${subLineClr};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;visibility:${subLine ? 'visible' : 'hidden'}">${subLine || '&nbsp;'}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:3px">
                <span style="color:var(--is-text-muted);display:flex;align-items:center">${this._actSrcIcon(item._svc)}</span>
                <span class="u-xxs-muted">${qualLbl}</span>
                <span class="u-xxs-muted">${sizLbl}</span>
                ${qExtraTags}
              </div>
              ${pb}
            </div>
            <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:3px;min-width:52px">
              <span style="font-size:14px;font-weight:700;color:var(--is-text-muted)">${pct}%</span>
              ${addedLbl ? `<span class="u-xxs-muted">${addedLbl}</span>` : ''}
              <div style="display:flex;gap:4px;margin-top:2px">${importBtn}${removeBtn}</div>
            </div>
          </div>
        </div>`;
      }

      // ── Desktop row (dynamic columns) ──
      const colTds = visCols.map(col => {
        const tdBase = `style="padding:8px;white-space:nowrap;font-size:10px;"`;
        if (col.id === 'source')   return `<td ${tdBase} style="padding:8px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:7px"><span style="color:var(--is-text-sec);display:flex;align-items:center">${this._actSrcIcon(item._svc)}</span><span style="font-weight:600;color:var(--is-text-sec)">${svcLbl}</span></div></td>`;
        if (col.id === 'quality')  return `<td ${tdBase} style="padding:8px">${qualLbl ? this._uiBadge(qualLbl, 'neutral') : '<span class="u-xs-muted">\u2014</span>'}</td>`;
        if (col.id === 'size')     return `<td ${tdBase} style="padding:8px;font-size:10px;color:var(--is-text-sec)">${sizLbl}</td>`;
        if (col.id === 'timeleft') return `<td ${tdBase} style="padding:8px;font-size:10px;color:var(--is-text-sec)">${timeLbl}</td>`;
        if (col.id === 'formats')  { const fmts = (item.customFormats||[]).filter(cf=>cf.name); return `<td style="padding:8px;overflow:hidden">${fmts.length ? `<div class="act-fmt-tags" style="display:flex;flex-wrap:wrap;align-content:flex-start;gap:3px;max-height:44px;overflow:hidden">${fmts.map(cf=>`<span class="act-fmt-tag ui-badge" style="--bdg:150,150,165">${this._escHtml(cf.name)}</span>`).join('')}</div>` : `<span class="u-xs-muted">—</span>`}</td>`; }
        if (col.id === 'protocol') return `<td ${tdBase} style="padding:8px;font-size:10px;color:var(--is-text-sec)">${this._escHtml(protLbl)}</td>`;
        if (col.id === 'indexer')  return `<td ${tdBase} style="padding:8px;font-size:10px;color:var(--is-text-sec);max-width:120px;overflow:hidden;text-overflow:ellipsis">${this._escHtml(idxLbl)}</td>`;
        if (col.id === 'client')   return `<td ${tdBase} style="padding:8px;font-size:10px;color:var(--is-text-sec)">${this._escHtml(cliLbl)}</td>`;
        if (col.id === 'status')   { const stHtml = isBad && _smLines.length > 1 ? _smLines.map(l => `<div style="font-size:10px;color:${stCol};line-height:1.4">${this._escHtml(l)}</div>`).join('') : `<span style="font-size:10px;font-weight:${isBad?'400':'600'};color:${stCol}">${this._escHtml(stLbl)}</span>`; return `<td style="padding:8px;white-space:normal;min-width:80px;max-width:180px"><div style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden">${stHtml}</div></td>`; }
        return '';
      }).join('');

      // Keyed so "Jump to download" can find this row across pages
      return `<tr class="u-divider-b"${item.downloadId ? ` data-q-key="${this._escHtml(String(item.downloadId).toLowerCase())}"` : ''}>
        <td style="padding:8px 8px 8px 0;width:22px;text-align:center">${dlIcon}</td>
        <td style="padding:8px 8px 8px 0">
          <div style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;word-break:break-word">
            <span class="u-sm-text">${item._title}</span>${item._episodeTitle ? `<span style="font-size:10px;color:var(--is-text-muted);margin-left:7px">${this._escHtml(item._episodeTitle)}</span>` : ''}
          </div>
          ${pb}
        </td>
        ${colTds}
        <td style="padding:8px 0 8px 8px;text-align:right;white-space:nowrap">
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px">
            ${importBtn}${removeBtn}
          </div>
        </td>
      </tr>`;
    }).join('');

    // .act-queue-results-wrap (display:contents) lets the search debounce handler patch just
    // this subtree, leaving the toolbar's #act-queue-search input node untouched.
    if (isMobile) {
      return `<div class="u-col-fill">
        ${qToolbar}
        <div class="act-queue-results-wrap" style="display:contents">
          <div class="u-flex-ovh" data-act-clip>${rows}</div>
          ${PAG}
        </div>
      </div>`;
    }

    // Desktop: toolbar + dynamic table
    const COL_W   = { source:70, quality:75, size:65, timeleft:75, formats:130, protocol:65, indexer:110, client:100, status:95 };
    const thSt    = `padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left;white-space:nowrap`;
    return `<div class="u-col-fill">
      ${qToolbar}
      <div class="act-queue-results-wrap" style="display:contents">
        <div style="flex:1;overflow:hidden;overflow-x:auto" data-act-clip>
          <table style="width:100%;border-collapse:collapse;table-layout:fixed">
            <thead><tr class="u-divider-b">
              <th style="padding:4px 8px 8px 0;width:22px"></th>
              <th style="padding:4px 8px 8px 0;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left;width:300px">${this._t('actColTitle')}</th>
              ${visCols.map(c => `<th style="${thSt};width:${COL_W[c.id]||80}px">${c.label}</th>`).join('')}
              <th style="padding:4px 0 8px 8px;width:60px"></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${PAG}
      </div>
    </div>`;
  }

    // ── Manual Import modal ──────────────────────────────────────────────────

  _actManualImportModalHtml(title) {
    return `<div class="popup-overlay${dayClass(this)}" data-mi-modal style="z-index:1100">
      <div class="popup-glass" style="width:min(1100px,98vw);max-height:85vh;display:flex;flex-direction:column">
        <div class="is-panel-hdr" style="padding:14px 20px 12px;gap:10px">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700;color:var(--is-text)">${this._t('actManualImport')}</div>
            <div style="font-size:11px;color:var(--is-text-sec);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" id="mi-subtitle">${this._escHtml(title)}</div>
          </div>
          <button class="popup-close u-rel-shrink0" id="mi-close">${ICONS.close}</button>
        </div>
        <div id="mi-body" class="popup-body" style="padding:14px 20px 18px;overflow-y:auto;flex:1">
          <div class="is-loading"><span>${this._t('loading')}</span></div>
        </div>
      </div>
    </div>`;
  }

  _actManualImportCandidatesHtml(candidates, svc, qDefs, langs) {
    if (!candidates || !candidates.length) {
      return `<div style="text-align:center;color:var(--is-text-muted);padding:32px 20px">
        <div style="font-size:13px">${this._t('actNoFiles')}</div>
        <div style="font-size:11px;margin-top:6px;opacity:0.6">${this._t('actNoFilesHint')}</div>
      </div>`;
    }

    const isMobile = this._isMob;
    const isRadarr = svc === 'radarr' || svc === 'radarr2';
    const isSonarr = svc === 'sonarr' || svc === 'sonarr2';
    const isDay    = this._isDay;

    // Day/night compatible select style
    const SEL_STYle = (missing) =>
      `color-scheme:${isDay ? 'light' : 'dark'};appearance:none;-webkit-appearance:none;` +
      `padding:5px 24px 5px 8px;border-radius:6px;width:100%;box-sizing:border-box;` +
      `font-size:11px;font-weight:600;cursor:pointer;outline:none;` +
      `border:${missing ? '1px dashed rgba(248,113,113,0.8)' : '1px solid var(--is-divider)'};` +
      `background-color:${missing ? 'rgba(248,113,113,0.1)' : 'var(--is-btn-bg)'};` +
      `background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='rgba(128,128,128,0.7)' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");` +
      `background-repeat:no-repeat;background-position:right 6px center;` +
      `color:${missing ? 'rgba(248,113,113,0.95)' : 'var(--is-text)'};`;

    // Library options (movie/series) — use correct instance library
    const lib = svc === 'radarr'  ? (this._radarr  || [])
              : svc === 'radarr2' ? (this._radarr2 || [])
              : svc === 'sonarr'  ? (this._sonarr  || [])
              : svc === 'sonarr2' ? (this._sonarr2 || [])
              : [];
    const buildLibOpts = (curId) => lib
      .slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      .map(m => `<option value="${m.id}"${m.id == curId ? ' selected' : ''}>${this._escHtml(m.title || '—')}${m.year ? ` (${m.year})` : ''}</option>`)
      .join('');

    // Quality options
    const buildQualOpts = (curId) => (qDefs || [])
      .slice().sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .map(d => { const id = d.quality?.id ?? d.id; return `<option value="${id}"${id == curId ? ' selected' : ''}>${this._escHtml(d.quality?.name || d.title || '—')}</option>`; })
      .join('');

    // Language options
    const buildLangOpts = (curId) => (langs || [])
      .filter(l => l.id !== -1)
      .slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(l => `<option value="${l.id}"${l.id == curId ? ' selected' : ''}>${this._escHtml(l.name || '—')}</option>`)
      .join('');

    const allCanImport = candidates.every(c => {
      if (isRadarr && !c.movie) return false;
      if (isSonarr && !c.series) return false;
      // Quality must be set — Unknown triggers Radarr filename re-parse which fails on non-ASCII paths
      const qName = c.quality?.quality?.name;
      if (!qName || qName === 'Unknown') return false;
      // Language must be set too
      const langName = c.languages?.[0]?.name;
      if (!c.languages?.length || !langName || langName === 'Unknown') return false;
      return true;
    });
    const importBtn = `<button id="mi-import-all" data-ready="${allCanImport ? '1' : ''}" style="width:100%;margin-top:8px;padding:9px;border-radius:8px;border:none;background:${allCanImport ? 'rgba(60,200,120,0.18)' : 'var(--is-btn-bg)'};color:${allCanImport ? 'rgba(80,220,140,0.95)' : 'var(--is-text-muted)'};font-size:13px;font-weight:700;cursor:${allCanImport ? 'pointer' : 'not-allowed'};opacity:${allCanImport ? '1' : '0.5'}">${this._t('actImport')}</button>`;

    const mediaLabel = isRadarr ? this._t('typeMovie') : this._t('typeTv');
    const mediaField = isRadarr ? 'movie' : 'series';

    if (isMobile) {
      // ── Mobile: stacked cards ──────────────────────────────────────────────
      const rows = candidates.map((c, i) => {
        const fname      = (c.path || '').split(/[/\\]/).pop() || '—';
        const curMovieId = isRadarr ? (c.movie?.id ?? '') : (c.series?.id ?? '');
        const movieMiss  = isRadarr ? !c.movie : (isSonarr ? !c.series : false);
        const curQualId  = c.quality?.quality?.id ?? '';
        const qualName   = c.quality?.quality?.name;
        const curLangId  = c.languages?.[0]?.id ?? '';
        const rejLower   = (c.rejections || []).map(r => (r.reason || r || '').toLowerCase());
        const qualMiss   = rejLower.some(r => r.includes('quality')) || !qualName || qualName === 'Unknown';
        const langMiss   = rejLower.some(r => r.includes('language')) || !c.languages?.length || c.languages[0]?.name === 'Unknown';
        const rg         = c.releaseGroup || '—';
        const size       = c.size ? fmtBytes(c.size) : '—';
        const rej        = (c.rejections || []).map(r => r.reason || r).filter(Boolean);

        const lbl = (t) => `<div style="font-size:9px;font-weight:700;color:var(--is-text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px">${t}</div>`;
        const movieSel = `<select class="mi-field-sel" data-field="${mediaField}" data-idx="${i}" style="${SEL_STYle(movieMiss)}"><option value="" disabled hidden${curMovieId === '' ? ' selected' : ''}>${this._t('actSelectMedia')}</option>${buildLibOpts(curMovieId)}</select>`;
        const qualSel  = `<select class="mi-field-sel" data-field="quality" data-idx="${i}" style="${SEL_STYle(qualMiss)}"><option value="" disabled hidden${curQualId === '' || qualMiss ? ' selected' : ''}>${this._t('actSelectQuality')}</option>${buildQualOpts(curQualId)}</select>`;
        const langSel  = `<select class="mi-field-sel" data-field="language" data-idx="${i}" style="${SEL_STYle(langMiss)}"><option value="" disabled hidden${curLangId === '' || langMiss ? ' selected' : ''}>${this._t('actSelectLanguage')}</option>${buildLangOpts(curLangId)}</select>`;

        return `<div data-mi-idx="${i}" style="border:1px solid var(--is-divider);border-radius:8px;padding:10px 12px;margin-bottom:8px;background:var(--is-btn-bg)">
          <div style="display:flex;flex-direction:column;gap:8px">
            <div>${lbl(mediaLabel)}${movieSel}</div>
            <div>${lbl(this._t('actQuality'))}${qualSel}</div>
            <div>${lbl(this._t('actLanguages'))}${langSel}</div>
            <div>${lbl(this._t('actReleaseGroup'))}<div style="font-size:11px;color:var(--is-text-sec);padding:5px 0">${this._escHtml(rg)}</div></div>
            <div>${lbl(this._t('actSize'))}<div style="font-size:11px;color:var(--is-text-sec);padding:5px 0">${size}</div></div>
            ${rej.length ? `<div>${lbl(this._t('actError'))}<div style="font-size:10px;color:rgba(255,160,80,0.9)">${this._escHtml(rej[0])}</div></div>` : ''}
          </div>
        </div>`;
      }).join('');
      return `<div>${rows}${importBtn}</div>`;
    }

    // ── Desktop/tablet: table (no File col, no per-row Import btn) ───────────
    const thStyle = `padding:4px 8px 8px 0;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left;white-space:nowrap`;

    const rows = candidates.map((c, i) => {
      const curMovieId = isRadarr ? (c.movie?.id ?? '') : (c.series?.id ?? '');
      const movieMiss  = isRadarr ? !c.movie : (isSonarr ? !c.series : false);
      const curQualId  = c.quality?.quality?.id ?? '';
      const qualName   = c.quality?.quality?.name;
      const curLangId  = c.languages?.[0]?.id ?? '';
      const rejLower   = (c.rejections || []).map(r => (r.reason || r || '').toLowerCase());
      const qualMiss   = rejLower.some(r => r.includes('quality')) || !qualName || qualName === 'Unknown';
      const langMiss   = rejLower.some(r => r.includes('language')) || !c.languages?.length || c.languages[0]?.name === 'Unknown';
      const rg         = c.releaseGroup || '—';
      const size       = c.size ? fmtBytes(c.size) : '—';
      const rej        = (c.rejections || []).map(r => r.reason || r).filter(Boolean);

      const movieSel = `<select class="mi-field-sel" data-field="${mediaField}" data-idx="${i}" style="${SEL_STYle(movieMiss)}"><option value="" disabled hidden${curMovieId === '' ? ' selected' : ''}>${this._t('actSelectMedia')}</option>${buildLibOpts(curMovieId)}</select>`;
      const qualSel  = `<select class="mi-field-sel" data-field="quality" data-idx="${i}" style="${SEL_STYle(qualMiss)}"><option value="" disabled hidden${curQualId === '' || qualMiss ? ' selected' : ''}>${this._t('actSelectQuality')}</option>${buildQualOpts(curQualId)}</select>`;
      const langSel  = `<select class="mi-field-sel" data-field="language" data-idx="${i}" style="${SEL_STYle(langMiss)}"><option value="" disabled hidden${curLangId === '' || langMiss ? ' selected' : ''}>${this._t('actSelectLanguage')}</option>${buildLangOpts(curLangId)}</select>`;
      const rejHtml  = rej.length ? `<span style="font-size:10px;color:rgba(255,160,80,0.9)">${this._escHtml(rej[0])}</span>` : `<span style="color:var(--is-text-muted);font-size:10px">—</span>`;

      const epInfo = isSonarr && c.episodes?.length
        ? `${c.seasonNumber ?? '?'}x${String(c.episodes[0].episodeNumber ?? '?').padStart(2, '0')}`
        : '';
      const epTitle = isSonarr && c.episodes?.length ? (c.episodes[0].title || '') : '';

      return `<tr class="u-divider-b">
        <td style="padding:7px 4px">${movieSel}</td>
        ${isSonarr ? `<td style="padding:7px 8px;font-size:11px;color:var(--is-text-sec);white-space:nowrap">${epInfo}</td>` : ''}
        ${isSonarr ? `<td style="padding:7px 8px;font-size:11px;color:var(--is-text-sec);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${this._escHtml(epTitle)}</td>` : ''}
        <td style="padding:7px 8px;font-size:11px;color:var(--is-text-sec);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${this._escHtml(rg)}</td>
        <td style="padding:7px 4px">${qualSel}</td>
        <td style="padding:7px 4px">${langSel}</td>
        <td style="padding:7px 8px;font-size:11px;color:var(--is-text-sec);white-space:nowrap">${size}</td>
        <td style="padding:7px 8px;overflow:hidden">${rejHtml}</td>
      </tr>`;
    }).join('');

    const cols = isSonarr
      ? `<col style="width:22%"><col style="width:7%"><col style="width:14%"><col style="width:9%"><col style="width:16%"><col style="width:13%"><col style="width:7%"><col style="width:12%">`
      : `<col style="width:32%"><col style="width:12%"><col style="width:18%"><col style="width:16%"><col style="width:8%"><col style="width:14%">`;
    const heads = isSonarr
      ? `<th style="${thStyle}">${mediaLabel}</th>
         <th style="${thStyle};padding-left:8px">Episode</th>
         <th style="${thStyle};padding-left:8px">Episode Title</th>
         <th style="${thStyle};padding-left:8px">${this._t('actReleaseGroup')}</th>
         <th style="${thStyle};padding-left:8px">${this._t('actQuality')}</th>
         <th style="${thStyle};padding-left:8px">${this._t('actLanguages')}</th>
         <th style="${thStyle};padding-left:8px">${this._t('actSize')}</th>
         <th style="${thStyle};padding-left:8px">${this._t('actError')}</th>`
      : `<th style="${thStyle}">${mediaLabel}</th>
         <th style="${thStyle};padding-left:8px">${this._t('actReleaseGroup')}</th>
         <th style="${thStyle};padding-left:8px">${this._t('actQuality')}</th>
         <th style="${thStyle};padding-left:8px">${this._t('actLanguages')}</th>
         <th style="${thStyle};padding-left:8px">${this._t('actSize')}</th>
         <th style="${thStyle};padding-left:8px">${this._t('actError')}</th>`;

    return `<div class="u-col">
      <table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <colgroup>${cols}</colgroup>
        <thead><tr class="u-divider-b">${heads}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${importBtn}
    </div>`;
  }

}

export const activityQueueRenderMixin = _ActivityQueueRenderMethods.prototype;
