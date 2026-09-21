// Recommendations: Last.fm suggests artists, which can only go to Lidarr. Without
// Lidarr there is no music in the row — no Last.fm mark, no music filter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse } from './harness.js';

test('Last.fm without Lidarr is not a source of recommendations', () => {
  const card = makeCard({ _lastfmConfigured: true, _lidarrConfigured: false, _traktConfigured: true });
  assert.equal(card._recSources.lastfm, false);
  assert.equal(card._recFilterHtml(), '', 'no All / Movies & TV / Music filter');
});

test('with Lidarr, Last.fm brings music and the filter to choose it', () => {
  const card = makeCard({ _lastfmConfigured: true, _lidarrConfigured: true, _traktConfigured: true });
  assert.equal(card._recSources.lastfm, true);
  assert.ok(parse(card._recFilterHtml()).querySelector('[data-rec-type="music"]'));
});
