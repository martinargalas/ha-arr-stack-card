import { isMobile } from '../shared/ui.js';
import { MT_BTN, _ICO_CHECK } from './maintainerr.js';

// Maintainerr, the Rules tab and the rule editor. Split out of render/maintainerr.js.

class _MaintainerrRulesRenderMethods {

  // Parse flat rules array with ruleJson strings → grouped sections
  _mtParseRuleSections(flatRules) {
    if (!Array.isArray(flatRules) || !flatRules.length) return [];
    const sectionMap = new Map();
    for (const r of flatRules) {
      let parsed;
      try { parsed = typeof r.ruleJson === 'string' ? JSON.parse(r.ruleJson) : r.ruleJson || {}; } catch (_) { parsed = {}; }
      const secIdx = parsed.section ?? r.section ?? 0;
      if (!sectionMap.has(secIdx)) sectionMap.set(secIdx, { operator: 0, rules: [] });
      const sec = sectionMap.get(secIdx);
      const cv = parsed.customVal;
      const cvObj = cv && typeof cv === 'object';
      sec.rules.push({
        firstVal: parsed.firstVal || ['', ''],
        lastVal: parsed.lastVal || null,
        action: parsed.action ?? 0,
        customVal: cvObj ? (cv.value ?? '') : (cv ?? ''),
        customValType: cvObj ? (cv.ruleTypeId ?? 2) : (cv != null && cv !== '' ? 2 : null),
        operator: parsed.operator != null ? (typeof parsed.operator === 'string' ? parseInt(parsed.operator) : parsed.operator) : 0,
      });
    }
    const sections = [...sectionMap.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s);
    // First rule in each section after first gets the section operator from the first rule's operator
    for (const sec of sections) {
      if (sec.rules.length > 1) sec.operator = sec.rules[1]?.operator ?? 0;
    }
    return sections;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Rules tab — card layout (like Maintainerr UI)
  // ──────────────────────────────────────────────────────────────────────────

  _mtRulesTabHtml() {
    const m = this._maintainerrModal;
    if (!m) return '';
    const rules   = this._maintainerr?.rules || [];
    const search  = (m.search || '').toLowerCase();
    const filterLib    = m.filterLib || 'all';
    const filterStatus = m.filterStatus || 'all';

    let filtered = rules;
    if (search) filtered = filtered.filter(r => (r.name || '').toLowerCase().includes(search));
    if (filterLib !== 'all') filtered = filtered.filter(r => String(r.libraryId) === filterLib);
    if (filterStatus === 'active')   filtered = filtered.filter(r => r.isActive);
    if (filterStatus === 'inactive') filtered = filtered.filter(r => !r.isActive);

    // Measured to fit the space below the toolbar, so the list pages instead of
    // scrolling. 12 is only the first-paint guess.
    const PAGE = m.rulesPerPage || 12;
    const total = filtered.length;
    const pages = Math.ceil(total / PAGE) || 1;
    m.rulesPages = pages;
    const page = Math.min(m.page || 0, pages - 1);
    const slice = filtered.slice(page * PAGE, (page + 1) * PAGE);

    // Build library filter options from all rules
    const libs = new Map();
    rules.forEach(r => { if (r.libraryId != null) libs.set(String(r.libraryId), this._mtLibName(r.libraryId)); });

    const libItems = [['all', this._t('mtAllLibs')], ...libs];
    const statusItems = [
      ['all', this._t('mtAllStatus')],
      ['active', this._t('mtActive')],
      ['inactive', this._t('mtInactive')],
    ];

    const view = m.view || 'cards';
    const _segIco = this._mtSegIcons;
    const viewSeg = this._mtSegmented('data-mt-view-seg', [
      { v: 'cards', label: this._t('mtViewCards'), icon: _segIco.cards },
      { v: 'table', label: this._t('mtViewTable'), icon: _segIco.table },
    ], view, { icons: true, animatePrev: !!m._animView });

    const toolbar = `<div style="margin-bottom:${this._mtToolbarGap}px">${this._mtToolbar('mt-search', m.search, [
      { id: 'mt-filter-lib', items: libItems, value: filterLib, neutral: 'all' },
      { id: 'mt-filter-status', items: statusItems, value: filterStatus, neutral: 'all' },
    ])}</div>`;

    // Card grid layout
    const _dayR = this._isDay;
    const _metaLbl = `font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:${_dayR ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)'};margin-bottom:2px`;
    const cards = view === 'table' ? '' : slice.map(r => {
      const statusLabel = r.isActive ? this._t('mtActive') : this._t('mtInactive');
      // Light green on a white card is unreadable — day mode needs the darker one
      const statusColor = r.isActive
        ? (_dayR ? 'rgba(5,150,105,0.95)' : 'rgba(52,211,153,0.85)')
        : (_dayR ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.4)');
      const libName = this._mtLibName(r.libraryId);
      const ruleCount = (r.rules || []).length;
      const busy = m.runningId === r.id;

      const PLAY = `<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="display:block"><polygon points="5,3 19,12 5,21"/></svg>`;
      const TRASH = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

      const CHECK = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg>`;
      const CROSS = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

      // Confirm in place rather than through a native confirm() — same pattern
      // as excluding an item in the media tab.
      const confirming = m.confirmDelete === r.id;
      const confirmOverlay = confirming
        ? `<div style="position:absolute;inset:0;z-index:5;background:${this._isDay ? 'rgba(255,255,255,0.90)' : 'rgba(0,0,0,0.78)'};border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">
            <span style="font-size:12px;font-weight:600;color:var(--is-text);text-align:center;padding:0 12px">${this._t('mtConfirmDelete')}</span>
            <div style="display:flex;gap:10px">
              ${this._mtRoundBtn(`data-mt-del-confirm="${r.id}"`, CHECK, this._t('mtYes'), { tone: 'red' })}
              ${this._mtRoundBtn('data-mt-del-cancel', CROSS, this._t('mtNo'), { tone: 'blue' })}
            </div>
          </div>`
        : '';

      // Takes the slack between title and meta row, so it sits centred there
      // whatever the card's height
      const desc = `<div style="flex:1;min-height:0;display:flex;align-items:center;overflow:hidden">
        ${r.description ? `<div style="font-size:11px;color:var(--is-text-muted);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${this._escHtml(r.description)}</div>` : ''}
      </div>`;

      // The whole card opens the editor — same as a collection card — so Edit
      // needs no button of its own. Run and Delete sit in a wrapper whose
      // height is the title's, which centres them on it exactly.
      return `<div data-mt-edit="${r.id}" style="position:relative;background:var(--is-btn-bg);border:1px solid var(--is-card-bdr);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:6px;min-height:160px;cursor:pointer">
        <div style="position:relative">
          <div style="font-size:13px;font-weight:700;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:70px">${this._escHtml(r.name || '—')}</div>
          <div style="position:absolute;top:50%;right:0;transform:translateY(-50%);z-index:2;display:flex;gap:6px">
            ${this._mtRoundBtn(`data-mt-run="${r.id}"`, PLAY, this._t('mtRunRule'), { tone: 'green', busy })}
            ${this._mtRoundBtn(`data-mt-delete="${r.id}"`, TRASH, this._t('mtDelete'), { tone: 'red' })}
          </div>
        </div>
        ${desc}
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:4px 12px;font-size:11px">
          <div><div style="${_metaLbl}">STATUS</div><div style="color:${statusColor};font-weight:600">${statusLabel}</div></div>
          <div style="min-width:0"><div style="${_metaLbl}">LIBRARY</div><div style="color:var(--is-text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(libName)}</div></div>
          <div style="text-align:right"><div style="${_metaLbl}">RULES</div><div style="color:var(--is-text);font-weight:600">${ruleCount}</div></div>
        </div>
        ${confirmOverlay}
      </div>`;
    }).join('');

    const empty = total === 0 ? `<div class="u-empty-dim" style="padding:20px 0">${this._t('mtNoRules')}</div>` : '';
    const body = view === 'table'
      ? this._mtRulesTableHtml(slice)
      : (cards ? `<div id="mt-rules-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;align-content:start">${cards}</div>` : '');
    // Footer mirrors the calendar's: paging centred, view switch pinned left,
    // and the row stays even without paging so the switch keeps its corner.
    const paging = this._uiPager('mt-page', page, pages, true);
    // The switch is pinned to the corner on desktop; on a phone there is no room
    // beside the chevrons, so the two stack instead of overlapping.
    // Paging stays centred on the full width; the switch is taken out of flow
    // in its corner so it cannot pull it off centre. On a phone the switch and
    // the chevrons shrink (see #mt-rules-foot in the stylesheet) so the two
    // still clear each other.
    const footer = `<div id="mt-rules-foot" style="position:relative;display:flex;align-items:center;justify-content:center;min-height:44px;flex-shrink:0">
      ${paging}
      <div style="position:absolute;left:0;top:50%;transform:translateY(-50%)">${viewSeg}</div>
    </div>`;

    return `<div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden">
      <div style="flex-shrink:0">${toolbar}</div>
      <div id="mt-rules-wrap" style="flex:1;min-height:0;overflow-y:auto">${body || empty}</div>
      ${footer}
    </div>`;
  }

  _mtRulesTableHtml(rules) {
    if (!rules.length) return '';
    const m = this._maintainerrModal;
    const isMob = this._isMob;

    const rows = rules.map(r => {
      const statusLabel = r.isActive ? this._t('mtActive') : this._t('mtInactive');
      const statusColor = r.isActive ? 'rgba(52,211,153,0.85)' : 'rgba(255,255,255,0.4)';
      const libName = this._mtLibName(r.libraryId);
      const ruleCount = (r.rules || []).length;
      const busy = m.runningId === r.id;
      const PLAY_S = `<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="display:block"><polygon points="5,3 19,12 5,21"/></svg>`;
      const TRASH_S = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      // Row itself opens the editor, so no Edit button here either
      const actions = `<div style="display:flex;gap:5px;justify-content:flex-end">
        ${this._mtRoundBtn(`data-mt-run="${r.id}"`, PLAY_S, this._t('mtRunRule'), { size: 24, tone: 'green', busy })}
        ${this._mtRoundBtn(`data-mt-delete-now="${r.id}"`, TRASH_S, this._t('mtDelete'), { size: 24, tone: 'red' })}
      </div>`;

      if (isMob) {
        return `<div data-mt-edit="${r.id}" style="display:flex;align-items:center;gap:8px;padding:8px 4px;border-bottom:1px solid var(--is-divider,rgba(255,255,255,0.07));cursor:pointer">
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(r.name || '—')}</div>
            <div style="font-size:10px;color:var(--is-text-muted);margin-top:2px">${this._escHtml(libName)} · ${ruleCount} · <span style="color:${statusColor}">${statusLabel}</span></div>
          </div>
          ${actions}
        </div>`;
      }

      return `<tr data-mt-edit="${r.id}" style="cursor:pointer">
        <td><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(r.name || '—')}</div></td>
        <td>${this._escHtml(libName)}</td>
        <td style="text-align:center">${ruleCount}</td>
        <td style="color:${statusColor}">${statusLabel}</td>
        <td style="text-align:right">${actions}</td>
      </tr>`;
    }).join('');

    if (isMob) return `<div>${rows}</div>`;

    const _th = 'user-select:none;white-space:nowrap';
    return `<table class="tl-users-table lib-table" style="width:100%;table-layout:fixed">
      <thead><tr>
        <th style="${_th};width:auto">${this._t('mtRuleName')}</th>
        <th style="${_th};width:150px">${this._t('mtLibrary')}</th>
        <th style="${_th};width:70px;text-align:center">${this._t('mtRules')}</th>
        <th style="${_th};width:100px">${this._t('mtStatus')}</th>
        <th style="${_th};width:80px;text-align:right"></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Rule editor (inline, replaces body content)
  // ──────────────────────────────────────────────────────────────────────────

  _mtRuleEditorHtml() {
    const m = this._maintainerrModal;
    if (!m) return '';
    const ed   = m.editor || {};
    const isNew = !ed.id;
    const consts = this._maintainerrConstants || {};
    const libs   = this._maintainerrLibraries || [];
    const arrSrv = this._maintainerrArrServers || {};

    // Class rather than inline style: the capsule language needs different
    // alphas per mode, which an inline string cannot express.
    const inpSty = 'width:100%';

    const libItems = [['', '—'], ...libs.map(l => [l.id, l.title || l.name || '—'])];

    const mediaTypes = ['movie', 'show', 'season', 'episode'];
    const mtItems = mediaTypes.map(t => [t, t.charAt(0).toUpperCase() + t.slice(1)]);

    const arrActionMap = ed.mediaType === 'movie'
      ? { 0: 'Unmonitor + Delete', 1: 'Delete', 2: 'Unmonitor' }
      : { 0: 'Unmonitor + Delete season', 1: 'Delete season', 2: 'Unmonitor season', 3: 'Delete show', 4: 'Unmonitor show', 5: 'Unmonitor + Delete show' };
    const arrActionItems = Object.entries(arrActionMap);

    const radarrSrvs = arrSrv.radarr || [];
    const sonarrSrvs = arrSrv.sonarr || [];
    const srvList = ed.mediaType === 'movie' ? radarrSrvs : sonarrSrvs;
    const arrSrvItems = [['', '—'], ...srvList.map(s => [s.id, s.name || s.serverName || `Server ${s.id}`])];

    const sections = ed.sections || [];
    const sectionsHtml = sections.map((sec, si) => this._mtEditorSectionHtml(sec, si, consts, ed)).join('');

    // null means every section is collapsed — only an unset value defaults to
    // General, so `||` would reopen the section the user just closed.
    const openSec = m.editorSection === undefined ? 'general' : m.editorSection;

    const generalBody = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtRuleName')}</label>
          <input id="mt-ed-name" type="text" value="${this._escHtml(ed.name || '')}" class="mt-field" style="${inpSty}">
        </div>
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtDescription')}</label>
          <input id="mt-ed-desc" type="text" value="${this._escHtml(ed.description || '')}" class="mt-field" style="${inpSty}">
        </div>
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtLibrary')}</label>
          ${this._mtFieldSelect('mt-ed-lib', libItems, ed.libraryId ?? '', inpSty)}
        </div>
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtMediaType')}</label>
          ${this._mtFieldSelect('mt-ed-media', mtItems, ed.mediaType ?? '', inpSty)}
        </div>
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtArrServer')}</label>
          ${this._mtFieldSelect('mt-ed-arr-srv', arrSrvItems, ed.arrServerId ?? '', inpSty)}
        </div>
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtArrAction')}</label>
          ${this._mtFieldSelect('mt-ed-arr-action', arrActionItems, ed.arrAction ?? '0', inpSty)}
        </div>
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtDeleteAfterDays')}</label>
          <input id="mt-ed-del-days" type="number" min="0" value="${ed.deleteAfterDays ?? 30}" class="mt-field" style="${inpSty}">
        </div>
      </div>`;

    const rulesBody = ed.useRules !== false
      ? (sectionsHtml || `<div class="u-empty-dim">${this._t('mtNoConditions')}</div>`)
      : `<div class="u-empty-dim">${this._t('mtUseRulesOff')}</div>`;
    const addSecBtn = ed.useRules !== false
      ? `<button data-mt-add-section style="${MT_BTN};height:28px;font-size:11px">+ ${this._t('mtAddSection')}</button>`
      : '';

    // The native box is kept — it holds the state and every reader still finds
    // it by id — but drawn by us: a capsule that fills blue when on, like the
    // AND/OR chips. `:has()` does the styling, so no wiring is needed.
    const _cbx = (id, checked, label) => `<label class="mt-chk">
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
      <span class="mt-chk-box">${_ICO_CHECK}</span>
      <span class="mt-chk-lbl">${label}</span>
    </label>`;

    // Maintainerr accepts "<field>.<order>"; blank leaves Plex ordering alone
    const colSortItems = [
      ['', this._t('mtSortDisabled')],
      ['title.asc', 'Title (A-Z)'],
      ['title.desc', 'Title (Z-A)'],
      ['airDate.desc', 'Release date (newest)'],
      ['airDate.asc', 'Release date (oldest)'],
      ['rating.desc', 'Rating (highest)'],
      ['rating.asc', 'Rating (lowest)'],
      ['watchCount.desc', 'Most watched'],
      ['watchCount.asc', 'Least watched'],
      ['deleteSoonest.asc', 'Delete soonest'],
      ['deleteSoonest.desc', 'Delete latest'],
    ];

    const optionsBody = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${_cbx('mt-ed-active', ed.isActive, this._t('mtActive'))}
        ${_cbx('mt-ed-use-rules', ed.useRules !== false, this._t('mtUseRules'))}
        ${_cbx('mt-ed-vis-recommended', ed.visibleOnRecommended, this._t('mtVisRecommended'))}
        ${_cbx('mt-ed-vis-home', ed.visibleOnHome, this._t('mtVisHome'))}
        ${_cbx('mt-ed-force-seerr', ed.forceSeerr, this._t('mtForceSeerr'))}
        ${_cbx('mt-ed-list-exclusions', ed.listExclusions, this._t('mtListExclusions'))}
        ${_cbx('mt-ed-manual-col', ed.manualCollection, this._t('mtCustomCollection'))}
        ${_cbx('mt-ed-tag-arr', ed.tagInArr, this._t('mtTagInArr'))}
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtCustomCollectionName')}</label>
          <input id="mt-ed-manual-col-name" type="text" value="${this._escHtml(ed.manualCollectionName || '')}" placeholder="—" class="mt-field" style="${inpSty}">
        </div>
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtCollectionSort')}</label>
          ${this._mtFieldSelect('mt-ed-col-sort', colSortItems, ed.mediaServerSort || '', inpSty)}
        </div>
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtKeepLogs')}</label>
          <input id="mt-ed-keep-logs" type="number" min="0" value="${ed.keepLogsForMonths ?? 6}" class="mt-field" style="${inpSty}">
        </div>
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtSortTitle')}</label>
          <input id="mt-ed-sort-title" type="text" value="${this._escHtml(ed.sortTitle || '')}" placeholder="e.g. 001 My Coll" class="mt-field" style="${inpSty}">
        </div>
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtTautulliOverride')}</label>
          <input id="mt-ed-tautulli-pct" type="number" min="0" max="100" value="${ed.tautulliWatchedPercentOverride ?? ''}" placeholder="—" class="mt-field" style="${inpSty}">
        </div>
        <div>
          <label style="font-size:10px;color:var(--is-text-muted);display:block;margin-bottom:3px">${this._t('mtCronOverride')}</label>
          <input id="mt-ed-cron" type="text" value="${this._escHtml(ed.ruleHandlerCronSchedule || '')}" placeholder="—" class="mt-field" style="${inpSty}">
        </div>
      </div>`;

    const secs = [
      ['general', this._t('mtSecGeneral'), generalBody],
      ['rules', this._t('mtSecRules'), rulesBody],
      ['options', this._t('mtSecOptions'), optionsBody],
    ];

    // Add section rides along in its own header rather than owning a row, and
    // only shows while that section is open — it acts on its body.
    const trailing = {
      rules: openSec === 'rules' ? addSecBtn : '',
    };

    return `<div style="display:flex;flex-direction:column;gap:10px">
      ${secs.map(([key, label, bodyHtml]) =>
        this._mtEdSectionShell(key, label, bodyHtml, openSec === key, trailing[key] || '')
      ).join('')}
    </div>`;
  }

  // Accordion shell — deliberately transparent. The section bodies already
  // bring their own cards, so a wrapper panel here would be a fourth nested
  // background. Only the chevron gets a surface, as the thing you click, and
  // it turns accent-blue to mark the one open section.
  _mtEdSectionShell(key, label, bodyHtml, open, trailing = '') {
    const chev = open
      ? `<polyline points="18 15 12 9 6 15"/>`
      : `<polyline points="6 9 12 15 18 9"/>`;
    // Neutral, not accent — blue now means "there is something to save" in the
    // header, and two blues in one bar would compete.
    const _day = this._isDay;
    const chipSty = open
      ? (_day
        ? 'background:rgba(0,0,0,0.10);border:1px solid rgba(0,0,0,0.22);color:#000'
        : 'background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.30);color:#fff')
      : 'background:var(--is-btn-bg);border:1px solid var(--is-divider);color:var(--is-text-muted)';
    return `<div>
      <div data-mt-ed-sec="${key}" style="display:flex;align-items:center;gap:10px;padding:4px 2px;cursor:pointer;user-select:none">
        <span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;flex-shrink:0;transition:background 0.15s;${chipSty}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${chev}</svg>
        </span>
        <span style="font-size:13px;font-weight:700;color:${open ? 'var(--is-text)' : 'var(--is-text-muted)'}">${label}</span>
        <div style="flex:1"></div>
        ${trailing}
      </div>
      ${open ? `<div style="padding-top:8px;padding-left:${isMobile() ? 0 : 44}px">${bodyHtml}</div>` : ''}
    </div>`;
  }

  // Only the configured media server's app is offered — Maintainerr ships constants
  // for Plex, Jellyfin and Emby regardless of which one is actually set up.
  _mtVisibleApps(consts) {
    const apps = Array.isArray(consts.applications) ? consts.applications : [];
    const MEDIA_SERVER_IDS = [0, 6, 7]; // Plex, Jellyfin, Emby
    const s = this._maintainerr?.settings || {};
    const type = String(s.mediaServerType ?? s.media_server_type ?? '').toLowerCase();
    let keepId = 0;
    if (type.includes('jellyfin') || s.jellyfin_url || s.jellyfin_api_key) keepId = 6;
    else if (type.includes('emby')) keepId = 7;
    return apps.filter(a => !MEDIA_SERVER_IDS.includes(a.id) || a.id === keepId);
  }

  _mtEditorSectionHtml(sec, si, consts, ed) {
    const rules = sec.rules || [];
    const operator = sec.operator ?? 0;
    const opLabel  = operator === 1 ? 'OR' : 'AND';

    const ACTION_LABELS = {
      0:'Bigger', 1:'Smaller', 2:'Equals', 3:'Not equals', 4:'Contains', 5:'Before', 6:'After',
      7:'In last (days)', 8:'In next (days)', 9:'Contains partial', 10:'Not contains',
      11:'Not contains partial', 12:'Contains every', 13:'Does not contain every',
      14:'Is empty', 15:'Is not empty', 16:'In last (hours)', 17:'In next (hours)',
      18:'Between', 19:'Not between',
    };

    const apps = this._mtVisibleApps(consts);
    const _sel = 'width:100%';
    const _lbl = 'font-size:10px;font-weight:600;color:var(--is-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.04em';

    // Build combined "App - Property" options for First Value / Second Value
    const _buildCombinedOpts = (selApp, selProp, placeholder = 'Select…') => {
      let opts = `<option value="">${placeholder}</option>`;
      for (const a of apps) {
        const props = a.props || [];
        if (!props.length) continue;
        opts += `<optgroup label="${this._escHtml(a.name)}">`;
        for (const p of props) {
          const val = `${a.id}-${p.id}`;
          const sel = (selApp !== '' && String(a.id) === String(selApp) && String(p.id) === String(selProp)) ? ' selected' : '';
          opts += `<option value="${val}"${sel}>${this._escHtml(a.name)} - ${this._escHtml(p.humanName || p.name)}</option>`;
        }
        opts += `</optgroup>`;
      }
      return opts;
    };

    // Our own trigger shows the label, so every select needs the text of the
    // option that is selected — the optgroup markup can't be reused for it.
    const _propLabel = (selApp, selProp) => {
      if (selApp === '' || selApp == null) return '';
      const a = apps.find(x => String(x.id) === String(selApp));
      const p = (a?.props || []).find(x => String(x.id) === String(selProp));
      return a && p ? `${a.name} - ${p.humanName || p.name}` : '';
    };

    // Second Value may instead be a custom type — ruleTypeId per Maintainerr
    const CUSTOM_TYPES = [[0, 'Number'], [1, 'Date'], [2, 'Text'], [3, 'Boolean']];
    const _buildSecondOpts = (selApp, selProp, cvType) => {
      const custom = CUSTOM_TYPES.map(([id, label]) =>
        `<option value="custom-${id}"${cvType === id ? ' selected' : ''}>${label}</option>`
      ).join('');
      const appOpts = _buildCombinedOpts(
        cvType != null ? '' : selApp,
        cvType != null ? '' : selProp,
        'Select Second Value…',
      );
      // Placeholder stays first, then Custom values, then one group per app
      const head = appOpts.slice(0, appOpts.indexOf('</option>') + 9);
      const rest = appOpts.slice(head.length);
      return `${head}<optgroup label="Custom values">${custom}</optgroup>${rest}`;
    };

    const rulesHtml = rules.map((r, ri) => {
      const firstApp  = r.firstVal?.[0] ?? '';
      const firstProp = r.firstVal?.[1] ?? '';
      const action    = r.action ?? '';
      const lastVal   = r.lastVal;
      const customVal = r.customVal;
      const ruleOp    = r.operator ?? 0;

      // Action dropdown — filter by selected property's possibilities
      const selectedApp = apps.find(a => a.id == firstApp);
      const selectedProp = (selectedApp?.props || []).find(p => p.id == firstProp);
      const possibilities = selectedProp?.type?.possibilities || Object.keys(ACTION_LABELS).map(Number);
      const actionOpts = `<option value="">Select Action…</option>` + possibilities.map(aId =>
        `<option value="${aId}"${action !== '' && aId == action ? ' selected' : ''}>${ACTION_LABELS[aId] || `Action ${aId}`}</option>`
      ).join('');

      // Second Value dropdown — either an app property (lastVal) or a custom type
      const hasLastVal = Array.isArray(lastVal) && lastVal.length === 2 && (lastVal[0] !== '' || lastVal[1] !== '');
      const lastApp  = hasLastVal ? lastVal[0] : '';
      const lastProp = hasLastVal ? lastVal[1] : '';
      const cvType   = hasLastVal ? null : (r.customValType ?? null);

      // Custom Value display
      const customDisplay = typeof customVal === 'object' && customVal !== null ? (customVal.value ?? '') : (customVal ?? '');
      const cvStr = String(customDisplay);
      let customField;
      if (cvType === 3) {
        // Must be "1"/"0": the comparator coerces a BOOL customVal with
        // `+value`, so "true"/"false" become NaN and the rule never matches.
        const isTrue = cvStr === '' ? true : (cvStr === 'true' || cvStr === '1');
        customField = this._mtFieldSelectRaw(
          `data-mt-val="${si}-${ri}"`,
          `<option value="1"${isTrue ? ' selected' : ''}>True</option><option value="0"${!isTrue ? ' selected' : ''}>False</option>`,
          isTrue ? 'True' : 'False',
          _sel,
        );
      } else if (cvType === 0) {
        customField = `<input data-mt-val="${si}-${ri}" type="number" value="${this._escHtml(cvStr)}" placeholder="0" class="mt-field" style="${_sel}">`;
      } else if (cvType === 1) {
        customField = `<input data-mt-val="${si}-${ri}" type="date" value="${this._escHtml(cvStr)}" class="mt-field" style="${_sel}">`;
      } else {
        customField = `<input data-mt-val="${si}-${ri}" type="text" value="${this._escHtml(cvStr)}" placeholder="—" class="mt-field" style="${_sel}"${cvType == null ? ' disabled' : ''}>`;
      }

      // Operator between rules
      const opHtml = ri > 0
        ? `<div style="display:flex;align-items:center;gap:8px;padding:6px 0">
            <span style="font-size:10px;color:var(--is-text-muted)">Operator</span>
            <span style="font-size:11px;font-weight:700;color:var(--is-text);background:rgba(255,255,255,0.07);border:1px solid var(--is-card-bdr);border-radius:999px;padding:3px 12px;cursor:pointer" data-mt-toggle-op="${si}-${ri}">${ruleOp === 1 ? 'OR' : 'AND'}</span>
          </div>`
        : '';

      return `${opHtml}
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--is-card-bdr);border-radius:12px;padding:12px 14px;margin-bottom:6px" data-mt-rule-idx="${si}-${ri}">
        <div style="display:flex;align-items:center;margin-bottom:10px">
          <span style="font-size:12px;font-weight:700;color:rgba(245,158,11,0.95)">Rule #${ri + 1}</span>
          <div style="flex:1"></div>
          <button data-mt-del-rule="${si}-${ri}" style="${this._mtBtnA('red')};height:24px;font-size:11px">${this._t('mtDelete')}</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <div style="${_lbl}">First Value</div>
            ${this._mtFieldSelectRaw(`data-mt-firstval="${si}-${ri}"`, _buildCombinedOpts(firstApp, firstProp, 'Select First Value…'), _propLabel(firstApp, firstProp) || 'Select First Value…', _sel)}
          </div>
          <div>
            <div style="${_lbl}">Action</div>
            ${this._mtFieldSelectRaw(`data-mt-action="${si}-${ri}"`, actionOpts, action !== '' ? (ACTION_LABELS[action] || `Action ${action}`) : 'Select Action…', _sel)}
          </div>
          <div>
            <div style="${_lbl}">Second Value</div>
            ${this._mtFieldSelectRaw(`data-mt-secondval="${si}-${ri}"`, _buildSecondOpts(lastApp, lastProp, cvType), cvType != null ? (CUSTOM_TYPES.find(([id]) => id === cvType)?.[1] || 'Select Second Value…') : (_propLabel(lastApp, lastProp) || 'Select Second Value…'), _sel)}
          </div>
          <div${cvType == null ? ' style="display:none"' : ''}>
            <div style="${_lbl}">Custom Value</div>
            ${customField}
          </div>
        </div>
      </div>`;
    }).join('');

    return `<div style="background:var(--is-btn-bg);border:1px solid var(--is-card-bdr);border-radius:16px;padding:14px 16px;margin-bottom:10px" data-mt-section="${si}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:13px;font-weight:700;color:var(--is-text)">${this._t('mtSection')} #${si + 1}</span>
        ${si > 0 ? `<span style="font-size:10px;font-weight:700;color:rgba(0,122,255,0.9);background:rgba(0,122,255,0.12);border:1px solid rgba(0,122,255,0.3);border-radius:999px;padding:2px 10px;cursor:pointer" data-mt-toggle-sec-op="${si}">${opLabel}</span>` : ''}
        <div style="flex:1"></div>
        <button data-mt-del-section="${si}" style="${this._mtBtnA('red')};width:24px;height:24px;padding:0;font-size:13px">×</button>
      </div>
      ${rulesHtml || `<div style="font-size:11px;color:var(--is-text-muted);padding:8px 0">${this._t('mtNoConditions')}</div>`}
      <button data-mt-add-rule="${si}" style="${this._mtBtnA('green')};margin-top:8px;font-size:11px">+ ${this._t('mtAddRule')}</button>
    </div>`;
  }

}

export const maintainerrRulesRenderMixin = _MaintainerrRulesRenderMethods.prototype;
