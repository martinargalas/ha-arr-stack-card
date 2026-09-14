// What each Radarr and Sonarr instance hands the card: the lists it asks for
// once, the queue behind the posters, the recent imports behind "new" badges.
// Both instances of each go through the same code, so both are pinned here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCard } from './harness.js';

// Answers by path; a path with no answer throws, like a service that is down.
function stub(card, answers) {
  const asked = [];
  card._callApi = async (method, path) => {
    asked.push(path);
    if (!(path in answers)) throw new Error(`down: ${path}`);
    return answers[path];
  };
  return asked;
}
const quiet = t => { const e = console.error; console.error = () => {}; t.after(() => { console.error = e; }); };

const LISTS = [
  ['_fetchRadarrProfiles',     'radarr',  'profiles',    '_radarrProfiles'],
  ['_fetchRadarrTags',         'radarr',  'tags',        '_radarrTags'],
  ['_fetchRadarrRootFolders',  'radarr',  'rootfolders', '_radarrRootFolders'],
  ['_fetchRadarrDiskspace',    'radarr',  'diskspace',   '_radarrDiskspace'],
  ['_fetchRadarr2Profiles',    'radarr2', 'profiles',    '_radarr2Profiles'],
  ['_fetchRadarr2Tags',        'radarr2', 'tags',        '_radarr2Tags'],
  ['_fetchRadarr2RootFolders', 'radarr2', 'rootfolders', '_radarr2RootFolders'],
  ['_fetchRadarr2Diskspace',   'radarr2', 'diskspace',   '_radarr2Diskspace'],
  ['_fetchSonarrProfiles',     'sonarr',  'profiles',    '_sonarrProfiles'],
  ['_fetchSonarrTags',         'sonarr',  'tags',        '_sonarrTags'],
  ['_fetchSonarrRootFolders',  'sonarr',  'rootfolders', '_sonarrRootFolders'],
  ['_fetchSonarrDiskspace',    'sonarr',  'diskspace',   '_sonarrDiskspace'],
  ['_fetchSonarr2Profiles',    'sonarr2', 'profiles',    '_sonarr2Profiles'],
  ['_fetchSonarr2RootFolders', 'sonarr2', 'rootfolders', '_sonarr2RootFolders'],
  ['_fetchSonarr2Diskspace',   'sonarr2', 'diskspace',   '_sonarr2Diskspace'],
];

for (const [method, svc, kind, field] of LISTS) {
  test(`${method}: asked once, then kept`, async () => {
    const card = makeCard({ [field]: [] });
    const path = `arr_stack/${svc}/${kind}`;
    const asked = stub(card, { [path]: [{ id: 1 }] });
    await card[method]();
    await card[method]();
    assert.deepEqual(card[field], [{ id: 1 }]);
    assert.deepEqual(asked, [path]);
  });

  test(`${method}: a failed or odd answer leaves the list empty`, async t => {
    quiet(t);
    const card = makeCard({ [field]: [] });
    stub(card, {});
    await card[method]();
    assert.deepEqual(card[field], []);
    stub(card, { [`arr_stack/${svc}/${kind}`]: { error: 'nope' } });
    await card[method]();
    assert.deepEqual(card[field], []);
  });

  if (svc.endsWith('2')) {
    test(`${method}: a second instance known to be missing is not asked`, async () => {
      const card = makeCard({ [field]: [], [`_${svc}Configured`]: false });
      const asked = stub(card, {});
      await card[method]();
      assert.deepEqual(asked, []);
    });
  }
}

const imports = {
  records: [
    { eventType: 'downloadFolderImported', seriesId: 5, date: '2026-09-02', episode: { seasonNumber: 1, episodeNumber: 3 } },
    { eventType: 'grabbed',                seriesId: 6, date: '2026-09-02', episode: { seasonNumber: 1, episodeNumber: 1 } },
    { eventType: 'downloadFolderImported', seriesId: 5, date: '2026-09-01', episode: { seasonNumber: 1, episodeNumber: 2 } },
    { eventType: 'downloadFolderImported', seriesId: 7, date: '2026-08-30' },
  ],
};

