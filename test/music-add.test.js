// The add-an-artist dialog: cancelling it closes it, lets the suggestions
// refill, and opens the library's record when a preview of that artist stands
// open and Lidarr already holds them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, artist } from './harness.js';

function cancel(state) {
  const right = document.createElement('div');
  right.innerHTML = '<button class="mus-add-cancel"></button>';
  document.body.appendChild(right);
  const card = makeCard(state);
  const did = [];
  card._reRenderSection = s => did.push(`repaint ${s}`);
  card._reRenderSearchResults = () => did.push('repaint search');
  card._musScheduleLastfmRefresh = () => did.push('refresh suggestions');
  card._openMusicModal = id => did.push(`open ${id}`);
  card._wireMusicCards(right);
  right.querySelector('.mus-add-cancel').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  right.remove();
  return { card, did };
}

test('cancelling from the suggestions closes the dialog and refills them', () => {
  const { card, did } = cancel({
    _musAddPending: { source: 'lastfm', artist: { foreignArtistId: 'MB-2' } },
    _musicModal: null,
  });
  assert.equal(card._musAddPending, null);
  assert.deepEqual(did, ['repaint recommendations', 'refresh suggestions']);
});

test("cancelling with the artist's preview open, and the artist already in Lidarr, opens their record", () => {
  const { did } = cancel({
    _musAddPending: { source: 'search', artist: { foreignArtistId: 'MB-1' } },
    _lidarrArtists: new Map([[10, artist({ id: 10, foreignArtistId: 'mb-1' })]]),
    _musicModal: { preview: 'mb-1' },
  });
  assert.deepEqual(did, ['repaint search', 'open 10', 'refresh suggestions']);
});
