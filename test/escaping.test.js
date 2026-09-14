// Titles, artist names and overviews come from Radarr, Sonarr, Lidarr, Seerr and
// MusicBrainz. None of that is ours, all of it lands in a template string, and
// the card writes those straight into innerHTML — so anything that renders text
// from a payload has to escape it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse, movie, artist } from './harness.js';

const XSS = '<img src=x onerror="globalThis.__pwned=1">';

// The question is whether the payload can run, not whether its text appears:
// escaped, it is allowed to show up as the title it claims to be. So the markup
// is parsed and asked for elements the payload would have created and for event
// handlers carrying it — the card writes onerror="this.style.display='none'" on
// its own images, and that one is fine.
function assertNoInjection(markup, what) {
  const el = parse(markup);
  assert.equal(el.querySelectorAll('img[src="x"]').length, 0, `${what}: injected an element`);
  const handlers = [...el.querySelectorAll('*')]
    .flatMap(n => [...n.attributes])
    .filter(a => /^on/i.test(a.name) && a.value.includes('__pwned'));
  assert.equal(handlers.length, 0, `${what}: injected an event handler`);
}

test('a film title cannot inject markup', () => {
  const card = makeCard();
  assertNoInjection(card._renderRecentlyAddedCard(movie({ title: XSS })), 'recently added');
});

test('an artist name cannot inject markup', () => {
  const card = makeCard();
  const entry = { id: 10, artist: artist({ artistName: XSS }), newestAlbum: null, newAlbumCount: 0 };
  assertNoInjection(card._renderMusicCard(entry), 'artist card');
});

test('an album title cannot inject markup', () => {
  const card = makeCard();
  const entry = {
    id: 11,
    artist: artist(),
    newestAlbum: { id: 5, title: XSS, statistics: {}, images: [] },
    newAlbumCount: 1,
  };
  assertNoInjection(card._renderMusicCard(entry), 'album subtitle');
});

test('escaping covers the characters that matter', () => {
  const card = makeCard();
  assert.equal(card._escHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});
