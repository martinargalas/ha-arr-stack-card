// The statistics modals draw what other people set, as the tiles do: a Plex or
// Jellyfin user names themselves and their device, a title carries whatever its
// metadata says, an indexer or a Maintainerr rule is named by whoever made it.
// The modals open for an admin, so markup that got through would run with the
// admin's Home Assistant session. None of it may become markup.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard, parse, setViewport } from './harness.js';

const EVIL = '<img src=x onerror="alert(1)">';

function inert(html, what) {
  const dom = parse(html);
  assert.equal(dom.querySelectorAll('[onerror="alert(1)"]').length, 0, `${what}: markup got through`);
  assert.ok(dom.textContent.includes('<img src=x'), `${what}: shown as text instead`);
  return dom;
}

// Values that only ever reach an attribute have no text to show; it is enough
// that no element was made from them.
function noMarkup(html, what) {
  const dom = parse(html);
  assert.equal(dom.querySelectorAll('[onerror="alert(1)"]').length, 0, `${what}: markup got through`);
  return dom;
}

function bothWidths(fn) {
  for (const px of [1400, 390]) {
    setViewport(px);
    try { fn(px < 600 ? 'phone' : 'desktop'); } finally { setViewport(1400); }
  }
}

// ── Tracearr ─────────────────────────────────────────────────────────────────

const traUser = { id: 'u1', displayName: EVIL, username: EVIL, serverName: EVIL, trustScore: 50, totalViolations: 1, sessionCount: 2 };

test('Tracearr avatars keep a name out of their handlers and drop non-web addresses', () => {
  const card = makeCard();
  const withPic = noMarkup(card._traUserAvatar({ displayName: '\');alert(1);//', thumbUrl: 'https://tracearr.local/a.png' }), 'avatar');
  const img = withPic.querySelector('img');
  assert.equal(img.getAttribute('src'), 'https://tracearr.local/a.png');
  assert.ok(!img.getAttribute('onerror').includes('alert'), 'the handler carries no part of the name');
  const noPic = noMarkup(card._traUserAvatar({ displayName: '<b>x', thumbUrl: 'javascript:alert(1)' }), 'avatar');
  assert.equal(noPic.querySelector('b'), null, 'initials are text');
  assert.equal(noPic.textContent, '<B');
  assert.equal(noPic.querySelector('img'), null, 'a javascript: avatar draws no picture');
});

test('Tracearr overview, users and violations show names as text', () => {
  bothWidths(w => {
    const card = makeCard({ _tracearrModal: {
      overviewStats: { activeStreams: EVIL }, overviewHealth: { servers: [{ name: EVIL, type: 'plex', online: true, activeStreams: 1 }] },
      overviewViols: [{ type: EVIL, severity: EVIL, username: EVIL }], overviewAct: {},
      usersData: [traUser], usersPage: 0,
      violsData: [{ type: EVIL, severity: EVIL, detail: EVIL, user: traUser }], violsTotal: 1, violsPage: 0,
    } });
    inert(card._traBodyOverview(), `overview (${w})`);
    inert(card._traBodyUsers(), `users (${w})`);
    inert(card._traBodyViolations(), `violations (${w})`);
  });
});

test('Tracearr rules and the rule form show what the rule is called as text', () => {
  const rule = { id: '" onmouseover="alert(1)', name: EVIL, description: EVIL, severity: EVIL, type: EVIL, isActive: true,
    conditions: { groups: [{ conditions: [{ field: 'inactive_days', operator: 'gt', value: '"><img src=x onerror="alert(1)">' }] }] },
    actions: { actions: [{ type: 'log_only', message: '"><img src=x onerror="alert(1)">' }] } };
  const card = makeCard({ _tracearrModal: { rulesData: [rule] } });
  const list = inert(card._traBodyRules(), 'rules');
  assert.equal(list.querySelector('[onmouseover]'), null, 'an id cannot open an attribute');
  const form = noMarkup(card._traRuleFormHtml('custom', rule), 'rule form');
  assert.equal(form.querySelector('#tra-rf-name').value, EVIL, 'the name is kept exactly as it is');
  assert.equal(form.querySelector('.tra-act-msg').value, '"><img src=x onerror="alert(1)">');
});

