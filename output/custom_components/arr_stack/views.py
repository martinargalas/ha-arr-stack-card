"""HTTP proxy view — přeposílá requesty z karty na lokální služby (server-side, žádný CORS)."""
import asyncio
import aiohttp
from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    DOMAIN,
    CONF_QBIT_URL, CONF_QBIT_USER, CONF_QBIT_PASS,
    CONF_SAB_URL, CONF_SAB_KEY,
    CONF_RADARR_URL, CONF_RADARR_KEY,
    CONF_SONARR_URL, CONF_SONARR_KEY,
    CONF_SEERR_URL, CONF_SEERR_KEY,
    CONF_SEERR_FAMILY_EMAIL, CONF_SEERR_FAMILY_PASS,
    CONF_BAZARR_URL, CONF_BAZARR_KEY,
)

# qBit v5 → v4 fallback endpoint mapa
QBIT_ENDPOINTS = {
    "pause":     ("/api/v2/torrents/stop",   "/api/v2/torrents/pause"),
    "resume":    ("/api/v2/torrents/start",  "/api/v2/torrents/resume"),
    "pauseAll":  ("/api/v2/torrents/stop",   "/api/v2/torrents/pause"),
    "resumeAll": ("/api/v2/torrents/start",  "/api/v2/torrents/resume"),
    "delete":    ("/api/v2/torrents/delete", "/api/v2/torrents/delete"),
}


