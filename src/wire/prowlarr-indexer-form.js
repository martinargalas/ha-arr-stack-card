import { ICONS, dayClass, isMobile } from '../shared/ui.js';
import { MT_BTN, _ICO_CHECK } from '../render/maintainerr.js';

// Prowlarr, adding and editing an indexer: the schema picker and the form. Split out of wire/prowlarr.js.

class _WireProwlarrIndexerFormMethods {

  _pwSchemaListOverlay() {
    const isMob    = isMobile();
    const wrap     = document.createElement('div');

    wrap.innerHTML = `<div class="popup-overlay${dayClass(this)}" data-pw-schema-list>
      <div class="popup-glass" style="width:min(700px,96vw);height:80vh">
        <div class="is-panel-hdr" style="padding:14px ${isMob?16:22}px 12px;gap:12px">
          <div style="flex:1;font-size:15px;font-weight:700;color:var(--is-text)">${this._t('pwAddIndexerT')}</div>
          <button class="popup-close u-rel-shrink0" id="pw-schema-close">${ICONS.close}</button>
        </div>
        <div class="popup-body" id="pw-schema-body" style="padding:${isMob?'12px 14px':'14px 22px'};overflow:hidden;display:flex;flex-direction:column;flex:1;min-height:0">
          <div class="is-loading"><span>${this._t('pwLoadingIdx')}</span></div>
        </div>
      </div>
    </div>`;
    const el = wrap.firstElementChild;
    el.querySelector('#pw-schema-close')?.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    return el;
  }

