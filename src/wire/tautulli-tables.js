// Tautulli, the History, Libraries and Users tabs. Split out of wire/tautulli.js.

class _WireTautulliTablesMethods {

  // The History tab: search, filters, per page, columns, delete, paging.
  // Wired from _wireTautulliModalBody; _q/_qa bind each node once.
  _tlWireHistory(body, _q, _qa) {
    // ── History: search ───────────────────────────────────────────────────
    {
      let _histSearchTimer = null;
      _q('#tl-hist-search')?.addEventListener('input', e => {
        if (!this._tautulliModal) return;
        this._tautulliModal.histSearch = e.target.value || '';
        this._tautulliModal.histPage   = 0;
        clearTimeout(_histSearchTimer);
        _histSearchTimer = setTimeout(async () => {
          const inp0 = body.querySelector('#tl-hist-search');
          const sel0 = inp0?.selectionStart ?? null;
          await this._tlRefetchHistory(body);
          const inp = body.querySelector('#tl-hist-search');
          if (inp && sel0 !== null) { inp.focus(); inp.setSelectionRange(sel0, sel0); }
        }, 400);
      });
    }

    // ── History ───────────────────────────────────────────────────────────
    _q('#tl-hist-user-sel')?.addEventListener('change', async e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.histUser = e.target.value || null;
      this._tautulliModal.histPage = 0;
      await this._tlRefetchHistory(body);
    });

