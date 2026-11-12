// A release grabbed before the window opened (another visit, Radarr or Sonarr
// itself) and downloading shows its progress, not a grab button the queue
// refuses.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

test('Radarr: the newest grab still downloading shows its share; an older one does not', () => {
  const card = makeCard();
  card._popup = { _radarrId: 7 };
  card._isInstance = 'radarr';
  card._isGrabbed = new Set();
  card._radarrQueuePct = new Map([[7, 37]]);
  card._isHistory = { new: 'grabbed', old: 'grabbed' };
  card._isHistLatest = 'new';
  assert.match(card._isGrabBtn({ guid: 'new', approved: false }), /is-grab-prog[\s\S]*37%/);
  assert.doesNotMatch(card._isGrabBtn({ guid: 'old', approved: false }), /is-grab-prog/);
  card._radarrQueuePct = new Map();
  assert.doesNotMatch(card._isGrabBtn({ guid: 'new', approved: true }), /is-grab-prog|action-spinner/, 'out of the queue: no bar, no spinner');
});

test('Sonarr: a season grabbed earlier and in the queue shows its share', () => {
  const card = makeCard();
  card._popup = { _sonarrSeries: { id: 3 } };
  card._snIsInstance = 'sonarr';
  card._snIsGrabbed = new Set();
  card._snActiveIs = { type: 'season', key: 1 };
  card._sonarrQueueSeasonPct = new Map([['3:1', 12]]);
  card._snIsHistory = { g: 'grabbed' };
  assert.match(card._snGrabBtn({ guid: 'g', approved: false, seasonNumber: 1 }), /is-grab-prog[\s\S]*12%/);
});
