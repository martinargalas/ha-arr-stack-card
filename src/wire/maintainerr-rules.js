import { isMobile } from '../shared/ui.js';

// Maintainerr, the Rules tab and the rule editor. Split out of wire/maintainerr.js.

class _WireMaintainerrRulesMethods {

  // Any edit inside the rule editor flips the header Save button to active.
  // Only the first change needs a repaint.
  _mtMarkEditorDirty(el, target) {
    const ed = this._maintainerrModal?.editor;
    if (!ed || ed._dirty || !target) return;
    const isEditorField = (target.id || '').startsWith('mt-ed-')
      || target.hasAttribute?.('data-mt-firstval')
      || target.hasAttribute?.('data-mt-secondval')
      || target.hasAttribute?.('data-mt-action')
      || target.hasAttribute?.('data-mt-val');
    if (!isEditorField) return;
    ed._dirty = true;
    const saveEl = el?.querySelector('#mt-hdr-save');
    if (saveEl) saveEl.innerHTML = this._mtHdrSaveHtml();
  }

  // Same first/prev/next/last vocabulary as _mtParsePage, but for lists whose
  // page count is already known rather than derived from a grid.
  _mtRuleName(id) {
    if (id == null) return '';
    const r = (this._maintainerr?.rules || []).find(x => x.id === id);
    return r?.name || `#${id}`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CRUD operations
  // ──────────────────────────────────────────────────────────────────────────

  async _mtRunRule(id, modal) {
    const m = this._maintainerrModal;
    if (!m || !id) return;
    const rule = (this._maintainerr?.rules || []).find(r => r.id === id);
    const ruleName = rule?.name || `#${id}`;
    m.runningId = id;
    this._mtLoadTab(m.tab, modal);
    try {
      await this._hass.callApi('POST', `arr_stack/maintainerr/rules/${id}/execute`);
      // No per-rule progress is exposed, so the bar only says "still working"
      this._mtShowStatus(`${this._t('mtProcessing')}: ${ruleName}`, modal, 0, { prog: true });
      // The POST only queues the group — hold the spinner until it clears
      await this._mtPollUntil(async () => {
        const s = await this._hass.callApi('GET', 'arr_stack/maintainerr/rules/execute/status');
        return s?.executingRuleGroupId !== id && !(s?.pendingRuleGroupIds || []).includes(id);
      });
      this._mtShowStatus(`${this._t('mtFinishedExec')} '${ruleName}'`, modal);
    } catch (e) {
      console.warn('[arr-card] Maintainerr run rule:', e);
      this._mtShowStatus(`${this._t('mtRunFailed')}: ${e.message || e}`, modal, 8000, { err: true });
    }
    m.runningId = null;
    await this._fetchMaintainerr();
    if (this._maintainerrModal) this._mtLoadTab(m.tab, modal);
  }

  async _mtRunAllRules(modal) {
    const m = this._maintainerrModal;
    if (!m) return;
    try {
      await this._hass.callApi('POST', 'arr_stack/maintainerr/rules/execute');
      m.execStatus = 'running';
      this._mtShowStatus(this._t('mtRunning'), modal, 0, { spin: true, prog: true });
      this._mtLoadTab(m.tab, modal);
      // Maintainerr reports which group is running and which are still pending,
      // so the highest pending count seen is the size of the batch — enough for
      // a real fraction without any per-rule progress from the API.
      let total = 0;
      await this._mtPollUntil(async () => {
        const s = await this._hass.callApi('GET', 'arr_stack/maintainerr/rules/execute/status');
        const pending = (s?.pendingRuleGroupIds || []).length;
        const running = s?.executingRuleGroupId != null ? 1 : 0;
        total = Math.max(total, pending + running);
        const done = Math.max(0, total - pending - running);
        const name = this._mtRuleName(s?.executingRuleGroupId);
        this._mtShowStatus(
          name ? `${this._t('mtProcessing')}: ${name}` : this._t('mtRunning'),
          modal, 0,
          { spin: !name, prog: total > 1 ? { done, total } : true },
        );
        return !s?.processingQueue && !pending;
      }, 1200);
      if (!this._maintainerrModal) return;
      m.execStatus = null;
      this._mtShowStatus(this._t('mtFinishedExecAll'), modal);
      await this._fetchMaintainerr();
      if (this._maintainerrModal) this._mtLoadTab(m.tab, modal);
    } catch (e) {
      console.warn('[arr-card] Maintainerr run all:', e);
      m.execStatus = null;
      this._mtShowStatus(`${this._t('mtRunFailed')}: ${e.message || e}`, modal, 8000, { err: true });
      this._mtLoadTab(m.tab, modal);
    }
  }

  async _mtDeleteRule(id, modal) {
    try {
      await this._hass.callApi('DELETE', `arr_stack/maintainerr/rules/${id}`);
      await this._fetchMaintainerr();
      if (this._maintainerrModal) this._mtLoadTab('rules', modal);
    } catch (e) { console.warn('[arr-card] Maintainerr delete:', e); }
  }

  // Fit the rule list to the space above its pinned footer so it pages rather
  // than scrolls. Card and row heights come from rendered elements, not guesses.
  _mtMeasureRules(el, which = 'rules') {
    const m = this._maintainerrModal;
    if (!m || m.editor || this._mtMeasuring) return;
    const key = which === 'col' ? 'colPerPage' : 'rulesPerPage';
    const wrap = el?.querySelector('#mt-rules-wrap');
    if (!wrap) return;
    const foot = el.querySelector('#mt-rules-foot');
    const top = wrap.getBoundingClientRect().top;
    const bottom = foot ? foot.getBoundingClientRect().top : wrap.getBoundingClientRect().bottom;
    const avail = bottom - top;
    if (avail <= 0) return;

    let fit;
    const grid = wrap.querySelector('#mt-rules-grid');
    if (grid) {
      const card = grid.firstElementChild;
      if (!card) return;
      const GAP = 10, MINW = 280;
      const cols = Math.max(1, Math.floor((wrap.clientWidth + GAP) / (MINW + GAP)));
      const rows = Math.max(1, Math.floor((avail + GAP + 1) / (card.offsetHeight + GAP)));
      fit = cols * rows;
    } else {
      const row = wrap.querySelector('tbody tr') || wrap.firstElementChild?.firstElementChild;
      if (!row?.offsetHeight) return;
      const head = wrap.querySelector('thead');
      fit = Math.max(1, Math.floor((avail - (head?.offsetHeight || 0) + 1) / row.offsetHeight));
    }
    if (!Number.isFinite(fit) || fit === m[key]) return;

    this._mtMeasuring = true;
    try {
      m[key] = fit;
      this._mtLoadTab(which === 'col' ? 'collections' : 'rules', el);
    } finally {
      this._mtMeasuring = false;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Rule editor
  // ──────────────────────────────────────────────────────────────────────────

  async _mtOpenEditor(ruleId, modal) {
    const m = this._maintainerrModal;
    if (!m) return;

    // Lazy-load constants, libraries, arr servers
    if (!this._maintainerrConstants) {
      const body = modal?.querySelector('#mt-body');
      if (body) body.innerHTML = `<div class="is-loading"><span>${this._t('loading')}</span></div>`;
      try {
        const [constants, libraries, radarrSrv, sonarrSrv] = await Promise.all([
          this._hass.callApi('GET', 'arr_stack/maintainerr/rules/constants').catch(() => null),
          this._hass.callApi('GET', 'arr_stack/maintainerr/media-server/libraries').catch(() => null),
          this._hass.callApi('GET', 'arr_stack/maintainerr/settings/radarr').catch(() => null),
          this._hass.callApi('GET', 'arr_stack/maintainerr/settings/sonarr').catch(() => null),
        ]);
        this._maintainerrConstants = constants || {};
        this._maintainerrLibraries = Array.isArray(libraries) ? libraries : [];
        this._maintainerrArrServers = {
          radarr: Array.isArray(radarrSrv) ? radarrSrv : radarrSrv ? [radarrSrv] : [],
          sonarr: Array.isArray(sonarrSrv) ? sonarrSrv : sonarrSrv ? [sonarrSrv] : [],
        };
      } catch (e) { console.warn('[arr-card] Maintainerr constants:', e); }
    }

    if (ruleId != null) {
      const rule = (this._maintainerr?.rules || []).find(r => r.id === ruleId);
      if (rule) {
        const col = rule.collection || {};
        m.editor = {
          id: rule.id,
          name: rule.name || '',
          description: rule.description || '',
          libraryId: rule.libraryId,
          mediaType: rule.dataType || col.type || 'movie',
          arrAction: col.arrAction ?? 0,
          arrServerId: col.radarrSettingsId || col.sonarrSettingsId || null,
          deleteAfterDays: col.deleteAfterDays ?? 30,
          isActive: !!rule.isActive,
          useRules: rule.useRules !== false,
          // Options from collection
          listExclusions: !!col.listExclusions,
          forceSeerr: !!col.forceSeerr,
          visibleOnRecommended: col.visibleOnRecommended !== false,
          visibleOnHome: col.visibleOnHome !== false,
          overlayEnabled: !!col.overlayEnabled,
          manualCollection: !!col.manualCollection,
          tagInArr: !!col.tagInArr,
          keepLogsForMonths: col.keepLogsForMonths ?? 6,
          sortTitle: col.sortTitle || '',
          mediaServerSort: col.mediaServerSort || '',
          manualCollectionName: col.manualCollectionName || '',
          tautulliWatchedPercentOverride: col.tautulliWatchedPercentOverride ?? null,
          ruleHandlerCronSchedule: rule.ruleHandlerCronSchedule || '',
          // Parse flat rules → sections
          sections: this._mtParseRuleSections(rule.rules || []),
        };
      }
    } else {
      m.editor = {
        id: null,
        name: '', description: '',
        libraryId: null, mediaType: 'movie',
        arrAction: 0, arrServerId: null,
        deleteAfterDays: 30, isActive: true, useRules: true,
        listExclusions: false, forceSeerr: false,
        visibleOnRecommended: true, visibleOnHome: true,
        overlayEnabled: false, manualCollection: false, tagInArr: false,
        keepLogsForMonths: 6, sortTitle: '',
        mediaServerSort: '', manualCollectionName: '',
        tautulliWatchedPercentOverride: null,
        ruleHandlerCronSchedule: '',
        // Start with one empty section holding one blank rule, like Maintainerr
        sections: [{ operator: 0, rules: [this._mtBlankRule()] }],
      };
    }

    m.editorSection = 'general';
    this._mtReRenderEditor(modal);
  }

  _mtReRenderEditor(modal) {
    const root = modal || this.shadowRoot.querySelector('[data-mt-modal]');
    const body = root?.querySelector('#mt-body');
    if (body) {
      // The rules list pins its footer and hides overflow; the editor is a
      // normal scrolling document, so undo that here. Display too: .popup-body
      // is a flex column, and in one the sections shrink to fit instead of
      // overflowing — so the content never grows past the frame and there is
      // nothing to scroll.
      body.style.display = 'block';
      body.style.overflowY = 'auto';
      body.style.paddingBottom = isMobile() ? '16px' : '20px';
      body.innerHTML = this._mtRuleEditorHtml();
      // !important because something in the page's stylesheets sets the body's
      // overflow and a plain inline value loses to it — measured: inline said
      // auto while the computed value stayed hidden.
      body.style.setProperty('overflow-y', 'auto', 'important');
    }
    this._mtRefreshTabBtns(root);
  }

  _mtSyncEditorFields(modal) {
    const m = this._maintainerrModal;
    if (!m?.editor) return;
    const ed = m.editor;
    const body = (modal || this.shadowRoot.querySelector('[data-mt-modal]'))?.querySelector('#mt-body');
    if (!body) return;

    // Collapsed accordion sections are not in the DOM. Every read has to leave
    // the stored value alone when its field is missing, otherwise switching
    // section would silently clear whatever is currently hidden.
    const val = id => body.querySelector(id)?.value ?? null;
    const has = id => !!body.querySelector(id);
    const str = (id, cur) => has(id) ? (val(id) ?? cur) : cur;
    const chk = (id, cur) => has(id) ? body.querySelector(id).checked : cur;
    const num = (id, cur, dflt = 0) => {
      if (!has(id)) return cur;
      const n = parseInt(val(id));
      return Number.isFinite(n) ? n : dflt;
    };

    ed.name        = str('#mt-ed-name', ed.name);
    ed.description = str('#mt-ed-desc', ed.description);
    ed.libraryId   = has('#mt-ed-lib') ? (val('#mt-ed-lib') || ed.libraryId) : ed.libraryId;
    ed.mediaType   = has('#mt-ed-media') ? (val('#mt-ed-media') || ed.mediaType) : ed.mediaType;
    ed.arrServerId = has('#mt-ed-arr-srv') ? (val('#mt-ed-arr-srv') || null) : ed.arrServerId;
    ed.arrAction   = num('#mt-ed-arr-action', ed.arrAction);
    ed.deleteAfterDays = num('#mt-ed-del-days', ed.deleteAfterDays, 30);
    ed.isActive    = chk('#mt-ed-active', ed.isActive);
    ed.useRules    = chk('#mt-ed-use-rules', ed.useRules);
    // Options
    ed.listExclusions = chk('#mt-ed-list-exclusions', ed.listExclusions);
    ed.forceSeerr  = chk('#mt-ed-force-seerr', ed.forceSeerr);
    ed.visibleOnRecommended = chk('#mt-ed-vis-recommended', ed.visibleOnRecommended);
    ed.visibleOnHome = chk('#mt-ed-vis-home', ed.visibleOnHome);
    ed.manualCollection = chk('#mt-ed-manual-col', ed.manualCollection);
    ed.manualCollectionName = str('#mt-ed-manual-col-name', ed.manualCollectionName);
    ed.tagInArr    = chk('#mt-ed-tag-arr', ed.tagInArr);
    ed.keepLogsForMonths = num('#mt-ed-keep-logs', ed.keepLogsForMonths, 6);
    ed.sortTitle   = str('#mt-ed-sort-title', ed.sortTitle);
    ed.mediaServerSort = str('#mt-ed-col-sort', ed.mediaServerSort);
    if (has('#mt-ed-tautulli-pct')) {
      const tPct = val('#mt-ed-tautulli-pct');
      ed.tautulliWatchedPercentOverride = tPct !== '' && tPct != null ? parseInt(tPct) : null;
    }
    ed.ruleHandlerCronSchedule = str('#mt-ed-cron', ed.ruleHandlerCronSchedule);

    // Sync rule values from DOM — combined "appId-propId" dropdowns
    (ed.sections || []).forEach((sec, si) => {
      (sec.rules || []).forEach((r, ri) => {
        const key = `${si}-${ri}`;
        const fv = body.querySelector(`[data-mt-firstval="${key}"]`);
        const sv = body.querySelector(`[data-mt-secondval="${key}"]`);
        const action = body.querySelector(`[data-mt-action="${key}"]`);
        const valEl  = body.querySelector(`[data-mt-val="${key}"]`);
        if (fv && fv.value) {
          const [a, p] = fv.value.split('-');
          r.firstVal = [parseInt(a), parseInt(p)];
        } else if (fv) {
          r.firstVal = ['', ''];
        }
        if (sv && sv.value.startsWith('custom-')) {
          r.customValType = parseInt(sv.value.slice(7));
          r.lastVal = null;
        } else if (sv && sv.value) {
          const [a, p] = sv.value.split('-');
          r.lastVal = [parseInt(a), parseInt(p)];
          r.customValType = null;
          r.customVal = '';
        } else if (sv) {
          r.lastVal = null;
          r.customValType = null;
        }
        if (action) r.action = action.value === '' ? null : parseInt(action.value);
        if (valEl)  r.customVal = valEl.value;
      });
    });
  }

  // action stays null until picked so the dropdown shows its placeholder
  _mtBlankRule() {
    return { firstVal: ['', ''], lastVal: null, action: null, customVal: '', customValType: null, operator: 0 };
  }

  _mtAddSection(modal) {
    const m = this._maintainerrModal;
    if (!m?.editor) return;
    this._mtSyncEditorFields(modal);
    m.editor.sections.push({ operator: 0, rules: [this._mtBlankRule()] });
    this._mtReRenderEditor(modal);
  }

  _mtAddRuleToSection(si, modal) {
    const m = this._maintainerrModal;
    if (!m?.editor) return;
    this._mtSyncEditorFields(modal);
    const sec = m.editor.sections[si];
    if (sec) sec.rules.push(this._mtBlankRule());
    this._mtReRenderEditor(modal);
  }

  _mtDeleteEditorRule(key, modal) {
    const m = this._maintainerrModal;
    if (!m?.editor) return;
    this._mtSyncEditorFields(modal);
    const [si, ri] = key.split('-').map(Number);
    const sec = m.editor.sections[si];
    if (sec?.rules) sec.rules.splice(ri, 1);
    this._mtReRenderEditor(modal);
  }

  _mtDeleteSection(si, modal) {
    const m = this._maintainerrModal;
    if (!m?.editor) return;
    this._mtSyncEditorFields(modal);
    m.editor.sections.splice(si, 1);
    this._mtReRenderEditor(modal);
  }

  _mtToggleSectionOp(si, modal) {
    const m = this._maintainerrModal;
    if (!m?.editor) return;
    this._mtSyncEditorFields(modal);
    const sec = m.editor.sections[si];
    if (sec) sec.operator = sec.operator === 1 ? 0 : 1;
    this._mtReRenderEditor(modal);
  }

  _mtToggleRuleOp(key, modal) {
    const m = this._maintainerrModal;
    if (!m?.editor) return;
    this._mtSyncEditorFields(modal);
    const [si, ri] = key.split('-').map(Number);
    const rule = m.editor.sections?.[si]?.rules?.[ri];
    if (rule) rule.operator = rule.operator === 1 ? 0 : 1;
    this._mtReRenderEditor(modal);
  }

  async _mtSaveRule(modal) {
    const m = this._maintainerrModal;
    if (!m?.editor) return;
    this._mtSyncEditorFields(modal);
    const ed = m.editor;

    // Maintainerr stores each rule as JSON.stringify(rule) of the raw RuleDto,
    // so the array must hold plain rule objects — not { ruleJson, isActive }
    // wrappers, which would end up double-encoded in the DB.
    const flatRules = [];
    (ed.sections || []).forEach((sec, si) => {
      // Untouched blank rows (no property picked yet) are not sent
      const filled = (sec.rules || []).filter(r => r.firstVal?.[0] !== '' && r.firstVal?.[0] != null && r.action != null);
      filled.forEach((r, ri) => {
        // The server validates operators over the flat array: every rule after
        // the very first one needs a non-null operator. The first rule of a
        // later section carries that section's operator.
        let operator = null;
        if (flatRules.length > 0) operator = (ri === 0 ? sec.operator : r.operator) ?? 0;

        const rule = {
          firstVal: [Number(r.firstVal[0]), Number(r.firstVal[1])],
          action: parseInt(r.action) || 0,
          section: si,
          operator,
        };
        // customVal — only when Second Value is a custom type (not an app property)
        if (r.customValType != null && !r.lastVal) {
          const cvType = Number(r.customValType);
          let cvVal = String(r.customVal ?? '');
          // BOOL is compared via `+value` server-side, so it has to stay numeric
          if (cvType === 3) cvVal = (cvVal === 'true' || cvVal === '1') ? '1' : '0';
          rule.customVal = { ruleTypeId: cvType, value: cvVal };
        }
        // lastVal (app property as second value)
        if (r.lastVal) rule.lastVal = [Number(r.lastVal[0]), Number(r.lastVal[1])];

        flatRules.push(rule);
      });
    });

    const origCol = ed.id
      ? ((this._maintainerr?.rules || []).find(r => r.id === ed.id)?.collection || {})
      : {};

    // Everything the *arr/Plex action needs lives at the top level of RulesDto;
    // only the presentation/retention fields are read off `collection`.
    const payload = {
      name: ed.name,
      description: ed.description,
      libraryId: ed.libraryId ? String(ed.libraryId) : null,
      isActive: ed.isActive,
      useRules: ed.useRules,
      dataType: ed.mediaType,
      ruleHandlerCronSchedule: ed.ruleHandlerCronSchedule || null,
      arrAction: parseInt(ed.arrAction) || 0,
      listExclusions: !!ed.listExclusions,
      forceSeerr: !!ed.forceSeerr,
      tagInArr: !!ed.tagInArr,
      tautulliWatchedPercentOverride: ed.tautulliWatchedPercentOverride ?? null,
      radarrSettingsId: null,
      sonarrSettingsId: null,
      radarrQualityProfileId: origCol.radarrQualityProfileId ?? null,
      sonarrQualityProfileId: origCol.sonarrQualityProfileId ?? null,
      rules: flatRules,
      collection: {
        deleteAfterDays: parseInt(ed.deleteAfterDays) || null,
        visibleOnRecommended: !!ed.visibleOnRecommended,
        visibleOnHome: !!ed.visibleOnHome,
        overlayEnabled: !!(ed.overlayEnabled ?? origCol.overlayEnabled),
        overlayTemplateId: origCol.overlayTemplateId ?? null,
        manualCollection: !!ed.manualCollection,
        manualCollectionName: ed.manualCollectionName ?? origCol.manualCollectionName ?? '',
        keepLogsForMonths: parseInt(ed.keepLogsForMonths) || 6,
        sortTitle: ed.sortTitle || null,
        mediaServerSort: ed.mediaServerSort || null,
      },
    };

    if (ed.arrServerId) {
      if (ed.mediaType === 'movie') payload.radarrSettingsId = parseInt(ed.arrServerId);
      else payload.sonarrSettingsId = parseInt(ed.arrServerId);
    }

    try {
      let res;
      if (ed.id) {
        payload.id = ed.id;
        res = await this._hass.callApi('PUT', 'arr_stack/maintainerr/rules', payload);
      } else {
        res = await this._hass.callApi('POST', 'arr_stack/maintainerr/rules', payload);
      }
      // Maintainerr answers 200 even on validation failures: { code: 0, result }
      if (res && res.code === 0) {
        this._mtShowStatus(`Save failed: ${res.result || 'unknown error'}`, modal, 8000, { err: true });
        return;
      }
      m.editor = null;
      await this._fetchMaintainerr();
      if (this._maintainerrModal) this._mtLoadTab('rules', modal);
    } catch (e) {
      console.warn('[arr-card] Maintainerr save:', e);
      this._mtShowStatus(`Save failed: ${e.message || e}`, modal, 8000, { err: true });
    }
  }

}

export const wireMaintainerrRulesMixin = _WireMaintainerrRulesMethods.prototype;
