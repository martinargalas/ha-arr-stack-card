import { isMobile } from '../shared/ui.js';

// Activity, the History and Blocklist tabs. Split out of render/activity.js.

class _ActivityHistoryRenderMethods {

  // ── History tab ──────────────────────────────────────────────────────────

  _actHistoryTabHtml(radarrData, sonarrData, filter, page, perPage) {
    const isMobile  = this._isMob;
    const rRecords  = radarrData?.records || [];
    const sRecords  = sonarrData?.records || [];
    const mh        = this._activityModal || {};
    const hSvc      = mh.histFilterSvc || 'all';
    const hSearch   = (mh.histSearch || '').toLowerCase().trim();
    const histSort    = mh.histSort    || 'date';
    const histSortDir = mh.histSortDir || 'desc';

    const ALL_HIST_COLS = [
      { id: 'event',    label: this._t('actColEvent') },
      { id: 'quality',  label: this._t('actColQuality') },
      { id: 'langs',    label: this._t('actColLangs') },
      { id: 'formats',  label: this._t('actColFormats') },
      { id: 'date',     label: this._t('actColDate') },
      { id: 'client',   label: this._t('actColDlClient') },
      { id: 'indexer',  label: this._t('actColIndexer') },
      { id: 'relgroup', label: this._t('actColRelgroup') },
      { id: 'srctitle', label: this._t('actColSrcTitle') },
      { id: 'cfscore',  label: this._t('actColCfScore') },
    ];
    const HC = mh.histCols instanceof Set ? mh.histCols : new Set(['event', 'quality', 'date']);
    const visHistCols = ALL_HIST_COLS.filter(c => HC.has(c.id));

    const allRaw = [
      ...rRecords.map(r => ({ ...r, _svc: r._svc || 'radarr', _title: r._enrichedTitle || r.movie?.title || r.sourceTitle || '' })),
      ...sRecords.map(r => ({ ...r, _svc: r._svc || 'sonarr', _title: r._enrichedTitle || r.series?.title  || r.sourceTitle || '' })),
    ];

    const uniq    = (arr, fn) => [...new Set(arr.map(fn).filter(Boolean))].sort();
    const mkItems = (ph, opts) => [['all', ph], ...opts.map(o => [o, o])];

    const fQual  = mh.histFilterQuality  || 'all';
    const fLang  = mh.histFilterLang     || 'all';
    const fFmt   = mh.histFilterFormat   || 'all';
    const fCli   = mh.histFilterClient   || 'all';
    const fIdx   = mh.histFilterIndexer  || 'all';
    const fRG    = mh.histFilterRelgroup || 'all';

    const hSels = [
      HC.has('event') && { id: 'act-hist-filter',kind: 'event', value: filter || 'all', items: [['all', this._t('actAllEvents')], ['grabbed', this._t('actEvtGrabbed')], ['downloadFolderImported', this._t('actEvtImported')], ['downloadFailed', this._t('actEvtFailed')]] },
      { id: 'act-hist-svc',kind: 'source', value: hSvc, items: [['all', this._t('actAllSources')], ['radarr', this._instLabel('radarr')], ['sonarr', this._instLabel('sonarr')], ...(this._lidarrConfigured !== false ? [['lidarr', 'Lidarr']] : [])] },
      HC.has('quality')  && { id: 'act-hist-quality',  kind: 'quality',  value: fQual, items: mkItems(this._t('actAllQualities'), uniq(allRaw, r=>r.quality?.quality?.name)) },
      HC.has('langs')    && { id: 'act-hist-lang',     kind: 'langs',     value: fLang, items: mkItems(this._t('actAllLanguages'), [...new Set(allRaw.flatMap(r=>(r.languages||[]).map(l=>l.name)).filter(Boolean))].sort()) },
      HC.has('formats')  && { id: 'act-hist-format',   kind: 'formats',   value: fFmt,  items: mkItems(this._t('actAllFormats'), [...new Set(allRaw.flatMap(r=>(r.customFormats||[]).map(cf=>cf.name)).filter(Boolean))].sort()) },
      HC.has('client')   && { id: 'act-hist-client',   kind: 'client',   value: fCli,  items: mkItems(this._t('actAllClients'), uniq(allRaw, r=>r.data?.downloadClient)) },
      HC.has('indexer')  && { id: 'act-hist-indexer',  kind: 'indexer',  value: fIdx,  items: mkItems(this._t('actAllIndexers'), uniq(allRaw, r=>r.data?.indexer)) },
      HC.has('relgroup') && { id: 'act-hist-relgroup',kind: 'relgroup', value: fRG,   items: mkItems(this._t('actAllGroups'), uniq(allRaw, r=>r.data?.releaseGroup)) },
    ].filter(Boolean);
    const toolbar = this._actBar('act-hist-search', mh.histSearch || '', hSels, 'act-hist-cols-btn');

    const allFiltered = allRaw.filter(r => {
      if (hSvc !== 'all' && r._svc !== hSvc) return false;
      if (hSearch && !r._title.toLowerCase().includes(hSearch)) return false;
      if (fQual !== 'all' && (r.quality?.quality?.name || '') !== fQual) return false;
      if (fLang !== 'all' && !(r.languages||[]).some(l=>l.name===fLang)) return false;
      if (fFmt  !== 'all' && !(r.customFormats||[]).some(cf=>cf.name===fFmt)) return false;
      if (fCli  !== 'all' && (r.data?.downloadClient||'') !== fCli) return false;
      if (fIdx  !== 'all' && (r.data?.indexer||'') !== fIdx) return false;
      if (fRG   !== 'all' && (r.data?.releaseGroup||'') !== fRG) return false;
      return true;
    });
    const _sortFn = {
      title:    r => r._title.toLowerCase(),
      event:    r => r.eventType || '',
      quality:  r => r.quality?.quality?.name || '',
      langs:    r => r.languages?.[0]?.name || '',
      formats:  r => r.customFormats?.[0]?.name || '',
      date:     r => new Date(r.date || 0).getTime(),
      client:   r => r.data?.downloadClient || '',
      indexer:  r => r.data?.indexer || '',
      relgroup: r => r.data?.releaseGroup || '',
      srctitle: r => r.sourceTitle || '',
      cfscore:  r => Number(r.data?.customFormatScore || 0),
    }[histSort];
    const allItems = [...allFiltered].sort((a, b) => {
      if (!_sortFn) return new Date(b.date) - new Date(a.date);
      const va = _sortFn(a), vb = _sortFn(b);
      if (va < vb) return histSortDir === 'asc' ? -1 : 1;
      if (va > vb) return histSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    if (!allRaw.length) {
      return `<div class="u-col-fill">
        ${toolbar}
        <div style="text-align:center;color:var(--is-text-muted);padding:32px 20px">${this._t('actHistoryEmpty')}</div>
      </div>`;
    }

    const pg        = Math.min(page || 0, Math.max(0, Math.ceil(allItems.length / perPage) - 1));
    const paged     = allItems.slice(pg * perPage, (pg + 1) * perPage);
    const totPages  = Math.max(1, Math.ceil(allItems.length / perPage));
    const pagHtml   = totPages > 1 ? this._uiPager('act-hist-page', pg, totPages) : '';

    const evColor = ev => {
      if (ev === 'grabbed')                  return 'rgba(99,140,255,0.9)';
      if (ev === 'downloadFolderImported')   return 'rgba(60,200,120,0.9)';
      if (ev === 'downloadFailed' || ev === 'importFailed') return 'rgba(255,100,100,0.9)';
      return 'rgba(255,255,255,0.45)';
    };
    const evLabel = ev => ({
      grabbed:                 this._t('actEvtGrabbed'),
      downloadFolderImported:  this._t('actEvtImported'),
      downloadFailed:          this._t('actEvtFailed'),
      importFailed:            this._t('actEvtImportFailed'),
      downloadIgnored:         this._t('actEvtIgnored'),
      movieDeleted:            this._t('actEvtDeleted'),
      seriesDeleted:           this._t('actEvtDeleted'),
    }[ev] || ev || '—');
    const fmtDate = d => {
      if (!d) return '—';
      try {
        const dt = new Date(d);
        return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          + ' ' + dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      } catch { return d; }
    };
    const srcFilmSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/></svg>`;
    const srcTvSvg   = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="15" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`;

    // Sortable th helper
    const HCOL_W = { title:300, event:90, quality:80, langs:80, formats:90, date:80, client:100, indexer:110, relgroup:90, srctitle:140, cfscore:70 };
    const _sth = (id, label, pad0 = false) => {
      const active = histSort === id;
      const arrow = active ? `<span style="margin-left:2px">${histSortDir === 'asc' ? '↑' : '↓'}</span>` : '';
      const w = HCOL_W[id] ? `width:${HCOL_W[id]}px;` : '';
      return `<th data-act-hist-sort="${id}" style="${w}padding:4px 8px 8px${pad0 ? ' 0' : ''};font-size:10px;font-weight:600;color:${active ? 'var(--is-text-body)' : 'var(--is-text-muted)'};text-align:left;cursor:pointer;user-select:none;white-space:nowrap">${label}${arrow}</th>`;
    };

    if (isMobile) {
      const rowsHtml = paged.map(r => {
        const svcCol = this._actSrcColor(r._svc);
        const qualLblM = r.quality?.quality?.name || '';
        const hExtraTags = visHistCols.filter(c => !['source','quality','event','date'].includes(c.id)).map(col => {
          let v = '';
          if (col.id === 'langs')    v = (r.languages||[]).map(l=>l.name).join(', ');
          if (col.id === 'formats')  v = (r.customFormats||[]).map(cf=>cf.name).join(', ');
          if (col.id === 'client')   v = r.data?.downloadClient || '';
          if (col.id === 'indexer')  v = r.data?.indexer || '';
          if (col.id === 'relgroup') v = r.data?.releaseGroup || '';
          if (col.id === 'srctitle') v = r.sourceTitle || '';
          if (col.id === 'cfscore')  v = r.data?.customFormatScore != null ? String(r.data.customFormatScore) : '';
          return v ? `<span class="u-xxs-muted">${v}</span>` : '';
        }).filter(Boolean).join('');
        return `<div style="padding:8px 0;border-bottom:1px solid var(--is-divider)">
          <div style="display:flex;align-items:flex-start;gap:8px">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r._title}</div>
              <div style="display:flex;align-items:center;gap:5px;margin-top:3px">
                <span style="color:var(--is-text-muted);display:flex;align-items:center">${this._actSrcIcon(r._svc)}</span>
                ${qualLblM ? `<span class="u-xxs-muted">${qualLblM}</span>` : ''}
                ${hExtraTags}
              </div>
            </div>
            <div style="flex-shrink:0;text-align:right;min-width:60px">
              <div style="font-size:11px;font-weight:700;color:var(--is-text)">${evLabel(r.eventType)}</div>
              <div style="font-size:9px;color:var(--is-text-muted);margin-top:2px">${fmtDate(r.date)}</div>
            </div>
          </div>
        </div>`;
      }).join('');
      return `<div class="u-col-fill">
        ${toolbar}
        <div class="act-hist-results-wrap" style="display:contents">
          <div class="u-flex-ovh" data-act-clip>${rowsHtml}</div>
          <div style="flex-shrink:0;padding-top:4px">${pagHtml}</div>
        </div>
      </div>`;
    }

    const rows = paged.map(r => {
      const srcCell = `<td style="padding:7px 8px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:7px"><span style="color:var(--is-text-sec);display:flex;align-items:center">${this._actSrcIcon(r._svc)}</span><span style="font-size:10px;font-weight:600;color:var(--is-text-sec)">${this._instLabel(r._svc)}</span></div></td>`;
      const colTds = visHistCols.map(col => {
        if (col.id === 'event')    return `<td style="padding:7px 8px;white-space:nowrap"><span style="font-size:10px;font-weight:600;color:var(--is-text-body)">${evLabel(r.eventType)}</span></td>`;
        if (col.id === 'quality')  { const q = r.quality?.quality?.name; return `<td class="u-cell-pad">${q ? this._uiBadge(q, 'neutral') : '\u2014'}</td>`; }
        if (col.id === 'langs')    return `<td class="u-cell-pad">${(r.languages||[]).map(l=>l.name).join(', ') || '—'}</td>`;
        if (col.id === 'formats')  { const fmts = (r.customFormats||[]).filter(cf=>cf.name); return `<td style="padding:7px 8px;overflow:hidden">${fmts.length ? `<div class="act-fmt-tags" style="display:flex;flex-wrap:wrap;align-content:flex-start;gap:3px;max-height:44px;overflow:hidden">${fmts.map(cf=>`<span class="act-fmt-tag ui-badge" style="--bdg:150,150,165">${this._escHtml(cf.name)}</span>`).join('')}</div>` : `<span class="u-xs-muted">—</span>`}</td>`; }
        if (col.id === 'date')     return `<td style="padding:7px 8px;white-space:nowrap;font-size:10px;color:var(--is-text-muted)">${fmtDate(r.date)}</td>`;
        if (col.id === 'client')   return `<td class="u-cell-pad">${this._escHtml(r.data?.downloadClient || '—')}</td>`;
        if (col.id === 'indexer')  return `<td style="padding:7px 8px;font-size:10px;color:var(--is-text-sec);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(r.data?.indexer || '—')}</td>`;
        if (col.id === 'relgroup') return `<td class="u-cell-pad">${this._escHtml(r.data?.releaseGroup || '—')}</td>`;
        if (col.id === 'srctitle') return `<td style="padding:7px 8px;font-size:10px;color:var(--is-text-muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(r.sourceTitle || '—')}</td>`;
        if (col.id === 'cfscore')  return `<td class="u-cell-pad">${r.data?.customFormatScore ?? '—'}</td>`;
        return '';
      }).join('');
      return `<tr class="u-divider-b">
        <td style="padding:7px 8px 7px 0;overflow:hidden"><div style="font-size:12px;font-weight:500;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r._title}</div></td>
        ${srcCell}${colTds}
      </tr>`;
    }).join('');

    return `<div class="u-col-fill">
      ${toolbar}
      <div class="act-hist-results-wrap" style="display:contents">
        <div style="flex:1;overflow:hidden;overflow-x:auto" data-act-clip>
          <table style="width:100%;border-collapse:collapse;table-layout:fixed">
            <thead><tr class="u-divider-b">
              ${_sth('title', this._t('actColTitle'), true)}
              <th style="width:70px;padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:center">${this._t('actColSource')}</th>
              ${visHistCols.map(c => _sth(c.id, c.label)).join('')}
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="flex-shrink:0;padding-top:4px">${pagHtml}</div>
      </div>
    </div>`;
  }

  // ── Blocklist tab ────────────────────────────────────────────────────────

  _actBlocklistTabHtml(radarrData, sonarrData, page, perPage) {
    const isMobile = this._isMob;
    const rRecords = radarrData?.records || [];
    const sRecords = sonarrData?.records || [];
    const mb       = this._activityModal || {};
    const blSvc    = mb.blFilterSvc   || 'all';
    const blProto  = mb.blFilterProto || 'all';
    const blSearch = (mb.blSearch || '').toLowerCase().trim();
    const blSort   = mb.blSort    || 'date';
    const blSortDir= mb.blSortDir || 'desc';

    const ALL_BL_COLS = [
      { id: 'source',   label: this._t('actColSource') },
      { id: 'srctitle', label: this._t('actColSrcTitle') },
      { id: 'langs',    label: this._t('actColLangs') },
      { id: 'quality',  label: this._t('actColQuality') },
      { id: 'formats',  label: this._t('actColFormats') },
      { id: 'date',     label: this._t('actColDate') },
      { id: 'indexer',  label: this._t('actColIndexer') },
      { id: 'protocol', label: this._t('actColProtocol') },
    ];
    const BC = mb.blCols instanceof Set ? mb.blCols : new Set(['quality', 'date', 'source']);
    const visBLCols = ALL_BL_COLS.filter(c => BC.has(c.id));

    const allRaw = [
      ...rRecords.map(r => ({ ...r, _svc: r._svc || 'radarr', _title: r._enrichedTitle || r.movie?.title || r.sourceTitle || '\u2014' })),
      ...sRecords.map(r => ({ ...r, _svc: r._svc || 'sonarr', _title: r._enrichedTitle || r.series?.title || r.sourceTitle || '\u2014' })),
    ];

    const uniq    = (arr, fn) => [...new Set(arr.map(fn).filter(Boolean))].sort();
    const mkItems = (ph, opts) => [['all', ph], ...opts.map(o => [o, o])];

    const fQual  = mb.blFilterQuality  || 'all';
    const fLang  = mb.blFilterLang     || 'all';
    const fFmt   = mb.blFilterFormat   || 'all';
    const fIdx   = mb.blFilterIndexer  || 'all';

    const blSels = [
      { id: 'act-bl-svc',   kind: 'source',   value: blSvc,   items: [['all', this._t('actAllSources')], ['radarr', this._instLabel('radarr')], ['sonarr', this._instLabel('sonarr')], ...(this._lidarrConfigured !== false ? [['lidarr', 'Lidarr']] : [])] },
      { id: 'act-bl-proto',kind: 'protocol', value: blProto, items: [['all', this._t('actAllProtocols')], ['torrent', 'Torrent'], ['usenet', 'Usenet']] },
      BC.has('quality') && { id: 'act-bl-quality',kind: 'quality', value: fQual, items: mkItems(this._t('actAllQualities'), uniq(allRaw, r=>r.quality?.quality?.name)) },
      BC.has('langs')   && { id: 'act-bl-lang',    kind: 'langs',    value: fLang, items: mkItems(this._t('actAllLanguages'), [...new Set(allRaw.flatMap(r=>(r.languages||[]).map(l=>l.name)).filter(Boolean))].sort()) },
      BC.has('formats') && { id: 'act-bl-format',  kind: 'formats',  value: fFmt,  items: mkItems(this._t('actAllFormats'), [...new Set(allRaw.flatMap(r=>(r.customFormats||[]).map(cf=>cf.name)).filter(Boolean))].sort()) },
      BC.has('indexer') && { id: 'act-bl-indexer',kind: 'indexer', value: fIdx,  items: mkItems(this._t('actAllIndexers'), uniq(allRaw, r=>r.indexer)) },
    ].filter(Boolean);
    const blToolbar = this._actBar('act-bl-search', mb.blSearch || '', blSels, 'act-bl-cols-btn');

    const trashSvg  = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;

    const allFiltered = allRaw.filter(r => {
      if (blSvc   !== 'all' && r._svc !== blSvc) return false;
      if (blProto !== 'all' && (r.protocol || '').toLowerCase() !== blProto) return false;
      if (blSearch && !r._title.toLowerCase().includes(blSearch)) return false;
      if (fQual !== 'all' && (r.quality?.quality?.name || '') !== fQual) return false;
      if (fLang !== 'all' && !(r.languages||[]).some(l=>l.name===fLang)) return false;
      if (fFmt  !== 'all' && !(r.customFormats||[]).some(cf=>cf.name===fFmt)) return false;
      if (fIdx  !== 'all' && (r.indexer||'') !== fIdx) return false;
      return true;
    });
    const _blSortFn = {
      title:    r => r._title.toLowerCase(),
      srctitle: r => r.sourceTitle || '',
      langs:    r => (r.languages||[])[0]?.name || '',
      quality:  r => r.quality?.quality?.name || '',
      formats:  r => (r.customFormats||[])[0]?.name || '',
      date:     r => new Date(r.date || 0).getTime(),
      indexer:  r => r.indexer || '',
      protocol: r => r.protocol || '',
      source:   r => r._svc,
    }[blSort];
    const allSorted = [...allFiltered].sort((a, b) => {
      if (!_blSortFn) return new Date(b.date) - new Date(a.date);
      const va = _blSortFn(a), vb = _blSortFn(b);
      if (va < vb) return blSortDir === 'asc' ? -1 : 1;
      if (va > vb) return blSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    if (!allRaw.length) {
      return `<div class="u-col-fill">
        ${blToolbar}
        <div style="text-align:center;color:var(--is-text-muted);padding:32px 20px">${this._t('actBlocklistEmpty')}</div>
      </div>`;
    }

    const pg       = Math.min(page || 0, Math.max(0, Math.ceil(allSorted.length / perPage) - 1));
    const paged    = allSorted.slice(pg * perPage, (pg + 1) * perPage);
    const totPages = Math.max(1, Math.ceil(allSorted.length / perPage));
    const pagHtml  = totPages > 1 ? this._uiPager('act-bl-page', pg, totPages) : '';

    const fmtDate = d => {
      if (!d) return '\u2014';
      try {
        const dt = new Date(d);
        return dt.toLocaleDateString(this._locale, { month: 'short', day: 'numeric' }) + ' ' + dt.toLocaleTimeString(this._locale, { hour: '2-digit', minute: '2-digit' });
      } catch { return d; }
    };

    const srcFilmSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/></svg>`;
    const srcTvSvg   = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="15" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>`;

    const BCOL_W = { title:300, source:70, srctitle:140, langs:80, quality:80, formats:90, date:80, indexer:110, protocol:65 };
    const _bsth = (id, label, pad0 = false, center = false) => {
      const active = blSort === id;
      const arrow  = active ? `<span style="margin-left:2px">${blSortDir === 'asc' ? '\u2191' : '\u2193'}</span>` : '';
      const w = BCOL_W[id] ? `width:${BCOL_W[id]}px;` : '';
      return `<th data-act-bl-sort="${id}" style="${w}padding:4px 8px 8px${pad0?' 0':''};font-size:10px;font-weight:600;color:${active?'var(--is-text-body)':'var(--is-text-muted)'};text-align:${center?'center':'left'};cursor:pointer;user-select:none;white-space:nowrap">${label}${arrow}</th>`;
    };

    if (isMobile) {
      const rowsHtml = paged.map(r => {
        const svcCol  = this._actSrcColor(r._svc);
        const rmBtn   = this._mtRoundBtn(`class="act-bl-remove-btn" data-id="${r.id}" data-svc="${r._svc}"`, trashSvg, 'Remove', { size: 24, tone: 'red' });
        const dateShortBl = (() => { try { const dt = new Date(r.date); return dt.toLocaleDateString(this._locale, { month: 'short', day: 'numeric' }); } catch { return fmtDate(r.date); } })();
        const blExtraTags = visBLCols.filter(c => !['source','quality','date'].includes(c.id)).map(col => {
          let v = '';
          if (col.id === 'srctitle') v = r.sourceTitle || '';
          if (col.id === 'langs')    v = (r.languages||[]).map(l=>l.name).join(', ');
          if (col.id === 'formats')  v = (r.customFormats||[]).map(cf=>cf.name).join(', ');
          if (col.id === 'indexer')  v = r.indexer || '';
          if (col.id === 'protocol') v = r.protocol || '';
          return v ? `<span class="u-xxs-muted">${v}</span>` : '';
        }).filter(Boolean).join('');
        return `<div style="padding:9px 0;border-bottom:1px solid var(--is-divider)">
          <div style="display:flex;align-items:flex-start;gap:8px">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r._title}</div>
              <div style="display:flex;gap:6px;margin-top:3px">
                <span style="color:var(--is-text-muted);display:flex;align-items:center">${this._actSrcIcon(r._svc)}</span>
                <span class="u-xxs-muted">${r.quality?.quality?.name || '\u2014'}</span>
                ${blExtraTags}
              </div>
            </div>
            <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px;min-width:44px">
              <span style="font-size:11px;font-weight:600;color:var(--is-text-sec)">${dateShortBl}</span>
              ${rmBtn}
            </div>
          </div>
        </div>`;
      }).join('');
      return `<div class="u-col-fill">
        ${blToolbar}
        <div class="act-bl-results-wrap" style="display:contents">
          <div class="u-flex-ovh" data-act-clip>${rowsHtml}</div>
          <div style="flex-shrink:0;padding-top:4px">${pagHtml}</div>
        </div>
      </div>`;
    }

    const rows = paged.map(r => {
      const rmBtn  = this._mtRoundBtn(`class="act-bl-remove-btn" data-id="${r.id}" data-svc="${r._svc}"`, trashSvg, 'Remove', { size: 24, tone: 'red' });
      const colTds = visBLCols.map(col => {
        if (col.id === 'source')   return `<td style="padding:7px 8px;text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:7px"><span style="color:var(--is-text-sec);display:flex;align-items:center">${this._actSrcIcon(r._svc)}</span><span style="font-size:10px;font-weight:600;color:var(--is-text-sec)">${this._instLabel(r._svc)}</span></div></td>`;
        if (col.id === 'srctitle') return `<td style="padding:7px 8px;font-size:10px;color:var(--is-text-muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(r.sourceTitle || '\u2014')}</td>`;
        if (col.id === 'langs')    return `<td class="u-cell-pad">${(r.languages||[]).map(l=>l.name).join(', ') || '\u2014'}</td>`;
        if (col.id === 'quality')  { const q = r.quality?.quality?.name; return `<td class="u-cell-pad">${q ? this._uiBadge(q, 'neutral') : '\u2014'}</td>`; }
        if (col.id === 'formats')  { const fmts = (r.customFormats||[]).filter(cf=>cf.name); return `<td style="padding:7px 8px;overflow:hidden">${fmts.length ? `<div class="act-fmt-tags" style="display:flex;flex-wrap:wrap;align-content:flex-start;gap:3px;max-height:44px;overflow:hidden">${fmts.map(cf=>`<span class="act-fmt-tag ui-badge" style="--bdg:150,150,165">${this._escHtml(cf.name)}</span>`).join('')}</div>` : `<span class="u-xs-muted">\u2014</span>`}</td>`; }
        if (col.id === 'date')     return `<td style="padding:7px 8px;white-space:nowrap;font-size:10px;color:var(--is-text-muted)">${fmtDate(r.date)}</td>`;
        if (col.id === 'indexer')  return `<td style="padding:7px 8px;font-size:10px;color:var(--is-text-sec);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(r.indexer || '\u2014')}</td>`;
        if (col.id === 'protocol') return `<td class="u-cell-pad">${r.protocol || '\u2014'}</td>`;
        return '';
      }).join('');
      return `<tr class="u-divider-b">
        <td style="padding:7px 8px 7px 0;overflow:hidden"><div style="font-size:12px;font-weight:500;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r._title}</div></td>
        ${colTds}
        <td style="padding:7px 0 7px 8px;text-align:right">${rmBtn}</td>
      </tr>`;
    }).join('');

    const thRow = visBLCols.map(c => _bsth(c.id, c.label, false, c.id === 'source')).join('');
    return `<div class="u-col-fill">
      ${blToolbar}
      <div class="act-bl-results-wrap" style="display:contents">
        <div style="flex:1;overflow:hidden;overflow-x:auto" data-act-clip>
          <table style="width:100%;border-collapse:collapse;table-layout:fixed">
            <thead><tr class="u-divider-b">
              ${_bsth('title', this._t('actColTitle'), true)}
              ${thRow}
              <th style="padding:4px 0 8px 8px;width:36px"></th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="flex-shrink:0;padding-top:4px">${pagHtml}</div>
      </div>
    </div>`;
  }

}

export const activityHistoryRenderMixin = _ActivityHistoryRenderMethods.prototype;
