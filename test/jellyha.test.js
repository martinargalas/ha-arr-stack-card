// JellyHA is an optional controller, not a second source of what is playing:
// the row still comes from the proxy, and without JellyHA nothing changes.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';
import { rangeLabel, plexRange } from '../src/shared/range.js';
import { rangeMarkSvg } from '../src/shared/logos.js';

function card(states = {}, services = {}) {
  const c = makeCard();
  c._hass = { ...c._hass, states, services };
  return c;
}

const PLAYER = {
  state: 'paused',
  attributes: {
    session_id: 'sess1', item_id: 'item1', device_name: 'Chrome',
    media_position: 120, media_duration: 4200,
    media_position_updated_at: '2026-09-24T12:00:00+00:00',
    video_range_type: 'DOVI', supported_features: 4641343,
  },
};

function session(extra = {}) {
  return { id: 'jellyfin:sess1', source: 'jellyfin', state: 'playing', attr: { media_position: 5, media_duration: 4200, ...extra } };
}

test('a session is matched to its player by the id Jellyfin gave it', () => {
  const c = card({ 'media_player.jellyha_argi': PLAYER });
  const [s] = c._jhAttach([session()]);
  assert.equal(s.attr._jhEntity, 'media_player.jellyha_argi');
  assert.equal(s.state, 'paused', 'and the player is the fresher of the two');
  assert.equal(s.attr.media_position, 120);
});

test('without JellyHA the session is left exactly as it was', () => {
  const c = card({ 'media_player.living_room': { state: 'playing', attributes: {} } });
  const before = session({ _dynRange: 'HDR10' });
  const [s] = c._jhAttach([before]);
  assert.equal(s.attr._jhEntity, undefined);
  assert.equal(s.state, 'playing');
  assert.equal(s.attr.media_position, 5);
  assert.equal(s.attr._dynRange, 'HDR10', 'the range Jellyfin itself reported stays');
});

test('a player belonging to another session is not borrowed', () => {
  const c = card({ 'media_player.jellyha_other': { ...PLAYER, attributes: { ...PLAYER.attributes, session_id: 'sess9' } } });
  const [s] = c._jhAttach([session()]);
  assert.equal(s.attr._jhEntity, undefined);
});

test('dynamic range is named the way a badge says it', () => {
  assert.equal(rangeLabel('DOVI'), 'DV');
  assert.equal(rangeLabel('Dolby Vision'), 'DV');
  assert.equal(rangeLabel('DOVIWithHDR10'), 'DV', 'Dolby Vision over its own base layer');
  assert.equal(rangeLabel('HDR10Plus'), 'HDR10+');
  assert.equal(rangeLabel('HDR10'), 'HDR10');
  assert.equal(rangeLabel('HLG'), 'HLG');
  assert.equal(rangeLabel('SDR'), '', 'the ordinary case earns no badge');
  assert.equal(rangeLabel(''), '');
});

// Plex words it as a Dolby Vision flag and a colour transfer
test('Plex is read the same way Jellyfin is', () => {
  const vid = extra => ({ Media: [{ Part: [{ Stream: [{ streamType: 1, ...extra }] }] }] });
  assert.equal(plexRange(vid({ DOVIPresent: 1 })), 'DV');
  assert.equal(plexRange({ Media: [{ videoProfile: 'dvhe.08.06', Part: [] }] }), 'DV');
  assert.equal(plexRange(vid({ colorTrc: 'smpte2084' })), 'HDR10');
  assert.equal(plexRange(vid({ colorTrc: 'arib-std-b67' })), 'HLG');
  assert.equal(plexRange(vid({ colorTrc: 'bt709' })), '', 'an ordinary picture says nothing');
  assert.equal(plexRange(vid({ streamType: 2, colorTrc: 'smpte2084' })), '', 'and audio is not the picture');
  assert.equal(plexRange({}), '');
});

