// Trakt and the recommendation rows: watched, not interested, requesting. Split out of wire/index.js.

class _WireTraktMethods {

_wireTraktButtons() {
  const _traktDismiss = (btn, apiCall) => {
    if (btn._traktWired) return;
    btn._traktWired = true;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const slug   = btn.dataset.traktSlug;
      const type   = btn.dataset.traktType;
      const tmdbId = parseInt(btn.dataset.traktTmdb, 10);
      const key    = slug || String(tmdbId);

      this._markActivated();
      btn.disabled = true;
      btn.innerHTML = '<span class="action-spinner" style="width:8px;height:8px;border-width:1.5px"></span>';

      const card = btn.closest('.mc');
      if (card) {
        card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        card.style.opacity    = '0';
        card.style.transform  = 'scale(0.7) translateX(30px)';
      }

      setTimeout(() => {
        if (!this._traktWatching) this._traktWatching = new Set();
        this._traktWatching.add(key);
        this._trakt = this._traktInterleave((this._trakt || []).filter(m => (m._traktSlug || String(m.id)) !== key));
        this._reRenderRight(true);

        (async () => {
          try { await apiCall(type, slug, tmdbId); } catch (_) { /* silent */ }
          try {
            await this._fetchTrakt();
            this._reRenderRight(true);
          } catch (_) { /* silent */ }
        })();
      }, 200);
    });
  };

  const _traktConfetti = (card) => {
    const colors = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6FC8','#FF9F1C','#A8DADC','#E63946','#C77DFF','#FFBE0B'];
    const cw = card.offsetWidth  || 100;
    const ch = card.offsetHeight || 160;
    const cx = cw / 2;
    const cy = ch / 2;
    const count = 38;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'trakt-confetti-p';
      const w = 2 + Math.random() * 3;
      const h = 10 + Math.random() * 18;
      const baseAngle = (i / count) * 360;
      const jitter   = (Math.random() - 0.5) * 22;
      const dist     = 32 + Math.random() * Math.min(cx, cy) * 0.9;
      const rad      = (baseAngle + jitter) * Math.PI / 180;
      const tx       = Math.cos(rad) * dist;
      const ty       = Math.sin(rad) * dist;
      const rot      = (Math.random() - 0.5) * 800;
      const dur      = 650 + Math.random() * 500;
      const delay    = Math.random() * 100;
      Object.assign(p.style, {
        width: w + 'px', height: h + 'px',
        background: colors[i % colors.length],
        left: cx + 'px', top: cy + 'px',
        marginLeft: (-w / 2) + 'px', marginTop: (-h / 2) + 'px',
      });
      card.appendChild(p);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        p.style.transition = `transform ${dur}ms ease-out ${delay}ms, opacity ${dur}ms ease-out ${delay}ms`;
        p.style.transform  = `translate(${tx}px,${ty}px) rotate(${rot}deg)`;
        p.style.opacity    = '0';
      }));
      setTimeout(() => p.remove(), dur + delay + 120);
    }
  };

  const _STAR_COLORS = {
    5: 'rgba(255,255,255,0.85)',
    4: 'rgba(255,255,255,0.70)',
    3: 'rgba(255,255,255,0.55)',
    2: 'rgba(255,255,255,0.42)',
    1: 'rgba(255,255,255,0.30)',
  };
  const _buildStarsHtml = () => {
    let h = '<div class="trakt-star-wrap">';
    for (let s = 5; s >= 1; s--) {
      h += `<span class="trakt-star" data-trakt-star="${s}" style="animation-delay:${(5 - s) * 45}ms;color:${_STAR_COLORS[s]}">★</span>`;
    }
    h += `<span class="trakt-heart" data-trakt-heart="1" style="animation-delay:${5 * 45}ms">♥</span>`;
    h += '</div>';
    return h;
  };

  this.shadowRoot.querySelectorAll('.trakt-seen-ol:not(.sa-seen-ol):not(.mus-like-ol)').forEach(btn => {
    if (btn._traktWired) return;
    btn._traktWired = true;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.classList.contains('trakt-rating-open')) {
        btn.classList.remove('trakt-rating-open');
        const _chars = s => s.toUpperCase().split('').join('<br>');
        btn.innerHTML = `<span>${_chars(this._t('watched'))}</span>`;
        return;
      }
      const card = btn.closest('.mc');
      btn.classList.add('trakt-rating-open');
      btn.innerHTML = _buildStarsHtml();

      const _closeRating = (ev) => {
        if (btn.contains(ev.target)) return;
        btn.classList.remove('trakt-rating-open');
        const _ch = s => s.toUpperCase().split('').join('<br>');
        btn.innerHTML = `<span>${_ch(this._t('watched'))}</span>`;
        this.shadowRoot.removeEventListener('click', _closeRating, true);
      };
      this.shadowRoot.addEventListener('click', _closeRating, true);

      const slug   = btn.dataset.traktSlug;
      const type   = btn.dataset.traktType;
      const tmdbId = parseInt(btn.dataset.traktTmdb, 10);
      const key    = slug || String(tmdbId);

      const allStars = [...btn.querySelectorAll('[data-trakt-star]')];
      const heartEl  = btn.querySelector('[data-trakt-heart]');
      const wrapEl   = btn.querySelector('.trakt-star-wrap');
      const _resetStars = () => {
        allStars.forEach(x => { x.style.color = _STAR_COLORS[parseInt(x.dataset.traktStar)] || ''; x.style.transform = ''; });
        if (heartEl) heartEl.style.color = '';
      };
      allStars.forEach(s => {
        s.addEventListener('mouseenter', () => {
          const val = parseInt(s.dataset.traktStar);
          allStars.forEach(x => {
            const xv = parseInt(x.dataset.traktStar);
            x.style.color     = xv <= val ? '#FFD700' : 'rgba(255,255,255,0.25)';
            x.style.transform = xv === val ? 'scale(1.25)' : '';
          });
          if (heartEl) heartEl.style.color = 'rgba(255,255,255,0.25)';
        });
      });
      if (heartEl) {
        heartEl.addEventListener('mouseenter', () => {
          allStars.forEach(x => { x.style.color = 'rgba(255,255,255,0.25)'; x.style.transform = ''; });
          heartEl.style.color = '#ff4466';
        });
      }
      if (wrapEl) wrapEl.addEventListener('mouseleave', _resetStars);

      btn.querySelectorAll('[data-trakt-star],[data-trakt-heart]').forEach(starEl => {
        starEl.addEventListener('click', ev => {
          ev.stopPropagation();
          this._markActivated();
          this.shadowRoot.removeEventListener('click', _closeRating, true);
          const stars  = starEl.dataset.traktStar ? parseInt(starEl.dataset.traktStar) : null;
          const rating = stars !== null ? stars * 2 : 10;

          if (stars !== null) {
            allStars.forEach(x => {
              const xv = parseInt(x.dataset.traktStar);
              x.style.color     = xv <= stars ? '#FFD700' : 'rgba(255,255,255,0.15)';
              x.style.transform = xv <= stars ? 'scale(1.1)' : '';
            });
            if (heartEl) heartEl.style.color = 'rgba(255,255,255,0.15)';
          } else {
            allStars.forEach(x => { x.style.color = 'rgba(255,255,255,0.15)'; x.style.transform = ''; });
            if (heartEl) { heartEl.style.color = '#ff4466'; heartEl.style.transform = 'scale(1.2)'; }
          }

          setTimeout(() => { if (card) _traktConfetti(card); }, 180);

          setTimeout(() => {
            if (card) {
              card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
              card.style.opacity    = '0';
              card.style.transform  = 'scale(0.85)';
            }
            setTimeout(() => {
              if (!this._traktWatching) this._traktWatching = new Set();
              this._traktWatching.add(key);
              this._trakt = this._traktInterleave((this._trakt || []).filter(m => (m._traktSlug || String(m.id)) !== key));
              this._reRenderRight(true);
              (async () => {
                try { await this._callApi('POST', 'arr_stack/trakt/history', { mediaType: type, slug, tmdbId }); } catch (_) {}
                try { await this._callApi('POST', 'arr_stack/trakt/rate',    { mediaType: type, slug, tmdbId, rating }); } catch (_) {}
                try { await this._fetchTrakt(); this._reRenderRight(true); } catch (_) {}
              })();
            }, 320);
          }, 580);
        });
      });
    });
  });

  this.shadowRoot.querySelectorAll('.trakt-ni-ol:not(.sa-skip-ol):not(.mus-skip-ol)').forEach(btn =>
    _traktDismiss(btn, (type, slug) => {
      const mediaType = type === 'tv' ? 'shows' : 'movies';
      return this._callApi('DELETE', `arr_stack/trakt/recommendations/${mediaType}/${encodeURIComponent(slug)}`);
    })
  );

  // ── SuggestArr: Seen drops the suggestion, Skip blacklists it upstream ────
  const _saDecide = (btn, endpoint) => {
    if (btn._saWired) return;
    btn._saWired = true;
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      this._markActivated();
      const id   = parseInt(btn.dataset.saId, 10);
      const card = btn.closest('.mc');
      if (!id) return;

      if (card) {
        card.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
        card.style.opacity    = '0';
        card.style.transform  = 'scale(0.85)';
      }
      setTimeout(async () => {
        this._suggestarr = (this._suggestarr || []).filter(m => m._saId !== id);
        this._reRenderRight(true);
        try { await this._callApi('POST', `arr_stack/suggestarr/${endpoint}`, { ids: [id] }); } catch (_) {}

        // Half the row gone means it is time for a fresh batch. The proxy holds
        // a cooldown, so asking more often than that costs nothing.
        const left = (this._suggestarr || []).length;
        if (this._suggestarrBaseline > 1 && left < this._suggestarrBaseline / 2) {
          try {
            const r = await this._callApi('POST', 'arr_stack/suggestarr/refresh', {});
            if (r?.ok) {
              this._suggestarrRefreshing  = true;
              this._suggestarrPendingFrom = left;
              this._reRenderRight(true);
              // A run walks MAX_CONTENT_CHECKS seeds and asks Seer about each
              // candidate with SEER_REQUEST_DELAY between calls, so with the
              // defaults raised it takes minutes, not seconds. Poll out to ten
              // of them; every tick bails early once the row has grown.
              const SA_POLLS = [20, 45, 90, 150, 240, 330, 420, 510, 600];
              SA_POLLS.forEach(s => setTimeout(async () => {
                if (!this._suggestarrRefreshing) return;
                await this._fetchSuggestArr();
                this._reRenderRight(true);
              }, s * 1000));
              setTimeout(() => {
                if (!this._suggestarrRefreshing) return;
                this._suggestarrRefreshing = false;
                this._reRenderRight(true);
              }, 630000);
            }
          } catch (_) {}
        }
      }, 300);
    });
  };
  this.shadowRoot.querySelectorAll('.sa-seen-ol').forEach(btn => _saDecide(btn, 'reject'));
  this.shadowRoot.querySelectorAll('.sa-skip-ol').forEach(btn => _saDecide(btn, 'blacklist'));
}

}

export const wireTraktMixin = _WireTraktMethods.prototype;
