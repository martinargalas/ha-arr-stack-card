// A series' season opened from its poster (phone and tablet): the season's own
// view with its pack's sources or its episodes, back to the posters from
// there, and from an episode's sources back to the episodes.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function setup() {
  const card = makeCard();
  Object.defineProperty(card, '_isNarrow', { get: () => true, configurable: true });
  Object.defineProperty(card, '_isMob', { get: () => true, configurable: true });
  const calls = [];
  card._renderPopupEl = () => {};
  card._fetchSonarrSeasonIS = (...a) => calls.push(['season', ...a]);
  card._fetchSonarrEpIS = (...a) => calls.push(['episode', ...a]);
  card._fetchSonarrEpisodes = (sid, n) => { calls.push(['episodes', sid, n]); };
  card._snEpisodes = new Map();
  card._snExpandedSeasons = new Set();
  card._popup = { _type: 'sonarr', title: 'Show', _sonarrSeries: { id: 7, seasons: [{ seasonNumber: 1 }, { seasonNumber: 2 }] } };
  return { card, calls };
}

const t = (data) => ({ dataset: data });

test('a poster opens its season\'s episodes, raised, with a switch to its pack', () => {
  const { card, calls } = setup();
  card._ppActSnTile(t({ season: '2' }), {});
  assert.equal(card._snFromTile, 2);
  assert.equal(card._snTileView, 'episodes');
  assert.equal(card._ppPanelUp, true, 'at the full height');
  assert.deepEqual(calls, [['episodes', 7, 2]], 'the episodes, not the pack\'s sources');
  const html = card._renderSonarrIsSection();
  assert.match(html, /sn-tile-view/);
  assert.match(html, /data-action="sn-tile-view" data-view="pack"/);
  assert.match(html, /data-action="sn-back"/);
  card._ppActSnTileView(t({ view: 'pack' }));
  assert.deepEqual(calls.at(-1), ['season', 7, 2, 'sonarr']);
});

test('the episodes are asked for once, and listed each with its own search', () => {
  const { card, calls } = setup();
  card._ppActSnTile(t({ season: '2' }), {});
  card._ppActSnTileView(t({ view: 'episodes' }));
  assert.ok(calls.some(c => c[0] === 'episodes' && c[2] === 2));
  card._snEpisodes.set(2, [{ id: 21, seasonNumber: 2, episodeNumber: 1, title: 'Pilot' }]);
  const html = card._renderSonarrIsSection();
  assert.match(html, /data-action="sn-ep-is" data-epid="21"/);
});

test('back from an episode\'s sources goes to the episodes, back from there to the posters', () => {
  const { card } = setup();
  card._ppActSnTile(t({ season: '2' }), {});
  card._ppActSnTileView(t({ view: 'episodes' }));
  card._snEpisodes.set(2, [{ id: 21, seasonNumber: 2, episodeNumber: 1, title: 'Pilot' }]);
  card._ppActSnEpIs(t({ epid: '21', season: '2' }), {});
  assert.equal(card._snActiveIs?.type, 'episode');
  card._ppActSnBack(t({}), {});
  assert.equal(card._snActiveIs, null);
  assert.equal(card._snTileView, 'episodes');
  assert.equal(card._snFromTile, 2, 'still in the season');
  card._ppActSnBack(t({}), {});
  assert.equal(card._snIsOpen, false, 'the season\'s view is gone, the posters show');
  assert.equal(card._snFromTile, null);
});

test('back to the pack after an episode asks for the pack\'s sources again', () => {
  const { card, calls } = setup();
  card._ppActSnTile(t({ season: '1' }), {});
  card._ppActSnTileView(t({ view: 'pack' }));
  card._snEpisodes.set(1, [{ id: 11, seasonNumber: 1, episodeNumber: 1, title: 'One' }]);
  card._ppActSnEpIs(t({ epid: '11', season: '1' }), {});
  card._ppActSnBack(t({}), {});
  calls.length = 0;
  card._ppActSnTileView(t({ view: 'pack' }));
  assert.deepEqual(calls, [['season', 7, 1, 'sonarr']]);
});

test('a tap outside a season opened from its poster folds it; outside the posters folds them', () => {
  const { card } = setup();
  let panel = 0, tiles = 0;
  card._ppPanelFold = () => panel++;
  card._snTilesFold = () => tiles++;
  const outside = { target: { closest: () => null } };
  card._ppActSnTile(t({ season: '2' }), {});
  card._ppFoldOnOutside(outside);
  assert.equal(panel, 1);
  assert.equal(tiles, 0);
  card._ppFoldOnOutside({ target: { closest: s => s.includes('sn-is-section') ? {} : null } });
  assert.equal(panel, 1, 'a tap inside the season\'s view leaves it');
  card._ppCloseSnIS();
  card._ppFoldOnOutside(outside);
  assert.equal(tiles, 1);
});

test('a season from its poster: each episode searches automatically (magnifier) and by hand (person); the season\'s automatic search sits in its own pill', () => {
  const { card } = setup();
  card._popup = { _type: 'sonarr', title: 'Show', _sonarr2Series: { id: 9, seasons: [{ seasonNumber: 2 }] } };
  card._ppActSnTile(t({ season: '2' }), {});
  card._snEpisodes.set(2, [{ id: 21, seasonNumber: 2, episodeNumber: 1, title: 'Pilot', airDate: '2020-01-01' }]);
  let html = card._renderSonarrIsSection();
  assert.match(html, /data-action="as-ep-search" data-epid="21" data-season="2" data-inst="sonarr2"/, 'the episode\'s automatic search, to the season\'s instance');
  assert.match(html, /data-action="sn-ep-is" data-epid="21"/);
  assert.match(html, /sn-tile-split[^"]*">\s*<button class="sn-tile-tab[^"]*" data-action="sn-tile-view" data-view="pack">Season<\/button><button class="sn-tile-as" data-action="as-season-search" data-season="2" data-inst="sonarr2"/,
    'one capsule: the season and its magnifier');
  assert.doesNotMatch(html, /sn-tile-as-status/, 'nothing to say yet');

  card._asSearchedItems = new Set(['season:2']);
  card._asPolling = new Set(['season:2']);
  html = card._renderSonarrIsSection();
  assert.match(html, /sn-tile-as-status/);
  assert.match(html, /Waiting for a grab/);

  card._asPolling.delete('season:2');
  card._asEpMissed = new Set(['season:2']);
  html = card._renderSonarrIsSection();
  assert.match(html, /as-ep-miss">Not found/);
  assert.match(html, /data-action="as-season-search"/, 'searchable again');
});

test('the AS buttons in a season from its poster go to the instance they name', () => {
  const { card } = setup();
  const seen = [];
  card._triggerSonarrSeasonSearch = (n, inst) => seen.push(['season', n, inst]);
  card._triggerSonarrEpisodeSearch = (id, n, inst) => seen.push(['ep', id, n, inst]);
  card._asInstance = 'sonarr';
  card._ppActAsSeasonSearch(t({ season: '2', inst: 'sonarr2' }));
  card._ppActAsEpSearch(t({ epid: '21', season: '2', inst: 'sonarr2' }));
  card._ppActAsEpSearch(t({ epid: '22', season: '2' }));
  assert.deepEqual(seen, [['season', 2, 'sonarr2'], ['ep', 21, 2, 'sonarr2'], ['ep', 22, 2, 'sonarr']]);
});