test('Jellyfin says the range itself, so the badge shows without JellyHA', () => {
  const c = card();
  assert.equal(c._jfRangeOf({ MediaStreams: [{ Type: 'Video', VideoRangeType: 'HDR10' }] }), 'HDR10');
  assert.equal(c._jfRangeOf({ MediaStreams: [{ Type: 'Video', VideoRangeType: 'SDR', DvProfile: 8 }] }), 'DV');
  assert.equal(c._jfRangeOf({ MediaStreams: [{ Type: 'Audio' }] }), '');
  assert.equal(c._jfRangeOf({}), '');
});

test('the transport is sent to the player, never to the session id', () => {
  const c = card({ 'media_player.jellyha_argi': PLAYER });
  c._jellyfinSessions = c._jhAttach([session()]);
  assert.equal(c._jhControlEntity('jellyfin:sess1'), 'media_player.jellyha_argi');
  assert.equal(c._jhControlEntity('jellyfin:unknown'), '', 'an unmatched session has no controls');
  assert.equal(c._jhControlEntity('media_player.plex_tv'), '', 'and Plex keeps its own path');
});

test('playing on a client is offered only where JellyHA can do it', () => {
  assert.equal(card({}, {}).  _jhInstalled(), false);
  assert.equal(card({}, { jellyha: { session_play: {} } })._jhInstalled(), true);
});

test('the clients offered are Jellyfin screens, awake ones first', () => {
  const c = card({
    'media_player.jellyha_tv': { state: 'idle', attributes: { device_name: 'Living room TV' } },
    'media_player.jellyha_argi': { state: 'playing', attributes: { device_name: 'Chrome' } },
    'media_player.jellyha_library_browser': { state: 'idle', attributes: { device_name: 'Browser' } },
    'media_player.kitchen_speaker': { state: 'playing', attributes: {} },
  });
  const names = c._jhTargets().map(t => t.name);
  assert.deepEqual(names, ['Chrome', 'Living room TV'],
    'the library browser is not a screen, and a speaker is not Jellyfin');
});

test('a title is looked up by name and year, and the year decides', async () => {
  const asked = [];
  const c = card({}, { jellyha: { session_play: {} } });
  c._hass.callService = async (dom, svc, data) => {
    asked.push({ dom, svc, data });
    return { response: { items: [{ id: 'old', year: 1974 }, { id: 'new', year: 2021 }] } };
  };
  assert.equal(await c._jhFindItem('Dune', '2021', true), 'new');
  assert.deepEqual(asked[0].data, { query: 'Dune', media_type: 'Movie', limit: 5, year: 2021 });
  assert.equal(await c._jhFindItem('Dune', null, true), 'old', 'with no year, Jellyfin’s own order wins');
});

test('a title Jellyfin does not hold plays nowhere', async () => {
  const c = card({}, { jellyha: { session_play: {} } });
  c._hass.callService = async () => ({ response: { items: [] } });
  assert.equal(await c._jhFindItem('Nothing', null, true), null);
  c._hass.callService = async () => { throw new Error('boom'); };
  assert.equal(await c._jhFindItem('Nothing', null, true), null, 'and a failed search is not a crash');
});

// A Jellyfin library names its own series, and those names are not TMDB's.
// "Blue" (a library's name for Bluey) used to open Blue Bloods.
test('a playing episode opens its own series, by id rather than by name', async () => {
  const c = makeCard();
  c._hass = { ...c._hass, states: {}, services: {} };
  c._sonarr = [{ id: 3, title: 'Bluey', tvdbId: 353546, tmdbId: 82728 }];
  c._sonarr2 = [];
  c._jellyfinSessions = [{
    id: 'jellyfin:sess1', state: 'playing',
    attr: { media_series_title: 'Blue', media_title: 'Tátka robot', _jfSeriesTvdbId: 353546, media_duration: 420 },
  }];
  const opened = [];
  c._openPopup = async (...args) => { opened.push(args); c._popup = { _type: args[0] }; };
  c._renderPopupEl = () => {};
  c._attachStreamData = () => {};
  await c._openStreamPopup('jellyfin:sess1', 'tvshow', 'Tátka robot', 'Blue');
  assert.equal(opened.length, 1);
  const [, , tvdbId, title] = opened[0];
  assert.equal(String(tvdbId), '353546', 'the series is found by the id Jellyfin carries');
  assert.equal(title, 'Bluey', 'and named the way Sonarr names it');
});