  _pwRenderSchemaList(overlay, schemas, parentEl) {
    const body    = overlay.querySelector('#pw-schema-body');
    const PER_PAGE = 50;
    let search   = '';
    let fProto   = 'all';
    let fLang    = 'all';
    let fPrivacy = 'all';
    let page     = 0;

    const langs = [...new Set(schemas.map(s => s.language).filter(Boolean))].sort();

    const render = () => {
      let rows = [...schemas];
      if (search)             rows = rows.filter(s => (s.name||'').toLowerCase().includes(search.toLowerCase()));
      if (fProto !== 'all')   rows = rows.filter(s => (s.protocol||'').toLowerCase() === fProto);
      if (fLang  !== 'all')   rows = rows.filter(s => s.language === fLang);
      if (fPrivacy !== 'all') rows = rows.filter(s => (s.privacy||'').toLowerCase() === fPrivacy);

      const totPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
      page = Math.min(page, totPages - 1);
      const paged = rows.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

      const toolbar = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;flex-shrink:0">${
        this._uiBar('pw-sl-search', search, [
          { id: 'pw-sl-proto', kind: 'protocol', value: fProto, items: [['all', this._t('pwAllProtocols')], ['torrent', 'Torrent'], ['usenet', 'Usenet']] },
          { id: 'pw-sl-lang',  kind: 'langs',    value: fLang,  items: [['all', this._t('pwAllLangs')], ...langs.map(l => [l, l])] },
          { id: 'pw-sl-priv',  kind: 'source',   value: fPrivacy, items: [['all', this._t('pwAllPrivacy')], ['public', this._t('pwPublic')], ['private', this._t('pwPrivate')], ['semiPublic', this._t('pwSemiPublic')]] },
        ], [], { placeholder: this._t('pwSearchIdx') })}</div>`;
      const count    = `<div style="font-size:11px;color:var(--is-text-muted);margin-bottom:8px;flex-shrink:0">${this._t(rows.length!==1 ? 'pwIdxAvailN' : 'pwIdxAvail1').replace('{n}', rows.length)}</div>`;

      const isMob = isMobile();
      let listHtml;
      if (isMob) {
        // Mobile: card rows
        listHtml = paged.map(s => {
          const isTrk = (s.protocol||'').toLowerCase() === 'torrent';
          const protoBadge = this._uiBadge(isTrk ? 'TRK' : 'NZB', isTrk ? 'blue' : 'amber', { small: true });
          // Privacy was bare text here and a badge in the table — same fact, so
          // it wears the same badge in both.
          const privBadge = this._uiBadge(this._escHtml(s.privacy || this._t('pwPrivate')), s.privacy === 'public' ? 'green' : 'amber', { small: true });
          return `<div data-pw-schema-name="${this._escHtml(s.name||'')}" style="padding:8px;border:1px solid var(--is-divider);border-radius:6px;cursor:pointer;margin-bottom:4px;display:flex;align-items:center;gap:8px" class="pw-schema-item">
            <div style="flex:1;min-width:0">
              <div class="u-sm-text">${this._escHtml(s.name||'—')}</div>
              <div style="font-size:10px;color:var(--is-text-muted);margin-top:2px">${s.language||''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">${protoBadge}${privBadge}</div>
          </div>`;
        }).join('') || '<div style="text-align:center;color:var(--is-text-muted);padding:32px">' + this._t('pwNoIndexersMatch') + '</div>';
      } else {
        // Tablet/desktop: table
        const thSty = `padding:6px 10px;text-align:left;font-size:11px;font-weight:700;color:var(--is-text-muted);border-bottom:1px solid var(--is-divider);white-space:nowrap`;
        const tdSty = `padding:7px 10px;font-size:12px;color:var(--is-text);border-bottom:1px solid var(--is-divider)`;
        const rows = paged.map(s => {
          const isTrk = (s.protocol||'').toLowerCase() === 'torrent';
          const protoBadge = this._uiBadge(isTrk ? 'TRK' : 'NZB', isTrk ? 'blue' : 'amber');
          const priv = (s.privacy||'private').toLowerCase();
          const privBadge = this._uiBadge(this._escHtml(s.privacy || this._t('pwPrivate')),
            priv === 'public' ? 'green' : priv === 'semipublic' ? 'amber' : 'red');
          return `<tr class="pw-schema-item" data-pw-schema-name="${this._escHtml(s.name||'')}" style="cursor:pointer" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background=''">
            <td style="${tdSty}">${protoBadge}</td>
            <td style="${tdSty};font-weight:600">${this._escHtml(s.name||'—')}</td>
            <td style="${tdSty};color:var(--is-text-muted)">${this._escHtml(s.language||'—')}</td>
            <td style="${tdSty}">${privBadge}</td>
          </tr>`;
        }).join('');
        listHtml = `<table style="width:100%;border-collapse:collapse;table-layout:fixed">
          <thead><tr>
            <th style="${thSty};width:52px">${this._t('tlColType')}</th>
            <th style="${thSty}">${this._t('mtRuleName')}</th>
            <th style="${thSty};width:100px">${this._t('pwLanguage')}</th>
            <th style="${thSty};width:80px">${this._t('pwPrivacy')}</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--is-text-muted);padding:32px">' + this._t('pwNoIndexersMatch') + '</td></tr>'}</tbody>
        </table>`;
      }

      const pagHtml = totPages > 1 ? this._uiPager('pw-sl-page', page, totPages) : '';

      body.innerHTML = `${toolbar}${count}<div style="flex:1;overflow-y:auto;min-height:0">${listHtml}</div><div style="flex-shrink:0">${pagHtml}</div>`;

      // Wire search/filters
      const inp = body.querySelector('#pw-sl-search');
      inp?.addEventListener('input', e => { search = e.target.value; page = 0; render(); const ni = body.querySelector('#pw-sl-search'); if (ni) { ni.focus(); ni.setSelectionRange(ni.value.length, ni.value.length); } });
      body.querySelector('#pw-sl-proto')?.addEventListener('change', e => { fProto = e.target.value; page = 0; render(); });
      body.querySelector('#pw-sl-lang')?.addEventListener('change',  e => { fLang  = e.target.value; page = 0; render(); });
      body.querySelector('#pw-sl-priv')?.addEventListener('change',  e => { fPrivacy = e.target.value; page = 0; render(); });

      // Pagination clicks
      body.querySelectorAll('[data-pw-sl-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = btn.dataset.pwSlPage;
          const cur = page;
          const np = p==='first'?0:p==='prev'?Math.max(0,cur-1):p==='next'?Math.min(totPages-1,cur+1):p==='last'?totPages-1:(parseInt(p)||0);
          if (np !== cur) { page = np; render(); }
        });
      });

      // Wire item click → open edit form for new indexer
      body.querySelectorAll('.pw-schema-item').forEach(item => {
        item.addEventListener('click', async () => {
          const name = item.dataset.pwSchemaName;
          const schema = schemas.find(s => s.name === name);
          if (!schema) return;
          overlay.remove();
          await this._pwOpenIndexerForm(null, schema, parentEl);
        });
      });
    };

    render();
  }

  async _pwOpenEditIndexer(id, parentEl) {
    try {
      const idx = await this._callApi('GET', `arr_stack/prowlarr/indexer/${id}`);
      if (!idx) throw new Error('Not found');
      await this._pwOpenIndexerForm(id, idx, parentEl);
    } catch (err) {
      alert('Failed to load indexer: ' + (err?.body?.message || String(err)));
    }
  }

  async _pwOpenIndexerForm(id, data, parentEl) {
    const isNew  = !id;
    const isMob  = isMobile();


    // For new indexers, fetch available app profiles (needed for appProfileId)
    let appProfiles = [];
    if (isNew) {
      try { appProfiles = await this._callApi('GET', 'arr_stack/prowlarr/appprofiles') || []; } catch (_) {}
    }

    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="popup-overlay${dayClass(this)}" data-pw-idx-form>
      <div class="popup-glass" style="width:min(600px,96vw);max-height:90vh">
        <div class="is-panel-hdr" style="padding:14px ${isMob?16:22}px 12px;gap:12px">
          <div style="flex:1;font-size:15px;font-weight:700;color:var(--is-text)">${isNew ? this._t('pwAddIndexerT') : this._t('pwEditIndexer')} — ${this._escHtml(data.name||'')}</div>
          <button class="popup-close u-rel-shrink0" id="pw-form-close">${ICONS.close}</button>
        </div>
        <div class="popup-body" id="pw-form-body" style="padding:${isMob?'12px 14px':'14px 22px'};overflow-y:auto">
          ${this._pwIndexerFormHtml(data, {}, isNew, appProfiles)}
        </div>
      </div>
    </div>`;

    const el = wrap.firstElementChild;
    el.querySelector('#pw-form-close')?.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    this.shadowRoot.appendChild(el);
    this._pwWireIndexerForm(el, id, data, isNew, parentEl, appProfiles);
  }