class ArrStackProxyView(HomeAssistantView):
    """Proxy /api/arr_stack/{service}/{path} → lokální služby."""

    url = "/api/arr_stack/{service}/{path:.*}"
    name = "api:arr_stack:proxy"
    requires_auth = True

    def __init__(self, hass) -> None:
        self._hass = hass
        # Dedikovaná session pro qBit — potřebuje cookie jar pro session auth
        self._qbit_session: aiohttp.ClientSession | None = None
        # Session pro rodinný Overseerr účet
        self._seerr_family_session: aiohttp.ClientSession | None = None

    @property
    def _cfg(self) -> dict:
        """Čte aktuální config dynamicky — aktualizuje se bez restartu HA."""
        return self._hass.data.get(DOMAIN, {}).get("config", {})

    # ── Session helpers ──────────────────────────────────────────────────

    async def _qbit_sess(self) -> aiohttp.ClientSession:
        """Vrátí (nebo vytvoří) aiohttp session s cookie jar pro qBit."""
        if self._qbit_session is None or self._qbit_session.closed:
            self._qbit_session = aiohttp.ClientSession(
                cookie_jar=aiohttp.CookieJar(unsafe=True)
            )
        return self._qbit_session

    async def _qbit_login(self, session: aiohttp.ClientSession) -> None:
        """Přihlásí se do qBit (nastaví session cookie)."""
        url = f"{self._cfg.get(CONF_QBIT_URL, '')}/api/v2/auth/login"
        async with session.post(url, data={
            "username": self._cfg.get(CONF_QBIT_USER, ""),
            "password": self._cfg.get(CONF_QBIT_PASS, ""),
        }) as r:
            await r.read()

    async def _seerr_family_sess(self) -> aiohttp.ClientSession:
        """Vrátí (nebo vytvoří) aiohttp session s cookie jar pro rodinný Overseerr účet."""
        if self._seerr_family_session is None or self._seerr_family_session.closed:
            self._seerr_family_session = aiohttp.ClientSession(
                cookie_jar=aiohttp.CookieJar(unsafe=True)
            )
            await self._seerr_family_login(self._seerr_family_session)
        return self._seerr_family_session

    async def _seerr_family_login(self, session: aiohttp.ClientSession) -> None:
        """Přihlásí se do Overseerr jako rodinný účet (nastaví session cookie)."""
        url = f"{self._cfg[CONF_SEERR_URL]}/api/v1/auth/local"
        async with session.post(url, json={
            "email": self._cfg[CONF_SEERR_FAMILY_EMAIL],
            "password": self._cfg[CONF_SEERR_FAMILY_PASS],
        }, headers={"Accept": "application/json"}) as r:
            await r.read()

    # ── Router ───────────────────────────────────────────────────────────

    async def get(self, request: web.Request, service: str, path: str) -> web.Response:
        return await self._handle(request, service, path, "GET")

    async def post(self, request: web.Request, service: str, path: str) -> web.Response:
        return await self._handle(request, service, path, "POST")

    async def delete(self, request: web.Request, service: str, path: str) -> web.Response:
        return await self._handle(request, service, path, "DELETE")

    async def _handle(
        self, request: web.Request, service: str, path: str, method: str
    ) -> web.Response:
        try:
            return await self._route(request, service, path, method)
        except aiohttp.ClientConnectorError as exc:
            return web.json_response({"error": f"Nelze se připojit: {exc}"}, status=503)
        except Exception as exc:  # noqa: BLE001
            return web.json_response({"error": str(exc)}, status=500)

    async def _route(
        self, request: web.Request, service: str, path: str, method: str
    ) -> web.Response:
        cfg = self._cfg
        http = async_get_clientsession(self._hass)

        # ════════════════════════════════════════════
        # qBittorrent
        # ════════════════════════════════════════════
        if service == "qbit":
            if not cfg.get(CONF_QBIT_URL):
                return web.json_response({"error": "qBittorrent not configured"}, status=503)
            qs = await self._qbit_sess()
            await self._qbit_login(qs)

            if path == "torrents":
                async with qs.get(
                    f"{cfg[CONF_QBIT_URL]}/api/v2/torrents/info?filter=all"
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "transfer":
                async with qs.get(
                    f"{cfg[CONF_QBIT_URL]}/api/v2/transfer/info"
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "action" and method == "POST":
                body = await request.json()
                action = body.get("action", "")
                hash_ = body.get("hash", "all")
                delete_files = str(body.get("deleteFiles", False)).lower()

                if action not in QBIT_ENDPOINTS:
                    return web.json_response({"error": "unknown action"}, status=400)

                v5ep, v4ep = QBIT_ENDPOINTS[action]
                data = (
                    {"hashes": hash_, "deleteFiles": delete_files}
                    if action == "delete"
                    else {"hashes": "all" if action in ("pauseAll", "resumeAll") else hash_}
                )

                async with qs.post(
                    f"{cfg[CONF_QBIT_URL]}{v5ep}", data=data
                ) as r:
                    if r.status == 404 and v4ep != v5ep:
                        async with qs.post(
                            f"{cfg[CONF_QBIT_URL]}{v4ep}", data=data
                        ) as r2:
                            return web.json_response({"ok": r2.status == 200})
                    return web.json_response({"ok": r.status == 200})

        # ════════════════════════════════════════════
        # SABnzbd
        # ════════════════════════════════════════════
        elif service == "sabnzbd":
            base = cfg.get(CONF_SAB_URL, "")
            if not base:
                return web.json_response({"error": "SABnzbd not configured"}, status=503)
            key = cfg.get(CONF_SAB_KEY, "")

            if path == "queue":
                async with http.get(
                    f"{base}/api?mode=queue&output=json&apikey={key}"
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "history":
                async with http.get(
                    f"{base}/api?mode=history&output=json&limit=20&apikey={key}"
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "action" and method == "POST":
                body = await request.json()
                mode = body.get("mode", "")
                name = body.get("name", "")
                nzo_id = body.get("nzo_id", "")
                url = f"{base}/api?mode={mode}&output=json&apikey={key}"
                if name:
                    url += f"&name={name}"
                if nzo_id:
                    url += f"&value={nzo_id}"
                async with http.get(url) as r:
                    return web.json_response({"ok": r.status == 200})

        # ════════════════════════════════════════════
        # Radarr
        # ════════════════════════════════════════════
        elif service == "radarr":
            base = cfg.get(CONF_RADARR_URL, "")
            hdrs = {"X-Api-Key": cfg.get(CONF_RADARR_KEY, "")}

            if path == "movies":
                async with http.get(f"{base}/api/v3/movie", headers=hdrs) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "profiles":
                async with http.get(
                    f"{base}/api/v3/qualityprofile", headers=hdrs
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "queue":
                async with http.get(
                    f"{base}/api/v3/queue?includeMovie=false&pageSize=100",
                    headers=hdrs,
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            # Interactive Search — live dotaz na všechny indexery (může trvat 10–60s)
            if path == "release" and method == "GET":
                movie_id = request.query.get("movieId", "")
                if not movie_id:
                    return web.json_response({"error": "movieId required"}, status=400)
                timeout = aiohttp.ClientTimeout(total=120)
                async with http.get(
                    f"{base}/api/v3/release",
                    headers=hdrs,
                    params={"movieId": movie_id},
                    timeout=timeout,
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            # Přidá film do Radarru (unmonitored, pro IS u filmů mimo knihovnu)
            if path == "movie" and method == "POST":
                body = await request.json()
                async with http.post(
                    f"{base}/api/v3/movie",
                    headers={**hdrs, "Content-Type": "application/json"},
                    json=body,
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            # Smaže film z knihovny
            if path.startswith("movie/") and method == "DELETE":
                movie_id = path.split("/", 1)[1]
                delete_files = request.query.get("deleteFiles", "false")
                async with http.delete(
                    f"{base}/api/v3/movie/{movie_id}",
                    headers=hdrs,
                    params={"deleteFiles": delete_files, "addImportListExclusion": "false"},
                ) as r:
                    return web.Response(body=await r.read(), content_type="application/json", status=r.status)

            # Grab — stáhne konkrétní release do download klienta
            if path == "release" and method == "POST":
                body = await request.json()
                async with http.post(
                    f"{base}/api/v3/release",
                    headers={**hdrs, "Content-Type": "application/json"},
                    json=body,
                ) as r:
                    body_bytes = await r.read()
                    # Vracíme skutečné tělo odpovědi pro debugging
                    return web.Response(
                        body=body_bytes,
                        content_type="application/json",
                        status=r.status,
                    )

        # ════════════════════════════════════════════
        # Sonarr
        # ════════════════════════════════════════════
        elif service == "sonarr":
            base = cfg.get(CONF_SONARR_URL, "")
            hdrs = {"X-Api-Key": cfg.get(CONF_SONARR_KEY, "")}

            if path == "profiles":
                async with http.get(
                    f"{base}/api/v3/qualityprofile", headers=hdrs
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "series":
                async with http.get(f"{base}/api/v3/series", headers=hdrs) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "calendar":
                # Přepošli query parametry (start, end) z karty
                params = {**dict(request.query), "includeSeries": "true", "unmonitored": "false"}
                async with http.get(
                    f"{base}/api/v3/calendar", headers=hdrs, params=params
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "episodes" and method == "GET":
                params = {"seriesId": request.query.get("seriesId", "")}
                if request.query.get("seasonNumber"):
                    params["seasonNumber"] = request.query["seasonNumber"]
                async with http.get(f"{base}/api/v3/episode", headers=hdrs, params=params) as r:
                    return web.Response(body=await r.read(), content_type="application/json", status=r.status)

            if path == "release" and method == "GET":
                timeout = aiohttp.ClientTimeout(total=120)
                params = {k: v for k, v in request.query.items()}
                async with http.get(f"{base}/api/v3/release", headers=hdrs, params=params, timeout=timeout) as r:
                    return web.Response(body=await r.read(), content_type="application/json", status=r.status)

            if path == "release" and method == "POST":
                body = await request.json()
                async with http.post(f"{base}/api/v3/release", headers={**hdrs, "Content-Type": "application/json"}, json=body) as r:
                    return web.Response(body=await r.read(), content_type="application/json", status=r.status)

            if path == "history" and method == "GET":
                series_id = request.query.get("seriesId", "")
                async with http.get(f"{base}/api/v3/history/series", headers=hdrs, params={"seriesId": series_id, "pageSize": "200"}) as r:
                    return web.Response(body=await r.read(), content_type="application/json", status=r.status)

            # Smaže seriál z knihovny
            if path.startswith("series/") and method == "DELETE":
                series_id = path.split("/", 1)[1]
                delete_files = request.query.get("deleteFiles", "false")
                async with http.delete(
                    f"{base}/api/v3/series/{series_id}",
                    headers=hdrs,
                    params={"deleteFiles": delete_files},
                ) as r:
                    return web.Response(body=await r.read(), content_type="application/json", status=r.status)

        # ════════════════════════════════════════════
        # Overseerr
        # ════════════════════════════════════════════
        elif service == "overseerr":
            base = cfg.get(CONF_SEERR_URL, "")
            hdrs = {
                "X-Api-Key": cfg.get(CONF_SEERR_KEY, ""),
                "Accept": "application/json",
            }

            if path == "upcoming":
                page = request.query.get("page", "1")
                async with http.get(
                    f"{base}/api/v1/discover/movies/upcoming?page={page}",
                    headers=hdrs,
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "popular":
                page = request.query.get("page", "1")
                async with http.get(
                    f"{base}/api/v1/discover/movies?page={page}",
                    headers=hdrs,
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "trending":
                page = request.query.get("page", "1")
                async with http.get(
                    f"{base}/api/v1/discover/trending?page={page}",
                    headers=hdrs,
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "tv_upcoming":
                page = request.query.get("page", "1")
                async with http.get(
                    f"{base}/api/v1/discover/tv/upcoming?page={page}",
                    headers=hdrs,
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "radarr_settings":
                async with http.get(
                    f"{base}/api/v1/settings/radarr", headers=hdrs
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "sonarr_settings":
                async with http.get(
                    f"{base}/api/v1/settings/sonarr", headers=hdrs
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path.startswith("movie/") or path.startswith("tv/"):
                async with http.get(
                    f"{base}/api/v1/{path}", headers=hdrs
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "pending":
                async with http.get(
                    f"{base}/api/v1/request?filter=pending&take=20",
                    headers=hdrs,
                ) as r:
                    data = await r.json()

                # Obohaťte každý request o posterPath + title z Overseerr media endpointu
                async def _enrich(req: dict) -> None:
                    media = req.get("media") or {}
                    tmdb_id = media.get("tmdbId")
                    if not tmdb_id:
                        return
                    # Přeskočit pokud už máme obě pole
                    if media.get("posterPath") and media.get("title"):
                        return
                    ep = "movie" if req.get("type") == "movie" else "tv"
                    try:
                        async with http.get(
                            f"{base}/api/v1/{ep}/{tmdb_id}", headers=hdrs
                        ) as mr:
                            if mr.status == 200:
                                detail = await mr.json()
                                media.setdefault("posterPath",   detail.get("posterPath"))
                                media.setdefault("title",        detail.get("title") or detail.get("name"))
                                media.setdefault("originalTitle", detail.get("originalTitle") or detail.get("originalName"))
                    except Exception:
                        pass

                await asyncio.gather(*[_enrich(r) for r in (data.get("results") or [])])
                return web.json_response(data)

            # Pending requesty family účtu (přes session cookie) — pro non-admin kartu
            if path == "my_pending":
                if not self._cfg.get(CONF_SEERR_FAMILY_EMAIL):
                    return web.json_response({"results": []})
                try:
                    params = {"filter": "all", "take": "100"}
                    hdrs_json = {"Accept": "application/json"}
                    fs = await self._seerr_family_sess()
                    async with fs.get(
                        f"{base}/api/v1/request",
                        params=params,
                        headers=hdrs_json,
                    ) as r:
                        if r.status == 401:
                            await self._seerr_family_login(fs)
                            async with fs.get(
                                f"{base}/api/v1/request",
                                params=params,
                                headers=hdrs_json,
                            ) as r2:
                                if r2.status == 200:
                                    return web.Response(body=await r2.read(),
                                                        content_type="application/json")
                                return web.json_response({"results": []})
                        if r.status == 200:
                            return web.Response(body=await r.read(),
                                                content_type="application/json")
                        return web.json_response({"results": []})
                except Exception:
                    return web.json_response({"results": []})

            if path == "request_delete" and method == "POST":
                body = await request.json()
                req_id = body.get("requestId")
                async with http.delete(
                    f"{base}/api/v1/request/{req_id}", headers=hdrs
                ) as r:
                    return web.json_response({"ok": r.status in (200, 204)})

            if path == "approve" and method == "POST":
                body = await request.json()
                req_id = body.get("requestId")
                async with http.post(
                    f"{base}/api/v1/request/{req_id}/approve",
                    headers=hdrs,
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "decline" and method == "POST":
                body = await request.json()
                req_id = body.get("requestId")
                async with http.post(
                    f"{base}/api/v1/request/{req_id}/decline",
                    headers=hdrs,
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

            if path == "request" and method == "POST":
                body = await request.json()
                user_mode = body.pop("userMode", None)

                # Rodinný účet — použij session cookie místo admin API klíče
                if user_mode == "family" and self._cfg.get(CONF_SEERR_FAMILY_EMAIL):
                    fs = await self._seerr_family_sess()
                    async with fs.post(
                        f"{base}/api/v1/request",
                        json=body,
                        headers={"Accept": "application/json", "Content-Type": "application/json"},
                    ) as r:
                        if r.status == 401:
                            # Session vypršela — znovu se přihlásit a zkusit
                            await self._seerr_family_login(fs)
                            async with fs.post(
                                f"{base}/api/v1/request",
                                json=body,
                                headers={"Accept": "application/json", "Content-Type": "application/json"},
                            ) as r2:
                                return web.Response(
                                    body=await r2.read(),
                                    content_type="application/json",
                                    status=r2.status,
                                )
                        return web.Response(
                            body=await r.read(),
                            content_type="application/json",
                            status=r.status,
                        )

                # Admin — použij API klíč (auto-approve)
                async with http.post(
                    f"{base}/api/v1/request",
                    headers={**hdrs, "Content-Type": "application/json"},
                    json=body,
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

        # ════════════════════════════════════════════
        # Bazarr (volitelný)
        # ════════════════════════════════════════════
        elif service == "bazarr":
            base = cfg.get(CONF_BAZARR_URL, "")
            if not base:
                return web.json_response({"data": []})
            hdrs = {
                "X-API-KEY": cfg.get(CONF_BAZARR_KEY, ""),
                "Accept": "application/json",
            }

            if path == "movies":
                async with http.get(
                    f"{base}/api/movies?start=0&length=500", headers=hdrs
                ) as r:
                    return web.Response(
                        body=await r.read(),
                        content_type="application/json",
                        status=r.status,
                    )

        return web.json_response({"error": "unknown service or path"}, status=404)