test('Tracearr history, a session and the top users show names, titles and devices as text', () => {
  const hist = { id: 'h1', mediaTitle: EVIL, showTitle: EVIL, seasonNumber: EVIL, user: traUser, platform: EVIL, product: EVIL,
    device: EVIL, player: EVIL, serverName: EVIL, sourceVideoCodec: EVIL, subtitleInfo: { language: EVIL, decision: EVIL } };
  bothWidths(w => {
    const card = makeCard({ _tracearrModal: {
      histData: [hist], histTotal: 1, histPage: 0, histUsers: [traUser], histServers: [{ id: 's', name: EVIL, type: EVIL }],
      histDetailItem: hist,
      statsUsersData: [0, 1, 2, 3].map(() => ({ username: EVIL, avatar: 'javascript:alert(1)', playCount: EVIL, topContent: EVIL })),
    } });
    inert(card._traBodyHistory(), `history (${w})`);
    inert(card._traBodyHistDetail(), `session (${w})`);
    const podium = inert(card._traBodyStatsUsers(), `top users (${w})`);
    assert.equal(podium.querySelector('img'), null, 'a javascript: avatar draws no picture');
  });
});

test('Tracearr activity, library, watch, devices and bandwidth show what they are given as text', () => {
  const u = { username: EVIL, avatar: '" onerror="alert(1)', sessions: EVIL };
  bothWidths(w => {
    const card = makeCard({ _tracearrModal: {
      activityData: { platforms: [{ platform: EVIL, count: 2 }] },
      qualityData: { data: [] }, qualityCodecs: { video: { codecs: [{ codec: EVIL, count: 3 }] } },
      staleItems: [{ title: EVIL, year: EVIL, serverName: EVIL, resolution: EVIL, mediaType: 'movie' }], staleTotal: 1,
      storageData: { history: [], current: {} },
      watchTopMovies: [{ title: EVIL, year: EVIL, plays: EVIL }], watchPatterns: { bingeShows: [{ showTitle: EVIL, bingeScore: EVIL }], seasonalTrends: { busiestMonth: EVIL } },
      devicesData: { summary: { totalSessions: EVIL } }, devicesHealth: { data: [{ device: EVIL }] },
      devicesHotspots: { data: [{ device: EVIL, videoCodec: EVIL }] }, devicesMatrix: { codecs: [EVIL], devices: [{ device: EVIL, codecs: {} }] },
      devicesUsers: { data: [u] }, devicesRightView: 'users', devMobView: 'users',
      bwUsers: [u], bwSummary: { totalSessions: EVIL },
    } });
    const act = inert(card._traBodyActivity(), `activity (${w})`);
    assert.ok(act.querySelector('.donut-arc').dataset.label === EVIL, 'the hover label is still the name itself');
    inert(card._traBodyQuality(), `quality (${w})`);
    inert(card._traBodyStaleSection(), `stale (${w})`);
    inert(card._traBodyWatch(), `watch (${w})`);
    const dev = inert(card._traBodyDevices(), `devices (${w})`);
    assert.equal(dev.querySelector('img'), null, 'an avatar that is not an address is dropped');
    inert(card._traBodyBandwidth(), `bandwidth (${w})`);
  });
});

test('Tracearr map popups show a city as text', () => {
  const popups = [];
  const marker = { bindPopup: html => { popups.push(html); return marker; }, addTo: () => marker };
  const prevL = window.L;
  window.L = { circleMarker: () => marker };
  try {
    const card = makeCard();
    card._traMapPlotData({ _leafletMap: { eachLayer() {}, setView() {} }, mapData: { data: [{ lat: 1, lon: 1, city: EVIL, count: 1 }] } });
    inert(popups[0], 'map popup');
  } finally { window.L = prevL; }
});

// ── Tautulli ─────────────────────────────────────────────────────────────────

test('Tautulli libraries, users and history show names, titles and addresses as text', () => {
  const lib = { section_id: 1, section_name: EVIL, section_type: EVIL, last_played: EVIL, count: EVIL, plays: EVIL };
  const user = { user_id: 7, friendly_name: EVIL, username: EVIL, user_thumb: 'javascript:alert(1)', plays: EVIL, ip_address: EVIL };
  const hist = { row_id: '" onmouseover="alert(1)', full_title: EVIL, friendly_name: EVIL, platform: EVIL, ip_address: EVIL };
  bothWidths(w => {
    for (const editMode of [false, true]) {
      const card = makeCard({
        _tautulli: { sharingDetected: true, sharingUsers: [EVIL], ipReport: { [EVIL]: [{ ip: EVIL, count: EVIL }] } },
        _tautulliModal: { libsEditMode: editMode, usersEditMode: editMode, histData: [hist], histTotal: 1,
          histUsers: [user], histMobHiddenCols: new Set(), histHiddenCols: new Set() },
      });
      inert(card._tlBodyLibraries([lib], 1), `libraries (${w})`);
      const users = inert(card._tlBodyUsers([user], 1), `users (${w})`);
      assert.equal(users.querySelector('img'), null, 'a javascript: avatar draws no picture');
      const h = inert(card._tlBodyHistory(), `history (${w})`);
      assert.equal(h.querySelector('[onmouseover]'), null, 'a row id cannot open an attribute');
    }
  });
});

