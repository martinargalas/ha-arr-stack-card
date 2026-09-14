// A card without a browser.
//
// The component is imported for real — jsdom is enough for it to register as a
// custom element — so tests run against the same prototype the browser gets,
// not a copy of it that could drift. What they build is a bare object with that
// prototype: no shadow root, no Home Assistant, just the state each method
// under test actually reads.
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });

globalThis.window = dom.window;
globalThis.document = dom.window.document;
// esbuild substitutes these in the bundle; the tests import the sources raw.
globalThis.__CARD_VERSION__ = 'test';
globalThis.location = dom.window.location;
globalThis.Node = dom.window.Node;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.customElements = dom.window.customElements;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = fn => setTimeout(() => fn(Date.now()), 0);
globalThis.cancelAnimationFrame = id => clearTimeout(id);

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
};

// Width-dependent behaviour is tested by saying how wide the screen is, so the
// query itself has to be answerable. Default is a desktop.
let viewportWidth = 1400;
export function setViewport(px) { viewportWidth = px; }
globalThis.matchMedia = q => {
  const max = /max-width:\s*(\d+)/.exec(q);
  const min = /min-width:\s*(\d+)/.exec(q);
  let matches = true;
  if (max) matches = matches && viewportWidth <= Number(max[1]);
  if (min) matches = matches && viewportWidth >= Number(min[1]);
  return { matches, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} };
};
dom.window.matchMedia = globalThis.matchMedia;

await import('../src/card.js');
const ArrStackCard = customElements.get('arr-stack-card');

// Only what the methods under test reach for. Anything missing surfaces as a
// TypeError naming the field, which beats a quietly wrong answer.
function baseState() {
  return {
    _config: {},
    _hass: { states: {}, user: { is_admin: true }, locale: { date_format: 'MDY' }, callApi: () => Promise.resolve(null) },
    _radarr: [], _radarr2: [], _sonarr: [], _sonarr2: [], _sonarrAll: [], _sonarr2All: [],
    _trakt: [], _suggestarr: [], _lastfm: [], _calendar: [], _upcoming: [], _tvUpcoming: [],
    _trending: [], _popular: [], _pendingRequests: [], _seerrRequests: null,
    _lidarrArtists: new Map(), _lidarrArtistFeed: [],
    _lidarrQueue: new Set(), _lidarrQueuePct: new Map(), _lidarrQueueArtists: new Map(),
    _musAdded: new Set(), _musAddedEntries: new Map(), _musSkipped: new Set(),
    _lidarrConfigured: true, _lastfmConfigured: true, _traktConfigured: true,
    _suggestarrConfigured: true, _overseerrConfigured: true, _bazarrConfigured: false,
    _radarrQueueActive: new Set(), _radarrQueueFailed: new Set(),
    _radarr2QueueActive: new Set(), _radarr2ByTmdb: new Map(),
    _radarrQueuePct: new Map(), _radarr2QueuePct: new Map(),
    _sonarrQueueSeriesPct: new Map(), _sonarr2QueueSeriesPct: new Map(),
    _posterRatingsCache: new Map(), _posterTmdbVoteCache: new Map(),
    _optimisticRequested: new Set(), _withdrawnIds: new Set(), _familyPendingIds: new Map(),
    _sonarrEpFiles: {}, _bazarr: {}, _libTvAudioCache: new Map(), _libTvSubCache: new Map(),
    _musOriginMap: new Map(), _lidarrSigned: new Map(),
    _pages: {}, _pageDir: {}, _rightPage: 0,
    _gradientMap: {}, _gradientIdx: 0,
    _gradients: ['ca', 'cb', 'cc'],
    _raType: 'all', _rqType: 'all', _recType: 'all', _calCatType: 'all',
    _hdrFilterOpen: null,
    _asPolling: new Set(), _asNotFound: new Set(), _asDownloadingItems: new Set(),
    shadowRoot: null,
  };
}

export function makeCard(overrides = {}) {
  const card = Object.create(ArrStackCard.prototype);
  // defineProperty, not assign: some of these are getters on the prototype and
  // a plain assignment would throw rather than shadow them.
  for (const [k, v] of Object.entries({ ...baseState(), ...overrides })) {
    Object.defineProperty(card, k, { value: v, writable: true, enumerable: true, configurable: true });
  }
  // Rendering paths call back into the component; tests care about what the
  // methods return, not about repainting a card that has no DOM.
  card._render = () => {};
  card._reRenderSection = () => {};
  card._reRenderRight = () => {};
  card._markActivated = () => {};
  return card;
}

/** Parse rendered markup so a test can ask the DOM rather than match strings. */
export function parse(markup) {
  const el = document.createElement('div');
  el.innerHTML = markup;
  return el;
}

export const movie = (over = {}) => ({
  id: 1, tmdbId: 100, title: 'A Film', hasFile: true, monitored: true,
  ratings: {}, images: [], statistics: {}, _mediaType: 'movie', _sortDate: '2026-01-01',
  ...over,
});

export const artist = (over = {}) => ({
  id: 10, artistName: 'An Artist', foreignArtistId: 'mbid-1',
  monitored: true, statistics: { trackFileCount: 0, trackCount: 10, totalTrackCount: 10 },
  images: [], ...over,
});
