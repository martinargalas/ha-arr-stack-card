// The badges and stripes on a poster: which source a rating comes from, what a
// stripe says about a download, and where its percentage is read from. Each of
// these has been reported as wrong at least once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse, movie, artist } from './harness.js';

const text = markup => parse(markup).textContent.replace(/\s+/g, ' ').trim();

test('IMDb is used when the title has it', () => {
  const card = makeCard();
  const out = card._ratingBadge(movie({ ratings: { imdb: { value: 7.4 } } }));
  assert.match(out, /IMDb/);
  assert.match(text(out), /7\.4/);
});

test('a film with no IMDb rating falls back to TMDB rather than nothing', () => {
  const card = makeCard();
  const m = movie({ ratings: {}, voteAverage: 6.8 });
  const out = card._ratingBadge(m);
  assert.notEqual(out, '', 'poster was left without a rating');
  assert.match(out, /TMDB/);
  assert.match(text(out), /6\.8/);
});

test('a show with neither falls back to the TheTVDB score Sonarr carries', () => {
  const card = makeCard();
  const s = { id: 3, tmdbId: 300, _mediaType: 'tv', ratings: { value: 8.1 }, statistics: {} };
  assert.match(card._ratingBadge(s), /TVDB/);
});

test('download progress is read from the instance the download is on', () => {
  const card = makeCard({
    _radarrQueuePct: new Map([[425, 99]]),     // same id, other instance
    _radarr2QueuePct: new Map([[425, 38]]),
  });
  assert.equal(card._dlPct(425, 'movie', 'radarr2'), 38);
  assert.equal(card._dlPct(425, 'movie', 'radarr'), 99);
});

test('a download at 0% still paints a sliver, so the stripe can be seen moving', () => {
  const card = makeCard();
  const started = parse(card._statusStripe('#2980b9', true, 0)).querySelectorAll('div')[1];
  assert.equal(started.style.width, '4%');
  const idle = parse(card._statusStripe('#c0392b', false, 0)).querySelectorAll('div')[1];
  assert.equal(idle.style.width, '0%', 'a still bar is drawn honestly');
});

test('an artist reads its stripe the way Lidarr does', () => {
  // Stripes are one of two ways a poster can show status; ask for that one.
  const card = makeCard({ _config: { posters: { statusDisplay: 'stripes' } } });
  // The gradient footer sits at bottom:0 as well, so the stripe is picked out
  // by the height it is drawn at.
  const stripe = a => {
    const out = card._renderMusicCard({ id: a.id, artist: a, newestAlbum: null, newAlbumCount: 0 });
    const bar = [...parse(out).querySelectorAll('div')]
      .map(d => d.getAttribute('style') || '')
      .find(st => st.includes('bottom:0') && st.includes('height:4px'));
    return bar || '';
  };

  // everything wanted is here, and nothing is left unmonitored
  assert.match(stripe(artist({ statistics: { trackFileCount: 10, trackCount: 10, totalTrackCount: 10 } })),
    /#27ae60/, 'complete and fully monitored should be green');

  // complete within its monitoring, with albums left out
  assert.match(stripe(artist({ statistics: { trackFileCount: 15, trackCount: 15, totalTrackCount: 25 } })),
    /#2980b9/, 'complete but partly monitored should be blue');

  // part of it here
  assert.match(stripe(artist({ statistics: { trackFileCount: 19, trackCount: 499, totalTrackCount: 499 } })),
    /#c0392b/, 'part-filled should be red');

  // none of it yet
  assert.match(stripe(artist({ statistics: { trackFileCount: 0, trackCount: 78, totalTrackCount: 78 } })),
    /#555/, 'nothing downloaded yet should be neutral');
});
