import { ICONS, dayClass, isMobile } from '../shared/ui.js';
import { MT_BTN, _ICO_CHECK } from '../render/maintainerr.js';

// Prowlarr, the Apps tab, and adding or editing an app. Split out of wire/prowlarr.js.

class _WireProwlarrAppsMethods {

  // ── Apps tab ─────────────────────────────────────────────────────────────

  async _pwLoadApps(body, el) {
    const m = this._prowlarrModal;
    if (!m) return;
    try {
      const [apps, appProfiles, cats] = await Promise.all([
        this._callApi('GET', 'arr_stack/prowlarr/applications').catch(() => []),
        this._callApi('GET', 'arr_stack/prowlarr/appprofiles').catch(() => []),
        this._callApi('GET', 'arr_stack/prowlarr/categories').catch(() => []),
      ]);
      if (!this._prowlarrModal) return;
      if (this._prowlarr) this._prowlarr.apps = apps || [];
      m.appsData       = apps || [];
      m.appsProfiles   = appProfiles || [];
      m.appsCategories = cats || [];
      // Sync existing global test results into modal
      if (this._prowlarr?.appTestResults) m.appTestResults = this._prowlarr.appTestResults;
    } catch (_) {
      if (!this._prowlarrModal) return;
      m.appsData = []; m.appsProfiles = []; m.appsCategories = [];
    }
    // Render table immediately, then auto-test in background
    body.innerHTML = this._pwAppsTabHtml(m);
    this._pwWireApps(body, el);
    this._pwAutoTestApps(body, el);
  }

  async _pwAutoTestApps(body, el) {
    const m    = this._prowlarrModal;
    const apps = m?.appsData || [];
    if (!apps.length || !this._prowlarr) return;
    if (!this._prowlarr.appTestResults) this._prowlarr.appTestResults = {};
    m.appTestResults = this._prowlarr.appTestResults;
    await Promise.all(apps.map(async app => {
      try {
        const r = await this._callApi('POST', 'arr_stack/prowlarr/apptest', app);
        this._prowlarr.appTestResults[app.id] = { ok: r?.ok !== false, errors: r?.errors || [] };
      } catch (_) {
        this._prowlarr.appTestResults[app.id] = { ok: false, errors: [] };
      }
    }));
    if (!this._prowlarrModal) return;
    body.innerHTML = this._pwAppsTabHtml(this._prowlarrModal);
    this._pwWireApps(body, el);
    // Update poster card in right panel without full re-render
    const posterEl = this.shadowRoot?.querySelector('[data-pw-open="apps"]');
    if (posterEl) {
      const tmp = document.createElement('div');
      tmp.innerHTML = this._pwAppsCard();
      const newEl = tmp.firstElementChild;
      if (newEl) posterEl.replaceWith(newEl);
    }
  }