test('a series nothing can place is left as itself, not as somebody else', async () => {
  const c = makeCard();
  c._hass = {
    ...c._hass, states: {}, services: {},
    callApi: async () => ({ results: [{ mediaType: 'tv', id: 1, name: 'Blue Bloods' }] }),
  };
  c._sonarr = [];
  c._sonarr2 = [];
  c._overseerrConfigured = true;
  c._jellyfinSessions = [{ id: 'jellyfin:sess2', state: 'playing', attr: { media_series_title: 'Blue' } }];
  const opened = [];
  c._openPopup = async (...args) => { opened.push(args); c._popup = { _type: args[0] }; };
  c._renderPopupEl = () => {};
  c._attachStreamData = () => {};
  await c._openStreamPopup('jellyfin:sess2', 'tvshow', 'Episode', 'Blue');
  const [, tmdbId, , title] = opened[0];
  assert.equal(tmdbId, null, 'Blue Bloods is not Blue, so no id is taken');
  assert.equal(title, 'Blue');
});

test('a show Sonarr does not hold is still found by its TVDB id', async () => {
  const c = makeCard();
  const asked = [];
  c._hass = {
    ...c._hass, states: {}, services: {},
    callApi: async (m, p) => { asked.push(p); return {}; },
  };
  c._callApi = async (m, p) => {
    asked.push(p);
    if (p.startsWith('arr_stack/tmdb/find/tvdb/')) return { tmdbId: 82728, name: 'Bluey' };
    return {};
  };
  c._sonarr = [];
  c._sonarr2 = [];
  c._overseerrConfigured = true;
  c._jellyfinSessions = [{ id: 'jellyfin:s', state: 'playing', attr: { _jfSeriesTvdbId: 353546 } }];
  const opened = [];
  c._openPopup = async (...args) => { opened.push(args); c._popup = { _type: args[0] }; };
  c._renderPopupEl = () => {};
  c._attachStreamData = () => {};
  await c._openStreamPopup('jellyfin:s', 'tvshow', 'Tátka robot', 'Blue');
  assert.ok(asked.some(p => p === 'arr_stack/tmdb/find/tvdb/353546'), 'TMDB is asked about the id');
  const [, tmdbId, tvdbId, title] = opened[0];
  assert.equal(String(tmdbId), '82728');
  assert.equal(String(tvdbId), '353546');
  assert.equal(title, 'Bluey', 'and the detail is named as TMDB names it');
});

test('both Sonarr instances are searched, and an id beats a name in either', async () => {
  const c = makeCard();
  c._hass = { ...c._hass, states: {}, services: {} };
  // The first instance holds a different show that happens to carry the name
  c._sonarr  = [{ id: 1, title: 'Blue', tvdbId: 111, tmdbId: 222 }];
  c._sonarr2 = [{ id: 9, title: 'Bluey', tvdbId: 353546, tmdbId: 82728 }];
  c._jellyfinSessions = [{ id: 'jellyfin:s', state: 'playing', attr: { _jfSeriesTvdbId: 353546 } }];
  const opened = [];
  c._openPopup = async (...args) => { opened.push(args); c._popup = { _type: args[0] }; };
  c._renderPopupEl = () => {};
  c._attachStreamData = () => {};
  await c._openStreamPopup('jellyfin:s', 'tvshow', 'Tátka robot', 'Blue');
  const [, , tvdbId, title] = opened[0];
  assert.equal(String(tvdbId), '353546', 'the id in the second instance wins');
  assert.equal(title, 'Bluey');
});

