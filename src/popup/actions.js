import { POPUP_TYPE } from '../constants.js';

// The detail popup's buttons, one method per data-action. They used to be
// fifty branches of one click handler inside _renderPopupEl; the handler now
// looks the action up in POPUP_ACTIONS and calls the method it names. Each
// gets the clicked element, the event, and the popup's root and overlay.

export const POPUP_ACTIONS = {
  'plex-cast-open': '_ppActPlexCastOpen',
  'search-expand': '_ppActSearchExpand',
  'search-collapse': '_ppActSearchCollapse',
  'search-pick-inst': '_ppActSearchPickInst',
  'search-pick-as': '_ppActSearchPickAs',
  'search-pick-is': '_ppActSearchPickIs',
  'as-confirm-yes': '_ppActAsConfirmYes',
  'as-confirm-no': '_ppActAsConfirmNo',
  'as-season-search': '_ppActAsSeasonSearch',
  'as-ep-search': '_ppActAsEpSearch',
  'ep-del-confirm': '_ppActEpDelConfirm',
  'ep-del-no': '_ppActEpDelNo',
  'ep-del-yes': '_ppActEpDelYes',
  'season-del-confirm': '_ppActSeasonDelConfirm',
  'season-del-no': '_ppActSeasonDelNo',
  'season-del-yes': '_ppActSeasonDelYes',
  'is-confirm-yes': '_ppActIsConfirmYes',
  'is-confirm-no': '_ppActIsConfirmNo',
  'sn-confirm-yes': '_ppActSnConfirmYes',
  'sn-confirm-no': '_ppActSnConfirmNo',
  'sn-season-toggle': '_ppActSnSeasonToggle',
  'popup-cast-toggle': '_ppActPopupCastToggle',
  'popup-cast-prev': '_ppActPopupCastPrev',
  'popup-cast-next': '_ppActPopupCastNext',
  'popup-monitor-expand': '_ppActPopupMonitorExpand',
  'popup-monitor-toggle': '_ppActPopupMonitorToggle',
  'popup-monitor-add-confirm': '_ppActPopupMonitorAddConfirm',
  'popup-monitor-add-no': '_ppActPopupMonitorAddNo',
  'popup-monitor-add-yes': '_ppActPopupMonitorAddYes',
  'popup-mon-search-as': '_ppActPopupMonSearchAs',
  'popup-mon-search-is': '_ppActPopupMonSearchIs',
  'popup-mon-search-no': '_ppActPopupMonSearchNo',
  'sn-season-monitor': '_ppActSnSeasonMonitor',
  'sn-season-is': '_ppActSnSeasonIs',
  'sn-ep-is': '_ppActSnEpIs',
  'sn-back': '_ppActSnBack',
  'remove-confirm': '_ppActRemoveConfirm',
  'remove-instance': '_ppActRemoveInstance',
  'remove-choose-lib': '_ppActRemoveChoose',
  'remove-choose-disc': '_ppActRemoveChoose',
  'remove-armed-no': '_ppActRemoveArmedNo',
  'remove-armed-yes': '_ppActRemoveArmedYes',
  'remove-no': '_ppActRemoveNo',
  'remove-yes': '_ppActRemoveYes',
  'stream-playpause': '_ppActStreamPlaypause',
  'stream-prev': '_ppActStreamPrev',
  'stream-next': '_ppActStreamNext',
  'stream-terminate-show': '_ppActStreamTerminateShow',
  'stream-terminate-cancel': '_ppActStreamTerminateCancel',
  'stream-terminate-confirm': '_ppActStreamTerminateConfirm',
  'stream-seek': '_ppActStreamSeek',
};

class _PopupActionMethods {

// Whether a click was one of the actions above — and if so, it is handled.
_ppRunAction(t, e, ctx) {
  const method = t.dataset.action && POPUP_ACTIONS[t.dataset.action];
  if (!method) return false;
  this[method](t, e, ctx);
  return true;
}

// Panels that shut one another: opening one closes the rest.
_ppCloseAS() {
  this._asOpen = false; this._asExpanded = false; this._asState = null;
  this._asMovieSearched = false; this._asNotFound = new Set();
}
_ppCloseIS() {
  this._isState = null; this._isExpanded = false;
}
_ppCloseSnIS() {
  this._snIsOpen = false; this._snIsExpanded = false;
  this._snIsState = null; this._snActiveIs = null;
}
_ppCloseRemove() { this._removeConfirm = false; }

