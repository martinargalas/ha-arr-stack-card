// Next and previous have to land: the poster and the popup show the new track
// as soon as the player has it, not after a wait long enough to be noticed.
import test from 'node:test';
import assert from 'node:assert';
import { makeCard } from './harness.js';

function card() {
  const c = makeCard();
  c._renderPopupEl = () => { c._rendered = (c._rendered || 0) + 1; };
  c._reRenderSection = () => {};
  return c;
}

function jfSession(title) {
  return {
    id: 'jellyfin:s1', source: 'jellyfin', state: 'playing',
    attr: { media_title: title, media_artist: 'Boards of Canada', media_duration: 200, media_position: 0 },
  };
}

test('a stream is read wherever it lives, session or entity', () => {
  const c = card();
  c._jellyfinSessions = [jfSession('Roygbiv')];
  assert.equal(c._streamAttrOf('jellyfin:s1').media_title, 'Roygbiv');
  c._hass = { ...c._hass, states: { 'media_player.hifi': { attributes: { media_title: 'Olson' } } } };
  assert.equal(c._streamAttrOf('media_player.hifi').media_title, 'Olson');
});

test('the signature ignores the position, which moves on its own', () => {
  const c = card();
  c._jellyfinSessions = [jfSession('Roygbiv')];
  const before = c._streamSignature('jellyfin:s1');
  c._jellyfinSessions[0].attr.media_position = 42;
  assert.equal(c._streamSignature('jellyfin:s1'), before);
  c._jellyfinSessions[0].attr.media_title = 'Olson';
  assert.notEqual(c._streamSignature('jellyfin:s1'), before);
});

test('the card follows the player as soon as it has the new track', async () => {
  const c = card();
  c._jellyfinSessions = [jfSession('Roygbiv')];
  let polls = 0;
  c._fetchJellyfinSessions = async () => {
    polls++;
    if (polls >= 2) c._jellyfinSessions = [jfSession('Olson')];
  };
  let applied = 0;
  c._streamAfterSkip('jellyfin:s1', () => { applied++; });
  await new Promise(r => setTimeout(r, 1200));
  assert.equal(applied, 1, 'once, when the track changed');
  assert.ok(polls >= 2 && polls <= 5, `and it asked only as often as it had to (${polls})`);
});

test('the proxy is asked again at once — its own throttle does not apply', async () => {
  const c = card();
  c._jellyfinSessions = [jfSession('Roygbiv')];
  c._jellyfinLastFetch = Date.now();
  let asked = 0;
  c._fetchJellyfinSessions = async () => { asked++; c._jellyfinSessions = [jfSession('Olson')]; };
  await c._streamRefetch('jellyfin:s1');
  assert.equal(asked, 1);
  assert.equal(c._jellyfinLastFetch, 0, 'the throttle is cleared before asking');
});

test('a second skip takes the card over from the first', async () => {
  const c = card();
  c._jellyfinSessions = [jfSession('Roygbiv')];
  c._fetchJellyfinSessions = async () => {};
  let first = 0, second = 0;
  c._streamAfterSkip('jellyfin:s1', () => { first++; });
  c._streamAfterSkip('jellyfin:s1', () => { second++; });
  c._jellyfinSessions = [jfSession('Olson')];
  await new Promise(r => setTimeout(r, 900));
  assert.equal(first, 0, 'the skip that was overtaken never applies');
  assert.equal(second, 1);
});

test('the music popup is rebuilt around whatever is playing now', () => {
  const c = card();
  c._jellyfinSessions = [jfSession('Olson')];
  c._popup = { _type: 'stream', _streamEntity: 'jellyfin:s1', title: 'Roygbiv', _poster: 'old.jpg' };
  c._streamRefreshPopup('jellyfin:s1');
  assert.equal(c._popup.title, 'Olson');
  assert.equal(c._popup._artist, 'Boards of Canada');
  assert.ok(c._rendered >= 1, 'and drawn again');
});

test('a popup for another stream is left alone', () => {
  const c = card();
  c._jellyfinSessions = [jfSession('Olson')];
  c._popup = { _type: 'stream', _streamEntity: 'jellyfin:other', title: 'Roygbiv' };
  c._streamRefreshPopup('jellyfin:s1');
  assert.equal(c._popup.title, 'Roygbiv');
});