  _pwAppsTabHtml(m) {
    const apps        = m?.appsData || [];
    const appProfiles = m?.appsProfiles || [];
    const testResults = m?.appTestResults || this._prowlarr?.appTestResults || {};
    const isMob       = isMobile();

    const getField = (app, name) => {
      const f = (app.fields || []).find(f => f.name === name);
      return f?.value || '';
    };
    const getProfileName = id => appProfiles.find(p => p.id === id)?.name || `Profile ${id}`;
    const syncBadge = level => {
      const lv  = level || '';
      const lvl = lv.toLowerCase();
      const tone = lvl === 'fullsync' ? 'green' : lvl === 'addonly' ? 'amber' : 'neutral';
      const label = lvl === 'fullsync' ? this._t('pwFullSync') : lvl === 'addonly' ? this._t('pwAddOnly') : lvl === 'disabled' ? this._t('mtSortDisabled') : lv || '—';
      return this._uiBadge(label, tone);
    };
    const IMPL_COLORS = { radarr:'#34d399', sonarr:'#638cff', lidarr:'#fbbf24', readarr:'#a855f7', whisparr:'#f87171', mylar3:'#60a5fa', lazylibrarian:'#fb923c' };
    const implBadge = app => {
      const name = app.implementationName || app.implementation || 'App';
      const c    = IMPL_COLORS[name.toLowerCase()] || '#9ca3af';
      return this._uiBadge(this._escHtml(name), this._hexToRgbTriple(c));
    };
    const statusDot = id => {
      const r = testResults[id];
      if (!r) return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgba(200,200,200,0.25)" title="${this._t('pwNotTested')}"></span>`;
      return r.ok
        ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgba(52,211,153,0.85)" title="OK"></span>`
        : `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgba(255,100,100,0.85)" title="${this._escHtml((r.errors||[]).map(e=>e.errorMessage).join(', ').substring(0,80))}"></span>`;
    };

    // Apps have nothing to search or filter, so the bar holds the actions alone
    // and hugs the right edge rather than stretching across an empty row.
    // Add / Test all / Sync all now live in the modal header, next to close.
    const toolbar = '';

    if (!apps.length) {
      return `${toolbar}<div class="u-empty-lg">${this._t('pwNoApps')}</div>`;
    }

    if (isMob) {
      const mobRows = apps.map((app, i) => {
        const sep    = i > 0 ? 'border-top:1px solid var(--is-divider);' : '';
        const url    = getField(app, 'baseUrl');
        const tr     = testResults[app.id];
        const errMsg = tr && !tr.ok ? `<div style="font-size:10px;color:rgba(255,120,80,0.8);margin-top:2px">${this._escHtml((tr.errors||[]).map(e=>e.errorMessage).join(', ').substring(0,80))}</div>` : '';
        const mobToggle = this._uiSwitch(`class="pw-app-toggle-btn" data-app-id="${app.id}" data-enabled="${app.enable}"`, app.enable, app.enable ? this._t('pwDisable') : this._t('pwEnable'));
        return `<div data-pw-app-id="${app.id}" style="${sep}padding:10px 0;cursor:pointer">
          <div class="u-row-8">
            ${statusDot(app.id)}
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;color:var(--is-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px">${this._escHtml(app.name||'—')}</div>
              <div style="font-size:10px;color:var(--is-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this._escHtml(url||'—')}</div>
              ${errMsg}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
              ${syncBadge(app.syncLevel)}
              ${mobToggle}
            </div>
          </div>
        </div>`;
      }).join('');
      return `${toolbar}<div style="flex:1;overflow-y:auto">${mobRows}</div>`;
    }

    const th = (label, w, align) => `<th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:${align||'left'};white-space:nowrap${w?';width:'+w:''}">${label}</th>`;
    const td = (content, w, align) => `<td style="padding:8px;font-size:10px;color:var(--is-text-sec);overflow:hidden;text-overflow:ellipsis;white-space:nowrap${w?';width:'+w:''}${align?';text-align:'+align:''}">${content}</td>`;

    const rows = apps.map(app => {
      const url  = getField(app, 'baseUrl');
      const toggleBtn = this._uiSwitch(`class="pw-app-toggle-btn" data-app-id="${app.id}" data-enabled="${app.enable}"`, app.enable, app.enable ? this._t('pwDisable') : this._t('pwEnable'));
      return `<tr data-pw-app-id="${app.id}" style="border-bottom:1px solid var(--is-divider);cursor:pointer">
        <td style="padding:8px;width:18px;vertical-align:middle">${statusDot(app.id)}</td>
        <td style="padding:8px;overflow:hidden">
          <div style="font-size:12px;font-weight:600;color:var(--is-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._escHtml(app.name||'—')}</div>
        </td>
        ${td(this._escHtml(url||'—'))}
        <td style="padding:8px">${syncBadge(app.syncLevel)}</td>
        ${td(this._escHtml(getProfileName(app.appProfileId)), '100px')}
        <td style="padding:8px;width:52px;vertical-align:middle">
          <div style="display:flex;justify-content:center;align-items:center;height:100%">${toggleBtn}</div>
        </td>
      </tr>`;
    }).join('');

    return `${toolbar}<div class="u-flex-ovh">
      <table style="width:100%;border-collapse:collapse;table-layout:fixed">
        <thead><tr class="u-divider-b">
          ${th('', '18px')}
          <th style="padding:4px 8px 8px;font-size:10px;font-weight:600;color:var(--is-text-muted);text-align:left">${this._t('mtRuleName')}</th>
          ${th('URL')}${th(this._t('pwSync'),'90px')}${th(this._t('actColProfile'),'100px')}${th(this._t('pwEnable'),'52px','center')}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  _pwWireApps(body, el) {
    if (!this._prowlarrModal) return;

    this._pwHdrBtn(el, 'pw-app-add-btn', () => this._pwOpenAddApp(el));

    this._pwHdrBtn(el, 'pw-app-testall-btn', async (btn) => {
      this._pwHdrBtnBusy(btn);
      const apps = this._prowlarrModal?.appsData || [];
      this._pwShowStatus(`Testing ${apps.length} application${apps.length === 1 ? '' : 's'}…`, el, 0, { spin: true });
      if (!this._prowlarr.appTestResults) this._prowlarr.appTestResults = {};
      if (this._prowlarrModal) this._prowlarrModal.appTestResults = this._prowlarr.appTestResults;
      await Promise.all(apps.map(async app => {
        try {
          const r = await this._callApi('POST', 'arr_stack/prowlarr/apptest', app);
          this._prowlarr.appTestResults[app.id] = { ok: r?.ok !== false, errors: r?.errors || [] };
        } catch (_) {
          this._prowlarr.appTestResults[app.id] = { ok: false, errors: [] };
        }
      }));
      if (!this._prowlarrModal) return;
      const hasErrors = Object.values(this._prowlarr.appTestResults).some(r => !r.ok);
      const failed = Object.values(this._prowlarr.appTestResults).filter(r => !r.ok).length;
      this._pwShowStatus(hasErrors ? this._t(failed === 1 ? 'pwAppFailed1' : 'pwAppFailedN').replace('{n}', failed) : this._t('pwAllAppsOk'), el, 4000, { err: hasErrors });
      await this._pwHdrBtnResult(btn, hasErrors);
      if (!this._prowlarrModal) return;
      body.innerHTML = this._pwAppsTabHtml(this._prowlarrModal);
      this._pwWireApps(body, el);
    });

    this._pwHdrBtn(el, 'pw-app-syncall-btn', async (btn) => {
      this._pwHdrBtnBusy(btn);
      const apps = this._prowlarrModal?.appsData || [];
      this._pwShowStatus(`Syncing ${apps.length} application${apps.length === 1 ? '' : 's'}…`, el, 0, { spin: true });
      let hasErrors = false;
      await Promise.all(apps.map(async app => {
        try { await this._callApi('POST', `arr_stack/prowlarr/appsync/${app.id}`); }
        catch (_) { hasErrors = true; }
      }));
      if (!this._prowlarrModal) return;
      this._pwShowStatus(hasErrors ? this._t('pwSyncFailed') : this._t('pwSyncDone'), el, 4000, { err: hasErrors });
      await this._pwHdrBtnResult(btn, hasErrors);
    });

    body.addEventListener('click', async e => {
      if (!this._prowlarrModal) return;

      const toggleBtn = e.target.closest('.pw-app-toggle-btn');
      if (toggleBtn) {
        e.stopPropagation();
        const id  = parseInt(toggleBtn.dataset.appId);
        const app = (this._prowlarrModal.appsData || []).find(a => a.id === id);
        if (!app) return;
        toggleBtn.disabled = true;
        toggleBtn.style.background = 'rgba(150,150,165,0.4)';
        toggleBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="animation:btn-spin 0.65s linear infinite;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"><path d="M12 2a10 10 0 0 1 10 10"/></svg>`;
        const updated = { ...app, enable: !app.enable };
        try {
          await this._callApi('PUT', `arr_stack/prowlarr/applications/${id}`, updated);
          app.enable = !app.enable;
        } catch (_) {}
        if (!this._prowlarrModal) return;
        body.innerHTML = this._pwAppsTabHtml(this._prowlarrModal);
        this._pwWireApps(body, el);
        return;
      }