test('Tautulli user, library and title details show what they are given as text', () => {
  const h = { row_id: 1, rating_key: '"><img src=x onerror="alert(1)">', full_title: EVIL, ip_address: EVIL, platform: EVIL, thumb: '/t' };
  const u = { friendly_name: EVIL, user_thumb: 'javascript:alert(1)', total_plays: EVIL };
  bothWidths(w => {
    const card = makeCard({ _tautulliModal: {
      userDetailId: 7, userDetailName: EVIL, userDetailThumb: '" onerror="alert(1)', userDetailTab: 'profile',
      userDetailProfile: { playerStats: [{ platform: EVIL, total_plays: EVIL }], recentHistory: [h] },
      userDetailHistData: [h], userDetailHistMobHiddenCols: new Set(), userDetailHistHiddenCols: new Set(),
      userDetailIpsData: [{ ip_address: EVIL, play_count: EVIL }],
      libDetailId: 1, libDetailName: EVIL, libDetailProfile: { userStats: [u], recentHistory: [h] },
      libDetailMediaData: [{ rating_key: '"', title: EVIL, year: EVIL, play_count: EVIL }],
      mediaDetailTitle: EVIL, mediaDetailData: { metadata: { title: EVIL, media_index: EVIL, parent_title: EVIL }, userStats: [u] },
    } });
    const m = card._tautulliModal;
    const ud = inert(card._tlBodyUserDetail(), `user profile (${w})`);
    assert.equal(ud.querySelector('img:not([data-tl-plex-path])'), null, 'an avatar that is not an address is dropped');
    m.userDetailTab = 'history'; inert(card._tlBodyUserDetail(), `user history (${w})`);
    m.userDetailTab = 'ips';     inert(card._tlBodyUserDetail(), `user ips (${w})`);
    const ld = inert(card._tlBodyLibDetail(), `library profile (${w})`);
    assert.equal(ld.querySelector('img:not([data-tl-plex-path])'), null);
    m.libDetailTab = 'media'; inert(card._tlBodyLibDetail(), `library media (${w})`);
    const md = inert(card._tlBodyMediaDetail(), `title (${w})`);
    assert.equal(md.querySelector('img:not([data-tl-plex-path])'), null);
  });
});

test('Tautulli charts label categories, series and users as text', () => {
  const raw = { response: { data: { categories: [EVIL, 'b'], series: [{ name: EVIL, data: [1, 2] }] } } };
  const card = makeCard({ _tautulliModal: { graphsUserList: [{ user_id: '"', friendly_name: EVIL }], graphsSelectedUsers: new Set(['"']) } });
  inert(card._tlGBarSvg(raw, { chartId: 'x' }), 'bar chart');
  inert(card._tlGLineSvg(raw, { chartId: 'y', range: 2, xLabel: d => d }), 'line chart');
  inert(card._tlGCard('t', raw, ''), 'legend');
  inert(card._tlGUserDropdown(), 'user picker');
});

// ── Jellystat ────────────────────────────────────────────────────────────────

test('Jellystat libraries, users and history show names, titles and devices as text', () => {
  bothWidths(w => {
    const card = makeCard({ _jellystatModal: {
      libsData: [{ Name: EVIL, ItemName: EVIL, Season_Count: 1, Episode_Count: 2, Library_Count: EVIL, CollectionType: 'tvshows' }],
      libsHiddenCols: new Set(), libsMobHiddenCols: new Set(),
      usersData: [{ UserName: EVIL, LastClient: `${EVIL} - ${EVIL}`, LastWatched: EVIL, TotalPlays: EVIL }],
      usersHiddenCols: new Set(), usersMobHiddenCols: new Set(),
      histData: [{ UserName: EVIL, Client: EVIL, DeviceName: EVIL, NowPlayingItemName: EVIL, SeriesName: EVIL, RemoteEndPoint: EVIL }],
      histTotal: 1, histUsers: [{ UserName: EVIL }], histHiddenCols: new Set(), histMobHiddenCols: new Set(),
    } });
    inert(card._jsBodyLibraries(), `libraries (${w})`);
    inert(card._jsBodyUsers(), `users (${w})`);
    inert(card._jsBodyHistory(), `history (${w})`);
  });
});

// ── Prowlarr ─────────────────────────────────────────────────────────────────

