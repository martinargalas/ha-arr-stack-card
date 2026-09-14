// Pending Seerr requests: loading, approving, declining, withdrawing one's own. Split out of card.js.

class _PendingMethods {

  async _fetchPendingRequests() {
    if (!this._hass.user.is_admin) return;
    if (this._overseerrConfigured === false) { this._pendingRequests = []; return; }
    try {
      const data = await this._hass.callApi('GET', 'arr_stack/overseerr/pending');
      this._pendingRequests = data?.results ?? [];
    } catch (e) {
      console.error('[arr-card] Pending requests fetch error:', e);
      this._pendingRequests = [];
    }
  }

  // ── LocalStorage helpers pro pending žádosti (přežije refresh stránky) ──

  _pendingStorageKey() {
    return `arr_stack_pending_${this._hass?.user?.id || 'default'}`;
  }

  _loadPendingFromStorage() {
    if (this._hass?.user?.is_admin) return;
    try {
      const raw = localStorage.getItem(this._pendingStorageKey());
      if (raw) {
        const obj = JSON.parse(raw);
        this._familyPendingIds = new Map(
          Object.entries(obj).map(([k, v]) => [Number(k), v])
        );
      }
    } catch (e) { /* ignore */ }
  }

  _savePendingToStorage() {
    if (this._hass?.user?.is_admin) return;
    try {
      const obj = {};
      this._familyPendingIds.forEach((reqId, tmdbId) => { obj[tmdbId] = reqId; });
      localStorage.setItem(this._pendingStorageKey(), JSON.stringify(obj));
    } catch (e) { /* ignore */ }
  }

  _seerrAccountForUser() {
    if (this._hass.user.is_admin) return 'admin';
    const map = this._config.seerr_user_map || [];
    const userId = this._hass.user.id;
    const specific = map.find(m => m.ha === userId);
    if (specific) return specific.seerr;
    const def = map.find(m => m.ha === 'all_non_admin');
    if (def) return def.seerr;
    return 'family';
  }

  async _fetchMyPendingRequests() {
    if (this._hass.user.is_admin) return;
    if (this._overseerrConfigured === false) return;
    try {
      const acct = this._seerrAccountForUser();
      const data = await this._hass.callApi('GET', `arr_stack/overseerr/my_pending?userMode=${acct}`);
      const results = data?.results || [];

      // Server vrací VŠECHNY requesty (filter=all) — mapa requestId → status
      const serverReqMap = new Map(results.map(r => [r.id, r.status]));

      let changed = false;

      // 1. Cleanup — odstraň záznamy jejichž request byl zamítnut (status=3) nebo na serveru neexistuje
      for (const [tmdbId, reqId] of this._familyPendingIds) {
        const serverStatus = serverReqMap.get(reqId);
        if (serverStatus === undefined || serverStatus === 3) {
          this._familyPendingIds.delete(tmdbId);
          changed = true;
        }
      }

      // 2. Addback — přidej pending requesty (status=1) se známým tmdbId, které ještě nemáme v mapě.
      //    Zachytí "Requested" položky (re-request po zamítnutí), kde POST odpověď neobsahovala id.
      //    TV seriály mohou mít r.media.tmdbId === null — ty přeskočíme (zachytí je POST response).
      const knownReqIds = new Set(this._familyPendingIds.values());
      for (const r of results) {
        if (r.status !== 1) continue;                          // jen PENDING (čeká na schválení)
        const tmdbId = Number(r.media?.tmdbId);
        if (!tmdbId) continue;                                 // TV bez tmdbId — přeskočit
        if (this._familyPendingIds.has(tmdbId)) continue;     // už evidujeme
        if (knownReqIds.has(r.id)) continue;                  // reqId je pod jiným tmdbId
        this._familyPendingIds.set(tmdbId, r.id);
        changed = true;
      }

      if (changed) {
        this._savePendingToStorage();
        this._reRenderRight();
      }
    } catch (e) {
      // Při chybě ponecháme existující data (server dočasně nedostupný)
      console.error('[arr-card] my_pending fetch error:', e);
    }
  }

  _optimisticRemovePending(requestId) {
    this._pendingRequests = this._pendingRequests.filter(r => r.id !== requestId);
    // Clamp stránku pokud zmizel poslední prvek na ní
    const newTotal = Math.ceil(this._pendingRequests.length / 4);
    this._pages.pending = Math.max(0, Math.min(this._pages.pending, newTotal - 1));
    this._reRenderRight();
  }

  async _approvePendingRequest(requestId) {
    // Look up BEFORE optimistic remove
    const req = this._pendingRequests.find(r => r.id === requestId);
    const isMovie = req?.type === 'movie';
    this._optimisticRemovePending(requestId);
    try {
      if (isMovie && !this._seerrRadarr) await this._fetchOverseerrRadarrSettings();
      if (!isMovie && !this._seerrSonarr) await this._fetchOverseerrSonarrSettings();
      const seerr = isMovie ? this._seerrRadarr : this._seerrSonarr;
      const body = { requestId };
      if (seerr) {
        body.mediaType  = isMovie ? 'movie' : 'tv';
        body.serverId   = seerr.serverId;
        body.profileId  = seerr.profileId;
        body.rootFolder = seerr.rootFolder;
        if (!isMovie && req?.seasons) body.seasons = req.seasons.map(s => s.seasonNumber);
      }
      await this._hass.callApi('POST', 'arr_stack/overseerr/approve', body);
      await Promise.all([
        this._fetchPendingRequests(),
        this._fetchRadarr(),
        this._fetchSonarr(),
      ]);
      this._reRenderRight();
    } catch (e) {
      await this._fetchPendingRequests();
      this._reRenderRight();
      console.error('[arr-card] Approve request error:', e);
    }
  }

  async _declinePendingRequest(requestId) {
    this._optimisticRemovePending(requestId);
    try {
      await this._hass.callApi('POST', 'arr_stack/overseerr/decline', { requestId });
      this._fetchPendingRequests().then(() => this._reRenderRight());
    } catch (e) {
      await this._fetchPendingRequests();
      this._reRenderRight();
      console.error('[arr-card] Decline request error:', e);
    }
  }

  async _withdrawOverseerrRequest(requestId, mediaId) {
    this._markActivated();
    // Optimistický update — okamžitě zobrazit "+ Přidat"
    this._optimisticRequested.delete(mediaId);
    this._familyPendingIds.delete(mediaId);
    this._savePendingToStorage();
    this._withdrawnIds.add(mediaId);
    this._reRenderRight();
    try {
      await this._hass.callApi('POST', 'arr_stack/overseerr/request_delete', { requestId });
      // Po úspěchu sync reálný stav
      await this._fetchOverseerr();
      await this._fetchTvUpcoming();
      this._withdrawnIds.delete(mediaId);
      this._reRenderRight();
    } catch (e) {
      // Rollback
      this._withdrawnIds.delete(mediaId);
      this._reRenderRight();
      console.error('[arr-card] Withdraw request error:', e);
    }
  }
}

export const pendingMixin = _PendingMethods.prototype;
