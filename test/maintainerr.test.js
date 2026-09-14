// Maintainerr posters: the status stripe for titles the second Radarr or
// Sonarr holds, which used to come out with none at all.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

const stripes = card => {
  card._posterCfg = () => ({ statusDisplay: 'stripes' });
  return card;
};
const movieItem = tmdbId => ({ id: 1, type: 'movie', title: 'Film', providerIds: { tmdb: [String(tmdbId)] } });
const showItem  = tvdbId => ({ id: 2, type: 'show',  title: 'Show', providerIds: { tvdb: [String(tvdbId)] } });
const hasStripe = html => /background[^;"]*#27ae60|#27ae60/.test(html);

test('a film only the second Radarr holds gets its stripe', () => {
  const card = stripes(makeCard());
  card._radarr = [];
  card._radarr2ByTmdb = new Map([['550', { id: 7, tmdbId: 550, hasFile: true, images: [] }]]);
  const html = card._mtOvPosterCard(movieItem(550), { compact: false });
  assert.ok(hasStripe(html), 'green stripe for a film that is here');
});

test("the first Radarr's queue does not answer for a second-instance film", () => {
  const card = stripes(makeCard());
  card._radarr = [];
  card._radarr2ByTmdb = new Map([['550', { id: 7, tmdbId: 550, hasFile: false, images: [] }]]);
  // Id 7 is downloading on the first instance — a different title there.
  card._radarrQueueActive = new Set([7]);
  card._radarr2QueueActive = new Set();
  const html = card._mtOvPosterCard(movieItem(550), { compact: false });
  assert.match(html, /#c0392b/, 'missing (red), not downloading (blue)');
});

test('a series only the second Sonarr holds gets its stripe', () => {
  const card = stripes(makeCard());
  card._sonarr = [];
  // The card fills both from one response: the whole list, and the ones added.
  card._sonarr2All = card._sonarr2 = [{ id: 3, tvdbId: 81189, status: 'ended', images: [],
    added: '2026-01-01T00:00:00Z', statistics: { episodeFileCount: 10, episodeCount: 10 } }];
  const html = card._mtOvPosterCard(showItem(81189), { compact: false, type: 'show' });
  assert.ok(hasStripe(html), 'green stripe for a complete series');
});

test('the first instance still wins when both hold the title', () => {
  const card = stripes(makeCard());
  card._radarr = [{ id: 1, tmdbId: 550, hasFile: false, images: [] }];
  card._radarr2ByTmdb = new Map([['550', { id: 7, tmdbId: 550, hasFile: true, images: [] }]]);
  const html = card._mtOvPosterCard(movieItem(550), { compact: false });
  assert.match(html, /#c0392b/, "the first instance's missing state, as before");
});