// A shuffled playlist is the hard case: the track changes and so does the
// artist, so the window has to change with it.
test('the artist window follows the playlist to the next artist', () => {
  const c = card();
  c._hass = { ...c._hass, states: {
    'media_player.hifi': { state: 'playing', attributes: { media_artist: 'Autechre', media_title: 'Gantz Graf' } },
  } };
  c._lidarrArtists = new Map([
    [1, { id: 1, artistName: 'Boards of Canada' }],
    [2, { id: 2, artistName: 'Autechre' }],
  ]);
  const opened = [];
  c._openMusicModal = (id, opts) => opened.push([id, opts?.stream]);
  c._renderMusicModalEl = () => {};
  c._musicModal = { artistId: 1, stream: 'media_player.hifi' };
  c._musFollowStream('media_player.hifi');
  assert.deepEqual(opened, [[2, 'media_player.hifi']]);
});

test('a track by the same artist redraws the window rather than reopening it', () => {
  const c = card();
  c._hass = { ...c._hass, states: {
    'media_player.hifi': { state: 'playing', attributes: { media_artist: 'Autechre' } },
  } };
  c._lidarrArtists = new Map([[2, { id: 2, artistName: 'Autechre' }]]);
  let opened = 0, drawn = 0;
  c._openMusicModal = () => { opened++; };
  c._renderMusicModalEl = () => { drawn++; };
  c._musicModal = { artistId: 2, stream: 'media_player.hifi' };
  c._musFollowStream('media_player.hifi');
  assert.equal(opened, 0);
  assert.equal(drawn, 1);
});

test('an artist the library does not hold opens as a preview, not as the old popup', async () => {
  const c = card();
  c._hass = { ...c._hass, states: {
    'media_player.hifi': { state: 'playing', attributes: { media_artist: 'JAY-Z', media_title: 'Pray' } },
  } };
  c._lidarrArtists = new Map([[2, { id: 2, artistName: 'Autechre' }]]);
  c._callApi = async () => ([{ artistName: 'JAY-Z', foreignArtistId: 'mb-jay' }]);
  const previews = [];
  c._openMusicPreview = (mbid, opts) => previews.push([mbid, opts?.stream]);
  let bare = 0;
  c._openStreamPopup = () => { bare++; };
  c._renderMusicModalEl = () => {};
  c._musicModal = { artistId: 2, stream: 'media_player.hifi' };
  await c._musFollowStream('media_player.hifi');
  assert.deepEqual(previews, [['mb-jay', 'media_player.hifi']]);
  assert.equal(bare, 0, 'the old stream popup is never opened');
  assert.equal(c._musUnownedArtist('mb-jay')?.artistName, 'JAY-Z',
    'and the preview finds the record the lookup brought back');
});

test('a name Lidarr cannot place leaves the window as it is', async () => {
  const c = card();
  c._hass = { ...c._hass, states: {
    'media_player.hifi': { state: 'playing', attributes: { media_artist: 'Nobody At All' } },
  } };
  c._lidarrArtists = new Map();
  c._callApi = async () => ([{ artistName: 'Somebody Else', foreignArtistId: 'mb-else' }]);
  let previews = 0, drawn = 0;
  c._openMusicPreview = () => { previews++; };
  c._renderMusicModalEl = () => { drawn++; };
  c._musicModal = { artistId: 2, stream: 'media_player.hifi' };
  await c._musFollowStream('media_player.hifi');
  assert.equal(previews, 0, 'a near miss is not the artist');
  assert.equal(drawn, 1);
  assert.ok(c._musicModal, 'and the window stays open');
});

// Clicking a playing track opens the same window a skip lands on — one design
// for music, not two.
test('a playing track opens the artist window, not the bare stream popup', async () => {
  const c = card();
  c._lidarrConfigured = true;
  c._hass = { ...c._hass, states: {
    'media_player.hifi': { state: 'playing', attributes: { media_artist: 'Autechre', media_title: 'Gantz Graf' } },
  } };
  c._lidarrArtists = new Map([[2, { id: 2, artistName: 'Autechre' }]]);
  const opened = [];
  c._openMusicModal = (id, opts) => opened.push([id, opts?.stream]);
  await c._musOpenForStream('media_player.hifi', 'Gantz Graf');
  assert.deepEqual(opened, [[2, 'media_player.hifi']]);
});

test('a stream with no artist at all still opens something', async () => {
  const c = card();
  c._hass = { ...c._hass, states: {
    'media_player.radio': { state: 'playing', attributes: { media_title: 'BBC Radio 6' } },
  } };
  c._lidarrArtists = new Map();
  const bare = [];
  c._openStreamPopup = (...args) => bare.push(args);
  await c._musOpenForStream('media_player.radio', 'BBC Radio 6');
  assert.equal(bare.length, 1);
  assert.equal(bare[0][4]?.bare, true, 'and says so, so it cannot bounce back here');
});

