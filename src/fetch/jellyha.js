import { rangeLabel } from '../shared/range.js';

// JellyHA, when it is installed: the transport the card cannot get from
// Jellyfin's own API through a browser.
//
// What is playing still comes from the proxy, so a card without JellyHA looks
// and behaves exactly as before and a stream is never listed twice. Where
// JellyHA has an entity for the same session — they agree on Jellyfin's own
// session id — that entity is attached to the row: it carries the dynamic
// range, and it is what pause, play and seek are sent to, since Home Assistant
// will drive a media_player and will not drive a session id.

class _JellyHaMethods {

  // Every JellyHA player that is bound to a session right now, by session id.
  // The map is rebuilt per pass: a session id belongs to one playback, and a
  // stale one would point the transport at somebody else's stream.
  _jhPlayers() {
    const bySession = new Map();
    for (const [entityId, st] of Object.entries(this._hass?.states || {})) {
      if (!entityId.startsWith('media_player.')) continue;
      const a = st?.attributes || {};
      if (!a.session_id) continue;
      bySession.set(String(a.session_id), { entityId, state: st.state, attr: a });
    }
    return bySession;
  }

  // What Jellyfin itself says about the stream, for cards without JellyHA.
  // Dolby Vision arrives as its own flag on the stream rather than as a range.
  _jfRangeOf(nowPlaying) {
    const video = (nowPlaying?.MediaStreams || []).find(s => (s.Type || '') === 'Video');
    if (!video) return '';
    if (video.VideoDoViTitle || video.DvProfile) return 'DV';
    return rangeLabel(video.VideoRangeType || video.VideoRange);
  }

  // Ties the two together, once per fetch of the sessions.
  _jhAttach(sessions) {
    const players = this._jhPlayers();
    if (!players.size) return sessions;
    for (const s of sessions) {
      const sessionId = String(s.id || '').replace(/^jellyfin:/, '');
      const hit = players.get(sessionId);
      if (!hit) continue;
      s.attr._jhEntity = hit.entityId;
      // JellyHA polls Jellyfin itself, so where it has an opinion it is at
      // least as fresh as ours and knows things the session list does not.
      const range = rangeLabel(hit.attr.video_range_type || hit.attr.dynamic_range || hit.attr.video_range);
      if (range) s.attr._dynRange = range;
      if (hit.attr.media_position != null) s.attr.media_position = hit.attr.media_position;
      if (hit.attr.media_duration) s.attr.media_duration = hit.attr.media_duration;
      if (hit.attr.media_position_updated_at) s.attr.media_position_updated_at = hit.attr.media_position_updated_at;
      if (hit.state === 'playing' || hit.state === 'paused') s.state = hit.state;
    }
    return sessions;
  }

  // Whether JellyHA is installed at all, which is what decides whether the
  // card offers to play on a Jellyfin client. Asked of the services rather
  // than of the entities: a player that is idle has no session to find.
  _jhInstalled() {
    return !!this._hass?.services?.jellyha?.session_play;
  }

  // The Jellyfin clients a title can be sent to. JellyHA names its players
  // after itself, which is the only thing that tells them apart from every
  // other media_player in the house; the library browser is a place to browse,
  // not a screen to play on.
  _jhTargets() {
    return Object.entries(this._hass?.states || {})
      .filter(([id]) => id.startsWith('media_player.jellyha_') && !id.endsWith('_library_browser'))
      .map(([entityId, st]) => ({
        entityId,
        name: st?.attributes?.device_name || st?.attributes?.friendly_name || entityId,
        idle: st?.state === 'idle' || st?.state === 'off' || st?.state === 'unavailable',
      }))
      .sort((a, b) => Number(a.idle) - Number(b.idle) || a.name.localeCompare(b.name));
  }

  // Jellyfin keys its library by its own item ids, which say nothing about
  // TMDB, so a title is found by name and year — the same way a person would.
  async _jhFindItem(title, year, isMovie) {
    if (!title) return null;
    const data = { query: title, media_type: isMovie ? 'Movie' : 'Series', limit: 5 };
    if (year) data.year = Number(year);
    let res;
    try {
      res = await this._hass.callService('jellyha', 'search', data, undefined, false, true);
    } catch (_) {
      return null;
    }
    const items = res?.response?.items || [];
    if (!items.length) return null;
    // The year decides between remakes; without one the first is as good a
    // guess as Jellyfin's own search makes.
    const wanted = year ? items.find(i => String(i.year) === String(year)) : null;
    return (wanted || items[0])?.id || null;
  }

  // A stream that has just ended. Jellyfin sessions are read through the proxy
  // on a timer, so a poster hung about for seconds after the television went
  // quiet; a JellyHA player says so the moment it happens. The row goes now and
  // the next poll is allowed immediately, which settles whatever else changed.
  _jhSessionsEnded(cur, old) {
    const live = this._jellyfinSessions || [];
    if (!live.length) return false;
    const ended = new Set();
    for (const [entityId, prevSt] of Object.entries(old || {})) {
      if (!entityId.startsWith('media_player.')) continue;
      const sessionId = prevSt?.attributes?.session_id;
      if (!sessionId) continue;
      const wasActive = prevSt.state === 'playing' || prevSt.state === 'paused';
      if (!wasActive) continue;
      const nowSt = cur?.[entityId];
      const stillActive = nowSt && (nowSt.state === 'playing' || nowSt.state === 'paused')
        && String(nowSt.attributes?.session_id || '') === String(sessionId);
      if (!stillActive) ended.add(`jellyfin:${sessionId}`);
    }
    if (!ended.size) return false;
    const kept = live.filter(s => !ended.has(s.id));
    if (kept.length === live.length) return false;
    this._jellyfinSessions = kept;
    this._jellyfinLastFetch = 0;
    return true;
  }

  // The entity a stream's controls act on, or nothing when the card has no way
  // of driving it — the buttons are then not drawn at all.
  _jhControlEntity(streamId) {
    if (!streamId) return '';
    if (!String(streamId).startsWith('jellyfin:')) return '';
    const hit = (this._jellyfinSessions || []).find(s => s.id === streamId);
    return hit?.attr?._jhEntity || '';
  }
}

export const jellyhaMixin = _JellyHaMethods.prototype;
