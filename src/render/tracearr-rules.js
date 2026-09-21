import { _sevTone } from './tracearr-table.js';
import { _ICO_CHECK } from './mt-kit.js';

// Tracearr, the Rules and Violations tabs: the rule list, templates and the rule form. Split out of render/tracearr-table.js.

class _TracearrRulesMethods {

  // ──────────────────────────────────────────────────────────────────────────
  // Rules tab
  // ──────────────────────────────────────────────────────────────────────────

  _traBodyRules() {
    const m = this._tracearrModal;
    const rules = m.rulesData || [];
    const isMob = this._isMob;
    const _day = this._isDay;
    const _btnClr = _day ? '#000' : '#fff';

    const CLASSIC_LABELS = {
      concurrent_streams:     this._t('traRtConcurrent'),
      geo_restriction:        this._t('traRtGeo'),
      impossible_travel:      this._t('traRtImpossible'),
      simultaneous_locations: this._t('traRtSimLoc'),
      device_velocity:        this._t('traRtVelocity'),
      account_inactivity:     this._t('traRtInactivity'),
    };

    const _sc = s => ({ high: '#FF3B30', warning: '#FF9500', low: '#34C759' }[s] || '#FF9500');
    const _sb = s => ({ high: 'rgba(255,59,48,0.16)', warning: 'rgba(255,149,0,0.14)', low: 'rgba(52,199,89,0.14)' }[s] || 'rgba(255,149,0,0.14)');

    const rows = rules.map(r => {
      const rid = this._escHtml(r.id ?? '');
      const typeLabel = r.type ? (CLASSIC_LABELS[r.type] || r.type) : this._t('traCustom');
      const sev = String(r.severity || 'warning').toLowerCase();
      const toggle = this._uiSwitch(`data-tra-rule-toggle="${rid}" data-active="${r.isActive === true}"`, r.isActive, r.isActive ? this._t('pwDisable') : this._t('pwEnable'));
      // Edit has no button of its own: the row's title already opens the editor,
      // so a pencil beside it only repeated the same action.
      const TRASH = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
      const CHECK = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="20 6 9 17 4 12"/></svg>`;
      const CROSS = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      // Confirmed in place rather than through a browser dialog, as in Maintainerr.
      const delBtn = (m.traRuleDelId === r.id)
        ? `<span style="display:flex;gap:4px;flex-shrink:0">
             ${this._mtRoundBtn(`data-tra-rule-del-yes="${rid}"`, CHECK, this._t('tlDelete'), { size: 26, tone: 'red' })}
             ${this._mtRoundBtn('data-tra-rule-del-no', CROSS, this._t('cancel'), { size: 26, tone: 'blue' })}
           </span>`
        : this._mtRoundBtn(`data-tra-rule-del="${rid}"`, TRASH, this._t('tlDelete'), { size: 26, tone: 'red' });
      const desc = r.description ? `<div style="font-size:10px;color:var(--is-text-muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(r.description)}</div>` : '';
      const classicBadge = this._uiBadge(this._escHtml(typeLabel), 'neutral', { extra: 'flex-shrink:0' });
      return `<div style="display:flex;align-items:center;gap:${isMob?'7px':'10px'};padding:9px 0;border-top:1px solid var(--is-divider)">
        ${toggle}
        <div data-tra-rule-edit="${rid}" style="flex:1;min-width:0;cursor:pointer">
          <div style="font-size:12px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(r.name ?? '')}</div>
          ${desc}
        </div>
        ${this._uiBadge(this._escHtml(sev.toUpperCase()), _sevTone(sev), { extra: 'flex-shrink:0' })}
        ${isMob ? '' : classicBadge}
        ${delBtn}
      </div>`;
    }).join('') || `<div style="font-size:12px;color:var(--is-text-muted);padding:28px 0;text-align:center">${this._t('traNoRules')}</div>`;

    const menuSt = `position:absolute;top:32px;right:0;background:#1c1c2e;border:1px solid rgba(255,255,255,0.14);border-radius:8px;padding:4px;min-width:140px;z-index:200`;
    const menuItemSt = `display:block;width:100%;text-align:left;padding:6px 10px;font-size:12px;font-weight:500;color:#fff;background:transparent;border:none;cursor:pointer;border-radius:5px`;
    // The + itself lives in the modal header now, as it does in Maintainerr;
    // what stays here is the little menu it drops, anchored to the row.
    const addMenu = `<div style="position:relative;display:inline-block" id="tra-rules-add-wrap">
      <div id="tra-rules-add-menu" style="${menuSt};display:none">
        <button data-tra-rule-new="classic" style="${menuItemSt}">${this._t('traClassicRule')}</button>
        <button data-tra-rule-new="custom" style="${menuItemSt}">${this._t('traCustomRule')}</button>
      </div>
    </div>`;

    return `<div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;font-weight:700;color:var(--is-text-label);text-transform:uppercase;letter-spacing:.06em">${this._t(rules.length !== 1 ? 'traRulesN' : 'traRules1').replace('{n}', rules.length)}</span>
        ${isMob ? '' : addMenu}
      </div>
      <div id="tra-rules-list">${rows}</div>
    </div>`;
  }