  _pwIndexerFormHtml(data, errors, isNew, appProfiles = []) {
    const isMob  = isMobile();
    const fields = data.fields || [];

    // Capsule field; an error only recolours the rim rather than reshaping it.
    const inputSty = (err) => `width:100%${err ? ';border-color:rgba(248,113,113,0.8)' : ''}`;
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

    // Core fields
    const nameRow    = row(this._t('mtRuleName'), `<input id="pw-f-name" type="text" value="${this._escHtml(data.name||'')}" class="mt-field" style="${inputSty(errors.name)}">`);
    const enableRow  = `<div style="margin-bottom:12px">${_chk('id="pw-f-enable"', data.enable!==false, this._t('pwEnabled'))}</div>`;

    // Dynamic fields from schema
    const dynFields = fields.map((f, fi) => {
      if (f.type === 'info') {
        // Long help text → show as collapsible hint
        const shortText = (f.helpText || f.label || '').substring(0, 80);
        const hasMore   = (f.helpText || '').length > 80;
        const infoHtml  = `<div style="font-size:10px;color:rgba(99,140,255,0.8);cursor:${hasMore?'pointer':'default'}" ${hasMore?`data-pw-info-full="${this._escHtml(f.helpText||f.label||'')}" class="pw-info-toggle"`:''}>${this._escHtml(shortText)}${hasMore?' <span style="text-decoration:underline">' + this._t('pwShowMore') + '</span>':''}</div>`;
        return row(f.label || '', infoHtml);
      }
      const val    = f.value !== undefined && f.value !== null ? f.value : (f.advanced ? '' : '');
      const valStr = typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val ?? '');
      const errMsg = errors[`field_${fi}`] ? `<div style="font-size:10px;color:rgba(248,113,113,0.8);margin-top:3px">${errors[`field_${fi}`]}</div>` : '';
      const hint   = f.helpText && f.type !== 'info' ? `<div style="font-size:10px;color:var(--is-text-muted);margin-top:3px">${this._escHtml(f.helpText.substring(0,120))}</div>` : '';

      let fieldEl;
      if (f.type === 'checkbox') {
        fieldEl = _chk(`class="pw-field" data-fi="${fi}" data-fname="${f.name}"`, !!val, '');
      } else if (f.type === 'password') {
        fieldEl = `<input class="pw-field mt-field" data-fi="${fi}" data-fname="${f.name}" type="password" value="${this._escHtml(valStr)}" style="${inputSty(!!errors[`field_${fi}`])}">`;
      } else if (f.type === 'select' && f.selectOptions?.length) {
        fieldEl = this._mtFieldSelectRaw(`class="pw-field" data-fi="${fi}" data-fname="${f.name}"`,
          f.selectOptions.map(o => `<option value="${o.value}"${String(o.value)===valStr?' selected':''}>${this._escHtml(o.name||o.label||o.value)}</option>`).join(''),
          f.selectOptions.find(o => String(o.value)===valStr)?.name || '', inputSty(false));
      } else if (f.type === 'number') {
        fieldEl = `<input class="pw-field mt-field" data-fi="${fi}" data-fname="${f.name}" type="number" value="${this._escHtml(valStr)}" style="${inputSty(!!errors[`field_${fi}`])}">`;
      } else if (f.type === 'tag') {
        fieldEl = `<input class="pw-field mt-field" data-fi="${fi}" data-fname="${f.name}" type="text" value="${this._escHtml(Array.isArray(val) ? val.join(', ') : valStr)}" placeholder="${this._t('pwCommaSep')}" style="${inputSty(!!errors[`field_${fi}`])}">`;
      } else {
        // textbox / default
        fieldEl = `<input class="pw-field mt-field" data-fi="${fi}" data-fname="${f.name}" type="text" value="${this._escHtml(valStr)}" style="${inputSty(!!errors[`field_${fi}`])}">`;
      }
      const fieldHtml = row((f.label || f.name || ''), fieldEl + hint + errMsg);
      return f.advanced
        ? `<div data-pw-adv-field style="display:none">${fieldHtml}</div>`
        : fieldHtml;
    }).join('');

