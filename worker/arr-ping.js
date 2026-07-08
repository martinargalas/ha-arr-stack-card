const PING_TOKEN  = 'arr-stack-2025';
const STATS_TOKEN = 'arr-stats-2026';

const ALL_SVCS = ['radarr2','sonarr2','overseerr','bazarr','plex','tautulli','jellystat','qbit','sabnzbd','nzbget','deluge','trakt','gluetun'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return cors();

    // ensure schema is up to date on every request
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS pings (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, version TEXT, sid TEXT, svcs TEXT, mob INTEGER)').run().catch(() => {});
    await env.DB.prepare('ALTER TABLE pings ADD COLUMN svcs TEXT').run().catch(() => {});
    await env.DB.prepare('ALTER TABLE pings ADD COLUMN mob INTEGER').run().catch(() => {});

    if (request.method === 'GET' && url.pathname === '/stats') {
      if (url.searchParams.get('token') !== STATS_TOKEN) {
        return new Response('Unauthorized', { status: 401 });
      }
      try {
        const since30d = Date.now() - 2592000000;
        const [active24h, active7d, active30d, byVersion, daily, hourly, mobRow, recentMeta, newRow] = await Promise.all([
          env.DB.prepare('SELECT COUNT(DISTINCT sid) as n FROM pings WHERE ts > ?').bind(Date.now() - 86400000).first(),
          env.DB.prepare('SELECT COUNT(DISTINCT sid) as n FROM pings WHERE ts > ?').bind(Date.now() - 604800000).first(),
          env.DB.prepare('SELECT COUNT(DISTINCT sid) as n FROM pings WHERE ts > ?').bind(since30d).first(),
          env.DB.prepare(`SELECT version, COUNT(*) as installs FROM (SELECT sid, version FROM (SELECT sid, version, MAX(ts) as latest FROM pings WHERE ts > ? GROUP BY sid)) GROUP BY version ORDER BY installs DESC`).bind(since30d).all(),
          env.DB.prepare("SELECT strftime('%Y-%m-%d', datetime(ts/1000,'unixepoch')) as day, COUNT(DISTINCT sid) as uniq FROM pings WHERE ts > ? GROUP BY day ORDER BY day DESC LIMIT 30").bind(since30d).all(),
          env.DB.prepare("SELECT strftime('%H', datetime(ts/1000,'unixepoch')) as hour, COUNT(DISTINCT sid) as uniq FROM pings WHERE date(datetime(ts/1000,'unixepoch')) = date('now') GROUP BY hour ORDER BY hour").all(),
          env.DB.prepare("SELECT SUM(CASE WHEN mob=1 THEN 1 ELSE 0 END) as mob, COUNT(*) as total FROM (SELECT sid, MAX(ts) as latest, mob FROM pings WHERE ts > ? AND mob IS NOT NULL GROUP BY sid)").bind(since30d).first(),
          // latest ping per sid with meta — for service adoption
          env.DB.prepare("SELECT svcs FROM (SELECT sid, MAX(ts) as latest, svcs FROM pings WHERE ts > ? AND svcs IS NOT NULL GROUP BY sid)").bind(since30d).all(),
          // new installs: sids whose very first ping was within last 30 days
          env.DB.prepare("SELECT COUNT(*) as n FROM (SELECT sid FROM pings GROUP BY sid HAVING MIN(ts) > ?)").bind(since30d).first(),
        ]);

        // service adoption: count how many unique sids have each service
        const svcCounts = {};
        for (const svc of ALL_SVCS) svcCounts[svc] = 0;
        const metaRows = recentMeta.results || [];
        const total = metaRows.length;
        for (const row of metaRows) {
          let svcs = [];
          try { svcs = JSON.parse(row.svcs || '[]'); } catch (_) {}
          for (const s of svcs) { if (svcCounts[s] !== undefined) svcCounts[s]++; }
        }
        const byService = ALL_SVCS.map(s => ({ svc: s, installs: svcCounts[s], pct: total ? Math.round(svcCounts[s] / total * 100) : 0 }));

        return corsJson({
          active24h: active24h.n, active7d: active7d.n, active30d: active30d.n,
          newInstalls30d: newRow?.n ?? 0,
          byVersion: byVersion.results, daily: daily.results, hourly: hourly.results,
          byService,
          mob: mobRow?.total ? Math.round(mobRow.mob / mobRow.total * 100) : null,
        });
      } catch (e) {
        return corsJson({ error: e.message }, 500);
      }
    }

    if (request.method === 'POST') {
      if (env.ENFORCE_TOKEN === 'true' && request.headers.get('X-Arr-Token') !== PING_TOKEN) {
        return new Response('Forbidden', { status: 403 });
      }

      try {

        const body = await request.json().catch(() => ({}));
        const svcs = Array.isArray(body.svcs) ? JSON.stringify(body.svcs) : null;
        const mob  = typeof body.mob === 'number' ? body.mob : null;
        await env.DB.prepare('INSERT INTO pings (ts, version, sid, svcs, mob) VALUES (?, ?, ?, ?, ?)').bind(Date.now(), body.v || 'unknown', body.sid || 'unknown', svcs, mob).run();
        return corsJson({ ok: true });
      } catch (e) {
        return corsJson({ ok: false, error: e.message }, 500);
      }
    }

    return new Response('OK', { status: 200 });
  }
};

function cors() { return new Response(null, { status: 204, headers: corsHeaders() }); }
function corsJson(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }); }
function corsHeaders() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Arr-Token' }; }