test('with no ids at all the name still finds a show in either instance', async () => {
  const c = makeCard();
  c._hass = { ...c._hass, states: {}, services: {} };
  c._sonarr  = [];
  c._sonarr2 = [{ id: 9, title: 'Bluey', tvdbId: 353546, tmdbId: 82728 }];
  c._jellyfinSessions = [{ id: 'jellyfin:s', state: 'playing', attr: {} }];
  const opened = [];
  c._openPopup = async (...args) => { opened.push(args); c._popup = { _type: args[0] }; };
  c._renderPopupEl = () => {};
  c._attachStreamData = () => {};
  await c._openStreamPopup('jellyfin:s', 'tvshow', 'Episode', 'Bluey');
  assert.equal(opened[0][3], 'Bluey');
});

// Some libraries give a series no provider ids at all. The episode has them,
// and TMDB names the show an episode belongs to.
test('a series with no ids is found through the episode that is playing', async () => {
  const c = makeCard();
  c._hass = { ...c._hass, states: {}, services: {} };
  const asked = [];
  c._callApi = async (m, p) => {
    asked.push(p);
    if (p === 'arr_stack/tmdb/find/tvdb/6850502') return { tmdbId: 82728, name: 'Bluey' };
    return {};
  };
  c._sonarr = [{ id: 4, title: 'Bluey', tvdbId: 353546, tmdbId: 82728 }];
  c._sonarr2 = [];
  c._jellyfinSessions = [{
    id: 'jellyfin:s', state: 'playing',
    attr: { _jfSeriesTvdbId: null, _jfSeriesTmdbId: null, _jfEpTvdbId: '6850502', _jfEpImdbId: 'tt9150216' },
  }];
  const opened = [];
  c._openPopup = async (...args) => { opened.push(args); c._popup = { _type: args[0] }; };
  c._renderPopupEl = () => {};
  c._attachStreamData = () => {};
  await c._openStreamPopup('jellyfin:s', 'tvshow', 'Víkend', 'Blue');
  assert.ok(asked.includes('arr_stack/tmdb/find/tvdb/6850502'), 'the episode id is what is asked about');
  assert.equal(opened[0][3], 'Bluey', 'and Sonarr holds the show the episode belongs to');
});

test('with no TVDB id the episode’s IMDb id is asked about instead', async () => {
  const c = makeCard();
  c._hass = { ...c._hass, states: {}, services: {} };
  const asked = [];
  c._callApi = async (m, p) => { asked.push(p); return { tmdbId: 82728, name: 'Bluey' }; };
  c._sonarr = [];
  c._sonarr2 = [];
  c._overseerrConfigured = false;
  c._jellyfinSessions = [{ id: 'jellyfin:s', state: 'playing', attr: { _jfEpImdbId: 'tt9150216' } }];
  const opened = [];
  c._openPopup = async (...args) => { opened.push(args); c._popup = { _type: args[0] }; };
  c._renderPopupEl = () => {};
  c._attachStreamData = () => {};
  await c._openStreamPopup('jellyfin:s', 'tvshow', 'Víkend', 'Blue');
  assert.ok(asked.includes('arr_stack/tmdb/find/imdb/tt9150216'));
  assert.equal(String(opened[0][1]), '82728', 'the show TMDB named is what opens');
});

// The detail of a film or episode opened from a stream used to show a bar and
// nothing else — the buttons lived only in the music popup.
test('a stream the card can drive gets a play button in the detail', () => {
  const c = makeCard();
  c._hass = {
    ...c._hass,
    states: { 'media_player.jellyha_argi': { state: 'playing', attributes: { supported_features: 4641343 } } },
  };
  const html = c._renderPopupStreamControls({
    _streamEntity: 'jellyfin:sess1',
    _ctrlEntity: 'media_player.jellyha_argi',
    _streamState: 'playing', _duration: 4200, _position: 120, _updatedAt: Date.now(),
  });
  assert.match(html, /data-action="stream-playpause"/);
  assert.match(html, /data-entity="media_player\.jellyha_argi"/, 'the command goes to the player');
  assert.match(html, /mdi:pause/, 'and it offers to pause what is playing');
  assert.match(html, /class="stream-seek-wrap"/, 'the bar can be seeked');
  assert.match(html, /data-fill="jellyfin:sess1"/, 'while the fill stays the stream’s own');
});

