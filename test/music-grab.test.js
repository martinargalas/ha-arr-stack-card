// Grabbing a release from the artist window: what the button says while the
// queue catches up, and what it says when the queue never does.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function card() {
  const c = makeCard();
  c._musicModal = { artistId: 1, search: { mode: 'is', albumId: 42, results: [], grabbed: new Set(), grabbedAt: new Map() } };
  return c;
}

const REL = { guid: 'g1', title: 'Album FLAC', protocol: 'torrent', seeders: 12, leechers: 3, indexerId: 4 };

test('a fresh grab spins while the queue has not picked it up', () => {
  const c = card();
  const sp = c._musicModal.search;
  sp.grabbed.add('g1');
  sp.grabbedAt.set('g1', Date.now());
  assert.match(c._musGrabBtn(REL, sp), /action-spinner/);
});

test('and stops spinning once waiting stops being honest', () => {
  const c = card();
  const sp = c._musicModal.search;
  sp.grabbed.add('g1');
  sp.grabbedAt.set('g1', Date.now() - 31000);
  const html = c._musGrabBtn(REL, sp);
  assert.doesNotMatch(html, /action-spinner/);
  assert.match(html, /is-grab-done/, 'Lidarr took the release, which is what it says');
});

test('a queue that does pick it up shows how far along it is', () => {
  const c = card();
  const sp = c._musicModal.search;
  sp.grabbed.add('g1');
  sp.grabbedAt.set('g1', Date.now() - 31000);
  c._lidarrQueue = new Set([42]);
  c._lidarrQueuePct = new Map([[42, 37]]);
  assert.match(c._musGrabBtn(REL, sp), /37%/);
});

// Lidarr does not word the protocol the way Radarr does, and the column read
// every music release as usenet.
test('seeders and leechers show for a music torrent', () => {
  const c = makeCard();
  assert.match(c._isPeers({ protocol: 'Torrent', seeders: 12, leechers: 3 }), /↑12/);
  assert.match(c._isPeers({ protocol: 'Torrent', seeders: 12, leechers: 3 }), /↓3/);
  assert.match(c._isPeers({ protocol: 'torrent', seeders: 0, leechers: 0 }), /↑0/);
  assert.match(c._isPeers({ protocol: 'usenet' }), /is-peers-na/);
});

test('peers sort by seeders, whatever case the protocol came in', () => {
  const c = makeCard();
  assert.equal(c._isSortValue({ protocol: 'Torrent', seeders: 9 }, 'peers'), 9);
  assert.equal(c._isSortValue({ protocol: 'usenet' }, 'peers'), -1);
});

// The bar in the artist window is the same bar the popups draw, so a click
// arriving after a drag must not seek on top of it.
test('the click that follows a drag does not seek a second time', () => {
  const c = makeCard();
  c._seekJustDragged = true;
  let seeks = 0;
  c._doSeek = () => { seeks++; };
  c._updateStreamFills = () => {};
  const el = {
    dataset: { entity: 'media_player.hifi', action: 'stream-seek', dur: '200' },
    getBoundingClientRect: () => ({ left: 0, width: 100 }),
  };
  c._musStreamAction(el, { clientX: 50 });
  assert.equal(seeks, 0);
});

// Lidarr leaves what it could not parse out of its queue unless asked, and the
// card had no other way to see the download it had just started.
test('a release the queue names only by title still shows as downloading', () => {
  const c = card();
  const sp = c._musicModal.search;
  sp.results = [REL];
  sp.grabbed.add('g1');
  sp.grabbedAt.set('g1', Date.now());
  c._lidarrQueue = new Set();
  c._lidarrQueuePct = new Map();
  c._lidarrQueueTitles = new Map([[c._qTitle('Album FLAC'), 42]]);
  assert.match(c._musGrabBtn(REL, sp), /42%/);
});

test('the title compares past the punctuation a client writes it with', () => {
  const c = makeCard();
  assert.equal(c._qTitle('Taylor Swift - 1989 (Taylor\'s Version)'), c._qTitle('taylor.swift.1989.taylors.version'));
});

// Seerr answers for films and shows only, and music used to fall out of the
// section entirely as soon as it was configured.
test('an album on its way is listed among the requests beside Seerr\'s own', () => {
  const c = makeCard();
  c._cfgGet = () => 'both';
  c._seerrRequests = [];
  c._overseerrConfigured = true;
  c._lidarrConfigured = true;
  c._lidarrArtists = new Map([[7, { id: 7, artistName: 'Autechre', monitored: true, statistics: { trackFileCount: 2, trackCount: 9 } }]]);
  c._lidarrQueueArtists = new Map([[7, 40]]);
  const items = c.recentlyRequested;
  assert.equal(items.filter(i => i._mediaType === 'music').length, 1);
});
