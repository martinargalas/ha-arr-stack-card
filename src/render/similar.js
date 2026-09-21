import { isMobile, dayClass, ICONS } from '../shared/ui.js';
import { genreFamily } from '../shared/genres.js';
import { ORIGIN_COUNTRIES, regionName } from '../shared/countries.js';

// Similar titles: the modal. The header carries the type peanut the Library's
// does; the search bar, as in the Library, finds the title to start from and
// holds the sort and the hide-owned switch; the grid is Maintainerr Overview's,
// with the same pager and column slider, of cards drawn like Recommendations'.

// ≈ — "like this one". Drawn to the request plus's box and stroke, so the
// two read as the same size of button.
const SIM_ICO = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="display:block"><path d="M3 8.5c3-3.6 6-3.6 9 0s6 3.6 9 0"/><path d="M3 16.5c3-3.6 6-3.6 9 0s6 3.6 9 0"/></svg>`;
// Room the toolbar and the title row take above the grid, for the first paint
// before the grid has been measured
const SIM_TOOLBAR_H = 110;
const SIM_TYPE_MEDIA = { all: null, movies: 'movie', tv: 'tv', music: 'music' };
// On a phone the filters are glyphs, their names in the tooltip
const _ico = d => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;flex-shrink:0">${d}</svg>`;
const SIM_FILTER_ICO = {
  cast:    _ico('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16.5 14.6c2.6.2 4.4 1.9 5 5.4"/>'),
  genre:   _ico('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3"/>'),
  year:    _ico('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
  country: _ico('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
  sort:    _ico('<path d="M7 4v16M3 16l4 4 4-4"/><path d="M17 20V4M13 8l4-4 4 4"/>'),
  owned:   _ico('<path d="M17.9 17.9A10 10 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2"/><line x1="1" y1="1" x2="23" y2="23"/>'),
};
const SIM_CHEV = `<svg class="mt-tb-chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><polyline points="6 9 12 15 18 9"/></svg>`;

class _SimilarRenderMethods {

  // What there is to search with: films and series need Seerr or a TMDB key
  // of the user's own — the keywords, cast and credits all come from there —
  // music needs Lidarr to find artists in
  _simMediaOn() { return this._overseerrConfigured !== false || this._tmdbOwnKey !== false; }
  _simAvailable() { return this._simMediaOn() || this._lidarrConfigured !== false; }

  // Similar titles' own mark where the app icons stand — the Actions menu — a
  // rounded square as theirs are, the ≈ in it
  _simQaIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" style="flex-shrink:0"><rect width="24" height="24" rx="5" fill="#0A84FF"/><g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M5 9.5c2.3-2.8 4.7-2.8 7 0s4.7 2.8 7 0"/><path d="M5 15.5c2.3-2.8 4.7-2.8 7 0s4.7 2.8 7 0"/></g></svg>`;
  }

  // Find similar beside a request button: above it, or in its place where
  // there is none — on Similar titles' own cards and on search results alike
  _simStack(actionBtn, simBtn) {
    if (!simBtn) return actionBtn;
    return actionBtn
      ? `<span style="position:relative;display:inline-flex;margin-left:auto"><span style="position:absolute;right:0;bottom:calc(100% + 6px)">${simBtn}</span>${actionBtn}</span>`
      : simBtn;
  }

  // Find similar on a search result: finding titles is the search's job, and
  // looking for ones like a title found is an action on it, beside adding it.
  // The title to start from rides on the button.
  _simSeedBtn(seed) {
    if (seed.kind === 'music' ? this._lidarrConfigured === false : !this._simMediaOn()) return '';
    const a = v => this._escHtml(String(v ?? ''));
    return `<button class="btn-add sim-find sim-seed" data-sim-kind="${a(seed.kind)}" data-sim-id="${a(seed.id)}" data-sim-title="${a(seed.title)}" data-sim-year="${a(seed.year)}" data-sim-mbid="${a(seed.mbid)}" title="${a(this._t('simFind'))}">${SIM_ICO.replace('width="16" height="16"', 'width="14" height="14"')}</button>`;
  }

  _simModalHtml() {
    const mob = isMobile();
    return `<div class="popup-overlay${dayClass(this)}" data-sim-modal>
      <div class="popup-glass tl-wide">
        <div class="is-panel-hdr" id="sim-hdr" style="flex-direction:row;align-items:center;padding:${mob ? '12px 12px 10px' : '14px 22px 10px'};gap:8px">${this._simHdrHtml()}</div>
        <div class="popup-body" id="sim-body" style="padding:${mob ? '6px 10px 12px' : '8px 20px 16px'};overflow:hidden;display:flex;flex-direction:column">
          <div id="sim-tb" style="flex-shrink:0;display:flex;flex-wrap:${mob ? 'wrap' : 'nowrap'};align-items:center;gap:6px;margin-bottom:10px">${this._simToolbarHtml()}</div>
          <div id="sim-content" style="flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden">${this._simContentHtml()}</div>
        </div>
      </div>
    </div>`;
  }

  // The Library's header, reduced to what applies here: the type, the count
  _simHdrHtml() {
    const s = this._simModal;
    const _si = this._mtSegIcons;
    // Music needs Lidarr to find artists in; Deezer answers without a key
    const types = ['all', ...(this._simMediaOn() ? ['movies', 'tv'] : []), ...(this._lidarrConfigured !== false ? ['music'] : [])];
    const LBL = { all: this._t('tabAll'), movies: this._t('tabMovies'), tv: this._t('tlFilterTvShows'), music: this._t('tabMusic') };
    const ICO = { movies: _si.movie, tv: _si.tv, music: _si.music };
    const seg = this._mtSegmented('data-sim-seg',
      types.map(k => ({ v: k, label: LBL[k], icon: ICO[k] || null, attr: `data-sim-type="${k}"` })),
      types.includes(s.type) ? s.type : 'all',
      { width: this._isMob ? 40 : 52, accent: '0,122,255', accentAlpha: 0.9, animatePrev: !!s._segAnim, prev: s._segPrev });
    const shown = Array.isArray(s.mode === 'pick' ? s.cands : s.items);
    const count = shown
      ? `<span style="font-size:12px;font-weight:600;opacity:0.55;color:var(--is-text);flex-shrink:0;white-space:nowrap;margin-left:4px">${this._simVisible().length}</span>`
      : '';
    return `<div class="mt-tb" style="min-width:0;flex-shrink:1;overflow:hidden;height:34px;padding:0 3px;gap:6px">${seg}</div>
      ${count}
      <div style="flex:1;min-width:8px"></div>
      ${(s._hist?.length || s._fromSearch)
        ? `<button class="popup-close" data-sim-back title="${this._escHtml(this._t('simBack'))}" style="position:relative;top:0;right:0;flex-shrink:0;align-self:center;margin-left:4px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>`
        : `<button class="popup-close" data-sim-close style="position:relative;top:0;right:0;flex-shrink:0;align-self:center;margin-left:4px">${ICONS.close}</button>`}`;
  }

  // Hide owned: a switch, drawn as the other filters are and lit as they are
  // when on — not the solid blue pill that outshone every other filter
  _simHideHtml() {
    const on = !!this._simModal?.hideOwned;
    const label = this._escHtml(this._t('simHideOwned'));
    return this._isMob
      ? `<span data-sim-hide-owned role="button" class="mt-tb-sel mt-tb-sel--ico${on ? ' is-active' : ''}" title="${label}" style="cursor:pointer">${SIM_FILTER_ICO.owned}</span>`
      : `<span data-sim-hide-owned role="button" class="mt-tb-sel${on ? '' : ' is-off'}" style="cursor:pointer"><span class="mt-tb-lbl">${label}</span></span>`;
  }

  // A panel's trigger: its name, or what is picked, beside a chevron — on a
  // phone the filter's glyph instead, lit while it filters, the words in the
  // tooltip
  _simTrig(id, label, active, open, ico, ex = false) {
    if (this._isMob) {
      // A glyph has no room for "−1": a red dot says something is left out
      const dot = ex ? '<span style="position:absolute;top:4px;right:4px;width:5px;height:5px;border-radius:50%;background:#e5484d;pointer-events:none"></span>' : '';
      return `<span id="${id}" class="mt-tb-sel mt-tb-sel--ico${active ? ' is-active' : ''}${open ? ' is-open' : ''}" title="${this._escHtml(label)}" style="cursor:pointer;position:relative">${SIM_FILTER_ICO[ico]}${SIM_CHEV}${dot}</span>`;
    }
    return `<span id="${id}" class="mt-tb-sel${active ? '' : ' is-off'}${open ? ' is-open' : ''}" style="cursor:pointer;max-width:180px"><span class="mt-tb-lbl">${this._escHtml(label)}</span>${SIM_CHEV}</span>`;
  }

  // The same for a select: on a phone its label gives way to the glyph, which
  // _tbSyncSelect leaves alone and only lights
  _simIcoSel(html, ico, active, title) {
    if (!this._isMob) return html;
    return html
      .replace(/<span class="mt-tb-sel[^"]*">/, `<span class="mt-tb-sel mt-tb-sel--ico${active ? ' is-active' : ''}" title="${this._escHtml(title)}">`)
      .replace(/<span class="mt-tb-lbl">[^<]*<\/span>/, SIM_FILTER_ICO[ico]);
  }

  // Rendered once: recreating an input that is being typed into closes the
  // keyboard on iOS. The select and the switch update themselves in place.
  _simToolbarHtml() {
    const s = this._simModal;
    const sort = this._mtSelect('sim-sort', [
      ['rel', this._t('simSortRel')], ['rating', this._t('simSortRating')],
      ['year', this._t('simSortYear')], ['title', this._t('simSortTitle')],
    ], s.sort || 'rel');   // always set, so never dimmed as an idle filter is
    const hide = this._simHideHtml();
    const sortLabel = { rel: 'simSortRel', rating: 'simSortRating', year: 'simSortYear', title: 'simSortTitle' }[s.sort || 'rel'];
    // The filters narrow the titles found for one: until one is picked there
    // is nothing for them to narrow, so they are hidden — at the start and
    // while one is being picked by name.
    const hidden = s.mode === 'pick' || !s.seed;
    const mob = this._isMob;
    const inner = `<span id="sim-cast-wrap" style="position:relative;flex-shrink:0;display:inline-flex">${this._simCastHtml()}</span>`
      + `<span id="sim-genre-wrap" style="position:relative;flex-shrink:0;display:inline-flex">${this._simGenreHtml()}</span>`
      + `<span id="sim-year-wrap" style="position:relative;flex-shrink:0;display:inline-flex">${this._simYearHtml()}</span>`
      + `<span id="sim-country-wrap" style="position:relative;flex-shrink:0;display:inline-flex">${this._simCountryHtml()}</span>`
      + this._simIcoSel(sort, 'sort', true, this._t(sortLabel))
      + hide;
    const bar = this._mtToolbar('sim-search', s.query || '', [], this._escHtml(this._simPlaceholder()), mob ? 'flex:1 1 100%;min-width:0' : 'flex:1;min-width:0');
    // A phone: the filters' own row under the search, glyphs spread across it
    if (mob) {
      return bar + `<div id="sim-filters" data-shown="flex" class="mt-tb" style="display:${hidden ? 'none' : 'flex'};flex:1 1 100%;justify-content:space-between;min-width:0;max-width:100%;overflow-x:auto;scrollbar-width:none">${inner}</div>`;
    }
    // A tablet and up: one bar, the filters after the search as the Library has them
    return bar.replace(/<\/div>\s*$/, `<span id="sim-filters" data-shown="contents" style="display:${hidden ? 'none' : 'contents'}"><span class="mt-tb-sep"></span>${inner}</span></div>`);
  }

  // The actor picker: the title's cast as tiles, a round face and a name, any
  // number of them picked. Closed, it names the one picked, or the first and
  // how many more.
  _simCastHtml() {
    const s = this._simModal;
    const cast = s.cast || [];
    if (s.seed?.kind === 'music' || !cast.length) return '';
    const sel = s.castSel || [];
    const exl = s.castEx || [];
    const view = s._castView || 'in';
    const names = sel.map(id => cast.find(c => c.id === id)?.name).filter(Boolean);
    const exNames = exl.map(id => cast.find(c => c.id === id)?.name).filter(Boolean);
    // Actors' names are long, and the trigger sits in a bar with every other
    // filter: one name pushed them along, two rewrote the bar. It counts them
    // instead — Cast +1, Cast +2 — so the bar keeps its width whoever is
    // picked, and the panel below says who they are.
    const label = this._simFilterLabel(this._t('simCast'), names.length ? `${this._t('simCast')} +${names.length}` : '', exNames.length);
    const trig = this._simTrig('sim-cast-btn', label, names.length + exNames.length > 0, s._castOpen, 'cast', exNames.length > 0);
    if (!s._castOpen) return trig;
    const tiles = cast.map(c => {
      const state = this._simStateOf(c.id, sel, exl);
      // A TMDB picture path is a plain /name.jpg; anything else is not drawn
      const img = /^\/[\w.-]+$/.test(String(c.profilePath || '')) ? `https://image.tmdb.org/t/p/w92${c.profilePath}` : null;
      const initials = this._escHtml(String(c.name).split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase());
      const face = img
        ? `<img src="${img}" loading="lazy" alt="" style="width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;pointer-events:none">`
        : `<span style="width:30px;height:30px;border-radius:50%;background:var(--is-divider);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;pointer-events:none">${initials}</span>`;
      const tip = c.character ? `${c.name} — ${c.character}` : c.name;
      return `<button data-sim-actor="${Number(c.id) || 0}" title="${this._escHtml(tip)}" style="display:flex;align-items:center;gap:8px;min-width:0;padding:4px 10px 4px 4px;border-radius:999px;${this._simPickStyle(state, view, 0.3)};cursor:pointer;text-align:left">
        ${face}<span style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none">${this._escHtml(c.name)}</span>
      </button>`;
    }).join('');
    const clear = (view === 'ex' ? exl : sel).length
      ? `<div><button data-sim-actor-clear style="border:1px solid var(--is-divider);background:var(--is-btn-bg);color:var(--is-text);padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer">${this._t('simCastClear')}</button></div>`
      : '';
    return `${trig}<div id="sim-cast-pop" style="position:absolute;top:34px;left:0;z-index:200;background:var(--is-menu-bg,#1c1c1e);border:1px solid var(--is-divider,rgba(255,255,255,0.15));border-radius:14px;padding:10px;width:${this._isMob ? 'min(460px,86vw)' : 'min(760px,86vw)'};max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,0.4)">
      ${this._simViewSeg('cast', view, s._castViewPrev)}
      <!-- A name is what the tile is for: 140px cut most of them off after a
           dozen characters, and on anything wider than a phone the panel had
           room to spare it was not using. -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:6px">${tiles}</div>
      ${clear}
    </div>`;
  }

  // The empty search says what the titles are like — no row of its own for it
  _simPlaceholder() {
    const seed = this._simModal?.seed;
    return seed ? `${this._t('simLike')} ${seed.title}` : this._t('simSearchPh');
  }

  // A year, or a span of them: the last five or ten years, a decade, or any
  // two typed in. Closed, the trigger says what is set, or just "Year".
  _simYearHtml() {
    const s = this._simModal;
    if (s.seed?.kind === 'music') return '';
    const cy = new Date().getFullYear();
    const { since, until } = s;
    const label = since && until ? (since === until ? String(since) : `${since}–${until}`)
      : since ? this._t('simYearFrom').replace('{y}', since)
      : until ? this._t('simYearTo').replace('{y}', until)
      : this._t('simYear');
    const trig = this._simTrig('sim-year-btn', label, !!(since || until), s._yearOpen, 'year');
    if (!s._yearOpen) return trig;
    const chip = (a, b, text) => {
      const on = (a || null) === (since || null) && (b || null) === (until || null);
      const sty = on
        ? 'border:1px solid rgba(0,122,255,0.65);background:rgba(0,122,255,0.32);color:#fff'
        : 'border:1px solid var(--is-divider);background:var(--is-btn-bg);color:var(--is-text)';
      return `<button data-sim-year="${a || ''}:${b || ''}" style="${sty};padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">${text}</button>`;
    };
    const decades = [];
    for (let d = Math.floor(cy / 10) * 10; d >= 1960; d -= 10) decades.push(chip(d, d + 9, `${d}–${String(d + 9).slice(2)}`));
    const inp = (id, v, ph) => `<input id="${id}" type="number" min="1900" max="${cy}" value="${v || ''}" placeholder="${this._escHtml(ph)}" style="width:76px;padding:5px 8px;border-radius:10px;border:1px solid var(--is-divider);background:var(--is-btn-bg);color:var(--is-text);font-size:12px">`;
    return `${trig}<div id="sim-year-pop" style="position:absolute;top:34px;left:0;z-index:200;background:var(--is-menu-bg,#1c1c1e);border:1px solid var(--is-divider,rgba(255,255,255,0.15));border-radius:14px;padding:10px;width:250px;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,0.4)">
      <div style="display:flex;flex-wrap:wrap;gap:5px">${chip(cy - 4, null, this._t('simLastN').replace('{n}', 5))}${chip(cy - 9, null, this._t('simLastN').replace('{n}', 10))}</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px">${decades.join('')}</div>
      <div style="display:flex;align-items:center;gap:6px;color:var(--is-text-muted)">${inp('sim-year-from', since, this._t('simFrom'))}<span>–</span>${inp('sim-year-to', until, this._t('simTo'))}</div>
      <div>${chip(null, null, this._t('simYearAny'))}</div>
    </div>`;
  }

  // Genre: any number picked, a title needing them all, from the genres the
  // results carry, named in
  // the card's language — series genres folded into film ones, so that Action
  // takes in Action & Adventure. Closed, it names the one picked, or the first
  // and how many more.
  _simGenreHtml() {
    const s = this._simModal;
    if (s.seed?.kind === 'music') return '';
    const names = s.genreNames || {};
    const ids = new Set();
    for (const it of (s.items || [])) for (const g of genreFamily(it.genreIds)) ids.add(g);
    // A genre left out on an earlier title stays in the list even where these
    // results have none of it, so it can still be taken back
    for (const g of [...(s.genres || []), ...(s.genresEx || [])]) ids.add(Number(g));
    const opts = [...ids].filter(g => names[g]).map(g => [String(g), names[g]])
      .sort((a, b) => a[1].localeCompare(b[1]));
    const sel = (s.genres || []).filter(g => names[g]);
    const exl = (s.genresEx || []).filter(g => names[g]);
    const view = s._genreView || 'in';
    const inc = !sel.length ? '' : sel.length === 1 ? names[sel[0]] : `${names[sel[0]]} +${sel.length - 1}`;
    const label = this._simFilterLabel(this._t('simGenre'), inc, exl.length);
    const trig = this._simTrig('sim-genre-btn', label, sel.length + exl.length > 0, s._genreOpen, 'genre', exl.length > 0);
    if (!s._genreOpen) return trig;
    const chips = opts.map(([g, n]) => this._simPill(`data-sim-genre="${g}"`, this._simStateOf(g, sel, exl), this._escHtml(n), view)).join('');
    const clear = (view === 'ex' ? exl : sel).length ? `<div>${this._simPill('data-sim-genre-clear', false, this._t('simCastClear'))}</div>` : '';
    return `${trig}<div id="sim-genre-pop" style="position:absolute;top:34px;left:0;z-index:200;background:var(--is-menu-bg,#1c1c1e);border:1px solid var(--is-divider,rgba(255,255,255,0.15));border-radius:14px;padding:10px;width:min(360px,86vw);max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,0.4)">
      ${this._simViewSeg('genre', view, s._genreViewPrev)}
      <div style="display:flex;flex-wrap:wrap;gap:5px">${chips}</div>
      ${clear}
    </div>`;
  }

  // Blue when included, red when left out. In the other list's view a pick
  // keeps a faint dashed edge of its colour, so what is set on the other side
  // stays in sight. `state` is 'in', 'ex', or plain on/off.
  _simPill(attrs, state, text, view = 'in') {
    const sty = this._simPickStyle(state === true ? view : state, view);
    return `<button ${attrs} style="${sty};padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">${text}</button>`;
  }

  // Country of origin: any number picked, and a title from any one of them
  // is kept — a title has one origin, so asking for two at once the way the
  // genres are asked would answer with nothing. Home Assistant's own country
  // leads the list, the rest follow by name in the card's language. Closed,
  // the trigger names the one picked, or the first and how many more.
  _simCountryHtml() {
    const s = this._simModal;
    const lg = this._lg();
    const home = String(this._hass?.config?.country || '').toUpperCase();
    const named = [...new Set([home, ...ORIGIN_COUNTRIES].filter(Boolean))].map(c => [c, regionName(c, lg)]);
    const opts = [
      ...named.filter(([c]) => c === home),
      ...named.filter(([c]) => c !== home).sort((a, b) => a[1].localeCompare(b[1], lg)),
    ];
    const known = new Set(named.map(([c]) => c));
    const sel = (s.countries || []).filter(c => known.has(c));
    const exl = (s.countriesEx || []).filter(c => known.has(c));
    const view = s._countryView || 'in';
    const nameOf = c => named.find(([x]) => x === c)?.[1] || c;
    const inc = !sel.length ? '' : sel.length === 1 ? nameOf(sel[0]) : `${nameOf(sel[0])} +${sel.length - 1}`;
    const label = this._simFilterLabel(this._t('simCountry'), inc, exl.length);
    const trig = this._simTrig('sim-country-btn', label, sel.length + exl.length > 0, s._countryOpen, 'country', exl.length > 0);
    if (!s._countryOpen) return trig;
    const chips = opts.map(([c, n]) =>
      this._simPill(`data-sim-country="${this._escHtml(c)}"`, this._simStateOf(c, sel, exl), this._escHtml(n), view)).join('');
    const clear = (view === 'ex' ? exl : sel).length ? `<div>${this._simPill('data-sim-country-clear', false, this._t('simCastClear'))}</div>` : '';
    return `${trig}<div id="sim-country-pop" style="position:absolute;top:34px;left:0;z-index:200;background:var(--is-menu-bg,#1c1c1e);border:1px solid var(--is-divider,rgba(255,255,255,0.15));border-radius:14px;padding:10px;width:min(360px,86vw);max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,0.4)">
      ${this._simViewSeg('country', view, s._countryViewPrev)}
      <div style="display:flex;flex-wrap:wrap;gap:5px">${chips}</div>
      ${clear}
    </div>`;
  }

  _simPickStyle(state, view, fill = 0.32) {
    if (!state) return 'border:1px solid var(--is-divider);background:var(--is-btn-bg);color:var(--is-text)';
    const rgb = state === 'ex' ? '229,72,77' : '0,122,255';
    return state === view
      ? `border:1px solid rgba(${rgb},0.65);background:rgba(${rgb},${fill});color:#fff`
      : `border:1px dashed rgba(${rgb},0.6);background:var(--is-btn-bg);color:var(--is-text-muted)${state === 'ex' ? ';text-decoration:line-through' : ''}`;
  }

  // Include | Exclude at the top of a filter's panel: which list a pick goes to
  _simViewSeg(filter, view, prev) {
    return `<div style="display:flex">${this._mtSegmented(`data-sim-fview-seg="${filter}"`, [
      { v: 'in', label: this._t('simInclude'), attr: `data-sim-fview="${filter}:in"` },
      { v: 'ex', label: this._t('simExclude'), attr: `data-sim-fview="${filter}:ex"` },
    ], view, { width: 84, accent: view === 'ex' ? '229,72,77' : '0,122,255', accentAlpha: 0.9, animatePrev: !!prev && prev !== view, prev })}</div>`;
  }

  // A trigger names what is included, as before, and counts what is left out
  _simFilterLabel(name, included, excluded) {
    const base = included || name;
    return excluded ? `${base} −${excluded}` : base;
  }

  _simStateOf(item, inc, ex) {
    return inc.includes(item) ? 'in' : ex.includes(item) ? 'ex' : null;
  }

  // What the grid shows: the type filter, and for results the hide-owned
  // switch and the sort. The cards' indexes point into this list.
  _simVisible() {
    const s = this._simModal;
    if (!s) return [];
    const picking = s.mode === 'pick';
    const want = SIM_TYPE_MEDIA[s.type] || null;
    if (picking) return (s.cands || []).filter(it => !want || it.mediaType === want);
    // Actors picked: their titles take the films' and series' place; the
    // music stays. Music tags picked: their artists join the music.
    let base = s.castSel?.length
      ? [...(s.castItems || []), ...(s.items || []).filter(it => it.mediaType === 'music')]
      : (s.items || []);
    if (s.mTagItems?.length) {
      const have = new Set(base.map(it => `${it.mediaType}:${it.id}`));
      base = [...base, ...s.mTagItems.filter(it => !have.has(`music:${it.id}`))];
    }
    let list = base.filter(it => !want || it.mediaType === want);
    if (s.hideOwned) list = list.filter(it => !this._simOwned(it));
    // Every genre picked: Action and War means a war film with action in it
    if (s.genres?.length) {
      list = list.filter(it => {
        if (it.mediaType === 'music') return true;
        const f = genreFamily(it.genreIds);
        return s.genres.every(g => f.has(Number(g)));
      });
    }
    // …and a title with any genre left out goes
    if (s.genresEx?.length) {
      list = list.filter(it => {
        if (it.mediaType === 'music') return true;
        const f = genreFamily(it.genreIds);
        return !s.genresEx.some(g => f.has(Number(g)));
      });
    }
    const year = it => String(it.releaseDate || it.firstAirDate || '').slice(0, 4);
    if (s.since || s.until) {
      list = list.filter(it => {
        // An artist has no year, and the year filter is hidden for one
        if (it.mediaType === 'music') return true;
        const y = Number(year(it));
        return y && (!s.since || y >= s.since) && (!s.until || y <= s.until);
      });
    }
    if (s.sort === 'rating') list = [...list].sort((a, b) => (b.voteAverage || 0) - (a.voteAverage || 0));
    else if (s.sort === 'year') list = [...list].sort((a, b) => year(b).localeCompare(year(a)));
    else if (s.sort === 'title') list = [...list].sort((a, b) => String(a.title).localeCompare(String(b.title)));
    // The artists are a title's soundtrack and the acts like it — a different
    // question from "another film like this one", and one the reader asked
    // second. They keep the order they earned, but after the films and series
    // rather than mixed in among them.
    const music = list.filter(it => it.mediaType === 'music');
    if (!music.length || music.length === list.length) return list;
    return [...list.filter(it => it.mediaType !== 'music'), ...music];
  }

  // In either instance of the *arr that holds its kind
  _simOwned(it) {
    if (it.mediaType === 'music') {
      const mb = String(it.mbid || '').toLowerCase();
      return !!mb && [...(this._lidarrArtists?.values() || [])].some(a => String(a.foreignArtistId || '').toLowerCase() === mb);
    }
    if (it.mediaType === 'movie') {
      return (this._radarr || []).some(r => r.tmdbId === it.id) || !!this._radarr2ByTmdb?.get(String(it.id));
    }
    return [...(this._sonarr || []), ...(this._sonarr2 || [])]
      .some(x => x.tmdbId === it.id || (it.tvdbId && x.tvdbId === it.tvdbId));
  }

  _simContentHtml() {
    const s = this._simModal;
    if (!s) return '';
    const picking = s.mode === 'pick';
    const msg = key => `<div class="u-empty-dim" style="padding:28px 0;text-align:center">${this._t(key)}</div>`;
    // The keywords (or the music tags) the match goes by, over the results
    const head = !picking && s.seed ? this._simKwChipsHtml() : '';

    if (!picking && !s.seed) return msg('simHint');
    if (picking ? s.candLoading : (s.loading && !s.items)) return `${head}<div class="is-loading"><span>${this._t('loading')}</span></div>`;
    const list = this._simVisible();
    if (!list.length) return head + msg(picking ? 'simNoCands' : 'simNone');

    const { cols, perPage, gap, gridMaxW } = this._mtGridCalc(s, SIM_TOOLBAR_H, s);
    const totalPages = Math.max(1, Math.ceil(list.length / perPage));
    const page = Math.min(s.page || 0, totalPages - 1);
    const cards = list.slice(page * perPage, (page + 1) * perPage)
      .map((it, i) => this._simCard(it, page * perPage + i, picking))
      .join('');
    const grid = `<div id="sim-grid" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap}px;overflow:hidden${gridMaxW ? `;max-width:${gridMaxW}px;margin:0 auto` : ''}">${cards}</div>`;
    const pager = this._uiPager('sim-page', page, totalPages, true);
    const handle = this._mtDragHandleHtml(s, this._isMob);
    const pagWrap = (pager || handle)
      ? `<div id="sim-pag-wrap" style="flex-shrink:0;position:relative;${handle && !pager ? 'height:36px' : ''}">${pager}${handle}</div>`
      : '';
    return `${head}<div id="sim-grid-wrap" style="flex:1;min-height:0;overflow:hidden;position:relative">${grid}${this._simReqOverlayHtml()}</div>${pagWrap}`;
  }

  // A film's request overlay fits its own card, and is drawn there as it is in
  // every other row. A series' and an artist's need the poster, the profile and
  // the season switches, which is more than a card holds — and the grid here
  // can be a dozen columns wide, so a row-wide overlay would be mostly empty
  // and would sit wherever the card it was opened on happens to be. They get a
  // panel centred over the grid instead; on a phone its width is the grid's.
  _simReqOverlayHtml() {
    const ov = this._tvRequestPending?.source === 'sim' ? this._renderTvRequestOverlay()
      : this._musAddPending?.source === 'sim' ? this._renderMusicAddOverlay()
      : '';
    return ov ? `<div class="sim-req-scrim">${ov}</div>` : '';
  }

  // What the match goes by: the title's keywords, the ones in use lit — or,
  // while music is shown, Last.fm's tags for it, which add artists. One row
  // that scrolls sideways, so a title with many does not eat the grid.
  _simKwChipsHtml() {
    const s = this._simModal;
    if (s?.type === 'music' || s?.seed?.kind === 'music') return this._simTagChipsHtml();
    const kws = s?.keywords || [];
    if (!kws.length) return '';
    const used = new Set(s.used || []);
    const day = this._isDay;
    const chips = kws.map(k => {
      const on = used.has(k.id);
      const sty = on
        ? `border:1px solid rgba(0,122,255,0.65);background:rgba(0,122,255,${day ? 0.18 : 0.32});color:${day ? '#0060df' : '#fff'}`
        : 'border:1px solid var(--is-divider);background:var(--is-btn-bg);color:var(--is-text-muted)';
      return `<button data-sim-kw="${Number(k.id) || 0}" style="${sty};flex-shrink:0;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">${this._escHtml(k.name)}</button>`;
    }).join('');
    return `<div title="${this._escHtml(this._t('simKwTitle'))}" style="flex-shrink:0;display:flex;gap:5px;overflow-x:auto;margin:0 0 10px;padding-bottom:2px;scrollbar-width:none${s.loading ? ';opacity:0.55' : ''}">${chips}</div>`;
  }

  _simTagChipsHtml() {
    const s = this._simModal;
    const tags = s.mTags || [];
    if (!tags.length) return '';
    const used = new Set(s.mUsed || []);
    const day = this._isDay;
    const chips = tags.map(t => {
      const on = used.has(t);
      const sty = on
        ? `border:1px solid rgba(213,16,7,0.65);background:rgba(213,16,7,${day ? 0.16 : 0.32});color:${day ? '#b00d06' : '#fff'}`
        : 'border:1px solid var(--is-divider);background:var(--is-btn-bg);color:var(--is-text-muted)';
      return `<button data-sim-mtag="${this._escHtml(t)}" style="${sty};flex-shrink:0;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">${this._escHtml(t)}</button>`;
    }).join('');
    return `<div title="${this._escHtml(this._t('simTagTitle'))}" style="flex-shrink:0;display:flex;gap:5px;overflow-x:auto;margin:0 0 10px;padding-bottom:2px;scrollbar-width:none${s.mLoading ? ';opacity:0.55' : ''}">${chips}</div>`;
  }

  // A card as the Recommendations row draws it — rating, flags, status, the
  // request button, the source in the top corner — with Find similar above
  // the request button. A click anywhere else, the plus included, opens the
  // title, whose detail is where a request is made.
  _simCard(it, idx, picking) {
    const find = `<button class="btn-add sim-find" data-sim-find="${idx}" title="${this._escHtml(this._t('simFind'))}">${SIM_ICO.replace('width="16" height="16"', 'width="14" height="14"')}</button>`;
    if (it.mediaType === 'music') {
      // Not in Lidarr: the plus under Find similar, which opens the preview
      // that adds it — as the plus on a Last.fm suggestion does
      const card = this._simMusicCard(it.artist ? { title: it.title, mbid: it.artist.foreignArtistId, artist: it.artist } : it);
      const mb = String(it.artist?.foreignArtistId || it.mbid || '').toLowerCase();
      const plus = card.includes('data-artist-unowned')
        ? `<button class="btn-add mus-add-open" data-mus-add="${this._escHtml(mb)}" title="${this._escHtml(this._t('simAdd'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" width="14" height="14" style="display:block"><path d="M12 5v14M5 12h14"/></svg></button>`
        : '';
      return card.replace(/<\/div>\s*$/, `<div style="position:absolute;bottom:8px;right:10px;z-index:3;display:flex;flex-direction:column;align-items:flex-end;gap:6px">${find}${plus}</div>${this._simSrcBadge(it)}</div>`);
    }
    const m = { ...it, name: it.name || it.title, firstAirDate: it.firstAirDate || it.releaseDate };
    const card = it.mediaType === 'tv'
      ? this._renderTvUpcomingCard(m, { showDate: false, showRating: true, typeTag: this._t('typeTv'), source: 'similar', actionHtml: find })
      : this._renderUpcomingCard(m, { showDate: false, typeTag: this._t('typeMovie'), reqKey: 'sim-' + it.id, actionHtml: find });
    return card
      .replace(/<\/div>\s*$/, `${this._simSrcBadge(it)}</div>`)
      .replace('<div class="mc"', `<div class="mc" data-sim-idx="${idx}"`);
  }

  // Where a title came from, in the corner — but not Seerr or TMDB: every film
  // and series here is found through one of them, so their mark says nothing
  // about a card. Trakt, Deezer, Last.fm and Lidarr do say something.
  _simSrcBadge(it) {
    const common = new Set([this._discoverIconKey(), 'tmdb', 'overseerr', 'jellyseerr', 'seerr']);
    const srcs = (it._simSrc || []).filter(src => !common.has(src));
    if (!srcs.length) return '';
    return `<div class="rec-src-badge" title="${this._escHtml(srcs.join(', '))}" style="display:flex;gap:2px">${srcs.map(src => this._appIcon(src, 16)).join('')}</div>`;
  }

  // An artist, from the library when Lidarr holds it — that record has the
  // artwork — otherwise opening the preview Last.fm suggestions open.
  _simMusicCard(it) {
    const mbid = String(it.mbid || it.artist?.foreignArtistId || '').toLowerCase();
    const lib = mbid
      ? [...(this._lidarrArtists?.values() || [])].find(a => String(a.foreignArtistId || '').toLowerCase() === mbid)
      : null;
    const artist = lib || it.artist || { artistName: it.title, foreignArtistId: it.mbid || '', images: [] };
    const card = this._renderMusicCard(
      { id: lib?.id ?? null, artist, newestAlbum: null, newAlbumCount: 0 },
      { noSub: true, noStatus: !lib },
    );
    return lib ? card : card.replace(/data-artist-id="[^"]*"/, `data-artist-unowned="${this._escHtml(mbid)}"`);
  }

}

export const similarRenderMixin = _SimilarRenderMethods.prototype;
