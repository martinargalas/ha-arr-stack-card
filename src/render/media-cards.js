import { POPUP_TYPE } from '../constants.js';

// Emoji flags render as native art on Apple and Samsung, as flat rectangles on
// stock Android, and as two boxed letters on Windows — where Segoe UI Emoji has
// no flag glyphs at all. Drawn SVG is the only option that looks the same
// everywhere. Set to false to fall back to the platform's own emoji.
export const FLAT_SVG_FLAGS = true;

class _MediaCardMethods {

// Maintainerr's deletion queue, looked up the way the rest of the card knows
// its titles. Returns null when Maintainerr is not configured or the title is
// not queued, so callers can drop the badge with no extra guard.
_goneInfo(tmdbId, tvdbId, isMovie) {
  // Maintainerr's own tabs render the badge through _mtDelBadge and are not
  // affected by this setting — 'maintainerr' means "only there".
  if (this._posterCfg().goneTag !== 'all') return null;
  const ext = this._mtDelExt;
  if (!ext || !ext.size) return null;
  if (isMovie) return (tmdbId && ext.get(`mv:${tmdbId}`)) || null;
  return (tvdbId && ext.get(`tv:tvdb:${tvdbId}`))
    || (tmdbId && ext.get(`tv:tmdb:${tmdbId}`))
    || null;
}

// Centred over the poster, below the type tag. `compact` shrinks the wording to
// "3D" for tiles too small to carry the full sentence.
_goneBadge(tmdbId, tvdbId, isMovie, { compact = false, top = 26 } = {}) {
  const info = this._goneInfo(tmdbId, tvdbId, isMovie);
  if (!info) return '';
  const prefix = info.seasons?.length ? this._mtSeasonLabel(info.seasons) : '';
  const badge = this._mtDelBadge(info.due, compact, prefix, true);
  if (!badge) return '';
  // 6px inset on both sides — the same margin .media-type-tag uses — so the
  // badge lines up with it on the left and sits evenly within the poster.
  return `<div style="position:absolute;top:${top}px;left:6px;right:6px;z-index:4;display:flex;pointer-events:none">${badge}</div>`;
}

_statusBadge(html) {
  return `<div style="position:absolute;top:6px;right:6px;z-index:2;display:flex;align-items:flex-start">${html}</div>`;
}

_getRadarrPoster(m) {
  if (!m.images) return null;
  const img = m.images.find(i => i.coverType === 'poster');
  return img ? img.remoteUrl : null;
}

_getSonarrPoster(s) {
  if (!s.images) return null;
  const img = s.images.find(i => i.coverType === 'poster');
  return img ? img.remoteUrl : null;
}

_renderRadarrCard(m) {
  const pc = this._posterCfg();
  const poster = this._getRadarrPoster(m);
  const title  = this._escHtml(m.title || 'Unknown');
  const grad = 'rgba(0,0,0,0.88)';
  const tc   = 'rgba(var(--arr-pt-rgb, 255, 255, 255), 1)';
  const hasFile      = m.hasFile;
  const cutoffNotMet = m.movieFile?.qualityCutoffNotMet;
  const dlFailed     = this._radarrQueueFailed.has(m.id);
  const dlActive     = this._radarrQueueActive.has(m.id);
  let badgeCls = '';
  if (hasFile && cutoffNotMet) badgeCls = 'b-cutoff';
  else if (hasFile)  badgeCls = 'b-st-avail';
  else if (dlFailed) badgeCls = 'b-missing';
  else if (dlActive) badgeCls = 'b-dl';
  else               badgeCls = 'b-missing';
  let badgeHtml = '';
  if (badgeCls === 'b-cutoff')   badgeHtml = this._badge('b-cutoff', '⚡', 'Upgrade');
  else if (badgeCls === 'b-st-avail') badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable'));
  else if (badgeCls === 'b-dl')       badgeHtml = this._badge('b-dl', '↓', this._t('badgeDownloading'));
  else if (dlFailed)                  badgeHtml = this._badge('b-missing', '✗', this._t('badgeFailed'));
  else                                badgeHtml = this._badge('b-missing', '✗', this._t('badgeMissing'));
  const showTag = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
  const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
  const statusBadge = (badgeHtml && showTag) ? this._statusBadge(badgeHtml) : '';
  const stripe = showStripe ? this._statusStripe(this._statusStripeColor(badgeCls), badgeCls === 'b-dl', this._dlPct(m.id, 'movie', m._isRadarr2 ? 'radarr2' : 'radarr')) : '';
  const qualBadge4k = this._qualityBadge2(m);
  // Old per-kind tags stay built but unrendered — kept so the flag strip can be
  // swapped back out without reconstructing this logic.
  let audioBadge = '';
  let subBadge = '';
  let audioCodes = [];
  let subCodes = [];
  if (hasFile) {
    if (pc.audio) {
      let audioLangs = [];
      if (Array.isArray(m.movieFile?.languages) && m.movieFile.languages.length > 0) {
        audioLangs = m.movieFile.languages.map(l => this._langCode(l.name || '')).filter(Boolean);
      } else if (m.movieFile?.mediaInfo?.audioLanguages) {
        audioLangs = m.movieFile.mediaInfo.audioLanguages.split(/\s*[\/,]\s*/).map(l => this._langCode(l.trim())).filter(Boolean);
      }
      if (audioLangs.length > 0) {
        audioCodes = audioLangs;
        const codes = this._topLangs(audioLangs).join(' | ');
        audioBadge = this._badgeIcon('b-audio', 'mdi:volume-high', codes);
      }
    }
    if (pc.subtitles) {
      const bz = this._bazarrConfigured ? this._bazarr[m.id] : null;
      if (bz) {
        if (bz.missing.length > 0) {
          subCodes = [];
          const langs = this._topLangs(bz.missing.map(s => (s.code2 || s.name || '?').toUpperCase())).join(' | ');
          subBadge = this._badgeIcon('b-sub-miss', 'mdi:subtitles-outline', langs);
        } else if (bz.subtitles.length > 0) {
          subCodes = bz.subtitles.map(s => (s.code2 || s.name || '?').toUpperCase());
          const langs = this._topLangs(subCodes).join(' | ');
          subBadge = this._badgeIcon('b-sub-ok', 'mdi:subtitles', langs);
        }
      }
    }
  }
  const img = this._mcImg(poster, '🎬', m.id);
  return `
    <div class="mc" data-popup="${POPUP_TYPE.RADARR}" data-tmdbid="${m.tmdbId}" data-title="${title}">
      ${img}
      ${statusBadge}
      ${this._goneBadge(m.tmdbId, null, true)}
      ${this._mcGrad(grad, `${this._ratingLangBlock(m, { subCodes, audioCodes, subBadge, audioBadge, extraBadge: qualBadge4k })}
        ${pc.title ? `<div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>` : ''}`)}
      ${stripe}
    </div>`;
}

_renderSonarrCard(s) {
  const pc = this._posterCfg();
  const poster = this._getSonarrPoster(s);
  const title  = this._escHtml(s.title || 'Unknown');
  const grad = 'rgba(0,0,0,0.88)';
  const tc   = 'rgba(var(--arr-pt-rgb, 255, 255, 255), 1)';
  const stats      = s.statistics || {};
  const fileCount  = stats.episodeFileCount || 0;
  const totalCount = stats.episodeCount || 0;
  let badgeCls = '';
  let badgeHtml = '';
  if (fileCount === 0 && totalCount > 0) {
    badgeCls = 'b-missing';
    badgeHtml = this._badge('b-missing', '✗', this._t('badgeMissing'));
  } else if (fileCount < totalCount) {
    badgeCls = 'b-partial';
    badgeHtml = `<span class="badge b-partial">${fileCount}/<span class="b-txt">${totalCount}</span></span>`;
  } else if (totalCount > 0 && s.status === 'continuing') {
    badgeCls = 'b-continuing';
    badgeHtml = this._badge('b-continuing', '▶', this._t('badgeAvailable'));
  } else if (totalCount > 0) {
    badgeCls = 'b-st-avail';
    badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable'));
  }
  const showTag = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
  const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
  const statusBadge = (badgeHtml && showTag) ? this._statusBadge(badgeHtml) : '';
  const partialPct = badgeCls === 'b-partial' && totalCount > 0 ? Math.round((fileCount / totalCount) * 100) : -1;
  const stripePct = badgeCls === 'b-dl' ? this._dlPct(s.id, 'tv', s._isSonarr2 ? 'sonarr2' : 'sonarr') : partialPct;
  const stripe = (badgeCls && showStripe) ? this._statusStripe(this._statusStripeColor(badgeCls), badgeCls === 'b-dl', stripePct) : '';
  const img = this._mcImg(poster, '📺', s.id);
  // Audio languages live on the episode files, so they are fetched per series
  // and cached — the same lazy path the Library modal uses. Bazarr's subtitle
  // data is per episode file with no series-level rollup, so shows carry audio
  // flags only.
  let audioCodes = [];
  const _snInst = s._isSonarr2 ? '2' : '1';
  if (pc.audio && totalCount > 0) {
    const cached = this._libTvAudioCache.get(`${_snInst}-${s.id}`);
    if (Array.isArray(cached) && cached.length) audioCodes = cached;
    else if (cached === undefined) this._fetchLibTvAudio(s.id, _snInst);
  }
  const _snSubs = totalCount > 0 ? this._tvSubInfo(s.id, _snInst) : null;
  return `
    <div class="mc" data-popup="${POPUP_TYPE.SONARR}" data-tvdbid="${s.tvdbId}" data-tmdbid="${s.tmdbId || ''}" data-title="${title}">
      ${this._goneBadge(s.tmdbId, s.tvdbId, false)}
      ${img}
      ${statusBadge}
      ${this._mcGrad(grad, `${this._ratingLangBlock(s, {
        audioCodes,
        subCodes: (_snSubs && !_snSubs.missing) ? _snSubs.codes : [],
        audioBadge: audioCodes.length ? this._badgeIcon('b-audio', 'mdi:volume-high', this._topLangs(audioCodes).join(' | ')) : '',
        subBadge: _snSubs ? this._badgeIcon(_snSubs.missing ? 'b-sub-miss' : 'b-sub-ok', _snSubs.missing ? 'mdi:subtitles-outline' : 'mdi:subtitles', this._topLangs(_snSubs.codes).join(' | ')) : '',
      })}
        ${pc.title ? `<div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>` : ''}`)}
      ${stripe}
    </div>`;
}

_renderRecentlyAddedCard(item) {
  if (item._mediaType === 'music') return this._renderMusicCard(item);
  const pc = this._posterCfg();
  const isMovie = item._mediaType === 'movie';
  const poster  = isMovie ? this._getRadarrPoster(item) : this._getSonarrPoster(item);
  const title   = this._escHtml(item.title || 'Unknown');
  const typeTag = isMovie ? this._t('typeMovie') : this._t('typeTv');
  const popup   = isMovie ? POPUP_TYPE.RADARR : POPUP_TYPE.SONARR;
  const grad = 'rgba(0,0,0,0.88)';
  const tc   = 'rgba(var(--arr-pt-rgb, 255, 255, 255), 1)';
  const img = this._mcImg(poster, isMovie ? '🎬' : '📺', item.id);
  const tvdbAttr   = !isMovie && item.tvdbId ? ` data-tvdbid="${item.tvdbId}"` : '';
  const tmdbAttr   = item.tmdbId ? ` data-tmdbid="${item.tmdbId}"` : '';
  const radarrAttr = isMovie
    ? (item._isRadarr2 ? ` data-radarr2id="${item.id}"` : ` data-radarrid="${item.id}"`)
    : '';
  let badgeCls = '';
  let badgeHtml = '';
  if (isMovie) {
    if (item.movieFile?.qualityCutoffNotMet) {
      badgeCls = 'b-cutoff';
      badgeHtml = this._badge('b-cutoff', '⚡', 'Upgrade');
    } else {
      badgeCls = 'b-st-avail';
      badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable'));
    }
  } else {
    const fileCount  = item.statistics?.episodeFileCount ?? 0;
    const totalCount = item.statistics?.episodeCount ?? 0;
    const isPartial  = totalCount > 0 && fileCount < totalCount;
    const importEps = item._isSonarr2 ? (this._sonarr2ImportEps || {}) : (this._sonarrImportEps || {});
    const imp       = importEps[item.id];
    if (imp && imp.length > 0) {
      if (isPartial) {
        badgeCls = 'b-partial';
        badgeHtml = `<span class="badge b-partial">${fileCount}/<span class="b-txt">${totalCount}</span></span>`;
      } else {
        const epLabel = this._importEpLabel(imp);
        badgeCls = 'b-st-avail';
        badgeHtml = this._badge('b-st-avail', '✓', epLabel || this._t('badgeAvailable'));
      }
    } else {
      const epFile = this._sonarrEpFiles?.[item.id];
      if (epFile) {
        if (isPartial) {
          badgeCls = 'b-partial';
          badgeHtml = `<span class="badge b-partial">${fileCount}/<span class="b-txt">${totalCount}</span></span>`;
        } else {
          const match = (epFile.relativePath || '').match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
          badgeCls = 'b-st-avail';
          badgeHtml = match
            ? this._badge('b-st-avail', '✓', `S${String(match[1]).padStart(2,'0')}E${String(match[2]).padStart(2,'0')}`)
            : this._badge('b-st-avail', '✓', this._t('badgeAvailable'));
        }
      } else {
        if (isPartial) {
          badgeCls = 'b-partial';
          badgeHtml = `<span class="badge b-partial">${fileCount}/<span class="b-txt">${totalCount}</span></span>`;
        } else {
          badgeCls = 'b-st-avail';
          badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable'));
        }
      }
    }
  }
  const showTag = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
  const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
  const statusBadge = (badgeHtml && showTag) ? this._statusBadge(badgeHtml) : '';
  const _partialPct = !isMovie && badgeCls === 'b-partial' && (item.statistics?.episodeCount || 0) > 0 ? Math.round(((item.statistics?.episodeFileCount || 0) / (item.statistics?.episodeCount || 1)) * 100) : -1;
  const _stripePct = badgeCls === 'b-dl'
    ? this._dlPct(item.id, isMovie ? 'movie' : 'tv',
        isMovie ? (item._isRadarr2 ? 'radarr2' : 'radarr') : (item._isSonarr2 ? 'sonarr2' : 'sonarr'))
    : _partialPct;
  const stripe = (badgeCls && showStripe) ? this._statusStripe(this._statusStripeColor(badgeCls), badgeCls === 'b-dl', _stripePct) : '';
  let audioBadge = '';
  let subBadge = '';
  // Raw codes for the flag strip; the tag builders below are kept for a revert
  let audioCodes = [];
  let subCodes = [];
  if (isMovie) {
    if (pc.audio) {
      let audioLangs = [];
      if (Array.isArray(item.movieFile?.languages) && item.movieFile.languages.length > 0) {
        audioLangs = item.movieFile.languages.map(l => this._langCode(l.name || '')).filter(Boolean);
      } else if (item.movieFile?.mediaInfo?.audioLanguages) {
        audioLangs = item.movieFile.mediaInfo.audioLanguages.split(/\s*[\/,]\s*/).map(l => this._langCode(l.trim())).filter(Boolean);
      }
      if (audioLangs.length > 0) {
        audioCodes = audioLangs;
        const codes = this._topLangs(audioLangs).join(' | ');
        audioBadge = this._badgeIcon('b-audio', 'mdi:volume-high', codes);
      }
    }
    if (pc.subtitles) {
      const bz = this._bazarrConfigured ? this._bazarr[item.id] : null;
      if (bz) {
        if (bz.missing.length > 0) {
          subCodes = [];
          const langs = this._topLangs(bz.missing.map(s => (s.code2 || s.name || '?').toUpperCase())).join(' | ');
          subBadge = this._badgeIcon('b-sub-miss', 'mdi:subtitles-outline', langs);
        } else if (bz.subtitles.length > 0) {
          subCodes = bz.subtitles.map(s => (s.code2 || s.name || '?').toUpperCase());
          const langs = this._topLangs(subCodes).join(' | ');
          subBadge = this._badgeIcon('b-sub-ok', 'mdi:subtitles', langs);
        }
      }
    }
  } else {
    const epFile = this._sonarrEpFiles?.[item.id];
    if (epFile) {
      if (pc.audio) {
        let audioLangs = [];
        if (Array.isArray(epFile.languages) && epFile.languages.length > 0) {
          audioLangs = epFile.languages.map(l => this._langCode(l.name || '')).filter(Boolean);
        } else if (epFile.mediaInfo?.audioLanguages) {
          audioLangs = epFile.mediaInfo.audioLanguages.split(/\s*[\/,]\s*/).map(l => this._langCode(l.trim())).filter(Boolean);
        }
        if (audioLangs.length > 0) {
          audioCodes = audioLangs;
          const codes = this._topLangs(audioLangs).join(' | ');
          audioBadge = this._badgeIcon('b-audio', 'mdi:volume-high', codes);
        }
      }
      if (pc.subtitles) {
        const bze = this._bazarrConfigured ? this._bazarrEpisodes?.[epFile.id] : null;
        if (bze) {
          if (bze.missing.length > 0) {
            subCodes = [];
            const langs = this._topLangs(bze.missing.map(s => (s.code2 || s.name || '?').toUpperCase())).join(' | ');
            subBadge = this._badgeIcon('b-sub-miss', 'mdi:subtitles-outline', langs);
          } else if (bze.subtitles.length > 0) {
            subCodes = bze.subtitles.map(s => (s.code2 || s.name || '?').toUpperCase());
            const langs = this._topLangs(subCodes).join(' | ');
            subBadge = this._badgeIcon('b-sub-ok', 'mdi:subtitles', langs);
          }
        } else if (epFile.mediaInfo?.subtitles) {
          subCodes = epFile.mediaInfo.subtitles.split(/\s*[\/,]\s*/).map(l => this._langCode(l.trim())).filter(Boolean);
          const subLangs = this._topLangs(subCodes).join(' | ');
          if (subLangs) subBadge = this._badgeIcon('b-sub-ok', 'mdi:subtitles', subLangs);
        }
      }
    }
  }
  // _sonarrEpFiles only holds series the episode-file fetch covered, and it is
  // one file rather than the whole run — fall back to the per-series lookup the
  // other TV cards use so every show resolves the same way.
  if (!isMovie && !audioCodes.length && pc.audio) {
    const l = this._arrLangCodes(item, false);
    if (l.audioCodes.length) {
      audioCodes = l.audioCodes;
      audioBadge = this._badgeIcon('b-audio', 'mdi:volume-high', this._topLangs(audioCodes).join(' | '));
    }
  }
  if (!isMovie && !subCodes.length) {
    const l = this._arrLangCodes(item, false);
    if (l.subCodes.length) {
      subCodes = l.subCodes;
      subBadge = this._badgeIcon('b-sub-ok', 'mdi:subtitles', this._topLangs(subCodes).join(' | '));
    }
  }

  let epBadge = '';
  if (!isMovie) {
    const importEps = item._isSonarr2 ? (this._sonarr2ImportEps || {}) : (this._sonarrImportEps || {});
    const imp = importEps[item.id];
    if (imp) {
      const epLabel = this._importEpLabel(imp);
      if (epLabel) epBadge = `<span class="badge b-ep">${epLabel}</span>`;
    } else {
      const epFile = this._sonarrEpFiles?.[item.id];
      if (epFile) {
        const match = (epFile.relativePath || '').match(/[Ss](\d{1,2})[Ee](\d{1,3})/);
        if (match) epBadge = `<span class="badge b-ep">S${String(match[1]).padStart(2,'0')}E${String(match[2]).padStart(2,'0')}</span>`;
      }
    }
  }
  return `
    <div class="mc" data-popup="${popup}"${tmdbAttr}${tvdbAttr}${radarrAttr} data-title="${title}">
      ${this._goneBadge(item.tmdbId, item.tvdbId, !!isMovie)}
      ${img}
      <div style="position:absolute;top:6px;left:6px;z-index:2;display:flex;flex-direction:column;gap:3px;align-items:flex-start">
        ${pc.mediaType ? `<span class="media-type-tag" style="position:static">${typeTag}</span>` : ''}
        ${epBadge}
      </div>
      ${statusBadge}
      ${this._mcGrad(grad, `${this._ratingLangBlock(item, { subCodes, audioCodes, subBadge, audioBadge })}
        ${pc.title ? `<div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>` : ''}`)}
      ${stripe}
    </div>`;
}

_renderRecentlyRequestedCard(item) {
  if (item._mediaType === 'music') return this._renderMusicCard(item, { requested: true });
  const pc = this._posterCfg();
  const isMovie = item._mediaType === 'movie';
  // A request can point at something no *arr holds — approval still pending, or
  // deleted again since. Then the poster and the popup have to work off the
  // request's own data instead of a library entry.
  const seerrOnly = !!item._seerrOnly;
  const arrPoster = isMovie ? this._getRadarrPoster(item) : this._getSonarrPoster(item);
  const poster  = arrPoster || (item._seerrPoster
    ? (item._seerrPoster.startsWith('http') ? item._seerrPoster : `https://image.tmdb.org/t/p/w342${item._seerrPoster}`)
    : null);
  const title   = this._escHtml(item.title || 'Unknown');
  const typeTag = isMovie ? this._t('typeMovie') : this._t('typeTv');
  const popup   = seerrOnly
    ? (isMovie ? POPUP_TYPE.MOVIE : POPUP_TYPE.TV)
    : (isMovie ? POPUP_TYPE.RADARR : POPUP_TYPE.SONARR);
  const grad = 'rgba(0,0,0,0.88)';
  const tc   = 'rgba(var(--arr-pt-rgb, 255, 255, 255), 1)';
  const img = this._mcImg(poster, isMovie ? '🎬' : '📺', item.id || item.tmdbId);
  const tvdbAttr   = !isMovie && item.tvdbId ? ` data-tvdbid="${item.tvdbId}"` : '';
  const tmdbAttr   = item.tmdbId ? ` data-tmdbid="${item.tmdbId}"` : '';
  const radarrAttr = (isMovie && item.id)
    ? (item._isRadarr2 ? ` data-radarr2id="${item.id}"` : ` data-radarrid="${item.id}"`)
    : '';
  let badgeCls = '';
  let badgeHtml = '';
  const dlActive = item.id != null && (isMovie
    ? (item._isRadarr2 ? this._radarr2QueueActive : this._radarrQueueActive)?.has(item.id)
    : (item._isSonarr2 ? this._sonarr2QueueSeriesPct : this._sonarrQueueSeriesPct)?.has(item.id));
  const dlFailed = isMovie && item.id != null
    && (item._isRadarr2 ? this._radarr2QueueFailed : this._radarrQueueFailed)?.has(item.id);
  if (dlFailed)      { badgeCls = 'b-missing'; badgeHtml = this._badge('b-missing', '✗', this._t('badgeFailed')); }
  else if (dlActive) { badgeCls = 'b-dl';      badgeHtml = this._badge('b-dl', '↓', this._t('badgeDownloading')); }
  else if (item._seerr) {
    // Declined and awaiting-approval have no equivalent in Radarr or Sonarr, so
    // they can only ever come from Seerr.
    if (item._seerrStatus === 3)      { badgeCls = 'b-missing';  badgeHtml = this._badge('b-missing', '✗', this._t('badgeDeclined')); }
    else if (item._seerrMedia === 5)  { badgeCls = 'b-st-avail'; badgeHtml = this._badge('b-st-avail', '✓', this._t('badgeAvailable')); }
    else if (item._seerrMedia === 4)  { badgeCls = 'b-partial';  badgeHtml = this._badge('b-partial', '◐', this._t('badgePartial')); }
    else if (item._seerrStatus === 1) { badgeCls = 'b-st-pend'; badgeHtml = this._badge('b-st-pend', '⏳', this._t('badgeRequested')); }
    else                              { badgeCls = 'b-missing';  badgeHtml = this._badge('b-missing', '✗', this._t('badgeMissing')); }
  }
  else               { badgeCls = 'b-missing'; badgeHtml = this._badge('b-missing', '✗', this._t('badgeMissing')); }
  const showTag = pc.statusDisplay === 'tags' || pc.statusDisplay === 'both';
  const showStripe = pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both';
  const statusBadge = (badgeHtml && showTag) ? this._statusBadge(badgeHtml) : '';
  const stripe = (badgeCls && showStripe) ? this._statusStripe(this._statusStripeColor(badgeCls), badgeCls === 'b-dl', item.id != null
        ? this._dlPct(item.id, isMovie ? 'movie' : 'tv',
            isMovie ? (item._isRadarr2 ? 'radarr2' : 'radarr') : (item._isSonarr2 ? 'sonarr2' : 'sonarr'))
        : -1) : '';
  const _rqLangs = seerrOnly ? [] : this._arrLangCodes(item, isMovie);
  return `
    <div class="mc" data-popup="${popup}"${tmdbAttr}${tvdbAttr}${radarrAttr} data-title="${title}">
      ${this._goneBadge(item.tmdbId, item.tvdbId, !!isMovie)}
      ${img}
      ${pc.mediaType ? `<span class="media-type-tag">${typeTag}</span>` : ''}
      ${statusBadge}
      ${this._mcGrad(grad, `${this._ratingLangBlock(item, _rqLangs)}
        ${pc.title ? `<div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>` : ''}`)}
      ${stripe}
    </div>`;
}
}

export const mediaCardsMixin = _MediaCardMethods.prototype;