  // ── Plex Cast handlers ───────────────────────────────────────────────
_ppActPlexCastOpen(t, e, { root, overlay } = {}) {
  if (this._plexCastOpen) {
    this._plexCastOpen = false;
    this._renderPopupEl();
    return;
  }
  this._plexCastOpen    = true;
  this._plexClients     = null;
  const rect = t.getBoundingClientRect();
  this._plexCastBtnRect = { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
  this._renderPopupEl();
  this._fetchPlexClients();
  return;
}

  // ── Unified Search button handlers ───────────────────────────────────
_ppActSearchExpand(t, e, { root, overlay } = {}) {
  this._ppCloseAS(); this._ppCloseIS(); this._ppCloseSnIS(); this._ppCloseRemove();
  this._ppMenu = null;   // also clears any expanded drawer
  this._searchExpand = 'pick';
  this._renderPopupEl();
  return;
}

_ppActSearchCollapse(t, e, { root, overlay } = {}) {
  this._ppCloseAS(); this._ppCloseIS(); this._ppCloseSnIS(); this._ppCloseRemove();
  this._searchExpand = null; this._searchPickInst = null;
  this._renderPopupEl();
  return;
}

_ppActSearchPickInst(t, e, { root, overlay } = {}) {
  // Dual flow step 1: instance selected → go to pick-mode (AS/IS)
  this._searchPickInst = t.dataset.instance;
  this._searchExpand   = 'pick-mode';
  this._renderPopupEl();
  return;
}

_ppActSearchPickAs(t, e, { root, overlay } = {}) {
  // The flat menu names its instance on the row itself
  if (t.dataset.instance) this._searchPickInst = t.dataset.instance;
  this._ppCloseIS(); this._ppCloseSnIS(); this._ppCloseRemove();
  // The choice is made, so the list rolls away — the panel it opens is the
  // answer, and the Search button stays lit to say where it came from.
  this._searchExpand = null;
  const dd2 = this._popup;
  const _isMovT2 = dd2._type === 'radarr' || dd2._type === 'movie';
  // In pick-mode: instance already chosen via _searchPickInst
  const inst = this._searchPickInst
    ?? (_isMovT2
      ? (dd2._radarrId ? 'radarr' : (dd2._radarr2Id ? 'radarr2' : 'radarr'))
      : (dd2._sonarrSeries ? 'sonarr' : (dd2._sonarr2Series ? 'sonarr2' : 'sonarr')));
  if (this._asOpen && this._asInstance === inst) {
    this._asOpen = false; this._asState = null;
    this._renderPopupEl();
  } else {
    this._asOpen = true; this._asInstance = inst; this._asState = null;
    this._asMovieSearching = false; this._asMovieSearched = false;
    this._asSearchingItems = new Set(); this._asSearchedItems = new Set(); this._asError = null;
    if (_isMovT2) {
      const mId = inst === 'radarr2' ? dd2._radarr2Id : dd2._radarrId;
      if (!mId) { this._asState = 'confirm'; this._renderPopupEl(); }
      else { this._triggerRadarrAutoSearch(inst); }
    } else {
      const ss = inst === 'sonarr2' ? dd2._sonarr2Series : dd2._sonarrSeries;
      this._asState = ss ? 'seasons' : 'confirm';
      this._renderPopupEl();
    }
  }
  return;
}

_ppActSearchPickIs(t, e, { root, overlay } = {}) {
  // The flat menu names its instance on the row itself
  if (t.dataset.instance) this._searchPickInst = t.dataset.instance;
  this._ppCloseAS(); this._ppCloseRemove();
  this._searchExpand = null;
  const dd2 = this._popup;
  const _isMovT2 = dd2._type === 'radarr' || dd2._type === 'movie';
  // In pick-mode: instance already chosen via _searchPickInst
  const inst = this._searchPickInst
    ?? (_isMovT2
      ? (dd2._radarrId ? 'radarr' : (dd2._radarr2Id ? 'radarr2' : 'radarr'))
      : (dd2._sonarrSeries ? 'sonarr' : (dd2._sonarr2Series ? 'sonarr2' : 'sonarr')));
  if (_isMovT2) {
    const radarrId = inst === 'radarr2' ? dd2._radarr2Id : dd2._radarrId;
    if (this._isState && this._isInstance === inst && this._isState !== 'loading') {
      this._isState = null; this._renderPopupEl();
    } else if (this._isState === 'loading') {
      return;
    } else {
      this._ppCloseSnIS();
      this._isInstance = inst; this._isState = null;
      if (!radarrId) { this._isState = 'confirm-add'; this._renderPopupEl(); }
      else { this._fetchInteractiveSearch(radarrId, inst); }
    }
  } else {
    if (this._snIsOpen && this._snIsInstance === inst) {
      this._snIsOpen = false; this._snActiveIs = null; this._snIsState = null;
      this._renderPopupEl();
    } else {
      this._ppCloseIS();
      this._snIsInstance = inst; this._snIsOpen = true; this._snActiveIs = null;
      this._snIsState = null; this._snSeasonsPage = 0;
      const seriesInInst = inst === 'sonarr2' ? dd2._sonarr2Series : dd2._sonarrSeries;
      if (!seriesInInst) { this._snIsState = 'confirm-add'; }
      this._renderPopupEl();
    }
  }
  return;
}

_ppActAsConfirmYes(t, e, { root, overlay } = {}) {
  const dd = this._popup;
  const isMovT = dd._type === 'radarr' || dd._type === 'movie';
  if (isMovT) {
    this._triggerRadarrAutoSearch(this._asInstance);
  } else {
    this._addSeriesForAs(this._asInstance);
  }
  return;
}

_ppActAsConfirmNo(t, e, { root, overlay } = {}) {
  this._asOpen  = false;
  this._asState = null;
  this._renderPopupEl();
  return;
}

_ppActAsSeasonSearch(t, e, { root, overlay } = {}) {
  const n = parseInt(t.dataset.season);
  this._triggerSonarrSeasonSearch(n, this._asInstance);
  return;
}

_ppActAsEpSearch(t, e, { root, overlay } = {}) {
  const epId    = parseInt(t.dataset.epid);
  const seasonN = parseInt(t.dataset.season);
  this._triggerSonarrEpisodeSearch(epId, seasonN, this._asInstance);
  return;
}

  // Episode file delete — confirm / yes / no
_ppActEpDelConfirm(t, e, { root, overlay } = {}) {
  this._epFileConfirm = parseInt(t.dataset.epid);
  this._seasonFileConfirm = null;
  this._renderPopupEl();
  return;
}

_ppActEpDelNo(t, e, { root, overlay } = {}) {
  this._epFileConfirm = null;
  this._renderPopupEl();
  return;
}

_ppActEpDelYes(t, e, { root, overlay } = {}) {
  const efId    = parseInt(t.dataset.efid);
  const seasonN = parseInt(t.dataset.season);
  const inst    = this._asOpen ? this._asInstance : (this._snIsInstance || 'sonarr');
  this._epFileConfirm = null;
  this._deleteEpisodeFile(efId, seasonN, inst);
  return;
}

  // Season files delete — confirm / yes / no
_ppActSeasonDelConfirm(t, e, { root, overlay } = {}) {
  this._seasonFileConfirm = parseInt(t.dataset.season);
  this._epFileConfirm = null;
  this._renderPopupEl();
  return;
}

_ppActSeasonDelNo(t, e, { root, overlay } = {}) {
  this._seasonFileConfirm = null;
  this._renderPopupEl();
  return;
}

_ppActSeasonDelYes(t, e, { root, overlay } = {}) {
  const seasonN = parseInt(t.dataset.season);
  const inst    = this._asOpen ? this._asInstance : (this._snIsInstance || 'sonarr');
  this._seasonFileConfirm = null;
  this._deleteSeasonFiles(seasonN, inst);
  return;
}

  // IS confirm
_ppActIsConfirmYes(t, e, { root, overlay } = {}) {
  const radarrId = this._isInstance === 'radarr2' ? this._popup._radarr2Id : this._popup._radarrId;
  this._fetchInteractiveSearch(radarrId, this._isInstance);
  return;
}

_ppActIsConfirmNo(t, e, { root, overlay } = {}) {
  this._isState = null;
  this._renderPopupEl();
  return;
}

  // Sonarr IS confirm add series
_ppActSnConfirmYes(t, e, { root, overlay } = {}) {
  this._addSeriesToSonarr(this._snIsInstance);
  return;
}

_ppActSnConfirmNo(t, e, { root, overlay } = {}) {
  this._snIsOpen = false;
  this._snIsState = null;
  this._renderPopupEl();
  return;
}

  // Sonarr season expand/collapse
_ppActSnSeasonToggle(t, e, { root, overlay } = {}) {
  const n = parseInt(t.dataset.season);
  if (this._snExpandedSeasons.has(n)) {
    // Toggle off — sbalit
    this._snExpandedSeasons.delete(n);
  } else {
    // Otevřít — sbalit ostatní sezóny + zavřít IS panel
    this._snExpandedSeasons.clear();
    this._snExpandedSeasons.add(n);
    this._snActiveIs = null;
    this._snIsState = null;
    // Lazy-load episodes if not yet fetched
    if (!this._snEpisodes.has(n)) {
      const epInst = this._asOpen ? this._asInstance : this._snIsInstance;
      const activeSeries = epInst === 'sonarr2' ? this._popup._sonarr2Series : this._popup._sonarrSeries;
      const sid = activeSeries?.id;
      if (sid) this._fetchSonarrEpisodes(sid, n, epInst);
    }
  }
  this._renderPopupEl();
  return;
}

  // Cast panel toggle + paging
_ppActPopupCastToggle(t, e, { root, overlay } = {}) {
  this._popupCastOpen = !this._popupCastOpen;
  this._popupCastPage = 0;
  this._renderPopupEl();
  return;
}

_ppActPopupCastPrev(t, e, { root, overlay } = {}) {
  this._popupCastPage = Math.max(0, (this._popupCastPage || 0) - 1);
  this._renderPopupEl();
  return;
}

_ppActPopupCastNext(t, e, { root, overlay } = {}) {
  this._popupCastPage = (this._popupCastPage || 0) + 1;
  this._renderPopupEl();
  return;
}

  // Popup title monitoring — dual instance expand
_ppActPopupMonitorExpand(t, e, { root, overlay } = {}) {
  this._popupMonExpand = !this._popupMonExpand;
  this._renderPopupEl();
  return;
}

  // Popup title monitoring — toggle instance
_ppActPopupMonitorToggle(t, e, { root, overlay } = {}) {
  if (this._popupMonBusy) return;
  this._markActivated();
  this._popupMonBusy = t.dataset.instance;
  this._renderPopupEl();
  this._togglePopupMonitor(t.dataset.instance);
  return;
}

  // Popup title monitoring — ask to add to a missing instance
_ppActPopupMonitorAddConfirm(t, e, { root, overlay } = {}) {
  this._popupMonAddInst = t.dataset.instance;
  this._renderPopupEl();
  return;
}

_ppActPopupMonitorAddNo(t, e, { root, overlay } = {}) {
  this._popupMonAddInst = null;
  this._renderPopupEl();
  return;
}

_ppActPopupMonitorAddYes(t, e, { root, overlay } = {}) {
  if (this._popupMonAddBusy) return;
  const inst = t.dataset.instance;
  if (inst?.startsWith('radarr')) this._addMovieToRadarr(inst, true);
  else this._addSeriesToSonarr(inst, true);
  return;
}

_ppActPopupMonSearchAs(t, e, { root, overlay } = {}) {
  const inst = this._popupMonAddSearch;
  this._popupMonAddSearch = null;
  this._asOpen = true; this._asInstance = inst; this._asState = null;
  const d = this._popup;
  const isMovT = d._type === 'radarr' || d._type === 'movie';
  if (isMovT) this._triggerRadarrAutoSearch(inst);
  else { this._asState = 'seasons'; this._renderPopupEl(); }
  return;
}

_ppActPopupMonSearchIs(t, e, { root, overlay } = {}) {
  const inst = this._popupMonAddSearch;
  this._popupMonAddSearch = null;
  const d = this._popup;
  const isMovT = d._type === 'radarr' || d._type === 'movie';
  if (isMovT) {
    const radarrId = inst === 'radarr2' ? d._radarr2Id : d._radarrId;
    this._isInstance = inst;
    this._fetchInteractiveSearch(radarrId, inst);
  } else {
    this._snIsInstance = inst;
    this._snIsOpen = true; this._snActiveIs = null; this._snIsState = null; this._snSeasonsPage = 0;
    this._renderPopupEl();
  }
  return;
}

_ppActPopupMonSearchNo(t, e, { root, overlay } = {}) {
  this._popupMonAddSearch = null;
  this._renderPopupEl();
  return;
}

  // Sonarr season monitor toggle
_ppActSnSeasonMonitor(t, e, { root, overlay } = {}) {
  const n = parseInt(t.dataset.season);
  if (this._snMonitorBusy != null) return;
  const monInst = this._asOpen ? this._asInstance : this._snIsInstance;
  const monSeries = monInst === 'sonarr2' ? this._popup?._sonarr2Series : this._popup?._sonarrSeries;
  if (!monSeries?.id) return;
  this._snMonitorBusy = n;
  this._renderPopupEl();
  this._toggleSeasonMonitor(monSeries, n, monInst);
  return;
}

  // Sonarr season IS
_ppActSnSeasonIs(t, e, { root, overlay } = {}) {
  const n = parseInt(t.dataset.season);
  const isMobile = this._isMob;
  if (this._snActiveIs?.type === 'season' && this._snActiveIs?.key === n) {
    // Toggle off
    this._snActiveIs = null;
    this._snIsState = null;
  } else {
    this._snActiveIs = { type: 'season', key: n };
    // Sbalit epizody — IS panel a episode list se navzájem vylučují
    this._snExpandedSeasons.clear();
    const snInst_s = this._asOpen ? this._asInstance : this._snIsInstance;
    const activeSn = snInst_s === 'sonarr2' ? this._popup._sonarr2Series : this._popup._sonarrSeries;
    const sid = activeSn?.id;
    if (sid) {
      if (isMobile) {
        this._renderPopupEl();
        this._fetchSonarrSeasonIS(sid, n, snInst_s);
      } else {
        this._fetchSonarrSeasonIS(sid, n, snInst_s);
      }
    }
  }
  this._renderPopupEl();
  return;
}

  // Sonarr episode IS
_ppActSnEpIs(t, e, { root, overlay } = {}) {
  const epId = parseInt(t.dataset.epid);
  const seasonN = parseInt(t.dataset.season);
  const isMobile = this._isMob;
  if (this._snActiveIs?.type === 'episode' && this._snActiveIs?.key === epId) {
    this._snActiveIs = null;
    this._snIsState = null;
  } else {
    // Find episode label for drill-down
    const eps = this._snEpisodes.get(seasonN) || [];
    const ep = eps.find(e => e.id === epId);
    this._snActiveIs = {
      type: 'episode', key: epId,
      seasonNumber: seasonN,
      epNum: ep?.episodeNumber ?? 0,
      label: ep?.title || '',
    };
    const snInst_ep = this._asOpen ? this._asInstance : this._snIsInstance;
    const activeSnEp = snInst_ep === 'sonarr2' ? this._popup._sonarr2Series : this._popup._sonarrSeries;
    const sid = activeSnEp?.id;
    if (sid) {
      if (isMobile) {
        this._renderPopupEl();
        this._fetchSonarrEpIS(epId, sid, snInst_ep);
      } else {
        this._fetchSonarrEpIS(epId, sid, snInst_ep);
      }
    }
  }
  this._renderPopupEl();
  return;
}

  // Sonarr back (mobile drill-down)
_ppActSnBack(t, e, { root, overlay } = {}) {
  this._snActiveIs = null;
  this._snIsState = null;
  this._renderPopupEl();
  return;
}

  // Remove from library — show confirm
_ppActRemoveConfirm(t, e, { root, overlay } = {}) {
  this._ppCloseAS(); this._ppCloseIS(); this._ppCloseSnIS();
  this._searchExpand = null;
  this._ppMenu = null;
  const pd = this._popup;
  const dualR = pd && pd._radarrId && pd._radarr2Id;
  const dualS = pd && pd._sonarrSeries?.id && pd._sonarr2Series?.id;
  if (dualR || dualS) {
    this._removeConfirm = 'instance';
  } else {
    // single instance — pre-select it. Clearing first matters: a stale value
    // from a previous popup made the "has files" check look at the wrong
    // instance, and Remove from disc silently disappeared.
    this._removeInstance = null;
    if (pd?._radarr2Id && !pd?._radarrId) this._removeInstance = 'radarr2';
    else if (pd?._sonarr2Series?.id && !pd?._sonarrSeries?.id) this._removeInstance = 'sonarr2';
    this._removeConfirm = 'choose';
  }
  this._renderPopupEl();
  return;
}

_ppActRemoveInstance(t, e, { root, overlay } = {}) {
  this._removeInstance = t.dataset.instance;
  this._removeConfirm  = 'choose';
  this._renderPopupEl();
  return;
}

_ppActRemoveChoose(t, e, { root, overlay } = {}) {
  // Deleting files is irreversible, so the choice arms a tick rather than
  // firing straight away.
  // The flat menu names its instance on the row itself
  if (t.dataset.instance) this._removeInstance = t.dataset.instance;
  this._removeArmed = t.dataset.action === 'remove-choose-disc' ? 'disc' : 'lib';
  this._renderPopupEl();
  return;
}

_ppActRemoveArmedNo(t, e, { root, overlay } = {}) {
  this._removeArmed = null;
  this._renderPopupEl();
  return;
}

_ppActRemoveArmedYes(t, e, { root, overlay } = {}) {
  const disc = this._removeArmed === 'disc';
  this._removeArmed = null;
  this._removeFromLibrary(disc, disc);
  return;
}

_ppActRemoveNo(t, e, { root, overlay } = {}) {
  this._removeArmed = null;
  this._removeConfirm  = false;
  this._removeInstance = null;
  this._renderPopupEl();
  return;
}

_ppActRemoveYes(t, e, { root, overlay } = {}) {
  this._markActivated();
  this._removeFromLibrary(t.dataset.files === 'true');
  return;
}

  // Stream media controls
_ppActStreamPlaypause(t, e, { root, overlay } = {}) {
  const entityId   = t.dataset.entity;
  const curState   = this._hass?.states?.[entityId]?.state;
  const supported  = this._hass?.states?.[entityId]?.attributes?.supported_features || 0;
  const canPause   = supported & 1;
  const canPlay    = supported & 16384;
  const plexAction = curState === 'playing' ? 'pause' : 'play';
  let svc;
  if (curState === 'playing') {
    svc = canPause ? 'media_pause' : (canPlay ? 'media_play_pause' : null);
  } else {
    svc = canPlay ? 'media_play' : (canPause ? 'media_play_pause' : null);
  }
  if (svc) {
    try { this._hass.callService('media_player', svc, { entity_id: entityId }); } catch (_) {}
  }
  if (!svc && this._popup?._plexMachineId) {
    this._hass.callApi('POST', 'arr_stack/plex/player', {
      action: plexAction,
      machineIdentifier: this._popup._plexMachineId,
      playerUrl: this._popup._plexPlayerUrl || null,
    }).catch(() => {});
  }
  // Optimistic UI — flip state immediately
  const newState = curState === 'playing' ? 'paused' : 'playing';
  if (this._popup?._streamEntity === entityId) {
    this._popup._streamState = newState;
    if (this._popup._type === POPUP_TYPE.STREAM) this._renderPopupEl();
    else {
      const btn = this.shadowRoot?.getElementById('popup-root')?.querySelector('[data-action="stream-playpause"]');
      if (btn) btn.innerHTML = `<ha-icon icon="mdi:${newState === 'playing' ? 'pause' : 'play'}" style="--mdc-icon-size:32px"></ha-icon>`;
    }
  }
  return;
}

_ppActStreamPrev(t, e, { root, overlay } = {}) {
  const _plexPrev = () => this._popup?._plexMachineId && this._hass.callApi('POST', 'arr_stack/plex/player', {
    action: 'skipPrevious', machineIdentifier: this._popup._plexMachineId, playerUrl: this._popup._plexPlayerUrl || null,
  }).catch(() => {});
  this._hass.callService('media_player', 'media_previous_track', { entity_id: t.dataset.entity })
    .catch(() => _plexPrev());
  setTimeout(() => { this._syncStreamPopup(); this._reRenderSection('streams'); }, 2000);
  return;
}

_ppActStreamNext(t, e, { root, overlay } = {}) {
  const _plexNext = () => this._popup?._plexMachineId && this._hass.callApi('POST', 'arr_stack/plex/player', {
    action: 'skipNext', machineIdentifier: this._popup._plexMachineId, playerUrl: this._popup._plexPlayerUrl || null,
  }).catch(() => {});
  this._hass.callService('media_player', 'media_next_track', { entity_id: t.dataset.entity })
    .catch(() => _plexNext());
  setTimeout(() => { this._syncStreamPopup(); this._reRenderSection('streams'); }, 2000);
  return;
}

_ppActStreamTerminateShow(t, e, { root, overlay } = {}) {
  const glass = this.shadowRoot?.querySelector('.popup-glass');
  if (!glass) return;
  // The confirmation owns the screen from here — drop the dropdown that
  // launched it rather than leaving it floating over the dialog. Removed
  // directly, since a re-render would wipe the modal appended below.
  this._ppMenu = null;
  glass.querySelector('.qa-menu')?.remove();
  // The button's state lives in markup that is not being re-rendered here,
  // so it has to be un-highlighted by hand or Actions stays lit.
  glass.querySelector('.qa-opt-btn')?.classList.remove('active');
  glass.querySelector('.plex-terminate-modal')?.remove();
  const d = this._popup;
  const sessionId = t.dataset.sessionId;
  const userName  = d?._plexUser || '';
  const userThumb = d?._plexUserThumb || '';
  const title     = d?.title || '';
  const isDay     = this._isDaytime && this._config?.styles?.dayNightMode !== false;
  const fg   = isDay ? 'rgba(0,0,0,0.85)'   : 'rgba(255,255,255,0.9)';
  const fgSub= isDay ? 'rgba(0,0,0,0.55)'   : 'rgba(255,255,255,0.55)';
  const bg   = isDay ? 'rgba(235,235,240,0.97)' : 'rgba(16,16,26,0.97)';
  const inputBg = isDay ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)';
  const inputBd = isDay ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)';
  const avatarEl = userThumb
    ? `<img src="${this._escHtml(userThumb)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid rgba(255,255,255,0.15)">`
    : '';
  const modal = document.createElement('div');
  modal.className = 'plex-terminate-modal';
  modal.style.cssText = `position:absolute;inset:0;background:${bg};backdrop-filter:blur(12px);border-radius:inherit;z-index:50;display:flex;flex-direction:column;padding:20px 24px;gap:14px;overflow:auto`;
  modal.innerHTML = `
    <div style="font-size:15px;font-weight:700;color:${fg}">${this._t('terminateTitle')} — ${this._escHtml(title)}</div>
    <div style="display:flex;gap:12px;align-items:flex-start">
      ${avatarEl}
      <div style="font-size:13px;color:${fgSub};line-height:1.5">
        ${this._t('terminatePrompt')}
        ${userName ? `<br>${this._t('terminateUserHint')} <strong style="color:${fg}">${this._escHtml(userName)}</strong>.` : ''}
      </div>
    </div>
    <div>
      <div style="font-size:10px;font-weight:800;color:${fgSub};letter-spacing:0.1em;margin-bottom:6px">${this._t('terminateMsgLabel')}</div>
      <textarea id="stream-terminate-reason" rows="3" placeholder="${this._t('terminateDefault')}"
        style="width:100%;box-sizing:border-box;background:${inputBg};border:1px solid ${inputBd};border-radius:8px;padding:8px 10px;font-size:12px;color:${fg};outline:none;resize:none;font-family:inherit"></textarea>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:auto">
      <button data-action="stream-terminate-cancel" class="is-open-btn" style="justify-content:center;padding:0 12px;min-width:74px">${this._t('terminateCancel')}</button>
      <button data-action="stream-terminate-confirm" data-session-id="${this._escHtml(sessionId || '')}"
        class="is-open-btn remove-disc-btn" style="justify-content:center;padding:0 12px;min-width:74px">${this._t('terminateStop')}</button>
    </div>`;
  this._terminateActive = true;
  glass.appendChild(modal);
  return;
}

