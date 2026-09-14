// Tautulli, one user, library or title in detail: opening, refetching, wiring. Split out of wire/tautulli.js.

class _WireTautulliDetailsMethods {

  // User rows, and one user in detail: tabs, recently played, history, IPs.
  // Wired from _wireTautulliModalBody; _q/_qa bind each node once.
  _tlWireUserDetail(body, _q, _qa) {
    // ── User rows: click to open user detail ─────────────────────────────
    _qa('[data-tl-ud-open]').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        if (!this._tautulliModal) return;
        this._tlOpenUserDetail(row.dataset.tlUdOpen, row.dataset.tlUdName, row.dataset.tlUdThumb, body);
      });
    });

    // ── User detail: back button ──────────────────────────────────────────
    _q('[data-tl-ud-back]')?.addEventListener('click', () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.userDetailId = null;
      body.style.overflowY = '';
      body.innerHTML = this._tlBodyUsers(this._tautulliModal.usersData, this._tautulliModal.usersTotal);
      this._wireTautulliModalBody(body);
    });

    // ── User detail: tab switching ────────────────────────────────────────
    _qa('[data-tl-ud-tab]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        const tab = btn.dataset.tlUdTab;
        this._tautulliModal.userDetailTab = tab;
        if (tab === 'history' && !this._tautulliModal.userDetailHistData?.length) {
          body.innerHTML = this._tlBodyUserDetail();
          this._wireTautulliModalBody(body);
          await this._tlRefetchUdHistory(body);
          return;
        }
        if (tab === 'ips' && !this._tautulliModal.userDetailIpsData?.length) {
          body.innerHTML = this._tlBodyUserDetail();
          this._wireTautulliModalBody(body);
          const ips = await this._tlFetchUserIps(this._tautulliModal.userDetailId);
          if (!this._tautulliModal) return;
          this._tautulliModal.userDetailIpsData = ips;
        }
        body.innerHTML = this._tlBodyUserDetail();
        this._wireTautulliModalBody(body);
        if (tab === 'profile') this._tlLoadUdThumbs(body);
      });
    });

    // ── User detail: recently played chevrons ─────────────────────────────
    {
      const recScroll = body.querySelector('#tl-ud-rec-scroll');
      // Bound once per row: the body is wired again after every refresh, and a
      // second listener, counting pages from zero, sent the row back each click.
      if (recScroll && !recScroll._tlRecWired) {
        recScroll._tlRecWired = true;
        const prevBtn = body.querySelector('.tl-ud-rec-prev');
        const nextBtn = body.querySelector('.tl-ud-rec-next');
        const pages   = recScroll.querySelectorAll(':scope > div');
        let   curPage = 0;
        const goTo = (idx) => {
          curPage = Math.max(0, Math.min(pages.length - 1, idx));
          const pageW = recScroll.offsetWidth || recScroll.scrollWidth / pages.length;
          recScroll.scrollTo({ left: curPage * pageW, behavior: 'smooth' });
          if (prevBtn) prevBtn.disabled = curPage === 0;
          if (nextBtn) nextBtn.disabled = curPage >= pages.length - 1;
        };
        if (prevBtn) prevBtn.addEventListener('click', () => goTo(curPage - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => goTo(curPage + 1));
        if (nextBtn && pages.length <= 1) nextBtn.disabled = true;
      }
    }

    // ── User detail history: search ───────────────────────────────────────
    {
      let _udHistSearchTimer = null;
      _q('#tl-ud-hist-search')?.addEventListener('input', e => {
        if (!this._tautulliModal) return;
        this._tautulliModal.userDetailHistSearch = e.target.value || '';
        this._tautulliModal.userDetailHistPage   = 0;
        clearTimeout(_udHistSearchTimer);
        _udHistSearchTimer = setTimeout(async () => {
          const inp0 = body.querySelector('#tl-ud-hist-search');
          const sel0 = inp0?.selectionStart ?? null;
          await this._tlRefetchUdHistory(body);
          const inp = body.querySelector('#tl-ud-hist-search');
          if (inp && sel0 !== null) { inp.focus(); inp.setSelectionRange(sel0, sel0); }
        }, 400);
      });
    }

    // ── User detail history: media filter ────────────────────────────────
    // Pickers now, not toggle pills.
    _q('#tl-ud-hist-media')?.addEventListener('change', async e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.userDetailHistMedia = e.target.value || null;
      this._tautulliModal.userDetailHistPage  = 0;
      await this._tlRefetchUdHistory(body);
    });

    // ── User detail history: playback filter ─────────────────────────────
    _q('#tl-ud-hist-play')?.addEventListener('change', async e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.userDetailHistPlayback = e.target.value || null;
      this._tautulliModal.userDetailHistPage     = 0;
      await this._tlRefetchUdHistory(body);
    });

    // ── User detail history: delete mode ─────────────────────────────────
    // ── User detail history: col picker (desktop) ─────────────────────────
    _q('#tl-ud-hist-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.userDetailHistColsOpen = !this._tautulliModal.userDetailHistColsOpen;
      const menu = body.querySelector('#tl-ud-hist-cols-menu');
      if (menu) menu.style.display = this._tautulliModal.userDetailHistColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });

    _qa('[data-tl-ud-hist-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden('userDetailHistHiddenCols', ['ip','paused','stopped']);
        const col = item.dataset.tlUdHistCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.userDetailHistColsOpen = true;
        body.innerHTML = this._tlBodyUserDetail();
        this._wireTautulliModalBody(body);
      });
    });

    // ── User detail history: col picker (mobile) ──────────────────────────
    _q('#tl-ud-hist-mob-cols-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      if (!this._tautulliModal) return;
      this._tautulliModal.userDetailHistMobColsOpen = !this._tautulliModal.userDetailHistMobColsOpen;
      const menu = body.querySelector('#tl-ud-hist-mob-cols-menu');
      if (menu) menu.style.display = this._tautulliModal.userDetailHistMobColsOpen ? 'block' : 'none';
      this._floatMenu(e.currentTarget, menu);
    });

    _qa('[data-tl-ud-hist-mob-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const hidden = this._tlHidden('userDetailHistMobHiddenCols', ['ip','platform','product','player','paused','stopped']);
        const col = item.dataset.tlUdHistMobCol;
        if (hidden.has(col)) hidden.delete(col); else hidden.add(col);
        this._tlSaveColPrefs();
        this._tautulliModal.userDetailHistMobColsOpen = true;
        body.innerHTML = this._tlBodyUserDetail();
        this._wireTautulliModalBody(body);
      });
    });

    // ── User detail history: expandable rows ─────────────────────────────
    _qa('.tl-ud-hist-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        if (!this._tautulliModal) return;
        const rid = row.dataset.tlUdHistRow;
        const m = this._tautulliModal;
        m.userDetailHistExpandedRow = m.userDetailHistExpandedRow === rid ? null : rid;
        body.innerHTML = this._tlBodyUserDetail();
        this._wireTautulliModalBody(body);
      });
    });

    // ── User detail history: delete ───────────────────────────────────────
    _qa('[data-tl-ud-hist-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const rid = btn.dataset.tlUdHistDelete;
        this._confirmInline(btn, async () => {
          await this._tlApiFetch('delete_history', `row_id=${rid}`);
          await this._tlRefetchUdHistory(body);
        }, 'Delete this entry?');
      });
    });

    // ── User detail history: pagination ──────────────────────────────────
    _qa('[data-tl-ud-hpage]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        const m = this._tautulliModal;
        const totalPages = Math.max(1, Math.ceil(m.userDetailHistTotal / this._tlCalcPerPage({ hasFilter: true })));
        const val = btn.dataset.tlUdHpage;
        let p = m.userDetailHistPage || 0;
        if      (val === 'first') p = 0;
        else if (val === 'prev')  p = Math.max(0, p - 1);
        else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
        else if (val === 'last')  p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.userDetailHistPage) return;
        m.userDetailHistPage = p;
        await this._tlRefetchUdHistory(body);
      });
    });

    // ── User detail IPs: sort ─────────────────────────────────────────────
    _qa('[data-tl-ud-ip-sort]').forEach(th => {
      th.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const col = th.dataset.tlUdIpSort;
        const m   = this._tautulliModal;
        if (m.userDetailIpsSortCol === col) {
          m.userDetailIpsSortDir = m.userDetailIpsSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          m.userDetailIpsSortCol = col;
          m.userDetailIpsSortDir = 'desc';
        }
        m.userDetailIpsPage = 0;
        body.innerHTML = this._tlBodyUserDetail();
        this._wireTautulliModalBody(body);
      });
    });

    // ── User detail IPs: pagination ───────────────────────────────────────
    _qa('[data-tl-ud-ippage]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const m = this._tautulliModal;
        const totalPages = Math.max(1, Math.ceil((m.userDetailIpsData || []).length / this._tlCalcPerPage()));
        const val = btn.dataset.tlUdIppage;
        let p = m.userDetailIpsPage || 0;
        if      (val === 'first') p = 0;
        else if (val === 'prev')  p = Math.max(0, p - 1);
        else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
        else if (val === 'last')  p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.userDetailIpsPage) return;
        m.userDetailIpsPage = p;
        body.innerHTML = this._tlBodyUserDetail();
        this._wireTautulliModalBody(body);
      });
    });
  }

  // Library rows, and one library in detail: tabs, recently played, history, media.
  // Wired from _wireTautulliModalBody; _q/_qa bind each node once.
  _tlWireLibDetail(body, _q, _qa) {
    // ── Library rows: click to open library detail ───────────────────────
    _qa('[data-tl-ld-open]').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        if (!this._tautulliModal) return;
        this._tlOpenLibDetail(row.dataset.tlLdOpen, row.dataset.tlLdName, body);
      });
    });

    // ── Library detail: back ─────────────────────────────────────────────
    _q('[data-tl-ld-back]')?.addEventListener('click', () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.libDetailId = null;
      body.style.overflowY = '';
      body.innerHTML = this._tlBodyLibraries(this._tautulliModal.libsData, this._tautulliModal.libsTotal);
      this._wireTautulliModalBody(body);
    });

    // ── Library detail: tab switching ────────────────────────────────────
    _qa('[data-tl-ld-tab]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        const m   = this._tautulliModal;
        const tab = btn.dataset.tlLdTab;
        m.libDetailTab = tab;
        if (tab === 'history' && !m.libDetailHistData?.length) {
          body.innerHTML = this._tlBodyLibDetail();
          this._wireTautulliModalBody(body);
          await this._tlRefetchLdHistory(body);
          return;
        }
        if (tab === 'media' && !m.libDetailMediaData?.length) {
          body.innerHTML = this._tlBodyLibDetail();
          this._wireTautulliModalBody(body);
          await this._tlRefetchLdMedia(body);
          return;
        }
        body.innerHTML = this._tlBodyLibDetail();
        this._wireTautulliModalBody(body);
        if (tab === 'profile') this._tlLoadUdThumbs(body);
      });
    });

    // ── Library detail recently played chevrons ──────────────────────────
    {
      const recScroll = body.querySelector('#tl-ld-rec-scroll');
      // Bound once per row: the body is wired again after every refresh, and a
      // second listener, counting pages from zero, sent the row back each click.
      if (recScroll && !recScroll._tlRecWired) {
        recScroll._tlRecWired = true;
        const prevBtn = body.querySelector('.tl-ld-rec-prev');
        const nextBtn = body.querySelector('.tl-ld-rec-next');
        const pages   = recScroll.querySelectorAll(':scope > div');
        let curPage   = 0;
        const goTo = (idx) => {
          curPage = Math.max(0, Math.min(pages.length - 1, idx));
          const pageW = recScroll.offsetWidth || recScroll.scrollWidth / pages.length;
          recScroll.scrollTo({ left: curPage * pageW, behavior: 'smooth' });
          if (prevBtn) prevBtn.disabled = curPage === 0;
          if (nextBtn) nextBtn.disabled = curPage >= pages.length - 1;
        };
        if (prevBtn) prevBtn.addEventListener('click', () => goTo(curPage - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => goTo(curPage + 1));
        if (nextBtn && pages.length <= 1) nextBtn.disabled = true;
      }
    }

    // ── Library detail history: filters ─────────────────────────────────
    _q('#tl-ld-hist-media')?.addEventListener('change', async e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.libDetailHistMedia = e.target.value || null;
      this._tautulliModal.libDetailHistPage  = 0;
      await this._tlRefetchLdHistory(body);
    });
    _q('#tl-ld-hist-play')?.addEventListener('change', async e => {
      if (!this._tautulliModal) return;
      this._tautulliModal.libDetailHistPlayback = e.target.value || null;
      this._tautulliModal.libDetailHistPage     = 0;
      await this._tlRefetchLdHistory(body);
    });
    {
      let _ldHistSearchTimer = null;
      _q('#tl-ld-hist-search')?.addEventListener('input', e => {
        if (!this._tautulliModal) return;
        this._tautulliModal.libDetailHistSearch = e.target.value || '';
        this._tautulliModal.libDetailHistPage   = 0;
        clearTimeout(_ldHistSearchTimer);
        _ldHistSearchTimer = setTimeout(() => this._tlRefetchLdHistory(body), 400);
      });
    }
    _qa('[data-tl-ld-hist-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const col = item.dataset.tlLdHistCol;
        const s   = this._tautulliModal.libDetailHistHiddenCols;
        s.has(col) ? s.delete(col) : s.add(col);
        this._tlSaveColPrefs();
        body.innerHTML = this._tlBodyLibDetail();
        this._wireTautulliModalBody(body);
      });
    });
    _qa('[data-tl-ld-hist-mob-col]').forEach(item => {
      item.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const col = item.dataset.tlLdHistMobCol;
        const s   = this._tautulliModal.libDetailHistMobHiddenCols;
        s.has(col) ? s.delete(col) : s.add(col);
        this._tlSaveColPrefs();
        body.innerHTML = this._tlBodyLibDetail();
        this._wireTautulliModalBody(body);
      });
    });
    _q('[data-tl-ld-hist-cols-btn]')?.addEventListener('click', () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.libDetailHistColsOpen = !this._tautulliModal.libDetailHistColsOpen;
      body.innerHTML = this._tlBodyLibDetail(); this._wireTautulliModalBody(body);
    });
    _q('[data-tl-ld-hist-mob-cols-btn]')?.addEventListener('click', () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.libDetailHistMobColsOpen = !this._tautulliModal.libDetailHistMobColsOpen;
      body.innerHTML = this._tlBodyLibDetail(); this._wireTautulliModalBody(body);
    });
    _qa('[data-tl-ld-hist-row]').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        if (!this._tautulliModal) return;
        const rid = row.dataset.tlLdHistRow;
        this._tautulliModal.libDetailHistExpandedRow = this._tautulliModal.libDetailHistExpandedRow === rid ? null : rid;
        body.innerHTML = this._tlBodyLibDetail();
        this._wireTautulliModalBody(body);
      });
    });
    _qa('[data-tl-ld-hist-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._tautulliModal) return;
        const rid = btn.dataset.tlLdHistDelete;
        if (!rid) return;
        // It deleted on the first click before — now it asks first, like the
        // other history views.
        this._confirmInline(btn, async () => {
          await this._tlApiFetch('delete_history', `row_id=${rid}`);
          await this._tlRefetchLdHistory(body);
        }, 'Delete this entry?');
      });
    });
    _qa('[data-tl-ld-hpage]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const m = this._tautulliModal; if (!m) return;
        const val = btn.dataset.tlLdHpage;
        const perPage = this._tlCalcPerPage({ hasFilter: true });
        const totalPages = Math.max(1, Math.ceil(m.libDetailHistTotal / perPage));
        let p = m.libDetailHistPage || 0;
        if (val === 'first') p = 0;
        else if (val === 'prev')  p = Math.max(0, p - 1);
        else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
        else if (val === 'last')  p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.libDetailHistPage) return;
        m.libDetailHistPage = p;
        await this._tlRefetchLdHistory(body);
      });
    });

    // ── Library detail media: search + sort + pagination ─────────────────
    {
      let _ldMediaSearchTimer = null;
      _q('#tl-ld-media-search')?.addEventListener('input', e => {
        if (!this._tautulliModal) return;
        this._tautulliModal.libDetailMediaSearch = e.target.value || '';
        this._tautulliModal.libDetailMediaPage   = 0;
        clearTimeout(_ldMediaSearchTimer);
        _ldMediaSearchTimer = setTimeout(() => this._tlRefetchLdMedia(body), 400);
      });
    }
    _qa('[data-tl-ld-media-sort]').forEach(th => {
      th.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        this._tautulliModal.libDetailMediaSort = th.dataset.tlLdMediaSort;
        this._tautulliModal.libDetailMediaDir  = th.dataset.tlLdMediaDir;
        this._tautulliModal.libDetailMediaPage = 0;
        await this._tlRefetchLdMedia(body);
      });
    });
    _qa('[data-tl-ld-mpage]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const m = this._tautulliModal; if (!m) return;
        const val = btn.dataset.tlLdMpage;
        const totalPages = Math.max(1, Math.ceil(m.libDetailMediaTotal / 25));
        let p = m.libDetailMediaPage || 0;
        if (val === 'first') p = 0;
        else if (val === 'prev')  p = Math.max(0, p - 1);
        else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
        else if (val === 'last')  p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.libDetailMediaPage) return;
        m.libDetailMediaPage = p;
        await this._tlRefetchLdMedia(body);
      });
    });
  }

  // One title in detail: open, back, tabs, history paging.
  // Wired from _wireTautulliModalBody; _q/_qa bind each node once.
  _tlWireMediaDetail(body, _q, _qa) {
    // ── Media item detail: open ──────────────────────────────────────────
    _qa('[data-tl-md-open]').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        if (!this._tautulliModal) return;
        const { tlMdOpen: key, tlMdTitle: title, tlMdThumb: thumb, tlMdPrev: prev } = el.dataset;
        this._tlOpenMediaDetail(key, title, thumb, prev, body);
      });
    });

    // ── Media item detail: back ──────────────────────────────────────────
    _q('[data-tl-md-back-lib]')?.addEventListener('click', () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.mediaDetailKey = null;
      body.innerHTML = this._tlBodyLibDetail();
      this._wireTautulliModalBody(body);
      this._tlLoadUdThumbs(body);
    });
    _q('[data-tl-md-back-user]')?.addEventListener('click', () => {
      if (!this._tautulliModal) return;
      this._tautulliModal.mediaDetailKey = null;
      body.innerHTML = this._tlBodyUserDetail();
      this._wireTautulliModalBody(body);
      this._tlLoadUdThumbs(body);
    });

    // ── Media item detail: tab switching ─────────────────────────────────
    _qa('[data-tl-md-tab]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this._tautulliModal) return;
        const m   = this._tautulliModal;
        const tab = btn.dataset.tlMdTab;
        m.mediaDetailTab = tab;
        if (tab === 'history' && !m.mediaDetailHistData?.length) {
          body.innerHTML = this._tlBodyMediaDetail();
          this._wireTautulliModalBody(body);
          await this._tlRefetchMdHistory(body);
          return;
        }
        body.innerHTML = this._tlBodyMediaDetail();
        this._wireTautulliModalBody(body);
        if (tab === 'info') this._tlLoadUdThumbs(body);
      });
    });

    // ── Media item detail: history pagination ────────────────────────────
    _qa('[data-tl-md-hpage]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const m = this._tautulliModal; if (!m) return;
        const val = btn.dataset.tlMdHpage;
        const perPage = this._tlCalcPerPage({ hasFilter: false });
        const totalPages = Math.max(1, Math.ceil(m.mediaDetailHistTotal / perPage));
        let p = m.mediaDetailHistPage || 0;
        if (val === 'first') p = 0;
        else if (val === 'prev')  p = Math.max(0, p - 1);
        else if (val === 'next')  p = Math.min(totalPages - 1, p + 1);
        else if (val === 'last')  p = totalPages - 1;
        else p = parseInt(val);
        if (p === m.mediaDetailHistPage) return;
        m.mediaDetailHistPage = p;
        await this._tlRefetchMdHistory(body);
      });
    });
  }
  // ── User detail helpers ───────────────────────────────────────────────────

  async _tlOpenUserDetail(userId, name, thumb, body) {
    if (!this._tautulliModal) return;
    const m = this._tautulliModal;
    m.userDetailId           = userId;
    m.userDetailName         = name;
    m.userDetailThumb        = thumb;
    m.userDetailTab          = 'profile';
    m.userDetailProfile      = null;
    m.userDetailHistData     = [];
    m.userDetailHistTotal    = 0;
    m.userDetailHistPage     = 0;
    m.userDetailHistMedia    = null;
    m.userDetailHistPlayback = null;
    m.userDetailHistSearch   = '';
    m.userDetailHistExpandedRow = null;
    m.userDetailIpsData      = [];
    m.userDetailIpsPage      = 0;
    body.style.overflowY = 'hidden';
    body.innerHTML = this._tlBodyUserDetail();
    this._wireTautulliModalBody(body);
    const profile = await this._tlFetchUserProfile(userId);
    if (!this._tautulliModal || this._tautulliModal.userDetailId !== userId) return;
    m.userDetailProfile = profile;
    body.innerHTML = this._tlBodyUserDetail();
    this._wireTautulliModalBody(body);
    this._tlLoadUdThumbs(body);
  }

  async _tlLoadUdThumbs(body) {
    const token = this._hass?.auth?.data?.access_token;
    if (!token) return;
    const imgs = body.querySelectorAll('img[data-tl-plex-path]');
    if (!imgs.length) return;
    for (const img of imgs) {
      const path = img.dataset.tlPlexPath;
      if (!path) continue;
      try {
        const r = await fetch(
          `/api/arr_stack/tautulli/pms_image_proxy?img=${encodeURIComponent(path)}&width=220&height=330&opacity=100&background=282828&blur=0&fallback=poster`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!r.ok) continue;
        const blob = await r.blob();
        if (!blob.type.startsWith('image/')) continue;
        if (!img.isConnected) continue;
        img.src = URL.createObjectURL(blob);
        img.removeAttribute('data-tl-plex-path');
      } catch { /* ignore */ }
    }
  }

  async _tlRefetchUdHistory(body) {
    const m = this._tautulliModal;
    if (!m || !m.userDetailId) return;
    // Patch only the results subtree when it already exists — keeps #tl-ud-hist-search
    // untouched so the iOS keyboard stays open while typing. First load (no wrap yet
    // rendered) falls back to the full loading-state render.
    const resultsWrap = body.querySelector('.tl-ud-hist-results-wrap');
    if (resultsWrap) {
      resultsWrap.innerHTML = `<div class="u-empty-lg">${this._t('loading')}</div>`;
    } else {
      m.userDetailHistLoading = true;
      body.innerHTML = this._tlBodyUserDetail();
      this._wireTautulliModalBody(body);
    }
    const data = await this._tlFetchHistory(
      m.userDetailHistPage,
      m.userDetailId,
      m.userDetailHistMedia,
      m.userDetailHistPlayback,
      this._tlCalcPerPage({ hasFilter: true }),
      m.userDetailHistSearch
    );
    if (!this._tautulliModal) return;
    m.userDetailHistLoading = false;
    m.userDetailHistData    = data.data || [];
    m.userDetailHistTotal   = data.recordsFiltered || 0;
    this._patchResultsWrap(body, 'tl-ud-hist-results-wrap', () => this._tlBodyUserDetail());
    this._wireTautulliModalBody(body);
  }

  // ── Library detail helpers ───────────────────────────────────────────────

  async _tlOpenLibDetail(sectionId, name, body) {
    if (!this._tautulliModal) return;
    const m = this._tautulliModal;
    m.libDetailId           = sectionId;
    m.libDetailName         = name;
    m.libDetailTab          = 'profile';
    m.libDetailProfile      = null;
    m.libDetailHistData     = [];
    m.libDetailHistTotal    = 0;
    m.libDetailHistPage     = 0;
    m.libDetailHistMedia    = null;
    m.libDetailHistPlayback = null;
    m.libDetailHistSearch   = '';
    m.libDetailHistExpandedRow = null;
    m.libDetailMediaData    = [];
    m.libDetailMediaTotal   = 0;
    m.libDetailMediaPage    = 0;
    m.libDetailMediaSearch  = '';
    m.libDetailMediaSort    = 'added_at';
    m.libDetailMediaDir     = 'desc';
    body.style.overflowY = 'hidden';
    body.innerHTML = this._tlBodyLibDetail();
    this._wireTautulliModalBody(body);
    const profile = await this._tlFetchLibProfile(sectionId);
    if (!this._tautulliModal || this._tautulliModal.libDetailId !== sectionId) return;
    m.libDetailProfile = profile;
    body.innerHTML = this._tlBodyLibDetail();
    this._wireTautulliModalBody(body);
    this._tlLoadUdThumbs(body);
  }

  async _tlRefetchLdHistory(body) {
    const m = this._tautulliModal;
    if (!m || !m.libDetailId) return;
    // Patch only the results subtree when it already exists — keeps #tl-ld-hist-search
    // untouched so the iOS keyboard stays open while typing. First load (no wrap yet
    // rendered) falls back to the full loading-state render.
    const resultsWrap = body.querySelector('.tl-ld-hist-results-wrap');
    if (resultsWrap) {
      resultsWrap.innerHTML = `<div class="u-empty-lg">${this._t('loading')}</div>`;
    } else {
      m.libDetailHistLoading = true;
      body.innerHTML = this._tlBodyLibDetail();
      this._wireTautulliModalBody(body);
    }
    const perPage = this._tlCalcPerPage({ hasFilter: true });
    const data = await this._tlFetchLibHistory(
      m.libDetailId, m.libDetailHistPage, m.libDetailHistMedia,
      m.libDetailHistPlayback, m.libDetailHistSearch, perPage
    );
    if (!this._tautulliModal) return;
    m.libDetailHistLoading = false;
    m.libDetailHistData    = data.data || [];
    m.libDetailHistTotal   = data.recordsFiltered || 0;
    this._patchResultsWrap(body, 'tl-ld-hist-results-wrap', () => this._tlBodyLibDetail());
    this._wireTautulliModalBody(body);
  }

  async _tlRefetchLdMedia(body) {
    const m = this._tautulliModal;
    if (!m || !m.libDetailId) return;
    // Patch only the results subtree when it already exists — keeps #tl-ld-media-search
    // untouched so the iOS keyboard stays open while typing.
    const resultsWrap = body.querySelector('.tl-ld-media-results-wrap');
    if (resultsWrap) {
      resultsWrap.innerHTML = `<div class="u-empty-lg">${this._t('loading')}</div>`;
    } else {
      body.innerHTML = this._tlBodyLibDetail();
      this._wireTautulliModalBody(body);
    }
    const data = await this._tlFetchLibMedia(
      m.libDetailId, m.libDetailMediaPage, m.libDetailMediaSort,
      m.libDetailMediaDir, m.libDetailMediaSearch, 25
    );
    if (!this._tautulliModal) return;
    m.libDetailMediaData  = data.data || [];
    m.libDetailMediaTotal = data.recordsTotal || 0;
    this._patchResultsWrap(body, 'tl-ld-media-results-wrap', () => this._tlBodyLibDetail());
    this._wireTautulliModalBody(body);
  }

  // ── Media item detail helpers ────────────────────────────────────────────

  async _tlOpenMediaDetail(ratingKey, title, thumb, prev, body) {
    if (!this._tautulliModal) return;
    const m = this._tautulliModal;
    m.mediaDetailKey       = ratingKey;
    m.mediaDetailTitle     = title;
    m.mediaDetailThumb     = thumb;
    m.mediaDetailTab       = 'info';
    m.mediaDetailData      = null;
    m.mediaDetailHistData  = [];
    m.mediaDetailHistTotal = 0;
    m.mediaDetailHistPage  = 0;
    m.mediaDetailPrev      = prev || 'lib';
    body.style.overflowY = 'hidden';
    body.innerHTML = this._tlBodyMediaDetail();
    this._wireTautulliModalBody(body);
    const data = await this._tlFetchMediaDetail(ratingKey);
    if (!this._tautulliModal || this._tautulliModal.mediaDetailKey !== ratingKey) return;
    m.mediaDetailData = data;
    body.innerHTML = this._tlBodyMediaDetail();
    this._wireTautulliModalBody(body);
    this._tlLoadUdThumbs(body);
  }

  async _tlRefetchMdHistory(body) {
    const m = this._tautulliModal;
    if (!m || !m.mediaDetailKey) return;
    const perPage = this._tlCalcPerPage({ hasFilter: false });
    const data = await this._tlFetchMediaHistory(m.mediaDetailKey, m.mediaDetailHistPage, perPage);
    if (!this._tautulliModal) return;
    m.mediaDetailHistData  = data.data || [];
    m.mediaDetailHistTotal = data.recordsFiltered || 0;
    body.innerHTML = this._tlBodyMediaDetail();
    this._wireTautulliModalBody(body);
  }

}

export const wireTautulliDetailsMixin = _WireTautulliDetailsMethods.prototype;