    // Pickers now, not toggle buttons: an empty value means "no filter".
    _q('#tl-hist-media')?.addEventListener('change', async e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.histMedia = e.target.value || null;
      this._tautulliModal.histPage  = 0;
      await this._tlRefetchHistory(body);
    });

    _q('#tl-hist-play')?.addEventListener('change', async e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.histPlayback = e.target.value || null;
      this._tautulliModal.histPage     = 0;
      await this._tlRefetchHistory(body);
    });

    _q('#tl-hist-perpage')?.addEventListener('change', async e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.histPerPage = parseInt(e.target.value) || 25;
      this._tautulliModal.histPage    = 0;
      await this._tlRefetchHistory(body);
    });

    _q('#tl-hist-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.histColsOpen = !this._tautulliModal.histColsOpen;
      const menu = body.querySelector('#tl-hist-cols-menu');
      if (menu) menu.style.display = this._tautulliModal.histColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });

    _qa('[data-tl-hist-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden('histHiddenCols', ['ip','paused','stopped']);
        const col = item.dataset.tlHistCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.histColsOpen = true;
        body.innerHTML = this._tlBodyHistory();
        this._wireTautulliModalBody(body);
      });
    });

    _q('#tl-hist-mob-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.histMobColsOpen = !this._tautulliModal.histMobColsOpen;
      const menu = body.querySelector('#tl-hist-mob-cols-menu');
      if (menu) menu.style.display = this._tautulliModal.histMobColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });

    _qa('[data-tl-hist-mob-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden('histMobHiddenCols', ['ip','platform','product','player','paused','stopped']);
        const col = item.dataset.tlHistMobCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.histMobColsOpen = true;
        body.innerHTML = this._tlBodyHistory();
        this._wireTautulliModalBody(body);
      });
    });

    _qa('[data-tl-hpage]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        const m          = this._tautulliModal;
        const totalPages = Math.max(1, Math.ceil(m.histTotal / (m.histPerPage || 25)));
        const val        = btn.dataset.tlHpage;
        let p = m.histPage || 0;
        if      (val === 'first') p = 0;
        else if (val === 'prev')  p = Math.max(0, p - 1);
        else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
        else if (val === 'last')  p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.histPage) return;
        m.histPage = p;
        await this._tlRefetchHistory(body);
      });
    });

    // First click arms the row, second confirms — no browser dialog, and the
    // results are patched so the toolbar and its search stay put.
    const _histRedraw = () => {
      this._patchResultsWrap(body, 'tl-hist-results-wrap', () => this._tlBodyHistory());
      this._wireTautulliModalBody(body);
    };

    _qa('[data-tl-hist-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        this._tautulliModal.histDelId = String(btn.dataset.tlHistDelete);
        _histRedraw();
      });
    });

    _qa('[data-tl-hist-delete-no]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        this._tautulliModal.histDelId = null;
        _histRedraw();
      });
    });

    _qa('[data-tl-hist-delete-yes]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        btn.disabled = true;
        await this._tlApiFetch('delete_history', `row_id=${btn.dataset.tlHistDeleteYes}`);
        if (this._tautulliModal) this._tautulliModal.histDelId = null;
        await this._tlRefetchHistory(body);
      });
    });
  }

  // The Libraries tab: search, per page, sort, paging, edit, columns, delete and purge.
  // Wired from _wireTautulliModalBody; _q/_qa bind each node once.
  _tlWireLibraries(body, _q, _qa) {
    // ── Libraries: search ────────────────────────────────────────────────
    _q('#tl-libs-search')?.addEventListener('input', e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.libsSearch = e.target.value || '';
      this._tautulliModal.libsPage   = 0;
      // Patch only the results subtree — keeps #tl-libs-search untouched so the iOS
      // keyboard stays open while typing (recreating the input node closes it).
      this._patchResultsWrap(body, 'tl-libs-results-wrap', () => this._tlBodyLibraries(this._tautulliModal.libsData, this._tautulliModal.libsTotal));
      this._wireTautulliModalBody(body);
    });

    // ── Libraries: per-page / sort / page ─────────────────────────────────
    _q('#tl-libs-perpage')?.addEventListener('change', async e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.libsPerPage = parseInt(e.target.value);
      this._tautulliModal.libsPage    = 0;
      await this._tlRefetchLibraries(body);
    });

    _qa('[data-tl-lib-sort]').forEach(th => {
      th.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        const col = th.dataset.tlLibSort;
        if (this._tautulliModal.libsSortCol === col) {
          this._tautulliModal.libsSortDir = this._tautulliModal.libsSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this._tautulliModal.libsSortCol = col;
          this._tautulliModal.libsSortDir = 'desc';
        }
        this._tautulliModal.libsPage = 0;
        await this._tlRefetchLibraries(body);
      });
    });

    _qa('[data-tl-lpage]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        const m = this._tautulliModal;
        const totalPages = Math.max(1, Math.ceil(m.libsTotal / m.libsPerPage));
        const val = btn.dataset.tlLpage;
        let p = m.libsPage;
        if      (val === 'first') p = 0;
        else if (val === 'prev')  p = Math.max(0, p - 1);
        else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
        else if (val === 'last')  p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.libsPage) return;
        m.libsPage = p;
        await this._tlRefetchLibraries(body);
      });
    });

    // Libraries: edit + cols
    _q('#tl-libs-edit-btn')?.addEventListener('click', () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.libsEditMode = !this._tautulliModal.libsEditMode;
      body.innerHTML = this._tlBodyLibraries(this._tautulliModal.libsData, this._tautulliModal.libsTotal);
      this._wireTautulliModalBody(body);
    });

    _q('#tl-libs-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.libsColsOpen = !this._tautulliModal.libsColsOpen;
      const menu = body.querySelector('#tl-libs-cols-menu');
      if (menu) menu.style.display = this._tautulliModal.libsColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });

    _qa('[data-tl-lib-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden('libsHiddenCols', ['type']);
        const col = item.dataset.tlLibCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.libsColsOpen = true;
        body.innerHTML = this._tlBodyLibraries(this._tautulliModal.libsData, this._tautulliModal.libsTotal);
        this._wireTautulliModalBody(body);
      });
    });

    _q('#tl-libs-mob-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.libsMobColsOpen = !this._tautulliModal.libsMobColsOpen;
      const menu = body.querySelector('#tl-libs-mob-cols-menu');
      if (menu) menu.style.display = this._tautulliModal.libsMobColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });

    _qa('[data-tl-lib-mob-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden('libsMobHiddenCols', ['type','parents','children','lastStream']);
        const col = item.dataset.tlLibMobCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.libsMobColsOpen = true;
        body.innerHTML = this._tlBodyLibraries(this._tautulliModal.libsData, this._tautulliModal.libsTotal);
        this._wireTautulliModalBody(body);
      });
    });

    // Libraries: delete / purge
    _qa('[data-tl-lib-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const sid = btn.dataset.tlLibDelete;
        if (!sid) return;
        this._confirmInline(btn, async () => {
          await this._tlApiFetch('delete_library', `section_id=${sid}`);
          await this._tlRefetchLibraries(body);
        }, 'Remove library from Tautulli?');
      });
    });

    _qa('[data-tl-lib-purge]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const sid = btn.dataset.tlLibPurge;
        if (!sid) return;
        this._confirmInline(btn, async () => {
          // Tautulli rejects this one without a server id — "No server id and
          // section id or row ids received." The id is the Plex machine
          // identifier, which get_servers_info reports.
          const srv = await this._tlApiFetch('get_servers_info');
          const machineId = srv?.response?.data?.[0]?.machine_identifier || '';
          await this._tlApiFetch('delete_all_library_history',
            `section_id=${sid}${machineId ? `&server_id=${machineId}` : ''}`);
          await this._tlRefetchLibraries(body);
        }, 'Erase all history for this library?');
      });
    });
  }

  // The Users tab: search, per page, sort, paging, edit, columns, delete, purge, toggles.
  // Wired from _wireTautulliModalBody; _q/_qa bind each node once.
  _tlWireUsers(body, _q, _qa) {
    // ── Users: search ────────────────────────────────────────────────────
    _q('#tl-users-search')?.addEventListener('input', e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.usersSearch = e.target.value || '';
      this._tautulliModal.usersPage   = 0;
      // Patch only the results subtree — keeps #tl-users-search untouched so the iOS
      // keyboard stays open while typing (recreating the input node closes it).
      this._patchResultsWrap(body, 'tl-users-results-wrap', () => this._tlBodyUsers(this._tautulliModal.usersData, this._tautulliModal.usersTotal));
      this._wireTautulliModalBody(body);
    });

    // ── Users: per-page / sort / page ──────────────────────────────────────
    _q('#tl-users-perpage')?.addEventListener('change', async e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.usersPerPage = parseInt(e.target.value);
      this._tautulliModal.usersPage    = 0;
      await this._tlRefetchUsers(body);
    });

    _qa('[data-tl-sort]').forEach(th => {
      th.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        const col = th.dataset.tlSort;
        if (this._tautulliModal.usersSortCol === col) {
          this._tautulliModal.usersSortDir = this._tautulliModal.usersSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this._tautulliModal.usersSortCol = col;
          this._tautulliModal.usersSortDir = 'desc';
        }
        this._tautulliModal.usersPage = 0;
        await this._tlRefetchUsers(body);
      });
    });

    _qa('[data-tl-upage]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        const m = this._tautulliModal;
        const totalPages = Math.max(1, Math.ceil(m.usersTotal / m.usersPerPage));
        const val = btn.dataset.tlUpage;
        let p = m.usersPage;
        if      (val === 'first') p = 0;
        else if (val === 'prev')  p = Math.max(0, p - 1);
        else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
        else if (val === 'last')  p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.usersPage) return;
        m.usersPage = p;
        await this._tlRefetchUsers(body);
      });
    });

    // Users: edit + cols
    _q('#tl-users-edit-btn')?.addEventListener('click', () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.usersEditMode = !this._tautulliModal.usersEditMode;
      body.innerHTML = this._tlBodyUsers(this._tautulliModal.usersData, this._tautulliModal.usersTotal);
      this._wireTautulliModalBody(body);
    });

    _q('#tl-users-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.usersColsOpen = !this._tautulliModal.usersColsOpen;
      const menu = body.querySelector('#tl-users-cols-menu');
      if (menu) menu.style.display = this._tautulliModal.usersColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });

    _qa('[data-tl-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden('usersHiddenCols', ['username','fullname','email']);
        const col = item.dataset.tlCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.usersColsOpen = true;
        body.innerHTML = this._tlBodyUsers(this._tautulliModal.usersData, this._tautulliModal.usersTotal);
        this._wireTautulliModalBody(body);
      });
    });

    _q('#tl-users-mob-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.usersMobColsOpen = !this._tautulliModal.usersMobColsOpen;
      const menu = body.querySelector('#tl-users-mob-cols-menu');
      if (menu) menu.style.display = this._tautulliModal.usersMobColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });

    _qa('[data-tl-usr-mob-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden('usersMobHiddenCols', ['lastPlayed','platform','player','ip','username','email']);
        const col = item.dataset.tlUsrMobCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.usersMobColsOpen = true;
        body.innerHTML = this._tlBodyUsers(this._tautulliModal.usersData, this._tautulliModal.usersTotal);
        this._wireTautulliModalBody(body);
      });
    });

    // Users: delete / purge / toggles
    _qa('[data-tl-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const uid = btn.dataset.tlDelete;
        if (!uid) return;
        this._confirmInline(btn, async () => {
          await this._tlApiFetch('delete_user', `user_id=${uid}`);
          await this._tlRefetchUsers(body);
        }, 'Remove user from Tautulli?');
      });
    });

    _qa('[data-tl-purge]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const uid = btn.dataset.tlPurge;
        // Tautulli happily accepts an empty user_id and wipes history for it,
        // so a row without an id must never reach the API.
        if (!uid) return;
        this._confirmInline(btn, async () => {
          await this._tlApiFetch('delete_all_user_history', `user_id=${uid}`);
          await this._tlRefetchUsers(body);
        }, 'Erase all history for this user?');
      });
    });

    _qa('[data-tl-toggle-hist]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        const uid = btn.dataset.tlToggleHist;
        const cur = parseInt(btn.dataset.tlKh || '1');
        btn.style.opacity = '0.5'; btn.disabled = true;
        await this._tlApiFetch('edit_user', `user_id=${uid}&keep_history=${cur ? 0 : 1}`);
        await this._tlRefetchUsers(body);
      });
    });

    _qa('[data-tl-toggle-guest]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        const uid = btn.dataset.tlToggleGuest;
        const cur = parseInt(btn.dataset.tlAg || '0');
        btn.style.opacity = '0.5'; btn.disabled = true;
        await this._tlApiFetch('edit_user', `user_id=${uid}&allow_guest=${cur ? 0 : 1}`);
        await this._tlRefetchUsers(body);
      });
    });
  }

}

export const wireTautulliTablesMixin = _WireTautulliTablesMethods.prototype;
