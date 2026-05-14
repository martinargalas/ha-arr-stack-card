"""Repairs flow pro Arr Stack — fixable restart issue."""
from __future__ import annotations

import voluptuous as vol
from homeassistant.components.repairs import RepairsFlow
from homeassistant.core import HomeAssistant


async def async_create_fix_flow(hass: HomeAssistant, issue_id: str, data: dict | None) -> RepairsFlow:
    return RestartRepairFlow()


class RestartRepairFlow(RepairsFlow):
    async def async_step_init(self, user_input: dict | None = None):
        return await self.async_step_confirm()

    async def async_step_confirm(self, user_input: dict | None = None):
        if user_input is not None:
            await self.hass.services.async_call("homeassistant", "restart")
            return self.async_create_entry(title="", data={})
        return self.async_show_form(step_id="confirm", data_schema=vol.Schema({}))