_ppActStreamTerminateCancel(t, e, { root, overlay } = {}) {
  this._terminateActive = false;
  this.shadowRoot?.querySelector('.plex-terminate-modal')?.remove();
  return;
}

_ppActStreamTerminateConfirm(t, e, { root, overlay } = {}) {
  this._markActivated();
  const sessionId = t.dataset.sessionId;
  if (!sessionId && !this._popup?._jfSessionId && !this._popup?._embySessionId && !this._popup?._kodiEntityId) return;
  const modal  = this.shadowRoot?.querySelector('.plex-terminate-modal');
  const reason = (modal?.querySelector('#stream-terminate-reason')?.value || '').trim()
                 || this._t('terminateDefault');
  const stopBtn = this.shadowRoot?.querySelector('[data-action="stream-terminate-show"]');
  const stopSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`;
  const checkSvgInline = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  // Remove overlay, fire API (fire-and-forget)
  this._terminateActive = false;
  modal?.remove();
  t.disabled = true;
  // Freeze progress bar immediately — block _syncStreamPopup from overwriting
  if (this._popup) {
    const d = this._popup;
    if (d._streamState === 'playing') {
      const elapsed = (Date.now() - (d._updatedAt || Date.now())) / 1000;
      d._position = Math.min((d._position || 0) + elapsed, d._duration || 0);
      d._updatedAt = Date.now();
      d._streamState = 'paused';
    }
    d._plexTerminated = true;
  }
  if (this._popup?._jfSessionId) {
    this._callApi('POST', 'arr_stack/jellyfin/stop', { session_id: this._popup._jfSessionId, message: reason }).catch(() => {});
  } else if (this._popup?._embySessionId) {
    this._callApi('POST', 'arr_stack/emby/stop', { session_id: this._popup._embySessionId, message: reason }).catch(() => {});
  } else if (this._popup?._kodiEntityId) {
    this._callApi('POST', 'arr_stack/kodi/stop', { entity_id: this._popup._kodiEntityId, message: reason }).catch(() => {});
  } else {
    this._callApi('DELETE', 'arr_stack/plex/session/terminate', { sessionId, reason }).catch(() => {});
  }
  // UX sequence: spinner → 1s → check → close popup
  if (stopBtn) {
    stopBtn.innerHTML = `<ha-icon icon="mdi:loading" style="--mdc-icon-size:14px;animation:btn-spin 0.65s linear infinite"></ha-icon> ${this._t('stopPlayback')}`;
    stopBtn.disabled = true;
    setTimeout(() => {
      if (stopBtn) stopBtn.innerHTML = `${checkSvgInline} ${this._t('stopPlayback')}`;
      setTimeout(() => {
        // Keep popup open — just remove Stop Playback button by clearing session id
        if (this._popup) { this._popup._plexSessionId = null; this._popup._jfSessionId = null; this._popup._embySessionId = null; this._popup._kodiEntityId = null; }
        this._renderPopupEl();
        this._reRenderSection?.('streams');
      }, 600);
    }, 1000);
  } else {
    setTimeout(() => {
      if (this._popup) { this._popup._plexSessionId = null; this._popup._jfSessionId = null; this._popup._embySessionId = null; this._popup._kodiEntityId = null; }
      this._renderPopupEl();
      this._reRenderSection?.('streams');
    }, 1000);
  }
  return;
}

_ppActStreamSeek(t, e, { root, overlay } = {}) {
  const rect    = t.getBoundingClientRect();
  const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
  const pct     = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const dur     = parseFloat(t.dataset.dur);
  if (dur > 0) {
    const newPos = pct * dur;
    this._updateStreamFills(t.dataset.entity, newPos, dur);
    this._doSeek(t.dataset.entity, newPos);
  }
  return;
}

}

export const popupActionsMixin = _PopupActionMethods.prototype;
