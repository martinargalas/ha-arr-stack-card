import { _ICO_CHECK } from '../render/mt-kit.js';

// Tracearr, the Rules tab: the rule form, its conditions and actions, saving. Split out of wire/tracearr.js.

class _WireTracearrRulesMethods {

  // Tracearr, the Rules tab: the rule form, its conditions and actions, saving.
  _traWireRules(body, modal) {
    // ── Rules tab ────────────────────────────────────────────────────────

    if (body.querySelector('#tra-rules-add-menu')) {
      body.addEventListener('click', e => {
        if (!e.target.closest('#tra-rules-add-wrap')) {
          const menu = body.querySelector('#tra-rules-add-menu');
          if (menu) menu.style.display = 'none';
        }
      }, { once: false, capture: false });
    }

    body.querySelectorAll('[data-tra-rule-new]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ruleType = btn.dataset.traRuleNew;
        if (ruleType === 'classic') {
          body.innerHTML = this._traRuleTemplatePicker();
        } else {
          body.innerHTML = this._traRuleFormHtml(ruleType);
        }
        this._wireTracearrModalBody(body);
      });
    });

    body.querySelectorAll('[data-tra-rule-template]').forEach(btn => {
      btn.addEventListener('click', () => {
        const templateType = btn.dataset.traRuleTemplate;
        body.innerHTML = this._traRuleFormHtml('classic', null, templateType);
        this._wireTracearrModalBody(body);
      });
    });

    const rfActiveToggle = body.querySelector('#tra-rf-active-toggle');
    if (rfActiveToggle) {
      rfActiveToggle.addEventListener('click', () => {
        const cur = rfActiveToggle.dataset.active === 'true';
        const next = !cur;
        rfActiveToggle.dataset.active = String(next);
        rfActiveToggle.style.background = next ? 'rgba(0,122,255,0.7)' : 'rgba(255,255,255,0.06)';
        rfActiveToggle.style.borderColor = next ? 'rgba(0,122,255,0.8)' : 'rgba(255,255,255,0.12)';
        const knob = rfActiveToggle.querySelector('span');
        if (knob) {
          knob.style.left = next ? '18px' : '4px';
          knob.style.background = next ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)';
        }
      });
    }

    body.querySelectorAll('[data-tra-rule-edit]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id       = btn.dataset.traRuleEdit;
        const fallback = (this._tracearrModal?.rulesData || []).find(r => String(r.id) === String(id));
        btn.disabled   = true;
        btn.style.opacity = '0.5';
        try {
          const res  = await this._traAdminFetch('GET', `v1/rules/${id}`);
          const rule = res?.data || res || fallback;
          if (!rule) return;
          body.innerHTML = this._traRuleFormHtml(rule.type ? 'classic' : 'custom', rule);
          this._wireTracearrModalBody(body);
        } catch {
          if (!fallback) return;
          body.innerHTML = this._traRuleFormHtml(fallback.type ? 'classic' : 'custom', fallback);
          this._wireTracearrModalBody(body);
        }
      });
    });

    const rfType = body.querySelector('#tra-rf-type');
    if (rfType) {
      const _updateClassicParams = () => {
        const t = rfType.value;
        const msWrap = body.querySelector('#tra-rf-max-streams-wrap');
        if (msWrap) msWrap.style.display = t === 'concurrent_streams' ? '' : 'none';
        const rfName = body.querySelector('#tra-rf-name');
        if (rfName && !rfName.value) {
          const LABELS = { concurrent_streams:this._t('traRtConcurrent'), geo_restriction:this._t('traRtGeo'), impossible_travel:this._t('traRtImpossible'), simultaneous_locations:this._t('traRtSimLoc'), device_velocity:this._t('traRtVelocity'), account_inactivity:this._t('traRtInactivity') };
          rfName.placeholder = LABELS[t] || t;
        }
      };
      rfType.addEventListener('change', _updateClassicParams);
      _updateClassicParams();
    }

    body.querySelectorAll('[data-tra-rule-toggle]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.traRuleToggle;
        const cur = btn.dataset.active === 'true';
        btn.style.opacity = '0.5';
        btn.disabled = true;
        try {
          await this._traAdminFetch('PATCH', `v1/rules/${id}`, { isActive: !cur });
          await this._traLoadTab('rules', modal());
        } catch (e) {
          console.error('[arr-card] Rule toggle error:', e);
          btn.style.opacity = '';
          btn.disabled = false;
        }
      });
    });

    // First click arms the row, second confirms — no browser dialog.
    const _rulesRedraw = () => {
      if (!body.querySelector('#tra-rules-list')) return;
      body.innerHTML = this._traBodyRules();
      this._wireTracearrModalBody(body);
    };

    body.querySelectorAll('[data-tra-rule-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tracearrModal) return;
        this._tracearrModal.traRuleDelId = btn.dataset.traRuleDel;
        _rulesRedraw();
      });
    });

    body.querySelector('[data-tra-rule-del-no]')?.addEventListener('click', () => {
      if (!this._tracearrModal) return;
      this._tracearrModal.traRuleDelId = null;
      _rulesRedraw();
    });

    body.querySelector('[data-tra-rule-del-yes]')?.addEventListener('click', async e => {
      const id = e.currentTarget.dataset.traRuleDelYes;
      e.currentTarget.disabled = true;
      try {
        await this._traAdminFetch('DELETE', `v1/rules/${id}`);
        if (this._tracearrModal) this._tracearrModal.traRuleDelId = null;
        await this._traLoadTab('rules', modal());
      } catch (err) {
        console.error('[arr-card] Rule delete error:', err);
        e.currentTarget.disabled = false;
      }
    });

    const rfCancel = body.querySelector('#tra-rf-cancel');
    if (rfCancel) rfCancel.addEventListener('click', () => this._traLoadTab('rules', modal()));

    const rfSave = body.querySelector('#tra-rf-save');
    if (rfSave) {
      rfSave.addEventListener('click', async () => {
        const formEl      = body.querySelector('[data-rule-id]') || body.firstElementChild;
        const editId      = formEl?.dataset?.ruleId || '';
        const isEdit      = !!editId;
        const rfType      = body.querySelector('#tra-rf-type');
        const rfName      = body.querySelector('#tra-rf-name');
        const rfDesc      = body.querySelector('#tra-rf-description');
        const rfSev       = body.querySelector('#tra-rf-severity');
        const rfActToggle = body.querySelector('#tra-rf-active-toggle');
        const hasCondBuilder = !!body.querySelector('#tra-rf-conds');
        const name        = rfName?.value?.trim() || '';
        const description = rfDesc?.value?.trim() || null;
        const severity    = rfSev?.value || 'warning';
        const isActive    = rfActToggle ? rfActToggle.dataset.active !== 'false' : true;
        const origInner   = rfSave.innerHTML;

        rfSave.disabled = true;
        rfSave.textContent = '…';

        try {
          // always use conditions builder (shown for all rules)
          const groups = [];
          body.querySelectorAll('.tra-cg').forEach(grpEl => {
            const conds = [];
            grpEl.querySelectorAll('.tra-cr').forEach(rowEl => {
              const field = rowEl.querySelector('.tra-cond-field')?.value;
              const op    = rowEl.querySelector('.tra-cond-op')?.value;
              const val   = parseFloat(rowEl.querySelector('.tra-cond-val')?.value) || 0;
              const uDev  = rowEl.querySelector('.tra-cond-uniq-dev')?.checked;
              const uIP   = rowEl.querySelector('.tra-cond-uniq-ip')?.checked;
              if (field && op) {
                const cond = { field, operator: op, value: val };
                const uDevEl = rowEl.querySelector('.tra-cond-uniq-dev');
                if (uDevEl) cond.params = { uniqueDevices: !!uDev, uniqueIPs: !!uIP };
                conds.push(cond);
              }
            });
            if (conds.length) groups.push({ conditions: conds });
          });
          const actions = [];
          body.querySelectorAll('.tra-act-row').forEach(rowEl => {
            const type = rowEl.querySelector('.tra-act-type')?.value;
            const msg  = rowEl.querySelector('.tra-act-msg')?.value?.trim() || undefined;
            if (type) actions.push(msg ? { type, message: msg } : { type });
          });
          const payload = { name: name || 'Rule', description, severity, isActive, conditions: { groups }, actions: { actions } };
          if (isEdit) {
            await this._traAdminFetch('PATCH', `v1/rules/${editId}`, payload);
          } else {
            await this._traAdminFetch('POST', 'v1/rules/v2', payload);
          }
          await this._traLoadTab('rules', modal());
        } catch (e) {
          console.error('[arr-card] Rule save error:', e);
          rfSave.disabled = false;
          rfSave.innerHTML = origInner;
        }
      });
    }

    const addAndGroup = body.querySelector('#tra-add-and-group');
    if (addAndGroup) {
      addAndGroup.addEventListener('click', () => {
        const gi = body.querySelectorAll('.tra-cg').length;
        const tmp = document.createElement('div');
        tmp.innerHTML = this._traCondGroupHtml(gi);
        body.querySelector('#tra-rf-conds').appendChild(tmp.firstElementChild);
        this._wireTraCondRow(body);
      });
    }

    const addAction = body.querySelector('#tra-add-action');
    if (addAction) {
      addAction.addEventListener('click', () => {
        const idx = body.querySelectorAll('.tra-act-row').length;
        const tmp = document.createElement('div');
        tmp.innerHTML = this._traActionRowHtml(idx);
        body.querySelector('#tra-rf-actions').appendChild(tmp.firstElementChild);
        this._wireTraCondRow(body);
      });
    }

    this._wireTraCondRow(body);
    this._traRefreshHdrActions(body);

    // First touch of the rule form arms the save button. Re-rendered pieces of
    // the form keep the flag, because it lives on an element of its own.
    const dirtyEl = body.querySelector('#tra-rf-dirty');
    if (dirtyEl && !body._traDirtyWired) {
      body._traDirtyWired = true;
      const mark = e => {
        if (e.target.closest('#tra-hdr-actions')) return;
        const el = body.querySelector('#tra-rf-dirty');
        if (!el || el.dataset.traDirty === '1') return;
        el.dataset.traDirty = '1';
        this._traRefreshHdrActions(body);
      };
      body.addEventListener('input', mark);
      body.addEventListener('change', mark);
      body.addEventListener('click', e => { if (e.target.closest('button,select,label')) mark(e); });
    }
  }
  // ── Rules form helpers ───────────────────────────────────────────────────

  _traCondRowHtml(gi, ci) {
    const FIELDS = [['concurrent_streams',this._t('traRtConcurrent')],['travel_speed_kmh',this._t('traFSpeed')],['active_session_distance',this._t('traFSessDist')],['unique_ips_window',this._t('traFUniqIps')],['unique_devices_window',this._t('traFUniqDev')],['inactive_days',this._t('traFInactiveDays')],['current_pause_duration',this._t('traFPause')],['total_pause_duration',this._t('traFTotalPauseShort')]];
    const OPS    = [['gt','greater than'],['gte','at least'],['lt','less than'],['lte','at most'],['eq','equals'],['neq','not equals']];
    const trash  = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    const _c = (cls, lbl) => `<label class="mt-chk"><input type="checkbox" class="${cls}"><span class="mt-chk-box">${_ICO_CHECK}</span><span class="mt-chk-lbl">${lbl}</span></label>`;
    // default field = concurrent_streams → show unique checkboxes
    return `<div class="tra-cr" data-grp="${gi}" data-row="${ci}" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;align-items:center">
      ${this._mtFieldSelectRaw('class="tra-cond-field"', FIELDS.map(([v,l])=>`<option value="${v}">${l}</option>`).join(''), FIELDS[0][1], 'flex:2;min-width:130px')}
      ${this._mtFieldSelectRaw('class="tra-cond-op"', OPS.map(([v,l])=>`<option value="${v}">${l}</option>`).join(''), OPS[0][1], 'flex:1.2;min-width:100px')}
      <input class="tra-cond-val mt-field" type="number" value="2" style="width:76px;flex-shrink:0">
      ${_c('tra-cond-uniq-dev', this._t('traUniqDevices'))}${_c('tra-cond-uniq-ip', this._t('traUniqIps'))}
      ${this._mtRoundBtn('class="tra-cond-del"', trash, this._t('tlDelete'), { size: 26, tone: 'red' })}
    </div>`;
  }

  _traCondGroupHtml(gi) {
    return `<div class="tra-cg" data-grp="${gi}" style="background:rgba(255,255,255,0.03);border:1px solid var(--is-card-bdr,rgba(255,255,255,0.09));border-radius:16px;padding:12px 14px;margin-bottom:8px">
      <div style="font-size:11px;font-weight:600;color:var(--is-text-label);margin-bottom:10px">${this._t('traGroup').replace('{n}', gi+1)} <span style="font-weight:400;font-size:10px;opacity:0.6">${this._t('traGroupOr')}</span></div>
      <div class="tra-cg-rows">${this._traCondRowHtml(gi, 0)}</div>
      <button class="tra-add-or" data-grp="${gi}" style="font-size:11px;color:rgba(0,122,255,0.8);background:transparent;border:none;cursor:pointer;padding:2px 0;margin-top:2px">+ Add <strong>OR</strong> condition</button>
    </div>`;
  }

  _traActionRowHtml(idx) {
    const ACTIONS = [['log_only',this._t('traALog')],['send_notification',this._t('traANotify')],['kill_stream',this._t('traAKill')],['adjust_trust_score',this._t('traAAdjust')],['set_trust_score',this._t('traASet')],['reset_trust_score',this._t('traAReset')],['message_client',this._t('traAMessage')]];
    const trash   = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`;
    return `<div class="tra-act-row" data-idx="${idx}" style="background:rgba(255,255,255,0.03);border:1px solid var(--is-card-bdr,rgba(255,255,255,0.09));border-radius:14px;padding:10px 12px;margin-bottom:6px">
      <div style="display:flex;flex-wrap:wrap;gap:5px;align-items:center">
        ${this._mtFieldSelectRaw('class="tra-act-type"', ACTIONS.map(([v,l])=>`<option value="${v}"${idx===0&&v==='log_only'?' selected':''}>${l}</option>`).join(''), ACTIONS[0][1], 'flex:1;min-width:0')}
        ${this._mtRoundBtn('class="tra-act-del"', trash, this._t('tlDelete'), { size: 26, tone: 'red' })}
        <label style="display:flex;align-items:center;gap:6px;flex-basis:100%;min-width:0;font-size:11px;color:var(--is-text-muted);white-space:nowrap;margin-top:6px">
          Log Message: <input class="tra-act-msg mt-field" type="text" placeholder="${this._t('traOptMsg')}" style="flex:1;min-width:0">
        </label>
      </div>
      <div class="tra-act-desc" style="font-size:10px;color:var(--is-text-muted);margin-top:6px">${this._t('traDLog')}</div>
    </div>`;
  }


  _wireTraCondRow(body) {
    const FIELDS_WITH_UNIQUE = new Set(['concurrent_streams','travel_speed_kmh','active_session_distance','unique_ips_window','unique_devices_window']);

    body.querySelectorAll('.tra-cond-del').forEach(btn => {
      if (btn._wired) return; btn._wired = true;
      btn.addEventListener('click', () => {
        const row   = btn.closest('.tra-cr');
        const grpEl = btn.closest('.tra-cg');
        if (!grpEl) return;
        const rows = grpEl.querySelectorAll('.tra-cr');
        if (rows.length > 1) {
          // remove OR label before this row if present
          const prev = row.previousElementSibling;
          if (prev?.classList?.contains('tra-or-label')) prev.remove();
          row.remove();
        } else if (body.querySelectorAll('.tra-cg').length > 1) {
          grpEl.remove();
        }
      });
    });

    body.querySelectorAll('.tra-cond-field').forEach(sel => {
      if (sel._wired) return; sel._wired = true;
      sel.addEventListener('change', () => {
        const row = sel.closest('.tra-cr');
        if (!row) return;
        const hasUniq = FIELDS_WITH_UNIQUE.has(sel.value);
        row.querySelectorAll('.tra-cond-uniq-dev, .tra-cond-uniq-ip').forEach(el => {
          el.closest('label').style.display = hasUniq ? '' : 'none';
        });
      });
    });

    body.querySelectorAll('.tra-act-del').forEach(btn => {
      if (btn._wired) return; btn._wired = true;
      btn.addEventListener('click', () => {
        const row = btn.closest('.tra-act-row');
        const container = body.querySelector('#tra-rf-actions');
        if (container && container.querySelectorAll('.tra-act-row').length > 1) row.remove();
      });
    });

    body.querySelectorAll('.tra-act-type').forEach(sel => {
      if (sel._wired) return; sel._wired = true;
      const ACTION_MSG_LABEL = { log_only:this._t('traMLog'), send_notification:this._t('traMMsg'), kill_stream:this._t('traMKill'), message_client:this._t('traMMsg') };
      const ACTION_DESC = {
        log_only:this._t('traDLog'), send_notification:this._t('traDNotify'),
        kill_stream:this._t('traDKill'), adjust_trust_score:this._t('traDAdjust'),
        set_trust_score:this._t('traDSet'), reset_trust_score:this._t('traDReset'),
        message_client:this._t('traDMessage'),
      };
      sel.addEventListener('change', () => {
        const row     = sel.closest('.tra-act-row');
        if (!row) return;
        const aType   = sel.value;
        const msgLbl  = ACTION_MSG_LABEL[aType];
        const descTxt = ACTION_DESC[aType] || '';
        // The select now sits inside its own trigger, so the flex row is the
        // action row's first child rather than the select's parent.
        const topRow  = row.firstElementChild;
        // update or add msg input
        let msgWrap = topRow.querySelector('label');
        if (msgLbl) {
          if (!msgWrap) {
            msgWrap = document.createElement('label');
            msgWrap.style.cssText = 'display:flex;align-items:center;gap:6px;flex-basis:100%;min-width:0;font-size:11px;color:var(--is-text-muted);white-space:nowrap;margin-top:6px';
            topRow.insertBefore(msgWrap, topRow.lastElementChild);
          }
          msgWrap.innerHTML = `${msgLbl}: <input class="tra-act-msg mt-field" type="text" placeholder="${this._t('traOptCustomMsg')}" style="flex:1;min-width:0">`;
          msgWrap.style.display = '';
        } else if (msgWrap) {
          msgWrap.style.display = 'none';
        }
        // update desc
        let descEl = row.querySelector('.tra-act-desc');
        if (descTxt) {
          if (!descEl) {
            descEl = document.createElement('div');
            descEl.className = 'tra-act-desc';
            descEl.style.cssText = 'font-size:10px;color:var(--is-text-muted);margin-top:6px';
            row.appendChild(descEl);
          }
          descEl.textContent = descTxt;
          descEl.style.display = '';
        } else if (descEl) {
          descEl.style.display = 'none';
        }
      });
    });

    body.querySelectorAll('.tra-add-or').forEach(btn => {
      if (btn._wired) return; btn._wired = true;
      btn.addEventListener('click', () => {
        const gi    = parseInt(btn.dataset.grp, 10);
        const grpEl = body.querySelector(`.tra-cg[data-grp="${gi}"]`);
        if (!grpEl) return;
        const ci    = grpEl.querySelectorAll('.tra-cr').length;
        const rows  = grpEl.querySelector('.tra-cg-rows');
        // add OR label
        const orLbl = document.createElement('div');
        orLbl.className = 'tra-or-label';
        orLbl.style.cssText = 'font-size:10px;font-weight:700;color:rgba(0,122,255,0.8);margin:2px 0 6px';
        orLbl.textContent = 'OR';
        rows.appendChild(orLbl);
        const tmp = document.createElement('div');
        tmp.innerHTML = this._traCondRowHtml(gi, ci);
        rows.appendChild(tmp.firstElementChild);
        this._wireTraCondRow(body);
      });
    });
  }

}

export const wireTracearrRulesMixin = _WireTracearrRulesMethods.prototype;
