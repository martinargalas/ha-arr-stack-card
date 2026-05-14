"""Arr Stack — HTTP proxy integrace pro arr-stack-card."""
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir

from .const import DOMAIN
from .views import ArrStackProxyView


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    hass.data.setdefault(DOMAIN, {})

    # Aktualizuj config — view ho čte dynamicky, žádný restart není potřeba
    hass.data[DOMAIN]["config"] = dict(entry.data)

    # View zaregistruj jen jednou (hass.data se maže při restartu HA)
    if not hass.data[DOMAIN].get("view_registered"):
        hass.http.register_view(ArrStackProxyView(hass))
        hass.data[DOMAIN]["view_registered"] = True

    # Po restartu smažeme případný starý repair issue
    ir.async_delete_issue(hass, DOMAIN, "restart_required")

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    return True
