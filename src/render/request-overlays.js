// The request overlays on posters, for films and for series. Split out of render/right.js.

class _RequestOverlaysRenderMethods {

_renderRequestOverlay(movieId, tmdbId) {
  const isAdmin  = this._hass?.user?.is_admin;
  // Dual tabs: need Radarr2 configured + either Overseerr knows about it OR Overseerr not used
  const hasDual  = this._radarr2Configured && (this._seerrRadarr2 || this._overseerrConfigured === false);
  const tab1Name = (hasDual && this._seerrRadarr2?.is4k) ? 'HD'       : (this._seerrRadarr?.name  || 'Radarr');
  const tab2Name = (hasDual && this._seerrRadarr2?.is4k) ? '4K'       : (this._seerrRadarr2?.name || 'Radarr 2');

  // ── Helper: build one tab panel ─────────────────────────────────────────
  const buildPanel = (panelId, profiles, defProfileId, tags, rootFolders, selectId, tagId, rfId, hidden = false) => {
    const profileOptions = profiles.length > 0
      ? profiles.map(p =>
          `<option value="${p.id}" ${Number(p.id) === defProfileId ? 'selected' : ''}>${this._escHtml(p.name)}</option>`
        ).join('')
      : `<option value="${defProfileId}">${this._t('defaultProfile')}</option>`;

    const tagItems = [['', '— no tag —'], ...tags.map(t => [t.id, t.label])];
    const tagHtml = (isAdmin && tags.length > 0) ? `
      <span class="req-label">Tag</span>
      ${this._mtFieldSelect(tagId, tagItems, '', 'width:100%')}` : '';

    const rfItems = rootFolders.map(f => [f.path, f.path]);
    const rfHtml = (isAdmin && rootFolders.length > 1) ? `
      <span class="req-label">Root folder</span>
      ${this._mtFieldSelect(rfId, rfItems, rfItems[0]?.[0] ?? '', 'width:100%')}` : '';

    const profLabel = profiles.find(pr => Number(pr.id) === defProfileId)?.name
      || profiles[0]?.name || this._t('defaultProfile');

    return `
      <div class="req-panel${hidden ? ' req-panel--hidden' : ''}" data-panel="${panelId}">
        <span class="req-label">${this._t('downloadQuality')}</span>
        ${this._mtFieldSelectRaw(`id="${selectId}"`, profileOptions, profLabel, 'width:100%')}
        ${tagHtml}
        ${rfHtml}
      </div>`;
  };

  // ── Panel 1 (Radarr) ────────────────────────────────────────────────────
  const panel1 = buildPanel(
    'r1',
    this._radarrProfiles,
    Number(this._seerrRadarr?.profileId ?? 0),
    this._radarrTags,
    this._radarrRootFolders,
    `req-select-${movieId}`,
    `req-tag-${movieId}`,
    `req-rootfolder-${movieId}`
  );

  // ── Panel 2 (Radarr 2, only in dual mode) ───────────────────────────────
  const panel2 = hasDual ? buildPanel(
    'r2',
    this._radarr2Profiles,
    Number(this._seerrRadarr2?.profileId ?? 0),
    this._radarr2Tags,
    this._radarr2RootFolders,
    `req-select2-${movieId}`,
    `req-tag2-${movieId}`,
    `req-rootfolder2-${movieId}`,
    true  // hidden initially
  ) : '';

  // ── Tab bar (only in dual mode) ─────────────────────────────────────────
  const tabBar = hasDual ? `
    <div class="req-tabs">
      <span class="mt-nav-ind"></span>
      <button class="req-tab req-tab--active" data-tab="r1">${tab1Name}</button>
      <button class="req-tab" data-tab="r2">${tab2Name}</button>
    </div>` : '';

  return `
    <div class="req-overlay">
      <div class="req-inner">
        ${tabBar}
        <div class="req-panels-wrap">
          ${panel1}
          ${panel2}
        </div>
        <div class="req-actions">
          <button class="req-cancel" data-req="cancel" title="${this._t('cancel')}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          <button class="req-confirm" data-req="confirm" data-movieid="${movieId}" data-tmdb="${tmdbId}" title="${this._t('confirm')}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg></button>
        </div>
      </div>
    </div>`;
}

_renderTvRequestOverlay() {
  const p = this._tvRequestPending;
  if (!p) return '';

  // Loading stav — čekáme na fetch sezón
  if (p.loading || !p.seasons) {
    return `
      <div class="req-overlay tv-req-overlay">
        <span class="action-spinner" style="width:22px;height:22px;border-width:2.5px"></span>
      </div>`;
  }

  const isAdmin = this._hass?.user?.is_admin;
  const hasDual = this._sonarr2Configured === true && (this._seerrSonarr2 || this._overseerrConfigured === false);
  const sn1Name = this._seerrSonarr?.name  || this._instLabel?.('sonarr')  || 'Sonarr';
  const sn2Name = this._seerrSonarr2?.name || this._instLabel?.('sonarr2') || 'Sonarr 2';

  const buildTvPanel = (panelId, profiles, defProfId, tags, rootFolders, profileSelId, tagSelId, rfSelId, hidden = false) => {
    const profileOpts = profiles.length > 0
      ? profiles.map(pr => `<option value="${pr.id}" ${Number(pr.id) === defProfId ? 'selected' : ''}>${this._escHtml(pr.name)}</option>`).join('')
      : `<option value="${defProfId}">${this._t('defaultProfile')}</option>`;
    const tagItems = [['', '— no tag —'], ...tags.map(t => [t.id, t.label])];
    const tagHtml = (isAdmin && tags.length > 0) ? `<span class="req-label">Tag</span>${this._mtFieldSelect(tagSelId, tagItems, '', 'width:100%')}` : '';
    const rfItems = rootFolders.map(f => [f.path, f.path]);
    const rfHtml  = (isAdmin && rootFolders.length > 1) ? `<span class="req-label">Root folder</span>${this._mtFieldSelect(rfSelId, rfItems, rfItems[0]?.[0] ?? '', 'width:100%')}` : '';
    const profLabel = profiles.find(pr => Number(pr.id) === defProfId)?.name || profiles[0]?.name || this._t('defaultProfile');
    return `<div class="req-panel${hidden ? ' req-panel--hidden' : ''}" data-panel="${panelId}" style="display:${hidden ? 'none' : 'flex'};flex-direction:column;gap:4px"><span class="req-label">${this._t('downloadQuality')}</span>${this._mtFieldSelectRaw(`id="${profileSelId}"`, profileOpts, profLabel, 'width:100%')}${tagHtml}${rfHtml}</div>`;
  };

  const defProfileId = Number(p.profileId ?? 0);
  const panel1 = buildTvPanel('s1', this._sonarrProfiles, defProfileId, this._sonarrTags || [], this._sonarrRootFolders || [], 'tv-req-profile', 'tv-req-tag', 'tv-req-rootfolder');
  const panel2 = hasDual ? buildTvPanel('s2', this._sonarr2Profiles || [], Number(this._seerrSonarr2?.profileId ?? 0), this._sonarrTags || [], this._sonarr2RootFolders || [], 'tv-req-profile2', 'tv-req-tag2', 'tv-req-rootfolder2', true) : '';
  const tabBar  = hasDual ? `<div class="req-tabs"><span class="mt-nav-ind"></span><button class="req-tab req-tab--active" data-tab="s1">${sn1Name}</button><button class="req-tab" data-tab="s2">${sn2Name}</button></div>` : '';

  const seasons = [...p.seasons].sort((a, b) => b - a);
  // The overlay only owns the poster row. With two Sonarr instances the tab bar
  // eats the height a second row of switches would need, so page by one row then.
  const perPage = (this._isMob || !hasDual) ? 8 : 4;
  const pages = [];
  for (let i = 0; i < seasons.length; i += perPage) pages.push(seasons.slice(i, i + perPage));
  const multiPage = pages.length > 1;

  const pagesHtml = pages.map(page => `
    <div class="sv-page">
      ${page.map(sn => `
        <label class="sv-wrap">
          <input type="checkbox" class="sv-input" data-season="${sn}" ${p.selected.has(sn) ? 'checked' : ''}>
          <span class="sv-track"><span class="sv-thumb"></span></span>
          <span class="sv-lbl">S${sn}</span>
        </label>`).join('')}
    </div>`).join('');

  const dotsHtml = multiPage
    ? `<div class="sv-dots">${pages.map((_, i) =>
        `<span class="sv-dot${i === 0 ? ' sv-dot-active' : ''}" data-pg="${i}"></span>`
      ).join('')}</div>`
    : '';

  const poster = p.show.posterPath
    ? `<img src="${p.show.posterPath.startsWith('http') ? p.show.posterPath : `https://image.tmdb.org/t/p/w92${p.show.posterPath}`}" class="tv-req-poster">`
    : `<span class="tv-req-poster tv-req-poster-ph">📺</span>`;

  return `
    <div class="req-overlay tv-req-overlay">
      <div class="tv-req-inner">
        <div class="tv-req-col-poster">
          ${poster}
        </div>
        <div class="tv-req-row2">
          <div class="tv-req-controls">
            ${tabBar}
            ${panel1}${panel2}
            <div class="tv-req-seasons">
              <span class="req-label" style="display:block;margin-bottom:4px;margin-top:6px">${this._t('seasons')}</span>
              <div class="sv-nav-wrap">
                ${multiPage ? `<button class="sv-chev sv-prev" disabled><ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:18px"></ha-icon></button>` : ''}
                <div class="sv-scroll" id="sv-scroll">${pagesHtml}</div>
                ${multiPage ? `<button class="sv-chev sv-next"><ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:18px"></ha-icon></button>` : ''}
              </div>
              ${dotsHtml}
            </div>
            <div class="tv-req-actions-col">
              <div class="req-actions">
                <button class="req-cancel tv-req-cancel" title="${this._t('cancel')}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                <button class="tv-req-confirm req-confirm" data-mediaid="${p.mediaId}" title="${this._t('confirm')}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

_renderTvOverlayCompact(p) {
  // Loading stav
  if (!p || p.loading || !p.seasons) {
    return `<div style="display:flex;align-items:center;justify-content:center;padding:20px">
      <span class="action-spinner" style="width:22px;height:22px;border-width:2.5px"></span>
    </div>`;
  }

  const defProfileId = Number(p.profileId ?? 0);
  const profileOptions = this._sonarrProfiles.length > 0
    ? this._sonarrProfiles.map(pr =>
        `<option value="${pr.id}" ${Number(pr.id) === defProfileId ? 'selected' : ''}>${this._escHtml(pr.name)}</option>`
      ).join('')
    : `<option value="${defProfileId}">${this._t('defaultProfile')}</option>`;

  const seasons = [...p.seasons].sort((a, b) => b - a);
  const pages = [];
  for (let i = 0; i < seasons.length; i += 8) pages.push(seasons.slice(i, i + 8));
  const multiPage = pages.length > 1;

  const pagesHtml = pages.map(page => `
    <div class="sv-page">
      ${page.map(sn => `
        <label class="sv-wrap">
          <input type="checkbox" class="sv-input" data-season="${sn}" ${p.selected.has(sn) ? 'checked' : ''}>
          <span class="sv-track"><span class="sv-thumb"></span></span>
          <span class="sv-lbl">S${sn}</span>
        </label>`).join('')}
    </div>`).join('');

  const dotsHtml = multiPage
    ? `<div class="sv-dots">${pages.map((_, i) =>
        `<span class="sv-dot${i === 0 ? ' sv-dot-active' : ''}" data-pg="${i}"></span>`
      ).join('')}</div>`
    : '';

  const poster = p.show.posterPath
    ? `<img src="${p.show.posterPath.startsWith('http') ? p.show.posterPath : `https://image.tmdb.org/t/p/w92${p.show.posterPath}`}" class="tv-req-poster">`
    : `<span class="tv-req-poster tv-req-poster-ph">📺</span>`;

  return `
    <div class="tv-req-inner">
      <div class="tv-req-col-poster">
        ${poster}
        <div class="tv-req-title tv-req-mob-title">${this._escHtml(p.show.name || p.show.originalName || '')}</div>
      </div>
      <div class="tv-req-row2">
        <div class="tv-req-controls">
          <div class="tv-req-title tv-req-desk-title">${this._escHtml(p.show.name || p.show.originalName || '')}</div>
          <span class="req-label">${this._t('downloadQuality')}</span>
          <select class="req-select" id="tv-req-profile-abs">${profileOptions}</select>
          ${(this._hass?.user?.is_admin && this._sonarrTags.length > 0) ? `
          <span class="req-label">Tag</span>
          <select class="req-select" id="tv-req-tag-abs">
            <option value="">— no tag —</option>
            ${this._sonarrTags.map(t => `<option value="${t.id}">${this._escHtml(t.label)}</option>`).join('')}
          </select>` : ''}
          ${(this._hass?.user?.is_admin && this._sonarrRootFolders.length > 1) ? `
          <span class="req-label">Root folder</span>
          <select class="req-select" id="tv-req-rootfolder-abs">
            ${this._sonarrRootFolders.map(f => `<option value="${this._escHtml(f.path)}">${this._escHtml(f.path)}</option>`).join('')}
          </select>` : ''}
          <div class="tv-req-seasons">
            <span class="req-label" style="display:block;margin-bottom:4px;margin-top:6px">${this._t('seasons')}</span>
            <div class="sv-nav-wrap">
              ${multiPage ? `<button class="sv-chev sv-prev-abs" disabled><ha-icon icon="mdi:chevron-left" style="--mdc-icon-size:18px"></ha-icon></button>` : ''}
              <div class="sv-scroll" id="sv-scroll-abs">${pagesHtml}</div>
              ${multiPage ? `<button class="sv-chev sv-next-abs"><ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:18px"></ha-icon></button>` : ''}
            </div>
            ${dotsHtml}
          </div>
          <div class="tv-req-actions-col">
            <div class="req-actions">
              <button class="req-cancel to-tv-cancel-abs" title="${this._t('cancel')}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              <button class="to-tv-confirm-abs req-confirm" data-mediaid="${p.mediaId}" title="${this._t('confirm')}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg></button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

}

export const requestOverlaysRenderMixin = _RequestOverlaysRenderMethods.prototype;
