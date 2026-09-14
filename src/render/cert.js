// Age ratings: which country's rating to show, and the chip. Split out of card.js.

class _CertMethods {

  _certCountries() {
    const home = String(this._hass?.config?.country || '').toUpperCase();
    return [...new Set([home, ...this.constructor.CERT_FALLBACK].filter(Boolean))];
  }

  // Label → minimum age. Anything already numeric ("12", "12+", "R 18+") is
  // read straight off the string; the rest are the boards that spell it out
  // with letters instead.
  _certAge(label) {
    const raw = String(label || '').trim();
    if (!raw) return null;
    const upper = raw.toUpperCase();
    const named = {
      G: 0, TV_G: 0, TV_Y: 0, U: 0, UC: 0, E: 0, AL: 0, T: 0,
      TV_Y7: 7, PG: 7, TV_PG: 7,
      'PG-13': 13, 'TV-14': 14,
      R: 17, 'TV-MA': 17, 'NC-17': 18, R18: 18, X: 18,
    };
    const key = upper.replace(/\s+/g, '');
    if (key in named) return named[key];
    if (key.replace(/-/g, '_') in named) return named[key.replace(/-/g, '_')];
    const digits = upper.match(/\d{1,2}/);
    if (digits) return parseInt(digits[0], 10);
    return null;
  }

  // Pull { country, label, age } out of whatever the detail carries: Overseerr's
  // per-country release dates (films) or content ratings (series), the proxy's
  // flattened TMDB list, or the plain Radarr/Sonarr certification string.
  _certInfo(d) {
    if (!d) return null;
    const found = new Map();
    const add = (country, label) => {
      const c = String(country || '').toUpperCase();
      const l = String(label || '').trim();
      if (c && l && !found.has(c)) found.set(c, l);
    };

    for (const r of d.releases?.results || [])
      add(r.iso_3166_1, (r.release_dates || []).find(x => x.certification)?.certification);
    for (const r of d.contentRatings?.results || [])
      add(r.iso_3166_1, r.rating);
    for (const r of d.certifications || [])
      add(r.country, r.rating);

    let country = this._certCountries().find(c => found.has(c));
    let label   = country ? found.get(country) : null;

    // Nothing from the boards we asked for — fall back to the single string the
    // *arr instance stores, and only then to any country at all.
    if (!label) {
      const local = d._sonarrSeries?.certification
                 || d._sonarr2Series?.certification
                 || d.certification;
      if (local) { country = null; label = String(local).trim(); }
    }
    if (!label && found.size) [country, label] = found.entries().next().value;
    if (!label) return null;

    return { country, label, age: this._certAge(label) };
  }

  // The chip itself — an age when we can name one, the board's own label when
  // we cannot make sense of it.
  _certChipHtml(d) {
    const info = this._certInfo(d);
    if (!info) return '';
    const text  = info.age === null ? info.label : `${info.age}+`;
    const title = info.country ? `${info.label} (${info.country})` : info.label;
    return `<span class="popup-cert" title="${this._escHtml(title)}">${this._escHtml(text)}</span>`;
  }
}

export const certMixin = _CertMethods.prototype;
