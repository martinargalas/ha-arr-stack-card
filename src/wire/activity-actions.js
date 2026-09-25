import { ICONS, dayClass } from '../shared/ui.js';
import { MT_BTN } from '../render/mt-kit.js';
import { fmtBytes } from '../shared/format.js';

// Activity, row actions: removing from the queue or the blocklist, manual import, a season's Interactive Search. Split out of wire/activity.js.

class _WireActivityActionsMethods {

  async _actRemoveQueueItem(id, svc, removeFromClient, blocklist, skipRedownload, modalEl) {
    if (!this._activityModal) return;
    this._markActivated();
    try {
      const qs = `removeFromClient=${removeFromClient ? 'true' : 'false'}&blocklist=${blocklist ? 'true' : 'false'}&skipRedownload=${skipRedownload ? 'true' : 'false'}`;
      await this._callApi('DELETE', `arr_stack/${svc}/queue/${id}?${qs}`);
    } catch (e) {
      console.error('[arr-card] Queue remove error:', e);
    }
    await this._actLoadTab('queue', modalEl);
    await this._refreshQueueCounters();
  }

  _openQueueRemoveModal(dataset, parentModalEl) {
    const id    = dataset.id;
    const svc   = dataset.svc;
    const title = dataset.title || '';

    // Same shell as the other dialogs: 20px corners, hairline rim, capsule
    // pickers with our own trigger, round tonal buttons.
    const overlay = document.createElement('div');
    overlay.className = `popup-overlay${dayClass(this)}`;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55)';
    const _row = (label, field, hint = '') => `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:${hint ? '4px' : '12px'}">
        <div style="width:130px;flex-shrink:0;font-size:11px;font-weight:600;color:var(--is-text-muted);text-align:right">${label}</div>
        <div style="flex:1;min-width:0">${field}</div>
      </div>
      ${hint ? `<div style="margin:0 0 12px 142px;font-size:10px;color:rgba(200,120,0,0.9)" id="qrm-method-warn">${hint}</div>` : ''}`;

    overlay.innerHTML = `
      <div style="background:var(--is-menu-bg,#1c1c2e);border:1px solid var(--is-card-bdr,rgba(255,255,255,0.09));border-radius:20px;padding:20px 22px;width:min(480px,94vw);box-shadow:0 8px 40px rgba(0,0,0,0.35);color:var(--is-text);font-family:inherit">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-size:14px;font-weight:700">Remove</div>
          ${this._mtRoundBtn('class="qrm-close"', `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`, 'Close', { size: 28, tone: 'blue', active: false })}
        </div>
        <p style="font-size:12px;color:var(--is-text-muted);margin:0 0 16px">Are you sure you want to remove <strong style="color:var(--is-text)">${this._escHtml(title)}</strong> from the queue?</p>
        ${_row('Removal Method',
            this._mtFieldSelect('qrm-method', [['client', 'Remove from Download Client'], ['queue', 'Remove from Queue Only']], 'client', 'width:100%'),
            "'Remove from Download Client' will remove the download and the file(s) from the download client.")}
        ${_row('Blocklist Release',
            this._mtFieldSelect('qrm-blocklist', [['none', 'Do not Blocklist'], ['search', 'Blocklist and Search'], ['only', 'Blocklist Only']], 'none', 'width:100%'))}
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--is-card-bdr,rgba(255,255,255,0.09))">
          <button class="qrm-close" style="${MT_BTN}">Close</button>
          <button class="qrm-remove" style="${this._mtBtnA('red')}">Remove</button>
        </div>
      </div>`;

    // update warning visibility on method change
    const methodSel = overlay.querySelector('#qrm-method');
    const warn      = overlay.querySelector('#qrm-method-warn');
    methodSel.addEventListener('change', () => {
      warn.style.display = methodSel.value === 'client' ? 'block' : 'none';
      this._tbSyncSelect(methodSel);
    });
    overlay.querySelector('#qrm-blocklist')?.addEventListener('change', e => this._tbSyncSelect(e.target));