    // App Profile dropdown (new indexer only)
    const appProfileRow = (isNew && appProfiles.length > 0)
      ? row(this._t('pwAppProfile'), this._mtFieldSelect('pw-f-appprofile',
          appProfiles.map(p => [p.id, p.name || 'Profile ' + p.id]),
          data.appProfileId || appProfiles[0]?.id, 'width:100%'))
      : '';

    const hasAdvanced = fields.some(f => f.advanced);
    const advBtn = hasAdvanced
      ? `<button id="pw-form-adv" style="${MT_BTN}">${this._t('pwShowAdv')}</button>`
      : '';

    const deleteBtn = !isNew
      ? `<button id="pw-form-delete" style="${this._mtBtnA('red')}">${this._t('tlDelete')}</button>`
      : '';
    const btnRow = `<div style="display:flex;gap:8px;margin-top:16px;flex-shrink:0;align-items:center;flex-wrap:wrap">
      <button id="pw-form-test" style="${MT_BTN}">${this._t('pwTest')}</button>
      ${advBtn}${deleteBtn}
      <div style="flex:1;min-width:8px"></div>
      <button id="pw-form-save" style="${this._mtBtnA('blue')}">${isNew ? this._t('libTagAdd') : this._t('mtSave')}</button>
    </div>`;

