// A film's detail on a phone has a sheet of posters along the bottom, as a
// series has its seasons and an artist his albums: the films of its
// collection (Harry Potter's eight), or, for a film in none, those Seerr (or
// TMDB) recommends. The trailer is a button on the picture. The sheet is the seasons' own
// (.sn-tiles-sheet, laid out and dragged by _ppWireSnTiles); a tile opens
// that film, and closing it comes back to the one it was opened from.

import { sheetChevSvg } from '../shared/ui.js';

class _FilmSheetMethods {
  _ppMvSheetOn(d) {
    return !!this._isMob && !!d && (d._type === 'radarr' || d._type === 'movie') && !!(d.id || d.tmdbId);
  }

  // Asked once a film, and again when its collection becomes known (Seerr's
  // detail, or TMDB's arriving after the library's own data)
  _ppMvLoad(d) {
    const id = d.id || d.tmdbId;
    const col = d.collection?.id || null;
    const key = col ? `c${col}` : 's';
    if (d._mvKey === key || (d._mvKey && d._mvKey.startsWith('c'))) return;
    d._mvKey = key;
    const seerr = this._overseerrConfigured !== false;
    const done = (kind, name, items) => {
      if (this._popup !== d || d._mvKey !== key) return;
      d._mvSheet = { kind, name, items };
      this._renderPopupEl();
    };
    const recommended = async () => {
      let items = [];
      if (seerr) {
        const r = await this._callApi('GET', `arr_stack/overseerr/movie/${id}/recommendations?page=1`).catch(() => null);
        items = r?.results || [];
      }
      if (!items.length) {
        const r = await this._callApi('GET', `arr_stack/tmdb/similar?type=movie&id=${id}&kw=`).catch(() => null);
        items = (r?.recommendations?.length ? r.recommendations : r?.similar) || [];
      }
      done('similar', '', items.filter(i => i?.id && (i.mediaType || 'movie') === 'movie').slice(0, 20));
    };
    if (!col) { recommended(); return; }
    this._callApi('GET', `arr_stack/${seerr ? 'overseerr' : 'tmdb'}/collection/${col}`).then(c => {
      const parts = (c?.parts || []).filter(p => p?.id)
        .sort((a, b) => String(a.releaseDate || '9999').localeCompare(String(b.releaseDate || '9999')));
      if (parts.length > 1) done('collection', c.name || d.collection.name || '', parts);
      else recommended();
    }).catch(recommended);
  }

  _ppMvTilesHtml(d) {
    if (!this._ppMvSheetOn(d)) return '';
    this._ppMvLoad(d);
    const sh = d._mvSheet;
    if (!sh?.items?.length) return '';
    const cur = Number(d.id || d.tmdbId);
    // Each poster as the posters everywhere else (the rows' film card: type
    // tag, status, rating, title), without its request button: a request is
    // made in the film's detail. Not a card the page wires to open its own
    // detail (that would lose the way back): the tile around it opens it.
    const tiles = sh.items.map(it => {
      const id = Number(it.id);
      const title = it.title || it.name || '';
      const card = this._renderUpcomingCard({ ...it, id, title }, { showDate: false, typeTag: this._t('typeMovie'), reqKey: `mv-${id}` })
        .replace(/<div class="mc" data-popup="[^"]*"/, '<div class="mc mv-mc"')
        .replace(/<div style="position:absolute;bottom:8px;right:10px">[\s\S]*?<\/button><\/div>/, '')
        .replace(';padding-right:20px', '')
        // Named, so a folded sheet can lift the title and the bar to the
        // posters' top edge, the only part that shows then
        .replace('<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top', '<div class="mv-grad" style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top')
        .replace('<div style="position:absolute;bottom:0;left:0;right:0;height:4px', '<div class="mv-stripe" style="position:absolute;bottom:0;left:0;right:0;height:4px')
        .replace('<div style="font-size:10px;font-weight:600;', '<div class="mv-title" style="font-size:10px;font-weight:600;');
      // A film already here always says so with its bar, whether the card's
      // posters show bars or tags (the folded sheet shows only their tops)
      const lib = (this._radarr || []).find(r => Number(r.tmdbId) === id) || this._radarr2ByTmdb?.get(String(id));
      const dl = lib && !lib.hasFile && (this._radarrQueueActive?.has(lib.id) || this._radarr2QueueActive?.has(lib.id));
      const own = lib?.hasFile ? 'b-st-avail' : dl ? 'b-dl' : '';
      const stripe = own && !card.includes('class="mv-stripe"')
        ? this._statusStripe(this._statusStripeColor(own), own === 'b-dl')
            .replace('<div style="position:absolute;bottom:0;left:0;right:0;height:4px', '<div class="mv-stripe" style="position:absolute;bottom:0;left:0;right:0;height:4px')
        : '';
      const full = stripe ? card.replace(/<\/div>\s*$/, `${stripe}</div>`) : card;
      return `<div class="sn-tile mv-tile${id === cur ? ' mv-cur' : ''}" data-action="mv-tile" data-tmdb="${id}" data-title="${this._escHtml(title)}">${full}</div>`;
    }).join('');
    // Under the pill, in the middle: the collection's name, or that these
    // are similar titles
    const label = sh.kind === 'collection' ? sh.name : this._t('simTitle');
    const h = this._snTilesPx ? ` style="height:${this._snTilesPx}px"` : '';
    const folded = !this._snTilesUp && !this._snTilesH && !this._snTilesRow ? ' sn-folded' : '';
    const row = !this._snTilesUp && !(this._snTilesRow > 1) ? ' sn-row' : '';
    return `<div class="sn-tiles-sheet mv-sheet${folded}${row}"${h}>
    <button class="sheet-chev" data-sn-tiles-pill aria-label="${this._snTilesUp ? 'Down' : 'Up'}">${sheetChevSvg()}</button>
    ${label ? `<div class="sn-tiles-label">${this._escHtml(label)}</div>` : ''}
    <div class="sn-tiles-scroll"><div class="sn-tiles-grid">${tiles}</div></div>
  </div>`;
  }

  // A tile opens its film; closing that comes back here
  _ppActMvTile(t) {
    const d = this._popup;
    const id = Number(t.dataset.tmdb);
    if (!d || !id || id === Number(d.id || d.tmdbId)) return;
    (this._mvBackStack ||= []).push({ type: d._type, tmdbId: d.id || d.tmdbId, title: d.title || '', radarrId: d._radarrId ?? null, radarr2Id: d._radarr2Id ?? null });
    const m = (this._radarr || []).find(x => Number(x.tmdbId) === id);
    const m2 = (this._radarr2 || []).find(x => Number(x.tmdbId) === id);
    this._mvOpening = true;
    this._openPopup(m || m2 ? 'radarr' : 'movie', id, null, t.dataset.title || '', m?.id ?? null, m2?.id ?? null);
  }
}

export const filmSheetMixin = _FilmSheetMethods.prototype;