test('a stream nothing can drive keeps the bar and skips the buttons', () => {
  const c = makeCard();
  c._hass = { ...c._hass, states: {} };
  const html = c._renderPopupStreamControls({
    _streamEntity: 'jellyfin:sess1', _ctrlEntity: '',
    _streamState: 'playing', _duration: 4200, _position: 120, _updatedAt: Date.now(),
  });
  assert.doesNotMatch(html, /stream-playpause/);
  assert.doesNotMatch(html, /stream-seek-wrap/);
  assert.match(html, /stream-prog-fill/);
});

test('the row for a stream that ended goes at once, not at the next poll', () => {
  const c = makeCard();
  c._jellyfinSessions = [{ id: 'jellyfin:sess1', state: 'playing', attr: {} }];
  c._jellyfinLastFetch = Date.now();
  const old = { 'media_player.jellyha_argi': { state: 'playing', attributes: { session_id: 'sess1' } } };
  const cur = { 'media_player.jellyha_argi': { state: 'idle', attributes: {} } };
  assert.equal(c._jhSessionsEnded(cur, old), true);
  assert.deepEqual(c._jellyfinSessions, []);
  assert.equal(c._jellyfinLastFetch, 0, 'and the next poll is allowed straight away');
});

test('a player that keeps playing takes nothing away', () => {
  const c = makeCard();
  c._jellyfinSessions = [{ id: 'jellyfin:sess1', state: 'playing', attr: {} }];
  const st = { 'media_player.jellyha_argi': { state: 'playing', attributes: { session_id: 'sess1' } } };
  assert.equal(c._jhSessionsEnded(st, st), false);
  assert.equal(c._jellyfinSessions.length, 1);
});

test('a session moving to another playback is not read as an ending', () => {
  const c = makeCard();
  c._jellyfinSessions = [{ id: 'jellyfin:sess1', state: 'playing', attr: {} }];
  const old = { 'media_player.jellyha_argi': { state: 'playing', attributes: { session_id: 'sess1' } } };
  const cur = { 'media_player.jellyha_argi': { state: 'paused', attributes: { session_id: 'sess1' } } };
  assert.equal(c._jhSessionsEnded(cur, old), false, 'paused is still playing as far as the column goes');
});

test('the transport row is one row everywhere, and skipping needs somewhere to skip', () => {
  const c = makeCard();
  const film = c._streamCtrlRowHtml('media_player.x', { playing: true, feats: 1 | 16384 | 2 });
  assert.match(film, /stream-playpause/);
  assert.doesNotMatch(film, /stream-next/, 'a film has no next episode');
  const episode = c._streamCtrlRowHtml('media_player.x', { playing: false, feats: 1 | 16384 | 16 | 32 });
  assert.match(episode, /stream-prev/);
  assert.match(episode, /stream-next/);
  assert.match(episode, /mdi:play/, 'a paused stream offers to play');
  assert.equal(c._streamCtrlRowHtml('media_player.x', { playing: true, feats: 0 }), '',
    'and a player that cannot be driven gets no row at all');
});

test('every transport row carries the class its size hangs on', () => {
  const c = makeCard();
  const row = c._streamCtrlRowHtml('media_player.x', { playing: true, feats: 1 | 16384 });
  assert.match(row, /class="popup-stream-ctrls"/,
    'the artist window used to shrink its own copy and nothing else knew');
});

