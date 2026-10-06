// Now Playing takes a slot in the right column only when it draws something:
// a live session it leaves out (ended, played to the end) must not push the
// next category onto the next page.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

const page = card => {
  card._renderSearch = () => '<s>search</s>';
  card._renderCalendar = () => '<c>calendar</c>';
  card._renderRecentlyAdded = () => '<r>recent</r>';
  card._rpPag = () => '';
  return card._renderRight();
};

const card = over => makeCard({
  _config: { discover: { categoriesCount: 3, showSearch: true }, categories: ['streams', 'calendar', 'recentlyAdded'].map(id => ({ id, enabled: true })) },
  _calendar: [{}], _pendingRequests: [], _rightPage: 0, _recSources: {},
  _hass: { user: { is_admin: true }, states: { 'media_player.plex_tv': { state: 'playing', attributes: {} } } },
  ...over,
});

test('a live session Now Playing leaves out does not take a slot', () => {
  const c = card();
  c._renderStreams = () => '';
  const html = page(c);
  assert.match(html, /calendar/);
  assert.match(html, /recent/, 'the second category stays on the first page');
});

test('a stream Now Playing draws keeps its slot', () => {
  const c = card();
  c._renderStreams = () => '<n>now playing</n>';
  const html = page(c);
  assert.match(html, /now playing/);
  assert.match(html, /calendar/);
  assert.doesNotMatch(html, /recent/, 'with search, two categories fill the page');
});
