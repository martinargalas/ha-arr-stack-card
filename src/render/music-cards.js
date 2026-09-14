// A music card: the artist or album, its initials when there is no picture, its rating. Split out of render/media-cards.js.

class _MusicCardsMethods {

// A missing portrait falls back to initials — two of them when the name has
// more than one word, which is what tells "Alan Walker" from "ABBA".
_musInitials(name) {
  const words = String(name || '?').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const take = words.length > 1 ? words.slice(0, 2) : words.slice(0, 1);
  return take.map(w => [...w][0].toUpperCase()).join('');
}

_musRatingBadge(artist, inline = false, solid = false) {
  if (!inline && !this._posterCfg().rating) return '';
  const v = artist?.ratings?.value;
  if (!v) return '';
  const display = (Math.round(v * 10) / 10).toFixed(1);
  const votes = artist?.ratings?.votes;
  const tip = votes ? ` title="MusicBrainz · ${votes} ${votes === 1 ? 'vote' : 'votes'}"` : ' title="MusicBrainz"';
  if (solid) {
    const sty = 'border-color:transparent;background:rgba(186,71,143,0.85);color:#fff;text-shadow:none';
    const num = 'line-height:1;display:block;margin-top:-1px;font-variant-numeric:tabular-nums';
    return `<span class="imdb"${tip} style="${sty};padding:2px 5px;gap:3px"><span style="${num}">${display}</span></span>`;
  }
  const icon = `<svg width="22" height="11" viewBox="0 0 64 28" style="flex-shrink:0"><rect width="64" height="28" rx="4" fill="#BA478F"/><text x="32" y="21" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="900" fill="#fff">MB</text></svg>`;
  const sty = 'border-color:rgba(186,71,143,0.45);background:rgba(186,71,143,0.22)';
  const badge = `<span class="imdb"${tip} style="${sty};padding:2px 3px;gap:3px">${icon}<span style="line-height:1;display:block;margin-top:-1px">${display}</span></span>`;
  return inline ? badge : `<div style="margin-bottom:3px">${badge}</div>`;
}

// The row lists artists, the way Lidarr's own library does — and the way this
// card already treats series. Artist artwork is square (measured: 1000x1000),
// the grid is 2:3, so the portrait sits over the artist's own fanart rather
// than being cropped or leaving the row a third shorter than every other one.
_renderMusicCard(entry, { noSub = false, noStatus = false, requested = false } = {}) {
  const pc      = this._posterCfg();
  const artist  = entry.artist || {};
  const album   = entry.newestAlbum || null;
  const front   = this._lidarrArtistImage(artist, 'poster', { w: 360 }) || (album ? this._lidarrCover(album) : null);
  const back    = this._lidarrArtistImage(artist, 'fanart', { w: 360 }) || (album ? this._lidarrCover(album) : null);
  const name    = this._escHtml(artist.artistName || 'Unknown');
  const sub     = noSub ? '' : (entry.newAlbumCount > 1
    ? `${entry.newAlbumCount} ${this._t('musicNewAlbums')}`
    : this._escHtml(album?.title || ''));

  // Lidarr counts tracks twice over: trackCount is what the monitored albums
  // hold, totalTrackCount everything the artist ever released. The difference
  // is what separates a finished artist from one that is merely finished as
  // far as it was asked to be — Mary Gu reads 15/15 monitored against 25 in all.
  const ast   = artist.statistics || {};
  const st    = (ast.totalTrackCount !== undefined ? ast : (album?.statistics || {}));
  const have  = st.trackFileCount ?? 0;
  const total = st.trackCount ?? 0;           // monitored tracks — what is wanted
  const allTr = st.totalTrackCount ?? total;  // every track, monitored or not
  const dlAlbum  = album && this._lidarrQueue?.has(album.id);
  const dlArtist = this._lidarrQueueArtists?.get(artist.id);
  const dl = dlAlbum || dlArtist !== undefined;

  let badgeCls = '';
  let badgeHtml = '';
  if (dl)                              { badgeCls = 'b-dl';       badgeHtml = this._badge('b-dl', '↓', this._t('badgeDownloading')); }
  // Everything wanted is here. Green only if that is also everything there is;
  // an artist with albums left unmonitored is complete on its own terms, which
  // is Lidarr's blue rather than its green.
  else if (total > 0 && have >= total) {
    badgeCls  = allTr > total ? 'b-continuing' : 'b-st-avail';
    badgeHtml = this._badge(badgeCls, '✓', this._t('badgeAvailable'));
  }
  // Counts rather than a symbol, the way a part-downloaded series reads.
  else if (have > 0)                   { badgeCls = 'b-partial';  badgeHtml = `<span class="badge b-partial">${have}/<span class="b-txt">${total}</span></span>`; }
  else                                 { badgeCls = 'b-missing';  badgeHtml = this._badge('b-missing', '✗', this._t('badgeMissing')); }

  const showTag    = !noStatus && (pc.statusDisplay === 'tags' || pc.statusDisplay === 'both');
  const showStripe = !noStatus && (pc.statusDisplay === 'stripes' || pc.statusDisplay === 'both');
  const statusBadge = (badgeHtml && showTag) ? this._statusBadge(badgeHtml) : '';
  const dlPct = dlAlbum ? (this._lidarrQueuePct?.get(album.id) ?? -1) : (dlArtist ?? -1);
  const pct = badgeCls === 'b-dl'
    ? dlPct
    : (requested ? -1 : ((total > 0 && have < total && have > 0) ? Math.round((have / total) * 100) : -1));
  const stripeCls = (requested && badgeCls !== 'b-dl') ? 'b-missing' : badgeCls;
  // Nothing of what is monitored is here yet: that is waiting, not failure, so
  // it reads as the neutral bar rather than the red one a part-filled artist
  // gets. A request in Recently Requested keeps its red — it was asked for.
  const stripeColor = (stripeCls === 'b-missing' && !requested)
    ? '#555'
    : this._statusStripeColor(stripeCls);
  const stripe = (badgeCls && showStripe)
    ? this._statusStripe(stripeColor, badgeCls === 'b-dl', pct)
    : '';

  // The backdrop is decoration, so it goes in performance mode — that setting
  // exists to keep blur off weaker devices.
  const perf = this._cfgGet('styles', 'performanceMode', false);
  const backLayer = (!perf && back)
    ? `<img src="${back}" class="mus-back" loading="lazy" aria-hidden="true" onerror="this.style.display='none'">`
    : '';
  const frontEl = front
    ? `<img src="${front}" class="mus-cover" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="mus-cover mus-cover-ph">${this._escHtml(this._musInitials(artist.artistName))}</div>`;

  const grad = 'rgba(0,0,0,0.88)';
  const tc   = 'rgba(var(--arr-pt-rgb, 255, 255, 255), 1)';
  return `
    <div class="mc mc-music${backLayer ? '' : ' mus-flat'}${this._libFlashArtist && this._libFlashArtist === artist.id ? ' lib-flash' : ''}"${this._isDay
      ? ` style="${backLayer ? '' : 'background:rgba(0,0,0,0.05);'}border-color:rgba(0,0,0,0.14);box-shadow:inset 0 1px 0 rgba(255,255,255,0.35)"`
      : ''} data-artist-id="${artist.id}" data-title="${name}">
      ${backLayer}
      <div class="mus-scrim"></div>
      ${frontEl}
      ${pc.mediaType ? `<span class="media-type-tag">${this._t('typeArtist')}</span>` : ''}
      ${statusBadge}
      ${this._mcGrad(grad, `${this._flagStrip(
        [], this._musOrigin(artist),
        pc.rating ? this._musRatingBadge(artist, true, true) : '',
        { endIcon: false }
      )}${pc.title ? `<div style="font-size:10px;font-weight:600;color:${tc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>` : ''}
        ${sub ? `<div style="font-size:9px;color:rgba(var(--arr-pt-rgb,255,255,255),0.66);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</div>` : ''}`)}
      ${stripe}
    </div>`;
}

}

export const musicCardsMixin = _MusicCardsMethods.prototype;