// Two entries called "Play on" say nothing about which server they mean.
test('each way of playing elsewhere names its server, but only when both exist', () => {
  const withBoth = makeCard();
  withBoth._hass = { ...withBoth._hass, states: {}, services: { jellyha: { session_play: {} } } };
  withBoth._plexConfigured = true;
  withBoth._qaHasFiles = () => true;
  const both = withBoth._qaItems({ _type: 'sonarr' }).map(i => i.label);
  assert.ok(both.includes(withBoth._t('qaCastPlex')), 'Plex says Plex');
  assert.ok(both.includes(withBoth._t('qaJfPlay')), 'and Jellyfin says Jellyfin');
  assert.ok(both.indexOf(withBoth._t('qaJfPlay')) < both.indexOf(withBoth._t('qaCastPlex')),
    'Jellyfin is offered before Plex');

  const plexOnly = makeCard();
  plexOnly._hass = { ...plexOnly._hass, states: {}, services: {} };
  plexOnly._plexConfigured = true;
  plexOnly._qaHasFiles = () => true;
  const one = plexOnly._qaItems({ _type: 'sonarr' }).map(i => i.label);
  assert.ok(one.includes(plexOnly._t('qaCast')), 'alone it is just "Play on"');
  assert.ok(!one.includes(plexOnly._t('qaCastPlex')));
});

test('a film has no next episode to skip to', () => {
  const c = makeCard();
  // JellyHA reports the same feature mask for a film as for an episode, so the
  // mask cannot be what decides
  const feats = 1 | 16384 | 16 | 32;
  const film = c._streamCtrlRowHtml('media_player.x', { playing: true, feats, step: false });
  assert.doesNotMatch(film, /stream-next/);
  assert.doesNotMatch(film, /stream-prev/);
  assert.match(film, /stream-playpause/);
  const episode = c._streamCtrlRowHtml('media_player.x', { playing: true, feats, step: true });
  assert.match(episode, /stream-next/);
});

test('the bar can be dragged, and the drag does not seek twice', () => {
  const c = makeCard();
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <div class="stream-seek-wrap" data-entity="media_player.x" data-fill="jellyfin:s" data-dur="100">
      <div class="stream-prog-fill" style="width:10%"></div>
    </div>
    <div class="stream-popup-time"></div>`;
  const wrap = root.querySelector('.stream-seek-wrap');
  wrap.getBoundingClientRect = () => ({ left: 0, width: 200 });
  const seeks = [];
  c._doSeek = (entity, pos) => seeks.push({ entity, pos });
  c._updateStreamFills = () => {};
  c._ppWireSeekDrag(root);

  // jsdom will not take Node's own Event, so it has to come from the document
  const Ev = document.defaultView.Event;
  const ev = (type, x) => Object.assign(new Ev(type, { bubbles: true }), { clientX: x, pointerId: 1 });
  wrap.dispatchEvent(ev('pointerdown', 20));
  // Released away from the bar, which is what a finger usually does
  document.dispatchEvent(ev('pointermove', 150));
  assert.equal(parseFloat(root.querySelector('.stream-prog-fill').style.width), 75, 'the fill follows the finger');
  document.dispatchEvent(ev('pointerup', 150));
  assert.deepEqual(seeks, [{ entity: 'media_player.x', pos: 75 }]);
  assert.equal(c._seekJustDragged, true, 'and the click that follows is swallowed');
});

test('a press without a drag seeks to where it landed', () => {
  const c = makeCard();
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<div class="stream-seek-wrap" data-entity="media_player.x" data-dur="100"><div class="stream-prog-fill"></div></div>`;
  const wrap = root.querySelector('.stream-seek-wrap');
  wrap.getBoundingClientRect = () => ({ left: 0, width: 200 });
  const seeks = [];
  c._doSeek = (...a) => seeks.push(a);
  c._updateStreamFills = () => {};
  c._ppWireSeekDrag(root);
  // jsdom will not take Node's own Event, so it has to come from the document
  const Ev = document.defaultView.Event;
  const ev = (type, x) => Object.assign(new Ev(type, { bubbles: true }), { clientX: x, pointerId: 1 });
  wrap.dispatchEvent(ev('pointerdown', 40));
  document.dispatchEvent(ev('pointerup', 40));
  // preventDefault on pointerdown suppresses the click, so the press cannot be
  // left to the click handler
  assert.deepEqual(seeks, [['media_player.x', 20]], 'the press itself seeks');
});

