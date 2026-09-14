// Deezer's stand-in artwork: used only where Lidarr has none, at the size it is
// drawn, asked for once and remembered.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

const MB = '36eb86eb-5f7b-4501-ae6e-2561725deb1d';
const PIC = '7541ca903dc1ca74bd94c79175c93ee1';
const COVER = '0123456789abcdef0123456789abcdef';

const withEntry = (entry) => {
  const card = makeCard();
  card._altArt = new Map([[MB, entry]]);
  card._altArtAsk = key => { (card._asked = card._asked || []).push(key); };
  return card;
};

test('an artist Lidarr has no picture of gets Deezer\'s, at the drawn size', () => {
  const card = withEntry({ p: PIC, a: {}, t: Date.now() });
  const url = card._lidarrArtistImage({ foreignArtistId: MB, images: [] }, 'poster', { w: 200 });
  assert.strictEqual(url, `https://cdn-images.dzcdn.net/images/artist/${PIC}/200x200-000000-80-0-0.jpg`);
});

test('the fanart slot takes the same picture at backdrop size', () => {
  const card = withEntry({ p: PIC, a: {}, t: Date.now() });
  const url = card._lidarrArtistImage({ foreignArtistId: MB, images: [] }, 'fanart');
  assert.match(url, /\/1000x1000-/);
});

test('an artist still being looked up draws nothing yet, and is asked for', () => {
  const card = makeCard();
  card._altArt = new Map();
  card._altArtAsk = key => { (card._asked = card._asked || []).push(key); };
  assert.strictEqual(card._lidarrArtistImage({ foreignArtistId: MB.toUpperCase(), images: [] }, 'poster'), null);
  assert.deepStrictEqual(card._asked, [MB]);
});

test('a known miss is not asked again', () => {
  const card = withEntry({ t: Date.now() });
  assert.strictEqual(card._lidarrArtistImage({ foreignArtistId: MB, images: [] }, 'poster'), null);
  assert.strictEqual(card._asked, undefined);
});

test('an album with no cover in Lidarr finds Deezer\'s by its title', () => {
  const card = withEntry({ p: null, a: { [ 'тайны' ]: COVER }, t: Date.now() });
  card._lidarrArtists = new Map([[5, { id: 5, foreignArtistId: MB }]]);
  const url = card._lidarrCover({ id: 9, artistId: 5, title: 'Тайны!', images: [] });
  assert.strictEqual(url, `https://cdn-images.dzcdn.net/images/cover/${COVER}/500x500-000000-80-0-0.jpg`);
});

test('Lidarr\'s own artwork still comes first', () => {
  const card = withEntry({ p: PIC, a: {}, t: Date.now() });
  const url = card._lidarrArtistImage(
    { foreignArtistId: MB, images: [{ coverType: 'poster', remoteUrl: 'https://example.org/p.jpg' }] },
    'poster');
  assert.ok(!String(url || '').includes('dzcdn'), 'no Deezer where Lidarr has a picture');
});

test('answers survive a reload through localStorage', () => {
  const a = makeCard();
  a._altArt = new Map([[MB, { p: PIC, a: {}, t: Date.now() }]]);
  a._altArtSave();
  const b = makeCard();
  b._altArtLoad();
  assert.strictEqual(b._altArt.get(MB)?.p, PIC);
});

test('opening an artist puts it first in line and asks at once', () => {
  const card = makeCard();
  card._altArt = new Map();
  card._altArtPrioritize(MB.toUpperCase());
  assert.strictEqual(card._altArtFirst, MB);
  assert.ok(card._altArtQueue.has(MB));
  clearTimeout(card._altArtTimer);
});

test('an artist already known is not asked again when opened', () => {
  const card = withEntry({ p: PIC, a: {}, t: Date.now() });
  card._altArtPrioritize(MB);
  assert.strictEqual(card._asked, undefined);
});