test('Prowlarr indexers, apps and forms show what definitions and settings say as text', () => {
  const idx = { id: 1, name: EVIL, enable: true, protocol: EVIL, priority: EVIL, tags: [EVIL],
    fields: [{ name: 'minimumSeeders', value: EVIL }, { name: 'seedRatio', value: EVIL }] };
  const app = { id: 2, name: EVIL, enable: true, syncLevel: EVIL, implementationName: EVIL,
    fields: [{ name: 'baseUrl', value: EVIL }] };
  const schemaFields = [
    { name: '"><img src=x onerror="alert(1)">', label: EVIL, type: 'text', value: EVIL },
    { name: 'sel', label: EVIL, type: 'select', value: 1, selectOptions: [{ value: '"><img src=x onerror="alert(1)">', name: EVIL }] },
  ];
  bothWidths(w => {
    const card = makeCard({ _prowlarrModal: { appsData: [app], appsProfiles: [] } });
    inert(card._pwIndexersTabHtml([idx], card._prowlarrModal), `indexers (${w})`);
    inert(card._pwAppsTabHtml(card._prowlarrModal), `apps (${w})`);
    inert(card._pwIndexerFormHtml({ name: EVIL, fields: schemaFields }, {}, true, []), `indexer form (${w})`);
    inert(card._pwAppFormHtml({ name: EVIL, fields: schemaFields }, {}, true, [], [{ id: 2000, name: EVIL }]), `app form (${w})`);
  });
});

// ── Maintainerr ──────────────────────────────────────────────────────────────

test('Maintainerr rules, collections and the calendar show names and titles as text', () => {
  const rule = { id: '" onmouseover="alert(1)', name: EVIL, description: EVIL, libraryId: 1, isActive: true, rules: [], collectionId: 5 };
  const media = [{ id: 1, mediaServerId: '" onmouseover="alert(1)', title: EVIL, image_path: "x') ;background:url('javascript:alert(1)", plexData: {} }];
  const col = { id: '" onmouseover="alert(1)', title: EVIL, mediaCount: EVIL, deleteAfterDays: EVIL, totalSizeBytes: 10, media, libraryId: 1 };
  bothWidths(w => {
    const card = makeCard({
      _maintainerr: { rules: [rule], collections: [col] },
      _maintainerrLibraries: [{ id: 1, title: EVIL, type: 'movie' }],
      _maintainerrModal: { tab: 'rules', page: 0, colPage: 0, rulesPerPage: 12, colPerPage: 12, view: 'cards' },
    });
    const rules = inert(card._mtRulesTabHtml(), `rules (${w})`);
    assert.equal(rules.querySelector('[onmouseover]'), null, 'a rule id cannot open an attribute');
    inert(card._mtRulesTableHtml([rule]), `rules table (${w})`);
    const cols = inert(card._mtCollectionsTabHtml(), `collections (${w})`);
    assert.equal(cols.querySelector('[onmouseover]'), null, 'a collection id cannot open an attribute');
    assert.ok(!cols.innerHTML.includes('javascript:alert(1)'), 'a poster address that could end the CSS string is dropped');
    inert(card._mtCollectionsTableHtml([col], [rule]), `collections table (${w})`);
  });
});

test('Maintainerr collection detail, its logs and the editor show what Maintainerr says as text', () => {
  const col = { id: 5, title: EVIL, addDate: '2026-01-01', handledMediaAmount: EVIL, lastDurationInSeconds: EVIL };
  bothWidths(w => {
    const card = makeCard({
      _maintainerr: { rules: [], collections: [col] },
      _maintainerrLibraries: [{ id: 1, title: EVIL, type: 'movie' }],
      _maintainerrConstants: { applications: [{ id: 0, name: EVIL, props: [{ id: 1, name: EVIL, humanName: EVIL }] }] },
      _maintainerrArrServers: { radarr: [{ id: 1, name: EVIL }] },
      _maintainerrModal: {
        tab: 'collections',
        colDetail: { id: 5, items: [{ id: 1, mediaServerId: '" onmouseover="alert(1)', title: EVIL, image_path: EVIL }],
          deleteAfterDays: 3, mediaType: 'movie', excludedIds: new Set(),
          logs: { items: [{ type: 1, timestamp: Date.now(), message: EVIL }], total: 1 } },
        editor: { id: 7, name: EVIL, description: EVIL, libraryId: 1, mediaType: 'movie',
          deleteAfterDays: '"><img src=x onerror="alert(1)">', keepLogsForMonths: EVIL,
          tautulliWatchedPercentOverride: EVIL, sortTitle: EVIL, ruleHandlerCronSchedule: EVIL,
          sections: [{ rules: [{ firstVal: [0, 1], action: 0, customVal: EVIL, customValType: 2 }] }] },
      },
    });
    const detail = inert(card._mtCollectionDetailHtml(), `collection media (${w})`);
    assert.equal(detail.querySelector('[onmouseover]'), null, 'a media id cannot open an attribute');
    inert(card._mtCollectionInfoHtml(), `collection info (${w})`);
    const ed = noMarkup(card._mtRuleEditorHtml(), `rule editor (${w})`);
    assert.equal(ed.querySelector('#mt-ed-del-days').getAttribute('value'), '"><img src=x onerror="alert(1)">');
  });
});