  _traRuleTemplatePicker() {
    const isMob = this._isMob;
    const TEMPLATES = [
      { id: 'concurrent_streams',    name: this._t('traRtConcurrent'),     desc: this._t('traRdConcurrent'),
        icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
      { id: 'geo_restriction',       name: this._t('traRtGeo'),         desc: this._t('traRdGeo'),
        icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
      { id: 'impossible_travel',     name: this._t('traRtImpossible'),       desc: this._t('traRdImpossible'),
        icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' },
      { id: 'simultaneous_locations',name: this._t('traRtSimLoc'),  desc: this._t('traRdSimLoc'),
        icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
      { id: 'device_velocity',       name: this._t('traRtVelocity'),         desc: this._t('traRdVelocity'),
        icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
      { id: 'account_inactivity',    name: this._t('traRtInactivity'),      desc: this._t('traRdInactivity'),
        icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
    ];
    const btnSt = `display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 14px;margin-bottom:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;cursor:pointer;color:var(--is-text,#fff);transition:background .12s`;
    const rows = TEMPLATES.map(t =>
      `<button data-tra-rule-template="${t.id}" style="${btnSt}">
        <span style="width:32px;height:32px;border-radius:8px;background:rgba(0,122,255,0.1);border:1px solid rgba(0,122,255,0.2);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(0,122,255,0.8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg></span>
        <div style="min-width:0">
          <div style="font-size:13px;font-weight:600;margin-bottom:2px">${t.name}</div>
          <div style="font-size:11px;color:var(--is-text-muted)">${t.desc}</div>
        </div>
      </button>`
    ).join('');
    return `<div style="max-width:480px;margin:0 auto">
      <div style="font-size:14px;font-weight:700;color:var(--is-text);margin-bottom:4px">${this._t('traChooseTemplate')}</div>
      <div style="font-size:11px;color:var(--is-text-muted);margin-bottom:14px">${this._t('traChooseTemplateSub')}</div>
      ${rows}
      <!-- Going back is the header's close button while a rule is being made,
           so the picker needs no button of its own — this is only the hook. -->
      <button id="tra-rf-cancel" style="display:none"></button>
    </div>`;
  }

  _traRuleFormHtml(ruleType, existingRule, templateType) {
    const isMob    = this._isMob;
    // Fields wear the shared .mt-field capsule; these are only the widths the
    // form needs on top of it.
    const inputSt  = `width:100%`;
    const selectSt = inputSt;
    const labelSt  = `display:block;font-size:10px;font-weight:700;color:var(--is-text-label);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px`;

    const isEdit   = !!existingRule;
    const isCustom = existingRule ? !existingRule.type : ruleType === 'custom';
    const ruleId   = existingRule?.id || '';

    // Always show conditions builder
    const showConditions = true;

    const CLASSIC_TYPES = [
      ['concurrent_streams',    this._t('traRtConcurrent')],
      ['geo_restriction',       this._t('traRtGeo')],
      ['impossible_travel',     this._t('traRtImpossible')],
      ['simultaneous_locations',this._t('traRtSimLoc')],
      ['device_velocity',       this._t('traRtVelocity')],
      ['account_inactivity',    this._t('traRtInactivity')],
    ];
    const TEMPLATE_DEFAULTS = {
      concurrent_streams:     { name: this._t('traRnConcurrent'),    desc: this._t('traRdConcurrent') },
      geo_restriction:        { name: this._t('traRnGeo'),          desc: this._t('traRdGeo') },
      impossible_travel:      { name: this._t('traRnImpossible'), desc: this._t('traRdImpossible') },
      simultaneous_locations: { name: this._t('traRtSimLoc'),     desc: this._t('traRdSimLoc') },
      device_velocity:        { name: this._t('traRnVelocity'),      desc: this._t('traRdVelocity') },
      account_inactivity:     { name: this._t('traRnInactivity'), desc: this._t('traRdInactivity') },
    };
    const FIELDS = [
      ['concurrent_streams',     this._t('traRtConcurrent')],
      ['travel_speed_kmh',       this._t('traFSpeed')],
      ['active_session_distance',this._t('traFDistance')],
      ['unique_ips_window',      this._t('traFUniqIps')],
      ['unique_devices_window',  this._t('traFUniqDev')],
      ['inactive_days',          this._t('traFInactiveDays')],
      ['current_pause_duration', this._t('traFCurPause')],
      ['total_pause_duration',   this._t('traFTotalPause')],
    ];
    // fields that support uniqueDevices / uniqueIPs params
    const FIELDS_WITH_UNIQUE = new Set(['concurrent_streams','travel_speed_kmh','active_session_distance','unique_ips_window','unique_devices_window']);
    const OPS = [
      ['gt','greater than'],['gte','at least'],
      ['lt','less than'],   ['lte','at most'],
      ['eq','equals'],      ['neq','not equals'],
    ];
    const ACTIONS = [
      ['log_only',          this._t('traALog')],
      ['send_notification', this._t('traANotify')],
      ['kill_stream',       this._t('traAKill')],
      ['adjust_trust_score',this._t('traAAdjust')],
      ['set_trust_score',   this._t('traASet')],
      ['reset_trust_score', this._t('traAReset')],
      ['message_client',    this._t('traAMessage')],
    ];
    const ACTION_MSG_LABEL = {
      log_only:          this._t('traMLog'),
      send_notification: this._t('traMMsg'),
      kill_stream:       this._t('traMKill'),
      message_client:    this._t('traMMsg'),
    };
    const ACTION_DESC = {
      log_only:          this._t('traDLog'),
      send_notification: this._t('traDNotify'),
      kill_stream:       this._t('traDKill'),
      adjust_trust_score:this._t('traDAdjust'),
      set_trust_score:   this._t('traDSet'),
      reset_trust_score: this._t('traDReset'),
      message_client:    this._t('traDMessage'),
    };

    const TEMPLATE_CONDITIONS = {
      concurrent_streams:     [{ conditions: [{ field: 'concurrent_streams',     operator: 'gt',  value: 3,   params: { uniqueDevices: true,  uniqueIPs: false } }] }],
      impossible_travel:      [{ conditions: [{ field: 'travel_speed_kmh',       operator: 'gt',  value: 500, params: { uniqueDevices: true,  uniqueIPs: false } }] }],
      simultaneous_locations: [{ conditions: [{ field: 'active_session_distance',operator: 'gt',  value: 100, params: { uniqueDevices: true,  uniqueIPs: false } }] }],
      device_velocity:        [{ conditions: [{ field: 'unique_ips_window',      operator: 'gt',  value: 3  } ] }],
      account_inactivity:     [{ conditions: [{ field: 'inactive_days',          operator: 'gt',  value: 30 } ] }],
    };

    const tplDef    = TEMPLATE_DEFAULTS[templateType] || {};
    const curType   = existingRule?.type || templateType || CLASSIC_TYPES[0][0];
    const curName   = String(existingRule?.name || tplDef.name || '');
    const curDesc   = String(existingRule?.description || tplDef.desc || '');
    const curSev    = existingRule?.severity || 'warning';
    const curActive = existingRule ? existingRule.isActive !== false : true;

    const _opt = (arr, cur) => arr.map(([v,l]) => `<option value="${v}"${v===cur?' selected':''}>${l}</option>`).join('');

    const activeToggle = this._uiSwitch('id="tra-rf-active-toggle" data-active="' + curActive + '"', curActive, curActive ? this._t('pwDisable') : this._t('pwEnable'));

    const classicTypeField = '';
    const classicParams = '';

    // Condition row — includes Unique devices/IPs checkboxes for relevant fields
    const condRow = (gi, ci, cond) => {
      const field   = cond?.field || 'concurrent_streams';
      const fSel    = FIELDS.map(([v,l]) => `<option value="${v}"${v===field?' selected':''}>${l}</option>`).join('');
      const oSel    = OPS.map(([v,l]) => `<option value="${v}"${v===(cond?.operator||'gt')?' selected':''}>${l}</option>`).join('');
      const val     = cond?.value ?? 2;
      const hasUniq = FIELDS_WITH_UNIQUE.has(field);
      const uDev    = cond?.params?.uniqueDevices ?? (field === 'concurrent_streams');
      const uIP     = cond?.params?.uniqueIPs ?? false;
      const _c = (cls, on, lbl) => `<label class="mt-chk">
        <input type="checkbox" class="${cls}"${on ? ' checked' : ''}>
        <span class="mt-chk-box">${_ICO_CHECK}</span>
        <span class="mt-chk-lbl">${lbl}</span>
      </label>`;
      const uniqHtml = hasUniq
        ? _c('tra-cond-uniq-dev', uDev, this._t('traUniqDevices')) + _c('tra-cond-uniq-ip', uIP, this._t('traUniqIps'))
        : '';
      const trashSvg = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
      return `<div class="tra-cr" data-grp="${gi}" data-row="${ci}" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;align-items:center">
        ${this._mtFieldSelectRaw('class="tra-cond-field"', fSel, FIELDS.find(([v]) => v === field)?.[1] || '', 'flex:2;min-width:130px')}
        ${this._mtFieldSelectRaw('class="tra-cond-op"', oSel, OPS.find(([v]) => v === (cond?.operator || 'gt'))?.[1] || '', 'flex:1.2;min-width:100px')}
        <input class="tra-cond-val mt-field" type="number" value="${this._escHtml(val)}" style="width:76px;flex-shrink:0">
        ${uniqHtml}
        ${this._mtRoundBtn('class="tra-cond-del"', trashSvg, this._t('tlDelete'), { size: 26, tone: 'red' })}
      </div>`;
    };

    const condGroup = (gi, grp) => {
      const conds = grp?.conditions?.length ? grp.conditions : [null];
      const rows  = conds.map((c, ci) => {
        const html = condRow(gi, ci, c);
        return ci === 0 ? html : `<div class="tra-or-label" style="font-size:10px;font-weight:700;color:rgba(0,122,255,0.8);margin:2px 0 6px">OR</div>${html}`;
      }).join('');
      return `<div class="tra-cg" data-grp="${gi}" style="background:rgba(255,255,255,0.03);border:1px solid var(--is-card-bdr,rgba(255,255,255,0.09));border-radius:16px;padding:12px 14px;margin-bottom:8px">
        <div style="font-size:11px;font-weight:600;color:var(--is-text-label);margin-bottom:10px">${this._t('traGroup').replace('{n}', gi+1)} <span style="font-weight:400;font-size:10px;opacity:0.6">${this._t('traGroupOr')}</span></div>
        <div class="tra-cg-rows">${rows}</div>
        <button class="tra-add-or" data-grp="${gi}" style="font-size:11px;color:rgba(0,122,255,0.8);background:transparent;border:none;cursor:pointer;padding:2px 0;margin-top:2px">+ Add <strong>OR</strong> condition</button>
      </div>`;
    };

    const existGroups  = existingRule?.conditions?.groups
      || (!isEdit && templateType && TEMPLATE_CONDITIONS[templateType])
      || [];
    const condGroupsHtml = (existGroups.length ? existGroups : [null]).map((g,i) => condGroup(i, g)).join('');

    // Action row — context-sensitive secondary input
    const actionRow = (idx, act) => {
      const aType   = act?.type || (idx===0?'log_only':'log_only');
      const msgLbl  = ACTION_MSG_LABEL[aType];
      const msgVal  = String(act?.message || act?.logMessage || '');
      const descTxt = ACTION_DESC[aType] || '';
      const msgInput = msgLbl
        ? `<label style="display:flex;align-items:center;gap:6px;flex-basis:100%;min-width:0;font-size:11px;color:var(--is-text-muted);white-space:nowrap;margin-top:6px">
             ${msgLbl}:
             <input class="tra-act-msg mt-field" type="text" value="${this._escHtml(msgVal)}" placeholder="${this._t('traOptMsg')}"
               style="flex:1;min-width:0">
           </label>` : '';
      const trashSvg = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
      return `<div class="tra-act-row" data-idx="${idx}" style="background:rgba(255,255,255,0.03);border:1px solid var(--is-card-bdr,rgba(255,255,255,0.09));border-radius:14px;padding:10px 12px;margin-bottom:6px">
        <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center">
          ${this._mtFieldSelectRaw('class="tra-act-type"', _opt(ACTIONS, aType), ACTIONS.find(([v]) => v === aType)?.[1] || '', 'flex:1;min-width:0')}
          ${this._mtRoundBtn('class="tra-act-del"', trashSvg, this._t('tlDelete'), { size: 26, tone: 'red' })}
          ${msgInput}
        </div>
        ${descTxt ? `<div class="tra-act-desc" style="font-size:10px;color:var(--is-text-muted);margin-top:6px">${descTxt}</div>` : ''}
      </div>`;
    };

    const existActions  = existingRule?.actions?.actions || [];
    const actionsHtml   = (existActions.length ? existActions : [null]).map((a,i) => actionRow(i, a)).join('');

    const condCard = showConditions ? `
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--is-card-bdr,rgba(255,255,255,0.09));border-radius:20px;padding:16px;margin-bottom:12px">
        <div style="font-size:13px;font-weight:700;color:var(--is-text);margin-bottom:2px">${this._t('traConditions')}</div>
        ${isMob ? '' : `<div style="font-size:11px;color:var(--is-text-muted);margin-bottom:12px">${this._t('traCondHelp')}</div>`}
        <div id="tra-rf-conds">${condGroupsHtml}</div>
        <button id="tra-add-and-group" style="font-size:11px;color:rgba(0,122,255,0.8);background:transparent;border:none;cursor:pointer;padding:2px 0">${this._t('traAddAndGroup')}</button>
      </div>` : '';

    const actCard = showConditions ? `
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--is-card-bdr,rgba(255,255,255,0.09));border-radius:20px;padding:16px;margin-bottom:12px">
        <div style="font-size:13px;font-weight:700;color:var(--is-text);margin-bottom:2px">${this._t('traAddActions')}</div>
        ${isMob ? '' : `<div style="font-size:11px;color:var(--is-text-muted);margin-bottom:12px">Optional side-effects when conditions are met. A violation is always created automatically.</div>`}
        <div id="tra-rf-actions">${actionsHtml}</div>
        <button id="tra-add-action" style="font-size:11px;color:rgba(0,122,255,0.8);background:transparent;border:none;cursor:pointer;padding:2px 0">+ Add action</button>
      </div>` : '';

    const title     = isEdit ? this._t('mtEditRule') : this._t(isCustom ? 'traNewCustomRule' : 'traNewClassicRule');
    const saveLabel = isEdit ? this._t('traUpdate') : this._t('traCreate');
    const _day = this._isDay;
    const _btnClr = _day ? '#000' : '#fff';

    return `<div ${ruleId ? `data-rule-id="${this._escHtml(ruleId)}"` : ''}>
      <!-- Flipped to 1 by the first edit; the header's save reads it to decide
           whether there is anything worth writing. -->
      <span id="tra-rf-dirty" data-tra-dirty="0" style="display:none"></span>
      ${classicTypeField}
      <!-- Three columns need width a phone has not got: there the fields take a
           line each and severity with the toggle follow underneath. -->
      <div style="display:grid;grid-template-columns:${isMob ? '1fr' : '1fr 1fr auto'};gap:10px;align-items:end;margin-bottom:12px">
        <div>
          <label style="${labelSt}">Rule Name *</label>
          <input id="tra-rf-name" type="text" value="${this._escHtml(curName)}" placeholder="${this._t('traRuleName')}" class="mt-field" style="${inputSt}">
        </div>
        <div>
          <label style="${labelSt}">${this._t('mtDescription')}</label>
          <input id="tra-rf-description" type="text" value="${this._escHtml(curDesc)}" placeholder="${this._t('mtDescription')}" class="mt-field" style="${inputSt}">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <label style="${labelSt}">${this._t('traSeverity')}</label>
          <div class="u-row-10">
            ${this._mtFieldSelect('tra-rf-severity', [['warning',this._t('traSevWarning')],['high',this._t('traSevHigh')],['low',this._t('traSevLow')]], curSev, 'min-width:110px')}
            ${activeToggle}
            <span style="font-size:11px;color:var(--is-text-muted)">${this._t('mtActive')}</span>
          </div>
        </div>
      </div>
      ${classicParams}
      ${condCard}
      ${actCard}
      <!-- Save and Back sit in the modal header, like Maintainerr's editor.
           These stay as the hooks those header buttons click. -->
      <div style="display:none">
        <button id="tra-rf-cancel">${this._t('cancel')}</button>
        <button id="tra-rf-save">${saveLabel}</button>
      </div>
    </div>`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Violations tab
  // ──────────────────────────────────────────────────────────────────────────

  _traBodyViolations() {
    const m     = this._tracearrModal;
    const viols = m.violsData  || [];
    const total = m.violsTotal || 0;
    const isMob = this._isMob;
    const pp    = this._tlCalcPerPage({ hasFilter: true });
    const pages = Math.max(1, Math.ceil(total / pp));

    const SEVERITIES = ['low','medium','high','critical'];
    const STATUSES   = ['active','resolved','dismissed'];
    const sevLbl  = { low:this._t('traSevLow'), medium:this._t('traSevMedium'), high:this._t('traSevHigh'), critical:this._t('traSevCritical') };
    const statLbl = { active:this._t('mtActive'), resolved:this._t('traResolved'), dismissed:this._t('traDismissed') };
    // Nothing to search here, so the bar carries the two pickers alone.
    // No search here, so the bar has nothing to stretch — the heading takes the
    // row's left half and the pickers hug the right.
    const filters = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-shrink:0">
      <div style="font-size:14px;font-weight:700;color:var(--is-text);flex:1;min-width:0">${this._t('traViolLog')}</div>
      ${this._uiBar('', '', [
        { id: 'tra-viols-sev',  kind: 'status',  value: m.violsSeverity || '', neutral: '',
          items: [['', this._t('traAllSev')], ...SEVERITIES.map(s => [s, sevLbl[s]])] },
        { id: 'tra-viols-stat', kind: 'event',   value: m.violsStatus || '',   neutral: '',
          items: [['', this._t('traAllStatus')], ...STATUSES.map(s => [s, statLbl[s]])] },
      ], [], { style: 'flex:0 0 auto' })}
    </div>`;


    if (!viols.length) {
      return filters + `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:40px 24px;color:var(--is-text-muted)">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div style="font-size:14px;font-weight:600;color:var(--is-text)">${this._t('traNoViols')}</div>
        <div style="font-size:12px">${this._t('traNoViolsSub')}</div>
      </div>`;
    }

    if (isMob) {
      const cards = viols.map(v => {
        const sev  = String(v.severity || 'high');
        const c    = this._traSevColor(sev);
        const bg   = this._traSevBg(sev);
        const type = this._traViolTypeLabel(v.type);
        const user = this._escHtml(v.user?.displayName || v.username || '');
        const when = this._traFmtDate(v.createdAt || v.detectedAt);
        const det  = this._escHtml(v.detail || v.description || '');
        const borderC = c.replace('0.9', '0.5');
        return `<div class="tl-mob-card" style="border-left:3px solid ${borderC}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            ${this._uiBadge(this._escHtml(sev.toUpperCase()), this._hexToRgbTriple(c), { small: true })}
            <span class="tl-mob-name">${type}</span>
          </div>
          <div class="tl-mob-meta">
            ${user ? `<span>${user}</span>` : ''}
            ${det  ? `<span>${det}</span>`  : ''}
            <span>${when}</span>
          </div>
        </div>`;
      }).join('');
      return filters + `<div>${cards}</div>` + this._uiPager('tra-viols-page', m.violsPage, pages);
    }

    const rows = viols.map(v => {
      const sev  = String(v.severity || 'high');
      const c    = this._traSevColor(sev);
      const bg   = this._traSevBg(sev);
      const type = this._traViolTypeLabel(v.type);
      const user = v.user || {};
      const when = this._traFmtDate(v.createdAt || v.detectedAt);
      const det  = this._escHtml(v.detail || v.description || '—');
      return `<tr${sev==='high'?' class="tl-row-warn"':''}>
        <td>${this._uiBadge(this._escHtml(sev.toUpperCase()), this._hexToRgbTriple(c), { small: true })}</td>
        <td class="u-sm-text">${type}</td>
        <td><div style="display:flex;align-items:center;gap:7px">${this._traUserAvatar(v.user,18)}<span style="font-size:11px;color:var(--is-text)">${this._escHtml(user.displayName || user.username || '—')}</span></div></td>
        <td style="font-size:11px;color:var(--is-text-muted);max-width:280px">${det}</td>
        <td style="font-size:11px;color:var(--is-text-muted);white-space:nowrap">${when}</td>
      </tr>`;
    }).join('');

    return filters + `<div style="overflow-x:auto">
      <table class="tl-users-table">
        <thead><tr>
          <th>${this._t('traSeverity')}</th>
          <th>${this._t('tlColType')}</th>
          <th>${this._t('traUser')}</th>
          <th>${this._t('mtDetail')}</th>
          <th>${this._t('traNaposledy')}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>` + this._uiPager('tra-viols-page', m.violsPage, Math.max(1, Math.ceil(total / pp)));
  }

}

export const tracearrRulesMixin = _TracearrRulesMethods.prototype;