for (const svc of ['sonarr', 'sonarr2']) {
  const method = svc === 'sonarr' ? '_fetchSonarrRecentImports' : '_fetchSonarr2RecentImports';
  test(`${method}: newest import date and imported episodes per series`, async () => {
    const card = makeCard();
    stub(card, { [`arr_stack/${svc}/recentimports`]: imports });
    await card[method]();
    assert.deepEqual(card[`_${svc}ImportDates`], { 5: '2026-09-02', 7: '2026-08-30' });
    assert.deepEqual(card[`_${svc}ImportEps`], { 5: [{ s: 1, e: 3 }, { s: 1, e: 2 }] });
  });

  test(`${method}: a failed read forgets the imports`, async t => {
    quiet(t);
    const card = makeCard({ [`_${svc}ImportDates`]: { 1: 'x' }, [`_${svc}ImportEps`]: { 1: [] } });
    stub(card, {});
    await card[method]();
    assert.deepEqual(card[`_${svc}ImportDates`], {});
    assert.deepEqual(card[`_${svc}ImportEps`], {});
  });
}

const queue = {
  records: [
    { movieId: 1, title: 'Bad', trackedDownloadStatus: 'warning', size: 100, sizeleft: 50, downloadId: 'HASH1', movie: { title: 'Bad Film' } },
    { movieId: 2, title: 'Going', size: 200, sizeleft: 50, downloadId: 'Hash2' },
    { movieId: 3, title: 'Done', size: 0, sizeleft: 0, trackedDownloadState: 'importPending' },
    { title: 'Unknown', size: 100, sizeleft: 100, downloadId: 'HASH4' },
  ],
};

for (const svc of ['radarr', 'radarr2']) {
  const method = svc === 'radarr' ? '_fetchRadarrQueue' : '_fetchRadarr2Queue';
  const dl = svc === 'radarr' ? '_dlMediaRadarr' : '_dlMediaRadarr2';
  test(`${method}: failed, active, progress, rows and download ids`, async () => {
    const card = makeCard();
    const asked = stub(card, { [`arr_stack/${svc}/queue?includeUnknownMovieItems=true`]: queue });
    await card[method]();
    assert.equal(asked.length, 1);
    assert.deepEqual([...card[`_${svc}QueueFailed`]], [1]);
    assert.deepEqual([...card[`_${svc}QueueActive`]], [2, 3]);
    assert.deepEqual([...card[`_${svc}QueuePct`]], [[2, 75], [3, 100]]);
    assert.deepEqual(card[`_${svc}QueueItems`], [
      { title: 'Bad Film', svc, failed: true,  pct: 50 },
      { title: 'Going',    svc, failed: false, pct: 75 },
      { title: 'Done',     svc, failed: false, pct: 100 },
      { title: 'Unknown',  svc, failed: false, pct: 0 },
    ]);
    assert.deepEqual([...card[dl]], [['hash1', 1], ['hash2', 2]]);
  });

  test(`${method}: a bare array answer reads the same`, async () => {
    const card = makeCard();
    stub(card, { [`arr_stack/${svc}/queue?includeUnknownMovieItems=true`]: queue.records });
    await card[method]();
    assert.deepEqual([...card[`_${svc}QueueActive`]], [2, 3]);
  });

  test(`${method}: a failed read keeps what was there`, async t => {
    quiet(t);
    const keep = new Set([9]);
    const card = makeCard({ [`_${svc}QueueActive`]: keep });
    stub(card, {});
    await card[method]();
    assert.equal(card[`_${svc}QueueActive`], keep);
  });
}

test('_fetchRadarr2Queue: not asked when the second Radarr is missing', async () => {
  const card = makeCard({ _radarr2Configured: false });
  const asked = stub(card, {});
  await card._fetchRadarr2Queue();
  assert.deepEqual(asked, []);
});
