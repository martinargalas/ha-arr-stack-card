import { fmtBytes } from '../shared/format.js';

// Library, the cards: the right column's tile, a poster in the grid, the overview cards. Split out of render/library.js.

class _LibraryCardsMethods {

  // ─── Tile card builder ────────────────────────────────────────────────────

  // ─── Modal poster card ────────────────────────────────────────────────────

  _libPosterCard(item) {
    const pc = this._posterCfg();
    const m = this._libModal;
    if (item._libType === 'music') {
      return this._renderMusicCard({ id: item.id, artist: item, newestAlbum: null, newAlbumCount: 0 }, { noSub: true });
    }
    const isMovie = item._libType === 'movie';
    const poster = isMovie ? this._getRadarrPoster(item) : this._getSonarrPoster(item);
    const title = this._escHtml(item.title || '');
    const img = this._mcImg(poster, isMovie ? '🎬' : '📺', item.id);
    const popupType = isMovie ? 'radarr' : 'sonarr';
    const tmdbAttr = item.tmdbId ? ` data-tmdbid="${item.tmdbId}"` : '';
    const tvdbAttr = (!isMovie && item.tvdbId) ? ` data-tvdbid="${item.tvdbId}"` : '';
    const radarrAttr = isMovie && item.id ? ` data-radarrid="${item.id}"` : '';
    const ratingHtml = pc.rating ? this._ratingBadge({ ...item, _mediaType: isMovie ? 'movie' : 'tv' }) : '';
    const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
    const sizeBytes = isMovie ? (item.movieFile?.size || 0) : (item.statistics?.sizeOnDisk || 0);
    const sizeStr = sizeBytes ? fmtBytes(sizeBytes) : '';
    const _mediaTag = pc.mediaType ? `<span class="media-type-tag" style="position:static">${isMovie ? this._t('typeMovie') : this._t('typeShow')}</span>` : '';
    const _sizeTag = sizeStr ? `<span class="media-type-tag" style="position:static">${sizeStr}</span>` : '';
    // Under the size, in the same capsule: both describe the file rather than
    // the title. It replaces the quality profile, which named the target rather
    // than what was actually downloaded. Shows only have this where an episode
    // file is known.
    const qualStr = this._qualityLabel(item, isMovie);
    const _qualTag = qualStr ? `<span class="media-type-tag" style="position:static">${this._escHtml(qualStr)}</span>` : '';
    const typeTag = (_mediaTag || _sizeTag || _qualTag) ? `<div style="position:absolute;top:5px;left:5px;z-index:4;display:flex;flex-direction:column;align-items:flex-start;gap:3px">${_mediaTag}${_sizeTag}${_qualTag}</div>` : '';
    const selKey = `${item._libType}-${item._libInst||'1'}-${item.id}`;
    const checked = m._editMode && m._selected?.has(selKey);
    const checkHtml = m._editMode ? `<div data-lib-sel="${selKey}" style="position:absolute;top:5px;right:5px;z-index:5;width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,0.85);background:${checked ? 'rgba(0,122,255,0.9)' : 'rgba(0,0,0,0.45)'};display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box">${checked ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><polyline points="20 6 9 17 4 12"/></svg>` : ''}</div>` : '';
    const popupAttr = m._editMode ? '' : ` data-lib-popup="${popupType}"${tmdbAttr}${tvdbAttr}${radarrAttr} data-title="${title}"`;

    const small = (m._libCols || 0) >= 8;
    const _b = (cls, icon, text) => small ? `<span class="badge ${cls}">${icon}</span>` : this._badge(cls, icon, text);

    let statusBadge = '';
    let badgeCls = '';
    if (!m._editMode) {
      let badgeHtml = '';
      if (isMovie) {
        const dlFailed = this._radarrQueueFailed?.has(item.id);
        const dlActive = this._radarrQueueActive?.has(item.id);
        if (item.hasFile && item.movieFile?.qualityCutoffNotMet) { badgeCls = 'b-cutoff'; badgeHtml = _b('b-cutoff', '⚡', this._t('libUpgrade')); }
        else if (item.hasFile)  { badgeCls = 'b-st-avail'; badgeHtml = _b('b-st-avail', '✓', this._t('badgeAvailable')); }
        else if (dlFailed)      { badgeCls = 'b-missing'; badgeHtml = _b('b-missing', '✗', this._t('badgeFailed')); }
        else if (dlActive)      { badgeCls = 'b-dl'; badgeHtml = _b('b-dl', '↓', this._t('badgeDownloading')); }
        else                    { badgeCls = 'b-missing'; badgeHtml = _b('b-missing', '✗', this._t('badgeMissing')); }
      } else {
        const fc = item.statistics?.episodeFileCount || 0;
        const tc2 = item.statistics?.episodeCount || 0;
        if (fc === 0 && tc2 > 0)  { badgeCls = 'b-missing'; badgeHtml = _b('b-missing', '✗', this._t('badgeMissing')); }
        else if (fc < tc2)        { badgeCls = 'b-partial'; badgeHtml = small ? `<span class="badge b-partial">${fc}</span>` : `<span class="badge b-partial">${fc}/<span class="b-txt">${tc2}</span></span>`; }
        else if (fc > 0 && item.status === 'continuing') { badgeCls = 'b-continuing'; badgeHtml = _b('b-continuing', '▶', this._t('badgeAvailable')); }
        else if (fc > 0)          { badgeCls = 'b-st-avail'; badgeHtml = _b('b-st-avail', '✓', this._t('badgeAvailable')); }
      }
      const showTag = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
      statusBadge = (badgeHtml && showTag) ? this._statusBadge(badgeHtml) : '';
    }
    const _libFc = item.statistics?.episodeFileCount || 0;
    const _libTc = item.statistics?.episodeCount || 0;
    const _libPp = !isMovie && badgeCls === 'b-partial' && _libTc > 0 ? Math.round((_libFc / _libTc) * 100) : -1;
    const _libSp = badgeCls === 'b-dl' ? this._dlPct(item.id, isMovie ? 'movie' : 'tv') : _libPp;
    const statusBar = showStripe ? this._statusStripe(badgeCls ? this._statusStripeColor(badgeCls) : this._libStatusColor(item), badgeCls === 'b-dl', _libSp) : '';

    let subBadge = '';
    let audioBadge = '';
    // Raw codes drive the flag strip; the tag builders stay for a revert
    let subCodes = [];
    let audioCodes = [];
    if (!m._editMode) {
      if (isMovie && item.hasFile) {
        if (pc.audio) {
          let audioLangs = [];
          if (Array.isArray(item.movieFile?.languages) && item.movieFile.languages.length > 0) {
            audioLangs = item.movieFile.languages.map(l => this._langCode(l.name || '')).filter(Boolean);
          } else if (item.movieFile?.mediaInfo?.audioLanguages) {
            audioLangs = item.movieFile.mediaInfo.audioLanguages.split(/\s*[\/,]\s*/).map(l => this._langCode(l.trim())).filter(Boolean);
          }
          if (audioLangs.length > 0) {
            audioCodes = audioLangs;
            audioBadge = this._badgeIcon('b-audio', 'mdi:volume-high', this._topLangs(audioLangs).join(' | '));
          }
        }
        if (pc.subtitles) {
          const bz = this._bazarrConfigured ? this._bazarr[item.id] : null;
          if (bz) {
            if (bz.missing.length > 0) {
              subCodes = [];
              subBadge = this._badgeIcon('b-sub-miss', 'mdi:subtitles-outline', this._topLangs(bz.missing.map(s => (s.code2 || s.name || '?').toUpperCase())).join(' | '));
            } else if (bz.subtitles.length > 0) {
              subCodes = bz.subtitles.map(s => (s.code2 || s.name || '?').toUpperCase());
              subBadge = this._badgeIcon('b-sub-ok', 'mdi:subtitles', this._topLangs(subCodes).join(' | '));
            }
          }
        }
      } else if (!isMovie && (item.statistics?.episodeFileCount ?? 0) > 0) {
        const inst = item._libInst || '1';
        if (pc.audio) {
          const cached = this._libTvAudioCache.get(`${inst}-${item.id}`);
          if (Array.isArray(cached) && cached.length) {
            audioCodes = cached;
            audioBadge = this._badgeIcon('b-audio', 'mdi:volume-high', this._topLangs(cached).join(' | '));
          } else if (cached === undefined) {
            this._fetchLibTvAudio(item.id, inst);
          }
        }
        const subs = this._tvSubInfo(item.id, inst);
        if (subs) {
          subCodes = subs.missing ? [] : subs.codes;
          subBadge = this._badgeIcon(subs.missing ? 'b-sub-miss' : 'b-sub-ok', subs.missing ? 'mdi:subtitles-outline' : 'mdi:subtitles', this._topLangs(subs.codes).join(' | '));
        }
      }
    }
    const flagStrip = this._ratingLangBlock({ ...item, _mediaType: isMovie ? 'movie' : 'tv' }, { subCodes, audioCodes, subBadge, audioBadge });

    return `
      <div class="mc"${popupAttr}>
        <div style="position:absolute;inset:0;overflow:hidden">${img}</div>
        ${this._mcGrad('rgba(0,0,0,0.7)', `${flagStrip}${pc.title ? `<div style="font-size:10px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>` : ''}`)}
        ${typeTag}
        ${statusBadge}
        ${this._goneBadge(item.tmdbId, isMovie ? null : item.tvdbId, isMovie, { compact: small })}
        ${checkHtml}
        ${statusBar}
      </div>`;
  }

  // ─── Overview card ────────────────────────────────────────────────────────

  _libOverviewCard(item) {
    if (item._libType === 'music') return this._libMusicOverviewCard(item);
    const isMovie = item._libType === 'movie';
    const poster  = isMovie ? this._getRadarrPoster(item) : this._getSonarrPoster(item);
    const title   = this._escHtml(item.title || '');
    const year    = item.year || '';
    const overview = this._escHtml((item.overview || '').slice(0, 160));
    const popupType = isMovie ? 'radarr' : 'sonarr';
    const tmdbAttr  = item.tmdbId ? ` data-tmdbid="${item.tmdbId}"` : '';
    const tvdbAttr  = (!isMovie && item.tvdbId) ? ` data-tvdbid="${item.tvdbId}"` : '';
    const radarrAttr = isMovie && item.id ? ` data-radarrid="${item.id}"` : '';
    const m = this._libModal;
    const selKey = `${item._libType}-${item._libInst||'1'}-${item.id}`;
    const checked = m._editMode && m._selected?.has(selKey);
    const checkHtml = m._editMode ? `<div data-lib-sel="${selKey}" style="width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,0.7);background:${checked ? 'rgba(0,122,255,0.9)' : 'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;align-self:center;box-sizing:border-box">${checked ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><polyline points="20 6 9 17 4 12"/></svg>` : ''}</div>` : '';
    const popupAttrs = m._editMode ? '' : ` data-lib-popup="${popupType}"${tmdbAttr}${tvdbAttr}${radarrAttr} data-title="${title}"`;
    const imgHtml = poster
      ? `<img src="${poster}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" onerror="this.style.display='none'">`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px">${isMovie ? '🎬' : '📺'}</div>`;

    const st = this._libTableStatus(item);
    const stBadge = st.cls ? this._uiBadge(st.label, this._libBadgeTone(st.cls)) : '';
    const sizeBytes = isMovie ? (item.movieFile?.size || 0) : (item.statistics?.sizeOnDisk || 0);
    const sizeTxt = sizeBytes ? fmtBytes(sizeBytes) : '';
    const profile = item.qualityProfileName || '';
    const seasons = !isMovie ? (item.statistics?.seasonCount || item.seasonCount || '') : '';
    const rightTags = [
      sizeTxt && this._uiBadge(sizeTxt, 'neutral'),
      profile && this._uiBadge(this._escHtml(profile), 'neutral'),
      seasons && this._uiBadge(`${seasons} season${seasons != 1 ? 's' : ''}`, 'neutral'),
    ].filter(Boolean).join('');

    return `<div class="lib-table-row"${popupAttrs} style="display:flex;gap:10px;align-items:flex-start;padding:8px;border-radius:8px;background:var(--is-row-hover,rgba(255,255,255,0.04))">
      ${checkHtml}
      <div style="width:42px;height:63px;flex-shrink:0;border-radius:5px;overflow:hidden;background:rgba(255,255,255,0.08)">${imgHtml}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px">
          <span style="font-size:12px;font-weight:700;color:var(--is-text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</span>
        </div>
        ${year ? `<div style="font-size:10px;color:var(--is-text-muted);margin-bottom:4px">${year}</div>` : ''}
        ${overview ? `<div style="font-size:10px;color:var(--is-text-muted);line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${overview}</div>` : ''}
      </div>
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px;align-self:center">
        ${this._ratingBadge({ ...item, _mediaType: isMovie ? 'movie' : 'tv' }, true)}
        ${stBadge}
        ${rightTags ? `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:flex-end">${rightTags}</div>` : ''}
      </div>
    </div>`;
  }

  // The same row as a film's, reading what an artist actually has: albums and
  // tracks in place of a year and a quality profile, and square artwork.
  _libMusicOverviewCard(artist) {
    const m = this._libModal;
    const name = this._escHtml(artist.artistName || artist.title || '');
    const overview = this._escHtml((artist.overview || '').slice(0, 160));
    const art = this._lidarrArtistImage(artist, 'poster', { w: 200 });
    const st = this._libTableStatus(artist);
    const stBadge = st.cls ? this._uiBadge(st.label, this._libBadgeTone(st.cls)) : '';
    const albums = artist.statistics?.albumCount ?? 0;
    const size = artist.statistics?.sizeOnDisk ? fmtBytes(artist.statistics.sizeOnDisk) : '';

    const tags = [
      size && this._uiBadge(size, 'neutral'),
      albums && this._uiBadge(`${albums} album${albums != 1 ? 's' : ''}`, 'neutral'),
    ].filter(Boolean).join('');
    const imgHtml = art
      ? `<img src="${art}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" onerror="this.style.display='none'">`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:16px">${this._escHtml(this._musInitials(artist.artistName || artist.title))}</div>`;

    return `<div class="lib-table-row${this._libFlashArtist && this._libFlashArtist === artist.id ? ' lib-flash' : ''}"${m._editMode ? '' : ` data-artist-id="${artist.id}"`} style="display:flex;gap:10px;align-items:center;height:79px;box-sizing:border-box;padding:8px;border-radius:8px;background:var(--is-row-hover,rgba(255,255,255,0.04))">
      <div style="width:63px;height:63px;flex-shrink:0;border-radius:5px;overflow:hidden;background:rgba(255,255,255,0.08)">${imgHtml}</div>
      <div style="flex:1;min-width:0;align-self:center">
        <div style="font-size:12px;font-weight:700;color:var(--is-text,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px">${name}</div>
        ${overview ? `<div style="font-size:10px;color:var(--is-text-muted);line-height:1.45;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${overview}</div>` : ''}
      </div>
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:4px;min-height:0;overflow:hidden">
        ${this._musRatingBadge(artist, true)}
        ${stBadge}
        ${tags ? `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:flex-end">${tags}</div>` : ''}
      </div>
    </div>`;
  }

}

export const libraryCardsMixin = _LibraryCardsMethods.prototype;