// Dolby Vision, HDR10 and HDR10+ each have a logo, each owned by somebody
// else, and HLG has none. The card says it in type instead.
test('a format with a mark of its own wears it', () => {
  const c = makeCard();
  for (const range of ['DV', 'HDR10', 'HDR10+']) {
    const tile = c._streamRangeBadge(range);
    assert.match(tile, /<svg /, `${range} is drawn, not spelled`);
    assert.match(tile, /fill="currentColor"/, 'and takes the badge’s colour');
    assert.match(tile, /hdr-logo/);
  }
  assert.match(c._streamRangeBadge('DV'), /class="stream-hdr-tag hdr-dv hdr-logo"/);
  assert.match(c._streamRangeBadge('DV'), /title="Dolby Vision"/, 'named for anyone who cannot see it');
  const big = c._streamRangeBadge('DV', { long: true, cls: 'pp-hdr-chip' });
  assert.match(big, /class="pp-hdr-chip hdr-dv hdr-logo"/, 'larger where there is room');
});

test('a format with no mark says its name, and SDR says nothing', () => {
  const c = makeCard();
  const hlg = c._streamRangeBadge('HLG');
  assert.doesNotMatch(hlg, /<svg /, 'HLG has no mark to wear');
  assert.match(hlg, /class="stream-hdr-tag hdr-hlg">HLG</);
  assert.match(c._streamRangeBadge('HDR'), />HDR</);
  assert.equal(c._streamRangeBadge(''), '');
  assert.equal(c._streamRangeBadge(null), '');
});

// Plex gets what Jellyfin got: the same row, the same bar, the same badge.
test('a Plex player Home Assistant exposes is driven directly', () => {
  const c = makeCard();
  assert.equal(c._streamControlEntity('media_player.plex_tv'), 'media_player.plex_tv');
  assert.equal(c._streamControlEntity('plex:abc'), '', 'a proxy session goes by its machine id instead');
});

test('a Plex session read through the proxy still gets controls and seek', () => {
  const c = makeCard();
  c._plexSessions = [{ id: 'plex:abc', _machineIdentifier: 'abc', _plexCanControl: true, _playerUrl: 'http://tv:32500', attr: {} }];
  c._popup = { _type: 'radarr' };
  c._hass = { ...c._hass, states: {} };
  c._attachStreamData('plex:abc');
  assert.equal(c._popup._plexMachineId, 'abc', 'the machine id reaches the popup');
  const html = c._renderPopupStreamControls({
    ...c._popup, _streamEntity: 'plex:abc', _streamState: 'playing',
    _duration: 100, _position: 10, _updatedAt: Date.now(),
  });
  assert.match(html, /stream-playpause/, 'Plex can be paused');
  assert.match(html, /class="stream-seek-wrap"/, 'and its bar can be clicked or dragged');
});

test('the badge is read from whichever server is playing', () => {
  const c = makeCard();
  c._plexSessions = [{ id: 'plex:abc', attr: { _dynRange: 'HDR10' } }];
  c._jellyfinSessions = [{ id: 'jellyfin:s', attr: { _dynRange: 'DV' } }];
  assert.equal(c._streamRangeOf('plex:abc'), 'HDR10');
  assert.equal(c._streamRangeOf('jellyfin:s'), 'DV');
  assert.equal(c._streamRangeOf('media_player.unknown'), '');
});