      const row = e.target.closest('[data-pw-app-id]');
      if (row && !e.target.closest('button')) {
        const id  = parseInt(row.dataset.pwAppId);
        const app = (this._prowlarrModal.appsData || []).find(a => a.id === id);
        if (app) await this._pwOpenAppForm(id, app, false, this._prowlarrModal.appsProfiles || [], this._prowlarrModal.appsCategories || [], el);
      }
    });
  }

  async _pwOpenAddApp(parentEl) {
    const m = this._prowlarrModal;
    if (!m) return;
    let schemas = m.appsSchemas;
    if (!schemas) {
      try { schemas = m.appsSchemas = await this._callApi('GET', 'arr_stack/prowlarr/applications/schema') || []; }
      catch (_) { schemas = []; }
    }
    const appProfiles = m.appsProfiles || [];
    const categories  = m.appsCategories || [];



    const IMPL_COLORS = { radarr:'#34d399', sonarr:'#638cff', lidarr:'#fbbf24', readarr:'#a855f7', whisparr:'#f87171', mylar3:'#60a5fa', lazylibrarian:'#fb923c' };
    const items = schemas.map(s => {
      const c = IMPL_COLORS[(s.implementationName||'').toLowerCase()] || '#9ca3af';
      return `<div data-pw-app-impl="${this._escHtml(s.implementation||'')}" class="pw-app-impl-item"
        style="padding:11px 16px;border:1px solid var(--is-divider);border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:10px"
        onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background=''">
        <div style="width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0"></div>
        <span style="font-size:13px;font-weight:600;color:var(--is-text)">${this._escHtml(s.implementationName||s.implementation||'—')}</span>
      </div>`;
    }).join('');

    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="popup-overlay${dayClass(this)}" data-pw-app-list style="z-index:1200">
      <div class="popup-glass" style="width:min(380px,94vw);max-height:80vh">
        <div class="is-panel-hdr" style="padding:14px 22px 12px;gap:12px">
          <div style="flex:1;font-size:15px;font-weight:700;color:var(--is-text)">${this._t('pwAddAppT')}</div>
          <button class="popup-close u-rel-shrink0" id="pw-applist-close">${ICONS.close}</button>
        </div>
        <div class="popup-body" style="padding:14px 22px 20px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
          ${items || '<div style="color:var(--is-text-muted);text-align:center;padding:24px">' + this._t('pwNoAppSchemas') + '</div>'}
        </div>
      </div>
    </div>`;
    const overlay = wrap.firstElementChild;
    overlay.querySelector('#pw-applist-close')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelectorAll('.pw-app-impl-item').forEach(item => {
      item.addEventListener('click', async () => {
        const impl   = item.dataset.pwAppImpl;
        const schema = schemas.find(s => s.implementation === impl);
        if (!schema) return;
        overlay.remove();
        const initData = {
          ...schema,
          id: 0,
          name: schema.implementationName || schema.implementation || '',
          enable: true,
          syncLevel: 'FullSync',
          syncCategories: [2000, 5000, 3000, 4000, 1000, 7000, 8000],
          appProfileId: appProfiles[0]?.id || 1,
          tags: [],
        };
        await this._pwOpenAppForm(null, initData, true, appProfiles, categories, parentEl);
      });
    });
    this.shadowRoot.appendChild(overlay);
  }

  async _pwOpenAppForm(id, data, isNew, appProfiles, categories, parentEl) {
    const isMob    = isMobile();


    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="popup-overlay${dayClass(this)}" data-pw-app-form style="z-index:1200">
      <div class="popup-glass" style="width:min(620px,96vw);max-height:90vh">
        <div class="is-panel-hdr" style="padding:14px ${isMob?16:22}px 12px;gap:12px">
          <div style="flex:1;font-size:15px;font-weight:700;color:var(--is-text)">${isNew ? this._t('pwAddAppT') : this._t('pwEditApp')} — ${this._escHtml(data.implementationName||data.implementation||data.name||'')}</div>
          <button class="popup-close u-rel-shrink0" id="pw-af-close">${ICONS.close}</button>
        </div>
        <div class="popup-body" id="pw-af-body" style="padding:${isMob?'12px 14px':'14px 22px'};overflow-y:auto">
          ${this._pwAppFormHtml(data, {}, isNew, appProfiles, categories)}
        </div>
      </div>
    </div>`;

    const el = wrap.firstElementChild;
    el.querySelector('#pw-af-close')?.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    this.shadowRoot.appendChild(el);
    this._pwWireAppForm(el, id, data, isNew, parentEl, appProfiles, categories);
  }

  _pwAppFormHtml(data, errors, isNew, appProfiles, categories) {
    const isMob  = isMobile();
    const fields = data.fields || [];

    // Fields wear the shared capsule; the row keeps its label column.
    const inputSty = 'width:100%';
    const _chk = (attrs, checked, label) => `<label class="mt-chk">
      <input ${attrs} type="checkbox"${checked ? ' checked' : ''}>
      <span class="mt-chk-box">${_ICO_CHECK}</span>
      ${label ? `<span class="mt-chk-lbl">${label}</span>` : ''}
    </label>`;

    const row = (label, field) =>
      isMob
        ? `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:600;color:var(--is-text-muted);margin-bottom:4px">${label}</div>${field}</div>`
        : `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
             <div style="width:140px;flex-shrink:0;font-size:11px;font-weight:600;color:var(--is-text-muted);padding-top:7px;text-align:right">${label}</div>
             <div style="flex:1;min-width:0">${field}</div>
           </div>`;

    const nameRow   = row(this._t('mtRuleName'), `<input id="pw-af-name" type="text" value="${this._escHtml(data.name||'')}" class="mt-field" style="${inputSty}">`);
    const enableRow = `<div style="margin-bottom:12px">${_chk('id="pw-af-enable"', data.enable!==false, this._t('pwEnabled'))}</div>`;

    const appProfileRow = appProfiles.length > 0
      ? row(this._t('pwAppProfile'), this._mtFieldSelect('pw-af-appprofile',
          appProfiles.map(p => [p.id, p.name || 'Profile ' + p.id]),
          data.appProfileId || appProfiles[0]?.id, inputSty))
      : '';

    const syncLevels = [['fullSync',this._t('pwFullSync')],['addOnly',this._t('pwAddOnly')],['disabled',this._t('mtSortDisabled')]];
    const curSync    = (data.syncLevel||'fullSync').toLowerCase();
    const syncLevelRow = row(this._t('pwSyncLevel'), this._mtFieldSelect('pw-af-synclevel', syncLevels,
      syncLevels.find(([v]) => v.toLowerCase() === curSync)?.[0] || 'fullSync', inputSty));

    // Sync categories — collapsible tree
    const selectedCats = data.syncCategories || [];
    const CAT_COLORS = { 2000:'#34d399', 5000:'#638cff', 3000:'#fbbf24', 1000:'#a855f7', 4000:'#60a5fa', 6000:'#f87171', 7000:'#b48c64', 8000:'#9ca3af' };
    const catTree = categories.map(cat => {
      const subs      = cat.subCategories || [];
      const isChecked = selectedCats.includes(cat.id);
      const color     = CAT_COLORS[cat.id] || '#9ca3af';
      const subHtml   = subs.map(sub =>
        `<div style="padding-left:20px">${_chk(`class="pw-cat-cb" data-cat-id="${sub.id}"`, selectedCats.includes(sub.id), this._escHtml(sub.name||String(sub.id)))}</div>`).join('');
      return `<div style="border-bottom:1px solid rgba(255,255,255,0.06);padding:4px 0">
        <div style="display:flex;align-items:center;gap:8px;padding:2px 0${subs.length?';cursor:pointer':''}" class="${subs.length?'pw-cat-toggle':''}">
          ${_chk(`class="pw-cat-cb" data-cat-id="${cat.id}" onclick="event.stopPropagation()"`, isChecked, '')}
          <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <span style="font-size:12px;font-weight:600;color:var(--is-text);flex:1">${this._escHtml(cat.name||String(cat.id))}</span>
          ${subs.length ? `<svg class="pw-cat-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--is-text-muted)" stroke-width="2.5" style="transition:transform 0.15s;flex-shrink:0"><polyline points="6 9 12 15 18 9"/></svg>` : ''}
        </div>
        ${subs.length ? `<div class="pw-cat-subs" style="display:none">${subHtml}</div>` : ''}
      </div>`;
    }).join('');

    const catPanel = categories.length > 0
      ? row(this._t('pwSyncCats'), `<div style="border:1px solid var(--is-card-bdr,rgba(255,255,255,0.09));border-radius:16px;max-height:180px;overflow-y:auto;padding:6px 12px;background:rgba(255,255,255,0.04)">${catTree}</div>`)
      : '';

    // Dynamic schema fields
    const dynFields = fields.map((f, fi) => {
      if (f.type === 'info') return '';
      const val    = f.value !== undefined && f.value !== null ? f.value : '';
      const valStr = typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val ?? '');
      const hint   = f.helpText ? `<div style="font-size:10px;color:var(--is-text-muted);margin-top:3px">${this._escHtml(f.helpText.substring(0,120))}</div>` : '';
      let fieldEl;
      if (f.type === 'checkbox') {
        fieldEl = _chk(`class="pw-afield" data-fi="${fi}" data-fname="${f.name}"`, !!val, '');
      } else if (f.type === 'password') {
        fieldEl = `<input class="pw-afield mt-field" data-fi="${fi}" data-fname="${f.name}" type="password" value="${this._escHtml(valStr)}" style="${inputSty}">`;
      } else if (f.type === 'select' && f.selectOptions?.length) {
        fieldEl = this._mtFieldSelectRaw(`class="pw-afield" data-fi="${fi}" data-fname="${f.name}"`,
          f.selectOptions.map(o => `<option value="${o.value}"${String(o.value)===valStr?' selected':''}>${this._escHtml(o.name||o.label||String(o.value))}</option>`).join(''),
          f.selectOptions.find(o => String(o.value)===valStr)?.name || '', inputSty);
      } else if (f.type === 'number') {
        fieldEl = `<input class="pw-afield mt-field" data-fi="${fi}" data-fname="${f.name}" type="number" value="${this._escHtml(valStr)}" style="${inputSty}">`;
      } else {
        fieldEl = `<input class="pw-afield mt-field" data-fi="${fi}" data-fname="${f.name}" type="text" value="${this._escHtml(valStr)}" style="${inputSty}">`;
      }
      return row(f.label || f.name || '', fieldEl + hint);
    }).join('');

    const deleteBtn = !isNew
      ? `<button id="pw-af-delete" style="${this._mtBtnA('red')}">${this._t('tlDelete')}</button>`
      : '';
    const btnRow = `<div style="display:flex;gap:8px;margin-top:16px;flex-shrink:0;align-items:center">
      <button id="pw-af-test" style="${MT_BTN}">${this._t('pwTest')}</button>
      ${deleteBtn}
      <div style="flex:1;min-width:8px"></div>
      <button id="pw-af-save" style="${this._mtBtnA('blue')}">${isNew ? this._t('libTagAdd') : this._t('mtSave')}</button>
    </div>`;

    return `${nameRow}${enableRow}${appProfileRow}${syncLevelRow}${catPanel}${dynFields}${btnRow}`;
  }

  _pwWireAppForm(el, id, data, isNew, parentEl, appProfiles, categories) {
    const body = el.querySelector('#pw-af-body');
    if (!body) return;
    let testPassed = false;

    // Category tree expand/collapse
    body.addEventListener('click', e => {
      const toggle = e.target.closest('.pw-cat-toggle');
      if (toggle && !e.target.closest('input')) {
        const subs  = toggle.nextElementSibling;
        const arrow = toggle.querySelector('.pw-cat-arrow');
        if (subs) {
          const open = subs.style.display !== 'none';
          subs.style.display = open ? 'none' : '';
          if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
        }
      }
    });

    const collectPayload = () => {
      const name           = body.querySelector('#pw-af-name')?.value?.trim() || data.name || '';
      const enable         = body.querySelector('#pw-af-enable')?.checked ?? true;
      const syncLevel      = body.querySelector('#pw-af-synclevel')?.value || 'FullSync';
      const appProfileId   = parseInt(body.querySelector('#pw-af-appprofile')?.value) || data.appProfileId || 1;
      const syncCategories = [...body.querySelectorAll('.pw-cat-cb:checked')].map(cb => parseInt(cb.dataset.catId)).filter(Boolean);
      const fields = [...body.querySelectorAll('.pw-afield')].map(inp => {
        const fi   = parseInt(inp.dataset.fi);
        const orig = (data.fields || [])[fi] || {};
        let value;
        if (inp.type === 'checkbox')  value = inp.checked;
        else if (inp.type === 'number') { const p = parseFloat(inp.value); value = isNaN(p) ? (orig.value ?? null) : (p === 0 ? null : p); }
        else if (orig.type === 'tag')   value = inp.value.split(',').map(s => s.trim()).filter(Boolean);
        else if (orig.type === 'select') value = inp.value === '' ? null : inp.value;
        else                            value = inp.value;
        return { ...orig, value };
      });
      return { ...data, name, enable, syncLevel, appProfileId, syncCategories, fields };
    };

    // Test
    body.querySelector('#pw-af-test')?.addEventListener('click', async () => {
      const btn = body.querySelector('#pw-af-test');
      body.querySelector('#pw-af-err')?.remove();
      if (btn) { btn.disabled = true; btn.textContent = this._t('pwTesting'); }
      try {
        const result = await this._callApi('POST', 'arr_stack/prowlarr/apptest', collectPayload());
        if (result?.ok === false) {
          testPassed = false;
          const msgs = (result.errors || []).map(e => e.errorMessage).filter(Boolean).join('\n');
          if (btn) { btn.textContent = '✗ Failed'; btn.style.color = 'rgba(255,100,100,0.9)'; }
          if (msgs) {
            const errDiv = document.createElement('div');
            errDiv.id = 'pw-af-err';
            errDiv.style.cssText = 'margin-bottom:14px;padding:10px 12px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:8px;font-size:11px;color:rgba(248,113,113,0.9);line-height:1.6;white-space:pre-wrap;word-break:break-word';
            errDiv.textContent = msgs;
            body.prepend(errDiv);
          }
        } else {
          testPassed = true;
          body.querySelector('#pw-af-err')?.remove();
          if (btn) { btn.textContent = '✓ OK'; btn.style.color = 'rgba(52,211,153,0.9)'; }
        }
      } catch (_) {
        testPassed = false;
        if (btn) { btn.textContent = '✗ Failed'; btn.style.color = 'rgba(255,100,100,0.9)'; }
      }
      if (btn) { btn.disabled = false; setTimeout(() => { if (btn) { btn.textContent = this._t('pwTest'); btn.style.color = ''; } }, 3000); }
    });

    // Delete
    body.querySelector('#pw-af-delete')?.addEventListener('click', async () => {
      const btn = body.querySelector('#pw-af-delete');
      if (!btn) return;
      if (btn.dataset.confirm !== '1') {
        btn.dataset.confirm = '1'; btn.textContent = 'Confirm?';
        setTimeout(() => { if (btn.dataset.confirm === '1') { btn.dataset.confirm = '0'; btn.textContent = this._t('tlDelete'); } }, 3000);
        return;
      }
      btn.disabled = true; btn.textContent = this._t('pwDeleting');
      try {
        await this._callApi('DELETE', `arr_stack/prowlarr/applications/${id}`);
        if (this._prowlarrModal) this._prowlarrModal.appsData = (this._prowlarrModal.appsData || []).filter(a => String(a.id) !== String(id));
        if (this._prowlarr) this._prowlarr.apps = (this._prowlarr.apps || []).filter(a => String(a.id) !== String(id));
        el.remove();
        const pwBody = parentEl?.querySelector('#pw-body');
        if (pwBody && this._prowlarrModal?.tab === 'apps') {
          pwBody.innerHTML = this._pwAppsTabHtml(this._prowlarrModal);
          this._pwWireApps(pwBody, parentEl);
        }
      } catch (_) { btn.disabled = false; btn.textContent = this._t('tlDelete'); }
    });

    // Save
    body.querySelector('#pw-af-save')?.addEventListener('click', async () => {
      if (!testPassed) {
        const btn = body.querySelector('#pw-af-save');
        if (btn) {
          btn.style.background = 'rgba(248,113,113,0.25)'; btn.style.color = 'rgba(248,113,113,0.95)';
          setTimeout(() => { btn.style.background = 'rgba(99,140,255,0.2)'; btn.style.color = 'rgba(99,140,255,0.95)'; }, 800);
        }
        if (!body.querySelector('#pw-af-err')) {
          const errDiv = document.createElement('div');
          errDiv.id = 'pw-af-err';
          errDiv.style.cssText = 'margin-bottom:14px;padding:10px 12px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:8px;font-size:11px;color:rgba(248,113,113,0.9);line-height:1.6';
          errDiv.textContent = this._t('pwRunTestApp');
          body.prepend(errDiv);
        }
        return;
      }
      const btn = body.querySelector('#pw-af-save');
      if (btn) { btn.disabled = true; btn.textContent = isNew ? this._t('asAdding') : this._t('pwSaving'); }
      try {
        const payload = collectPayload();
        if (isNew) {
          const created = await this._callApi('POST', 'arr_stack/prowlarr/applications', payload);
          if (this._prowlarrModal) this._prowlarrModal.appsData = [...(this._prowlarrModal.appsData || []), created];
          if (this._prowlarr) this._prowlarr.apps = [...(this._prowlarr.apps || []), created];
        } else {
          const updated = await this._callApi('PUT', `arr_stack/prowlarr/applications/${id}`, payload);
          if (this._prowlarrModal) {
            const idx = (this._prowlarrModal.appsData || []).findIndex(a => String(a.id) === String(id));
            if (idx >= 0) this._prowlarrModal.appsData[idx] = updated;
          }
          if (this._prowlarr) {
            const idx = (this._prowlarr.apps || []).findIndex(a => String(a.id) === String(id));
            if (idx >= 0) this._prowlarr.apps[idx] = updated;
          }
        }
        el.remove();
        const pwBody = parentEl?.querySelector('#pw-body');
        if (pwBody && this._prowlarrModal?.tab === 'apps') {
          pwBody.innerHTML = this._pwAppsTabHtml(this._prowlarrModal);
          this._pwWireApps(pwBody, parentEl);
        }
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = isNew ? this._t('libTagAdd') : this._t('mtSave'); }
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'color:rgba(255,100,100,0.8);font-size:11px;margin-top:8px';
        errDiv.textContent = err?.body?.message || String(err);
        body.querySelector('#pw-af-save')?.after(errDiv);
      }
    });
  }

}

export const wireProwlarrAppsMixin = _WireProwlarrAppsMethods.prototype;
