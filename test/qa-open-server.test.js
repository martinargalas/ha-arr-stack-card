// Where a stream is playing is where the title can be opened, and nowhere
// else: the entry follows the session, and everything the link needs comes
// from that session rather than from a lookup.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function card({ api = {} } = {}) {
  const c = makeCard();
  c._plexConfigured = true;
  c._jellyfinConfigured = true;
  c._qaHasFiles = () => true;
  c._jhInstalled = () => false;
  c._callApi = async (method, path) => {
    for (const [frag, body] of Object.entries(api)) if (path.includes(frag)) return body;
    return null;
  };
  return c;
}

const JF_POPUP = {
  _type: 'radarr', id: 550, title: 'Fight Club', _radarrId: 7,
  _streamEntity: 'jellyfin:sess1', _jfSessionId: 'sess1',
};
const JF_SESSION = {
  id: 'jellyfin:sess1', source: 'jellyfin', state: 'playing',
  attr: { _jfItemId: 'item-9', _jfServerUrl: 'http://192.168.1.10:8096/', _jfServerId: 'srv-1' },
};
const PLEX_POPUP = {
  _type: 'radarr', id: 550, title: 'Fight Club',
  _streamEntity: 'plex:player-1', _plexSessionId: 'psess',
};
const PLEX_SESSION = { id: 'plex:player-1', source: 'plex', attr: {}, _plexRatingKey: '4321', _plexSessionId: 'psess' };

test('the Jellyfin link is built from the session, with no lookup at all', async () => {
  const c = card();
  c._jellyfinSessions = [JF_SESSION];
  let asked = false;
  c._callApi = async () => { asked = true; return null; };
  const url = await c._qaServerWebUrl(JF_POPUP);
  assert.equal(url, 'http://192.168.1.10:8096/web/index.html#/details?id=item-9&serverId=srv-1');
  assert.equal(asked, false, 'the session already knows the server and the item');
});

test('the Plex link keys on the server, which the session does not carry', async () => {
  const c = card({ api: { 'plex/identity': { machineIdentifier: 'abc123' } } });
  c._plexSessions = [PLEX_SESSION];
  const url = await c._qaServerWebUrl(PLEX_POPUP);
  assert.match(url, /app\.plex\.tv/);
  assert.match(url, /\/server\/abc123\//);
  assert.match(url, /key=%2Flibrary%2Fmetadata%2F4321/);
});

test('a Plex popup opened from a Home Assistant player is matched by its session id', () => {
  const c = card();
  c._plexSessions = [PLEX_SESSION];
  const d = { _streamEntity: 'media_player.plex_tv', _plexSessionId: 'psess' };
  assert.equal(c._qaOpenServerKind(d), 'plex');
});

test('Emby is opened the way Emby words it', async () => {
  const c = card();
  c._embySessions = [{
    id: 'emby:s2', source: 'emby',
    attr: { _embyItemId: 'e-7', _embyServerUrl: 'http://emby:8096', _embyServerId: 'esrv' },
  }];
  const d = { _streamEntity: 'emby:s2', _embySessionId: 's2' };
  assert.equal(await c._qaServerWebUrl(d),
    'http://emby:8096/web/index.html#!/item?id=e-7&serverId=esrv');
});

test('the entry names the server the stream is on, and only that one', () => {
  const c = card();
  c._jellyfinSessions = [JF_SESSION];
  c._plexSessions = [PLEX_SESSION];
  const jf = c._qaItems(JF_POPUP).filter(i => i.key === 'srvOpen');
  assert.equal(jf.length, 1);
  assert.equal(jf[0].icon, 'jellyfin');
  const px = c._qaItems(PLEX_POPUP).filter(i => i.key === 'srvOpen');
  assert.equal(px.length, 1);
  assert.equal(px[0].icon, 'plex');
});

test('a title that is not playing anywhere is not offered a server to open', () => {
  const c = card();
  c._jellyfinSessions = [JF_SESSION];
  const keys = c._qaItems({ _type: 'radarr', id: 550, title: 'Fight Club' }).map(i => i.key);
  assert.ok(!keys.includes('srvOpen'));
});

test('Kodi plays to a screen, not to a library, so it has no page to open', () => {
  const c = card();
  c._kodiSessions = [{ id: 'media_player.kodi' }];
  const d = { _streamEntity: 'media_player.kodi', _kodiEntityId: 'media_player.kodi' };
  assert.equal(c._qaOpenServerKind(d), null);
});

test('nothing is opened when no link can be built, and the card says so', async () => {
  const c = card();
  let opened = null;
  global.window = { open: (u) => { opened = u; } };
  const notes = [];
  c.dispatchEvent = (e) => notes.push(e.detail?.message);
  await c._qaOpenOnServer(JF_POPUP);
  assert.equal(opened, null);
  assert.equal(notes.length, 1);
});