// Plex Web never registers as controllable: it takes no command and says so.
test('a Plex client that takes no commands is not offered any', () => {
  const c = makeCard();
  c._plexSessions = [{ id: 'plex:web', _machineIdentifier: 'web', _plexCanControl: false, attr: {} }];
  c._popup = { _type: 'radarr' };
  c._hass = { ...c._hass, states: {} };
  c._attachStreamData('plex:web');
  assert.equal(c._popup._plexMachineId, null, 'nothing to send a command to');
  const html = c._renderPopupStreamControls({
    ...c._popup, _streamEntity: 'plex:web', _streamState: 'playing',
    _duration: 100, _position: 10, _updatedAt: Date.now(),
  });
  assert.doesNotMatch(html, /stream-playpause/, 'so no buttons that would do nothing');
  assert.doesNotMatch(html, /stream-seek-wrap/, 'and a bar that cannot be dragged does not pretend to be');
  assert.match(html, /stream-prog-fill/, 'the progress itself still shows');
});

// The mark belongs with the other things that describe the picture — the
// quality of the copy, the languages — not beside the clock.
test('the mark sits among the file chips in a title’s detail', () => {
  const c = makeCard();
  c._popup = { _streamEntity: 'jellyfin:s' };
  c._jellyfinSessions = [{ id: 'jellyfin:s', attr: { _dynRange: 'DV' } }];
  c._arrLangCodes = () => ({ subCodes: [], audioCodes: [] });
  c._qualityLabel = () => '4K Bluray';
  c._ppLangChip = () => '';
  const { fileInfoRow } = c._ppFileInfoRow({
    isMovieType: true,
    radarrEntry: { hasFile: true }, radarr2Entry: null, sonarrEntry: null, sonarr2Entry: null,
  });
  assert.match(fileInfoRow, /4K Bluray/);
  assert.match(fileInfoRow, /pp-fi-chip hdr-dv hdr-logo/, 'the mark wears the same chip as the quality');
  assert.ok(fileInfoRow.indexOf('4K Bluray') < fileInfoRow.indexOf('hdr-logo'), 'and follows it');
});

test('nothing playing means no mark in the row', () => {
  const c = makeCard();
  c._popup = {};
  c._arrLangCodes = () => ({ subCodes: [], audioCodes: [] });
  c._qualityLabel = () => '1080p';
  c._ppLangChip = () => '';
  const { fileInfoRow } = c._ppFileInfoRow({
    isMovieType: true,
    radarrEntry: { hasFile: true }, radarr2Entry: null, sonarrEntry: null, sonarr2Entry: null,
  });
  assert.doesNotMatch(fileInfoRow, /hdr-logo/);
});

test('on a tile the mark is part of the line above the title', () => {
  const c = makeCard();
  const badge = c._streamRangeBadge('DV', { cls: 'stream-hdr-tag stream-hdr-line' });
  assert.match(badge, /class="stream-hdr-tag stream-hdr-line hdr-dv hdr-logo"/,
    'it stands in the text block rather than over the poster');
  assert.match(badge, /<svg /);
});

// HDR10 and HDR10+ are drawn inside their own outline; a capsule around that
// reads as two borders.
test('a mark that brings its own frame is not given a second one', () => {
  const c = makeCard();
  for (const range of ['HDR10', 'HDR10+']) {
    assert.match(c._streamRangeBadge(range), /hdr-bare/, `${range} stands on its own`);
  }
  assert.doesNotMatch(c._streamRangeBadge('DV'), /hdr-bare/, 'Dolby Vision has no frame, so it keeps the capsule');
});

// Geometry centred the wordmark exactly, and it still read as too high: the
// mass of "Dolby" sits above its own descender.
test('the wordmark is nudged down, the framed marks are not', () => {
  const dv = rangeMarkSvg('DV', 20);
  assert.match(dv, /transform:translateY\(1\.8px\)/, 'nine per cent of its height');
  for (const range of ['HDR10', 'HDR10+']) {
    assert.doesNotMatch(rangeMarkSvg(range, 20), /translateY/,
      `${range} is drawn inside its own box and needs no help`);
  }
});