// Players and libraries do not agree on punctuation, and a name that does not
// compare equal means a window that never follows the track.
test('a name is matched past the punctuation a player writes it with', () => {
  const c = card();
  c._hass = { ...c._hass, states: {
    // JAY‑Z, with the non-breaking hyphen a player sends
    'media_player.hifi': { state: 'playing', attributes: { media_artist: 'JAY‑Z' } },
  } };
  c._lidarrArtists = new Map([[3, { id: 3, artistName: 'JAY-Z' }]]);
  assert.equal(c._musStreamArtist('media_player.hifi')?.id, 3);
});

test('and past case, accents and the album artist standing in', () => {
  const c = card();
  c._hass = { ...c._hass, states: {
    'media_player.hifi': { state: 'playing', attributes: { media_album_artist: 'sigur ros' } },
  } };
  c._lidarrArtists = new Map([[4, { id: 4, artistName: 'Sigur Rós' }]]);
  assert.equal(c._musStreamArtist('media_player.hifi')?.id, 4);
});

// The artist window says what the track is, the way a film's detail says what
// its copy is.
test('Plex is asked once for the track, and the chip says what it is', async () => {
  const c = card();
  c._hass = { ...c._hass, states: {
    'media_player.hifi': { state: 'playing', attributes: { media_content_id: 16399, media_artist: 'JAY-Z' } },
  } };
  let calls = 0;
  c._callApi = async () => {
    calls++;
    return { MediaContainer: { Metadata: [{ Media: [{ audioCodec: 'flac', bitrate: 1411 }] }] } };
  };
  c._renderMusicModalEl = () => {};
  c._musicModal = { artistId: 1, stream: 'media_player.hifi' };
  await c._musLoadTrackQuality('media_player.hifi');
  await c._musLoadTrackQuality('media_player.hifi');
  assert.equal(calls, 1, 'a track does not change while it plays');
  assert.match(c._musStreamQualChip(), /FLAC · 1411 kbps/);
});

test('Jellyfin says it in the session, so nothing is asked', async () => {
  const c = card();
  c._jellyfinSessions = [{
    id: 'jellyfin:s1', attr: { _jfItemId: 'it-1', _audioCodec: 'mp3', _audioBitrate: 320 },
  }];
  let calls = 0;
  c._callApi = async () => { calls++; return null; };
  c._renderMusicModalEl = () => {};
  c._musicModal = { artistId: 1, stream: 'jellyfin:s1' };
  await c._musLoadTrackQuality('jellyfin:s1');
  assert.equal(calls, 0);
  assert.match(c._musStreamQualChip(), /MP3 · 320 kbps/);
});

test('a stream whose format nobody states shows no chip', async () => {
  const c = card();
  c._hass = { ...c._hass, states: { 'media_player.radio': { state: 'playing', attributes: {} } } };
  c._musicModal = { artistId: 1, stream: 'media_player.radio' };
  await c._musLoadTrackQuality('media_player.radio');
  assert.equal(c._musStreamQualChip(), '');
});

// Most track changes are not skips: an album runs out, a playlist moves on.
test('a track that ends on its own moves the window along too', () => {
  const c = card();
  c._hass = { ...c._hass, states: {
    'media_player.hifi': { state: 'playing', attributes: { media_artist: 'Autechre', media_title: 'Gantz Graf' } },
  } };
  c._musicModal = { artistId: 2, stream: 'media_player.hifi' };
  let followed = 0;
  c._musFollowStream = () => { followed++; };
  c._musWatchStream();
  assert.equal(followed, 0, 'the first pass only takes the reading');
  c._musWatchStream();
  assert.equal(followed, 0, 'and nothing changed');
  c._hass = { ...c._hass, states: {
    'media_player.hifi': { state: 'playing', attributes: { media_artist: 'Boards of Canada', media_title: 'Olson' } },
  } };
  c._musWatchStream();
  assert.equal(followed, 1);
});

test('a skip already being followed is left to finish', () => {
  const c = card();
  c._hass = { ...c._hass, states: {
    'media_player.hifi': { state: 'playing', attributes: { media_title: 'Gantz Graf' } },
  } };
  c._musicModal = { artistId: 2, stream: 'media_player.hifi' };
  let followed = 0;
  c._musFollowStream = () => { followed++; };
  c._musWatchStream();
  c._skipTimer = 1;
  c._hass = { ...c._hass, states: {
    'media_player.hifi': { state: 'playing', attributes: { media_title: 'Olson' } },
  } };
  c._musWatchStream();
  assert.equal(followed, 0, 'two followers would fight over the window');
});
