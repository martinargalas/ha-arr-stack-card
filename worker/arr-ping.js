const PING_TOKEN  = 'arr-stack-2025';
const STATS_TOKEN = 'arr-stats-2026';

const ALL_SVCS = ['radarr2','sonarr2','overseerr','bazarr','plex','tautulli','jellystat','qbit','sabnzbd','nzbget','deluge','trakt','gluetun'];

const STATS_CACHE_TTL = 21600000; // 6 hours
const RETENTION_MS    = 15778800000; // ~6 months
const PING_RATE_MS    = 60000;  // 1 ping per minute per IP
const RL_MAX          = 10000;  // max tracked IPs before cleanup
let statsCache = null;
let statsCacheTs = 0;

const pingRL = new Map(); // IP → last ping timestamp

function rateLimit(ip, windowMs) {
  const now = Date.now();
  const last = pingRL.get(ip);
  if (last && (now - last) < windowMs) return true;
  pingRL.set(ip, now);
  // evict old entries when map gets large
  if (pingRL.size > RL_MAX) {
    for (const [k, v] of pingRL) {
      if ((now - v) > windowMs) pingRL.delete(k);
      if (pingRL.size <= RL_MAX / 2) break;
    }
  }
  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ip  = request.headers.get('cf-connecting-ip') || 'unknown';

    if (request.method === 'OPTIONS') return cors();

    if (request.method === 'POST') {
      if (env.ENFORCE_TOKEN === 'true' && request.headers.get('X-Arr-Token') !== PING_TOKEN) {
        return new Response('Forbidden', { status: 403 });
      }

      if (rateLimit(ip, PING_RATE_MS)) {
        return corsJson({ ok: true, throttled: true });
      }

      try {
        const body = await request.json().catch(() => ({}));
        const svcs = Array.isArray(body.svcs) ? JSON.stringify(body.svcs) : null;
        const mob  = typeof body.mob === 'number' ? body.mob : null;
        const act  = body.act === 1 ? 1 : 0;
        await env.DB.prepare('INSERT INTO pings (ts, version, sid, svcs, mob, act) VALUES (?, ?, ?, ?, ?, ?)').bind(Date.now(), body.v || 'unknown', body.sid || 'unknown', svcs, mob, act).run();

        // cleanup: delete data older than 6 months (max once per 24h via cache guard)
        if (!this._lastCleanup || (Date.now() - this._lastCleanup) > 86400000) {
          this._lastCleanup = Date.now();
          env.DB.prepare('DELETE FROM pings WHERE ts < ?').bind(Date.now() - RETENTION_MS).run().catch(() => {});
        }

        return corsJson({ ok: true });
      } catch (e) {
        return corsJson({ ok: false, error: e.message }, 500);
      }
    }

    if (request.method === 'GET' && url.pathname === '/stats') {
      if (url.searchParams.get('token') !== STATS_TOKEN) {
        return new Response('Unauthorized', { status: 401 });
      }
      const noCache = url.searchParams.get('nocache') === '1';
      if (!noCache && statsCache && (Date.now() - statsCacheTs) < STATS_CACHE_TTL) {
        return corsJson(statsCache);
      }
      try {
        const since30d = Date.now() - 2592000000;
        const since6m  = Date.now() - RETENTION_MS;
        const [active24h, active7d, active30d, byVersion, daily, hourly, mobRow, recentMeta, newRow, activatedRow, dailyAct, monthly] = await Promise.all([
          env.DB.prepare('SELECT COUNT(DISTINCT sid) as n FROM pings WHERE ts > ?').bind(Date.now() - 86400000).first(),
          env.DB.prepare('SELECT COUNT(DISTINCT sid) as n FROM pings WHERE ts > ?').bind(Date.now() - 604800000).first(),
          env.DB.prepare('SELECT COUNT(DISTINCT sid) as n FROM pings WHERE ts > ?').bind(since30d).first(),
          env.DB.prepare(`SELECT version, COUNT(*) as installs FROM (SELECT sid, version FROM (SELECT sid, version, MAX(ts) as latest FROM pings WHERE ts > ? GROUP BY sid)) GROUP BY version ORDER BY installs DESC`).bind(since30d).all(),
          env.DB.prepare("SELECT strftime('%Y-%m-%d', datetime(ts/1000,'unixepoch')) as day, COUNT(DISTINCT sid) as uniq FROM pings WHERE ts > ? GROUP BY day ORDER BY day DESC LIMIT 30").bind(since30d).all(),
          env.DB.prepare("SELECT strftime('%H', datetime(ts/1000,'unixepoch')) as hour, COUNT(DISTINCT sid) as uniq FROM pings WHERE date(datetime(ts/1000,'unixepoch')) = date('now') GROUP BY hour ORDER BY hour").all(),
          env.DB.prepare("SELECT SUM(CASE WHEN mob=1 THEN 1 ELSE 0 END) as mob, COUNT(*) as total FROM (SELECT sid, MAX(ts) as latest, mob FROM pings WHERE ts > ? AND mob IS NOT NULL GROUP BY sid)").bind(since30d).first(),
          env.DB.prepare("SELECT svcs FROM (SELECT sid, MAX(ts) as latest, svcs FROM pings WHERE ts > ? AND svcs IS NOT NULL GROUP BY sid)").bind(since30d).all(),
          env.DB.prepare("SELECT COUNT(*) as n FROM (SELECT sid FROM pings WHERE ts > ? GROUP BY sid HAVING MIN(ts) > ?)").bind(since6m, since30d).first(),
          env.DB.prepare("SELECT COUNT(DISTINCT sid) as n FROM pings WHERE act=1 AND ts > ?").bind(since30d).first(),
          env.DB.prepare("SELECT strftime('%Y-%m-%d', datetime(ts/1000,'unixepoch')) as day, COUNT(DISTINCT sid) as act FROM pings WHERE act=1 AND ts > ? GROUP BY day ORDER BY day DESC LIMIT 30").bind(since30d).all(),
          env.DB.prepare("SELECT strftime('%Y-%m', datetime(ts/1000,'unixepoch')) as month, COUNT(DISTINCT sid) as uniq, COUNT(DISTINCT CASE WHEN act=1 THEN sid END) as act FROM pings WHERE ts > ? GROUP BY month ORDER BY month").bind(since6m).all(),
        ]);

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

        const result = {
          active24h: active24h.n, active7d: active7d.n, active30d: active30d.n,
          newInstalls30d: newRow?.n ?? 0,
          activated30d: activatedRow?.n ?? 0,
          dailyAct: dailyAct.results || [],
          byVersion: byVersion.results, daily: daily.results, hourly: hourly.results,
          monthly: monthly.results || [],
          byService,
          mob: mobRow?.total ? Math.round(mobRow.mob / mobRow.total * 100) : null,
        };
        statsCache = result;
        statsCacheTs = Date.now();
        return corsJson(result);
      } catch (e) {
        return corsJson({ error: e.message }, 500);
      }
    }

    return new Response('OK', { status: 200 });
  }
};

function cors() { return new Response(null, { status: 204, headers: corsHeaders() }); }
function corsJson(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }); }
function corsHeaders() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Arr-Token' }; }
