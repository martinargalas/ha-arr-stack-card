"""Config flow — 3 kroky s ověřením přístupu ke každé službě."""
import aiohttp
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.helpers import issue_registry as ir
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


# ── Validační pomocné funkce ─────────────────────────────────────────────────

async def _test_qbit(session: aiohttp.ClientSession, url: str, user: str, password: str) -> str | None:
    """Vrátí None pokud OK nebo URL je prázdná, jinak popis chyby."""
    if not url:
        return None
    try:
        async with session.post(
            f"{url.rstrip('/')}/api/v2/auth/login",
            data={"username": user, "password": password},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as r:
            text = await r.text()
            if text.strip() == "Ok.":
                return None
            if text.strip() == "Fails.":
                return "qbit_bad_credentials"
            return "qbit_login_failed"
    except aiohttp.ClientConnectorError:
        return "cannot_connect"
    except Exception:
        return "unknown"


async def _test_sabnzbd(session: aiohttp.ClientSession, url: str, key: str) -> str | None:
    """Vrátí None pokud OK nebo URL je prázdná, jinak popis chyby."""
    if not url:
        return None
    try:
        async with session.get(
            f"{url.rstrip('/')}/api",
            params={"mode": "version", "output": "json", "apikey": key},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as r:
            if r.status == 200:
                data = await r.json()
                if data.get("version"):
                    return None
            return "sabnzbd_bad_key"
    except aiohttp.ClientConnectorError:
        return "cannot_connect"
    except Exception:
        return "unknown"


async def _test_arr(session: aiohttp.ClientSession, url: str, key: str, name: str) -> str | None:
    """Společný test pro Radarr a Sonarr přes /api/v3/system/status."""
    try:
        async with session.get(
            f"{url.rstrip('/')}/api/v3/system/status",
            headers={"X-Api-Key": key},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as r:
            if r.status == 200:
                return None
            if r.status == 401:
                return f"{name}_bad_key"
            return f"{name}_error"
    except aiohttp.ClientConnectorError:
        return "cannot_connect"
    except Exception:
        return "unknown"


async def _test_overseerr(session: aiohttp.ClientSession, url: str, key: str) -> str | None:
    try:
        async with session.get(
            f"{url.rstrip('/')}/api/v1/settings/about",
            headers={"X-Api-Key": key, "Accept": "application/json"},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as r:
            if r.status == 200:
                return None
            if r.status == 401:
                return "overseerr_bad_key"
            return "overseerr_error"
    except aiohttp.ClientConnectorError:
        return "cannot_connect"
    except Exception:
        return "unknown"


async def _test_overseerr_family(
    session: aiohttp.ClientSession, url: str, email: str, password: str
) -> str | None:
    """Ověří přihlášení rodinného účtu a zkontroluje, že nemá admin práva."""
    if not email or not password:
        return None  # volitelné pole — přeskočit
    try:
        async with session.post(
            f"{url.rstrip('/')}/api/v1/auth/local",
            json={"email": email, "password": password},
            headers={"Accept": "application/json"},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as r:
            if r.status == 403 or r.status == 401:
                return "seerr_family_bad_credentials"
            if r.status != 200:
                return "seerr_family_login_failed"
            data = await r.json()
            # permissions: 2 = admin, zkontrolujeme bit
            if data.get("permissions", 0) & 2:
                return "seerr_family_is_admin"
            return None
    except aiohttp.ClientConnectorError:
        return "cannot_connect"
    except Exception:
        return "unknown"


async def _test_bazarr(session: aiohttp.ClientSession, url: str, key: str) -> str | None:
    """Volitelný Bazarr — prázdná URL se přeskočí."""
    if not url:
        return None
    try:
        async with session.get(
            f"{url.rstrip('/')}/api/system/status",
            headers={"X-API-KEY": key, "Accept": "application/json"},
            timeout=aiohttp.ClientTimeout(total=8),
        ) as r:
            if r.status == 200:
                return None
            if r.status == 401:
                return "bazarr_bad_key"
            return "bazarr_error"
    except aiohttp.ClientConnectorError:
        return "cannot_connect"
    except Exception:
        return "unknown"


# ── Config Flow ──────────────────────────────────────────────────────────────

class ArrStackConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Multi-step config flow s ověřením přístupu."""

    VERSION = 1

    def __init__(self):
        self._data: dict = {}
        self._reconfigure_entry = None

    async def async_step_reconfigure(self, user_input=None):
        """Vstupní bod pro přenastavení existující integrace."""
        self._reconfigure_entry = self._get_reconfigure_entry()
        self._data = dict(self._reconfigure_entry.data)
        return await self.async_step_user()

    # ── Krok 1: qBittorrent + SABnzbd (volitelné) ────────────────────────────

    async def async_step_user(self, user_input=None):
        errors = {}

        if user_input is not None:
            session = async_get_clientsession(self.hass)

            err = await _test_qbit(
                session,
                user_input.get(CONF_QBIT_URL, ""),
                user_input.get(CONF_QBIT_USER, ""),
                user_input.get(CONF_QBIT_PASS, ""),
            )
            if err:
                errors[CONF_QBIT_URL] = err
            else:
                err = await _test_sabnzbd(
                    session,
                    user_input.get(CONF_SAB_URL, ""),
                    user_input.get(CONF_SAB_KEY, ""),
                )
                if err:
                    errors[CONF_SAB_URL] = err

            if not errors:
                for key in [CONF_QBIT_URL, CONF_QBIT_USER, CONF_QBIT_PASS, CONF_SAB_URL, CONF_SAB_KEY]:
                    self._data[key] = user_input.get(key, "")
                return await self.async_step_media()

        schema = vol.Schema({
            vol.Optional(CONF_QBIT_URL):  str,
            vol.Optional(CONF_QBIT_USER): str,
            vol.Optional(CONF_QBIT_PASS): str,
            vol.Optional(CONF_SAB_URL):   str,
            vol.Optional(CONF_SAB_KEY):   str,
        })
        if self._data:
            schema = self.add_suggested_values_to_schema(schema, self._data)
        return self.async_show_form(
            step_id="user",
            data_schema=schema,
            errors=errors,
            description_placeholders={"step": "1/3 — Stahování (volitelné)"},
        )

    # ── Krok 2: Radarr + Sonarr (povinné) ────────────────────────────────────

    async def async_step_media(self, user_input=None):
        errors = {}

        if user_input is not None:
            session = async_get_clientsession(self.hass)

            err = await _test_arr(session, user_input[CONF_RADARR_URL], user_input[CONF_RADARR_KEY], "radarr")
            if err:
                errors[CONF_RADARR_URL] = err
            else:
                err = await _test_arr(session, user_input[CONF_SONARR_URL], user_input[CONF_SONARR_KEY], "sonarr")
                if err:
                    errors[CONF_SONARR_URL] = err

            if not errors:
                self._data.update(user_input)
                return await self.async_step_discovery()

        schema = vol.Schema({
            vol.Required(CONF_RADARR_URL): str,
            vol.Required(CONF_RADARR_KEY): str,
            vol.Required(CONF_SONARR_URL): str,
            vol.Required(CONF_SONARR_KEY): str,
        })
        suggested = self._data if self._data else {
            CONF_RADARR_URL: "http://192.168.1.x:7878",
            CONF_SONARR_URL: "http://192.168.1.x:8989",
        }
        schema = self.add_suggested_values_to_schema(schema, suggested)
        return self.async_show_form(
            step_id="media",
            data_schema=schema,
            errors=errors,
            description_placeholders={"step": "2/3 — Správa médií"},
        )

    # ── Krok 3: Overseerr (povinný) + family účet + Bazarr (volitelné) ───────

    async def async_step_discovery(self, user_input=None):
        errors = {}

        if user_input is not None:
            session = async_get_clientsession(self.hass)

            err = await _test_overseerr(session, user_input[CONF_SEERR_URL], user_input[CONF_SEERR_KEY])
            if err:
                errors[CONF_SEERR_URL] = err
            else:
                err = await _test_overseerr_family(
                    session,
                    user_input[CONF_SEERR_URL],
                    user_input.get(CONF_SEERR_FAMILY_EMAIL, ""),
                    user_input.get(CONF_SEERR_FAMILY_PASS, ""),
                )
                if err:
                    errors[CONF_SEERR_FAMILY_EMAIL] = err
                else:
                    err = await _test_bazarr(
                        session,
                        user_input.get(CONF_BAZARR_URL, ""),
                        user_input.get(CONF_BAZARR_KEY, ""),
                    )
                    if err:
                        errors[CONF_BAZARR_URL] = err

            if not errors:
                self._data.update(user_input)
                for key in [CONF_SEERR_FAMILY_EMAIL, CONF_SEERR_FAMILY_PASS, CONF_BAZARR_URL, CONF_BAZARR_KEY]:
                    self._data[key] = user_input.get(key, "")
                if self._reconfigure_entry is not None:
                    self.hass.config_entries.async_update_entry(
                        self._reconfigure_entry, data=dict(self._data)
                    )
                    await self.hass.config_entries.async_reload(
                        self._reconfigure_entry.entry_id
                    )
                    return self.async_abort(reason="reconfigure_successful")
                return self.async_create_entry(title="Arr Stack", data=self._data)

        schema = vol.Schema({
            vol.Required(CONF_SEERR_URL):          str,
            vol.Required(CONF_SEERR_KEY):          str,
            vol.Optional(CONF_SEERR_FAMILY_EMAIL): str,
            vol.Optional(CONF_SEERR_FAMILY_PASS):  str,
            vol.Optional(CONF_BAZARR_URL):         str,
            vol.Optional(CONF_BAZARR_KEY):         str,
        })
        suggested = self._data if self._data else {CONF_SEERR_URL: "http://192.168.1.x:5055"}
        schema = self.add_suggested_values_to_schema(schema, suggested)
        return self.async_show_form(
            step_id="discovery",
            data_schema=schema,
            errors=errors,
            description_placeholders={"step": "3/3 — Vyhledávání a titulky"},
        )