    return `${nameRow}${enableRow}${appProfileRow}${dynFields}${btnRow}`;
  }

  _pwWireIndexerForm(el, id, data, isNew, parentEl, appProfiles = []) {
    const body = el.querySelector('#pw-form-body');
    if (!body) return;

    let testPassed = false; // must Test successfully before Save is allowed

    // Advanced toggle
    body.querySelector('#pw-form-adv')?.addEventListener('click', () => {
      const btn    = body.querySelector('#pw-form-adv');
      const fields = body.querySelectorAll('[data-pw-adv-field]');
      const shown  = btn.dataset.advShown === '1';
      fields.forEach(f => { f.style.display = shown ? 'none' : ''; });
      btn.dataset.advShown = shown ? '0' : '1';
      btn.textContent      = shown ? this._t('pwShowAdv') : this._t('pwHideAdv');
    });

    // Info toggle → show full text in a mini modal
    body.addEventListener('click', e => {
      const toggle = e.target.closest('.pw-info-toggle');
      if (toggle) {
        const full = toggle.dataset.pwInfoFull;
        this._pwShowInfoModal(full);
      }
    });

    // Collect current form values
    const collectPayload = () => {
      const name   = body.querySelector('#pw-f-name')?.value?.trim() || data.name || '';
      const enable = body.querySelector('#pw-f-enable')?.checked ?? true;
      const fields = [...body.querySelectorAll('.pw-field')].map(inp => {
        const fi   = parseInt(inp.dataset.fi);
        const orig = (data.fields || [])[fi] || {};
        let value;
        if (inp.type === 'checkbox')     value = inp.checked;
        else if (inp.type === 'number') {
          const parsed = parseFloat(inp.value);
          // 0 → null: Prowlarr uses null for "no override / inherit from app profile"
          // (returns 0 from API but rejects 0 on PUT with "should be > 0")
          value = isNaN(parsed) ? (orig.value ?? null) : (parsed === 0 ? null : parsed);
        }
        else if (orig.type === 'tag')    value = inp.value.split(',').map(s => s.trim()).filter(Boolean);
        else if (orig.type === 'select') value = inp.value === '' ? null : inp.value;
        else                             value = inp.value;
        return { ...orig, value };
      });
      // App Profile (new indexer dropdown, or keep existing)
      const appProfileEl = body.querySelector('#pw-f-appprofile');
      const appProfileId = appProfileEl
        ? (parseInt(appProfileEl.value) || appProfiles[0]?.id || 1)
        : (data.appProfileId || 1);
      return { ...data, name, enable, fields, appProfileId };
    };

    // Test
    body.querySelector('#pw-form-test')?.addEventListener('click', async () => {
      const btn = body.querySelector('#pw-form-test');
      // Remove previous test error
      body.querySelector('#pw-test-err')?.remove();
      if (btn) { btn.disabled = true; btn.textContent = this._t('pwTesting'); }
      const payload = collectPayload();
      try {
        const testUrl = (isNew || !data.id)
          ? 'arr_stack/prowlarr/idxtest?id=0'
          : `arr_stack/prowlarr/idxtest?id=${data.id}`;
        const result = (isNew || !data.id)
          ? await this._callApi('POST', testUrl, payload)
          : await this._callApi('POST', testUrl, {});
        if (result?.ok === false) {
          // Show Prowlarr error messages at top of form
          const msgs = (result.errors || [])
            .map(e => e.errorMessage).filter(Boolean).join('\n');
          if (btn) { btn.textContent = '✗ Failed'; btn.style.color = 'rgba(255,100,100,0.9)'; }
          testPassed = false;
          if (msgs) {
            body.querySelector('#pw-test-err')?.remove();
            const errDiv = document.createElement('div');
            errDiv.id = 'pw-test-err';
            errDiv.style.cssText = 'margin-bottom:14px;padding:10px 12px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:8px;font-size:11px;color:rgba(248,113,113,0.9);line-height:1.6;white-space:pre-wrap;word-break:break-word';
            errDiv.textContent = msgs;
            body.prepend(errDiv);
          }
        } else {
          testPassed = true;
          body.querySelector('#pw-test-err')?.remove();
          if (btn) { btn.textContent = '✓ OK'; btn.style.color = 'rgba(52,211,153,0.9)'; }
        }
      } catch (err) {
        testPassed = false;
        if (btn) { btn.textContent = '✗ Failed'; btn.style.color = 'rgba(255,100,100,0.9)'; }
      }
      if (btn) { btn.disabled = false; setTimeout(() => { if (btn) { btn.textContent = this._t('pwTest'); btn.style.color = ''; } }, 3000); }
    });

    // Delete (existing indexer only)
    body.querySelector('#pw-form-delete')?.addEventListener('click', async () => {
      const btn = body.querySelector('#pw-form-delete');
      if (!btn) return;
      if (btn.dataset.confirm !== '1') {
        btn.dataset.confirm = '1';
        btn.textContent = 'Confirm?';
        setTimeout(() => { if (btn.dataset.confirm === '1') { btn.dataset.confirm = '0'; btn.textContent = this._t('tlDelete'); } }, 3000);
        return;
      }
      btn.disabled = true; btn.textContent = this._t('pwDeleting');
      try {
        await this._callApi('DELETE', `arr_stack/prowlarr/indexer/${id}`);
        if (this._prowlarr) this._prowlarr.indexers = this._prowlarr.indexers.filter(i => String(i.id) !== String(id));
        el.remove();
        const pwBody = parentEl?.querySelector('#pw-body');
        if (pwBody && this._prowlarrModal?.tab === 'indexers') {
          pwBody.innerHTML = this._pwIndexersTabHtml(this._prowlarr?.indexers || [], this._prowlarrModal);
          this._pwWireIndexers(pwBody, parentEl);
        }
      } catch (err) {
        btn.disabled = false; btn.textContent = this._t('tlDelete');
      }
    });

    // Save
    body.querySelector('#pw-form-save')?.addEventListener('click', async () => {
      // Block save if test not passed — show error + flash button red briefly
      if (!testPassed) {
        const btn = body.querySelector('#pw-form-save');
        if (btn) {
          btn.style.background = 'rgba(248,113,113,0.25)';
          btn.style.color = 'rgba(248,113,113,0.95)';
          setTimeout(() => {
            btn.style.background = 'rgba(99,140,255,0.2)';
            btn.style.color = 'rgba(99,140,255,0.95)';
          }, 800);
        }
        if (!body.querySelector('#pw-test-err')) {
          const errDiv = document.createElement('div');
          errDiv.id = 'pw-test-err';
          errDiv.style.cssText = 'margin-bottom:14px;padding:10px 12px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:8px;font-size:11px;color:rgba(248,113,113,0.9);line-height:1.6';
          errDiv.textContent = this._t('pwRunTestIdx');
          body.prepend(errDiv);
        }
        return;
      }
      const btn = body.querySelector('#pw-form-save');
      if (btn) { btn.disabled = true; btn.textContent = isNew ? this._t('asAdding') : this._t('pwSaving'); }
      const payload = collectPayload();
      delete payload._status; // strip client-side field before sending

      try {
        if (isNew) {
          const created = await this._callApi('POST', 'arr_stack/prowlarr/indexer', payload);
          if (this._prowlarr) this._prowlarr.indexers.push({ ...created, _status: null });
        } else {
          const updated = await this._callApi('PUT', `arr_stack/prowlarr/indexer/${id}`, payload);
          if (this._prowlarr) {
            const idx = this._prowlarr.indexers.findIndex(i => String(i.id) === String(id));
            if (idx >= 0) this._prowlarr.indexers[idx] = { ...updated, _status: this._prowlarr.indexers[idx]._status };
          }
        }
        el.remove();
        // Refresh indexers tab in parent modal
        const pwBody = parentEl?.querySelector('#pw-body');
        if (pwBody && this._prowlarrModal?.tab === 'indexers') {
          pwBody.innerHTML = this._pwIndexersTabHtml(this._prowlarr?.indexers || [], this._prowlarrModal);
          this._pwWireIndexers(pwBody, parentEl);
        }
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = isNew ? this._t('libTagAdd') : this._t('mtSave'); }
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'color:rgba(255,100,100,0.8);font-size:11px;margin-top:8px';
        errDiv.textContent   = err?.body?.message || String(err);
        body.querySelector('#pw-form-save')?.after(errDiv);
      }
    });
  }

}

export const wireProwlarrIndexerFormMixin = _WireProwlarrIndexerFormMethods.prototype;