    overlay.addEventListener('click', async e => {
      if (e.target.closest('.qrm-close') || e.target === overlay) {
        overlay.remove(); return;
      }
      if (e.target.closest('.qrm-remove')) {
        const removeFromClient = overlay.querySelector('#qrm-method').value === 'client';
        const blVal            = overlay.querySelector('#qrm-blocklist').value;
        const blocklist        = blVal !== 'none';
        const skipRedownload   = blVal === 'only';
        overlay.remove();
        await this._actRemoveQueueItem(Number(id), svc, removeFromClient, blocklist, skipRedownload, parentModalEl);
      }
    });

    this.shadowRoot.appendChild(overlay);
  }

  async _actRemoveBlocklistItem(id, svc, modalEl) {
    const m = this._activityModal;
    if (!m) return;
    try {
      await this._callApi('DELETE', 'arr_stack/' + svc + '/activity/blocklist/' + id);
    } catch (e) {
      if (e?.error !== 'Unable to parse JSON response') {
        console.error('[arr-card] Blocklist remove error:', e);
      }
    }
    await this._actLoadTab('blocklist', modalEl);
  }

  async _openManualImportModal(btn, modalEl) {
    const svc        = btn.dataset.svc;
    const downloadId = btn.dataset.downloadId;
    const movieId    = btn.dataset.movieId;
    const seriesId   = btn.dataset.seriesId;
    const episodeId  = btn.dataset.episodeId || '';
    const outputPath = btn.dataset.outputPath || '';
    const title      = btn.dataset.title || '—';

    this.shadowRoot.querySelector('[data-mi-modal]')?.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = this._actManualImportModalHtml(title);
    const overlay = wrap.firstElementChild;
    this.shadowRoot.appendChild(overlay);

    overlay.querySelector('#mi-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const miBody = overlay.querySelector('#mi-body');
    try {
      // The proxy prefers `folder` over `downloadId` when both are given, and
      // outputPath is often the file itself rather than a directory — asking by
      // download is what Radarr's and Sonarr's own UI does, so that goes first.
      const ids = (movieId  ? `&movieId=${encodeURIComponent(movieId)}` : '')
                + (seriesId ? `&seriesId=${encodeURIComponent(seriesId)}` : '');
      const dl = `downloadId=${encodeURIComponent(downloadId)}`;
      const folder = outputPath ? `folder=${encodeURIComponent(outputPath)}` : '';
      // Naming the title makes the *arr scan that title's own folder, which
      // fails outright when the folder is missing on disk — hence the plain
      // retries behind it.
      const attempts = [dl + ids, dl, ...(folder ? [folder + ids, folder] : [])];
      const _fetchCandidates = async () => {
        let lastErr;
        for (const qs of attempts) {
          try {
            return await this._callApi('GET', `arr_stack/${svc}/manualimport?${qs}`);
          } catch (err) {
            lastErr = err;
            console.warn('[arr-card] manual import attempt failed:', qs, err?.body?.message || err);
          }
        }
        throw lastErr;
      };
      const [allCandidates, qDefs, langs] = await Promise.all([
        _fetchCandidates(),
        this._callApi('GET', `arr_stack/${svc}/qualitydefs`).catch(() => []),
        this._callApi('GET', `arr_stack/${svc}/languages`).catch(() => []),
      ]);
      let candidates = allCandidates || [];
      // A folder comes back in whatever order the file system answered in.
      // Music reads as a record, so it is listed as one: disc, then track.
      if (svc === 'lidarr') candidates = this._miSortTracks(candidates);
      if (episodeId) {
        candidates = candidates.filter(c =>
          c.episodes?.some(ep => String(ep.id) === episodeId)
        );
      }
      this._miRenderAndWire(candidates, svc, qDefs, langs, miBody, overlay, modalEl);
    } catch (err) {
      console.error('[arr-card] Manual import fetch error:', err);
      // Radarr and Sonarr explain themselves — "Could not find a part of the
      // path ..." names a broken folder, which the generic wording hid.
      const detail = err?.body?.message || err?.body?.error || err?.message || '';
      miBody.innerHTML = `<div style="text-align:center;color:rgba(255,100,100,0.85);padding:28px 20px;font-size:12px;line-height:1.5">
        <div style="font-weight:700;margin-bottom:6px">Failed to fetch candidates</div>
        ${detail ? `<div style="opacity:0.8">${this._escHtml(String(detail))}</div>` : ''}
      </div>`;
    }
  }

  // A folder comes back in whatever order the file system answered in. Music
  // reads as a record, so it is listed as one: disc, then track, then the file
  // name for anything Lidarr could not number.
  _miSortTracks(candidates) {
    const key = c => {
      const t = (c.tracks || [])[0];
      return [
        t?.mediumNumber ?? 99,
        t?.absoluteTrackNumber ?? t?.trackNumber ?? 999,
        (c.path || '').toLowerCase(),
      ];
    };
    return [...(candidates || [])].sort((a, b) => {
      const [am, at, ap] = key(a);
      const [bm, bt, bp] = key(b);
      return am - bm || at - bt || ap.localeCompare(bp);
    });
  }

  // Render candidates with select dropdowns and wire change + import buttons
  _miRenderAndWire(candidates, svc, qDefs, langs, miBody, overlay, modalEl) {
    const lib = svc === 'radarr'  ? (this._radarr  || [])
              : svc === 'radarr2' ? (this._radarr2 || [])
              : svc === 'sonarr'  ? (this._sonarr  || [])
              : svc === 'sonarr2' ? (this._sonarr2 || [])
              : svc === 'lidarr'  ? [...(this._lidarrArtists?.values() || [])].map(a => ({ id: a.id, title: a.artistName }))
              : [];

    miBody.innerHTML = this._actManualImportCandidatesHtml(candidates, svc, qDefs, langs);

    // Wire change events on selects
    miBody.addEventListener('change', e => {
      const sel = e.target.closest('select.mi-field-sel');
      if (!sel) return;
      const field = sel.dataset.field;
      const idx   = parseInt(sel.dataset.idx);
      const c     = candidates[idx];
      if (!c) return;
      const valStr = sel.value;
      const valNum = parseInt(valStr);

      if (field === 'artist') {
        const a = lib.find(x => x.id === valNum);
        candidates[idx].artist   = a || { id: valNum };
        candidates[idx].artistId = valNum;
      } else if (field === 'movie') {
        const m = lib.find(x => x.id === valNum);
        candidates[idx].movie   = m || { id: valNum };
        candidates[idx].movieId = valNum;
      } else if (field === 'series') {
        const m = lib.find(x => x.id === valNum);
        candidates[idx].series   = m || { id: valNum };
        candidates[idx].seriesId = valNum;
      } else if (field === 'quality') {
        const def = (qDefs || []).find(d => (d.quality?.id ?? d.id) === valNum);
        candidates[idx].quality = {
          quality:  { id: valNum, name: def?.quality?.name || def?.title || '' },
          revision: candidates[idx].quality?.revision || { version: 1, real: 0 },
        };
      } else if (field === 'language') {
        const lang = (langs || []).find(l => l.id === valNum);
        candidates[idx].languages = [{ id: valNum, name: lang?.name || '' }];
      }

      // Re-render to update Import button state without losing select values
      this._miRenderAndWire(candidates, svc, qDefs, langs, miBody, overlay, modalEl);
    });

    // Wire Import button
    miBody.addEventListener('click', async e => {
      const btn = e.target.closest('#mi-import-all');
      if (!btn || !btn.dataset.ready) return;
      btn.dataset.ready = '';
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.textContent = this._t('actImporting');
      try {
        await this._submitManualImport(candidates, candidates.map((_, i) => i), svc, overlay, modalEl);
      } catch (err) {
        console.error('[arr-card] manual import submit:', err);
      }
    });
  }

  // The same command Lidarr's own dialog sends: one entry per file, each
  // carrying the album release it belongs to and the tracks it holds.
  async _submitLidarrImport(candidates, indices, overlayEl, modalEl) {
    const files = indices.map(i => candidates[i])
      .filter(c => c && c.artist && c.album && (c.tracks || []).length)
      .map(c => ({
        path:           c.path,
        artistId:       c.artist.id,
        albumId:        c.album.id,
        albumReleaseId: c.albumReleaseId ?? c.album?.currentRelease?.id ?? null,
        trackIds:       (c.tracks || []).map(t => t.id),
        quality:        c.quality,
        downloadId:     c.downloadId || '',
        disableReleaseSwitching: false,
      }));
    if (!files.length) return;
    const downloadIds = new Set(files.map(f => f.downloadId).filter(Boolean));
    try {
      await this._callApi('POST', 'arr_stack/lidarr/command', {
        name: 'ManualImport', importMode: 'auto', replaceExistingFiles: false, files,
      });
      downloadIds.forEach(id => this._actImporting.add(id));
      overlayEl.remove();
      this._actShowStatus(this._t('actImporting'), { spin: true }, 0);
      // The command runs on Lidarr's own schedule; the queue says when it is
      // done, and the artist's counts follow.
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(r => setTimeout(r, attempt === 0 ? 2000 : 3000));
        if (!this._activityModal) break;
        await this._actLoadTab('queue', modalEl);
        if (!this._activityModal) break;
        // Lidarr's rows ride in the same list as Sonarr's; each says which
        // service it came from.
        const items = (this._activityModal.queueData?.sonarr || []).filter(x => x._svc === 'lidarr');
        if (!items.some(item => downloadIds.has(item.downloadId))) break;
      }
      downloadIds.forEach(id => this._actImporting.delete(id));
      // The import history is what Recently Added is built from, so it is read
      // again here rather than at the next poll — an import somebody just
      // watched finish should not need the page reloaded to show up.
      await this._fetchLidarr();
      this._reRenderSection?.('recentlyAdded');
      this._reRenderSection?.('recentlyRequested');
      this._actShowStatus(this._t('actImported'), { ok: true });
    } catch (err) {
      console.error('[arr-card] Lidarr manual import:', err);
      downloadIds.forEach(id => this._actImporting.delete(id));
      this._actShowStatus(err?.body?.message || this._t('actImportFailed'), { err: true });
    }
  }

  async _openSeasonIsOverlay(seriesId, svc, seasonNumber, seriesTitle) {
    this.shadowRoot.querySelector('[data-season-is-modal]')?.remove();
    const seasonLbl = `S${String(seasonNumber).padStart(2,'0')}`;
    const isSvgSm   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
    const asSvgSm   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="popup-overlay${dayClass(this)}" data-season-is-modal style="z-index:1100">
      <div class="popup-glass" style="width:min(900px,94vw);max-height:88vh;display:flex;flex-direction:column">
        <div class="is-panel-hdr" style="padding:14px 20px 12px;gap:10px">
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(seriesTitle)} — ${seasonLbl}</div>
          </div>
          <button class="popup-close u-rel-shrink0" id="sis-close">${ICONS.close}</button>
        </div>
        <div id="sis-body" class="popup-body" style="overflow-y:auto;flex:1;padding:0 20px 18px">
          <div class="is-loading"><span>${this._t('loading')}</span></div>
        </div>
      </div>
    </div>`;
    const el = wrap.firstElementChild;
    this.shadowRoot.appendChild(el);
    el.querySelector('#sis-close')?.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });

    const body = el.querySelector('#sis-body');
    try {
      const episodes = await this._callApi('GET', `arr_stack/${svc}/episodes?seriesId=${seriesId}&seasonNumber=${seasonNumber}`);
      const epList = (Array.isArray(episodes) ? episodes : []).sort((a, b) => a.episodeNumber - b.episodeNumber);
      if (!epList.length) {
        body.innerHTML = `<div style="text-align:center;color:var(--is-text-muted);padding:32px 20px">${this._t('actNoFiles')}</div>`;
        return;
      }
      const fmtDate = d => {
        if (!d) return '';
        try { return new Date(d).toLocaleDateString(this._locale, { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; }
      };
      const rowsHtml = epList.map(ep => {
        const epCode = `S${String(ep.seasonNumber).padStart(2,'0')}E${String(ep.episodeNumber).padStart(2,'0')}`;
        const epDate = fmtDate(ep.airDate);
        return `<div data-sis-ep="${ep.id}" style="padding:8px 0;border-bottom:1px solid var(--is-divider)">
          <div class="u-row-8">
            <span style="font-size:11px;font-weight:700;color:${ep.hasFile ? 'var(--is-green)' : 'var(--is-text-muted)'};min-width:55px;flex-shrink:0">${epCode}</span>
            <span style="flex:1;min-width:0;font-size:12px;font-weight:500;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(ep.title || '—')}</span>
            ${epDate ? `<span style="font-size:10px;color:var(--is-text-muted);flex-shrink:0">${epDate}</span>` : ''}
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button class="sis-ep-is-btn" data-ep-id="${ep.id}" data-svc="${svc}" title="IS" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:none;background:rgba(99,140,255,0.12);border-radius:5px;cursor:pointer;color:rgba(99,140,255,0.75)">${isSvgSm}</button>
              <button class="sis-ep-as-btn" data-ep-id="${ep.id}" data-svc="${svc}" title="AS" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:none;background:rgba(99,140,255,0.15);border-radius:5px;cursor:pointer;color:rgba(99,140,255,0.9)">${asSvgSm}</button>
            </div>
          </div>
          <div class="sis-ep-releases" data-ep-id="${ep.id}" style="display:none;margin-top:6px;padding:8px;background:rgba(99,140,255,0.06);border-radius:6px"></div>
        </div>`;
      }).join('');
      body.innerHTML = rowsHtml;

      body.addEventListener('click', async e => {
        const isBtn = e.target.closest('.sis-ep-is-btn');
        if (isBtn) {
          const epId  = isBtn.dataset.epId;
          const epSvc = isBtn.dataset.svc;
          const panel = body.querySelector(`.sis-ep-releases[data-ep-id="${epId}"]`);
          if (!panel) return;
          const isOpen = panel.style.display !== 'none';
          body.querySelectorAll('.sis-ep-releases').forEach(p => { p.style.display = 'none'; p.innerHTML = ''; });
          if (isOpen) return;
          panel.style.display = 'block';
          panel.innerHTML = `<div class="is-loading"><span>${this._t('loading')}</span></div>`;
          try {
            const releases = await this._callApi('GET', `arr_stack/${epSvc}/release?episodeId=${epId}`);
            this._renderSisEpReleases(panel, epSvc, releases || []);
          } catch {
            panel.innerHTML = `<div style="text-align:center;color:rgba(255,100,100,0.8);padding:12px;font-size:11px">${this._t('actNoFiles')}</div>`;
          }
          return;
        }
        const asBtn = e.target.closest('.sis-ep-as-btn');
        if (asBtn) {
          const epId  = Number(asBtn.dataset.epId);
          const epSvc = asBtn.dataset.svc;
          const origHtml = asBtn.innerHTML;
          asBtn.disabled = true;
          asBtn.textContent = '…';
          try {
            await this._callApi('POST', `arr_stack/${epSvc}/command`, { name: 'EpisodeSearch', episodeIds: [epId] });
            asBtn.textContent = '✓';
            asBtn.style.color = 'rgba(80,200,100,0.9)';
          } catch {
            asBtn.innerHTML = origHtml;
          } finally {
            asBtn.disabled = false;
          }
          return;
        }
        const grabBtn = e.target.closest('.sis-grab-btn');
        if (grabBtn) {
          const idx   = Number(grabBtn.dataset.idx);
          const epSvc = grabBtn.dataset.svc;
          const panel = grabBtn.closest('.sis-ep-releases');
          if (!panel || !panel._releases || !panel._releases[idx]) return;
          grabBtn.disabled = true;
          grabBtn.textContent = '…';
          try {
            await this._callApi('POST', `arr_stack/${epSvc}/release`, panel._releases[idx]);
            grabBtn.textContent = '✓';
            grabBtn.style.color = 'rgba(80,200,100,0.9)';
            grabBtn.style.background = 'rgba(80,200,100,0.15)';
          } catch {
            grabBtn.textContent = '!';
            grabBtn.style.color = 'rgba(255,100,100,0.9)';
          }
        }
      });
    } catch (err) {
      console.error('[arr-card] Season IS error:', err);
      body.innerHTML = `<div style="text-align:center;color:rgba(255,100,100,0.8);padding:32px 20px">Failed to load episodes</div>`;
    }
  }

  _renderSisEpReleases(panel, svc, releases) {
    if (!releases.length) {
      panel.innerHTML = `<div style="text-align:center;color:var(--is-text-muted);font-size:11px;padding:8px">${this._t('actNoFiles')}</div>`;
      return;
    }
    panel._releases = releases;
    const rows = releases.slice(0, 30).map((rel, i) => {
      const title    = rel.title || rel.releaseTitle || '—';
      const quality  = rel.quality?.quality?.name || '—';
      const size     = rel.size ? fmtBytes(rel.size) : '—';
      const seeders  = rel.seeders != null ? rel.seeders : null;
      const seederHtml = seeders != null ? `<span style="font-size:9px;color:rgba(80,200,100,0.8)">${seeders}S</span>` : '';
      const sep = i > 0 ? 'border-top:1px solid var(--is-divider);' : '';
      return `<div style="${sep}display:flex;align-items:center;gap:6px;padding:5px 0">
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(title)}</div>
          <div style="display:flex;gap:5px;margin-top:2px">
            <span class="u-xxs-muted">${quality}</span>
            <span class="u-xxs-muted">${size}</span>
            ${seederHtml}
          </div>
        </div>
        <button class="sis-grab-btn" data-idx="${i}" data-svc="${svc}" style="flex-shrink:0;height:22px;padding:0 8px;font-size:10px;font-weight:700;border:none;background:rgba(99,140,255,0.15);border-radius:5px;cursor:pointer;color:rgba(99,140,255,0.9)">Grab</button>
      </div>`;
    }).join('');
    panel.innerHTML = rows;
  }

  async _submitManualImport(candidates, indices, svc, overlayEl, modalEl) {
    this._markActivated();
    const isRadarr = svc === 'radarr' || svc === 'radarr2';
    const isSonarr = svc === 'sonarr' || svc === 'sonarr2';
    // Music is imported against a track of an album of an artist, and names
    // none of the fields the other two use — so it builds its own command.
    if (svc === 'lidarr') return this._submitLidarrImport(candidates, indices, overlayEl, modalEl);
    const toImport = indices.map(i => candidates[i]).filter(c => {
      if (!c) return false;
      if (isRadarr && !c.movie) return false;
      if (isSonarr && !c.series) return false;
      return true;
    }).map(c => ({
      // Send only the fields Radarr expects for ManualImportResource.
      // Sending the full GET response can trigger unwanted reprocessing paths.
      id:           c.id,
      path:         c.path,
      movieId:      (isRadarr ? (c.movie?.id || c.movieId) : undefined),
      seriesId:     (isSonarr ? (c.series?.id || c.seriesId) : undefined),
      episodeIds:   c.episodeIds || (c.episodes ? c.episodes.map(ep => ep.id) : []),
      seasonNumber: c.seasonNumber,
      quality:      c.quality,
      languages:    c.languages,
      releaseGroup: c.releaseGroup || '',
      downloadId:   c.downloadId  || '',
      indexerFlags: c.indexerFlags || 0,
      importMode:   'auto',
      disableReleaseSwitching: false,
    }));
    if (!toImport.length) return;
    try {
      await this._callApi('POST', `arr_stack/${svc}/command`, {
        name: 'ManualImport',
        importMode: 'Auto',
        files: toImport.map(c => ({
          path:                   c.path,
          movieId:                c.movieId,
          seriesId:               c.seriesId,
          episodeIds:             c.episodeIds,
          seasonNumber:           c.seasonNumber,
          quality:                c.quality,
          languages:              c.languages,
          releaseGroup:           c.releaseGroup || '',
          downloadId:             c.downloadId   || '',
          indexerFlags:           c.indexerFlags || 0,
          disableReleaseSwitching: false,
        })),
      });
      // Command is async — poll queue until imported items disappear (max ~15s)
      const importedIds = new Set(toImport.map(c => c.downloadId).filter(Boolean));
      // Marks the rows themselves, so the wait is visible where it happens and
      // not only in the pill at the bottom of the screen.
      importedIds.forEach(id => this._actImporting.add(id));
      overlayEl.remove();
      this._actShowStatus(this._t('actImporting'), { spin: true }, 0);
      let gone = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(r => setTimeout(r, attempt === 0 ? 2000 : 3000));
        if (!this._activityModal) break;
        await this._actLoadTab('queue', modalEl);
        if (!this._activityModal) break;
        const qd = this._activityModal.queueData;
        const allItems = [...(qd?.radarr || []), ...(qd?.sonarr || [])];
        if (!allItems.some(item => importedIds.has(item.downloadId))) { gone = true; break; }
      }
      // Whether it landed or the wait ran out, the row stops claiming to work
      importedIds.forEach(id => this._actImporting.delete(id));
      if (this._activityModal) await this._actLoadTab('queue', modalEl);
      // The modal reloads its own tab, but the Activity card on the dashboard
      // reads the queue counters refreshed by the poll — so until the next one
      // it kept reporting the failure the import had just cleared.
      await this._refreshQueueCounters();
      // Still queued after the wait is not a failure — the *arr accepted the
      // command and may simply be slower than the poll.
      this._actShowStatus(gone ? this._t('actImported') : this._t('actImportQueued'));
    } catch (err) {
      console.error('[arr-card] Manual import submit error:', err);
      this._actImporting.clear();
      this._actShowStatus(this._t('actImportFailed'), { err: true }, 6000);
      // Show error inside the modal instead of silently closing
      const miBody = overlayEl.querySelector('#mi-body');
      if (miBody) {
        const msg = err?.body?.message || err?.body?.description?.split('\n')[0] || String(err?.error || err);
        const isParseErr = msg.toLowerCase().includes('parse') || msg.toLowerCase().includes('augment');
        const hint = isParseErr
          ? 'Radarr cannot parse the filename (likely special characters). Rename the file or import directly in Radarr.'
          : '';
        miBody.innerHTML = `<div style="padding:20px 0;color:rgba(255,120,80,0.9)">
          <div style="font-size:13px;font-weight:600;margin-bottom:6px">Import failed</div>
          <div style="font-size:11px;opacity:0.8">${this._escHtml(msg)}</div>
          ${hint ? `<div style="font-size:11px;color:rgba(255,200,100,0.85);margin-top:8px">${hint}</div>` : ''}
        </div>`;
      }
    }
  }

}

export const wireActivityActionsMixin = _WireActivityActionsMethods.prototype;
