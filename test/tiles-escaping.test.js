// The statistics tiles draw what other people set: a Plex or Jellyfin user names
// themselves, and a library, episode or series title carries whatever its
// metadata says. The tiles render for an admin, so markup that got through would
// run with the admin's Home Assistant session. None of it may become markup.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse } from './harness.js';

const EVIL = '<img src=x onerror="alert(1)">';

function inert(html, what) {
  const dom = parse(html);
  assert.equal(dom.querySelectorAll('[onerror="alert(1)"]').length, 0, `${what}: markup got through`);
  assert.ok(dom.textContent.includes('<img src=x'), `${what}: shown as text instead`);
  return dom;
}

test('an image address is kept only when it is a web or site path', () => {
  const card = makeCard();
  assert.equal(card._imgSrc('https://plex.tv/users/1/avatar'), 'https://plex.tv/users/1/avatar');
  assert.equal(card._imgSrc('/api/avatar/1'), '/api/avatar/1');
  assert.equal(card._imgSrc('javascript:alert(1)'), '');
  assert.equal(card._imgSrc('//evil.example/x.png'), '', 'no protocol-relative host');
  assert.equal(card._imgSrc('data:image/svg+xml,<svg onload=alert(1)>'), '');
  assert.equal(card._imgSrc('https://a/b"onerror="alert(1)'), 'https://a/b&quot;onerror=&quot;alert(1)', 'a quote cannot close the attribute');
  assert.equal(card._imgSrc(null), '');
});

test('Tautulli tiles show names, titles and libraries as text', () => {
  const card = makeCard();
  inert(card._tlHistoryCard({ recentHistory: [{ full_title: EVIL, friendly_name: EVIL, date: 1700000000 }], activity: {} }), 'history');
  inert(card._tlLibCard({ libraries: [{ section_type: 'movie', section_name: EVIL, count: 3 }] }), 'libraries');
  inert(card._tlSharingCard({ sharingUsers: [EVIL] }), 'sharing');
  const users = inert(card._tlUsersCard([{ stat_id: 'top_users', rows: [{ friendly_name: EVIL, total_plays: 2, user_thumb: 'javascript:alert(1)' }] }], { sessions: [] }, {}), 'users');
  assert.equal(users.querySelector('img'), null, 'a javascript: avatar draws no picture');
});

test('Tracearr tiles show names and violation types as text', () => {
  const card = makeCard();
  const tr = inert(card._traTranscodeCard({ topTranscode: [{ username: EVIL, transcodeCount: 2, avatar: '" onerror="alert(1)' }] }), 'transcodes');
  assert.equal(tr.querySelector('img'), null, 'an avatar that is not an address is dropped');
  const users = inert(card._traUsersCard({ users: [{ id: 1, username: EVIL, trustScore: 50, thumbUrl: 'https://tracearr.local/a.png' }] }), 'users');
  assert.equal(users.querySelector('img')?.getAttribute('src'), 'https://tracearr.local/a.png', 'a real avatar still shows');
  inert(card._traViolationsCard({ violations: [{ type: EVIL, username: EVIL, severity: 'high' }], violationTotal: 1 }), 'violations');
});

test('Jellystat tiles show names, titles and libraries as text', () => {
  const card = makeCard();
  inert(card._jsHistoryCard({ recentHistory: [{ NowPlayingItemName: EVIL, SeriesName: EVIL, UserName: EVIL }], activity: { Sessions: [] } }), 'history');
  inert(card._jsLibCard({ libraries: [{ Name: EVIL, CollectionType: 'movies', item_count: 1 }] }), 'libraries');
  inert(card._jsUsersCard({ users: [{ Name: EVIL, Plays: 1 }], activity: { Sessions: [] } }), 'users');
});
